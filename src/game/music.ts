/* Música ambiental procedural con WebAudio — drone oscuro de batalla */

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private started = false;
  private enabled = true;
  private tense = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private windSrc: AudioBufferSourceNode | null = null;

  private ensureCtx() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch { this.ctx = null; }
  }

  start() {
    if (this.started) return;
    this.ensureCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const ctx = this.ctx;
    this.started = true;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // rampa de entrada suave
    this.master.gain.linearRampToValueAtTime(this.enabled ? 0.5 : 0, ctx.currentTime + 2.5);

    // ---- capa 1: drone grave ----
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.16;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.7;
    this.droneGain.connect(filter).connect(this.master);

    const mk = (freq: number, type: OscillatorType, gain: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(this.droneGain!);
      o.start();
      return o;
    };
    mk(55, 'sine', 0.5);
    mk(55.7, 'sawtooth', 0.14);
    mk(110.3, 'triangle', 0.1);

    // LFO sobre el filtro (respiración del drone)
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    this.lfoOsc.connect(lfoGain).connect(filter.frequency);
    this.lfoOsc.start();

    // ---- capa 2: viento (ruido filtrado) ----
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = buf;
    this.windSrc.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 380;
    wf.Q.value = 0.4;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.028;
    this.windSrc.connect(wf).connect(this.windGain).connect(this.master);
    this.windSrc.start();

    // ---- capa 3: campanadas y latidos programados ----
    this.scheduleLoop();
  }

  private scheduleLoop() {
    if (this.timer) clearInterval(this.timer);
    const tick = () => {
      if (!this.started || !this.ctx) return;
      if (!this.enabled) return;
      if (Math.random() < 0.5) this.chime();
      if (this.tense && Math.random() < 0.7) this.heartbeat();
    };
    this.timer = setInterval(tick, 1500);
  }

  private chime() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const scale = [220, 261.6, 293.7, 329.6, 392];
    const f = scale[Math.floor(Math.random() * scale.length)];
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + 4.2);
  }

  private heartbeat() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const thump = (delay: number) => {
      const t0 = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(50, t0);
      o.frequency.exponentialRampToValueAtTime(34, t0 + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g).connect(this.master!);
      o.start(t0);
      o.stop(t0 + 0.2);
    };
    thump(0);
    thump(0.3);
  }

  setTense(t: boolean) {
    if (this.tense === t) return;
    this.tense = t;
    if (this.windGain && this.ctx) {
      this.windGain.gain.linearRampToValueAtTime(t ? 0.055 : 0.028, this.ctx.currentTime + 1.2);
    }
  }

  setEnabled(e: boolean) {
    this.enabled = e;
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(e && this.started ? 0.5 : 0, this.ctx.currentTime + 0.8);
    }
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const ctx = this.ctx;
    if (ctx && this.master) {
      this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    }
    // deja morir el contexto poco después
    setTimeout(() => {
      try {
        this.lfoOsc?.stop();
        this.windSrc?.stop();
      } catch { /* ya detenido */ }
      this.lfoOsc = null;
      this.windSrc = null;
      this.master = null;
      this.droneGain = null;
      this.windGain = null;
    }, 900);
  }
}

export const music = new MusicEngine();
