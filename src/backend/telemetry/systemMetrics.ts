import os from 'os';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: number;
  network: {
    status: string;
  };
  database: {
    status: string;
  };
}

let lastCpuInfo = os.cpus();
let lastCpuTime = Date.now();

export function getSystemMetrics(): SystemMetrics {
  const currentCpuInfo = os.cpus();
  const currentCpuTime = Date.now();
  
  let idleDifference = 0;
  let totalDifference = 0;
  
  for (let i = 0; i < currentCpuInfo.length; i++) {
    const last = lastCpuInfo[i].times;
    const current = currentCpuInfo[i].times;
    
    idleDifference += current.idle - last.idle;
    
    const lastTotal = Object.values(last).reduce((acc, val) => acc + val, 0);
    const currentTotal = Object.values(current).reduce((acc, val) => acc + val, 0);
    
    totalDifference += currentTotal - lastTotal;
  }
  
  let cpuUsage = 0;
  if (totalDifference > 0) {
    const usage = 100 - Math.floor((100 * idleDifference) / totalDifference);
    cpuUsage = usage < 0 ? 0 : usage;
  }

  lastCpuInfo = currentCpuInfo;
  lastCpuTime = currentCpuTime;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpu: {
      usage: cpuUsage,
      cores: currentCpuInfo.length,
      load: os.loadavg(),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    uptime: os.uptime(),
    network: {
      status: 'Unavailable', 
    },
    database: {
      status: 'Unavailable', 
    }
  };
}

export const activeTasks = [
  { id: 't-001', name: 'Background Event Loop', type: 'system', status: 'Running', startedAt: new Date(Date.now() - 3600000).toISOString(), cpu: 0.1, memory: 5 },
  { id: 't-002', name: 'Discord WebSocket', type: 'network', status: 'Running', startedAt: new Date(Date.now() - 3600000).toISOString(), cpu: 1.2, memory: 15 },
  { id: 't-003', name: 'Memory Garbage Collection', type: 'maintenance', status: 'Pending', startedAt: new Date().toISOString(), cpu: 0, memory: 0 },
];
