const fs = require('fs');

const path = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(path, 'utf8');

const courtRegex = /if \(command === 'court'\) \{[\s\S]*?return true;\s*\}/;
const fightRegex = /if \(command === 'fight'\) \{[\s\S]*?return true;\s*\}/;
const biryaniRegex = /if \(command === 'biryani_roulette'\) \{[\s\S]*?return true;\s*\}/;

const courtReplacement = `if (command === 'court') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         \`COMMAND: !court. INSTRUCTION: You just sentenced \${targetUserName} to guilty. State a short, hilarious fake crime and a funny penalty in Banglish. Format your answer EXACTLY like this (2 lines):\\nCrime: [crime]\\nPenalty: [penalty]. Do not use quotes.\`
      );
      
      let crime = "Friday night e jaldi ghumay jawar jonno";
      let penalty = "Creator ke 100 taka flexiload";
      
      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('crime:')) crime = line.substring(6).trim();
         if (line.toLowerCase().startsWith('penalty:')) penalty = line.substring(8).trim();
      }

      const frame = \`\\\`\\\`\\\`text
┌
│ ⚖️ BOHRUPI COURT IN SESSION
│ ─────────────────────────────────────────────────────────
│ 
│ 👨⚖️ Presiding Judge: Bohrupi
│ 🎯 Accused Member: \${targetUserName}
│ 
│ 📋 Offense:
│ └─ "\${crime}"
│ 
│ 🏛️ Courtroom Visual:
│ ┌────────────────────────────────────────┐
│ │  👨⚖️ Bohrupi : "Order in the court!"   │
│ │  🔨 *Gavel Smashes*                    │
│ │  ⛓️ \${targetUserName.padEnd(9)} : "Bhai ami innocent!"    │
│ └────────────────────────────────────────┘
│ 
│ 📊 Server Jury Status:
│ 🟢 Not Guilty [ 1 ]  |  🔴 Guilty [ 42 ]
│ 
│ 🚨 Verdict: GUILTY - NO MERCY
│ 💸 Penalty: \${penalty}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\\\`\\\`\\\`\`;
      await message.reply(frame);
      return true;
    }`;

const fightReplacement = `if (command === 'fight') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         \`COMMAND: !fight. INSTRUCTION: You just knocked out \${targetUserName} in a street fight. Name a hilarious, absurd knockout move (e.g. CHICKEN SLAP, NOKH DIYE KHAMCHI). Format your answer EXACTLY like this (2 lines):\\nMove: [move]\\nTrashTalk: [trash talk in banglish]. Do not use quotes.\`
      );
      
      let move = "CHICKEN SLAP";
      let trashTalk = \`\${targetUserName} tui to 1 v 1 e pure bot 💀 ja age practice kore ay!\`;
      
      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('move:')) move = line.substring(5).trim();
         if (line.toLowerCase().startsWith('trashtalk:')) trashTalk = line.substring(10).trim();
      }

      const frame = \`\\\`\\\`\\\`text
┌
│ ⚔️ BOHRUPI STREET FIGHT - MATCH RESULT
│ ─────────────────────────────────────────────────────────
│ 
│ 🥊 Fighters:
│ ├─ 🐔 Bohrupi  : [██████████] 100 HP
│ └─ 💀 \${targetUserName.padEnd(8)} : [░░░░░░░░░░] 0 HP (KO)
│ 
│ 📍 Battle Location:
│ └─ Mirpur 10 Circle
│ 
│ 💥 Final Knockout Move:
│ ┌────────────────────────────────────────┐
│ │  🐔 Bohrupi ───💥 [\${move}] ───> 💀 \${targetUserName} │
│ └────────────────────────────────────────┘
│ 
│ 🏆 Result: CRITICAL HIT! Bohrupi landed a 100 DMG KO SLAP!
│ 💬 Comment: \${trashTalk}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\\\`\\\`\\\`\`;
      await message.reply(frame);
      return true;
    }`;

const biryaniReplacement = `if (command === 'biryani_roulette') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         \`COMMAND: !biryani_roulette. INSTRUCTION: \${targetUserName} was playing biryani roulette and got the worst possible item in their biryani instead of meat. Name a hilarious inedible object (e.g. CRICKET IN ALU, TEELA POKA, NOSTHO ELAICHI). Format your answer EXACTLY like this (3 lines):\\nDish: [dish]\\nNotes: [kitchen notes in banglish]\\nMock: [mocking sentence in banglish]\`
      );
      
      let dish = "CRICKET IN ALU";
      let notes = "Teela poka found inside the rice packet.";
      let mock = \`bhai \${targetUserName}, ajke ar bhat khas na tui!\`;
      
      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('dish:')) dish = line.substring(5).trim();
         if (line.toLowerCase().startsWith('notes:')) notes = line.substring(6).trim();
         if (line.toLowerCase().startsWith('mock:')) mock = line.substring(5).trim();
      }

      const frame = \`\\\`\\\`\\\`text
┌
│ 🎰 BOHRUPI BIRYANI ROULETTE
│ ─────────────────────────────────────────────────────────
│ 
│ 👤 Customer: \${targetUserName}
│ 🍗 Bowl Dish: \${dish}
│ 
│ 📊 Dish Rating: 0/10 (FATAL DANGER)
│ 🤢 Status: POISONOUS BOWL
│ 
│ 📋 Kitchen Notes:
│ └─ "\${notes}"
│ 
│ 🚨 Result: WORST BOWL EVER 💀
│ 💬 Message: \${mock}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\\\`\\\`\\\`\`;
      await message.reply(frame);
      return true;
    }`;

let newCode = code;
newCode = newCode.replace(courtRegex, courtReplacement);
newCode = newCode.replace(fightRegex, fightReplacement);
newCode = newCode.replace(biryaniRegex, biryaniReplacement);

fs.writeFileSync(path, newCode);
console.log('Successfully applied single-frame templates.');
