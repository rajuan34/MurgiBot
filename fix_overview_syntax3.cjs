const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

const lastGood = "PostgreSQL cache is currently offline. System has fallen back to temporary in-memory storage.</p>              </div>            )}          </div>        </div>      </div>    </div>  );";

const splitIndex = code.indexOf(lastGood);
if (splitIndex !== -1) {
  code = code.substring(0, splitIndex + lastGood.length) + '\n}\n';
  fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
  console.log("Trimmed tail");
} else {
  console.log("Target not found");
}
