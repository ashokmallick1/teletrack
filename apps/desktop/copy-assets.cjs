const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/renderer');
const distDir = path.join(__dirname, 'dist/renderer');

fs.mkdirSync(distDir, { recursive: true });

for (const file of ['index.html', 'style.css']) {
  const src = path.join(srcDir, file);
  const dist = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dist);
    console.log(`Copied ${file} -> dist/renderer/`);
  }
}
