const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

// The incorrect part at the bottom is:
//       </div>
//     </div>
//   );
//     </div>
//   );}

code = code.replace(/      <\/div>\n    <\/div>\n  \);\n    <\/div>\n  \);\}/g, '      </div>\n    </div>\n  );\n}');
// If the regex above failed earlier, let's just forcefully cut the string
const target = '  );    </div>  );}';
if (code.includes(target)) {
  code = code.replace(target, '  );\n}');
} else {
  // Let's do a more robust substring trim
  const correctEnd = '        </div>\n      </div>\n    </div>\n  );\n}';
  // I will just find the last AlertCircle block and append the right endings.
}

fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
