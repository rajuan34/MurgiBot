const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

const signatureRegex = /export function OverviewView\(\{ metrics, isConnected \}: \{ metrics: any, isConnected: boolean \}\) \{/;
code = code.replace(signatureRegex, 'export function OverviewView({ metrics, isConnected, botState }: { metrics: any, isConnected: boolean, botState?: any }) {');

const dbStatusWidget = `        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-neutral-300 mb-4 uppercase tracking-wider">Database & Cache Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-neutral-200">PostgreSQL Cache</span>
              </div>
              <span className={\`text-xs px-2 py-1 rounded \${botState?.memory?.storage === 'postgres-cache' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}\`}>
                {botState?.memory?.storage === 'postgres-cache' ? 'Connected' : 'Offline'}
              </span>
            </div>
            
            {botState?.memory?.storage === 'postgres-cache' && botState?.memory?.dbStatus && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                 <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                   <div className="text-xs text-neutral-500 mb-1">Active Connections</div>
                   <div className="text-lg font-bold text-neutral-200">{botState.memory.dbStatus.activeConnections}</div>
                 </div>
                 <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                   <div className="text-xs text-neutral-500 mb-1">Idle Connections</div>
                   <div className="text-lg font-bold text-neutral-200">{botState.memory.dbStatus.idleConnections}</div>
                 </div>
                 <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2 flex justify-between items-center">
                   <div className="text-xs text-neutral-500">DB Uptime</div>
                   <div className="text-sm font-medium text-neutral-300">{formatUptime(botState.memory.dbStatus.uptimeSeconds)}</div>
                 </div>
              </div>
            )}

            {botState?.memory?.storage !== 'postgres-cache' && (
              <div className="p-3 text-xs text-neutral-500 flex gap-2 items-start mt-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                <p>PostgreSQL cache is currently offline. System has fallen back to temporary in-memory storage.</p>
              </div>
            )}
          </div>
        </div>`;

const oldWidgetRegex = /<div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">\s*<h3 className="text-sm font-bold text-neutral-300 mb-4 uppercase tracking-wider">Missing Connectors<\/h3>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

code = code.replace(oldWidgetRegex, dbStatusWidget + '\n      </div>\n    </div>\n  );');
fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
console.log("OverviewView updated with DB widget");
