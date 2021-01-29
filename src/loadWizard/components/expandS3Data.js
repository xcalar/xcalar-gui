
/**
 * @deprecated
 */
import prettyBytes from 'pretty-bytes'

export default async function expandS3Data(userSelectedData, setSelectedData, fileIdToFile,  setFileIdToFile) {
    const expandedData = []
    const files = userSelectedData.filter(file => file.type !== 'directory')
    const directories = userSelectedData.filter(file => file.type === 'directory')

    files.forEach(file => {
        expandedData.push(file)
        fileIdToFile[file.fileId] = file
    })
    setFileIdToFile(fileIdToFile)
    setSelectedData(expandedData)

    directories.forEach(async (directory) => {
        const s3Files = await XcalarListFiles({
            "recursive": true,
            "targetName": "AWS Target",
            "path": directory.fileId,
            "fileNamePattern": "*"
        })
        await s3Files.files.forEach(file => {
            const fileObject = {
                fileId: directory.fileId + '/' + file.name,
                directory: file.attr.isDirectory,
                path: file.name,
                sizeInBytes: file.attr.size,
                size: prettyBytes(file.attr.size),
                type: file.name.includes('.') ? file.name.split('.').pop() : 'none'
            }
            expandedData.push(fileObject)
            fileIdToFile[directory.fileId + '/' + file.name] = fileObject
        })


        setFileIdToFile({...fileIdToFile})
        setSelectedData([...expandedData])
    })
}
