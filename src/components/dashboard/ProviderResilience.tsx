import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Shield, 
  RefreshCw, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  X, 
  Activity, 
  Zap, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  Layers, 
  Play, 
  Gauge, 
  Info,
  ChevronRight,
  Sliders
} from 'lucide-react';

export function ProviderResilience({ 
  botState, 
  fetchState, 
  getHeaders 
}: { 
  botState: any; 
  fetchState: () => void; 
  getHeaders: () => Record<string, string>; 
}) {
  const [config, setConfig] = useState<{ name: string; enabled: boolean; priority: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cascade' | 'settings'>('overview');
  const [resettingCircuit, setResettingCircuit] = useState<Record<string, boolean>>({});

  // Seed config from botState if config is empty
  useEffect(() => {
    if (config.length === 0 && botState?.providers && Array.isArray(botState.providers) && botState.providers.length > 0) {
      const initial = botState.providers
        .filter((p: any) => p.name !== 'AgentRouter')
        .map((p: any, idx: number) => ({
          name: p.name,
          enabled: p.enabled !== false,
          priority: p.priority !== undefined ? p.priority : idx
        }));
      initial.sort((a: any, b: any) => a.priority - b.priority);
      setConfig(initial);
    }
  }, [botState?.providers, config.length]);

  // Load backend provider settings and config on mount
  useEffect(() => {
    const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
    fetch('/api/providers/settings', { headers })
      .then(async res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data) {
          if (Array.isArray(data.config) && data.config.length > 0) {
            const sorted = data.config
              .filter((c: any) => c.name !== 'AgentRouter')
              .sort((a: any, b: any) => a.priority - b.priority);
            setConfig(sorted);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Also fetch config when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      fetch('/api/providers/config', { headers })
        .then(async res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const sorted = data
              .filter((c: any) => c.name !== 'AgentRouter')
              .sort((a: any, b: any) => a.priority - b.priority);
            setConfig(sorted);
          } else if (data && Array.isArray(data.config) && data.config.length > 0) {
            const sorted = data.config
              .filter((c: any) => c.name !== 'AgentRouter')
              .sort((a: any, b: any) => a.priority - b.priority);
            setConfig(sorted);
          }
        })
        .catch(console.error);
    }
  }, [activeTab]);

  const saveAllSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      const updatedConfig = config.map((c, i) => ({ ...c, priority: i }));
      
      const payload = {
        config: updatedConfig
      };

      const res = await fetch('/api/providers/settings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        if (Array.isArray(data.config)) {
          setConfig(data.config.filter((c: any) => c.name !== 'AgentRouter').sort((a: any, b: any) => a.priority - b.priority));
        }
        setSaveMessage({ text: 'Provider priority settings saved successfully!', type: 'success' });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        const errMsg = data?.error || `HTTP ${res.status}: Failed to save`;
        setSaveMessage({ text: `Save error: ${errMsg}`, type: 'error' });
      }
      fetchState();
    } catch (e: any) {
      console.error(e);
      setSaveMessage({ text: `Error saving settings: ${e?.message || 'Network error'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newConfig = [...config];
    const temp = newConfig[index - 1];
    newConfig[index - 1] = newConfig[index];
    newConfig[index - 1].priority = index - 1;
    newConfig[index] = temp;
    newConfig[index].priority = index;
    setConfig(newConfig);
  };

  const moveDown = (index: number) => {
    if (index === config.length - 1) return;
    const newConfig = [...config];
    const temp = newConfig[index + 1];
    newConfig[index + 1] = newConfig[index];
    newConfig[index + 1].priority = index + 1;
    newConfig[index] = temp;
    newConfig[index].priority = index;
    setConfig(newConfig);
  };

  const toggleEnable = (index: number) => {
    const newConfig = [...config];
    newConfig[index].enabled = !newConfig[index].enabled;
    setConfig(newConfig);
  };

  const handleResetCircuit = async (providerName: string) => {
    setResettingCircuit(prev => ({ ...prev, [providerName]: true }));
    try {
      const headers = getHeaders ? getHeaders() : { 'Content-Type': 'application/json' };
      await fetch('/api/providers/reset-circuit', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName })
      });
      fetchState();
    } catch (e) {
      console.error(e);
    } finally {
      setResettingCircuit(prev => ({ ...prev, [providerName]: false }));
    }
  };

  const providers = botState?.providers || [];
  const healthyCount = providers.filter((p: any) => p.healthy && p.enabled !== false && p.circuitState !== 'OPEN').length;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Provider Resilience Engine
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {healthyCount}/{providers.length} Active Tiers
              </span>
            </h2>
            <p className="text-[11px] text-neutral-400">
              Multi-tiered failover, circuit breaker & model cascades
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab(activeTab === 'settings' ? 'overview' : 'settings')} 
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors border flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                : 'text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border-neutral-800'
            }`}
            title="Configure Provider Priorities, API Keys & Gateway settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button 
            onClick={fetchState} 
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800" 
            title="Refresh live telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Tier Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('cascade')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
            activeTab === 'cascade'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Failover Flow
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Engine Settings
        </button>
      </div>

      {/* TAB 1: Engine Settings Panel */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-400 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-neutral-200">Resilience Engine & Failover Settings</p>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                Configure provider priority ordering and active models. The bot cascades top-to-bottom upon timeout or rate limits (429).
              </p>
            </div>
          </div>

          {/* Section 1: Provider Priority Reordering */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
              <span>Failover Hierarchy & Priority Reordering</span>
              <span className="text-[10px] text-neutral-500 font-normal">Top to Bottom Execution</span>
            </h3>

            <div className="space-y-2">
              {config.length === 0 ? (
                <div className="text-xs text-neutral-500 py-4 text-center bg-neutral-950 rounded-xl border border-neutral-800">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-500" />
                  Loading provider hierarchy...
                </div>
              ) : (
                config.map((c, i) => (
                  <div 
                    key={c.name} 
                    className={`flex items-center justify-between bg-neutral-950 p-3 rounded-xl border transition-all ${
                      c.enabled ? 'border-neutral-800 hover:border-neutral-700' : 'border-neutral-900 opacity-50 bg-neutral-950/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-neutral-500 w-5">
                        #{i + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => moveUp(i)} 
                          disabled={i === 0} 
                          className="text-neutral-500 hover:text-white disabled:opacity-20 p-0.5 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => moveDown(i)} 
                          disabled={i === config.length - 1} 
                          className="text-neutral-500 hover:text-white disabled:opacity-20 p-0.5 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-neutral-200">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block">
                          {c.name.includes('Progga')
                            ? 'Progga Engine: Ultra-fast DeepSeek v4 Flash 0731 & high-throughput inference'
                            : (c.name.includes('Gemini') 
                              ? 'Primary Core: Lowest latency multi-model Gemini flash cascade' 
                              : (c.name.includes('OpenRouter') 
                                ? 'Cloud Failover: Multi-endpoint free & ultra-cheap failover' 
                                : 'Safe Fallback: Deterministic Banglish offline safety net'))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleEnable(i)} 
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                          c.enabled 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' 
                            : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:bg-neutral-850'
                        }`}
                      >
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Bar: Save All Settings */}
          <div className="pt-2 flex items-center justify-between border-t border-neutral-800/80">
            <div>
              {saveMessage && (
                <span className={`text-xs font-medium flex items-center gap-1.5 ${
                  saveMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {saveMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {saveMessage.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('overview')} 
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg border border-neutral-800 transition-colors cursor-pointer"
              >
                Done
              </button>
              <button 
                onClick={saveAllSettings} 
                disabled={isSaving} 
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Priority Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Failover Flow Pipeline View */}
      {activeTab === 'cascade' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tier Architecture Pipeline
            </h3>
            
            <div className="space-y-2">
              {providers.map((p: any, idx: number) => (
                <div key={p.name} className="relative">
                  <div className={`p-3 rounded-xl border ${
                    !p.healthy ? 'bg-red-950/20 border-red-900/50' : 
                    p.circuitState === 'OPEN' ? 'bg-amber-950/20 border-amber-800/40' : 
                    idx === 0 ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-neutral-900/70 border-neutral-800'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-[10px] text-neutral-400">({p.tier || `Tier ${idx + 1}`})</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        p.circuitState === 'OPEN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        !p.healthy ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {p.circuitState === 'OPEN' ? 'Breaker Open' : p.healthy ? 'Online' : 'No Key'}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 pl-7">
                      {p.name.includes('Progga') && 'Dedicated high-speed DeepSeek v4 Flash 0731 inference engine.'}
                      {p.name.includes('Gemini') && 'Primary lowest-latency model cascade with auto-fallback across 9 Gemini models on quota limit.'}
                      {p.name.includes('OpenRouter') && 'Secondary cloud failover with model cascade across free and ultra-cheap endpoints.'}
                      {p.name.includes('Fallback') && 'Zero-dependency deterministic Banglish generator with Sleep Mode guard after 2 consecutive triggers.'}
                    </p>

                    {p.cascadingModels && p.cascadingModels.length > 0 && (
                      <div className="mt-3 pl-7 space-y-1.5 border-t border-neutral-800/60 pt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                          <span>Available Model Cascade ({p.cascadingModels.length} models):</span>
                          <span className="text-neutral-500 font-mono">Top-to-Bottom Fallback</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {p.cascadingModels.map((m: string, mIdx: number) => {
                            const isCurrentActive = p.activeModel === m;
                            const isFree = m.includes(':free');
                            const isV4Flash = m.includes('0731');
                            const isUltraCheap = m.includes('3b-instruct') || m === 'deepseek/deepseek-chat';
                            return (
                              <div
                                key={m}
                                className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                                  isCurrentActive
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                                    : 'bg-neutral-950 border-neutral-850 text-neutral-300 hover:border-neutral-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="w-4 h-4 rounded-full bg-neutral-900 border border-neutral-800 text-[9px] font-bold text-neutral-400 flex items-center justify-center flex-shrink-0">
                                    {mIdx + 1}
                                  </span>
                                  <span className="truncate" title={m}>
                                    {m}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 pl-1">
                                  {isCurrentActive && (
                                    <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                                      Active
                                    </span>
                                  )}
                                  {isFree && (
                                    <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      $0.00
                                    </span>
                                  )}
                                  {isV4Flash && !isFree && (
                                    <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                      $0.006/1M
                                    </span>
                                  )}
                                  {isUltraCheap && !isFree && !isV4Flash && (
                                    <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      Micro
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {idx < providers.length - 1 && (
                    <div className="flex justify-center py-1 text-neutral-600">
                      <span className="text-[10px] flex items-center gap-1 font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                        failover on timeout / 429 rate-limit <ChevronDown className="w-3 h-3 text-neutral-500" />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Tier Diagnostics Overview View */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {providers.length === 0 ? (
            <div className="text-sm text-neutral-500 py-6 text-center">Loading provider telemetry...</div>
          ) : (
            providers.map((p: any, i: number) => {
              const isResetting = resettingCircuit[p.name];
              const failureRate = p.failures || 0;

              return (
                <div 
                  key={p.name} 
                  className={`bg-neutral-950 rounded-xl p-3.5 border transition-all ${
                    p.circuitState === 'OPEN'
                      ? 'border-red-900/60 bg-red-950/10'
                      : !p.healthy
                      ? 'border-neutral-800 bg-neutral-950/60'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Top Row: Provider Identity & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        p.circuitState === 'OPEN'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : p.healthy
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                            #{p.priority !== undefined ? p.priority + 1 : i + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">
                          {p.tier || (p.name.includes('Progga') ? 'Tier 1: DeepSeek v4 Engine' : (p.name.includes('Gemini') ? 'Tier 1: Primary AI' : (p.name.includes('OpenRouter') ? 'Tier 2: Failover' : 'Tier 3: Safe Fallback')))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.circuitState === 'OPEN' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                          Circuit Tripped
                        </span>
                      ) : p.healthy ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Healthy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700">
                          Standby / No Key
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Model Indicator */}
                  {p.activeModel && (
                    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-neutral-400">Active Model:</span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-300">
                          {p.activeModel}
                        </span>
                      </div>
                      {p.lastLatencyMs > 0 && (
                        <span className="font-mono text-[10px] text-neutral-400">
                          {p.lastLatencyMs}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 bg-neutral-900/40 p-2 rounded-lg border border-neutral-850 text-xs mb-2.5">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Success Rate</span>
                      <span className={`font-mono font-bold text-xs ${
                        (p.successRate ?? 100) >= 90 ? 'text-emerald-400' : (p.successRate ?? 100) >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {p.totalRequests ? `${p.successRate}%` : (p.healthy ? '100%' : 'N/A')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Requests</span>
                      <span className="font-mono text-xs text-neutral-300">
                        {p.totalRequests || 0} <span className="text-[10px] text-neutral-500">({p.successfulRequests || 0} ok)</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Circuit Breaker</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map(dot => (
                            <span 
                              key={dot} 
                              className={`w-1.5 h-2 rounded-sm ${
                                dot < failureRate 
                                  ? 'bg-red-500' 
                                  : 'bg-neutral-700'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="font-mono text-[10px] text-neutral-400 ml-1">
                          {failureRate}/3
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar: Reset Circuit (if failed or tripped) */}
                  {(failureRate > 0 || p.circuitState === 'OPEN') && (
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResetCircuit(p.name)}
                          disabled={isResetting}
                          className="text-[11px] font-medium px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Manually reset circuit breaker failure count back to 0"
                        >
                          {isResetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          <span>Reset Breaker</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {p.failures} failure(s) recorded
                      </span>
                    </div>
                  )}

                  {/* Last Error Detail Box if recent failure exists */}
                  {p.lastErrorDetail && (
                    <div className="mt-2 p-2 bg-red-950/20 border border-red-900/40 rounded text-[10px] text-red-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 overflow-hidden">
                        <span className="font-bold text-red-200">Last Error: </span>
                        <span className="font-mono truncate block">{p.lastErrorDetail}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer Info: Safe Guard & Sleep Mode Policy */}
      <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Failsafe Sleep Mode: Active (&gt;2 fallbacks)</span>
        </div>
        <span className="font-mono text-[10px] text-neutral-400">
          Max Timeout: 18s / tier
        </span>
      </div>
    </div>
  );
}
