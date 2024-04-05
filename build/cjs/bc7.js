"use strict";
//source
//https://docs.rs/texture2ddecoder/latest/src/texture2ddecoder/bcn/bc7.rs.html
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBC7 = void 0;
const bireader_1 = require("bireader");
function color(r, g, b, a) {
    return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;
}
const S_BPTC_A2 = new Uint32Array([
    15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 8, 2, 2, 8, 8, 15, 2, 8,
    2, 2, 8, 8, 2, 2, 15, 15, 6, 8, 2, 8, 15, 15, 2, 8, 2, 2, 2, 15, 15, 6, 6, 2, 6, 8, 15, 15, 2,
    2, 15, 15, 15, 15, 15, 2, 2, 15,
]);
const S_BPTC_A3 = [
    new Uint32Array([
        3, 3, 15, 15, 8, 3, 15, 15, 8, 8, 6, 6, 6, 5, 3, 3, 3, 3, 8, 15, 3, 3, 6, 10, 5, 8, 8, 6,
        8, 5, 15, 15, 8, 15, 3, 5, 6, 10, 8, 15, 15, 3, 15, 5, 15, 15, 15, 15, 3, 15, 5, 5, 5, 8,
        5, 10, 5, 10, 8, 13, 15, 12, 3, 3,
    ]),
    new Uint32Array([
        15, 8, 8, 3, 15, 15, 3, 8, 15, 15, 15, 15, 15, 15, 15, 8, 15, 8, 15, 3, 15, 8, 15, 8, 3,
        15, 6, 10, 15, 15, 10, 8, 15, 3, 15, 10, 10, 8, 9, 10, 6, 15, 8, 15, 3, 6, 6, 8, 15, 3, 15,
        15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 15, 15, 8,
    ]),
];
const S_BPTC_FACTORS = [
    new Uint8Array([0, 21, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 9, 18, 27, 37, 46, 55, 64, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64]),
];
const S_BPTC_P2 = new Uint32Array([
    0xcccc, 0x8888, 0xeeee, 0xecc8,
    0xc880, 0xfeec, 0xfec8, 0xec80,
    0xc800, 0xffec, 0xfe80, 0xe800,
    0xffe8, 0xff00, 0xfff0, 0xf000,
    0xf710, 0x008e, 0x7100, 0x08ce,
    0x008c, 0x7310, 0x3100, 0x8cce,
    0x088c, 0x3110, 0x6666, 0x366c,
    0x17e8, 0x0ff0, 0x718e, 0x399c,
    0xaaaa, 0xf0f0, 0x5a5a, 0x33cc,
    0x3c3c, 0x55aa, 0x9696, 0xa55a,
    0x73ce, 0x13c8, 0x324c, 0x3bdc,
    0x6996, 0xc33c, 0x9966, 0x0660,
    0x0272, 0x04e4, 0x4e40, 0x2720,
    0xc936, 0x936c, 0x39c6, 0x639c,
    0x9336, 0x9cc6, 0x817e, 0xe718,
    0xccf0, 0x0fcc, 0x7744, 0xee22,
]);
const S_BPTC_P3 = new Uint32Array([
    0xaa685050, 0x6a5a5040, 0x5a5a4200, 0x5450a0a8,
    0xa5a50000, 0xa0a05050, 0x5555a0a0, 0x5a5a5050,
    0xaa550000, 0xaa555500, 0xaaaa5500, 0x90909090,
    0x94949494, 0xa4a4a4a4, 0xa9a59450, 0x2a0a4250,
    0xa5945040, 0x0a425054, 0xa5a5a500, 0x55a0a0a0,
    0xa8a85454, 0x6a6a4040, 0xa4a45000, 0x1a1a0500,
    0x0050a4a4, 0xaaa59090, 0x14696914, 0x69691400,
    0xa08585a0, 0xaa821414, 0x50a4a450, 0x6a5a0200,
    0xa9a58000, 0x5090a0a8, 0xa8a09050, 0x24242424,
    0x00aa5500, 0x24924924, 0x24499224, 0x50a50a50,
    0x500aa550, 0xaaaa4444, 0x66660000, 0xa5a0a5a0,
    0x50a050a0, 0x69286928, 0x44aaaa44, 0x66666600,
    0xaa444444, 0x54a854a8, 0x95809580, 0x96969600,
    0xa85454a8, 0x80959580, 0xaa141414, 0x96960000,
    0xaaaa1414, 0xa05050a0, 0xa0a5a5a0, 0x96000000,
    0x40804080, 0xa9a8a9a8, 0xaaaaaa44, 0x2a4a5254,
]);
const S_BP7_MODE_INFO = [
    {
        num_subsets: 3,
        partition_bits: 4,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 4,
        alpha_bits: 0,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: new Uint32Array([3, 0]),
    },
    {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 6,
        alpha_bits: 0,
        endpoint_pbits: 0,
        shared_pbits: 1,
        index_bits: new Uint32Array([3, 0]),
    },
    {
        num_subsets: 3,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 5,
        alpha_bits: 0,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: new Uint32Array([2, 0]),
    },
    {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 0,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: new Uint32Array([2, 0]),
    },
    {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 2,
        index_selection_bits: 1,
        color_bits: 5,
        alpha_bits: 6,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: new Uint32Array([2, 3]),
    },
    {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 2,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 8,
        endpoint_pbits: 0,
        shared_pbits: 0,
        index_bits: new Uint32Array([2, 2]),
    },
    {
        num_subsets: 1,
        partition_bits: 0,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 7,
        alpha_bits: 7,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: new Uint32Array([4, 0]),
    },
    {
        num_subsets: 2,
        partition_bits: 6,
        rotation_bits: 0,
        index_selection_bits: 0,
        color_bits: 5,
        alpha_bits: 5,
        endpoint_pbits: 1,
        shared_pbits: 0,
        index_bits: new Uint32Array([2, 0]),
    },
];
function expand_quantized(v, bits) {
    let s = ((v) << (8 - bits)) & 0xFF;
    return s | (s >>> bits);
}
function decode_bc7_block(data, outbuf, block_num) {
    let bit = new bireader_1.bireader(data);
    let mode = 0;
    while (0 == bit.ubit(1) && mode < 8) {
        mode += 1;
    }
    if (mode == 8) {
        for (let i = 0; i < 16; i++) {
            outbuf[i] = 0;
        }
        return;
    }
    let mi = S_BP7_MODE_INFO[mode];
    let mode_pbits = 0 != mi.endpoint_pbits ? mi.endpoint_pbits : mi.shared_pbits;
    let partition_set_idx = mi.partition_bits == 0 ? 0 : bit.ubit(mi.partition_bits);
    let rotation_mode = mi.rotation_bits == 0 ? 0 : bit.ubit(mi.rotation_bits);
    let index_selection_mode = mi.index_selection_bits == 0 ? 0 : bit.ubit(mi.index_selection_bits);
    let ep_r = new Uint8Array(6);
    let ep_g = new Uint8Array(6);
    let ep_b = new Uint8Array(6);
    let ep_a = new Uint8Array(6);
    for (let ii = 0; ii < mi.num_subsets; ii++) {
        ep_r[ii * 2] = (bit.ubit(mi.color_bits) << mode_pbits);
        ep_r[ii * 2 + 1] = (bit.ubit(mi.color_bits) << mode_pbits);
    }
    for (let ii = 0; ii < mi.num_subsets; ii++) {
        ep_g[ii * 2] = (bit.ubit(mi.color_bits) << mode_pbits);
        ep_g[ii * 2 + 1] = (bit.ubit(mi.color_bits) << mode_pbits);
    }
    for (let ii = 0; ii < mi.num_subsets; ii++) {
        ep_b[ii * 2] = (bit.ubit(mi.color_bits) << mode_pbits);
        ep_b[ii * 2 + 1] = (bit.ubit(mi.color_bits) << mode_pbits);
    }
    if (mi.alpha_bits > 0) {
        for (let ii = 0; ii < mi.num_subsets; ii++) {
            ep_a[ii * 2] = (bit.ubit(mi.alpha_bits) << mode_pbits);
            ep_a[ii * 2 + 1] = (bit.ubit(mi.alpha_bits) << mode_pbits);
        }
    }
    else {
        ep_a.fill(0xff);
    }
    if (0 != mode_pbits) {
        for (let ii = 0; ii < mi.num_subsets; ii++) {
            let pda = bit.ubit(mode_pbits);
            let pdb = 0 == mi.shared_pbits ? bit.ubit(mode_pbits) : pda;
            ep_r[ii * 2] |= pda;
            ep_r[ii * 2 + 1] |= pdb;
            ep_g[ii * 2] |= pda;
            ep_g[ii * 2 + 1] |= pdb;
            ep_b[ii * 2] |= pda;
            ep_b[ii * 2 + 1] |= pdb;
            ep_a[ii * 2] |= pda;
            ep_a[ii * 2 + 1] |= pdb;
        }
    }
    let color_bits = mi.color_bits + mode_pbits;
    for (let ii = 0; ii < mi.num_subsets; ii++) {
        ep_r[ii * 2] = expand_quantized(ep_r[ii * 2], color_bits);
        ep_r[ii * 2 + 1] = expand_quantized(ep_r[ii * 2 + 1], color_bits);
        ep_g[ii * 2] = expand_quantized(ep_g[ii * 2], color_bits);
        ep_g[ii * 2 + 1] = expand_quantized(ep_g[ii * 2 + 1], color_bits);
        ep_b[ii * 2] = expand_quantized(ep_b[ii * 2], color_bits);
        ep_b[ii * 2 + 1] = expand_quantized(ep_b[ii * 2 + 1], color_bits);
    }
    if (mi.alpha_bits > 0) {
        let alpha_bits = mi.alpha_bits + mode_pbits;
        for (let ii = 0; ii < mi.num_subsets; ii++) {
            ep_a[ii * 2] = expand_quantized(ep_a[ii * 2], alpha_bits);
            ep_a[ii * 2 + 1] = expand_quantized(ep_a[ii * 2 + 1], alpha_bits);
        }
    }
    let has_index_bits1 = 0 != mi.index_bits[1];
    let factors = [
        S_BPTC_FACTORS[mi.index_bits[0] - 2],
        has_index_bits1 ? S_BPTC_FACTORS[mi.index_bits[1] - 2] : S_BPTC_FACTORS[mi.index_bits[0] - 2],
    ];
    let offset = new Uint32Array([0, mi.num_subsets * (16 * mi.index_bits[0] - 1)]);
    for (var yy = 0; yy < 4; yy++) {
        for (var xx = 0; xx < 4; xx++) {
            var idx = yy * 4 + xx;
            var subset_index = 0;
            var index_anchor = 0;
            switch (mi.num_subsets) {
                case 2:
                    subset_index = (S_BPTC_P2[partition_set_idx] >> idx) & 1;
                    index_anchor = 0 != subset_index ? S_BPTC_A2[partition_set_idx] : 0;
                    break;
                case 3:
                    subset_index = (S_BPTC_P3[partition_set_idx] >> (2 * idx)) & 3;
                    index_anchor = 0 != subset_index ? S_BPTC_A3[subset_index - 1][partition_set_idx] : 0;
                    break;
                default:
                    break;
            }
            var anchor = idx == index_anchor ? 1 : 0;
            var num = new Uint32Array([
                (mi.index_bits[0] - anchor),
                has_index_bits1 ? mi.index_bits[1] - anchor : 0,
            ]);
            var index = new Uint32Array(2);
            bit.skip(0, offset[0]);
            var index_0 = num[0] == 0 ? 0 : bit.ubit(num[0]);
            bit.skip(0, num[0] * -1);
            bit.skip(0, offset[0] * -1);
            if (has_index_bits1) {
                bit.skip(0, offset[1]);
                var index_1 = num[1] == 0 ? 0 : bit.ubit(num[1]);
                bit.skip(0, num[1] * -1);
                bit.skip(0, offset[1] * -1);
                index[0] = index_0;
                index[1] = index_1;
            }
            else {
                index[0] = index_0;
                index[1] = index_0;
            }
            offset[0] += num[0];
            offset[1] += num[1];
            var fc = factors[index_selection_mode][index[index_selection_mode]];
            var fa = factors[1 - index_selection_mode][index[1 - index_selection_mode]];
            var fca = 64 - fc;
            var fcb = fc;
            var faa = 64 - fa;
            var fab = fa;
            subset_index *= 2;
            let rr = ((ep_r[subset_index] * fca + ep_r[subset_index + 1] * fcb + 32) >> 6);
            let gg = ((ep_g[subset_index] * fca + ep_g[subset_index + 1] * fcb + 32) >> 6);
            let bb = ((ep_b[subset_index] * fca + ep_b[subset_index + 1] * fcb + 32) >> 6);
            let aa = ((ep_a[subset_index] * faa + ep_a[subset_index + 1] * fab + 32) >> 6);
            switch (rotation_mode) {
                case 1:
                    var temp1 = aa;
                    aa = rr;
                    rr = temp1;
                    break;
                case 2:
                    var temp1 = aa;
                    aa = gg;
                    gg = temp1;
                    break;
                case 3:
                    var temp1 = aa;
                    aa = bb;
                    bb = temp1;
                    break;
                default:
                    break;
            }
            outbuf[idx] = color(rr, gg, bb, aa);
        }
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
/**
 * Decompress BC7 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
function decodeBC7(data, width, height) {
    if (!isArrayOrBuffer(data)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 16;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_HEIGHT - 1) / BLOCK_HEIGHT);
    if (data.length < num_blocks_x * num_blocks_y * raw_block_size) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${data.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    const image = new Uint32Array(width * height);
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080);
    var data_offset = 0;
    var block_num = 0;
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_bc7_block(data.subarray(data_offset), buffer, block_num);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
            block_num += 1;
        }
    }
    if (isBuffer(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
exports.decodeBC7 = decodeBC7;
