const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

code = code.replace(/      <\/div>\n    <\/div>\n  \);\n    <\/div>\n  \);\}/g, '      </div>\n    </div>\n  );\n}');
fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
console.log('Fixed syntax');
