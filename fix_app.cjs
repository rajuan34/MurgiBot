const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the escaped backticks that were literally inserted
code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/App.tsx', code);
