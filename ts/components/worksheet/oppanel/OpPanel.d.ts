type OpPanelArgType = "value" | "column" | "function" | "regex" | "aggregate";

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[];
    newFieldName?: string;
    newFieldNameUserEdited?: boolean;
    distinct?: boolean;
}

interface GroupByOpPanelFunctionGroup extends OpPanelFunctionGroup {
    distinct: boolean;
}
// *******************
// BaseOpPanel
// *******************
interface IOpPanel {
    setup(): void;
    show(dagNode, options?: any): void;
    close(): void;
}

// *******************
// opPanelCommon
// *******************
declare type OpPanelDropdownMenuItem = {
    genHTMLFunc?: () => HTML, // Custom HTML shown in list
    text: string, // Text shown in list, or in selected text section
    value?: any,
    cssClass?: string[],
    isSelected?: boolean,
    isNotMenuItem?: boolean,
    tip?: string
}

declare type OpPanelDropdownMenuSelectCallback = (value: any) => void

// declare enum NodeDefType { element, text }
declare type NodeDefPlaceholder = { name: string }
declare type NodeDef = NodeDefText | NodeDefElement | NodeDefComponent
declare type NodeDefDOMNodeList = (Node & ChildNode)[];
declare interface NodeDefDOMElement extends HTMLElement {
    getAttributeNames(): string[];
    xcdata: NodeDefXcData;
}
declare type NodeDefXcData = {
    isForceUpdate?: boolean,
    events?: { [eventName: string]: (args:any)=>any },
    initFunc?: () => void,
    elementMountDone?: (node: NodeDefDOMElement) => void
}
declare type NodeDefText = {
    type: NodeDefType,
    text: (string | NodeDefPlaceholder)[]
}
declare type NodeDefElement = {
    type: NodeDefType,
    tag: string,
    class?: (string | NodeDefPlaceholder)[],
    style?: string | NodeDefPlaceholder,
    attr?: { [key: string]: (string | NodeDefPlaceholder) },
    event?: { [key: string]: string },
    children?: NodeDef[]
}
declare type NodeDefComponent = {
    type: NodeDefType,
    name: string
}

declare type AddMoreButtonProps = {
    btnText: string, cssClass?: string, onClick: () => void
}

declare interface BaseComponentProps {
    onElementMountDone?: (elem: HTMLElement) => void;
    valueCheck?: { checkType: string, args: any[] | Function };
}

declare interface AutogenSectionProps extends BaseComponentProps {
    type: string;
    name: string;
    iconTip?: string;
}

declare interface HintDropdownProps extends AutogenSectionProps {
    inputVal: string;
    placeholder: string;
    menuList: { colType: ColumnType, colName: string}[];
    onDataChange?: (data: string) => void;
    addMoreButton?: AddMoreButtonProps;
    onRemove?: () => void;
    onFocus?: (elem: HTMLElement) => void;
}

declare interface SimpleInputProps<T> extends AutogenSectionProps {
    inputVal: T;
    placeholder: string;
    onChange?: (data: T) => void;
    onInput?: (data: T) => void;
    inputTimeout?: number;
    onBlur?: (data: T) => void;
}

declare interface ColumnComboProps extends AutogenSectionProps {
    columnCombos: ColumnComboRowProps[]
    addMoreButton?: AddMoreButtonProps,
    iconTip: string
}

declare interface ColumnComboRowProps extends BaseComponentProps {
    columnList: HintDropdownProps,
    dropdownList: HintDropdownProps
}

declare interface CheckboxInputProps extends AutogenSectionProps {
    isChecked: boolean;
    onFlagChange?: (flag: boolean) => void;
    tip?: string;
}

declare interface RenameProps extends BaseComponentProps {
    colFrom: ColumnNameTypeProps;
    colTo: string;
    disableChange?: boolean;
    onNameToChange?: (newName: string) => void;
}

declare interface RenameListProps extends AutogenSectionProps {
    renames: RenameProps[];
}

declare interface ColumnNameTypeProps extends BaseComponentProps {
    colName: string;
    colType: ColumnType;
}

declare interface ColumnWithActionProps extends BaseComponentProps {
    onClickAction?: () => void;
    actionType: string; // none,add,remove
    columnProps: ColumnNameTypeProps;
}

declare interface ColumnListWithActionProps extends BaseComponentProps {
    title: string;
    cssExtra?: string;
    allColumnAction: {
        cssActionIcon: string;
        actionTitle: string;
        isDisabled: boolean;
        onClickAction: () => void;
    };
    columnList: ColumnWithActionProps[]
}

declare type ValueCheckResult<T> = {
    errMsg?: string,
    value?: T
}

// *******************
// projectOpPanel
// *******************
declare type ProjectOpPanelModelColumnInfo = {
    name: string;
    isSelected: boolean;
    isHidden: boolean;
}

declare type ProjectOpPanelModelPrefixColumn = {
    prefix: string;
    isSelected: boolean;
    columnList: ProjectOpPanelModelColumnInfo[];
}

// *******************
// joinOpPanel
// *******************
declare type JoinOpColumnInfo = { name: string, type: ColumnType, isPrefix: boolean, prefix: string }
declare type JoinOpColumnPair = {
    leftName: string,
    leftCast: ColumnType,
    rightName: string,
    rightCast: ColumnType
}
declare type JoinOpRenameInfo = {
    source: string, dest: string, isPrefix: boolean
}

// *******************
// exportOpPanel
// *******************
declare type ExportOpPanelModelColumnInfo = {
    sourceColumn: string;
    destColumn: string;
    isSelected: boolean;
    isHidden: boolean;
    type: string;
}

declare type ShowPanelInfo = {
    exitCallback?: Function;
    closeCallback?: Function;
    nonConfigurable?: boolean;
    autofillColumnNames?: string[];
    udfDisplayPathPrefix?: string;
    app: string;
    tab: DagTabUser;
};
