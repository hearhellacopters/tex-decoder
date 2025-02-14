# tex-decoder

A pure typescript texture decoder for most image compression types without the use of WebGL. Includes a color profile converter, unswizzler, image flipper and resizer plus a TGA and PNG file maker. Great for Node or web browsers.

Fully supports the following formats:

- [ETC](#etc) - ETC1, ETC2 and EAC decoding. Includes options for alpha in ETC1.
- [DXTn](#dtx) - DTX1 (aka BC1), DXT2 (aka BC2), DXT3 (aka BC2), DXT4 (aka BC3) and DXT5 (aka BC3).
- [BCn](#bc) - BC1 (aka DTX1), BC2 (aka DXT3), BC3 (aka DXT5), BC4 (aka ATI1), BC5 (AKA ATI2), BC6 (signed and unsigned) and BC7.
- [ATI](#ati) - ATI1 and ATI2.
- [ATC](#atc) - ATC 4 and 8.
- [PVRTC](#pvrtc) - PVRTC in 2 bit or 4 bit mode.
- [ASTC](#astc) - ASTC 4x4 to 12x12.
- [CRN](#crn) - Crunch data supporting all DXT.

Also includes:

- [Color Profile Converter](#color-profile-converter) - Convert an image color profile.
- [Unswizzler](#unswizzler) - Unswizzle, untile or mortonize image data.
- [Image Flipper](#image-flipper) - Flips a RGB or RGBA image.
- [Image Cropper](#image-cropper) - Crops a RGB or RGBA image.
- [TGA Maker](#tga-maker) - Create a TGA file from a RGB or RGBA image.
- [PNG Maker](#png-maker) - Create a PNG file from a RGB or RGBA image. Built on [pngjs](https://github.com/pngjs/pngjs).
- [zlib algo](#zlib) - Simple compression / decompresson zlib port of [pako](https://github.com/nodeca/pako) in typescript.

## Installation

```npm install tex-decoder```

Provides CommonJS and ES modules.

## Example

Decoding ETC data with supplied format selector and create a TGA file.

```javascript
import {
    decodeETC,
    ETC_FORMAT,
    makeTGA
    } from 'tex-decoder';

//read file data
const data = fs.readFileSync(__dirname + '/ETC2_RGBA8_image.bin');

//decode compressed data
const decodedData = decodeETC(data,512,512,ETC_FORMAT.ETC2_RGBA8);
//or use preset format function decodeETC2RGBA(data,512,512);

//write raw RGBA output
fs.writeFileSync(__dirname + '/ETC2_RGBA8.dat',decodedData);

//or create a TGA file
const tga = makeTGA(decodedData,512,512,true);

//write .tga file
fs.writeFileSync(__dirname + '/ETC2_RGBA8.tga',tga);
```

## ETC

Decodes compressed ETC and EAC data. Source must be Uint8Array or Buffer. Returns the same type.

Use provided ```ETC_FORMAT```.Format to specify format unless using presets. Use ```ETC_PROFILE```.RGB/RGBA to force a profile different than packed.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions / Enum  (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name<br>(master)</b></td>
    <td>decodeETC(<b>src, width, height, ETC_FORMAT,</b> ETC_PROFILE)</td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
  <tr>
    <td align="center"><b>ETC Formats</b></td>
    <td>ETC_FORMAT = {<br>
	ETC1_RGB,<br>
	ETC2_RGB,<br>
	ETC1_RGBA8,<br>
	ETC2_RGBA8,<br>
	ETC2_RGBA1,<br>
	ETC2_SRGB,<br>
	ETC2_SRGBA8,<br>
	ETC2_SRGBA1,<br>
    EAC_R11,<br>
	EAC_RG11,<br>
	EAC_R11_SIGNED,<br>
	EAC_RG11_SIGNED,<br>
    }
    </td>
    <td>For use in 3rd argument of master function.</td>
  </tr>
  <tr>
    <td align="center"><b>ETC Profiles</b></td>
    <td>ETC_PROFILE = {<br>
	RGB,<br>
	RGBA<br>
    }
    </td>
    <td>For use in 4th argument of master function and 3rd in presets.</td>
  </tr>
  <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC1RGB(<b>src, width, height, </b>ETC_PROFILE)
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
  </tr>
  <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC1RGBA(<b>src, width, height, </b>ETC_PROFILE)
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.<br><br><b>Note:</b> This is a special case as ETC1 can't do alpha. Some packers create the alpha as a second image under the first (double the height). This function will decode all the data and fold the image onto itself creating the alpha channel. It will return the image with half the height supplied.</td>
  </tr>
  <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2RGB(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2RGBA(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2RGBA1(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2sRGB(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2sRGBA1(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeETC2sRGBA8(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
  <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeEACR11(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeEACR11_SIGNED(<b>src, width, height,</b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeEACRG11(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
    <tr>
    <td align="center"><b>Presets</b></td>
    <td>
    decodeEACRG11_SIGNED(<b>src, width, height, </b>ETC_PROFILE)<br>
    </td>
    <td>Returns the data profile based on the format. Can force an RGB or RGBA with ETC_PROFILE.</td>
  </tr>
</tbody>
</table>

## DTX

Decodes compressed DXT data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeDXT1(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeBC1.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeDXT2(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeDXT3(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeBC2.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeDXT4(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
   <tr>
    <td align="center"><b>Name</td>
    <td>decodeDXT5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeBC3.</td>
  </tr>
</tbody>
</table>

## BC

Decodes compressed BC1-7 data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC1(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeDXT1.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC2(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeDXT3.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC3(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeDXT5.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC4(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeATI1.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeATI2.</td>
  </tr>
  <tr>
    <td align="center"><b>Name<br>(Master)</td>
    <td>decodeBC6(<b>src, width, height,</b> unsigned)</td>
    <td>Returns RGBA data. Set unsigned as <b>false</b> if data is signed (defaults true)</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeBC6H(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Unsigned data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeBC6S(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Signed data.</td>
  </tr>
    <tr>
    <td align="center"><b>Name</td>
    <td>decodeBC7(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
</tbody>
</table>

# ATI

Decodes compressed ATI1 or ATI2 data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name<br>(Master)</td>
    <td>decodeATI(<b>src, width, height</b>, Do2)</td>
    <td>Returns RGBA data. Will run ATI2 if Do2 is <b>true</b> (default ATI1).</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeATI1(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeBC4.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeATI2(<b>src, width, height</b>)</td>
    <td>Returns RGBA data. Same function as decodeBC5.</td>
  </tr>
</tbody>
</table>

## ATC

Decodes compressed ATC4 or ATC8 data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name<br>(Master)</td>
    <td>decodeATC(<b>src, width, height,</b> Do8bitMode)</td>
    <td>Returns RGBA data. Will run 8 bit mode if Do8bitMode is <b>true</b> (default false for 4 bit).</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeATC4(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeATC8(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
</tbody>
</table>

## PVRTC

Decodes compressed PVRTC data in 2 or 4 bit mode. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name<br>(Master)</td>
    <td>decodePVRTC(<b>src, width, height,</b> Do2bitMode)</td>
    <td>Returns RGBA data. Will run 2 bit mode if Do2bitMode is <b>true</b> (default false for 4 bit).</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodePVRTC4bit(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodePVRTC2bit(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
</tbody>
</table>

## ASTC

Decodes compressed ASTC data in 4x4 to 12x12 bit mode. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name<br>(Master)</td>
    <td>decodeASTC(<b>src, width, height, block_width, block_height</b>)</td>
    <td>Returns RGBA data. For this function you can pass the block size as arguments.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_4x4(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_5x4(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_5x5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_6x5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_6x6(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_8x5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_8x6(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_8x8(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_10x5(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_10x6(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_10x8(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_10x10(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_12x10(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeASTC_12x12(<b>src, width, height</b>)</td>
    <td>Returns RGBA data.</td>
  </tr>
</tbody>
</table>

## CRN

Decodes crunched data in DXT format and can return decoded or coded data. Source must be Uint8Array or Buffer. Returns the same type.

Data must be a vaild [.crn](https://www.sweetscape.com/010editor/repository/files/CRN.bt) file format.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name</td>
    <td>getCRNMeta(<b>src</b>, mipmap_level)</td>
    <td>Checks the crunched data and returns width, height, mipmaps, faces and format of compressed data. Can supply mip level if file has more than one to get the right width, height.</td>
  </tr>
  <tr>
    <td align="center"><b>Preset</td>
    <td>decodeCRN(<b>src</b>, mipmap_level, keepCompressed)</td>
    <td>Returns decode RGBA data unless keepCompressed is <b>true</b> (default false). Can supply mip level if file has more than one to get that level returned data.</td>
  </tr>
</tbody>
</table>

## Color Profile Converter

Converts the data's color profile bit order and data type. You can use supplied ```COLOR_PROFILE``` profiles or create your own. You can use ```BYTE_VALUE``` to help create your own. Read how below. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions / Enum  (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name<br>(master)</b></td>
    <td>convertProfile(<b>src, srcProfile, dstProfile,</b> width, height)</td>
    <td>Returns the data profile based on the COLOR_PROFILE. Se below for the preset or you can make your own.</td>
  </tr>
  <tr>
    <td align="center"><b>Color Profiles</b></td>
    <td>COLOR_PROFILE = {<br>
    A8, <br>
    R8, <br>
    G8, <br>
    B8, <br>
    RG8, <br>
    RB8, <br>
    GR8, <br>
    GB8, <br>
    BR8, <br>
    BG8, <br>
    RGB8, <br>
    RBG8, <br>
    GRB8, <br>
    GBR8, <br>
    BRG8, <br>
    BGR8, <br>
    ARGB8, <br>
    ARBG8, <br>
    AGRB8, <br>
    AGBR8, <br>
    ABRG8, <br>
    ABGR8, <br>
    RGBA8, <br>
    RBGA8, <br>
    GRBA8, <br>
    GBRA8, <br>
    BRGA8, <br>
    BGRA8, <br>
    RGB565, <br>
    BGR565, <br>
    RGBA4, <br>
    RGBA51, <br>
    RGB10_A2, <br>
    RGB10_A2I,<br>
    A8I, <br>
    R8I, <br>
    RG8I, <br>
    RGB8I, <br>
    RGBA8I, <br>
    ARGB8I, <br>
    BGR8I, <br>
    BGRA8I, <br>
    ABGR8I, <br>
    A16F, <br>
    R16F, <br>
    RG16F, <br>
    RGB16F, <br>
    RGBA16F, <br>
    ARGB16F, <br>
    R16, <br>
    RG16, <br>
    RGB16, <br>
    RGBA16, <br>
    A16I, <br>
    R16I, <br>
    RG16I, <br>
    RGB16I, <br>
    RGBA16I, <br>
    A32F, <br>
    R32F, <br>
    RG32F, <br>
    RGB32F, <br>
    RGBA32F, <br>
    A32, <br>
    R32, <br>
    RG32, <br>
    RGB32, <br>
    RGBA32, <br>
    R32I, <br>
    RG32I, <br>
    RGB32I, <br>
    RGBA32I, <br>
    }
    </td>
    <td>Profiles are object with 2 keys, order and value. Order is a string defining the color and bit size and the value is how it is read. Unsigned = 0, Signed = 1, Half Float = 2 and Float = 3 (can also be found in supplied BYTE_VALUE enum). Example: a order string for RGBA8 would be "r8g8b8a8" with a value of 0 and RG32F would be "r32g32" with a value of 3.</td>
  </tr>
</tbody>
</table>

## Unswizzler

Unswizzle, untile or mortonize data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td align="center"><b>Name</td>
    <td>unswizzle(<b>src, width, height, depth, bytesPerPixel, dstRowPitch, dstSlicePitch</b>)</td>
    <td><b>Note:</b> bytesPerPixel must be 1, 2 or 4.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>untile(<b>src, bytesPerBlock, pixelBlockWidth, pixelBlockHeigth, tileSize, width</b>)</td>
    <td>Untile block image data. pixelBlockWidth and pixelBlockHeigth are normally 4 unless the image is raw, then it's 1.</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>mortonize(<b>src, packedBitsPerPixel, pixelBlockWidth, pixelBlockHeigth, width, height, mortonOrder, widthFactor</b>)</td>
    <td>Mortonize block image data. pixelBlockWidth and pixelBlockHeigth are normally 4 unless the image is raw, then it's 1. mortonOrder and widthFactor change depending on the system.</td>
  </tr>
</tbody>
</table>

## Image Flipper

Flips image data of 24 or 32 bit profiles (needed for some types of image files). Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name</td>
    <td>flipImage(<b>src, width, height,</b> is24)</td>
    <td>Use is24 as <b>true</b> for 24 bit profiles</td>
  </tr>
</tbody>
</table>

## Image Cropper

Crops image data. Bits per pixel must be supplied of source data. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name</td>
    <td>cropImage(<b>src, current_width, current_height, bytesPerPixel, startX, startY, cropped_width, cropped_height</b>)</td>
    <td>Will crop the image based on cropped_width and cropped_height starting at startX & startX pixel</td>
  </tr>
</tbody>
</table>

## TGA Maker

Simple TGA file maker. Must be RGB8 or RGBA8 profile. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name</td>
    <td>makeTGA(<b>src, width, height,</b> noAlpha)</td>
    <td>Use noAlpha as <b>true</b> for 24 bit profiles</td>
  </tr>
</tbody>
</table>

## PNG Maker

Simple PNG file maker (uses [pngjs](https://github.com/pngjs/pngjs)). Must be RGB8 or RGBA8 profile. Source must be Uint8Array or Buffer. Returns the same type.

<table>
<thead>
  <tr>
    <th></th>
    <th align="center">Functions (bold requires)</th>
    <th align="left">Desc</th>
  </tr>
</thead>
<tbody>
<tr>
    <td align="center"><b>Name</td>
    <td>makePNG(<b>src, width, height,</b> noAlpha)</td>
    <td>Use noAlpha as <b>true</b> for 24 bit profiles</td>
  </tr>
  <tr>
    <td align="center"><b>Name</td>
    <td>readPNG(<b>src)</td>
    <td>Reads .png file and returns meta data like height and width and the unzipped data. Must be Uint8Array or Buffer.</td>
  </tr>
</tbody>
</table>

## zlib

A Typescript port of [pako](https://github.com/nodeca/pako).  Functions `inflate`, `Inflate`, `deflate`, `Deflate`, `deflateRaw`, `inflateRaw`, `gzip`, `ungzip` See [documentation](https://github.com/nodeca/pako) for how functions work.

## Acknowledgements

This project was born from the desire to have a single library that could convert any image format. Having been using tools like [Noesis](https://richwhitehouse.com/index.php?content=inc_projects.php&showproject=91) and [PVRTool](https://developer.imaginationtech.com/pvrtextool/) in the past, I wanted something I could translate quickly to a Node app and then use in a web site without having to redo work. Sources for all code can be found in comments.

I'm happy to connect and grow this library if others find it useful. Pull requests or [bug reports](https://github.com/hearhellacopters/tex-decoder/issues) are welcome!

## Disclaimer

All libraries are presented *as is*, I take no responsibility for outside use.

**If you plan to implement these libraries for anything other than personal or educational use, please be sure you have the appropriate permissions from the original owners.**

## License

[MIT](https://github.com/hearhellacopters/tex-decoder/blob/main/LICENSE)
