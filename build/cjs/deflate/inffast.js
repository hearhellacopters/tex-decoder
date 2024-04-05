"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.inflate_fast = void 0;
// See state defs from inflate.js
const BAD = 16209; /* got a data error -- remain here until reset */
const TYPE = 16191; /* i: waiting for type bits, including last-flag bit */
function inflate_fast(strm, start) {
    let _in; /* local strm.input */
    let last; /* have enough input while in < last */
    let _out; /* local strm.output */
    let beg; /* inflate()'s initial strm.output */
    let end; /* while out < end, enough space available */
    //#ifdef INFLATE_STRICT
    let dmax; /* maximum distance from zlib header */
    //#endif
    let wsize; /* window size or zero if not using window */
    let whave; /* valid bytes in the window */
    let wnext; /* window write index */
    // Use `s_window` instead `window`, avoid conflict with instrumentation tools
    let s_window; /* allocated sliding window, if wsize != 0 */
    let hold; /* local strm.hold */
    let bits; /* local strm.bits */
    let lcode; /* local strm.lencode */
    let dcode; /* local strm.distcode */
    let lmask; /* mask for first level of length codes */
    let dmask; /* mask for first level of distance codes */
    let here; /* retrieved table entry */
    let op; /* code bits, operation, extra bits, or */
    /*  window position, window bytes to copy */
    let len; /* match length, unused bytes */
    let dist; /* match distance */
    let from; /* where to copy match from */
    let from_source;
    let input, output; // JS specific, because we have no pointers
    /* copy state to local variables */
    const state = strm.state;
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
    top: do {
        if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
        }
        here = lcode[hold & lmask];
        dolen: for (;;) { // Goto emulation
            op = here >>> 24 /*here.bits*/;
            hold >>>= op;
            bits -= op;
            op = (here >>> 16) & 0xff /*here.op*/;
            if (op === 0) { /* literal */
                //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
                //        "inflate:         literal '%c'\n" :
                //        "inflate:         literal 0x%02x\n", here.val));
                output[_out++] = here & 0xffff /*here.val*/;
            }
            else if (op & 16) { /* length base */
                len = here & 0xffff /*here.val*/;
                op &= 15; /* number of extra bits */
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
                dodist: for (;;) { // goto emulation
                    op = here >>> 24 /*here.bits*/;
                    hold >>>= op;
                    bits -= op;
                    op = (here >>> 16) & 0xff /*here.op*/;
                    if (op & 16) { /* distance base */
                        dist = here & 0xffff /*here.val*/;
                        op &= 15; /* number of extra bits */
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
                        op = _out - beg; /* max distance in output */
                        if (dist > op) { /* see if copy from window */
                            op = dist - op; /* distance back in window */
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
                            if (wnext === 0) { /* very common case */
                                from += wsize - op;
                                if (op < len) { /* some from window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist; /* rest from output */
                                    from_source = output;
                                }
                            }
                            else if (wnext < op) { /* wrap around window */
                                from += wsize + wnext - op;
                                op -= wnext;
                                if (op < len) { /* some from end of window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = 0;
                                    if (wnext < len) { /* some from start of window */
                                        op = wnext;
                                        len -= op;
                                        do {
                                            output[_out++] = s_window[from++];
                                        } while (--op);
                                        from = _out - dist; /* rest from output */
                                        from_source = output;
                                    }
                                }
                            }
                            else { /* contiguous in window */
                                from += wnext - op;
                                if (op < len) { /* some from window */
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist; /* rest from output */
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
                            from = _out - dist; /* copy direct from output */
                            do { /* minimum length is three */
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
                    else if ((op & 64) === 0) { /* 2nd level distance code */
                        here = dcode[(here & 0xffff) /*here.val*/ + (hold & ((1 << op) - 1))];
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
            else if ((op & 64) === 0) { /* 2nd level length code */
                here = lcode[(here & 0xffff) /*here.val*/ + (hold & ((1 << op) - 1))];
                continue dolen;
            }
            else if (op & 32) { /* end-of-block */
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
}
exports.inflate_fast = inflate_fast;
;
