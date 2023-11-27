import { deflate, inflate } from './deflate/index';
import { bireader, biwriter } from 'bireader';
const PNG = require('pngjs').PNG;
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
const CONSTANTS = {
    PNG_SIGNATURE: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    PNG_sRGB: [0x00, 0x00, 0x00, 0x04, 0x67, 0x41, 0x4D, 0x41, 0x00, 0x00, 0xB1, 0x8F, 0x0B, 0xFC, 0x61, 0x05, 0x00, 0x00, 0x00, 0x01, 0x73, 0x52, 0x47, 0x42, 0x00, 0xAE, 0xCE, 0x1C, 0xE9],
    PNG_END: [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82],
    TYPE_IHDR: 0x49484452,
    TYPE_IEND: 0x49454e44,
    TYPE_IDAT: 0x49444154,
    TYPE_PLTE: 0x504c5445,
    TYPE_tRNS: 0x74524e53,
    TYPE_gAMA: 0x67414d41,
    TYPE_sRGB: 0x73524742,
    // color-type bits
    COLORTYPE_COLOR: 2, //RGB
    COLORTYPE_COLOR_ALPHA: 6, //RGBA
    COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4,
    },
    BIT_DEPTH: 8,
    GAMMA_DIVISION: 100000,
    GAMMA_DIVISION_SRGB: Math.floor((1 / 2.2) * 100000),
    CHUNK_SIZE: 32 * 1024,
    DEFLATE_LEVEL: 9,
    DEFLATE_STRAT: 3,
    FILTER: 0,
    COMP: 0,
    INTER: 0
};
/**
 * Cyclic Redundancy Check 32
 * @param {string|Uint8Array|Buffer} message - Message as string, Uint8Array or Buffer
 * @returns number
 */
export function CRC32(message) {
    var bytes;
    if (typeof message == "string") {
        for (var byte = [], i = 0; i < message.length; i++) {
            byte.push(message.charCodeAt(i) & 0xFF);
        }
        bytes = byte;
    }
    else if (arraybuffcheck(message)) {
        bytes = message;
    }
    else {
        throw new Error("Message must be either String, Buffer or Uint8Array");
    }
    const divisor = 0xEDB88320;
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
        crc = (crc ^ byte);
        for (let i = 0; i < 8; i++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ divisor;
            }
            else {
                crc = crc >>> 1;
            }
        }
    }
    var retval = crc ^ 0xFFFFFFFF;
    if (retval >= 0) {
        return retval;
    }
    return 0xFFFFFFFF - (retval * -1) + 1;
}
/**
 * Reads .png file and returns meta data and unzipped data. Must be `Uint8Array` or `Buffer`.
 *
 * Unzipped data will be same type as source.
 *
 * @param {Uint8Array|Buffer} src - Source .png data as Uint8Array or Buffer.
 * @returns {retval} object with meta and unzipped data.
 */
export function readPNG(src) {
    const br = new bireader(src);
    br.be();
    if (!(br.ubyte() == 0x89)) {
        throw new Error('Bad magics, first byte should be 0x89.');
    }
    const magic = br.string({ length: 3 });
    if (!(magic == "PNG")) {
        throw new Error('Bad magics, should be PNG.');
    }
    const sig = br.uint32();
    if (sig != 218765834) {
        throw new Error('Bad sig, should be 218765834.');
    }
    var width = 0;
    var height = 0;
    var bit_depth = 0;
    var color_type = 0;
    var compression = 0;
    var filter = 0;
    var interlace = 0;
    var size = br.size;
    var index = 0;
    const chunks = new biwriter();
    while (index != size) {
        const obj = {};
        obj.len = br.uint32();
        obj.type = br.string({ length: 4 });
        br.skip(-4);
        const chunk_data = br.extract(obj.len + 4, true);
        obj.crc = br.uint32();
        var test_crc = CRC32(chunk_data);
        if (test_crc != obj.crc) {
            throw new Error("Bad CRC @" + br.getOffset() + " got " + test_crc + " needed " + obj.crc);
        }
        if (obj.type == "IHDR") {
            const IHDR_chunk = new bireader(chunk_data);
            IHDR_chunk.be();
            IHDR_chunk.skip(4);
            width = IHDR_chunk.uint32();
            height = IHDR_chunk.uint32();
            bit_depth = IHDR_chunk.ubyte();
            color_type = IHDR_chunk.ubyte();
            compression = IHDR_chunk.ubyte();
            filter = IHDR_chunk.ubyte();
            interlace = IHDR_chunk.ubyte();
        }
        else if (obj.type = "IDAT") {
            chunks.insert(chunk_data.subarray(4), true);
        }
        index = br.getOffset();
    }
    const zippeddata = chunks.get();
    const unzipped = inflate(zippeddata);
    var retval = unzipped;
    if (isBuffer(src)) {
        if (!isBuffer(unzipped)) {
            retval = Buffer.from(unzipped);
        }
    }
    else {
        if (isBuffer(unzipped)) {
            retval = new Uint8Array(unzipped);
        }
    }
    return {
        width: width,
        height: height,
        bit_depth: bit_depth,
        color_type: color_type,
        compression: compression,
        filter: filter,
        interlace: interlace,
        color_data: retval
    };
}
;
/**
 * Create a .png file. Must be straight ABGR or BGR profile.
 *
 * @param {Uint8Array|Buffer} src - Must be ABGR or BGR color profiles (PNG is big endian)
 * @param {number} width - Width height
 * @param {number} height - Image height
 * @param {boolean} noAlpha - If the color profile is BGR
 * @param {boolean} issRGB - if the color space is sRGB
 * @returns
 */
