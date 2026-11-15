import {
  AuthoritativeGameState,
  Card,
  GameSettings,
  PersonalizedGameState,
  PlayerInternal,
  PlayerPublic,
  Rank,
  RoundResult,
  TurnPhase,
} from './types';
import { calculateHandTotal, getCardValue, resolveShow } from './scoring';
import { reshuffleStockIfNeeded } from './deck';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  cards?: Card[];
}

/**
 * Validates whether the selected cards can be discarded together.
 * Rule: 1 card, or multiple cards of the exact same rank.
 */
export function validateDiscard(hand: Card[], cardIds: string[]): ValidationResult {
  if (!cardIds || cardIds.length === 0) {
    return { valid: false, error: 'Select at least one card to discard.' };
  }

  const selectedCards: Card[] = [];
  const handCardMap = new Map<string, Card>();
  for (const card of hand) {
    handCardMap.set(card.id, card);
  }

  for (const id of cardIds) {
    const card = handCardMap.get(id);
    if (!card) {
      return { valid: false, error: `Card ${id} is not in your hand.` };
    }
    selectedCards.push(card);
  }

  // All selected cards must have the same rank
  const firstRank = selectedCards[0].rank;
  for (let i = 1; i < selectedCards.length; i++) {
    if (selectedCards[i].rank !== firstRank) {
      return {
        valid: false,
        error: 'Multi-card discard must all be of the same rank.',
      };
    }
  }

  return { valid: true, cards: selectedCards };
}

/**
 * Validates quick match / slap discard.
 * Rule: Discarding card(s) that match the rank of the current top discard card.
 */
export function validateQuickMatchDiscard(
  hand: Card[],
  cardIds: string[],
  topDiscard: Card | null,
  externalJokersEnabled: boolean = false
): ValidationResult {
  if (!topDiscard) {
    return { valid: false, error: 'No discard pile to match.' };
  }

  const discardVal = validateDiscard(hand, cardIds);
  if (!discardVal.valid || !discardVal.cards) {
    return discardVal;
  }

  const isJoker = discardVal.cards[0].rank === 'JOKER' || Boolean(discardVal.cards[0].isJoker);
  const isTopJoker = topDiscard.rank === 'JOKER' || Boolean(topDiscard.isJoker);
  const isRankMatch = discardVal.cards[0].rank === topDiscard.rank;
  const isLevelMatch = isRankMatch || (externalJokersEnabled && (isJoker || isTopJoker));

  if (!isLevelMatch) {
    return {
      valid: false,
      error: `Cards do not match current top discard rank (${topDiscard.rank}).`,
    };
  }

  return discardVal;
}

/**
 * Validates drawing a card.
 * If source is 'discard', must specify discardCardId which must be in the previous discard set.
 */
export function validateDraw(
  source: 'stock' | 'discard',
  discardCardId: string | undefined,
  stockCount: number,
  lastDiscardCards: Card[] | null
): { valid: boolean; error?: string; chosenCard?: Card } {
  if (source === 'stock') {
    if (stockCount <= 0) {
      return { valid: false, error: 'Stock pile is empty and cannot be drawn.' };
    }
    return { valid: true };
  }

  if (source === 'discard') {
    if (!lastDiscardCards || lastDiscardCards.length === 0) {
      return { valid: false, error: 'No discard cards available to take.' };
    }

    if (lastDiscardCards.length === 1) {
      if (discardCardId && discardCardId !== lastDiscardCards[0].id) {
        return {
          valid: false,
          error: 'Selected card is not among the last discarded set.',
        };
      }
      return { valid: true, chosenCard: lastDiscardCards[0] };
    }

    // When previous player discarded multiple cards (a set), drawer can take any one card from that set
    if (!discardCardId) {
      // Default to the first card if not specified
      return { valid: true, chosenCard: lastDiscardCards[0] };
    }

    const matched = lastDiscardCards.find((c) => c.id === discardCardId);
    if (!matched) {
      return {
        valid: false,
        error: 'Selected card is not among the last discarded set.',
      };
    }
    return { valid: true, chosenCard: matched };
  }

  return { valid: false, error: 'Invalid draw source.' };
}

/**
 * Validates whether the current player can call "Show".
 * Can only be called at the start of their turn (turnPhase === 'action')
 * and their hand total <= settings.showLimit.
 */
