"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertProfile = exports.COLOR_PROFILE = exports.BYTE_VALUE = void 0;
const bireader_1 = require("bireader");
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
;
;
const UNSIGNED = 0;
const SIGNED = 1;
const HALF_FLOAT = 2;
const FLOAT = 3;
exports.BYTE_VALUE = {
    UNSIGNED,
    SIGNED,
    HALF_FLOAT,
    FLOAT
};
const A8 = { order: "a8", value: UNSIGNED };
const R8 = { order: "r8", value: UNSIGNED };
const G8 = { order: "g8", value: UNSIGNED };
const B8 = { order: "b8", value: UNSIGNED };
const RG8 = { order: "r8g8", value: UNSIGNED };
const RB8 = { order: "r8b8", value: UNSIGNED };
const GR8 = { order: "g8r8", value: UNSIGNED };
const GB8 = { order: "g8b8", value: UNSIGNED };
const BR8 = { order: "b8r8", value: UNSIGNED };
const BG8 = { order: "b8g8", value: UNSIGNED };
const RGB8 = { order: "r8g8b8", value: UNSIGNED };
const RBG8 = { order: "r8b8g8", value: UNSIGNED };
const GRB8 = { order: "g8r8b8", value: UNSIGNED };
const GBR8 = { order: "g8b8r8", value: UNSIGNED };
const BRG8 = { order: "b8r8g8", value: UNSIGNED };
const BGR8 = { order: "b8g8r8", value: UNSIGNED };
const ARGB8 = { order: "a8r8g8b8", value: UNSIGNED };
const ARBG8 = { order: "a8r8b8g8", value: UNSIGNED };
const AGRB8 = { order: "a8g8r8b8", value: UNSIGNED };
const AGBR8 = { order: "a8g8b8r8", value: UNSIGNED };
const ABRG8 = { order: "a8b8r8g8", value: UNSIGNED };
const ABGR8 = { order: "a8b8g8r8", value: UNSIGNED };
const RGBA8 = { order: "r8g8b8a8", value: UNSIGNED };
const RBGA8 = { order: "r8b8g8a8", value: UNSIGNED };
const GRBA8 = { order: "g8r8b8a8", value: UNSIGNED };
const GBRA8 = { order: "g8b8r8a8", value: UNSIGNED };
const BRGA8 = { order: "b8r8g8a8", value: UNSIGNED };
const BGRA8 = { order: "b8g8r8a8", value: UNSIGNED };
const RGB565 = { order: "r5g6b5", value: UNSIGNED };
const BGR565 = { order: "b5g6r5", value: UNSIGNED };
const RGBA4 = { order: "r4g4b4a4", value: UNSIGNED };
const RGBA51 = { order: "r5g5b5a1", value: UNSIGNED };
const RGB10_A2 = { order: "r10g10b10a2", value: UNSIGNED };
const RGB10_A2I = { order: "r10g10b10a2", value: SIGNED };
const A8I = { order: "a8", value: SIGNED };
const R8I = { order: "r8", value: SIGNED };
const RG8I = { order: "r8g8", value: SIGNED };
const RGB8I = { order: "r8g8b8", value: SIGNED };
const RGBA8I = { order: "r8g8b8a8", value: SIGNED };
const ARGB8I = { order: "a8r8g8b8", value: SIGNED };
const BGR8I = { order: "b8g8r8", value: SIGNED };
const BGRA8I = { order: "b8g8r8a8", value: SIGNED };
const ABGR8I = { order: "a8b8g8r8", value: SIGNED };
const A16F = { order: "a16", value: HALF_FLOAT };
const R16F = { order: "r16", value: HALF_FLOAT };
const RG16F = { order: "r16g16", value: HALF_FLOAT };
const RGB16F = { order: "r16g16b16", value: HALF_FLOAT };
const RGBA16F = { order: "r16g16b16a16", value: HALF_FLOAT };
const ARGB16F = { order: "a16r16g16b16", value: HALF_FLOAT };
const R16 = { order: "r16", value: UNSIGNED };
const RG16 = { order: "r16g16", value: UNSIGNED };
const RGB16 = { order: "r16g16b16", value: UNSIGNED };
const RGBA16 = { order: "r16g16b16a16", value: UNSIGNED };
const A16I = { order: "a16", value: SIGNED };
const R16I = { order: "r16", value: SIGNED };
const RG16I = { order: "r16g16", value: SIGNED };
const RGB16I = { order: "r16g16b16", value: SIGNED };
const RGBA16I = { order: "r16g16b16a16", value: SIGNED };
const A32F = { order: "a32", value: FLOAT };
const R32F = { order: "r32", value: FLOAT };
const RG32F = { order: "r32g32", value: FLOAT };
const RGB32F = { order: "r32g32b32", value: FLOAT };
const RGBA32F = { order: "r32g32b32a32", value: FLOAT };
const A32 = { order: "a32", value: UNSIGNED };
const R32 = { order: "r32", value: UNSIGNED };
const RG32 = { order: "r32g32", value: UNSIGNED };
const RGB32 = { order: "r32g32b32", value: UNSIGNED };
const RGBA32 = { order: "r32g32b32a32", value: UNSIGNED };
const R32I = { order: "r32", value: SIGNED };
const RG32I = { order: "r32g32", value: SIGNED };
const RGB32I = { order: "r32g32b32", value: SIGNED };
const RGBA32I = { order: "r32g32b32a32", value: SIGNED };
exports.COLOR_PROFILE = {
    A8,
    R8,
    G8,
    B8,
    RG8,
    RB8,
    GR8,
    GB8,
    BR8,
    BG8,
    RGB8,
    RBG8,
    GRB8,
    GBR8,
    BRG8,
    BGR8,
    ARGB8,
    ARBG8,
    AGRB8,
    AGBR8,
    ABRG8,
    ABGR8,
    RGBA8,
    RBGA8,
    GRBA8,
    GBRA8,
    BRGA8,
    BGRA8,
    RGB565,
    BGR565,
    RGBA4,
    RGBA51,
    RGB10_A2,
    RGB10_A2I,
    A8I,
    R8I,
    RG8I,
    RGB8I,
    RGBA8I,
    ARGB8I,
    BGR8I,
    BGRA8I,
    ABGR8I,
    A16F,
    R16F,
    RG16F,
    RGB16F,
    RGBA16F,
    ARGB16F,
    R16,
    RG16,
    RGB16,
    RGBA16,
    A16I,
    R16I,
    RG16I,
    RGB16I,
    RGBA16I,
    A32F,
    R32F,
    RG32F,
    RGB32F,
    RGBA32F,
    A32,
    R32,
    RG32,
    RGB32,
    RGBA32,
    R32I,
    RG32I,
    RGB32I,
    RGBA32I,
};
function calMin(bits, isSigned) {
    if (bits <= 0) {
        return 0;
    }
    var min = 0;
    if (isSigned > 0 && bits >= 8) {
        min = -Math.pow(2, bits - 1);
        if (isSigned == 2) {
            if (bits != 16) {
                throw new Error('Half floats must be read as 16 bits.');
            }
            else {
                return -65504;
            }
        }
        if (isSigned == 3) {
            if (bits != 32) {
                throw new Error('Floats must be read as 32 bits.');
            }
            else {
                return 1.175494351e-38;
            }
        }
        return min;
    }
    else {
        return min;
    }
}
function calMax(bits, isSigned) {
    if (bits <= 0) {
        return 0;
    }
    var max = Math.pow(2, bits) - 1;
    if (isSigned > 0 && bits >= 8) {
        max = Math.pow(2, bits - 1) - 1;
        if (isSigned == 2) {
            if (bits != 16) {
                throw new Error('Half floats must be read as 16 bits.');
            }
            else {
                return 1.0;
            }
        }
        if (isSigned == 3) {
            if (bits != 32) {
                throw new Error('Floats must be read as 32 bits.');
            }
            else {
                return 1.0;
            }
        }
        return max;
    }
    else {
        return max;
    }
}
function convertValue(value, inputBitSize, isSigned, outputBitSize) {
    if (inputBitSize < 1 || outputBitSize < 1) {
        throw new Error('Bit sizes must be positive integers.');
    }
    if (inputBitSize > 32 || outputBitSize > 32) {
        throw new Error('Max bit sizes is 32.');
    }
    // If the value is already in the desired bit size, return it.
    if (inputBitSize === outputBitSize) {
        return value;
    }
    // Calculate the maximum value for the input bit size.
    const maxInputValue = calMax(inputBitSize, isSigned);
    const minInputValue = calMin(inputBitSize, isSigned);
    // Ensure the value is within the range of the input bit size.
    if (value < minInputValue || value > maxInputValue) {
        throw new Error('Input value is out of range for the specified input bit size.');
    }
    // Calculate the maximum value for the output bit size.
    const maxOutputValue = calMax(outputBitSize, isSigned);
    // Scale the input value to the output bit size.
    return (value * maxOutputValue) / maxInputValue;
}
function readProfile(str, totalSize) {
    const regexColorOrder = /^(r[1-9]\d*|g[1-9]\d*|b[1-9]\d*|a[1-9]\d*)+$/;
    if (!regexColorOrder.test(str.order)) {
        throw new Error(str + " is not a valid color profile.");
    }
    const matches = str.order.match(/[rgba](?!0)\d+/g); // Extract letter-value pairs
    const order = {};
    if (!matches) {
        throw new Error(`No valid letter-value pairs found in ${str}.`);
    }
    //testing if the letter was assigned twice
    const test = {};
    // Determine the order of letters and values
    var index = 1;
    var pixSize = 0;
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        //can only have 4 colors for RGBA
        if (index > 4) {
            break;
        }
        const letter = match[0];
        const size = parseInt(match.slice(1), 10);
        //testing if the letter was assigned twice
        if (test[letter]) {
            throw new Error(`${letter} can not be assigned twice in color profile.`);
        }
        pixSize += size;
        //testing if the letter was assigned twice
        Object.assign(test, { [letter]: true });
        Object.assign(order, { [index]: { letter, size, index } });
        index += 1;
    }
    if (totalSize) {
        return pixSize;
    }
    return order;
}
function isCOLOR_PROFILE(obj) {
    return typeof obj === 'object' && 'order' in obj && 'value' in obj;
}
/**
 * Convert color data profile.
 *
 * @param {Buffer|Uint8Array} src - Source Data
 * @param {COLOR_PROFILE} srcProfile - Source Color Profile (use ```COLOR_PROFILE```)
 * @param {COLOR_PROFILE} dstProfile - Desired Color Profile (use ```COLOR_PROFILE```)
 * @param {number} width - Image width (note: without demenistons, pixel size is calculated by profile and source size)
 * @param {number} height - Image height (note: without demenistons, pixel size is calculated by profile and source size)
 * @returns ```Uint8Array``` or ```Buffer```
 */
