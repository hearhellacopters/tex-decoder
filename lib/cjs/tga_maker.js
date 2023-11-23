"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeTGA = exports.TGA_PROFILE = void 0;
const flipper_1 = require("./flipper");
const RGB = 24;
const RGBA = 32;
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
exports.TGA_PROFILE = {
    RGB,
    RGBA
};
/**
 * Create a .TGA file. Must be straight RGBA or RGB profile.
 *
 * @param {Uint8Array|Buffer} src - source as RGB or RGBA
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {boolean} noAlpha - Color profile is RGB (default RGBA)
 * @returns
 */
function makeTGA(src, width, height, noAlpha) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    var profile = 32;
    if (noAlpha) {
        profile = 24;
    }
    const header = new Uint8Array(18);
    header[2] = 2;
    //write width
    header[12] = width & 0xff;
    header[13] = (width >> 8) & 0xff;
    //write height
    header[14] = height & 0xff;
    header[15] = (height >> 8) & 0xff;
    header[16] = profile;
    header[17] = profile == 32 ? 8 : 0;
    const data = (0, flipper_1.flipImage)(src, width, height, profile == 32 ? false : true);
    const footer_text = "\0\0\0\0\0\0\0\0TRUEVISION-XFILE.\0";
    const footer = new TextEncoder().encode(footer_text);
    const final_data = new Uint8Array([...header, ...data, ...footer]);
    return final_data;
}
exports.makeTGA = makeTGA;
//# sourceMappingURL=tga_maker.js.map