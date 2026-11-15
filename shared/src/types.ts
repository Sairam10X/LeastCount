export type Suit = 'S' | 'H' | 'D' | 'C' | 'JOKER';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER';

export interface Card {
  id: string; // e.g., 'S-A-1', 'JOKER-1'
  suit: Suit;
  rank: Rank;
  isJoker?: boolean;
}

export type DeckMode = 'single' | 'double';
export type FaceCardValue = 'ten' | 'actual'; // 'ten' = 10, 'actual' = J:11, Q:12, K:13
export type AceValue = 1 | 14;

export interface GameSettings {
  maxPlayers: number; // 2 to 8 (default: 4)
  deckMode: DeckMode; // single (52) or double (104)
  printedJokers: boolean; // 2 printed jokers per deck, value = 0
  externalJokers: boolean; // Cut/random joker card per round; all cards of matching rank = 0 pts & wild match
  faceCardValue: FaceCardValue; // K, Q, J = 10 or 13, 12, 11
  aceValue: AceValue; // 1 or 14
  showLimit: number; // max hand sum allowed to call show, default 10 (0 = no limit)
  wrongShowPenalty: number; // penalty points added on wrong show, default 40
  gameTargetScore: number; // points to get eliminated, default 100 (0 for single round mode)
  singleRoundMode: boolean; // if true, game finishes after one round
  quickMatch: boolean; // slap/quick match rule (out of turn matching rank), default false
  turnTimerSeconds: number; // 0 = off, or 15, 30, 45, 60
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 4,
  deckMode: 'single',
  printedJokers: false,
  externalJokers: false,
  faceCardValue: 'ten',
  aceValue: 1,
  showLimit: 10,
  wrongShowPenalty: 40,
  gameTargetScore: 100,
  singleRoundMode: false,
  quickMatch: false,
  turnTimerSeconds: 0,
};

export type GameStatus = 'lobby' | 'playing' | 'round_end' | 'game_over';

export type TurnPhase = 'action' | 'draw' | 'ended';

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  isSpectator: boolean;
  cardCount: number;
  score: number;
  roundScores: number[];
  isEliminated: boolean;
}

export interface PlayerInternal extends PlayerPublic {
  sessionToken: string;
}

export interface CardScoringDetail {
  card: Card;
  value: number;
}

export interface PlayerRoundResult {
  playerId: string;
  playerName: string;
  hand: Card[];
  cardValues: CardScoringDetail[];
  handTotal: number;
  penaltyAdded: number;
  roundScore: number; // added to running score this round
  totalScore: number; // new total
  isCaller: boolean;
  isWinner: boolean;
  isEliminated: boolean;
}

export interface RoundResult {
  roundNumber: number;
  callerId: string;
  cutJoker?: Card | null;
  isSuccessfulShow: boolean;
  lowestTotal: number;
  playerResults: PlayerRoundResult[];
  eliminatedPlayerIds: string[];
  gameWinnerId: string | null;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  text: string;
  type?: 'action' | 'show' | 'system' | 'timer' | 'chat';
}

export interface LastDiscard {
  playerId: string;
  playerName: string;
  cards: Card[];
}

/** Complete state stored authoritatively inside the Durable Object */
export interface AuthoritativeGameState {
  roomCode: string;
  status: GameStatus;
  roundNumber: number;
  settings: GameSettings;
  players: PlayerInternal[];
  currentTurnPlayerId: string | null;
  turnPhase: TurnPhase;
  turnStartTime: number | null;
  turnExpiresAt: number | null;
  dealerPlayerId: string | null;
  hands: Record<string, Card[]>; // Secret!
  stock: Card[]; // Secret!
  discardPile: Card[];
  cutJoker: Card | null; // Selected external wildcard cut card (revealed if externalJokers is enabled)
  lastDiscard: LastDiscard | null;
  availablePickupCards: Card[] | null;
  roundResults: RoundResult | null;
  activityLog: ActivityLogEntry[];
  actionSeq: number;
  gameWinnerId: string | null;
  lastActiveTimestamp: number;
}

/** Sanitized state delivered to an individual client */
export interface PersonalizedGameState {
  roomCode: string;
  status: GameStatus;
  roundNumber: number;
  settings: GameSettings;
  players: PlayerPublic[];
  myId: string;
  isHost: boolean;
  isSpectator: boolean;
  myHand: Card[];
  myHandTotal: number;
  isMyTurn: boolean;
  currentTurnPlayerId: string | null;
  turnPhase: TurnPhase;
  turnTimeRemaining: number | null; // in seconds
  stockCount: number;
  cutJoker: Card | null;
  discardTop: Card | null;
  lastDiscard: LastDiscard | null;
  availablePickupCards: Card[] | null;
  canShow: boolean;
  canDiscard: boolean;
  canDraw: boolean;
  roundResults: RoundResult | null;
  activityLog: ActivityLogEntry[];
  actionSeq: number;
  gameWinnerId: string | null;
}

// Client -> Server Intent Messages
export type ClientMessage =
  | { type: 'join'; roomCode: string; playerName: string; sessionToken?: string; asSpectator?: boolean }
  | { type: 'update_settings'; settings: Partial<GameSettings> }
  | { type: 'start_game' }
  | { type: 'next_round' }
  | { type: 'restart_game' }
  | { type: 'kick_player'; playerId: string }
  | { type: 'discard'; cardIds: string[]; seq: number }
  | { type: 'draw'; source: 'stock' | 'discard'; discardCardId?: string; seq: number }
  | { type: 'show'; seq: number }
  | { type: 'claim_host' }
  | { type: 'quick_match_discard'; cardIds: string[]; seq: number }
  | { type: 'chat'; message: string }
  | { type: 'ping' };

// Server -> Client Messages
export type ServerMessage =
  | { type: 'sync'; state: PersonalizedGameState }
  | { type: 'joined'; playerId: string; sessionToken: string; roomCode: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'toast'; message: string; variant?: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'chat_bubble'; playerId: string; playerName: string; message: string; timestamp: number }
  | { type: 'pong' };

