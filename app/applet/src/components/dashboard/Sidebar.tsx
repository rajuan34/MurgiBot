import React from 'react';
import { LayoutDashboard, Server, ListTree, Activity, AlertTriangle, Network, ShieldCheck, FileText, Settings, Rocket } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'resources', label: 'Resources', icon: Server },
    { id: 'tasks', label: 'Tasks & Workers', icon: ListTree },
    { id: 'logs', label: 'Live Logs', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'api', label: 'API Monitoring', icon: Network },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full flex-shrink-0 hidden md:flex">
      <div className="p-5 border-b border-neutral-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Activity className="w-5 h-5 text-neutral-900" />
        </div>
        <div>
          <h1 className="font-bold text-neutral-100">OpsCenter</h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Production Env</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">
        Super Admin Role
      </div>
    </div>
  );
}
