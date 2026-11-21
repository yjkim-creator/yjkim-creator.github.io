// 조수 웅덩이 화면.
// 약속 1) localStorage는 try/catch로 감싼다. 2) window.appFlush는 앱이 가려질 때 저장한다.
// 3) window.appBack은 닫을 화면이 있으면 닫고 true를 돌려준다. 4) #shot=번호이면 스토어용 대표 화면을 그린다.
(function () {
  const KEY = 'tidekeeper-v1';
  const SOUND_KEY = 'tidekeeper-sound';
  const ko = /^ko/i.test(navigator.language || '');
  const shotMatch = /#shot=(\d)/.exec(location.hash);
  const SHOT = shotMatch ? Number(shotMatch[1]) : 0;

  const T = ko ? {
    perSec: '초당', pearls: '진주', species: ['해초', '고둥', '말미잘', '해면', '성게', '산호', '불가사리', '등불해파리'],
    visitors: {
      goby: ['망둑어', '해초를 세 포기 심으면'], shrimp: ['새우', '해초 바로 옆에 고둥을 두면'], hermit: ['집게', '물을 200번 저으면'],
      wrasse: ['놀래기', '말미잘이 세 개 모이면'], seahorse: ['해마', '해면을 10단계까지 키우면'], blenny: ['베도라치', '바위 스무 개를 모두 채우면'],
      nudibranch: ['갯민숭달팽이', '여섯 종이 함께 살면'], turtle: ['바다거북', '웅덩이를 바다로 한 번 보내면'], ray: ['가오리', '초당 100만이 모이면'],
      octopus: ['문어', '모두 합쳐 100억을 모으면'], moonjelly: ['보름달물해파리', '등불해파리를 심으면'], whale: ['혹등고래', '오늘의 과제를 5일 마치면'],
    },
    hintIdle: '물을 톡톡 저으면 플랑크톤이 모여요. 바위를 눌러 생물을 심어요.',
    hintFirst: '먼저 물을 저어 플랑크톤 10을 모아 보세요.',
    tide: (sp) => `오늘의 물때 · ${sp} ×2`,
    task: { tap: '물 150번 젓기', plant: '생물 4번 심기', upgrade: '15번 키우기' },
    taskDone: '오늘 과제 완료 · 진주 +1', milestone: (x) => `🎉 초당 ${x} 돌파!`,
    emptyRock: '빈 바위', chooseSpecies: '심을 생물을 고르세요',
    locked: (sp) => `${sp}을(를) 먼저 심기`, likes: '좋아하는 이웃', lv: '단계',
    likedOn: (sp) => `옆에 ${sp}이(가) 있어 1.5배`, likedOff: (sp) => `${sp} 옆에 두면 1.5배`,
    grow: '키우기', move: '옮기기', clear: '비우기', clearSure: '정말 비울까요?', maxed: '다 자람',
    moveHint: '옮길 자리를 누르세요', cancel: '취소',
    guide: '바다 손님 도감', guideSub: (n) => `${n} / 12 · 손님 한 종마다 모든 생물이 5% 더 자라요`,
    calendar: '물때 달력', stampSub: (n) => `과제를 마친 날 ${n}일`, sound: '소리',
    sea: '바다로 보내기', seaText: '웅덩이를 바다로 돌려보내면 진주를 받아요. 진주 하나마다 모든 생물이 10% 더 빨리 자라요. 도감과 진주, 달력 도장은 남고 바위는 비워져요.',
    seaGain: (n) => `받을 진주 ${n}개`, seaNeed: (x) => `이번 판에서 플랑크톤 ${x}만큼 더 모으면 첫 진주를 받아요`, seaGo: '바다로 보내기',
    welcome: '다녀오셨어요', welcomeText: (x, h) => `${h} 동안 웅덩이가 플랑크톤을 ${x}만큼 모아 두었어요.`, ok: '좋아요',
    newVisitor: (v) => `새 손님: ${v}`, released: (n) => `진주 ${n}개를 받았어요`, close: '닫기',
    hours: (m) => (m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`),
    week: ['일', '월', '화', '수', '목', '금', '토'],
    month: (y, m) => `${y}년 ${m}월`,
    tabs: ['도감', '물때', '바다'],
    nextVisitor: (h) => `다음 손님 단서 · ${h}`, allVisitors: '손님 열두 종을 모두 만났어요',
  } : {
    perSec: 'per sec', pearls: 'Pearls', species: ['Kelp', 'Periwinkle', 'Anemone', 'Sponge', 'Urchin', 'Coral', 'Sea Star', 'Lantern Jelly'],
    visitors: {
      goby: ['Goby', 'Plant three kelp'], shrimp: ['Shrimp', 'Put a periwinkle right next to kelp'], hermit: ['Hermit Crab', 'Stir the water 200 times'],
      wrasse: ['Wrasse', 'Gather three anemones'], seahorse: ['Seahorse', 'Grow a sponge to level 10'], blenny: ['Blenny', 'Fill all twenty rocks'],
      nudibranch: ['Nudibranch', 'Keep six kinds together'], turtle: ['Sea Turtle', 'Release the pool to the sea once'], ray: ['Ray', 'Reach 1M per second'],
      octopus: ['Octopus', 'Gather 10B in total'], moonjelly: ['Moon Jelly', 'Plant a lantern jelly'], whale: ['Humpback Whale', 'Finish the daily task on 5 days'],
    },
    hintIdle: 'Tap the water to stir up plankton. Tap a rock to plant something.',
    hintFirst: 'Stir the water to gather 10 plankton first.',
    tide: (sp) => `Today's tide · ${sp} ×2`,
    task: { tap: 'Stir 150 times', plant: 'Plant 4 times', upgrade: 'Grow 15 times' },
    taskDone: 'Daily task done · +1 pearl', milestone: (x) => `🎉 ${x} per second!`,
    emptyRock: 'Empty rock', chooseSpecies: 'Choose what to plant',
    locked: (sp) => `Plant ${sp} first`, likes: 'Likes', lv: 'Lv',
    likedOn: (sp) => `Next to ${sp} · ×1.5`, likedOff: (sp) => `×1.5 next to ${sp}`,
    grow: 'Grow', move: 'Move', clear: 'Clear', clearSure: 'Really clear?', maxed: 'Fully grown',
    moveHint: 'Tap where it should go', cancel: 'Cancel',
    guide: 'Visitor Guide', guideSub: (n) => `${n} / 12 · each visitor makes everything grow 5% faster`,
    calendar: 'Tide Calendar', stampSub: (n) => `${n} days with the task done`, sound: 'Sound',
    sea: 'Release to the Sea', seaText: 'Release the pool to the sea to receive pearls. Each pearl makes everything grow 10% faster. Your guide, pearls and stamps stay; the rocks are cleared.',
    seaGain: (n) => `${n} pearls to receive`, seaNeed: (x) => `Gather ${x} more this round for your first pearl`, seaGo: 'Release',
    welcome: 'Welcome back', welcomeText: (x, h) => `While you were away for ${h}, the pool gathered ${x} plankton.`, ok: 'Nice',
    newVisitor: (v) => `New visitor: ${v}`, released: (n) => `You received ${n} pearls`, close: 'Close',
    hours: (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`),
    week: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    month: (y, m) => new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    tabs: ['Guide', 'Tide', 'Sea'],
    nextVisitor: (h) => `Next visitor clue · ${h}`, allVisitors: 'You have met all twelve visitors',
  };

  function fmt(n) {
    if (!Number.isFinite(n)) return '∞';
    n = Math.floor(n);
    if (n < 10000) return n.toLocaleString(ko ? 'ko' : 'en');
    const units = ko ? [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']] : [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    if (n >= units[0][0] * 1e4) return n.toExponential(2).replace('+', '');
    for (const [v, u] of units) {
      if (n >= v) {
        const x = n / v;
        return `${x >= 100 ? Math.floor(x) : x.toFixed(x >= 10 ? 1 : 2).replace(/\.?0+$/, '')}${u}`;
      }
    }
    return String(n);
  }

  // 저장
  function load(now) {
    try {
      const raw = localStorage.getItem(KEY);
      return Logic.sanitize(raw ? JSON.parse(raw) : null, now);
    } catch {
      return Logic.newState(now);
    }
  }
  function save() {
    if (SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막혀도 앱은 돈다. */ }
  }
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* 기본은 켬 */ }

  // 소리: Web Audio로 짧게 합성한다.
  let audio = null;
  function tone(freq, dur, type = 'sine', gain = 0.12, slide = 0, delay = 0) {
    if (!soundOn || SHOT) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + delay;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(audio.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch { /* 소리를 못 내는 기기 */ }
  }
  const sfx = {
    stir: () => tone(420 + Math.random() * 260, 0.12, 'sine', 0.08, 1.8),
    plant: () => { tone(392, 0.12, 'triangle', 0.1); tone(587, 0.18, 'triangle', 0.1, 1, 0.08); },
    grow: () => tone(520, 0.1, 'triangle', 0.08, 1.5),
    nope: () => tone(180, 0.12, 'square', 0.04, 0.8),
    visitor: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.09, 1, i * 0.09)),
    pearl: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.4, 'sine', 0.08, 1, i * 0.12)),
    soft: () => tone(300, 0.06, 'sine', 0.05),
  };

  let state;
  let ui = { sel: -1, moving: false, sure: false, overlay: null, toast: null, welcome: null };
  const fx = [];

  // 화면 뼈대
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="top">
      <div class="purse">
        <svg class="plk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="4"/><circle cx="16" cy="8" r="2.6"/><circle cx="14" cy="16" r="3.4"/></svg>
        <div><b id="amount">0</b><small id="rate"></small></div>
      </div>
      <nav class="tabs">
        <button class="tab" data-open="guide" aria-label="${T.tabs[0]}"><svg viewBox="0 0 24 24"><path d="M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM12 5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0"/></svg><span>${T.tabs[0]}</span></button>
        <button class="tab" data-open="tide" aria-label="${T.tabs[1]}"><svg viewBox="0 0 24 24"><path d="M15 3a8 8 0 1 0 6 13A7 7 0 0 1 15 3z"/></svg><span>${T.tabs[1]}</span></button>
        <button class="tab" data-open="sea" aria-label="${T.tabs[2]}"><svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="5"/><path d="M2 19c3-2 5-2 7 0s5 2 7 0 4-2 6 0"/></svg><span>${T.tabs[2]}</span><i id="pearlDot"></i></button>
      </nav>
    </header>
    <section class="pool"><canvas id="pool" data-tap></canvas></section>
    <section class="sheet" id="sheet"></section>
    <div class="toast" id="toast" hidden></div>
    <div class="overlay" id="overlay" hidden></div>`;
  const canvas = document.getElementById('pool');
  const ctx = canvas.getContext('2d');
  const sheet = document.getElementById('sheet');
  const overlay = document.getElementById('overlay');
  const toastEl = document.getElementById('toast');

  let geo = { w: 0, h: 0, cells: [] };
  function layout() {
    const box = canvas.parentElement.getBoundingClientRect();
    const h = Math.max(200, box.height - 8);
    const w = Math.min(box.width - 16, h * 0.84);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = w * 0.07;
    const cw = (w - pad * 2) / Logic.COLS;
    const ch = (h - pad * 2) / Logic.ROWS;
    const r = Math.min(cw, ch) * 0.4;
    geo = { w, h, r, cells: [] };
    for (let i = 0; i < Logic.SLOTS; i += 1) {
      const c = i % Logic.COLS;
      const row = Math.floor(i / Logic.COLS);
      const jitter = ((i * 37) % 7 - 3) * cw * 0.02;
      geo.cells.push({ x: pad + cw * (c + 0.5) + jitter, y: pad + ch * (row + 0.5) + ((c % 2) ? ch * 0.08 : -ch * 0.04) });
    }
  }

  // 손님이 헤엄치는 길은 손님마다 고정이다.
  function swimmerPos(id, k, t) {
    const speed = 0.04 + (k % 4) * 0.012;
    const phase = (t * speed + k * 0.37) % 1;
    const dir = k % 2 ? -1 : 1;
    const x = dir > 0 ? -60 + phase * (geo.w + 120) : geo.w + 60 - phase * (geo.w + 120);
    const y = geo.h * (0.12 + ((k * 0.29) % 0.78)) + Math.sin(t * 0.8 + k) * 10;
    return { x, y, dir };
  }

  function draw(t) {
    const { w, h } = geo;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2f9aa0');
    g.addColorStop(0.55, '#1d6f7a');
    g.addColorStop(1, '#134c58');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.clip();
    // 바닥 모래 무늬와 일렁이는 빛
    ctx.fillStyle = 'rgba(240, 220, 170, 0.07)';
    for (let k = 0; k < 40; k += 1) {
      ctx.beginPath();
      ctx.arc((k * 97) % w, (k * 53) % h, 1.5 + (k % 3), 0, Art.TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(220, 255, 250, 0.10)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k += 1) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const y = (k + 0.5) * (h / 7) + Math.sin(x * 0.03 + t * 0.9 + k * 1.7) * 9 + Math.sin(x * 0.011 - t * 0.5 + k) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const now = clock();
    const boost = Logic.tide(state, now).species;
    geo.cells.forEach((c, i) => {
      const tile = state.grid[i];
      const selected = ui.sel === i;
      Art.rock(ctx, i, c.x, c.y, geo.r, selected);
      if (tile) {
        const size = geo.r * (0.62 + 0.28 * Math.min(1, tile.l / 25));
        Art.organism(ctx, tile.s, c.x, c.y - geo.r * 0.08, size, t + i * 0.7);
        if (Logic.liked(state, i)) heart(c.x + geo.r * 0.72, c.y - geo.r * 0.62, geo.r * 0.2, '#ff7aa2');
        if (tile.s === boost) sparkle(c.x - geo.r * 0.75, c.y - geo.r * 0.6, geo.r * 0.16, t + i);
        ctx.fillStyle = 'rgba(8, 30, 36, 0.72)';
        const label = String(tile.l);
        ctx.font = `700 ${Math.round(geo.r * 0.3)}px system-ui, sans-serif`;
        const lw = ctx.measureText(label).width + geo.r * 0.24;
        roundRect(ctx, c.x - lw / 2, c.y + geo.r * 0.5, lw, geo.r * 0.38, geo.r * 0.19);
        ctx.fill();
        ctx.fillStyle = '#f4f1e4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, c.x, c.y + geo.r * 0.7);
      } else {
        ctx.strokeStyle = 'rgba(230, 250, 245, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x - geo.r * 0.18, c.y);
        ctx.lineTo(c.x + geo.r * 0.18, c.y);
        ctx.moveTo(c.x, c.y - geo.r * 0.18);
        ctx.lineTo(c.x, c.y + geo.r * 0.18);
        ctx.stroke();
      }
    });
    state.visitors.slice(-5).forEach((id) => {
      const k = Logic.VISITORS.findIndex((v) => v.id === id);
      const p = swimmerPos(id, k, t);
      Art.creature(ctx, id, p.x, p.y, id === 'whale' ? geo.r * 1.4 : geo.r * 0.42, t + k, p.dir);
    });
    // 저은 자리의 물방울과 숫자
    for (let k = fx.length - 1; k >= 0; k -= 1) {
      const f = fx[k];
      const age = (t - f.t0) / f.life;
      if (age >= 1) { fx.splice(k, 1); continue; }
      ctx.globalAlpha = 1 - age;
      if (f.kind === 'ring') {
        ctx.strokeStyle = '#e9fffb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6 + age * 34, 0, Art.TAU);
        ctx.stroke();
      } else if (f.kind === 'dot') {
        ctx.fillStyle = '#c9ffd9';
        ctx.beginPath();
        ctx.arc(f.x + f.vx * age * 40, f.y + f.vy * age * 40 - age * 20, 3 * (1 - age) + 1, 0, Art.TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fffbe8';
        ctx.font = '800 17px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(8, 40, 48, 0.75)';
        ctx.strokeText(f.text, f.x, f.y - age * 38);
        ctx.fillText(f.text, f.x, f.y - age * 38);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function heart(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.6, y - s * 1, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1, x + s * 1.4, y, x, y + s * 0.9);
    ctx.fill();
  }
  function sparkle(x, y, s, t) {
    const k = 0.7 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = '#fff2a6';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.4 * k);
    ctx.lineTo(x + s * 0.35, y);
    ctx.lineTo(x, y + s * 1.4 * k);
    ctx.lineTo(x - s * 0.35, y);
    ctx.closePath();
    ctx.fill();
  }

  // 시계. 스크린샷에서는 고정 시각을 쓴다.
  const SHOT_NOW = new Date(2026, 10, 8, 9, 30).getTime();
  const clock = () => (SHOT ? SHOT_NOW : Date.now());

  function hit(x, y) {
    let best = -1;
    let bd = Infinity;
    geo.cells.forEach((c, i) => {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < geo.r * 1.12 && d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function apply(result, sound) {
    if (!result) { sfx.nope(); return false; }
    state = result.state;
    if (sound) sound();
    if (result.visitors && result.visitors.length) {
      showToast(T.newVisitor(T.visitors[result.visitors[0]][0]), 'visitor');
      setTimeout(sfx.visitor, 180);
    }
    if (result.daily) {
      showToast(T.taskDone, 'pearl');
      setTimeout(sfx.pearl, 360);
    }
    if (result.milestone && !(result.visitors && result.visitors.length) && !result.daily) {
      showToast(T.milestone(fmt(10 ** result.milestone)), 'pearl');
      setTimeout(sfx.pearl, 200);
    }
    save();
    return true;
  }

  function onPoolTap(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const i = hit(x, y);
    const now = clock();
    if (ui.moving && i >= 0) {
      if (apply(Logic.move(state, ui.sel, i, now), sfx.plant)) ui.sel = i;
      ui.moving = false;
      renderSheet();
      return;
    }
    if (i >= 0) {
      ui.sel = ui.sel === i ? -1 : i;
      ui.sure = false;
      sfx.soft();
      renderSheet();
      return;
    }
    const r = Logic.tap(state, now);
    apply(r, sfx.stir);
    const t = performance.now() / 1000;
    fx.push({ kind: 'ring', x, y, t0: t, life: 0.6 });
    for (let k = 0; k < 5; k += 1) fx.push({ kind: 'dot', x, y, vx: Math.cos(k * 1.3), vy: Math.sin(k * 1.3), t0: t, life: 0.7 });
    fx.push({ kind: 'text', x, y: y - 8, text: `+${fmt(r.value)}`, t0: t, life: 0.9 });
    if (fx.length > 80) fx.splice(0, fx.length - 80);
    if (ui.sel >= 0) { ui.sel = -1; renderSheet(); }
    renderTop();
  }
  canvas.addEventListener('pointerdown', (ev) => { ev.preventDefault(); onPoolTap(ev); });

  // 생물 아이콘을 작은 캔버스로 그린다.
  function icon(sp, size, cls = 'ico') {
    const c = document.createElement('canvas');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    c.className = cls;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    Art.organism(x, sp, size / 2, size / 2 + size * 0.04, size * 0.4, 0.6);
    return c;
  }

  function renderTop() {
    const now = clock();
    document.getElementById('amount').textContent = fmt(state.plankton);
    document.getElementById('rate').textContent = `${T.perSec} ${fmt(Logic.perSecond(state, now))} · ${T.pearls} ${state.pearls}`;
    document.getElementById('pearlDot').hidden = Logic.pendingPearls(state) < 1;
    if (ui.sel < 0 && !ui.overlay) updateIdleSheet();
    else if (ui.sel >= 0) refreshAffordability();
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderSheet() {
    sheet.innerHTML = '';
    sheet.className = 'sheet';
    const now = clock();
    if (ui.moving) {
      sheet.classList.add('mode-move');
      sheet.append(el('p', 'big-hint', T.moveHint));
      const b = el('button', 'btn ghost', T.cancel);
      b.addEventListener('click', () => { ui.moving = false; sfx.soft(); renderSheet(); });
      sheet.append(b);
      return;
    }
    if (ui.sel < 0) {
      sheet.classList.add('mode-idle');
      const tideRow = el('div', 'tide-row');
      const sp = Logic.tide(state, now).species;
      const chip = el('span', 'chip');
      chip.append(icon(sp, 26, 'ico mini'), document.createTextNode(T.tide(T.species[sp])));
      tideRow.append(chip);
      sheet.append(tideRow);
      const task = el('div', 'task');
      task.innerHTML = '<span class="task-name"></span><span class="task-count"></span><div class="bar"><i></i></div>';
      sheet.append(task);
      sheet.append(el('p', 'hint', ''));
      sheet.append(el('p', 'next', ''));
      updateIdleSheet();
      return;
    }
    const tile = state.grid[ui.sel];
    if (!tile) {
      sheet.classList.add('mode-plant');
      sheet.append(el('p', 'sheet-title', `${T.emptyRock} · ${T.chooseSpecies}`));
      const row = el('div', 'cards');
      const shown = Math.min(Logic.SPECIES.length, state.unlocked + 1);
      for (let sp = 0; sp < shown; sp += 1) {
        const open = sp < state.unlocked;
        const card = el('button', `card${open ? '' : ' locked'}`);
        card.dataset.sp = String(sp);
        card.append(icon(sp, 46));
        card.append(el('b', '', open ? T.species[sp] : '?'));
        if (open) {
          card.append(el('span', 'cost', fmt(Logic.plantCost(state, sp))));
          card.append(el('span', 'like', `♥ ${T.species[Logic.SPECIES[sp].likes]}`));
        } else {
          card.append(el('span', 'like', T.locked(T.species[sp - 1])));
        }
        card.addEventListener('click', () => {
          if (!open) { sfx.nope(); return; }
          const res = Logic.plant(state, ui.sel, sp, clock());
          if (apply(res, sfx.plant)) {
            burst(ui.sel);
            renderSheet();
            renderTop();
          }
        });
        row.append(card);
      }
      sheet.append(row);
      refreshAffordability();
      return;
    }
    sheet.classList.add('mode-tile');
    const sp = Logic.SPECIES[tile.s];
    const head = el('div', 'tile-head');
    head.append(icon(tile.s, 54));
    const info = el('div', 'tile-info');
    info.append(el('b', '', `${T.species[tile.s]} · ${T.lv} ${tile.l}`));
    info.append(el('span', 'rate', `${T.perSec} ${fmt(Logic.tileRate(state, ui.sel, now))}`));
    const likedNow = Logic.liked(state, ui.sel);
    info.append(el('span', `like${likedNow ? ' on' : ''}`, `${likedNow ? '♥' : '♡'} ${likedNow ? T.likedOn(T.species[sp.likes]) : T.likedOff(T.species[sp.likes])}`));
    head.append(info);
    sheet.append(head);
    const row = el('div', 'actions');
    const grow = el('button', 'btn primary grow');
    grow.addEventListener('click', () => {
      if (apply(Logic.upgrade(state, ui.sel, clock()), sfx.grow)) {
        burst(ui.sel);
        renderSheet();
        renderTop();
      }
    });
    row.append(grow);
    const mv = el('button', 'btn', T.move);
    mv.addEventListener('click', () => { ui.moving = true; sfx.soft(); renderSheet(); });
    row.append(mv);
    const cl = el('button', `btn warn${ui.sure ? ' sure' : ''}`, ui.sure ? T.clearSure : T.clear);
    cl.addEventListener('click', () => {
      if (!ui.sure) { ui.sure = true; sfx.soft(); renderSheet(); return; }
      apply(Logic.clear(state, ui.sel, clock()), sfx.soft);
      ui.sure = false;
      renderSheet();
      renderTop();
    });
    row.append(cl);
    sheet.append(row);
    refreshAffordability();
  }

  function refreshAffordability() {
    if (ui.sel < 0) return;
    const tile = state.grid[ui.sel];
    if (!tile) {
      sheet.querySelectorAll('.card').forEach((card) => {
        const sp = Number(card.dataset.sp);
        if (sp < state.unlocked) card.classList.toggle('poor', state.plankton < Logic.plantCost(state, sp));
      });
      return;
    }
    const grow = sheet.querySelector('.grow');
    if (!grow) return;
    const max = tile.l >= Logic.MAX_LEVEL;
    const cost = Logic.upgradeCost(state, ui.sel);
    const text = max ? T.maxed : `${T.grow} · ${fmt(cost)}`;
    if (grow.textContent !== text) grow.textContent = text;
    grow.classList.toggle('poor', max || state.plankton < cost);
  }

  function updateIdleSheet() {
    const now = clock();
    const task = sheet.querySelector('.task');
    if (!task) return;
    const p = Logic.taskProgress(state, now);
    task.querySelector('.task-name').textContent = p.done ? T.taskDone : T.task[p.id];
    task.querySelector('.task-count').textContent = p.done ? '✓' : `${p.have} / ${p.goal}`;
    task.querySelector('.bar i').style.width = `${(p.have / p.goal) * 100}%`;
    task.classList.toggle('done', p.done);
    const hint = sheet.querySelector('.hint');
    const empty = state.grid.every((x) => !x);
    hint.textContent = empty && state.plankton < 10 ? T.hintFirst : T.hintIdle;
    const next = Logic.VISITORS.find((v) => !state.visitors.includes(v.id));
    sheet.querySelector('.next').textContent = next ? T.nextVisitor(T.visitors[next.id][1]) : T.allVisitors;
  }

  function burst(i) {
    const c = geo.cells[i];
    const t = performance.now() / 1000;
    for (let k = 0; k < 8; k += 1) fx.push({ kind: 'dot', x: c.x, y: c.y, vx: Math.cos(k * 0.8), vy: Math.sin(k * 0.8), t0: t, life: 0.8 });
    fx.push({ kind: 'ring', x: c.x, y: c.y, t0: t, life: 0.7 });
  }

  let toastTimer = 0;
  function showToast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = `toast ${kind || ''}`;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    if (!SHOT) toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  // 겹쳐 뜨는 화면: 도감, 물때 달력, 바다로 보내기, 다녀오셨어요
  function openOverlay(kind) {
    ui.overlay = kind;
    ui.sel = -1;
    ui.moving = false;
    overlay.hidden = false;
    overlay.className = `overlay ov-${kind}`;
    overlay.innerHTML = '';
    const panel = el('div', 'panel');
    const head = el('div', 'panel-head');
    const now = clock();
    if (kind === 'guide') {
      head.append(el('h2', '', T.guide));
      panel.append(head, el('p', 'sub', T.guideSub(state.visitors.length)));
      const grid = el('div', 'guide');
      Logic.VISITORS.forEach((v) => {
        const found = state.visitors.includes(v.id);
        const card = el('div', `entry${found ? ' found' : ''}`);
        const c = document.createElement('canvas');
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        c.width = 84 * dpr;
        c.height = 60 * dpr;
        c.style.width = '84px';
        c.style.height = '60px';
        const x = c.getContext('2d');
        x.scale(dpr, dpr);
        const s = v.id === 'whale' ? 22 : 24;
        if (found) Art.creature(x, v.id, 42 + (v.id === 'whale' ? 8 : 0), 30, s, 0.5, 1);
        else Art.silhouette(x, v.id, 42 + (v.id === 'whale' ? 8 : 0), 30, s);
        card.append(c, el('b', '', found ? T.visitors[v.id][0] : '???'), el('small', '', T.visitors[v.id][1]));
        grid.append(card);
      });
      panel.append(grid);
    } else if (kind === 'tide') {
      head.append(el('h2', '', T.calendar));
      panel.append(head, el('p', 'sub', T.stampSub(state.stamps.length)));
      const d = new Date(now);
      const y = d.getFullYear();
      const m = d.getMonth();
      panel.append(el('p', 'month', T.month(y, m + 1)));
      const cal = el('div', 'cal');
      T.week.forEach((w) => cal.append(el('span', 'wd', w)));
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      for (let k = 0; k < first; k += 1) cal.append(el('span', 'day blank'));
      for (let day = 1; day <= days; day += 1) {
        const key = Logic.dateKey(new Date(y, m, day).getTime());
        const cell = el('span', 'day', String(day));
        if (state.stamps.includes(key)) cell.classList.add('stamp');
        if (day === d.getDate()) cell.classList.add('today');
        cal.append(cell);
      }
      panel.append(cal);
      const tide = Logic.tide(state, now);
      const p = Logic.taskProgress(state, now);
      const today = el('div', 'today-box');
      today.append(icon(tide.species, 44));
      const tx = el('div', '');
      tx.append(el('b', '', T.tide(T.species[tide.species])));
      tx.append(el('span', '', p.done ? T.taskDone : `${T.task[p.id]} · ${p.have} / ${p.goal}`));
      today.append(tx);
      panel.append(today);
      const snd = el('button', `btn toggle${soundOn ? ' on' : ''}`, `${T.sound} ${soundOn ? 'ON' : 'OFF'}`);
      snd.addEventListener('click', () => {
        soundOn = !soundOn;
        try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* 무시 */ }
        snd.textContent = `${T.sound} ${soundOn ? 'ON' : 'OFF'}`;
        snd.classList.toggle('on', soundOn);
        sfx.soft();
      });
      panel.append(snd);
    } else if (kind === 'sea') {
      head.append(el('h2', '', T.sea));
      panel.append(head);
      const pearl = el('div', 'pearl-hero');
      pearl.innerHTML = '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M10 60 Q60 -10 110 60 Q60 84 10 60z" fill="#e7d7c1"/><path d="M14 60 Q60 78 106 60" stroke="#b39c7d" stroke-width="3" fill="none"/><circle cx="60" cy="48" r="17" fill="url(#pg)"/><defs><radialGradient id="pg" cx="0.35" cy="0.35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd8ef"/></radialGradient></defs></svg>';
      panel.append(pearl);
      panel.append(el('p', 'sea-text', T.seaText));
      const gain = Logic.pendingPearls(state);
      if (gain >= 1) {
        panel.append(el('p', 'sea-gain', T.seaGain(gain)));
        const go = el('button', 'btn primary wide', T.seaGo);
        go.addEventListener('click', () => {
          const res = Logic.release(state, clock());
          if (apply(res, sfx.pearl)) {
            closeOverlay();
            showToast(T.released(res.gain), 'pearl');
          }
        });
        panel.append(go);
      } else {
        const need = Logic.PEARL_UNIT - state.runEarned;
        panel.append(el('p', 'sea-gain dim', T.seaNeed(fmt(Math.max(1, need)))));
      }
    } else if (kind === 'welcome') {
      head.append(el('h2', '', T.welcome));
      panel.append(head);
      panel.append(el('p', 'welcome-num', `+${fmt(ui.welcome.gained)}`));
      panel.append(el('p', 'sea-text', T.welcomeText(fmt(ui.welcome.gained), T.hours(Math.round(ui.welcome.elapsed / 60000)))));
      const nv = Logic.VISITORS.find((v) => !state.visitors.includes(v.id));
      if (nv) panel.append(el('p', 'sea-text welcome-next', T.nextVisitor(T.visitors[nv.id][1])));
      const ok = el('button', 'btn primary wide', T.ok);
      ok.addEventListener('click', () => { closeOverlay(); sfx.plant(); });
      panel.append(ok);
    }
    const x = el('button', 'close', '×');
    x.setAttribute('aria-label', T.close);
    x.addEventListener('click', () => { closeOverlay(); sfx.soft(); });
    head.append(x);
    overlay.append(panel);
    renderSheet();
  }
  function closeOverlay() {
    ui.overlay = null;
    overlay.hidden = true;
    overlay.innerHTML = '';
    renderSheet();
    renderTop();
    if (window.onestoreAd) window.onestoreAd.atBreak();
  }
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { closeOverlay(); sfx.soft(); } });
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    sfx.soft();
    if (ui.overlay === b.dataset.open) closeOverlay();
    else openOverlay(b.dataset.open);
  }));

  window.appFlush = save;
  window.appBack = () => {
    if (ui.overlay) { closeOverlay(); return true; }
    if (ui.moving) { ui.moving = false; renderSheet(); return true; }
    if (ui.sel >= 0) { ui.sel = -1; renderSheet(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else if (!SHOT) {
      const r = Logic.tick(state, clock());
      state = r.state;
      if (r.elapsed > 60000 && r.gained >= 1) { ui.welcome = r; openOverlay('welcome'); }
      renderTop();
    }
  });

  // 스크린샷용 웅덩이
  function demo(n) {
    const s = Logic.newState(SHOT_NOW);
    const put = (i, sp, l) => { s.grid[i] = { s: sp, l }; };
    const layoutA = [[0, 0, 28], [1, 1, 24], [2, 0, 27], [3, 2, 14], [4, 1, 22], [5, 0, 30], [6, 2, 12], [7, 3, 9],
      [8, 4, 6], [9, 3, 11], [10, 2, 15], [11, 3, 8], [12, 0, 26], [13, 4, 4], [14, 5, 3], [15, 3, 10], [17, 1, 20], [18, 5, 2], [19, 4, 5]];
    if (n !== 3) layoutA.forEach(([i, sp, l]) => put(i, sp, l));
    else [[0, 6, 4], [1, 5, 12], [2, 3, 30], [3, 4, 22], [4, 5, 10], [5, 7, 2], [6, 6, 3], [7, 5, 9], [8, 4, 20], [9, 6, 5],
      [10, 5, 11], [11, 3, 28], [12, 4, 18], [13, 5, 8], [14, 6, 2], [15, 4, 16], [16, 3, 25], [17, 5, 7], [18, 4, 14], [19, 3, 26]].forEach(([i, sp, l]) => put(i, sp, l));
    s.unlocked = n === 3 ? 8 : 6;
    s.plankton = n === 3 ? 4.6e9 : 2386410;
    s.runEarned = n === 3 ? 9e9 : 3.1e6;
    s.totalEarned = n === 3 ? 2.4e10 : 3.1e6;
    s.pearls = n === 3 ? 14 : 2;
    s.releases = n === 3 ? 3 : 1;
    s.taps = 1460;
    s.visitors = n === 3 ? ['goby', 'shrimp', 'hermit', 'wrasse', 'seahorse', 'blenny', 'nudibranch', 'turtle', 'ray', 'moonjelly']
      : ['goby', 'shrimp', 'hermit', 'wrasse', 'seahorse', 'turtle', 'nudibranch'];
    s.daily = { date: Logic.dateKey(SHOT_NOW), taps: 96, plants: 3, upgrades: 11, done: false };
    s.stamps = ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
    return s;
  }

  let shotT = 2;
  // 첫 화면 스크린샷: 물을 막 저은 순간. 창 크기가 바뀌면 자리를 다시 잡는다.
  function shotScene() {
    fx.length = 0;
    if (SHOT === 1) {
      const a = geo.cells[9];
      const b = geo.cells[14];
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const t = shotT;
      fx.push({ kind: 'ring', x: c.x, y: c.y, t0: t - 0.2, life: 0.6 });
      for (let k = 0; k < 5; k += 1) fx.push({ kind: 'dot', x: c.x, y: c.y, vx: Math.cos(k * 1.3), vy: Math.sin(k * 1.3), t0: t - 0.25, life: 0.7 });
      fx.push({ kind: 'text', x: c.x, y: c.y - 10, text: `+${fmt(Logic.tapValue(state, clock()))}`, t0: t - 0.2, life: 0.9 });
    }
    draw(shotT);
  }
  function frame() {
    draw(performance.now() / 1000);
    requestAnimationFrame(frame);
  }

  function start() {
    const now = clock();
    if (SHOT) {
      document.body.classList.add('shot');
      state = demo(SHOT);
    } else {
      const r = Logic.tick(load(now), now);
      state = r.state;
      if (r.elapsed > 60000 && r.gained >= 1) ui.welcome = r;
    }
    layout();
    renderTop();
    renderSheet();
    if (SHOT === 1) {
      shotT = 3.2;
      shotScene();
      showToast(T.newVisitor(T.visitors.nudibranch[0]), 'visitor');
      return;
    }
    if (SHOT === 2) { shotT = 1.4; ui.sel = 16; renderSheet(); draw(shotT); return; }
    if (SHOT === 3) { shotT = 2.2; draw(shotT); openOverlay('guide'); return; }
    if (SHOT === 4) { shotT = 4.1; draw(shotT); openOverlay('tide'); return; }
    if (ui.welcome) openOverlay('welcome');
    requestAnimationFrame(frame);
    setInterval(() => {
      const r = Logic.tick(state, clock());
      apply(r);
      renderTop();
    }, 1000);
    setInterval(save, 5000);
  }

  window.addEventListener('resize', () => { layout(); if (SHOT) shotScene(); });
  start();
})();
