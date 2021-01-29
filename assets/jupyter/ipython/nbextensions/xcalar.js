// this file maps to xcalar/.ipython/nbextensions/xcalar.js
// if this gets built in to a non-XD product (XI, XPE, etc.)
// any occurances of 'Xcalar Design' (case insensitive) in this file will get
// replaced with updated product name at build time.
define(['base/js/utils'], function(utils) {
    return {
        load_ipython_extension: function() {
            var username;
            var userid;
            var sessionName;
            var sessionId;
            var token;
            var wkbkFolderName = "";

            console.log("ipython extension has been loaded");

            var request = {
                action: "updateLocation",
                location: "notebook",
                lastNotebook: Jupyter.notebook.get_notebook_name()
            };
            parent.postMessage(JSON.stringify(request), "*");
            var urlQuery = window.location.search;
            urlQuery = urlQuery.slice(urlQuery.indexOf("?") + 1);
            var params = parseQueryString(urlQuery);
            overwriteElementsAndListeners();
            addXDButtonListeners();
            setupJupyterEventListeners();
            window.addEventListener("message", receiveMessage, false);

            if (params.needsTemplate === "true") {
                // brand new workbook

                var publishTable = params.publishTable === "true";
                var tableName;
                var numRows = "0";
                if (publishTable) {
                    tableName = decodeURIComponent(params.tableName);
                    numRows = params.numRows;
                }
                var request = {action: "newUntitled",
                               publishTable: publishTable,
                               tableName: tableName,
                               numRows: numRows};

                if (params.autofillImportUdf) {
                    request.noRename = true;
                }

                console.log("Telling parent new untitled notebook created");
                parent.postMessage(JSON.stringify(request), "*");

                // send an aditional message if we need the udf import modal
                // to pop up
                if (params.autofillImportUdf) {
                    request = {
                        action: "autofillImportUdf",
                        target: decodeURIComponent(params.target),
                        filePath: decodeURIComponent(params.filePath),
                        includeStub: decodeURIComponent(params.includeStub),
                        moduleName: decodeURIComponent(params.moduleName),
                        fnName: decodeURIComponent(params.fnName),
                        udfPanelModuleName: decodeURIComponent(params.udfPanelModuleName)
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                }
            } else {
                // accessing an existing notebook, let XD know so it can send
                // back session information
                var request = {action: "enterExistingNotebook"};
                parent.postMessage(JSON.stringify(request), "*");
            }

            function receiveMessage(event) {
                window.alert = function() {};
                alert = function() {};
                if (!event.data) {
                    return;
                }
                var struct;
                try {
                    struct = JSON.parse(event.data);
                    if (!struct.fromXcalar) {
                        return;
                    }
                } catch (error) {
                    console.log(error);
                    return;
                }

                switch (struct.action) {
                    case ("init"):
                        username = struct.username;
                        userid = struct.userid;
                        sessionName = struct.sessionname;
                        sessionId = struct.sessionid;
                        token = struct.token;
                        wkbkFolderName = struct.folderName || "";
                        if (struct.newUntitled) {
                            prependSessionStub(username, userid, sessionName, token);
                            if (struct.publishTable) {

                                appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                            }
                            if (!struct.noRenamePrompt) {
                                Jupyter.save_widget.rename_notebook({notebook: Jupyter.notebook});
                            }
                        } else {
                            validateNotebookInUserFolder();
                        }
                        updateLinks();
                        break;
                    case ("publishTable"):
                        appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                        break;
                    case ("stub"):
                        var stubName = struct.stubName;
                        appendStub(stubName, struct.args);
                        break;
                    case ("newWorkbook"):
                        createNewFolder(struct);
                        break;
                    case ("renameWorkbook"):
                        renameFolder(struct, struct.newFolderName, struct.oldFolderName);
                        break;
                    case ("copyWorkbook"):
                        copyFolder(struct.oldFolder, struct.newFolder);
                        break;
                    case ("deleteWorkbook"):
                        deleteFolder(struct.folderName);
                        break;
                    case ("updateFolderName"):
                        updateFolderName(struct);
                        break;
                    default:
                        break;
                }
            }
            function insertCellToSelected(texts, stubName, args) {
                var index = Jupyter.notebook.get_selected_index();
                if (!Jupyter.notebook.get_selected_cell().get_text()) {
                    index -= 1;
                }
                var cell;
                for (var i = 0; i < texts.length; i++) {
                    cell = Jupyter.notebook.insert_cell_below('code', index);
                    cell.set_text(texts[i]);
                    if (i === 0) {
                        cell.focus_cell();

                        if ((stubName == "basicUDF")) {
                            var $button = $('<input class="udfToMapForm" type="button" ' +
                                            'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                            'value="Use UDF on Table ' +
                                            args.tableName + '"/>');
                                $button.data("tablename", args.tableName)
                                       .data("columns", args.columns);
                            $(".cell").eq(index + 1).append($button);
                        } else if (stubName === "importUDF" && args.includeStub) {
                            var $button = $('<input class="udfToDSPreview" type="button" ' +
                                            'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                            'value="Apply UDF"/>');
                            $(".cell").eq(index + 1).append($button);
                        }
                    }
                    index++;
                }

                return cell;
            }
            // Add all stub cases here
            function appendStub(stubName, args) {
                var texts = [];
                var text;
                switch (stubName) {
                    case ("connWorkbook"):
                        text = getConnectionSnippetText(username, userid, sessionName, token);
                        texts.push(text);
                        break;
                    case ("basicUDF"):
                        var text = "";
                        var colsArg = "";
                        var retStr = "";
                        var assertStr = "";
                        var moduleName;
                        var fnName;
                        var dfName;
                        var tableStub = "";
                        if (args && args.columns) {
                            for (var i = 0; i < args.columns.length; i++) {
                                var colVar = args.columns[i].replace(/[^a-zA-Z0-9]/g, "_");
                                colsArg += colVar + ", ";
                                retStr += "str(" + colVar + ") + ";
                                assertStr += 'row["' + args.columns[i] + '"], ';
                            }
                            colsArg = colsArg.slice(0, -2);
                            retStr = retStr.slice(0, -3);
                            assertStr = assertStr.slice(0, -2);
                            fnName = args.fnName;
                            moduleName = args.moduleName;

                            dfName = args.tableName.replace(/[#-]/g, "_") + '_pd';
                            tableStub = getPublishTableStub(args.tableName, args.allCols, 100, dfName);
                        } else {
                            colsArg = "col1, col2, col3";
                            retStr = "str(col1) + str(col2) + str(col3)";
                            assertStr += 'row[colName1], row[colName2], row[colName3]';
                            fnName = "yourUDF";
                            moduleName = "yourUDF";
                            dfName = "dataframeName";
                        }
                        text += '# Xcalar Map UDF Template\n' +
                                '#\n' +
                                '# This is a function definition for a Python Map UDF written to apply to \n' +
                                '# table: <' + args.tableName + '> columns: <' + colsArg + '>.\n' +
                                '#\n' +
                                '# Module name: <' + moduleName + '>\n' +
                                '# Function name: <' + fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Map UDF functions take one or more columns as arguments, and\n' +
                                '# return a string. \n' +
                                '#\n' +
                                '# To create a map UDF, edit the function definition below, named <' + fnName + '>. \n' +
                                '#\n' +
                                '# To test your map UDF, run this cell. (Hit <control> + <enter>.) \n' +
                                '#\n' +
                                '# To apply the <' + moduleName + '> module to your table <' + args.tableName + '> \n' +
                                '# click the "Use UDF on Table ' + args.tableName + '" button. \n' +
                                '#\n' +
                                '# NOTE: Use discipline before replacing this module. Consider whether previous \n' +
                                '# uses of this map UDF could be broken by new changes. If so, versioning this \n' +
                                '# module may be appropriate. \n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such \n' +
                                '# functions will be considered private functions and will not be directly \n' +
                                '# invokable from Xcalar tools.\n' +
                                '#' +
                                '# Map UDF function definition.\n' +
                                'def ' + fnName + '(' + colsArg + '):\n' +
                                '    # You can modify the function name.\n' +
                                '    # Your code starts from here. This is an example code.\n' +
                                '    return ' + retStr + '\n\n' +
                                '### WARNING DO NOT EDIT CODE BELOW THIS LINE ###\n' +
                                'from xcalar.external.LegacyApi.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'from xcalar.external.LegacyApi.Udf import Udf\n' +
                                'from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiException\n' +
                                'import random\n' +
                                '\n' +
                                (args.includeStub ?
                                'def uploadUDF():\n' +
                                '    import inspect\n' +
                                '    sourceCode = "".join(inspect.getsourcelines(' + fnName + ')[0])\n' +
                                '    try:\n' +
                                '        Udf(xcalarApi).add("'+ moduleName + '", sourceCode)\n' +
                                '    except XcalarApiException as e:\n' +
                                '        if e.status == StatusT.StatusUdfModuleAlreadyExists:\n' +
                                '            Udf(xcalarApi).update("'+ moduleName + '", sourceCode)\n' +
                                '\n' : '') +
                                '\n' +
                               tableStub +
                               'for index, row in ' + dfName + '.iterrows():\n' +
                               '    assert(type(' + fnName + '(' + assertStr + ')).__name__ == \'str\')\n' +
                               '    print(' + fnName + '(' + assertStr + '))\n\n' +
                                (args.includeStub ? 'uploadUDF()' : '');
                        texts.push(text);
                        break;
                    case ("importUDF"):
                        text =  (args.includeStub ?
                                '# Xcalar Import UDF Template\n' +
                                '#\n' +
                                '# This is a function definition for a Python UDF to import external data source\n' +
                                '# file <' + args.target + ":" + args.url + '>\n' +
                                '#\n' +
                                '# Module name: <' + args.moduleName + '>\n' +
                                '# Function name: <' + args.fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Import UDF functions take two arguments...\n' +
                                '#   fullPath: The file path to the data source file being imported.\n' +
                                '#   inStream: A binary stream of the data source file.\n' +
                                '#\n' +
                                '#   Your Import UDF function must be a generator, a Python function which\n' +
                                '#   processes and returns a stream of data.\n' +
                                '#\n' +
                                '# To create an import UDF, modify the function definition immediately below this\n' +
                                '# comment, as necessary.\n' +
                                '#\n' +
                                '# To test your UDF, run this cell. (Hit <control> + <enter>.)\n' +
                                '#\n' +
                                '# To apply it to your dataset, click the "Apply UDF on Dataset Panel" button.\n' +
                                '#\n#\n' :
                                '# Xcalar Debug Import UDF\n' +
                                '#\n' +
                                '# This snippet is used to debug the following Python UDF function from a module in the\n' +
                                '# User Defined Function editor.\n' +
                                '#\n' +
                                '# Module name: <' + args.moduleName + '>\n' +
                                '# Function name: <' + args.fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Import UDF functions take two arguments...\n' +
                                '#   fullPath: The file path to the data source file being imported.\n' +
                                '#   inStream: A binary stream of the data source file.\n' +
                                '#\n' +
                                '#   Your Import UDF function must be a generator, a Python function which\n' +
                                '#   processes and returns a stream of data.\n' +
                                '#\n' +
                                '# To debug your import UDF, modify the function definition in the User Defined Function\n' +
                                '# editor panel.\n' +
                                '#\n' +
                                '# To test your UDF, click ADD UDF in the editor and then run this cell. (Hit <control> +\n' +
                                '# <enter>.)\n' +
                                '#\n\n'
                            ) +
                                '# NOTE: Use discipline before replacing this module. Consider whether the import of older\n' +
                                '# data source files using this UDF will be affected by this change. If so, versioning this\n' +
                                '# module may be appropriate.\n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such\n' +
                                '# functions will be considered private functions and will not be directly\n' +
                                '# invokable from Xcalar tools.\n' +
                                '\n' +
                                (args.includeStub ?
                                '# Function definition for your Import UDF.\n' +
                                'def ' + args.fnName + '(fullPath, inStream):\n' +
                                '    # Edit only within this function.\n' +
                                '    # Please do not modify this function\'s name, or the first 2 arguments.\n' +
                                '\n' +
                                '    # The following sample code reads your file and prints it out with a line\n' +
                                '    # number\n' +
                                '    import codecs\n' +
                                '    Utf8Reader = codecs.getreader("utf-8")\n' +
                                '    utf8Stream = Utf8Reader(inStream)\n' +
                                '    lineNumber = 1\n' +
                                '    for line in utf8Stream:\n' +
                                '        yield {"lineNumber": lineNumber, "contents": line}\n' +
                                '        lineNumber += 1\n' +
                                '\n' : '') +
                                '### WARNING DO NOT EDIT CODE BELOW THIS LINE ###\n' +
                                'from xcalar.external.LegacyApi.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'from xcalar.external.LegacyApi.Udf import Udf\n' +
                                'from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiException\n' +
                                'import random\n' +
                                '\n' +
                                (args.includeStub ?
                                'def uploadUDF():\n' +
                                '    import inspect\n' +
                                '    sourceCode = "".join(inspect.getsourcelines(' + args.fnName + ')[0])\n' +
                                '    try:\n' +
                                '        Udf(xcalarApi).add("'+ args.moduleName + '", sourceCode)\n' +
                                '    except XcalarApiException as e:\n' +
                                '        if e.status == StatusT.StatusUdfModuleAlreadyExists:\n' +
                                '            Udf(xcalarApi).update("'+ args.moduleName + '", sourceCode)\n' +
                                '\n' : '') +
                                'def testImportUDF():\n' +
                                '    from IPython.core.display import display, HTML\n' +
                                '    userName = "'+ username + '"\n' +
                                '    tempDatasetName = userName + "." + str(random.randint(10000,99999)) + "jupyterDS" + str(random.randint(10000,99999))\n' +
                                '    dataset = UdfDataset(xcalarApi,\n' +
                                '        "'+ args.target + '",\n' +
                                '        "'+ args.url + '",\n' +
                                '        tempDatasetName,\n' +
                                '        "'+ args.moduleName + ':'+ args.fnName + '")\n' +
                                '\n' +
                                '    dataset.load()\n' +
                                '\n' +
                                '    resultSet = ResultSet(xcalarApi, datasetName=dataset.name, maxRecords=100)\n' +
                                '\n' +
                                '    NUMROWS = 100\n' +
                                '    rowN = 0\n' +
                                '    numCols = 0\n' +
                                '    headers = []\n' +
                                '    data = []\n' +
                                '    for row in resultSet:\n' +
                                '        if rowN >= NUMROWS:\n' +
                                '            break\n' +
                                '        newRow = [""] * numCols\n' +
                                '        for key in row:\n' +
                                '            idx = headers.index(key) if key in headers else -1\n' +
                                '            if idx > -1:\n' +
                                '                newRow[idx] = row[key]\n' +
                                '            else:\n' +
                                '                numCols += 1\n' +
                                '                newRow.append(row[key])\n' +
                                '                headers.append(key)\n' +
                                '        data.append(newRow)\n' +
                                '        rowN += 1\n' +
                                '    data = [row + [""] * (numCols - len(row)) for row in data]\n' +
                                '\n' +
                                '    print("The following should look like a proper table with headings.")\n' +
                                '    display(HTML(\n' +
                                '            \'<table><tr><th>{}</th></tr><tr>{}</tr></table>\'.format(\n' +
                                '            \'</th><th>\'.join(headers),\n' +
                                '            \'</tr><tr>\'.join(\'<td>{}</td>\'.format(\'</td><td>\'.join(str(_) for _ in row)) for row in data)\n' +
                                '            )))\n' +
                                '\n' +
                                '    dataset.delete()\n' +
                                '    print("End of UDF")\n' +
                                '\n' +
                                '# Test import UDF on file\n' +
                                (args.includeStub ? 'uploadUDF()\n' : '') +
                                'testImportUDF()';
                        texts.push(text);
                        break;
                    default:
                        return;
                }
                insertCellToSelected(texts, stubName, args);
            }
            function prependSessionStub(username, userid, sessionName, token) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = getConnectionSnippetText(username, userid, sessionName, token);
                cell.set_text(text);
                cell.execute();
                Jupyter.notebook.save_notebook();
            }

            function appendPublishTableStub(tableName, colNames, numRows, dfName) {
                dfName = dfName || tableName.replace(/[#-]/g, "_") + "_pd";
                var text = getPublishTableStub(tableName, colNames, numRows, dfName);
                text += dfName + "\n";
                insertCellToSelected([text]).execute();
                Jupyter.notebook.save_notebook();
            }

            function getPublishTableStub(tableName, colNames, numRows, dfName) {
                var rowsText = "all";
                if (numRows && numRows > 0) {
                    rowsText = numRows;
                }
                var text = '# Publish Table to Jupyter Notebook\n' +
                            '# \n' +
                            '# This snippet is configured to load <' + rowsText +'> rows of Xcalar table <' + tableName + '> into a pandas dataframe named\n' +
                            '# <' + tableName + '_pd>' + '.\n' +
                            '#\n' +
                            '# To instantiate or refresh your pandas dataframe, run the Connect snippet, \n' +
                            '# and then run this snippet. \n' +
                            '#\n' +
                            '# Best Practice is not to edit this code. \n' +
                            '#\n' +
                            '# To use different data with this Jupyter Notebook:\n' +
                            '# 1) Go to the table in your Xcalar Workbook.\n' +
                            '# 2) From the table menu, click Publish to Jupyter.\n' +
                            '# 3) Click full table or enter a number of rows and click submit.\n' +
                            '\n' +
                            '# Imports data into a pandas dataframe.\n' +
                            'def getDataFrameFromDict():\n' +
                            '    table_name = "' + tableName + '"\n' +
                            '    table_obj = session.get_table(table_name)\n' +
                            '    col_list = ';
                    text += "[";
                    for (var i = 0; i < colNames.length;i++) {
                        if (i > 0) {
                            text += ',';
                        }
                        text += '"' + colNames[i] + '"';
                    }
                    text += ']\n' +
                    '    return pd.DataFrame.from_dict(table_obj.records(num_rows=' + numRows + '))[col_list]\n' +
                    dfName + ' = getDataFrameFromDict()\n' +
                    dfName + '\n';
                return text;
            }

            // create folder, rename it,  send new name to XD
            function createNewFolder(struct) {
                Jupyter.contents.new_untitled("", {type: 'directory'})
                .then(function(data) {
                    renameFolderHelper(struct, struct.folderName, data.path)
                    .then(function(result) {
                        resolveRequest(result, struct.msgId);
                    })
                    .fail(function(result) {
                        rejectRequest(result, struct.msgId);
                    });
                })// jupyter doesn't have fail property
                .catch(function(e) {
                    rejectRequest(e, struct.msgId);
                });
            }

            function renameFolder(struct, newFolderName, oldFolderName) {
                struct.folderName = newFolderName;
                renameFolderHelper(struct, newFolderName, oldFolderName)
                .then(function(result) {
                    if (wkbkFolderName === oldFolderName) {
                        wkbkFolderName = result.newName;
                        sessionName = struct.sessionname;
                        sessionId = struct.sessionid;
                        updateLinks();
                        if (Jupyter.notebook.notebook_path.indexOf(oldFolderName + "/") === 0) {
                            validateSessionCells();
                        }
                    }
                    resolveRequest(result, struct.msgId);
                })
                .fail(function(result) {
                    rejectRequest(result, struct.msgId);
                });
            }

            function updateFolderName(struct) {
                if (wkbkFolderName === struct.oldFolderName) {
                    wkbkFolderName = struct.nwFolderName;
                    sessionName = struct.sessionname;
                    sessionId = struct.sessionid;
                    updateLinks();
                    if (Jupyter.notebook.notebook_path.indexOf(struct.oldFolderName + "/") === 0) {
                        validateSessionCells();
                    }
                }
            }

            // gets recursively called to copy folder's inner folders
            function copyFolder(oldFolder, newFolder) {
                Jupyter.contents.list_contents(oldFolder)
                .then(function(contents) {
                    contents.content.forEach(function(item) {
                        if (item.type === "notebook") {
                            Jupyter.contents.copy(item.path, newFolder);
                        } else if (item.type === "directory") {
                            Jupyter.contents.new_untitled(newFolder, {type: 'directory'})
                            .then(function(data) {
                                var split = data.path.split("/");
                                split.pop();
                                split.push(item.name);
                                var desiredPath = split.join("/");
                                renameFolderHelper({folderName: desiredPath}, desiredPath, data.path)
                                .then(function(result) {
                                    copyFolder(item.path, desiredPath);
                                });
                            });
                        }
                    });

                });
            }

            function renameFolderHelper(struct, folderName, prevName, attemptNumber, prevDeferred) {
                var deferred = prevDeferred || jQuery.Deferred();

                attemptNumber = attemptNumber || 0;
                attemptNumber++;
                Jupyter.contents.rename(prevName, folderName)
                .then(function(data) {
                    deferred.resolve({newName: data.name});
                })
                .catch(function(e) {
                    if (e && typeof e.message === "string") {
                        if (attemptNumber > 10) {
                            deferred.reject({error: "failed to create folder"});
                        } else if (e.message.indexOf("No such file") > -1) {
                            deferred.reject({error: "folder not found"});
                        } else if (e.message.indexOf("File already exists") === 0 &&
                            attemptNumber < 10) {
                            renameFolderHelper(struct, struct.folderName + "_" + attemptNumber, prevName, attemptNumber, deferred);
                        } else { // last try
                            renameFolderHelper(struct, struct.folderName + "_" + Math.ceil(Math.random() * 10000), prevName, attemptNumber, deferred);
                        }
                    } else {
                        deferred.reject({error: "failed to create folder"});
                    }
                });

                return deferred.promise();
            }

            function deleteFolder(folderName) {
                let deferred = jQuery.Deferred();

                // list contents
                // then delete inner contents
                // then delete self
                Jupyter.contents.list_contents(folderName)
                .then((contents) => {
                    let promises = [];
                    contents.content.forEach((item) => {
                        if (item.type === "directory") {
                            promises.push(deleteFolder(item.path));
                        } else {
                            promises.push(deleteFile(item.path));
                        }
                    });

                    PromiseHelper.when(...promises)
                    .then(() => {
                        Jupyter.contents.delete(folderName)
                        .then(function() {
                            Jupyter.notebook_deleted(folderName);
                            deferred.resolve();
                        })
                        .catch(deferred.resolve);
                    })
                    .fail(deferred.resolve);
                })
                .catch(deferred.resolve);

                return deferred.promise();
            }

            function deleteFile(path) {
                let deferred = jQuery.Deferred();
                Jupyter.contents.delete(path)
                .then(deferred.resolve)
                .catch(deferred.reject);
                return deferred.promise();
            }

            // hijack the navigation so that the user goes to their folder
            // when they leave the notebook
            function updateLinks() {
                var folderUrl = Jupyter.menubar.base_url + "tree/" + wkbkFolderName;
                // the jupyter icon on the top left
                $("#ipython_notebook").find("a").attr("href", folderUrl);
                // the "open" list item on the file menu
                $("#open_notebook").find("a").attr("href", folderUrl);
                // the "New Notebook" list item on the file menu
                $("#new-notebook-submenu-python3").find("a").off("click");
                $("#new-notebook-submenu-python3").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled(wkbkFolderName, {type: "notebook"})
                    .then(function(data) {
                        var url = Jupyter.menubar.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                        window.location.href = url;
                    });
                });
                $("#kill_and_exit").off("click");
                $("#kill_and_exit").click(function() {
                    window.location.href = folderUrl;
                });
            }

            // listeners are found by $._data(element, "events" ); we turn off
            // listeners that cause navigation away from current window
            function overwriteElementsAndListeners() {
                // hide the log out button on the upper right
                $("#login_widget").remove();

                // rework "open notebook" - prevent #open_notebook menu item from
                // opening in a new window
                $("#open_notebook").off("click");
                $("#open_notebook").find("a").click(function() {
                    var request = {
                        action: "updateLocation",
                        location: "tree",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                });
                $("#open_notebook").attr("title", "Opens the Dashboard view");
                $("#open_notebook").find("a").attr("href", Jupyter.menubar.base_url + "tree");

                // rework "new notebook" - prevent menu item from
                // opening in a new window
                $("#new-notebook-submenu-python3").find("a").off("click");
                $("#new-notebook-submenu-python3").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled("", {type: "notebook"})
                    .then(function(data) {
                        var url = Jupyter.menubar.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                        window.location.href = url;
                    });
                });

                // rework "kill and exit" - direct to tree after shutting down
                // notebook
                $("#kill_and_exit").click(function() {
                    window.location.href = Jupyter.menubar.base_url + "tree";
                });
                $("#close_and_halt").click(function() {
                    window.location.href = Jupyter.menubar.base_url + "tree";
                });

                window.onbeforeunload = function() {
                    return; // removes "do you want to leave" warning
                };
            }

            // checks for cells that have session info not related to current
            // session and replaces content with correct session info
            function validateSessionCells() {
                var cells = Jupyter.notebook.get_cells();
                var errors = [];
                for (var i = cells.length - 1; i >= 0; i--) {
                    var text = cells[i].get_text();
                    var lines = text.split("\n");
                    var cellNeedsReplace = false;
                    for (var j = 0; j < lines.length; j++) {
                        let curLine = lines[j];
                        if (curLine.indexOf("workbook = Session(xcalarApi") === 0) {
                            var cellWBInfo = parseSessInfoFromLine(curLine);
                            if (cellWBInfo.username !== '"' + username + '"' ||
                                cellWBInfo.userid !== "" + userid ||
                                cellWBInfo.sessionName !== '"' + sessionName + '"') {
                                lines[j] = 'workbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")';
                                cellNeedsReplace = true;
                                errors.push(
                                    {line: curLine,
                                    lineIndex: j + 1,
                                    cellIndex: i + 1,
                                    cell: cells[i]}
                                );
                            }
                        } else if (curLine.indexOf("xcalarApi = XcalarApi(client_token=\"") === 0) {
                            var lineToken = parseTokenFromLine(curLine);
                            if (lineToken !== token) {
                                lines[j] = "xcalarApi = XcalarApi(client_token=\"" + token + "\")";
                                cellNeedsReplace = true;
                            }
                        } else if (curLine.indexOf("xcalarClient = Client(client_token=\"") === 0) {
                            var lineToken = parseTokenFromLine(curLine);
                            if (lineToken !== token) {
                                lines[j] = "xcalarClient = Client(client_token=\"" + token + "\", user_name=\""  + username + "\")";
                                cellNeedsReplace = true;
                            }
                        }
                    }
                    if (cellNeedsReplace) { // replacement done here
                        cells[i].set_text(lines.join("\n"));
                    }
                }
                if (errors.length) {
                    return;
                    // XXX disabling
                    showSessionWarning(errors);
                }
            }

            function validateNotebookInUserFolder() {
                if (Jupyter.notebook.notebook_path.indexOf(wkbkFolderName + "/") === 0) {
                    // user is in his proper folder, check that the session stubs in this
                    // notebook matches the current session
                    validateSessionCells();
                    parent.postMessage(JSON.stringify({action: "toggleMenu", allow: true}), "*");
                } else if (Jupyter.notebook.notebook_path !== Jupyter.notebook.notebook_name &&
                    Jupyter.notebook.notebook_path.indexOf(wkbkFolderName + "/") !== 0) {
                    Jupyter.notebook.writable = false;
                    Jupyter.save_widget.set_save_status("(read only)");
                    Jupyter.save_widget.set_save_status = function () {}; // disable
                    $('#readonly-indicator').show(); // NotebookNoteificationArea
                    Jupyter.notification_area.widget_dict.notebook.warning("Notebook is read-only");
                    parent.postMessage(JSON.stringify({action: "toggleMenu", allow: false}), "*");
                } else {
                    // in root directory, users can modify any root files
                    Jupyter.notebook.notebook_path === Jupyter.notebook.notebook_name;
                    parent.postMessage(JSON.stringify({action: "toggleMenu", allow: true}), "*");
                }
            }

            function parseSessInfoFromLine(line) {
                line = line.slice(line.indexOf("("), line.indexOf(")"));
                line = line.split(",");
                return {
                    username: $.trim(line[1]),
                    userid: $.trim(line[3]),
                    sessionName: $.trim(line[5])
                };
            }

            function parseTokenFromLine(line) {
                line = line.slice(line.indexOf("\"") + 1);
                var token = line.slice(0, line.indexOf("\""))
                return token;
            }

            function parseQueryString(queryString) {
                var params = {}, queries, temp, i, l;
                // Split into key/value pairs
                queries = queryString.split("&");
                // Convert the array of strings into an object
                for ( i = 0, l = queries.length; i < l; i++ ) {
                    temp = queries[i].split('=');
                    params[temp[0]] = temp[1];
                }
                return params;
            }

            function showSessionWarning(errors) {
                var options = {
                    title: "Warning",
                    msg: "An invalid workbook connection was found. Please " +
                         "update the following workbook connection by " +
                         "selecting 'Connect to Xcalar Workbook' from the " +
                         "Code Samples menu.\n" + "Found: " + errors[0].line +
                         "\n" + "Expected: " + 'workbook = Session(xcalarApi, "' +
                        username + '", "' + username + '", ' + userid +
                        ', True, "' + sessionName + '")' ,
                    isAlert: true,
                    sizeToText: true
                };
                var message = {
                    action: "alert",
                    options: options,
                };
                parent.postMessage(JSON.stringify(message), "*");
            }

            // We probably want to put these codes in another file.
            $(document).on("change", "textarea", function(event) {
                var message = {
                    action: "mixpanel",
                    event: "Jupyter InputEvent",
                    property: {
                        "content": $(this).val(),
                        "element": getElementPath(event.target)
                    }
                };
                parent.postMessage(JSON.stringify(message), "*");
            });
            function getPathStr(ele) {
                var path = ele.prop("tagName");
                if (ele.attr("id")) {
                    path += "#" + ele.attr("id");
                }
                if (ele.attr("class")) {
                    path += "." + ele.attr("class");
                }
                return path;
            }
            function getElementPath(element) {
                try {
                    var path = getPathStr($(element));
                    var parents = $(element).parentsUntil("body");
                    for (var i = 0; (i < parents.length) && (path.length <= 255); i++) {
                        path += "|";
                        path += getPathStr($(parents).eq(i), path);
                    }
                    return path;
                } catch (err) {
                    // Do not affect our use with XD
                    return "Error case: " + err;
                }
            }
            // Those codes end up here

            // for new elements set up by XD
            function addXDButtonListeners() {
                $(document).on("click", ".udfToMapForm", function () {
                    var $btn = $(this);
                    if ($btn.hasClass("needsUpload")) {
                        return; // cell is executing
                    }
                    $btn.addClass("needsUpload");

                    var cell = Jupyter.notebook.get_selected_cell();
                    var originalText = cell.get_text();
                    var lines = originalText.split("\n");
                    lines.splice(-6, 6);
                    var modifiedText = lines.join("\n");
                    modifiedText += "\n" + "uploadUDF()";
                    cell.set_text(modifiedText);
                    cell.execute();
                    cell.set_text(originalText);
                });

                $(document).on("click", ".udfToDSPreview", function () {
                    var $btn = $(this);
                    if ($btn.hasClass("needsUpload")) {
                        return; // cell is executing
                    }
                    $btn.addClass("needsUpload");

                    // remove call to testImportUDF, execute, and restore
                    var cell = Jupyter.notebook.get_selected_cell();
                    var originalText = cell.get_text();
                    var lines = originalText.split("\n");
                    lines.splice(-1, 1);
                    var modifiedText = lines.join("\n");
                    cell.set_text(modifiedText);
                    cell.execute();
                    cell.set_text(originalText);
               });
            }

            // bind functions to jupyter events so that they get executed
            // whenever Jupyter calls "events.trigger('action')"
            function setupJupyterEventListeners() {
                // SQL magic
                require(['notebook/js/codecell'], function(codecell) {
                    // https://github.com/jupyter/notebook/issues/2453
                    codecell.CodeCell.options_default.highlight_modes['magic_text/x-sql'] = {'reg':[/^%read_sql/, /.*=\s*%read_sql/,
                                                                                                    /^%%read_sql/]};
                    Jupyter.notebook.events.one('kernel_ready.Kernel', function(){
                        console.log('Finish loading the syntax highlighting when kernel ready');
                        Jupyter.notebook.get_cells().map(function(cell){
                            if (cell.cell_type == 'code'){ cell.auto_highlight(); } }) ;
                        console.log('Reload xcalar sql magic')
                        Jupyter.notebook.kernel.execute("%reload_ext xcalar.external.xcalar_sql_magic")
                    });
                    // Auto-highlight as we type
                    Jupyter.notebook.events.on('edit_mode.Cell', function(){
                        c = Jupyter.notebook.get_selected_cell();
                        $(c.element).keyup(function(){
                            c.auto_highlight();
                        });
                    });
                });

                // when a cell finishes execution
                Jupyter.notebook.events.on("finished_execute.CodeCell", function(evt, data){
                    var cell = data.cell;
                    var text = cell.get_text();
                    var lines = text.split("\n");
                    if (hasUploadUdf(lines)) {
                        refreshUploadedUdf(lines, cell);
                    }
                });

                Jupyter.notebook.events.on("notebook_renamed.Notebook", function(evt, data) {
                    var request = {
                        action: "updateLocation",
                        location: "notebook",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                });

                function hasUploadUdf(lines) {
                    for (var i = lines.length - 1; i >= 0; i--) {
                        if (lines[i].indexOf("uploadUDF()") === 0) {
                            return true;
                        }
                    }
                    return false;
                }

                // find the name of the udf in the lines of cell code
                // and send XD to refresh udf list and
                function refreshUploadedUdf(lines, cell) {
                    var modNameSearchKey = '        Udf(xcalarApi).add("';
                    var fnNameSearchKey = '    sourceCode = "".join(inspect.getsourcelines(';
                    var moduleName;
                    var fnName;
                    for (var i = 0; i < lines.length; i++) {
                        if (lines[i].indexOf(modNameSearchKey) === 0) {
                            moduleName = lines[i].slice(modNameSearchKey.length);
                            moduleName = moduleName.slice(0, moduleName.indexOf("\""));
                        }
                        if (lines[i].indexOf(fnNameSearchKey) === 0) {
                            fnName = lines[i].slice(fnNameSearchKey.length);
                            fnName = fnName.slice(0, fnName.indexOf(")"));
                        }

                        if (moduleName && fnName) {
                            break;
                        }
                    }

                    if (fnName && moduleName) {
                        var $dsFormBtn = $(cell.element).find(".udfToDSPreview");
                        if ($dsFormBtn.length) {
                            $dsFormBtn.data("modulename", moduleName);
                            $dsFormBtn.data("fnname", fnName);
                            if ($dsFormBtn.hasClass("needsUpload")) {
                                $dsFormBtn.removeClass("needsUpload");
                                var request = {action: "udfToDSPreview",
                                    moduleName: moduleName,
                                    fnName: fnName
                                };
                                parent.postMessage(JSON.stringify(request), "*");
                            }
                        }
                        var $mapBtn = $(cell.element).find(".udfToMapForm");
                        if ($mapBtn.length) {
                            $mapBtn.data("modulename", moduleName);
                            $mapBtn.data("fnname", fnName);
                            if ($mapBtn.hasClass("needsUpload")) {
                                $mapBtn.removeClass("needsUpload");
                                var request = {action: "udfToMapForm",
                                    tableName: $mapBtn.data("tablename"),
                                    columns: $mapBtn.data("columns"),
                                    moduleName: moduleName,
                                    fnName: fnName
                                };
                                parent.postMessage(JSON.stringify(request), "*");
                            }
                        }
                    }
                }
            }

            function getConnectionSnippetText(username, userid, sessionName, token) {
                return  '# Xcalar Notebook Connector\n' +
                '# \n' +
                '# Connects this Jupyter Notebook to the Xcalar Workbook <' + sessionName + '>\n' +
                '#\n' +
                '# To use any data from your Xcalar Workbook, run this snippet before other \n' +
                '# Xcalar Snippets in your workbook. \n' +
                '# \n' +
                '# A best practice is not to edit this cell.\n' +
                '#\n' +
                '# If you wish to use this Jupyter Notebook with a different Xcalar Workbook \n' +
                '# delete this cell and click CODE SNIPPETS --> Connect to Xcalar Workbook.\n' +
                '\n' +
                '%matplotlib inline\n' +
                '\n' +
                '# Importing third-party modules to faciliate data work. \n' +
                'import pandas as pd\n' +
                'import matplotlib.pyplot as plt\n' +
                '\n' +
                '# Importing Xcalar packages and modules. \n' +
                '# For more information, search and post questions on discourse.xcalar.com\n' +
                'from xcalar.external.LegacyApi.XcalarApi import XcalarApi \n' +
                'from xcalar.external.client import Client \n' +
                '\n' +
                '# Create a Xcalar Client object \n' +
                'xcalarClient = Client(' + (token ? ('client_token="' + token + '", user_name="admin"') : '') + ')\n' +
                '\n' +
                '# Create a XcalarApi object\n' +
                'xcalarApi = XcalarApi(' + (token ? ('client_token="' + token + '"') : '') + ')\n' +
                '\n' +
                '# Connect to current workbook that you are in\n' +
                'workbook =  xcalarClient.get_workbook("' + sessionName + '")\n' +
                'session = workbook.activate()\n' +
                'xcalarApi.setSession(session)';
            }

            function resolveRequest(result, msgId) {
                var request = {
                    action: "resolve",
                    msgId: msgId
                };
                request = $.extend(request, result);
                parent.postMessage(JSON.stringify(request), "*");
            }

            function rejectRequest(result, msgId) {
                 var request = {
                    action: "reject",
                    msgId: msgId
                };
                request = $.extend(request, result);
                parent.postMessage(JSON.stringify(request), "*");
            }

            window.alert = function() {};

            (function() {
                var PromiseHelper = {};
                /**
                oneIter: Function that returns a promise. It represents one iteration of the
                loop.
                args: Arguments to apply to oneIter. Must be in an array
                condition: This is what we are going to call eval on. So this is a string
                that can take in arguments as in put and do whatever it wants with it. For
                example, if oneIter returns an integer, and we want to terminate if the
                integer is < 0.01(opaqueArgs.threshold), then
                condition = "arguments[0] < opaqueArgs.threshold"
                opaqueArgs: User can choose to use this argument in the condition. This
                function will not touch this argument and will not use it unless the caller
                manipulates it in side condition
                */
                PromiseHelper.deferred = function() {
                    return jQuery.Deferred();
                };

                PromiseHelper.doWhile = function(oneIter, args, condition, opaqueArgs) {
                    // XXX: Type check!
                    function doWork() {
                        return (oneIter.apply({}, args)
                                .then(function() {
                                    if (!eval(condition)) {
                                        return doWork();
                                    }
                                })
                            );
                    }
                    return doWork();
                };

                /**
                Same thing as doWhile except that it checks for the condition first before
                kicking into doWhile loop
                */
                PromiseHelper.while = function(oneIter, args, condition, opaqueArgs) {
                    if (!eval(condition)) {
                        return PromiseHelper.doWhile(oneIter, args, condition, opaqueArgs);
                    } else {
                        return PromiseHelper.resolve();
                    }
                };

                /**
                Runs all promises in the argument in parallel and resolves when all of
                them are complete or fails
                */
                PromiseHelper.when = function() {
                    var numProm = arguments.length;
                    if (numProm === 0) {
                        return PromiseHelper.resolve([]);
                    }
                    var mainDeferred = PromiseHelper.deferred();

                    var numDone = 0;
                    var returns = [];
                    var argument = arguments;
                    var hasFailures = false;

                    for (var t = 0; t < numProm; t++) {
                        whenCall(t);
                    }

                    function whenCall(i) {
                        argument[i].then(function() {
                            numDone++;
                            if (arguments.length === 0) {
                                returns[i] = undefined;
                            } else if (arguments.length === 1) {
                                returns[i] = arguments[0];
                            } else {
                                returns[i] = Array.prototype.slice.call(arguments);
                            }

                            if (numDone === numProm) {
                                if (hasFailures) {
                                    mainDeferred.reject.call($, returns);
                                } else {
                                    mainDeferred.resolve.call($, returns);
                                }
                            }
                        }, function() {
                            console.warn("Promise", i, "failed!");
                            numDone++;
                            if (arguments.length === 0) {
                                returns[i] = undefined;
                            } else if (arguments.length === 1) {
                                returns[i] = arguments[0];
                            } else {
                                returns[i] = Array.prototype.slice.call(arguments);
                            }
                            hasFailures = true;
                            if (numDone === numProm) {
                                console.log("All done!");
                                mainDeferred.reject.call($, returns);
                            }
                        });
                    }

                    return (mainDeferred.promise());
                };

                /**
                Chains the promises such that only after promiseArray[i] completes, then
                promiseArray[i+1] will start.
                */
                PromiseHelper.chain = function(promiseArray) {
                    // Takes an array of promise *generators*.
                    // This means that promisearray[i]() itself calls a promise.
                    // Reason for this being, promises start executing the moment they are
                    // called, so you need to prevent them from being called in the first place.
                    if (!promiseArray ||
                        !Array.isArray(promiseArray) ||
                        typeof promiseArray[0] !== "function") {
                        return PromiseHelper.resolve(null);
                    }
                    var head = promiseArray[0]();
                    if (head == null) {
                        head = PromiseHelper.resolve();
                    }
                    for (var i = 1; i < promiseArray.length; i++) {
                        head = head.then(promiseArray[i]);
                    }
                    return (head);
                };

                PromiseHelper.chainHelper = function(promiseFunction, valueArr) {
                    // Takes a function that returns a promise, and an array of values
                    // to pass to that promise in a chain order..
                    var promiseGeneratorClosures = [];
                    for (var i = 0; i < valueArr.length; i++) {
                        var promiseClosure = (function(someArg) {
                            return (function() {
                                return promiseFunction(someArg);
                            });
                        })(valueArr[i]);
                        promiseGeneratorClosures.push(promiseClosure);
                    }
                    return PromiseHelper.chain(promiseGeneratorClosures);
                };

                /* Always resolve when passed in promise is done */
                PromiseHelper.alwaysResolve = function(def) {
                    var deferred = PromiseHelper.deferred();
                    def.always(deferred.resolve);
                    return deferred.promise();
                };

                /* return a promise with resvoled value */
                PromiseHelper.resolve = function() {
                    var deferred = PromiseHelper.deferred();
                    deferred.resolve.apply(this, arguments);
                    return deferred.promise();
                };

                /* return a promise with rejected error */
                PromiseHelper.reject = function() {
                    var deferred = PromiseHelper.deferred();
                    deferred.reject.apply(this, arguments);
                    return deferred.promise();
                };

                /**
                 * Convert JQuery/XD promise to native promise
                 */
                PromiseHelper.convertToNative = function(promise) {
                    if (typeof promise.fail !== 'undefined') {
                        // JQuery/XD promise
                        return new Promise((resolve, reject) => {
                            try {
                                promise
                                    .then((ret) => { resolve(ret) })
                                    .fail((e) => { reject(e) });
                            } catch(e) {
                                reject(e);
                            }
                        });
                    } else {
                        // Native promise
                        return promise;
                    }
                };

                /**
                 * Convert native promise to JQuery/XD promise
                 */
                PromiseHelper.convertToJQuery = function(promise) {
                    if (typeof promise.fail === 'undefined') {
                        // Native promise
                        const deferred = PromiseHelper.deferred();
                        try {
                            promise
                                .then((ret) => { deferred.resolve(ret) })
                                .catch((e) => { deferred.reject(e) });
                        } catch(e) {
                            deferred.reject(e);
                        }
                        return deferred.promise();
                    } else {
                        // JQuery/XD promise
                        return promise;
                    }
                }

                if (typeof exports !== "undefined") {
                    if (typeof module !== "undefined" && module.exports) {
                        exports = module.exports = PromiseHelper;
                    }
                    exports.PromiseHelper = PromiseHelper;
                } else {
                    window.PromiseHelper = PromiseHelper;
                }

            }());
        }
    };
});