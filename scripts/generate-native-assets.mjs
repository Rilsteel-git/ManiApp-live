import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const logoPath = path.join(root, 'public', 'mani-app-logo.png');
const iconBackground = '#f4f6f4';

async function createCanvasWithLogo(width, height, logoScale, background, outputPath) {
  const logoSize = Math.round(Math.min(width, height) * logoScale);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(outputPath);
}

async function generateAndroidIcons() {
  const densities = [
    ['mdpi', 48],
    ['hdpi', 72],
    ['xhdpi', 96],
    ['xxhdpi', 144],
    ['xxxhdpi', 192]
  ];

  for (const [density, size] of densities) {
    const directory = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
    await createCanvasWithLogo(size, size, 0.82, iconBackground, path.join(directory, 'ic_launcher.png'));
    await createCanvasWithLogo(size, size, 0.82, iconBackground, path.join(directory, 'ic_launcher_round.png'));

    const foregroundSize = Math.round(size * 2.25);
    const logoSize = Math.round(foregroundSize * 0.64);
    const foreground = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain' })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: foregroundSize,
        height: foregroundSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: foreground, gravity: 'centre' }])
      .png()
      .toFile(path.join(directory, 'ic_launcher_foreground.png'));
  }

  const backgroundPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'ic_launcher_background.xml');
  await writeFile(backgroundPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${iconBackground}</color>\n</resources>\n`);
}

async function generateAndroidSplashIcon() {
  const directory = path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi');
  await mkdir(directory, { recursive: true });
  const canvasSize = 288;
  const logoSize = 132;
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();
  const brand = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}"><text x="144" y="206" dominant-baseline="middle" text-anchor="middle" fill="#008f1d" font-family="Arial, sans-serif" font-size="16" font-weight="700">Mani App</text></svg>`
  );
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: logo, left: Math.round((canvasSize - logoSize) / 2), top: 60 },
      { input: brand, left: 0, top: 0 }
    ])
    .png()
    .toFile(path.join(directory, 'splash_icon.png'));
}

async function generateSplashImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await generateSplashImages(path.join(directory, entry.name));
      continue;
    }
    if (entry.name !== 'splash.png' && !entry.name.startsWith('splash-2732x2732')) continue;

    const outputPath = path.join(directory, entry.name);
    const { width, height } = await sharp(outputPath).metadata();
    if (!width || !height) continue;
    await createCanvasWithLogo(width, height, 0.2, iconBackground, outputPath);
  }
}

async function generateIosIcon() {
  const outputPath = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  await createCanvasWithLogo(1024, 1024, 0.82, iconBackground, outputPath);
}

await generateAndroidIcons();
await generateAndroidSplashIcon();
await generateSplashImages(path.join(root, 'android', 'app', 'src', 'main', 'res'));
await generateIosIcon();
await generateSplashImages(path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset'));
console.log('Generated Mani App icons and splash images for Android and iOS.');
