#TODO
#This file is used to import retina for xcrpc integration test
#It will be deprecated after importRetina api migrated to xcrpc

import json
import argparse

from xcalar.external.LegacyApi.XcalarApi import XcalarApi, XcalarApiStatusException
from xcalar.external.LegacyApi.Session import Session
from xcalar.external.LegacyApi.Retina import Retina
from xcalar.external.client import Client
from xcalar.compute.coretypes.Status.ttypes import StatusT

def main():
    args = get_args()
    userName = args.user_name
    sessionName = args.session_name
    retinaName = args.retina_name
    retinaJson = args.retina_json
    # print('user=<{0}>; session=<{1}>; retina=<{2}>; json=<{3}>'.format(userName, sessionName, retinaName, retinaJson))

    # Setup
    xcalarApi = XcalarApi()
    session = Session(
        xcalarApi,
        "test_session",
        sessionName = sessionName,
        username = userName,
        reuseExistingSession = True)
    xcalarApi.setSession(session)
    retina = Retina(xcalarApi)

    # Import retina
    try:
        retina.add(
            retinaName,
            retinaJsonStr = retinaJson,
            udfUserName = userName,
            udfSessionName = sessionName)
    except XcalarApiStatusException as e:
        if e.status == StatusT.StatusRetinaAlreadyExists:
            retina.delete(retinaName)
            retina.add(
                retinaName,
                retinaJsonStr = retinaJson,
                udfUserName = userName,
                udfSessionName = sessionName)
        else:
            raise e

def get_args():
    parser = argparse.ArgumentParser(
        description="Import retina")
    parser.add_argument(
        "-s",
        "--session",
        dest="session_name",
        help="Session name",
        required=True)
    parser.add_argument(
        "-u",
        "--user",
        dest="user_name",
        help="User name",
        required=True)
    parser.add_argument(
        "-r",
        "--retina",
        dest="retina_name",
        help="Retina name",
        required=True)
    parser.add_argument(
        "-j",
        "--json",
        dest="retina_json",
        help="Retina JSON",
        required=True)

    return parser.parse_args()

if __name__ == '__main__':
    main()