export function makePNG2(src, width, height, noAlpha, issRGB) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer.");
    }
    var COLORTYPE = CONSTANTS.COLORTYPE_COLOR_ALPHA;
    if (noAlpha) {
        COLORTYPE = CONSTANTS.COLORTYPE_COLOR;
    }
    var data = new Uint8Array(CONSTANTS.PNG_SIGNATURE);
    if (isBuffer(src)) {
        data = Buffer.from(CONSTANTS.PNG_SIGNATURE);
    }
    const bw = new biwriter(data);
    bw.be();
    bw.goto(bw.size);
    bw.uint32(0); //dummy chunk size
    var chunk_start = bw.getOffset();
    bw.uint32(CONSTANTS.TYPE_IHDR);
    bw.uint32(width);
    bw.uint32(height);
    bw.ubyte(CONSTANTS.BIT_DEPTH);
    bw.ubyte(COLORTYPE);
    bw.ubyte(CONSTANTS.COMP);
    bw.ubyte(CONSTANTS.FILTER);
    bw.ubyte(CONSTANTS.INTER);
    var chunk_end = bw.getOffset();
    bw.goto(chunk_start);
    var to_CRC = bw.extract(chunk_end - chunk_start);
    bw.goto(chunk_start - 4);
    bw.uint32(to_CRC.length - 4); //chunk size
    var crc = CRC32(to_CRC);
    bw.goto(chunk_end);
    bw.uint32(crc); //crc
    if (issRGB) {
        if (isBuffer(src)) {
            data = Buffer.from(CONSTANTS.PNG_sRGB);
        }
        else {
            data = new Uint8Array(CONSTANTS.PNG_sRGB);
        }
        bw.insert(data, true);
    }
    var zipped_data = deflate(src, {
        level: CONSTANTS.DEFLATE_LEVEL,
        chunkSize: CONSTANTS.CHUNK_SIZE,
        strategy: CONSTANTS.DEFLATE_STRAT
    });
    if (isBuffer(src)) {
        zipped_data = Buffer.from(zipped_data);
    }
    bw.uint32(zipped_data.length); //chunk size
    chunk_start = bw.getOffset();
    bw.uint32(CONSTANTS.TYPE_IDAT);
    bw.insert(zipped_data, true);
    chunk_end = bw.getOffset();
    bw.goto(chunk_start);
    to_CRC = bw.extract(chunk_end - chunk_start);
    crc = CRC32(to_CRC);
    bw.goto(chunk_end);
    bw.uint32(crc); //crc
    if (isBuffer(src)) {
        data = Buffer.from(CONSTANTS.PNG_END);
    }
    else {
        data = new Uint8Array(CONSTANTS.PNG_END);
    }
    bw.insert(data, true);
    return bw.get();
}
/**
 * Create a .png file. Must be straight RGB or RGBA profile.
 *
 * @param {Uint8Array|Buffer} src - Must be RGBA or RGB color profiles (PNG is big endian)
 * @param {number} width - Width height
 * @param {number} height - Image height
 * @param {boolean} noAlpha - If the color profile is RGB
 * @param {boolean} issRGB - if the color space is sRGB
 * @returns
 */
export function makePNG(src, width, height, noAlpha, issRGB) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer.");
    }
    var COLORTYPE = CONSTANTS.COLORTYPE_COLOR_ALPHA;
    if (noAlpha) {
        COLORTYPE = CONSTANTS.COLORTYPE_COLOR;
    }
    const options = {
        width: width,
        height: height,
        alpha: COLORTYPE == CONSTANTS.COLORTYPE_COLOR_ALPHA ? true : false,
        colorType: COLORTYPE,
    };
    const newfile = new PNG(options);
    if (issRGB) {
        newfile.gamma = CONSTANTS.GAMMA_DIVISION;
    }
    // Copy RGBA data to the PNG object
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            newfile.data[idx] = src[idx];
            newfile.data[idx + 1] = src[idx + 1];
            newfile.data[idx + 2] = src[idx + 2];
            newfile.data[idx + 3] = src[idx + 3];
        }
    }
    return PNG.sync.write(newfile, options);
}
//# sourceMappingURL=png_maker.js.map