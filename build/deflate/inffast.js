const BAD = 16209;
const TYPE = 16191;
export function inflate_fast(strm, start) {
    let _in;
    let last;
    let _out;
    let beg;
    let end;
    let dmax;
    let wsize;
    let whave;
    let wnext;
    let s_window;
    let hold;
    let bits;
    let lcode;
    let dcode;
    let lmask;
    let dmask;
    let here;
    let op;
    let len;
    let dist;
    let from;
    let from_source;
    let input, output;
    const state = strm.state;
    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);
    dmax = state.dmax;
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
    top: do {
        if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
        }
        here = lcode[hold & lmask];
        dolen: for (;;) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = (here >>> 16) & 0xff;
            if (op === 0) {
                output[_out++] = here & 0xffff;
            }
            else if (op & 16) {
                len = here & 0xffff;
                op &= 15;
                if (op) {
                    if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                    }
                    len += hold & ((1 << op) - 1);
                    hold >>>= op;
                    bits -= op;
                }
                if (bits < 15) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    hold += input[_in++] << bits;
                    bits += 8;
                }
                here = dcode[hold & dmask];
                dodist: for (;;) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = (here >>> 16) & 0xff;
                    if (op & 16) {
                        dist = here & 0xffff;
                        op &= 15;
                        if (bits < op) {
                            hold += input[_in++] << bits;
                            bits += 8;
                            if (bits < op) {
                                hold += input[_in++] << bits;
                                bits += 8;
                            }
                        }
                        dist += hold & ((1 << op) - 1);
                        if (dist > dmax) {
                            strm.msg = 'invalid distance too far back';
                            state.mode = BAD;
                            break top;
                        }
                        hold >>>= op;
                        bits -= op;
                        op = _out - beg;
                        if (dist > op) {
                            op = dist - op;
                            if (op > whave) {
                                if (state.sane) {
                                    strm.msg = 'invalid distance too far back';
                                    state.mode = BAD;
                                    break top;
                                }
                            }
                            from = 0;
                            from_source = s_window;
                            if (wnext === 0) {
                                from += wsize - op;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;
                                    from_source = output;
                                }
                            }
                            else if (wnext < op) {
                                from += wsize + wnext - op;
                                op -= wnext;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = 0;
                                    if (wnext < len) {
                                        op = wnext;
                                        len -= op;
                                        do {
                                            output[_out++] = s_window[from++];
                                        } while (--op);
                                        from = _out - dist;
                                        from_source = output;
                                    }
                                }
                            }
                            else {
                                from += wnext - op;
                                if (op < len) {
                                    len -= op;
                                    do {
                                        output[_out++] = s_window[from++];
                                    } while (--op);
                                    from = _out - dist;
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
                            from = _out - dist;
                            do {
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
                    else if ((op & 64) === 0) {
                        here = dcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
                        continue dodist;
                    }
                    else {
                        strm.msg = 'invalid distance code';
                        state.mode = BAD;
                        break top;
                    }
                    break;
                }
            }
            else if ((op & 64) === 0) {
                here = lcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
                continue dolen;
            }
            else if (op & 32) {
                state.mode = TYPE;
                break top;
            }
            else {
                strm.msg = 'invalid literal/length code';
                state.mode = BAD;
                break top;
            }
            break;
        }
    } while (_in < last && _out < end);
    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;
    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
    strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
    state.hold = hold;
    state.bits = bits;
    return;
}
;
