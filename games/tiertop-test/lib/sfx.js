// 공장 공용 소리 라이브러리. 소리 파일 없이 WebAudio로 효과음과 배경음악을 합성한다.
// 앱은 이 파일을 고치지 않는다. 새 소리는 src 쪽에서 Sfx.define으로 더한다.
//   Sfx.play('coin')                       효과음
//   Sfx.play('hit', { pitch: 1.3 })        높이와 크기(vol)를 바꿔 같은 소리를 여러 느낌으로
//   Sfx.music({ bpm: 112, mood: 'upbeat', seed: 3 })   배경음악 시작, Sfx.music(null)로 멈춤
//   Sfx.setMuted(true)                     소리 끄기. 설정은 기기에 저장된다
//   Sfx.define('zap', (c, out, t, o) => { Sfx.tone(c, out, t, { freq: 900, to: 200, dur: 0.15 }); })
// 녹화 도구는 startLog로 재생 기록을 모았다가 renderLog로 같은 소리를 WAV로 다시 만든다.
(function () {
  const KEY = 'sfx-muted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch { /* 저장이 막혀도 소리는 난다. */ }

  let live = null; // { ctx, out, music }
  let musicSpec = null;
  let logging = false;
  const log = [];
  const defs = {};
  const noiseCache = new WeakMap();

  // ---------- 합성 기본 단위 ----------
  function tone(c, out, t, o = {}) {
    const dur = o.dur ?? 0.15;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq ?? 440, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    const vol = o.vol ?? 0.3;
    const attack = o.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filterType || 'lowpass';
      f.frequency.setValueAtTime(o.filter, t);
      gain.connect(f);
      f.connect(out);
    } else gain.connect(out);
    osc.onended = () => gain.disconnect(); // 끝난 소리는 그래프에서 뺀다.
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBuffer(c) {
    let buffer = noiseCache.get(c);
    if (!buffer) {
      buffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = buffer.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < data.length; i += 1) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        data[i] = (s / 0x3fffffff) - 1;
      }
      noiseCache.set(c, buffer);
    }
    return buffer;
  }

  function noise(c, out, t, o = {}) {
    const dur = o.dur ?? 0.2;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.filterType || 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    f.Q.value = o.q ?? 0.7;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + (o.attack ?? 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(out);
    src.onended = () => gain.disconnect();
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  const note = (semi) => 440 * 2 ** ((semi - 9) / 12); // 0 = 가운데 도(C4)

  // ---------- 기본 효과음 ----------
  const p = (o) => o.pitch ?? 1;
  const v = (o, x) => x * (o.vol ?? 1);
  Object.assign(defs, {
    tap: (c, out, t, o) => tone(c, out, t, { type: 'triangle', freq: 660 * p(o), to: 520 * p(o), dur: 0.06, vol: v(o, 0.18) }),
    select: (c, out, t, o) => {
      tone(c, out, t, { type: 'triangle', freq: 523 * p(o), dur: 0.08, vol: v(o, 0.2) });
      tone(c, out, t + 0.06, { type: 'triangle', freq: 784 * p(o), dur: 0.12, vol: v(o, 0.2) });
    },
    back: (c, out, t, o) => tone(c, out, t, { type: 'triangle', freq: 520 * p(o), to: 330 * p(o), dur: 0.12, vol: v(o, 0.18) }),
    coin: (c, out, t, o) => {
      tone(c, out, t, { type: 'square', freq: 988 * p(o), dur: 0.07, vol: v(o, 0.12), filter: 5000 });
      tone(c, out, t + 0.07, { type: 'square', freq: 1319 * p(o), dur: 0.22, vol: v(o, 0.12), filter: 5000 });
    },
    jump: (c, out, t, o) => tone(c, out, t, { type: 'square', freq: 280 * p(o), to: 720 * p(o), dur: 0.18, vol: v(o, 0.12), filter: 3000 }),
    land: (c, out, t, o) => noise(c, out, t, { freq: 900 * p(o), to: 200, dur: 0.12, vol: v(o, 0.25) }),
    hit: (c, out, t, o) => {
      noise(c, out, t, { freq: 3000 * p(o), to: 400, dur: 0.14, vol: v(o, 0.35) });
      tone(c, out, t, { type: 'sine', freq: 180 * p(o), to: 60, dur: 0.16, vol: v(o, 0.4) });
    },
    explode: (c, out, t, o) => {
      noise(c, out, t, { freq: 1800 * p(o), to: 80, dur: 0.9, vol: v(o, 0.5), attack: 0.01 });
      tone(c, out, t, { type: 'sine', freq: 110 * p(o), to: 30, dur: 0.7, vol: v(o, 0.5) });
    },
    whoosh: (c, out, t, o) => noise(c, out, t, { filterType: 'bandpass', freq: 400 * p(o), to: 2400 * p(o), q: 1.5, dur: 0.35, vol: v(o, 0.3), attack: 0.12 }),
    power: (c, out, t, o) => [0, 4, 7, 12].forEach((s, i) => tone(c, out, t + i * 0.06, { type: 'square', freq: note(s + 12) * p(o), dur: 0.12, vol: v(o, 0.1), filter: 4000 })),
    win: (c, out, t, o) => [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(c, out, t + i * 0.09, { type: 'triangle', freq: note(s + 12) * p(o), dur: i === 5 ? 0.5 : 0.14, vol: v(o, 0.22) })),
    lose: (c, out, t, o) => [7, 6, 5, 4].forEach((s, i) => tone(c, out, t + i * 0.18, { type: 'sawtooth', freq: note(s) * p(o), dur: i === 3 ? 0.6 : 0.2, vol: v(o, 0.1), filter: 1400 })),
    error: (c, out, t, o) => tone(c, out, t, { type: 'square', freq: 150 * p(o), dur: 0.2, vol: v(o, 0.12), filter: 900 }),
    count: (c, out, t, o) => tone(c, out, t, { type: 'sine', freq: 880 * p(o), dur: 0.12, vol: v(o, 0.25) }),
  });

  // ---------- 배경음악: 시드로 정해지는 4마디 반복 ----------
  const PROGRESSIONS = {
    major: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
    minor: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
  };
  function musicStep(c, out, spec, step, t) {
    const mood = spec.mood || 'calm';
    const minor = spec.mode === 'minor' || mood === 'tense';
    const root = (spec.key ?? 0) - 12;
    const chord = PROGRESSIONS[minor ? 'minor' : 'major'][Math.floor(step / 16) % 4];
    const beat = step % 16;
    const sixteenth = 60 / (spec.bpm || 104) / 4;
    const vol = spec.vol ?? 1;
    let s = ((spec.seed ?? 1) * 7919 + step * 104729) % 9973;
    const pick = (n) => { s = (s * 31 + 17) % 9973; return s % n; };
    // 베이스
    if (beat % 4 === 0) tone(c, out, t, { type: 'triangle', freq: note(root + chord[0] - 12), dur: sixteenth * 3.5, vol: 0.16 * vol, attack: 0.01 });
    // 아르페지오
    const arpEvery = mood === 'calm' ? 4 : 2;
    if (beat % arpEvery === 0) {
      const n = chord[(beat / arpEvery + pick(2)) % 3] + 12 + (pick(5) === 0 ? 12 : 0);
      tone(c, out, t, { type: mood === 'calm' ? 'sine' : 'square', freq: note(root + n + 12), dur: sixteenth * (mood === 'calm' ? 3.5 : 1.6), vol: (mood === 'calm' ? 0.09 : 0.045) * vol, filter: 3200 });
    }
    // 북
    if (mood !== 'calm') {
      if (beat % 8 === 0) tone(c, out, t, { type: 'sine', freq: 140, to: 45, dur: 0.18, vol: 0.32 * vol });
      if (beat % 8 === 4) noise(c, out, t, { freq: 2600, dur: 0.12, vol: 0.12 * vol });
      if (beat % 2 === 0) noise(c, out, t, { filterType: 'highpass', freq: 7000, dur: 0.03, vol: 0.05 * vol });
    } else if (beat === 0) {
      noise(c, out, t, { filterType: 'highpass', freq: 6000, dur: 0.05, vol: 0.03 * vol });
    }
  }
  const stepLength = (spec) => 60 / (spec.bpm || 104) / 4;

  // ---------- 실시간 재생 ----------
  function ensure() {
    if (!live) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const out = ctx.createGain();
      out.gain.value = muted ? 0 : 0.8;
      const comp = ctx.createDynamicsCompressor();
      out.connect(comp);
      comp.connect(ctx.destination);
      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(out);
      live = { ctx, out, musicBus, music: null };
    }
    if (live.ctx.state === 'suspended' && !document.hidden) live.ctx.resume().catch(() => {});
    return live;
  }
  // 브라우저는 손이 닿은 뒤에야 소리를 낸다.
  for (const type of ['pointerdown', 'touchstart', 'keydown']) addEventListener(type, ensure, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!live) return;
    if (document.hidden) live.ctx.suspend().catch(() => {});
    else live.ctx.resume().catch(() => {});
  });

  function startLiveMusic() {
    if (!live) return;
    if (live.music) clearInterval(live.music.timer);
    live.music = null;
    if (!musicSpec || muted) return;
    const spec = musicSpec;
    const state = { step: 0, next: live.ctx.currentTime + 0.05 };
    state.timer = setInterval(() => {
      if (!live || live.ctx.state !== 'running') return;
      while (state.next < live.ctx.currentTime + 0.25) {
        if (state.next >= live.ctx.currentTime - 0.05) musicStep(live.ctx, live.musicBus, spec, state.step, state.next);
        state.step += 1;
        state.next += stepLength(spec);
      }
    }, 60);
    live.music = state;
  }

  function record(entry) {
    if (logging) log.push({ ...entry, at: Date.now() });
  }

  const Sfx = {
    tone, noise, note,
    define(name, fn) { defs[name] = fn; },
    names: () => Object.keys(defs),
    play(name, opts = {}) {
      if (!defs[name]) return;
      record({ kind: 'play', name, opts });
      if (muted) return;
      const l = ensure();
      if (!l || l.ctx.state !== 'running') return;
      try { defs[name](l.ctx, l.out, l.ctx.currentTime + 0.005, opts); } catch { /* 소리 실패가 게임을 멈추지 않게 한다. */ }
    },
    music(spec) {
      musicSpec = spec || null;
      record({ kind: 'music', spec: musicSpec });
      ensure();
      startLiveMusic();
    },
    get muted() { return muted; },
    setMuted(value) {
      muted = Boolean(value);
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* 무시 */ }
      if (live) live.out.gain.value = muted ? 0 : 0.8;
      startLiveMusic();
    },

    // ---------- 녹화 도구용 ----------
    startLog() { log.length = 0; logging = true; if (musicSpec) record({ kind: 'music', spec: musicSpec }); },
    // fromMs(Date.now 기준)부터 seconds 길이의 소리를 다시 합성해 16비트 모노 WAV(base64)로 돌려준다.
    // entries를 주면 모은 기록 대신 그것을 합성한다(예: 배경음악만 길게).
    async renderLog(fromMs, seconds, entries = log) {
      logging = false;
      const rate = 44100;
      const c = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
      const out = c.createGain();
      out.gain.value = 0.8;
      const comp = c.createDynamicsCompressor();
      out.connect(comp);
      comp.connect(c.destination);
      const musicBus = c.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(out);
      const at = (ms) => (ms - fromMs) / 1000;
      const jobs = []; // { t, run }
      const musicChanges = [];
      for (const entry of entries) {
        const t = at(entry.at);
        if (entry.kind === 'music') musicChanges.push({ t: Math.max(0, t), spec: entry.spec });
        else if (t >= 0 && t < seconds && defs[entry.name]) jobs.push({ t, run: () => defs[entry.name](c, out, t + 0.005, entry.opts || {}) });
      }
      musicChanges.forEach((change, i) => {
        if (!change.spec) return;
        const end = Math.min(seconds, musicChanges[i + 1] ? musicChanges[i + 1].t : seconds);
        const len = stepLength(change.spec);
        for (let step = 0, t = change.t; t < end; step += 1, t += len) {
          const s = step;
          const time = t;
          jobs.push({ t: time, run: () => musicStep(c, musicBus, change.spec, s, time) });
        }
      });
      // 노드를 한꺼번에 만들면 아직 울리지 않은 노드까지 매 순간 계산해 길이의 제곱으로 느려진다.
      // 그래서 1초씩 멈춰 가며 그 1초에 울릴 소리만 만든다.
      const WINDOW = 1;
      const schedule = (from) => {
        for (const job of jobs) {
          if (job.t >= from && job.t < from + WINDOW) {
            try { job.run(); } catch { /* 소리 하나가 실패해도 나머지는 만든다. */ }
          }
        }
      };
      schedule(0);
      for (let w = WINDOW; w < seconds; w += WINDOW) {
        c.suspend(w - 0.1).then(() => { schedule(w); c.resume(); });
      }
      const data = (await c.startRendering()).getChannelData(0);
      const bytes = new Uint8Array(44 + data.length * 2);
      const view = new DataView(bytes.buffer);
      const text = (o, s) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)));
      text(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); text(8, 'WAVE');
      text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      text(36, 'data'); view.setUint32(40, data.length * 2, true);
      for (let i = 0; i < data.length; i += 1) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    get logCount() { return log.length; },
    get currentMusic() { return musicSpec; },
  };
  window.Sfx = Sfx;
})();
