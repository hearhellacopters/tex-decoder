export declare class GZheader {
    text: number;
    time: number;
    xflags: number;
    os: number;
    extra: Uint8Array;
    extra_len: number;
    name: string;
    comment: string;
    hcrc: number;
    done: boolean;
    constructor();
}
