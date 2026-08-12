const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
if (!code.includes("AIEngineView")) {
  code = code.replace(
    "import { LogsView } from './components/dashboard/LogsView';",
    "import { LogsView } from './components/dashboard/LogsView';\nimport { AIEngineView } from './components/dashboard/AIEngineView';"
  );
}

// State
const stateToAdd = `
  const [botState, setBotState] = useState<any>(null);
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
`;
if (!code.includes("botState")) {
  code = code.replace(
    "const [latency, setLatency] = useState(0);",
    "const [latency, setLatency] = useState(0);" + stateToAdd
  );
}

// fetchState 
const newFetchState = `
  const fetchState = async () => {
    try {
      const start = performance.now();
      const res = await fetch('/api/system/metrics');
      if (res.ok) {
        const end = performance.now();
        setLatency(Math.round(end - start));
        setMetrics(await res.json());
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
      
      const botRes = await fetch('/api/state');
      if (botRes.ok) {
        setBotState(await botRes.json());
      }
    } catch (e) {
      setIsConnected(false);
    }
  };
`;
if (!code.includes("/api/state")) {
  code = code.replace(/const fetchState = async \(\) => \{[\s\S]*?catch \(e\) \{\s*setIsConnected\(false\);\s*\}\s*\};/, newFetchState.trim());
}

// Add sendMessage and exportChatLog
const chatFunctions = `
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      setChatLog(prev => [...prev, { role: 'murgi', text: data.text || 'Error processing thought.' }]);
      fetchState(); 
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Connection Failed]' }]);
    }
  };

  const exportChatLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chatLog));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "murgi_chat_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
`;

if (!code.includes("sendMessage")) {
  code = code.replace("const fetchLogs = async", chatFunctions + "\n  const fetchLogs = async");
}

// Add render 
const aiEngineRender = `{activeTab === 'ai-engine' && <AIEngineView botState={botState} chatLog={chatLog} input={input} setInput={setInput} sendMessage={sendMessage} exportChatLog={exportChatLog} fetchState={fetchState} isConnected={isConnected} latency={latency} />}`;
if (!code.includes("ai-engine")) {
  code = code.replace(
    "{activeTab === 'tasks' && <TasksView />}",
    "{activeTab === 'tasks' && <TasksView />}\n            " + aiEngineRender
  );
}

fs.writeFileSync('src/App.tsx', code);
