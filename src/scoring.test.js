import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, CARD_BY_ID } from './cards.js';
import { evaluate, scoreHand } from './scoring.js';

const inst = (id) => ({ ...CARD_BY_ID[id], uid: id });

describe('deck', () => {
  it('has 53 unique cards', () => {
    assert.equal(CARDS.length, 53);
    assert.equal(new Set(CARDS.map((c) => c.id)).size, 53);
    assert.equal(new Set(CARDS.map((c) => c.name)).size, 53);
  });
});

describe('combos', () => {
  it('Barão scores +20 with a Horda', () => {
    const r = evaluate([inst('barao-ferrugem'), inst('saqueadores')]);
    const line = r.lines.find((l) => l.id === 'barao-ferrugem');
    assert.equal(line.base, 15);
    assert.equal(line.bonus, 20);
    assert.equal(line.total, 35);
  });

  it('Leviatã is a liability without Senhor or Xamã', () => {
    const r = evaluate([inst('leviatan'), inst('saqueadores')]);
    const line = r.lines.find((l) => l.id === 'leviatan');
    assert.equal(line.total, -10);
  });

  it('Leviatã is worth 30 with a Senhor', () => {
    const r = evaluate([inst('leviatan'), inst('barao-ferrugem')]);
    assert.equal(r.lines.find((l) => l.id === 'leviatan').total, 30);
  });

  it('Keth-like trio: Lâmina + Escudo + Senhor', () => {
    const r = evaluate([inst('lamina-rei'), inst('escudo-ossos'), inst('barao-ferrugem')]);
    assert.equal(r.lines.find((l) => l.id === 'lamina-rei').bonus, 40);
    assert.equal(r.lines.find((l) => l.id === 'escudo-ossos').bonus, 40);
  });

  it('Filhos da Estrada clear Legião territory penalty', () => {
    const r = evaluate([
      inst('filhos-estrada'),
      inst('legiao-poeira'),
      inst('autopista'),
      inst('farol'),
    ]);
    assert.equal(r.lines.find((l) => l.id === 'legiao-poeira').penalty, 0);
    assert.equal(r.lines.find((l) => l.id === 'filhos-estrada').bonus, 20);
  });

  it('Rainha blanks Marés', () => {
    const r = evaluate([inst('rainha-cinzas'), inst('mare-negra')]);
    assert.equal(r.lines.find((l) => l.id === 'mare-negra').blanked, true);
    assert.equal(r.lines.find((l) => l.id === 'mare-negra').total, 0);
  });

  it('Montanha de Sucata cannot be blanked by Sol Negro', () => {
    const r = evaluate([inst('sol-negro'), inst('montanha-sucata'), inst('farol')]);
    assert.equal(r.lines.find((l) => l.id === 'montanha-sucata').blanked, false);
    assert.equal(r.lines.find((l) => l.id === 'farol').blanked, true);
  });

  it('Ampulheta scores per distinct suit', () => {
    const r = evaluate([
      inst('ampulheta'),
      inst('barao-ferrugem'),
      inst('saqueadores'),
      inst('oraculo'),
    ]);
    assert.equal(r.lines.find((l) => l.id === 'ampulheta').bonus, 32);
  });

  it('Impostor copies Escudo to complete the Lâmina combo', () => {
    const hand = [
      inst('impostor'),
      inst('lamina-rei'),
      inst('barao-ferrugem'),
      inst('saqueadores'),
      inst('oraculo'),
      inst('farol'),
      inst('tocha-convoy'),
    ];
    const r = scoreHand(hand);
    assert.equal(r.assigned.impostor.as, 'escudo-ossos');
    const lamina = r.lines.find((l) => l.uid === 'lamina-rei');
    assert.equal(lamina.bonus, 40);
  });
});
