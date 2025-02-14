//source
//https://github.com/K0lb3/tex2img/blob/e041424880234d41ef16257ac5c9d773d65a2e7f/src/pvrtc_decoder/PVRTDecompress.cpp

function assert(condition: any, message?: any) {
	if (!condition) {
		throw new Error(message || "Assertion failed");
	}
}

class Pixel32 {
	red: Uint8Array;
	green: Uint8Array;
	blue: Uint8Array;
	alpha: Uint8Array
	constructor(red?: number, green?: number, blue?: number, alpha?: number) {
		this.red = new Uint8Array([red != undefined ? red : 0]);
		this.green = new Uint8Array([green != undefined ? green : 0]);
		this.blue = new Uint8Array([blue != undefined ? blue : 0]);
		this.alpha = new Uint8Array([alpha != undefined ? alpha : 0]);
	}
}

class Pixel128S {
	red: Int32Array;
	green: Int32Array;
	blue: Int32Array;
	alpha: Int32Array
	constructor(red?: number, green?: number, blue?: number, alpha?: number) {
		this.red = new Int32Array([red != undefined ? red : 0]);
		this.green = new Int32Array([green != undefined ? green : 0]);
		this.blue = new Int32Array([blue != undefined ? blue : 0]);
		this.alpha = new Int32Array([alpha != undefined ? alpha : 0]);
	}
}

class PVRTCWord {
	modulationData: Uint32Array;
	colorData: Uint32Array;
	constructor(modulationData?: number, colorData?: number) {
		this.modulationData = new Uint32Array([modulationData != undefined ? modulationData : 0]);
		this.colorData = new Uint32Array([colorData != undefined ? colorData : 0]);
	}
}

class PVRTCWordIndices {
	P: Int32Array;
	Q: Int32Array;
	R: Int32Array;
	S: Int32Array;
	constructor() {
		this.P = new Int32Array(2);
		this.Q = new Int32Array(2);
		this.R = new Int32Array(2);
		this.S = new Int32Array(2);
	}
}


/*static Pixel32*/
function getColorA(
    /*uint32_t*/ colorData: number): Pixel32 {
	const color = new Pixel32();

	// Opaque Color Mode - RGB 554
	if ((colorData & 0x8000) != 0) {
		color.red[0] = (colorData & 0x7c00) >> 10; // 5->5 bits
		color.green[0] = (colorData & 0x3e0) >> 5; // 5->5 bits
		color.blue[0] = (colorData & 0x1e) | ((colorData & 0x1e) >> 4); // 4->5 bits
		color.alpha[0] = 0xf; // 0->4 bits
	}
	// Transparent Color Mode - ARGB 3443
	else {
		color.red[0] = ((colorData & 0xf00) >> 7) | ((colorData & 0xf00) >> 11); // 4->5 bits
		color.green[0] = ((colorData & 0xf0) >> 3) | ((colorData & 0xf0) >> 7); // 4->5 bits
		color.blue[0] = ((colorData & 0xe) << 1) | ((colorData & 0xe) >> 2); // 3->5 bits
		color.alpha[0] = (colorData & 0x7000) >> 11; // 3->4 bits - note 0 at right
	}

	return color;
}

/*static Pixel32*/
function getColorB(
    /*uint32_t*/ colorData: number): Pixel32 {
	const color = new Pixel32();

	// Opaque Color Mode - RGB 555
	if (colorData & 0x80000000) {
		color.red[0] = (colorData & 0x7c000000) >> 26; // 5->5 bits
		color.green[0] = (colorData & 0x3e00000) >> 21; // 5->5 bits
		color.blue[0] = (colorData & 0x1f0000) >> 16; // 5->5 bits
		color.alpha[0] = 0xf; // 0 bits
	}
	// Transparent Color Mode - ARGB 3444
	else {
		color.red[0] = ((colorData & 0xf000000) >> 23) | ((colorData & 0xf000000) >> 27); // 4->5 bits
		color.green[0] = ((colorData & 0xf00000) >> 19) | ((colorData & 0xf00000) >> 23); // 4->5 bits
		color.blue[0] = ((colorData & 0xf0000) >> 15) | ((colorData & 0xf0000) >> 19); // 4->5 bits
		color.alpha[0] = (colorData & 0x70000000) >> 27; // 3->4 bits - note 0 at right
	}

	return color;
}

