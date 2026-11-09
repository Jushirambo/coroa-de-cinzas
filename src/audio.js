let ctx;
let muted = false;
let ambientNodes = [];

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAmbient();
  else startAmbient();
  return muted;
}

function tone(freq, dur, type = 'sawtooth', gain = 0.04, at = 0) {
  if (muted) return;
  const c = ac();
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(f);
  f.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, gain = 0.03, freq = 800) {
  if (muted) return;
  const c = ac();
  const t = c.currentTime;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

export const sfx = {
  draw() {
    noiseBurst(0.12, 0.05, 1400);
    tone(180, 0.08, 'square', 0.02);
  },
  discard() {
    noiseBurst(0.09, 0.06, 400);
    tone(90, 0.12, 'sawtooth', 0.03);
  },
  hover() {
    tone(520, 0.04, 'triangle', 0.015);
  },
  win() {
    tone(196, 0.25, 'sawtooth', 0.04);
    tone(247, 0.3, 'sawtooth', 0.035, 0.12);
    tone(311, 0.5, 'sawtooth', 0.04, 0.24);
  },
  lose() {
    tone(150, 0.4, 'sawtooth', 0.04);
    tone(110, 0.5, 'sawtooth', 0.04, 0.15);
  },
  click() {
    tone(240, 0.05, 'square', 0.02);
  },
};

export function startAmbient() {
  if (muted) return;
  stopAmbient();
  const c = ac();
  const noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = c.createGain();
  g.gain.value = 0.018;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const og = c.createGain();
  og.gain.value = 0.012;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  osc.connect(og);
  og.connect(c.destination);
  src.start();
  osc.start();
  ambientNodes = [src, osc];
}

export function stopAmbient() {
  for (const n of ambientNodes) {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
  }
  ambientNodes = [];
}
