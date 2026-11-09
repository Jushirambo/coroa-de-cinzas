import { CARDS } from './cards.js';

function cloneCard(card) {
  return {
    ...card,
    bonus: card.bonus ? card.bonus.map((b) => ({ ...b })) : undefined,
    penalty: card.penalty ? card.penalty.map((p) => ({ ...p })) : undefined,
    blanks: card.blanks ? card.blanks.map((b) => ({ ...b })) : undefined,
    clears: card.clears ? card.clears.map((c) => ({ ...c })) : undefined,
    wild: card.wild ? { ...card.wild } : undefined,
  };
}

function hasSuit(active, suit, exceptUid) {
  return active.some((c) => c.suit === suit && c.uid !== exceptUid);
}

function hasId(active, id, exceptUid) {
  return active.some((c) => c.id === id && c.uid !== exceptUid);
}

function countSuit(active, suit, exceptUid, other) {
  return active.filter((c) => c.suit === suit && (!other || c.uid !== exceptUid)).length;
}

function computeBonus(rule, card, active) {
  switch (rule.type) {
    case 'withSuit':
      return hasSuit(active, rule.suit, card.uid) ? rule.value : 0;
    case 'withAnySuit':
      return rule.suits.some((s) => hasSuit(active, s, card.uid)) ? rule.value : 0;
    case 'withId':
      return hasId(active, rule.id, card.uid) ? rule.value : 0;
    case 'perSuit': {
      const n = countSuit(active, rule.suit, card.uid, Boolean(rule.other));
      return n * rule.value;
    }
    case 'perDistinctSuit': {
      const suits = new Set(active.map((c) => c.suit));
      return suits.size * rule.value;
    }
    case 'tiered': {
      for (const tier of rule.tiers) {
        const suitsOk = (tier.requireSuits || []).every((s) => hasSuit(active, s, card.uid));
        const idsOk = (tier.requireIds || []).every((id) => hasId(active, id, card.uid));
        if (suitsOk && idsOk) return tier.value;
      }
      return 0;
    }
    default:
      return 0;
  }
}

function computePenalty(rule, card, active) {
  switch (rule.type) {
    case 'perSuit': {
      const n = countSuit(active, rule.suit, card.uid, Boolean(rule.other));
      return n * rule.value;
    }
    case 'unlessSuit':
      return rule.suits.some((s) => hasSuit(active, s, card.uid)) ? 0 : rule.value;
    default:
      return 0;
  }
}

function matchesBlank(rule, target) {
  if (target.unblankable) return false;
  if (rule.suit && target.suit !== rule.suit) return false;
  if (rule.exceptIds && rule.exceptIds.includes(target.id)) return false;
  return true;
}

function computeBlanked(resolved) {
  const blanked = new Set();
  for (const source of resolved) {
    if (!source.blanks) continue;
    for (const rule of source.blanks) {
      for (const target of resolved) {
        if (target.uid === source.uid) continue;
        if (matchesBlank(rule, target)) blanked.add(target.uid);
      }
    }
  }
  return blanked;
}

export function evaluate(resolved) {
  const blanked = computeBlanked(resolved);
  const active = resolved.filter((c) => !blanked.has(c.uid));

  const clearAll = new Set();
  const clearPerSuit = new Set();
  for (const c of active) {
    for (const cl of c.clears || []) {
      if (cl.type === 'all') clearAll.add(cl.suit);
      if (cl.type === 'perSuitWord') clearPerSuit.add(cl.suit);
    }
  }

  const lines = resolved.map((card) => {
    if (blanked.has(card.uid)) {
      return {
        uid: card.uid,
        id: card.id,
        name: card.name,
        suit: card.suit,
        printedName: card.printedName || card.name,
        blanked: true,
        base: 0,
        bonus: 0,
        penalty: 0,
        total: 0,
        note: 'Anulada',
      };
    }

    let bonus = 0;
    for (const b of card.bonus || []) bonus += computeBonus(b, card, active);

    let penalty = 0;
    if (!clearAll.has(card.suit)) {
      for (const p of card.penalty || []) {
        if (p.type === 'perSuit' && clearPerSuit.has(p.suit)) continue;
        penalty += computePenalty(p, card, active);
      }
    }

    return {
      uid: card.uid,
      id: card.id,
      name: card.name,
      suit: card.suit,
      printedName: card.printedName || card.name,
      blanked: false,
      base: card.base,
      bonus,
      penalty,
      total: card.base + bonus + penalty,
    };
  });

  return {
    total: lines.reduce((sum, line) => sum + line.total, 0),
    lines,
    blanked,
  };
}