function convertProfile(src, srcProfile, dstProfile, width, height) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const src_value = srcProfile.value;
    if (src_value == undefined || typeof src_value != "number") {
        throw new Error(`Source value type must be assigned`);
    }
    const dst_value = dstProfile.value;
    if (dst_value == undefined || typeof dst_value != "number") {
        throw new Error(`Desired value type must be assigned`);
    }
    if (!isCOLOR_PROFILE(srcProfile)) {
        throw new Error(`srcProfile must be type of COLOR_PROFILE`);
    }
    if (!isCOLOR_PROFILE(dstProfile)) {
        throw new Error(`dstProfile must be type of COLOR_PROFILE`);
    }
    if (!(src instanceof Buffer || src instanceof Uint8Array)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    var srcSizeNeeded;
    var srcPixels = 0;
    var dstSizeNeeded;
    var srcbpp = readProfile(srcProfile, true);
    var dstbpp = readProfile(dstProfile, true);
    if (width != undefined && height != undefined) {
        srcPixels = width * height;
        srcSizeNeeded = Math.ceil(srcPixels * (srcbpp / 8));
    }
    else {
        srcPixels = src.length / (srcbpp / 8);
        srcSizeNeeded = Math.ceil(srcPixels * (srcbpp / 8));
    }
    if (srcSizeNeeded > src.length) {
        throw new Error(`Source data size doesnt not match profile needed size`);
    }
    dstSizeNeeded = Math.ceil(srcPixels * (dstbpp / 8));
    var dstData = new Uint8Array(dstSizeNeeded);
    var src_read = readProfile(srcProfile);
    var dst_read = readProfile(dstProfile);
    const srcIsUnsigned = src_value == UNSIGNED ? true : false;
    const dstIsUnsigned = dst_value == UNSIGNED ? true : false;
    const br = new bireader_1.bireader(src);
    const bw = new bireader_1.biwriter(dstData);
    for (let i = 0; i < srcPixels; i++) {
        //read all 4 values if listed
        for (let z = 1; z < 5; z++) {
            const readObj = src_read[z];
            if (readObj != undefined) {
                if (src_value == HALF_FLOAT) {
                    readObj.readValue = br.readHalfFloat();
                }
                else if (src_value == FLOAT) {
                    readObj.readValue = br.readFloat();
                }
                else {
                    readObj.readValue = br.readBit(readObj.size, srcIsUnsigned);
                }
            }
        }
        //write values
        for (let z = 1; z < 5; z++) {
            const writeObj = dst_read[z];
            if (writeObj != undefined) {
                const writeLetter = writeObj.letter;
                const srcObj = Object.values(src_read).filter(self => self.letter == writeLetter)[0];
                var convertedValue = 0;
                if (srcObj != undefined && srcObj.readValue != undefined) {
                    convertedValue = convertValue(srcObj.readValue, srcObj.size, dst_value, writeObj.size);
                }
                if (dst_value == HALF_FLOAT) {
                    bw.writeHalfFloat(convertedValue);
                }
                else if (dst_value == FLOAT) {
                    bw.writeFloat(convertedValue);
                }
                else {
                    bw.writeBit(convertedValue, writeObj.size, dstIsUnsigned);
                }
            }
        }
    }
    const retval = bw.get();
    if (isBuffer(src)) {
        return Buffer.from(retval);
    }
    return retval;
}
exports.convertProfile = convertProfile;
