/// <reference types="node" />
declare const ETC_FORMAT: {
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
declare const ETC_PROFILE: {
    RGB: number;
    RGBA: number;
};
declare function decodeETC1RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2RGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC1RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2RGBA(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2RGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeEACR11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeEACRG11(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeEACR11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeEACRG11_SIGNED(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2sRGB(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2sRGBA8(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC2sRGBA1(src: Buffer | Uint8Array, width: number, height: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeETC(src: Buffer | Uint8Array, width: number, height: number, ETC_FORMAT: number, forceRGBorRGBA?: number): Uint8Array;
declare function decodeBC1(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeDXT1(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeDXT2(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeBC2(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeDXT3(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeDXT4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeDXT5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeBC3(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeATI1(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodeATI(src: Uint8Array | Buffer, width: number, height: number, Do2?: boolean): Buffer | Uint8Array;
declare function decodeBC4(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodeATI2(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodeBC5(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodeATC(src: Uint8Array | Buffer, width: number, height: number, Do8bitMode?: boolean): Buffer | Uint8Array;
declare function decodeATC8(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodeATC4(src: Uint8Array | Buffer, width: number, height: number): Buffer | Uint8Array;
declare function decodePVRTC2bit(src: Buffer | Uint8Array, width: number, height: number): Uint8Array;
declare function decodePVRTC4bit(src: Buffer | Uint8Array, width: number, height: number): Uint8Array;
declare function decodePVRTC(src: Buffer | Uint8Array, width: number, height: number, Do2bitMode?: boolean): Uint8Array;
declare function decodeASTC(src: Uint8Array | Buffer, width: number, height: number, block_width: number, block_height: number): Buffer | Uint8Array;
declare function decodeASTC_4x4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_5x4(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_5x5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_6x5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_6x6(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_8x5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_8x6(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_8x8(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_10x5(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_10x6(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_10x8(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_10x10(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_12x10(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeASTC_12x12(src: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeBC6(data: Uint8Array | Buffer, width: number, height: number, unsigned?: boolean): Buffer | Uint8Array;
declare function decodeBC6S(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeBC6H(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function decodeBC7(data: Uint8Array | Buffer, width: number, height: number): Uint8Array | Buffer;
declare function getCRNMeta(src: Uint8Array | Buffer, mipmap_level?: number): {
    width: number;
    height: number;
    mipmaps: number;
    faces: number;
    format: string;
};
declare function decodeCRN(src: Uint8Array | Buffer, mipmap_level?: number, keepCompressed?: boolean): Uint8Array | Buffer;
declare const TGA_PROFILE: {
    RGB: number;
    RGBA: number;
};
declare function makeTGA(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean): Uint8Array | Buffer;
declare function readPNG(src: Uint8Array | Buffer): {
    width: number;
    height: number;
    bit_depth: number;
    color_type: number;
    compression: number;
    filter: number;
    interlace: number;
    color_data: Uint8Array | Buffer;
};
declare function makePNG(src: Uint8Array | Buffer, width: number, height: number, noAlpha?: boolean, issRGB?: boolean): Buffer;
interface COLOR_PROFILE {
    order: string;
    value: number;
}
declare const BYTE_VALUE: {
    UNSIGNED: number;
    SIGNED: number;
    HALF_FLOAT: number;
    FLOAT: number;
};
declare const COLOR_PROFILE: {
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
declare function convertProfile(src: Buffer | Uint8Array, srcProfile: COLOR_PROFILE, dstProfile: COLOR_PROFILE, width?: number, height?: number): Buffer | Uint8Array;
declare function flipImage(src: Buffer | Uint8Array, width: number, height: number, is24?: boolean): Buffer | Uint8Array;
declare function cropImage(src: Buffer | Uint8Array, width: number, height: number, srcBitsPerPixel: number): Buffer | Uint8Array;
interface StaticTreeDesc {
    static_tree: Array<number>;
    extra_bits: Uint8Array;
    extra_base: number;
    elems: number;
    max_length: number;
    has_stree: number;
}
interface TreeDesc {
    dyn_tree: Uint16Array;
    max_code: number;
    stat_desc: StaticTreeDesc;
}
interface GZheader {
    text: number;
    time: number;
    xflags: number;
    os: number;
    extra: Uint8Array;
    extra_len: number;
    name: string;
    comment: string;
    hcrc: number;
    done: boolean;
}
interface DeflateState {
    strm: ZStream;
    status: number;
    pending_buf: Buffer | Uint8Array;
    pending_buf_size: number;
    pending_out: number;
    pending: number;
    wrap: number;
    gzhead: GZheader;
    gzindex: number;
    method: number;
    last_flush: number;
    w_size: number;
    w_bits: number;
    w_mask: number;
    window: Buffer | Uint8Array;
    window_size: number;
    prev: Buffer | Uint16Array;
    ins_h: number;
    hash_size: number;
    hash_bits: number;
    hash_mask: number;
    head: Buffer | Uint16Array;
    hash_shift: number;
    block_start: number;
    match_length: number;
    prev_match: number;
    match_available: number;
    strstart: number;
    match_start: number;
    lookahead: number;
    prev_length: number;
    max_chain_length: number;
    max_lazy_match: number;
    level: number;
    strategy: number;
    good_match: number;
    nice_match: number;
    dyn_ltree: Uint16Array;
    dyn_dtree: Uint16Array;
    bl_tree: Uint16Array;
    l_desc: TreeDesc;
    d_desc: TreeDesc;
    bl_desc: TreeDesc;
    bl_count: Uint16Array;
    heap: Uint16Array;
    heap_len: number;
    heap_max: number;
    depth: Uint16Array;
    sym_buf: number;
    lit_bufsize: number;
    sym_next: number;
    sym_end: number;
    opt_len: number;
    static_len: number;
    matches: number;
    insert: number;
    bi_buf: number;
    bi_valid: number;
}
interface InflateState {
    strm: ZStream;
    mode: number;
    last: boolean | number;
    wrap: number;
    havedict: boolean | number;
    flags: number;
    dmax: number;
    check: number;
    total: number;
    head: GZheader;
    wbits: number;
    wsize: number;
    whave: number;
    wnext: number;
    hold: number;
    bits: number;
    length: number;
    offset: number;
    extra: number;
    lencode: Int32Array;
    distcode: Int32Array;
    lenbits: number;
    distbits: number;
    ncode: number;
    nlen: number;
    ndist: number;
    have: number;
    window: Buffer | Uint8Array;
    next: number;
    lens: Uint16Array;
    work: Uint16Array;
    lendyn: Int32Array;
    distdyn: Int32Array;
    sane: number;
    back: number;
    was: number;
}
declare class ZStream {
    input: Uint8Array;
    output: Uint8Array;
    state: DeflateState | InflateState;
    msg: string;
    next_in: number;
    avail_in: number;
    total_in: number;
    next_out: number;
    avail_out: number;
    total_out: number;
    data_type: number;
    adler: number;
    constructor();
}
declare class GZheader$0 {
    text: number;
    time: number;
    xflags: number;
    os: number;
    extra: Uint8Array;
    extra_len: number;
    name: string;
    comment: string;
    hcrc: number;
    done: boolean;
    constructor();
}
type options = {
    level: number;
    windowBits: number;
    memLevel: number;
    strategy: number;
    dictionary: Uint8Array;
    chunkSize: number;
    raw: boolean;
    gzip: boolean;
    method: number;
    header: GZheader$0;
    to: string;
};
type options_assigned = {
    level?: number;
    windowBits?: number;
    memLevel?: number;
    strategy?: number;
    dictionary?: Uint8Array;
    chunkSize?: number;
    raw?: boolean;
    gzip?: boolean;
    method?: number;
    header?: GZheader$0;
    to?: string;
};
declare class Deflate {
    options: options;
    err: number;
    msg: string;
    ended: boolean | number;
    chunks: Uint8Array[];
    strm: ZStream;
    _dict_set: boolean | undefined;
    result: Buffer | Uint8Array | undefined;
    constructor(options?: options_assigned);
    push(data: Uint8Array | Buffer, flush_mode: boolean | number): boolean;
    onData(chunk: Uint8Array | Buffer): void;
    onEnd(status: number): void;
}
declare function deflate(input: Buffer | Uint8Array, options?: options_assigned): Buffer | Uint8Array | undefined;
declare function deflateRaw(input: Buffer | Uint8Array, options?: options_assigned): Buffer | Uint8Array | undefined;
declare function gzip(input: Buffer | Uint8Array, options?: options_assigned): Buffer | Uint8Array | undefined;
declare class Inflate {
    options: options;
    err: number;
    msg: string;
    ended: boolean | number;
    chunks: Uint8Array[];
    strm: ZStream;
    _dict_set: boolean | undefined;
    result: Buffer | Uint8Array | string | undefined;
    header: GZheader$0;
    constructor(options?: options_assigned);
    push(data: Buffer | Uint8Array, flush_mode: number | boolean): boolean;
    onData(chunk: Buffer | Uint8Array | string): void;
    onEnd(status: number): void;
}
declare function inflate(input: Buffer | Uint8Array | string, options?: options_assigned): string | Buffer | Uint8Array | undefined;
declare function inflateRaw(input: Buffer | Uint8Array | string, options?: options_assigned): string | Buffer | Uint8Array | undefined;
declare function ungzip(input: Buffer | Uint8Array | string, options?: options_assigned): string | Buffer | Uint8Array | undefined;
declare function unswizzle(src: Uint8Array | Buffer, width: number, height: number, depth: number, bytesPerPixel: number, dstRowPitch: number, dstSlicePitch: number): Buffer | Uint8Array;
declare function untile(src: Uint8Array | Buffer, bytesPerBlock: number, pixelBlockWidth: number, pixelBlockHeigth: number, tileSize: number, width: number): Buffer | Uint8Array;
declare function mortonize(src: Uint8Array | Buffer, packedBitsPerPixel: number, pixelBlockWidth: number, pixelBlockHeigth: number, mortonOrder: number, width: number, height: number, widthFactor: number): Buffer | Uint8Array;
export { ETC_PROFILE, ETC_FORMAT, decodeETC, decodeETC1RGB, decodeETC1RGBA, decodeEACR11, decodeEACR11_SIGNED, decodeEACRG11, decodeEACRG11_SIGNED, decodeETC2RGB, decodeETC2RGBA, decodeETC2RGBA1, decodeETC2sRGB, decodeETC2sRGBA1, decodeETC2sRGBA8, decodeDXT1, decodeBC1, decodeDXT2, decodeDXT3, decodeBC2, decodeDXT4, decodeDXT5, decodeBC3, decodeATC, decodeATC4, decodeATC8, decodeATI, decodeATI1, decodeBC4, decodeATI2, decodeBC5, decodePVRTC, decodePVRTC4bit, decodePVRTC2bit, decodeASTC, decodeASTC_4x4, decodeASTC_5x4, decodeASTC_5x5, decodeASTC_6x5, decodeASTC_6x6, decodeASTC_8x5, decodeASTC_8x6, decodeASTC_8x8, decodeASTC_10x5, decodeASTC_10x6, decodeASTC_10x8, decodeASTC_10x10, decodeASTC_12x10, decodeASTC_12x12, decodeBC6, decodeBC6H, decodeBC6S, decodeBC7, getCRNMeta, decodeCRN, makeTGA, TGA_PROFILE, readPNG, makePNG, COLOR_PROFILE, BYTE_VALUE, convertProfile, flipImage, cropImage, inflate, Inflate, deflate, Deflate, deflateRaw, inflateRaw, gzip, ungzip, unswizzle, mortonize, untile };
