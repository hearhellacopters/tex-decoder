export function adler32(adler, buf, len, pos) {
    let s1 = (adler & 0xffff) | 0, s2 = ((adler >>> 16) & 0xffff) | 0, n = 0;
    while (len !== 0) {
        n = len > 2000 ? 2000 : len;
        len -= n;
        do {
            s1 = (s1 + buf[pos++]) | 0;
            s2 = (s2 + s1) | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
    }
    return (s1 | (s2 << 16)) | 0;
}
;
