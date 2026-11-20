// 층층 베이커리 화면. 약속 여섯 가지:
// 1) localStorage는 try/catch 2) window.appFlush는 가려질 때 저장 3) window.appBack은 열린 창을 닫고 true
// 4) #shot=번호면 대표 화면 5) window.appDemo()는 저장을 건드리지 않고 스스로 쌓는다 6) 소리는 Sfx, 소리 끄기 단추
(function () {
  const SAVE_KEY = 'tiertop-save-v1';
  const RUN_KEY = 'tiertop-run-v1';
  const ko = /^ko/i.test(navigator.language || 'ko');
  const T = ko ? {
    title: '층층 베이커리', order: (n) => `${n}의 주문`, layers: (n) => `${n}층`, start: '굽기 시작', resume: '이어서 쌓기', again: '다시 굽기',
    book: '맛 도감', close: '닫기', best: '최고', stamps: '단골 도장', today: '오늘 최고', tapHint: '화면을 톡 — 층이 떨어져요',
    perfect: '딱 맞음!', grew: '층이 넓어졌어요', delivered: '주문 완성!', keepGoing: '더 쌓아 기록에 도전',
    fallen: '케이크가 기울었어요', served: '케이크를 건넸어요', newBest: '새 기록', unlocked: (n) => `새 맛: ${n}`,
    lockedNeed: (n) => `${n}층 더 쌓으면`, total: (n) => `지금까지 ${n}층`, flavorsOf: '이번 주문의 맛', target: '목표',
    sound: '소리', menu: '처음으로', next: (n, f) => `다음 맛 ${f}까지 ${n}층`, done: '오늘 주문 완료',
  } : {
    title: 'Tiertop Bakery', order: (n) => `${n}'s order`, layers: (n) => `${n} tiers`, start: 'Start baking', resume: 'Keep stacking', again: 'Bake again',
    book: 'Flavor book', close: 'Close', best: 'Best', stamps: 'Stamps', today: "Today's best", tapHint: 'Tap anywhere to drop the tier',
    perfect: 'Perfect!', grew: 'Tier grew back', delivered: 'Order complete!', keepGoing: 'Keep stacking for a record',
    fallen: 'The cake tipped over', served: 'Cake delivered', newBest: 'New best', unlocked: (n) => `New flavor: ${n}`,
    lockedNeed: (n) => `${n} more tiers`, total: (n) => `${n} tiers so far`, flavorsOf: 'Flavors in this order', target: 'Goal',
    sound: 'Sound', menu: 'Menu', next: (n, f) => `${n} tiers to ${f}`, done: "Today's order done",
  };
  const fname = (f) => (ko ? f.ko : f.en);
  const cname = (c) => (ko ? c.ko : c.en);

  // ---------- 저장 ----------
  let save = Logic.newSave();
  try { save = Logic.parseSave(localStorage.getItem(SAVE_KEY)); } catch { /* 저장이 막혀도 돈다 */ }
  const today = Logic.dayKey();
  const order = Logic.dailyOrder(today);
  let run = null;
  try { run = Logic.sanitizeRun(JSON.parse(localStorage.getItem(RUN_KEY)), order); } catch { run = null; }
  let demo = false;
  const writeSave = () => {
    if (demo) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      if (run && !run.over) localStorage.setItem(RUN_KEY, JSON.stringify(run));
      else localStorage.removeItem(RUN_KEY);
    } catch { /* 무시 */ }
  };

  // ---------- 무대 ----------
  const app = document.getElementById('app');
  const world = BakeryScene.build(app);
  const { stage, camera } = world;
  world.buildGuest(order.customer);

  // ---------- 화면 ----------
  const icon = {
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="wave" d="M16 9l5 6M21 9l-5 6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path class="wave" d="M12 6v13.5"/></svg>',
  };
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="ticket" id="ticket"><span class="who"></span><span class="bar"><i></i></span><span class="goal"></span></div>
    <div class="count"><b id="count">0</b><small id="streak"></small></div>
    <div class="tools"><button class="round" id="bookBtn" aria-label="${T.book}">${icon.book}</button><button class="round" id="muteBtn" aria-label="${T.sound}"></button></div>`;
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = T.tapHint;
  const pops = document.createElement('div');
  pops.className = 'pops';
  const sheet = document.createElement('section');
  sheet.className = 'sheet';
  const book = document.createElement('section');
  book.className = 'book';
  app.append(hud, hint, pops, sheet, book);
  const $ = (sel) => app.querySelector(sel);
  const muteBtn = $('#muteBtn');
  const paintMute = () => { muteBtn.innerHTML = Sfx.muted ? icon.mute : icon.sound; muteBtn.classList.toggle('off', Sfx.muted); };
  paintMute();
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Sfx.setMuted(!Sfx.muted);
    paintMute();
    Sfx.play('tap');
  });
  $('#bookBtn').addEventListener('click', (e) => { e.stopPropagation(); openBook(); });

  // ---------- 앱만의 소리 ----------
  Sfx.define('plop', (c, out, t, o) => {
    Sfx.tone(c, out, t, { type: 'sine', freq: 210 * (o.pitch || 1), to: 90, dur: 0.16, vol: 0.45 });
    Sfx.noise(c, out, t, { freq: 700, to: 180, dur: 0.1, vol: 0.18 });
  });
  Sfx.define('perfect', (c, out, t, o) => {
    const p = o.pitch || 1;
    Sfx.tone(c, out, t, { type: 'sine', freq: 180, to: 80, dur: 0.12, vol: 0.35 });
    [0, 7, 12].forEach((s, i) => Sfx.tone(c, out, t + 0.03 + i * 0.05, { type: 'triangle', freq: Sfx.note(12 + s) * p, dur: 0.22, vol: 0.16 }));
    Sfx.tone(c, out, t + 0.16, { type: 'sine', freq: Sfx.note(36) * p, dur: 0.35, vol: 0.06 });
  });
  Sfx.define('slice', (c, out, t) => Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 3200, to: 900, q: 2, dur: 0.18, vol: 0.28 }));
  Sfx.define('bell', (c, out, t) => [0, 4, 7, 12, 16].forEach((s, i) => {
    Sfx.tone(c, out, t + i * 0.08, { type: 'sine', freq: Sfx.note(24 + s), dur: 0.7, vol: 0.14 });
    Sfx.tone(c, out, t + i * 0.08, { type: 'triangle', freq: Sfx.note(36 + s), dur: 0.25, vol: 0.04 });
  }));
  const MUSIC = { bpm: 96, mood: 'calm', seed: 27, key: 5 };
  const DEMO_MUSIC = { bpm: 112, mood: 'upbeat', seed: 27, key: 5 };

  // ---------- 상태 ----------
  let mode = 'title'; // title | play | end
  let swingT = 0;
  let falling = null; // { from, to, x, z, t }
  let enter = 0; // 새 층이 위에서 내려오는 정도
  let lastEvent = null;
  let endInfo = null;
  let camY = 0;
  let camZoom = 0;
  let demoRun = null;
  let demoNext = 0;
  let demoRestart = 0;
  let demoRand = Logic.rng(91);
  let shotMode = false;

  const cur = () => (demo ? demoRun : run);
  const level = () => Logic.height(cur());

  function paintHud() {
    const r = cur();
    const c = Logic.customer(order.customer);
    const h = r ? Logic.height(r) : 0;
    $('#count').textContent = String(h);
    $('#ticket .who').textContent = T.order(cname(c));
    $('#ticket .goal').textContent = `${Math.min(h, order.target)} / ${order.target}`;
    $('#ticket .bar i').style.width = `${Math.min(100, (h / order.target) * 100)}%`;
    $('#ticket').classList.toggle('done', Boolean(r && r.delivered));
    const s = r ? r.streak : 0;
    $('#streak').innerHTML = s ? Array.from({ length: Math.min(s, 9) }, () => '<i></i>').join('') : '';
    hud.classList.toggle('show', mode === 'play');
  }

  function pop(text, kind = '', y = 38) {
    const el = document.createElement('div');
    el.className = `pop ${kind}`;
    el.textContent = text;
    el.style.top = `${y}%`;
    pops.append(el);
    if (!shotMode) setTimeout(() => el.remove(), 1300);
  }

  function burst(pos, colors, count = 14) {
    colors.forEach((c) => Kit3D.burst(world.scene, pos, c, { count: Math.round(count / colors.length), speed: 4.5, size: 0.14, life: 0.9 }));
  }

  // ---------- 판 ----------
  function startRun() {
    if (!run || run.over) run = Logic.newRun(order);
    mode = 'play';
    swingT = 0;
    enter = 1;
    falling = null;
    world.topper.visible = false;
    sheet.classList.remove('open');
    hint.classList.add('show');
    Sfx.music(MUSIC);
    Sfx.play('select');
    writeSave();
    syncCake();
    paintHud();
  }

  function syncCake(squash = 0) {
    const r = cur();
    world.setLayers(r ? r.layers : [{ x: 0, z: 0, r: Logic.BASE_R, flavor: order.flavors[0] }], squash);
  }

  function tryDrop() {
    const r = cur();
    if (mode !== 'play' || !r || r.over || falling || enter > 0.35) return;
    const top = Logic.top(r);
    const off = Logic.dropperOffset(swingT, level(), r.seed);
    const y = world.hover.position.y;
    falling = { from: y, to: world.layerY(r.layers.length), x: top.x + off.x, z: top.z + off.z, t: 0 };
    hint.classList.remove('show');
    Sfx.play('whoosh', { pitch: 1.6, vol: 0.5 });
  }

  function land() {
    const before = cur();
    const { run: next, event } = Logic.drop(before, { x: falling.x, z: falling.z });
    falling = null;
    lastEvent = event;
    if (demo) demoRun = next; else run = next;
    const top = Logic.top(next);
    const topPos = new THREE.Vector3(top.x, world.layerY(next.layers.length - 1) + Logic.LAYER_H / 2, top.z);
    const f = Logic.flavor(top.flavor);
    if (event.type === 'perfect') {
      Sfx.play('perfect', { pitch: 1 + Math.min(event.streak - 1, 8) * 0.06 });
      burst(topPos, ['#ffb000', '#ffffff', f.color], 18);
      Kit3D.shake(stage, 0.08);
      pop(event.streak > 1 ? `${T.perfect} ×${event.streak}` : T.perfect, 'gold');
      if (event.grew) setTimeout(() => pop(T.grew, 'soft', 47), 260);
      world.nod();
      squashT = 1;
    } else if (event.type === 'trim') {
      Sfx.play('plop', { pitch: 1 + Math.min(level(), 30) * 0.01 });
      Sfx.play('slice');
      const cut = event.cut;
      const pos = new THREE.Vector3(top.x + cut.dx * (top.r + event.d / 4), topPos.y - Logic.LAYER_H / 2, top.z + cut.dz * (top.r + event.d / 4));
      world.scrap(pos, Math.max(0.12, event.d / 2), top.flavor, { x: cut.dx, z: cut.dz });
      burst(pos, [f.color, f.cream], 10);
      Kit3D.shake(stage, 0.12);
      squashT = 1;
    } else if (event.type === 'miss') {
      const prevTop = Logic.top(before);
      const pos = new THREE.Vector3(event.at.x, world.layerY(before.layers.length) , event.at.z);
      const d = Math.hypot(event.at.x - prevTop.x, event.at.z - prevTop.z) || 1;
      world.scrap(pos, event.r, event.flavor, { x: (event.at.x - prevTop.x) / d, z: (event.at.z - prevTop.z) / d });
      Sfx.play('hit');
      setTimeout(() => Sfx.play('lose'), 250);
      Kit3D.shake(stage, 0.5);
      if (demo) demoRestart = 1.8;
      else setTimeout(endRun, 900);
    }
    if (event.delivered) {
      Sfx.play('bell');
      setTimeout(() => Sfx.play('win'), 300);
      world.hop();
      burst(topPos, ['#ff8fab', '#ffd166', '#86dcc6', '#b89ad6', '#ffffff'], 40);
      pop(T.delivered, 'big', 30);
      setTimeout(() => pop(T.keepGoing, 'soft', 41), 500);
    }
    if (event.type !== 'miss') enter = 1;
    syncCake();
    paintHud();
    writeSave();
  }
  let squashT = 0;

  function endRun() {
    if (demo || !run) return;
    const finished = run;
    const result = Logic.recordRun(save, finished, today);
    save = result.save;
    endInfo = { run: finished, ...result };
    run = null;
    writeSave();
    mode = 'end';
    showEnd();
    if (finished.delivered) placeTopper(finished);
  }

  function placeTopper(r) {
    const top = Logic.top(r);
    world.topper.visible = true;
    world.topper.position.set(top.x, world.layerY(r.layers.length - 1) + Logic.LAYER_H / 2, top.z);
    world.topper.scale.setScalar(Math.max(0.5, Math.min(1.2, top.r)));
  }

  // ---------- 안내 카드 ----------
  function swatches(ids) {
    return ids.map((id) => {
      const f = Logic.flavor(id);
      return `<span class="sw" style="--c:${f.color};--k:${f.cream}"><i></i>${fname(f)}</span>`;
    }).join('');
  }
  function nextLine() {
    const nx = Logic.nextUnlock(save.totalLayers);
    return nx ? T.next(nx.need - save.totalLayers, fname(nx)) : T.total(save.totalLayers);
  }

  function showTitle() {
    mode = 'title';
    const c = Logic.customer(order.customer);
    const daily = save.daily.key === today ? save.daily : { best: 0, done: false };
    sheet.innerHTML = `
      <div class="logo"><span>${ko ? '층층' : 'Tiertop'}</span><em>${ko ? '베이커리' : 'Bakery'}</em></div>
      <div class="receipt">
        <p class="date">${today}</p>
        <h2>${T.order(cname(c))}</h2>
        <p class="tall"><b>${order.target}</b>${ko ? '층 케이크' : '-tier cake'}${daily.done ? `<span class="stamp">${T.done}</span>` : ''}</p>
        <p class="lab">${T.flavorsOf}</p>
        <div class="sws">${swatches(order.flavors)}</div>
        <dl><div><dt>${T.today}</dt><dd>${daily.best}</dd></div><div><dt>${T.best}</dt><dd>${save.best}</dd></div><div><dt>${T.stamps}</dt><dd>${save.stamps}</dd></div></dl>
        <p class="next">${nextLine()}</p>
      </div>
      <button class="go" id="goBtn">${run ? T.resume : T.start}</button>
      <button class="ghost" id="titleBook">${T.book}</button>
      <button class="ghost" data-rank-open>${/^en/i.test(navigator.language || '') ? '🏆 Leaderboard' : '🏆 전국 랭킹'}</button>`;
    sheet.classList.add('open');
    $('#goBtn').addEventListener('click', (e) => { e.stopPropagation(); startRun(); });
    $('#titleBook').addEventListener('click', (e) => { e.stopPropagation(); openBook(); });
    paintHud();
  }

  function showEnd() {
    const info = endInfo;
    if (window.onestoreAd) window.onestoreAd.atBreak();
    const h = Logic.height(info.run);
    if (window.Rank && !/shot=/.test(location.hash)) Rank.submit(h);
    const st = Logic.stars(info.run);
    sheet.innerHTML = `
      <div class="receipt end">
        <p class="date">${info.run.delivered ? T.served : T.fallen}</p>
        <p class="tall"><b>${h}</b>${ko ? '층' : ' tiers'}${info.newBest ? `<span class="stamp">${T.newBest}</span>` : ''}</p>
        <div class="stars">${[1, 2, 3].map((n) => `<i class="${n <= st ? 'on' : ''}"></i>`).join('')}</div>
        <dl><div><dt>${T.perfect}</dt><dd>${info.run.perfects}</dd></div><div><dt>${T.best}</dt><dd>${info.save.best}</dd></div><div><dt>${T.stamps}</dt><dd>${info.save.stamps}</dd></div></dl>
        ${info.unlocked.map((f) => `<p class="unlock"><span class="sw" style="--c:${f.color};--k:${f.cream}"><i></i></span>${T.unlocked(fname(f))}</p>`).join('')}
        <p class="next">${nextLine()}</p>
      </div>
      <button class="go" id="againBtn">${T.again}</button>
      <button class="ghost" data-rank-open>${/^en/i.test(navigator.language || '') ? '🏆 Leaderboard' : '🏆 전국 랭킹'}</button>
      <div class="row"><button class="ghost" id="endBook">${T.book}</button><button class="ghost" id="endMenu">${T.menu}</button></div>`;
    sheet.classList.add('open');
    if (info.unlocked.length) setTimeout(() => Sfx.play('power'), 400);
    if (info.run.delivered) Sfx.play('coin');
    $('#againBtn').addEventListener('click', (e) => { e.stopPropagation(); run = null; startRun(); });
    $('#endBook').addEventListener('click', (e) => { e.stopPropagation(); openBook(); });
    $('#endMenu').addEventListener('click', (e) => { e.stopPropagation(); Sfx.play('back'); world.topper.visible = false; syncCake(); showTitle(); });
    paintHud();
  }

  function openBook() {
    Sfx.play('select');
    const open = new Set(Logic.unlockedFlavors(save.totalLayers).map((f) => f.id));
    book.innerHTML = `
      <div class="paper">
        <header><h2>${T.book}</h2><span>${open.size} / ${Logic.FLAVORS.length}</span></header>
        <p class="next">${T.total(save.totalLayers)}</p>
        <ul>${Logic.FLAVORS.map((f) => (open.has(f.id)
          ? `<li class="on" style="--c:${f.color};--k:${f.cream}"><span class="mini"><i></i><i></i></span><b>${fname(f)}</b></li>`
          : `<li><span class="mini"><i></i><i></i></span><b>?</b><small>${T.lockedNeed(f.need - save.totalLayers)}</small></li>`)).join('')}</ul>
        <button class="go" id="bookClose">${T.close}</button>
      </div>`;
    book.classList.add('open');
    $('#bookClose').addEventListener('click', (e) => { e.stopPropagation(); closeBook(); });
  }
  function closeBook() {
    if (!book.classList.contains('open')) return false;
    book.classList.remove('open');
    Sfx.play('back');
    return true;
  }

  // ---------- 입력 ----------
  stage.canvas.addEventListener('pointerdown', () => { if (!demo) tryDrop(); });
  hint.addEventListener('pointerdown', () => { if (!demo) tryDrop(); });

  // ---------- 매 프레임 ----------
  stage.onFrame((dt, time) => {
    const r = cur();
    world.update(dt, time);
    if (demo && !shotMode) demoTick(dt);
    if (r && !r.over && (mode === 'play' || demo)) {
      if (!falling) swingT += dt;
      enter = Math.max(0, enter - dt * 3.2);
      squashT = Math.max(0, squashT - dt * 5);
      const top = Logic.top(r);
      const off = Logic.dropperOffset(swingT, Logic.height(r), r.seed);
      const nextFlavor = Logic.flavorAt(r, r.layers.length);
      world.paintLayer(world.hover, nextFlavor);
      world.hover.visible = true;
      world.hover.scale.set(top.r, 1, top.r);
      const hoverY = world.layerY(r.layers.length) + 1.5 + Kit3D.ease.outCubic(enter) * 2;
      if (falling) {
        falling.t += dt;
        const k = Math.min(1, (falling.t / 0.2) ** 2);
        world.hover.position.set(falling.x, falling.from + (falling.to - falling.from) * k, falling.z);
        if (k >= 1) land();
      } else {
        world.hover.position.set(top.x + off.x, hoverY, top.z + off.z);
        world.hover.rotation.y = Math.sin(time * 1.3) * 0.2;
      }
      world.bag.visible = true;
      world.bag.position.set(world.hover.position.x, (falling ? falling.from : hoverY) + Logic.LAYER_H / 2 + 0.55, world.hover.position.z);
      world.bag.rotation.z = -off.x * 0.12;
      world.bag.rotation.x = off.z * 0.12;
      // 겨냥 고리
      const ringY = world.layerY(r.layers.length - 1) + Logic.LAYER_H / 2 + 0.11;
      const px = falling ? falling.x : top.x + off.x;
      const pz = falling ? falling.z : top.z + off.z;
      world.ring.visible = true;
      world.ring.position.set(px, ringY, pz);
      world.ring.scale.set(top.r, top.r, 1);
      const close = Math.hypot(px - top.x, pz - top.z) <= Logic.PERFECT;
      world.ringMat.color.set(close ? '#ff8c00' : '#ffffff');
      world.ringMat.opacity = close ? 1 : 0.75;
      world.centerDot.visible = true;
      world.centerDot.position.set(top.x, ringY - 0.005, top.z);
      if (squashT > 0) syncCake(Math.sin(squashT * Math.PI) * 0.35);
    } else {
      world.hover.visible = false;
      world.bag.visible = false;
      world.ring.visible = false;
      world.centerDot.visible = false;
    }
    // 카메라: 노는 동안은 위층을 따라가고, 끝나면 케이크 전체가 보이게 물러난다.
    const rr = cur();
    const h = rr ? rr.layers.length : endInfo ? endInfo.run.layers.length : 1;
    const topY = world.layerY(h - 1);
    const showAll = mode === 'end' || mode === 'title';
    const wantY = showAll ? world.PLATE_TOP + h * Logic.LAYER_H * 0.55 : topY;
    const wantZoom = showAll ? Math.max(0, h * Logic.LAYER_H - 1.5) * 1.8 : 0;
    camY = shotMode ? wantY : Kit3D.damp(camY, wantY, 3, dt);
    camZoom = shotMode ? wantZoom : Kit3D.damp(camZoom, wantZoom, 2.5, dt);
    // 처음과 끝 화면은 아래쪽 절반을 영수증이 가리므로 케이크가 화면 위쪽에 오도록 낮은 곳을 바라본다.
    const sway = showAll ? Math.sin(time * 0.25) * 1.2 : 0;
    if (showAll) {
      const dist = 12.5 + camZoom;
      camera.position.set(sway + 1.4, camY + dist * 0.2, dist);
      camera.lookAt(1.0, camY - dist * 0.22, 0);
    } else {
      camera.position.set(0.5, camY + 5.2, 10.8);
      camera.lookAt(0, camY + 1.1, 0);
    }
    stage.followSun(new THREE.Vector3(0, topY, 0));
  });

  // ---------- 시연 ----------
  function demoTick(dt) {
    if (demoRestart > 0) {
      demoRestart -= dt;
      if (demoRestart <= 0) {
        demoRun = Logic.newRun(order);
        swingT = 0;
        enter = 1;
        syncCake();
        paintHud();
      }
      return;
    }
    if (!demoRun || demoRun.over || falling || enter > 0.3) return;
    if (demoNext <= 0) {
      const center = Logic.nextCenterTime(swingT + 0.2, Logic.height(demoRun), demoRun.seed);
      const miss = Logic.height(demoRun) > 28 && demoRand() < 0.25 ? 0.35 : 0; // 시연 끝무렵엔 일부러 놓쳐 재시작 장면도 보인다.
      demoNext = center + (demoRand() + demoRand() - 1) * 0.13 + miss;
    }
    if (swingT >= demoNext) {
      demoNext = 0;
      tryDropDemo();
    }
  }
  function tryDropDemo() {
    const r = demoRun;
    const top = Logic.top(r);
    const off = Logic.dropperOffset(swingT, Logic.height(r), r.seed);
    falling = { from: world.hover.position.y, to: world.layerY(r.layers.length), x: top.x + off.x, z: top.z + off.z, t: 0 };
    Sfx.play('whoosh', { pitch: 1.6, vol: 0.5 });
  }

  window.appDemo = () => {
    demo = true;
    demoRand = Logic.rng(91);
    demoRun = Logic.newRun(order);
    demoNext = 0;
    demoRestart = 0;
    swingT = 0;
    enter = 1;
    falling = null;
    mode = 'play';
    sheet.classList.remove('open');
    book.classList.remove('open');
    hint.classList.remove('show');
    world.topper.visible = false;
    Sfx.music(DEMO_MUSIC);
    syncCake();
    paintHud();
  };

  window.appFlush = writeSave;
  window.appBack = () => {
    if (closeBook()) return true;
    if (mode === 'play' && !demo) { writeSave(); Sfx.play('back'); syncCake(); showTitle(); return true; }
    if (mode === 'end') { world.topper.visible = false; syncCake(); showTitle(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });

  // ---------- 스토어 스크린샷 ----------
  function shotRun(height, jitter, seed) {
    const sim = Logic.simulate({ order, jitter, seed, maxLayers: height });
    return { ...sim, over: false };
  }
  const shot = Number((location.hash.match(/shot=(\d+)/) || [])[1]);
  if (shot) {
    shotMode = true;
    document.body.classList.add('shot');
    demo = true; // 저장을 건드리지 않는다
    if (shot === 1) {
      demoRun = shotRun(9, 0.05, 3);
      mode = 'play';
      swingT = 0.55;
      hint.classList.add('show');
    } else if (shot === 2) {
      demoRun = shotRun(15, 0.035, 5);
      demoRun.streak = 3;
      mode = 'play';
      swingT = 0.2;
      pop(`${T.perfect} ×3`, 'gold');
      setTimeout(() => burst(new THREE.Vector3(Logic.top(demoRun).x, world.layerY(demoRun.layers.length - 1) + 0.3, Logic.top(demoRun).z), ['#ffe27a', '#ffffff', '#ff8fab'], 30), 2000);
    } else if (shot === 3) {
      const r = shotRun(order.target + 4, 0.03, 8);
      r.over = true;
      r.delivered = true;
      save = { ...save, totalLayers: Math.max(save.totalLayers, 34) };
      endInfo = { run: r, save: { ...save, best: Math.max(save.best, Logic.height(r)), stamps: save.stamps + 1 }, newBest: true, unlocked: [Logic.FLAVORS[3]], stamped: true };
      demoRun = null;
      mode = 'end';
      world.setLayers(r.layers);
      placeTopper(r);
      showEnd();
      world.hop();
    } else {
      save = { ...save, totalLayers: Math.max(save.totalLayers, 132) };
      mode = 'title';
      demoRun = null;
      showTitle();
      openBook();
    }
    if (demoRun) syncCake();
    paintHud();
  } else if (run) {
    syncCake();
    showTitle();
  } else {
    syncCake();
    showTitle();
  }
})();
