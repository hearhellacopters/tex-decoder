const MAXBITS = 15;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const CODES = 0;
const LENS = 1;
const DISTS = 2;
const lbase = new Uint16Array([
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
]);
const lext = new Uint8Array([
    16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
    19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
]);
const dbase = new Uint16Array([
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    8193, 12289, 16385, 24577, 0, 0
]);
const dext = new Uint8Array([
    16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
    23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
    28, 28, 29, 29, 64, 64
]);
export function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
    const bits = opts.bits;
    let len = 0;
    let sym = 0;
    let min = 0, max = 0;
    let root = 0;
    let curr = 0;
    let drop = 0;
    let left = 0;
    let used = 0;
    let huff = 0;
    let incr;
    let fill;
    let low;
    let mask;
    let next;
    let base = null;
    let match;
    const count = new Uint16Array(MAXBITS + 1);
    const offs = new Uint16Array(MAXBITS + 1);
    let extra = null;
    let here_bits, here_op, here_val;
    for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
    }
    for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
    }
    root = bits;
    for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
            break;
        }
    }
    if (root > max) {
        root = max;
    }
    if (max === 0) {
        table[table_index++] = (1 << 24) | (64 << 16) | 0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;
        opts.bits = 1;
        return 0;
    }
    for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
            break;
        }
    }
    if (root < min) {
        root = min;
    }
    left = 1;
    for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
            return -1;
        }
    }
    if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
    }
    offs[1] = 0;
    for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
    }
    for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
            work[offs[lens[lens_index + sym]]++] = sym;
        }
    }
    if (type === CODES) {
        base = extra = work;
        match = 20;
    }
    else if (type === LENS) {
        base = lbase;
        extra = lext;
        match = 257;
    }
    else {
        base = dbase;
        extra = dext;
        match = 0;
    }
    huff = 0;
    sym = 0;
    len = min;
    next = table_index;
    curr = root;
    drop = 0;
    low = -1;
    used = 1 << root;
    mask = used - 1;
    if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
    }
    for (;;) {
        here_bits = len - drop;
        if (work[sym] + 1 < match) {
            here_op = 0;
            here_val = work[sym];
        }
        else if (work[sym] >= match) {
            here_op = extra[work[sym] - match];
            here_val = base[work[sym] - match];
        }
        else {
            here_op = 32 + 64;
            here_val = 0;
        }
        incr = 1 << (len - drop);
        fill = 1 << curr;
        min = fill;
        do {
            fill -= incr;
            table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val | 0;
        } while (fill !== 0);
        incr = 1 << (len - 1);
        while (huff & incr) {
            incr >>= 1;
        }
        if (incr !== 0) {
            huff &= incr - 1;
            huff += incr;
        }
        else {
            huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
            if (len === max) {
                break;
            }
            len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
            if (drop === 0) {
                drop = root;
            }
            next += min;
            curr = len - drop;
            left = 1 << curr;
            while (curr + drop < max) {
                left -= count[curr + drop];
                if (left <= 0) {
                    break;
                }
                curr++;
                left <<= 1;
            }
            used += 1 << curr;
            if ((type === LENS && used > ENOUGH_LENS) ||
                (type === DISTS && used > ENOUGH_DISTS)) {
                return 1;
            }
            low = huff & mask;
            table[low] = (root << 24) | (curr << 16) | (next - table_index) | 0;
        }
    }
    if (huff !== 0) {
        table[next + huff] = ((len - drop) << 24) | (64 << 16) | 0;
    }
    opts.bits = root;
    return 0;
}
;
