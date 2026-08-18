const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Master SVG Emblem definition in a clean 300x300 bounding box
const EMBLEM_SVG_PATHS = `
  <defs>
    <!-- Ocean Blue Gradients -->
    <linearGradient id="pwa-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#034b82"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="pwa-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="pwa-grad-3" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#7dd3fc"/>
    </linearGradient>
    <!-- Background Gradients -->
    <linearGradient id="pwa-bg-app" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#063461"/>
      <stop offset="60%" stop-color="#094f8a"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="pwa-bg-maskable" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a5482"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
`;

/**
 * Creates SVG string for emblem in 300x300 viewBox
 * @param {string} [overrideFill] optional color for monochrome white
 */
function getEmblemGroup(overrideFill) {
  const f1 = overrideFill || "url(#pwa-grad-1)";
  const f2 = overrideFill || "url(#pwa-grad-2)";
  const f3 = overrideFill || "url(#pwa-grad-3)";
  const fWrench = overrideFill || "#38bdf8";

  return `
    <!-- Lower Polygon Bar -->
    <path d="M 30 220 L 95 155 L 135 195 L 70 260 Z" fill="${f1}"/>
    <!-- Middle Polygon Bar -->
    <path d="M 90 160 L 165 85 L 205 125 L 130 200 Z" fill="${f2}"/>
    <!-- Rising Arrowhead -->
    <path d="M 155 95 L 265 5 L 265 120 L 215 70 L 195 90 L 195 55 Z" fill="${f3}"/>
    <path d="M 155 95 L 265 5 L 265 115 L 205 170 Z" fill="${f3}"/>
    <!-- Mechanic Wrench Tool -->
    <path d="M 195 195 C 181 181 181 157 195 143 C 205 133 219 128 233 133 L 213 153 L 223 177 L 247 167 L 267 147 C 273 161 267 177 257 187 C 243 201 219 201 205 187 L 155 237 C 145 247 129 247 119 237 C 109 227 109 211 119 201 Z" fill="${fWrench}"/>
  `;
}

/** Standard App Icon SVG (512x512 with rounded rect background & safe margins) */
function createStandardAppIconSvg(size = 512) {
  const scale = 1.35;
  const tx = 62;
  const ty = 72;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
    ${EMBLEM_SVG_PATHS}
    <rect width="512" height="512" rx="96" fill="url(#pwa-bg-app)"/>
    <g transform="translate(${tx}, ${ty}) scale(${scale})">
      ${getEmblemGroup()}
    </g>
  </svg>`;
}

/** Maskable Icon SVG (512x512 full square background with 25% safe area margin) */
function createMaskableIconSvg(size = 512) {
  const scale = 1.05;
  const tx = 100;
  const ty = 100;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
    ${EMBLEM_SVG_PATHS}
    <rect width="512" height="512" fill="url(#pwa-bg-maskable)"/>
    <g transform="translate(${tx}, ${ty}) scale(${scale})">
      ${getEmblemGroup()}
    </g>
  </svg>`;
}

/** Transparent Logo Mark SVG (512x512) */
function createTransparentLogoMarkSvg(size = 512) {
  const scale = 1.45;
  const tx = 45;
  const ty = 58;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
    ${EMBLEM_SVG_PATHS}
    <g transform="translate(${tx}, ${ty}) scale(${scale})">
      ${getEmblemGroup()}
    </g>
  </svg>`;
}

/** Monochrome White Icon SVG (512x512) */
function createMonochromeWhiteIconSvg(size = 512) {
  const scale = 1.35;
  const tx = 62;
  const ty = 72;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
    ${EMBLEM_SVG_PATHS}
    <rect width="512" height="512" rx="96" fill="url(#pwa-bg-app)"/>
    <g transform="translate(${tx}, ${ty}) scale(${scale})">
      ${getEmblemGroup("#ffffff")}
    </g>
  </svg>`;
}

/** Full Horizontal Logo SVG for Navbar / Header */
function createFullHorizontalLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280" width="900" height="280">
    ${EMBLEM_SVG_PATHS}
    <g transform="translate(30, 10) scale(0.95)">
      ${getEmblemGroup()}
    </g>
    <g transform="translate(320, 135)">
      <text x="0" y="0" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="800" font-size="70" fill="#0284c7" letter-spacing="-0.02em">Workflow</text>
      <text x="0" y="65" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="800" font-size="70" fill="#0f2942" letter-spacing="-0.02em">Daune</text>
      <text x="0" y="106" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="600" font-size="26" fill="#64748b" letter-spacing="0.04em">Gestionare Digitală Daune Auto</text>
    </g>
  </svg>`;
}

async function buildAllIcons() {
  const publicDir = path.join(__dirname, "..", "public");

  console.log("Generating PWA & Site Icon Assets...");

  const stdSvg = createStandardAppIconSvg(512);
  const maskableSvg = createMaskableIconSvg(512);
  const transparentSvg = createTransparentLogoMarkSvg(512);
  const monoWhiteSvg = createMonochromeWhiteIconSvg(512);
  const fullLogoSvg = createFullHorizontalLogoSvg();

  // Save SVG files
  fs.writeFileSync(path.join(publicDir, "icon.svg"), stdSvg);
  fs.writeFileSync(path.join(publicDir, "logo.svg"), fullLogoSvg);

  // Render PNGs using Sharp
  // 1. Standard App Icons
  await sharp(Buffer.from(stdSvg)).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  await sharp(Buffer.from(stdSvg)).resize(512, 512).png().toFile(path.join(publicDir, "pwa-512x512.png"));
  await sharp(Buffer.from(stdSvg)).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  await sharp(Buffer.from(stdSvg)).resize(192, 192).png().toFile(path.join(publicDir, "pwa-192x192.png"));

  // 2. Apple Touch Icon (180x180)
  await sharp(Buffer.from(stdSvg)).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));

  // 3. Maskable Icons (With 25% safe zone margin for Android & iOS PWA home screen)
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(publicDir, "maskable-icon-512x512.png"));
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(publicDir, "maskable_icon.png"));
  await sharp(Buffer.from(maskableSvg)).resize(192, 192).png().toFile(path.join(publicDir, "maskable-icon-192x192.png"));
  await sharp(Buffer.from(maskableSvg)).resize(192, 192).png().toFile(path.join(publicDir, "maskable_icon-192.png"));

  // 4. Logo Mark PNGs
  await sharp(Buffer.from(transparentSvg)).resize(512, 512).png().toFile(path.join(publicDir, "logo-mark.png"));
  await sharp(Buffer.from(monoWhiteSvg)).resize(512, 512).png().toFile(path.join(publicDir, "logo-mark-white.png"));

  // 5. Favicons (32x32 PNG and favicon.ico)
  await sharp(Buffer.from(stdSvg)).resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png"));

  // Create ICO file
  const ico32 = await sharp(Buffer.from(stdSvg)).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico32);

  // Clean up old script if present
  const oldScript = path.join(__dirname, "generate-icons.js");
  if (fs.existsSync(oldScript)) fs.unlinkSync(oldScript);

  console.log("All PWA Icon assets successfully generated and saved to /public!");
}

buildAllIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
