const fs = require('fs');
let code = fs.readFileSync('src/backend/core/MurgiBrain.ts', 'utf8');

// Update get contexts
code = code.replace(
  'const shortTermContext = this.memory.getShortTermContext(userId);',
  'const shortTermContext = await this.memory.getShortTermContext(userId);'
);

code = code.replace(
  'const longTermContext = this.memory.getLongTermContext(userId);',
  'const longTermContext = await this.memory.getLongTermContext(userId);'
);

// Update add short term message (user)
code = code.replace(
  "this.memory.addShortTermMessage(userId, 'user', message);",
  "await this.memory.addShortTermMessage(userId, 'user', message);"
);

// Update add short term message (murgi)
code = code.replace(
  "this.memory.addShortTermMessage(userId, 'murgi', response.text);",
  "await this.memory.addShortTermMessage(userId, 'murgi', response.text);"
);

fs.writeFileSync('src/backend/core/MurgiBrain.ts', code);
console.log("Updated MurgiBrain.ts to await memory calls");
