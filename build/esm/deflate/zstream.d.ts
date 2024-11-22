/// <reference types="node" />
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
export declare class ZStream {
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
export {};
//# sourceMappingURL=zstream.d.ts.map