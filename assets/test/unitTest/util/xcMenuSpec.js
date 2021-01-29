// XXX TODO: move it to functional test
// describe('XcMenu Test', function() {
//     var testDs;
//     var tableName;
//     var prefix;
//     var tableId;
//     var $table;
//     var table;
//     var $colMenu;
//     var $colSubMenu;
//     var $yelpSinceDragArea;
//     var yelpColNum;
//     var avIdx;

//     function triggerArrow($elt, dir, forceTarget) {
//         var e = jQuery.Event("keydown.menuNavigation");
//         var ft = forceTarget || false;
//         if (ft) {
//             e.target = $elt[0];
//         }
//         switch (dir) {
//             case "Up":
//                 e.which = keyCode.Up;
//                 break;
//             case "Down":
//                 e.which = keyCode.Down;
//                 break;
//             case "Left":
//                 e.which = keyCode.Left;
//                 break;
//             case "Right":
//                 e.which = keyCode.Right;
//                 break;
//             case "Enter":
//                 e.which = keyCode.Enter;
//                 break;
//             case "Escape":
//                 e.which = keyCode.Escape;
//                 break;
//             case "Backspace":
//                 e.which = keyCode.Backspace;
//                 break;
//             default:
//                 console.warn("Unrecognized key");
//         }
//         $elt.trigger(e);
//     }

//     function findVisibleIdx($someMenu, selectorStr) {
//         var idx = $someMenu.find("li:visible")
//                   .index($someMenu.find(selectorStr));
//         return idx;
//     }

//     function navTo(idx) {
//         for (var i = 0; i < idx + 1; i++) {
//             triggerArrow($colMenu, "Down");
//         }
//     }

//     before(function(done) {
//         UnitTest.onMinMode();
//         var testDSObj = testDatasets.fakeYelp;
//         UnitTest.addAll(testDSObj, "unitTestFakeYelp")
//         .then(function(ds, tName, tPrefix) {
//             testDs = ds;
//             tableName = tName;
//             prefix = tPrefix;
//             tableId = xcHelper.getTableId(tableName);
//             $table = $('#xcTable-' + tableId);
//             table = gTables[tableId];
//             $colMenu = $("#colMenu");
//             $colSubMenu = $("#colSubMenu");
//             avIdx = table.getColNumByBackName(prefix +
//                                                   gPrefixSign +
//                                                   "average_stars");
//             yelpColNum = table.getColNumByBackName(prefix +
//                                                   gPrefixSign +
//                                                   "yelping_since");
//             $avgStarsDragArea = $table.find("th.col" + String(avIdx) +
//                                            " .dragArea");
//             $yelpSinceDragArea = $table.find("th.col" + String(yelpColNum) +
//                                             " .dragArea");
//             done();
//         })
//         .fail(done);
//     });
//     describe("xcMenu.addKeyboardNavigation should work", function() {
//         it("Main menu scrolling should work.", function(){
//             expect($colMenu.is(":visible")).to.be.false;
//             $yelpSinceDragArea.contextmenu();
//             expect($colMenu.is(":visible")).to.be.true;
//             expect($colMenu.find(".selected").length).to.equal(0);
//             triggerArrow($colMenu, "Down");
//             expect($colMenu.find(".selected").length).to.equal(1);
//             expect($colMenu.find("li:visible").first().hasClass("selected"))
//             .to.be.true;
//             triggerArrow($colMenu, "Down");
//             expect($colMenu.find(".selected").length).to.equal(1);
//             expect($colMenu.find("li:visible").eq(1).hasClass("selected"))
//             .to.be.true;
//             triggerArrow($colMenu, "Up");
//             expect($colMenu.find(".selected").length).to.equal(1);
//             expect($colMenu.find("li:visible").first().hasClass("selected"))
//             .to.be.true;
//             triggerArrow($colMenu, "Up");
//             expect($colMenu.find(".selected").length).to.equal(1);
//             expect($colMenu.find("li:visible").last().hasClass("selected"))
//             .to.be.true;

//         });

