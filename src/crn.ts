//Better source for later upgrade
//https://docs.rs/crnlib/0.1.1/crnlib/index.html

import {Module} from "./crn-O2.js";

type Module = {
    _malloc: Function,
    _crn_get_width:Function,
    _crn_get_height:Function,
    _crn_get_levels:Function,
    _crn_get_dxt_format:Function,
    _crn_get_uncompressed_size:Function,
    _crn_decompress:Function,
    arrayBufferCopy:Function,
    HEAP8: Int8Array,
    HEAP16: Int16Array,
    _free:Function,
    print: Function,
    printErr: Function|undefined,
    read: Function,
    load: Function,
    arguments: any[],
    setValue: Function,
    getValue: Function,
    ALLOC_NORMAL: number,
    ALLOC_STACK: number,
    ALLOC_STATIC: number,
    allocate: Function,
    Pointer_stringify: Function,
    Array_stringify: Function,
    Array_copy: Function,
    TypedArray_copy: Function,
    String_len: Function,
    String_copy: Function,
    intArrayFromString: Function,
    intArrayToString: Function,
    writeStringToMemory: Function,
    writeArrayToMemory: Function
    _main: Function,
    FUNCTION_TABLE: any,
    setStatus: any,
    preRun: any,
    postRun: any,
    run: Function,
    TOTAL_STACK: any,
    TOTAL_MEMORY: any,
    HEAP: any,
    HEAP32: any,
    HEAPU8: any,
    HEAPU16: any,
    HEAPU32: any,
    HEAPF32: any,
    HEAPF64: any,
    ccall:any,
    cwrap:any,
    stdin:any,
    stdout:any,
    stderr:any,
    noFSInit:any,
    noExitRuntime:any,
    noInitialRun:any,
    monitorRunDependencies:any,
}

const CRN_FORMATS: any = {
    0: "cCRNFmtDXT1",
    // cCRNFmtDXT3 is not currently supported when writing to CRN - only DDS.
    1: "cCRNFmtDXT3",
    2: "cCRNFmtDXT5",
    // Various DXT5 derivatives
    3: "cCRNFmtDXT5_CCxY",    // Luma-chroma
    4: "cCRNFmtDXT5_xGxR",    // Swizzled 2-component
    5: "cCRNFmtDXT5_xGBR",    // Swizzled 3-component
    6: "cCRNFmtDXT5_AGBR",    // Swizzled 4-component
    // ATI 3DC and X360 DXN
    7: "cCRNFmtDXN_XY",
    8: "cCRNFmtDXN_YX",
    // DXT5 alpha blocks only
    9: "cCRNFmtDXT5A",
    10: "cCRNFmtETC1",
	11: "cCRNFmtETC2",
	12: "cCRNFmtETC2A",
	13: "cCRNFmtETC1S",
	14: "cCRNFmtETC2AS",
	15: "cCRNFmtTotal"
}

/**
 * All possible CRN formats.
 */
export const CRN_FORMAT: any = {
    "cCRNFmtDXT1":      0,
    // cCRNFmtDXT3 is not currently supported when writing to CRN - only DDS.
    "cCRNFmtDXT3":      1,
    "cCRNFmtDXT5":      2,
    // Various DXT5 derivatives
    "cCRNFmtDXT5_CCxY": 3,    // Luma-chroma
    "cCRNFmtDXT5_xGxR": 4,    // Swizzled 2-component
    "cCRNFmtDXT5_xGBR": 5,    // Swizzled 3-component
    "cCRNFmtDXT5_AGBR": 6,    // Swizzled 4-component
    // ATI 3DC and X360 DXN
    "cCRNFmtDXN_XY":    7,
    "cCRNFmtDXN_YX":    8,
    // DXT5 alpha blocks only
    "cCRNFmtDXT5A":     9,
    "cCRNFmtETC1":      10,
	"cCRNFmtETC2":      11,
	"cCRNFmtETC2A":     12,
	"cCRNFmtETC1S":     13,
	"cCRNFmtETC2AS":    14,
	"cCRNFmtTotal":     15
}

function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}


