/// <reference types="node" />
type uint8 = Uint8Array | Buffer;
/**
 * Encode an RGBA8 image into an ETC format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {typeof ETC_FORMAT} format - ETC format to encode
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC(srcbuffer: Uint8Array | Buffer, width: number, height: number, format: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC1 RGB format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC1RGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC1 RGBA format (alpha is added under the image doubling the height).
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC1RGBA(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into EACR11 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeEACR11(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into signed EACR11 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeEACR11_SIGNED(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into EACRG11 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeEACRG11(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into signed EACRG11 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeEACRG11_SIGNED(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 RGB format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2RGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 RGBA format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2RGBA(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 RGBA1 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2RGBA1(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 sRGB format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2sRGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 sRGBA1 format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2sRGBA1(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
/**
 * Encode an RGBA8 image into ETC2 sRGBA format.
 *
 * Note: Image width and height must be divisible by 4.
 * Otherwise, it will be expanded.
 *
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 *
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export declare function encodeETC2sRGBA8(srcbuffer: Uint8Array | Buffer, width: number, height: number): {
    img: uint8;
    alphaimg: uint8;
    compressed: uint8;
    width: number;
    height: number;
};
export {};
//# sourceMappingURL=etcpack.d.ts.map