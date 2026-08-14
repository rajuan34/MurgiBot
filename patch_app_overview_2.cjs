const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (code.includes('<OverviewView metrics={metrics} isConnected={isConnected} />')) {
  code = code.replace(
    '<OverviewView metrics={metrics} isConnected={isConnected} />',
    '<OverviewView metrics={metrics} isConnected={isConnected} botState={botState} />'
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx overview updated");
} else {
  console.log("App.tsx overview not found or already updated");
}
