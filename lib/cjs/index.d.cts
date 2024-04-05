import { ETC_PROFILE, ETC_FORMAT, decodeETC, decodeETC1RGB, decodeETC1RGBA, decodeEACR11, decodeEACR11_SIGNED, decodeEACRG11, decodeEACRG11_SIGNED, decodeETC2RGB, decodeETC2RGBA, decodeETC2RGBA1, decodeETC2sRGB, decodeETC2sRGBA1, decodeETC2sRGBA8 } from './etc';
import { decodeDXT1, decodeBC1, decodeDXT2, decodeDXT3, decodeBC2, decodeDXT4, decodeDXT5, decodeBC3 } from './dxt';
import { decodeATC, decodeATC4, decodeATC8, decodeATI, decodeATI1, decodeBC4, decodeATI2, decodeBC5 } from './atc';
import { decodePVRTC, decodePVRTC4bit, decodePVRTC2bit } from './pvrtc';
import { decodeASTC, decodeASTC_4x4, decodeASTC_5x4, decodeASTC_5x5, decodeASTC_6x5, decodeASTC_6x6, decodeASTC_8x5, decodeASTC_8x6, decodeASTC_8x8, decodeASTC_10x5, decodeASTC_10x6, decodeASTC_10x8, decodeASTC_10x10, decodeASTC_12x10, decodeASTC_12x12 } from './astc';
import { decodeBC6, decodeBC6H, decodeBC6S } from './bc6';
import { decodeBC7 } from './bc7';
import { getCRNMeta, decodeCRN } from './crn2';
import { makeTGA, TGA_PROFILE } from './tga_maker';
import { readPNG, makePNG } from './png_maker';
import { COLOR_PROFILE, BYTE_VALUE, convertProfile } from './profiler';
import { flipImage, cropImage } from './flipper';
import { inflate, Inflate, deflate, Deflate, deflateRaw, inflateRaw, gzip, ungzip } from './deflate/index';
import { unswizzle, mortonize, untile } from './unswizzling';
export { ETC_PROFILE, ETC_FORMAT, decodeETC, decodeETC1RGB, decodeETC1RGBA, decodeEACR11, decodeEACR11_SIGNED, decodeEACRG11, decodeEACRG11_SIGNED, decodeETC2RGB, decodeETC2RGBA, decodeETC2RGBA1, decodeETC2sRGB, decodeETC2sRGBA1, decodeETC2sRGBA8, decodeDXT1, decodeBC1, decodeDXT2, decodeDXT3, decodeBC2, decodeDXT4, decodeDXT5, decodeBC3, decodeATC, decodeATC4, decodeATC8, decodeATI, decodeATI1, decodeBC4, decodeATI2, decodeBC5, decodePVRTC, decodePVRTC4bit, decodePVRTC2bit, decodeASTC, decodeASTC_4x4, decodeASTC_5x4, decodeASTC_5x5, decodeASTC_6x5, decodeASTC_6x6, decodeASTC_8x5, decodeASTC_8x6, decodeASTC_8x8, decodeASTC_10x5, decodeASTC_10x6, decodeASTC_10x8, decodeASTC_10x10, decodeASTC_12x10, decodeASTC_12x12, decodeBC6, decodeBC6H, decodeBC6S, decodeBC7, getCRNMeta, decodeCRN, makeTGA, TGA_PROFILE, readPNG, makePNG, COLOR_PROFILE, BYTE_VALUE, convertProfile, flipImage, cropImage, inflate, Inflate, deflate, Deflate, deflateRaw, inflateRaw, gzip, ungzip, unswizzle, mortonize, untile };
//# sourceMappingURL=index.d.ts.map