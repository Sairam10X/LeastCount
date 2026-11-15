import { describe, expect, it } from 'vitest';
import {
  chooseAutoDiscard,
  getNextTurnPlayerId,
  validateDiscard,
  validateDraw,
  validateQuickMatchDiscard,
  validateShow,
} from '../src/engine';
import { Card, DEFAULT_SETTINGS } from '../src/types';

describe('Rules Engine Validations', () => {
  const hand: Card[] = [
    { id: 'c1', suit: 'H', rank: '7' },
    { id: 'c2', suit: 'S', rank: '7' },
    { id: 'c3', suit: 'D', rank: '7' },
    { id: 'c4', suit: 'C', rank: 'K' },
    { id: 'c5', suit: 'H', rank: '2' },
  ];

  it('validates single card discard', () => {
    const res = validateDiscard(hand, ['c4']);
    expect(res.valid).toBe(true);
    expect(res.cards).toHaveLength(1);
    expect(res.cards?.[0].id).toBe('c4');
  });

  it('validates multi-card discard with same rank', () => {
    const res = validateDiscard(hand, ['c1', 'c2', 'c3']);
    expect(res.valid).toBe(true);
    expect(res.cards).toHaveLength(3);
  });

  it('rejects multi-card discard with mixed ranks', () => {
    const res = validateDiscard(hand, ['c1', 'c4']); // 7 and K
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/same rank/i);
  });

  it('rejects empty discard selection', () => {
    const res = validateDiscard(hand, []);
    expect(res.valid).toBe(false);
  });

  it('rejects card not in hand', () => {
    const res = validateDiscard(hand, ['fake-card-id']);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/not in your hand/i);
  });

  it('validates quick match discard when rank matches top discard', () => {
    const topDiscard: Card = { id: 'top', suit: 'D', rank: '7' };
    const res = validateQuickMatchDiscard(hand, ['c1', 'c2'], topDiscard);
    expect(res.valid).toBe(true);
  });

  it('rejects quick match discard when rank does not match top discard', () => {
    const topDiscard: Card = { id: 'top', suit: 'D', rank: '8' };
    const res = validateQuickMatchDiscard(hand, ['c1'], topDiscard);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error?.toLowerCase()).toContain('not match');
  });

  it('validates draw from stock when stock has cards', () => {
    const res = validateDraw('stock', undefined, 10, null);
    expect(res.valid).toBe(true);
  });

  it('rejects draw from stock when stock is empty', () => {
    const res = validateDraw('stock', undefined, 0, null);
    expect(res.valid).toBe(false);
  });

  it('validates draw from discard pile when a single card was discarded', () => {
    const lastDiscard: Card[] = [{ id: 'd1', suit: 'S', rank: 'Q' }];
    const res = validateDraw('discard', undefined, 10, lastDiscard);
    expect(res.valid).toBe(true);
    expect(res.chosenCard?.id).toBe('d1');
  });

  it('allows picking a specific card when a set of cards was discarded', () => {
    const lastDiscard: Card[] = [
      { id: 'd1', suit: 'S', rank: '9' },
      { id: 'd2', suit: 'H', rank: '9' },
    ];
    const res = validateDraw('discard', 'd2', 10, lastDiscard);
    expect(res.valid).toBe(true);
    expect(res.chosenCard?.id).toBe('d2');
  });

  it('rejects picking a card not in the discard set', () => {
    const lastDiscard: Card[] = [{ id: 'd1', suit: 'S', rank: '9' }];
    const res = validateDraw('discard', 'unrelated', 10, lastDiscard);
    expect(res.valid).toBe(false);
  });

  it('validates show only when hand total is <= showLimit in action phase', () => {
    const lowHand: Card[] = [
      { id: '1', suit: 'H', rank: '2' },
      { id: '2', suit: 'S', rank: '3' },
    ]; // total 5 <= default limit 10

    const validShow = validateShow(lowHand, DEFAULT_SETTINGS, 'action');
    expect(validShow.valid).toBe(true);

    const highHand: Card[] = [
      { id: '1', suit: 'H', rank: 'K' },
      { id: '2', suit: 'S', rank: '10' },
    ]; // total 20 > 10

    const invalidShowTotal = validateShow(highHand, DEFAULT_SETTINGS, 'action');
    expect(invalidShowTotal.valid).toBe(false);
    expect(invalidShowTotal.error).toMatch(/exceeds/i);

    const invalidShowPhase = validateShow(lowHand, DEFAULT_SETTINGS, 'draw');
    expect(invalidShowPhase.valid).toBe(false);
    expect(invalidShowPhase.error).toMatch(/start of your turn/i);

    // No limit option (showLimit = 0) allows any hand total to call show
    const noLimitSettings = { ...DEFAULT_SETTINGS, showLimit: 0 };
    const validNoLimitShow = validateShow(highHand, noLimitSettings, 'action');
    expect(validNoLimitShow.valid).toBe(true);
  });

  it('chooses the highest card for auto discard', () => {
    const testHand: Card[] = [
      { id: 'c1', suit: 'H', rank: '2' },
      { id: 'c2', suit: 'S', rank: 'K' }, // 10
      { id: 'c3', suit: 'D', rank: '5' },
    ];

    const autoCard = chooseAutoDiscard(testHand, DEFAULT_SETTINGS);
    expect(autoCard.id).toBe('c2');
  });

  it('rotates turns clockwise skipping eliminated players and spectators', () => {
    const players = [
      { id: 'p1', isEliminated: false, isSpectator: false },
      { id: 'p2', isEliminated: true, isSpectator: false },
      { id: 'p3', isEliminated: false, isSpectator: false },
      { id: 'p4', isEliminated: false, isSpectator: true },
    ];

    expect(getNextTurnPlayerId(players, 'p1')).toBe('p3');
    expect(getNextTurnPlayerId(players, 'p3')).toBe('p1');
  });
});
