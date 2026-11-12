// 공책 골프 화면. 지키는 약속:
// 1) localStorage는 try/catch로 감싼다. 2) window.appFlush는 앱이 가려질 때 저장한다.
// 3) window.appBack은 뒤로 갈 화면이 있으면 처리하고 true를 돌려준다.
// 4) 주소가 #shot=번호이면 그 번호의 대표 화면을 그린다(스토어 스크린샷용).
(function () {
  const KEY = 'notebook-putt-v1';
  const L = Logic;
  const shotMatch = /#shot=(\d+)/.exec(location.hash);
  const SHOT = shotMatch ? Number(shotMatch[1]) : 0;
  const ko = /^ko\b/i.test(navigator.language || '');

  const TEXT = ko ? {
    daily: '오늘의 6홀', ladder: '계단 코스', hole: '홀', par: '파', strokes: '타수', floor: '층',
    hint: '화면 어디서든 끌어서 겨냥하고, 놓으면 칩니다', water: '퐁당! 1타 벌점, 친 자리에서 다시',
    next: '다음 홀', nextFloor: '다음 층', result: '스코어카드 보기', records: '기록', close: '닫기',
    roundDone: '오늘 라운드 끝', tomorrow: '내일은 새 코스 6홀이 그려집니다', goLadder: '계단 코스 치기',
    total: '합계', rounds: '라운드', aces: '홀인원', best: '최고 성적', ladderBest: '계단 최고', streakDays: '이어진 날',
    shots: (n) => `${n}타`, underPar: (n) => `파 이하 ${n}홀`, legend: ['파보다 적게', '파', '파보다 많이'], floorN: (n) => `${n}층`, pickup: '공을 집어 들었어요', sound: '소리', months: (y, m) => `${y}년 ${m}월`,
    days: ['일', '월', '화', '수', '목', '금', '토'], prev: '이전 달', nextMonth: '다음 달',
    names: { ace: '홀인원!', eagle: '이글!', birdie: '버디!', par: '파', bogey: '보기', double: '더블 보기', over: '오버', pickup: '다음엔 꼭' },
  } : {
    daily: "Today's 6", ladder: 'Ladder', hole: 'Hole', par: 'Par', strokes: 'Strokes', floor: 'Floor',
    hint: 'Drag anywhere to aim, release to putt', water: 'Splash! +1 penalty, replay from your spot',
    next: 'Next hole', nextFloor: 'Next floor', result: 'See scorecard', records: 'Records', close: 'Close',
    roundDone: "Today's round is in", tomorrow: 'Six new holes get drawn tomorrow', goLadder: 'Play the ladder',
    total: 'Total', rounds: 'Rounds', aces: 'Aces', best: 'Best round', ladderBest: 'Ladder best', streakDays: 'Days in a row',
    shots: (n) => `${n} ${n === 1 ? 'stroke' : 'strokes'}`, underPar: (n) => `${n} at or under par`, legend: ['Under par', 'Even', 'Over par'], floorN: (n) => `Floor ${n}`, pickup: 'Ball picked up', sound: 'Sound',
    months: (y, m) => new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], prev: 'Previous month', nextMonth: 'Next month',
    names: { ace: 'Hole in one!', eagle: 'Eagle!', birdie: 'Birdie!', par: 'Par', bogey: 'Bogey', double: 'Double bogey', over: 'Over par', pickup: 'Next time' },
  };
  document.documentElement.lang = ko ? 'ko' : 'en';
  // 스토어 스크린샷은 412px 폭 폰 화면으로 찍힌다. 창 없는 브라우저는 더 넓게 열리므로 그 폭에 맞춘다.
  if (SHOT && innerWidth > 412) document.body.style.width = '412px';

  // ---------- 저장 ----------

  const today = () => (SHOT ? '2026-11-03' : L.dateKey(new Date()));
  function load() {
    try { return L.sanitize(JSON.parse(localStorage.getItem(KEY)), today()); } catch { return L.newState(today()); }
  }
  function save() {
    if (SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막힌 환경에서도 앱은 돌아간다. */ }
  }

  let state = load();

  // ---------- 소리 ----------

  let audio = null;
  function ctx() {
    if (!state.sound) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch { return null; }
  }
  function tone(freq, to, dur, type, vol, delay) {
    const a = ctx();
    if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(dur, from, to, vol) {
    const a = ctx();
    if (!a) return;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    src.buffer = buf;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(from, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  const sfx = {
    tap: () => tone(1400, 900, 0.04, 'square', 0.03),
    putt: (p) => { noise(0.05, 4000, 1500, 0.25); tone(520 + p * 300, 300, 0.08, 'triangle', 0.12); },
    wall: (s) => tone(180 + Math.min(s, 15) * 14, 120, 0.07, 'triangle', Math.min(0.18, 0.03 + s * 0.012)),
    bumper: () => { tone(620, 980, 0.12, 'sine', 0.14); tone(930, 1400, 0.1, 'sine', 0.05, 0.02); },
    water: () => { noise(0.45, 2200, 200, 0.35); tone(400, 90, 0.3, 'sine', 0.1); },
    cup: () => { tone(320, 110, 0.14, 'sine', 0.2); tone(784, 784, 0.18, 'triangle', 0.09, 0.16); tone(1047, 1047, 0.3, 'triangle', 0.09, 0.26); },
    ace: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.08, 0.15 + i * 0.08)),
  };

  // ---------- 화면 뼈대 ----------

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page">
      <div class="rings" aria-hidden="true"></div>
      <header class="top">
        <div class="tabs" role="tablist">
          <button class="tab" data-mode="daily" role="tab">${TEXT.daily}</button>
          <button class="tab" data-mode="ladder" role="tab">${TEXT.ladder}</button>
        </div>
        <button class="icon" id="soundBtn" aria-label="${TEXT.sound}"></button>
        <button class="icon" id="recBtn" aria-label="${TEXT.records}">
          <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2.3"/></svg>
        </button>
      </header>
      <section class="cards">
        <div class="card hole-card"><small id="holeLabel"></small><b id="holeNum"></b></div>
        <div class="card"><small>${TEXT.par}</small><b id="parNum"></b></div>
        <div class="card strokes-card"><small>${TEXT.strokes}</small><div class="dots" id="dots"></div></div>
      </section>
      <div class="mini" id="mini"></div>
      <div class="board" id="board"><canvas id="cv"></canvas><div class="toast" id="toast"></div></div>
      <p class="hint" id="hint">${TEXT.hint}</p>
    </div>
    <div class="sheet hidden" id="sheet"></div>
    <div class="records hidden" id="records"></div>`;

  const $ = (id) => document.getElementById(id);
  const board = $('board');
  const cv = $('cv');
  const g = cv.getContext('2d');

  // ---------- 진행 ----------

  let hole = L.currentHole(state);
  let ball = null; // 굴러가는 공
  let rest = null; // 멈춘 공 자리
  let shotFrom = null;
  let aim = null;
  let trail = [];
  let splash = null;
  let sinking = 0;
  let pendingOut = null;
  let steps = 0;
  let layer = null;
  let cell = 30;
  let recordMonth = null;

  const cur = () => (state.mode === 'ladder' ? state.ladder : state.daily);
  function resetBall() {
    const c = cur();
    rest = c.ball ? { ...c.ball } : { x: hole.tee.x, y: hole.tee.y };
    ball = null; trail = []; aim = null; sinking = 0;
  }
  resetBall();

  function setMode(mode) {
    if (state.mode === mode || ball) return;
    sfx.tap();
    state = { ...state, mode };
    hole = L.currentHole(state);
    resetBall();
    save();
    layout();
    refresh();
  }

  // ---------- 그리기 ----------

  function layout() {
    const box = board.getBoundingClientRect();
    cell = Math.max(10, Math.floor(Math.min((box.width - 8) / L.W, (box.height - 8) / L.H)));
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = `${cell * L.W}px`;
    cv.style.height = `${cell * L.H}px`;
    cv.width = Math.round(cell * L.W * dpr);
    cv.height = Math.round(cell * L.H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    layer = drawCourse(hole, cell, dpr);
    draw();
  }

  function jitter(seed, i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  }

  // 코스는 홀마다 한 번만 그려 두고 매 프레임 복사한다.
  function drawCourse(h, c, dpr) {
    const off = document.createElement('canvas');
    off.width = Math.round(c * L.W * dpr);
    off.height = Math.round(c * L.H * dpr);
    const o = off.getContext('2d');
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Wp = c * L.W;
    const Hp = c * L.H;
    o.fillStyle = '#fffdf6';
    o.fillRect(0, 0, Wp, Hp);
    o.strokeStyle = '#d5e2f3';
    o.lineWidth = 1;
    for (let x = 0; x <= L.W * 2; x += 1) { o.beginPath(); o.moveTo((x * c) / 2 + 0.5, 0); o.lineTo((x * c) / 2 + 0.5, Hp); o.globalAlpha = x % 2 ? 0.45 : 1; o.stroke(); }
    for (let y = 0; y <= L.H * 2; y += 1) { o.beginPath(); o.moveTo(0, (y * c) / 2 + 0.5); o.lineTo(Wp, (y * c) / 2 + 0.5); o.globalAlpha = y % 2 ? 0.45 : 1; o.stroke(); }
    o.globalAlpha = 1;

    const T = L.TILE;
    for (let y = 0; y < L.H; y += 1) {
      for (let x = 0; x < L.W; x += 1) {
        const t = L.tileOf(h, x, y);
        const px = x * c;
        const py = y * c;
        if (t === T.WALL) {
          o.fillStyle = '#e9eef7';
          o.fillRect(px, py, c, c);
          o.save();
          o.beginPath(); o.rect(px, py, c, c); o.clip();
          o.strokeStyle = '#4d6da3';
          o.lineWidth = 1.3;
          for (let k = -c; k < c * 2; k += c / 4) { o.beginPath(); o.moveTo(px + k, py + c); o.lineTo(px + k + c, py); o.stroke(); }
          o.restore();
        } else if (t === T.SAND) {
          o.fillStyle = '#f6e3a8';
          o.fillRect(px, py, c, c);
          o.fillStyle = '#c99a2e';
          for (let k = 0; k < 9; k += 1) {
            o.beginPath();
            o.arc(px + (0.5 + jitter(h.seed + x * 31 + y, k) * 0.85) * c, py + (0.5 + jitter(h.seed + y * 17 + x, k + 9) * 0.85) * c, c * 0.04, 0, 7);
            o.fill();
          }
        } else if (t === T.WATER) {
          o.fillStyle = '#bfe3f7';
          o.fillRect(px, py, c, c);
          o.strokeStyle = '#3d8fd1';
          o.lineWidth = 1.5;
          for (let row = 0; row < 2; row += 1) {
            o.beginPath();
            const yy = py + c * (0.35 + row * 0.35);
            for (let k = 0; k <= 8; k += 1) {
              const xx = px + c * 0.12 + (k / 8) * c * 0.76;
              const yv = yy + Math.sin(k * 1.6 + row) * c * 0.06;
              if (k) o.lineTo(xx, yv); else o.moveTo(xx, yv);
            }
            o.stroke();
          }
        }
      }
    }

    // 벽과 바닥의 경계를 손으로 그은 볼펜 선처럼 긋는다.
    o.strokeStyle = '#1f2f4d';
    o.lineCap = 'round';
    o.lineWidth = Math.max(2, c * 0.09);
    let n = 0;
    const wall = (x, y) => L.tileOf(h, x, y) === T.WALL;
    for (let y = 0; y < L.H; y += 1) {
      for (let x = 0; x < L.W; x += 1) {
        if (wall(x, y)) continue;
        const edges = [];
        if (wall(x, y - 1)) edges.push([x, y, x + 1, y]);
        if (wall(x, y + 1)) edges.push([x, y + 1, x + 1, y + 1]);
        if (wall(x - 1, y)) edges.push([x, y, x, y + 1]);
        if (wall(x + 1, y)) edges.push([x + 1, y, x + 1, y + 1]);
        for (const [x1, y1, x2, y2] of edges) {
          n += 1;
          const j = c * 0.035;
          o.beginPath();
          o.moveTo(x1 * c + jitter(h.seed, n) * j, y1 * c + jitter(h.seed, n + 1) * j);
          o.quadraticCurveTo(((x1 + x2) / 2) * c + jitter(h.seed, n + 2) * j * 2, ((y1 + y2) / 2) * c + jitter(h.seed, n + 3) * j * 2, x2 * c + jitter(h.seed, n + 4) * j, y2 * c + jitter(h.seed, n + 5) * j);
          o.stroke();
        }
      }
    }

    for (const b of h.bumpers) {
      o.fillStyle = '#ffd9d3';
      o.strokeStyle = '#d9473c';
      o.lineWidth = Math.max(2, c * 0.08);
      o.beginPath(); o.arc(b.x * c, b.y * c, L.BUMPER_R * c, 0, 7); o.fill(); o.stroke();
      o.beginPath(); o.arc(b.x * c, b.y * c, L.BUMPER_R * c * 0.45, 0, 7); o.stroke();
    }

    // 티 자리 표시
    o.strokeStyle = '#d9473c';
    o.lineWidth = 2;
    const tx = h.tee.x * c;
    const ty = h.tee.y * c;
    const s = c * 0.22;
    o.beginPath(); o.moveTo(tx - s, ty - s); o.lineTo(tx + s, ty + s); o.moveTo(tx + s, ty - s); o.lineTo(tx - s, ty + s); o.stroke();

    // 컵
    o.fillStyle = '#1f2f4d';
    o.beginPath(); o.ellipse(h.cup.x * c, h.cup.y * c, L.CUP_R * c, L.CUP_R * c * 0.92, 0, 0, 7); o.fill();
    o.fillStyle = '#0d1628';
    o.beginPath(); o.ellipse(h.cup.x * c, h.cup.y * c + 1, L.CUP_R * c * 0.7, L.CUP_R * c * 0.6, 0, 0, 7); o.fill();
    return off;
  }

  function drawFlag(t) {
    const c = cell;
    const x = hole.cup.x * c + c * 0.05;
    const y = hole.cup.y * c;
    g.strokeStyle = '#1f2f4d';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - c * 1.15); g.stroke();
    const wave = Math.sin(t / 260) * c * 0.06;
    g.fillStyle = '#e2574c';
    g.beginPath();
    g.moveTo(x, y - c * 1.15);
    g.quadraticCurveTo(x + c * 0.35, y - c * 1.05 + wave, x + c * 0.62, y - c * 0.97);
    g.quadraticCurveTo(x + c * 0.3, y - c * 0.88 - wave, x, y - c * 0.72);
    g.closePath();
    g.fill();
  }

  function drawBall(p, scale) {
    const c = cell;
    const r = L.BALL_R * c * scale;
    g.fillStyle = 'rgba(31,47,77,0.18)';
    g.beginPath(); g.ellipse(p.x * c + r * 0.25, p.y * c + r * 0.35, r, r * 0.8, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1f2f4d';
    g.lineWidth = Math.max(1.6, c * 0.06);
    g.beginPath(); g.arc(p.x * c, p.y * c, r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#c9d6ea';
    g.beginPath(); g.arc(p.x * c + r * 0.25, p.y * c + r * 0.25, r * 0.35, 0, 7); g.fill();
  }

  function aimVector() {
    if (!aim) return null;
    const dx = aim.x - aim.x0;
    const dy = aim.y - aim.y0;
    const len = Math.hypot(dx, dy);
    if (len < 14) return null;
    return { angle: Math.atan2(-dy, -dx), power: Math.min(1, len / (cell * 4.6)) };
  }

  function drawAim(v) {
    const c = cell;
    const p = rest;
    const reach = (1.2 + v.power * 5.2) * c;
    const ux = Math.cos(v.angle);
    const uy = Math.sin(v.angle);
    const hot = v.power > 0.75;
    g.strokeStyle = hot ? '#d9473c' : '#2f5da8';
    g.fillStyle = g.strokeStyle;
    const dots = Math.round(4 + v.power * 9);
    for (let k = 1; k <= dots; k += 1) {
      const d = (k / dots) * reach;
      g.beginPath(); g.arc(p.x * c + ux * d, p.y * c + uy * d, Math.max(1.6, c * 0.07), 0, 7); g.fill();
    }
    const ex = p.x * c + ux * (reach + c * 0.35);
    const ey = p.y * c + uy * (reach + c * 0.35);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(ex - ux * c * 0.4 - uy * c * 0.25, ey - uy * c * 0.4 + ux * c * 0.25);
    g.lineTo(ex, ey);
    g.lineTo(ex - ux * c * 0.4 + uy * c * 0.25, ey - uy * c * 0.4 - ux * c * 0.25);
    g.stroke();
    // 힘 눈금: 공 둘레의 호
    g.strokeStyle = hot ? 'rgba(217,71,60,0.55)' : 'rgba(47,93,168,0.45)';
    g.lineWidth = Math.max(3, c * 0.12);
    g.beginPath();
    g.arc(p.x * c, p.y * c, c * 0.62, v.angle + Math.PI - Math.PI * v.power, v.angle + Math.PI + Math.PI * v.power);
    g.stroke();
  }

  function draw(t) {
    const now = t || 0;
    const c = cell;
    g.clearRect(0, 0, c * L.W, c * L.H);
    if (layer) g.drawImage(layer, 0, 0, c * L.W, c * L.H);

    if (trail.length > 1) {
      g.strokeStyle = 'rgba(47,93,168,0.55)';
      g.lineWidth = Math.max(1.5, c * 0.05);
      g.setLineDash([c * 0.18, c * 0.14]);
      g.beginPath();
      trail.forEach((p, i) => (i ? g.lineTo(p.x * c, p.y * c) : g.moveTo(p.x * c, p.y * c)));
      g.stroke();
      g.setLineDash([]);
    }

    if (splash) {
      const k = Math.min(1, (now - splash.t) / 700);
      g.strokeStyle = `rgba(61,143,209,${1 - k})`;
      g.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        g.beginPath(); g.arc(splash.x * c, splash.y * c, c * (0.2 + k * 0.6 + i * 0.18), 0, 7); g.stroke();
      }
    }

    const p = ball || rest;
    if (!sinking) drawFlag(now);
    if (p && sinking < 1) drawBall(p, 1 - sinking * 0.6);

    if (!ball && !pendingOut && !state.coached && !SHOT && !(state.mode === 'daily' && state.daily.done)) {
      const pulse = (Math.sin(now / 300) + 1) / 2;
      g.strokeStyle = `rgba(217,71,60,${0.25 + pulse * 0.4})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(rest.x * c, rest.y * c, c * (0.45 + pulse * 0.25), 0, 7); g.stroke();
    }

    const v = aimVector();
    if (v && !ball) drawAim(v);
  }

  // ---------- 진행 루프 ----------

  let lastT = 0;
  let acc = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
    lastT = t;
    if (ball) {
      acc += dt;
      const events = [];
      let result = 'roll';
      while (acc >= 1 / 120 && result === 'roll') {
        acc -= 1 / 120;
        result = L.step(hole, ball, events);
        steps += 1;
        if (steps % 3 === 0) trail.push({ x: ball.x, y: ball.y });
        if (steps >= 120 * 20 && result === 'roll') result = 'stop';
      }
      if (trail.length > 160) trail.splice(0, trail.length - 160);
      let walls = 0;
      for (const e of events) {
        if (e.type === 'bumper') sfx.bumper();
        else if (walls < 2) { sfx.wall(e.speed); walls += 1; }
      }
      if (result !== 'roll') finishShot(result, t);
    }
    if (sinking > 0 && sinking < 1) sinking = Math.min(1, sinking + dt * 4);
    draw(t);
    requestAnimationFrame(frame);
  }

  function finishShot(result, t) {
    const at = { x: ball.x, y: ball.y };
    const outcome = result === 'water' ? { result, x: shotFrom.x, y: shotFrom.y } : { result, x: at.x, y: at.y };
    ball = null;
    acc = 0;
    if (result === 'water') {
      splash = { x: at.x, y: at.y, t };
      sfx.water();
      toast(TEXT.water);
      trail = [];
    }
    if (result === 'cup') { sinking = 0.01; sfx.cup(); }
    const { state: next, holeOut } = L.applyShot(state, outcome, hole);
    state = next;
    save();
    rest = { x: outcome.x, y: outcome.y };
    if (result === 'cup') rest = { x: hole.cup.x, y: hole.cup.y };
    if (holeOut) {
      pendingOut = holeOut;
      if (holeOut.ace) sfx.ace();
      setTimeout(() => showHoleOut(holeOut), result === 'cup' ? 650 : 250);
    }
    refresh();
  }

  // ---------- 입력 ----------

  board.addEventListener('pointerdown', (e) => {
    if (ball || pendingOut || !sheet.classList.contains('hidden') || (state.mode === 'daily' && state.daily.done)) return;
    aim = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    try { board.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트에는 포인터가 없을 수 있다. */ }
  });
  board.addEventListener('pointermove', (e) => {
    if (!aim) return;
    aim.x = e.clientX;
    aim.y = e.clientY;
  });
  const release = () => {
    const v = aimVector();
    aim = null;
    if (!v || ball) return;
    shotFrom = { ...rest };
    ball = L.launch(rest, v.angle, v.power);
    steps = 0;
    acc = 0;
    trail = [{ x: rest.x, y: rest.y }];
    splash = null;
    sfx.putt(v.power);
    if (!state.coached) { state = { ...state, coached: true }; $('hint').classList.add('gone'); }
  };
  board.addEventListener('pointerup', release);
  board.addEventListener('pointercancel', () => { aim = null; });

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('recBtn').addEventListener('click', () => { sfx.tap(); openRecords(); });
  $('soundBtn').addEventListener('click', () => {
    state = { ...state, sound: !state.sound };
    save();
    sfx.tap();
    refresh();
  });

  // ---------- 상단 정보 ----------

  const SPEAKER = '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>';
  function refresh() {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.mode === state.mode));
    $('soundBtn').innerHTML = `${SPEAKER}${state.sound ? '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
    $('soundBtn').setAttribute('aria-pressed', String(state.sound));
    const c = cur();
    if (state.mode === 'ladder') {
      $('holeLabel').textContent = TEXT.floor;
      $('holeNum').textContent = String(state.ladder.level);
    } else {
      $('holeLabel').textContent = TEXT.hole;
      $('holeNum').innerHTML = `${Math.min(state.daily.hole + 1, L.HOLES_PER_DAY)}<i>/${L.HOLES_PER_DAY}</i>`;
    }
    $('parNum').textContent = String(hole.par);
    const strokes = pendingOut ? Math.min(pendingOut.strokes, L.STROKE_CAP) : c.strokes;
    $('dots').innerHTML = Array.from({ length: L.STROKE_CAP }, (_, i) => `<span class="${i < strokes ? 'on' : ''}${i === hole.par - 1 ? ' par' : ''}"></span>`).join('');

    if (state.mode === 'daily') {
      const cells = [];
      for (let i = 0; i < L.HOLES_PER_DAY; i += 1) {
        const s = state.daily.scores[i];
        const p = L.dailyHole(state.daily.date, i).par;
        const cls = s === undefined ? (i === state.daily.hole ? 'now' : '') : L.scoreName(s, p);
        cells.push(`<span class="${cls}">${s === undefined ? '' : Math.min(s, L.STROKE_CAP)}</span>`);
      }
      $('mini').innerHTML = cells.join('');
    } else {
      $('mini').innerHTML = `<em>${TEXT.ladderBest} ${TEXT.floorN(state.ladder.best)} · ${TEXT.underPar(state.ladder.underPar)}</em>`;
    }
    $('hint').classList.toggle('gone', state.coached);
    if (state.mode === 'daily' && state.daily.done && !pendingOut) showRound();
    else if (sheet.dataset.kind === 'round') closeSheet();
  }

  let toastTimer = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- 결과 카드 ----------

  const sheet = $('sheet');
  function openSheet(kind, html) {
    sheet.dataset.kind = kind;
    sheet.innerHTML = `<div class="paper-card">${html}</div>`;
    sheet.classList.remove('hidden');
  }
  function closeSheet() {
    sheet.classList.add('hidden');
    sheet.dataset.kind = '';
  }

  function stamp(name, sub) {
    return `<div class="stamp ${name}"><span>${TEXT.names[name]}</span><small>${sub}</small></div>`;
  }

  function showHoleOut(out) {
    const name = L.scoreName(out.strokes, out.par);
    const sub = out.pickedUp ? TEXT.pickup : `${TEXT.shots(out.strokes)} · ${TEXT.par} ${out.par}`;
    const label = state.mode === 'ladder' ? TEXT.nextFloor : out.roundDone ? TEXT.result : TEXT.next;
    openSheet('hole', `${stamp(name, sub)}<button class="primary" id="goNext">${label}</button>`);
    $('goNext').addEventListener('click', advance);
  }

  function advance() {
    if (!pendingOut) return;
    sfx.tap();
    pendingOut = null;
    closeSheet();
    hole = L.currentHole(state);
    resetBall();
    layout();
    refresh();
  }

  function scorecard(date, scores) {
    let head = '';
    let pars = '';
    let row = '';
    let parTotal = 0;
    for (let i = 0; i < L.HOLES_PER_DAY; i += 1) {
      const p = L.dailyHole(date, i).par;
      parTotal += p;
      const s = scores[i];
      head += `<th>${i + 1}</th>`;
      pars += `<td>${p}</td>`;
      row += `<td><span class="${s === undefined ? '' : L.scoreName(s, p)}">${s === undefined ? '' : s}</span></td>`;
    }
    const total = scores.reduce((a, b) => a + b, 0);
    return `<table class="scorecard"><tr><th></th>${head}<th>${TEXT.total}</th></tr>
      <tr><th>${TEXT.par}</th>${pars}<td>${parTotal}</td></tr>
      <tr class="me"><th>${TEXT.strokes}</th>${row}<td><b>${total || ''}</b></td></tr></table>`;
  }

  const toParText = (n) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `−${-n}`);

  function showRound() {
    if (sheet.dataset.kind === 'round') return;
    const d = state.daily;
    const rec = state.history[d.date];
    const toPar = rec ? rec.strokes - rec.par : 0;
    openSheet('round', `
      <p class="eyebrow">${d.date}</p>
      <h2>${TEXT.roundDone}</h2>
      <div class="big-score">${toParText(toPar)}<small>${rec ? TEXT.shots(rec.strokes) : ''}</small></div>
      ${scorecard(d.date, d.scores)}
      <p class="note">${TEXT.tomorrow} · ${TEXT.streakDays} ${L.streak(state.history, d.date)}</p>
      <button class="primary" id="goLadder">${TEXT.goLadder}</button>
      <button class="ghost" id="goRec">${TEXT.records}</button>`);
    $('goLadder').addEventListener('click', () => setMode('ladder'));
    $('goRec').addEventListener('click', () => { sfx.tap(); openRecords(); });
  }

  // ---------- 기록 ----------

  const records = $('records');
  function openRecords(month) {
    const now = new Date(`${today()}T12:00:00`);
    recordMonth = month || recordMonth || { y: now.getFullYear(), m: now.getMonth() + 1 };
    const { y, m } = recordMonth;
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    let cells = TEXT.days.map((d) => `<i>${d}</i>`).join('');
    for (let i = 0; i < first; i += 1) cells += '<span></span>';
    for (let d = 1; d <= days; d += 1) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = state.history[key];
      const isToday = key === today();
      if (rec) {
        const tp = rec.strokes - rec.par;
        cells += `<span class="day done ${tp < 0 ? 'under' : tp === 0 ? 'even' : 'over'}${isToday ? ' today' : ''}" style="--r:${(L.hashString(key) % 17) - 8}deg"><em>${d}</em><b>${toParText(tp)}</b>${rec.aces ? '<s>★</s>' : ''}</span>`;
      } else {
        cells += `<span class="day${isToday ? ' today' : ''}"><em>${d}</em></span>`;
      }
    }
    const st = state.stats;
    records.innerHTML = `
      <div class="rec-head">
        <h2>${TEXT.records}</h2>
        <button class="icon" id="recClose" aria-label="${TEXT.close}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="stats">
        <div><b>${st.rounds}</b><small>${TEXT.rounds}</small></div>
        <div><b>${st.bestToPar === null ? '–' : toParText(st.bestToPar)}</b><small>${TEXT.best}</small></div>
        <div><b>${st.aces}</b><small>${TEXT.aces}</small></div>
        <div><b>${state.ladder.best}</b><small>${TEXT.ladderBest}</small></div>
        <div><b>${L.streak(state.history, today())}</b><small>${TEXT.streakDays}</small></div>
      </div>
      <div class="month">
        <button class="icon" id="mPrev" aria-label="${TEXT.prev}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h3>${TEXT.months(y, m)}</h3>
        <button class="icon" id="mNext" aria-label="${TEXT.nextMonth}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <div class="cal">${cells}</div>
      <p class="legend"><span class="under">●</span> ${TEXT.legend[0]} <span class="even">●</span> ${TEXT.legend[1]} <span class="over">●</span> ${TEXT.legend[2]} <s>★</s> ${TEXT.aces}</p>`;
    records.classList.remove('hidden');
    $('recClose').addEventListener('click', closeRecords);
    $('mPrev').addEventListener('click', () => { sfx.tap(); openRecords(m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }); });
    $('mNext').addEventListener('click', () => { sfx.tap(); openRecords(m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }); });
  }
  function closeRecords() {
    records.classList.add('hidden');
    recordMonth = null;
  }

  // ---------- 앱 수명 ----------

  window.appFlush = save;
  window.appBack = () => {
    if (!records.classList.contains('hidden')) { closeRecords(); return true; }
    if (pendingOut) { advance(); return true; }
    if (state.mode === 'ladder') { setMode('daily'); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); return; }
    const d = today();
    if (state.daily.date !== d && !ball) {
      state = L.rollDay(state, d);
      if (state.mode === 'daily') { hole = L.currentHole(state); resetBall(); layout(); }
      refresh();
      save();
    }
  });
  window.addEventListener('resize', () => layout());

  // ---------- 스토어 스크린샷 ----------

  function demoState() {
    const s = L.newState('2026-11-03');
    s.coached = true;
    s.sound = false;
    return s;
  }

  function setupShot(n) {
    state = demoState();
    if (n === 1) {
      state.daily.scores = [3, 2, 4, 3];
      state.daily.hole = 4;
      hole = L.currentHole(state);
      resetBall();
      layout();
      const v = L.botShot(hole, rest);
      const len = (cell * 4.6) * Math.max(0.35, v.power);
      const box = board.getBoundingClientRect();
      aim = { x0: box.left + 50, y0: box.top + 50, x: box.left + 50 - Math.cos(v.angle) * len, y: box.top + 50 - Math.sin(v.angle) * len };
    } else if (n === 2) {
      state.mode = 'ladder';
      state.ladder = { level: 14, strokes: 1, ball: null, best: 14, underPar: 9 };
      hole = L.currentHole(state);
      resetBall();
      layout();
      const v = L.botShot(hole, rest);
      const sim = L.simulate(hole, rest, v.angle, v.power, true);
      trail = sim.path;
      rest = { x: sim.x, y: sim.y };
    } else if (n === 3) {
      state.daily.scores = [3, 2, 4];
      state.daily.hole = 3;
      hole = L.currentHole(state);
      resetBall();
      layout();
      trail = L.simulate(hole, hole.tee, L.botShot(hole, hole.tee).angle, L.botShot(hole, hole.tee).power, true).path;
      rest = { x: hole.cup.x, y: hole.cup.y };
      sinking = 1;
      pendingOut = { strokes: 1, par: hole.par, ace: true, pickedUp: false, roundDone: false };
      showHoleOut(pendingOut);
    } else {
      const base = new Date('2026-11-03T12:00:00');
      for (let i = 0; i <= 26; i += 1) {
        if (i % 7 === 3 || i === 12) continue;
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        const key = L.dateKey(d);
        const r = L.hashString(key);
        state.history[key] = { strokes: 18 + (r % 7) - 3, par: 18, aces: r % 5 === 0 ? 1 : 0 };
      }
      state.stats = { rounds: 22, aces: 5, holes: 190, bestToPar: -3 };
      state.ladder.best = 23;
      hole = L.currentHole(state);
      resetBall();
      layout();
      openRecords({ y: 2026, m: 10 });
    }
    refresh();
    draw(0);
  }

  if (SHOT) {
    requestAnimationFrame(() => setupShot(SHOT));
  } else {
    refresh();
    requestAnimationFrame(() => { layout(); requestAnimationFrame(frame); });
  }
})();
