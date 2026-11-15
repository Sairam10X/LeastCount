import React, { useEffect } from 'react';
import { Card as CardType, GameSettings, GameStatus, RoundResult } from 'shared';
import { Card } from './Card';
import confetti from 'canvas-confetti';
import { AlertTriangle, Award, CheckCircle2, ChevronRight, Play, RotateCcw, Trophy } from 'lucide-react';

interface ScoreboardModalProps {
  status: GameStatus;
  roundResults: RoundResult | null;
  gameWinnerId: string | null;
  cutJoker?: CardType | null;
  settings?: GameSettings;
  isHost: boolean;
  onNextRound: () => void;
  onRestartGame: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  status,
  roundResults,
  gameWinnerId,
  cutJoker,
  settings,
  isHost,
  onNextRound,
  onRestartGame,
}) => {
  const isGameOver = status === 'game_over';

  useEffect(() => {
    if (roundResults) {
      if (isGameOver || roundResults.isSuccessfulShow) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }
  }, [roundResults, isGameOver]);

  if (!roundResults) return null;

  const callerResult = roundResults.playerResults.find(
    (p) => p.playerId === roundResults.callerId
  );
  const winnerResult = roundResults.playerResults.find((p) => p.isWinner);
  const matchWinner = roundResults.playerResults.find(
    (p) => p.playerId === gameWinnerId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 my-8 flex flex-col max-h-[90vh]">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-black text-white">
              {isGameOver
                ? '🏆 MATCH OVER - FINAL RESULTS'
                : `Round ${roundResults.roundNumber} Results`}
            </h2>
          </div>
          {isGameOver && matchWinner && (
            <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-3 py-1 rounded-full border border-amber-500/40">
              👑 {matchWinner.playerName} Wins!
            </span>
          )}
        </div>

        {/* Show Call Resolution Banner */}
        <div
          className={`my-3 p-3 sm:p-4 rounded-xl border flex items-start space-x-3 ${
            roundResults.isSuccessfulShow
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          {roundResults.isSuccessfulShow ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm">
            <div className="font-bold text-sm sm:text-base text-white">
              {roundResults.isSuccessfulShow
                ? `Successful Show by ${callerResult?.playerName || 'Caller'}!`
                : `Wrong Show by ${callerResult?.playerName || 'Caller'}!`}
            </div>
            <p className="mt-1 opacity-90">
              {roundResults.isSuccessfulShow ? (
                <>
                  {callerResult?.playerName} had the lowest hand count (
                  <strong>{roundResults.lowestTotal} pts</strong>) and scored 0.
                  All other players add their hand points.
                </>
              ) : (
                <>
                  {callerResult?.playerName} called with hand total of{' '}
                  <strong>{callerResult?.handTotal} pts</strong>, but was beaten or
                  tied by <strong>{winnerResult?.playerName}</strong> (
                  {roundResults.lowestTotal} pts)! {callerResult?.playerName} takes a{' '}
                  <strong>+{callerResult?.penaltyAdded} penalty</strong>!
                </>
              )}
            </p>
          </div>
        </div>

        {/* External Cut Joker Confirmation Banner */}
        {(() => {
          const effectiveCutJoker = roundResults.cutJoker || cutJoker;
          if (!effectiveCutJoker) return null;
          const suitSym =
            effectiveCutJoker.suit === 'H'
              ? '♥'
              : effectiveCutJoker.suit === 'D'
              ? '♦'
              : effectiveCutJoker.suit === 'C'
              ? '♣'
              : effectiveCutJoker.suit === 'S'
              ? '♠'
              : '★';
          const isRed = effectiveCutJoker.suit === 'H' || effectiveCutJoker.suit === 'D';

          return (
            <div className="mb-3 p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200 shadow-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🃏</span>
                <div>
                  <span className="font-extrabold text-amber-300">Round External Joker: </span>
                  <span className="font-mono font-black text-white bg-slate-900 px-2 py-0.5 rounded border border-amber-400/50 inline-flex items-center space-x-0.5">
                    <span>{effectiveCutJoker.rank}</span>
                    <span className={isRed ? 'text-red-500' : 'text-slate-100'}>{suitSym}</span>
                  </span>
                  <span className="ml-1.5 text-amber-200/90 font-medium hidden sm:inline">
                    — All {effectiveCutJoker.rank}'s count as 0 pts!
                  </span>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-amber-400/25 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                ★ 0 Pts Wildcard
              </span>
            </div>
          );
        })()}

        {/* Revealed Hands & Breakdown List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {roundResults.playerResults.map((pr) => {
            const effectiveCutJoker = roundResults.cutJoker || cutJoker;
            return (
              <div
                key={pr.playerId}
                className={`p-3 rounded-xl border flex flex-col space-y-2 transition ${
                  pr.isWinner
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : pr.isCaller && !roundResults.isSuccessfulShow
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-slate-800/60 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm sm:text-base text-white">
                      {pr.playerName}
                    </span>
                    {pr.isCaller && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40">
                        CALLED SHOW
                      </span>
                    )}
                    {pr.isWinner && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/40 flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>ROUND WINNER (0 pts)</span>
                      </span>
                    )}
                    {pr.isEliminated && (
                      <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded">
                        ELIMINATED
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total Score: </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-amber-400">
                      {pr.totalScore} pts
                    </span>
                    <span className="text-xs text-slate-400 font-mono ml-1">
                      (+{pr.roundScore})
                    </span>
                  </div>
                </div>

                {/* Revealed Cards Fan with per-card values */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {pr.cardValues.map(({ card, value }, idx) => {
                    const isWild = Boolean(
                      (effectiveCutJoker && card.rank === effectiveCutJoker.rank) ||
                      card.isJoker ||
                      card.rank === 'JOKER'
                    );
                    return (
                      <div key={idx} className="relative flex flex-col items-center">
                        <Card
                          card={card}
                          size="sm"
                          scoreValue={value}
                          isWildcardJoker={isWild}
                          className={isWild ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/40' : ''}
                        />
                        {isWild && (
                          <span className="mt-1 text-[9px] font-black text-amber-300 bg-amber-950/90 border border-amber-500/70 px-1.5 py-0.2 rounded shadow tracking-tight">
                            ★ JOKER
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="ml-auto flex items-center space-x-2 text-xs font-mono">
                    <span className="text-slate-400">Hand sum:</span>
                    <strong className="text-white text-sm">{pr.handTotal}</strong>
                    {pr.penaltyAdded > 0 && (
                      <span className="text-rose-400 font-bold">
                        (+{pr.penaltyAdded} penalty)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-3 mt-auto flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {isHost
              ? 'You are the host. Advance when ready.'
              : 'Waiting for host to advance...'}
          </div>

          <div className="flex items-center space-x-2">
            {isHost && (
              <>
                {isGameOver ? (
                  <button
                    onClick={onRestartGame}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-lg transition active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Back to Lobby</span>
                  </button>
                ) : (
                  <button
                    onClick={onNextRound}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-lg shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400 transition active:scale-95 animate-pulse"
                  >
                    <span>Next Round</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

