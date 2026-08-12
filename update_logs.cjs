const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add serverLogs state
code = code.replace(
  `  const [latency, setLatency] = useState(0);`,
  `  const [latency, setLatency] = useState(0);\n  const [serverLogs, setServerLogs] = useState<any[]>([]);`
);

// 2. Add fetchLogs
const fetchLogsStr = `
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setServerLogs(data);
      }
    } catch(e) {}
  };
`;
code = code.replace(
  `  const fetchState = async () => {`,
  fetchLogsStr + `\n  const fetchState = async () => {`
);

// 3. Add to interval
code = code.replace(
  `    const interval = setInterval(fetchState, 3000);`,
  `    fetchLogs();\n    const interval = setInterval(() => { fetchState(); fetchLogs(); }, 3000);`
);

// 4. Update Event Stream section to use serverLogs
const eventStreamStart = `              {/* Event Stream */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-yellow-400" /> Event Stream
                </h2>
                <div className="space-y-2 flex-1 overflow-y-auto font-mono text-xs max-h-[140px] pr-2">
                  {eventLog.length === 0 ? (
                    <div className="text-neutral-600 italic">Waiting for system events...</div>
                  ) : (
                    eventLog.map((ev, i) => (
                      <div key={i} className="flex gap-3 mb-1">
                        <span className="text-neutral-500 shrink-0">[{ev.time.toLocaleTimeString()}]</span>
                        <span className="text-neutral-300 break-words">{ev.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>`;

const newEventStream = `              {/* Event Stream (Backend Logs) */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-400" /> Backend Logs
                  </div>
                  <span className="relative flex h-2 w-2">
                    {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={\`relative inline-flex rounded-full h-2 w-2 \${isConnected ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                  </span>
                </h2>
                <div className="space-y-1.5 flex-1 overflow-y-auto font-mono text-[10px] sm:text-xs max-h-[140px] pr-2">
                  {serverLogs.length === 0 ? (
                    <div className="text-neutral-600 italic">Waiting for backend logs...</div>
                  ) : (
                    serverLogs.map((log, i) => (
                      <div key={i} className="flex gap-2 mb-1">
                        <span className="text-neutral-500 shrink-0">
                          [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]
                        </span>
                        <span className={\`shrink-0 \${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}\`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-neutral-300 break-words">
                          {log.message}
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <span className="text-neutral-500 ml-1">
                              {JSON.stringify(log.meta)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>`;

code = code.replace(eventStreamStart, newEventStream);

fs.writeFileSync('src/App.tsx', code);
