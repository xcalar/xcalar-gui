
import React from 'react';
import {
    PieChart, Pie, Cell
} from 'recharts';
import prettyBytes from 'pretty-bytes'

export default function SchemaChart({selectedData, schemasFileMap, discoverStats}) {

    const typeList = {
        "JSON": "#00cf18",
        "CSV": "#4287f5",
        "PARQUET": "#002483",
        "DIRECTORY": "#888",
        "UNSUPPORTED": "#333",
    };
    const typeCount = {};
    const typeSize = {};
    selectedData.forEach(file => {
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
    });

    const countFilesChartData = []
    let totalCountOfFiles = 0
    Object.keys(typeCount).forEach(type => {
        countFilesChartData.push({
            name: type,
            value: typeCount[type]
        });
        totalCountOfFiles += typeCount[type];
    });

    const totalCountOfDirectories = typeCount['DIRECTORY'] || 0;
    totalCountOfFiles -= totalCountOfDirectories;
    const sizeFilesChartData = [];
    Object.keys(typeSize).forEach(type => {
        if (type !== 'DIRECTORY') {
            sizeFilesChartData.push({
                name: type,
                value: typeSize[type]
            });
        }
    });

    const schemaMap = new Map();
    schemasFileMap.forEach((val, path) => {
        let schemaInfo = schemaMap.get(val.name);
        if (schemaInfo == null) {
            schemaInfo = { path: [], columns: val.columns };
            schemaMap.set(val.name, schemaInfo);
        }
        schemaInfo.path.push(path);
    });

    const byCountChartData = []
    const bySizeChartData = [];

    schemaMap.forEach((val, key) => {
        byCountChartData.push({
            name: key,
            value: val.path.length
        });
    });
    byCountChartData.sort((a, b) => {
        if (a.value < b.value) {
            return 1;
        } else {
            return -1;
        }
    });
    let limit = 10;
    let numSchemas = byCountChartData.length;
    if (byCountChartData.length > limit) {
        let other = 0;
        for (let i = limit; i < numSchemas; i++) {
            other += byCountChartData[i].value;
        }
        let numNotListed = numSchemas - limit;
        byCountChartData.length = limit;
        byCountChartData.push({
            name: "other (" + numNotListed + " schemas)",
            value: other
        });
    }

    const colors = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

    return (
        <div>
            <SchemaStats {...discoverStats} />
            <div id="SchemaChart">
                <PieChart width={280} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={countFilesChartData}
                        cx={135}
                        cy={100}
                        outerRadius={40}
                        fill="#8884d8"
                        label={({name, value}) => name + ': ' + value}
                    >
                        {
                            countFilesChartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>

                {/* <PieChart width={250} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={sizeFilesChartData}
                        cx={135}
                        cy={100}
                        outerRadius={40}
                        fill="#8884d8"
                        label={({name, value}) => {
                            return name + ': ' + prettyBytes(typeSize[name])
                        }}
                    >
                        {
                            sizeFilesChartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart> */}


                <PieChart width={280} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={byCountChartData}
                        cx={135}
                        cy={100}
                        outerRadius={40}
                        fill="#8884d8"
                        label={({name, value}) => {
                            return name + ': ' + value
                        }}
                    >
                        {
                            byCountChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)
                        }
                    </Pie>
                </PieChart>

                {/* <PieChart width={270} height={250}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={bySizeChartData}
                        cx={135}
                        cy={100}
                        outerRadius={40}
                        fill="#8884d8"
                        label={({name, value}) => {
                            return name + ': ' + prettyBytes(value)
                        }}
                    >
                        {
                            bySizeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)
                        }
                    </Pie>
                </PieChart> */}
            </div>
        </div>
    );
}

function SchemaStats(props) {
    const {
        isLoading = false,
        numFiles = null,
        numSchemas = null,
        numFailed = null
    } = props || {};

    const title = isLoading
        ? 'Summary ... Loading Data'
        : 'Summary';

    return (
        <div className="chartInfo">
            <div className="schemaSummaryHeader">{title}</div>
            { numFiles == null ? null : <div>Discovered files: {Number(numFiles).toLocaleString()}</div> }
            { numSchemas == null ? null: <div>Discovered schemas: {Number(numSchemas).toLocaleString()}</div> }
            { numFailed == null ? null: <div>Failed discovery: {Number(numFailed).toLocaleString()}</div> }
        </div>
    );
}