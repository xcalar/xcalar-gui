/**
 * !!! Should only be called by OpPanelTemplateManager !!!
 * Factory to create/update DOM from virtual DOM definition.
 */
class OpPanelNodeRenderFactory {

    private static _boolProps = ['disabled', 'readonly', 'checked', 'editable'];
    private static _boolPropsMap = { 'disabled': true, 'readonly': true, 'checked': true, 'editable': true };

    /**
     * Create VDOM trees from VDOM definitions
     * @param nodeDefList VDOM definition list
     * @param args acutal values to replace placeholders in the template
     * @returns a list of detached dom trees
     */
    public static createNode(
        nodeDefList: NodeDef[],
        args: { [key: string]: any } = {}
    ): NodeDefDOMElement[] {
        try {
            if (nodeDefList == null) {
                return [];
            }
            const nodeList: NodeDefDOMElement[] = [];
            for (const nodeDef of nodeDefList) {
                if (this._isNodeTypeElement(nodeDef)) {
                    const node = this._createElementNode(nodeDef, args);
                    if (node != null) {
                        nodeList.push(node);
                    }
                } else if (this._isNodeTypeText(nodeDef)) {
                    const node = this._createTextNode(nodeDef, args);
                    if (node != null) {
                        nodeList.push(node as any);
                    }
                } else if (this._isNodeTypeComponent(nodeDef)) {
                    const nodes = this._createComponentNode(nodeDef, args);
                    if (nodes != null) {
                        for (const node of nodes) {
                            if (node != null) {
                                nodeList.push(node);
                            }
                        }
                    }
                }
            }
            return nodeList;
        } catch(e) {
            console.error('NodeRender.createNode', e);
            return [];
        }
    }

    /**
     * Compare the real DOM with VCOM, and replace any elements updated
     * @param container Container element in the real DOM tree
     * @param newNodeList VDOM tree list
     */
    public static updateDOM(
        container: HTMLElement,
        newNodeList: NodeDefDOMElement[],
    ): void {
        try {
            if (container.hasChildNodes()) {
                const oldNodeList = container.childNodes;
                const removeList = [];
                let oldIndex;
                for (oldIndex = 0; oldIndex < oldNodeList.length; oldIndex ++) {
                    const oldNode = oldNodeList[oldIndex] as NodeDefDOMElement;
                    if (oldIndex < newNodeList.length) {
                        const newNode = newNodeList[oldIndex];
                        if (this._isNodeForceUpdate(oldNode)) {
                            container.replaceChild(newNode, oldNode);
                            this._lifecycleMountDone(newNode, newNode, true);
                            // console.log(`Node replace(force): ${oldNode.nodeName}`);
                        } else if (!this._isSameNodeType(oldNode, newNode)) {
                            // Different node type, replace the whole subtree
                            container.replaceChild(newNode, oldNode);
                            this._lifecycleMountDone(newNode, newNode, true);
                            // console.log(`Node replace: ${newNode.nodeName}`);
                        } else {
                            // Same node type, update attributes/states
                            this._updateNode(oldNode, newNode);
                            // this._lifecycleMountDone(newNode, oldNode, false);
                            // Continue checking child elements
                            const childNodes = [];
                            if (newNode.hasChildNodes()) {
                                for (const child of newNode.childNodes) {
                                    childNodes.push(child);
                                }
                            }
                            this.updateDOM(oldNode, childNodes);
                        }
                    } else {
                        // More old children, delete them
                        removeList.push(oldNode);
                    }
                }
                for (const removeNode of removeList) {
                    container.removeChild(removeNode);
                    // console.log(`Node remove: ${removeNode.nodeName}`);
                }
    
                if (oldIndex < newNodeList.length) {
                    // More new children, add them
                    for (let i = oldIndex; i < newNodeList.length; i ++) {
                        const child = newNodeList[i];
                        container.appendChild(child);
                        this._lifecycleMountDone(child, child, true);
                        // console.log(`Node add1: ${newNodeList[i].nodeName}`);
                    }
                }
            } else {
                // Empty tree, add new children
                for (const child of newNodeList) {
                    container.appendChild(child);
                    this._lifecycleMountDone(child, child, true);
                    // console.log(`Node add2: ${child.nodeName}`);
                }
            }
            this._lifecycleMountDone(
                container as NodeDefDOMElement,
                container as NodeDefDOMElement, false);
        } catch(e) {
            console.error('NodeRender.updateDOM', e);
        }
    }

