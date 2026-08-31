/* Musika na binubuo, hindi pinapatugtog.
 *
 * Walang audio file dito. Bawat nota ay ginagawa ng browser mo habang tumutugtog,
 * kaya walang lisensyang hihingin ninuman at walang kahit isang byte na dine-
 * download. Kasya rin ito sa natitirang bahagi ng pahina: walang naka-imbak na
 * ipinapanggap na buhay.
 *
 * Hindi ito nagsisimula nang kusa. Hinaharangan iyon ng bawat modernong browser
 * at tama sila: walang gustong sinasalubong ng tunog na hindi niya hiningi.
 */
const A = 72;                       // bpm, ang bagal na hinahanap ng lofi
const BEAT = 60 / A;
const BAR = BEAT * 4;

/* ii - V - I - vi sa C, may pang-siyam at pang-labintatlo para sa lasang jazz */
const CHORDS = [
  [62, 65, 69, 72, 76],   // Dm9
  [55, 59, 65, 69, 74],   // G13
  [60, 64, 67, 71, 74],   // Cmaj9
  [57, 60, 64, 67, 71],   // Am9
];

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function makeBgm() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  let ctx = null, master = null, timer = 0, bar = 0, next = 0, on = false;

  /* isang maikling impulse na ginawa mula sa ingay: silid, hindi plugin */
  const room = (c) => {
    const len = Math.floor(c.sampleRate * 2.4);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * 0.5;
      }
    }
    return b;
  };

  /* ang lagitik ng plaka: ingay na sinala, umuulit nang tahimik */
  const crackle = (c, dest) => {
    const len = Math.floor(c.sampleRate * 4);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.012;
    }
    const src = c.createBufferSource();
    src.buffer = b; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0.28;
    src.connect(f).connect(g).connect(dest);
    src.start();
    return src;
  };

  /* isang nota ng Rhodes: dalawang sine na bahagyang magkalihis, malambot ang simula */
  const key = (t, note, dur, vel) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 1500; f.Q.value = 0.4;
    g.connect(f).connect(master.wet);
    g.connect(f).connect(master.dry);
    for (const cents of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = hz(note) * Math.pow(2, cents / 1200);
      o.connect(g); o.start(t); o.stop(t + dur + 0.1);
    }
    const o3 = ctx.createOscillator();       // konting kagat sa ibabaw
    o3.type = "triangle"; o3.frequency.value = hz(note + 12);
    const g3 = ctx.createGain(); g3.gain.value = 0.0001;
    g3.gain.setValueAtTime(0.0001, t);
    g3.gain.exponentialRampToValueAtTime(vel * 0.16, t + 0.04);
    g3.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);
    o3.connect(g3).connect(f); o3.start(t); o3.stop(t + dur + 0.1);
  };

  const thud = (t, freq, dur, vel, type) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master.dry);
    o.start(t); o.stop(t + dur + 0.02);
  };

  const brush = (t, vel) => {
    const len = Math.floor(ctx.sampleRate * 0.13);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 5200;
    const g = ctx.createGain(); g.gain.value = vel;
    s.connect(f).connect(g).connect(master.dry);
    g.connect(master.wet);
    s.start(t);
  };

  /* Isang bar ang inilalagay sa bawat pagtawag. Ang pagkakalihis sa oras ang
     nagbibigay ng laylay: hindi eksakto ang tao at hindi rin dapat ito. */
  const plan = (t) => {
    const c = CHORDS[bar % CHORDS.length];
    const lag = () => (Math.random() - 0.5) * 0.022;

    c.forEach((n, i) => key(t + i * 0.02 + lag(), n - 12 + (i === 0 ? 0 : 0), BAR * 0.95, 0.052));

    // melodiya: ilang nota mula sa chord, hindi bawat bar
    if (bar % 2 === 0) {
      const pick = [c[4] + 12, c[3] + 12, c[2] + 12];
      pick.forEach((n, i) => {
        if (Math.random() < 0.62) key(t + BEAT * (1.5 + i * 0.75) + lag(), n, 0.9, 0.045);
      });
    }

    thud(t + lag(), 55, 0.5, 0.42);
    thud(t + BEAT * 2.5 + lag(), 55, 0.42, 0.3);
    brush(t + BEAT * 1 + lag(), 0.06);
    brush(t + BEAT * 3 + lag(), 0.07);
    for (let i = 0; i < 4; i++) brush(t + BEAT * (i + 0.5) + lag(), 0.022);

    bar++;
  };

  const tick = () => {
    while (next < ctx.currentTime + 0.4) { plan(next); next += BAR; }
  };

  const build = () => {
    ctx = new AC();
    const out = ctx.createGain();
    out.gain.value = 0.0001;

    const tone = ctx.createBiquadFilter();      // ang dulo ng tape, walang matalim
    tone.type = "lowpass"; tone.frequency.value = 2400; tone.Q.value = 0.3;

    const conv = ctx.createConvolver();
    conv.buffer = room(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.34;
    const dry = ctx.createGain(); dry.gain.value = 0.9;

    wet.connect(conv).connect(tone);
    dry.connect(tone);
    tone.connect(out).connect(ctx.destination);

    master = { wet, dry, out };
    crackle(ctx, dry);
    next = ctx.currentTime + 0.12;
    bar = 0;
  };

  const fade = (to, secs) => {
    const g = master.out.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.exponentialRampToValueAtTime(Math.max(to, 0.0001), ctx.currentTime + secs);
  };

  return {
    get playing() { return on; },
    async start() {
      if (!ctx) build();
      if (ctx.state === "suspended") await ctx.resume();
      on = true;
      fade(0.5, 1.6);
      tick();
      clearInterval(timer);
      timer = setInterval(tick, 260);
    },
    stop() {
      if (!ctx) return;
      on = false;
      fade(0.0001, 0.6);
      clearInterval(timer);
      timer = setTimeout(() => { if (!on && ctx.state === "running") ctx.suspend(); }, 900);
    },
  };
}
