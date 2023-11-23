/// <reference types="node" />
/**
* ```
* 0  = ETC1_RGB;
* 1  = ETC2_RGB;
* 2  = ETC1_RGBA8; 	//same as 0 but with alpha stored as second image (double height)
* 3  = ETC2_RGBA8;
* 4  = ETC2_RGBA1;
* 5  = EAC_R11;
* 6  = EAC_RG11;
* 7  = EAC_R11_SIGNED;
* 8  = EAC_RG11_SIGNED;
* 9  = ETC2_SRGB;
* 10 = ETC2_SRGBA8;
* 11 = ETC2_SRGBA1;
* ```
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
export declare const PROFILE: {
    RGB: number;
    RGBA: number;
};
/**
* Decompress ETC1RGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC1RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2RGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC1RGB with Alpha Data. Alpha stored as second image (double height). Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC1RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2RGBA Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2RGBA1 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2RGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress EACR11 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACR11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress EACRG11 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACRG11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress EACR11 SIGNED Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACR11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress RG11 SIGNED Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeEACRG11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2sRGB Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2sRGBA8 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGBA8(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC2sRGBA1 Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC2sRGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
/**
* Decompress ETC Data. Returns Buffer or Uint8Array based on source data type.
*
* @param {Buffer|Uint8Array} src - Source data as ```Buffer``` or ```Uint8Array```
* @param {number} width - Image Width
* @param {number} height - Image Height
* @param {number} srcFormat -
* ```
* //use import ETC_FORMAT.yourFormat
* import {ETC_FORMAT} from 'tex-decoder'
* 0  = ETC_FORMAT.ETC1_RGB;
* 1  = ETC_FORMAT.ETC2_RGB;
* 2  = ETC_FORMAT.ETC1_RGBA8; //same as 0 but with alpha stored as second image (double height)
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
* @param {number} forceRGBorRGBA - Forces RGB or RGBA8 byte order
* ```
* //use import PROFILE.yourProfile
* import {PROFILE} from 'tex-decoder'
* 2  = import.RGB;
* 3  = import.RGBA;
* ```
* @returns ```Uint8Array``` or ```Buffer``` as RGB or RGBA
*/
export declare function decodeETC(src: Buffer | Uint8Array, width: number, height: number, srcFormat: number, forceRGBorRGBA?: number): Uint8Array;
//# sourceMappingURL=etc.d.ts.map