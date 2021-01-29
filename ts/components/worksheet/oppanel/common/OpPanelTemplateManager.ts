/**
 * Class to manage HTML templates
 */
class OpPanelTemplateManager {
    private _nodeDefMap: { [key: string]: NodeDef[] } = {};

    public static setElementForceUpdate(element: HTMLElement) {
        OpPanelNodeRenderFactory.setNodeForceUpdate(element as NodeDefDOMElement);
    }

    public static setElementInitFunc(element: HTMLElement, initFunc: () => void) {
        OpPanelNodeRenderFactory.setNodeInitFunc(element as NodeDefDOMElement, initFunc);
    }

    public static setNodeMountDoneListener(
        elements: HTMLElement[], listener: (elem: HTMLElement) => void
    ) {
        if (elements == null) {
            return;
        }
        for (const element of elements) {
            OpPanelNodeRenderFactory.setNodeMountDoneListener(element as NodeDefDOMElement, listener);
        }
    }

    /**
     * Load HTML template from DOM, then create and cache virtual DOM definition
     * @param container ancestor of the template
     * @param templateId data-xcid of the template
     */
    public loadTemplate(templateId: string, container: JQuery) {
        this._getTemplateFromDOM(templateId, container);
    }

    /**
     * Create/Cache VDOM definition from HTML string
     * @param templateId template ID
     * @param templateString HTML string
     */
    public loadTemplateFromString(templateId: string, templateString: string) {
        this._getTemplateFromString(templateId, templateString)
    }

    /**
     * Create VDOM tree by combining VDOM definition and placeholder values
     * @param templateId template ID
     * @param replaces actual values to replace placeholders
     * @returns a list of VDOM
     */
    public createElements(templateId: string, replaces?: { [key: string]: any }) {
        const nodeDef = this._nodeDefMap[templateId];
        if (nodeDef == null) {
            console.error(`TemplateManager.createElements: template not loaded(${templateId})`);
            return [];
        }

        return OpPanelNodeRenderFactory.createNode(nodeDef, replaces);
    }

    /**
     * Compare the real DOM with VCOM, and replace any elements updated
     * @param container Container element in the real DOM tree
     * @param newNodeList VDOM tree list
     */
    public updateDOM(
        container: HTMLElement,
        newNodeList: NodeDefDOMElement[],
    ): void {
        OpPanelNodeRenderFactory.updateDOM(container, newNodeList);
    }

    private _getTemplateFromString(templateId: string, templateString: string) {
        if (this._nodeDefMap[templateId] == null) {
            const nodes = this._createDOMFromString(templateString);
            this._nodeDefMap[templateId] = OpPanelNodeDefFactory.createNodeDef(nodes);
        }
        return this._nodeDefMap[templateId];
    }

    private _getTemplateFromDOM(templateId: string, container: JQuery): NodeDef[] {
        if (this._nodeDefMap[templateId] == null) {
            const templateContainer = <any>this._getXCElement(container, templateId);
            let nodes: NodeDefDOMNodeList;
            if (this._isHTMLTemplate(templateContainer)) {
                const domNodes = templateContainer.content.childNodes;
                nodes = new Array(domNodes.length);
                for (let i = 0; i < domNodes.length; i ++) {
                    nodes[i] = domNodes[i];
                }
            } else {
                nodes = this._createDOMFromString(templateContainer.innerHTML);
            }
            this._nodeDefMap[templateId] = OpPanelNodeDefFactory.createNodeDef(nodes);
        }
        return this._nodeDefMap[templateId];
    }

    private _isHTMLTemplate(
        element: HTMLElement | HTMLTemplateElement
    ): element is HTMLTemplateElement {
        return element.nodeName && element.nodeName === 'template';
    }

    private _getXCElement(container: JQuery, xcid: string): HTMLElement | Element {
        return container.find(`[data-xcid="${xcid}"]`)[0];
    }

    private _createDOMFromString(text) {
        let nodeList: (Node & ChildNode)[];
        let domList: (JQuery | NodeListOf<Node & ChildNode>);

        text = OpPanelTemplateManager._minimizeHTMLString(text);
        if (DOMParser != null) {
            domList = new DOMParser().parseFromString(text, 'text/html').body.childNodes;
        } else {
            domList = $(text);
        }
        nodeList = new Array(domList.length);
        for (let i = 0; i < domList.length; i ++) {
            nodeList[i] = domList[i];
        }

        return nodeList;
    }

    private static _minimizeHTMLString(text) {
        const replaces = {
            '[\t\n\r]': '',
            '(>[ ]+)': '>',
            '([ ]+<)': '<'
        };
        return xcStringHelper.replaceTemplate(text, replaces, true);
    }
}
