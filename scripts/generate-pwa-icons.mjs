import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icon.svg"));

for (const size of [192, 512]) {
  const png = await sharp(svg, { density: Math.ceil((size / 512) * 300) })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  writeFileSync(join(root, `public/icon-${size}.png`), png);
  console.log(`Wrote icon-${size}.png (${png.length} bytes)`);
}
