const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add a ref for the password
content = content.replace("const [adminPassword, setAdminPassword] = useState('');", "const [adminPassword, setAdminPassword] = useState('');\n  const passwordRef = useRef('');");

// Update the setAdminPassword in the input to also update the ref
content = content.replace("onChange={(e) => setAdminPassword(e.target.value)}", "onChange={(e) => { setAdminPassword(e.target.value); passwordRef.current = e.target.value; }}");

// Update getHeaders to use the ref instead of the state (or both)
content = content.replace(/const getHeaders = \(\) => \{[\s\S]*?return headers;\s*\};/, `
  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const pwd = passwordRef.current;
    if (pwd) headers['x-admin-password'] = pwd;
    return headers;
  };
`);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed stale state issue in interval');
