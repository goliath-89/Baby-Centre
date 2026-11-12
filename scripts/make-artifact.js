// Writes a copy of the app without the document wrapper, for hosts that add their own <head>.
// Usage: node scripts/make-artifact.js <output.html>
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const page = html.split('<!--PAGE-START-->')[1].split('<!--PAGE-END-->')[0].replace('</head>\n<body>\n', '');
if (/<\/?(head|body|html)[\s>]/.test(page)) throw new Error('wrapper tags left in page');
fs.writeFileSync(process.argv[2], page.trim() + '\n');
console.log('wrote', process.argv[2], page.length, 'bytes');
