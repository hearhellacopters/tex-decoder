'use strict';

var pngjs = require('pngjs');

function SHIFT(size, startpos) {
    return ((startpos) - (size) + 1);
}
function MASK(size, startpos) {
    return (((2 << (size - 1)) - 1) << SHIFT(size, startpos));
}
function PUTBITS(dest, data, size, startpos) {
    return ((dest & ~MASK(size, startpos)) | ((data << SHIFT(size, startpos)) & MASK(size, startpos)));
}
function SHIFTHIGH(size, startpos) {
    return (((startpos) - 32) - (size) + 1);
}
function MASKHIGH(size, startpos) {
    return (((1 << (size)) - 1) << SHIFTHIGH(size, startpos));
}
function PUTBITSHIGH(dest, data, size, startpos) {
    return ((dest & ~MASKHIGH(size, startpos)) | ((data << SHIFTHIGH(size, startpos)) & MASKHIGH(size, startpos)));
}
function GETBITS(source, size, startpos) {
    return (((source) >> ((startpos) - (size) + 1)) & ((1 << (size)) - 1));
}
function GETBITSHIGH(source, size, startpos) {
    return (((source) >> (((startpos) - 32) - (size) + 1)) & ((1 << (size)) - 1));
}
const R_BITS59T = 4;
const G_BITS59T = 4;
const B_BITS59T = 4;
const R_BITS58H = 4;
const G_BITS58H = 4;
const B_BITS58H = 4;
const R = 0;
const G = 1;
const B = 2;
const BLOCKHEIGHT = 4;
const BLOCKWIDTH = 4;
const TABLE_BITS_59T = 3;
function CLAMP(ll, x, ul) {
    return (((x) < (ll)) ? (ll) : (((x) > (ul)) ? (ul) : (x)));
}
function RED_CHANNEL(img, width, x, y, channels, value) {
    img[channels * (y * width + x) + 0] = value;
    return value;
}
function GREEN_CHANNEL(img, width, x, y, channels, value) {
    img[channels * (y * width + x) + 1] = value;
    return value;
}
function BLUE_CHANNEL(img, width, x, y, channels, value) {
    img[channels * (y * width + x) + 2] = value;
    return value;
}
const table59T = new Uint8Array([3, 6, 11, 16, 23, 32, 41, 64]);
const table58H = new Uint8Array([3, 6, 11, 16, 23, 32, 41, 64]);
const compressParams = [
    new Int32Array([-8, -2, 2, 8]),
    new Int32Array([-8, -2, 2, 8]),
    new Int32Array([-17, -5, 5, 17]),
    new Int32Array([-17, -5, 5, 17]),
    new Int32Array([-29, -9, 9, 29]),
    new Int32Array([-29, -9, 9, 29]),
    new Int32Array([-42, -13, 13, 42]),
    new Int32Array([-42, -13, 13, 42]),
    new Int32Array([-60, -18, 18, 60]),
    new Int32Array([-60, -18, 18, 60]),
    new Int32Array([-80, -24, 24, 80]),
    new Int32Array([-80, -24, 24, 80]),
    new Int32Array([-106, -33, 33, 106]),
    new Int32Array([-106, -33, 33, 106]),
    new Int32Array([-183, -47, 47, 183]),
    new Int32Array([-183, -47, 47, 183])
];
const unscramble = new Int32Array([2, 3, 1, 0]);
var alphaTableInitialized = 0;
const alphaTable = Array.from({ length: 256 }, () => new Int32Array(8));
const alphaBase = [
    new Int32Array([-15, -9, -6, -3]),
    new Int32Array([-13, -10, -7, -3]),
    new Int32Array([-13, -8, -5, -2]),
    new Int32Array([-13, -6, -4, -2]),
    new Int32Array([-12, -8, -6, -3]),
    new Int32Array([-11, -9, -7, -3]),
    new Int32Array([-11, -8, -7, -4]),
    new Int32Array([-11, -8, -5, -3]),
    new Int32Array([-10, -8, -6, -2]),
    new Int32Array([-10, -8, -5, -2]),
    new Int32Array([-10, -8, -4, -2]),
    new Int32Array([-10, -7, -5, -2]),
    new Int32Array([-10, -7, -4, -3]),
    new Int32Array([-10, -3, -2, -1]),
    new Int32Array([-9, -8, -6, -4]),
    new Int32Array([-9, -7, -5, -3])
];
var formatSigned = false;
const PATTERN_H = 0;
const PATTERN_T = 1;
function setupAlphaTable() {
    if (alphaTableInitialized) {
        return;
    }
    alphaTableInitialized = 1;
    var buf;
    for (var i = 16; i < 32; i++) {
        for (var j = 0; j < 8; j++) {
            buf = alphaBase[i - 16][3 - j % 4];
            if (j < 4)
                alphaTable[i][j] = buf;
            else
                alphaTable[i][j] = (-buf - 1);
        }
    }
    for (let i = 0; i < 256; i++) {
        let mul = i / 16;
        let old = 16 + i % 16;
        for (let j = 0; j < 8; j++) {
            alphaTable[i][j] = alphaTable[old][j] * mul;
        }
    }
}
function unstuff57bits(planar_word1, planar_word2, planar57_word1, planar57_word2) {
    const RO = new Uint8Array(1);
    const GO1 = new Uint8Array(1);
    const GO2 = new Uint8Array(1);
    const BO1 = new Uint8Array(1);
    const BO2 = new Uint8Array(1);
    const BO3 = new Uint8Array(1);
    const RH1 = new Uint8Array(1);
    const RH2 = new Uint8Array(1);
    const GH = new Uint8Array(1);
    const BH = new Uint8Array(1);
    const RV = new Uint8Array(1);
    const GV = new Uint8Array(1);
    const BV = new Uint8Array(1);
    RO[0] = GETBITSHIGH(planar_word1, 6, 62);
    GO1[0] = GETBITSHIGH(planar_word1, 1, 56);
    GO2[0] = GETBITSHIGH(planar_word1, 6, 54);
    BO1[0] = GETBITSHIGH(planar_word1, 1, 48);
    BO2[0] = GETBITSHIGH(planar_word1, 2, 44);
    BO3[0] = GETBITSHIGH(planar_word1, 3, 41);
    RH1[0] = GETBITSHIGH(planar_word1, 5, 38);
    RH2[0] = GETBITSHIGH(planar_word1, 1, 32);
    GH[0] = GETBITS(planar_word2, 7, 31);
    BH[0] = GETBITS(planar_word2, 6, 24);
    RV[0] = GETBITS(planar_word2, 6, 18);
    GV[0] = GETBITS(planar_word2, 7, 12);
    BV[0] = GETBITS(planar_word2, 6, 5);
    planar57_word1[0] = 0;
    planar57_word2[0] = 0;
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], RO[0], 6, 63);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], GO1[0], 1, 57);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], GO2[0], 6, 56);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], BO1[0], 1, 50);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], BO2[0], 2, 49);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], BO3[0], 3, 47);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], RH1[0], 5, 44);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], RH2[0], 1, 39);
    planar57_word1[0] = PUTBITSHIGH(planar57_word1[0], GH[0], 7, 38);
    planar57_word2[0] = PUTBITS(planar57_word2[0], BH[0], 6, 31);
    planar57_word2[0] = PUTBITS(planar57_word2[0], RV[0], 6, 25);
    planar57_word2[0] = PUTBITS(planar57_word2[0], GV[0], 7, 19);
    planar57_word2[0] = PUTBITS(planar57_word2[0], BV[0], 6, 12);
}
function unstuff58bits(thumbH_word1, thumbH_word2, thumbH58_word1, thumbH58_word2) {
    const part0 = new Uint32Array(1);
    const part1 = new Uint32Array(1);
    const part2 = new Uint32Array(1);
    const part3 = new Uint32Array(1);
    part0[0] = GETBITSHIGH(thumbH_word1, 7, 62);
    part1[0] = GETBITSHIGH(thumbH_word1, 2, 52);
    part2[0] = GETBITSHIGH(thumbH_word1, 16, 49);
    part3[0] = GETBITSHIGH(thumbH_word1, 1, 32);
    thumbH58_word1[0] = 0;
    thumbH58_word1[0] = PUTBITSHIGH(thumbH58_word1[0], part0[0], 7, 57);
    thumbH58_word1[0] = PUTBITSHIGH(thumbH58_word1[0], part1[0], 2, 50);
    thumbH58_word1[0] = PUTBITSHIGH(thumbH58_word1[0], part2[0], 16, 48);
    thumbH58_word1[0] = PUTBITSHIGH(thumbH58_word1[0], part3[0], 1, 32);
    thumbH58_word2[0] = thumbH_word2;
}
function unstuff59bits(thumbT_word1, thumbT_word2, thumbT59_word1, thumbT59_word2) {
    const R0a = new Uint8Array(1);
    thumbT59_word1[0] = thumbT_word1 >> 1;
    thumbT59_word1[0] = PUTBITSHIGH(thumbT59_word1[0], thumbT_word1, 1, 32);
    R0a[0] = GETBITSHIGH(thumbT_word1, 2, 60);
    thumbT59_word1[0] = PUTBITSHIGH(thumbT59_word1[0], R0a[0], 2, 58);
    thumbT59_word1[0] = PUTBITSHIGH(thumbT59_word1[0], 0, 5, 63);
    thumbT59_word2[0] = thumbT_word2;
}
function decompressColor(R_B, G_B, B_B, colors_RGB444, colors) {
    colors[0][R] = (colors_RGB444[0][R] << (8 - R_B)) | (colors_RGB444[0][R] >> (R_B - (8 - R_B)));
    colors[0][G] = (colors_RGB444[0][G] << (8 - G_B)) | (colors_RGB444[0][G] >> (G_B - (8 - G_B)));
    colors[0][B] = (colors_RGB444[0][B] << (8 - B_B)) | (colors_RGB444[0][B] >> (B_B - (8 - B_B)));
    colors[1][R] = (colors_RGB444[1][R] << (8 - R_B)) | (colors_RGB444[1][R] >> (R_B - (8 - R_B)));
    colors[1][G] = (colors_RGB444[1][G] << (8 - G_B)) | (colors_RGB444[1][G] >> (G_B - (8 - G_B)));
    colors[1][B] = (colors_RGB444[1][B] << (8 - B_B)) | (colors_RGB444[1][B] >> (B_B - (8 - B_B)));
}
function calculatePaintColors59T(d, p, colors, possible_colors) {
    possible_colors[3][R] = CLAMP(0, colors[1][R] - table59T[d], 255);
    possible_colors[3][G] = CLAMP(0, colors[1][G] - table59T[d], 255);
    possible_colors[3][B] = CLAMP(0, colors[1][B] - table59T[d], 255);
    {
        possible_colors[0][R] = colors[0][R];
        possible_colors[0][G] = colors[0][G];
        possible_colors[0][B] = colors[0][B];
        possible_colors[1][R] = CLAMP(0, colors[1][R] + table59T[d], 255);
        possible_colors[1][G] = CLAMP(0, colors[1][G] + table59T[d], 255);
        possible_colors[1][B] = CLAMP(0, colors[1][B] + table59T[d], 255);
        possible_colors[2][R] = colors[1][R];
        possible_colors[2][G] = colors[1][G];
        possible_colors[2][B] = colors[1][B];
    }
}
function decompressBlockTHUMB59Tc(block_part1, block_part2, img, width, height, startx, starty, channels) {
    const colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
    const colors = Array.from({ length: 2 }, () => new Uint8Array(3));
    const paint_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
    const distance = new Uint8Array(1);
    const block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));
    colorsRGB444[0][R] = GETBITSHIGH(block_part1, 4, 58);
    colorsRGB444[0][G] = GETBITSHIGH(block_part1, 4, 54);
    colorsRGB444[0][B] = GETBITSHIGH(block_part1, 4, 50);
    colorsRGB444[1][R] = GETBITSHIGH(block_part1, 4, 46);
    colorsRGB444[1][G] = GETBITSHIGH(block_part1, 4, 42);
    colorsRGB444[1][B] = GETBITSHIGH(block_part1, 4, 38);
    distance[0] = GETBITSHIGH(block_part1, TABLE_BITS_59T, 34);
    decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
    calculatePaintColors59T(distance[0], PATTERN_T, colors, paint_colors);
    for (var x = 0; x < BLOCKWIDTH; ++x) {
        for (var y = 0; y < BLOCKHEIGHT; ++y) {
            block_mask[x][y] = GETBITS(block_part2, 1, (y + x * 4) + 16) << 1;
            block_mask[x][y] |= GETBITS(block_part2, 1, (y + x * 4));
            img[channels * ((starty + y) * width + startx + x) + R] =
                CLAMP(0, paint_colors[block_mask[x][y]][R], 255);
            img[channels * ((starty + y) * width + startx + x) + G] =
                CLAMP(0, paint_colors[block_mask[x][y]][G], 255);
            img[channels * ((starty + y) * width + startx + x) + B] =
                CLAMP(0, paint_colors[block_mask[x][y]][B], 255);
        }
    }
}
function calculatePaintColors58H(d, p, colors, possible_colors) {
    possible_colors[3][R] = CLAMP(0, colors[1][R] - table58H[d], 255);
    possible_colors[3][G] = CLAMP(0, colors[1][G] - table58H[d], 255);
    possible_colors[3][B] = CLAMP(0, colors[1][B] - table58H[d], 255);
    {
        possible_colors[0][R] = CLAMP(0, colors[0][R] + table58H[d], 255);
        possible_colors[0][G] = CLAMP(0, colors[0][G] + table58H[d], 255);
        possible_colors[0][B] = CLAMP(0, colors[0][B] + table58H[d], 255);
        possible_colors[1][R] = CLAMP(0, colors[0][R] - table58H[d], 255);
        possible_colors[1][G] = CLAMP(0, colors[0][G] - table58H[d], 255);
        possible_colors[1][B] = CLAMP(0, colors[0][B] - table58H[d], 255);
        possible_colors[2][R] = CLAMP(0, colors[1][R] + table58H[d], 255);
        possible_colors[2][G] = CLAMP(0, colors[1][G] + table58H[d], 255);
        possible_colors[2][B] = CLAMP(0, colors[1][B] + table58H[d], 255);
    }
}
function decompressBlockTHUMB58Hc(block_part1, block_part2, img, width, height, startx, starty, channels) {
    const col0 = new Int32Array(1);
    const col1 = new Int32Array(1);
    const colors = Array.from({ length: 2 }, () => new Uint8Array(3));
    const colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
    const paint_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
    const distance = new Uint8Array(1);
    const block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));
    colorsRGB444[0][R] = GETBITSHIGH(block_part1, 4, 57);
    colorsRGB444[0][G] = GETBITSHIGH(block_part1, 4, 53);
    colorsRGB444[0][B] = GETBITSHIGH(block_part1, 4, 49);
    colorsRGB444[1][R] = GETBITSHIGH(block_part1, 4, 45);
    colorsRGB444[1][G] = GETBITSHIGH(block_part1, 4, 41);
    colorsRGB444[1][B] = GETBITSHIGH(block_part1, 4, 37);
    distance[0] = 0;
    distance[0] = (GETBITSHIGH(block_part1, 2, 33)) << 1;
    col0[0] = GETBITSHIGH(block_part1, 12, 57);
    col1[0] = GETBITSHIGH(block_part1, 12, 45);
    if (col0[0] >= col1[0]) {
        distance[0] |= 1;
    }
    decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);
    calculatePaintColors58H(distance[0], PATTERN_H, colors, paint_colors);
    for (var x = 0; x < BLOCKWIDTH; ++x) {
        for (var y = 0; y < BLOCKHEIGHT; ++y) {
            block_mask[x][y] = GETBITS(block_part2, 1, (y + x * 4) + 16) << 1;
            block_mask[x][y] |= GETBITS(block_part2, 1, (y + x * 4));
            img[channels * ((starty + y) * width + startx + x) + R] =
                CLAMP(0, paint_colors[block_mask[x][y]][R], 255);
            img[channels * ((starty + y) * width + startx + x) + G] =
                CLAMP(0, paint_colors[block_mask[x][y]][G], 255);
            img[channels * ((starty + y) * width + startx + x) + B] =
                CLAMP(0, paint_colors[block_mask[x][y]][B], 255);
        }
    }
}
function decompressBlockPlanar57c(compressed57_1, compressed57_2, img, width, height, startx, starty, channels) {
    const colorO = new Uint8Array(3);
    const colorH = new Uint8Array(3);
    const colorV = new Uint8Array(3);
    colorO[0] = GETBITSHIGH(compressed57_1, 6, 63);
    colorO[1] = GETBITSHIGH(compressed57_1, 7, 57);
    colorO[2] = GETBITSHIGH(compressed57_1, 6, 50);
    colorH[0] = GETBITSHIGH(compressed57_1, 6, 44);
    colorH[1] = GETBITSHIGH(compressed57_1, 7, 38);
    colorH[2] = GETBITS(compressed57_2, 6, 31);
    colorV[0] = GETBITS(compressed57_2, 6, 25);
    colorV[1] = GETBITS(compressed57_2, 7, 19);
    colorV[2] = GETBITS(compressed57_2, 6, 12);
    colorO[0] = (colorO[0] << 2) | (colorO[0] >> 4);
    colorO[1] = (colorO[1] << 1) | (colorO[1] >> 6);
    colorO[2] = (colorO[2] << 2) | (colorO[2] >> 4);
    colorH[0] = (colorH[0] << 2) | (colorH[0] >> 4);
    colorH[1] = (colorH[1] << 1) | (colorH[1] >> 6);
    colorH[2] = (colorH[2] << 2) | (colorH[2] >> 4);
    colorV[0] = (colorV[0] << 2) | (colorV[0] >> 4);
    colorV[1] = (colorV[1] << 1) | (colorV[1] >> 6);
    colorV[2] = (colorV[2] << 2) | (colorV[2] >> 4);
    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            img[channels * width * (starty + yy) + channels * (startx + xx) + 0] = CLAMP(0, ((xx * (colorH[0] - colorO[0]) + yy * (colorV[0] - colorO[0]) + 4 * colorO[0] + 2) >> 2), 255);
            img[channels * width * (starty + yy) + channels * (startx + xx) + 1] = CLAMP(0, ((xx * (colorH[1] - colorO[1]) + yy * (colorV[1] - colorO[1]) + 4 * colorO[1] + 2) >> 2), 255);
            img[channels * width * (starty + yy) + channels * (startx + xx) + 2] = CLAMP(0, ((xx * (colorH[2] - colorO[2]) + yy * (colorV[2] - colorO[2]) + 4 * colorO[2] + 2) >> 2), 255);
        }
    }
}
function decompressBlockDiffFlipC(block_part1, block_part2, dstImage, width, height, startx, starty, channels) {
    const avg_color = new Uint8Array(3);
    const enc_color1 = new Uint8Array(3);
    const enc_color2 = new Uint8Array(3);
    const diff = new Int8Array(3);
    var table;
    var index, shift;
    const r = new Uint8Array(1);
    const g = new Uint8Array(1);
    const b = new Uint8Array(1);
    var diffbit;
    var flipbit;
    diffbit = (GETBITSHIGH(block_part1, 1, 33));
    flipbit = (GETBITSHIGH(block_part1, 1, 32));
    if (!diffbit) {
        avg_color[0] = GETBITSHIGH(block_part1, 4, 63);
        avg_color[1] = GETBITSHIGH(block_part1, 4, 55);
        avg_color[2] = GETBITSHIGH(block_part1, 4, 47);
        avg_color[0] |= (avg_color[0] << 4);
        avg_color[1] |= (avg_color[1] << 4);
        avg_color[2] |= (avg_color[2] << 4);
        table = GETBITSHIGH(block_part1, 3, 39) << 1;
        const pixel_indices_MSB = new Uint32Array(1);
        const pixel_indices_LSB = new Uint32Array(1);
        pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
        pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
        if ((flipbit) == 0) {
            shift = 0;
            for (var x = startx; x < startx + 2; x++) {
                for (var y = starty; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
            }
        }
        else {
            shift = 0;
            for (var x = startx; x < startx + 4; x++) {
                for (var y = starty; y < starty + 2; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
                shift += 2;
            }
        }
        avg_color[0] = GETBITSHIGH(block_part1, 4, 59);
        avg_color[1] = GETBITSHIGH(block_part1, 4, 51);
        avg_color[2] = GETBITSHIGH(block_part1, 4, 43);
        avg_color[0] |= (avg_color[0] << 4);
        avg_color[1] |= (avg_color[1] << 4);
        avg_color[2] |= (avg_color[2] << 4);
        table = GETBITSHIGH(block_part1, 3, 36) << 1;
        pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
        pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
        if ((flipbit) == 0) {
            shift = 8;
            for (var x = startx + 2; x < startx + 4; x++) {
                for (var y = starty; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
            }
        }
        else {
            shift = 2;
            for (var x = startx; x < startx + 4; x++) {
                for (var y = starty + 2; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
                shift += 2;
            }
        }
    }
    else {
        enc_color1[0] = GETBITSHIGH(block_part1, 5, 63);
        enc_color1[1] = GETBITSHIGH(block_part1, 5, 55);
        enc_color1[2] = GETBITSHIGH(block_part1, 5, 47);
        avg_color[0] = (enc_color1[0] << 3) | (enc_color1[0] >> 2);
        avg_color[1] = (enc_color1[1] << 3) | (enc_color1[1] >> 2);
        avg_color[2] = (enc_color1[2] << 3) | (enc_color1[2] >> 2);
        table = GETBITSHIGH(block_part1, 3, 39) << 1;
        const pixel_indices_MSB = new Uint32Array(1);
        const pixel_indices_LSB = new Uint32Array(1);
        pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
        pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
        if ((flipbit) == 0) {
            shift = 0;
            for (var x = startx; x < startx + 2; x++) {
                for (var y = starty; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
            }
        }
        else {
            shift = 0;
            for (var x = startx; x < startx + 4; x++) {
                for (var y = starty; y < starty + 2; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
                shift += 2;
            }
        }
        diff[0] = GETBITSHIGH(block_part1, 3, 58);
        diff[1] = GETBITSHIGH(block_part1, 3, 50);
        diff[2] = GETBITSHIGH(block_part1, 3, 42);
        diff[0] = (diff[0] << 5);
        diff[1] = (diff[1] << 5);
        diff[2] = (diff[2] << 5);
        diff[0] = diff[0] >> 5;
        diff[1] = diff[1] >> 5;
        diff[2] = diff[2] >> 5;
        enc_color2[0] = enc_color1[0] + diff[0];
        enc_color2[1] = enc_color1[1] + diff[1];
        enc_color2[2] = enc_color1[2] + diff[2];
        avg_color[0] = (enc_color2[0] << 3) | (enc_color2[0] >> 2);
        avg_color[1] = (enc_color2[1] << 3) | (enc_color2[1] >> 2);
        avg_color[2] = (enc_color2[2] << 3) | (enc_color2[2] >> 2);
        table = GETBITSHIGH(block_part1, 3, 36) << 1;
        pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
        pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
        if ((flipbit) == 0) {
            shift = 8;
            for (var x = startx + 2; x < startx + 4; x++) {
                for (var y = starty; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
            }
        }
        else {
            shift = 2;
            for (var x = startx; x < startx + 4; x++) {
                for (var y = starty + 2; y < starty + 4; y++) {
                    index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                    index |= ((pixel_indices_LSB[0] >> shift) & 1);
                    shift++;
                    index = unscramble[index];
                    r[0] = RED_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[0] + compressParams[table][index], 255));
                    g[0] = GREEN_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[1] + compressParams[table][index], 255));
                    b[0] = BLUE_CHANNEL(dstImage, width, x, y, channels, CLAMP(0, avg_color[2] + compressParams[table][index], 255));
                }
                shift += 2;
            }
        }
    }
}
function decompressBlockETC2c(block_part1, block_part2, dstImage, width, height, startx, starty, channels) {
    var diffbit = new Int32Array(1);
    var color1 = new Int8Array(3);
    var diff = new Int8Array(3);
    var red = new Int8Array(1);
    var green = new Int8Array(1);
    var blue = new Int8Array(1);
    diffbit[0] = (GETBITSHIGH(block_part1, 1, 33));
    if (diffbit[0]) {
        color1[0] = GETBITSHIGH(block_part1, 5, 63);
        color1[1] = GETBITSHIGH(block_part1, 5, 55);
        color1[2] = GETBITSHIGH(block_part1, 5, 47);
        diff[0] = GETBITSHIGH(block_part1, 3, 58);
        diff[1] = GETBITSHIGH(block_part1, 3, 50);
        diff[2] = GETBITSHIGH(block_part1, 3, 42);
        diff[0] = (diff[0] << 5);
        diff[1] = (diff[1] << 5);
        diff[2] = (diff[2] << 5);
        diff[0] = diff[0] >> 5;
        diff[1] = diff[1] >> 5;
        diff[2] = diff[2] >> 5;
        red[0] = color1[0] + diff[0];
        green[0] = color1[1] + diff[1];
        blue[0] = color1[2] + diff[2];
        if (red[0] < 0 || red[0] > 31) {
            const block59_part1 = new Int32Array(1);
            const block59_part2 = new Int32Array(1);
            unstuff59bits(block_part1, block_part2, block59_part1, block59_part2);
            decompressBlockTHUMB59Tc(block59_part1[0], block59_part2[0], dstImage, width, height, startx, starty, channels);
        }
        else if (green[0] < 0 || green[0] > 31) {
            const block58_part1 = new Int32Array(1);
            const block58_part2 = new Int32Array(1);
            unstuff58bits(block_part1, block_part2, block58_part1, block58_part2);
            decompressBlockTHUMB58Hc(block58_part1[0], block58_part2[0], dstImage, width, height, startx, starty, channels);
        }
        else if (blue[0] < 0 || blue[0] > 31) {
            const block57_part1 = new Int32Array(1);
            const block57_part2 = new Int32Array(1);
            unstuff57bits(block_part1, block_part2, block57_part1, block57_part2);
            decompressBlockPlanar57c(block57_part1[0], block57_part2[0], dstImage, width, height, startx, starty, channels);
        }
        else {
            decompressBlockDiffFlipC(block_part1, block_part2, dstImage, width, height, startx, starty, channels);
        }
    }
    else {
        decompressBlockDiffFlipC(block_part1, block_part2, dstImage, width, height, startx, starty, channels);
    }
}
function decompressBlockDifferentialWithAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, channelsRGB) {
    const avg_color = new Uint8Array(3);
    const enc_color1 = new Uint8Array(3);
    const enc_color2 = new Uint8Array(3);
    const diff = new Int8Array(3);
    var table;
    var index;
    var shift;
    var diffbit, flipbit;
    var channelsA;
    var alpha_off = 0;
    if (channelsRGB == 3) {
        channelsA = 1;
    }
    else {
        channelsA = 4;
        alpha_off = 3;
        alpha = img;
    }
    diffbit = (GETBITSHIGH(block_part1, 1, 33));
    flipbit = (GETBITSHIGH(block_part1, 1, 32));
    enc_color1[0] = GETBITSHIGH(block_part1, 5, 63);
    enc_color1[1] = GETBITSHIGH(block_part1, 5, 55);
    enc_color1[2] = GETBITSHIGH(block_part1, 5, 47);
    avg_color[0] = (enc_color1[0] << 3) | (enc_color1[0] >> 2);
    avg_color[1] = (enc_color1[1] << 3) | (enc_color1[1] >> 2);
    avg_color[2] = (enc_color1[2] << 3) | (enc_color1[2] >> 2);
    table = GETBITSHIGH(block_part1, 3, 39) << 1;
    const pixel_indices_MSB = new Uint32Array(1);
    const pixel_indices_LSB = new Uint32Array(1);
    pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
    pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
    if ((flipbit) == 0) {
        shift = 0;
        for (var x = startx; x < startx + 2; x++) {
            for (var y = starty; y < starty + 4; y++) {
                index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                index |= ((pixel_indices_LSB[0] >> shift) & 1);
                shift++;
                index = unscramble[index];
                var mod = compressParams[table][index];
                if (diffbit == 0 && (index == 1 || index == 2)) {
                    mod = 0;
                }
                RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
                }
                else {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 255;
                }
            }
        }
    }
    else {
        shift = 0;
        for (var x = startx; x < startx + 4; x++) {
            for (var y = starty; y < starty + 2; y++) {
                index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                index |= ((pixel_indices_LSB[0] >> shift) & 1);
                shift++;
                index = unscramble[index];
                var mod = compressParams[table][index];
                if (diffbit == 0 && (index == 1 || index == 2)) {
                    mod = 0;
                }
                RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
                }
                else {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 255;
                }
            }
            shift += 2;
        }
    }
    diff[0] = GETBITSHIGH(block_part1, 3, 58);
    diff[1] = GETBITSHIGH(block_part1, 3, 50);
    diff[2] = GETBITSHIGH(block_part1, 3, 42);
    diff[0] = (diff[0] << 5);
    diff[1] = (diff[1] << 5);
    diff[2] = (diff[2] << 5);
    diff[0] = diff[0] >> 5;
    diff[1] = diff[1] >> 5;
    diff[2] = diff[2] >> 5;
    enc_color2[0] = enc_color1[0] + diff[0];
    enc_color2[1] = enc_color1[1] + diff[1];
    enc_color2[2] = enc_color1[2] + diff[2];
    avg_color[0] = (enc_color2[0] << 3) | (enc_color2[0] >> 2);
    avg_color[1] = (enc_color2[1] << 3) | (enc_color2[1] >> 2);
    avg_color[2] = (enc_color2[2] << 3) | (enc_color2[2] >> 2);
    table = GETBITSHIGH(block_part1, 3, 36) << 1;
    pixel_indices_MSB[0] = GETBITS(block_part2, 16, 31);
    pixel_indices_LSB[0] = GETBITS(block_part2, 16, 15);
    if ((flipbit) == 0) {
        shift = 8;
        for (var x = startx + 2; x < startx + 4; x++) {
            for (var y = starty; y < starty + 4; y++) {
                index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                index |= ((pixel_indices_LSB[0] >> shift) & 1);
                shift++;
                index = unscramble[index];
                var mod = compressParams[table][index];
                if (diffbit == 0 && (index == 1 || index == 2)) {
                    mod = 0;
                }
                RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
                }
                else {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 255;
                }
            }
        }
    }
    else {
        shift = 2;
        for (var x = startx; x < startx + 4; x++) {
            for (var y = starty + 2; y < starty + 4; y++) {
                index = ((pixel_indices_MSB[0] >> shift) & 1) << 1;
                index |= ((pixel_indices_LSB[0] >> shift) & 1);
                shift++;
                index = unscramble[index];
                var mod = compressParams[table][index];
                if (diffbit == 0 && (index == 1 || index == 2)) {
                    mod = 0;
                }
                RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
                }
                else {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 255;
                }
            }
            shift += 2;
        }
    }
}
function decompressBlockTHUMB59TAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, channelsRGB) {
    const colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
    const colors = Array.from({ length: 2 }, () => new Uint8Array(3));
    const paint_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
    const distance = new Uint8Array(1);
    const block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));
    var channelsA;
    var alpha_off = 0;
    if (channelsRGB == 3) {
        channelsA = 1;
    }
    else {
        channelsA = 4;
        alpha_off = 3;
        alpha = img;
    }
    colorsRGB444[0][R] = GETBITSHIGH(block_part1, 4, 58);
    colorsRGB444[0][G] = GETBITSHIGH(block_part1, 4, 54);
    colorsRGB444[0][B] = GETBITSHIGH(block_part1, 4, 50);
    colorsRGB444[1][R] = GETBITSHIGH(block_part1, 4, 46);
    colorsRGB444[1][G] = GETBITSHIGH(block_part1, 4, 42);
    colorsRGB444[1][B] = GETBITSHIGH(block_part1, 4, 38);
    distance[0] = GETBITSHIGH(block_part1, TABLE_BITS_59T, 34);
    decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
    calculatePaintColors59T(distance[0], PATTERN_T, colors, paint_colors);
    for (var x = 0; x < BLOCKWIDTH; ++x) {
        for (var y = 0; y < BLOCKHEIGHT; ++y) {
            block_mask[x][y] = GETBITS(block_part2, 1, (y + x * 4) + 16) << 1;
            block_mask[x][y] |= GETBITS(block_part2, 1, (y + x * 4));
            img[channelsRGB * ((starty + y) * width + startx + x) + R] =
                CLAMP(0, paint_colors[block_mask[x][y]][R], 255);
            img[channelsRGB * ((starty + y) * width + startx + x) + G] =
                CLAMP(0, paint_colors[block_mask[x][y]][G], 255);
            img[channelsRGB * ((starty + y) * width + startx + x) + B] =
                CLAMP(0, paint_colors[block_mask[x][y]][B], 255);
            if (block_mask[x][y] == 2) {
                alpha[alpha_off + (channelsA * (x + startx + (y + starty) * width))] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + R] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + G] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + B] = 0;
            }
            else
                alpha[alpha_off + (channelsA * (x + startx + (y + starty) * width))] = 255;
        }
    }
}
function decompressBlockTHUMB58HAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, channelsRGB) {
    const col0 = new Int32Array(1);
    const col1 = new Int32Array(1);
    const colors = Array.from({ length: 2 }, () => new Uint8Array(3));
    const colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
    const paint_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
    const distance = new Int8Array(1);
    const block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));
    var channelsA;
    var alpha_off = 0;
    if (channelsRGB == 3) {
        channelsA = 1;
    }
    else {
        channelsA = 4;
        alpha_off = 3;
        alpha = img;
    }
    colorsRGB444[0][R] = GETBITSHIGH(block_part1, 4, 57);
    colorsRGB444[0][G] = GETBITSHIGH(block_part1, 4, 53);
    colorsRGB444[0][B] = GETBITSHIGH(block_part1, 4, 49);
    colorsRGB444[1][R] = GETBITSHIGH(block_part1, 4, 45);
    colorsRGB444[1][G] = GETBITSHIGH(block_part1, 4, 41);
    colorsRGB444[1][B] = GETBITSHIGH(block_part1, 4, 37);
    distance[0] = 0;
    distance[0] = (GETBITSHIGH(block_part1, 2, 33)) << 1;
    col0[0] = GETBITSHIGH(block_part1, 12, 57);
    col1[0] = GETBITSHIGH(block_part1, 12, 45);
    if (col0[0] >= col1[0]) {
        distance[0] |= 1;
    }
    decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);
    calculatePaintColors58H(distance[0], PATTERN_H, colors, paint_colors);
    for (var x = 0; x < BLOCKWIDTH; ++x) {
        for (var y = 0; y < BLOCKHEIGHT; ++y) {
            block_mask[x][y] = GETBITS(block_part2, 1, (y + x * 4) + 16) << 1;
            block_mask[x][y] |= GETBITS(block_part2, 1, (y + x * 4));
            img[channelsRGB * ((starty + y) * width + startx + x) + R] =
                CLAMP(0, paint_colors[block_mask[x][y]][R], 255);
            img[channelsRGB * ((starty + y) * width + startx + x) + G] =
                CLAMP(0, paint_colors[block_mask[x][y]][G], 255);
            img[channelsRGB * ((starty + y) * width + startx + x) + B] =
                CLAMP(0, paint_colors[block_mask[x][y]][B], 255);
            if (block_mask[x][y] == 2) {
                alpha[alpha_off = (channelsA * (x + startx + (y + starty) * width))] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + R] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + G] = 0;
                img[channelsRGB * ((starty + y) * width + startx + x) + B] = 0;
            }
            else
                alpha[alpha_off + (channelsA * (x + startx + (y + starty) * width))] = 255;
        }
    }
}
function decompressBlockETC21BitAlphaC(block_part1, block_part2, img, alphaimg, width, height, startx, starty, channelsRGB) {
    var diffbit;
    const color1 = new Int8Array(3);
    const diff = new Int8Array(3);
    var red, blue, green;
    var channelsA;
    var alpha_off = 0;
    if (channelsRGB == 3) {
        channelsA = 1;
    }
    else {
        channelsA = 4;
        alpha_off = 3;
        alphaimg = img;
    }
    diffbit = (GETBITSHIGH(block_part1, 1, 33));
    if (diffbit) {
        color1[0] = GETBITSHIGH(block_part1, 5, 63);
        color1[1] = GETBITSHIGH(block_part1, 5, 55);
        color1[2] = GETBITSHIGH(block_part1, 5, 47);
        diff[0] = GETBITSHIGH(block_part1, 3, 58);
        diff[1] = GETBITSHIGH(block_part1, 3, 50);
        diff[2] = GETBITSHIGH(block_part1, 3, 42);
        diff[0] = (diff[0] << 5);
        diff[1] = (diff[1] << 5);
        diff[2] = (diff[2] << 5);
        diff[0] = diff[0] >> 5;
        diff[1] = diff[1] >> 5;
        diff[2] = diff[2] >> 5;
        red = color1[0] + diff[0];
        green = color1[1] + diff[1];
        blue = color1[2] + diff[2];
        if (red < 0 || red > 31) {
            const block59_part1 = new Uint32Array(1);
            const block59_part2 = new Uint32Array(1);
            unstuff59bits(block_part1, block_part2, block59_part1, block59_part2);
            decompressBlockTHUMB59Tc(block59_part1[0], block59_part2[0], img, width, height, startx, starty, channelsRGB);
        }
        else if (green < 0 || green > 31) {
            const block58_part1 = new Uint32Array(1);
            const block58_part2 = new Uint32Array(1);
            unstuff58bits(block_part1, block_part2, block58_part1, block58_part2);
            decompressBlockTHUMB58Hc(block58_part1[0], block58_part2[0], img, width, height, startx, starty, channelsRGB);
        }
        else if (blue < 0 || blue > 31) {
            const block57_part1 = new Uint32Array(1);
            const block57_part2 = new Uint32Array(1);
            unstuff57bits(block_part1, block_part2, block57_part1, block57_part2);
            decompressBlockPlanar57c(block57_part1[0], block57_part2[0], img, width, height, startx, starty, channelsRGB);
        }
        else {
            decompressBlockDifferentialWithAlphaC(block_part1, block_part2, img, alphaimg, width, height, startx, starty, channelsRGB);
        }
        for (var x = startx; x < startx + 4; x++) {
            for (var y = starty; y < starty + 4; y++) {
                alphaimg[alpha_off + (channelsA * (x + y * width))] = 255;
            }
        }
    }
    else {
        color1[0] = GETBITSHIGH(block_part1, 5, 63);
        color1[1] = GETBITSHIGH(block_part1, 5, 55);
        color1[2] = GETBITSHIGH(block_part1, 5, 47);
        diff[0] = GETBITSHIGH(block_part1, 3, 58);
        diff[1] = GETBITSHIGH(block_part1, 3, 50);
        diff[2] = GETBITSHIGH(block_part1, 3, 42);
        diff[0] = (diff[0] << 5);
        diff[1] = (diff[1] << 5);
        diff[2] = (diff[2] << 5);
        diff[0] = diff[0] >> 5;
        diff[1] = diff[1] >> 5;
        diff[2] = diff[2] >> 5;
        red = color1[0] + diff[0];
        green = color1[1] + diff[1];
        blue = color1[2] + diff[2];
        if (red < 0 || red > 31) {
            const block59_part1 = new Uint32Array(1);
            const block59_part2 = new Uint32Array(1);
            unstuff59bits(block_part1, block_part2, block59_part1, block59_part2);
            decompressBlockTHUMB59TAlphaC(block59_part1[0], block59_part2[0], img, alphaimg, width, height, startx, starty, channelsRGB);
        }
        else if (green < 0 || green > 31) {
            const block58_part1 = new Uint32Array(1);
            const block58_part2 = new Uint32Array(1);
            unstuff58bits(block_part1, block_part2, block58_part1, block58_part2);
            decompressBlockTHUMB58HAlphaC(block58_part1[0], block58_part2[0], img, alphaimg, width, height, startx, starty, channelsRGB);
        }
        else if (blue < 0 || blue > 31) {
            const block57_part1 = new Uint32Array(1);
            const block57_part2 = new Uint32Array(1);
            unstuff57bits(block_part1, block_part2, block57_part1, block57_part2);
            decompressBlockPlanar57c(block57_part1[0], block57_part2[0], img, width, height, startx, starty, channelsRGB);
            for (var x = startx; x < startx + 4; x++) {
                for (var y = starty; y < starty + 4; y++) {
                    alphaimg[alpha_off + (channelsA * (x + y * width))] = 255;
                }
            }
        }
        else {
            decompressBlockDifferentialWithAlphaC(block_part1, block_part2, img, alphaimg, width, height, startx, starty, channelsRGB);
        }
    }
}
function getbit(input, frompos, topos) {
    if (frompos > topos)
        return (((1 << frompos) & input) >> (frompos - topos)) & 0xFF;
    return (((1 << frompos) & input) << (topos - frompos)) & 0xFF;
}
function clamp$1(val) {
    if (val < 0)
        val = 0;
    if (val > 255)
        val = 255;
    return val;
}
function decompressBlockAlphaC(data, srcoff, img, dstoff, width, height, ix, iy, channels) {
    var alpha = data[srcoff + 0] & 0xFF;
    var table = data[srcoff + 1] & 0xFF;
    var bit = 0;
    var byte = 2;
    for (var x = 0; x < 4; x++) {
        for (var y = 0; y < 4; y++) {
            var index = 0;
            for (var bitpos = 0; bitpos < 3; bitpos++) {
                index |= getbit((data[srcoff + byte] & 0xFF), 7 - bit, 2 - bitpos);
                bit++;
                if (bit > 7) {
                    bit = 0;
                    byte++;
                }
            }
            img[dstoff + ((ix + x + (iy + y) * width) * channels)] = clamp$1(alpha + alphaTable[table][index]);
        }
    }
}
function get16bits11signed(base, table, mul, index) {
    var elevenbase = base - 128;
    if (elevenbase == -128) {
        elevenbase = -127;
    }
    elevenbase *= 8;
    var tabVal = -alphaBase[table][3 - index % 4] - 1;
    var sign = (1 - (index / 4)) > 0 ? true : false;
    if (sign) {
        tabVal = tabVal + 1;
    }
    var elevenTabVal = tabVal * 8;
    if (mul != 0) {
        elevenTabVal *= mul;
    }
    else {
        elevenTabVal /= 8;
    }
    if (sign) {
        elevenTabVal = -elevenTabVal;
    }
    var elevenbits = elevenbase + elevenTabVal;
    if (elevenbits >= 1024) {
        elevenbits = 1023;
    }
    else if (elevenbits < -1023) {
        elevenbits = -1023;
    }
    sign = elevenbits < 0 ? true : false;
    elevenbits = Math.abs(elevenbits);
    var fifteenbits = ((elevenbits << 5) + (elevenbits >> 5));
    var sixteenbits = fifteenbits;
    if (sign) {
        sixteenbits = -sixteenbits;
    }
    return sixteenbits;
}
function get16bits11bits(base, table, mul, index) {
    var elevenbase = base * 8 + 4;
    var tabVal = -alphaBase[table][3 - index % 4] - 1;
    var sign = (1 - (index / 4)) > 0 ? true : false;
    if (sign) {
        tabVal = tabVal + 1;
    }
    var elevenTabVal = tabVal * 8;
    if (mul != 0) {
        elevenTabVal *= mul;
    }
    else {
        elevenTabVal /= 8;
    }
    if (sign) {
        elevenTabVal = -elevenTabVal;
    }
    var elevenbits = elevenbase + elevenTabVal;
    if (elevenbits >= 256 * 8) {
        elevenbits = 256 * 8 - 1;
    }
    else if (elevenbits < 0) {
        elevenbits = 0;
    }
    const sixteenbits = new Uint16Array([(elevenbits << 5) + (elevenbits >> 6)]);
    return sixteenbits[0];
}
function decompressBlockAlpha16bitC(data, srcoff, dst, dstoff, width, height, ix, iy, channels) {
    var alpha = new Int32Array([data[srcoff + 0] & 0xFF]);
    var table = new Int32Array([data[srcoff + 1] & 0xFF]);
    if (formatSigned) {
        if (data[srcoff + 0] >= 128) {
            alpha[0] = data[srcoff + 0] -= 256;
        }
        alpha[0] = alpha[0] + 128;
    }
    var bit = 0;
    var byte = 2;
    for (var x = 0; x < 4; x++) {
        for (var y = 0; y < 4; y++) {
            const index = new Int32Array([0]);
            for (var bitpos = 0; bitpos < 3; bitpos++) {
                index[0] |= getbit((data[srcoff + byte] & 0xFF), 7 - bit, 2 - bitpos);
                bit++;
                if (bit > 7) {
                    bit = 0;
                    byte++;
                }
            }
            var windex = channels * (2 * (ix + x + (iy + y) * width));
            if (formatSigned) {
                const mul = new Int32Array([(table[0] / 16)]);
                const tabled = new Int32Array([(table[0] % 16)]);
                const val16 = new Int16Array([get16bits11signed(alpha[0], tabled[0], mul[0], index[0])]);
                dst[dstoff + windex] = val16[0];
                dst[dstoff + windex + 1] = (val16[0] >> 8);
            }
            else {
                const mul = new Int32Array([(table[0] / 16)]);
                const tabled = new Int32Array([(table[0] % 16)]);
                const val16 = new Uint16Array([get16bits11bits(alpha[0], tabled[0], mul[0], index[0])]);
                dst[dstoff + windex] = val16[0];
                dst[dstoff + windex + 1] = (val16[0] >> 8);
            }
        }
    }
}
function readBigEndian4byteWord(s, srcoff) {
    var pBlock = new Uint32Array(1);
    pBlock[0] = ((s[srcoff] & 0xFF) << 24) | ((s[srcoff + 1] & 0xFF) << 16) | ((s[srcoff + 2] & 0xFF) << 8) | (s[srcoff + 3] & 0xFF);
    return pBlock[0];
}
function check_size$3(width, height, bpp, src) {
    const size_needed = Math.ceil(width / 4) * Math.ceil(height / 4) * bpp;
    if (src.length < size_needed) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`);
    }
}
function scaleTo255(value, minValue, maxValue) {
    if (value < minValue) {
        value = minValue;
    }
    else if (value > maxValue) {
        value = maxValue;
    }
    return Math.round(((value - minValue) / (maxValue - minValue)) * 255);
}
const AF_NONE = 0;
const AF_1BIT = 1;
const AF_8BIT = 2;
const AF_11BIT = 3;
const ETC1_RGB = 0;
const ETC2_RGB = 1;
const ETC1_RGBA8 = 2;
const ETC2_RGBA8 = 3;
const ETC2_RGBA1 = 4;
const EAC_R11 = 5;
const EAC_RG11 = 6;
const EAC_R11_SIGNED = 7;
const EAC_RG11_SIGNED = 8;
const ETC2_SRGB = 9;
const ETC2_SRGBA8 = 10;
const ETC2_SRGBA1 = 11;
const ETC_FORMAT = {
    ETC1_RGB,
    ETC2_RGB,
    ETC1_RGBA8,
    ETC2_RGBA8,
    ETC2_RGBA1,
    EAC_R11,
    EAC_RG11,
    EAC_R11_SIGNED,
    EAC_RG11_SIGNED,
    ETC2_SRGB,
    ETC2_SRGBA8,
    ETC2_SRGBA1,
};
const RGB$1 = 1;
const RGBA$1 = 2;
const ETC_PROFILE = {
    RGB: RGB$1,
    RGBA: RGBA$1
};
function isBuffer$d(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$6(obj) {
    return obj instanceof Uint8Array || isBuffer$d(obj);
}
function decodeETC1RGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC1_RGB, forceRGBorRGBA);
}
function decodeETC2RGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGB, forceRGBorRGBA);
}
function decodeETC1RGBA(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC1_RGBA8, forceRGBorRGBA);
}
function decodeETC2RGBA(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGBA8, forceRGBorRGBA);
}
function decodeETC2RGBA1(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGBA1, forceRGBorRGBA);
}
function decodeEACR11(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_R11, forceRGBorRGBA);
}
function decodeEACRG11(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_RG11, forceRGBorRGBA);
}
function decodeEACR11_SIGNED(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_R11_SIGNED, forceRGBorRGBA);
}
function decodeEACRG11_SIGNED(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_RG11_SIGNED, forceRGBorRGBA);
}
function decodeETC2sRGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGB, forceRGBorRGBA);
}
function decodeETC2sRGBA8(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGBA8, forceRGBorRGBA);
}
function decodeETC2sRGBA1(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGBA1, forceRGBorRGBA);
}
function decodeETC(src, width, height, ETC_FORMAT, forceRGBorRGBA) {
    if (!arraybuffcheck$6(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    var block_part1, block_part2;
    var x, y;
    var active_width = width;
    var active_height = height;
    width = Math.floor(((active_width + 4 - 1) / 4) * 4);
    height = Math.floor(((active_height + 4 - 1) / 4) * 4);
    var alphaFormat = AF_NONE;
    var dstChannels, dstChannelBytes;
    var format = "";
    switch (ETC_FORMAT) {
        case EAC_R11_SIGNED:
            dstChannelBytes = 2;
            dstChannels = 1;
            formatSigned = true;
            format = "R";
            check_size$3(width, height, 8, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_R11:
            dstChannelBytes = 2;
            dstChannels = 1;
            formatSigned = false;
            format = "R";
            check_size$3(width, height, 8, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_RG11_SIGNED:
            dstChannelBytes = 2;
            dstChannels = 2;
            formatSigned = true;
            format = "RG";
            check_size$3(width, height, 16, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_RG11:
            dstChannelBytes = 2;
            dstChannels = 2;
            formatSigned = false;
            format = "RG";
            check_size$3(width, height, 16, src);
            alphaFormat = AF_11BIT;
            break;
        case ETC1_RGB:
        case ETC2_RGB:
        case ETC1_RGBA8:
            dstChannelBytes = 1;
            dstChannels = 3;
            format = ETC_FORMAT == ETC1_RGBA8 ? "RGB_A" : "RGB";
            check_size$3(width, height, 8, src);
            break;
        case ETC2_RGBA8:
            dstChannelBytes = 1;
            dstChannels = 4;
            format = "RGBA";
            check_size$3(width, height, 16, src);
            alphaFormat = AF_8BIT;
            break;
        case ETC2_RGBA1:
            dstChannelBytes = 1;
            dstChannels = 4;
            format = "RGBA";
            check_size$3(width, height, 8, src);
            alphaFormat = AF_1BIT;
            break;
        case ETC2_SRGB:
            dstChannelBytes = 1;
            dstChannels = 3;
            format = "RGB";
            check_size$3(width, height, 8, src);
            break;
        case ETC2_SRGBA8:
            dstChannelBytes = 1;
            dstChannels = 4;
            check_size$3(width, height, 16, src);
            format = "RGBA";
            alphaFormat = AF_8BIT;
            break;
        case ETC2_SRGBA1:
            dstChannelBytes = 1;
            dstChannels = 4;
            check_size$3(width, height, 8, src);
            format = "RGBA";
            alphaFormat = AF_1BIT;
            break;
        default:
            throw new Error("Unsupported srcFormat");
    }
    var dstImage = isBuffer$d(src) ? Buffer.alloc(dstChannels * dstChannelBytes * width * height) : new Uint8Array(dstChannels * dstChannelBytes * width * height);
    if (alphaFormat != AF_NONE) {
        setupAlphaTable();
    }
    var src_off = 0;
    if (alphaFormat == AF_11BIT) {
        for (y = 0; y < height / 4; y++) {
            for (x = 0; x < width / 4; x++) {
                decompressBlockAlpha16bitC(src, src_off, dstImage, 0, width, height, 4 * x, 4 * y, dstChannels);
                src_off += 8;
                if (ETC_FORMAT == EAC_RG11 ||
                    ETC_FORMAT == EAC_RG11_SIGNED) {
                    decompressBlockAlpha16bitC(src, src_off, dstImage, dstChannelBytes, width, height, 4 * x, 4 * y, dstChannels);
                    src_off += 8;
                }
            }
        }
    }
    else {
        for (y = 0; y < height / 4; y++) {
            for (x = 0; x < width / 4; x++) {
                if (alphaFormat == AF_8BIT) {
                    decompressBlockAlphaC(src, src_off, dstImage, 3, width, height, 4 * x, 4 * y, dstChannels);
                    src_off += 8;
                }
                block_part1 = readBigEndian4byteWord(src, src_off);
                src_off += 4;
                block_part2 = readBigEndian4byteWord(src, src_off);
                src_off += 4;
                if (alphaFormat == AF_1BIT) {
                    decompressBlockETC21BitAlphaC(block_part1, block_part2, dstImage, dstImage, width, height, 4 * x, 4 * y, dstChannels);
                }
                else {
                    decompressBlockETC2c(block_part1, block_part2, dstImage, width, height, 4 * x, 4 * y, dstChannels);
                }
            }
        }
    }
    if (!(height == active_height && width == active_width)) {
        var dstPixelBytes = dstChannels * dstChannelBytes;
        var dstRowBytes = dstPixelBytes * width;
        var activeRowBytes = active_width * dstPixelBytes;
        const newimg = new Uint8Array(dstPixelBytes * active_width * active_height);
        var xx, yy;
        var zz;
        for (yy = 0; yy < active_height; yy++) {
            for (xx = 0; xx < active_width; xx++) {
                for (zz = 0; zz < dstPixelBytes; zz++) {
                    newimg[yy * activeRowBytes + xx * dstPixelBytes + zz] = dstImage[yy * dstRowBytes + xx * dstPixelBytes + zz];
                }
            }
        }
        dstImage = newimg;
    }
    if (forceRGBorRGBA) {
        switch (format) {
            case "RG":
                var newimg = isBuffer$d(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
                var total = dstImage.length;
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 4) {
                    var new_valueR = 0;
                    var new_valueG = 0;
                    if (formatSigned) {
                        new_valueR = ((dstImage[yy + 1] & 0xFFFF) << 8) | (dstImage[yy] & 0xFFFF);
                        new_valueR = new_valueR & 0x8000 ? -(0x10000 - new_valueR) : new_valueR;
                        new_valueR = scaleTo255(new_valueR, -32768, 32767);
                        new_valueG = ((dstImage[yy + 3] & 0xFFFF) << 8) | (dstImage[yy + 2] & 0xFFFF);
                        new_valueG = new_valueG & 0x8000 ? -(0x10000 - new_valueG) : new_valueG;
                        new_valueG = scaleTo255(new_valueG, -32768, 32767);
                    }
                    else {
                        new_valueR = ((dstImage[yy + 1] & 0xFFFF) << 8) | (dstImage[yy] & 0xFFFF);
                        new_valueR = new_valueR & 0xFFFF;
                        new_valueR = scaleTo255(new_valueR, 0, 65535);
                        new_valueG = ((dstImage[yy + 3] & 0xFFFF) << 8) | (dstImage[yy + 2] & 0xFFFF);
                        new_valueG = new_valueG & 0xFFFF;
                        new_valueG = scaleTo255(new_valueG, 0, 65535);
                    }
                    newimg[new_image_off] = new_valueR;
                    newimg[new_image_off + 1] = new_valueG;
                    newimg[new_image_off + 2] = 0;
                    if (forceRGBorRGBA == RGBA$1) {
                        newimg[new_image_off + 3] = 0xff;
                        new_image_off += 4;
                    }
                    else {
                        new_image_off += 3;
                    }
                }
                dstImage = newimg;
                break;
            case "R":
                var newimg = isBuffer$d(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
                var total = dstImage.length;
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 2) {
                    var new_value = 0;
                    if (formatSigned) {
                        new_value = ((dstImage[yy + 1] & 0xFFFF) << 8) | (dstImage[yy] & 0xFFFF);
                        new_value = new_value & 0x8000 ? -(0x10000 - new_value) : new_value;
                        new_value = scaleTo255(new_value, -32768, 32767);
                    }
                    else {
                        new_value = ((dstImage[yy + 1] & 0xFFFF) << 8) | (dstImage[yy] & 0xFFFF);
                        new_value = new_value & 0xFFFF;
                        new_value = scaleTo255(new_value, 0, 65535);
                    }
                    newimg[new_image_off] = new_value;
                    newimg[new_image_off + 1] = 0;
                    newimg[new_image_off + 2] = 0;
                    if (forceRGBorRGBA == RGBA$1) {
                        newimg[new_image_off + 3] = 0xff;
                        new_image_off += 4;
                    }
                    else {
                        new_image_off += 3;
                    }
                }
                dstImage = newimg;
                break;
            case "RGBA":
                break;
            case "RGB":
                var newimg = isBuffer$d(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
                var total = dstImage.length;
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 3) {
                    newimg[new_image_off] = dstImage[yy];
                    newimg[new_image_off + 1] = dstImage[yy + 1];
                    newimg[new_image_off + 2] = dstImage[yy + 2];
                    if (forceRGBorRGBA == RGBA$1) {
                        newimg[new_image_off + 3] = 0xff;
                        new_image_off += 4;
                    }
                    else {
                        new_image_off += 3;
                    }
                }
                dstImage = newimg;
                break;
            case "RGB_A":
                var newimg = isBuffer$d(src) ? Buffer.alloc(4 * width * (height / 2)) : new Uint8Array(4 * width * (height / 2));
                var alph_off = 3 * width * (height / 2);
                var total = 3 * width * (height / 2);
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 3) {
                    newimg[new_image_off] = dstImage[yy];
                    newimg[new_image_off + 1] = dstImage[yy + 1];
                    newimg[new_image_off + 2] = dstImage[yy + 2];
                    if (forceRGBorRGBA == RGBA$1) {
                        newimg[new_image_off + 3] = dstImage[alph_off];
                        new_image_off += 4;
                    }
                    else {
                        new_image_off += 3;
                    }
                    alph_off += 3;
                }
                dstImage = newimg;
                break;
        }
    }
    return dstImage;
}

function isBuffer$c(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$6(obj) {
    return obj instanceof Uint8Array || isBuffer$c(obj);
}
function check_size$2(width, height, bpp, src) {
    const size_needed = width * height * bpp / 8;
    if (src.length < size_needed) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`);
    }
}
function decodeBC1(src, width, height) {
    return decodeDXT1(src, width, height);
}
function decodeDXT1(src, width, height) {
    if (!isArrayOrBuffer$6(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    check_size$2(width, height, 4, src);
    const asBuffer = isBuffer$c(src) ? true : false;
    const output = asBuffer ? Buffer.alloc(width * height * 4) : new Uint8Array(width * height * 4);
    var offset = 0;
    const bcw = new Int32Array([(width + 3) / 4])[0];
    const bch = new Int32Array([(height + 3) / 4])[0];
    const clen_last = new Int32Array([(width + 3) % 4 + 1])[0];
    const buffer = new Uint32Array(16);
    const colors = new Int32Array(4);
    for (var t = 0; t < bch; t++) {
        for (var s = 0; s < bcw; s++, offset += 8) {
            const r0 = new Int32Array(1), g0 = new Int32Array(1), b0 = new Int32Array(1), r1 = new Int32Array(1), g1 = new Int32Array(1), b1 = new Int32Array(1), q0 = new Int32Array([src[offset + 0] | src[offset + 1] << 8]), q1 = new Int32Array([src[offset + 2] | src[offset + 3] << 8]);
            Rgb565(q0, r0, g0, b0);
            Rgb565(q1, r1, g1, b1);
            colors[0] = Color(r0[0], g0[0], b0[0], 255);
            colors[1] = Color(r1[0], g1[0], b1[0], 255);
            if (q0[0] > q1[0]) {
                colors[2] = Color(new Int32Array([(r0[0] * 2 + r1[0]) / 3])[0], new Int32Array([(g0[0] * 2 + g1[0]) / 3])[0], new Int32Array([(b0[0] * 2 + b1[0]) / 3])[0], 255);
                colors[3] = Color(new Int32Array([(r0[0] + r1[0] * 2) / 3])[0], new Int32Array([(g0[0] + g1[0] * 2) / 3])[0], new Int32Array([(b0[0] + b1[0] * 2) / 3])[0], 255);
            }
            else {
                colors[2] = Color(new Int32Array([(r0[0] + r1[0]) / 2])[0], new Int32Array([(g0[0] + g1[0]) / 2])[0], new Int32Array([(b0[0] + b1[0]) / 2])[0], 255);
            }
            const loc = offset + 4;
            var d = (((src[loc + 3] & 0xFF) << 24) | ((src[loc + 2] & 0xFF) << 16) | ((src[loc + 1] & 0xFF) << 8) | (src[loc] & 0xFF)) >>> 0;
            for (var i = 0; i < 16; i++, d >>= 2) {
                buffer[i] = colors[d & 3];
            }
            const clen = new Int32Array([(s < bcw - 1 ? 4 : clen_last) * 4])[0];
            const buffer8uint = new Uint8Array(buffer.buffer);
            for (var i = 0, y = t * 4; i < 4 && y < height; i++, y++) {
                const srcOff = i * 4 * 4;
                const dstOff = (y * width + s * 4) * 4;
                for (let z = 0; z < clen; z++) {
                    output[dstOff + z] = buffer8uint[srcOff + z];
                }
            }
        }
    }
    return output;
}
function decodeDXT2(src, width, height) {
    return decodeDXTn2(src, width, height, true);
}
function decodeBC2(src, width, height) {
    return decodeDXTn2(src, width, height, false);
}
function decodeDXT3(src, width, height) {
    return decodeDXTn2(src, width, height, false);
}
function lerp(v1, v2, r) {
    return v1 * (1 - r) + v2 * r;
}
function convert565ByteToRgb(byte) {
    return [
        Math.round(((byte >>> 11) & 31) * (255 / 31)),
        Math.round(((byte >>> 5) & 63) * (255 / 63)),
        Math.round((byte & 31) * (255 / 31))
    ];
}
function interpolateColorValues(firstVal, secondVal, isDxt1) {
    var firstColor = convert565ByteToRgb(firstVal), secondColor = convert565ByteToRgb(secondVal), colorValues = [...firstColor, 255, ...secondColor, 255];
    {
        colorValues.push(Math.round(lerp(firstColor[0], secondColor[0], 1 / 3)), Math.round(lerp(firstColor[1], secondColor[1], 1 / 3)), Math.round(lerp(firstColor[2], secondColor[2], 1 / 3)), 255, Math.round(lerp(firstColor[0], secondColor[0], 2 / 3)), Math.round(lerp(firstColor[1], secondColor[1], 2 / 3)), Math.round(lerp(firstColor[2], secondColor[2], 2 / 3)), 255);
    }
    return colorValues;
}
function multiply(component, multiplier) {
    if (!isFinite(multiplier) || multiplier === 0) {
        return 0;
    }
    return Math.round(component * multiplier);
}
function extractBitsFromUin16Array(array, shift, length) {
    var height = array.length, heightm1 = height - 1, width = 16, rowS = ((shift / width) | 0), rowE = (((shift + length - 1) / width) | 0), shiftS, shiftE, result;
    if (rowS === rowE) {
        shiftS = (shift % width);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
    }
    else {
        shiftS = (shift % width);
        shiftE = (width - shiftS);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
        result += (array[heightm1 - rowE] & (Math.pow(2, length - shiftE) - 1)) << shiftE;
    }
    return result;
}
function getAlphaIndex2(alphaIndices, pixelIndex) {
    return extractBitsFromUin16Array(alphaIndices, (3 * (15 - pixelIndex)), 3);
}
function interpolateAlphaValues(firstVal, secondVal) {
    var alphaValues = [firstVal, secondVal];
    if (firstVal > secondVal) {
        alphaValues.push(Math.floor(lerp(firstVal, secondVal, 1 / 7)), Math.floor(lerp(firstVal, secondVal, 2 / 7)), Math.floor(lerp(firstVal, secondVal, 3 / 7)), Math.floor(lerp(firstVal, secondVal, 4 / 7)), Math.floor(lerp(firstVal, secondVal, 5 / 7)), Math.floor(lerp(firstVal, secondVal, 6 / 7)));
    }
    else {
        alphaValues.push(Math.floor(lerp(firstVal, secondVal, 1 / 5)), Math.floor(lerp(firstVal, secondVal, 2 / 5)), Math.floor(lerp(firstVal, secondVal, 3 / 5)), Math.floor(lerp(firstVal, secondVal, 4 / 5)), 0, 255);
    }
    return alphaValues;
}
function decodeDXT4(src, width, height) {
    return decodeDXTn3(src, width, height, true);
}
function decodeDXT5(src, width, height) {
    return decodeDXTn3(src, width, height, false);
}
function decodeBC3(src, width, height) {
    return decodeDXTn3(src, width, height, false);
}
function decodeDXTn3(input, width, height, premultiplied) {
    if (!isArrayOrBuffer$6(input)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    check_size$2(width, height, 4, input);
    var rgba = isBuffer$c(input) ? Buffer.alloc(width * height * 4) : new Uint8Array(width * height * 4), height_4 = (height / 4) | 0, width_4 = (width / 4) | 0, offset = 0, alphaValues, alphaIndices, alphaIndex, alphaValue, multiplier, colorValues, colorIndices, colorIndex, pixelIndex, rgbaIndex, h, w, x, y;
    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            alphaValues = interpolateAlphaValues(input[offset] & 0xFF, input[offset + 1] & 0xFF);
            alphaIndices = [
                ((input[(offset + 6) + 1] << 8) | input[(offset + 6)]) & 0xFFFF,
                ((input[(offset + 4) + 1] << 8) | input[(offset + 4)]) & 0xFFFF,
                ((input[(offset + 2) + 1] << 8) | input[(offset + 2)]) & 0xFFFF
            ];
            colorValues = interpolateColorValues(((input[(offset + 8) + 1] << 8) | input[(offset + 8)]) & 0xFFFF, ((input[(offset + 10) + 1] << 8) | input[(offset + 10)]) & 0xFFFF);
            colorIndices = ((input[(offset + 12) + 3] << 24) | (input[(offset + 12) + 2] << 16) | (input[(offset + 12) + 1] << 8) | input[(offset + 12)]) >>> 0;
            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    alphaIndex = getAlphaIndex2(alphaIndices, pixelIndex);
                    alphaValue = alphaValues[alphaIndex];
                    multiplier = premultiplied ? 255 / alphaValue : 1;
                    rgba[rgbaIndex] = multiply(colorValues[colorIndex * 4], multiplier);
                    rgba[rgbaIndex + 1] = multiply(colorValues[colorIndex * 4 + 1], multiplier);
                    rgba[rgbaIndex + 2] = multiply(colorValues[colorIndex * 4 + 2], multiplier);
                    rgba[rgbaIndex + 3] = alphaValue;
                }
            }
            offset += 16;
        }
    }
    return rgba;
}
function getAlphaValue(alphaValue, pixelIndex) {
    return extractBitsFromUin16Array(alphaValue, (4 * (15 - pixelIndex)), 4) * 17;
}
function decodeDXTn2(input, width, height, premultiplied) {
    if (!isArrayOrBuffer$6(input)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    check_size$2(width, height, 4, input);
    var rgba = isBuffer$c(input) ? Buffer.alloc(width * height * 4) : new Uint8Array(width * height * 4), height_4 = (height / 4) | 0, width_4 = (width / 4) | 0, offset = 0, alphaValues, alphaValue, multiplier, colorValues, colorIndices, colorIndex, pixelIndex, rgbaIndex, h, w, x, y;
    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            alphaValues = [
                ((input[(offset + 6) + 1] << 8) | input[(offset + 6)]) & 0xFFFF,
                ((input[(offset + 4) + 1] << 8) | input[(offset + 4)]) & 0xFFFF,
                ((input[(offset + 2) + 1] << 8) | input[(offset + 2)]) & 0xFFFF,
                ((input[(offset + 0) + 1] << 8) | input[(offset + 0)]) & 0xFFFF
            ];
            colorValues = interpolateColorValues(((input[(offset + 8) + 1] << 8) | input[(offset + 8)]) & 0xFFFF, ((input[(offset + 10) + 1] << 8) | input[(offset + 10)]) & 0xFFFF);
            colorIndices = ((input[(offset + 12) + 3] << 24) | (input[(offset + 12) + 2] << 16) | (input[(offset + 12) + 1] << 8) | input[(offset + 12)]) >>> 0;
            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    alphaValue = getAlphaValue(alphaValues, pixelIndex);
                    multiplier = premultiplied ? 255 / alphaValue : 1;
                    rgba[rgbaIndex] = multiply(colorValues[colorIndex * 4], multiplier);
                    rgba[rgbaIndex + 1] = multiply(colorValues[colorIndex * 4 + 1], multiplier);
                    rgba[rgbaIndex + 2] = multiply(colorValues[colorIndex * 4 + 2], multiplier);
                    rgba[rgbaIndex + 3] = getAlphaValue(alphaValues, pixelIndex);
                }
            }
            offset += 16;
        }
    }
    return rgba;
}
function Rgb565(c, r, g, b) {
    r[0] = (c[0] & 0xf800) >> 8;
    g[0] = (c[0] & 0x07e0) >> 3;
    b[0] = (c[0] & 0x001f) << 3;
    r[0] |= r[0] >> 5;
    g[0] |= g[0] >> 6;
    b[0] |= b[0] >> 5;
}
function Color(r, g, b, a) {
    return r << 16 | g << 8 | b | a << 24;
}

function decode_atc_rgb4_block(data, outbuf) {
    const color0 = data[0] | (data[1] << 8);
    const color1 = data[2] | (data[3] << 8);
    var sels = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
    const mode = (color0 & 0x8000) != 0;
    let c = new Uint8Array(16);
    c[0] = (color0 >> 10) & 31;
    c[1] = (color0 >> 5) & 31;
    c[2] = color0 & 31;
    c[3] = 255;
    c[0] = (c[0] << 3) | (c[0] >> 2);
    c[1] = (c[1] << 3) | (c[1] >> 2);
    c[2] = (c[2] << 3) | (c[2] >> 2);
    c[12] = (color1 >> 11) & 31;
    c[13] = (color1 >> 5) & 63;
    c[14] = color1 & 31;
    c[15] = 255;
    c[12] = (c[12] << 3) | (c[12] >> 2);
    c[13] = (c[13] << 2) | (c[13] >> 4);
    c[14] = (c[14] << 3) | (c[14] >> 2);
    if (mode) {
        c[4] = Math.max(0, c[0] - (c[12] >> 2));
        c[5] = Math.max(0, c[1] - (c[13] >> 2));
        c[6] = Math.max(0, c[2] - (c[14] >> 2));
        c[7] = 255;
        c[8] = c[0];
        c[9] = c[1];
        c[10] = c[2];
        c[11] = c[3];
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
function isBuffer$b(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$5(obj) {
    return obj instanceof Uint8Array || isBuffer$b(obj);
}
function copy_block_buffer$3(bx, by, w, h, bw, bh, buffer, image) {
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
function decodeATI1(src, width, height) {
    return decodeBC4(src, width, height);
}
function decodeATI(src, width, height, Do2) {
    if (Do2) {
        return decodeBC5(src, width, height);
    }
    else {
        return decodeBC4(src, width, height);
    }
}
function decodeBC4(src, width, height) {
    if (!isArrayOrBuffer$5(src)) {
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
            copy_block_buffer$3(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$b(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
function decodeATI2(src, width, height) {
    return decodeBC5(src, width, height);
}
function decodeBC5(src, width, height) {
    if (!isArrayOrBuffer$5(src)) {
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
            copy_block_buffer$3(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$b(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
function decodeATC(src, width, height, Do8bitMode) {
    if (Do8bitMode) {
        return decodeATC8(src, width, height);
    }
    else {
        return decodeATC4(src, width, height);
    }
}
function decodeATC8(src, width, height) {
    if (!isArrayOrBuffer$5(src)) {
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
            copy_block_buffer$3(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$b(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
function decodeATC4(src, width, height) {
    if (!isArrayOrBuffer$5(src)) {
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
            copy_block_buffer$3(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$b(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}

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
function isBuffer$a(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$5(obj) {
    return obj instanceof Uint8Array || isBuffer$a(obj);
}
function decodePVRTC2bit(src, width, height) {
    return decodePVRTC(src, width, height, true);
}
function decodePVRTC4bit(src, width, height) {
    return decodePVRTC(src, width, height, false);
}
function check_size$1(width, height, bpp, src) {
    const size_needed = width * height * bpp / 8;
    if (src.length < size_needed) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`);
    }
}
function decodePVRTC(src, width, height, Do2bitMode) {
    if (!arraybuffcheck$5(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    check_size$1(width, height, Do2bitMode ? 2 : 4, src);
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
    return flat32(pDecompressedData, isBuffer$a(src));
}

class bits {
    constructor() {
        this.bits = 0;
        this.nonbits = 0;
    }
}
function clamp(n, l, h) {
    return n <= l ? l : n >= h ? h : n;
}
function color$2(r, g, b, a) {
    return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;
}
function fp16_ieee_to_fp32_value$1(h) {
    const uint16Value = h;
    const sign = (uint16Value & 0x8000) >> 15;
    const exponent = (uint16Value & 0x7C00) >> 10;
    const fraction = uint16Value & 0x03FF;
    let floatValue;
    if (exponent === 0) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? 0 : -0;
        }
        else {
            floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 0x0400);
        }
    }
    else if (exponent === 0x1F) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        else {
            floatValue = Number.NaN;
        }
    }
    else {
        floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
    }
    return floatValue;
}
const BIT_REVERSE_TABLE = new Uint8Array([
    0x00, 0x80, 0x40, 0xC0, 0x20, 0xA0, 0x60, 0xE0, 0x10, 0x90, 0x50, 0xD0, 0x30, 0xB0, 0x70, 0xF0,
    0x08, 0x88, 0x48, 0xC8, 0x28, 0xA8, 0x68, 0xE8, 0x18, 0x98, 0x58, 0xD8, 0x38, 0xB8, 0x78, 0xF8,
    0x04, 0x84, 0x44, 0xC4, 0x24, 0xA4, 0x64, 0xE4, 0x14, 0x94, 0x54, 0xD4, 0x34, 0xB4, 0x74, 0xF4,
    0x0C, 0x8C, 0x4C, 0xCC, 0x2C, 0xAC, 0x6C, 0xEC, 0x1C, 0x9C, 0x5C, 0xDC, 0x3C, 0xBC, 0x7C, 0xFC,
    0x02, 0x82, 0x42, 0xC2, 0x22, 0xA2, 0x62, 0xE2, 0x12, 0x92, 0x52, 0xD2, 0x32, 0xB2, 0x72, 0xF2,
    0x0A, 0x8A, 0x4A, 0xCA, 0x2A, 0xAA, 0x6A, 0xEA, 0x1A, 0x9A, 0x5A, 0xDA, 0x3A, 0xBA, 0x7A, 0xFA,
    0x06, 0x86, 0x46, 0xC6, 0x26, 0xA6, 0x66, 0xE6, 0x16, 0x96, 0x56, 0xD6, 0x36, 0xB6, 0x76, 0xF6,
    0x0E, 0x8E, 0x4E, 0xCE, 0x2E, 0xAE, 0x6E, 0xEE, 0x1E, 0x9E, 0x5E, 0xDE, 0x3E, 0xBE, 0x7E, 0xFE,
    0x01, 0x81, 0x41, 0xC1, 0x21, 0xA1, 0x61, 0xE1, 0x11, 0x91, 0x51, 0xD1, 0x31, 0xB1, 0x71, 0xF1,
    0x09, 0x89, 0x49, 0xC9, 0x29, 0xA9, 0x69, 0xE9, 0x19, 0x99, 0x59, 0xD9, 0x39, 0xB9, 0x79, 0xF9,
    0x05, 0x85, 0x45, 0xC5, 0x25, 0xA5, 0x65, 0xE5, 0x15, 0x95, 0x55, 0xD5, 0x35, 0xB5, 0x75, 0xF5,
    0x0D, 0x8D, 0x4D, 0xCD, 0x2D, 0xAD, 0x6D, 0xED, 0x1D, 0x9D, 0x5D, 0xDD, 0x3D, 0xBD, 0x7D, 0xFD,
    0x03, 0x83, 0x43, 0xC3, 0x23, 0xA3, 0x63, 0xE3, 0x13, 0x93, 0x53, 0xD3, 0x33, 0xB3, 0x73, 0xF3,
    0x0B, 0x8B, 0x4B, 0xCB, 0x2B, 0xAB, 0x6B, 0xEB, 0x1B, 0x9B, 0x5B, 0xDB, 0x3B, 0xBB, 0x7B, 0xFB,
    0x07, 0x87, 0x47, 0xC7, 0x27, 0xA7, 0x67, 0xE7, 0x17, 0x97, 0x57, 0xD7, 0x37, 0xB7, 0x77, 0xF7,
    0x0F, 0x8F, 0x4F, 0xCF, 0x2F, 0xAF, 0x6F, 0xEF, 0x1F, 0x9F, 0x5F, 0xDF, 0x3F, 0xBF, 0x7F, 0xFF,
]);
const WEIGHT_PREC_TABLE_A = new Int32Array([0, 0, 0, 3, 0, 5, 3, 0, 0, 0, 5, 3, 0, 5, 3, 0]);
const WEIGHT_PREC_TABLE_B = new Int32Array([0, 0, 1, 0, 2, 0, 1, 3, 0, 0, 1, 2, 4, 2, 3, 5]);
const CEM_TABLE_A = new Int32Array([0, 3, 5, 0, 3, 5, 0, 3, 5, 0, 3, 5, 0, 3, 5, 0, 3, 0, 0]);
const CEM_TABLE_B = new Int32Array([8, 6, 5, 7, 5, 4, 6, 4, 3, 5, 3, 2, 4, 2, 1, 3, 1, 2, 1]);
function bit_reverse_u8(c, bits) {
    const x = BIT_REVERSE_TABLE[c] >>> (8 - bits);
    if (x !== 0) {
        return x;
    }
    else {
        return 0;
    }
}
function bit_reverse_u64(d, bits) {
    const ret = BigInt(BIT_REVERSE_TABLE[Number(d & 0xffn)]) << 56n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 8n) & 0xffn)]) << 48n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 16n) & 0xffn)]) << 40n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 24n) & 0xffn)]) << 32n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 32n) & 0xffn)]) << 24n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 40n) & 0xffn)]) << 16n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 48n) & 0xffn)]) << 8n |
        BigInt(BIT_REVERSE_TABLE[Number((d >> 56n) & 0xffn)]);
    return ret >> (64n - BigInt(bits));
}
function u8ptr_to_u16(ptr) {
    return ((ptr[1] << 8) | ptr[0]) & 0xFFFF;
}
function bit_transfer_signed_alt(v, a, b) {
    v[b] = (v[b] >> 1) | (v[a] & 0x80);
    v[a] = (v[a] >> 1) & 0x3f;
    if ((v[a] & 0x20) != 0) {
        v[a] -= 0x40;
    }
}
function set_endpoint(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = r1;
    endpoint[1] = g1;
    endpoint[2] = b1;
    endpoint[3] = a1;
    endpoint[4] = r2;
    endpoint[5] = g2;
    endpoint[6] = b2;
    endpoint[7] = a2;
}
function set_endpoint_clamp(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = clamp(r1, 0, 255);
    endpoint[1] = clamp(g1, 0, 255);
    endpoint[2] = clamp(b1, 0, 255);
    endpoint[3] = clamp(a1, 0, 255);
    endpoint[4] = clamp(r2, 0, 255);
    endpoint[5] = clamp(g2, 0, 255);
    endpoint[6] = clamp(b2, 0, 255);
    endpoint[7] = clamp(a2, 0, 255);
}
function set_endpoint_blue(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = (r1 + b1) >> 1;
    endpoint[1] = (g1 + b1) >> 1;
    endpoint[2] = b1;
    endpoint[3] = a1;
    endpoint[4] = (r2 + b2) >> 1;
    endpoint[5] = (g2 + b2) >> 1;
    endpoint[6] = b2;
    endpoint[7] = a2;
}
function set_endpoint_blue_clamp(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = clamp(((r1 + b1) >> 1), 0, 255);
    endpoint[1] = clamp(((g1 + b1) >> 1), 0, 255);
    endpoint[2] = clamp(b1, 0, 255);
    endpoint[3] = clamp(a1, 0, 255);
    endpoint[4] = clamp(((r2 + b2) >> 1), 0, 255);
    endpoint[5] = clamp(((g2 + b2) >> 1), 0, 255);
    endpoint[6] = clamp(b2, 0, 255);
    endpoint[7] = clamp(a2, 0, 255);
}
function set_endpoint_hdr(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = r1;
    endpoint[1] = g1;
    endpoint[2] = b1;
    endpoint[3] = a1;
    endpoint[4] = r2;
    endpoint[5] = g2;
    endpoint[6] = b2;
    endpoint[7] = a2;
}
function set_endpoint_hdr_clamp(endpoint, r1, g1, b1, a1, r2, g2, b2, a2) {
    endpoint[0] = clamp(r1, 0, 0xfff);
    endpoint[1] = clamp(g1, 0, 0xfff);
    endpoint[2] = clamp(b1, 0, 0xfff);
    endpoint[3] = clamp(a1, 0, 0xfff);
    endpoint[4] = clamp(r2, 0, 0xfff);
    endpoint[5] = clamp(g2, 0, 0xfff);
    endpoint[6] = clamp(b2, 0, 0xfff);
    endpoint[7] = clamp(a2, 0, 0xfff);
}
function select_color(v0, v1, weight) {
    return Math.floor(((((v0 << 8 | v0) * (64 - weight) + (v1 << 8 | v1) * weight + 32) >> 6) * 255 + 32768) / 65536) & 0xFF;
}
function select_color_hdr(v0, v1, weight) {
    let c = (((v0 << 4) * (64 - weight) + (v1 << 4) * weight + 32) >> 6) & 0xFFFF;
    let m = new Uint16Array([(c & 0x7ff)]);
    if (m[0] < 512) {
        m[0] *= 3;
    }
    else if (m[0] < 1536) {
        m[0] = 4 * m[0] - 512;
    }
    else {
        m[0] = 5 * m[0] - 2048;
    }
    let f = fp16_ieee_to_fp32_value$1((c >> 1 & 0x7c00) | m[0] >> 3);
    if (Number.isFinite(f)) {
        return clamp(Math.round(f * 255.0), 0, 255);
    }
    else {
        return 255;
    }
}
function f32_to_u8$1(f) {
    return clamp(Math.round(f * 255.0), 0.0, 255.0);
}
function f16ptr_to_u8(ptr) {
    return f32_to_u8$1(fp16_ieee_to_fp32_value$1(((ptr[1] << 8) | ptr[0])) & 0xFFFF);
}
function getbits64(buf, bit, len) {
    var bits = len;
    var off_in_bits = bit;
    var value = 0n;
    for (var i = 0; i < bits;) {
        var remaining = bits - i;
        var bitOffset = off_in_bits & 7;
        var currentByte = buf[off_in_bits >> 3];
        var read = Math.min(remaining, 8 - bitOffset);
        var mask, readBits;
        mask = ~(0xFF << read);
        readBits = (currentByte >> bitOffset) & mask;
        value |= BigInt(readBits) << BigInt(i);
        off_in_bits += read;
        i += read;
    }
    return value >> BigInt(0);
}
function getbits(buf, bitOffset, numBits) {
    var bits = numBits;
    var off_in_bits = bitOffset;
    var value = 0;
    for (var i = 0; i < bits;) {
        var remaining = bits - i;
        var bitOffset = off_in_bits & 7;
        var currentByte = buf[off_in_bits >> 3];
        var read = Math.min(remaining, 8 - bitOffset);
        var mask, readBits;
        mask = ~(0xFF << read);
        readBits = (currentByte >> bitOffset) & mask;
        value |= readBits << i;
        off_in_bits += read;
        i += read;
    }
    return value >>> 0;
}
function BlockDataDefault() {
    return {
        bw: 0,
        bh: 0,
        width: 0,
        height: 0,
        part_num: 0,
        dual_plane: false,
        plane_selector: 0,
        weight_range: 0,
        weight_num: 0,
        cem: new Int32Array(4),
        cem_range: 0,
        endpoint_value_num: 0,
        endpoints: Array.from({ length: 4 }, () => new Int32Array(8)),
        weights: Array.from({ length: 144 }, () => new Int32Array(2)),
        partition: new Int32Array(144),
    };
}
function decode_intseq(buf, offset, a, b, count, reverse, out) {
    const MT = new Int32Array([0, 2, 4, 5, 7]);
    const MQ = new Int32Array([0, 3, 5]);
    const TRITS_TABLE = [
        new Int32Array([
            0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0,
            1, 2, 0, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1,
            2, 2, 0, 1, 2, 1, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2,
            1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0,
            0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0,
            1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1,
            2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 1, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2,
            2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1,
            0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 0, 0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 2,
        ]),
        new Int32Array([
            0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 0,
            0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2,
            2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1,
            1, 2, 2, 2, 1, 2, 2, 2, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 1,
            1, 1, 1, 1, 2, 2, 2, 1, 2, 2, 2, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0,
            0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2,
            2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2,
            0, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1, 0,
            2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 2, 2, 1,
        ]),
        new Int32Array([
            0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 0,
            0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1,
            1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1,
            2, 1, 1, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 1, 2,
            1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 1,
            1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 2, 2,
            2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0,
            2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 0, 0, 0, 2, 0, 0, 0, 2,
            0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 2,
        ]),
        new Int32Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2,
            2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2,
        ]),
        new Int32Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        ]),
    ];
    const QUINTS_TABLE = [
        new Int32Array([
            0, 1, 2, 3, 4, 0, 4, 4, 0, 1, 2, 3, 4, 1, 4, 4, 0, 1, 2, 3, 4, 2, 4, 4, 0, 1, 2, 3, 4,
            3, 4, 4, 0, 1, 2, 3, 4, 0, 4, 0, 0, 1, 2, 3, 4, 1, 4, 1, 0, 1, 2, 3, 4, 2, 4, 2, 0, 1,
            2, 3, 4, 3, 4, 3, 0, 1, 2, 3, 4, 0, 2, 3, 0, 1, 2, 3, 4, 1, 2, 3, 0, 1, 2, 3, 4, 2, 2,
            3, 0, 1, 2, 3, 4, 3, 2, 3, 0, 1, 2, 3, 4, 0, 0, 1, 0, 1, 2, 3, 4, 1, 0, 1, 0, 1, 2, 3,
            4, 2, 0, 1, 0, 1, 2, 3, 4, 3, 0, 1,
        ]),
        new Int32Array([
            0, 0, 0, 0, 0, 4, 4, 4, 1, 1, 1, 1, 1, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4, 4, 3, 3, 3, 3, 3,
            4, 4, 4, 0, 0, 0, 0, 0, 4, 0, 4, 1, 1, 1, 1, 1, 4, 1, 4, 2, 2, 2, 2, 2, 4, 2, 4, 3, 3,
            3, 3, 3, 4, 3, 4, 0, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 1, 1, 4, 1, 1, 2, 2, 2, 2, 2, 4, 2,
            2, 3, 3, 3, 3, 3, 4, 3, 3, 0, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 1, 1, 4, 1, 1, 2, 2, 2, 2,
            2, 4, 2, 2, 3, 3, 3, 3, 3, 4, 3, 3,
        ]),
        new Int32Array([
            0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1, 4, 0, 0, 0, 0, 0, 0, 2, 4, 0, 0, 0, 0, 0,
            0, 3, 4, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1,
            1, 1, 1, 1, 4, 4, 2, 2, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 2, 2, 4,
            4, 2, 2, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3,
            3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4,
        ]),
    ];
    if (count <= 0) {
        return;
    }
    var n = 0;
    if (a == 3) {
        var mask = (1 << b) - 1;
        var block_count = Math.floor((count + 4) / 5);
        var last_block_count = (count + 4) % 5 + 1;
        var block_size = 8 + 5 * b;
        var last_block_size = Math.floor((block_size * last_block_count + 4) / 5);
        if (reverse) {
            for (var i = 0, p = offset; i < block_count; i++, p -= block_size) {
                var now_size = (i < block_count - 1) ? block_size : last_block_size;
                var d = bit_reverse_u64(getbits64(buf, p - now_size, now_size), now_size);
                var x = (d >> BigInt(b) & 3n) | (d >> BigInt(b) * 2n & 0xcn) | (d >> BigInt(b) * 3n & 0x10n) | (d >> BigInt(b) * 4n & 0x60n) | (d >> BigInt(b) * 5n & 0x80n);
                for (var j = 0; j < 5 && n < count; j++, n++) {
                    out[n].bits = Number(d >> BigInt(MT[j] + b * j)) & mask;
                    out[n].nonbits = TRITS_TABLE[j][Number(x)];
                }
            }
        }
        else {
            for (var i = 0, p = offset; i < block_count; i++, p += block_size) {
                var now_size = (i < block_count - 1) ? block_size : last_block_size;
                var d = getbits64(buf, p, now_size);
                var x = (d >> BigInt(b) & 3n)
                    | (d >> BigInt(b) * 2n & 0xcn)
                    | (d >> BigInt(b) * 3n & 0x10n)
                    | (d >> BigInt(b) * 4n & 0x60n)
                    | (d >> BigInt(b) * 5n & 0x80n);
                for (var j = 0; j < 5 && n < count; j++, n++) {
                    out[n].bits = Number(d >> BigInt(MT[j] + b * j)) & mask;
                    out[n].nonbits = TRITS_TABLE[j][Number(x)];
                }
            }
        }
    }
    else if (a == 5) {
        var mask = (1 << b) - 1;
        var block_count = Math.floor((count + 2) / 3);
        var last_block_count = (count + 2) % 3 + 1;
        var block_size = 7 + 3 * b;
        var last_block_size = Math.floor((block_size * last_block_count + 2) / 3);
        if (reverse) {
            for (var i = 0, p = offset; i < block_count; i++, p -= block_size) {
                var now_size = (i < block_count - 1) ? block_size : last_block_size;
                var d = bit_reverse_u64(getbits64(buf, p - now_size, now_size), now_size);
                var x = (d >> BigInt(b) & 7n) | (d >> BigInt(b) * 2n & 0x18n) | (d >> BigInt(b) * 3n & 0x60n);
                for (var j = 0; j < 3 && n < count; j++, n++) {
                    out[n].bits = Number(d >> BigInt(MQ[j] + b * j)) & mask;
                    out[n].nonbits = QUINTS_TABLE[j][Number(x)];
                }
            }
        }
        else {
            for (var i = 0, p = offset; i < block_count; i++, p += block_size) {
                var d = getbits64(buf, p, (i < block_count - 1) ? block_size : last_block_size);
                var x = (d >> BigInt(b) & 7n) | (d >> BigInt(b) * 2n & 0x18n) | (d >> BigInt(b) * 3n & 0x60n);
                for (var j = 0; j < 3 && n < count; j++, n++) {
                    out[n].bits = Number(d >> BigInt(MQ[j] + b * j)) & mask;
                    out[n].nonbits = QUINTS_TABLE[j][Number(x)];
                }
            }
        }
    }
    else {
        if (reverse) {
            for (var p = offset - b; n < count; n++, p -= b) {
                out[n].bits = bit_reverse_u8(getbits(buf, p, b), b);
                out[n].nonbits = 0;
            }
        }
        else {
            for (var p = offset; n < count; n++, p += b) {
                out[n].bits = getbits(buf, p, b);
                out[n].nonbits = 0;
            }
        }
    }
}
function decode_block_params(buf, block_data) {
    block_data.dual_plane = (buf[1] & 4) != 0;
    block_data.weight_range = ((buf[0] >> 4 & 1) | (buf[1] << 2 & 8));
    if ((buf[0] & 3) != 0) {
        block_data.weight_range |= buf[0] << 1 & 6;
        switch (buf[0] & 0xc) {
            case 0:
                block_data.width = (u8ptr_to_u16(buf) >> 7 & 3) + 4;
                block_data.height = (buf[0] >> 5 & 3) + 2;
                break;
            case 4:
                block_data.width = (u8ptr_to_u16(buf) >> 7 & 3) + 8;
                block_data.height = (buf[0] >> 5 & 3) + 2;
                break;
            case 8:
                block_data.width = (buf[0] >> 5 & 3) + 2;
                block_data.height = (u8ptr_to_u16(buf) >> 7 & 3) + 8;
                break;
            case 12:
                if ((buf[1] & 1) != 0) {
                    block_data.width = (buf[0] >> 7 & 1) + 2;
                    block_data.height = (buf[0] >> 5 & 3) + 2;
                }
                else {
                    block_data.width = (buf[0] >> 5 & 3) + 2;
                    block_data.height = (buf[0] >> 7 & 1) + 6;
                }
                break;
        }
    }
    else {
        block_data.weight_range |= buf[0] >> 1 & 6;
        switch (u8ptr_to_u16(buf) & 0x180) {
            case 0:
                block_data.width = 12;
                block_data.height = (buf[0] >> 5 & 3) + 2;
                break;
            case 0x80:
                block_data.width = (buf[0] >> 5 & 3) + 2;
                block_data.height = 12;
                break;
            case 0x100:
                block_data.width = (buf[0] >> 5 & 3) + 6;
                block_data.height = (buf[1] >> 1 & 3) + 6;
                block_data.dual_plane = false;
                block_data.weight_range &= 7;
                break;
            case 0x180:
                block_data.width = (buf[0] & 0x20) != 0 ? 10 : 6;
                block_data.height = (buf[0] & 0x20) != 0 ? 6 : 10;
                break;
        }
    }
    block_data.part_num = (buf[1] >> 3 & 3) + 1;
    block_data.weight_num = block_data.width * block_data.height;
    if (block_data.dual_plane) {
        block_data.weight_num *= 2;
    }
    let config_bits;
    let cem_base = 0;
    let weight_bits;
    switch (WEIGHT_PREC_TABLE_A[block_data.weight_range]) {
        case 3:
            weight_bits = Math.floor(block_data.weight_num * WEIGHT_PREC_TABLE_B[block_data.weight_range]
                + (block_data.weight_num * 8 + 4) / 5);
            break;
        case 5:
            weight_bits = Math.floor(block_data.weight_num * WEIGHT_PREC_TABLE_B[block_data.weight_range]
                + (block_data.weight_num * 7 + 2) / 3);
            break;
        default:
            weight_bits = block_data.weight_num * WEIGHT_PREC_TABLE_B[block_data.weight_range];
            break;
    }
    if (block_data.part_num == 1) {
        block_data.cem[0] = u8ptr_to_u16(buf.subarray(1)) >> 5 & 0xf;
        config_bits = 17;
    }
    else {
        cem_base = u8ptr_to_u16(buf.subarray(2)) >> 7 & 3;
        if (cem_base == 0) {
            let cem = buf[3] >> 1 & 0xf;
            for (let dd = 0; dd < block_data.part_num; dd++) {
                block_data.cem[dd] = cem;
            }
            config_bits = 29;
        }
        else {
            for (let i = 0; i < Number(block_data.part_num); i++) {
                block_data.cem[i] = (buf[3] >> (i + 1) & 1) + cem_base - 1 << 2;
            }
            switch (block_data.part_num) {
                case 2:
                    block_data.cem[0] |= buf[3] >> 3 & 3;
                    block_data.cem[1] |= getbits(buf, 126 - weight_bits, 2);
                    break;
                case 3:
                    block_data.cem[0] |= buf[3] >> 4 & 1;
                    block_data.cem[0] |= getbits(buf, 122 - weight_bits, 2) & 2;
                    block_data.cem[1] |= getbits(buf, 124 - weight_bits, 2);
                    block_data.cem[2] |= getbits(buf, 126 - weight_bits, 2);
                    break;
                case 4:
                    for (let xx = 0; xx < 4; xx++) {
                        block_data.cem[xx] |=
                            getbits(buf, 120 + xx * 2 - weight_bits, 2);
                    }
                    break;
            }
            config_bits = 25 + block_data.part_num * 3;
        }
    }
    if (block_data.dual_plane) {
        config_bits += 2;
        block_data.plane_selector = getbits(buf, cem_base != 0 ?
            130 - weight_bits - block_data.part_num * 3
            :
                126 - weight_bits, 2);
    }
    let remain_bits = 128 - config_bits - weight_bits;
    block_data.endpoint_value_num = 0;
    for (let i = 0; i < block_data.part_num; i++) {
        block_data.endpoint_value_num += (block_data.cem[i] >> 1 & 6) + 2;
    }
    let endpoint_bits;
    for (let i = 0; i < CEM_TABLE_A.length; i++) {
        switch (CEM_TABLE_A[i]) {
            case 3:
                endpoint_bits = Math.floor(block_data.endpoint_value_num * CEM_TABLE_B[i]
                    + (block_data.endpoint_value_num * 8 + 4) / 5);
                break;
            case 5:
                endpoint_bits = Math.floor(block_data.endpoint_value_num * CEM_TABLE_B[i]
                    + (block_data.endpoint_value_num * 7 + 2) / 3);
                break;
            default:
                endpoint_bits = block_data.endpoint_value_num * CEM_TABLE_B[i];
        }
        if (endpoint_bits <= remain_bits) {
            block_data.cem_range = i;
            break;
        }
    }
}
function decode_endpoints_hdr7(endpoints, v) {
    let modeval = (v[2] >> 4 & 0x8) | (v[1] >> 5 & 0x4) | (v[0] >> 6);
    let major_component = (modeval & 0xc) != 0xc ? modeval >> 2 : (modeval != 0xf) ? modeval & 3 : 0;
    let mode = (modeval & 0xc) != 0xc ? modeval & 3 : (modeval != 0xf) ? 4 : 5;
    let c = new Int32Array([v[0] & 0x3f, v[1] & 0x1f, v[2] & 0x1f, v[3] & 0x1f]);
    switch (mode) {
        case 0:
            c[3] |= v[3] & 0x60;
            c[0] |= v[3] >> 1 & 0x40;
            c[0] |= v[2] << 1 & 0x80;
            c[0] |= v[1] << 3 & 0x300;
            c[0] |= v[2] << 5 & 0x400;
            c[0] <<= 1;
            c[1] <<= 1;
            c[2] <<= 1;
            c[3] <<= 1;
            break;
        case 1:
            c[1] |= v[1] & 0x20;
            c[2] |= v[2] & 0x20;
            c[0] |= v[3] >> 1 & 0x40;
            c[0] |= v[2] << 1 & 0x80;
            c[0] |= v[1] << 2 & 0x100;
            c[0] |= v[3] << 4 & 0x600;
            c[0] <<= 1;
            c[1] <<= 1;
            c[2] <<= 1;
            c[3] <<= 1;
            break;
        case 2:
            c[3] |= v[3] & 0xe0;
            c[0] |= v[2] << 1 & 0xc0;
            c[0] |= v[1] << 3 & 0x300;
            c[0] <<= 2;
            c[1] <<= 2;
            c[2] <<= 2;
            c[3] <<= 2;
            break;
        case 3:
            c[1] |= v[1] & 0x20;
            c[2] |= v[2] & 0x20;
            c[3] |= v[3] & 0x60;
            c[0] |= v[3] >> 1 & 0x40;
            c[0] |= v[2] << 1 & 0x80;
            c[0] |= v[1] << 2 & 0x100;
            c[0] <<= 3;
            c[1] <<= 3;
            c[2] <<= 3;
            c[3] <<= 3;
            break;
        case 4:
            c[1] |= v[1] & 0x60;
            c[2] |= v[2] & 0x60;
            c[3] |= v[3] & 0x20;
            c[0] |= v[3] >> 1 & 0x40;
            c[0] |= v[3] << 1 & 0x80;
            c[0] <<= 4;
            c[1] <<= 4;
            c[2] <<= 4;
            c[3] <<= 4;
            break;
        case 5:
            c[1] |= v[1] & 0x60;
            c[2] |= v[2] & 0x60;
            c[3] |= v[3] & 0x60;
            c[0] |= v[3] >> 1 & 0x40;
            c[0] <<= 5;
            c[1] <<= 5;
            c[2] <<= 5;
            c[3] <<= 5;
            break;
    }
    if (mode != 5) {
        c[1] = c[0] - c[1];
        c[2] = c[0] - c[2];
    }
    switch (major_component) {
        case 1:
            set_endpoint_hdr_clamp(endpoints, c[1] - c[3], c[0] - c[3], c[2] - c[3], 0x780, c[1], c[0], c[2], 0x780);
            break;
        case 2:
            set_endpoint_hdr_clamp(endpoints, c[2] - c[3], c[1] - c[3], c[0] - c[3], 0x780, c[2], c[1], c[0], 0x780);
            break;
        default:
            set_endpoint_hdr_clamp(endpoints, c[0] - c[3], c[1] - c[3], c[2] - c[3], 0x780, c[0], c[1], c[2], 0x780);
            break;
    }
}
function decode_endpoints_hdr11(endpoints, v, alpha1, alpha2) {
    let major_component = (v[4] >> 7) | (v[5] >> 6 & 2);
    if (major_component == 3) {
        set_endpoint_hdr(endpoints, v[0] << 4, v[2] << 4, v[4] << 5 & 0xfe0, alpha1, v[1] << 4, v[3] << 4, v[5] << 5 & 0xfe0, alpha2);
        return;
    }
    let mode = (v[1] >> 7) | (v[2] >> 6 & 2) | (v[3] >> 5 & 4);
    let va = v[0] | (v[1] << 2 & 0x100);
    let vb0 = v[2] & 0x3f;
    let vb1 = v[3] & 0x3f;
    let vc = v[1] & 0x3f;
    let vd0;
    let vd1;
    switch (mode) {
        case 0:
        case 2:
            vd0 = v[4] & 0x7f;
            if ((vd0 & 0x40) != 0) {
                vd0 |= 0xff80;
            }
            vd1 = v[5] & 0x7f;
            if ((vd1 & 0x40) != 0) {
                vd1 |= 0xff80;
            }
            break;
        case 1:
        case 3:
        case 5:
        case 7:
            vd0 = v[4] & 0x3f;
            if ((vd0 & 0x20) != 0) {
                vd0 |= 0xffc0;
            }
            vd1 = v[5] & 0x3f;
            if ((vd1 & 0x20) != 0) {
                vd1 |= 0xffc0;
            }
            break;
        default:
            vd0 = v[4] & 0x1f;
            if ((vd0 & 0x10) != 0) {
                vd0 |= 0xffe0;
            }
            vd1 = v[5] & 0x1f;
            if ((vd1 & 0x10) != 0) {
                vd1 |= 0xffe0;
            }
            break;
    }
    switch (mode) {
        case 0:
            vb0 |= v[2] & 0x40;
            vb1 |= v[3] & 0x40;
            break;
        case 1:
            vb0 |= v[2] & 0x40;
            vb1 |= v[3] & 0x40;
            vb0 |= v[4] << 1 & 0x80;
            vb1 |= v[5] << 1 & 0x80;
            break;
        case 2:
            va |= v[2] << 3 & 0x200;
            vc |= v[3] & 0x40;
            break;
        case 3:
            va |= v[4] << 3 & 0x200;
            vc |= v[5] & 0x40;
            vb0 |= v[2] & 0x40;
            vb1 |= v[3] & 0x40;
            break;
        case 4:
            va |= v[4] << 4 & 0x200;
            va |= v[5] << 5 & 0x400;
            vb0 |= v[2] & 0x40;
            vb1 |= v[3] & 0x40;
            vb0 |= v[4] << 1 & 0x80;
            vb1 |= v[5] << 1 & 0x80;
            break;
        case 5:
            va |= v[2] << 3 & 0x200;
            va |= v[3] << 4 & 0x400;
            vc |= v[5] & 0x40;
            vc |= v[4] << 1 & 0x80;
            break;
        case 6:
            va |= v[4] << 4 & 0x200;
            va |= v[5] << 5 & 0x400;
            va |= v[4] << 5 & 0x800;
            vc |= v[5] & 0x40;
            vb0 |= v[2] & 0x40;
            vb1 |= v[3] & 0x40;
            break;
        case 7:
            va |= v[2] << 3 & 0x200;
            va |= v[3] << 4 & 0x400;
            va |= v[4] << 5 & 0x800;
            vc |= v[5] & 0x40;
            break;
    }
    let shamt = (mode >> 1) ^ 3;
    va <<= shamt;
    vb0 <<= shamt;
    vb1 <<= shamt;
    vc <<= shamt;
    let mult = 1 << shamt;
    vd0 *= mult;
    vd1 *= mult;
    switch (major_component) {
        case 1:
            set_endpoint_hdr_clamp(endpoints, va - vb0 - vc - vd0, va - vc, va - vb1 - vc - vd1, alpha1, va - vb0, va, va - vb1, alpha2);
            break;
        case 2:
            set_endpoint_hdr_clamp(endpoints, va - vb1 - vc - vd1, va - vb0 - vc - vd0, va - vc, alpha1, va - vb1, va - vb0, va, alpha2);
            break;
        default:
            set_endpoint_hdr_clamp(endpoints, va - vc, va - vb0 - vc - vd0, va - vb1 - vc - vd1, alpha1, va, va - vb0, va - vb1, alpha2);
            break;
    }
}
function decode_endpoints(buf, data) {
    const TRITS_TABLE = new Int32Array([0, 204, 93, 44, 22, 11, 5]);
    const QUINTS_TABLE = new Int32Array([0, 113, 54, 26, 13, 6]);
    let seq = Array.from({ length: 32 }, () => new bits());
    let ev = new Int32Array(32);
    decode_intseq(buf, data.part_num == 1 ? 17 : 29, CEM_TABLE_A[data.cem_range], CEM_TABLE_B[data.cem_range], data.endpoint_value_num, false, seq);
    switch (CEM_TABLE_A[data.cem_range]) {
        case 3:
            for (var i = 0, b = 0, c = TRITS_TABLE[CEM_TABLE_B[data.cem_range]]; i < data.endpoint_value_num; i++) {
                var a = (seq[i].bits & 1) * 0x1ff;
                var x = seq[i].bits >> 1;
                switch (CEM_TABLE_B[data.cem_range]) {
                    case 1:
                        b = 0;
                        break;
                    case 2:
                        b = 0b100010110 * x;
                        break;
                    case 3:
                        b = x << 7 | x << 2 | x;
                        break;
                    case 4:
                        b = x << 6 | x;
                        break;
                    case 5:
                        b = x << 5 | x >> 2;
                        break;
                    case 6:
                        b = x << 4 | x >> 4;
                        break;
                }
                ev[i] = (a & 0x80) | ((seq[i].nonbits * c + b) ^ a) >> 2;
            }
            break;
        case 5:
            for (var i = 0, b = 0, c = QUINTS_TABLE[CEM_TABLE_B[data.cem_range]]; i < data.endpoint_value_num; i++) {
                var a = (seq[i].bits & 1) * 0x1ff;
                var x = seq[i].bits >> 1;
                switch (CEM_TABLE_B[data.cem_range]) {
                    case 1:
                        b = 0;
                        break;
                    case 2:
                        b = 0b100001100 * x;
                        break;
                    case 3:
                        b = x << 7 | x << 1 | x >> 1;
                        break;
                    case 4:
                        b = x << 6 | x >> 1;
                        break;
                    case 5:
                        b = x << 5 | x >> 3;
                        break;
                }
                ev[i] = (a & 0x80) | ((seq[i].nonbits * c + b) ^ a) >> 2;
            }
            break;
        default:
            switch (CEM_TABLE_B[data.cem_range]) {
                case 1:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits * 0xff;
                    break;
                case 2:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits * 0x55;
                    break;
                case 3:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits << 5 | seq[i].bits << 2 | seq[i].bits >> 1;
                    break;
                case 4:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits << 4 | seq[i].bits;
                    break;
                case 5:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits << 3 | seq[i].bits >> 2;
                    break;
                case 6:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits << 2 | seq[i].bits >> 4;
                    break;
                case 7:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits << 1 | seq[i].bits >> 6;
                    break;
                case 8:
                    for (var i = 0; i < data.endpoint_value_num; i++)
                        ev[i] = seq[i].bits;
                    break;
            }
    }
    var v = ev;
    for (var cem = 0; cem < data.part_num; v = v.subarray((Math.floor(data.cem[cem] / 4) + 1) * 2), cem++) {
        switch (data.cem[cem]) {
            case 0:
                set_endpoint(data.endpoints[cem], v[0], v[0], v[0], 255, v[1], v[1], v[1], 255);
                break;
            case 1:
                {
                    var l0 = (v[0] >> 2) | (v[1] & 0xc0);
                    var l1 = clamp(l0 + (v[1] & 0x3f), 0, 255);
                    set_endpoint(data.endpoints[cem], l0, l0, l0, 255, l1, l1, l1, 255);
                }
                break;
            case 2:
                {
                    var y0, y1;
                    if (v[0] <= v[1]) {
                        y0 = v[0] << 4;
                        y1 = v[1] << 4;
                    }
                    else {
                        y0 = (v[1] << 4) + 8;
                        y1 = (v[0] << 4) - 8;
                    }
                    set_endpoint_hdr(data.endpoints[cem], y0, y0, y0, 0x780, y1, y1, y1, 0x780);
                }
                break;
            case 3:
                {
                    var y0, d;
                    if (v[0] & 0x80) {
                        y0 = (v[1] & 0xe0) << 4 | (v[0] & 0x7f) << 2;
                        d = (v[1] & 0x1f) << 2;
                    }
                    else {
                        y0 = (v[1] & 0xf0) << 4 | (v[0] & 0x7f) << 1;
                        d = (v[1] & 0x0f) << 1;
                    }
                    var y1 = clamp(y0 + d, 0, 0xfff);
                    set_endpoint_hdr(data.endpoints[cem], y0, y0, y0, 0x780, y1, y1, y1, 0x780);
                }
                break;
            case 4:
                set_endpoint(data.endpoints[cem], v[0], v[0], v[0], v[2], v[1], v[1], v[1], v[3]);
                break;
            case 5:
                bit_transfer_signed_alt(v, 1, 0);
                bit_transfer_signed_alt(v, 3, 2);
                v[1] += v[0];
                set_endpoint_clamp(data.endpoints[cem], v[0], v[0], v[0], v[2], v[1], v[1], v[1], v[2] + v[3]);
                break;
            case 6:
                set_endpoint(data.endpoints[cem], v[0] * v[3] >> 8, v[1] * v[3] >> 8, v[2] * v[3] >> 8, 255, v[0], v[1], v[2], 255);
                break;
            case 7:
                decode_endpoints_hdr7(data.endpoints[cem], v);
                break;
            case 8:
                if (v[0] + v[2] + v[4] <= v[1] + v[3] + v[5])
                    set_endpoint(data.endpoints[cem], v[0], v[2], v[4], 255, v[1], v[3], v[5], 255);
                else
                    set_endpoint_blue(data.endpoints[cem], v[1], v[3], v[5], 255, v[0], v[2], v[4], 255);
                break;
            case 9:
                bit_transfer_signed_alt(v, 1, 0);
                bit_transfer_signed_alt(v, 3, 2);
                bit_transfer_signed_alt(v, 5, 4);
                if (v[1] + v[3] + v[5] >= 0)
                    set_endpoint_clamp(data.endpoints[cem], v[0], v[2], v[4], 255, v[0] + v[1], v[2] + v[3], v[4] + v[5], 255);
                else
                    set_endpoint_blue_clamp(data.endpoints[cem], v[0] + v[1], v[2] + v[3], v[4] + v[5], 255, v[0], v[2], v[4], 255);
                break;
            case 10:
                set_endpoint(data.endpoints[cem], v[0] * v[3] >> 8, v[1] * v[3] >> 8, v[2] * v[3] >> 8, v[4], v[0], v[1], v[2], v[5]);
                break;
            case 11:
                decode_endpoints_hdr11(data.endpoints[cem], v, 0x780, 0x780);
                break;
            case 12:
                if (v[0] + v[2] + v[4] <= v[1] + v[3] + v[5])
                    set_endpoint(data.endpoints[cem], v[0], v[2], v[4], v[6], v[1], v[3], v[5], v[7]);
                else
                    set_endpoint_blue(data.endpoints[cem], v[1], v[3], v[5], v[7], v[0], v[2], v[4], v[6]);
                break;
            case 13:
                bit_transfer_signed_alt(v, 1, 0);
                bit_transfer_signed_alt(v, 3, 2);
                bit_transfer_signed_alt(v, 5, 4);
                bit_transfer_signed_alt(v, 7, 6);
                if (v[1] + v[3] + v[5] >= 0)
                    set_endpoint_clamp(data.endpoints[cem], v[0], v[2], v[4], v[6], v[0] + v[1], v[2] + v[3], v[4] + v[5], v[6] + v[7]);
                else
                    set_endpoint_blue_clamp(data.endpoints[cem], v[0] + v[1], v[2] + v[3], v[4] + v[5], v[6] + v[7], v[0], v[2], v[4], v[6]);
                break;
            case 14:
                decode_endpoints_hdr11(data.endpoints[cem], v, v[6], v[7]);
                break;
            case 15:
                {
                    var mode = ((v[6] >> 7) & 1) | ((v[7] >> 6) & 2);
                    v[6] &= 0x7f;
                    v[7] &= 0x7f;
                    if (mode == 3) {
                        decode_endpoints_hdr11(data.endpoints[cem], v, v[6] << 5, v[7] << 5);
                    }
                    else {
                        v[6] |= (v[7] << (mode + 1)) & 0x780;
                        v[7] = ((v[7] & (0x3f >> mode)) ^ (0x20 >> mode)) - (0x20 >> mode);
                        v[6] <<= 4 - mode;
                        v[7] <<= 4 - mode;
                        decode_endpoints_hdr11(data.endpoints[cem], v, v[6], clamp(v[6] + v[7], 0, 0xfff));
                    }
                }
                break;
            default:
                throw new Error("Unsupported ASTC format");
        }
    }
}
function decode_weights(buf, data) {
    let seq = Array.from({ length: 128 }, () => new bits());
    let wv = new Int32Array(128);
    decode_intseq(buf, 128, WEIGHT_PREC_TABLE_A[data.weight_range], WEIGHT_PREC_TABLE_B[data.weight_range], data.weight_num, true, seq);
    if (WEIGHT_PREC_TABLE_A[data.weight_range] == 0) {
        switch (WEIGHT_PREC_TABLE_B[data.weight_range]) {
            case 1:
                for (let i = 0; i < data.weight_num; i++) {
                    wv[i] = seq[i].bits != 0 ? 63 : 0;
                }
                break;
            case 2:
                for (let i = 0; i < data.weight_num; i++) {
                    wv[i] = seq[i].bits << 4 | seq[i].bits << 2 | seq[i].bits;
                }
                break;
            case 3:
                for (let i = 0; i < data.weight_num; i++) {
                    wv[i] = seq[i].bits << 3 | seq[i].bits;
                }
                break;
            case 4:
                for (let i = 0; i < data.weight_num; i++) {
                    wv[i] = seq[i].bits << 2 | seq[i].bits >> 2;
                }
                break;
            case 5:
                for (let i = 0; i < data.weight_num; i++) {
                    wv[i] = seq[i].bits << 1 | seq[i].bits >> 4;
                }
                break;
            default:
                throw new Error("Unsupported ASTC format: " + WEIGHT_PREC_TABLE_B[data.weight_range]);
        }
        for (let i = 0; i < data.weight_num; i++) {
            if (wv[i] > 32) {
                wv[i] += 1;
            }
        }
    }
    else if (WEIGHT_PREC_TABLE_B[data.weight_range] == 0) {
        let s = WEIGHT_PREC_TABLE_A[data.weight_range] == 3 ? 32 : 16;
        for (let i = 0; i < data.weight_num; i++) {
            wv[i] = seq[i].nonbits * s;
        }
    }
    else {
        if (WEIGHT_PREC_TABLE_A[data.weight_range] == 3) {
            switch (WEIGHT_PREC_TABLE_B[data.weight_range]) {
                case 1:
                    for (let i = 0; i < data.weight_num; i++) {
                        wv[i] = seq[i].nonbits * 50;
                    }
                    break;
                case 2:
                    for (let i = 0; i < data.weight_num; i++) {
                        wv[i] = seq[i].nonbits * 23;
                        if ((seq[i].bits & 2) != 0) {
                            wv[i] += 0b1000101;
                        }
                    }
                    break;
                case 3:
                    for (let i = 0; i < data.weight_num; i++) {
                        wv[i] = seq[i].nonbits * 11
                            + ((seq[i].bits << 4 | seq[i].bits >> 1) & 0b1100011);
                    }
                    break;
                default:
                    throw new Error("Unsupported ASTC format: " + WEIGHT_PREC_TABLE_B[data.weight_range]);
            }
        }
        else if (WEIGHT_PREC_TABLE_A[data.weight_range] == 5) {
            switch (WEIGHT_PREC_TABLE_B[data.weight_range]) {
                case 1:
                    for (let i = 0; i < data.weight_num; i++) {
                        wv[i] = seq[i].nonbits * 28;
                    }
                    break;
                case 2:
                    for (let i = 0; i < data.weight_num; i++) {
                        wv[i] = seq[i].nonbits * 13;
                        if ((seq[i].bits & 2) != 0) {
                            wv[i] += 0b1000010;
                        }
                    }
                    break;
                default:
                    throw new Error("Unsupported ASTC format: " + WEIGHT_PREC_TABLE_B[data.weight_range]);
            }
        }
        for (let i = 0; i < data.weight_num; i++) {
            let a = (seq[i].bits & 1) * 0x7f;
            wv[i] = (a & 0x20) | ((wv[i] ^ a) >> 2);
            if (wv[i] > 32) {
                wv[i] += 1;
            }
        }
    }
    let ds = Math.floor((1024 + data.bw / 2) / (data.bw - 1));
    let dt = Math.floor((1024 + data.bh / 2) / (data.bh - 1));
    let pn = data.dual_plane ? 2 : 1;
    var i = 0;
    for (var t = 0; t < data.bh; t++) {
        for (var s = 0; s < data.bw; s++) {
            let gs = (ds * s * (data.width - 1) + 32) >> 6;
            let gt = (dt * t * (data.height - 1) + 32) >> 6;
            let fs = gs & 0xf;
            let ft = gt & 0xf;
            let v = (gs >> 4) + (gt >> 4) * data.width;
            let w11 = ((fs * ft + 8) >> 4);
            let w10 = ft - w11;
            let w01 = fs - w11;
            let w00 = 16 - fs - ft + w11;
            for (let p = 0; p < pn; p++) {
                let p00 = wv[v * pn + p];
                let p01 = wv[(v + 1) * pn + p];
                let p10 = wv[(v + data.width) * pn + p];
                let p11 = wv[(v + data.width + 1) * pn + p];
                data.weights[i][p] = (p00 * w00 + p01 * w01 + p10 * w10 + p11 * w11 + 8) >> 4;
            }
            i += 1;
        }
    }
}
function select_partition(buf, data, block_num) {
    let small_block = data.bw * data.bh < 31;
    let seed = (((buf[3] & 0xFF) << 24) | ((buf[2] & 0xFF) << 16) | ((buf[1] & 0xFF) << 8) | (buf[0] & 0xFF));
    seed = (seed >> 13 & 0x3ff) | (data.part_num - 1) << 10;
    let rnum1 = new Uint32Array([seed]);
    rnum1[0] ^= rnum1[0] >>> 15;
    rnum1[0] -= rnum1[0] << 17;
    rnum1[0] += rnum1[0] << 7;
    rnum1[0] += rnum1[0] << 4;
    rnum1[0] ^= rnum1[0] >>> 5;
    rnum1[0] += rnum1[0] << 16;
    rnum1[0] ^= rnum1[0] >>> 7;
    rnum1[0] ^= rnum1[0] >>> 3;
    rnum1[0] ^= rnum1[0] << 6;
    rnum1[0] ^= rnum1[0] >>> 17;
    let rnum = rnum1[0];
    let seeds = new Int32Array(8);
    for (let i = 0; i < 8; i++) {
        let v = rnum >> (i * 4) & 0xF;
        seeds[i] = (v * v);
    }
    let sh = new Int32Array([
        (seed & 2) != 0 ? 4 : 5,
        data.part_num == 3 ? 6 : 5
    ]);
    if ((seed & 1) != 0) {
        for (let i = 0; i < 8; i++) {
            seeds[i] >>= sh[i % 2];
        }
    }
    else {
        for (let i = 0; i < 8; i++) {
            seeds[i] >>= sh[1 - i % 2];
        }
    }
    if (small_block) {
        for (var t = 0, i = 0; t < data.bh; t++) {
            for (var s = 0; s < data.bw; s++, i++) {
                var x = s << 1;
                var y = t << 1;
                var a = (seeds[0] * x + seeds[1] * y + (rnum >> 14)) & 0x3f;
                var b = (seeds[2] * x + seeds[3] * y + (rnum >> 10)) & 0x3f;
                var c = data.part_num < 3 ? 0 : (seeds[4] * x + seeds[5] * y + (rnum >> 6)) & 0x3f;
                var d = data.part_num < 4 ? 0 : (seeds[6] * x + seeds[7] * y + (rnum >> 2)) & 0x3f;
                data.partition[i] = (a >= b && a >= c && a >= d) ? 0 : (b >= c && b >= d) ? 1 : (c >= d) ? 2 : 3;
            }
        }
    }
    else {
        for (var y = 0, i = 0; y < data.bh; y++) {
            for (var x = 0; x < data.bw; x++, i++) {
                var a = (seeds[0] * x + seeds[1] * y + (rnum >> 14)) & 0x3f;
                var b = (seeds[2] * x + seeds[3] * y + (rnum >> 10)) & 0x3f;
                var c = data.part_num < 3 ? 0 : (seeds[4] * x + seeds[5] * y + (rnum >> 6)) & 0x3f;
                var d = data.part_num < 4 ? 0 : (seeds[6] * x + seeds[7] * y + (rnum >> 2)) & 0x3f;
                data.partition[i] = (a >= b && a >= c && a >= d) ? 0 : (b >= c && b >= d) ? 1 : (c >= d) ? 2 : 3;
            }
        }
    }
}
function applicate_color(data, outbuf) {
    const FUNC_TABLE_C = [
        select_color,
        select_color,
        select_color_hdr,
        select_color_hdr,
        select_color,
        select_color,
        select_color,
        select_color_hdr,
        select_color,
        select_color,
        select_color,
        select_color_hdr,
        select_color,
        select_color,
        select_color_hdr,
        select_color_hdr,
    ];
    const FUNC_TABLE_A = [
        select_color,
        select_color,
        select_color_hdr,
        select_color_hdr,
        select_color,
        select_color,
        select_color,
        select_color_hdr,
        select_color,
        select_color,
        select_color,
        select_color_hdr,
        select_color,
        select_color,
        select_color,
        select_color_hdr,
    ];
    if (data.dual_plane) {
        let ps = [0, 0, 0, 0];
        ps[data.plane_selector] = 1;
        if (data.part_num > 1) {
            for (let i = 0; i < data.bw * data.bh; i++) {
                let p = data.partition[i];
                let pp = data.cem[p];
                let r = FUNC_TABLE_C[pp](data.endpoints[p][0], data.endpoints[p][4], data.weights[i][ps[0]]);
                let g = FUNC_TABLE_C[pp](data.endpoints[p][1], data.endpoints[p][5], data.weights[i][ps[1]]);
                let b = FUNC_TABLE_C[pp](data.endpoints[p][2], data.endpoints[p][6], data.weights[i][ps[2]]);
                let a = FUNC_TABLE_A[pp](data.endpoints[p][3], data.endpoints[p][7], data.weights[i][ps[3]]);
                outbuf[i] = color$2(r, g, b, a);
            }
        }
        else {
            for (let i = 0; i < (data.bw * data.bh); i++) {
                let pp = data.cem[0];
                let r = FUNC_TABLE_C[pp](data.endpoints[0][0], data.endpoints[0][4], data.weights[i][ps[0]]);
                let g = FUNC_TABLE_C[pp](data.endpoints[0][1], data.endpoints[0][5], data.weights[i][ps[1]]);
                let b = FUNC_TABLE_C[pp](data.endpoints[0][2], data.endpoints[0][6], data.weights[i][ps[2]]);
                let a = FUNC_TABLE_A[pp](data.endpoints[0][3], data.endpoints[0][7], data.weights[i][ps[3]]);
                outbuf[i] = color$2(r, g, b, a);
            }
        }
    }
    else if (data.part_num > 1) {
        for (let i = 0; i < (data.bw * data.bh); i++) {
            let p = data.partition[i];
            let pp = data.cem[p];
            let r = FUNC_TABLE_C[pp](data.endpoints[p][0], data.endpoints[p][4], data.weights[i][0]);
            let g = FUNC_TABLE_C[pp](data.endpoints[p][1], data.endpoints[p][5], data.weights[i][0]);
            let b = FUNC_TABLE_C[pp](data.endpoints[p][2], data.endpoints[p][6], data.weights[i][0]);
            let a = FUNC_TABLE_A[pp](data.endpoints[p][3], data.endpoints[p][7], data.weights[i][0]);
            outbuf[i] = color$2(r, g, b, a);
        }
    }
    else {
        for (let i = 0; i < (data.bw * data.bh); i++) {
            let pp = data.cem[0];
            let r = FUNC_TABLE_C[pp](data.endpoints[0][0], data.endpoints[0][4], data.weights[i][0]);
            let g = FUNC_TABLE_C[pp](data.endpoints[0][1], data.endpoints[0][5], data.weights[i][0]);
            let b = FUNC_TABLE_C[pp](data.endpoints[0][2], data.endpoints[0][6], data.weights[i][0]);
            let a = FUNC_TABLE_A[pp](data.endpoints[0][3], data.endpoints[0][7], data.weights[i][0]);
            outbuf[i] = color$2(r, g, b, a);
        }
    }
}
function decode_astc_block(buf, block_width, block_height, outbuf, block_num) {
    if (buf[0] == 0xfc && (buf[1] & 1) == 1) {
        var c;
        if ((buf[1] & 2) != 0) {
            c = color$2(f16ptr_to_u8(buf.subarray(8)), f16ptr_to_u8(buf.subarray(10)), f16ptr_to_u8(buf.subarray(12)), f16ptr_to_u8(buf.subarray(14)));
        }
        else {
            c = color$2(buf[9], buf[11], buf[13], buf[15]);
        }
        for (var i = 0; i < block_width * block_height; i++) {
            outbuf[i] = c;
        }
    }
    else if (((buf[0] & 0xc3) == 0xc0 && (buf[1] & 1) == 1) || (buf[0] & 0xf) == 0) {
        var c = color$2(255, 0, 255, 255);
        for (var i = 0; i < block_width * block_height; i++) {
            outbuf[i] = c;
        }
    }
    else {
        let block_data = BlockDataDefault();
        block_data.bw = block_width;
        block_data.bh = block_height;
        decode_block_params(buf, block_data);
        decode_endpoints(buf, block_data);
        decode_weights(buf, block_data);
        if (block_data.part_num > 1) {
            select_partition(buf, block_data);
        }
        applicate_color(block_data, outbuf);
    }
}
function copy_block_buffer$2(bx, by, w, h, bw, bh, buffer, image) {
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
function isBuffer$9(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$4(obj) {
    return obj instanceof Uint8Array || isBuffer$9(obj);
}
function decodeASTC(src, width, height, block_width, block_height) {
    if (!isArrayOrBuffer$4(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const num_blocks_x = Math.floor((width + block_width - 1) / block_width);
    const num_blocks_y = Math.floor((height + block_height - 1) / block_height);
    const raw_block_size = 16;
    const buffer = new Uint32Array(144);
    var data_offset = 0;
    if (src.length < num_blocks_x * num_blocks_y * raw_block_size) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${num_blocks_x * num_blocks_y * raw_block_size}`);
    }
    var image = new Uint32Array(width * height);
    if (block_width * block_height > 144) {
        throw new Error("Block size is too big!");
    }
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_astc_block(src.subarray(data_offset, data_offset + raw_block_size), block_width, block_height, buffer);
            copy_block_buffer$2(bx, by, width, height, block_width, block_height, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$9(src)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
function decodeASTC_4x4(src, width, height) {
    return decodeASTC(src, width, height, 4, 4);
}
function decodeASTC_5x4(src, width, height) {
    return decodeASTC(src, width, height, 5, 4);
}
function decodeASTC_5x5(src, width, height) {
    return decodeASTC(src, width, height, 5, 5);
}
function decodeASTC_6x5(src, width, height) {
    return decodeASTC(src, width, height, 6, 5);
}
function decodeASTC_6x6(src, width, height) {
    return decodeASTC(src, width, height, 6, 6);
}
function decodeASTC_8x5(src, width, height) {
    return decodeASTC(src, width, height, 8, 5);
}
function decodeASTC_8x6(src, width, height) {
    return decodeASTC(src, width, height, 8, 6);
}
function decodeASTC_8x8(src, width, height) {
    return decodeASTC(src, width, height, 8, 8);
}
function decodeASTC_10x5(src, width, height) {
    return decodeASTC(src, width, height, 10, 5);
}
function decodeASTC_10x6(src, width, height) {
    return decodeASTC(src, width, height, 10, 6);
}
function decodeASTC_10x8(src, width, height) {
    return decodeASTC(src, width, height, 10, 8);
}
function decodeASTC_10x10(src, width, height) {
    return decodeASTC(src, width, height, 10, 10);
}
function decodeASTC_12x10(src, width, height) {
    return decodeASTC(src, width, height, 12, 10);
}
function decodeASTC_12x12(src, width, height) {
    return decodeASTC(src, width, height, 12, 12);
}

function isBuffer$8(obj) {
    return buffcheck(obj);
}
function check_size(_this, write_bytes, write_bit, offset) {
    return checkSize(_this, write_bytes || 0, write_bit || 0, _this.offset);
}
function buffcheck(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$4(_this, obj) {
    return obj instanceof Uint8Array || isBuffer$8(obj);
}
function extendarray(_this, to_padd) {
    if ((typeof Buffer !== 'undefined' && _this.data instanceof Buffer)) {
        var paddbuffer = Buffer.alloc(to_padd);
        _this.data = Buffer.concat([_this.data, paddbuffer]);
    }
    else {
        const addArray = new Array(to_padd);
        _this.data = new Uint8Array([..._this.data, ...addArray]);
    }
    _this.size = _this.data.length;
    _this.sizeB = _this.data.length * 8;
}
function checkSize(_this, write_bytes, write_bit, offset) {
    const bits = (write_bit || 0) + _this.bitoffset;
    var new_off = (offset || _this.offset);
    var writesize = write_bytes || 0;
    if (bits != 0) {
        writesize += Math.ceil(bits / 8);
    }
    const needed_size = new_off + writesize;
    if (needed_size > _this.size) {
        const dif = needed_size - _this.size;
        if (_this.strict == false) {
            _this.extendArray(dif);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m hexdump:\n" + _this.hexdump() : "";
            throw new Error(`\x1b[33m[Strict mode]\x1b[0m: Reached end of data: writing to ` + needed_size + " at " + _this.offset + " of " + _this.size);
        }
    }
    return new_off;
}
function skip(_this, bytes, bits) {
    var new_size = (((bytes || 0) + _this.offset) + Math.ceil((_this.bitoffset + (bits || 0)) / 8));
    if (bits && bits < 0) {
        new_size = Math.floor(((((bytes || 0) + _this.offset) * 8) + _this.bitoffset + (bits || 0)) / 8);
    }
    if (new_size > _this.size) {
        if (_this.strict == false) {
            _this.extendArray(new_size - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: Seek of range of data: seek " + new_size + " of " + _this.size);
        }
    }
    _this.offset += Math.floor((_this.bitoffset + (bits || 0)) / 8);
    _this.bitoffset = (_this.bitoffset + (bits || 0) + 64) % 8;
    _this.offset += bytes;
    _this.bitoffset = Math.min(Math.max(_this.bitoffset, 0), 7);
    _this.offset = Math.max(_this.offset, 0);
}
function align(_this, n) {
    var a = _this.offset % n;
    if (a) {
        _this.skip(n - a);
    }
}
function alignRev(_this, n) {
    var a = _this.offset % n;
    if (a) {
        _this.skip(a * -1);
    }
}
function goto(_this, bytes, bits) {
    var new_size = (((bytes || 0)) + Math.ceil(((bits || 0)) / 8));
    if (bits && bits < 0) {
        new_size = Math.floor(((((bytes || 0)) * 8) + (bits || 0)) / 8);
    }
    if (new_size > _this.size) {
        if (_this.strict == false) {
            _this.extendArray(new_size - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: Goto utside of range of data: goto " + new_size + " of " + _this.size);
        }
    }
    _this.offset = bytes;
    _this.offset += Math.floor(((bits || 0)) / 8);
    _this.bitoffset = ((bits || 0) + 64) % 8;
    _this.bitoffset = Math.min(Math.max(_this.bitoffset, 0), 7);
    _this.offset = Math.max(_this.offset, 0);
}
function remove(_this, startOffset, endOffset, consume, remove, fillValue) {
    const new_start = Math.abs(startOffset || 0);
    const new_offset = (endOffset || _this.offset);
    if (new_offset > _this.size) {
        if (_this.strict == false) {
            _this.extendArray(new_offset - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + endOffset + " of " + _this.size);
        }
    }
    if (_this.strict == true && remove == true) {
        _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
        throw new Error("\x1b[33m[Strict mode]\x1b[0m: Can not remove data in strict mode: endOffset" + endOffset + " of " + _this.size);
    }
    const data_removed = _this.data.slice(new_start, new_offset);
    if (remove) {
        const part1 = _this.data.subarray(0, new_start);
        const part2 = _this.data.subarray(new_offset, _this.size);
        if (isBuffer$8(_this.data)) {
            _this.data = Buffer.concat([part1, part2]);
        }
        else {
            _this.data = new Uint8Array([...part1, ...part2]);
        }
        _this.size = _this.data.length;
        _this.sizeB = _this.data.length * 8;
    }
    if (fillValue != undefined && remove == false) {
        const part1 = _this.data.subarray(0, new_start);
        const part2 = _this.data.subarray(new_offset, _this.size);
        const replacement = new Array(data_removed.length).fill(fillValue & 0xff);
        if (isBuffer$8(_this.data)) {
            const buff_placement = Buffer.from(replacement);
            _this.data = Buffer.concat([part1, buff_placement, part2]);
        }
        else {
            _this.data = new Uint8Array([...part1, ...replacement, ...part2]);
        }
        _this.size = _this.data.length;
        _this.sizeB = _this.data.length * 8;
    }
    if (consume == true) {
        if (remove != true) {
            _this.offset = new_offset;
            _this.bitoffset = 0;
        }
        else {
            _this.offset = new_start;
            _this.bitoffset = 0;
        }
    }
    return data_removed;
}
function addData(_this, data, consume, offset, replace) {
    if (_this.strict == true) {
        _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
        throw new Error(`\x1b[33m[Strict mode]\x1b[0m: Can not insert data in strict mode. Use unrestrict() to enable.`);
    }
    if (typeof Buffer !== 'undefined' && data instanceof Buffer && !(_this.data instanceof Buffer)) {
        throw new Error("Data insert must be a Buffer");
    }
    if (data instanceof Uint8Array && !(_this.data instanceof Uint8Array)) {
        throw new Error("Data insert must be a Uint8Array");
    }
    var needed_size = offset || _this.offset;
    if (replace) {
        needed_size = (offset || _this.offset) + data.length;
    }
    if (replace) {
        const part1 = _this.data.subarray(0, needed_size - data.length);
        const part2 = _this.data.subarray(needed_size, _this.size);
        if (isBuffer$8(_this.data)) {
            _this.data = Buffer.concat([part1, data, part2]);
        }
        else {
            _this.data = new Uint8Array([...part1, ...data, ...part2]);
        }
        _this.size = _this.data.length;
        _this.sizeB = _this.data.length * 8;
    }
    else {
        const part1 = _this.data.subarray(0, needed_size);
        const part2 = _this.data.subarray(needed_size, _this.size);
        if (isBuffer$8(_this.data)) {
            _this.data = Buffer.concat([part1, data, part2]);
        }
        else {
            _this.data = new Uint8Array([...part1, ...data, ...part2]);
        }
        _this.size = _this.data.length;
        _this.sizeB = _this.data.length * 8;
    }
    if (consume) {
        _this.offset = (offset || _this.offset) + data.length;
        _this.bitoffset = 0;
    }
}
function hexDump(_this, options) {
    var length = options && options.length;
    var startByte = options && options.startByte;
    var supressUnicode = options && options.supressUnicode || false;
    if ((startByte || 0) > _this.size) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error("Hexdump start is outside of data size: " + startByte + " of " + _this.size);
    }
    const start = startByte || _this.offset;
    const end = Math.min(start + (length || 192), _this.size);
    if (start + (length || 0) > _this.size) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error("Hexdump amount is outside of data size: " + (start + (length || 0)) + " of " + end);
    }
    function hex_check(byte, bits) {
        var value = 0;
        for (var i = 0; i < bits;) {
            var remaining = bits - i;
            var bitOffset = 0;
            var currentByte = byte;
            var read = Math.min(remaining, 8 - bitOffset);
            var mask, readBits;
            mask = ~(0xFF << read);
            readBits = (currentByte >> (8 - read - bitOffset)) & mask;
            value <<= read;
            value |= readBits;
            i += read;
        }
        value = value >>> 0;
        return value;
    }
    const rows = [];
    var header = "   0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  ";
    var ending = "0123456789ABCDEF";
    var addr = "";
    for (let i = start; i < end; i += 16) {
        addr = i.toString(16).padStart(5, '0');
        var row = _this.data?.slice(i, i + 16) || [];
        var hex = Array.from(row, (byte) => byte.toString(16).padStart(2, '0')).join(' ');
        rows.push(`${addr}  ${hex.padEnd(47)}  `);
    }
    let result = '';
    let make_wide = false;
    let i = start;
    while (i < end) {
        const byte = _this.data[i];
        if (byte < 32 || byte == 127) {
            result += '.';
        }
        else if (byte < 127) {
            result += String.fromCharCode(byte);
        }
        else if (supressUnicode) {
            result += '.';
        }
        else if (hex_check(byte, 1) == 0) {
            result += String.fromCharCode(byte);
        }
        else if (hex_check(byte, 3) == 6) {
            if (i + 1 <= end) {
                const byte2 = _this.data[i + 1];
                if (hex_check(byte2, 2) == 2) {
                    const charCode = ((byte & 0x1f) << 6) | (byte2 & 0x3f);
                    i++;
                    make_wide = true;
                    const read = " " + String.fromCharCode(charCode);
                    result += read;
                }
                else {
                    result += ".";
                }
            }
            else {
                result += ".";
            }
        }
        else if (hex_check(byte, 4) == 14) {
            if (i + 1 <= end) {
                const byte2 = _this.data[i + 1];
                if (hex_check(byte2, 2) == 2) {
                    if (i + 2 <= end) {
                        const byte3 = _this.data[i + 2];
                        if (hex_check(byte3, 2) == 2) {
                            const charCode = ((byte & 0x0f) << 12) |
                                ((byte2 & 0x3f) << 6) |
                                (byte3 & 0x3f);
                            i += 2;
                            make_wide = true;
                            const read = "  " + String.fromCharCode(charCode);
                            result += read;
                        }
                        else {
                            i++;
                            result += " .";
                        }
                    }
                    else {
                        i++;
                        result += " .";
                    }
                }
                else {
                    result += ".";
                }
            }
            else {
                result += ".";
            }
        }
        else if (hex_check(byte, 5) == 28) {
            if (i + 1 <= end) {
                const byte2 = _this.data[i + 1];
                if (hex_check(byte2, 2) == 2) {
                    if (i + 2 <= end) {
                        const byte3 = _this.data[i + 2];
                        if (hex_check(byte3, 2) == 2) {
                            if (i + 3 <= end) {
                                const byte4 = _this.data[i + 2];
                                if (hex_check(byte4, 2) == 2) {
                                    const charCode = (((byte4 & 0xFF) << 24) | ((byte3 & 0xFF) << 16) | ((byte2 & 0xFF) << 8) | (byte & 0xFF));
                                    i += 3;
                                    make_wide = true;
                                    const read = "   " + String.fromCharCode(charCode);
                                    result += read;
                                }
                                else {
                                    i += 2;
                                    result += "  .";
                                }
                            }
                            else {
                                i += 2;
                                result += "  .";
                            }
                        }
                        else {
                            i++;
                            result += " .";
                        }
                    }
                    else {
                        i++;
                        result += " .";
                    }
                }
                else {
                    result += ".";
                }
            }
            else {
                result += ".";
            }
        }
        else {
            result += '.';
        }
        i++;
    }
    const chunks = result.match(new RegExp(`.{1,${16}}`, 'g'));
    chunks?.forEach((self, i) => {
        rows[i] = rows[i] + (make_wide ? "|" + self + "|" : self);
    });
    header = "".padStart(addr.length) + header + (make_wide ? "" : ending);
    rows.unshift(header);
    if (make_wide) {
        rows.push("*Removed character byte header on unicode detection");
    }
    console.log(rows.join("\n"));
}
function AND(_this, and_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof and_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] & (and_key & 0xff);
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, and_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != and_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] & and_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("AND key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function OR(_this, or_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof or_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] | (or_key & 0xff);
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, or_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != or_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] | or_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("OR key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function XOR(_this, xor_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof xor_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] ^ (xor_key & 0xff);
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, xor_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != xor_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] ^ xor_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("XOR key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function NOT(_this, start, end, consume) {
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
        _this.data[i] = ~_this.data[i];
        if (consume) {
            _this.offset = i;
            _this.bitoffset = 0;
        }
    }
}
function LSHIFT(_this, shift_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof shift_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] << shift_key;
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, shift_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != shift_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] << shift_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("XOR key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function RSHIFT(_this, shift_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof shift_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] >> shift_key;
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, shift_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != shift_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] >> shift_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("XOR key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function ADD(_this, add_key, start, end, consume) {
    const input = _this.data;
    if ((end || 0) > _this.size) {
        if (_this.strict == false) {
            _this.extendArray((end || 0) - _this.size);
        }
        else {
            _this.errorDump ? "\x1b[31m[Error]\x1b[0m: hexdump:\n" + _this.hexdump() : "";
            throw new Error("\x1b[33m[Strict mode]\x1b[0m: End offset outside of data: endOffset" + (end || 0) + " of " + _this.size);
        }
    }
    if (typeof add_key == "number") {
        for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
            input[i] = input[i] + add_key;
            if (consume) {
                _this.offset = i;
                _this.bitoffset = 0;
            }
        }
    }
    else {
        if (arraybuffcheck$4(_this, add_key)) {
            let number = -1;
            for (let i = (start || 0); i < Math.min(end || _this.size, _this.size); i++) {
                if (number != add_key.length - 1) {
                    number = number + 1;
                }
                else {
                    number = 0;
                }
                input[i] = input[i] + add_key[number];
                if (consume) {
                    _this.offset = i;
                    _this.bitoffset = 0;
                }
            }
        }
        else {
            throw new Error("XOR key must be a byte value, string, Uint8Array or Buffer");
        }
    }
}
function fString(_this, searchString) {
    const searchArray = new TextEncoder().encode(searchString);
    for (let i = _this.offset; i <= _this.size - searchArray.length; i++) {
        let match = true;
        for (let j = 0; j < searchArray.length; j++) {
            if (_this.data[i + j] !== searchArray[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return i;
        }
    }
    return -1;
}
function fNumber(_this, targetNumber, bits, unsigned, endian) {
    check_size(_this, Math.floor(bits / 8), 0);
    for (let z = _this.offset; z <= (_this.size - (bits / 8)); z++) {
        var off_in_bits = 0;
        var value = 0;
        for (var i = 0; i < bits;) {
            var remaining = bits - i;
            var bitOffset = off_in_bits & 7;
            var currentByte = _this.data[z + (off_in_bits >> 3)];
            var read = Math.min(remaining, 8 - bitOffset);
            var mask, readBits;
            if ((endian != undefined ? endian : _this.endian) == "big") {
                mask = ~(0xFF << read);
                readBits = (currentByte >> (8 - read - bitOffset)) & mask;
                value <<= read;
                value |= readBits;
            }
            else {
                mask = ~(0xFF << read);
                readBits = (currentByte >> bitOffset) & mask;
                value |= readBits << i;
            }
            off_in_bits += read;
            i += read;
        }
        if (unsigned == true || bits <= 7) {
            value = value >>> 0;
        }
        else {
            if (bits !== 32 && value & (1 << (bits - 1))) {
                value |= -1 ^ ((1 << bits) - 1);
            }
        }
        if (value === targetNumber) {
            return z - _this.offset;
        }
    }
    return -1;
}
function fHalfFloat(_this, targetNumber, endian) {
    check_size(_this, 2, 0);
    for (let z = _this.offset; z <= (_this.size - 2); z++) {
        var value = 0;
        if ((endian != undefined ? endian : _this.endian) == "little") {
            value = (_this.data[z + 1] << 8) | _this.data[z];
        }
        else {
            value = (_this.data[z] << 8) | _this.data[z + 1];
        }
        const sign = (value & 0x8000) >> 15;
        const exponent = (value & 0x7C00) >> 10;
        const fraction = value & 0x03FF;
        let floatValue;
        if (exponent === 0) {
            if (fraction === 0) {
                floatValue = (sign === 0) ? 0 : -0;
            }
            else {
                floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 0x0400);
            }
        }
        else if (exponent === 0x1F) {
            if (fraction === 0) {
                floatValue = (sign === 0) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
            }
            else {
                floatValue = Number.NaN;
            }
        }
        else {
            floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
        }
        if (floatValue === targetNumber) {
            return z;
        }
    }
    return -1;
}
function fFloat(_this, targetNumber, endian) {
    check_size(_this, 4, 0);
    for (let z = _this.offset; z <= (_this.size - 4); z++) {
        var value = 0;
        if ((endian != undefined ? endian : _this.endian) == "little") {
            value = ((_this.data[z + 3] << 24) | (_this.data[z + 2] << 16) | (_this.data[z + 1] << 8) | _this.data[z]);
        }
        else {
            value = (_this.data[z] << 24) | (_this.data[z + 1] << 16) | (_this.data[z + 2] << 8) | _this.data[z + 3];
        }
        const isNegative = (value & 0x80000000) !== 0 ? 1 : 0;
        const exponent = (value >> 23) & 0xFF;
        const fraction = value & 0x7FFFFF;
        let floatValue;
        if (exponent === 0) {
            floatValue = Math.pow(-1, isNegative) * Math.pow(2, -126) * (fraction / Math.pow(2, 23));
        }
        else if (exponent === 0xFF) {
            floatValue = fraction === 0 ? (isNegative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY) : Number.NaN;
        }
        else {
            floatValue = Math.pow(-1, isNegative) * Math.pow(2, exponent - 127) * (1 + fraction / Math.pow(2, 23));
        }
        if (floatValue === targetNumber) {
            return z;
        }
    }
    return -1;
}
function fBigInt(_this, targetNumber, unsigned, endian) {
    check_size(_this, 8, 0);
    for (let z = _this.offset; z <= (_this.size - 8); z++) {
        let value = BigInt(0);
        if ((endian == undefined ? _this.endian : endian) == "little") {
            for (let i = 0; i < 8; i++) {
                value = value | BigInt(_this.data[z + i]) << BigInt(8 * i);
            }
            if (unsigned == undefined || unsigned == false) {
                if (value & (BigInt(1) << BigInt(63))) {
                    value -= BigInt(1) << BigInt(64);
                }
            }
        }
        else {
            for (let i = 0; i < 8; i++) {
                value = (value << BigInt(8)) | BigInt(_this.data[z + i]);
            }
            if (unsigned == undefined || unsigned == false) {
                if (value & (BigInt(1) << BigInt(63))) {
                    value -= BigInt(1) << BigInt(64);
                }
            }
        }
        if (value == BigInt(targetNumber)) {
            return z;
        }
    }
    return -1;
}
function fDoubleFloat(_this, targetNumber, endian) {
    check_size(_this, 8, 0);
    for (let z = _this.offset; z <= (_this.size - 8); z++) {
        let value = BigInt(0);
        if ((endian == undefined ? _this.endian : endian) == "little") {
            for (let i = 0; i < 8; i++) {
                value = value | BigInt(_this.data[z + i]) << BigInt(8 * i);
            }
        }
        else {
            for (let i = 0; i < 8; i++) {
                value = (value << BigInt(8)) | BigInt(_this.data[z + i]);
            }
        }
        const sign = (value & 0x8000000000000000n) >> 63n;
        const exponent = Number((value & 0x7ff0000000000000n) >> 52n) - 1023;
        const fraction = Number(value & 0x000fffffffffffffn) / Math.pow(2, 52);
        var floatValue;
        if (exponent == -1023) {
            if (fraction == 0) {
                floatValue = (sign == 0n) ? 0 : -0;
            }
            else {
                floatValue = (sign == 0n ? 1 : -1) * Math.pow(2, -1022) * fraction;
            }
        }
        else if (exponent == 1024) {
            if (fraction == 0) {
                floatValue = (sign == 0n) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
            }
            else {
                floatValue = Number.NaN;
            }
        }
        else {
            floatValue = (sign == 0n ? 1 : -1) * Math.pow(2, exponent) * (1 + fraction);
        }
        if (floatValue == targetNumber) {
            return z;
        }
    }
    return -1;
}
function wbit(_this, value, bits, unsigned, endian) {
    if (value == undefined) {
        throw new Error('Must supply value.');
    }
    if (bits == undefined) {
        throw new Error("Enter number of bits to write");
    }
    if (bits == 0) {
        return;
    }
    if (bits <= 0 || bits > 32) {
        throw new Error('Bit length must be between 1 and 32. Got ' + bits);
    }
    if (unsigned == true) {
        if (value < 0 || value > Math.pow(2, bits)) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error(`Value is out of range for the specified ${bits}bit length.` + " min: " + 0 + " max: " + Math.pow(2, bits) + " value: " + value);
        }
    }
    else {
        const maxValue = Math.pow(2, bits - 1) - 1;
        const minValue = -maxValue - 1;
        if (value < minValue || value > maxValue) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error(`Value is out of range for the specified ${bits}bit length.` + " min: " + minValue + " max: " + maxValue + " value: " + value);
        }
    }
    if (unsigned == true) {
        const maxValue = Math.pow(2, bits) - 1;
        value = value & maxValue;
    }
    const size_needed = ((((bits - 1) + _this.bitoffset) / 8) + _this.offset);
    if (size_needed > _this.size) {
        _this.extendArray(size_needed - _this.size);
    }
    var off_in_bits = (_this.offset * 8) + _this.bitoffset;
    for (var i = 0; i < bits;) {
        var remaining = bits - i;
        var bitOffset = off_in_bits & 7;
        var byteOffset = off_in_bits >> 3;
        var written = Math.min(remaining, 8 - bitOffset);
        var mask, writeBits, destMask;
        if ((endian != undefined ? endian : _this.endian) == "big") {
            mask = ~(~0 << written);
            writeBits = (value >> (bits - i - written)) & mask;
            var destShift = 8 - bitOffset - written;
            destMask = ~(mask << destShift);
            _this.data[byteOffset] = (_this.data[byteOffset] & destMask) | (writeBits << destShift);
        }
        else {
            mask = ~(0xFF << written);
            writeBits = value & mask;
            value >>= written;
            destMask = ~(mask << bitOffset);
            _this.data[byteOffset] = (_this.data[byteOffset] & destMask) | (writeBits << bitOffset);
        }
        off_in_bits += written;
        i += written;
    }
    _this.offset = _this.offset + Math.floor(((bits) + _this.bitoffset) / 8);
    _this.bitoffset = ((bits) + _this.bitoffset) % 8;
}
function rbit(_this, bits, unsigned, endian) {
    if (bits == undefined || typeof bits != "number") {
        throw new Error("Enter number of bits to read");
    }
    if (bits == 0) {
        return 0;
    }
    if (bits <= 0 || bits > 32) {
        throw new Error('Bit length must be between 1 and 32. Got ' + bits);
    }
    const size_needed = ((((bits - 1) + _this.bitoffset) / 8) + _this.offset);
    if (bits <= 0 || size_needed > _this.size) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error("Invalid number of bits to read: " + size_needed + " of " + _this.size);
    }
    var off_in_bits = (_this.offset * 8) + _this.bitoffset;
    var value = 0;
    for (var i = 0; i < bits;) {
        var remaining = bits - i;
        var bitOffset = off_in_bits & 7;
        var currentByte = _this.data[off_in_bits >> 3];
        var read = Math.min(remaining, 8 - bitOffset);
        var mask, readBits;
        if ((endian != undefined ? endian : _this.endian) == "big") {
            mask = ~(0xFF << read);
            readBits = (currentByte >> (8 - read - bitOffset)) & mask;
            value <<= read;
            value |= readBits;
        }
        else {
            mask = ~(0xFF << read);
            readBits = (currentByte >> bitOffset) & mask;
            value |= readBits << i;
        }
        off_in_bits += read;
        i += read;
    }
    _this.offset = _this.offset + Math.floor(((bits) + _this.bitoffset) / 8);
    _this.bitoffset = ((bits) + _this.bitoffset) % 8;
    if (unsigned == true || bits <= 7) {
        return value >>> 0;
    }
    if (bits !== 32 && value & (1 << (bits - 1))) {
        value |= -1 ^ ((1 << bits) - 1);
    }
    return value;
}
function wbyte(_this, value, unsigned) {
    check_size(_this, 1, 0);
    if (unsigned == true) {
        if (value < 0 || value > 255) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 8bit length.' + " min: " + 0 + " max: " + 255 + " value: " + value);
        }
    }
    else {
        const maxValue = Math.pow(2, 8 - 1) - 1;
        const minValue = -maxValue - 1;
        if (value < minValue || value > maxValue) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 8bit length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
        }
    }
    _this.data[_this.offset] = (unsigned == undefined || unsigned == false) ? value : value & 0xFF;
    _this.offset += 1;
    _this.bitoffset = 0;
}
function rbyte(_this, unsigned) {
    check_size(_this, 1);
    var read = _this.data[_this.offset];
    _this.offset += 1;
    _this.bitoffset = 0;
    if (unsigned == true) {
        return read & 0xFF;
    }
    else {
        return read > 127 ? read - 256 : read;
    }
}
function wint16(_this, value, unsigned, endian) {
    check_size(_this, 2, 0);
    if (unsigned == true) {
        if (value < 0 || value > 65535) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 16bit length.' + " min: " + 0 + " max: " + 65535 + " value: " + value);
        }
    }
    else {
        const maxValue = Math.pow(2, 16 - 1) - 1;
        const minValue = -maxValue - 1;
        if (value < minValue || value > maxValue) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 16bit length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
        }
    }
    if ((endian != undefined ? endian : _this.endian) == "little") {
        _this.data[_this.offset] = (unsigned == undefined || unsigned == false) ? value : value & 0xff;
        _this.data[_this.offset + 1] = (unsigned == undefined || unsigned == false) ? (value >> 8) : (value >> 8) & 0xff;
    }
    else {
        _this.data[_this.offset] = (unsigned == undefined || unsigned == false) ? (value >> 8) : (value >> 8) & 0xff;
        _this.data[_this.offset + 1] = (unsigned == undefined || unsigned == false) ? value : value & 0xff;
    }
    _this.offset += 2;
    _this.bitoffset = 0;
}
function rint16(_this, unsigned, endian) {
    check_size(_this, 2);
    var read;
    if ((endian != undefined ? endian : _this.endian) == "little") {
        read = (_this.data[_this.offset + 1] << 8) | _this.data[_this.offset];
    }
    else {
        read = (_this.data[_this.offset] << 8) | _this.data[_this.offset + 1];
    }
    _this.offset += 2;
    _this.bitoffset = 0;
    if (unsigned == undefined || unsigned == false) {
        return read & 0x8000 ? -(0x10000 - read) : read;
    }
    else {
        return read & 0xFFFF;
    }
}
function rhalffloat(_this, endian) {
    var uint16Value = _this.readInt16(true, (endian != undefined ? endian : _this.endian));
    const sign = (uint16Value & 0x8000) >> 15;
    const exponent = (uint16Value & 0x7C00) >> 10;
    const fraction = uint16Value & 0x03FF;
    let floatValue;
    if (exponent === 0) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? 0 : -0;
        }
        else {
            floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 0x0400);
        }
    }
    else if (exponent === 0x1F) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        else {
            floatValue = Number.NaN;
        }
    }
    else {
        floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
    }
    return floatValue;
}
function whalffloat(_this, value, endian) {
    check_size(_this, 2, 0);
    const maxValue = 65504;
    const minValue = 5.96e-08;
    if (value < minValue || value > maxValue) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error('Value is out of range for the specified half float length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
    }
    const signMask = 0x8000;
    const exponentMask = 0x7C00;
    const fractionMask = 0x03FF;
    let signBit = (value & signMask) >> 15;
    let exponentBits = (value & exponentMask) >> 10;
    let fractionBits = value & fractionMask;
    if (exponentBits === 0x1F) {
        exponentBits = 0xFF;
    }
    else if (exponentBits === 0x00) {
        exponentBits = 0x00;
        fractionBits = 0x00;
    }
    else {
        exponentBits -= 15;
    }
    let halfFloatBits = (signBit << 15) | (exponentBits << 10) | fractionBits;
    if ((_this.endian) == "little") {
        _this.data[_this.offset] = halfFloatBits & 0xFF;
        _this.data[_this.offset + 1] = (halfFloatBits >> 8) & 0xFF;
    }
    else {
        _this.data[_this.offset] = (halfFloatBits >> 8) & 0xFF;
        _this.data[_this.offset + 1] = halfFloatBits & 0xFF;
    }
    _this.offset += 2;
    _this.bitoffset = 0;
}
function wint32(_this, value, unsigned, endian) {
    check_size(_this, 4, 0);
    if (unsigned == true) {
        if (value < 0 || value > 4294967295) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 32bit length.' + " min: " + 0 + " max: " + 4294967295 + " value: " + value);
        }
    }
    else {
        const maxValue = Math.pow(2, 32 - 1) - 1;
        const minValue = -maxValue - 1;
        if (value < minValue || value > maxValue) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 32bit length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
        }
    }
    if ((_this.endian) == "little") {
        _this.data[_this.offset] = (unsigned == undefined || unsigned == false) ? value : value & 0xFF;
        _this.data[_this.offset + 1] = (unsigned == undefined || unsigned == false) ? (value >> 8) : (value >> 8) & 0xFF;
        _this.data[_this.offset + 2] = (unsigned == undefined || unsigned == false) ? (value >> 16) : (value >> 16) & 0xFF;
        _this.data[_this.offset + 3] = (unsigned == undefined || unsigned == false) ? (value >> 24) : (value >> 24) & 0xFF;
    }
    else {
        _this.data[_this.offset] = (unsigned == undefined || unsigned == false) ? (value >> 24) : (value >> 24) & 0xFF;
        _this.data[_this.offset + 1] = (unsigned == undefined || unsigned == false) ? (value >> 16) : (value >> 16) & 0xFF;
        _this.data[_this.offset + 2] = (unsigned == undefined || unsigned == false) ? (value >> 8) : (value >> 8) & 0xFF;
        _this.data[_this.offset + 3] = (unsigned == undefined || unsigned == false) ? value : value & 0xFF;
    }
    _this.offset += 4;
    _this.bitoffset = 0;
}
function rint32(_this, unsigned, endian) {
    check_size(_this, 4);
    var read;
    if ((endian != undefined ? endian : _this.endian) == "little") {
        read = ((_this.data[_this.offset + 3] << 24) | (_this.data[_this.offset + 2] << 16) | (_this.data[_this.offset + 1] << 8) | _this.data[_this.offset]);
    }
    else {
        read = (_this.data[_this.offset] << 24) | (_this.data[_this.offset + 1] << 16) | (_this.data[_this.offset + 2] << 8) | _this.data[_this.offset + 3];
    }
    _this.offset += 4;
    _this.bitoffset = 0;
    if (unsigned == undefined || unsigned == false) {
        return read;
    }
    else {
        return read >>> 0;
    }
}
function rfloat(_this, endian) {
    var uint32Value = _this.readInt32(true, (endian == undefined ? _this.endian : endian));
    const isNegative = (uint32Value & 0x80000000) !== 0 ? 1 : 0;
    const exponent = (uint32Value >> 23) & 0xFF;
    const fraction = uint32Value & 0x7FFFFF;
    let floatValue;
    if (exponent === 0) {
        floatValue = Math.pow(-1, isNegative) * Math.pow(2, -126) * (fraction / Math.pow(2, 23));
    }
    else if (exponent === 0xFF) {
        floatValue = fraction === 0 ? (isNegative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY) : Number.NaN;
    }
    else {
        floatValue = Math.pow(-1, isNegative) * Math.pow(2, exponent - 127) * (1 + fraction / Math.pow(2, 23));
    }
    return floatValue;
}
function wfloat(_this, value, endian) {
    check_size(_this, 4, 0);
    const maxValue = 3.402823466e+38;
    const minValue = 1.175494351e-38;
    if (value < minValue || value > maxValue) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error('Value is out of range for the specified float length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
    }
    const dataView = new DataView(new Uint8Array(4).buffer);
    dataView.setFloat32(0, value, true);
    let intValue = dataView.getInt32(0, true);
    let shift = 0;
    for (let i = 0; i < 4; i++) {
        if ((_this.endian) == "little") {
            _this.data[_this.offset + i] = (intValue >> shift) & 0xFF;
        }
        else {
            _this.data[_this.offset + (3 - i)] = (intValue >> shift) & 0xFF;
        }
        shift += 8;
    }
    _this.offset += 4;
    _this.bitoffset = 0;
}
function rint64(_this, unsigned, endian) {
    check_size(_this, 8);
    let value = BigInt(0);
    if ((endian == undefined ? _this.endian : endian) == "little") {
        for (let i = 0; i < 8; i++) {
            value = value | BigInt(_this.data[_this.offset]) << BigInt(8 * i);
            _this.offset += 1;
        }
        if (unsigned == undefined || unsigned == false) {
            if (value & (BigInt(1) << BigInt(63))) {
                value -= BigInt(1) << BigInt(64);
            }
        }
    }
    else {
        for (let i = 0; i < 8; i++) {
            value = (value << BigInt(8)) | BigInt(_this.data[_this.offset]);
            _this.offset += 1;
        }
        if (unsigned == undefined || unsigned == false) {
            if (value & (BigInt(1) << BigInt(63))) {
                value -= BigInt(1) << BigInt(64);
            }
        }
    }
    _this.bitoffset = 0;
    return value;
}
function wint64(_this, value, unsigned, endian) {
    check_size(_this, 8, 0);
    if (unsigned == true) {
        if (value < 0 || value > Math.pow(2, 64) - 1) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 64bit length.' + " min: " + 0 + " max: " + (Math.pow(2, 64) - 1) + " value: " + value);
        }
    }
    else {
        const maxValue = Math.pow(2, 63) - 1;
        const minValue = -Math.pow(2, 63);
        if (value < minValue || value > maxValue) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error('Value is out of range for the specified 64bit length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
        }
    }
    const bigIntArray = new BigInt64Array(1);
    bigIntArray[0] = BigInt(value);
    const int32Array = new Int32Array(bigIntArray.buffer);
    for (let i = 0; i < 2; i++) {
        if ((_this.endian) == "little") {
            if (unsigned == undefined || unsigned == false) {
                _this.data[_this.offset + i * 4 + 0] = int32Array[i];
                _this.data[_this.offset + i * 4 + 1] = (int32Array[i] >> 8);
                _this.data[_this.offset + i * 4 + 2] = (int32Array[i] >> 16);
                _this.data[_this.offset + i * 4 + 3] = (int32Array[i] >> 24);
            }
            else {
                _this.data[_this.offset + i * 4 + 0] = int32Array[i] & 0xFF;
                _this.data[_this.offset + i * 4 + 1] = (int32Array[i] >> 8) & 0xFF;
                _this.data[_this.offset + i * 4 + 2] = (int32Array[i] >> 16) & 0xFF;
                _this.data[_this.offset + i * 4 + 3] = (int32Array[i] >> 24) & 0xFF;
            }
        }
        else {
            if (unsigned == undefined || unsigned == false) {
                _this.data[_this.offset + (1 - i) * 4 + 0] = int32Array[i];
                _this.data[_this.offset + (1 - i) * 4 + 1] = (int32Array[i] >> 8);
                _this.data[_this.offset + (1 - i) * 4 + 2] = (int32Array[i] >> 16);
                _this.data[_this.offset + (1 - i) * 4 + 3] = (int32Array[i] >> 24);
            }
            else {
                _this.data[_this.offset + (1 - i) * 4 + 0] = int32Array[i] & 0xFF;
                _this.data[_this.offset + (1 - i) * 4 + 1] = (int32Array[i] >> 8) & 0xFF;
                _this.data[_this.offset + (1 - i) * 4 + 2] = (int32Array[i] >> 16) & 0xFF;
                _this.data[_this.offset + (1 - i) * 4 + 3] = (int32Array[i] >> 24) & 0xFF;
            }
        }
    }
    _this.offset += 8;
    _this.bitoffset = 0;
}
function wdfloat(_this, value, endian) {
    check_size(_this, 8, 0);
    const maxValue = 1.7976931348623158e308;
    const minValue = 2.2250738585072014e-308;
    if (value < minValue || value > maxValue) {
        _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
        throw new Error('Value is out of range for the specified 64bit length.' + " min: " + minValue + " max: " + maxValue + " value: " + value);
    }
    const intArray = new Int32Array(2);
    const floatArray = new Float64Array(intArray.buffer);
    floatArray[0] = value;
    const bytes = new Uint8Array(intArray.buffer);
    for (let i = 0; i < 8; i++) {
        if ((_this.endian) == "little") {
            _this.data[_this.offset + i] = bytes[i];
        }
        else {
            _this.data[_this.offset + (7 - i)] = bytes[i];
        }
    }
    _this.offset += 8;
    _this.bitoffset = 0;
}
function rdfloat(_this, endian) {
    var uint64Value = _this.readInt64(true, (endian == undefined ? _this.endian : endian));
    const sign = (uint64Value & 0x8000000000000000n) >> 63n;
    const exponent = Number((uint64Value & 0x7ff0000000000000n) >> 52n) - 1023;
    const fraction = Number(uint64Value & 0x000fffffffffffffn) / Math.pow(2, 52);
    var floatValue;
    if (exponent == -1023) {
        if (fraction == 0) {
            floatValue = (sign == 0n) ? 0 : -0;
        }
        else {
            floatValue = (sign == 0n ? 1 : -1) * Math.pow(2, -1022) * fraction;
        }
    }
    else if (exponent == 1024) {
        if (fraction == 0) {
            floatValue = (sign == 0n) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        else {
            floatValue = Number.NaN;
        }
    }
    else {
        floatValue = (sign == 0n ? 1 : -1) * Math.pow(2, exponent) * (1 + fraction);
    }
    return floatValue;
}
function rstring(_this, options) {
    var length = options && options.length;
    var stringType = options && options.stringType || 'utf-8';
    var terminateValue = options && options.terminateValue;
    var lengthReadSize = options && options.lengthReadSize || 1;
    var stripNull = options && options.stripNull || true;
    var encoding = options && options.encoding || 'utf-8';
    var endian = options && options.endian || _this.endian;
    var terminate = terminateValue;
    if (length != undefined) {
        check_size(_this, length);
    }
    if (typeof terminateValue == "number") {
        terminate = terminateValue & 0xFF;
    }
    else {
        if (terminateValue != undefined) {
            throw new Error("terminateValue must be a number");
        }
    }
    if (stringType == 'utf-8' || stringType == 'utf-16') {
        if (encoding == undefined) {
            if (stringType == 'utf-8') {
                encoding = 'utf-8';
            }
            if (stringType == 'utf-16') {
                encoding = 'utf-16';
            }
        }
        const encodedBytes = [];
        if (length == undefined && terminateValue == undefined) {
            terminate = 0;
        }
        var read_length = 0;
        if (length != undefined) {
            read_length = length;
        }
        else {
            read_length = _this.data.length - _this.offset;
        }
        for (let i = 0; i < read_length; i++) {
            if (stringType === 'utf-8') {
                var read = _this.readUByte();
                if (read == terminate) {
                    break;
                }
                else {
                    if (!(stripNull == true && read == 0)) {
                        encodedBytes.push(read);
                    }
                }
            }
            else {
                var read = _this.readInt16(true, endian);
                var read1 = read & 0xFF;
                var read2 = (read >> 8) & 0xFF;
                if (read == terminate) {
                    break;
                }
                else {
                    if (!(stripNull == true && read == 0)) {
                        encodedBytes.push(read1);
                        encodedBytes.push(read2);
                    }
                }
            }
        }
        return new TextDecoder(encoding).decode(new Uint8Array(encodedBytes));
    }
    else if (stringType == 'pascal' || stringType == 'wide-pascal') {
        if (encoding == undefined) {
            if (stringType == 'pascal') {
                encoding = 'utf-8';
            }
            if (stringType == 'wide-pascal') {
                encoding = 'utf-16';
            }
        }
        var maxBytes;
        if (lengthReadSize == 1) {
            maxBytes = _this.readUByte();
        }
        else if (lengthReadSize == 2) {
            maxBytes = _this.readInt16(true, endian);
        }
        else if (lengthReadSize == 4) {
            maxBytes = _this.readInt32(true, endian);
        }
        else {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error("Invalid length read size: " + lengthReadSize);
        }
        const encodedBytes = [];
        for (let i = 0; i < maxBytes; i++) {
            if (stringType == 'wide-pascal') {
                const read = _this.readInt16(true, endian);
                if (!(stripNull == true && read == 0)) {
                    encodedBytes.push(read);
                }
            }
            else {
                const read = _this.readUByte();
                if (!(stripNull == true && read == 0)) {
                    encodedBytes.push(read);
                }
            }
        }
        var str_return;
        if (stringType == 'wide-pascal') {
            str_return = new TextDecoder(encoding).decode(new Uint16Array(encodedBytes));
        }
        else {
            str_return = new TextDecoder(encoding).decode(new Uint8Array(encodedBytes));
        }
        return str_return;
    }
    else {
        throw new Error('Unsupported string type: ' + stringType);
    }
}
function wstring(_this, string, options) {
    var length = options && options.length;
    var stringType = options && options.stringType || 'utf-8';
    var terminateValue = options && options.terminateValue;
    var lengthWriteSize = options && options.lengthWriteSize || 1;
    options && options.encoding || 'utf-8';
    var endian = options && options.endian || _this.endian;
    if (stringType === 'utf-8' || stringType === 'utf-16') {
        const encoder = new TextEncoder();
        const encodedString = encoder.encode(string);
        if (length == undefined && terminateValue == undefined) {
            terminateValue = 0;
        }
        var totalLength = (length || encodedString.length) + (terminateValue != undefined ? 1 : 0);
        if (stringType == 'utf-16') {
            totalLength = (length || (encodedString.length * 2)) + (terminateValue != undefined ? 2 : 0);
        }
        check_size(_this, totalLength, 0);
        for (let i = 0; i < encodedString.length; i++) {
            if (stringType === 'utf-16') {
                const charCode = encodedString[i];
                if (endian == "little") {
                    _this.data[_this.offset + i * 2] = charCode & 0xFF;
                    _this.data[_this.offset + i * 2 + 1] = (charCode >> 8) & 0xFF;
                }
                else {
                    _this.data[_this.offset + i * 2 + 1] = charCode & 0xFF;
                    _this.data[_this.offset + i * 2] = (charCode >> 8) & 0xFF;
                }
            }
            else {
                _this.data[_this.offset + i] = encodedString[i];
            }
        }
        if (terminateValue != undefined) {
            if (stringType === 'utf-16') {
                _this.data[_this.offset + totalLength - 1] = terminateValue & 0xFF;
                _this.data[_this.offset + totalLength] = (terminateValue >> 8) & 0xFF;
            }
            else {
                _this.data[_this.offset + totalLength] = terminateValue;
            }
        }
        _this.offset += totalLength;
        _this.bitoffset = 0;
    }
    else if (stringType == 'pascal' || stringType == 'wide-pascal') {
        const encoder = new TextEncoder();
        var maxLength;
        if (lengthWriteSize == 1) {
            maxLength = 255;
        }
        else if (lengthWriteSize == 2) {
            maxLength = 65535;
        }
        else if (lengthWriteSize == 4) {
            maxLength = 4294967295;
        }
        else {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error("Invalid length write size: " + lengthWriteSize);
        }
        if (string.length > maxLength || (length || 0) > maxLength) {
            _this.errorDump ? "[Error], hexdump:\n" + _this.hexdump() : "";
            throw new Error("String outsize of max write length: " + maxLength);
        }
        var maxBytes = Math.min(string.length, maxLength);
        const encodedString = encoder.encode(string.substring(0, maxBytes));
        var totalLength = (length || encodedString.length) + lengthWriteSize;
        if (stringType == 'wide-pascal') {
            totalLength = (length || (encodedString.length * 2)) + lengthWriteSize;
        }
        check_size(_this, totalLength, 0);
        if (lengthWriteSize == 1) {
            _this.writeUByte(maxBytes);
        }
        else if (lengthWriteSize == 2) {
            _this.writeUInt16(maxBytes, endian);
        }
        else if (lengthWriteSize == 4) {
            _this.writeUInt32(maxBytes, endian);
        }
        for (let i = 0; i < encodedString.length; i++) {
            if (stringType == 'wide-pascal') {
                const charCode = encodedString[i];
                if (endian == "little") {
                    _this.data[_this.offset + i * 2] = charCode & 0xFF;
                    _this.data[_this.offset + i * 2 + 1] = (charCode >> 8) & 0xFF;
                }
                else {
                    _this.data[_this.offset + i * 2 + 1] = charCode & 0xFF;
                    _this.data[_this.offset + i * 2] = (charCode >> 8) & 0xFF;
                }
            }
            else {
                _this.data[_this.offset + i] = encodedString[i];
            }
        }
        _this.offset += totalLength;
        _this.bitoffset = 0;
    }
    else {
        throw new Error('Unsupported string type: ' + stringType);
    }
}
class bireader {
    isBufferOrUint8Array(obj) {
        return arraybuffcheck$4(this, obj);
    }
    extendArray(to_padd) {
        return extendarray(this, to_padd);
    }
    constructor(data, byteOffset, bitOffset, endianness, strict) {
        this.endian = "little";
        this.offset = 0;
        this.bitoffset = 0;
        this.size = 0;
        this.sizeB = 0;
        this.strict = false;
        this.errorDump = true;
        this.data = [];
        if (data == undefined) {
            throw new Error("Data required");
        }
        else {
            if (!this.isBufferOrUint8Array(data)) {
                throw new Error("Write data must be Uint8Array or Buffer");
            }
            this.data = data;
        }
        this.size = this.data.length;
        this.sizeB = this.data.length * 8;
        if (endianness != undefined && typeof endianness != "string") {
            throw new Error("Endian must be big or little");
        }
        if (endianness != undefined && !(endianness == "big" || endianness == "little")) {
            throw new Error("Byte order must be big or little");
        }
        this.endian = endianness || "little";
        if (typeof strict == "boolean") {
            this.strict = strict;
        }
        else {
            if (strict != undefined) {
                throw new Error("Strict mode must be true of false");
            }
        }
        if (byteOffset != undefined || bitOffset != undefined) {
            this.offset = ((Math.abs(byteOffset || 0)) + Math.ceil((Math.abs(bitOffset || 0)) / 8));
            this.offset += Math.floor((Math.abs(bitOffset || 0)) / 8);
            this.bitoffset = (Math.abs(bitOffset || 0) + 64) % 8;
            this.bitoffset = Math.min(Math.max(this.bitoffset, 0), 7);
            this.offset = Math.max(this.offset, 0);
            if (this.offset > this.size) {
                if (this.strict == false) {
                    this.extendArray(this.offset - this.size);
                }
                else {
                    throw new Error(`Starting offset outside of size: ${this.offset} of ${this.size}`);
                }
            }
        }
    }
    endianness(endian) {
        if (endian == undefined || typeof endian != "string") {
            throw new Error("Endian must be big or little");
        }
        if (endian != undefined && !(endian == "big" || endian == "little")) {
            throw new Error("Endian must be big or little");
        }
        this.endian = endian;
    }
    bigEndian() {
        this.endianness("big");
    }
    big() {
        this.endianness("big");
    }
    be() {
        this.endianness("big");
    }
    littleEndian() {
        this.endianness("little");
    }
    little() {
        this.endianness("little");
    }
    le() {
        this.endianness("little");
    }
    length() {
        return this.size;
    }
    FileSize() {
        return this.size;
    }
    lengthB() {
        return this.sizeB;
    }
    FileSizeB() {
        return this.sizeB;
    }
    getLine() {
        return Math.abs(Math.floor((this.offset - 1) / 16));
    }
    row() {
        return Math.abs(Math.floor((this.offset - 1) / 16));
    }
    remain() {
        return this.size - this.offset;
    }
    FEoF() {
        return this.size - this.offset;
    }
    remainB() {
        return (this.size * 8) - this.saveOffsetAbsBit();
    }
    FEoFB() {
        return (this.size * 8) - this.saveOffsetAbsBit();
    }
    align(number) {
        return align(this, number);
    }
    alignRev(number) {
        return alignRev(this, number);
    }
    skip(bytes, bits) {
        return skip(this, bytes, bits);
    }
    jump(bytes, bits) {
        this.skip(bytes, bits);
    }
    goto(byte, bit) {
        return goto(this, byte, bit);
    }
    FSeek(byte, bit) {
        return goto(this, byte, bit);
    }
    seek(bytes, bits) {
        return this.skip(bytes, bits);
    }
    pointer(byte, bit) {
        return this.goto(byte, bit);
    }
    warp(byte, bit) {
        return this.goto(byte, bit);
    }
    rewind() {
        this.offset = 0;
        this.bitoffset = 0;
    }
    gotoStart() {
        return this.rewind();
    }
    last() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    gotoEnd() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    EoF() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    tell() {
        return this.offset;
    }
    FTell() {
        return this.offset;
    }
    getOffset() {
        return this.tell();
    }
    saveOffset() {
        return this.tell();
    }
    tellB() {
        return this.bitoffset;
    }
    FTellB() {
        return this.tellB();
    }
    getOffsetBit() {
        return this.tellB();
    }
    saveOffsetAbsBit() {
        return (this.offset * 8) + this.bitoffset;
    }
    tellAbsB() {
        return this.saveOffsetAbsBit();
    }
    getOffsetAbsBit() {
        return this.saveOffsetAbsBit();
    }
    saveOffsetBit() {
        return this.saveOffsetAbsBit();
    }
    restrict() {
        this.strict = true;
    }
    unrestrict() {
        this.strict = false;
    }
    xor(xorKey, startOffset, endOffset, consume) {
        var XORKey = xorKey;
        if (typeof xorKey == "number") ;
        else if (typeof xorKey == "string") {
            xorKey = new TextEncoder().encode(xorKey);
        }
        else if (this.isBufferOrUint8Array(XORKey)) ;
        else {
            throw new Error("XOR must be a number, string, Uint8Array or Buffer");
        }
        return XOR(this, xorKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    xorThis(xorKey, length, consume) {
        var Length = length || 1;
        var XORKey = xorKey;
        if (typeof xorKey == "number") {
            Length = length || 1;
        }
        else if (typeof xorKey == "string") {
            const encoder = new TextEncoder().encode(xorKey);
            XORKey = encoder;
            Length = length || encoder.length;
        }
        else if (this.isBufferOrUint8Array(XORKey)) {
            Length = length || xorKey.length;
        }
        else {
            throw new Error("XOR must be a number, string, Uint8Array or Buffer");
        }
        return XOR(this, XORKey, this.offset, this.offset + Length, consume || false);
    }
    or(orKey, startOffset, endOffset, consume) {
        var ORKey = orKey;
        if (typeof orKey == "number") ;
        else if (typeof orKey == "string") {
            orKey = new TextEncoder().encode(orKey);
        }
        else if (this.isBufferOrUint8Array(ORKey)) ;
        else {
            throw new Error("OR must be a number, string, Uint8Array or Buffer");
        }
        return OR(this, orKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    orThis(orKey, length, consume) {
        var Length = length || 1;
        var ORKey = orKey;
        if (typeof orKey == "number") {
            Length = length || 1;
        }
        else if (typeof orKey == "string") {
            const encoder = new TextEncoder().encode(orKey);
            ORKey = encoder;
            Length = length || encoder.length;
        }
        else if (this.isBufferOrUint8Array(ORKey)) {
            Length = length || orKey.length;
        }
        else {
            throw new Error("OR must be a number, string, Uint8Array or Buffer");
        }
        return OR(this, ORKey, this.offset, this.offset + Length, consume || false);
    }
    and(andKey, startOffset, endOffset, consume) {
        var ANDKey = andKey;
        if (typeof ANDKey == "number") ;
        else if (typeof ANDKey == "string") {
            ANDKey = new TextEncoder().encode(ANDKey);
        }
        else if (typeof ANDKey == "object") ;
        else {
            throw new Error("AND must be a number, string, number array or Buffer");
        }
        return AND(this, andKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    andThis(andKey, length, consume) {
        var Length = length || 1;
        var ANDKey = andKey;
        if (typeof andKey == "number") {
            Length = length || 1;
        }
        else if (typeof andKey == "string") {
            const encoder = new TextEncoder().encode(andKey);
            ANDKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof andKey == "object") {
            Length = length || andKey.length;
        }
        else {
            throw new Error("AND must be a number, string, number array or Buffer");
        }
        return AND(this, ANDKey, this.offset, this.offset + Length, consume || false);
    }
    not(startOffset, endOffset, consume) {
        return NOT(this, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    notThis(length, consume) {
        return NOT(this, this.offset, this.offset + (length || 1), consume || false);
    }
    lShift(shiftKey, startOffset, endOffset, consume) {
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") ;
        else if (typeof lShiftKey == "string") {
            lShiftKey = new TextEncoder().encode(lShiftKey);
        }
        else if (typeof lShiftKey == "object") ;
        else {
            throw new Error("Left shift must be a number, string, number array or Buffer");
        }
        return LSHIFT(this, lShiftKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    lShiftThis(shiftKey, length, consume) {
        var Length = length || 1;
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") {
            Length = length || 1;
        }
        else if (typeof lShiftKey == "string") {
            const encoder = new TextEncoder().encode(lShiftKey);
            lShiftKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof lShiftKey == "object") {
            Length = length || lShiftKey.length;
        }
        else {
            throw new Error("Left shift must be a number, string, number array or Buffer");
        }
        return LSHIFT(this, shiftKey, this.offset, this.offset + Length, consume || false);
    }
    rShift(shiftKey, startOffset, endOffset, consume) {
        var rShiftKey = shiftKey;
        if (typeof rShiftKey == "number") ;
        else if (typeof rShiftKey == "string") {
            rShiftKey = new TextEncoder().encode(rShiftKey);
        }
        else if (typeof rShiftKey == "object") ;
        else {
            throw new Error("Right shift must be a number, string, number array or Buffer");
        }
        return RSHIFT(this, rShiftKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    rShiftThis(shiftKey, length, consume) {
        var Length = length || 1;
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") {
            Length = length || 1;
        }
        else if (typeof lShiftKey == "string") {
            const encoder = new TextEncoder().encode(lShiftKey);
            lShiftKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof lShiftKey == "object") {
            Length = length || lShiftKey.length;
        }
        else {
            throw new Error("Right shift must be a number, string, number array or Buffer");
        }
        return RSHIFT(this, lShiftKey, this.offset, this.offset + Length, consume || false);
    }
    add(addKey, startOffset, endOffset, consume) {
        var addedKey = addKey;
        if (typeof addedKey == "number") ;
        else if (typeof addedKey == "string") {
            addedKey = new TextEncoder().encode(addedKey);
        }
        else if (typeof addedKey == "object") ;
        else {
            throw new Error("Add key must be a number, string, number array or Buffer");
        }
        return ADD(this, addedKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    addThis(addKey, length, consume) {
        var Length = length || 1;
        var AddedKey = addKey;
        if (typeof AddedKey == "number") {
            Length = length || 1;
        }
        else if (typeof AddedKey == "string") {
            const encoder = new TextEncoder().encode(AddedKey);
            AddedKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof AddedKey == "object") {
            Length = length || AddedKey.length;
        }
        else {
            throw new Error("Add key must be a number, string, number array or Buffer");
        }
        return ADD(this, AddedKey, this.offset, this.offset + Length, consume || false);
    }
    delete(startOffset, endOffset, consume) {
        return remove(this, startOffset || 0, endOffset || this.offset, consume || false, true);
    }
    clip() {
        return remove(this, this.offset, this.size, false, true);
    }
    trim() {
        return remove(this, this.offset, this.size, false, true);
    }
    crop(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, true);
    }
    drop(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, true);
    }
    lift(startOffset, endOffset, consume, fillValue) {
        return remove(this, startOffset || this.offset, endOffset || this.size, consume || false, false, fillValue);
    }
    fill(startOffset, endOffset, consume, fillValue) {
        return remove(this, startOffset || this.offset, endOffset || this.size, consume || false, false, fillValue);
    }
    extract(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    slice(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    wrap(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    insert(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, false);
    }
    place(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, false);
    }
    replace(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, true);
    }
    overwrite(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, true);
    }
    unshift(data, consume) {
        return addData(this, data, consume || false, 0, false);
    }
    prepend(data, consume) {
        return addData(this, data, consume || false, 0, false);
    }
    push(data, consume) {
        return addData(this, data, consume || false, this.size, false);
    }
    append(data, consume) {
        return addData(this, data, consume || false, this.size, false);
    }
    get() {
        return this.data;
    }
    return() {
        return this.data;
    }
    end() {
        this.data = undefined;
    }
    close() {
        this.data = undefined;
    }
    done() {
        this.data = undefined;
    }
    finished() {
        this.data = undefined;
    }
    hexdump(options) {
        return hexDump(this, options);
    }
    errorDumpOff() {
        this.errorDump = false;
    }
    errorDumpOn() {
        this.errorDump = true;
    }
    findString(string) {
        return fString(this, string);
    }
    findByte(value, unsigned, endian) {
        return fNumber(this, value, 8, unsigned == undefined ? true : unsigned, endian);
    }
    findShort(value, unsigned, endian) {
        return fNumber(this, value, 16, unsigned == undefined ? true : unsigned, endian);
    }
    findInt(value, unsigned, endian) {
        return fNumber(this, value, 32, unsigned == undefined ? true : unsigned, endian);
    }
    findHalfFloat(value, endian) {
        return fHalfFloat(this, value, endian);
    }
    findFloat(value, endian) {
        return fFloat(this, value, endian);
    }
    findInt64(value, unsigned, endian) {
        return fBigInt(this, value, unsigned == undefined ? true : unsigned, endian);
    }
    findDoubleFloat(value, endian) {
        return fDoubleFloat(this, value, endian);
    }
    writeBit(value, bits, unsigned, endian) {
        return wbit(this, value, bits, unsigned, endian);
    }
    readBit(bits, unsigned, endian) {
        return rbit(this, bits, unsigned, endian);
    }
    bit(bits, unsigned, endian) {
        return this.readBit(bits, unsigned, endian);
    }
    ubit(bits, endian) {
        return this.readBit(bits, true, endian);
    }
    bit1(unsigned, endian) {
        return this.bit(1, unsigned, endian);
    }
    bit1le(unsigned) {
        return this.bit(1, unsigned, "little");
    }
    bit1be(unsigned) {
        return this.bit(1, unsigned, "big");
    }
    ubit1() {
        return this.bit(1, true);
    }
    ubit1le() {
        return this.bit(1, true, "little");
    }
    ubit1be() {
        return this.bit(1, true, "big");
    }
    bit2(unsigned) {
        return this.bit(2, unsigned);
    }
    bit2le(unsigned) {
        return this.bit(2, unsigned, "little");
    }
    bit2be(unsigned) {
        return this.bit(2, unsigned, "big");
    }
    ubit2() {
        return this.bit(2, true);
    }
    ubit2le() {
        return this.bit(2, true, "little");
    }
    ubit2be() {
        return this.bit(2, true, "big");
    }
    bit3(unsigned) {
        return this.bit(3, unsigned);
    }
    bit3le(unsigned) {
        return this.bit(3, unsigned, "little");
    }
    bit3be(unsigned) {
        return this.bit(3, unsigned, "big");
    }
    ubit3() {
        return this.bit(3, true);
    }
    ubit3le() {
        return this.bit(3, true, "little");
    }
    ubit3be() {
        return this.bit(3, true, "big");
    }
    bit4(unsigned) {
        return this.bit(4, unsigned);
    }
    bit4le(unsigned) {
        return this.bit(4, unsigned, "little");
    }
    bit4be(unsigned) {
        return this.bit(4, unsigned, "big");
    }
    ubit4() {
        return this.bit(4, true);
    }
    ubit4le() {
        return this.bit(4, true, "little");
    }
    ubit4be() {
        return this.bit(4, true, "big");
    }
    bit5(unsigned) {
        return this.bit(5, unsigned);
    }
    bit5le(unsigned) {
        return this.bit(5, unsigned, "little");
    }
    bit5be(unsigned) {
        return this.bit(5, unsigned, "big");
    }
    ubit5() {
        return this.bit(5, true);
    }
    ubit5le() {
        return this.bit(5, true, "little");
    }
    ubit5be() {
        return this.bit(5, true, "big");
    }
    bit6(unsigned) {
        return this.bit(6, unsigned);
    }
    bit6le(unsigned) {
        return this.bit(6, unsigned, "little");
    }
    bit6be(unsigned) {
        return this.bit(6, unsigned, "big");
    }
    ubit6() {
        return this.bit(6, true);
    }
    ubit6le() {
        return this.bit(6, true, "little");
    }
    ubit6be() {
        return this.bit(6, true, "big");
    }
    bit7(unsigned) {
        return this.bit(7, unsigned);
    }
    bit7le(unsigned) {
        return this.bit(7, unsigned, "little");
    }
    bit7be(unsigned) {
        return this.bit(7, unsigned, "big");
    }
    ubit7() {
        return this.bit(7, true);
    }
    ubit7le() {
        return this.bit(7, true, "little");
    }
    ubit7be() {
        return this.bit(7, true, "big");
    }
    bit8(unsigned) {
        return this.bit(8, unsigned);
    }
    bit8le(unsigned) {
        return this.bit(8, unsigned, "little");
    }
    bit8be(unsigned) {
        return this.bit(8, unsigned, "big");
    }
    ubit8() {
        return this.bit(8, true);
    }
    ubit8le() {
        return this.bit(8, true, "little");
    }
    ubit8be() {
        return this.bit(8, true, "big");
    }
    bit9(unsigned) {
        return this.bit(9, unsigned);
    }
    bit9le(unsigned) {
        return this.bit(9, unsigned, "little");
    }
    bit9be(unsigned) {
        return this.bit(9, unsigned, "big");
    }
    ubit9() {
        return this.bit(9, true);
    }
    ubit9le() {
        return this.bit(9, true, "little");
    }
    ubit9be() {
        return this.bit(9, true, "big");
    }
    bit10(unsigned) {
        return this.bit(10, unsigned);
    }
    bit10le(unsigned) {
        return this.bit(10, unsigned, "little");
    }
    bit10be(unsigned) {
        return this.bit(10, unsigned, "big");
    }
    ubit10() {
        return this.bit(10, true);
    }
    ubit10le() {
        return this.bit(10, true, "little");
    }
    ubit10be() {
        return this.bit(10, true, "big");
    }
    bit11(unsigned) {
        return this.bit(11, unsigned);
    }
    bit11le(unsigned) {
        return this.bit(11, unsigned, "little");
    }
    bit11be(unsigned) {
        return this.bit(11, unsigned, "big");
    }
    ubit11() {
        return this.bit(11, true);
    }
    ubit11le() {
        return this.bit(11, true, "little");
    }
    ubit11be() {
        return this.bit(11, true, "big");
    }
    bit12(unsigned) {
        return this.bit(12, unsigned);
    }
    bit12le(unsigned) {
        return this.bit(12, unsigned, "little");
    }
    bit12be(unsigned) {
        return this.bit(12, unsigned, "big");
    }
    ubit12() {
        return this.bit(12, true);
    }
    ubit12le() {
        return this.bit(12, true, "little");
    }
    ubit12be() {
        return this.bit(12, true, "big");
    }
    bit13(unsigned) {
        return this.bit(13, unsigned);
    }
    bit13le(unsigned) {
        return this.bit(13, unsigned, "little");
    }
    bit13be(unsigned) {
        return this.bit(13, unsigned, "big");
    }
    ubit13() {
        return this.bit(13, true);
    }
    ubit13le() {
        return this.bit(13, true, "little");
    }
    ubit13be() {
        return this.bit(13, true, "big");
    }
    bit14(unsigned) {
        return this.bit(14, unsigned);
    }
    bit14le(unsigned) {
        return this.bit(14, unsigned, "little");
    }
    bit14be(unsigned) {
        return this.bit(14, unsigned, "big");
    }
    ubit14() {
        return this.bit(14, true);
    }
    ubit14le() {
        return this.bit(14, true, "little");
    }
    ubit14be() {
        return this.bit(14, true, "big");
    }
    bit15(unsigned) {
        return this.bit(15, unsigned);
    }
    bit15le(unsigned) {
        return this.bit(15, unsigned, "little");
    }
    bit15be(unsigned) {
        return this.bit(15, unsigned, "big");
    }
    ubit15() {
        return this.bit(15, true);
    }
    ubit15le() {
        return this.bit(15, true, "little");
    }
    ubit15be() {
        return this.bit(15, true, "big");
    }
    bit16(unsigned) {
        return this.bit(16, unsigned);
    }
    bit16le(unsigned) {
        return this.bit(16, unsigned, "little");
    }
    bit16be(unsigned) {
        return this.bit(16, unsigned, "big");
    }
    ubit16() {
        return this.bit(16, true);
    }
    ubit16le() {
        return this.bit(16, true, "little");
    }
    ubit16be() {
        return this.bit(16, true, "big");
    }
    bit17(unsigned) {
        return this.bit(17, unsigned);
    }
    bit17le(unsigned) {
        return this.bit(17, unsigned, "little");
    }
    bit17be(unsigned) {
        return this.bit(17, unsigned, "big");
    }
    ubit17() {
        return this.bit(17, true);
    }
    ubit17le() {
        return this.bit(17, true, "little");
    }
    ubit17be() {
        return this.bit(17, true, "big");
    }
    bit18(unsigned) {
        return this.bit(18, unsigned);
    }
    bit18le(unsigned) {
        return this.bit(18, unsigned, "little");
    }
    bit18be(unsigned) {
        return this.bit(18, unsigned, "big");
    }
    ubit18() {
        return this.bit(18, true);
    }
    ubit18le() {
        return this.bit(18, true, "little");
    }
    ubit18be() {
        return this.bit(18, true, "big");
    }
    bit19(unsigned) {
        return this.bit(19, unsigned);
    }
    bit19le(unsigned) {
        return this.bit(19, unsigned, "little");
    }
    bit19be(unsigned) {
        return this.bit(19, unsigned, "big");
    }
    ubit19() {
        return this.bit(19, true);
    }
    ubit19le() {
        return this.bit(19, true, "little");
    }
    ubit19be() {
        return this.bit(19, true, "big");
    }
    bit20(unsigned) {
        return this.bit(20, unsigned);
    }
    bit20le(unsigned) {
        return this.bit(20, unsigned, "little");
    }
    bit20be(unsigned) {
        return this.bit(20, unsigned, "big");
    }
    ubit20() {
        return this.bit(20, true);
    }
    ubit20le() {
        return this.bit(20, true, "little");
    }
    ubit20be() {
        return this.bit(20, true, "big");
    }
    bit21(unsigned) {
        return this.bit(21, unsigned);
    }
    bit21le(unsigned) {
        return this.bit(21, unsigned, "little");
    }
    bit21be(unsigned) {
        return this.bit(21, unsigned, "big");
    }
    ubit21() {
        return this.bit(21, true);
    }
    ubit21le() {
        return this.bit(21, true, "little");
    }
    ubit21be() {
        return this.bit(21, true, "big");
    }
    bit22(unsigned) {
        return this.bit(22, unsigned);
    }
    bit22le(unsigned) {
        return this.bit(22, unsigned, "little");
    }
    bit22be(unsigned) {
        return this.bit(22, unsigned, "big");
    }
    ubit22() {
        return this.bit(22, true);
    }
    ubit22le() {
        return this.bit(22, true, "little");
    }
    ubit22be() {
        return this.bit(22, true, "big");
    }
    bit23(unsigned) {
        return this.bit(23, unsigned);
    }
    bit23le(unsigned) {
        return this.bit(23, unsigned, "little");
    }
    bit23be(unsigned) {
        return this.bit(23, unsigned, "big");
    }
    ubit23() {
        return this.bit(23, true);
    }
    ubit23le() {
        return this.bit(23, true, "little");
    }
    ubit23be() {
        return this.bit(23, true, "big");
    }
    bit24(unsigned) {
        return this.bit(24, unsigned);
    }
    bit24le(unsigned) {
        return this.bit(24, unsigned, "little");
    }
    bit24be(unsigned) {
        return this.bit(24, unsigned, "big");
    }
    ubit24() {
        return this.bit(24, true);
    }
    ubit24le() {
        return this.bit(24, true, "little");
    }
    ubit24be() {
        return this.bit(24, true, "big");
    }
    bit25(unsigned) {
        return this.bit(25, unsigned);
    }
    bit25le(unsigned) {
        return this.bit(25, unsigned, "little");
    }
    bit25be(unsigned) {
        return this.bit(25, unsigned, "big");
    }
    ubit25() {
        return this.bit(25, true);
    }
    ubit25le() {
        return this.bit(25, true, "little");
    }
    ubit25be() {
        return this.bit(25, true, "big");
    }
    bit26(unsigned) {
        return this.bit(26, unsigned);
    }
    bit26le(unsigned) {
        return this.bit(26, unsigned, "little");
    }
    bit26be(unsigned) {
        return this.bit(26, unsigned, "big");
    }
    ubit26() {
        return this.bit(26, true);
    }
    ubit26le() {
        return this.bit(26, true, "little");
    }
    ubit26be() {
        return this.bit(26, true, "big");
    }
    bit27(unsigned) {
        return this.bit(27, unsigned);
    }
    bit27le(unsigned) {
        return this.bit(27, unsigned, "little");
    }
    bit27be(unsigned) {
        return this.bit(27, unsigned, "big");
    }
    ubit27() {
        return this.bit(27, true);
    }
    ubit27le() {
        return this.bit(27, true, "little");
    }
    ubit27be() {
        return this.bit(27, true, "big");
    }
    bit28(unsigned) {
        return this.bit(28, unsigned);
    }
    bit28le(unsigned) {
        return this.bit(28, unsigned, "little");
    }
    bit28be(unsigned) {
        return this.bit(28, unsigned, "big");
    }
    ubit28() {
        return this.bit(28, true);
    }
    ubit28le() {
        return this.bit(28, true, "little");
    }
    ubit28be() {
        return this.bit(28, true, "big");
    }
    bit29(unsigned) {
        return this.bit(29, unsigned);
    }
    bit29le(unsigned) {
        return this.bit(29, unsigned, "little");
    }
    bit29be(unsigned) {
        return this.bit(29, unsigned, "big");
    }
    ubit29() {
        return this.bit(29, true);
    }
    ubit29le() {
        return this.bit(29, true, "little");
    }
    ubit29be() {
        return this.bit(29, true, "big");
    }
    bit30(unsigned) {
        return this.bit(30, unsigned);
    }
    bit30le(unsigned) {
        return this.bit(30, unsigned, "little");
    }
    bit30be(unsigned) {
        return this.bit(30, unsigned, "big");
    }
    ubit30() {
        return this.bit(30, true);
    }
    ubit30le() {
        return this.bit(30, true, "little");
    }
    ubit30be() {
        return this.bit(30, true, "big");
    }
    bit31(unsigned) {
        return this.bit(31, unsigned);
    }
    bit31le(unsigned) {
        return this.bit(31, unsigned, "little");
    }
    bit31be(unsigned) {
        return this.bit(31, unsigned, "big");
    }
    ubit31() {
        return this.bit(31, true);
    }
    ubit31le() {
        return this.bit(31, true, "little");
    }
    ubit31be() {
        return this.bit(31, true, "big");
    }
    bit32(unsigned) {
        return this.bit(32, unsigned);
    }
    bit32le(unsigned) {
        return this.bit(32, unsigned, "little");
    }
    bit32be(unsigned) {
        return this.bit(32, unsigned, "big");
    }
    ubit32() {
        return this.bit(32, true);
    }
    ubit32le() {
        return this.bit(32, true, "little");
    }
    ubit32be() {
        return this.bit(32, true, "big");
    }
    readUBitBE(bits) {
        return this.bit(bits, true, "big");
    }
    ubitbe(bits) {
        return this.bit(bits, true, "big");
    }
    readBitBE(bits, unsigned) {
        return this.bit(bits, unsigned, "big");
    }
    bitbe(bits, unsigned) {
        return this.bit(bits, unsigned, "big");
    }
    readUBitLE(bits) {
        return this.bit(bits, true, "little");
    }
    ubitle(bits) {
        return this.bit(bits, true, "little");
    }
    readBitLE(bits, unsigned) {
        return this.bit(bits, unsigned, "little");
    }
    bitle(bits, unsigned) {
        return this.bit(bits, unsigned, "little");
    }
    readByte(unsigned) {
        return rbyte(this, unsigned);
    }
    writeByte(value, unsigned) {
        return wbyte(this, value, unsigned);
    }
    writeUByte(value) {
        return wbyte(this, value, true);
    }
    byte(unsigned) {
        return this.readByte(unsigned);
    }
    int8(unsigned) {
        return this.readByte(unsigned);
    }
    readUByte() {
        return this.readByte(true);
    }
    uint8() {
        return this.readByte(true);
    }
    ubyte() {
        return this.readByte(true);
    }
    readInt16(unsigned, endian) {
        return rint16(this, unsigned, endian);
    }
    writeInt16(value, unsigned, endian) {
        return wint16(this, value, unsigned, endian);
    }
    writeUInt16(value, endian) {
        return wint16(this, value, true, endian);
    }
    int16(unsigned, endian) {
        return this.readInt16(unsigned, endian);
    }
    short(unsigned, endian) {
        return this.readInt16(unsigned, endian);
    }
    word(unsigned, endian) {
        return this.readInt16(unsigned, endian);
    }
    readUInt16(endian) {
        return this.readInt16(true, endian);
    }
    uint16(endian) {
        return this.readInt16(true, endian);
    }
    ushort(endian) {
        return this.readInt16(true, endian);
    }
    uword(endian) {
        return this.readInt16(true, endian);
    }
    readUInt16LE() {
        return this.readInt16(true, "little");
    }
    uint16le() {
        return this.readInt16(true, "little");
    }
    ushortle() {
        return this.readInt16(true, "little");
    }
    uwordle() {
        return this.readInt16(true, "little");
    }
    readInt16LE() {
        return this.readInt16(false, "little");
    }
    int16le() {
        return this.readInt16(false, "little");
    }
    shortle() {
        return this.readInt16(false, "little");
    }
    wordle() {
        return this.readInt16(false, "little");
    }
    readUInt16BE() {
        return this.readInt16(true, "big");
    }
    uint16be() {
        return this.readInt16(true, "big");
    }
    ushortbe() {
        return this.readInt16(true, "big");
    }
    uwordbe() {
        return this.readInt16(true, "big");
    }
    readInt16BE() {
        return this.readInt16(false, "big");
    }
    int16be() {
        return this.readInt16(false, "big");
    }
    shortbe() {
        return this.readInt16(false, "big");
    }
    wordbe() {
        return this.readInt16(false, "big");
    }
    readHalfFloat(endian) {
        return rhalffloat(this, endian);
    }
    writeHalfFloat(value, endian) {
        return whalffloat(this, value);
    }
    halffloat(endian) {
        return this.readHalfFloat(endian);
    }
    half(endian) {
        return this.readHalfFloat(endian);
    }
    readHalfFloatBE() {
        return this.readHalfFloat("big");
    }
    halffloatbe() {
        return this.readHalfFloat("big");
    }
    halfbe() {
        return this.readHalfFloat("big");
    }
    readHalfFloatLE() {
        return this.readHalfFloat("little");
    }
    halffloatle() {
        return this.readHalfFloat("little");
    }
    halfle() {
        return this.readHalfFloat("little");
    }
    readInt32(unsigned, endian) {
        return rint32(this, unsigned, endian);
    }
    writeInt32(value, unsigned, endian) {
        return wint32(this, value, unsigned);
    }
    writeUInt32(value, endian) {
        return wint32(this, value, true);
    }
    int(unsigned, endian) {
        return this.readInt32(unsigned, endian);
    }
    double(unsigned, endian) {
        return this.readInt32(unsigned, endian);
    }
    int32(unsigned, endian) {
        return this.readInt32(unsigned, endian);
    }
    long(unsigned, endian) {
        return this.readInt32(unsigned, endian);
    }
    readUInt() {
        return this.readInt32(true);
    }
    uint() {
        return this.readInt32(true);
    }
    udouble() {
        return this.readInt32(true);
    }
    uint32() {
        return this.readInt32(true);
    }
    ulong() {
        return this.readInt32(true);
    }
    readInt32BE() {
        return this.readInt32(false, "big");
    }
    intbe() {
        return this.readInt32(false, "big");
    }
    doublebe() {
        return this.readInt32(false, "big");
    }
    int32be() {
        return this.readInt32(false, "big");
    }
    longbe() {
        return this.readInt32(false, "big");
    }
    readUInt32BE() {
        return this.readInt32(true, "big");
    }
    uintbe() {
        return this.readInt32(true, "big");
    }
    udoublebe() {
        return this.readInt32(true, "big");
    }
    uint32be() {
        return this.readInt32(true, "big");
    }
    ulongbe() {
        return this.readInt32(true, "big");
    }
    readInt32LE() {
        return this.readInt32(false, "little");
    }
    intle() {
        return this.readInt32(false, "little");
    }
    doublele() {
        return this.readInt32(false, "little");
    }
    int32le() {
        return this.readInt32(false, "little");
    }
    longle() {
        return this.readInt32(false, "little");
    }
    readUInt32LE() {
        return this.readInt32(true, "little");
    }
    uintle() {
        return this.readInt32(true, "little");
    }
    udoublele() {
        return this.readInt32(true, "little");
    }
    uint32le() {
        return this.readInt32(true, "little");
    }
    ulongle() {
        return this.readInt32(true, "little");
    }
    readFloat(endian) {
        return rfloat(this, endian);
    }
    writeFloat(value, endian) {
        return wfloat(this, value);
    }
    float(endian) {
        return this.readFloat(endian);
    }
    readFloatBE() {
        return this.readFloat("big");
    }
    floatbe() {
        return this.readFloat("big");
    }
    readFloatLE() {
        return this.readFloat("little");
    }
    floatle() {
        return this.readFloat("little");
    }
    readInt64(unsigned, endian) {
        return rint64(this, unsigned, endian);
    }
    writeInt64(value, unsigned, endian) {
        return wint64(this, value, unsigned);
    }
    int64(unsigned, endian) {
        return this.readInt64(unsigned, endian);
    }
    bigint(unsigned, endian) {
        return this.readInt64(unsigned, endian);
    }
    quad(unsigned, endian) {
        return this.readInt64(unsigned, endian);
    }
    readUInt64() {
        return this.readInt64(true);
    }
    uint64() {
        return this.readInt64(true);
    }
    ubigint() {
        return this.readInt64(true);
    }
    uquad() {
        return this.readInt64(true);
    }
    readInt64BE() {
        return this.readInt64(false, "big");
    }
    int64be() {
        return this.readInt64(false, "big");
    }
    bigintbe() {
        return this.readInt64(false, "big");
    }
    quadbe() {
        return this.readInt64(false, "big");
    }
    readUInt64BE() {
        return this.readInt64(true, "big");
    }
    uint64be() {
        return this.readInt64(true, "big");
    }
    ubigintbe() {
        return this.readInt64(true, "big");
    }
    uquadbe() {
        return this.readInt64(true, "big");
    }
    readInt64LE() {
        return this.readInt64(false, "little");
    }
    int64le() {
        return this.readInt64(false, "little");
    }
    bigintle() {
        return this.readInt64(false, "little");
    }
    quadle() {
        return this.readInt64(false, "little");
    }
    readUInt64LE() {
        return this.readInt64(true, "little");
    }
    uint64le() {
        return this.readInt64(true, "little");
    }
    ubigintle() {
        return this.readInt64(true, "little");
    }
    uquadle() {
        return this.readInt64(true, "little");
    }
    readDoubleFloat(endian) {
        return rdfloat(this, endian);
    }
    writeDoubleFloat(value, endian) {
        return wdfloat(this, value);
    }
    doublefloat(endian) {
        return this.readDoubleFloat(endian);
    }
    dfloat(endian) {
        return this.readDoubleFloat(endian);
    }
    readDoubleFloatBE() {
        return this.readDoubleFloat("big");
    }
    dfloatebe() {
        return this.readDoubleFloat("big");
    }
    doublefloatbe() {
        return this.readDoubleFloat("big");
    }
    readDoubleFloatLE() {
        return this.readDoubleFloat("little");
    }
    dfloatle() {
        return this.readDoubleFloat("little");
    }
    doublefloatle() {
        return this.readDoubleFloat("little");
    }
    readString(options) {
        return rstring(this, options);
    }
    writeString(string, options) {
        return wstring(this, string, options);
    }
    string(options) {
        return this.readString(options);
    }
    utf8string(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-8", encoding: "utf-8", length: length, terminateValue: terminateValue, stripNull: stripNull });
    }
    cstring(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-8", encoding: "utf-8", length: length, terminateValue: terminateValue, stripNull: stripNull });
    }
    ansistring(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-8", encoding: "windows-1252", length: length, terminateValue: terminateValue, stripNull: stripNull });
    }
    utf16string(length, terminateValue, stripNull, endian) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: endian, stripNull: stripNull });
    }
    unistring(length, terminateValue, stripNull, endian) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: endian, stripNull: stripNull });
    }
    utf16stringle(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "little", stripNull: stripNull });
    }
    unistringle(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "little", stripNull: stripNull });
    }
    utf16stringbe(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "big", stripNull: stripNull });
    }
    unistringbe(length, terminateValue, stripNull) {
        return this.string({ stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "big", stripNull: stripNull });
    }
    pstring(lengthReadSize, stripNull, endian) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: lengthReadSize, stripNull: stripNull, endian: endian });
    }
    pstring1(stripNull, endian) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 1, stripNull: stripNull, endian: endian });
    }
    pstring1le(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 1, stripNull: stripNull, endian: "little" });
    }
    pstring1be(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 1, stripNull: stripNull, endian: "big" });
    }
    pstring2(stripNull, endian) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 2, stripNull: stripNull, endian: endian });
    }
    pstring2le(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 2, stripNull: stripNull, endian: "little" });
    }
    pstring2be(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 2, stripNull: stripNull, endian: "big" });
    }
    pstring4(stripNull, endian) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 4, stripNull: stripNull, endian: endian });
    }
    pstring4le(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 4, stripNull: stripNull, endian: "little" });
    }
    pstring4be(stripNull) {
        return this.string({ stringType: "pascal", encoding: "utf-8", lengthReadSize: 4, stripNull: stripNull, endian: "big" });
    }
    wpstring(lengthReadSize, stripNull, endian) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: lengthReadSize, endian: endian, stripNull: stripNull });
    }
    wpstring1(stripNull, endian) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 1, endian: endian, stripNull: stripNull });
    }
    wpstring2(stripNull, endian) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 2, endian: endian, stripNull: stripNull });
    }
    wpstring2le(stripNull) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 2, endian: "little", stripNull: stripNull });
    }
    wpstring2be(stripNull) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 2, endian: "big", stripNull: stripNull });
    }
    wpstring4(stripNull, endian) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 4, endian: endian, stripNull: stripNull });
    }
    wpstring4be(stripNull) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 4, endian: "big", stripNull: stripNull });
    }
    wpstring4le(stripNull) {
        return this.string({ stringType: "wide-pascal", encoding: "utf-16", lengthReadSize: 4, endian: "little", stripNull: stripNull });
    }
}
class biwriter {
    isBufferOrUint8Array(obj) {
        return arraybuffcheck$4(this, obj);
    }
    extendArray(to_padd) {
        return extendarray(this, to_padd);
    }
    constructor(data, byteOffset, bitOffset, endianness, strict) {
        this.endian = "little";
        this.offset = 0;
        this.bitoffset = 0;
        this.size = 0;
        this.sizeB = 0;
        this.strict = false;
        this.errorDump = true;
        this.data = [];
        if (data == undefined) {
            if (typeof Buffer !== 'undefined') {
                this.data = Buffer.alloc(this.offset || 1 + (this.bitoffset != 0 ? 1 : 0));
            }
            else {
                this.data = new Uint8Array(this.offset || 1 + (this.bitoffset != 0 ? 1 : 0));
            }
        }
        else {
            if (!this.isBufferOrUint8Array(data)) {
                throw new Error("Write data must be Uint8Array or Buffer.");
            }
            this.data = data;
        }
        this.size = this.data.length;
        this.sizeB = this.data.length * 8;
        if (typeof strict == "boolean") {
            this.strict = strict;
        }
        else {
            if (strict != undefined) {
                throw new Error("Strict mode must be true of false.");
            }
        }
        if (endianness != undefined && typeof endianness != "string") {
            throw new Error("endianness must be big or little.");
        }
        if (endianness != undefined && !(endianness == "big" || endianness == "little")) {
            throw new Error("Endianness must be big or little.");
        }
        this.endian = endianness || "little";
        if (byteOffset != undefined || bitOffset != undefined) {
            this.offset = ((Math.abs(byteOffset || 0)) + Math.ceil((Math.abs(bitOffset || 0)) / 8));
            this.offset += Math.floor((Math.abs(bitOffset || 0)) / 8);
            this.bitoffset = (Math.abs(bitOffset || 0) + 64) % 8;
            this.bitoffset = Math.min(Math.max(this.bitoffset, 0), 7);
            this.offset = Math.max(this.offset, 0);
            if (this.offset > this.size) {
                if (this.strict == false) {
                    this.extendArray(this.offset - this.size);
                }
                else {
                    throw new Error(`Starting offset outside of size: ${this.offset} of ${this.size}`);
                }
            }
        }
    }
    endianness(endian) {
        if (endian == undefined || typeof endian != "string") {
            throw new Error("Endian must be big or little");
        }
        if (endian != undefined && !(endian == "big" || endian == "little")) {
            throw new Error("Endian must be big or little");
        }
        this.endian = endian;
    }
    bigEndian() {
        this.endianness("big");
    }
    big() {
        this.endianness("big");
    }
    be() {
        this.endianness("big");
    }
    littleEndian() {
        this.endianness("little");
    }
    little() {
        this.endianness("little");
    }
    le() {
        this.endianness("little");
    }
    length() {
        return this.size;
    }
    FileSize() {
        return this.size;
    }
    lengthB() {
        return this.sizeB;
    }
    FileSizeB() {
        return this.sizeB;
    }
    getLine() {
        return Math.abs(Math.floor((this.offset - 1) / 16));
    }
    row() {
        return Math.abs(Math.floor((this.offset - 1) / 16));
    }
    remain() {
        return this.size - this.offset;
    }
    FEoF() {
        return this.size - this.offset;
    }
    remainB() {
        return (this.size * 8) - this.saveOffsetAbsBit();
    }
    FEoFB() {
        return (this.size * 8) - this.saveOffsetAbsBit();
    }
    align(number) {
        return align(this, number);
    }
    alignRev(number) {
        return alignRev(this, number);
    }
    skip(bytes, bits) {
        return skip(this, bytes, bits);
    }
    jump(bytes, bits) {
        this.skip(bytes, bits);
    }
    goto(byte, bit) {
        return goto(this, byte, bit);
    }
    FSeek(byte, bit) {
        return goto(this, byte, bit);
    }
    seek(bytes, bits) {
        return this.skip(bytes, bits);
    }
    pointer(byte, bit) {
        return this.goto(byte, bit);
    }
    warp(byte, bit) {
        return this.goto(byte, bit);
    }
    rewind() {
        this.offset = 0;
        this.bitoffset = 0;
    }
    gotoStart() {
        return this.rewind();
    }
    last() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    gotoEnd() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    EoF() {
        this.offset = this.size;
        this.bitoffset = 0;
    }
    tell() {
        return this.offset;
    }
    FTell() {
        return this.offset;
    }
    getOffset() {
        return this.tell();
    }
    saveOffset() {
        return this.tell();
    }
    tellB() {
        return this.bitoffset;
    }
    FTellB() {
        return this.tellB();
    }
    getOffsetBit() {
        return this.tellB();
    }
    saveOffsetAbsBit() {
        return (this.offset * 8) + this.bitoffset;
    }
    tellAbsB() {
        return this.saveOffsetAbsBit();
    }
    getOffsetAbsBit() {
        return this.saveOffsetAbsBit();
    }
    saveOffsetBit() {
        return this.saveOffsetAbsBit();
    }
    restrict() {
        this.strict = true;
    }
    unrestrict() {
        this.strict = false;
    }
    xor(xorKey, startOffset, endOffset, consume) {
        var XORKey = xorKey;
        if (typeof xorKey == "number") ;
        else if (typeof xorKey == "string") {
            xorKey = new TextEncoder().encode(xorKey);
        }
        else if (this.isBufferOrUint8Array(XORKey)) ;
        else {
            throw new Error("XOR must be a number, string, Uint8Array or Buffer");
        }
        return XOR(this, xorKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    xorThis(xorKey, length, consume) {
        var Length = length || 1;
        var XORKey = xorKey;
        if (typeof xorKey == "number") {
            Length = length || 1;
        }
        else if (typeof xorKey == "string") {
            const encoder = new TextEncoder().encode(xorKey);
            XORKey = encoder;
            Length = length || encoder.length;
        }
        else if (this.isBufferOrUint8Array(XORKey)) {
            Length = length || xorKey.length;
        }
        else {
            throw new Error("XOR must be a number, string, Uint8Array or Buffer");
        }
        return XOR(this, XORKey, this.offset, this.offset + Length, consume || false);
    }
    or(orKey, startOffset, endOffset, consume) {
        var ORKey = orKey;
        if (typeof orKey == "number") ;
        else if (typeof orKey == "string") {
            orKey = new TextEncoder().encode(orKey);
        }
        else if (this.isBufferOrUint8Array(ORKey)) ;
        else {
            throw new Error("OR must be a number, string, Uint8Array or Buffer");
        }
        return OR(this, orKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    orThis(orKey, length, consume) {
        var Length = length || 1;
        var ORKey = orKey;
        if (typeof orKey == "number") {
            Length = length || 1;
        }
        else if (typeof orKey == "string") {
            const encoder = new TextEncoder().encode(orKey);
            ORKey = encoder;
            Length = length || encoder.length;
        }
        else if (this.isBufferOrUint8Array(ORKey)) {
            Length = length || orKey.length;
        }
        else {
            throw new Error("OR must be a number, string, Uint8Array or Buffer");
        }
        return OR(this, ORKey, this.offset, this.offset + Length, consume || false);
    }
    and(andKey, startOffset, endOffset, consume) {
        var ANDKey = andKey;
        if (typeof ANDKey == "number") ;
        else if (typeof ANDKey == "string") {
            ANDKey = new TextEncoder().encode(ANDKey);
        }
        else if (typeof ANDKey == "object") ;
        else {
            throw new Error("AND must be a number, string, number array or Buffer");
        }
        return AND(this, andKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    andThis(andKey, length, consume) {
        var Length = length || 1;
        var ANDKey = andKey;
        if (typeof andKey == "number") {
            Length = length || 1;
        }
        else if (typeof andKey == "string") {
            const encoder = new TextEncoder().encode(andKey);
            ANDKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof andKey == "object") {
            Length = length || andKey.length;
        }
        else {
            throw new Error("AND must be a number, string, number array or Buffer");
        }
        return AND(this, ANDKey, this.offset, this.offset + Length, consume || false);
    }
    not(startOffset, endOffset, consume) {
        return NOT(this, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    notThis(length, consume) {
        return NOT(this, this.offset, this.offset + (length || 1), consume || false);
    }
    lShift(shiftKey, startOffset, endOffset, consume) {
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") ;
        else if (typeof lShiftKey == "string") {
            lShiftKey = new TextEncoder().encode(lShiftKey);
        }
        else if (typeof lShiftKey == "object") ;
        else {
            throw new Error("Left shift must be a number, string, number array or Buffer");
        }
        return LSHIFT(this, lShiftKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    lShiftThis(shiftKey, length, consume) {
        var Length = length || 1;
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") {
            Length = length || 1;
        }
        else if (typeof lShiftKey == "string") {
            const encoder = new TextEncoder().encode(lShiftKey);
            lShiftKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof lShiftKey == "object") {
            Length = length || lShiftKey.length;
        }
        else {
            throw new Error("Left shift must be a number, string, number array or Buffer");
        }
        return LSHIFT(this, shiftKey, this.offset, this.offset + Length, consume || false);
    }
    rShift(shiftKey, startOffset, endOffset, consume) {
        var rShiftKey = shiftKey;
        if (typeof rShiftKey == "number") ;
        else if (typeof rShiftKey == "string") {
            rShiftKey = new TextEncoder().encode(rShiftKey);
        }
        else if (typeof rShiftKey == "object") ;
        else {
            throw new Error("Right shift must be a number, string, number array or Buffer");
        }
        return RSHIFT(this, rShiftKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    rShiftThis(shiftKey, length, consume) {
        var Length = length || 1;
        var lShiftKey = shiftKey;
        if (typeof lShiftKey == "number") {
            Length = length || 1;
        }
        else if (typeof lShiftKey == "string") {
            const encoder = new TextEncoder().encode(lShiftKey);
            lShiftKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof lShiftKey == "object") {
            Length = length || lShiftKey.length;
        }
        else {
            throw new Error("Right shift must be a number, string, number array or Buffer");
        }
        return RSHIFT(this, lShiftKey, this.offset, this.offset + Length, consume || false);
    }
    add(addKey, startOffset, endOffset, consume) {
        var addedKey = addKey;
        if (typeof addedKey == "number") ;
        else if (typeof addedKey == "string") {
            addedKey = new TextEncoder().encode(addedKey);
        }
        else if (typeof addedKey == "object") ;
        else {
            throw new Error("Add key must be a number, string, number array or Buffer");
        }
        return ADD(this, addedKey, startOffset || this.offset, endOffset || this.size, consume || false);
    }
    addThis(addKey, length, consume) {
        var Length = length || 1;
        var AddedKey = addKey;
        if (typeof AddedKey == "number") {
            Length = length || 1;
        }
        else if (typeof AddedKey == "string") {
            const encoder = new TextEncoder().encode(AddedKey);
            AddedKey = encoder;
            Length = length || encoder.length;
        }
        else if (typeof AddedKey == "object") {
            Length = length || AddedKey.length;
        }
        else {
            throw new Error("Add key must be a number, string, number array or Buffer");
        }
        return ADD(this, AddedKey, this.offset, this.offset + Length, consume || false);
    }
    delete(startOffset, endOffset, consume) {
        return remove(this, startOffset || 0, endOffset || this.offset, consume || false, true);
    }
    clip() {
        return remove(this, this.offset, this.size, false, true);
    }
    trim() {
        return remove(this, this.offset, this.size, false, true);
    }
    crop(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, true);
    }
    drop(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, true);
    }
    lift(startOffset, endOffset, consume, fillValue) {
        return remove(this, startOffset || this.offset, endOffset || this.size, consume || false, false, fillValue);
    }
    fill(startOffset, endOffset, consume, fillValue) {
        return remove(this, startOffset || this.offset, endOffset || this.size, consume || false, false, fillValue);
    }
    extract(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    slice(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    wrap(length, consume) {
        return remove(this, this.offset, this.offset + (length || 0), consume || false, false);
    }
    insert(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, false);
    }
    place(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, false);
    }
    replace(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, true);
    }
    overwrite(data, consume, offset) {
        return addData(this, data, consume || false, offset || this.offset, true);
    }
    unshift(data, consume) {
        return addData(this, data, consume || false, 0, false);
    }
    prepend(data, consume) {
        return addData(this, data, consume || false, 0, false);
    }
    push(data, consume) {
        return addData(this, data, consume || false, this.size, false);
    }
    append(data, consume) {
        return addData(this, data, consume || false, this.size, false);
    }
    get() {
        return this.data;
    }
    return() {
        return this.data;
    }
    end() {
        this.data = undefined;
    }
    close() {
        this.data = undefined;
    }
    done() {
        this.data = undefined;
    }
    finished() {
        this.data = undefined;
    }
    hexdump(options) {
        return hexDump(this, options);
    }
    errorDumpOff() {
        this.errorDump = false;
    }
    errorDumpOn() {
        this.errorDump = true;
    }
    findString(string) {
        return fString(this, string);
    }
    findByte(value, unsigned, endian) {
        return fNumber(this, value, 8, unsigned == undefined ? true : unsigned, endian);
    }
    findShort(value, unsigned, endian) {
        return fNumber(this, value, 16, unsigned == undefined ? true : unsigned, endian);
    }
    findInt(value, unsigned, endian) {
        return fNumber(this, value, 32, unsigned == undefined ? true : unsigned, endian);
    }
    findHalfFloat(value, endian) {
        return fHalfFloat(this, value, endian);
    }
    findFloat(value, endian) {
        return fFloat(this, value, endian);
    }
    findInt64(value, unsigned, endian) {
        return fBigInt(this, value, unsigned == undefined ? true : unsigned, endian);
    }
    findDoubleFloat(value, endian) {
        return fDoubleFloat(this, value, endian);
    }
    writeBit(value, bits, unsigned, endian) {
        return wbit(this, value, bits, unsigned, endian);
    }
    readBit(bits, unsigned, endian) {
        return rbit(this, bits, unsigned, endian);
    }
    bit(value, bits, unsigned, endian) {
        return this.writeBit(value, bits, unsigned, endian);
    }
    ubit(value, bits, endian) {
        return this.writeBit(value, bits, true, endian);
    }
    writeUBitBE(value, bits) {
        return this.bit(value, bits, true, "big");
    }
    ubitbe(value, bits) {
        return this.bit(value, bits, true, "big");
    }
    writeBitBE(value, bits, unsigned) {
        return this.bit(value, bits, unsigned, "big");
    }
    bitbe(value, bits, unsigned) {
        return this.bit(value, bits, unsigned, "big");
    }
    writeUBitLE(value, bits) {
        return this.bit(value, bits, true, "little");
    }
    ubitle(value, bits) {
        return this.bit(value, bits, true, "little");
    }
    writeBitLE(value, bits, unsigned) {
        return this.bit(value, bits, unsigned, "little");
    }
    bitle(value, bits, unsigned) {
        return this.bit(value, bits, unsigned, "little");
    }
    bit1(value, unsigned, endian) {
        return this.bit(value, 1, unsigned, endian);
    }
    bit1le(value, unsigned) {
        return this.bit(value, 1, unsigned, "little");
    }
    bit1be(value, unsigned) {
        return this.bit(value, 1, unsigned, "big");
    }
    ubit1(value, endian) {
        return this.bit(value, 1, true, endian);
    }
    ubit1le(value) {
        return this.bit(value, 1, true, "little");
    }
    ubit1be(value) {
        return this.bit(value, 1, true, "big");
    }
    bit2(value, unsigned, endian) {
        return this.bit(value, 2, unsigned, endian);
    }
    bit2le(value, unsigned) {
        return this.bit(value, 2, unsigned, "little");
    }
    bit2be(value, unsigned) {
        return this.bit(value, 2, unsigned, "big");
    }
    ubit2(value, endian) {
        return this.bit(value, 2, true, endian);
    }
    ubit2le(value) {
        return this.bit(value, 2, true, "little");
    }
    ubit2be(value) {
        return this.bit(value, 2, true, "big");
    }
    bit3(value, unsigned, endian) {
        return this.bit(value, 3, unsigned, endian);
    }
    bit3le(value, unsigned) {
        return this.bit(value, 3, unsigned, "little");
    }
    bit3be(value, unsigned) {
        return this.bit(value, 3, unsigned, "big");
    }
    ubit3(value, endian) {
        return this.bit(value, 3, true, endian);
    }
    ubit3le(value) {
        return this.bit(value, 3, true, "little");
    }
    ubit3be(value) {
        return this.bit(value, 3, true, "big");
    }
    bit4(value, unsigned, endian) {
        return this.bit(value, 4, unsigned, endian);
    }
    bit4le(value, unsigned) {
        return this.bit(value, 4, unsigned, "little");
    }
    bit4be(value, unsigned) {
        return this.bit(value, 4, unsigned, "big");
    }
    ubit4(value, endian) {
        return this.bit(value, 4, true, endian);
    }
    ubit4le(value) {
        return this.bit(value, 4, true, "little");
    }
    ubit4be(value) {
        return this.bit(value, 4, true, "big");
    }
    bit5(value, unsigned, endian) {
        return this.bit(value, 5, unsigned, endian);
    }
    bit5le(value, unsigned) {
        return this.bit(value, 5, unsigned, "little");
    }
    bit5be(value, unsigned) {
        return this.bit(value, 5, unsigned, "big");
    }
    ubit5(value, endian) {
        return this.bit(value, 5, true, endian);
    }
    ubit5le(value) {
        return this.bit(value, 5, true, "little");
    }
    ubit5be(value) {
        return this.bit(value, 5, true, "big");
    }
    bit6(value, unsigned, endian) {
        return this.bit(value, 6, unsigned, endian);
    }
    bit6le(value, unsigned) {
        return this.bit(value, 6, unsigned, "little");
    }
    bit6be(value, unsigned) {
        return this.bit(value, 6, unsigned, "big");
    }
    ubit6(value, endian) {
        return this.bit(value, 6, true, endian);
    }
    ubit6le(value) {
        return this.bit(value, 6, true, "little");
    }
    ubit6be(value) {
        return this.bit(value, 6, true, "big");
    }
    bit7(value, unsigned, endian) {
        return this.bit(value, 7, unsigned, endian);
    }
    bit7le(value, unsigned) {
        return this.bit(value, 7, unsigned, "little");
    }
    bit7be(value, unsigned) {
        return this.bit(value, 7, unsigned, "big");
    }
    ubit7(value, endian) {
        return this.bit(value, 7, true, endian);
    }
    ubit7le(value) {
        return this.bit(value, 7, true, "little");
    }
    ubit7be(value) {
        return this.bit(value, 7, true, "big");
    }
    bit8(value, unsigned, endian) {
        return this.bit(value, 8, unsigned, endian);
    }
    bit8le(value, unsigned) {
        return this.bit(value, 8, unsigned, "little");
    }
    bit8be(value, unsigned) {
        return this.bit(value, 8, unsigned, "big");
    }
    ubit8(value, endian) {
        return this.bit(value, 8, true, endian);
    }
    ubit8le(value) {
        return this.bit(value, 8, true, "little");
    }
    ubit8be(value) {
        return this.bit(value, 8, true, "big");
    }
    bit9(value, unsigned, endian) {
        return this.bit(value, 9, unsigned, endian);
    }
    bit9le(value, unsigned) {
        return this.bit(value, 9, unsigned, "little");
    }
    bit9be(value, unsigned) {
        return this.bit(value, 9, unsigned, "big");
    }
    ubit9(value, endian) {
        return this.bit(value, 9, true, endian);
    }
    ubit9le(value) {
        return this.bit(value, 9, true, "little");
    }
    ubit9be(value) {
        return this.bit(value, 9, true, "big");
    }
    bit10(value, unsigned, endian) {
        return this.bit(value, 10, unsigned, endian);
    }
    bit10le(value, unsigned) {
        return this.bit(value, 10, unsigned, "little");
    }
    bit10be(value, unsigned) {
        return this.bit(value, 10, unsigned, "big");
    }
    ubit10(value, endian) {
        return this.bit(value, 10, true, endian);
    }
    ubit10le(value) {
        return this.bit(value, 10, true, "little");
    }
    ubit10be(value) {
        return this.bit(value, 10, true, "big");
    }
    bit11(value, unsigned, endian) {
        return this.bit(value, 11, unsigned, endian);
    }
    bit11le(value, unsigned) {
        return this.bit(value, 11, unsigned, "little");
    }
    bit11be(value, unsigned) {
        return this.bit(value, 11, unsigned, "big");
    }
    ubit11(value, endian) {
        return this.bit(value, 11, true, endian);
    }
    ubit11le(value) {
        return this.bit(value, 11, true, "little");
    }
    ubit11be(value) {
        return this.bit(value, 11, true, "big");
    }
    bit12(value, unsigned, endian) {
        return this.bit(value, 12, unsigned, endian);
    }
    bit12le(value, unsigned) {
        return this.bit(value, 12, unsigned, "little");
    }
    bit12be(value, unsigned) {
        return this.bit(value, 12, unsigned, "big");
    }
    ubit12(value, endian) {
        return this.bit(value, 12, true, endian);
    }
    ubit12le(value) {
        return this.bit(value, 12, true, "little");
    }
    ubit12be(value) {
        return this.bit(value, 12, true, "big");
    }
    bit13(value, unsigned, endian) {
        return this.bit(value, 13, unsigned, endian);
    }
    bit13le(value, unsigned) {
        return this.bit(value, 13, unsigned, "little");
    }
    bit13be(value, unsigned) {
        return this.bit(value, 13, unsigned, "big");
    }
    ubit13(value, endian) {
        return this.bit(value, 13, true, endian);
    }
    ubit13le(value) {
        return this.bit(value, 13, true, "little");
    }
    ubit13be(value) {
        return this.bit(value, 13, true, "big");
    }
    bit14(value, unsigned, endian) {
        return this.bit(value, 14, unsigned, endian);
    }
    bit14le(value, unsigned) {
        return this.bit(value, 14, unsigned, "little");
    }
    bit14be(value, unsigned) {
        return this.bit(value, 14, unsigned, "big");
    }
    ubit14(value, endian) {
        return this.bit(value, 14, true, endian);
    }
    ubit14le(value) {
        return this.bit(value, 14, true, "little");
    }
    ubit14be(value) {
        return this.bit(value, 14, true, "big");
    }
    bit15(value, unsigned, endian) {
        return this.bit(value, 15, unsigned, endian);
    }
    bit15le(value, unsigned) {
        return this.bit(value, 15, unsigned, "little");
    }
    bit15be(value, unsigned) {
        return this.bit(value, 15, unsigned, "big");
    }
    ubit15(value, endian) {
        return this.bit(value, 15, true, endian);
    }
    ubit15le(value) {
        return this.bit(value, 15, true, "little");
    }
    ubit15be(value) {
        return this.bit(value, 15, true, "big");
    }
    bit16(value, unsigned, endian) {
        return this.bit(value, 16, unsigned, endian);
    }
    bit16le(value, unsigned) {
        return this.bit(value, 16, unsigned, "little");
    }
    bit16be(value, unsigned) {
        return this.bit(value, 16, unsigned, "big");
    }
    ubit16(value, endian) {
        return this.bit(value, 16, true, endian);
    }
    ubit16le(value) {
        return this.bit(value, 16, true, "little");
    }
    ubit16be(value) {
        return this.bit(value, 16, true, "big");
    }
    bit17(value, unsigned, endian) {
        return this.bit(value, 17, unsigned, endian);
    }
    bit17le(value, unsigned) {
        return this.bit(value, 17, unsigned, "little");
    }
    bit17be(value, unsigned) {
        return this.bit(value, 17, unsigned, "big");
    }
    ubit17(value, endian) {
        return this.bit(value, 17, true, endian);
    }
    ubit17le(value) {
        return this.bit(value, 17, true, "little");
    }
    ubit17be(value) {
        return this.bit(value, 17, true, "big");
    }
    bit18(value, unsigned, endian) {
        return this.bit(value, 18, unsigned, endian);
    }
    bit18le(value, unsigned) {
        return this.bit(value, 18, unsigned, "little");
    }
    bit18be(value, unsigned) {
        return this.bit(value, 18, unsigned, "big");
    }
    ubit18(value, endian) {
        return this.bit(value, 18, true, endian);
    }
    ubit18le(value) {
        return this.bit(value, 18, true, "little");
    }
    ubit18be(value) {
        return this.bit(value, 18, true, "big");
    }
    bit19(value, unsigned, endian) {
        return this.bit(value, 19, unsigned, endian);
    }
    bit19le(value, unsigned) {
        return this.bit(value, 19, unsigned, "little");
    }
    bit19be(value, unsigned) {
        return this.bit(value, 19, unsigned, "big");
    }
    ubit19(value, endian) {
        return this.bit(value, 19, true, endian);
    }
    ubit19le(value) {
        return this.bit(value, 19, true, "little");
    }
    ubit19be(value) {
        return this.bit(value, 19, true, "big");
    }
    bit20(value, unsigned, endian) {
        return this.bit(value, 20, unsigned, endian);
    }
    bit20le(value, unsigned) {
        return this.bit(value, 20, unsigned, "little");
    }
    bit20be(value, unsigned) {
        return this.bit(value, 20, unsigned, "big");
    }
    ubit20(value, endian) {
        return this.bit(value, 20, true, endian);
    }
    ubit20le(value) {
        return this.bit(value, 20, true, "little");
    }
    ubit20be(value) {
        return this.bit(value, 20, true, "big");
    }
    bit21(value, unsigned, endian) {
        return this.bit(value, 21, unsigned, endian);
    }
    bit21le(value, unsigned) {
        return this.bit(value, 21, unsigned, "little");
    }
    bit21be(value, unsigned) {
        return this.bit(value, 21, unsigned, "big");
    }
    ubit21(value, endian) {
        return this.bit(value, 21, true, endian);
    }
    ubit21le(value) {
        return this.bit(value, 21, true, "little");
    }
    ubit21be(value) {
        return this.bit(value, 21, true, "big");
    }
    bit22(value, unsigned, endian) {
        return this.bit(value, 22, unsigned, endian);
    }
    bit22le(value, unsigned) {
        return this.bit(value, 22, unsigned, "little");
    }
    bit22be(value, unsigned) {
        return this.bit(value, 22, unsigned, "big");
    }
    ubit22(value, endian) {
        return this.bit(value, 22, true, endian);
    }
    ubit22le(value) {
        return this.bit(value, 22, true, "little");
    }
    ubit22be(value) {
        return this.bit(value, 22, true, "big");
    }
    bit23(value, unsigned, endian) {
        return this.bit(value, 23, unsigned, endian);
    }
    bit23le(value, unsigned) {
        return this.bit(value, 23, unsigned, "little");
    }
    bit23be(value, unsigned) {
        return this.bit(value, 23, unsigned, "big");
    }
    ubit23(value, endian) {
        return this.bit(value, 23, true, endian);
    }
    ubit23le(value) {
        return this.bit(value, 23, true, "little");
    }
    ubit23be(value) {
        return this.bit(value, 23, true, "big");
    }
    bit24(value, unsigned, endian) {
        return this.bit(value, 24, unsigned, endian);
    }
    bit24le(value, unsigned) {
        return this.bit(value, 24, unsigned, "little");
    }
    bit24be(value, unsigned) {
        return this.bit(value, 24, unsigned, "big");
    }
    ubit24(value, endian) {
        return this.bit(value, 24, true, endian);
    }
    ubit24le(value) {
        return this.bit(value, 24, true, "little");
    }
    ubit24be(value) {
        return this.bit(value, 24, true, "big");
    }
    bit25(value, unsigned, endian) {
        return this.bit(value, 25, unsigned, endian);
    }
    bit25le(value, unsigned) {
        return this.bit(value, 25, unsigned, "little");
    }
    bit25be(value, unsigned) {
        return this.bit(value, 25, unsigned, "big");
    }
    ubit25(value, endian) {
        return this.bit(value, 25, true, endian);
    }
    ubit25le(value) {
        return this.bit(value, 25, true, "little");
    }
    ubit25be(value) {
        return this.bit(value, 25, true, "big");
    }
    bit26(value, unsigned, endian) {
        return this.bit(value, 26, unsigned, endian);
    }
    bit26le(value, unsigned) {
        return this.bit(value, 26, unsigned, "little");
    }
    bit26be(value, unsigned) {
        return this.bit(value, 26, unsigned, "big");
    }
    ubit26(value, endian) {
        return this.bit(value, 26, true, endian);
    }
    ubit26le(value) {
        return this.bit(value, 26, true, "little");
    }
    ubit26be(value) {
        return this.bit(value, 26, true, "big");
    }
    bit27(value, unsigned, endian) {
        return this.bit(value, 27, unsigned, endian);
    }
    bit27le(value, unsigned) {
        return this.bit(value, 27, unsigned, "little");
    }
    bit27be(value, unsigned) {
        return this.bit(value, 27, unsigned, "big");
    }
    ubit27(value, endian) {
        return this.bit(value, 27, true, endian);
    }
    ubit27le(value) {
        return this.bit(value, 27, true, "little");
    }
    ubit27be(value) {
        return this.bit(value, 27, true, "big");
    }
    bit28(value, unsigned, endian) {
        return this.bit(value, 28, unsigned, endian);
    }
    bit28le(value, unsigned) {
        return this.bit(value, 28, unsigned, "little");
    }
    bit28be(value, unsigned) {
        return this.bit(value, 28, unsigned, "big");
    }
    ubit28(value, endian) {
        return this.bit(value, 28, true, endian);
    }
    ubit28le(value) {
        return this.bit(value, 28, true, "little");
    }
    ubit28be(value) {
        return this.bit(value, 28, true, "big");
    }
    bit29(value, unsigned, endian) {
        return this.bit(value, 29, unsigned, endian);
    }
    bit29le(value, unsigned) {
        return this.bit(value, 29, unsigned, "little");
    }
    bit29be(value, unsigned) {
        return this.bit(value, 29, unsigned, "big");
    }
    ubit29(value, endian) {
        return this.bit(value, 29, true, endian);
    }
    ubit29le(value) {
        return this.bit(value, 29, true, "little");
    }
    ubit29be(value) {
        return this.bit(value, 29, true, "big");
    }
    bit30(value, unsigned, endian) {
        return this.bit(value, 30, unsigned, endian);
    }
    bit30le(value, unsigned) {
        return this.bit(value, 30, unsigned, "little");
    }
    bit30be(value, unsigned) {
        return this.bit(value, 30, unsigned, "big");
    }
    ubit30(value, endian) {
        return this.bit(value, 30, true, endian);
    }
    ubit30le(value) {
        return this.bit(value, 30, true, "little");
    }
    ubit30be(value) {
        return this.bit(value, 30, true, "big");
    }
    bit31(value, unsigned, endian) {
        return this.bit(value, 31, unsigned, endian);
    }
    bit31le(value, unsigned) {
        return this.bit(value, 31, unsigned, "little");
    }
    bit31be(value, unsigned) {
        return this.bit(value, 31, unsigned, "big");
    }
    ubit31(value, endian) {
        return this.bit(value, 31, true, endian);
    }
    ubit31le(value) {
        return this.bit(value, 31, true, "little");
    }
    ubit31be(value) {
        return this.bit(value, 31, true, "big");
    }
    bit32(value, unsigned, endian) {
        return this.bit(value, 32, unsigned, endian);
    }
    bit32le(value, unsigned) {
        return this.bit(value, 32, unsigned, "little");
    }
    bit32be(value, unsigned) {
        return this.bit(value, 32, unsigned, "big");
    }
    ubit32(value, endian) {
        return this.bit(value, 32, true, endian);
    }
    ubit32le(value) {
        return this.bit(value, 32, true, "little");
    }
    ubit32be(value) {
        return this.bit(value, 32, true, "big");
    }
    writeByte(value, unsigned) {
        return wbyte(this, value, unsigned);
    }
    readByte(unsigned) {
        return rbyte(this, unsigned);
    }
    readUByte() {
        return rbyte(this, true);
    }
    byte(value, unsigned) {
        return this.writeByte(value, unsigned);
    }
    int8(value, unsigned) {
        return this.writeByte(value, unsigned);
    }
    writeUByte(value) {
        return this.writeByte(value, true);
    }
    uint8(value) {
        return this.writeByte(value, true);
    }
    ubyte(value) {
        return this.writeByte(value, true);
    }
    writeInt16(value, unsigned, endian) {
        return wint16(this, value, unsigned, endian);
    }
    readInt16(unsigned, endian) {
        return rint16(this, unsigned, endian);
    }
    int16(value, unsigned, endian) {
        return this.writeInt16(value, unsigned, endian);
    }
    short(value, unsigned, endian) {
        return this.writeInt16(value, unsigned, endian);
    }
    word(value, unsigned, endian) {
        return this.writeInt16(value, unsigned, endian);
    }
    writeUInt16(value, endian) {
        return this.writeInt16(value, true, endian);
    }
    uint16(value, endian) {
        return this.writeInt16(value, true, endian);
    }
    ushort(value, endian) {
        return this.writeInt16(value, true, endian);
    }
    uword(value, endian) {
        return this.writeInt16(value, true, endian);
    }
    writeInt16BE(value) {
        return this.writeInt16(value, false, "big");
    }
    int16be(value) {
        return this.writeInt16(value, false, "big");
    }
    shortbe(value) {
        return this.writeInt16(value, false, "big");
    }
    wordbe(value) {
        return this.writeInt16(value, false, "big");
    }
    writeUInt16BE(value) {
        return this.writeInt16(value, true, "big");
    }
    uint16be(value) {
        return this.writeInt16(value, true, "big");
    }
    ushortbe(value) {
        return this.writeInt16(value, true, "big");
    }
    uwordbe(value) {
        return this.writeInt16(value, true, "big");
    }
    writeInt16LE(value) {
        return this.writeInt16(value, false, "little");
    }
    int16le(value) {
        return this.writeInt16(value, false, "little");
    }
    shortle(value) {
        return this.writeInt16(value, false, "little");
    }
    wordle(value) {
        return this.writeInt16(value, false, "little");
    }
    writeUInt16LE(value) {
        return this.writeInt16(value, true, "little");
    }
    uint16le(value) {
        return this.writeInt16(value, true, "little");
    }
    ushortle(value) {
        return this.writeInt16(value, true, "little");
    }
    uwordle(value) {
        return this.writeInt16(value, true, "little");
    }
    writeHalfFloat(value, endian) {
        return whalffloat(this, value);
    }
    readHalfFloat(endian) {
        return rhalffloat(this, endian);
    }
    half(value, endian) {
        return this.writeHalfFloat(value, endian);
    }
    halffloat(value, endian) {
        return this.writeHalfFloat(value, endian);
    }
    writeHalfFloatBE(value) {
        return this.writeHalfFloat(value, "big");
    }
    halffloatbe(value) {
        return this.writeHalfFloat(value, "big");
    }
    halfbe(value) {
        return this.writeHalfFloat(value, "big");
    }
    writeHalfFloatLE(value) {
        return this.writeHalfFloat(value, "little");
    }
    halffloatle(value) {
        return this.writeHalfFloat(value, "little");
    }
    halfle(value) {
        return this.writeHalfFloat(value, "little");
    }
    writeInt32(value, unsigned, endian) {
        return wint32(this, value, unsigned);
    }
    readInt32(unsigned, endian) {
        return rint32(this, unsigned, endian);
    }
    int(value, unsigned, endian) {
        return this.writeInt32(value, unsigned, endian);
    }
    int32(value, unsigned, endian) {
        return this.writeInt32(value, unsigned, endian);
    }
    double(value, unsigned, endian) {
        return this.writeInt32(value, unsigned, endian);
    }
    long(value, unsigned, endian) {
        return this.writeInt32(value, unsigned, endian);
    }
    writeUInt32(value, endian) {
        return this.writeInt32(value, true, endian);
    }
    uint32(value, endian) {
        return this.writeInt32(value, true, endian);
    }
    uint(value, endian) {
        return this.writeInt32(value, true, endian);
    }
    udouble(value, endian) {
        return this.writeInt32(value, true, endian);
    }
    ulong(value, endian) {
        return this.writeInt32(value, true, endian);
    }
    writeInt32LE(value) {
        return this.writeInt32(value, false, "little");
    }
    int32le(value) {
        return this.writeInt32(value, false, "little");
    }
    intle(value) {
        return this.writeInt32(value, false, "little");
    }
    doublele(value) {
        return this.writeInt32(value, false, "little");
    }
    longle(value) {
        return this.writeInt32(value, false, "little");
    }
    writeUInt32LE(value) {
        return this.writeInt32(value, true, "little");
    }
    uint32le(value) {
        return this.writeInt32(value, true, "little");
    }
    uintle(value) {
        return this.writeInt32(value, true, "little");
    }
    udoublele(value) {
        return this.writeInt32(value, true, "little");
    }
    ulongle(value) {
        return this.writeInt32(value, true, "little");
    }
    writeInt32BE(value) {
        return this.writeInt32(value, false, "big");
    }
    intbe(value) {
        return this.writeInt32(value, false, "big");
    }
    int32be(value) {
        return this.writeInt32(value, false, "big");
    }
    doublebe(value) {
        return this.writeInt32(value, false, "big");
    }
    longbe(value) {
        return this.writeInt32(value, false, "big");
    }
    writeUInt32BE(value) {
        return this.writeInt32(value, true, "big");
    }
    uint32be(value) {
        return this.writeInt32(value, true, "big");
    }
    uintbe(value) {
        return this.writeInt32(value, true, "big");
    }
    udoublebe(value) {
        return this.writeInt32(value, true, "big");
    }
    ulongbe(value) {
        return this.writeInt32(value, true, "big");
    }
    writeFloat(value, endian) {
        return wfloat(this, value);
    }
    readFloat(endian) {
        return rfloat(this, endian);
    }
    float(value, endian) {
        return this.writeFloat(value, endian);
    }
    writeFloatLE(value) {
        return this.writeFloat(value, "little");
    }
    floatle(value) {
        return this.writeFloat(value, "little");
    }
    writeFloatBE(value) {
        return this.writeFloat(value, "big");
    }
    floatbe(value) {
        return this.writeFloat(value, "big");
    }
    writeInt64(value, unsigned, endian) {
        return wint64(this, value, unsigned);
    }
    readInt64(unsigned, endian) {
        return rint64(this, unsigned, endian);
    }
    int64(value, unsigned, endian) {
        return this.writeInt64(value, unsigned, endian);
    }
    quad(value, unsigned, endian) {
        return this.writeInt64(value, unsigned, endian);
    }
    bigint(value, unsigned, endian) {
        return this.writeInt64(value, unsigned, endian);
    }
    writeUInt64(value, endian) {
        return this.writeInt64(value, true, endian);
    }
    uint64(value, endian) {
        return this.writeInt64(value, true, endian);
    }
    ubigint(value, endian) {
        return this.writeInt64(value, true, endian);
    }
    uquad(value, endian) {
        return this.writeInt64(value, true, endian);
    }
    writeInt64LE(value) {
        return this.writeInt64(value, false, "little");
    }
    int64le(value) {
        return this.writeInt64(value, false, "little");
    }
    bigintle(value) {
        return this.writeInt64(value, false, "little");
    }
    quadle(value) {
        return this.writeInt64(value, false, "little");
    }
    writeUInt64LE(value) {
        return this.writeInt64(value, true, "little");
    }
    uint64le(value) {
        return this.writeInt64(value, true, "little");
    }
    ubigintle(value) {
        return this.writeInt64(value, true, "little");
    }
    uquadle(value) {
        return this.writeInt64(value, true, "little");
    }
    writeInt64BE(value) {
        return this.writeInt64(value, false, "big");
    }
    int64be(value) {
        return this.writeInt64(value, false, "big");
    }
    bigintbe(value) {
        return this.writeInt64(value, false, "big");
    }
    quadbe(value) {
        return this.writeInt64(value, false, "big");
    }
    writeUInt64BE(value) {
        return this.writeInt64(value, true, "big");
    }
    uint64be(value) {
        return this.writeInt64(value, true, "big");
    }
    ubigintbe(value) {
        return this.writeInt64(value, true, "big");
    }
    uquadbe(value) {
        return this.writeInt64(value, true, "big");
    }
    writeDoubleFloat(value, endian) {
        return wdfloat(this, value);
    }
    readDoubleFloat(endian) {
        return rdfloat(this, endian);
    }
    doublefloat(value, endian) {
        return this.writeDoubleFloat(value, endian);
    }
    dfloat(value, endian) {
        return this.writeDoubleFloat(value, endian);
    }
    writeDoubleFloatBE(value) {
        return this.writeDoubleFloat(value, "big");
    }
    dfloatbe(value) {
        return this.writeDoubleFloat(value, "big");
    }
    doublefloatbe(value) {
        return this.writeDoubleFloat(value, "big");
    }
    writeDoubleFloatLE(value) {
        return this.writeDoubleFloat(value, "little");
    }
    dfloatle(value) {
        return this.writeDoubleFloat(value, "little");
    }
    doublefloatle(value) {
        return this.writeDoubleFloat(value, "little");
    }
    writeString(string, options) {
        return wstring(this, string, options);
    }
    readString(options) {
        return rstring(this, options);
    }
    string(string, options) {
        return this.writeString(string, options);
    }
    utf8string(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-8", encoding: "utf-8", length: length, terminateValue: terminateValue });
    }
    cstring(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-8", encoding: "utf-8", length: length, terminateValue: terminateValue });
    }
    ansistring(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-8", encoding: "windows-1252", length: length, terminateValue: terminateValue });
    }
    utf16string(string, length, terminateValue, endian) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: endian });
    }
    unistring(string, length, terminateValue, endian) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: endian });
    }
    utf16stringle(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "little" });
    }
    unistringle(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "little" });
    }
    utf16stringbe(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "big" });
    }
    unistringbe(string, length, terminateValue) {
        return this.string(string, { stringType: "utf-16", encoding: "utf-16", length: length, terminateValue: terminateValue, endian: "big" });
    }
    pstring(string, lengthWriteSize, endian) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: lengthWriteSize, endian: endian });
    }
    pstring1(string, endian) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 1, endian: endian });
    }
    pstring1le(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 1, endian: "little" });
    }
    pstring1be(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 1, endian: "big" });
    }
    pstring2(string, endian) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 2, endian: endian });
    }
    pstring2le(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 2, endian: "little" });
    }
    pstring2be(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 2, endian: "big" });
    }
    pstring4(string, endian) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 4, endian: endian });
    }
    pstring4be(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 4, endian: "big" });
    }
    pstring4le(string) {
        return this.string(string, { stringType: "pascal", encoding: "utf-8", lengthWriteSize: 4, endian: "little" });
    }
    wpstring(string, lengthWriteSize, endian) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: lengthWriteSize, endian: endian });
    }
    wpstringbe(string, lengthWriteSize) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: lengthWriteSize, endian: "big" });
    }
    wpstringle(string, lengthWriteSize) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: lengthWriteSize, endian: "little" });
    }
    wpstring1(string, endian) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 1, endian: endian });
    }
    wpstring1be(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 1, endian: "big" });
    }
    wpstring1le(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 1, endian: "little" });
    }
    wpstring2(string, endian) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 2, endian: endian });
    }
    wpstring2le(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 2, endian: "little" });
    }
    wpstring2be(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 2, endian: "big" });
    }
    wpstring4(string, endian) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 4, endian: endian });
    }
    wpstring4le(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 4, endian: "little" });
    }
    wpstring4be(string) {
        return this.string(string, { stringType: "wide-pascal", encoding: "utf-16", lengthWriteSize: 4, endian: "big" });
    }
}

function color$1(r, g, b, a) {
    return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;
}
const S_BPTC_A2$1 = new Uint32Array([
    15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 8, 2, 2, 8, 8, 15, 2, 8,
    2, 2, 8, 8, 2, 2, 15, 15, 6, 8, 2, 8, 15, 15, 2, 8, 2, 2, 2, 15, 15, 6, 6, 2, 6, 8, 15, 15, 2,
    2, 15, 15, 15, 15, 15, 2, 2, 15,
]);
const S_BPTC_FACTORS$1 = [
    new Uint8Array([0, 21, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 9, 18, 27, 37, 46, 55, 64, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64]),
];
const S_BPTC_P2$1 = new Uint32Array([
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
const S_BC6H_MODE_INFO = [
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 10,
        delta_bits: new Uint32Array([5, 5, 5]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 7,
        delta_bits: new Uint32Array([6, 6, 6]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([5, 4, 4]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 10,
        delta_bits: new Uint32Array([10, 10, 10]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([4, 5, 4]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([9, 9, 9]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([4, 4, 5]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 12,
        delta_bits: new Uint32Array([8, 8, 8]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 9,
        delta_bits: new Uint32Array([5, 5, 5]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 16,
        delta_bits: new Uint32Array([4, 4, 4]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([6, 5, 5]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([5, 6, 5]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([5, 5, 6]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 5,
        endpoint_bits: 6,
        delta_bits: new Uint32Array([6, 6, 6]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
];
function unquantize(value, _signed, _endpoint_bits) {
    var _value = value;
    let max_value = 1 << (_endpoint_bits - 1);
    if (_signed) {
        if (_endpoint_bits >= 16) {
            return _value;
        }
        var sign = (_value & 0x8000) != 0;
        _value = _value & 0x7fff;
        let unq;
        if (0 == _value) {
            unq = 0;
        }
        else if (_value >= max_value - 1) {
            unq = 0x7fff;
        }
        else {
            unq = ((((_value) << 15) + 0x4000) >> (_endpoint_bits - 1));
        }
        return sign ? 65535 - unq + 1 : unq;
    }
    if (_endpoint_bits >= 15) {
        return _value;
    }
    if (0 == _value) {
        return 0;
    }
    if (_value == max_value) {
        return 65535;
    }
    return ((((_value) << 15) + 0x4000) >> (_endpoint_bits - 1));
}
function finish_unquantize(_value, _signed) {
    if (_signed) {
        let sign = _value & 0x8000;
        return (((_value & 0x7fff) * 31) >> 5) | sign;
    }
    else {
        return ((_value * 31) >> 6);
    }
}
function sign_extend(_value, _num_bits) {
    const mask = 1 << (_num_bits - 1);
    const xoredValue = _value ^ mask;
    return xoredValue - mask;
}
function f32_to_u8(f) {
    const n = (f * 255);
    return n <= 0 ? 0 : n >= 255 ? 255 : Math.floor(n);
}
function fp16_ieee_to_fp32_value(h) {
    const uint16Value = h;
    const sign = (uint16Value & 0x8000) >> 15;
    const exponent = (uint16Value & 0x7C00) >> 10;
    const fraction = uint16Value & 0x03FF;
    let floatValue;
    if (exponent === 0) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? 0 : -0;
        }
        else {
            floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 0x0400);
        }
    }
    else if (exponent === 0x1F) {
        if (fraction === 0) {
            floatValue = (sign === 0) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        else {
            floatValue = Number.NaN;
        }
    }
    else {
        floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
    }
    return floatValue;
}
function f16_to_u8(h) {
    return f32_to_u8(fp16_ieee_to_fp32_value(h));
}
function decode_bc6_block(data, outbuf, signed) {
    let bit = new bireader(data);
    let mode = bit.ubit(2);
    let ep_r = new Uint16Array(4);
    let ep_g = new Uint16Array(4);
    let ep_b = new Uint16Array(4);
    if ((mode & 2) != 0) {
        mode |= (bit.ubit(3) << 2);
        if (0 == S_BC6H_MODE_INFO[mode].endpoint_bits) {
            for (let i = 0; i < 16; i++) {
                outbuf[i] = 0;
            }
            return;
        }
        switch (mode) {
            case 2:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(5);
                ep_r[0] |= bit.ubit(1) << 10;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(4);
                ep_g[0] |= bit.ubit(1) << 10;
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(4);
                ep_b[0] |= bit.ubit(1) << 10;
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 3:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(10);
                ep_g[1] |= bit.ubit(10);
                ep_b[1] |= bit.ubit(10);
                break;
            case 6:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(4);
                ep_r[0] |= bit.ubit(1) << 10;
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(5);
                ep_g[0] |= bit.ubit(1) << 10;
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(4);
                ep_b[0] |= bit.ubit(1) << 10;
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(4);
                ep_b[3] |= bit.ubit(1);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(4);
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 7:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(9);
                ep_r[0] |= bit.ubit(1) << 10;
                ep_g[1] |= bit.ubit(9);
                ep_g[0] |= bit.ubit(1) << 10;
                ep_b[1] |= bit.ubit(9);
                ep_b[0] |= bit.ubit(1) << 10;
                break;
            case 10:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(4);
                ep_r[0] |= bit.ubit(1) << 10;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(4);
                ep_g[0] |= bit.ubit(1) << 10;
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(5);
                ep_b[0] |= bit.ubit(1) << 10;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(4);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(4);
                ep_b[3] |= bit.ubit(1) << 4;
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 11:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(8);
                ep_r[0] |= bit.ubit(1) << 11;
                ep_r[0] |= bit.ubit(1) << 10;
                ep_g[1] |= bit.ubit(8);
                ep_g[0] |= bit.ubit(1) << 11;
                ep_g[0] |= bit.ubit(1) << 10;
                ep_b[1] |= bit.ubit(8);
                ep_b[0] |= bit.ubit(1) << 11;
                ep_b[0] |= bit.ubit(1) << 10;
                break;
            case 14:
                ep_r[0] |= bit.ubit(9);
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(9);
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(9);
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(5);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 15:
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(4);
                ep_r[0] |= bit.ubit(1) << 15;
                ep_r[0] |= bit.ubit(1) << 14;
                ep_r[0] |= bit.ubit(1) << 13;
                ep_r[0] |= bit.ubit(1) << 12;
                ep_r[0] |= bit.ubit(1) << 11;
                ep_r[0] |= bit.ubit(1) << 10;
                ep_g[1] |= bit.ubit(4);
                ep_g[0] |= bit.ubit(1) << 15;
                ep_g[0] |= bit.ubit(1) << 14;
                ep_g[0] |= bit.ubit(1) << 13;
                ep_g[0] |= bit.ubit(1) << 12;
                ep_g[0] |= bit.ubit(1) << 11;
                ep_g[0] |= bit.ubit(1) << 10;
                ep_b[1] |= bit.ubit(4);
                ep_b[0] |= bit.ubit(1) << 15;
                ep_b[0] |= bit.ubit(1) << 14;
                ep_b[0] |= bit.ubit(1) << 13;
                ep_b[0] |= bit.ubit(1) << 12;
                ep_b[0] |= bit.ubit(1) << 11;
                ep_b[0] |= bit.ubit(1) << 10;
                break;
            case 18:
                ep_r[0] |= bit.ubit(8);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(8);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(8);
                ep_b[3] |= bit.ubit(1) << 3;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(6);
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(6);
                ep_r[3] |= bit.ubit(6);
                break;
            case 22:
                ep_r[0] |= bit.ubit(8);
                ep_b[3] |= bit.ubit(1);
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(8);
                ep_g[2] |= bit.ubit(1) << 5;
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(8);
                ep_g[3] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(5);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(6);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 26:
                ep_r[0] |= bit.ubit(8);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(8);
                ep_b[2] |= bit.ubit(1) << 5;
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(8);
                ep_b[3] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(5);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(6);
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 30:
                ep_r[0] |= bit.ubit(6);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_b[3] |= bit.ubit(1);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(6);
                ep_g[2] |= bit.ubit(1) << 5;
                ep_b[2] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 2;
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(6);
                ep_g[3] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 3;
                ep_b[3] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(6);
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(6);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(6);
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(6);
                ep_r[3] |= bit.ubit(6);
                break;
        }
    }
    else {
        switch (mode) {
            case 0:
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[0] |= bit.ubit(10);
                ep_g[0] |= bit.ubit(10);
                ep_b[0] |= bit.ubit(10);
                ep_r[1] |= bit.ubit(5);
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 2;
                ep_r[3] |= bit.ubit(5);
                ep_b[3] |= bit.ubit(1) << 3;
                break;
            case 1:
                ep_g[2] |= bit.ubit(1) << 5;
                ep_g[3] |= bit.ubit(1) << 4;
                ep_g[3] |= bit.ubit(1) << 5;
                ep_r[0] |= bit.ubit(7);
                ep_b[3] |= bit.ubit(1);
                ep_b[3] |= bit.ubit(1) << 1;
                ep_b[2] |= bit.ubit(1) << 4;
                ep_g[0] |= bit.ubit(7);
                ep_b[2] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 2;
                ep_g[2] |= bit.ubit(1) << 4;
                ep_b[0] |= bit.ubit(7);
                ep_b[3] |= bit.ubit(1) << 3;
                ep_b[3] |= bit.ubit(1) << 5;
                ep_b[3] |= bit.ubit(1) << 4;
                ep_r[1] |= bit.ubit(6);
                ep_g[2] |= bit.ubit(4);
                ep_g[1] |= bit.ubit(6);
                ep_g[3] |= bit.ubit(4);
                ep_b[1] |= bit.ubit(6);
                ep_b[2] |= bit.ubit(4);
                ep_r[2] |= bit.ubit(6);
                ep_r[3] |= bit.ubit(6);
                break;
        }
    }
    let mi = S_BC6H_MODE_INFO[mode];
    if (signed) {
        ep_r[0] = sign_extend(ep_r[0], mi.endpoint_bits);
        ep_g[0] = sign_extend(ep_g[0], mi.endpoint_bits);
        ep_b[0] = sign_extend(ep_b[0], mi.endpoint_bits);
    }
    let num_subsets = mi.partition_bits != 0 ? 2 : 1;
    for (let ii = 1; ii < num_subsets * 2; ii++) {
        if (signed || mi.transformed) {
            ep_r[ii] = sign_extend(ep_r[ii], mi.delta_bits[0]);
            ep_g[ii] = sign_extend(ep_g[ii], mi.delta_bits[1]);
            ep_b[ii] = sign_extend(ep_b[ii], mi.delta_bits[2]);
        }
        if (mi.transformed) {
            let mask = (1 << mi.endpoint_bits) - 1;
            ep_r[ii] = (ep_r[ii] + ep_r[0]) & mask;
            ep_g[ii] = (ep_g[ii] + ep_g[0]) & mask;
            ep_b[ii] = (ep_b[ii] + ep_b[0]) & mask;
            if (signed) {
                ep_r[ii] = sign_extend(ep_r[ii], mi.endpoint_bits);
                ep_g[ii] = sign_extend(ep_g[ii], mi.endpoint_bits);
                ep_b[ii] = sign_extend(ep_b[ii], mi.endpoint_bits);
            }
        }
    }
    for (let ii = 0; ii < num_subsets * 2; ii++) {
        ep_r[ii] = unquantize(ep_r[ii], signed, mi.endpoint_bits);
        ep_g[ii] = unquantize(ep_g[ii], signed, mi.endpoint_bits);
        ep_b[ii] = unquantize(ep_b[ii], signed, mi.endpoint_bits);
    }
    let partition_set_idx = mi.partition_bits != 0 ? bit.ubit(5) : 0;
    let index_bits = mi.partition_bits != 0 ? 3 : 4;
    let factors = S_BPTC_FACTORS$1[index_bits - 2];
    for (let yy = 0; yy < 4; yy++) {
        for (let xx = 0; xx < 4; xx++) {
            let idx = yy * 4 + xx;
            let subset_index = 0;
            let index_anchor = 0;
            if (0 != mi.partition_bits) {
                subset_index = (S_BPTC_P2$1[partition_set_idx] >> idx) & 1;
                index_anchor = subset_index != 0 ? S_BPTC_A2$1[partition_set_idx] : 0;
            }
            let anchor = idx == index_anchor ? 1 : 0;
            let num = index_bits - anchor;
            let index = bit.ubit(num);
            let fc = factors[index];
            let fca = 64 - fc;
            let fcb = fc;
            subset_index *= 2;
            let rr = finish_unquantize((ep_r[subset_index] * fca + ep_r[subset_index + 1] * fcb + 32) >> 6, signed);
            let gg = finish_unquantize((ep_g[subset_index] * fca + ep_g[subset_index + 1] * fcb + 32) >> 6, signed);
            let bb = finish_unquantize((ep_b[subset_index] * fca + ep_b[subset_index + 1] * fcb + 32) >> 6, signed);
            outbuf[idx] = color$1(f16_to_u8(rr), f16_to_u8(gg), f16_to_u8(bb), 255);
        }
    }
}
function isBuffer$7(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$3(obj) {
    return obj instanceof Uint8Array || isBuffer$7(obj);
}
function copy_block_buffer$1(bx, by, w, h, bw, bh, buffer, image) {
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
function decodeBC6(data, width, height, unsigned) {
    if (unsigned) {
        return decodeBC6H(data, width, height);
    }
    else {
        return decodeBC6S(data, width, height);
    }
}
function decodeBC6S(data, width, height) {
    if (!isArrayOrBuffer$3(data)) {
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
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_bc6_block(data.subarray(data_offset, data_offset + raw_block_size), buffer, true);
            copy_block_buffer$1(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$7(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
function decodeBC6H(data, width, height) {
    if (!isArrayOrBuffer$3(data)) {
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
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_bc6_block(data.subarray(data_offset, data_offset + raw_block_size), buffer, false);
            copy_block_buffer$1(bx, by, width, height, 4, 4, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$7(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}

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
    let bit = new bireader(data);
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
            }
            outbuf[idx] = color(rr, gg, bb, aa);
        }
    }
}
function isBuffer$6(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$2(obj) {
    return obj instanceof Uint8Array || isBuffer$6(obj);
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
function decodeBC7(data, width, height) {
    if (!isArrayOrBuffer$2(data)) {
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
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_bc7_block(data.subarray(data_offset), buffer);
            copy_block_buffer(bx, by, width, height, BLOCK_WIDTH, BLOCK_HEIGHT, buffer, image);
            data_offset += raw_block_size;
        }
    }
    if (isBuffer$6(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}

const CRN_FORMATS = {
    0: "cCRNFmtDXT1",
    1: "cCRNFmtDXT3",
    2: "cCRNFmtDXT5",
    3: "cCRNFmtDXT5_CCxY",
    4: "cCRNFmtDXT5_xGxR",
    5: "cCRNFmtDXT5_xGBR",
    6: "cCRNFmtDXT5_AGBR",
    7: "cCRNFmtDXN_XY",
    8: "cCRNFmtDXN_YX",
    9: "cCRNFmtDXT5A",
    10: "cCRNFmtETC1",
    11: "cCRNFmtETC2",
    12: "cCRNFmtETC2A",
    13: "cCRNFmtETC1S",
    14: "cCRNFmtETC2AS",
    15: "cCRNFmtTotal"
};
const KEY = [
    17,
    18,
    19,
    20,
    0,
    8,
    7,
    9,
    6,
    10,
    5,
    11,
    4,
    12,
    3,
    13,
    2,
    14,
    1,
    15,
    16
];
class Header {
    constructor(data) {
        const br = new bireader(data);
        this.isBuffer = isBuffer$5(data);
        this.br = br;
        br.be();
        this.magic = br.string({ length: 2 });
        this.header_size = br.uint16();
        this.header_crc16 = br.uint16();
        this.file_size = br.uint32();
        this.data_crc16 = br.uint16();
        this.width = br.uint16();
        this.height = br.uint16();
        this.level_count = br.ubyte();
        this.face_count = br.ubyte();
        this.format = br.ubyte(),
            this.format_str = CRN_FORMATS[this.format];
        this.flags = br.uint16();
        this.reserved = br.uint32();
        this.userdata = new Uint32Array([br.uint32(), br.uint32()]);
        function makePalette(br) {
            return {
                offset: br.ubit(24),
                size: br.ubit(24),
                count: br.uint16()
            };
        }
        this.color_endpoints = makePalette(br);
        this.color_selectors = makePalette(br);
        this.alpha_endpoints = makePalette(br);
        this.alpha_selectors = makePalette(br);
        this.table_size = br.uint16();
        this.table_offset = br.ubit(24);
        this.level_offset = new Uint32Array(this.level_count);
        for (let i = 0; i < this.level_count; i++) {
            this.level_offset[i] = br.uint32();
        }
    }
    fixed_size() {
        return 33 + 8 * 4 + 5;
    }
    crc16(init, input) {
        return input.reduce((v, c) => {
            let x = c ^ (v >> 8);
            x = (x ^ (x >> 4)) & 0xFFFF;
            return (v << 8) ^ (x << 12) ^ (x << 5) ^ x;
        }, ~init & 0xFFFF);
    }
    crc16_poly(init, poly, input) {
        return input.reduce((v, c) => {
            return [...Array(8).keys()].reduce((v, _) => {
                return (v & 1) === 1 ? (v >> 1) ^ poly : v >> 1;
            }, v ^ c);
        }, ~init);
    }
    check_crc(input) {
        return this.header_size == this.fixed_size() + 4 * this.level_count &&
            this.file_size == input.length &&
            this.header_crc16 == this.crc16(0, input.subarray(6, this.header_size)) &&
            this.data_crc16 == this.crc16(0, input.subarray(this.header_size));
    }
    block_size() {
        switch (this.format) {
            case 0:
            case 9:
                return 8;
            default:
                return 16;
        }
    }
    get_level_data(idx) {
        let start = this.level_offset[idx];
        this.br.goto(start);
        let len = this.level_offset[idx + 1] - start;
        return this.br.extract(len);
    }
    get_table_data() {
        if (this.table_size != 0 && this.table_offset != 0) {
            this.br.goto(this.table_offset);
            var table_data = this.br.extract(this.table_size);
        }
        else {
            var table_data = this.isBuffer ? Buffer.alloc(1) : new Uint8Array(1);
        }
        return table_data;
    }
    get_palette_data(palette) {
        if (palette.count == 0) {
            return this.isBuffer ? Buffer.alloc(1) : new Uint8Array(1);
        }
        let start = palette.offset;
        this.br.goto(start);
        return this.br.extract(palette.size);
    }
    get_table() {
        const codec = new Codec(this.get_table_data());
        const chunk_encoding = codec.get_huffman();
        var color_endpoint = new Table({}, [[]]);
        if (this.color_endpoints.count != 0) {
            var color_endpoint_delta = codec.get_huffman();
            var color_endpoints = this.get_color_endpoints();
            color_endpoint = new Table(color_endpoint_delta, color_endpoints);
        }
        var color_selector = new Table({}, [[]]);
        if (this.color_selectors.count != 0) {
            var color_selector_delta = codec.get_huffman();
            var color_selectors = this.get_color_selectors();
            color_selector = new Table(color_selector_delta, color_selectors);
        }
        var alpha_endpoint = new Table({}, [[]]);
        if (this.alpha_endpoints.count != 0) {
            var alpha_endpoint_delta = codec.get_huffman();
            var alpha_endpoints = this.get_alpha_endpoints();
            alpha_endpoint = new Table(alpha_endpoint_delta, alpha_endpoints);
        }
        let alpha_selector = new Table({}, [[]]);
        if (this.alpha_selectors.count != 0) {
            var alpha_selector_delta = codec.get_huffman();
            var alpha_selectors = this.get_alpha_selectors();
            alpha_selector = new Table(alpha_selector_delta, alpha_selectors);
        }
        return new Tables(chunk_encoding, color_endpoint, color_selector, alpha_endpoint, alpha_selector);
    }
    get_color_endpoints() {
        const codec = new Codec(this.get_palette_data(this.color_endpoints));
        const dm1 = codec.get_huffman();
        const dm2 = codec.get_huffman();
        var a = 0, b = 0, c = 0;
        var d = 0, e = 0, f = 0;
        var color_endpoint = Array.from({ length: this.color_endpoints.count }, (i, m) => {
            var da = dm1.next(codec);
            a = (a + da) & 0x1f;
            var db = dm2.next(codec);
            b = (b + db) & 0x3f;
            var dc = dm1.next(codec);
            c = (c + dc) & 0x1f;
            var dd = dm1.next(codec);
            d = (d + dd) & 0x1f;
            var de = dm2.next(codec);
            e = (e + de) & 0x3f;
            var df = dm1.next(codec);
            f = (f + df) & 0x1f;
            return [(c | (b << 5) | (a << 11)), (f | (e << 5) | (d << 11))];
        });
        if (!codec.is_complete()) {
            throw new Error("extra bytes in codec of color_endpoints");
        }
        return color_endpoint;
    }
    get_alpha_endpoints() {
        const codec = new Codec(this.get_palette_data(this.alpha_endpoints));
        var dm = codec.get_huffman();
        var a = 0, b = 0;
        var alpha_endpoint = Array.from({ length: this.alpha_endpoints.count }, () => {
            let da = dm.next(codec);
            a = (a + da) & 0xFF;
            let db = dm.next(codec);
            b = (b + db) & 0xFF;
            return [a, b];
        });
        if (!codec.is_complete()) {
            throw new Error("extra bytes in codec of alpha_endpoints");
        }
        return alpha_endpoint;
    }
    get_color_selectors() {
        const codec = new Codec(this.get_palette_data(this.color_selectors));
        const dm = codec.get_huffman();
        const x = new Uint32Array(8);
        const y = new Uint32Array(8);
        const C = new Uint8Array([0, 2, 3, 1]);
        var color_selectors = Array.from({ length: this.color_selectors.count }, () => {
            for (let i = 0; i < 8; i++) {
                var d = dm.next(codec);
                x[i] = ((x[i] + d % 7 - 3) & 3);
                y[i] = ((y[i] + Math.floor(d / 7) - 3) & 3);
            }
            return [
                C[x[0]] | (C[y[0]] << 2) | (C[x[1]] << 4) | (C[y[1]] << 6),
                C[x[2]] | (C[y[2]] << 2) | (C[x[3]] << 4) | (C[y[3]] << 6),
                C[x[4]] | (C[y[4]] << 2) | (C[x[5]] << 4) | (C[y[5]] << 6),
                C[x[6]] | (C[y[6]] << 2) | (C[x[7]] << 4) | (C[y[7]] << 6),
            ];
        });
        if (!codec.is_complete()) {
            throw new Error("extra bytes in codec of color_selectors");
        }
        return color_selectors;
    }
    get_alpha_selectors() {
        const codec = new Codec(this.get_palette_data(this.alpha_selectors));
        let dm = codec.get_huffman();
        const x = new Uint32Array(8);
        const y = new Uint32Array(8);
        const C = new Uint8Array([0, 2, 3, 4, 5, 6, 7, 1]);
        var alpha_selectors = Array.from({ length: this.alpha_selectors.count }, () => {
            var s = new Uint8Array(6);
            var s_bits = new biwriter(s);
            s_bits.be();
            var s_len = 6 * 8;
            for (let j = 0; j < 8; j++) {
                const d = dm.next(codec);
                x[j] = ((x[j] + d % 15 - 7) & 7);
                y[j] = ((y[j] + d / 15 - 7) & 7);
                s_bits.goto(0, s_len - j * 6 - 3);
                var bitsToWrite = (s_len - j * 6 - 0) - (s_len - j * 6 - 3);
                s_bits.ubit(C[x[j]], bitsToWrite);
                s_bits.goto(0, s_len - j * 6 - 6);
                bitsToWrite = (s_len - j * 6 - 3) - (s_len - j * 6 - 6);
                s_bits.ubit(C[y[j]], bitsToWrite);
            }
            return s_bits.get().reverse();
        });
        if (!codec.is_complete()) {
            throw new Error("extra bytes in codec of alpha_selectors");
        }
        return alpha_selectors;
    }
    get_level_info(idx) {
        if (idx < this.level_count) {
            const width = Math.max(1, this.width >> idx);
            const height = Math.max(1, this.height >> idx);
            return { width, height };
        }
        else {
            return null;
        }
    }
    unpack_level(tables, idx) {
        let codec = new Codec(this.get_level_data(idx));
        const width = Math.max(1, this.width >> idx);
        const height = Math.max(1, this.height >> idx);
        var data;
        switch (this.format) {
            case 0:
                data = new Unpack().unpackDxt1(tables, codec, width, height, this.face_count);
                break;
            case 2:
            case 6:
            case 3:
            case 4:
            case 5:
                data = new Unpack().unpackDxt5(tables, codec, width, height, this.face_count);
                break;
            case 9:
                data = new Unpack().unpackDxt5A(tables, codec, width, height, this.face_count);
                break;
            case 7:
            case 8:
                data = new Unpack().unpackDxn(tables, codec, width, height, this.face_count);
                break;
            default:
                throw new Error(`unsupported format ${CRN_FORMATS[this.format]}`);
        }
        return {
            data: data,
            width: width,
            height: height,
        };
    }
}
class Codec {
    constructor(data) {
        this.index = 0;
        this.MAX_SYMBOL_COUNT_BIT = 14;
        this.MAX_SYMBOL_COUNT = 8192;
        this.buffer = data;
        this.br = new bireader(data);
        this.br.be();
    }
    look_bits(n) {
        if (n == 0) {
            return 0;
        }
        if (this.index + n > this.len()) {
            const bitsleft = this.len() - this.index;
            const retval = this.br.ubit(bitsleft) << (this.index + n - this.len());
            this.br.skip(0, bitsleft * -1);
            return retval;
        }
        else {
            const retval = this.br.ubit(n);
            this.br.skip(0, n * -1);
            return retval;
        }
    }
    read_bits(n) {
        if (this.index + n > this.len()) {
            throw new Error(`codec read outside of size: ${this.index + n} of ${this.len()}`);
        }
        if (n == 0) {
            return 0;
        }
        const retval = this.br.ubit(n);
        this.index += n;
        return retval;
    }
    skip_bits(n) {
        this.br.skip(0, n);
        this.index += n;
    }
    current() {
        return this.index;
    }
    len() {
        return this.br.size * 8;
    }
    is_complete() {
        var retval = this.index + 7 >= this.len() && this.index <= this.len();
        return retval;
    }
    get_huffman() {
        const symbol_count = this.read_bits(Huffman.MAX_SYMBOL_COUNT_BIT);
        if (symbol_count == 0) {
            return new Huffman({});
        }
        const tmp_symbol_depth = {};
        const tmp_symbol_count = this.read_bits(5);
        if (!(tmp_symbol_count <= 21)) {
            throw new Error("huffman symbol count too high");
        }
        for (let i = 0; i < tmp_symbol_count; i++) {
            const value = this.read_bits(3);
            if (value != 0) {
                Object.assign(tmp_symbol_depth, { [KEY[i]]: value });
            }
        }
        const key = new Huffman(tmp_symbol_depth);
        const symbol_depth = {};
        var last = 0;
        var i = 0;
        while (i < symbol_count) {
            var d = key.next(this);
            var value = [];
            var len = 0;
            switch (d) {
                case 17:
                    len = (this.read_bits(3) || 0) + 3;
                    value = [len, 0];
                    break;
                case 18:
                    len = (this.read_bits(7) || 0) + 11;
                    value = [len, 0];
                    break;
                case 19:
                    len = (this.read_bits(2) || 0) + 3;
                    value = [len, last];
                    break;
                case 20:
                    len = (this.read_bits(6) || 0) + 7;
                    value = [len, last];
                    break;
                default:
                    len = 1;
                    value = [len, d];
                    break;
            }
            last = d;
            len = value[0];
            d = value[1];
            for (let j = 0; j < len; j++) {
                if (d != 0) {
                    Object.assign(symbol_depth, { [i + j]: d });
                }
            }
            i += len;
        }
        return new Huffman(symbol_depth);
    }
}
class Huffman {
    constructor(input) {
        this.depth_count = Array(Huffman.MAX_DEPTH + 1).fill(0);
        this.max_depth = 0;
        for (const symbol in input) {
            const depth = input[symbol];
            this.max_depth = Math.max(this.max_depth, depth);
        }
        const new_input = new Map();
        Object.entries(input).forEach(self => {
            new_input.set(Number(self[0]), self[1]);
        });
        this.symbol_depth = new_input;
        this.symbol_count = new_input.size;
        this.symbols = new Map();
        this.symbol_rev = new Map();
        this.initialize();
    }
    initialize() {
        const depthBound = Array(Huffman.MAX_DEPTH + 1).fill(0);
        let available = 0;
        for (const depth of this.symbol_depth.values()) {
            this.depth_count[depth]++;
        }
        for (let depth = 0; depth <= Huffman.MAX_DEPTH; depth++) {
            if (this.depth_count[depth] !== 0) {
                this.max_depth = depth;
            }
            available <<= 1;
            if (depth !== 0) {
                available += this.depth_count[depth];
            }
            depthBound[depth] = available;
        }
        if (!(1 << this.max_depth == depthBound[this.max_depth] ||
            (this.max_depth <= 1 && depthBound[this.max_depth] == this.max_depth))) {
            throw new Error(`Depth bound error: ${this.depth_count} ${depthBound}`);
        }
        const depthCurrent = Array(Huffman.MAX_DEPTH + 1).fill(0);
        for (let i = 1; i <= Huffman.MAX_DEPTH; i++) {
            depthCurrent[i] = depthBound[i - 1] * 2;
        }
        this.symbol_depth.forEach((depth, key) => {
            if (depth === 0)
                return;
            const result = depthCurrent[depth];
            depthCurrent[depth] += 1;
            this.symbols.set(Number(key), result);
            this.symbol_rev.set(`${this.symbol_depth.get(key)},${result}`, key);
        });
    }
    next(codec) {
        if (!(codec.current() < codec.len())) {
            throw new Error(`Huffman codec read outside of size: ${codec.current()} of ${codec.len()}`);
        }
        var k = codec.look_bits(this.max_depth);
        for (let i = 1; i <= this.max_depth; i++) {
            let t = k >>> (this.max_depth - i);
            let sym = this.symbol_rev.get(`${i},${t}`);
            if (sym != undefined) {
                codec.skip_bits(i);
                return sym;
            }
        }
        throw new Error("incomplete huffman tree no match");
    }
}
Huffman.MAX_DEPTH = 16;
Huffman.MAX_SYMBOL_COUNT = 8192;
Huffman.MAX_SYMBOL_COUNT_BIT = 14;
class Table {
    constructor(delta, entries) {
        this.delta = delta;
        this.entries = entries;
    }
    truncate(idx, max) {
        return idx < max ? idx : idx - max;
    }
    next(codec, idx) {
        let delta = this.delta.next(codec);
        idx[0] = this.truncate(idx[0] + delta, this.entries.length);
        return this.entries[idx[0]];
    }
}
class Tables {
    constructor(chunk_encoding, color_endpoint, color_selector, alpha_endpoint, alpha_selector) {
        this.chunk_enc = chunk_encoding;
        this.color_end = color_endpoint;
        this.color_sel = color_selector;
        this.alpha_end = alpha_endpoint;
        this.alpha_sel = alpha_selector;
    }
    color_endpoint() {
        return this.color_end;
    }
    color_selector() {
        return this.color_sel;
    }
    alpha_endpoint() {
        return this.alpha_end;
    }
    alpha_selector() {
        return this.alpha_sel;
    }
}
class Unpack {
    constructor() {
        this.TRUNK_SIZE = 2;
        this.COUNT_TILES = new Uint32Array([1, 2, 2, 3, 3, 3, 3, 4]);
        this.TILES = [
            new Uint32Array([0, 0, 0, 0]),
            new Uint32Array([0, 0, 1, 1]), new Uint32Array([0, 1, 0, 1]),
            new Uint32Array([0, 0, 1, 2]), new Uint32Array([1, 2, 0, 0]),
            new Uint32Array([0, 1, 0, 2]), new Uint32Array([1, 0, 2, 0]),
            new Uint32Array([0, 1, 2, 3])
        ];
    }
    next_tile_idx(codec, encoding, tile_bits) {
        if (tile_bits[0] == 1) {
            tile_bits[0] = encoding.next(codec) | 512;
        }
        let tile_index = tile_bits[0] & 7;
        tile_bits[0] >>= 3;
        return {
            tiles_count: this.COUNT_TILES[tile_index],
            tiles: this.TILES[tile_index]
        };
    }
    unpackDxt1(tables, codec, width, height, face) {
        const BLOCK_SIZE = 8;
        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);
        var tile_bits = new Uint32Array([1]);
        var color_endpoint_index = new Uint32Array([0]);
        var color_selector_index = new Uint32Array([0]);
        var pitch = block_x * BLOCK_SIZE;
        var result = new Uint8Array(block_y * pitch);
        var cursor = new biwriter(result);
        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const color_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        color_endpoints[i] = tables.color_endpoint().next(codec, color_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const color_selector = tables.color_selector().next(codec, color_selector_index);
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            const corend_write = color_endpoints[tiles[i]];
                            cursor.uint16(corend_write[0]);
                            cursor.uint16(corend_write[1]);
                            color_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) {
            throw new Error("extra bytes in DXT1 codec");
        }
        return cursor.get();
    }
    unpackDxt5(tables, codec, width, height, face) {
        const BLOCK_SIZE = 16;
        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);
        var tile_bits = new Uint32Array([1]);
        var color_endpoint_index = new Uint32Array([0]);
        var color_selector_index = new Uint32Array([0]);
        var alpha_endpoint_index = new Uint32Array([0]);
        var alpha_selector_index = new Uint32Array([0]);
        var pitch = block_x * BLOCK_SIZE;
        var result = new Uint8Array(block_y * pitch);
        var cursor = new biwriter(result);
        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const color_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const alpha_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha_endpoints[i] = tables.alpha_endpoint().next(codec, alpha_endpoint_index);
                    }
                    for (let i = 0; i < tiles_count; i++) {
                        color_endpoints[i] = tables.color_endpoint().next(codec, color_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha_selector = tables.alpha_selector().next(codec, alpha_selector_index);
                        const color_selector = tables.color_selector().next(codec, color_selector_index);
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            const alpend_write = alpha_endpoints[tiles[i]];
                            cursor.uint8(alpend_write[0]);
                            cursor.uint8(alpend_write[1]);
                            alpha_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                            const corend_write = color_endpoints[tiles[i]];
                            cursor.uint16(corend_write[0]);
                            cursor.uint16(corend_write[1]);
                            color_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) {
            throw new Error("extra bytes in DXT1 codec");
        }
        return cursor.get();
    }
    unpackDxt5A(tables, codec, width, height, face) {
        const BLOCK_SIZE = 8;
        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);
        var tile_bits = new Uint32Array([1]);
        var alpha_endpoint_index = new Uint32Array([0]);
        var alpha_selector_index = new Uint32Array([0]);
        var pitch = block_x * BLOCK_SIZE;
        var result = new Uint8Array(block_y * pitch);
        var cursor = new biwriter(result);
        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const alpha_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha_endpoints[i] = tables.alpha_endpoint().next(codec, alpha_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha_selector = tables.alpha_selector().next(codec, alpha_selector_index);
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            const alpend_write = alpha_endpoints[tiles[i]];
                            cursor.uint8(alpend_write[0]);
                            cursor.uint8(alpend_write[1]);
                            alpha_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) {
            throw new Error("extra bytes in DXT1 codec");
        }
        return cursor.get();
    }
    unpackDxn(tables, codec, width, height, face) {
        const BLOCK_SIZE = 16;
        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);
        var tile_bits = new Uint32Array([1]);
        var alpha0_endpoint_index = new Uint32Array([0]);
        var alpha0_selector_index = new Uint32Array([0]);
        var alpha1_endpoint_index = new Uint32Array([0]);
        var alpha1_selector_index = new Uint32Array([0]);
        var pitch = block_x * BLOCK_SIZE;
        var result = new Uint8Array(block_y * pitch);
        var cursor = new biwriter(result);
        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const alpha0_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const alpha1_endpoints = new Array(4).fill(0).map(() => [0, 0]);
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha0_endpoints[i] = tables.alpha_endpoint().next(codec, alpha0_endpoint_index);
                    }
                    for (let i = 0; i < tiles_count; i++) {
                        alpha1_endpoints[i] = tables.color_endpoint().next(codec, alpha1_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha0_selector = tables.alpha_selector().next(codec, alpha0_selector_index);
                        const alpha1_selector = tables.alpha_selector().next(codec, alpha1_selector_index);
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            const alp0end_write = alpha0_endpoints[tiles[i]];
                            cursor.uint8(alp0end_write[0]);
                            cursor.uint8(alp0end_write[1]);
                            alpha0_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                            const alp1end_write = alpha1_endpoints[tiles[i]];
                            cursor.uint8(alp1end_write[0]);
                            cursor.uint8(alp1end_write[1]);
                            alpha1_selector.forEach(value => {
                                cursor.uint8(value);
                            });
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) {
            throw new Error("extra bytes in DXT1 codec");
        }
        return cursor.get();
    }
}
function isBuffer$5(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer$1(obj) {
    return obj instanceof Uint8Array || isBuffer$5(obj);
}
function getCRNMeta(src, mipmap_level) {
    if (!isArrayOrBuffer$1(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const header = new Header(src);
    const level_idx = mipmap_level && mipmap_level <= header.level_count ? mipmap_level : 0;
    const width = Math.max(1, header.width >> level_idx);
    const height = Math.max(1, header.height >> level_idx);
    return {
        format: header.format_str,
        width: width,
        height: height,
        mipmaps: header.level_count,
        faces: header.face_count,
    };
}
function decodeCRN(src, mipmap_level, keepCompressed) {
    if (!isArrayOrBuffer$1(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const header = new Header(src);
    if (CRN_FORMATS[header.format] == undefined) {
        throw new Error(`Unknown crn format #${header.format}`);
    }
    const tables = header.get_table();
    const level_idx = mipmap_level && mipmap_level <= header.level_count ? mipmap_level : 0;
    const level = header.unpack_level(tables, level_idx);
    var retval = level.data;
    if (keepCompressed == true || keepCompressed == undefined) {
        switch (header.format) {
            case 0:
                retval = decodeBC1(level.data, level.width, level.height);
                break;
            case 1:
                retval = decodeBC2(level.data, level.width, level.height);
                break;
            case 2:
                retval = decodeBC3(level.data, level.width, level.height);
                break;
            case 9:
                retval = decodeBC4(level.data, level.width, level.height);
                break;
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                retval = decodeBC5(level.data, level.width, level.height);
                break;
        }
    }
    if (isBuffer$5(src)) {
        return Buffer.from(retval);
    }
    return retval;
}

const RGB = 24;
const RGBA = 32;
function isBuffer$4(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$3(obj) {
    return obj instanceof Uint8Array || isBuffer$4(obj);
}
const TGA_PROFILE = {
    RGB,
    RGBA
};
function flipImage$1(src, width, height, is24) {
    if (!arraybuffcheck$3(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const output = isBuffer$4(src) ? Buffer.alloc(src.length) : new Uint8Array(src.length);
    var z = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var pos = (x + (height - y - 1) * width) << 2;
            output[pos + 0] = src[z + 0] & 0xFF;
            output[pos + 1] = src[z + 1] & 0xFF;
            output[pos + 2] = src[z + 2] & 0xFF;
            if (is24) {
                z += 3;
            }
            else {
                output[pos + 3] = src[z + 3] & 0xFF;
                z += 4;
            }
        }
    }
    return output;
}
function makeTGA(src, width, height, noAlpha) {
    if (!arraybuffcheck$3(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    var profile = 32;
    if (noAlpha) {
        profile = 24;
    }
    const header = new Uint8Array(18);
    header[2] = 2;
    header[12] = width & 0xff;
    header[13] = (width >> 8) & 0xff;
    header[14] = height & 0xff;
    header[15] = (height >> 8) & 0xff;
    header[16] = profile;
    header[17] = profile == 32 ? 8 : 0;
    const data = flipImage$1(src, width, height, profile == 32 ? false : true);
    const footer_text = "\0\0\0\0\0\0\0\0TRUEVISION-XFILE.\0";
    const footer = new TextEncoder().encode(footer_text);
    const final_data = new Uint8Array([...header, ...data, ...footer]);
    return final_data;
}

const Z_FIXED$1 = 4;
const Z_BINARY = 0;
const Z_TEXT = 1;
const Z_UNKNOWN$1 = 2;
function zero$1(buf) {
    let len = buf.length;
    while (--len >= 0) {
        buf[len] = 0;
    }
}
const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES = 2;
const MIN_MATCH$1 = 3;
const MAX_MATCH$1 = 258;
const LENGTH_CODES$1 = 29;
const LITERALS$1 = 256;
const L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
const D_CODES$1 = 30;
const BL_CODES$1 = 19;
const HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
const MAX_BITS$1 = 15;
const Buf_size = 16;
const MAX_BL_BITS = 7;
const END_BLOCK = 256;
const REP_3_6 = 16;
const REPZ_3_10 = 17;
const REPZ_11_138 = 18;
const extra_lbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]);
const extra_dbits = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
const extra_blbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]);
const bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
const DIST_CODE_LEN = 512;
const static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
const static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
const _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
const _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
const base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
const base_dist = new Array(D_CODES$1);
zero$1(base_dist);
class StaticTreeDesc {
    constructor(static_tree, extra_bits, extra_base, elems, max_length) {
        this.static_tree = static_tree;
        this.extra_bits = extra_bits;
        this.extra_base = extra_base;
        this.elems = elems;
        this.max_length = max_length;
        this.has_stree = static_tree && static_tree.length;
    }
}
let static_l_desc;
let static_d_desc;
let static_bl_desc;
class TreeDesc {
    constructor(dyn_tree, stat_desc) {
        this.dyn_tree = dyn_tree;
        this.max_code = 0;
        this.stat_desc = stat_desc;
    }
}
const d_code = (dist) => {
    return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
const put_short = (s, w) => {
    if (s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = (w) & 0xff;
        s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
    }
};
const send_bits = (s, value, length) => {
    if (s.bi_valid > (Buf_size - length)) {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> (Buf_size - s.bi_valid);
        s.bi_valid += length - Buf_size;
    }
    else {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        s.bi_valid += length;
    }
};
const send_code = (s, c, tree) => {
    send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
const bi_reverse = (code, len) => {
    let res = 0;
    do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
    } while (--len > 0);
    return res >>> 1;
};
const bi_flush = (s) => {
    if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
    }
    else if (s.bi_valid >= 8 &&
        s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = s.bi_buf & 0xff;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
    }
};
const gen_bitlen = (s, desc) => {
    const tree = desc.dyn_tree;
    const max_code = desc.max_code;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const extra = desc.stat_desc.extra_bits;
    const base = desc.stat_desc.extra_base;
    const max_length = desc.stat_desc.max_length;
    let h;
    let n, m;
    let bits;
    let xbits;
    let f;
    let overflow = 0;
    for (bits = 0; bits <= MAX_BITS$1; bits++) {
        s.bl_count[bits] = 0;
    }
    tree[s.heap[s.heap_max] * 2 + 1] = 0;
    for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
            bits = max_length;
            overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
            continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base && extra != undefined) {
            xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree && stree != undefined) {
            s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
    }
    if (overflow === 0) {
        return;
    }
    do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
            bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
    } while (overflow > 0);
    for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
            m = s.heap[--h];
            if (m > max_code) {
                continue;
            }
            if (tree[m * 2 + 1] !== bits) {
                s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
                tree[m * 2 + 1] = bits;
            }
            n--;
        }
    }
};
const gen_codes = (tree, max_code, bl_count) => {
    const next_code = new Array(MAX_BITS$1 + 1);
    let code = 0;
    let bits;
    let n;
    for (bits = 1; bits <= MAX_BITS$1; bits++) {
        code = (code + bl_count[bits - 1]) << 1;
        next_code[bits] = code;
    }
    for (n = 0; n <= max_code; n++) {
        let len = tree[n * 2 + 1];
        if (len === 0) {
            continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
    }
};
const tr_static_init = () => {
    let n;
    let bits;
    let length;
    let code;
    let dist;
    const bl_count = new Array(MAX_BITS$1 + 1);
    length = 0;
    for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < (1 << extra_lbits[code]); n++) {
            _length_code[length++] = code;
        }
    }
    _length_code[length - 1] = code;
    dist = 0;
    for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < (1 << extra_dbits[code]); n++) {
            _dist_code[dist++] = code;
        }
    }
    dist >>= 7;
    for (; code < D_CODES$1; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
            _dist_code[256 + dist++] = code;
        }
    }
    for (bits = 0; bits <= MAX_BITS$1; bits++) {
        bl_count[bits] = 0;
    }
    n = 0;
    while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
    }
    while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
    }
    while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
    }
    while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
    }
    gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
    for (n = 0; n < D_CODES$1; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
    }
    static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
    static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
    static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);
};
const init_block = (s) => {
    let n;
    for (n = 0; n < L_CODES$1; n++) {
        s.dyn_ltree[n * 2] = 0;
    }
    for (n = 0; n < D_CODES$1; n++) {
        s.dyn_dtree[n * 2] = 0;
    }
    for (n = 0; n < BL_CODES$1; n++) {
        s.bl_tree[n * 2] = 0;
    }
    s.dyn_ltree[END_BLOCK * 2] = 1;
    s.opt_len = s.static_len = 0;
    s.sym_next = s.matches = 0;
};
const bi_windup = (s) => {
    if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
    }
    else if (s.bi_valid > 0 &&
        s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = s.bi_buf;
    }
    s.bi_buf = 0;
    s.bi_valid = 0;
};
const smaller = (tree, n, m, depth) => {
    const _n2 = n * 2;
    const _m2 = m * 2;
    return (tree[_n2] < tree[_m2] ||
        (tree[_n2] === tree[_m2] && depth[n] <= depth[m]));
};
const pqdownheap = (s, tree, k) => {
    const v = s.heap[k];
    let j = k << 1;
    while (j <= s.heap_len) {
        if (j < s.heap_len &&
            smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
            j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
            break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
    }
    s.heap[k] = v;
};
const compress_block = (s, ltree, dtree) => {
    let dist;
    let lc;
    let sx = 0;
    let code;
    let extra;
    if (s.sym_next !== 0 && s.pending_buf != undefined) {
        do {
            dist = s.pending_buf[s.sym_buf + sx++] & 0xff;
            dist += (s.pending_buf[s.sym_buf + sx++] & 0xff) << 8;
            lc = s.pending_buf[s.sym_buf + sx++];
            if (dist === 0) {
                send_code(s, lc, ltree);
            }
            else {
                code = _length_code[lc];
                send_code(s, code + LITERALS$1 + 1, ltree);
                extra = extra_lbits[code];
                if (extra !== 0) {
                    lc -= base_length[code];
                    send_bits(s, lc, extra);
                }
                dist--;
                code = d_code(dist);
                send_code(s, code, dtree);
                extra = extra_dbits[code];
                if (extra !== 0) {
                    dist -= base_dist[code];
                    send_bits(s, dist, extra);
                }
            }
        } while (sx < s.sym_next);
    }
    send_code(s, END_BLOCK, ltree);
};
const build_tree = (s, desc) => {
    const tree = desc.dyn_tree;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const elems = desc.stat_desc.elems;
    let n, m;
    let max_code = -1;
    let node;
    s.heap_len = 0;
    s.heap_max = HEAP_SIZE$1;
    for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
            s.heap[++s.heap_len] = max_code = n;
            s.depth[n] = 0;
        }
        else {
            tree[n * 2 + 1] = 0;
        }
    }
    while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree && stree != undefined) {
            s.static_len -= stree[node * 2 + 1];
        }
    }
    desc.max_code = max_code;
    for (n = (s.heap_len >> 1); n >= 1; n--) {
        pqdownheap(s, tree, n);
    }
    node = elems;
    do {
        n = s.heap[1];
        s.heap[1] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1);
        m = s.heap[1];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[1] = node++;
        pqdownheap(s, tree, 1);
    } while (s.heap_len >= 2);
    s.heap[--s.heap_max] = s.heap[1];
    gen_bitlen(s, desc);
    gen_codes(tree, max_code, s.bl_count);
};
const scan_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
    }
    tree[(max_code + 1) * 2 + 1] = 0xffff;
    for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
            continue;
        }
        else if (count < min_count) {
            s.bl_tree[curlen * 2] += count;
        }
        else if (curlen !== 0) {
            if (curlen !== prevlen) {
                s.bl_tree[curlen * 2]++;
            }
            s.bl_tree[REP_3_6 * 2]++;
        }
        else if (count <= 10) {
            s.bl_tree[REPZ_3_10 * 2]++;
        }
        else {
            s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
        }
        else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
        }
        else {
            max_count = 7;
            min_count = 4;
        }
    }
};
const send_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
    }
    for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
            continue;
        }
        else if (count < min_count) {
            do {
                send_code(s, curlen, s.bl_tree);
            } while (--count !== 0);
        }
        else if (curlen !== 0) {
            if (curlen !== prevlen) {
                send_code(s, curlen, s.bl_tree);
                count--;
            }
            send_code(s, REP_3_6, s.bl_tree);
            send_bits(s, count - 3, 2);
        }
        else if (count <= 10) {
            send_code(s, REPZ_3_10, s.bl_tree);
            send_bits(s, count - 3, 3);
        }
        else {
            send_code(s, REPZ_11_138, s.bl_tree);
            send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
        }
        else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
        }
        else {
            max_count = 7;
            min_count = 4;
        }
    }
};
const build_bl_tree = (s) => {
    let max_blindex;
    scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
    scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
    build_tree(s, s.bl_desc);
    for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
            break;
        }
    }
    s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
    return max_blindex;
};
const send_all_trees = (s, lcodes, dcodes, blcodes) => {
    let rank;
    send_bits(s, lcodes - 257, 5);
    send_bits(s, dcodes - 1, 5);
    send_bits(s, blcodes - 4, 4);
    for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
    }
    send_tree(s, s.dyn_ltree, lcodes - 1);
    send_tree(s, s.dyn_dtree, dcodes - 1);
};
const detect_data_type = (s) => {
    let block_mask = 0xf3ffc07f;
    let n;
    for (n = 0; n <= 31; n++, block_mask >>>= 1) {
        if ((block_mask & 1) && (s.dyn_ltree[n * 2] !== 0)) {
            return Z_BINARY;
        }
    }
    if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 ||
        s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
    }
    for (n = 32; n < LITERALS$1; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
            return Z_TEXT;
        }
    }
    return Z_BINARY;
};
let static_init_done = false;
function _tr_init(s) {
    if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
    }
    s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
    s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
    s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
    s.bi_buf = 0;
    s.bi_valid = 0;
    init_block(s);
}
function _tr_stored_block(s, buf, stored_len, last) {
    send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
    bi_windup(s);
    put_short(s, stored_len);
    put_short(s, ~stored_len);
    if (stored_len && s.pending_buf != undefined && s.window != undefined) {
        s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
    }
    s.pending += stored_len;
}
function _tr_align(s) {
    send_bits(s, STATIC_TREES << 1, 3);
    send_code(s, END_BLOCK, static_ltree);
    bi_flush(s);
}
function _tr_flush_block(s, buf, stored_len, last) {
    let opt_lenb, static_lenb;
    let max_blindex = 0;
    if (s.level > 0) {
        if (s.strm && s.strm.data_type === Z_UNKNOWN$1) {
            s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = (s.opt_len + 3 + 7) >>> 3;
        static_lenb = (s.static_len + 3 + 7) >>> 3;
        if (static_lenb <= opt_lenb) {
            opt_lenb = static_lenb;
        }
    }
    else {
        opt_lenb = static_lenb = stored_len + 5;
    }
    if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
        _tr_stored_block(s, buf, stored_len, last);
    }
    else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
    }
    else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
    }
    init_block(s);
    if (last) {
        bi_windup(s);
    }
}
function _tr_tally(s, dist, lc) {
    if (s.pending_buf != undefined) {
        s.pending_buf[s.sym_buf + s.sym_next++] = dist;
        s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
        s.pending_buf[s.sym_buf + s.sym_next++] = lc;
    }
    if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
    }
    else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
    }
    return (s.sym_next === s.sym_end);
}

function adler32(adler, buf, len, pos) {
    let s1 = (adler & 0xffff) | 0, s2 = ((adler >>> 16) & 0xffff) | 0, n = 0;
    while (len !== 0) {
        n = len > 2000 ? 2000 : len;
        len -= n;
        do {
            s1 = (s1 + buf[pos++]) | 0;
            s2 = (s2 + s1) | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
    }
    return (s1 | (s2 << 16)) | 0;
}

const makeTable = () => {
    let c, table = [];
    for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
};
const crcTable = new Uint32Array(makeTable());
function crc32(crc, buf, len, pos) {
    const t = crcTable;
    const end = pos + len;
    crc ^= -1;
    for (let i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1));
}

const msg = {
    '2': 'need dictionary',
    '1': 'stream end',
    '0': '',
    '-1': 'file error',
    '-2': 'stream error',
    '-3': 'data error',
    '-4': 'insufficient memory',
    '-5': 'buffer error',
    '-6': 'incompatible version'
};

const constants = {
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    Z_MEM_ERROR: -4,
    Z_BUF_ERROR: -5,
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    Z_BINARY: 0,
    Z_TEXT: 1,
    Z_UNKNOWN: 2,
    Z_DEFLATED: 8
};

const { Z_NO_FLUSH: Z_NO_FLUSH$1, Z_PARTIAL_FLUSH, Z_FULL_FLUSH: Z_FULL_FLUSH$1, Z_FINISH: Z_FINISH$2, Z_BLOCK: Z_BLOCK$1, Z_OK: Z_OK$2, Z_STREAM_END: Z_STREAM_END$2, Z_STREAM_ERROR: Z_STREAM_ERROR$2, Z_DATA_ERROR: Z_DATA_ERROR$2, Z_BUF_ERROR: Z_BUF_ERROR$1, Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1, Z_FILTERED, Z_HUFFMAN_ONLY, Z_RLE, Z_FIXED, Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1, Z_UNKNOWN, Z_DEFLATED: Z_DEFLATED$2 } = constants;
const MAX_MEM_LEVEL = 9;
const LENGTH_CODES = 29;
const LITERALS = 256;
const L_CODES = LITERALS + 1 + LENGTH_CODES;
const D_CODES = 30;
const BL_CODES = 19;
const HEAP_SIZE = 2 * L_CODES + 1;
const MAX_BITS = 15;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);
const PRESET_DICT = 0x20;
const INIT_STATE = 42;
const GZIP_STATE = 57;
const EXTRA_STATE = 69;
const NAME_STATE = 73;
const COMMENT_STATE = 91;
const HCRC_STATE = 103;
const BUSY_STATE = 113;
const FINISH_STATE = 666;
const BS_NEED_MORE = 1;
const BS_BLOCK_DONE = 2;
const BS_FINISH_STARTED = 3;
const BS_FINISH_DONE = 4;
const OS_CODE = 0x03;
const err = (strm, errorCode) => {
    strm.msg = msg[errorCode];
    return errorCode;
};
const rank = (f) => {
    return ((f) * 2) - ((f) > 4 ? 9 : 0);
};
const zero = (buf) => {
    let len = buf.length;
    while (--len >= 0) {
        buf[len] = 0;
    }
};
const slide_hash = (s) => {
    let n, m;
    let p;
    let wsize = s.w_size;
    n = s.hash_size;
    p = n;
    if (s.head != undefined) {
        do {
            m = s.head[--p];
            s.head[p] = (m >= wsize ? m - wsize : 0);
        } while (--n);
    }
    n = wsize;
    p = n;
    if (s.prev != undefined) {
        do {
            m = s.prev[--p];
            s.prev[p] = (m >= wsize ? m - wsize : 0);
        } while (--n);
    }
};
let HASH_ZLIB = (s, prev, data) => ((prev << s.hash_shift) ^ data) & s.hash_mask;
let HASH = HASH_ZLIB;
const flush_pending = (strm) => {
    const s = strm.state;
    let len = s.pending;
    if (len > strm.avail_out) {
        len = strm.avail_out;
    }
    if (len === 0) {
        return;
    }
    strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
    strm.next_out += len;
    s.pending_out += len;
    strm.total_out += len;
    strm.avail_out -= len;
    s.pending -= len;
    if (s.pending === 0) {
        s.pending_out = 0;
    }
};
const flush_block_only = (s, last) => {
    _tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
    s.block_start = s.strstart;
    flush_pending(s.strm);
};
const put_byte = (s, b) => {
    s.pending_buf[s.pending++] = b;
};
const putShortMSB = (s, b) => {
    s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
    s.pending_buf[s.pending++] = b & 0xff;
};
const read_buf = (strm, buf, start, size) => {
    let len = strm.avail_in;
    if (len > size) {
        len = size;
    }
    if (len === 0) {
        return 0;
    }
    strm.avail_in -= len;
    buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
    if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
    }
    else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
    }
    strm.next_in += len;
    strm.total_in += len;
    return len;
};
const longest_match = (s, cur_match) => {
    let chain_length = s.max_chain_length;
    let scan = s.strstart;
    let match;
    let len;
    let best_len = s.prev_length;
    let nice_match = s.nice_match;
    const limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
        s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
    const _win = s.window;
    const wmask = s.w_mask;
    const prev = s.prev;
    const strend = s.strstart + MAX_MATCH;
    let scan_end1 = _win[scan + best_len - 1];
    let scan_end = _win[scan + best_len];
    if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
    }
    if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
    }
    do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end ||
            _win[match + best_len - 1] !== scan_end1 ||
            _win[match] !== _win[scan] ||
            _win[++match] !== _win[scan + 1]) {
            continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
            _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
            _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
            _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
            scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
            s.match_start = cur_match;
            best_len = len;
            if (len >= nice_match) {
                break;
            }
            scan_end1 = _win[scan + best_len - 1];
            scan_end = _win[scan + best_len];
        }
    } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
    if (best_len <= s.lookahead) {
        return best_len;
    }
    return s.lookahead;
};
const fill_window = (s) => {
    const _w_size = s.w_size;
    let n, more, str;
    do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
            s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
            s.match_start -= _w_size;
            s.strstart -= _w_size;
            s.block_start -= _w_size;
            if (s.insert > s.strstart) {
                s.insert = s.strstart;
            }
            slide_hash(s);
            more += _w_size;
        }
        if (s.strm.avail_in === 0) {
            break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
            str = s.strstart - s.insert;
            s.ins_h = s.window[str];
            s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
            while (s.insert) {
                s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
                s.prev[str & s.w_mask] = s.head[s.ins_h];
                s.head[s.ins_h] = str;
                str++;
                s.insert--;
                if (s.lookahead + s.insert < MIN_MATCH) {
                    break;
                }
            }
        }
    } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
const deflate_stored = (s, flush) => {
    let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
    let len, left, have, last = 0;
    let used = s.strm.avail_in;
    do {
        len = 65535;
        have = (s.bi_valid + 42) >> 3;
        if (s.strm.avail_out < have) {
            break;
        }
        have = s.strm.avail_out - have;
        left = s.strstart - s.block_start;
        if (len > left + s.strm.avail_in) {
            len = left + s.strm.avail_in;
        }
        if (len > have) {
            len = have;
        }
        if (len < min_block && ((len === 0 && flush !== Z_FINISH$2) ||
            flush === Z_NO_FLUSH$1 ||
            len !== left + s.strm.avail_in)) {
            break;
        }
        last = flush === Z_FINISH$2 && len === left + s.strm.avail_in ? 1 : 0;
        _tr_stored_block(s, 0, 0, last);
        s.pending_buf[s.pending - 4] = len;
        s.pending_buf[s.pending - 3] = len >> 8;
        s.pending_buf[s.pending - 2] = ~len;
        s.pending_buf[s.pending - 1] = ~len >> 8;
        flush_pending(s.strm);
        if (left) {
            if (left > len) {
                left = len;
            }
            s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
            s.strm.next_out += left;
            s.strm.avail_out -= left;
            s.strm.total_out += left;
            s.block_start += left;
            len -= left;
        }
        if (len) {
            read_buf(s.strm, s.strm.output, s.strm.next_out, len);
            s.strm.next_out += len;
            s.strm.avail_out -= len;
            s.strm.total_out += len;
        }
    } while (last === 0);
    used -= s.strm.avail_in;
    if (used) {
        if (used >= s.w_size) {
            s.matches = 2;
            s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
            s.strstart = s.w_size;
            s.insert = s.strstart;
        }
        else {
            if (s.window_size - s.strstart <= used) {
                s.strstart -= s.w_size;
                s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
                if (s.matches < 2) {
                    s.matches++;
                }
                if (s.insert > s.strstart) {
                    s.insert = s.strstart;
                }
            }
            s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
            s.strstart += used;
            s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
        }
        s.block_start = s.strstart;
    }
    if (last) {
        return BS_FINISH_DONE;
    }
    if (flush !== Z_NO_FLUSH$1 && flush !== Z_FINISH$2 &&
        s.strm.avail_in === 0 && s.strstart === s.block_start) {
        return BS_BLOCK_DONE;
    }
    have = s.window_size - s.strstart;
    if (s.strm.avail_in > have && s.block_start >= s.w_size) {
        s.block_start -= s.w_size;
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
            s.matches++;
        }
        have += s.w_size;
        if (s.insert > s.strstart) {
            s.insert = s.strstart;
        }
    }
    if (have > s.strm.avail_in) {
        have = s.strm.avail_in;
    }
    if (have) {
        read_buf(s.strm, s.window, s.strstart, have);
        s.strstart += have;
        s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
    }
    have = (s.bi_valid + 42) >> 3;
    have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
    min_block = have > s.w_size ? s.w_size : have;
    left = s.strstart - s.block_start;
    if (left >= min_block ||
        ((left || flush === Z_FINISH$2) && flush !== Z_NO_FLUSH$1 &&
            s.strm.avail_in === 0 && left <= have)) {
        len = left > have ? have : left;
        last = flush === Z_FINISH$2 && s.strm.avail_in === 0 &&
            len === left ? 1 : 0;
        _tr_stored_block(s, s.block_start, len, last);
        s.block_start += len;
        flush_pending(s.strm);
    }
    return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
const deflate_fast = (s, flush) => {
    let hash_head;
    let bflush;
    for (;;) {
        if (s.lookahead < MIN_LOOKAHEAD) {
            fill_window(s);
            if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
                return BS_NEED_MORE;
            }
            if (s.lookahead === 0) {
                break;
            }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
            s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
            bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
            s.lookahead -= s.match_length;
            if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
                s.match_length--;
                do {
                    s.strstart++;
                    s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
                    hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                    s.head[s.ins_h] = s.strstart;
                } while (--s.match_length !== 0);
                s.strstart++;
            }
            else {
                s.strstart += s.match_length;
                s.match_length = 0;
                s.ins_h = s.window[s.strstart];
                s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
            }
        }
        else {
            bflush = _tr_tally(s, 0, s.window[s.strstart]);
            s.lookahead--;
            s.strstart++;
        }
        if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
                return BS_NEED_MORE;
            }
        }
    }
    s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
    if (flush === Z_FINISH$2) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
            return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
    }
    if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
        }
    }
    return BS_BLOCK_DONE;
};
const deflate_slow = (s, flush) => {
    let hash_head;
    let bflush;
    let max_insert;
    for (;;) {
        if (s.lookahead < MIN_LOOKAHEAD) {
            fill_window(s);
            if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
                return BS_NEED_MORE;
            }
            if (s.lookahead === 0) {
                break;
            }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match &&
            s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)) {
            s.match_length = longest_match(s, hash_head);
            if (s.match_length <= 5 &&
                (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096))) {
                s.match_length = MIN_MATCH - 1;
            }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
            max_insert = s.strstart + s.lookahead - MIN_MATCH;
            bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
            s.lookahead -= s.prev_length - 1;
            s.prev_length -= 2;
            do {
                if (++s.strstart <= max_insert) {
                    s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
                    hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                    s.head[s.ins_h] = s.strstart;
                }
            } while (--s.prev_length !== 0);
            s.match_available = 0;
            s.match_length = MIN_MATCH - 1;
            s.strstart++;
            if (bflush) {
                flush_block_only(s, false);
                if (s.strm.avail_out === 0) {
                    return BS_NEED_MORE;
                }
            }
        }
        else if (s.match_available) {
            bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
            if (bflush) {
                flush_block_only(s, false);
            }
            s.strstart++;
            s.lookahead--;
            if (s.strm.avail_out === 0) {
                return BS_NEED_MORE;
            }
        }
        else {
            s.match_available = 1;
            s.strstart++;
            s.lookahead--;
        }
    }
    if (s.match_available) {
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
    }
    s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
    if (flush === Z_FINISH$2) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
            return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
    }
    if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
        }
    }
    return BS_BLOCK_DONE;
};
const deflate_rle = (s, flush) => {
    let bflush;
    let prev;
    let scan, strend;
    const _win = s.window;
    for (;;) {
        if (s.lookahead <= MAX_MATCH) {
            fill_window(s);
            if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$1) {
                return BS_NEED_MORE;
            }
            if (s.lookahead === 0) {
                break;
            }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
            scan = s.strstart - 1;
            prev = _win[scan];
            if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
                strend = s.strstart + MAX_MATCH;
                do {
                } while (prev === _win[++scan] && prev === _win[++scan] &&
                    prev === _win[++scan] && prev === _win[++scan] &&
                    prev === _win[++scan] && prev === _win[++scan] &&
                    prev === _win[++scan] && prev === _win[++scan] &&
                    scan < strend);
                s.match_length = MAX_MATCH - (strend - scan);
                if (s.match_length > s.lookahead) {
                    s.match_length = s.lookahead;
                }
            }
        }
        if (s.match_length >= MIN_MATCH) {
            bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
            s.lookahead -= s.match_length;
            s.strstart += s.match_length;
            s.match_length = 0;
        }
        else {
            bflush = _tr_tally(s, 0, s.window[s.strstart]);
            s.lookahead--;
            s.strstart++;
        }
        if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
                return BS_NEED_MORE;
            }
        }
    }
    s.insert = 0;
    if (flush === Z_FINISH$2) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
            return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
    }
    if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
        }
    }
    return BS_BLOCK_DONE;
};
const deflate_huff = (s, flush) => {
    let bflush;
    for (;;) {
        if (s.lookahead === 0) {
            fill_window(s);
            if (s.lookahead === 0) {
                if (flush === Z_NO_FLUSH$1) {
                    return BS_NEED_MORE;
                }
                break;
            }
        }
        s.match_length = 0;
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
                return BS_NEED_MORE;
            }
        }
    }
    s.insert = 0;
    if (flush === Z_FINISH$2) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
            return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
    }
    if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
        }
    }
    return BS_BLOCK_DONE;
};
class Config {
    constructor(good_length, max_lazy, nice_length, max_chain, func) {
        this.good_length = good_length;
        this.max_lazy = max_lazy;
        this.nice_length = nice_length;
        this.max_chain = max_chain;
        this.func = func;
    }
}
const configuration_table = [
    new Config(0, 0, 0, 0, deflate_stored),
    new Config(4, 4, 8, 4, deflate_fast),
    new Config(4, 5, 16, 8, deflate_fast),
    new Config(4, 6, 32, 32, deflate_fast),
    new Config(4, 4, 16, 16, deflate_slow),
    new Config(8, 16, 32, 32, deflate_slow),
    new Config(8, 16, 128, 128, deflate_slow),
    new Config(8, 32, 128, 256, deflate_slow),
    new Config(32, 128, 258, 1024, deflate_slow),
    new Config(32, 258, 258, 4096, deflate_slow)
];
const lm_init = (s) => {
    s.window_size = 2 * s.w_size;
    zero(s.head);
    s.max_lazy_match = configuration_table[s.level].max_lazy;
    s.good_match = configuration_table[s.level].good_length;
    s.nice_match = configuration_table[s.level].nice_length;
    s.max_chain_length = configuration_table[s.level].max_chain;
    s.strstart = 0;
    s.block_start = 0;
    s.lookahead = 0;
    s.insert = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    s.ins_h = 0;
};
class DeflateState {
    constructor() {
        this.strm = null;
        this.status = 0;
        this.pending_buf = null;
        this.pending_buf_size = 0;
        this.pending_out = 0;
        this.pending = 0;
        this.wrap = 0;
        this.gzhead = null;
        this.gzindex = 0;
        this.method = Z_DEFLATED$2;
        this.last_flush = -1;
        this.w_size = 0;
        this.w_bits = 0;
        this.w_mask = 0;
        this.window = null;
        this.window_size = 0;
        this.prev = null;
        this.head = null;
        this.ins_h = 0;
        this.hash_size = 0;
        this.hash_bits = 0;
        this.hash_mask = 0;
        this.hash_shift = 0;
        this.block_start = 0;
        this.match_length = 0;
        this.prev_match = 0;
        this.match_available = 0;
        this.strstart = 0;
        this.match_start = 0;
        this.lookahead = 0;
        this.prev_length = 0;
        this.max_chain_length = 0;
        this.max_lazy_match = 0;
        this.level = 0;
        this.strategy = 0;
        this.good_match = 0;
        this.nice_match = 0;
        this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
        this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
        this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
        zero(this.dyn_ltree);
        zero(this.dyn_dtree);
        zero(this.bl_tree);
        this.l_desc = null;
        this.d_desc = null;
        this.bl_desc = null;
        this.bl_count = new Uint16Array(MAX_BITS + 1);
        this.heap = new Uint16Array(2 * L_CODES + 1);
        zero(this.heap);
        this.heap_len = 0;
        this.heap_max = 0;
        this.depth = new Uint16Array(2 * L_CODES + 1);
        zero(this.depth);
        this.sym_buf = 0;
        this.lit_bufsize = 0;
        this.sym_next = 0;
        this.sym_end = 0;
        this.opt_len = 0;
        this.static_len = 0;
        this.matches = 0;
        this.insert = 0;
        this.bi_buf = 0;
        this.bi_valid = 0;
    }
}
const deflateStateCheck = (strm) => {
    if (!strm) {
        return 1;
    }
    const s = strm.state;
    if (!s || s.strm !== strm || (s.status !== INIT_STATE &&
        s.status !== GZIP_STATE &&
        s.status !== EXTRA_STATE &&
        s.status !== NAME_STATE &&
        s.status !== COMMENT_STATE &&
        s.status !== HCRC_STATE &&
        s.status !== BUSY_STATE &&
        s.status !== FINISH_STATE)) {
        return 1;
    }
    return 0;
};
function deflateResetKeep(strm) {
    if (deflateStateCheck(strm)) {
        return err(strm, Z_STREAM_ERROR$2);
    }
    strm.total_in = strm.total_out = 0;
    strm.data_type = Z_UNKNOWN;
    const s = strm.state;
    s.pending = 0;
    s.pending_out = 0;
    if (s.wrap < 0) {
        s.wrap = -s.wrap;
    }
    s.status =
        s.wrap === 2 ? GZIP_STATE :
            s.wrap ? INIT_STATE : BUSY_STATE;
    strm.adler = (s.wrap === 2) ?
        0
        :
            1;
    s.last_flush = -2;
    _tr_init(s);
    return Z_OK$2;
}
function deflateReset(strm) {
    const ret = deflateResetKeep(strm);
    if (ret === Z_OK$2) {
        lm_init(strm.state);
    }
    return ret;
}
function deflateSetHeader(strm, head) {
    if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
        return Z_STREAM_ERROR$2;
    }
    strm.state.gzhead = head;
    return Z_OK$2;
}
function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
    if (!strm) {
        return Z_STREAM_ERROR$2;
    }
    let wrap = 1;
    if (level === Z_DEFAULT_COMPRESSION$1) {
        level = 6;
    }
    if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
    }
    else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
    }
    if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 ||
        windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
        strategy < 0 || strategy > Z_FIXED || (windowBits === 8 && wrap !== 1)) {
        return err(strm, Z_STREAM_ERROR$2);
    }
    if (windowBits === 8) {
        windowBits = 9;
    }
    const s = new DeflateState();
    strm.state = s;
    s.strm = strm;
    s.status = INIT_STATE;
    s.wrap = wrap;
    s.gzhead = null;
    s.w_bits = windowBits;
    s.w_size = 1 << s.w_bits;
    s.w_mask = s.w_size - 1;
    s.hash_bits = memLevel + 7;
    s.hash_size = 1 << s.hash_bits;
    s.hash_mask = s.hash_size - 1;
    s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
    s.window = new Uint8Array(s.w_size * 2);
    s.head = new Uint16Array(s.hash_size);
    s.prev = new Uint16Array(s.w_size);
    s.lit_bufsize = 1 << (memLevel + 6);
    s.pending_buf_size = s.lit_bufsize * 4;
    s.pending_buf = new Uint8Array(s.pending_buf_size);
    s.sym_buf = s.lit_bufsize;
    s.sym_end = (s.lit_bufsize - 1) * 3;
    s.level = level;
    s.strategy = strategy;
    s.method = method;
    return deflateReset(strm);
}
function deflate$1(strm, flush) {
    if (deflateStateCheck(strm) || flush > Z_BLOCK$1 || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
    }
    const s = strm.state;
    if (!strm.output ||
        (strm.avail_in !== 0 && !strm.input) ||
        (s.status === FINISH_STATE && flush !== Z_FINISH$2)) {
        return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
    }
    const old_flush = s.last_flush;
    s.last_flush = flush;
    if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK$2;
        }
    }
    else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
        flush !== Z_FINISH$2) {
        return err(strm, Z_BUF_ERROR$1);
    }
    if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR$1);
    }
    if (s.status === INIT_STATE && s.wrap === 0) {
        s.status = BUSY_STATE;
    }
    if (s.status === INIT_STATE) {
        let header = (Z_DEFLATED$2 + ((s.w_bits - 8) << 4)) << 8;
        let level_flags = -1;
        if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
        }
        else if (s.level < 6) {
            level_flags = 1;
        }
        else if (s.level === 6) {
            level_flags = 2;
        }
        else {
            level_flags = 3;
        }
        header |= (level_flags << 6);
        if (s.strstart !== 0) {
            header |= PRESET_DICT;
        }
        header += 31 - (header % 31);
        putShortMSB(s, header);
        if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 0xffff);
        }
        strm.adler = 1;
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$2;
        }
    }
    if (s.status === GZIP_STATE) {
        strm.adler = 0;
        put_byte(s, 31);
        put_byte(s, 139);
        put_byte(s, 8);
        if (!s.gzhead) {
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 :
                (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                    4 : 0));
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
            flush_pending(strm);
            if (s.pending !== 0) {
                s.last_flush = -1;
                return Z_OK$2;
            }
        }
        else {
            put_byte(s, (s.gzhead.text ? 1 : 0) +
                (s.gzhead.hcrc ? 2 : 0) +
                (!s.gzhead.extra ? 0 : 4) +
                (!s.gzhead.name ? 0 : 8) +
                (!s.gzhead.comment ? 0 : 16));
            put_byte(s, s.gzhead.time & 0xff);
            put_byte(s, (s.gzhead.time >> 8) & 0xff);
            put_byte(s, (s.gzhead.time >> 16) & 0xff);
            put_byte(s, (s.gzhead.time >> 24) & 0xff);
            put_byte(s, s.level === 9 ? 2 :
                (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                    4 : 0));
            put_byte(s, s.gzhead.os & 0xff);
            if (s.gzhead.extra && s.gzhead.extra.length) {
                put_byte(s, s.gzhead.extra.length & 0xff);
                put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
            }
            if (s.gzhead.hcrc) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
        }
    }
    if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
            let beg = s.pending;
            let left = (s.gzhead.extra.length & 0xffff) - s.gzindex;
            while (s.pending + left > s.pending_buf_size) {
                let copy = s.pending_buf_size - s.pending;
                s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
                s.pending = s.pending_buf_size;
                if (s.gzhead.hcrc && s.pending > beg) {
                    strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
                }
                s.gzindex += copy;
                flush_pending(strm);
                if (s.pending !== 0) {
                    s.last_flush = -1;
                    return Z_OK$2;
                }
                beg = 0;
                left -= copy;
            }
            let gzhead_extra = new Uint8Array(s.gzhead.extra);
            s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
            s.pending += left;
            if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            s.gzindex = 0;
        }
        s.status = NAME_STATE;
    }
    if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
            let beg = s.pending;
            let val;
            do {
                if (s.pending === s.pending_buf_size) {
                    if (s.gzhead.hcrc && s.pending > beg) {
                        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
                    }
                    flush_pending(strm);
                    if (s.pending !== 0) {
                        s.last_flush = -1;
                        return Z_OK$2;
                    }
                    beg = 0;
                }
                if (s.gzindex < s.gzhead.name.length) {
                    val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
                }
                else {
                    val = 0;
                }
                put_byte(s, val);
            } while (val !== 0);
            if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            s.gzindex = 0;
        }
        s.status = COMMENT_STATE;
    }
    if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
            let beg = s.pending;
            let val;
            do {
                if (s.pending === s.pending_buf_size) {
                    if (s.gzhead.hcrc && s.pending > beg) {
                        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
                    }
                    flush_pending(strm);
                    if (s.pending !== 0) {
                        s.last_flush = -1;
                        return Z_OK$2;
                    }
                    beg = 0;
                }
                if (s.gzindex < s.gzhead.comment.length) {
                    val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
                }
                else {
                    val = 0;
                }
                put_byte(s, val);
            } while (val !== 0);
            if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
        }
        s.status = HCRC_STATE;
    }
    if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
            if (s.pending + 2 > s.pending_buf_size) {
                flush_pending(strm);
                if (s.pending !== 0) {
                    s.last_flush = -1;
                    return Z_OK$2;
                }
            }
            put_byte(s, strm.adler & 0xff);
            put_byte(s, (strm.adler >> 8) & 0xff);
            strm.adler = 0;
        }
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$2;
        }
    }
    if (strm.avail_in !== 0 || s.lookahead !== 0 ||
        (flush !== Z_NO_FLUSH$1 && s.status !== FINISH_STATE)) {
        let bstate = s.level === 0 ? deflate_stored(s, flush) :
            s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) :
                s.strategy === Z_RLE ? deflate_rle(s, flush) :
                    configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
            s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
            if (strm.avail_out === 0) {
                s.last_flush = -1;
            }
            return Z_OK$2;
        }
        if (bstate === BS_BLOCK_DONE) {
            if (flush === Z_PARTIAL_FLUSH) {
                _tr_align(s);
            }
            else if (flush !== Z_BLOCK$1) {
                _tr_stored_block(s, 0, 0, false);
                if (flush === Z_FULL_FLUSH$1) {
                    zero(s.head);
                    if (s.lookahead === 0) {
                        s.strstart = 0;
                        s.block_start = 0;
                        s.insert = 0;
                    }
                }
            }
            flush_pending(strm);
            if (strm.avail_out === 0) {
                s.last_flush = -1;
                return Z_OK$2;
            }
        }
    }
    if (flush !== Z_FINISH$2) {
        return Z_OK$2;
    }
    if (s.wrap <= 0) {
        return Z_STREAM_END$2;
    }
    if (s.wrap === 2) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        put_byte(s, (strm.adler >> 16) & 0xff);
        put_byte(s, (strm.adler >> 24) & 0xff);
        put_byte(s, strm.total_in & 0xff);
        put_byte(s, (strm.total_in >> 8) & 0xff);
        put_byte(s, (strm.total_in >> 16) & 0xff);
        put_byte(s, (strm.total_in >> 24) & 0xff);
    }
    else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
    }
    flush_pending(strm);
    if (s.wrap > 0) {
        s.wrap = -s.wrap;
    }
    return s.pending !== 0 ? Z_OK$2 : Z_STREAM_END$2;
}
function deflateEnd(strm) {
    if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR$2;
    }
    const status = strm.state.status;
    strm.state = null;
    return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$2;
}
function deflateSetDictionary(strm, dictionary) {
    let dictLength = dictionary.length;
    if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR$2;
    }
    const s = strm.state;
    const wrap = s.wrap;
    if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
        return Z_STREAM_ERROR$2;
    }
    if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
    }
    s.wrap = 0;
    if (dictLength >= s.w_size) {
        if (wrap === 0) {
            zero(s.head);
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
        }
        let tmpDict = new Uint8Array(s.w_size);
        tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
    }
    const avail = strm.avail_in;
    const next = strm.next_in;
    const input = strm.input;
    strm.avail_in = dictLength;
    strm.next_in = 0;
    strm.input = dictionary;
    fill_window(s);
    while (s.lookahead >= MIN_MATCH) {
        let str = s.strstart;
        let n = s.lookahead - (MIN_MATCH - 1);
        do {
            s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
    }
    s.strstart += s.lookahead;
    s.block_start = s.strstart;
    s.insert = s.lookahead;
    s.lookahead = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    strm.next_in = next;
    strm.input = input;
    strm.avail_in = avail;
    s.wrap = wrap;
    return Z_OK$2;
}

const BAD$1 = 16209;
const TYPE$1 = 16191;
function inflate_fast(strm, start) {
    let _in;
    let last;
    let _out;
    let beg;
    let end;
    let dmax;
    let wsize;
    let whave;
    let wnext;
    let s_window;
    let hold;
    let bits;
    let lcode;
    let dcode;
    let lmask;
    let dmask;
    let here;
    let op;
    let len;
    let dist;
    let from;
    let from_source;
    let input, output;
    const state = strm.state;
    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);
    dmax = state.dmax;
    wsize = state.wsize;
    whave = state.whave;
    wnext = state.wnext;
    s_window = state.window;
    hold = state.hold;
    bits = state.bits;
    lcode = state.lencode;
    dcode = state.distcode;
    lmask = (1 << state.lenbits) - 1;
    dmask = (1 << state.distbits) - 1;
    top: do {
        if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
        }
        here = lcode[hold & lmask];
        dolen: for (;;) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = (here >>> 16) & 0xff;
            if (op === 0) {
                output[_out++] = here & 0xffff;
            }
            else if (op & 16) {
                len = here & 0xffff;
                op &= 15;
                if (op) {
                    if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                    }
                    len += hold & ((1 << op) - 1);
                    hold >>>= op;
                    bits -= op;
                }
                if (bits < 15) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    hold += input[_in++] << bits;
                    bits += 8;
                }
                here = dcode[hold & dmask];
                dodist: for (;;) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = (here >>> 16) & 0xff;
                    if (op & 16) {
                        dist = here & 0xffff;
                        op &= 15;
                        if (bits < op) {
                            hold += input[_in++] << bits;
                            bits += 8;
                            if (bits < op) {
                                hold += input[_in++] << bits;
                                bits += 8;
                            }
                        }
                        dist += hold & ((1 << op) - 1);
                        if (dist > dmax) {
                            strm.msg = 'invalid distance too far back';
                            state.mode = BAD$1;
                            break top;
                        }
                        hold >>>= op;
                        bits -= op;
                        op = _out - beg;
                        if (dist > op) {
                            op = dist - op;
                            if (op > whave) {
                                if (state.sane) {
                                    strm.msg = 'invalid distance too far back';
                                    state.mode = BAD$1;
                                    break top;
                                }
                            }
                            from = 0;
                            from_source = s_window;
                            if (wnext === 0) {
                                from += wsize - op;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;
                                    from_source = output;
                                }
                            }
                            else if (wnext < op) {
                                from += wsize + wnext - op;
                                op -= wnext;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = 0;
                                    if (wnext < len) {
                                        op = wnext;
                                        len -= op;
                                        do {
                                            output[_out++] = s_window[from++];
                                        } while (--op);
                                        from = _out - dist;
                                        from_source = output;
                                    }
                                }
                            }
                            else {
                                from += wnext - op;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;
                                    from_source = output;
                                }
                            }
                            while (len > 2) {
                                output[_out++] = from_source[from++];
                                output[_out++] = from_source[from++];
                                output[_out++] = from_source[from++];
                                len -= 3;
                            }
                            if (len) {
                                output[_out++] = from_source[from++];
                                if (len > 1) {
                                    output[_out++] = from_source[from++];
                                }
                            }
                        }
                        else {
                            from = _out - dist;
                            do {
                                output[_out++] = output[from++];
                                output[_out++] = output[from++];
                                output[_out++] = output[from++];
                                len -= 3;
                            } while (len > 2);
                            if (len) {
                                output[_out++] = output[from++];
                                if (len > 1) {
                                    output[_out++] = output[from++];
                                }
                            }
                        }
                    }
                    else if ((op & 64) === 0) {
                        here = dcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
                        continue dodist;
                    }
                    else {
                        strm.msg = 'invalid distance code';
                        state.mode = BAD$1;
                        break top;
                    }
                    break;
                }
            }
            else if ((op & 64) === 0) {
                here = lcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
                continue dolen;
            }
            else if (op & 32) {
                state.mode = TYPE$1;
                break top;
            }
            else {
                strm.msg = 'invalid literal/length code';
                state.mode = BAD$1;
                break top;
            }
            break;
        }
    } while (_in < last && _out < end);
    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;
    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
    strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
    state.hold = hold;
    state.bits = bits;
    return;
}

const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const lbase = new Uint16Array([
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
]);
const lext = new Uint8Array([
    16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
    19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
]);
const dbase = new Uint16Array([
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    8193, 12289, 16385, 24577, 0, 0
]);
const dext = new Uint8Array([
    16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
    23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
    28, 28, 29, 29, 64, 64
]);
function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
    const bits = opts.bits;
    let len = 0;
    let sym = 0;
    let min = 0, max = 0;
    let root = 0;
    let curr = 0;
    let drop = 0;
    let left = 0;
    let used = 0;
    let huff = 0;
    let incr;
    let fill;
    let low;
    let mask;
    let next;
    let base = null;
    let match;
    const count = new Uint16Array(MAXBITS + 1);
    const offs = new Uint16Array(MAXBITS + 1);
    let extra = null;
    let here_bits, here_op, here_val;
    for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
    }
    for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
    }
    root = bits;
    for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
            break;
        }
    }
    if (root > max) {
        root = max;
    }
    if (max === 0) {
        table[table_index++] = (1 << 24) | (64 << 16) | 0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;
        opts.bits = 1;
        return 0;
    }
    for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
            break;
        }
    }
    if (root < min) {
        root = min;
    }
    left = 1;
    for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
            return -1;
        }
    }
    if (left > 0 && (type === CODES$1 || max !== 1)) {
        return -1;
    }
    offs[1] = 0;
    for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
    }
    for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
            work[offs[lens[lens_index + sym]]++] = sym;
        }
    }
    if (type === CODES$1) {
        base = extra = work;
        match = 20;
    }
    else if (type === LENS$1) {
        base = lbase;
        extra = lext;
        match = 257;
    }
    else {
        base = dbase;
        extra = dext;
        match = 0;
    }
    huff = 0;
    sym = 0;
    len = min;
    next = table_index;
    curr = root;
    drop = 0;
    low = -1;
    used = 1 << root;
    mask = used - 1;
    if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
        (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
        return 1;
    }
    for (;;) {
        here_bits = len - drop;
        if (work[sym] + 1 < match) {
            here_op = 0;
            here_val = work[sym];
        }
        else if (work[sym] >= match) {
            here_op = extra[work[sym] - match];
            here_val = base[work[sym] - match];
        }
        else {
            here_op = 32 + 64;
            here_val = 0;
        }
        incr = 1 << (len - drop);
        fill = 1 << curr;
        min = fill;
        do {
            fill -= incr;
            table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val | 0;
        } while (fill !== 0);
        incr = 1 << (len - 1);
        while (huff & incr) {
            incr >>= 1;
        }
        if (incr !== 0) {
            huff &= incr - 1;
            huff += incr;
        }
        else {
            huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
            if (len === max) {
                break;
            }
            len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
            if (drop === 0) {
                drop = root;
            }
            next += min;
            curr = len - drop;
            left = 1 << curr;
            while (curr + drop < max) {
                left -= count[curr + drop];
                if (left <= 0) {
                    break;
                }
                curr++;
                left <<= 1;
            }
            used += 1 << curr;
            if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
                (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
                return 1;
            }
            low = huff & mask;
            table[low] = (root << 24) | (curr << 16) | (next - table_index) | 0;
        }
    }
    if (huff !== 0) {
        table[next + huff] = ((len - drop) << 24) | (64 << 16) | 0;
    }
    opts.bits = root;
    return 0;
}

const CODES = 0;
const LENS = 1;
const DISTS = 2;
const { Z_FINISH: Z_FINISH$1, Z_BLOCK, Z_TREES, Z_OK: Z_OK$1, Z_STREAM_END: Z_STREAM_END$1, Z_NEED_DICT: Z_NEED_DICT$1, Z_STREAM_ERROR: Z_STREAM_ERROR$1, Z_DATA_ERROR: Z_DATA_ERROR$1, Z_MEM_ERROR: Z_MEM_ERROR$1, Z_BUF_ERROR, Z_DEFLATED: Z_DEFLATED$1 } = constants;
const HEAD = 16180;
const FLAGS = 16181;
const TIME = 16182;
const OS = 16183;
const EXLEN = 16184;
const EXTRA = 16185;
const NAME = 16186;
const COMMENT = 16187;
const HCRC = 16188;
const DICTID = 16189;
const DICT = 16190;
const TYPE = 16191;
const TYPEDO = 16192;
const STORED = 16193;
const COPY_ = 16194;
const COPY = 16195;
const TABLE = 16196;
const LENLENS = 16197;
const CODELENS = 16198;
const LEN_ = 16199;
const LEN = 16200;
const LENEXT = 16201;
const DIST = 16202;
const DISTEXT = 16203;
const MATCH = 16204;
const LIT = 16205;
const CHECK = 16206;
const LENGTH = 16207;
const DONE = 16208;
const BAD = 16209;
const MEM = 16210;
const SYNC = 16211;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const zswap32 = (q) => {
    return (((q >>> 24) & 0xff) +
        ((q >>> 8) & 0xff00) +
        ((q & 0xff00) << 8) +
        ((q & 0xff) << 24));
};
class InflateState {
    constructor() {
        this.strm = null;
        this.mode = 0;
        this.last = false;
        this.wrap = 0;
        this.havedict = false;
        this.flags = 0;
        this.dmax = 0;
        this.check = 0;
        this.total = 0;
        this.head = null;
        this.wbits = 0;
        this.wsize = 0;
        this.whave = 0;
        this.wnext = 0;
        this.window = null;
        this.hold = 0;
        this.bits = 0;
        this.length = 0;
        this.offset = 0;
        this.extra = 0;
        this.lencode = null;
        this.distcode = null;
        this.lenbits = 0;
        this.distbits = 0;
        this.ncode = 0;
        this.nlen = 0;
        this.ndist = 0;
        this.have = 0;
        this.next = null;
        this.lens = new Uint16Array(320);
        this.work = new Uint16Array(288);
        this.lendyn = null;
        this.distdyn = null;
        this.sane = 0;
        this.back = 0;
        this.was = 0;
    }
}
const inflateStateCheck = (strm) => {
    if (!strm) {
        return 1;
    }
    const state = strm.state;
    if (!state || state.strm !== strm ||
        state.mode < HEAD || state.mode > SYNC) {
        return 1;
    }
    return 0;
};
function inflateResetKeep(strm) {
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    strm.total_in = strm.total_out = state.total = 0;
    strm.msg = '';
    if (state.wrap) {
        strm.adler = state.wrap & 1;
    }
    state.mode = HEAD;
    state.last = 0;
    state.havedict = 0;
    state.flags = -1;
    state.dmax = 32768;
    state.head = null;
    state.hold = 0;
    state.bits = 0;
    state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
    state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
    state.sane = 1;
    state.back = -1;
    return Z_OK$1;
}
function inflateReset(strm) {
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    state.wsize = 0;
    state.whave = 0;
    state.wnext = 0;
    return inflateResetKeep(strm);
}
function inflateReset2(strm, windowBits) {
    let wrap;
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
    }
    else {
        wrap = (windowBits >> 4) + 5;
        if (windowBits < 48) {
            windowBits &= 15;
        }
    }
    if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR$1;
    }
    if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
    }
    state.wrap = wrap;
    state.wbits = windowBits;
    return inflateReset(strm);
}
function inflateInit2(strm, windowBits) {
    if (!strm) {
        return Z_STREAM_ERROR$1;
    }
    const state = new InflateState();
    strm.state = state;
    state.strm = strm;
    state.window = null;
    state.mode = HEAD;
    const ret = inflateReset2(strm, windowBits);
    if (ret !== Z_OK$1) {
        strm.state = null;
    }
    return ret;
}
let virgin = true;
let lenfix, distfix;
const fixedtables = (state) => {
    if (virgin) {
        lenfix = new Int32Array(512);
        distfix = new Int32Array(32);
        let sym = 0;
        while (sym < 144) {
            state.lens[sym++] = 8;
        }
        while (sym < 256) {
            state.lens[sym++] = 9;
        }
        while (sym < 280) {
            state.lens[sym++] = 7;
        }
        while (sym < 288) {
            state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
            state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
    }
    state.lencode = lenfix;
    state.lenbits = 9;
    state.distcode = distfix;
    state.distbits = 5;
};
const updatewindow = (strm, src, end, copy) => {
    let dist;
    const state = strm.state;
    if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new Uint8Array(state.wsize);
    }
    if (copy >= state.wsize) {
        state.window.set(src.subarray(end - state.wsize, end), 0);
        state.wnext = 0;
        state.whave = state.wsize;
    }
    else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
            dist = copy;
        }
        state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
        copy -= dist;
        if (copy) {
            state.window.set(src.subarray(end - copy, end), 0);
            state.wnext = copy;
            state.whave = state.wsize;
        }
        else {
            state.wnext += dist;
            if (state.wnext === state.wsize) {
                state.wnext = 0;
            }
            if (state.whave < state.wsize) {
                state.whave += dist;
            }
        }
    }
    return 0;
};
function inflate$1(strm, flush) {
    let state;
    let input, output;
    let next;
    let put;
    let have, left;
    let hold;
    let bits;
    let _in, _out;
    let copy;
    let from;
    let from_source;
    let here = 0;
    let here_bits, here_op, here_val;
    let last_bits, last_op, last_val;
    let len;
    let ret;
    const hbuf = new Uint8Array(4);
    let opts;
    let n;
    const order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    if (inflateStateCheck(strm) || !strm.output ||
        (!strm.input && strm.avail_in !== 0)) {
        return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    if (state.mode === TYPE) {
        state.mode = TYPEDO;
    }
    put = strm.next_out;
    output = strm.output;
    left = strm.avail_out;
    next = strm.next_in;
    input = strm.input;
    have = strm.avail_in;
    hold = state.hold;
    bits = state.bits;
    _in = have;
    _out = left;
    ret = Z_OK$1;
    inf_leave: for (;;) {
        switch (state.mode) {
            case HEAD:
                if (state.wrap === 0) {
                    state.mode = TYPEDO;
                    break;
                }
                while (bits < 16) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if ((state.wrap & 2) && hold === 0x8b1f) {
                    if (state.wbits === 0) {
                        state.wbits = 15;
                    }
                    state.check = 0;
                    hbuf[0] = hold & 0xff;
                    hbuf[1] = (hold >>> 8) & 0xff;
                    state.check = crc32(state.check, hbuf, 2, 0);
                    hold = 0;
                    bits = 0;
                    state.mode = FLAGS;
                    break;
                }
                if (state.head) {
                    state.head.done = false;
                }
                if (!(state.wrap & 1) ||
                    (((hold & 0xff) << 8) + (hold >> 8)) % 31) {
                    strm.msg = 'incorrect header check';
                    state.mode = BAD;
                    break;
                }
                if ((hold & 0x0f) !== Z_DEFLATED$1) {
                    strm.msg = 'unknown compression method';
                    state.mode = BAD;
                    break;
                }
                hold >>>= 4;
                bits -= 4;
                len = (hold & 0x0f) + 8;
                if (state.wbits === 0) {
                    state.wbits = len;
                }
                if (len > 15 || len > state.wbits) {
                    strm.msg = 'invalid window size';
                    state.mode = BAD;
                    break;
                }
                state.dmax = 1 << state.wbits;
                state.flags = 0;
                strm.adler = state.check = 1;
                state.mode = hold & 0x200 ? DICTID : TYPE;
                hold = 0;
                bits = 0;
                break;
            case FLAGS:
                while (bits < 16) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                state.flags = hold;
                if ((state.flags & 0xff) !== Z_DEFLATED$1) {
                    strm.msg = 'unknown compression method';
                    state.mode = BAD;
                    break;
                }
                if (state.flags & 0xe000) {
                    strm.msg = 'unknown header flags set';
                    state.mode = BAD;
                    break;
                }
                if (state.head) {
                    state.head.text = ((hold >> 8) & 1);
                }
                if ((state.flags & 0x0200) && (state.wrap & 4)) {
                    hbuf[0] = hold & 0xff;
                    hbuf[1] = (hold >>> 8) & 0xff;
                    state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
                state.mode = TIME;
            case TIME:
                while (bits < 32) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if (state.head) {
                    state.head.time = hold;
                }
                if ((state.flags & 0x0200) && (state.wrap & 4)) {
                    hbuf[0] = hold & 0xff;
                    hbuf[1] = (hold >>> 8) & 0xff;
                    hbuf[2] = (hold >>> 16) & 0xff;
                    hbuf[3] = (hold >>> 24) & 0xff;
                    state.check = crc32(state.check, hbuf, 4, 0);
                }
                hold = 0;
                bits = 0;
                state.mode = OS;
            case OS:
                while (bits < 16) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if (state.head) {
                    state.head.xflags = (hold & 0xff);
                    state.head.os = (hold >> 8);
                }
                if ((state.flags & 0x0200) && (state.wrap & 4)) {
                    hbuf[0] = hold & 0xff;
                    hbuf[1] = (hold >>> 8) & 0xff;
                    state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
                state.mode = EXLEN;
            case EXLEN:
                if (state.flags & 0x0400) {
                    while (bits < 16) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    state.length = hold;
                    if (state.head) {
                        state.head.extra_len = hold;
                    }
                    if ((state.flags & 0x0200) && (state.wrap & 4)) {
                        hbuf[0] = hold & 0xff;
                        hbuf[1] = (hold >>> 8) & 0xff;
                        state.check = crc32(state.check, hbuf, 2, 0);
                    }
                    hold = 0;
                    bits = 0;
                }
                else if (state.head) {
                    state.head.extra = null;
                }
                state.mode = EXTRA;
            case EXTRA:
                if (state.flags & 0x0400) {
                    copy = state.length;
                    if (copy > have) {
                        copy = have;
                    }
                    if (copy) {
                        if (state.head) {
                            len = state.head.extra_len - state.length;
                            if (!state.head.extra) {
                                state.head.extra = new Uint8Array(state.head.extra_len);
                            }
                            state.head.extra.set(input.subarray(next, next + copy), len);
                        }
                        if ((state.flags & 0x0200) && (state.wrap & 4)) {
                            state.check = crc32(state.check, input, copy, next);
                        }
                        have -= copy;
                        next += copy;
                        state.length -= copy;
                    }
                    if (state.length) {
                        break inf_leave;
                    }
                }
                state.length = 0;
                state.mode = NAME;
            case NAME:
                if (state.flags & 0x0800) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    copy = 0;
                    do {
                        len = input[next + copy++];
                        if (state.head && len &&
                            (state.length < 65536)) {
                            state.head.name += String.fromCharCode(len);
                        }
                    } while (len && copy < have);
                    if ((state.flags & 0x0200) && (state.wrap & 4)) {
                        state.check = crc32(state.check, input, copy, next);
                    }
                    have -= copy;
                    next += copy;
                    if (len) {
                        break inf_leave;
                    }
                }
                else if (state.head) {
                    state.head.name = null;
                }
                state.length = 0;
                state.mode = COMMENT;
            case COMMENT:
                if (state.flags & 0x1000) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    copy = 0;
                    do {
                        len = input[next + copy++];
                        if (state.head && len &&
                            (state.length < 65536)) {
                            state.head.comment += String.fromCharCode(len);
                        }
                    } while (len && copy < have);
                    if ((state.flags & 0x0200) && (state.wrap & 4)) {
                        state.check = crc32(state.check, input, copy, next);
                    }
                    have -= copy;
                    next += copy;
                    if (len) {
                        break inf_leave;
                    }
                }
                else if (state.head) {
                    state.head.comment = null;
                }
                state.mode = HCRC;
            case HCRC:
                if (state.flags & 0x0200) {
                    while (bits < 16) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    if ((state.wrap & 4) && hold !== (state.check & 0xffff)) {
                        strm.msg = 'header crc mismatch';
                        state.mode = BAD;
                        break;
                    }
                    hold = 0;
                    bits = 0;
                }
                if (state.head) {
                    state.head.hcrc = ((state.flags >> 9) & 1);
                    state.head.done = true;
                }
                strm.adler = state.check = 0;
                state.mode = TYPE;
                break;
            case DICTID:
                while (bits < 32) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                strm.adler = state.check = zswap32(hold);
                hold = 0;
                bits = 0;
                state.mode = DICT;
            case DICT:
                if (state.havedict === 0) {
                    strm.next_out = put;
                    strm.avail_out = left;
                    strm.next_in = next;
                    strm.avail_in = have;
                    state.hold = hold;
                    state.bits = bits;
                    return Z_NEED_DICT$1;
                }
                strm.adler = state.check = 1;
                state.mode = TYPE;
            case TYPE:
                if (flush === Z_BLOCK || flush === Z_TREES) {
                    break inf_leave;
                }
            case TYPEDO:
                if (state.last) {
                    hold >>>= bits & 7;
                    bits -= bits & 7;
                    state.mode = CHECK;
                    break;
                }
                while (bits < 3) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                state.last = (hold & 0x01);
                hold >>>= 1;
                bits -= 1;
                switch ((hold & 0x03)) {
                    case 0:
                        state.mode = STORED;
                        break;
                    case 1:
                        fixedtables(state);
                        state.mode = LEN_;
                        if (flush === Z_TREES) {
                            hold >>>= 2;
                            bits -= 2;
                            break inf_leave;
                        }
                        break;
                    case 2:
                        state.mode = TABLE;
                        break;
                    case 3:
                        strm.msg = 'invalid block type';
                        state.mode = BAD;
                }
                hold >>>= 2;
                bits -= 2;
                break;
            case STORED:
                hold >>>= bits & 7;
                bits -= bits & 7;
                while (bits < 32) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
                    strm.msg = 'invalid stored block lengths';
                    state.mode = BAD;
                    break;
                }
                state.length = hold & 0xffff;
                hold = 0;
                bits = 0;
                state.mode = COPY_;
                if (flush === Z_TREES) {
                    break inf_leave;
                }
            case COPY_:
                state.mode = COPY;
            case COPY:
                copy = state.length;
                if (copy) {
                    if (copy > have) {
                        copy = have;
                    }
                    if (copy > left) {
                        copy = left;
                    }
                    if (copy === 0) {
                        break inf_leave;
                    }
                    output.set(input.subarray(next, next + copy), put);
                    have -= copy;
                    next += copy;
                    left -= copy;
                    put += copy;
                    state.length -= copy;
                    break;
                }
                state.mode = TYPE;
                break;
            case TABLE:
                while (bits < 14) {
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                state.nlen = (hold & 0x1f) + 257;
                hold >>>= 5;
                bits -= 5;
                state.ndist = (hold & 0x1f) + 1;
                hold >>>= 5;
                bits -= 5;
                state.ncode = (hold & 0x0f) + 4;
                hold >>>= 4;
                bits -= 4;
                if (state.nlen > 286 || state.ndist > 30) {
                    strm.msg = 'too many length or distance symbols';
                    state.mode = BAD;
                    break;
                }
                state.have = 0;
                state.mode = LENLENS;
            case LENLENS:
                while (state.have < state.ncode) {
                    while (bits < 3) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    state.lens[order[state.have++]] = (hold & 0x07);
                    hold >>>= 3;
                    bits -= 3;
                }
                while (state.have < 19) {
                    state.lens[order[state.have++]] = 0;
                }
                state.lencode = state.lendyn;
                state.lenbits = 7;
                opts = { bits: state.lenbits };
                ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
                state.lenbits = opts.bits;
                if (ret) {
                    strm.msg = 'invalid code lengths set';
                    state.mode = BAD;
                    break;
                }
                state.have = 0;
                state.mode = CODELENS;
            case CODELENS:
                while (state.have < state.nlen + state.ndist) {
                    for (;;) {
                        here = state.lencode[hold & ((1 << state.lenbits) - 1)];
                        here_bits = here >>> 24;
                        here_op = (here >>> 16) & 0xff;
                        here_val = here & 0xffff;
                        if ((here_bits) <= bits) {
                            break;
                        }
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    if (here_val < 16) {
                        hold >>>= here_bits;
                        bits -= here_bits;
                        state.lens[state.have++] = here_val;
                    }
                    else {
                        if (here_val === 16) {
                            n = here_bits + 2;
                            while (bits < n) {
                                if (have === 0) {
                                    break inf_leave;
                                }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            hold >>>= here_bits;
                            bits -= here_bits;
                            if (state.have === 0) {
                                strm.msg = 'invalid bit length repeat';
                                state.mode = BAD;
                                break;
                            }
                            len = state.lens[state.have - 1];
                            copy = 3 + (hold & 0x03);
                            hold >>>= 2;
                            bits -= 2;
                        }
                        else if (here_val === 17) {
                            n = here_bits + 3;
                            while (bits < n) {
                                if (have === 0) {
                                    break inf_leave;
                                }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            hold >>>= here_bits;
                            bits -= here_bits;
                            len = 0;
                            copy = 3 + (hold & 0x07);
                            hold >>>= 3;
                            bits -= 3;
                        }
                        else {
                            n = here_bits + 7;
                            while (bits < n) {
                                if (have === 0) {
                                    break inf_leave;
                                }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8;
                            }
                            hold >>>= here_bits;
                            bits -= here_bits;
                            len = 0;
                            copy = 11 + (hold & 0x7f);
                            hold >>>= 7;
                            bits -= 7;
                        }
                        if (state.have + copy > state.nlen + state.ndist) {
                            strm.msg = 'invalid bit length repeat';
                            state.mode = BAD;
                            break;
                        }
                        while (copy--) {
                            state.lens[state.have++] = len;
                        }
                    }
                }
                if (state.mode === BAD) {
                    break;
                }
                if (state.lens[256] === 0) {
                    strm.msg = 'invalid code -- missing end-of-block';
                    state.mode = BAD;
                    break;
                }
                state.lenbits = 9;
                opts = { bits: state.lenbits };
                ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
                state.lenbits = opts.bits;
                if (ret) {
                    strm.msg = 'invalid literal/lengths set';
                    state.mode = BAD;
                    break;
                }
                state.distbits = 6;
                state.distcode = state.distdyn;
                opts = { bits: state.distbits };
                ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
                state.distbits = opts.bits;
                if (ret) {
                    strm.msg = 'invalid distances set';
                    state.mode = BAD;
                    break;
                }
                state.mode = LEN_;
                if (flush === Z_TREES) {
                    break inf_leave;
                }
            case LEN_:
                state.mode = LEN;
            case LEN:
                if (have >= 6 && left >= 258) {
                    strm.next_out = put;
                    strm.avail_out = left;
                    strm.next_in = next;
                    strm.avail_in = have;
                    state.hold = hold;
                    state.bits = bits;
                    inflate_fast(strm, _out);
                    put = strm.next_out;
                    output = strm.output;
                    left = strm.avail_out;
                    next = strm.next_in;
                    input = strm.input;
                    have = strm.avail_in;
                    hold = state.hold;
                    bits = state.bits;
                    if (state.mode === TYPE) {
                        state.back = -1;
                    }
                    break;
                }
                state.back = 0;
                for (;;) {
                    here = state.lencode[hold & ((1 << state.lenbits) - 1)];
                    here_bits = here >>> 24;
                    here_op = (here >>> 16) & 0xff;
                    here_val = here & 0xffff;
                    if (here_bits <= bits) {
                        break;
                    }
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if (here_op && (here_op & 0xf0) === 0) {
                    last_bits = here_bits;
                    last_op = here_op;
                    last_val = here_val;
                    for (;;) {
                        here = state.lencode[last_val +
                            ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)];
                        here_bits = here >>> 24;
                        here_op = (here >>> 16) & 0xff;
                        here_val = here & 0xffff;
                        if ((last_bits + here_bits) <= bits) {
                            break;
                        }
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    hold >>>= last_bits;
                    bits -= last_bits;
                    state.back += last_bits;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                state.back += here_bits;
                state.length = here_val;
                if (here_op === 0) {
                    state.mode = LIT;
                    break;
                }
                if (here_op & 32) {
                    state.back = -1;
                    state.mode = TYPE;
                    break;
                }
                if (here_op & 64) {
                    strm.msg = 'invalid literal/length code';
                    state.mode = BAD;
                    break;
                }
                state.extra = here_op & 15;
                state.mode = LENEXT;
            case LENEXT:
                if (state.extra) {
                    n = state.extra;
                    while (bits < n) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    state.length += hold & ((1 << state.extra) - 1);
                    hold >>>= state.extra;
                    bits -= state.extra;
                    state.back += state.extra;
                }
                state.was = state.length;
                state.mode = DIST;
            case DIST:
                for (;;) {
                    here = state.distcode[hold & ((1 << state.distbits) - 1)];
                    here_bits = here >>> 24;
                    here_op = (here >>> 16) & 0xff;
                    here_val = here & 0xffff;
                    if ((here_bits) <= bits) {
                        break;
                    }
                    if (have === 0) {
                        break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                }
                if ((here_op & 0xf0) === 0) {
                    last_bits = here_bits;
                    last_op = here_op;
                    last_val = here_val;
                    for (;;) {
                        here = state.distcode[last_val +
                            ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)];
                        here_bits = here >>> 24;
                        here_op = (here >>> 16) & 0xff;
                        here_val = here & 0xffff;
                        if ((last_bits + here_bits) <= bits) {
                            break;
                        }
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    hold >>>= last_bits;
                    bits -= last_bits;
                    state.back += last_bits;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                state.back += here_bits;
                if (here_op & 64) {
                    strm.msg = 'invalid distance code';
                    state.mode = BAD;
                    break;
                }
                state.offset = here_val;
                state.extra = (here_op) & 15;
                state.mode = DISTEXT;
            case DISTEXT:
                if (state.extra) {
                    n = state.extra;
                    while (bits < n) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    state.offset += hold & ((1 << state.extra) - 1);
                    hold >>>= state.extra;
                    bits -= state.extra;
                    state.back += state.extra;
                }
                if (state.offset > state.dmax) {
                    strm.msg = 'invalid distance too far back';
                    state.mode = BAD;
                    break;
                }
                state.mode = MATCH;
            case MATCH:
                if (left === 0) {
                    break inf_leave;
                }
                copy = _out - left;
                if (state.offset > copy) {
                    copy = state.offset - copy;
                    if (copy > state.whave) {
                        if (state.sane) {
                            strm.msg = 'invalid distance too far back';
                            state.mode = BAD;
                            break;
                        }
                    }
                    if (copy > state.wnext) {
                        copy -= state.wnext;
                        from = state.wsize - copy;
                    }
                    else {
                        from = state.wnext - copy;
                    }
                    if (copy > state.length) {
                        copy = state.length;
                    }
                    from_source = state.window;
                }
                else {
                    from_source = output;
                    from = put - state.offset;
                    copy = state.length;
                }
                if (copy > left) {
                    copy = left;
                }
                left -= copy;
                state.length -= copy;
                do {
                    output[put++] = from_source[from++];
                } while (--copy);
                if (state.length === 0) {
                    state.mode = LEN;
                }
                break;
            case LIT:
                if (left === 0) {
                    break inf_leave;
                }
                output[put++] = state.length;
                left--;
                state.mode = LEN;
                break;
            case CHECK:
                if (state.wrap) {
                    while (bits < 32) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold |= input[next++] << bits;
                        bits += 8;
                    }
                    _out -= left;
                    strm.total_out += _out;
                    state.total += _out;
                    if ((state.wrap & 4) && _out) {
                        strm.adler = state.check =
                            (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));
                    }
                    _out = left;
                    if ((state.wrap & 4) && (state.flags ? hold : zswap32(hold)) !== state.check) {
                        strm.msg = 'incorrect data check';
                        state.mode = BAD;
                        break;
                    }
                    hold = 0;
                    bits = 0;
                }
                state.mode = LENGTH;
            case LENGTH:
                if (state.wrap && state.flags) {
                    while (bits < 32) {
                        if (have === 0) {
                            break inf_leave;
                        }
                        have--;
                        hold += input[next++] << bits;
                        bits += 8;
                    }
                    if ((state.wrap & 4) && hold !== (state.total & 0xffffffff)) {
                        strm.msg = 'incorrect length check';
                        state.mode = BAD;
                        break;
                    }
                    hold = 0;
                    bits = 0;
                }
                state.mode = DONE;
            case DONE:
                ret = Z_STREAM_END$1;
                break inf_leave;
            case BAD:
                ret = Z_DATA_ERROR$1;
                break inf_leave;
            case MEM:
                return Z_MEM_ERROR$1;
            case SYNC:
            default:
                return Z_STREAM_ERROR$1;
        }
    }
    strm.next_out = put;
    strm.avail_out = left;
    strm.next_in = next;
    strm.avail_in = have;
    state.hold = hold;
    state.bits = bits;
    if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
        (state.mode < CHECK || flush !== Z_FINISH$1))) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
    }
    _in -= strm.avail_in;
    _out -= strm.avail_out;
    strm.total_in += _in;
    strm.total_out += _out;
    state.total += _out;
    if ((state.wrap & 4) && _out) {
        strm.adler = state.check =
            (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
    }
    strm.data_type = state.bits + (state.last ? 64 : 0) +
        (state.mode === TYPE ? 128 : 0) +
        (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
    if (((_in === 0 && _out === 0) || flush === Z_FINISH$1) && ret === Z_OK$1) {
        ret = Z_BUF_ERROR;
    }
    return ret;
}
function inflateEnd(strm) {
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    let state = strm.state;
    if (state.window) {
        state.window = null;
    }
    strm.state = null;
    return Z_OK$1;
}
function inflateGetHeader(strm, head) {
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR$1;
    }
    state.head = head;
    head.done = false;
    return Z_OK$1;
}
function inflateSetDictionary(strm, dictionary) {
    const dictLength = dictionary.length;
    let state;
    let dictid;
    let ret;
    if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR$1;
    }
    if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
            return Z_DATA_ERROR$1;
        }
    }
    ret = updatewindow(strm, dictionary, dictLength, dictLength);
    if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR$1;
    }
    state.havedict = 1;
    return Z_OK$1;
}

let STR_APPLY_UIA_OK = true;
try {
    String.fromCharCode.apply(null, new Uint8Array(1));
}
catch (__) {
    STR_APPLY_UIA_OK = false;
}
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
    _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1;
function string2buf(str) {
    if (typeof TextEncoder === 'function' && TextEncoder.prototype.encode != undefined) {
        return new TextEncoder().encode(str);
    }
    let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
    for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
            c2 = str.charCodeAt(m_pos + 1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    buf = new Uint8Array(buf_len);
    for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
            c2 = str.charCodeAt(m_pos + 1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        if (c < 0x80) {
            buf[i++] = c;
        }
        else if (c < 0x800) {
            buf[i++] = 0xC0 | (c >>> 6);
            buf[i++] = 0x80 | (c & 0x3f);
        }
        else if (c < 0x10000) {
            buf[i++] = 0xE0 | (c >>> 12);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
        else {
            buf[i++] = 0xf0 | (c >>> 18);
            buf[i++] = 0x80 | (c >>> 12 & 0x3f);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
    }
    return buf;
}
function buf2binstring(buf, len) {
    if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK) {
            return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
        }
    }
    let result = '';
    for (let i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
    }
    return result;
}
function buf2string(buf, max) {
    const len = max || buf.length;
    if (typeof TextDecoder === 'function' && TextDecoder.prototype.decode != undefined) {
        return new TextDecoder().decode(buf.subarray(0, max));
    }
    let i, out;
    const utf16buf = new Array(len * 2);
    for (out = 0, i = 0; i < len;) {
        let c = buf[i++];
        if (c < 0x80) {
            utf16buf[out++] = c;
            continue;
        }
        let c_len = _utf8len[c];
        if (c_len > 4) {
            utf16buf[out++] = 0xfffd;
            i += c_len - 1;
            continue;
        }
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        while (c_len > 1 && i < len) {
            c = (c << 6) | (buf[i++] & 0x3f);
            c_len--;
        }
        if (c_len > 1) {
            utf16buf[out++] = 0xfffd;
            continue;
        }
        if (c < 0x10000) {
            utf16buf[out++] = c;
        }
        else {
            c -= 0x10000;
            utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
            utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
    }
    return buf2binstring(utf16buf, out);
}
function utf8border(buf, max) {
    max = max || buf.length;
    if (max > buf.length) {
        max = buf.length;
    }
    let pos = max - 1;
    while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) {
        pos--;
    }
    if (pos < 0) {
        return max;
    }
    if (pos === 0) {
        return max;
    }
    return (pos + _utf8len[buf[pos]] > max) ? pos : max;
}

class ZStream {
    constructor() {
        this.input = null;
        this.next_in = 0;
        this.avail_in = 0;
        this.total_in = 0;
        this.output = null;
        this.next_out = 0;
        this.avail_out = 0;
        this.total_out = 0;
        this.msg = '';
        this.state = null;
        this.data_type = 2;
        this.adler = 0;
    }
}

class GZheader {
    constructor() {
        this.text = 0;
        this.time = 0;
        this.xflags = 0;
        this.os = 0;
        this.extra = null;
        this.extra_len = 0;
        this.name = '';
        this.comment = '';
        this.hcrc = 0;
        this.done = false;
    }
}

function assign(obj, ...sources) {
    while (sources.length) {
        const source = sources.shift();
        if (!source) {
            continue;
        }
        if (typeof source !== 'object') {
            throw new TypeError(source + 'must be non-object');
        }
        for (const p in source) {
            if (Object.prototype.hasOwnProperty.call(source, p)) {
                obj[p] = source[p];
            }
        }
    }
    return obj;
}
function flattenChunks(chunks) {
    let len = 0;
    for (let i = 0, l = chunks.length; i < l; i++) {
        len += chunks[i].length;
    }
    const result = new Uint8Array(len);
    for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
        let chunk = chunks[i];
        result.set(chunk, pos);
        pos += chunk.length;
    }
    return result;
}
const utils = {
    assign,
    flattenChunks
};
const toString = Object.prototype.toString;
const { Z_NO_FLUSH, Z_SYNC_FLUSH, Z_FULL_FLUSH, Z_FINISH, Z_OK, Z_STREAM_END, Z_NEED_DICT, Z_STREAM_ERROR, Z_DATA_ERROR, Z_MEM_ERROR, Z_DEFAULT_COMPRESSION, Z_DEFAULT_STRATEGY, Z_DEFLATED } = constants;
class Deflate {
    constructor(options) {
        this.options = utils.assign({
            level: Z_DEFAULT_COMPRESSION,
            method: Z_DEFLATED,
            chunkSize: 16384,
            windowBits: 15,
            memLevel: 8,
            strategy: Z_DEFAULT_STRATEGY
        }, options || {});
        let opt = this.options;
        if (opt.raw && (opt.windowBits > 0)) {
            opt.windowBits = -opt.windowBits;
        }
        else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
            opt.windowBits += 16;
        }
        this.err = 0;
        this.msg = '';
        this.ended = false;
        this.chunks = [];
        this.strm = new ZStream();
        this.strm.avail_out = 0;
        let status = deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
        if (status !== Z_OK) {
            throw new Error(msg[status]);
        }
        if (opt.header) {
            deflateSetHeader(this.strm, opt.header);
        }
        if (opt.dictionary) {
            let dict;
            if (typeof opt.dictionary === 'string') {
                dict = string2buf(opt.dictionary);
            }
            else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
                dict = new Uint8Array(opt.dictionary);
            }
            else {
                dict = opt.dictionary;
            }
            status = deflateSetDictionary(this.strm, dict);
            if (status !== Z_OK) {
                throw new Error(msg[status]);
            }
            this._dict_set = true;
        }
    }
    push(data, flush_mode) {
        const strm = this.strm;
        const chunkSize = this.options.chunkSize;
        let status, _flush_mode;
        if (this.ended) {
            return false;
        }
        if (flush_mode === ~~flush_mode)
            _flush_mode = flush_mode;
        else
            _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
        if (typeof data === 'string') {
            strm.input = string2buf(data);
        }
        else if (toString.call(data) === '[object ArrayBuffer]') {
            strm.input = new Uint8Array(data);
        }
        else {
            strm.input = data;
        }
        strm.next_in = 0;
        strm.avail_in = strm.input.length;
        for (;;) {
            if (strm.avail_out === 0) {
                strm.output = new Uint8Array(chunkSize);
                strm.next_out = 0;
                strm.avail_out = chunkSize;
            }
            if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
                this.onData(strm.output.subarray(0, strm.next_out));
                strm.avail_out = 0;
                continue;
            }
            status = deflate$1(strm, _flush_mode);
            if (status === Z_STREAM_END) {
                if (strm.next_out > 0) {
                    this.onData(strm.output.subarray(0, strm.next_out));
                }
                status = deflateEnd(this.strm);
                this.onEnd(status);
                this.ended = true;
                return status === Z_OK;
            }
            if (strm.avail_out === 0) {
                this.onData(strm.output);
                continue;
            }
            if (_flush_mode > 0 && strm.next_out > 0) {
                this.onData(strm.output.subarray(0, strm.next_out));
                strm.avail_out = 0;
                continue;
            }
            if (strm.avail_in === 0)
                break;
        }
        return true;
    }
    ;
    onData(chunk) {
        this.chunks.push(chunk);
    }
    ;
    onEnd(status) {
        if (status === Z_OK) {
            this.result = utils.flattenChunks(this.chunks);
        }
        this.chunks = [];
        this.err = status;
        this.msg = this.strm.msg;
    }
    ;
}
function deflate(input, options) {
    const deflator = new Deflate(options);
    deflator.push(input, true);
    if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
    }
    return deflator.result;
}
function deflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return deflate(input, options);
}
function gzip(input, options) {
    options = options || {};
    options.gzip = true;
    return deflate(input, options);
}
class Inflate {
    constructor(options) {
        this.options = utils.assign({
            chunkSize: 1024 * 64,
            windowBits: 15,
            to: ''
        }, options || {});
        const opt = this.options;
        if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
            opt.windowBits = -opt.windowBits;
            if (opt.windowBits === 0) {
                opt.windowBits = -15;
            }
        }
        if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
            !(options && options.windowBits)) {
            opt.windowBits += 32;
        }
        if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
            if ((opt.windowBits & 15) === 0) {
                opt.windowBits |= 15;
            }
        }
        this.err = 0;
        this.msg = '';
        this.ended = false;
        this.chunks = [];
        this.strm = new ZStream();
        this.strm.avail_out = 0;
        let status = inflateInit2(this.strm, opt.windowBits);
        if (status !== Z_OK) {
            throw new Error(msg[status]);
        }
        this.header = new GZheader();
        inflateGetHeader(this.strm, this.header);
        if (opt.dictionary) {
            if (typeof opt.dictionary === 'string') {
                opt.dictionary = string2buf(opt.dictionary);
            }
            else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
                opt.dictionary = new Uint8Array(opt.dictionary);
            }
            if (opt.raw) {
                status = inflateSetDictionary(this.strm, opt.dictionary);
                if (status !== Z_OK) {
                    throw new Error(msg[status]);
                }
            }
        }
    }
    push(data, flush_mode) {
        const strm = this.strm;
        const chunkSize = this.options.chunkSize;
        const dictionary = this.options.dictionary;
        let status, _flush_mode, last_avail_out;
        if (this.ended)
            return false;
        if (flush_mode === ~~flush_mode)
            _flush_mode = flush_mode;
        else
            _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
        if (toString.call(data) === '[object ArrayBuffer]') {
            strm.input = new Uint8Array(data);
        }
        else {
            strm.input = data;
        }
        strm.next_in = 0;
        strm.avail_in = strm.input.length;
        for (;;) {
            if (strm.avail_out === 0) {
                strm.output = new Uint8Array(chunkSize);
                strm.next_out = 0;
                strm.avail_out = chunkSize;
            }
            status = inflate$1(strm, _flush_mode);
            if (status === Z_NEED_DICT && dictionary) {
                status = inflateSetDictionary(strm, dictionary);
                if (status === Z_OK) {
                    status = inflate$1(strm, _flush_mode);
                }
                else if (status === Z_DATA_ERROR) {
                    status = Z_NEED_DICT;
                }
            }
            while (strm.avail_in > 0 &&
                status === Z_STREAM_END &&
                strm.state.wrap > 0 &&
                data[strm.next_in] !== 0) {
                inflateReset(strm);
                status = inflate$1(strm, _flush_mode);
            }
            switch (status) {
                case Z_STREAM_ERROR:
                case Z_DATA_ERROR:
                case Z_NEED_DICT:
                case Z_MEM_ERROR:
                    this.onEnd(status);
                    this.ended = true;
                    return false;
            }
            last_avail_out = strm.avail_out;
            if (strm.next_out) {
                if (strm.avail_out === 0 || status === Z_STREAM_END) {
                    if (this.options.to === 'string') {
                        let next_out_utf8 = utf8border(strm.output, strm.next_out);
                        let tail = strm.next_out - next_out_utf8;
                        let utf8str = buf2string(strm.output, next_out_utf8);
                        strm.next_out = tail;
                        strm.avail_out = chunkSize - tail;
                        if (tail)
                            strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
                        this.onData(utf8str);
                    }
                    else {
                        this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
                    }
                }
            }
            if (status === Z_OK && last_avail_out === 0)
                continue;
            if (status === Z_STREAM_END) {
                status = inflateEnd(this.strm);
                this.onEnd(status);
                this.ended = true;
                return true;
            }
            if (strm.avail_in === 0)
                break;
        }
        return true;
    }
    ;
    onData(chunk) {
        this.chunks.push(chunk);
    }
    ;
    onEnd(status) {
        if (status === Z_OK) {
            if (this.options.to === 'string') {
                this.result = this.chunks.join('');
            }
            else {
                this.result = utils.flattenChunks(this.chunks);
            }
        }
        this.chunks = [];
        this.err = status;
        this.msg = this.strm.msg;
    }
    ;
}
function inflate(input, options) {
    const inflator = new Inflate(options);
    inflator.push(input, true);
    if (inflator.err)
        throw inflator.msg || msg[inflator.err];
    return inflator.result;
}
function inflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return inflate(input, options);
}
function ungzip(input, options) {
    options = options || {};
    return inflate(input, options);
}

function isBuffer$3(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$2(obj) {
    return obj instanceof Uint8Array || isBuffer$3(obj);
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
    COLORTYPE_COLOR: 2,
    COLORTYPE_COLOR_ALPHA: 6,
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
function CRC32(message) {
    var bytes;
    if (typeof message == "string") {
        for (var byte = [], i = 0; i < message.length; i++) {
            byte.push(message.charCodeAt(i) & 0xFF);
        }
        bytes = byte;
    }
    else if (arraybuffcheck$2(message)) {
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
function readPNG(src) {
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
    if (isBuffer$3(src)) {
        if (!isBuffer$3(unzipped)) {
            retval = Buffer.from(unzipped);
        }
    }
    else {
        if (isBuffer$3(unzipped)) {
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
function makePNG(src, width, height, noAlpha, issRGB) {
    if (!arraybuffcheck$2(src)) {
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
    const newfile = new pngjs.PNG(options);
    if (issRGB) {
        newfile.gamma = CONSTANTS.GAMMA_DIVISION;
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            newfile.data[idx] = src[idx];
            newfile.data[idx + 1] = src[idx + 1];
            newfile.data[idx + 2] = src[idx + 2];
            newfile.data[idx + 3] = src[idx + 3];
        }
    }
    return pngjs.PNG.sync.write(newfile, options);
}

function isBuffer$2(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck$1(obj) {
    return obj instanceof Uint8Array || isBuffer$2(obj);
}
const UNSIGNED = 0;
const SIGNED = 1;
const HALF_FLOAT = 2;
const FLOAT = 3;
const BYTE_VALUE = {
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
const COLOR_PROFILE = {
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
    if (inputBitSize === outputBitSize) {
        return value;
    }
    const maxInputValue = calMax(inputBitSize, isSigned);
    const minInputValue = calMin(inputBitSize, isSigned);
    if (value < minInputValue || value > maxInputValue) {
        throw new Error('Input value is out of range for the specified input bit size.');
    }
    const maxOutputValue = calMax(outputBitSize, isSigned);
    return (value * maxOutputValue) / maxInputValue;
}
function readProfile(str, totalSize) {
    const regexColorOrder = /^(r[1-9]\d*|g[1-9]\d*|b[1-9]\d*|a[1-9]\d*)+$/;
    if (!regexColorOrder.test(str.order)) {
        throw new Error(str + " is not a valid color profile.");
    }
    const matches = str.order.match(/[rgba](?!0)\d+/g);
    const order = {};
    if (!matches) {
        throw new Error(`No valid letter-value pairs found in ${str}.`);
    }
    const test = {};
    var index = 1;
    var pixSize = 0;
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (index > 4) {
            break;
        }
        const letter = match[0];
        const size = parseInt(match.slice(1), 10);
        if (test[letter]) {
            throw new Error(`${letter} can not be assigned twice in color profile.`);
        }
        pixSize += size;
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
function convertProfile(src, srcProfile, dstProfile, width, height) {
    if (!arraybuffcheck$1(src)) {
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
    const br = new bireader(src);
    const bw = new biwriter(dstData);
    for (let i = 0; i < srcPixels; i++) {
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
    if (isBuffer$2(src)) {
        return Buffer.from(retval);
    }
    return retval;
}

function isBuffer$1(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer$1(obj);
}
function flipImage(src, width, height, is24) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const output = isBuffer$1(src) ? Buffer.alloc(src.length) : new Uint8Array(src.length);
    var z = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var pos = (x + (height - y - 1) * width) << 2;
            output[pos + 0] = src[z + 0] & 0xFF;
            output[pos + 1] = src[z + 1] & 0xFF;
            output[pos + 2] = src[z + 2] & 0xFF;
            if (is24) {
                z += 3;
            }
            else {
                output[pos + 3] = src[z + 3] & 0xFF;
                z += 4;
            }
        }
    }
    return output;
}
function cropImage(src, width, height, srcBitsPerPixel) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const originalWidth = src.length / (height * srcBitsPerPixel);
    const originalHeight = src.length / (width * srcBitsPerPixel);
    const startX = Math.floor((originalWidth - width) / 2);
    const startY = Math.floor((originalHeight - height) / 2);
    var croppedData;
    if (isBuffer$1(src)) {
        croppedData = Buffer.alloc(width * height * srcBitsPerPixel);
    }
    else {
        croppedData = new Uint8Array(width * height * srcBitsPerPixel);
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = ((startY + y) * originalWidth + (startX + x)) * srcBitsPerPixel;
            const destIndex = (y * width + x) * srcBitsPerPixel;
            croppedData.set(src.subarray(sourceIndex, sourceIndex + srcBitsPerPixel), destIndex);
        }
    }
    return croppedData;
}

function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
function unswizzle(src, width, height, depth, bytesPerPixel, dstRowPitch, dstSlicePitch) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    if (bytesPerPixel <= 0 || bytesPerPixel == 3 || bytesPerPixel > 4) {
        throw new Error(`Bytes per pixel must be 1, 2 or 4. Got ` + bytesPerPixel);
    }
    const dwMaskX = new Int32Array([0]), dwMaskY = new Int32Array([0]), dwMaskZ = new Int32Array([0]);
    for (var i = 1, j = 1; (i < width) || (i < height) || (i < depth); i <<= 1) {
        if (i < width) {
            dwMaskX[0] |= j;
            j <<= 1;
        }
        if (i < height) {
            dwMaskY[0] |= j;
            j <<= 1;
        }
        if (i < depth) {
            dwMaskZ[0] |= j;
            j <<= 1;
        }
    }
    const dwStartX = 0;
    const dwStartY = 0;
    const dwStartZ = 0;
    const dwZ = new Int32Array([dwStartZ]);
    switch (bytesPerPixel) {
        case 1: {
            const pSrc = src;
            const pDstBuff = new Uint8Array(src.length);
            var pDestSlice = 0;
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice;
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]];
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0];
                    }
                    pDestRow += dstRowPitch;
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0];
                }
                pDestSlice += dstSlicePitch;
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0];
            }
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return pDstBuff;
        }
        case 2: {
            const pSrc = new Uint16Array(src.buffer);
            const pDstBuff = new Uint8Array(src.length / 2);
            var pDestSlice = 0;
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice;
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]];
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0];
                    }
                    pDestRow += dstRowPitch / 2;
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0];
                }
                pDestSlice += dstSlicePitch / 2;
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0];
            }
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
        }
        case 4: {
            const pSrc = new Uint32Array(src.buffer);
            const pDstBuff = new Uint32Array(src.length / 4);
            var pDestSlice = 0;
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice;
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]];
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0];
                    }
                    pDestRow += dstRowPitch / 4;
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0];
                }
                pDestSlice += dstSlicePitch / 4;
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0];
            }
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
        }
        default:
            return src;
    }
}
function memcpy(dest, dst_start, src, src_start, size) {
    for (let i = dst_start; i < size; i++) {
        dest[i] = src[src_start];
        src_start++;
    }
}
function untile(src, bytesPerBlock, pixelBlockWidth, pixelBlockHeigth, tileSize, width) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const bytes_per_element = bytesPerBlock;
    const size = src.length;
    var tile_width = tileSize / pixelBlockWidth;
    var tile_heigth = tileSize / pixelBlockHeigth;
    width /= pixelBlockWidth;
    var temp;
    if (isBuffer(src)) {
        temp = Buffer.alloc(size);
    }
    else {
        temp = new Uint8Array(size);
    }
    for (var i = 0; i < Math.floor(size / bytes_per_element / tile_width / tile_heigth); i++) {
        var tile_row = Math.floor(i / (width / tile_width));
        var tile_column = Math.floor(i % (width / tile_heigth));
        var tile_start = Math.floor(tile_row * width * tile_width + tile_column * tile_heigth);
        for (var j = 0; j < tile_width; j++) {
            memcpy(temp, bytes_per_element * (tile_start + j * width), src, bytes_per_element * (i * tile_width * tile_heigth + j * tile_width), tile_width * bytes_per_element);
        }
    }
    return temp;
}
function inflate_bits(x) {
    x &= 0x0000FFFF;
    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;
    return x;
}
function deflate_bits(x) {
    x &= 0x55555555;
    x = (x | (x >> 1)) & 0x33333333;
    x = (x | (x >> 2)) & 0x0F0F0F0F;
    x = (x | (x >> 4)) & 0x00FF00FF;
    x = (x | (x >> 8)) & 0x0000FFFF;
    return x;
}
function xy_to_morton(x, y) {
    return (inflate_bits(x) << 1) | (inflate_bits(y) << 0);
}
function morton_to_xy(z, x, y) {
    x[0] = deflate_bits(z >> 1);
    y[0] = deflate_bits(z >> 0);
}
function mortonize(src, packedBitsPerPixel, pixelBlockWidth, pixelBlockHeigth, mortonOrder, width, height, widthFactor) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const bits_per_element = packedBitsPerPixel * pixelBlockWidth * pixelBlockHeigth * widthFactor;
    const bytes_per_element = Math.floor(bits_per_element / 8);
    width /= pixelBlockWidth * widthFactor;
    height /= pixelBlockHeigth;
    var size = src.length;
    var num_elements = src.length / bytes_per_element;
    var k = Math.abs(mortonOrder);
    var reverse = (mortonOrder != k);
    if (!(bits_per_element % 8 == 0)) {
        throw new Error("asset(bits_per_element % 8 == 0)");
    }
    if (!(bytes_per_element * width * height == size)) {
        throw new Error("asset(bytes_per_element * width * height == size)");
    }
    if (!(width < 0x10000) && (height < 0x10000)) {
        throw new Error("asset((width < 0x10000) && (height < 0x10000))");
    }
    if (!(width % (1 << k) == 0)) {
        throw new Error("asset(width % (1 << k) == 0)");
    }
    if (!(height % (1 << k) == 0)) {
        throw new Error("asset(height % (1 << k) == 0)");
    }
    if (!(k <= Math.log2(Math.max(width, height)))) {
        throw new Error(`assert(k <= Math.log2(Math.max(width, height))))`);
    }
    var tile_width = 1 << k;
    var tile_size = tile_width * tile_width;
    var mask = tile_size - 1;
    var tmp_buf;
    if (isBuffer(src)) {
        tmp_buf = Buffer.alloc(size);
    }
    else {
        tmp_buf = new Uint8Array(size);
    }
    for (var i = 0; i < num_elements; i++) {
        var j = new Uint32Array([0]);
        var x = new Uint32Array([0]);
        var y = new Uint32Array([0]);
        if (reverse) {
            morton_to_xy(i & mask, x, y);
            x[0] += ((i / tile_size) % (width / tile_width)) * tile_width;
            y[0] += ((i / tile_size) / (width / tile_width)) * tile_width;
            j[0] = y[0] * width + x[0];
        }
        else {
            x[0] = i % width;
            y[0] = i / width;
            j[0] = xy_to_morton(x[0], y[0]) & mask;
            j[0] += ((y[0] / tile_width) * (width / tile_width) + (x[0] / tile_width)) * tile_size;
        }
        if (!(j[0] < num_elements)) {
            throw new Error("asset(j < num_elements)");
        }
        memcpy(tmp_buf, j[0] * bytes_per_element, src, i * bytes_per_element, bytes_per_element);
    }
    return tmp_buf;
}

exports.BYTE_VALUE = BYTE_VALUE;
exports.COLOR_PROFILE = COLOR_PROFILE;
exports.Deflate = Deflate;
exports.ETC_FORMAT = ETC_FORMAT;
exports.ETC_PROFILE = ETC_PROFILE;
exports.Inflate = Inflate;
exports.TGA_PROFILE = TGA_PROFILE;
exports.convertProfile = convertProfile;
exports.cropImage = cropImage;
exports.decodeASTC = decodeASTC;
exports.decodeASTC_10x10 = decodeASTC_10x10;
exports.decodeASTC_10x5 = decodeASTC_10x5;
exports.decodeASTC_10x6 = decodeASTC_10x6;
exports.decodeASTC_10x8 = decodeASTC_10x8;
exports.decodeASTC_12x10 = decodeASTC_12x10;
exports.decodeASTC_12x12 = decodeASTC_12x12;
exports.decodeASTC_4x4 = decodeASTC_4x4;
exports.decodeASTC_5x4 = decodeASTC_5x4;
exports.decodeASTC_5x5 = decodeASTC_5x5;
exports.decodeASTC_6x5 = decodeASTC_6x5;
exports.decodeASTC_6x6 = decodeASTC_6x6;
exports.decodeASTC_8x5 = decodeASTC_8x5;
exports.decodeASTC_8x6 = decodeASTC_8x6;
exports.decodeASTC_8x8 = decodeASTC_8x8;
exports.decodeATC = decodeATC;
exports.decodeATC4 = decodeATC4;
exports.decodeATC8 = decodeATC8;
exports.decodeATI = decodeATI;
exports.decodeATI1 = decodeATI1;
exports.decodeATI2 = decodeATI2;
exports.decodeBC1 = decodeBC1;
exports.decodeBC2 = decodeBC2;
exports.decodeBC3 = decodeBC3;
exports.decodeBC4 = decodeBC4;
exports.decodeBC5 = decodeBC5;
exports.decodeBC6 = decodeBC6;
exports.decodeBC6H = decodeBC6H;
exports.decodeBC6S = decodeBC6S;
exports.decodeBC7 = decodeBC7;
exports.decodeCRN = decodeCRN;
exports.decodeDXT1 = decodeDXT1;
exports.decodeDXT2 = decodeDXT2;
exports.decodeDXT3 = decodeDXT3;
exports.decodeDXT4 = decodeDXT4;
exports.decodeDXT5 = decodeDXT5;
exports.decodeEACR11 = decodeEACR11;
exports.decodeEACR11_SIGNED = decodeEACR11_SIGNED;
exports.decodeEACRG11 = decodeEACRG11;
exports.decodeEACRG11_SIGNED = decodeEACRG11_SIGNED;
exports.decodeETC = decodeETC;
exports.decodeETC1RGB = decodeETC1RGB;
exports.decodeETC1RGBA = decodeETC1RGBA;
exports.decodeETC2RGB = decodeETC2RGB;
exports.decodeETC2RGBA = decodeETC2RGBA;
exports.decodeETC2RGBA1 = decodeETC2RGBA1;
exports.decodeETC2sRGB = decodeETC2sRGB;
exports.decodeETC2sRGBA1 = decodeETC2sRGBA1;
exports.decodeETC2sRGBA8 = decodeETC2sRGBA8;
exports.decodePVRTC = decodePVRTC;
exports.decodePVRTC2bit = decodePVRTC2bit;
exports.decodePVRTC4bit = decodePVRTC4bit;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.flipImage = flipImage;
exports.getCRNMeta = getCRNMeta;
exports.gzip = gzip;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.makePNG = makePNG;
exports.makeTGA = makeTGA;
exports.mortonize = mortonize;
exports.readPNG = readPNG;
exports.ungzip = ungzip;
exports.unswizzle = unswizzle;
exports.untile = untile;