export function validateShow(
  hand: Card[],
  settings: GameSettings,
  turnPhase: TurnPhase
): { valid: boolean; error?: string; handTotal: number } {
  const handTotal = calculateHandTotal(hand, settings);

  if (turnPhase !== 'action') {
    return {
      valid: false,
      error: 'You can only call Show at the start of your turn before discarding.',
      handTotal,
    };
  }

  // If showLimit is 0 or less, there is No Limit (any hand total can declare show)
  if (settings.showLimit > 0 && handTotal > settings.showLimit) {
    return {
      valid: false,
      error: `Your hand total (${handTotal}) exceeds the show limit (${settings.showLimit}).`,
      handTotal,
    };
  }

  return { valid: true, handTotal };
}

/**
 * Finds the next active (non-eliminated, non-spectator) player id in clockwise order.
 */
export function getNextTurnPlayerId(
  players: { id: string; isEliminated: boolean; isSpectator: boolean }[],
  currentPlayerId: string
): string {
  const activePlayers = players.filter((p) => !p.isEliminated && !p.isSpectator);
  if (activePlayers.length === 0) {
    return currentPlayerId;
  }

  const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId);
  if (currentIndex === -1) {
    return activePlayers[0].id;
  }

  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
}

/**
 * Finds the best single card to discard automatically when a turn times out.
 * Returns the card with highest point value (to minimize hand total).
 */
export function chooseAutoDiscard(hand: Card[], settings: GameSettings): Card {
  if (hand.length === 0) {
    throw new Error('Cannot auto discard from empty hand');
  }

  let highestCard = hand[0];
  let highestValue = getCardValue(highestCard, settings);

  for (let i = 1; i < hand.length; i++) {
    const val = getCardValue(hand[i], settings);
    if (val > highestValue) {
      highestValue = val;
      highestCard = hand[i];
    }
  }

  return highestCard;
}

/**
 * Generates the personalized game state for a specific player or spectator.
 * Crucially:
 * - Hand of other players is NEVER sent!
 * - Stock cards are NEVER sent (only stockCount)!
 * - Other player hand cards are revealed only when status === 'round_end' or 'game_over'
 */
export function getPersonalizedState(
  state: AuthoritativeGameState,
  targetPlayerId: string
): PersonalizedGameState {
  const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
  const isHost = targetPlayer?.isHost ?? false;
  const isSpectator = targetPlayer?.isSpectator ?? false;

  const myHand = state.hands[targetPlayerId] || [];
  const myHandTotal = calculateHandTotal(myHand, state.settings);

  const isMyTurn =
    state.status === 'playing' &&
    state.currentTurnPlayerId === targetPlayerId &&
    !targetPlayer?.isEliminated &&
    !isSpectator;

  const canShow =
    isMyTurn &&
    state.turnPhase === 'action' &&
    (state.settings.showLimit <= 0 || myHandTotal <= state.settings.showLimit);

  const canDiscard = isMyTurn && state.turnPhase === 'action';
  const canDraw = isMyTurn && state.turnPhase === 'draw';

  const discardTop =
    state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

  // Calculate remaining turn seconds
  let turnTimeRemaining: number | null = null;
  if (state.turnExpiresAt && state.status === 'playing') {
    const remainingMs = Math.max(0, state.turnExpiresAt - Date.now());
    turnTimeRemaining = Math.ceil(remainingMs / 1000);
  }

  const publicPlayers: PlayerPublic[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    isSpectator: p.isSpectator,
    cardCount: (state.hands[p.id] || []).length,
    score: p.score,
    roundScores: p.roundScores,
    isEliminated: p.isEliminated,
  }));

  return {
    roomCode: state.roomCode,
    status: state.status,
    roundNumber: state.roundNumber,
    settings: state.settings,
    players: publicPlayers,
    myId: targetPlayerId,
    isHost,
    isSpectator,
    myHand,
    myHandTotal,
    isMyTurn,
    currentTurnPlayerId: state.currentTurnPlayerId,
    turnPhase: state.turnPhase,
    turnTimeRemaining,
    stockCount: state.stock.length,
    discardTop,
    lastDiscard: state.lastDiscard,
    availablePickupCards: state.availablePickupCards || null,
    canShow,
    canDiscard,
    canDraw,
    roundResults: state.roundResults,
    activityLog: state.activityLog.slice(-30),
    actionSeq: state.actionSeq,
    gameWinnerId: state.gameWinnerId,
  };
}
