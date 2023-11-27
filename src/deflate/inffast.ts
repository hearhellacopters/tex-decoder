// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
const BAD = 16209;       /* got a data error -- remain here until reset */
const TYPE = 16191;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */

interface StaticTreeDesc {
    static_tree: Array<number> | null;
    extra_bits: Uint8Array | null;
    extra_base: number;
    elems: number;
    max_length: number;
    has_stree: number | null;
}

interface TreeDesc {
    dyn_tree: Uint16Array;
    max_code: number;
    stat_desc: StaticTreeDesc;
}

type DeflateState = {
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
type ZStream = {
    input: Uint8Array;
    output: Uint8Array;
    state: InflateState | DeflateState;
    msg: string;
    next_in: number;
    avail_in: number;
    total_in: number;
    next_out: number;
    avail_out: number;
    total_out: number;
    data_type: number;
    adler: number;
}

export function inflate_fast(strm: ZStream, start: number): void {
    let _in: number;                    /* local strm.input */
    let last: number | boolean;                   /* have enough input while in < last */
    let _out: number;                   /* local strm.output */
    let beg: number;                    /* inflate()'s initial strm.output */
    let end: number;                    /* while out < end, enough space available */
    //#ifdef INFLATE_STRICT
    let dmax: number;                   /* maximum distance from zlib header */
    //#endif
    let wsize: number;                  /* window size or zero if not using window */
    let whave: number;                  /* valid bytes in the window */
    let wnext: number;                  /* window write index */
    // Use `s_window` instead `window`, avoid conflict with instrumentation tools
    let s_window: Uint8Array;               /* allocated sliding window, if wsize != 0 */
    let hold: number;                   /* local strm.hold */
    let bits: number;                   /* local strm.bits */
    let lcode: Int32Array;                  /* local strm.lencode */
    let dcode: Int32Array;                  /* local strm.distcode */
    let lmask: number;                  /* mask for first level of length codes */
    let dmask: number;                  /* mask for first level of distance codes */
    let here: number;                   /* retrieved table entry */
    let op: number;                     /* code bits, operation, extra bits, or */
    /*  window position, window bytes to copy */
    let len: number;                    /* match length, unused bytes */
    let dist: number;                   /* match distance */
    let from: number;                   /* where to copy match from */
    let from_source: Uint8Array;


    let input: Uint8Array | Buffer, output: Uint8Array | Buffer; // JS specific, because we have no pointers

    /* copy state to local variables */
    const state = strm.state as InflateState;
    //here = state.here;
    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);
    //#ifdef INFLATE_STRICT
    dmax = state.dmax;
    //#endif
    wsize = state.wsize;
    whave = state.whave;
    wnext = state.wnext;
    s_window = state.window;
    hold = state.hold;
    bits = state.bits;
    lcode = state.lencode;
    dcode = state.distcode;
    lmask = (1 << state.lenbits) - 1;
    dmask = (1 << state.distbits) - 1;


    /* decode literals and length/distances until end-of-block or not enough
       input data or output space */

    top:
    do {
        if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
        }

        here = lcode[hold & lmask];

        dolen:
        for (; ;) { // Goto emulation
            op = here >>> 24/*here.bits*/;
            hold >>>= op;
            bits -= op;
            op = (here >>> 16) & 0xff/*here.op*/;
            if (op === 0) {                          /* literal */
                //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
                //        "inflate:         literal '%c'\n" :
                //        "inflate:         literal 0x%02x\n", here.val));
                output[_out++] = here & 0xffff/*here.val*/;
            }
            else if (op & 16) {                     /* length base */
                len = here & 0xffff/*here.val*/;
                op &= 15;                           /* number of extra bits */
                if (op) {
                    if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                    }
                    len += hold & ((1 << op) - 1);
                    hold >>>= op;
                    bits -= op;
                }
                //Tracevv((stderr, "inflate:         length %u\n", len));
                if (bits < 15) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    hold += input[_in++] << bits;
                    bits += 8;
                }
                here = dcode[hold & dmask];

                dodist:
                for (; ;) { // goto emulation
                    op = here >>> 24/*here.bits*/;
                    hold >>>= op;
                    bits -= op;
                    op = (here >>> 16) & 0xff/*here.op*/;

                    if (op & 16) {                      /* distance base */
                        dist = here & 0xffff/*here.val*/;
                        op &= 15;                       /* number of extra bits */
                        if (bits < op) {
                            hold += input[_in++] << bits;
                            bits += 8;
                            if (bits < op) {
                                hold += input[_in++] << bits;
                                bits += 8;
                            }
                        }
                        dist += hold & ((1 << op) - 1);
                        //#ifdef INFLATE_STRICT
                        if (dist > dmax) {
                            strm.msg = 'invalid distance too far back';
                            state.mode = BAD;
                            break top;
                        }
                        //#endif
                        hold >>>= op;
                        bits -= op;
                        //Tracevv((stderr, "inflate:         distance %u\n", dist));
                        op = _out - beg;                /* max distance in output */
                        if (dist > op) {                /* see if copy from window */
                            op = dist - op;               /* distance back in window */
                            if (op > whave) {
                                if (state.sane) {
                                    strm.msg = 'invalid distance too far back';
                                    state.mode = BAD;
                                    break top;
                                }

                                // (!) This block is disabled in zlib defaults,
                                // don't enable it for binary compatibility
                                //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
                                //                if (len <= op - whave) {
                                //                  do {
                                //                    output[_out++] = 0;
                                //                  } while (--len);
                                //                  continue top;
                                //                }
                                //                len -= op - whave;
                                //                do {
                                //                  output[_out++] = 0;
                                //                } while (--op > whave);
                                //                if (op === 0) {
                                //                  from = _out - dist;
                                //                  do {
                                //                    output[_out++] = output[from++];
                                //                  } while (--len);
                                //                  continue top;
                                //                }
                                //#endif
                            }
                            from = 0; // window index
                            from_source = s_window;
                            if (wnext === 0) {           /* very common case */
                                from += wsize - op;
                                if (op < len) {         /* some from window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;  /* rest from output */
                                    from_source = output;
                                }
                            }
                            else if (wnext < op) {      /* wrap around window */
                                from += wsize + wnext - op;
                                op -= wnext;
                                if (op < len) {         /* some from end of window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = 0;
                                    if (wnext < len) {  /* some from start of window */
                                        op = wnext;
                                        len -= op;
                                        do {
                                            output[_out++] = s_window[from++];
                                        } while (--op);
                                        from = _out - dist;      /* rest from output */
                                        from_source = output;
                                    }
                                }
                            }
                            else {                      /* contiguous in window */
                                from += wnext - op;
                                if (op < len) {         /* some from window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;  /* rest from output */
                                    from_source = output;
                                }
                            }
                            while (len > 2) {
                                output[_out++] = from_source[from++];
                                output[_out++] = from_source[from++];
                                output[_out++] = from_source[from++];
                                len -= 3;
                            }
                            if (len) {
                                output[_out++] = from_source[from++];
                                if (len > 1) {
                                    output[_out++] = from_source[from++];
                                }
                            }
                        }
                        else {
                            from = _out - dist;          /* copy direct from output */
                            do {                        /* minimum length is three */
                                output[_out++] = output[from++];
                                output[_out++] = output[from++];
                                output[_out++] = output[from++];
                                len -= 3;
                            } while (len > 2);
                            if (len) {
                                output[_out++] = output[from++];
                                if (len > 1) {
                                    output[_out++] = output[from++];
                                }
                            }
                        }
                    }
                    else if ((op & 64) === 0) {          /* 2nd level distance code */
                        here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                        continue dodist;
                    }
                    else {
                        strm.msg = 'invalid distance code';
                        state.mode = BAD;
                        break top;
                    }

                    break; // need to emulate goto via "continue"
                }
            }
            else if ((op & 64) === 0) {              /* 2nd level length code */
                here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                continue dolen;
            }
            else if (op & 32) {                     /* end-of-block */
                //Tracevv((stderr, "inflate:         end of block\n"));
                state.mode = TYPE;
                break top;
            }
            else {
                strm.msg = 'invalid literal/length code';
                state.mode = BAD;
                break top;
            }

            break; // need to emulate goto via "continue"
        }
    } while (_in < last && _out < end);

    /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;

    /* update state and return */
    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
    strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
    state.hold = hold;
    state.bits = bits;
    return;
};
