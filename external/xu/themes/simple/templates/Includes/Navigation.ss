<nav class="nav-primary">
    <ul>
        <% loop $Menu(2) %>
            <li class="$LinkingMode"><a href="$Link" title="$Title.XML">$MenuTitle.XML</a></li>
            <li class="$LinkingMode"></li>
        <% end_loop %>
        <div class="legal">©2016 Xcalar, Inc.  All rights reserved.</div>
    </ul>
</nav>
