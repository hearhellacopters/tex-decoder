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
/**
 * Untile image data.
 *
 * @param {Uint8Array|Buffer} src - Source data as ``Uint8Array`` or ``Buffer``. Will return the same.
 * @param {number} bytesPerBlock - Bytes per block. In compressed data it's the block size. In raw data it's the bytes per pixel.
 * @param {number} pixelBlockWidth - Pixel width of the block data. Normally 4. But in raw it's 1.
 * @param {number} pixelBlockHeigth - Pixel Heigth of the block data. Normally 4. But in raw it's 1.
 * @param {number} tileSize - Normally the "packed" width value or Math.log2(width)
 * @param {number} width - Image width size
 * @returns ``Uint8Array`` | ``Buffer``
 */
export declare function untile(src: Uint8Array | Buffer, bytesPerBlock: number, pixelBlockWidth: number, pixelBlockHeigth: number, tileSize: number, width: number): Uint8Array | Buffer;
/**
 * Mortonize image data.
 *
 * @param {Uint8Array|Buffer} src - Source data as ``Uint8Array`` or ``Buffer``. Will return the same.
 * @param {number} packedBitsPerPixel - Packed bits per pixel.
 * @param {number} pixelBlockWidth - Pixel width of the block data. Normally 4. But in raw it's 1.
 * @param {number} pixelBlockHeigth - Pixel Heigth of the block data. Normally 4. But in raw it's 1.
 * @param {number} width - Image width
 * @param {number} height - Image hidth
 * @param {number} mortonOrder - Morton Order
 * @param {number} widthFactor - Normally 1 but depends on the system.
 * @returns ``Uint8Array`` | ``Buffer``
 * */
export declare function mortonize(src: Uint8Array | Buffer, packedBitsPerPixel: number, pixelBlockWidth: number, pixelBlockHeigth: number, mortonOrder: number, width: number, height: number, widthFactor: number): Uint8Array | Buffer;
//# sourceMappingURL=unswizzling.d.ts.map