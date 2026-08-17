const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const outDir = path.resolve(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0969da');
  grad.addColorStop(1, '#7c3aed');
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  const text = size >= 48 ? 'RC' : 'R';
  const fontSize = size >= 48 ? Math.floor(size * 0.38) : Math.floor(size * 0.55);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + size * 0.04);

  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath}`);
});
