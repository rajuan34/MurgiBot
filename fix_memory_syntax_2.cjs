const fs = require('fs');
let code = fs.readFileSync('src/backend/memory/MemoryEngine.ts', 'utf8');

// The faulty string is likely something like: \`Stored new temporary cached fact for user \${userId}\`
code = code.replace(/\\`Stored new temporary cached fact for user \\\$\\{userId\\}\\`/g, "`Stored new temporary cached fact for user ${userId}`");
code = code.replace(/\\`\[Fallback\] Stored new long-term fact for user \\\$\\{userId\\}\\`/g, "`[Fallback] Stored new long-term fact for user ${userId}`");

fs.writeFileSync('src/backend/memory/MemoryEngine.ts', code);
console.log("Fixed syntax 2");
