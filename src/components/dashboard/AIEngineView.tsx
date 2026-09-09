import React from 'react';
import { Server, Shield, Database, Terminal, Download, Send, RefreshCw, Zap } from 'lucide-react';
import { ProviderResilience } from './ProviderResilience';

interface AIEngineViewProps {
  botState: any;
  chatLog: { role: string; text: string }[];
  input: string;
  setInput: (val: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  exportChatLog: () => void;
  fetchState: () => void;
  isConnected: boolean;
  latency: number;
  isSending: boolean;
  getHeaders: () => Record<string, string>;
}

export function AIEngineView({
  botState,
  chatLog,
  input,
  setInput,
  sendMessage,
  exportChatLog,
  fetchState,
  isConnected,
  latency,
  isSending,
  getHeaders
}: AIEngineViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Stats & Providers */}
      <div className="space-y-6">
        {/* Provider Resilience */}
        <ProviderResilience botState={botState} fetchState={fetchState} getHeaders={getHeaders} />

        {/* Memory Node */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" /> Memory Node
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Short-Term Contexts</span>
              <span className="font-mono text-sm text-white">{botState?.memory?.activeConversations || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-400">Long-Term Entities</span>
              <span className="font-mono text-sm text-white">{botState?.memory?.knownUsers || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Direct Neural Injector */}
      <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-4">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            Direct Neural Injector (Admin Chat)
            <span className="flex items-center gap-1.5 ml-2 border-l border-neutral-700 pl-3">
              <span className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="text-[10px] text-neutral-500 normal-case tracking-normal">
                {isConnected ? 'API Connected' : 'Disconnected'}
              </span>
            </span>
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
        </div>
        
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
                    ? 'bg-emerald-600 text-white rounded-br-none' 
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
            placeholder="Inject thought into Bohurupi's brain..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isSending}
            className="bg-white text-black px-5 py-3 rounded-xl text-sm font-bold hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {isSending ? "Thinking..." : "Send"}
          </button>
        </form>
        <div className="mt-2 flex justify-between items-center px-1">
          <span className="text-[10px] text-neutral-600 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Latency: {latency}ms
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            Est. Tokens: {Math.ceil(input.length / 4)}
          </span>
        </div>
      </div>
    </div>
  );
}
