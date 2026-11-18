// 산들섬 정원 화면. 약속 여섯 가지:
// 1) localStorage는 try/catch 2) window.appFlush는 가려질 때 저장 3) window.appBack은 열린 창을 닫고 true
// 4) #shot=번호면 대표 화면 5) window.appDemo()는 저장을 건드리지 않고 스스로 섬을 가꾼다 6) 소리는 Sfx, 소리 끄기 단추
(function () {
  const L = window.Logic;
  const KEY = 'breezeisle-v1';
  const ko = /^ko/i.test(navigator.language || 'ko');

  const NAMES = ko
    ? { sprout: '새싹', bush: '덤불', tree: '나무', hut: '오두막', house: '집', mill: '풍차', lighthouse: '등대', tower: '별탑', shell: '조개', pearl: '진주', chest: '보물상자', gull: '갈매기', wind: '바람병', rainbow: '무지개 씨앗' }
    : { sprout: 'Sprout', bush: 'Bush', tree: 'Tree', hut: 'Hut', house: 'House', mill: 'Windmill', lighthouse: 'Lighthouse', tower: 'Star Tower', shell: 'Shell', pearl: 'Pearl', chest: 'Treasure Chest', gull: 'Gull', wind: 'Wind Jar', rainbow: 'Rainbow Seed' };
  const S = ko ? {
    daily: '오늘의 섬', free: '자유 섬', score: '점수', best: '최고', pouch: '주머니', next: '다음', hand: '손에 든 것',
    tipStart: '같은 것 셋을 이어 놓으면 한 단계 자라요', tipGull: '갈매기는 빈 칸으로 걸어요. 가두면 조개가 돼요',
    tipWind: '바람병은 찬 칸 하나를 날려 보내요', tipRainbow: '무지개 씨앗은 가장 좋은 짝으로 변해요', tipPouch: '주머니를 누르면 손에 든 것과 바꿔요',
    tipFull: '빈 칸이 얼마 안 남았어요. 주머니를 써 보세요', overTitle: '섬이 가득 찼어요', overDaily: '오늘의 섬 기록', overFree: '자유 섬 최고',
    again: '다시 가꾸기', toFree: '자유 섬으로', toDaily: '오늘의 섬으로', codex: '섬 도감', found: '찾음', unknown: '아직 몰라요',
    week: '지난 오늘의 섬', close: '닫기', newFind: '도감에 새로', festival: '섬 축제!', made: '이번 판에 키운 것', muteOn: '소리 켜기', muteOff: '소리 끄기',
    howGarden: '정원 줄기', howSea: '바다 줄기', pts: '점', turn: '차례',
  } : {
    daily: "Today's Isle", free: 'Free Isle', score: 'Score', best: 'Best', pouch: 'Pouch', next: 'Next', hand: 'In hand',
    tipStart: 'Line up three alike to grow them one step', tipGull: 'Gulls wander to empty cells. Trap them to get shells',
    tipWind: 'The wind jar blows away one filled cell', tipRainbow: 'A rainbow seed becomes the best match', tipPouch: 'Tap the pouch to swap with your hand',
    tipFull: 'Only a few cells left. Try the pouch', overTitle: 'The isle is full', overDaily: "Today's record", overFree: 'Free isle best',
    again: 'Grow again', toFree: 'Go to free isle', toDaily: "Go to today's isle", codex: 'Isle Guide', found: 'found', unknown: 'Not yet found',
    week: "Past daily isles", close: 'Close', newFind: 'New in guide', festival: 'Isle festival!', made: 'Grown this round', muteOn: 'Sound on', muteOff: 'Sound off',
    howGarden: 'Garden line', howSea: 'Sea line', pts: 'pts', turn: 'Turn',
  };
  const fmt = (n) => Math.round(n).toLocaleString(ko ? 'ko-KR' : 'en-US');
  const dateLabel = (key) => {
    const [, m, d] = key.split('-').map(Number);
    return ko ? `${m}월 ${d}일` : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`;
  };

  // ---------- 소리 ----------
  Sfx.define('plop', (c, out, t, o) => {
    Sfx.tone(c, out, t, { type: 'sine', freq: 340 * (o.pitch || 1), to: 170, dur: 0.12, vol: 0.32 });
    Sfx.noise(c, out, t, { freq: 1600, to: 300, dur: 0.06, vol: 0.12 });
  });
  Sfx.define('grow', (c, out, t, o) => {
    const base = o.tier || 0;
    [0, 4, 7, 12].forEach((s, i) => Sfx.tone(c, out, t + i * 0.05, { type: 'triangle', freq: Sfx.note(12 + base * 2 + s), dur: i === 3 ? 0.32 : 0.1, vol: 0.2 }));
    Sfx.tone(c, out, t + 0.2, { type: 'sine', freq: Sfx.note(36 + base * 2), dur: 0.4, vol: 0.06 });
  });
  Sfx.define('squawk', (c, out, t) => {
    Sfx.tone(c, out, t, { type: 'sawtooth', freq: 1100, to: 700, dur: 0.09, vol: 0.07, filter: 2600 });
    Sfx.tone(c, out, t + 0.11, { type: 'sawtooth', freq: 1000, to: 640, dur: 0.12, vol: 0.06, filter: 2400 });
  });
  Sfx.define('shell', (c, out, t) => {
    [0, 7, 12, 16].forEach((s, i) => Sfx.tone(c, out, t + i * 0.04, { type: 'sine', freq: Sfx.note(24 + s), dur: 0.18, vol: 0.14 }));
  });
  Sfx.define('wave', (c, out, t) => Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 500, to: 1400, q: 0.8, dur: 0.6, vol: 0.12, attack: 0.25 }));
  const MUSIC = { bpm: 92, mood: 'calm', seed: 11 };
  let musicOn = false;
  const startMusic = () => { if (!musicOn) { musicOn = true; Sfx.music(MUSIC); } };

  // ---------- 저장 ----------
  let save = L.newSave();
  try { save = L.sanitizeSave(JSON.parse(localStorage.getItem(KEY))); } catch { save = L.newSave(); }
  const today = L.dateKey();
  let demo = false;
  let shotMode = false;
  function writeSave() {
    if (demo || shotMode) return;
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 저장이 막힌 환경에서도 앱은 돈다. */ }
  }
  function runFor(mode) {
    if (mode === 'daily') {
      if (!save.daily || save.daily.date !== today || (save.daily.over && false)) save.daily = L.dailyRun(today);
      return save.daily;
    }
    if (!save.free) save.free = L.newRun({ seed: (Date.now() ^ 0x5eed) >>> 0, mode: 'free' });
    return save.free;
  }
  let mode = save.mode;
  let run = runFor(mode);

  // ---------- 화면 뼈대 ----------
  const app = document.getElementById('app');
  const view = IsleScene.create(app);
  const ICONS = IsleScene.icons(L.PIECES);
  const icon = (kind) => ICONS[kind] || '';

  const svg = {
    on: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.6 6c3 3.3 3 8.7 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    off: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M12 6.5C9.8 5 6.6 4.6 3 5.2v13c3.6-.6 6.8-.2 9 1.3 2.2-1.5 5.4-1.9 9-1.3v-13c-3.6-.6-6.8-.2-9 1.3zM12 6.5v13" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="16.5" cy="10" r="1.6" fill="currentColor"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const top = document.createElement('header');
  top.className = 'top';
  top.innerHTML = `
    <button class="mode" id="mode"><span class="flag"></span><span class="label"></span></button>
    <div class="board"><small>${S.score}</small><b id="score">0</b><em id="best"></em></div>
    <div class="tools"><button class="round" id="codexBtn" aria-label="${S.codex}">${svg.book}</button><button class="round" id="mute"></button></div>`;
  const dock = document.createElement('footer');
  dock.className = 'dock';
  dock.innerHTML = `
    <p class="tip" id="tip"></p>
    <div class="tray">
      <button class="pouch" id="pouch" aria-label="${S.pouch}"><span class="slot"><img alt=""></span><span class="cap">${svg.swap}${S.pouch}</span></button>
      <div class="hand"><span class="slot big"><img alt=""></span><span class="cap" id="handName"></span></div>
      <div class="next"><span class="slot"><img alt=""></span><span class="cap">${S.next}</span></div>
    </div>`;
  const fx = document.createElement('div');
  fx.className = 'fx';
  const sheet = document.createElement('div');
  sheet.className = 'sheet hidden';
  app.append(top, dock, fx, sheet);
  const $ = (sel, root = app) => root.querySelector(sel);

  function paintMute() {
    const b = $('#mute');
    b.innerHTML = Sfx.muted ? svg.off : svg.on;
    b.setAttribute('aria-label', Sfx.muted ? S.muteOn : S.muteOff);
  }
  paintMute();

  function tipFor() {
    if (run.cur === 'gull') return S.tipGull;
    if (run.cur === 'wind') return S.tipWind;
    if (run.cur === 'rainbow') return S.tipRainbow;
    if (L.empties(run.board).length <= 5) return S.tipFull;
    if (run.turn < 4) return S.tipStart;
    if (run.turn < 10 && !run.store) return S.tipPouch;
    return '';
  }

  let shownScore = run.score;
  function paintHud(instant) {
    const m = $('#mode');
    m.querySelector('.label').innerHTML = mode === 'daily' ? `${S.daily}<small>${dateLabel(today)}</small>` : `${S.free}<small>${fmt(run.turn)} ${S.turn}</small>`;
    m.classList.toggle('free', mode === 'free');
    const best = mode === 'daily' ? Math.max(save.days[today] || 0, run.score) : Math.max(save.best, run.score);
    $('#best').textContent = `${S.best} ${fmt(best)}`;
    if (instant) shownScore = run.score;
    $('#score').textContent = fmt(shownScore);
    $('.hand img').src = icon(run.cur);
    $('#handName').textContent = NAMES[run.cur];
    $('.next img').src = icon(run.next);
    const p = $('#pouch');
    p.classList.toggle('empty', !run.store);
    const pimg = $('.pouch img');
    if (run.store) pimg.src = icon(run.store); else pimg.removeAttribute('src');
    const tip = tipFor();
    $('#tip').textContent = tip;
    $('#tip').classList.toggle('hidden', !tip);
  }

  // 점수는 올라가는 모습이 보이게 굴린다.
  view.stage.onFrame((dt) => {
    if (shownScore !== run.score) {
      const diff = run.score - shownScore;
      shownScore = Math.abs(diff) < 1 ? run.score : shownScore + diff * Math.min(1, dt * 8);
      $('#score').textContent = fmt(shownScore);
    }
  });

  function popText(i, text, cls = '') {
    const pos = view.screenOf(i);
    const el = document.createElement('div');
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    fx.append(el);
    if (!shotMode) setTimeout(() => el.remove(), 1300);
    return el;
  }
  function banner(text, cls = '') {
    const el = document.createElement('div');
    el.className = `banner ${cls}`;
    el.textContent = text;
    fx.append(el);
    if (!shotMode) setTimeout(() => el.remove(), 1800);
    return el;
  }

  // ---------- 놓기 ----------
  let cursor = -1;
  let animating = false;
  function previewAt(i) {
    cursor = i;
    if (i < 0 || run.over) { view.showCursor(-1); return; }
    const ok = L.canPlace(run, i);
    let cells = [];
    if (ok) {
      const { events } = L.place(run, i);
      const merges = events.filter((e) => e.type === 'merge' || e.type === 'festival');
      if (merges.length) cells = [...new Set(merges.flatMap((e) => (e.from || e.cells || []).concat(e.at)))];
      if (run.cur === 'wind') cells = [i];
    }
    view.showCursor(i, run.cur, cells, ok);
  }

  function commit(i, opts = {}) {
    if (animating || run.over) return false;
    const before = run;
    const { run: after, events } = L.place(run, i);
    if (!events.length) { Sfx.play('error'); Kit3D.shake(view.stage, 0.06); return false; }
    run = after;
    if (!demo) {
      save[mode] = run;
      const found = { ...save.codex };
      save = L.record(save, run);
      save.mode = mode;
      for (const k of L.ITEMS) if (save.codex[k] && !found[k] && k !== before.cur) setTimeout(() => banner(`${S.newFind}: ${NAMES[k]}`, 'find'), 700);
      writeSave();
    }
    view.showCursor(-1);
    animating = true;
    let tierChain = 0;
    view.play(events, run.board, {
      place: (e) => Sfx.play(e.rainbow ? 'power' : 'plop', { pitch: 0.9 + Math.random() * 0.2 }),
      merge: (e) => {
        const tier = Math.max(L.GARDEN.indexOf(e.kind), L.SEA.indexOf(e.kind) + 1);
        Sfx.play('grow', { tier: tier + tierChain });
        tierChain += 1;
        popText(e.at, `+${fmt(e.pts)} ${NAMES[e.kind]}`, tierChain > 1 ? 'chain' : '');
      },
      festival: (e) => { Sfx.play('win'); banner(S.festival, 'fest'); popText(e.at, `+${fmt(e.pts)}`, 'chain'); },
      trap: (e) => { Sfx.play('shell'); popText(e.cells[e.cells.length - 1], `${NAMES.shell}!`, 'sea'); },
      blow: () => Sfx.play('whoosh'),
      hop: () => { if (Math.random() < 0.35) Sfx.play('squawk'); },
      done: () => {
        animating = false;
        if (run.over) gameOver();
        opts.done?.();
      },
    });
    if (before.cur === 'gull') Sfx.play('squawk');
    paintHud();
    return true;
  }

  function doSwap() {
    if (animating || run.over) return;
    const after = L.swap(run);
    if (after === run) { Sfx.play('error'); return; }
    run = after;
    Sfx.play('select');
    $('#pouch').classList.remove('bump');
    void $('#pouch').offsetWidth;
    $('#pouch').classList.add('bump');
    if (!demo) { save[mode] = run; writeSave(); }
    previewAt(cursor);
    paintHud();
  }

  // ---------- 판 끝, 도감 ----------
  function openSheet(html, cls) {
    sheet.className = `sheet is-${cls}`;
    sheet.innerHTML = `<div class="card">${html}</div>`;
    sheet.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
  }
  function closeSheet() { sheet.className = 'sheet hidden'; sheet.innerHTML = ''; }
  const sheetOpen = () => !sheet.classList.contains('hidden');

  function madeSummary(r) {
    const kinds = L.ITEMS.filter((k) => k !== 'sprout' && r.made[k]).sort((a, b) => POINT_RANK(b) - POINT_RANK(a)).slice(0, 5);
    if (!kinds.length) return '';
    return `<p class="sub">${S.made}</p><div class="made">${kinds.map((k) => `<span><img src="${icon(k)}" alt=""><b>×${r.made[k]}</b><i>${NAMES[k]}</i></span>`).join('')}</div>`;
  }
  const POINT_RANK = (k) => L.POINTS[k] || 0;

  function gameOver() {
    if (!demo) { save = L.record(save, run); save.plays += 1; writeSave(); }
    const isDaily = run.mode === 'daily';
    const best = isDaily ? save.days[run.date] || run.score : save.best;
    const newBest = !demo && run.score >= best && run.score > 0;
    Sfx.play(newBest ? 'win' : 'lose');
    openSheet(`
      <div class="stamp">${isDaily ? dateLabel(run.date || today) : S.free}</div>
      <h2>${S.overTitle}</h2>
      <p class="big">${fmt(run.score)}<small>${S.pts}</small></p>
      <p class="sub">${isDaily ? S.overDaily : S.overFree} ${fmt(Math.max(best, run.score))} · ${S.turn} ${run.turn}</p>
      ${madeSummary(run)}
      <div class="row"><button class="primary" data-act="again">${S.again}</button><button data-act="${isDaily ? 'toFree' : 'toDaily'}">${isDaily ? S.toFree : S.toDaily}</button></div>`, 'over');
  }

  function openCodex() {
    const all = L.ITEMS;
    const found = all.filter((k) => save.codex[k]).length;
    const card = (k) => {
      const ok = save.codex[k] || shotMode;
      const pts = L.POINTS[k] ? `${fmt(L.POINTS[k])} ${S.pts}` : '';
      return `<li class="${ok ? '' : 'locked'}"><img src="${icon(k)}" alt=""><b>${ok ? NAMES[k] : '?'}</b><small>${ok ? pts : S.unknown}</small></li>`;
    };
    const days = [];
    for (let d = 6; d >= 0; d -= 1) {
      const t = new Date();
      t.setDate(t.getDate() - d);
      const key = L.dateKey(t);
      days.push({ key, v: save.days[key] || 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.v));
    openSheet(`
      <div class="stamp">${S.codex}</div>
      <h2>${S.codex} <span class="count">${shotMode ? all.length : found}/${all.length}</span></h2>
      <p class="sub">${S.howGarden}</p><ul class="codex">${L.GARDEN.map(card).join('')}</ul>
      <p class="sub">${S.howSea}</p><ul class="codex sea">${L.SEA.map(card).join('')}</ul>
      <p class="sub">${S.week}</p>
      <div class="bars">${days.map((d) => `<span style="--h:${Math.round((d.v / max) * 100)}%"><i></i><small>${d.key.slice(8)}</small></span>`).join('')}</div>
      <div class="row"><button class="primary" data-act="close">${S.close}</button></div>`, 'codex');
  }

  function switchMode(next) {
    mode = next;
    save.mode = mode;
    run = runFor(mode);
    if (run.over) run = mode === 'daily' ? (save.daily = L.dailyRun(today)) : (save.free = L.newRun({ seed: (Date.now() ^ 0xbee) >>> 0, mode: 'free' }));
    writeSave();
    view.sync(run.board);
    paintHud(true);
  }

  function act(name) {
    Sfx.play('tap');
    if (name === 'close') closeSheet();
    else if (name === 'again') {
      closeSheet();
      if (mode === 'daily') save.daily = L.dailyRun(today);
      else save.free = L.newRun({ seed: (Date.now() ^ 0xf00d) >>> 0, mode: 'free' });
      run = runFor(mode);
      writeSave();
      view.sync(run.board);
      Sfx.play('wave');
      paintHud(true);
    } else if (name === 'toFree') { closeSheet(); switchMode('free'); } else if (name === 'toDaily') { closeSheet(); switchMode('daily'); }
  }

  // ---------- 입력 ----------
  let pressed = false;
  view.stage.canvas.addEventListener('pointerdown', (e) => {
    startMusic();
    if (demo || animating || sheetOpen()) return;
    pressed = true;
    const i = view.cellAt(e.clientX, e.clientY);
    previewAt(i);
    if (i >= 0) Sfx.play('tap', { pitch: 0.8 });
  });
  view.stage.canvas.addEventListener('pointermove', (e) => {
    if (!pressed || demo) return;
    const i = view.cellAt(e.clientX, e.clientY);
    if (i !== cursor) previewAt(i);
  });
  const release = () => {
    if (!pressed) return;
    pressed = false;
    if (cursor >= 0) commit(cursor);
    else view.showCursor(-1);
  };
  view.stage.canvas.addEventListener('pointerup', release);
  view.stage.canvas.addEventListener('pointercancel', () => { pressed = false; view.showCursor(-1); });
  $('#pouch').addEventListener('click', () => { startMusic(); doSwap(); });
  $('#mute').addEventListener('click', () => { Sfx.setMuted(!Sfx.muted); paintMute(); if (!Sfx.muted) { startMusic(); Sfx.play('tap'); } });
  $('#codexBtn').addEventListener('click', () => { startMusic(); Sfx.play('select'); openCodex(); });
  $('#mode').addEventListener('click', () => { startMusic(); Sfx.play('select'); if (!animating) switchMode(mode === 'daily' ? 'free' : 'daily'); });
  $('.hand').addEventListener('click', () => { Sfx.play('tap'); $('.hand').classList.remove('bump'); void $('.hand').offsetWidth; $('.hand').classList.add('bump'); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet && !run.over) { Sfx.play('back'); closeSheet(); } });

  window.appFlush = writeSave;
  window.appBack = () => {
    if (sheetOpen() && !run.over) { closeSheet(); Sfx.play('back'); return true; }
    return false;
  };
  addEventListener('pagehide', writeSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });

  // ---------- 시연: 저장과 따로, 봇이 섬을 가꾼다 ----------
  window.appDemo = () => {
    if (demo) return true;
    demo = true;
    closeSheet();
    mode = 'free';
    run = L.newRun({ seed: 2026, mode: 'free' });
    view.sync(run.board);
    paintHud(true);
    musicOn = false;
    startMusic();
    Sfx.play('wave');
    let wait = 0.9;
    let stage = 0;
    let move = null;
    view.stage.onFrame((dt) => {
      if (!demo || animating) return;
      wait -= dt;
      if (wait > 0) return;
      if (run.over) {
        closeSheet();
        run = L.newRun({ seed: (run.seed + 7) >>> 0, mode: 'free' });
        view.sync(run.board);
        paintHud(true);
        wait = 1;
        return;
      }
      if (stage === 0) {
        move = L.bestMove(run);
        if (move.swap) { doSwap(); wait = 0.5; }
        stage = 1;
        previewAt(move.cell);
        wait = 0.32;
      } else {
        stage = 0;
        commit(move.cell);
        wait = 0.08;
      }
    });
    return true;
  };

  // ---------- 스토어 대표 화면 ----------
  function botBoard(seed, turns) {
    let r = L.newRun({ seed, mode: 'free' });
    for (let k = 0; k < turns && !r.over; k += 1) r = L.playMove(r, L.bestMove(r)).run;
    return r;
  }
  const shot = Number((location.hash.match(/shot=(\d+)/) || [])[1]);
  if (shot) {
    shotMode = true;
    document.body.classList.add('shot');
    if (shot === 1) {
      run = botBoard(5, 34);
      run.cur = 'bush';
      mode = 'daily';
      view.sync(run.board);
      paintHud(true);
      const target = L.empties(run.board).map((i) => ({ i, e: L.place(run, i).events.filter((e) => e.type === 'merge').length })).sort((a, b) => b.e - a.e)[0];
      if (target) previewAt(target.i);
    } else if (shot === 2) {
      run = botBoard(25, 110);
      mode = 'free';
      view.sync(run.board);
      paintHud(true);
      const spot = run.board.findIndex((k) => k === 'house');
      const at = spot >= 0 ? spot : Math.max(0, run.board.findIndex((k) => k === 'hut'));
      const shownKind = run.board[at] === 'house' ? 'house' : 'hut';
      setTimeout(() => popText(at, `+${fmt(L.POINTS[shownKind])} ${NAMES[shownKind]}`, 'chain'), 900);
      banner(`${S.newFind}: ${NAMES.mill}`, 'find');
      view.stage.onFrame((dt, time) => {
        if (Math.floor(time * 2) !== Math.floor((time - dt) * 2)) {
          Kit3D.burst(view.scene, IsleScene.cellPos(at, 0.5), '#ffe066', { count: 20, speed: 4.5, size: 0.13, life: 0.9 });
        }
      });
    } else if (shot === 3) {
      run = botBoard(12, 50);
      view.sync(run.board);
      const now = new Date();
      for (let d = 0; d < 7; d += 1) {
        const t = new Date(now);
        t.setDate(t.getDate() - d);
        save.days[L.dateKey(t)] = [3120, 2480, 4410, 1990, 3650, 5230, 2870][d];
      }
      paintHud(true);
      openCodex();
    } else {
      run = L.newRun({ seed: 3, mode: 'free' });
      const layout = ['lighthouse', 'mill', 'house', 'hut', 'tree', 'bush', 'chest', 'pearl', 'shell', 'house', 'mill', 'tree', 'tower', 'hut', 'bush', 'sprout', 'gull', 'tree'];
      run.board = run.board.map((_, i) => layout[(i * 7) % layout.length]);
      run.score = 18640;
      run.turn = 212;
      run.over = true;
      run.made = { bush: 41, tree: 15, hut: 6, house: 3, mill: 2, lighthouse: 1, pearl: 2, chest: 1 };
      mode = 'free';
      save.best = 18640;
      view.sync(run.board);
      paintHud(true);
      gameOver();
    }
  } else {
    view.sync(run.board);
    paintHud(true);
    if (run.over) setTimeout(gameOver, 400);
  }
})();
