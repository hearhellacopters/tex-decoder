/// <reference types="node" />
export declare function getCRNMeta(src: Uint8Array | Buffer, mipmap_level?: number): {
    width: number;
    height: number;
    mipmaps: number;
    faces: number;
    format: string;
};
export declare function decodeCRN(src: Uint8Array | Buffer, mipmap_level?: number, keepCompressed?: boolean): Uint8Array | Buffer;
//# sourceMappingURL=crn2.d.ts.map