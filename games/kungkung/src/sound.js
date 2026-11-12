// 효과음과 공룡 울음소리는 Web Audio로 합성하고, 읽어주기는 기기의 한국어 음성을 쓴다.
// 글을 아직 못 읽는 아이도 공룡의 말을 들을 수 있게 하기 위함이다.
window.DinoSound = (() => {
  let ctx = null;
  let enabled = { sound: true, voice: true };
  let lastSpoke = 0;
  let cryUntil = 0;
  let speakTimer = null;
  const NARRATOR = { pitch: 1.08, rate: 0.95, slot: 0 };

  function audio() {
    if (!enabled.sound) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      return null;
    }
    return ctx;
  }

  function tone(freq, start, dur, { type = 'sine', vol = 0.16, to = null } = {}) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const seq = (notes, step, opts) => notes.forEach((n, i) => tone(n, i * step, step * 1.6, opts));

  const play = {
    tap: () => tone(660, 0, 0.08, { type: 'triangle' }),
    coin: () => tone(1250, 0, 0.06, { type: 'triangle', vol: 0.07, to: 1750 }),
    rain: () => seq([1047, 1319, 1568, 2093, 1568, 2093], 0.07, { type: 'triangle', vol: 0.1 }),
    pop: () => tone(420, 0, 0.1, { to: 900 }),
    eat: () => [0, 0.14, 0.28].forEach((t) => tone(240, t, 0.09, { type: 'square', vol: 0.08, to: 150 })),
    no: () => seq([300, 240], 0.13, { type: 'triangle' }),
    happy: () => seq([523, 659, 784], 0.09, { type: 'triangle' }),
    star: () => seq([988, 1319], 0.07, { type: 'triangle', vol: 0.12 }),
    crack: () => tone(1500, 0, 0.06, { type: 'square', vol: 0.07, to: 500 }),
    splash: () => tone(500, 0, 0.14, { to: 1100, vol: 0.08 }),
    scrape: () => tone(160, 0, 0.05, { type: 'sawtooth', vol: 0.03, to: 120 }),
    roar: () => {
      tone(300, 0, 0.45, { type: 'sawtooth', vol: 0.09, to: 110 });
      tone(450, 0, 0.45, { type: 'square', vol: 0.04, to: 160 });
    },
    hatch: () => seq([523, 659, 784, 1047], 0.1, { type: 'triangle' }),
    levelUp: () => seq([523, 659, 784, 1047, 1319], 0.11, { type: 'triangle', vol: 0.18 }),
    night: () => seq([523, 440, 349], 0.2, { vol: 0.1 }),
  };

  // 톱니파나 사각파를 두 공명 대역으로 걸러 입을 벌린 듯한 소리를 낸다. 음절마다 음이 올랐다 내려온다.
  function cry({ hz, notes, step, wave }) {
    const ac = audio();
    if (!ac) return;
    notes.forEach((mult, i) => {
      const t = ac.currentTime + i * step * 1.15;
      const f = hz * mult;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(f * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, t + step * 0.35);
      osc.frequency.exponentialRampToValueAtTime(f * 0.78, t + step);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(wave === 'triangle' ? 1.6 : 0.5, t + 0.02); // 삼각파는 배음이 적어 필터를 지나면 작아진다.
      gain.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.1);
      [[f * 2.4, 3], [f * 5, 5]].forEach(([center, q]) => {
        const band = ac.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = center;
        band.Q.value = q;
        osc.connect(band).connect(gain);
      });
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + step * 1.2);
    });
    cryUntil = Date.now() + (notes.length * step * 1.15 + 0.05) * 1000;
  }

  // 음성이 여럿이면 가장 자연스러워 보이는 이름을 앞에 둔다.
  function webVoices() {
    const rank = (v) => (/natural|neural|online|google/i.test(v.name) ? 0 : 1);
    return speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ko')).sort((a, b) => rank(a) - rank(b));
  }

  // 미리 만들어 둔 목소리. 공룡 대사는 종마다 다른 목소리로 녹음되어 있고, 어릴수록 조금 빠르게 튼다.
  const clips = window.DinoVoiceClips || {};
  let clip = null;
  function playClip(src, who) {
    try {
      if (clip) clip.pause();
      clip = new Audio(src);
      clip.preservesPitch = false;
      clip.playbackRate = who.clipRate || 1;
      clip.play().catch(() => { /* 첫 터치 전에는 브라우저가 소리를 막을 수 있다 */ });
    } catch {
      /* 재생할 수 없으면 글자만 보여 준다 */
    }
  }

  function speak(text, who, alt) {
    const own = (line) => line && who.species && clips[`${who.species}:${line}`];
    const src = own(text) || own(alt) || clips[text] || clips[alt];
    if (src) return playClip(src, who);
    if (window.AndroidVoice) {
      window.AndroidVoice.speak(text, who.pitch, who.rate, who.slot);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voices = webVoices();
      u.lang = 'ko-KR';
      if (voices.length) u.voice = voices[who.slot % voices.length];
      u.rate = who.rate;
      u.pitch = who.pitch;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      /* 음성이 없는 기기에서는 글자만 보여 준다 */
    }
  }

  // who를 주면 공룡 말투로, 없으면 이야기 해설 목소리로 읽는다. 공룡은 울음소리 뒤에 말한다.
  function say(text, force = false, who = NARRATOR, alt) {
    if (!enabled.voice) return;
    if (!Object.keys(clips).length && !window.AndroidVoice && !window.speechSynthesis) return;
    const now = Date.now();
    if (!force && now - lastSpoke < 2500) return;
    lastSpoke = now;
    if (who.cry && now >= cryUntil) cry(who.cry);
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => speak(text, who, alt), Math.max(0, cryUntil - now));
  }

  return { play, say, cry, unlock: () => { audio(); }, configure: (opts) => { enabled = opts; } };
})();
