const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

const target = `  const cpuData = Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    value: Math.random() * 30 + (metrics?.cpu?.usage || 10)
  }));`;

const replacement = `  const cpuData = Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    value: Math.random() * 30 + (metrics?.cpu?.usage || 10)
  }));

  const queryData = Array.from({ length: 15 }).map((_, i) => ({
    time: i,
    value: Math.floor(Math.random() * 50) + (botState?.memory?.storage === 'postgres-cache' ? 10 : 0)
  }));`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
  console.log("Inserted queryData");
} else {
  // regex fallback
  const regex = /const cpuData = Array\.from\(\{ length: 20 \}\)\.map\(\(_, i\) => \(\{\s*time: i,\s*value: Math\.random\(\) \* 30 \+ \(metrics\?\.cpu\?\.usage \|\| 10\)\s*\}\)\);/;
  if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
    console.log("Inserted queryData with regex");
  } else {
    console.log("Could not find cpuData");
  }
}
