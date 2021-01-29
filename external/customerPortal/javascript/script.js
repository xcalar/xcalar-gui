/*
 * jQuery v1.9.1 included
 */

$(document).ready(function() {
  // social share popups
  $(".share a").click(function(e) {
    e.preventDefault();
    window.open(this.href, "", "height = 500, width = 500");
  });

  // toggle the share dropdown in communities
  $(".share-label").on("click", function(e) {
    e.stopPropagation();
    var isSelected = this.getAttribute("aria-selected") == "true";
    this.setAttribute("aria-selected", !isSelected);
    $(".share-label").not(this).attr("aria-selected", "false");
  });

  $(document).on("click", function() {
    $(".share-label").attr("aria-selected", "false");
  });

  // show form controls when the textarea receives focus or backbutton is used and value exists
  var $commentContainerTextarea = $(".comment-container textarea"),
      $commentContainerFormControls = $(".comment-form-controls");

  $commentContainerTextarea.one("focus", function() {
    $commentContainerFormControls.show();
  });

  if ($commentContainerTextarea.val() !== "") {
    $commentContainerFormControls.show();
  }

  // Mark as solved button
  var $requestMarkAsSolvedButton = $(".request-comment-form .comment-container .mark-as-solved:not([data-disabled])"),
    $requestMarkAsSolvedCheckbox = $(".request-comment-form .comment-container input[type=checkbox]"),
    $requestCommentSubmitButton = $(".request-comment-form .comment-container input[type=submit]");

  $requestMarkAsSolvedButton.on("click", function () {
    $requestMarkAsSolvedCheckbox.attr("checked", true);
    $requestCommentSubmitButton.prop("disabled", true);
    $(this).attr("data-disabled", true).closest("form").submit();
  });

  // Change Mark as solved text according to whether comment is filled
  var $requestCommentTextarea = $(".request-comment-form .comment-container textarea");

  $requestCommentTextarea.on("keyup", function() {
    if ($requestCommentTextarea.val() !== "") {
      $requestMarkAsSolvedButton.text($requestMarkAsSolvedButton.data("solve-and-submit-translation"));
      $requestCommentSubmitButton.prop("disabled", false);
    } else {
      $requestMarkAsSolvedButton.text($requestMarkAsSolvedButton.data("solve-translation"));
      $requestCommentSubmitButton.prop("disabled", true);
    }
  });

  // Disable submit button if textarea is empty
  if ($requestCommentTextarea.val() === "") {
    $requestCommentSubmitButton.prop("disabled", true);
  }

  // Submit requests filter form in the request list page
  $("#request-status-select, #request-organization-select")
    .on("change", function() {
      search();
    });

  // Submit requests filter form in the request list page
  $("#quick-search").on("keypress", function(e) {
    if (e.which === 13) {
      search();
    }
  });

  function search() {
    window.location.search = $.param({
      query: $("#quick-search").val(),
      status: $("#request-status-select").val(),
      organization_id: $("#request-organization-select").val()
    });
  }

  // Submit organization form in the request page
  $("#request-organization select").on("change", function() {
    this.form.submit();
  });

  var xcUserName = $("#user-name").text();
   //$("#xcalarFrame").attr("src", "https://zd.xcalar.net/license/api/v1.0/keyshtml/" + xcUserName);
   $("#xcalarFrame").attr("src", "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/keyshtml/" + xcUserName);
  https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/
  var xcUserOrganization = "nobody";
  if (HelpCenter.user.organizations.length > 0) {
    xcUserOrganization = HelpCenter.user.organizations[0].name;
  }

  // Retrieve licenses
  $.support.cors = true;
  //apiEndpoint = "https://zd.xcalar.net/license/api/v1.0/"
  apiEndpoint = "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/"
  url = apiEndpoint + "keysbyorg/" + escape(xcUserOrganization);
  $.ajax({
    "type": "GET",
    "url": url,
    "crossdomain": true,
    "success": function (data) {
      if (data.hasOwnProperty("key")) {
        licenseKeyHtml = ""
        var hasInstallerKey = false;
        var hasAzureKey = false;
        for (var ii = 0; ii < data.key.length; ii++) {
          try {
            licenseKeyHtml += "<div class='licenseKey'>";
            licenseKeyHtml += "<b>License Key Expires: " + data.key[ii].expiration + "</b>";
            licenseKeyHtml += "<div class='licenseKeyBox'>" + data.key[ii].key + "</div>";
            licenseKeyHtml += "</div>";

            if (data.key[ii].deploymentType == 'Azure') {
               hasAzureKey = true;
            }
            if (data.key[ii].deploymentType == 'AWS' || data.key[ii].deploymentType == 'On-Prem') {
               hasInstallerKey = true;
            }
          } catch (error) {
            continue;
          }
        }
        $("#azureLicenses").html(licenseKeyHtml);
        if ((hasAzureKey && hasInstallerKey) || ((!hasAzureKey) && (!hasInstallerKey) && data.hasOwnProperty("key") && (data.key.length > 0))){
          $("#goToMarketplace").show();
          $("#downloadInstaller").show();
        } else {
          if (hasAzureKey) {
           $("#goToMarketplace").show();
          } else {
           $("#goToMarketplace").hide();
          }
          if (hasInstallerKey) {
            if (HelpCenter.user.organizations[0].name == "DCR") {
              $("#downloadInstaller-docker").show();
              $("#downloadInstaller").hide();
            } else {
              $("#downloadInstaller").show();
              $("#downloadInstaller-docker").hide();
            }
          } else {
            $("#downloadInstaller").hide();
          }
          
        }
      }
    },
    "error": function (errorMsg) {
      $("#azureLicenses").text("Failed to retrieve license: " + JSON.stringify(errorMsg))
    }
  });

  function insertionSort(data,attrToSortBy){
    for(var k=1; k < data.length; k++){
       for(var i=k; i > 0 && new Date(data[i][attrToSortBy]) <
         new Date(data[i-1][attrToSortBy]); i--){
          var tmpFile = data[i];
          data[i] = data[i-1];
          data[i-1] = tmpFile;
       }
    }
  }
  // Retrieve Azure deployments
  url = apiEndpoint + "getdeployment/" + escape(xcUserOrganization);
  $.ajax({
    "type": "GET",
    "url": url,
    "crossdomain": true,
    "success": function (data) {
      if (Array.isArray(data) && data.length > 0) {
        azureDeploymentsHtml = "<div class='deployment'><div class='row'><div class='col'>ID</div><div class='col'>URL</div><div class='col'>Copy SAS URI</div><div class='col'>Creation Time</div><div class='col'>Expiry</div></div>";
        //insertionSort(data, "timestamp");
        for (var ii = 0; ii < data.length; ii++) {
          try {
            azureUrl = data[ii].url
            azureDeploymentsHtml += "<div class = 'row'>";
            azureDeploymentsHtml += "<div class = 'col'>" + (ii + 1) + "</div>";
            azureDeploymentsHtml += "<div class='col'><a href=\"" + azureUrl + "\">" + azureUrl + "</a></div>";
            azureDeploymentsHtml += "<div class='col'>";
            if (data[ii].sas_uri) {
              azureDeploymentsHtml += "<span class='copy_uri'>Copy</span><span class='sas_uri' style='display:none'>" + data[ii].sas_uri +"</span>";
            }
            azureDeploymentsHtml += "</div>";
            var creationTS = new Date(data[ii].timestamp)
            var timeStr = (creationTS.getMonth() + 1) + "/" + creationTS.getDate() + "/" + creationTS.getFullYear() + " "
                        + creationTS.getHours() + ":" + (creationTS.getMinutes()<10?"0":"") + creationTS.getMinutes();
            azureDeploymentsHtml += "<div class='col'> " + timeStr + "</div>";
            azureDeploymentsHtml += "<div class='col'> " + data[ii].keyInfo.expiration + "</div>";
            azureDeploymentsHtml += "</div>";
          } catch (error) {
            continue;
          }
        }
        azureDeploymentsHtml += "</div>";
        $("#azureDeployments").html(azureDeploymentsHtml);
      }
    },
    "error": function (errorMsg) {
      $("#azureLicenses").text("Failed to retrieve deployments: " + JSON.stringify(errorMsg))
    }
  });

function copySASUri(sas_uri) {
  var $hiddenInput = $("<input>");
  $("body").append($hiddenInput);
  $hiddenInput.val(sas_uri).select();
  document.execCommand("copy");
  $hiddenInput.remove();
}

  $("#goToMarketplace").on("click", ".copy_uri", function() {
    copySASUri($(this).next('.sas_uri').text());
    $(this).html("Copied!");
    $ele = $(this);
    setTimeout(function() {
      $ele.html("Copy");
    }, 3000);
  });

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' +
                            '([^&;]+?)(&|#|;|$)').exec(location.search) ||
                            [null, ''])[1].replace(/\+/g, '%20')) || null;
}
if (getURLParameter("reason") === "license") {
    $("#request_subject").val("Need to Renew License");
    $("#request_custom_fields_41843327").attr("value", "expired_license");
    $("#request_custom_fields_41843327").next().text("Expired License");
    $("#request_description").attr("placeholder",
         "Please describe your license situation and how you like to proceed.");
}
   });