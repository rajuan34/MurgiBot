const fs = require('fs');

let content = fs.readFileSync('src/backend/core/MurgiBrain.ts', 'utf8');

const importStatement = `import fs from 'fs/promises';\nimport path from 'path';\n`;
if (!content.includes('fs/promises')) {
    content = importStatement + content;
}

const replacement = `
    let befabureRules = "";
    try {
      befabureRules = await fs.readFile(path.join(process.cwd(), 'befabure.md'), 'utf8');
    } catch (err) {
      logger.warn('Failed to read befabure.md file', { error: err });
    }

    const systemInstruction = \`\${befabureRules}

[Current User Role: \${userRole}]
[Current Personality State: \${currentMood}]
This state is your most important behavioral filter right now:
\${stateDescriptions[currentMood] || stateDescriptions['Playful']}
\`.trim();
`;

// Replace the old systemInstruction generation with the new one
content = content.replace(/const systemInstruction = `You are Murgi[\s\S]*?raw response\.`\.trim\(\);/, replacement);

fs.writeFileSync('src/backend/core/MurgiBrain.ts', content);
console.log("Patched MurgiBrain.ts successfully.");
