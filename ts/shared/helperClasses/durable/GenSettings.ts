class GenSettings extends Durable {
    private adminSettings: GenSettingOptionsDurable; // admin settings
    private xcSettings: GenSettingOptionsDurable; // xcSttings
    private baseSettings: GenSettingOptionsDurable; // baseSettings

    constructor(
        userConfigParms?: GenSettingOptionsDurable,
        options?: GenSettingsDurable
    ) {
        // XXX do ew still need userConfigParms?
        userConfigParms = userConfigParms || <GenSettingOptionsDurable>{};
        options = options || <GenSettingsDurable>{};
        super(options.version);

        let adminSettings: GenSettingOptionsDurable = options.adminSettings || <GenSettingOptionsDurable>{};
        let xcSettings: GenSettingOptionsDurable = options.xcSettings || <GenSettingOptionsDurable>{};
        this.adminSettings = adminSettings;
        this.xcSettings = xcSettings;

        let defaultSettings = {
            "hideDataCol": false,
            "monitorGraphInterval": 3, // in seconds
            "commitInterval": 120, // in seconds
            "logOutInterval": 25, // in minutes
        };
        defaultSettings = Object.assign({}, defaultSettings, userConfigParms);
        this.baseSettings = Object.assign({}, defaultSettings,
            this.xcSettings, this.adminSettings);
    }

    public getPref(pref: string) {
        return this.baseSettings[pref];
    }

    public getBaseSettings(): GenSettingOptionsDurable {
        return this.baseSettings;
    }

    public updateAdminSettings(settings: GenSettingOptionsDurable): void {
        let prevAdminSettings = this.adminSettings;
        this.adminSettings = Object.assign({}, prevAdminSettings, settings);
    }

    public cleanAdminSettings(): void {
        this.adminSettings = <GenSettingOptionsDurable>{};
    }

    public updateXcSettings(settings: GenSettingOptionsDurable): void {
        let prevXcSettings = this.xcSettings;
        this.xcSettings = Object.assign({}, prevXcSettings, settings);
    }

    public getAdminAndXcSettings(): GenSettings {
        return new GenSettings(null, {
            "adminSettings": this.adminSettings,
            "xcSettings": this.xcSettings,
            "version": undefined
        });
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }
}
