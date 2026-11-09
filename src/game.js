import { instantiateDeck } from './cards.js';
import { scoreHand, scoreTotal } from './scoring.js';

export const DISCARD_LIMIT = 10;
export const HAND_SIZE = 7;

const AI_NAMES = [
  'Irmã Ferrugem',
  'O Coletor',
  'Viúva do Sal',
  'Nômade Cego',
  'Padre Cartucho',
  'A Sucateira',
  'Cão de Arquivo',
  'Mãe-Cisterna',
];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame() {
  const deck = shuffle(instantiateDeck());
  const player = deck.splice(0, HAND_SIZE);
  const ai = deck.splice(0, HAND_SIZE);
  return {
    deck,
    player,
    ai,
    discard: [],
    whose: 'player',
    phase: 'draw',
    mustDrawDeck: true,
    log: ['As cartas foram lançadas sobre o asfalto.'],
    aiName: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    winner: null,
    lastDrawnUid: null,
    lastDiscarded: null,
    turn: 1,
    startedAt: Date.now(),
  };
}

export function isOver(state) {
  return state.phase === 'end' || state.discard.length >= DISCARD_LIMIT;
}

export function playerScore(state) {
  return scoreHand(state.player);
}

export function aiScore(state) {
  return scoreHand(state.ai);
}

export function drawFromDeck(state) {
  if (state.phase !== 'draw' || state.whose !== 'player') return state;
  if (!state.deck.length) return state;
  const [card, ...rest] = state.deck;
  return {
    ...state,
    deck: rest,
    player: [...state.player, card],
    phase: 'discard',
    mustDrawDeck: false,
    lastDrawnUid: card.uid,
    log: [...state.log, 'Você puxou uma carta do baralho.'],
  };
}

export function drawFromDiscard(state, uid) {
  if (state.phase !== 'draw' || state.whose !== 'player') return state;
  if (state.mustDrawDeck) return state;
  const idx = state.discard.findIndex((c) => c.uid === uid);
  if (idx < 0) return state;
  const card = state.discard[idx];
  const discard = state.discard.filter((_, i) => i !== idx);
  return {
    ...state,
    discard,
    player: [...state.player, card],
    phase: 'discard',
    lastDrawnUid: card.uid,
    log: [...state.log, `Você tomou ${card.name} do descarte.`],
  };
}

function maybeEnd(state, afterWhose) {
  if (state.discard.length >= DISCARD_LIMIT || (state.deck.length === 0 && state.discard.length === 0)) {
    const p = scoreTotal(state.player);
    const a = scoreTotal(state.ai);
    let winner = 'empate';
    if (p > a) winner = 'player';
    else if (a > p) winner = 'ai';
    return {
      ...state,
      phase: 'end',
      whose: null,
      winner,
      log: [...state.log, 'A décima carta caiu. O reino se fecha.'],
    };
  }
  if (afterWhose === 'player') {
    return { ...state, whose: 'ai', phase: 'ai', lastDrawnUid: null };
  }
  return {
    ...state,
    whose: 'player',
    phase: 'draw',
    lastDrawnUid: null,
    turn: state.turn + 1,
  };
}

export function discardFromHand(state, uid) {
  if (state.phase !== 'discard' || state.whose !== 'player') return state;
  const idx = state.player.findIndex((c) => c.uid === uid);
  if (idx < 0) return state;
  const card = state.player[idx];
  const player = state.player.filter((_, i) => i !== idx);
  const next = {
    ...state,
    player,
    discard: [...state.discard, card],
    lastDiscarded: card,
    log: [...state.log, `Você descartou ${card.name}.`],
  };
  return maybeEnd(next, 'player');
}

export function applyAiTurn(state, { take, discardUid }) {
  if (state.whose !== 'ai' || state.phase !== 'ai') return state;
  let deck = state.deck;
  let discard = state.discard.slice();
  let ai = state.ai.slice();
  let drawn;
  let logLine;

  if (take === 'deck') {
    if (!deck.length) return state;
    drawn = deck[0];
    deck = deck.slice(1);
    ai = [...ai, drawn];
    logLine = `${state.aiName} puxou do baralho.`;
  } else {
    const idx = discard.findIndex((c) => c.uid === take);
    if (idx < 0) return state;
    drawn = discard[idx];
    discard.splice(idx, 1);
    ai = [...ai, drawn];
    logLine = `${state.aiName} tomou ${drawn.name} do descarte.`;
  }

  const dIdx = ai.findIndex((c) => c.uid === discardUid);
  if (dIdx < 0) return state;
  const dumped = ai[dIdx];
  ai = ai.filter((_, i) => i !== dIdx);
  discard = [...discard, dumped];

  const next = {
    ...state,
    deck,
    ai,
    discard,
    lastDiscarded: dumped,
    lastDrawnUid: null,
    log: [...state.log, logLine, `${state.aiName} descartou ${dumped.name}.`],
  };
  return maybeEnd(next, 'ai');
}

export function saveHighScore(points) {
  try {
    const key = 'cdc-highscore';
    const prev = Number(localStorage.getItem(key) || 0);
    if (points > prev) localStorage.setItem(key, String(points));
    const histKey = 'cdc-history';
    const hist = JSON.parse(localStorage.getItem(histKey) || '[]');
    hist.unshift({ points, at: Date.now() });
    localStorage.setItem(histKey, JSON.stringify(hist.slice(0, 20)));
    return Math.max(prev, points);
  } catch {
    return points;
  }
}

export function getHighScore() {
  try {
    return Number(localStorage.getItem('cdc-highscore') || 0);
  } catch {
    return 0;
  }
}
