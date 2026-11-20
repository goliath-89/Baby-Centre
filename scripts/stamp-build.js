// Stamps the build time and the release notes into index.html, so the app can show both under More > About.
// Run before every release: node scripts/stamp-build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), file = path.join(root, 'index.html');
const md = fs.readFileSync(path.join(root, 'RELEASE_NOTES.md'), 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
let out = '', list = null, table = null, para = [];
const flush = () => {
  if (para.length) { out += '<p>' + inline(para.join(' ')) + '</p>'; para = []; }
  if (list) { out += '</' + list + '>'; list = null; }
  if (table) { out += '<div class="tw"><table>' + table.map((r, i) => '<tr>' + r.map(c => (i ? '<td>' : '<th>') + inline(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table></div>'; table = null; }
};
for (const raw of md.split('\n')) {
  const line = raw.replace(/\s+$/, ''), t = line.trim();
  if (/^# /.test(t)) continue;
  if (!t) { flush(); continue; }
  let m;
  if ((m = /^(#{2,3}) (.*)/.exec(t))) { flush(); out += (m[1] === '##' ? '<h3>' : '<h4>') + inline(m[2]) + (m[1] === '##' ? '</h3>' : '</h4>'); continue; }
  if (t[0] === '|') { if (para.length || list) flush(); if (/^\|[\s|:-]+\|$/.test(t)) continue; (table = table || []).push(t.slice(1, -1).split('|').map(c => c.trim())); continue; }
  if ((m = /^(?:[-*]|(\d+)\.) (.*)/.exec(t))) { const kind = m[1] ? 'ol' : 'ul'; if (para.length || table || (list && list !== kind)) flush(); if (!list) { out += '<' + kind + '>'; list = kind; } out += '<li>' + inline(m[2]) + '</li>'; continue; }
  if (list && /^\s{2,}/.test(line)) { out = out.replace(/<\/li>$/, ' ' + inline(t) + '</li>'); continue; }
  if (list || table) flush();
  para.push(t);
}
flush();
const built = new Date().toISOString();
const html = fs.readFileSync(file, 'utf8'), re = /<template id="relnotes"[^>]*>[\s\S]*?<\/template>/;
if (!re.test(html)) throw new Error('index.html has no <template id="relnotes">');
fs.writeFileSync(file, html.replace(re, () => '<template id="relnotes" data-built="' + built + '">' + out + '</template>'));
console.log('stamped', built, (out.length / 1024).toFixed(1) + ' KB of release notes');
