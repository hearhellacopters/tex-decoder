/// <reference types="node" />
export declare const TGA_PROFILE: {
    RGB: number;
    RGBA: number;
};
/**
 * Create a .tga file. Must be straight RGBA or RGB profile.
 *
 * @param {Uint8Array|Buffer} src - source as RGB or RGBA
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {boolean} noAlpha - Color profile is RGB (default RGBA)
 * @returns
 */
export declare function makeTGA(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean): Uint8Array | Buffer;
//# sourceMappingURL=tga_maker.d.ts.map