    private static _lifecycleMountDone(
        newNode: NodeDefDOMElement,
        domNode: NodeDefDOMElement,
        isRecursive: boolean
    ) {
        const listener = this._getMountDoneListener(newNode);
        const initFunc = this._getInitFunc(newNode);
        if (listener != null) {
            setTimeout(() => listener(domNode), 0);
        }
        if (initFunc != null) {
            setTimeout(initFunc, 0);
        }
        if (isRecursive && newNode.hasChildNodes()) {
            for (const child of newNode.childNodes) {
                const childNode = <NodeDefDOMElement>child;
                this._lifecycleMountDone(childNode, childNode, isRecursive);
            }
        }
    }

    public static setNodeForceUpdate(node: NodeDefDOMElement) {
        if (node == null) {
            return;
        }
        this._writeXcData(node, { isForceUpdate: true });
    }

    private static _isNodeForceUpdate(node: NodeDefDOMElement): boolean {
        const xcdata = this._readXcData(node);
        if (xcdata == null) {
            return false;
        }
        return xcdata.isForceUpdate;
    }

    public static setNodeInitFunc(node: NodeDefDOMElement, initFunc: () => void) {
        if (node == null) {
            return;
        }
        this._writeXcData(node, { initFunc: initFunc });
    }

    public static setNodeMountDoneListener(
        node: NodeDefDOMElement, listener: (elem: HTMLElement) => void
    ) {
        if (node == null) {
            return;
        }
        this._writeXcData(node, { elementMountDone: listener });
    }

    private static _getInitFunc(node: NodeDefDOMElement): () => void {
        const xcdata = this._readXcData(node);
        if (xcdata == null) {
            return null;
        }
        return xcdata.initFunc;
    }

    private static _getMountDoneListener(
        node: NodeDefDOMElement
    ): (node: NodeDefDOMElement) => void {
        const xcdata = this._readXcData(node);
        if (xcdata == null) {
            return null;
        }
        return xcdata.elementMountDone;
    }

    private static _getDefaultXcData(): NodeDefXcData {
        return {
            isForceUpdate: false,
            events: {},
            initFunc: null
        };
    }

    private static _writeXcData(
        node: NodeDefDOMElement,
        xcdata: NodeDefXcData
    ) {
        if (node == null || xcdata == null) {
            return;
        }
        const nodeData = node.xcdata || this._getDefaultXcData();
        if (xcdata.isForceUpdate != null) {
            nodeData.isForceUpdate = xcdata.isForceUpdate;
        }
        if (xcdata.events != null) {
            nodeData.events = Object.assign({}, xcdata.events);
        }
        if (xcdata.initFunc != null) {
            nodeData.initFunc = xcdata.initFunc;
        }
        if (xcdata.elementMountDone !== undefined) {
            nodeData.elementMountDone = xcdata.elementMountDone;
        }
        node.xcdata = nodeData;
    }

    private static _readXcData(node: NodeDefDOMElement): NodeDefXcData {
        const xcdata = node.xcdata;
        if (xcdata == null) {
            return null;
        }
        return {
            isForceUpdate: xcdata.isForceUpdate,
            events: Object.assign({}, xcdata.events),
            initFunc: xcdata.initFunc,
            elementMountDone: xcdata.elementMountDone
        };
    }

    private static _isSameNodeType(
        oldNode: NodeDefDOMElement,
        newNode: NodeDefDOMElement,
    ): boolean {
        if (oldNode == null || newNode == null) {
            return false;
        }
        if (oldNode.nodeType !== newNode.nodeType) {
            return false;
        }
        return oldNode.nodeName === newNode.nodeName;
    }

