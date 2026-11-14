import { Card, DeckMode, Rank, Suit } from './types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(deckMode: DeckMode = 'single', externalJokers = false): Card[] {
  const deckCount = deckMode === 'double' ? 2 : 1;
  const cards: Card[] = [];

  for (let d = 1; d <= deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${d}-${suit}-${rank}`,
          suit,
          rank,
          isJoker: false,
        });
      }
    }

    if (externalJokers) {
      cards.push({
        id: `${d}-JOKER-1`,
        suit: 'JOKER',
        rank: 'JOKER',
        isJoker: true,
      });
      cards.push({
        id: `${d}-JOKER-2`,
        suit: 'JOKER',
        rank: 'JOKER',
        isJoker: true,
      });
    }
  }

  return cards;
}

export function shuffleDeck<T>(items: T[], rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Deal cards to active players.
 * Standard Least Count deals 5 cards to each player.
 */
export function dealCards(
  deck: Card[],
  playerIds: string[],
  cardsPerPlayer = 5
): {
  hands: Record<string, Card[]>;
  stock: Card[];
  discardPile: Card[];
} {
  const copy = [...deck];
  const hands: Record<string, Card[]> = {};

  for (const pid of playerIds) {
    hands[pid] = [];
  }

  for (let round = 0; round < cardsPerPlayer; round++) {
    for (const pid of playerIds) {
      const card = copy.pop();
      if (card) {
        hands[pid].push(card);
      }
    }
  }

  // Turn top card face-up for discard pile
  const initialDiscard = copy.pop();
  const discardPile: Card[] = initialDiscard ? [initialDiscard] : [];

  return {
    hands,
    stock: copy,
    discardPile,
  };
}

/**
 * If stock is exhausted, reshuffle the discard pile (keeping the top card) to form a new stock.
 */
export function reshuffleStockIfNeeded(
  stock: Card[],
  discardPile: Card[],
  rng = Math.random
): { stock: Card[]; discardPile: Card[]; reshuffled: boolean } {
  if (stock.length > 0) {
    return { stock, discardPile, reshuffled: false };
  }

  if (discardPile.length <= 1) {
    // Nothing or only 1 card left to reshuffle
    return { stock: [], discardPile, reshuffled: false };
  }

  const topCard = discardPile[discardPile.length - 1];
  const cardsToShuffle = discardPile.slice(0, discardPile.length - 1);
  const newStock = shuffleDeck(cardsToShuffle, rng);

  return {
    stock: newStock,
    discardPile: [topCard],
    reshuffled: true,
  };
}

