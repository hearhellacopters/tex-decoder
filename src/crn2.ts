//source
//https://docs.rs/crnlib/0.1.1/src/crnlib/unpack.rs.html
//@FixImport
import {
    decodeBC1,
    decodeBC2,
    decodeBC3,
} from './dxt'

import {
    decodeBC4,
    decodeBC5
} from './atc'

const CRN_FORMATS: any = {
    0: "cCRNFmtDXT1", //BC1
    // cCRNFmtDXT3 is not currently supported when writing to CRN - only DDS.
    1: "cCRNFmtDXT3", //BC2
    2: "cCRNFmtDXT5", //BC3
    // Various DXT5 derivatives
    3: "cCRNFmtDXT5_CCxY", //BC5   // Luma-chroma
    4: "cCRNFmtDXT5_xGxR", //BC5   // Swizzled 2-component
    5: "cCRNFmtDXT5_xGBR", //BC5   // Swizzled 3-component
    6: "cCRNFmtDXT5_AGBR", //BC5   // Swizzled 4-component
    // ATI 3DC and X360 DXN
    7: "cCRNFmtDXN_XY", //BC5
    8: "cCRNFmtDXN_YX", //BC5
    // DXT5 alpha blocks only
    9: "cCRNFmtDXT5A", //BC4
    10: "cCRNFmtETC1",   //not supported
    11: "cCRNFmtETC2",   //not supported
    12: "cCRNFmtETC2A",  //not supported
    13: "cCRNFmtETC1S",  //not supported
    14: "cCRNFmtETC2AS", //not supported
    15: "cCRNFmtTotal"
}

import { BiReader, BiWriter } from 'bireader';

type Palette = {
    offset: number;
    size: number;
    count: number;
}

const KEY = [
    17, //ShortZero
    18, //LongZero, 
    19, //ShortRepeat, 
    20, //LongRepeat,
    0,
    8,
    7,
    9,
    6,
    10,
    5,
    11,
    4,
    12,
    3,
    13,
    2,
    14,
    1,
    15,
    16
]

class Header {

    public br: BiReader;
    public magic: string;
    public header_size: number;
    public header_crc16: number;
    public file_size: number;
    public data_crc16: number;
    public width: number;
    public height: number;
    public level_count: number;
    public face_count: number;
    public format: number;
    public format_str: string;
    public flags: number;
    public reserved: number;
    public userdata: Uint32Array;
    public color_endpoints: Palette;
    public color_selectors: Palette;
    public alpha_endpoints: Palette;
    public alpha_selectors: Palette;
    public table_size: number;
    public table_offset: number;
    public level_offset: Uint32Array;
    public isBuffer: boolean;

    constructor(data: Uint8Array | Buffer) {
        const br = new BiReader(data);
        this.isBuffer = isBuffer(data)
        this.br = br;
        br.be();
        this.magic = br.string({ length: 2 })
        this.header_size = br.uint16;
        this.header_crc16 = br.uint16;
        this.file_size = br.uint32;
        this.data_crc16 = br.uint16;

        this.width = br.uint16;
        this.height = br.uint16;
        this.level_count = br.ubyte;
        this.face_count = br.ubyte;
        this.format = br.ubyte as typeof CRN_FORMATS, // u8
        this.format_str = CRN_FORMATS[this.format];
        this.flags = br.uint16;

        this.reserved = br.uint32;
        this.userdata = new Uint32Array([br.uint32, br.uint32]);

        function makePalette(br: BiReader): Palette {
            return {
                offset: br.ubit(24),
                size: br.ubit(24),
                count: br.uint16
            }
        }

        this.color_endpoints = makePalette(br);

        this.color_selectors = makePalette(br);

        this.alpha_endpoints = makePalette(br);

        this.alpha_selectors = makePalette(br);

        this.table_size = br.uint16;

        this.table_offset = br.ubit(24);

        this.level_offset = new Uint32Array(this.level_count);

        for (let i = 0; i < this.level_count; i++) {
            this.level_offset[i] = br.uint32;
        }
    }

