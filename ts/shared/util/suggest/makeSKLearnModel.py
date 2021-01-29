import json
import os
import numbers
import datetime
import operator

# File description:
# Generates lightweight decision tree and ensemble models using SKLearn
# Then ports these models into JSON string so that the frontend can
# parse and evaluate the model.
# The ported version is still based on the sklearn internals,
# but inclused significant amounts of metadata mapping variable names
# to feature orderings, and also provides maps for categorical data
# to convert them into one-hot strings.
# Furthermore, provides methods to *explicitly* convert input data with
# each record as dicts to a 2d array as is convention

# TODO: delineate structure out format

# Usage notes:
# This will not be shipped with prod.  It is as script for generating
# and hardcoding learned ML models into the frontend.  It will only
# ever be run in-house.
# Once xcalar-solutions is refactored this will likely be moved there.

import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer


# Iris dataset for testing only
from sklearn.datasets import load_iris

# Hardcode path as script is for in-house dev use only.
XLRGUIDIR = os.getenv('XLRGUIDIR','/var/www/xcalar-gui')
thisPath = XLRGUIDIR + "/assets/js/suggest/"

def getOneHotEncodingFromValues(values):
    """Creates one hot mapping"""
    # Literally creates an identity matrix at the moment.
    # In the future, may switch this infrastructure to
    # numpy vectorizer + numpy onehot encoding
    oneHotArr = [[1 if j == i else 0 for j in range(len(values))]
                 for i in range(len(values))]
    return oneHotArr

def getCategoryMapFromColumn(column):
    # Column should be array-like of string values
    """Returns map from possible values to one hot repr.

    e.g. for column with name "type" and possible values "string" and "int"
    provides a map from "string" -> [0,1] and "int" -> [1,0]
    """
    uniqueValues = np.unique(column)
    oneHotMatrix = getOneHotEncodingFromValues(uniqueValues)
    valueToOneHotMap = {value:arr for (value, arr)
                        in zip(uniqueValues,oneHotMatrix)}
    return valueToOneHotMap

def getOneHotIndices(oneHotMaps):
    # OneHotMap is array of maps to one hot reps
    """returned quantity is indices that features map to when convertedto one-hot.

    E.g. if input data is features ["type", "color"]
    and "type" has values that map to 3 length 1-hot arrays and
    "color" has values that map to 2 length 1-hot arrays then
    outputs [0,3,5]
    """
    oneHotIndices = [0]
    for idx, oneHotMap in enumerate(oneHotMaps):
        oneHotIndices.append(oneHotIndices[idx] + len(oneHotMap.values()[0]))
    return oneHotIndices

def getCategoryMapsFromAllData(catDataFrame, featureOrdering):
    # XCategoricalDict is a pandas dataframe
    """Returns map from feature to categoricalMaps"""
    categoryMaps = {feature:getCategoryMapFromColumn(column)
                    for feature, column in catDataFrame.iteritems()}
    return categoryMaps

def getOneHotRepr(catDataFrame, categoricalMapMeta):
    indicesMap = categoricalMapMeta["oneHotIndicesMap"]
    oneHotMatrix = np.zeros([catDataFrame.shape[0],
                             categoricalMapMeta["reprLength"]])
    for feature, column in catDataFrame.iteritems():
        lowerFieldIdx = indicesMap[feature][0]
        upperFieldIdx = indicesMap[feature][1]
        oneHotMap = categoricalMapMeta["categoricalMaps"][feature]
        for recordIdx, entry in enumerate(column):
            oneHotMatrix[recordIdx, lowerFieldIdx:upperFieldIdx] = \
                oneHotMap[entry]
    return oneHotMatrix

def getOneHotIndicesMap(categoryMaps, featureOrdering):
    # Category maps map from feature to (feature value -> oneHotRepresentation)
    # featureOrdering map from feature to (idx)
    """Returns map from featurename to (lower, upper) indices in final repr

    See getOneHotIndices, similar return quantity.
    """
    oneHotIndicesMap = {}
    # Stores representation length
    reprLength = 0
    sortedFeatures = sorted(categoryMaps.keys(), key=featureOrdering.get)
    for idx, feature in enumerate(sortedFeatures):
        lowIdx = reprLength
        highIdx = lowIdx + len(categoryMaps[feature].values()[0])
        oneHotIndicesMap[feature] = (lowIdx, highIdx)
        reprLength = highIdx
    return oneHotIndicesMap, reprLength

# Currently: if string, assume categorical.  Else assume cts, must be numeric
# NOTE: strings of numbers, e.g. "1", are considered categorical
def isContinuous(value):
    return isinstance(value, numbers.Number)

