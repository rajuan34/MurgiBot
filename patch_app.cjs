const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We need to add an authState
const stateAdditions = `
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState('');
`;

content = content.replace("const [isSending, setIsSending] = useState(false);", "const [isSending, setIsSending] = useState(false);\n" + stateAdditions);

// Update fetch to include auth
const fetchStateUpdated = `
  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (adminPassword) headers['x-admin-password'] = adminPassword;
    return headers;
  };

  const fetchState = async () => {
    try {
      const start = performance.now();
      const res = await fetch('/api/system/metrics', { headers: getHeaders() });
      
      if (res.status === 401) {
        setIsAuthModalOpen(true);
        setIsConnected(false);
        return;
      }
      
      if (res.ok) {
        setIsAuthModalOpen(false);
        setAuthError('');
        const end = performance.now();
        setLatency(Math.round(end - start));
        setMetrics(await res.json());
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
      
      const botRes = await fetch('/api/state', { headers: getHeaders() });
      if (botRes.ok) {
        setBotState(await botRes.json());
      }
    } catch (e) {
      setIsConnected(false);
    }
  };
`;

content = content.replace(/const fetchState = async \(\) => \{[\s\S]*?catch \(e\) \{\s*setIsConnected\(false\);\s*\}\s*\};/, fetchStateUpdated);

// Update interact fetch
const interactFetch = `
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: userMsg })
      });
      if (res.status === 401) {
        setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Unauthorized]' }]);
        setIsAuthModalOpen(true);
        return;
      }
`;
content = content.replace(/const res = await fetch\('\/api\/interact'[\s\S]*?body: JSON\.stringify\(\{ message: userMsg \}\)\s*\}\);/, interactFetch);

// Update fetchLogs
const logsFetch = `
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs', { headers: getHeaders() });
      if (res.ok) {
        setServerLogs(await res.json());
      }
    } catch(e) {}
  };
`;
content = content.replace(/const fetchLogs = async \(\) => \{[\s\S]*?catch\(e\) \{\}\s*\};/, logsFetch);

// Add the auth modal at the end of the return
const authModal = `
      {isAuthModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-white">Authentication Required</h2>
            </div>
            <p className="text-neutral-400 text-sm mb-6">
              This dashboard is protected in production. Please enter the Admin Password to access telemetry and controls.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              setAuthError('');
              fetchState(); // Re-fetch with new password
            }}>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter Admin Password"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}
              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace("</main>", "</main>\n" + authModal);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx to include auth modal');
