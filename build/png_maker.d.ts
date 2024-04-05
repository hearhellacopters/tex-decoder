/// <reference types="node" />
export declare function CRC32(message: string | Uint8Array | Buffer): number;
export declare function readPNG(src: Uint8Array | Buffer): {
    width: number;
    height: number;
    bit_depth: number;
    color_type: number;
    compression: number;
    filter: number;
    interlace: number;
    color_data: Uint8Array | Buffer;
};
export declare function makePNG2(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean, issRGB?: boolean): Uint8Array | Buffer;
export declare function makePNG(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean, issRGB?: boolean): Buffer;
//# sourceMappingURL=png_maker.d.ts.map