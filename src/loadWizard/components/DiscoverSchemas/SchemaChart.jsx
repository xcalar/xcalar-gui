
import React from 'react';
import {
    PieChart, Pie, Cell
} from 'recharts';
import prettyBytes from 'pretty-bytes'

export default function SchemaChart({selectedData, schemasObject}) {

    const typeList = {
        "JSON": "#00cf18",
        "CSV": "#4287f5",
        "PARQUET": "#002483",
        "DIRECTORY": "#888",
        "UNSUPPORTED": "#333",
    }
    const typeCount = {}
    const typeSize = {}
    selectedData.forEach(file => {
        let fileType = file.type.toUpperCase()
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED"
        } 
        if (fileType in typeCount) {
            typeCount[fileType]++;
            typeSize[fileType] += file.sizeInBytes
        } else {
            typeCount[fileType] = 1;
            typeSize[fileType] = file.sizeInBytes
        }
    })

    const countFilesChartData = []
    let totalCountOfFiles = 0
    Object.keys(typeCount).forEach(type => {
        countFilesChartData.push({
            name: type,
            value: typeCount[type]
        })
        totalCountOfFiles += typeCount[type]
    })

    const totalCountOfDirectories = typeCount['DIRECTORY'] || 0
    totalCountOfFiles -= totalCountOfDirectories

    const sizeFilesChartData = []
    Object.keys(typeSize).forEach(type => {
        if (type !== 'DIRECTORY') {
            sizeFilesChartData.push({
                name: type,
                value: typeSize[type]
            })
        }
    })





    const byCountChartData = []
    const bySizeChartData = []
    Object.keys(schemasObject).forEach(schema => {
        byCountChartData.push({
            name: schema,
            value: schemasObject[schema].count
        })
        bySizeChartData.push({
            name: schema,
            value: schemasObject[schema].size
        })
    })

    const colors = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE'];
        
    return (
        <div>
            <div className="chartInfo">
                <div>Total number of files: {totalCountOfFiles}</div>
                <div>Total number of directories: {totalCountOfDirectories}</div>
            </div>
            <div id="SchemaChart">
                <PieChart width={270} height={250}>
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

                <PieChart width={270} height={250}>
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
                </PieChart>


                <PieChart width={270} height={250}>
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

                <PieChart width={270} height={250}>
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
                </PieChart>
            </div>
        </div>
    );
}
