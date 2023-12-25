/// <reference types="node" resolution-mode="require"/>
/**
 * Decompress ATI1. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATI1(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATI data. Will do ATI1 unless do2 is true.
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do2 - Run ATI2 instead of ATI1 (default ATI1)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATI(src: Uint8Array | Buffer, width: number, height: number, Do2?: boolean): Uint8Array | Buffer;
/**
 * Decompress BC4 (aka ATI1). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATI2. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATI2(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC5 (aka ATI2). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATC. Can do 8 or 4 bit mode (default 4).
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do8bitMode - Do 8 bit mode (Default 4)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC(src: Uint8Array | Buffer, width: number, height: number, Do8bitMode?: boolean): Uint8Array | Buffer;
/**
 * Decompress ATC8. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC8(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress ATC4. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeATC4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
//# sourceMappingURL=atc.d.ts.map