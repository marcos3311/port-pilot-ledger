import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs/promises';

const SOURCE = 'resources/icon.png';
const TEMP_SQUARE = 'build/icon_square.png';
const OUTPUT = 'build/icon.ico';

async function main() {
    // Resize/pad to 256x256 square
    await sharp(SOURCE)
        .resize(256, 256, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(TEMP_SQUARE);

    console.log('Created square PNG:', TEMP_SQUARE);

    // Convert to ICO
    const icoBuffer = await pngToIco(TEMP_SQUARE);
    await fs.writeFile(OUTPUT, icoBuffer);

    console.log('Created ICO:', OUTPUT);

    // Cleanup
    await fs.unlink(TEMP_SQUARE);
    console.log('Done!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
