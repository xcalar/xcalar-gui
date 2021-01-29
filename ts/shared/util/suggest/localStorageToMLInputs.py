import sqlite3
import json
import datetime
import os
import pdb

import makeSKLearnModel as makeModel

def entryToData(entry):
    entryKey = entry[0]
    entryJSONStr = str(entry[1]).decode("utf-16")
    entryValue = json.loads(entryJSONStr)
    return (entryKey, entryValue)

def parseLocStor():
    LocalStorageDir = "/home/disenberg/.config/google-chrome/Default/Local Storage/"
    HostFileName = "http_lagrange_0.localstorage"
    GetAllKV = "SELECT * FROM ItemTable"
    MLDataPrefix = "MLDataTrain"
    CutOffTime = 1485193857761

    dbPath = os.path.join(LocalStorageDir,HostFileName)
    conn = sqlite3.connect(dbPath)
    c = conn.cursor()

    c.execute(GetAllKV)
    allEntries = c.fetchall()
    parsedValues = []
    mostRecentTime = 0

    for entry in allEntries:
        if entry[0].startswith(MLDataPrefix):
            entryMilliseconds = int(entry[0].lstrip(MLDataPrefix))
            if entryMilliseconds <= CutOffTime:
                continue
            if entryMilliseconds > mostRecentTime:
                mostRecentTime = entryMilliseconds
            parsedKeyValue = entryToData(entry)
            # If want to filter on key name, do so here
            parsedValues.append(parsedKeyValue[1])

    print("Most recent time: " + str(mostRecentTime))

    return parsedValues

def flattenValues(parsedValues):
    # Format of ml value is
    # [ joinDatas ]
    # format of joinDatas is
    # [ clauseData ]
    # format of clauseData is
    # { features, labels, metaData, isValid }
    features = []
    labels = []
    metaData = []
    for joinData in parsedValues:
        for clauseData in joinData:
            for feature, label in zip(clauseData["features"], clauseData["labels"]):
                if not feature:
                    # If feature is null, type mismatch, ignore
                    continue
                tmpMeta = dict(clauseData["metaData"])
                tmpMeta["destColName"] = feature["uniqueIdentifier"]
                tmpFeat = dict(feature)
                del tmpFeat["uniqueIdentifier"]
                if tmpFeat["type"] == "string":
                    tmpFeat["type"] = 1
                else:
                    tmpFeat["type"] = 0
                features.append(tmpFeat)
                labels.append(label)
                metaData.append(tmpMeta)
    return features, labels, metaData

def getLocStorToML():
    parsedValues = parseLocStor()
    features, labels, metaData = flattenValues(parsedValues)
    return features, labels, metaData

def storeFeaturesLabelsMeta(features,labels,metaData):
    SaveLoc = "/tmp/frontEndDataCol"

    curTime = datetime.datetime.now()
    allTogether = {
        "features"        : features,
        "labels"          : labels,
        "metaData"        : metaData,
        "timeOfCollection": str(curTime)
    }
    dataStr = json.dumps(allTogether)
    saveName = "dataCol_" + str(curTime)
    with open(os.path.join(saveLoc, saveName), "w") as f:
        f.write(dataStr)
    return dataStr

if __name__ == "__main__":
    features, labels, metaData = getLocStorToML()
    pdb.set_trace()
    # print(features,labels,metaData)
    # storeFeaturesLabelsMeta(features,labels,metaData)
    # print makeModel.makeRFStr(features, labels)
    makeModel.makeAndAppendModelsTemplate(features, labels)


