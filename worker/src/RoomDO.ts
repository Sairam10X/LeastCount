import { DurableObject } from 'cloudflare:workers';
import {
  AuthoritativeGameState,
  Card,
  ClientMessage,
  DEFAULT_SETTINGS,
  GameSettings,
  PlayerInternal,
  ServerMessage,
  chooseAutoDiscard,
  createDeck,
  dealCards,
  getNextTurnPlayerId,
  getPersonalizedState,
  reshuffleStockIfNeeded,
  resolveShow,
  shuffleDeck,
  validateDiscard,
  validateDraw,
  validateQuickMatchDiscard,
  validateShow,
} from 'shared';
import { Env } from './index';

interface WebSocketAttachment {
  playerId: string;
  sessionToken: string;
}

const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours idle cleanup

export class RoomDO extends DurableObject<Env> {
  private state!: AuthoritativeGameState;
  private isLoaded = false;
  private messageQueue: Promise<void> = Promise.resolve();
  private lastMessageTimestampByPlayer = new Map<string, number>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async ensureLoaded(roomCode: string): Promise<void> {
    if (this.isLoaded) return;

    const saved = await this.ctx.storage.get<AuthoritativeGameState>('state');
    if (saved) {
      this.state = saved;
      if (!this.state.availablePickupCards) {
        this.state.availablePickupCards = null;
      }
      this.ensureHostAssigned();
    } else {
      this.state = {
        roomCode,
        status: 'lobby',
        roundNumber: 1,
        settings: { ...DEFAULT_SETTINGS },
        players: [],
        currentTurnPlayerId: null,
        turnPhase: 'action',
        turnStartTime: null,
        turnExpiresAt: null,
        dealerPlayerId: null,
        hands: {},
        stock: [],
        discardPile: [],
        lastDiscard: null,
        availablePickupCards: null,
        roundResults: null,
        activityLog: [],
        actionSeq: 0,
        gameWinnerId: null,
        lastActiveTimestamp: Date.now(),
      };
      await this.saveState();
    }

    this.isLoaded = true;
  }

  private async saveState(): Promise<void> {
    this.state.lastActiveTimestamp = Date.now();
    await this.ctx.storage.put('state', this.state);
  }

