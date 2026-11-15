import { describe, expect, it } from 'vitest';
import { calculateHandTotal, getCardValue } from '../src/scoring';
import { Card, DEFAULT_SETTINGS, GameSettings } from '../src/types';

describe('Card Scoring Values', () => {
  it('calculates number cards correctly', () => {
    const card2: Card = { id: 'c2', suit: 'H', rank: '2' };
    const card9: Card = { id: 'c9', suit: 'S', rank: '9' };
    const card10: Card = { id: 'c10', suit: 'D', rank: '10' };

    expect(getCardValue(card2, DEFAULT_SETTINGS)).toBe(2);
    expect(getCardValue(card9, DEFAULT_SETTINGS)).toBe(9);
    expect(getCardValue(card10, DEFAULT_SETTINGS)).toBe(10);
  });

  it('respects aceValue setting: 1 vs 14', () => {
    const ace: Card = { id: 'a1', suit: 'S', rank: 'A' };

    const settingsAce1: GameSettings = { ...DEFAULT_SETTINGS, aceValue: 1 };
    expect(getCardValue(ace, settingsAce1)).toBe(1);

    const settingsAce14: GameSettings = { ...DEFAULT_SETTINGS, aceValue: 14 };
    expect(getCardValue(ace, settingsAce14)).toBe(14);
  });

  it('respects faceCardValue setting: ten vs actual', () => {
    const jack: Card = { id: 'j', suit: 'C', rank: 'J' };
    const queen: Card = { id: 'q', suit: 'D', rank: 'Q' };
    const king: Card = { id: 'k', suit: 'H', rank: 'K' };

    const settingsTen: GameSettings = { ...DEFAULT_SETTINGS, faceCardValue: 'ten' };
    expect(getCardValue(jack, settingsTen)).toBe(10);
    expect(getCardValue(queen, settingsTen)).toBe(10);
    expect(getCardValue(king, settingsTen)).toBe(10);

    const settingsActual: GameSettings = {
      ...DEFAULT_SETTINGS,
      faceCardValue: 'actual',
    };
    expect(getCardValue(jack, settingsActual)).toBe(11);
    expect(getCardValue(queen, settingsActual)).toBe(12);
    expect(getCardValue(king, settingsActual)).toBe(13);
  });

  it('gives Joker a value of 0', () => {
    const joker: Card = { id: 'j1', suit: 'JOKER', rank: 'JOKER', isJoker: true };
    expect(getCardValue(joker, DEFAULT_SETTINGS)).toBe(0);
  });

  it('evaluates external cut joker cards as 0 points across all suits', () => {
    const cutJoker: Card = { id: 'cut-1', suit: 'H', rank: '6' };
    const settingsWithExternal: GameSettings = { ...DEFAULT_SETTINGS, externalJokers: true };

    const sixSpades: Card = { id: 's6', suit: 'S', rank: '6' };
    const sixDiamonds: Card = { id: 'd6', suit: 'D', rank: '6' };
    const sixClubs: Card = { id: 'c6', suit: 'C', rank: '6' };
    const eightHearts: Card = { id: 'h8', suit: 'H', rank: '8' };

    // When external jokers are enabled and cut card is 6, all 6s must be 0 points
    expect(getCardValue(sixSpades, settingsWithExternal, cutJoker)).toBe(0);
    expect(getCardValue(sixDiamonds, settingsWithExternal, cutJoker)).toBe(0);
    expect(getCardValue(sixClubs, settingsWithExternal, cutJoker)).toBe(0);
    // Non-matching ranks retain regular values
    expect(getCardValue(eightHearts, settingsWithExternal, cutJoker)).toBe(8);

    // In a hand with 6s and an 8: 0 + 0 + 8 = 8
    const hand: Card[] = [sixSpades, sixDiamonds, eightHearts];
    expect(calculateHandTotal(hand, settingsWithExternal, cutJoker)).toBe(8);
  });

  it('calculates hand total correctly', () => {
    const hand: Card[] = [
      { id: '1', suit: 'H', rank: '2' },
      { id: '2', suit: 'S', rank: 'A' },
      { id: '3', suit: 'D', rank: 'K' },
      { id: '4', suit: 'JOKER', rank: 'JOKER', isJoker: true },
    ];

    // 2 + 1 + 10 + 0 = 13
    expect(calculateHandTotal(hand, DEFAULT_SETTINGS)).toBe(13);

    // With ace=14 and faceCardValue=actual (K=13): 2 + 14 + 13 + 0 = 29
    const customSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      aceValue: 14,
      faceCardValue: 'actual',
    };
    expect(calculateHandTotal(hand, customSettings)).toBe(29);
  });
});

