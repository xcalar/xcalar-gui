var stage;
var errorAttempt;

var eventCode;
var questions;
var oldData = "";

var trainingType;
var trainingID;

var userInRow = false;
var userInRowThreshold = 10;

var lastPullReturned = true;

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
		var images = d3.selectAll("image");
		console.log(data)
		var echoedData = JSON.parse(data);
		var users = echoedData[0];
		var emails = echoedData[1];
		var questionProgress = echoedData[2];
		var wrongAnswers = echoedData[3];
		questions = echoedData[4];
		var numQuestions = questions;
		var studentData = getStudentData(questionProgress);
		if (images[0].length == 0) {
			displayProgressFirstTime(studentData, wrongAnswers, numQuestions, users, emails);
		} else {
			var trackWidth = 100 * numQuestions;
			var horizontalSpacing = calculateHorizontalPictureSpacing(numQuestions, trackWidth);
			updateProgress(studentData, wrongAnswers, horizontalSpacing);
		}
		oldData = data;
	}
}

function updateProgress(studentData, wrongAnswers, horizontalSpacing) {
	var pictureWidth = 50;
	var numStudents = studentData.length;
	var images = d3.selectAll("image");
	var wrongAnswerLabels = d3.selectAll(".wrongAnswerLabel");

	images.transition()
			.duration(1500)
			.attr("x", function(d, i) {
			   	return horizontalIconLocation(studentData[i]["currentQuestion"], horizontalSpacing, pictureWidth);
			});
	wrongAnswerLabels.text(function(d, i){
		return wrongAnswers[i];
	});
}

function displayProgressFirstTime(studentData, wrongAnswers, numQuestions, users, emails) {
	if (users.length > userInRowThreshold) {
		userInRow = true;
	}
	var svgContainer;
	var numStudents = studentData.length;
	d3.selectAll("svg").remove();
	var mainRect = $(".main").get(0).getBoundingClientRect();
	var trackWidth = 100 * numQuestions;
	var numTracks = numStudents;
	var trackHeight = 65 * (numTracks);
	var pictureWidth = 50;
	var pictureHeight = 50;
	var verticalSpacing = calculateVerticalPictureSpacing(numStudents, trackHeight);
	var horizontalSpacing = calculateHorizontalPictureSpacing(numQuestions, trackWidth);
	var startWidth = horizontalSpacing + 50;
	var finishWidth = horizontalSpacing + 50;
	var maxUserNameLength = getMaxUserName(users);
	$(".ProgressPage").css("background", "#4D5B67");
	svgContainer = d3.select(".main")
						 .append("svg")
						 .style("display", "block")
						 .style("margin", "auto")
						 .style("overflow", "visible")
						 .attr("width", startWidth + trackWidth + finishWidth + 200)
        				 .attr("height", trackHeight + 100)
        				 .attr("transform", "rotate(90)")
						 .attr("class", "displayData")
						 .append("g")
						 // .attr("transform", "translate (" + 0 + ", " + 75 + ")");
						 // .attr("transform", "translate (" + (startWidth + trackWidth + finishWidth + 200) / 2 + ", " + (trackHeight + 100) / 2 + ") rotate(90)");
	svgContainer.append("text")
					.attr("text-anchor", "start")
					.style("fill", "#FFFFFF")
					.style("font-weight", "bold")
					.attr("font-size", "18px")
					.text("WRONG ATTEMPTS")
					// .attr("transform", "translate (" + (startWidth + trackWidth + finishWidth + 20) + ", " + (-20) + ") rotate(90)");
					.attr("transform", "translate (" + (startWidth + trackWidth + finishWidth + 20) / 2 + ", " + (-20) + ")");
	svgContainer.append("rect")
								.attr("width", trackWidth)
								.attr("height", trackHeight)
								.style("fill", "#E26340")
								.style("stroke", "#FFFFFF")
								.style("stroke-width", "1px")
								.attr("transform", "translate (" + startWidth + ", " + 0 + ")");
	svgContainer.append("rect")
								.attr("transform", "translate (" + startWidth + trackWidth + ", " + 0 + ")")
								.attr("width", finishWidth)
								.attr("height", trackHeight)
								.style("fill", "#E26340")
								.style("stroke", "#FFFFFF")
								.style("stroke-width", "1px");
	svgContainer.append("text")
				.style("fill", "#FFFFFF")
				.attr("text-anchor", "middle")
				.attr("font-size", "60px")
				.style("font-weight", "bold")
				// .attr("transform", "translate (" + (startWidth + trackWidth + (finishWidth / 2) + 10) + ", " + trackHeight / 2 + ") rotate(90)")
				.attr("transform", "translate (" + (startWidth + trackWidth + (finishWidth / 2) + 10) + ", 0)")
				.text("FINISH LINE");

	for (var i = 0, picPos = 5; i < numStudents && picPos < trackHeight; i++, picPos += 65) {
		svgContainer.append("g")
					.append("svg:image")
					.attr("class", "icon")
				   	.attr("href", studentData[i]["icon"])
				   	.attr("width", pictureWidth)
				   	.attr("height", pictureHeight)
				   	// .attr("transform", "rotate(90)")
				   	.attr("y", picPos)
				   	.attr("transform", "translate (" + startWidth + ", " + 0 + ")");
		appendUserInfoCounts(i, picPos)
		appendWrongAnswerCounts(i, picPos)
	}

	svgContainer.selectAll("image")
			    .transition()
			    .duration(1500)
			    .attr("x", function(d, i) {
			   		return horizontalIconLocation(studentData[i]["currentQuestion"], horizontalSpacing, pictureWidth);
			    });

	appendQuestionLabels(numQuestions, svgContainer, horizontalSpacing, trackHeight, startWidth);
	appendPolylines(svgContainer, startWidth, startWidth + trackWidth, trackHeight);

	function appendUserInfoCounts(i, textHeight) {
		svgContainer.append("text")
				.attr("class", "userInfoLabel")
				.attr("text-anchor", "start")
				.style("fill", "#FFFFFF")
				.style("font-weight", "bold")
				.style("white-space", "pre")
				.attr("font-size", "18px")
				.html(full(users[i]))
				.attr("transform", "translate (" + 0 + ", " + (textHeight + (pictureWidth / 2)) + ")");

		function full(str) {
			if (str.length < maxUserNameLength) {
				str = Array((maxUserNameLength - str.length) * 2).join(" ") + str;
			}
			return str;
		}
	}

	function getMaxUserName() {
		var max = 0;
		for (var i = 0; i  < users.length; i++) {
			var user = users[i];
			max = Math.max(user.length, max);
		}
		return max;
	}

	function appendWrongAnswerCounts(i, textHeight) {
		svgContainer.append("text")
					.attr("class", "wrongAnswerLabel")
					.attr("text-anchor", "start")
					.style("fill", "#FFFFFF")
					.style("font-weight", "bold")
					.attr("font-size", "18px")
					.text(wrongAnswers[i])
					// .attr("transform", "translate (" + (trackWidth + finishWidth + 20) + ", " + (textHeight + (pictureWidth / 2)) + ") rotate(90)");
					.attr("transform", "translate (" + (trackWidth + finishWidth + 20) + ", " + (textHeight + (pictureWidth / 2)) + ")");
	}
}

