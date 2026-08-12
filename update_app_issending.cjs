const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add isSending state
if (!code.includes('isSending')) {
  code = code.replace(
    "const [input, setInput] = useState('');",
    "const [input, setInput] = useState('');\n  const [isSending, setIsSending] = useState(false);"
  );
}

// Update sendMessage function
const newSendMessage = `
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    
    const userMsg = input;
    setInput('');
    setIsSending(true);
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      setChatLog(prev => [...prev, { role: 'murgi', text: data.text || 'Error processing thought.' }]);
      fetchState(); 
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Connection Failed]' }]);
    } finally {
      setIsSending(false);
    }
  };
`;

code = code.replace(/const sendMessage = async \(\e: React.FormEvent\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?\}[\s\S]*?\};/, newSendMessage.trim());

// Pass isSending to AIEngineView
if (!code.includes('isSending={isSending}')) {
  code = code.replace(
    'latency={latency} />',
    'latency={latency} isSending={isSending} />'
  );
}

fs.writeFileSync('src/App.tsx', code);