function arraybuffcheck(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

/**
 * Checks the crunched data for the returned texture format of the uncrunched data 
 * 
 * Must be vaild .crn file format
 * Check binary template here:
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Buffer|Uint8Array} crndata - Source data as ```Buffer``` or ```Uint8Array```
 * @returns CRN_FORMAT string
 */
export function getCRNFormat(crndata:Buffer|Uint8Array):string{
    if(!arraybuffcheck(crndata)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}
    const srcSize = crndata.byteLength;
    const src = Module._malloc(srcSize);
    Module.arrayBufferCopy(crndata, Module.HEAPU8, src, srcSize);
    const format = Module._crn_get_dxt_format(src, srcSize) as number;
    Module._free(src);
    return CRN_FORMATS[format] || "cCRNFmtInvalid"
}

/**
 * Checks the crunched data for the returned texture height
 * 
 * Must be vaild .crn file format
 * Check binary template here:
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Buffer|Uint8Array} crndata - Source data as ```Buffer``` or ```Uint8Array```
 * @returns number
 */
export function getCRNHeight(crndata:Buffer|Uint8Array):number{
    if(!arraybuffcheck(crndata)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}
    const srcSize = crndata.byteLength;
    const src = Module._malloc(srcSize);
    Module.arrayBufferCopy(crndata, Module.HEAPU8, src, srcSize);
    const height = Module._crn_get_height(src, srcSize);
    Module._free(src);
    return height
}

/**
 * Checks the crunched data for its texture mip levels
 * 
 * Must be vaild .crn file format
 * Check binary template here:
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Buffer|Uint8Array} crndata - Source data as ```Buffer``` or ```Uint8Array```
 * @returns number
 */
export function getCRNLevels(crndata:Buffer|Uint8Array):number{
    if(!arraybuffcheck(crndata)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}
    const srcSize = crndata.byteLength;
    const src = Module._malloc(srcSize);
    Module.arrayBufferCopy(crndata, Module.HEAPU8, src, srcSize);
    const levels = Module._crn_get_levels(src, srcSize);
    Module._free(src);
    return levels
}

/**
 * Checks the crunched data for the returned texture width
 * 
 * Must be vaild .crn file format
 * Check binary template here:
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Buffer|Uint8Array} crndata - Source data as ```Buffer``` or ```Uint8Array```
 * @returns number
 */
export function getCRNWidth(crndata:Buffer|Uint8Array):number{
    if(!arraybuffcheck(crndata)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}
    const srcSize = crndata.byteLength;
    const src = Module._malloc(srcSize);
    Module.arrayBufferCopy(crndata, Module.HEAPU8, src, srcSize);
    const width = Module._crn_get_width(src, srcSize);
    Module._free(src);
    return width
}

/**
 * Uncrunches crunched texture data.
 * 
 * First run this function to get the returned texture format.
 * ```javascript
 * getCRNFormat(src)
 * ``` 
 * Must be vaild .crn file format
 * Check binary template here:
 * https://www.sweetscape.com/010editor/repository/files/CRN.bt
 * 
 * @param {Buffer|Uint8Array} crndata - Source data as ```Buffer``` or ```Uint8Array```
 * @returns ```Buffer``` or ```Uint8Array```
 */
export function unCRN(crndata:Buffer|Uint8Array):Buffer|Uint8Array{
    if(!arraybuffcheck(crndata)){
		throw new Error(`Source data must be Uint8Array or Buffer`)
	}
    const srcSize = crndata.length
    const src = Module._malloc(srcSize);
    const bytes = new Uint8Array(crndata);
    Module.arrayBufferCopy(bytes, Module.HEAPU8, src, srcSize);
    const dstSize = Module._crn_get_uncompressed_size(src, srcSize);
    const dst = Module._malloc(dstSize);
    Module._crn_decompress(src, srcSize, dst, dstSize);
    const dxtData = new Uint8Array(Module.HEAPU8.buffer, dst, dstSize);
    Module._free(src);
    Module._free(dst);
    if(isBuffer(crndata)){
        return Buffer.from(dxtData)
    }
    return dxtData
}