"use strict";
//source
//https://github.com/K0lb3/tex2img/blob/e041424880234d41ef16257ac5c9d773d65a2e7f/src/basisu/basisu_gpu_texture.cpp
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeFXT1 = void 0;
const bireader_1 = require("bireader");
class color_rgba {
    constructor(r, g, b, a) {
        this.r = r ? r & 0xFF : 0;
        this.g = g ? g & 0xFF : 0;
        this.b = b ? b & 0xFF : 0;
        this.a = a ? a & 0xFF : 0;
    }
    data() {
        return (((this.a & 0xFF) << 24) | ((this.b & 0xFF) << 16) | ((this.g & 0xFF) << 8) | (this.r & 0xFF));
    }
}
class fxt1_block {
    constructor(data) {
        const br = new bireader_1.bireader(data);
        this.m_lo = {
            m_t00: br.ubit(2),
            m_t01: br.ubit(2),
            m_t02: br.ubit(2),
            m_t03: br.ubit(2),
            m_t04: br.ubit(2),
            m_t05: br.ubit(2),
            m_t06: br.ubit(2),
            m_t07: br.ubit(2),
            m_t08: br.ubit(2),
            m_t09: br.ubit(2),
            m_t10: br.ubit(2),
            m_t11: br.ubit(2),
            m_t12: br.ubit(2),
            m_t13: br.ubit(2),
            m_t14: br.ubit(2),
            m_t15: br.ubit(2),
            m_t16: br.ubit(2),
            m_t17: br.ubit(2),
            m_t18: br.ubit(2),
            m_t19: br.ubit(2),
            m_t20: br.ubit(2),
            m_t21: br.ubit(2),
            m_t22: br.ubit(2),
            m_t23: br.ubit(2),
            m_t24: br.ubit(2),
            m_t25: br.ubit(2),
            m_t26: br.ubit(2),
            m_t27: br.ubit(2),
            m_t28: br.ubit(2),
            m_t29: br.ubit(2),
            m_t30: br.ubit(2),
            m_t31: br.ubit(2)
        };
        br.rewind();
        this.m_lo_bits = br.uint64();
        br.rewind();
        this.m_sels = new Uint8Array(8);
        for (let i = 0; i < 8; i++) {
            this.m_sels[i] = br.ubyte();
        }
        this.m_hi = {
            m_b0: br.ubit(5),
            m_g0: br.ubit(5),
            m_r0: br.ubit(5),
            m_b1: br.ubit(5),
            m_g1: br.ubit(5),
            m_r1: br.ubit(5),
            m_b2: br.ubit(5),
            m_g2: br.ubit(5),
            m_r2: br.ubit(5),
            m_b3: br.ubit(5),
            m_g3: br.ubit(5),
            m_r3: br.ubit(5),
            m_alpha: br.ubit(1),
            m_glsb: br.ubit(2),
            m_mode: br.ubit(1)
        };
        br.skip(-8);
        this.m_hi_bits = br.uint64();
    }
}
function expand_565(c) {
    return new color_rgba((c.r << 3) | (c.r >> 2), (c.g << 2) | (c.g >> 4), (c.b << 3) | (c.b >> 2), 255);
}
function unpack_FXT1(data, pPixels) {
    const pBlock = new fxt1_block(data);
    if (pBlock.m_hi.m_mode == 0) {
        throw new Error("Only support CC_MIXED non-alpha blocks");
    }
    if (pBlock.m_hi.m_alpha == 1) {
        throw new Error("Does not support alpha. Only support CC_MIXED non-alpha blocks");
    }
    const colors = Array.from({ length: 4 }, () => new color_rgba());
    colors[0].r = pBlock.m_hi.m_r0;
    colors[0].g = ((pBlock.m_hi.m_g0 << 1) | ((pBlock.m_lo.m_t00 >> 1) ^ (pBlock.m_hi.m_glsb & 1))) & 0xFF;
    colors[0].b = pBlock.m_hi.m_b0;
    colors[0].a = 255;
    colors[1].r = pBlock.m_hi.m_r1;
    colors[1].g = ((pBlock.m_hi.m_g1 << 1) | (pBlock.m_hi.m_glsb & 1)) & 0xFF;
    colors[1].b = pBlock.m_hi.m_b1;
    colors[1].a = 255;
    colors[2].r = pBlock.m_hi.m_r2;
    colors[2].g = ((pBlock.m_hi.m_g2 << 1) | ((pBlock.m_lo.m_t16 >> 1) ^ (pBlock.m_hi.m_glsb >> 1))) & 0xFF;
    colors[2].b = pBlock.m_hi.m_b2;
    colors[2].a = 255;
    colors[3].r = pBlock.m_hi.m_r3;
    colors[3].g = ((pBlock.m_hi.m_g3 << 1) | (pBlock.m_hi.m_glsb >> 1)) & 0xFF;
    colors[3].b = pBlock.m_hi.m_b3;
    colors[3].a = 255;
    for (var i = 0; i < 4; i++) {
        colors[i] = expand_565(colors[i]);
    }
    const block0_colors = Array.from({ length: 4 });
    block0_colors[0] = new color_rgba(colors[0].r, colors[0].g, colors[0].b, colors[0].a);
    block0_colors[1] = new color_rgba((colors[0].r * 2 + colors[1].r + 1) / 3, (colors[0].g * 2 + colors[1].g + 1) / 3, (colors[0].b * 2 + colors[1].b + 1) / 3, 255);
    block0_colors[2] = new color_rgba((colors[1].r * 2 + colors[0].r + 1) / 3, (colors[1].g * 2 + colors[0].g + 1) / 3, (colors[1].b * 2 + colors[0].b + 1) / 3, 255);
    block0_colors[3] = new color_rgba(colors[1].r, colors[1].g, colors[1].b, colors[1].a);
    for (var i = 0; i < 16; i++) {
        const sel = (pBlock.m_sels[i >> 2] >> ((i & 3) * 2)) & 3;
        const x = i & 3;
        const y = i >> 2;
        pPixels[x + y * 8] = new color_rgba(block0_colors[sel].r, block0_colors[sel].g, block0_colors[sel].b, block0_colors[sel].a);
    }
    const block1_colors = Array.from({ length: 4 });
    block1_colors[0] = new color_rgba(colors[2].r, colors[2].g, colors[2].b, colors[2].a);
    block1_colors[1] = new color_rgba((colors[2].r * 2 + colors[3].r + 1) / 3, (colors[2].g * 2 + colors[3].g + 1) / 3, (colors[2].b * 2 + colors[3].b + 1) / 3, 255);
    block1_colors[2] = new color_rgba((colors[3].r * 2 + colors[2].r + 1) / 3, (colors[3].g * 2 + colors[2].g + 1) / 3, (colors[3].b * 2 + colors[2].b + 1) / 3, 255);
    block1_colors[3] = new color_rgba(colors[3].r, colors[3].g, colors[3].b, colors[3].a);
    for (var i = 0; i < 16; i++) {
        const sel = (pBlock.m_sels[4 + (i >> 2)] >> ((i & 3) * 2)) & 3;
        const x = i & 3;
        const y = i >> 2;
        pPixels[4 + x + y * 8] = new color_rgba(block1_colors[sel].r, block1_colors[sel].g, block1_colors[sel].b, block1_colors[sel].a);
    }
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
            image[image_offset + i] = buffer[bufferIndex].data();
            bufferIndex++;
        }
        buffer_offset += bw;
    }
}
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
/**
 * Decompress FXT1 data. Returns Buffer or Uint8Array based on source data type.
 *
 * Note: Only supports CC_MIXED or RGB non-alpha data.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeFXT1(data, width, height) {
    if (!isArrayOrBuffer(data)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const num_blocks_x = Math.floor((width + 4 - 1) / 4);
    const num_blocks_y = Math.floor((height + 4 - 1) / 4);
    const raw_block_size = 16;
    var buffer = [];
    var image = new Uint32Array(width * height);
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            unpack_FXT1(data.subarray(data_offset, data_offset + raw_block_size), buffer);
            copy_block_buffer(bx, by, width, height, 4, 4, buffer, image);
            data_offset += raw_block_size;
            buffer = [];
        }
    }
    if (isBuffer(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeFXT1 = decodeFXT1;
