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
 * @param {Uint8Array|Buffer} src - Source data as a 8, 16 or 32 bits per pixle
 * @param {number} width - Image width
 * @param {number} height - Image hidth
 * @param {number} depth - Image depth (normally 1)
 * @param {number} bytesPerPixel - 1 (8 bits), 2 (16 bits) or 4 (32 bits)
 * @param {number} dstRowPitch - Swizzle row pitch
 * @param {number} dstSlicePitch - Swizzle slice pitch
 * @returns
 */
export function unswizzle(
/*CONST PVOID*/ src, 
/*CONST DWORD*/ width, 
/*CONST DWORD*/ height, 
/*CONST DWORD*/ depth, 
/*CONST DWORD*/ bytesPerPixel, 
/*CONST DWORD*/ dstRowPitch, 
/*CONST DWORD*/ dstSlicePitch) {
    if (!isArrayOrBuffer(src)) {
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
            const pSrc = src; //(uint8_t *)
            const pDstBuff = new Uint8Array(src.length);
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
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return pDstBuff;
            break;
        }
        case 2: { //
            const pSrc = new Uint16Array(src.buffer); //(uint16_t *);
            const pDstBuff = new Uint8Array(src.length / 2);
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
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
            break;
        }
        case 4: {
            const pSrc = new Uint32Array(src.buffer);
            ; //(uint32_t *;
            const pDstBuff = new Uint32Array(src.length / 4);
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
            if (isBuffer(src)) {
                return Buffer.from(pDstBuff.buffer);
            }
            return new Uint8Array(pDstBuff.buffer);
            break;
        }
        default:
            return src;
            break;
    }
} // EmuUnswizzleBox NOPATCH
function memcpy(dest, dst_start, src, src_start, size) {
    for (let i = dst_start; i < size; i++) {
        dest[i] = src[src_start];
        src_start++;
    }
}
// Source
//https://github.com/VitaSmith/gust_tools/blob/master/gust_g1t.c#L954
/**
 * Untile image data.
 *
 * @param {Uint8Array|Buffer} src - Source data as ``Uint8Array`` or ``Buffer``. Will return the same.
 * @param {number} bytesPerBlock - Bytes per block. In compressed data it's the block size. In raw data it's the bytes per pixel.
 * @param {number} pixelBlockWidth - Pixel width of the block data. Normally 4. But in raw it's 1.
 * @param {number} pixelBlockHeigth - Pixel Heigth of the block data. Normally 4. But in raw it's 1.
 * @param {number} tileSize - Normally the "packed" width value or Math.log2(width)
 * @param {number} width - Image width size
 * @returns ``Uint8Array`` | ``Buffer``
 */
export function untile(src, bytesPerBlock, pixelBlockWidth, pixelBlockHeigth, tileSize, width) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const bytes_per_element = bytesPerBlock;
    const size = src.length;
    var tile_width = tileSize / pixelBlockWidth;
    var tile_heigth = tileSize / pixelBlockHeigth;
    width /= pixelBlockWidth;
    var temp;
    if (isBuffer(src)) {
        temp = Buffer.alloc(size);
    }
    else {
        temp = new Uint8Array(size);
    }
    for (var i = 0; i < Math.floor(size / bytes_per_element / tile_width / tile_heigth); i++) {
        var tile_row = Math.floor(i / (width / tile_width));
        var tile_column = Math.floor(i % (width / tile_heigth));
        var tile_start = Math.floor(tile_row * width * tile_width + tile_column * tile_heigth);
        for (var j = 0; j < tile_width; j++) {
            memcpy(temp, bytes_per_element * (tile_start + j * width), src, bytes_per_element * (i * tile_width * tile_heigth + j * tile_width), tile_width * bytes_per_element);
        }
    }
    return temp;
}
// "Inflate" a 32 bit value by interleaving 0 bits at odd positions.
function inflate_bits(x) {
    x &= 0x0000FFFF;
    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;
    return x;
}
// "Deflate" a 32-bit value by deinterleaving all odd bits.
function deflate_bits(x) {
    x &= 0x55555555;
    x = (x | (x >> 1)) & 0x33333333;
    x = (x | (x >> 2)) & 0x0F0F0F0F;
    x = (x | (x >> 4)) & 0x00FF00FF;
    x = (x | (x >> 8)) & 0x0000FFFF;
    return x;
}
// From two 32-bit (x,y) coordinates, compute the 64-bit Morton (or Z-order) value.
function xy_to_morton(x, y) {
    return (inflate_bits(x) << 1) | (inflate_bits(y) << 0);
}
// Fom a 32-bit Morton (Z-order) value, recover two 32-bit (x,y) coordinates.
function morton_to_xy(z, x, y) {
    x[0] = deflate_bits(z >> 1);
    y[0] = deflate_bits(z >> 0);
}
/**
 * Mortonize image data.
 *
 * @param {Uint8Array|Buffer} src - Source data as ``Uint8Array`` or ``Buffer``. Will return the same.
 * @param {number} packedBitsPerPixel - Packed bits per pixel.
 * @param {number} pixelBlockWidth - Pixel width of the block data. Normally 4. But in raw it's 1.
 * @param {number} pixelBlockHeigth - Pixel Heigth of the block data. Normally 4. But in raw it's 1.
 * @param {number} width - Image width
 * @param {number} height - Image hidth
 * @param {number} mortonOrder - Morton Order
 * @param {number} widthFactor - Normally 1 but depends on the system.
 * @returns ``Uint8Array`` | ``Buffer``
 * */
