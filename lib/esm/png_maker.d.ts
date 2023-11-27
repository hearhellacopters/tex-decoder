/// <reference types="node" />
/**
 * Cyclic Redundancy Check 32
 * @param {string|Uint8Array|Buffer} message - Message as string, Uint8Array or Buffer
 * @returns number
 */
export declare function CRC32(message: string | Uint8Array | Buffer): number;
/**
 * Reads .png file and returns meta data and unzipped data. Must be `Uint8Array` or `Buffer`.
 *
 * Unzipped data will be same type as source.
 *
 * @param {Uint8Array|Buffer} src - Source .png data as Uint8Array or Buffer.
 * @returns {retval} object with meta and unzipped data.
 */
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
/**
 * Create a .png file. Must be straight ABGR or BGR profile.
 *
 * @param {Uint8Array|Buffer} src - Must be ABGR or BGR color profiles (PNG is big endian)
 * @param {number} width - Width height
 * @param {number} height - Image height
 * @param {boolean} noAlpha - If the color profile is BGR
 * @param {boolean} issRGB - if the color space is sRGB
 * @returns
 */
export declare function makePNG2(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean, issRGB?: boolean): Uint8Array | Buffer;
/**
 * Create a .png file. Must be straight RGB or RGBA profile.
 *
 * @param {Uint8Array|Buffer} src - Must be RGBA or RGB color profiles (PNG is big endian)
 * @param {number} width - Width height
 * @param {number} height - Image height
 * @param {boolean} noAlpha - If the color profile is RGB
 * @param {boolean} issRGB - if the color space is sRGB
 * @returns
 */
export declare function makePNG(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean, issRGB?: boolean): any;
//# sourceMappingURL=png_maker.d.ts.map