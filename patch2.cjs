const fs = require('fs');
const path = 'src/backend/core/MurgiBrain.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/await this\.memory\.addShortTermMessage\(userId, 'murgi', response\.text\);[\s\S]*?return response\.text;/g, 
`      // Sanitize response to remove <think>...</think> blocks leaked by R1 distillation models
      let cleanText = response.text.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
      
      // Also catch raw "Here's a thinking process:" text if the XML tags were omitted
      if (cleanText.includes("Here's a thinking process:")) {
          cleanText = cleanText.split("Here's a thinking process:")[0].trim();
      }

      // Save Murgi's response to memory
      await this.memory.addShortTermMessage(userId, 'murgi', cleanText);
      
      logger.info('Brain finished processing pipeline successfully.');
      return cleanText;`
);

fs.writeFileSync(path, code);
console.log("Patched successfully with regex.");