    fixed_size(): number {
        return 33 + 8 * 4 + 5
    }

    crc16(init: number, input: Uint8Array | Buffer): number {
        return input.reduce((v, c) => {
            let x = c ^ (v >> 8);
            x = (x ^ (x >> 4)) & 0xFFFF; // Ensure the result is a 16-bit unsigned integer
            return (v << 8) ^ (x << 12) ^ (x << 5) ^ x;
        }, ~init & 0xFFFF); // Ensure the result is a 16-bit unsigned integer
    }

    crc16_poly(init: number, poly: number, input: Uint8Array | Buffer): number {
        return input.reduce((v, c) => {
            return [...Array(8).keys()].reduce((v, _) => {
                return (v & 1) === 1 ? (v >> 1) ^ poly : v >> 1;
            }, v ^ c);
        }, ~init);
    }

    check_crc(input: Uint8Array | Buffer): boolean {
        return this.header_size == this.fixed_size() + 4 * this.level_count &&
            this.file_size == input.length &&
            this.header_crc16 == this.crc16(0, input.subarray(6, this.header_size)) &&
            this.data_crc16 == this.crc16(0, input.subarray(this.header_size))
    }

    block_size(): number {
        switch (this.format) {
        case 0: //"cCRNFmtDXT1"
        case 9: //"cCRNFmtDXT5A"
            return 8;
        default:
            return 16;
        }
    }

    get_level_data(idx: number): Uint8Array | Buffer {
        let start = this.level_offset[idx];
        this.br.goto(start);
        let len = this.level_offset[idx + 1] - start;
        return this.br.extract(len)
    }

    get_table_data(): Uint8Array | Buffer {
        if (this.table_size != 0 && this.table_offset != 0) {
            this.br.goto(this.table_offset);
            var table_data = this.br.extract(this.table_size)
        } else {
            var table_data = this.isBuffer ? Buffer.alloc(1) : new Uint8Array(1);
        }
        return table_data
    }

    get_palette_data(palette: Palette): Uint8Array | Buffer {
        if (palette.count == 0) { return this.isBuffer ? Buffer.alloc(1) : new Uint8Array(1) }
        let start = palette.offset;
        this.br.goto(start)
        return this.br.extract(palette.size)
    }

    get_table() {
        const codec = new Codec(this.get_table_data())
        const chunk_encoding = codec.get_huffman();

        var color_endpoint = new Table({} as Huffman,[[]]);
        if (this.color_endpoints.count != 0) {
            var color_endpoint_delta = codec.get_huffman();
            
            var color_endpoints = this.get_color_endpoints();
            color_endpoint = new Table(color_endpoint_delta, color_endpoints)
        }

        var color_selector = new Table({} as Huffman,[[]]);
        if (this.color_selectors.count != 0) {
            var color_selector_delta = codec.get_huffman();
            var color_selectors = this.get_color_selectors();
            color_selector = new Table(color_selector_delta, color_selectors)
        }
      
        var alpha_endpoint = new Table({} as Huffman,[[]]);
        if (this.alpha_endpoints.count != 0) {
            var alpha_endpoint_delta = codec.get_huffman();
            var alpha_endpoints = this.get_alpha_endpoints();
            alpha_endpoint = new Table(alpha_endpoint_delta, alpha_endpoints)
        } 
    
        let alpha_selector = new Table({} as Huffman,[[]]);
        if (this.alpha_selectors.count != 0) {
            var alpha_selector_delta = codec.get_huffman();
            var alpha_selectors = this.get_alpha_selectors();
            alpha_selector = new Table(alpha_selector_delta, <unknown> alpha_selectors as number[][])
        }

        return new Tables(
            chunk_encoding,
            color_endpoint,
            color_selector,
            alpha_endpoint,
            alpha_selector
        )
    }

