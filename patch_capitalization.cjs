const fs = require('fs');

function capitalizeUrls(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements = {
    'playful.png': 'Playful.png',
    'chill.png': 'Chill.png',
    'wise.png': 'Wise.png',
    'chaos.png': 'Chaotic.png',
    'curious.png': 'Curious.png',
    'supportive.png': 'Supportive.png',
    'competitive.png': 'Competitive.png',
    'sleepy.png': 'Sleepy.png',
    'event.png': 'Event.png',
    'default.png': 'Default.png'
  };

  for (const [oldVal, newVal] of Object.entries(replacements)) {
    content = content.replace(new RegExp(oldVal, 'g'), newVal);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

capitalizeUrls('src/backend/identity/IdentityManager.ts');
capitalizeUrls('identity-registry.json');
