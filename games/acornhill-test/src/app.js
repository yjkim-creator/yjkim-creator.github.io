// 도토리 언덕 화면. 규칙은 logic.js, 3D 무대는 scene.js.
// 약속: 1) localStorage는 try/catch 2) window.appFlush는 가려질 때 저장 3) window.appBack은 열린 창을 닫고 true
// 4) #shot=번호면 대표 화면 5) window.appDemo()는 저장을 건드리지 않고 스스로 언덕을 걷는다 6) 소리는 Sfx, 소리 끄기 단추
(function () {
  const KEY = 'acornhill-v1';
  const ko = /^ko/i.test(navigator.language || 'ko');
  const L = ko ? {
    hill: (n) => `언덕 ${n}`, today: '오늘의 언덕', score: '점수', streak: (n) => `${n}연속`, draw: '뒤집기', help: '도움',
    coach: '바구니 맨 위 패보다 1 크거나 작은 패를 톡! 13 다음은 1이에요',
    armed: '도토리를 던질 패를 고르세요. 숫자와 상관없이 걷어 냅니다',
    noMove: '걷을 패가 없어요. 더미를 뒤집으세요', covered: '위에 다른 패가 덮여 있어요', mismatch: (a) => `바구니 패 ${a}에서 하나 위나 아래만 이어져요`,
    won: '언덕을 다 걷었어요!', lost: '더미가 바닥났어요', leftStock: (n) => `남은 더미 ${n}장`, bonus: '마무리 보너스', got: (n) => `도토리 +${n}`,
    next: '다음 언덕', retry: '이 언덕 다시', menu: '메뉴', storeTitle: '다람쥐 겨울 창고', mapTitle: '언덕 지도', todayBtn: '오늘의 언덕 걷기',
    todayDone: (s) => `오늘 기록 ${s}점`, todayNew: '아직 걷지 않았어요', acorns: (n) => `모은 도토리 ${n}`, nextItem: (n, name) => `${name}까지 ${n}개`, allItems: '창고가 가득 찼어요',
    rank: '🏆 전국 랭킹', close: '닫기', how: '걷는 법', howLines: ['위가 빈(앞면이 보이는) 패만 걷을 수 있어요.', '바구니 패와 숫자가 하나 차이면 걷혀요. 13과 1은 이어져요.', '이어서 걷을수록 점수가 커지고, 더미를 뒤집으면 연속이 끊겨요.', '도토리 도움은 한 판에 한 번, 아무 빈 패나 걷어요.', '더미를 많이 남기고 이기면 별이 늘어요.'],
    best: (n) => `최고 ${n}점`, sound: '소리', locked: '아직', stars: '별', perfect: '완벽!', wins: (n) => `이긴 판 ${n}`,
    dateFmt: (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`, mapDone: '서른 언덕을 다 걸었어요. 오늘의 언덕이 기다려요',
  } : {
    hill: (n) => `Hill ${n}`, today: "Today's Hill", score: 'Score', streak: (n) => `${n} chain`, draw: 'Flip', help: 'Help',
    coach: 'Tap a card one higher or lower than the basket card. 13 wraps to 1',
    armed: 'Pick a card for the acorn. It clears any open card',
    noMove: 'No match. Flip the stock', covered: 'Another card is on top of it', mismatch: (a) => `Only one above or below ${a} fits`,
    won: 'Hill cleared!', lost: 'Out of stock cards', leftStock: (n) => `${n} stock cards left`, bonus: 'Finish bonus', got: (n) => `+${n} acorns`,
    next: 'Next hill', retry: 'Retry hill', menu: 'Menu', storeTitle: "Squirrel's Winter Store", mapTitle: 'Hill Map', todayBtn: "Play today's hill",
    todayDone: (s) => `Today: ${s} pts`, todayNew: 'Not played yet', acorns: (n) => `${n} acorns saved`, nextItem: (n, name) => `${n} to ${name}`, allItems: 'The store is full',
    rank: '🏆 Leaderboard', close: 'Close', how: 'How to play', howLines: ['Only face-up cards with nothing on top can be taken.', 'Take a card one above or below the basket card. 13 and 1 connect.', 'Chains score more. Flipping the stock breaks the chain.', 'The acorn help clears any open card, once per hill.', 'Win with more stock left to earn more stars.'],
    best: (n) => `Best ${n}`, sound: 'Sound', locked: 'Locked', stars: 'Stars', perfect: 'Perfect!', wins: (n) => `${n} wins`,
    dateFmt: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), mapDone: 'All thirty hills walked. Today\'s hill awaits',
  };
  document.documentElement.lang = ko ? 'ko' : 'en';

  const shotN = Number((location.hash.match(/shot=(\d+)/) || [])[1]) || 0;
  const shotMode = shotN > 0;
  if (shotMode) document.body.classList.add('shot');

  // ---------- 저장 ----------
  let save = Logic.newSave();
  if (!shotMode) {
    try { save = Logic.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { save = Logic.newSave(); }
  }
  let demo = false;
  const writeSave = () => {
    if (demo || shotMode) return;
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 저장이 막혀도 게임은 이어진다. */ }
  };

  // ---------- 소리 ----------
  Sfx.define('card', (c, out, t, o) => {
    Sfx.noise(c, out, t, { filterType: 'highpass', freq: 2600, dur: 0.05, vol: 0.22 * (o.vol ?? 1) });
    Sfx.tone(c, out, t, { type: 'triangle', freq: 340 * (o.pitch ?? 1), to: 220, dur: 0.07, vol: 0.12 });
  });
  Sfx.define('chime', (c, out, t, o) => {
    const f = 587 * (o.pitch ?? 1);
    Sfx.tone(c, out, t, { type: 'triangle', freq: f, dur: 0.28, vol: 0.16 });
    Sfx.tone(c, out, t, { type: 'sine', freq: f * 2, dur: 0.18, vol: 0.06 });
    Sfx.tone(c, out, t + 0.05, { type: 'sine', freq: f * 1.5, dur: 0.2, vol: 0.05 });
  });
  Sfx.define('knock', (c, out, t, o) => {
    Sfx.tone(c, out, t, { type: 'triangle', freq: 260 * (o.pitch ?? 1), to: 150, dur: 0.09, vol: 0.28 });
    Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 900, q: 3, dur: 0.06, vol: 0.18 });
  });
  Sfx.define('rustle', (c, out, t) => Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 1800, to: 700, q: 0.8, dur: 0.28, vol: 0.2, attack: 0.05 }));
  const MUSIC = { bpm: 86, mood: 'calm', seed: 11 };
  let musicOn = false;
  const startMusic = () => { if (!musicOn) { musicOn = true; Sfx.music(MUSIC); } };

  // ---------- 화면 뼈대 ----------
  const app = document.getElementById('app');
  const world = HillScene.build(app);
  const ui = document.createElement('div');
  ui.className = 'ui';
  ui.innerHTML = `
    <header class="hud">
      <div class="sign"><small></small><b></b><span class="pips"></span></div>
      <div class="tally"><b class="score">0</b><span class="chain"></span></div>
      <div class="tools">
        <button class="round mute" aria-label="${L.sound}"></button>
        <button class="round menu-btn" aria-label="${L.menu}"><i></i><i></i><i></i></button>
      </div>
    </header>
    <div class="coach" hidden></div>
    <div class="pops"></div>
    <footer class="dock">
      <button class="flip"><span class="deck"><i></i><i></i><i></i></span><b>${L.draw}</b><em class="left">0</em></button>
      <button class="help"><span class="nut"></span><b>${L.help}</b><em class="wild">1</em></button>
    </footer>
    <section class="sheet result" hidden></section>
    <section class="sheet panel" hidden></section>`;
  app.append(ui);
  const $ = (sel) => ui.querySelector(sel);
  const signSmall = $('.sign small');
  const signBig = $('.sign b');
  const pips = $('.pips');
  const scoreEl = $('.score');
  const chainEl = $('.chain');
  const coach = $('.coach');
  const pops = $('.pops');
  const flipBtn = $('.flip');
  const helpBtn = $('.help');
  const resultSheet = $('.result');
  const panel = $('.panel');
  const muteBtn = $('.mute');

  const paintMute = () => { muteBtn.textContent = Sfx.muted ? '🔇' : '🔊'; muteBtn.classList.toggle('off', Sfx.muted); };
  muteBtn.addEventListener('click', () => { Sfx.setMuted(!Sfx.muted); if (!Sfx.muted) { musicOn = false; startMusic(); } Sfx.play('tap'); paintMute(); });
  paintMute();

  // ---------- 판 ----------
  let state = null;
  let armed = false;
  let ended = false;
  let hint = '';

  function makeRound(mode, key) {
    if (mode === 'day') {
      const d = Logic.dailyHill(key);
      const { deal, seed } = Logic.solvableDeal(d.seed, d.layout);
      return Logic.freshRound(deal, { mode: 'day', key, seed });
    }
    const h = Logic.mapHill(key);
    const { deal, seed } = Logic.solvableDeal(h.seed, h.layout);
    return Logic.freshRound(deal, { mode: 'map', key: h.n, seed });
  }
  function dealOf(s) {
    return { layout: s.layout, cards: s.cards, stock: s.stock, start: s.pile[0] };
  }
  const todayKey = () => Logic.dayKey(new Date());

  function begin(round, instant) {
    state = round;
    armed = false;
    ended = false;
    hint = '';
    resultSheet.hidden = true;
    world.layout(state, instant);
    world.snapCamera();
    world.squirrel.look(-0.5);
    if (!demo) { save.round = state; writeSave(); }
    paint();
    const st = Logic.status(state);
    if (st !== 'play' && !shotMode) { ended = true; paint(); setTimeout(() => finishRound(st), 700); }
  }
  function paint() {
    if (!state) return;
    if (state.mode === 'day') {
      signSmall.textContent = L.today;
      const [y, m, d] = String(state.key).split('-').map(Number);
      signBig.textContent = L.dateFmt(new Date(y, m - 1, d));
      pips.textContent = Logic.layout(state.layout)[ko ? 'ko' : 'en'];
    } else {
      const h = Logic.mapHill(state.key);
      signSmall.textContent = `${L.hill(h.n + 1)} · ${Logic.layout(state.layout)[ko ? 'ko' : 'en']}`;
      signBig.textContent = h.name[ko ? 'ko' : 'en'];
      const got = demo ? 0 : (save.stars[h.n] || 0);
      pips.innerHTML = [0, 1, 2].map((i) => `<i class="${i < got ? 'on' : ''}">★</i>`).join('');
    }
    scoreEl.textContent = String(state.score);
    chainEl.textContent = state.streak >= 2 ? L.streak(state.streak) : '';
    chainEl.classList.toggle('hot', state.streak >= 5);
    const left = Logic.stockLeft(state);
    flipBtn.querySelector('.left').textContent = String(left);
    flipBtn.disabled = left < 1 || ended;
    const stuck = Logic.status(state) === 'play' && Logic.playable(state).length === 0 && left > 0;
    flipBtn.classList.toggle('nudge', stuck && !armed);
    helpBtn.querySelector('.wild').textContent = String(state.wild);
    helpBtn.disabled = state.wild < 1 || ended;
    helpBtn.classList.toggle('armed', armed);
    let tip = hint;
    if (!tip && armed) tip = L.armed;
    if (!tip && !demo && save.played === 0 && state.moves < 3 && state.mode === 'map') tip = L.coach;
    coach.hidden = !tip;
    coach.textContent = tip;
  }
  let hintTimer = 0;
  function say(text) {
    hint = text;
    paint();
    clearTimeout(hintTimer);
    if (!shotMode) hintTimer = setTimeout(() => { hint = ''; paint(); }, 1800);
  }
  function pop(text, at, cls = '') {
    const el = document.createElement('div');
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    pops.append(el);
    if (!shotMode) setTimeout(() => el.remove(), 1100);
    return el;
  }
  const rankLabel = (c) => String((c % 13) + 1);

  function afterMove() {
    if (!demo) { save.round = state; writeSave(); }
    paint();
    const st = Logic.status(state);
    if (st !== 'play' && !ended) {
      ended = true;
      paint();
      setTimeout(() => finishRound(st), st === 'won' ? 900 : 700);
    }
  }

  function takeSlot(i, viaWild) {
    const next = viaWild ? Logic.useWild(state, i) : Logic.play(state, i);
    if (!next) return false;
    const pos = world.slotWorld(i);
    const card = state.cards[i];
    state = next;
    const go = () => {
      world.playCard(state, i, () => {
        Sfx.play('card', { pitch: 1 + Math.min(state.streak, 10) * 0.03 });
      });
      const gain = Logic.clearGain(state.streak);
      Sfx.play('chime', { pitch: 2 ** (Math.min(state.streak - 1, 12) / 12) });
      Kit3D.burst(world.scene, pos, HillScene.SUIT_COLORS[Math.floor(card / 13)], { count: state.streak >= 5 ? 18 : 10, speed: 3.6, size: 0.13, life: 0.7 });
      const at = world.screenOf(pos);
      pop(`+${gain}`, at, state.streak >= 5 ? 'big' : '');
      if (state.streak >= 3) {
        pop(L.streak(state.streak), { x: at.x, y: at.y - 30 }, 'chain-pop');
        Kit3D.shake(world.stage, Math.min(0.22, 0.04 + state.streak * 0.012));
      }
      if (state.streak > 0 && state.streak % 5 === 0) { Sfx.play('power'); world.squirrel.hop(); }
      world.squirrel.look(pos.x > 1 ? -0.1 : -0.7);
      afterMove();
    };
    if (viaWild) {
      armed = false;
      Sfx.play('jump');
      world.squirrel.throwTo(pos, () => { Sfx.play('knock'); Kit3D.burst(world.scene, pos, '#b8732f', { count: 12, speed: 3, size: 0.12 }); go(); });
      paint();
    } else go();
    return true;
  }
  function doDraw() {
    const next = Logic.draw(state);
    if (!next) { Sfx.play('error'); return false; }
    const hadStreak = state.streak;
    state = next;
    armed = false;
    Sfx.play('whoosh', { pitch: 1.4, vol: 0.6 });
    world.drawCard(state, () => Sfx.play('card', { pitch: 0.9 }));
    if (hadStreak >= 3) pop(L.streak(hadStreak), world.screenOf(world.pilePos()), 'chain-end');
    afterMove();
    return true;
  }

  function tapAt(x, y) {
    if (!state || ended || demo) return;
    startMusic();
    const hit = world.slotAt(x, y, state);
    if (hit.kind === 'stock') { doDraw(); return; }
    if (hit.kind !== 'slot') return;
    const i = hit.i;
    if (!Logic.isFree(state, i)) {
      world.nudge(i);
      Sfx.play('error', { vol: 0.6 });
      say(L.covered);
      return;
    }
    if (armed) { takeSlot(i, true); return; }
    if (!takeSlot(i, false)) {
      world.nudge(i);
      world.squirrel.shake();
      Sfx.play('error', { vol: 0.6 });
      say(Logic.playable(state).length ? L.mismatch(rankLabel(Logic.top(state))) : L.noMove);
    }
  }
  let downAt = null;
  world.stage.canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  world.stage.canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved < 24) tapAt(e.clientX, e.clientY);
  });
  flipBtn.addEventListener('click', () => { if (!state || ended || demo) return; startMusic(); doDraw(); });
  helpBtn.addEventListener('click', () => {
    if (!state || ended || demo || state.wild < 1) return;
    startMusic();
    armed = !armed;
    Sfx.play(armed ? 'select' : 'back');
    if (armed) world.squirrel.hop();
    paint();
  });

  // ---------- 판 끝 ----------
  function finishRound(st) {
    const before = save.acorns;
    const gained = Logic.acornsFrom(state);
    const starCount = Logic.stars(state);
    const prevStars = state.mode === 'map' && !demo ? (save.stars[state.key] || 0) : 0;
    lastStars = { prev: prevStars, removed: state.removed.filter(Boolean).length, total: state.removed.length };
    if (!demo) { save = Logic.finish(save, state); writeSave(); }
    if (st === 'won') {
      Sfx.play('win');
      world.squirrel.cheer();
      const p = world.pilePos();
      [0, 1, 2].forEach((k) => setTimeout(() => Kit3D.burst(world.scene, p.clone().add(new THREE.Vector3((k - 1) * 1.4, 0.6, -1.5)), ['#f0b43c', '#cf452c', '#e8742a'][k], { count: 20, speed: 5, size: 0.16, life: 1.1 }), k * 160));
      Kit3D.shake(world.stage, 0.25);
    } else {
      Sfx.play('lose');
      world.squirrel.shake();
    }
    showResult(st, gained, starCount, before);
    if (!demo && !shotMode && window.onestoreAd) window.onestoreAd.atBreak();
  }
  // 결과 화면에 붙이는 말(이 사본에 없는 언어 문구를 따로 둔다).
  const MORE = ko ? {
    toStar: (need, next) => `더미를 ${need}장 더 남기면 ★${next}`, starUp: (a) => `⭐ 이 언덕 별 기록 갱신! (전에는 ${a}개)`, cleared: (a, b) => `${b}장 중 ${a}장을 걷었어요. 거의 다 왔어요!`,
  } : (typeof LANG !== 'undefined' && LANG === 'ja') ? {
    toStar: (need, next) => `山札をあと${need}枚残せば★${next}`, starUp: (a) => `⭐ この丘の星の記録を更新!(前は${a}個)`, cleared: (a, b) => `${b}枚中${a}枚を片づけました。あと少し!`,
  } : {
    toStar: (need, next) => `Leave ${need} more stock card${need === 1 ? '' : 's'} for ★${next}`, starUp: (a) => `⭐ New star record on this hill! (was ${a})`, cleared: (a, b) => `You cleared ${a} of ${b} cards. So close!`,
  };
  let lastStars = { prev: 0, removed: 0, total: 0 };
  function goalLines(st, starCount, left) {
    let out = '';
    if (st === 'won' && state.mode === 'map' && !demo && lastStars.prev > 0 && starCount > lastStars.prev) out += `<p class="goal-line up">${MORE.starUp(lastStars.prev)}</p>`;
    const ns = st === 'won' ? Logic.nextStarNeed(left) : null;
    if (ns) out += `<p class="goal-line">${MORE.toStar(ns.need, ns.next)}</p>`;
    if (st === 'lost' && lastStars.removed > 0) out += `<p class="goal-line">${MORE.cleared(lastStars.removed, lastStars.total)}</p>`;
    return out;
  }
  function showResult(st, gained, starCount, before) {
    const left = Logic.stockLeft(state);
    const total = demo ? before + gained : save.acorns;
    const nxt = Logic.nextItem(total);
    const prevItem = Logic.STORE.filter((it) => it.at <= total).pop();
    const from = prevItem ? prevItem.at : 0;
    const pct = nxt ? Math.round(((total - from) / (nxt.at - from)) * 100) : 100;
    const isMap = state.mode === 'map';
    const canNext = isMap && st === 'won' && Number(state.key) < Logic.MAP_SIZE - 1;
    resultSheet.innerHTML = `
      <div class="card-sheet ${st}">
        <div class="ribbon">${st === 'won' ? L.won : L.lost}</div>
        ${st === 'won' ? `<div class="stars">${[0, 1, 2].map((i) => `<i class="${i < starCount ? 'on' : ''}" style="--d:${i * 0.15}s">★</i>`).join('')}</div>` : '<div class="sad"></div>'}
        <dl>
          <div><dt>${L.score}</dt><dd>${state.score}</dd></div>
          <div><dt>${ko ? '가장 긴 연속' : 'Best chain'}</dt><dd>${state.bestStreak}</dd></div>
          ${st === 'won' ? `<div><dt>${L.leftStock(left)}</dt><dd>+${Logic.winBonus(state)}</dd></div>` : ''}
        </dl>
        ${goalLines(st, starCount, left)}
        <div class="gain"><span class="nut"></span><b>${L.got(gained)}</b></div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <p class="next-item">${nxt ? L.nextItem(nxt.at - total, `${nxt.icon} ${ko ? nxt.ko : nxt.en}`) : L.allItems}</p>
        <div class="row">
          ${canNext ? `<button class="go primary" data-act="next">${L.next}</button>` : ''}
          <button class="go ${canNext ? '' : 'primary'}" data-act="retry">${L.retry}</button>
        </div>
        <div class="row small">
          <button class="go ghost" data-act="menu">${L.menu}</button>
          <button class="go ghost" data-rank-open>${L.rank}</button>
        </div>
      </div>`;
    resultSheet.hidden = false;
  }
  resultSheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || demo) return;
    Sfx.play('select');
    const act = b.dataset.act;
    if (act === 'next') begin(makeRound('map', Number(state.key) + 1));
    else if (act === 'retry') begin(Logic.freshRound(dealOf(state), { mode: state.mode, key: state.key, seed: state.seed }));
    else if (act === 'menu') openPanel();
  });

  // ---------- 메뉴(오늘의 언덕, 지도, 창고) ----------
  function openPanel(fakeToday) {
    const tk = fakeToday || todayKey();
    const today = save.daily[tk];
    const total = save.acorns;
    const nxt = Logic.nextItem(total);
    const open = Logic.unlocked(total);
    const nodes = Array.from({ length: Logic.MAP_SIZE }, (_, k) => {
      const lockedNode = k > save.hill;
      const st = save.stars[k] || 0;
      const row = Math.floor(k / 6);
      const col = row % 2 ? 5 - (k % 6) : k % 6; // 굽이진 길
      return `<button class="node ${lockedNode ? 'locked' : ''} ${k === Math.min(save.hill, Logic.MAP_SIZE - 1) ? 'here' : ''}" style="grid-row:${row + 1};grid-column:${col + 1}" data-hill="${k}" ${lockedNode ? 'disabled' : ''}>
        <b>${k + 1}</b><span>${[0, 1, 2].map((i) => (i < st ? '★' : '·')).join('')}</span></button>`;
    }).join('');
    panel.innerHTML = `
      <div class="paper">
        <button class="round x" data-act="close" aria-label="${L.close}">✕</button>
        <div class="today">
          <div><small>${L.today}</small><b>${L.dateFmt(new Date())}</b><span>${today ? L.todayDone(today.score) + (today.won ? ' ✓' : '') : L.todayNew}</span></div>
          <button class="go primary" data-act="today">${L.todayBtn}</button>
        </div>
        <h2>${L.storeTitle}</h2>
        <div class="store-head"><span class="nut"></span><b>${L.acorns(total)}</b><small>${nxt ? L.nextItem(nxt.at - total, ko ? nxt.ko : nxt.en) : L.allItems}</small></div>
        <div class="shelf">${Logic.STORE.map((it, i) => `<div class="item ${i < open ? 'got' : ''}"><span>${i < open ? it.icon : '?'}</span><small>${i < open ? (ko ? it.ko : it.en) : (ko ? `${it.at}개` : `${it.at}`)}</small></div>`).join('')}</div>
        <h2>${L.mapTitle}</h2>
        ${save.hill >= Logic.MAP_SIZE ? `<p class="note">${L.mapDone}</p>` : ''}
        <div class="map">${nodes}</div>
        <div class="row small"><span class="stat">${L.best(save.best)} · ${L.wins(save.wins)}</span><button class="go ghost" data-rank-open>${L.rank}</button></div>
        <details class="how"><summary>${L.how}</summary><ul>${L.howLines.map((l) => `<li>${l}</li>`).join('')}</ul></details>
      </div>`;
    panel.hidden = false;
    Sfx.play('rustle');
  }
  const closePanel = () => { panel.hidden = true; Sfx.play('back'); };
  $('.menu-btn').addEventListener('click', () => { if (demo) return; startMusic(); openPanel(); });
  panel.addEventListener('click', (e) => {
    if (e.target === panel) { closePanel(); return; }
    const b = e.target.closest('[data-act],[data-hill]');
    if (!b || demo) return;
    if (b.dataset.act === 'close') { closePanel(); return; }
    Sfx.play('select');
    panel.hidden = true;
    if (b.dataset.act === 'today') begin(makeRound('day', todayKey()));
    else if (b.dataset.hill) begin(makeRound('map', Number(b.dataset.hill)));
  });

  // ---------- 시연(녹화용) ----------
  let demoPlan = null;
  function demoRound(k) {
    const h = Logic.mapHill([1, 6, 4][k % 3]);
    const { deal, seed } = Logic.solvableDeal(h.seed, h.layout);
    const r = Logic.freshRound(deal, { mode: 'map', key: h.n, seed });
    begin(r);
    demoPlan = { path: Logic.solve(deal) || [], step: 0, wait: 1.6, round: k };
  }
  world.stage.onFrame((dt) => {
    if (!demo || !demoPlan || shotMode) return;
    demoPlan.wait -= dt;
    if (demoPlan.wait > 0) return;
    if (ended || demoPlan.step >= demoPlan.path.length) {
      if (ended && !resultSheet.hidden) { demoPlan.wait = 1e9; setTimeout(() => demo && demoRound(demoPlan.round + 1), 2600); }
      return;
    }
    const [kind, i] = demoPlan.path[demoPlan.step++];
    if (kind === 'p') {
      // 가끔은 도토리 도움을 쓰는 모습도 보여 준다(풀이 수순과 같은 패라 결과는 같다).
      if (demoPlan.step === 7 && state.wild > 0) { armed = true; paint(); takeSlot(i, true); demoPlan.wait = 0.9; return; }
      takeSlot(i, false);
      demoPlan.wait = state.streak >= 4 ? 0.36 : 0.5;
    } else {
      doDraw();
      demoPlan.wait = 0.62;
    }
  });
  window.appDemo = () => {
    demo = true;
    panel.hidden = true;
    resultSheet.hidden = true;
    musicOn = false;
    startMusic();
    demoRound(0);
  };

  window.appFlush = () => { if (state && !ended && !demo) save.round = state; writeSave(); };
  window.appBack = () => {
    if (!panel.hidden) { closePanel(); return true; }
    if (armed) { armed = false; paint(); return true; }
    if (!resultSheet.hidden) { openPanel(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.appFlush(); });

  // ---------- 대표 화면 ----------
  function replay(round, moves) {
    let s = round;
    const path = Logic.solve(dealOf(round)) || [];
    for (const [kind, i] of path.slice(0, moves)) s = kind === 'p' ? Logic.play(s, i) : Logic.draw(s);
    return s;
  }
  function shot(n) {
    save = Logic.sanitize({ hill: 12, acorns: 640, best: 1480, wins: 14, played: 19, stars: [3, 3, 2, 3, 1, 2, 3, 3, 2, 1, 2, 3], daily: { '2026-11-20': { score: 1210, won: true } } });
    if (n === 1) {
      // 여러 언덕 가운데 연속이 가장 길게 이어지면서 다음 수가 있는 장면을 고른다.
      let base = null;
      let bestK = 0;
      let bestStreak = -1;
      for (const hillN of [6, 1, 8, 9, 3]) {
        const cand = makeRound('map', hillN);
        const path = Logic.solve(dealOf(cand)) || [];
        let s = cand;
        for (let k = 0; k < path.length - 4; k += 1) {
          const [kind, i] = path[k];
          s = kind === 'p' ? Logic.play(s, i) : Logic.draw(s);
          if (k > 6 && s.streak > bestStreak && Logic.playable(s).length > 0 && s.removed.filter(Boolean).length < s.cards.length * 0.6) { bestStreak = s.streak; bestK = k + 1; base = cand; }
        }
      }
      if (!base) base = makeRound('map', 6);
      begin(replay(base, bestK), true);
      const placePops = () => {
        pops.innerHTML = '';
        const at = world.screenOf(world.pilePos());
        pop(`+${Logic.clearGain(state.streak)}`, { x: at.x, y: at.y - 78 }, 'big');
        pop(L.streak(state.streak), { x: at.x, y: at.y - 112 }, 'chain-pop');
      };
      placePops();
      addEventListener('resize', () => setTimeout(placePops, 0));
      setTimeout(placePops, 600);
    } else if (n === 2) {
      save.played = 0;
      begin(replay(makeRound('map', 4), 2), true);
      armed = false;
    } else if (n === 3) {
      const base = makeRound('map', 3);
      const done = replay(base, 999);
      begin(done, true);
      ended = true;
      showResult('won', Logic.acornsFrom(done), Logic.stars(done), save.acorns);
      paint();
    } else {
      begin(replay(makeRound('day', '2026-11-20'), 5), true);
      openPanel('2026-11-20');
    }
    world.snapCamera();
    world.stage.render();
  }

  // ---------- 시작 ----------
  if (shotMode) shot(shotN);
  else if (save.round) begin(save.round, false);
  else begin(makeRound(save.hill >= Logic.MAP_SIZE ? 'day' : 'map', save.hill >= Logic.MAP_SIZE ? todayKey() : save.hill), false);
})();
