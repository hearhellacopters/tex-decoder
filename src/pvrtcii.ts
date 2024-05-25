//source
//https://github.com/BinomialLLC/basis_universal/blob/ad9386a4a1cf2a248f7bbd45f543a7448db15267/encoder/basisu_gpu_texture.cpp

import {bireader} from './bireader/bireader';

class pvrtc2_block{
    public m : number
    public m_mod_flag : number;
    public m_blue_a : number;
    public m_green_a : number;
    public m_red_a : number;
    public m_alpha_a : number;
    public m_hard_flag : number;
    public m_blue_b : number;
    public m_green_b : number;
    public m_red_b : number;
    public m_alpha_b : number;
    public m_opaque_flag : number;
    public m_modulation:Uint8Array;
    public m_color_data_bits:number;
    constructor(data: Buffer|Uint8Array){
        const br = new bireader(data);
        this.m_modulation = new Uint8Array(4);
        this.m = br.uint32(); 
        br.skip(-4);
        for (let i = 0; i < 4; i++) {
            this.m_modulation[i] = br.ubyte(); 
        }
        br.skip(0,31)
        if(br.ubit(1)){
            br.skip(0,-32)
            this.m_mod_flag = br.ubit(1)

            this.m_blue_a = br.ubit(4)
            this.m_green_a = br.ubit(5)
            this.m_red_a = br.ubit(5)
            this.m_alpha_a = 0;

            this.m_hard_flag = br.ubit(1)

            this.m_blue_b = br.ubit(5)
            this.m_green_b = br.ubit(5)
            this.m_red_b = br.ubit(5)
            this.m_alpha_b = 0;

            this.m_opaque_flag = br.ubit(1) //only used if this is 1            
        } else {
            br.skip(0,-32)
            this.m_mod_flag = br.ubit(1)

            this.m_blue_a = br.ubit(3)
            this.m_green_a = br.ubit(4)
            this.m_red_a = br.ubit(4)
            this.m_alpha_a = br.ubit(3)

            this.m_hard_flag = br.ubit(1)

            this.m_blue_b = br.ubit(4)
            this.m_green_b = br.ubit(4)
            this.m_red_b = br.ubit(4)
            this.m_alpha_b = br.ubit(3)

            this.m_opaque_flag = br.ubit(1)
        }
        br.skip(-4);
        this.m_color_data_bits = br.uint32();
    }
}

class color_rgba {
	r:number;
    g:number;
    b:number;
    a:number
    constructor(r?:number,g?:number,b?:number,a?:number) {
        this.r = r ? r & 0xFF : 0;
        this.g = g ? g & 0xFF : 0;
        this.b = b ? b & 0xFF : 0;
        this.a = a ? a & 0xFF : 0;
    }
    data():number{
        return (((this.a & 0xFF) << 24) | ((this.b & 0xFF) << 16) | ((this.g & 0xFF) << 8) | (this.r & 0xFF))
    }
    set(r?:number,g?:number,b?:number,a?:number){
        this.r = r ? r & 0xFF : 0;
        this.g = g ? g & 0xFF : 0;
        this.b = b ? b & 0xFF : 0;
        this.a = a ? a & 0xFF : 0;
    }
}

function convert_rgb_555_to_888(col:color_rgba):color_rgba{
	return new color_rgba((col.r << 3) | (col.r >> 2), (col.g << 3) | (col.g >> 2), (col.b << 3) | (col.b >> 2), 255);
}

function convert_rgba_5554_to_8888(col: color_rgba):color_rgba{
    return new color_rgba((col.r << 3) | (col.r >> 2), (col.g << 3) | (col.g >> 2), (col.b << 3) | (col.b >> 2), (col.a << 4) | col.a);
}

