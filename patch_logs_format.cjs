const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/LogsView.tsx', 'utf8');

content = content.replace(
  "{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, fractionalSecondDigits: 3})}",
  "{new Date(log.timestamp).toLocaleString()}"
);

fs.writeFileSync('src/components/dashboard/LogsView.tsx', content);
console.log('LogsView time patched');