/*static void */
function interpolateColors(
	P: Pixel32,
	Q: Pixel32,
	R: Pixel32,
	S: Pixel32,
	pPixel: Array<any>,
	bpp: number): void {
	/*uint32_t*/ var wordWidth = 4;
	/*uint32_t*/ const wordHeight = 4;
	if (bpp == 2) {
		wordWidth = 8;
	}

	// Convert to int 32.
	const hP = new Pixel128S(P.red[0], P.green[0], P.blue[0], P.alpha[0]);
	const hQ = new Pixel128S(Q.red[0], Q.green[0], Q.blue[0], Q.alpha[0]);
	const hR = new Pixel128S(R.red[0], R.green[0], R.blue[0], R.alpha[0]);
	const hS = new Pixel128S(S.red[0], S.green[0], S.blue[0], S.alpha[0]);

	// Get vectors.
	const QminusP = new Pixel128S(hQ.red[0] - hP.red[0], hQ.green[0] - hP.green[0], hQ.blue[0] - hP.blue[0], hQ.alpha[0] - hP.alpha[0]);
	const SminusR = new Pixel128S(hS.red[0] - hR.red[0], hS.green[0] - hR.green[0], hS.blue[0] - hR.blue[0], hS.alpha[0] - hR.alpha[0]);

	// Multiply colors.
	hP.red[0] *= wordWidth;
	hP.green[0] *= wordWidth;
	hP.blue[0] *= wordWidth;
	hP.alpha[0] *= wordWidth;
	hR.red[0] *= wordWidth;
	hR.green[0] *= wordWidth;
	hR.blue[0] *= wordWidth;
	hR.alpha[0] *= wordWidth;

	if (bpp == 2) {
		// Loop through pixels to achieve results.
		for (var x = 0; x < wordWidth; x++) {
			const result = new Pixel128S(4 * hP.red[0], 4 * hP.green[0], 4 * hP.blue[0], 4 * hP.alpha[0]);
			const dY = new Pixel128S(hR.red[0] - hP.red[0], hR.green[0] - hP.green[0], hR.blue[0] - hP.blue[0], hR.alpha[0] - hP.alpha[0]);

			for (var y = 0; y < wordHeight; y++) {

				pPixel[y * wordWidth + x] = new Pixel128S(
					(result.red[0] >> 7) + (result.red[0] >> 2),
					(result.green[0] >> 7) + (result.green[0] >> 2),
					(result.blue[0] >> 7) + (result.blue[0] >> 2),
					(result.alpha[0] >> 5) + (result.alpha[0] >> 1)
				)

				result.red[0] += dY.red[0];
				result.green[0] += dY.green[0];
				result.blue[0] += dY.blue[0];
				result.alpha[0] += dY.alpha[0];
			}

			hP.red[0] += QminusP.red[0];
			hP.green[0] += QminusP.green[0];
			hP.blue[0] += QminusP.blue[0];
			hP.alpha[0] += QminusP.alpha[0];

			hR.red[0] += SminusR.red[0];
			hR.green[0] += SminusR.green[0];
			hR.blue[0] += SminusR.blue[0];
			hR.alpha[0] += SminusR.alpha[0];
		}
	}
	else {
		// Loop through pixels to achieve results.
		for (var y = 0; y < wordHeight; y++) {
			const result = new Pixel128S(4 * hP.red[0], 4 * hP.green[0], 4 * hP.blue[0], 4 * hP.alpha[0]);
			const dY = new Pixel128S(hR.red[0] - hP.red[0], hR.green[0] - hP.green[0], hR.blue[0] - hP.blue[0], hR.alpha[0] - hP.alpha[0]);

			for (var x = 0; x < wordWidth; x++) {

				pPixel[y * wordWidth + x] = new Pixel128S(
					(result.red[0] >> 6) + (result.red[0] >> 1),
					(result.green[0] >> 6) + (result.green[0] >> 1),
					(result.blue[0] >> 6) + (result.blue[0] >> 1),
					(result.alpha[0] >> 4) + (result.alpha[0])
				)

				result.red[0] += dY.red[0];
				result.green[0] += dY.green[0];
				result.blue[0] += dY.blue[0];
				result.alpha[0] += dY.alpha[0];
			}

			hP.red[0] += QminusP.red[0];
			hP.green[0] += QminusP.green[0];
			hP.blue[0] += QminusP.blue[0];
			hP.alpha[0] += QminusP.alpha[0];

			hR.red[0] += SminusR.red[0];
			hR.green[0] += SminusR.green[0];
			hR.blue[0] += SminusR.blue[0];
			hR.alpha[0] += SminusR.alpha[0];
		}
	}
}

