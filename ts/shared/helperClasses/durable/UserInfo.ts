// XXX TODO: clean it up to only use UserPrefDurable
class UserInfo extends Durable {
    private userpreference: UserPref; // user preference meta

    constructor(options: UserInfoDurable) {
        options = options || <UserInfoDurable>{};
        super(options.version);

        let userpreference = options.userpreference || <UserPrefDurable>{};
        this.userpreference = new UserPref(userpreference);
    }

    public update(): void {
        this.userpreference = UserSettings.Instance.getAllPrefs();
    }

    public getPrefInfo() {
        return this.userpreference;
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