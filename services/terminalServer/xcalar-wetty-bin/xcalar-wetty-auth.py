#!/usr/bin/env python3.6

from optparse import OptionParser
import sys
import requests
import os
import tempfile
import http.cookiejar

SCRIPT_DEBUG = False

if SCRIPT_DEBUG:
    from http.client import HTTPConnection
    import logging

    HTTPConnection.debuglevel = 1
    # you need to initialize logging, otherwise
    # you will not see anything from requests
    logging.basicConfig()
    logging.getLogger().setLevel(logging.DEBUG)
    requests_log = logging.getLogger("urllib3")
    requests_log.setLevel(logging.DEBUG)
    requests_log.propagate = True

parser = OptionParser()
parser.add_option("-p", "--protocol", dest="protocol",
                  type="choice", choices=["http", "https"], default="https",
                  help="Xcalar connection PROTOCOL [http|https]",
                  metavar="PROTOCOL")
parser.add_option("-o", "--host", dest="host", default="localhost",
                  help="HOST for Xcalar authentication",
                  metavar="HOST")
parser.add_option("-r", "--port", dest="port",
                  type="int", default=443,
                  help="PORT for Xcalar authentication",
                  metavar="PORT")
parser.add_option("-a", "--path", dest="path", default="/app/login",
                  help="url PATH for Xcalar authentication",
                  metavar="PATH")

(options, args) = parser.parse_args()

if "passvar" not in os.environ:
    print("password is not set")
    sys.exit(1)

passvar_bytes = os.environ['passvar'].encode()

if "uservar" not in os.environ:
    print("username is not set")
    sys.exit(1)

uservar_bytes = os.environ['uservar'].encode()

charset = os.getenv('XCE_LOGIN_CHARSET', 'utf-8')

post_data = None
try:
    post_data = {"xiusername": uservar_bytes.decode(charset),
                 "xipassword": passvar_bytes.decode(charset),
                 "sessionType": "xshell"}
except Exception as e:
    print("pre-auth json conversion failed: {}".format(e))
    sys.exit(1)

auth_resp = None
try:
    url = "{}://{}:{}{}".format(options.protocol,
                                options.host,
                                options.port,
                                options.path)
    auth_resp = requests.post(url,
                              json=post_data,
                              verify=False)
except Exception as e:
    print("authentication command failed: {}", e)
    sys.exit(1)

if auth_resp.status_code != requests.codes.ok:
    print("authentication failure: code {}".format(auth_resp.status_code))
    sys.exit(1)

try:
    auth_status = auth_resp.json()
    # We only save any returned cooikes if auth_status
    # has a member called isValid and it is true.
    # If it is present and False, Xcalar responded but the
    # the request was invalid and the cookies are useless
    # If it is not present at all, something is wrong and
    # a KeyError exception will be raised.
    if auth_status['isValid']:
        (fd, cookie_jar_path) = tempfile.mkstemp()
        os.close(fd)
        cookie_jar = http.cookiejar.LWPCookieJar(cookie_jar_path)
        for cookie in auth_resp.cookies:
            args = dict(vars(cookie).items())
            args['rest'] = args['_rest']
            del args['_rest']
            c = http.cookiejar.Cookie(**args)
            cookie_jar.set_cookie(c)
        cookie_jar.save()

except KeyError as ke:
    print("authentication response was improperly formatted: {}".format(ke))
except Exception as e:
    print("post-auth json conversion failed: {}".format(e))
    sys.exit(1)

if auth_status['isValid']:
    print("true:{}".format(cookie_jar_path))
else:
    print("false:null")
