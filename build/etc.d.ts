/// <reference types="node" />
export declare const ETC_FORMAT: {
    ETC1_RGB: number;
    ETC2_RGB: number;
    ETC1_RGBA8: number;
    ETC2_RGBA8: number;
    ETC2_RGBA1: number;
    EAC_R11: number;
    EAC_RG11: number;
    EAC_R11_SIGNED: number;
    EAC_RG11_SIGNED: number;
    ETC2_SRGB: number;
    ETC2_SRGBA8: number;
    ETC2_SRGBA1: number;
};
export declare const ETC_PROFILE: {
    RGB: number;
    RGBA: number;
};
export declare function decodeETC1RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC1RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2RGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeEACR11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeEACRG11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeEACR11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeEACRG11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2sRGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2sRGBA8(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC2sRGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
export declare function decodeETC(src: Buffer | Uint8Array, width: number, height: number, ETC_FORMAT: number, forceRGBorRGBA?: number): Uint8Array;
//# sourceMappingURL=etc.d.ts.map