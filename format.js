const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');
console.log(code);
