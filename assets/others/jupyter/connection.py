# -*- coding: utf-8 -*-
# Copyright (C) 2017-Present Pivotal Software, Inc. All rights reserved.
#
# This program and the accompanying materials are made available under
# the terms of the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
connection.py
~~~~~~~~~~~~~~~~~~~~~

Logic for running SQL queries against a DB or Spark/Hive.
"""

import sys
import time

import sqlparse
import requests
import json
import pandas.io.sql as psql
import random

from .exceptions import ConnectionNotConfigured, EmptyResult
from .notify import Notify

try:
    from traitlets import TraitError
except ImportError:
    from IPython.utils.traitlets import TraitError
from IPython.core.display import display_javascript

from xcalar.external.LegacyApi.XcalarApi import XcalarApi
from xcalar.external.LegacyApi.Session import Session
from xcalar.external.LegacyApi.WorkItem import WorkItem
from xcalar.external.LegacyApi.ResultSet import ResultSet
from collections import OrderedDict
import pandas as pd

class Connection(object):

    def __init__(self, shell, available_connection_types, no_return_result_exceptions):
        """Initialize Connection object with user shell, available connection types,
        and exceptions for when no result is returned"""
        self.shell = shell
        self.available_connection_types = available_connection_types
        self.no_return_result_exceptions = no_return_result_exceptions
        self.notify_obj = Notify(shell)
        self.caller = None

    def _is_an_available_connection(self, connection):
        """Make sure the connection object is a valid connection type"""
        return isinstance(connection, tuple(self.available_connection_types))

    def _is_a_spark_connection(self, connection):
        """Check is connection is a Spark object."""
        if 'pyspark' not in sys.modules:  # pyspark isn't installed
            return False
        return type(connection).__module__.startswith('pyspark')

    def _psql_read_sql_to_df(self, conn_object):
        """Execute SQL code using sqlalchemy engine or other
        Python DB Specification 2.0 and return result as Pandas."""
        def _run_db_sql(sql_code):
            try:
                return psql.read_sql(sql_code, conn_object)
            except(tuple(self.no_return_result_exceptions)):
                return EmptyResult()

        return _run_db_sql

    def _spark_call(self, conn_object):
        """Execute SQL code using Spark object and return result as Pandas."""
        def _run_spark_sql(sql_code):
            # pyspark doesn't like semi-colons :(
            tokens = sqlparse.parse(sql_code)[0].tokens
            last_token = tokens[-1]
            if last_token.value == ';':
                tokens = tokens[:-1]
                sql_code = (''.join([t.value for t in tokens]))
            df = conn_object.sql(sql_code).toPandas()
            if df.shape == (0, 0):
                return EmptyResult()
            return df
        return _run_spark_sql

    def _read_connection(self, conn_object):
        """Determine is connection is relational DB or Spark object and make a connection."""
        if self._is_a_spark_connection(conn_object):
            caller = self._spark_call(conn_object)
        else:
            caller = self._psql_read_sql_to_df(conn_object)
        return caller

    def _validate_conn_object(self, conn_name, shell):
        """Check if user-supplied connection string is in the namespace."""
        # try:
        #     proposal_value = shell.user_global_ns[conn_name]
        #     self._is_an_available_connection(proposal_value)
        # except:
        #     raise TraitError('Connection name "{}" not recognized'.format(conn_name))
        return conn_name

    def _read_sql_engine(self, sql, options):
        """Runs SQL query and uses options if use wants to force the SQL caller,
        return the result as a variable, and show a browser notification"""
        option_keys = ['table_name', 'display', 'notify', 'force_caller', 'async']
        table_name, show_output, notify_result, force_caller, async = [options[k] for k in option_keys]
        if table_name:  # for async
            self.shell.user_global_ns.update({table_name: 'QUERY RUNNING'})

        if force_caller:
            self._validate_conn_object(force_caller, self.shell)
            force_caller_obj = self.shell.user_global_ns[force_caller]
            caller = self._read_connection(force_caller_obj)
        else:
            caller = self.caller
        #if caller is None:
            #raise ConnectionNotConfigured("A connection object must be configured using %config SQL.conn_name")
        result, del_time, time_output = self._time_and_run_query(caller, sql)

        if table_name:
            # assign result to variable
            self.shell.user_global_ns.update({table_name: result})
        if notify_result:
            self.notify_obj.notify_complete(del_time, table_name, result.shape)
            sys.stdout.write(time_output)
        return result

    def _getDataFrameFromDict(self, tableName, col_list, numRows):
        if (numRows == 0):
            return tableName, pd.DataFrame()
        resultSetPtr = ResultSet(self.shell.user_global_ns["xcalarApi"], tableName=tableName, maxRecords=numRows)
        resultDict = []
        for row in resultSetPtr:
            kv_list = []
            for k in col_list:
                if k not in row:
                    kv_list.append((k, None))
                else:
                    kv_list.append((k, row[k]))
                    if type(row[k]) is list:
                        for i in range(len(row[k])):
                            subKey = k + "[" + str(i) + "]"
                            if subKey in col_list:
                                row[subKey] = row[k][i]
            filtered_row = OrderedDict(kv_list)
            resultDict.append(filtered_row)
        return tableName, pd.DataFrame.from_dict(resultDict)

    def _sendReqToRestServer(self, sql):
        workbookObj = self.shell.user_global_ns["workbook"]
        apiSettings = self.shell.user_global_ns["xcalar_sql_settings"]
        workbookName = workbookObj.name
        userIdUnique = workbookObj.userIdUnique
        userIdName = workbookObj.username
        tablePrefix = "jupyter" + str(random.randint(10000, 99999)) + "_"

        if ("keepOri" not in apiSettings):
            apiSettings["keepOri"] = True
        if ("dropAsYouGo" not in apiSettings):
            apiSettings["dropAsYouGo"] = False
        if ("newSqlTableName" not in apiSettings):
            apiSettings["newSqlTableName"] = ""
        if ("randomCrossJoin" not in apiSettings):
            apiSettings["randomCrossJoin"] = False
        if ("numRows" not in apiSettings):
            apiSettings["numRows"] = 0

        payload = {"userIdName": userIdName,
            "wkbkName": workbookName,
            "queryString": sql,
            "queryTablePrefix": tablePrefix,
            "userIdUnique": userIdUnique,
            "keepOri": apiSettings["keepOri"],
            "dropAsYouGo": apiSettings["dropAsYouGo"],
            "newSqlTableName": apiSettings["newSqlTableName"],
            "randomCrossJoin": apiSettings["randomCrossJoin"]
        }

        headers = {'content-type': 'application/json'}
        transportStruct = self.shell.user_global_ns["xcalarApi"].transport
        url = transportStruct.scheme + "://" + transportStruct.host
        if (transportStruct.port):
            if transportStruct.port == 9090:
                # only for testing purposes
                url += ":" + str(12124)
            else:
                url += ":" + str(transportStruct.port)  + "/app"
        url += "/xcsql/query"

        sys.stdout.write("\n" + url)
        res = requests.post(url, data = json.dumps(payload), headers=headers,
                            verify=False)
        struct = res.json()
        #fout = open("/tmp/out", "w")
        #fout.write(json.dumps(struct))
        #fout.close()
        if ("columns" not in struct):
            # an error has occurred
            raise Exception(struct)
        columns = struct["columns"]
        colNames = [col["colName"] for col in columns]
        return self._getDataFrameFromDict(struct["tableName"], colNames, apiSettings["numRows"])

    def _time_and_run_query(self, caller, sql):
        """Time the query and execute the SQL using the caller."""
        pretty_start_time = time.strftime('%I:%M:%S %p %Z')
        time_output = 'Query started at {}'.format(pretty_start_time)
        sys.stdout.write(time_output)
        start_time = time.time()
        tableName, result = self._sendReqToRestServer(sql)

        # TODO return to user final table name
        end_time = time.time()
        del_time = (end_time - start_time) / 60.
        query_finish_str = '; Query executed in {:2.2f} m; Xcalar Table Name: {}'.format(del_time, tableName)
        sys.stdout.write(query_finish_str)
        time_output += query_finish_str  # need to save this bc clearing output for notifications
        return result, del_time, time_output

    def execute_sqls(self, sqls, options):
        """Execute a list of sql statements"""
        r = None
        for i, s in enumerate(sqls, start=1):
            r = self._read_sql_engine(s, options)
        return r  # return last result
