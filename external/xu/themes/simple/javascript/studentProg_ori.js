var column;
var questions;
var userEmails = ["student1@xcalar.com",
			 "student2@xcalar.com",
			 "student3@xcalar.com",
			 "student4@xcalar.com",
			 "student5@xcalar.com",
			 "student6@xcalar.com",
			 "student7@xcalar.com",
			 "student8@xcalar.com",
			 "student9@xcalar.com"];
var oldData = "";

function pullData() {
	$.ajax({
		url: "empty",
		type: "POST",
		data: {column: column,
			  userEmails : JSON.stringify(userEmails)},
		success: function(data) {
			displayStudentProgress(data);
		} 
	});
}

function pullDataWithTimeout (){
	setTimeout(function() {
		pullData();
		pullDataWithTimeout();
	}, 2000);
}

$(document).ready(function () {
	$(".main").hide();
	$('.ProgressPage').append('<div class="inputBoxes"><label>Column ID</label><input id="colInput"/><br><label>Number of Questions</label><input id="questionsInput"/><br><button class="button">Submit</button></div>');
	$(".button").on('click', function() {
		var col = $("#colInput").val();
		var questionsNum = $("#questionsInput").val();
		if (col != "" && questionsNum != "") {
			$(".inputBoxes").hide();
			$(".main").show();
			column = col;
			questions = parseInt(questionsNum);
			pullData();
			pullDataWithTimeout();
		}
	});
});

function displayStudentProgress(data) {
	if (oldData != data) { 
		var images = d3.selectAll("image");
		var echoedData = JSON.parse(data);
		var numQuestions = questions;
		var questionProgress = echoedData[0];
		var wrongAnswers = echoedData[1];
		var studentData = getStudentData(questionProgress);

		if (images[0].length == 0) {
			displayProgressFirstTime(studentData, wrongAnswers, numQuestions);
		}
		else {
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

function displayProgressFirstTime(studentData, wrongAnswers, numQuestions) {
	var svgContainer;
	var numStudents = studentData.length;
	d3.selectAll("svg").remove();
	var mainRect = $(".main").get(0).getBoundingClientRect();
	var trackWidth = 100 * numQuestions;
	var numTracks = (numStudents > 10) ? (numStudents + 1) : 11;
	var trackHeight = 60 * (numTracks);
	var pictureWidth = 50;
	var pictureHeight = 50;
	var verticalSpacing = calculateVerticalPictureSpacing(numStudents, trackHeight);
	var horizontalSpacing = calculateHorizontalPictureSpacing(numQuestions, trackWidth);
	var finishWidth = horizontalSpacing + 50;
	$(".ProgressPage").css("background", "#4D5B67");
	svgContainer = d3.select(".main")
						 .append("svg")
						 .style("display", "block")
						 .style("margin", "auto")
						 .attr("width", trackWidth + finishWidth + 200)
        				 .attr("height", trackHeight + 100)
						 .attr("class", "displayData")
						 .append("g")
						 .attr("transform", "translate (" + 0 + ", " + 75 + ")");
	svgContainer.append("text")
					.attr("text-anchor", "start")
					.style("fill", "#FFFFFF")
					.style("font-weight", "bold")
					.attr("font-size", "18px")
					.text("WRONG ATTEMPTS")
					.attr("transform", "translate (" + (trackWidth + finishWidth + 20) + ", " + (-20) + ")");
	svgContainer.append("rect")
								.attr("width", trackWidth)
								.attr("height", trackHeight)
								.style("fill", "#E26340")
								.style("stroke", "#FFFFFF")
								.style("stroke-width", "1px");
	svgContainer.append("rect")
								.attr("transform", "translate (" + trackWidth + ", " + 0 + ")")
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
				.attr("transform", "translate (" + (trackWidth + (finishWidth / 2) + 10) + ", " + trackHeight / 2 + ") rotate(90)")
				.text("FINISH LINE");

	for (var i = 0, picPos = 5; i < numStudents && picPos < trackHeight; i++, picPos += 60) {
		svgContainer.append("g")
					.append("svg:image")
					.attr("class", "icon")
				   	.attr("href", studentData[i]["icon"])
				   	.attr("width", pictureWidth)
				   	.attr("height", pictureHeight)
				   	.attr("y", picPos);
		appendWrongAnswerCounts(i, picPos)
	}

	svgContainer.selectAll("image")
			    .transition()
			    .duration(1500)
			    .attr("x", function(d, i) {
			   		return horizontalIconLocation(studentData[i]["currentQuestion"], horizontalSpacing, pictureWidth);
			    });

	appendQuestionLabels(numQuestions, svgContainer, horizontalSpacing, trackHeight);
	appendPolylines(svgContainer, trackWidth, trackHeight);	

	function appendWrongAnswerCounts(i, textHeight) {
		svgContainer.append("text")
					.attr("class", "wrongAnswerLabel")
					.attr("text-anchor", "start")
					.style("fill", "#FFFFFF")
					.style("font-weight", "bold")
					.attr("font-size", "18px")
					.text(wrongAnswers[i])
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
	    picNum = i <= 9 ? i : i % 10;
	    filePath = "themes/simple/images/AdventureAnimals/icon" + (picNum + 1) + ".png";
	    studentData.push({
	    	"currentQuestion": data[i],
	    	"icon": filePath
	    });
	}
	return studentData;
}

function appendPolylines(svgContainer, width, height) {
	var currHeight = 60;
	var p1;
	var p2;
	while (currHeight <= height - 30) {
		svgContainer.append("polyline")
					.attr("points", function() {
						p1 = [0, currHeight];
						p2 = [width, currHeight];
						return [p1, p2];
					})
					.style("stroke", "#FFFFFF")
            		.style("stroke-width", "1px");
		currHeight += 60;
	}
}

function appendQuestionLabels(numQuestions, svgContainer, horizontalSpacing, height) {
	var move = [];
	move[1] = height - 25;
	var horizontaslPos = horizontalSpacing / 2;
	var p1, p2;
	for (var i = 0; i < numQuestions; i++) {
		move[0] = horizontaslPos;
		svgContainer.append("text")
					.attr("text-anchor", "middle")
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
						p1 = [horizontaslPos + (horizontalSpacing / 2), 0];
						p2 = [horizontaslPos + (horizontalSpacing / 2), height];
						return [p1, p2];
					})
					.style("stroke", "#FFFFFF")
					.style("stroke-dasharray", ("2,2"));
		horizontaslPos += horizontalSpacing;
	}
}

function calculateVerticalPictureSpacing(numStudents, trackHeight) {
	return trackHeight / (numStudents + 1);
}

function calculateHorizontalPictureSpacing(numQuestions, trackWidth) {
	return trackWidth / (numQuestions);
}