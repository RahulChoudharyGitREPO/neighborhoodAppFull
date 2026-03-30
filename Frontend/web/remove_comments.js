const fs = require('fs');
const file = 'app/map/page.tsx';
let data = fs.readFileSync(file, 'utf8');

// JSX comments on their own line
data = data.replace(/^[ \t]*\{\s*\/\*[\s\S]*?\*\/\s*\}[ \t]*\r?\n/gm, '');
// inline JSX comments
data = data.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

// block comments on their own line
data = data.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\r?\n/gm, '');
// inline block comments
data = data.replace(/\/\*[\s\S]*?\*\//g, '');

// line comments on their own line
data = data.replace(/^[ \t]*\/\/.*?\r?\n/gm, '');
// inline line comments (ignoring http:// and https://)
data = data.replace(/(?<!https?:)\/\/.*?$/gm, '');

fs.writeFileSync(file, data);
console.log('Comments removed.');
