const RGB = 24;
const RGBA = 32;

function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}


function arraybuffcheck(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

export const TGA_PROFILE ={
    RGB, 
    RGBA
}

function flipImage(src: Buffer | Uint8Array, width: number, height: number, is24?: boolean): Buffer | Uint8Array {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer")
    }
    const output = isBuffer(src) ? Buffer.alloc(src.length) : new Uint8Array(src.length)
    var z = 0
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var pos = (x + (height - y - 1) * width) << 2;
            output[pos + 0] = src[z + 0] & 0xFF;
            output[pos + 1] = src[z + 1] & 0xFF;
            output[pos + 2] = src[z + 2] & 0xFF;
            if (is24) {
                z += 3
            } else {
                output[pos + 3] = src[z + 3] & 0xFF;
                z += 4
            }
        }
    }
    return output;
}

/**
 * Create a .tga file. Must be straight RGBA or RGB profile.
 * 
 * @param {Uint8Array|Buffer} src - source as RGB or RGBA
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {boolean} noAlpha - Color profile is RGB (default RGBA)
 * @returns 
 */
export function makeTGA(
    src:Uint8Array|Buffer,
    width:number,
    height:number,
    noAlpha?:boolean):Uint8Array|Buffer{

    if(!arraybuffcheck(src)){
        throw new Error("Source must be Uint8Array or Buffer");
    }

    var profile = 32;
    if(noAlpha){
        profile = 24;
    }
    const header = new Uint8Array(18)
    header[2] = 2;
    //write width
    header[12] =  width & 0xff;
    header[13] = (width >> 8) & 0xff; 
    //write height
    header[14] =  height & 0xff;
    header[15] = (height >> 8) & 0xff; 
    header[16] = profile;
    header[17] = profile == 32 ? 8 : 0;
    const data = flipImage(src,width,height,profile == 32?false:true)
    const footer_text = "\0\0\0\0\0\0\0\0TRUEVISION-XFILE.\0"
    const footer = new TextEncoder().encode(footer_text)
    const final_data =  new Uint8Array([...header, ...data, ...footer]);
    return final_data
}