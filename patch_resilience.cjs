const fs = require('fs');
const path = './src/components/dashboard/ProviderResilience.tsx';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
`      .then(data => {
        // Sort by priority
        const sorted = data.sort((a: any, b: any) => a.priority - b.priority);
        setConfig(sorted);
      })`,
`      .then(data => {
        // Ensure data is an array before sorting
        if (Array.isArray(data)) {
          const sorted = data.sort((a: any, b: any) => a.priority - b.priority);
          setConfig(sorted);
        } else if (data && Array.isArray(data.config)) {
          const sorted = data.config.sort((a: any, b: any) => a.priority - b.priority);
          setConfig(sorted);
        } else {
          console.error("Unexpected config format from server:", data);
        }
      })`
);

fs.writeFileSync(path, code);
console.log('Patched ProviderResilience.tsx');
