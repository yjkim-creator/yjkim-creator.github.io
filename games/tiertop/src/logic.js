// 층층 베이커리 규칙. DOM 없이 쓰고, 브라우저와 node 테스트가 같은 코드를 읽는다.
// 좌표: 접시 가운데가 (0, 0). 층은 반지름 r인 원기둥이고, 위에서 흔들리는 새 층을 떨어뜨려 쌓는다.
// 겹친 부분만 남는다: 같은 반지름 r인 두 원이 d만큼 어긋나면 그 안에 들어가는 가장 큰 원은 반지름 r - d/2, 중심은 두 중심의 가운데다.
(function (root) {
  const BASE_R = 1.6; // 첫 층 반지름
  const LAYER_H = 0.42; // 층 두께
  const PERFECT = 0.11; // 이만큼 가까우면 딱 맞음(가운데로 붙는다)
  const MIN_R = 0.22; // 이보다 작아지면 층이 남지 않는다
  const GROW_EVERY = 3; // 딱 맞음이 이만큼 이어지면 층이 조금 넓어진다
  const GROW = 0.12;

  const FLAVORS = [
    { id: 'vanilla', ko: '바닐라', en: 'Vanilla', color: '#f2c95a', cream: '#fbe3a0', need: 0 },
    { id: 'strawberry', ko: '딸기', en: 'Strawberry', color: '#f0587e', cream: '#ffb3c6', need: 0 },
    { id: 'choco', ko: '초코', en: 'Chocolate', color: '#5a2e1a', cream: '#b07a5a', need: 0 },
    { id: 'matcha', ko: '말차', en: 'Matcha', color: '#6fa846', cream: '#c4e0a6', need: 25 },
    { id: 'mango', ko: '망고', en: 'Mango', color: '#ffa21a', cream: '#ffd98a', need: 60 },
    { id: 'blueberry', ko: '블루베리', en: 'Blueberry', color: '#4f5bd1', cream: '#b6bcf2', need: 100 },
    { id: 'taro', ko: '토란', en: 'Taro', color: '#9466c9', cream: '#d4bdf0', need: 150 },
    { id: 'lemon', ko: '레몬', en: 'Lemon', color: '#f5d82a', cream: '#fff19a', need: 210 },
    { id: 'redvelvet', ko: '레드벨벳', en: 'Red Velvet', color: '#b0242a', cream: '#f3c9c2', need: 280 },
    { id: 'mint', ko: '민트', en: 'Mint', color: '#3fc4a2', cream: '#aeeedd', need: 360 },
    { id: 'blacksesame', ko: '흑임자', en: 'Black Sesame', color: '#3a3740', cream: '#a8a5ae', need: 450 },
    { id: 'pumpkin', ko: '단호박', en: 'Pumpkin', color: '#e8731f', cream: '#ffc690', need: 550 },
  ];

  const CUSTOMERS = [
    { id: 'bear', ko: '곰 아저씨', en: 'Mr. Bear', fur: '#a8754f' },
    { id: 'bunny', ko: '토끼 할머니', en: 'Granny Bunny', fur: '#f4ede6' },
    { id: 'fox', ko: '여우 학생', en: 'Fox Kid', fur: '#ef8a45' },
    { id: 'cat', ko: '고양이 화가', en: 'Painter Cat', fur: '#8e8a94' },
    { id: 'panda', ko: '판다 우체부', en: 'Panda Mail', fur: '#f7f5f0' },
    { id: 'frog', ko: '개구리 가수', en: 'Singer Frog', fur: '#7cc46a' },
  ];

  // ---------- 날짜와 난수 ----------
  function dayKey(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 도감 ----------
  function unlockedFlavors(totalLayers) {
    const total = Number.isFinite(totalLayers) ? totalLayers : 0;
    return FLAVORS.filter((f) => total >= f.need);
  }
  function nextUnlock(totalLayers) {
    return FLAVORS.find((f) => f.need > totalLayers) || null;
  }

  // ---------- 오늘의 주문: 날짜가 같으면 모두 같은 주문 ----------
  function dailyOrder(key) {
    const r = rng(hash(`tiertop:${key}`));
    const customer = CUSTOMERS[hash(`guest:${key}`) % CUSTOMERS.length];
    const target = 10 + Math.floor(r() * 9); // 10~18층
    const pool = FLAVORS.slice();
    const flavors = [];
    const count = 3 + Math.floor(r() * 2);
    for (let i = 0; i < count; i += 1) flavors.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
    return { key, customer: customer.id, target, flavors, seed: hash(`swing:${key}`) % 100000 };
  }

  // ---------- 흔들림: 위층 가운데를 지나가는 진자. 각도는 천천히 돈다 ----------
  // 진자는 한 번 흔들릴 때마다 반드시 가운데를 두 번 지나므로 딱 맞출 기회가 늘 있다.
  function swing(level, seed = 0) {
    const lv = Math.max(0, level);
    return {
      amp: Math.min(2.4, 1.7 + lv * 0.025),
      speed: Math.min(3, 1.2 + lv * 0.045), // 라디안/초
      turn: 0.32 + ((seed % 7) * 0.03),
      phase: (seed % 360) * (Math.PI / 180),
    };
  }
  function dropperOffset(t, level, seed) {
    const s = swing(level, seed);
    const along = s.amp * Math.sin(s.speed * t);
    const angle = s.phase + s.turn * t;
    return { x: along * Math.cos(angle), z: along * Math.sin(angle) };
  }

  // ---------- 한 판 ----------
  function newRun(order, flavorIds) {
    const ids = flavorIds && flavorIds.length ? flavorIds : order.flavors;
    return {
      order: order.key,
      target: order.target,
      seed: order.seed,
      flavors: ids.slice(),
      layers: [{ x: 0, z: 0, r: BASE_R, flavor: ids[0] }],
      score: 0,
      streak: 0,
      bestStreak: 0,
      perfects: 0,
      over: false,
      delivered: false,
    };
  }
  const top = (run) => run.layers[run.layers.length - 1];
  const height = (run) => run.layers.length - 1; // 첫 층(받침)은 세지 않는다
  const flavorAt = (run, index) => run.flavors[index % run.flavors.length];

  // 떨어뜨린 위치(접시 기준 x, z)로 새 층을 놓는다. 돌려주는 것: { run, event }
  function drop(run, at) {
    if (run.over) return { run, event: { type: 'over' } };
    const t = top(run);
    const dx = at.x - t.x;
    const dz = at.z - t.z;
    const d = Math.hypot(dx, dz);
    const flavor = flavorAt(run, run.layers.length);
    const next = { ...run, layers: run.layers.slice() };
    if (d <= PERFECT) {
      const streak = run.streak + 1;
      const grow = streak % GROW_EVERY === 0;
      const cap = run.mode === 'stage' ? run.layers[0].r : BASE_R;
      const r = (grow ? Math.min(cap, t.r + GROW) : t.r) - shrinkOf(run);
      if (r < MIN_R) return { run: { ...next, over: true, streak: 0 }, event: { type: 'miss', d, at: { x: at.x, z: at.z }, r: t.r, flavor } };
      next.layers.push({ x: t.x, z: t.z, r, flavor });
      Object.assign(next, {
        streak, bestStreak: Math.max(run.bestStreak, streak), perfects: run.perfects + 1, score: run.score + 1 + Math.min(streak, 5),
      });
      return finishDrop(run, next, { type: 'perfect', streak, grew: grow && r > t.r, d });
    }
    const r = t.r - d / 2 - shrinkOf(run);
    if (d >= t.r || r < MIN_R) {
      next.over = true;
      next.streak = 0;
      return { run: next, event: { type: 'miss', d, at: { x: at.x, z: at.z }, r: t.r, flavor } };
    }
    next.layers.push({ x: t.x + dx / 2, z: t.z + dz / 2, r, flavor });
    Object.assign(next, { streak: 0, score: run.score + 1 });
    // 잘려 나간 쪽: 놓은 원에서 바깥으로 삐져나간 방향
    return finishDrop(run, next, { type: 'trim', d, cut: { dx: dx / d, dz: dz / d } });
  }
  function shrinkOf(run) {
    return run.mode === 'stage' ? stageSpec(run.stage).shrink : 0;
  }
  function finishDrop(before, next, event) {
    if (next.mode === 'stage') {
      if (height(next) >= next.target) {
        next.cleared = true;
        next.delivered = true;
        next.over = true;
        event.cleared = true;
        event.delivered = true;
      }
      return { run: next, event };
    }
    if (!before.delivered && height(next) >= next.target) {
      next.delivered = true;
      event.delivered = true;
    }
    return { run: next, event };
  }

  // ---------- 저장 ----------
  function newSave() {
    return { v: 1, best: 0, totalLayers: 0, runs: 0, stamps: 0, lastStamp: '', daily: { key: '', best: 0, done: false }, bestStreak: 0, stage: { best: 0, stars: [], plays: 0 } };
  }
  const num = (v, min = 0, max = 1e7) => (Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : min);
  function sanitize(raw) {
    const base = newSave();
    if (!raw || typeof raw !== 'object') return base;
    const daily = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
    return {
      v: 1,
      best: num(raw.best, 0, 100000),
      totalLayers: num(raw.totalLayers),
      runs: num(raw.runs),
      stamps: num(raw.stamps, 0, 100000),
      lastStamp: typeof raw.lastStamp === 'string' ? raw.lastStamp.slice(0, 10) : '',
      daily: {
        key: typeof daily.key === 'string' ? daily.key.slice(0, 10) : '',
        best: num(daily.best, 0, 100000),
        done: daily.done === true,
      },
      bestStreak: num(raw.bestStreak, 0, 100000),
      stage: sanitizeStage(raw.stage),
    };
  }
  // 단계 기록: 예전 저장에는 없으므로 비어 있으면 0단계부터.
  function sanitizeStage(raw) {
    const st = raw && typeof raw === 'object' ? raw : {};
    const best = num(st.best, 0, 9999);
    const stars = Array.isArray(st.stars) ? st.stars.slice(0, best).map((x) => num(x, 0, 3)) : [];
    return { best, stars, plays: num(st.plays) };
  }
  function parseSave(text) {
    try { return sanitize(JSON.parse(text)); } catch { return newSave(); }
  }

  // 한 판이 끝났을 때 기록을 더한다. 새로 열린 맛과 새 기록 여부를 같이 돌려준다.
  function recordRun(save, run, key) {
    const s = sanitize(save);
    const h = height(run);
    const before = unlockedFlavors(s.totalLayers).length;
    const daily = s.daily.key === key ? { ...s.daily } : { key, best: 0, done: false };
    daily.best = Math.max(daily.best, h);
    let stamped = false;
    if (run.delivered && run.order === key) {
      if (!daily.done) stamped = s.lastStamp !== key;
      daily.done = true;
    }
    const next = {
      ...s,
      best: Math.max(s.best, h),
      totalLayers: s.totalLayers + h,
      runs: s.runs + 1,
      daily,
      stamps: s.stamps + (stamped ? 1 : 0),
      lastStamp: stamped ? key : s.lastStamp,
      bestStreak: Math.max(s.bestStreak, run.bestStreak),
    };
    const unlocked = unlockedFlavors(next.totalLayers).slice(before);
    return { save: next, newBest: h > s.best, unlocked, stamped };
  }

  // 하다 만 판을 다시 열 때: 이상한 값이 있으면 버린다(null).
  function sanitizeRun(raw, order) {
    if (!raw || typeof raw !== 'object' || raw.order !== order.key || raw.over || !Array.isArray(raw.layers)) return null;
    const ids = new Set(FLAVORS.map((f) => f.id));
    const layers = raw.layers.slice(0, 2000);
    if (!layers.length) return null;
    for (const l of layers) {
      if (!l || ![l.x, l.z, l.r].every(Number.isFinite) || l.r < MIN_R || l.r > BASE_R || Math.hypot(l.x, l.z) > 5 || !ids.has(l.flavor)) return null;
    }
    const run = newRun(order);
    run.layers = layers.map((l) => ({ x: l.x, z: l.z, r: l.r, flavor: l.flavor }));
    run.score = num(raw.score);
    run.streak = num(raw.streak);
    run.bestStreak = Math.max(run.streak, num(raw.bestStreak));
    run.perfects = Math.min(num(raw.perfects), height(run));
    run.delivered = height(run) >= run.target;
    return run;
  }

  // 별: 주문을 채웠는지와 딱 맞음 비율
  // 건넨 케이크에서 별 하나 더 받으려면 '딱 맞음'이 몇 번 더 필요했는지. 이미 셋이거나 못 건넸으면 null.
  function perfectsToNextStar(run) {
    if (!run.delivered) return null;
    const h = Math.max(1, height(run));
    const now = stars(run);
    if (now >= 3) return null;
    const target = now === 2 ? Math.ceil(h * 0.5) : Math.ceil(h * 0.2);
    return { next: now + 1, need: Math.max(1, target - run.perfects) };
  }

  function stars(run) {
    if (!run.delivered) return 0;
    const ratio = run.perfects / Math.max(1, height(run));
    return ratio >= 0.5 ? 3 : ratio >= 0.2 ? 2 : 1;
  }

  // ---------- 시연과 검증용 손: 가운데를 지나는 순간을 노리되 반응이 jitter초만큼 흔들린다 ----------
  // 진자 위치가 가운데를 지나는 시각: speed * t = n * PI
  function nextCenterTime(now, level, seed) {
    const s = swing(level, seed);
    const n = Math.ceil((now * s.speed) / Math.PI + 1e-9);
    return (n * Math.PI) / s.speed;
  }
  function simulate({ order, jitter = 0, seed = 1, maxLayers = 400 }) {
    const r = rng(seed);
    let run = newRun(order);
    let t = 0.3;
    while (!run.over && height(run) < maxLayers) {
      const level = height(run);
      const center = nextCenterTime(t + 0.25, level, run.seed);
      const noise = jitter ? (r() + r() + r() - 1.5) * jitter * 2 : 0;
      t = center + noise;
      const off = dropperOffset(t, level, run.seed);
      const tp = top(run);
      run = drop(run, { x: tp.x + off.x, z: tp.z + off.z }).run;
      t += 0.5;
    }
    return run;
  }

  // ---------- 단계 도전: 1~60단계(10단계마다 새 장치와 테마) 뒤로 끝없는 단계 ----------
  // 모든 장치는 '진자가 가운데(또는 바람을 되갚는 자리)를 지나는 순간'이 반드시 오도록 만든다.
  // 바람·받침은 흔들림과 같은 축 위에서만 움직이고, 8자 짤주머니와는 함께 나오지 않는다(그러면 딱 맞출 자리가 사라진다).
  const FALL_T = 0.2; // 손을 뗀 뒤 층이 닿기까지(초). 화면과 판정이 같은 값을 쓴다.
  const STAGE_CAP = 9999;
  const STAGE_MAIN = 60;
  const CHAPTERS = [
    { id: 'kitchen', device: 'basic', ko: '바닐라 주방', en: 'Vanilla Kitchen', ja: 'バニラのキッチン', sky: ['#ffcfc0', '#fff3e3'], plate: '#ffffff', lace: '#ffe0ea', flavors: ['vanilla', 'strawberry', 'choco'] },
    { id: 'garden', device: 'wind', ko: '딸기 정원', en: 'Strawberry Garden', ja: 'いちごの庭', sky: ['#bfe8c9', '#fff4ea'], plate: '#fff7fb', lace: '#ff9fb8', flavors: ['strawberry', 'vanilla', 'lemon', 'matcha'] },
    { id: 'workshop', device: 'slide', ko: '초코 공방', en: 'Choco Workshop', ja: 'チョコ工房', sky: ['#e8c4a4', '#fff1df'], plate: '#f6e8da', lace: '#b07a5a', flavors: ['choco', 'vanilla', 'redvelvet', 'mango'] },
    { id: 'teahouse', device: 'eight', ko: '말차 찻집', en: 'Matcha Teahouse', ja: '抹茶の茶屋', sky: ['#cfe7b8', '#f7f6e6'], plate: '#f4f9ee', lace: '#8cc26a', flavors: ['matcha', 'vanilla', 'blacksesame', 'taro'] },
    { id: 'night', device: 'shrink', ko: '블루베리 밤', en: 'Blueberry Night', ja: 'ブルーベリーの夜', sky: ['#6d78c4', '#d3cdf3'], plate: '#eef0ff', lace: '#8a93e6', flavors: ['blueberry', 'taro', 'mint', 'vanilla'] },
    { id: 'festival', device: 'rubato', ko: '무지개 축제', en: 'Rainbow Festival', ja: 'にじのお祭り', sky: ['#ffd1e8', '#d8f3ff'], plate: '#ffffff', lace: '#ffd166', flavors: ['mango', 'mint', 'strawberry', 'blueberry', 'lemon'] },
    { id: 'endless', device: 'mix', ko: '끝없는 주방', en: 'Endless Kitchen', ja: 'はてしないキッチン', sky: ['#ffbe94', '#fff0d0'], plate: '#fffaf0', lace: '#e2627f', flavors: ['pumpkin', 'redvelvet', 'lemon', 'matcha', 'choco'] },
  ];

  const clampStage = (n) => Math.max(1, Math.min(STAGE_CAP, Math.floor(Number(n)) || 1));
  const chapterOf = (n) => (clampStage(n) > STAGE_MAIN ? 6 : Math.floor((clampStage(n) - 1) / 10));

  // 단계 n의 설정. 같은 n이면 언제나 같은 판(씨앗으로 정한다).
  function stageSpec(stage) {
    const n = clampStage(stage);
    const ch = chapterOf(n);
    const k = n > STAGE_MAIN ? (n - STAGE_MAIN - 1) % 10 : (n - 1) % 10; // 장 안에서 0~9
    const g = Math.min(1, (n - 1) / (STAGE_MAIN - 1)); // 1~60단계에서 0~1
    const e = Math.max(0, n - STAGE_MAIN); // 끝없는 단계 수
    const r = rng(hash(`stage:${n}`));
    const spec = {
      n, chapter: ch, device: CHAPTERS[ch].device,
      target: n <= STAGE_MAIN ? 5 + Math.ceil(n * 0.55) : Math.min(46, 38 + Math.floor(e / 6)),
      baseR: Math.round(BASE_R * (1 - 0.16 * g) * 1000) / 1000,
      amp: Math.min(2.2, 1.6 + 0.35 * g + 0.02 * k),
      speed: Math.min(2.15, 1.1 + 0.035 * k + 0.55 * g + Math.min(0.25, e * 0.004)),
      turn: 0.26 + r() * 0.18,
      phase: r() * Math.PI * 2,
      wind: 0, slide: 0, slideF: 0, eight: 0, shrink: 0, rubato: 0, rubatoF: 0,
    };
    const roll = r();
    const extra = r();
    // 그 장의 장치는 세게, 앞 장에서 배운 장치는 가끔 약하게 섞는다.
    if (ch === 1) spec.wind = 0.22 + 0.03 * k;
    if (ch === 2) { spec.slide = 0.32 + 0.03 * k; spec.slideF = 0.75 + 0.05 * k; if (roll < 0.4) spec.wind = 0.2; }
    if (ch === 3) spec.eight = 0.42 + 0.03 * k;
    if (ch === 4) {
      spec.shrink = 0.012 + 0.0015 * k;
      if (roll < 0.35) spec.eight = 0.5; else if (roll < 0.7) spec.wind = 0.25; else { spec.slide = 0.35; spec.slideF = 0.8; }
    }
    if (ch === 5) {
      spec.rubato = 0.22 + 0.025 * k;
      spec.rubatoF = 1.1 + 0.05 * k;
      if (roll < 0.3) spec.eight = 0.55; else if (roll < 0.6) spec.wind = 0.28; else if (roll < 0.85) { spec.slide = 0.4; spec.slideF = 0.85; }
      if (extra < 0.35) spec.shrink = 0.012;
    }
    if (ch === 6) {
      const s = Math.min(1, e / 120); // 끝없는 단계가 깊어질수록 조금씩 세진다
      if (roll < 0.3) spec.eight = 0.5 + 0.2 * s;
      else {
        if (roll < 0.65 || extra < 0.5) spec.wind = 0.24 + 0.12 * s;
        if (roll >= 0.65 || extra < 0.3) { spec.slide = 0.35 + 0.15 * s; spec.slideF = 0.85 + 0.15 * s; }
      }
      if (extra > 0.45) { spec.rubato = 0.24 + 0.08 * s; spec.rubatoF = 1.2; }
      if (r() < 0.4) spec.shrink = 0.012 + 0.006 * s;
    }
    if (spec.slide) spec.turn = 0; // 받침이 움직이는 판은 흔들리는 축을 돌리지 않는다(같은 줄 위에서만 엇갈린다)
    // 사람이 누를 수 있게: 가운데를 지나는 가장 빠른 속도를 묶어 딱 맞음 구간이 44ms 밑으로 내려가지 않게 한다.
    const geom = Math.hypot(spec.amp, 2 * spec.eight);
    const room = (5 - spec.slide * spec.slideF) / geom - 0.3 - spec.rubato * spec.rubatoF;
    spec.speed = Math.max(0.9, Math.min(spec.speed, room));
    spec.seed = hash(`stage-swing:${n}`) % 100000;
    return spec;
  }

  // 흔들림 각: 박자(rubato)는 빨라졌다 느려지지만 늘 앞으로만 간다(되돌아가지 않으므로 가운데를 반드시 지난다).
  function stageTheta(spec, h, t) {
    const w = spec.speed + Math.min(0.3, h * 0.01);
    return w * t + (spec.rubato ? spec.rubato * Math.sin(spec.rubatoF * t) : 0);
  }
  function stageAxis(spec, t) {
    const a = spec.phase + spec.turn * t;
    return { x: Math.cos(a), z: Math.sin(a) };
  }
  // 짤주머니 위치(위층 가운데 기준). 8자 짤주머니는 옆으로도 흔들리지만 가운데를 지날 때는 옆 흔들림도 0이다.
  function stageOffset(spec, h, t) {
    const th = stageTheta(spec, h, t);
    const ax = stageAxis(spec, t);
    const along = spec.amp * Math.sin(th);
    const side = spec.eight ? spec.eight * Math.sin(2 * th) : 0;
    return { x: along * ax.x - side * ax.z, z: along * ax.z + side * ax.x };
  }
  // 바람: 층마다 세기와 방향(축의 앞뒤)이 다르다.
  function stageWind(spec, layerIndex, t) {
    if (!spec.wind) return { x: 0, z: 0, s: 0 };
    const r = rng(hash(`wind:${spec.n}:${layerIndex}`));
    const s = (0.55 + 0.45 * r()) * spec.wind * (r() < 0.5 ? -1 : 1);
    const ax = stageAxis(spec, t);
    return { x: s * ax.x, z: s * ax.z, s };
  }
  // 흔들리는 받침: 케이크 전체가 흔들림과 같은 축 위에서 미끄러진다.
  function stageSlide(spec, t) {
    if (!spec.slide) return { x: 0, z: 0 };
    const ax = stageAxis(spec, t);
    const m = spec.slide * Math.sin(spec.slideF * t);
    return { x: m * ax.x, z: m * ax.z };
  }

  function newStageRun(stage, flavorIds) {
    const spec = stageSpec(stage);
    const ids = flavorIds && flavorIds.length ? flavorIds : CHAPTERS[spec.chapter].flavors;
    return {
      mode: 'stage', stage: spec.n, order: `stage-${spec.n}`, target: spec.target, seed: spec.seed,
      flavors: ids.slice(),
      layers: [{ x: 0, z: 0, r: spec.baseR, flavor: ids[0] }],
      score: 0, streak: 0, bestStreak: 0, perfects: 0, over: false, delivered: false, cleared: false,
    };
  }

  // 지금 손을 떼면 위층 가운데에서 얼마나 떨어진 곳에 닿는지(케이크 기준). 오늘의 주문은 예전과 똑같다.
  function landingAt(run, t) {
    if (run.mode !== 'stage') return dropperOffset(t, height(run), run.seed);
    const spec = stageSpec(run.stage);
    const o = stageOffset(spec, height(run), t);
    const w = stageWind(spec, run.layers.length, t);
    const p = stageSlide(spec, t + FALL_T);
    return { x: o.x + w.x - p.x, z: o.z + w.z - p.z };
  }
  // 화면에 그릴 짤주머니 위치(위층 가운데 기준, 바람 전)
  function hoverAt(run, t) {
    return run.mode === 'stage' ? stageOffset(stageSpec(run.stage), height(run), t) : dropperOffset(t, height(run), run.seed);
  }
  function plateShift(run, t) {
    return run && run.mode === 'stage' ? stageSlide(stageSpec(run.stage), t) : { x: 0, z: 0 };
  }

  // 딱 맞출 수 있는 시간 구간들을 찾는다(시연 손과 검증용). step 초 간격으로 훑는다.
  function perfectWindows(run, from, span, step = 0.002) {
    const out = [];
    let start = null;
    for (let t = from; t <= from + span; t += step) {
      const l = landingAt(run, t);
      const ok = Math.hypot(l.x, l.z) <= PERFECT;
      if (ok && start === null) start = t;
      if (!ok && start !== null) { out.push({ a: start, b: t - step }); start = null; }
    }
    if (start !== null) out.push({ a: start, b: from + span });
    return out;
  }
  // 다음으로 딱 맞출 수 있는 가장 가까운 순간(구간 가운데). 없으면 null.
  function nextPerfectTime(run, from, span = 6) {
    const w = perfectWindows(run, from, span, 0.004).find((x) => x.b - x.a >= 0.012);
    return w ? (w.a + w.b) / 2 : null;
  }

  // 단계 별: 목표를 채웠으면 ★1, 딱 맞음이 절반 이상 ★2, 80% 이상 ★3
  function stageStars(run) {
    if (!run.cleared) return 0;
    const ratio = run.perfects / Math.max(1, height(run));
    return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  }
  const totalStageStars = (save) => (save.stage && save.stage.stars ? save.stage.stars.reduce((a, b) => a + b, 0) : 0);
  // 전국 랭킹 '최고 도달 단계' 점수: 단계 × 1000 + 모은 별(같은 단계면 별이 많은 쪽이 위)
  const stageRankScore = (save) => (save.stage && save.stage.best > 0 ? save.stage.best * 1000 + Math.min(999, totalStageStars(save)) : 0);
  const stageUnlocked = (save, n) => clampStage(n) <= Math.min(STAGE_CAP, ((save.stage && save.stage.best) || 0) + 1);

  // 단계 판이 끝났을 때 기록을 더한다.
  function recordStage(save, run) {
    const s = sanitize(save);
    const h = height(run);
    const before = unlockedFlavors(s.totalLayers).length;
    const st = { ...s.stage, stars: s.stage.stars.slice(), plays: s.stage.plays + 1 };
    const stars = stageStars(run);
    const firstClear = run.cleared && run.stage > st.best;
    if (run.cleared) {
      st.best = Math.max(st.best, run.stage);
      while (st.stars.length < Math.min(run.stage, STAGE_CAP)) st.stars.push(0);
      const i = run.stage - 1;
      st.stars[i] = Math.max(st.stars[i] || 0, stars);
    }
    const next = {
      ...s,
      totalLayers: s.totalLayers + h,
      runs: s.runs + 1,
      bestStreak: Math.max(s.bestStreak, run.bestStreak),
      stage: st,
    };
    const unlocked = unlockedFlavors(next.totalLayers).slice(before);
    return { save: next, cleared: run.cleared, stars, firstClear, newBest: firstClear, unlocked };
  }

  const logic = {
    FALL_T, STAGE_CAP, STAGE_MAIN, CHAPTERS, chapterOf, stageSpec, stageOffset, stageWind, stageSlide, newStageRun, landingAt, hoverAt, plateShift,
    perfectWindows, nextPerfectTime, stageStars, totalStageStars, stageRankScore, stageUnlocked, recordStage, sanitizeStage,
    perfectsToNextStar,
    BASE_R, LAYER_H, PERFECT, MIN_R, GROW_EVERY, FLAVORS, CUSTOMERS,
    dayKey, hash, rng, unlockedFlavors, nextUnlock, dailyOrder, swing, dropperOffset,
    newRun, top, height, flavorAt, drop, newSave, sanitize, parseSave, sanitizeRun, recordRun, stars, nextCenterTime, simulate,
    flavor: (id) => FLAVORS.find((f) => f.id === id) || FLAVORS[0],
    customer: (id) => CUSTOMERS.find((c) => c.id === id) || CUSTOMERS[0],
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
