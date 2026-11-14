import React from 'react';
import { PlayerPublic } from 'shared';
import { Card } from './Card';
import { Crown, Wifi, WifiOff } from 'lucide-react';

interface OpponentViewProps {
  player: PlayerPublic;
  isCurrentTurn: boolean;
  isDealer: boolean;
  turnTimeRemaining: number | null;
}

export const OpponentView: React.FC<OpponentViewProps> = ({
  player,
  isCurrentTurn,
  isDealer,
  turnTimeRemaining,
}) => {
  return (
    <div
      className={`relative flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-amber-500/15 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20 scale-105'
          : 'bg-slate-900/60 border border-slate-700/60'
      } ${player.isEliminated ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Dealer & Host Badges */}
      <div className="absolute -top-2.5 left-2 flex items-center space-x-1">
        {player.isHost && (
          <span className="flex items-center space-x-0.5 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow">
            <Crown className="w-3 h-3" />
            <span>HOST</span>
          </span>
        )}
        {isDealer && (
          <span className="bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow">
            DEALER
          </span>
        )}
      </div>

      {/* Disconnected / Status Indicator */}
      <div className="absolute -top-2.5 right-2">
        {!player.connected ? (
          <span className="flex items-center space-x-1 bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium animate-pulse">
            <WifiOff className="w-2.5 h-2.5" />
            <span>Offline</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 bg-emerald-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <Wifi className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Opponent Mini Card Back Fan */}
      <div className="h-14 w-28 relative flex items-center justify-center my-1">
        {player.cardCount > 0 ? (
          Array.from({ length: Math.min(player.cardCount, 6) }).map((_, idx) => {
            const rot = (idx - (Math.min(player.cardCount, 6) - 1) / 2) * 8;
            const xOffset = (idx - (Math.min(player.cardCount, 6) - 1) / 2) * 10;
            return (
              <div
                key={idx}
                className="absolute"
                style={{
                  transform: `translateX(${xOffset}px) rotate(${rot}deg)`,
                  transformOrigin: 'bottom center',
                }}
              >
                <Card faceDown size="sm" />
              </div>
            );
          })
        ) : (
          <span className="text-xs text-slate-400 italic">No cards</span>
        )}
      </div>

      {/* Player Info Footer */}
      <div className="w-full flex flex-col items-center text-center mt-1">
        <div className="flex items-center space-x-1.5 max-w-[130px]">
          <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
            {player.name}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-300 mt-0.5">
          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            🃏 <strong className="text-white">{player.cardCount}</strong>
          </span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            Pts: <strong className="text-amber-400">{player.score}</strong>
          </span>
        </div>

        {/* Turn Countdown Badge */}
        {isCurrentTurn && turnTimeRemaining !== null && (
          <div className="mt-1 flex items-center space-x-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
            <span>⏱️ {turnTimeRemaining}s</span>
          </div>
        )}

        {player.isEliminated && (
          <span className="mt-1 text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
            Eliminated
          </span>
        )}
      </div>
    </div>
  );
};

