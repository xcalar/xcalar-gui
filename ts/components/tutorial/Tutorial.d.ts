interface TooltipInfo {
    highlight_div: string;
    title?: string;
    text: string;
    type: TooltipType;
    interact_div?: string;
    value?: string;
    wait_for_div?: string; // if exist, wait for the elemnt to exist for  the action
    position?: string;
    pre_mousedown_div?: string;
    wait_before_next_step?: number;
}

interface WalkthroughInfo {
    title: string;
    description?: string;
    background: boolean;
    startScreen: TooltipStartScreen;
    isSingleTooltip?: boolean;
}

interface TooltipStoredInfo {
    showWorkbook: boolean;
    seenSQL: boolean;
    seenDataflow: boolean;
}
