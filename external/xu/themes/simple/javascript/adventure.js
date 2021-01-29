window.onload = toBottom;

function toBottom()
{
    var element = document.getElementById("main");
    element.scrollTop = element.scrollHeight;

    var progressBar = document.getElementById('progressBar');
    var width = 0;
    var totalQuestionNum = $('div.adventure').data('totalquestion');
    var correctAnswerNum = $('.btn.correct').length;

    width = (correctAnswerNum / totalQuestionNum) * 100;
    progressBar.setAttribute("style","width:" + width + "%");
}

$(document).ready(function() {
    $(document).on('input', '.skipable', function() {
        if (!$(this).val() == "") {
            if ($(this).closest('form').find('button').text() != "SUBMIT") {
                $(this).closest('form').find('button').text("SUBMIT");
            }
        } else {
            if ($(this).closest('form').find('button').text() != "SKIP") {
                $(this).closest('form').find('button').text("SKIP");
                $(this).closest('.entireInput').removeClass("incorrect").addClass("default");
            }
        }
    });
});
