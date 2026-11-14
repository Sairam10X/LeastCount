import React from 'react';
import { ActivityLogEntry } from 'shared';
import { MessageSquare, ScrollText, X } from 'lucide-react';

interface ActivityLogProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-slate-900/95 border-l border-slate-700/80 shadow-2xl flex flex-col backdrop-blur-md animate-in slide-in-from-right">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ScrollText className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-sm sm:text-base text-white">Activity Log</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-8">
            No activity yet.
          </p>
        ) : (
          [...logs].reverse().map((entry) => {
            const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className={`p-2.5 rounded-xl border text-xs transition ${
                  entry.type === 'show'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 font-semibold'
                    : entry.type === 'timer'
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    : entry.type === 'system'
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    : 'bg-slate-800/40 border-slate-700/40 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span className="font-mono">{timeStr}</span>
                  <span className="uppercase tracking-wider font-bold">
                    {entry.type || 'action'}
                  </span>
                </div>
                <div>{entry.text}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

