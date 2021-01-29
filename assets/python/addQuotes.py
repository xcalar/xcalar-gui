import sys

def addQuotes(fname, startLine, endLine):
    print(fname)
    startLine -= 1
    endLine -= 1
    fin = open(fname);
    f = fin.read()
    lines = f.split("\n")
    for i in range(startLine, endLine+1):
        line = lines[i]
        firstNonSpace = len(line) - len(line.lstrip())
        newLine = line[0:firstNonSpace]+"'"
        newLine += line[firstNonSpace:].replace("'", "\'")
        if i < endLine:
            newLine += "' +"
        else:
            newLine += "';"
        lines[i] = newLine;
    fin.close()
    fout = open(fname, "w")
    fout.write("\n".join(lines))
    fout.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: addQuotes.py filename startLineNo(inc) endLineNo(inc)")
    else:
        addQuotes(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))

