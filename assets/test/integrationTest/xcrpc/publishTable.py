#TODO
#This file is used to publish table for xcrpc integration test
#It will be deparated after publishTable api migrate to xcrpc

import json
import os
import csv

from xcalar.external.LegacyApi.XcalarApi import XcalarApi, XcalarApiStatusException
from xcalar.external.LegacyApi.Dataset import CsvDataset
from xcalar.external.LegacyApi.Operators import Operators
from xcalar.external.LegacyApi.Session import Session
from xcalar.external.LegacyApi.ResultSet import ResultSet
from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiColumnT
from xcalar.compute.util.Qa import DefaultTargetName

from xcalar.external.client import Client

from xcalar.external.LegacyApi.Target2 import Target2
from xcalar.external.LegacyApi.Udf import Udf

GeneratedTargetName = "memory sdkRunTimeStart, sdkRunTimeEnd"
session = None
operators = None
xcalarApi = None

def setup():
    global operators
    global xcalarApi
    clientSecrets = {'xiusername': "admin", 'xipassword': "admin"}
    url = "https://" + "localhost"
    xcalarApi = XcalarApi(url=url + ":" + str(443), client_secrets=clientSecrets)
    operators = Operators(xcalarApi)

def getXlrSchema(path):
    sqlToXlrMap = { "int":      "DfInt64",
                    "bigint":   "DfInt64",
                    "integer":  "DfInt64",
                    "double":   "DfFloat64",
                    "decimal":  "DfMoney",
                    "numeric":  "DfMoney",
                    "varchar":  "DfString",
                    "date":     "DfString",
                    "char":     "DfString",
                    "boolean":  "DfBoolean"
                    }

    with open(path, 'r') as fh:
        sList = json.load(fh)
        xlrSchema = []
        for elm in sList:
            elmTypeStripped = elm[1].split('(')[0] # Strip params for now
            xlrType = sqlToXlrMap[elmTypeStripped.lower()]
            xlrSchema.append((elm[0], xlrType))
        return(xlrSchema)


def getCsvDialect(path):
    with open(path, 'r') as fh:
        data = fh.readline()
        dialect = csv.Sniffer().sniff(data, delimiters='|,\t')
        return dialect

def pubFromFile(path,bname):
    global session
    session = Session(xcalarApi, "test_session", username = "admin")
    xcalarApi.setSession(session)
    session.activate()
    datasetName = bname + "Ds"
    schemalist = []
    dialect = getCsvDialect(path)
    dataset = CsvDataset(xcalarApi, DefaultTargetName, path, datasetName,
                                fieldDelim=dialect.delimiter, schemaMode="header", isRecursive=False,
                                sampleSize=2**40, emptyAsFnf=True)
    try:
        dataset.load()
    except XcalarApiStatusException as e:
        if str(e) == "Dataset name already exists":
            # Another test already loaded this ds, so reuse it
            return False
        else:
            raise

    publishDataset(dataset, bname)

def publishDataset(dataset, pubTableName):
    tmpTabPre = "_tmp-table-"
    tables = [tmpTabPre + dataset.name + str(i) for i in range(100)]

    final = finalizeDataset(dataset, tables)

    operators.publish(final, pubTableName)

    operators.dropTable(tmpTabPre + "*")
    dataset.delete()

def finalizeDataset( dataset, tables):
        i = 0
        operators.indexDataset(dataset.name, tables[i], "xcalarRecordNum", fatptrPrefixName = "p1")
        i += 1
        cols = finalize("p1", dataset, tables[i-1], tables[i])
        i += 1


        rowColName = "XcalarRowNumPk"
        operators.getRowNum(tables[i-1], tables[i], rowColName)
        i += 1
        operators.indexTable(tables[i-1], tables[i], [rowColName])
        cols += [rowColName]
        i += 1

        operators.project(tables[i-1], tables[i], cols)
        i += 1
        opCodeCol = 1
        rankCol = 1

        operators.map(tables[i-1], tables[i],
                           ["int({})".format(opCodeCol), "int({})".format(rankCol)],
                           ["XcalarOpCode", "XcalarRankOver"])

        return tables[i]

def finalize(prefix, ds, src, dst):
    cols = [x.name for x in ds.getInfo().getDatasetsInfoOutput.datasets[0].columns]
    pyToXlrTypes = {int: "int", float: "float", str: "string"}
    srcTypes = inferTypes(src)
    evalCols = [prefix + '::{}'.format(x) for x in cols]
    xlrColTypes = [pyToXlrTypes[srcTypes.get(x, int)] for x in evalCols]
    evalStrs = [x + '(' + y + ')' for (x, y) in zip(xlrColTypes, evalCols)]
    operators.map(src, dst, evalStrs, cols)
    return cols

def inferTypes(tableName, limit=40):
    types = [int, float, str]
    typeRank = dict(zip(types, range(len(types))))
    typeMap = {}

    def getType(v):
        v = str(v)
        for currType in types:
            try:
                currType(v)
            except ValueError:
                continue
            return currType

    rs = ResultSet(xcalarApi, tableName=tableName, maxRecords=limit)
    for row in rs:
        for (k, v) in row.items():
            if k in typeMap:
                prevType = typeMap[k]
                prevRank = typeRank[prevType]
                currType = getType(v)
                currRank = typeRank[currType]
                if currRank > prevRank:
                    typeMap[k] = currType
            else:
                typeMap[k] = getType(v)

    return typeMap
def checkPubTabs(bname):
    tables = operators.listPublishedTables("*").tables
    for table in tables:
        if bname == table.name:
            return True, table
    return False, None


if __name__ == '__main__':
    path = "/netstore/datasets/tpch_sf1_notrail/upper/region.tbl"
    bname = "REGION"

    try:
        setup()
        exist, table = checkPubTabs(bname)
        if exist:
            print(table.sessionName)
        else:
            pubFromFile(path, bname)
            print(session.name)
    except Exception as e:
        if(str(e) == 'Publish table name already exists'):
            print(session.name)
        else:
            raise e
