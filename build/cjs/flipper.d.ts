/// <reference types="node" />
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
export declare function flipImage(src: Buffer | Uint8Array, width: number, height: number, is24?: boolean): Buffer | Uint8Array;
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
export declare function cropImage(src: Buffer | Uint8Array, current_width: number, current_height: number, bytesPerPixel: number, startX: number | undefined, startY: number | undefined, cropped_width: number, cropped_height: number): Buffer | Uint8Array;
//# sourceMappingURL=flipper.d.ts.map