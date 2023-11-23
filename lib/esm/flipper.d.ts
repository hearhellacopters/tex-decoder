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
//# sourceMappingURL=flipper.d.ts.map