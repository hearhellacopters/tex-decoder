export { ETC_PROFILE, ETC_FORMAT, decodeETC, decodeETC1RGB, decodeETC1RGBA, decodeEACR11, decodeEACR11_SIGNED, decodeEACRG11, decodeEACRG11_SIGNED, decodeETC2RGB, decodeETC2RGBA, decodeETC2RGBA1, decodeETC2sRGB, decodeETC2sRGBA1, decodeETC2sRGBA8 } from './etc';
export { decodeDXT1, decodeBC1, decodeDXT2, decodeDXT3, decodeBC2, decodeDXT4, decodeDXT5, decodeBC3, } from './dxt';
export { decodeATC, decodeATC4, decodeATC8, decodeATI, decodeATI1, decodeBC4, decodeATI2, decodeBC5 } from './atc';
export { decodePVRTC, decodePVRTC4bit, decodePVRTC2bit } from './pvrtc';
export { decodeASTC, decodeASTC_4x4, decodeASTC_5x4, decodeASTC_5x5, decodeASTC_6x5, decodeASTC_6x6, decodeASTC_8x5, decodeASTC_8x6, decodeASTC_8x8, decodeASTC_10x5, decodeASTC_10x6, decodeASTC_10x8, decodeASTC_10x10, decodeASTC_12x10, decodeASTC_12x12, } from './astc';
export { decodeBC6, decodeBC6H, decodeBC6S } from './bc6';
export { decodeBC7 } from './bc7';
export { getCRNMeta, decodeCRN } from './crn2';
export { makeTGA, TGA_PROFILE } from './tga_maker';
export { readPNG, makePNG, makePNG2 } from './png_maker';
export { COLORPROFILE, BYTE_VALUE, convertProfile, } from './profiler';
export { flipImage, cropImage } from './flipper';
export { inflate, Inflate, deflate, Deflate, deflateRaw, inflateRaw, gzip, ungzip } from './deflate/index';
export { unswizzle } from './unswizzling';
//# sourceMappingURL=index.d.ts.map