    private static _updateNode(
        oldNode: NodeDefDOMElement,
        newNode: NodeDefDOMElement,
    ) {
        try {
            if (oldNode == null || newNode == null) {
                return;
            }
    
            if (oldNode.nodeType === Node.TEXT_NODE) {
                // Text node, only update textContent
                if (oldNode.textContent !== newNode.textContent) {
                    oldNode.textContent = newNode.textContent;
                }
            } else {
                const attrsNew = newNode.attributes;
                const attrsOld = oldNode.attributes;
                const attrNameSetNew = new Set<string>();
                // Regular attributes/states
                for (let i = 0; i < attrsNew.length; i ++) {
                    const {name: newName, value: newValue} = attrsNew[i];
                    attrNameSetNew.add(newName);
                    if (this._boolPropsMap[newName]) {
                        // We will check all boolean attributes later
                        continue;
                    }
                    const stateOld = oldNode[newName];
                    const attrOld = attrsOld[newName];
                    const oldValue = (stateOld != null)? stateOld: (attrOld == null? null: attrOld.value);
                    if (oldValue !== newValue) {
                        this._updateAttribute(oldNode, newName, newValue);
                        // console.log(`Attr update: ${newName},${oldValue},${newValue}`);
                    }
                }
                // Boolean states
                for (const newName of this._boolProps) {
                    const newValue = newNode[newName];
                    const oldValue = oldNode[newName];
                    if (newValue != null && oldValue != null && newValue !== oldValue) {
                        this._updateAttribute(oldNode, newName, newValue);
                        // console.log(`Attr update2: ${newName}`);
                    }
                }
                // Removed attributes
                for (let i = 0; i < attrsOld.length; i ++) {
                    const {name: oldName} = attrsOld[i];
                    if (!attrNameSetNew.has(oldName)) {
                        this._removeAttribute(oldNode, oldName);
                    }
                }
                // Event listeners
                const oldXcdata = this._readXcData(oldNode);
                if (oldXcdata != null) {
                    const events = oldXcdata.events;
                    for (const eName of Object.keys(events)) {
                        oldNode.removeEventListener(eName, events[eName]);
                        // console.log(`Remove event: ${eName}`);
                    }
                    this._writeXcData(oldNode, {events: {}});
                }
                const newXcdata = this._readXcData(newNode);
                if (newXcdata != null) {
                    const events = newXcdata.events;
                    for (const eName of Object.keys(events)) {
                        oldNode.addEventListener(eName, events[eName]);
                        this._writeXcData(oldNode, {events: events});
                        // console.log(`Add event: ${eName}`);
                    }
                }
                // LifeCycle handlers
                if (newXcdata != null) {
                    if (newXcdata.elementMountDone != null) {
                        this._writeXcData(oldNode, {elementMountDone: newXcdata.elementMountDone});
                    } else {
                        this._writeXcData(oldNode, {elementMountDone: null});
                    }
                }
            }
        } catch(e) {
            console.error('NodeRender._updateNode', e);
        }
    }

    private static _setAttribute(
        node: HTMLElement, attrName, attrValue
    ) {
        try {
            if (this._boolPropsMap[attrName]) {
                node[attrName] = attrValue? true: false;
            } else {
                node.setAttribute(attrName, attrValue);
            }
        } catch(e) {
            console.error('NodeRender._updateAttribute', e);
        }
    }

    private static _updateAttribute(
        node: HTMLElement, attrName, attrValue
    ) {
        try {
            if (this._boolPropsMap[attrName]) {
                node[attrName] = attrValue? true: false;
            } else {
                if (attrName == 'value') {
                    node[attrName] = attrValue;
                } else {
                    node.setAttribute(attrName, attrValue);
                }
            }
        } catch(e) {
            console.error('NodeRender._updateAttribute', e);
        }
    }

    private static _removeAttribute(
        node: HTMLElement, attrName
    ) {
        try {
            if (this._boolPropsMap[attrName]) {
                node[attrName] = false;
            } else {
                if (attrName == 'value') {
                    node[attrName] = '';
                } else {
                    node.removeAttribute(attrName);
                }
            }
        } catch(e) {
            console.error('NodeRender._removeAttribute', e);
        }
    }

    private static _decodeText(text: string): string {
        return text.replace(/&gt;/, '>')
            .replace(/&lt;/, '<');
    }
    