  private addLog(text: string, type: 'action' | 'show' | 'system' | 'timer' = 'action') {
    this.state.activityLog.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      text,
      type,
    });
    if (this.state.activityLog.length > 50) {
      this.state.activityLog = this.state.activityLog.slice(-50);
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const res = this.messageQueue.then(operation);
    this.messageQueue = res.then(() => {}).catch(() => {});
    return res;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomCode = url.pathname.split('/')[2] || 'ROOM';
    await this.ensureLoaded(roomCode);

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response(
      JSON.stringify({
        roomCode: this.state.roomCode,
        status: this.state.status,
        playerCount: this.state.players.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // --- WebSocket Hibernation API Handlers ---

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    return this.enqueue(async () => {
      if (typeof message !== 'string') return;

      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(message);
      } catch {
        this.sendError(ws, 'Invalid JSON');
        return;
      }

      await this.handleClientMessage(ws, parsed);
    });
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    return this.enqueue(async () => {
      const attachment = this.getAttachment(ws);
      if (!attachment) return;

      const player = this.state.players.find((p) => p.id === attachment.playerId);
      if (player) {
        player.connected = false;
        this.addLog(`${player.name} disconnected.`, 'system');

        if (player.isHost) {
          player.isHost = false;
        }
        this.ensureHostAssigned();

        await this.saveState();
        this.broadcastSync();
      }
    });
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    // Treat error like close
    await this.webSocketClose(ws, 1006, 'WebSocket error', false);
  }

  async alarm(): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureLoaded(this.state?.roomCode || 'UNKNOWN');

      // 1. Check if room is idle for too long
      if (Date.now() - this.state.lastActiveTimestamp > IDLE_TIMEOUT_MS) {
        await this.ctx.storage.deleteAll();
        return;
      }

      // 2. Check turn timer expiration
      if (
        this.state.status === 'playing' &&
        this.state.turnExpiresAt &&
        Date.now() >= this.state.turnExpiresAt
      ) {
        await this.handleTurnTimeout();
      }
    });
  }

  // --- Message Handling & Game Engine Invocation ---

  private async handleClientMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (msg.type === 'join') {
      await this.handleJoin(ws, msg);
      return;
    }

    const attachment = this.getAttachment(ws);
    if (!attachment) {
      this.sendError(ws, 'You must join first before sending actions.');
      return;
    }

    const player = this.state.players.find((p) => p.id === attachment.playerId);
    if (!player) {
      this.sendError(ws, 'Player record not found. Please rejoin.');
      return;
    }

    // Rate limiting: allow at most 20 messages per second per player
    const now = Date.now();
    const lastMsgTime = this.lastMessageTimestampByPlayer.get(player.id) || 0;
    if (now - lastMsgTime < 50) {
      this.sendError(ws, 'Sending actions too fast.');
      return;
    }
    this.lastMessageTimestampByPlayer.set(player.id, now);

    switch (msg.type) {
      case 'update_settings':
        await this.handleUpdateSettings(ws, player, msg.settings);
        break;
      case 'start_game':
        await this.handleStartGame(ws, player);
        break;
      case 'next_round':
        await this.handleNextRound(ws, player);
        break;
      case 'restart_game':
        await this.handleRestartGame(ws, player);
        break;
      case 'kick_player':
        await this.handleKickPlayer(ws, player, msg.playerId);
        break;
      case 'discard':
        await this.handleDiscard(ws, player, msg.cardIds, msg.seq);
        break;
      case 'draw':
        await this.handleDraw(ws, player, msg.source, msg.discardCardId, msg.seq);
        break;
      case 'show':
        await this.handleShow(ws, player, msg.seq);
        break;
      case 'claim_host':
        if (this.state.status === 'lobby') {
          for (const p of this.state.players) {
            p.isHost = false;
          }
          player.isHost = true;
          this.addLog(`${player.name} claimed host permissions.`, 'system');
          await this.saveState();
          this.broadcastSync();
        }
        break;
      case 'quick_match_discard':
        await this.handleQuickMatch(ws, player, msg.cardIds, msg.seq);
        break;
      default:
        this.sendError(ws, 'Unknown command');
    }
  }

  private ensureHostAssigned(): void {
    const activeNonSpectators = this.state.players.filter((p) => p.connected && !p.isSpectator);
    const hasConnectedHost = activeNonSpectators.some((p) => p.isHost);
    if (!hasConnectedHost && activeNonSpectators.length > 0) {
      // Clear host from all
      for (const p of this.state.players) {
        p.isHost = false;
      }
      // Assign host to first connected active player
      activeNonSpectators[0].isHost = true;
      this.addLog(`${activeNonSpectators[0].name} is now the room host.`, 'system');
    }
  }

  private async handleJoin(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: 'join' }>
  ): Promise<void> {
    const { playerName, sessionToken, asSpectator } = msg;

    // Check reconnection with sessionToken
    if (sessionToken) {
      const existing = this.state.players.find((p) => p.sessionToken === sessionToken);
      if (existing) {
        existing.connected = true;
        if (playerName && playerName.trim()) {
          existing.name = playerName.trim();
        }
        this.setAttachment(ws, {
          playerId: existing.id,
          sessionToken: existing.sessionToken,
        });

        this.ensureHostAssigned();

        ws.send(
          JSON.stringify({
            type: 'joined',
            playerId: existing.id,
            sessionToken: existing.sessionToken,
            roomCode: this.state.roomCode,
          })
        );

        this.addLog(`${existing.name} reconnected.`, 'system');
        await this.saveState();
        this.broadcastSync();
        return;
      }
    }

    // New player or spectator joining
    const isGameInProgress = this.state.status !== 'lobby';
    const nonSpectatorCount = this.state.players.filter((p) => !p.isSpectator).length;
    const shouldBeSpectator =
      asSpectator || isGameInProgress || nonSpectatorCount >= this.state.settings.maxPlayers;

    const newPlayerId = `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newSessionToken = `tok-${Math.random().toString(36).substring(2)}-${Date.now().toString(36)}`;
    
    // Check if there is already any connected host in the room
    const hasConnectedHost = this.state.players.some((p) => p.isHost && p.connected);
    const shouldBeHost = !hasConnectedHost && !shouldBeSpectator;

    const newPlayer: PlayerInternal = {
      id: newPlayerId,
      name: (playerName || 'Player').trim().substring(0, 20),
      isHost: shouldBeHost,
      connected: true,
      isSpectator: shouldBeSpectator,
      cardCount: 0,
      score: 0,
      roundScores: [],
      isEliminated: false,
      sessionToken: newSessionToken,
    };

    if (shouldBeHost) {
      // Demote any offline hosts
      for (const p of this.state.players) {
        p.isHost = false;
      }
    }

    this.state.players.push(newPlayer);
    this.ensureHostAssigned();

    this.setAttachment(ws, {
      playerId: newPlayerId,
      sessionToken: newSessionToken,
    });

    ws.send(
      JSON.stringify({
        type: 'joined',
        playerId: newPlayerId,
        sessionToken: newSessionToken,
        roomCode: this.state.roomCode,
      })
    );

    const roleDesc = shouldBeSpectator ? 'as a spectator' : 'to the game';
    this.addLog(`${newPlayer.name} joined ${roleDesc}.`, 'system');

    // Auto suggest multi-deck if players > 5
    if (
      !shouldBeSpectator &&
      this.state.players.filter((p) => !p.isSpectator).length > 5 &&
      this.state.settings.deckMode === 'single'
    ) {
      this.state.settings.deckMode = 'double';
      this.addLog('Settings auto-updated to Multi-deck (104 cards) for >5 players.', 'system');
    }

    await this.saveState();
    this.broadcastSync();
  }

  private async handleUpdateSettings(
    ws: WebSocket,
    player: PlayerInternal,
    newSettings: Partial<GameSettings>
  ): Promise<void> {
    if (this.state.status !== 'lobby') {
      this.sendError(ws, 'Settings can only be changed in the lobby.');
      return;
    }

    // Auto-promote player to host if no active host exists
    if (!player.isHost) {
      const hasOtherConnectedHost = this.state.players.some(
        (p) => p.isHost && p.connected && p.id !== player.id
      );
      if (!hasOtherConnectedHost) {
        player.isHost = true;
      }
    }

    this.state.settings = {
      ...this.state.settings,
      ...newSettings,
    };

    this.addLog(`${player.name} updated game settings.`, 'system');
    await this.saveState();
    this.broadcastSync();
  }

  private async handleKickPlayer(
    ws: WebSocket,
    player: PlayerInternal,
    targetPlayerId: string
  ): Promise<void> {
    if (!player.isHost) {
      this.sendError(ws, 'Only the host can kick players.');
      return;
    }
    if (targetPlayerId === player.id) {
      this.sendError(ws, 'Host cannot kick themselves.');
      return;
    }

    const targetIdx = this.state.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIdx !== -1) {
      const kicked = this.state.players[targetIdx];
      this.state.players.splice(targetIdx, 1);
      delete this.state.hands[targetPlayerId];
      this.addLog(`${kicked.name} was removed by the host.`, 'system');

      // Close the kicked player's WebSocket
      for (const socket of this.ctx.getWebSockets()) {
        const att = this.getAttachment(socket);
        if (att?.playerId === targetPlayerId) {
          socket.send(
            JSON.stringify({ type: 'error', message: 'You have been removed from the room.' })
          );
          socket.close(1000, 'Kicked by host');
        }
      }

      await this.saveState();
      this.broadcastSync();
    }
  }

  private async handleStartGame(ws: WebSocket, player: PlayerInternal): Promise<void> {
    if (!player.isHost) {
      this.sendError(ws, 'Only the host can start the game.');
      return;
    }

    const activePlayers = this.state.players.filter((p) => !p.isSpectator);
    if (activePlayers.length < 2) {
      this.sendError(ws, 'At least 2 players are required to start the game.');
      return;
    }

    // Reset scores & status
    for (const p of this.state.players) {
      p.score = 0;
      p.roundScores = [];
      p.isEliminated = false;
    }
    this.state.roundNumber = 1;
    this.state.gameWinnerId = null;

    // First dealer is host or first active player
    this.state.dealerPlayerId = activePlayers[0].id;

    await this.startRound();
  }

  private async handleNextRound(ws: WebSocket, player: PlayerInternal): Promise<void> {
    if (!player.isHost) {
      this.sendError(ws, 'Only the host can start the next round.');
      return;
    }
    if (this.state.status !== 'round_end') {
      this.sendError(ws, 'Game is not waiting for next round.');
      return;
    }

    this.state.roundNumber++;

    // Rotate dealer clockwise
    const active = this.state.players.filter((p) => !p.isSpectator && !p.isEliminated);
    if (active.length > 0) {
      this.state.dealerPlayerId = getNextTurnPlayerId(active, this.state.dealerPlayerId || active[0].id);
    }

    await this.startRound();
  }

  private async handleRestartGame(ws: WebSocket, player: PlayerInternal): Promise<void> {
    if (!player.isHost) {
      this.sendError(ws, 'Only the host can restart the game.');
      return;
    }

    this.state.status = 'lobby';
    this.state.roundNumber = 1;
    this.state.gameWinnerId = null;
    this.state.roundResults = null;
    this.state.hands = {};
    this.state.stock = [];
    this.state.discardPile = [];
    this.state.lastDiscard = null;
    this.state.currentTurnPlayerId = null;
    this.state.turnPhase = 'action';
    this.state.turnExpiresAt = null;

    for (const p of this.state.players) {
      p.score = 0;
      p.roundScores = [];
      p.isEliminated = false;
    }

    this.addLog('Game restarted by host. Back in lobby.', 'system');
    await this.saveState();
    this.broadcastSync();
  }

  private async startRound(): Promise<void> {
    const activePlayers = this.state.players.filter(
      (p) => !p.isSpectator && !p.isEliminated
    );
    if (activePlayers.length < 2) {
      // Game over, crown winner
      this.state.status = 'game_over';
      this.state.gameWinnerId = activePlayers[0]?.id || null;
      await this.saveState();
      this.broadcastSync();
      return;
    }

    // Build and shuffle deck
    const deck = createDeck(this.state.settings.deckMode, this.state.settings.externalJokers);
    const shuffled = shuffleDeck(deck);

    // Deal 5 cards each
    const { hands, stock, discardPile } = dealCards(
      shuffled,
      activePlayers.map((p) => p.id),
      5
    );

    this.state.hands = hands;
    this.state.stock = stock;
    this.state.discardPile = discardPile;
    this.state.lastDiscard = discardPile.length > 0
      ? { playerId: 'system', playerName: 'Deck', cards: [discardPile[0]] }
      : null;
    this.state.roundResults = null;
    this.state.status = 'playing';

    // First turn goes to player immediately after the dealer
    const firstTurnId = getNextTurnPlayerId(
      activePlayers,
      this.state.dealerPlayerId || activePlayers[0].id
    );
    this.state.currentTurnPlayerId = firstTurnId;
    this.state.turnPhase = 'action';
    this.setTurnTimer();

    const turnPlayer = this.state.players.find((p) => p.id === firstTurnId);
    this.addLog(
      `Round ${this.state.roundNumber} started! ${turnPlayer?.name || 'Player'}'s turn.`,
      'system'
    );

    await this.saveState();
    this.broadcastSync();
  }

  private setTurnTimer(): void {
    if (this.state.settings.turnTimerSeconds > 0) {
      const expiresAt = Date.now() + this.state.settings.turnTimerSeconds * 1000;
      this.state.turnStartTime = Date.now();
      this.state.turnExpiresAt = expiresAt;
      this.ctx.storage.setAlarm(expiresAt);
    } else {
      this.state.turnStartTime = null;
      this.state.turnExpiresAt = null;
    }
  }

  private async handleDiscard(
    ws: WebSocket,
    player: PlayerInternal,
    cardIds: string[],
    seq: number
  ): Promise<void> {
    if (this.state.status !== 'playing') {
      this.sendError(ws, 'Game is not currently active.');
      return;
    }
    if (this.state.currentTurnPlayerId !== player.id) {
      this.sendError(ws, 'Not your turn.');
      return;
    }
    if (this.state.turnPhase !== 'action') {
      this.sendError(ws, 'You have already discarded. Pick a card to complete your turn.');
      return;
    }

    const hand = this.state.hands[player.id] || [];
    const validation = validateDiscard(hand, cardIds);
    if (!validation.valid || !validation.cards) {
      this.sendError(ws, validation.error || 'Invalid discard.');
      return;
    }

    const discarded = validation.cards;
    const discardedIds = new Set(discarded.map((c) => c.id));

    // Card on top of the discard pile BEFORE this discard is added
    const topCardBefore =
      this.state.discardPile.length > 0
        ? this.state.discardPile[this.state.discardPile.length - 1]
        : null;

    // Remove cards from player's hand
    this.state.hands[player.id] = hand.filter((c) => !discardedIds.has(c.id));

    // Add cards to discard pile
    this.state.discardPile.push(...discarded);
    this.state.lastDiscard = {
      playerId: player.id,
      playerName: player.name,
      cards: discarded,
    };

    // Check if the discarded card's rank matches the top of the discard pile
    const isLevelMatch = topCardBefore !== null && discarded[0].rank === topCardBefore.rank;
    const cardNames = discarded.map((c) => `${c.rank}${c.suit === 'JOKER' ? '★' : c.suit}`).join(' ');

    if (isLevelMatch) {
      // LEVEL MATCH: Player need NOT pick any card! Turn is complete!
      this.state.availablePickupCards = null;
      this.addLog(
        `⚡ LEVEL MATCH! ${player.name} discarded [${cardNames}] matching rank ${topCardBefore.rank} — No card picked! Turn complete.`
      );

      // Turn is complete: advance to next player
      const nextPlayerId = getNextTurnPlayerId(this.state.players, player.id);
      this.state.currentTurnPlayerId = nextPlayerId;
      this.state.turnPhase = 'action';
      this.state.actionSeq++;
      this.setTurnTimer();
    } else {
      // DOES NOT MATCH: Player MUST pick 1 card!
      // They can pick from stock OR pick the card that was on top before their discard
      this.state.availablePickupCards = topCardBefore ? [topCardBefore] : null;
      this.state.turnPhase = 'draw';
      this.state.actionSeq++;
      this.addLog(
        `${player.name} discarded [${cardNames}] (rank ${discarded[0].rank} != ${topCardBefore?.rank || 'deck'}). Must pick 1 card from Stock or Discard deck.`
      );
    }

    await this.saveState();
    this.broadcastSync();
  }

  private async handleDraw(
    ws: WebSocket,
    player: PlayerInternal,
    source: 'stock' | 'discard',
    discardCardId: string | undefined,
    seq: number
  ): Promise<void> {
    if (this.state.status !== 'playing') {
      this.sendError(ws, 'Game is not active.');
      return;
    }
    if (this.state.currentTurnPlayerId !== player.id) {
      this.sendError(ws, 'Not your turn.');
      return;
    }
    if (this.state.turnPhase !== 'draw') {
      this.sendError(ws, 'You must discard before picking a card.');
      return;
    }

    // Check stock reshuffling if stock is chosen
    if (source === 'stock') {
      const reshuffleResult = reshuffleStockIfNeeded(
        this.state.stock,
        this.state.discardPile
      );
      if (reshuffleResult.reshuffled) {
        this.state.stock = reshuffleResult.stock;
        this.state.discardPile = reshuffleResult.discardPile;
        this.addLog('Stock exhausted! Reshuffled discard pile into new stock.', 'system');
      }
    }

    const availableCards = this.state.availablePickupCards || [];
    const validation = validateDraw(
      source,
      discardCardId,
      this.state.stock.length,
      availableCards
    );

    if (!validation.valid) {
      this.sendError(ws, validation.error || 'Invalid draw.');
      return;
    }

    let drawnCard: Card | undefined;
    if (source === 'stock') {
      drawnCard = this.state.stock.pop();
      if (!drawnCard) {
        this.sendError(ws, 'No cards left in stock.');
        return;
      }
      this.addLog(`${player.name} drew a new card from stock.`);
    } else {
      // Drawn from available discard card
      const chosen =
        (discardCardId && availableCards.find((c) => c.id === discardCardId)) ||
        validation.chosenCard ||
        availableCards[0];

      if (!chosen) {
        this.sendError(ws, 'No card available to pick from discard deck.');
        return;
      }

      // Remove chosen card from this.state.discardPile
      const idx = this.state.discardPile.findIndex((c) => c.id === chosen.id);
      if (idx !== -1) {
        this.state.discardPile.splice(idx, 1);
      }
      drawnCard = chosen;
      this.addLog(
        `${player.name} picked ${chosen.rank}${chosen.suit === 'JOKER' ? '★' : chosen.suit} from the discard deck.`
      );
    }

    // Add drawn card to hand
    if (!this.state.hands[player.id]) {
      this.state.hands[player.id] = [];
    }
    this.state.hands[player.id].push(drawnCard);

    // Turn is complete: clear availablePickupCards and advance to next player
    this.state.availablePickupCards = null;
    const nextPlayerId = getNextTurnPlayerId(this.state.players, player.id);
    this.state.currentTurnPlayerId = nextPlayerId;
    this.state.turnPhase = 'action';
    this.state.actionSeq++;
    this.setTurnTimer();

    await this.saveState();
    this.broadcastSync();
  }

  private async handleShow(ws: WebSocket, player: PlayerInternal, seq: number): Promise<void> {
    if (this.state.status !== 'playing') {
      this.sendError(ws, 'Game is not active.');
      return;
    }
    if (this.state.currentTurnPlayerId !== player.id) {
      this.sendError(ws, 'Not your turn to call Show.');
      return;
    }

    const hand = this.state.hands[player.id] || [];
    const validation = validateShow(hand, this.state.settings, this.state.turnPhase);
    if (!validation.valid) {
      this.sendError(ws, validation.error || 'Cannot call Show.');
      return;
    }

    // Resolve show
    const playersForScoring = this.state.players
      .filter((p) => !p.isSpectator)
      .map((p) => ({
        id: p.id,
        name: p.name,
        hand: this.state.hands[p.id] || [],
        currentScore: p.score,
        isEliminated: p.isEliminated,
      }));

    const result = resolveShow(
      player.id,
      playersForScoring,
      this.state.settings,
      this.state.roundNumber
    );

    // Update player scores
    for (const pr of result.playerResults) {
      const match = this.state.players.find((p) => p.id === pr.playerId);
      if (match) {
        match.score = pr.totalScore;
        match.roundScores.push(pr.roundScore);
        if (pr.isEliminated) {
          match.isEliminated = true;
        }
      }
    }

    this.state.roundResults = result;
    this.state.turnExpiresAt = null;

    if (result.isSuccessfulShow) {
      this.addLog(
        `🏆 ${player.name} called SHOW with hand total ${result.lowestTotal} and WON the round (0 pts)!`,
        'show'
      );
    } else {
      this.addLog(
        `💥 WRONG SHOW! ${player.name} called with total ${validation.handTotal} but was beaten or tied! Added +${this.state.settings.wrongShowPenalty} penalty.`,
        'show'
      );
    }

    if (result.gameWinnerId) {
      this.state.status = 'game_over';
      this.state.gameWinnerId = result.gameWinnerId;
      const gameWinner = this.state.players.find((p) => p.id === result.gameWinnerId);
      this.addLog(`👑 GAME OVER! ${gameWinner?.name || 'Player'} wins the match!`, 'system');
    } else {
      this.state.status = 'round_end';
    }

    this.state.actionSeq++;
    await this.saveState();
    this.broadcastSync();
  }

  private async handleQuickMatch(
    ws: WebSocket,
    player: PlayerInternal,
    cardIds: string[],
    seq: number
  ): Promise<void> {
    if (!this.state.settings.quickMatch) {
      this.sendError(ws, 'Quick match rule is disabled in this room.');
      return;
    }
    if (this.state.status !== 'playing') {
      this.sendError(ws, 'Game is not active.');
      return;
    }
    if (player.isEliminated || player.isSpectator) {
      this.sendError(ws, 'Spectators or eliminated players cannot discard.');
      return;
    }

    const topDiscard =
      this.state.discardPile.length > 0
        ? this.state.discardPile[this.state.discardPile.length - 1]
        : null;

    const hand = this.state.hands[player.id] || [];
    const validation = validateQuickMatchDiscard(hand, cardIds, topDiscard);
    if (!validation.valid || !validation.cards) {
      this.sendError(ws, validation.error || 'Cannot quick match discard.');
      return;
    }

    const discarded = validation.cards;
    const discardedIds = new Set(discarded.map((c) => c.id));

    this.state.hands[player.id] = hand.filter((c) => !discardedIds.has(c.id));
    this.state.discardPile.push(...discarded);
    this.state.lastDiscard = {
      playerId: player.id,
      playerName: player.name,
      cards: discarded,
    };

    const cardNames = discarded.map((c) => `${c.rank}${c.suit === 'JOKER' ? '★' : c.suit}`).join(' ');
    this.addLog(`⚡ QUICK MATCH! ${player.name} slapped [${cardNames}] out of turn!`);

    this.state.actionSeq++;
    await this.saveState();
    this.broadcastSync();
  }

  private async handleTurnTimeout(): Promise<void> {
    const currentTurnId = this.state.currentTurnPlayerId;
    if (!currentTurnId) return;

    const player = this.state.players.find((p) => p.id === currentTurnId);
    if (!player) return;

    const hand = this.state.hands[currentTurnId] || [];
    this.addLog(`⏱️ Turn timed out for ${player.name}. Auto-playing move.`, 'timer');

    if (this.state.turnPhase === 'action') {
      if (hand.length > 0) {
        // Discard highest value card
        const cardToDiscard = chooseAutoDiscard(hand, this.state.settings);
        const topCardBefore =
          this.state.discardPile.length > 0
            ? this.state.discardPile[this.state.discardPile.length - 1]
            : null;

        this.state.hands[currentTurnId] = hand.filter((c) => c.id !== cardToDiscard.id);
        this.state.discardPile.push(cardToDiscard);
        this.state.lastDiscard = {
          playerId: player.id,
          playerName: player.name,
          cards: [cardToDiscard],
        };

        const isMatch = topCardBefore && cardToDiscard.rank === topCardBefore.rank;
        if (!isMatch) {
          // If no match, auto-draw from stock
          const reshuffleResult = reshuffleStockIfNeeded(
            this.state.stock,
            this.state.discardPile
          );
          if (reshuffleResult.reshuffled) {
            this.state.stock = reshuffleResult.stock;
            this.state.discardPile = reshuffleResult.discardPile;
          }

          const drawn = this.state.stock.pop();
          if (drawn) {
            this.state.hands[currentTurnId].push(drawn);
          }
        }
      }
      this.state.availablePickupCards = null;
    } else if (this.state.turnPhase === 'draw') {
      // Already discarded, just draw from stock
      const reshuffleResult = reshuffleStockIfNeeded(
        this.state.stock,
        this.state.discardPile
      );
      if (reshuffleResult.reshuffled) {
        this.state.stock = reshuffleResult.stock;
        this.state.discardPile = reshuffleResult.discardPile;
      }
      const drawn = this.state.stock.pop();
      if (drawn) {
        this.state.hands[currentTurnId].push(drawn);
      }
      this.state.availablePickupCards = null;
    }

    // Advance turn to next player
    const nextPlayerId = getNextTurnPlayerId(this.state.players, currentTurnId);
    this.state.currentTurnPlayerId = nextPlayerId;
    this.state.turnPhase = 'action';
    this.state.actionSeq++;
    this.setTurnTimer();

    await this.saveState();
    this.broadcastSync();
  }

  // --- Broadcasting & Synchronization ---

  private broadcastSync(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.getAttachment(ws);
      if (att && att.playerId) {
        const personalized = getPersonalizedState(this.state, att.playerId);
        const msg: ServerMessage = {
          type: 'sync',
          state: personalized,
        };
        try {
          ws.send(JSON.stringify(msg));
        } catch {
          // Socket might have closed
        }
      }
    }
  }

  private sendError(ws: WebSocket, message: string, code?: string): void {
    const errorMsg: ServerMessage = { type: 'error', message, code };
    try {
      ws.send(JSON.stringify(errorMsg));
    } catch {}
  }

  private getAttachment(ws: WebSocket): WebSocketAttachment | null {
    try {
      return ws.deserializeAttachment() as WebSocketAttachment;
    } catch {
      return null;
    }
  }

  private setAttachment(ws: WebSocket, att: WebSocketAttachment): void {
    try {
      ws.serializeAttachment(att);
    } catch {}
  }
}
