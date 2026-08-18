import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1) Horizontal brand logo
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" width="900" height="300">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f4c81"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#7dd3fc"/>
    </linearGradient>
  </defs>

  <!-- Logo Mark Group -->
  <g transform="translate(40, 20)">
    <!-- Lower Polygon -->
    <path d="M 40 200 L 95 145 L 130 180 L 75 235 Z" fill="url(#grad1)"/>
    <!-- Middle Polygon -->
    <path d="M 90 150 L 155 85 L 190 120 L 125 185 Z" fill="url(#grad2)"/>
    <!-- Upper Arrow Head -->
    <path d="M 150 90 L 235 5 L 235 110 L 195 70 L 175 90 L 175 55 Z" fill="url(#grad3)"/>
    <path d="M 150 90 L 235 5 L 235 105 L 190 150 Z" fill="url(#grad3)"/>
    <!-- Wrench -->
    <path d="M 180 180 C 168 168 168 148 180 136 C 188 128 200 124 212 128 L 196 144 L 204 164 L 224 156 L 240 140 C 244 152 240 164 232 172 C 220 184 200 184 188 172 L 140 220 C 132 228 120 228 112 220 C 104 212 104 200 112 192 Z" fill="#0284c7"/>
  </g>

  <!-- Text Group -->
  <g transform="translate(300, 140)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="72" fill="#0284c7">Workflow</text>
    <text x="0" y="65" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="72" fill="#0f2942">Daune</text>
    <text x="0" y="110" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="28" fill="#475569" letter-spacing="0.5">Gestionare Digitală Daune Auto</text>
  </g>
</svg>`;

writeFileSync(join(root, "public/logo.svg"), logoSvg);
console.log("Wrote public/logo.svg");

// Shared logo mark (transparent) — used for logo-mark.svg and PNG exports.
const logoMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="m1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f4c81"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="m2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="m3" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#7dd3fc"/>
    </linearGradient>
  </defs>
  <g transform="translate(50, 42)">
    <path d="M 70 320 L 150 240 L 200 290 L 120 370 Z" fill="url(#m1)"/>
    <path d="M 140 250 L 240 150 L 290 200 L 190 300 Z" fill="url(#m2)"/>
    <path d="M 230 160 L 350 40 L 350 185 L 285 250 Z" fill="url(#m3)"/>
    <path d="M 280 290 C 262 272 262 242 280 224 C 292 212 310 206 328 212 L 304 236 L 316 266 L 346 254 L 370 230 C 376 248 370 266 358 278 C 340 296 310 296 292 278 L 220 350 C 208 362 190 362 178 350 C 166 338 166 320 178 308 Z" fill="#0f4c81"/>
  </g>
</svg>`;

writeFileSync(join(root, "public/logo-mark.svg"), logoMarkSvg);
console.log("Wrote public/logo-mark.svg");

// 2) Square app icon vector
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0f2942"/>
    </linearGradient>
    <linearGradient id="p1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="p2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="p3" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Logo Mark -->
  <g transform="translate(60, 50)">
    <!-- Lower Polygon -->
    <path d="M 70 320 L 150 240 L 200 290 L 120 370 Z" fill="url(#p1)"/>
    <!-- Middle Polygon -->
    <path d="M 140 250 L 240 150 L 290 200 L 190 300 Z" fill="url(#p2)"/>
    <!-- Arrowhead -->
    <path d="M 230 160 L 350 40 L 350 190 L 295 135 L 265 165 L 265 110 Z" fill="url(#p3)"/>
    <path d="M 230 160 L 350 40 L 350 185 L 285 250 Z" fill="url(#p3)"/>

    <!-- Wrench -->
    <path d="M 280 290 C 262 272 262 242 280 224 C 292 212 310 206 328 212 L 304 236 L 316 266 L 346 254 L 370 230 C 376 248 370 266 358 278 C 340 296 310 296 292 278 L 220 350 C 208 362 190 362 178 350 C 166 338 166 320 178 308 Z" fill="#38bdf8"/>
  </g>
