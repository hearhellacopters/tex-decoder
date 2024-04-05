/// <reference types="node" />
/**
 * Decompress BC6 data (defaults to unsigned).
 *
 * Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} unsigned - If data is returned unsigned (default true)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC6(data: Uint8Array | Buffer, width: number, height: number, unsigned?: boolean): Uint8Array | Buffer;
/**
 * Decompress BC6 Signed data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC6S(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
/**
 * Decompress BC6 Unsigned data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC6H(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
//# sourceMappingURL=bc6.d.ts.map