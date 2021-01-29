
try {
    const fs = require('fs');

    if (process.argv.length < 3) {
        console.log('Usage: node genTStrDefinition [inFileName] [outFileName?]');
        process.exit(0);
    }
    const inputFileName = process.argv[2];
    const outputFileName = process.argv[3];

    const fileContent = fs.readFileSync(inputFileName, { encoding: 'utf8' });
    const defObj = convertStringToObj(fileContent);
    const defStr = convertObjToDefstr(defObj);
    if (outputFileName != null) {
        fs.writeFileSync(outputFileName, defStr, { encoding: 'utf8' });
    } else {
        console.log(defStr);
    }

    // Convert string: introTStr = { ... } ==> xcDefs.introTStr = { ... }
    // Eval to JS function, which returns xcDefs
    function convertStringToObj(inputStr) {
        const re = /([\w\d_]+?)\s*?[=]\s*?[{]/g;
        inputStr = inputStr.replace(re, 'xcDefs.$1 = {');
        const jsStr = `const xcDefs={};${inputStr}return xcDefs;`;
        return Function('window', 'require', jsStr)({autogenVars:{}}, undefined);
    }

    // Convert xcDefs to "declare namespace xxx { export var fl1: string; .... }"
    function convertObjToDefstr(obj) {
        const nsList = [];
        for (const objName of Object.keys(obj)) {
            const objValue = obj[objName];
            const strDefList = Object.keys(objValue).map((field) => `\texport var ${field}: string;`);
            nsList.push(`declare namespace ${objName} {\n${strDefList.join('\n')}\n}`);
        }
        return nsList.join('\n');
    }
} catch(e) {
    console.error(e.message || e);
    process.exit(0);
}