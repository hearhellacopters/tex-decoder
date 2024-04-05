"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ungzip = exports.inflateRaw = exports.inflate = exports.Inflate = exports.gzip = exports.deflateRaw = exports.deflate = exports.Deflate = void 0;
const zlib_deflate = __importStar(require("./deflate"));
const zlib_inflate = __importStar(require("./inflate"));
function assign(obj, ...sources) {
    while (sources.length) {
        const source = sources.shift();
        if (!source) {
            continue;
        }
        if (typeof source !== 'object') {
            throw new TypeError(source + 'must be non-object');
        }
        for (const p in source) {
            if (Object.prototype.hasOwnProperty.call(source, p)) {
                obj[p] = source[p];
            }
        }
    }
    return obj;
}
;
function flattenChunks(chunks) {
    // calculate data length
    let len = 0;
    for (let i = 0, l = chunks.length; i < l; i++) {
        len += chunks[i].length;
    }
    // join chunks
    const result = new Uint8Array(len);
    for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
        let chunk = chunks[i];
        result.set(chunk, pos);
        pos += chunk.length;
    }
    return result;
}
;
const utils = {
    assign,
    flattenChunks
};
const strings = __importStar(require("./strings"));
const messages_1 = require("./messages");
const zstream_1 = require("./zstream");
const gzheader_1 = require("./gzheader");
const toString = Object.prototype.toString;
/* Public constants ==========================================================*/
/* ===========================================================================*/
//@FixImport
const constants_1 = require("./constants");
const { Z_NO_FLUSH, Z_SYNC_FLUSH, Z_FULL_FLUSH, Z_FINISH, Z_OK, Z_STREAM_END, Z_NEED_DICT, Z_STREAM_ERROR, Z_DATA_ERROR, Z_MEM_ERROR, Z_DEFAULT_COMPRESSION, Z_DEFAULT_STRATEGY, Z_DEFLATED } = constants_1.constants;
/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * const zlib = require('deflate')
 *   , chunk1 = new Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = new Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * const deflate = new zlib.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 * @param {options} options - options
 **/
