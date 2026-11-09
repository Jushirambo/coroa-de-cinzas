import { SUITS } from './cards.js';

export const SUIT_ICON = {
  senhor: `<path d="M12 3l2.2 5.2H20l-4.4 3.3 1.7 5.5L12 13.8 6.7 17l1.7-5.5L4 8.2h5.8L12 3z"/>`,
  horda: `<path d="M12 3c2 3 3 5 3 7a3 3 0 11-6 0c0-2 1-4 3-7zm-5 9.5c.5 4 2.4 7.5 5 8.5 2.6-1 4.5-4.5 5-8.5-1.8 1.2-3.4 1.8-5 1.8s-3.2-.6-5-1.8z"/>`,
  xama: `<path d="M12 2.2l1.1 3.2 3.4 1.1-3.4 1.1L12 10.8l-1.1-3.2-3.4-1.1 3.4-1.1L12 2.2zM12 13.2a4.6 4.6 0 100 9.2 4.6 4.6 0 000-9.2zm0 2.4a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4z"/>`,
  arsenal: `<path d="M4 12h10l7-3v6l-7-3H4zm1 2l2 7h2l1-7zm10 0l1 7h2l2-7z"/>`,
  reliquia: `<path d="M12 2l3 6 7 1-5 5 1.2 7L12 17l-6.2 4 1.2-7-5-5 7-1 3-6z"/>`,
  mutante: `<path d="M7 4c3 2 5 2 5 2s2 0 5-2c0 4-2 6-2 6l3 3-3 1c0 3-1.5 6-3 8-1.5-2-3-5-3-8l-3-1 3-3s-2-2-2-6z"/>`,
  territorio: `<path d="M3 18l5-9 3 4 4-7 6 12H3zm3-1h12"/>`,
  tempestade: `<path d="M11 2l-2 7h4L9 22l8-11h-5l5-9H11z"/>`,
  mare: `<path d="M3 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0v4c-2 2-4 2-6 0s-4-2-6 0-4 2-6 0v-4zm0-6c2 2 4 2 6 0s4-2 6 0 4 2 6 0v3c-2 2-4 2-6 0s-4-2-6 0-4 2-6 0V8z"/>`,
  incendio: `<path d="M12 2s5 6 5 11a5 5 0 11-10 0c0-2 1.5-5 3-7-1 3 1 4 1 4s-1-5 1-8z"/>`,
  coringa: `<path d="M8 6h8l2 4-6 2-6-2 2-4zm4 7l6 2v5l-6 2-6-2v-5l6-2z"/>`,
};

export function suitSvg(suit, size = 24) {
  const meta = SUITS[suit];
  const path = SUIT_ICON[suit] || SUIT_ICON.coringa;
  return `<svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${meta.color}" aria-hidden="true">${path}</svg>`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function sigilSvg(card) {
  const h = hash(card.id);
  const color = SUITS[card.suit].color;
  const ink = SUITS[card.suit].ink;
  const shapes = [];
  const rings = 2 + (h % 3);
  for (let i = 0; i < rings; i++) {
    const r = 34 - i * 8;
    shapes.push(
      `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${i ? ink : color}" stroke-width="${i === 0 ? 2.4 : 1}" opacity="${0.85 - i * 0.18}"/>`,
    );
  }
  const spokes = 4 + (h % 5);
  const rot = h % 360;
  for (let i = 0; i < spokes; i++) {
    const a = rot + (360 / spokes) * i;
    shapes.push(
      `<line x1="50" y1="50" x2="${50 + Math.cos((a * Math.PI) / 180) * 32}" y2="${50 + Math.sin((a * Math.PI) / 180) * 32}" stroke="${color}" stroke-width="1.2" opacity="0.55"/>`,
    );
  }
  const inner = (h >> 3) % 4;
  if (inner === 0) {
    shapes.push(`<polygon points="50,28 66,50 50,72 34,50" fill="${color}" opacity="0.8"/>`);
  } else if (inner === 1) {
    shapes.push(`<rect x="36" y="36" width="28" height="28" rx="3" fill="none" stroke="${ink}" stroke-width="2" transform="rotate(${h % 20} 50 50)"/>`);
  } else if (inner === 2) {
    shapes.push(`<circle cx="50" cy="50" r="10" fill="${color}"/>`);
    shapes.push(`<circle cx="50" cy="50" r="4" fill="#0b0907"/>`);
  } else {
    shapes.push(`<path d="M50 30 L58 50 L50 70 L42 50 Z" fill="${ink}" opacity="0.9"/>`);
  }
  const bolts = h % 3;
  for (let i = 0; i < bolts; i++) {
    const a = ((h >> (i * 4)) % 360);
    const x = 50 + Math.cos((a * Math.PI) / 180) * 22;
    const y = 50 + Math.sin((a * Math.PI) / 180) * 22;
    shapes.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${ink}"/>`);
  }
  return `<svg class="sigil" viewBox="0 0 100 100" aria-hidden="true">${shapes.join('')}</svg>`;
}
