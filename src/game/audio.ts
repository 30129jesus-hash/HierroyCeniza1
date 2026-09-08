/* Sonido procedural con WebAudio — sin assets */

let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; };

function ensure() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

interface ToneOpts { wave?: OscillatorType; vol?: number; slide?: number; delay?: number; }

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  if (muted) return;
  ensure();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.wave ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* silencio */ }
}

interface NoiseOpts { vol?: number; freq?: number; q?: number; delay?: number; }

function noise(dur: number, o: NoiseOpts = {}) {
  if (muted) return;
  ensure();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.freq ?? 800;
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
  } catch { /* silencio */ }
}

export const sfx = {
  unlock() { ensure(); },
  click() { tone(660, 0.06, { wave: 'triangle', vol: 0.25 }); tone(990, 0.05, { wave: 'triangle', vol: 0.14, delay: 0.03 }); },
  hover() { tone(520, 0.03, { wave: 'sine', vol: 0.08 }); },
  card() { noise(0.08, { vol: 0.3, freq: 1800 }); tone(240, 0.1, { wave: 'triangle', vol: 0.3, slide: 120 }); },
  summon() { tone(140, 0.22, { wave: 'sawtooth', vol: 0.3, slide: 60 }); noise(0.18, { vol: 0.25, freq: 400 }); tone(520, 0.12, { wave: 'triangle', vol: 0.16, delay: 0.05 }); },
  hit() { noise(0.12, { vol: 0.5, freq: 700, q: 0.6 }); tone(180, 0.1, { wave: 'square', vol: 0.2, slide: 70 }); },
  heroHit() { noise(0.2, { vol: 0.55, freq: 300, q: 0.5 }); tone(110, 0.3, { wave: 'sawtooth', vol: 0.35, slide: 45 }); },
  fire() { noise(0.3, { vol: 0.45, freq: 500, q: 0.4 }); tone(320, 0.2, { wave: 'sawtooth', vol: 0.16, slide: 90 }); },
  ice() { tone(1400, 0.18, { wave: 'sine', vol: 0.22, slide: 2200 }); tone(1900, 0.14, { wave: 'sine', vol: 0.14, slide: 2600, delay: 0.06 }); },
  poison() { tone(300, 0.25, { wave: 'sawtooth', vol: 0.16, slide: 140 }); noise(0.2, { vol: 0.2, freq: 1200, q: 2 }); },
  heal() { tone(520, 0.12, { wave: 'sine', vol: 0.24 }); tone(780, 0.14, { wave: 'sine', vol: 0.22, delay: 0.09 }); tone(1040, 0.18, { wave: 'sine', vol: 0.18, delay: 0.18 }); },
  buff() { tone(400, 0.1, { wave: 'square', vol: 0.16 }); tone(600, 0.12, { wave: 'square', vol: 0.16, delay: 0.07 }); },
  shield() { tone(900, 0.05, { wave: 'square', vol: 0.2 }); tone(520, 0.09, { wave: 'square', vol: 0.16, slide: 260, delay: 0.02 }); noise(0.06, { vol: 0.2, freq: 3000, q: 3 }); },
  freeze() { tone(1200, 0.2, { wave: 'triangle', vol: 0.2, slide: 1800 }); },
  death() { tone(220, 0.3, { wave: 'sawtooth', vol: 0.28, slide: 55 }); noise(0.25, { vol: 0.3, freq: 250 }); },
  draw() { noise(0.07, { vol: 0.2, freq: 2400 }); },
  coin() { tone(1100, 0.07, { wave: 'square', vol: 0.18 }); tone(1650, 0.12, { wave: 'square', vol: 0.16, delay: 0.06 }); },
  error() { tone(200, 0.12, { wave: 'square', vol: 0.2, slide: 140 }); },
  turn() { tone(330, 0.1, { wave: 'triangle', vol: 0.2 }); tone(440, 0.14, { wave: 'triangle', vol: 0.2, delay: 0.08 }); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { wave: 'triangle', vol: 0.2, delay: i * 0.12 })); tone(1319, 0.5, { wave: 'triangle', vol: 0.16, delay: 0.5 }); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { wave: 'sawtooth', vol: 0.16, delay: i * 0.16 })); },
  pack() { noise(0.15, { vol: 0.3, freq: 1000 }); tone(700, 0.2, { wave: 'triangle', vol: 0.2, slide: 1400, delay: 0.05 }); },
  reveal(i: number) { tone(600 + i * 180, 0.16, { wave: 'triangle', vol: 0.22 }); noise(0.06, { vol: 0.15, freq: 2000 }); },
  epic() { [523, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { wave: 'square', vol: 0.12, delay: i * 0.07 })); },
};
