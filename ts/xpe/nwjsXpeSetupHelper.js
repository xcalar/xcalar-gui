/**
 * if XD being run by nwjs, do a setup to generate
 * custom context menus, keyboard shortcuts, etc. in the nwjs Window
 */
window.onload = function(res) {
    if (typeof nw !== "undefined") {
        // file and its dependencies included at build time for xpe target
        XpeSharedContextUtils.nwjsSetup();
        // maximize window if it's first XD window opened during this app run
        // (don't max every new XD win or will keep max'ing on refresh, wb nav,
        // etc., overriding user's resizing to their preferred dimensions)
        // note - don't solve by restricting maximize to login page;
        // if browser token remains valid between app runs, initial window
        // will open to index.html, not login)
        if (!global.maximized) { // global is global to all nwjs browser windows
            var ngui = require("nw.gui");
            var nwin = ngui.Window.get();
            nwin.maximize();
            global.maximized = true;
        }
    }
}
