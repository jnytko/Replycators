/**
 * Package script — zips the dist/ folder into a .crx-ready zip file.
 * Run: node build/package.js
 */

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const DIST     = path.resolve(ROOT, 'dist');
const OUT_FILE = path.resolve(ROOT, 'build', 'replycators.zip');

async function createPackage() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ not found. Run "npm run build" first.');
    process.exit(1);
  }

  const output = fs.createWriteStream(OUT_FILE);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const kb = (archive.pointer() / 1024).toFixed(1);
    console.log(`✅  Package created: ${OUT_FILE} (${kb} KB)`);
  });

  archive.on('error', (err) => { throw err; });

  archive.pipe(output);
  archive.directory(DIST, false);
  await archive.finalize();
}

createPackage().catch(console.error);