/*static void*/
function unpackModulations(
    /*const PVRTCWord&*/ word: PVRTCWord,
    /*int32_t*/ wordWidth: number,
    /*int32_t*/ wordHeight: number,
    /*int32_t*/ modulationValues: Int32Array[],
    /*int32_t*/ modulationModes: Int32Array[],
    /*uint8_t*/ bpp: number): void {
	/*uint32_t*/ var WordModMode = word.colorData[0] & 0x1;
	/*uint32_t*/ var ModulationBits = word.modulationData[0];

	// Unpack differently depending on 2bpp or 4bpp modes.
	if (bpp == 2) {
		if (WordModMode) {
			// determine which of the three modes are in use:

			// If this is the either the H-only or V-only interpolation mode...
			if (ModulationBits & 0x1) {
				// look at the "LSB" for the "centre" (V=2,H=4) texel. Its LSB is now
				// actually used to indicate whether it's the H-only mode or the V-only...

				// The centre texel data is the at (y==2, x==4) and so its LSB is at bit 20.
				if (ModulationBits & (0x1 << 20)) {
					// This is the V-only mode
					WordModMode = 3;
				}
				else {
					// This is the H-only mode
					WordModMode = 2;
				}

				// Create an extra bit for the centre pixel so that it looks like
				// we have 2 actual bits for this texel. It makes later coding much easier.
				if (ModulationBits & (0x1 << 21)) {
					// set it to produce code for 1.0
					ModulationBits = (ModulationBits | (0x1 << 20)) >>> 0;
				}
				else {
					// clear it to produce 0.0 code
					ModulationBits = (ModulationBits & ~(0x1 << 20)) >>> 0;
				}
			} // end if H-Only or V-Only interpolation mode was chosen

			if (ModulationBits & 0x2) {
				ModulationBits = (ModulationBits | 0x1) >>> 0; /*set it*/
			}
			else {
				ModulationBits = (ModulationBits & ~0x1) >>> 0; /*clear it*/
			}

			// run through all the pixels in the block. Note we can now treat all the
			// "stored" values as if they have 2bits (even when they didn't!)
			for (var y = 0; y < 4; y++) {
				for (var x = 0; x < 8; x++) {
					modulationModes[x + wordWidth][y + wordHeight] = WordModMode;

					// if this is a stored value...
					if (((x ^ y) & 1) == 0) {
						modulationValues[x + wordWidth][y + wordHeight] = ModulationBits & 3;
						ModulationBits >>>= 2;
					}
				}
			} // end for y
		}
		// else if direct encoded 2bit mode - i.e. 1 mode bit per pixel
		else {
			for (var y = 0; y < 4; y++) {
				for (var x = 0; x < 8; x++) {
					modulationModes[x + wordWidth][y + wordHeight] = WordModMode;

					/*
					// double the bits so 0=> 00, and 1=>11
					*/
					if (ModulationBits & 1) {
						modulationValues[x + wordWidth][y + wordHeight] = 0x3;
					}
					else {
						modulationValues[x + wordWidth][y + wordHeight] = 0x0;
					}
					ModulationBits >>>= 1;
				}
			} // end for y
		}
	}
	else {
		// Much simpler than the 2bpp decompression, only two modes, so the n/8 values are set directly.
		// run through all the pixels in the word.
		if (WordModMode) {
			for (var y = 0; y < 4; y++) {
				for (var x = 0; x < 4; x++) {
					modulationValues[y + wordHeight][x + wordHeight] = ModulationBits & 3;
					// if (modulationValues==0) {}. We don't need to check 0, 0 = 0/8.
					if (modulationValues[y + wordHeight][x + wordHeight] == 1) {
						modulationValues[y + wordHeight][x + wordHeight] = 4;
					}
					else if (modulationValues[y + wordHeight][x + wordHeight] == 2) {
						modulationValues[y + wordHeight][x + wordHeight] = 14;
						//+10 tells the decompressor to punch through alpha.
					}
					else if (modulationValues[y + wordHeight][x + wordHeight] == 3) {
						modulationValues[y + wordHeight][x + wordHeight] = 8;
					}
					ModulationBits >>>= 2;
				} // end for x
			} // end for y
		}
		else {
			for (var y = 0; y < 4; y++) {
				for (var x = 0; x < 4; x++) {
					modulationValues[y + wordHeight][x + wordHeight] = ModulationBits & 3;
					modulationValues[y + wordHeight][x + wordHeight] *= 3;
					if (modulationValues[y + wordHeight][x + wordHeight] > 3) {
						modulationValues[y + wordHeight][x + wordHeight] -= 1;
					}
					ModulationBits >>>= 2;
				} // end for x
			} // end for y
		}
	}

	assert((ModulationBits == 0), `UnpackModulations (ModulationBits == 0): ${ModulationBits}`);
}

