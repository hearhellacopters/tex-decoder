/// <reference types="node" />
type uint8 = Buffer | Uint8Array;
export declare function decompressColor(R_B: number, G_B: number, B_B: number, colors_RGB444: Uint8Array[], colors: Uint8Array[]): void;
export declare function calculatePaintColors59T(/**uint8 */ d: number, /**uint8 */ p: number, colors: Uint8Array[], possible_colors: Uint8Array[]): void;
export declare function decompressBlockTHUMB59T(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ img: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function calculatePaintColors58H(/**uint8*/ d: number, /**uint8*/ p: number, colors: Uint8Array[], possible_colors: Uint8Array[]): void;
export declare function decompressBlockTHUMB58H(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ img: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockPlanar57(/**unsigned int*/ compressed57_1: number, /**unsigned int*/ compressed57_2: number, /**uint8 * */ img: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockDiffFlip(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ dstImage: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockETC2(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ img: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockDifferentialWithAlpha(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8* */ img: uint8, /**uint8* */ alpha: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockTHUMB59TAlpha(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ img: uint8, /**uint8* */ alpha: uint8, /**int*/ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function decompressBlockTHUMB58HAlpha(/**unsigned int*/ block_part1: number, /**unsigned int*/ block_part2: number, /**uint8 * */ img: uint8, /**uint8* */ alpha: uint8, /**int */ width: number, /**int*/ height: number, /**int*/ startx: number, /**int*/ starty: number): void;
export declare function getbit(input: number, frompos: number, topos: number): number;
export declare function clamp(val: number): number;
export declare function get16bits11signed(/**int*/ base: number, /**int*/ table: number, /**int*/ mul: number, /**int*/ index: number): number;
export declare function get16bits11bits(/**int*/ base: number, /**int*/ table: number, /**int*/ mul: number, /**int*/ index: number): number;
/**
 * ```
 * 0  = ETC1_RGB;        // Basic ETC
 * 1  = ETC2_RGB;        // Basic ETC2 without alpha
 * 2  = ETC1_RGBA8;      // Same as 0 but with alpha stored as second image (double height)
 * 3  = ETC2_RGBA8;      // Basic ETC2 with alpha
 * 4  = ETC2_RGBA1;      // ETC2 with punchthrough alpha
 * 5  = EAC_R11;         // Red channel 11 bits
 * 6  = EAC_RG11;        // Red & Green channel 11 bits
 * 7  = EAC_R11_SIGNED;  // Red channel signed 11 bits
 * 8  = EAC_RG11_SIGNED; // Red & Green channel signed 11 bits
 * 9  = ETC2_SRGB;       // Basic ETC2 without alpha as sRGB
 * 10 = ETC2_SRGBA8;     // Basic ETC2 with alpha as sRGB
 * 11 = ETC2_SRGBA1;     // ETC2 sRGB with punchthrough alpha
 * ```
 * @enum {number}
 */
export declare const ETC_FORMAT: {
    ETC1_RGB: number;
    ETC2_RGB: number;
    ETC1_RGBA8: number;
    ETC2_RGBA8: number;
    ETC2_RGBA1: number;
    EAC_R11: number;
    EAC_RG11: number;
    EAC_R11_SIGNED: number;
    EAC_RG11_SIGNED: number;
    ETC2_SRGB: number;
    ETC2_SRGBA8: number;
    ETC2_SRGBA1: number;
};
/**
* ```
* 1  = RGB;
* 2  = RGBA;
* ```
*/
export declare const ETC_PROFILE: {
    RGB: number;
    RGBA: number;
};
/**
* Decompress ETC1RGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC1RGB(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2RGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGB(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC1RGB with Alpha Data. Alpha stored as second image (double height). Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC1RGBA(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2RGBA Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGBA(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2RGBA1 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGBA1(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress EACR11 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACR11(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress EACRG11 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACRG11(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress EACR11 SIGNED Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACR11_SIGNED(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress RG11 SIGNED Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACRG11_SIGNED(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2sRGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGB(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2sRGBA8 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGBA8(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC2sRGBA1 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGBA1(src: uint8, width: number, height: number, forceRGBorRGBA?: number): uint8;
/**
* Decompress ETC Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {uint8} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} ETC_FORMAT -
* ```js
* // use import ETC_FORMAT.yourFormat
* import { ETC_FORMAT } from 'tex-decoder';
* 0  = ETC_FORMAT.ETC1_RGB;
* 1  = ETC_FORMAT.ETC2_RGB;
* 2  = ETC_FORMAT.ETC1_RGBA8; // same as 0 but with alpha stored as second image (double height)
* 3  = ETC_FORMAT.ETC2_RGBA8;
* 4  = ETC_FORMAT.ETC2_RGBA1;
* 5  = ETC_FORMAT.EAC_R11;
* 6  = ETC_FORMAT.EAC_RG11;
* 7  = ETC_FORMAT.EAC_R11_SIGNED;
* 8  = ETC_FORMAT.EAC_RG11_SIGNED;
* 9  = ETC_FORMAT.ETC2_SRGB;
* 10 = ETC_FORMAT.ETC2_SRGBA8;
* 11 = ETC_FORMAT.ETC2_SRGBA1;
* ```
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order. use ```ETC_PROFILE```
* ```
* //use import PROFILE.yourProfile
* import {PROFILE} from 'tex-decoder'
* 1  = import.RGB;
* 2  = import.RGBA;
* ```
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC(src: uint8, width: number, height: number, ETC_FORMAT: number, forceRGBorRGBA?: number): uint8;
export {};
//# sourceMappingURL=etc.d.ts.map