//source
//https://docs.rs/texture2ddecoder/0.0.5/src/texture2ddecoder/bcn.rs.html

function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function isArrayOrBuffer(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

function check_size (width:number, height:number, bpp:number, src:Buffer|Uint8Array):void{
	const size_needed = width * height * bpp / 8;
	if(src.length < size_needed){
		throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`)
	}
}

/**
 * Decompress BC1 data (aka DXT1). Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC1(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXT1(src,width,height)
}

/**
 * Decompress DXT1 data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeDXT1(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
{

    if(!isArrayOrBuffer(src)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}

    check_size(width,height,4,src)

    const asBuffer = isBuffer(src) ? true : false
    const output = asBuffer ? Buffer.alloc (width*height*4): new Uint8Array(width*height*4)
    //int 
    var offset = 0;
    const bcw = new Int32Array([(width + 3) / 4])[0]
    const bch = new Int32Array([(height+ 3) / 4])[0]
    const clen_last = new Int32Array([(width + 3) % 4 + 1])[0];
    //uint[] 
    const buffer = new Uint32Array(16);
    //int[] 
    const colors = new Int32Array(4);
    for (var t = 0; t < bch; t++)
    {
        for (var s = 0; s < bcw; s++, offset += 8)
        {
            const r0 = new Int32Array(1), 
                  g0 = new Int32Array(1), 
                  b0 = new Int32Array(1), 
                  r1 = new Int32Array(1), 
                  g1 = new Int32Array(1), 
                  b1 = new Int32Array(1),
                  q0 = new Int32Array([src[offset + 0] | src[offset + 1] << 8]),
                  q1 = new Int32Array([src[offset + 2] | src[offset + 3] << 8]);
            Rgb565(q0, r0, g0, b0);
            Rgb565(q1, r1, g1, b1);
            colors[0] = Color(r0[0], g0[0], b0[0], 255);
            colors[1] = Color(r1[0], g1[0], b1[0], 255);
            if (q0[0] > q1[0])
            {
                colors[2] = Color(
                    new Int32Array([(r0[0] * 2 + r1[0]) / 3])[0], 
                    new Int32Array([(g0[0] * 2 + g1[0]) / 3])[0], 
                    new Int32Array([(b0[0] * 2 + b1[0]) / 3])[0], 
                    255);
                colors[3] = Color(
                    new Int32Array([(r0[0] + r1[0] * 2) / 3])[0], 
                    new Int32Array([(g0[0] + g1[0] * 2) / 3])[0], 
                    new Int32Array([(b0[0] + b1[0] * 2) / 3])[0], 
                    255);
            }
            else
            {
                colors[2] = Color(
                    new Int32Array([(r0[0] + r1[0]) / 2])[0], 
                    new Int32Array([(g0[0] + g1[0]) / 2])[0], 
                    new Int32Array([(b0[0] + b1[0]) / 2])[0], 
                    255);
            }
            //uint d = BitConverter.ToUInt32(input, offset + 4);
            const loc =  offset + 4;
            var d = (((src[loc + 3] & 0xFF)<< 24) | ((src[loc + 2] & 0xFF) << 16) | ((src[loc + 1] & 0xFF) << 8) | (src[loc] & 0xFF)) >>>0
            for (var i = 0; i < 16; i++, d >>= 2)
            {
                buffer[i] = colors[d & 3];
            }

            const clen = new Int32Array([(s < bcw - 1 ? 4 : clen_last) * 4])[0];
            const buffer8uint = new Uint8Array(buffer.buffer)
            for (var i = 0, y = t * 4; i < 4 && y < height; i++, y++)
            {
                //Buffer.BlockCopy(buffer, i * 4 * 4, output, (y * width + s * 4) * 4, clen);
                const srcOff = i * 4 * 4;
                const dstOff = (y * width + s * 4) * 4;
                for (let z = 0; z < clen; z++) {
                    //output[dstOff+z] = buffer8uint[srcOff+z]
                    output[dstOff+z] = buffer8uint[srcOff+z]
                }
            }
        }
    }

    return output
}

/**
 * Decompress DXT2. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeDXT2(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn2(src,width,height, true)
}

/**
 * Decompress BC2 data (aka DXT3). Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC2(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn2(src,width,height, false)
}

/**
 * Decompress DXT3 data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeDXT3(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn2(src,width,height, false)
}


function lerp (v1:number, v2:number, r:number):number {
    return v1 * (1 - r) + v2 * r;
};

function convert565ByteToRgb (byte:number):number[] {
    return [
        Math.round(((byte >>> 11) & 31) * (255 / 31)),
        Math.round(((byte >>> 5) & 63) * (255 / 63)),
        Math.round((byte & 31) * (255 / 31))
    ];
};

function interpolateColorValues (firstVal:number, secondVal:number, isDxt1?:boolean):number[] {
    var firstColor = convert565ByteToRgb(firstVal),
        secondColor = convert565ByteToRgb(secondVal),
        colorValues = [...firstColor, 255, ...secondColor, 255];

    if (isDxt1 && firstVal <= secondVal) {
        colorValues.push(
            Math.round((firstColor[0] + secondColor[0]) / 2),
            Math.round((firstColor[1] + secondColor[1]) / 2),
            Math.round((firstColor[2] + secondColor[2]) / 2),
            255,

            0,
            0,
            0,
            0
        );
    } else {
        colorValues.push(
            Math.round(lerp(firstColor[0], secondColor[0], 1 / 3)),
            Math.round(lerp(firstColor[1], secondColor[1], 1 / 3)),
            Math.round(lerp(firstColor[2], secondColor[2], 1 / 3)),
            255,

            Math.round(lerp(firstColor[0], secondColor[0], 2 / 3)),
            Math.round(lerp(firstColor[1], secondColor[1], 2 / 3)),
            Math.round(lerp(firstColor[2], secondColor[2], 2 / 3)),
            255
        );
    }

    return colorValues;
};

function multiply(component:number, multiplier:number):number {
    if (!isFinite(multiplier) || multiplier === 0) {
        return 0;
    }

    return Math.round(component * multiplier);
};

function extractBitsFromUin16Array (array:number[], shift:number, length:number):number {

    var height = array.length,
        heightm1 = height - 1,
        width = 16,
        rowS = ((shift / width) | 0),
        rowE = (((shift + length - 1) / width) | 0),
        shiftS,
        shiftE,
        result;

    if (rowS === rowE) {

        shiftS = (shift % width);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
    } else {
 
        shiftS = (shift % width);
        shiftE = (width - shiftS);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
        result += (array[heightm1 - rowE] & (Math.pow(2, length - shiftE) - 1)) << shiftE;
    }

    return result;
};

function getAlphaIndex2 (alphaIndices:number[], pixelIndex:number):number {
    return extractBitsFromUin16Array(alphaIndices, (3 * (15 - pixelIndex)), 3);
};

function interpolateAlphaValues (firstVal:number, secondVal:number):number[] {
    var alphaValues = [firstVal, secondVal];

    if (firstVal > secondVal) {
        alphaValues.push(
            Math.floor(lerp(firstVal, secondVal, 1 / 7)),
            Math.floor(lerp(firstVal, secondVal, 2 / 7)),
            Math.floor(lerp(firstVal, secondVal, 3 / 7)),
            Math.floor(lerp(firstVal, secondVal, 4 / 7)),
            Math.floor(lerp(firstVal, secondVal, 5 / 7)),
            Math.floor(lerp(firstVal, secondVal, 6 / 7))
        );
    } else {
        alphaValues.push(
            Math.floor(lerp(firstVal, secondVal, 1 / 5)),
            Math.floor(lerp(firstVal, secondVal, 2 / 5)),
            Math.floor(lerp(firstVal, secondVal, 3 / 5)),
            Math.floor(lerp(firstVal, secondVal, 4 / 5)),
            0,
            255
        );
    }

    return alphaValues;
};

/**
 * Decompress DXT4. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeDXT4(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn3(src,width,height, true)
}

/**
 * Decompress DXT5. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeDXT5(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn3(src,width,height, false)
}

/**
 * Decompress BC3 (aka DXT5). Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC3(
    /*byte[] */ src:Uint8Array|Buffer, 
    /*int */ width:number, 
    /*int */ height:number, 
    /*byte[] output */ ):Uint8Array|Buffer
    {
        return decodeDXTn3(src,width,height, false)
}

function decodeDXTn3 (
    input:Uint8Array|Buffer, 
    width:number, 
    height:number, 
    premultiplied:boolean
    ) {

    if(!isArrayOrBuffer(input)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }

    check_size(width,height,4,input)
    
    var rgba = isBuffer(input) ? Buffer.alloc(width * height * 4) : new Uint8Array(width * height * 4),
        height_4 = (height / 4) | 0,
        width_4 = (width / 4) | 0,
        offset = 0,
        alphaValues,
        alphaIndices,
        alphaIndex,
        alphaValue,
        multiplier,
        colorValues,
        colorIndices,
        colorIndex,
        pixelIndex,
        rgbaIndex,
        h,
        w,
        x,
        y;

    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            alphaValues = interpolateAlphaValues(input[offset] & 0xFF, input[offset + 1] & 0xFF,);
            alphaIndices = [
                ((input[(offset + 6) + 1] << 8) | input[(offset + 6)]) & 0xFFFF,
                ((input[(offset + 4) + 1] << 8) | input[(offset + 4)]) & 0xFFFF,
                ((input[(offset + 2) + 1] << 8) | input[(offset + 2)]) & 0xFFFF
            ]; 

            colorValues = interpolateColorValues(((input[(offset + 8) + 1] << 8) | input[(offset + 8)]) & 0xFFFF, ((input[(offset + 10) + 1] << 8) | input[(offset + 10)]) & 0xFFFF);
            colorIndices = ((input[(offset + 12) + 3] << 24) | (input[(offset + 12) + 2] << 16) | (input[(offset + 12) + 1] << 8) | input[(offset + 12)]) >>> 0

            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    alphaIndex = getAlphaIndex2(alphaIndices, pixelIndex);
                    alphaValue = alphaValues[alphaIndex];

                    multiplier = premultiplied ? 255 / alphaValue : 1;

                    rgba[rgbaIndex] = multiply(colorValues[colorIndex * 4], multiplier);
                    rgba[rgbaIndex + 1] = multiply(colorValues[colorIndex * 4 + 1], multiplier);
                    rgba[rgbaIndex + 2] = multiply(colorValues[colorIndex * 4 + 2], multiplier);
                    rgba[rgbaIndex + 3] = alphaValue
                }
            }

            offset += 16;
        }
    }

    return rgba;
};

function getAlphaValue (alphaValue:number[], pixelIndex:number):number {
    return extractBitsFromUin16Array(alphaValue, (4 * (15 - pixelIndex)), 4) * 17;
};

function decodeDXTn2 (
    input:Uint8Array|Buffer, 
    width:number, 
    height:number, 
    premultiplied:boolean) {

    if(!isArrayOrBuffer(input)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }

    check_size(width,height,4,input)

    var rgba = isBuffer(input) ? Buffer.alloc(width * height * 4) : new Uint8Array(width * height * 4),
        height_4 = (height / 4) | 0,
        width_4 = (width / 4) | 0,
        offset = 0,
        alphaValues,
        alphaValue,
        multiplier,
        colorValues,
        colorIndices,
        colorIndex,
        pixelIndex,
        rgbaIndex,
        h,
        w,
        x,
        y;
        
    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            alphaValues = [
                ((input[(offset + 6) + 1] << 8) | input[(offset + 6)]) & 0xFFFF,
                ((input[(offset + 4) + 1] << 8) | input[(offset + 4)]) & 0xFFFF,
                ((input[(offset + 2) + 1] << 8) | input[(offset + 2)]) & 0xFFFF,
                ((input[(offset + 0) + 1] << 8) | input[(offset + 0)]) & 0xFFFF
            ]; // reordered as big endian

            colorValues = interpolateColorValues(((input[(offset + 8) + 1] << 8) | input[(offset + 8)]) & 0xFFFF, ((input[(offset + 10) + 1] << 8) | input[(offset + 10)]) & 0xFFFF);
            colorIndices = ((input[(offset + 12) + 3] << 24) | (input[(offset + 12) + 2] << 16) | (input[(offset + 12) + 1] << 8) | input[(offset + 12)]) >>> 0

            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    alphaValue = getAlphaValue(alphaValues, pixelIndex);

                    multiplier = premultiplied ? 255 / alphaValue : 1;

                    rgba[rgbaIndex] = multiply(colorValues[colorIndex * 4], multiplier);
                    rgba[rgbaIndex + 1] = multiply(colorValues[colorIndex * 4 + 1], multiplier);
                    rgba[rgbaIndex + 2] = multiply(colorValues[colorIndex * 4 + 2], multiplier);
                    rgba[rgbaIndex + 3] = getAlphaValue(alphaValues, pixelIndex);
                }
            }

            offset += 16;
        }
    }

    return rgba;
};

// [MethodImpl(MethodImplOptions.AggressiveInlining)]
// private static void 
function Rgb565(
    /*int */c:Int32Array, 
    /*out int*/r:Int32Array, 
    /*out int*/g:Int32Array, 
    /*out int*/b:Int32Array):void
{
    r[0] = (c[0] & 0xf800) >> 8;
    g[0] = (c[0] & 0x07e0) >> 3;
    b[0] = (c[0] & 0x001f) << 3;
    r[0] |= r[0] >> 5;
    g[0] |= g[0] >> 6;
    b[0] |= b[0] >> 5;
}

// [MethodImpl(MethodImplOptions.AggressiveInlining)]
// private static int 
function Color(
    /*int*/ r:number, 
    /*int*/ g:number, 
    /*int*/ b:number, 
    /*int*/ a:number):number
{
    return r << 16 | g << 8 | b | a << 24;
}