/*static int32_t */
function getModulationValues(
    /*int32_t [16][8]*/ modulationValues: Int32Array[],
    /*int32_t [16][8]*/ modulationModes: Int32Array[],
    /*uint32_t*/ xPos: number,
    /*uint32_t*/ yPos: number,
    /*uint8_t*/ bpp: number): number {
	const retval = new Int32Array([0])
	if (bpp == 2) {
		/*int32_t*/ const RepVals0 = new Int32Array([0, 3, 5, 8]);

		// extract the modulation value. If a simple encoding
		if (modulationModes[xPos][yPos] == 0) {
			return RepVals0[modulationValues[xPos][yPos]];
		}
		else {
			// if this is a stored value
			if (((xPos ^ yPos) & 1) == 0) {
				return RepVals0[modulationValues[xPos][yPos]];
			}

			// else average from the neighbours
			// if H&V interpolation...
			else if (modulationModes[xPos][yPos] == 1) {
				return new Int32Array([(RepVals0[modulationValues[xPos][yPos - 1]] +
					RepVals0[modulationValues[xPos][yPos + 1]] +
					RepVals0[modulationValues[xPos - 1][yPos]] +
					RepVals0[modulationValues[xPos + 1][yPos]] + 2) / 4
				])[0];
			}
			// else if H-Only
			else if (modulationModes[xPos][yPos] == 2) {
				return new Int32Array([(RepVals0[modulationValues[xPos - 1][yPos]] +
					RepVals0[modulationValues[xPos + 1][yPos]] + 1) / 2
				])[0];
			}
			// else it's V-Only
			else {
				return new Int32Array([(RepVals0[modulationValues[xPos][yPos - 1]] +
					RepVals0[modulationValues[xPos][yPos + 1]] + 1) / 2
				])[0];
			}
		}
	}
	else if (bpp == 4) {
		return modulationValues[xPos][yPos];
	}

	return 0;
}