def isCategorical(value):
    return isinstance(value, basestring)

def getFeatureTypeMap(X):
    # Assume that all features are present in all records (may change)
    # Infer feature types of all from feature types of first record
    """Returns: dict mapping from feature name to featuretype"""
    if not X:
        # Empty dataset
        return {}
    if not X[0]:
        # Empty features in first element
        return {}
    types = {}
    for feature in set(X[0].keys()):
        if isContinuous(X[0][feature]):
            types[feature] = "continuous"
        elif isCategorical(X[0][feature]):
            types[feature] = "categorical"
        else:
            # Unrecognized type
            types[feature] = None
    return types

def checkInputDataValid(X):
    # Takes X as dict list.
    # MUST be done before importing to pandas as pandas will
    # silently gloss over malformatted, inputting NaN or empty,
    # and converting types to lowest common denominator type

    # Hard coded with reason, see large commment below
    ArbitraryMaxCategoricalLabels = 31

    if not X:
        # Empty array
        return True
    types = getFeatureTypeMap(X)
    if not types:
        # TODO: Assert that every element of X is empty
        pass

    categoricalBuckets = {}
    for feature, mlType in types.items():
        if mlType == "continuous":
            categoricalBuckets[feature] = None
        elif mlType == "categorical":
            categoricalBuckets[feature] = set({})
        elif mlType == None:
            print("Unrecognized type.")
            return False
        else:
            # Should _never_ happen.
            print("Type not cts, categorical, or invalid type.")
            return False

    featureSet = set(types.keys())

    for recordDict in X:
        curFeatures = set(recordDict.keys())
        if not featureSet == curFeatures:
            print("Not all records have same features.")
            return False
        for feature in curFeatures:
            if (isContinuous(recordDict[feature]) and
                (types[feature] == "continuous")):
                # feature types match: continuous
                continue
            elif (isCategorical(recordDict[feature]) and
                  (types[feature] == "categorical")):
                # feature types match: categorical
                categoricalBuckets[feature].add(recordDict[feature])
            else:
                # feature types do not match
                print("Feature type not consistent across records.")
                return False

    # Check that categorical features have small numbers of possible labels
    # realistically, this should be < ~10, but RF begins to lose numerical
    # stability at around 32 labels with one-hot encoding
    # depending on implementation (see R RandomForest categorical implement)
    # Math note: because RF picks best features from random feature subset
    # to decide what feature to split on, and one-hot representation turns
    # one feature into many features, naive RF with one-hot is biased towards
    # categorical features with many possible labels.
    for bucket in categoricalBuckets:
        if bucket == None:
            # Continuous random variable
            continue
        else:
            if len(bucket) > ArbitraryMaxCategoricalLabels:
                print("Too many labels for category.")
                return True
    return True

def sortAndOrderFeatures(X):
    """Creates an explicit ordering on all features

    Additionally, puts categorical features last.
    """
    # X here is list of dicts
    if not checkInputDataValid(X):
        print("Invalid input data.")
    typeMap = getFeatureTypeMap(X)
    categorical = set({})
    continuous = set({})
    orderMap = {}
    for feature, mlType in typeMap.items():
        if mlType == "continuous":
            continuous.add(feature)
        elif mlType == "categorical":
            categorical.add(feature)
        else:
            print("Invalid type.")
            return {}
    for idx, feature in enumerate(continuous):
        orderMap[feature] = idx
    categoricalInitIdx = len(continuous)
    for idx, feature in enumerate(categorical):
        orderMap[feature] = categoricalInitIdx + idx
    return orderMap, typeMap, continuous, categorical

def prepModelStr(X, modType):
    # X is list of records represented as dicts
    """Include current time, model type, categorical variable map"""
    timeOnCreate = str(datetime.datetime.now())
    modelType = modType
    orderMap, typeMap, continuous, categorical = sortAndOrderFeatures(X)
    inputMeta = {
        "orderMap"          : orderMap,
        "typeMap"           : typeMap,
        "categoricalMapMeta": None
    }
    # Use pandas to convert list of dict-records to dataframe
    # for easy transposition
    # Note, can use pandas earlier but at a loss of transparency.
    # Purpose of dataframe: turns array of dicts into structure
    # that allows for indexing columns by feature name dictionaries,
    # i.e. can get whole column for a feature by providing the feature
    #      name as key.
    dataFrame = pd.DataFrame(X)
    ctsDataFrame = dataFrame[sorted(list(continuous), key=orderMap.get)]
    catDataFrame = dataFrame[sorted(list(categorical), key=orderMap.get)]
    if categorical:
        categoricalMaps = getCategoryMapsFromAllData(catDataFrame,orderMap)
        oneHotIndicesMap, reprLength = getOneHotIndicesMap(categoricalMaps,
                                                           orderMap)
        categoricalMapMeta = {
            "categoricalMaps" : categoricalMaps,
            "oneHotIndicesMap": oneHotIndicesMap,
            "reprLength"      : reprLength
        }
        inputMeta["categoricalMapMeta"] = categoricalMapMeta

    modelMeta = {
        "timeOnCreate": timeOnCreate,
        "modelType"   : modelType,
        "inputMeta"   : inputMeta
    }
    # only return dataframe to save on computation, should be in sorted order
    return modelMeta, ctsDataFrame, catDataFrame

