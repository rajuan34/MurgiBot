const fs = require('fs');
let code = fs.readFileSync('src/Dashboard.tsx', 'utf8');

const importLogsView = `import { LogsView } from './components/dashboard/LogsView';`;
const newImports = `import { LogsView } from './components/dashboard/LogsView';
import { APILogsView } from './components/dashboard/APILogsView';`;
code = code.replace(importLogsView, newImports);

const apiLogsViewUsage = `{activeTab === 'api' && <APILogsView isConnected={isConnected} getHeaders={getHeaders} />}`;

const tabsToInclude = `{['resources', 'alerts', 'api', 'health', 'audit', 'deployments', 'settings'].includes(activeTab) && (`;
const newTabsToInclude = `{['resources', 'alerts', 'health', 'audit', 'deployments', 'settings'].includes(activeTab) && (`;

code = code.replace(tabsToInclude, newTabsToInclude);

const insertAfter = `{activeTab === 'logs' && <LogsView serverLogs={serverLogs} isConnected={isConnected} />}`;
const replacement = `{activeTab === 'logs' && <LogsView serverLogs={serverLogs} isConnected={isConnected} />}
            ${apiLogsViewUsage}`;
code = code.replace(insertAfter, replacement);

const maxWFix = `className={\`mx-auto w-full flex flex-col \${activeTab === 'logs' ? 'max-w-full flex-1 h-full' : 'max-w-7xl'}\`}`;
const newMaxWFix = `className={\`mx-auto w-full flex flex-col \${(activeTab === 'logs' || activeTab === 'api') ? 'max-w-full flex-1 h-full' : 'max-w-7xl'}\`}`;
code = code.replace(maxWFix, newMaxWFix);

fs.writeFileSync('src/Dashboard.tsx', code);
console.log('Patched Dashboard.tsx');
