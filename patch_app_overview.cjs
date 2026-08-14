const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('botState={botState}')) {
  code = code.replace(
    '<OverviewView metrics={metrics} isConnected={isConnected} />',
    '<OverviewView metrics={metrics} isConnected={isConnected} botState={botState} />'
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx updated");
} else {
  console.log("App.tsx already updated");
}
