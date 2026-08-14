const fs = require('fs');

const mappings = {
  'Playful.png': 'Playful.png',
  'Chill.png': 'Quiet.png',
  'Wise.png': 'Nostalgic.png',
  'Chaotic.png': 'Playful.png', // No chaotic available
  'Curious.png': 'Social.png', // No curious available
  'Supportive.png': 'Wholesome.png',
  'Competitive.png': 'Focused.png',
  'Sleepy.png': 'Sleepy.png',
  'Event.png': 'Wholesome.png',
  'Default.png': 'Default.png'
};

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [oldImg, newImg] of Object.entries(mappings)) {
    content = content.replace(new RegExp(oldImg, 'g'), newImg);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Updated images in ${filePath}`);
}

patchFile('src/backend/identity/IdentityManager.ts');
patchFile('identity-registry.json');

