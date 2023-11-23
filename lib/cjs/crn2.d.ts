/// <reference types="node" />
/**
 * Checks the crunched data and returns width, height, mipmaps, faces and format of compressed data.
 *
 * Must be vaild .crn file format.
 *
 * Check binary template here:
 *
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 *
 * @param crndata - Source data as ``Buffer`` or ``Uint8Array``
 * @param mipmap_level - mip level data to return (defaults to index 0 AKA largest image)
 * @returns {object} image metadata
 */
export declare function getCRNMeta(data: Uint8Array | Buffer, mipmap_level?: number): {
    width: number;
    height: number;
    mipmaps: number;
    faces: number;
    format: string;
};
/**
 * Uncrunches crunched texture data. Will decode based on packed format or you can return compressed format data (default false).
 *
 * Must be vaild .crn file format.
 *
 * Before using, run getCRNMeta to get the image meta data:
 *
 * ```javascript
 * const crnMETA = getCRNMeta(crnData);
 * crnMETA.format  //DXT1/3/5/n
 * crnMETA.width   //size
 * crnMETA.height  //size
 * crnMETA.mipmaps //number of packed images
 * crnMETA.faces   //face number
 * ```
 *
 * Check binary template here:
 *
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 *
 * @param {Uint8Array | Buffer} data - Source data as ``Buffer`` or ``Uint8Array``
 * @param {number} mipmap_level - mip level to decode (defaults to index 0 AKA largest image).
 * @param {boolean} keepCompressed - Returns formated data (doesn't decode to RGBA) default false.
 * @returns uncrunched data
 */
export declare function decodeCRN(data: Uint8Array | Buffer, mipmap_level?: number, keepCompressed?: boolean): Uint8Array | Buffer;
//# sourceMappingURL=crn2.d.ts.map