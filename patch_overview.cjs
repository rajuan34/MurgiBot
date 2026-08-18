const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/OverviewView.tsx', 'utf8');

// Add Smile import
content = content.replace("Activity, AlertCircle", "Activity, AlertCircle, Smile");

// Replace Uptime card with Mood card
const uptimeCardRegex = /<div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">\s*<div className="flex items-center justify-between mb-4">\s*<h3 className="text-sm font-medium text-neutral-400">System Uptime<\/h3>\s*<Clock className="w-4 h-4 text-purple-400" \/>\s*<\/div>\s*<div className="text-2xl font-bold text-white mb-1">\s*\{metrics \? formatUptime\(metrics\.uptime\) : '--'\}\s*<\/div>\s*<div className="text-xs text-neutral-500">\s*Since last restart\s*<\/div>\s*<\/div>/;

const newCard = `<div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">Current Mood</h3>
            <Smile className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1 capitalize">
            {botState?.identity?.currentMood || '--'}
          </div>
          <div className="text-xs text-neutral-500">
            Active Personality State
          </div>
        </div>`;

content = content.replace(uptimeCardRegex, newCard);

fs.writeFileSync('src/components/dashboard/OverviewView.tsx', content);
console.log('OverviewView patched successfully');
