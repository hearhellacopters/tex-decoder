"use strict";
//source
//https://docs.rs/texture2ddecoder/latest/src/texture2ddecoder/atc.rs.html
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeATC4 = exports.decodeATC8 = exports.decodeATC = exports.decodeBC5 = exports.decodeATI2 = exports.decodeBC4 = exports.decodeATI = exports.decodeATI1 = void 0;
function decode_atc_rgb4_block(data, //&[u8] 
outbuf //&mut [u32]
) {
    const color0 = data[0] | (data[1] << 8);
    const color1 = data[2] | (data[3] << 8);
    var sels = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
    const mode = (color0 & 0x8000) != 0;
    let c = new Uint8Array(16);
    c[0] = (color0 >> 10) & 31; //c[0].r
    c[1] = (color0 >> 5) & 31; //c[0].g
    c[2] = color0 & 31; //c[0].b
    c[3] = 255; //c[0].a
    c[0] = (c[0] << 3) | (c[0] >> 2);
    c[1] = (c[1] << 3) | (c[1] >> 2);
    c[2] = (c[2] << 3) | (c[2] >> 2);
    c[12] = (color1 >> 11) & 31; //c[3].r
    c[13] = (color1 >> 5) & 63; //c[3].g
    c[14] = color1 & 31; //c[3].b
    c[15] = 255; //c[3].a
    c[12] = (c[12] << 3) | (c[12] >> 2);
    c[13] = (c[13] << 2) | (c[13] >> 4);
    c[14] = (c[14] << 3) | (c[14] >> 2);
    if (mode) {
        //c[1].set
        c[4] = Math.max(0, c[0] - (c[12] >> 2));
        c[5] = Math.max(0, c[1] - (c[13] >> 2));
        c[6] = Math.max(0, c[2] - (c[14] >> 2));
        c[7] = 255;
        //c[2] = c[0];
        c[8] = c[0];
        c[9] = c[1];
        c[10] = c[2];
        c[11] = c[3];
        //c[0].set
        c[0] = 0;
        c[1] = 0;
        c[2] = 0;
        c[3] = 255;
    }
    else {
        c[4] = (c[0] * 5 + c[12] * 3) >> 3;
        c[5] = (c[1] * 5 + c[13] * 3) >> 3;
        c[6] = (c[2] * 5 + c[14] * 3) >> 3;
        c[7] = 255;
        c[8] = (c[0] * 3 + c[12] * 5) >> 3;
        c[9] = (c[1] * 3 + c[13] * 5) >> 3;
        c[10] = (c[2] * 3 + c[14] * 5) >> 3;
        c[11] = 255;
    }
    for (var i = 0; i < 16; i++) {
        var s = sels & 3;
        const read = (((c[s * 4 + 3] & 0xFF) << 24) |
            ((c[s * 4 + 2] & 0xFF) << 16) |
            ((c[s * 4 + 1] & 0xFF) << 8) |
            (c[s * 4 + 0] & 0xFF));
        outbuf[i] = read;
        sels >>= 2;
    }
}
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
function copy_block_buffer(bx, by, w, h, bw, bh, buffer, image) {
    let x = bw * bx;
    let copy_width = bw * (bx + 1) > w ? (w - bw * bx) : bw;
    let y_0 = by * bh;
    let copy_height = bh * (by + 1) > h ? h - y_0 : bh;
    let buffer_offset = 0;
    for (let y = y_0; y < y_0 + copy_height; y++) {
        let image_offset = y * w + x;
        let bufferIndex = buffer_offset;
        for (let i = 0; i < copy_width; i++) {
            image[image_offset + i] = buffer[bufferIndex];
            bufferIndex++;
        }
        buffer_offset += bw;
    }
}
function decode_bc3_alpha(data, outbuf, channel) {
    // use u16 to avoid overflow and replicate equivalent behavior to C++ code
    const a = new Uint16Array([data[0], data[1], 0, 0, 0, 0, 0, 0]);
    if (a[0] > a[1]) {
        a[2] = (a[0] * 6 + a[1]) / 7;
        a[3] = (a[0] * 5 + a[1] * 2) / 7;
        a[4] = (a[0] * 4 + a[1] * 3) / 7;
        a[5] = (a[0] * 3 + a[1] * 4) / 7;
        a[6] = (a[0] * 2 + a[1] * 5) / 7;
        a[7] = (a[0] + a[1] * 6) / 7;
    }
    else {
        a[2] = (a[0] * 4 + a[1]) / 5;
        a[3] = (a[0] * 3 + a[1] * 2) / 5;
        a[4] = (a[0] * 2 + a[1] * 3) / 5;
        a[5] = (a[0] + a[1] * 4) / 5;
        a[6] = 0;
        a[7] = 255;
    }
    var value = BigInt(0);
    for (let i = 0; i < 8; i++) {
        value = value | BigInt((data[i] & 0xFF)) << BigInt(8 * i);
    }
    value = value >> 16n;
    var d = Number(value & 0xffffffffn);
    var channel_shift = channel * 8;
    var channel_mask = 0xFFFFFFFF ^ (0xFF << channel_shift);
    for (let p = 0; p < outbuf.length; p++) {
        outbuf[p] = (outbuf[p] & channel_mask) | (a[d & 7]) << channel_shift;
        d >>= 3;
    }
}
/**
 * Decompress ATI1. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATI1(src, width, height) {
    return decodeBC4(src, width, height);
}
exports.decodeATI1 = decodeATI1;
/**
 * Decompress ATI data. Will do ATI1 unless do2 is true.
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do2 - Run ATI2 instead of ATI1 (default ATI1)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATI(src, width, height, Do2) {
    if (Do2) {
        return decodeBC5(src, width, height);
    }
    else {
        return decodeBC4(src, width, height);
    }
}
exports.decodeATI = decodeATI;
/**
 * Decompress BC4 (aka ATI1). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeBC4(src, width, height) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const image = new Uint32Array(width * height);
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 8;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_WIDTH - 1) / BLOCK_HEIGHT);
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080);
    if (src.length < (num_blocks_x * num_blocks_y * raw_block_size)) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            decode_bc3_alpha(src.subarray(data_offset, data_offset + raw_block_size), buffer, 2);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeBC4 = decodeBC4;
/**
 * Decompress ATI2. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATI2(src, width, height) {
    return decodeBC5(src, width, height);
}
exports.decodeATI2 = decodeATI2;
/**
 * Decompress BC5 (aka ATI2). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeBC5(src, width, height) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const image = new Uint32Array(width * height);
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 16;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_WIDTH - 1) / BLOCK_HEIGHT);
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080);
    if (src.length < (num_blocks_x * num_blocks_y * raw_block_size)) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            decode_bc3_alpha(src.subarray(data_offset, data_offset + raw_block_size), buffer, 2);
            decode_bc3_alpha(src.subarray(data_offset + 8, data_offset + 8 + raw_block_size), buffer, 1);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeBC5 = decodeBC5;
/**
 * Decompress ATC. Can do 8 or 4 bit mode (default 4).
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do8bitMode - Do 8 bit mode (Default 4)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATC(src, width, height, Do8bitMode) {
    if (Do8bitMode) {
        return decodeATC8(src, width, height);
    }
    else {
        return decodeATC4(src, width, height);
    }
}
exports.decodeATC = decodeATC;
/**
 * Decompress ATC8. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATC8(src, width, height) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const image = new Uint32Array(width * height);
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 16;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_WIDTH - 1) / BLOCK_HEIGHT);
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080);
    if (src.length < (num_blocks_x * num_blocks_y * raw_block_size)) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            decode_atc_rgb4_block(src.subarray(data_offset + 8, data_offset + 8 + raw_block_size), buffer);
            decode_bc3_alpha(src.subarray(data_offset, data_offset + raw_block_size), buffer, 3);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeATC8 = decodeATC8;
/**
 * Decompress ATC4. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeATC4(src, width, height) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const image = new Uint32Array(width * height);
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 8;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_WIDTH - 1) / BLOCK_HEIGHT);
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080);
    if (src.length < (num_blocks_x * num_blocks_y * raw_block_size)) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            decode_atc_rgb4_block(src.subarray(data_offset, data_offset + raw_block_size), buffer);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeATC4 = decodeATC4;
