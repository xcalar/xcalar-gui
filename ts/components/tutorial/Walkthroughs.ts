enum TooltipType {
    Click = "click",
    DoubleClick = "doubleclick",
    Text = "text",
    Value = "value"
}

enum TooltipStartScreen {
    Home = "Home",
    Load = "Load",
    Notebook = "Notebook",
}
/**
 * A object for all walkthroughs,
 * each walkthrough includes:
 *  key: the key for TooltipWalkthroughs to reference the walkthrough
 *  value: {
 *      name: string, name of the walkthrough
 *      description: string, description of the walkthrough
 *  }
 */
const Walkthroughs = {
    [DemoTStr.title]: {
        basic: {
            title: DemoTStr.title,
            background: false,
            startScreen: TooltipStartScreen.Home,
            isSingleTooltip: true
        },
        extra: {
            includeNumbering: false
        },
        steps: [{
            highlight_div: "#loadScreenBtn",
            interact_div: "#loadScreenBtn",
            text: "If this is your first time using Xcalar, start with loading a table.",
            type: TooltipType.Click
        }]
    },
    [WKBKTStr.Location]: {
        basic: {
            title: WKBKTStr.Location,
            startScreen: TooltipStartScreen.Notebook,
            description: "Tour of the Project Browser",
            background: true,
        },
        extra: {
            closeOnModalClick: false,
            includeNumbering: true
        },
        steps: [{
            highlight_div: ".tutBox",
            title: "Welcome to Xcalar Design!",
            text: "Here you will find many resources to learn about Xcalar Design.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#createWKBKbtn",
            interact_div: "#createWKBKbtn",
            title: "Create a project",
            text: "A project is a container where you design, troubleshoot, and execute your data models. Click 'Create New Project' to create a new project.",
            type: TooltipType.Click,
            wait_for_div: "#workbookPanel .workbookBox.lastCreate",
        },
        {
            highlight_div: "#workbookPanel .workbookBox.lastCreate",
            interact_div: "#workbookPanel .workbookBox.lastCreate",
            title: "Rename and activate the project",
            text: "Enter a new project name, then click a project's name to activate and open it.",
            type: TooltipType.Click
        }]
    },
    [ModeTStr.Advanced]: {
        basic: {
            title: ModeTStr.Advanced,
            background: true,
            startScreen: TooltipStartScreen.Notebook
        },
        steps: [{
            highlight_div: "#modeArea",
            text: "Welcome to Developer Mode. This user interface enables you to develop and troubleshoot your data models through a combination of visual design, SQL and Python.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#helpArea",
            text: "Relaunch this walkthrough anytime by clicking on the Help icon and selecting Walkthroughs.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#tabButton",
            interact_div: "#tabButton",
            text: "A plan is a series of actions performed on data to develop a data model. Click the new plan icon to create a new plan at any time.",
            type: TooltipType.Click
        },
        {
            highlight_div: ".dataflowMainArea",
            text: "The plan canvas is where you create and connect Nodes to create plans.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#dagView .categoryBar",
            text: "The Developer Mode toolbar displays the categories of available operation Nodes.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#dagView .operatorBar",
            text: "Each category displays the operation Nodes you'll use to build your plans. Double click or drag and drop Nodes from the toolbar to the plan canvas.",
            type: TooltipType.Text
        },
        {
            pre_mousedown_div: '.category-in',
            highlight_div: "#dagView .operatorBar",
            text: "Before creating a plan, import at least one data source into a dataset. A plan must start with a source Node (a Dataset or a Table Node) to read the imported data.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#dagView .operatorWrap .active .operator",
            interact_div: "#dagView .operatorWrap .active .operator .main",
            text: "Double click this Dataset Node to add it to the plan canvas.",
            type: TooltipType.DoubleClick
        },
        {
            highlight_div: ".dataflowArea.active rect.main",
            text: "Clicking on the Node and selecting Configure enables you to configure the Node. For example, you can configure a Dataset Node to read a dataset that you have imported.",
            type: TooltipType.Text
        },
        {
            pre_mousedown_div: '.category-rowOps',
            highlight_div: "#dagView .operatorWrap .active .operator",
            interact_div: "#dagView .operatorWrap .active .operator .main",
            text: "Double click this Sort Node to add it to the plan canvas.",
            type: TooltipType.DoubleClick,
        },
        {
            highlight_div: "#dagView",
            text: "You can connect the two Nodes by dragging the Dataset Node anchor to the Sort Node and then configure the Sort Node.",
            type: TooltipType.Text
        },
        {
            highlight_div: "#helpArea",
            interact_div: "#helpArea",
            text: "This concludes the tour of the Developer Mode user interface. To get more hands-on experience, please click the Help icon and view the tutorials.",
            type: TooltipType.Text
        }]
    }

}