function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function arraybuffcheck(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}
/**
 * Flips image data from straight 24 or 32 bit profiles (used in some types of image files)
 * 
 * Defaults to 32 bit profile
 * 
 * @param {Buffer|Uint8Array} src - Source image data as Buffer or Uint8Array
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} is24 - 24 bit color profile
 * @returns ```Buffer``` or ```Uint8Array```
 */
export function flipImage(src:Buffer|Uint8Array, width:number, height:number, is24?:boolean):Buffer|Uint8Array{
    if(!arraybuffcheck(src)){
        throw new Error("Source must be Uint8Array or Buffer")
    }
    const output = isBuffer(src) ? Buffer.alloc(src.length): new Uint8Array(src.length)
    var z = 0
    for (var y = 0; y < height; y++)
	{
		for (var x = 0; x < width; x++)
		{
            var pos = (x + (height - y - 1) * width ) << 2;
            output[pos+0] = src[z+0] & 0xFF;
			output[pos+1] = src[z+1] & 0xFF;
			output[pos+2] = src[z+2] & 0xFF;
            if(is24){
                z+=3
            } else {
                output[pos + 3] = src[z+3] & 0xFF;
                z+=4
            }
        }
    }
    return output;
}