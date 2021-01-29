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
        <div class="logoutButton">
            <i class="icon xi-human"></i>
        </div>
        <div class="userInfo">
            <span class="namePart">$getCurrentUserName</span>
        </div>
        <div id="userMenu" class="menu leftColMenu">
            <ul>
                <li class="userEmail">$getCurrentUserEmail</li>
                <li id="logout" onClick="logout">Log out</li>
                <div class="divider"></div>
                <% loop $Menu(2) %>
                    <% if $Top.displayLink($Link) %>
                        <li class="$LinkingMode">
                            <div class="linkWrapper">
                                <a href="$Link" title="$Title.XML">$MenuTitle.XML</a>
                            </div>
                        </li>
                    <% end_if %>
                <% end_loop %>
            </ul>
        </div>
    </div>
</header>
