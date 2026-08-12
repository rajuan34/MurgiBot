const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `import { Activity, Brain, Server, Shield, RefreshCw, MessageSquare, Heart, Database, Send, Cpu, Clock, Zap, Terminal } from 'lucide-react';`,
  `import { Activity, Brain, Server, Shield, RefreshCw, MessageSquare, Heart, Database, Send, Cpu, Clock, Zap, Terminal, Download } from 'lucide-react';`
);

const exportFunc = `
  const exportChatLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chatLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "murgi_chat_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
`;

code = code.replace(
  `  const sendMessage = async (e: React.FormEvent) => {`,
  `${exportFunc}\n  const sendMessage = async (e: React.FormEvent) => {`
);

const headerTarget = `              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-4">
                Direct Neural Injector (Admin Chat)
              </h2>`;

const headerReplacement = `              <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-4">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  Direct Neural Injector (Admin Chat)
                </h2>
                <button
                  onClick={exportChatLog}
                  disabled={chatLog.length === 0}
                  title="Export chat as JSON"
                  className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>`;

code = code.replace(headerTarget, headerReplacement);

fs.writeFileSync('src/App.tsx', code);
