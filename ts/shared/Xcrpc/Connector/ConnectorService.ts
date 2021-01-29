import { ConnectorsService as ApiConnectors, XceClient as ApiClient } from 'xcalar'
import {parseError} from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

type File = {
    name: string,
    isDirectory: boolean,
    mtime: number,
    size: number
};

const DEFAULT_BATCHSIZE = 1000;

class ConnectorService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    public async listFiles(params: {
        targetName: string,
        path: string,
        fileNamePattern: string,
        isRecursive: boolean,
        pageToken?: string
    }): Promise<{
        files: Array<File>,
        hasNext: boolean,
        nextToken: string
    }> {
        try {
            const { targetName, path, fileNamePattern, isRecursive, pageToken } = params;
            const isPaged = pageToken != null;

            const dataSourceArgs = new ProtoTypes.Connectors.DataSourceArgs();
            dataSourceArgs.setTargetname(targetName);
            dataSourceArgs.setPath(path);
            dataSourceArgs.setFilenamepattern(fileNamePattern);
            dataSourceArgs.setRecursive(isRecursive);
            const request = new ProtoTypes.Connectors.ListFilesRequest();
            request.setSourceargs(dataSourceArgs);
            request.setPaged(isPaged);
            request.setContinuationtoken(pageToken);

            const apiConnector = new ApiConnectors(this._apiClient);
            const response = await apiConnector.listFiles(request);
            const nextToken = response.getContinuationtoken();

            return {
                files: response.getFilesList().map((file) => ({
                    name: file.getName(),
                    isDirectory: file.getIsdir(),
                    mtime: file.getMtime(),
                    size: file.getSize()
                })),
                hasNext: nextToken.length > 0,
                nextToken: nextToken
            }
        } catch(e) {
            throw parseError(e);
        }
    }

    public async * listFilesIterator(params: {
        targetName: string,
        path: string,
        fileNamePattern: string,
        isRecursive: boolean,
        batchSize?: number
    }) {
        const { targetName, path, fileNamePattern, isRecursive, batchSize = DEFAULT_BATCHSIZE } = params;

        let fileBuf: Array<File> = [];
        let pageToken = '';
        while (pageToken != null) {
            // Fetch more files
            const fetchResult = await this.listFiles({
                targetName: targetName,
                path: path,
                fileNamePattern: fileNamePattern,
                isRecursive: isRecursive,
                pageToken: pageToken
            });
            pageToken = fetchResult.hasNext
                ? fetchResult.nextToken
                : null;

            // Append files to buffer
            fileBuf = [...fileBuf, ...fetchResult.files];

            // Consume the files in the buffer batch by batch
            while (fileBuf.length >= batchSize) {
                const result: Array<File> = [];
                while (result.length < batchSize) {
                    result.push(fileBuf.shift());
                }
                if (fileBuf.length == 0 && pageToken == null) {
                    return result;
                } else {
                    yield result;
                }
            }
        }

        if (fileBuf.length > 0) {
            return [...fileBuf];
        }
    }
}

export { ConnectorService, File }