    get_color_endpoints() {
        const codec = new Codec(this.get_palette_data(this.color_endpoints));
        const dm1 = codec.get_huffman()
        const dm2 = codec.get_huffman()
        
        var a = 0, b = 0, c = 0;
        var d = 0, e = 0, f = 0;
        var color_endpoint = Array.from({ length: this.color_endpoints.count },(i,m) => {
            var da = dm1.next(codec); a = (a + da) & 0x1f;
            var db = dm2.next(codec); b = (b + db) & 0x3f;
            var dc = dm1.next(codec); c = (c + dc) & 0x1f;
            var dd = dm1.next(codec); d = (d + dd) & 0x1f;
            var de = dm2.next(codec); e = (e + de) & 0x3f;
            var df = dm1.next(codec); f = (f + df) & 0x1f;
            return [(c | (b << 5) | (a << 11)), (f | (e << 5) | (d << 11))];
        });
        if(!codec.is_complete()){
            throw new Error("extra bytes in codec of color_endpoints")
        }
        return color_endpoint
    }

    get_alpha_endpoints(){
        const codec = new Codec(this.get_palette_data(this.alpha_endpoints));
        var dm = codec.get_huffman()
        var a = 0, b = 0;
        var alpha_endpoint = Array.from({ length: this.alpha_endpoints.count },() => {
            let da = dm.next( codec); a = (a + da) & 0xFF;
            let db = dm.next( codec); b = (b + db) & 0xFF;
            return [a,b];
        });
        if(!codec.is_complete()){
            throw new Error("extra bytes in codec of alpha_endpoints")
        }
        return alpha_endpoint;
    }

    get_color_selectors(){
        const codec = new Codec(this.get_palette_data(this.color_selectors));
        const dm = codec.get_huffman()

        const x = new Uint32Array(8)
        const y = new Uint32Array(8)

        const C = new Uint8Array([0, 2, 3, 1]) //DXT1

        var color_selectors  = Array.from({ length: this.color_selectors.count },() => {
            for (let i = 0; i < 8; i++) {
                var d = dm.next(codec)
                x[i] = ((x[i] + d % 7 - 3) & 3);
                y[i] = ((y[i] + Math.floor(d / 7) - 3) & 3);
            }

            return [
                C[x[0]] | (C[y[0]] << 2) | (C[x[1]] << 4) | (C[y[1]] << 6),
                C[x[2]] | (C[y[2]] << 2) | (C[x[3]] << 4) | (C[y[3]] << 6),
                C[x[4]] | (C[y[4]] << 2) | (C[x[5]] << 4) | (C[y[5]] << 6),
                C[x[6]] | (C[y[6]] << 2) | (C[x[7]] << 4) | (C[y[7]] << 6),
            ]
        });
        if(!codec.is_complete()){
            throw new Error("extra bytes in codec of color_selectors")
        }
        return color_selectors 
    }

    get_alpha_selectors(){
        const codec = new Codec(this.get_palette_data(this.alpha_selectors));
        let dm = codec.get_huffman()

        const x = new Uint32Array(8)
        const y = new Uint32Array(8)

        const C = new Uint8Array([0, 2, 3, 4, 5, 6, 7, 1]) //DXT5

        var alpha_selectors  = Array.from({ length: this.alpha_selectors.count },() => {
            var s = new Uint8Array(6);
            var s_bits = new BiWriter(s);
            s_bits.be();
            var s_len = 6*8;
            for (let j = 0; j < 8; j++) {
                const d = dm.next(codec);
                x[j] = ((x[j] + d % 15 - 7) & 7);
                y[j] = ((y[j] + d / 15 - 7) & 7);
                s_bits.goto(0,s_len-j*6-3);
                var bitsToWrite = (s_len-j*6-0) - (s_len-j*6-3)
                s_bits.ubit(C[x[j]],bitsToWrite)
                s_bits.goto(0,s_len-j*6-6);
                bitsToWrite = (s_len-j*6-3) - (s_len-j*6-6)
                s_bits.ubit(C[y[j]],bitsToWrite)
            }

            return s_bits.get.reverse()
        });

        if(!codec.is_complete()){
            throw new Error("extra bytes in codec of alpha_selectors")
        }
        return alpha_selectors 
    }

