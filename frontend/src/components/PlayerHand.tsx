import React, { useMemo } from 'react';
import { Card as CardType, GameSettings, TurnPhase } from 'shared';
import { Card } from './Card';
import { Check, Flame, Trophy, Zap } from 'lucide-react';

interface PlayerHandProps {
  hand: CardType[];
  settings: GameSettings;
  handTotal: number;
  myScore?: number;
  playerName?: string;
  isHost?: boolean;
  isMyTurn: boolean;
  turnPhase: TurnPhase;
  canShow: boolean;
  canDiscard: boolean;
  discardTop: CardType | null;
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
  myScore = 0,
  playerName,
  isHost = false,
  isMyTurn,
  turnPhase,
  canShow,
  canDiscard,
  discardTop,
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

  const isMatchWithTop = useMemo(() => {
    if (!selectionValidation.valid || selectedCardIds.length === 0 || !discardTop) {
      return false;
    }
    return selectionValidation.rank === discardTop.rank;
  }, [selectionValidation, selectedCardIds, discardTop]);

  const hasShowLimit = settings.showLimit > 0;
  const isWithinLimit = !hasShowLimit || handTotal <= settings.showLimit;

  const totalColor =
    isWithinLimit
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : handTotal <= 20
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-red-500/20 text-red-300 border-red-500/40';

  return (
    <div className="w-full flex flex-col items-center pb-2 pt-1 select-none">
      {/* Hand Controls Bar */}
      <div className="w-full max-w-xl px-4 flex flex-wrap items-center justify-between gap-2 mb-2">
        {/* Badges: Self Score & Current Hand Total */}
        <div className="flex items-center space-x-2">
          {/* Cumulative Match Score */}
          <div
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 text-xs sm:text-sm font-bold shadow"
            title="Your cumulative match score (reaching target score eliminates you)"
          >
            <span>Pts:</span>
            <span className="font-mono text-base text-white">{myScore}</span>
            <span className="text-[10px] text-amber-400/80 font-normal">
              {settings.singleRoundMode ? '' : `/ ${settings.gameTargetScore}`}
            </span>
          </div>

          {/* Current Hand Total */}
          <div
            className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold shadow ${totalColor}`}
            title="Sum of cards currently in your hand"
          >
            <span>Hand:</span>
            <span className="font-mono text-base">{handTotal}</span>
            <span className="text-[10px] opacity-75 font-normal">
              ({hasShowLimit ? `Limit: ≤ ${settings.showLimit}` : 'No Limit'})
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
                ? isMatchWithTop
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/30 font-black animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={
              !canDiscard
                ? 'Wait for your turn to discard'
                : !selectionValidation.valid
                ? selectionValidation.error
                : isMatchWithTop
                ? 'Matches top discard level! You will NOT pick a card.'
                : 'Discard selected card(s) and then pick 1 card.'
            }
          >
            {isMatchWithTop ? <Zap className="w-4 h-4 fill-current" /> : <Check className="w-4 h-4" />}
            <span>
              {selectedCardIds.length === 0
                ? 'Discard'
                : isMatchWithTop
                ? `Match & Discard (No Pick!)`
                : `Discard (${selectedCardIds.length})`}
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
                : hasShowLimit && handTotal > settings.showLimit
                ? `Hand total (${handTotal}) must be <= ${settings.showLimit} to call Show`
                : 'Declare Show to end the round!'
            }
          >
            <Trophy className="w-4 h-4" />
            <span>SHOW!</span>
          </button>
        </div>
      </div>

      {/* Helpful Hint based on selection and top discard */}
      {isMyTurn && turnPhase === 'action' && selectedCardIds.length > 0 && (
        <div className="mb-1 text-xs text-center font-medium">
          {selectionValidation.valid ? (
            isMatchWithTop ? (
              <span className="text-amber-300 font-bold bg-amber-950/70 border border-amber-500/40 px-3 py-0.5 rounded-full">
                ⚡ Same level ({discardTop?.rank})! If discarded, your turn ends immediately without picking!
              </span>
            ) : (
              <span className="text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                Discarding {selectionValidation.rank} (top is {discardTop?.rank || 'none'}) — you will pick 1 card after.
              </span>
            )
          ) : (
            <span className="text-red-400 font-bold">⚠️ {selectionValidation.error}</span>
          )}
        </div>
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
