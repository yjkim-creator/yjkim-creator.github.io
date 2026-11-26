// 종이배 포구 화면. 약속: 1) localStorage는 try/catch 2) window.appFlush 3) window.appBack
// 4) #shot=번호 대표 화면 5) window.appDemo 시연(저장 기록과 분리) 6) 소리는 Sfx, 화면에 소리 끄기 버튼.
(function () {
  const KEY = 'paperharbor-v1';
  const ko = /^ko/i.test(navigator.language || '');
  const T = ko ? {
    voyage: '항해', today: '오늘', book: '도장첩', hint: '등대 빛', retry: '다시',
    voyageTitle: (n) => `${n}번째 포구`, dailyTitle: (i) => `오늘의 포구 ${i + 1}/3`,
    left: (n) => `남은 배 ${n}척`, winTitle: '포구가 비었어요!', loseTitle: '등불이 모두 꺼졌어요',
    loseBody: '부딪히면 등불이 하나씩 꺼져요. 뱃머리 앞이 트인 배부터 띄워 보세요.',
    toThree: (n) => `${n}번 덜 부딪히면 ★3!`, tryThree: '다시 해서 ★3 받기', loseProgress: (a, b) => `${b}척 중 ${a}척을 띄웠어요. 조금만 더!`,
    next: '다음 포구로', again: '다시 띄우기', nextDaily: '다음 판', allDaily: '오늘 세 판을 다 띄웠어요. 도장 꾹!',
    close: '닫기', sound: '소리', bookTitle: '항해 도장첩', stars: '모은 별', sailed: '띄운 배', reached: '도착한 포구', stampDays: '도장 찍은 날',
    tipFirst: '배를 톡 누르면 뱃머리 쪽으로 나가요', bump: '쿵!', sailOff: '출항', week: ['일', '월', '화', '수', '목', '금', '토'],
    monthTitle: (y, m) => `${y}년 ${m}월`, demo: '시연', winStat: (n, b) => `종이배 ${n}척 출항 · 부딪힘 ${b}번`,
    deco: '🎨 포구 꾸미기', decoTitle: '포구 꾸미기', wallet: (n) => `쓸 수 있는 별 ★${n}`, decoNote: '모은 별(기록·랭킹)은 줄지 않아요. 겉모습만 바뀌어요',
    kinds: { sail: '돛 색', sea: '바다', paper: '종이' }, use: '쓰기', inUse: '쓰는 중', earnMore: (n) => `★${n}`, gotStar: (n) => `★${n} 모았어요 · 🎨 꾸미기에 쓸 수 있어요`,
    looks: { basic: '기본', spring: '봄꽃', ocean: '파도', sunset: '노을', night: '밤하늘', rainbow: '무지개', noon: '한낮 바다', dusk: '노을 바다', moon: '달밤 바다', news: '신문지', sky: '하늘색 종이', gold: '금박 종이' },
  } : {
    voyage: 'Voyage', today: 'Today', book: 'Stamps', hint: 'Beacon', retry: 'Retry',
    voyageTitle: (n) => `Harbor ${n}`, dailyTitle: (i) => `Today's harbor ${i + 1}/3`,
    left: (n) => `${n} boats left`, winTitle: 'Harbor cleared!', loseTitle: 'All lanterns went out',
    loseBody: 'Each bump puts out a lantern. Start with boats whose bow has open water.',
    toThree: (n) => `${n} fewer bump${n === 1 ? '' : 's'} for ★3!`, tryThree: 'Try again for ★3', loseProgress: (a, b) => `You sailed ${a} of ${b} boats. So close!`,
    next: 'Next harbor', again: 'Sail again', nextDaily: 'Next one', allDaily: "All three of today's harbors are clear. Stamped!",
    close: 'Close', sound: 'Sound', bookTitle: 'Voyage stamp book', stars: 'Stars', sailed: 'Boats sailed', reached: 'Harbors reached', stampDays: 'Stamped days',
    tipFirst: 'Tap a boat and it sails toward its bow', bump: 'Bonk!', sailOff: 'Away', week: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    monthTitle: (y, m) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`, demo: 'Demo', winStat: (n, b) => `${n} boats sailed · ${b} bump${b === 1 ? '' : 's'}`,
    deco: '🎨 Decorate', decoTitle: 'Decorate the harbor', wallet: (n) => `Stars to spend ★${n}`, decoNote: 'Your collected stars (records, leaderboard) never go down. Only the look changes',
    kinds: { sail: 'Sails', sea: 'Sea', paper: 'Paper' }, use: 'Use', inUse: 'In use', earnMore: (n) => `★${n}`, gotStar: (n) => `★${n} collected · spend them in 🎨 Decorate`,
    looks: { basic: 'Classic', spring: 'Blossom', ocean: 'Waves', sunset: 'Sunset', night: 'Night sky', rainbow: 'Rainbow', noon: 'Noon sea', dusk: 'Dusk sea', moon: 'Moonlit sea', news: 'Newspaper', sky: 'Sky paper', gold: 'Gold leaf' },
  };

  // 꾸미기 겉모습. id 는 logic.js LOOKS 와 같다.
  const SAIL_SETS = {
    basic: ['#E8735A', '#F2B544', '#5BA88F', '#6C8FD6', '#C46FA8', '#E39B5B'],
    spring: ['#F4A6C1', '#FBD3E0', '#F7C873', '#B8E0A8', '#E59BB9', '#FFE4A8'],
    ocean: ['#2F7FB8', '#5FB4D9', '#9ED8E6', '#3A9C9F', '#7BC4C4', '#1D5F8A'],
    sunset: ['#F26B3A', '#F59E42', '#E84A5F', '#FFB86B', '#C9455B', '#FF8C5A'],
    night: ['#2B3A67', '#F2C94C', '#4B4E8C', '#E9D27A', '#1F2A4D', '#D7B54A'],
    rainbow: ['#E8475A', '#F59B2E', '#F2D43C', '#4CB866', '#3E8FD8', '#8E5BD1'],
  };
  const SEA_SETS = {
    basic: ['#2B7F96', '#155468', 'rgba(160,220,222,0.16)'],
    noon: ['#36B3C9', '#1C7C94', 'rgba(200,245,240,0.22)'],
    dusk: ['#8C5A8E', '#3E3266', 'rgba(255,190,160,0.16)'],
    moon: ['#1E3258', '#0C1630', 'rgba(220,230,255,0.12)'],
  };
  const PAPER_SETS = {
    basic: ['#FBF4E4', '#E9DCC0', '#B49C76'],
    news: ['#EFEFEA', '#D3D3CC', '#8D8D86'],
    sky: ['#E8F4FF', '#C6DEF5', '#7FA3C6'],
    gold: ['#FFF0B8', '#E9C766', '#B08A2E'],
  };
  const look = (kind) => (demo || SHOT ? 'basic' : (state.eq && state.eq[kind]) || 'basic');
  let SAILS = SAIL_SETS.basic;
  const shotMatch = /#shot=(\d+)/.exec(location.hash);
  const SHOT = shotMatch ? Number(shotMatch[1]) : 0;
  let demo = false;

  // ---------- 저장 ----------
  const load = () => {
    try { return Logic.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return Logic.newState(); }
  };
  const save = () => {
    if (demo || SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막혀도 앱은 돈다. */ }
  };

  let state = SHOT ? Logic.newState() : load();
  let ref = null; // 지금 판 { mode, level | date,index }
  let puzzle = null;
  let run = null;
  let hintId = null;
  let hintUntil = 0;
  let overlay = null; // 'win' | 'lose' | 'book'
  const anims = [];
  const parts = [];
  const floats = [];
  const rings = [];
  let shakeUntil = 0;

  // ---------- 소리 ----------
  Sfx.define('sail', (c, out, t, o) => {
    Sfx.noise(c, out, t, { freq: 500, to: 2600, dur: 0.45, vol: 0.18 * (o.vol ?? 1), filterType: 'bandpass', q: 1.2 });
    Sfx.tone(c, out, t + 0.02, { freq: 520 * (o.pitch || 1), to: 780 * (o.pitch || 1), dur: 0.22, vol: 0.1, type: 'triangle' });
  });
  Sfx.define('bonk', (c, out, t) => {
    Sfx.tone(c, out, t, { freq: 150, to: 70, dur: 0.22, vol: 0.4, type: 'sine' });
    Sfx.noise(c, out, t, { freq: 900, to: 200, dur: 0.12, vol: 0.2 });
  });
  Sfx.define('horn', (c, out, t) => {
    Sfx.tone(c, out, t, { freq: 196, dur: 0.55, vol: 0.2, type: 'sawtooth', filter: 700, attack: 0.06 });
    Sfx.tone(c, out, t + 0.6, { freq: 262, dur: 0.8, vol: 0.2, type: 'sawtooth', filter: 800, attack: 0.06 });
    Sfx.tone(c, out, t + 0.6, { freq: 392, dur: 0.8, vol: 0.08, type: 'triangle', attack: 0.06 });
  });
  Sfx.define('beacon', (c, out, t) => {
    [880, 1175, 1568].forEach((f, i) => Sfx.tone(c, out, t + i * 0.07, { freq: f, dur: 0.35, vol: 0.09, type: 'sine' }));
  });
  let musicOn = false;
  function startMusic() {
    if (musicOn || SHOT) return;
    musicOn = true;
    Sfx.music({ bpm: 82, mood: 'calm', seed: 17 });
  }

  // ---------- 화면 뼈대 ----------
  const app = document.getElementById('app');
  if (SHOT) document.body.classList.add('shot');
  app.innerHTML = `
    <header class="top">
      <div class="title"><span class="flag"></span><div><b id="t-title"></b><small id="t-left"></small></div></div>
      <div class="lanterns" id="lanterns" aria-label="lanterns"></div>
      <button class="icon sound" id="b-sound" aria-label="${T.sound}"></button>
    </header>
    <nav class="dailyrow" id="dailyrow"></nav>
    <section class="board" id="boardwrap"><canvas id="board"></canvas><p class="tip" id="tip"></p></section>
    <footer class="dock">
      <button class="tab" data-act="voyage"><span class="ico ico-sail"></span>${T.voyage}</button>
      <button class="tab" data-act="today"><span class="ico ico-sun"></span>${T.today}</button>
      <button class="tab" data-act="hint"><span class="ico ico-beam"></span>${T.hint}</button>
      <button class="tab" data-act="retry"><span class="ico ico-retry"></span>${T.retry}</button>
      <button class="tab" data-act="book"><span class="ico ico-book"></span>${T.book}</button>
    </footer>
    <div class="veil" id="veil" hidden></div>`;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const wrap = $('boardwrap');
  const veil = $('veil');

  const lanternSvg = (lit) => `<svg viewBox="0 0 24 32" class="lantern ${lit ? 'lit' : ''}"><rect x="9" y="1" width="6" height="3" rx="1"/><path d="M5 7h14l-2 19H7z" class="glass"/><rect x="6" y="5" width="12" height="3" rx="1.5"/><rect x="7" y="25" width="10" height="3" rx="1.5"/><circle cx="12" cy="16" r="3.2" class="flame"/></svg>`;

  function soundIcon() {
    const off = Sfx.muted;
    $('b-sound').innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${off ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`;
    $('b-sound').classList.toggle('off', off);
  }

  // ---------- 판 열기 ----------
  function today() { return SHOT ? '2026-11-17' : Logic.dateKey(new Date()); }

  function openRef(r, keepRun) {
    ref = r;
    puzzle = Logic.puzzleFor(r);
    run = keepRun ? { ...keepRun, removed: keepRun.removed.filter((id) => id < puzzle.boats.length) } : Logic.newRun();
    if (run.removed.length >= puzzle.boats.length) run = Logic.newRun();
    anims.length = 0;
    hintId = null;
    overlay = null;
    if (!demo) {
      state.current = { ...r, run };
      save();
    }
    layout();
    refreshHud();
    renderOverlay();
  }

  function openVoyage() { openRef({ mode: 'voyage', level: state.level }); }
  function openDaily(index) {
    const key = today();
    const row = state.daily[key] || [0, 0, 0];
    const i = index ?? Math.max(0, row.findIndex((v) => !v));
    openRef({ mode: 'daily', date: key, index: i === -1 ? 0 : i });
  }

  function refreshHud() {
    $('t-title').textContent = ref.mode === 'daily' ? T.dailyTitle(ref.index) : T.voyageTitle(ref.level);
    $('t-left').textContent = T.left(puzzle.boats.length - run.removed.length);
    $('lanterns').innerHTML = [0, 1, 2].map((i) => lanternSvg(i >= run.bumps)).join('');
    const row = state.daily[ref.date || today()] || [0, 0, 0];
    const dr = $('dailyrow');
    dr.hidden = ref.mode !== 'daily';
    dr.innerHTML = ref.mode === 'daily' ? [0, 1, 2].map((i) => `<button class="pill ${i === ref.index ? 'on' : ''}" data-day="${i}">${i + 1}<span>${'★'.repeat(row[i] || 0)}${'☆'.repeat(3 - (row[i] || 0))}</span></button>`).join('') : '';
    document.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('on', (b.dataset.act === 'voyage' && ref.mode === 'voyage' && overlay !== 'book') || (b.dataset.act === 'today' && ref.mode === 'daily' && overlay !== 'book') || (b.dataset.act === 'book' && overlay === 'book'));
    });
    $('tip').textContent = run.removed.length === 0 && run.bumps === 0 && (ref.mode === 'voyage' && ref.level <= 2) ? T.tipFirst : '';
    soundIcon();
  }

  // ---------- 판 크기 ----------
  let cell = 48;
  let ox = 0;
  let oy = 0;
  let cw = 0;
  let ch = 0;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  function layout() {
    const r = wrap.getBoundingClientRect();
    cw = Math.max(200, Math.floor(r.width));
    ch = Math.max(240, Math.floor(r.height));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    if (!puzzle) return;
    cell = Math.floor(Math.min((cw - 28) / puzzle.w, (ch - 28) / puzzle.h, 66));
    ox = Math.round((cw - cell * puzzle.w) / 2);
    oy = Math.round((ch - cell * puzzle.h) / 2);
  }

  // ---------- 그리기 ----------
  const ease = (t) => 1 - (1 - t) ** 3;
  function boatPose(b, now) {
    const a = anims.find((x) => x.id === b.id);
    const d = Logic.DIRS[b.dir];
    if (!a) return { dx: 0, dy: 0, alpha: 1, tilt: 0 };
    const t = Math.min(1, (now - a.t0) / a.dur);
    if (a.type === 'sail') {
      const k = (t * t) * (a.dist + b.len + 3);
      return { dx: d.dx * k * cell, dy: d.dy * k * cell, alpha: 1 - Math.max(0, (t - 0.55) / 0.45), tilt: 0 };
    }
    // bump: 앞으로 가다 쿵, 되돌아옴
    const go = a.dist + 0.22;
    const k = t < 0.45 ? ease(t / 0.45) * go : go * (1 - ease((t - 0.45) / 0.55));
    const wob = t > 0.4 && t < 0.8 ? Math.sin((t - 0.4) * 40) * 0.08 * (1 - (t - 0.4) / 0.4) : 0;
    return { dx: d.dx * k * cell, dy: d.dy * k * cell, alpha: 1, tilt: wob };
  }

  const ANG = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 };
  function drawBoat(b, now, glow) {
    const cells = Logic.cellsOf(b);
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const cx = ox + ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * cell;
    const cy = oy + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * cell;
    const pose = boatPose(b, now);
    if (pose.alpha <= 0) return;
    const L = b.len * cell;
    const W = cell * 0.66;
    const p = cell * 0.1;
    ctx.save();
    ctx.globalAlpha = pose.alpha;
    ctx.translate(cx + pose.dx, cy + pose.dy);
    ctx.rotate(ANG[b.dir] + pose.tilt);
    const bob = Math.sin(now / 700 + b.id * 1.7) * cell * 0.015;
    ctx.translate(0, bob);
    // 그림자
    ctx.fillStyle = 'rgba(8,40,52,0.28)';
    hull(L, W, p, 3, 4);
    ctx.fill();
    if (glow) {
      ctx.shadowColor = 'rgba(255,236,160,0.95)';
      ctx.shadowBlur = 18 + Math.sin(now / 120) * 6;
    }
    // 종이 선체: 위·아래 접힌 두 면
    const pap = PAPER_SETS[look('paper')] || PAPER_SETS.basic;
    hull(L, W, p, 0, 0);
    ctx.fillStyle = pap[0];
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    hull(L, W, p, 0, 0);
    ctx.clip();
    ctx.fillStyle = pap[1];
    ctx.fillRect(-L / 2, 0, L, W);
    ctx.restore();
    ctx.strokeStyle = pap[2];
    ctx.lineWidth = 1.4;
    hull(L, W, p, 0, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-L / 2 + p + 2, 0);
    ctx.lineTo(L / 2 - p - 4, 0);
    ctx.stroke();
    // 돛: 칸마다 하나
    SAILS = SAIL_SETS[look('sail')] || SAIL_SETS.basic;
    const sail = SAILS[b.hue % SAILS.length];
    for (let i = 0; i < b.len; i += 1) {
      const sx = L / 2 - cell * (i + 0.5) - (i === 0 ? cell * 0.06 : 0);
      ctx.beginPath();
      ctx.moveTo(sx + cell * 0.2, 0);
      ctx.lineTo(sx - cell * 0.2, -W * 0.36);
      ctx.lineTo(sx - cell * 0.14, 0);
      ctx.closePath();
      ctx.fillStyle = sail;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + cell * 0.2, 0);
      ctx.lineTo(sx - cell * 0.14, 0);
      ctx.lineTo(sx - cell * 0.2, W * 0.3);
      ctx.closePath();
      ctx.fillStyle = shade(sail, -0.18);
      ctx.fill();
      ctx.fillStyle = '#6B4F33';
      ctx.beginPath();
      ctx.arc(sx - cell * 0.06, 0, cell * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    // 뱃머리 방향 표시
    ctx.fillStyle = 'rgba(70,52,30,0.55)';
    ctx.beginPath();
    const bx = L / 2 - p - W * 0.42;
    ctx.moveTo(bx + W * 0.2, 0);
    ctx.lineTo(bx - W * 0.02, -W * 0.13);
    ctx.lineTo(bx - W * 0.02, W * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function hull(L, W, p, sx, sy) {
    ctx.beginPath();
    ctx.moveTo(-L / 2 + p + sx, -W / 2 + sy + W * 0.08);
    ctx.lineTo(L / 2 - W * 0.55 + sx, -W / 2 + sy);
    ctx.quadraticCurveTo(L / 2 - p * 0.6 + sx, -W * 0.18 + sy, L / 2 - p * 0.5 + sx, sy);
    ctx.quadraticCurveTo(L / 2 - p * 0.6 + sx, W * 0.18 + sy, L / 2 - W * 0.55 + sx, W / 2 + sy);
    ctx.lineTo(-L / 2 + p + sx, W / 2 + sy - W * 0.08);
    ctx.quadraticCurveTo(-L / 2 + p * 0.3 + sx, sy, -L / 2 + p + sx, -W / 2 + sy + W * 0.08);
    ctx.closePath();
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  function drawRock(r) {
    const x = ox + (r.x + 0.5) * cell;
    const y = oy + (r.y + 0.5) * cell;
    ctx.fillStyle = 'rgba(8,40,52,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 4, cell * 0.4, cell * 0.33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7C8A8C';
    ctx.beginPath();
    ctx.moveTo(x - cell * 0.38, y + cell * 0.12);
    ctx.quadraticCurveTo(x - cell * 0.34, y - cell * 0.34, x, y - cell * 0.36);
    ctx.quadraticCurveTo(x + cell * 0.4, y - cell * 0.3, x + cell * 0.38, y + cell * 0.1);
    ctx.quadraticCurveTo(x + cell * 0.2, y + cell * 0.36, x - cell * 0.05, y + cell * 0.32);
    ctx.quadraticCurveTo(x - cell * 0.36, y + cell * 0.32, x - cell * 0.38, y + cell * 0.12);
    ctx.fill();
    ctx.fillStyle = '#A3B0AE';
    ctx.beginPath();
    ctx.ellipse(x - cell * 0.1, y - cell * 0.14, cell * 0.16, cell * 0.09, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6E9A62';
    ctx.beginPath();
    ctx.arc(x + cell * 0.18, y + cell * 0.12, cell * 0.06, 0, Math.PI * 2);
    ctx.arc(x + cell * 0.26, y + cell * 0.06, cell * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWater(now) {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    const sea = SEA_SETS[look('sea')] || SEA_SETS.basic;
    g.addColorStop(0, sea[0]);
    g.addColorStop(1, sea[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    // 먼바다 물결 줄
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 2;
    for (let y = 10; y < ch; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 12) {
        const yy = y + Math.sin(x / 26 + now / 1400 + y) * 2.4;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    if (!puzzle) return;
    const bw = cell * puzzle.w;
    const bh = cell * puzzle.h;
    // 포구 안쪽 잔잔한 물
    ctx.fillStyle = sea[2];
    roundRect(ox - 6, oy - 6, bw + 12, bh + 12, 14);
    ctx.fill();
    // 밧줄 테두리(점선)
    ctx.setLineDash([2, 7]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(245,226,190,0.75)';
    ctx.lineWidth = 3;
    roundRect(ox - 6, oy - 6, bw + 12, bh + 12, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    // 칸 표시: 물 위 작은 점
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 0; y <= puzzle.h; y += 1) {
      for (let x = 0; x <= puzzle.w; x += 1) {
        ctx.beginPath();
        ctx.arc(ox + x * cell, oy + y * cell, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (now < shakeUntil) {
      const k = (shakeUntil - now) / 260;
      ctx.translate((Math.random() - 0.5) * 9 * k, (Math.random() - 0.5) * 9 * k);
    }
    drawWater(now);
    if (puzzle) {
      // 물결 고리
      for (const r of rings) {
        const t = (now - r.t0) / r.dur;
        if (t > 1) continue;
        ctx.strokeStyle = `rgba(${r.color},${(1 - t) * 0.8})`;
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r * (0.3 + t), r.r * (0.3 + t) * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const r of puzzle.rocks) drawRock(r);
      const removed = new Set(run.removed);
      const glowing = hintId !== null && now < hintUntil ? hintId : null;
      for (const b of puzzle.boats) {
        if (removed.has(b.id) && !anims.some((a) => a.id === b.id)) continue;
        drawBoat(b, now, b.id === glowing);
      }
    }
    // 물보라와 종이 조각
    for (const p of parts) {
      const t = (now - p.t0) / p.life;
      if (t > 1) continue;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      const x = p.x + p.vx * t * p.life / 1000;
      const y = p.y + p.vy * t * p.life / 1000 + 260 * (t * p.life / 1000) ** 2 * p.g;
      if (p.paper) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * p.spin);
        ctx.fillRect(-p.s, -p.s * 0.6, p.s * 2, p.s * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, p.s * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const f of floats) {
      const t = (now - f.t0) / 900;
      if (t > 1) continue;
      ctx.globalAlpha = 1 - t * t;
      ctx.font = `700 ${Math.round(18 + 6 * Math.sin(Math.min(1, t * 3) * Math.PI))}px Georgia, "Noto Serif KR", serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20,50,60,0.7)';
      ctx.strokeText(f.text, f.x, f.y - t * 40);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - t * 40);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function sweep(now) {
    for (let i = anims.length - 1; i >= 0; i -= 1) if (now - anims[i].t0 > anims[i].dur) anims.splice(i, 1);
    for (let i = parts.length - 1; i >= 0; i -= 1) if (now - parts[i].t0 > parts[i].life) parts.splice(i, 1);
    for (let i = floats.length - 1; i >= 0; i -= 1) if (now - floats[i].t0 > 900) floats.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].t0 > rings[i].dur) rings.splice(i, 1);
  }

  function loop(now) {
    sweep(now);
    draw(now);
    requestAnimationFrame(loop);
  }

  // ---------- 효과 ----------
  function centerOf(b) {
    const cs = Logic.cellsOf(b);
    return { x: ox + (cs[0].x + 0.5) * cell, y: oy + (cs[0].y + 0.5) * cell };
  }
  function splash(x, y, n, color, now) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 120;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 1, s: 2 + Math.random() * 3, color, t0: now, life: 500 + Math.random() * 400 });
    }
  }
  function confetti(now) {
    for (let i = 0; i < 70; i += 1) {
      parts.push({ x: cw / 2 + (Math.random() - 0.5) * cw * 0.8, y: ch * 0.15 + Math.random() * 30, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 160, g: 1.4, s: 4 + Math.random() * 3, color: SAILS[i % SAILS.length], paper: true, spin: (Math.random() - 0.5) * 18, t0: now + Math.random() * 300, life: 1600 + Math.random() * 800 });
    }
  }

  // ---------- 조작 ----------
  function tapBoat(id, now) {
    if (overlay || !puzzle) return;
    const b = puzzle.boats.find((x) => x.id === id);
    if (!b || run.removed.includes(id) || anims.some((a) => a.id === id)) return;
    const res = Logic.tap(puzzle, run, id);
    run = res.run;
    const at = centerOf(b);
    if (res.result === 'sail' || res.result === 'win') {
      anims.push({ type: 'sail', id, t0: now, dur: 700 + res.dist * 40, dist: res.dist });
      Sfx.play('sail', { pitch: 0.85 + Math.random() * 0.3 });
      rings.push({ x: at.x, y: at.y, r: cell * 0.9, t0: now, dur: 700, color: '255,255,255' });
      splash(at.x, at.y, 10, 'rgba(230,248,250,0.9)', now);
      if (!demo) state.sailed += 1;
    } else {
      anims.push({ type: 'bump', id, t0: now, dur: 520, dist: res.dist });
      Sfx.play('whoosh', { vol: 0.5 });
      setTimeout(() => {
        Sfx.play('bonk');
        const t = performance.now();
        shakeUntil = t + 260;
        const d = Logic.DIRS[b.dir];
        const hx = at.x + d.dx * (res.dist + 0.5) * cell;
        const hy = at.y + d.dy * (res.dist + 0.5) * cell;
        splash(hx, hy, 14, 'rgba(255,220,150,0.95)', t);
        floats.push({ text: T.bump, x: hx, y: hy, color: '#FFD27A', t0: t });
        refreshHud();
        if (!demo && window.Haptics) Haptics.buzz('tick');
      }, 230);
    }
    hintId = null;
    if (!demo) { state.current = { ...ref, run }; save(); }
    refreshHud();
    if (res.result === 'win') finish(true, now);
    if (res.result === 'lose') finish(false, now);
  }

  function finish(won, now) {
    if (won) {
      if (!demo) {
        state = Logic.recordWin(state, ref, run.bumps);
        state.current = null;
        save();
      }
      setTimeout(() => {
        Sfx.play('horn');
        if (!demo && window.Haptics) Haptics.buzz('big');
        confetti(performance.now());
        overlay = 'win';
        renderOverlay();
      }, 650);
    } else {
      setTimeout(() => {
        Sfx.play('lose');
        overlay = 'lose';
        renderOverlay();
      }, 700);
      if (!demo) { state.current = null; save(); }
    }
    void now;
  }

  function starsHtml(n) {
    return [0, 1, 2].map((i) => `<span class="star ${i < n ? 'got' : ''}" style="animation-delay:${0.15 + i * 0.18}s">★</span>`).join('');
  }

  function renderOverlay() {
    if (!overlay) { veil.hidden = true; veil.innerHTML = ''; refreshHud(); return; }
    veil.hidden = false;
    if (overlay === 'win') {
      const stars = Logic.starsFor(run.bumps);
      const row = ref.mode === 'daily' ? (state.daily[ref.date] || [0, 0, 0]) : null;
      const allDaily = row && row.every((v) => v > 0);
      veil.innerHTML = `<div class="card win"><div class="paperboat"></div><h2>${T.winTitle}</h2><div class="stars">${starsHtml(stars)}</div>
        <p class="winstat">${T.winStat(puzzle.boats.length, run.bumps)}</p>
        ${stars < 3 ? `<p class="to-three">${T.toThree(Logic.bumpsToThree(run.bumps))}</p>` : ''}
        ${allDaily ? `<p class="stamp-note"><span class="stamp">✓</span>${T.allDaily}</p>` : ''}
        ${!demo && !SHOT ? `<p class="deco-hint">${T.gotStar(Logic.wallet(state))}</p>` : ''}
        <button class="primary" data-act="${ref.mode === 'daily' ? (allDaily ? 'book' : 'nextdaily') : 'next'}">${ref.mode === 'daily' ? (allDaily ? T.book : T.nextDaily) : T.next}</button>${stars < 3 ? `<button class="retry-three" data-act="retry">${T.tryThree}</button>` : ''}</div>`;
    } else if (overlay === 'lose') {
      veil.innerHTML = `<div class="card lose"><div class="lanterns big">${[0, 1, 2].map(() => lanternSvg(false)).join('')}</div><h2>${T.loseTitle}</h2>${run.removed.length ? `<p class="lose-progress">${T.loseProgress(run.removed.length, puzzle.boats.length)}</p>` : ''}<p>${T.loseBody}</p><button class="primary" data-act="retry">${T.again}</button></div>`;
    } else if (overlay === 'book') {
      veil.innerHTML = bookHtml();
    } else if (overlay === 'deco') {
      veil.innerHTML = decoHtml();
    }
    refreshHud();
  }

  function bookHtml() {
    const now = SHOT ? new Date(2026, 10, 17) : new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i += 1) cells += '<i></i>';
    for (let d = 1; d <= days; d += 1) {
      const key = Logic.dateKey(new Date(y, m, d));
      const row = state.daily[key];
      const full = row && row.every((v) => v > 0);
      const some = row && row.some((v) => v > 0);
      const isToday = key === today();
      cells += `<i class="${full ? 'full' : some ? 'some' : ''} ${isToday ? 'today' : ''}" style="--r:${(d * 37) % 21 - 10}deg"><b>${d}</b>${full ? '<span class="seal"></span>' : ''}</i>`;
    }
    return `<div class="card book"><h2>${T.bookTitle}</h2>
      <div class="statgrid"><div><b>${Logic.totalStars(state)}</b><span>${T.stars}</span></div><div><b>${state.sailed}</b><span>${T.sailed}</span></div><div><b>${state.level}</b><span>${T.reached}</span></div><div><b>${Logic.stampDays(state)}</b><span>${T.stampDays}</span></div></div>
      <h3>${T.monthTitle(y, m + 1)}</h3>
      <div class="cal">${T.week.map((w) => `<em>${w}</em>`).join('')}${cells}</div>
      <button class="primary deco-btn" data-act="deco" style="margin-bottom:8px">${T.deco} · ★${Logic.wallet(state)}</button>
      <button class="primary" data-rank-open style="margin-bottom:8px">${/^en/i.test(navigator.language || '') ? '🏆 Leaderboard' : '🏆 전국 랭킹'}</button>
      <button class="primary" data-act="close">${T.close}</button></div>`;
  }

  // 꾸미기 창: 종류마다 견본과 단추. 산 것은 '쓰기', 쓰는 중이면 표시만.
  function swatch(kind, id) {
    if (kind === 'sail') return `<span class="sw">${SAIL_SETS[id].slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
    if (kind === 'sea') return `<span class="sw sea" style="background:linear-gradient(${SEA_SETS[id][0]},${SEA_SETS[id][1]})"></span>`;
    return `<span class="sw paper" style="background:linear-gradient(${PAPER_SETS[id][0]} 50%,${PAPER_SETS[id][1]} 50%);border-color:${PAPER_SETS[id][2]}"></span>`;
  }
  function decoHtml() {
    const w = Logic.wallet(state);
    const rows = Object.keys(Logic.LOOKS).map((kind) => `<h3>${T.kinds[kind]}</h3><ul class="deco">${Logic.LOOKS[kind].map((it) => {
      const owned = it.id === 'basic' || state.own.includes(it.id);
      const on = (state.eq[kind] || 'basic') === it.id;
      const btn = on ? `<button disabled class="on">${T.inUse}</button>`
        : owned ? `<button data-look="${kind}:${it.id}">${T.use}</button>`
          : `<button data-look="${kind}:${it.id}" ${w < it.cost ? 'disabled' : ''}>★${it.cost}</button>`;
      return `<li class="${on ? 'on' : ''}">${swatch(kind, it.id)}<b>${T.looks[it.id]}</b>${btn}</li>`;
    }).join('')}</ul>`).join('');
    return `<div class="card book decocard"><h2>${T.decoTitle}</h2><p class="wallet">${T.wallet(w)}</p>${rows}
      <p class="deco-note">${T.decoNote}</p>
      <button class="primary" data-act="book">${T.close}</button></div>`;
  }

  function act(name) {
    startMusic();
    if (demo && name !== 'sound') return;
    const now = performance.now();
    if (name === 'voyage') { Sfx.play('select'); openVoyage(); }
    else if (name === 'today') { Sfx.play('select'); openDaily(); }
    else if (name === 'retry') { if (window.onestoreAd) window.onestoreAd.atBreak(); Sfx.play('back'); openRef(ref); }
    else if (name === 'next') { if (window.onestoreAd) window.onestoreAd.atBreak(); Sfx.play('select'); openVoyage(); }
    else if (name === 'nextdaily') { if (window.onestoreAd) window.onestoreAd.atBreak(); Sfx.play('select'); openDaily(); }
    else if (name === 'book') { Sfx.play('select'); overlay = 'book'; renderOverlay(); }
    else if (name === 'close') { Sfx.play('back'); overlay = null; renderOverlay(); }
    else if (name === 'deco') { Sfx.play('select'); overlay = 'deco'; renderOverlay(); }
    else if (name === 'hint') {
      if (overlay) return;
      const free = Logic.freeBoats(puzzle, run.removed).filter((id) => !anims.some((a) => a.id === id));
      if (!free.length) return;
      hintId = free[0];
      hintUntil = now + 2200;
      Sfx.play('beacon');
      const at = centerOf(puzzle.boats.find((b) => b.id === hintId));
      rings.push({ x: at.x, y: at.y, r: cell * 1.3, t0: now, dur: 1100, color: '255,236,160' });
    }
  }

  document.addEventListener('click', (e) => {
    const lk = e.target.closest('[data-look]');
    if (lk && !demo) {
      const [kind, id] = lk.dataset.look.split(':');
      const had = id === 'basic' || state.own.includes(id);
      const next = had ? Logic.equipLook(state, kind, id) : Logic.buyLook(state, kind, id);
      if (next) { state = next; save(); Sfx.play(had ? 'select' : 'horn'); renderOverlay(); }
      return;
    }
    const el = e.target.closest('[data-act],[data-day]');
    if (el && el.dataset.day !== undefined) {
      startMusic();
      if (demo) return;
      Sfx.play('select');
      openDaily(Number(el.dataset.day));
    } else if (el) act(el.dataset.act);
  });
  $('b-sound').addEventListener('click', () => {
    Sfx.setMuted(!Sfx.muted);
    if (!Sfx.muted) { Sfx.play('tap'); musicOn = false; startMusic(); }
    soundIcon();
  });

  canvas.addEventListener('pointerdown', (e) => {
    startMusic();
    if (demo || overlay || !puzzle) return;
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - ox) / cell);
    const y = Math.floor((e.clientY - r.top - oy) / cell);
    const id = Logic.boatAt(puzzle, new Set(run.removed), x, y);
    const now = performance.now();
    if (id === null) {
      rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 22, t0: now, dur: 500, color: '255,255,255' });
      Sfx.play('tap', { vol: 0.4, pitch: 0.8 });
      return;
    }
    tapBoat(id, now);
  });

  // ---------- 약속 2, 3 ----------
  window.appFlush = save;
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.appBack = () => {
    if (demo) return true;
    if (overlay === 'deco') { overlay = 'book'; renderOverlay(); return true; }
    if (overlay === 'book') { overlay = null; renderOverlay(); return true; }
    if (ref && ref.mode === 'daily') { openVoyage(); return true; }
    return false;
  };

  // ---------- 약속 5: 시연 ----------
  window.appDemo = function appDemo() {
    if (demo) return true;
    demo = true;
    const saved = JSON.stringify(state);
    musicOn = false;
    startMusic();
    const stages = [{ mode: 'voyage', level: 7 }, { mode: 'daily', date: '2026-11-17', index: 2 }];
    const start = performance.now();
    let stage = 0;
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    async function playStage(r) {
      overlay = null;
      openRef(r);
      await wait(900);
      const layers = Logic.solve(puzzle);
      const order = layers.flat();
      let bumped = false;
      for (let i = 0; i < order.length; i += 1) {
        if (!bumped && i === 2) {
          // 일부러 막힌 배를 한 번 눌러 부딪힘을 보여 준다.
          const stuck = puzzle.boats.find((b) => !run.removed.includes(b.id) && !Logic.pathStatus(puzzle, new Set(run.removed), b.id).free);
          if (stuck) {
            bumped = true;
            pointAt(stuck);
            tapBoat(stuck.id, performance.now());
            await wait(900);
          }
        }
        const b = puzzle.boats.find((x) => x.id === order[i]);
        pointAt(b);
        tapBoat(b.id, performance.now());
        await wait(i < 4 ? 620 : 430);
      }
      await wait(3200);
    }
    function pointAt(b) {
      const c = centerOf(b);
      rings.push({ x: c.x, y: c.y, r: 26, t0: performance.now(), dur: 450, color: '255,240,200' });
      Sfx.play('tap', { vol: 0.35 });
    }
    (async () => {
      while (performance.now() - start < 32000) {
        await playStage(stages[stage % stages.length]);
        stage += 1;
      }
      demo = false;
      state = Logic.sanitize(JSON.parse(saved));
      overlay = null;
      if (state.current) openRef(state.current, state.current.run); else openVoyage();
    })();
    return true;
  };

  // ---------- 시작 ----------
  window.addEventListener('resize', () => { layout(); draw(SHOT ? 1000 : performance.now()); });

  function shotSetup(n) {
    state = Logic.newState();
    state.level = 9;
    state.sailed = 214;
    for (let l = 1; l < 9; l += 1) state.best[l] = l % 3 === 0 ? 2 : 3;
    for (const d of [2, 3, 5, 6, 9, 10, 11, 13, 14, 16]) state.daily[`2026-11-${String(d).padStart(2, '0')}`] = [3, d % 2 ? 2 : 3, 3];
    state.daily['2026-11-17'] = [3, 2, 0];
    if (n === 1) {
      openRef({ mode: 'voyage', level: 9 });
      const order = Logic.solve(puzzle).flat();
      run = { ...run, removed: order.slice(0, Math.floor(order.length * 0.3)), bumps: 1 };
      const next = puzzle.boats.find((b) => b.id === order[Math.floor(order.length * 0.3)]);
      hintId = next.id;
      hintUntil = Infinity;
      refreshHud();
    } else if (n === 2) {
      openRef({ mode: 'voyage', level: 9 });
      run = { ...run, removed: puzzle.boats.map((b) => b.id), done: true, bumps: 0 };
      overlay = 'win';
      renderOverlay();
    } else if (n === 3) {
      openRef({ mode: 'daily', date: '2026-11-17', index: 2 });
      const order = Logic.solve(puzzle).flat();
      run = { ...run, removed: order.slice(0, 3) };
      refreshHud();
    } else {
      openRef({ mode: 'voyage', level: 9 });
      overlay = 'book';
      renderOverlay();
    }
  }

  function boot() {
    if (SHOT) {
      shotSetup(SHOT);
      layout();
      // 헤드리스 스크린샷은 rAF가 거의 돌지 않으므로 바로 그리고, 늦게 오는 resize 때 다시 그린다.
      draw(1000);
      if (SHOT === 2) {
        const now = 1000;
        confetti(now - 600);
        draw(1000);
      }
      return;
    }
    if (state.current) openRef(state.current, state.current.run);
    else openVoyage();
    requestAnimationFrame(loop);
  }
  boot();
})();