    get_level_info(idx: number) {
        if (idx < this.level_count) {
            const width = Math.max(1, this.width >> idx);
            const height = Math.max(1, this.height >> idx);
            return { width, height };
        } else { 
            return null; 
        }
    }

    unpack_level(tables: Tables, idx: number):{data:Uint8Array,width:number,height:number} {
        let codec = new Codec(this.get_level_data(idx))
        const width = Math.max(1, this.width >> idx);
        const height = Math.max(1, this.height >> idx);
        var data:Uint8Array;
        switch (this.format) {
            case 0: //cCRNFmtDXT1
                data = new Unpack().unpackDxt1(tables, codec, width, height, this.face_count);
                break;
            case 2: //cCRNFmtDXT5
            case 6: //cCRNFmtDXT5_AGBR
            case 3: //cCRNFmtDXT5_CCxY
            case 4: //cCRNFmtDXT5_xGxR
            case 5: //cCRNFmtDXT5_xGBR
                data =  new Unpack().unpackDxt5(tables, codec, width, height, this.face_count);
                break;
            case 9: //cCRNFmtDXT5A
                data =  new Unpack().unpackDxt5A(tables, codec, width, height, this.face_count);
                break;
            case 7: //cCRNFmtDXN_XY
            case 8: //cCRNFmtDXN_YX
                data =  new Unpack().unpackDxn(tables, codec, width, height, this.face_count);
                break;
            default:
                throw new Error(`unsupported format ${CRN_FORMATS[this.format]}`);
                break;
        }
        return {
            data: data,
            width: width,
            height: height,
        }
    }
}

class Codec{
    public buffer:Buffer|Uint8Array
    public br:BiReader;
    public index=0;
    public MAX_SYMBOL_COUNT_BIT = 14;
    public MAX_SYMBOL_COUNT = 8192;
    constructor(data:Buffer|Uint8Array){
        this.buffer = data;
        this.br = new BiReader(data);
        this.br.be();
    }

    look_bits(n:number){
        if(n == 0){
            return 0;
        }
        if (this.index + n > this.len()){
            const bitsleft = this.len() - this.index;
            const retval = this.br.ubit(bitsleft) << (this.index + n - this.len())
            this.br.skip(0,bitsleft * -1)
            return retval;
        } else {
            const retval = this.br.ubit(n)
            this.br.skip(0,n * -1)
            return retval
        }
    }

    read_bits(n:number){
        if (this.index + n > this.len()){
            throw new Error(`codec read outside of size: ${this.index+n} of ${this.len()}`)
        }
        if(n == 0 ){
            return 0;
        }
        const retval = this.br.ubit(n)
        this.index += n;
        return retval;
    }

    skip_bits(n:number){
        this.br.skip(0,n);
        this.index += n;
    }

    current(){
        return this.index;
    }

    len(){
        return this.br.size * 8
    }

    is_complete(){
        var retval = this.index + 7 >= this.len() && this.index <= this.len();
        return retval
    }

    get_huffman() {
        const symbol_count = this.read_bits(Huffman.MAX_SYMBOL_COUNT_BIT);
        if (symbol_count == 0) {
            return new Huffman({})
        }
        const tmp_symbol_depth = {} as Record<string, number>;
        const tmp_symbol_count = this.read_bits(5);
        if (!(tmp_symbol_count <= 21)) {
            throw new Error("huffman symbol count too high")
        }
        for (let i = 0; i < tmp_symbol_count; i++) {
            const value = this.read_bits(3);
            if (value != 0) {
                Object.assign(tmp_symbol_depth, { [KEY[i]]: value })
            }
        }
        const key = new Huffman(tmp_symbol_depth)
        const symbol_depth = {}
        var last: number = 0;
        var i = 0;
        while (i < symbol_count) {
            var d = key.next(this);
            var value: number[] = [];
            var len = 0;
            switch (d) {
            case 17: //ShortZero
                len = (this.read_bits(3) || 0) + 3
                value = [len, 0];
                break;
            case 18: //LongZero
                len = (this.read_bits(7) || 0) + 11
                value = [len, 0];
                break;
            case 19: //ShortRepeat
                len = (this.read_bits(2) || 0) + 3;
                value = [len, last];
                break;
            case 20: //LongRepeat
                len = (this.read_bits(6) || 0) + 7;
                value = [len, last];
                break;
            default:
                len = 1;
                value = [len, d];
                break;
            }
            last = d;
            len = value[0];
            d = value[1];
            for (let j = 0; j < len; j++) {
                if (d != 0) {
                    Object.assign(symbol_depth,{[i+j]:d})
                }
            }
            i += len;
        }

        return new Huffman(symbol_depth)
    }
}

