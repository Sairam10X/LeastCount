import React, { useMemo } from 'react';
import { Card as CardType, GameSettings, TurnPhase } from 'shared';
import { Card } from './Card';
import { Check, Flame, Trophy } from 'lucide-react';

interface PlayerHandProps {
  hand: CardType[];
  settings: GameSettings;
  handTotal: number;
  isMyTurn: boolean;
  turnPhase: TurnPhase;
  canShow: boolean;
  canDiscard: boolean;
  selectedCardIds: string[];
  onToggleSelectCard: (cardId: string) => void;
  onDiscard: () => void;
  onShow: () => void;
  isActionDisabled?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  settings,
  handTotal,
  isMyTurn,
  turnPhase,
  canShow,
  canDiscard,
  selectedCardIds,
  onToggleSelectCard,
  onDiscard,
  onShow,
  isActionDisabled = false,
}) => {
  // Check if current selection has valid multi-discard (all same rank)
  const selectionValidation = useMemo(() => {
    if (selectedCardIds.length === 0) {
      return { valid: false, error: 'Select at least 1 card' };
    }
    const selected = hand.filter((c) => selectedCardIds.includes(c.id));
    const firstRank = selected[0]?.rank;
    const allSame = selected.every((c) => c.rank === firstRank);
    if (!allSame) {
      return { valid: false, error: 'Multi-discard must all be of the same rank' };
    }
    return {
      valid: true,
      count: selected.length,
      rank: firstRank,
    };
  }, [hand, selectedCardIds]);

  const totalColor =
    handTotal <= settings.showLimit
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : handTotal <= 20
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-red-500/20 text-red-300 border-red-500/40';

  return (
    <div className="w-full flex flex-col items-center pb-2 pt-1 select-none">
      {/* Hand Controls Bar */}
      <div className="w-full max-w-xl px-4 flex flex-wrap items-center justify-between gap-2 mb-2">
        {/* Hand Total Pill */}
        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold shadow ${totalColor}`}
          >
            <span>Total:</span>
            <span className="font-mono text-base">{handTotal}</span>
            <span className="text-[10px] opacity-75 font-normal">
              (Limit: {settings.showLimit})
            </span>
          </div>

          {selectionValidation.valid && selectedCardIds.length > 1 && (
            <span className="text-[11px] bg-slate-800 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-slate-700">
              Set of {selectionValidation.count} × {selectionValidation.rank}
            </span>
          )}
        </div>

        {/* Action Buttons: Discard & Show */}
        <div className="flex items-center space-x-2">
          {/* Discard Button */}
          <button
            onClick={onDiscard}
            disabled={
              !canDiscard ||
              !selectionValidation.valid ||
              isActionDisabled ||
              selectedCardIds.length === 0
            }
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm shadow-md transition active:scale-95 ${
              canDiscard && selectionValidation.valid && selectedCardIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={
              !canDiscard
                ? 'Wait for your turn to discard'
                : !selectionValidation.valid
                ? selectionValidation.error
                : 'Discard selected card(s)'
            }
          >
            <Check className="w-4 h-4" />
            <span>
              Discard {selectedCardIds.length > 0 ? `(${selectedCardIds.length})` : ''}
            </span>
          </button>

          {/* Show / Declare Button */}
          <button
            onClick={onShow}
            disabled={!canShow || isActionDisabled}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg font-black text-xs sm:text-sm shadow-lg transition active:scale-95 ${
              canShow
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/40 animate-bounce'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
            title={
              !isMyTurn
                ? 'Can only call Show on your turn'
                : turnPhase !== 'action'
                ? 'Can only call Show before discarding'
                : handTotal > settings.showLimit
                ? `Hand total (${handTotal}) must be <= ${settings.showLimit} to call Show`
                : 'Declare Show to end the round!'
            }
          >
            <Trophy className="w-4 h-4" />
            <span>SHOW!</span>
          </button>
        </div>
      </div>

      {/* Validation hint if invalid selection */}
      {!selectionValidation.valid && selectedCardIds.length > 0 && (
        <span className="text-[11px] text-red-400 font-medium mb-1">
          ⚠️ {selectionValidation.error}
        </span>
      )}

      {/* Interactive Fanned Hand */}
      <div className="relative w-full max-w-2xl px-2 flex items-center justify-center min-h-[120px] sm:min-h-[140px] overflow-x-auto py-2">
        <div className="flex items-center -space-x-4 sm:-space-x-6 hover:space-x-1 transition-all duration-200">
          {hand.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <div
                key={card.id}
                style={{
                  zIndex: isSelected ? 40 : idx + 10,
                }}
                className="transition-all duration-150"
              >
                <Card
                  card={card}
                  isSelected={isSelected}
                  onClick={() => onToggleSelectCard(card.id)}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

