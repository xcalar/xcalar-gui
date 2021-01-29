class PopupManager {
    private static readonly BaseZIndex: number = 32;
    private static _stack: PopupPanel[] = [];
    private static _popupMap: Map<string, PopupPanel> = new Map();
    private static _saveDisabled = true;
    private static _saveDelay: number = 2000;
    private static _pendingSave:  NodeJS.Timer = null;

    public static restore(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getKVStore().getAndParse()
        .then((state) => {
            this._restore(state);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // docked widths and heights are in %, except resource list
    // undocked widths and heights are in px
    private static _state = {
        sqlViewContainer: {
            isVisible: true,
            isUndocked: false,
            undockedWidth: "auto",
            undockedHeight: "auto",
            undockedTop: "auto",
            undockedLeft: "auto"
        },
        udfViewContainer: {
            isVisible: false,
            isUndocked: false,
            dockedWidth: 50,
            undockedWidth: "auto",
            undockedHeight: "auto",
            undockedTop: "auto",
            undockedLeft: "auto"
        },
        configNodeContainer: {
            isUndocked: false,
            dockedWidth: 50,
            undockedWidth: "auto",
            undockedHeight: "auto",
            undockedTop: "auto",
            undockedLeft: "auto"
        },
        dagViewContainer: {
            isVisible: true,
            isUndocked: false,
            isVertStacked: false,
            undockedWidth: "auto",
            undockedHeight: "auto",
            undockedTop: "auto",
            undockedLeft: "auto"
        },
        tableViewContainer: {
            isUndocked: false,
            isVisible: false,
            dockedWidth: 50,
            dockedHeight: 50,
            undockedWidth: "auto",
            undockedHeight: "auto",
            undockedTop: "auto",
            undockedLeft: "auto"
        },
        notebookBottomContainer: {
            dockedHeight: 50
        },
        debugViewContainer: {
            dockedHeight: 20,
            isVisible: false
        },
        dataflowMenu: {
            dockedWidth: 200
        },
        stack: []
    };

     /*
        sqlPanel: isDocked/undockedSize
        udfEditor: isVisible/isDocked/dockedSize/undockedSize
        configPanel: isDocked/dockedSize/undockedSize
        dagPanel: isDocked/isFull/isStacked
        resultPanel: dockedHeight/dockedWidth
        bottomPart: isVisible/Height
    */


    private static _restore(state): void {
        if (!state) {
            state = this._state;
        }
        const oldStack = [...state.stack];
        this._state = {
            ...this._state,
            ...state
        };
        $("#sqlWorkSpacePanel").addClass("active");

        DagPanel.Instance.setupPopup();
        DagConfigNodeModal.Instance.setupPopup();
        UDFPanel.Instance.setupPopup();
        SQLEditorSpace.Instance.setupPopup();
        SQLResultSpace.Instance.setupPopup();
        DebugPanel.Instance.setupPopup();
        MainMenu.setupPopup();

        this._popupMap.forEach((popup, id) => {
            if (this._state[id]) {
                popup.restore(this._state[id]);
            }
        });
        this._saveDisabled = false;
        this._restoreStack(oldStack);
    }


    private static _getKVStore(): KVStore {
        let key: string = KVStore.getKey("gPopupManagerKey");
        return new KVStore(key, gKVScope.WKBK);
    }


    /**
     * PopupManager.register
     * @param popup
     */
    public static register(popup: PopupPanel): void {
        const id = popup.getId();
        this._popupMap.set(id, popup);

        popup
        .on("Undock_BroadCast", () => {
            this._state[id].isUndocked = true;
            this._addPopup(popup);
            this._updateZIndex();
            this._handleResize();
        })
        .on("Dock_BroadCast", () => {
            this._state[id].isUndocked = false,
            this._state[id].undockedWidth = "auto";
            this._state[id].undockedHeight = "auto";

            this._removePopup(popup, true);
            this._updateZIndex();
            this._handleResize();
        })
        .on("BringFront_BroadCast", () => {
            this._bringFrontPopup(popup);
        })
        .on("Resize_BroadCast", state => {
            this._state[id] = {
                ...this._state[id],
                ...state
            };
            this._save();
        })
        .on("ResizeDocked_BroadCast", state => {
            this._state[id] = {
                ...this._state[id],
                ...state
            };
            this._save();
            this._handleResize();
        })
        .on("Drag_BroadCast", state => {
            this._state[id] = {
                ...this._state[id],
                ...state
            };
            this._save();
        })
        .on("Hide_BroadCast", () => {
            this._state[id].isVisible = false;
            this._save();
            this._handleResize();
        })
        .on("Show_BroadCast", () => {
            this._state[id].isVisible = true;
            this._save();
            this._popupMap.get(id).bringToFront();
            this._handleResize();
        })
        .on("VertStack_BroadCast", () => {
            this._state[id].isVertStacked = true;
            this._save();
        })
        .on("HorzStack_BroadCast", () => {
            this._state[id].isVertStacked = false;
            this._save();
        });
    }

    private static _save(): XDPromise<void> {
        if (this._saveDisabled) {
            clearTimeout(this._pendingSave);
            this._pendingSave = null;
            return PromiseHelper.resolve();
        }
        if (!this._pendingSave) {
            this._pendingSave = setTimeout(() => {
                this._pendingSave = null;
                this._getKVStore().put(JSON.stringify(this._state), false);
            }, this._saveDelay);
        }
    }

    private static _handleResize() {
        SQLEditorSpace.Instance.refresh();
        UDFPanel.Instance.refresh();
        DagConfigNodeModal.Instance.refresh();
    }

    public static isDocked(popupId): boolean {
        const popup: PopupPanel = this._popupMap.get(popupId);
        if (!popup) {
            console.error(popupId + " not found", this._popupMap);
            return true;
        } else {
            return popup.isDocked();
        }
    }

    public static checkAllContentUndocked(): void {
        this._popupMap.forEach((popup) => {
            popup.checkAllContentUndocked();
        });
    }

    private static _addPopup(popup: PopupPanel): void {
        this._stack.push(popup);
    }

    private static _removePopup(popup: PopupPanel, removeZIndex: boolean): number {
        let index: number = -1;
        for (let i = 0; i < this._stack.length; i++) {
            if (this._stack[i] === popup) {
                index = i;
                this._stack.splice(i, 1);
                break;
            }
        }
        if (removeZIndex) {
            popup.getPanel().css("z-index", "");
        }
        return index;
    }

    private static _bringFrontPopup(popup: PopupPanel): void {
        const index: number = this._removePopup(popup, false);
        this._addPopup(popup);
        if (this._stack[index] !== popup) {
            this._updateZIndex(); // when has order change
        }
    }

    private static _updateZIndex(): void {
        this._state.stack = [];
        this._stack.forEach((popup, i) => {
            const zIndex: number = this.BaseZIndex + i;
            popup.getPanel().css("z-index", zIndex);
            this._state.stack.push(popup.getId());
        });
        this._save();
    }

    private static _restoreStack(stack) {
        this._stack = [];
        stack.forEach((popupId, i) => {
            const zIndex: number = this.BaseZIndex + i;
            const popup = this._popupMap.get(popupId);
            if (popup) {
                popup.getPanel().css("z-index", zIndex);
                this._stack.push(popup);
            }
        });
        this._state.stack = stack;
    }
}