// 붉은 실 단서판 화면. 약속:
// 1) localStorage는 try/catch 2) window.appFlush는 가려질 때 저장 3) window.appBack은 열린 서류철을 닫고 true
// 4) #shot=번호면 그 번호의 대표 화면 5) window.appDemo는 저장 기록과 분리된 시연 6) 소리는 Sfx, 머리띠에 소리 끄기.
(function () {
  const KEY = 'redstring-v1';
  const LANG = /^ko/i.test(navigator.language || '') ? 'ko' : 'en';
  const shotMatch = /#shot=(\d+)/.exec(location.hash);
  const SHOT = shotMatch ? Number(shotMatch[1]) : 0;
  const THREADS = ['#c0392b', '#2f5d8a', '#b8860b', '#3f7d4e'];

  const T = {
    ko: {
      daily: '오늘의 사건', file: (n) => `사건 파일 ${n}`, tie: '실 묶기', clear: '풀기', strands: '남은 실',
      close: '하나만 빼면 맞아요', wrong: '공통점이 없어요', repeat: '이미 이어 본 조합이에요', need: '카드 넷을 고르세요',
      solved: '단서 확보!', hint: '돋보기', hintUsed: '돋보기는 사건마다 한 번', shuffle: '섞기',
      win: '사건 해결', lose: '실이 다 끊겼어요', stampsLabel: '도장', mistakes: (n) => `끊은 실 ${n}가닥`,
      next: (n) => `사건 파일 ${n} 열기`, retry: '다시 풀기', notebook: '공통점 수첩', drawer: '사건함',
      found: (a, b) => `밝힌 공통점 ${a} / ${b}`, locked: '아직 못 밝힘', todayDone: (s) => `오늘 도장 ${s}개`, todayOpen: '아직 안 풀었어요',
      stats: (s) => `푼 사건 ${s.won} · 완벽 ${s.flawless} · 모은 도장 ${s.stampsTotal}`,
      openDaily: '오늘의 사건 열기', openFile: (n) => `사건 파일 ${n} 이어서`, closeSheet: '닫기', sound: '소리', answers: '정답',
      seal: '해결', tip: '같은 공통점을 가진 카드 넷을 차례로 짚어 실로 이으세요', demo: '시연',
    },
    en: {
      daily: "Today's Case", file: (n) => `Case File ${n}`, tie: 'Tie', clear: 'Clear', strands: 'String left',
      close: 'One away!', wrong: 'No connection', repeat: 'Already tried that', need: 'Pick four cards',
      solved: 'Clue found!', hint: 'Lens', hintUsed: 'One lens per case', shuffle: 'Shuffle',
      win: 'Case closed', lose: 'Out of string', stampsLabel: 'Stamps', mistakes: (n) => `${n} string${n === 1 ? '' : 's'} snapped`,
      next: (n) => `Open Case File ${n}`, retry: 'Try again', notebook: 'Clue Notebook', drawer: 'Case Drawer',
      found: (a, b) => `Links found ${a} / ${b}`, locked: 'Not found yet', todayDone: (s) => `Today: ${s} stamp${s === 1 ? '' : 's'}`, todayOpen: 'Not solved yet',
      stats: (s) => `Solved ${s.won} · Flawless ${s.flawless} · Stamps ${s.stampsTotal}`,
      openDaily: "Open today's case", openFile: (n) => `Continue Case File ${n}`, closeSheet: 'Close', sound: 'Sound', answers: 'Answers',
      seal: 'SOLVED', tip: 'Tap four cards that share a link to string them together', demo: 'Demo',
    },
  }[LANG];

  document.documentElement.lang = LANG;
  document.documentElement.classList.add(`lang-${LANG}`);
  let demo = false;
  const load = () => {
    try { return Logic.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return Logic.newState(); }
  };
  const save = () => {
    if (demo || SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막힌 환경에서도 앱은 돌아간다. */ }
  };

  let state = load();
  let sheet = null; // null | 'result' | 'notebook' | 'drawer'
  let toast = null;
  let snapping = null; // 끊어지는 실 그리기용 낱말 목록
  let justSolved = -1;
  const today = () => Logic.dateKey(new Date());

  // ---------- 소리 ----------
  Sfx.define('pin', (c, out, t, o) => {
    Sfx.tone(c, out, t, { type: 'triangle', freq: 1250 * (o.pitch || 1), to: 900, dur: 0.05, vol: 0.16 });
    Sfx.noise(c, out, t, { freq: 4200, dur: 0.03, vol: 0.12, filterType: 'highpass' });
  });
  Sfx.define('unpin', (c, out, t) => Sfx.tone(c, out, t, { type: 'triangle', freq: 800, to: 560, dur: 0.07, vol: 0.13 }));
  Sfx.define('snap', (c, out, t) => {
    Sfx.noise(c, out, t, { freq: 6000, to: 700, dur: 0.12, vol: 0.4, filterType: 'bandpass', q: 3 });
    Sfx.tone(c, out, t, { type: 'sawtooth', freq: 340, to: 70, dur: 0.28, vol: 0.12, filter: 1800 });
  });
  Sfx.define('tie', (c, out, t) => {
    [0, 7, 12, 16].forEach((s, i) => Sfx.tone(c, out, t + i * 0.05, { type: 'triangle', freq: Sfx.note(s + 7), dur: 0.5, vol: 0.13 }));
    Sfx.noise(c, out, t, { freq: 2600, to: 900, dur: 0.18, vol: 0.12, filterType: 'bandpass', q: 2 });
  });
  Sfx.define('stamp', (c, out, t) => {
    Sfx.tone(c, out, t, { type: 'sine', freq: 140, to: 55, dur: 0.22, vol: 0.5 });
    Sfx.noise(c, out, t, { freq: 1200, to: 200, dur: 0.1, vol: 0.3 });
  });
  Sfx.define('paper', (c, out, t) => Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 1800, to: 3400, q: 0.8, dur: 0.2, vol: 0.18, attack: 0.04 }));
  const MUSIC = { bpm: 84, mood: 'calm', mode: 'minor', seed: 19 };
  let musicOn = false;
  function startMusic() {
    if (musicOn) return;
    musicOn = true;
    Sfx.music(MUSIC);
  }

  // ---------- 사건 고르기 ----------
  // 시작할 때만 부른다: 이어 풀던 사건이 있으면 그대로, 끝난 사건이면 오늘의 사건이나 다음 사건 파일을 편다.
  function ensureRun() {
    if (state.run && !state.run.done && state.run.lang === LANG) return;
    if (!(today() in state.daily)) state.run = Logic.newRun('daily', today(), LANG);
    else state.run = Logic.newRun('case', state.level, LANG);
  }

  function openRun(kind, key) {
    if (sheet === 'result' && window.onestoreAd) window.onestoreAd.atBreak();
    state.run = Logic.newRun(kind, key, LANG);
    sheet = null;
    toast = null;
    save();
    Sfx.play('paper');
    render();
  }

  // ---------- 그리기 ----------
  const app = document.getElementById('app');
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const svgNS = 'http://www.w3.org/2000/svg';

  function fitClass(word) {
    const n = [...word].length;
    if (LANG === 'ko') return n <= 3 ? 'f1' : n === 4 ? 'f2' : 'f3';
    return n <= 5 ? 'f1' : n <= 7 ? 'f2' : 'f3';
  }
  const tilt = (word) => ((Logic.hash(word) % 7) - 3) * 0.7;

  function caseTitle(run) {
    if (run.kind === 'daily') {
      const [, m, d] = run.key.split('-').map(Number);
      return T.daily;
    }
    return T.file(run.key);
  }

  function iconSound(muted) {
    return muted
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" class="ln"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5c1.6 2 1.6 5 0 7M18.6 6c3 3.4 3 8.6 0 12" class="ln"/></svg>';
  }
  const ICON = {
    book: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" class="ln"/><path d="M8 4v13M5 17a3 3 0 0 1 3-3h11" class="ln"/></svg>',
    drawer: '<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z" class="ln"/></svg>',
    lens: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" class="ln"/><path d="M14.5 14.5L20 20" class="ln"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M3 7h4c5 0 5 10 10 10h4M3 17h4c2 0 3-1.5 4-3.5M15 7h6M18 4l3 3-3 3M18 14l3 3-3 3" class="ln"/></svg>',
  };

  function iconButton(cls, svg, label, onClick) {
    const b = el('button', `icon ${cls}`);
    b.innerHTML = svg;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function render() {
    const run = state.run;
    app.innerHTML = '';

    // 머리띠: 서류철 이름표
    const head = el('header', 'folder');
    const tab = el('div', 'tab');
    tab.append(el('span', 'case-no', caseTitle(run)));
    const strands = el('div', 'strands');
    strands.setAttribute('aria-label', `${T.strands} ${Logic.strandsLeft(run)}`);
    for (let i = 0; i < Logic.STRANDS; i += 1) {
      const s = el('span', i < Logic.strandsLeft(run) ? 'spool' : 'spool cut');
      strands.append(s);
    }
    if (run.kind === 'daily') {
      const [, m, d] = run.key.split('-').map(Number);
      strands.append(el('small', 'date', LANG === 'ko' ? `${m}월 ${d}일` : `${m}/${d}`));
    }
    tab.append(strands);
    head.append(tab);
    const tools = el('div', 'tools');
    tools.append(
      iconButton('drawer-btn', ICON.drawer, T.drawer, () => { Sfx.play('paper'); sheet = 'drawer'; render(); }),
      iconButton('book-btn', ICON.book, T.notebook, () => { Sfx.play('paper'); sheet = 'notebook'; render(); }),
      iconButton('sound-btn', iconSound(Sfx.muted), T.sound, () => {
        Sfx.setMuted(!Sfx.muted);
        if (!Sfx.muted) { Sfx.play('tap'); startMusic(); }
        render();
      }),
    );
    head.append(tools);
    app.append(head);

    // 코르크 판
    const board = el('section', 'board');
    const pinned = el('div', 'pinned');
    run.solved.forEach((gi, order) => {
      const g = run.groups[gi];
      const card = el('div', `clue${gi === justSolved ? ' fresh' : ''}${run.done === 'lose' && order >= run.solved.length - (Logic.GROUPS - countWon(run)) ? ' reveal' : ''}`);
      card.style.setProperty('--thread', THREADS[gi]);
      card.append(el('b', 'clue-name', g.name), el('span', 'clue-words', g.words.join(' · ')));
      pinned.append(card);
    });
    board.append(pinned);

    const grid = el('div', 'grid');
    const rem = Logic.remaining(run);
    for (const word of rem) {
      const b = el('button', `note ${fitClass(word)}`);
      b.dataset.word = word;
      b.style.setProperty('--tilt', `${tilt(word)}deg`);
      const k = run.sel.indexOf(word);
      if (k >= 0) { b.classList.add('on'); b.dataset.order = String(k + 1); }
      if (run.hinted.includes(word) && !run.done) b.classList.add('hinted');
      if (snapping && snapping.includes(word)) b.classList.add('jolt');
      b.append(el('i', 'pin'), el('span', 'word', word));
      b.addEventListener('click', () => onCard(word));
      grid.append(b);
    }
    board.append(grid);
    const yarn = document.createElementNS(svgNS, 'svg');
    yarn.setAttribute('class', 'yarn');
    board.append(yarn);
    if (!run.solved.length && !run.sel.length && !run.done) board.append(el('p', 'tip', T.tip));
    app.append(board);

    // 아래 손잡이
    const dock = el('footer', 'dock');
    dock.append(
      iconButton('lens-btn', ICON.lens, T.hint, onHint),
      iconButton('shuffle-btn', ICON.shuffle, T.shuffle, onShuffle),
    );
    const clear = el('button', 'ghost', T.clear);
    clear.disabled = !run.sel.length || !!run.done;
    clear.addEventListener('click', () => { state.run = { ...run, sel: [] }; Sfx.play('unpin'); save(); render(); });
    const tie = el('button', 'tie');
    tie.append(el('span', null, T.tie), el('small', 'count', `${run.sel.length}/4`));
    tie.disabled = run.sel.length !== 4 || !!run.done;
    tie.addEventListener('click', onTie);
    dock.append(clear, tie);
    if (run.hints >= Logic.HINTS || run.done) dock.querySelector('.lens-btn').classList.add('spent');
    app.append(dock);

    if (toast) {
      const t = el('div', `toast ${toast.kind}`, toast.text);
      app.append(t);
    }
    if (sheet) app.append(renderSheet());
    fitWords();
    drawYarn();
  }

  function countWon(run) {
    // 실패로 끝난 판에서 사용자가 직접 밝힌 묶음 수
    return run.guesses.filter((sig) => {
      const words = sig.split('|');
      const g = Logic.groupOf(run, words[0]);
      return g >= 0 && words.every((w) => Logic.groupOf(run, w) === g);
    }).length;
  }

  // 카드 폭에 맞게 낱말 글자 크기를 줄인다(좁은 폰에서 줄바꿈 대신).
  function fitWords() {
    for (const w of app.querySelectorAll('.note .word')) {
      let size = parseFloat(getComputedStyle(w).fontSize);
      let guard = 0;
      while (w.scrollWidth > w.clientWidth + 0.5 && size > 9 && guard < 30) {
        size -= 0.5;
        guard += 1;
        w.style.fontSize = `${size}px`;
      }
    }
  }

  // 고른 카드의 압정을 순서대로 처지는 실로 잇는다.
  function drawYarn() {
    const board = app.querySelector('.board');
    const yarn = app.querySelector('.yarn');
    if (!board || !yarn) return;
    const run = state.run;
    const words = snapping || run.sel;
    yarn.innerHTML = '';
    const box = board.getBoundingClientRect();
    yarn.setAttribute('width', box.width);
    yarn.setAttribute('height', box.height);
    yarn.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const pts = words.map((w) => {
      const pin = board.querySelector(`.note[data-word="${CSS.escape(w)}"] .pin`);
      if (!pin) return null;
      const r = pin.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    }).filter(Boolean);
    if (pts.length < 2) return;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i += 1) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const sag = 6 + Math.hypot(x1 - x0, y1 - y0) * 0.07;
      d += ` Q${(x0 + x1) / 2},${Math.max(y0, y1) + sag} ${x1},${y1}`;
    }
    const shadow = document.createElementNS(svgNS, 'path');
    shadow.setAttribute('d', d);
    shadow.setAttribute('class', 'yarn-shadow');
    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute('d', d);
    line.setAttribute('class', snapping ? 'yarn-line snap' : 'yarn-line');
    yarn.append(shadow, line);
  }

  function renderSheet() {
    const wrap = el('div', 'veil');
    wrap.addEventListener('click', (e) => { if (e.target === wrap && sheet !== 'result') { sheet = null; Sfx.play('back'); render(); } });
    const card = el('div', `sheet ${sheet}`);
    const run = state.run;
    if (sheet === 'result') {
      const won = run.done === 'win';
      card.append(el('h2', 'sheet-title', won ? T.win : T.lose));
      if (won) card.append(el('div', 'seal', T.seal));
      card.append(el('p', 'sheet-sub', caseTitle(run)));
      const row = el('div', 'stamps');
      const got = Logic.stamps(run);
      for (let i = 0; i < 3; i += 1) {
        const s = el('span', i < got ? 'stamp got' : 'stamp');
        s.style.animationDelay = `${0.25 + i * 0.28}s`;
        s.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/><path d="M12 21l5 5 11-12"/></svg>';
        row.append(s);
      }
      card.append(row);
      card.append(el('p', 'sheet-note', T.mistakes(run.mistakes)));
      const list = el('ol', 'answer-list');
      run.groups.forEach((g, i) => {
        const li = el('li');
        li.style.setProperty('--thread', THREADS[i]);
        li.append(el('b', null, g.name), el('span', null, g.words.join(' · ')));
        list.append(li);
      });
      card.append(list);
      const acts = el('div', 'acts');
      if (run.kind === 'case' && won) acts.append(actButton('primary', T.next(state.level), () => openRun('case', state.level)));
      else if (!won) acts.append(actButton('primary', T.retry, () => openRun(run.kind, run.key)));
      if (run.kind === 'daily' && won) acts.append(actButton('primary', T.next(state.level), () => openRun('case', state.level)));
      acts.append(actButton('', T.notebook, () => { sheet = 'notebook'; Sfx.play('paper'); render(); }));
      card.append(acts);
    } else if (sheet === 'notebook') {
      card.append(el('h2', 'sheet-title', T.notebook));
      card.append(el('p', 'sheet-sub', T.found(Logic.foundCount(state, LANG), Logic.totalTopics(LANG))));
      const grid = el('div', 'topics');
      for (const c of (window.Bank[LANG] || [])) {
        const has = state.found[c.id];
        const t = el('div', has ? `topic t${c.tier}` : 'topic locked');
        t.append(el('b', null, has ? c.name : '?'), el('span', null, has ? `${c.words.slice(0, 3).join(', ')}…` : T.locked));
        grid.append(t);
      }
      card.append(grid);
      card.append(actButton('', T.closeSheet, closeSheet));
    } else if (sheet === 'drawer') {
      card.append(el('h2', 'sheet-title', T.drawer));
      card.append(el('p', 'sheet-sub', T.stats(state.stats)));
      const day = today();
      const dailyRow = el('div', 'drawer-row');
      dailyRow.append(el('b', null, T.daily), el('span', null, day in state.daily ? T.todayDone(state.daily[day]) : T.todayOpen));
      card.append(dailyRow);
      const acts = el('div', 'acts');
      acts.append(actButton('primary', T.openDaily, () => openRun('daily', day)));
      acts.append(actButton('', T.openFile(state.level), () => openRun('case', state.level)));
      acts.append(actButton('', T.closeSheet, closeSheet));
      card.append(acts);
    }
    wrap.append(card);
    return wrap;
  }

  function actButton(cls, text, fn) {
    const b = el('button', `act ${cls}`, text);
    b.addEventListener('click', fn);
    return b;
  }
  function closeSheet() {
    sheet = null;
    Sfx.play('back');
    render();
  }

  // ---------- 손맛 ----------
  function burst(x, y, color, n = 16) {
    const layer = el('div', 'burst');
    layer.style.left = `${x}px`;
    layer.style.top = `${y}px`;
    for (let i = 0; i < n; i += 1) {
      const p = el('i');
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = 40 + Math.random() * 60;
      p.style.setProperty('--dx', `${Math.cos(a) * r}px`);
      p.style.setProperty('--dy', `${Math.sin(a) * r - 20}px`);
      p.style.setProperty('--rot', `${Math.random() * 360}deg`);
      p.style.background = i % 3 ? color : '#f3e6c4';
      layer.append(p);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 900);
  }
  function popText(x, y, text, cls) {
    const p = el('div', `pop ${cls || ''}`, text);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    document.body.append(p);
    setTimeout(() => p.remove(), 1100);
  }
  function shake() {
    app.classList.remove('shake');
    void app.offsetWidth;
    app.classList.add('shake');
    setTimeout(() => app.classList.remove('shake'), 450);
  }
  function showToast(text, kind) {
    toast = { text, kind };
    const id = Math.random();
    toast.id = id;
    setTimeout(() => { if (toast && toast.id === id) { toast = null; const t = app.querySelector('.toast'); if (t) t.remove(); } }, 1500);
  }
  function selCenter() {
    const notes = [...app.querySelectorAll('.note.on')];
    if (!notes.length) return [innerWidth / 2, innerHeight / 2];
    const rs = notes.map((n) => n.getBoundingClientRect());
    return [rs.reduce((a, r) => a + r.left + r.width / 2, 0) / rs.length, rs.reduce((a, r) => a + r.top + r.height / 2, 0) / rs.length];
  }

  // ---------- 조작 ----------
  function onCard(word) {
    startMusic();
    const run = state.run;
    if (run.done || snapping) return;
    const before = run.sel.length;
    state.run = Logic.toggle(run, word);
    if (state.run.sel.length > before) Sfx.play('pin', { pitch: 1 + state.run.sel.length * 0.08 });
    else if (state.run.sel.length < before) Sfx.play('unpin');
    else Sfx.play('error');
    save();
    render();
  }

  function onTie() {
    startMusic();
    const run = state.run;
    if (run.sel.length !== 4) { Sfx.play('error'); showToast(T.need, 'warn'); render(); return; }
    const [cx, cy] = selCenter();
    const out = Logic.submit(run);
    if (out.result === 'solved') {
      state.run = out.run;
      justSolved = out.group;
      Sfx.play('tie');
      burst(cx, cy, THREADS[out.group], 22);
      popText(cx, cy - 10, T.solved, 'good');
      save();
      render();
      setTimeout(() => { justSolved = -1; }, 600);
      if (state.run.done) finishRun();
    } else if (out.result === 'repeat') {
      Sfx.play('error');
      showToast(T.repeat, 'warn');
      render();
    } else {
      snapping = run.sel.slice();
      state.run = out.run;
      Sfx.play('snap');
      shake();
      popText(cx, cy - 10, out.result === 'close' ? T.close : T.wrong, 'bad');
      save();
      render();
      setTimeout(() => {
        snapping = null;
        render();
        if (state.run.done) finishRun();
      }, 520);
    }
  }

  function finishRun() {
    if (state.run.recorded) return;
    const run = state.run;
    state = Logic.finish(state, run); // 시연 중에는 따로 만든 상태라 저장되지 않는다.
    state.run = { ...run, recorded: true };
    save();
    setTimeout(() => {
      Sfx.play(run.done === 'win' ? 'win' : 'lose');
      sheet = 'result';
      render();
      if (run.done === 'win') setTimeout(() => {
        const got = Logic.stamps(run);
        for (let i = 0; i < got; i += 1) setTimeout(() => Sfx.play('stamp'), 250 + i * 280);
      }, 0);
    }, 700);
  }

  function onHint() {
    startMusic();
    const run = state.run;
    const out = Logic.hint(run);
    if (!out.pair) { Sfx.play('error'); showToast(T.hintUsed, 'warn'); render(); return; }
    state.run = out.run;
    Sfx.play('power');
    save();
    render();
    const notes = out.pair.map((w) => app.querySelector(`.note[data-word="${CSS.escape(w)}"]`)).filter(Boolean);
    for (const n of notes) {
      const r = n.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, '#e8c15a', 8);
    }
  }

  function onShuffle() {
    startMusic();
    if (state.run.done) return;
    state.run = Logic.shuffleRun(state.run, (Date.now() & 0xffff) + 7);
    Sfx.play('whoosh');
    save();
    render();
  }

  // ---------- 약속 ----------
  window.appFlush = save;
  window.appBack = () => {
    if (sheet && sheet !== 'result') { closeSheet(); return true; }
    if (state.run.sel.length && !state.run.done) { state.run = { ...state.run, sel: [] }; render(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
  addEventListener('resize', () => drawYarn());

  // 시연: 저장 기록과 분리된 사건 하나를 봇이 풀어 보인다(실수 한 번, 돋보기 한 번 포함).
  window.appDemo = function appDemo() {
    demo = true;
    sheet = null;
    toast = null;
    musicOn = false;
    startMusic();
    const fake = Logic.newState();
    fake.level = 6;
    fake.found = { ...state.found };
    state = fake;
    const steps = [];
    const wait = (ms) => steps.push(['wait', ms]);
    const tap = (w) => steps.push(['tap', w]);
    const act = (fn) => steps.push(['act', fn]);
    function plan(run, withMistake) {
      const order = [0, 2, 3, 1];
      if (withMistake) {
        const g0 = run.groups[order[0]].words;
        const decoy = run.groups[order[1]].words[0];
        [g0[0], g0[1], g0[2], decoy].forEach((w) => { tap(w); wait(520); });
        act(onTie); wait(1300);
        act(() => { state.run = { ...state.run, sel: [] }; Sfx.play('unpin'); render(); }); wait(600);
      }
      order.forEach((g, k) => {
        const words = run.groups[g].words;
        for (const w of words) { tap(w); wait(k === 0 && withMistake ? 420 : 380); }
        act(onTie); wait(1400);
      });
    }
    state.run = Logic.newRun('case', 6, LANG);
    render();
    wait(1200);
    plan(state.run, true);
    wait(4200);
    act(() => openRun('case', 7));
    wait(900);
    act(() => {
      const r = state.run;
      const order = [1, 3, 0, 2];
      const extra = [];
      order.forEach((g) => { r.groups[g].words.forEach((w) => extra.push(['tap', w], ['wait', 300])); extra.push(['act', onTie], ['wait', 1200]); });
      steps.splice(cursor + 1, 0, ...extra);
    });
    wait(4000);
    let cursor = -1;
    function step() {
      cursor += 1;
      if (cursor >= steps.length) return;
      const [kind, v] = steps[cursor];
      if (kind === 'wait') { setTimeout(step, v); return; }
      if (kind === 'tap') {
        if (state.run.sel.includes(v)) { step(); return; }
        const b = app.querySelector(`.note[data-word="${CSS.escape(v)}"]`);
        if (b) b.classList.add('press');
        setTimeout(() => { onCard(v); step(); }, 110);
        return;
      }
      v();
      step();
    }
    step();
    return new Promise((resolve) => setTimeout(resolve, 100));
  };

  // ---------- 스토어 스크린샷 ----------
  function shotSetup(n) {
    document.body.classList.add('shot');
    const st = Logic.newState();
    st.stats = { played: 23, won: 21, flawless: 9, stampsTotal: 52 };
    const bank = window.Bank[LANG];
    if (n === 1) {
      let r = Logic.newRun('daily', '2026-11-19', LANG);
      r = Logic.submit(r.groups[1].words.reduce((a, w) => Logic.toggle(a, w), r)).run;
      r = r.groups[3].words.slice(0, 3).reduce((a, w) => Logic.toggle(a, w), r);
      st.run = r;
    } else if (n === 2) {
      let r = Logic.newRun('case', 8, LANG);
      r = Logic.submit(r.groups[0].words.reduce((a, w) => Logic.toggle(a, w), r)).run;
      r = Logic.submit(r.groups[2].words.reduce((a, w) => Logic.toggle(a, w), r)).run;
      r = { ...r, mistakes: 1 };
      r = r.groups[1].words.reduce((a, w) => Logic.toggle(a, w), r);
      st.run = r;
      st.level = 8;
      toast = { text: T.close, kind: 'warn' };
    } else if (n === 3) {
      let r = Logic.newRun('case', 11, LANG);
      for (let g = 0; g < 4; g += 1) r = Logic.submit(r.groups[g].words.reduce((a, w) => Logic.toggle(a, w), r)).run;
      st.run = { ...r, recorded: true };
      st.level = 12;
      sheet = 'result';
    } else {
      bank.forEach((c, i) => { if (i % 5 !== 2) st.found[c.id] = true; });
      st.run = Logic.newRun('case', 5, LANG);
      sheet = 'notebook';
    }
    state = st;
  }

  if (SHOT) shotSetup(SHOT);
  else ensureRun();
  render();
  if (SHOT) addEventListener('resize', render);
})();
