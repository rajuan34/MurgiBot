import React, { useEffect, useState } from 'react';
import { Play, Square, RotateCw, AlertTriangle, FileText } from 'lucide-react';

export function TasksView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/system/tasks');
        if (res.ok) {
          setTasks(await res.json());
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchTasks();
    const int = setInterval(fetchTasks, 5000);
    return () => clearInterval(int);
  }, []);

  const confirmAction = (action: string) => {
    if (window.confirm(`WARNING: Are you sure you want to ${action}? This is a production environment.`)) {
      alert(`${action} command dispatched (Simulated).`);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
      <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Running Processes & Tasks</h3>
        <span className="text-xs text-neutral-500">{tasks.length} Active</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
              <th className="p-4 font-medium">Task ID / Name</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">CPU / RAM</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-neutral-800">
            {loading && tasks.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-neutral-500">Loading tasks...</td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-neutral-500">No active tasks</td></tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-neutral-200">{t.name}</div>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">{t.id}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded capitalize">{t.type}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${t.status === 'Running' ? 'bg-emerald-500' : t.status === 'Pending' ? 'bg-yellow-500' : 'bg-neutral-500'}`}></span>
                      <span className="text-neutral-300">{t.status}</span>
                    </div>
                  </td>
                  <td className="p-4 text-neutral-400">
                    <div>{t.cpu}% CPU</div>
                    <div className="text-xs mt-0.5">{t.memory} MB</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => confirmAction(`view logs for ${t.id}`)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="View Logs">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmAction(`restart ${t.id}`)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="Restart">
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmAction(`kill ${t.id}`)} className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded transition-colors" title="Kill Task">
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