/*static void */
function pvrtcGetDecompressedPixels(
    /*const PVRTCWord&*/ P: PVRTCWord,
    /*const PVRTCWord&*/ Q: PVRTCWord,
    /*const PVRTCWord&*/ R: PVRTCWord,
    /*const PVRTCWord&*/ S: PVRTCWord,
    /*Pixel32* */ pPixels: Array<any>,
    /*uint8_t*/ bpp: number): void {
	// 4bpp only needs 8*8 values, but 2bpp needs 16*8, so rather than wasting processor time we just statically allocate 16*8.
	/*int32_t*/ const modulationValues = Array.from({ length: 16 }, () => new Int32Array(8));

	// Only 2bpp needs this.
	/*int32_t*/ const modulationModes = Array.from({ length: 16 }, () => new Int32Array(8));
	// 4bpp only needs 16 values, but 2bpp needs 32, so rather than wasting processor time we just statically allocate 32.
	const upscaledColorA = Array.from({ length: 32 }) as Pixel128S[]
	const upscaledColorB = Array.from({ length: 32 }) as Pixel128S[]

	const wordWidth = bpp == 2 ? 8 : 4;
	const wordHeight = 4;

	// Get the modulations from each word.
	unpackModulations(P, 0, 0, modulationValues, modulationModes, bpp);
	unpackModulations(Q, wordWidth, 0, modulationValues, modulationModes, bpp);
	unpackModulations(R, 0, wordHeight, modulationValues, modulationModes, bpp);
	unpackModulations(S, wordWidth, wordHeight, modulationValues, modulationModes, bpp);

	// Bilinear upscale image data from 2x2 -> 4x4
	interpolateColors(getColorA(P.colorData[0]), getColorA(Q.colorData[0]), getColorA(R.colorData[0]), getColorA(S.colorData[0]), upscaledColorA, bpp);
	interpolateColors(getColorB(P.colorData[0]), getColorB(Q.colorData[0]), getColorB(R.colorData[0]), getColorB(S.colorData[0]), upscaledColorB, bpp);

	for (var y = 0; y < wordHeight; y++) {
		for (var x = 0; x < wordWidth; x++) {
			/*int32_t*/ var mod = getModulationValues(modulationValues, modulationModes, (x + wordWidth / 2) >>> 0, (y + wordHeight / 2) >>> 0, bpp);
			var punchthroughAlpha = false;
			if (mod > 10) {
				punchthroughAlpha = true;
				mod -= 10;
			}

			const result = new Pixel128S(
				(upscaledColorA[y * wordWidth + x].red[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].red[0] * mod) / 8,
				(upscaledColorA[y * wordWidth + x].green[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].green[0] * mod) / 8,
				(upscaledColorA[y * wordWidth + x].blue[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].blue[0] * mod) / 8,
				punchthroughAlpha ? 0 : (upscaledColorA[y * wordWidth + x].alpha[0] * (8 - mod) + upscaledColorB[y * wordWidth + x].alpha[0] * mod) / 8
			);

			// Convert the 32bit precision Result to 8 bit per channel color.
			if (bpp == 2) {
				pPixels[y * wordWidth + x] = new Pixel32(
					result.red[0],
					result.green[0],
					result.blue[0],
					result.alpha[0]
				);
			}
			else if (bpp == 4) {
				pPixels[y + x * wordHeight] = new Pixel32(
					result.red[0],
					result.green[0],
					result.blue[0],
					result.alpha[0]
				);
			}
		}
	}
}

/*static uint32_t */
function wrapWordIndex(
   /** uint32_t */ numWords: number,
    /**int*/ word: number): number {
	return ((word + numWords) % numWords);
}

