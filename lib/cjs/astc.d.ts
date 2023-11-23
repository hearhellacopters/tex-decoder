/// <reference types="node" />
/**
 * Decompress ASTC data. Returns Buffer or Uint8Array based on source data type.
 *
 * Must supply block width and height.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {number} block_width = Block width
 * @param {number} block_height - Block Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC(data: Uint8Array | Buffer, width: number, height: number, block_width: number, block_height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_4x4 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_4x4(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_5x4 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_5x4(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_5x5 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_5x5(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_6x5 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_6x5(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_6x6 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_6x6(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_8x5 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_8x5(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_8x6 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_8x6(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_8x8 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_8x8(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_10x5 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_10x5(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_10x6 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_10x6(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_10x8 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_10x8(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_10x10 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_10x10(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_12x10 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_12x10(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ASTC_12x12 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeASTC_12x12(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
//# sourceMappingURL=astc.d.ts.map