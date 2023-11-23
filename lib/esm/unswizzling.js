// Source :
// https://github.com/Cxbx-Reloaded/Cxbx-Reloaded/blob/793354701f1ebe0a379e3d8524bdf8575eda4fd2/src/CxbxKrnl/EmuD3D8/Convert.cpp#L1339
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
/**
 * Unswizzle pixle data.
 *
 * @param {Uint8Array|Buffer} Src - Source data as a 8, 16 or 32 bits per pixle
 * @param {number} width - Image width
 * @param {number} height - Image hidth
 * @param {number} depth - Image depth (normally 1)
 * @param {number} bytesPerPixel - 1 (8 bits), 2 (16 bits) or 4 (32 bits)
 * @param {number} dstRowPitch - Swizzle row pitch
 * @param {number} dstSlicePitch - Swizzle slice pitch
 * @returns
 */
export function unswizzle(
/*CONST PVOID*/ Src, 
/*CONST DWORD*/ width, 
/*CONST DWORD*/ height, 
/*CONST DWORD*/ depth, 
/*CONST DWORD*/ bytesPerPixel, 
/*CONST DWORD*/ dstRowPitch, 
/*CONST DWORD*/ dstSlicePitch) {
    if (!isArrayOrBuffer(Src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    if (bytesPerPixel <= 0 || bytesPerPixel == 3 || bytesPerPixel > 4) {
        throw new Error(`Bytes per pixel must be 1, 2 or 4. Got ` + bytesPerPixel);
    }
    //DWORD 
    const dwMaskX = new Int32Array([0]), dwMaskY = new Int32Array([0]), dwMaskZ = new Int32Array([0]);
    for (var i = 1, j = 1; (i < width) || (i < height) || (i < depth); i <<= 1) {
        if (i < width) {
            dwMaskX[0] |= j;
            j <<= 1;
        }
        if (i < height) {
            dwMaskY[0] |= j;
            j <<= 1;
        }
        if (i < depth) {
            dwMaskZ[0] |= j;
            j <<= 1;
        }
    }
    //DWORD 
    const dwStartX = 0;
    const dwStartY = 0;
    const dwStartZ = 0;
    const dwZ = new Int32Array([dwStartZ]);
    ;
    switch (bytesPerPixel) {
        case 1: {
            const pSrc = Src; //(uint8_t *)
            const pDstBuff = new Uint8Array(Src.length);
            var pDestSlice = 0; //(uint8_t *pDstBuff)
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice; //(uint8_t *)
                //DWORD
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    //DWORD 
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        //uint
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]]; // copy one pixel
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0]; // step to next pixel in source
                    }
                    pDestRow += dstRowPitch; // / 1; // = / dwBPP; // step to next line in destination
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0]; // step to next line in source
                }
                pDestSlice += dstSlicePitch; // / 1; // = / dwBPP; // step to next level in destination
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0]; // step to next level in source
            }
            if (isBuffer(Src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return pDstBuff;
            break;
        }
        case 2: { //
            const pSrc = new Uint16Array(Src.buffer); //(uint16_t *);
            const pDstBuff = new Uint8Array(Src.length / 2);
            var pDestSlice = 0; //(uint16_t *pDstBuff);
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice; //(uint16_t *)
                //DWORD
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    //DWORD 
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        //uint
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]]; // copy one pixel
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0]; // step to next pixel in source
                    }
                    pDestRow += dstRowPitch / 2; // = dwBPP; // step to next line in destination
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0]; // step to next line in source
                }
                pDestSlice += dstSlicePitch / 2; // = dwBPP; // step to next level in destination
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0]; // step to next level in source
            }
            if (isBuffer(Src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
            break;
        }
        case 4: {
            const pSrc = new Uint32Array(Src.buffer);
            ; //(uint32_t *;
            const pDstBuff = new Uint32Array(Src.length / 4);
            var pDestSlice = 0; //(uint32_t *);
            for (var z = 0; z < depth; z++) {
                var pDestRow = pDestSlice; //uint32_t *;
                //DWORD
                const dwY = new Int32Array([dwStartY]);
                for (var y = 0; y < height; y++) {
                    //DWORD 
                    const dwYZ = new Int32Array([dwY[0] | dwZ[0]]);
                    const dwX = new Int32Array([dwStartX]);
                    for (var x = 0; x < width; x++) {
                        //uint
                        const delta = new Uint32Array([dwX[0] | dwYZ[0]]);
                        pDstBuff[pDestRow + x] = pSrc[delta[0]]; // copy one pixel
                        dwX[0] = (dwX[0] - dwMaskX[0]) & dwMaskX[0]; // step to next pixel in source
                    }
                    pDestRow += dstRowPitch / 4; // = dwBPP; // step to next line in destination
                    dwY[0] = (dwY[0] - dwMaskY[0]) & dwMaskY[0]; // step to next line in source
                }
                pDestSlice += dstSlicePitch / 4; // = dwBPP; // step to next level in destination
                dwZ[0] = (dwZ[0] - dwMaskZ[0]) & dwMaskZ[0]; // step to next level in source
            }
            if (isBuffer(Src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
            break;
        }
        default:
            return Src;
            break;
    }
} // EmuUnswizzleBox NOPATCH
// source
// https://github.com/yuzu-emu/yuzu/blob/43be2bfe332d5537041262eb08037993239eaf5f/src/video_core/textures/decoders.h
function MakeSwizzleTable() {
    const table = Array.from({ length: 8 }, () => new Uint32Array(64));
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 64; ++x) {
            table[y][x] = ((x % 64) / 32) * 256 + ((y % 8) / 2) * 64 + ((x % 32) / 16) * 32 +
                (y % 2) * 16 + (x % 16);
        }
    }
    return table;
}
//# sourceMappingURL=unswizzling.js.map