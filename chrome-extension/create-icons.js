#!/usr/bin/env node
// Generates Zoundlist icon PNGs — neon green rounded square + black Z isotipo.
// No npm packages required.  Usage: node create-icons.js

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── PNG plumbing ──────────────────────────────────────────────────────────────
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
  const typeB = Buffer.from(type, "ascii");
  const lenB  = Buffer.allocUnsafe(4);
  const crcB  = Buffer.allocUnsafe(4);
  lenB.writeUInt32BE(data.length, 0);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}
function makePNG(size, draw) {
  const sig  = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=ihdr[11]=ihdr[12]=0;
  const rowLen = size * 3;
  const raw    = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r,g,b] = draw(x, y, size);
      const o = y * (rowLen + 1) + 1 + x * 3;
      raw[o] = r; raw[o+1] = g; raw[o+2] = b;
    }
  }
  return Buffer.concat([sig, makeChunk("IHDR",ihdr), makeChunk("IDAT",zlib.deflateSync(raw)), makeChunk("IEND",Buffer.alloc(0))]);
}

// ── Zoundlist icon drawing ─────────────────────────────────────────────────────
// Brand: neon green #95F908 background, rounded square, black Z isotipo + dot
function drawZoundlist(px, py, size) {
  const x = px / size;   // normalized 0..1
  const y = py / size;

  // ── 1. Rounded rectangle (icon shape) ────────────────────────────────────
  const cr = 0.18;   // corner radius (≈23px at 128px size)
  const bx = Math.max(cr, Math.min(1 - cr, x));
  const by = Math.max(cr, Math.min(1 - cr, y));
  if ((x - bx) * (x - bx) + (y - by) * (y - by) > cr * cr) {
    return [0xff, 0xff, 0xff];  // outside rounded rect → white (Chrome clips it)
  }

  // ── 2. Z shape parameters ─────────────────────────────────────────────────
  const pad = 0.155;         // left / right padding
  const bh  = 0.205;         // bar thickness (top & bottom strokes)
  const L   = pad;
  const R   = 1 - pad;
  const T   = pad + 0.03;    // top of Z (slightly inside rounded area)
  const B   = 1 - pad - 0.03;

  const topT = T;
  const topB = T + bh;
  const botT = B - bh;
  const botB = B;

  // ── Top bar ───────────────────────────────────────────────────────────────
  if (x >= L && x <= R && y >= topT && y <= topB) return [0,0,0];

  // ── Bottom bar ────────────────────────────────────────────────────────────
  if (x >= L && x <= R && y >= botT && y <= botB) return [0,0,0];

  // ── Diagonal (thick line from (R, topB) → (L, botT)) ─────────────────────
  {
    const dx  = L - R,  dy  = botT - topB;
    const len = Math.sqrt(dx*dx + dy*dy);
    // Projection along the line
    const t   = ((x - R) * dx + (y - topB) * dy) / (dx*dx + dy*dy);
    // Perpendicular distance
    const perp = Math.abs((x - R) * dy - (y - topB) * dx) / len;
    if (perp <= bh * 0.52 && t >= -0.01 && t <= 1.01) return [0,0,0];
  }

  // ── Dot (upper-right, above top bar) ────────────────────────────────────
  {
    const dotCX = R - bh * 0.05;     // ~right edge of Z
    const dotCY = T - bh * 0.48;     // above top bar
    const dotR  = bh * 0.44;         // radius ≈ 9px at 128px
    const ddx = x - dotCX, ddy = y - dotCY;
    if (ddx*ddx + ddy*ddy <= dotR*dotR) return [0,0,0];
  }

  // ── Background ────────────────────────────────────────────────────────────
  return [0x95, 0xF9, 0x08];   // #95F908 neon green
}

// ── Generate ──────────────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size, drawZoundlist);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  process.stdout.write(`✓ icon${size}.png  (${png.length} bytes)\n`);
}
process.stdout.write("Icons updated in ./icons/\n");
