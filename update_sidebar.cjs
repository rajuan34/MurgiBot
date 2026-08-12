const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/Sidebar.tsx', 'utf8');

if (!code.includes("import { Brain,")) {
    code = code.replace("import { LayoutDashboard", "import { Brain, LayoutDashboard");
}

const newItem = `    { id: 'overview', label: 'Overview', icon: LayoutDashboard },\n    { id: 'ai-engine', label: 'Murgi AI Core', icon: Brain },`;

if (!code.includes("Murgi AI Core")) {
    code = code.replace(`    { id: 'overview', label: 'Overview', icon: LayoutDashboard },`, newItem);
}

fs.writeFileSync('src/components/dashboard/Sidebar.tsx', code);
