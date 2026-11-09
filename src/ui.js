import { CARDS, SUITS, SUIT_ORDER, CARD_BY_ID } from './cards.js';
import { scoreHand } from './scoring.js';
import {
  createGame,
  drawFromDeck,
  drawFromDiscard,
  discardFromHand,
  applyAiTurn,
  saveHighScore,
  getHighScore,
  DISCARD_LIMIT,
} from './game.js';
import { chooseAiMove, chooseHint } from './ai.js';
import { sfx, startAmbient, toggleMute, isMuted } from './audio.js';
import { suitSvg, sigilSvg } from './icons.js';

let app;
let screen = 'menu';
let state = null;
let hintOn = false;
let hoverUid = null;
let overlay = null;
let toastTimer = 0;
let toastMsg = '';
let busy = false;
let codexSuit = 'all';
let high = 0;

export function mount(root) {
  app = root;
  high = getHighScore();
  app.addEventListener('click', onClick);
  app.addEventListener('pointerover', onOver);
  window.addEventListener('keydown', onKey);
  render();
}

function onKey(e) {
  if (e.key === 'Escape') {
    overlay = null;
    render();
  }
  if (e.key === 'h' || e.key === 'H') {
    if (screen === 'game') {
      hintOn = !hintOn;
      render();
    }
  }
  if (e.key === 'm' || e.key === 'M') {
    toggleMute();
    render();
  }
}

function onOver(e) {
  const card = e.target.closest('[data-uid]');
  const uid = card?.dataset.uid || null;
  if (uid !== hoverUid) {
    hoverUid = uid;
    const inspector = app.querySelector('[data-role="inspector"]');
    if (inspector) inspector.innerHTML = inspectorHTML();
  }
}

function toast(msg) {
  toastMsg = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg = '';
    const t = app.querySelector('.toast');
    if (t) t.remove();
  }, 2200);
}

function findCard(uid) {
  if (!state) return CARD_BY_ID[uid] || CARDS.find((c) => c.id === uid);
  return (
    state.player.find((c) => c.uid === uid) ||
    state.discard.find((c) => c.uid === uid) ||
    state.ai.find((c) => c.uid === uid) ||
    CARD_BY_ID[uid]
  );
}