function horizontalIconLocation(currQuestion, horizontalSpacing, pictureWidth) {
	return ((currQuestion * horizontalSpacing) + horizontalSpacing / 2) - (pictureWidth / 2);
}

function getStudentData(data) {
	var studentData = [];
	var picNum;
	var filePath;
	for (var i = 0; i < data.length; i++) {
	    picNum = i <= 29 ? i : i % 30;
	    filePath = "themes/simple/images/userIcons/Token_" + (picNum + 1) + ".png";
	    studentData.push({
	    	"currentQuestion": data[i],
	    	"icon": filePath
	    });
	}
	return studentData;
}

function appendPolylines(svgContainer, start, end, height) {
	var currHeight = 65;
	var p1;
	var p2;
	while (currHeight <= height - 30) {
		svgContainer.append("polyline")
					.attr("points", function() {
						p1 = [start, currHeight];
						p2 = [end, currHeight];
						return [p1, p2];
					})
					.style("stroke", "#FFFFFF")
            		.style("stroke-width", "1px");
		currHeight += 65;
	}
}

function appendQuestionLabels(numQuestions, svgContainer, horizontalSpacing, height, startWidth) {
	var move = [];
	move[1] = -25;
	var horizontaslPos = horizontalSpacing / 2;
	var p1, p2;
	for (var i = 0; i < numQuestions; i++) {
		move[0] = horizontaslPos + startWidth;
		svgContainer.append("text")
					.attr("text-anchor", "middle")
					// .attr("transform", "translate(" + move + ") rotate(90)")
					.attr("transform", "translate(" + move + ")")
					.style("fill", "#FFFFFF")
					.style("stroke-width", "2px")
					.style("font-weight", "bold")
					.style("font-size", "18px")
					.text(function() {
						return "Q" + (i + 1);
					});
		svgContainer.append("polyline")
					.attr("points", function() {
						p1 = [startWidth + horizontaslPos + (horizontalSpacing / 2), 0];
						p2 = [startWidth + horizontaslPos + (horizontalSpacing / 2), height];
						return [p1, p2];
					})
					.style("stroke", "#FFFFFF")
					.style("stroke-dasharray", ("2,2"));
		horizontaslPos += horizontalSpacing;
	}
}

function calculateVerticalPictureSpacing(numStudents, trackHeight) {
	return trackHeight / (numStudents);
}

function calculateHorizontalPictureSpacing(numQuestions, trackWidth) {
	return trackWidth / (numQuestions);
}