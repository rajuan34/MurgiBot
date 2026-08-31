const fs = require('fs');
const path = 'src/backend/core/MurgiBrain.ts';
let code = fs.readFileSync(path, 'utf8');

const target = `      // Save Murgi's response to memory
      await this.memory.addShortTermMessage(userId, 'murgi', response.text);
      
      logger.info('Brain finished processing pipeline successfully.');
      return response.text;`;

const replacement = `      // Sanitize response to remove <think>...</think> blocks leaked by R1 distillation models
      let cleanText = response.text.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
      
      // Also catch raw "Here's a thinking process:" text if the XML tags were omitted
      if (cleanText.includes("Here's a thinking process:")) {
          cleanText = cleanText.split("Here's a thinking process:")[0].trim();
      }

      // Save Murgi's response to memory
      await this.memory.addShortTermMessage(userId, 'murgi', cleanText);
      
      logger.info('Brain finished processing pipeline successfully.');
      return cleanText;`;

if (code.includes("addShortTermMessage(userId, 'murgi', response.text)")) {
    code = code.replace(target, replacement);
    fs.writeFileSync(path, code);
    console.log("Patched successfully.");
} else {
    console.log("Target not found!");
}
