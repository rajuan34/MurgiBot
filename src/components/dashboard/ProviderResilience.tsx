import React, { useState, useEffect } from 'react';
import { Server, Shield, RefreshCw, Settings, ChevronUp, ChevronDown, Check, X } from 'lucide-react';

export function ProviderResilience({ botState, fetchState }: { botState: any, fetchState: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<{name: string, enabled: boolean, priority: number}[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // Fetch current config
      fetch('/api/providers/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        // Sort by priority
        const sorted = data.sort((a: any, b: any) => a.priority - b.priority);
        setConfig(sorted);
      })
      .catch(console.error);
    }
  }, [isEditing]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const updatedConfig = config.map((c, i) => ({ ...c, priority: i }));
      await fetch('/api/providers/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ config: updatedConfig })
      });
      setIsEditing(false);
      fetchState();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newConfig = [...config];
    const temp = newConfig[index - 1];
    newConfig[index - 1] = newConfig[index];
    newConfig[index] = temp;
    setConfig(newConfig);
  };

  const moveDown = (index: number) => {
    if (index === config.length - 1) return;
    const newConfig = [...config];
    const temp = newConfig[index + 1];
    newConfig[index + 1] = newConfig[index];
    newConfig[index] = temp;
    setConfig(newConfig);
  };

  const toggleEnable = (index: number) => {
    const newConfig = [...config];
    newConfig[index].enabled = !newConfig[index].enabled;
    setConfig(newConfig);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" /> Provider Resilience
        </h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-white transition-colors" title="Cancel">
                <X className="w-4 h-4" />
              </button>
              <button onClick={saveConfig} disabled={isSaving} className="text-emerald-500 hover:text-emerald-400 transition-colors" title="Save">
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="text-neutral-500 hover:text-white transition-colors" title="Edit Config">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={fetchState} className="text-neutral-500 hover:text-white transition-colors" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        {isEditing ? (
          config.length === 0 ? (
            <div className="text-sm text-neutral-500">Loading config...</div>
          ) : (
            config.map((c, i) => (
              <div key={c.name} className={`flex items-center justify-between bg-neutral-950 p-2 rounded-xl border ${c.enabled ? 'border-neutral-700' : 'border-neutral-800 opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="text-neutral-600 hover:text-white disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveDown(i)} disabled={i === config.length - 1} className="text-neutral-600 hover:text-white disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <span className="font-medium text-sm text-neutral-300">{c.name}</span>
                </div>
                <div>
                  <button onClick={() => toggleEnable(i)} className={`text-xs px-2 py-1 rounded border ${c.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
                    {c.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          !botState?.providers ? (
            <div className="text-sm text-neutral-500">Loading providers...</div>
          ) : (
            botState.providers.map((p: any, i: number) => (
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
          )
        )}
      </div>
    </div>
  );
}
