<?php
  function logout() {
    unset($_SESSION["currentUserID"]);
  }
?>

<header class="header" role="banner">
    <div class="headerInner">
        <a  href="$BaseHref" rel="home">
            <img class="logo" src="$ThemeDir/images/logo-white-L.png">
            <div class="siteName">$SiteConfig.Title</div>
        </a>
    </div>
</header>