class Deflate {
    constructor(options) {
        this.options = utils.assign({
            level: Z_DEFAULT_COMPRESSION,
            method: Z_DEFLATED,
            chunkSize: 16384,
            windowBits: 15,
            memLevel: 8,
            strategy: Z_DEFAULT_STRATEGY
        }, options || {});
        let opt = this.options;
        if (opt.raw && (opt.windowBits > 0)) {
            opt.windowBits = -opt.windowBits;
        }
        else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
            opt.windowBits += 16;
        }
        this.err = 0; // error code, if happens (0 = Z_OK)
        this.msg = ''; // error message
        this.ended = false; // used to avoid multiple onEnd() calls
        this.chunks = []; // chunks of compressed data
        this.strm = new zstream_1.ZStream();
        this.strm.avail_out = 0;
        let status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
        if (status !== Z_OK) {
            throw new Error(messages_1.msg[status]);
        }
        if (opt.header) {
            zlib_deflate.deflateSetHeader(this.strm, opt.header);
        }
        if (opt.dictionary) {
            let dict;
            // Convert data if needed
            if (typeof opt.dictionary === 'string') {
                // If we need to compress text, change encoding to utf8.
                dict = strings.string2buf(opt.dictionary);
            }
            else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
                dict = new Uint8Array(opt.dictionary);
            }
            else {
                dict = opt.dictionary;
            }
            status = zlib_deflate.deflateSetDictionary(this.strm, dict);
            if (status !== Z_OK) {
                throw new Error(messages_1.msg[status]);
            }
            this._dict_set = true;
        }
    }
    /**
     * Deflate#push(data[, flush_mode]) -> Boolean
     * - data (Uint8Array|ArrayBuffer|String): input data. Strings will be
     *   converted to utf8 byte sequence.
     * - flush_mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
     *
     * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
     * new compressed chunks. Returns `true` on success. The last data block must
     * have `flush_mode` Z_FINISH (or `true`). That will flush internal pending
     * buffers and call [[Deflate#onEnd]].
     *
     * On fail call [[Deflate#onEnd]] with error code and return false.
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     * @param {Uint8Array|Buffer} data - source chunk
     * @param {boolean|number} flush_mode - `true` for finished
     **/
    push(data, flush_mode) {
        const strm = this.strm;
        const chunkSize = this.options.chunkSize;
        let status, _flush_mode;
        if (this.ended) {
            return false;
        }
        if (flush_mode === ~~flush_mode)
            _flush_mode = flush_mode;
        else
            _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
        // Convert data if needed
        if (typeof data === 'string') {
            // If we need to compress text, change encoding to utf8.
            strm.input = strings.string2buf(data);
        }
        else if (toString.call(data) === '[object ArrayBuffer]') {
            strm.input = new Uint8Array(data);
        }
        else {
            strm.input = data;
        }
        strm.next_in = 0;
        strm.avail_in = strm.input.length;
        for (;;) {
            if (strm.avail_out === 0) {
                strm.output = new Uint8Array(chunkSize);
                strm.next_out = 0;
                strm.avail_out = chunkSize;
            }
            // Make sure avail_out > 6 to avoid repeating markers
            if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
                this.onData(strm.output.subarray(0, strm.next_out));
                strm.avail_out = 0;
                continue;
            }
            status = zlib_deflate.deflate(strm, _flush_mode);
            // Ended => flush and finish
            if (status === Z_STREAM_END) {
                if (strm.next_out > 0) {
                    this.onData(strm.output.subarray(0, strm.next_out));
                }
                status = zlib_deflate.deflateEnd(this.strm);
                this.onEnd(status);
                this.ended = true;
                return status === Z_OK;
            }
            // Flush if out buffer full
            if (strm.avail_out === 0) {
                this.onData(strm.output);
                continue;
            }
            // Flush if requested and has data
            if (_flush_mode > 0 && strm.next_out > 0) {
                this.onData(strm.output.subarray(0, strm.next_out));
                strm.avail_out = 0;
                continue;
            }
            if (strm.avail_in === 0)
                break;
        }
        return true;
    }
    ;
    /**
     * Deflate#onData(chunk) -> Void
     * - chunk (Uint8Array): output data.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     * @param {Uint8Array|Buffer} chunk - source data
     **/
    onData(chunk) {
        this.chunks.push(chunk);
    }
    ;
    /**
     * Deflate#onEnd(status) -> Void
     * - status (Number): deflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called once after you tell deflate that the input stream is
     * complete (Z_FINISH). By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    onEnd(status) {
        // On success - join
        if (status === Z_OK) {
            this.result = utils.flattenChunks(this.chunks);
        }
        this.chunks = [];
        this.err = status;
        this.msg = this.strm.msg;
    }
    ;
}
exports.Deflate = Deflate;
/**
 * deflate(data[, options]) -> Uint8Array
 * - data (Uint8Array|ArrayBuffer|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate algorithm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 * - dictionary
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 *
 * ##### Example:
 *
 * ```javascript
 * const zlib = require('deflate')
 * const data = new Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(zlib.deflate(data));
 * ```
 * @param {Buffer|Uint8Array} input - Input data
 * @param {options} options - options
 **/
function deflate(input, options) {
    const deflator = new Deflate(options);
    deflator.push(input, true);
    // That will never happens, if you don't cheat with options :)
    if (deflator.err) {
        throw deflator.msg || messages_1.msg[deflator.err];
    }
    return deflator.result;
}
exports.deflate = deflate;
/**
 * deflateRaw(data[, options]) -> Uint8Array
 * - data (Uint8Array|ArrayBuffer|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 * @param {Buffer|Uint8Array} input - Input data
 * @param {options} options - options
 **/
function deflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return deflate(input, options);
}
exports.deflateRaw = deflateRaw;
/**
 * gzip(data[, options]) -> Uint8Array
 * - data (Uint8Array|ArrayBuffer|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 * @param {Buffer|Uint8Array} input - Input data
 * @param {options} options - options
 **/
