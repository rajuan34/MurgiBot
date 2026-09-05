const fs = require('fs');

const path = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /let responses: string\[\] = \[\];[\s\S]*?if \(responses\.length > 0\) {[\s\S]*?const response = responses\[Math\.floor\(Math\.random\(\) \* responses\.length\)\];[\s\S]*?await message\.reply\(response\);[\s\S]*?}/;

const replacementCode = `
    let commandPrompt = '';
    
    switch (command) {
      case 'bully':
        commandPrompt = \`COMMAND: !bully. TARGET: \${targetUserName}. INSTRUCTION: Roast and bully \${targetUserName} playfully but savagely in Banglish. Act toxic and unhinged. Mention them using \${targetUser}. Do not use quotes.\`;
        break;
      case 'expose':
        commandPrompt = \`COMMAND: !expose. TARGET: \${targetUserName}. INSTRUCTION: Make up a hilarious, fake "secret" or "leaked search history" about \${targetUserName} in Banglish. Be creative and funny. Mention them using \${targetUser}. Do not use quotes.\`;
        break;
      case 'hype':
        commandPrompt = \`COMMAND: !hype. TARGET: \${targetUserName}. INSTRUCTION: Hype up \${targetUserName} to an extreme, absurd level in Banglish. Treat them like an absolute legend or deity. Mention them using \${targetUser}.\`;
        break;
      case 'agree':
        commandPrompt = \`COMMAND: !agree. TARGET: \${targetUserName}. INSTRUCTION: Aggressively and absurdly agree with \${targetUserName} in Banglish. State that their words are the absolute truth. Mention them using \${targetUser}.\`;
        break;
      case 'biryani_war':
        commandPrompt = \`COMMAND: !biryani_war. INSTRUCTION: Start a highly controversial, chaotic debate about a local Bangladeshi food topic (like Kacchi vs Tehari, Alu in Biryani, etc.) in Banglish. Demand the chat to fight about it.\`;
        break;
      case 'nasta_check':
        commandPrompt = \`COMMAND: !nasta_check. INSTRUCTION: Aggressively ask everyone in the chat if they have eaten their snacks/food in Banglish. Act like a strict but chaotic desi guardian.\`;
        break;
      case 'predict':
        commandPrompt = \`COMMAND: !predict. TARGET: \${targetUserName}. INSTRUCTION: Predict a hilariously pathetic or absurd future for \${targetUserName} 5-10 years from now in Banglish. Mention them using \${targetUser}.\`;
        break;
      case 'roast_chat':
        commandPrompt = \`COMMAND: !roast_chat. INSTRUCTION: Roast the entire chat's current state, IQ level, or lack of activity in Banglish. Be apathetic, toxic, and savage.\`;
        break;
      case 'lore':
        commandPrompt = \`COMMAND: !lore. TARGET: \${targetUserName}. INSTRUCTION: Tell a completely fake, funny, and absurd historical "lore" or backstory about how \${targetUserName} was born or how they got here in Banglish. Mention them using \${targetUser}.\`;
        break;
    }

    if (commandPrompt !== '') {
      const response = await this.brain.processCommand(message.author.id, targetUserName, commandPrompt);
      await message.reply(response);
    }
`;

if(code.match(regex)) {
    code = code.replace(regex, replacementCode);
    fs.writeFileSync(path, code);
    console.log('Patched DiscordService.ts');
} else {
    console.log('Regex did not match DiscordService.ts');
}
