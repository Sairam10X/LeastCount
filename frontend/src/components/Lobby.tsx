import React, { useState } from 'react';
import { GameSettings, PlayerPublic } from 'shared';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Crown,
  Play,
  QrCode,
  Settings as SettingsIcon,
  ShieldAlert,
  UserX,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface LobbyProps {
  roomCode: string;
  players: PlayerPublic[];
  settings: GameSettings;
  isHost: boolean;
  myPlayerId: string | null;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onKickPlayer: (playerId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomCode,
  players,
  settings,
  isHost,
  myPlayerId,
  onUpdateSettings,
  onStartGame,
  onKickPlayer,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareableUrl = `${window.location.origin}/room/${roomCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const activePlayers = players.filter((p) => !p.isSpectator);
  const canStart = isHost && activePlayers.length >= 2;

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* LEFT COLUMN: Room Code, Players List & Controls */}
      <div className="lg:col-span-6 flex flex-col space-y-4">
        {/* Room Code Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              Room Code
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
              <button
                onClick={copyLink}
                className="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg shadow transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400">
              {roomCode}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Share link or code with friends
            </span>
          </div>

          {/* QR Code Modal / Drawer */}
          {showQR && (
            <div className="mt-4 p-4 bg-white rounded-xl flex flex-col items-center justify-center space-y-2 text-slate-900 animate-in fade-in zoom-in-95">
              <QRCodeSVG value={shareableUrl} size={160} />
              <span className="text-xs font-semibold text-slate-600">
                Scan on phone or tablet to join
              </span>
            </div>
          )}
        </div>

        {/* Players List Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Joined Players ({activePlayers.length}/{settings.maxPlayers})
              </h3>
            </div>
            {activePlayers.length < 2 && (
              <span className="text-xs text-amber-400 animate-pulse font-medium">
                Waiting for at least 2 players...
              </span>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
            {players.map((p) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    isMe
                      ? 'bg-indigo-950/40 border-indigo-500/50'
                      : 'bg-slate-800/60 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {p.connected ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    )}
                    <span className="font-semibold text-sm text-white">
                      {p.name} {isMe && '(You)'}
                    </span>
                    {p.isHost && (
                      <span className="flex items-center space-x-1 text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                        <Crown className="w-3 h-3" />
                        <span>HOST</span>
                      </span>
                    )}
                    {p.isSpectator && (
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                        Spectator
                      </span>
                    )}
                  </div>

                  {isHost && !p.isHost && (
                    <button
                      onClick={() => onKickPlayer(p.id)}
                      className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700/60 transition"
                      title="Kick player"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start Game Action */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`w-full py-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 shadow-xl transition active:scale-98 ${
                  canStart
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START GAME</span>
              </button>
            ) : (
              <div className="text-center text-xs text-slate-400 py-2">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Host Settings Panel */}
      <div className="lg:col-span-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
          <SettingsIcon className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm sm:text-base text-white">
            Game Rules & Settings
          </h3>
          {!isHost && (
            <span className="text-xs text-slate-400 ml-auto italic">
              (Host only)
            </span>
          )}
        </div>

        {/* Warning if single deck and >5 players */}
        {settings.deckMode === 'single' && activePlayers.length > 5 && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              Recommended: Switch to Multi-Deck (104 cards) for {activePlayers.length} players.
            </span>
          </div>
        )}

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* 1. Max Players */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Max Players</label>
              <p className="text-[11px] text-slate-400">Allowed seated players (2–8)</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.maxPlayers}
              onChange={(e) => onUpdateSettings({ maxPlayers: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} Players
                </option>
              ))}
            </select>
          </div>

          {/* 2. Deck Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Deck Mode</label>
              <p className="text-[11px] text-slate-400">Single (52) or Double (104)</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.deckMode}
              onChange={(e) =>
                onUpdateSettings({ deckMode: e.target.value as 'single' | 'double' })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="single">Single Deck (52)</option>
              <option value="double">Double Deck (104)</option>
            </select>
          </div>

          {/* 3. External Jokers */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Printed Jokers</label>
              <p className="text-[11px] text-slate-400">2 jokers per deck (worth 0 pts)</p>
            </div>
            <button
              disabled={!isHost}
              onClick={() => onUpdateSettings({ externalJokers: !settings.externalJokers })}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                settings.externalJokers ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              } disabled:opacity-60`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* 4. Face Card Values */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Face Card Values</label>
              <p className="text-[11px] text-slate-400">K, Q, J count as 10 or 13, 12, 11</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.faceCardValue}
              onChange={(e) =>
                onUpdateSettings({
                  faceCardValue: e.target.value as 'ten' | 'actual',
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="ten">Standard (all 10 pts)</option>
              <option value="actual">Actual (J=11, Q=12, K=13)</option>
            </select>
          </div>

          {/* 5. Ace Value */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Ace Value</label>
              <p className="text-[11px] text-slate-400">Count Ace as 1 or 14 pts</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.aceValue}
              onChange={(e) => onUpdateSettings({ aceValue: Number(e.target.value) as 1 | 14 })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value={1}>1 Point</option>
              <option value={14}>14 Points</option>
            </select>
          </div>

          {/* 6. Show / Declare Limit */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Show Limit</label>
              <p className="text-[11px] text-slate-400">Max hand total to declare Show</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.showLimit}
              onChange={(e) => onUpdateSettings({ showLimit: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              {[5, 7, 10, 12, 15, 20].map((v) => (
                <option key={v} value={v}>
                  ≤ {v} Points
                </option>
              ))}
            </select>
          </div>

          {/* 7. Wrong Show Penalty */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Wrong Show Penalty</label>
              <p className="text-[11px] text-slate-400">Penalty added if show is tied or beaten</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.wrongShowPenalty}
              onChange={(e) => onUpdateSettings({ wrongShowPenalty: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              {[20, 30, 40, 50, 60, 80].map((p) => (
                <option key={p} value={p}>
                  +{p} Points
                </option>
              ))}
            </select>
          </div>

          {/* 8. Target Score & Single Round Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Game Mode / Target</label>
              <p className="text-[11px] text-slate-400">Elimination target or single round</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.singleRoundMode ? 'single' : String(settings.gameTargetScore)}
              onChange={(e) => {
                if (e.target.value === 'single') {
                  onUpdateSettings({ singleRoundMode: true });
                } else {
                  onUpdateSettings({
                    singleRoundMode: false,
                    gameTargetScore: Number(e.target.value),
                  });
                }
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="50">Target 50 Pts</option>
              <option value="100">Target 100 Pts (Default)</option>
              <option value="150">Target 150 Pts</option>
              <option value="single">Single Round Mode</option>
            </select>
          </div>

          {/* 9. Quick Match / Slap Bonus */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Quick Match (Slap)</label>
              <p className="text-[11px] text-slate-400">Discard matching rank out of turn</p>
            </div>
            <button
              disabled={!isHost}
              onClick={() => onUpdateSettings({ quickMatch: !settings.quickMatch })}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                settings.quickMatch ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              } disabled:opacity-60`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* 10. Turn Timer */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-200">Turn Timer</label>
              <p className="text-[11px] text-slate-400">Auto-plays move on timeout</p>
            </div>
            <select
              disabled={!isHost}
              value={settings.turnTimerSeconds}
              onChange={(e) => onUpdateSettings({ turnTimerSeconds: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value={0}>Disabled</option>
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds</option>
              <option value={45}>45 Seconds</option>
              <option value={60}>60 Seconds</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