</svg>`;

writeFileSync(join(root, "public/icon.svg"), iconSvg);
console.log("Wrote public/icon.svg");

// 3) Full-bleed maskable icon
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="50%" stop-color="#0f4c81"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="mp1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="mp2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#mbg)"/>
  <circle cx="256" cy="256" r="200" fill="rgba(255, 255, 255, 0.08)"/>
  <g transform="translate(85, 75) scale(0.85)">
    <path d="M 70 320 L 150 240 L 200 290 L 120 370 Z" fill="#0284c7"/>
    <path d="M 140 250 L 240 150 L 290 200 L 190 300 Z" fill="url(#mp1)"/>
    <path d="M 230 160 L 350 40 L 350 185 L 285 250 Z" fill="url(#mp2)"/>
    <path d="M 280 290 C 262 272 262 242 280 224 C 292 212 310 206 328 212 L 304 236 L 316 266 L 346 254 L 370 230 C 376 248 370 266 358 278 C 340 296 310 296 292 278 L 220 350 C 208 362 190 362 178 350 C 166 338 166 320 178 308 Z" fill="#ffffff"/>
  </g>
</svg>`;

// 4) Monochrome mark (white)
const whiteMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(50, 42)">
    <path d="M 70 320 L 150 240 L 200 290 L 120 370 Z" fill="#ffffff"/>
    <path d="M 140 250 L 240 150 L 290 200 L 190 300 Z" fill="#ffffff"/>
    <path d="M 230 160 L 350 40 L 350 185 L 285 250 Z" fill="#ffffff"/>
    <path d="M 280 290 C 262 272 262 242 280 224 C 292 212 310 206 328 212 L 304 236 L 316 266 L 346 254 L 370 230 C 376 248 370 266 358 278 C 340 296 310 296 292 278 L 220 350 C 208 362 190 362 178 350 C 166 338 166 320 178 308 Z" fill="#ffffff"/>
  </g>
</svg>`;

const iconBuffer = Buffer.from(iconSvg);
const maskableBuffer = Buffer.from(maskableSvg);
const markBuffer = Buffer.from(logoMarkSvg);
const whiteMarkBuffer = Buffer.from(whiteMarkSvg);

const icon192 = await sharp(iconBuffer)
  .resize(192, 192)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/icon-192x192.png"), icon192);
writeFileSync(join(root, "public/pwa-192x192.png"), icon192);
writeFileSync(join(root, "public/icon-192.png"), icon192);
console.log("Wrote public/icon-192x192.png");

const icon512 = await sharp(iconBuffer)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/icon-512x512.png"), icon512);
writeFileSync(join(root, "public/pwa-512x512.png"), icon512);
writeFileSync(join(root, "public/icon-512.png"), icon512);
console.log("Wrote public/icon-512x512.png");

const appleTouchIcon = await sharp(iconBuffer)
  .resize(180, 180)
  .flatten({ background: "#0f172a" })
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/apple-touch-icon.png"), appleTouchIcon);
console.log("Wrote public/apple-touch-icon.png (180x180)");

const maskable512 = await sharp(maskableBuffer)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/maskable-icon-512x512.png"), maskable512);
writeFileSync(join(root, "public/maskable_icon.png"), maskable512);
console.log("Wrote public/maskable_icon.png");

const maskable192 = await sharp(maskableBuffer)
  .resize(192, 192)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/maskable_icon-192.png"), maskable192);
console.log("Wrote public/maskable_icon-192.png");

const logoMarkPng = await sharp(markBuffer)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/logo-mark.png"), logoMarkPng);
console.log("Wrote public/logo-mark.png");

const logoMarkWhitePng = await sharp(whiteMarkBuffer)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(root, "public/logo-mark-white.png"), logoMarkWhitePng);
console.log("Wrote public/logo-mark-white.png");

const favicon = await sharp(iconBuffer)
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync(join(root, "public/favicon.ico"), favicon);
console.log("Wrote public/favicon.ico");
