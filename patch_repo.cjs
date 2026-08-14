const fs = require('fs');

function replaceRepoUrl(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Murgi-Clan\/MurgiBot\/main\/profile-pic/g, 'rajuan34/MurgiBot-Pics/main/images');
    content = content.replace(/username\/MurgiBot\/main\/profile-pic/g, 'rajuan34/MurgiBot-Pics/main/images');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

replaceRepoUrl('src/backend/identity/IdentityManager.ts');
replaceRepoUrl('identity-registry.json');
