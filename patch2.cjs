const fs = require('fs');

let content = fs.readFileSync('src/backend/core/MurgiBrain.ts', 'utf8');

const startStr = "const systemInstruction = `You are Murgi";
const endStr = "Just the raw response.`.trim();";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
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
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync('src/backend/core/MurgiBrain.ts', content);
    console.log("Patched successfully with indexOf");
} else {
    console.log("Could not find start or end index", startIndex, endIndex);
}
