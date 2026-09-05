const fs = require('fs');
const path = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(path, 'utf8');

// Patch court
const courtParseOld = `      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('crime:')) crime = line.substring(6).trim();
         if (line.toLowerCase().startsWith('penalty:')) penalty = line.substring(8).trim();
      }`;
const courtParseNew = `      const crimeMatch = aiResponse.match(/\\bcrime\\s*[:\\-]\\s*(.*)/i);
      const penaltyMatch = aiResponse.match(/\\bpenalty\\s*[:\\-]\\s*(.*)/i);
      if (crimeMatch) crime = crimeMatch[1].replace(/\\*\\*/g, '').trim();
      if (penaltyMatch) penalty = penaltyMatch[1].replace(/\\*\\*/g, '').trim();`;
code = code.replace(courtParseOld, courtParseNew);

// Patch fight
const fightParseOld = `      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('move:')) move = line.substring(5).trim();
         if (line.toLowerCase().startsWith('trashtalk:')) trashTalk = line.substring(10).trim();
      }`;
const fightParseNew = `      const moveMatch = aiResponse.match(/\\bmove\\s*[:\\-]\\s*(.*)/i);
      const trashTalkMatch = aiResponse.match(/\\btrashtalk\\s*[:\\-]\\s*(.*)/i);
      if (moveMatch) move = moveMatch[1].replace(/\\*\\*/g, '').trim();
      if (trashTalkMatch) trashTalk = trashTalkMatch[1].replace(/\\*\\*/g, '').trim();`;
code = code.replace(fightParseOld, fightParseNew);

// Patch biryani
const biryaniParseOld = `      const lines = aiResponse.split('\\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('dish:')) dish = line.substring(5).trim();
         if (line.toLowerCase().startsWith('notes:')) notes = line.substring(6).trim();
         if (line.toLowerCase().startsWith('mock:')) mock = line.substring(5).trim();
      }`;
const biryaniParseNew = `      const dishMatch = aiResponse.match(/\\bdish\\s*[:\\-]\\s*(.*)/i);
      const notesMatch = aiResponse.match(/\\bnotes\\s*[:\\-]\\s*(.*)/i);
      const mockMatch = aiResponse.match(/\\bmock\\s*[:\\-]\\s*(.*)/i);
      if (dishMatch) dish = dishMatch[1].replace(/\\*\\*/g, '').trim();
      if (notesMatch) notes = notesMatch[1].replace(/\\*\\*/g, '').trim();
      if (mockMatch) mock = mockMatch[1].replace(/\\*\\*/g, '').trim();`;
code = code.replace(biryaniParseOld, biryaniParseNew);

fs.writeFileSync(path, code);
console.log('Fixed parsing logic');
