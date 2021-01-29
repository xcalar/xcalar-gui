import os
import json
import shutil

from pyquery import PyQuery as pq

class xcalarTags:
    def __init__(self):
        self.hashDict = dict()
        self.helpTopics = dict()
        self.helpTopicArray = []

    def getTagsInFile(self, filepath):
        f = open(filepath, "rb")
        fileString = f.read()
        d = pq(fileString)
        hashTags = d("a.ForCSH")
        title = d("h1").text()
        self.helpTopics[filepath] = title
        for i in range(len(hashTags)):
            # we only want the part after Content/. There are 4 / before that
            finalPath = "/".join(filepath.split("/")[4:])
            self.hashDict[hashTags.eq(i).attr("name")] = finalPath + "#" + hashTags.eq(i).attr("name")

    def getTagsFromFolder(self, rootDir, ext):
        for f in os.listdir(rootDir):
            if os.path.isfile(rootDir+f):
                if f.split(".")[-1] == ext:
                    self.getTagsInFile(rootDir+f)
            elif os.path.isdir(rootDir+f):
                self.getTagsFromFolder(rootDir+f+"/", ext)
        # convert helpTopics to an array
        for key in self.helpTopics:
            self.helpTopicArray.append({"url": key, "title": self.helpTopics[key]})
        return


if __name__ == "__main__":
    newFile = "../js/util/helpHashTags.js"
    hashTagTree = xcalarTags()

    hashTagTree.getTagsFromFolder("../help/user/", "htm")
    d = hashTagTree.hashDict
    # hashTagTree.prettyPrint()
    with open(newFile, "w") as fout:
        fout.write("// THIS FILE IS AUTOGENERATED. DO NOT EDIT!\n")
        fout.write("var csLookup = ")
        fout.write(json.dumps(d, indent=2))
        fout.write(";\n")
        d = []
        for key in hashTagTree.helpTopics:
            d.append({"url": key, "title": hashTagTree.helpTopics[key]})
        fout.write("var helpHashTags = ")
        fout.write(json.dumps(d, indent=2))
        fout.write(";\n")
