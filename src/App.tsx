/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Activity, Brain, Server, Shield, RefreshCw, MessageSquare, Heart, Database, Send } from 'lucide-react';

interface BotState {
  identity: string;
  providers: Array<{
    name: string;
    healthy: boolean;
    failures: number;
  }>;
  emotion: string;
  memory: {
    activeConversations: number;
    knownUsers: number;
  };
  discord: {
    connected: boolean;
    botTag: string;
  };
}

export default function App() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLog, setChatLog] = useState<{role: 'user'|'murgi', text: string}[]>([]);
  const [input, setInput] = useState('');

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setBotState(data);
      }
    } catch (e) {
      // Silently fail during dev server restarts or network dips
      // to prevent spurious console errors from triggering the platform error reporter.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input.trim();
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
      fetchState(); // Instantly fetch new state (like mood change)
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Connection Failed]' }]);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-500" />
              Murgi AI Core
            </h1>
            <p className="text-sm text-neutral-400 mt-1">Autonomous Digital Character Control Panel</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${botState?.discord.connected ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-neutral-800/50 border-neutral-700 text-neutral-400'}`}>
              <MessageSquare className="w-3 h-3" />
              Discord: {loading ? '...' : botState?.discord.botTag}
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Brain Active
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Left Column: Stats */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Identity & Emotion */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" /> State Engine
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Current Mood</p>
                  <div className="text-lg font-medium text-pink-300">
                    {loading ? '...' : botState?.emotion}
                  </div>
                </div>
                <div className="h-px bg-neutral-800 w-full" />
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Active Profile (Avatar)</p>
                  <div className="text-lg font-medium text-purple-300">
                    {loading ? '...' : botState?.identity}
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Stats */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" /> Memory Node
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Short-Term Contexts</span>
                  <span className="font-mono text-sm text-white">{botState?.memory.activeConversations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Long-Term Entities</span>
                  <span className="font-mono text-sm text-white">{botState?.memory.knownUsers || 0}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Middle & Right Column */}
          <div className="md:col-span-3 space-y-6 flex flex-col">
            
            {/* AI Providers Module */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" /> Provider Resilience
                </h2>
                <button onClick={fetchState} className="text-neutral-500 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loading ? (
                  <div className="text-sm text-neutral-500">Loading providers...</div>
                ) : (
                  botState?.providers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                      <div className="flex items-center gap-3">
                        {p.healthy ? (
                          <Shield className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-medium text-sm text-neutral-300">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {p.failures >= 3 ? (
                          <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20">Circuit Open</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Active</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Interaction Test */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col flex-1 min-h-[400px]">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-4">
                Direct Neural Injector (Admin Chat)
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {chatLog.length === 0 ? (
                  <div className="text-sm text-neutral-500 text-center mt-20">
                    <p>Send a message to test the Brain Pipeline.</p>
                    <p className="text-xs mt-2 text-neutral-600">Try saying "I hate you" or "Let's play a game" to trigger mood shifts.</p>
                  </div>
                ) : (
                  chatLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white rounded-br-none' 
                          : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Inject thought into Murgi's brain..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-white text-black px-5 py-3 rounded-xl text-sm font-bold hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

