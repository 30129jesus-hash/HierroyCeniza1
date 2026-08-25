/* Música ambiental procedural: drone oscuro + campanas + latido.
   Sube de intensidad durante las fases de ataque. */

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let droneOscs: OscillatorNode[] = [];
let droneGain: GainNode | null = null;
let bellTimer: number | null = null;
let beatTimer: number | null = null;
let enabled = false;
let intensity = 0; // 0 reposo · 1 combate

function ensure() {
  if (actx) return true;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0;
    master.connect(actx.destination);
  } catch { return false; }
  return true;
}

function startDrone() {
  if (!actx || !master || droneOscs.length > 0) return;
  droneGain = actx.createGain();
  droneGain.gain.value = 0.16;
  const filter = actx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  droneGain.connect(filter).connect(master);
  const freqs = [55, 82.5, 110.6];
  droneOscs = freqs.map((f, i) => {
    const o = actx!.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sawtooth';
    o.frequency.value = f;
    const g = actx!.createGain();
    g.gain.value = i === 2 ? 0.25 : 0.5;
    // leve desafinación viva
    const lfo = actx!.createOscillator();
    lfo.frequency.value = 0.07 + i * 0.05;
    const lfoG = actx!.createGain();
    lfoG.gain.value = 1.6;
    lfo.connect(lfoG).connect(o.detune);
    lfo.start();
    o.connect(g).connect(droneGain!);
    o.start();
    return o;
  });
}

function bell() {
  if (!actx || !master || !enabled) return;
  const notes = [220, 164.8, 196, 146.8];
  const f = notes[Math.floor(Math.random() * notes.length)];
  const t0 = actx.currentTime;
  const o = actx.createOscillator();
  o.type = 'sine';
  o.frequency.value = f;
  const o2 = actx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = f * 2.76;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.05 + intensity * 0.02, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
  const g2 = actx.createGain();
  g2.gain.value = 0.3;
  o.connect(g); o2.connect(g2).connect(g);
  g.connect(master);
  o.start(t0); o2.start(t0);
  o.stop(t0 + 2.6); o2.stop(t0 + 2.6);
}

function beat() {
  if (!actx || !master || !enabled || intensity < 0.5) return;
  const t0 = actx.currentTime;
  const o = actx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(70, t0);
  o.frequency.exponentialRampToValueAtTime(38, t0 + 0.16);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + 0.3);
}

function scheduleLoops() {
  if (bellTimer === null) {
    const loop = () => { bell(); bellTimer = window.setTimeout(loop, 4200 + Math.random() * 5200); };
    bellTimer = window.setTimeout(loop, 1800);
  }
  if (beatTimer === null) {
    const loop = () => { beat(); beatTimer = window.setTimeout(loop, intensity >= 0.5 ? 620 : 1100); };
    beatTimer = window.setTimeout(loop, 400);
  }
}

export const music = {
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) {
      if (master && actx) master.gain.setTargetAtTime(0, actx.currentTime, 0.4);
      return;
    }
    if (!ensure() || !actx || !master) return;
    void actx.resume();
    startDrone();
    scheduleLoops();
    master.gain.setTargetAtTime(0.85, actx.currentTime, 0.8);
  },
  setIntensity(v: number) {
    intensity = Math.max(0, Math.min(1, v));
    if (droneGain && actx) droneGain.gain.setTargetAtTime(0.16 + intensity * 0.1, actx.currentTime, 0.5);
  },
  stop() {
    this.setEnabled(false);
  },
};
