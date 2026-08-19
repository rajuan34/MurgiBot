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
      // Don't poll if auth modal is open to prevent 401 spam
      if (!isAuthModalOpen && localStorage.getItem('admin_password')) {
        fetchState();
        fetchLogs();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthModalOpen]);`;

content = content.replace(targetUseEffect, replacementUseEffect);
fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched to prevent polling spam.');
