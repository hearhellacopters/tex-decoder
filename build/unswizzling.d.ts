/// <reference types="node" />
export declare function unswizzle(src: Uint8Array | Buffer, width: number, height: number, depth: number, bytesPerPixel: number, dstRowPitch: number, dstSlicePitch: number): Uint8Array | Buffer;
export declare function untile(src: Uint8Array | Buffer, bytesPerBlock: number, pixelBlockWidth: number, pixelBlockHeigth: number, tileSize: number, width: number): Uint8Array | Buffer;
export declare function mortonize(src: Uint8Array | Buffer, packedBitsPerPixel: number, pixelBlockWidth: number, pixelBlockHeigth: number, mortonOrder: number, width: number, height: number, widthFactor: number): Uint8Array | Buffer;
//# sourceMappingURL=unswizzling.d.ts.map