import React from 'react';
import { Card as CardType, LastDiscard, TurnPhase } from 'shared';
import { Card } from './Card';
import { ArrowDownToLine, RotateCcw, Zap } from 'lucide-react';

interface GameTableProps {
  stockCount: number;
  discardTop: CardType | null;
  lastDiscard: LastDiscard | null;
  availablePickupCards: CardType[] | null;
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
  availablePickupCards,
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

  return (
    <div className="relative w-full max-w-2xl mx-auto my-0.5 sm:my-1.5 flex flex-col items-center select-none flex-shrink-0">
      {/* Turn & Phase Status Banner */}
      <div className="mb-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700/80 shadow-md flex items-center space-x-2 text-xs">
        {isMyTurn ? (
          <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>YOUR TURN:</span>
            <span className="text-white font-normal truncate max-w-[200px] sm:max-w-none">
              {turnPhase === 'action'
                ? 'Select card(s) to Discard or call Show'
                : 'Level did not match. Pick 1 card to complete turn:'}
            </span>
          </span>
        ) : (
          <span className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              <strong className="text-amber-400">{currentTurnPlayerName}</strong>'s turn
              ({turnPhase === 'action' ? 'discarding' : 'picking'})
            </span>
          </span>
        )}

        {turnTimeRemaining !== null && (
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/50">
            {turnTimeRemaining}s
          </span>
        )}
      </div>

      {/* Draw Instruction Highlight Banner */}
      {isDrawPhase && (
        <div className="w-full mb-1.5 p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-center font-bold animate-pulse">
          👉 Level didn't match. Pick 1 card from Stock or Discard deck:
        </div>
      )}

      {/* Table Felt Card Center (Stock & Discard - Always Side-by-Side) */}
      <div className="w-full max-w-lg bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-2.5 sm:p-4 shadow-inner flex flex-row items-center justify-center gap-6 sm:gap-14 backdrop-blur-sm">
        {/* 1. PICKING DECK (STOCK PILE) */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {stockCount > 0 ? (
              <div
                onClick={() => {
                  if (isDrawPhase && !isActionDisabled) onDrawStock();
                }}
                className={`relative cursor-pointer transition-transform ${
                  isDrawPhase
                    ? 'ring-4 ring-emerald-400 rounded-lg scale-105 shadow-xl shadow-emerald-500/40 animate-bounce'
                    : ''
                }`}
                title={isDrawPhase ? 'Click to draw a card from the stock deck' : 'Stock deck'}
              >
                {/* 3D stacked deck effect */}
                <div className="absolute -top-1 -left-1 w-full h-full bg-indigo-950 rounded-lg border border-indigo-700/50"></div>
                <div className="relative">
                  <Card faceDown size="sm" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-slate-900/90 text-white font-black text-xs px-2 py-0.5 rounded-full shadow border border-slate-700">
                    {stockCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-12 h-18 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed border-emerald-800/60 flex items-center justify-center text-xs text-emerald-600">
                Empty
              </div>
            )}
          </div>
          <span className="mt-1 text-[11px] font-semibold text-slate-200">
            Stock ({stockCount})
          </span>

          {isDrawPhase && (
            <button
              onClick={onDrawStock}
              disabled={isActionDisabled || stockCount <= 0}
              className="mt-1 flex items-center space-x-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-2.5 py-1 rounded-lg shadow-lg ring-2 ring-emerald-400 transition cursor-pointer"
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>Draw Stock</span>
            </button>
          )}
        </div>

        {/* 2. DISCARD DECK */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {discardTop ? (
              <div className="relative">
                <Card card={discardTop} size="sm" />
              </div>
            ) : (
              <div className="w-12 h-18 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                Empty
              </div>
            )}
          </div>

          <span className="mt-1 text-[11px] font-semibold text-slate-200">
            Discard {lastDiscard && `(Top: ${discardTop ? discardTop.rank : 'Empty'})`}
          </span>

          {/* If in draw phase: offer picking the card that was on top of discard deck before */}
          {isDrawPhase && (
            <div className="mt-1 flex flex-col items-center">
              {availablePickupCards && availablePickupCards.length > 0 ? (
                <div className="flex flex-col items-center space-y-1">
                  {availablePickupCards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onDrawDiscard(c.id)}
                      disabled={isActionDisabled}
                      className="flex items-center space-x-1 text-[11px] bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-2.5 py-1 rounded-lg shadow-lg ring-2 ring-blue-400 transition cursor-pointer"
                      title={`Pick up ${c.rank} from discard deck`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>
                        Pick {c.rank}
                        {c.suit === 'JOKER' ? '★' : c.suit}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  (None to pick)
                </span>
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