    private static _createTextNode(
        nodeDef: NodeDefText, args: { [key: string]: any }
    ): Text {
        try {
            let textString = '';
            for (const txt of nodeDef.text) {
                if (this._isTypePlaceholder(txt)) {
                    if (args != null) {
                        textString = `${textString}${args[txt.name]}`;
                    } else {
                        console.error('NodeRender.createTextNode: args not defined');
                    }
                } else {
                    textString = `${textString}${txt}`;
                }
            }
            return document.createTextNode(this._decodeText(textString));
        } catch(e) {
            console.error('NodeRender._createTextNode', e);
            return null;
        }
    }

    private static _createElementNode(
        nodeDef: NodeDefElement, args: { [key: string]: any }
    ): NodeDefDOMElement {
        try {
            const node = this._createElementNodeNoChildren(nodeDef, args);
            if (node == null) {
                return null;
            }
            if (nodeDef.children != null) {
                for (const childNode of this.createNode(nodeDef.children, args)) {
                    node.appendChild(childNode);
                }
            }
            return node;
        } catch(e) {
            console.error('NodeRender._createElementNode', e);
            return null;
        }
    }

    private static _createComponentNode(
        nodeDef: NodeDefComponent, args: { [key: string]: any }
    ): NodeDefDOMElement[] {
        try {
            if (args != null) {
                const comp = args[nodeDef.name];
                if (Array.isArray(comp)) {
                    return comp;
                } else {
                    return [comp];
                }
            } else {
                console.error('NodeRender._createComponentNode: args not defined');
                return null;
            }
        } catch(e) {
            console.error('NodeRender._createComponentNode', e);
            return null;
        }
    }

    private static _createElementNodeNoChildren(
        nodeDef: NodeDefElement, args: { [key: string]: any }
    ): NodeDefDOMElement {
        try {
            const node = document.createElement(nodeDef.tag) as NodeDefDOMElement;
            node.xcdata = {events:{}};
            if (nodeDef.class != null) {
                let className = '';
                for (const cls of nodeDef.class) {
                    if (!this._isTypePlaceholder(cls)) {
                        className = `${className} ${cls}`;
                    } else {
                        if (args != null) {
                            className = `${className} ${args[cls.name]}`;
                        } else {
                            console.error('NodeRender.createElementNode(class): args not defined');
                        }
                    }
                }
                node.className = className.trim();
            }
            if (nodeDef.style != null) {
                if (!this._isTypePlaceholder(nodeDef.style)) {
                    node.setAttribute('style', nodeDef.style);
                } else {
                    if (args != null) {
                        const style = args[nodeDef.style.name];
                        if (style != null) {
                            node.setAttribute('style', style);
                        }
                    } else {
                        console.error('NodeRender.createElementNode(style): args not defined');
                    }
                }
            }
            if (nodeDef.attr != null) {
                for (const key of Object.keys(nodeDef.attr)) {
                    const value = nodeDef.attr[key];
                    if (!this._isTypePlaceholder(value)) {
                        this._setAttribute(node, key, value);
                        // node.setAttribute(key, `${value}`);
                    } else {
                        if (args != null) {
                            this._setAttribute(node, key, args[value.name]);
                            // node.setAttribute(key, `${args[value.name]}`);
                        } else {
                            console.error('NodeRender.createElementNode(attr): args not defined');
                        }
                    }
                }
            }
            if (nodeDef.event != null) {
                for (const eventName of Object.keys(nodeDef.event)) {
                    if (args != null) {
                        const func = args[nodeDef.event[eventName]];
                        node.addEventListener(eventName, func);
                        node.xcdata.events[eventName] = func;
                    } else {
                        console.error('NodeRender.createElementNode(event): args not defined');
                    }
                }
            }
            return node;
        } catch(e) {
            console.error('NodeRender._createElementNodeNoChildren', e);
            return null;
        }
    }

    private static _isTypePlaceholder(
        txt: (string | NodeDefPlaceholder)
    ): txt is NodeDefPlaceholder {
        return (typeof txt === 'object' && txt.name != null);
    }

    private static _isNodeTypeElement(nodeDef: NodeDef): nodeDef is NodeDefElement {
        return nodeDef.type === NodeDefType.element;
    }

    private static _isNodeTypeText(nodeDef: NodeDef): nodeDef is NodeDefText {
        return nodeDef.type === NodeDefType.text;
    }

    private static _isNodeTypeComponent(nodeDef: NodeDef): nodeDef is NodeDefComponent {
        return nodeDef.type === NodeDefType.component;
    }
}
