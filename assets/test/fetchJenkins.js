window.JenkinsTestData = (function(JenkinsTestData) {
    // Fetch parameters for the last build
    JenkinsTestData.getParamsForLastBuild = function() {
        var deferred = jQuery.Deferred();
        $.getJSON('https://jenkins.int.xcalar.com/job/XDTestSuite/api/json/',
        function(json) {
            $.getJSON(json.lastBuild.url+'api/json/', function(json) {
                for (var i = 0; i < json.actions.length; i++) {
                    if (json.actions[i].parameters) {
                        deferred.resolve(json.actions[i].parameters);
                    }
                }
            });
        });
        return deferred.promise();
    };

    // Refresh each user status
    JenkinsTestData.getEachUserStatus = function() {
        var deferred = jQuery.Deferred();
        $.getJSON('https://jenkins.int.xcalar.com/job/XDTestSuite/api/json/',
        function(json) {
            $.get(json.lastBuild.url+'consoleText', function(text) {
                var lines = text.split("\n");
                var numUsers = 0;
                var usersStatus = [];
                var startDate = null;
                var status = null;
                for (var i = 0, len = lines.length; i < len; i++) {

                    if (lines[i].startsWith("/action?name=start")) {
                        items = lines[i].split("&");
                        numUsers = items[items.length-1].split("=")[1];
                    }

                    if (startDate==null && lines[i].startsWith("Test started: ")) {
                        startTime = lines[i].replace("Test started: ", "")
                        startDate = new Date(startTime)
                        for (var j = 0; j < numUsers; j++) {
                            duration = (new Date() - startDate) / 1000;
                            usersStatus[j] = {
                                "status": "Running",
                                "duration": duration,
                                "error": ""
                            };
                        }
                    }

                    if (lines[i].startsWith("User finishes: ")) {
                        statusLine = lines[i].replace("User finishes: ", "");
                        userId = parseInt(statusLine.split(":: ")[0]);
                        statusLine = statusLine.split(":: ")[1];
                        failure = parseInt(statusLine.
                            match(/(?:Fail:)(.+)(?:, Pass:)/)[1]);
                        success = parseInt(statusLine.
                            match(/(?:Pass:)(.+)(?:, Skip:)/)[1]);
                        error = ""
                        if (failure === 0) {
                            status = "Success";
                        } else {
                            status = "Failed";
                            error = statusLine.match(/(?:Error:)(.+)/)[1];
                        }
                        duration = parseFloat(statusLine.
                            match(/(?:Time: )(.+)(?:s)/)[1]);
                        usersStatus[userId] = {
                            "status": status,
                            "duration": duration,
                            "error": error
                        };
                    }
                }

                deferred.resolve(usersStatus);
            });
        });

        return deferred.promise();
    };

    // Historical run data, will return the top 10 results
    JenkinsTestData.getHistoricalRuns = function() {
        var deferred = jQuery.Deferred();
        var numOutstanding = -1;
        $.getJSON('https://jenkins.int.xcalar.com/job/XDTestSuite/api/json/',
        function(json) {
            function parseResults(buildNum) {
                $.get(json.builds[buildNum].url+'consoleText', function(text) {
                    var lines = text.split("\n");
                    var startTime = null;
                    var endTime = null;
                    var durationInSec = null;
                    var totalUsers = 0;
                    var successUsers = 0;
                    for (var i = 0, len = lines.length; i < len; i++) {
                        if (lines[i].startsWith("/action?name=start")) {
                            items = lines[i].split("&");
                            totalUsers = parseInt(items[items.length-1].split("=")[1]);
                        }
                        if (lines[i].startsWith("User finishes: ")) {
                            var failedTest = parseInt(lines[i].
                                match(/(?:Fail:)(.+)(?:, Pass:)/)[1]);
                            if (failedTest == 0) {
                                successUsers += 1;
                            }
                        }
                        if (lines[i].startsWith("Test ended: ")) {
                            endTime = lines[i].replace("Test ended: ", "");
                        }
                        if (lines[i].startsWith("Test started: ")) {
                            startTime = lines[i].replace("Test started: ", "");
                        }
                    }
                    if (startTime != null && endTime != null) {
                        startDate = new Date(startTime);
                        endDate = new Date(endTime);
                        durationInSec = (endDate - startDate) / 1000;
                    }
                    results[buildNum] = {
                        "build":     json.builds[buildNum].number,
                        "successUsers": successUsers,
                        "totalUsers": totalUsers,
                        "start":     startTime,
                        "end":       endTime,
                        "duration":  durationInSec
                    };
                    numOutstanding--;
                    if (numOutstanding === 0) {
                        deferred.resolve(results);
                    }
                });
            }

            var results = [];
            numOutstanding = Math.min(10, json.builds.length);
            for (var i = 0; i < numOutstanding; i++) {
                parseResults(i);
            }
        });
        return deferred.promise();
    };

    function testGetParams() {
        getParamsForLastBuild()
        .then(function(ret) {
            console.log(ret);
        });
    }

    function testGetEachUserStatus() {
        getEachUserStatus()
        .then(function(ret) {
            console.log(ret);
        });
    }

    function testGetHistoricalRuns() {
        getHistorialRuns()
        .then(function(ret) {
            console.log(ret);
        });
    }
    return (JenkinsTestData);
}({}));
