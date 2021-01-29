<% v = isCurCtor ? "" : "V" + version %>
<% checkFunc = isCurCtor ? "__isCurrentVersion" : "__isParentVersion"%>
<% assert = isCurCtor ? "xcAssert(__isCurrentVersion(options));" : ""%>
<% addVersion = isCurCtor ? "" : "self.version = version;" %>
(function createConstructors<%= v %>(win) {
    var parentVersion = <%= isCurCtor ? "currentVersion"  : version - 1 %>;
    var version = <%= isCurCtor ? "null" : version %>;

    <% if (isCurCtor) {%>
    var __isCurrentVersion = function(options) {
        return (options == null ||
                options.version == null ||
                options.version === currentVersion);
    };
    <%} else {%>
    var __isParentVersion = function(options) {
        return __isOldVersion(options, version);
    };
    <%}%>  
}(window));
