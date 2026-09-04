const fs = require('fs');
const filePath = 'src/components/LandingPage.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace in navbar
code = code.replace(
  '<a\n              href="#features"\n              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"\n            >\n              Features\n            </a>',
  '<a\n              href="#features"\n              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"\n            >\n              Features\n            </a>\n            <Link\n              to="/commands"\n              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"\n            >\n              Commands\n            </Link>'
);

// Replace in hero section
code = code.replace(
  'Explore Features <ArrowRight className="w-5 h-5" />\n            </a>\n          </div>',
  'Explore Features <ArrowRight className="w-5 h-5" />\n            </a>\n            <Link\n              to="/commands"\n              className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-medium px-8 py-4 rounded-full transition-all"\n            >\n              View Commands\n            </Link>\n          </div>'
);

fs.writeFileSync(filePath, code);
console.log('Patched LandingPage.tsx with correct formatting');
