const XcrpcSDK = require('xcalarsdk');
const datasetConfig = require('../config/Dataset');

function createDatasetHelper({ sdkClient, userName, sessionName, dsKey, dsPrefix }) {
    const _dsPrefix = `${dsPrefix}.${dsKey}`;
    const _createDSArgs = datasetConfig[dsKey];
    if (_createDSArgs == null) {
        throw new Error(`Dataset config not found: ${dsKey}`);
    }

    let _dsId = 0;
    function _genDSName() {
        return `${_dsPrefix}${Date.now()}${_dsId ++}`;
    }

    return {
        createDS: async () => {
            const testDSName = _genDSName();
            await sdkClient.getDatasetService().create({
                datasetName: testDSName,
                loadArgs: _createDSArgs,
                scope: XcrpcSDK.Dataset.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: userName,
                    workbookName: sessionName
                }
            });
            return testDSName;
        },
        getLoadArgs: () => {
            return JSON.parse(JSON.stringify(_createDSArgs));
        },
        genDSName: () => _genDSName()
    };
}

module.exports = createDatasetHelper;