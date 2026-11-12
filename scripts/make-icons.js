// Renders icon.svg to the PNG sizes the manifest and iOS need.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const root = path.join(__dirname, '..'), svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
  const b = await chromium.launch();
  for (const n of [180, 192, 512]) {
    const p = await b.newPage({ viewport: { width: n, height: n } });
    await p.setContent('<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>' + svg);
    await p.screenshot({ path: path.join(root, `icon-${n}.png`) }); await p.close();
  }
  await b.close();
})();
