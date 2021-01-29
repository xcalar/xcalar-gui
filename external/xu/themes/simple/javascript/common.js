$(document).ready(function() {
    $(".logoutButton").click(function() {
        $("#userMenu").show();
    });
    $(".btn").click(function() {
        $(this).addClass("pending");
        if ($(this).text() == "SUBMIT") {
            $(this).text("SUBMITTING...");
        } else {
            $(this).text("SKIPPING...");
        }
    });
    $(document).click(function(event) {
        if ($(event.target).closest("#userMenu").length == 0 && $(event.target).closest(".logoutButton").length == 0) {
            $("#userMenu").hide();
        }
    });
    $("#logout").click(logout);

    function logout() {
        $.ajax({
            "type": "POST",
            "url": "api/logout",
            success: function(data) {
                window.location.href = "https://xcalar.com/xu/";
            },
            error: function(xhr) {
                window.location.href = "https://xcalar.com/xu/";
            }
        });
    }
});