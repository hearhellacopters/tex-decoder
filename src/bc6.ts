//source 
//https://docs.rs/texture2ddecoder/latest/src/texture2ddecoder/bcn/bc6.rs.html

import {bireader} from 'bireader'

type bool = boolean;
type usize = number;
type u8 = number;
type u16 = number;
type f32 = number;
type BitReader = bireader;

function color(r:number, g:number, b:number, a:number):number {
    return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF))>>> 0
}

const S_BPTC_A2 = new Uint32Array([
    15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 8, 2, 2, 8, 8, 15, 2, 8,
    2, 2, 8, 8, 2, 2, 15, 15, 6, 8, 2, 8, 15, 15, 2, 8, 2, 2, 2, 15, 15, 6, 6, 2, 6, 8, 15, 15, 2,
    2, 15, 15, 15, 15, 15, 2, 2, 15,
]);

const S_BPTC_FACTORS: Uint8Array[] = [
    new Uint8Array([0, 21, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 9, 18, 27, 37, 46, 55, 64, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8Array([0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64]),
];

const S_BPTC_P2 = new Uint32Array([
    0xcccc, 0x8888, 0xeeee, 0xecc8, 
    0xc880, 0xfeec, 0xfec8, 0xec80, 
    0xc800, 0xffec, 0xfe80, 0xe800, 
    0xffe8, 0xff00, 0xfff0, 0xf000, 
    0xf710, 0x008e, 0x7100, 0x08ce, 
    0x008c, 0x7310, 0x3100, 0x8cce, 
    0x088c, 0x3110, 0x6666, 0x366c, 
    0x17e8, 0x0ff0, 0x718e, 0x399c, 
    0xaaaa, 0xf0f0, 0x5a5a, 0x33cc, 
    0x3c3c, 0x55aa, 0x9696, 0xa55a, 
    0x73ce, 0x13c8, 0x324c, 0x3bdc, 
    0x6996, 0xc33c, 0x9966, 0x0660, 
    0x0272, 0x04e4, 0x4e40, 0x2720, 
    0xc936, 0x936c, 0x39c6, 0x639c, 
    0x9336, 0x9cc6, 0x817e, 0xe718, 
    0xccf0, 0x0fcc, 0x7744, 0xee22, 
]);

type Bc6hModeInfo = {
    transformed: bool,
    partition_bits: usize,
    endpoint_bits: usize,
    delta_bits: Uint32Array,
}

const S_BC6H_MODE_INFO: Bc6hModeInfo[] = [
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 10,
        delta_bits: new Uint32Array([5, 5, 5]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 7,
        delta_bits: new Uint32Array([6, 6, 6]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([5, 4, 4]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 10,
        delta_bits: new Uint32Array([10, 10, 10]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([4, 5, 4]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([9, 9, 9]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 11,
        delta_bits: new Uint32Array([4, 4, 5]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 12,
        delta_bits: new Uint32Array([8, 8, 8]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 9,
        delta_bits: new Uint32Array([5, 5, 5]),
    },
    {
        transformed: true,
        partition_bits: 0,
        endpoint_bits: 16,
        delta_bits: new Uint32Array([4, 4, 4]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([6, 5, 5]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([5, 6, 5]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: true,
        partition_bits: 5,
        endpoint_bits: 8,
        delta_bits: new Uint32Array([5, 5, 6]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
    {
        transformed: false,
        partition_bits: 5,
        endpoint_bits: 6,
        delta_bits: new Uint32Array([6, 6, 6]),
    },
    {
        transformed: false,
        partition_bits: 0,
        endpoint_bits: 0,
        delta_bits: new Uint32Array([0, 0, 0]),
    },
];

function unquantize(value: u16, _signed: bool, _endpoint_bits: usize): u16 {
    var _value = value;
    let max_value: u16 = 1 << (_endpoint_bits - 1);

    if (_signed) {
        if (_endpoint_bits >= 16) {
            return _value;
        }

        var sign: bool = (_value & 0x8000) != 0;
        _value = _value & 0x7fff;

        let unq: u16;

        if (0 == _value) {
            unq = 0;
        } else if (_value >= max_value - 1) {
            unq = 0x7fff;
        } else {
            unq = ((((_value) << 15) + 0x4000) >> (_endpoint_bits - 1)) 
        }

        return sign ? 65535 - unq + 1 : unq;
    }

    if (_endpoint_bits >= 15) {
        return _value;
    }

    if (0 == _value) {
        return 0;
    }

    if (_value == max_value) {
        return 65535;
    }

    return ((((_value) << 15) + 0x4000) >> (_endpoint_bits - 1))
}

function finish_unquantize(_value: u16, _signed: bool): u16 {
    if (_signed) {
        let sign: u16 = _value & 0x8000;
        return (((_value & 0x7fff) * 31) >> 5) | sign
    } else {
        return ((_value * 31) >> 6)
    }
}

function sign_extend(_value: u16, _num_bits: usize): u16 {
    // Calculate a mask with only the most significant bit set
    const mask = 1 << (_num_bits - 1);

    // XOR the value with the mask to flip the sign bit if it's set
    const xoredValue = _value ^ mask;
    // Calculate the result based on the sign bit
    return xoredValue - mask;
}

function f32_to_u8(f: f32): u8 {
    const n = (f * 255);
    return n<=0 ? 0 : n>=255 ? 255 : Math.floor(n)
}

function fp16_ieee_to_fp32_value(h: u16):f32  {
    const uint16Value = h
    const sign = (uint16Value & 0x8000) >> 15;
    const exponent = (uint16Value & 0x7C00) >> 10;
    const fraction = uint16Value & 0x03FF;

    let floatValue;

    if (exponent === 0) {
        if (fraction === 0) {
        floatValue = (sign === 0) ? 0 : -0; // +/-0
        } else {
        // Denormalized number
        floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (fraction / 0x0400);
        }
    } else if (exponent === 0x1F) {
        if (fraction === 0) {
        floatValue = (sign === 0) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        } else {
        floatValue = Number.NaN;
        }
    } else {
        // Normalized number
        floatValue = (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x0400);
    }

    return floatValue;
}

function f16_to_u8(h: u16): u8 {
    return f32_to_u8(fp16_ieee_to_fp32_value(h))
}

function decode_bc6_block(data: Uint8Array|Buffer, outbuf: Uint32Array, signed: bool) {

    let bit: BitReader = new bireader(data);

    let mode: u8 = bit.ubit(2);

    let ep_r = new Uint16Array(4); //{ /* rw, rx, ry, rz */ };
    let ep_g = new Uint16Array(4); //{ /* gw, gx, gy, gz */ };
    let ep_b = new Uint16Array(4); //{ /* bw, bx, by, bz */ };

    if ((mode & 2) != 0) {
        // 5-bit mode
        mode |= (bit.ubit(3) << 2);

        if (0 == S_BC6H_MODE_INFO[mode].endpoint_bits) {
            for (let i = 0; i < 16; i++) {
                outbuf[i] = 0;
            }
            return;
        }

        switch (mode) {
        case 2:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(5);
            ep_r[0] |= bit.ubit(1) << 10;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(4);
            ep_g[0] |= bit.ubit(1) << 10;
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(4);
            ep_b[0] |= bit.ubit(1) << 10;
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 3:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(10);
            ep_g[1] |= bit.ubit(10);
            ep_b[1] |= bit.ubit(10);
            break;
        case 6:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(4);
            ep_r[0] |= bit.ubit(1) << 10;
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(5);
            ep_g[0] |= bit.ubit(1) << 10;
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(4);
            ep_b[0] |= bit.ubit(1) << 10;
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(4);
            ep_b[3] |= bit.ubit(1);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(4);
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 7:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(9);
            ep_r[0] |= bit.ubit(1) << 10;
            ep_g[1] |= bit.ubit(9);
            ep_g[0] |= bit.ubit(1) << 10;
            ep_b[1] |= bit.ubit(9);
            ep_b[0] |= bit.ubit(1) << 10;
            break;
        case 10:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(4);
            ep_r[0] |= bit.ubit(1) << 10;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(4);
            ep_g[0] |= bit.ubit(1) << 10;
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(5);
            ep_b[0] |= bit.ubit(1) << 10;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(4);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(4);
            ep_b[3] |= bit.ubit(1) << 4;
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 11:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(8);
            ep_r[0] |= bit.ubit(1) << 11;
            ep_r[0] |= bit.ubit(1) << 10;
            ep_g[1] |= bit.ubit(8);
            ep_g[0] |= bit.ubit(1) << 11;
            ep_g[0] |= bit.ubit(1) << 10;
            ep_b[1] |= bit.ubit(8);
            ep_b[0] |= bit.ubit(1) << 11;
            ep_b[0] |= bit.ubit(1) << 10;
            break;
        case 14:
            ep_r[0] |= bit.ubit(9);
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(9);
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(9);
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(5);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 15:
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(4);
            ep_r[0] |= bit.ubit(1) << 15;
            ep_r[0] |= bit.ubit(1) << 14;
            ep_r[0] |= bit.ubit(1) << 13;
            ep_r[0] |= bit.ubit(1) << 12;
            ep_r[0] |= bit.ubit(1) << 11;
            ep_r[0] |= bit.ubit(1) << 10;
            ep_g[1] |= bit.ubit(4);
            ep_g[0] |= bit.ubit(1) << 15;
            ep_g[0] |= bit.ubit(1) << 14;
            ep_g[0] |= bit.ubit(1) << 13;
            ep_g[0] |= bit.ubit(1) << 12;
            ep_g[0] |= bit.ubit(1) << 11;
            ep_g[0] |= bit.ubit(1) << 10;
            ep_b[1] |= bit.ubit(4);
            ep_b[0] |= bit.ubit(1) << 15;
            ep_b[0] |= bit.ubit(1) << 14;
            ep_b[0] |= bit.ubit(1) << 13;
            ep_b[0] |= bit.ubit(1) << 12;
            ep_b[0] |= bit.ubit(1) << 11;
            ep_b[0] |= bit.ubit(1) << 10;
            break;
        case 18:
            ep_r[0] |= bit.ubit(8);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(8);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(8);
            ep_b[3] |= bit.ubit(1) << 3;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(6);
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(6);
            ep_r[3] |= bit.ubit(6);
            break;
        case 22:
            ep_r[0] |= bit.ubit(8);
            ep_b[3] |= bit.ubit(1);
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(8);
            ep_g[2] |= bit.ubit(1) << 5;
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(8);
            ep_g[3] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(5);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(6);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 26:
            ep_r[0] |= bit.ubit(8);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(8);
            ep_b[2] |= bit.ubit(1) << 5;
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(8);
            ep_b[3] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(5);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(6);
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 30:
            ep_r[0] |= bit.ubit(6);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_b[3] |= bit.ubit(1);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(6);
            ep_g[2] |= bit.ubit(1) << 5;
            ep_b[2] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 2;
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(6);
            ep_g[3] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 3;
            ep_b[3] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(6);
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(6);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(6);
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(6);
            ep_r[3] |= bit.ubit(6);
            break;
        default:
            break;
        }
    } else {
        switch (mode) {
        case 0:
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[0] |= bit.ubit(10);
            ep_g[0] |= bit.ubit(10);
            ep_b[0] |= bit.ubit(10);
            ep_r[1] |= bit.ubit(5);
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 2;
            ep_r[3] |= bit.ubit(5);
            ep_b[3] |= bit.ubit(1) << 3;
            break;
        case 1:
            ep_g[2] |= bit.ubit(1) << 5;
            ep_g[3] |= bit.ubit(1) << 4;
            ep_g[3] |= bit.ubit(1) << 5;
            ep_r[0] |= bit.ubit(7);
            ep_b[3] |= bit.ubit(1);
            ep_b[3] |= bit.ubit(1) << 1;
            ep_b[2] |= bit.ubit(1) << 4;
            ep_g[0] |= bit.ubit(7);
            ep_b[2] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 2;
            ep_g[2] |= bit.ubit(1) << 4;
            ep_b[0] |= bit.ubit(7);
            ep_b[3] |= bit.ubit(1) << 3;
            ep_b[3] |= bit.ubit(1) << 5;
            ep_b[3] |= bit.ubit(1) << 4;
            ep_r[1] |= bit.ubit(6);
            ep_g[2] |= bit.ubit(4);
            ep_g[1] |= bit.ubit(6);
            ep_g[3] |= bit.ubit(4);
            ep_b[1] |= bit.ubit(6);
            ep_b[2] |= bit.ubit(4);
            ep_r[2] |= bit.ubit(6);
            ep_r[3] |= bit.ubit(6);
            break;
        default:
            break;
        }
    }

    let mi = S_BC6H_MODE_INFO[mode];

    if (signed) {
        ep_r[0] = sign_extend(ep_r[0], mi.endpoint_bits);
        ep_g[0] = sign_extend(ep_g[0], mi.endpoint_bits);
        ep_b[0] = sign_extend(ep_b[0], mi.endpoint_bits);
    }

    let num_subsets = mi.partition_bits != 0 ? 2 : 1 ;

    for (let ii = 1; ii < num_subsets * 2; ii++) {
        if (signed || mi.transformed) {
            ep_r[ii] = sign_extend(ep_r[ii], mi.delta_bits[0]);
            ep_g[ii] = sign_extend(ep_g[ii], mi.delta_bits[1]);
            ep_b[ii] = sign_extend(ep_b[ii], mi.delta_bits[2]);
        }

        if (mi.transformed) {
            let mask = (1 << mi.endpoint_bits) - 1;
            ep_r[ii] = (ep_r[ii] + ep_r[0]) & mask;
            ep_g[ii] = (ep_g[ii] + ep_g[0]) & mask;
            ep_b[ii] = (ep_b[ii] + ep_b[0]) & mask;

            

            if (signed) {
                ep_r[ii] = sign_extend(ep_r[ii], mi.endpoint_bits);
                ep_g[ii] = sign_extend(ep_g[ii], mi.endpoint_bits);
                ep_b[ii] = sign_extend(ep_b[ii], mi.endpoint_bits);
            }
        }
        
    }

    for (let ii = 0; ii < num_subsets * 2; ii++) {
        ep_r[ii] = unquantize(ep_r[ii], signed, mi.endpoint_bits);
        ep_g[ii] = unquantize(ep_g[ii], signed, mi.endpoint_bits);
        ep_b[ii] = unquantize(ep_b[ii], signed, mi.endpoint_bits);
    }

    let partition_set_idx = mi.partition_bits != 0 ? bit.ubit(5) : 0;

    let index_bits =  mi.partition_bits != 0 ? 3 : 4 ;
    let factors = S_BPTC_FACTORS[index_bits - 2];

    for (let yy = 0; yy < 4; yy++) {
        for (let xx = 0; xx < 4; xx++) {
            let idx = yy * 4 + xx;

            let subset_index = 0;
            let index_anchor = 0;

            if (0 != mi.partition_bits) {
                subset_index = (S_BPTC_P2[partition_set_idx] >> idx) & 1;
                index_anchor = subset_index != 0 ? S_BPTC_A2[partition_set_idx] : 0;
            }

            let anchor = idx == index_anchor?1:0;
            let num = index_bits - anchor;
            let index = bit.ubit(num);

            let fc = factors[index];
            let fca = 64 - fc;
            let fcb = fc;

            subset_index *= 2;
            let rr = finish_unquantize(
                (ep_r[subset_index] * fca + ep_r[subset_index + 1] * fcb + 32) >> 6,
                signed,
            );
            let gg = finish_unquantize(
                (ep_g[subset_index] * fca + ep_g[subset_index + 1] * fcb + 32) >> 6,
                signed,
            );
            let bb = finish_unquantize(
                (ep_b[subset_index] * fca + ep_b[subset_index + 1] * fcb + 32) >> 6,
                signed,
            );

            outbuf[idx] = color(f16_to_u8(rr), f16_to_u8(gg), f16_to_u8(bb), 255);
        }
    }
}

function isBuffer(obj: Buffer|Uint8Array): boolean {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}

function isArrayOrBuffer(obj:  Buffer|Uint8Array): boolean {
    return obj instanceof Uint8Array || isBuffer(obj);
}

function copy_block_buffer(
    bx: number,
    by: number,
    w: number,
    h: number,
    bw: number,
    bh: number,
    buffer: Uint32Array,
    image: Uint32Array,
) {
    let x = bw * bx;
    let copy_width = bw * (bx + 1) > w ? (w - bw * bx) : bw

    let y_0 = by * bh;
    let copy_height = bh * (by + 1) > h ? h - y_0 : bh ;
    let buffer_offset = 0;
    for (let y = y_0; y < y_0 + copy_height; y++) {
        let image_offset = y * w + x;
        let bufferIndex = buffer_offset;
        for (let i = 0; i < copy_width; i++) {
            image[image_offset + i] = buffer[bufferIndex];
            bufferIndex++;
        }
        buffer_offset += bw;
    }
}

/**
 * Decompress BC6 data (defaults to unsigned). 
 * 
 * Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @param {boolean} unsigned - If data is returned unsigned (default true)
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC6(data: Uint8Array|Buffer, width: number, height:number, unsigned?:boolean){
    if(unsigned){
        return decodeBC6H(data,width,height)
    } else {
        return decodeBC6S(data,width,height)
    }
}

/**
 * Decompress BC6 Signed data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC6S(data: Uint8Array|Buffer, width: number, height:number): Uint8Array|Buffer {
    if(!isArrayOrBuffer(data)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 16;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_HEIGHT - 1) / BLOCK_HEIGHT);

    if (data.length < num_blocks_x * num_blocks_y * raw_block_size) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${data.length} Needed size: - ${ num_blocks_x * num_blocks_y * raw_block_size}`)
    }
    
    const image = new Uint32Array(width * height)
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080)

    var data_offset = 0;
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
            decode_bc6_block(data.subarray(data_offset,data_offset+raw_block_size), buffer, true);
            copy_block_buffer(
                bx,
                by,
                width,
                height,
                BLOCK_WIDTH,
                BLOCK_HEIGHT,
                buffer,
                image,
            );
            data_offset += raw_block_size;
        }
    }
    if(isBuffer(data)){
        return Buffer.from(image.buffer)
    }
    return new Uint8Array(image.buffer)
}

/**
 * Decompress BC6 Unsigned data. Returns Buffer or Uint8Array based on source data type.
 * 
 * @param {Buffer|Uint8Array} data - Source data as ```Uint8Array``` or ```Buffer```
 * @param {number} width - Image Width
 * @param {number} height - Image Height
 * @returns ```Uint8Array``` or ```Buffer``` as RGBA
 */
export function decodeBC6H(data: Uint8Array|Buffer, width: number, height:number): Uint8Array|Buffer {
    if(!isArrayOrBuffer(data)){
        throw new Error(`Source data must be Uint8Array or Buffer`)
    }
    const BLOCK_WIDTH = 4;
    const BLOCK_HEIGHT = 4;
    const raw_block_size = 16;
    const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
    const num_blocks_x = Math.floor((width + BLOCK_WIDTH - 1) / BLOCK_WIDTH);
    const num_blocks_y = Math.floor((height + BLOCK_HEIGHT - 1) / BLOCK_HEIGHT);

    if (data.length < num_blocks_x * num_blocks_y * raw_block_size) {
        throw new Error(`Source data too short for resolution supplied: Source size - ${data.length} Needed size: - ${ num_blocks_x * num_blocks_y * raw_block_size}`)
    }

    const image = new Uint32Array(width * height)
    const buffer = new Uint32Array(BLOCK_SIZE).fill(4278190080)

    var data_offset = 0;
    for (var by = 0; by < num_blocks_y; by++) {
        for (var bx = 0; bx < num_blocks_x; bx++) {
        decode_bc6_block(data.subarray(data_offset,data_offset+raw_block_size), buffer, false);
        copy_block_buffer(
            bx,
            by,
            width,
            height,
            4,
            4,
            buffer,
            image,
        );
        data_offset += raw_block_size;
        }
    }

    if(isBuffer(data)){
        return Buffer.from(image.buffer)
    }
    return new Uint8Array(image.buffer)
}