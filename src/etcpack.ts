// source
// https://github.com/Ericsson/ETCPACK/blob/master/source/etcpack.cxx

import {
	decompressColor,
	calculatePaintColors59T,
	calculatePaintColors58H,
	decompressBlockTHUMB59T,
	decompressBlockTHUMB58H,
	decompressBlockPlanar57,
	decompressBlockDiffFlip,
	decompressBlockDifferentialWithAlpha,
	decompressBlockTHUMB58HAlpha,
	decompressBlockTHUMB59TAlpha,
	getbit,
	clamp,
	get16bits11bits,
	get16bits11signed,
} from './etc';

const RAND_MAX = 0x7fff;

/**
 * new RandomXorShift().
 * 
 * Can be seeded with a 4 byte Buffer or number.
 * 
 * Use ``rand()`` for random number on [0,0xffffffff]-interval.
 * 
 * @class
 * @param {number} seed - Can be seeded
 */
class rng {
	mt: number[];
	/**
	 * Seeds the random number generator with a 4 byte Buffer or number.
	 * 
	 * @param {number} seed - Can be seeded
	 */
	constructor(seed: number) {
		var s;
		this.mt = [0, 0, 0, 0];

		if (seed != undefined) {
			this.mt[0] = seed >>> 0;
		} else {
			this.mt[0] = 1;
		}

		for (var i = 1; i < 5; i++) {
			s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
			this.mt[i] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + (i - 1);
			this.mt[i] >>>= 0;
		}
		this.mt.shift();
	}

	/**
	 * generates a random number on [0,0xffffffff]-interval 
	 * 
	 * @returns {number} number
	 */
	rand(): number {
		var v1 = this.mt[0];
		var v4 = this.mt[3];
		var number = (v4 ^ (v4 >>> 19) ^ v1 ^ (v1 << 11) ^ ((v1 ^ (v1 << 11)) >>> 8)) >>> 0;
		this.mt.shift();
		this.mt.push(number);
		return number;
	}
}

type uint8 = Uint8Array | Buffer;
type uint16 = Uint16Array;
type int16 = Int16Array;
type uint = number; // Uint32Array
type int = number; // Int32Array
type float = number; // Float32Array;
type double = number; // Float64Array;

function isBuffer(obj: uint8): boolean {
	return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function arraybuffcheck(obj: uint8): boolean {
	return obj instanceof Uint8Array || isBuffer(obj);
}

function malloc(obj: uint8, amount: number): uint8 {
	if (isBuffer(obj)) {
		return Buffer.alloc(amount);
	} else {
		return new Uint8Array(amount);
	}
}

var alphaTableInitialized = 0;
// Global variables
var formatSigned = false;

function setupAlphaTable(): void {
	if (alphaTableInitialized) {
		return;
	}
	alphaTableInitialized = 1;
	var buf;
	for (var i = 16; i < 32; i++) {
		for (var j = 0; j < 8; j++) {
			buf = alphaBase[i - 16][3 - j % 4];
			if (j < 4)
				alphaTable[i][j] = buf;
			else
				alphaTable[i][j] = (-buf - 1);
		}
	}

	for (let i = 0; i < 256; i++) {
		let mul = i / 16;
		let old = 16 + i % 16;
		for (let j = 0; j < 8; j++) {
			alphaTable[i][j] = alphaTable[old][j] * mul;
		}
	}
}

function CLAMP(ll: number, x: number, ul: number): number {
	return (((x) < (ll)) ? (ll) : (((x) > (ul)) ? (ul) : (x)));
}
function CLAMP_LEFT_ZERO(x: number) {
	return ((~(((x)) >> 31)) & (x));
}
function CLAMP_RIGHT_255(x: number) {
	return ((((((((x)) << 23) >> 31))) | (x)) & 0x000000ff);
}

function SQUARE(x: number) {
	return ((x) * (x));
}
function JAS_ROUND(x: number) {
	return (((x) < 0.0) ? (((x) - 0.5) >> 0) : (((x) + 0.5) >> 0));
}
function JAS_MIN(a: number, b: number) {
	return ((a) < (b) ? (a) : (b));
}
function JAS_MAX(a: number, b: number) {
	return ((a) > (b) ? (a) : (b));
}

// The error metric Wr Wg Wb should be definied so that Wr^2 + Wg^2 + Wb^2 = 1.
// Hence it is easier to first define the squared values and derive the weights
// as their square-roots.

const PERCEPTUAL_WEIGHT_R_SQUARED = 0.299;
const PERCEPTUAL_WEIGHT_G_SQUARED = 0.587;
const PERCEPTUAL_WEIGHT_B_SQUARED = 0.114;

const PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 = 299;
const PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 = 587;
const PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 = 114;

function RED(img: Uint8Array, width: number, x: number, y: number) {
	return img[3 * (y * width + x) + 0];
};
function GREEN(img: Uint8Array, width: number, x: number, y: number) {
	return img[3 * (y * width + x) + 1];
};
function BLUE(img: Uint8Array, width: number, x: number, y: number) {
	return img[3 * (y * width + x) + 2]
};

function SHIFT(size: number, startpos: number): number {
	return ((startpos) - (size) + 1)
}

function MASK(size: number, startpos: number): number {
	return (((2 << (size - 1)) - 1) << SHIFT(size, startpos))
}

/**
 * MUST RETURN TO FIRST ARGUMENT
 */
function PUTBITS(dest: number, data: number, size: number, startpos: number): number {
	return ((dest & ~MASK(size, startpos)) | ((data << SHIFT(size, startpos)) & MASK(size, startpos)))
}

function SHIFTHIGH(size: number, startpos: number): number {
	return (((startpos) - 32) - (size) + 1)
}

function MASKHIGH(size: number, startpos: number): number {
	return (((1 << (size)) - 1) << SHIFTHIGH(size, startpos))
}

/**
 * MUST RETURN TO FIRST ARGUMENT
 */
function PUTBITSHIGH(dest: number, data: number, size: number, startpos: number): number {
	return ((dest & ~MASKHIGH(size, startpos)) | ((data << SHIFTHIGH(size, startpos)) & MASKHIGH(size, startpos)))
}

function GETBITS(source: number, size: number, startpos: number): number {
	return (((source) >> ((startpos) - (size) + 1)) & ((1 << (size)) - 1))
}

function GETBITSHIGH(source: number, size: number, startpos: number): number {
	return (((source) >> (((startpos) - 32) - (size) + 1)) & ((1 << (size)) - 1))
}

// Thumb macros and definitions
const R_BITS59T = 4;
const G_BITS59T = 4;
const B_BITS59T = 4;
const R_BITS58H = 4;
const G_BITS58H = 4;
const B_BITS58H = 4;
const MAXIMUM_ERROR = 1040400000;
const R = 0;
const G = 1;
const B = 2;
const BLOCKHEIGHT = 4;
const BLOCKWIDTH = 4;
function BINPOW(power: number) { return 1 << (power) };
//#define RADIUS 2
const TABLE_BITS_59T = 3;
const TABLE_BITS_58H = 3;

// 3-bit table for the 59 bit T-mode
const table59T = new Uint8Array([3, 6, 11, 16, 23, 32, 41, 64]);
// 3-bit table for the 58 bit H-mode
const table58H = new Uint8Array([3, 6, 11, 16, 23, 32, 41, 64]);
const weight = new Uint8Array([1, 1, 1]);

const PATTERN_H = 0,
	  PATTERN_T = 1;

const MODE_ETC1 = 0,
	  MODE_THUMB_T = 1,
	  MODE_THUMB_H = 2,
	  MODE_PLANAR = 3;

const ETC1_RGB_NO_MIPMAPS = 0,
	  ETC2PACKAGE_RGB_NO_MIPMAPS = 1,
	  ETC2PACKAGE_RGBA_NO_MIPMAPS_OLD = 2,
	  ETC2PACKAGE_RGBA_NO_MIPMAPS = 3,
	  ETC2PACKAGE_RGBA1_NO_MIPMAPS = 4,
	  ETC2PACKAGE_R_NO_MIPMAPS = 5,
	  ETC2PACKAGE_RG_NO_MIPMAPS = 6,
	  ETC2PACKAGE_R_SIGNED_NO_MIPMAPS = 7,
	  ETC2PACKAGE_RG_SIGNED_NO_MIPMAPS = 8,
	  ETC2PACKAGE_sRGB_NO_MIPMAPS = 9,
	  ETC2PACKAGE_sRGBA_NO_MIPMAPS = 10,
	  ETC2PACKAGE_sRGBA1_NO_MIPMAPS = 11;

const MODE_COMPRESS = 0,
	  MODE_UNCOMPRESS = 1,
	  MODE_PSNR = 2;

const SPEED_SLOW = 0,
	  SPEED_FAST = 1,
	  SPEED_MEDIUM = 2;

const METRIC_PERCEPTUAL = 0,
	  METRIC_NONPERCEPTUAL = 1;

const CODEC_ETC = 0,
	  CODEC_ETC2 = 1;

// defined in function

// var mode = MODE_COMPRESS;
// var speed = SPEED_FAST;
// var metric = METRIC_PERCEPTUAL;
// var codec = CODEC_ETC2;
// var format = ETC2PACKAGE_RGB_NO_MIPMAPS;
var verbose = false;
// var formatSigned;
var ktxFile=0;
var first_time_message = false;

const scramble = new Int32Array([3, 2, 0, 1]);
const unscramble = new Int32Array([2, 3, 1, 0]);

class KTX_header{
	data = new Uint8Array(64);
	identifier = [
		this.identifier0,
		this.identifier1,
		this.identifier2,
		this.identifier3,
		this.identifier4,
		this.identifier5,
		this.identifier6,
		this.identifier7,
		this.identifier8,
		this.identifier9,
		this.identifier10,
		this.identifier11,
	]
	set endianness(value:number){
		this.writeUint32(value, 12);
	}
	set glType(value:number){
		this.writeUint32(value, 16);
	}
	set glTypeSize(value:number){
		this.writeUint32(value, 20);
	}
	set glFormat(value:number){
		this.writeUint32(value, 24);
	}
	set glInternalFormat(value:number){
		this.writeUint32(value, 28);
	}
	set glBaseInternalFormat(value:number){
		this.writeUint32(value, 32);
	}
	set pixelWidth(value:number){
		this.writeUint32(value, 36);
	}
	set pixelHeight(value:number){
		this.writeUint32(value, 40);
	}
	set pixelDepth(value:number){
		this.writeUint32(value, 44);
	}
	set numberOfArrayElements(value:number){
		this.writeUint32(value, 48);
	}
	set numberOfFaces(value:number){
		this.writeUint32(value, 52);
	}
	set numberOfMipmapLevels(value:number){
		this.writeUint32(value, 56);
	}
	set bytesOfKeyValueData(value:number){
		this.writeUint32(value, 60);
	}
	writeUint32(value:number, offset:number){
		this.data[offset] = value & 0xFF;
        this.data[offset + 1] = (value >> 8) & 0xFF;
        this.data[offset + 2] = (value >> 16) & 0xFF;
        this.data[offset + 3] = (value >> 24) & 0xFF;
	}
	writeUint8(value:number, offset:number){
		this.data[offset] = value & 0xFF;
	}
	set identifier0(value:number){
		this.writeUint8(value,0);
	}
	set identifier1(value:number){
		this.writeUint8(value,1);
	}
	set identifier2(value:number){
		this.writeUint8(value,2);
	}
	set identifier3(value:number){
		this.writeUint8(value,3);
	}
	set identifier4(value:number){
		this.writeUint8(value,4);
	}
	set identifier5(value:number){
		this.writeUint8(value,5);
	}
	set identifier6(value:number){
		this.writeUint8(value,6);
	}
	set identifier7(value:number){
		this.writeUint8(value,7);
	}
	set identifier8(value:number){
		this.writeUint8(value,8);
	}
	set identifier9(value:number){
		this.writeUint8(value,9);
	}
	set identifier10(value:number){
		this.writeUint8(value,10);
	}
	set identifier11(value:number){
		this.writeUint8(value,11);
	}
	get get(){
		return this.data;
	}
}

const KTX_IDENTIFIER_REF = new Uint8Array([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A]);

const KTX_ENDIAN_REF     = 0x04030201;
const KTX_ENDIAN_REF_REV = 0x01020304;

const GL_R=0x1903,
	  GL_RG=0x8227,
	  GL_RGB=0x1907,
	  GL_RGBA=0x1908;

const GL_SRGB                                      =  0x8C40,
	  GL_SRGB8                                     =  0x8C41,
	  GL_SRGB8_ALPHA8                              =  0x8C43,
	  GL_ETC1_RGB8_OES                             =  0x8d64,
	  GL_COMPRESSED_R11_EAC                        =  0x9270,
	  GL_COMPRESSED_SIGNED_R11_EAC                 =  0x9271,
	  GL_COMPRESSED_RG11_EAC                       =  0x9272,
	  GL_COMPRESSED_SIGNED_RG11_EAC                =  0x9273,
	  GL_COMPRESSED_RGB8_ETC2                      =  0x9274,
	  GL_COMPRESSED_SRGB8_ETC2                     =  0x9275,
	  GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2  =  0x9276,
	  GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 =  0x9277,
	  GL_COMPRESSED_RGBA8_ETC2_EAC                 =  0x9278,
	  GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC          =  0x9279;

var ktx_identifier = KTX_IDENTIFIER_REF;

//converts indices from  |a0|a1|e0|e1|i0|i1|m0|m1|b0|b1|f0|f1|j0|j1|n0|n1|c0|c1|g0|g1|k0|k1|o0|o1|d0|d1|h0|h1|l0|l1|p0|p1| previously used by T- and H-modes 
//				         into  |p0|o0|n0|m0|l0|k0|j0|i0|h0|g0|f0|e0|d0|c0|b0|a0|p1|o1|n1|m1|l1|k1|j1|i1|h1|g1|f1|e1|d1|c1|b1|a1| which should be used for all modes.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function indexConversion(pixelIndices: number) {
	var correctIndices = 0;
	var LSB = Array.from({ length: 4 }, () => new Int32Array(4));
	var MSB = Array.from({ length: 4 }, () => new Int32Array(4));
	var shift = 0;
	for (let y = 3; y >= 0; y--) {
		for (let x = 3; x >= 0; x--) {
			LSB[x][y] = (pixelIndices >> shift) & 1;
			shift++;
			MSB[x][y] = (pixelIndices >> shift) & 1;
			shift++;
		}
	}
	shift = 0;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			correctIndices |= (LSB[x][y] << shift);
			correctIndices |= (MSB[x][y] << (16 + shift));
			shift++;
		}
	}
	return correctIndices >> 0;
}

// Tests if a file exists. (handled external)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function fileExist(filename:string){
	return true;
}

// Expand source image so that it is divisible by a factor of four in the x-dimension.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function expandToWidthDivByFour(img: uint8, width: number, height: number, expandedwidth: Uint32Array, expandedheight: Uint32Array, bitrate: number) {
	var wdiv4: number;
	var xx, yy: number;
	var newimg: uint8;

	wdiv4 = (width / 4) >>> 0;
	if (!(wdiv4 * 4 == width)) {
		expandedwidth[0] = (wdiv4 + 1) * 4;
		expandedheight[0] = height;
		newimg = malloc(img, 3 * expandedwidth[0] * expandedheight[0] * bitrate / 8);

		// First copy image
		for (yy = 0; yy < height; yy++) {
			for (xx = 0; xx < width; xx++) {
				//we have 3*bitrate/8 bytes for each pixel..
				for (let i = 0; i < 3 * bitrate / 8; i++) {
					newimg[(yy * expandedwidth[0] + xx) * 3 * bitrate / 8 + i] = img[(yy * width + xx) * 3 * bitrate / 8 + i];

				}
			}
		}

		// Then make the last column of pixels the same as the previous column.

		for (yy = 0; yy < height; yy++) {
			for (xx = width; xx < expandedwidth[0]; xx++) {
				for (let i = 0; i < 3 * bitrate / 8; i++) {
					newimg[(yy * expandedwidth[0] + xx) * 3 * bitrate / 8 + i] = img[(yy * width + (width - 1)) * 3 * bitrate / 8 + i];
				}
			}
		}

		// Now free the old image
		// free(img);

		// Use the new image
		// img = newimg;

		return newimg;
	}
	else {
		console.log("Image already of even width");
		expandedwidth[0] = width;
		expandedheight[0] = height;
		return img;
	}
}

// Expand source image so that it is divisible by a factor of four in the y-dimension.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function expandToHeightDivByFour(img: uint8, width: number, height: number, expandedwidth: Uint32Array, expandedheight: Uint32Array, bitrate: number) {
	var hdiv4: number;
	var xx, yy: number;
	var numlinesmissing: number;
	var newimg: uint8;

	hdiv4 = (height / 4) >>> 0;

	if (!(hdiv4 * 4 == height)) {
		expandedwidth[0] = width;
		expandedheight[0] = (hdiv4 + 1) * 4;
		numlinesmissing = expandedheight[0] - height;
		newimg = malloc(img, 3 * expandedwidth[0] * expandedheight[0] * bitrate / 8);

		// First copy image. No need to reformat data.

		for (xx = 0; xx < 3 * width * height * bitrate / 8; xx++)
			newimg[xx] = img[xx];

		// Then copy up to three lines.

		for (yy = height; yy < height + numlinesmissing; yy++) {
			for (xx = 0; xx < width; xx++) {
				for (let i = 0; i < 3 * bitrate / 8; i++) {
					newimg[(yy * width + xx) * 3 * bitrate / 8 + i] = img[((height - 1) * width + xx) * 3 * bitrate / 8 + i];
				}
			}
		}

		// Now free the old image;
		// free(img);

		// Use the new image:
		// img = newimg;

		return newimg;

	}
	else {
		console.log("Image height already divisible by four.\n");
		expandedwidth[0] = width;
		expandedheight[0] = height;
		return img;
	}
}

// Find the position of a file extension such as .ppm or .pkm (handled external)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function find_pos_of_extension(src:string){
	return 0;
}

// Read source file. Does conversion if file format is not .ppm. (handled external)
// Will expand file to be divisible by four in the x- and y- dimension.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function readSrcFile(filename:string,img:uint8,width:Int32Array,height:Int32Array, expandedwidth:Int32Array, expandedheight:Int32Array)
{
	return true;
}

// Reads a file without expanding it to be divisible by 4. (handled external)
// Is used when doing PSNR calculation between two files.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function readSrcFileNoExpand(filename:uint8,img:uint8,width:Int32Array,height:Int32Array)
{
	return true;
}

// Parses the arguments from the command line. (handled external)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function readArguments(arg:number,argv:string[], src:string,dst:string)
{
	return;
}

const compressParams = Array.from({ length: 16 }, () => new Int32Array(4));
const compressParamsFast = new Int32Array([
	-8, -2, 2, 8,
	-17, -5, 5, 17,
	-29, -9, 9, 29,
	-42, -13, 13, 42,
	-60, -18, 18, 60,
	-80, -24, 24, 80,
	-106, -33, 33, 106,
	-183, -47, 47, 183
]);

function readCompressParams() {
	compressParams[0][0] = -8; compressParams[0][1] = -2; compressParams[0][2] = 2; compressParams[0][3] = 8;
	compressParams[1][0] = -8; compressParams[1][1] = -2; compressParams[1][2] = 2; compressParams[1][3] = 8;
	compressParams[2][0] = -17; compressParams[2][1] = -5; compressParams[2][2] = 5; compressParams[2][3] = 17;
	compressParams[3][0] = -17; compressParams[3][1] = -5; compressParams[3][2] = 5; compressParams[3][3] = 17;
	compressParams[4][0] = -29; compressParams[4][1] = -9; compressParams[4][2] = 9; compressParams[4][3] = 29;
	compressParams[5][0] = -29; compressParams[5][1] = -9; compressParams[5][2] = 9; compressParams[5][3] = 29;
	compressParams[6][0] = -42; compressParams[6][1] = -13; compressParams[6][2] = 13; compressParams[6][3] = 42;
	compressParams[7][0] = -42; compressParams[7][1] = -13; compressParams[7][2] = 13; compressParams[7][3] = 42;
	compressParams[8][0] = -60; compressParams[8][1] = -18; compressParams[8][2] = 18; compressParams[8][3] = 60;
	compressParams[9][0] = -60; compressParams[9][1] = -18; compressParams[9][2] = 18; compressParams[9][3] = 60;
	compressParams[10][0] = -80; compressParams[10][1] = -24; compressParams[10][2] = 24; compressParams[10][3] = 80;
	compressParams[11][0] = -80; compressParams[11][1] = -24; compressParams[11][2] = 24; compressParams[11][3] = 80;
	compressParams[12][0] = -106; compressParams[12][1] = -33; compressParams[12][2] = 33; compressParams[12][3] = 106;
	compressParams[13][0] = -106; compressParams[13][1] = -33; compressParams[13][2] = 33; compressParams[13][3] = 106;
	compressParams[14][0] = -183; compressParams[14][1] = -47; compressParams[14][2] = 47; compressParams[14][3] = 183;
	compressParams[15][0] = -183; compressParams[15][1] = -47; compressParams[15][2] = 47; compressParams[15][3] = 183;
	return true;
}

// Computes the average color in a 2x4 area and returns the average color as a float.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeAverageColor2x4noQuantFloat(img: uint8, width: number, height: number, startx: number, starty: number, avg_color: Float32Array) {
	let r = 0, g = 0, b = 0;
	for (let y = starty; y < starty + 4; y++) {
		for (let x = startx; x < startx + 2; x++) {
			r += RED(img, width, x, y);
			g += GREEN(img, width, x, y);
			b += BLUE(img, width, x, y);
		}
	}

	avg_color[0] = (r / 8.0);
	avg_color[1] = (g / 8.0);
	avg_color[2] = (b / 8.0);
}

// Computes the average color in a 4x2 area and returns the average color as a float.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeAverageColor4x2noQuantFloat(img: uint8, width: number, height: number, startx: number, starty: number, avg_color: Float32Array) {
	let r = 0, g = 0, b = 0;
	for (let y = starty; y < starty + 2; y++) {
		for (let x = startx; x < startx + 4; x++) {
			r += RED(img, width, x, y);
			g += GREEN(img, width, x, y);
			b += BLUE(img, width, x, y);
		}
	}

	avg_color[0] = (r / 8.0);
	avg_color[1] = (g / 8.0);
	avg_color[2] = (b / 8.0);
}

// Finds all pixel indices for a 2x4 block.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable2x4(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q, i;


	i = 0;
	for (let x = startx; x < startx + 2; x++) {
		for (let y = starty; y < starty + 4; y++) {
			let err;
			let best = 0;
			let min_error = 255 * 255 * 3 * 16;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = SQUARE(approx[0] - orig[0]) + SQUARE(approx[1] - orig[1]) + SQUARE(approx[2] - orig[2]);
				if (err < min_error) {
					min_error = err;
					best = q;
				}

			}
			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_MSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);

			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 
			sum_error += min_error;
		}
	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;
	return sum_error >> 0;
}

const MAXERR1000 = 1000*255*255*16;

// Finds all pixel indices for a 2x4 block using perceptual weighting of error.
// Done using fixed poinit arithmetics where weights are multiplied by 1000.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable2x4percep1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q, i;

	i = 0;
	for (let x = startx; x < startx + 2; x++) {
		for (let y = starty; y < starty + 4; y++) {
			var err;
			var best = 0;
			var min_error = MAXERR1000;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = (PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE((approx[0] - orig[0]))
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE((approx[1] - orig[1]))
					+ PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * SQUARE((approx[2] - orig[2])));
				if (err < min_error) {
					min_error = err;
					best = q;
				}

			}

			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_LSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);

			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 


			sum_error += min_error;
		}

	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;

	return sum_error >>> 0;
}

// Finds all pixel indices for a 2x4 block using perceptual weighting of error.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable2x4percep(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q, i;

	var wR2 = PERCEPTUAL_WEIGHT_R_SQUARED;
	var wG2 = PERCEPTUAL_WEIGHT_G_SQUARED;
	var wB2 = PERCEPTUAL_WEIGHT_B_SQUARED;

	i = 0;
	for (let x = startx; x < startx + 2; x++) {
		for (let y = starty; y < starty + 4; y++) {
			var err;
			var best = 0;
			var min_error = 255 * 255 * 3 * 16;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = (wR2 * SQUARE((approx[0] - orig[0])) + wG2 * SQUARE((approx[1] - orig[1])) + wB2 * SQUARE((approx[2] - orig[2])));
				if (err < min_error) {
					min_error = err;
					best = q;
				}
			}

			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_LSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);

			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 

			sum_error += min_error;
		}
	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;

	return sum_error;
}

// Finds all pixel indices for a 4x2 block.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable4x2(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q;
	var i;

	i = 0;
	for (let x = startx; x < startx + 4; x++) {
		for (let y = starty; y < starty + 2; y++) {
			var err;
			var best = 0;
			var min_error = 255 * 255 * 3 * 16;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = SQUARE(approx[0] - orig[0]) + SQUARE(approx[1] - orig[1]) + SQUARE(approx[2] - orig[2]);
				if (err < min_error) {
					min_error = err;
					best = q;
				}
			}
			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_LSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);
			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 

			sum_error += min_error;
		}
		i += 2;
	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;

	return sum_error >> 0;
}

// Finds all pixel indices for a 4x2 block using perceptual weighting of error.
// Done using fixed point arithmetics where 1000 corresponds to 1.0.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable4x2percep1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q;
	var i;

	i = 0;
	for (let x = startx; x < startx + 4; x++) {
		for (let y = starty; y < starty + 2; y++) {
			var err;
			var best = 0;
			var min_error = MAXERR1000;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(approx[0] - orig[0])
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(approx[1] - orig[1])
					+ PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * SQUARE(approx[2] - orig[2]);
				if (err < min_error) {
					min_error = err;
					best = q;
				}
			}
			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_LSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);
			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 

			sum_error += min_error;
		}
		i += 2;

	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;

	return sum_error >>> 0;
}

// Finds all pixel indices for a 4x2 block using perceptual weighting of error.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockWithTable4x2percep(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, table: number, pixel_indices_MSBp: Uint32Array, pixel_indices_LSBp: Uint32Array) {
	const orig = new Uint8Array(3), approx = new Uint8Array(3);
	var pixel_indices_MSB = 0, pixel_indices_LSB = 0, pixel_indices = 0;
	var sum_error = 0;
	var q;
	var i;
	var wR2 = PERCEPTUAL_WEIGHT_R_SQUARED;
	var wG2 = PERCEPTUAL_WEIGHT_G_SQUARED;
	var wB2 = PERCEPTUAL_WEIGHT_B_SQUARED;

	i = 0;
	for (let x = startx; x < startx + 4; x++) {
		for (let y = starty; y < starty + 2; y++) {
			var err;
			var best = 0;
			var min_error = 255 * 255 * 3 * 16;
			orig[0] = RED(img, width, x, y);
			orig[1] = GREEN(img, width, x, y);
			orig[2] = BLUE(img, width, x, y);

			for (q = 0; q < 4; q++) {
				approx[0] = CLAMP(0, avg_color[0] + compressParams[table][q], 255);
				approx[1] = CLAMP(0, avg_color[1] + compressParams[table][q], 255);
				approx[2] = CLAMP(0, avg_color[2] + compressParams[table][q], 255);

				// Here we just use equal weights to R, G and B. Although this will
				// give visually worse results, it will give a better PSNR score. 
				err = wR2 * SQUARE(approx[0] - orig[0]) + wG2 * SQUARE(approx[1] - orig[1]) + wB2 * SQUARE(approx[2] - orig[2]);
				if (err < min_error) {
					min_error = err;
					best = q;
				}
			}
			pixel_indices = scramble[best];

			pixel_indices_MSB = PUTBITS(pixel_indices_MSB, (pixel_indices >> 1), 1, i);
			pixel_indices_LSB = PUTBITS(pixel_indices_LSB, (pixel_indices & 1), 1, i);
			i++;

			// In order to simplify hardware, the table {-12, -4, 4, 12} is indexed {11, 10, 00, 01}
			// so that first bit is sign bit and the other bit is size bit (4 or 12). 
			// This means that we have to scramble the bits before storing them. 

			sum_error += min_error;
		}
		i += 2;
	}

	pixel_indices_MSBp[0] = pixel_indices_MSB;
	pixel_indices_LSBp[0] = pixel_indices_LSB;

	return sum_error;
}

// Table for fast implementation of clamping to the interval [0,255] followed by addition of 255.
const clamp_table_plus_255 = new Int32Array([0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255, 0 + 255,
0 + 255, 1 + 255, 2 + 255, 3 + 255, 4 + 255, 5 + 255, 6 + 255, 7 + 255, 8 + 255, 9 + 255, 10 + 255, 11 + 255, 12 + 255, 13 + 255, 14 + 255, 15 + 255, 16 + 255, 17 + 255, 18 + 255, 19 + 255, 20 + 255, 21 + 255, 22 + 255, 23 + 255, 24 + 255, 25 + 255, 26 + 255, 27 + 255, 28 + 255, 29 + 255, 30 + 255, 31 + 255, 32 + 255, 33 + 255, 34 + 255, 35 + 255, 36 + 255, 37 + 255, 38 + 255, 39 + 255, 40 + 255, 41 + 255, 42 + 255, 43 + 255, 44 + 255, 45 + 255, 46 + 255, 47 + 255, 48 + 255, 49 + 255, 50 + 255, 51 + 255, 52 + 255, 53 + 255, 54 + 255, 55 + 255, 56 + 255, 57 + 255, 58 + 255, 59 + 255, 60 + 255, 61 + 255, 62 + 255, 63 + 255, 64 + 255, 65 + 255, 66 + 255, 67 + 255, 68 + 255, 69 + 255, 70 + 255, 71 + 255, 72 + 255, 73 + 255, 74 + 255, 75 + 255, 76 + 255, 77 + 255, 78 + 255, 79 + 255, 80 + 255, 81 + 255, 82 + 255, 83 + 255, 84 + 255, 85 + 255, 86 + 255, 87 + 255, 88 + 255, 89 + 255, 90 + 255, 91 + 255, 92 + 255, 93 + 255, 94 + 255, 95 + 255, 96 + 255, 97 + 255, 98 + 255, 99 + 255, 100 + 255, 101 + 255, 102 + 255, 103 + 255, 104 + 255, 105 + 255, 106 + 255, 107 + 255, 108 + 255, 109 + 255, 110 + 255, 111 + 255, 112 + 255, 113 + 255, 114 + 255, 115 + 255, 116 + 255, 117 + 255, 118 + 255, 119 + 255, 120 + 255, 121 + 255, 122 + 255, 123 + 255, 124 + 255, 125 + 255, 126 + 255, 127 + 255, 128 + 255, 129 + 255, 130 + 255, 131 + 255, 132 + 255, 133 + 255, 134 + 255, 135 + 255, 136 + 255, 137 + 255, 138 + 255, 139 + 255, 140 + 255, 141 + 255, 142 + 255, 143 + 255, 144 + 255, 145 + 255, 146 + 255, 147 + 255, 148 + 255, 149 + 255, 150 + 255, 151 + 255, 152 + 255, 153 + 255, 154 + 255, 155 + 255, 156 + 255, 157 + 255, 158 + 255, 159 + 255, 160 + 255, 161 + 255, 162 + 255, 163 + 255, 164 + 255, 165 + 255, 166 + 255, 167 + 255, 168 + 255, 169 + 255, 170 + 255, 171 + 255, 172 + 255, 173 + 255, 174 + 255, 175 + 255, 176 + 255, 177 + 255, 178 + 255, 179 + 255, 180 + 255, 181 + 255, 182 + 255, 183 + 255, 184 + 255, 185 + 255, 186 + 255, 187 + 255, 188 + 255, 189 + 255, 190 + 255, 191 + 255, 192 + 255, 193 + 255, 194 + 255, 195 + 255, 196 + 255, 197 + 255, 198 + 255, 199 + 255, 200 + 255, 201 + 255, 202 + 255, 203 + 255, 204 + 255, 205 + 255, 206 + 255, 207 + 255, 208 + 255, 209 + 255, 210 + 255, 211 + 255,
212 + 255, 213 + 255, 214 + 255, 215 + 255, 216 + 255, 217 + 255, 218 + 255, 219 + 255, 220 + 255, 221 + 255, 222 + 255, 223 + 255, 224 + 255, 225 + 255, 226 + 255, 227 + 255, 228 + 255, 229 + 255, 230 + 255, 231 + 255, 232 + 255, 233 + 255, 234 + 255, 235 + 255, 236 + 255, 237 + 255, 238 + 255, 239 + 255, 240 + 255, 241 + 255, 242 + 255, 243 + 255, 244 + 255, 245 + 255, 246 + 255, 247 + 255, 248 + 255, 249 + 255, 250 + 255, 251 + 255, 252 + 255, 253 + 255, 254 + 255, 255 + 255,
255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255,
255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255, 255 + 255]);

// Table for fast implementationi of clamping to the interval [0,255]
const clamp_table = new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
	255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);

// Table for fast implementation of squaring for numbers in the interval [-255, 255]
const square_table = new Uint32Array([65025, 64516, 64009, 63504, 63001, 62500, 62001, 61504, 61009, 60516, 60025, 59536, 59049, 58564, 58081, 57600,
	57121, 56644, 56169, 55696, 55225, 54756, 54289, 53824, 53361, 52900, 52441, 51984, 51529, 51076, 50625, 50176,
	49729, 49284, 48841, 48400, 47961, 47524, 47089, 46656, 46225, 45796, 45369, 44944, 44521, 44100, 43681, 43264,
	42849, 42436, 42025, 41616, 41209, 40804, 40401, 40000, 39601, 39204, 38809, 38416, 38025, 37636, 37249, 36864,
	36481, 36100, 35721, 35344, 34969, 34596, 34225, 33856, 33489, 33124, 32761, 32400, 32041, 31684, 31329, 30976,
	30625, 30276, 29929, 29584, 29241, 28900, 28561, 28224, 27889, 27556, 27225, 26896, 26569, 26244, 25921, 25600,
	25281, 24964, 24649, 24336, 24025, 23716, 23409, 23104, 22801, 22500, 22201, 21904, 21609, 21316, 21025, 20736,
	20449, 20164, 19881, 19600, 19321, 19044, 18769, 18496, 18225, 17956, 17689, 17424, 17161, 16900, 16641, 16384,
	16129, 15876, 15625, 15376, 15129, 14884, 14641, 14400, 14161, 13924, 13689, 13456, 13225, 12996, 12769, 12544,
	12321, 12100, 11881, 11664, 11449, 11236, 11025, 10816, 10609, 10404, 10201, 10000, 9801, 9604, 9409, 9216,
	9025, 8836, 8649, 8464, 8281, 8100, 7921, 7744, 7569, 7396, 7225, 7056, 6889, 6724, 6561, 6400,
	6241, 6084, 5929, 5776, 5625, 5476, 5329, 5184, 5041, 4900, 4761, 4624, 4489, 4356, 4225, 4096,
	3969, 3844, 3721, 3600, 3481, 3364, 3249, 3136, 3025, 2916, 2809, 2704, 2601, 2500, 2401, 2304,
	2209, 2116, 2025, 1936, 1849, 1764, 1681, 1600, 1521, 1444, 1369, 1296, 1225, 1156, 1089, 1024,
	961, 900, 841, 784, 729, 676, 625, 576, 529, 484, 441, 400, 361, 324, 289, 256,
	225, 196, 169, 144, 121, 100, 81, 64, 49, 36, 25, 16, 9, 4, 1,
	0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225,
	256, 289, 324, 361, 400, 441, 484, 529, 576, 625, 676, 729, 784, 841, 900, 961,
	1024, 1089, 1156, 1225, 1296, 1369, 1444, 1521, 1600, 1681, 1764, 1849, 1936, 2025, 2116, 2209,
	2304, 2401, 2500, 2601, 2704, 2809, 2916, 3025, 3136, 3249, 3364, 3481, 3600, 3721, 3844, 3969,
	4096, 4225, 4356, 4489, 4624, 4761, 4900, 5041, 5184, 5329, 5476, 5625, 5776, 5929, 6084, 6241,
	6400, 6561, 6724, 6889, 7056, 7225, 7396, 7569, 7744, 7921, 8100, 8281, 8464, 8649, 8836, 9025,
	9216, 9409, 9604, 9801, 10000, 10201, 10404, 10609, 10816, 11025, 11236, 11449, 11664, 11881, 12100, 12321,
	12544, 12769, 12996, 13225, 13456, 13689, 13924, 14161, 14400, 14641, 14884, 15129, 15376, 15625, 15876, 16129,
	16384, 16641, 16900, 17161, 17424, 17689, 17956, 18225, 18496, 18769, 19044, 19321, 19600, 19881, 20164, 20449,
	20736, 21025, 21316, 21609, 21904, 22201, 22500, 22801, 23104, 23409, 23716, 24025, 24336, 24649, 24964, 25281,
	25600, 25921, 26244, 26569, 26896, 27225, 27556, 27889, 28224, 28561, 28900, 29241, 29584, 29929, 30276, 30625,
	30976, 31329, 31684, 32041, 32400, 32761, 33124, 33489, 33856, 34225, 34596, 34969, 35344, 35721, 36100, 36481,
	36864, 37249, 37636, 38025, 38416, 38809, 39204, 39601, 40000, 40401, 40804, 41209, 41616, 42025, 42436, 42849,
	43264, 43681, 44100, 44521, 44944, 45369, 45796, 46225, 46656, 47089, 47524, 47961, 48400, 48841, 49284, 49729,
	50176, 50625, 51076, 51529, 51984, 52441, 52900, 53361, 53824, 54289, 54756, 55225, 55696, 56169, 56644, 57121,
	57600, 58081, 58564, 59049, 59536, 60025, 60516, 61009, 61504, 62001, 62500, 63001, 63504, 64009, 64516, 65025]);

// Abbreviated variable names to make below tables smaller in source code size
const KR = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000;
const KG = PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000;
const KB = PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000;

// Table for fast implementation of squaring for numbers in the interval [-255, 255] multiplied by the perceptual weight for red.
const square_table_percep_red = new Uint32Array([
	65025 * KR, 64516 * KR, 64009 * KR, 63504 * KR, 63001 * KR, 62500 * KR, 62001 * KR, 61504 * KR, 61009 * KR, 60516 * KR, 60025 * KR, 59536 * KR, 59049 * KR, 58564 * KR, 58081 * KR, 57600 * KR,
	57121 * KR, 56644 * KR, 56169 * KR, 55696 * KR, 55225 * KR, 54756 * KR, 54289 * KR, 53824 * KR, 53361 * KR, 52900 * KR, 52441 * KR, 51984 * KR, 51529 * KR, 51076 * KR, 50625 * KR, 50176 * KR,
	49729 * KR, 49284 * KR, 48841 * KR, 48400 * KR, 47961 * KR, 47524 * KR, 47089 * KR, 46656 * KR, 46225 * KR, 45796 * KR, 45369 * KR, 44944 * KR, 44521 * KR, 44100 * KR, 43681 * KR, 43264 * KR,
	42849 * KR, 42436 * KR, 42025 * KR, 41616 * KR, 41209 * KR, 40804 * KR, 40401 * KR, 40000 * KR, 39601 * KR, 39204 * KR, 38809 * KR, 38416 * KR, 38025 * KR, 37636 * KR, 37249 * KR, 36864 * KR,
	36481 * KR, 36100 * KR, 35721 * KR, 35344 * KR, 34969 * KR, 34596 * KR, 34225 * KR, 33856 * KR, 33489 * KR, 33124 * KR, 32761 * KR, 32400 * KR, 32041 * KR, 31684 * KR, 31329 * KR, 30976 * KR,
	30625 * KR, 30276 * KR, 29929 * KR, 29584 * KR, 29241 * KR, 28900 * KR, 28561 * KR, 28224 * KR, 27889 * KR, 27556 * KR, 27225 * KR, 26896 * KR, 26569 * KR, 26244 * KR, 25921 * KR, 25600 * KR,
	25281 * KR, 24964 * KR, 24649 * KR, 24336 * KR, 24025 * KR, 23716 * KR, 23409 * KR, 23104 * KR, 22801 * KR, 22500 * KR, 22201 * KR, 21904 * KR, 21609 * KR, 21316 * KR, 21025 * KR, 20736 * KR,
	20449 * KR, 20164 * KR, 19881 * KR, 19600 * KR, 19321 * KR, 19044 * KR, 18769 * KR, 18496 * KR, 18225 * KR, 17956 * KR, 17689 * KR, 17424 * KR, 17161 * KR, 16900 * KR, 16641 * KR, 16384 * KR,
	16129 * KR, 15876 * KR, 15625 * KR, 15376 * KR, 15129 * KR, 14884 * KR, 14641 * KR, 14400 * KR, 14161 * KR, 13924 * KR, 13689 * KR, 13456 * KR, 13225 * KR, 12996 * KR, 12769 * KR, 12544 * KR,
	12321 * KR, 12100 * KR, 11881 * KR, 11664 * KR, 11449 * KR, 11236 * KR, 11025 * KR, 10816 * KR, 10609 * KR, 10404 * KR, 10201 * KR, 10000 * KR, 9801 * KR, 9604 * KR, 9409 * KR, 9216 * KR,
	9025 * KR, 8836 * KR, 8649 * KR, 8464 * KR, 8281 * KR, 8100 * KR, 7921 * KR, 7744 * KR, 7569 * KR, 7396 * KR, 7225 * KR, 7056 * KR, 6889 * KR, 6724 * KR, 6561 * KR, 6400 * KR,
	6241 * KR, 6084 * KR, 5929 * KR, 5776 * KR, 5625 * KR, 5476 * KR, 5329 * KR, 5184 * KR, 5041 * KR, 4900 * KR, 4761 * KR, 4624 * KR, 4489 * KR, 4356 * KR, 4225 * KR, 4096 * KR,
	3969 * KR, 3844 * KR, 3721 * KR, 3600 * KR, 3481 * KR, 3364 * KR, 3249 * KR, 3136 * KR, 3025 * KR, 2916 * KR, 2809 * KR, 2704 * KR, 2601 * KR, 2500 * KR, 2401 * KR, 2304 * KR,
	2209 * KR, 2116 * KR, 2025 * KR, 1936 * KR, 1849 * KR, 1764 * KR, 1681 * KR, 1600 * KR, 1521 * KR, 1444 * KR, 1369 * KR, 1296 * KR, 1225 * KR, 1156 * KR, 1089 * KR, 1024 * KR,
	961 * KR, 900 * KR, 841 * KR, 784 * KR, 729 * KR, 676 * KR, 625 * KR, 576 * KR, 529 * KR, 484 * KR, 441 * KR, 400 * KR, 361 * KR, 324 * KR, 289 * KR, 256 * KR,
	225 * KR, 196 * KR, 169 * KR, 144 * KR, 121 * KR, 100 * KR, 81 * KR, 64 * KR, 49 * KR, 36 * KR, 25 * KR, 16 * KR, 9 * KR, 4 * KR, 1 * KR,
	0 * KR, 1 * KR, 4 * KR, 9 * KR, 16 * KR, 25 * KR, 36 * KR, 49 * KR, 64 * KR, 81 * KR, 100 * KR, 121 * KR, 144 * KR, 169 * KR, 196 * KR, 225 * KR,
	256 * KR, 289 * KR, 324 * KR, 361 * KR, 400 * KR, 441 * KR, 484 * KR, 529 * KR, 576 * KR, 625 * KR, 676 * KR, 729 * KR, 784 * KR, 841 * KR, 900 * KR, 961 * KR,
	1024 * KR, 1089 * KR, 1156 * KR, 1225 * KR, 1296 * KR, 1369 * KR, 1444 * KR, 1521 * KR, 1600 * KR, 1681 * KR, 1764 * KR, 1849 * KR, 1936 * KR, 2025 * KR, 2116 * KR, 2209 * KR,
	2304 * KR, 2401 * KR, 2500 * KR, 2601 * KR, 2704 * KR, 2809 * KR, 2916 * KR, 3025 * KR, 3136 * KR, 3249 * KR, 3364 * KR, 3481 * KR, 3600 * KR, 3721 * KR, 3844 * KR, 3969 * KR,
	4096 * KR, 4225 * KR, 4356 * KR, 4489 * KR, 4624 * KR, 4761 * KR, 4900 * KR, 5041 * KR, 5184 * KR, 5329 * KR, 5476 * KR, 5625 * KR, 5776 * KR, 5929 * KR, 6084 * KR, 6241 * KR,
	6400 * KR, 6561 * KR, 6724 * KR, 6889 * KR, 7056 * KR, 7225 * KR, 7396 * KR, 7569 * KR, 7744 * KR, 7921 * KR, 8100 * KR, 8281 * KR, 8464 * KR, 8649 * KR, 8836 * KR, 9025 * KR,
	9216 * KR, 9409 * KR, 9604 * KR, 9801 * KR, 10000 * KR, 10201 * KR, 10404 * KR, 10609 * KR, 10816 * KR, 11025 * KR, 11236 * KR, 11449 * KR, 11664 * KR, 11881 * KR, 12100 * KR, 12321 * KR,
	12544 * KR, 12769 * KR, 12996 * KR, 13225 * KR, 13456 * KR, 13689 * KR, 13924 * KR, 14161 * KR, 14400 * KR, 14641 * KR, 14884 * KR, 15129 * KR, 15376 * KR, 15625 * KR, 15876 * KR, 16129 * KR,
	16384 * KR, 16641 * KR, 16900 * KR, 17161 * KR, 17424 * KR, 17689 * KR, 17956 * KR, 18225 * KR, 18496 * KR, 18769 * KR, 19044 * KR, 19321 * KR, 19600 * KR, 19881 * KR, 20164 * KR, 20449 * KR,
	20736 * KR, 21025 * KR, 21316 * KR, 21609 * KR, 21904 * KR, 22201 * KR, 22500 * KR, 22801 * KR, 23104 * KR, 23409 * KR, 23716 * KR, 24025 * KR, 24336 * KR, 24649 * KR, 24964 * KR, 25281 * KR,
	25600 * KR, 25921 * KR, 26244 * KR, 26569 * KR, 26896 * KR, 27225 * KR, 27556 * KR, 27889 * KR, 28224 * KR, 28561 * KR, 28900 * KR, 29241 * KR, 29584 * KR, 29929 * KR, 30276 * KR, 30625 * KR,
	30976 * KR, 31329 * KR, 31684 * KR, 32041 * KR, 32400 * KR, 32761 * KR, 33124 * KR, 33489 * KR, 33856 * KR, 34225 * KR, 34596 * KR, 34969 * KR, 35344 * KR, 35721 * KR, 36100 * KR, 36481 * KR,
	36864 * KR, 37249 * KR, 37636 * KR, 38025 * KR, 38416 * KR, 38809 * KR, 39204 * KR, 39601 * KR, 40000 * KR, 40401 * KR, 40804 * KR, 41209 * KR, 41616 * KR, 42025 * KR, 42436 * KR, 42849 * KR,
	43264 * KR, 43681 * KR, 44100 * KR, 44521 * KR, 44944 * KR, 45369 * KR, 45796 * KR, 46225 * KR, 46656 * KR, 47089 * KR, 47524 * KR, 47961 * KR, 48400 * KR, 48841 * KR, 49284 * KR, 49729 * KR,
	50176 * KR, 50625 * KR, 51076 * KR, 51529 * KR, 51984 * KR, 52441 * KR, 52900 * KR, 53361 * KR, 53824 * KR, 54289 * KR, 54756 * KR, 55225 * KR, 55696 * KR, 56169 * KR, 56644 * KR, 57121 * KR,
	57600 * KR, 58081 * KR, 58564 * KR, 59049 * KR, 59536 * KR, 60025 * KR, 60516 * KR, 61009 * KR, 61504 * KR, 62001 * KR, 62500 * KR, 63001 * KR, 63504 * KR, 64009 * KR, 64516 * KR, 65025 * KR]);

// Table for fast implementation of squaring for numbers in the interval [-255, 255] multiplied by the perceptual weight for green.
const square_table_percep_green = new Uint32Array([
	65025 * KG, 64516 * KG, 64009 * KG, 63504 * KG, 63001 * KG, 62500 * KG, 62001 * KG, 61504 * KG, 61009 * KG, 60516 * KG, 60025 * KG, 59536 * KG, 59049 * KG, 58564 * KG, 58081 * KG, 57600 * KG,
	57121 * KG, 56644 * KG, 56169 * KG, 55696 * KG, 55225 * KG, 54756 * KG, 54289 * KG, 53824 * KG, 53361 * KG, 52900 * KG, 52441 * KG, 51984 * KG, 51529 * KG, 51076 * KG, 50625 * KG, 50176 * KG,
	49729 * KG, 49284 * KG, 48841 * KG, 48400 * KG, 47961 * KG, 47524 * KG, 47089 * KG, 46656 * KG, 46225 * KG, 45796 * KG, 45369 * KG, 44944 * KG, 44521 * KG, 44100 * KG, 43681 * KG, 43264 * KG,
	42849 * KG, 42436 * KG, 42025 * KG, 41616 * KG, 41209 * KG, 40804 * KG, 40401 * KG, 40000 * KG, 39601 * KG, 39204 * KG, 38809 * KG, 38416 * KG, 38025 * KG, 37636 * KG, 37249 * KG, 36864 * KG,
	36481 * KG, 36100 * KG, 35721 * KG, 35344 * KG, 34969 * KG, 34596 * KG, 34225 * KG, 33856 * KG, 33489 * KG, 33124 * KG, 32761 * KG, 32400 * KG, 32041 * KG, 31684 * KG, 31329 * KG, 30976 * KG,
	30625 * KG, 30276 * KG, 29929 * KG, 29584 * KG, 29241 * KG, 28900 * KG, 28561 * KG, 28224 * KG, 27889 * KG, 27556 * KG, 27225 * KG, 26896 * KG, 26569 * KG, 26244 * KG, 25921 * KG, 25600 * KG,
	25281 * KG, 24964 * KG, 24649 * KG, 24336 * KG, 24025 * KG, 23716 * KG, 23409 * KG, 23104 * KG, 22801 * KG, 22500 * KG, 22201 * KG, 21904 * KG, 21609 * KG, 21316 * KG, 21025 * KG, 20736 * KG,
	20449 * KG, 20164 * KG, 19881 * KG, 19600 * KG, 19321 * KG, 19044 * KG, 18769 * KG, 18496 * KG, 18225 * KG, 17956 * KG, 17689 * KG, 17424 * KG, 17161 * KG, 16900 * KG, 16641 * KG, 16384 * KG,
	16129 * KG, 15876 * KG, 15625 * KG, 15376 * KG, 15129 * KG, 14884 * KG, 14641 * KG, 14400 * KG, 14161 * KG, 13924 * KG, 13689 * KG, 13456 * KG, 13225 * KG, 12996 * KG, 12769 * KG, 12544 * KG,
	12321 * KG, 12100 * KG, 11881 * KG, 11664 * KG, 11449 * KG, 11236 * KG, 11025 * KG, 10816 * KG, 10609 * KG, 10404 * KG, 10201 * KG, 10000 * KG, 9801 * KG, 9604 * KG, 9409 * KG, 9216 * KG,
	9025 * KG, 8836 * KG, 8649 * KG, 8464 * KG, 8281 * KG, 8100 * KG, 7921 * KG, 7744 * KG, 7569 * KG, 7396 * KG, 7225 * KG, 7056 * KG, 6889 * KG, 6724 * KG, 6561 * KG, 6400 * KG,
	6241 * KG, 6084 * KG, 5929 * KG, 5776 * KG, 5625 * KG, 5476 * KG, 5329 * KG, 5184 * KG, 5041 * KG, 4900 * KG, 4761 * KG, 4624 * KG, 4489 * KG, 4356 * KG, 4225 * KG, 4096 * KG,
	3969 * KG, 3844 * KG, 3721 * KG, 3600 * KG, 3481 * KG, 3364 * KG, 3249 * KG, 3136 * KG, 3025 * KG, 2916 * KG, 2809 * KG, 2704 * KG, 2601 * KG, 2500 * KG, 2401 * KG, 2304 * KG,
	2209 * KG, 2116 * KG, 2025 * KG, 1936 * KG, 1849 * KG, 1764 * KG, 1681 * KG, 1600 * KG, 1521 * KG, 1444 * KG, 1369 * KG, 1296 * KG, 1225 * KG, 1156 * KG, 1089 * KG, 1024 * KG,
	961 * KG, 900 * KG, 841 * KG, 784 * KG, 729 * KG, 676 * KG, 625 * KG, 576 * KG, 529 * KG, 484 * KG, 441 * KG, 400 * KG, 361 * KG, 324 * KG, 289 * KG, 256 * KG,
	225 * KG, 196 * KG, 169 * KG, 144 * KG, 121 * KG, 100 * KG, 81 * KG, 64 * KG, 49 * KG, 36 * KG, 25 * KG, 16 * KG, 9 * KG, 4 * KG, 1 * KG,
	0 * KG, 1 * KG, 4 * KG, 9 * KG, 16 * KG, 25 * KG, 36 * KG, 49 * KG, 64 * KG, 81 * KG, 100 * KG, 121 * KG, 144 * KG, 169 * KG, 196 * KG, 225 * KG,
	256 * KG, 289 * KG, 324 * KG, 361 * KG, 400 * KG, 441 * KG, 484 * KG, 529 * KG, 576 * KG, 625 * KG, 676 * KG, 729 * KG, 784 * KG, 841 * KG, 900 * KG, 961 * KG,
	1024 * KG, 1089 * KG, 1156 * KG, 1225 * KG, 1296 * KG, 1369 * KG, 1444 * KG, 1521 * KG, 1600 * KG, 1681 * KG, 1764 * KG, 1849 * KG, 1936 * KG, 2025 * KG, 2116 * KG, 2209 * KG,
	2304 * KG, 2401 * KG, 2500 * KG, 2601 * KG, 2704 * KG, 2809 * KG, 2916 * KG, 3025 * KG, 3136 * KG, 3249 * KG, 3364 * KG, 3481 * KG, 3600 * KG, 3721 * KG, 3844 * KG, 3969 * KG,
	4096 * KG, 4225 * KG, 4356 * KG, 4489 * KG, 4624 * KG, 4761 * KG, 4900 * KG, 5041 * KG, 5184 * KG, 5329 * KG, 5476 * KG, 5625 * KG, 5776 * KG, 5929 * KG, 6084 * KG, 6241 * KG,
	6400 * KG, 6561 * KG, 6724 * KG, 6889 * KG, 7056 * KG, 7225 * KG, 7396 * KG, 7569 * KG, 7744 * KG, 7921 * KG, 8100 * KG, 8281 * KG, 8464 * KG, 8649 * KG, 8836 * KG, 9025 * KG,
	9216 * KG, 9409 * KG, 9604 * KG, 9801 * KG, 10000 * KG, 10201 * KG, 10404 * KG, 10609 * KG, 10816 * KG, 11025 * KG, 11236 * KG, 11449 * KG, 11664 * KG, 11881 * KG, 12100 * KG, 12321 * KG,
	12544 * KG, 12769 * KG, 12996 * KG, 13225 * KG, 13456 * KG, 13689 * KG, 13924 * KG, 14161 * KG, 14400 * KG, 14641 * KG, 14884 * KG, 15129 * KG, 15376 * KG, 15625 * KG, 15876 * KG, 16129 * KG,
	16384 * KG, 16641 * KG, 16900 * KG, 17161 * KG, 17424 * KG, 17689 * KG, 17956 * KG, 18225 * KG, 18496 * KG, 18769 * KG, 19044 * KG, 19321 * KG, 19600 * KG, 19881 * KG, 20164 * KG, 20449 * KG,
	20736 * KG, 21025 * KG, 21316 * KG, 21609 * KG, 21904 * KG, 22201 * KG, 22500 * KG, 22801 * KG, 23104 * KG, 23409 * KG, 23716 * KG, 24025 * KG, 24336 * KG, 24649 * KG, 24964 * KG, 25281 * KG,
	25600 * KG, 25921 * KG, 26244 * KG, 26569 * KG, 26896 * KG, 27225 * KG, 27556 * KG, 27889 * KG, 28224 * KG, 28561 * KG, 28900 * KG, 29241 * KG, 29584 * KG, 29929 * KG, 30276 * KG, 30625 * KG,
	30976 * KG, 31329 * KG, 31684 * KG, 32041 * KG, 32400 * KG, 32761 * KG, 33124 * KG, 33489 * KG, 33856 * KG, 34225 * KG, 34596 * KG, 34969 * KG, 35344 * KG, 35721 * KG, 36100 * KG, 36481 * KG,
	36864 * KG, 37249 * KG, 37636 * KG, 38025 * KG, 38416 * KG, 38809 * KG, 39204 * KG, 39601 * KG, 40000 * KG, 40401 * KG, 40804 * KG, 41209 * KG, 41616 * KG, 42025 * KG, 42436 * KG, 42849 * KG,
	43264 * KG, 43681 * KG, 44100 * KG, 44521 * KG, 44944 * KG, 45369 * KG, 45796 * KG, 46225 * KG, 46656 * KG, 47089 * KG, 47524 * KG, 47961 * KG, 48400 * KG, 48841 * KG, 49284 * KG, 49729 * KG,
	50176 * KG, 50625 * KG, 51076 * KG, 51529 * KG, 51984 * KG, 52441 * KG, 52900 * KG, 53361 * KG, 53824 * KG, 54289 * KG, 54756 * KG, 55225 * KG, 55696 * KG, 56169 * KG, 56644 * KG, 57121 * KG,
	57600 * KG, 58081 * KG, 58564 * KG, 59049 * KG, 59536 * KG, 60025 * KG, 60516 * KG, 61009 * KG, 61504 * KG, 62001 * KG, 62500 * KG, 63001 * KG, 63504 * KG, 64009 * KG, 64516 * KG, 65025 * KG]);

// Table for fast implementation of squaring for numbers in the interval [-255, 255] multiplied by the perceptual weight for blue.
const square_table_percep_blue = new Uint32Array([
	65025 * KB, 64516 * KB, 64009 * KB, 63504 * KB, 63001 * KB, 62500 * KB, 62001 * KB, 61504 * KB, 61009 * KB, 60516 * KB, 60025 * KB, 59536 * KB, 59049 * KB, 58564 * KB, 58081 * KB, 57600 * KB,
	57121 * KB, 56644 * KB, 56169 * KB, 55696 * KB, 55225 * KB, 54756 * KB, 54289 * KB, 53824 * KB, 53361 * KB, 52900 * KB, 52441 * KB, 51984 * KB, 51529 * KB, 51076 * KB, 50625 * KB, 50176 * KB,
	49729 * KB, 49284 * KB, 48841 * KB, 48400 * KB, 47961 * KB, 47524 * KB, 47089 * KB, 46656 * KB, 46225 * KB, 45796 * KB, 45369 * KB, 44944 * KB, 44521 * KB, 44100 * KB, 43681 * KB, 43264 * KB,
	42849 * KB, 42436 * KB, 42025 * KB, 41616 * KB, 41209 * KB, 40804 * KB, 40401 * KB, 40000 * KB, 39601 * KB, 39204 * KB, 38809 * KB, 38416 * KB, 38025 * KB, 37636 * KB, 37249 * KB, 36864 * KB,
	36481 * KB, 36100 * KB, 35721 * KB, 35344 * KB, 34969 * KB, 34596 * KB, 34225 * KB, 33856 * KB, 33489 * KB, 33124 * KB, 32761 * KB, 32400 * KB, 32041 * KB, 31684 * KB, 31329 * KB, 30976 * KB,
	30625 * KB, 30276 * KB, 29929 * KB, 29584 * KB, 29241 * KB, 28900 * KB, 28561 * KB, 28224 * KB, 27889 * KB, 27556 * KB, 27225 * KB, 26896 * KB, 26569 * KB, 26244 * KB, 25921 * KB, 25600 * KB,
	25281 * KB, 24964 * KB, 24649 * KB, 24336 * KB, 24025 * KB, 23716 * KB, 23409 * KB, 23104 * KB, 22801 * KB, 22500 * KB, 22201 * KB, 21904 * KB, 21609 * KB, 21316 * KB, 21025 * KB, 20736 * KB,
	20449 * KB, 20164 * KB, 19881 * KB, 19600 * KB, 19321 * KB, 19044 * KB, 18769 * KB, 18496 * KB, 18225 * KB, 17956 * KB, 17689 * KB, 17424 * KB, 17161 * KB, 16900 * KB, 16641 * KB, 16384 * KB,
	16129 * KB, 15876 * KB, 15625 * KB, 15376 * KB, 15129 * KB, 14884 * KB, 14641 * KB, 14400 * KB, 14161 * KB, 13924 * KB, 13689 * KB, 13456 * KB, 13225 * KB, 12996 * KB, 12769 * KB, 12544 * KB,
	12321 * KB, 12100 * KB, 11881 * KB, 11664 * KB, 11449 * KB, 11236 * KB, 11025 * KB, 10816 * KB, 10609 * KB, 10404 * KB, 10201 * KB, 10000 * KB, 9801 * KB, 9604 * KB, 9409 * KB, 9216 * KB,
	9025 * KB, 8836 * KB, 8649 * KB, 8464 * KB, 8281 * KB, 8100 * KB, 7921 * KB, 7744 * KB, 7569 * KB, 7396 * KB, 7225 * KB, 7056 * KB, 6889 * KB, 6724 * KB, 6561 * KB, 6400 * KB,
	6241 * KB, 6084 * KB, 5929 * KB, 5776 * KB, 5625 * KB, 5476 * KB, 5329 * KB, 5184 * KB, 5041 * KB, 4900 * KB, 4761 * KB, 4624 * KB, 4489 * KB, 4356 * KB, 4225 * KB, 4096 * KB,
	3969 * KB, 3844 * KB, 3721 * KB, 3600 * KB, 3481 * KB, 3364 * KB, 3249 * KB, 3136 * KB, 3025 * KB, 2916 * KB, 2809 * KB, 2704 * KB, 2601 * KB, 2500 * KB, 2401 * KB, 2304 * KB,
	2209 * KB, 2116 * KB, 2025 * KB, 1936 * KB, 1849 * KB, 1764 * KB, 1681 * KB, 1600 * KB, 1521 * KB, 1444 * KB, 1369 * KB, 1296 * KB, 1225 * KB, 1156 * KB, 1089 * KB, 1024 * KB,
	961 * KB, 900 * KB, 841 * KB, 784 * KB, 729 * KB, 676 * KB, 625 * KB, 576 * KB, 529 * KB, 484 * KB, 441 * KB, 400 * KB, 361 * KB, 324 * KB, 289 * KB, 256 * KB,
	225 * KB, 196 * KB, 169 * KB, 144 * KB, 121 * KB, 100 * KB, 81 * KB, 64 * KB, 49 * KB, 36 * KB, 25 * KB, 16 * KB, 9 * KB, 4 * KB, 1 * KB,
	0 * KB, 1 * KB, 4 * KB, 9 * KB, 16 * KB, 25 * KB, 36 * KB, 49 * KB, 64 * KB, 81 * KB, 100 * KB, 121 * KB, 144 * KB, 169 * KB, 196 * KB, 225 * KB,
	256 * KB, 289 * KB, 324 * KB, 361 * KB, 400 * KB, 441 * KB, 484 * KB, 529 * KB, 576 * KB, 625 * KB, 676 * KB, 729 * KB, 784 * KB, 841 * KB, 900 * KB, 961 * KB,
	1024 * KB, 1089 * KB, 1156 * KB, 1225 * KB, 1296 * KB, 1369 * KB, 1444 * KB, 1521 * KB, 1600 * KB, 1681 * KB, 1764 * KB, 1849 * KB, 1936 * KB, 2025 * KB, 2116 * KB, 2209 * KB,
	2304 * KB, 2401 * KB, 2500 * KB, 2601 * KB, 2704 * KB, 2809 * KB, 2916 * KB, 3025 * KB, 3136 * KB, 3249 * KB, 3364 * KB, 3481 * KB, 3600 * KB, 3721 * KB, 3844 * KB, 3969 * KB,
	4096 * KB, 4225 * KB, 4356 * KB, 4489 * KB, 4624 * KB, 4761 * KB, 4900 * KB, 5041 * KB, 5184 * KB, 5329 * KB, 5476 * KB, 5625 * KB, 5776 * KB, 5929 * KB, 6084 * KB, 6241 * KB,
	6400 * KB, 6561 * KB, 6724 * KB, 6889 * KB, 7056 * KB, 7225 * KB, 7396 * KB, 7569 * KB, 7744 * KB, 7921 * KB, 8100 * KB, 8281 * KB, 8464 * KB, 8649 * KB, 8836 * KB, 9025 * KB,
	9216 * KB, 9409 * KB, 9604 * KB, 9801 * KB, 10000 * KB, 10201 * KB, 10404 * KB, 10609 * KB, 10816 * KB, 11025 * KB, 11236 * KB, 11449 * KB, 11664 * KB, 11881 * KB, 12100 * KB, 12321 * KB,
	12544 * KB, 12769 * KB, 12996 * KB, 13225 * KB, 13456 * KB, 13689 * KB, 13924 * KB, 14161 * KB, 14400 * KB, 14641 * KB, 14884 * KB, 15129 * KB, 15376 * KB, 15625 * KB, 15876 * KB, 16129 * KB,
	16384 * KB, 16641 * KB, 16900 * KB, 17161 * KB, 17424 * KB, 17689 * KB, 17956 * KB, 18225 * KB, 18496 * KB, 18769 * KB, 19044 * KB, 19321 * KB, 19600 * KB, 19881 * KB, 20164 * KB, 20449 * KB,
	20736 * KB, 21025 * KB, 21316 * KB, 21609 * KB, 21904 * KB, 22201 * KB, 22500 * KB, 22801 * KB, 23104 * KB, 23409 * KB, 23716 * KB, 24025 * KB, 24336 * KB, 24649 * KB, 24964 * KB, 25281 * KB,
	25600 * KB, 25921 * KB, 26244 * KB, 26569 * KB, 26896 * KB, 27225 * KB, 27556 * KB, 27889 * KB, 28224 * KB, 28561 * KB, 28900 * KB, 29241 * KB, 29584 * KB, 29929 * KB, 30276 * KB, 30625 * KB,
	30976 * KB, 31329 * KB, 31684 * KB, 32041 * KB, 32400 * KB, 32761 * KB, 33124 * KB, 33489 * KB, 33856 * KB, 34225 * KB, 34596 * KB, 34969 * KB, 35344 * KB, 35721 * KB, 36100 * KB, 36481 * KB,
	36864 * KB, 37249 * KB, 37636 * KB, 38025 * KB, 38416 * KB, 38809 * KB, 39204 * KB, 39601 * KB, 40000 * KB, 40401 * KB, 40804 * KB, 41209 * KB, 41616 * KB, 42025 * KB, 42436 * KB, 42849 * KB,
	43264 * KB, 43681 * KB, 44100 * KB, 44521 * KB, 44944 * KB, 45369 * KB, 45796 * KB, 46225 * KB, 46656 * KB, 47089 * KB, 47524 * KB, 47961 * KB, 48400 * KB, 48841 * KB, 49284 * KB, 49729 * KB,
	50176 * KB, 50625 * KB, 51076 * KB, 51529 * KB, 51984 * KB, 52441 * KB, 52900 * KB, 53361 * KB, 53824 * KB, 54289 * KB, 54756 * KB, 55225 * KB, 55696 * KB, 56169 * KB, 56644 * KB, 57121 * KB,
	57600 * KB, 58081 * KB, 58564 * KB, 59049 * KB, 59536 * KB, 60025 * KB, 60516 * KB, 61009 * KB, 61504 * KB, 62001 * KB, 62500 * KB, 63001 * KB, 63504 * KB, 64009 * KB, 64516 * KB, 65025 * KB]);

// Find the best table to use for a 2x4 area by testing all.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable2x4(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = 3 * 255 * 255 * 16;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{
		err = compressBlockWithTable2x4(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {
			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;
		}
	}
	return min_error >> 0;
}

// Find the best table to use for a 2x4 area by testing all.
// Uses perceptual weighting. 
// Uses fixed point implementation where 1000 equals 1.0
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable2x4percep1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = MAXERR1000;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{

		err = compressBlockWithTable2x4percep1000(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {

			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;

		}
	}
	return min_error >>> 0;
}

// Find the best table to use for a 2x4 area by testing all.
// Uses perceptual weighting. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable2x4percep(img: uint8, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = 3 * 255 * 255 * 16;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{
		err = compressBlockWithTable2x4percep(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {

			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;
		}
	}
	return min_error >> 0;
}

// Find the best table to use for a 4x2 area by testing all.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable4x2(img: uint8, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = 3 * 255 * 255 * 16;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{
		err = compressBlockWithTable4x2(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {

			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;
		}
	}
	return min_error >> 0;
}

// Find the best table to use for a 4x2 area by testing all.
// Uses perceptual weighting. 
// Uses fixed point implementation where 1000 equals 1.0
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable4x2percep1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = MAXERR1000;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{
		err = compressBlockWithTable4x2percep1000(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {
			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;
		}
	}
	return min_error >>> 0;
}

// Find the best table to use for a 4x2 area by testing all.
// Uses perceptual weighting. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable4x2percep(img: Uint8Array, width: number, height: number, startx: number, starty: number, avg_color: Uint8Array, best_table: Uint32Array, best_pixel_indices_MSB: Uint32Array, best_pixel_indices_LSB: Uint32Array) {
	var min_error = 3 * 255 * 255 * 16;
	var q;
	var err;
	var pixel_indices_MSB = new Uint32Array(1), pixel_indices_LSB = new Uint32Array(1);

	for (q = 0; q < 16; q += 2)		// try all the 8 tables. 
	{
		err = compressBlockWithTable4x2percep(img, width, height, startx, starty, avg_color, q, pixel_indices_MSB, pixel_indices_LSB);

		if (err < min_error) {
			min_error = err;
			best_pixel_indices_MSB[0] = pixel_indices_MSB[0];
			best_pixel_indices_LSB[0] = pixel_indices_LSB[0];
			best_table[0] = q >> 1;
		}
	}
	return min_error >> 0;
}

// The below code quantizes a float RGB value to RGB444. 
//
// The format often allows a pixel to completely compensate an intensity error of the base
// color. Hence the closest RGB444 point may not be the best, and the code below uses
// this fact to find a better RGB444 color as the base color.
//
// (See the presentation http://www.jacobstrom.com/publications/PACKMAN.ppt for more info.) 
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function quantize444ColorCombined(avg_col_in: Float32Array, enc_color: Int32Array, avg_color: Uint8Array) {
	var dr, dg, db;
	var kr, kg, kb;
	var wR2, wG2, wB2;
	var low_color = new Uint8Array(3);
	var high_color = new Uint8Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var lowhightable = new Float32Array(8);
	var best_table = 0;
	var best_index = 0;
	var q;
	var kval = (255.0 / 15.0);

	// These are the values that we want to have:
	var red_average, green_average, blue_average;

	var red_4bit_low, green_4bit_low, blue_4bit_low;
	var red_4bit_high, green_4bit_high, blue_4bit_high;

	// These are the values that we approximate with:
	var red_low, green_low, blue_low;
	var red_high, green_high, blue_high;

	red_average = avg_col_in[0];
	green_average = avg_col_in[1];
	blue_average = avg_col_in[2];

	// Find the 5-bit reconstruction levels red_low, red_high
	// so that red_average is in interval [red_low, red_high].
	// (The same with green and blue.)

	red_4bit_low = (red_average / kval) >> 0;
	green_4bit_low = (green_average / kval) >> 0;
	blue_4bit_low = (blue_average / kval) >> 0;

	red_4bit_high = CLAMP(0, red_4bit_low + 1, 15);
	green_4bit_high = CLAMP(0, green_4bit_low + 1, 15);
	blue_4bit_high = CLAMP(0, blue_4bit_low + 1, 15);

	red_low = (red_4bit_low << 4) | (red_4bit_low >> 0);
	green_low = (green_4bit_low << 4) | (green_4bit_low >> 0);
	blue_low = (blue_4bit_low << 4) | (blue_4bit_low >> 0);

	red_high = (red_4bit_high << 4) | (red_4bit_high >> 0);
	green_high = (green_4bit_high << 4) | (green_4bit_high >> 0);
	blue_high = (blue_4bit_high << 4) | (blue_4bit_high >> 0);

	kr = red_high - red_low;
	kg = green_high - green_low;
	kb = blue_high - blue_low;

	// Note that dr, dg, and db are all negative.
	dr = red_low - red_average;
	dg = green_low - green_average;
	db = blue_low - blue_average;

	// Use straight (nonperceptive) weights.
	wR2 = 1.0;
	wG2 = 1.0;
	wB2 = 1.0;

	lowhightable[0] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[1] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[2] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[3] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[4] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[5] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[6] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));
	lowhightable[7] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));

	var min_value = lowhightable[0];
	var min_index = 0;

	for (q = 1; q < 8; q++) {
		if (lowhightable[q] < min_value) {
			min_value = lowhightable[q];
			min_index = q;
		}
	}

	var drh = red_high - red_average;
	var dgh = green_high - green_average;
	var dbh = blue_high - blue_average;

	low_color[0] = red_4bit_low;
	low_color[1] = green_4bit_low;
	low_color[2] = blue_4bit_low;

	high_color[0] = red_4bit_high;
	high_color[1] = green_4bit_high;
	high_color[2] = blue_4bit_high;

	switch (min_index) {
		case 0:
			// Since the step size is always 17 in RGB444 format (15*17=255),
			// kr = kg = kb = 17, which means that case 0 and case 7 will
			// always have equal projected error. Choose the one that is
			// closer to the desired color. 
			if (dr * dr + dg * dg + db * db > 3 * 8 * 8) {
				enc_color[0] = high_color[0];
				enc_color[1] = high_color[1];
				enc_color[2] = high_color[2];
			}
			else {
				enc_color[0] = low_color[0];
				enc_color[1] = low_color[1];
				enc_color[2] = low_color[2];
			}
			break;
		case 1:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 2:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 3:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 4:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 5:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 6:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
		case 7:
			if (dr * dr + dg * dg + db * db > 3 * 8 * 8) {
				enc_color[0] = high_color[0];
				enc_color[1] = high_color[1];
				enc_color[2] = high_color[2];
			}
			else {
				enc_color[0] = low_color[0];
				enc_color[1] = low_color[1];
				enc_color[2] = low_color[2];
			}
			break;
	}
	// Expand 5-bit encoded color to 8-bit color
	avg_color[0] = (enc_color[0] << 3) | (enc_color[0] >> 2);
	avg_color[1] = (enc_color[1] << 3) | (enc_color[1] >> 2);
	avg_color[2] = (enc_color[2] << 3) | (enc_color[2] >> 2);
}

// The below code quantizes a float RGB value to RGB555. 
//
// The format often allows a pixel to completely compensate an intensity error of the base
// color. Hence the closest RGB555 point may not be the best, and the code below uses
// this fact to find a better RGB555 color as the base color.
//
// (See the presentation http://www.jacobstrom.com/publications/PACKMAN.ppt for more info.) 
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function quantize555ColorCombined(avg_col_in: Float32Array, enc_color: Int32Array, avg_color: Uint8Array) {
	var dr, dg, db;
	var kr, kg, kb;
	var wR2, wG2, wB2;
	var low_color = new Uint8Array(3);
	var high_color = new Uint8Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var lowhightable = new Float32Array(8);
	var best_table = 0;
	var best_index = 0;
	var q;
	var kval = (255.0 / 31.0);

	// These are the values that we want to have:
	var red_average, green_average, blue_average;

	var red_5bit_low, green_5bit_low, blue_5bit_low;
	var red_5bit_high, green_5bit_high, blue_5bit_high;

	// These are the values that we approximate with:
	var red_low, green_low, blue_low;
	var red_high, green_high, blue_high;

	red_average = avg_col_in[0];
	green_average = avg_col_in[1];
	blue_average = avg_col_in[2];

	// Find the 5-bit reconstruction levels red_low, red_high
	// so that red_average is in interval [red_low, red_high].
	// (The same with green and blue.)

	red_5bit_low = (red_average / kval) >> 0;
	green_5bit_low = (green_average / kval) >> 0;
	blue_5bit_low = (blue_average / kval) >> 0;

	red_5bit_high = CLAMP(0, red_5bit_low + 1, 31);
	green_5bit_high = CLAMP(0, green_5bit_low + 1, 31);
	blue_5bit_high = CLAMP(0, blue_5bit_low + 1, 31);

	red_low = (red_5bit_low << 3) | (red_5bit_low >> 2);
	green_low = (green_5bit_low << 3) | (green_5bit_low >> 2);
	blue_low = (blue_5bit_low << 3) | (blue_5bit_low >> 2);

	red_high = (red_5bit_high << 3) | (red_5bit_high >> 2);
	green_high = (green_5bit_high << 3) | (green_5bit_high >> 2);
	blue_high = (blue_5bit_high << 3) | (blue_5bit_high >> 2);

	kr = red_high - red_low;
	kg = green_high - green_low;
	kb = blue_high - blue_low;

	// Note that dr, dg, and db are all negative.
	dr = red_low - red_average;
	dg = green_low - green_average;
	db = blue_low - blue_average;

	// Use straight (nonperceptive) weights.
	wR2 = 1.0;
	wG2 = 1.0;
	wB2 = 1.0;

	lowhightable[0] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[1] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[2] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[3] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[4] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[5] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[6] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));
	lowhightable[7] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));

	var min_value = lowhightable[0];
	var min_index = 0;

	for (q = 1; q < 8; q++) {
		if (lowhightable[q] < min_value) {
			min_value = lowhightable[q];
			min_index = q;
		}
	}

	var drh = red_high - red_average;
	var dgh = green_high - green_average;
	var dbh = blue_high - blue_average;

	low_color[0] = red_5bit_low;
	low_color[1] = green_5bit_low;
	low_color[2] = blue_5bit_low;

	high_color[0] = red_5bit_high;
	high_color[1] = green_5bit_high;
	high_color[2] = blue_5bit_high;

	switch (min_index) {
		case 0:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 1:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 2:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 3:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 4:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 5:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 6:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
		case 7:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
	}

	// Expand 5-bit encoded color to 8-bit color
	avg_color[0] = (enc_color[0] << 3) | (enc_color[0] >> 2);
	avg_color[1] = (enc_color[1] << 3) | (enc_color[1] >> 2);
	avg_color[2] = (enc_color[2] << 3) | (enc_color[2] >> 2);

}

// The below code quantizes a float RGB value to RGB444. 
//
// The format often allows a pixel to completely compensate an intensity error of the base
// color. Hence the closest RGB444 point may not be the best, and the code below uses
// this fact to find a better RGB444 color as the base color.
//
// (See the presentation http://www.jacobstrom.com/publications/PACKMAN.ppt for more info.) 
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function quantize444ColorCombinedPerceptual(avg_col_in: Float32Array, enc_color: Int32Array, avg_color: Uint8Array) {
	var dr, dg, db;
	var kr, kg, kb;
	var wR2, wG2, wB2;
	var low_color = new Uint8Array(3);
	var high_color = new Uint8Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var lowhightable = new Float32Array(8);
	var best_table = 0;
	var best_index = 0;
	var q;
	var kval = (255.0 / 15.0);

	// These are the values that we want to have:
	var red_average, green_average, blue_average;

	var red_4bit_low, green_4bit_low, blue_4bit_low;
	var red_4bit_high, green_4bit_high, blue_4bit_high;

	// These are the values that we approximate with:
	var red_low, green_low, blue_low;
	var red_high, green_high, blue_high;

	red_average = avg_col_in[0];
	green_average = avg_col_in[1];
	blue_average = avg_col_in[2];

	// Find the 5-bit reconstruction levels red_low, red_high
	// so that red_average is in interval [red_low, red_high].
	// (The same with green and blue.)

	red_4bit_low = (red_average / kval) >> 0;
	green_4bit_low = (green_average / kval) >> 0;
	blue_4bit_low = (blue_average / kval) >> 0;

	red_4bit_high = CLAMP(0, red_4bit_low + 1, 15);
	green_4bit_high = CLAMP(0, green_4bit_low + 1, 15);
	blue_4bit_high = CLAMP(0, blue_4bit_low + 1, 15);

	red_low = (red_4bit_low << 4) | (red_4bit_low >> 0);
	green_low = (green_4bit_low << 4) | (green_4bit_low >> 0);
	blue_low = (blue_4bit_low << 4) | (blue_4bit_low >> 0);

	red_high = (red_4bit_high << 4) | (red_4bit_high >> 0);
	green_high = (green_4bit_high << 4) | (green_4bit_high >> 0);
	blue_high = (blue_4bit_high << 4) | (blue_4bit_high >> 0);

	low_color[0] = red_4bit_low;
	low_color[1] = green_4bit_low;
	low_color[2] = blue_4bit_low;

	high_color[0] = red_4bit_high;
	high_color[1] = green_4bit_high;
	high_color[2] = blue_4bit_high;

	kr = red_high - red_low;
	kg = green_high - green_low;
	kb = blue_high - blue_low;

	// Note that dr, dg, and db are all negative.
	dr = red_low - red_average;
	dg = green_low - green_average;
	db = blue_low - blue_average;

	// Perceptual weights to use
	wR2 = PERCEPTUAL_WEIGHT_R_SQUARED;
	wG2 = PERCEPTUAL_WEIGHT_G_SQUARED;
	wB2 = PERCEPTUAL_WEIGHT_B_SQUARED;

	lowhightable[0] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[1] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[2] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[3] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[4] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[5] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[6] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));
	lowhightable[7] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));

	var min_value = lowhightable[0];
	var min_index = 0;

	for (q = 1; q < 8; q++) {
		if (lowhightable[q] < min_value) {
			min_value = lowhightable[q];
			min_index = q;
		}
	}

	var drh = red_high - red_average;
	var dgh = green_high - green_average;
	var dbh = blue_high - blue_average;

	switch (min_index) {
		case 0:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 1:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 2:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 3:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 4:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 5:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 6:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
		case 7:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
	}

	// Expand encoded color to eight bits
	avg_color[0] = (enc_color[0] << 4) | enc_color[0];
	avg_color[1] = (enc_color[1] << 4) | enc_color[1];
	avg_color[2] = (enc_color[2] << 4) | enc_color[2];
}

function quantize555ColorCombinedPerceptual(avg_col_in: Float32Array, enc_color: Int32Array, avg_color: Uint8Array) {
	var dr, dg, db;
	var kr, kg, kb;
	var wR2, wG2, wB2;
	var low_color = new Uint8Array(3);
	var high_color = new Uint8Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var lowhightable = new Float32Array(8);
	var best_table = 0;
	var best_index = 0;
	var q;
	var kval = (255.0 / 31.0);

	// These are the values that we want to have:
	var red_average, green_average, blue_average;

	var red_5bit_low, green_5bit_low, blue_5bit_low;
	var red_5bit_high, green_5bit_high, blue_5bit_high;

	// These are the values that we approximate with:
	var red_low, green_low, blue_low;
	var red_high, green_high, blue_high;

	red_average = avg_col_in[0];
	green_average = avg_col_in[1];
	blue_average = avg_col_in[2];

	// Find the 5-bit reconstruction levels red_low, red_high
	// so that red_average is in interval [red_low, red_high].
	// (The same with green and blue.)

	red_5bit_low = (red_average / kval) >> 0;
	green_5bit_low = (green_average / kval) >> 0;
	blue_5bit_low = (blue_average / kval) >> 0;

	red_5bit_high = CLAMP(0, red_5bit_low + 1, 31);
	green_5bit_high = CLAMP(0, green_5bit_low + 1, 31);
	blue_5bit_high = CLAMP(0, blue_5bit_low + 1, 31);

	red_low = (red_5bit_low << 3) | (red_5bit_low >> 2);
	green_low = (green_5bit_low << 3) | (green_5bit_low >> 2);
	blue_low = (blue_5bit_low << 3) | (blue_5bit_low >> 2);

	red_high = (red_5bit_high << 3) | (red_5bit_high >> 2);
	green_high = (green_5bit_high << 3) | (green_5bit_high >> 2);
	blue_high = (blue_5bit_high << 3) | (blue_5bit_high >> 2);

	low_color[0] = red_5bit_low;
	low_color[1] = green_5bit_low;
	low_color[2] = blue_5bit_low;

	high_color[0] = red_5bit_high;
	high_color[1] = green_5bit_high;
	high_color[2] = blue_5bit_high;

	kr = red_high - red_low;
	kg = green_high - green_low;
	kb = blue_high - blue_low;

	// Note that dr, dg, and db are all negative.
	dr = red_low - red_average;
	dg = green_low - green_average;
	db = blue_low - blue_average;

	// Perceptual weights to use
	wR2 = PERCEPTUAL_WEIGHT_R_SQUARED;
	wG2 = PERCEPTUAL_WEIGHT_G_SQUARED;
	wB2 = PERCEPTUAL_WEIGHT_B_SQUARED;

	lowhightable[0] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[1] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + 0) - (db + 0));
	lowhightable[2] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[3] = wR2 * wG2 * SQUARE((dr + 0) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[4] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + 0)) + wG2 * wB2 * SQUARE((dg + kg) - (db + 0));
	lowhightable[5] = wR2 * wG2 * SQUARE((dr + kr) - (dg + 0)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + 0) - (db + kb));
	lowhightable[6] = wR2 * wG2 * SQUARE((dr + 0) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + 0) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));
	lowhightable[7] = wR2 * wG2 * SQUARE((dr + kr) - (dg + kg)) + wR2 * wB2 * SQUARE((dr + kr) - (db + kb)) + wG2 * wB2 * SQUARE((dg + kg) - (db + kb));

	var min_value = lowhightable[0];
	var min_index = 0;

	for (q = 1; q < 8; q++) {
		if (lowhightable[q] < min_value) {
			min_value = lowhightable[q];
			min_index = q;
		}
	}

	var drh = red_high - red_average;
	var dgh = green_high - green_average;
	var dbh = blue_high - blue_average;

	switch (min_index) {
		case 0:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 1:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = low_color[2];
			break;
		case 2:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 3:
			enc_color[0] = low_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 4:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = low_color[2];
			break;
		case 5:
			enc_color[0] = high_color[0];
			enc_color[1] = low_color[1];
			enc_color[2] = high_color[2];
			break;
		case 6:
			enc_color[0] = low_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
		case 7:
			enc_color[0] = high_color[0];
			enc_color[1] = high_color[1];
			enc_color[2] = high_color[2];
			break;
	}

	// Expand 5-bit encoded color to 8-bit color
	avg_color[0] = (enc_color[0] << 3) | (enc_color[0] >> 2);
	avg_color[1] = (enc_color[1] << 3) | (enc_color[1] >> 2);
	avg_color[2] = (enc_color[2] << 3) | (enc_color[2] >> 2);
}

function compressBlockOnlyIndividualAveragePerceptual1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, best_enc_color1: Int32Array, best_enc_color2: Int32Array, best_flip: Int32Array, best_err_upper: Uint32Array, best_err_lower: Uint32Array, best_err_left: Uint32Array, best_err_right: Uint32Array, best_color_upper: Int32Array, best_color_lower: Int32Array, best_color_left: Int32Array, best_color_right: Int32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3);
	var best_table_indices1 = 0, best_table_indices2 = 0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;
	var best_err;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	enc_color1[0] = (JAS_ROUND(15.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(15.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(15.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(15.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(15.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(15.0 * avg_color_float2[2] / 255.0)) >> 0;

	diffbit = 0;

	avg_color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
	avg_color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
	avg_color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
	avg_color_quant2[0] = enc_color2[0] << 4 | (enc_color2[0]);
	avg_color_quant2[1] = enc_color2[1] << 4 | (enc_color2[1]);
	avg_color_quant2[2] = enc_color2[2] << 4 | (enc_color2[2]);

	// Pack bits into the first word. 

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	compressed1_norm = 0;
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 4, 63);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 4, 55);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 4, 47);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[0], 4, 59);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 51);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 43);

	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);

	best_enc_color1[0] = enc_color1[0];
	best_enc_color1[1] = enc_color1[1];
	best_enc_color1[2] = enc_color1[2];
	best_enc_color2[0] = enc_color2[0];
	best_enc_color2[1] = enc_color2[1];
	best_enc_color2[2] = enc_color2[2];

	best_color_left[0] = enc_color1[0];
	best_color_left[1] = enc_color1[1];
	best_color_left[2] = enc_color1[2];
	best_color_right[0] = enc_color2[0];
	best_color_right[1] = enc_color2[1];
	best_color_right[2] = enc_color2[2];

	norm_err = 0;

	// left part of block
	best_err_left[0] = tryalltables_3bittable2x4percep1000(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	norm_err = best_err_left[0];

	// right part of block
	best_err_right[0] = tryalltables_3bittable2x4percep1000(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	norm_err += best_err_right[0];

	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

	compressed2_norm = 0;
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);

	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(15.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(15.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(15.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(15.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(15.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(15.0 * avg_color_float2[2] / 255.0)) >> 0;

	best_color_upper[0] = enc_color1[0];
	best_color_upper[1] = enc_color1[1];
	best_color_upper[2] = enc_color1[2];
	best_color_lower[0] = enc_color2[0];
	best_color_lower[1] = enc_color2[1];
	best_color_lower[2] = enc_color2[2];

	diffbit = 0;

	avg_color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
	avg_color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
	avg_color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
	avg_color_quant2[0] = enc_color2[0] << 4 | (enc_color2[0]);
	avg_color_quant2[1] = enc_color2[1] << 4 | (enc_color2[1]);
	avg_color_quant2[2] = enc_color2[2] << 4 | (enc_color2[2]);

	// Pack bits into the first word. 

	compressed1_flip = 0;
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 4, 63);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 4, 55);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 4, 47);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[0], 4, 49);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[1], 4, 51);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[2], 4, 43);

	// upper part of block
	best_err_upper[0] = tryalltables_3bittable4x2percep1000(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	flip_err = best_err_upper[0];
	// lower part of block
	best_err_lower[0] = tryalltables_3bittable4x2percep1000(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	flip_err += best_err_lower[0];

	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

	best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
	best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

	compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
		best_err = norm_err;
		best_flip[0] = 0;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
		best_err = flip_err;
		best_enc_color1[0] = enc_color1[0];
		best_enc_color1[1] = enc_color1[1];
		best_enc_color1[2] = enc_color1[2];
		best_enc_color2[0] = enc_color2[0];
		best_enc_color2[1] = enc_color2[1];
		best_enc_color2[2] = enc_color2[2];
		best_flip[0] = 1;
	}
	return best_err >>> 0;
}

// Compresses the block using only the individual mode in ETC1/ETC2 using the average color as the base color.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockOnlyIndividualAverage(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, best_enc_color1: Int32Array, best_enc_color2: Int32Array, best_flip: Int32Array, best_err_upper: Uint32Array, best_err_lower: Uint32Array, best_err_left: Uint32Array, best_err_right: Uint32Array, best_color_upper: Int32Array, best_color_lower: Int32Array, best_color_left: Int32Array, best_color_right: Int32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var best_table_indices1 = 0, best_table_indices2 = 0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;
	var best_err;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	enc_color1[0] = (JAS_ROUND(15.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(15.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(15.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(15.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(15.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(15.0 * avg_color_float2[2] / 255.0)) >> 0;

	diffbit = 0;

	avg_color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
	avg_color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
	avg_color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
	avg_color_quant2[0] = enc_color2[0] << 4 | (enc_color2[0]);
	avg_color_quant2[1] = enc_color2[1] << 4 | (enc_color2[1]);
	avg_color_quant2[2] = enc_color2[2] << 4 | (enc_color2[2]);

	// Pack bits into the first word. 

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	compressed1_norm = 0;
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 4, 63);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 4, 55);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 4, 47);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[0], 4, 59);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 51);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 43);

	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);

	best_enc_color1[0] = enc_color1[0];
	best_enc_color1[1] = enc_color1[1];
	best_enc_color1[2] = enc_color1[2];
	best_enc_color2[0] = enc_color2[0];
	best_enc_color2[1] = enc_color2[1];
	best_enc_color2[2] = enc_color2[2];
	best_color_left[0] = enc_color1[0];
	best_color_left[1] = enc_color1[1];
	best_color_left[2] = enc_color1[2];
	best_color_right[0] = enc_color2[0];
	best_color_right[1] = enc_color2[1];
	best_color_right[2] = enc_color2[2];

	norm_err = 0;

	// left part of block
	best_err_left[0] = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	norm_err = best_err_left[0];

	// right part of block
	best_err_right[0] = tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	norm_err += best_err_right[0];

	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

	compressed2_norm = 0;
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);


	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(15.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(15.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(15.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(15.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(15.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(15.0 * avg_color_float2[2] / 255.0)) >> 0;

	best_color_upper[0] = enc_color1[0];
	best_color_upper[1] = enc_color1[1];
	best_color_upper[2] = enc_color1[2];
	best_color_lower[0] = enc_color2[0];
	best_color_lower[1] = enc_color2[1];
	best_color_lower[2] = enc_color2[2];

	diffbit = 0;

	avg_color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
	avg_color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
	avg_color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
	avg_color_quant2[0] = enc_color2[0] << 4 | (enc_color2[0]);
	avg_color_quant2[1] = enc_color2[1] << 4 | (enc_color2[1]);
	avg_color_quant2[2] = enc_color2[2] << 4 | (enc_color2[2]);

	// Pack bits into the first word. 

	compressed1_flip = 0;
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 4, 63);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 4, 55);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 4, 47);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[0], 4, 49);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[1], 4, 51);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[2], 4, 43);

	// upper part of block
	best_err_upper[0] = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	flip_err = best_err_upper[0];
	// lower part of block
	best_err_lower[0] = tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	flip_err += best_err_lower[0];

	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

	best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
	best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

	compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
		best_err = norm_err;
		best_flip[0] = 0;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
		best_err = flip_err;
		best_enc_color1[0] = enc_color1[0];
		best_enc_color1[1] = enc_color1[1];
		best_enc_color1[2] = enc_color1[2];
		best_enc_color2[0] = enc_color2[0];
		best_enc_color2[1] = enc_color2[1];
		best_enc_color2[2] = enc_color2[2];
		best_flip[0] = 1;
	}
	return best_err >> 0;
}

// Compresses the block using either the individual or differential mode in ETC1/ETC2
// Uses the average color as the base color in each half-block.
// Tries both flipped and unflipped.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipAverage(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	//var best_table_indices1=0, best_table_indices2=0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;

	// First try normal blocks 2x4:
	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	var eps;

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		//     ETC1_RGB8_OES:
		// 
		//     a) bit layout in bits 63 through 32 if diffbit = 0
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		//     
		//     b) bit layout in bits 63 through 32 if diffbit = 1
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
		//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		// 
		//     c) bit layout in bits 31 through 0 (in both cases)
		// 
		//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
		//      --------------------------------------------------------------------------------------------------
		//     |       most significant pixel index bits       |         least significant pixel index bits       |  
		//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
		//      --------------------------------------------------------------------------------------------------      

		compressed1_norm = 0;
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 5, 63);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 5, 55);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 5, 47);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[0], 3, 58);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[1], 3, 50);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		norm_err = 0;

		// left part of block
		norm_err = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

		compressed2_norm = 0;
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.

		eps = 0.0001;

		enc_color1[0] = ((avg_color_float1[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[1] = ((avg_color_float1[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[2] = ((avg_color_float1[2] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[0] = ((avg_color_float2[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[1] = ((avg_color_float2[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[2] = ((avg_color_float2[2] / (17.0)) + 0.5 + eps) >> 0;
		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		// Pack bits into the first word. 

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		compressed1_norm = 0;
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 4, 63);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 4, 55);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 4, 47);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[0], 4, 59);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 51);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// left part of block
		norm_err = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

		compressed2_norm = 0;
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);
	}

	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		compressed1_flip = 0;
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 5, 63);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 5, 55);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 5, 47);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[0], 3, 58);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[1], 3, 50);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.
		eps = 0.0001;

		enc_color1[0] = ((avg_color_float1[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[1] = ((avg_color_float1[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[2] = ((avg_color_float1[2] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[0] = ((avg_color_float2[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[1] = ((avg_color_float2[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[2] = ((avg_color_float2[2] / (17.0)) + 0.5 + eps) >> 0;

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------


		// Pack bits into the first word. 

		compressed1_flip = 0;
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 4, 63);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 4, 55);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 4, 47);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[0], 4, 59);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[1], 4, 51);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
	}
}

// Compresses the block using only the differential mode in ETC1/ETC2
// Uses the average color as the base color in each half-block.
// If average colors are too different, use the average color of the entire block in both half-blocks.
// Tries both flipped and unflipped.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockOnlyDiffFlipAverage(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, best_enc_color1: Int32Array, best_enc_color2: Int32Array, best_flip: Int32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	//var best_table_indices1=0, best_table_indices2=0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;
	var best_err;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if (!((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3))) {
		// The colors are too different. Use the same color in both blocks.
		enc_color1[0] = (JAS_ROUND(31.0 * ((avg_color_float1[0] + avg_color_float2[0]) / 2.0) / 255.0)) >> 0;
		enc_color1[1] = (JAS_ROUND(31.0 * ((avg_color_float1[1] + avg_color_float2[1]) / 2.0) / 255.0)) >> 0;
		enc_color1[2] = (JAS_ROUND(31.0 * ((avg_color_float1[2] + avg_color_float2[2]) / 2.0) / 255.0)) >> 0;
		enc_color2[0] = enc_color1[0];
		enc_color2[1] = enc_color1[1];
		enc_color2[2] = enc_color1[2];
		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];
	}

	diffbit = 1;

	// The difference to be coded:

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
	avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
	avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
	avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
	avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
	avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

	// Pack bits into the first word. 

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	compressed1_norm = 0;
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 5, 63);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 5, 55);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 5, 47);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[0], 3, 58);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[1], 3, 50);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[2], 3, 42);

	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);

	best_enc_color1[0] = enc_color1[0];
	best_enc_color1[1] = enc_color1[1];
	best_enc_color1[2] = enc_color1[2];
	best_enc_color2[0] = enc_color2[0];
	best_enc_color2[1] = enc_color2[1];
	best_enc_color2[2] = enc_color2[2];

	norm_err = 0;

	// left part of block
	norm_err = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

	// right part of block
	norm_err += tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
	compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

	compressed2_norm = 0;
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
	compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);

	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if (!((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3))) {
		// The colors are too different. Use the same color in both blocks.
		enc_color1[0] = (JAS_ROUND(31.0 * ((avg_color_float1[0] + avg_color_float2[0]) / 2.0) / 255.0)) >> 0;
		enc_color1[1] = (JAS_ROUND(31.0 * ((avg_color_float1[1] + avg_color_float2[1]) / 2.0) / 255.0)) >> 0;
		enc_color1[2] = (JAS_ROUND(31.0 * ((avg_color_float1[2] + avg_color_float2[2]) / 2.0) / 255.0)) >> 0;
		enc_color2[0] = enc_color1[0];
		enc_color2[1] = enc_color1[1];
		enc_color2[2] = enc_color1[2];
		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];
	}
	diffbit = 1;

	// The difference to be coded:

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
	avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
	avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
	avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
	avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
	avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

	// Pack bits into the first word. 

	compressed1_flip = 0;
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 5, 63);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 5, 55);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 5, 47);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[0], 3, 58);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[1], 3, 50);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[2], 3, 42);

	// upper part of block
	flip_err = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	// lower part of block
	flip_err += tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
	compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

	best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
	best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

	compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
		best_err = norm_err;
		best_flip[0] = 0;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
		best_err = flip_err;
		best_enc_color1[0] = enc_color1[0];
		best_enc_color1[1] = enc_color1[1];
		best_enc_color1[2] = enc_color1[2];
		best_enc_color2[0] = enc_color2[0];
		best_enc_color2[1] = enc_color2[1];
		best_enc_color2[2] = enc_color2[2];
		best_flip[0] = 1;
	}
	return best_err >> 0;
}

// Compresses the block using only the differential mode in ETC1/ETC2
// Uses the average color as the base color in each half-block.
// If average colors are too different, use the average color of the entire block in both half-blocks.
// Tries both flipped and unflipped.
// Uses fixed point arithmetics where 1000 represents 1.0.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockOnlyDiffFlipAveragePerceptual1000(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = MAXERR1000;
	//var best_table_indices1=0, best_table_indices2=0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if (!((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3))) {
		enc_color1[0] = (enc_color1[0] + enc_color2[0]) >> 1;
		enc_color1[1] = (enc_color1[1] + enc_color2[1]) >> 1;
		enc_color1[2] = (enc_color1[2] + enc_color2[2]) >> 1;

		enc_color2[0] = enc_color1[0];
		enc_color2[1] = enc_color1[1];
		enc_color2[2] = enc_color1[2];

	}

	{
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		//     ETC1_RGB8_OES:
		// 
		//     a) bit layout in bits 63 through 32 if diffbit = 0
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		//     
		//     b) bit layout in bits 63 through 32 if diffbit = 1
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
		//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		// 
		//     c) bit layout in bits 31 through 0 (in both cases)
		// 
		//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
		//      --------------------------------------------------------------------------------------------------
		//     |       most significant pixel index bits       |         least significant pixel index bits       |  
		//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
		//      --------------------------------------------------------------------------------------------------      

		compressed1_norm = 0;
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 5, 63);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 5, 55);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 5, 47);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[0], 3, 58);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[1], 3, 50);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		norm_err = 0;

		// left part of block 
		norm_err = tryalltables_3bittable2x4percep1000(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4percep1000(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

		compressed2_norm = 0;
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);

	}
	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if (!((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3))) {
		enc_color1[0] = (enc_color1[0] + enc_color2[0]) >> 1;
		enc_color1[1] = (enc_color1[1] + enc_color2[1]) >> 1;
		enc_color1[2] = (enc_color1[2] + enc_color2[2]) >> 1;

		enc_color2[0] = enc_color1[0];
		enc_color2[1] = enc_color1[1];
		enc_color2[2] = enc_color1[2];
	}

	{
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		compressed1_flip = 0;
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 5, 63);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 5, 55);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 5, 47);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[0], 3, 58);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[1], 3, 50);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2percep1000(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2percep1000(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	var best_err;

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
		best_err = norm_err;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
		best_err = flip_err;
	}
	return best_err >>> 0;
}

// Compresses the block using both the individual and the differential mode in ETC1/ETC2
// Uses the average color as the base color in each half-block.
// Uses a perceptual error metric.
// Tries both flipped and unflipped.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipAveragePerceptual(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var compressed1_norm, compressed2_norm;
	var compressed1_flip, compressed2_flip;
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	//var best_table_indices1=0, best_table_indices2=0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	var eps;

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:
		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		//     ETC1_RGB8_OES:
		// 
		//     a) bit layout in bits 63 through 32 if diffbit = 0
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		//     
		//     b) bit layout in bits 63 through 32 if diffbit = 1
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
		//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		// 
		//     c) bit layout in bits 31 through 0 (in both cases)
		// 
		//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
		//      --------------------------------------------------------------------------------------------------
		//     |       most significant pixel index bits       |         least significant pixel index bits       |  
		//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
		//      --------------------------------------------------------------------------------------------------      

		compressed1_norm = 0;
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 5, 63);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 5, 55);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 5, 47);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[0], 3, 58);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[1], 3, 50);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		norm_err = 0;

		// left part of block 
		norm_err = tryalltables_3bittable2x4percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4percep(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

		compressed2_norm = 0;
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.

		eps = 0.0001;

		enc_color1[0] = ((avg_color_float1[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[1] = ((avg_color_float1[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[2] = ((avg_color_float1[2] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[0] = ((avg_color_float2[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[1] = ((avg_color_float2[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[2] = ((avg_color_float2[2] / (17.0)) + 0.5 + eps) >> 0;
		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		// Pack bits into the first word. 

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		compressed1_norm = 0;
		compressed1_norm = PUTBITSHIGH(compressed1_norm, diffbit, 1, 33);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[0], 4, 63);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[1], 4, 55);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color1[2], 4, 47);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[0], 4, 59);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[1], 4, 51);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// left part of block
		norm_err = tryalltables_3bittable2x4percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4percep(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table1[0], 3, 39);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, best_table2[0], 3, 36);
		compressed1_norm = PUTBITSHIGH(compressed1_norm, 0, 1, 32);

		compressed2_norm = 0;
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm = PUTBITS(compressed2_norm, (best_pixel_indices2_LSB[0]), 8, 15);
	}

	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	enc_color1[0] = (JAS_ROUND(31.0 * avg_color_float1[0] / 255.0)) >> 0;
	enc_color1[1] = (JAS_ROUND(31.0 * avg_color_float1[1] / 255.0)) >> 0;
	enc_color1[2] = (JAS_ROUND(31.0 * avg_color_float1[2] / 255.0)) >> 0;
	enc_color2[0] = (JAS_ROUND(31.0 * avg_color_float2[0] / 255.0)) >> 0;
	enc_color2[1] = (JAS_ROUND(31.0 * avg_color_float2[1] / 255.0)) >> 0;
	enc_color2[2] = (JAS_ROUND(31.0 * avg_color_float2[2] / 255.0)) >> 0;

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		compressed1_flip = 0;
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 5, 63);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 5, 55);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 5, 47);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[0], 3, 58);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[1], 3, 50);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2percep(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.
		eps = 0.0001;

		enc_color1[0] = ((avg_color_float1[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[1] = ((avg_color_float1[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color1[2] = ((avg_color_float1[2] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[0] = ((avg_color_float2[0] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[1] = ((avg_color_float2[1] / (17.0)) + 0.5 + eps) >> 0;
		enc_color2[2] = ((avg_color_float2[2] / (17.0)) + 0.5 + eps) >> 0;

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		// Pack bits into the first word. 

		compressed1_flip = 0;
		compressed1_flip = PUTBITSHIGH(compressed1_flip, diffbit, 1, 33);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[0], 4, 63);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[1], 4, 55);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color1[2], 4, 47);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[0], 4, 59);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[1], 4, 51);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2percep(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table1[0], 3, 39);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, best_table2[0], 3, 36);
		compressed1_flip = PUTBITSHIGH(compressed1_flip, 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	var best_err;

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm | 0;
		compressed2[0] = compressed2_norm;
		best_err = norm_err;
	}
	else {
		compressed1[0] = compressed1_flip | 1;
		compressed2[0] = compressed2_flip;
		best_err = flip_err;
	}
	return best_err;
}

// This is our structure for matrix data
class dMatrix {
	_width?: number;
	_height?: number;
	_data?: Float64Array;
	constructor(
		width?: number,
		height?: number,
		data?: Float64Array
	) {
		if (width) {
			this._width = width;
		}
		if (height) {
			this._height = height;
		}
		if (data) {
			this._data = data;
		}
	}
	set width(width: number) {
		this._width = width;
	}
	set height(height: number) {
		this._height = height;
	}
	set data(data: Float64Array) {
		this._data = data;
	}

	get width(): number {
		return this._width || 0;
	}
	get height(): number {
		return this._height || 0;
	}
	get data(): Float64Array {
		return this._data || new Float64Array(1);
	}

}

// Multiplies two matrices
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function multiplyMatrices(Amat: dMatrix, Bmat: dMatrix): dMatrix {
	var xx, yy, q;
	var resmatrix = new dMatrix();

	if (Amat.width != Bmat.height) {
		console.log("Cannot multiply matrices -- dimensions do not agree.");
		return resmatrix;
	}

	// Allocate space for result
	resmatrix.width = Bmat.width;
	resmatrix.height = Amat.height;
	resmatrix.data = new Float64Array((resmatrix.width) * (resmatrix.height));

	for (yy = 0; yy < resmatrix.height; yy++)
		for (xx = 0; xx < resmatrix.width; xx++)
			for (q = 0, resmatrix.data[yy * resmatrix.width + xx] = 0.0; q < Amat.width; q++)
				resmatrix.data[yy * resmatrix.width + xx] += Amat.data[yy * Amat.width + q] * Bmat.data[q * Bmat.width + xx];

	return resmatrix;
}

// Transposes a matrix
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function transposeMatrix(mat: dMatrix) {
	var xx, yy, zz;
	var temp = new Float64Array((mat.width) * (mat.height));
	var newwidth, newheight;

	for (zz = 0; zz < ((mat.width) * (mat.height)); zz++)
		temp[zz] = mat.data[zz];

	newwidth = mat.height;
	newheight = mat.width;

	for (yy = 0; yy < newheight; yy++)
		for (xx = 0; xx < newwidth; xx++)
			mat.data[yy * newwidth + xx] = temp[xx * (mat.width) + yy];

	mat.height = newheight;
	mat.width = newwidth;
	//free(temp);
}

// In the planar mode in ETC2, the block can be partitioned as follows:
// 
// O A  A  A  H
// B D1 D3 C3
// B D2 C2 D5
// B C1 D4 D6
// V
// Here A-pixels, B-pixels and C-pixels only depend on two values. For instance, B-pixels only depend on O and V.
// This can be used to quickly rule out combinations of colors.
// Here we calculate the minimum error for the block if we know the red component for O and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBBBred(block: Uint8Array, colorO: number, colorV: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	// Now first column: B B B 
	/* unroll loop for( yy=0; (yy<4) && (error <= best_error_sofar); yy++)*/
	{
		error = error + square_table[(block[4 * 4 + 0] - clamp_table[((((colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 0] - clamp_table[(((((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 3 + 0] - clamp_table[(((3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block if we know the red component for H and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcCCCred(block: Uint8Array, colorH: number, colorV: number) {
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	error = error + square_table[(block[4 * 4 * 3 + 4 + 0] - clamp_table[(((colorH + 3 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 * 2 + 4 * 2 + 0] - clamp_table[(((2 * colorH + 2 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 + 4 * 3 + 0] - clamp_table[(((3 * colorH + colorV) + 2) >> 2) + 255]) + 255];

	return error >>> 0;
}

// Calculating the minimum error for the block if we know the red component for O and H.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleRedOHperceptual(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);

	var error;

	error = square_table_percep_red[(block[0] - colorO) + 255];
	error = error + square_table_percep_red[(block[4] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table_percep_red[(block[4 * 2] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_red[(block[4 * 3] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the red component for O and H.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleRedOH(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);

	var error;

	error = square_table[(block[0] - colorO) + 255];
	error = error + square_table[(block[4] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table[(block[4 * 2] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 3] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the red component for O and H and V.
// Uses perceptual error metric. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyRedPerceptual(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6
	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table_percep_red[(block[4 * 4 + 4 + 0] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_red[(block[4 * 4 * 2 + 4 + 0] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table_percep_red[(block[4 * 4 + 4 * 2 + 0] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table_percep_red[(block[4 * 4 * 3 + 4 * 2 + 0] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table_percep_red[(block[4 * 4 * 2 + 4 * 3 + 0] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table_percep_red[(block[4 * 4 * 3 + 4 * 3 + 0] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the red component for O and H and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyRed(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6
	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table[(block[4 * 4 + 4 + 0] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 4 + 0] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table[(block[4 * 4 + 4 * 2 + 0] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table[(block[4 * 4 * 3 + 4 * 2 + 0] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table[(block[4 * 4 * 2 + 4 * 3 + 0] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table[(block[4 * 4 * 3 + 4 * 3 + 0] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the red component for O and H.
// Uses perceptual error metrics.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleGreenOHperceptual(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 1) | (colorO >> 6);
	colorH = (colorH << 1) | (colorH >> 6);

	var error;

	error = square_table_percep_green[(block[1] - colorO) + 255];
	error = error + square_table_percep_green[(block[4 + 1] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table_percep_green[(block[4 * 2 + 1] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_green[(block[4 * 3 + 1] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the red component for O and H.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleGreenOH(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 1) | (colorO >> 6);
	colorH = (colorH << 1) | (colorH >> 6);

	var error;

	error = square_table[(block[1] - colorO) + 255];
	error = error + square_table[(block[4 + 1] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table[(block[4 * 2 + 1] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 3 + 1] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the green component for O and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBBBgreen(block: Uint8Array, colorO: number, colorV: number) {
	colorO = (colorO << 1) | (colorO >> 6);
	colorV = (colorV << 1) | (colorV >> 6);

	var error = 0;

	// Now first column: B B B 
	/* unroll loop for( yy=0; (yy<4) && (error <= best_error_sofar); yy++)*/
	{
		error = error + square_table[(block[4 * 4 + 1] - clamp_table[((((colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 1] - clamp_table[(((((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 3 + 1] - clamp_table[(((3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;

}

// Calculating the minimum error for the block (in planar mode) if we know the green component for H and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcCCCgreen(block: Uint8Array, colorH: number, colorV: number) {
	colorH = (colorH << 1) | (colorH >> 6);
	colorV = (colorV << 1) | (colorV >> 6);

	var error = 0;

	error = error + square_table[(block[4 * 4 * 3 + 4 + 1] - clamp_table[(((colorH + 3 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 * 2 + 4 * 2 + 1] - clamp_table[(((2 * colorH + 2 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 + 4 * 3 + 1] - clamp_table[(((3 * colorH + colorV) + 2) >> 2) + 255]) + 255];

	return error;
}

// Calculating the minimum error for the block (in planar mode) if we know the green component for H V and O.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyGreenPerceptual(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 1) | (colorO >> 6);
	colorH = (colorH << 1) | (colorH >> 6);
	colorV = (colorV << 1) | (colorV >> 6);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6

	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table_percep_green[(block[4 * 4 + 4 + 1] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_green[(block[4 * 4 * 2 + 4 + 1] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table_percep_green[(block[4 * 4 + 4 * 2 + 1] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table_percep_green[(block[4 * 4 * 3 + 4 * 2 + 1] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table_percep_green[(block[4 * 4 * 2 + 4 * 3 + 1] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table_percep_green[(block[4 * 4 * 3 + 4 * 3 + 1] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the green component for H V and O.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyGreen(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 1) | (colorO >> 6);
	colorH = (colorH << 1) | (colorH >> 6);
	colorV = (colorV << 1) | (colorV >> 6);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6
	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table[(block[4 * 4 + 4 + 1] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 4 + 1] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table[(block[4 * 4 + 4 * 2 + 1] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table[(block[4 * 4 * 3 + 4 * 2 + 1] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table[(block[4 * 4 * 2 + 4 * 3 + 1] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table[(block[4 * 4 * 3 + 4 * 3 + 1] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}
	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O and V.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBBBbluePerceptual(block: Uint8Array, colorO: number, colorV: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	// Now first column: B B B 
	/* unroll loop for( yy=0; (yy<4) && (error <= best_error_sofar); yy++)*/
	{
		error = error + square_table_percep_blue[(block[4 * 4 + 2] - clamp_table[((((colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_blue[(block[4 * 4 * 2 + 2] - clamp_table[(((((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_blue[(block[4 * 4 * 3 + 2] - clamp_table[(((3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBBBblue(block: Uint8Array, colorO: number, colorV: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	// Now first column: B B B 
	/* unroll loop for( yy=0; (yy<4) && (error <= best_error_sofar); yy++)*/
	{
		error = error + square_table[(block[4 * 4 + 2] - clamp_table[((((colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 2] - clamp_table[(((((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 3 + 2] - clamp_table[(((3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for H and V.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcCCCbluePerceptual(block: Uint8Array, colorH: number, colorV: number) {
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	error = error + square_table_percep_blue[(block[4 * 4 * 3 + 4 + 2] - clamp_table[(((colorH + 3 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table_percep_blue[(block[4 * 4 * 2 + 4 * 2 + 2] - clamp_table[(((2 * colorH + 2 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table_percep_blue[(block[4 * 4 + 4 * 3 + 2] - clamp_table[(((3 * colorH + colorV) + 2) >> 2) + 255]) + 255];

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O and V.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcCCCblue(block: Uint8Array, colorH: number, colorV: number) {
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error = 0;

	error = error + square_table[(block[4 * 4 * 3 + 4 + 2] - clamp_table[(((colorH + 3 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 * 2 + 4 * 2 + 2] - clamp_table[(((2 * colorH + 2 * colorV) + 2) >> 2) + 255]) + 255];
	error = error + square_table[(block[4 * 4 + 4 * 3 + 2] - clamp_table[(((3 * colorH + colorV) + 2) >> 2) + 255]) + 255];

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O and H.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleBlueOHperceptual(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);

	var error;

	error = square_table_percep_blue[(block[2] - colorO) + 255];
	error = error + square_table_percep_blue[(block[4 + 2] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table_percep_blue[(block[4 * 2 + 2] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_blue[(block[4 * 3 + 2] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O and H.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcLowestPossibleBlueOH(block: Uint8Array, colorO: number, colorH: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);

	var error;

	error = square_table[(block[2] - colorO) + 255];
	error = error + square_table[(block[4 + 2] - clamp_table[((((colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	if (error <= best_error_sofar) {
		error = error + square_table[(block[4 * 2 + 2] - clamp_table[(((((colorH - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 3 + 2] - clamp_table[(((3 * (colorH - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O, V and H.
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyBluePerceptual(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6
	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table_percep_blue[(block[4 * 4 + 4 + 2] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table_percep_blue[(block[4 * 4 * 2 + 4 + 2] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table_percep_blue[(block[4 * 4 + 4 * 2 + 2] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table_percep_blue[(block[4 * 4 * 3 + 4 * 2 + 2] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table_percep_blue[(block[4 * 4 * 2 + 4 * 3 + 2] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table_percep_blue[(block[4 * 4 * 3 + 4 * 3 + 2] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}

	return error >>> 0;
}

// Calculating the minimum error for the block (in planar mode) if we know the blue component for O, V and H.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcErrorPlanarOnlyBlue(block: Uint8Array, colorO: number, colorH: number, colorV: number, lowest_possible_error: number, BBBvalue: number, CCCvalue: number, best_error_sofar: number) {
	colorO = (colorO << 2) | (colorO >> 4);
	colorH = (colorH << 2) | (colorH >> 4);
	colorV = (colorV << 2) | (colorV >> 4);

	var error;

	// The block can be partitioned into: O A  A  A
	//                                    B D1 D3 C3
	//                                    B D2 C2 D5
	//                                    B C1 D4 D6
	var xpart_times_4;

	// The first part: O A A A. It equals lowest_possible_error previously calculated. 
	// lowest_possible_error is OAAA, BBBvalue is BBB and CCCvalue is C1C2C3.
	error = lowest_possible_error + BBBvalue + CCCvalue;

	// The remaining pixels to cover are D1 through D6.
	if (error <= best_error_sofar) {
		// Second column: D1 D2  but not C1
		xpart_times_4 = (colorH - colorO);
		error = error + square_table[(block[4 * 4 + 4 + 2] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		error = error + square_table[(block[4 * 4 * 2 + 4 + 2] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		// Third column: D3 notC2 D4
		xpart_times_4 = (colorH - colorO) << 1;
		error = error + square_table[(block[4 * 4 + 4 * 2 + 2] - clamp_table[(((xpart_times_4 + (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		if (error <= best_error_sofar) {
			error = error + square_table[(block[4 * 4 * 3 + 4 * 2 + 2] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			// Forth column: notC3 D5 D6
			xpart_times_4 = 3 * (colorH - colorO);
			error = error + square_table[(block[4 * 4 * 2 + 4 * 3 + 2] - clamp_table[(((xpart_times_4 + ((colorV - colorO) << 1) + 4 * colorO) + 2) >> 2) + 255]) + 255];
			error = error + square_table[(block[4 * 4 * 3 + 4 * 3 + 2] - clamp_table[(((xpart_times_4 + 3 * (colorV - colorO) + 4 * colorO) + 2) >> 2) + 255]) + 255];
		}
	}

	return error >>> 0;
}

// This function uses least squares in order to determine the best values of the plane. 
// This is close to optimal, but not quite, due to nonlinearities in the expantion from 6 and 7 bits to 8, and
// in the clamping to a number between 0 and the maximum. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockPlanar57(img: Uint8Array, width: number, height: number, startx: number, starty: number, compressed57_1: Uint32Array, compressed57_2: Uint32Array) {
	// Use least squares to find the solution with the smallest error.
	// That is, find the vector x so that |Ax-b|^2 is minimized, where
	// x = [Ro Rr Rv]';
	// A = [1 3/4 2/4 1/4 3/4 2/4 1/4  0  2/4 1/4  0  -1/4  1/4  0  -1/4 -2/4 ; 
	//      0 1/4 2/4 3/4  0  1/4 2/4 3/4  0  1/4 2/4  3/4   0  1/4  2/4  3/4 ;
	//      0  0   0   0  1/4 1/4 1/4 1/4 2/4 2/4 2/4  2/4; 3/4 3/4  3/4  3/4]';
	// b = [r11 r12 r13 r14 r21 r22 r23 r24 r31 r32 r33 r34 r41 r42 r43 r44];
	//
	// That is, find solution x = inv(A' * A) * A' * b
	//                          = C * A' * b;
	// C is always the same, so we have calculated it off-line here.
	//                          = C * D
	var xx, yy, cc;
	var coeffsA = new Float64Array([1.00, 0.00, 0.00,
		0.75, 0.25, 0.00,
		0.50, 0.50, 0.00,
		0.25, 0.75, 0.00,
		0.75, 0.00, 0.25,
		0.50, 0.25, 0.25,
		0.25, 0.50, 0.25,
		0.00, 0.75, 0.25,
		0.50, 0.00, 0.50,
		0.25, 0.25, 0.50,
		0.00, 0.50, 0.50,
		-0.25, 0.75, 0.50,
		0.25, 0.00, 0.75,
		0.00, 0.25, 0.75,
		-0.25, 0.50, 0.75,
		-0.50, 0.75, 0.75]);

	var coeffsC = new Float64Array([0.2875, -0.0125, -0.0125, -0.0125, 0.4875, -0.3125, -0.0125, -0.3125, 0.4875]);
	var colorO = new Float64Array(3), colorH = new Float64Array(3), colorV = new Float64Array(3);
	var colorO8 = new Uint8Array(3), colorH8 = new Uint8Array(3), colorV8 = new Uint8Array(3);

	var D_matrix: dMatrix;
	var x_vector: dMatrix;

	var A_matrix = new dMatrix(3, 16, coeffsA);
	var C_matrix = new dMatrix(3, 3, coeffsC);
	var b_vector = new dMatrix(1, 16, new Float64Array(16));
	transposeMatrix(A_matrix);

	// Red component

	// Load color data into vector b:
	for (cc = 0, yy = 0; yy < 4; yy++)
		for (xx = 0; xx < 4; xx++)
			b_vector.data[cc++] = img[3 * width * (starty + yy) + 3 * (startx + xx) + 0];

	D_matrix = multiplyMatrices(A_matrix, b_vector);
	x_vector = multiplyMatrices(C_matrix, D_matrix);

	colorO[0] = CLAMP(0.0, x_vector.data[0], 255.0);
	colorH[0] = CLAMP(0.0, x_vector.data[1], 255.0);
	colorV[0] = CLAMP(0.0, x_vector.data[2], 255.0);

	//free(D_matrix->data); free(D_matrix);
	//free(x_vector->data); free(x_vector);

	// Green component

	// Load color data into vector b:
	for (cc = 0, yy = 0; yy < 4; yy++)
		for (xx = 0; xx < 4; xx++)
			b_vector.data[cc++] = img[3 * width * (starty + yy) + 3 * (startx + xx) + 1];

	D_matrix = multiplyMatrices(A_matrix, b_vector);
	x_vector = multiplyMatrices(C_matrix, D_matrix);

	colorO[1] = CLAMP(0.0, x_vector.data[0], 255.0);
	colorH[1] = CLAMP(0.0, x_vector.data[1], 255.0);
	colorV[1] = CLAMP(0.0, x_vector.data[2], 255.0);

	//free(D_matrix->data); free(D_matrix);
	//free(x_vector->data); free(x_vector);

	// Blue component

	// Load color data into vector b:
	for (cc = 0, yy = 0; yy < 4; yy++)
		for (xx = 0; xx < 4; xx++)
			b_vector.data[cc++] = img[3 * width * (starty + yy) + 3 * (startx + xx) + 2];

	D_matrix = multiplyMatrices(A_matrix, b_vector);
	x_vector = multiplyMatrices(C_matrix, D_matrix);

	colorO[2] = CLAMP(0.0, x_vector.data[0], 255.0);
	colorH[2] = CLAMP(0.0, x_vector.data[1], 255.0);
	colorV[2] = CLAMP(0.0, x_vector.data[2], 255.0);

	//free(D_matrix->data); free(D_matrix);
	//free(x_vector->data); free(x_vector);

	// Quantize to 6 bits
	var D = 255 * (1.0 / ((1 << 6) - 1.0));
	colorO8[0] = JAS_ROUND((1.0 * colorO[0]) / D);
	colorO8[2] = JAS_ROUND((1.0 * colorO[2]) / D);
	colorH8[0] = JAS_ROUND((1.0 * colorH[0]) / D);
	colorH8[2] = JAS_ROUND((1.0 * colorH[2]) / D);
	colorV8[0] = JAS_ROUND((1.0 * colorV[0]) / D);
	colorV8[2] = JAS_ROUND((1.0 * colorV[2]) / D);

	// Quantize to 7 bits
	D = 255 * (1.0 / ((1 << 7) - 1.0));
	colorO8[1] = JAS_ROUND((1.0 * colorO[1]) / D);
	colorH8[1] = JAS_ROUND((1.0 * colorH[1]) / D);
	colorV8[1] = JAS_ROUND((1.0 * colorV[1]) / D);

	// Pack bits in 57 bits

	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      ------------------------------------------------------------------------------------------------
	//     | R0              | G0                 | B0              | RH              | GH                  |
	//      ------------------------------------------------------------------------------------------------
	//
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
	//      ------------------------------------------------------------------------------------------------
	//     | BH              | RV              |  GV                | BV               | not used           |   
	//      ------------------------------------------------------------------------------------------------

	compressed57_1[0] = 0;
	compressed57_2[0] = 0;
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], colorO8[0], 6, 63);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], colorO8[1], 7, 57);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], colorO8[2], 6, 50);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], colorH8[0], 6, 44);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], colorH8[1], 7, 38);
	compressed57_2[0] = PUTBITS(compressed57_2[0], colorH8[2], 6, 31);
	compressed57_2[0] = PUTBITS(compressed57_2[0], colorV8[0], 6, 25);
	compressed57_2[0] = PUTBITS(compressed57_2[0], colorV8[1], 7, 19);
	compressed57_2[0] = PUTBITS(compressed57_2[0], colorV8[2], 6, 12);
}

// During search it is not convenient to store the bits the way they are stored in the 
// file format. Hence, after search, it is converted to this format.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function stuff57bits(planar57_word1: number, planar57_word2: number, planar_word1: Uint32Array, planar_word2: Uint32Array) {
	// Put bits in twotimer configuration for 57 bits (red and green dont overflow, green does)
	// 
	// Go from this bit layout:
	//
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     |R0               |G01G02              |B01B02  ;B03     |RH1           |RH2|GH                 |
	//      -----------------------------------------------------------------------------------------------
	//
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
	//      -----------------------------------------------------------------------------------------------
	//     |BH               |RV               |GV                  |BV                | not used          |   
	//      -----------------------------------------------------------------------------------------------
	//
	//  To this:
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      ------------------------------------------------------------------------------------------------
	//     |//|R0               |G01|/|G02              |B01|/ // //|B02  |//|B03     |RH1           |df|RH2|
	//      ------------------------------------------------------------------------------------------------
	//
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
	//      -----------------------------------------------------------------------------------------------
	//     |GH                  |BH               |RV               |GV                   |BV              |
	//      -----------------------------------------------------------------------------------------------
	//
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------

	var RO, GO1, GO2, BO1, BO2, BO3, RH1, RH2, GH, BH, RV, GV, BV;
	var bit, a, b, c, d, bits;

	RO = GETBITSHIGH(planar57_word1, 6, 63);
	GO1 = GETBITSHIGH(planar57_word1, 1, 57);
	GO2 = GETBITSHIGH(planar57_word1, 6, 56);
	BO1 = GETBITSHIGH(planar57_word1, 1, 50);
	BO2 = GETBITSHIGH(planar57_word1, 2, 49);
	BO3 = GETBITSHIGH(planar57_word1, 3, 47);
	RH1 = GETBITSHIGH(planar57_word1, 5, 44);
	RH2 = GETBITSHIGH(planar57_word1, 1, 39);
	GH = GETBITSHIGH(planar57_word1, 7, 38);
	BH = GETBITS(planar57_word2, 6, 31);
	RV = GETBITS(planar57_word2, 6, 25);
	GV = GETBITS(planar57_word2, 7, 19);
	BV = GETBITS(planar57_word2, 6, 12);

	planar_word1[0] = 0; planar_word2[0] = 0;
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], RO, 6, 62);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], GO1, 1, 56);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], GO2, 6, 54);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], BO1, 1, 48);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], BO2, 2, 44);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], BO3, 3, 41);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], RH1, 5, 38);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], RH2, 1, 32);
	planar_word2[0] = PUTBITS(planar_word2[0], GH, 7, 31);
	planar_word2[0] = PUTBITS(planar_word2[0], BH, 6, 24);
	planar_word2[0] = PUTBITS(planar_word2[0], RV, 6, 18);
	planar_word2[0] = PUTBITS(planar_word2[0], GV, 7, 12);
	planar_word2[0] = PUTBITS(planar_word2[0], BV, 6, 5);

	// Make sure that red does not overflow:
	bit = GETBITSHIGH(planar_word1[0], 1, 62);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], !bit ? 1 : 0, 1, 63);

	// Make sure that green does not overflow:
	bit = GETBITSHIGH(planar_word1[0], 1, 54);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], !bit ? 1 : 0, 1, 55);

	// Make sure that blue overflows:
	a = GETBITSHIGH(planar_word1[0], 1, 44);
	b = GETBITSHIGH(planar_word1[0], 1, 43);
	c = GETBITSHIGH(planar_word1[0], 1, 41);
	d = GETBITSHIGH(planar_word1[0], 1, 40);
	// The following bit abcd bit sequences should be padded with ones: 0111, 1010, 1011, 1101, 1110, 1111
	// The following logical expression checks for the presence of any of those:
	bit = (a & c) | ((!a ? 1 : 0) & b & c & d) | (a & b & (!c ? 1 : 0) & d);
	bits = 0xf * bit;
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], bits, 3, 47);
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], !bit ? 1 : 0, 1, 42);

	// Set diffbit
	planar_word1[0] = PUTBITSHIGH(planar_word1[0], 1, 1, 33);
}

// During search it is not convenient to store the bits the way they are stored in the 
// file format. Hence, after search, it is converted to this format.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function stuff58bits(thumbH58_word1: number, thumbH58_word2: number, thumbH_word1: Uint32Array, thumbH_word2: Uint32Array) {
	// Put bits in twotimer configuration for 58 (red doesn't overflow, green does)
	// 
	// Go from this bit layout:
	//
	//
	//     |63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
	//     |-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |---------------------------------------index bits----------------------------------------------|
	//
	//  To this:
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     |//|R0         |G0      |// // //|G0|B0|//|B0b     |R1         |G1         |B0         |d2|df|d1|
	//      -----------------------------------------------------------------------------------------------
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |---------------------------------------index bits----------------------------------------------|
	//
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |df|fp|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bt|bt|
	//      -----------------------------------------------------------------------------------------------
	//
	//
	// Thus, what we are really doing is going from this bit layout:
	//
	//
	//     |63 62 61 60 59 58|57 56 55 54 53 52 51|50 49|48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33|32   |
	//     |-------empty-----|part0---------------|part1|part2------------------------------------------|part3|
	//
	//  To this:
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      --------------------------------------------------------------------------------------------------|
	//     |//|part0               |// // //|part1|//|part2                                          |df|part3|
	//      --------------------------------------------------------------------------------------------------|

	var part0, part1, part2, part3;
	var bit, a, b, c, d, bits;

	// move parts
	part0 = GETBITSHIGH(thumbH58_word1, 7, 57);
	part1 = GETBITSHIGH(thumbH58_word1, 2, 50);
	part2 = GETBITSHIGH(thumbH58_word1, 16, 48);
	part3 = GETBITSHIGH(thumbH58_word1, 1, 32);
	thumbH_word1[0] = 0;
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part0, 7, 62);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part1, 2, 52);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part2, 16, 49);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part3, 1, 32);

	// Make sure that red does not overflow:
	bit = GETBITSHIGH(thumbH_word1[0], 1, 62);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], !bit ? 1 : 0, 1, 63);

	// Make sure that green overflows:
	a = GETBITSHIGH(thumbH_word1[0], 1, 52);
	b = GETBITSHIGH(thumbH_word1[0], 1, 51);
	c = GETBITSHIGH(thumbH_word1[0], 1, 49);
	d = GETBITSHIGH(thumbH_word1[0], 1, 48);
	// The following bit abcd bit sequences should be padded with ones: 0111, 1010, 1011, 1101, 1110, 1111
	// The following logical expression checks for the presence of any of those:
	bit = (a & c) | ((!a ? 1 : 0) & b & c & d) | (a & b & (!c ? 1 : 0) & d);
	bits = 0xf * bit;
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], bits, 3, 55);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], !bit ? 1 : 0, 1, 50);

	// Set diffbit
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], 1, 1, 33);
	thumbH_word2[0] = thumbH58_word2;

}

// copy of above, but diffbit is 0
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function stuff58bitsDiffFalse(thumbH58_word1: number, thumbH58_word2: number, thumbH_word1: Uint32Array, thumbH_word2: Uint32Array) {
	var part0, part1, part2, part3;
	var bit, a, b, c, d, bits;

	// move parts
	part0 = GETBITSHIGH(thumbH58_word1, 7, 57);
	part1 = GETBITSHIGH(thumbH58_word1, 2, 50);
	part2 = GETBITSHIGH(thumbH58_word1, 16, 48);
	part3 = GETBITSHIGH(thumbH58_word1, 1, 32);
	thumbH_word1[0] = 0;
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part0, 7, 62);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part1, 2, 52);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part2, 16, 49);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], part3, 1, 32);

	// Make sure that red does not overflow:
	bit = GETBITSHIGH(thumbH_word1[0], 1, 62);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], !bit ? 1 : 0, 1, 63);

	// Make sure that green overflows:
	a = GETBITSHIGH(thumbH_word1[0], 1, 52);
	b = GETBITSHIGH(thumbH_word1[0], 1, 51);
	c = GETBITSHIGH(thumbH_word1[0], 1, 49);
	d = GETBITSHIGH(thumbH_word1[0], 1, 48);
	// The following bit abcd bit sequences should be padded with ones: 0111, 1010, 1011, 1101, 1110, 1111
	// The following logical expression checks for the presence of any of those:
	bit = (a & c) | ((!a ? 1 : 0) & b & c & d) | (a & b & (!c ? 1 : 0) & d);
	bits = 0xf * bit;
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], bits, 3, 55);
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], !bit ? 1 : 0, 1, 50);

	// Set diffbit
	thumbH_word1[0] = PUTBITSHIGH(thumbH_word1[0], 0, 1, 33);
	thumbH_word2[0] = thumbH58_word2;

}

// During search it is not convenient to store the bits the way they are stored in the 
// file format. Hence, after search, it is converted to this format.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function stuff59bits(thumbT59_word1: number, thumbT59_word2: number, thumbT_word1: Uint32Array, thumbT_word2: Uint32Array) {
	// Put bits in twotimer configuration for 59 (red overflows)
	// 
	// Go from this bit layout:
	//
	//     |63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
	//     |----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |----------------------------------------index bits---------------------------------------------|
	//
	//
	//  To this:
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     |// // //|R0a  |//|R0b  |G0         |B0         |R1         |G1         |B1          |da  |df|db|
	//      -----------------------------------------------------------------------------------------------
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |----------------------------------------index bits---------------------------------------------|
	//
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |df|fp|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bt|bt|
	//      ------------------------------------------------------------------------------------------------

	var R0a;
	var bit, a, b, c, d, bits;

	R0a = GETBITSHIGH(thumbT59_word1, 2, 58);

	// Fix middle part
	thumbT_word1[0] = thumbT59_word1 << 1;
	// Fix R0a (top two bits of R0)
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], R0a, 2, 60);
	// Fix db (lowest bit of d)
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], thumbT59_word1, 1, 32);
	// 
	// Make sure that red overflows:
	a = GETBITSHIGH(thumbT_word1[0], 1, 60);
	b = GETBITSHIGH(thumbT_word1[0], 1, 59);
	c = GETBITSHIGH(thumbT_word1[0], 1, 57);
	d = GETBITSHIGH(thumbT_word1[0], 1, 56);
	// The following bit abcd bit sequences should be padded with ones: 0111, 1010, 1011, 1101, 1110, 1111
	// The following logical expression checks for the presence of any of those:
	bit = (a & c) | ((!a ? 1 : 0) & b & c & d) | (a & b & (!c ? 1 : 0) & d);
	bits = 0xf * bit;
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], bits, 3, 63);
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], !bit ? 1 : 0, 1, 58);

	// Set diffbit
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], 1, 1, 33);
	thumbT_word2[0] = thumbT59_word2;
}


// Decompress the planar mode and calculate the error per component compared to original image.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function decompressBlockPlanar57errorPerComponent(compressed57_1: number, compressed57_2: number, img: uint8, width: number, height: number, startx: number, starty: number, srcimg: uint8, error_red: Uint32Array, error_green: Uint32Array, error_blue: Uint32Array) {
	var colorO = new Uint8Array(3), colorH = new Uint8Array(3), colorV = new Uint8Array(3);

	colorO[0] = GETBITSHIGH(compressed57_1, 6, 63);
	colorO[1] = GETBITSHIGH(compressed57_1, 7, 57);
	colorO[2] = GETBITSHIGH(compressed57_1, 6, 50);
	colorH[0] = GETBITSHIGH(compressed57_1, 6, 44);
	colorH[1] = GETBITSHIGH(compressed57_1, 7, 38);
	colorH[2] = GETBITS(compressed57_2, 6, 31);
	colorV[0] = GETBITS(compressed57_2, 6, 25);
	colorV[1] = GETBITS(compressed57_2, 7, 19);
	colorV[2] = GETBITS(compressed57_2, 6, 12);

	colorO[0] = (colorO[0] << 2) | (colorO[0] >> 4);
	colorO[1] = (colorO[1] << 1) | (colorO[1] >> 6);
	colorO[2] = (colorO[2] << 2) | (colorO[2] >> 4);

	colorH[0] = (colorH[0] << 2) | (colorH[0] >> 4);
	colorH[1] = (colorH[1] << 1) | (colorH[1] >> 6);
	colorH[2] = (colorH[2] << 2) | (colorH[2] >> 4);

	colorV[0] = (colorV[0] << 2) | (colorV[0] >> 4);
	colorV[1] = (colorV[1] << 1) | (colorV[1] >> 6);
	colorV[2] = (colorV[2] << 2) | (colorV[2] >> 4);

	let xx, yy;

	for (xx = 0; xx < 4; xx++) {
		for (yy = 0; yy < 4; yy++) {
			img[3 * width * (starty + yy) + 3 * (startx + xx) + 0] = CLAMP(0, JAS_ROUND((xx * (colorH[0] - colorO[0]) / 4.0 + yy * (colorV[0] - colorO[0]) / 4.0 + colorO[0])), 255);
			img[3 * width * (starty + yy) + 3 * (startx + xx) + 1] = CLAMP(0, JAS_ROUND((xx * (colorH[1] - colorO[1]) / 4.0 + yy * (colorV[1] - colorO[1]) / 4.0 + colorO[1])), 255);
			img[3 * width * (starty + yy) + 3 * (startx + xx) + 2] = CLAMP(0, JAS_ROUND((xx * (colorH[2] - colorO[2]) / 4.0 + yy * (colorV[2] - colorO[2]) / 4.0 + colorO[2])), 255);
		}
	}

	error_red[0] = 0;
	error_green[0] = 0;
	error_blue[0] = 0;
	for (xx = 0; xx < 4; xx++) {
		for (yy = 0; yy < 4; yy++) {
			error_red[0] = error_red[0] + SQUARE(srcimg[3 * width * (starty + yy) + 3 * (startx + xx) + 0] - img[3 * width * (starty + yy) + 3 * (startx + xx) + 0]);
			error_green[0] = error_green[0] + SQUARE(srcimg[3 * width * (starty + yy) + 3 * (startx + xx) + 1] - img[3 * width * (starty + yy) + 3 * (startx + xx) + 1]);
			error_blue[0] = error_blue[0] + SQUARE(srcimg[3 * width * (starty + yy) + 3 * (startx + xx) + 2] - img[3 * width * (starty + yy) + 3 * (startx + xx) + 2]);

		}
	}
}

// Compress using both individual and differential mode in ETC1/ETC2 using combined color 
// quantization. Both flip modes are tried. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipCombined(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var compressed1_norm = new Uint32Array(1), compressed2_norm = new Uint32Array(1);
	var compressed1_flip = new Uint32Array(1), compressed2_flip = new Uint32Array(1);
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	var best_table_indices1 = new Uint32Array(1), best_table_indices2 = new Uint32Array(1);
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	var eps;

	var dummy = new Uint8Array(3);

	quantize555ColorCombined(avg_color_float1, enc_color1, dummy);
	quantize555ColorCombined(avg_color_float2, enc_color2, dummy);

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		//     ETC1_RGB8_OES:
		// 
		//     a) bit layout in bits 63 through 32 if diffbit = 0
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		//     
		//     b) bit layout in bits 63 through 32 if diffbit = 1
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
		//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		// 
		//     c) bit layout in bits 31 through 0 (in both cases)
		// 
		//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
		//      --------------------------------------------------------------------------------------------------
		//     |       most significant pixel index bits       |         least significant pixel index bits       |  
		//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
		//      --------------------------------------------------------------------------------------------------      

		compressed1_norm[0] = 0;
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diffbit, 1, 33);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[0], 5, 63);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[1], 5, 55);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[2], 5, 47);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[0], 3, 58);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[1], 3, 50);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		norm_err = 0;

		// left part of block
		norm_err = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table1[0], 3, 39);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table2[0], 3, 36);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], 0, 1, 32);

		compressed2_norm[0] = 0;
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_LSB[0]), 8, 15);

	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.

		eps = 0.0001;

		var dummy = new Uint8Array(3);
		quantize444ColorCombined(avg_color_float1, enc_color1, dummy);
		quantize444ColorCombined(avg_color_float2, enc_color2, dummy);

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];


		// Pack bits into the first word. 

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		compressed1_norm[0] = 0;
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diffbit, 1, 33);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[0], 4, 63);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[1], 4, 55);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[2], 4, 47);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[0], 4, 59);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[1], 4, 51);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// left part of block
		norm_err = tryalltables_3bittable2x4(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table1[0], 3, 39);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table2[0], 3, 36);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], 0, 1, 32);

		compressed2_norm[0] = 0;
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}

	// Now try flipped blocks 4x2:

	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	quantize555ColorCombined(avg_color_float1, enc_color1, dummy);
	quantize555ColorCombined(avg_color_float2, enc_color2, dummy);

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		compressed1_flip[0] = 0;
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diffbit, 1, 33);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[0], 5, 63);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[1], 5, 55);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[2], 5, 47);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[0], 3, 58);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[1], 3, 50);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table1[0], 3, 39);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table2[0], 3, 36);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.
		eps = 0.0001;

		var dummy = new Uint8Array(3);
		quantize444ColorCombined(avg_color_float1, enc_color1, dummy);
		quantize444ColorCombined(avg_color_float2, enc_color2, dummy);

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------


		// Pack bits into the first word. 
		compressed1_flip[0] = 0;
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diffbit, 1, 33);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[0], 4, 63);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[1], 4, 55);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[2], 4, 47);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[0], 4, 59);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[1], 4, 51);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table1[0], 3, 39);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table2[0], 3, 36);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	// Now lets see which is the best table to use. Only 8 tables are possible. 

	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm[0] | 0;
		compressed2[0] = compressed2_norm[0];
	}
	else {
		compressed1[0] = compressed1_flip[0] | 1;
		compressed2[0] = compressed2_flip[0];
	}
}

// Calculation of the two block colors using the LBG-algorithm
// The following method scales down the intensity, since this can be compensated for anyway by both the H and T mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeColorLBGHalfIntensityFast(img: uint8, width: number, startx: number, starty: number, LBG_colors: Uint8Array[]) {
	var block_mask = Array.from({ length: 4 }, () => new Uint8Array(3));

	// reset rand so that we get predictable output per block
	const mt = new rng(10000);
	//LBG-algorithm
	var D = 0, oldD, bestD = MAXIMUM_ERROR, eps = 0.0000000001;
	var error_a, error_b;
	var number_of_iterations = 10;
	var t_color = Array.from({ length: 2 }, () => new Float64Array(3));
	var original_colors = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Float64Array(3)));
	var current_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var best_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var max_v = new Float64Array(3);
	var min_v = new Float64Array(3);
	var x, y, i;
	var red, green, blue;
	var continue_seeding: boolean;
	var maximum_number_of_seedings = 10;
	var seeding;
	var continue_iterate: boolean;

	max_v[R] = -512.0; max_v[G] = -512.0; max_v[B] = -512.0;
	min_v[R] = 512.0; min_v[G] = 512.0; min_v[B] = 512.0;

	// resolve trainingdata
	for (y = 0; y < BLOCKHEIGHT; ++y) {
		for (x = 0; x < BLOCKWIDTH; ++x) {
			red = img[3 * ((starty + y) * width + startx + x) + R];
			green = img[3 * ((starty + y) * width + startx + x) + G];
			blue = img[3 * ((starty + y) * width + startx + x) + B];

			// Use qrs representation instead of rgb
			// qrs = Q * rgb where Q = [a a a ; b -b 0 ; c c -2c]; a = 1/sqrt(3), b= 1/sqrt(2), c = 1/sqrt(6);
			// rgb = inv(Q)*qrs  = Q' * qrs where ' denotes transpose.
			// The q variable holds intensity. r and s hold chrominance.
			// q = [0, sqrt(3)*255], r = [-255/sqrt(2), 255/sqrt(2)], s = [-2*255/sqrt(6), 2*255/sqrt(6)];
			//
			// The LGB algorithm will only act on the r and s variables and not on q.
			// 
			original_colors[x][y][R] = (1.0 / Math.sqrt(1.0 * 3)) * red + (1.0 / Math.sqrt(1.0 * 3)) * green + (1.0 / Math.sqrt(1.0 * 3)) * blue;
			original_colors[x][y][G] = (1.0 / Math.sqrt(1.0 * 2)) * red - (1.0 / Math.sqrt(1.0 * 2)) * green;
			original_colors[x][y][B] = (1.0 / Math.sqrt(1.0 * 6)) * red + (1.0 / Math.sqrt(1.0 * 6)) * green - (2.0 / Math.sqrt(1.0 * 6)) * blue;

			// find max
			if (original_colors[x][y][R] > max_v[R]) max_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] > max_v[G]) max_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] > max_v[B]) max_v[B] = original_colors[x][y][B];
			// find min
			if (original_colors[x][y][R] < min_v[R]) min_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] < min_v[G]) min_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] < min_v[B]) min_v[B] = original_colors[x][y][B];
		}
	}

	D = 512 * 512 * 3 * 16.0;
	bestD = 512 * 512 * 3 * 16.0;

	continue_seeding = true;

	// loop seeds
	for (seeding = 0; (seeding < maximum_number_of_seedings) && continue_seeding; seeding++) {
		// hopefully we will not need more seedings:
		continue_seeding = false;

		// calculate seeds
		for (let s = 0; s < 2; ++s) {
			for (let c = 0; c < 3; ++c) {
				current_colors[s][c] = (mt.rand() / RAND_MAX) * (max_v[c] - min_v[c]) + min_v[c];
			}
		}

		// divide into two quantization sets and calculate distortion

		continue_iterate = true;
		for (i = 0; (i < number_of_iterations) && continue_iterate; i++) {
			oldD = D;
			D = 0;
			var n = 0;
			for (y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					error_a = 0.5 * SQUARE(original_colors[x][y][R] - current_colors[0][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[0][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[0][B]);
					error_b = 0.5 * SQUARE(original_colors[x][y][R] - current_colors[1][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[1][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[1][B]);
					if (error_a < error_b) {
						block_mask[x][y] = 0;
						D += error_a;
						++n;
					}
					else {
						block_mask[x][y] = 1;
						D += error_b;
					}
				}
			}

			// compare with old distortion
			if (D == 0) {
				// Perfect score -- we dont need to go further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D == oldD) {
				// Same score as last round -- no need to go for further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D < bestD) {
				bestD = D;
				for (let s = 0; s < 2; ++s) {
					for (let c = 0; c < 3; ++c) {
						best_colors[s][c] = current_colors[s][c];
					}
				}
			}
			if (n == 0 || n == BLOCKWIDTH * BLOCKHEIGHT) {
				// All colors end up in the same voroni region. We need to reseed.
				continue_iterate = false;
				continue_seeding = true;
			}
			else {
				// Calculate new reconstruction points using the centroids

				// Find new construction values from average
				t_color[0][R] = 0;
				t_color[0][G] = 0;
				t_color[0][B] = 0;
				t_color[1][R] = 0;
				t_color[1][G] = 0;
				t_color[1][B] = 0;

				for (y = 0; y < BLOCKHEIGHT; ++y) {
					for (let x = 0; x < BLOCKWIDTH; ++x) {
						// use dummy value for q-parameter
						t_color[block_mask[x][y]][R] += original_colors[x][y][R];
						t_color[block_mask[x][y]][G] += original_colors[x][y][G];
						t_color[block_mask[x][y]][B] += original_colors[x][y][B];
					}
				}
				current_colors[0][R] = t_color[0][R] / n;
				current_colors[1][R] = t_color[1][R] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][G] = t_color[0][G] / n;
				current_colors[1][G] = t_color[1][G] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][B] = t_color[0][B] / n;
				current_colors[1][B] = t_color[1][B] / (BLOCKWIDTH * BLOCKHEIGHT - n);
			}
		}
	}

	for (x = 0; x < 2; x++) {
		var qq, rr, ss;

		qq = best_colors[x][0];
		rr = best_colors[x][1];
		ss = best_colors[x][2];

		current_colors[x][0] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][1] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq - (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][2] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (0.0) * rr - (2.0 / Math.sqrt(1.0 * 6)) * ss, 255);
	}

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			LBG_colors[x][y] = JAS_ROUND(current_colors[x][y]);
}

// Calculation of the two block colors using the LBG-algorithm
// The following method scales down the intensity, since this can be compensated for anyway by both the H and T mode.
// Faster version
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeColorLBGNotIntensityFast(img: uint8, width: number, startx: number, starty: number, LBG_colors: Uint8Array[]) {
	var block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));

	// reset rand so that we get predictable output per block
	const mt = new rng(10000);
	//LBG-algorithm
	var D = 0, oldD, bestD = MAXIMUM_ERROR, eps = 0.0000000001;
	var error_a, error_b;
	var number_of_iterations = 10;
	var t_color = Array.from({ length: 2 }, () => new Float64Array(3));
	var original_colors = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Float64Array(3)));
	var current_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var best_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var max_v = new Float64Array(3);
	var min_v = new Float64Array(3);
	var x, y, i;
	var red, green, blue;
	var continue_seeding: boolean;
	var maximum_number_of_seedings = 10;
	var seeding;
	var continue_iterate: boolean;

	max_v[R] = -512.0; max_v[G] = -512.0; max_v[B] = -512.0;
	min_v[R] = 512.0; min_v[G] = 512.0; min_v[B] = 512.0;

	// resolve trainingdata
	for (y = 0; y < BLOCKHEIGHT; ++y) {
		for (x = 0; x < BLOCKWIDTH; ++x) {
			red = img[3 * ((starty + y) * width + startx + x) + R];
			green = img[3 * ((starty + y) * width + startx + x) + G];
			blue = img[3 * ((starty + y) * width + startx + x) + B];

			// Use qrs representation instead of rgb
			// qrs = Q * rgb where Q = [a a a ; b -b 0 ; c c -2c]; a = 1/sqrt(1.0*3), b= 1/sqrt(1.0*2), c = 1/sqrt(1.0*6);
			// rgb = inv(Q)*qrs  = Q' * qrs where ' denotes transpose.
			// The q variable holds intensity. r and s hold chrominance.
			// q = [0, sqrt(1.0*3)*255], r = [-255/sqrt(1.0*2), 255/sqrt(1.0*2)], s = [-2*255/sqrt(1.0*6), 2*255/sqrt(1.0*6)];
			//
			// The LGB algorithm will only act on the r and s variables and not on q.
			// 
			original_colors[x][y][R] = (1.0 / Math.sqrt(1.0 * 3)) * red + (1.0 / Math.sqrt(1.0 * 3)) * green + (1.0 / Math.sqrt(1.0 * 3)) * blue;
			original_colors[x][y][G] = (1.0 / Math.sqrt(1.0 * 2)) * red - (1.0 / Math.sqrt(1.0 * 2)) * green;
			original_colors[x][y][B] = (1.0 / Math.sqrt(1.0 * 6)) * red + (1.0 / Math.sqrt(1.0 * 6)) * green - (2.0 / Math.sqrt(1.0 * 6)) * blue;

			// find max
			if (original_colors[x][y][R] > max_v[R]) max_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] > max_v[G]) max_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] > max_v[B]) max_v[B] = original_colors[x][y][B];
			// find min
			if (original_colors[x][y][R] < min_v[R]) min_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] < min_v[G]) min_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] < min_v[B]) min_v[B] = original_colors[x][y][B];
		}
	}

	D = 512 * 512 * 3 * 16.0;
	bestD = 512 * 512 * 3 * 16.0;

	continue_seeding = true;

	// loop seeds
	for (seeding = 0; (seeding < maximum_number_of_seedings) && continue_seeding; seeding++) {
		// hopefully we will not need more seedings:
		continue_seeding = false;

		// calculate seeds
		for (let s = 0; s < 2; ++s) {
			for (let c = 0; c < 3; ++c) {
				current_colors[s][c] = (mt.rand() / RAND_MAX) * (max_v[c] - min_v[c]) + min_v[c];
			}
		}
		// divide into two quantization sets and calculate distortion

		continue_iterate = true;
		for (i = 0; (i < number_of_iterations) && continue_iterate; i++) {
			oldD = D;
			D = 0;
			var n = 0;
			for (y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					error_a = 0.0 * SQUARE(original_colors[x][y][R] - current_colors[0][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[0][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[0][B]);
					error_b = 0.0 * SQUARE(original_colors[x][y][R] - current_colors[1][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[1][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[1][B]);
					if (error_a < error_b) {
						block_mask[x][y] = 0;
						D += error_a;
						++n;
					}
					else {
						block_mask[x][y] = 1;
						D += error_b;
					}
				}
			}

			// compare with old distortion
			if (D == 0) {
				// Perfect score -- we dont need to go further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D == oldD) {
				// Same score as last round -- no need to go for further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D < bestD) {
				bestD = D;
				for (let s = 0; s < 2; ++s) {
					for (let c = 0; c < 3; ++c) {
						best_colors[s][c] = current_colors[s][c];
					}
				}
			}
			if (n == 0 || n == BLOCKWIDTH * BLOCKHEIGHT) {
				// All colors end up in the same voroni region. We need to reseed.
				continue_iterate = false;
				continue_seeding = true;
			}
			else {
				// Calculate new reconstruction points using the centroids

				// Find new construction values from average
				t_color[0][R] = 0;
				t_color[0][G] = 0;
				t_color[0][B] = 0;
				t_color[1][R] = 0;
				t_color[1][G] = 0;
				t_color[1][B] = 0;

				for (y = 0; y < BLOCKHEIGHT; ++y) {
					for (let x = 0; x < BLOCKWIDTH; ++x) {
						// use dummy value for q-parameter
						t_color[block_mask[x][y]][R] += original_colors[x][y][R];
						t_color[block_mask[x][y]][G] += original_colors[x][y][G];
						t_color[block_mask[x][y]][B] += original_colors[x][y][B];
					}
				}
				current_colors[0][R] = t_color[0][R] / n;
				current_colors[1][R] = t_color[1][R] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][G] = t_color[0][G] / n;
				current_colors[1][G] = t_color[1][G] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][B] = t_color[0][B] / n;
				current_colors[1][B] = t_color[1][B] / (BLOCKWIDTH * BLOCKHEIGHT - n);
			}
		}
	}

	for (x = 0; x < 2; x++) {
		var qq, rr, ss;

		qq = best_colors[x][0];
		rr = best_colors[x][1];
		ss = best_colors[x][2];

		current_colors[x][0] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][1] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq - (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][2] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (0.0) * rr - (2.0 / Math.sqrt(1.0 * 6)) * ss, 255);
	}

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			LBG_colors[x][y] = JAS_ROUND(current_colors[x][y]);
}

// Calculation of the two block colors using the LBG-algorithm
// The following method completely ignores the intensity, since this can be compensated for anyway by both the H and T mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeColorLBGNotIntensity(img: uint8, width: number, startx: number, starty: number, LBG_colors: Uint8Array[]) {
	var block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));

	// reset rand so that we get predictable output per block
	const mt = new rng(10000);
	//LBG-algorithm
	var D = 0, oldD, bestD = MAXIMUM_ERROR, eps = 0.0000000001;
	var error_a, error_b;
	var number_of_iterations = 10;
	var t_color = Array.from({ length: 2 }, () => new Float64Array(3));
	var original_colors = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Float64Array(3)));
	var current_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var best_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var max_v = new Float64Array(3);
	var min_v = new Float64Array(3);
	var x, y, i;
	var red, green, blue;
	var continue_seeding: boolean;
	var maximum_number_of_seedings = 10;
	var seeding;
	var continue_iterate: boolean;

	max_v[R] = -512.0; max_v[G] = -512.0; max_v[B] = -512.0;
	min_v[R] = 512.0; min_v[G] = 512.0; min_v[B] = 512.0;

	// resolve trainingdata
	for (y = 0; y < BLOCKHEIGHT; ++y) {
		for (x = 0; x < BLOCKWIDTH; ++x) {
			red = img[3 * ((starty + y) * width + startx + x) + R];
			green = img[3 * ((starty + y) * width + startx + x) + G];
			blue = img[3 * ((starty + y) * width + startx + x) + B];

			// Use qrs representation instead of rgb
			// qrs = Q * rgb where Q = [a a a ; b -b 0 ; c c -2c]; a = 1/sqrt(1.0*3), b= 1/sqrt(1.0*2), c = 1/sqrt(1.0*6);
			// rgb = inv(Q)*qrs  = Q' * qrs where ' denotes transpose.
			// The q variable holds intensity. r and s hold chrominance.
			// q = [0, sqrt(1.0*3)*255], r = [-255/sqrt(1.0*2), 255/sqrt(1.0*2)], s = [-2*255/sqrt(1.0*6), 2*255/sqrt(1.0*6)];
			//
			// The LGB algorithm will only act on the r and s variables and not on q.
			// 
			original_colors[x][y][R] = (1.0 / Math.sqrt(1.0 * 3)) * red + (1.0 / Math.sqrt(1.0 * 3)) * green + (1.0 / Math.sqrt(1.0 * 3)) * blue;
			original_colors[x][y][G] = (1.0 / Math.sqrt(1.0 * 2)) * red - (1.0 / Math.sqrt(1.0 * 2)) * green;
			original_colors[x][y][B] = (1.0 / Math.sqrt(1.0 * 6)) * red + (1.0 / Math.sqrt(1.0 * 6)) * green - (2.0 / Math.sqrt(1.0 * 6)) * blue;

			// find max
			if (original_colors[x][y][R] > max_v[R]) max_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] > max_v[G]) max_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] > max_v[B]) max_v[B] = original_colors[x][y][B];
			// find min
			if (original_colors[x][y][R] < min_v[R]) min_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] < min_v[G]) min_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] < min_v[B]) min_v[B] = original_colors[x][y][B];
		}
	}

	D = 512 * 512 * 3 * 16.0;
	bestD = 512 * 512 * 3 * 16.0;

	continue_seeding = true;

	// loop seeds
	for (seeding = 0; (seeding < maximum_number_of_seedings) && continue_seeding; seeding++) {
		// hopefully we will not need more seedings:
		continue_seeding = false;

		// calculate seeds
		for (let s = 0; s < 2; ++s) {
			for (let c = 0; c < 3; ++c) {
				current_colors[s][c] = (mt.rand() / RAND_MAX) * (max_v[c] - min_v[c]) + min_v[c];
			}
		}

		// divide into two quantization sets and calculate distortion

		continue_iterate = true;
		for (i = 0; (i < number_of_iterations) && continue_iterate; i++) {
			oldD = D;
			D = 0;
			var n = 0;
			for (y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					error_a = 0.0 * SQUARE(original_colors[x][y][R] - current_colors[0][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[0][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[0][B]);
					error_b = 0.0 * SQUARE(original_colors[x][y][R] - current_colors[1][R]) +
						SQUARE(original_colors[x][y][G] - current_colors[1][G]) +
						SQUARE(original_colors[x][y][B] - current_colors[1][B]);
					if (error_a < error_b) {
						block_mask[x][y] = 0;
						D += error_a;
						++n;
					}
					else {
						block_mask[x][y] = 1;
						D += error_b;
					}
				}
			}

			// compare with old distortion
			if (D == 0) {
				// Perfect score -- we dont need to go further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D == oldD) {
				// Same score as last round -- no need to go for further iterations.
				continue_iterate = false;
				continue_seeding = true;
			}
			if (D < bestD) {
				bestD = D;
				for (let s = 0; s < 2; ++s) {
					for (let c = 0; c < 3; ++c) {
						best_colors[s][c] = current_colors[s][c];
					}
				}
			}
			if (n == 0 || n == BLOCKWIDTH * BLOCKHEIGHT) {
				// All colors end up in the same voroni region. We need to reseed.
				continue_iterate = false;
				continue_seeding = true;
			}
			else {
				// Calculate new reconstruction points using the centroids

				// Find new construction values from average
				t_color[0][R] = 0;
				t_color[0][G] = 0;
				t_color[0][B] = 0;
				t_color[1][R] = 0;
				t_color[1][G] = 0;
				t_color[1][B] = 0;

				for (y = 0; y < BLOCKHEIGHT; ++y) {
					for (let x = 0; x < BLOCKWIDTH; ++x) {
						// use dummy value for q-parameter
						t_color[block_mask[x][y]][R] += original_colors[x][y][R];
						t_color[block_mask[x][y]][G] += original_colors[x][y][G];
						t_color[block_mask[x][y]][B] += original_colors[x][y][B];
					}
				}
				current_colors[0][R] = t_color[0][R] / n;
				current_colors[1][R] = t_color[1][R] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][G] = t_color[0][G] / n;
				current_colors[1][G] = t_color[1][G] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][B] = t_color[0][B] / n;
				current_colors[1][B] = t_color[1][B] / (BLOCKWIDTH * BLOCKHEIGHT - n);
			}
		}
	}

	for (x = 0; x < 2; x++) {
		var qq, rr, ss;

		qq = best_colors[x][0];
		rr = best_colors[x][1];
		ss = best_colors[x][2];

		current_colors[x][0] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][1] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq - (1.0 / Math.sqrt(1.0 * 2)) * rr + (1.0 / Math.sqrt(1.0 * 6)) * ss, 255);
		current_colors[x][2] = CLAMP(0, (1.0 / Math.sqrt(1.0 * 3)) * qq + (0.0) * rr - (2.0 / Math.sqrt(1.0 * 6)) * ss, 255);
	}

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			LBG_colors[x][y] = JAS_ROUND(current_colors[x][y]);
}


// Calculation of the two block colors using the LBG-algorithm
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeColorLBG(img: uint8, width: number, startx: number, starty: number, LBG_colors: Uint8Array[]) {
	var block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));

	// reset rand so that we get predictable output per block
	const mt = new rng(10000);
	//LBG-algorithm
	var D = 0, oldD, bestD = MAXIMUM_ERROR, eps = 0.0000000001;
	var error_a, error_b;
	var number_of_iterations = 10;
	var t_color = Array.from({ length: 2 }, () => new Float64Array(3));
	var original_colors = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Float64Array(3)));
	var current_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var best_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var max_v = new Float64Array(3);
	var min_v = new Float64Array(3);
	var x, y, i;
	var red, green, blue;
	var continue_seeding: boolean;
	var maximum_number_of_seedings = 10;
	var seeding;
	var continue_iterate: boolean;

	max_v[R] = -512.0; max_v[G] = -512.0; max_v[B] = -512.0;
	min_v[R] = 512.0; min_v[G] = 512.0; min_v[B] = 512.0;

	// resolve trainingdata
	for (y = 0; y < BLOCKHEIGHT; ++y) {
		for (x = 0; x < BLOCKWIDTH; ++x) {
			red = img[3 * ((starty + y) * width + startx + x) + R];
			green = img[3 * ((starty + y) * width + startx + x) + G];
			blue = img[3 * ((starty + y) * width + startx + x) + B];

			original_colors[x][y][R] = red;
			original_colors[x][y][G] = green;
			original_colors[x][y][B] = blue;

			// find max
			if (original_colors[x][y][R] > max_v[R]) max_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] > max_v[G]) max_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] > max_v[B]) max_v[B] = original_colors[x][y][B];
			// find min
			if (original_colors[x][y][R] < min_v[R]) min_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] < min_v[G]) min_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] < min_v[B]) min_v[B] = original_colors[x][y][B];
		}
	}

	D = 512 * 512 * 3 * 16.0;
	bestD = 512 * 512 * 3 * 16.0;

	continue_seeding = true;

	// loop seeds
	for (seeding = 0; (seeding < maximum_number_of_seedings) && continue_seeding; seeding++) {
		// hopefully we will not need more seedings:
		continue_seeding = false;

		// calculate seeds
		for (let s = 0; s < 2; ++s) {
			for (let c = 0; c < 3; ++c) {
				current_colors[s][c] = (mt.rand() / RAND_MAX) * (max_v[c] - min_v[c]) + min_v[c];
			}
		}

		// divide into two quantization sets and calculate distortion

		continue_iterate = true;
		for (i = 0; (i < number_of_iterations) && continue_iterate; i++) {
			oldD = D;
			D = 0;
			var n = 0;
			for (y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					error_a = SQUARE(original_colors[x][y][R] - JAS_ROUND(current_colors[0][R])) +
						SQUARE(original_colors[x][y][G] - JAS_ROUND(current_colors[0][G])) +
						SQUARE(original_colors[x][y][B] - JAS_ROUND(current_colors[0][B]));
					error_b = SQUARE(original_colors[x][y][R] - JAS_ROUND(current_colors[1][R])) +
						SQUARE(original_colors[x][y][G] - JAS_ROUND(current_colors[1][G])) +
						SQUARE(original_colors[x][y][B] - JAS_ROUND(current_colors[1][B]));
					if (error_a < error_b) {
						block_mask[x][y] = 0;
						D += error_a;
						++n;
					}
					else {
						block_mask[x][y] = 1;
						D += error_b;
					}
				}
			}

			// compare with old distortion
			if (D == 0) {
				// Perfect score -- we dont need to go further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D == oldD) {
				// Same score as last round -- no need to go for further iterations.
				continue_iterate = false;
				continue_seeding = true;
			}
			if (D < bestD) {
				bestD = D;
				for (let s = 0; s < 2; ++s) {
					for (let c = 0; c < 3; ++c) {
						best_colors[s][c] = current_colors[s][c];
					}
				}
			}
			if (n == 0 || n == BLOCKWIDTH * BLOCKHEIGHT) {
				// All colors end up in the same voroni region. We need to reseed.
				continue_iterate = false;
				continue_seeding = true;
			}
			else {
				// Calculate new reconstruction points using the centroids

				// Find new construction values from average
				t_color[0][R] = 0;
				t_color[0][G] = 0;
				t_color[0][B] = 0;
				t_color[1][R] = 0;
				t_color[1][G] = 0;
				t_color[1][B] = 0;

				for (y = 0; y < BLOCKHEIGHT; ++y) {
					for (let x = 0; x < BLOCKWIDTH; ++x) {
						// use dummy value for q-parameter
						t_color[block_mask[x][y]][R] += original_colors[x][y][R];
						t_color[block_mask[x][y]][G] += original_colors[x][y][G];
						t_color[block_mask[x][y]][B] += original_colors[x][y][B];
					}
				}
				current_colors[0][R] = t_color[0][R] / n;
				current_colors[1][R] = t_color[1][R] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][G] = t_color[0][G] / n;
				current_colors[1][G] = t_color[1][G] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][B] = t_color[0][B] / n;
				current_colors[1][B] = t_color[1][B] / (BLOCKWIDTH * BLOCKHEIGHT - n);
			}
		}
	}

	// Set the best colors as the final block colors
	for (let s = 0; s < 2; ++s) {
		for (let c = 0; c < 3; ++c) {
			current_colors[s][c] = best_colors[s][c];
		}
	}

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			LBG_colors[x][y] = JAS_ROUND(current_colors[x][y]);
}

// Calculation of the two block colors using the LBG-algorithm
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function computeColorLBGfast(img: uint8, width: number, startx: number, starty: number, LBG_colors: Uint8Array[]) {
	var block_mask = Array.from({ length: 4 }, () => new Uint8Array(4));

	// reset rand so that we get predictable output per block
	const mt = new rng(10000);
	//LBG-algorithm
	var D = 0, oldD, bestD = MAXIMUM_ERROR, eps = 0.0000000001;
	var error_a, error_b;
	var number_of_iterations = 10;
	var t_color = Array.from({ length: 2 }, () => new Float64Array(3));
	var original_colors = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Uint8Array(3)));
	var current_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var best_colors = Array.from({ length: 2 }, () => new Float64Array(3));
	var max_v = new Float64Array(3);
	var min_v = new Float64Array(3);
	var x, y, i;
	var continue_seeding: boolean;
	var maximum_number_of_seedings = 10;
	var seeding;
	var continue_iterate: boolean;

	max_v[R] = -512.0; max_v[G] = -512.0; max_v[B] = -512.0;
	min_v[R] = 512.0; min_v[G] = 512.0; min_v[B] = 512.0;

	// resolve trainingdata
	for (y = 0; y < BLOCKHEIGHT; ++y) {
		for (x = 0; x < BLOCKWIDTH; ++x) {
			original_colors[x][y][R] = img[3 * ((starty + y) * width + startx + x) + R];
			original_colors[x][y][G] = img[3 * ((starty + y) * width + startx + x) + G];
			original_colors[x][y][B] = img[3 * ((starty + y) * width + startx + x) + B];

			// find max
			if (original_colors[x][y][R] > max_v[R]) max_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] > max_v[G]) max_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] > max_v[B]) max_v[B] = original_colors[x][y][B];
			// find min
			if (original_colors[x][y][R] < min_v[R]) min_v[R] = original_colors[x][y][R];
			if (original_colors[x][y][G] < min_v[G]) min_v[G] = original_colors[x][y][G];
			if (original_colors[x][y][B] < min_v[B]) min_v[B] = original_colors[x][y][B];
		}
	}

	D = 512 * 512 * 3 * 16.0;
	bestD = 512 * 512 * 3 * 16.0;

	continue_seeding = true;

	// loop seeds
	for (seeding = 0; (seeding < maximum_number_of_seedings) && continue_seeding; seeding++) {
		// hopefully we will not need more seedings:
		continue_seeding = false;

		// calculate seeds
		for (let s = 0; s < 2; ++s) {
			for (let c = 0; c < 3; ++c) {
				current_colors[s][c] = (mt.rand() / RAND_MAX) * (max_v[c] - min_v[c]) + min_v[c];
			}
		}

		// divide into two quantization sets and calculate distortion
		continue_iterate = true;
		for (i = 0; (i < number_of_iterations) && continue_iterate; i++) {
			oldD = D;
			D = 0;
			var n = 0;
			for (y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					error_a = SQUARE(original_colors[x][y][R] - JAS_ROUND(current_colors[0][R])) +
						SQUARE(original_colors[x][y][G] - JAS_ROUND(current_colors[0][G])) +
						SQUARE(original_colors[x][y][B] - JAS_ROUND(current_colors[0][B]));
					error_b = SQUARE(original_colors[x][y][R] - JAS_ROUND(current_colors[1][R])) +
						SQUARE(original_colors[x][y][G] - JAS_ROUND(current_colors[1][G])) +
						SQUARE(original_colors[x][y][B] - JAS_ROUND(current_colors[1][B]));
					if (error_a < error_b) {
						block_mask[x][y] = 0;
						D += error_a;
						++n;
					}
					else {
						block_mask[x][y] = 1;
						D += error_b;
					}
				}
			}

			// compare with old distortion
			if (D == 0) {
				// Perfect score -- we dont need to go further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D == oldD) {
				// Same score as last round -- no need to go for further iterations.
				continue_iterate = false;
				continue_seeding = false;
			}
			if (D < bestD) {
				bestD = D;
				for (let s = 0; s < 2; ++s) {
					for (let c = 0; c < 3; ++c) {
						best_colors[s][c] = current_colors[s][c];
					}
				}
			}
			if (n == 0 || n == BLOCKWIDTH * BLOCKHEIGHT) {
				// All colors end up in the same voroni region. We need to reseed.
				continue_iterate = false;
				continue_seeding = true;
			}
			else {
				// Calculate new reconstruction points using the centroids

				// Find new construction values from average
				t_color[0][R] = 0;
				t_color[0][G] = 0;
				t_color[0][B] = 0;
				t_color[1][R] = 0;
				t_color[1][G] = 0;
				t_color[1][B] = 0;

				for (y = 0; y < BLOCKHEIGHT; ++y) {
					for (let x = 0; x < BLOCKWIDTH; ++x) {
						// use dummy value for q-parameter
						t_color[block_mask[x][y]][R] += original_colors[x][y][R];
						t_color[block_mask[x][y]][G] += original_colors[x][y][G];
						t_color[block_mask[x][y]][B] += original_colors[x][y][B];
					}
				}
				current_colors[0][R] = t_color[0][R] / n;
				current_colors[1][R] = t_color[1][R] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][G] = t_color[0][G] / n;
				current_colors[1][G] = t_color[1][G] / (BLOCKWIDTH * BLOCKHEIGHT - n);
				current_colors[0][B] = t_color[0][B] / n;
				current_colors[1][B] = t_color[1][B] / (BLOCKWIDTH * BLOCKHEIGHT - n);
			}
		}
	}

	// Set the best colors as the final block colors
	for (let s = 0; s < 2; ++s) {
		for (let c = 0; c < 3; ++c) {
			current_colors[s][c] = best_colors[s][c];
		}
	}

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			LBG_colors[x][y] = JAS_ROUND(current_colors[x][y]);
}

// Each color component is compressed to fit in its specified number of bits
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressColor(R_B: number, G_B: number, B_B: number, current_color: Uint8Array[], quantized_color: Uint8Array[]) {
	//
	//	The color is calculated as:
	//
	//  c = (c + (2^(8-b))/2) / (255 / (2^b - 1)) where b is the number of bits
	//                                            to code color c with
	//  For instance, if b = 3:
	//
	//  c = (c + 16) / (255 / 7) = 7 * (c + 16) / 255
	//

	quantized_color[0][R] = CLAMP(0, (BINPOW(R_B) - 1) * (current_color[0][R] + BINPOW(8 - R_B - 1)) / 255, 255);
	quantized_color[0][G] = CLAMP(0, (BINPOW(G_B) - 1) * (current_color[0][G] + BINPOW(8 - G_B - 1)) / 255, 255);
	quantized_color[0][B] = CLAMP(0, (BINPOW(B_B) - 1) * (current_color[0][B] + BINPOW(8 - B_B - 1)) / 255, 255);

	quantized_color[1][R] = CLAMP(0, (BINPOW(R_B) - 1) * (current_color[1][R] + BINPOW(8 - R_B - 1)) / 255, 255);
	quantized_color[1][G] = CLAMP(0, (BINPOW(G_B) - 1) * (current_color[1][G] + BINPOW(8 - G_B - 1)) / 255, 255);
	quantized_color[1][B] = CLAMP(0, (BINPOW(B_B) - 1) * (current_color[1][B] + BINPOW(8 - B_B - 1)) / 255, 255);
}

// Swapping two RGB-colors
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function swapColors(colors: Uint8Array[]) {
	var temp = colors[0][R];
	colors[0][R] = colors[1][R];
	colors[1][R] = temp;

	temp = colors[0][G];
	colors[0][G] = colors[1][G];
	colors[1][G] = temp;

	temp = colors[0][B];
	colors[0][B] = colors[1][B];
	colors[1][B] = temp;
}

// Calculate the paint colors from the block colors 
// using a distance d and one of the H- or T-patterns.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction are calculated as well
// 
// Please note that the function can change the order between the two colors in colorsRGB444
//
// In the 59T bit mode, we only have pattern T.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59Tperceptual1000(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {

	var block_error = 0,
		best_block_error = MAXERR1000,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var best_sw = 0;
	var pixel_colors;
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));

	// First use the colors as they are, then swap them
	for (let sw = 0; sw < 2; ++sw) {
		if (sw == 1) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);

		// Test all distances
		for (let d = 0; d < BINPOW(TABLE_BITS_59T); ++d) {
			calculatePaintColors59T(d, PATTERN_T, colors, possible_colors);

			block_error = 0;
			pixel_colors = 0;

			// Loop block
			for (let y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					best_pixel_error = MAXERR1000;
					pixel_colors <<= 2; // Make room for next value

					// Loop possible block colors
					for (let c = 0; c < 4; ++c) {

						diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
						diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
						diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

						pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(diff[R]) +
							PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(diff[G]) +
							PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * SQUARE(diff[B]);

						// Choose best error
						if (pixel_error < best_pixel_error) {
							best_pixel_error = pixel_error;
							pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
							pixel_colors |= c;
						}
					}
					block_error += best_pixel_error;
				}
			}
			if (block_error < best_block_error) {
				best_block_error = block_error;
				distance[0] = d;
				pixel_indices[0] = pixel_colors;
				best_sw = sw;
			}
		}

		if (sw == 1 && best_sw == 0) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
	}
	return best_block_error >>> 0;
}

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction is calculated as well
// 
// Please note that the function can change the order between the two colors in colorsRGB444
//
// In the 59T bit mode, we only have pattern T.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59T(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {
	var block_error = 0,
		best_block_error = MAXIMUM_ERROR,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var best_sw;
	var pixel_colors;
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));

	// First use the colors as they are, then swap them
	for (let sw = 0; sw < 2; ++sw) {
		if (sw == 1) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);

		// Test all distances
		for (let d = 0; d < BINPOW(TABLE_BITS_59T); ++d) {
			calculatePaintColors59T(d, PATTERN_T, colors, possible_colors);

			block_error = 0;
			pixel_colors = 0;

			// Loop block
			for (let y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					best_pixel_error = MAXIMUM_ERROR;
					pixel_colors <<= 2; // Make room for next value

					// Loop possible block colors
					for (let c = 0; c < 4; ++c) {

						diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
						diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
						diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

						pixel_error = weight[R] * SQUARE(diff[R]) +
							weight[G] * SQUARE(diff[G]) +
							weight[B] * SQUARE(diff[B]);

						// Choose best error
						if (pixel_error < best_pixel_error) {
							best_pixel_error = pixel_error;
							pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
							pixel_colors |= c;
						}
					}
					block_error += best_pixel_error;
				}
			}
			if (block_error < best_block_error) {
				best_block_error = block_error;
				distance[0] = d;
				pixel_indices[0] = pixel_colors;
				best_sw = sw;
			}
		}

		if (sw == 1 && best_sw == 0) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
	}
	return best_block_error;
}

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction is calculated as well
//
// In the 59T bit mode, we only have pattern T.
// 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TnoSwapPerceptual1000(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {

	var block_error = 0,
		best_block_error = MAXERR1000,
		pixel_error,
		best_pixel_error;
	var diff = new Uint8Array(3);
	var pixel_colors: number;
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
	var thebestintheworld: number;

	// First use the colors as they are, then swap them
	decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_59T); ++d) {
		calculatePaintColors59T(d, PATTERN_T, colors, possible_colors);

		block_error = 0;
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) {
			for (let x = 0; x < BLOCKWIDTH; ++x) {
				best_pixel_error = MAXERR1000;
				pixel_colors <<= 2; // Make room for next value

				// Loop possible block colors
				for (let c = 0; c < 4; ++c) {

					diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
					diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
					diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

					pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(diff[R]) +
						PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(diff[G]) +
						PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * SQUARE(diff[B]);

					// Choose best error
					if (pixel_error < best_pixel_error) {
						best_pixel_error = pixel_error;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= c;
						thebestintheworld = c;
					}
				}
				block_error += best_pixel_error;
			}
		}
		if (block_error < best_block_error) {
			best_block_error = block_error;
			distance[0] = d;
			pixel_indices[0] = pixel_colors;
		}
	}

	decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
	return best_block_error >>> 0;
}

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction is calculated as well
//
// In the 59T bit mode, we only have pattern T.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TnoSwap(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {
	var block_error = 0,
		best_block_error = MAXIMUM_ERROR,
		pixel_error,
		best_pixel_error;
	var diff = new Uint8Array(3);
	var pixel_colors;
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
	var thebestintheworld;

	// First use the colors as they are, then swap them
	decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_59T); ++d) {
		calculatePaintColors59T(d, PATTERN_T, colors, possible_colors);

		block_error = 0;
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) {
			for (let x = 0; x < BLOCKWIDTH; ++x) {
				best_pixel_error = MAXIMUM_ERROR;
				pixel_colors <<= 2; // Make room for next value

				// Loop possible block colors
				for (let c = 0; c < 4; ++c) {
					diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
					diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
					diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

					pixel_error = weight[R] * SQUARE(diff[R]) +
						weight[G] * SQUARE(diff[G]) +
						weight[B] * SQUARE(diff[B]);

					// Choose best error
					if (pixel_error < best_pixel_error) {
						best_pixel_error = pixel_error;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= c;
						thebestintheworld = c;
					}
				}
				block_error += best_pixel_error;
			}
		}
		if (block_error < best_block_error) {
			best_block_error = block_error;
			distance[0] = d;
			pixel_indices[0] = pixel_colors;
		}
	}

	decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
	return best_block_error;
}

// Put the compress params into the compression block 
//
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function packBlock59T(colors: Uint8Array[], d: number, pixel_indices: number, compressed1: Uint32Array, compressed2: Uint32Array) {

	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[0][R], 4, 58);
	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[0][G], 4, 54);
	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[0][B], 4, 50);
	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[1][R], 4, 46);
	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[1][G], 4, 42);
	compressed1[0] = PUTBITSHIGH(compressed1[0], colors[1][B], 4, 38);
	compressed1[0] = PUTBITSHIGH(compressed1[0], d, TABLE_BITS_59T, 34);
	pixel_indices = indexConversion(pixel_indices);
	compressed2[0] = 0;
	compressed2[0] = PUTBITS(compressed2[0], pixel_indices, 32, 31);
}

// Copy colors from source to dest
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function copyColors(source: Uint8Array[], dest: Uint8Array[]) {
	let x, y;

	for (x = 0; x < 2; x++)
		for (y = 0; y < 3; y++)
			dest[x][y] = source[x][y];
}

// The below code should compress the block to 59 bits. 
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TFastestOnlyColorPerceptual1000(img: uint8, width: number, height: number, startx: number, starty: number, best_colorsRGB444_packed: Int32Array) {
	var best_error = MAXERR1000;
	var best_pixel_indices: number;
	var best_distance: number;

	var error_no_i: number;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);

	// Determine the parameters for the lowest error
	error_no_i = calculateError59Tperceptual1000(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance = distance_no_i[0];
	best_pixel_indices = pixel_indices_no_i[0];

	best_colorsRGB444_packed[0] = (colorsRGB444_no_i[0][0] << 8) + (colorsRGB444_no_i[0][1] << 4) + (colorsRGB444_no_i[0][2] << 0);
	best_colorsRGB444_packed[1] = (colorsRGB444_no_i[1][0] << 8) + (colorsRGB444_no_i[1][1] << 4) + (colorsRGB444_no_i[1][2] << 0);

	return best_error >>> 0;
}


// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TFastestOnlyColor(img: uint8, width: number, height: number, startx: number, starty: number, best_colorsRGB444_packed: Int32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_pixel_indices: number;
	var best_distance: number;

	var error_no_i: number;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);

	// Determine the parameters for the lowest error
	error_no_i = calculateError59T(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance = distance_no_i[0];
	best_pixel_indices = pixel_indices_no_i[0];

	best_colorsRGB444_packed[0] = (colorsRGB444_no_i[0][0] << 8) + (colorsRGB444_no_i[0][1] << 4) + (colorsRGB444_no_i[0][2] << 0);
	best_colorsRGB444_packed[1] = (colorsRGB444_no_i[1][0] << 8) + (colorsRGB444_no_i[1][1] << 4) + (colorsRGB444_no_i[1][2] << 0);

	return best_error;
}

// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TFastestPerceptual1000(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error_no_i;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);

	// Determine the parameters for the lowest error
	error_no_i = calculateError59Tperceptual1000(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance[0] = distance_no_i[0];
	best_pixel_indices[0] = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	// Put the compress params into the compression block 
	packBlock59T(best_colorsRGB444, best_distance[0], best_pixel_indices[0], compressed1, compressed2);

	return best_error;
}

// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TFastest(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices: number;
	var best_distance: number;

	var error_no_i;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);

	// Determine the parameters for the lowest error
	error_no_i = calculateError59T(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance = distance_no_i[0];
	best_pixel_indices = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	// Put the compress params into the compression block 
	packBlock59T(best_colorsRGB444, best_distance, best_pixel_indices, compressed1, compressed2);

	return best_error;
}

// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TFast(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance;

	var error_no_i: number;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var error_half_i: number;
	var colorsRGB444_half_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_half_i = new Uint32Array(1);
	var distance_half_i = new Uint8Array(1);

	var error: number;
	var colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGNotIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);
	// Determine the parameters for the lowest error
	error_no_i = calculateError59T(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_half_i);
	// Determine the parameters for the lowest error
	error_half_i = calculateError59T(img, width, startx, starty, colorsRGB444_half_i, distance_half_i, pixel_indices_half_i);

	// Calculate average color using the LBG-algorithm
	computeColorLBGfast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444);
	// Determine the parameters for the lowest error
	error = calculateError59T(img, width, startx, starty, colorsRGB444, distance, pixel_indices);

	best_error = error_no_i;
	best_distance = distance_no_i;
	best_pixel_indices = pixel_indices_no_i;
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	if (error_half_i < best_error) {
		best_error = error_half_i;
		best_distance = distance_half_i;
		best_pixel_indices = pixel_indices_half_i;
		copyColors(colorsRGB444_half_i, best_colorsRGB444);
	}
	if (error < best_error) {
		best_error = error;
		best_distance = distance;
		best_pixel_indices = pixel_indices;
		copyColors(colorsRGB444, best_colorsRGB444);
	}

	// Put the compress params into the compression block 
	packBlock59T(best_colorsRGB444, best_distance[0], best_pixel_indices[0], compressed1, compressed2);

	return best_error;
}

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction is calculated as well
// 
// In the 58H bit mode, we only have pattern H.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorAndCompress58Hperceptual1000(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {
	var block_error = 0,
		best_block_error = MAXERR1000,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) {
		calculatePaintColors58H(d, PATTERN_H, colors, possible_colors);

		block_error = 0;
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) {
			for (let x = 0; x < BLOCKWIDTH; ++x) {
				best_pixel_error = MAXERR1000;
				pixel_colors <<= 2; // Make room for next value

				// Loop possible block colors
				for (let c = 0; c < 4; ++c) {
					diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
					diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
					diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

					pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(diff[R]) +
						PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(diff[G]) +
						PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * SQUARE(diff[B]);

					// Choose best error
					if (pixel_error < best_pixel_error) {
						best_pixel_error = pixel_error;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= c;
					}
				}
				block_error += best_pixel_error;
			}
		}

		if (block_error < best_block_error) {
			best_block_error = block_error;
			distance[0] = d;
			pixel_indices[0] = pixel_colors;
		}
	}
	return best_block_error;
}

// The H-mode but with punchthrough alpha
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorAndCompress58HAlpha(srcimg: uint8, alphaimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {
	var block_error = 0,
		best_block_error = MAXIMUM_ERROR,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var alphaindex;
	var colorsRGB444_packed = new Int32Array(2);
	colorsRGB444_packed[0] = (colorsRGB444[0][R] << 8) + (colorsRGB444[0][G] << 4) + colorsRGB444[0][B];
	colorsRGB444_packed[1] = (colorsRGB444[1][R] << 8) + (colorsRGB444[1][G] << 4) + colorsRGB444[1][B];

	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) {
		alphaindex = 2;
		if (((colorsRGB444_packed[0] >= colorsRGB444_packed[1]) ? 1 : 0) ^ ((d & 1) === 1 ? 1 : 0)) {
			//we're going to have to swap the colors to be able to choose this distance.. that means
			//that the indices will be swapped as well, so C1 will be the one with alpha instead of C3..
			alphaindex = 0;
		}

		calculatePaintColors58H(d, PATTERN_H, colors, possible_colors);

		block_error = 0;
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) {
			for (let x = 0; x < BLOCKWIDTH; ++x) {
				var alpha = 0;
				if (alphaimg[((starty + y) * width + startx + x)] > 0)
					alpha = 1;
				if (alphaimg[((starty + y) * width + startx + x)] > 0 && alphaimg[((starty + y) * width + startx + x)] < 255)
					console.log("INVALID ALPHA DATA!!");
				best_pixel_error = MAXIMUM_ERROR;
				pixel_colors <<= 2; // Make room for next value

				// Loop possible block colors
				for (let c = 0; c < 4; ++c) {
					if (c == alphaindex && alpha) {
						pixel_error = 0;
					}
					else if (c == alphaindex || alpha) {
						pixel_error = MAXIMUM_ERROR;
					}
					else {
						diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
						diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
						diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

						pixel_error = weight[R] * SQUARE(diff[R]) +
							weight[G] * SQUARE(diff[G]) +
							weight[B] * SQUARE(diff[B]);
					}

					// Choose best error
					if (pixel_error < best_pixel_error) {
						best_pixel_error = pixel_error;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= c;
					}
				}
				block_error += best_pixel_error;
			}
		}
		if (block_error < best_block_error) {
			best_block_error = block_error;
			distance[0] = d;
			pixel_indices[0] = pixel_colors;
		}
	}
	return best_block_error;
}

// Calculate the error for the block at position (startx,starty)
// The parameters needed for reconstruction is calculated as well
// 
// In the 58H bit mode, we only have pattern H.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorAndCompress58H(srcimg: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {
	var block_error = 0,
		best_block_error = MAXIMUM_ERROR,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));


	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) {
		calculatePaintColors58H(d, PATTERN_H, colors, possible_colors);

		block_error = 0;
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) {
			for (let x = 0; x < BLOCKWIDTH; ++x) {
				best_pixel_error = MAXIMUM_ERROR;
				pixel_colors <<= 2; // Make room for next value

				// Loop possible block colors
				for (let c = 0; c < 4; ++c) {
					diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
					diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
					diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

					pixel_error = weight[R] * SQUARE(diff[R]) +
						weight[G] * SQUARE(diff[G]) +
						weight[B] * SQUARE(diff[B]);

					// Choose best error
					if (pixel_error < best_pixel_error) {
						best_pixel_error = pixel_error;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= c;
					}
				}
				block_error += best_pixel_error;
			}
		}

		if (block_error < best_block_error) {
			best_block_error = block_error;
			distance[0] = d;
			pixel_indices[0] = pixel_colors;
		}
	}

	return best_block_error;
}

// Makes sure that col0 < col1;
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function sortColorsRGB444(colorsRGB444: Uint8Array[]) {
	var col0, col1, tcol;

	// sort colors
	col0 = 16 * 16 * colorsRGB444[0][R] + 16 * colorsRGB444[0][G] + colorsRGB444[0][B];
	col1 = 16 * 16 * colorsRGB444[1][R] + 16 * colorsRGB444[1][G] + colorsRGB444[1][B];

	// After this, col0 should be smaller than col1 (col0 < col1)
	if (col0 > col1) {
		tcol = col0;
		col0 = col1;
		col1 = tcol;
	}
	else {
		if (col0 == col1) {
			// Both colors are the same. That is useless. If they are both black,
			// col1 can just as well be (0,0,1). Else, col0 can be col1 - 1.
			if (col0 == 0)
				col1 = col0 + 1;
			else
				col0 = col1 - 1;
		}
	}

	colorsRGB444[0][R] = GETBITS(col0, 4, 11);
	colorsRGB444[0][G] = GETBITS(col0, 4, 7);
	colorsRGB444[0][B] = GETBITS(col0, 4, 3);
	colorsRGB444[1][R] = GETBITS(col1, 4, 11);
	colorsRGB444[1][G] = GETBITS(col1, 4, 7);
	colorsRGB444[1][B] = GETBITS(col1, 4, 3);
}

// The below code should compress the block to 58 bits. 
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HFastestPerceptual1000(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXERR1000;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error_no_i;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm but discarding the intensity in the error function
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444_no_i);
	sortColorsRGB444(colorsRGB444_no_i);

	error_no_i = calculateErrorAndCompress58Hperceptual1000(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance[0] = distance_no_i[0];
	best_pixel_indices[0] = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
	//
	// This can be done with an xor test.

	var best_colorsRGB444_packed = new Int32Array(2);
	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if (((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance[0] & 1) === 1 ? 1 : 0)) {
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices[0] = (0x55555555 & best_pixel_indices[0]) | (0xaaaaaaaa & (~best_pixel_indices[0]));
	}

	// Put the compress params into the compression block 

	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][R], 4, 57);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][G], 4, 53);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][B], 4, 49);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][R], 4, 45);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][G], 4, 41);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH(compressed1[0], (best_distance[0] >> 1), 2, 33);

	compressed2[0] = 0;
	best_pixel_indices[0] = indexConversion(best_pixel_indices[0]);
	compressed2[0] = PUTBITS(compressed2[0], best_pixel_indices[0], 32, 31);

	return best_error >>> 0;
}

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HFastest(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error_no_i;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm but discarding the intensity in the error function
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444_no_i);
	sortColorsRGB444(colorsRGB444_no_i);

	error_no_i = calculateErrorAndCompress58H(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance[0] = distance_no_i[0];
	best_pixel_indices[0] = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
	//
	// This can be done with an xor test.

	var best_colorsRGB444_packed = new Int32Array(2);
	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if (((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance[0] & 1) === 1 ? 1 : 0)) {
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices[0] = (0x55555555 & best_pixel_indices[0]) | (0xaaaaaaaa & (~best_pixel_indices[0]));
	}

	// Put the compress params into the compression block 

	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][R], 4, 57);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][G], 4, 53);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][B], 4, 49);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][R], 4, 45);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][G], 4, 41);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH(compressed1[0], (best_distance[0] >> 1), 2, 33);
	best_pixel_indices[0] = indexConversion(best_pixel_indices[0]);
	compressed2[0] = 0;
	compressed2[0] = PUTBITS(compressed2[0], best_pixel_indices[0], 32, 31);

	return best_error;
}

//same as above, but with 1-bit alpha
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HAlpha(img: uint8, alphaimg: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices: number;
	var best_distance: number;

	var error_no_i;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm but discarding the intensity in the error function
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444_no_i);
	sortColorsRGB444(colorsRGB444_no_i);

	error_no_i = calculateErrorAndCompress58HAlpha(img, alphaimg, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance = distance_no_i[0];
	best_pixel_indices = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
	//
	// This can be done with an xor test.

	var best_colorsRGB444_packed = new Int32Array(2);
	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if (((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance & 1) === 1 ? 1 : 0)) {
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices = (0x55555555 & best_pixel_indices) | (0xaaaaaaaa & (~best_pixel_indices));
	}

	// Put the compress params into the compression block 

	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][R], 4, 57);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][G], 4, 53);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][B], 4, 49);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][R], 4, 45);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][G], 4, 41);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH(compressed1[0], (best_distance >> 1), 2, 33);
	best_pixel_indices = indexConversion(best_pixel_indices);
	compressed2[0] = 0;
	compressed2[0] = PUTBITS(compressed2[0], best_pixel_indices, 32, 31);

	return best_error;
}

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.
//
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HFast(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error_no_i: number;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var error_half_i: number;
	var colorsRGB444_half_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_half_i = new Uint32Array(1);
	var distance_half_i = new Uint8Array(1);

	var error: number;
	var colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm but discarding the intensity in the error function
	computeColorLBGNotIntensity(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444_no_i);
	sortColorsRGB444(colorsRGB444_no_i);
	error_no_i = calculateErrorAndCompress58H(img, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	// Calculate average color using the LBG-algorithm but halfing the influence of the intensity in the error function
	computeColorLBGNotIntensity(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444_half_i);
	sortColorsRGB444(colorsRGB444_half_i);
	error_half_i = calculateErrorAndCompress58H(img, width, startx, starty, colorsRGB444_half_i, distance_half_i, pixel_indices_half_i);

	// Calculate average color using the LBG-algorithm
	computeColorLBG(img, width, startx, starty, colors);
	compressColor(R_BITS58H, G_BITS58H, B_BITS58H, colors, colorsRGB444);
	sortColorsRGB444(colorsRGB444);
	error = calculateErrorAndCompress58H(img, width, startx, starty, colorsRGB444, distance, pixel_indices);

	best_error = error_no_i;
	best_distance = distance_no_i;
	best_pixel_indices = pixel_indices_no_i;
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	if (error_half_i < best_error) {
		best_error = error_half_i;
		best_distance = distance_half_i;
		best_pixel_indices = pixel_indices_half_i;
		copyColors(colorsRGB444_half_i, best_colorsRGB444);
	}

	if (error < best_error) {
		best_error = error;
		best_distance = distance;
		best_pixel_indices = pixel_indices;
		copyColors(colorsRGB444, best_colorsRGB444);
	}

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
	//
	// This can be done with an xor test.

	var best_colorsRGB444_packed = new Int32Array(2);
	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if (((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance[0] & 1) === 1 ? 1 : 0)) {
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices[0] = (0x55555555 & best_pixel_indices[0]) | (0xaaaaaaaa & (~best_pixel_indices[0]));
	}

	// Put the compress params into the compression block 
	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][R], 4, 57);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][G], 4, 53);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][B], 4, 49);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][R], 4, 45);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][G], 4, 41);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH(compressed1[0], (best_distance[0] >> 1), 2, 33);
	best_pixel_indices[0] = indexConversion(best_pixel_indices[0]);
	compressed2[0] = 0;
	compressed1[0] = PUTBITS(compressed2[0], best_pixel_indices[0], 32, 31);

	return best_error;
}

// Compress block testing both individual and differential mode.
// Perceptual error metric.
// Combined quantization for colors.
// Both flipped and unflipped tested.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipCombinedPerceptual(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {

	var compressed1_norm = new Uint32Array(1), compressed2_norm = new Uint32Array(1);
	var compressed1_flip = new Uint32Array(1), compressed2_flip = new Uint32Array(1);
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;
	//unsigned int best_table_indices1=0, best_table_indices2=0;
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);
	var diffbit;

	var norm_err = 0;
	var flip_err = 0;

	// First try normal blocks 2x4:

	computeAverageColor2x4noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor2x4noQuantFloat(img, width, height, startx + 2, starty, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 

	var eps;

	var dummy = new Uint8Array(3);

	quantize555ColorCombinedPerceptual(avg_color_float1, enc_color1, dummy);
	quantize555ColorCombinedPerceptual(avg_color_float2, enc_color2, dummy);

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 

		//     ETC1_RGB8_OES:
		// 
		//     a) bit layout in bits 63 through 32 if diffbit = 0
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		//     
		//     b) bit layout in bits 63 through 32 if diffbit = 1
		// 
		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
		//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------
		// 
		//     c) bit layout in bits 31 through 0 (in both cases)
		// 
		//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
		//      --------------------------------------------------------------------------------------------------
		//     |       most significant pixel index bits       |         least significant pixel index bits       |  
		//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
		//      --------------------------------------------------------------------------------------------------      

		compressed1_norm[0] = 0;
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diffbit, 1, 33);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[0], 5, 63);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[1], 5, 55);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[2], 5, 47);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[0], 3, 58);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[1], 3, 50);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		norm_err = 0;

		// left part of block
		norm_err = tryalltables_3bittable2x4percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4percep(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table1[0], 3, 39);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table2[0], 3, 36);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], 0, 1, 32);

		compressed2_norm[0] = 0;
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.

		eps = 0.0001;

		quantize444ColorCombinedPerceptual(avg_color_float1, enc_color1, dummy);
		quantize444ColorCombinedPerceptual(avg_color_float2, enc_color2, dummy);

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		// Pack bits into the first word. 

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		compressed1_norm[0] = 0;
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], diffbit, 1, 33);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[0], 4, 63);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[1], 4, 55);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color1[2], 4, 47);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[0], 4, 59);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[1], 4, 51);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// left part of block
		norm_err = tryalltables_3bittable2x4percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

		// right part of block
		norm_err += tryalltables_3bittable2x4percep(img, width, height, startx + 2, starty, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table1[0], 3, 39);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], best_table2[0], 3, 36);
		compressed1_norm[0] = PUTBITSHIGH(compressed1_norm[0], 0, 1, 32);

		compressed2_norm[0] = 0;
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2_norm[0] = PUTBITS(compressed2_norm[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}

	// Now try flipped blocks 4x2:
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty, avg_color_float1);
	computeAverageColor4x2noQuantFloat(img, width, height, startx, starty + 2, avg_color_float2);

	// First test if avg_color1 is similar enough to avg_color2 so that
	// we can use differential coding of colors. 
	quantize555ColorCombinedPerceptual(avg_color_float1, enc_color1, dummy);
	quantize555ColorCombinedPerceptual(avg_color_float2, enc_color2, dummy);

	diff[0] = enc_color2[0] - enc_color1[0];
	diff[1] = enc_color2[1] - enc_color1[1];
	diff[2] = enc_color2[2] - enc_color1[2];

	if ((diff[0] >= -4) && (diff[0] <= 3) && (diff[1] >= -4) && (diff[1] <= 3) && (diff[2] >= -4) && (diff[2] <= 3)) {
		diffbit = 1;

		// The difference to be coded:
		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 
		compressed1_flip[0] = 0;
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diffbit, 1, 33);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[0], 5, 63);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[1], 5, 55);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[2], 5, 47);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[0], 3, 58);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[1], 3, 50);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diff[2], 3, 42);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2percep(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table1[0], 3, 39);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table2[0], 3, 36);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	else {
		diffbit = 0;
		// The difference is bigger than what fits in 555 plus delta-333, so we will have
		// to deal with 444 444.
		eps = 0.0001;

		quantize444ColorCombinedPerceptual(avg_color_float1, enc_color1, dummy);
		quantize444ColorCombinedPerceptual(avg_color_float2, enc_color2, dummy);

		avg_color_quant1[0] = enc_color1[0] << 4 | enc_color1[0];
		avg_color_quant1[1] = enc_color1[1] << 4 | enc_color1[1];
		avg_color_quant1[2] = enc_color1[2] << 4 | enc_color1[2];
		avg_color_quant2[0] = enc_color2[0] << 4 | enc_color2[0];
		avg_color_quant2[1] = enc_color2[1] << 4 | enc_color2[1];
		avg_color_quant2[2] = enc_color2[2] << 4 | enc_color2[2];

		//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
		//      ---------------------------------------------------------------------------------------------------
		//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
		//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
		//      ---------------------------------------------------------------------------------------------------

		// Pack bits into the first word. 
		compressed1_flip[0] = 0;
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], diffbit, 1, 33);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[0], 4, 63);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[1], 4, 55);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color1[2], 4, 47);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[0], 4, 59);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[1], 4, 51);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], enc_color2[2], 4, 43);

		var best_pixel_indices1_MSB = new Uint32Array(1);
		var best_pixel_indices1_LSB = new Uint32Array(1);
		var best_pixel_indices2_MSB = new Uint32Array(1);
		var best_pixel_indices2_LSB = new Uint32Array(1);

		// upper part of block
		flip_err = tryalltables_3bittable4x2percep(img, width, height, startx, starty, avg_color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
		// lower part of block
		flip_err += tryalltables_3bittable4x2percep(img, width, height, startx, starty + 2, avg_color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table1[0], 3, 39);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], best_table2[0], 3, 36);
		compressed1_flip[0] = PUTBITSHIGH(compressed1_flip[0], 1, 1, 32);

		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);

		compressed2_flip[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	// Now lets see which is the best table to use. Only 8 tables are possible. 
	if (norm_err <= flip_err) {
		compressed1[0] = compressed1_norm[0] | 0;
		compressed2[0] = compressed2_norm[0];
	}
	else {
		compressed1[0] = compressed1_flip[0] | 1;
		compressed2[0] = compressed2_flip[0];
	}
}

// Calculate the error of a block
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBlockErrorRGB(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number) {
	var xx, yy;
	var err;

	err = 0;

	for (xx = startx; xx < startx + 4; xx++) {
		for (yy = starty; yy < starty + 4; yy++) {
			err += SQUARE(1.0 * RED(img, width, xx, yy) - 1.0 * RED(imgdec, width, xx, yy));
			err += SQUARE(1.0 * GREEN(img, width, xx, yy) - 1.0 * GREEN(imgdec, width, xx, yy));
			err += SQUARE(1.0 * BLUE(img, width, xx, yy) - 1.0 * BLUE(imgdec, width, xx, yy));
		}
	}

	return err;
}

// Calculate the perceptually weighted error of a block
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBlockPerceptualErrorRGB(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number) {
	var err = 0;

	for (let xx = startx; xx < startx + 4; xx++) {
		for (let yy = starty; yy < starty + 4; yy++) {
			err += PERCEPTUAL_WEIGHT_R_SQUARED * SQUARE(1.0 * RED(img, width, xx, yy) - 1.0 * RED(imgdec, width, xx, yy));
			err += PERCEPTUAL_WEIGHT_G_SQUARED * SQUARE(1.0 * GREEN(img, width, xx, yy) - 1.0 * GREEN(imgdec, width, xx, yy));
			err += PERCEPTUAL_WEIGHT_B_SQUARED * SQUARE(1.0 * BLUE(img, width, xx, yy) - 1.0 * BLUE(imgdec, width, xx, yy));
		}
	}

	return err;
}

// Compress an ETC1 block (or the individual and differential modes of an ETC2 block)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipFast(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var average_block1 = new Uint32Array(1);
	var average_block2 = new Uint32Array(1);
	var error_average;

	var combined_block1 = new Uint32Array(1);
	var combined_block2 = new Uint32Array(1);
	var error_combined;

	var best_error;

	// First quantize the average color to the nearest neighbor.
	compressBlockDiffFlipAverage(img, width, height, startx, starty, average_block1, average_block2);
	decompressBlockDiffFlip(average_block1[0], average_block2[0], imgdec, width, height, startx, starty);
	error_average = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);

	// Then quantize the average color taking into consideration that intensity can change
	compressBlockDiffFlipCombined(img, width, height, startx, starty, combined_block1, combined_block2);
	decompressBlockDiffFlip(combined_block1[0], combined_block2[0], imgdec, width, height, startx, starty);
	error_combined = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);

	if (error_combined < error_average) {
		compressed1[0] = combined_block1[0];
		compressed2[0] = combined_block2[0];
		best_error = error_combined;
	}
	else {
		compressed1[0] = average_block1[0];
		compressed2[0] = average_block2[0];
		best_error = error_average;
	}
	return best_error;
}

// Compress an ETC1 block (or the individual and differential modes of an ETC2 block)
// Uses perceptual error metric.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDiffFlipFastPerceptual(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var average_block1 = new Uint32Array(1);
	var average_block2 = new Uint32Array(1);
	var error_average;

	var combined_block1 = new Uint32Array(1);
	var combined_block2 = new Uint32Array(1);
	var error_combined;

	// First quantize the average color to the nearest neighbor.
	compressBlockDiffFlipAveragePerceptual(img, width, height, startx, starty, average_block1, average_block2);
	decompressBlockDiffFlip(average_block1[0], average_block2[0], imgdec, width, height, startx, starty);
	error_average = calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);

	// Then quantize the average color taking into consideration that intensity can change 
	compressBlockDiffFlipCombinedPerceptual(img, width, height, startx, starty, combined_block1, combined_block2);
	decompressBlockDiffFlip(combined_block1[0], combined_block2[0], imgdec, width, height, startx, starty);
	error_combined = calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);

	if (error_combined < error_average) {
		compressed1[0] = combined_block1[0];
		compressed2[0] = combined_block2[0];
	}
	else {
		compressed1[0] = average_block1[0];
		compressed2[0] = average_block2[0];
	}
}

// Compresses the differential mode of an ETC2 block with punchthrough alpha
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDifferentialWithAlpha(isTransparent: boolean, img: uint8, alphaimg: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, etc1_word1: Uint32Array, etc1_word2: Uint32Array) {
	var compressed1_norm = new Uint32Array(1), compressed2_norm = new Uint32Array(1);
	var compressed1_flip = new Uint32Array(1), compressed2_flip = new Uint32Array(1);
	var compressed1_temp = new Uint32Array(1), compressed2_temp = new Uint32Array(1);
	var avg_color_quant1 = new Uint8Array(3), avg_color_quant2 = new Uint8Array(3);

	var avg_color_float1 = new Float32Array(3), avg_color_float2 = new Float32Array(3);
	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var min_error = 255 * 255 * 8 * 3;

	var norm_err = 0;
	var flip_err = 0;
	var temp_err = 0;
	for (let flipbit = 0; flipbit < 2; flipbit++) {
		//compute average color for each half.
		for (let c = 0; c < 3; c++) {
			avg_color_float1[c] = 0;
			avg_color_float2[c] = 0;
			var sum1 = 0;
			var sum2 = 0;
			for (let x = 0; x < 4; x++) {
				for (let y = 0; y < 4; y++) {
					var fac = 1;
					var index = x + startx + (y + starty) * width;
					//transparent pixels are only barely figured into the average. This ensures that they DO matter if we have only
					//transparent pixels in one half of the block, and not otherwise. A bit ugly perhaps.
					if (alphaimg[index] < 128)
						fac = 0.0001;
					var col = fac * img[index * 3 + c];
					if ((flipbit == 0 && x < 2) || (flipbit == 1 && y < 2)) {
						sum1 += fac;
						avg_color_float1[c] += col;
					}
					else {
						sum2 += fac;
						avg_color_float2[c] += col;
					}
				}
			}
			avg_color_float1[c] /= sum1;
			avg_color_float2[c] /= sum2;
		}
		var dummy = new Uint8Array(3);
		quantize555ColorCombined(avg_color_float1, enc_color1, dummy);
		quantize555ColorCombined(avg_color_float2, enc_color2, dummy);

		diff[0] = enc_color2[0] - enc_color1[0];
		diff[1] = enc_color2[1] - enc_color1[1];
		diff[2] = enc_color2[2] - enc_color1[2];

		//make sure diff is small enough for diff-coding
		for (let c = 0; c < 3; c++) {
			if (diff[c] < -4)
				diff[c] = -4;
			if (diff[c] > 3)
				diff[c] = 3;
			enc_color2[c] = enc_color1[c] + diff[c];
		}

		avg_color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		avg_color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
		avg_color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
		avg_color_quant2[0] = enc_color2[0] << 3 | (enc_color2[0] >> 2);
		avg_color_quant2[1] = enc_color2[1] << 3 | (enc_color2[1] >> 2);
		avg_color_quant2[2] = enc_color2[2] << 3 | (enc_color2[2] >> 2);

		// Pack bits into the first word. 
		// see regular compressblockdiffflipfast for details

		compressed1_temp[0] = 0;
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], !isTransparent ? 1 : 0, 1, 33);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], enc_color1[0], 5, 63);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], enc_color1[1], 5, 55);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], enc_color1[2], 5, 47);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], diff[0], 3, 58);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], diff[1], 3, 50);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], diff[2], 3, 42);

		temp_err = 0;

		var besterror = new Int32Array([255 * 255 * 3 * 16, 255 * 255 * 3 * 16]);
		var besttable = new Int32Array(2);
		var best_indices_LSB = new Int32Array(16);
		var best_indices_MSB = new Int32Array(16);
		//for each table, we're going to compute the indices required to get minimum error in each half.
		//then we'll check if this was the best table for either half, and set besterror/besttable accordingly.
		for (let table = 0; table < 8; table++) {
			var taberror = new Int32Array(2);//count will be sort of an index of each pixel within a half, determining where the index will be placed in the bitstream.

			var pixel_indices_LSB = new Int32Array(16), pixel_indices_MSB = new Int32Array(16);

			for (let i = 0; i < 2; i++) {
				taberror[i] = 0;
			}
			for (let x = 0; x < 4; x++) {
				for (let y = 0; y < 4; y++) {
					var index = x + startx + (y + starty) * width;
					var basecol = new Uint8Array(3);
					var transparentPixel = alphaimg[index] < 128;
					//determine which half of the block this pixel is in, based on the flipbit.
					var half = 0;
					if ((flipbit == 0 && x < 2) || (flipbit && y < 2)) {
						basecol[0] = avg_color_quant1[0];
						basecol[1] = avg_color_quant1[1];
						basecol[2] = avg_color_quant1[2];
					}
					else {
						half = 1;
						basecol[0] = avg_color_quant2[0];
						basecol[1] = avg_color_quant2[1];
						basecol[2] = avg_color_quant2[2];
					}
					var besterri = 255 * 255 * 3 * 2;
					var besti = 0;
					var erri;
					for (let i = 0; i < 4; i++) {
						if (i == 1 && isTransparent)
							continue;
						erri = 0;
						for (let c = 0; c < 3; c++) {
							var col = CLAMP(0, (basecol[c]) + compressParams[table * 2][i], 255);
							if (i == 2 && isTransparent) {
								col = basecol[c];
							}
							var errcol = col - ((img[index * 3 + c]));
							erri = erri + (errcol * errcol);
						}
						if (erri < besterri) {
							besterri = erri;
							besti = i;
						}
					}
					if (transparentPixel) {
						besterri = 0;
						besti = 1;
					}
					//the best index for this pixel using this table for its half is known.
					//add its error to error for this table and half.
					taberror[half] += besterri;
					//store the index! we might toss it later though if this was a bad table.

					var pixel_index = scramble[besti];

					pixel_indices_MSB[x * 4 + y] = (pixel_index >> 1);
					pixel_indices_LSB[x * 4 + y] = (pixel_index & 1);
				}
			}
			for (let half = 0; half < 2; half++) {
				if (taberror[half] < besterror[half]) {
					besterror[half] = taberror[half];
					besttable[half] = table;
					for (let i = 0; i < 16; i++) {
						var thishalf = 0;
						var y = i % 4;
						var x = i / 4;
						if (!(flipbit == 0 && x < 2) && !(flipbit && y < 2))
							thishalf = 1;
						if (half != thishalf) //this pixel is not in given half, don't update best index!
							continue;
						best_indices_MSB[i] = pixel_indices_MSB[i];
						best_indices_LSB[i] = pixel_indices_LSB[i];
					}
				}
			}
		}
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], besttable[0], 3, 39);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], besttable[1], 3, 36);
		compressed1_temp[0] = PUTBITSHIGH(compressed1_temp[0], 0, 1, 32);

		compressed2_temp[0] = 0;
		for (let i = 0; i < 16; i++) {
			compressed2_temp[0] = PUTBITS(compressed2_temp[0], (best_indices_MSB[i]), 1, 16 + i);
			compressed2_temp[0] = PUTBITS(compressed2_temp[0], (best_indices_LSB[i]), 1, i);
		}

		if (flipbit) {
			flip_err = besterror[0] + besterror[1];
			compressed1_flip[0] = compressed1_temp[0];
			compressed2_flip[0] = compressed2_temp[0];
		}
		else {
			norm_err = besterror[0] + besterror[1];
			compressed1_norm[0] = compressed1_temp[0];
			compressed2_norm[0] = compressed2_temp[0];
		}
	}
	// Now to find out if flipping was a good idea or not

	if (norm_err <= flip_err) {
		etc1_word1[0] = compressed1_norm[0] | 0;
		etc1_word2[0] = compressed2_norm[0];
		return norm_err;
	}
	else {
		etc1_word1[0] = compressed1_flip[0] | 1;
		etc1_word2[0] = compressed2_flip[0];
		return flip_err;
	}
}


// Calculate RGBA error --- only count non-transparent pixels (alpha > 128)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcBlockErrorRGBA(img: uint8, imgdec: uint8, alpha: uint8, width: number, height: number, startx: number, starty: number) {
	var xx, yy;
	var err;

	err = 0;

	for (xx = startx; xx < startx + 4; xx++) {
		for (yy = starty; yy < starty + 4; yy++) {
			//only count non-transparent pixels.
			if (alpha[yy * width + xx] > 128) {
				err += SQUARE(1.0 * RED(img, width, xx, yy) - 1.0 * RED(imgdec, width, xx, yy));
				err += SQUARE(1.0 * GREEN(img, width, xx, yy) - 1.0 * GREEN(imgdec, width, xx, yy));
				err += SQUARE(1.0 * BLUE(img, width, xx, yy) - 1.0 * BLUE(imgdec, width, xx, yy));
			}
		}
	}
	return err;
}

//calculates the error for a block using the given colors, and the paremeters required to obtain the error. This version uses 1-bit punch-through alpha.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TAlpha(srcimg: uint8, alpha: uint8, width: number, startx: number, starty: number, colorsRGB444: Uint8Array[], distance: Uint8Array, pixel_indices: Uint32Array) {

	var block_error = 0,
		best_block_error = MAXIMUM_ERROR,
		pixel_error,
		best_pixel_error;
	var diff = new Int32Array(3);
	var best_sw;
	var pixel_colors;
	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));
	var possible_colors = Array.from({ length: 4 }, () => new Uint8Array(3));

	// First use the colors as they are, then swap them
	for (let sw = 0; sw < 2; ++sw) {
		if (sw == 1) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);

		// Test all distances
		for (let d = 0; d < BINPOW(TABLE_BITS_59T); ++d) {
			calculatePaintColors59T(d, PATTERN_T, colors, possible_colors);

			block_error = 0;
			pixel_colors = 0;

			// Loop block
			for (let y = 0; y < BLOCKHEIGHT; ++y) {
				for (let x = 0; x < BLOCKWIDTH; ++x) {
					best_pixel_error = MAXIMUM_ERROR;
					pixel_colors <<= 2; // Make room for next value

					// Loop possible block colors
					if (alpha[x + startx + (y + starty) * width] == 0) {
						best_pixel_error = 0;
						pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
						pixel_colors |= 2; //insert the index for this pixel, two meaning transparent.
					}
					else {
						for (let c = 0; c < 4; ++c) {

							if (c == 2)
								continue; //don't use this, because we don't have alpha here and index 2 means transparent.
							diff[R] = srcimg[3 * ((starty + y) * width + startx + x) + R] - CLAMP(0, possible_colors[c][R], 255);
							diff[G] = srcimg[3 * ((starty + y) * width + startx + x) + G] - CLAMP(0, possible_colors[c][G], 255);
							diff[B] = srcimg[3 * ((starty + y) * width + startx + x) + B] - CLAMP(0, possible_colors[c][B], 255);

							pixel_error = weight[R] * SQUARE(diff[R]) +
								weight[G] * SQUARE(diff[G]) +
								weight[B] * SQUARE(diff[B]);

							// Choose best error
							if (pixel_error < best_pixel_error) {
								best_pixel_error = pixel_error;
								pixel_colors ^= (pixel_colors & 3); // Reset the two first bits
								pixel_colors |= c; //insert the index for this pixel
							}
						}
					}
					block_error += best_pixel_error;
				}
			}
			if (block_error < best_block_error) {
				best_block_error = block_error;
				distance[0] = d;
				pixel_indices[0] = pixel_colors;
				best_sw = sw;
			}
		}

		if (sw == 1 && best_sw == 0) {
			swapColors(colorsRGB444);
		}
		decompressColor(R_BITS59T, G_BITS59T, B_BITS59T, colorsRGB444, colors);
	}
	return best_block_error;
}

// Put bits in order for the format.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function stuff59bitsDiffFalse(thumbT59_word1: number, thumbT59_word2: number, thumbT_word1: Uint32Array, thumbT_word2: Uint32Array) {
	// Put bits in twotimer configuration for 59 (red overflows)
	// 
	// Go from this bit layout:
	//
	//     |63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
	//     |----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |----------------------------------------index bits---------------------------------------------|
	//
	//
	//  To this:
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     |// // //|R0a  |//|R0b  |G0         |B0         |R1         |G1         |B1          |da  |df|db|
	//      -----------------------------------------------------------------------------------------------
	//
	//     |31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
	//     |----------------------------------------index bits---------------------------------------------|
	//
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 
	//      -----------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |df|fp|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bt|bt|
	//      ------------------------------------------------------------------------------------------------

	var R0a;
	var bit, a, b, c, d, bits;

	R0a = GETBITSHIGH(thumbT59_word1, 2, 58);

	// Fix middle part
	thumbT_word1[0] = thumbT59_word1 << 1;
	// Fix R0a (top two bits of R0)
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], R0a, 2, 60);
	// Fix db (lowest bit of d)
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], thumbT59_word1, 1, 32);
	// 
	// Make sure that red overflows:
	a = GETBITSHIGH(thumbT_word1[0], 1, 60);
	b = GETBITSHIGH(thumbT_word1[0], 1, 59);
	c = GETBITSHIGH(thumbT_word1[0], 1, 57);
	d = GETBITSHIGH(thumbT_word1[0], 1, 56);
	// The following bit abcd bit sequences should be padded with ones: 0111, 1010, 1011, 1101, 1110, 1111
	// The following logical expression checks for the presence of any of those:
	bit = (a & c) | ((!a ? 1 : 0) & b & c & d) | (a & b & (!c ? 1 : 0) & d);
	bits = 0xf * bit;
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], bits, 3, 63);
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], !bit ? 1 : 0, 1, 58);

	// Set diffbit
	thumbT_word1[0] = PUTBITSHIGH(thumbT_word1[0], 0, 1, 33);
	thumbT_word2[0] = thumbT59_word2;
}

// Tests if there is at least one pixel in the image which would get alpha = 0 in punchtrough mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function hasAlpha(alphaimg: uint8, ix: number, iy: number, width: number) {
	for (let x = ix; x < ix + 4; x++) {
		for (let y = iy; y < iy + 4; y++) {
			let index = x + y * width;
			if (alphaimg[index] < 128) {
				return true;
			}
		}
	}
	return false;
}

// Compress a block with ETC2 RGB
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC2Fast(img: uint8, alphaimg: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, format: number) {
	var etc1_word1 = new Uint32Array(1);
	var etc1_word2 = new Uint32Array(1);
	var error_etc1: number;

	var planar57_word1 = new Uint32Array(1);
	var planar57_word2 = new Uint32Array(1);
	var planar_word1 = new Uint32Array(1);
	var planar_word2 = new Uint32Array(1);
	var error_planar: number;

	var thumbT59_word1 = new Uint32Array(1);
	var thumbT59_word2 = new Uint32Array(1);
	var thumbT_word1 = new Uint32Array(1);
	var thumbT_word2 = new Uint32Array(1);
	var error_thumbT: number;

	var thumbH58_word1 = new Uint32Array(1);
	var thumbH58_word2 = new Uint32Array(1);
	var thumbH_word1 = new Uint32Array(1);
	var thumbH_word2 = new Uint32Array(1);
	var error_thumbH: number;

	var error_best: number;
	var best_char;
	var best_mode;

	if (format == ETC2PACKAGE_RGBA1_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA1_NO_MIPMAPS) {
		/*                if we have one-bit alpha, we never use the individual mode,
						  instead that bit flags that one of our four offsets will instead
								  mean transparent (with 0 offset for color channels) */

		/*                the regular ETC individual mode is disabled, but the old T, H and planar modes
								  are kept unchanged and may be used for blocks without transparency.
								  Introduced are old ETC with only differential coding,
								  ETC differential but with 3 offsets and transparent,
								  and T-mode with 3 colors plus transparent.*/

		/*                in a fairly hackish manner, error_etc1, etc1_word1 and etc1_word2 will
						  represent the best out of the three introduced modes, to be compared
								  with the three kept modes in the old code*/

		var tempword1 = new Uint32Array(1), tempword2 = new Uint32Array(1);
		var temperror;
		//try regular differential transparent mode

		var testerr = compressBlockDifferentialWithAlpha(true, img, alphaimg, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);

		var alphadec = new Uint8Array(width * height);
		decompressBlockDifferentialWithAlpha(etc1_word1[0], etc1_word2[0], imgdec, alphadec, width, height, startx, starty);
		error_etc1 = calcBlockErrorRGBA(img, imgdec, alphaimg, width, height, startx, starty);
		if (error_etc1 != testerr) {
			console.log(`testerr: ${testerr}, etcerr: ${error_etc1}`);
		}
		//try T-mode with transparencies
		//for now, skip this...
		compressBlockTHUMB59TAlpha(img, alphaimg, width, height, startx, starty, tempword1, tempword2);
		decompressBlockTHUMB59TAlpha(tempword1[0], tempword2[0], imgdec, alphadec, width, height, startx, starty);
		temperror = calcBlockErrorRGBA(img, imgdec, alphaimg, width, height, startx, starty);
		if (temperror < error_etc1) {
			error_etc1 = temperror;
			stuff59bitsDiffFalse(tempword1[0], tempword2[0], etc1_word1, etc1_word2);
		}
		compressBlockTHUMB58HAlpha(img, alphaimg, width, height, startx, starty, tempword1, tempword2);
		decompressBlockTHUMB58HAlpha(tempword1[0], tempword2[0], imgdec, alphadec, width, height, startx, starty);
		temperror = calcBlockErrorRGBA(img, imgdec, alphaimg, width, height, startx, starty);
		if (temperror < error_etc1) {
			error_etc1 = temperror;
			stuff58bitsDiffFalse(tempword1[0], tempword2[0], etc1_word1, etc1_word2);
		}
		//if we have transparency in this pixel, we know that one of these two modes was best..
		if (hasAlpha(alphaimg, startx, starty, width)) {
			compressed1[0] = etc1_word1[0];
			compressed2[0] = etc1_word2[0];
			//alphadec = null;
			return;
		}
		//error_etc1=255*255*1000;
		//otherwise, they MIGHT have been the best, although that's unlikely.. anyway, try old differential mode now

		compressBlockDifferentialWithAlpha(false, img, alphaimg, imgdec, width, height, startx, starty, tempword1, tempword2);
		decompressBlockDiffFlip(tempword1[0], tempword2[0], imgdec, width, height, startx, starty);
		temperror = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
		decompressBlockDifferentialWithAlpha(tempword1[0], tempword2[0], imgdec, alphadec, width, height, startx, starty);
		if (temperror < error_etc1) {
			error_etc1 = temperror;
			etc1_word1 = tempword1;
			etc1_word2 = tempword2;
		}
		//alphadec = null;
		//drop out of this if, and test old T, H and planar modes (we have already returned if there are transparent pixels in this block)
	}
	else {
		//this includes individual mode, and therefore doesn't apply in case of punch-through alpha.
		compressBlockDiffFlipFast(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);
		decompressBlockDiffFlip(etc1_word1[0], etc1_word2[0], imgdec, width, height, startx, starty);
		error_etc1 = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	}
	//these modes apply regardless of whether we want punch-through alpha or not.
	//error etc_1 and etc1_word1/etc1_word2 contain previous best candidate.
	compressBlockPlanar57(img, width, height, startx, starty, planar57_word1, planar57_word2);
	decompressBlockPlanar57(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty);
	error_planar = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);

	compressBlockTHUMB59TFastest(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2);
	decompressBlockTHUMB59T(thumbT59_word1[0], thumbT59_word2[0], imgdec, width, height, startx, starty);
	error_thumbT = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);

	compressBlockTHUMB58HFastest(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2);
	decompressBlockTHUMB58H(thumbH58_word1[0], thumbH58_word2[0], imgdec, width, height, startx, starty);
	error_thumbH = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);

	error_best = error_etc1;
	compressed1 = etc1_word1;
	compressed2 = etc1_word2;
	best_char = '.';
	best_mode = MODE_ETC1;

	if (error_planar < error_best) {
		compressed1 = planar_word1;
		compressed2 = planar_word2;
		best_char = 'p';
		error_best = error_planar;
		best_mode = MODE_PLANAR;
	}
	if (error_thumbT < error_best) {
		compressed1[0] = thumbT_word1[0];
		compressed2[0] = thumbT_word2[0];
		best_char = 'T';
		error_best = error_thumbT;
		best_mode = MODE_THUMB_T;
	}
	if (error_thumbH < error_best) {
		compressed1[0] = thumbH_word1[0];
		compressed2[0] = thumbH_word2[0];
		best_char = 'H';
		error_best = error_thumbH;
		best_mode = MODE_THUMB_H;
	}

	switch (best_mode) {
		// Now see which mode won and compress that a little bit harder
		case MODE_THUMB_T:
			compressBlockTHUMB59TFast(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2);
			decompressBlockTHUMB59T(thumbT59_word1[0], thumbT59_word2[0], imgdec, width, height, startx, starty);
			error_thumbT = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
			stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);
			if (error_thumbT < error_best) {
				compressed1 = thumbT_word1;
				compressed2 = thumbT_word2;
			}
			break;
		case MODE_THUMB_H:
			compressBlockTHUMB58HFast(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2);
			decompressBlockTHUMB58H(thumbH58_word1[0], thumbH58_word2[0], imgdec, width, height, startx, starty);
			error_thumbH = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
			stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);
			if (error_thumbH < error_best) {
				compressed1 = thumbH_word1;
				compressed2 = thumbH_word2;
			}
			break;
		default:
			break;
	}
}

// Compress an ETC2 RGB block using perceptual error metric
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC2FastPerceptual(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var etc1_word1 = new Uint32Array(1);
	var etc1_word2 = new Uint32Array(1);
	var error_etc1: number;

	var planar57_word1 = new Uint32Array(1);
	var planar57_word2 = new Uint32Array(1);
	var planar_word1 = new Uint32Array(1);
	var planar_word2 = new Uint32Array(1);
	var error_planar: number;

	var thumbT59_word1 = new Uint32Array(1);
	var thumbT59_word2 = new Uint32Array(1);
	var thumbT_word1 = new Uint32Array(1);
	var thumbT_word2 = new Uint32Array(1);
	var error_thumbT: number;

	var thumbH58_word1 = new Uint32Array(1);
	var thumbH58_word2 = new Uint32Array(1);
	var thumbH_word1 = new Uint32Array(1);
	var thumbH_word2 = new Uint32Array(1);
	var error_thumbH: number;

	var error_best: number;
	var best_char;
	var best_mode;

	compressBlockDiffFlipFastPerceptual(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);
	decompressBlockDiffFlip(etc1_word1[0], etc1_word2[0], imgdec, width, height, startx, starty);
	error_etc1 = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);

	compressBlockPlanar57(img, width, height, startx, starty, planar57_word1, planar57_word2);
	decompressBlockPlanar57(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty);
	error_planar = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);

	compressBlockTHUMB59TFastestPerceptual1000(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2);
	decompressBlockTHUMB59T(thumbT59_word1[0], thumbT59_word2[0], imgdec, width, height, startx, starty);
	error_thumbT = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);

	compressBlockTHUMB58HFastestPerceptual1000(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2);
	decompressBlockTHUMB58H(thumbH58_word1[0], thumbH58_word2[0], imgdec, width, height, startx, starty);
	error_thumbH = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);

	error_best = error_etc1;
	compressed1 = etc1_word1;
	compressed2 = etc1_word2;
	best_char = '.';
	best_mode = MODE_ETC1;

	if (error_planar < error_best) {
		compressed1 = planar_word1;
		compressed2 = planar_word2;
		best_char = 'p';
		error_best = error_planar;
		best_mode = MODE_PLANAR;
	}
	if (error_thumbT < error_best) {
		compressed1 = thumbT_word1;
		compressed2 = thumbT_word2;
		best_char = 'T';
		error_best = error_thumbT;
		best_mode = MODE_THUMB_T;
	}
	if (error_thumbH < error_best) {
		compressed1 = thumbH_word1;
		compressed2 = thumbH_word2;
		best_char = 'H';
		error_best = error_thumbH;
		best_mode = MODE_THUMB_H;
	}

	switch (best_mode) {
		// Now see which mode won and compress that a little bit harder
		case MODE_THUMB_T:
			compressBlockTHUMB59TFast(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2);
			decompressBlockTHUMB59T(thumbT59_word1[0], thumbT59_word2[0], imgdec, width, height, startx, starty);
			error_thumbT = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
			stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);
			if (error_thumbT < error_best) {
				compressed1 = thumbT_word1;
				compressed2 = thumbT_word2;
			}
			break;
		case MODE_THUMB_H:
			compressBlockTHUMB58HFast(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2);
			decompressBlockTHUMB58H(thumbH58_word1[0], thumbH58_word2[0], imgdec, width, height, startx, starty);
			error_thumbH = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
			stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);
			if (error_thumbH < error_best) {
				compressed1 = thumbH_word1;
				compressed2 = thumbH_word2;
			}
			break;
		default:
			break;
	}
}

// faked fopen
class fopen {
	data: uint8;
	off = 0;
	constructor(data: uint8) {
		this.off = 0;
		this.data = data;
	}
	fwrite(buffer: number[] | number | uint8, ElementSize: number, ElementCount: number) {
		if (typeof buffer == "number") {
			if(this.off > this.data.length){

			}
			this.data[this.off] = buffer;
			this.off++;
		} else {
			const totalBytesToWrite = 1 * ElementCount;
			const dataToWrite = buffer.slice(0, totalBytesToWrite);
			for (let i = 0; i < dataToWrite.length; i++) {
				const el = dataToWrite[i];
				this.data[this.off + i] = el;
				this.off++;
			}
		}
	}
	get get() {
		return this.data.slice(0,this.off);
	}
}

// Write a word in big endian style
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function write_big_endian_2byte_word(blockadr: Uint16Array, f: fopen) {
	var bytes = new Uint8Array(2);
	var block: number;

	block = blockadr[0];

	bytes[0] = (block >> 8) & 0xff;
	bytes[1] = (block >> 0) & 0xff;

	f.fwrite(bytes[0], 1, 1);
	f.fwrite(bytes[1], 1, 1);
}

// Write a word in big endian style
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function write_big_endian_4byte_word(blockadr: Uint32Array, f: fopen) {
	var bytes = new Uint8Array(4);
	var block;

	block = blockadr[0];

	bytes[0] = (block >> 24) & 0xff;
	bytes[1] = (block >> 16) & 0xff;
	bytes[2] = (block >> 8) & 0xff;
	bytes[3] = (block >> 0) & 0xff;

	f.fwrite(bytes[0], 1, 1);
	f.fwrite(bytes[1], 1, 1);
	f.fwrite(bytes[2], 1, 1);
	f.fwrite(bytes[3], 1, 1);
}

const alphaTable = Array.from({ length: 256 }, () => new Int32Array(8));
const alphaBase = [
	new Int32Array([-15, -9, -6, -3]),
	new Int32Array([-13, -10, -7, -3]),
	new Int32Array([-13, -8, -5, -2]),
	new Int32Array([-13, -6, -4, -2]),
	new Int32Array([-12, -8, -6, -3]),
	new Int32Array([-11, -9, -7, -3]),
	new Int32Array([-11, -8, -7, -4]),
	new Int32Array([-11, -8, -5, -3]),
	new Int32Array([-10, -8, -6, -2]),
	new Int32Array([-10, -8, -5, -2]),
	new Int32Array([-10, -8, -4, -2]),
	new Int32Array([-10, -7, -5, -2]),
	new Int32Array([-10, -7, -4, -3]),
	new Int32Array([-10, -3, -2, -1]),
	new Int32Array([-9, -8, -6, -4]),
	new Int32Array([-9, -7, -5, -3])
];

// valtab holds precalculated data used for compressing using EAC2.
// Note that valtab is constructed using get16bits11bits, which means
// that it already is expanded to 16 bits.
// Note also that it its contents will depend on the value of formatSigned.
const valtab = new Int32Array(1024 * 512);


function setupAlphaTableAndValtab() {
	setupAlphaTable();

	//fix precomputation table..!
	//valtab = new int[1024*512];
	var val16;
	var count = 0;
	for (let base = 0; base < 256; base++) {
		for (let tab = 0; tab < 16; tab++) {
			for (let mul = 0; mul < 16; mul++) {
				for (let index = 0; index < 8; index++) {
					if (formatSigned) {
						val16 = get16bits11signed(base, tab, mul, index);
						valtab[count] = val16 + 256 * 128;
					}
					else
						valtab[count] = get16bits11bits(base, tab, mul, index);
					count++;
				}
			}
		}
	}
}

// Reads alpha data
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function readAlpha(data: uint8, width: number, height: number, format: number) {
	//width and height are already known..?
	var tempdata = data;
	var returndata = data;
	var wantedBitDepth = 8; // only supports 8 bit alpha
	if (format == ETC2PACKAGE_RGBA_NO_MIPMAPS || format == ETC2PACKAGE_RGBA1_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA1_NO_MIPMAPS) {
		//wantedBitDepth=8;
	}
	else if (format == ETC2PACKAGE_R_NO_MIPMAPS) {
		//wantedBitDepth=16;
	}
	else {
		//console.log("invalid format for alpha reading!");
	}
	var extendedwidth = 4 * (((width + 3) / 4) >> 0);
	var extendedheight = 4 * (((height + 3) / 4) >> 0);

	if (width == extendedwidth && height == extendedheight) {
		return data;
	}
	else {
		returndata = malloc(data, extendedwidth * extendedheight * wantedBitDepth / 8);
		var last = 0;
		var lastlast = 0;
		for (let x = 0; x < extendedwidth; x++) {
			for (let y = 0; y < extendedheight; y++) {
				if (wantedBitDepth == 8) // only supports 8 bit alpha
				{
					if (x < width && y < height) {
						last = tempdata[x + y * width];
					}
					returndata[x + y * extendedwidth] = last;
				}
				else {
					if (x < width && y < height) {
						last = tempdata[(x + y * width) * 2];
						lastlast = tempdata[(x + y * width) * 2 + 1];
					}
					returndata[(x + y * extendedwidth) * 2] = last;
					returndata[(x + y * extendedwidth) * 2 + 1] = lastlast;
				}
			}
		}
	}
	if (format == ETC2PACKAGE_RGBA1_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA1_NO_MIPMAPS) {
		for (let x = 0; x < extendedwidth; x++) {
			for (let y = 0; y < extendedheight; y++) {
				if (returndata[x + y * extendedwidth] < 128)
					returndata[x + y * extendedwidth] = 0;
				else
					returndata[x + y * extendedwidth] = 255;
			}
		}
	}
	return returndata;
};


// Compresses the alpha part of a GL_COMPRESSED_RGBA8_ETC2_EAC block.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockAlphaFast(data: uint8, ix: number, iy: number, width: number, height: number, returnData: Uint8Array) {
	var alphasum = 0;
	var maxdist = -2;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			alphasum += data[ix + x + (iy + y) * width];
		}
	}
	var alpha = ((alphasum) / 16.0 + 0.5) >> 0; //average pixel value, used as guess for base value.
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			if (Math.abs(alpha - data[ix + x + (iy + y) * width]) > maxdist)
				maxdist = Math.abs(alpha - data[ix + x + (iy + y) * width]); //maximum distance from average
		}
	}
	var approxPos = ((maxdist * 255) / 160 - 4) >> 0;  //experimentally derived formula for calculating approximate table position given a max distance from average
	if (approxPos > 255)
		approxPos = 255;
	var startTable = approxPos - 15; //first table to be tested
	if (startTable < 0)
		startTable = 0;
	var endTable = clamp(approxPos + 15);  //last table to be tested

	var bestsum = 1000000000;
	var besttable = -3;
	var bestalpha = 128;
	var prevalpha = alpha;

	//main loop: determine best base alpha value and offset table to use for compression
	//try some different alpha tables.
	for (let table = startTable; table < endTable && bestsum > 0; table++) {
		var tablealpha = prevalpha;
		var tablebestsum = 1000000000;
		//test some different alpha values, trying to find the best one for the given table.	
		for (let alphascale = 16; alphascale > 0; alphascale /= 4) {
			var startalpha;
			var endalpha;
			if (alphascale == 16) {
				startalpha = clamp(tablealpha - alphascale * 4);
				endalpha = clamp(tablealpha + alphascale * 4);
			}
			else {
				startalpha = clamp(tablealpha - alphascale * 2);
				endalpha = clamp(tablealpha + alphascale * 2);
			}
			for (alpha = startalpha; alpha <= endalpha; alpha += alphascale) {
				var sum = 0;
				var val, diff, bestdiff = 10000000, index;
				for (let x = 0; x < 4; x++) {
					for (let y = 0; y < 4; y++) {
						//compute best offset here, add square difference to sum..
						val = data[ix + x + (iy + y) * width];
						bestdiff = 1000000000;
						//the values are always ordered from small to large, with the first 4 being negative and the last 4 positive
						//search is therefore made in the order 0-1-2-3 or 7-6-5-4, stopping when error increases compared to the previous entry tested.
						if (val > alpha) {
							for (index = 7; index > 3; index--) {
								diff = clamp_table[alpha + (alphaTable[table][index] >> 0) + 255] - val;
								diff *= diff;
								if (diff <= bestdiff) {
									bestdiff = diff;
								}
								else
									break;
							}
						}
						else {
							for (index = 0; index < 4; index++) {
								diff = clamp_table[alpha + (alphaTable[table][index] >> 0) + 255] - val;
								diff *= diff;
								if (diff < bestdiff) {
									bestdiff = diff;
								}
								else
									break;
							}
						}

						//best diff here is bestdiff, add it to sum!
						sum += bestdiff;
						//if the sum here is worse than previously best already, there's no use in continuing the count..
						//note that tablebestsum could be used for more precise estimation, but the speedup gained here is deemed more important.
						if (sum > bestsum) {
							x = 9999; //just to make it large and get out of the x<4 loop
							break;
						}
					}
				}
				if (sum < tablebestsum) {
					tablebestsum = sum;
					tablealpha = alpha;
				}
				if (sum < bestsum) {
					bestsum = sum;
					besttable = table;
					bestalpha = alpha;
				}
			}
			if (alphascale <= 2)
				alphascale = 0;
		}
	}

	alpha = bestalpha;

	//"good" alpha value and table are known!
	//store them, then loop through the pixels again and print indices.

	returnData[0] = alpha;
	returnData[1] = besttable;
	for (let pos = 2; pos < 8; pos++) {
		returnData[pos] = 0;
	}
	var byte = 2;
	var bit = 0;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			//find correct index
			var besterror = 1000000;
			var bestindex = 99;
			for (let index = 0; index < 8; index++) //no clever ordering this time, as this loop is only run once per block anyway
			{
				var error = (clamp(alpha + (alphaTable[besttable][index] >> 0)) - data[ix + x + (iy + y) * width]) * (clamp(alpha + (alphaTable[besttable][index] >> 0)) - data[ix + x + (iy + y) * width]);
				if (error < besterror) {
					besterror = error;
					bestindex = index;
				}
			}
			//best table index has been determined.
			//pack 3-bit index into compressed data, one bit at a time
			for (let numbit = 0; numbit < 3; numbit++) {
				returnData[byte] |= getbit(bestindex, 2 - numbit, 7 - bit);

				bit++;
				if (bit > 7) {
					bit = 0;
					byte++;
				}
			}
		}
	}
}

// Helper function for the below function
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function getPremulIndex(base: number, tab: number, mul: number, index: number) {
	return (base << 11) + (tab << 7) + (mul << 3) + index;
}

// Calculates the error used in compressBlockAlpha16()
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calcError(data: uint8, ix: number, iy: number, width: number, height: number, base: number, tab: number, mul: number, prevbest: number) {
	var offset = getPremulIndex(base, tab, mul, 0);
	var error = 0;
	for (let y = 0; y < 4; y++) {
		for (let x = 0; x < 4; x++) {
			var besthere = (1 << 20);
			besthere *= besthere;
			var byte1 = data[2 * (x + ix + (y + iy) * width)];
			var byte2 = data[2 * (x + ix + (y + iy) * width) + 1];
			var alpha = (byte1 << 8) + byte2;
			for (let index = 0; index < 8; index++) {
				var indexError;
				indexError = alpha - valtab[offset + index];
				indexError *= indexError;
				if (indexError < besthere)
					besthere = indexError;
			}
			error += besthere;
			if (error >= prevbest)
				return prevbest + (1 << 30);
		}
	}
	return error;
}

// compressBlockAlpha16
// 
// Compresses a block using the 11-bit EAC formats.
// Depends on the global variable formatSigned.
// 
// COMPRESSED_R11_EAC (if formatSigned = 0)
// This is an 11-bit unsigned format. Since we do not have a good 11-bit file format, we use 16-bit pgm instead.
// Here we assume that, in the input 16-bit pgm file, 0 represents 0.0 and 65535 represents 1.0. The function compressBlockAlpha16 
// will find the compressed block which best matches the data. In detail, it will find the compressed block, which 
// if decompressed, will generate an 11-bit block that after bit replication to 16-bits will generate the closest 
// block to the original 16-bit pgm block.
// 
// COMPRESSED_SIGNED_R11_EAC (if formatSigned = 1)
// This is an 11-bit signed format. Since we do not have any signed file formats, we use unsigned 16-bit pgm instead.
// Hence we assume that, in the input 16-bit pgm file, 1 represents -1.0, 32768 represents 0.0 and 65535 represents 1.0. 
// The function compresseBlockAlpha16 will find the compressed block, which if decompressed, will generate a signed
// 11-bit block that after bit replication to 16-bits and conversion to unsigned (1 equals -1.0, 32768 equals 0.0 and 
// 65535 equals 1.0) will generate the closest block to the original 16-bit pgm block. 
//
// COMPRESSED_RG11_EAC is compressed by calling the function twice, dito for COMPRESSED_SIGNED_RG11_EAC.
// 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockAlpha16(data: uint8, ix: number, iy: number, width: number, height: number, returnData: Uint8Array, formatSigned: number) {
	var bestbase = 0, besttable = 0, bestmul = 0;
	var besterror;
	besterror = 1 << 20;
	besterror *= besterror;
	for (let base = 0; base < 256; base++) {
		for (let table = 0; table < 16; table++) {
			for (let mul = 0; mul < 16; mul++) {
				var e = calcError(data, ix, iy, width, height, base, table, mul, besterror);
				if (e < besterror) {
					bestbase = base;
					besttable = table;
					bestmul = mul;
					besterror = e;
				}
			}
		}
	}
	returnData[0] = bestbase;
	returnData[1] = (bestmul << 4) + besttable;
	if (formatSigned) {
		//if we have a signed format, the base value should be given as a signed byte. 
		var signedbase = bestbase - 128;
		returnData[0] = signedbase;
	}

	for (let i = 2; i < 8; i++) {
		returnData[i] = 0;
	}

	var byte = 2;
	var bit = 0;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			let besterror = 255 * 255;
			besterror *= besterror;
			var bestindex = 99;
			var byte1 = data[2 * (x + ix + (y + iy) * width)];
			var byte2 = data[2 * (x + ix + (y + iy) * width) + 1];
			var alpha = (byte1 << 8) + byte2;
			for (let index = 0; index < 8; index++) {
				var indexError;
				if (formatSigned) {
					var val16;
					var val;
					val16 = get16bits11signed(bestbase, besttable, bestmul, index);
					val = val16 + 256 * 128;
					indexError = alpha - val;
				}
				else
					indexError = alpha - get16bits11bits(bestbase, besttable, bestmul, index);

				indexError *= indexError;
				if (indexError < besterror) {
					besterror = indexError;
					bestindex = index;
				}
			}

			for (let numbit = 0; numbit < 3; numbit++) {
				returnData[byte] |= getbit(bestindex, 2 - numbit, 7 - bit);
				bit++;
				if (bit > 7) {
					bit = 0;
					byte++;
				}
			}
		}
	}
}

// Exhaustive compression of alpha compression in a GL_COMPRESSED_RGB8_ETC2 block
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockAlphaSlow(data: uint8, ix: number, iy: number, width: number, height: number, returnData: Uint8Array) {
	//determine the best table and base alpha value for this block using MSE
	var alphasum = 0;
	var maxdist = -2;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			alphasum += data[ix + x + (iy + y) * width];
		}
	}
	var alpha = ((alphasum) / 16.0 + 0.5) >> 0; //average pixel value, used as guess for base value.

	var bestsum = 1000000000;
	var besttable = -3;
	var bestalpha = 128;
	var prevalpha = alpha;

	//main loop: determine best base alpha value and offset table to use for compression
	//try some different alpha tables.
	for (let table = 0; table < 256 && bestsum > 0; table++) {
		var tablealpha = prevalpha;
		var tablebestsum = 1000000000;
		//test some different alpha values, trying to find the best one for the given table.
		for (let alphascale = 32; alphascale > 0; alphascale /= 8) {

			var startalpha = clamp(tablealpha - alphascale * 4);
			var endalpha = clamp(tablealpha + alphascale * 4);

			for (alpha = startalpha; alpha <= endalpha; alpha += alphascale) {
				var sum = 0;
				var val, diff, bestdiff = 10000000, index;
				for (let x = 0; x < 4; x++) {
					for (let y = 0; y < 4; y++) {
						//compute best offset here, add square difference to sum..
						val = data[ix + x + (iy + y) * width];
						bestdiff = 1000000000;
						//the values are always ordered from small to large, with the first 4 being negative and the last 4 positive
						//search is therefore made in the order 0-1-2-3 or 7-6-5-4, stopping when error increases compared to the previous entry tested.
						if (val > alpha) {
							for (index = 7; index > 3; index--) {
								diff = clamp_table[alpha + (alphaTable[table][index]) + 255] - val;
								diff *= diff;
								if (diff <= bestdiff) {
									bestdiff = diff;
								}
								else
									break;
							}
						}
						else {
							for (index = 0; index < 5; index++) {
								diff = clamp_table[alpha + (alphaTable[table][index]) + 255] - val;
								diff *= diff;
								if (diff < bestdiff) {
									bestdiff = diff;
								}
								else
									break;
							}
						}

						//best diff here is bestdiff, add it to sum!
						sum += bestdiff;
						//if the sum here is worse than previously best already, there's no use in continuing the count..
						if (sum > tablebestsum) {
							x = 9999; //just to make it large and get out of the x<4 loop
							break;
						}
					}
				}
				if (sum < tablebestsum) {
					tablebestsum = sum;
					tablealpha = alpha;
				}
				if (sum < bestsum) {
					bestsum = sum;
					besttable = table;
					bestalpha = alpha;
				}
			}
			if (alphascale == 4)
				alphascale = 8;
		}
	}

	alpha = bestalpha;
	//the best alpha value and table are known!
	//store them, then loop through the pixels again and print indices.
	returnData[0] = alpha;
	returnData[1] = besttable;
	for (let pos = 2; pos < 8; pos++) {
		returnData[pos] = 0;
	}
	var byte = 2;
	var bit = 0;
	for (let x = 0; x < 4; x++) {
		for (let y = 0; y < 4; y++) {
			//find correct index
			var besterror = 1000000;
			var bestindex = 99;
			for (let index = 0; index < 8; index++) //no clever ordering this time, as this loop is only run once per block anyway
			{
				var error = (clamp(alpha + (alphaTable[besttable][index])) - data[ix + x + (iy + y) * width]) * (clamp(alpha + (alphaTable[besttable][index])) - data[ix + x + (iy + y) * width]);
				if (error < besterror) {
					besterror = error;
					bestindex = index;
				}
			}
			//best table index has been determined.
			//pack 3-bit index into compressed data, one bit at a time
			for (let numbit = 0; numbit < 3; numbit++) {
				returnData[byte] |= getbit(bestindex, 2 - numbit, 7 - bit);

				bit++;
				if (bit > 7) {
					bit = 0;
					byte++;
				}
			}
		}
	}
}


// Calculate weighted PSNR
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateWeightedPSNR(lossyimg: uint8, origimg: uint8, width: number, height: number, w1: number, w2: number, w3: number) {
	// Note: This calculation of PSNR uses the formula
	//
	// PSNR = 10 * log_10 ( 255^2 / wMSE ) 
	// 
	// where the wMSE is calculated as
	//
	// 1/(N*M) * sum ( ( w1*(R' - R)^2 + w2*(G' - G)^2 + w3*(B' - B)^2) ) 
	//
	// typical weights are  0.299,   0.587,   0.114  for perceptually weighted PSNR and
	//                     1.0/3.0, 1.0/3.0, 1.0/3.0 for nonweighted PSNR

	var x, y;
	var wMSE;
	var PSNR;
	var err;
	wMSE = 0;

	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			err = lossyimg[y * width * 3 + x * 3 + 0] - origimg[y * width * 3 + x * 3 + 0];
			wMSE = wMSE + (w1 * (err * err));
			err = lossyimg[y * width * 3 + x * 3 + 1] - origimg[y * width * 3 + x * 3 + 1];
			wMSE = wMSE + (w2 * (err * err));
			err = lossyimg[y * width * 3 + x * 3 + 2] - origimg[y * width * 3 + x * 3 + 2];
			wMSE = wMSE + (w3 * (err * err));
		}
	}
	wMSE = wMSE / (width * height);
	if (wMSE == 0) {
		console.log("********************************************************************");
		console.log("There is no difference at all between image files --- infinite PSNR.");
		console.log("********************************************************************");
	}
	PSNR = 10 * Math.log((1.0 * 255 * 255) / wMSE) / Math.log(10.0);
	return PSNR;
}

// Calculate unweighted PSNR (weights are (1,1,1))
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculatePSNR(lossyimg: uint8, origimg: uint8, width: number, height: number) {
	// Note: This calculation of PSNR uses the formula
	//
	// PSNR = 10 * log_10 ( 255^2 / MSE ) 
	// 
	// where the MSE is calculated as
	//
	// 1/(N*M) * sum ( 1/3 * ((R' - R)^2 + (G' - G)^2 + (B' - B)^2) ) 
	//
	// The reason for having the 1/3 factor is the following:
	// Presume we have a grayscale image, that is acutally just the red component 
	// of a color image.. The squared error is then (R' - R)^2.
	// Assume that we have a certain signal to noise ratio, say 30 dB. If we add
	// another two components (say green and blue) with the same signal to noise 
	// ratio, we want the total signal to noise ratio be the same. For the
	// squared error to remain constant we must divide by three after adding
	// together the squared errors of the components. 

	return calculateWeightedPSNR(lossyimg, origimg, width, height, (1.0 / 3.0), (1.0 / 3.0), (1.0 / 3.0));
}

// Decompresses a file (handled external)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function uncompressFile(srcfile: uint8, img: uint8, alphaimg: uint8, active_width: Int32Array, active_height: Int32Array) {
	// handled external
}

// Writes output file (handled external)
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function writeOutputFile(dstfile: uint8, img: uint8, alphaimg: uint8, width: number, height: number) {
	// handled external
}

// Calculates the PSNR between two files
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculatePSNRfile(img: uint8, alphaimg: uint8, origimg: uint8, origalpha: uint8, active_width: number, active_height: number, format: number) {
	//uint8 *alphaimg, *img;
	//int active_width, active_height;
	//uncompressFile(srcfile,img,alphaimg,active_width,active_height);

	// calculate Mean Square Error (MSE)
	var MSER = 0, MSEG = 0, MSEB = 0, MSEA, PSNRR, PSNRG, PSNRA;
	var MSE;
	var wMSE;
	var PSNR = 0;
	var wPSNR;
	var err;
	MSE = 0;
	MSEA = 0;
	wMSE = 0;
	var width = (((active_width + 3) / 4) * 4) >> 0;
	var height = (((active_height + 3) / 4) * 4) >> 0;
	var numpixels = 0;
	for (let y = 0; y < active_height; y++) {
		for (let x = 0; x < active_width; x++) {
			if (format != ETC2PACKAGE_R_NO_MIPMAPS && format != ETC2PACKAGE_RG_NO_MIPMAPS) {
				//we have regular color channels..
				if ((format != ETC2PACKAGE_RGBA1_NO_MIPMAPS && format != ETC2PACKAGE_sRGBA1_NO_MIPMAPS) || alphaimg[y * width + x] > 0) {
					err = img[y * active_width * 3 + x * 3 + 0] - origimg[y * width * 3 + x * 3 + 0];
					MSE += ((err * err) / 3.0);
					wMSE += PERCEPTUAL_WEIGHT_R_SQUARED * (err * err);
					err = img[y * active_width * 3 + x * 3 + 1] - origimg[y * width * 3 + x * 3 + 1];
					MSE += ((err * err) / 3.0);
					wMSE += PERCEPTUAL_WEIGHT_G_SQUARED * (err * err);
					err = img[y * active_width * 3 + x * 3 + 2] - origimg[y * width * 3 + x * 3 + 2];
					MSE += ((err * err) / 3.0);
					wMSE += PERCEPTUAL_WEIGHT_B_SQUARED * (err * err);
					numpixels++;
				}
			}
			else if (format == ETC2PACKAGE_RG_NO_MIPMAPS) {
				var rorig = (origimg[6 * (y * width + x) + 0] << 8) + origimg[6 * (y * width + x) + 1];
				var rnew = (img[6 * (y * active_width + x) + 0] << 8) + img[6 * (y * active_width + x) + 1];
				var gorig = (origimg[6 * (y * width + x) + 2] << 8) + origimg[6 * (y * width + x) + 3];
				var gnew = (img[6 * (y * active_width + x) + 2] << 8) + img[6 * (y * active_width + x) + 3];
				err = rorig - rnew;
				MSER += (err * err);
				err = gorig - gnew;
				MSEG += (err * err);
			}
			else if (format == ETC2PACKAGE_R_NO_MIPMAPS) {
				var aorig = ((origalpha[2 * (y * width + x) + 0] >> 0) << 8) + origalpha[2 * (y * width + x) + 1];
				var anew = ((alphaimg[2 * (y * active_width + x) + 0] >> 0) << 8) + alphaimg[2 * (y * active_width + x) + 1];
				err = aorig - anew;
				MSEA += (err * err);
			}
		}
	}
	if (format == ETC2PACKAGE_RGBA1_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA1_NO_MIPMAPS) {
		MSE = MSE / (1.0 * numpixels);
		wMSE = wMSE / (1.0 * numpixels);
		PSNR = 10 * Math.log((1.0 * 255 * 255) / MSE) / Math.log(10.0);
		wPSNR = 10 * Math.log((1.0 * 255 * 255) / wMSE) / Math.log(10.0);
		console.log("PSNR only calculated on pixels where compressed alpha > 0");
		console.log(`color PSNR: ${PSNR}\nweighted PSNR: ${wPSNR}`);
	}
	else if (format != ETC2PACKAGE_R_NO_MIPMAPS && format != ETC2PACKAGE_RG_NO_MIPMAPS) {
		MSE = MSE / (active_width * active_height);
		wMSE = wMSE / (active_width * active_height);
		PSNR = 10 * Math.log((1.0 * 255 * 255) / MSE) / Math.log(10.0);
		wPSNR = 10 * Math.log((1.0 * 255 * 255) / wMSE) / Math.log(10.0);
		if (format == ETC2PACKAGE_RGBA_NO_MIPMAPS || format == ETC2PACKAGE_sRGBA_NO_MIPMAPS)
			console.log("PSNR only calculated on RGB, not on alpha");
		console.log(`color PSNR: ${PSNR}\nweighted PSNR: ${wPSNR}`);
	}
	else if (format == ETC2PACKAGE_RG_NO_MIPMAPS) {
		MSER = MSER / (active_width * active_height);
		MSEG = MSEG / (active_width * active_height);
		PSNRR = 10 * Math.log((1.0 * 65535 * 65535) / MSER) / Math.log(10.0);
		PSNRG = 10 * Math.log((1.0 * 65535 * 65535) / MSEG) / Math.log(10.0);
		console.log(`red PSNR: ${PSNRR}\ngreen PSNR: ${PSNRG}`);
	}
	else if (format == ETC2PACKAGE_R_NO_MIPMAPS) {
		MSEA = MSEA / (active_width * active_height);
		PSNRA = 10 * Math.log((1.0 * 65535.0 * 65535.0) / MSEA) / Math.log(10.0);
		console.log(`PSNR: ${PSNRA}`);
	}
	//free(img);
	return PSNR;
}

//// Exhaustive code starts here.

// Precomutes a table that is used when compressing a block exhaustively
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precompute_3bittable_all_subblocksRG_withtest_perceptual1000(block: uint8, avg_color: uint8, precalc_err_UL_R: Uint32Array, precalc_err_UR_R: Uint32Array, precalc_err_LL_R: Uint32Array, precalc_err_LR_R: Uint32Array, precalc_err_UL_RG: Uint32Array, precalc_err_UR_RG: Uint32Array, precalc_err_LL_RG: Uint32Array, precalc_err_LR_RG: Uint32Array, best_err: number) {
	var table;
	var index;
	var orig = new Int32Array(3), approx = Array.from({ length: 3 }, () => new Int32Array(4));
	var x;
	var intensity_modifier;
	//const int *table_indices;

	var good_enough_to_test;
	var err = new Uint32Array(4);
	var err_this_table_upper;
	var err_this_table_lower;
	var err_this_table_left;
	var err_this_table_right;

	// If the error in the red and green component is already larger than best_err for all 8 tables in 
	// all of upper, lower, left and right, this combination of red and green will never be used in 
	// the optimal color configuration. Therefore we can avoid testing all the blue colors for this 
	// combination. 
	good_enough_to_test = false;

	for (table = 0; table < 8; table++)		// try all the 8 tables. 
	{

		intensity_modifier = compressParamsFast[table * 4 + 0];
		approx[1][0] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 1];
		approx[1][1] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 2];
		approx[1][2] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 3];
		approx[1][3] = CLAMP(0, avg_color[1] + intensity_modifier, 255);

		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;
		for (x = 0; x < 4; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_UL_R[table * 4 * 4 + x * 4 + index]
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(approx[1][index] - orig[1]);
				precalc_err_UL_RG[table * 4 * 4 + x * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_left += err[0];
		}
		for (x = 4; x < 8; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_UR_R[table * 4 * 4 + (x - 4) * 4 + index]
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(approx[1][index] - orig[1]);
				precalc_err_UR_RG[table * 4 * 4 + (x - 4) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_right += err[0];
		}
		for (x = 8; x < 12; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_LL_R[table * 4 * 4 + (x - 8) * 4 + index]
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(approx[1][index] - orig[1]);
				precalc_err_LL_RG[table * 4 * 4 + (x - 8) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_left += err[0];
		}
		for (x = 12; x < 16; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_LR_R[table * 4 * 4 + (x - 12) * 4 + index]
					+ PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * SQUARE(approx[1][index] - orig[1]);
				precalc_err_LR_RG[table * 4 * 4 + (x - 12) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_right += err[0];
		}
		if (err_this_table_upper < best_err)
			good_enough_to_test = true;
		if (err_this_table_lower < best_err)
			good_enough_to_test = true;
		if (err_this_table_left < best_err)
			good_enough_to_test = true;
		if (err_this_table_right < best_err)
			good_enough_to_test = true;
	}
	return good_enough_to_test;
}

// Precomutes a table that is used when compressing a block exhaustively
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precompute_3bittable_all_subblocksRG_withtest(block: uint8, avg_color: uint8, precalc_err_UL_R: Uint32Array, precalc_err_UR_R: Uint32Array, precalc_err_LL_R: Uint32Array, precalc_err_LR_R: Uint32Array, precalc_err_UL_RG: Uint32Array, precalc_err_UR_RG: Uint32Array, precalc_err_LL_RG: Uint32Array, precalc_err_LR_RG: Uint32Array, best_err: number) {
	var table;
	var index;
	var orig = new Int32Array(3), approx = Array.from({ length: 3 }, () => new Int32Array(4));
	var x;
	var intensity_modifier;
	//const int *table_indices;

	var err = new Uint32Array(4);
	var err_this_table_upper;
	var err_this_table_lower;
	var err_this_table_left;
	var err_this_table_right;

	// If the error in the red and green component is already larger than best_err for all 8 tables in 
	// all of upper, lower, left and right, this combination of red and green will never be used in 
	// the optimal color configuration. Therefore we can avoid testing all the blue colors for this 
	// combination. 
	var good_enough_to_test = false;

	for (table = 0; table < 8; table++)		// try all the 8 tables. 
	{

		intensity_modifier = compressParamsFast[table * 4 + 0];
		approx[1][0] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 1];
		approx[1][1] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 2];
		approx[1][2] = CLAMP(0, avg_color[1] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 3];
		approx[1][3] = CLAMP(0, avg_color[1] + intensity_modifier, 255);

		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;
		for (x = 0; x < 4; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_UL_R[table * 4 * 4 + x * 4 + index] + SQUARE(approx[1][index] - orig[1]);
				precalc_err_UL_RG[table * 4 * 4 + x * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_left += err[0];
		}
		for (x = 4; x < 8; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_UR_R[table * 4 * 4 + (x - 4) * 4 + index] + SQUARE(approx[1][index] - orig[1]);
				precalc_err_UR_RG[table * 4 * 4 + (x - 4) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_right += err[0];
		}
		for (x = 8; x < 12; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_LL_R[table * 4 * 4 + (x - 8) * 4 + index] + SQUARE(approx[1][index] - orig[1]);
				precalc_err_LL_RG[table * 4 * 4 + (x - 8) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_left += err[0];
		}
		for (x = 12; x < 16; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = precalc_err_LR_R[table * 4 * 4 + (x - 12) * 4 + index] + SQUARE(approx[1][index] - orig[1]);
				precalc_err_LR_RG[table * 4 * 4 + (x - 12) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_right += err[0];
		}
		if (err_this_table_upper < best_err)
			good_enough_to_test = true;
		if (err_this_table_lower < best_err)
			good_enough_to_test = true;
		if (err_this_table_left < best_err)
			good_enough_to_test = true;
		if (err_this_table_right < best_err)
			good_enough_to_test = true;
	}
	return good_enough_to_test ? 1 : 0;
}

// Precomutes a table that is used when compressing a block exhaustively
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precompute_3bittable_all_subblocksR_with_test_perceptual1000(block: uint8, avg_color: uint8, precalc_err_UL_R: Uint32Array, precalc_err_UR_R: Uint32Array, precalc_err_LL_R: Uint32Array, precalc_err_LR_R: Uint32Array, best_err: number) {
	var table;
	var index;
	var orig = new Int32Array(3), approx = Array.from({ length: 3 }, () => new Int32Array(4));
	var x;
	var intensity_modifier;
	//var table_indices: number;

	var err = new Uint32Array(4);
	var err_this_table_upper;
	var err_this_table_lower;
	var err_this_table_left;
	var err_this_table_right;

	var good_enough_to_test;

	good_enough_to_test = false;

	for (table = 0; table < 8; table++)		// try all the 8 tables. 
	{
		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;

		intensity_modifier = compressParamsFast[table * 4 + 0];
		approx[0][0] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 1];
		approx[0][1] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 2];
		approx[0][2] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 3];
		approx[0][3] = CLAMP(0, avg_color[0] + intensity_modifier, 255);

		for (x = 0; x < 4; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(approx[0][index] - orig[0]);
				precalc_err_UL_R[table * 4 * 4 + x * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_left += err[0];
		}
		for (x = 4; x < 8; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(approx[0][index] - orig[0]);
				precalc_err_UR_R[table * 4 * 4 + (x - 4) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_right += err[0];
		}
		for (x = 8; x < 12; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(approx[0][index] - orig[0]);
				precalc_err_LL_R[table * 4 * 4 + (x - 8) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_left += err[0];

		}
		for (x = 12; x < 16; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * SQUARE(approx[0][index] - orig[0]);
				precalc_err_LR_R[table * 4 * 4 + (x - 12) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_right += err[0];
		}
		if (err_this_table_upper < best_err)
			good_enough_to_test = true;
		if (err_this_table_lower < best_err)
			good_enough_to_test = true;
		if (err_this_table_left < best_err)
			good_enough_to_test = true;
		if (err_this_table_right < best_err)
			good_enough_to_test = true;
	}
	return good_enough_to_test ? 1 : 0;
}

// Precomutes a table that is used when compressing a block exhaustively
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precompute_3bittable_all_subblocksR_with_test(block: uint8, avg_color: uint8, precalc_err_UL_R: Uint32Array, precalc_err_UR_R: Uint32Array, precalc_err_LL_R: Uint32Array, precalc_err_LR_R: Uint32Array, best_err: number) {
	var table;
	var index;
	var orig = new Int32Array(3), approx = Array.from({ length: 3 }, () => new Int32Array(4));
	var x;
	var intensity_modifier;
	//const int *table_indices;

	var err = new Int32Array(4);
	var err_this_table_upper;
	var err_this_table_lower;
	var err_this_table_left;
	var err_this_table_right;

	var good_enough_to_test = false;

	for (table = 0; table < 8; table++)		// try all the 8 tables. 
	{
		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;

		intensity_modifier = compressParamsFast[table * 4 + 0];
		approx[0][0] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 1];
		approx[0][1] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 2];
		approx[0][2] = CLAMP(0, avg_color[0] + intensity_modifier, 255);
		intensity_modifier = compressParamsFast[table * 4 + 3];
		approx[0][3] = CLAMP(0, avg_color[0] + intensity_modifier, 255);

		for (x = 0; x < 4; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = SQUARE(approx[0][index] - orig[0]);
				precalc_err_UL_R[table * 4 * 4 + x * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_left += err[0];
		}
		for (x = 4; x < 8; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];
			for (index = 0; index < 4; index++) {
				err[index] = SQUARE(approx[0][index] - orig[0]);
				precalc_err_UR_R[table * 4 * 4 + (x - 4) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_upper += err[0];
			err_this_table_right += err[0];
		}
		for (x = 8; x < 12; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = SQUARE(approx[0][index] - orig[0]);
				precalc_err_LL_R[table * 4 * 4 + (x - 8) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_left += err[0];

		}
		for (x = 12; x < 16; x++) {
			orig[0] = block[x * 4];
			orig[1] = block[x * 4 + 1];
			orig[2] = block[x * 4 + 2];

			for (index = 0; index < 4; index++) {
				err[index] = SQUARE(approx[0][index] - orig[0]);
				precalc_err_LR_R[table * 4 * 4 + (x - 12) * 4 + index] = err[index];
			}
			if (err[0] > err[1])
				err[0] = err[1];
			if (err[2] > err[3])
				err[2] = err[3];
			if (err[0] > err[2])
				err[0] = err[2];
			err_this_table_lower += err[0];
			err_this_table_right += err[0];
		}
		if (err_this_table_upper < best_err)
			good_enough_to_test = true;
		if (err_this_table_lower < best_err)
			good_enough_to_test = true;
		if (err_this_table_left < best_err)
			good_enough_to_test = true;
		if (err_this_table_right < best_err)
			good_enough_to_test = true;
	}
	return good_enough_to_test ? 1 : 0;
}

// Tries all index-tables, used when compressing a block exhaustively
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable_all_subblocks_using_precalc(block_2x2: uint8, color_quant1: uint8, precalc_err_UL_RG: Uint32Array, precalc_err_UR_RG: Uint32Array, precalc_err_LL_RG: Uint32Array, precalc_err_LR_RG: Uint32Array, err_upper: Uint32Array, err_lower: Uint32Array, err_left: Uint32Array, err_right: Uint32Array, best_err: number) {
	var err_this_table_upper = 0;
	var err_this_table_lower = 0;
	var err_this_table_left = 0;
	var err_this_table_right = 0;
	var orig = new Int32Array(3), approx = new Int32Array(4);
	var err = new Int32Array(4);
	err_upper[0] = 3 * 255 * 255 * 16;
	err_lower[0] = 3 * 255 * 255 * 16;
	err_left[0] = 3 * 255 * 255 * 16;
	err_right[0] = 3 * 255 * 255 * 16;

	function ONE_PIXEL_UL(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 0] + square_table[approx[0] - orig[2]];
		err[1] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 1] + square_table[approx[1] - orig[2]];
		err[2] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 2] + square_table[approx[2] - orig[2]];
		err[3] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 3] + square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_upper += err[0];
		err_this_table_left += err[0];
	}
	function ONE_PIXEL_UR(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 0] + square_table[approx[0] - orig[2]];
		err[1] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 1] + square_table[approx[1] - orig[2]];
		err[2] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 2] + square_table[approx[2] - orig[2]];
		err[3] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 3] + square_table[approx[3] - orig[2]];
		/* end unrolled loop */
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_upper += err[0];
		err_this_table_right += err[0];
	}
	function ONE_PIXEL_LL(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 0] + square_table[approx[0] - orig[2]];
		err[1] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 1] + square_table[approx[1] - orig[2]];
		err[2] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 2] + square_table[approx[2] - orig[2]];
		err[3] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 3] + square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_lower += err[0];
		err_this_table_left += err[0];
	}
	function ONE_PIXEL_LR(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 0] + square_table[approx[0] - orig[2]];
		err[1] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 1] + square_table[approx[1] - orig[2]];
		err[2] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 2] + square_table[approx[2] - orig[2]];
		err[3] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 3] + square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_lower += err[0];
		err_this_table_right += err[0];
	}
	function ONE_TABLE_3(table_nbr: number) {
		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;
		approx[0] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 0] + 255];
		approx[1] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 1] + 255];
		approx[2] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 2] + 255];
		approx[3] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 3] + 255];
		/* unroll loop for(xx=0; xx<4; xx++) */
		ONE_PIXEL_UL(table_nbr, 0)
		ONE_PIXEL_UL(table_nbr, 1)
		ONE_PIXEL_UL(table_nbr, 2)
		ONE_PIXEL_UL(table_nbr, 3)
		/* end unroll loop */
		/* unroll loop for(xx=4; xx<8; xx++) */
		ONE_PIXEL_LR(table_nbr, 12)
		ONE_PIXEL_LR(table_nbr, 13)
		ONE_PIXEL_LR(table_nbr, 14)
		ONE_PIXEL_LR(table_nbr, 15)
		/* end unroll loop */
		/* If error in the top left 2x2 pixel area is already larger than the best error, and */
		/* The same is true for the bottom right 2x2 pixel area, this combination of table and color */
		/* can never be part of an optimal solution and therefore we do not need to test the other */
		/* two 2x2 pixel areas */
		if ((err_this_table_upper < best_err) || (err_this_table_lower < best_err)) {
			/* unroll loop for(xx=4; xx<8; xx++) */
			ONE_PIXEL_UR(table_nbr, 4)
			ONE_PIXEL_UR(table_nbr, 5)
			ONE_PIXEL_UR(table_nbr, 6)
			ONE_PIXEL_UR(table_nbr, 7)
			/* end unroll loop */
			/* unroll loop for(xx=4; xx<8; xx++) */
			ONE_PIXEL_LL(table_nbr, 8)
			ONE_PIXEL_LL(table_nbr, 9)
			ONE_PIXEL_LL(table_nbr, 10)
			ONE_PIXEL_LL(table_nbr, 11)
			/* end unroll loop */
			if (err_this_table_upper < err_upper[0])
				err_upper[0] = err_this_table_upper;
			if (err_this_table_lower < err_lower[0])
				err_lower[0] = err_this_table_lower;
			if (err_this_table_left < err_left[0])
				err_left[0] = err_this_table_left;
			if (err_this_table_right < err_right[0])
				err_right[0] = err_this_table_right;
		}
	}
	/*unroll loop for(table_nbr=0;table_nbr<8;table_nbr++)*/
	ONE_TABLE_3(0);
	ONE_TABLE_3(1);
	ONE_TABLE_3(2);
	ONE_TABLE_3(3);
	ONE_TABLE_3(4);
	ONE_TABLE_3(5);
	ONE_TABLE_3(6);
	ONE_TABLE_3(7);
	/*end unroll loop*/
}

// Tries all index-tables, used when compressing a block exhaustively using perceptual error measure
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function tryalltables_3bittable_all_subblocks_using_precalc_perceptual1000(block_2x2: Uint8Array | Buffer, color_quant1: Uint8Array | Buffer, precalc_err_UL_RG: Uint32Array, precalc_err_UR_RG: Uint32Array, precalc_err_LL_RG: Uint32Array, precalc_err_LR_RG: Uint32Array, err_upper: Uint32Array, err_lower: Uint32Array, err_left: Uint32Array, err_right: Uint32Array, best_err: number) {
	var err_this_table_upper = 0;
	var err_this_table_lower = 0;
	var err_this_table_left = 0;
	var err_this_table_right = 0;
	var orig = new Int32Array(3), approx = new Int32Array(4);
	var err = new Int32Array(4);
	err_upper[0] = MAXERR1000;
	err_lower[0] = MAXERR1000;
	err_left[0] = MAXERR1000;
	err_right[0] = MAXERR1000;

	function ONE_PIXEL_UL_PERCEP(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 0] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[0] - orig[2]];
		err[1] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 1] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[1] - orig[2]];
		err[2] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 2] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[2] - orig[2]];
		err[3] = precalc_err_UL_RG[table_nbr * 4 * 4 + xx * 4 + 3] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_upper += err[0];
		err_this_table_left += err[0];
	}

	function ONE_PIXEL_UR_PERCEP(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 0] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[0] - orig[2]];
		err[1] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 1] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[1] - orig[2]];
		err[2] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 2] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[2] - orig[2]];
		err[3] = precalc_err_UR_RG[table_nbr * 4 * 4 + (xx - 4) * 4 + 3] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[3] - orig[2]];
		/* end unrolled loop */
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_upper += err[0];
		err_this_table_right += err[0];
	}
	function ONE_PIXEL_LL_PERCEP(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 0] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[0] - orig[2]];
		err[1] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 1] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[1] - orig[2]];
		err[2] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 2] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[2] - orig[2]];
		err[3] = precalc_err_LL_RG[table_nbr * 4 * 4 + (xx - 8) * 4 + 3] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_lower += err[0];
		err_this_table_left += err[0];
	}
	function ONE_PIXEL_LR_PERCEP(table_nbr: number, xx: number) {
		orig[0] = block_2x2[xx * 4];
		orig[1] = block_2x2[xx * 4 + 1];
		orig[2] = block_2x2[xx * 4 + 2];
		/* unrolled loop for(index=0;index<4;index++)*/
		err[0] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 0] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[0] - orig[2]];
		err[1] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 1] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[1] - orig[2]];
		err[2] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 2] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[2] - orig[2]];
		err[3] = precalc_err_LR_RG[table_nbr * 4 * 4 + (xx - 12) * 4 + 3] + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000 * square_table[approx[3] - orig[2]];
		/* end unrolled loop*/
		if (err[0] > err[1])
			err[0] = err[1];
		if (err[2] > err[3])
			err[2] = err[3];
		if (err[0] > err[2])
			err[0] = err[2];
		err_this_table_lower += err[0];
		err_this_table_right += err[0];
	}
	function ONE_TABLE_3_PERCEP(table_nbr: number) {
		err_this_table_upper = 0;
		err_this_table_lower = 0;
		err_this_table_left = 0;
		err_this_table_right = 0;
		approx[0] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 0] + 255];
		approx[1] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 1] + 255];
		approx[2] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 2] + 255];
		approx[3] = clamp_table_plus_255[color_quant1[2] + compressParamsFast[table_nbr * 4 + 3] + 255];
		/* unroll loop for(xx=0; xx<4; xx++) */
		ONE_PIXEL_UL_PERCEP(table_nbr, 0)
		ONE_PIXEL_UL_PERCEP(table_nbr, 1)
		ONE_PIXEL_UL_PERCEP(table_nbr, 2)
		ONE_PIXEL_UL_PERCEP(table_nbr, 3)
		/* end unroll loop */
		/* unroll loop for(xx=4; xx<8; xx++) */
		ONE_PIXEL_LR_PERCEP(table_nbr, 12)
		ONE_PIXEL_LR_PERCEP(table_nbr, 13)
		ONE_PIXEL_LR_PERCEP(table_nbr, 14)
		ONE_PIXEL_LR_PERCEP(table_nbr, 15)
		/* end unroll loop */
		/* If error in the top left 2x2 pixel area is already larger than the best error, and */
		/* The same is true for the bottom right 2x2 pixel area, this combination of table and color */
		/* can never be part of an optimal solution and therefore we do not need to test the other */
		/* two 2x2 pixel areas */
		if ((err_this_table_upper < best_err) || (err_this_table_lower < best_err)) {
			/* unroll loop for(xx=4; xx<8; xx++) */
			ONE_PIXEL_UR_PERCEP(table_nbr, 4)
			ONE_PIXEL_UR_PERCEP(table_nbr, 5)
			ONE_PIXEL_UR_PERCEP(table_nbr, 6)
			ONE_PIXEL_UR_PERCEP(table_nbr, 7)
			/* end unroll loop */
			/* unroll loop for(xx=4; xx<8; xx++) */
			ONE_PIXEL_LL_PERCEP(table_nbr, 8)
			ONE_PIXEL_LL_PERCEP(table_nbr, 9)
			ONE_PIXEL_LL_PERCEP(table_nbr, 10)
			ONE_PIXEL_LL_PERCEP(table_nbr, 11)
			/* end unroll loop */
			if (err_this_table_upper < err_upper[0])
				err_upper[0] = err_this_table_upper;
			if (err_this_table_lower < err_lower[0])
				err_lower[0] = err_this_table_lower;
			if (err_this_table_left < err_left[0])
				err_left[0] = err_this_table_left;
			if (err_this_table_right < err_right[0])
				err_right[0] = err_this_table_right;
		}
	}
	/*unroll loop for(table_nbr=0;table_nbr<8;table_nbr++)*/
	ONE_TABLE_3_PERCEP(0);
	ONE_TABLE_3_PERCEP(1);
	ONE_TABLE_3_PERCEP(2);
	ONE_TABLE_3_PERCEP(3);
	ONE_TABLE_3_PERCEP(4);
	ONE_TABLE_3_PERCEP(5);
	ONE_TABLE_3_PERCEP(6);
	ONE_TABLE_3_PERCEP(7);
	/*end unroll loop*/
};

// Compresses the individual mode exhaustively (perecptual error metric).
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockIndividualExhaustivePerceptual(img: Buffer | Uint8Array, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, total_best_err: number) {
	var best_err_norm_diff = MAXERR1000;
	var best_err_norm_444 = MAXERR1000;
	var best_err_flip_diff = MAXERR1000;
	var best_err_flip_444 = MAXERR1000;
	var color_quant1 = new Uint8Array(3), color_quant2 = new Uint8Array(3);

	var enc_color1 = new Int32Array(3);
	var best_enc_color1 = new Int32Array(3), best_enc_color2 = new Int32Array(3);

	var min_error = MAXERR1000;
	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);
	var pixel_indices1_MSB = new Uint32Array(1);
	var pixel_indices1_LSB = new Uint32Array(1);
	var pixel_indices2_MSB = new Uint32Array(1);

	var err_upper = new Uint32Array(1), err_lower = new Uint32Array(1);
	var err_left = new Uint32Array(1), err_right = new Uint32Array(1);

	var pixel_indices2_LSB = new Uint32Array(1);

	var best_err_upper = new Uint32Array([MAXERR1000]);
	var best_err_lower = new Uint32Array([MAXERR1000]);
	var best_err_left = new Uint32Array([MAXERR1000]);
	var best_err_right = new Uint32Array([MAXERR1000]);

	var best_upper_col = new Int32Array(3);
	var best_lower_col = new Int32Array(3);
	var best_left_col = new Int32Array(3);
	var best_right_col = new Int32Array(3);


	var table1 = new Uint32Array(1), table2 = new Uint32Array(1);
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);

	var precalc_err_UL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_R = new Uint32Array(8 * 4 * 4);

	var precalc_err_UL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_RG = new Uint32Array(8 * 4 * 4);

	var diffbit;
	var block_2x2 = new Uint8Array(4 * 4 * 4);

	var best_err = 0;
	var best_flip = new Int32Array(1);

	var xx, yy, count = 0;
	// Reshuffle pixels so that the top left 2x2 pixels arrive first, then the top right 2x2 pixels etc. Also put use 4 bytes per pixel to make it 32-word aligned.
	for (xx = 0; xx < 2; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 0; xx < 2; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}

	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_err = compressBlockOnlyIndividualAveragePerceptual1000(img, width, height, startx, starty, test1, test2, best_enc_color1, best_enc_color2, best_flip, best_err_upper, best_err_lower, best_err_left, best_err_right, best_upper_col, best_lower_col, best_left_col, best_right_col);
	if (best_err < total_best_err)
		total_best_err = best_err;

	var tryblocks = 0; // unsigned int
	var allblocks = 0; // unsigned int
	var needtest;


	for (enc_color1[0] = 0; enc_color1[0] < 16; enc_color1[0]++) {
		color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
		if (precompute_3bittable_all_subblocksR_with_test_perceptual1000(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, total_best_err)) {
			for (enc_color1[1] = 0; enc_color1[1] < 16; enc_color1[1]++) {
				color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
				if (precompute_3bittable_all_subblocksRG_withtest_perceptual1000(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, total_best_err)) {
					needtest = false;
					for (enc_color1[2] = 0; enc_color1[2] < 16; enc_color1[2]++) {
						color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
						tryalltables_3bittable_all_subblocks_using_precalc_perceptual1000(block_2x2, color_quant1, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, err_upper, err_lower, err_left, err_right, total_best_err);
						if (err_upper[0] < best_err_upper[0]) {
							best_err_upper = err_upper;
							best_upper_col[0] = enc_color1[0];
							best_upper_col[1] = enc_color1[1];
							best_upper_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_lower[0] < best_err_lower[0]) {
							best_err_lower = err_lower;
							best_lower_col[0] = enc_color1[0];
							best_lower_col[1] = enc_color1[1];
							best_lower_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_left[0] < best_err_left[0]) {
							best_err_left = err_left;
							best_left_col[0] = enc_color1[0];
							best_left_col[1] = enc_color1[1];
							best_left_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_right[0] < best_err_right[0]) {
							best_err_right = err_right;
							best_right_col[0] = enc_color1[0];
							best_right_col[1] = enc_color1[1];
							best_right_col[2] = enc_color1[2];
							needtest = true;
						}
					}
					if (needtest) {
						if (best_err_upper[0] + best_err_lower[0] < best_err_left[0] + best_err_right[0]) {
							best_err = best_err_upper[0] + best_err_lower[0];
							if (best_err < total_best_err)
								total_best_err = best_err;
						}
						else {
							best_err = best_err_left[0] + best_err_right[0];
							if (best_err < total_best_err)
								total_best_err = best_err;
						}
					}
				}
			}
		}
	}

	if (best_err_upper[0] + best_err_lower[0] < best_err_left[0] + best_err_right[0]) {
		best_flip[0] = 1;
		best_enc_color1[0] = best_upper_col[0];
		best_enc_color1[1] = best_upper_col[1];
		best_enc_color1[2] = best_upper_col[2];
		best_enc_color2[0] = best_lower_col[0];
		best_enc_color2[1] = best_lower_col[1];
		best_enc_color2[2] = best_lower_col[2];
		best_err = best_err_upper[0] + best_err_lower[0];
		if (best_err < total_best_err)
			total_best_err = best_err;
	}
	else {
		best_flip[0] = 0;
		best_enc_color1[0] = best_left_col[0];
		best_enc_color1[1] = best_left_col[1];
		best_enc_color1[2] = best_left_col[2];
		best_enc_color2[0] = best_right_col[0];
		best_enc_color2[1] = best_right_col[1];
		best_enc_color2[2] = best_right_col[2];
		best_err = best_err_left[0] + best_err_right[0];
		if (best_err < total_best_err)
			total_best_err = best_err;
	}

	color_quant1[0] = best_enc_color1[0] << 4 | (best_enc_color1[0]);
	color_quant1[1] = best_enc_color1[1] << 4 | (best_enc_color1[1]);
	color_quant1[2] = best_enc_color1[2] << 4 | (best_enc_color1[2]);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4percep1000(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	else
		tryalltables_3bittable4x2percep1000(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

	color_quant2[0] = best_enc_color2[0] << 4 | (best_enc_color2[0]);
	color_quant2[1] = best_enc_color2[1] << 4 | (best_enc_color2[1]);
	color_quant2[2] = best_enc_color2[2] << 4 | (best_enc_color2[2]);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4percep1000(img, width, height, startx + 2, starty, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	else
		tryalltables_3bittable4x2percep1000(img, width, height, startx, starty + 2, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      


	diffbit = 1;
	compressed1[0] = 0;
	compressed1[0] = PUTBITSHIGH(compressed1[0], diffbit, 0, 33);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[0], 4, 63);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[1], 4, 55);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[2], 4, 47);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[0], 4, 59);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[1], 4, 51);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[2], 4, 43);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table1[0], 3, 39);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table2[0], 3, 36);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_flip[0], 1, 32);

	if (best_flip[0] == 0) {
		compressed2[0] = 0;
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);
		compressed2[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	return best_err >>> 0;
}

// Compresses the individual mode exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockIndividualExhaustive(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, total_best_err: number) {
	var best_err_norm_diff = 255 * 255 * 16 * 3;
	var best_err_norm_444 = 255 * 255 * 16 * 3;
	var best_err_flip_diff = 255 * 255 * 16 * 3;
	var best_err_flip_444 = 255 * 255 * 16 * 3;
	var color_quant1 = new Uint8Array(3), color_quant2 = new Uint8Array(3);

	var enc_color1 = new Int32Array(3);
	var best_enc_color1 = new Int32Array(3), best_enc_color2 = new Int32Array(3);

	var min_error = 255 * 255 * 8 * 3;
	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);
	var pixel_indices1_MSB = new Uint32Array(1);
	var pixel_indices1_LSB = new Uint32Array(1);
	var pixel_indices2_MSB = new Uint32Array(1);

	var err_upper = new Uint32Array(1), err_lower = new Uint32Array(1);
	var err_left = new Uint32Array(1), err_right = new Uint32Array(1);

	var pixel_indices2_LSB = new Uint32Array(1);

	var best_err_upper = new Uint32Array([255 * 255 * 16 * 3]);
	var best_err_lower = new Uint32Array([255 * 255 * 16 * 3]);
	var best_err_left = new Uint32Array([255 * 255 * 16 * 3]);
	var best_err_right = new Uint32Array([255 * 255 * 16 * 3]);

	var best_upper_col = new Int32Array(3);
	var best_lower_col = new Int32Array(3);
	var best_left_col = new Int32Array(3);
	var best_right_col = new Int32Array(3);


	var table1 = new Uint32Array(1), table2 = new Uint32Array(1);
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);

	var precalc_err_UL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_R = new Uint32Array(8 * 4 * 4);

	var precalc_err_UL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_RG = new Uint32Array(8 * 4 * 4);

	var diffbit:number;
	var block_2x2 = new Uint8Array(4 * 4 * 4);

	var best_err:number;
	var best_flip = new Int32Array(1);

	var xx, yy, count = 0;
	// Reshuffle pixels so that the top left 2x2 pixels arrive first, then the top right 2x2 pixels etc. Also put use 4 bytes per pixel to make it 32-word aligned.
	for (xx = 0; xx < 2; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 0; xx < 2; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}

	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_err = compressBlockOnlyIndividualAverage(img, width, height, startx, starty, test1, test2, best_enc_color1, best_enc_color2, best_flip, best_err_upper, best_err_lower, best_err_left, best_err_right, best_upper_col, best_lower_col, best_left_col, best_right_col);

	if (best_err < total_best_err)
		total_best_err = best_err;


	var tryblocks = 0;
	var allblocks = 0;
	var needtest;

	for (enc_color1[0] = 0; enc_color1[0] < 16; enc_color1[0]++) {
		color_quant1[0] = enc_color1[0] << 4 | (enc_color1[0]);
		if (precompute_3bittable_all_subblocksR_with_test(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, total_best_err)) {
			for (enc_color1[1] = 0; enc_color1[1] < 16; enc_color1[1]++) {
				color_quant1[1] = enc_color1[1] << 4 | (enc_color1[1]);
				if (precompute_3bittable_all_subblocksRG_withtest(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, total_best_err)) {
					needtest = false;
					for (enc_color1[2] = 0; enc_color1[2] < 16; enc_color1[2]++) {
						color_quant1[2] = enc_color1[2] << 4 | (enc_color1[2]);
						tryalltables_3bittable_all_subblocks_using_precalc(block_2x2, color_quant1, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, err_upper, err_lower, err_left, err_right, total_best_err);
						if (err_upper < best_err_upper) {
							best_err_upper = err_upper;
							best_upper_col[0] = enc_color1[0];
							best_upper_col[1] = enc_color1[1];
							best_upper_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_lower < best_err_lower) {
							best_err_lower = err_lower;
							best_lower_col[0] = enc_color1[0];
							best_lower_col[1] = enc_color1[1];
							best_lower_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_left < best_err_left) {
							best_err_left = err_left;
							best_left_col[0] = enc_color1[0];
							best_left_col[1] = enc_color1[1];
							best_left_col[2] = enc_color1[2];
							needtest = true;
						}
						if (err_right < best_err_right) {
							best_err_right = err_right;
							best_right_col[0] = enc_color1[0];
							best_right_col[1] = enc_color1[1];
							best_right_col[2] = enc_color1[2];
							needtest = true;
						}
					}
					if (needtest == true) {
						if (best_err_upper[0] + best_err_lower[0] < best_err_left[0] + best_err_right[0]) {
							best_err = best_err_upper[0] + best_err_lower[0];
							if (best_err < total_best_err)
								total_best_err = best_err;
						}
						else {
							best_err = best_err_left[0] + best_err_right[0];
							if (best_err < total_best_err)
								total_best_err = best_err;
						}
					}
				}
			}
		}
	}
	if (best_err_upper[0] + best_err_lower[0] < best_err_left[0] + best_err_right[0]) {
		best_flip[0] = 1;
		best_enc_color1[0] = best_upper_col[0];
		best_enc_color1[1] = best_upper_col[1];
		best_enc_color1[2] = best_upper_col[2];
		best_enc_color2[0] = best_lower_col[0];
		best_enc_color2[1] = best_lower_col[1];
		best_enc_color2[2] = best_lower_col[2];
		best_err = best_err_upper[0] + best_err_lower[0];
		if (best_err < total_best_err)
			total_best_err = best_err;
	}
	else {
		best_flip[0] = 0;
		best_enc_color1[0] = best_left_col[0];
		best_enc_color1[1] = best_left_col[1];
		best_enc_color1[2] = best_left_col[2];
		best_enc_color2[0] = best_right_col[0];
		best_enc_color2[1] = best_right_col[1];
		best_enc_color2[2] = best_right_col[2];
		best_err = best_err_left[0] + best_err_right[0];
		if (best_err < total_best_err)
			total_best_err = best_err;
	}
	color_quant1[0] = best_enc_color1[0] << 4 | (best_enc_color1[0]);
	color_quant1[1] = best_enc_color1[1] << 4 | (best_enc_color1[1]);
	color_quant1[2] = best_enc_color1[2] << 4 | (best_enc_color1[2]);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	else
		tryalltables_3bittable4x2(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

	color_quant2[0] = best_enc_color2[0] << 4 | (best_enc_color2[0]);
	color_quant2[1] = best_enc_color2[1] << 4 | (best_enc_color2[1]);
	color_quant2[2] = best_enc_color2[2] << 4 | (best_enc_color2[2]);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4(img, width, height, startx + 2, starty, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	else
		tryalltables_3bittable4x2(img, width, height, startx, starty + 2, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	diffbit = 1;
	compressed1[0] = 0;
	compressed1[0] = PUTBITSHIGH(compressed1[0], diffbit, 0, 33);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[0], 4, 63);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[1], 4, 55);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[2], 4, 47);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[0], 4, 59);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[1], 4, 51);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color2[2], 4, 43);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table1[0], 3, 39);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table2[0], 3, 36);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_flip[0], 1, 32);

	if (best_flip[0] == 0) {
		compressed2[0] = 0;
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);
		compressed2[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}

	return best_err >>> 0;
}

// Compresses the differential mode exhaustively (perecptual error metric).
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDifferentialExhaustivePerceptual(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, best_error_so_far: number) {
	var best_err_norm_diff = MAXERR1000;
	var best_err_norm_444 = MAXERR1000;
	var best_err_flip_diff = MAXERR1000;
	var best_err_flip_444 = MAXERR1000;
	var color_quant1 = new Uint8Array(3), color_quant2 = new Uint8Array(3);

	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var best_enc_color1 = new Int32Array(3), best_enc_color2 = new Int32Array(3);
	var bytediff = new Int8Array(3);

	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);
	var pixel_indices1_MSB = new Uint32Array(1);
	var pixel_indices1_LSB = new Uint32Array(1);
	var pixel_indices2_MSB = new Uint32Array(1);

	var err_upper: Uint32Array, err_lower: Uint32Array;
	var err_left: Uint32Array, err_right: Uint32Array;

	var pixel_indices2_LSB = new Uint32Array(1);

	var table1 = new Uint32Array(1), table2 = new Uint32Array(1);
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);

	var precalc_err_UL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_R = new Uint32Array(8 * 4 * 4);

	var precalc_err_UL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_RG = new Uint32Array(8 * 4 * 4);

	var best_error_using_diff_mode;

	var diffbit;
	var block_2x2 = new Uint8Array(4 * 4 * 4);

	var error: number, error_lying: number, error_standing: number;
	var err_lower_adr: number;
	var best_flip: number;
	var err_right_adr: number;

	var xx, yy, count = 0;

	// Reshuffle pixels so that the top left 2x2 pixels arrive first, then the top right 2x2 pixels etc. Also put use 4 bytes per pixel to make it 32-word aligned.
	for (xx = 0; xx < 2; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 0; xx < 2; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}

	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_error_using_diff_mode = compressBlockOnlyDiffFlipAveragePerceptual1000(img, width, height, startx, starty, test1, test2);
	if (best_error_using_diff_mode < best_error_so_far)
		best_error_so_far = best_error_using_diff_mode;

	// Decode the parameters so that we have a worst case color pair and a flip status
	best_flip = test1[0] & 1;
	best_enc_color1[0] = GETBITSHIGH(test1[0], 5, 63);
	best_enc_color1[1] = GETBITSHIGH(test1[0], 5, 55);
	best_enc_color1[2] = GETBITSHIGH(test1[0], 5, 47);
	bytediff[0] = GETBITSHIGH(test1[0], 3, 58);
	bytediff[1] = GETBITSHIGH(test1[0], 3, 50);
	bytediff[2] = GETBITSHIGH(test1[0], 3, 42);
	bytediff[0] = (bytediff[0] << 5);
	bytediff[1] = (bytediff[1] << 5);
	bytediff[2] = (bytediff[2] << 5);
	bytediff[0] = bytediff[0] >> 5;
	bytediff[1] = bytediff[1] >> 5;
	bytediff[2] = bytediff[2] >> 5;
	best_enc_color2[0] = best_enc_color1[0] + bytediff[0];
	best_enc_color2[1] = best_enc_color1[1] + bytediff[1];
	best_enc_color2[2] = best_enc_color1[2] + bytediff[2];

	// allocate memory for errors:
	err_upper = new Uint32Array(img, 32 * 32 * 32);

	err_lower = new Uint32Array(img, 32 * 32 * 32);

	err_left = new Uint32Array(img, 32 * 32 * 32);

	err_right = new Uint32Array(img, 32 * 32 * 32);

	var q;
	// Calculate all errors
	for (enc_color1[0] = 0; enc_color1[0] < 32; enc_color1[0]++) {
		color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		if (precompute_3bittable_all_subblocksR_with_test_perceptual1000(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, best_error_so_far)) {
			for (enc_color1[1] = 0; enc_color1[1] < 32; enc_color1[1]++) {
				color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
				if (precompute_3bittable_all_subblocksRG_withtest_perceptual1000(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, best_error_so_far)) {
					for (enc_color1[2] = 0; enc_color1[2] < 32; enc_color1[2]++) {
						color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
						tryalltables_3bittable_all_subblocks_using_precalc_perceptual1000(block_2x2, color_quant1, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, err_upper.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2], err_upper.length), err_lower.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2], err_lower.length), err_left.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2], err_left.length), err_right.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2], err_right.length), best_error_so_far);
					}
				}
				else {
					for (q = 0; q < 32; q++) {
						err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = MAXERR1000;
						err_lower[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = MAXERR1000;
						err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = MAXERR1000;
						err_right[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = MAXERR1000;
					}
				}
			}
		}
		else {
			for (q = 0; q < 32 * 32; q++) {
				err_upper[32 * 32 * enc_color1[0] + q] = MAXERR1000;
				err_lower[32 * 32 * enc_color1[0] + q] = MAXERR1000;
				err_left[32 * 32 * enc_color1[0] + q] = MAXERR1000;
				err_right[32 * 32 * enc_color1[0] + q] = MAXERR1000;
			}
		}
	}
	for (enc_color1[0] = 0; enc_color1[0] < 32; enc_color1[0]++) {
		for (enc_color1[1] = 0; enc_color1[1] < 32; enc_color1[1]++) {
			for (enc_color1[2] = 0; enc_color1[2] < 4; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < best_error_so_far || error_standing < best_error_so_far) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							for (enc_color2[2] = JAS_MAX(0, enc_color1[2] - 4); enc_color2[2] < JAS_MIN(enc_color1[2] + 4, 32); enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 1;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 0;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
				}
			}
			for (enc_color1[2] = 4; enc_color1[2] < 28; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < best_error_so_far || error_standing < best_error_so_far) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							// since enc_color[2] is between 4 and 29 we do not need to clamp the loop on the next line 
							for (enc_color2[2] = enc_color1[2] - 4; enc_color2[2] < enc_color1[2] + 4; enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 1;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 0;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
				}
			}
			for (enc_color1[2] = 28; enc_color1[2] < 32; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < best_error_so_far || error_standing < best_error_so_far) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							for (enc_color2[2] = JAS_MAX(0, enc_color1[2] - 4); enc_color2[2] < JAS_MIN(enc_color1[2] + 4, 32); enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 1;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_error_so_far) {
									best_flip = 0;
									best_error_so_far = error;
									best_error_using_diff_mode = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
				}
			}
		}
	}

	//free(err_upper);
	//free(err_lower);
	//free(err_left);
	//free(err_right);

	color_quant1[0] = best_enc_color1[0] << 3 | (best_enc_color1[0] >> 2);
	color_quant1[1] = best_enc_color1[1] << 3 | (best_enc_color1[1] >> 2);
	color_quant1[2] = best_enc_color1[2] << 3 | (best_enc_color1[2] >> 2);
	if (best_flip == 0)
		tryalltables_3bittable2x4percep1000(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	else
		tryalltables_3bittable4x2percep1000(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

	color_quant2[0] = best_enc_color2[0] << 3 | (best_enc_color2[0] >> 2);
	color_quant2[1] = best_enc_color2[1] << 3 | (best_enc_color2[1] >> 2);
	color_quant2[2] = best_enc_color2[2] << 3 | (best_enc_color2[2] >> 2);
	if (best_flip == 0)
		tryalltables_3bittable2x4percep1000(img, width, height, startx + 2, starty, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	else
		tryalltables_3bittable4x2percep1000(img, width, height, startx, starty + 2, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	diff[0] = best_enc_color2[0] - best_enc_color1[0];
	diff[1] = best_enc_color2[1] - best_enc_color1[1];
	diff[2] = best_enc_color2[2] - best_enc_color1[2];

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	diffbit = 1;
	compressed1[0] = 0;
	compressed1[0] = PUTBITSHIGH(compressed1[0], diffbit, 1, 33);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[0], 5, 63);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[1], 5, 55);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[2], 5, 47);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[0], 3, 58);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[1], 3, 50);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[2], 3, 42);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table1[0], 3, 39);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table2[0], 3, 36);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_flip, 1, 32);

	if (best_flip == 0) {
		compressed2[0] = 0;
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);
		compressed2[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	return best_error_using_diff_mode >>> 0;
}

// Compresses the differential mode exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockDifferentialExhaustive(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, previous_best_err: number) {
	var best_err_norm_diff = 255 * 255 * 16 * 3;
	var best_err_norm_444 = 255 * 255 * 16 * 3;
	var best_err_flip_diff = 255 * 255 * 16 * 3;
	var best_err_flip_444 = 255 * 255 * 16 * 3;
	var color_quant1 = new Uint8Array(3), color_quant2 = new Uint8Array(3);

	var enc_color1 = new Int32Array(3), enc_color2 = new Int32Array(3), diff = new Int32Array(3);
	var best_enc_color1 = new Int32Array(3), best_enc_color2 = new Int32Array(3);

	var min_error = 255 * 255 * 8 * 3;
	var best_pixel_indices1_MSB = new Uint32Array(1);
	var best_pixel_indices1_LSB = new Uint32Array(1);
	var best_pixel_indices2_MSB = new Uint32Array(1);
	var best_pixel_indices2_LSB = new Uint32Array(1);
	var pixel_indices1_MSB = new Uint32Array(1);
	var pixel_indices1_LSB = new Uint32Array(1);
	var pixel_indices2_MSB = new Uint32Array(1);

	var err_upper: Uint32Array, err_lower: Uint32Array;
	var err_left: Uint32Array, err_right: Uint32Array;

	var pixel_indices2_LSB = new Uint32Array(1);

	var table1 = new Uint32Array(1), table2 = new Uint32Array(1);
	var best_table1 = new Uint32Array(1), best_table2 = new Uint32Array(1);

	var precalc_err_UL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_R = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_R = new Uint32Array(8 * 4 * 4);

	var precalc_err_UL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_UR_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LL_RG = new Uint32Array(8 * 4 * 4);
	var precalc_err_LR_RG = new Uint32Array(8 * 4 * 4);

	var diffbit;
	var block_2x2 = new Uint8Array(4 * 4 * 4);

	var error: number, error_lying: number, error_standing: number, best_err: number, total_best_err: number;
	var err_lower_adr: number;
	var best_flip = new Int32Array(1);
	var err_right_adr: number;

	var xx, yy, count = 0;

	// Reshuffle pixels so that the top left 2x2 pixels arrive first, then the top right 2x2 pixels etc. Also put use 4 bytes per pixel to make it 32-word aligned.
	for (xx = 0; xx < 2; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 0; yy < 2; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 0; xx < 2; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}
	for (xx = 2; xx < 4; xx++) {
		for (yy = 2; yy < 4; yy++) {
			block_2x2[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block_2x2[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block_2x2[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block_2x2[(count) * 4 + 3] = 0;
			count++;
		}
	}


	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_err = compressBlockOnlyDiffFlipAverage(img, width, height, startx, starty, test1, test2, best_enc_color1, best_enc_color2, best_flip);
	if (previous_best_err < best_err)
		total_best_err = previous_best_err;
	else
		total_best_err = best_err;

	// allocate memory for errors:
	err_upper = new Uint32Array(img, 32 * 32 * 32);

	err_lower = new Uint32Array(img, 32 * 32 * 32);

	err_left = new Uint32Array(img, 32 * 32 * 32);

	err_right = new Uint32Array(img, 32 * 32 * 32);

	var q;
	// Calculate all errors
	for (enc_color1[0] = 0; enc_color1[0] < 32; enc_color1[0]++) {
		color_quant1[0] = enc_color1[0] << 3 | (enc_color1[0] >> 2);
		if (precompute_3bittable_all_subblocksR_with_test(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, total_best_err)) {
			for (enc_color1[1] = 0; enc_color1[1] < 32; enc_color1[1]++) {
				color_quant1[1] = enc_color1[1] << 3 | (enc_color1[1] >> 2);
				if (precompute_3bittable_all_subblocksRG_withtest(block_2x2, color_quant1, precalc_err_UL_R, precalc_err_UR_R, precalc_err_LL_R, precalc_err_LR_R, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, total_best_err)) {
					for (enc_color1[2] = 0; enc_color1[2] < 32; enc_color1[2]++) {
						color_quant1[2] = enc_color1[2] << 3 | (enc_color1[2] >> 2);
						tryalltables_3bittable_all_subblocks_using_precalc(block_2x2, color_quant1, precalc_err_UL_RG, precalc_err_UR_RG, precalc_err_LL_RG, precalc_err_LR_RG, err_upper.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]), err_lower.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]), err_left.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]), err_right.subarray(32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]), total_best_err);
					}
				}
				else {
					for (q = 0; q < 32; q++) {
						err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = 255 * 255 * 16 * 3;
						err_lower[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = 255 * 255 * 16 * 3;
						err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = 255 * 255 * 16 * 3;
						err_right[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + q] = 255 * 255 * 16 * 3;
					}
				}
			}
		}
		else {
			for (q = 0; q < 32 * 32; q++) {
				err_upper[32 * 32 * enc_color1[0] + q] = 255 * 255 * 16 * 3;
				err_lower[32 * 32 * enc_color1[0] + q] = 255 * 255 * 16 * 3;
				err_left[32 * 32 * enc_color1[0] + q] = 255 * 255 * 16 * 3;
				err_right[32 * 32 * enc_color1[0] + q] = 255 * 255 * 16 * 3;
			}
		}
	}

	for (enc_color1[0] = 0; enc_color1[0] < 32; enc_color1[0]++) {
		for (enc_color1[1] = 0; enc_color1[1] < 32; enc_color1[1]++) {
			for (enc_color1[2] = 0; enc_color1[2] < 4; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < total_best_err || error_standing < total_best_err) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							for (enc_color2[2] = JAS_MAX(0, enc_color1[2] - 4); enc_color2[2] < JAS_MIN(enc_color1[2] + 4, 32); enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 1;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 0;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
					if (best_err < total_best_err)
						total_best_err = best_err;
				}
			}
			for (enc_color1[2] = 4; enc_color1[2] < 28; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < total_best_err || error_standing < total_best_err) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							// since enc_color[2] is between 4 and 29 we do not need to clamp the loop on the next line 
							for (enc_color2[2] = enc_color1[2] - 4; enc_color2[2] < enc_color1[2] + 4; enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 1;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 0;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
					if (best_err < total_best_err)
						total_best_err = best_err;

				}
			}
			for (enc_color1[2] = 28; enc_color1[2] < 32; enc_color1[2]++) {
				error_lying = err_upper[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				error_standing = err_left[32 * 32 * enc_color1[0] + 32 * enc_color1[1] + enc_color1[2]];
				if (error_lying < total_best_err || error_standing < total_best_err) {
					for (enc_color2[0] = JAS_MAX(0, enc_color1[0] - 4); enc_color2[0] < JAS_MIN(enc_color1[0] + 4, 32); enc_color2[0]++) {
						for (enc_color2[1] = JAS_MAX(0, enc_color1[1] - 4); enc_color2[1] < JAS_MIN(enc_color1[1] + 4, 32); enc_color2[1]++) {
							err_lower_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							err_right_adr = 32 * 32 * enc_color2[0] + 32 * enc_color2[1];
							for (enc_color2[2] = JAS_MAX(0, enc_color1[2] - 4); enc_color2[2] < JAS_MIN(enc_color1[2] + 4, 32); enc_color2[2]++) {
								error = error_lying + err_lower[err_lower_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 1;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
								error = error_standing + err_right[err_right_adr + enc_color2[2]];
								if (error < best_err) {
									best_flip[0] = 0;
									best_err = error;
									best_enc_color1[0] = enc_color1[0];
									best_enc_color1[1] = enc_color1[1];
									best_enc_color1[2] = enc_color1[2];
									best_enc_color2[0] = enc_color2[0];
									best_enc_color2[1] = enc_color2[1];
									best_enc_color2[2] = enc_color2[2];
								}
							}
						}
					}
					if (best_err < total_best_err)
						total_best_err = best_err;
				}
			}
		}
	}

	//free(err_upper);
	//free(err_lower);
	//free(err_left);
	//free(err_right);


	color_quant1[0] = best_enc_color1[0] << 3 | (best_enc_color1[0] >> 2);
	color_quant1[1] = best_enc_color1[1] << 3 | (best_enc_color1[1] >> 2);
	color_quant1[2] = best_enc_color1[2] << 3 | (best_enc_color1[2] >> 2);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);
	else
		tryalltables_3bittable4x2(img, width, height, startx, starty, color_quant1, best_table1, best_pixel_indices1_MSB, best_pixel_indices1_LSB);

	color_quant2[0] = best_enc_color2[0] << 3 | (best_enc_color2[0] >> 2);
	color_quant2[1] = best_enc_color2[1] << 3 | (best_enc_color2[1] >> 2);
	color_quant2[2] = best_enc_color2[2] << 3 | (best_enc_color2[2] >> 2);
	if (best_flip[0] == 0)
		tryalltables_3bittable2x4(img, width, height, startx + 2, starty, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);
	else
		tryalltables_3bittable4x2(img, width, height, startx, starty + 2, color_quant2, best_table2, best_pixel_indices2_MSB, best_pixel_indices2_LSB);

	diff[0] = best_enc_color2[0] - best_enc_color1[0];
	diff[1] = best_enc_color2[1] - best_enc_color1[1];
	diff[2] = best_enc_color2[2] - best_enc_color1[2];

	//     ETC1_RGB8_OES:
	// 
	//     a) bit layout in bits 63 through 32 if diffbit = 0
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1 | base col2 | base col1 | base col2 | base col1 | base col2 | table  | table  |diff|flip|
	//     | R1 (4bits)| R2 (4bits)| G1 (4bits)| G2 (4bits)| B1 (4bits)| B2 (4bits)| cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	//     
	//     b) bit layout in bits 63 through 32 if diffbit = 1
	// 
	//      63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34  33  32 
	//      ---------------------------------------------------------------------------------------------------
	//     | base col1    | dcol 2 | base col1    | dcol 2 | base col 1   | dcol 2 | table  | table  |diff|flip|
	//     | R1' (5 bits) | dR2    | G1' (5 bits) | dG2    | B1' (5 bits) | dB2    | cw 1   | cw 2   |bit |bit |
	//      ---------------------------------------------------------------------------------------------------
	// 
	//     c) bit layout in bits 31 through 0 (in both cases)
	// 
	//      31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10  9  8  7  6  5  4  3   2   1  0
	//      --------------------------------------------------------------------------------------------------
	//     |       most significant pixel index bits       |         least significant pixel index bits       |  
	//     | p| o| n| m| l| k| j| i| h| g| f| e| d| c| b| a| p| o| n| m| l| k| j| i| h| g| f| e| d| c | b | a |
	//      --------------------------------------------------------------------------------------------------      

	diffbit = 1;
	compressed1[0] = 0;
	compressed1[0] = PUTBITSHIGH(compressed1[0], diffbit, 1, 33);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[0], 5, 63);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[1], 5, 55);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_enc_color1[2], 5, 47);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[0], 3, 58);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[1], 3, 50);
	compressed1[0] = PUTBITSHIGH(compressed1[0], diff[2], 3, 42);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table1[0], 3, 39);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_table2[0], 3, 36);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_flip[0], 1, 32);

	if (best_flip[0] == 0) {
		compressed2[0] = 0;
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_MSB[0]), 8, 23);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_MSB[0]), 8, 31);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices1_LSB[0]), 8, 7);
		compressed2[0] = PUTBITS(compressed2[0], (best_pixel_indices2_LSB[0]), 8, 15);
	}
	else {
		best_pixel_indices1_MSB[0] |= (best_pixel_indices2_MSB[0] << 2);
		best_pixel_indices1_LSB[0] |= (best_pixel_indices2_LSB[0] << 2);
		compressed2[0] = ((best_pixel_indices1_MSB[0] & 0xffff) << 16) | (best_pixel_indices1_LSB[0] & 0xffff);
	}
	return best_err >>> 0;
}

// This function uses real exhaustive search for the planar mode. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockPlanar57ExhaustivePerceptual(img: uint8, width: number, height: number, startx: number, starty: number, compressed57_1: Uint32Array, compressed57_2: Uint32Array, best_error_sofar: number, best_error_planar_red: number, best_error_planar_green: number, best_error_planar_blue: number) {
	var colorO_enc = new Int32Array(3), colorH_enc = new Int32Array(3), colorV_enc = new Int32Array(3);
	var best_colorO_enc = new Int32Array(3), best_colorH_enc = new Int32Array(3), best_colorV_enc = new Int32Array(3);

	var error: number;
	var best_error: number;
	var lowest_possible_error: number;
	var best_error_red_sofar: number;
	var best_error_green_sofar: number;
	var best_error_blue_sofar: number;
	var BBBtable = new Uint32Array(128 * 128);
	var CCCtable = new Uint32Array(128 * 128);

	var block = new Uint8Array(4 * 4 * 4);

	// Use 4 bytes per pixel to make it 32-word aligned.
	var count = 0;
	var xx, yy;
	for (yy = 0; yy < 4; yy++) {
		for (xx = 0; xx < 4; xx++) {
			block[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block[(count) * 4 + 3] = 0;
			count++;
		}
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and stored in lowest_possible_error

	// Precalc BBB errors
	for (colorO_enc[0] = 0; colorO_enc[0] < 64; colorO_enc[0]++) {
		for (colorV_enc[0] = 0; colorV_enc[0] < 64; colorV_enc[0]++) {
			BBBtable[colorO_enc[0] * 64 + colorV_enc[0]] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * calcBBBred(block, colorO_enc[0], colorV_enc[0]);
		}
	}
	// Precalc CCC errors
	for (colorH_enc[0] = 0; colorH_enc[0] < 64; colorH_enc[0]++) {
		for (colorV_enc[0] = 0; colorV_enc[0] < 64; colorV_enc[0]++) {
			CCCtable[colorH_enc[0] * 64 + colorV_enc[0]] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000 * calcCCCred(block, colorH_enc[0], colorV_enc[0]);
		}
	}
	best_error = MAXERR1000;

	best_error_red_sofar = JAS_MIN(best_error_planar_red, best_error_sofar);
	for (colorO_enc[0] = 0; colorO_enc[0] < 64; colorO_enc[0]++) {
		for (colorH_enc[0] = 0; colorH_enc[0] < 64; colorH_enc[0]++) {
			lowest_possible_error = calcLowestPossibleRedOHperceptual(block, colorO_enc[0], colorH_enc[0], best_error_red_sofar);
			if (lowest_possible_error <= best_error_red_sofar) {
				for (colorV_enc[0] = 0; colorV_enc[0] < 64; colorV_enc[0]++) {
					error = calcErrorPlanarOnlyRedPerceptual(block, colorO_enc[0], colorH_enc[0], colorV_enc[0], lowest_possible_error, BBBtable[colorO_enc[0] * 64 + colorV_enc[0]], CCCtable[colorH_enc[0] * 64 + colorV_enc[0]], best_error_red_sofar);
					if (error < best_error) {
						best_error = error;
						best_colorO_enc[0] = colorO_enc[0];
						best_colorH_enc[0] = colorH_enc[0];
						best_colorV_enc[0] = colorV_enc[0];
					}
				}
			}
		}
	}

	if (best_error < best_error_planar_red)
		best_error_planar_red = best_error;

	if (best_error_planar_red > best_error_sofar) {
		// The red component in itself is already bigger than the previously best value ---- we can give up.
		// use the dummy color black for all colors and report that the errors for the different color components are infinite
		best_error_planar_green = MAXERR1000;
		best_error_planar_blue = MAXERR1000;
		compressed57_1[0] = 0;
		compressed57_2[0] = 0;
		return;
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and store in lowest_possible_error

	// Precalc BBB errors
	for (colorO_enc[1] = 0; colorO_enc[1] < 128; colorO_enc[1]++) {
		for (colorV_enc[1] = 0; colorV_enc[1] < 128; colorV_enc[1]++) {
			BBBtable[colorO_enc[1] * 128 + colorV_enc[1]] = PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * calcBBBgreen(block, colorO_enc[1], colorV_enc[1]);
		}
	}
	// Precalc CCC errors
	for (colorH_enc[1] = 0; colorH_enc[1] < 128; colorH_enc[1]++) {
		for (colorV_enc[1] = 0; colorV_enc[1] < 128; colorV_enc[1]++) {
			CCCtable[colorH_enc[1] * 128 + colorV_enc[1]] = PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000 * calcCCCgreen(block, colorH_enc[1], colorV_enc[1]);
		}
	}
	best_error = MAXERR1000;
	best_error_green_sofar = JAS_MIN(best_error_planar_green, best_error_sofar);
	for (colorO_enc[1] = 0; colorO_enc[1] < 128; colorO_enc[1]++) {
		for (colorH_enc[1] = 0; colorH_enc[1] < 128; colorH_enc[1]++) {
			lowest_possible_error = calcLowestPossibleGreenOHperceptual(block, colorO_enc[1], colorH_enc[1], best_error_green_sofar);
			if (lowest_possible_error <= best_error_green_sofar) {
				for (colorV_enc[1] = 0; colorV_enc[1] < 128; colorV_enc[1]++) {
					error = calcErrorPlanarOnlyGreenPerceptual(block, colorO_enc[1], colorH_enc[1], colorV_enc[1], lowest_possible_error, BBBtable[colorO_enc[1] * 128 + colorV_enc[1]], CCCtable[colorH_enc[1] * 128 + colorV_enc[1]], best_error_green_sofar);
					if (error < best_error) {
						best_error = error;
						best_colorO_enc[1] = colorO_enc[1];
						best_colorH_enc[1] = colorH_enc[1];
						best_colorV_enc[1] = colorV_enc[1];
					}
				}
			}
		}
	}

	if (best_error < best_error_planar_green)
		best_error_planar_green = best_error;

	if (best_error_planar_red + best_error_planar_green > best_error_sofar) {
		// The red component in itself is already bigger than the previously best value ---- we can give up.
		// use the dummy color black for all colors and report that the errors for the different color components are infinite
		best_error_planar_blue = MAXERR1000;
		compressed57_1[0] = 0;
		compressed57_2[0] = 0;
		return;
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and store in lowest_possible_error

	// Precalc BBB errors
	for (colorO_enc[2] = 0; colorO_enc[2] < 64; colorO_enc[2]++) {
		for (colorV_enc[2] = 0; colorV_enc[2] < 64; colorV_enc[2]++) {
			BBBtable[colorO_enc[2] * 64 + colorV_enc[2]] = calcBBBbluePerceptual(block, colorO_enc[2], colorV_enc[2]);
		}
	}
	// Precalc CCC errors
	for (colorH_enc[2] = 0; colorH_enc[2] < 64; colorH_enc[2]++) {
		for (colorV_enc[2] = 0; colorV_enc[2] < 64; colorV_enc[2]++) {
			CCCtable[colorH_enc[2] * 64 + colorV_enc[2]] = calcCCCbluePerceptual(block, colorH_enc[2], colorV_enc[2]);
		}
	}
	best_error = MAXERR1000;
	best_error_blue_sofar = JAS_MIN(best_error_planar_blue, best_error_sofar);
	for (colorO_enc[2] = 0; colorO_enc[2] < 64; colorO_enc[2]++) {
		for (colorH_enc[2] = 0; colorH_enc[2] < 64; colorH_enc[2]++) {
			lowest_possible_error = calcLowestPossibleBlueOHperceptual(block, colorO_enc[2], colorH_enc[2], best_error_blue_sofar);
			if (lowest_possible_error <= best_error_blue_sofar) {
				for (colorV_enc[2] = 0; colorV_enc[2] < 64; colorV_enc[2]++) {
					error = calcErrorPlanarOnlyBluePerceptual(block, colorO_enc[2], colorH_enc[2], colorV_enc[2], lowest_possible_error, BBBtable[colorO_enc[2] * 64 + colorV_enc[2]], CCCtable[colorH_enc[2] * 64 + colorV_enc[2]], best_error_blue_sofar);
					if (error < best_error) {
						best_error = error;
						best_colorO_enc[2] = colorO_enc[2];
						best_colorH_enc[2] = colorH_enc[2];
						best_colorV_enc[2] = colorV_enc[2];
					}
				}
			}
		}
	}

	if (best_error < best_error_planar_blue)
		best_error_planar_blue = best_error;

	compressed57_1[0] = 0;
	compressed57_2[0] = 0;
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], best_colorO_enc[0], 6, 63);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], best_colorO_enc[1], 7, 57);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], best_colorO_enc[2], 6, 50);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], best_colorH_enc[0], 6, 44);
	compressed57_1[0] = PUTBITSHIGH(compressed57_1[0], best_colorH_enc[1], 7, 38);
	compressed57_2[0] = PUTBITS(compressed57_2[0], best_colorH_enc[2], 6, 31);
	compressed57_2[0] = PUTBITS(compressed57_2[0], best_colorV_enc[0], 6, 25);
	compressed57_2[0] = PUTBITS(compressed57_2[0], best_colorV_enc[1], 7, 19);
	compressed57_2[0] = PUTBITS(compressed57_2[0], best_colorV_enc[2], 6, 12);

}

// This function uses real exhaustive search for the planar mode. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockPlanar57Exhaustive(img:uint8, width:number, height:number, startx:number, starty:number, compressed57_1:Uint32Array, compressed57_2:Uint32Array, best_error_sofar:number, best_error_red:number, best_error_green:number, best_error_blue:number)
{
	var colorO_enc = new Int32Array(3), colorH_enc = new Int32Array(3), colorV_enc = new Int32Array(3);
	var best_colorO_enc = new Int32Array(3), best_colorH_enc = new Int32Array(3), best_colorV_enc = new Int32Array(3);

	/* unsigned int*/ var error;
	/* unsigned int*/ var best_error;
	/* unsigned int*/ var lowest_possible_error;
	/* unsigned int*/ var best_error_red_sofar;
	/* unsigned int*/ var best_error_green_sofar;
	/* unsigned int*/ var best_error_blue_sofar;
	var BBBtable = new Uint32Array(128*128);
	var CCCtable = new Uint32Array(128*128);

	var block = new Uint8Array(4*4*4);

	// Use 4 bytes per pixel to make it 32-word aligned.
	var count = 0;
	var xx, yy;
	for(yy=0; yy<4; yy++)
	{
		for(xx = 0; xx<4; xx++)
		{
			block[(count)*4] = img[((starty+yy)*width+(startx+xx))*3];
			block[(count)*4+1] = img[((starty+yy)*width+(startx+xx))*3+1];
			block[(count)*4+2] = img[((starty+yy)*width+(startx+xx))*3+2];
			block[(count)*4+3] = 0;
			count++;
		}
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and store in lowest_possible_error

	// Precalc BBB errors
	for(colorO_enc[0] = 0; colorO_enc[0]<64; colorO_enc[0]++)
	{
		for(colorV_enc[0] = 0; colorV_enc[0]<64; colorV_enc[0]++)
		{
			BBBtable[colorO_enc[0]*64+colorV_enc[0]] = calcBBBred(block, colorO_enc[0], colorV_enc[0]);
		}
	}
	// Precalc CCC errors
	for(colorH_enc[0] = 0; colorH_enc[0]<64; colorH_enc[0]++)
	{
		for(colorV_enc[0] = 0; colorV_enc[0]<64; colorV_enc[0]++)
		{
			CCCtable[colorH_enc[0]*64+colorV_enc[0]] = calcCCCred(block, colorH_enc[0], colorV_enc[0]);
		}
	}
	best_error = MAXERR1000;
	best_error_red_sofar = JAS_MIN(best_error_red, best_error_sofar);
	for(colorO_enc[0] = 0; colorO_enc[0]<64; colorO_enc[0]++)
	{
		for(colorH_enc[0] = 0; colorH_enc[0]<64; colorH_enc[0]++)
		{
			lowest_possible_error = calcLowestPossibleRedOH(block, colorO_enc[0], colorH_enc[0], best_error_red_sofar);
			if(lowest_possible_error <= best_error_red_sofar)
			{
				for(colorV_enc[0] = 0; colorV_enc[0]<64; colorV_enc[0]++)
				{
					error = calcErrorPlanarOnlyRed(block, colorO_enc[0], colorH_enc[0], colorV_enc[0], lowest_possible_error, BBBtable[colorO_enc[0]*64+colorV_enc[0]], CCCtable[colorH_enc[0]*64+colorV_enc[0]], best_error_red_sofar);
					if(error < best_error)
					{
						best_error = error;
						best_colorO_enc[0] = colorO_enc[0];
						best_colorH_enc[0] = colorH_enc[0];
						best_colorV_enc[0] = colorV_enc[0];
					}
				}
			}
		}
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and store in lowest_possible_error

	// Precalc BBB errors
	for(colorO_enc[1] = 0; colorO_enc[1]<128; colorO_enc[1]++)
	{
		for(colorV_enc[1] = 0; colorV_enc[1]<128; colorV_enc[1]++)
		{
			BBBtable[colorO_enc[1]*128+colorV_enc[1]] = calcBBBgreen(block, colorO_enc[1], colorV_enc[1]);
		}
	}
	// Precalc CCC errors
	for(colorH_enc[1] = 0; colorH_enc[1]<128; colorH_enc[1]++)
	{
		for(colorV_enc[1] = 0; colorV_enc[1]<128; colorV_enc[1]++)
		{
			CCCtable[colorH_enc[1]*128+colorV_enc[1]] = calcCCCgreen(block, colorH_enc[1], colorV_enc[1]);
		}
	}
	best_error = MAXERR1000;
	best_error_green_sofar = JAS_MIN(best_error_green, best_error_sofar);
	for(colorO_enc[1] = 0; colorO_enc[1]<128; colorO_enc[1]++)
	{
		for(colorH_enc[1] = 0; colorH_enc[1]<128; colorH_enc[1]++)
		{
			lowest_possible_error = calcLowestPossibleGreenOH(block, colorO_enc[1], colorH_enc[1], best_error_green_sofar);
			if(lowest_possible_error <= best_error_green_sofar)
			{
				for(colorV_enc[1] = 0; colorV_enc[1]<128; colorV_enc[1]++)
				{
					error = calcErrorPlanarOnlyGreen(block, colorO_enc[1], colorH_enc[1], colorV_enc[1], lowest_possible_error, BBBtable[colorO_enc[1]*128+colorV_enc[1]], CCCtable[colorH_enc[1]*128+colorV_enc[1]], best_error_green_sofar);
					if(error < best_error)
					{
						best_error = error;
						best_colorO_enc[1] = colorO_enc[1];
						best_colorH_enc[1] = colorH_enc[1];
						best_colorV_enc[1] = colorV_enc[1];
					}
				}
			}
		}
	}

	// The task is to calculate the sum of the error over the entire area of the block.
	//
	// The block can be partitioned into: O A A A
	//                                    B D D C
	//                                    B D C D
	//                                    B C D D
	// where the error in 
	// O only depends on colorO
	// A only depends on colorO and colorH
	// B only depends on colorO and colorV
	// C only depends on colorH and colorV
	// D depends on all three (colorO, colorH and colorV)
	//
	// Note that B can be precalculated for all combinations of colorO and colorV
	// and the precalculated values can be used instead of calculating it in the inner loop.
	// The same applies to C.
	//
	// In the code below, the squared error over O A A A is calculated and store in lowest_possible_error

	// Precalc BBB errors
	for(colorO_enc[2] = 0; colorO_enc[2]<64; colorO_enc[2]++)
	{
		for(colorV_enc[2] = 0; colorV_enc[2]<64; colorV_enc[2]++)
		{
			BBBtable[colorO_enc[2]*64+colorV_enc[2]] = calcBBBblue(block, colorO_enc[2], colorV_enc[2]);
		}
	}
	// Precalc CCC errors
	for(colorH_enc[2] = 0; colorH_enc[2]<64; colorH_enc[2]++)
	{
		for(colorV_enc[2] = 0; colorV_enc[2]<64; colorV_enc[2]++)
		{
			CCCtable[colorH_enc[2]*64+colorV_enc[2]] = calcCCCblue(block, colorH_enc[2], colorV_enc[2]);
		}
	}
	best_error = MAXERR1000;
	best_error_blue_sofar = JAS_MIN(best_error_blue, best_error_sofar);
	for(colorO_enc[2] = 0; colorO_enc[2]<64; colorO_enc[2]++)
	{
		for(colorH_enc[2] = 0; colorH_enc[2]<64; colorH_enc[2]++)
		{
			lowest_possible_error = calcLowestPossibleBlueOH(block, colorO_enc[2], colorH_enc[2], best_error_blue_sofar);
			if(lowest_possible_error <= best_error_blue_sofar)
			{
				for(colorV_enc[2] = 0; colorV_enc[2]<64; colorV_enc[2]++)
				{
					error = calcErrorPlanarOnlyBlue(block, colorO_enc[2], colorH_enc[2], colorV_enc[2], lowest_possible_error, BBBtable[colorO_enc[2]*64+colorV_enc[2]], CCCtable[colorH_enc[2]*64+colorV_enc[2]], best_error_blue_sofar);
					if(error < best_error)
					{
						best_error = error;
						best_colorO_enc[2] = colorO_enc[2];
						best_colorH_enc[2] = colorH_enc[2];
						best_colorV_enc[2] = colorV_enc[2];
					}
				}
			}
		}
	}

	compressed57_1[0] = 0;
	compressed57_2[0] = 0;
	compressed57_1[0] = PUTBITSHIGH( compressed57_1[0], best_colorO_enc[0], 6, 63);
	compressed57_1[0] = PUTBITSHIGH( compressed57_1[0], best_colorO_enc[1], 7, 57);
	compressed57_1[0] = PUTBITSHIGH( compressed57_1[0], best_colorO_enc[2], 6, 50);
	compressed57_1[0] = PUTBITSHIGH( compressed57_1[0], best_colorH_enc[0], 6, 44);
	compressed57_1[0] = PUTBITSHIGH( compressed57_1[0], best_colorH_enc[1], 7, 38);
	compressed57_2[0] = PUTBITS(     compressed57_2[0], best_colorH_enc[2], 6, 31);
	compressed57_2[0] = PUTBITS(     compressed57_2[0], best_colorV_enc[0], 6, 25);
	compressed57_2[0] = PUTBITS(     compressed57_2[0], best_colorV_enc[1], 7, 19);
	compressed57_2[0] = PUTBITS(     compressed57_2[0], best_colorV_enc[2], 6, 12);
	
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_Rpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col0_R:Uint32Array)
{
	var block_error = 0, 
	  	     	 best_block_error = MAXERR1000,
			     pixel_error, 
		         best_pixel_error;
	var diff;
	var color;
	var possible_colors = new Uint8Array(3);

	color = ((colorRGB444_packed >> 8) & 0xf)*17;

	// Test all distances
	for (let d = 0; d < 8; d++)
	{

		possible_colors[0] = CLAMP(0,color - table59T[d],255);
		possible_colors[1] = CLAMP(0,color,255);
		possible_colors[2] = CLAMP(0,color + table59T[d],255);

		// Loop block
		for (let x = 0; x < 16; x++)
		{
			best_pixel_error = MAXERR1000;

			// Loop possible block colors
			for (let c = 0; c < 3; c++) 
			{
			
				diff = block[4*x + R] - CLAMP(0,possible_colors[c],255);

				pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff);

				// Choose best error
				if (pixel_error < best_pixel_error) 
					best_pixel_error = pixel_error;
			}

			precalc_err_col0_R[((colorRGB444_packed>>8)*8 + d)*16 + x] = best_pixel_error >>> 0;
		}

	}
		
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_R( block:uint8, colorRGB444_packed:number, precalc_err_col0_R:Uint32Array)
{
	var block_error = 0, 
	  	     	   best_block_error = MAXIMUM_ERROR, 
							 pixel_error, 
							 best_pixel_error;
	var diff;
	var color;
	var possible_colors = new Uint8Array(3);

	color = ((colorRGB444_packed >> 8) & 0xf)*17;

	// Test all distances
	for (let d = 0; d < 8; d++)
	{

		possible_colors[0] = CLAMP(0,color - table59T[d],255);
		possible_colors[1] = CLAMP(0,color,255);
		possible_colors[2] = CLAMP(0,color + table59T[d],255);

		// Loop block
		for (let x = 0; x < 16; x++)
		{
			best_pixel_error = MAXIMUM_ERROR;

			// Loop possible block colors
			for (let c = 0; c < 3; c++) 
			{
			
				diff = block[4*x + R] - CLAMP(0,possible_colors[c],255);

				pixel_error = SQUARE(diff);

				// Choose best error
				if (pixel_error < best_pixel_error) 
					best_pixel_error = pixel_error;
			}
			precalc_err_col0_R[((colorRGB444_packed>>8)*8 + d)*16 + x] = best_pixel_error >>> 0;
		}
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_RGpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col0_RG:Uint32Array)
{
	var block_error = 0, 
	  	     	 best_block_error = MAXERR1000,
			     pixel_error, 
		         best_pixel_error;
	var diff = new Int32Array(3);
	var color = new Uint8Array(3);
	var possible_colors =  Array.from({length: 3}, () => new Uint8Array(2));

	color[R] = ((colorRGB444_packed >> 8) & 0xf)*17;
	color[G] = ((colorRGB444_packed >> 4) & 0xf)*17;

	// Test all distances
	for (let d = 0; d < 8; d++)
	{

		possible_colors[0][R] = CLAMP(0,color[R] - table59T[d],255);
		possible_colors[0][G] = CLAMP(0,color[G] - table59T[d],255);

		possible_colors[1][R] = CLAMP(0,color[R],255);
		possible_colors[1][G] = CLAMP(0,color[G],255);

		possible_colors[2][R] = CLAMP(0,color[R] + table59T[d],255);
		possible_colors[2][G] = CLAMP(0,color[G] + table59T[d],255);

		

		// Loop block
		for (let x = 0; x < 16; x++)
		{
			best_pixel_error = MAXERR1000;

			// Loop possible block colors
			for (let c = 0; c < 3; c++) 
			{
			
				diff[R] = block[4*x + R] - CLAMP(0,possible_colors[c][R],255);
				diff[G] = block[4*x + G] - CLAMP(0,possible_colors[c][G],255);

				pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff[R]) + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*SQUARE(diff[G]);

				// Choose best error
				if (pixel_error < best_pixel_error) 
					best_pixel_error = pixel_error;
			}
			precalc_err_col0_RG[((colorRGB444_packed>>4)*8 + d)*16 + x] = best_pixel_error >>> 0;
		}
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_RG( block:uint8, colorRGB444_packed:number,precalc_err_col0_RG:Uint32Array)
{
	var block_error = 0, 
	  	     	 best_block_error = MAXIMUM_ERROR, 
			     pixel_error, 
		         best_pixel_error;
	var diff = new Int32Array(3);
	var color = new Uint8Array(3); 
	var possible_colors = Array.from({length: 3}, () => new Uint8Array(2));

	color[R] = ((colorRGB444_packed >> 8) & 0xf)*17;
	color[G] = ((colorRGB444_packed >> 4) & 0xf)*17;

	// Test all distances
	for (let d = 0; d < 8; d++)
	{

		possible_colors[0][R] = CLAMP(0,color[R] - table59T[d],255);
		possible_colors[0][G] = CLAMP(0,color[G] - table59T[d],255);

		possible_colors[1][R] = CLAMP(0,color[R],255);
		possible_colors[1][G] = CLAMP(0,color[G],255);

		possible_colors[2][R] = CLAMP(0,color[R] + table59T[d],255);
		possible_colors[2][G] = CLAMP(0,color[G] + table59T[d],255);

		// Loop block
		for (let x = 0; x < 16; x++)
		{
			best_pixel_error = MAXIMUM_ERROR;

			// Loop possible block colors
			for (let c = 0; c < 3; c++) 
			{
				diff[R] = block[4*x + R] - CLAMP(0,possible_colors[c][R],255);
				diff[G] = block[4*x + G] - CLAMP(0,possible_colors[c][G],255);

				pixel_error = SQUARE(diff[R]) + SQUARE(diff[G]);

				// Choose best error
				if (pixel_error < best_pixel_error) 
					best_pixel_error = pixel_error;
			}
			precalc_err_col0_RG[((colorRGB444_packed>>4)*8 + d)*16 + x] = best_pixel_error >>> 0;
		}
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col1_Rpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col1_R:Uint32Array)
{
	var pixel_error; 
	var diff;
	var color;

	color = ((colorRGB444_packed >> 8) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff = block[4*x + R] - color;
		pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff);
		precalc_err_col1_R[((colorRGB444_packed>>8))*16 + x] = pixel_error >>> 0;
	}
}

/**
 * Calculate the error for the block at position (startx,starty)
 * The parameters needed for reconstruction is calculated as well
 *
 * In the 59T bit mode, we only have pattern T.
 */
function precalcError59T_col1_R( block:uint8, colorRGB444_packed:number, precalc_err_col1_R:Uint32Array)
{
	var pixel_error; 
	var diff;
	var color;

	color = ((colorRGB444_packed >> 8) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff = block[4*x + R] - color;
		pixel_error = SQUARE(diff);
		precalc_err_col1_R[((colorRGB444_packed>>8))*16 + x] =  pixel_error >>> 0;
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col1_RGpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col1_RG:Uint32Array)
{
	var pixel_error; 
	var diff = new Int32Array(3);
	var color = new Uint8Array(2);

	color[R] = ((colorRGB444_packed >> 8) & 0xf)*17;
	color[G] = ((colorRGB444_packed >> 4) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff[R] = block[4*x + R] - color[R];
		diff[G] = block[4*x + G] - color[G];
		pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff[R]) + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*SQUARE(diff[G]);
		precalc_err_col1_RG[((colorRGB444_packed>>4))*16 + x] = pixel_error >>> 0;
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col1_RG( block:uint8, colorRGB444_packed:number, precalc_err_col1_RG:Uint32Array)
{
	var pixel_error; 
	var diff = new Int32Array(3);
	var color = new Uint8Array(2);

	color[R] = ((colorRGB444_packed >> 8) & 0xf)*17;
	color[G] = ((colorRGB444_packed >> 4) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff[R] = block[4*x + R] - color[R];
		diff[G] = block[4*x + G] - color[G];
		pixel_error = SQUARE(diff[R]) + SQUARE(diff[G]);
		precalc_err_col1_RG[((colorRGB444_packed>>4))*16 + x] = pixel_error >>> 0;
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_RGBpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col0_RGB:Uint32Array)
{
	var block_error = 0, 
	  	     	 best_block_error = MAXERR1000,
			     pixel_error, 
		         best_pixel_error;
	var color = new Uint8Array(3);
	var possible_colors = Array.from({length: 3}, () => new Int32Array(3));
	var precalc_err_col0_RGB_adr = new Uint32Array(16);

	function ONEPOINT59RGB_PERCEP(xval:number) {
			/* Loop possible block colors */
			/* unroll loop for (uint8 c = 0; c < 3; c++) */
			{
				best_pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*square_table[block[4*xval + R] - possible_colors[0][R]]
                            + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*square_table[block[4*xval + G] - possible_colors[0][G]] 
							+ PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*square_table[block[4*xval + B] - possible_colors[0][B]];
				pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*square_table[block[4*xval + R] - possible_colors[1][R]]
                            + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*square_table[block[4*xval + G] - possible_colors[1][G]]
							+ PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*square_table[block[4*xval + B] - possible_colors[1][B]];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
				pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*square_table[block[4*xval + R] - possible_colors[2][R]]
                            + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*square_table[block[4*xval + G] - possible_colors[2][G]]
							+ PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*square_table[block[4*xval + B] - possible_colors[2][B]];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
			}
			precalc_err_col0_RGB_adr[xval] = best_pixel_error >>> 0;
	}
	function ONETABLE59RGB_PERCEP(dval:number) {
		possible_colors[0][R] = clamp_table[color[R] - table59T[dval]+255]-255;
		possible_colors[0][G] = clamp_table[color[G] - table59T[dval]+255]-255;
		possible_colors[0][B] = clamp_table[color[B] - table59T[dval]+255]-255;
		possible_colors[1][R] = color[R]-255;
		possible_colors[1][G] = color[G]-255;
		possible_colors[1][B] = color[B]-255;
		possible_colors[2][R] = clamp_table[color[R] + table59T[dval]+255]-255;
		possible_colors[2][G] = clamp_table[color[G] + table59T[dval]+255]-255;
		possible_colors[2][B] = clamp_table[color[B] + table59T[dval]+255]-255;
		precalc_err_col0_RGB_adr = precalc_err_col0_RGB.subarray( (colorRGB444_packed*8 + dval)*16, precalc_err_col0_RGB.length);
		/* Loop block */
		/* unroll loop for (int x = 0; x < 16; x++) */
		{
			ONEPOINT59RGB_PERCEP(0)
			ONEPOINT59RGB_PERCEP(1)
			ONEPOINT59RGB_PERCEP(2)
			ONEPOINT59RGB_PERCEP(3)
			ONEPOINT59RGB_PERCEP(4)
			ONEPOINT59RGB_PERCEP(5)
			ONEPOINT59RGB_PERCEP(6)
			ONEPOINT59RGB_PERCEP(7)
			ONEPOINT59RGB_PERCEP(8)
			ONEPOINT59RGB_PERCEP(9)
			ONEPOINT59RGB_PERCEP(10)
			ONEPOINT59RGB_PERCEP(11)
			ONEPOINT59RGB_PERCEP(12)
			ONEPOINT59RGB_PERCEP(13)
			ONEPOINT59RGB_PERCEP(14)
			ONEPOINT59RGB_PERCEP(15)
		}
	}
	color[R] = (((colorRGB444_packed >> 8) ) << 4) | ((colorRGB444_packed >> 8) ) ;
	color[G] = (((colorRGB444_packed >> 4) & 0xf) << 4) | ((colorRGB444_packed >> 4) & 0xf) ;
	color[B] = (((colorRGB444_packed) & 0xf) << 4) | ((colorRGB444_packed) & 0xf) ;
	
	/* Test all distances */
	/* unroll loop for (uint8 d = 0; d < 8; ++d) */
	{
		ONETABLE59RGB_PERCEP(0)
		ONETABLE59RGB_PERCEP(1)
		ONETABLE59RGB_PERCEP(2)
		ONETABLE59RGB_PERCEP(3)
		ONETABLE59RGB_PERCEP(4)
		ONETABLE59RGB_PERCEP(5)
		ONETABLE59RGB_PERCEP(6)
		ONETABLE59RGB_PERCEP(7)
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col0_RGB( block:uint8, colorRGB444_packed:number, precalc_err_col0_RGB:Uint32Array)
{
	var block_error = 0, 
	  	     	 best_block_error = MAXIMUM_ERROR, 
			     pixel_error, 
		         best_pixel_error;
	var color = new Uint8Array(3);
	var possible_colors = Array.from({length: 3}, () => new Int32Array(3));
	var precalc_err_col0_RGB_adr = new Uint32Array(16);

	function ONEPOINT59RGB(xval:number) {
			/* Loop possible block colors */
			/* unroll loop for (uint8 c = 0; c < 3; c++) */
			{
				best_pixel_error = square_table[block[4*xval + R] - possible_colors[0][R]]
                            + square_table[block[4*xval + G] - possible_colors[0][G]] 
							+ square_table[block[4*xval + B] - possible_colors[0][B]];
				pixel_error = square_table[block[4*xval + R] - possible_colors[1][R]]
                            + square_table[block[4*xval + G] - possible_colors[1][G]]
							+ square_table[block[4*xval + B] - possible_colors[1][B]];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
				pixel_error = square_table[block[4*xval + R] - possible_colors[2][R]]
                            + square_table[block[4*xval + G] - possible_colors[2][G]]
							+ square_table[block[4*xval + B] - possible_colors[2][B]];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
			}
			precalc_err_col0_RGB_adr[xval] = best_pixel_error >>> 0;
	}
	function ONETABLE59RGB(dval:number) {
		possible_colors[0][R] = clamp_table[color[R] - table59T[dval]+255]-255;
		possible_colors[0][G] = clamp_table[color[G] - table59T[dval]+255]-255;
		possible_colors[0][B] = clamp_table[color[B] - table59T[dval]+255]-255;
		possible_colors[1][R] = color[R]-255;
		possible_colors[1][G] = color[G]-255;
		possible_colors[1][B] = color[B]-255;
		possible_colors[2][R] = clamp_table[color[R] + table59T[dval]+255]-255;
		possible_colors[2][G] = clamp_table[color[G] + table59T[dval]+255]-255;
		possible_colors[2][B] = clamp_table[color[B] + table59T[dval]+255]-255;
		precalc_err_col0_RGB_adr = precalc_err_col0_RGB.subarray((colorRGB444_packed*8 + dval)*16,precalc_err_col0_RGB.length);
		/* Loop block */
		/* unroll loop for (int x = 0; x < 16; x++) */
		{
			ONEPOINT59RGB(0)
			ONEPOINT59RGB(1)
			ONEPOINT59RGB(2)
			ONEPOINT59RGB(3)
			ONEPOINT59RGB(4)
			ONEPOINT59RGB(5)
			ONEPOINT59RGB(6)
			ONEPOINT59RGB(7)
			ONEPOINT59RGB(8)
			ONEPOINT59RGB(9)
			ONEPOINT59RGB(10)
			ONEPOINT59RGB(11)
			ONEPOINT59RGB(12)
			ONEPOINT59RGB(13)
			ONEPOINT59RGB(14)
			ONEPOINT59RGB(15)
		}
	}
	color[R] = (((colorRGB444_packed >> 8) ) << 4) | ((colorRGB444_packed >> 8) ) ;
	color[G] = (((colorRGB444_packed >> 4) & 0xf) << 4) | ((colorRGB444_packed >> 4) & 0xf) ;
	color[B] = (((colorRGB444_packed) & 0xf) << 4) | ((colorRGB444_packed) & 0xf) ;

	/* Test all distances */
	/* unroll loop for (uint8 d = 0; d < 8; ++d) */
	{
		ONETABLE59RGB(0)
		ONETABLE59RGB(1)
		ONETABLE59RGB(2)
		ONETABLE59RGB(3)
		ONETABLE59RGB(4)
		ONETABLE59RGB(5)
		ONETABLE59RGB(6)
		ONETABLE59RGB(7)
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col1_RGBpercep1000( block:uint8, colorRGB444_packed:number, precalc_err_col1_RGB: Uint32Array)
{
	var pixel_error;
	var diff = new Int32Array(3);
	var colorRGB = new Uint8Array(3);

	colorRGB[0] = ((colorRGB444_packed >> 8) & 0xf)*17;
	colorRGB[1] = ((colorRGB444_packed >> 4) & 0xf)*17;
	colorRGB[2] = ((colorRGB444_packed >> 0) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff[R] = block[4*x + R] - colorRGB[R];
		diff[G] = block[4*x + G] - colorRGB[G];
		diff[B] = block[4*x + B] - colorRGB[B];

		pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff[R]) + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*SQUARE(diff[G]) + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*SQUARE(diff[B]);
		
		precalc_err_col1_RGB[(colorRGB444_packed)*16 + x] = pixel_error >>> 0;
	}
}

// Precalculates a table used in exhaustive compression of the T-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError59T_col1_RGB(block:uint8, colorRGB444_packed:number, precalc_err_col1_RGB: Uint32Array)
{
	var pixel_error;
	var diff = new Int32Array(3);
	var colorRGB = new Uint8Array(3);

	colorRGB[0] = ((colorRGB444_packed >> 8) & 0xf)*17;
	colorRGB[1] = ((colorRGB444_packed >> 4) & 0xf)*17;
	colorRGB[2] = ((colorRGB444_packed >> 0) & 0xf)*17;

	// Loop block
	for (let x = 0; x < 16; x++)
	{
		diff[R] = block[4*x + R] - colorRGB[R];
		diff[G] = block[4*x + G] - colorRGB[G];
		diff[B] = block[4*x + B] - colorRGB[B];

		pixel_error = SQUARE(diff[R]) + SQUARE(diff[G]) + SQUARE(diff[B]);
		precalc_err_col1_RGB[(colorRGB444_packed)*16 + x] = pixel_error >>> 0;
	}
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcRperceptual1000( block: uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_R:Uint32Array, precalc_err_col1_R:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					best_block_error = MAXERR1000;

	var pixel_error_col0_base_adr = new Uint32Array(16);
	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);

	function FIRSTCHOICE59R_PERCEP(){
			if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
				block_error = pixel_error_col0_adr[0];
			else
				block_error = pixel_error_col1_adr[0];
	}
	function CHOICE59R_PERCEP(xval:number){
			if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
				block_error += pixel_error_col0_adr[xval];
			else
				block_error += pixel_error_col1_adr[xval];
	}
	function ONETABLE59R_PERCEP(dval:number) {
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16,pixel_error_col0_base_adr.length);
		/* unroll loop for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59R_PERCEP();
			if( block_error < best_error_so_far)
			{
				CHOICE59R_PERCEP(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59R_PERCEP(2)
					CHOICE59R_PERCEP(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59R_PERCEP(4)
						CHOICE59R_PERCEP(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59R_PERCEP(6)
							CHOICE59R_PERCEP(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59R_PERCEP(8)
								CHOICE59R_PERCEP(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59R_PERCEP(10)
									CHOICE59R_PERCEP(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59R_PERCEP(12)
										CHOICE59R_PERCEP(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59R_PERCEP(14)
											CHOICE59R_PERCEP(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}
	pixel_error_col0_base_adr = precalc_err_col0_R.subarray(((colorsRGB444_packed[0]>>8)*8)*16,precalc_err_col0_R.length);
	pixel_error_col1_adr = precalc_err_col1_R.subarray(((colorsRGB444_packed[1]>>8))*16,precalc_err_col1_R.length);

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++) */
	{
		ONETABLE59R_PERCEP(0)
		ONETABLE59R_PERCEP(1)
		ONETABLE59R_PERCEP(2)
		ONETABLE59R_PERCEP(3)
		ONETABLE59R_PERCEP(4)
		ONETABLE59R_PERCEP(5)
		ONETABLE59R_PERCEP(6)
		ONETABLE59R_PERCEP(7)
	}
	return best_block_error >>> 0;
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcR( block:uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_R:Uint32Array, precalc_err_col1_R:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					best_block_error = MAXIMUM_ERROR;

	var pixel_error_col0_base_adr = new Uint32Array(16);
	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);

	function FIRSTCHOICE59R(){
			if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
				block_error = pixel_error_col0_adr[0];
			else
				block_error = pixel_error_col1_adr[0];
	}
	function CHOICE59R(xval:number){
			if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
				block_error += pixel_error_col0_adr[xval];
			else
				block_error += pixel_error_col1_adr[xval];
	}
	function ONETABLE59R(dval:number) {
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16, pixel_error_col0_base_adr.length);
		/* unroll loop for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59R()
			if( block_error < best_error_so_far)
			{
				CHOICE59R(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59R(2)
					CHOICE59R(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59R(4)
						CHOICE59R(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59R(6)
							CHOICE59R(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59R(8)
								CHOICE59R(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59R(10)
									CHOICE59R(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59R(12)
										CHOICE59R(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59R(14)
											CHOICE59R(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}
	pixel_error_col0_base_adr = precalc_err_col0_R.subarray(((colorsRGB444_packed[0]>>8)*8)*16,precalc_err_col0_R.length);
	pixel_error_col1_adr = precalc_err_col1_R.subarray(((colorsRGB444_packed[1]>>8))*16,precalc_err_col1_R.length);


	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++) */
	{
		ONETABLE59R(0)
		ONETABLE59R(1)
		ONETABLE59R(2)
		ONETABLE59R(3)
		ONETABLE59R(4)
		ONETABLE59R(5)
		ONETABLE59R(6)
		ONETABLE59R(7)
	}
	
	return best_block_error >>> 0;
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcRGperceptual1000( block:uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_RG:Uint32Array, precalc_err_col1_RG:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					best_block_error = MAXERR1000;

	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);
	var pixel_error_col0_base_adr = new Uint32Array(16);
	

	function FIRSTCHOICE59RG_PERCEP(){
		if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
			block_error = pixel_error_col0_adr[0];
		else
			block_error = pixel_error_col1_adr[0];
	}

	function CHOICE59RG_PERCEP(xval:number) {
		if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
			block_error += pixel_error_col0_adr[xval];
		else
			block_error += pixel_error_col1_adr[xval];
	}

	function ONETABLE59RG_PERCEP(dval:number){
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16,pixel_error_col0_base_adr.length);
		/* unroll loop for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59RG_PERCEP();
			if( block_error < best_error_so_far)
			{
				CHOICE59RG_PERCEP(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59RG_PERCEP(2)
					CHOICE59RG_PERCEP(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59RG_PERCEP(4)
						CHOICE59RG_PERCEP(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59RG_PERCEP(6)
							CHOICE59RG_PERCEP(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59RG_PERCEP(8)
								CHOICE59RG_PERCEP(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59RG_PERCEP(10)
									CHOICE59RG_PERCEP(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59RG_PERCEP(12)
										CHOICE59RG_PERCEP(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59RG_PERCEP(14)
											CHOICE59RG_PERCEP(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}

	pixel_error_col0_base_adr = precalc_err_col0_RG.subarray(((colorsRGB444_packed[0]>>4)*8)*16,precalc_err_col0_RG.length);
	pixel_error_col1_adr = precalc_err_col1_RG.subarray(((colorsRGB444_packed[1]>>4))*16,precalc_err_col1_RG.length);

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++) */
	{

		ONETABLE59RG_PERCEP(0)
		ONETABLE59RG_PERCEP(1)
		ONETABLE59RG_PERCEP(2)
		ONETABLE59RG_PERCEP(3)
		ONETABLE59RG_PERCEP(4)
		ONETABLE59RG_PERCEP(5)
		ONETABLE59RG_PERCEP(6)
		ONETABLE59RG_PERCEP(7)
	}
	return best_block_error >>> 0;
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcRG( block:uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_RG:Uint32Array, precalc_err_col1_RG:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					best_block_error = MAXIMUM_ERROR;

	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);
	var pixel_error_col0_base_adr = new Uint32Array(16);
	

	function FIRSTCHOICE59RG (){
		if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
			block_error = pixel_error_col0_adr[0];
		else
			block_error = pixel_error_col1_adr[0];
	}

	function CHOICE59RG(xval:number) {
		if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
			block_error += pixel_error_col0_adr[xval];
		else
			block_error += pixel_error_col1_adr[xval];
	}

	function ONETABLE59RG(dval:number){
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16, pixel_error_col0_base_adr.length);
		/* unroll loop for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59RG();
			if( block_error < best_error_so_far)
			{
				CHOICE59RG(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59RG(2)
					CHOICE59RG(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59RG(4)
						CHOICE59RG(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59RG(6)
							CHOICE59RG(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59RG(8)
								CHOICE59RG(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59RG(10)
									CHOICE59RG(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59RG(12)
										CHOICE59RG(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59RG(14)
											CHOICE59RG(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}

	pixel_error_col0_base_adr = precalc_err_col0_RG.subarray(((colorsRGB444_packed[0]>>4)*8)*16, precalc_err_col0_RG.length);
	pixel_error_col1_adr = precalc_err_col1_RG.subarray(((colorsRGB444_packed[1]>>4))*16, precalc_err_col1_RG.length);

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++) */
	{
		ONETABLE59RG(0)
		ONETABLE59RG(1)
		ONETABLE59RG(2)
		ONETABLE59RG(3)
		ONETABLE59RG(4)
		ONETABLE59RG(5)
		ONETABLE59RG(6)
		ONETABLE59RG(7)
	}
	return best_block_error >>> 0;
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcRGBperceptual1000( block:uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_RGB:Uint32Array, precalc_err_col1_RGB:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					      best_block_error = MAXERR1000;

	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);
	var pixel_error_col0_base_adr = new Uint32Array(16);

	function FIRSTCHOICE59_PERCEP (){
		if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
			block_error = pixel_error_col0_adr[0];
		else
			block_error = pixel_error_col1_adr[0];
	}

	function CHOICE59_PERCEP(xval:number) {
	if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
		block_error += pixel_error_col0_adr[xval];
	else
		block_error += pixel_error_col1_adr[xval];
	}

	function ONETABLE59T_PERCEP(dval:number){
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16,pixel_error_col0_base_adr.length);
		/* unroll for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59_PERCEP()
			if( block_error < best_error_so_far)
			{
				CHOICE59_PERCEP(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59_PERCEP(2)
					CHOICE59_PERCEP(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59_PERCEP(4)
						CHOICE59_PERCEP(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59_PERCEP(6)
							CHOICE59_PERCEP(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59_PERCEP(8)
								CHOICE59_PERCEP(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59_PERCEP(10)
									CHOICE59_PERCEP(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59_PERCEP(12)
										CHOICE59_PERCEP(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59_PERCEP(14)
											CHOICE59_PERCEP(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}

	pixel_error_col1_adr = precalc_err_col1_RGB.subarray((colorsRGB444_packed[1])*16, precalc_err_col1_RGB.length);
	pixel_error_col0_base_adr = precalc_err_col0_RGB.subarray((colorsRGB444_packed[0]*8)*16, precalc_err_col0_RGB.length);

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++)*/
	{
		ONETABLE59T_PERCEP(0)
		ONETABLE59T_PERCEP(1)
		ONETABLE59T_PERCEP(2)
		ONETABLE59T_PERCEP(3)
		ONETABLE59T_PERCEP(4)
		ONETABLE59T_PERCEP(5)
		ONETABLE59T_PERCEP(6)
		ONETABLE59T_PERCEP(7)
	}
	return best_block_error >>> 0;
}

// Calculate a minimal error for the T-mode when compressing exhaustively.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateError59TusingPrecalcRGB( block:uint8, colorsRGB444_packed:Int32Array, precalc_err_col0_RGB:Uint32Array, precalc_err_col1_RGB:Uint32Array, best_error_so_far:number) 
{
	var	block_error = 0, 
					      best_block_error = MAXIMUM_ERROR;
	var pixel_error_col0_adr = new Uint32Array(16), pixel_error_col1_adr = new Uint32Array(16);
	var pixel_error_col0_base_adr = new Uint32Array(16);

	function FIRSTCHOICE59 (){
		if(pixel_error_col0_adr[0] < pixel_error_col1_adr[0])
			block_error = pixel_error_col0_adr[0];
		else
			block_error = pixel_error_col1_adr[0];
	}
	function CHOICE59(xval:number) {
		if(pixel_error_col0_adr[xval] < pixel_error_col1_adr[xval])
			block_error += pixel_error_col0_adr[xval];
		else
			block_error += pixel_error_col1_adr[xval];
	}
	function ONETABLE59T(dval:number){
		pixel_error_col0_adr = pixel_error_col0_base_adr.subarray(dval*16,pixel_error_col0_base_adr.length);
		/* unroll for(int x = 0; block_error < best_error_so_far && x<16; x++) */
		{
			FIRSTCHOICE59();
			if( block_error < best_error_so_far)
			{
				CHOICE59(1)
				if( block_error < best_error_so_far)
				{
					CHOICE59(2)
					CHOICE59(3)
					if( block_error < best_error_so_far)
					{
						CHOICE59(4)
						CHOICE59(5)
						if( block_error < best_error_so_far)
						{
							CHOICE59(6)
							CHOICE59(7)
							if( block_error < best_error_so_far)
							{
								CHOICE59(8)
								CHOICE59(9)
								if( block_error < best_error_so_far)
								{
									CHOICE59(10)
									CHOICE59(11)
									if( block_error < best_error_so_far)
									{
										CHOICE59(12)
										CHOICE59(13)
										if( block_error < best_error_so_far)
										{
											CHOICE59(14)
											CHOICE59(15)
										}
									}
								}
							}
						}
					}
				}
			}
		}
		if (block_error < best_block_error)
			best_block_error = block_error;
	}
	pixel_error_col1_adr = precalc_err_col1_RGB.subarray((colorsRGB444_packed[1])*16, precalc_err_col1_RGB.length);
	pixel_error_col0_base_adr = precalc_err_col0_RGB.subarray((colorsRGB444_packed[0]*8)*16, precalc_err_col0_RGB.length);

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; d++)*/
	{
		ONETABLE59T(0)
		ONETABLE59T(1)
		ONETABLE59T(2)
		ONETABLE59T(3)
		ONETABLE59T(4)
		ONETABLE59T(5)
		ONETABLE59T(6)
		ONETABLE59T(7)
	}
	return best_block_error >>> 0;
}

// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// Note that this method might not return the best possible compression for the T-mode. It will only do so if the best possible T-representation
// is less than best_error_so_far. To guarantee that the best possible T-representation is found, the function should be called using
// best_error_so_far = 255*255*3*16, which is the maximum error for a block. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TExhaustivePerceptual(img:uint8, width:number, height:number, startx:number, starty:number, compressed1:Uint32Array, compressed2:Uint32Array, best_error_so_far:number) 
{
	var colorsRGB444 = Array.from({length: 2}, () => new Uint8Array(3));
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);

	var block = new Uint8Array(4*4*4);

	// unsigned int *precalc_err_col0_RGB;
	// unsigned int *precalc_err_col1_RGB;
	// unsigned int *precalc_err_col0_RG;
	// unsigned int *precalc_err_col1_RG;
	// unsigned int *precalc_err_col0_R;
	// unsigned int *precalc_err_col1_R;

	var colorRGB444_packed;

	var colorsRGB444_packed = new Int32Array(2);
	var best_colorsRGB444_packed = new Int32Array(2);

	var best_error_using_Tmode;

	// First compress block quickly to a resonable quality so that we can
	// rule out all blocks that are of worse quality than that. 
	best_error_using_Tmode = compressBlockTHUMB59TFastestOnlyColorPerceptual1000(img, width, height, startx, starty, best_colorsRGB444_packed) >>> 0;
	if(best_error_using_Tmode < best_error_so_far)
		best_error_so_far = best_error_using_Tmode;

	// Color numbering is reversed between the above function and the precalc functions below; swap colors.
	var temp = best_colorsRGB444_packed[0];
	best_colorsRGB444_packed[0] = best_colorsRGB444_packed[1];
	best_colorsRGB444_packed[1] = temp;

	var xx,yy,count = 0;

	// Use 4 bytes per pixel to make it 32-word aligned.
	for(xx = 0; xx<4; xx++)
	{
		for(yy=0; yy<4; yy++)
		{
			block[(count)*4] = img[((starty+yy)*width+(startx+xx))*3];
			block[(count)*4+1] = img[((starty+yy)*width+(startx+xx))*3+1];
			block[(count)*4+2] = img[((starty+yy)*width+(startx+xx))*3+2];
			block[(count)*4+3] = 0;
			count++;
		}
	}

	// Precalculate error for color 0 (which produces the upper half of the T)
	var precalc_err_col0_RGB = new Uint32Array(4096*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed++)
	{
		precalcError59T_col0_RGBpercep1000(block, colorRGB444_packed, precalc_err_col0_RGB);
	}

	// Precalculate error for color 1 (which produces the lower half of the T -- the lone color)
	var precalc_err_col1_RGB = new Uint32Array(4096*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed++)
	{
		precalcError59T_col1_RGBpercep1000(block, colorRGB444_packed, precalc_err_col1_RGB);
	}

	var precalc_err_col0_RG = new Uint32Array(16*16*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16)
	{
		precalcError59T_col0_RGpercep1000(block, colorRGB444_packed, precalc_err_col0_RG);
	}

	var precalc_err_col1_RG = new Uint32Array(16*16*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16)
	{
		precalcError59T_col1_RGpercep1000(block, colorRGB444_packed, precalc_err_col1_RG);
	}

	var precalc_err_col0_R = new Uint32Array(16*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16*16)
	{
		precalcError59T_col0_Rpercep1000(block, colorRGB444_packed, precalc_err_col0_R);
	}

	var precalc_err_col1_R = new Uint32Array(16*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16*16)
	{
		precalcError59T_col1_Rpercep1000(block, colorRGB444_packed, precalc_err_col1_R);
	}

	var error;
	var avoided = 0;
	var notavoided = 0;

	for(colorsRGB444[0][0] = 0; colorsRGB444[0][0] < 16; colorsRGB444[0][0]++)
	{
		for(colorsRGB444[1][0] = 0; colorsRGB444[1][0] < 16; colorsRGB444[1][0]++)
		{
			colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8);
			colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8);
			error = calculateError59TusingPrecalcRperceptual1000(block, colorsRGB444_packed, precalc_err_col0_R, precalc_err_col1_R, best_error_so_far);
			if(error < best_error_so_far)
			{
				notavoided = notavoided + 1;
				for(colorsRGB444[0][1] = 0; colorsRGB444[0][1] < 16; colorsRGB444[0][1]++)
				{
					colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8) + (colorsRGB444[0][1] <<4);
					for(colorsRGB444[1][1] = 0; colorsRGB444[1][1] < 16; colorsRGB444[1][1]++)
					{
						colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8) + (colorsRGB444[1][1] <<4);
						error = calculateError59TusingPrecalcRGperceptual1000(block, colorsRGB444_packed, precalc_err_col0_RG, precalc_err_col1_RG, best_error_so_far);
						if(error < best_error_so_far)
						{
							for(colorsRGB444[0][2] = 0; colorsRGB444[0][2] < 16; colorsRGB444[0][2]++)
							{
								colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8) + (colorsRGB444[0][1] <<4) + colorsRGB444[0][2];
								for(colorsRGB444[1][2] = 0; colorsRGB444[1][2] < 16; colorsRGB444[1][2]++)
								{
									colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8) + (colorsRGB444[1][1] <<4) + colorsRGB444[1][2];
									error = calculateError59TusingPrecalcRGBperceptual1000(block, colorsRGB444_packed, precalc_err_col0_RGB, precalc_err_col1_RGB, best_error_so_far);

									if(error < best_error_so_far)
									{
										best_error_so_far = error;
										best_error_using_Tmode = error;
										best_colorsRGB444_packed[0] = colorsRGB444_packed[0];
										best_colorsRGB444_packed[1] = colorsRGB444_packed[1];
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// free(precalc_err_col0_RGB);
	// free(precalc_err_col1_RGB);
	// free(precalc_err_col0_RG);
	// free(precalc_err_col1_RG);
	// free(precalc_err_col0_R);
	// free(precalc_err_col1_R);

	// We have got the two best colors. Now find the best distance and pixel indices. 

	// Color numbering are reversed between precalc and noSwap
	colorsRGB444[0][0] = (best_colorsRGB444_packed[1] >> 8) & 0xf;
	colorsRGB444[0][1] = (best_colorsRGB444_packed[1] >> 4) & 0xf;
	colorsRGB444[0][2] = (best_colorsRGB444_packed[1] >> 0) & 0xf;
	
	colorsRGB444[1][0] = (best_colorsRGB444_packed[0] >> 8) & 0xf;
	colorsRGB444[1][1] = (best_colorsRGB444_packed[0] >> 4) & 0xf;
	colorsRGB444[1][2] = (best_colorsRGB444_packed[0] >> 0) & 0xf;

	calculateError59TnoSwapPerceptual1000(img, width, startx, starty, colorsRGB444, distance, pixel_indices);			

	// Put the compress params into the compression block 
	packBlock59T(colorsRGB444, distance[0], pixel_indices[0], compressed1, compressed2);

	return best_error_using_Tmode >>> 0;
}

// The below code should compress the block to 59 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
//
//|63 62 61 60 59|58 57 56 55|54 53 52 51|50 49 48 47|46 45 44 43|42 41 40 39|38 37 36 35|34 33 32|
//|----empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|--dist--|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// Note that this method might not return the best possible compression for the T-mode. It will only do so if the best possible T-representation
// is less than best_error_so_far. To guarantee that the best possible T-representation is found, the function should be called using
// best_error_so_far = 255*255*3*16, which is the maximum error for a block. 
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB59TExhaustive(img:uint8, width:number, height:number, startx:number, starty:number, compressed1:Uint32Array, compressed2:Uint32Array, best_error_so_far:number) 
{
	var colorsRGB444 = Array.from({length: 2}, () => new Uint8Array(3));
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);

	var block = new Uint8Array(4*4*4);

	// unsigned int *precalc_err_col0_RGB;
	// unsigned int *precalc_err_col1_RGB;
	// unsigned int *precalc_err_col0_RG;
	// unsigned int *precalc_err_col1_RG;
	// unsigned int *precalc_err_col0_R;
	// unsigned int *precalc_err_col1_R;

	var colorRGB444_packed;

	var colorsRGB444_packed = new Int32Array(2);
	var best_colorsRGB444_packed = new Int32Array(2);

	var best_error_using_Tmode;

	// First compress block quickly to a resonable quality so that we can
	// rule out all blocks that are of worse quality than that. 
	best_error_using_Tmode = compressBlockTHUMB59TFastestOnlyColor(img, width, height, startx, starty, best_colorsRGB444_packed) >>> 0;
	if(best_error_using_Tmode < best_error_so_far)
		best_error_so_far = best_error_using_Tmode;


	// Colors numbering is reversed between the above function and the precalc below:
	var temp = best_colorsRGB444_packed[0];
	best_colorsRGB444_packed[0] = best_colorsRGB444_packed[1];
	best_colorsRGB444_packed[1] = temp;

	var xx,yy,count = 0;

	// Use 4 bytes per pixel to make it 32-word aligned.
	for(xx = 0; xx<4; xx++)
	{
		for(yy=0; yy<4; yy++)
		{
			block[(count)*4] = img[((starty+yy)*width+(startx+xx))*3];
			block[(count)*4+1] = img[((starty+yy)*width+(startx+xx))*3+1];
			block[(count)*4+2] = img[((starty+yy)*width+(startx+xx))*3+2];
			block[(count)*4+3] = 0;
			count++;
		}
	}

	// Precalculate error for color 0 (which produces the upper half of the T)
	var precalc_err_col0_RGB = new Uint32Array(4096*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed++)
	{
		precalcError59T_col0_RGB(block, colorRGB444_packed, precalc_err_col0_RGB);
	}

	// Precalculate error for color 1 (which produces the lower half of the T -- the lone color)
	var precalc_err_col1_RGB = new Uint32Array(4096*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed++)
	{
		precalcError59T_col1_RGB(block, colorRGB444_packed, precalc_err_col1_RGB);
	}

	var precalc_err_col0_RG = new Uint32Array(16*16*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16)
	{
		precalcError59T_col0_RG(block, colorRGB444_packed, precalc_err_col0_RG);
	}

	var precalc_err_col1_RG = new Uint32Array(16*16*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16)
	{
		precalcError59T_col1_RG(block, colorRGB444_packed, precalc_err_col1_RG);
	}

	var precalc_err_col0_R = new Uint32Array(16*8*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16*16)
	{
		precalcError59T_col0_R(block, colorRGB444_packed, precalc_err_col0_R);
	}

	var precalc_err_col1_R = new Uint32Array(16*16);

	for( colorRGB444_packed = 0; colorRGB444_packed<16*16*16; colorRGB444_packed+=16*16)
	{
		precalcError59T_col1_R(block, colorRGB444_packed, precalc_err_col1_R);
	}

	var error;
	var avoided = 0;
	var notavoided = 0;

	for(colorsRGB444[0][0] = 0; colorsRGB444[0][0] < 16; colorsRGB444[0][0]++)
	{
		for(colorsRGB444[1][0] = 0; colorsRGB444[1][0] < 16; colorsRGB444[1][0]++)
		{
			colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8);
			colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8);
			error = calculateError59TusingPrecalcR(block, colorsRGB444_packed, precalc_err_col0_R, precalc_err_col1_R, best_error_so_far);
			if(error < best_error_so_far)
			{
				notavoided = notavoided + 1;
				for(colorsRGB444[0][1] = 0; colorsRGB444[0][1] < 16; colorsRGB444[0][1]++)
				{
					colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8) + (colorsRGB444[0][1] <<4);
					for(colorsRGB444[1][1] = 0; colorsRGB444[1][1] < 16; colorsRGB444[1][1]++)
					{
						colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8) + (colorsRGB444[1][1] <<4);
						error = calculateError59TusingPrecalcRG(block, colorsRGB444_packed, precalc_err_col0_RG, precalc_err_col1_RG, best_error_so_far);
						if(error < best_error_so_far)
						{
							for(colorsRGB444[0][2] = 0; colorsRGB444[0][2] < 16; colorsRGB444[0][2]++)
							{
								colorsRGB444_packed[0] = (colorsRGB444[0][0] << 8) + (colorsRGB444[0][1] <<4) + colorsRGB444[0][2];
								for(colorsRGB444[1][2] = 0; colorsRGB444[1][2] < 16; colorsRGB444[1][2]++)
								{
									colorsRGB444_packed[1] = (colorsRGB444[1][0] << 8) + (colorsRGB444[1][1] <<4) + colorsRGB444[1][2];
									error = calculateError59TusingPrecalcRGB(block, colorsRGB444_packed, precalc_err_col0_RGB, precalc_err_col1_RGB, best_error_so_far);

									if(error < best_error_so_far)
									{
										best_error_so_far = error;
										best_error_using_Tmode = error;
										best_colorsRGB444_packed[0] = colorsRGB444_packed[0];
										best_colorsRGB444_packed[1] = colorsRGB444_packed[1];
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// free(precalc_err_col0_RGB);
	// free(precalc_err_col1_RGB);
	// free(precalc_err_col0_RG);
	// free(precalc_err_col1_RG);
	// free(precalc_err_col0_R);
	// free(precalc_err_col1_R);

	// We have got the two best colors. Now find the best distance and pixel indices. 

	// Color numbering are reversed between precalc and noSwap
	colorsRGB444[0][0] = (best_colorsRGB444_packed[1] >> 8) & 0xf;
	colorsRGB444[0][1] = (best_colorsRGB444_packed[1] >> 4) & 0xf;
	colorsRGB444[0][2] = (best_colorsRGB444_packed[1] >> 0) & 0xf;
	
	colorsRGB444[1][0] = (best_colorsRGB444_packed[0] >> 8) & 0xf;
	colorsRGB444[1][1] = (best_colorsRGB444_packed[0] >> 4) & 0xf;
	colorsRGB444[1][2] = (best_colorsRGB444_packed[0] >> 0) & 0xf;

	calculateError59TnoSwap(img, width, startx, starty, colorsRGB444, distance, pixel_indices);			

	// Put the compress params into the compression block 
	packBlock59T(colorsRGB444, distance[0], pixel_indices[0], compressed1, compressed2);

	return best_error_using_Tmode >>> 0;
}

// Precalculates tables used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcErrorR_58Hperceptual1000( srcimg:uint8, width:number, startx:number, starty:number, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_errR:Uint32Array) 
{
	var block_error = 0, 
		   best_block_error = MAXERR1000, 
		   pixel_error, 
		   best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors:number;
	var possible_colors = Array.from({length: 2}, () => new Uint8Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	
	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) 
	{
		possible_colors[0][R] = CLAMP(0,colors[0][R] - table58H[d],255);
		possible_colors[1][R] = CLAMP(0,colors[0][R] + table58H[d],255);

		block_error = 0;	
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) 
		{
			for (let x = 0; x < BLOCKWIDTH; ++x) 
			{
				best_pixel_error = MAXERR1000;

				// Loop possible block colors
				for (let c = 0; c < 2; ++c) 
				{
					diff[R] = srcimg[3*((starty+y)*width+startx+x)+R] - CLAMP(0,possible_colors[c][R],255);

					pixel_error =	PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff[R]);

					// Choose best error
					if (pixel_error < best_pixel_error) 
					{
						best_pixel_error = pixel_error;
					} 
				}
				precalc_errR[((colorRGB444_packed>>8)*8 + d)*16 + (y*4)+x] = best_pixel_error >>> 0;
			}
		}
	}
}

// Precalculates tables used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcErrorR_58H(srcimg:uint8, width:number, startx:number, starty:number, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_errR:Uint32Array) 
{
	var block_error = 0, 
		   best_block_error = MAXIMUM_ERROR, 
		   pixel_error, 
		   best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({length: 2}, () => new Uint8Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	
	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) 
	{
		possible_colors[0][R] = CLAMP(0,colors[0][R] - table58H[d],255);
		possible_colors[1][R] = CLAMP(0,colors[0][R] + table58H[d],255);

		block_error = 0;	
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) 
		{
			for (let x = 0; x < BLOCKWIDTH; ++x) 
			{
				best_pixel_error = MAXIMUM_ERROR;

				// Loop possible block colors
				for (let c = 0; c < 2; ++c) 
				{
					diff[R] = srcimg[3*((starty+y)*width+startx+x)+R] - CLAMP(0,possible_colors[c][R],255);

					pixel_error =	weight[R]*SQUARE(diff[R]);

					// Choose best error
					if (pixel_error < best_pixel_error) 
					{
						best_pixel_error = pixel_error;
					} 
				}
				precalc_errR[((colorRGB444_packed>>8)*8 + d)*16 + (y*4)+x] = best_pixel_error >>> 0;
			}
		}
	}
}

// Precalculates tables used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcErrorRG_58Hperceptual1000( srcimg:uint8, width:number, startx:number, starty:number, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_errRG:Uint32Array) 
{
	var block_error = 0, 
		   best_block_error = MAXERR1000,
		   pixel_error, 
		   best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({length: 2}, () => new Uint8Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	
	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) 
	{
		possible_colors[0][R] = CLAMP(0,colors[0][R] - table58H[d],255);
		possible_colors[0][G] = CLAMP(0,colors[0][G] - table58H[d],255);
		possible_colors[1][R] = CLAMP(0,colors[0][R] + table58H[d],255);
		possible_colors[1][G] = CLAMP(0,colors[0][G] + table58H[d],255);

		block_error = 0;	
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) 
		{
			for (let x = 0; x < BLOCKWIDTH; ++x) 
			{
				best_pixel_error = MAXERR1000;

				// Loop possible block colors
				for (let c = 0; c < 2; ++c) 
				{
					diff[R] = srcimg[3*((starty+y)*width+startx+x)+R] - CLAMP(0,possible_colors[c][R],255);
					diff[G] = srcimg[3*((starty+y)*width+startx+x)+G] - CLAMP(0,possible_colors[c][G],255);

					pixel_error =	PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*SQUARE(diff[R]) +
									PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*SQUARE(diff[G]);

					// Choose best error
					if (pixel_error < best_pixel_error) 
					{
						best_pixel_error = pixel_error;
					} 
				}
				precalc_errRG[((colorRGB444_packed>>4)*8 + d)*16 + (y*4)+x] = best_pixel_error >>> 0;
			}
		}
	}
}

// Precalculates tables used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcErrorRG_58H( srcimg:uint8, width:number, startx:number, starty:number, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_errRG:Uint32Array) 
{
	var block_error = 0, 
		   best_block_error = MAXIMUM_ERROR, 
		   pixel_error, 
		   best_pixel_error;
	var diff = new Int32Array(3);
	var pixel_colors;
	var possible_colors = Array.from({length: 2}, () => new Uint8Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	
	decompressColor(R_BITS58H, G_BITS58H, B_BITS58H, colorsRGB444, colors);

	// Test all distances
	for (let d = 0; d < BINPOW(TABLE_BITS_58H); ++d) 
	{
		possible_colors[0][R] = CLAMP(0,colors[0][R] - table58H[d],255);
		possible_colors[0][G] = CLAMP(0,colors[0][G] - table58H[d],255);
		possible_colors[1][R] = CLAMP(0,colors[0][R] + table58H[d],255);
		possible_colors[1][G] = CLAMP(0,colors[0][G] + table58H[d],255);

		block_error = 0;	
		pixel_colors = 0;

		// Loop block
		for (let y = 0; y < BLOCKHEIGHT; ++y) 
		{
			for (let x = 0; x < BLOCKWIDTH; ++x) 
			{
				best_pixel_error = MAXIMUM_ERROR;

				// Loop possible block colors
				for (let c = 0; c < 2; ++c) 
				{
					diff[R] = srcimg[3*((starty+y)*width+startx+x)+R] - CLAMP(0,possible_colors[c][R],255);
					diff[G] = srcimg[3*((starty+y)*width+startx+x)+G] - CLAMP(0,possible_colors[c][G],255);

					pixel_error =	weight[R]*SQUARE(diff[R]) +
									weight[G]*SQUARE(diff[G]);

					// Choose best error
					if (pixel_error < best_pixel_error) 
					{
						best_pixel_error = pixel_error;
					} 
				}
				precalc_errRG[((colorRGB444_packed>>4)*8 + d)*16 + (y*4)+x] = best_pixel_error >>> 0;
			}
		}
	}
}

// Precalculates a table used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError58Hperceptual1000(block:uint8, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_err:Uint32Array) 
{
	var pixel_error, 
		   best_pixel_error;
	var possible_colors = Array.from({length: 2}, () => new Int32Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	var precalc_err_tab = new Uint32Array(16);
 	var red_original;
 	var green_original;
    var	blue_original;

	function PRECALC_ONE_58H_PERCEP(qvalue:number){
  			red_original = block[qvalue*4];
  			green_original = block[qvalue*4+1];
  			blue_original = block[qvalue*4+2];
			/* unroll loop for (color = 0; color< 2; color++) */
 	 			best_pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*square_table[(possible_colors[0][R] - red_original)] 
				                 + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*square_table[(possible_colors[0][G] - green_original)]
								 + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*square_table[(possible_colors[0][B] - blue_original)];
 	 			pixel_error = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000*square_table[(possible_colors[1][R] - red_original)]
	                        + PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000*square_table[(possible_colors[1][G] - green_original)]
						    + PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000*square_table[(possible_colors[1][B] - blue_original)];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
			/* end unroll loop */
			precalc_err_tab[qvalue] = best_pixel_error;
	}
	function PRECALC_ONE_TABLE_58H_PERCEP(dvalue:number){
		precalc_err_tab = precalc_err.subarray(((colorRGB444_packed*8)+dvalue)*16, precalc_err.length);
		possible_colors[0][R] = CLAMP_LEFT_ZERO(colors[0][R] - table58H[dvalue])+255;
		possible_colors[0][G] = CLAMP_LEFT_ZERO(colors[0][G] - table58H[dvalue])+255;
		possible_colors[0][B] = CLAMP_LEFT_ZERO(colors[0][B] - table58H[dvalue])+255;
		possible_colors[1][R] = CLAMP_RIGHT_255(colors[0][R] + table58H[dvalue])+255;
		possible_colors[1][G] = CLAMP_RIGHT_255(colors[0][G] + table58H[dvalue])+255;
 		possible_colors[1][B] = CLAMP_RIGHT_255(colors[0][B] + table58H[dvalue])+255;
		/* unrolled loop for(q = 0; q<16; q++)*/
			PRECALC_ONE_58H_PERCEP(0)
			PRECALC_ONE_58H_PERCEP(1)
			PRECALC_ONE_58H_PERCEP(2)
			PRECALC_ONE_58H_PERCEP(3)
			PRECALC_ONE_58H_PERCEP(4)
			PRECALC_ONE_58H_PERCEP(5)
			PRECALC_ONE_58H_PERCEP(6)
			PRECALC_ONE_58H_PERCEP(7)
			PRECALC_ONE_58H_PERCEP(8)
			PRECALC_ONE_58H_PERCEP(9)
			PRECALC_ONE_58H_PERCEP(10)
			PRECALC_ONE_58H_PERCEP(11)
			PRECALC_ONE_58H_PERCEP(12)
			PRECALC_ONE_58H_PERCEP(13)
			PRECALC_ONE_58H_PERCEP(14)
			PRECALC_ONE_58H_PERCEP(15)
		/* end unroll loop */
	}
 	colors[0][R] = (colorsRGB444[0][R] << 4) | colorsRGB444[0][R];
 	colors[0][G] = (colorsRGB444[0][G] << 4) | colorsRGB444[0][G];
 	colors[0][B] = (colorsRGB444[0][B] << 4) | colorsRGB444[0][B];

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; ++d) */

	PRECALC_ONE_TABLE_58H_PERCEP(0)
	PRECALC_ONE_TABLE_58H_PERCEP(1)
	PRECALC_ONE_TABLE_58H_PERCEP(2)
	PRECALC_ONE_TABLE_58H_PERCEP(3)
	PRECALC_ONE_TABLE_58H_PERCEP(4)
	PRECALC_ONE_TABLE_58H_PERCEP(5)
	PRECALC_ONE_TABLE_58H_PERCEP(6)
	PRECALC_ONE_TABLE_58H_PERCEP(7)

	/* end unroll loop */
}

// Precalculates a table used in the exhaustive compression of the H-mode.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function precalcError58H( block:uint8, colorsRGB444:Uint8Array[], colorRGB444_packed:number, precalc_err:Uint32Array) 
{
	var pixel_error, 
		   best_pixel_error;
	var possible_colors = Array.from({length: 2}, () => new Int32Array(3));
	var colors = Array.from({length: 2}, () => new Uint8Array(3));
	var precalc_err_tab = new Uint32Array(16);
 	var red_original;
 	var green_original;
    var	blue_original;

	function PRECALC_ONE_58H(qvalue:number) {
  			red_original = block[qvalue*4];
  			green_original = block[qvalue*4+1];
  			blue_original = block[qvalue*4+2];
			/* unroll loop for (color = 0; color< 2; color++) */
 	 			best_pixel_error = square_table[(possible_colors[0][R] - red_original)] + square_table[(possible_colors[0][G] - green_original)] + square_table[(possible_colors[0][B] - blue_original)];
 	 			pixel_error = square_table[(possible_colors[1][R] - red_original)] + square_table[(possible_colors[1][G] - green_original)] + square_table[(possible_colors[1][B] - blue_original)];
				if (pixel_error < best_pixel_error)
					best_pixel_error = pixel_error;
			/* end unroll loop */
			precalc_err_tab[qvalue] = best_pixel_error;
	}
	function PRECALC_ONE_TABLE_58H(dvalue:number){
		precalc_err_tab = precalc_err.subarray(((colorRGB444_packed*8)+dvalue)*16, precalc_err.length);
		possible_colors[0][R] = CLAMP_LEFT_ZERO(colors[0][R] - table58H[dvalue])+255;
		possible_colors[0][G] = CLAMP_LEFT_ZERO(colors[0][G] - table58H[dvalue])+255;
		possible_colors[0][B] = CLAMP_LEFT_ZERO(colors[0][B] - table58H[dvalue])+255;
		possible_colors[1][R] = CLAMP_RIGHT_255(colors[0][R] + table58H[dvalue])+255;
		possible_colors[1][G] = CLAMP_RIGHT_255(colors[0][G] + table58H[dvalue])+255;
 		possible_colors[1][B] = CLAMP_RIGHT_255(colors[0][B] + table58H[dvalue])+255;
		/* unrolled loop for(q = 0; q<16; q++)*/
			PRECALC_ONE_58H(0)
			PRECALC_ONE_58H(1)
			PRECALC_ONE_58H(2)
			PRECALC_ONE_58H(3)
			PRECALC_ONE_58H(4)
			PRECALC_ONE_58H(5)
			PRECALC_ONE_58H(6)
			PRECALC_ONE_58H(7)
			PRECALC_ONE_58H(8)
			PRECALC_ONE_58H(9)
			PRECALC_ONE_58H(10)
			PRECALC_ONE_58H(11)
			PRECALC_ONE_58H(12)
			PRECALC_ONE_58H(13)
			PRECALC_ONE_58H(14)
			PRECALC_ONE_58H(15)
		/* end unroll loop */
	}
 	colors[0][R] = (colorsRGB444[0][R] << 4) | colorsRGB444[0][R];
 	colors[0][G] = (colorsRGB444[0][G] << 4) | colorsRGB444[0][G];
 	colors[0][B] = (colorsRGB444[0][B] << 4) | colorsRGB444[0][B];

	// Test all distances
	/* unroll loop for (uint8 d = 0; d < 8; ++d) */

	PRECALC_ONE_TABLE_58H(0)
	PRECALC_ONE_TABLE_58H(1)
	PRECALC_ONE_TABLE_58H(2)
	PRECALC_ONE_TABLE_58H(3)
	PRECALC_ONE_TABLE_58H(4)
	PRECALC_ONE_TABLE_58H(5)
	PRECALC_ONE_TABLE_58H(6)
	PRECALC_ONE_TABLE_58H(7)

	/* end unroll loop */
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalcR58Hperceptual1000(colorsRGB444_packed:Int32Array, precalc_errR:Uint32Array, best_err_so_far:number) 
{
	var block_error = 0;
	var best_block_error = MAXERR1000;
	var precalc_col1tab:Uint32Array, precalc_col2tab:Uint32Array;

	var precalc_col1 = precalc_errR.subarray((colorsRGB444_packed[0]>>8)*8*16, precalc_errR.length);
	var precalc_col2 = precalc_errR.subarray((colorsRGB444_packed[1]>>8)*8*16, precalc_errR.length);

	function CHOICE_R58H_PERCEP(value:number){
		if(precalc_col1tab[value] < precalc_col2tab[value])
			block_error += precalc_col1tab[value];
		else
			block_error += precalc_col2tab[value];
	}

	// Test all distances
	for (let d = 0; d < 8; ++d) 
	{
		block_error = 0;	
		precalc_col1tab = precalc_col1.subarray(d*16, precalc_col1.length);
		precalc_col2tab = precalc_col2.subarray(d*16, precalc_col2.length);
		// Loop block

		/* unroll loop for(q = 0; q<16 && block_error < best_err_so_far; q++) */
		CHOICE_R58H_PERCEP(0)
		if( block_error < best_err_so_far )
		{
			CHOICE_R58H_PERCEP(1)
			if( block_error < best_err_so_far )
			{
				CHOICE_R58H_PERCEP(2)
				if( block_error < best_err_so_far )
				{
					CHOICE_R58H_PERCEP(3)
					if( block_error < best_err_so_far )
					{
						CHOICE_R58H_PERCEP(4)
						if( block_error < best_err_so_far )
						{
							CHOICE_R58H_PERCEP(5)
							if( block_error < best_err_so_far )
							{
								CHOICE_R58H_PERCEP(6)
								if( block_error < best_err_so_far )
								{
									CHOICE_R58H_PERCEP(7)
									if( block_error < best_err_so_far )
									{
										CHOICE_R58H_PERCEP(8)
										if( block_error < best_err_so_far )
										{
											CHOICE_R58H_PERCEP(9)
											if( block_error < best_err_so_far )
											{
												CHOICE_R58H_PERCEP(10)
												if( block_error < best_err_so_far )
												{
													CHOICE_R58H_PERCEP(11)
													if( block_error < best_err_so_far )
													{
														CHOICE_R58H_PERCEP(12)
														if( block_error < best_err_so_far )
														{
															CHOICE_R58H_PERCEP(13)
															if( block_error < best_err_so_far )
															{
																CHOICE_R58H_PERCEP(14)
																if( block_error < best_err_so_far )
																{
																	CHOICE_R58H_PERCEP(15)
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		/* end unroll loop */

		if (block_error < best_block_error) 
			best_block_error = block_error;
	}
	return best_block_error >>> 0;
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalcR58H(colorsRGB444_packed:Int32Array, precalc_errR:Uint32Array, best_err_so_far:number) 
{
	var block_error = 0;
	var best_block_error = MAXIMUM_ERROR;
	var precalc_col1tab:Uint32Array, precalc_col2tab:Uint32Array;

	var precalc_col1 = precalc_errR.subarray((colorsRGB444_packed[0]>>8)*8*16, precalc_errR.length);
	var precalc_col2 = precalc_errR.subarray((colorsRGB444_packed[1]>>8)*8*16, precalc_errR.length);

	function CHOICE_R58H(value:number) {
		if(precalc_col1tab[value] < precalc_col2tab[value])
			block_error += precalc_col1tab[value];
		else
			block_error += precalc_col2tab[value];
	}
	// Test all distances
	for (let d = 0; d < 8; ++d) 
	{
		block_error = 0;	
		precalc_col1tab = precalc_col1.subarray(d*16, precalc_col1.length);
		precalc_col2tab = precalc_col2.subarray(d*16, precalc_col2.length);
		// Loop block

		/* unroll loop for(q = 0; q<16 && block_error < best_err_so_far; q++) */
		CHOICE_R58H(0)
		if( block_error < best_err_so_far )
		{
			CHOICE_R58H(1)
			if( block_error < best_err_so_far )
			{
				CHOICE_R58H(2)
				if( block_error < best_err_so_far )
				{
					CHOICE_R58H(3)
					if( block_error < best_err_so_far )
					{
						CHOICE_R58H(4)
						if( block_error < best_err_so_far )
						{
							CHOICE_R58H(5)
							if( block_error < best_err_so_far )
							{
								CHOICE_R58H(6)
								if( block_error < best_err_so_far )
								{
									CHOICE_R58H(7)
									if( block_error < best_err_so_far )
									{
										CHOICE_R58H(8)
										if( block_error < best_err_so_far )
										{
											CHOICE_R58H(9)
											if( block_error < best_err_so_far )
											{
												CHOICE_R58H(10)
												if( block_error < best_err_so_far )
												{
													CHOICE_R58H(11)
													if( block_error < best_err_so_far )
													{
														CHOICE_R58H(12)
														if( block_error < best_err_so_far )
														{
															CHOICE_R58H(13)
															if( block_error < best_err_so_far )
															{
																CHOICE_R58H(14)
																if( block_error < best_err_so_far )
																{
																	CHOICE_R58H(15)
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		/* end unroll loop */

		if (block_error < best_block_error) 
			best_block_error = block_error;

	}
	return best_block_error >>> 0;
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalcRG58Hperceptual1000(colorsRGB444_packed:Int32Array, precalc_errRG:Uint32Array, best_err_so_far:number) 
{
	var block_error = 0;
	var best_block_error = MAXIMUM_ERROR;
	var precalc_col1tab:Uint32Array, precalc_col2tab:Uint32Array;

	var precalc_col1 = precalc_errRG.subarray((colorsRGB444_packed[0]>>4)*8*16, precalc_errRG.length);
	var precalc_col2 = precalc_errRG.subarray((colorsRGB444_packed[1]>>4)*8*16, precalc_errRG.length);

	function CHOICE_RG58H_PERCEP(value:number){
		if(precalc_col1tab[value] < precalc_col2tab[value])
			block_error += precalc_col1tab[value];
		else
			block_error += precalc_col2tab[value];
	}
	// Test all distances
	for (let d = 0; d < 8; ++d) 
	{
		block_error = 0;	
		precalc_col1tab = precalc_col1.subarray(d*16,precalc_col1.length);
		precalc_col2tab = precalc_col2.subarray(d*16,precalc_col2.length);
		// Loop block

		/* unroll loop for(q = 0; q<16 && block_error < best_err_so_far; q++) */
		CHOICE_RG58H_PERCEP(0)
		if( block_error < best_err_so_far )
		{
			CHOICE_RG58H_PERCEP(1)
			if( block_error < best_err_so_far )
			{
				CHOICE_RG58H_PERCEP(2)
				if( block_error < best_err_so_far )
				{
					CHOICE_RG58H_PERCEP(3)
					if( block_error < best_err_so_far )
					{
						CHOICE_RG58H_PERCEP(4)
						if( block_error < best_err_so_far )
						{
							CHOICE_RG58H_PERCEP(5)
							if( block_error < best_err_so_far )
							{
								CHOICE_RG58H_PERCEP(6)
								if( block_error < best_err_so_far )
								{
									CHOICE_RG58H_PERCEP(7)
									if( block_error < best_err_so_far )
									{
										CHOICE_RG58H_PERCEP(8)
										if( block_error < best_err_so_far )
										{
											CHOICE_RG58H_PERCEP(9)
											if( block_error < best_err_so_far )
											{
												CHOICE_RG58H_PERCEP(10)
												if( block_error < best_err_so_far )
												{
													CHOICE_RG58H_PERCEP(11)
													if( block_error < best_err_so_far )
													{
														CHOICE_RG58H_PERCEP(12)
														if( block_error < best_err_so_far )
														{
															CHOICE_RG58H_PERCEP(13)
															if( block_error < best_err_so_far )
															{
																CHOICE_RG58H_PERCEP(14)
																if( block_error < best_err_so_far )
																{
																	CHOICE_RG58H_PERCEP(15)
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		/* end unroll loop */

		if (block_error < best_block_error) 
			best_block_error = block_error;
	}
	return best_block_error >>> 0;
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalcRG58H(colorsRGB444_packed:Int32Array, precalc_errRG:Uint32Array, best_err_so_far:number) 
{
	var block_error = 0;
	var best_block_error = MAXIMUM_ERROR;
	var precalc_col1tab:Uint32Array, precalc_col2tab:Uint32Array;

	var precalc_col1 = precalc_errRG.subarray((colorsRGB444_packed[0]>>4)*8*16, precalc_errRG.length);
	var precalc_col2 = precalc_errRG.subarray((colorsRGB444_packed[1]>>4)*8*16, precalc_errRG.length);

	function CHOICE_RG58H(value:number){
		if(precalc_col1tab[value] < precalc_col2tab[value])
			block_error += precalc_col1tab[value];
		else
			block_error += precalc_col2tab[value];
	}
	// Test all distances
	for (let d = 0; d < 8; ++d) 
	{
		block_error = 0;	
		precalc_col1tab = precalc_col1.subarray(d*16, precalc_col1.length);
		precalc_col2tab = precalc_col2.subarray(d*16, precalc_col2.length);
		// Loop block

		/* unroll loop for(q = 0; q<16 && block_error < best_err_so_far; q++) */
		CHOICE_RG58H(0)
		if( block_error < best_err_so_far )
		{
			CHOICE_RG58H(1)
			if( block_error < best_err_so_far )
			{
				CHOICE_RG58H(2)
				if( block_error < best_err_so_far )
				{
					CHOICE_RG58H(3)
					if( block_error < best_err_so_far )
					{
						CHOICE_RG58H(4)
						if( block_error < best_err_so_far )
						{
							CHOICE_RG58H(5)
							if( block_error < best_err_so_far )
							{
								CHOICE_RG58H(6)
								if( block_error < best_err_so_far )
								{
									CHOICE_RG58H(7)
									if( block_error < best_err_so_far )
									{
										CHOICE_RG58H(8)
										if( block_error < best_err_so_far )
										{
											CHOICE_RG58H(9)
											if( block_error < best_err_so_far )
											{
												CHOICE_RG58H(10)
												if( block_error < best_err_so_far )
												{
													CHOICE_RG58H(11)
													if( block_error < best_err_so_far )
													{
														CHOICE_RG58H(12)
														if( block_error < best_err_so_far )
														{
															CHOICE_RG58H(13)
															if( block_error < best_err_so_far )
															{
																CHOICE_RG58H(14)
																if( block_error < best_err_so_far )
																{
																	CHOICE_RG58H(15)
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		/* end unroll loop */

		if (block_error < best_block_error) 
			best_block_error = block_error;
	}
	return best_block_error >>> 0;
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalc58Hperceptual1000(colorsRGB444_packed:Int32Array, precalc_err:Uint32Array, total_best_err:number) 
{
	let error = MAXERR1000;

    // Helper to calculate block error for one distance table
    function calculateBlockError(precalc_col1tab:Uint32Array, precalc_col2tab:Uint32Array) {
        let block_error = 0;

        // Simulate the unrolled loop
        for (let i = 0; i < 16; i++) {
            const col1Error = precalc_col1tab[i];
            const col2Error = precalc_col2tab[i];
            block_error += Math.min(col1Error, col2Error);

            // Break early if the block error exceeds the total best error
            if (block_error >= total_best_err) break;
        }

        return block_error;
    }

    // Main calculation loop (simulate CALCULATE_ERROR_FROM_PRECALC_RGB58H_PERCEP)
    const precalc_col1Base = colorsRGB444_packed[0] * 8 * 16;
    const precalc_col2Base = colorsRGB444_packed[1] * 8 * 16;

    for (let d = 0; d < 8; d++) {
        // Calculate table offsets for distance `d`
        const precalc_col1tab = precalc_err.subarray(precalc_col1Base + d * 16, precalc_col1Base + (d + 1) * 16);
        const precalc_col2tab = precalc_err.subarray(precalc_col2Base + d * 16, precalc_col2Base + (d + 1) * 16);

        // Calculate block error for the current distance table
        const block_error = calculateBlockError(precalc_col1tab, precalc_col2tab);

        // Update the minimum error
        if (block_error < error) {
            error = block_error;
        }
    }

    return error >>> 0;
}

// Calculate a minimum error for the H-mode when doing exhaustive compression.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculateErrorFromPrecalc58H(colorsRGB444_packed:Int32Array, precalc_err:Uint32Array, total_best_err:number) 
{
	let error = MAXIMUM_ERROR;

    // Main calculation loop (simulating CALCULATE_ERROR_FROM_PRECALC_RGB58H)
    const precalc_col1Base = colorsRGB444_packed[0] * 8 * 16;
    const precalc_col2Base = colorsRGB444_packed[1] * 8 * 16;

    for (let d = 0; d < 8; d++) {
        // Calculate table offsets for the current distance.
        const precalc_col1tab = precalc_err.subarray(precalc_col1Base + d * 16, precalc_col1Base + (d + 1) * 16);
        const precalc_col2tab = precalc_err.subarray(precalc_col2Base + d * 16, precalc_col2Base + (d + 1) * 16);

        // Initialize block error
        let block_error = Math.min(precalc_col1tab[0], precalc_col2tab[0]);

        // Skip further calculations if the initial block error exceeds the best error.
        if (block_error >= total_best_err) continue;

        // Calculate block error by iterating over subsequent values (simulating unrolled loop).
        for (let i = 1; i < 16; i++) {
            block_error += Math.min(precalc_col1tab[i], precalc_col2tab[i]);

            // Break if block error exceeds the best error.
            if (block_error >= total_best_err) break;
        }

        // Update the minimum error if the current block error is smaller.
        if (block_error < error) {
            error = block_error;
        }
    }

    return error >>> 0;
}

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HExhaustivePerceptual(img: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array, best_error_so_far: number) {
	var best_error_using_Hmode = MAXERR1000;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error;
	var colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var colorsRGB444_packed = new Int32Array(2);
	var best_colorsRGB444_packed = new Int32Array(2);
	var colorRGB444_packed = new Int32Array(1);
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);
	var precalc_err = new Uint32Array(4096 * 8 * 16);		    // smallest error per color, table and pixel
	var precalc_err_RG = new Uint32Array(16 * 16 * 8 * 16);		// smallest pixel error for an entire table
	var precalc_err_R = new Uint32Array(16 * 8 * 16);		// smallest pixel error for an entire table
	var block = new Uint8Array(4 * 4 * 4);

	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_error_using_Hmode = compressBlockTHUMB58HFastestPerceptual1000(img, width, height, startx, starty, test1, test2) >>> 0;
	best_colorsRGB444_packed[0] = 0;
	best_colorsRGB444_packed[0] = GETBITSHIGH(test1[0], 12, 57);
	best_colorsRGB444_packed[1] = 0;
	best_colorsRGB444_packed[1] = GETBITSHIGH(test1[0], 12, 45);

	if (best_error_using_Hmode < best_error_so_far)
		best_error_so_far = best_error_using_Hmode;

	var xx, yy, count = 0;

	// Use 4 bytes per pixel to make it 32-word aligned.
	for (xx = 0; xx < 4; xx++) {
		for (yy = 0; yy < 4; yy++) {
			block[(count) * 4] = img[((starty + yy) * width + (startx + xx)) * 3];
			block[(count) * 4 + 1] = img[((starty + yy) * width + (startx + xx)) * 3 + 1];
			block[(count) * 4 + 2] = img[((starty + yy) * width + (startx + xx)) * 3 + 2];
			block[(count) * 4 + 3] = 0;
			count++;
		}
	}

	for (colorRGB444_packed[0] = 0; colorRGB444_packed[0] < 16 * 16 * 16; colorRGB444_packed[0]++) {
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;

		precalcError58Hperceptual1000(block, colorsRGB444, colorRGB444_packed[0], precalc_err);
	}

	for (colorRGB444_packed[0] = 0; colorRGB444_packed[0] < 16 * 16 * 16; colorRGB444_packed[0] += 16) {
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;
		precalcErrorRG_58Hperceptual1000(img, width, startx, starty, colorsRGB444, colorRGB444_packed[0], precalc_err_RG);
	}

	for (colorRGB444_packed[0] = 0; colorRGB444_packed[0] < 16 * 16 * 16; colorRGB444_packed[0] += 16 * 16) {
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;
		precalcErrorR_58Hperceptual1000(img, width, startx, starty, colorsRGB444, colorRGB444_packed[0], precalc_err_R);
	}

	var trycols = 0;
	var allcols = 0;

	for (colorsRGB444[0][0] = 0; colorsRGB444[0][0] < 16; colorsRGB444[0][0]++) {
		colorsRGB444_packed[0] = colorsRGB444[0][0] * 256;
		for (colorsRGB444[1][0] = 0; colorsRGB444[1][0] < 16; colorsRGB444[1][0]++) {
			colorsRGB444_packed[1] = colorsRGB444[1][0] * 256;
			if (colorsRGB444_packed[0] <= colorsRGB444_packed[1]) {
				error = calculateErrorFromPrecalcR58Hperceptual1000(colorsRGB444_packed, precalc_err_R, best_error_so_far);
				if (error < best_error_so_far) {
					for (colorsRGB444[0][1] = 0; colorsRGB444[0][1] < 16; colorsRGB444[0][1]++) {
						colorsRGB444_packed[0] = colorsRGB444[0][0] * 256 + colorsRGB444[0][1] * 16;
						for (colorsRGB444[1][1] = 0; colorsRGB444[1][1] < 16; colorsRGB444[1][1]++) {
							colorsRGB444_packed[1] = colorsRGB444[1][0] * 256 + colorsRGB444[1][1] * 16;
							if (colorsRGB444_packed[0] <= colorsRGB444_packed[1]) {
								error = calculateErrorFromPrecalcRG58Hperceptual1000(colorsRGB444_packed, precalc_err_RG, best_error_so_far);
								if (error < best_error_so_far) {
									for (colorsRGB444[0][2] = 0; colorsRGB444[0][2] < 16; colorsRGB444[0][2]++) {
										colorsRGB444_packed[0] = colorsRGB444[0][0] * 256 + colorsRGB444[0][1] * 16 + colorsRGB444[0][2];
										for (colorsRGB444[1][2] = 0; colorsRGB444[1][2] < 16; colorsRGB444[1][2]++) {
											colorsRGB444_packed[1] = colorsRGB444[1][0] * 256 + colorsRGB444[1][1] * 16 + colorsRGB444[1][2];
											if (colorsRGB444_packed[0] < colorsRGB444_packed[1]) {
												error = calculateErrorFromPrecalc58Hperceptual1000(colorsRGB444_packed, precalc_err, best_error_so_far);
												if (error < best_error_so_far) {
													best_error_so_far = error;
													best_error_using_Hmode = error;
													best_colorsRGB444_packed[0] = colorsRGB444_packed[0];
													best_colorsRGB444_packed[1] = colorsRGB444_packed[1];
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	best_colorsRGB444[0][0] = (best_colorsRGB444_packed[0] >> 8) & 0xf;
	best_colorsRGB444[0][1] = (best_colorsRGB444_packed[0] >> 4) & 0xf;
	best_colorsRGB444[0][2] = (best_colorsRGB444_packed[0]) & 0xf;
	best_colorsRGB444[1][0] = (best_colorsRGB444_packed[1] >> 8) & 0xf;
	best_colorsRGB444[1][1] = (best_colorsRGB444_packed[1] >> 4) & 0xf;
	best_colorsRGB444[1][2] = (best_colorsRGB444_packed[1]) & 0xf;

	//free(precalc_err);
	//free(precalc_err_RG);
	//free(precalc_err_R);

	error = calculateErrorAndCompress58Hperceptual1000(img, width, startx, starty, best_colorsRGB444, distance, pixel_indices) >>> 0;
	best_distance[0] = distance[0];
	best_pixel_indices[0] = pixel_indices[0];

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
	//
	// This can be done with an xor test.

	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if (((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance[0] & 1) === 1 ? 1 : 0)) {
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices[0] = (0x55555555 & best_pixel_indices[0]) | (0xaaaaaaaa & (~best_pixel_indices[0]));
	}

	// Put the compress params into the compression block 
	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][R], 4, 57);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][G], 4, 53);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[0][B], 4, 49);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][R], 4, 45);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][G], 4, 41);
	compressed1[0] = PUTBITSHIGH(compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH(compressed1[0], (best_distance[0] >> 1), 2, 33);
	best_pixel_indices[0] = indexConversion(best_pixel_indices[0]);
	compressed2[0] = 0;
	compressed2[0] = PUTBITS(compressed2[0], best_pixel_indices[0], 32, 31);

	return best_error_using_Hmode >>> 0;
}

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.

// The below code should compress the block to 58 bits. 
// This is supposed to match the first of the three modes in TWOTIMER.
// The bit layout is thought to be:
//
//|63 62 61 60 59 58|57 56 55 54|53 52 51 50|49 48 47 46|45 44 43 42|41 40 39 38|37 36 35 34|33 32|
//|-------empty-----|---red 0---|--green 0--|--blue 0---|---red 1---|--green 1--|--blue 1---|d2 d1|
//
//|31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 09 08 07 06 05 04 03 02 01 00|
//|----------------------------------------index bits---------------------------------------------|
//
// The distance d is three bits, d2 (MSB), d1 and d0 (LSB). d0 is not stored explicitly. 
// Instead if the 12-bit word red0,green0,blue0 < red1,green1,blue1, d0 is assumed to be 0.
// Else, it is assumed to be 1.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockTHUMB58HExhaustive(img:uint8, width:number, height:number, startx:number, starty:number, compressed1:Uint32Array, compressed2:Uint32Array, best_error_so_far:number) 
{
	var best_error_using_Hmode = MAXIMUM_ERROR;	
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices = new Uint32Array(1);
	var best_distance = new Uint8Array(1);

	var error;
	var colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var colorsRGB444_packed = new Int32Array(2);
	var best_colorsRGB444_packed = new Int32Array(2);
	var colorRGB444_packed = new Int32Array(1);
	var pixel_indices = new Uint32Array(1);
	var distance = new Uint8Array(1);
	var precalc_err = new Uint32Array(4096*8*16);		    // smallest error per color, table and pixel
	var precalc_err_RG = new Uint32Array(16*16*8*16);		// smallest pixel error for an entire table
	var precalc_err_R = new Uint32Array(16*8*16);		// smallest pixel error for an entire table
	var block = new Uint8Array(4*4*4);

	best_error_using_Hmode = MAXIMUM_ERROR;	

	var test1 = new Uint32Array(1), test2 = new Uint32Array(1);
	best_error_using_Hmode = compressBlockTHUMB58HFastest(img,width, height, startx, starty, test1, test2) >>> 0;
    best_colorsRGB444_packed[0] = 0;
	best_colorsRGB444_packed[0] = GETBITSHIGH(test1[0], 12, 57);
    best_colorsRGB444_packed[1] = 0;
	best_colorsRGB444_packed[1] = GETBITSHIGH(test1[0], 12, 45);

	if(best_error_using_Hmode < best_error_so_far)
		best_error_so_far = best_error_using_Hmode;

	var xx,yy,count = 0;

	// Reshuffle pixels so that the top left 2x2 pixels arrive first, then the top right 2x2 pixels etc. Also put use 4 bytes per pixel to make it 32-word aligned.
	for(xx = 0; xx<4; xx++)
	{
		for(yy=0; yy<4; yy++)
		{
			block[(count)*4] = img[((starty+yy)*width+(startx+xx))*3];
			block[(count)*4+1] = img[((starty+yy)*width+(startx+xx))*3+1];
			block[(count)*4+2] = img[((starty+yy)*width+(startx+xx))*3+2];
			block[(count)*4+3] = 0;
			count++;
		}
	}

	for( colorRGB444_packed[0] = 0; colorRGB444_packed[0]<16*16*16; colorRGB444_packed[0]++)
	{
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;
		precalcError58H(block, colorsRGB444, colorRGB444_packed[0], precalc_err);
	}

	for( colorRGB444_packed[0] = 0; colorRGB444_packed[0]<16*16*16; colorRGB444_packed[0]+=16)
	{
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;
		precalcErrorRG_58H(img, width, startx, starty, colorsRGB444, colorRGB444_packed[0], precalc_err_RG);
	}

	for( colorRGB444_packed[0] = 0; colorRGB444_packed[0]<16*16*16; colorRGB444_packed[0]+=16*16)
	{
		colorsRGB444[0][0] = (colorRGB444_packed[0] >> 8) & 0xf;
		colorsRGB444[0][1] = (colorRGB444_packed[0] >> 4) & 0xf;
		colorsRGB444[0][2] = (colorRGB444_packed[0]) & 0xf;
		precalcErrorR_58H(img, width, startx, starty, colorsRGB444, colorRGB444_packed[0], precalc_err_R);
	}

	var trycols = 0;
	var allcols = 0;

	for( colorsRGB444[0][0] = 0; colorsRGB444[0][0] <16; colorsRGB444[0][0]++)
	{
		colorsRGB444_packed[0] = colorsRGB444[0][0]*256;
		for( colorsRGB444[1][0] = 0; colorsRGB444[1][0] <16; colorsRGB444[1][0]++)
		{
			colorsRGB444_packed[1] = colorsRGB444[1][0]*256;
			if(colorsRGB444_packed[0] <= colorsRGB444_packed[1])
			{
				error = calculateErrorFromPrecalcR58H(colorsRGB444_packed, precalc_err_R, best_error_so_far);
				if(error < best_error_so_far)
				{
					for( colorsRGB444[0][1] = 0; colorsRGB444[0][1] <16; colorsRGB444[0][1]++)
					{
						colorsRGB444_packed[0] = colorsRGB444[0][0]*256 + colorsRGB444[0][1]*16;
						for( colorsRGB444[1][1] = 0; colorsRGB444[1][1] <16; colorsRGB444[1][1]++)
						{
							colorsRGB444_packed[1] = colorsRGB444[1][0]*256 + colorsRGB444[1][1]*16;
							if(colorsRGB444_packed[0] <= colorsRGB444_packed[1])
							{
								error = calculateErrorFromPrecalcRG58H(colorsRGB444_packed, precalc_err_RG, best_error_so_far);
								if(error < best_error_so_far)
								{
									for( colorsRGB444[0][2] = 0; colorsRGB444[0][2] <16; colorsRGB444[0][2]++)
									{
										colorsRGB444_packed[0] = colorsRGB444[0][0]*256 + colorsRGB444[0][1]*16 + colorsRGB444[0][2];
										for( colorsRGB444[1][2] = 0; colorsRGB444[1][2] <16; colorsRGB444[1][2]++)
										{
											colorsRGB444_packed[1] = colorsRGB444[1][0]*256 + colorsRGB444[1][1]*16 + colorsRGB444[1][2];
											if(colorsRGB444_packed[0] < colorsRGB444_packed[1])
											{
												error = calculateErrorFromPrecalc58H(colorsRGB444_packed, precalc_err, best_error_so_far);
												if(error < best_error_so_far)
												{
													best_error_so_far = error;	
													best_error_using_Hmode = error;
													best_colorsRGB444_packed[0] = colorsRGB444_packed[0];
													best_colorsRGB444_packed[1] = colorsRGB444_packed[1];
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	best_colorsRGB444[0][0] = (best_colorsRGB444_packed[0] >> 8) & 0xf;
	best_colorsRGB444[0][1] = (best_colorsRGB444_packed[0] >> 4) & 0xf;
	best_colorsRGB444[0][2] = (best_colorsRGB444_packed[0]) & 0xf;
	best_colorsRGB444[1][0] = (best_colorsRGB444_packed[1] >> 8) & 0xf;
	best_colorsRGB444[1][1] = (best_colorsRGB444_packed[1] >> 4) & 0xf;
	best_colorsRGB444[1][2] = (best_colorsRGB444_packed[1]) & 0xf;

	//free(precalc_err);
	//free(precalc_err_RG);
	//free(precalc_err_R);

	error = calculateErrorAndCompress58H(img, width, startx, starty, best_colorsRGB444, distance, pixel_indices) >>>0;
	best_distance = distance; 
	best_pixel_indices = pixel_indices;

	//                   | col0 >= col1      col0 < col1
	//------------------------------------------------------
	// (dist & 1) = 1    | no need to swap | need to swap
	//                   |-----------------+----------------
	// (dist & 1) = 0    | need to swap    | no need to swap
    //
	// This can be done with an xor test.

	best_colorsRGB444_packed[0] = (best_colorsRGB444[0][R] << 8) + (best_colorsRGB444[0][G] << 4) + best_colorsRGB444[0][B];
	best_colorsRGB444_packed[1] = (best_colorsRGB444[1][R] << 8) + (best_colorsRGB444[1][G] << 4) + best_colorsRGB444[1][B];
	if( ((best_colorsRGB444_packed[0] >= best_colorsRGB444_packed[1]) ? 1 : 0) ^ ((best_distance[0] & 1) === 1 ? 1 : 0) )
	{
		swapColors(best_colorsRGB444);

		// Reshuffle pixel indices to to exchange C1 with C3, and C2 with C4
		best_pixel_indices[0] = (0x55555555 & best_pixel_indices[0]) | (0xaaaaaaaa & (~best_pixel_indices[0]));
	}

	// Put the compress params into the compression block 
	compressed1[0] = 0;

	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[0][R], 4, 57);
 	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[0][G], 4, 53);
 	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[0][B], 4, 49);
 	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[1][R], 4, 45);
 	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[1][G], 4, 41);
 	compressed1[0] = PUTBITSHIGH( compressed1[0], best_colorsRGB444[1][B], 4, 37);
	compressed1[0] = PUTBITSHIGH( compressed1[0], (best_distance[0] >> 1), 2, 33);
	best_pixel_indices[0]=indexConversion(best_pixel_indices[0]);
	compressed2[0] = 0;
	compressed2[0] = PUTBITS( compressed2[0], best_pixel_indices[0], 32, 31);

	return best_error_using_Hmode >>> 0;
}

// Compress a block exhaustively for the ETC1 codec.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC1Exhaustive(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var error_currently_best = 255 * 255 * 16 * 3;

	var etc1_differential_word1 = new Uint32Array(1);
	var etc1_differential_word2 = new Uint32Array(1);
	var error_etc1_differential = new Uint32Array(1);

	var etc1_individual_word1 = new Uint32Array(1);
	var etc1_individual_word2 = new Uint32Array(1);
	var error_etc1_individual = new Uint32Array(1);

	var error_best;
	var best_char;
	var best_mode;

	// First pass -- quickly find a low error so that we can later cull away a lot of 
	// calculations later that are guaranteed to be higher than that error.
	var error_etc1 = new Uint32Array(1);;
	var etc1_word1 = new Uint32Array(1);;
	var etc1_word2 = new Uint32Array(1);;

	error_etc1[0] = compressBlockDiffFlipFast(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);
	if (error_etc1[0] < error_currently_best)
		error_currently_best = error_etc1[0];

	error_etc1_individual[0] = compressBlockIndividualExhaustive(img, width, height, startx, starty, etc1_individual_word1, etc1_individual_word2, error_currently_best);
	if (error_etc1_individual[0] < error_currently_best)
		error_currently_best = error_etc1_individual[0];

	error_etc1_differential[0] = compressBlockDifferentialExhaustive(img, width, height, startx, starty, etc1_differential_word1, etc1_differential_word2, error_currently_best);
	if (error_etc1_differential[0] < error_currently_best)
		error_currently_best = error_etc1_differential[0];

	error_best = error_etc1_differential[0];
	compressed1[0] = etc1_differential_word1[0];
	compressed2[0] = etc1_differential_word2[0];
	best_char = '.';
	best_mode = MODE_ETC1;

	if (error_etc1_individual[0] < error_best) {
		compressed1[0] = etc1_individual_word1[0];
		compressed2[0] = etc1_individual_word2[0];
		best_char = ',';
		error_best = error_etc1_individual[0];
		best_mode = MODE_ETC1;
	}

	if (error_etc1[0] < error_best) {
		compressed1[0] = etc1_word1[0];
		compressed2[0] = etc1_word2[0];
		best_char = '.';
		error_best = error_etc1[0];
		best_mode = MODE_ETC1;
	}
}

// Compress a block exhaustively for the ETC1 codec using perceptual error measure.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC1ExhaustivePerceptual(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var error_currently_best = 255 * 255 * 16 * 1000;

	const etc1_differential_word1 = new Uint32Array(1);
	const etc1_differential_word2 = new Uint32Array(1);
	const error_etc1_differential = new Uint32Array(1);

	const etc1_individual_word1 = new Uint32Array(1);
	const etc1_individual_word2 = new Uint32Array(1);
	const error_etc1_individual = new Uint32Array(1);

	var error_best;
	var best_char;
	var best_mode;

	// First pass -- quickly find a low error so that we can later cull away a lot of 
	// calculations later that are guaranteed to be higher than that error.
	var error_etc1 = new Uint32Array(1);
	var etc1_word1 = new Uint32Array(1);
	var etc1_word2 = new Uint32Array(1);

	compressBlockDiffFlipFastPerceptual(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);
	decompressBlockDiffFlip(etc1_word1[0], etc1_word2[0], imgdec, width, height, startx, starty);
	error_etc1[0] = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	if (error_etc1[0] < error_currently_best)
		error_currently_best = error_etc1[0];

	// Second pass --- now find the lowest error, but only if it is lower than error_currently_best

	error_etc1_differential[0] = compressBlockDifferentialExhaustivePerceptual(img, width, height, startx, starty, etc1_differential_word1, etc1_differential_word2, error_currently_best);
	if (error_etc1_differential[0] < error_currently_best)
		error_currently_best = error_etc1_differential[0];

	error_etc1_individual[0] = compressBlockIndividualExhaustivePerceptual(img, width, height, startx, starty, etc1_individual_word1, etc1_individual_word2, error_currently_best);
	if (error_etc1_individual[0] < error_currently_best)
		error_currently_best = error_etc1_individual[0];

	// Now find the best error.
	error_best = error_etc1[0];
	compressed1[0] = etc1_word1[0];
	compressed2[0] = etc1_word2[0];
	best_char = '.';
	best_mode = MODE_ETC1

	if (error_etc1_differential[0] < error_best) {
		error_best = error_etc1_differential[0];
		compressed1[0] = etc1_differential_word1[0];
		compressed2[0] = etc1_differential_word2[0];
		best_char = '.';
		best_mode = MODE_ETC1
	}

	if (error_etc1_individual[0] < error_best) {
		compressed1[0] = etc1_individual_word1[0];
		compressed2[0] = etc1_individual_word2[0];
		best_char = ',';
		error_best = error_etc1_individual;
		best_mode = MODE_ETC1
	}
}

/**
 * Splits a given RGBA buffer into separate RGB and Alpha buffers.
 *
 * @param {Uint8Array} buffer - The source buffer containing RGBA data.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @returns {{srcimg: uint8, alphaimg: uint8}} An object containing two buffers:
 *          `srcimg` with RGB data and `alphaimg` with alpha channel data.
 * @throws Will throw an error if the buffer size does not match the expected size based on
 *         the provided width and height.
 */
function splitRGBA(buffer: uint8, width: number, height: number): { srcimg: uint8, alphaimg: uint8 } {
	if (buffer.length !== width * height * 4) {
		throw new Error("Buffer size does not match the width and height.");
	}

	const srcimg = malloc(buffer, width * height * 3); // 3 bytes per pixel (R, G, B)
	const alphaimg = malloc(buffer, width * height);;  // 1 byte per pixel (A)

	for (let i = 0, rgbIndex = 0, alphaIndex = 0; i < buffer.length; i += 4) {
		// Extract R, G, B
		srcimg[rgbIndex++] = buffer[i];     // Red
		srcimg[rgbIndex++] = buffer[i + 1]; // Green
		srcimg[rgbIndex++] = buffer[i + 2]; // Blue

		// Extract Alpha
		alphaimg[alphaIndex++] = buffer[i + 3]; // Alpha
	}

	return { srcimg, alphaimg };
}

function compressBlockTHUMB59TAlpha(img: uint8, alpha: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var best_error = MAXIMUM_ERROR;
	var best_colorsRGB444 = Array.from({ length: 2 }, () => new Uint8Array(3));
	var best_pixel_indices: number;
	var best_distance: number;

	var error_no_i: number;
	var colorsRGB444_no_i = Array.from({ length: 2 }, () => new Uint8Array(3));
	var pixel_indices_no_i = new Uint32Array(1);
	var distance_no_i = new Uint8Array(1);

	var colors = Array.from({ length: 2 }, () => new Uint8Array(3));

	// Calculate average color using the LBG-algorithm
	computeColorLBGHalfIntensityFast(img, width, startx, starty, colors);
	compressColor(R_BITS59T, G_BITS59T, B_BITS59T, colors, colorsRGB444_no_i);

	// Determine the parameters for the lowest error
	error_no_i = calculateError59TAlpha(img, alpha, width, startx, starty, colorsRGB444_no_i, distance_no_i, pixel_indices_no_i);

	best_error = error_no_i;
	best_distance = distance_no_i[0];
	best_pixel_indices = pixel_indices_no_i[0];
	copyColors(colorsRGB444_no_i, best_colorsRGB444);

	// Put the compress params into the compression block 
	packBlock59T(best_colorsRGB444, best_distance, best_pixel_indices, compressed1, compressed2);

	return best_error;
}

// Compress a block exhaustively for the ETC2 RGB codec using perceptual error measure.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC2ExhaustivePerceptual(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var error_currently_best = 255 * 255 * 16 * 1000;;

	var etc1_differential_word1 = new Uint32Array(1);
	var etc1_differential_word2 = new Uint32Array(1);
	var error_etc1_differential: number;

	var etc1_individual_word1 = new Uint32Array(1);
	var etc1_individual_word2 = new Uint32Array(1);
	var error_etc1_individual: number;

	var planar57_word1 = new Uint32Array(1);
	var planar57_word2 = new Uint32Array(1);
	var planar_word1 = new Uint32Array(1);
	var planar_word2 = new Uint32Array(1);
	var error_planar;
	var error_planar_red = new Uint32Array(1), error_planar_green = new Uint32Array(1), error_planar_blue = new Uint32Array(1);

	var thumbH58_word1 = new Uint32Array(1);
	var thumbH58_word2 = new Uint32Array(1);
	var thumbH_word1 = new Uint32Array(1);
	var thumbH_word2 = new Uint32Array(1);
	var error_thumbH: number;

	var thumbT59_word1 = new Uint32Array(1);
	var thumbT59_word2 = new Uint32Array(1);
	var thumbT_word1 = new Uint32Array(1);
	var thumbT_word2 = new Uint32Array(1);
	var error_thumbT: number;

	var error_best;
	var best_char = "";
	var best_mode;

	// First pass -- quickly find a low error so that we can later cull away a lot of 
	// calculations later that are guaranteed to be higher than that error.
	var error_etc1: number;
	var etc1_word1 = new Uint32Array(1);
	var etc1_word2 = new Uint32Array(1);

	compressBlockDiffFlipFastPerceptual(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2);
	decompressBlockDiffFlip(etc1_word1[0], etc1_word2[0], imgdec, width, height, startx, starty);
	error_etc1 = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	if (error_etc1 < error_currently_best)
		error_currently_best = error_etc1;

	// The planar mode treats every channel independently and should not be affected by the weights in the error measure. 
	// We can hence use the nonperceptual version of the encoder also to find the best perceptual description of the block.
	compressBlockPlanar57(img, width, height, startx, starty, planar57_word1, planar57_word2);
	decompressBlockPlanar57errorPerComponent(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty, img, error_planar_red, error_planar_green, error_planar_blue);
	error_planar = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);
	if (error_planar < error_currently_best)
		error_currently_best = error_planar >>> 0;

	error_thumbT = compressBlockTHUMB59TFastestPerceptual1000(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2) >>> 0;
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);
	if (error_thumbT < error_currently_best)
		error_currently_best = error_thumbT;

	error_thumbH = compressBlockTHUMB58HFastestPerceptual1000(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2) >>> 0;
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);
	if (error_thumbH < error_currently_best)
		error_currently_best = error_thumbH;

	// Second pass --- now find the lowest error, but only if it is lower than error_currently_best

	// Correct the individual errors for the different planes so that they sum to 1000 instead of 1.
	error_planar_red[0] = PERCEPTUAL_WEIGHT_R_SQUARED_TIMES1000;
	error_planar_green[0] = PERCEPTUAL_WEIGHT_G_SQUARED_TIMES1000;
	error_planar_blue[0] = PERCEPTUAL_WEIGHT_B_SQUARED_TIMES1000;
	compressBlockPlanar57ExhaustivePerceptual(img, width, height, startx, starty, planar57_word1, planar57_word2, error_currently_best, error_planar_red[0], error_planar_green[0], error_planar_blue[0]);
	decompressBlockPlanar57(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty);
	error_planar = 1000 * calcBlockPerceptualErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);
	if (error_planar < error_currently_best)
		error_currently_best = error_planar >>> 0;

	error_etc1_differential = compressBlockDifferentialExhaustivePerceptual(img, width, height, startx, starty, etc1_differential_word1, etc1_differential_word2, error_currently_best);
	if (error_etc1_differential < error_currently_best)
		error_currently_best = error_etc1_differential;

	error_etc1_individual = compressBlockIndividualExhaustivePerceptual(img, width, height, startx, starty, etc1_individual_word1, etc1_individual_word2, error_currently_best);
	if (error_etc1_individual < error_currently_best)
		error_currently_best = error_etc1_individual;

	error_thumbH = compressBlockTHUMB58HExhaustivePerceptual(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2, error_currently_best);
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);
	if (error_thumbH < error_currently_best)
		error_currently_best = error_thumbH;

	error_thumbT = compressBlockTHUMB59TExhaustivePerceptual(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2, error_currently_best);
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);
	if (error_thumbT < error_currently_best)
		error_currently_best = error_thumbT;

	// Now find the best error.
	error_best = error_etc1;
	compressed1 = etc1_word1;
	compressed2 = etc1_word2;
	best_char = '.';
	best_mode = MODE_ETC1;

	if (error_etc1_differential < error_best) {
		error_best = error_etc1_differential;
		compressed1 = etc1_differential_word1;
		compressed2 = etc1_differential_word2;
		best_char = '.';
		best_mode = MODE_ETC1;
	}

	if (error_etc1_individual < error_best) {
		compressed1 = etc1_individual_word1;
		compressed2 = etc1_individual_word2;
		best_char = ',';
		error_best = error_etc1_individual;
		best_mode = MODE_ETC1;
	}
	if (error_planar < error_best) {
		compressed1 = planar_word1;
		compressed2 = planar_word2;
		best_char = 'p';
		error_best = error_planar >>> 0;
		best_mode = MODE_PLANAR;
	}
	if (error_thumbH < error_best) {
		compressed1 = thumbH_word1;
		compressed2 = thumbH_word2;
		best_char = 'H';
		error_best = error_thumbH;
		best_mode = MODE_THUMB_H;
	}
	if (error_thumbT < error_best) {
		compressed1 = thumbT_word1;
		compressed2 = thumbT_word2;
		best_char = 'T';
		error_best = error_thumbT;
		best_mode = MODE_THUMB_T;
	}
}

// Compress a block exhaustively for the ETC2 RGB codec.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressBlockETC2Exhaustive(img: uint8, imgdec: uint8, width: number, height: number, startx: number, starty: number, compressed1: Uint32Array, compressed2: Uint32Array) {
	var error_currently_best;

	var etc1_differential_word1 = new Uint32Array(1);
	var etc1_differential_word2 = new Uint32Array(1);
	var error_etc1_differential;

	var etc1_individual_word1 = new Uint32Array(1);
	var etc1_individual_word2 = new Uint32Array(1);
	var error_etc1_individual;

	var planar57_word1 = new Uint32Array(1);
	var planar57_word2 = new Uint32Array(1);
	var planar_word1 = new Uint32Array(1);
	var planar_word2 = new Uint32Array(1);
	var error_planar;
	var error_planar_red = new Uint32Array(1);
	var error_planar_green = new Uint32Array(1);
	var error_planar_blue = new Uint32Array(1);

	var thumbH58_word1 = new Uint32Array(1);
	var thumbH58_word2 = new Uint32Array(1);
	var thumbH_word1 = new Uint32Array(1);
	var thumbH_word2 = new Uint32Array(1);
	var error_thumbH;
	
	var thumbT59_word1 = new Uint32Array(1);
	var thumbT59_word2 = new Uint32Array(1);
	var thumbT_word1 = new Uint32Array(1);
	var thumbT_word2 = new Uint32Array(1);
	var error_thumbT;
	
	var error_best;
	var best_char;
	var best_mode;

	error_currently_best = 255 * 255 * 16 * 3;

	// First pass -- quickly find a low error so that we can later cull away a lot of 
	// calculations later that are guaranteed to be higher than that error.
	var error_etc1;
	var etc1_word1 = new Uint32Array(1);
	var etc1_word2 = new Uint32Array(1);

	error_etc1 = compressBlockDiffFlipFast(img, imgdec, width, height, startx, starty, etc1_word1, etc1_word2) >>> 0;
	if (error_etc1 < error_currently_best)
		error_currently_best = error_etc1;

	compressBlockPlanar57(img, width, height, startx, starty, planar57_word1, planar57_word2);
	decompressBlockPlanar57errorPerComponent(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty, img, error_planar_red, error_planar_green, error_planar_blue);
	error_planar = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);
	if (error_planar < error_currently_best)
		error_currently_best = error_planar >>> 0;

	error_thumbT = compressBlockTHUMB59TFastest(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2) >>> 0;
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);
	if (error_thumbT < error_currently_best)
		error_currently_best = error_thumbT;

	error_thumbH = compressBlockTHUMB58HFastest(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2) >>> 0;
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);
	if (error_thumbH < error_currently_best)
		error_currently_best = error_thumbH;

	// Second pass --- now find the lowest error, but only if it is lower than error_currently_best
	error_etc1_differential = compressBlockDifferentialExhaustive(img, width, height, startx, starty, etc1_differential_word1, etc1_differential_word2, error_currently_best);
	if (error_etc1_differential < error_currently_best)
		error_currently_best = error_etc1_differential;

	compressBlockPlanar57Exhaustive(img, width, height, startx, starty, planar57_word1, planar57_word2, error_currently_best, error_planar_red[0], error_planar_green[0], error_planar_blue[0]);
	decompressBlockPlanar57(planar57_word1[0], planar57_word2[0], imgdec, width, height, startx, starty);
	error_planar = calcBlockErrorRGB(img, imgdec, width, height, startx, starty);
	stuff57bits(planar57_word1[0], planar57_word2[0], planar_word1, planar_word2);
	if (error_planar < error_currently_best)
		error_currently_best = error_planar >>> 0;

	error_etc1_individual = compressBlockIndividualExhaustive(img, width, height, startx, starty, etc1_individual_word1, etc1_individual_word2, error_currently_best);
	if (error_etc1_individual < error_currently_best)
		error_currently_best = error_etc1_individual;

	error_thumbH = compressBlockTHUMB58HExhaustive(img, width, height, startx, starty, thumbH58_word1, thumbH58_word2, error_currently_best);
	if (error_thumbH < error_currently_best)
		error_currently_best = error_thumbH;
	stuff58bits(thumbH58_word1[0], thumbH58_word2[0], thumbH_word1, thumbH_word2);

	error_thumbT = compressBlockTHUMB59TExhaustive(img, width, height, startx, starty, thumbT59_word1, thumbT59_word2, error_currently_best);
	if (error_thumbT < error_currently_best)
		error_currently_best = error_thumbT;
	stuff59bits(thumbT59_word1[0], thumbT59_word2[0], thumbT_word1, thumbT_word2);

	error_best = 255 * 255 * 3 * 16;
	// Now find the best error.
	error_best = error_etc1;
	compressed1 = etc1_word1;
	compressed2 = etc1_word2;
	best_char = '.';
	best_mode = MODE_ETC1;

	if (error_etc1_differential < error_best) {
		error_best = error_etc1_differential;
		compressed1 = etc1_differential_word1;
		compressed2 = etc1_differential_word2;
		best_char = '.';
		best_mode = MODE_ETC1;
	}
	if (error_etc1_individual < error_best) {
		compressed1 = etc1_individual_word1;
		compressed2 = etc1_individual_word2;
		best_char = ',';
		error_best = error_etc1_individual;
		best_mode = MODE_ETC1;
	}
	if (error_planar < error_best) {
		compressed1 = planar_word1;
		compressed2 = planar_word2;
		best_char = 'p';
		error_best = error_planar >>> 0;
		best_mode = MODE_PLANAR;
	}
	if (error_thumbH < error_best) {
		compressed1 = thumbH_word1;
		compressed2 = thumbH_word2;
		best_char = 'H';
		error_best = error_thumbH;
		best_mode = MODE_THUMB_H;
	}
	if (error_thumbT < error_best) {
		compressed1 = thumbT_word1;
		compressed2 = thumbT_word2;
		best_char = 'T';
		error_best = error_thumbT;
		best_mode = MODE_THUMB_T;
	}
}

//// Exhaustive code ends here.

// Compress an image file.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function compressImageFile(img: uint8, alphaimg: uint8, width: number, height: number, dstfile: string, expandedwidth: Uint32Array, expandedheight: Uint32Array, format: number, codec: number, speed: number, metric: number, formatSigned: number) {
	var f:fopen;
	var x, y, w, h;
	var block1 = new Uint32Array(1), block2 = new Uint32Array(1);
	var wi = new Uint16Array(1), hi = new Uint16Array(1);
	var magic = new Uint8Array(4);
	var version = new Uint8Array(2);
	var texture_type = new Uint16Array([format]);
	var imgdec = malloc(img, expandedwidth[0] * expandedheight[0] * 3);
	var fsize = 0;
	switch (format) {
		case ETC1_RGB_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_RGB_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_RGBA_NO_MIPMAPS_OLD: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_RGBA_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 16; break;
		case ETC2PACKAGE_R_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_R_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_RG_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 16; break;
		case ETC2PACKAGE_R_SIGNED_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_RG_SIGNED_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 16; break;
		case ETC2PACKAGE_sRGB_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		case ETC2PACKAGE_sRGBA_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 16; break;
		case ETC2PACKAGE_sRGBA1_NO_MIPMAPS: fsize = Math.ceil(expandedwidth[0]/4) * Math.ceil(expandedheight[0]/4) * 8; break;
		default:
			console.log("Invalid format", format);
			break;
	}
	var fdata = malloc(img, fsize);
	f=new fopen(fdata);
	var alphaimg2 = malloc(img,expandedwidth[0]*expandedheight[0]*2);

	magic[0] = 'P'.charCodeAt(0); 
	magic[1] = 'K'.charCodeAt(0); 
	magic[2] = 'M'.charCodeAt(0); 
	magic[3] = ' '.charCodeAt(0); 

	if(codec==CODEC_ETC2)
	{
		version[0] = '2'.charCodeAt(0); 
		version[1] = '0'.charCodeAt(0);
	}
	else
	{
		version[0] = '1'.charCodeAt(0); 
		version[1] = '0'.charCodeAt(0);
	}
	w=expandedwidth[0]/4;  w*=4;
	h=expandedheight[0]/4; h*=4;
	wi[0] = w;
	hi[0] = h;
	if(ktxFile) 
	{
		//.ktx file: KTX header followed by compressed binary data.
		var header =new KTX_header();
		//identifier
		for(let i=0; i<12; i++) 
		{
			header.identifier[i]=ktx_identifier[i];
		}
		//endianess int.. if this comes out reversed, all of the other ints will too.
		header.endianness=KTX_ENDIAN_REF;
		
		//these values are always 0/1 for compressed textures.
		header.glType=0;
		header.glTypeSize=1;
		header.glFormat=0;

		header.pixelWidth=width;
		header.pixelHeight=height;
		header.pixelDepth=0;

		//we only support single non-mipmapped non-cubemap textures..
		header.numberOfArrayElements=0;
		header.numberOfFaces=1;
		header.numberOfMipmapLevels=1;

		//and no metadata..
		header.bytesOfKeyValueData=0;
		
		var halfbytes=1;
		//header.glInternalFormat=?
		//header.glBaseInternalFormat=?
		if(format==ETC2PACKAGE_R_NO_MIPMAPS) 
		{
			header.glBaseInternalFormat=GL_R;
			if(formatSigned)
				header.glInternalFormat=GL_COMPRESSED_SIGNED_R11_EAC;
			else
				header.glInternalFormat=GL_COMPRESSED_R11_EAC;
		}
		else if(format==ETC2PACKAGE_RG_NO_MIPMAPS) 
		{
			halfbytes=2;
			header.glBaseInternalFormat=GL_RG;
			if(formatSigned)
				header.glInternalFormat=GL_COMPRESSED_SIGNED_RG11_EAC;
			else
				header.glInternalFormat=GL_COMPRESSED_RG11_EAC;
		}
		else if(format==ETC2PACKAGE_RGB_NO_MIPMAPS) 
		{
			header.glBaseInternalFormat=GL_RGB;
			header.glInternalFormat=GL_COMPRESSED_RGB8_ETC2;
		}
		else if(format==ETC2PACKAGE_sRGB_NO_MIPMAPS) 
		{
			header.glBaseInternalFormat=GL_SRGB;
			header.glInternalFormat=GL_COMPRESSED_SRGB8_ETC2;
		}
		else if(format==ETC2PACKAGE_RGBA_NO_MIPMAPS) 
		{
			halfbytes=2;
			header.glBaseInternalFormat=GL_RGBA;
			header.glInternalFormat=GL_COMPRESSED_RGBA8_ETC2_EAC;
		}
		else if(format==ETC2PACKAGE_sRGBA_NO_MIPMAPS) 
		{
			halfbytes=2;
			header.glBaseInternalFormat=GL_SRGB8_ALPHA8;
			header.glInternalFormat=GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
		}
		else if(format==ETC2PACKAGE_RGBA1_NO_MIPMAPS) 
		{
			header.glBaseInternalFormat=GL_RGBA;
			header.glInternalFormat=GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2;
		}
		else if(format==ETC2PACKAGE_sRGBA1_NO_MIPMAPS) 
		{
			header.glBaseInternalFormat=GL_SRGB8_ALPHA8;
			header.glInternalFormat=GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2;
		}
		else if(format==ETC1_RGB_NO_MIPMAPS||format==ETC2PACKAGE_RGBA_NO_MIPMAPS_OLD) 
		{
			header.glBaseInternalFormat=GL_RGB;
			header.glInternalFormat=GL_ETC1_RGB8_OES;
		}
		else 
		{
			console.log("internal error: bad format!");
			//exit(1);
		}
		//write header
		f.fwrite(header.get,1,1);
		
		//write size of compressed data.. which depend on the expanded size..
		var imagesize=(w*h*halfbytes)/2;
		var bytes = new Uint8Array(4);
		bytes[0] = (imagesize >> 0) & 0xff;
		bytes[1] = (imagesize >> 8) & 0xff;
		bytes[2] = (imagesize >> 16) & 0xff;
		bytes[3] = (imagesize >> 24) & 0xff;
				
		f.fwrite(bytes,1,4);
	}
	else 
	{
		//.pkm file, contains small header..

		// Write magic number
		//f.fwrite(magic[0], 1, 1);
		//f.fwrite(magic[1], 1, 1);
		//f.fwrite(magic[2], 1, 1);
		//f.fwrite(magic[3], 1, 1);
	
		// Write version
		//f.fwrite(version[0], 1, 1);
		//f.fwrite(version[1], 1, 1);

		// Write texture type
		if(texture_type[0]==ETC2PACKAGE_RG_NO_MIPMAPS&&formatSigned) 
		{
			//var temp = new Uint16Array([ETC2PACKAGE_RG_SIGNED_NO_MIPMAPS]);
			//write_big_endian_2byte_word(temp,f);
		}
		else if(texture_type[0]==ETC2PACKAGE_R_NO_MIPMAPS&&formatSigned) 
		{
			//var temp = new Uint16Array([ETC2PACKAGE_R_SIGNED_NO_MIPMAPS]);
			//write_big_endian_2byte_word(temp,f);
		}
		else{
			//write_big_endian_2byte_word(texture_type, f);
		}
		// Write binary header: the width and height as unsigned 16-bit words
		//write_big_endian_2byte_word(wi, f);
		//write_big_endian_2byte_word(hi, f);

		// Also write the active pixels. For instance, if we want to compress
		// a 128 x 129 image, we have to extend it to 128 x 132 pixels.
		// Then the wi and hi written above will be 128 and 132, but the
		// additional information that we write below will be 128 and 129,
		// to indicate that it is only the top 129 lines of data in the 
		// decompressed image that will be valid data, and the rest will
		// be just garbage. 

		//var activew = new Uint16Array(1), activeh = new Uint16Array(1);
		//activew[0] = width;
		//activeh[0] = height;

		//write_big_endian_2byte_word(activew, f);
		//write_big_endian_2byte_word(activeh, f);
	}
	var totblocks = expandedheight[0]/4 * expandedwidth[0]/4;
	var countblocks = 0;
	var percentageblocks=-1.0;
	var oldpercentageblocks;
	
	if(format==ETC2PACKAGE_RG_NO_MIPMAPS) 
	{
		//extract data from red and green channel into two alpha channels.
		//note that the image will be 16-bit per channel in this case.
		alphaimg= malloc(img,expandedwidth[0]*expandedheight[0]*2);
		setupAlphaTableAndValtab();
		//if(!alphaimg||!alphaimg2) 
		//{
		//	console.log("failed allocating space for alpha buffers!");
		//	exit(1);
		//}
		for(y=0;y<expandedheight[0];y++)
		{
			for(x=0;x<expandedwidth[0];x++)
			{
				alphaimg[2*(y*expandedwidth[0]+x)]=img[6*(y*expandedwidth[0]+x)];
				alphaimg[2*(y*expandedwidth[0]+x)+1]=img[6*(y*expandedwidth[0]+x)+1];
				alphaimg2[2*(y*expandedwidth[0]+x)]=img[6*(y*expandedwidth[0]+x)+2];
				alphaimg2[2*(y*expandedwidth[0]+x)+1]=img[6*(y*expandedwidth[0]+x)+3];
			}
		}
	}
	for(y=0;y<expandedheight[0]/4;y++)
	{
		for(x=0;x<expandedwidth[0]/4;x++)
		{
			countblocks++;
			oldpercentageblocks = percentageblocks;
			percentageblocks = 100.0*countblocks/(1.0*totblocks);
			//compress color channels
			if(codec==CODEC_ETC) 
			{
				if(metric==METRIC_NONPERCEPTUAL) 
				{
					if(speed==SPEED_FAST)
						compressBlockDiffFlipFast(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);
					else
						compressBlockETC1Exhaustive(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);		
				}
				else 
				{
					if(speed==SPEED_FAST)
						compressBlockDiffFlipFastPerceptual(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);
					else
						compressBlockETC1ExhaustivePerceptual(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);	
				}
			}
			else 
			{
				if(format==ETC2PACKAGE_R_NO_MIPMAPS||format==ETC2PACKAGE_RG_NO_MIPMAPS) 
				{
					//don't compress color
				}
				else if(format==ETC2PACKAGE_RGBA1_NO_MIPMAPS||format==ETC2PACKAGE_sRGBA1_NO_MIPMAPS) 
				{
					//this is only available for fast/nonperceptual
					if(speed == SPEED_SLOW && first_time_message)
					{
						console.log("Slow codec not implemented for RGBA1 --- using fast codec instead.");
						first_time_message = false;
					}
					compressBlockETC2Fast(img, alphaimg,imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2, format);
				}
				else if(metric==METRIC_NONPERCEPTUAL) 
				{
					if(speed==SPEED_FAST)
						compressBlockETC2Fast(img, alphaimg,imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2, format);
					else
						compressBlockETC2Exhaustive(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);		
				}
				else 
				{
					if(speed==SPEED_FAST)
						compressBlockETC2FastPerceptual(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);
					else
						compressBlockETC2ExhaustivePerceptual(img, imgdec, expandedwidth[0], expandedheight[0], 4*x, 4*y, block1, block2);	
				}
			}
			
			//compression of alpha channel in case of 4-bit alpha. Uses 8-bit alpha channel as input, and has 8-bit precision.
			if(format==ETC2PACKAGE_RGBA_NO_MIPMAPS||format==ETC2PACKAGE_sRGBA_NO_MIPMAPS) 
			{
				var alphadata = new Uint8Array(8);
				if(speed==SPEED_SLOW)
					compressBlockAlphaSlow(alphaimg,4*x,4*y,expandedwidth[0],expandedheight[0],alphadata);
				else
					compressBlockAlphaFast(alphaimg,4*x,4*y,expandedwidth[0],expandedheight[0],alphadata);
				//write the 8 bytes of alphadata into f.
				f.fwrite(alphadata,1,8);
			}

			//store compressed color channels
			if(format!=ETC2PACKAGE_R_NO_MIPMAPS&&format!=ETC2PACKAGE_RG_NO_MIPMAPS) 
			{
				write_big_endian_4byte_word(block1, f);
				write_big_endian_4byte_word(block2, f);
			}

			//1-channel or 2-channel alpha compression: uses 16-bit data as input, and has 11-bit precision
			if(format==ETC2PACKAGE_R_NO_MIPMAPS||format==ETC2PACKAGE_RG_NO_MIPMAPS) 
			{ 
				var alphadata = new Uint8Array(8);
				compressBlockAlpha16(alphaimg,4*x,4*y,expandedwidth[0],expandedheight[0],alphadata,formatSigned);
				f.fwrite(alphadata,1,8);
			}
			//compression of second alpha channel in RG-compression
			if(format==ETC2PACKAGE_RG_NO_MIPMAPS) 
			{
				var alphadata = new Uint8Array(8);
				compressBlockAlpha16(alphaimg2,4*x,4*y,expandedwidth[0],expandedheight[0],alphadata,formatSigned);
				f.fwrite(alphadata,1,8);
			}
			if(verbose)
			{
				if(speed==SPEED_FAST) 
				{
					if( ((percentageblocks) != (oldpercentageblocks) ) || percentageblocks == 100.0)
						console.log(`Compressed ${countblocks} of ${totblocks} blocks, ${100.0*countblocks/(1.0*totblocks)}% finished.`);
				}
				else
					console.log(`Compressed ${countblocks} of ${totblocks} blocks, ${100.0*countblocks/(1.0*totblocks)}% finished.`);
			}
		}
	}
	//printf("\n");
	//fclose(f);
	//printf("Saved file <%s>.\n",dstfile);
	return {
		img,
		alphaimg,
		compressedData: f.get,
	}
}

// Calculates the PSNR between two files.
// NO WARRANTY --- SEE STATEMENT IN TOP OF FILE (C) Ericsson AB 2005-2013. All Rights Reserved.
function calculatePSNRTwoFiles(srcfile1:uint8,srcfile2:uint8)
{
	var srcimg1:uint8;
	var srcimg2:uint8;
	var width1=new Int32Array(1), height1=new Int32Array(1);
	var width2=new Int32Array(1), height2=new Int32Array(1);
	var PSNR;
	var perceptually_weighted_PSNR;

	//if(readSrcFileNoExpand(srcfile1,srcimg1,width1,height1))
	//{
	//	if(readSrcFileNoExpand(srcfile2,srcimg2,width2,height2))
	//	{
	//		if((width1 == width2) && (height1 == height2))
	//		{
	//			PSNR = calculatePSNR(srcimg1, srcimg2, width1[0], height1[0]);
	//			console.log(PSNR);
	//			perceptually_weighted_PSNR = calculateWeightedPSNR(srcimg1, srcimg2, width1[0], height1[0], 0.//299, 0.587, 0.114);
	//		}
	//		else
	//		{
	//			console.log(`Width and height do no not match for image: width, height = (${width1}, ${height1}) and (${width2}, ${height2})\n`);
	//		}
	//	}
	//	else
	//	{
	//		console.log(`Couldn't open file ${srcfile2}.`);
	//	}
	//}
	//else
	//{
	//	console.log(`Couldn't open file ${srcfile1}.`,);
	//}

	return PSNR;
}

function doubleImageHeight(rgbBuffer: uint8, alphaBuffer: uint8, width: number, height: number) {
	const originalPixelCount = width * height;
	const doubledPixelCount = originalPixelCount * 2;

	// Each RGB pixel is 3 bytes
	const newRgbBuffer = malloc(rgbBuffer, doubledPixelCount * 3);

	// Copy the original RGB buffer to the top half
	newRgbBuffer.set(rgbBuffer, 0);

	// Create the RGB representation of the Alpha buffer
	for (let i = 0; i < alphaBuffer.length; i++) {
		const alphaValue = alphaBuffer[i];
		const offset = originalPixelCount * 3 + i * 3;

		// Set R, G, and B to the Alpha value
		newRgbBuffer[offset] = alphaValue;     // R
		newRgbBuffer[offset + 1] = alphaValue; // G
		newRgbBuffer[offset + 2] = alphaValue; // B
	}

	return {
		width,
		height: height * 2, // New height is double the original
		newRgbBuffer,
	};
}

const ETC1_RGB = 0,         //ETC1_RGB_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  ETC2_RGB = 1,         //ETC2PACKAGE_RGB_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  ETC1_RGBA8 = 2,       //ETC2PACKAGE_RGBA_NO_MIPMAPS_OLD Math.ceil(width/4) * Math.ceil(height/4) * 8
	  ETC2_RGBA8 = 3,       //ETC2PACKAGE_RGBA_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 16
	  ETC2_RGBA1 = 4,       //ETC2PACKAGE_R_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  EAC_R11 = 5,          //ETC2PACKAGE_R_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  EAC_RG11 = 6,         //ETC2PACKAGE_RG_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 16
	  EAC_R11_SIGNED = 7,   //ETC2PACKAGE_R_SIGNED_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  EAC_RG11_SIGNED = 8,  //ETC2PACKAGE_RG_SIGNED_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 16
	  ETC2_SRGB = 9,        //ETC2PACKAGE_sRGB_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8
	  ETC2_SRGBA8 = 10,     //ETC2PACKAGE_sRGBA_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 16
	  ETC2_SRGBA1 = 11;     //ETC2PACKAGE_sRGBA1_NO_MIPMAPS Math.ceil(width/4) * Math.ceil(height/4) * 8

/**
 * ```
 * 0  = ETC1_RGB;        // Basic ETC
 * 1  = ETC2_RGB;        // Basic ETC2 without alpha
 * 2  = ETC1_RGBA8;      // Same as 0 but with alpha stored as second image (double height)
 * 3  = ETC2_RGBA8;      // Basic ETC2 with alpha
 * 4  = ETC2_RGBA1;      // ETC2 with punchthrough alpha
 * 5  = EAC_R11;         // Red channel 11 bits
 * 6  = EAC_RG11;        // Red & Green channel 11 bits
 * 7  = EAC_R11_SIGNED;  // Red channel signed 11 bits
 * 8  = EAC_RG11_SIGNED; // Red & Green channel signed 11 bits
 * 9  = ETC2_SRGB;       // Basic ETC2 without alpha as sRGB
 * 10 = ETC2_SRGBA8;     // Basic ETC2 with alpha as sRGB
 * 11 = ETC2_SRGBA1;     // ETC2 sRGB with punchthrough alpha
 * ```
 * @enum {number}
 */
const ETC_FORMAT = {
	ETC1_RGB: ETC1_RGB_NO_MIPMAPS,                     // GL_ETC1_RGB8_OES
	ETC2_RGB: ETC2PACKAGE_RGB_NO_MIPMAPS,              // GL_COMPRESSED_RGB8_ETC2
	ETC1_RGBA8: ETC2PACKAGE_RGBA_NO_MIPMAPS_OLD,       // GL_ETC1_RGB8_OES
	ETC2_RGBA8: ETC2PACKAGE_RGBA_NO_MIPMAPS,           // GL_COMPRESSED_RGBA8_ETC2_EAC
	ETC2_RGBA1: ETC2PACKAGE_RGBA1_NO_MIPMAPS, 	       // GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2
	EAC_R11: ETC2PACKAGE_R_NO_MIPMAPS,                 // GL_COMPRESSED_R11_EAC
	EAC_RG11: ETC2PACKAGE_RG_NO_MIPMAPS,               // GL_COMPRESSED_RG11_EAC
	EAC_R11_SIGNED: ETC2PACKAGE_R_SIGNED_NO_MIPMAPS,   // GL_COMPRESSED_SIGNED_R11_EAC
	EAC_RG11_SIGNED: ETC2PACKAGE_RG_SIGNED_NO_MIPMAPS, // GL_COMPRESSED_SIGNED_RG11_EAC
	ETC2_SRGB: ETC2PACKAGE_sRGB_NO_MIPMAPS,            // GL_SRGB
	ETC2_SRGBA8: ETC2PACKAGE_sRGBA_NO_MIPMAPS,         // GL_COMPRESSED_SRGB8_ETC2
	ETC2_SRGBA1: ETC2PACKAGE_sRGBA1_NO_MIPMAPS         // GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2
}

/**
 * Encode an RGBA8 image into an ETC format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {typeof ETC_FORMAT} format - ETC format to encode
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC(srcbuffer: Uint8Array | Buffer, width: number, height: number, format: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; } {
	if (!arraybuffcheck(srcbuffer)) {
		throw new Error(`Source data must be Uint8Array or Buffer`);
	}
	var codec;
	var speed = SPEED_SLOW;  // slow aka max
	var metric = METRIC_PERCEPTUAL; // perceptual
	var formatSigned = 0;
	if (format == ETC_FORMAT.ETC1_RGB ||
		format == ETC_FORMAT.ETC1_RGBA8
	) {
		codec = 0;
	} else {
		codec = 1;
	}
	if (format == ETC_FORMAT.EAC_RG11_SIGNED ||
		format == ETC_FORMAT.EAC_R11_SIGNED
	) {
		formatSigned = 1;
	}
	var { srcimg, alphaimg } = splitRGBA(srcbuffer, width, height);
	const extendedwidth = new Uint32Array(1),
		extendedheight = new Uint32Array(1);
	extendedwidth[0] = width;
	extendedheight[0] = height;
	var bitrate = 8;
	//if(format==ETC_FORMAT.EAC_RG11){
	//	bitrate=16;
	//}
	var wdiv4 = (width / 4) >> 0,
		hdiv4 = (height / 4) >> 0;
	if (!(wdiv4 * 4 == width)) {
		srcimg = expandToWidthDivByFour(srcimg, width, height, extendedwidth, extendedheight, bitrate);
	}
	if (!(hdiv4 * 4 == height)) {
		srcimg = expandToHeightDivByFour(srcimg, extendedwidth[0], height, extendedwidth, extendedheight, bitrate)
	}
	width = extendedwidth[0];
	height = extendedheight[0];
	readCompressParams();
	alphaimg = readAlpha(alphaimg, width, height, format);
	setupAlphaTableAndValtab();
	if (format == ETC_FORMAT.ETC1_RGBA8) { // double image with alpha
		var { newRgbBuffer, width, height } = doubleImageHeight(srcimg, alphaimg, width, height);
		extendedwidth[0] = width;
		extendedheight[0] = height;
		srcimg = newRgbBuffer;
	}
	var dstfile = ""; // removed this
	const ret = compressImageFile(srcimg, alphaimg, width, height, dstfile, extendedwidth, extendedheight, format, codec, speed, metric, formatSigned);
	// calculatePSNRfile(ret.fdata, ret.alphaimg, srcimg, alphaimg, extendedwidth[0], extendedheight[0], format);
	return {
		img: ret.img,
		alphaimg: ret.alphaimg,
		compressed: ret.compressedData,
		width: extendedwidth[0],
		height: extendedheight[0]
	}
};

/**
 * Encode an RGBA8 image into ETC1 RGB format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC1RGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	 return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC1_RGB);
};

/**
 * Encode an RGBA8 image into ETC1 RGBA format (alpha is added under the image doubling the height).
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC1RGBA(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC1_RGBA8);
};

/**
 * Encode an RGBA8 image into EACR11 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeEACR11(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.EAC_R11);
};

/**
 * Encode an RGBA8 image into signed EACR11 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeEACR11_SIGNED(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.EAC_R11_SIGNED);
};

/**
 * Encode an RGBA8 image into EACRG11 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeEACRG11(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.EAC_RG11);
};

/**
 * Encode an RGBA8 image into signed EACRG11 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeEACRG11_SIGNED(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.EAC_RG11_SIGNED);
};

/**
 * Encode an RGBA8 image into ETC2 RGB format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2RGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_RGB);
};

/**
 * Encode an RGBA8 image into ETC2 RGBA format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2RGBA(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_RGBA8);
};

/**
 * Encode an RGBA8 image into ETC2 RGBA1 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2RGBA1(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_RGBA1);
};

/**
 * Encode an RGBA8 image into ETC2 sRGB format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2sRGB(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_SRGBA8);
};

/**
 * Encode an RGBA8 image into ETC2 sRGBA1 format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2sRGBA1(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_SRGBA1);
};

/**
 * Encode an RGBA8 image into ETC2 sRGBA format.
 * 
 * Note: Image width and height must be divisible by 4. 
 * Otherwise, it will be expanded.
 * 
 * Returns the image, alpha image, compressed data and the extended width and height (if needed)
 * 
 * @param {Uint8Array | Buffer} srcbuffer - Image data in RGBA8 order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{img:uint8, alphaimg:uint8, compressed:uint8, width:number, height:number }}
 */
export function encodeETC2sRGBA8(srcbuffer: Uint8Array | Buffer, width: number, height: number): { img: uint8; alphaimg: uint8; compressed: uint8; width: number; height: number; }{
	return encodeETC(srcbuffer,width,height,ETC_FORMAT.ETC2_SRGBA8);
};