function unpack_pvrtc2(p:Buffer|Uint8Array, pPixels:color_rgba[], bx:number, by:number, do2bit:boolean):void{
    const pBlock = new pvrtc2_block(p);

    //only works if hard == 1 and m_mod_flag == 0
    if ((!pBlock.m_hard_flag) || (pBlock.m_mod_flag))
    {
        throw new Error (`This mode ${!pBlock.m_hard_flag?"[hard flag]":""}${pBlock.m_mod_flag?"[mod flag]":""}) isn't supported by the transcoder`)
    }

    //this code isn't working yet

    var ChessboardPixelMod = 0;
    var regionpixelID = bx + by * (do2bit?8:4);
    var ModulationMode = 0;
    //Do interpolate for Modulation
    if(pBlock.m_mod_flag){
        //init at first H and V Only interpolated
        ModulationMode = 1;
        //Select H or V Only interpolated
        if((pBlock.m & 1) == 1){
            if((pBlock.m & (1 << 20)) >= 1){
            	//V-Only interpolated
                ModulationMode = 3;
            } else {
            	//H-Only interpolated
                ModulationMode = 2;
            }

             /*
				Create an extra bit for the centre pixel so that it looks like
				we have 2 actual bits for this texel. It makes later coding much easier.
			*/
            if((pBlock.m & (1 << 21)) >= 1){
                // set it to produce code for 1.0
            	pBlock.m |= (1 << 21);
            } else {
                // clear it to produce 0.0 code
            	pBlock.m &= ~(1 << 20);
            }
        }

        if ((pBlock.m & 2) >= 1){
            pBlock.m |=   1; /*set it*/
        }
        else
        {
            pBlock.m = pBlock.m & (~ 1); /*clear it*/
        }

        //Here we use "Chessboard method" to get value
        //The mod values layout like this:
        /*
          x --> 0	1	2	3	4	5	6	7
         -------------------------------------   	Note: 0-15 is ChessboardID,the * is ignore pixel.
          y 0|	0	*	1	*	2	*	3	*
             |   
            1|	*	4	*	5	*	6	*	7
             |
            2|	8	*	9	*	10	*	11	*
             |
            3|	*	12	*	13	*	14	*	15

		*/
        if (((bx+by) & 1) == 0){
            var ChessboardID = 
                ((do2bit?8:4)>>1) * by + ((bx - (by&1))>>1);
        	ChessboardPixelMod = (pBlock.m >> (ChessboardID * 2)) & 3;
        }

    } else {
    	ChessboardPixelMod = ((pBlock.m >> regionpixelID) & 1)*3;
    }

    //end of non-working code

    const colors = Array.from({length:4}, ()=> new color_rgba())

    if (pBlock.m_opaque_flag)
    {
        // colora=554
        const color_a = new color_rgba(pBlock.m_red_a, pBlock.m_green_a, (pBlock.m_blue_a << 1) | (pBlock.m_blue_a >> 3), 255);

        // colora=555
        const color_b = new color_rgba(pBlock.m_red_b, pBlock.m_green_b, pBlock.m_blue_b, 255);

        colors[0] = convert_rgb_555_to_888(color_a);
        colors[3] = convert_rgb_555_to_888(color_b);

        colors[1].set((colors[0].r * 5 + colors[3].r * 3) / 8, (colors[0].g * 5 + colors[3].g * 3) / 8, (colors[0].b * 5 + colors[3].b * 3) / 8, 255);
        colors[2].set((colors[0].r * 3 + colors[3].r * 5) / 8, (colors[0].g * 3 + colors[3].g * 5) / 8, (colors[0].b * 3 + colors[3].b * 5) / 8, 255);
    }
    else
    {
        // colora=4433 
        const color_a = new color_rgba(
            (pBlock.m_red_a << 1) | (pBlock.m_red_a >> 3), 
            (pBlock.m_green_a << 1) | (pBlock.m_green_a >> 3),
            (pBlock.m_blue_a << 2) | (pBlock.m_blue_a >> 1), 
            pBlock.m_alpha_a << 1);

        //colorb=4443
        const color_b = new color_rgba(
            (pBlock.m_red_b << 1) | (pBlock.m_red_b >> 3),
            (pBlock.m_green_b << 1) | (pBlock.m_green_b >> 3),
            (pBlock.m_blue_b << 1) | (pBlock.m_blue_b >> 3),
            (pBlock.m_alpha_b << 1) | 1);

        colors[0] = convert_rgba_5554_to_8888(color_a);
        colors[3] = convert_rgba_5554_to_8888(color_b);
    }

    colors[1].set((colors[0].r * 5 + colors[3].r * 3) / 8, (colors[0].g * 5 + colors[3].g * 3) / 8, (colors[0].b * 5 + colors[3].b * 3) / 8, (colors[0].a * 5 + colors[3].a * 3) / 8);
    colors[2].set((colors[0].r * 3 + colors[3].r * 5) / 8, (colors[0].g * 3 + colors[3].g * 5) / 8, (colors[0].b * 3 + colors[3].b * 5) / 8, (colors[0].a * 3 + colors[3].a * 5) / 8);

    if(do2bit){
        for (var i = 0; i < 32; i++){
            const sel = (pBlock.m_modulation[i >> 2] >> ((i & 7) * 2)) & 3;
            pPixels[i] = colors[sel];
        }
    } else {
        for (var i = 0; i < 16; i++){
            const sel = (pBlock.m_modulation[i >> 2] >> ((i & 3) * 2)) & 3;
            pPixels[i] = colors[sel];
        }
    }
    
}

