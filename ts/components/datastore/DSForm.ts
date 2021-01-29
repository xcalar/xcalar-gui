namespace DSForm {
    let $pathCard: JQuery; // $("#dsForm-path");
    let $filePath: JQuery;  // $("#filePath");
    let historyPathsSet = {};
    let hasInitialized = false;
    let parserSuffix = '(using S3 Select parser)';
    /**
     * DSForm.setup
     */
    export function setup(): void {
        $pathCard = $("#dsForm-path");
        $filePath = $("#filePath");
        setupPathCard();
    }

    function initialize(): void {
        if (hasInitialized) {
            return;
        }
        hasInitialized = true;
        // reset anything browser may have auto filled
        resetForm();
        DSConfig.update();
        if (!XVM.isSingleUser()) {
            $("#dsForm-target input").val(gDefaultSharedRoot);
        } else {
            $("#dsForm-target input").val(getS3ConnectorDisplayName());
        }
    }

    /**
     * DSForm.show
     */
    export function show(): void {
        initialize();
        DataSourceManager.switchView(DataSourceManager.View.Path);
        $filePath.focus();

        $pathCard.find(".cardBottom .clear").removeClass("xc-hidden");
        $pathCard.find(".cardBottom .back").addClass("xc-hidden");
        setAvailableS3Buckets();
    }

    /**
     * DSForm.hide
     */
    export function hide(): void {
        $("#dsFormView").addClass("xc-hidden");
        DSConfig.clear();
        FileBrowser.clear();
    }

    /**
     * DSForm.addHistoryPath
     * @param targetName
     * @param path
     */
    export function addHistoryPath(targetName: string, path: string): void {
        historyPathsSet[targetName] = historyPathsSet[targetName] || [];
        let historyPaths = historyPathsSet[targetName];
        for (let i = 0, len = historyPaths.length; i < len; i++) {
            if (historyPaths[i] === path) {
                historyPaths.splice(i, 1);
                break;
            }
        }

        historyPaths.unshift(path);
        if (historyPaths.length > 5) {
            // remove the oldest path
            historyPaths.pop();
        }
        if (getDataTarget() === targetName) {
            $filePath.val(path);
        }
    }

    /**
     * DSForm.normalizePath
     * @param path
     */
    export function normalizePath(path: string): string {
        if (!path.startsWith("/")) {
            path = "/" + path;
        }

        let parts:string[] = path.split("/");
        if (parts[parts.length-1].indexOf(".") == -1 &&
            !path.endsWith("/")) {
            path = path + "/";
        }
        return path;
    }

    function isValidPathToBrowse(): boolean {
        let isValid = xcHelper.validate([{
            $ele: $("#dsForm-target").find(".text")
        }]);
        if (!isValid) {
            return false;
        }

        let targetName = getDataTarget();
        let path: string = $filePath.val().trim();
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            isValid = xcHelper.validate([{
                $ele: $filePath,
                error: DSFormTStr.GeneratedTargetHint,
                check: function() {
                    return !Number.isInteger(Number(path));
                }
            }]);
        }

        return isValid;
    }

    function isValidToPreview(): boolean {
        const targetName = getDataTarget();
        if (DSTargetManager.isSnowflakeTarget(targetName)) {
            return true;
        }
        return xcHelper.validate([{
            $ele: $filePath
        }]);
    }

    function getDataTarget(): string {
        const displayName = $("#dsForm-target input").val();
        if (displayName === getS3ConnectorDisplayName()) {
            return DSTargetManager.getS3Connector();
        } else {
            return displayName;
        }
    }

    function getS3ConnectorDisplayName(): string {
        return `${DSTargetManager.getS3Connector()} ${parserSuffix}`;
    }

    /**
     * DSForm.setDataTarget
     * @param targetName
     */
    export function setDataTarget(targetName: string): void {
        let displayName = targetName;
        if (targetName === DSTargetManager.getS3Connector()) {
            displayName = getS3ConnectorDisplayName();
        }
        $("#dsForm-target input").val(displayName);
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            $pathCard.addClass("target-generated");
            $filePath.attr("placeholder", DSFormTStr.GeneratedTargetHint);
        } else {
            $pathCard.removeClass("target-generated");
            $filePath.removeAttr("placeholder");
        }

        if (DSTargetManager.isConfluentTarget(targetName)) {
            $pathCard.addClass("target-confluent");
            $filePath.attr("placeholder", DSFormTStr.KafkaConnectorHint);
        } else {
            $pathCard.removeClass("target-confluent");
            $filePath.removeAttr("placeholder");
        }

        if (DSTargetManager.isSnowflakeTarget(targetName)) {
            $pathCard.addClass("target-snowflake");
        } else {
            $pathCard.removeClass("target-snowflake");
        }

        if (DSTargetManager.isDatabaseTarget(targetName)) {
            DSForm.addHistoryPath(targetName, DSForm.getDBConnectorPath(targetName));
        }

        let historyPaths = historyPathsSet[targetName];
        let oldPath = "";
        if (historyPaths != null) {
            oldPath = historyPaths[0] || "";
        }
        $filePath.val(oldPath).focus();
    }

    /**
     * DSForm.getDBConnectorPath
     * @param connector
     */
    export function getDBConnectorPath(connector: string): string {
        return `/${connector}/`;
    }

    function setPathMenu(): void {
        let $list = $filePath.closest(".dropDownList").find(".list");
        let $ul = $list.find("ul");
        let target = getDataTarget();
        let historyPaths = historyPathsSet[target];
        if (historyPaths == null || historyPaths.length === 0) {
            $ul.empty();
            $list.addClass("empty");
        } else {
            let list = historyPaths.map(function(path) {
                return "<li>" + path + "</li>";
            }).join("");
            $ul.html(list);
            $list.removeClass("empty");
        }
    }

    function getFilePath(targetName: string): string {
        let path: string = $filePath.val().trim();

        if (!DSTargetManager.isGeneratedTarget(targetName)
            && !DSTargetManager.isConfluentTarget(targetName)
        ) {
            path = DSForm.normalizePath(path);
        }
        if (DSTargetManager.isDatabaseTarget(targetName)) {
            path = `/${targetName}`;
        }
        if (DSTargetManager.isSnowflakeTarget(targetName)) {
            path = '/';
        }
        return path;
    }

    function setupPathCard(): void {
        //set up dropdown list for data target
        new MenuHelper($("#dsForm-target"), {
            onSelect: function($li) {
                if ($li.hasClass("createNew")) {
                    LoadScreen.switchTab("connector");
                    DSTargetManager.showTargetCreateView();
                    return;
                }
                setDataTarget($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();

        let $filePathDropDown = $filePath.closest(".dropDownList");
        new MenuHelper($filePathDropDown, {
            onOpen: setPathMenu,
            onSelect: function($li) {
                $filePathDropDown.find("input").val($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();

        // open file browser
        $pathCard.on("click", ".browse", function() {
            $(this).blur();
            goToBrowse();
        });

        $pathCard.on("click", ".confirm", function() {
            goToPreview();
        });

        $pathCard.on("click", ".clear", function() {
            resetForm();
        });

        $filePath.on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                $pathCard.find(".browse").click();
            }
        });

        $pathCard.on("click", ".back", function() {
            resetForm();
            // back to data source panel
            DataSourceManager.startImport(null);
        });
    }

    function resetForm(): void {
        let targetName: string = getDataTarget() || "";
        setDataTarget(targetName);
        $filePath.val("").focus();
    }

    function goToBrowse(): void {
        if (!isValidPathToBrowse()) {
            return;
        }
        let targetName = getDataTarget();
        let path = getFilePath(null);
        let cb = () => restoreFromPreview(targetName, path);
        resetForm();
        if (xcGlobal.isLegacyLoad) {
            FileBrowser.show(targetName, path, false, {
                backCB: cb
            });
            return;
        }

        if (path.startsWith("/")) {
            path = path.slice(1);
        }
        let bucket = path.split("/")[0] + "/";
        if (DSTargetManager.isPrivateS3Bucket(targetName, bucket)) {
            CloudFileBrowser.show(false, path);
        } else {
            FileBrowser.show(targetName, path, false, {
                backCB: cb
            });
        }
    }

    function goToPreview(): void {
        if (!isValidPathToBrowse() || !isValidToPreview()) {
            return;
        }
        let targetName = getDataTarget();
        let path = getFilePath(targetName);
        if (path !== "/") {
            DSForm.addHistoryPath(targetName, path);
        }

        let cb = () => restoreFromPreview(targetName, path);
        resetForm();
        DSConfig.show({
            targetName: targetName,
            files: [{path: path}]
        }, cb, false);
    }

    function restoreFromPreview(targetName: string, path: string): void {
        DSForm.show();
        setDataTarget(targetName);
        $filePath.val(path);
    }

    function setAvailableS3Buckets(): void {
        const s3Buckets: string[] = DSTargetManager.getAvailableS3Buckets();
        if (s3Buckets.length === 0) {
            return;
        }
        const targetName = DSTargetManager.getS3Connector();
        historyPathsSet[targetName] = historyPathsSet[targetName] || [];
        historyPathsSet[targetName] = historyPathsSet[targetName].filter((path) => !s3Buckets.includes(path));
        s3Buckets.forEach((bucket) => historyPathsSet[targetName].unshift(bucket));
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.resetForm = resetForm;
        __testOnly__.getFilePath = getFilePath;
        __testOnly__.setDataTarget = setDataTarget;
        __testOnly__.getDataTarget = getDataTarget;
        __testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        __testOnly__.isValidToPreview = isValidToPreview;
    }
    /* End Of Unit Test Only */
}
