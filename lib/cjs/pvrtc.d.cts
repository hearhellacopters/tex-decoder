/// <reference types="node" />
/**
 * Decompress PVRTC 2bit data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` RGBA
 */
export declare function decodePVRTC2bit(
/**const void* */ src: Buffer | Uint8Array, 
/**uint32_t */ width: number, 
/**uint32_t */ height: number): Uint8Array;
/**
 * Decompress PVRTC 4bit data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` RGBA
 */
export declare function decodePVRTC4bit(
/**const void* */ src: Buffer | Uint8Array, 
/**uint32_t */ width: number, 
/**uint32_t */ height: number): Uint8Array;
/**
 * Decompress PVRTC data. Returns Buffer or Uint8Array based on source data type.
 *
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do2bitMode - 2bit mode if true, else 4bit
 * @returns ```Buffer``` or ```Uint8Array``` RGBA
 */
export declare function decodePVRTC(
/**const void* */ src: Buffer | Uint8Array, 
/**uint32_t */ width: number, 
/**uint32_t */ height: number, 
/**uint32_t */ Do2bitMode?: boolean): Uint8Array;
//# sourceMappingURL=pvrtc.d.ts.map