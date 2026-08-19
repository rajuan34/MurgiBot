const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetUseEffect = `  useEffect(() => {
    fetchState();
    fetchLogs();
    const interval = setInterval(() => {
      fetchState();
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);`;

const replacementUseEffect = `  useEffect(() => {
    if (!isAuthModalOpen) {
      fetchState();
      fetchLogs();
    }
    const interval = setInterval(() => {
      if (!isAuthModalOpen && localStorage.getItem('admin_password') && localStorage.getItem('admin_password') !== 'null') {
        fetchState();
        fetchLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isAuthModalOpen]);`;

content = content.replace(targetUseEffect, replacementUseEffect);
fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx effectively patched.');
