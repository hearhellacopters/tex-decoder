const Z_FIXED = 4;
const Z_BINARY = 0;
const Z_TEXT = 1;
const Z_UNKNOWN = 2;
function zero(buf) {
    let len = buf.length;
    while (--len >= 0) {
        buf[len] = 0;
    }
}
const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES = 2;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const LENGTH_CODES = 29;
const LITERALS = 256;
const L_CODES = LITERALS + 1 + LENGTH_CODES;
const D_CODES = 30;
const BL_CODES = 19;
const HEAP_SIZE = 2 * L_CODES + 1;
const MAX_BITS = 15;
const Buf_size = 16;
const MAX_BL_BITS = 7;
const END_BLOCK = 256;
const REP_3_6 = 16;
const REPZ_3_10 = 17;
const REPZ_11_138 = 18;
const extra_lbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]);
const extra_dbits = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
const extra_blbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]);
const bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
const DIST_CODE_LEN = 512;
const static_ltree = new Array((L_CODES + 2) * 2);
zero(static_ltree);
const static_dtree = new Array(D_CODES * 2);
zero(static_dtree);
const _dist_code = new Array(DIST_CODE_LEN);
zero(_dist_code);
const _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
zero(_length_code);
const base_length = new Array(LENGTH_CODES);
zero(base_length);
const base_dist = new Array(D_CODES);
zero(base_dist);
class StaticTreeDesc {
    constructor(static_tree, extra_bits, extra_base, elems, max_length) {
        this.static_tree = static_tree;
        this.extra_bits = extra_bits;
        this.extra_base = extra_base;
        this.elems = elems;
        this.max_length = max_length;
        this.has_stree = static_tree && static_tree.length;
    }
}
let static_l_desc;
let static_d_desc;
let static_bl_desc;
class TreeDesc {
    constructor(dyn_tree, stat_desc) {
        this.dyn_tree = dyn_tree;
        this.max_code = 0;
        this.stat_desc = stat_desc;
    }
}
const d_code = (dist) => {
    return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
const put_short = (s, w) => {
    if (s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = (w) & 0xff;
        s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
    }
};
const send_bits = (s, value, length) => {
    if (s.bi_valid > (Buf_size - length)) {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> (Buf_size - s.bi_valid);
        s.bi_valid += length - Buf_size;
    }
    else {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        s.bi_valid += length;
    }
};
const send_code = (s, c, tree) => {
    send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
const bi_reverse = (code, len) => {
    let res = 0;
    do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
    } while (--len > 0);
    return res >>> 1;
};
const bi_flush = (s) => {
    if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
    }
    else if (s.bi_valid >= 8 &&
        s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = s.bi_buf & 0xff;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
    }
};
const gen_bitlen = (s, desc) => {
    const tree = desc.dyn_tree;
    const max_code = desc.max_code;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const extra = desc.stat_desc.extra_bits;
    const base = desc.stat_desc.extra_base;
    const max_length = desc.stat_desc.max_length;
    let h;
    let n, m;
    let bits;
    let xbits;
    let f;
    let overflow = 0;
    for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
    }
    tree[s.heap[s.heap_max] * 2 + 1] = 0;
    for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
            bits = max_length;
            overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
            continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base && extra != undefined) {
            xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree && stree != undefined) {
            s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
    }
    if (overflow === 0) {
        return;
    }
    do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
            bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
    } while (overflow > 0);
    for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
            m = s.heap[--h];
            if (m > max_code) {
                continue;
            }
            if (tree[m * 2 + 1] !== bits) {
                s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
                tree[m * 2 + 1] = bits;
            }
            n--;
        }
    }
};
const gen_codes = (tree, max_code, bl_count) => {
    const next_code = new Array(MAX_BITS + 1);
    let code = 0;
    let bits;
    let n;
    for (bits = 1; bits <= MAX_BITS; bits++) {
        code = (code + bl_count[bits - 1]) << 1;
        next_code[bits] = code;
    }
    for (n = 0; n <= max_code; n++) {
        let len = tree[n * 2 + 1];
        if (len === 0) {
            continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
    }
};
const tr_static_init = () => {
    let n;
    let bits;
    let length;
    let code;
    let dist;
    const bl_count = new Array(MAX_BITS + 1);
    length = 0;
    for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < (1 << extra_lbits[code]); n++) {
            _length_code[length++] = code;
        }
    }
    _length_code[length - 1] = code;
    dist = 0;
    for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < (1 << extra_dbits[code]); n++) {
            _dist_code[dist++] = code;
        }
    }
    dist >>= 7;
    for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
            _dist_code[256 + dist++] = code;
        }
    }
    for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
    }
    n = 0;
    while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
    }
    while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
    }
    while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
    }
    while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
    }
    gen_codes(static_ltree, L_CODES + 1, bl_count);
    for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
    }
    static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
    static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
    static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
};
const init_block = (s) => {
    let n;
    for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
    }
    for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
    }
    for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
    }
    s.dyn_ltree[END_BLOCK * 2] = 1;
    s.opt_len = s.static_len = 0;
    s.sym_next = s.matches = 0;
};
const bi_windup = (s) => {
    if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
    }
    else if (s.bi_valid > 0 &&
        s.pending_buf != undefined) {
        s.pending_buf[s.pending++] = s.bi_buf;
    }
    s.bi_buf = 0;
    s.bi_valid = 0;
};
const smaller = (tree, n, m, depth) => {
    const _n2 = n * 2;
    const _m2 = m * 2;
    return (tree[_n2] < tree[_m2] ||
        (tree[_n2] === tree[_m2] && depth[n] <= depth[m]));
};
const pqdownheap = (s, tree, k) => {
    const v = s.heap[k];
    let j = k << 1;
    while (j <= s.heap_len) {
        if (j < s.heap_len &&
            smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
            j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
            break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
    }
    s.heap[k] = v;
};
const compress_block = (s, ltree, dtree) => {
    let dist;
    let lc;
    let sx = 0;
    let code;
    let extra;
    if (s.sym_next !== 0 && s.pending_buf != undefined) {
        do {
            dist = s.pending_buf[s.sym_buf + sx++] & 0xff;
            dist += (s.pending_buf[s.sym_buf + sx++] & 0xff) << 8;
            lc = s.pending_buf[s.sym_buf + sx++];
            if (dist === 0) {
                send_code(s, lc, ltree);
            }
            else {
                code = _length_code[lc];
                send_code(s, code + LITERALS + 1, ltree);
                extra = extra_lbits[code];
                if (extra !== 0) {
                    lc -= base_length[code];
                    send_bits(s, lc, extra);
                }
                dist--;
                code = d_code(dist);
                send_code(s, code, dtree);
                extra = extra_dbits[code];
                if (extra !== 0) {
                    dist -= base_dist[code];
                    send_bits(s, dist, extra);
                }
            }
        } while (sx < s.sym_next);
    }
    send_code(s, END_BLOCK, ltree);
};
const build_tree = (s, desc) => {
    const tree = desc.dyn_tree;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const elems = desc.stat_desc.elems;
    let n, m;
    let max_code = -1;
    let node;
    s.heap_len = 0;
    s.heap_max = HEAP_SIZE;
    for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
            s.heap[++s.heap_len] = max_code = n;
            s.depth[n] = 0;
        }
        else {
            tree[n * 2 + 1] = 0;
        }
    }
    while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree && stree != undefined) {
            s.static_len -= stree[node * 2 + 1];
        }
    }
    desc.max_code = max_code;
    for (n = (s.heap_len >> 1); n >= 1; n--) {
        pqdownheap(s, tree, n);
    }
    node = elems;
    do {
        n = s.heap[1];
        s.heap[1] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1);
        m = s.heap[1];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[1] = node++;
        pqdownheap(s, tree, 1);
    } while (s.heap_len >= 2);
    s.heap[--s.heap_max] = s.heap[1];
    gen_bitlen(s, desc);
    gen_codes(tree, max_code, s.bl_count);
};
const scan_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
    }
    tree[(max_code + 1) * 2 + 1] = 0xffff;
    for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
            continue;
        }
        else if (count < min_count) {
            s.bl_tree[curlen * 2] += count;
        }
        else if (curlen !== 0) {
            if (curlen !== prevlen) {
                s.bl_tree[curlen * 2]++;
            }
            s.bl_tree[REP_3_6 * 2]++;
        }
        else if (count <= 10) {
            s.bl_tree[REPZ_3_10 * 2]++;
        }
        else {
            s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
        }
        else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
        }
        else {
            max_count = 7;
            min_count = 4;
        }
    }
};
const send_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
    }
    for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
            continue;
        }
        else if (count < min_count) {
            do {
                send_code(s, curlen, s.bl_tree);
            } while (--count !== 0);
        }
        else if (curlen !== 0) {
            if (curlen !== prevlen) {
                send_code(s, curlen, s.bl_tree);
                count--;
            }
            send_code(s, REP_3_6, s.bl_tree);
            send_bits(s, count - 3, 2);
        }
        else if (count <= 10) {
            send_code(s, REPZ_3_10, s.bl_tree);
            send_bits(s, count - 3, 3);
        }
        else {
            send_code(s, REPZ_11_138, s.bl_tree);
            send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
            max_count = 138;
            min_count = 3;
        }
        else if (curlen === nextlen) {
            max_count = 6;
            min_count = 3;
        }
        else {
            max_count = 7;
            min_count = 4;
        }
    }
};
const build_bl_tree = (s) => {
    let max_blindex;
    scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
    scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
    build_tree(s, s.bl_desc);
    for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
            break;
        }
    }
    s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
    return max_blindex;
};
const send_all_trees = (s, lcodes, dcodes, blcodes) => {
    let rank;
    send_bits(s, lcodes - 257, 5);
    send_bits(s, dcodes - 1, 5);
    send_bits(s, blcodes - 4, 4);
    for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
    }
    send_tree(s, s.dyn_ltree, lcodes - 1);
    send_tree(s, s.dyn_dtree, dcodes - 1);
};
const detect_data_type = (s) => {
    let block_mask = 0xf3ffc07f;
    let n;
    for (n = 0; n <= 31; n++, block_mask >>>= 1) {
        if ((block_mask & 1) && (s.dyn_ltree[n * 2] !== 0)) {
            return Z_BINARY;
        }
    }
    if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 ||
        s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
    }
    for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
            return Z_TEXT;
        }
    }
    return Z_BINARY;
};
let static_init_done = false;
export function _tr_init(s) {
    if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
    }
    s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
    s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
    s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
    s.bi_buf = 0;
    s.bi_valid = 0;
    init_block(s);
}
;
export function _tr_stored_block(s, buf, stored_len, last) {
    send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
    bi_windup(s);
    put_short(s, stored_len);
    put_short(s, ~stored_len);
    if (stored_len && s.pending_buf != undefined && s.window != undefined) {
        s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
    }
    s.pending += stored_len;
}
;
export function _tr_align(s) {
    send_bits(s, STATIC_TREES << 1, 3);
    send_code(s, END_BLOCK, static_ltree);
    bi_flush(s);
}
;
export function _tr_flush_block(s, buf, stored_len, last) {
    let opt_lenb, static_lenb;
    let max_blindex = 0;
    if (s.level > 0) {
        if (s.strm && s.strm.data_type === Z_UNKNOWN) {
            s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = (s.opt_len + 3 + 7) >>> 3;
        static_lenb = (s.static_len + 3 + 7) >>> 3;
        if (static_lenb <= opt_lenb) {
            opt_lenb = static_lenb;
        }
    }
    else {
        opt_lenb = static_lenb = stored_len + 5;
    }
    if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
        _tr_stored_block(s, buf, stored_len, last);
    }
    else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
    }
    else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
    }
    init_block(s);
    if (last) {
        bi_windup(s);
    }
}
;
export function _tr_tally(s, dist, lc) {
    if (s.pending_buf != undefined) {
        s.pending_buf[s.sym_buf + s.sym_next++] = dist;
        s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
        s.pending_buf[s.sym_buf + s.sym_next++] = lc;
    }
    if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
    }
    else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
    }
    return (s.sym_next === s.sym_end);
}
;