/*static bool */
function isPowerOf2(/*uint32_t*/ input: number): boolean {
	var minus1;

	if (input <= 0) {
		return false;
	}

	minus1 = (input - 1) >>> 0;
	return ((input | minus1) == (input ^ minus1));
}

/*static uint32_t */
function TwiddleUV(
    /*uint32_t*/ XSize: number,
    /*uint32_t*/ YSize: number,
    /*uint32_t*/ XPos: number,
    /*uint32_t*/ YPos: number): number {
	/*uint32_t*/
	const Twiddled = new Uint32Array(1);
	const MinDimension = new Uint32Array(1);
	const MaxValue = new Uint32Array(1);
	const SrcBitPos = new Uint32Array(1);
	const DstBitPos = new Uint32Array(1);

	/*int*/
	const ShiftCount = new Int32Array(1);

	assert(YPos < YSize, `TwiddleUV ${YPos} < ${YSize}`);
	assert(XPos < XSize, `TwiddleUV ${XPos} < ${XSize}`);
	assert(isPowerOf2(YSize), `TwiddleUV isPowerOf2(${YSize})`);
	assert(isPowerOf2(XSize), `TwiddleUV isPowerOf2(${XSize})`);

	if (YSize < XSize) {
		MinDimension[0] = YSize;
		MaxValue[0] = XPos;
	} else {
		MinDimension[0] = XSize;
		MaxValue[0] = YPos;
	}

	// Step through all the bits in the "minimum" dimension
	SrcBitPos[0] = 1;
	DstBitPos[0] = 1;
	Twiddled[0] = 0;
	ShiftCount[0] = 0;

	while (SrcBitPos[0] < MinDimension[0]) {
		if (YPos & SrcBitPos[0]) {
			Twiddled[0] |= DstBitPos[0];
		}

		if (XPos & SrcBitPos[0]) {
			Twiddled[0] |= (DstBitPos[0] << 1);
		}


		SrcBitPos[0] <<= 1;
		DstBitPos[0] <<= 2;
		ShiftCount[0] += 1;

	}

	// prepend any unused bits
	MaxValue[0] >>>= ShiftCount[0];

	Twiddled[0] |= (MaxValue[0] << (2 * ShiftCount[0]));

	return Twiddled[0];
}

