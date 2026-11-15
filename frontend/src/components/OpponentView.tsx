import React from 'react';
import { PlayerPublic } from 'shared';
import { Card } from './Card';
import { Crown, Wifi, WifiOff } from 'lucide-react';

interface OpponentViewProps {
  player: PlayerPublic;
  isCurrentTurn: boolean;
  isDealer: boolean;
  turnTimeRemaining: number | null;
  chatMessage?: string;
}

export const OpponentView: React.FC<OpponentViewProps> = ({
  player,
  isCurrentTurn,
  isDealer,
  turnTimeRemaining,
  chatMessage,
}) => {
  return (
    <div
      className={`relative flex items-center space-x-2 px-2.5 py-1.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
        isCurrentTurn
          ? 'bg-amber-500/20 ring-2 ring-amber-400 shadow-lg shadow-amber-500/25 scale-102'
          : 'bg-slate-900/80 border border-slate-700/70 shadow'
      } ${player.isEliminated ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Speech / Message Bubble - Displayed inwards towards the table (below opponent avatar) */}
      {chatMessage && (
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 max-w-[200px] bg-white text-slate-950 font-bold text-xs px-3 py-1 rounded-2xl shadow-2xl border-2 border-indigo-500 animate-in zoom-in-95 fade-in duration-200 pointer-events-none whitespace-normal text-center leading-tight">
          <div>{chatMessage}</div>
          {/* Bubble Pointer Tail pointing UP towards opponent */}
          <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-white"></div>
        </div>
      )}

      {/* Mini Card Stack Visual with Count */}
      <div className="relative w-7 h-9 flex-shrink-0 flex items-center justify-center">
        {player.cardCount > 0 ? (
          <>
            <div className="absolute -top-0.5 -left-0.5 w-6 h-8 bg-indigo-950 rounded border border-indigo-700/50 opacity-70"></div>
            <div className="absolute top-0.5 left-0.5 w-6 h-8 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 rounded border border-indigo-400/80 shadow flex items-center justify-center">
              <span className="text-[11px] font-black text-indigo-200">{player.cardCount}</span>
            </div>
          </>
        ) : (
          <span className="text-[10px] text-slate-500 italic">0</span>
        )}
      </div>

      {/* Player Info & Score */}
      <div className="flex flex-col text-left min-w-[70px] max-w-[110px]">
        <div className="flex items-center space-x-1">
          {player.connected ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          )}
          <span className="font-bold text-xs text-white truncate max-w-[80px]" title={player.name}>
            {player.name}
          </span>
          {player.isHost && (
            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded flex-shrink-0" title="Host">
              H
            </span>
          )}
          {isDealer && (
            <span className="bg-emerald-600 text-white text-[9px] font-black px-1 rounded flex-shrink-0" title="Dealer">
              D
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-slate-300 mt-0.5">
          <span className="text-slate-400">
            Pts: <strong className="text-amber-400 font-mono text-[11px]">{player.score}</strong>
          </span>
          {isCurrentTurn && turnTimeRemaining !== null && (
            <span className="text-amber-300 font-mono font-bold bg-amber-950/90 px-1 rounded animate-pulse border border-amber-500/40">
              {turnTimeRemaining}s
            </span>
          )}
        </div>

        {player.isEliminated && (
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
            Out
          </span>
        )}
      </div>
    </div>
  );
};