//         it("Left, right, backspc and esc should close menu", function(){
//             expect($colMenu.is(":visible")).to.be.true;
//             triggerArrow($colMenu, "Right");
//             expect($colMenu.is(":visible")).to.be.false;
//             $yelpSinceDragArea.contextmenu();
//             expect($colMenu.is(":visible")).to.be.true;
//             triggerArrow($colMenu, "Left");
//             expect($colMenu.is(":visible")).to.be.false;
//             $yelpSinceDragArea.contextmenu();
//             expect($colMenu.is(":visible")).to.be.true;
//             triggerArrow($colMenu, "Backspace");
//             expect($colMenu.is(":visible")).to.be.false;
//             $yelpSinceDragArea.contextmenu();
//             expect($colMenu.is(":visible")).to.be.true;
//             triggerArrow($colMenu, "Escape");
//             expect($colMenu.is(":visible")).to.be.false;
//             $yelpSinceDragArea.contextmenu();
//         });
//         it("Right on parent menu should open child", function() {
//             // Right on parent menu should open child
//             var acIdx = findVisibleIdx($colMenu, ".textAlign.parentMenu");
//             // Navigate with keys so submenu doesn't open
//             navTo(acIdx);

//             expect($colMenu.find("li:visible.textAlign").hasClass("selected"))
//             .to.be.true;
//             expect($colSubMenu.is(":visible")).to.be.false;
//             triggerArrow($colMenu, "Right");
//             expect($colSubMenu.is(":visible")).to.be.true;
//             expect($colSubMenu.find("ul.textAlign").is(":visible")).to.be.true;
//         });

//         it("First submenu elt should be autoselected", function() {
//             expect($colSubMenu.find(".selected").length).to.equal(1);
//             expect($colSubMenu.find(".textAlign li").first().hasClass("selected"))
//             .to.be.true;
//         });

//         it("Enter key should open submenu", function() {
//             // Enter key should open submenu
//             triggerArrow($colMenu, "Left");
//             expect($colSubMenu.is(":visible")).to.be.false;
//             triggerArrow($colMenu, "Enter");
//             expect($colSubMenu.is(":visible")).to.be.true;
//         });

//         it("Submenu scroll should work", function() {
//             // Submenu scroll should work
//             triggerArrow($colMenu, "Down");
//             expect($colSubMenu.find(".selected").length).to.equal(1);
//             expect($colSubMenu.find(".textAlign li").eq(1).hasClass("selected"))
//             .to.be.true;
//             triggerArrow($colMenu, "Left");
//             expect($colSubMenu.is(":visible")).to.be.false;
//             expect($colMenu.is(":visible")).to.be.true;
//             triggerArrow($colMenu, "Right");
//             triggerArrow($colMenu, "Right");
//             expect($colSubMenu.is(":visible")).to.be.false;
//             expect($colMenu.is(":visible")).to.be.false;

//         });
//         it("Rightarrow should select open but unselected submenu", function() {
//             // Should select open but unselected submenu
//             $yelpSinceDragArea.contextmenu();
//             // keyTriggered = true to remove timeout, force open submenu
//             // without selecting first elt
//             var mouseEvent = $.Event("mouseenter");
//             mouseEvent.which = 1;
//             mouseEvent.keyTriggered = true;
//             $colMenu.find("li:visible.textAlign").trigger(mouseEvent);
//             expect($colSubMenu.is(":visible")).to.be.true;
//             expect($colSubMenu.find(".selected").length).to.equal(0);
//             triggerArrow($colMenu, "Right");
//             expect($colSubMenu.find(".selected").length).to.equal(1);
//         });
//         it("Enter key should trigger menu items", function(done) {
//             // Main menu enter
//             $avgStarsDragArea.contextmenu();
//             var mouseEvent = $.Event("mouseenter");
//             mouseEvent.which = 1;
//             mouseEvent.keyTriggered = true;
//             $colMenu.find("li:visible.hideColumn").trigger(mouseEvent);
//             triggerArrow($colMenu, "Enter"); // Race condition again
//             setTimeout(function() {
//                 avIdx = table.getColNumByBackName(prefix +
//                                                   gPrefixSign +
//                                                   "average_stars");
//                 expect(avIdx).to.equal(-1);
//                 yelpColNum = table.getColNumByBackName(prefix +
//                                                       gPrefixSign +
//                                                       "yelping_since");
//                 done();
//             }, 600);
//         });

