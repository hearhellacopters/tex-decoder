"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBC6 = exports.decodeASTC_12x12 = exports.decodeASTC_12x10 = exports.decodeASTC_10x10 = exports.decodeASTC_10x8 = exports.decodeASTC_10x6 = exports.decodeASTC_10x5 = exports.decodeASTC_8x8 = exports.decodeASTC_8x6 = exports.decodeASTC_8x5 = exports.decodeASTC_6x6 = exports.decodeASTC_6x5 = exports.decodeASTC_5x5 = exports.decodeASTC_5x4 = exports.decodeASTC_4x4 = exports.decodeASTC = exports.decodePVRTC2bit = exports.decodePVRTC4bit = exports.decodePVRTC = exports.decodeBC5 = exports.decodeATI2 = exports.decodeBC4 = exports.decodeATI1 = exports.decodeATI = exports.decodeATC8 = exports.decodeATC4 = exports.decodeATC = exports.decodeBC3 = exports.decodeDXT5 = exports.decodeDXT4 = exports.decodeBC2 = exports.decodeDXT3 = exports.decodeDXT2 = exports.decodeBC1 = exports.decodeDXT1 = exports.decodeETC2sRGBA8 = exports.decodeETC2sRGBA1 = exports.decodeETC2sRGB = exports.decodeETC2RGBA1 = exports.decodeETC2RGBA = exports.decodeETC2RGB = exports.decodeEACRG11_SIGNED = exports.decodeEACRG11 = exports.decodeEACR11_SIGNED = exports.decodeEACR11 = exports.decodeETC1RGBA = exports.decodeETC1RGB = exports.decodeETC = exports.ETC_FORMAT = exports.ETC_PROFILE = void 0;
exports.untile = exports.mortonize = exports.unswizzle = exports.ungzip = exports.gzip = exports.inflateRaw = exports.deflateRaw = exports.Deflate = exports.deflate = exports.Inflate = exports.inflate = exports.cropImage = exports.flipImage = exports.convertProfile = exports.BYTE_VALUE = exports.COLOR_PROFILE = exports.makePNG = exports.readPNG = exports.TGA_PROFILE = exports.makeTGA = exports.decodeCRN = exports.getCRNMeta = exports.decodeBC7 = exports.decodeBC6S = exports.decodeBC6H = void 0;
const etc_1 = require("./etc");
Object.defineProperty(exports, "ETC_PROFILE", { enumerable: true, get: function () { return etc_1.ETC_PROFILE; } });
Object.defineProperty(exports, "ETC_FORMAT", { enumerable: true, get: function () { return etc_1.ETC_FORMAT; } });
Object.defineProperty(exports, "decodeETC", { enumerable: true, get: function () { return etc_1.decodeETC; } });
Object.defineProperty(exports, "decodeETC1RGB", { enumerable: true, get: function () { return etc_1.decodeETC1RGB; } });
Object.defineProperty(exports, "decodeETC1RGBA", { enumerable: true, get: function () { return etc_1.decodeETC1RGBA; } });
Object.defineProperty(exports, "decodeEACR11", { enumerable: true, get: function () { return etc_1.decodeEACR11; } });
Object.defineProperty(exports, "decodeEACR11_SIGNED", { enumerable: true, get: function () { return etc_1.decodeEACR11_SIGNED; } });
Object.defineProperty(exports, "decodeEACRG11", { enumerable: true, get: function () { return etc_1.decodeEACRG11; } });
Object.defineProperty(exports, "decodeEACRG11_SIGNED", { enumerable: true, get: function () { return etc_1.decodeEACRG11_SIGNED; } });
Object.defineProperty(exports, "decodeETC2RGB", { enumerable: true, get: function () { return etc_1.decodeETC2RGB; } });
Object.defineProperty(exports, "decodeETC2RGBA", { enumerable: true, get: function () { return etc_1.decodeETC2RGBA; } });
Object.defineProperty(exports, "decodeETC2RGBA1", { enumerable: true, get: function () { return etc_1.decodeETC2RGBA1; } });
Object.defineProperty(exports, "decodeETC2sRGB", { enumerable: true, get: function () { return etc_1.decodeETC2sRGB; } });
Object.defineProperty(exports, "decodeETC2sRGBA1", { enumerable: true, get: function () { return etc_1.decodeETC2sRGBA1; } });
Object.defineProperty(exports, "decodeETC2sRGBA8", { enumerable: true, get: function () { return etc_1.decodeETC2sRGBA8; } });
const dxt_1 = require("./dxt");
Object.defineProperty(exports, "decodeDXT1", { enumerable: true, get: function () { return dxt_1.decodeDXT1; } });
Object.defineProperty(exports, "decodeBC1", { enumerable: true, get: function () { return dxt_1.decodeBC1; } });
Object.defineProperty(exports, "decodeDXT2", { enumerable: true, get: function () { return dxt_1.decodeDXT2; } });
Object.defineProperty(exports, "decodeDXT3", { enumerable: true, get: function () { return dxt_1.decodeDXT3; } });
Object.defineProperty(exports, "decodeBC2", { enumerable: true, get: function () { return dxt_1.decodeBC2; } });
Object.defineProperty(exports, "decodeDXT4", { enumerable: true, get: function () { return dxt_1.decodeDXT4; } });
Object.defineProperty(exports, "decodeDXT5", { enumerable: true, get: function () { return dxt_1.decodeDXT5; } });
Object.defineProperty(exports, "decodeBC3", { enumerable: true, get: function () { return dxt_1.decodeBC3; } });
const atc_1 = require("./atc");
Object.defineProperty(exports, "decodeATC", { enumerable: true, get: function () { return atc_1.decodeATC; } });
Object.defineProperty(exports, "decodeATC4", { enumerable: true, get: function () { return atc_1.decodeATC4; } });
Object.defineProperty(exports, "decodeATC8", { enumerable: true, get: function () { return atc_1.decodeATC8; } });
Object.defineProperty(exports, "decodeATI", { enumerable: true, get: function () { return atc_1.decodeATI; } });
Object.defineProperty(exports, "decodeATI1", { enumerable: true, get: function () { return atc_1.decodeATI1; } });
Object.defineProperty(exports, "decodeBC4", { enumerable: true, get: function () { return atc_1.decodeBC4; } });
Object.defineProperty(exports, "decodeATI2", { enumerable: true, get: function () { return atc_1.decodeATI2; } });
Object.defineProperty(exports, "decodeBC5", { enumerable: true, get: function () { return atc_1.decodeBC5; } });
const pvrtc_1 = require("./pvrtc");
Object.defineProperty(exports, "decodePVRTC", { enumerable: true, get: function () { return pvrtc_1.decodePVRTC; } });
Object.defineProperty(exports, "decodePVRTC4bit", { enumerable: true, get: function () { return pvrtc_1.decodePVRTC4bit; } });
Object.defineProperty(exports, "decodePVRTC2bit", { enumerable: true, get: function () { return pvrtc_1.decodePVRTC2bit; } });
const astc_1 = require("./astc");
Object.defineProperty(exports, "decodeASTC", { enumerable: true, get: function () { return astc_1.decodeASTC; } });
Object.defineProperty(exports, "decodeASTC_4x4", { enumerable: true, get: function () { return astc_1.decodeASTC_4x4; } });
Object.defineProperty(exports, "decodeASTC_5x4", { enumerable: true, get: function () { return astc_1.decodeASTC_5x4; } });
Object.defineProperty(exports, "decodeASTC_5x5", { enumerable: true, get: function () { return astc_1.decodeASTC_5x5; } });
Object.defineProperty(exports, "decodeASTC_6x5", { enumerable: true, get: function () { return astc_1.decodeASTC_6x5; } });
Object.defineProperty(exports, "decodeASTC_6x6", { enumerable: true, get: function () { return astc_1.decodeASTC_6x6; } });
Object.defineProperty(exports, "decodeASTC_8x5", { enumerable: true, get: function () { return astc_1.decodeASTC_8x5; } });
Object.defineProperty(exports, "decodeASTC_8x6", { enumerable: true, get: function () { return astc_1.decodeASTC_8x6; } });
Object.defineProperty(exports, "decodeASTC_8x8", { enumerable: true, get: function () { return astc_1.decodeASTC_8x8; } });
Object.defineProperty(exports, "decodeASTC_10x5", { enumerable: true, get: function () { return astc_1.decodeASTC_10x5; } });
Object.defineProperty(exports, "decodeASTC_10x6", { enumerable: true, get: function () { return astc_1.decodeASTC_10x6; } });
Object.defineProperty(exports, "decodeASTC_10x8", { enumerable: true, get: function () { return astc_1.decodeASTC_10x8; } });
Object.defineProperty(exports, "decodeASTC_10x10", { enumerable: true, get: function () { return astc_1.decodeASTC_10x10; } });
Object.defineProperty(exports, "decodeASTC_12x10", { enumerable: true, get: function () { return astc_1.decodeASTC_12x10; } });
Object.defineProperty(exports, "decodeASTC_12x12", { enumerable: true, get: function () { return astc_1.decodeASTC_12x12; } });
const bc6_1 = require("./bc6");
Object.defineProperty(exports, "decodeBC6", { enumerable: true, get: function () { return bc6_1.decodeBC6; } });
Object.defineProperty(exports, "decodeBC6H", { enumerable: true, get: function () { return bc6_1.decodeBC6H; } });
Object.defineProperty(exports, "decodeBC6S", { enumerable: true, get: function () { return bc6_1.decodeBC6S; } });
const bc7_1 = require("./bc7");
Object.defineProperty(exports, "decodeBC7", { enumerable: true, get: function () { return bc7_1.decodeBC7; } });
const crn2_1 = require("./crn2");
Object.defineProperty(exports, "getCRNMeta", { enumerable: true, get: function () { return crn2_1.getCRNMeta; } });
Object.defineProperty(exports, "decodeCRN", { enumerable: true, get: function () { return crn2_1.decodeCRN; } });
// export {
//     decodeFXT1
// } from './fxt1.ts'
// export {
//     decodePVRTCII4bit
// } from './pvrtcii.ts'
const tga_maker_1 = require("./tga_maker");
Object.defineProperty(exports, "makeTGA", { enumerable: true, get: function () { return tga_maker_1.makeTGA; } });
Object.defineProperty(exports, "TGA_PROFILE", { enumerable: true, get: function () { return tga_maker_1.TGA_PROFILE; } });
const png_maker_1 = require("./png_maker");
Object.defineProperty(exports, "readPNG", { enumerable: true, get: function () { return png_maker_1.readPNG; } });
Object.defineProperty(exports, "makePNG", { enumerable: true, get: function () { return png_maker_1.makePNG; } });
const profiler_1 = require("./profiler");
Object.defineProperty(exports, "COLOR_PROFILE", { enumerable: true, get: function () { return profiler_1.COLOR_PROFILE; } });
Object.defineProperty(exports, "BYTE_VALUE", { enumerable: true, get: function () { return profiler_1.BYTE_VALUE; } });
Object.defineProperty(exports, "convertProfile", { enumerable: true, get: function () { return profiler_1.convertProfile; } });
const flipper_1 = require("./flipper");
Object.defineProperty(exports, "flipImage", { enumerable: true, get: function () { return flipper_1.flipImage; } });
Object.defineProperty(exports, "cropImage", { enumerable: true, get: function () { return flipper_1.cropImage; } });
const index_1 = require("./deflate/index");
Object.defineProperty(exports, "inflate", { enumerable: true, get: function () { return index_1.inflate; } });
Object.defineProperty(exports, "Inflate", { enumerable: true, get: function () { return index_1.Inflate; } });
Object.defineProperty(exports, "deflate", { enumerable: true, get: function () { return index_1.deflate; } });
Object.defineProperty(exports, "Deflate", { enumerable: true, get: function () { return index_1.Deflate; } });
Object.defineProperty(exports, "deflateRaw", { enumerable: true, get: function () { return index_1.deflateRaw; } });
Object.defineProperty(exports, "inflateRaw", { enumerable: true, get: function () { return index_1.inflateRaw; } });
Object.defineProperty(exports, "gzip", { enumerable: true, get: function () { return index_1.gzip; } });
Object.defineProperty(exports, "ungzip", { enumerable: true, get: function () { return index_1.ungzip; } });
const unswizzling_1 = require("./unswizzling");
Object.defineProperty(exports, "unswizzle", { enumerable: true, get: function () { return unswizzling_1.unswizzle; } });
Object.defineProperty(exports, "mortonize", { enumerable: true, get: function () { return unswizzling_1.mortonize; } });
Object.defineProperty(exports, "untile", { enumerable: true, get: function () { return unswizzling_1.untile; } });
//# sourceMappingURL=index.js.map