class Huffman {
    static readonly MAX_DEPTH: number = 16;
    static readonly MAX_SYMBOL_COUNT: number = 8192;
    static readonly MAX_SYMBOL_COUNT_BIT: number = 14;

    public depth_count: number[] = Array(Huffman.MAX_DEPTH + 1).fill(0);
    public symbol_depth: Map<number, number>;
    public symbol_count: number;
    public max_depth = 0;
    public symbols: Map<number, number>;
    public symbol_rev: Map<string, number>;

    constructor(input: Record<string, number>) {
        for (const symbol in input) {
            const depth = input[symbol];
            this.max_depth = Math.max(this.max_depth, depth);
        }
        const new_input: Map<number, number> = new Map()
        Object.entries(input).forEach(self => {
            new_input.set(Number(self[0]), self[1])
        })
        this.symbol_depth = new_input;
        this.symbol_count = new_input.size;

        this.symbols = new Map<number, number>();
        this.symbol_rev = new Map<string, number>();

        this.initialize();
    }

    private initialize(): void {
        const depthBound: number[] = Array(Huffman.MAX_DEPTH + 1).fill(0);
        let available = 0;

        for (const depth of this.symbol_depth.values()) {
            this.depth_count[depth]++;
        }

        for (let depth = 0; depth <= Huffman.MAX_DEPTH; depth++) {
            if (this.depth_count[depth] !== 0) {
                this.max_depth = depth;
            }

            available <<= 1;
            if (depth !== 0) {
                available += this.depth_count[depth];
            }

            depthBound[depth] = available;
        }
        if (
            !(1 << this.max_depth == depthBound[this.max_depth] ||
            (this.max_depth <= 1 && depthBound[this.max_depth] == this.max_depth))
        ) {
            throw new Error(`Depth bound error: ${this.depth_count} ${depthBound}`);
        }

        const depthCurrent: number[] = Array(Huffman.MAX_DEPTH + 1).fill(0);
        for (let i = 1; i <= Huffman.MAX_DEPTH; i++) {
            depthCurrent[i] = depthBound[i - 1] * 2;
        }

        this.symbol_depth.forEach((depth, key) => {
            if (depth === 0) return;

            const result = depthCurrent[depth];
            depthCurrent[depth] += 1;

            this.symbols.set(Number(key), result);
            this.symbol_rev.set(`${this.symbol_depth.get(key)!},${result}`, key);
        });
    }

    next(codec: Codec):number {
        if(!(codec.current() < codec.len())){
            throw new Error(`Huffman codec read outside of size: ${codec.current()} of ${codec.len()}`)
        }
        var k = codec.look_bits(this.max_depth)
        
        for (let i = 1; i <= this.max_depth; i++) {
            let t = k >>> (this.max_depth - i);
            let sym = this.symbol_rev.get(`${i},${t}`)
            if (sym != undefined) {
                codec.skip_bits(i);
                return sym
            }
        }
        throw new Error("incomplete huffman tree no match")
        return 0;
    }
}

class Table{
    public delta:Huffman;
    public entries:number[][];
    constructor(delta: Huffman,entries:number[][]){
        this.delta = delta;
        this.entries = entries;
    }

    truncate(idx: number, max: number):number{
        return idx < max ? idx :idx-max 
    }
    next(codec: Codec, idx: Uint32Array){
        let delta = this.delta.next(codec)
        idx[0] = this.truncate(idx[0] + delta, this.entries.length)
        return this.entries[idx[0]]
    }
}