function gzip(input, options) {
    options = options || {};
    options.gzip = true;
    return deflate(input, options);
}
exports.gzip = gzip;
/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/
/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overridden.
 **/
/**
 * Inflate.result -> Uint8Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param).
 **/
/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/
/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/
/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * const zlib = require('deflate')
 * const chunk1 = new Uint8Array([1,2,3,4,5,6,7,8,9])
 * const chunk2 = new Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * const inflate = new zlib.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 * @param {options} options - options
 **/
class Inflate {
    constructor(options) {
        this.options = utils.assign({
            chunkSize: 1024 * 64,
            windowBits: 15,
            to: ''
        }, options || {});
        const opt = this.options;
        // Force window size for `raw` data, if not set directly,
        // because we have no header for autodetect.
        if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
            opt.windowBits = -opt.windowBits;
            if (opt.windowBits === 0) {
                opt.windowBits = -15;
            }
        }
        // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
        if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
            !(options && options.windowBits)) {
            opt.windowBits += 32;
        }
        // Gzip header has no info about windows size, we can do autodetect only
        // for deflate. So, if window size not set, force it to max when gzip possible
        if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
            // bit 3 (16) -> gzipped data
            // bit 4 (32) -> autodetect gzip/deflate
            if ((opt.windowBits & 15) === 0) {
                opt.windowBits |= 15;
            }
        }
        this.err = 0; // error code, if happens (0 = Z_OK)
        this.msg = ''; // error message
        this.ended = false; // used to avoid multiple onEnd() calls
        this.chunks = []; // chunks of compressed data
        this.strm = new zstream_1.ZStream();
        this.strm.avail_out = 0;
        let status = zlib_inflate.inflateInit2(this.strm, opt.windowBits);
        if (status !== Z_OK) {
            throw new Error(messages_1.msg[status]);
        }
        this.header = new gzheader_1.GZheader();
        zlib_inflate.inflateGetHeader(this.strm, this.header);
        // Setup dictionary
        if (opt.dictionary) {
            // Convert data if needed
            if (typeof opt.dictionary === 'string') {
                opt.dictionary = strings.string2buf(opt.dictionary);
            }
            else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
                opt.dictionary = new Uint8Array(opt.dictionary);
            }
            if (opt.raw) { //In raw mode we need to set the dictionary early
                status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
                if (status !== Z_OK) {
                    throw new Error(messages_1.msg[status]);
                }
            }
        }
    }
    /**
     * Inflate#push(data[, flush_mode]) -> Boolean
     * - data (Uint8Array|ArrayBuffer): input data
     * - flush_mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE
     *   flush modes. See constants. Skipped or `false` means Z_NO_FLUSH,
     *   `true` means Z_FINISH.
     *
     * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
     * new output chunks. Returns `true` on success. If end of stream detected,
     * [[Inflate#onEnd]] will be called.
     *
     * `flush_mode` is not needed for normal operation, because end of stream
     * detected automatically. You may try to use it for advanced things, but
     * this functionality was not tested.
     *
     * On fail call [[Inflate#onEnd]] with error code and return false.
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     * @param {Buffer|Uint8Array} data - input
     * @param {boolean} flush_mode - `true` for finished
     **/
    push(data, flush_mode) {
        const strm = this.strm;
        const chunkSize = this.options.chunkSize;
        const dictionary = this.options.dictionary;
        let status, _flush_mode, last_avail_out;
        if (this.ended)
            return false;
        if (flush_mode === ~~flush_mode)
            _flush_mode = flush_mode;
        else
            _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
        // Convert data if needed
        if (toString.call(data) === '[object ArrayBuffer]') {
            strm.input = new Uint8Array(data);
        }
        else {
            strm.input = data;
        }
        strm.next_in = 0;
        strm.avail_in = strm.input.length;
        for (;;) {
            if (strm.avail_out === 0) {
                strm.output = new Uint8Array(chunkSize);
                strm.next_out = 0;
                strm.avail_out = chunkSize;
            }
            status = zlib_inflate.inflate(strm, _flush_mode);
            if (status === Z_NEED_DICT && dictionary) {
                status = zlib_inflate.inflateSetDictionary(strm, dictionary);
                if (status === Z_OK) {
                    status = zlib_inflate.inflate(strm, _flush_mode);
                }
                else if (status === Z_DATA_ERROR) {
                    // Replace code with more verbose
                    status = Z_NEED_DICT;
                }
            }
            // Skip snyc markers if more data follows and not raw mode
            while (strm.avail_in > 0 &&
                status === Z_STREAM_END &&
                strm.state.wrap > 0 &&
                data[strm.next_in] !== 0) {
                zlib_inflate.inflateReset(strm);
                status = zlib_inflate.inflate(strm, _flush_mode);
            }
            switch (status) {
                case Z_STREAM_ERROR:
                case Z_DATA_ERROR:
                case Z_NEED_DICT:
                case Z_MEM_ERROR:
                    this.onEnd(status);
                    this.ended = true;
                    return false;
            }
            // Remember real `avail_out` value, because we may patch out buffer content
            // to align utf8 strings boundaries.
            last_avail_out = strm.avail_out;
            if (strm.next_out) {
                if (strm.avail_out === 0 || status === Z_STREAM_END) {
                    if (this.options.to === 'string') {
                        let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
                        let tail = strm.next_out - next_out_utf8;
                        let utf8str = strings.buf2string(strm.output, next_out_utf8);
                        // move tail & realign counters
                        strm.next_out = tail;
                        strm.avail_out = chunkSize - tail;
                        if (tail)
                            strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
                        this.onData(utf8str);
                    }
                    else {
                        this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
                    }
                }
            }
            // Must repeat iteration if out buffer is full
            if (status === Z_OK && last_avail_out === 0)
                continue;
            // Finalize if end of stream reached.
            if (status === Z_STREAM_END) {
                status = zlib_inflate.inflateEnd(this.strm);
                this.onEnd(status);
                this.ended = true;
                return true;
            }
            if (strm.avail_in === 0)
                break;
        }
        return true;
    }
    ;
    /**
     * Inflate#onData(chunk) -> Void
     * - chunk (Uint8Array|String): output data. When string output requested,
     *   each chunk will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    onData(chunk) {
        this.chunks.push(chunk);
    }
    ;
    /**
     * Inflate#onEnd(status) -> Void
     * - status (Number): inflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called either after you tell inflate that the input stream is
     * complete (Z_FINISH). By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    onEnd(status) {
        // On success - join
        if (status === Z_OK) {
            if (this.options.to === 'string') {
                this.result = this.chunks.join('');
            }
            else {
                this.result = utils.flattenChunks(this.chunks);
            }
        }
        this.chunks = [];
        this.err = status;
        this.msg = this.strm.msg;
    }
    ;
}
exports.Inflate = Inflate;
/**
 * inflate(data[, options]) -> Uint8Array|String
 * - data (Uint8Array|ArrayBuffer): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * const zlib = require('deflate');
 * const input = zlib.deflate(new Uint8Array([1,2,3,4,5,6,7,8,9]));
 * let output;
 *
 * try {
 *   output = zlib.inflate(input);
 * } catch (err) {
 *   console.log(err);
 * }
 * ```
 **/
function inflate(input, options) {
    const inflator = new Inflate(options);
    inflator.push(input, true);
    // That will never happens, if you don't cheat with options :)
    if (inflator.err)
        throw inflator.msg || messages_1.msg[inflator.err];
    return inflator.result;
}
exports.inflate = inflate;
/**
 * inflateRaw(data[, options]) -> Uint8Array|String
 * - data (Uint8Array|ArrayBuffer): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return inflate(input, options);
}
exports.inflateRaw = inflateRaw;
/**
 * ungzip(data[, options]) -> Uint8Array|String
 * - data (Uint8Array|ArrayBuffer): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/
function ungzip(input, options) {
    options = options || {};
    return inflate(input, options);
}
exports.ungzip = ungzip;
