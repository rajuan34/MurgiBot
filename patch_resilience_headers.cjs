const fs = require('fs');
const pathDash = './src/Dashboard.tsx';
let codeDash = fs.readFileSync(pathDash, 'utf-8');

if (!codeDash.includes('getHeaders={getHeaders} />}') || !codeDash.includes('AIEngineView')) {
  // Let's just fix AIEngineView invocation
}
codeDash = codeDash.replace(
  '<AIEngineView botState={botState} chatLog={chatLog} input={input} setInput={setInput} sendMessage={sendMessage} exportChatLog={exportChatLog} fetchState={fetchState} isConnected={isConnected} latency={latency} isSending={isSending} />',
  '<AIEngineView botState={botState} chatLog={chatLog} input={input} setInput={setInput} sendMessage={sendMessage} exportChatLog={exportChatLog} fetchState={fetchState} isConnected={isConnected} latency={latency} isSending={isSending} getHeaders={getHeaders} />'
);
fs.writeFileSync(pathDash, codeDash);

const pathEngine = './src/components/dashboard/AIEngineView.tsx';
let codeEngine = fs.readFileSync(pathEngine, 'utf-8');
if (!codeEngine.includes('getHeaders')) {
  codeEngine = codeEngine.replace('isSending: boolean;', 'isSending: boolean;\n  getHeaders: () => Record<string, string>;');
  codeEngine = codeEngine.replace('isSending}: AIEngineViewProps) {', 'isSending,\n  getHeaders\n}: AIEngineViewProps) {');
  codeEngine = codeEngine.replace('<ProviderResilience botState={botState} fetchState={fetchState} />', '<ProviderResilience botState={botState} fetchState={fetchState} getHeaders={getHeaders} />');
  fs.writeFileSync(pathEngine, codeEngine);
}

const pathResil = './src/components/dashboard/ProviderResilience.tsx';
let codeResil = fs.readFileSync(pathResil, 'utf-8');
codeResil = codeResil.replace('{ botState: any, fetchState: () => void }', '{ botState: any, fetchState: () => void, getHeaders: () => Record<string, string> }');
codeResil = codeResil.replace('export function ProviderResilience({ botState, fetchState }', 'export function ProviderResilience({ botState, fetchState, getHeaders }');
codeResil = codeResil.replace(`headers: {
          'Authorization': \`Bearer \${localStorage.getItem('admin_token')}\`
        }`, 'headers: getHeaders()');
codeResil = codeResil.replace(`headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${localStorage.getItem('admin_token')}\`
        }`, "headers: { ...getHeaders(), 'Content-Type': 'application/json' }");
fs.writeFileSync(pathResil, codeResil);

console.log('Patched headers');
