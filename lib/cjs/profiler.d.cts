/// <reference types="node" />
interface COLOR_PROFILE {
    order: string;
    value: number;
}
export declare const BYTE_VALUE: {
    UNSIGNED: number;
    SIGNED: number;
    HALF_FLOAT: number;
    FLOAT: number;
};
export declare const COLOR_PROFILE: {
    A8: {
        order: string;
        value: number;
    };
    R8: {
        order: string;
        value: number;
    };
    G8: {
        order: string;
        value: number;
    };
    B8: {
        order: string;
        value: number;
    };
    RG8: {
        order: string;
        value: number;
    };
    RB8: {
        order: string;
        value: number;
    };
    GR8: {
        order: string;
        value: number;
    };
    GB8: {
        order: string;
        value: number;
    };
    BR8: {
        order: string;
        value: number;
    };
    BG8: {
        order: string;
        value: number;
    };
    RGB8: {
        order: string;
        value: number;
    };
    RBG8: {
        order: string;
        value: number;
    };
    GRB8: {
        order: string;
        value: number;
    };
    GBR8: {
        order: string;
        value: number;
    };
    BRG8: {
        order: string;
        value: number;
    };
    BGR8: {
        order: string;
        value: number;
    };
    ARGB8: {
        order: string;
        value: number;
    };
    ARBG8: {
        order: string;
        value: number;
    };
    AGRB8: {
        order: string;
        value: number;
    };
    AGBR8: {
        order: string;
        value: number;
    };
    ABRG8: {
        order: string;
        value: number;
    };
    ABGR8: {
        order: string;
        value: number;
    };
    RGBA8: {
        order: string;
        value: number;
    };
    RBGA8: {
        order: string;
        value: number;
    };
    GRBA8: {
        order: string;
        value: number;
    };
    GBRA8: {
        order: string;
        value: number;
    };
    BRGA8: {
        order: string;
        value: number;
    };
    BGRA8: {
        order: string;
        value: number;
    };
    RGB565: {
        order: string;
        value: number;
    };
    BGR565: {
        order: string;
        value: number;
    };
    RGBA4: {
        order: string;
        value: number;
    };
    RGBA51: {
        order: string;
        value: number;
    };
    RGB10_A2: {
        order: string;
        value: number;
    };
    RGB10_A2I: {
        order: string;
        value: number;
    };
    A8I: {
        order: string;
        value: number;
    };
    R8I: {
        order: string;
        value: number;
    };
    RG8I: {
        order: string;
        value: number;
    };
    RGB8I: {
        order: string;
        value: number;
    };
    RGBA8I: {
        order: string;
        value: number;
    };
    ARGB8I: {
        order: string;
        value: number;
    };
    BGR8I: {
        order: string;
        value: number;
    };
    BGRA8I: {
        order: string;
        value: number;
    };
    ABGR8I: {
        order: string;
        value: number;
    };
    A16F: {
        order: string;
        value: number;
    };
    R16F: {
        order: string;
        value: number;
    };
    RG16F: {
        order: string;
        value: number;
    };
    RGB16F: {
        order: string;
        value: number;
    };
    RGBA16F: {
        order: string;
        value: number;
    };
    ARGB16F: {
        order: string;
        value: number;
    };
    R16: {
        order: string;
        value: number;
    };
    RG16: {
        order: string;
        value: number;
    };
    RGB16: {
        order: string;
        value: number;
    };
    RGBA16: {
        order: string;
        value: number;
    };
    A16I: {
        order: string;
        value: number;
    };
    R16I: {
        order: string;
        value: number;
    };
    RG16I: {
        order: string;
        value: number;
    };
    RGB16I: {
        order: string;
        value: number;
    };
    RGBA16I: {
        order: string;
        value: number;
    };
    A32F: {
        order: string;
        value: number;
    };
    R32F: {
        order: string;
        value: number;
    };
    RG32F: {
        order: string;
        value: number;
    };
    RGB32F: {
        order: string;
        value: number;
    };
    RGBA32F: {
        order: string;
        value: number;
    };
    A32: {
        order: string;
        value: number;
    };
    R32: {
        order: string;
        value: number;
    };
    RG32: {
        order: string;
        value: number;
    };
    RGB32: {
        order: string;
        value: number;
    };
    RGBA32: {
        order: string;
        value: number;
    };
    R32I: {
        order: string;
        value: number;
    };
    RG32I: {
        order: string;
        value: number;
    };
    RGB32I: {
        order: string;
        value: number;
    };
    RGBA32I: {
        order: string;
        value: number;
    };
};
/**
 * Convert color data profile.
 *
 * @param {Buffer|Uint8Array} src - Source Data
 * @param {COLOR_PROFILE} srcProfile - Source Color Profile (use ```COLOR_PROFILE```)
 * @param {COLOR_PROFILE} dstProfile - Desired Color Profile (use ```COLOR_PROFILE```)
 * @param {number} width - Image width (note: without demenistons, pixel size is calculated by profile and source size)
 * @param {number} height - Image height (note: without demenistons, pixel size is calculated by profile and source size)
 * @returns ```Uint8Array``` or ```Buffer```
 */
export declare function convertProfile(src: Buffer | Uint8Array, srcProfile: COLOR_PROFILE, dstProfile: COLOR_PROFILE, width?: number, height?: number): Buffer | Uint8Array;
export {};
//# sourceMappingURL=profiler.d.ts.map