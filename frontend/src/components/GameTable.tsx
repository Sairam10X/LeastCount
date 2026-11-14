import React from 'react';
import { Card as CardType, LastDiscard, TurnPhase } from 'shared';
import { Card } from './Card';
import { Zap } from 'lucide-react';

interface GameTableProps {
  stockCount: number;
  discardTop: CardType | null;
  lastDiscard: LastDiscard | null;
  turnPhase: TurnPhase;
  isMyTurn: boolean;
  currentTurnPlayerName: string;
  turnTimeRemaining: number | null;
  quickMatchEnabled: boolean;
  selectedCardIds: string[];
  onDrawStock: () => void;
  onDrawDiscard: (cardId?: string) => void;
  onQuickMatch: () => void;
  isActionDisabled?: boolean;
}

export const GameTable: React.FC<GameTableProps> = ({
  stockCount,
  discardTop,
  lastDiscard,
  turnPhase,
  isMyTurn,
  currentTurnPlayerName,
  turnTimeRemaining,
  quickMatchEnabled,
  selectedCardIds,
  onDrawStock,
  onDrawDiscard,
  onQuickMatch,
  isActionDisabled = false,
}) => {
  const isDrawPhase = isMyTurn && turnPhase === 'draw';
  const hasMultipleDiscardChoices =
    lastDiscard && lastDiscard.cards.length > 1;

  return (
    <div className="relative w-full max-w-2xl mx-auto my-2 sm:my-4 flex flex-col items-center">
      {/* Turn & Phase Status Banner */}
      <div className="mb-3 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700/80 shadow-md flex items-center space-x-2 text-xs sm:text-sm">
        {isMyTurn ? (
          <span className="flex items-center space-x-2 text-emerald-400 font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>YOUR TURN:</span>
            <span className="text-white font-normal">
              {turnPhase === 'action'
                ? 'Select card(s) to Discard or call Show'
                : 'Draw from Stock or Discard pile'}
            </span>
          </span>
        ) : (
          <span className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              <strong className="text-amber-400">{currentTurnPlayerName}</strong>'s turn
              ({turnPhase === 'action' ? 'discarding' : 'drawing'})
            </span>
          </span>
        )}

        {turnTimeRemaining !== null && (
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50">
            {turnTimeRemaining}s
          </span>
        )}
      </div>

      {/* Table Felt Card Center (Stock & Discard) */}
      <div className="w-full bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 sm:p-6 shadow-inner flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-8 backdrop-blur-sm">
        {/* STOCK PILE */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {stockCount > 0 ? (
              <div
                onClick={() => {
                  if (isDrawPhase && !isActionDisabled) onDrawStock();
                }}
                className={`relative cursor-pointer transition-transform ${isDrawPhase
                    ? 'ring-4 ring-emerald-400 rounded-lg scale-105 shadow-xl shadow-emerald-500/30 animate-pulse'
                    : ''
                  }`}
              >
                {/* 3D stacked deck effect */}
                <div className="absolute -top-1 -left-1 w-full h-full bg-indigo-950 rounded-lg border border-indigo-700/50"></div>
                <div className="relative">
                  <Card faceDown size="md" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-slate-900/90 text-white font-black text-xs sm:text-sm px-2 py-1 rounded-full shadow border border-slate-700">
                    {stockCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-emerald-800/60 flex items-center justify-center text-xs text-emerald-600">
                Empty
              </div>
            )}
          </div>
          <span className="mt-2 text-xs font-medium text-slate-300">
            Stock Pile ({stockCount})
          </span>
          {isDrawPhase && (
            <button
              onClick={onDrawStock}
              disabled={isActionDisabled || stockCount <= 0}
              className="mt-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded shadow transition"
            >
              Draw Stock
            </button>
          )}
        </div>

        {/* DISCARD PILE */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {discardTop ? (
              <div
                onClick={() => {
                  if (isDrawPhase && !hasMultipleDiscardChoices && !isActionDisabled) {
                    onDrawDiscard();
                  }
                }}
                className={`transition-transform ${isDrawPhase && !hasMultipleDiscardChoices
                    ? 'ring-4 ring-emerald-400 rounded-lg scale-105 shadow-xl shadow-emerald-500/30 cursor-pointer animate-pulse'
                    : ''
                  }`}
              >
                <Card card={discardTop} size="md" />
              </div>
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                Empty
              </div>
            )}
          </div>
          <span className="mt-2 text-xs font-medium text-slate-300">
            Discard Pile {lastDiscard && `(by ${lastDiscard.playerName})`}
          </span>

          {/* If drawer can pick from discard */}
          {isDrawPhase && (
            <div className="mt-1 flex flex-col items-center">
              {!hasMultipleDiscardChoices ? (
                <button
                  onClick={() => onDrawDiscard()}
                  disabled={isActionDisabled || !discardTop}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1 rounded shadow transition"
                >
                  Take Discard
                </button>
              ) : (
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[11px] text-amber-300 font-semibold mb-1">
                    Pick 1 card from discarded set:
                  </span>
                  <div className="flex space-x-1">
                    {lastDiscard.cards.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onDrawDiscard(c.id)}
                        className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded border border-blue-400 shadow transition"
                      >
                        {c.rank}
                        {c.suit === 'JOKER' ? '★' : c.suit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Match / Slap Bonus Action Button */}
      {quickMatchEnabled && discardTop && (
        <div className="mt-2 flex items-center space-x-2">
          <button
            onClick={onQuickMatch}
            disabled={selectedCardIds.length === 0}
            className="flex items-center space-x-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-slate-950 font-black px-3 py-1.5 rounded-full shadow-lg transition active:scale-95"
            title="Slap: Discard matching rank card out of turn without drawing"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>SLAP MATCH (Rank: {discardTop.rank})</span>
          </button>
        </div>
      )}
    </div>
  );
};

