/// <reference types="node" />
/**
 * Decompress PVRTCII 4bit data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodePVRTCII4bit(data: Buffer | Uint8Array, width: number, height: number): Buffer | Uint8Array;
/**
 * Decompress PVRTCII 2bit data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodePVRTCII2bit(data: Buffer | Uint8Array, width: number, height: number): Buffer | Uint8Array;
