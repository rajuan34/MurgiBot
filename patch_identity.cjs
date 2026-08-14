const fs = require('fs');
let code = fs.readFileSync('src/backend/identity/IdentityManager.ts', 'utf8');
code = code.replace(/username\/MurgiBot/g, 'Murgi-Clan/MurgiBot');
fs.writeFileSync('src/backend/identity/IdentityManager.ts', code);

// also update or create the json
if (fs.existsSync('identity-registry.json')) {
  let json = fs.readFileSync('identity-registry.json', 'utf8');
  json = json.replace(/username\/MurgiBot/g, 'Murgi-Clan/MurgiBot');
  fs.writeFileSync('identity-registry.json', json);
}
console.log("Patched github username to Murgi-Clan");