function onClick(e) {
  if (e.target.classList?.contains('overlay')) {
    overlay = null;
    render();
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (btn) {
    handleAct(btn.dataset.act, btn.dataset.arg);
    return;
  }
  if (busy) return;
  const pile = e.target.closest('[data-zone="deck"]');
  if (pile && screen === 'game') {
    tryDrawDeck();
    return;
  }
  const el = e.target.closest('[data-uid]');
  if (!el || screen !== 'game') return;
  const uid = el.dataset.uid;
  const zone = el.dataset.zone;
  if (zone === 'discard' && state.phase === 'draw') {
    tryDrawDiscard(uid);
  } else if (zone === 'hand' && state.phase === 'discard') {
    tryDiscard(uid);
  } else if (zone === 'codex' || zone === 'hand' || zone === 'discard') {
    overlay = { type: 'card', uid };
    render();
  }
}

function handleAct(act, arg) {
  sfx.click();
  switch (act) {
    case 'play':
      startAmbient();
      state = createGame();
      screen = 'game';
      overlay = null;
      busy = false;
      hintOn = false;
      render();
      toast('Primeira compra: só o baralho.');
      break;
    case 'menu':
      screen = 'menu';
      overlay = null;
      state = null;
      render();
      break;
    case 'rules':
      overlay = { type: 'rules' };
      render();
      break;
    case 'codex':
      overlay = { type: 'codex' };
      render();
      break;
    case 'close':
      overlay = null;
      render();
      break;
    case 'mute':
      toggleMute();
      render();
      break;
    case 'hint':
      hintOn = !hintOn;
      render();
      break;
    case 'filter':
      codexSuit = arg;
      render();
      break;
    case 'again':
      handleAct('play');
      break;
    default:
      break;
  }
}

function tryDrawDeck() {
  if (!state || state.whose !== 'player' || state.phase !== 'draw') return;
  if (!state.deck.length) {
    toast('O baralho acabou. Compre do descarte.');
    return;
  }
  sfx.draw();
  state = drawFromDeck(state);
  render();
}

function tryDrawDiscard(uid) {
  if (!state || state.whose !== 'player' || state.phase !== 'draw') return;
  if (state.mustDrawDeck) {
    toast('A primeira carta da partida vem do baralho.');
    return;
  }
  sfx.draw();
  state = drawFromDiscard(state, uid);
  render();
}

function tryDiscard(uid) {
  if (!state || state.whose !== 'player' || state.phase !== 'discard') return;
  sfx.discard();
  state = discardFromHand(state, uid);
  render();
  if (state.phase === 'end') {
    finishGame();
    return;
  }
  if (state.whose === 'ai') runAi();
}

async function runAi() {
  busy = true;
  render();
  await wait(700 + Math.random() * 500);
  const move = chooseAiMove(state);
  sfx.draw();
  await wait(280);
  sfx.discard();
  state = applyAiTurn(state, move);
  busy = false;
  render();
  if (state.phase === 'end') finishGame();
}

function finishGame() {
  const p = scoreHand(state.player);
  saveHighScore(p.total);
  high = getHighScore();
  if (state.winner === 'player') sfx.win();
  else sfx.lose();
  overlay = { type: 'end' };
  render();
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function render() {
  if (screen === 'menu') app.innerHTML = menuHTML();
  else app.innerHTML = tableHTML();
  if (overlay) app.insertAdjacentHTML('beforeend', overlayHTML());
  if (toastMsg) app.insertAdjacentHTML('beforeend', `<div class="toast">${toastMsg}</div>`);
}

function menuHTML() {
  return `
  <section class="screen menu">
    <div class="menu-top">
      <button class="icon-btn" data-act="mute" title="Som">${isMuted() ? '🔇' : '🔊'}</button>
    </div>
    <div class="menu-hero">
      <div class="eyebrow">Último reino nas ruínas</div>
      <h1 class="logo">Coroa de<br/>Cinzas</h1>
      <p class="tagline">Sete cartas. Um reino de sucata, radiação e juramentos quebrados. Monte a lenda mais cara — e sobreviva à mesa.</p>
      <div class="menu-actions">
        <button class="btn primary" data-act="play">Jogar vs. IA</button>
        <button class="btn" data-act="rules">Como jogar</button>
        <button class="btn ghost" data-act="codex">Codex das cartas</button>
      </div>
      <div class="highscore">Melhor lenda · <strong>${high || '—'}</strong></div>
    </div>
  </section>`;
}

function hintFor() {
  if (!hintOn || !state || state.whose !== 'player') return null;
  return chooseHint(state);
}

function tableHTML() {
  const pScore = scoreHand(state.player);
  const hint = hintFor();
  const prompt = promptText();
  return `
  <section class="screen table">
    <header class="hud">
      <div class="brand">Coroa de Cinzas</div>
      <div class="meter">Turno <b>${state.turn}</b></div>
      <div class="meter">Descarte
        <span class="pips">${Array.from({ length: DISCARD_LIMIT }, (_, i) => `<i class="pip ${i < state.discard.length ? 'on' : ''}"></i>`).join('')}</span>
        <b>${state.discard.length}/${DISCARD_LIMIT}</b>
      </div>
      <div class="meter">Baralho <b>${state.deck.length}</b></div>
      <button class="icon-btn" data-act="hint" title="Dica (H)">${hintOn ? '💡' : '💭'}</button>
      <button class="icon-btn" data-act="codex" title="Codex">📜</button>
      <button class="icon-btn" data-act="rules" title="Regras">?</button>
      <button class="icon-btn" data-act="mute">${isMuted() ? '🔇' : '🔊'}</button>
      <button class="icon-btn" data-act="menu" title="Sair">✕</button>
    </header>

    <div class="ai-row">
      <div class="ai-meta">
        <span class="who">${state.aiName}</span>
        <span>${state.ai.length} cartas</span>
        ${state.whose === 'ai' ? '<span class="thinking">vasculha as ruínas…</span>' : ''}
      </div>
      <div class="hand">${state.ai.map(() => `<div class="card-back xs"></div>`).join('')}</div>
    </div>

    <div class="mid">
      <div class="pile">
        <div class="deck-stack ${hint?.take === 'deck' ? 'is-hint' : ''}" data-zone="deck" title="Comprar do baralho">
          <div class="card-back"></div>
          <div class="card-back"></div>
          <div class="card-back"></div>
          <div class="deck-count">${state.deck.length}</div>
        </div>
        <div class="pile-label">Baralho</div>
      </div>
      <div>
        <div class="pile-label" style="text-align:center;margin-bottom:6px">Descarte — qualquer carta visível</div>
        <div class="discard-row">
          ${
            state.discard.length
              ? state.discard
                  .map((c) =>
                    cardHTML(c, {
                      size: 'sm',
                      zone: 'discard',
                      hint: hint?.take === c.uid,
                    }),
                  )
                  .join('')
              : '<span style="color:#9a8870;font-family:Special Elite,monospace">O acostamento ainda está vazio.</span>'
          }
        </div>
      </div>
      <div class="inspector" data-role="inspector">${inspectorHTML()}</div>
    </div>

    <div class="prompt">${prompt}</div>

    <div class="player-row">
      <div class="player-meta">
        <span class="who">Você</span>
        <span class="score-chip">Força ${pScore.total}</span>
        <div class="player-tools">
          <button class="btn small ghost" data-act="hint">${hintOn ? 'Dica ligada' : 'Pedir dica'}</button>
        </div>
      </div>
      <div class="hand ${state.player.length > 7 ? 'compact' : ''}">
        ${state.player
          .map((c) => {
            const line = pScore.lines.find((l) => l.uid === c.uid);
            return cardHTML(c, {
              size: 'sm',
              zone: 'hand',
              hint: hint?.uid === c.uid,
              drawn: state.lastDrawnUid === c.uid,
              line,
              assigned: pScore.assigned[c.uid],
            });
          })
          .join('')}
      </div>
      <div class="breakdown">
        ${pScore.lines
          .map((l) => {
            const tag = l.blanked ? 'nula' : `${l.total >= 0 ? '+' : ''}${l.total}`;
            return `<span><b>${l.printedName || l.name}</b> ${tag}</span>`;
          })
          .join('')}
      </div>
    </div>
  </section>`;
}

function promptText() {
  if (!state) return '';
  if (state.phase === 'end') return 'O reino se fechou.';
  if (state.whose === 'ai') return `${state.aiName} escolhe no pó…`;
  if (state.phase === 'draw' && state.mustDrawDeck) return 'Compre a primeira carta do baralho.';
  if (state.phase === 'draw') return 'Compre do baralho ou tome uma carta do descarte.';
  if (state.phase === 'discard') return 'Descarte uma carta da sua mão. A décima carta no descarte encerra o jogo.';
  return '';
}

export function cardHTML(card, opts = {}) {
  const suit = SUITS[card.suit];
  const size = opts.size || '';
  const foil = card.rarity === 'lendaria' ? 'foil' : '';
  const hint = opts.hint ? 'is-hint' : '';
  const drawn = opts.drawn ? 'is-drawn' : '';
  const line = opts.line;
  let badge = '';
  if (line) {
    if (line.blanked) badge = `<span class="badge null">NULA</span>`;
    else if (line.total < 0) badge = `<span class="badge bad">${line.total}</span>`;
    else badge = `<span class="badge">+${line.total}</span>`;
  }
  const acting = opts.assigned
    ? `<div class="acting">como ${opts.assigned.name}</div>`
    : '';
  return `
  <button type="button" class="card ${size} ${foil} ${hint} ${drawn}" data-uid="${card.uid || card.id}" data-zone="${opts.zone || 'codex'}" style="--suit:${suit.color}" title="${card.name}">
    <div class="card-chrome"></div>
    <div class="card-top">
      <div class="str">${card.base}</div>
      <div class="card-suit">${suitSvg(card.suit, 16)}<span>${suit.name}</span></div>
    </div>
    <div class="sigil-wrap">${sigilSvg(card)}</div>
    <div class="card-name">${card.name}</div>
    ${acting}
    <div class="card-text">${card.text}</div>
    <div class="card-flavor">“${card.flavor}”</div>
    ${badge}
  </button>`;
}

function inspectorHTML() {
  if (!hoverUid) {
    return `<div class="pile-label">Passe o cursor numa carta para inspecionar</div>`;
  }
  if (state?.ai.some((c) => c.uid === hoverUid)) {
    return `<div class="pile-label">A mão rival permanece coberta de fuligem.</div>`;
  }
  const card = findCard(hoverUid);
  if (!card) {
    return `<div class="pile-label">Passe o cursor numa carta para inspecionar</div>`;
  }
  const assigned = state ? scoreHand(state.player).assigned[card.uid] : null;
  return cardHTML(card, { size: 'lg', zone: 'inspect', assigned });
}

function overlayHTML() {
  if (overlay.type === 'rules') return rulesHTML();
  if (overlay.type === 'codex') return codexHTML();
  if (overlay.type === 'end') return endHTML();
  if (overlay.type === 'card') {
    const card = findCard(overlay.uid);
    return `<div class="overlay" data-act="close"><div class="panel" onclick="event.stopPropagation()">${card ? cardHTML(card, { size: 'lg' }) : ''}<div style="margin-top:12px"><button class="btn" data-act="close">Fechar</button></div></div></div>`;
  }
  return '';
}

function rulesHTML() {
  return `
  <div class="overlay">
    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Manual encontrado no glovebox</div>
          <h2>Como jogar</h2>
        </div>
        <button class="btn small" data-act="close">Fechar</button>
      </div>
      <p>Coroa de Cinzas é um duelo rápido de combinações. Cada jogador segura <b>sete cartas</b>. Cada carta vale uma força-base e ganha bônus — ou sofre penalidades — conforme o resto da <em>sua</em> mão. O oponente não interfere na sua conta.</p>
      <h3>Turno</h3>
      <ol>
        <li>Compre <b>uma</b> carta: o topo do baralho (cega) ou qualquer carta visível do descarte.</li>
        <li>Descarte <b>uma</b> carta da mão, virada para cima no acostamento.</li>
      </ol>
      <p>A primeira compra da partida deve vir do baralho. Quando a <b>décima</b> carta entra no descarte, o jogo acaba na hora. Quem tiver a maior força vence. Empate é empate — o deserto não desempata.</p>
      <h3>Textos</h3>
      <ul>
        <li><b>Com</b> — o bônus acontece uma vez se a condição for verdadeira.</li>
        <li><b>Para cada</b> — soma de novo para cada carta que servir.</li>
        <li><b>Anula</b> — a carta anulada perde naipe, força, bônus e penalidade.</li>
        <li><b>Limpa</b> — tira penalidades (ou uma palavra delas) antes de somar.</li>
        <li><b>Coringas</b> — copiam nome e naipe (o Camaleão copia também a força-base). O jogo escolhe a melhor identidade sozinho.</li>
      </ul>
      <p>A dica (ícone de lâmpada ou tecla <b>H</b>) sugere a jogada gulosa. O Codex lista as 53 cartas — são todas únicas.</p>
      <p style="margin-top:1rem">Este é um jogo original. A mecânica (mão de sete, compra/descarte, combos) pertence à tradição dos card games; nomes, naipes, textos e tema são novos.</p>
    </div>
  </div>`;
}

function codexHTML() {
  const list = CARDS.filter((c) => codexSuit === 'all' || c.suit === codexSuit);
  const chips = [
    `<button class="chip ${codexSuit === 'all' ? 'on' : ''}" data-act="filter" data-arg="all">Todas</button>`,
    ...SUIT_ORDER.map((s) => {
      const meta = SUITS[s];
      return `<button class="chip ${codexSuit === s ? 'on' : ''}" data-act="filter" data-arg="${s}" style="--suit:${meta.color}">${meta.plural}</button>`;
    }),
  ];
  return `
  <div class="overlay">
    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Arquivo da sucata</div>
          <h2>Codex · ${list.length} cartas</h2>
        </div>
        <button class="btn small" data-act="close">Fechar</button>
      </div>
      <div class="filters">${chips.join('')}</div>
      <div class="codex-grid">${list.map((c) => cardHTML(c, { size: 'sm', zone: 'codex' })).join('')}</div>
    </div>
  </div>`;
}

function endHTML() {
  const p = scoreHand(state.player);
  const a = scoreHand(state.ai);
  const title =
    state.winner === 'player' ? 'Você toma a coroa' : state.winner === 'ai' ? 'A cinza ficou com o outro' : 'Dois reis, nenhum reino';
  const sub =
    state.winner === 'player'
      ? 'As ruínas murmuram o seu nome. Por enquanto.'
      : state.winner === 'ai'
        ? `${state.aiName} leva o trono de ferrugem.`
        : 'Ninguém merece o trono. O vento fica.';
  return `
  <div class="overlay">
    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">Fim da lenda</div>
          <h2>${title}</h2>
          <p>${sub}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn primary small" data-act="again">Jogar de novo</button>
          <button class="btn small" data-act="menu">Menu</button>
        </div>
      </div>
      <div class="end-grid">
        ${endCol('Você', p, state.player)}
        ${endCol(state.aiName, a, state.ai)}
      </div>
    </div>
  </div>`;
}

function endCol(name, score, hand) {
  return `
  <div>
    <div class="eyebrow">${name}</div>
    <p class="end-score">${score.total}</p>
    <div class="hand" style="justify-content:flex-start;flex-wrap:wrap;min-height:0">
      ${hand.map((c) => cardHTML(c, { size: 'xs', zone: 'end', line: score.lines.find((l) => l.uid === c.uid), assigned: score.assigned[c.uid] })).join('')}
    </div>
    <div class="lines" style="margin-top:10px">
      ${score.lines
        .map((l) => {
          const detail = l.blanked
            ? 'anulada'
            : `${l.base}${l.bonus ? ` +${l.bonus}` : ''}${l.penalty ? ` ${l.penalty}` : ''}`;
          return `<div><span class="nm">${l.printedName || l.name}</span><span>${detail} → <b>${l.total}</b></span></div>`;
        })
        .join('')}
    </div>
  </div>`;
}
