// Ícono: acción amarilla con marco de tinta y la franja azul de verificación (DESIGN.md).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const [Y, INK, BLUE] = ['#F2C230', '#18211D', '#1F4C8A'].map(hex);

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const frame = Math.round(size * 0.2), stroke = Math.round(size * 0.06);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const inFrame = x >= frame && x < size - frame && y >= frame && y < size - frame;
      const edge = inFrame && (x < frame + stroke || x >= size - frame - stroke || y < frame + stroke || y >= size - frame - stroke);
      const strip = inFrame && !edge && y >= size * 0.56 && y < size * 0.68 && x >= frame + stroke * 2 && x < size - frame - stroke * 2;
      raw.set(edge ? INK : strip ? BLUE : Y, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [192, 512]) writeFileSync(`public/icon-${s}.png`, png(s));
