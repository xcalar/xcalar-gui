const XcrpcSDK = require('xcalarsdk');
const SessionScope = XcrpcSDK.Session.SCOPE;

function createSessionHelper({ sdkClient, userName, sessionName }) {
    const _sessionService = sdkClient.getSessionService();

    function _create() {
        return _sessionService.create({
            sessionName: sessionName,
            fork: false,
            forkedSessionName: "",
            scope: SessionScope.WORKBOOK,
            scopeInfo: {
                userName: userName,
                workbookName: sessionName
            }
        });
    }

    function _activate() {
        return _sessionService.activate({
            sessionName: sessionName,
            scope: SessionScope.WORKBOOK,
            scopeInfo: {
                userName: userName,
                workbookName: sessionName
            }
        });
    }

    return {
        createAndActivate: async () => {
            await _create();
            await _activate();
        }
    };
}

module.exports = createSessionHelper;