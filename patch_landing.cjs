const fs = require('fs');
const filePath = 'src/components/LandingPage.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Insert Commands link in navbar
code = code.replace(
  '<a href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">              Features            </a>',
  '<a href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">              Features            </a>            <Link to="/commands" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">              Commands            </Link>'
);

// Insert View Commands button in hero section
code = code.replace(
  'Explore Features <ArrowRight className="w-5 h-5" />            </a>',
  'Explore Features <ArrowRight className="w-5 h-5" />            </a>            <Link to="/commands" className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-medium px-8 py-4 rounded-full transition-all">              View Commands            </Link>'
);

fs.writeFileSync(filePath, code);
console.log('Patched LandingPage.tsx');
