/// <reference types="node" />
/**
 * Decompress ATI1. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATI1(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC4 (aka ATI1). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC4(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATI2. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATI2(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC5 (aka ATI2). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC5(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATC. Can do 8 or 4 bit mode (default 4).
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do8bitMode - Do 8 bit mode (Default 4)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC(data: Uint8Array | Buffer, width: number, height: number, Do8bitMode?: boolean): Uint8Array | Buffer;
/**
 * Decompress ATC8. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC8(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATC4. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC4(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
//# sourceMappingURL=atc.d.ts.map