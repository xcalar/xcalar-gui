var jsFile;
var pyFile;
var shFile;
addGeneralListeners();
extMgmtSetup();

function extMgmtSetup() {
    $(".section").hide();
    fetchData();
}
function addGeneralListeners() {
    $(document).ready(function() {
        $('select').material_select();
    });
    $("#extMgmtMenu").on("click", function() {
        $(".section").hide();
        $(".extMgmt").show();
    });
    $("#extUpMenu").on("click", function() {
        $(".section").hide();
        if (infoComplete()) {
            $("#upload").removeClass("disabled");
        } else {
            $("#upload").addClass("disabled");
        }
        $(".extUploader").show();
        $("#uploadFailure").hide();
    });
    $("#jsBtn").on("click", function() {
        $("#jsFile").click();
    });
    $("#jsFile").on("change", function(e) {
        jsFile = e.target.files[0];
        setExtName(jsFile);
    });
    $("#pyBtn").on("click", function() {
        $("#pyFile").click();
    });
    $("#pyFile").on("change", function(e) {
        pyFile = e.target.files[0];
        setExtName(pyFile);
    });
    $("#shBtn").on("click", function() {
        $("#shFile").click();
    });
    $("#shFile").on("change", function(e) {
        shFile = e.target.files[0];
        setExtName(shFile);
    });
    $(".extUploader #imgSelect,.file-input").on("change", function() {
        if (infoComplete()) {
            $("#upload").removeClass("disabled");
        } else {
            $("#upload").addClass("disabled");
        }
    })
    $(".extUploader input,#description").on("input", function() {
        if (infoComplete()) {
            $("#upload").removeClass("disabled");
        } else {
            $("#upload").addClass("disabled");
        }
    });
    $("#upload").on("click", function(e) {
        e.preventDefault();
        submitForm();
    });
}
function setExtName(fileName) {
    if (fileName) {
        var appName = fileName.name.split(".").slice(0, 1);
        $("#appName").val(appName).trigger("change");
    }
}
function infoComplete() {
    var complete = true;
    if (!$("#description").val()) {
        complete = false;
    }
    if (!$("option:selected").val()) {
        complete = false;
    }
    $(".extUploader input:not(#website)").each(function() {
        if (!$(this).val()) {
            complete = false;
        }
    });
    $(".extUploader .file-input").each(function() {
        if($(this)[0].files.length < 1) {
            complete = false;
        }
    });
    return complete;
}
// read file and add the new field to the form
function readFile(file, isText) {
    var deferred = jQuery.Deferred();
    var reader = new FileReader();

    reader.onload = function(evt) {
        var fileText = evt.target.result;
        if (!isText) {
            fileText = btoa(fileText);
        }
        deferred.resolve(fileText);
    }

    reader.onerror = function() {
        deferred.reject();
    }

    if (file) {
        if (isText) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    } else {
        deferred.reject();
    }

    return deferred.promise();
}
function submitForm() {
    $("#uploadFailure").hide();
    // get the names of the js file and py file being provided
    var jsName = $("#jsFilePath").val();

    var pyName = $("#pyFilePath").val();

    var shName = $("#shFilePath").val();

    var jsFilePromise = readFile(jsFile, true);
    var pyFilePromise = readFile(pyFile, true);
    var shFilePromise = readFile(shFile, true)

    jQuery.when(jsFilePromise, pyFilePromise, shFilePromise)
    .then(function(jsFileText, pyFileText, shFileText) {
        var extension = {
            "appName": $("#appName").val(),
            "version": $("#version").val(),
            "description": $("#description").val(),
            "main": $("#main").val(),
            "author": $("#author").val(),
            "category": $("#category").val(),
            "jsFileText": jsFileText,
            "pyFileText": pyFileText,
            "shFileText": shFileText,
            "imageName": $("option:selected").val(),
            "website": $("#website").val()
        }
        $("#upload").addClass("disabled pulse");
        $.ajax({
            "type": "POST",
            "data": JSON.stringify(extension),
            "contentType": "application/json",
            "url": "/extension/publish",
            "async": true,
            success: function() {
                $("#upload").removeClass("disabled pulse");
                addExtensionToRow(extension);
                addRowListeners(extension.appName);
                cleanUp();
            },
            error: function() {
                $("#upload").removeClass("disabled pulse");
                $("#uploadFailure").show();
            }
        });
    })
    .fail(function() {

    });
}
function cleanUp() {
    $(".extUploader input").val("");
    $("#description").val("");
    $(".extUploader option:disabled").prop("selected");
}
function addRowListeners(id) {
    var downloadEle = ".download";
    var deleteEle = ".delete";
    var editEle = ".edit";
    if (id) {
        var downloadEle = "#" + id + " " + downloadEle;
        var deleteEle = "#" + id + " " + deleteEle;
        var editEle = "#" + id + " " + editEle;
    }
    $(downloadEle).on("click", function() {
        var btn = $(this);
        var appName= btn.parent().parent().prop("id");
        var version= btn.parent().parent().find(".version").text();
        var url ="/extension/download?appName="+appName+"&&version="+version;
        window.open(url);
    });
    $(deleteEle).on("click", function() {
        var btn = $(this);
        var extension = {
            appName: btn.parent().parent().prop("id"),
            version: btn.parent().parent().find(".version").text()
        }
        if(confirm("Do you want to delete " + extension.appName + "-" + extension.version)) {
            $.ajax({
                "type": "DELETE",
                "data": JSON.stringify(extension),
                "contentType": "application/json",
                "url": "/extension/delete",
                "async": true,
                success: function() {
                    var id = "#" + extension.appName;
                    $(id).remove();
                },
                error: function(error) {
                    console.log(error);
                }
            });
        }
    });
    $(editEle).on("click", function() {
        var btn = $(this);
        var appName = btn.parent().parent().find(".appName").text();
        var version = btn.parent().parent().find(".version").text();
        var main = btn.parent().parent().find(".main").text();
        var author = btn.parent().parent().find(".author").text();
        var category = btn.parent().parent().find(".category").text();
        var description = btn.parent().parent().find(".description").text();
        var website = btn.parent().parent().find(".website").text();
        $("#extUpMenu").click();
        $("#appName").val(appName).trigger("change");
        $("#version").val(version).trigger("change");
        $("#category").val(category).trigger("change");
        $("#main").val(main).trigger("change");
        $("#author").val(author).trigger("change");
        $("#description").val(description).trigger("change").trigger('autoresize');
        $("#website").val(website).trigger("change");
    });
}
function fetchData() {
    $.ajax({
        "type": "GET",
        "dataType": "JSON",
        "url":  "/extension/list",
        "success": function(data) {
            try {
                var d = data;
                listExtensions(d);
            } catch (error) {
                console.log(error);
            }
        },
        "error": function(error) {
            console.log(error);
        }
    });
}
function addExtensionToRow(extension) {
    var downBtn = "<a class='btn-floating waves-effect waves-light download'>" +
                     "<i class='material-icons'>cloud_download</i></a>";
    var delBtn = "<a class='btn-floating waves-effect waves-light delete'>" +
                 "<i class='material-icons'>delete</i></a>";
    var editBtn = "<a class='btn-floating waves-effect waves-light edit'>" +
                 "<i class='material-icons'>edit</i></a>";
    var row = "<tr id='" + extension.appName + "'>" +
              "<td class='appName'>" + extension.appName + "</td>"+
              "<td class='main'>" + extension.main + "</td>" +
              "<td class='version'>" + extension.version + "</td>" +
              "<td class='author'>" + extension.author + "</td>" +
              "<td class='category'>" + extension.category + "</td>" +
              "<td>" + downBtn + delBtn + editBtn + "</td>" +
              "<td class='description'>" + extension.description + "</td>" +
              "<td class='website'>" + extension.website + "</td></tr>";
    $(".extMgmt").find("tbody:last").append(row);
    $(".extMgmt .description").hide();
    $(".extMgmt .website").hide();
}
function listExtensions(extensions) {
    $(".extMgmt").find("tbody").html("");
    extensions = extensions || [];

    for (var i = 0, len = extensions.length; i < len; i++) {
        addExtensionToRow(extensions[i]);
    }
    addRowListeners();
}
