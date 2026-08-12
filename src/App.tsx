import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/dashboard/Sidebar';
import { OverviewView } from './components/dashboard/OverviewView';
import { TasksView } from './components/dashboard/TasksView';
import { LogsView } from './components/dashboard/LogsView';
import { AIEngineView } from './components/dashboard/AIEngineView';
import { Activity, ShieldAlert, Rocket, Database, Settings, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [botState, setBotState] = useState<any>(null);
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  
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

  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    
    const userMsg = input;
    setInput('');
    setIsSending(true);
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
    } finally {
      setIsSending(false);
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

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        setServerLogs(await res.json());
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchState();
    fetchLogs();
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans flex h-screen overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-neutral-400 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Activity className="w-5 h-5 text-emerald-500" />
              OpsCenter
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm text-neutral-400">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              {isConnected ? 'Connected to Production' : 'Connection Lost'}
            </span>
            <span className="border-l border-neutral-800 pl-4">
              Latency: {latency > 0 ? `${latency}ms` : '--'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-full px-3 py-1">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                SA
              </div>
              <span className="text-xs font-medium text-neutral-300">Admin</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && <OverviewView metrics={metrics} isConnected={isConnected} />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'ai-engine' && <AIEngineView botState={botState} chatLog={chatLog} input={input} setInput={setInput} sendMessage={sendMessage} exportChatLog={exportChatLog} fetchState={fetchState} isConnected={isConnected} latency={latency} isSending={isSending} />}
            {activeTab === 'logs' && <LogsView serverLogs={serverLogs} isConnected={isConnected} />}
            
            {/* Placeholder for unimplemented tabs */}
            {['resources', 'alerts', 'api', 'health', 'audit', 'deployments', 'settings'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
                <ShieldAlert className="w-16 h-16 text-neutral-800 mb-6" />
                <h2 className="text-xl font-bold text-neutral-300 mb-2 capitalize">{activeTab} Interface</h2>
                <p className="text-neutral-500 text-sm mb-6">
                  This module requires additional backend agent configuration to connect to your cloud infrastructure. 
                  Real metrics for this segment are currently unavailable in the baseline runtime environment.
                </p>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                >
                  Return to Overview
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