/*static void */
function mapDecompressedData(
    /*Pixel32* */ pOutput: Array<any>,
    /*uint32_t */ width: number,
    /*const Pixel32* */ pPixels: Array<any>,
    /*const PVRTCWordIndices& */indices: PVRTCWordIndices,
    /*uint8_t*/ bpp: number): void {
	/*uint32_t*/ const wordWidth = bpp == 2 ? 8 : 4;
	/*uint32_t*/ const wordHeight = 4;

	for (var y = 0; y < wordHeight / 2; y++) {
		for (var x = 0; x < wordWidth / 2; x++) {
			const value1 = pPixels[y * wordWidth + x]
			pOutput[(((indices.P[1] * wordHeight) + y + wordHeight / 2) * width + indices.P[0] * wordWidth + x + wordWidth / 2)] = new Pixel32(value1.red[0], value1.green[0], value1.blue[0], value1.alpha[0]); // map P
			const value2 = pPixels[y * wordWidth + x + wordWidth / 2]
			pOutput[(((indices.Q[1] * wordHeight) + y + wordHeight / 2) * width + indices.Q[0] * wordWidth + x)] = new Pixel32(value2.red[0], value2.green[0], value2.blue[0], value2.alpha[0]); // map Q
			const value3 = pPixels[(y + wordHeight / 2) * wordWidth + x]
			pOutput[(((indices.R[1] * wordHeight) + y) * width + indices.R[0] * wordWidth + x + wordWidth / 2)] = new Pixel32(value3.red[0], value3.green[0], value3.blue[0], value3.alpha[0]); // map R
			const value4 = pPixels[(y + wordHeight / 2) * wordWidth + x + wordWidth / 2]
			pOutput[(((indices.S[1] * wordHeight) + y) * width + indices.S[0] * wordWidth + x)] = new Pixel32(value4.red[0], value4.green[0], value4.blue[0], value4.alpha[0]); // map S
		}
	}
}
/*static uint32_t */
function pvrtcDecompress(
    /*uint8_t* */ pCompressedData: Uint8Array,
    /*Pixel32* */ pOutData: Array<any>,
    /*uint32_t */ width: number,
    /*uint32_t */ height: number,
    /*uint8_t */ bpp: number): number {
	/*uint32_t */ var wordWidth = 4;
	/*uint32_t */ const wordHeight = 4;
	if (bpp == 2) {
		wordWidth = 8;
	}

	//uint32_t* pWordMembers = (uint32_t*)pCompressedData;
	const pWordMembers = []
	for (var i = 0; i < pCompressedData.length; i += 4) {
		const value = (((pCompressedData[i + 3] & 0xFF) << 24) | ((pCompressedData[i + 2] & 0xFF) << 16) | ((pCompressedData[i + 1] & 0xFF) << 8) | (pCompressedData[i] & 0xFF))
		pWordMembers.push(value >>> 0)
	}

	// Calculate number of words
	const i32NumXWords = new Int32Array([(width / wordWidth)])[0];
	const i32NumYWords = new Int32Array([(height / wordHeight)])[0];

	// Structs used for decompression
	const indices = new PVRTCWordIndices();
	//std::vector<Pixel32> pPixels(wordWidth * wordHeight * sizeof(Pixel32));

	const pPixels = Array.from({ length: wordWidth * wordHeight });
	// For each row of words
	for (var wordY = -1; wordY < i32NumYWords - 1; wordY++) {

		// for each column of words
		for (var wordX = -1; wordX < i32NumXWords - 1; wordX++) {
			indices.P[0] = wrapWordIndex(i32NumXWords, wordX);
			indices.P[1] = wrapWordIndex(i32NumYWords, wordY);
			indices.Q[0] = wrapWordIndex(i32NumXWords, wordX + 1);
			indices.Q[1] = wrapWordIndex(i32NumYWords, wordY);
			indices.R[0] = wrapWordIndex(i32NumXWords, wordX);
			indices.R[1] = wrapWordIndex(i32NumYWords, wordY + 1);
			indices.S[0] = wrapWordIndex(i32NumXWords, wordX + 1);
			indices.S[1] = wrapWordIndex(i32NumYWords, wordY + 1);

			// Work out the offsets into the twiddle structs, multiply by two as there are two members per word.
			const WordOffsets = new Uint32Array([
				TwiddleUV(i32NumXWords, i32NumYWords, indices.P[0], indices.P[1]) * 2,
				TwiddleUV(i32NumXWords, i32NumYWords, indices.Q[0], indices.Q[1]) * 2,
				TwiddleUV(i32NumXWords, i32NumYWords, indices.R[0], indices.R[1]) * 2,
				TwiddleUV(i32NumXWords, i32NumYWords, indices.S[0], indices.S[1]) * 2,
			]);

			// Access individual elements to fill out PVRTCWord
			const P = new PVRTCWord()
			const Q = new PVRTCWord()
			const R = new PVRTCWord()
			const S = new PVRTCWord()
			P.modulationData[0] = pWordMembers[WordOffsets[0]];
			P.colorData[0] = pWordMembers[WordOffsets[0] + 1];
			Q.modulationData[0] = pWordMembers[WordOffsets[1]];
			Q.colorData[0] = pWordMembers[WordOffsets[1] + 1];
			R.modulationData[0] = pWordMembers[WordOffsets[2]];
			R.colorData[0] = pWordMembers[WordOffsets[2] + 1];
			S.modulationData[0] = pWordMembers[WordOffsets[3]];
			S.colorData[0] = pWordMembers[WordOffsets[3] + 1];

			// assemble 4 words into struct to get decompressed pixels from
			pvrtcGetDecompressedPixels(P, Q, R, S, pPixels, bpp);
			mapDecompressedData(pOutData, width, pPixels, indices, bpp);

		} // for each word
	} // for each row of words

	// Return the data size
	return width * height / ((wordWidth / 2) >>> 0);
}

