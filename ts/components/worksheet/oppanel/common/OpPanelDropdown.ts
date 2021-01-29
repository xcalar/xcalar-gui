/**
 * Dropdown component
 * @description
 * Support building menu items on-the-fly(via a JS array)
 */
class OpPanelDropdown {
    private _$elem: JQuery = null;
    private _inputId: string = '';
    private _ulId: string = '';
    private _cssSelected = '';
    private static _fieldNameValue = 'xcval';
    private _setTitleFunc: ($elemTitle: JQuery, text: string) => void = null;
    private _isDelayInit: boolean = true;
    private _boundingSelector: string = null;

    /**
     * Class Constructuor
     * @param props.container JQuery object of the dropdown container
     * @param props.inputXcId The value of data-xcid html attribute of the input/div, which shows the selected menu text
     * @param props.ulXcId The data-xcid value of the UL tag
     * @param props.cssSelected OPTIONAL. CSS class name which will be set on the selected menu item
     * @param props.setTitleFunc OPTIONAL. The function to set the input/div text
     * @param props.isForceUpdate OPTIONAL. Set to true, if work with template engine. Default is true.
     * @param props.isDelayInit OPTIONAL. Set to true, if work with template engine. Default is true.
     * @param props.boundingSelector OPTIONAL. css selector for container which dropdown will not overflow
     */
    constructor(props: {
        container: JQuery,
        inputXcId: string,
        ulXcId: string,
        boundingSelector?: string,
        cssSelected?: string,
        isForceUpdate?: boolean,
        isDelayInit?: boolean
        setTitleFunc?: ($elemTitle: JQuery, text: string) => void
    }) {
        const {
            container, inputXcId, ulXcId, cssSelected = 'selected',
            isForceUpdate = true, isDelayInit = true, setTitleFunc
        } = props;
        this._$elem = container;
        this._inputId = inputXcId;
        this._ulId = ulXcId;
        this._cssSelected = cssSelected;
        if (setTitleFunc != null) {
            this._setTitleFunc = ($elem, text) => {
                $elem.attr('data-title', text);
                setTitleFunc($elem, text);
            }
        } else {
            this._setTitleFunc = ($elem, text) => {
                $elem.attr('data-title', text);
                OpPanelDropdown._defaultSetTitleFunc($elem, text);
            }
        }
        if (isForceUpdate) {
            OpPanelTemplateManager.setElementForceUpdate(<any>this._$elem[0]);
        }
        this._isDelayInit = isDelayInit;
        this._boundingSelector = props.boundingSelector;
    }

    /**
     * Update the UI according to the given data model
     * @param props.menuItems The menu items to show in the dropdown
     * @param props.onSelectCallback Callback function of menu item selecting
     * @description
     * Performance: The UI update will be skipped, if the data model doesn't change from the previous update
     */
    public updateUI(props: {
        menuItems?: OpPanelDropdownMenuItem[],
        onSelectCallback?: OpPanelDropdownMenuSelectCallback,
        defaultText?: string,
        isDisabled?: boolean
    }): void {

        const { menuItems = [], onSelectCallback = null,
            defaultText = '', isDisabled = false } = (props || {});
        // Create <li> elements
        const $input = BaseOpPanel.findXCElement(this._$elem, this._inputId);
        const $liList = isDisabled ? [] : this._createMenuItems({
            $input: $input,
            menuItems: menuItems
        });
        if (isDisabled) {
            // when dropdown is disabled, don't show it
            this._$elem.find(".iconWrapper").addClass("xc-hidden");
        } else {
            this._$elem.find(".iconWrapper").removeClass("xc-hidden");
        }

        // Add menu items to DOM
        const $ul = BaseOpPanel.findXCElement(this._$elem, this._ulId);
        $ul.empty();
        if ($liList.length > 0) {
            $ul.append($liList);
        }
        this._setTitleFunc($input, defaultText);

        // Setup event listener
        const initFunc = () => {
            this._$elem.off();
            const menuList = new MenuHelper( this._$elem, {
                bounds: this._boundingSelector,
                onSelect: this._onMenuItemSelect({
                    onSelectCallback: onSelectCallback
                })
            });
            menuList.setupListeners();
        };
        if (this._isDelayInit) {
            OpPanelTemplateManager.setElementInitFunc(<any>this._$elem[0], initFunc);
        } else {
            initFunc();
        }
    }

    private static _defaultSetTitleFunc($elemTitle: JQuery, text: string) {
        $elemTitle.val(text);
    }

    private _onMenuItemSelect({onSelectCallback}: {
        onSelectCallback?: OpPanelDropdownMenuSelectCallback
    }): ($li: JQuery) => void {
        return ($li: JQuery) => {
            xcTooltip.hideAll();
            if (onSelectCallback != null) {
                onSelectCallback($li.data(OpPanelDropdown._fieldNameValue));
            }
        };
    }

    private _createMenuItems({$input, menuItems}: {
        $input: JQuery,
        menuItems: OpPanelDropdownMenuItem[]
    }): JQuery[] {
        return menuItems.map( (menuInfo) => {
            // Create HTML element
            const $menuItem = menuInfo.isNotMenuItem
                ? BaseOpPanel.createElement('div')
                : BaseOpPanel.createElement('li')
            // Set data-xcval attribute
            if (menuInfo.value != null) {
                $menuItem.data(OpPanelDropdown._fieldNameValue, menuInfo.value);
            }
            // Set text
            if (menuInfo.genHTMLFunc != null) {
                $menuItem.html(menuInfo.genHTMLFunc());
            } else {
                $menuItem.text(menuInfo.text);
            }
            // Set tooltip
            if (menuInfo.tip) {
                xcTooltip.add($menuItem, {
                    title: menuInfo.tip,
                    placement: "auto left"
                });
            }

            // Set CSS classes
            if (menuInfo.cssClass != null) {
                $menuItem.addClass(menuInfo.cssClass.join(' '));
            }
            // Set input box value & select menu item
            if (menuInfo.isSelected) {
                this._setTitleFunc($input, menuInfo.text);
                $menuItem.addClass(this._cssSelected);
            }
            return $menuItem;
        });
    }
}
