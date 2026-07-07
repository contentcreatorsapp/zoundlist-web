#!/usr/bin/env node
// Generates icon PNG files for the Zoundlist Suno Importer extension.
// No npm packages required — uses only Node.js built-ins.
// Usage: node create-icons.js

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeB    = Buffer.from(type, "ascii");
  const lenB     = Buffer.allocUnsafe(4);
  const crcB     = Buffer.allocUnsafe(4);
  lenB.writeUInt32BE(data.length, 0);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function makePNG(size, draw) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB color
  ihdrData[10] = ihdrData[11] = ihdrData[12] = 0;

  const rowSize = size * 3;
  const raw = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0; // filter byte (None)
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y, size);
      const o = y * (rowSize + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdrData),
    makeChunk("IDAT", zlib.deflateSync(raw)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Draw function: dark bg with neon green "Z" play-button icon
function drawIcon(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.42;

  // Background: dark circle
  const dx = x - cx, dy = y - cy;
  if (dx * dx + dy * dy > r * r) return [13, 13, 13]; // #0D0D0D outside circle

  // Circle fill: very dark
  const inCircle = dx * dx + dy * dy <= r * r;

  // Draw a simple "play" triangle in neon green
  const tx = x / size, ty = y / size;
  const margin = 0.28;
  const inTriangle =
    tx >= margin + ty * 0.12 &&
    tx <= 0.82 - ty * 0.1 &&
    ty >= margin && ty <= 1 - margin &&
    tx >= margin + (ty - 0.5) * 0.5 - 0.05 &&
    tx >= margin - (ty - 0.5) * 0.5 - 0.05;

  // Simpler: filled triangle pointing right
  const px = (x - size * 0.28) / size;
  const py = (y - size * 0.5) / size;
  const inTri = px >= 0 && px <= 0.44 && Math.abs(py) <= (0.44 - px) * 0.55;

  if (inCircle && inTri) return [0x95, 0xF9, 0x08]; // neon green #95F908
  if (inCircle)          return [0x17, 0x17, 0x17]; // #171717 surface
  return [0x0D, 0x0D, 0x0D];                        // #0D0D0D bg
}

const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  process.stdout.write(`✓ icon${size}.png (${png.length} bytes)\n`);
}
process.stdout.write("Icons created in ./icons/\n");
