const makeTable = () => {
    let c, table = [];
    for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
};
const crcTable = new Uint32Array(makeTable());
export function crc32(crc, buf, len, pos) {
    const t = crcTable;
    const end = pos + len;
    crc ^= -1;
    for (let i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1));
}
;
