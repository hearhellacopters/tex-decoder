import { bireader } from 'bireader';
class pvrtc2_block {
    constructor(data) {
        const br = new bireader(data);
        this.m_modulation = new Uint8Array(4);
        this.m = br.uint32();
        br.skip(-4);
        for (let i = 0; i < 4; i++) {
            this.m_modulation[i] = br.ubyte();
        }
        br.skip(0, 31);
        if (br.ubit(1)) {
            br.skip(0, -32);
            this.m_mod_flag = br.ubit(1);
            this.m_blue_a = br.ubit(4);
            this.m_green_a = br.ubit(5);
            this.m_red_a = br.ubit(5);
            this.m_alpha_a = 0;
            this.m_hard_flag = br.ubit(1);
            this.m_blue_b = br.ubit(5);
            this.m_green_b = br.ubit(5);
            this.m_red_b = br.ubit(5);
            this.m_alpha_b = 0;
            this.m_opaque_flag = br.ubit(1);
        }
        else {
            br.skip(0, -32);
            this.m_mod_flag = br.ubit(1);
            this.m_blue_a = br.ubit(3);
            this.m_green_a = br.ubit(4);
            this.m_red_a = br.ubit(4);
            this.m_alpha_a = br.ubit(3);
            this.m_hard_flag = br.ubit(1);
            this.m_blue_b = br.ubit(4);
            this.m_green_b = br.ubit(4);
            this.m_red_b = br.ubit(4);
            this.m_alpha_b = br.ubit(3);
            this.m_opaque_flag = br.ubit(1);
        }
        br.skip(-4);
        this.m_color_data_bits = br.uint32();
    }
}
class color_rgba {
    constructor(r, g, b, a) {
        this.r = r ? r & 0xFF : 0;
        this.g = g ? g & 0xFF : 0;
        this.b = b ? b & 0xFF : 0;
        this.a = a ? a & 0xFF : 0;
    }
    data() {
        return (((this.a & 0xFF) << 24) | ((this.b & 0xFF) << 16) | ((this.g & 0xFF) << 8) | (this.r & 0xFF));
    }
    set(r, g, b, a) {
        this.r = r ? r & 0xFF : 0;
        this.g = g ? g & 0xFF : 0;
        this.b = b ? b & 0xFF : 0;
        this.a = a ? a & 0xFF : 0;
    }
}
function convert_rgb_555_to_888(col) {
    return new color_rgba((col.r << 3) | (col.r >> 2), (col.g << 3) | (col.g >> 2), (col.b << 3) | (col.b >> 2), 255);
}
function convert_rgba_5554_to_8888(col) {
    return new color_rgba((col.r << 3) | (col.r >> 2), (col.g << 3) | (col.g >> 2), (col.b << 3) | (col.b >> 2), (col.a << 4) | col.a);
}
function unpack_pvrtc2(p, pPixels, bx, by, do2bit) {
    const pBlock = new pvrtc2_block(p);
    if ((!pBlock.m_hard_flag) || (pBlock.m_mod_flag)) {
        throw new Error(`This mode ${!pBlock.m_hard_flag ? "[hard flag]" : ""}${pBlock.m_mod_flag ? "[mod flag]" : ""}) isn't supported by the transcoder`);
    }
    var ChessboardPixelMod = 0;
    var regionpixelID = bx + by * (do2bit ? 8 : 4);
    var ModulationMode = 0;
    if (pBlock.m_mod_flag) {
        ModulationMode = 1;
        if ((pBlock.m & 1) == 1) {
            if ((pBlock.m & (1 << 20)) >= 1) {
                ModulationMode = 3;
            }
            else {
                ModulationMode = 2;
            }
            if ((pBlock.m & (1 << 21)) >= 1) {
                pBlock.m |= (1 << 21);
            }
            else {
                pBlock.m &= ~(1 << 20);
            }
        }
        if ((pBlock.m & 2) >= 1) {
            pBlock.m |= 1;
        }
        else {
            pBlock.m = pBlock.m & (~1);
        }
        if (((bx + by) & 1) == 0) {
            var ChessboardID = ((do2bit ? 8 : 4) >> 1) * by + ((bx - (by & 1)) >> 1);
            ChessboardPixelMod = (pBlock.m >> (ChessboardID * 2)) & 3;
        }
    }
    else {
        ChessboardPixelMod = ((pBlock.m >> regionpixelID) & 1) * 3;
    }
    const colors = Array.from({ length: 4 }, () => new color_rgba());
    if (pBlock.m_opaque_flag) {
        const color_a = new color_rgba(pBlock.m_red_a, pBlock.m_green_a, (pBlock.m_blue_a << 1) | (pBlock.m_blue_a >> 3), 255);
        const color_b = new color_rgba(pBlock.m_red_b, pBlock.m_green_b, pBlock.m_blue_b, 255);
        colors[0] = convert_rgb_555_to_888(color_a);
        colors[3] = convert_rgb_555_to_888(color_b);
        colors[1].set((colors[0].r * 5 + colors[3].r * 3) / 8, (colors[0].g * 5 + colors[3].g * 3) / 8, (colors[0].b * 5 + colors[3].b * 3) / 8, 255);
        colors[2].set((colors[0].r * 3 + colors[3].r * 5) / 8, (colors[0].g * 3 + colors[3].g * 5) / 8, (colors[0].b * 3 + colors[3].b * 5) / 8, 255);
    }
    else {
        const color_a = new color_rgba((pBlock.m_red_a << 1) | (pBlock.m_red_a >> 3), (pBlock.m_green_a << 1) | (pBlock.m_green_a >> 3), (pBlock.m_blue_a << 2) | (pBlock.m_blue_a >> 1), pBlock.m_alpha_a << 1);
        const color_b = new color_rgba((pBlock.m_red_b << 1) | (pBlock.m_red_b >> 3), (pBlock.m_green_b << 1) | (pBlock.m_green_b >> 3), (pBlock.m_blue_b << 1) | (pBlock.m_blue_b >> 3), (pBlock.m_alpha_b << 1) | 1);
        colors[0] = convert_rgba_5554_to_8888(color_a);
        colors[3] = convert_rgba_5554_to_8888(color_b);
    }
    colors[1].set((colors[0].r * 5 + colors[3].r * 3) / 8, (colors[0].g * 5 + colors[3].g * 3) / 8, (colors[0].b * 5 + colors[3].b * 3) / 8, (colors[0].a * 5 + colors[3].a * 3) / 8);
    colors[2].set((colors[0].r * 3 + colors[3].r * 5) / 8, (colors[0].g * 3 + colors[3].g * 5) / 8, (colors[0].b * 3 + colors[3].b * 5) / 8, (colors[0].a * 3 + colors[3].a * 5) / 8);
    if (do2bit) {
        for (var i = 0; i < 32; i++) {
            const sel = (pBlock.m_modulation[i >> 2] >> ((i & 7) * 2)) & 3;
            pPixels[i] = colors[sel];
        }
    }
    else {
        for (var i = 0; i < 16; i++) {
            const sel = (pBlock.m_modulation[i >> 2] >> ((i & 3) * 2)) & 3;
            pPixels[i] = colors[sel];
        }
    }
}
function copy_block_buffer(bx, by, w, h, bw, bh, buffer, image) {
    let x = bw * bx;
    let copy_width = bw * (bx + 1) > w ? (w - bw * bx) : bw;
    let y_0 = by * bh;
    let copy_height = bh * (by + 1) > h ? h - y_0 : bh;
    let buffer_offset = 0;
    for (let y = y_0; y < y_0 + copy_height; y++) {
        let image_offset = y * w + x;
        let bufferIndex = buffer_offset;
        for (let i = 0; i < copy_width; i++) {
            image[image_offset + i] = buffer[bufferIndex].data();
            bufferIndex++;
        }
        buffer_offset += bw;
    }
}
function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function isArrayOrBuffer(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
export function decodePVRTCII4bit(data, width, height) {
    if (!isArrayOrBuffer(data)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const num_blocks_x = Math.floor((width + 4 - 1) / 4);
    const num_blocks_y = Math.floor((height + 4 - 1) / 4);
    const raw_block_size = 8;
    var buffer = [];
    var image = new Uint32Array(width * height);
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            unpack_pvrtc2(data.subarray(data_offset, data_offset + raw_block_size), buffer, bx, by, false);
            copy_block_buffer(bx, by, width, height, 4, 4, buffer, image);
            data_offset += raw_block_size;
            buffer = [];
        }
    }
    if (isBuffer(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
export function decodePVRTCII2bit(data, width, height) {
    if (!isArrayOrBuffer(data)) {
        throw new Error(`Source data must be Uint8Array or Buffer`);
    }
    const num_blocks_x = Math.floor((width + 4 - 1) / 4);
    const num_blocks_y = Math.floor((height + 4 - 1) / 4);
    const raw_block_size = 8;
    var buffer = [];
    var image = new Uint32Array(width * height);
    var data_offset = 0;
    for (let by = 0; by < num_blocks_y; by++) {
        for (let bx = 0; bx < num_blocks_x; bx++) {
            unpack_pvrtc2(data.subarray(data_offset, data_offset + raw_block_size), buffer, bx, by, true);
            copy_block_buffer(bx, by, width, height, 8, 4, buffer, image);
            data_offset += raw_block_size;
            buffer = [];
        }
    }
    if (isBuffer(data)) {
        return Buffer.from(image.buffer);
    }
    return new Uint8Array(image.buffer);
}
