const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

content = content.replace(
  "{botState?.identity?.currentMood || '--'}",
  "{botState?.emotion || '--'}"
);

fs.writeFileSync('src/components/dashboard/OverviewView.tsx', content);
console.log('OverviewView mood patched');
