/// <reference types="node" />
import { ZStream } from './zstream.js';
import { GZheader } from './gzheader.js';
type options = {
    level: number;
    windowBits: number;
    memLevel: number;
    strategy: number;
    dictionary: Uint8Array;
    chunkSize: number;
    raw: boolean;
    gzip: boolean;
    method: number;
    header: GZheader;
    to: string;
};
type options_assigned = {
    level?: number;
    windowBits?: number;
    memLevel?: number;
    strategy?: number;
    dictionary?: Uint8Array;
    chunkSize?: number;
    raw?: boolean;
    gzip?: boolean;
    method?: number;
    header?: GZheader;
    to?: string;
};
export declare class Deflate {
    options: options;
    err: number;
    msg: string;
    ended: boolean | number;
    chunks: Uint8Array[];
    strm: ZStream;
    _dict_set: boolean | undefined;
    result: Buffer | Uint8Array | undefined;
    constructor(options?: options_assigned);
    push(data: Uint8Array | Buffer, flush_mode: boolean | number): boolean;
    onData(chunk: Uint8Array | Buffer): void;
    onEnd(status: number): void;
}
export declare function deflate(input: Buffer | Uint8Array, options?: options_assigned): Uint8Array | Buffer | undefined;
export declare function deflateRaw(input: Buffer | Uint8Array, options?: options_assigned): Uint8Array | Buffer | undefined;
export declare function gzip(input: Buffer | Uint8Array, options?: options_assigned): Uint8Array | Buffer | undefined;
export declare class Inflate {
    options: options;
    err: number;
    msg: string;
    ended: boolean | number;
    chunks: Uint8Array[];
    strm: ZStream;
    _dict_set: boolean | undefined;
    result: Buffer | Uint8Array | string | undefined;
    header: GZheader;
    constructor(options?: options_assigned);
    push(data: Buffer | Uint8Array, flush_mode: number | boolean): boolean;
    onData(chunk: Buffer | Uint8Array | string): void;
    onEnd(status: number): void;
}
export declare function inflate(input: Buffer | Uint8Array | string, options?: options_assigned): string | Uint8Array | Buffer | undefined;
export declare function inflateRaw(input: Buffer | Uint8Array | string, options?: options_assigned): string | Uint8Array | Buffer | undefined;
export declare function ungzip(input: Buffer | Uint8Array | string, options?: options_assigned): string | Uint8Array | Buffer | undefined;
export {};
//# sourceMappingURL=index.d.ts.map