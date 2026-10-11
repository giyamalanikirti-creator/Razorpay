/* Syntax-check the inline script of the built index.html (catches a broken bundle before any browser test). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('No inline script found'); process.exit(1); }
try { new vm.Script(m[1], { filename: 'index.html' }); console.log(`Bundle syntax OK (${Math.round(m[1].length / 1024)} KB of script)`); }
catch (e) { console.error('Bundle syntax error:', e.message); process.exit(1); }
