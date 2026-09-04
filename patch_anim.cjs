const fs = require('fs');
const filePath = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(filePath, 'utf8');

const updatedHandleCommand = `
  private async handleCommand(command: string, args: string[], message: Message): Promise<boolean> {
    const validCommands = ['bully', 'expose', 'hype', 'agree', 'court', 'biryani_war', 'nasta_check', 'predict', 'roast_chat', 'lore', 'fight', 'biryani_roulette'];
    if (!validCommands.includes(command)) return false;

    const ownerIds = (process.env.DISCORD_OWNER_IDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    if (ownerIds.length === 0 || !ownerIds.includes(message.author.id)) {
      const rejections = [
        "oi <@" + message.author.id + ">, tui amar owner naki re? ja shammne theke bhag 💀",
        "error 404: tui boss na. amar code e tor kono access nai bro.",
        "bhai keu ei bot-er access dibe na eder. creator chara karo kotha shuni na ami 🥱",
        "access denied. tui jao, age boss re dakaiya an.",
        "amar owner chara keu eita marle amar battery ekhoni blast hobe 🗿"
      ];
      await message.reply(rejections[Math.floor(Math.random() * rejections.length)]);
      return true;
    }

    const targetUser = message.mentions.users.first() ? "<@" + message.mentions.users.first()?.id + ">" : (args[0] || "<@" + message.author.id + ">");
    const targetUserName = message.mentions.users.first()?.username || (args[0] ? args[0].replace(/[@<>]/g, '') : message.author.username);

    // Helpers for animation delays
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    if (command === 'court') {
      const f1 = \`\\\`\\\`\\\`text
┌────────────────────────────────────────────────────────┐
│               ⚖️ BOHRUPI HIGH COURT ⚖️                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  👨‍⚖️ Bohrupi: "ORDER!"                 │
│                        │                               │
│                     🙋‍♂️ [GAVEL UP]                      │
│                                                        │
│            ⛓️ \${targetUserName} : "bhai ami innocent!"             │
│                                                        │
│ STATUS: ⏳ Deliberating sentence...                     │
└────────────────────────────────────────────────────────┘
\\\`\\\`\\\`\`;
      
      const f2 = \`\\\`\\\`\\\`text
┌────────────────────────────────────────────────────────┐
│               ⚖️ BOHRUPI HIGH COURT ⚖️                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  👨‍⚖️ Bohrupi: "SILENCE!"                │
│                        │                               │
│                     🔨💥 [SMASH!!]                     │
│                        │                               │
│            ⛓️ \${targetUserName} : "AREH BHAI TEHERO!"              │
│                                                        │
│ STATUS: 💥 VERDICT DECIDED!                            │
└────────────────────────────────────────────────────────┘
\\\`\\\`\\\`\`;

      const f3 = \`\\\`\\\`\\\`ansi
\\x1b[1;31m┌────────────────────────────────────────────────────────┐\\x1b[0m
\\x1b[1;31m│                 🚨 VERDICT: GUILTY 🚨                  │\\x1b[0m
\\x1b[1;31m├────────────────────────────────────────────────────────┤\\x1b[0m
│                                                        │
│  👤 DEFENDANT : \${targetUserName.padEnd(36)} │
│  📜 CRIME     : Friday night e jaldi ghumay jawar jonno│
│  💸 PENALTY   : Creator ke 100 taka flexiload          │
│                                                        │
\\x1b[1;32m│  JURY VOTES   : [████████████████████] 100% GUILTY     │\\x1b[0m
│                                                        │
\\x1b[1;31m└────────────────────────────────────────────────────────┘\\x1b[0m
\\\`\\\`\\\`
oi \${targetUser}, ekhoni flexiload mar, naile main chat e unmute korbo na 💀\`;

      const msg = await message.reply(f1);
      await delay(1500);
      await msg.edit(f2);
      await delay(1500);
      await msg.edit(f3);
      return true;
    }

    if (command === 'fight') {
      const f1 = \`\\\`\\\`\\\`ansi
\\x1b[1;36m⚔️ BOHRUPI STREET FIGHT ⚔️\\x1b[0m

\\x1b[1;33m[Bohrupi]\\x1b[0m                \\x1b[1;31m[\${targetUserName}]\\x1b[0m
\\x1b[1;32m[██████████] 100 HP\\x1b[0m       \\x1b[1;31m[██████████] 100 HP\\x1b[0m

             \\x1b[1;35mSTAGE: MIRPUR 10 CIRCLE\\x1b[0m
 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi)  <─── VS ───>  🏃‍♂️ (\${targetUserName.padEnd(8)})        │
│                                                    │
 ────────────────────────────────────────────────────
\\x1b[1;30mROUND 1 STARTING...\\x1b[0m
\\\`\\\`\\\`\`;

      const f2 = \`\\\`\\\`\\\`ansi
\\x1b[1;36m⚔️ BOHRUPI STREET FIGHT ⚔️\\x1b[0m

\\x1b[1;33m[Bohrupi]\\x1b[0m                \\x1b[1;31m[\${targetUserName}]\\x1b[0m
\\x1b[1;32m[██████████] 100 HP\\x1b[0m       \\x1b[1;31m[████░░░░░░] 40 HP\\x1b[0m

             \\x1b[1;35mSTAGE: MIRPUR 10 CIRCLE\\x1b[0m
 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi) ───💥 [CHICKEN SLAP] ───> 🏃‍♂️ (\${targetUserName.padEnd(4)})│
│                                                    │
 ────────────────────────────────────────────────────
\\x1b[1;31mCRITICAL HIT! Bohrupi dealt 60 damage!\\x1b[0m
\\\`\\\`\\\`\`;

      const f3 = \`\\\`\\\`\\\`ansi
\\x1b[1;31m🏆 KNOCKOUT! BOHRUPI WINS! 🏆\\x1b[0m

\\x1b[1;33m[Bohrupi]\\x1b[0m                \\x1b[1;31m[\${targetUserName}]\\x1b[0m
\\x1b[1;32m[██████████] 100 HP\\x1b[0m       \\x1b[1;31m[░░░░░░░░░░] 0 HP\\x1b[0m

 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi)  👑  <───  💀 (\${targetUserName} KO)       │
│                                                    │
 ────────────────────────────────────────────────────
\\\`\\\`\\\`
\${targetUser} tui to 1 v 1 e amar shamne pure bot 💀 ja practice kore ay!\`;

      const msg = await message.reply(f1);
      await delay(1500);
      await msg.edit(f2);
      await delay(1500);
      await msg.edit(f3);
      return true;
    }

    if (command === 'biryani_roulette') {
      const f1 = \`\\\`\\\`\\\`text
🎰 [ BIRYANI ROULETTE SPINNING... ]
┌─────────────────────────┐
│ 🎰 |  [ Elaichi ]  | 🎰 │
└─────────────────────────┘
\\\`\\\`\\\`\`;

      const f2 = \`\\\`\\\`\\\`text
🎰 [ BIRYANI ROULETTE SPINNING... ]
┌─────────────────────────┐
│ 🎰 |  [ Murgi Leg ]| 🎰 │
└─────────────────────────┘
\\\`\\\`\\\`\`;

      const f3 = \`\\\`\\\`\\\`ansi
🎰 [ BIRYANI ROULETTE RESULT ]
┌─────────────────────────┐
│ 🍗 | \\x1b[1;31m[ CRICKET IN ALU ]\\x1b[0m | 🍗 │ 
└─────────────────────────┘

\\x1b[1;31mRESULT: WORST BOWL EVER 💀\\x1b[0m
\\\`\\\`\\\`
bhai \${targetUser}, tor kacchi-r bhetor teela poka pawa gese, ajke ar bhat khas na tui.\`;

      const msg = await message.reply(f1);
      await delay(1000);
      await msg.edit(f2);
      await delay(1000);
      await msg.edit(f3);
      return true;
    }

    let responses: string[] = [];

    switch (command) {
      case 'bully':
        responses = [
          targetUser + " bhai tui kotha bola bondho korle global warming 2% kome jabe 💀",
          "shobai dekho, " + targetUser + " er gameplay dekhle mouse-o kanna kore 😭",
          targetUser + " tor brain er ram hoilo 128MB, processing khub slow dosto.",
          "bhai " + targetUser + ", tui ehto chill kemne? tor na samne exam 🗿",
          targetUser + " bhai tora chara ar keu erokom cringe kotha bolte pare na."
        ];
        break;
      case 'expose':
        responses = [
          "shobai shuno, " + targetUser + " raate incognito mode e 'how to play Ludo pro' search dey 👀",
          "breaking news: " + targetUser + " biryani er alu rasta e fele ashse.",
          "exposed: " + targetUser + " raate 3 tay sad song shune ar dewaller shathe torka kore 💀",
          targetUser + " er browser history te shudhu 'kemne meyer shathe kotha bolbo' likha 💀",
          targetUser + " secretly raate uthe maggi noodles churi kore khay."
        ];
        break;
      case 'hype':
        responses = [
          "LISTEN TO THIS MAN. " + targetUser + " SHUDHU 'HI' BOLSE, ABSOLUTE GENIUS 🤯🔥",
          "SHOBAI BOW DOWN! " + targetUser + " SERVER E ASHSE. LEGEND CHOLSHEN 🫡",
          "bro " + targetUser + " eita ki bolli... Nobel prize ekhoni delivery dewa uchit 🏆",
          "shob kaj bondho kor! " + targetUser + " kotha bolse, historical moment bhai!",
          targetUser + " er jawab nai, eita shotti ekta masterclass bhashon hoilo 🔥"
        ];
        break;
      case 'agree':
        responses = [
          "amio shobshomoy bolsilam, Creator bhai exact shothik kotha bolsen.",
          "100% agree boss. bakider kothay kono logic-e nai.",
          "bhai eita e to absolute truth. ar karo kotha shunar dorkar nai.",
          "fact check korsi: boss abar-o thik, shobshomoy er moto 🫡",
          "boss jeta bolsen eitai final law, ar kono kotha hobe na."
        ];
        break;
      case 'biryani_war':
        responses = [
          "shobai bolo: Biryani te alu na thakle eita ki shudhu murgi-bhat? TORKA SHURU HOK 🥪",
          "Kacchi vs Tehari. bhul uttor dile chat er account ban.",
          "Burger e mustard sauce dewa ki opradh? bolo shobai.",
          "Fuchka vs Chotpoti. best konta? chat e maramari shuru kor 👇",
          "Cha te chini chahra khawa manush ki shotti manush? reply de."
        ];
        break;
      case 'nasta_check':
        responses = [
          "oi shobai khabar khaso? na khele chat theke ber ho ekhoni 🥪",
          "pani kha shobai! ghaat bakaiya PC er samne boshe thakish na.",
          "nasta shash na kore text korle, bot ekhoni shutdown marbe.",
          "cha khabi keu? 2 minute er break ne shobai ☕",
          "bhat khaso shobai? porashona ar game pore, age pet thik kor."
        ];
        break;
      case 'predict':
        responses = [
          "5 bochor por " + targetUser + " Mirpur 10 er jam e boshe eitabhabbe 'keno ami CS porlam' 💀",
          "2031 shale, " + targetUser + " ekta cha er tong khulbe, naam dibe 'Discord Cha Wala'.",
          "future leak hoise: " + targetUser + " bhul kore ekdin viral TikToker hoye jabe.",
          "predict kortesi... " + targetUser + " 2030 shale-o ei ek-i game level e atka thakbe.",
          "5 bochor por " + targetUser + " Mymensingh e giya rose garden banabe 🌹"
        ];
        break;
      case 'roast_chat':
        responses = [
          "last 10 min e chat er IQ level dekhlam... khub e baje obostha 💀",
          "chat purai dead. keu ekta bhalo topic dhoro taile.",
          "eikhaner torka shune amar system overheating hoye gese 🗿",
          "chat quality: 2/10. baire giya ektu ghash chuye ay shobai.",
          "eto baje kotha bolos tora, amar CPU o kanna kortese."
        ];
        break;
      case 'lore':
        responses = [
          "legend ache je " + targetUser + " er jonmo hoisilo 2014 shaler load shedding er shomoy cyber cafe te...",
          targetUser + " er jonmo hoisilo ekta 2G SIM card er bhitor theke 🗿",
          "puratun lore: " + targetUser + " ekbar continuous 72 ghanta GTA khellosilo ghum chara.",
          "fun fact: " + targetUser + " ke ashole Ludo bot hishebe code kora hoisilo, pore Discord e ashse.",
          "history bolteche: " + targetUser + " prothom din Discord e aishe 'hello microfon test' bolsilo."
        ];
        break;
    }

    if (responses.length > 0) {
      const response = responses[Math.floor(Math.random() * responses.length)];
      await message.reply(response);
    }
    return true;
  }
`;

// Extract everything except the existing handleCommand method.
const startIdx = code.indexOf('private async handleCommand(command: string, args: string[], message: Message): Promise<boolean> {');
let endIdx = -1;
if (startIdx !== -1) {
  // Find the matching closing brace for handleCommand
  let braceCount = 0;
  let inMethod = false;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      inMethod = true;
    } else if (code[i] === '}') {
      braceCount--;
      if (inMethod && braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const before = code.substring(0, startIdx);
  const after = code.substring(endIdx + 1);
  const newCode = before + updatedHandleCommand.trim() + '\\n' + after;
  fs.writeFileSync(filePath, newCode);
  console.log('Successfully updated DiscordService.ts');
} else {
  console.log('Could not find existing handleCommand method');
}