def prepInputData(modelMeta, ctsDataFrame, catDataFrame):
    overallValues = ctsDataFrame.values
    if (modelMeta["inputMeta"]["categoricalMapMeta"]):
        categoricalMapMeta = modelMeta["inputMeta"]["categoricalMapMeta"]
        overallValues = np.concatenate((overallValues,
                                       getOneHotRepr(catDataFrame,
                                                     categoricalMapMeta)),
                                        axis = 1)
    return overallValues

def exportDT(dtModel):
    """Creates barebones representation from sklearn internal repr"""
    skTree = dtModel.tree_
    skExportObj = {
        "children_left" :skTree.children_left.tolist(),
        "children_right":skTree.children_right.tolist(),
        "feature"       :skTree.feature.tolist(),
        "threshold"     :skTree.threshold.tolist(),
        "value"         :skTree.value.tolist(),
        "node_count"    :skTree.node_count
    }
    return skExportObj

def exportRF(rfModel):
    """Creates barebones representation from sklearn internal repr"""
    skEstimators = []
    for estimator in rfModel.estimators_:
        skEstimators.append(exportDT(estimator))
    skExportObj = {
        "estimators_": skEstimators
    }
    return skExportObj


def hardcodeJSONStr(strIn, strOut, jsFileIn, jsFileOut):
    with open(jsFileIn, 'r') as fileI, open(jsFileOut, 'w') as fileO:
        for line in fileI:
            if line.strip().startswith(strIn):
                # Preserves the surrounding whitespace
                amtWhiteSpaceBef = len(line) - len(line.lstrip())
                amtWhiteSpaceAft = len(line) - len(line.rstrip())
                fileO.write(line[:amtWhiteSpaceBef])
                fileO.write(strOut)
                if (amtWhiteSpaceAft > 0):
                    fileO.write(line[-amtWhiteSpaceAft:])
            else:
                fileO.write(line)

def makeDTStr(X, y):
    modelMeta, ctsDataFrame, catDataFrame = prepModelStr(X, "DecisionTree")
    XProcessed = prepInputData(modelMeta, ctsDataFrame, catDataFrame)
    skModel = DecisionTreeClassifier(random_state=0).fit(XProcessed,y)
    exportObj = {
        "model" : exportDT(skModel),
        "modelMeta": modelMeta
    }
    return json.dumps(exportObj)

def makeRFStr(X, y):
    modelMeta, ctsDataFrame, catDataFrame = prepModelStr(X, "RandomForest")
    XProcessed = prepInputData(modelMeta, ctsDataFrame, catDataFrame)
    skModel = RandomForestClassifier(random_state=0).fit(XProcessed,y)
    exportObj = {
        "model" : exportRF(skModel),
        "modelMeta": modelMeta
    }
    return json.dumps(exportObj)



def makeAndAppendModelsTemplate(X,y):
    # X array of dicts where keys are features, values are
    # feature values, y array of labels
    rfStr = makeRFStr(X,y)
    strIn = "joinModelStr:"
    strOut = "joinModelStr: '" + \
             rfStr + "',"
    jsFileIn = thisPath + "skRFModels.js"
    jsFileOut = thisPath + "skRFModelsTmp.js"
    hardcodeJSONStr(strIn, strOut, jsFileIn, jsFileOut)
    os.rename(jsFileOut, jsFileIn)


def irisToDictarray(iris):
    dictArray = []
    for row in iris.data:
        tempDict = {}
        for idx, field in enumerate(row):
            tempDict[iris.feature_names[idx]] = field
        tempDict["cat1"] = "hehe"
        dictArray.append(tempDict)
    return dictArray

def IrisTest():
    iris = load_iris()
    data = irisToDictarray(iris)
    print makeRFStr(data, iris.target)

if __name__ == "__main__":
    IrisTest()
