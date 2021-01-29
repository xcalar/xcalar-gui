# This is a test result parser for expServer unit tests.
# Give it a path where you want to write the result as a csv file.
import csv
from glob import glob
import os
import sys
def parseResult(filePath):
    keys = ['Filename', 'Cov/Total', 'Pct', 'Over 80%', 'Covered Rows', 'Total Rows', 'Uncovered']
    csvFile = open(filePath, 'wb')
    writer = csv.DictWriter(csvFile, keys)
    writer.writeheader()
    files = [y for x in os.walk('../../services/test/report/lcov-report/services') for y in glob(os.path.join(x[0], '*.js.html'))]
    for filepath in files:
        file = open(filepath, 'r')
        flag = False
        for line in file:
            row = {}
            if 'quiet">Lines' in line:
                flag = True
            elif flag:
                flag = False
                left = line.split('/')[0]
                right = line.split('/')[1]
                left = int(left[left.find('>')+1:])
                right = int(right[:right.find('<')])
                row['Cov/Total'] = str(left) + '/' + str(right)
                row['Pct'] = round(100 * float(left)/right, 2)
                row['Over 80%'] = row['Pct'] >= 80
                row['Covered Rows'] = left
                row['Total Rows'] = right
                row['Uncovered'] = right - left
                row['Filename'] = filepath[filepath[:-11].rfind('/') + 1:-5]
                writer.writerow(row)
        file.close()
    csvFile.close()

parseResult(sys.argv[1])