function flat32(data: Pixel32[], asBufer: boolean): Uint8Array {
	const retval = asBufer ? Buffer.alloc(data.length * 4) : new Uint8Array(data.length * 4)
	for (let i = 0; i < data.length; i++) {
		retval[i * 4] = data[i].red[0]
		retval[i * 4 + 1] = data[i].green[0]
		retval[i * 4 + 2] = data[i].blue[0]
		retval[i * 4 + 3] = data[i].alpha[0]
	}
	return retval
}

function isBuffer(obj: Buffer | Uint8Array): boolean {
	return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function arraybuffcheck(obj: Buffer | Uint8Array): boolean {
	return obj instanceof Uint8Array || isBuffer(obj);
}

/**
 * Decompress PVRTC 2bit data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` RGBA
 */
export function decodePVRTC2bit(
	/**const void* */ src: Buffer | Uint8Array,
	/**uint32_t */ width: number,
	/**uint32_t */ height: number,
): Uint8Array {
	return decodePVRTC(src, width, height, true);
}

/**
 * Decompress PVRTC 4bit data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` RGBA
 */
export function decodePVRTC4bit(
	/**const void* */ src: Buffer | Uint8Array,
	/**uint32_t */ width: number,
	/**uint32_t */ height: number,
): Uint8Array {
	return decodePVRTC(src, width, height, false);
}

function check_size(width: number, height: number, bpp: number, src: Buffer | Uint8Array): void {
	const size_needed = width * height * bpp / 8;
	if (src.length < size_needed) {
		throw new Error(`Source data too short for resolution supplied: Source size - ${src.length} Needed size: - ${size_needed}`)
	}
}

/**
 * Decompress PVRTC data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} src - Source data
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} Do2bitMode - 2bit mode if true, else 4bit
 * @returns ```Buffer``` or ```Uint8Array``` RGBA
 */
export function decodePVRTC(
	/**const void* */ src: Buffer | Uint8Array,
	/**uint32_t */ width: number,
	/**uint32_t */ height: number,
    /**uint32_t */ Do2bitMode?: boolean,
): Uint8Array {
	if (!arraybuffcheck(src)) {
		throw new Error(`Source data must be Uint8Array or Buffer`);
	}

	check_size(width, height, Do2bitMode ? 2 : 4, src);

	// Check the X and Y values are at least the minimum size.
	var XTrueDim = Math.max(width, (Do2bitMode ? 16 : 8));
	var YTrueDim = Math.max(height, 8);

	// If the dimensions aren't correct, we need to create a new buffer instead of just using the provided one, as the buffer will overrun otherwise.
	//if (XTrueDim != XDim || YTrueDim != YDim) { pDecompressedData = new Pixel32[XTrueDim * YTrueDim]; }

	// If the dimensions were too small
	if (XTrueDim != width || YTrueDim != height) {
		throw new Error("Image size too small for data supplied");
	}

	const size_needed = width * height * (Do2bitMode ? 2 : 4) / 8;
	if (src.length < size_needed) {
		throw new Error("Image size too small for data supplied");
	}

	// Cast the output buffer to a Pixel32 pointer.
	var pDecompressedData = Array.from({ length: XTrueDim * YTrueDim }) as Pixel32[];

	// Decompress the surface.
	pvrtcDecompress(src, pDecompressedData, XTrueDim, YTrueDim, Do2bitMode ? 2 : 4);

	return flat32(pDecompressedData, isBuffer(src));
}