class Tables{
    public chunk_enc: Huffman;
    public color_end: Table;
    public color_sel: Table;
    public alpha_end: Table;
    public alpha_sel: Table;
    constructor(
        chunk_encoding: Huffman,
        color_endpoint: Table,
        color_selector: Table,
        alpha_endpoint: Table,
        alpha_selector: Table,
    ){
        this.chunk_enc = chunk_encoding
        this.color_end = color_endpoint
        this.color_sel = color_selector
        this.alpha_end = alpha_endpoint
        this.alpha_sel = alpha_selector
    }

    color_endpoint()  {
        return this.color_end
    }
    color_selector() {
        return this.color_sel
    }
    alpha_endpoint() {
        return this.alpha_end
    }
    alpha_selector()  {
        return this.alpha_sel
    }
}

class Unpack{
    public TRUNK_SIZE = 2;
    public COUNT_TILES = new Uint32Array([ 1, 2, 2, 3, 3, 3, 3, 4 ]);
    public TILES = [
         new Uint32Array([ 0, 0, 0, 0 ]),
         new Uint32Array([ 0, 0, 1, 1 ]),  new Uint32Array([ 0, 1, 0, 1 ]),
         new Uint32Array([ 0, 0, 1, 2 ]),  new Uint32Array([ 1, 2, 0, 0 ]),
         new Uint32Array([ 0, 1, 0, 2 ]),  new Uint32Array([ 1, 0, 2, 0 ]),
         new Uint32Array([ 0, 1, 2, 3 ])
    ];
    constructor(
    ){
    }

    next_tile_idx(codec: Codec, encoding: Huffman, tile_bits: Uint32Array){
        if(tile_bits[0] == 1){
            tile_bits[0] = encoding.next(codec) | 512;
        }
        let tile_index = tile_bits[0] & 7;
        tile_bits[0] >>= 3;
        return {
            tiles_count: this.COUNT_TILES[tile_index], 
            tiles: this.TILES[tile_index]
        }
    }

