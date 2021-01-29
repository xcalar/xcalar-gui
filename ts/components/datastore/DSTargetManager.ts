namespace DSTargetManager {
    let targetSet = {};
    let typeSet = {};
    let hasLoadTypeList: boolean;
    let $gridView: JQuery;
    let $targetCreateCard: JQuery;
    let $targetInfoCard: JQuery;
    let $targetTypeList: JQuery;
    let $udfModuleList: JQuery;
    let $udfFuncList: JQuery;
    let udfModuleListItems: string;
    let udfFuncListItems: string;
    let udfModuleHint: InputDropdownHint;
    let udfFuncHint: InputDropdownHint;
    let targetModalHelper: ModalHelper;
    const xcalar_s3_connector: string = "Xcalar S3 Connector";
    // connectors for IMD, generted by XCE
    const xcalar_table_gen: string = "TableGen";
    const xcalar_table_store: string = "TableStore";
    const cloudTargetBlackList: string[] = [
        "shared",
        "sharednothingsymm",
        "sharednothingsingle",
        "azblobenviron",
        "gcsenviron",
        // "s3environ"
    ];
    const reservedList: string[] = [
        xcalar_table_gen,
        xcalar_table_store,
        xcalar_s3_connector,
    ];
    let privateBucket: string = null;
    let availableS3Buckets: string[] = [];
    let S3BucketsNameMap: Map<string, string> = new Map();

    export const S3Connector: string = "s3fullaccount";
    export const DBConnector: string = "dsn";
    export const ConfluentConnector: string = "confluent";
    export const SnowflakeConnector: string = "snowflake"

    /**
     * DSTargetManager.setup
     */
    export function setup(): void {
        $gridView = $("#dsTarget-list .gridItems");
        $targetCreateCard = $("#dsTarget-create-card");
        $targetInfoCard = $("#dsTarget-info-card");
        $targetTypeList = $("#dsTarget-type");
        hasLoadTypeList = false;

        addEventListeners();
        setupGridMenu();
        targetModalHelper = new ModalHelper($targetCreateCard, {

        });
    }

    /**
     * DSTargetManager.getTarget
     * @param targetName
     */
    export function getTarget(targetName: string): any {
        return targetSet[targetName];
    }

    /**
     * DSTargetManager.getAllTargets
     */
    export function getAllTargets(): any {
        return targetSet;
    }

    export function getAllTargetTypes(): any {
        return typeSet;
    }

    /**
     * DSTargetManager.isGeneratedTarget
     * @param targetName
     */
    export function isGeneratedTarget(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "memory") {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.isDatabaseTarget
     * @param targetName
     */
    export function isDatabaseTarget(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === DBConnector) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.isConfluentTarget
     * @param targetName
     */
    export function isConfluentTarget(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        return (target && target.type_id === ConfluentConnector);
    }

    /**
     * DSTargetManager.isSnowflakeTarget
     * @param targetName
     */
    export function isSnowflakeTarget(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        return (target && target.type_id === SnowflakeConnector);
    }

    /**
     * DSTargetManager.isPreSharedTarget
     * @param targetName
     */
    export function isPreSharedTarget(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "sharednothingsymm") {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.isSlowPreviewTarget
     * @param targetName
     */
    export function isSlowPreviewTarget(targetName: string): boolean {
        // azblobenviron, azblobfullaccount, gcsenviron
        let target = DSTargetManager.getTarget(targetName);
        let idLists = ["gcsenviron"];
        if (target && idLists.includes(target.type_id)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.isSparkParquet
     * @param targetName
     */
    export function isSparkParquet(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "parquetds") {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.isS3
     * @param targetName
     */
    export function isS3(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && (
            target.type_id === "s3environ" ||
            target.type_id === "s3fullaccount")
        ) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.initialize
     */
    export function initialize(): XDPromise<void> {
        return DSTargetManager.refreshTargets(true)
                .always(() => {
                    return PromiseHelper.convertToJQuery(fetchAvailableS3Buckets());
                });
    }

    /**
     * DSTargetManager.refreshTargets
     * @param noWaitIcon
     */
    export function refreshTargets(noWaitIcon: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let updateTargetMenu = function(targets) {
            let html: HTML = targets.map(function(targetName) {
                return "<li>" + targetName + "</li>";
            }).join("");
            let classes = "createNew";
            if (!isModifiable()) {
                classes += " adminOnly";
            }
            let dsFormHtml: HTML = `<li class="${classes}">+ Create New Connector</li>` + html;
            $("#dsForm-targetMenu ul").html(dsFormHtml);

            let $input = $("#dsForm-target input");
            let targetName = $input.val();
            if (DSTargetManager.getTarget(targetName) == null) {
                $input.val("");
            }
        };
        let updateNumTargets = function(num): void {
            $(".numDSTargets").html(num);
        };
        if (!noWaitIcon) {
            xcUIHelper.showRefreshIcon($("#dsTarget-list"), false, null);
        }

        let $activeIcon: JQuery = $gridView.find(".target.active");
        let activeName: string;
        if ($activeIcon.length) {
            activeName = $activeIcon.data("name");
        }

        getConnectorList()
        .then(function() {
            let targets: string[] = Object.keys(targetSet).sort();
            updateTargetMenu(targets);
            updateTargetGrids(targets, activeName);
            updateNumTargets(targets.length);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    export function hasTypeList(): boolean {
        return hasLoadTypeList;
    }

    /**
     * DSTargetManager.getTargetTypeList
     */
    export function getTargetTypeList(useCache?: boolean): XDPromise<void> {
        if (useCache && hasLoadTypeList) {
            return PromiseHelper.resolve();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let updateTargetType = function() {
            let typeNames: string[] = [];
            let typeNameToIdMap = {};
            for (let typeId in typeSet) {
                let typeName: string = typeSet[typeId].type_name;
                typeNameToIdMap[typeName] = typeId;
                typeNames.push(typeName);
            }
            typeNames.sort(function(a, b) {
                let aName: string = a.toLowerCase();
                let bName: string = b.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
            if (XVM.isCloud()) {
                const index = typeNames.findIndex((name) => isSassTarget(typeNameToIdMap[name]));
                if (index > -1) {
                    // put the sassType at first
                    const sassType = typeNames.splice(index, 1)[0];
                    typeNames.unshift(sassType);
                }
            }
            let html = typeNames.map(function(typeName) {
                let typeId: string = typeNameToIdMap[typeName];
                let className = [];
                let tooltip = "";
                if (XVM.isCloud() && !isSassTarget(typeId)) {
                    className.push("unavailable");
                    tooltip = xcTooltip.Attrs + ' data-title="' + TooltipTStr.AvailableInEnterprise + '"';
                }
                return '<li data-id="' + typeId + '" ' +
                        'class="' + className.join(" ") + '" ' +
                        tooltip + '>' +
                            typeName +
                        '</li>';
            }).join("");
            $targetTypeList.find("ul").html(html);
        };

        $targetCreateCard.addClass("loading");
        XcalarTargetTypeList()
        .then(function(typeList) {
            typeList.forEach(function(targetType) {
                let typeId = targetType.type_id;
                if (isAccessibleTarget(typeId)) {
                    typeSet[typeId] = targetType;
                }
            });
            updateTargetType();
            hasLoadTypeList = true;
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $targetCreateCard.removeClass("loading");
        });

        let promise = deferred.promise();
        xcUIHelper.showRefreshIcon($targetCreateCard, null, promise);
        return promise;
    }

    /**
     * DSTargetManager.isAWSConnector
     * @param connector
     */
    export function isAWSConnector(targetName: string): boolean {
        let target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "s3environ") {
            return true;
        } else {
            return false;
        }
    }

    /**
     * DSTargetManager.getAvailableS3Buckets
     */
    export function getAvailableS3Buckets(): string[] {
        return availableS3Buckets;
    }

    /**
     * DSTargetManager.getS3NameFromValue
     */
    export function getS3NameFromValue(s3Bucket: string): string {
        return S3BucketsNameMap.get(s3Bucket) || s3Bucket;
    }

    /**
     * DSTargetManager.getS3ValueFromName
     */
    export function getS3ValueFromName(displayPath: string): string {
        for (let [key, value] of S3BucketsNameMap) {
            if (value === displayPath) {
                return key;
            }
        }
        return displayPath;
    }

    /**
     * DSTargetManager.isPrivateS3Bucket
     * note: we only allow file upload on privateS3Buckets so this helps us check
     */
    export function isPrivateS3Bucket(targetName: string, bucket: string): boolean {
        if (!XVM.isCloud()) {
            return false;
        }
        if (!DSTargetManager.isAWSConnector(targetName)) {
            return false;
        }
        return bucket && bucket === privateBucket;
    }

    /**
     * DSTargetManager.clickFirstGrid
     */
    export function clickFirstGrid(): void {
        $gridView.find(".target").eq(0).click();
    }

    /**
     * DSTargetManager.updateUDF
     * @param listXdfsObj
     */
    export function updateUDF(listXdfsObj: any): void {
        updateUDFList(listXdfsObj);
    }

    /**
     * DSTargetManager.getConnectors
     */
    export function getConnectors(typeId: string): string[] {
        let connectors: string[] = [];
        for (let name in targetSet) {
            let connector = targetSet[name];
            if (connector.type_id === typeId) {
                connectors.push(name);
            }
        }
        return connectors;
    }

    /**
     * DSTargetManager.renderConnectorConfig
     */
    export function renderConnectorConfig(typeId: string): HTML {
        let html = "";
        try {
            let targetType = typeSet[typeId];
            return getTargetTypeParamOptions(targetType.parameters);
        } catch (e) {
            console.error(e);
        }
        return html;
    }



    /**
     * DSTargetManager.createConnector
     * @param $form
     */
    export function createConnector(
        typeId: string,
        $name: JQuery,
        $params: JQuery,
        $submitBtn: JQuery
    ): XDPromise<string> {
        let targetName: string | null = validateTargetName($name);
        if (targetName == null) {
            // invalid case
            return PromiseHelper.reject();
        }

        let targetParams = validateParams($params, typeId);
        if (targetParams == null) {
            // invalid case
            return PromiseHelper.reject();
        }
        let args = {
            targetName,
            targetType: typeId,
            targetParams
        };
        let deferred: XDDeferred<string> = PromiseHelper.deferred();

        createTarget(args, $submitBtn)
        .then(() => {
            deferred.resolve(targetName);
        })
        .fail(deferred.reject);

        return deferred.promise();

    }

    export function getS3Connector(): string {
        return xcalar_s3_connector;
    }

    export function updateSelectedConnector(_targetName) {
        // overwritten by SourcePath.jsx
    }


    function getConnectorList(): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarTargetList()
        .then((targetList) => {
            cacheTargets(targetList);
            deferred.resolve(targetList);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    async function fetchAvailableS3Buckets(): Promise<void> {
        if (!XVM.isOnAWS()) {
            return;
        }
        try {
            const json = await $.getJSON("s3buckets.json");
            // Test Use
            // const json = {
            //     s3buckets: {
            //         S3Bucket: {
            //             bucket: "saas-test-4fucwxjl0c-s3bucket-opv9axy0aqza",
            //             event_prefix: "",
            //             existing: false,
            //             prefix: "",
            //         },
            //         SampleBucket: {
            //             bucket: "sharedinf-samplebucket-876030232190-us-west-2",
            //             event_prefix: "",
            //             existing: true,
            //             prefix: "",
            //         }
            //     }
            // }
            const arg = json["s3buckets"];
            const keys = Object.keys(arg);
            for (let key of keys) {
                const innerJSON = arg[key];
                const bucket = innerJSON.bucket + "/" + innerJSON.prefix;
                availableS3Buckets.push(bucket);
                if (XVM.isCloud()) {
                    // only apply to Saas, not VPC
                    if (key === 'S3Bucket') {
                        privateBucket = bucket;
                        S3BucketsNameMap.set(bucket, 'my-xcalar-cloud-bucket/');
                    } else if (key === 'SampleBucket') {
                        S3BucketsNameMap.set(bucket, 'my-xcalar-demo-bucket/');
                    }
                }
            }
        } catch (e) {
            console.error("get available s3 bucket failed", e);
        }
    }

    function addEventListeners(): void {
        $("#dsTarget-refresh").click(function() {
            DSTargetManager.refreshTargets(false);
        });

        $("#dsTarget-create").click(function() {
            if (!$("#datastoreMenu").hasClass("noAdmin")) {
                showTargetCreateView();
            }
        });

        $("#dsTarget-create-card .close").click(() => {
            targetModalHelper.clear();
            resetForm();
        });

        $("#dsTarget-delete").click(function() {
            let $grid = $gridView.find(".grid-unit.active");
            deleteTarget($grid);
        });

        $gridView.on("click", ".grid-unit", function() {
            // event.stopPropagation(); // stop event bubbling
            selectTarget($(this));
        });

        new MenuHelper($targetTypeList, {
            "onSelect": function($li) {
                if ($li.hasClass("unavailable")) {
                    return;
                }
                let typeId = $li.data("id");
                let $input = $targetTypeList.find(".text");
                if ($input.data("id") === typeId) {
                    return;
                }
                $input.data("id", typeId).val($li.text());
                selectTargetType(typeId);
                StatusBox.forceHide();
            },
            "bounds": "body",
            "bottomPadding": 10,
            "fixedPosition": {
                $selector: $targetTypeList.find(".text")
            }
        }).setupListeners();

        $("#dsTarget-submit").click(function(event) {
            event.preventDefault();
            submitForm();
        });

        $("#dsTarget-reset").click(function() {
            resetForm();
        });

        $("#dsTarget-import").click(function(event) {
            event.preventDefault();
            let targetName: string = $gridView.find(".grid-unit.active").data("name");
            if (XVM.isCloud()) {
                LoadScreen.switchTab("loadWizard");
                DSTargetManager.updateSelectedConnector(targetName || "");
            } else {
                LoadScreen.switchTab("import");
                DSForm.setDataTarget(targetName);
            }
        });

        $("#backToImport").click((event) => {
            event.preventDefault();
            if (XVM.isCloud()) {
                LoadScreen.switchTab("loadWizard");
            } else {
                LoadScreen.switchTab("import");
            }
        });
        $("#dsTarget-create-card .backBtn").click(() => {
            let rect = $targetCreateCard[0].getBoundingClientRect();
            $("#manageConnectorsBtn").click();
            DSTargetManager.updateModal({
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top
            });
            targetModalHelper.clear({noAnim: true});
        });
    }

    export function updateModal(_rect): void {
        // overwritten by editConnectorsModal.tsx
    }


    function setupGridMenu(): void {
        let $gridMenu = $("#dsTarget-menu");
        xcMenu.add($gridMenu);

        $gridView.closest(".mainSection").contextmenu(function(event) {
            let $target = $(event.target);
            let $grid = $target.closest(".grid-unit");
            let classes: string = " noBorder";
            clearSelectedTarget();

            if ($grid.length) {
                $grid.addClass("selected");
                $gridMenu.data("grid", $grid);
                $(document).on("mouseup.gridSelected", function(event) {
                    // do not deselect if mouseup is on the menu or menu open
                    if (!$(event.target).closest("#dsTarget-menu").length &&
                        !$gridMenu.is(":visible")) {
                        clearSelectedTarget();
                        $(document).off("mouseup.gridSelected");
                    }
                });
                classes += " targetOpts";
            } else {
                classes += " bgOpts";
            }
            let $deleteLi = $gridMenu.find('.targetOpt[data-action="delete"]');
            if (isDefaultTarget($grid.data("name")) || !isModifiable()) {
                $deleteLi.addClass("unavailable");
                xcTooltip.add($deleteLi, {
                    title: DSTargetTStr.NoDelete
                });
            } else {
                $deleteLi.removeClass("unavailable");
                xcTooltip.remove($deleteLi);
            }

            MenuHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        });

        $gridMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data("action");
            if (!action) {
                return;
            }
            if ($(this).hasClass("unavailable")) {
                return;
            }

            switch (action) {
                case ("view"):
                    selectTarget($gridMenu.data("grid"));
                    break;
                case ("delete"):
                    deleteTarget($gridMenu.data("grid"));
                    break;
                case ("create"):
                    showTargetCreateView();
                    break;
                case ("refresh"):
                    DSTargetManager.refreshTargets(false);
                    break;
                default:
                    console.warn("menu action not recognized:", action);
                    break;
            }
            clearSelectedTarget();
        });
    }

    function isModifiable(): boolean {
        return Admin.isAdmin() || XVM.isOnAWS();
    }

    function isDefaultTarget(targetName: string): boolean {
        let defaultTargetList = [
            "Default Shared Root",
            "Preconfigured Azure Storage Account",
            "Preconfigured Google Cloud Storage Account",
            "Preconfigured S3 Account"
        ];
        return defaultTargetList.includes(targetName) || reservedList.includes(targetName);
    }

    function isAccessibleTarget(targetType: string): boolean {
        // if change this to XVM.isDataMart, it will make default shared root not accessible
        return !XVM.isOnAWS() || !cloudTargetBlackList.includes(targetType);
    }

    function isSassTarget(targetType: string): boolean {
        // XXX TODO: change to the aws full account
        return XVM.isCloud() && targetType === "s3fullaccount";
    }

    function isReservedTargetName(targetName: string): boolean {
        return reservedList.includes(targetName);
    }

    function isHiddenTarget(targetName: string): boolean {
        return targetName === xcalar_table_gen ||
                targetName === xcalar_table_store;
    }

    function cacheTargets(targetList): string[] {
        targetSet = {};
        targetList.forEach(function(target) {
            if (isAccessibleTarget(target.type_id) &&
                !isHiddenTarget(target.name)
            ) {
                targetSet[target.name] = target;
            }
        });
        return Object.keys(targetSet).sort();
    }

    function updateTargetGrids(
        targets: string[],
        activeTargetName: string
    ): void {
        let getGridHtml = function(targetName) {
            let html: HTML =
                '<div class="target grid-unit" ' +
                'data-name="' + targetName + '">' +
                    '<div class="gridIcon">' +
                        '<i class="icon xi-data-connector"></i>' +
                    '</div>' +
                    '<div class="label" data-dsname="' + targetName +
                    '" data-toggle="tooltip" data-container="body"' +
                    ' data-placement="right" title="' + targetName + '">' +
                        targetName +
                    '</div>' +
                '</div>';
            return html;
        };
        let html: HTML = targets.map(getGridHtml).join("");
        $gridView.html(html);
        if (activeTargetName) {
            let $activeGrid = $gridView.find('.target[data-name="' + activeTargetName + '"]');
            $activeGrid.addClass("active");
        }
    }

    function clearSelectedTarget(): void {
        $gridView.find(".grid-unit.selected").removeClass("selected");
    }

    function clearActiveTarget(): void {
        $gridView.find(".grid-unit.active").removeClass("active");
    }

    function selectTarget($grid: JQuery): void {
        clearSelectedTarget();
        if ($grid.hasClass("active")) {
            return;
        }
        clearActiveTarget();
        $grid.addClass("active");
        $grid.addClass("selected");
        showTargetInfoView($grid.data("name"));
    }

    export function showTargetCreateView(fromConnectorModal?: boolean): void {
        $targetCreateCard.removeClass("xc-hidden");
        if (fromConnectorModal) {
            let $otherModal = $("#connectorManager").find(".modal-content");
            let rect = $otherModal[0].getBoundingClientRect();
            $otherModal.hide();
            targetModalHelper.setup({noAnim: true});
            $targetCreateCard.css({
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            });
            $targetCreateCard.addClass("fromManager");
            $otherModal.find(".close").click();
        } else {
            targetModalHelper.setup();
        }

        resetForm();

        if ($targetCreateCard.hasClass("firstTouch")) {
            DSTargetManager.getTargetTypeList();
            $targetCreateCard.removeClass("firstTouch");
        }
    }

    function showTargetInfoView(targetName: string): void {
        $targetCreateCard.addClass("xc-hidden");
        targetModalHelper.clear();
        $targetInfoCard.removeClass("xc-hidden");

        let target = targetSet[targetName];
        let $form = $targetInfoCard.find("form");

        $form.find(".name .text").text(target.name);
        $form.find(".type .text").text(target.type_name);
        let $paramSection = $form.find(".params");

        try {
            let tarInfo = typeSet[target.type_id];
            let paramList = tarInfo.parameters.map(function(param) {
                return param.name;
            });
            let paramKeys = Object.keys(target.params);
            if (paramKeys.length === 0) {
                $paramSection.addClass("xc-hidden");
            } else {
                let paramHtml = paramList.map(function(paramName) {
                    if (!paramKeys.includes(paramName)) {
                        // This parameter wasnt specified.
                        return "";
                    }
                    let paramVal = target.params[paramName];
                    let classes = "text";
                    if (typeof paramVal !== "string") {
                        paramVal = JSON.stringify(paramVal);
                    }
                    if (isSecretParam(target.type_id, paramName)) {
                        classes += " secret";
                    }
                    return '<div class="formRow">' +
                                '<label>' + paramName + ':</label>' +
                                '<span class="' + classes + '">' +
                                    paramVal +
                                '</span>' +
                            '</div>';
                }).join("");
                var $rows = $(paramHtml);
                encryptionSecretField($rows);
                $paramSection.removeClass("xc-hidden")
                            .find(".formContent").html(<any>$rows);
            }
        } catch (e) {
            // it can happen if it's on cloud and the connector type
            // is in black list
            if (isAccessibleTarget(target.type_id)) {
                console.error(e);
            }
            $paramSection.addClass("xc-hidden");
        }

        var $deleteBtn = $("#dsTarget-delete");
        if (isDefaultTarget(targetName)) {
            $deleteBtn.addClass("xc-disabled");
        } else {
            $deleteBtn.removeClass("xc-disabled");
        }
    }

    function encryptionSecretField($rows: JQuery): void {
        $rows.each(function() {
            var $text = $(this).find(".text");
            if ($text.hasClass("secret")) {
                // const val = $text.text();
                const encryptedVal = "*".repeat(6);
                $text.text(encryptedVal);
                // Note: can add code here to display/hide password
                // if we need this use case
            }
        });
    }

    // XXX TODO: combine with the one in DSConfig.ts
    function selectUDFModuleOnEnter(displayedModuleName: string): void {
        let moduleName = $udfModuleList.find("li").filter(function() {
            return $(this).text() === displayedModuleName;
        }).data("module") || "";
        selectUDFModule(moduleName);
    }

    function selectUDFModule(moduleName: string): void {
        moduleName = moduleName || "";
        let displayedModuleName = $udfModuleList.find("li").filter((_index, el) => {
            return $(el).data("module") === moduleName;
        }).text() || "";
        $udfModuleList.find("input").data("module", moduleName);
        udfModuleHint.setInput(displayedModuleName);
        if (moduleName === "") {
            $udfFuncList.addClass("disabled");
            selectUDFFunc("");
        } else {
            $udfFuncList.removeClass("disabled");
            let $funcLis = $udfFuncList.find(".list li").addClass("hidden")
            .filter(function() {
                return $(this).data("module") === moduleName;
            }).removeClass("hidden");
            if ($funcLis.length === 1) {
                selectUDFFunc($funcLis.eq(0).text());
            } else {
                selectUDFFunc("");
            }
        }
    }

    function selectUDFFunc(func: string): void {
        func = func || "";
        if (func) {
            udfFuncHint.setInput(func);
        } else {
            udfFuncHint.clearInput();
        }
    }

    function validateUDF(): string {
        let $moduleInput = $udfModuleList.find("input");
        let $funcInput = $udfFuncList.find("input");
        let udfModule = $moduleInput.data("module");
        let func = $funcInput.val();

        let isValid = xcHelper.validate([
            {
                "$ele": $moduleInput,
                "error": ErrTStr.NoEmptyList
            },
            {
                "$ele": $moduleInput,
                "error": ErrTStr.InvalidUDFModule,
                "check": function() {
                    let inValid: boolean = true;
                    $udfModuleList.find(".list li").each(function() {
                    if (udfModule === $(this).data("module")){
                        inValid = false;
                        return false;
                    }
                    });
                    return inValid;
                }
            },
            {
                "$ele": $funcInput,
                "error": ErrTStr.NoEmptyList
            },
            {
                "$ele": $funcInput,
                "error": ErrTStr.InvalidUDFFunction,
                "check": function() {
                    let inValid: boolean = true;
                    $udfFuncList.find(".list li").each(function() {
                        let relativeModule = $(this).data("module");
                        if (relativeModule === udfModule && $(this).text() === func){
                            inValid = false;
                            return false;
                        }
                    });
                    return inValid;
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        return udfModule + ":" + func;
    }

    function selectTargetType(typeId: string): void {
        let $form = $("#dsTarget-form");
        let targetType = typeSet[typeId];
        $form.find(".description").removeClass("xc-hidden")
             .find("#dsTarget-description").text(targetType.description);

        if (targetType.parameters.length > 0) {
            let html = getTargetTypeParamOptions(targetType.parameters);
            $form.find(".params").removeClass("xc-hidden")
                 .find(".formContent").html(html);
        } else {
            $form.find(".params").addClass("xc-hidden")
                 .find(".formContent").empty();
        }

        let $menuParams = $('#dsTarget-params-targets');
        $udfModuleList = $("#dsTarget-params-udfModule");
        $udfFuncList = $("#dsTarget-params-udfFunc");

        new MenuHelper($menuParams, {
            "onSelect": function($li) {
                let typeId: string = $li.data("id");
                let $input = $menuParams.find(".text");
                if ($input.data("id") === typeId) {
                    return;
                }
                $input.data("id", typeId).val($li.text());
                StatusBox.forceHide();
            },
            "container": "body",
            "bounds": "body",
            "bottomPadding": 10,
            "fixedPosition": {
                $selector: $menuParams.find(".text")
            }
        }).setupListeners();

        let moduleMenuHelper = new MenuHelper($udfModuleList, {
                "onSelect": function($li) {
                    let moduleName = $li.data("module");
                    selectUDFModule(moduleName);
                },
                "container": "body",
                "bounds": "body",
                "bottomPadding": 10,
                "fixedPosition": {
                    $selector: $udfModuleList.find(".text")
                }
            });

        let funcMenuHelper = new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                let func = $li.text();
                selectUDFFunc(func);
            },
            "container": "body",
            "bounds": "body",
            "bottomPadding": 10,
            "fixedPosition": {
                $selector: $udfFuncList.find(".text")
            }
        });

        udfModuleHint = new InputDropdownHint($udfModuleList, {
            "menuHelper": moduleMenuHelper,
            "onEnter": selectUDFModuleOnEnter
        });

        udfFuncHint = new InputDropdownHint($udfFuncList, {
            "menuHelper": funcMenuHelper,
            "onEnter": selectUDFFunc
        });

        selectUDFModule("");
    }

    function getTargetsForParamOptions(
        param: {name: string},
        index: number
    ): HTML {
        let labelName = "dsTarget-param-" + index;
        let targets: any[] = Object.values(DSTargetManager.getAllTargets());
        let lstHtml = targets.map(function(target) {
            return '<li data-id="' + target.type_id + '">' +
                        target.name +
                    '</li>';
        }).join("");
        let html: HTML =
        '<div class="formRow">' +
            '<label for="' + labelName + '" ' +
                'data-name="' + param.name + '">' +
                    param.name +
            '</label>' +
            '<div id="dsTarget-params-targets" class="dropDownList yesclickable">' +
            '<input class="text" type="text" value="" spellcheck="false" disabled="disabled">' +
            '<div class="iconWrapper">' +
                '<i class="icon xi-arrow-down"></i>' +
            '</div>' +
            '<div id="dsTarget-params-targets-menu" class="list">' +
                '<ul>' +
                lstHtml +
                '</ul>' +
                '<div class="scrollArea top stopped">' +
                '<i class="arrow icon xi-arrow-up"></i>' +
                '</div>' +
                '<div class="scrollArea bottom">' +
                '<i class="arrow icon xi-arrow-down"></i>' +
                '</div>' +
            '</div>' +
            '</div>' +
        '</div>';
        return html;
    }

    function getUDFsForParamOptions(
        param: {name: string},
        index: number
    ): HTML {
        let labelName: string = "dsTarget-param-" + index;
        if(!udfModuleListItems) {
            udfModuleListItems = "";
        }
        if (!udfFuncListItems) {
            udfFuncListItems = "";
        }
        let html: HTML =
        '<div class="formRow">' +
            '<label for="' + labelName + '" ' +
            'data-name="' + param.name + '">' +
                param.name +
            '</label>' +
            '<div class="listSection" data-original-title="" title=""">' +
                '<div id="dsTarget-params-udfModule" class="rowContent dropDownList yesclickable"">' +
                '<input class="text inputable" type="text" spellcheck="false" placeholder="UDF Module">' +
                '<div class="iconWrapper">' +
                    '<i class="icon xi-arrow-down"></i>' +
                '</div>' +
                '<div class="list">' +
                    '<ul>' +
                    udfModuleListItems +
                    '</ul>' +
                    '<div class="scrollArea top">' +
                    '<i class="arrow icon xi-arrow-up"></i>' +
                    '</div>' +
                    '<div class="scrollArea bottom">' +
                    '<i class="arrow icon xi-arrow-down"></i>' +
                    '</div>' +
                '</div>' +
                '</div>' +
                '<div id="dsTarget-params-udfFunc" class="dropDownList disabled yesclickable">' +
                '<input class="text inputable" type="text" spellcheck="false" placeholder="UDF Function">' +
                '<div class="iconWrapper">' +
                    '<i class="icon xi-arrow-down"></i>' +
                '</div>' +
                '<div class="list">' +
                    '<ul>' +
                    udfFuncListItems +
                    '</ul>' +
                    '<div class="scrollArea top">' +
                    '<i class="arrow icon xi-arrow-up"></i>' +
                    '</div>' +
                    '<div class="scrollArea bottom">' +
                    '<i class="arrow icon xi-arrow-down"></i>' +
                    '</div>' +
                '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        return html;
    }

    function updateUDFList(listXdfsObj): void {
        let udfObj = xcHelper.getUDFList(listXdfsObj);
        udfModuleListItems = udfObj.moduleLis;
        udfFuncListItems = udfObj.fnLis;
    }

    function isSecretParam(typeId: string, paramName: string): boolean {
        try {
            let targetType = typeSet[typeId];
            for (let i = 0; i < targetType.parameters.length; i++) {
                let param = targetType.parameters[i];
                if (param.name === paramName) {
                    return param.secret;
                }
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    function getTargetTypeParamOptions(
        params: {
            name: string,
            description: string,
            secret: boolean
            optional: boolean
        }[]
    ): HTML {
        return params.map(function(param, index) {
            let labelName: string = "dsTarget-param-" + index;
            let type: string = param.secret ? "password" : "text";
            let inputClass: string = "xc-input white";
            let description = param.description;

            if (param.optional) {
                inputClass += " optional";
                description = "(" + CommonTxtTstr.Optional + ") " + description;
            }
            if (param.name === 'backingTargetName') {
                return getTargetsForParamOptions(param, index);
            }
            else if (param.name === 'listUdf') {
                return getUDFsForParamOptions(param, index);
            }

            return '<div class="formRow">' +
                        '<label for="' + labelName + '" ' +
                        'data-name="' + param.name + '">' +
                            param.name +
                        '</label>' +
                        '<input ' +
                        'class="' + inputClass + '" ' +
                        'style="display:none"' +
                        'placeholder="' + description + '" ' +
                        'autocomplete="off" ' +
                        'spellcheck="false">' +
                        '<input id="' + labelName + '" ' +
                        'class="' + inputClass + '" ' +
                        'type="' + type + '" ' +
                        'placeholder="' + description + '" ' +
                        'autocomplete="off" ' +
                        'spellcheck="false">' +
                    '</div>';
        }).join("");
    }

    function deleteTarget($grid: JQuery): void {
        let targetName: string = $grid.data("name");
        let msg = xcStringHelper.replaceMsg(DSTargetTStr.DelConfirmMsg, {
            target: targetName
        });
        Alert.show({
            title: DSTargetTStr.DEL,
            msg: msg,
            onConfirm: function() {
                XcalarTargetDelete(targetName)
                .then(function() {
                    const wasActive = $grid.hasClass("active");
                    $grid.remove();
                    if (wasActive) {
                        // when still focus on grid to delete
                        selectTarget($gridView.find(".target").eq(0));
                    }
                    DSTargetManager.refreshTargets(false);
                })
                .fail(function(error) {
                    Alert.error(DSTargetTStr.DelFail, error.error);
                });
            }
        });
    }

    function validateTargetName($targetName: JQuery): string | null {
        let targetName: string = $targetName.val().trim();
        let elements = [{
            $ele: $targetName
        }, {
            $ele: $targetName,
            error: DSTargetTStr.NoReservedName,
            check: function() {
                return isReservedTargetName(targetName);
            }
        }, {
            $ele: $targetName,
            error: ErrTStr.InvalidTargetName,
            check: function() {
                return !xcHelper.checkNamePattern(PatternCategory.Target,
                    PatternAction.Check, targetName);
            },
        }, {
            $ele: $targetName,
            error: xcStringHelper.replaceMsg(DSTargetTStr.TargetExists, {
                target: targetName
            }),
            check: function() {
                return $gridView.find(".grid-unit").filter(function() {
                    return $(this).data("name") === targetName;
                }).length > 0;
            }
        }];

        if (xcHelper.validate(elements)) {
            return targetName;
        } else {
            return null;
        }
    }

    function validateTargetType(): string {
        let valid: boolean = xcHelper.validate([{
            $ele: $("#dsTarget-type .text")
        }]);
        if (valid) {
            return $("#dsTarget-type .text").data("id");
        } else {
            return null;
        }
    }

    function getParamValidateFunc(
        $ele: JQuery,
        targetType: string,
        paramName: string,
        val: string
    ): object {
        // XXX @Kevan, please fix type_id and param if it's wrong
        if (targetType === "snowflake" && paramName === "alias") {
            return {
                $ele,
                // return true the the invalid condition, here have space is invalid
                check: () => val.includes(" "),
                error: 'Alias should not include space.'
            }
        } else {
            return null;
        }
    }

    function validateParams($params: JQuery, targetType: string): object {
        let targetParams = {};
        let elements = [];
        $params.find(".formRow").each(function() {
            let $param = $(this);
            let $input = $param.find("input:visible");
            if ($input.length &&
                (!$input.hasClass("optional") || $input.val().trim() !== "")) {
                const paramName = $param.find("label").data("name");
                const val = $input.val();
                elements.push({$ele: $input});
                const validateEl = getParamValidateFunc($input, targetType, paramName, val);
                if (validateEl != null) {
                    elements.push(validateEl);
                }
                targetParams[paramName] = val;
            }
        });

        if (xcHelper.validate(elements)) {
            return targetParams;
        } else {
            return null;
        }
    }

    function validateForm($form: JQuery): {
        targetType: string,
        targetName: string,
        targetParams: any
    } | null {
        let targetName: string | null = validateTargetName($("#dsTarget-name"));
        if (targetName == null) {
            // invalid case
            return null;
        }

        let targetType: string = validateTargetType();
        if (targetType == null) {
            // invalid case
            return null;
        }

        let targetParams = validateParams($form.find(".params"), targetType);
        if (targetParams == null) {
            // invalid case
            return null;
        }
        return {
            targetType,
            targetName,
            targetParams
        };
    }

    function resetForm(): void {
        let $form = $("#dsTarget-form");
        $form.find(".description").addClass("xc-hidden")
             .find("#dsTarget-description").empty();
        $form.find(".params").addClass("xc-hidden")
             .find(".formContent").empty();
        $("#dsTarget-type .text").val("").removeData("id");
        $("#dsTarget-name").val("").focus();
    }

    function checkMountPoint(
        targetType: string,
        targetParams: {mountpoint?: string}
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if ((!targetType) || (targetType !== "shared")) {
            deferred.resolve();
        } else {
            let url: string = targetParams.mountpoint;
            XcalarListFiles({
                targetName: gDefaultSharedRoot,
                path: url
            })
            .then(() => {
                deferred.resolve();
            })
            .fail(() => {
                let errorLog = xcStringHelper.replaceMsg(DSTargetTStr.MountpointNoExists, {
                    mountpoint: url
                });
                deferred.reject({
                    log: errorLog,
                    invalidMountPoint: true
                });
            });
        }
        return deferred.promise();
    }

    function errorParser(log: string): string {
        try {
            return log.split("ValueError:")[1].split("\\")[0];
        } catch (e) {
            console.error(e);
            return log;
        }
    }

    function createTarget(
        args: {
            targetType: string,
            targetName: string,
            targetParams: any
        },
        $submitBtn: JQuery
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let {targetType, targetName, targetParams} = args;
        if (targetParams.listUdf) {
            let udfPath = validateUDF();
            if (udfPath == null) {
                return PromiseHelper.reject();
            }
            targetParams.listUdf = udfPath;
        }
        xcUIHelper.toggleBtnInProgress($submitBtn, true);

        xcUIHelper.disableSubmit($submitBtn);
        checkMountPoint(targetType, targetParams)
        .then(() => {
            return XcalarTargetCreate(targetType, targetName, targetParams);
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(DSTargetManager.refreshTargets(true));
        })
        .then(() => {
            xcUIHelper.toggleBtnInProgress($submitBtn, true);
            xcUIHelper.showSuccess(SuccessTStr.Target);
            deferred.resolve();
        })
        .fail((error) => {
            // fail case being handled in submitForm
            xcUIHelper.toggleBtnInProgress($submitBtn, false);
            deferred.reject(error);
        })
        .always(() => {
            xcUIHelper.enableSubmit($submitBtn);
        });

        return deferred.promise();
    }

    function submitForm(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $form = $("#dsTarget-form");
        $form.find("input").blur();
        let $submitBtn = $("#dsTarget-submit").blur();

        let args = validateForm($form);
        if (args == null) {
            // invalid case
            return PromiseHelper.reject();
        }

        createTarget(args, $submitBtn)
        .then(() => {
            resetForm();
            let $grid = $gridView.find('.target[data-name="' + args.targetName + '"]');
            if ($grid.length) {
                selectTarget($grid);
            }
            deferred.resolve();
        })
        .fail((error) => {
            // fail case being handled in submitForm
            if (error.invalidMountPoint) {
                let $mountpointInput =  $form.find("label[data-name=mountpoint]")
                                        .closest(".formRow")
                                        .find(".xc-input:visible");
                StatusBox.show(FailTStr.Target, $mountpointInput, false, {
                    detail: error.log
                });
            } else {
                StatusBox.show(FailTStr.Target, $submitBtn, false, {
                    detail: errorParser(error.log)
                });
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }
}
