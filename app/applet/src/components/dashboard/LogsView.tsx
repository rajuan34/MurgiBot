import React from 'react';
import { Terminal, Search, Filter, Download, Pause, Play } from 'lucide-react';

export function LogsView({ serverLogs, isConnected }: { serverLogs: any[], isConnected: boolean }) {
  const [isPaused, setIsPaused] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  
  // We freeze the logs array visually if paused
  const displayLogs = React.useMemo(() => {
    return serverLogs.filter(log => 
      !filter || 
      log.message.toLowerCase().includes(filter.toLowerCase()) || 
      log.level.toLowerCase().includes(filter.toLowerCase())
    );
  }, [isPaused ? [] : serverLogs, filter]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-neutral-800 flex flex-wrap gap-4 justify-between items-center bg-neutral-950">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-neutral-300">Live System Logs</h3>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter logs..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)} 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${isPaused ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' : 'border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 bg-[#0a0a0a]">
        {displayLogs.length === 0 ? (
          <div className="text-neutral-600 flex items-center justify-center h-full">No logs match the current criteria...</div>
        ) : (
          displayLogs.map((log, i) => (
            <div key={i} className="flex gap-3 hover:bg-neutral-900/50 p-1 rounded transition-colors group">
              <span className="text-neutral-500 shrink-0 w-24">
                {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, fractionalSecondDigits: 3})}
              </span>
              <span className={`shrink-0 w-16 font-bold ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-neutral-300 break-all">
                {log.message}
                {log.meta && Object.keys(log.meta).length > 0 && (
                  <span className="text-neutral-500 ml-2 block sm:inline mt-1 sm:mt-0">
                    {JSON.stringify(log.meta)}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
