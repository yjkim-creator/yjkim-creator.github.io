// 등불 골목 화면.
// 약속 1) localStorage는 try/catch로 감싼다. 2) window.appFlush는 앱이 가려질 때 저장한다.
// 3) window.appBack은 닫을 화면이 있으면 닫고 true를 돌려준다. 4) #shot=번호이면 스토어용 대표 화면을 그린다.
(function () {
  const KEY = 'lanternlink-v1';
  const ko = /^ko/i.test(navigator.language || '');
  const shotHit = /#shot=(\d)/.exec(location.hash);
  const SHOT = shotHit ? Number(shotHit[1]) : 0;
  if (SHOT) document.documentElement.classList.add('shot');

  const T = ko ? {
    brand: '등불 골목', today: '오늘의 골목', free: '자유 골목', string: '등불 줄',
    alley: (n) => `골목 ${n}`, turns: '회전', goal: '목표', lanterns: '등불',
    restart: '처음 배치로', sound: '소리', on: '켜짐', off: '꺼짐',
    hint: '칸을 누르면 전선이 돌아가요. 가운데 발전기에서 모든 등불까지 이어 보세요.',
    loose: (n) => `등불은 다 켜졌지만 끊긴 전선 끝이 ${n}개 남았어요`,
    litAlley: (n) => `골목 ${n}을 밝혔어요`, next: '다음 골목',
    allDone: '오늘의 골목을 모두 밝혔어요', allSub: (s) => `오늘 모은 별 ${s} / 9 · 내일 새 골목이 열려요`,
    seeString: '등불 줄 보기', goFree: '자유 골목으로',
    freeTitle: (n) => `자유 골목 · ${n}단계`, freeDone: (n) => `${n}단계를 밝혔어요`, nextLevel: '다음 단계',
    month: (y, m) => `${y}년 ${m}월`, streak: '연속으로 밝힌 날', daysLit: '밝힌 날', cleared: '밝힌 골목', level: '자유 골목 단계',
    stringNote: '오늘의 골목 세 판을 모두 밝힌 날마다 등불 하나가 걸려요. 별이 많을수록 더 환해요.',
    prev: '이전 달', nextMonth: '다음 달', dayUnit: '일', size: (w, h) => `${w}×${h}`,
    week: ['일', '월', '화', '수', '목', '금', '토'],
  } : {
    brand: 'Lantern Alley', today: 'Today', free: 'Free Alleys', string: 'Lantern String',
    alley: (n) => `Alley ${n}`, turns: 'Turns', goal: 'Goal', lanterns: 'Lanterns',
    restart: 'Reset tiles', sound: 'Sound', on: 'On', off: 'Off',
    hint: 'Tap a tile to turn its wire. Connect every lantern to the generator in the middle.',
    loose: (n) => `All lanterns are lit, but ${n} loose wire end${n > 1 ? 's are' : ' is'} left`,
    litAlley: (n) => `Alley ${n} is lit`, next: 'Next alley',
    allDone: "Today's alleys are all lit", allSub: (s) => `${s} / 9 stars today · new alleys tomorrow`,
    seeString: 'See the string', goFree: 'Free alleys',
    freeTitle: (n) => `Free alley · level ${n}`, freeDone: (n) => `Level ${n} is lit`, nextLevel: 'Next level',
    month: (y, m) => new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    streak: 'Days in a row', daysLit: 'Days lit', cleared: 'Alleys lit', level: 'Free level',
    stringNote: 'Every day you light all three of today\'s alleys, a lantern is hung here. More stars, brighter lantern.',
    prev: 'Previous month', nextMonth: 'Next month', dayUnit: '', size: (w, h) => `${w}×${h}`,
    week: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  };
  document.documentElement.lang = ko ? 'ko' : 'en';
  document.title = T.brand;

  const todayKey = () => Logic.dateKey(new Date());

  function load() {
    try {
      return Logic.sanitize(JSON.parse(localStorage.getItem(KEY)), todayKey());
    } catch {
      return Logic.newState(todayKey());
    }
  }
  function save() {
    if (SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막힌 기기에서도 판은 계속된다. */ }
  }

  let state = SHOT ? Logic.newState(todayKey()) : load();
  let view = 'today';
  let monthShown = todayKey().slice(0, 7);
  let angles = [];      // 칸마다 지금까지 돌린 각도. 애니메이션이 늘 시계 방향으로 돌게 한다.
  let angleKey = '';
  let justSolved = false;

  // ── 소리: Web Audio로 그때그때 합성한다.
  let audio = null;
  function ctx() {
    if (!state.sound) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch { return null; }
  }
  function tone(freq, start, len, type, gain) {
    const a = ctx();
    if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + len + 0.02);
  }
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  const sfx = {
    click() { tone(1900, 0, 0.035, 'square', 0.03); tone(240, 0, 0.06, 'triangle', 0.06); },
    glow(n) { tone(SCALE[Math.min(n, SCALE.length - 1)], 0, 0.5, 'sine', 0.09); tone(SCALE[Math.min(n, SCALE.length - 1)] * 2, 0.01, 0.25, 'sine', 0.025); },
    solve() { [0, 2, 4, 5, 7].forEach((k, i) => tone(SCALE[k], i * 0.09, 0.7, 'triangle', 0.08)); },
  };

  // ── 그림 조각
  const svg = (inner, cls, box = '0 0 100 100') => `<svg class="${cls}" viewBox="${box}" aria-hidden="true">${inner}</svg>`;
  function wireSvg(mask) {
    const ends = { 1: [50, -2], 2: [102, 50], 4: [50, 102], 8: [-2, 50] };
    let lines = '';
    for (const d of Logic.DIRS) {
      if (mask & d) lines += `<line x1="50" y1="50" x2="${ends[d][0]}" y2="${ends[d][1]}"/>`;
    }
    return svg(`<g class="w-shadow">${lines}</g><g class="w-core">${lines}</g><circle class="w-hub" cx="50" cy="50" r="${Logic.bits(mask) === 1 ? 6 : 9}"/>`, 'wire');
  }
  const LANTERN = '<line class="l-cord" x1="50" y1="22" x2="50" y2="30"/><rect class="l-cap" x="40" y="28" width="20" height="6" rx="2"/>'
    + '<ellipse class="l-body" cx="50" cy="51" rx="19" ry="19"/><path class="l-rib" d="M50 32v38M40 34q-6 17 0 34M60 34q6 17 0 34"/>'
    + '<rect class="l-cap" x="40" y="68" width="20" height="6" rx="2"/><line class="l-tassel" x1="50" y1="74" x2="50" y2="84"/>';
  const GENERATOR = '<circle class="g-ring" cx="50" cy="50" r="27"/><circle class="g-core" cx="50" cy="50" r="20"/>'
    + '<path class="g-bolt" d="M53 34 41 53h9l-4 14 13-20h-9z"/>';

  function hueFor(i) { return [12, 28, 345, 40, 18, 355][i % 6]; }

  // ── 판 그리기
  function boardHtml(board, keyName) {
    if (angleKey !== keyName || angles.length !== board.cur.length) {
      angles = board.cur.map((m, i) => (Logic.turnsTo(board.sol[i], m) * 90));
      angleKey = keyName;
    }
    const tile = tileSize(board);
    let cells = '';
    for (let i = 0; i < board.cur.length; i += 1) {
      const kind = i === board.src ? 'gen' : (Logic.isLantern(board, i) ? 'lamp' : 'path');
      const art = kind === 'gen' ? svg(GENERATOR, 'gen') : (kind === 'lamp' ? svg(LANTERN, 'lamp') : '');
      const stone = (i * 37 + board.w * 11) % 4;
      cells += `<button class="tile k-${kind} s${stone}" data-i="${i}" style="--hue:${hueFor(i)}" aria-label="${kind}">`
        + `<span class="spin" style="transform:rotate(${angles[i]}deg)">${wireSvg(board.sol[i])}</span>${art}</button>`;
    }
    return `<div class="board" style="--cols:${board.w};--tile:${tile}px">${cells}</div>`;
  }

  function tileSize(board) {
    const wide = Math.min(document.body.clientWidth || innerWidth, 480) - 32;
    const tall = (SHOT ? 732 : innerHeight) - (view === 'free' ? 320 : 400);
    return Math.max(44, Math.min(76, Math.floor(Math.min(wide / board.w, tall / board.h))));
  }

  // 켜진 칸 표시만 바꾼다. 판 전체를 다시 그리지 않아 돌리는 애니메이션이 끊기지 않는다.
  function paintLight(board) {
    const lit = Logic.litCells(board);
    const el = app.querySelector('.board');
    if (!el) return;
    el.querySelectorAll('.tile').forEach((t) => {
      const i = Number(t.dataset.i);
      t.classList.toggle('on', lit[i]);
      if (lit[i]) t.style.setProperty('--d', `${(distance(board, i) * 45)}ms`);
    });
    el.classList.toggle('won', board.done);
  }
  function distance(board, i) {
    const sx = board.src % board.w; const sy = Math.floor(board.src / board.w);
    return Math.abs(sx - (i % board.w)) + Math.abs(sy - Math.floor(i / board.w));
  }

  function stars(n, total = 3) {
    let s = '';
    for (let k = 0; k < total; k += 1) s += `<i class="${k < n ? 'got' : ''}">★</i>`;
    return `<span class="stars">${s}</span>`;
  }

  function meterHtml(board) {
    const lamps = Logic.lanternCount(board);
    const litN = Logic.litLanterns(board);
    const ends = Logic.looseEnds(board);
    let note = '';
    if (!board.done && litN === lamps && ends > 0) note = `<p class="note warn">${T.loose(ends)}</p>`;
    else if (!board.done && state.cleared === 0) note = `<p class="note">${T.hint}</p>`;
    return `<div class="meter">
      <div class="gauge"><b>${litN}</b><small>/ ${lamps}</small><span>${T.lanterns}</span></div>
      <div class="gauge"><b>${board.moves}</b><small>/ ${board.par}</small><span>${T.turns} · ${T.goal}</span></div>
      <button class="ghost" data-act="restart" ${board.moves && !board.done ? '' : 'disabled'}>${T.restart}</button>
    </div>${note}`;
  }

  function currentBoard() {
    return view === 'free' ? state.free.board : state.day.boards[state.day.at];
  }

  function todayHtml() {
    const d = state.day;
    const board = d.boards[d.at];
    const chips = d.boards.map((b, k) => `<button class="chip ${k === d.at ? 'sel' : ''} ${b.done ? 'done' : ''}" data-alley="${k}">
      <span class="chip-n">${T.alley(k + 1)}</span><span class="chip-s">${T.size(b.w, b.h)}</span>${b.done ? stars(b.stars) : '<span class="stars dim">···</span>'}</button>`).join('');
    let card = '';
    if (board.done) {
      const all = d.boards.every((b) => b.done);
      const total = d.boards.reduce((s, b) => s + b.stars, 0);
      card = all
        ? `<div class="card"><h3>${T.allDone}</h3>${stars(total, 9)}<p>${T.allSub(total)}</p>
            <div class="row"><button class="lit-btn" data-act="string">${T.seeString}</button><button class="ghost" data-act="free">${T.goFree}</button></div></div>`
        : `<div class="card"><h3>${T.litAlley(d.at + 1)}</h3>${stars(board.stars)}<p>${T.turns} ${board.moves} · ${T.goal} ${board.par}</p>
            <div class="row"><button class="lit-btn" data-act="nextAlley">${T.next}</button></div></div>`;
    }
    const [y, m, dd] = d.date.split('-').map(Number);
    const dateText = ko ? `${m}월 ${dd}일` : new Date(y, m - 1, dd).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    return `<div class="sub"><span class="date">${dateText}</span><span>${T.today}</span></div>
      <div class="chips">${chips}</div>
      <div class="stage">${boardHtml(board, `day:${d.date}:${d.at}`)}${card}</div>${meterHtml(board)}`;
  }

  function freeHtml() {
    const f = state.free;
    const b = f.board;
    const card = b.done ? `<div class="card"><h3>${T.freeDone(f.level)}</h3>${stars(b.stars)}<p>${T.turns} ${b.moves} · ${T.goal} ${b.par}</p>
      <div class="row"><button class="lit-btn" data-act="nextLevel">${T.nextLevel}</button></div></div>` : '';
    return `<div class="sub"><span class="date">${T.freeTitle(f.level)}</span><span>${T.size(b.w, b.h)}</span></div>
      <div class="stage">${boardHtml(b, `free:${f.level}`)}${card}</div>${meterHtml(b)}`;
  }

  // 한 달을 주 단위 줄로 나눠 걸린 등불을 그린다.
  function stringHtml() {
    const [y, m] = monthShown.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay();
    const daysIn = new Date(y, m, 0).getDate();
    const today = todayKey();
    const rows = Math.ceil((first + daysIn) / 7);
    const ROW = 60;
    let art = '';
    for (let r = 0; r < rows; r += 1) {
      const top = 18 + r * ROW;
      art += `<path class="cord" d="M4 ${top} Q180 ${top + 24} 356 ${top}"/>`;
      for (let c = 0; c < 7; c += 1) {
        const day = r * 7 + c - first + 1;
        if (day < 1 || day > daysIn) continue;
        const x = 26 + c * 51.3;
        const t = (x - 4) / 352;
        const sag = top + 2 * t * (1 - t) * 24;
        const key = `${monthShown}-${String(day).padStart(2, '0')}`;
        const got = state.days[key] || 0;
        const level = got >= 9 ? 'l3' : got >= 6 ? 'l2' : got ? 'l1' : 'l0';
        art += `<g class="hang ${level} ${key === today ? 'is-today' : ''}" transform="translate(${x.toFixed(1)} ${sag.toFixed(1)})">
          <line x1="0" y1="0" x2="0" y2="7"/><ellipse cx="0" cy="21" rx="12" ry="13"/><rect x="-6" y="6" width="12" height="4" rx="1.5"/>
          <rect x="-6" y="32" width="12" height="4" rx="1.5"/><text x="0" y="50">${day}</text></g>`;
      }
    }
    const dates = Object.keys(state.days);
    const now = Logic.dateKey(new Date());
    const canNext = monthShown < now.slice(0, 7);
    return `<div class="sub"><span class="date">${T.string}</span></div>
      <div class="stats">
        <div><b>${Logic.streak(state.days, now)}</b><span>${T.streak}</span></div>
        <div><b>${dates.length}</b><span>${T.daysLit}</span></div>
        <div><b>${state.cleared}</b><span>${T.cleared}</span></div>
        <div><b>${state.free.level}</b><span>${T.level}</span></div>
      </div>
      <div class="month"><button class="round" data-act="prevMonth" aria-label="${T.prev}">‹</button><h3>${T.month(y, m)}</h3>
        <button class="round" data-act="nextMonth" aria-label="${T.nextMonth}" ${canNext ? '' : 'disabled'}>›</button></div>
      <div class="weekhead">${T.week.map((w) => `<span>${w}</span>`).join('')}</div>
      ${svg(art, 'garland', `0 0 360 ${rows * ROW + 26}`)}
      <p class="note">${T.stringNote}</p>`;
  }

  const SKYLINE = '<path class="roof" d="M0 70V44l18-12 18 12v-8h10v-8l22-14 22 14v26h14V30l16-10 16 10v14h20l14-16 14 16h10V24h26v20l20-16 20 16v26h12V36l18-12 18 12v34z"/>'
    + '<path class="string" d="M0 18q90 22 180 2t180 4"/>'
    + [24, 64, 104, 150, 210, 256, 300, 338].map((x, i) => `<circle class="bulb b${i % 3}" cx="${x}" cy="${18 + Math.sin(x / 57) * 7 + 6}" r="4"/>`).join('')
    + [[214, 52], [290, 56], [252, 44]].map(([x, y]) => `<rect class="window" x="${x}" y="${y}" width="6" height="7" rx="1"/>`).join('');

  const app = document.getElementById('app');

  function render() {
    const body = view === 'today' ? todayHtml() : view === 'free' ? freeHtml() : stringHtml();
    app.innerHTML = `<div class="shell view-${view}">
      <header class="top">${svg(SKYLINE, 'skyline', '0 0 360 70')}
        <h1>${T.brand}</h1>
        <button class="round sound ${state.sound ? '' : 'muted'}" data-act="sound" aria-label="${T.sound}">${svg('<path d="M20 38h14l18-15v54L34 62H20z"/><path class="waves" d="M62 36q8 14 0 28M70 28q15 22 0 44"/>', 'ic')}</button>
      </header>
      <section class="view">${body}</section>
      <nav class="tabs">
        ${[['today', T.today], ['free', T.free], ['string', T.string]].map(([v, label]) => `<button class="tab ${view === v ? 'sel' : ''}" data-view="${v}">${tabIcon(v)}<span>${label}</span></button>`).join('')}
      </nav></div>`;
    if (view !== 'string') paintLight(currentBoard());
    if (justSolved) {
      const el = app.querySelector('.board');
      if (el) el.classList.add('burst');
      justSolved = false;
    }
  }

  function tabIcon(v) {
    if (v === 'today') return svg('<rect x="22" y="26" width="56" height="52" rx="8"/><path d="M22 42h56M36 18v14M64 18v14"/><circle cx="50" cy="60" r="7"/>', 'ic');
    if (v === 'free') return svg('<path d="M20 50h22v-22M58 72V50h22M42 50a8 8 0 1 0 16 0a8 8 0 1 0-16 0"/>', 'ic');
    return svg('<path d="M14 26q36 18 72 0"/><ellipse cx="34" cy="50" rx="9" ry="11"/><ellipse cx="66" cy="50" rx="9" ry="11"/><path d="M34 33v6M66 33v6"/>', 'ic');
  }

  // ── 누르기
  function onTile(i) {
    const board = currentBoard();
    if (board.done || i === board.src) return;
    const beforeLit = Logic.litLanterns(board);
    state = view === 'free' ? Logic.playFree(state, i) : Logic.playDaily(state, i);
    const after = currentBoard();
    angles[i] += 90;
    const el = app.querySelector(`.tile[data-i="${i}"]`);
    if (el) {
      el.querySelector('.spin').style.transform = `rotate(${angles[i]}deg)`;
      el.classList.remove('tap');
      void el.offsetWidth;
      el.classList.add('tap');
    }
    sfx.click();
    const litN = Logic.litLanterns(after);
    if (litN > beforeLit) sfx.glow(litN);
    save();
    if (after.done) {
      sfx.solve();
      justSolved = true;
      render();
    } else {
      paintLight(after);
      const meter = app.querySelector('.meter');
      if (meter) {
        const holder = document.createElement('div');
        holder.innerHTML = meterHtml(after);
        const oldNote = app.querySelector('.view > .note');
        if (oldNote) oldNote.remove();
        meter.replaceWith(...holder.childNodes);
      }
    }
  }

  function act(name) {
    if (name === 'sound') {
      state.sound = !state.sound;
      save();
      if (state.sound) sfx.click();
    } else if (name === 'restart') {
      const b = currentBoard();
      if (view === 'free') state.free = { ...state.free, board: Logic.restart(b) };
      else {
        const boards = state.day.boards.slice();
        boards[state.day.at] = Logic.restart(b);
        state.day = { ...state.day, boards };
      }
      angleKey = '';
      save();
    } else if (name === 'nextAlley') {
      const open = state.day.boards.findIndex((b) => !b.done);
      if (open >= 0) state.day = { ...state.day, at: open };
      if (window.onestoreAd) window.onestoreAd.atBreak();
    } else if (name === 'nextLevel') {
      state = Logic.nextFree(state);
      if (window.onestoreAd) window.onestoreAd.atBreak();
      save();
    } else if (name === 'string') view = 'string';
    else if (name === 'free') view = 'free';
    else if (name === 'prevMonth' || name === 'nextMonth') {
      const [y, m] = monthShown.split('-').map(Number);
      const d = new Date(y, m - 1 + (name === 'prevMonth' ? -1 : 1), 1);
      monthShown = Logic.dateKey(d).slice(0, 7);
    }
    render();
  }

  function checkDay() {
    const next = Logic.rollDay(state, todayKey());
    if (next !== state) {
      state = next;
      save();
      if (view === 'today') render();
    }
  }

  app.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el || el.disabled) return;
    if (SHOT) return;
    checkDay();
    if (el.dataset.i !== undefined) onTile(Number(el.dataset.i));
    else if (el.dataset.alley !== undefined) {
      state.day = { ...state.day, at: Number(el.dataset.alley) };
      sfx.click();
      save();
      render();
    } else if (el.dataset.view) {
      view = el.dataset.view;
      if (view === 'string') monthShown = todayKey().slice(0, 7);
      sfx.click();
      render();
    } else if (el.dataset.act) act(el.dataset.act);
  });

  window.appFlush = save;
  window.appBack = () => {
    if (view !== 'today') {
      view = 'today';
      render();
      return true;
    }
    return false;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else checkDay();
  });
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - lastWidth) < 2) return;
    lastWidth = innerWidth;
    render();
  });

  // ── 스토어 스크린샷용 화면
  function solveSome(board, share) {
    // 발전기에서 가까운 칸부터 정답 방향으로 맞춰 불이 퍼진 모습을 만든다.
    const order = board.cur.map((_, i) => i).sort((a, b) => distance(board, a) - distance(board, b));
    const cur = board.cur.slice();
    let moves = 0;
    order.slice(0, Math.round(order.length * share)).forEach((i) => {
      moves += Logic.turnsTo(cur[i], board.sol[i]);
      cur[i] = board.sol[i];
    });
    return { ...board, cur, moves };
  }
  function solveAll(board) {
    const b = { ...solveSome(board, 1) };
    b.moves = b.par + 2;
    b.done = true;
    b.stars = Logic.starsFor(b.moves, b.par);
    return b;
  }

  if (SHOT) {
    state.cleared = 41;
    const today = todayKey();
    for (let k = 1; k <= 48; k += 1) {
      if ([4, 9, 15, 23, 31].includes(k)) continue;
      state.days[Logic.shiftDay(today, -k)] = [9, 7, 8, 9, 5, 9, 6, 9, 8][k % 9];
    }
    state.free.level = 29;
    state.free.board = Logic.freeBoard(29);
    if (SHOT === 1) {
      state.day.at = 1;
      state.day.boards[1] = solveSome(state.day.boards[1], 0.62);
    } else if (SHOT === 2) {
      state.day.boards = state.day.boards.map(solveAll);
      state.day.boards[0].stars = 3;
      state.day.at = 2;
      state.days[today] = state.day.boards.reduce((s, b) => s + b.stars, 0);
    } else if (SHOT === 3) {
      view = 'string';
      state.days[today] = 9;
      monthShown = Logic.shiftDay(`${today.slice(0, 7)}-01`, -1).slice(0, 7);
    } else {
      view = 'free';
      state.free.board = solveSome(state.free.board, 0.45);
    }
  }
  render();
})();
