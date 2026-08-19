import React from 'react';
import { LayoutDashboard, Server, ListTree, Activity, AlertTriangle, Network, ShieldCheck, FileText, Settings, Rocket, Brain, X, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileOpen = false, setIsMobileOpen }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'ai-engine', label: 'Murgi AI Core', icon: Brain },
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
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full flex-shrink-0 transition-transform duration-300 z-50 ${
        isMobileOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0'
      }`}>
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-100">OpsCenter</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Production Env</p>
            </div>
          </div>
          <button 
            className="md:hidden text-neutral-400 hover:text-white"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen?.(false);
                    }}
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
        
        <div className="px-3 pb-2 border-t border-neutral-800 pt-4 mt-auto">
          <button
            onClick={() => {
              localStorage.removeItem('admin_password');
              window.location.reload();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">
          Super Admin Role
        </div>
      </div>
    </>
  );
}