    unpackDxt1(tables: Tables, codec: Codec, width: number, height: number, face:number){
        const BLOCK_SIZE = 8;

        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);

        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);
 
        var tile_bits = new Uint32Array([1]);

        var color_endpoint_index = new Uint32Array([0]);
        var color_selector_index = new Uint32Array([0]);

        var pitch = block_x * BLOCK_SIZE;
        
        var result = new Uint8Array(block_y * pitch);

        var cursor = new BiWriter(result);

        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const color_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint16
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        color_endpoints[i] = tables.color_endpoint().next(codec, color_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const color_selector = tables.color_selector().next(codec, color_selector_index);//uint16
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            //write
                            const corend_write = color_endpoints[tiles[i]];
                            cursor.uint16 = corend_write[0];
                            cursor.uint16 = corend_write[1];
                            color_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) { 
            throw new Error!("extra bytes in DXT1 codec") 
        }
        return cursor.get as Uint8Array;
    }

    unpackDxt5(tables: Tables, codec: Codec, width: number, height: number, face:number){
        const BLOCK_SIZE = 16;
        
        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);

        var tile_bits = new Uint32Array([1]);

        var color_endpoint_index = new Uint32Array([0]);
        var color_selector_index = new Uint32Array([0]);
        var alpha_endpoint_index = new Uint32Array([0]);
        var alpha_selector_index = new Uint32Array([0]);

        var pitch = block_x * BLOCK_SIZE;

        var result = new Uint8Array(block_y * pitch);

        var cursor = new BiWriter(result);

        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const color_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint16
                    const alpha_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint8
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha_endpoints[i] = tables.alpha_endpoint().next(codec, alpha_endpoint_index);
                    }
                    for (let i = 0; i < tiles_count; i++) {
                        color_endpoints[i] = tables.color_endpoint().next(codec, color_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha_selector = tables.alpha_selector().next(codec, alpha_selector_index);//uint8
                        const color_selector = tables.color_selector().next(codec, color_selector_index);//uint8
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            //write
                            const alpend_write = alpha_endpoints[tiles[i]];
                            cursor.uint8 = alpend_write[0];
                            cursor.uint8 = alpend_write[1];
                            alpha_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                            const corend_write = color_endpoints[tiles[i]];
                            cursor.uint16 = corend_write[0];
                            cursor.uint16 = corend_write[1];
                            color_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) { 
            throw new Error!("extra bytes in DXT1 codec") 
        }
        return cursor.get as Uint8Array;
    }

    unpackDxt5A(tables: Tables, codec: Codec, width: number, height: number, face:number){
        const BLOCK_SIZE = 8;

        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);

        var tile_bits = new Uint32Array([1]);

        var alpha_endpoint_index = new Uint32Array([0]);
        var alpha_selector_index = new Uint32Array([0]);

        var pitch = block_x * BLOCK_SIZE;

        var result = new Uint8Array(block_y * pitch);

        var cursor = new BiWriter(result);

        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const alpha_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint8
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha_endpoints[i] = tables.alpha_endpoint().next(codec, alpha_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha_selector = tables.alpha_selector().next(codec, alpha_selector_index);//uint8
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            //write
                            const alpend_write = alpha_endpoints[tiles[i]];
                            cursor.uint8 = alpend_write[0];
                            cursor.uint8 = alpend_write[1];
                            alpha_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) { 
            throw new Error!("extra bytes in DXT1 codec") 
        }
        return cursor.get as Uint8Array;
    }
    
    unpackDxn(tables: Tables, codec: Codec, width: number, height: number, face:number){
        const BLOCK_SIZE = 16;

        var block_x = Math.floor((width + 3) / 4);
        var block_y = Math.floor((height + 3) / 4);
        
        var chunk_x = Math.floor((block_x + 1) / this.TRUNK_SIZE);
        var chunk_y = Math.floor((block_y + 1) / this.TRUNK_SIZE);

        var tile_bits = new Uint32Array([1]);

        var alpha0_endpoint_index = new Uint32Array([0]);
        var alpha0_selector_index = new Uint32Array([0]);
        var alpha1_endpoint_index = new Uint32Array([0]);
        var alpha1_selector_index = new Uint32Array([0]);

        var pitch = block_x * BLOCK_SIZE;

        var result = new Uint8Array(block_y * pitch);

        var cursor = new BiWriter(result);

        for (let _f = 0; _f < face; _f++) {
            for (let y = 0; y < chunk_y; y++) {
                const skip_y = y == (chunk_y - 1) && (block_y & 1) == 1;
                const xrange = y % 2 === 1 ? Array.from({ length: chunk_x }, (_, i) => chunk_x - i - 1) : Array.from({ length: chunk_x }, (_, i) => i);
                for (const x of xrange) {
                    const skip_x = (block_x & 1) == 1 && x == (chunk_x - 1);
                    const alpha0_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint8
                    const alpha1_endpoints = new Array(4).fill(0).map(() => [0, 0]); //uint8
                    const { tiles_count, tiles } = this.next_tile_idx(codec, tables.chunk_enc, tile_bits);
                    for (let i = 0; i < tiles_count; i++) {
                        alpha0_endpoints[i] = tables.alpha_endpoint().next(codec, alpha0_endpoint_index);
                    }
                    for (let i = 0; i < tiles_count; i++) {
                        alpha1_endpoints[i] = tables.color_endpoint().next(codec, alpha1_endpoint_index);
                    }
                    for (let i = 0; i < tiles.length; i++) {
                        const alpha0_selector = tables.alpha_selector().next(codec, alpha0_selector_index);//uint8
                        const alpha1_selector = tables.alpha_selector().next(codec, alpha1_selector_index);//uint8
                        if (!skip_x && !skip_y) {
                            if (i % this.TRUNK_SIZE === 0) {
                                const pos = (y * this.TRUNK_SIZE + i / this.TRUNK_SIZE) * pitch + x * BLOCK_SIZE * this.TRUNK_SIZE;
                                cursor.goto(pos);
                            }
                            //write
                            const alp0end_write = alpha0_endpoints[tiles[i]];
                            cursor.uint8 = alp0end_write[0];
                            cursor.uint8 = alp0end_write[1];
                            alpha0_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                            const alp1end_write = alpha1_endpoints[tiles[i]];
                            cursor.uint8 = alp1end_write[0];
                            cursor.uint8 = alp1end_write[1];
                            alpha1_selector.forEach(value=>{
                                cursor.uint8 = value;
                            })
                        }
                    }
                }
            }
        }
        if (!codec.is_complete()) { 
            throw new Error!("extra bytes in DXT1 codec") 
        }
        return cursor.get as Uint8Array;
    }
}

