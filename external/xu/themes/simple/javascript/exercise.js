
window.onload = radios;

function radios() {
    var str = $(".content").text();
    var find = ' ';
    var re = new RegExp(find, 'g');
    str = str.replace(re, '');
    find = '\n';
    re = new RegExp(find, 'g');
    str = str.replace(re, '');
    if (str != "") {
        $(".content").show();
    } else {
        $(".content").hide();
    }
    $("form").find(".radioButton").click(function(event) {
        var radioButton = this;
        var radioButtonGroup = $(radioButton).closest("form").find(".radioButtonGroup");
        var radioButtons = $(radioButton).closest("form").find(".radioButton");
        var question_id = Number($(radioButton).closest("form").find(".questionNumber").text());
        radioButtons.removeClass("active")
                    .removeClass("incorrect");
        $(this).addClass("active");

        var exercise_id = Number($(".exercise").attr("id"));
        var option_id;

        for (var i = 0; i < radioButtons.length; i++) {
            if ($(radioButtons[i]).hasClass("active")) {
                option_id = i + 1;
            }
        }

        $.ajax({
            "type": "POST",
            "data": {
                        "exerciseID": exercise_id,
                        "questionID": question_id,
                        "optionID": option_id
                    },
            "url": "api/submitExercise",
            success: function(data) {
                if (data.indexOf("success") != -1) {
                    console.log("successful")
                    if ($(".exercise").hasClass("showCorrectness")) {
                        $(radioButton).addClass("correct");
                        $(radioButtonGroup).addClass("disabled");
                    }
                } else {
                    console.log("fail")
                    if ($(".exercise").hasClass("showCorrectness")) {
                        $(radioButton).addClass("incorrect");
                    }
                }
            },
            error: function(xhr) {
                console.log(xhr);
                if ($(".exercise").hasClass("showCorrectness")) {
                    $(radioButton).addClass("incorrect");
                }
            }
        });
    });
}



