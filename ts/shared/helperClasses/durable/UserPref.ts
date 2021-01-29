class UserPref extends Durable {
    public general: object; // holds general settings
    public dfAutoExecute: boolean; // DF 2.0 settings
    public dfAutoPreview: boolean; // DF 2.0 settings
    public dfProgressTips: boolean; // DF 2.0 settings
    public dfConfigInfo: boolean; // DF 2.0 settings
    public dfTableName: boolean;// DF 2.0 settings
    public dfLabel: boolean;// DF 2.0 settings
    public dfPinOperatorBar: boolean;

    public constructor (options?: UserPrefDurable) {
        options = options || <UserPrefDurable>{};
        super(options.version);

        this.general = options.general || {}; // holds general settings that can
        // be set by user but if a setting is not set, will default to those in
        // GenSettings

        // dfAutoExecute and dfAutoPreview is true by default
        this.dfAutoExecute = (options.dfAutoExecute == null) ? true : options.dfAutoExecute;
        this.dfAutoPreview = (options.dfAutoPreview == null) ? true : options.dfAutoPreview;
        this.dfProgressTips = (options.dfProgressTips == null) ? true : options.dfProgressTips;
        this.dfConfigInfo = (options.dfConfigInfo == null) ? true : options.dfConfigInfo;
        this.dfTableName = (options.dfTableName == null) ? true : options.dfTableName;
        this.dfLabel = (options.dfLabel == null) ? true : options.dfLabel;
        this.dfPinOperatorBar = (options.dfPinOperatorBar == null) ? false : options.dfPinOperatorBar;
        this.dfPreviewLimit = (options.dfPreviewLimit == null) ? 1000 : options.dfPreviewLimit;
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used;
    protected _getDurable() {
        return null;
    }
}