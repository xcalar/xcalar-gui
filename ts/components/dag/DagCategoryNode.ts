class DagCategoryNode {
    protected key: string;
    protected categoryType: DagCategoryType;
    protected nodeSubType: string | null;
    protected node: DagNode;
    protected hidden: boolean;
    protected color: string = "#F8A296";

    public constructor(node: DagNode, categoryType: DagCategoryType, isHidden: boolean = false, key: string = '') {
        this.node = node;
        this.categoryType = categoryType;
        this.hidden = isHidden;
        this.key = key;
    }

    public getCategoryType(): DagCategoryType {
        return this.categoryType;
    }

    public getNode(): DagNode {
        return this.node;
    }

    public getNodeType(): DagNodeType {
        return this.node.getType();
    }

    public getKey(): string {
        return this.key;
    }

    public getDisplayNodeType(): string {
        const node = this.getNode();
        let displayNodeType: string = node.getDisplayNodeType();
        return displayNodeType;
    }

    public getNodeSubType(): string {
        return this.node.getSubType() || "";
    }

    public getDisplayNodeSubType(): string {
        let node = this.node;
        if (node instanceof DagNodeJoin ||
            node instanceof DagNodeDFOut
        ) {
            return node.getDisplayNodeType();
        } else {
            const nodeSubType: string = this.getNodeSubType();
            return xcStringHelper.capitalize(nodeSubType);
        }
    }

    public isHidden(): boolean {
        return this.hidden;
    }

    public getColor(): string {
        return this.color;
    }

    public getIcon(): string {
        return this.node.getIcon();
    }

    public getDescription(): string {
        return this.node.getNodeDescription();
    }

    /**
     * Create the representing JSON data. Override in child classes for extra data.
     */
    public getJSON(): DagCategoryNodeInfo {
        return {
            type: this.categoryType,
            subType: this.getNodeSubType(),
            node: this.node.getSerializableObj(),
            hidden: this.hidden,
            key: this.key
        };
    }

    /**
     * Initialize the class instance with JSON data. Override in child classes for extra data.
     * @param json
     */
    public initFromJSON(json: DagCategoryNodeInfo) {
        this.categoryType = json.type;
        this.nodeSubType = json.subType;
        this.hidden = json.hidden;
        this.node = DagNodeFactory.create(json.node);
        this.key = json.key;
    }

    /**
     * Check if the category node needs to be persisted. Override it for customized behavior in child classes.
     */
    public isPersistable(): boolean {
        return false;
    }
}

class DagCategoryNodeIn extends DagCategoryNode {
    protected color: string = "#F4B48A";
    public constructor(node: DagNode) {
        super(node,  DagCategoryType.In);
    }
}

class DagCategoryNodeOut extends DagCategoryNode {
    protected color: string = "#E7DC98";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Out);
    }
}

class DagCategoryNodeSQL extends DagCategoryNode {
    protected color: string = "#AACE8F";
    public constructor(node: DagNode, isHidden: boolean = false) {
        super(node, DagCategoryType.SQL, isHidden);
    }
}

class DagCategoryNodeColumnOps extends DagCategoryNode {
    protected color: string = "#89D0E0";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.ColumnOps);
    }
}

class DagCategoryNodeRowOps extends DagCategoryNode {
    protected color: string = "#7FD4B5";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.RowOps);
    }
}

class DagCategoryNodeJoin extends DagCategoryNode {
    protected color: string = "#92B1DA";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Join);
    }
}

class DagCategoryNodeSet extends DagCategoryNode {
    protected color: string = "#CCAADD";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Set);
    }
}

class DagCategoryNodeAggregates extends DagCategoryNode {
    protected color: string = "#F896A9";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Aggregates);
    }
}

class DagCategoryNodeCustom extends DagCategoryNode {
    private static keyGenerator: XcUID = new XcUID('co');
    protected color: string = "#F8A296";
    public constructor(node: DagNode, isHidden: boolean = false) {
        super(
            node,
            DagCategoryType.Custom,
            isHidden,
            DagCategoryNodeCustom.keyGenerator.gen());
    }
    /**
     * @override
     * Overriding the base class, so that custom operator can be persisted.
     */
    public isPersistable(): boolean {
        return true;
    }
}

class DagCategoryNodeFactory {
    /**
     * Create DagCategoryNodes from their constructor
     * @param options
     */
    public static create(options: {
        dagNode: DagNode, categoryType: DagCategoryType, isHidden: boolean
    }): DagCategoryNode {
        const { dagNode, categoryType, isHidden = false } = options;
        switch (categoryType) {
            case DagCategoryType.Custom:
                return new DagCategoryNodeCustom(dagNode, isHidden);
            default:
                throw new Error(`Category type ${categoryType} not supported`);
        }
    }

    /**
     * Create DagCategoryNodes from JSON
     * @param json
     */
    public static createFromJSON(json: DagCategoryNodeInfo): DagCategoryNode {
        let node: DagCategoryNode;
        switch (json.type) {
            case DagCategoryType.Custom:
                node = new DagCategoryNodeCustom(null);
                break;
            default:
                throw new Error("Category type " + json.type + " not supported");
        }

        node.initFromJSON(json);
        return node;
    }
}