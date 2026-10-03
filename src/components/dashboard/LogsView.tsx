import React, { useState, useMemo } from 'react';
import { Terminal, Search, Filter, Download, Pause, Play, MessageSquare, Bot, Sparkles, User, CornerDownRight, Hash } from 'lucide-react';

export function LogsView({ serverLogs, isConnected }: { serverLogs: any[], isConnected: boolean }) {
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'discord' | 'providers' | 'errors'>('all');

  const displayLogs = useMemo(() => {
    let logs = isPaused ? [] : serverLogs;

    if (activeTab === 'discord') {
      logs = logs.filter(log => 
        log.message.includes('[Discord') || 
        log.meta?.type?.startsWith('DISCORD') ||
        log.message.includes('Discord')
      );
    } else if (activeTab === 'providers') {
      logs = logs.filter(log => 
        log.message.includes('Google-Gemini') || 
        log.message.includes('Cloud-OpenRouter') || 
        log.message.includes('Provider') ||
        log.message.includes('OpenRouter') ||
        log.message.includes('Brain generation')
      );
    } else if (activeTab === 'errors') {
      logs = logs.filter(log => log.level === 'error' || log.level === 'warn');
    }

    if (filter) {
      const q = filter.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(q) || 
        log.level.toLowerCase().includes(q) ||
        (log.meta && JSON.stringify(log.meta).toLowerCase().includes(q))
      );
    }

    return logs;
  }, [isPaused ? [] : serverLogs, filter, activeTab]);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(serverLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bohurupi-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[500px] flex-1">
      {/* Header Bar */}
      <div className="p-4 border-b border-neutral-800 flex flex-wrap gap-4 justify-between items-center bg-neutral-950">
        <div className="flex items-center gap-4 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-neutral-200">OpsCenter Telemetry</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {serverLogs.length} events
            </span>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search user, channel, prompt, reply..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 placeholder:text-neutral-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isPaused ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' : 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800'}`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Logs
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="px-4 py-2 bg-neutral-950/60 border-b border-neutral-800/80 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'all' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400 hover:text-neutral-200'}`}
        >
          All System Logs
        </button>
        <button
          onClick={() => setActiveTab('discord')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'discord' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-neutral-400 hover:text-indigo-300'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Discord Mentions & Replies
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'providers' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-neutral-400 hover:text-cyan-300'}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Provider Activity
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'errors' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-neutral-400 hover:text-red-300'}`}
        >
          Errors & Warnings
        </button>
      </div>

      {/* Log Feed List */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 bg-[#09090b]">
        {displayLogs.length === 0 ? (
          <div className="text-neutral-500 flex flex-col items-center justify-center h-48 space-y-2">
            <Terminal className="w-8 h-8 text-neutral-600" />
            <p>No log records match the current filter...</p>
          </div>
        ) : (
          displayLogs.map((log, i) => {
            const isDiscordMention = log.meta?.type === 'DISCORD_MENTION' || log.message.includes('[Discord Mention]');
            const isDiscordReply = log.meta?.type === 'DISCORD_REPLY' || log.message.includes('[Discord Reply]');
            const isDiscordCommand = log.meta?.type?.startsWith('DISCORD_COMMAND') || log.message.includes('[Discord Command]');
            const isDiscordAuto = log.meta?.type === 'DISCORD_AUTO_REPLY' || log.message.includes('[Discord Auto-Reply]');

            // Special stylized card for Discord Mentions (Who mentioned, what was the message)
            if (isDiscordMention) {
              const meta = log.meta || {};
              const userDisplayName = meta.user?.displayName || 'User';
              const userTag = meta.user?.tag || '';
              const userId = meta.user?.id || '';
              const channelName = meta.channel?.name || '';
              const guildName = meta.guild?.name || '';
              const incomingMsg = meta.incomingMessage || meta.message || '';

              return (
                <div key={i} className="p-3 rounded-lg border border-indigo-900/50 bg-indigo-950/20 hover:bg-indigo-950/30 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 font-bold flex items-center gap-1 border border-indigo-500/30">
                        <MessageSquare className="w-3 h-3 text-indigo-400" /> DISCORD MENTION
                      </span>
                      <span className="text-neutral-200 font-semibold flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        @{userDisplayName}
                      </span>
                      {userTag && <span className="text-neutral-400 text-[11px]">({userTag})</span>}
                      {userId && <span className="text-neutral-500 text-[10px] font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">ID: {userId}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                      {channelName && (
                        <span className="flex items-center gap-0.5 text-indigo-300">
                          <Hash className="w-3 h-3" />{channelName}
                        </span>
                      )}
                      {guildName && <span className="text-neutral-500">[{guildName}]</span>}
                      <span className="text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="text-neutral-100 bg-neutral-900/80 p-2.5 rounded border border-neutral-800/80 text-[13px] font-sans">
                    <span className="text-neutral-400 text-xs font-mono mr-2">📥 Incoming Message:</span>
                    <span className="font-medium text-white">{incomingMsg || log.message}</span>
                  </div>
                </div>
              );
            }

            // Special stylized card for Discord Bot Replies (What was the reply)
            if (isDiscordReply) {
              const meta = log.meta || {};
              const userDisplayName = meta.user?.displayName || 'User';
              const userTag = meta.user?.tag || '';
              const channel = meta.channel?.name || meta.channel || '';
              const replyText = meta.reply || '';

              return (
                <div key={i} className="p-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-950/30 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-bold flex items-center gap-1 border border-emerald-500/30">
                        <Bot className="w-3 h-3 text-emerald-400" /> BOHURUPI REPLY
                      </span>
                      <span className="text-neutral-300 flex items-center gap-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
                        Replying to <span className="text-white font-semibold">@{userDisplayName}</span>
                      </span>
                      {channel && <span className="text-emerald-400/80 text-[11px]">{channel}</span>}
                    </div>
                    <span className="text-neutral-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-emerald-200 bg-neutral-900/80 p-2.5 rounded border border-neutral-800/80 text-[13px] font-sans leading-relaxed">
                    <span className="text-neutral-400 text-xs font-mono mr-2">📤 Sent to Discord:</span>
                    <span className="text-emerald-100">{replyText || log.message}</span>
                  </div>
                </div>
              );
            }

            // Special stylized card for Commands
            if (isDiscordCommand) {
              const meta = log.meta || {};
              const cmd = meta.command || '';
              const user = meta.user?.displayName || meta.author?.displayName || 'User';
              const target = meta.target ? `target: ${meta.target}` : '';
              const reply = meta.reply || '';

              return (
                <div key={i} className="p-3 rounded-lg border border-purple-900/50 bg-purple-950/20 hover:bg-purple-950/30 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30">
                        ⚔️ {cmd || 'COMMAND'}
                      </span>
                      <span className="text-neutral-200 font-semibold">@{user}</span>
                      {target && <span className="text-purple-300 text-xs font-mono">({target})</span>}
                    </div>
                    <span className="text-neutral-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-neutral-200 bg-neutral-900/80 p-2.5 rounded border border-neutral-800/80 text-[12px] font-sans">
                    {reply ? (
                      <div>
                        <span className="text-neutral-400 text-xs font-mono mr-2">Result:</span>
                        <span className="text-purple-200 font-mono whitespace-pre-wrap">{reply}</span>
                      </div>
                    ) : (
                      <span>{log.message}</span>
                    )}
                  </div>
                </div>
              );
            }

            // Standard Telemetry Log Row
            return (
              <div key={i} className="flex gap-3 hover:bg-neutral-900/60 p-1.5 rounded transition-colors group">
                <span className="text-neutral-500 shrink-0 w-36 text-[11px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 w-14 font-bold text-[11px] ${
                  log.level === 'error' ? 'text-red-400' : 
                  log.level === 'warn' ? 'text-yellow-400' : 
                  'text-blue-400'
                }`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-neutral-300 break-all flex-1">
                  {log.message}
                  {log.meta && Object.keys(log.meta).length > 0 && !isDiscordMention && !isDiscordReply && (
                    <span className="text-neutral-500 ml-2 block sm:inline mt-1 sm:mt-0 font-mono text-[11px]">
                      {JSON.stringify(log.meta)}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
