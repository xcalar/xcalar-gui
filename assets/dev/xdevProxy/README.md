**xdev-proxy**
is a NodeJS proxy server which adds CORS headers to the proxied request.

Though being a general-purpose CORS proxy which is able to proxy any cross domain requests
(such as the AJAX calls in Javascript) to any endpoints, xdev-proxy is initially aiming
to help building an XD dev environment where Xcalar frontend(XD) is running locally
and Xcalar backends(SqlDF, XCE, expServer ...) are running somewhere else(such as in a VM).

xdev-proxy is supposed to run on your local machine where you are developing XD.

## How to use it?
1. Configure the proxy(optional)

    Even it's NOT necessary, the host and port are configurable as env variables.
    ```bash
    export XDEV_PROXY_HOST="localhost"
    export XDEV_PROXY_PORT="8899"
    ```
    Any values other than "localhost" for XDEV_PROXY_HOST are not recommended, as the proxy's SSL certification is bound to "localhost".

    Note: If env variables are not set, xdev-proxy will use these default values:
    * XDEV_PROXY_HOST="localhost"
    * XDEV_PROXY_PORT="8899"

2. Run the proxy
    ```bash
    npm install
    npm start
    ```
    If anything go wrong, please see the ***Troubleshooting*** setion.

    Note: port lower than 1024 needs root user priviledge.

3. Setup proxied urls in assets/js/config.js
    ```javascript
    var planServer="https://localhost:8899/https://skywalker.int.xcalar.com:8443/sql";
    ```

4. Visit the planServer URL in your browser

    The browser might prompt a warning message. In Chrome it looks like:
    ```
    Your connection is not private
    Attackers might be trying to steal your information from localhost (for example, passwords, messages, or credit cards). Learn more
    NET::ERR_CERT_AUTHORITY_INVALID
    ```
    Just accept it, so that to let the browser be able to access the proxy. After that you will see a text page about some information of SqlDF service.

5. You are good to go

    Congratulations! You'v finished the xdev-proxy setup. Make sure rebuild the XD and force refresh your browser to pick up the configuration changes. Now you can visit the XD in the way you used to.

## Why we need it?
Before xdev-proxy we have to launch the Chrome browser in the non-web-security mode to send cross domain requests by bypassing CORS limitations. Even with this workaround, it's still annoying to bring up a **special Chrome instance** and do **port forwarding**(ssh -L ...). With xdev-proxy, we can visit a fully functional XD in a normal Chrome w/o port forwarding.

## What's behind it?
[cors-anywhere](https://github.com/Rob--W/cors-anywhere) is backing it up.

## Troubleshooting
1. Starting proxy failed with error: "Error: listen **EADDRNOTAVAIL** 10.10.4.128:8899"

    This happens when localhost is not properly resolved to "127.0.0.1" for some reasons. To solve the issue, add the following line to /etc/hosts
    ```
    127.0.0.1   localhost
    ```
    Note: You may need root priviledge to change this file.

2. Starting proxy failed with error: "Error: listen **EADDRINUSE** 127.0.0.1:8899"

    This happens when the network port is being used by another process in OS. Change the proxy port by setting XDEV_PROXY_PORT, and start the proxy again.

    Tips: In MacOSX, you can find out all ports being used with:
    ```bash
    sudo lsof -iTCP -sTCP:LISTEN -n -P
    ```