// Generates PWA PNG icons without any image dependencies.
// Draws a charcoal tile with an orange "plate + barbell" emblem.
import { deflateSync, crc32 as nodeCrc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.resolve(__dirname, '..', 'public')
mkdirSync(PUBLIC, { recursive: true })

const BG = [10, 10, 11, 255]
const ORANGE = [255, 106, 26, 255]

function crc32(buf) {
  if (typeof nodeCrc32 === 'function') return nodeCrc32(buf) >>> 0
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function png(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRect(x, y, x0, x1, y0, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

function icon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const c = size / 2
  const ringR = size * 0.34
  const ringT = size * 0.055
  const inner = ringR - ringT
  const outer = ringR + ringT
  const barHalf = size * 0.024
  const plateW = size * 0.05
  const plateH = size * 0.17

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = BG
      const dx = x - c + 0.5
      const dy = y - c + 0.5
      const d = Math.sqrt(dx * dx + dy * dy)
      const onRing = d >= inner && d <= outer
      const onBar = inRect(x, y, size * 0.16, size * 0.84, c - barHalf, c + barHalf)
      const onPlateL = inRect(
        x,
        y,
        c - size * 0.27 - plateW / 2,
        c - size * 0.27 + plateW / 2,
        c - plateH / 2,
        c + plateH / 2,
      )
      const onPlateR = inRect(
        x,
        y,
        c + size * 0.27 - plateW / 2,
        c + size * 0.27 + plateW / 2,
        c - plateH / 2,
        c + plateH / 2,
      )
      if (onRing || onBar || onPlateL || onPlateR) col = ORANGE
      const i = (y * size + x) * 4
      buf[i] = col[0]
      buf[i + 1] = col[1]
      buf[i + 2] = col[2]
      buf[i + 3] = col[3]
    }
  }
  return png(size, buf)
}

for (const size of [192, 512]) {
  writeFileSync(path.join(PUBLIC, `pwa-${size}x${size}.png`), icon(size))
}
writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), icon(180))

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0a0a0b"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="#ff6a1a" stroke-width="3.5"/>
  <rect x="11" y="30" width="42" height="4" rx="2" fill="#ff6a1a"/>
  <rect x="13" y="24" width="4" height="16" rx="2" fill="#ff6a1a"/>
  <rect x="47" y="24" width="4" height="16" rx="2" fill="#ff6a1a"/>
</svg>`
writeFileSync(path.join(PUBLIC, 'favicon.svg'), favicon)

console.log('icons written to', PUBLIC)
