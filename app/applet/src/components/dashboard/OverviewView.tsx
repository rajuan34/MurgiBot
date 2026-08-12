import React from 'react';
import { Cpu, Database, Network, Clock, Activity, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function OverviewView({ metrics, isConnected }: { metrics: any, isConnected: boolean }) {
  // Mock data for the charts since we don't have historical data in the backend yet
  const cpuData = Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    value: Math.random() * 30 + (metrics?.cpu?.usage || 10)
  }));

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d > 0 ? d+'d ' : ''}${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">CPU Usage</h3>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics ? `${metrics.cpu.usage}%` : '--'}
          </div>
          <div className="text-xs text-neutral-500">
            {metrics ? `${metrics.cpu.cores} Cores` : 'Loading...'}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">Memory Usage</h3>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics ? `${metrics.memory.usagePercent}%` : '--'}
          </div>
          <div className="text-xs text-neutral-500">
            {metrics ? `${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}` : 'Loading...'}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">System Uptime</h3>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics ? formatUptime(metrics.uptime) : '--'}
          </div>
          <div className="text-xs text-neutral-500">
            Since last restart
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">System Health</h3>
            <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {isConnected ? 'Healthy' : 'Degraded'}
          </div>
          <div className="text-xs text-neutral-500">
            All primary services online
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 h-80">
          <h3 className="text-sm font-bold text-neutral-300 mb-6 uppercase tracking-wider">CPU Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cpuData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis stroke="#525252" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', fontSize: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-neutral-300 mb-4 uppercase tracking-wider">Missing Connectors</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-400">Database Engine</span>
              </div>
              <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">Unavailable</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Network className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-400">Network Interfaces</span>
              </div>
              <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">Not Connected</span>
            </div>
            <div className="p-3 text-xs text-neutral-500 flex gap-2 items-start mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
              <p>Some metrics are unavailable because the monitoring agent lacks permissions or the services are not deployed in this environment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
