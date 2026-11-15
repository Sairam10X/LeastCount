import React from 'react';
import { GameSettings } from 'shared';
import { BookOpen, CheckCircle, Info, X } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              How to Play "Least Count"
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Rules Callout Box */}
        <div className="my-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs sm:text-sm">
          <span className="font-bold text-indigo-300 block mb-1">
            ⚙️ Active Rules in This Room:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              • Show Limit: <strong>{settings.showLimit <= 0 ? 'No Limit (Any Sum)' : `≤ ${settings.showLimit} pts`}</strong>
            </div>
            <div>
              • Wrong Show Penalty: <strong>+{settings.wrongShowPenalty} pts</strong>
            </div>
            <div>
              • Ace Value: <strong>{settings.aceValue} pt{settings.aceValue > 1 ? 's' : ''}</strong>
            </div>
            <div>
              • Face Cards (K, Q, J):{' '}
              <strong>{settings.faceCardValue === 'ten' ? '10 pts' : 'Actual (11, 12, 13)'}</strong>
            </div>
            <div>
              • Jokers: <strong>{settings.externalJokers ? 'Enabled (0 pts)' : 'None'}</strong>
            </div>
            <div>
              • Match Target:{' '}
              <strong>
                {settings.singleRoundMode
                  ? 'Single Round'
                  : `${settings.gameTargetScore} pts (elimination)`}
              </strong>
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="space-y-4 overflow-y-auto pr-1 text-xs sm:text-sm flex-1">
          <div>
            <h4 className="font-bold text-emerald-400 mb-1">1. The Objective</h4>
            <p className="text-slate-300 leading-relaxed">
              The goal of Least Count is to hold the lowest total card points in your hand when
              someone calls <strong>"Show"</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-emerald-400 mb-1">2. Each Turn</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
              <li>
                <strong>Step 1 - Discard:</strong> Throw 1 card, or multiple cards of the same
                rank (a set, e.g. 7♠ and 7♦), onto the discard pile.
              </li>
              <li>
                <strong>Step 2 - Draw:</strong> Pick 1 card from the stock pile, OR from the
                discard pile. If the previous player discarded a set, you may pick any one card
                from that set!
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-emerald-400 mb-1">3. Calling "Show"</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
              <li>
                At the <strong>start of your turn</strong> (before discarding), if your total
                points are {settings.showLimit <= 0 ? 'any (No Limit)' : `≤ ${settings.showLimit}`}, you can press <strong>"SHOW"</strong>.
              </li>
              <li>
                <strong>Successful Show:</strong> If you have the strictly lowest points, you score{' '}
                <strong>0</strong>! Everyone else adds their hand total.
              </li>
              <li>
                <strong>Wrong Show:</strong> If any other player has a total equal to or lower
                than yours, you get penalized with{' '}
                <strong>+{settings.wrongShowPenalty} penalty points</strong> (irrespective of hand sum). The
                lowest player scores 0!
              </li>
            </ul>
          </div>

          {settings.quickMatch && (
            <div>
              <h4 className="font-bold text-amber-400 mb-1">4. Quick Match (Slap)</h4>
              <p className="text-slate-300 leading-relaxed">
                If enabled, you can slap down card(s) matching the rank of the top discard card even
                when it is NOT your turn! You do not draw a replacement card.
              </p>
            </div>
          )}

          <div>
            <h4 className="font-bold text-emerald-400 mb-1">5. Elimination</h4>
            <p className="text-slate-300 leading-relaxed">
              {settings.singleRoundMode
                ? 'Single round mode: the player with lowest score at the end of round wins immediately.'
                : `Players reaching or exceeding ${settings.gameTargetScore} cumulative points are eliminated. The last player standing wins!`}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-800 mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl transition"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

