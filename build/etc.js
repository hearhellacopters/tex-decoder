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
function ALPHA_CHANNEL(img, width, x, y, channels, value) {
    img[channels * (y * width + x) + 3] = value;
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
    if (p == PATTERN_T) {
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
    else {
        throw Error("Invalid pattern. Terminating");
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
function decompressBlockTHUMB59T(block_part1, block_part2, img, width, height, startx, starty) {
    decompressBlockTHUMB59Tc(block_part1, block_part2, img, width, height, startx, starty, 3);
}
function calculatePaintColors58H(d, p, colors, possible_colors) {
    possible_colors[3][R] = CLAMP(0, colors[1][R] - table58H[d], 255);
    possible_colors[3][G] = CLAMP(0, colors[1][G] - table58H[d], 255);
    possible_colors[3][B] = CLAMP(0, colors[1][B] - table58H[d], 255);
    if (p == PATTERN_H) {
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
    else {
        throw Error("Invalid pattern. Terminating");
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
function decompressBlockTHUMB58H(block_part1, block_part2, img, width, height, startx, starty) {
    decompressBlockTHUMB58Hc(block_part1, block_part2, img, width, height, startx, starty, 3);
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
function decompressBlockPlanar57(compressed57_1, compressed57_2, img, width, height, startx, starty) {
    decompressBlockPlanar57c(compressed57_1, compressed57_2, img, width, height, startx, starty, 3);
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
function decompressBlockDiffFlip(block_part1, block_part2, dstImage, width, height, startx, starty) {
    decompressBlockDiffFlipC(block_part1, block_part2, dstImage, width, height, startx, starty, 3);
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
function decompressBlockETC2(block_part1, block_part2, img, width, height, startx, starty) {
    decompressBlockETC2c(block_part1, block_part2, img, width, height, startx, starty, 3);
}
function decompressBlockDifferentialWithAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, channelsRGB) {
    const avg_color = new Uint8Array(3);
    const enc_color1 = new Uint8Array(3);
    const enc_color2 = new Uint8Array(3);
    const diff = new Int8Array(3);
    var table;
    var index;
    var shift;
    var r, g, b;
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
                r = RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                g = GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                b = BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    r = RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    g = GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    b = BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
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
                r = RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                g = GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                b = BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    r = RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    g = GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    b = BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
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
                r = RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                g = GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                b = BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    r = RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    g = GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    b = BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
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
                r = RED_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[0] + mod, 255));
                g = GREEN_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[1] + mod, 255));
                b = BLUE_CHANNEL(img, width, x, y, channelsRGB, CLAMP(0, avg_color[2] + mod, 255));
                if (diffbit == 0 && index == 1) {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 0;
                    r = RED_CHANNEL(img, width, x, y, channelsRGB, 0);
                    g = GREEN_CHANNEL(img, width, x, y, channelsRGB, 0);
                    b = BLUE_CHANNEL(img, width, x, y, channelsRGB, 0);
                }
                else {
                    alpha[alpha_off + ((y * width + x) * channelsA)] = 255;
                }
            }
            shift += 2;
        }
    }
}
function decompressBlockDifferentialWithAlpha(block_part1, block_part2, img, alpha, width, height, startx, starty) {
    decompressBlockDifferentialWithAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, 3);
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
function decompressBlockTHUMB59TAlpha(block_part1, block_part2, img, alpha, width, height, startx, starty) {
    decompressBlockTHUMB59TAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, 3);
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
function decompressBlockTHUMB58HAlpha(block_part1, block_part2, img, alpha, width, height, startx, starty) {
    decompressBlockTHUMB58HAlphaC(block_part1, block_part2, img, alpha, width, height, startx, starty, 3);
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
function decompressBlockETC21BitAlpha(block_part1, block_part2, img, alphaimg, width, height, startx, starty) {
    decompressBlockETC21BitAlphaC(block_part1, block_part2, img, alphaimg, width, height, startx, starty, 3);
}
function getbit(input, frompos, topos) {
    if (frompos > topos)
        return (((1 << frompos) & input) >> (frompos - topos)) & 0xFF;
    return (((1 << frompos) & input) << (topos - frompos)) & 0xFF;
}
function clamp(val) {
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
            img[dstoff + ((ix + x + (iy + y) * width) * channels)] = clamp(alpha + alphaTable[table][index]);
        }
    }
}
function decompressBlockAlpha(data, srcoff, img, dstoff, width, height, ix, iy) {
    decompressBlockAlphaC(data, srcoff, img, dstoff, width, height, ix, iy, 1);
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
function decompressBlockAlpha16bit(data, srcoff, img, dstoff, width, height, ix, iy) {
    decompressBlockAlpha16bitC(data, srcoff, img, dstoff, width, height, ix, iy, 1);
}
function readBigEndian4byteWord(s, srcoff) {
    var pBlock = new Uint32Array(1);
    pBlock[0] = ((s[srcoff] & 0xFF) << 24) | ((s[srcoff + 1] & 0xFF) << 16) | ((s[srcoff + 2] & 0xFF) << 8) | (s[srcoff + 3] & 0xFF);
    return pBlock[0];
}
function check_size(width, height, bpp, src) {
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
export const ETC_FORMAT = {
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
const RGB = 1;
const RGBA = 2;
export const ETC_PROFILE = {
    RGB,
    RGBA
};
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
export function decodeETC1RGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC1_RGB, forceRGBorRGBA);
}
export function decodeETC2RGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGB, forceRGBorRGBA);
}
export function decodeETC1RGBA(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC1_RGBA8, forceRGBorRGBA);
}
export function decodeETC2RGBA(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGBA8, forceRGBorRGBA);
}
export function decodeETC2RGBA1(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_RGBA1, forceRGBorRGBA);
}
export function decodeEACR11(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_R11, forceRGBorRGBA);
}
export function decodeEACRG11(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_RG11, forceRGBorRGBA);
}
export function decodeEACR11_SIGNED(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_R11_SIGNED, forceRGBorRGBA);
}
export function decodeEACRG11_SIGNED(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.EAC_RG11_SIGNED, forceRGBorRGBA);
}
export function decodeETC2sRGB(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGB, forceRGBorRGBA);
}
export function decodeETC2sRGBA8(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGBA8, forceRGBorRGBA);
}
export function decodeETC2sRGBA1(src, width, height, forceRGBorRGBA) {
    return decodeETC(src, width, height, ETC_FORMAT.ETC2_SRGBA1, forceRGBorRGBA);
}
export function decodeETC(src, width, height, ETC_FORMAT, forceRGBorRGBA) {
    if (!arraybuffcheck(src)) {
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
            check_size(width, height, 8, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_R11:
            dstChannelBytes = 2;
            dstChannels = 1;
            formatSigned = false;
            format = "R";
            check_size(width, height, 8, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_RG11_SIGNED:
            dstChannelBytes = 2;
            dstChannels = 2;
            formatSigned = true;
            format = "RG";
            check_size(width, height, 16, src);
            alphaFormat = AF_11BIT;
            break;
        case EAC_RG11:
            dstChannelBytes = 2;
            dstChannels = 2;
            formatSigned = false;
            format = "RG";
            check_size(width, height, 16, src);
            alphaFormat = AF_11BIT;
            break;
        case ETC1_RGB:
        case ETC2_RGB:
        case ETC1_RGBA8:
            dstChannelBytes = 1;
            dstChannels = 3;
            format = ETC_FORMAT == ETC1_RGBA8 ? "RGB_A" : "RGB";
            check_size(width, height, 8, src);
            break;
        case ETC2_RGBA8:
            dstChannelBytes = 1;
            dstChannels = 4;
            format = "RGBA";
            check_size(width, height, 16, src);
            alphaFormat = AF_8BIT;
            break;
        case ETC2_RGBA1:
            dstChannelBytes = 1;
            dstChannels = 4;
            format = "RGBA";
            check_size(width, height, 8, src);
            alphaFormat = AF_1BIT;
            break;
        case ETC2_SRGB:
            dstChannelBytes = 1;
            dstChannels = 3;
            format = "RGB";
            check_size(width, height, 8, src);
            break;
        case ETC2_SRGBA8:
            dstChannelBytes = 1;
            dstChannels = 4;
            check_size(width, height, 16, src);
            format = "RGBA";
            alphaFormat = AF_8BIT;
            break;
        case ETC2_SRGBA1:
            dstChannelBytes = 1;
            dstChannels = 4;
            check_size(width, height, 8, src);
            format = "RGBA";
            alphaFormat = AF_1BIT;
            break;
        default:
            throw new Error("Unsupported srcFormat");
    }
    var dstImage = isBuffer(src) ? Buffer.alloc(dstChannels * dstChannelBytes * width * height) : new Uint8Array(dstChannels * dstChannelBytes * width * height);
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
                var newimg = isBuffer(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
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
                    if (forceRGBorRGBA == RGBA) {
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
                var newimg = isBuffer(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
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
                    if (forceRGBorRGBA == RGBA) {
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
                var newimg = isBuffer(src) ? Buffer.alloc(4 * width * height) : new Uint8Array(4 * width * height);
                var total = dstImage.length;
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 3) {
                    newimg[new_image_off] = dstImage[yy];
                    newimg[new_image_off + 1] = dstImage[yy + 1];
                    newimg[new_image_off + 2] = dstImage[yy + 2];
                    if (forceRGBorRGBA == RGBA) {
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
                var newimg = isBuffer(src) ? Buffer.alloc(4 * width * (height / 2)) : new Uint8Array(4 * width * (height / 2));
                var alph_off = 3 * width * (height / 2);
                var total = 3 * width * (height / 2);
                var new_image_off = 0;
                for (var yy = 0; yy < total; yy += 3) {
                    newimg[new_image_off] = dstImage[yy];
                    newimg[new_image_off + 1] = dstImage[yy + 1];
                    newimg[new_image_off + 2] = dstImage[yy + 2];
                    if (forceRGBorRGBA == RGBA) {
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
            default:
                break;
        }
    }
    return dstImage;
}
