import React, { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Search, RefreshCw, XCircle } from 'lucide-react';

export function APILogsView({ isConnected, getHeaders }: { isConnected: boolean, getHeaders: () => HeadersInit }) {
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchApiLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/calls', { headers: getHeaders() });
      if (res.ok) {
        setApiLogs(await res.json());
      }
    } catch(e) {
      console.error("Failed to fetch API logs", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiLogs();
    const interval = setInterval(() => {
      fetchApiLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayLogs = React.useMemo(() => {
    return apiLogs.filter(log => 
      !filter || 
      log.provider.toLowerCase().includes(filter.toLowerCase()) || 
      log.status.toLowerCase().includes(filter.toLowerCase())
    );
  }, [apiLogs, filter]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[400px] flex-1">
      <div className="p-4 border-b border-neutral-800 flex flex-wrap gap-4 justify-between items-center bg-neutral-950">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-neutral-300">API Call History</h3>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter by provider or status..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchApiLogs} 
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="bg-neutral-900/50 sticky top-0 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-300">Timestamp</th>
              <th className="px-4 py-3 font-medium text-neutral-300">Provider</th>
              <th className="px-4 py-3 font-medium text-neutral-300">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-300">Latency</th>
              <th className="px-4 py-3 font-medium text-neutral-300">Error Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {displayLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                  No API calls recorded yet.
                </td>
              </tr>
            ) : (
              displayLogs.map((log, i) => (
                <tr key={i} className="hover:bg-neutral-900/50 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-300">
                    {log.provider}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'success' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Success</span>}
                    {log.status === 'rate_limit' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 text-xs font-medium"><AlertTriangle className="w-3 h-3" /> Rate Limited</span>}
                    {log.status === 'error' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium"><XCircle className="w-3 h-3" /> Error</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                      <Clock className="w-3 h-3" /> {log.latencyMs}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-red-400/80 truncate max-w-[300px]" title={log.errorDetail}>
                    {log.errorDetail || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
