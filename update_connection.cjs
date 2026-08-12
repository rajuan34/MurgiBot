const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `  const [loading, setLoading] = useState(true);`,
  `  const [loading, setLoading] = useState(true);\n  const [isConnected, setIsConnected] = useState(false);`
);

code = code.replace(
  `  const fetchState = async () => {
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
  };`,
  `  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setBotState(data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      setIsConnected(false);
      // Silently fail during dev server restarts or network dips
      // to prevent spurious console errors from triggering the platform error reporter.
    } finally {
      setLoading(false);
    }
  };`
);

const oldHeader = `                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  Direct Neural Injector (Admin Chat)
                </h2>`;

const newHeader = `                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  Direct Neural Injector (Admin Chat)
                  <span className="flex items-center gap-1.5 ml-2 border-l border-neutral-700 pl-3">
                    <span className="relative flex h-2 w-2">
                      {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                      <span className={\`relative inline-flex rounded-full h-2 w-2 \${isConnected ? 'bg-emerald-500' : 'bg-red-500'}\`}></span>
                    </span>
                    <span className="text-[10px] text-neutral-500 normal-case tracking-normal">
                      {isConnected ? 'API Connected' : 'Disconnected'}
                    </span>
                  </span>
                </h2>`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/App.tsx', code);
