import sharp from "sharp";

const sizes = [192, 512];

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0a0a0c"/>
  <rect x="32" y="32" width="448" height="448" rx="80" fill="#111114"/>
  <text x="256" y="320" font-family="system-ui,sans-serif" font-size="280" font-weight="700" fill="#6366f1" text-anchor="middle">A</text>
</svg>`;

async function main() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`);
    console.log(`Generated icon-${size}.png`);
  }
}
main();
