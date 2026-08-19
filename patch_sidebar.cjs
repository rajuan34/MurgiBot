const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Sidebar.tsx', 'utf8');

// Add LogOut to imports
content = content.replace(
  "import { LayoutDashboard, Server, ListTree, Activity, AlertTriangle, Network, ShieldCheck, FileText, Settings, Rocket, Brain, X } from 'lucide-react';",
  "import { LayoutDashboard, Server, ListTree, Activity, AlertTriangle, Network, ShieldCheck, FileText, Settings, Rocket, Brain, X, LogOut } from 'lucide-react';"
);

// Add the logout button before Super Admin Role
const logoutButton = `
        <div className="px-3 pb-2 border-t border-neutral-800 pt-4 mt-auto">
          <button
            onClick={() => {
              localStorage.removeItem('admin_password');
              window.location.reload();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
`;

content = content.replace(
  '<div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">',
  logoutButton + '\n        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">'
);

fs.writeFileSync('src/components/dashboard/Sidebar.tsx', content);
console.log('Sidebar patched with logout button.');
