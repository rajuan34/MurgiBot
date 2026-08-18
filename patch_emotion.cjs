const fs = require('fs');
let content = fs.readFileSync('src/backend/emotion/EmotionEngine.ts', 'utf8');

content = content.replace(
  "export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer';",
  "export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer' | 'RESPECTFUL_SON_CALM' | 'RESPECTFUL_FRIENDLY';"
);

fs.writeFileSync('src/backend/emotion/EmotionEngine.ts', content);
console.log('EmotionEngine type patched');
