const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Wifi to lucide-react imports
code = code.replace(
  `import { Activity, Brain, Server, Shield, RefreshCw, MessageSquare, Heart, Database, Send, Cpu, Clock, Zap, Terminal, Download } from 'lucide-react';`,
  `import { Activity, Brain, Server, Shield, RefreshCw, MessageSquare, Heart, Database, Send, Cpu, Clock, Zap, Terminal, Download, Wifi } from 'lucide-react';`
);

// 2. Add latency state
code = code.replace(
  `  const [isConnected, setIsConnected] = useState(false);`,
  `  const [isConnected, setIsConnected] = useState(false);\n  const [latency, setLatency] = useState(0);`
);

// 3. Update fetchState
code = code.replace(
  `  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setBotState(data);
        setIsConnected(true);`,
  `  const fetchState = async () => {
    try {
      const start = performance.now();
      const res = await fetch('/api/state');
      if (res.ok) {
        const end = performance.now();
        const data = await res.json();
        setLatency(Math.round(end - start));
        setBotState(data);
        setIsConnected(true);`
);

// 4. Add Latency to Diagnostics
const ramBlock = `                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400 flex items-center gap-2"><Activity className="w-4 h-4"/> RAM</span>
                  <span className="font-mono text-sm text-white">{Math.floor(Math.random() * 20 + 80)} MB</span>
                </div>`;
const latencyBlock = `                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400 flex items-center gap-2"><Wifi className="w-4 h-4"/> API Latency</span>
                  <span className={\`font-mono text-sm \${latency > 0 ? (latency < 200 ? 'text-emerald-400' : latency < 500 ? 'text-yellow-400' : 'text-red-400') : 'text-neutral-500'}\`}>
                    {latency > 0 ? \`\${latency}ms\` : '--'}
                  </span>
                </div>`;
code = code.replace(ramBlock, ramBlock + '\n' + latencyBlock);

// 5. Add token counter below form
const formEnd = `              </form>
            </div>`;
const formEndWithTokens = `              </form>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-[10px] text-neutral-600">Cost: ~$0.00 (Free Tier)</span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Est. Tokens: {Math.ceil(input.length / 4)}
                </span>
              </div>
            </div>`;
code = code.replace(formEnd, formEndWithTokens);

fs.writeFileSync('src/App.tsx', code);
