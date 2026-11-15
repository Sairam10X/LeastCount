import {
  Card,
  CardScoringDetail,
  GameSettings,
  PlayerRoundResult,
  Rank,
  RoundResult,
} from './types';

export function getCardValue(card: Card, settings: GameSettings): number {
  if (card.isJoker || card.suit === 'JOKER' || card.rank === 'JOKER') {
    return 0;
  }

  const rank = card.rank;
  if (rank === 'A') {
    return settings.aceValue;
  }

  if (rank === 'K') {
    return settings.faceCardValue === 'actual' ? 13 : 10;
  }
  if (rank === 'Q') {
    return settings.faceCardValue === 'actual' ? 12 : 10;
  }
  if (rank === 'J') {
    return settings.faceCardValue === 'actual' ? 11 : 10;
  }

  const num = parseInt(rank, 10);
  if (!isNaN(num)) {
    return num;
  }

  return 0;
}

export function calculateHandDetails(
  hand: Card[],
  settings: GameSettings
): { details: CardScoringDetail[]; total: number } {
  let total = 0;
  const details: CardScoringDetail[] = hand.map((card) => {
    const value = getCardValue(card, settings);
    total += value;
    return { card, value };
  });

  return { details, total };
}

export function calculateHandTotal(hand: Card[], settings: GameSettings): number {
  return hand.reduce((sum, card) => sum + getCardValue(card, settings), 0);
}

export interface PlayerForScoring {
  id: string;
  name: string;
  hand: Card[];
  currentScore: number;
  isEliminated: boolean;
}

/**
 * Resolves the round after a "Show" call.
 * Rules:
 * - If caller has strictly lowest total:
 *     caller adds 0
 *     everyone else adds their hand total
 * - If any other player has a total <= caller:
 *     caller is penalized with wrongShowPenalty (fixed penalty points only, irrespective of hand sum)
 *     the lowest player scores 0 (if tie for lowest among non-callers, both/all get 0)
 *     others add their hand total
 */
export function resolveShow(
  callerId: string,
  players: PlayerForScoring[],
  settings: GameSettings,
  roundNumber: number
): RoundResult {
  const activePlayers = players.filter((p) => !p.isEliminated);

  // Compute hand totals for all active players
  const playerHandDetails = activePlayers.map((player) => {
    const { details, total } = calculateHandDetails(player.hand, settings);
    return {
      player,
      details,
      total,
      isCaller: player.id === callerId,
    };
  });

  const callerDetail = playerHandDetails.find((d) => d.isCaller);
  if (!callerDetail) {
    throw new Error(`Caller with id ${callerId} not found in active players`);
  }

  const callerTotal = callerDetail.total;

  // Check if caller is strictly lowest
  const others = playerHandDetails.filter((d) => !d.isCaller);
  const othersLowestTotal = others.length > 0
    ? Math.min(...others.map((d) => d.total))
    : callerTotal;

  const isSuccessfulShow = others.length === 0 || callerTotal < othersLowestTotal;

  const lowestTotalOverall = Math.min(...playerHandDetails.map((d) => d.total));

  const playerResults: PlayerRoundResult[] = [];
  const newlyEliminatedPlayerIds: string[] = [];

  for (const item of playerHandDetails) {
    let penaltyAdded = 0;
    let roundScore = 0;
    let isWinner = false;

    if (isSuccessfulShow) {
      if (item.isCaller) {
        roundScore = 0;
        penaltyAdded = 0;
        isWinner = true;
      } else {
        roundScore = item.total;
        penaltyAdded = 0;
      }
    } else {
      // Wrong show! Adds only the penalty points irrespective of sum in hand
      if (item.isCaller) {
        penaltyAdded = settings.wrongShowPenalty;
        roundScore = settings.wrongShowPenalty;
        isWinner = false;
      } else if (item.total === lowestTotalOverall) {
        // Lowest non-caller scores 0
        roundScore = 0;
        penaltyAdded = 0;
        isWinner = true;
      } else {
        // Other non-callers add hand total
        roundScore = item.total;
        penaltyAdded = 0;
      }
    }

    const totalScore = item.player.currentScore + roundScore;
    const isEliminated =
      !settings.singleRoundMode &&
      settings.gameTargetScore > 0 &&
      totalScore >= settings.gameTargetScore;

    if (isEliminated) {
      newlyEliminatedPlayerIds.push(item.player.id);
    }

    playerResults.push({
      playerId: item.player.id,
      playerName: item.player.name,
      hand: item.player.hand,
      cardValues: item.details,
      handTotal: item.total,
      penaltyAdded,
      roundScore,
      totalScore,
      isCaller: item.isCaller,
      isWinner,
      isEliminated,
    });
  }

  // Determine game winner if single round mode or if all but 1 are eliminated
  let gameWinnerId: string | null = null;
  if (settings.singleRoundMode) {
    const winner = playerResults.find((p) => p.isWinner) || playerResults[0];
    gameWinnerId = winner ? winner.playerId : null;
  } else {
    // Check remaining non-eliminated players among ALL players
    const allRemaining = players.filter(
      (p) => !p.isEliminated && !newlyEliminatedPlayerIds.includes(p.id)
    );
    if (allRemaining.length === 1) {
      gameWinnerId = allRemaining[0].id;
    } else if (allRemaining.length === 0) {
      // Tie-breaker: lowest total score
      const sorted = [...playerResults].sort((a, b) => a.totalScore - b.totalScore);
      gameWinnerId = sorted[0]?.playerId ?? null;
    }
  }

  return {
    roundNumber,
    callerId,
    isSuccessfulShow,
    lowestTotal: lowestTotalOverall,
    playerResults,
    eliminatedPlayerIds: newlyEliminatedPlayerIds,
    gameWinnerId,
  };
}

