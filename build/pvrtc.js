function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}
class Pixel32 {
    constructor(red, green, blue, alpha) {
        this.red = new Uint8Array([red != undefined ? red : 0]);
        this.green = new Uint8Array([green != undefined ? green : 0]);
        this.blue = new Uint8Array([blue != undefined ? blue : 0]);
        this.alpha = new Uint8Array([alpha != undefined ? alpha : 0]);
    }
}
class Pixel128S {
    constructor(red, green, blue, alpha) {
        this.red = new Int32Array([red != undefined ? red : 0]);
        this.green = new Int32Array([green != undefined ? green : 0]);
        this.blue = new Int32Array([blue != undefined ? blue : 0]);
        this.alpha = new Int32Array([alpha != undefined ? alpha : 0]);
    }
}
class PVRTCWord {
    constructor(modulationData, colorData) {
        this.modulationData = new Uint32Array([modulationData != undefined ? modulationData : 0]);
        this.colorData = new Uint32Array([colorData != undefined ? colorData : 0]);
    }
}
class PVRTCWordIndices {
    constructor() {
        this.P = new Int32Array(2);
        this.Q = new Int32Array(2);
        this.R = new Int32Array(2);
        this.S = new Int32Array(2);
    }
}
function getColorA(colorData) {
    const color = new Pixel32();
    if ((colorData & 0x8000) != 0) {
        color.red[0] = (colorData & 0x7c00) >> 10;
        color.green[0] = (colorData & 0x3e0) >> 5;
        color.blue[0] = (colorData & 0x1e) | ((colorData & 0x1e) >> 4);
        color.alpha[0] = 0xf;
    }
    else {
        color.red[0] = ((colorData & 0xf00) >> 7) | ((colorData & 0xf00) >> 11);
        color.green[0] = ((colorData & 0xf0) >> 3) | ((colorData & 0xf0) >> 7);
        color.blue[0] = ((colorData & 0xe) << 1) | ((colorData & 0xe) >> 2);
        color.alpha[0] = (colorData & 0x7000) >> 11;
    }
    return color;
}
function getColorB(colorData) {
    const color = new Pixel32();
    if (colorData & 0x80000000) {
        color.red[0] = (colorData & 0x7c000000) >> 26;
        color.green[0] = (colorData & 0x3e00000) >> 21;
        color.blue[0] = (colorData & 0x1f0000) >> 16;
        color.alpha[0] = 0xf;
    }
    else {
        color.red[0] = ((colorData & 0xf000000) >> 23) | ((colorData & 0xf000000) >> 27);
        color.green[0] = ((colorData & 0xf00000) >> 19) | ((colorData & 0xf00000) >> 23);
        color.blue[0] = ((colorData & 0xf0000) >> 15) | ((colorData & 0xf0000) >> 19);
        color.alpha[0] = (colorData & 0x70000000) >> 27;
    }
    return color;
}
function interpolateColors(P, Q, R, S, pPixel, bpp) {
    var wordWidth = 4;
    const wordHeight = 4;
    if (bpp == 2) {
        wordWidth = 8;
    }
    const hP = new Pixel128S(P.red[0], P.green[0], P.blue[0], P.alpha[0]);
    const hQ = new Pixel128S(Q.red[0], Q.green[0], Q.blue[0], Q.alpha[0]);
    const hR = new Pixel128S(R.red[0], R.green[0], R.blue[0], R.alpha[0]);
    const hS = new Pixel128S(S.red[0], S.green[0], S.blue[0], S.alpha[0]);
    const QminusP = new Pixel128S(hQ.red[0] - hP.red[0], hQ.green[0] - hP.green[0], hQ.blue[0] - hP.blue[0], hQ.alpha[0] - hP.alpha[0]);
    const SminusR = new Pixel128S(hS.red[0] - hR.red[0], hS.green[0] - hR.green[0], hS.blue[0] - hR.blue[0], hS.alpha[0] - hR.alpha[0]);
    hP.red[0] *= wordWidth;
    hP.green[0] *= wordWidth;
    hP.blue[0] *= wordWidth;
    hP.alpha[0] *= wordWidth;
    hR.red[0] *= wordWidth;
    hR.green[0] *= wordWidth;
    hR.blue[0] *= wordWidth;
    hR.alpha[0] *= wordWidth;
    if (bpp == 2) {
        for (var x = 0; x < wordWidth; x++) {
            const result = new Pixel128S(4 * hP.red[0], 4 * hP.green[0], 4 * hP.blue[0], 4 * hP.alpha[0]);
            const dY = new Pixel128S(hR.red[0] - hP.red[0], hR.green[0] - hP.green[0], hR.blue[0] - hP.blue[0], hR.alpha[0] - hP.alpha[0]);
            for (var y = 0; y < wordHeight; y++) {
                pPixel[y * wordWidth + x] = new Pixel128S((result.red[0] >> 7) + (result.red[0] >> 2), (result.green[0] >> 7) + (result.green[0] >> 2), (result.blue[0] >> 7) + (result.blue[0] >> 2), (result.alpha[0] >> 5) + (result.alpha[0] >> 1));
                result.red[0] += dY.red[0];
                result.green[0] += dY.green[0];
                result.blue[0] += dY.blue[0];
                result.alpha[0] += dY.alpha[0];
            }
            hP.red[0] += QminusP.red[0];
            hP.green[0] += QminusP.green[0];
            hP.blue[0] += QminusP.blue[0];
            hP.alpha[0] += QminusP.alpha[0];
            hR.red[0] += SminusR.red[0];
            hR.green[0] += SminusR.green[0];
            hR.blue[0] += SminusR.blue[0];
            hR.alpha[0] += SminusR.alpha[0];
        }
    }
    else {
        for (var y = 0; y < wordHeight; y++) {
            const result = new Pixel128S(4 * hP.red[0], 4 * hP.green[0], 4 * hP.blue[0], 4 * hP.alpha[0]);
            const dY = new Pixel128S(hR.red[0] - hP.red[0], hR.green[0] - hP.green[0], hR.blue[0] - hP.blue[0], hR.alpha[0] - hP.alpha[0]);
            for (var x = 0; x < wordWidth; x++) {
                pPixel[y * wordWidth + x] = new Pixel128S((result.red[0] >> 6) + (result.red[0] >> 1), (result.green[0] >> 6) + (result.green[0] >> 1), (result.blue[0] >> 6) + (result.blue[0] >> 1), (result.alpha[0] >> 4) + (result.alpha[0]));
                result.red[0] += dY.red[0];
                result.green[0] += dY.green[0];
                result.blue[0] += dY.blue[0];
                result.alpha[0] += dY.alpha[0];
            }
            hP.red[0] += QminusP.red[0];
            hP.green[0] += QminusP.green[0];
            hP.blue[0] += QminusP.blue[0];
            hP.alpha[0] += QminusP.alpha[0];
            hR.red[0] += SminusR.red[0];
            hR.green[0] += SminusR.green[0];
            hR.blue[0] += SminusR.blue[0];
            hR.alpha[0] += SminusR.alpha[0];
        }
    }
}
function unpackModulations(word, wordWidth, wordHeight, modulationValues, modulationModes, bpp) {
    var WordModMode = word.colorData[0] & 0x1;
    var ModulationBits = word.modulationData[0];
    if (bpp == 2) {
        if (WordModMode) {
            if (ModulationBits & 0x1) {
                if (ModulationBits & (0x1 << 20)) {
                    WordModMode = 3;
                }
                else {
                    WordModMode = 2;
                }
                if (ModulationBits & (0x1 << 21)) {
                    ModulationBits = (ModulationBits | (0x1 << 20)) >>> 0;
                }
                else {
                    ModulationBits = (ModulationBits & ~(0x1 << 20)) >>> 0;
                }
            }
            if (ModulationBits & 0x2) {
                ModulationBits = (ModulationBits | 0x1) >>> 0;
            }
            else {
                ModulationBits = (ModulationBits & ~0x1) >>> 0;
            }
            for (var y = 0; y < 4; y++) {
                for (var x = 0; x < 8; x++) {
                    modulationModes[x + wordWidth][y + wordHeight] = WordModMode;
                    if (((x ^ y) & 1) == 0) {
                        modulationValues[x + wordWidth][y + wordHeight] = ModulationBits & 3;
                        ModulationBits >>>= 2;
                    }
                }
            }
        }
        else {
            for (var y = 0; y < 4; y++) {
                for (var x = 0; x < 8; x++) {
                    modulationModes[x + wordWidth][y + wordHeight] = WordModMode;
                    if (ModulationBits & 1) {
                        modulationValues[x + wordWidth][y + wordHeight] = 0x3;
                    }
                    else {
                        modulationValues[x + wordWidth][y + wordHeight] = 0x0;
                    }
                    ModulationBits >>>= 1;
                }
            }
        }
    }
    else {
        if (WordModMode) {
            for (var y = 0; y < 4; y++) {
                for (var x = 0; x < 4; x++) {
                    modulationValues[y + wordHeight][x + wordHeight] = ModulationBits & 3;
                    if (modulationValues[y + wordHeight][x + wordHeight] == 1) {
                        modulationValues[y + wordHeight][x + wordHeight] = 4;
                    }
                    else if (modulationValues[y + wordHeight][x + wordHeight] == 2) {
                        modulationValues[y + wordHeight][x + wordHeight] = 14;
                    }
                    else if (modulationValues[y + wordHeight][x + wordHeight] == 3) {
                        modulationValues[y + wordHeight][x + wordHeight] = 8;
                    }
                    ModulationBits >>>= 2;
                }
            }
        }
        else {
            for (var y = 0; y < 4; y++) {
                for (var x = 0; x < 4; x++) {
                    modulationValues[y + wordHeight][x + wordHeight] = ModulationBits & 3;
                    modulationValues[y + wordHeight][x + wordHeight] *= 3;
                    if (modulationValues[y + wordHeight][x + wordHeight] > 3) {
                        modulationValues[y + wordHeight][x + wordHeight] -= 1;
                    }
                    ModulationBits >>>= 2;
                }
            }
        }
    }
    assert((ModulationBits == 0), `UnpackModulations (ModulationBits == 0): ${ModulationBits}`);
}
function getModulationValues(modulationValues, modulationModes, xPos, yPos, bpp) {
    const retval = new Int32Array([0]);
    if (bpp == 2) {
        const RepVals0 = new Int32Array([0, 3, 5, 8]);
        if (modulationModes[xPos][yPos] == 0) {
            return RepVals0[modulationValues[xPos][yPos]];
        }
        else {
            if (((xPos ^ yPos) & 1) == 0) {
                return RepVals0[modulationValues[xPos][yPos]];
            }
            else if (modulationModes[xPos][yPos] == 1) {
                return new Int32Array([(RepVals0[modulationValues[xPos][yPos - 1]] +
                        RepVals0[modulationValues[xPos][yPos + 1]] +
                        RepVals0[modulationValues[xPos - 1][yPos]] +
                        RepVals0[modulationValues[xPos + 1][yPos]] + 2) / 4
                ])[0];
            }
            else if (modulationModes[xPos][yPos] == 2) {
                return new Int32Array([(RepVals0[modulationValues[xPos - 1][yPos]] +
                        RepVals0[modulationValues[xPos + 1][yPos]] + 1) / 2
                ])[0];
            }
            else {
                return new Int32Array([(RepVals0[modulationValues[xPos][yPos - 1]] +
                        RepVals0[modulationValues[xPos][yPos + 1]] + 1) / 2
                ])[0];
            }
        }
    }
    else if (bpp == 4) {
        return modulationValues[xPos][yPos];
    }
    return 0;
}
function pvrtcGetDecompressedPixels(P, Q, R, S, pPixels, bpp) {
    const modulationValues = Array.from({ length: 16 }, () => new Int32Array(8));
    const modulationModes = Array.from({ length: 16 }, () => new Int32Array(8));
    const upscaledColorA = Array.from({ length: 32 });
    const upscaledColorB = Array.from({ length: 32 });
    const wordWidth = bpp == 2 ? 8 : 4;
    const wordHeight = 4;
    unpackModulations(P, 0, 0, modulationValues, modulationModes, bpp);
    unpackModulations(Q, wordWidth, 0, modulationValues, modulationModes, bpp);
    unpackModulations(R, 0, wordHeight, modulationValues, modulationModes, bpp);
    unpackModulations(S, wordWidth, wordHeight, modulationValues, modulationModes, bpp);
    interpolateColors(getColorA(P.colorData[0]), getColorA(Q.colorData[0]), getColorA(R.colorData[0]), getColorA(S.colorData[0]), upscaledColorA, bpp);
    interpolateColors(getColorB(P.colorData[0]), getColorB(Q.colorData[0]), getColorB(R.colorData[0]), getColorB(S.colorData[0]), upscaledColorB, bpp);
    for (var y = 0; y < wordHeight; y++) {
        for (var x = 0; x < wordWidth; x++) {
            var mod = getModulationValues(modulationValues, modulationModes, (x + wordWidth / 2) >>> 0, (y + wordHeight / 2) >>> 0, bpp);
            var punchthroughAlpha = false;
            if (mod > 10) {
                punchthroughAlpha = true;
                mod -= 10;
            }
            const result = new Pixel128S((upscaledColorA[y * wordWidth + x].red[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].red[0] * mod) / 8, (upscaledColorA[y * wordWidth + x].green[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].green[0] * mod) / 8, (upscaledColorA[y * wordWidth + x].blue[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].blue[0] * mod) / 8, punchthroughAlpha ? 0 : (upscaledColorA[y * wordWidth + x].alpha[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].alpha[0] * mod) / 8);
            if (bpp == 2) {
                pPixels[y * wordWidth + x] = new Pixel32(result.red[0], result.green[0], result.blue[0], result.alpha[0]);
            }
            else if (bpp == 4) {
                pPixels[y + x * wordHeight] = new Pixel32(result.red[0], result.green[0], result.blue[0], result.alpha[0]);
            }
        }
    }
}
function wrapWordIndex(numWords, word) {
    return ((word + numWords) % numWords);
}
function isPowerOf2(input) {
    var minus1;
    if (input <= 0) {
        return false;
    }
    minus1 = (input - 1) >>> 0;
    return ((input | minus1) == (input ^ minus1));
}
function TwiddleUV(XSize, YSize, XPos, YPos) {
    const Twiddled = new Uint32Array(1);
    const MinDimension = new Uint32Array(1);
    const MaxValue = new Uint32Array(1);
    const SrcBitPos = new Uint32Array(1);
    const DstBitPos = new Uint32Array(1);
    const ShiftCount = new Int32Array(1);
    assert(YPos < YSize, `TwiddleUV ${YPos} < ${YSize}`);
    assert(XPos < XSize, `TwiddleUV ${XPos} < ${XSize}`);
    assert(isPowerOf2(YSize), `TwiddleUV isPowerOf2(${YSize})`);
    assert(isPowerOf2(XSize), `TwiddleUV isPowerOf2(${XSize})`);
    if (YSize < XSize) {
        MinDimension[0] = YSize;
        MaxValue[0] = XPos;
    }
    else {
        MinDimension[0] = XSize;
        MaxValue[0] = YPos;
    }
    SrcBitPos[0] = 1;
    DstBitPos[0] = 1;
    Twiddled[0] = 0;
    ShiftCount[0] = 0;
    while (SrcBitPos[0] < MinDimension[0]) {
        if (YPos & SrcBitPos[0]) {
            Twiddled[0] |= DstBitPos[0];
        }
        if (XPos & SrcBitPos[0]) {
            Twiddled[0] |= (DstBitPos[0] << 1);
        }
        SrcBitPos[0] <<= 1;
        DstBitPos[0] <<= 2;
        ShiftCount[0] += 1;
    }
    MaxValue[0] >>>= ShiftCount[0];
    Twiddled[0] |= (MaxValue[0] << (2 * ShiftCount[0]));
    return Twiddled[0];
}
function mapDecompressedData(pOutput, width, pPixels, indices, bpp) {
    const wordWidth = bpp == 2 ? 8 : 4;
    const wordHeight = 4;
    for (var y = 0; y < wordHeight / 2; y++) {
        for (var x = 0; x < wordWidth / 2; x++) {
            const value1 = pPixels[y * wordWidth + x];
            pOutput[(((indices.P[1] * wordHeight) + y + wordHeight / 2) * width + indices.P[0] * wordWidth + x + wordWidth / 2)] = new Pixel32(value1.red[0], value1.green[0], value1.blue[0], value1.alpha[0]);
            const value2 = pPixels[y * wordWidth + x + wordWidth / 2];
            pOutput[(((indices.Q[1] * wordHeight) + y + wordHeight / 2) * width + indices.Q[0] * wordWidth + x)] = new Pixel32(value2.red[0], value2.green[0], value2.blue[0], value2.alpha[0]);
            const value3 = pPixels[(y + wordHeight / 2) * wordWidth + x];
            pOutput[(((indices.R[1] * wordHeight) + y) * width + indices.R[0] * wordWidth + x + wordWidth / 2)] = new Pixel32(value3.red[0], value3.green[0], value3.blue[0], value3.alpha[0]);
            const value4 = pPixels[(y + wordHeight / 2) * wordWidth + x + wordWidth / 2];
            pOutput[(((indices.S[1] * wordHeight) + y) * width + indices.S[0] * wordWidth + x)] = new Pixel32(value4.red[0], value4.green[0], value4.blue[0], value4.alpha[0]);
        }
    }
}
function pvrtcDecompress(pCompressedData, pOutData, width, height, bpp) {
    var wordWidth = 4;
    const wordHeight = 4;
    if (bpp == 2) {
        wordWidth = 8;
    }
    const pWordMembers = [];
    for (var i = 0; i < pCompressedData.length; i += 4) {
        const value = (((pCompressedData[i + 3] & 0xFF) << 24) | ((pCompressedData[i + 2] & 0xFF) << 16) | ((pCompressedData[i + 1] & 0xFF) << 8) | (pCompressedData[i] & 0xFF));
        pWordMembers.push(value >>> 0);
    }
    const i32NumXWords = new Int32Array([(width / wordWidth)])[0];
    const i32NumYWords = new Int32Array([(height / wordHeight)])[0];
    const indices = new PVRTCWordIndices();
    const pPixels = Array.from({ length: wordWidth * wordHeight });
    for (var wordY = -1; wordY < i32NumYWords - 1; wordY++) {
        for (var wordX = -1; wordX < i32NumXWords - 1; wordX++) {
            indices.P[0] = wrapWordIndex(i32NumXWords, wordX);
            indices.P[1] = wrapWordIndex(i32NumYWords, wordY);
            indices.Q[0] = wrapWordIndex(i32NumXWords, wordX + 1);
            indices.Q[1] = wrapWordIndex(i32NumYWords, wordY);
            indices.R[0] = wrapWordIndex(i32NumXWords, wordX);
            indices.R[1] = wrapWordIndex(i32NumYWords, wordY + 1);
            indices.S[0] = wrapWordIndex(i32NumXWords, wordX + 1);
            indices.S[1] = wrapWordIndex(i32NumYWords, wordY + 1);
            const WordOffsets = new Uint32Array([
                TwiddleUV(i32NumXWords, i32NumYWords, indices.P[0], indices.P[1]) * 2,
                TwiddleUV(i32NumXWords, i32NumYWords, indices.Q[0], indices.Q[1]) * 2,
                TwiddleUV(i32NumXWords, i32NumYWords, indices.R[0], indices.R[1]) * 2,
                TwiddleUV(i32NumXWords, i32NumYWords, indices.S[0], indices.S[1]) * 2,
            ]);
            const P = new PVRTCWord();
            const Q = new PVRTCWord();
            const R = new PVRTCWord();
            const S = new PVRTCWord();
            P.modulationData[0] = pWordMembers[WordOffsets[0]];
            P.colorData[0] = pWordMembers[WordOffsets[0] + 1];
            Q.modulationData[0] = pWordMembers[WordOffsets[1]];
            Q.colorData[0] = pWordMembers[WordOffsets[1] + 1];
            R.modulationData[0] = pWordMembers[WordOffsets[2]];
            R.colorData[0] = pWordMembers[WordOffsets[2] + 1];
            S.modulationData[0] = pWordMembers[WordOffsets[3]];
            S.colorData[0] = pWordMembers[WordOffsets[3] + 1];
            pvrtcGetDecompressedPixels(P, Q, R, S, pPixels, bpp);
            mapDecompressedData(pOutData, width, pPixels, indices, bpp);
        }
    }
    return width * height / ((wordWidth / 2) >>> 0);
}
function flat32(data, asBufer) {
    const retval = asBufer ? Buffer.alloc(data.length * 4) : new Uint8Array(data.length * 4);
    for (let i = 0; i < data.length; i++) {
        retval[i * 4] = data[i].red[0];
        retval[i * 4 + 1] = data[i].green[0];
        retval[i * 4 + 2] = data[i].blue[0];
        retval[i * 4 + 3] = data[i].alpha[0];
    }
    return retval;
}
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
export function decodePVRTC2bit(src, width, height) {
    return decodePVRTC(src, width, height, true);
}
export function decodePVRTC4bit(src, width, height) {
    return decodePVRTC(src, width, height, false);
}
function check_size(width, height, bpp, src) {
    const size_needed = width * height * bpp / 8;
    if (src.length < size_needed) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`);
    }
}
export function decodePVRTC(src, width, height, Do2bitMode) {
    if (!arraybuffcheck(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    check_size(width, height, Do2bitMode ? 2 : 4, src);
    var XTrueDim = Math.max(width, (Do2bitMode ? 16 : 8));
    var YTrueDim = Math.max(height, 8);
    if (XTrueDim != width || YTrueDim != height) {
        throw new Error("Image size too small for data supplied");
    }
    const size_needed = width * height * (Do2bitMode ? 2 : 4) / 8;
    if (src.length < size_needed) {
        throw new Error("Image size too small for data supplied");
    }
    var pDecompressedData = Array.from({ length: XTrueDim * YTrueDim });
    pvrtcDecompress(src, pDecompressedData, XTrueDim, YTrueDim, Do2bitMode ? 2 : 4);
    return flat32(pDecompressedData, isBuffer(src));
}
