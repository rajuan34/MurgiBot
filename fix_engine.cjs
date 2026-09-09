const fs = require('fs');
const path = './src/components/dashboard/AIEngineView.tsx';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  '  isSending\n}: AIEngineViewProps) {',
  '  isSending,\n  getHeaders\n}: AIEngineViewProps) {'
);

fs.writeFileSync(path, code);
