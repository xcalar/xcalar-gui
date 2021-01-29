import * as Path from 'path';
import * as S3Service from './S3Service'


export default function getForensics(bucketName, pathPrefix, metadataMap, statusCallback) {
    let state;
    return fetchForensics();

    async function fetchForensics() {
        const fullPath = Path.join(bucketName, pathPrefix);
        metadataMap.delete(fullPath);
        state = {
            showForensics: true,
            forensicsMessage: ['Fetching S3 metadata ...'],
            isForensicsLoading: true
        };

        statusCallback(state);
        try {
            const finalTableName = await S3Service.createKeyListTable({
                bucketName: bucketName
            });
            state = {
                showForensics: true,
                forensicsMessage: [...state.forensicsMessage, `Query AWS done ${finalTableName}`, "Calculating..."],
                isForensicsLoading: true
            };
            statusCallback(state);
            const stats = await S3Service.getForensicsStats(bucketName, pathPrefix);
            metadataMap.set(fullPath, stats);
            let messages = [...state.forensicsMessage];
            messages.pop();
            messages.push("Calculation done.")
            state = {
                showForensics: true,
                forensicsMessage: messages,
                isForensicsLoading: false
            };
            statusCallback(state);
            clearMessage(2000);
        } catch (e) {
            console.error(e);
            state = {
                showForensics: true,
                forensicsMessage: [...state.forensicsMessage, `Fetch error: ${JSON.stringify(e)}`],
                isForensicsLoading: false
            };
            statusCallback(state);
        }
    }

    function clearMessage(delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                state.forensicsMessage = [];
                statusCallback(state);
                resolve();
            }, delay);
        });
    }

}