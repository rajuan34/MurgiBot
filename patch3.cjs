const fs = require('fs');
const path = 'src/backend/core/MurgiBrain.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
/let cleanText = response\.text\.replace[\\s\\S]*?return cleanText;/g,
`let cleanText = response.text.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
      
      // If the model leaked thoughts without <think> tags (e.g., starting with "Here's a thinking process:")
      if (cleanText.startsWith("Here's a thinking process:")) {
          // Find the last empty line or specific marker if possible, but usually it's better to just regex it out if we know the pattern.
          // Since the <think> tag regex already ran, if we STILL see this, it means no tags were used.
          // Let's try to grab the last line as the actual response since the bot is supposed to output 1 short sentence.
          const lines = cleanText.split('\\n');
          // Filter out empty lines and thinking process lines
          const validLines = lines.filter(l => l.trim().length > 0 && !l.includes('Here\\'s a thinking process:') && !l.match(/^[0-9]+\\.\\s/));
          if (validLines.length > 0) {
              cleanText = validLines[validLines.length - 1]; // usually the last line is the actual output
          }
      }

      // Final fallback if empty
      if (!cleanText) cleanText = "kire bhai, mood nai amar (brain lag)";

      // Save Murgi's response to memory
      await this.memory.addShortTermMessage(userId, 'murgi', cleanText);
      
      logger.info('Brain finished processing pipeline successfully.');
      return cleanText;`
);

fs.writeFileSync(path, code);
console.log("Patched successfully.");
