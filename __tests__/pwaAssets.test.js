/* global Buffer, __dirname */
const fs = require('fs');
const path = require('path');

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (
    !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    throw new Error(`File at ${filePath} is not a valid PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('PWA and Web Assets Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const indexHtmlPath = path.join(publicDir, 'index.html');
  const rootHtmlPath = path.join(rootDir, 'src/app/+html.tsx');

  test('manifest.json exists and contains valid required PWA metadata', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.short_name).toBe('Family Expense');
    expect(manifest.name).toBe('Family Expense Manager');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1E1B4B');
    expect(manifest.background_color).toBe('#0F172A');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
  });

  test('all icons referenced in manifest.json exist on disk with valid PNG headers and matching dimensions', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const icon of manifest.icons) {
      const relativePath = icon.src.replace(/^\//, '');
      const iconPath = path.join(publicDir, relativePath);

      expect(fs.existsSync(iconPath)).toBe(true);

      const [expectedW, expectedH] = icon.sizes.split('x').map(Number);
      const { width, height } = readPngDimensions(iconPath);

      expect(width).toBe(expectedW);
      expect(height).toBe(expectedH);
    }
  });

  test('manifest specifies both standard and maskable icon purposes', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const purposes = manifest.icons.map((i) => i.purpose);

    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
  });

  test('apple-touch-icon.png exists with 180x180 resolution', () => {
    const appleIconPath = path.join(publicDir, 'apple-touch-icon.png');
    expect(fs.existsSync(appleIconPath)).toBe(true);

    const { width, height } = readPngDimensions(appleIconPath);
    expect(width).toBe(180);
    expect(height).toBe(180);
  });

  test('public/index.html and src/app/+html.tsx link to manifest and apple touch icon', () => {
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    const rootHtml = fs.readFileSync(rootHtmlPath, 'utf8');

    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(indexHtml).toContain('apple-touch-icon');
    expect(indexHtml).toContain('favicon-32x32.png');

    expect(rootHtml).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(rootHtml).toContain('apple-touch-icon');
    expect(rootHtml).toContain('favicon-32x32.png');
  });
});