function applyCopyOutside(wild, target) {
  const next = cloneCard(wild);
  next.printedName = wild.name;
  next.id = target.id;
  next.name = target.name;
  next.suit = target.suit;
  next.actingAs = target.id;
  next.bonus = undefined;
  next.penalty = undefined;
  next.blanks = undefined;
  next.clears = undefined;
  next.unblankable = false;
  next.wild = undefined;
  return next;
}

function applyCopyInside(wild, target) {
  const next = cloneCard(wild);
  next.printedName = wild.name;
  next.id = target.id;
  next.name = target.name;
  next.suit = target.suit;
  next.base = target.base;
  next.actingAs = target.id;
  next.bonus = undefined;
  next.penalty = undefined;
  next.blanks = undefined;
  next.clears = undefined;
  next.unblankable = false;
  next.wild = undefined;
  return next;
}

function outsideCandidates(wild, catalog, takenIds) {
  return catalog.filter(
    (c) =>
      !c.wild &&
      wild.wild.suits.includes(c.suit) &&
      !takenIds.has(c.id),
  );
}

/**
 * Brute-force the best wild assignments, then score.
 * Order: Camaleão (inside) → Impostor → Miragem.
 */
export function scoreHand(hand, catalog = CARDS) {
  const cards = hand.map(cloneCard);
  const camaleao = cards.find((c) => c.wild?.kind === 'copyInside');
  const impostor = cards.find((c) => c.id === 'impostor');
  const miragem = cards.find((c) => c.id === 'miragem');
  const mundane = cards.filter((c) => !c.wild);

  const insideOptions = camaleao ? mundane : [null];
  if (camaleao && insideOptions.length === 0) {
    const result = evaluate(cards);
    return { ...result, assigned: {}, resolved: cards };
  }

  let best = null;

  for (const inside of insideOptions) {
    const afterCam = cards.map((c) => {
      if (camaleao && c.uid === camaleao.uid) return applyCopyInside(c, inside);
      return cloneCard(c);
    });

    const takenAfterCam = new Set(afterCam.filter((c) => c.uid !== impostor?.uid && c.uid !== miragem?.uid).map((c) => c.id));

    const impOptions = impostor
      ? outsideCandidates(impostor, catalog, takenAfterCam)
      : [null];
    if (impostor && impOptions.length === 0) continue;

    for (const impTarget of impOptions) {
      const afterImp = afterCam.map((c) => {
        if (impostor && c.uid === impostor.uid) return applyCopyOutside(c, impTarget);
        return cloneCard(c);
      });

      const takenAfterImp = new Set(
        afterImp.filter((c) => c.uid !== miragem?.uid).map((c) => c.id),
      );

      const mirOptions = miragem
        ? outsideCandidates(miragem, catalog, takenAfterImp)
        : [null];
      if (miragem && mirOptions.length === 0) continue;

      for (const mirTarget of mirOptions) {
        const resolved = afterImp.map((c) => {
          if (miragem && c.uid === miragem.uid) return applyCopyOutside(c, mirTarget);
          return cloneCard(c);
        });
        const result = evaluate(resolved);
        if (!best || result.total > best.total) {
          const assigned = {};
          if (camaleao && inside) {
            assigned[camaleao.uid] = { as: inside.id, name: inside.name, mode: 'inside' };
          }
          if (impostor && impTarget) {
            assigned[impostor.uid] = { as: impTarget.id, name: impTarget.name, mode: 'outside' };
          }
          if (miragem && mirTarget) {
            assigned[miragem.uid] = { as: mirTarget.id, name: mirTarget.name, mode: 'outside' };
          }
          best = { ...result, assigned, resolved };
        }
      }
    }
  }

  if (!best) {
    const result = evaluate(cards);
    return { ...result, assigned: {}, resolved: cards };
  }
  return best;
}

export function scoreTotal(hand, catalog = CARDS) {
  return scoreHand(hand, catalog).total;
}
