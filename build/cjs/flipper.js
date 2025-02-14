"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cropImage = exports.flipImage = void 0;
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
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
function flipImage(src, width, height, is24) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const output = isBuffer(src) ? Buffer.alloc(src.length) : new Uint8Array(src.length);
    var z = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var pos = (x + (height - y - 1) * width) << 2;
            output[pos + 0] = src[z + 0] & 0xFF;
            output[pos + 1] = src[z + 1] & 0xFF;
            output[pos + 2] = src[z + 2] & 0xFF;
            if (is24) {
                z += 3;
            }
            else {
                output[pos + 3] = src[z + 3] & 0xFF;
                z += 4;
            }
        }
    }
    return output;
}
exports.flipImage = flipImage;
/**
 * Image cropper.
 *
 * @param {Buffer | Uint8Array} src - Source data as a Uint8Array or Buffer.
 * @param {number} current_width - New image width
 * @param {number} current_height - New image height
 * @param {number} bytesPerPixel - bytes per pixel of source data
 * @param {number} startX - starting width pixel to crop
 * @param {number} startY - starting height pixel to crop
 * @param {number} cropped_width - new width
 * @param {number} cropped_height - new height
 * @returns {Buffer | Uint8Array}
 */
function cropImage(src, current_width, current_height, bytesPerPixel, startX = 0, startY = 0, cropped_width, cropped_height) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    if (startX + cropped_width > current_width || startY + cropped_height > current_height) {
        throw new Error("Crop dimensions exceed original image size.");
    }
    if (src.length !== current_width * current_height * bytesPerPixel) {
        throw new Error("Invalid raw data size for given width, height, and bytes per pixel.");
    }
    // Allocate buffer for cropped image
    var croppedData;
    if (isBuffer(src)) {
        croppedData = Buffer.alloc(cropped_width * cropped_height * bytesPerPixel);
    }
    else {
        croppedData = new Uint8Array(cropped_width * cropped_height * bytesPerPixel);
    }
    // Iterate through the cropped area
    for (let y = 0; y < cropped_height; y++) {
        for (let x = 0; x < cropped_width; x++) {
            const sourceIndex = ((startY + y) * current_width + (startX + x)) * bytesPerPixel;
            const destIndex = (y * cropped_width + x) * bytesPerPixel;
            // Copy all color channels (depends on bytesPerPixel)
            for (let b = 0; b < bytesPerPixel; b++) {
                croppedData[destIndex + b] = src[sourceIndex + b];
            }
        }
    }
    return croppedData;
}
exports.cropImage = cropImage;
//# sourceMappingURL=flipper.js.map