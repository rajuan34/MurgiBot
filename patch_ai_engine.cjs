const fs = require('fs');
const path = './src/components/dashboard/AIEngineView.tsx';
let code = fs.readFileSync(path, 'utf-8');

// Add import
if (!code.includes('import { ProviderResilience }')) {
  code = code.replace("import { Server, Shield, Database, Terminal, Download, Send, RefreshCw, Zap } from 'lucide-react';", 
  "import { Server, Shield, Database, Terminal, Download, Send, RefreshCw, Zap } from 'lucide-react';\nimport { ProviderResilience } from './ProviderResilience';");
}

// Replace old block
const oldBlock = `<div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> Provider Resilience
            </h2>
            <button onClick={fetchState} className="text-neutral-500 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {!botState?.providers ? (
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
            )}
          </div>
        </div>`;

code = code.replace(oldBlock, `<ProviderResilience botState={botState} fetchState={fetchState} />`);

fs.writeFileSync(path, code);
console.log('Patched AIEngineView.tsx');