//         it("Enter key should trigger submenu items", function() {
//             var $tdOfInterest = $table.find("td.col"+String(yelpColNum)).eq(0);
//             expect($tdOfInterest.hasClass("textAlignLeft")).to.be.true;
//             $yelpSinceDragArea.contextmenu();
//             var alignIdx = findVisibleIdx($colMenu, ".textAlign.parentMenu");
//             // Navigate with keys so submenu doesn't open
//             navTo(alignIdx);
//             triggerArrow($colMenu, "Right");
//             var centerIdx = findVisibleIdx($colSubMenu, ".textAlign.centerAlign");
//             navTo(centerIdx - 1);
//             triggerArrow($colMenu, "Enter");
//             expect($colMenu.is(":visible")).to.be.false;
//             expect($colSubMenu.is(":visible")).to.be.false;
//             expect($tdOfInterest.hasClass("textAlignCenter")).to.be.true;
//         });
//         it("Arrow keys should autohighlight first input", function(done) {
//             $yelpSinceDragArea.contextmenu();
//             $colMenu.find("li:visible.splitCol.parentMenu").mouseenter();
//             triggerArrow($colMenu, "Right");
//             expect($colSubMenu.find("ul:visible.splitCol .selected").length)
//             .to.be.above(0);
//             setTimeout(function() {
//                 done();
//             },400);
//         });
//         it("Arrow keys should only close if left at first pos", function() {
//             function ensureVisible() {
//                 expect($colSubMenu.find("ul:visible.splitCol .selected").length)
//                 .to.be.above(0);
//                 expect($colSubMenu.find("ul:visible.splitCol .inputSelected").length)
//                 .to.be.above(0);
//                 expect($colSubMenu.is(":visible")).to.be.true;
//                 expect($colMenu.is(":visible")).to.be.true;
//             }
//             var $textInput = $colSubMenu.find("ul.splitCol input.delimiter");
//             $textInput.val("abc"); // Cursor should be at after 'c'
//             expect($textInput[0].selectionStart).to.equal(3);
//             // focus event will not fire when the input is offscreen
//             $textInput.focus();
//             triggerArrow($textInput, "Up", true);
//             ensureVisible();
//             triggerArrow($textInput, "Down", true);
//             ensureVisible();
//             triggerArrow($textInput, "Right", true);
//             ensureVisible();
//             triggerArrow($textInput, "Left", true);
//             ensureVisible();
//             // Ensure right arrow doesn't close in middle
//             $textInput[0].selectionStart = 2;
//             triggerArrow($textInput, "Right", true);
//             ensureVisible();
//             triggerArrow($textInput, "Left", true);
//             ensureVisible();

//             // Ensure right arrow doesn't close at beginning
//             $textInput[0].selectionStart = 0;
//             triggerArrow($textInput, "Right", true);
//             ensureVisible();
//             // Ensure left arrow closes at beginning
//             triggerArrow($textInput, "Left", true);
//             expect($colMenu.is(":visible")).to.be.true;
//             expect($colSubMenu.is(":visible")).to.be.false;

//         });
//         it("Arrow keys should never close number input", function(done) {
//             function ensureVisible() {
//                 expect($colSubMenu.find("ul:visible.splitCol .selected").length)
//                 .to.be.above(0);
//                 expect($colSubMenu.find("ul:visible.splitCol .inputSelected").length)
//                 .to.be.above(0);
//                 expect($colSubMenu.is(":visible")).to.be.true;
//                 expect($colMenu.is(":visible")).to.be.true;
//             }
//             var $numInput = $colSubMenu.find("ul.splitCol input.num");
//             $colMenu.find("li:visible.splitCol.parentMenu").mouseenter();
//             triggerArrow($colMenu, "Right");
//             $numInput.val("123"); // Cursor should be at after 'c'
//             // Note: cannot get cursor type with input of type number
//             triggerArrow($numInput, "Up", true);
//             ensureVisible();
//             triggerArrow($numInput, "Down", true);
//             ensureVisible();
//             triggerArrow($numInput, "Right", true);
//             ensureVisible();
//             triggerArrow($numInput, "Left", true);
//             ensureVisible();
//             setTimeout(function() {
//                 done();
//             }, 500);
//         });
//     });

//     after(function(done) {
//         UnitTest.deleteAll(tableName, testDs)
//         .always(function(){
//             UnitTest.offMinMode();
//             done();
//         });
//     });
// });