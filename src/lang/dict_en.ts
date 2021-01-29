export default {
    "CommonTStr": {
        "Confirm": "Confirm",
        "Close": "Close",
        "Cancel": "Cancel",
        "Delete": "Delete",
        "DateModified": "Date Modified",
        "Loading": "Loading",
        "Maximize": "Maximize",
        "Minimize": "Minimize",
        "PleaseWait": "Please wait",
        "Size": "Size",
        "Name": "Name"
    },

    "DeleteTableModalTStr": {
        "header": "Delete Tables",
        "instr": "To free space in this application please delete old or unnecessary tables.",
        "confirm": "Are you sure you want to delete the selected table(s)?",
    },

    "DeletePbTableModalTStr": {
        "header": "Drop Published Tables",
        "instr": "To free space in this application please drop unused published tables.",
        "confirm": "Are you sure you want to drop the selected tables? This action cannot be undone.",
    },

    "ReceateTablesModalTStr": {
        "header": "Recreate tables",
        "instr": "Select tables from the deactivated table list and confirm to recreate them.",
        "confirm": "Are you sure you want to recreate the selected tables?",
        "oneSelection": "1 table is selected",
        "multipleSection": "<num> tables are selected",
    },

    "DeleteSQLModalTStr": {
        "header": "Delete SQL Statements",
        "confirm": "Are you sure you want to delete the selected SQL statement(s)?",
    },

    "DeleteModulesTStr": {
        "header": "Delete Modules",
        "confirm": "Are you sure you want to delete the selected module(s)?",
        "Error": "Delete Modules Error",
    },

    "DeleteTableFuncTStr": {
        "header": "Delete Table Functions",
        "confirm": "Are you sure you want to delete the selected table function(s)?",
        "Error": "Delete Table Functions Error",
    },

    "DeleteAppTStr": {
        "header": "Delete Apps",
        "confirm": "Are you sure you want to delete the selected app(s)?",
        "Error": "Delete Apps Error",
    },

    "TooltipTStr": {
        "LockedTable": "Table is pinned",
    },

    "StatusMessageTStr": {
        'Deleting': 'Deleting',
    },

    "DSTargetTStr" : {
        "Create": "Create connector",
        "AdminOnly": "Only admins can create new connector",
        "DEL": "DELETE CONNECTOR",
        "DelFail": "Connector Deletion Failed",
        "NoDelete": "Cannot delete the default connector",
        "NoReservedName": "The connector name is reserved, please use another name",
        // with replace
        "DelConfirmMsg": "Are you sure you want to delete <target>?",
        "TargetExists": "Connector <target> already exists",
        "MountpointNoExists": "Mount point <mountpoint> does not exist. Please choose a valid mount point",
    },

    "AlertTStr": {
        'Title': 'Warning',
        'Error': 'Error',
        'ErrorMsg': 'Error Occurred.',
        'ContinueConfirm': 'Are you sure you want to continue?',
        'BracketsMis': 'Mismatched Brackets',
        'CLOSE': 'Close',
        'Close': 'Close',
        'Cancel': 'Cancel',
        'Confirm': 'Confirm',
        'Confirmation': 'Confirmation',
        'NoConnectToServer': "Cannot Connect to Xcalar Server's web socket, please check if the socket protocol is enabled or contact Xcalar support",
        'NoConnect': 'Not connected.',
        'Connecting': 'Connecting...',
        'TryConnect': 'Connecting in <second>s.',
        'UserOverLimit': 'Concurrent Users Over Limit',
        'UserOverLimitMsg': 'Number of concurrent users is over the limit supported by the license. Please logout',
        'UnexpectInit': 'Unexpected Initialization Time',
        'UnexpectInitMsg': 'The initialization time is taking longer than usual. ' +
                         'This may be due to a slow network connection or a ' +
                         'previously disrupted or concurrent initialization. ' +
                         'You can choose to retry and wait a little longer, or ' +
                         'you can force the current initialization to overwrite ' +
                         'any concurrent / previously disrupted initialization.',
        "WaitChat": "Searching for an available Xcalar agent...",
        "StartChat": "You are now connected to a Xcalar agent.",
        "CaseId": "Your case ID is:",
        "LicenseKey": "Your license key is:",
        "LicenseExpire": "Your license expires on:",
        "XcalarAdmin": "Your Xcalar Admin is:",
        "TicketError": "Unable to create a support ticket from here. Please go to https://myxcalar.zendesk.com to create a support ticket.",
        "EmailEnabled": "Send Email",
        "EmailDisabled": "Type a message first",
        "EmailSending": "Sending email...",
        "EmailSent": "Success! All messages have been sent to your email address.",
        "EmailFunc": "You can click the left top button to send a " +
                     "copy of all messages to your email address.",
        "NoSupport": "Oops... We couldn't find an available agent for you.",
        "WaitTicket": "Please wait for a few seconds while we create a ticket for you.",
        "NoEdits": "No edits",
        "NoEditsDetected": "No edits were detected",
        "EditInProgress": "Edit in progress",
        "EditExitWarning": "Are you sure you want to exit edit mode and abandon all changes?",
        "AlreadyStart": "Cluster Already Started",
        "FilePathError": "The file path could not be generated",
        "SendSchemaDateDetectedTitle": "Date column detected",
        "SendSchemaDateDetectedMsg": "Do you want to send schema of column(s) below as date type?",
        "UnsupportedBrowser": "Unsupported Browser",
        "BrowserVersions": "You are running an unsupported browser. Please use one of the following browsers:<br>Chrome (version 65+)<br>Firefox (version 59+)<br>Safari (version 11.1+)",
        "BrowserWarning": "Browser Warning",
        "NotChrome": "In order to have a seamless experience, we recommend you access Xcalar through Google Chrome.",
        "queryHistorySQLErrorTitle": "SQL Error",
        "queryHistoryReadErrorTitle": "Read SQL history failed",
        "AutoTblManagerError": "Automatic Table Manager failed to setup.",
        "DFLinkGraphError": "Plan Output '<inName>' must be created in the graph '<graphName>'.",
        "DFLinkShouldLinkError": "The Plan Output for '<inName>' must be manually executed before the output can be used.",
        "SharedCustomOpDeleteTitle": "Delete",
        "ShardCustomOpDeleteMsg": "Are you sure you want to delete the operator?",
        "LowOnCredits": "This is a reminder that you are running low on credits and have <time> minutes remaining. To add more credits, please go to <a href=\"<link>\" target=\"_blank\"><path></a> or contact customer service.",
        "ShutDownCredits": "You are almost out of credits and will be logged out in 1 minute. Please finish any work you have in progress."
    }
}