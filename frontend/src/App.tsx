import React, { useEffect, useMemo, useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { useSound } from './hooks/useSound';
import { Lobby } from './components/Lobby';
import { OpponentView } from './components/OpponentView';
import { GameTable } from './components/GameTable';
import { PlayerHand } from './components/PlayerHand';
import { ScoreboardModal } from './components/ScoreboardModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { ActivityLog } from './components/ActivityLog';
import {
  getStoredPlayerName,
  saveStoredPlayerName,
} from './utils/session';
import {
  BookOpen,
  HelpCircle,
  LogOut,
  Moon,
  PlusCircle,
  ScrollText,
  Sun,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';

export function App() {
  // Navigation / Route state
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    // 1. Check path /room/:code or /:code
    const pathMatch = window.location.pathname.match(/^\/(?:room\/)?([a-zA-Z0-9]{4,8})/i);
    if (pathMatch) return pathMatch[1].toUpperCase();

    // 2. Check search params ?room=ABCDE
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) return roomParam.toUpperCase();

    return null;
  });

  const [playerName, setPlayerName] = useState<string>(() => getStoredPlayerName() || '');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinAsSpectator, setJoinAsSpectator] = useState<boolean>(false);
  const [hasSubmittedJoin, setHasSubmittedJoin] = useState<boolean>(false);

  // UI state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showActivityLog, setShowActivityLog] = useState<boolean>(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Sound effects
  const sound = useSound();

  // Socket
  const {
    gameState,
    isConnected,
    isConnecting,
    errorMessage,
    toasts,
    myPlayerId,
    join,
    updateSettings,
    claimHost,
    startGame,
    nextRound,
    restartGame,
    kickPlayer,
    discardCards,
    drawCard,
    callShow,
    quickMatchDiscard,
  } = useGameSocket(roomCode);

  // Synchronize URL when roomCode changes
  useEffect(() => {
    if (roomCode) {
      window.history.replaceState(null, '', `/room/${roomCode}`);
    } else {
      window.history.replaceState(null, '', '/');
    }
  }, [roomCode]);

  // Auto-join if roomCode and playerName exist and not joined yet
  useEffect(() => {
    if (isConnected && roomCode && playerName.trim() && !hasSubmittedJoin) {
      join(playerName.trim(), joinAsSpectator);
      setHasSubmittedJoin(true);
    }
  }, [isConnected, roomCode, playerName, hasSubmittedJoin, join, joinAsSpectator]);

  // Audio cues on state events
  useEffect(() => {
    if (gameState?.isMyTurn && gameState.status === 'playing' && gameState.turnPhase === 'action') {
      sound.playTurnAlert();
    }
  }, [gameState?.isMyTurn, gameState?.status, gameState?.turnPhase]);

  // Clear selected cards if round ends or discard is made
  useEffect(() => {
    if (gameState?.turnPhase === 'draw' || gameState?.status !== 'playing') {
      setSelectedCardIds([]);
    }
  }, [gameState?.turnPhase, gameState?.status]);

  // Handlers
  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    saveStoredPlayerName(playerName);

    // Generate random 5-char alphanumeric code (excluding ambiguous chars 0/O, 1/I)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setRoomCode(code);
    setHasSubmittedJoin(false);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinCodeInput.trim()) return;
    saveStoredPlayerName(playerName);
    setRoomCode(joinCodeInput.trim().toUpperCase());
    setHasSubmittedJoin(false);
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    setHasSubmittedJoin(false);
    setSelectedCardIds([]);
  };

  const handleToggleSelectCard = (cardId: string) => {
    sound.playCardSlide();
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      return [...prev, cardId];
    });
  };

  const handleDiscard = () => {
    if (selectedCardIds.length === 0) return;
    sound.playCardPlace();
    discardCards(selectedCardIds);
    setSelectedCardIds([]);
  };

  const handleDrawStock = () => {
    sound.playCardSlide();
    drawCard('stock');
  };

  const handleDrawDiscard = (discardCardId?: string) => {
    sound.playCardSlide();
    drawCard('discard', discardCardId);
  };

  const handleShow = () => {
    callShow();
  };

  const handleQuickMatch = () => {
    if (selectedCardIds.length === 0) return;
    sound.playCardPlace();
    quickMatchDiscard(selectedCardIds);
    setSelectedCardIds([]);
  };

  // Find opponents (all players except me)
  const opponents = useMemo(() => {
    if (!gameState) return [];
    return gameState.players.filter((p) => p.id !== gameState.myId);
  }, [gameState]);

  const currentTurnPlayer = useMemo(() => {
    if (!gameState || !gameState.currentTurnPlayerId) return null;
    return gameState.players.find((p) => p.id === gameState.currentTurnPlayerId);
  }, [gameState]);

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        theme === 'dark' ? 'table-felt text-slate-100' : 'table-felt-light text-slate-900'
      }`}
    >
      {/* HEADER NAVBAR */}
      <header className="w-full px-3 py-2 sm:px-6 sm:py-3 bg-slate-950/80 backdrop-blur border-b border-slate-800/80 flex items-center justify-between z-30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white shadow-md">
            LC
          </div>
          <span className="font-black text-base sm:text-lg tracking-wide bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Least Count
          </span>
          {roomCode && (
            <span className="ml-2 font-mono font-bold text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
              {roomCode}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sound Toggle */}
          <button
            onClick={sound.toggleMute}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={sound.muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {sound.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* How to Play */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center space-x-1 p-1.5 sm:px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-semibold"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Activity Log */}
          {roomCode && (
            <button
              onClick={() => setShowActivityLog(true)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Activity Log"
            >
              <ScrollText className="w-4 h-4 text-indigo-400" />
            </button>
          )}

          {/* Leave Room Button */}
          {roomCode && (
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 transition"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Disconnection Warning Bar */}
      {roomCode && !isConnected && (
        <div className="bg-red-600/90 text-white text-xs py-1.5 px-4 text-center font-bold flex items-center justify-center space-x-2 animate-pulse z-20">
          <WifiOff className="w-4 h-4" />
          <span>
            {isConnecting
              ? 'Connecting to game room...'
              : 'Disconnected. Reconnecting automatically...'}
          </span>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-14 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold max-w-sm border backdrop-blur animate-in slide-in-from-top-2 ${
              toast.variant === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : toast.variant === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-slate-900/90 border-slate-600 text-slate-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto">
        {!roomCode ? (
          /* HOME SCREEN: Create / Join Game */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-xl mb-3">
                  LC
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Least Count
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Fast, real-time multiplayer card game for friends and family
                </p>
              </div>

              {/* Player Name Input */}
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="e.g. Maya"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                  className="w-full py-3 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400 transition active:scale-98 flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>CREATE NEW GAME</span>
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-700"></div>
                  <span className="flex-shrink mx-4 text-xs uppercase font-extrabold text-slate-500">
                    OR JOIN ROOM
                  </span>
                  <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Room Code (e.g. ABCDE)"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || !joinCodeInput.trim()}
                    className="px-5 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg transition active:scale-98"
                  >
                    JOIN
                  </button>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="spectatorCheck"
                    checked={joinAsSpectator}
                    onChange={(e) => setJoinAsSpectator(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="spectatorCheck" className="text-xs text-slate-400 cursor-pointer">
                    Join as Spectator
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : !gameState ? (
          /* Connecting / Joining State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white">Connecting to Room {roomCode}...</h3>
            <p className="text-xs text-slate-400 mt-1">Synchronizing live room state</p>
          </div>
        ) : gameState.status === 'lobby' ? (
          /* LOBBY VIEW */
          <Lobby
            roomCode={gameState.roomCode}
            players={gameState.players}
            settings={gameState.settings}
            isHost={gameState.isHost}
            myPlayerId={gameState.myId}
            onUpdateSettings={updateSettings}
            onClaimHost={claimHost}
            onStartGame={startGame}
            onKickPlayer={kickPlayer}
          />
        ) : (
          /* GAMEPLAY TABLE VIEW */
          <div className="flex-1 flex flex-col justify-between p-2 sm:p-4">
            {/* Top & Side Opponents Grid */}
            <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 py-1">
              {opponents.map((opp) => (
                <OpponentView
                  key={opp.id}
                  player={opp}
                  isCurrentTurn={opp.id === gameState.currentTurnPlayerId}
                  isDealer={false}
                  turnTimeRemaining={
                    opp.id === gameState.currentTurnPlayerId
                      ? gameState.turnTimeRemaining
                      : null
                  }
                />
              ))}
            </div>

            {/* Central Poker Table Area (Stock & Discard) */}
            <GameTable
              stockCount={gameState.stockCount}
              discardTop={gameState.discardTop}
              lastDiscard={gameState.lastDiscard}
              availablePickupCards={gameState.availablePickupCards}
              turnPhase={gameState.turnPhase}
              isMyTurn={gameState.isMyTurn}
              currentTurnPlayerName={currentTurnPlayer?.name || 'Player'}
              turnTimeRemaining={gameState.turnTimeRemaining}
              quickMatchEnabled={gameState.settings.quickMatch}
              selectedCardIds={selectedCardIds}
              onDrawStock={handleDrawStock}
              onDrawDiscard={handleDrawDiscard}
              onQuickMatch={handleQuickMatch}
              isActionDisabled={!isConnected}
            />

            {/* Bottom: Player's Own Hand & Action Buttons */}
            {!gameState.isSpectator && (
              <PlayerHand
                hand={gameState.myHand}
                settings={gameState.settings}
                handTotal={gameState.myHandTotal}
                isMyTurn={gameState.isMyTurn}
                turnPhase={gameState.turnPhase}
                canShow={gameState.canShow}
                canDiscard={gameState.canDiscard}
                discardTop={gameState.discardTop}
                selectedCardIds={selectedCardIds}
                onToggleSelectCard={handleToggleSelectCard}
                onDiscard={handleDiscard}
                onShow={handleShow}
                isActionDisabled={!isConnected}
              />
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {gameState && (gameState.status === 'round_end' || gameState.status === 'game_over') && (
        <ScoreboardModal
          status={gameState.status}
          roundResults={gameState.roundResults}
          gameWinnerId={gameState.gameWinnerId}
          isHost={gameState.isHost}
          onNextRound={nextRound}
          onRestartGame={restartGame}
        />
      )}

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        settings={gameState?.settings || {
          maxPlayers: 4,
          deckMode: 'single',
          externalJokers: false,
          faceCardValue: 'ten',
          aceValue: 1,
          showLimit: 10,
          wrongShowPenalty: 40,
          gameTargetScore: 100,
          singleRoundMode: false,
          quickMatch: false,
          turnTimerSeconds: 0,
        }}
      />

      <ActivityLog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        logs={gameState?.activityLog || []}
      />
    </div>
  );
}

export default App;

