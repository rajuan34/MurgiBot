const fs = require('fs');
let code = fs.readFileSync('src/backend/memory/MemoryEngine.ts', 'utf8');

// The faulty string is likely something like: \`\${m.role === 'user' ? 'User' : 'Murgi'}: \${m.text}\`
// Because of string escaping issues, let's just do a clean replace using code construction

code = code.replace(/\\`\\\$\\{m\.role === 'user' \? 'User' : 'Murgi'\\}: \\\\?\\$\\{m\.text\\}\\`/g, "`${m.role === 'user' ? 'User' : 'Murgi'}: ${m.text}`");

// Actually simpler: just find return history.map(...) and return facts.map(...) and replace the whole line.
code = code.replace(/return history\.map.*join.*/g, "return history.map(m => `${m.role === 'user' ? 'User' : 'Murgi'}: ${m.text}`).join('\\n');");
code = code.replace(/return facts\.map.*join.*/g, "return facts.map(f => `- ${f.fact}`).join('\\n');");

fs.writeFileSync('src/backend/memory/MemoryEngine.ts', code);
console.log("Fixed syntax");
