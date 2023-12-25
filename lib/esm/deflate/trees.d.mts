/// <reference types="node" resolution-mode="require"/>
type ZStream = {
    input: null | Uint8Array;
    output: null | Uint8Array;
    state: null | object;
    msg: string;
    next_in: number;
    avail_in: number;
    total_in: number;
    next_out: number;
    avail_out: number;
    total_out: number;
    data_type: number;
    adler: number;
};
interface DeflateState {
    strm: ZStream | null;
    status: number;
    pending_buf: Buffer | Uint8Array | null;
    pending_buf_size: number;
    pending_out: number;
    pending: number;
    wrap: number;
    gzhead: object | null;
    gzindex: number;
    method: number;
    last_flush: number;
    w_size: number;
    w_bits: number;
    w_mask: number;
    window: Buffer | Uint8Array | null;
    window_size: number;
    prev: Buffer | Uint16Array | null;
    ins_h: number;
    hash_size: number;
    hash_bits: number;
    hash_mask: number;
    head: Buffer | Uint16Array | null;
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
declare class StaticTreeDesc {
    static_tree: Array<number> | null;
    extra_bits: Uint8Array | null;
    extra_base: number;
    elems: number;
    max_length: number;
    has_stree: number | null;
    constructor(static_tree: Array<number> | null, extra_bits: Uint8Array | null, extra_base: number, elems: number, max_length: number);
}
declare class TreeDesc {
    dyn_tree: Uint16Array;
    max_code: number;
    stat_desc: StaticTreeDesc;
    constructor(dyn_tree: Uint16Array, stat_desc: StaticTreeDesc);
}
export declare function _tr_init(s: DeflateState): void;
export declare function _tr_stored_block(s: DeflateState, buf: number, stored_len: number, last: boolean | number): void;
export declare function _tr_align(s: DeflateState): void;
export declare function _tr_flush_block(s: DeflateState, buf: number, stored_len: number, last: number | boolean): void;
export declare function _tr_tally(s: DeflateState, dist: number, lc: number): boolean;
export {};
//# sourceMappingURL=trees.d.ts.map