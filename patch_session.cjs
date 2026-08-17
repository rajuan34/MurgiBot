const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update initial state
content = content.replace(
  "const [adminPassword, setAdminPassword] = useState('');",
  "const [adminPassword, setAdminPassword] = useState(sessionStorage.getItem('admin_password') || '');"
);

content = content.replace(
  "const passwordRef = useRef('');",
  "const passwordRef = useRef(sessionStorage.getItem('admin_password') || '');"
);

// 2. Update form onSubmit
const oldForm = `<form onSubmit={(e) => {
              e.preventDefault();
              setAuthError('');
              fetchState(); // Re-fetch with new password
            }}>`;
const newForm = `<form onSubmit={(e) => {
              e.preventDefault();
              setAuthError('');
              sessionStorage.setItem('admin_password', adminPassword);
              fetchState(); // Re-fetch with new password
            }}>`;
content = content.replace(oldForm, newForm);

// 3. Update 401 handlers to clear session
content = content.replace(
  `      if (res.status === 401) {
        setIsAuthModalOpen(true);
        setIsConnected(false);
        return;
      }`,
  `      if (res.status === 401) {
        setIsAuthModalOpen(true);
        setIsConnected(false);
        sessionStorage.removeItem('admin_password');
        return;
      }`
);

content = content.replace(
  `      if (res.status === 401) {
        setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Unauthorized]' }]);
        setIsAuthModalOpen(true);
        return;
      }`,
  `      if (res.status === 401) {
        setChatLog(prev => [...prev, { role: 'murgi', text: '[System Error: Unauthorized]' }]);
        setIsAuthModalOpen(true);
        sessionStorage.removeItem('admin_password');
        return;
      }`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Session storage logic injected');
