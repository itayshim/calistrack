import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const brandDir = path.join(publicDir, 'brand');
const iconDir = path.join(publicDir, 'icons');

async function pngFromSvg(source, destination, size) {
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function createIco(pngPath, destination) {
  const png = await fs.readFile(pngPath);
  const size = 32;
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await fs.writeFile(destination, Buffer.concat([header, png]));
}

async function splash(source, destination, width, height, background) {
  const logoWidth = Math.round(width * 0.42);
  const logo = await sharp(source, { density: 384 })
    .resize(logoWidth, logoWidth)
    .png()
    .toBuffer();
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function main() {
  await fs.mkdir(iconDir, { recursive: true });
  const darkMark = path.join(brandDir, 'calistrack-mark-dark.svg');
  const lightMark = path.join(brandDir, 'calistrack-mark-light.svg');
  for (const size of [1024, 512, 256, 192, 180, 64, 32, 16]) {
    await pngFromSvg(darkMark, path.join(iconDir, `icon-${size}.png`), size);
  }
  await fs.copyFile(path.join(iconDir, 'icon-180.png'), path.join(iconDir, 'apple-touch-icon.png'));
  await fs.copyFile(path.join(iconDir, 'icon-512.png'), path.join(iconDir, 'maskable-512.png'));
  await pngFromSvg(lightMark, path.join(iconDir, 'favicon-light-32.png'), 32);
  await pngFromSvg(darkMark, path.join(iconDir, 'favicon-dark-32.png'), 32);
  await createIco(path.join(iconDir, 'icon-32.png'), path.join(publicDir, 'favicon.ico'));

  await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#080b0d' } })
    .composite([{
      input: await sharp(path.join(brandDir, 'calistrack-logo-dark.svg'), { density: 384 })
        .resize(820, 220)
        .png()
        .toBuffer(),
      gravity: 'centre',
    }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(brandDir, 'calistrack-og.png'));

  await splash(lightMark, path.join(brandDir, 'splash-light-1290x2796.png'), 1290, 2796, '#f8fafc');
  await splash(darkMark, path.join(brandDir, 'splash-dark-1290x2796.png'), 1290, 2796, '#080b0d');
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
