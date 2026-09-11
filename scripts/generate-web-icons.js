#!/usr/bin/env node

/**
 * Generates crisp PWA and web icons from vector SVG sources:
 * - assets/icon.svg (standard squircle icon)
 * - assets/icon-maskable.svg (full-bleed adaptive icon)
 */

const fs = require('fs');
const path = require('path');

let Resvg;
try {
  ({ Resvg } = require('@resvg/resvg-js'));
} catch {
  try {
    const globalPath = path.join(
      process.env.HOME || '',
      '.nvm/versions/node',
      process.version,
      'lib/node_modules/@resvg/resvg-js',
    );
    ({ Resvg } = require(globalPath));
  } catch (err) {
    console.error('Error: @resvg/resvg-js is required to generate icons.');
    console.error(err);
    process.exit(1);
  }
}

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const standardSvg = fs.readFileSync(path.join(assetsDir, 'icon.svg'), 'utf8');
const maskableSvg = fs.readFileSync(path.join(assetsDir, 'icon-maskable.svg'), 'utf8');

function renderSvg(svgContent, size, outputPath) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
    shapeRendering: 2, // GeometricPrecision
    textRendering: 1, // OptimizeLegibility
    imageRendering: 0, // OptimizeQuality
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(outputPath, pngData);
  console.log(
    `Generated ${path.relative(rootDir, outputPath)} (${size}x${size}, ${pngData.length} bytes)`,
  );
}

console.log('Generating PWA and Web icons...');

// Standard PWA icons (squircle base with transparent margin)
renderSvg(standardSvg, 192, path.join(publicDir, 'icon-192.png'));
renderSvg(standardSvg, 512, path.join(publicDir, 'icon-512.png'));

// Maskable PWA icons (full-bleed background for Android adaptive shapes)
renderSvg(maskableSvg, 192, path.join(publicDir, 'icon-maskable-192.png'));
renderSvg(maskableSvg, 512, path.join(publicDir, 'icon-maskable-512.png'));

// Apple Touch Icon (180x180 full-bleed so iOS does not add black corners)
renderSvg(maskableSvg, 180, path.join(publicDir, 'apple-touch-icon.png'));

// Favicons (PNG versions for modern browsers)
renderSvg(standardSvg, 32, path.join(publicDir, 'favicon-32x32.png'));
renderSvg(standardSvg, 16, path.join(publicDir, 'favicon-16x16.png'));

console.log('All icons generated successfully!');
