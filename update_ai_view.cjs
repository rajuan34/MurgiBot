const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AIEngineView.tsx', 'utf8');

if (!code.includes('isSending: boolean;')) {
  code = code.replace(
    'latency: number;\n}',
    'latency: number;\n  isSending: boolean;\n}'
  );
}

if (!code.includes('isSending\n}: AIEngineViewProps)')) {
  code = code.replace(
    'latency\n}: AIEngineViewProps)',
    'latency,\n  isSending\n}: AIEngineViewProps)'
  );
}

code = code.replace(
  'disabled={!input.trim()}',
  'disabled={!input.trim() || isSending}'
);

if (code.includes('<Send className="w-4 h-4" /> Send')) {
  code = code.replace(
    '<Send className="w-4 h-4" /> Send',
    '{isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {isSending ? "Thinking..." : "Send"}'
  );
}

fs.writeFileSync('src/components/dashboard/AIEngineView.tsx', code);