export function mortonize(src, packedBitsPerPixel, pixelBlockWidth, pixelBlockHeigth, mortonOrder, width, height, widthFactor) {
    if (!isArrayOrBuffer(src)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    //const uint32_t bits_per_element = dds_bpp(format) * dds_bwh(format) * dds_bwh(format) * wf;
    const bits_per_element = packedBitsPerPixel * pixelBlockWidth * pixelBlockHeigth * widthFactor; //aka block size
    const bytes_per_element = Math.floor(bits_per_element / 8);
    width /= pixelBlockWidth * widthFactor;
    height /= pixelBlockHeigth;
    var size = src.length;
    var num_elements = src.length / bytes_per_element;
    var k = Math.abs(mortonOrder);
    var reverse = (mortonOrder != k);
    // Only deal with elements that are multiple of one byte in size
    if (!(bits_per_element % 8 == 0)) {
        throw new Error("asset(bits_per_element % 8 == 0)");
    }
    // Validate that the size of the buffer matches the dimensions provided
    if (!(bytes_per_element * width * height == size)) {
        throw new Error("asset(bytes_per_element * width * height == size)");
    }
    // Only deal with texture that are smaller than 64k*64k
    if (!(width < 0x10000) && (height < 0x10000)) {
        throw new Error("asset((width < 0x10000) && (height < 0x10000))");
    }
    // Ensure that width and height are an exact multiple of 2^k
    if (!(width % (1 << k) == 0)) {
        throw new Error("asset(width % (1 << k) == 0)");
    }
    if (!(height % (1 << k) == 0)) {
        throw new Error("asset(height % (1 << k) == 0)");
    }
    // Ensure that we won't produce x or y that are larger than the maximum dimension
    if (!(k <= Math.log2(Math.max(width, height)))) {
        throw new Error(`assert(k <= Math.log2(Math.max(width, height))))`);
    }
    var tile_width = 1 << k;
    var tile_size = tile_width * tile_width;
    var mask = tile_size - 1;
    var tmp_buf;
    if (isBuffer(src)) {
        tmp_buf = Buffer.alloc(size);
    }
    else {
        tmp_buf = new Uint8Array(size);
    }
    for (var i = 0; i < num_elements; i++) {
        var j = new Uint32Array([0]);
        var x = new Uint32Array([0]);
        var y = new Uint32Array([0]);
        if (reverse) { // Morton value to an (x,y) pair
            // Recover (x,y) for the Morton tile
            morton_to_xy(i & mask, x, y);
            // Now apply untiling by offsetting (x,y) with the tile positiom
            x[0] += ((i / tile_size) % (width / tile_width)) * tile_width;
            y[0] += ((i / tile_size) / (width / tile_width)) * tile_width;
            j[0] = y[0] * width + x[0];
        }
        else { // Morton value from an (x,y) pair
            x[0] = i % width;
            y[0] = i / width;
            j[0] = xy_to_morton(x[0], y[0]) & mask;
            // Now, apply tiling. This is accomplished by offseting our value
            // with the current tile position multiplied by the tile size.
            j[0] += ((y[0] / tile_width) * (width / tile_width) + (x[0] / tile_width)) * tile_size;
        }
        if (!(j[0] < num_elements)) {
            throw new Error("asset(j < num_elements)");
        }
        memcpy(tmp_buf, j[0] * bytes_per_element, src, i * bytes_per_element, bytes_per_element);
    }
    return tmp_buf;
}
//# sourceMappingURL=unswizzling.js.map