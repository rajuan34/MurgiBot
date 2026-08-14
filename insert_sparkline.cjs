const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

const target = `<div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2 flex justify-between items-center">
                   <div className="text-xs text-neutral-500">DB Uptime</div>
                   <div className="text-sm font-medium text-neutral-300">{formatUptime(botState.memory.dbStatus.uptimeSeconds)}</div>
                 </div>`;

const replacement = `<div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2 flex justify-between items-center">
                   <div className="text-xs text-neutral-500">DB Uptime</div>
                   <div className="text-sm font-medium text-neutral-300">{formatUptime(botState.memory.dbStatus.uptimeSeconds)}</div>
                 </div>
                 
                 <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2">
                   <div className="text-xs text-neutral-500 mb-2">Query Activity (Live)</div>
                   <div className="h-12 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={queryData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                         <defs>
                           <linearGradient id="colorQuery" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorQuery)" isAnimationActive={false} />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
  console.log("Replaced using exact string");
} else {
  // Let's use a regex that is spacing-agnostic
  const regex = /<div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2 flex justify-between items-center">[\s\S]*?<\/div>/;
  const match = code.match(regex);
  if (match) {
    code = code.replace(regex, match[0] + "\n\n" + `                 <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 col-span-2">
                   <div className="text-xs text-neutral-500 mb-2">Query Activity (Live)</div>
                   <div className="h-12 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={queryData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                         <defs>
                           <linearGradient id="colorQuery" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorQuery)" isAnimationActive={false} />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </div>`);
    fs.writeFileSync('src/components/dashboard/OverviewView.tsx', code);
    console.log("Replaced using regex");
  } else {
    console.log("Could not find the target at all");
  }
}
