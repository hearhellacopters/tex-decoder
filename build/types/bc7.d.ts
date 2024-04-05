/// <reference types="node" />
/**
 * Decompress BC7 data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeBC7(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
