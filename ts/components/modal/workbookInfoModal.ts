namespace WorkbookInfoModal {
    let $modal: JQuery; // $("#workbookInfoModal")
    let modalHelper: ModalHelper;
    let activeWorkbookId: string;

    /**
     * WorkbookInfoModal.setup
     * inital setup for varaibles and event listeners
     */
    export function setup(): void {
        $modal = $("#workbookInfoModal");

        modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });

        addEvents();
    };

    /** WorkbookInfoModal.show
     * Show the modal window
     * @param workbookId - id of the workbook to be shown
     */
    export function show(workbookId: string): void {
        activeWorkbookId = workbookId;
        modalHelper.setup();
        showWorkbookInfo(workbookId);
    };

    /**
     * WorkbookInfoModal.update
     * called when another browser tab triggers a change
     * @param info - info sent from socket to update info from
     */
    export function update(info: any): void {
        if (activeWorkbookId === info.triggerWkbk) {
            if (info.delete) {
                closeModal();
            } else {
                const newId: string = WorkbookManager.getIDfromName(info.newName);
                activeWorkbookId = newId;
            }
        }
    }

    /**
     * WorkbookInfoModal.addEvents
     * add event handlers
     */
    function addEvents(): void {
        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("input", ".name input", function() {
            if (!$modal.find(".name input").is(":visible")) return; // ENG-8642
            if ($(this).val() === "") {
                showNameError();
            } else {
                hideNameError();
            }
        });
    }

    /**
     * WorkbookInfoModal.closeModal
     * close the modal window
     */
    function closeModal(): void {
        modalHelper.clear();
        activeWorkbookId = null;
        hideNameError();
    }

    /**
     * WorkbookInfoModal.showNameError
     * Show error when invalid name given
     */
    function showNameError(): void {
        $modal.find(".error").text(WKBKTStr.WkbkNameRequired);
        $modal.find(".confirm").addClass("xc-disabled");
    }

    /**
     * WorkbookInfoModal.hideNameError
     * Hide name error when corrected
     */
    function hideNameError(): void {
        $modal.find(".error").text("");
        $modal.find(".confirm").removeClass("xc-disabled");
    }

    /**
     * WorkbookInfoModal.showWorkbookInfo
     * Show the info for the triggering workbook in the modal
     * @param workbookId - id of the workbook to be shown
     */
    function showWorkbookInfo(workbookId: string): void {
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        $modal.find(".name input").val(workbook.getName()).select();
        $modal.find(".description input").val(workbook.getDescription() || "");
    }

    /**
     * WorkbookInfoModal.submitForm
     * Validate changes and edit the workbook
     */
    function submitForm(): void {
        const workbookId: string = activeWorkbookId;
        if (!validate(workbookId)) {
            return;
        }
        const name: string = $modal.find(".name input").val();
        const description: string = $modal.find(".description input").val();
        WorkbookPanel.edit(workbookId, name, description);
        closeModal();
    }

    /**
     * WorkbookInfoModal.validate
     * Validate changes to name and description
     * @param workbookId - the id of the workbook to be validated
     */
    function validate(workbookId: string): boolean {
        const $input: JQuery = $modal.find(".name input");
        const workbookName: string = $input.val();
        const isValid: boolean = xcHelper.validate([
            {
                "$ele": $input,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.checkNamePattern(<PatternCategory>"workbook", <PatternAction>"check", workbookName);
                }
            },
            {
                "$ele": $input,
                "error": xcStringHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": workbookName
                }),
                "check": function() {
                    const workbooks: object = WorkbookManager.getWorkbooks();
                    for (let wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === workbookName &&
                            wkbkId !== workbookId) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        ]);
        return isValid;
    }
}