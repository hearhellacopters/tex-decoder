/// <reference types="node" />
/**
 * Decompress BC1 data (aka DXT1). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC1(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress DXT1 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeDXT1(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress DXT2. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeDXT2(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC2 data (aka DXT3). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC2(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress DXT3 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeDXT3(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress DXT4. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeDXT4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress DXT5. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeDXT5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC3 (aka DXT5). Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC3(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
