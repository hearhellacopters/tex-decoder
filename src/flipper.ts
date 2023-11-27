function isBuffer(obj: Buffer | Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function arraybuffcheck(obj: Buffer | Uint8Array): boolean {
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
export function flipImage(src: Buffer | Uint8Array, width: number, height: number, is24?: boolean): Buffer | Uint8Array {
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
 * Image cropper.
 * 
 * @param {Buffer | Uint8Array} src - Source data as a Uint8Array or Buffer.
 * @param {number} width - New image width
 * @param {number} height - New image height
 * @param {number} srcBitsPerPixel - bits per pixel of source data
 * @returns {Buffer | Uint8Array}
 */
export function cropImage(src: Buffer | Uint8Array, width: number, height: number, srcBitsPerPixel: number): Buffer | Uint8Array {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer")
    }

    // Assuming each pixel is represented by 'bitsPerPixel' bits

    // Calculate the total size of the original image
    const originalWidth = src.length / (height * srcBitsPerPixel);
    const originalHeight = src.length / (width * srcBitsPerPixel);

    // Calculate the starting position for the crop
    const startX = Math.floor((originalWidth - width) / 2);
    const startY = Math.floor((originalHeight - height) / 2);

    // Create a new Uint8Array to store the cropped image data
    var croppedData: Buffer | Uint8Array;
    if (isBuffer(src)) {
        croppedData = Buffer.alloc(width * height * srcBitsPerPixel);
    } else {
        croppedData = new Uint8Array(width * height * srcBitsPerPixel);
    }

    // Copy the cropped portion from the source to the new array
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = ((startY + y) * originalWidth + (startX + x)) * srcBitsPerPixel;
            const destIndex = (y * width + x) * srcBitsPerPixel;

            // Copy 'bitsPerPixel' bytes for each pixel
            croppedData.set(src.subarray(sourceIndex, sourceIndex + srcBitsPerPixel), destIndex);
        }
    }

    return croppedData;
}