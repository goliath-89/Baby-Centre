// Renders icon.svg to the PNG sizes the manifest and iOS need.
// "any" icons use the artwork full size; the maskable icon shrinks it so launchers that crop to a circle keep all of it.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const root = path.join(__dirname, '..'), svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
  const safe = svg.replace('<g id="art"', '<g id="art" transform="translate(256 256) scale(.74) translate(-256 -256)"');
  if (safe === svg) throw new Error('icon.svg needs a <g id="art"> group');
  const b = await chromium.launch();
  for (const [name, n, src] of [['icon-180.png', 180, svg], ['icon-192.png', 192, svg], ['icon-512.png', 512, svg], ['icon-maskable-512.png', 512, safe]]) {
    const p = await b.newPage({ viewport: { width: n, height: n } });
    await p.setContent('<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>' + src);
    await p.screenshot({ path: path.join(root, name) }); await p.close();
  }
  await b.close();
})();
