import { describe, expect, it } from 'vitest';
import { PlayerForScoring, resolveShow } from '../src/scoring';
import { Card, DEFAULT_SETTINGS, GameSettings } from '../src/types';

describe('Show Resolution & Scoring Penalties', () => {
  it('resolves a successful show when caller has strictly lowest total', () => {
    const players: PlayerForScoring[] = [
      {
        id: 'p1',
        name: 'Alice',
        hand: [
          { id: '1', suit: 'H', rank: 'A' }, // 1
          { id: '2', suit: 'D', rank: '2' }, // 2 -> total 3
        ],
        currentScore: 10,
        isEliminated: false,
      },
      {
        id: 'p2',
        name: 'Bob',
        hand: [
          { id: '3', suit: 'H', rank: '5' },
          { id: '4', suit: 'D', rank: '7' }, // total 12
        ],
        currentScore: 20,
        isEliminated: false,
      },
      {
        id: 'p3',
        name: 'Charlie',
        hand: [
          { id: '5', suit: 'S', rank: 'K' }, // 10
        ],
        currentScore: 0,
        isEliminated: false,
      },
    ];

    const result = resolveShow('p1', players, DEFAULT_SETTINGS, 1);

    expect(result.isSuccessfulShow).toBe(true);
    expect(result.lowestTotal).toBe(3);

    // Caller (Alice) gets 0 added
    const aliceRes = result.playerResults.find((p) => p.playerId === 'p1');
    expect(aliceRes?.roundScore).toBe(0);
    expect(aliceRes?.penaltyAdded).toBe(0);
    expect(aliceRes?.totalScore).toBe(10);
    expect(aliceRes?.isWinner).toBe(true);

    // Bob gets 12 added
    const bobRes = result.playerResults.find((p) => p.playerId === 'p2');
    expect(bobRes?.roundScore).toBe(12);
    expect(bobRes?.totalScore).toBe(32);

    // Charlie gets 10 added
    const charlieRes = result.playerResults.find((p) => p.playerId === 'p3');
    expect(charlieRes?.roundScore).toBe(10);
    expect(charlieRes?.totalScore).toBe(10);
  });

  it('penalizes caller on wrong show when an opponent has equal or lower total', () => {
    const players: PlayerForScoring[] = [
      {
        id: 'p1',
        name: 'Alice',
        hand: [
          { id: '1', suit: 'H', rank: '4' },
          { id: '2', suit: 'D', rank: '4' }, // total 8
        ],
        currentScore: 0,
        isEliminated: false,
      },
      {
        id: 'p2',
        name: 'Bob',
        hand: [
          { id: '3', suit: 'S', rank: '2' },
          { id: '4', suit: 'C', rank: '3' }, // total 5 (lower than Alice!)
        ],
        currentScore: 10,
        isEliminated: false,
      },
      {
        id: 'p3',
        name: 'Charlie',
        hand: [
          { id: '5', suit: 'D', rank: '9' }, // total 9
        ],
        currentScore: 15,
        isEliminated: false,
      },
    ];

    const result = resolveShow('p1', players, DEFAULT_SETTINGS, 1);

    expect(result.isSuccessfulShow).toBe(false);

    // Alice is penalized: hand total (8) + penalty (40) = 48
    const aliceRes = result.playerResults.find((p) => p.playerId === 'p1');
    expect(aliceRes?.penaltyAdded).toBe(40);
    expect(aliceRes?.roundScore).toBe(48);
    expect(aliceRes?.totalScore).toBe(48);
    expect(aliceRes?.isWinner).toBe(false);

    // Bob (lowest opponent) scores 0
    const bobRes = result.playerResults.find((p) => p.playerId === 'p2');
    expect(bobRes?.roundScore).toBe(0);
    expect(bobRes?.totalScore).toBe(10);
    expect(bobRes?.isWinner).toBe(true);

    // Charlie scores his hand total (9)
    const charlieRes = result.playerResults.find((p) => p.playerId === 'p3');
    expect(charlieRes?.roundScore).toBe(9);
    expect(charlieRes?.totalScore).toBe(24);
  });

  it('penalizes caller on tie (equal score with opponent)', () => {
    const players: PlayerForScoring[] = [
      {
        id: 'p1',
        name: 'Alice',
        hand: [{ id: '1', suit: 'H', rank: '5' }], // total 5
        currentScore: 0,
        isEliminated: false,
      },
      {
        id: 'p2',
        name: 'Bob',
        hand: [{ id: '2', suit: 'S', rank: '5' }], // total 5 (tied with Alice)
        currentScore: 0,
        isEliminated: false,
      },
    ];

    const result = resolveShow('p1', players, DEFAULT_SETTINGS, 1);
    expect(result.isSuccessfulShow).toBe(false);

    const aliceRes = result.playerResults.find((p) => p.playerId === 'p1');
    expect(aliceRes?.roundScore).toBe(45); // 5 + 40

    const bobRes = result.playerResults.find((p) => p.playerId === 'p2');
    expect(bobRes?.roundScore).toBe(0); // Bob is lowest
    expect(bobRes?.isWinner).toBe(true);
  });

  it('handles player elimination when targetScore is reached and crowns last standing player', () => {
    const customSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      gameTargetScore: 50,
    };

    const players: PlayerForScoring[] = [
      {
        id: 'p1',
        name: 'Alice',
        hand: [{ id: '1', suit: 'H', rank: '6' }],
        currentScore: 20,
        isEliminated: false,
      },
      {
        id: 'p2',
        name: 'Bob',
        hand: [{ id: '2', suit: 'D', rank: '9' }],
        currentScore: 45, // 45 + 9 = 54 >= 50 -> ELIMINATED!
        isEliminated: false,
      },
    ];

    const result = resolveShow('p1', players, customSettings, 2);

    expect(result.eliminatedPlayerIds).toContain('p2');
    expect(result.gameWinnerId).toBe('p1'); // Alice is the last player standing!
  });

  it('resolves single round mode immediately', () => {
    const singleRoundSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      singleRoundMode: true,
    };

    const players: PlayerForScoring[] = [
      {
        id: 'p1',
        name: 'Alice',
        hand: [{ id: '1', suit: 'H', rank: '2' }],
        currentScore: 0,
        isEliminated: false,
      },
      {
        id: 'p2',
        name: 'Bob',
        hand: [{ id: '2', suit: 'D', rank: '8' }],
        currentScore: 0,
        isEliminated: false,
      },
    ];

    const result = resolveShow('p1', players, singleRoundSettings, 1);
    expect(result.gameWinnerId).toBe('p1');
  });
});

