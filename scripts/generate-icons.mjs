import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('./public/app-icon.svg');
const publicDir = path.resolve('./public');

const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-512x512-maskable.png', size: 512 }, // We can reuse it since maskable padding is good
    { name: 'apple-touch-icon-180x180.png', size: 180 },
];

async function generate() {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const { name, size } of sizes) {
        const outPath = path.join(publicDir, name);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outPath);
        console.log(`Generated ${name}`);
    }
}

generate().catch(console.error);
