const fs = require("fs");
const inPath = "assets/stylesheets/less/partials/mixins/constants.less";
const outPath = "assets/stylesheets/less/partials/mixins/constants.less";

function removeTrailingSemiColon(str) {
    if (str[str.length-1] === ";") {
        return str.substring(0, str.length-1);
    }
    return str;
}

function removeComments(str) {
    const commentIdx = str.indexOf("//");
    if (commentIdx === -1) {
        return str;
    }
    return str.substring(0, commentIdx).trim();
}

function isHexCode(val) {
    val = val.trim();
    let code = "";
    if (val.indexOf("#") === 0 && val.length === 7) {
        code = val.substring(1).toUpperCase();
        for (let char of code) {
            if (!((char >= "0" && char <= "9") || (char >= "A" && char <="F"))) {
                return false;
            }
        }
    } else {
        return false;
    }
    const codeArray = [];
    for (let char of code) {
        let c;
        //console.log(char);
        if (char >= "0" && char <= "9") {
            c = parseInt(char);
        } else {
            c = (char.charCodeAt() - "A".charCodeAt()) + 10;
        }
        codeArray.push(c);
        
    }
    let r = codeArray[0] * 16 + codeArray[1];
    let g = codeArray[2] * 16 + codeArray[3];
    let b = codeArray[4] * 16 + codeArray[5];
    return {
        r: r/255,
        g: g/255,
        b: b/255
    };
}

function isRgba(val) {
    val = val.trim();
    if (val.indexOf("rgba") === 0) {
        const code = val.substring(5, val.length-1);
        const values = code.split(",");
        if (values.length != 4) {
            return false;
        }
        try {
            const retValue = {
                r: parseInt(values[0].trim()) / 255,
                g: parseInt(values[1].trim()) / 255,
                b: parseInt(values[2].trim()) / 255,
                a: parseFloat(values[3].trim())
            }
            return retValue;
        } catch(e) {
            return false;
        }
    } else {
        return false;
    }
}

function convertRgbToHsl(v) {
    let max = Math.max(v.r, v.g, v.b);
    let min = Math.min(v.r, v.g, v.b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max === min) {
        return {h: 0, s:0, l:Math.round(l*100), a:1};
    }
    if (l >= 0.5) {
        s = (max - min) / (2-max-min);
    } else {
        s = (max - min) / (max + min);
    }
    if (v.r === max) {
        h = (v.g - v.b) / (max - min);
    } else if (v.g === max) {
        h = 2.0 + (v.b - v.r) / (max - min);
    } else {
        h = 4.0 + (v.r - v.g) / (max - min);
    }
    h *= 60;
    if (h < 0) {
        h += 360;
    }
    a = v.a;
    if (!v.a) {
        a = 1;
    }
    return {
        h: h,
        s: (s * 100),
        l: (l * 100),
        a: a
    }
}

function shiftHue(hsl) {
    const green = -45;
    const cyan = -20;
    const purple = 60;
    const pink = 100;
    const rose = 120;
    const red = 150;
    const xcalarRed = 170;
    const orig = 0;

    const diff = green;
    hsl.h += diff;
    if (hsl.h < 0) {
        hsl.h += 360;
    }
    if (hsl.h >= 360) {
        hsl.h -= 360;
    }
    return hsl;
}

function shiftSat(hsl) {
    const satFactor = 1;
    hsl.s *= satFactor;
    return hsl;
}

let lessContents = fs.readFileSync(inPath, "utf-8");
let newContents = "";
for (let line of lessContents.split("\n")) {
    const origLine = line;
    line = removeComments(line);
    line = line.trim();
    line = removeTrailingSemiColon(line);
    if (line.length === 0 || line[0] !== "@") {
        continue;
    }
    let hexCode = isHexCode(line.split(":")[1]);
    let rgba;

    if (!hexCode) {
        rgba = isRgba(line.split(":")[1]);
        if (rgba) {
            hexCode = rgba;
        }
    }

    let hslVal = convertRgbToHsl(hexCode);
    hslVal = shiftHue(hslVal);
    hslVal = shiftSat(hslVal);

    if (!hexCode && !rgba) {
        newContents += origLine + "\n";
    } else {
        newContents += line.split(":")[0] + ": hsla(" + Math.round(hslVal.h) +
            "," + Math.round(hslVal.s) + "%," + Math.round(hslVal.l) + "%," +
            Math.round(hslVal.a) + ");\n";
    }
    
}

fs.writeFileSync(outPath, newContents);
console.log("Done!");