/// <reference types="node" />
/**
 * Unswizzle pixle data.
 *
 * @param {Uint8Array|Buffer} src - Source data as a 8, 16 or 32 bits per pixle
 * @param {number} width - Image width
 * @param {number} height - Image hidth
 * @param {number} depth - Image depth (normally 1)
 * @param {number} bytesPerPixel - 1 (8 bits), 2 (16 bits) or 4 (32 bits)
 * @param {number} dstRowPitch - Swizzle row pitch
 * @param {number} dstSlicePitch - Swizzle slice pitch
 * @returns
 */
export declare function unswizzle(src: Uint8Array | Buffer, width: number, height: number, depth: number, bytesPerPixel: number, dstRowPitch: number, dstSlicePitch: number): Uint8Array | Buffer;
//# sourceMappingURL=unswizzling.d.ts.map