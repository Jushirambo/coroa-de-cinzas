import { CARDS } from './cards.js';
import { scoreTotal } from './scoring.js';

function bestDiscard(hand) {
  let bestUid = hand[0]?.uid;
  let bestScore = -Infinity;
  for (const card of hand) {
    const kept = hand.filter((c) => c.uid !== card.uid);
    const s = scoreTotal(kept);
    if (s > bestScore) {
      bestScore = s;
      bestUid = card.uid;
    }
  }
  return { uid: bestUid, score: bestScore };
}

function evaluateTake(hand, card) {
  return bestDiscard([...hand, card]);
}

/**
 * Greedy AI: pick the draw (deck EV or a face-up discard) that yields
 * the best resulting 7-card score, then discard the weakest leftover.
 */
export function chooseAiMove(state) {
  const { ai, discard, deck } = state;
  if (!ai.length) return { take: 'deck', discardUid: null, score: 0 };
  let best = { take: 'deck', discardUid: ai[0]?.uid, score: -Infinity, expected: true };

  for (const card of discard) {
    const result = evaluateTake(ai, card);
    if (result.score > best.score) {
      best = { take: card.uid, discardUid: result.uid, score: result.score, expected: false };
    }
  }

  if (deck.length) {
    let sum = 0;
    for (const card of deck) {
      sum += evaluateTake(ai, card).score;
    }
    const expected = sum / deck.length;
    // Prefer a known discard if it beats the expected deck by a hair;
    // otherwise draw blind — information and denial still matter a little.
    if (expected > best.score + 2 || discard.length === 0) {
      // Choose the actual discard assuming we drew the "average";
      // at runtime we will draw the real top card, then discard optimally.
      best = { take: 'deck', discardUid: null, score: expected, expected: true };
    }
  }

  if (best.take === 'deck') {
    if (!deck.length) {
      const card = discard[0];
      if (!card) return { take: 'deck', discardUid: ai[0]?.uid, score: 0 };
      const result = evaluateTake(ai, card);
      return { take: card.uid, discardUid: result.uid, score: result.score };
    }
    const drawn = deck[0];
    const result = evaluateTake(ai, drawn);
    return { take: 'deck', discardUid: result.uid, score: result.score };
  }

  return best;
}

export function chooseHint(state) {
  if (state.phase === 'draw' && state.whose === 'player') {
    const { player, discard, deck } = state;
    if (state.mustDrawDeck) return { kind: 'draw', take: 'deck' };

    let best = { kind: 'draw', take: 'deck', score: -Infinity };
    if (deck.length) {
      let sum = 0;
      for (const card of deck) sum += evaluateTake(player, card).score;
      best = { kind: 'draw', take: 'deck', score: sum / deck.length };
    }
    for (const card of discard) {
      const result = evaluateTake(player, card);
      if (result.score > best.score) {
        best = { kind: 'draw', take: card.uid, score: result.score };
      }
    }
    return best;
  }

  if (state.phase === 'discard' && state.whose === 'player') {
    const result = bestDiscard(state.player);
    return { kind: 'discard', uid: result.uid, score: result.score };
  }

  return null;
}

export function remainingBySuit(state) {
  const seen = new Set([
    ...state.player.map((c) => c.id),
    ...state.ai.map((c) => c.id),
    ...state.discard.map((c) => c.id),
  ]);
  const left = CARDS.filter((c) => !seen.has(c.id));
  const bySuit = {};
  for (const c of left) {
    bySuit[c.suit] = (bySuit[c.suit] || 0) + 1;
  }
  return { left, bySuit, deckCount: state.deck.length };
}
