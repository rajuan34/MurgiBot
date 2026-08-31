const fs = require('fs');
const path = 'src/backend/core/MurgiBrain.ts';
let code = fs.readFileSync(path, 'utf8');

const target = `      // Also catch raw "Here's a thinking process:" text if the XML tags were omitted
      if (cleanText.includes("Here's a thinking process:")) {
          cleanText = cleanText.split("Here's a thinking process:")[0].trim();
      }`;

const replace = `      // Also catch raw "Here's a thinking process:" text if the XML tags were omitted
      if (cleanText.includes("Here's a thinking process:")) {
          const lines = cleanText.split('\\n');
          const validLines = lines.filter(l => l.trim().length > 0 && !l.includes("Here's a thinking process:") && !l.match(/^[0-9]+\\.\\s/) && !l.startsWith("[") && !l.endsWith("]"));
          if (validLines.length > 0) {
              cleanText = validLines[validLines.length - 1]; // Take the last valid line
          } else {
              cleanText = "kire bhai, mood nai amar";
          }
      }`;

if(code.includes(target)) {
   code = code.replace(target, replace);
   fs.writeFileSync(path, code);
   console.log("Fixed the thinking process leak.");
} else {
   console.log("Target not found!");
}
