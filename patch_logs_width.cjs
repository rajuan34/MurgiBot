const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/LogsView.tsx', 'utf8');

content = content.replace(
  'className="text-neutral-500 shrink-0 w-24"',
  'className="text-neutral-500 shrink-0 w-40"'
);

fs.writeFileSync('src/components/dashboard/LogsView.tsx', content);
console.log('LogsView width patched');
