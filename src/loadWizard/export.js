import * as SchemaLoadSetting from './services/SchemaLoadSetting'
import * as SchemaLoadService from './services/SchemaLoadService'

import * as Session from './services/sdk/Session'

window['XcalarLoad'] = {
    Setting: SchemaLoadSetting,
    SchemaLoadService: SchemaLoadService,
    workSessionName: Session.loadSessionName,
    sdk: {
        Session: Session
    }
};
