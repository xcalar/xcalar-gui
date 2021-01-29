var eventCode;
var questions;
var oldData = "";

var trainingType;
var trainingID;
var questionNum;

var userInRow = false;

var lastPullReturned = true;
var isFirstTime = true;
var gridWidth = 200;
var gridHeight = 150;

function pullData() {
    if (lastPullReturned) {
        lastPullReturned = false;
        $.ajax({
            url: "api/pullStage",
            type: "POST",
            data: {
                "trainingType": trainingType,
                "trainingID": trainingID,
                "EventCode" : eventCode
            },
            success: function(data) {
                displayStudentProgress(data);
                lastPullReturned = true;
            } ,
            error: function() {
                lastPullReturned = true;
            }
        });
    }
}

$(document).ready(function() {
    $(".main").hide();
    $('.ProgressPage').append('<div class="inputBoxes">'+
        '<label>Training Type:</label>' +
        '<select id="trainingType"><option value="adventure">adventure</option><option value="exercise">exercise</option></select><br>'+
        '<label>Training ID:</label>' +
        '<input id="trainingID"/><br>' +
        '<label>Event Code</label>' +
        '<input id="eventCode"/><br>' +
        '<button class="button">Submit</button>' +
        '</div>');
    $(".button").on('click', function() {
        trainingID = $("#trainingID").val();
        trainingType = $("#trainingType").val();
        eventCode = $("#eventCode").val();
        if (trainingID != "" && eventCode != "") {
            $(".inputBoxes").hide();
            $(".main").show();
            setInterval(function() {
                pullData();
            }, 2000);
        }
    });
});

function displayStudentProgress(data) {
    if (oldData != data) {
        var echoedData = JSON.parse(data);
        var numQuestions = questions;
        var users = echoedData[0];
        var emails = echoedData[1];
        var stage = echoedData[2];
        var errorAttempts = echoedData[3];
        questionNum = echoedData[4];

        display(users, stage, errorAttempts, questionNum);
        oldData = data;
    }
}

function display(users, stage, errorAttempts, questionNum) {
    if (isFirstTime) {
        showUserInRow = (users && users.length > 10) ? true : false;
        if (showUserInRow) {
            $("#userStageGraph").addClass("rotate");
        } else {
            $("#userStageGraph").removeClass("rotate");
        }
        drawOutline();
        isFirstTime = false;
    }
    updateUserStatus();

    function drawOutline() {
        var basicHtml = "";

        basicHtml += '<div class="columnWrapper">'
             + getQuestionId()
             + '<div class="rowWrapper">'
             + getUserNames()
             + '<div class="rowWrapper field">'
             + getGrids()
             + getFinishLine()
             + '</div>'
             + '</div>'
             + '</div>';
        $("#userStageGraph").html(basicHtml);
        if (users.length >= 10) {
            $("#grids .rowWrapper").last().addClass("noBottomLine");
        }
        getUserStage();

        function getFinishLine() {
            var html = '<div class="columnWrapper">'
                    + '<img class="flag upper" src="themes/simple/images/flag.svg">'
                    + '<div class="finishLineWrapper"><div class="finishLine">FINISH LINE</div></div>'
                    + '<img class="flag lower" src="themes/simple/images/flag.svg">'
                    + '</div>';
            return html;
        }

        function getQuestionId() {
            var html = "";
            html += '<div class="rowWrapper" id="questionId"><div class="grid"></div>';
            for (var i = 0; i < questionNum; i++) {
                html += '<div class="grid">Q' + (i + 1) +'</div>';
            }
            html += '<div class="grid"></div><div class="grid wrongAnswerWrapper"><div class="wrongAnswers">WRONG ANSWERS</div></div>';
            html += '</div>';
            return html;
        }

        function getUserNames() {
            var html = "";
            html += '<div id="userNames">';
            for (var i = 0; i < users.length; i++) {
                html += '<div class="rowWrapper"><div class="grid name">' + users[i] + '</div></div>';
            }
            html += "</div>";
            return html;
        }

        function getGrids() {
            var html = "";
            html += '<div id="grids">';
            for (var i = 0; i < users.length; i++) {
                html += '<div class="rowWrapper">';
                for (var j = 0; j < questionNum; j++) {
                    html += '<div class="grid"></div>';
                }
                html += '<div class="grid spaceForIcons"></div><div class="grid errorAttempt">0</div>';
                html += '</div>';
            }
            html += "</div>";
            return html;
        }

        function getUserStage() {
            for (var i = 0; i < users.length; i++) {
                var picPath = "themes/simple/images/userIcons/Token_" + (i % 30 + 1) + ".png";
                var firstCap = users[i].charAt(0).toUpperCase();
                var id = "userIcon-" + i;
                var html = '<div class="grid userIcon" id="' + id + '">'
                        + '<span>' + firstCap + '</span>'
                        + '<img class="icon" src="' + picPath + '">'
                        + '</div>';
                $("#grids").append(html);
                $("#" + id).css({'left':0, 'top':(gridHeight * i)});
            }
        }
    }

    function updateUserStatus() {

        setErrorAttempt();
        setUserStage();

        function setErrorAttempt() {
            for (var i = 0; i < errorAttempts.length; i++) {
                var $ele = $("#grids .errorAttempt").eq(i);
                var errorAttempt = errorAttempts[i];
                if ($ele) {
                    var oldAttempt = $ele.html();
                    if (oldAttempt != errorAttempt) {
                        $ele.html(errorAttempt);
                    }
                }
            }
        }
        function setUserStage() {
            for (var i = 0; i < stage.length; i++) {
                var id = "userIcon-" + i;
                var $ele = $("#" + id);
                var userStage = stage[i];
                var newLeft = gridWidth * userStage;
                if ($ele) {
                    var oldLeft = $ele.css('left');
                    if (oldLeft != newLeft) {
                        $ele.animate({left: newLeft}, 3000);
                    }
                }
            }
        }
    }
}