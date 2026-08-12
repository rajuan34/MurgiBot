const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure Menu is imported
if (!code.includes('Menu,') && !code.includes('Menu }')) {
  code = code.replace(/import { Activity.*? } from 'lucide-react';/, "import { Activity, ShieldAlert, Rocket, Database, Settings, Menu } from 'lucide-react';");
}

// Add state for mobile menu
if (!code.includes('isMobileMenuOpen')) {
  code = code.replace(
    `const [activeTab, setActiveTab] = useState('overview');`,
    `const [activeTab, setActiveTab] = useState('overview');\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);`
  );
}

// Pass state to Sidebar
if (!code.includes('isMobileOpen={isMobileMenuOpen}')) {
  code = code.replace(
    `<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />`,
    `<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />`
  );
}

// Add Hamburger menu to header
const oldHeaderLeft = `<div className="md:hidden flex items-center gap-2 font-bold">
            <Activity className="w-5 h-5 text-emerald-500" />
            OpsCenter
          </div>`;
          
const newHeaderLeft = `<div className="md:hidden flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-neutral-400 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Activity className="w-5 h-5 text-emerald-500" />
              OpsCenter
            </div>
          </div>`;

code = code.replace(oldHeaderLeft, newHeaderLeft);

fs.writeFileSync('src/App.tsx', code);