function isBuffer(obj: Buffer | Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function isArrayOrBuffer(obj: Buffer | Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

/**
 * Checks the crunched data and returns width, height, mipmaps, faces and format of compressed data.
 * 
 * Must be vaild .crn file format.
 * 
 * Check binary template here:
 * 
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param crndata - Source data as ``Buffer`` or ``Uint8Array``
 * @param mipmap_level - mip level data to return (defaults to index 0 AKA largest image)
 * @returns {object} image metadata
 */
export function getCRNMeta(
    src: Uint8Array | Buffer,
    mipmap_level?: number
    ):{
        width:number,
        height:number,
        mipmaps:number,
        faces:number,
        format:string
    } {
    if(!isArrayOrBuffer(src)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }
    const header = new Header(src);
    const level_idx = mipmap_level && mipmap_level <= header.level_count ? mipmap_level : 0;
    const width = Math.max(1, header.width >> level_idx);
    const height = Math.max(1, header.height >> level_idx);
    return { 
        format: header.format_str,
        width: width,
        height: height, 
        mipmaps: header.level_count,
        faces: header.face_count,
    }
}

/**
 * Uncrunches crunched texture data. Will decode based on packed format or you can return compressed format data (default false).
 * 
 * Must be vaild .crn file format.
 * 
 * Before using, run getCRNMeta to get the image meta data:
 * 
 * ```javascript
 * const crnMETA = getCRNMeta(crnData);
 * crnMETA.format  //DXT1/3/5/n
 * crnMETA.width   //size
 * crnMETA.height  //size
 * crnMETA.mipmaps //number of packed images
 * crnMETA.faces   //face number
 * ```
 * 
 * Check binary template here:
 * 
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Uint8Array | Buffer} src - Source data as ``Buffer`` or ``Uint8Array``
 * @param {number} mipmap_level - mip level to decode (defaults to index 0 AKA largest image).
 * @param {boolean} keepCompressed - Returns formated data (doesn't decode to RGBA) default false.
 * @returns uncrunched data
 */
export function decodeCRN(
    src: Uint8Array | Buffer,
    mipmap_level?:number,
    keepCompressed?:boolean
    ): Uint8Array | Buffer {

    if(!isArrayOrBuffer(src)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }

    const header = new Header(src);

    if(CRN_FORMATS[header.format] == undefined){
        throw new Error(`Unknown crn format #${header.format}`)
    }

    const tables = header.get_table();
    const level_idx = mipmap_level && mipmap_level <= header.level_count ? mipmap_level : 0;
    const level = header.unpack_level(tables, level_idx);
    var retval = level.data;

    if(keepCompressed == true || keepCompressed == undefined){
        switch (header.format) {
            case 0: //BC1
                retval = decodeBC1(level.data,level.width,level.height)
                break;
            case 1: //BC2
                retval = decodeBC2(level.data,level.width,level.height)
                break;
            case 2: //BC3
                retval = decodeBC3(level.data,level.width,level.height)
                break;
            case 9: //BC4
                retval = decodeBC4(level.data,level.width,level.height)
                break;
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                retval = decodeBC5(level.data,level.width,level.height)
                break;
            default:
                break;
        }
    }

    if(isBuffer(src)){
        return Buffer.from(retval)
    }
    return retval
}