function copy_block_buffer(
    bx: number,
    by: number,
    w: number,
    h: number,
    bw: number,
    bh: number,
    buffer: color_rgba[],
    image: Uint32Array,
) {
    let x = bw * bx;
    let copy_width = bw * (bx + 1) > w ? (w - bw * bx) : bw

    let y_0 = by * bh;
    let copy_height = bh * (by + 1) > h ? h - y_0 : bh ;
    let buffer_offset = 0;
    for (let y = y_0; y < y_0 + copy_height; y++) {
        let image_offset = y * w + x;
        let bufferIndex = buffer_offset;
        for (let i = 0; i < copy_width; i++) {
            image[image_offset + i] = buffer[bufferIndex].data();
            bufferIndex++;
        }
        buffer_offset += bw;
    }
}

function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function isArrayOrBuffer(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

/**
 * Decompress PVRTCII 4bit data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodePVRTCII4bit(data:Buffer|Uint8Array, width:number, height:number):Buffer|Uint8Array{
    if(!isArrayOrBuffer(data)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }

    const num_blocks_x = Math.floor((width + 4 - 1) / 4);
    const num_blocks_y = Math.floor((height + 4 - 1) / 4);
    const raw_block_size = 8;
    var buffer:color_rgba[] = [];

    var image = new Uint32Array(width * height);

    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            unpack_pvrtc2(data.subarray(data_offset,data_offset+raw_block_size), buffer, bx, by, false);
            copy_block_buffer(bx,by,width,height,4,4,buffer,image)
            data_offset += raw_block_size;
            buffer = [];
        }
    }

    if(isBuffer(data)){
        return Buffer.from(image.buffer)
    }
    return new Uint8Array(image.buffer)
}

/**
 * Decompress PVRTCII 2bit data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodePVRTCII2bit(data:Buffer|Uint8Array, width:number, height:number):Buffer|Uint8Array{
    if(!isArrayOrBuffer(data)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }

    const num_blocks_x = Math.floor((width + 4 - 1) / 4);
    const num_blocks_y = Math.floor((height + 4 - 1) / 4);
    const raw_block_size = 8;
    var buffer:color_rgba[] = [];

    var image = new Uint32Array(width * height);

    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            unpack_pvrtc2(data.subarray(data_offset,data_offset+raw_block_size), buffer, bx, by, true);
            copy_block_buffer(bx,by,width,height,8,4,buffer,image)
            data_offset += raw_block_size;
            buffer = [];
        }
    }

    if(isBuffer(data)){
        return Buffer.from(image.buffer)
    }
    return new Uint8Array(image.buffer)
}