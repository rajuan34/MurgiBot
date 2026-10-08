import React, { useState } from 'react';
import { Cpu, Database, Network, Clock, Activity, AlertCircle, Smile, Send, RefreshCw, CheckCircle2, XCircle, Pause, Play, PauseCircle, PlayCircle, Sparkles, X, Heart, Coffee, Zap, Brain, Moon, Flame, Eye, UserCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const MOOD_PRESETS = [
  { id: 'Playful', label: 'Playful', emoji: '🎭', icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Friendly, fast banter, Banglish & reaction humor' },
  { id: 'Chill', label: 'Chill', emoji: '☕', icon: Coffee, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', desc: 'Relaxed, calm vibe, reduced emoji & gentle jokes' },
  { id: 'Chaos', label: 'Chaos', emoji: '💀', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', desc: 'Maximum meme energy, wild surreal roasts' },
  { id: 'Wise', label: 'Wise (Sarcastic)', emoji: '🗿', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', desc: 'Toxic guru advice, dismissive lazy cynicism' },
  { id: 'Curious', label: 'Curious', emoji: '🧐', icon: Sparkles, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', desc: 'Questions everything (wait, kivabe, seriously?)' },
  { id: 'Competitive', label: 'Competitive', emoji: '🥊', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', desc: 'Hyping up server, trash-talk & high adrenaline' },
  { id: 'Sleepy', label: 'Sleepy', emoji: '🥱', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', desc: 'Low energy, lazy short replies (bro ami alive)' },
  { id: 'Supportive', label: 'Supportive', emoji: '❤️', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', desc: 'Savage tough-love humor, dismisses whining' },
  { id: 'RESPECTFUL_SON_CALM', label: 'Son Mode (Abba)', emoji: '👑', icon: UserCheck, color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/30', desc: 'Warm, respectful & obedient to creator (Abba)' },
  { id: 'RESPECTFUL_FRIENDLY', label: 'Co-Creator (Rajuan)', emoji: '🤝', icon: UserCheck, color: 'text-sky-300', bg: 'bg-sky-500/20 border-sky-500/30', desc: 'Chill dev partner vibe with Rajuan' },
  { id: 'Observer', label: 'Observer (Silent)', emoji: '👁️', icon: Eye, color: 'text-neutral-400', bg: 'bg-neutral-800 border-neutral-700', desc: 'Intentional silence (watches without replying)' }
];

export function OverviewView({ 
  metrics, 
  isConnected, 
  botState, 
  getHeaders, 
  fetchState 
}: { 
  metrics: any; 
  isConnected: boolean; 
  botState?: any; 
  getHeaders?: () => Record<string, string>; 
  fetchState?: () => Promise<void>; 
}) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<{ success?: boolean; message?: string; results?: any[] } | null>(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isSettingMood, setIsSettingMood] = useState(false);
  const [moodFeedback, setMoodFeedback] = useState<string | null>(null);

  const handleChangeMood = async (newMood: string) => {
    setIsSettingMood(true);
    setMoodFeedback(null);
    try {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/bot/mood', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mood: newMood })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMoodFeedback(`Bot mood successfully set to ${newMood}!`);
        if (fetchState) await fetchState();
        setTimeout(() => setMoodFeedback(null), 3000);
      } else {
        setMoodFeedback(`Failed: ${data.error || 'Could not update mood'}`);
      }
    } catch (err: any) {
      setMoodFeedback(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSettingMood(false);
    }
  };

  const handleTogglePause = async () => {
    setIsTogglingPause(true);
    try {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      const endpoint = botState?.discord?.isPaused ? '/api/discord/resume' : '/api/discord/pause';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        if (fetchState) await fetchState();
      }
    } catch (err) {
      console.error('Failed to toggle bot pause state:', err);
    } finally {
      setIsTogglingPause(false);
    }
  };

  const handleTriggerSchedule = async () => {
    setIsTriggering(true);
    setTriggerStatus(null);
    try {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/discord/trigger-schedule', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const posted = data.result || (data.results && data.results[0]);
        setTriggerStatus({
          success: true,
          message: posted ? `Auto-reply sent to random channel #${posted.channelName}!` : 'Auto-reply processed for 1 random channel!',
          results: data.results
        });
      } else {
        setTriggerStatus({
          success: false,
          message: data.error || (data.results && data.results[0]?.error) || 'Failed to trigger schedule'
        });
      }
      if (fetchState) await fetchState();
    } catch (err: any) {
      setTriggerStatus({
        success: false,
        message: err?.message || 'Network error triggering schedule'
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const defaultChannels = [
    { id: '705092446366728236', name: '#bot-tasting-general' },
    { id: '1453357071931019304', name: '#media' },
    { id: '1470329659693600768', name: '#memes' }
  ];

  const defaultServers = [
    { id: '1522520842163060809', name: 'Bohurupi Main Guild' },
    { id: '705092446366728233', name: 'Bohurupi Primary Server' }
  ];

  const displayServers = (botState?.discord?.allowedServers && botState.discord.allowedServers.length > 0)
    ? botState.discord.allowedServers
    : (botState?.discord?.allowedServer ? [botState.discord.allowedServer] : defaultServers);

  // Guarantee all 3 channels are always visible, using live Discord names when available:
  const loadedChannels = botState?.discord?.allowedChannels || [];
  const displayChannels = defaultChannels.map(dc => {
    const found = loadedChannels.find((lc: any) => lc.id === dc.id);
    return found || dc;
  });
  // Also include any extra custom channels configured:
  for (const lc of loadedChannels) {
    if (!displayChannels.some(dc => dc.id === lc.id)) {
      displayChannels.push(lc);
    }
  }
  const cpuData = Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    value: Math.random() * 30 + (metrics?.cpu?.usage || 10)
  }));

  const queryData = Array.from({ length: 15 }).map((_, i) => ({
    time: i,
    value: Math.floor(Math.random() * 50) + (botState?.memory?.storage === 'postgres-cache' ? 10 : 0)
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
      {/* Bot Paused Banner Notification */}
      {botState?.discord?.isPaused && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
              <PauseCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-300">Bot Activity is Currently PAUSED</h4>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 uppercase">Standby</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Incoming mentions, commands, and scheduled auto-replies are paused. Discord gateway remains connected for instant resume.
                {botState.discord.pausedAt && (
                  <span className="text-amber-400/80 ml-1 font-mono text-[11px]">
                    (Paused at {new Date(botState.discord.pausedAt).toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer flex-shrink-0"
          >
            {isTogglingPause ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Resume Bot Activity
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400">Current Mood</h3>
              <button
                onClick={() => setIsMoodModalOpen(true)}
                className="text-[11px] font-semibold text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                title="Change bot mood"
              >
                <Smile className="w-3 h-3" /> Change
              </button>
            </div>
            <div className="text-2xl font-bold text-white mb-1 capitalize flex items-center gap-2">
              <span>{MOOD_PRESETS.find(m => m.id === botState?.emotion)?.emoji || '🎭'}</span>
              <span>{MOOD_PRESETS.find(m => m.id === botState?.emotion)?.label || botState?.emotion || '--'}</span>
            </div>
          </div>
          <div className="text-xs text-neutral-500">
            Active Personality State
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">Bot Activity</h3>
            {botState?.discord?.isPaused ? (
              <PauseCircle className="w-4 h-4 text-amber-400" />
            ) : (
              <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {botState?.discord?.isPaused ? (
              <span className="text-amber-400">Paused</span>
            ) : isConnected ? (
              <span className="text-emerald-400">Active</span>
            ) : (
              <span className="text-red-400">Offline</span>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            {botState?.discord?.isPaused ? 'Activity temporarily held' : 'Responding to server'}
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
        
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Discord Operations & Controls</h3>
              <div className="flex items-center gap-2">
                {botState?.discord?.isPaused ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    PAUSED
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${botState?.discord?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                    {botState?.discord?.connected ? `ONLINE (${botState.discord.botTag})` : 'STANDBY / OFFLINE'}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Token / Connection Status Notice */}
              {!botState?.discord?.connected && botState?.discord?.lastConnectionError && (
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-200">Discord Token Notice</span>
                    <span className="text-[11px] text-amber-300/90 block mt-0.5">
                      {botState.discord.lastConnectionError.includes('invalid token')
                        ? 'The provided DISCORD_TOKEN is invalid or expired (reset in Discord Developer Portal). The app is running smoothly in Web/Standby mode.'
                        : botState.discord.lastConnectionError}
                    </span>
                  </div>
                </div>
              )}

              {/* Dedicated Bot Pause / Resume Control Card */}
              <div className={`border rounded-lg p-3.5 flex items-center justify-between transition-colors ${
                botState?.discord?.isPaused 
                  ? 'bg-amber-950/30 border-amber-500/40' 
                  : 'bg-neutral-950 border-neutral-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    botState?.discord?.isPaused 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {botState?.discord?.isPaused ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {botState?.discord?.isPaused ? 'Bot Status: Paused' : 'Bot Status: Active'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                        botState?.discord?.isPaused 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {botState?.discord?.isPaused ? 'Paused' : 'Active'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {botState?.discord?.isPaused 
                        ? 'Chat, mentions, and scheduled tasks are suspended.' 
                        : 'Bot is actively listening and replying in Discord.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTogglePause}
                  disabled={isTogglingPause}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    botState?.discord?.isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      : 'bg-neutral-800 hover:bg-amber-950/50 hover:text-amber-300 hover:border-amber-700/50 border border-neutral-700 text-neutral-200'
                  }`}
                >
                  {isTogglingPause ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : botState?.discord?.isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume Bot
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause Bot
                    </>
                  )}
                </button>
              </div>

              {/* Dedicated Bot Personality & Mood Controller Card */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center text-lg">
                    {MOOD_PRESETS.find(m => m.id === botState?.emotion)?.emoji || '🎭'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Personality: {MOOD_PRESETS.find(m => m.id === botState?.emotion)?.label || botState?.emotion || 'Playful'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Live Mood
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {MOOD_PRESETS.find(m => m.id === botState?.emotion)?.desc || 'Controls conversational tone, humor, and response style.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMoodModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-850 text-yellow-400 border border-yellow-500/30 hover:border-yellow-400/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Open mood selector"
                >
                  <Smile className="w-3.5 h-3.5 text-yellow-400" />
                  Change Mood
                </button>
              </div>

              {/* Allowed Servers */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                  <span className="font-semibold text-neutral-400">Connected / Allowed Servers</span>
                  <span className="text-[10px] text-neutral-600">{displayServers.length} Server(s)</span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {displayServers.map((srv: any) => (
                    <div key={srv.id} className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800/80 rounded px-3 py-1.5 text-xs hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-bold text-white">{srv.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">{srv.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Scheduled Channels */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                  <span className="font-semibold text-neutral-400">3 Scheduled Active Channels</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    botState?.discord?.isPaused 
                      ? 'text-amber-400 bg-amber-950/40 border-amber-800/50' 
                      : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                  }`}>
                    {botState?.discord?.isPaused ? 'Auto-Reply Paused' : 'Auto-Reply Active'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {displayChannels.map((ch: any) => (
                    <div key={ch.id} className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800/80 rounded px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-emerald-400">{ch.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-neutral-400">{ch.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Timing Info */}
              <div className="bg-neutral-950/60 border border-neutral-800/60 rounded-lg p-2.5 text-xs flex items-center justify-between text-neutral-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scheduled: <strong>15:30</strong> & <strong>22:30</strong> (Asia/Dhaka)</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">Randomly 1 of 3 Channels</span>
              </div>
            </div>
          </div>

          {/* Trigger Scheduled Auto-Reply Button */}
          <div className="pt-4 mt-4 border-t border-neutral-800">
            <button
              onClick={handleTriggerSchedule}
              disabled={isTriggering || botState?.discord?.isPaused}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-xs transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer disabled:cursor-not-allowed"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Selecting random channel & posting...
                </>
              ) : botState?.discord?.isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-300" />
                  Auto-Reply Held (Bot is currently paused)
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  ⚡ Trigger Scheduled Auto-Reply (Random 1 Channel) Now
                </>
              )}
            </button>

            {triggerStatus && (
              <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${triggerStatus.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                {triggerStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-semibold">{triggerStatus.message}</p>
                  {triggerStatus.results && (
                    <div className="mt-1 space-y-1 text-[11px] text-neutral-300">
                      {triggerStatus.results.map((res: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
                          <span>{res.channelName ? `#${res.channelName}` : res.channelId}</span>
                          <span className={`font-mono ${res.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {res.status === 'replied_to_user' ? 'Replied to user' : (res.status === 'sent_spontaneous' ? 'Sent opener' : res.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mood Selector Modal Dialog */}
      {isMoodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Change Bot's Mood & Demeanor</h3>
                  <p className="text-[11px] text-neutral-400">Select any emotional personality state to take effect immediately</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoodModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Feedback banner */}
            {moodFeedback && (
              <div className={`mx-4 mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                moodFeedback.includes('successfully') ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60' : 'bg-red-950/50 text-red-300 border border-red-800/60'
              }`}>
                {moodFeedback.includes('successfully') ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>{moodFeedback}</span>
              </div>
            )}

            {/* Mood Options List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {MOOD_PRESETS.map((m) => {
                const isCurrent = botState?.emotion === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleChangeMood(m.id)}
                    disabled={isSettingMood}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                      isCurrent
                        ? 'bg-yellow-950/30 border-yellow-500/60 shadow-sm'
                        : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isCurrent ? 'text-yellow-400' : 'text-neutral-200 group-hover:text-white'}`}>
                            {m.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-1.5 py-0.2 rounded border border-yellow-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{m.desc}</p>
                      </div>
                    </div>

                    <div className="pl-2 flex-shrink-0">
                      {isCurrent ? (
                        <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-neutral-500 group-hover:text-neutral-300 px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                          {isSettingMood ? '...' : 'Select'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-500">
              <span>Applies instantly to Discord replies & commands</span>
              <button
                onClick={() => setIsMoodModalOpen(false)}
                className="px-3 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
