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
      const r = grow ? Math.min(BASE_R, t.r + GROW) : t.r;
      next.layers.push({ x: t.x, z: t.z, r, flavor });
      Object.assign(next, {
        streak, bestStreak: Math.max(run.bestStreak, streak), perfects: run.perfects + 1, score: run.score + 1 + Math.min(streak, 5),
      });
      return finishDrop(run, next, { type: 'perfect', streak, grew: grow && r > t.r, d });
    }
    const r = t.r - d / 2;
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
  function finishDrop(before, next, event) {
    if (!before.delivered && height(next) >= next.target) {
      next.delivered = true;
      event.delivered = true;
    }
    return { run: next, event };
  }

  // ---------- 저장 ----------
  function newSave() {
    return { v: 1, best: 0, totalLayers: 0, runs: 0, stamps: 0, lastStamp: '', daily: { key: '', best: 0, done: false }, bestStreak: 0 };
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
    };
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

  const logic = {
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
