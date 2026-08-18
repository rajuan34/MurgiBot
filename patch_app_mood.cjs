const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Import MoodIndicator
if (!content.includes('MoodIndicator')) {
  content = content.replace(
    "import { LogsView } from './components/dashboard/LogsView';",
    "import { LogsView } from './components/dashboard/LogsView';\nimport { MoodIndicator } from './components/dashboard/MoodIndicator';"
  );
}

// Add MoodIndicator component to Header
const target = `<span className="border-l border-neutral-800 pl-4">
              Latency: {latency > 0 ? \`\${latency}ms\` : '--'}
            </span>`;
            
const replacement = `<span className="border-l border-neutral-800 pl-4">
              Latency: {latency > 0 ? \`\${latency}ms\` : '--'}
            </span>
            <div className="border-l border-neutral-800 pl-4 hidden sm:block">
              <MoodIndicator mood={botState?.emotion} />
            </div>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched with MoodIndicator');
