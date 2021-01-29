import React from 'react';
import {
    PieChart, Pie, Cell, Label, ResponsiveContainer
} from 'recharts';
import prettyBytes from 'pretty-bytes'

const typeList = {
    "JSON": "#00cf18",
    "CSV": "#4287f5",
    "PARQUET": "#002483",
    "DIRECTORY": "#888",
    "UNSUPPORTED": "#333",
};

export default function BucketChart({fileList}) {
    // Calculate file(size, count) statictics data by types
    const typeCount = {};
    const typeSize = {};
    for (const file of fileList) {
        let fileType = file.type.toUpperCase()
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED";
        }
        if (fileType in typeCount) {
            typeCount[fileType]++;
            typeSize[fileType] += file.sizeInBytes;
        } else {
            typeCount[fileType] = 1;
            typeSize[fileType] = file.sizeInBytes;
        }
    }

    // Chart data for file count by types
    const chartData = [];
    let totalCountOfFiles = 0;
    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
        totalCountOfFiles += typeCount[type];
    }

    // Chart data for file size by types
    const totalCountOfDirectories = typeCount['DIRECTORY'] || 0;
    totalCountOfFiles -= totalCountOfDirectories;

    const chartData2 = [];
    for (const [type, size] of Object.entries(typeSize)) {
        if (type !== 'DIRECTORY') {
            chartData2.push({
                name: type,
                value: size
            });
        }
    }

    return (
        <div className="chartArea">
            <div className="sectionHeader">
                {/* <div>Total number of files: {totalCountOfFiles}</div>
                <div>Total number of directories: {totalCountOfDirectories}</div> */}
                <span>Selected Files/Directories:</span>
            </div>
            <div className="bucketChart">
                <ResponsiveContainer height={300} width="100%">
                    <PieChart height={300}>
                        <Pie
                            dataKey="value"
                            isAnimationActive={false}
                            data={chartData}
                            cx="25%"
                            cy="50%"
                            outerRadius="60%"
                            fill="#8884d8"
                            label={({name, value}) => name + ': ' + value}
                        >
                            <Label position="top">Count</Label>
                            {
                                chartData.map((entry, index) =>
                                    <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                                )
                            }
                        </Pie>
                        <Pie
                            dataKey="value"
                            isAnimationActive={false}
                            data={chartData2}
                            cx="75%"
                            cy="50%"
                            outerRadius="60%"
                            fill="#8884d8"
                            label={({name, value}) => {
                                return name + ': ' + prettyBytes(typeSize[name])
                            }}
                        >
                            <Label position="top">Size</Label>
                            {
                                chartData2.map((entry, index) =>
                                    <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                                )
                            }
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

