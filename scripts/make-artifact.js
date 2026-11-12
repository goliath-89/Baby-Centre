// Writes a copy of the app without the document wrapper, for hosts that add their own <head>.
// Usage: node scripts/make-artifact.js <output.html> [page-url]
// The optional page URL lets the app show a ready-to-copy link in its invite steps.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const page = html.split('<!--PAGE-START-->')[1].split('<!--PAGE-END-->')[0].replace('</head>\n<body>\n', '');
if (/<\/?(head|body|html)[\s>]/.test(page)) throw new Error('wrapper tags left in page');
const url = process.argv[3] || '';
if (url && !/^https:\/\/claude\.ai\/[\w\/-]+$/.test(url)) throw new Error('unexpected page url');
const out = url ? page.replace('<script id="core">', '<script>window.BC_SHARE_URL = ' + JSON.stringify(url) + ';</script>\n<script id="core">') : page;
fs.writeFileSync(process.argv[2], out.trim() + '\n');
console.log('wrote', process.argv[2], page.length, 'bytes');
