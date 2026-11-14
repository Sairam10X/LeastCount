import { describe, expect, it } from 'vitest';
import {
  createDeck,
  dealCards,
  reshuffleStockIfNeeded,
  shuffleDeck,
} from '../src/deck';
import { Card } from '../src/types';

describe('Deck Building & Dealing', () => {
  it('creates a standard single deck with 52 cards and no jokers', () => {
    const deck = createDeck('single', false);
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
    expect(deck.some((c) => c.isJoker)).toBe(false);
  });

  it('creates a single deck with 2 external jokers (54 cards)', () => {
    const deck = createDeck('single', true);
    expect(deck).toHaveLength(54);
    const jokers = deck.filter((c) => c.isJoker);
    expect(jokers).toHaveLength(2);
    expect(jokers[0].rank).toBe('JOKER');
  });

  it('creates a double deck with 104 cards and no jokers', () => {
    const deck = createDeck('double', false);
    expect(deck).toHaveLength(104);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(104);
  });

  it('creates a double deck with 4 external jokers (108 cards)', () => {
    const deck = createDeck('double', true);
    expect(deck).toHaveLength(108);
    const jokers = deck.filter((c) => c.isJoker);
    expect(jokers).toHaveLength(4);
  });

  it('deals 5 cards to each player and 1 card face up to discard pile', () => {
    const deck = createDeck('single', false);
    const players = ['p1', 'p2', 'p3'];
    const { hands, stock, discardPile } = dealCards(deck, players, 5);

    expect(hands['p1']).toHaveLength(5);
    expect(hands['p2']).toHaveLength(5);
    expect(hands['p3']).toHaveLength(5);
    expect(discardPile).toHaveLength(1);
    expect(stock).toHaveLength(52 - 3 * 5 - 1); // 36
  });

  it('shuffles deck without losing cards', () => {
    const deck = createDeck('single', false);
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map((c) => c.id)).size).toBe(52);
  });

  it('reshuffles discard pile into stock when stock is empty', () => {
    const discardPile: Card[] = [
      { id: '1', suit: 'H', rank: '2' },
      { id: '2', suit: 'S', rank: '7' },
      { id: '3', suit: 'D', rank: 'K' },
    ];
    const stock: Card[] = [];

    const result = reshuffleStockIfNeeded(stock, discardPile);
    expect(result.reshuffled).toBe(true);
    expect(result.discardPile).toHaveLength(1);
    expect(result.discardPile[0].id).toBe('3'); // Top card preserved
    expect(result.stock).toHaveLength(2); // Remaining reshuffled
  });

  it('does not reshuffle if stock is not empty or discard has <= 1 card', () => {
    const stock: Card[] = [{ id: '1', suit: 'H', rank: '2' }];
    const discardPile: Card[] = [{ id: '2', suit: 'S', rank: '7' }];
    const result = reshuffleStockIfNeeded(stock, discardPile);
    expect(result.reshuffled).toBe(false);
    expect(result.stock).toHaveLength(1);

    const emptyStock: Card[] = [];
    const oneCardDiscard: Card[] = [{ id: '2', suit: 'S', rank: '7' }];
    const result2 = reshuffleStockIfNeeded(emptyStock, oneCardDiscard);
    expect(result2.reshuffled).toBe(false);
    expect(result2.stock).toHaveLength(0);
  });
});

