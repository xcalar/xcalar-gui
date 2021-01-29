class UserSettings {
    private static _instance: UserSettings;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }


    private userInfos: UserInfo;
    private userPrefs: UserPref;
    private genSettings: GenSettings;
    private cachedPrefs = {};
    private monIntervalSlider;
    private commitIntervalSlider;
    private logOutIntervalSlider;
    private revertedToDefault = false;
    private modalHelper: ModalHelper;
    private _dfSettings: {name: string, text: string, type?: string}[];


    // oldUserInfos/userInfos contains settings such as if the user last had
    // list vs grid view on in the file browser, also contains general settings
    // which has the user's version of genSettings (ones editable in the
    // settings panel)
    // prevSettings/genSettings has the settings that are editable in the
    // settings panel such as monitor interval time
    /**
     * UserSettings.Instance.restore
     * @param oldUserInfos
     * @param prevSettings
     */
    public restore(
        oldUserInfos: UserInfo,
        prevSettings: GenSettingsDurable
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.setup();
        this.userInfos = oldUserInfos;
        this.userPrefs = this.userInfos.getPrefInfo();

        this._initDFSettings();

        this.saveLastPrefs();
        this.genSettings = new GenSettings(<any>{}, prevSettings);
        this.restoreSettingsPanel();
        deferred.resolve();
        return deferred.promise();
    }


    /**
     * when other workbook changes settings
     * UserSettings.Instance.sync
     */
    public sync() {
        let oldUserInfos: UserInfo;

        KVStore.getUserInfo()
        .then((userMeta) => {
            oldUserInfos = new UserInfo(userMeta);
            return KVStore.getSettingInfo();
        })
        .then((prevSettings) => {
            this.userPrefs = new UserPref();
            this.userInfos = oldUserInfos;
            this.userPrefs = this.userInfos.getPrefInfo();
            this.saveLastPrefs();
            this.genSettings = new GenSettings(<any>{}, prevSettings);
            this.restoreSettingsPanel();
        });
    }

    /**
     * UserSettings.Instance.commit
     * @param showSuccess
     * @param hasDSChange
     * @param isPersonalChange
     */
    public commit(
        showSuccess: boolean,
        hasDSChange: boolean = false,
        isPersonalChange: boolean = false,
        isGeneralChange: boolean = false,
    ): XDPromise<void> {
        if (!this.userPrefs) {
            // UserSettings.Instance.commit may be called when no workbook is created
            // and userPrefs has not been set up.
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userPrefHasChange = this.userPrefChangeCheck();
        let shouldCommit: boolean = hasDSChange || userPrefHasChange || this.revertedToDefault;
        if (shouldCommit) {
            this.userInfos.update();

            // if regular user, we will only commit userInfos with gUserKey.
            // if admin, we may commit userInfos/gUserKey
            // if there is a ds folder change, or we may commit genSettings
            // if there is a settings change, or both

            let dsPromise: XDPromise<void>;
            let userPrefPromise: XDPromise<void>;
            let userKey: string = KVStore.getKey("gUserKey");
            let userStore: KVStore = new KVStore(userKey, gKVScope.USER);
            let settingsKey: string = KVStore.getKey("gSettingsKey");
            let settingsStore: KVStore = new KVStore(settingsKey, gKVScope.GLOB);

            if (hasDSChange) {
                dsPromise = userStore.put(JSON.stringify(this.userInfos), true);
            } else {
                dsPromise = PromiseHelper.resolve();
            }

            if (userPrefHasChange || this.revertedToDefault) {
                if (Admin.isAdmin() && !isPersonalChange || isGeneralChange) {
                    this.genSettings.updateAdminSettings(this.getPref('general'));
                    userPrefPromise = settingsStore.putWithMutex(
                        JSON.stringify(this.genSettings.getAdminAndXcSettings()), true);
                } else if (!hasDSChange) {
                    userPrefPromise = userStore.put(JSON.stringify(this.userInfos), true);
                } else {
                    // if has dsChange, dsPromise will take care of it
                    userPrefPromise = PromiseHelper.resolve();
                }
            } else {
                userPrefPromise = PromiseHelper.resolve();
            }

            let $userSettingsSave = $("#userSettingsSave");
            xcUIHelper.disableSubmit($userSettingsSave);

            dsPromise
            .then(() => {
                return userPrefPromise;
            })
            .then(() => {
                this.revertedToDefault = false;
                this.saveLastPrefs();
                XcSocket.Instance.sendMessage("refreshUserSettings", {});
                if (showSuccess) {
                    xcUIHelper.showSuccess(SuccessTStr.SaveSettings);
                }
                deferred.resolve();
            })
            .fail((error) => {
                console.error("Commit User Info failed", error);
                if (showSuccess) {
                    xcUIHelper.showFail(FailTStr.SaveSettings);
                }
                deferred.reject(error);
            })
            .always(() => {
                xcUIHelper.enableSubmit($userSettingsSave);
            });
        } else {
            if (showSuccess) {
                xcUIHelper.showSuccess(SuccessTStr.SaveSettings);
            }
            deferred.resolve();
        }

        return deferred.promise();
    }

    /**
     * UserSettings.Instance.getAllPrefs
     */
    public getAllPrefs(): UserPref {
        return this.userPrefs || new UserPref();
    }

    /**
     * UserSettings.Instance.getPref
     * @param pref
     */
    public getPref(pref: string): any {
        if (!this.userPrefs) {
            return null;
        }
        if (this.userPrefs.hasOwnProperty(pref)) {
            return this.userPrefs[pref];
        } else {
            for (let i in this.userPrefs) {
                if (this.userPrefs[i] != null &&
                    typeof this.userPrefs[i] === "object" &&
                    this.userPrefs[i].hasOwnProperty(pref)
                ) {
                    return this.userPrefs[i][pref];
                }
            }
        }
        // if not found in userPrefs, check general settings
        return this.genSettings.getPref(pref);
    }

    /**
     * UserSettings.Instance.setPref
     */
    public setPref(
        pref: string,
        val: any,
        isGeneral?: boolean
    ): void {
        if (isGeneral) {
            this.userPrefs.general[pref] = val;
        } else {
            this.userPrefs[pref] = val;
        }
    }

    /**
     * UserSettings.Instance.revertDefault
     */
    public revertDefault(): void {
        let newPrefs: UserPref = new UserPref();
        this.userPrefs = newPrefs;
        if (Admin.isAdmin() && !XVM.isSingleUser()) {
            this.genSettings = new GenSettings();
        }
        this._renderDFSettings();
        this.restoreSettingsPanel();
        this.revertedToDefault = true;
    }

    public show(): void {
        if (!this.modalHelper) {
            return; // not setup yet
        }
        this.modalHelper.setup();
        this._renderDFSettings();
        if ($("#sqlWorkSpacePanel").is(":visible")) {
            this._getModal().find(".leftSection .tab[data-action='notebookSettings']").click();
        } else {
            this._getModal().find(".leftSection .tab[data-action='generalSettings']").click();
        }
    }

    private _close(): void {
        this.modalHelper.clear();
        this._getModal().find(".dfSettings .content").empty();
    }

    private setup(): void {
        const $modal = $("#userSettingsModal");
        this.modalHelper = new ModalHelper($modal, {
            sizeToDefault: true
        });

        this.userPrefs = new UserPref();
        this.addEventListeners();
    }

    private _getModal(): JQuery {
        return $("#userSettingsModal");
    }

    private saveLastPrefs(): void {
        this.cachedPrefs = xcHelper.deepCopy(this.userPrefs);
    }

    private userPrefChangeCheck(): boolean {
        let shouldCommit: boolean = false;
        if (this.userPrefs == null) {
            // in case commit is triggered at setup time
            if (this.userInfos != null) {
                // this is a error case
                console.error("userPreference is null!");
            }

            return false;
        }
        for (let key in this.userPrefs) {
            if (!this.userPrefs.hasOwnProperty(key)) {
                continue;
            }
            if (this.cachedPrefs[key] == null && this.userPrefs[key] == null) {
                continue;
            } else if (this.cachedPrefs[key] == null || this.userPrefs[key] == null) {
                shouldCommit = true;
                break;
            } else if (this.cachedPrefs[key] !== this.userPrefs[key]) {
                if (typeof this.userPrefs[key] === "object") {
                    for (let pref in this.userPrefs[key]) {
                        if (!this.userPrefs[key].hasOwnProperty(pref)) {
                            continue;
                        }
                        if (this.cachedPrefs[key][pref] !== this.userPrefs[key][pref]) {
                            shouldCommit = true;
                            break;
                        }
                    }
                    if (!shouldCommit) {
                        for (let pref in this.cachedPrefs[key]) {
                            if (this.cachedPrefs[key][pref] !== this.userPrefs[key][pref])
                            {
                                shouldCommit = true;
                                break;
                            }
                        }
                    }
                    if (shouldCommit) {
                        break;
                    }
                } else if (typeof this.userPrefs[key] !== "function") {
                    shouldCommit = true;
                    break;
                }
            }
        }
        return shouldCommit;
    }

    private toggleSyntaxHighlight(on: boolean): void {
        SQLEditorSpace.Instance.toggleSyntaxHighlight(on);
        UDFPanel.Instance.toggleSyntaxHighlight(on);
    }

    private addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        const self = this;
        $("#showSyntaxHighlight").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                self.setPref("hideSyntaxHiglight", false, true);
                self.toggleSyntaxHighlight(true);
            } else {
                self.setPref("hideSyntaxHiglight", true, true);
                self.toggleSyntaxHighlight(false);
            }
        });

        $("#showDataColBox").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                self.setPref("hideDataCol", false, true);
            } else {
                self.setPref("hideDataCol", true, true);
            }
        });

        this.monIntervalSlider = new RangeSlider($('#monitorIntervalSlider'),
        'monitorGraphInterval', {
            minVal: 1,
            maxVal: 60,
            onChangeEnd: function(val) {
                MonitorPanel.updateSetting(val * 1000);
            }
        });

        this.commitIntervalSlider = new RangeSlider($('#commitIntervalSlider'),
        'commitInterval', {
            minVal: 10,
            maxVal: 600,
            onChangeEnd: function() {
                XcSupport.heartbeatCheck();
            }
        });

        this.logOutIntervalSlider = new RangeSlider($('#logOutIntervalSlider'),
        'logOutInterval', {
            minVal: 10,
            maxVal: 120,
            onChangeEnd: function(val) {
                // here update the logout timeout value
                XcUser.CurrentUser.updateLogOutInterval(val);
            }
        });

        const $colorThemeDropdown = this._getColorThemeDropdown();
        new MenuHelper($colorThemeDropdown, {
            onSelect: ($li) => {
                const colorTheme = $li.data("option");
                self.setPref("colorTheme", colorTheme, true);
                self._setColorTheme(colorTheme);
            },
            container: "#userSettingsModal",
            bounds: "#userSettingsModal"
        }).setupListeners();

        $("#userSettingsSave").click(function() {
            self._saveDFSettings();
            self.commit(true);
            self._close();
        });

        $("#userSettingsDefault").click(function() {
            // var sets = UserSettings;
            // var genSets = genSettings;
            self.revertDefault();
            self._saveDFSettings();
            self.commit(true);
            self._close();
        });

        $("#userSettingsModal").on("click", ".close, .cancel", () => {
            self._close();
        });

        $modal.find(".dfSettings").on("click", ".checkboxSection .text, .checkboxSection .checkbox", (event) => {
            $(event.currentTarget).closest(".checkboxSection")
            .find(".checkbox").toggleClass("checked");
        });

        $modal.find(".dfSettings").on("change", ".dfSettingInput", (event) => {
            let $input = $(event.currentTarget);
            let val = $input.val().trim();
            let name = $input.data("name");
            switch (name) {
                case ("dfPreviewLimit"):
                    if (!val || isNaN(val)) {
                        $input.val($input.data("prevval"))
                    } else {
                        val = parseInt(val);
                        if (val < 1) {
                            val = 1;
                        }
                        $input.val(val);
                        $input.data("prevval", val);
                    }
                    break;
                default:
                    break;
            }

        });

        $modal.find(".leftSection .tab").on("click", (event) => {
            const $tab = $(event.target)
            let action = $tab.data("action");
            $modal.find(".leftSection .tab").removeClass("active");
            $tab.addClass("active");
            $modal.find(".settingsSection").addClass("xc-hidden");
            $modal.find("." + action).removeClass("xc-hidden");
        });
    }

    private restoreSettingsPanel(): void {
        const hideSyntaxHiglight = this.getPref("hideSyntaxHiglight")
        let hideDataCol = this.getPref("hideDataCol");
        let graphInterval = this.getPref("monitorGraphInterval");
        let commitInterval = this.getPref("commitInterval");
        let logOutInterval = this.getPref("logOutInterval");
        const colorTheme = this.getPref("colorTheme") || CodeMirrorManager.DefaultColorTheme;

        if (!hideSyntaxHiglight) {
            $("#showSyntaxHighlight").addClass("checked");
        } else {
            $("#showSyntaxHighlight").removeClass("checked");
        }

        if (!hideDataCol) {
            $("#showDataColBox").addClass("checked");
        } else {
            $("#showDataColBox").removeClass("checked");
        }

        this._setColorTheme(colorTheme);
        XcUser.CurrentUser.updateLogOutInterval(logOutInterval);

        this.monIntervalSlider.setSliderValue(graphInterval);
        this.commitIntervalSlider.setSliderValue(commitInterval);
        this.logOutIntervalSlider.setSliderValue(XcUser.CurrentUser.getLogOutTimeoutVal() / (1000 * 60));
    }

    private _getColorThemeDropdown(): JQuery {
        return $("#colorThemeSelector");
    }

    private _setColorTheme(colorTheme: string): void {
        colorTheme = colorTheme || CodeMirrorManager.Instance.getColorTheme();
        const $colorThemeDropdown = this._getColorThemeDropdown();
        const $li = $colorThemeDropdown.find("li").filter((_index, e) => {
            return $(e).data("option") === colorTheme;
        });
        if ($li.length) {
            $colorThemeDropdown.find(".text").text($li.text());
        }
        CodeMirrorManager.Instance.setColorTheme(colorTheme);
    }

    private _initDFSettings() {
        this._dfSettings = [{
                name: "dfAutoExecute",
                text: DFTStr.AutoExecute
            }, {
                name: "dfAutoPreview",
                text: DFTStr.AutoPreview
            }, {
                name: "dfProgressTips",
                text: DFTStr.ShowProgressTips
            }, {
                name: "dfLabel",
                text: DFTStr.ShowLabels
            }, {
                name: "dfConfigInfo",
                text: DFTStr.ShowConfigInfo
            }, {
                name: "dfTableName",
                text: DFTStr.ShowTableName
            }, {
                name: "dfPreviewLimit",
                text: DFTStr.PreviewLimit,
                type: "numberInput",
                tip: "The preview limit is the number of rows that will be sampled when previewing an operator's result during editing."
            }
        ];
    }

    private _saveDFSettings() {
        if (!DagPanel.Instance.hasSetup() || !WorkbookManager.getActiveWKBK()) {
            return;
        }
        const $modal: JQuery = this._getModal();
        const $rows: JQuery = $modal.find(".dfSettings .row");
        this._dfSettings.forEach((setting, index) => {
            const name: string = setting.name;
            let val;
            if (setting.type === "numberInput") {
                val = $rows.eq(index).find("input").data("prevval");
            } else {
                val = $rows.eq(index).find(".checkbox").hasClass("checked");
            }
            this.setPref(name, val, false);
            switch(name) {
                case ("dfProgressTips"):
                    DagViewManager.Instance.toggleProgressTips(val);
                    break;
                case ("dfLabel"):
                    DagViewManager.Instance.toggleLabels(val);
                    break;
                case ("dfConfigInfo"):
                    DagViewManager.Instance.toggleConfigInfo(val);
                    break;
                case ("dfTableName"):
                    DagViewManager.Instance.toggleTableName(val);
                    break;
                default:
                    break;
            }
        });
    }

    private _renderDFSettings(): void {
        const html: HTML = this._dfSettings.map(this._renderRowFromSetting.bind(this)).join("");
        this._getModal().find(".dfSettings .content").html(html);
    }

    private _renderRowFromSetting(setting: {name: string, text: string, type?: string}): string {
        const name: string = setting.name;
        let pref: any = this.getPref(name) || false;
        let html: HTML = "";
        if (setting.type === "numberInput") {
            pref = pref || "";
            html = '<div class="optionSet row ' + name + ' checkboxSection">' +
                '<div class="label">' + setting.text + ':</div>' +
                '<div class="optionSelector inline">' +
                    '<input data-name="' + name + '" data-prevval="' + pref + '" type="number" class="xc-input dfSettingInput" value="' + pref + '" />' +
                '</div>' +
            '</div>';
        } else {
            html ='<div  class="row ' + name + ' checkboxSection">' +
                '<div data-name="' + name + '" class="checkbox' + (pref ? ' checked' : '') + '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="text">' + setting.text + '</div>' +
            '</div>';
        }
        return html;
    }
}
