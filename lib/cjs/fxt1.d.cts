/// <reference types="node" />
/**
 * Decompress FXT1 data. Returns Buffer or Uint8Array based on source data type.
 *
 * Note: Only supports CC_MIXED or RGB non-alpha data.
 *
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export declare function decodeFXT1(data: Buffer | Uint8Array, width: number, height: number): Buffer | Uint8Array;
//# sourceMappingURL=fxt1.d.ts.map