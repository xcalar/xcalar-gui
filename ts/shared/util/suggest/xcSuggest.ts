namespace xcSuggest { // = (function($, xcSuggest) {
    /* General workflow:
     * 1.) Some ML setting gets most raw form of data possible
     * 2.) ML setting processes those inputs into features for the ML platform
     * 2a.) The features must also contain a reserved field "uniqueIdentifier"
     *      which uniquely identifies the result we select
     * 3.) ML engine evaluates the model for that setting on the features
     * 4.) ML setting returns the unique identifier and score
     *
    */

    export interface ColInfo {
        type: string;
        length: number;
        uniqueIdentifier: string;
        tableId: string;
        name: string;
        data: string[];
    }

    export interface ColInput {
        srcColInfo: ColInfo;
        destColsInfo: ColInfo[];
    }

    export interface ContextInfo {
        max: number;
        min: number;
        avg: number;
        sig2: number;
        vals: string[];
    }

    export interface Feature {
        maxDiff: number;
        minDiff: number;
        avgDiff: number;
        sig2Diff: number;
        type: string;
        match: number;
        titleDist: number;
        uniqueIdentifier: string;
    }

    export interface ColSuggest {
        colToSugg: string;
        maxScore: number;
    }

    export interface MetaData {
        srcColName: string;
        timeOfJoin: string;
    }

    export interface InputData {
        labels: number[];
        features: Feature[];
        metaData: MetaData;
        isValid: boolean;
    }

    export interface Prediction {
        score: number;
        classIdx: number;
    }

    let MLEngine;
    // Turn off ML Engine
    const useEngine: boolean = true;

    /**
     * xcSuggest.setup
     */
    export function setup(): boolean {
        MLEngine = skRFPredictor;
        MLEngine.setup();
        return true;
    }

    /**
     * Takes column inputs and suggests which field the tables should be joined on
     *  @param inputs
     */
    export function suggestJoinKey(inputs: ColInput): ColSuggest {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column as strings
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty

        // For now, the ML and heuristic both use the same features.
        const featuresPerColumn: Feature[] = processJoinKeyInputs(inputs);
        let suggestResults: ColSuggest;
        if (useEngine) {
            try {
                suggestResults = suggestJoinKeyML(featuresPerColumn);
                if (suggestResults.maxScore <= -50) {
                    console.log("ML Engine scores poorly: " +
                                JSON.stringify(suggestResults) +
                                "\nSwitching to heuristic.");
                    suggestResults = undefined;
                }
            } catch (err) {
                console.error("ML Engine failed with error: " + err +
                                "\nSwitching to heuristic.");
                suggestResults = undefined;
            }
        }

        if (suggestResults === undefined) {
            suggestResults = suggestJoinKeyHeuristic(featuresPerColumn);
        }
        return suggestResults;
    }

    /**
     * Takes the column inputs and returns an object containing all relevant data needed in
     * suggesting a join key by different methods
     *  @param joinKeyInputs
     *  @param curDestBackName
     */
    export function processJoinKeyData(joinKeyInputs: ColInput, curDestBackName: string): InputData {
        let mlInputData: InputData = <InputData>{};
        const inputFeatures: Feature[] = processJoinKeyInputs(joinKeyInputs);

        addSuggestFeatures(mlInputData, inputFeatures);
        addSuggestLabels(mlInputData, curDestBackName);
        addMetaData(mlInputData, joinKeyInputs);
        addIsValid(mlInputData);
        return mlInputData;
    }

    /**
     * Calls processJoinKeyInputsHeuristic which Returns an array
     *  of features about each column in the destination table.
     * @param inputs
     */
    function processJoinKeyInputs(inputs: ColInput): Feature[] {
        // For now this is a shallow cover, this will change once heuristic
        // and ML use different features
        return processJoinKeyInputsHeuristic(inputs);
    }

    /**
     * Returns an array of features about each column in the destination table.
     * @param inputs
     */
    function processJoinKeyInputsHeuristic(inputs: ColInput): Feature[] {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty
        const srcColInfo: ColInfo = inputs.srcColInfo;
        const type: string = srcColInfo.type;

        const srcContext: ContextInfo = contextCheck(srcColInfo);
        let featuresPerColumn: Feature[] = [];
        for (let i = 0; i < inputs.destColsInfo.length; i++) {
            let curColInfo: ColInfo = inputs.destColsInfo[i];
            // 0 is rowMarker
            if (curColInfo.type === type) {
                if (srcColInfo.uniqueIdentifier === curColInfo.uniqueIdentifier &&
                    srcColInfo.tableId === curColInfo.tableId) {
                    featuresPerColumn.push(null);
                    continue;
                }

                let destContext: ContextInfo = contextCheck(curColInfo);
                let match: number = 0;
                let maxDiff: number;
                let minDiff: number;
                let avgDiff: number;
                let sig2Diff: number;
                let titleDist: number;
                if (type === "string") {
                    let bucket: object = {};
                    let bucket2: object = {};
                    let words: object = {};

                    // Note: current way is hash each char and count frequency
                    // change it if you have better way!
                    srcContext.vals.forEach(function (value) {
                        for (let i = 0; i < value.length; i++) {
                            bucket[value.charAt(i)] = true;
                        }

                        words[value] = words[value] || 0;
                        words[value]++;
                    });

                    destContext.vals.forEach(function (value) {
                        for (let i = 0; i < value.length; i++) {
                            bucket2[value.charAt(i)] = true;
                        }
                        // when has whole word match
                        if (words.hasOwnProperty(value)) {
                            match += 10 * words[value];
                        }
                    });

                    for (let c in bucket2) {
                        if (bucket.hasOwnProperty(c)) {
                            if (/\W/.test(c)) {
                                // special char, high weight
                                match += 10;
                            } else {
                                match += 1;
                            }
                        }
                    }
                    maxDiff = Math.abs(srcContext.max - destContext.max);
                    minDiff = Math.abs(srcContext.min - destContext.min);
                    avgDiff = Math.abs(srcContext.avg - destContext.avg);
                    sig2Diff = Math.abs(srcContext.sig2 - destContext.sig2);
                } else {
                    // Type is number
                    maxDiff = calcSim(srcContext.max, destContext.max);
                    minDiff = calcSim(srcContext.min, destContext.min);
                    avgDiff = calcSim(srcContext.avg, destContext.avg);
                    sig2Diff = calcSim(srcContext.sig2, destContext.sig2);
                }

                titleDist = getTitleDistance(srcColInfo.name, curColInfo.name);

                featuresPerColumn.push({
                    "maxDiff": maxDiff,
                    "minDiff": minDiff,
                    "avgDiff": avgDiff,
                    "sig2Diff": sig2Diff,
                    "match": match,
                    "titleDist": titleDist,
                    "type": type,
                    "uniqueIdentifier": curColInfo.uniqueIdentifier
                });
            } else {
                featuresPerColumn.push(null);
            }
        }
        return featuresPerColumn;
    }

    /**
     * Suggests which column should be used as a join key.
     * Also returns its degree of certainty
     * @param featuresPerColumn
     */
    function suggestJoinKeyML(featuresPerColumn: Feature[]): ColSuggest {
        let colToSugg: string = null;
        // only score that more than 0 will be suggested, can be modified
        let maxScore: number = 0;

        for (let i = 0; i < featuresPerColumn.length; i++) {
            let curFeatures: Feature = featuresPerColumn[i];
            if (curFeatures !== null) {
                // No type mismatch
                let prediction: Prediction = MLEngine.predict(MLSetting.SuggestJoinKey,
                    curFeatures);
                let score: number;
                if (prediction.classIdx === 1) {
                    score = prediction.score;
                } else {
                    // Prediction.classIdx must be 0
                    score = 1 - prediction.score;
                }
                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curFeatures.uniqueIdentifier;
                }
            }
        }

        // Because suggestJoinKey expects score on range of integers
        // And the threshold is -50, change the score of this algorithm to
        // be on range of -100 to 0

        return {
            'colToSugg': colToSugg,
            'maxScore': (maxScore * 100) - 100
        };
    }

    /**
     * Suggests which column should be used as a join key.
     * Also returns its degree of certainty
     * @param featuresPerColumn
     */
    function suggestJoinKeyHeuristic(featuresPerColumn: Feature[]): ColSuggest {
        // Inputs has fields srcColInfo and destColsInfo
        // srcColInfo is valid colInfo and destColsInfo is array of valid colInfo
        // valid colInfo has type, name, and data fields, where data is an array
        // of the text contents of the HTML column
        // Requires: inputs.srcCol is filled with info from valid col
        // Requires: inputs.destCol is an array, but can be empty
        let colToSugg: string = null;

        // only score that more than -50 will be suggested, can be modified
        let maxScore: number = (-Number.MAX_VALUE);

        for (let i = 0; i < featuresPerColumn.length; i++) {
            let curFeatures: Feature = featuresPerColumn[i];
            if (curFeatures !== null) {
                let score: number = getScore(curFeatures);
                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curFeatures.uniqueIdentifier;
                }
            }
        }

        let returnObj: ColSuggest = {
            "colToSugg": colToSugg,
            "maxScore": maxScore
        };
        return returnObj;
    }

    /**
     * Finds data about the column's data to give context to calculations in other functions
     * @param requiredInfo
     */
    function contextCheck(requiredInfo: ColInfo): ContextInfo {
        // only check number and string
        const type: string = requiredInfo.type;
        const data: string[] = requiredInfo.data;
        if (type !== ColumnType.integer && type !== ColumnType.float &&
            type !== ColumnType.string) {
            return { "max": 0, "min": 0, "avg": 0, "sig2": 0, "vals": [] };
        }

        // Number min value provides smallest absolute value number, e.g.
        // 5e-352 or something similar.  Take negative of max value for true min.
        // Otherwise this script breaks on negative numbers.
        let max: number = (-Number.MAX_VALUE);
        let min: number = Number.MAX_VALUE;
        let total: number = 0;
        let datas: number[] = [];
        let values: string[] = [];
        let val: string;

        for (let i = 0; i < data.length; i++) {
            val = data[i];

            let d: number;
            // this is on purpose to compare with null
            if (val === null || val === "") {
                // skip empty value
                continue;
            }

            if (type === "string") {

                d = val.length; // for string, use its length as metrics
            } else {
                d = Number(val);
            }

            values.push(val);
            datas.push(d);
            max = Math.max(d, max);
            min = Math.min(d, min);
            total += d;
        }

        if (values.length === 0) {
            return { "max": 0, "min": 0, "avg": 0, "sig2": 0, "vals": [] };
        }

        const count: number = datas.length;
        const avg: number = total / count;
        let sig2: number = 0;

        for (let i = 0; i < count; i++) {
            sig2 += Math.pow((datas[i] - avg), 2);
        }

        return {
            "max": max,
            "min": min,
            "avg": avg,
            "sig2": sig2,
            "vals": values
        };
    }

    /**
     * Performs weighted calculations for each feature to determine it's score
     * @param curFeatures
     */
    function getScore(curFeatures: Feature): number {
        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative
        let score: number = 0;

        if (curFeatures.type === "string") {
            // for string compare absolute value
            score += curFeatures.match * 3;
            score += curFeatures.maxDiff * -1;
            score += curFeatures.minDiff * -1;
            score += curFeatures.avgDiff * -2;
            score += curFeatures.sig2Diff * -5;
            score += curFeatures.titleDist * -7;
        } else {
            // a base score for number,
            // since limit score to pass is -50
            const match: number = 20;
            // for number compare relative value
            score += match * 3;
            score += curFeatures.maxDiff * -8;
            score += curFeatures.minDiff * -8;
            score += curFeatures.avgDiff * -16;
            score += curFeatures.sig2Diff * -40;
            score += curFeatures.titleDist * -7;
        }
        return score;
    }

    /**
     * Calculates the similarity between two numbers
     * @param a
     * @param b
     */
    function calcSim(a: number, b: number): number {
        const diff: number = a - b;
        const sum: number = a + b;

        if (sum === 0) {
            if (diff === 0) {
                // when a === 0 and b === 0
                return 0;
            } else {
                // a = -b, one is positive and one num is negative
                // no similarity
                return 1;
            }
        }
        // range is [0, 1), more close to 0, similar
        return Math.abs(diff / sum);
    }

    /**
     * determines how similar two column names are
     * @param name1
     * @param name2
     */
    function getTitleDistance(name1: string, name2: string): number {
        if (name1.startsWith("column") || name2.startsWith("column")) {
            // If any column has auto-generated column name, then do not check
            // TODO: Change this, otherwise prefers autogenerated labels over other
            return 0;
        }

        name1 = xcHelper.parsePrefixColName(name1.toLowerCase()).name;
        name2 = xcHelper.parsePrefixColName(name2.toLowerCase()).name;
        if (name1 === name2) {
            // same name
            return 0;
        } else if ((name1.startsWith(name2) || name2.startsWith(name1)) &&
            (name1 !== "" && name2 !== "")) {
            // which means the name is quite related
            return 2;
        }

        const distArray: number[][] = levenshteinenator(name1, name2);
        const len: number = distArray.length;
        const dist: number = distArray[len - 1][distArray[len - 1].length - 1];
        return (dist);

        // http://andrew.hedges.name/experiments/levenshtein/levenshtein.js
        /**
         * @param String a
         * @param String b
         * @return Array
         */
        function levenshteinenator(a: string, b: string): number[][] {
            let cost: number;
            let m: number = a.length;
            let n: number = b.length;

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever
            // that is
            if (m < n) {
                const c: string = a; a = b; b = c;
                const o: number = m; m = n; n = o;
            }

            let r: number[][] = []; r[0] = [];
            for (let c = 0; c < n + 1; ++c) {
                r[0][c] = c;
            }

            for (let i = 1; i < m + 1; ++i) {
                r[i] = []; r[i][0] = i;
                for (let j = 1; j < n + 1; ++j) {
                    cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
                    r[i][j] = minimator(r[i - 1][j] + 1, r[i][j - 1] + 1,
                        r[i - 1][j - 1] + cost);
                }
            }

            return r;
        }

        /**
         * Return the smallest of the three numbers passed in
         * @param Number x
         * @param Number y
         * @param Number z
         * @return Number
         */
        function minimator(x: number, y: number, z: number): number {
            if (x < y && x < z) {
                return x;
            }
            if (y < x && y < z) {
                return y;
            }
            return z;
        }
    }

    ///////////////// Data Submission Handling //////////
    /**
     * Checks to make sure the functions return a valid suggestion
     * @param inputData
     */
    function checkSuggestDataPortionsMatch(inputData: InputData): boolean {
        // TODO: Add more checks
        if (!(inputData && inputData.features && inputData.labels)) {
            return false;
        }
        if (inputData.features.length !== inputData.labels.length) {
            console.warn("InputData features lenght does not match label length.");
            return false;
        }
        // corrLabels tracks how many columns per dataset are labeled 1 (match).
        // Should be exactly 1.
        // TODO: change the corrLabel concept when we support softclass inputs
        // E.g. when we no longer require exactly one column to be correct
        let corrLabels: number = 0;
        const len: number = inputData.labels.length;
        for (let i = 0; i < len; i++) {
            if (inputData.labels[i] === 1) {
                if (corrLabels >= 1) {
                    console.warn("More than one column labeled as match.");
                    return false;
                }
                corrLabels++;
            }
        }
        if (corrLabels === 0) {
            console.warn("No columns labeled as match.");
            return false;
        }
        return true;
    }

    /**
     * Add features into the InputData object
     * @param inputData
     * @param features
     */
    function addSuggestFeatures(inputData: InputData, features: Feature[]): Feature[] {
        inputData.features = features;
        return features;
    }

    /**
     * Add suggest labels into the InputData object
     * @param inputData
     * @param destColBackName
     */
    function addSuggestLabels(inputData: InputData, destColBackName: string): number[] {
        let labels: number[] = [];
        if (inputData.labels) {
            console.log("Already labeled input data.");
        }
        // TODO: change the onecorr concept when we support softclass inputs
        // E.g. when we no longer require exactly one column to be correct
        if (inputData.features) {
            for (let i = 0; i < inputData.features.length; i++) {
                let curFeatures: Feature = inputData.features[i];
                if (curFeatures === null) {
                    // Type mismatch between columns, we do not consider case
                    labels.push(0);
                } else if (curFeatures.uniqueIdentifier === destColBackName) {
                    labels.push(1);
                } else {
                    labels.push(0);
                }
            }
        } else {
            // Called label without adding features first.
            console.log("No input data to label.");
        }
        inputData.labels = labels;
        return labels;
    }

    /**
     * Adds metaData to the InputData object
     * @param inputData
     * @param joinKeyInputs
     */
    function addMetaData(inputData: InputData, joinKeyInputs: ColInput): MetaData {
        const srcColName: string = joinKeyInputs.srcColInfo.uniqueIdentifier;
        const timeOfJoin: string = String(new Date());
        const metaData: MetaData = {
            "srcColName": srcColName,
            "timeOfJoin": timeOfJoin
        };
        inputData.metaData = metaData;
        return metaData;
    }

    /**
     * Checks if the inputData is valid and adds the result to the object
     * @param inputData
     */
    function addIsValid(inputData: InputData): boolean {
        const isValid: boolean = checkSuggestDataPortionsMatch(inputData);
        inputData.isValid = isValid;
        return isValid;
    }


    ///////////////// End Submission Handling //////////



    ///////////////////////////////////////////////////////////////
    // End Join Key Suggestion
    // Begin Delim Suggestion
    //////////////////////////////////////////////////////////////


    // Doesn't seem like there is an easy way to decouple smartDetect from module
    // Solution: use raw data instead

    // dsPreview.js

    /**
     * xcSuggest.detectFormat
     * returns what format the tables rows are in. JSON, XML, or CSV
     *  @param rawRows
     */
    export function detectFormat(rawRows: string[]): string {
        if (isJSONArray(rawRows)) {
            return DSFormat.JSON;
        } else if (isSpecialJSON(rawRows)) {
            return DSFormat.SpecialJSON;
        } else if (isXML(rawRows)) {
            return DSFormat.XML;
        } else {
            return DSFormat.CSV;
        }
    }

    /**
     * Checks if table rows are in JSON format
     * @param rawRows
     */
    function isJSONArray(rawRows: string[]): boolean {
        let str: string = rawRows[0].trim();
        if (rawRows[1] != null) {
            str += rawRows[1].trim();
        }
        // start with [ and next char is {(skip space, tab, new line)
        const isValidPattern: boolean = /^\[[\s\t\r\n]+{?/.test(str) ||
                                        str.startsWith("[{");
        return isValidPattern;
    }

    /**
     * Checks if table rows are special JSONs
     * @param rawRows
     */
    function isSpecialJSON(rawRows: string[]): boolean {
        let isValid: boolean = false;
        for (let i = 0, len = rawRows.length; i < len; i++) {
            let text: string = rawRows[i];
            if (text.startsWith("{") && /{.+:.+},?/.test(text)) {
                // continue the loop
                // only when it has at least one valid case
                // we make it true
                isValid = true;
            } else if (text === "") {
                continue;
            } else if (i === len - 1 && text.startsWith("{")) {
                // last line may only have partial data, skip it
                continue;
            } else {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    /**
     * Checks if table rows are in XML format
     * @param rawRows
     */
    function isXML(rawRows: string[]): boolean {
        // Simple detection, just take up to ten lines
        let len: number = 10;
        if (rawRows.length < 10) {
            len = rawRows.length;
        }
        for (let i = 0; i < len; i++) {
            if (rawRows[i].replace(/\s/g, "").startsWith("<?xml")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Finds what character is the line delimiter in the raw string of table rows
     *  @param rawStr
     *  @param quote
     */
    export function detectLineDelimiter(rawStr: string, quote: string): string {
        rawStr = xcStringHelper.replaceInsideQuote(rawStr, quote);
        const crlfCount: number = coutCharOccurrence(rawStr, "\r\n");
        const lfCount: number = coutCharOccurrence(rawStr, "[^\r]\n");
        const crCount: number = coutCharOccurrence(rawStr, "\r(?!\n)");

        if (crlfCount > 0 && crlfCount >= lfCount && crlfCount >= crCount) {
            // when \r\n
            return "\r\n";
        } else if (crCount > 0 && crCount > lfCount) {
            // when \r
            return "\r";
        } else if (lfCount > 0) {
            // when \n
            return "\n";
        } else {
            // when all is 0
            return "";
        }
    }

    /**
     * Finds what character is the field delimiter in the raw string of table rows
     *  @param rawStr
     *  @param lineDelim
     *  @param quote
     */
    export function detectFieldDelimiter(rawStr: string, lineDelim: string, quote: string): string {
        // Number of samples can be changed
        const numOfSamples: number = 10;
        // remove stuff inside quote
        // reference: https://stackoverflow.com/questions/171480/regex-grabbing-values-between-quotation-marks
        const strippedStr: string = xcStringHelper.replaceInsideQuote(rawStr, quote);
        const samples: string[] = strippedStr.split(lineDelim).slice(0, numOfSamples);
        // delimiters: [",", "\t", "|"]
        let delimiters: string[] = [];
        // occurences: {",": [1,1,1...], "\t": [2,2,2...], "|": [3,3,3...]}
        let occurences: object = {};
        let validLineCounter: number = 0;
        for (let i = 0; i < samples.length; i++) {
            if (samples[i].length === 0) {
                continue;
            }
            // Only keep non-alphanumeric characters
            let line: string = samples[i].replace(/[a-zA-Z\d ]/g, "");
            // Also increase validLineCounter
            validLineCounter += 1;
            Object.keys(occurences).map(function (key) {
                // Append 0 to each array in the obj bc occurence is per row
                occurences[key].push(0);
            });
            for (let j = 0; j < line.length; j++) {
                let char: string = line[j];
                if (!occurences.hasOwnProperty(char)) {
                    delimiters.push(char);
                    // Fill all missing 0s based on validLineCounter
                    occurences[char] = new Array(validLineCounter).fill(0);
                }
                occurences[char][validLineCounter - 1] += 1;
            }
        }
        if (delimiters.length === 0) {
            return "";
        }
        // Priority:
        // 1. Ideally, a delimiter will have a score of 0, which means it occurs
        // same times across header and rows.
        //
        // 2. If not, check edge cases:
        //      1) It occurs same times across rows but it's not in header.
        //         e.g.[0,2,2,2,2...]
        //      2) It's in potential header but not in any other rows.
        //         e.g.[2,0,0,0,0...]
        // Both indicate it's very likely to have only one field, i.e. no delim
        //      3) If occurs same times across rows but different in header.
        //         e.g.[3,2,2,2,2...] (all > 0)
        // It's probably the delimiter if there is no other perfect delimiters
        //
        // 3. If not perfect case nor fell within edges, we choose the one with
        // lowest score (likely to be the delimiter)

        let noDelim: boolean = false;
        let subDelim: string;
        let bestDelim: string = delimiters[0];
        let minScore: number = computeVariance(occurences[bestDelim]);
        if (minScore === -1) {
            // Edge case 1 & 2 => no delimiter (if no other 0 score)
            noDelim = true;
            // Give it a big value so that we can continue with score comparison
            minScore = Number.MAX_VALUE;
        } else if (minScore === -2) {
            // Edge case 3 => 2nd choice of delimiter (if no other 0 score)
            subDelim = bestDelim;
            minScore = Number.MAX_VALUE;
        }
        for (let i = 1; i < delimiters.length; i++) {
            let currDelim: string = delimiters[i];
            let currScore: number = computeVariance(occurences[currDelim]);

            if (currScore === -1) {
                noDelim = true;
                continue;
            } else if (currScore === -2) {
                if (subDelim == null ||
                    (subDelim === currDelim && breakTie(currDelim, subDelim))) {
                    subDelim = currDelim;
                }
                continue;
            }

            if (currScore < minScore) {
                bestDelim = currDelim;
                minScore = currScore;
            } else if (currScore === minScore &&
                breakTie(currDelim, bestDelim)) {
                // When there is a tie, we have preference as comma > tab > pipe
                // All others follow a "first detected, first selected" rule
                bestDelim = currDelim;
                minScore = currScore;
            }
        }
        if (minScore !== 0) {
            // Follow this priority
            if (subDelim) {
                return subDelim;
            }
            if (noDelim) {
                return "";
            }
        }
        return bestDelim;
    }

    /**
     * Decides which delimiter should be used in the case of a tie
     * @param currDelim
     * @param bestDelim
     */
    function breakTie(currDelim: string, bestDelim: string): boolean {
        return (currDelim === "," ||
            (currDelim === "\t" && bestDelim !== ",") ||
            (currDelim === "|" && bestDelim !== "," && bestDelim !== "\t"));
    }

    /**
     * Counts occuracnes of a character within a string
     * @param str
     * @param ch
     */
    function coutCharOccurrence(str: string, ch: string): number {
        const regEx: RegExp = new RegExp(ch, "g");
        return (str.match(regEx) || []).length;
    }

    /**
     * Computes the variance in an array of numbers
     * @param nums
     */
    function computeVariance(nums: number[]): number {
        let score: number;
        const len: number = nums.length;
        // Weights can be changed
        // e.g. header weighs a half, all other lines split the rest equally
        const headerWeight: number = 0.5;
        const otherWeight: number = 0.5 / (len - 1);
        let edgeCase1: boolean = true;
        let edgeCase2: boolean = true;
        let edgeCase3: boolean = true;
        let sum: number = 0;
        if (len > 1 && nums[0] === nums[1]) {
            edgeCase1 = edgeCase2 = edgeCase3 = false;
        }
        if (nums[0] !== 0) {
            edgeCase1 = false;
        } else {
            edgeCase2 = edgeCase3 = false;
        }
        if (nums.length <= 2) {
            // [2,1] or [1,0] will not be treated as edge cases but [0,2] will
            // This might be changed based on real cases
            edgeCase2 = edgeCase3 = false;
        }
        sum += nums[0];
        for (let i = 1; i < nums.length - 1; i++) {
            if (nums[i] !== nums[i + 1]) {
                // Break all edgeCases
                edgeCase1 = edgeCase2 = edgeCase3 = false;
            } else if (nums[i] === 0) {
                // All 0, break edgeCase3
                edgeCase3 = false;
            } else {
                // All non-zero, break edgeCase2
                edgeCase2 = false;
            }
            sum += nums[i];
        }
        if (nums.length > 1) {
            sum += nums[nums.length - 1];
        }
        if (edgeCase3) {
            return -2;
        }
        if (edgeCase1 || edgeCase2) {
            return -1;
        }

        const avg: number = sum / len;
        let res: number = 0;
        for (let i = 0; i < len; i++) {
            if (i === 0) {
                res += headerWeight * Math.pow((nums[i] - avg), 2);
            } else {
                res += otherWeight * Math.pow((nums[i] - avg), 2);
            }
        }
        if (len === 1) {
            score = res / len;
        } else {
            // Otherwise compute the unbiased estimate of variance
            score = res / (len - 1);
        }
        // To put some weight on the number of occurrences, divide by avg
        return score / avg;
    }

    /**
     * Function detects if the table has a header
     * parsedRows is a two dimensional that represents a table's data
     *  @param parsedRows
     */
    export function detectHeader(parsedRows: string[][]): boolean {
        const rowLen: number = parsedRows.length;
        if (rowLen === 0) {
            return false;
        }

        const headers: string[] = parsedRows[0];
        const firstRow: string[] = rowLen > 1 ? parsedRows[1] : null;
        const colLen: number = headers.length;
        let text: string;
        let score: number = 0;

        for (let i = 0; i < colLen; i++) {
            text = headers[i];
            if ($.isNumeric(text)) {
                // if row has number
                // should not be header
                return false;
            } else if (text === "" || text == null) {
                // If it is empty header, check if it is consistent with rows
                // If not, it can't be the header
                if (firstRow != null && firstRow[i] === text) {
                    score -= 100;
                } else {
                    return false;
                }
            }
        }

        const rowStart: number = 1;
        for (let col = 0; col < colLen; col++) {
            text = headers[col];
            let headerLength: number = text.length;
            let allTextSameLength: boolean = null;
            let firstTextLength: number = null;

            for (let row = rowStart; row < rowLen; row++) {
                let tdText: string = parsedRows[row][col];
                const quotePattern: RegExp = /^['"].+["']$/;
                if (quotePattern.test(tdText)) {
                    // strip "9" to 9
                    tdText = tdText.substring(1, tdText.length - 1);
                }

                if ($.isNumeric(tdText)) {
                    // header is string and td is number
                    // valid this td
                    score += 30;
                } else if (tdText === "" || tdText == null) {
                    // td is null but header is not
                    score += 10;
                } else {
                    // the diff btw header and td is bigger, better
                    let textLength: number = tdText.length;
                    let diff: number = Math.abs(headerLength - textLength);
                    if (diff === 0 && text === tdText) {
                        score -= 20;
                    } else {
                        score += diff;
                    }

                    if (firstTextLength == null) {
                        firstTextLength = textLength;
                    } else if (allTextSameLength !== false) {
                        allTextSameLength = (firstTextLength === textLength);
                    }
                }
            }

            if (allTextSameLength &&
                firstTextLength != null &&
                headerLength !== firstTextLength) {
                // when all text has same length and header is different
                // length, it's a high chance of header
                score += 20 * rowLen;
            }
        }

        if (rowLen === 0 || score / rowLen < 20) {
            return false;
        } else {
            return true;
        }
    }
    ////////////
    // End JSON Delim Suggestion
    // Begin Col Type
    //////////////////////////////////////////////////////////////

    /**
     * Suggests what type of data is stored in a column
     *  @param datas
     *  @param currentType
     *  @param confidentRate
     */
    export function suggestType(datas: string[], currentType: ColumnType, confidentRate: number = 1): ColumnType {
        // Inputs has fields colInfo, confidentRate
        if (currentType === ColumnType.integer ||
            currentType === ColumnType.float) {
            return currentType;
        }

        if (!(datas instanceof Array)) {
            datas = [datas];
        }

        let isFloat: boolean;
        let validData: number = 0;
        let numHit: number = 0;
        let booleanHit: number = 0;
        let timestampHit: number = 0;
        const letterRex: RegExp = /[a-z]/i;
        const timestampFormats: any[] = [moment.ISO_8601];
        for (let i = 0, len = datas.length; i < len; i++) {
            let data: string = datas[i];
            if (data == null) {
                // skip this one
                continue;
            }

            data = data.trim().toLowerCase();
            if (data === "") {
                // skip this one
                continue;
            }

            validData++;
            let num: number = Number(data);
            // edge case1: "0X123", "1e12" can be parse as number but it's string
            // edge case2: 012345 should not be a number, otherwise it's cast to 12345
            if (!isNaN(num) &&
                !letterRex.test(data) &&
                !(data.length > 1 && data[0] === "0" && data[1] !== ".")
            ) {
                numHit++;
                if (!isFloat) {
                    if (!Number.isInteger(num) ||
                        data.includes(".")
                    ) {
                        // when it's float
                        isFloat = true;
                    }
                }
            } else if (data === "true" || data === "false" ||
                data === "t" || data === "f") {
                booleanHit++;
            } else if (moment(data.toUpperCase(), timestampFormats, true).isValid()) {
                timestampHit++;
            }
        }
        if (validData === 0) {
            return ColumnType.string;
        } else if (numHit / validData >= confidentRate) {
            if (isFloat) {
                return ColumnType.float;
            } else {
                return ColumnType.integer;
            }
        } else if (booleanHit / validData >= confidentRate) {
            return ColumnType.boolean;
        } else if (timestampHit / validData >= confidentRate) {
            return ColumnType.timestamp;
        } else {
            return ColumnType.string;
        }
    };

    /**
     * Suggests whether type of data is date in a column
     *  @param datas
     *  @param currentType
     *  @param confidentRate
     */
    export function suggestDateType(datas: string[], currentType: string, confidentRate: number = 1): boolean {
        if (currentType === ColumnType.boolean ||
            currentType === ColumnType.float) {
            return false;
        }

        if (!(datas instanceof Array)) {
            datas = [datas];
        }

        let formats: any[] = ['YYYY-M-D', 'YYYY-M', 'YYYY', moment.ISO_8601];
        let dateHit: number = 0;
        let validData: number = 0;
        for (let i = 0, len = datas.length; i < len; i++) {
            let data: string = datas[i];
            if (data == null) {
                continue;
            }
            validData++;
            if (moment(data, formats, true).isValid()) {
                dateHit++;
            }
        }
        if (validData === 0) {
            return false;
        } else if (dateHit / validData >= confidentRate) {
            return true;
        } else {
            return false;
        }
    };

    if (window["unitTestMode"]) {
        xcSuggest["__testOnly__"] = {
            contextCheck: contextCheck,
            getScore: getScore,
            calcSim: calcSim,
            getTitleDistance: getTitleDistance,
            checkSuggestDataPortionsMatch: checkSuggestDataPortionsMatch
        }
    }
}
