'use strict';
const fs = require('fs');

// 1. Verify all SVG paths in icon-helper.js exist on disk
const helperSrc = fs.readFileSync('plugins/shared/icon-helper.js', 'utf8');
const svgPaths = [...helperSrc.matchAll(/['"]((assets\/icons\/[^'"]+\.svg))['"]/g)].map(m => m[1]);
const uniquePaths = [...new Set(svgPaths)];
let missing = 0;
for (const p of uniquePaths) {
  if (!fs.existsSync(p)) {
    console.log('  MISSING PATH:', p);
    missing++;
  }
}
console.log('Registry path check: ' + uniquePaths.length + ' unique paths, ' + missing + ' missing.');

// 2. Verify all dist/ counterparts are in sync for the 5 replaced files
const distChecks = [
  ['assets/icons/streamline-ultimate-colors-free/actions/external-link.svg',
   'dist/assets/icons/streamline-ultimate-colors-free/actions/external-link.svg'],
  ['assets/icons/streamline-ultimate-colors-free/status/warning.svg',
   'dist/assets/icons/streamline-ultimate-colors-free/status/warning.svg'],
  ['assets/icons/streamline-ultimate-colors-free/status/unavailable.svg',
   'dist/assets/icons/streamline-ultimate-colors-free/status/unavailable.svg'],
  ['assets/icons/streamline-ultimate-colors-free/utility/side-panel-mode.svg',
   'dist/assets/icons/streamline-ultimate-colors-free/utility/side-panel-mode.svg'],
  ['assets/icons/streamline-ultimate-colors-free/utility/popup-mode.svg',
   'dist/assets/icons/streamline-ultimate-colors-free/utility/popup-mode.svg'],
  ['plugins/shared/icon-helper.js', 'dist/plugins/shared/icon-helper.js'],
];
let distMismatch = 0;
for (const [src, dst] of distChecks) {
  if (!fs.existsSync(src)) { console.log('  SOURCE MISSING:', src); distMismatch++; continue; }
  if (!fs.existsSync(dst)) { console.log('  DIST MISSING:', dst); distMismatch++; continue; }
  const srcBuf = fs.readFileSync(src);
  const dstBuf = fs.readFileSync(dst);
  if (!srcBuf.equals(dstBuf)) {
    console.log('  OUT OF SYNC:', dst);
    distMismatch++;
  } else {
    console.log('  IN SYNC:', dst);
  }
}
console.log('Dist sync check: ' + distMismatch + ' file(s) out of sync.');

// 3. Verify utility.sidePanelMode and utility.popupMode are in the registry
const hasPanel    = helperSrc.includes("sidePanelMode:");
const hasPopup    = helperSrc.includes("popupMode:");
const hasUtilSec  = helperSrc.indexOf("sidePanelMode:") < helperSrc.indexOf("calendar:");
console.log('utility.sidePanelMode in registry:', hasPanel ? 'YES' : 'NO');
console.log('utility.popupMode in registry:', hasPopup ? 'YES' : 'NO');
console.log('sidePanelMode is before calendar (in utility section):', hasUtilSec ? 'YES' : 'POSSIBLE ISSUE');

// 4. Verify SVG ids match expected Streamline names
const checks = [
  ['assets/icons/streamline-ultimate-colors-free/actions/external-link.svg', 'Login-1'],
  ['assets/icons/streamline-ultimate-colors-free/status/warning.svg', 'Network-Warning'],
  ['assets/icons/streamline-ultimate-colors-free/status/unavailable.svg', 'Stop-Sign'],
  ['assets/icons/streamline-ultimate-colors-free/utility/side-panel-mode.svg', 'Browser-Page-Layout'],
  ['assets/icons/streamline-ultimate-colors-free/utility/popup-mode.svg', 'Expand-2'],
];
let svgIdErrors = 0;
for (const [file, expectedId] of checks) {
  if (!fs.existsSync(file)) { console.log('  FILE MISSING:', file); svgIdErrors++; continue; }
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(expectedId)) {
    console.log('  SVG ID OK:', file, '-> contains', expectedId);
  } else {
    console.log('  SVG ID WRONG:', file, '-> expected', expectedId);
    svgIdErrors++;
  }
}
console.log('SVG ID check: ' + svgIdErrors + ' error(s).');

console.log('');
console.log(missing + distMismatch + svgIdErrors === 0 ? 'ALL CHECKS PASSED' : 'ISSUES FOUND');
