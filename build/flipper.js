function isBuffer(obj) {
    return (typeof Buffer !== 'undefined' && obj instanceof Buffer);
}
function arraybuffcheck(obj) {
    return obj instanceof Uint8Array || isBuffer(obj);
}
export function flipImage(src, width, height, is24) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const output = isBuffer(src) ? Buffer.alloc(src.length) : new Uint8Array(src.length);
    var z = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var pos = (x + (height - y - 1) * width) << 2;
            output[pos + 0] = src[z + 0] & 0xFF;
            output[pos + 1] = src[z + 1] & 0xFF;
            output[pos + 2] = src[z + 2] & 0xFF;
            if (is24) {
                z += 3;
            }
            else {
                output[pos + 3] = src[z + 3] & 0xFF;
                z += 4;
            }
        }
    }
    return output;
}
export function cropImage(src, width, height, srcBitsPerPixel) {
    if (!arraybuffcheck(src)) {
        throw new Error("Source must be Uint8Array or Buffer");
    }
    const originalWidth = src.length / (height * srcBitsPerPixel);
    const originalHeight = src.length / (width * srcBitsPerPixel);
    const startX = Math.floor((originalWidth - width) / 2);
    const startY = Math.floor((originalHeight - height) / 2);
    var croppedData;
    if (isBuffer(src)) {
        croppedData = Buffer.alloc(width * height * srcBitsPerPixel);
    }
    else {
        croppedData = new Uint8Array(width * height * srcBitsPerPixel);
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = ((startY + y) * originalWidth + (startX + x)) * srcBitsPerPixel;
            const destIndex = (y * width + x) * srcBitsPerPixel;
            croppedData.set(src.subarray(sourceIndex, sourceIndex + srcBitsPerPixel), destIndex);
        }
    }
    return croppedData;
}
