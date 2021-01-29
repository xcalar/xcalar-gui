<!DOCTYPE html>

<!--[if !IE]><!-->
<html lang="$ContentLocale">
<!--<![endif]-->
<!--[if IE 6 ]><html lang="$ContentLocale" class="ie ie6"><![endif]-->
<!--[if IE 7 ]><html lang="$ContentLocale" class="ie ie7"><![endif]-->
<!--[if IE 8 ]><html lang="$ContentLocale" class="ie ie8"><![endif]-->
<head>
  <div class="main_nav">
  	<!--[if lt IE 9]>
  	<script src="//html5shiv.googlecode.com/svn/trunk/html5.js"></script>
  	<![endif]-->
  </div>
  <% require themedCSS('xu') %>
  <% require themedCSS('opensans') %>
  <link rel="shortcut icon" href="$ThemeDir/images/favicon.ico" />
</head>

<body class="$ClassName">
    <div class="main progressPage" id="main" role="main">
        <div id="userStageGraph"></div>
    </div>

<% require javascript('framework/thirdparty/jquery/jquery.js') %>
<% require javascript('framework/thirdparty/d3/d3.min.js') %>
<%-- Please move: Theme javascript (below) should be moved to mysite/code/page.php  --%>
<script type="text/javascript" src="{$ThemeDir}/javascript/studentProg.js"></script>
</body>
</html>
