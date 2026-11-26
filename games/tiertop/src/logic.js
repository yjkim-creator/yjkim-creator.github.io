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
  // 강화는 단계 씨앗(stageSpec)을 바꾸지 않는다. 판을 만들 때 시작 폭·속도·딱 맞음만 보탠다.
  const REVIVE_COST = 8;
  const REVIVE_MAX = 3;
  const UPGRADES = {
    wide: { max: 5, step: 0.05, costs: [4, 8, 12, 18, 24] },
    slow: { max: 5, step: 0.16, costs: [4, 8, 12, 18, 24] },
    cushion: { max: 3, step: 0.012, costs: [8, 14, 22] },
    // 미리 쌓기: 무한 쌓기(오늘의 주문)에서만 단계마다 1층씩 쌓인 채로 시작한다. 단계 도전에는 쓰지 않는다.
    // 미리 쌓은 층은 주문 목표에는 들어가지만 기록(최고·오늘 최고·전국 랭킹)과 도감 누적에는 넣지 않는다.
    // 끝없이 올릴 수 있다(max 는 저장값 안전 한도일 뿐). 11레벨부터 값은 20 + 4 × (넘은 레벨).
    pre: { max: 999, step: 1, endless: true, costs: [3, 4, 5, 6, 8, 10, 12, 14, 16, 20] },
  };
  // 강화 lv → lv+1 값
  function upCost(id, lv) {
    const def = UPGRADES[id];
    if (!def) return Infinity;
    if (lv < def.costs.length) return def.costs[lv];
    return def.endless ? def.costs[def.costs.length - 1] + 4 * (lv - def.costs.length + 1) : Infinity;
  }
  function slackOf(run) {
    const c = run && run.up && run.up.cushion ? run.up.cushion : 0;
    return PERFECT + c * UPGRADES.cushion.step;
  }

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
    { id: 'sweetpotato', ko: '고구마', en: 'Sweet Potato', color: '#c98a4b', cream: '#f3d3a6', need: 660 },
    { id: 'cherry', ko: '체리', en: 'Cherry', color: '#c2183b', cream: '#ff9bb0', need: 780 },
    { id: 'peach', ko: '복숭아', en: 'Peach', color: '#ff9f7a', cream: '#ffe0cf', need: 910 },
    { id: 'yuzu', ko: '유자', en: 'Yuzu', color: '#f7b500', cream: '#fff0a8', need: 1050 },
    { id: 'coffee', ko: '커피', en: 'Coffee', color: '#7a4b2e', cream: '#d9b99b', need: 1200 },
    { id: 'caramel', ko: '캐러멜', en: 'Caramel', color: '#c9802d', cream: '#f2cf96', need: 1360 },
    { id: 'pistachio', ko: '피스타치오', en: 'Pistachio', color: '#9cc47a', cream: '#dcefc4', need: 1530 },
    { id: 'coconut', ko: '코코넛', en: 'Coconut', color: '#d9cbb3', cream: '#fbf7ef', need: 1710 },
    { id: 'raspberry', ko: '라즈베리', en: 'Raspberry', color: '#d6245f', cream: '#f7a8c4', need: 1900 },
    { id: 'cheese', ko: '치즈', en: 'Cheesecake', color: '#ffd76e', cream: '#fff4cc', need: 2100 },
    { id: 'cottoncandy', ko: '솜사탕', en: 'Cotton Candy', color: '#ff9ed8', cream: '#bfe6ff', need: 2320 },
    { id: 'injeolmi', ko: '인절미', en: 'Injeolmi', color: '#d2a75c', cream: '#efdcae', need: 2550 },
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
  function swing(level, seed = 0, up) {
    const lv = Math.max(0, level);
    const slow = up && up.slow ? up.slow : 0;
    // 느린 시작: 처음은 단계마다 16% 느리게, 8층에 걸쳐 원래 속도로 돌아온다.
    const fade = Math.min(1, lv / 8);
    const start = slow ? Math.max(0.42, 1 - slow * UPGRADES.slow.step) : 1;
    const factor = start + (1 - start) * fade;
    return {
      amp: Math.min(2.4, 1.7 + lv * 0.025),
      speed: Math.min(3, 1.2 + lv * 0.045) * factor, // 라디안/초
      turn: 0.32 + ((seed % 7) * 0.03),
      phase: (seed % 360) * (Math.PI / 180),
    };
  }
  function dropperOffset(t, level, seed, up) {
    const s = swing(level, seed, up);
    const along = s.amp * Math.sin(s.speed * t);
    const angle = s.phase + s.turn * t;
    return { x: along * Math.cos(angle), z: along * Math.sin(angle) };
  }

  // ---------- 한 판 ----------
  const WIDE_CAP = BASE_R + UPGRADES.wide.max * UPGRADES.wide.step;
  function newRun(order, flavorIds, up) {
    const ids = flavorIds && flavorIds.length ? flavorIds : order.flavors;
    const load = normalizeUp(up);
    const r = Math.min(WIDE_CAP, Math.round((BASE_R + load.wide * UPGRADES.wide.step) * 1000) / 1000);
    const pre = load.pre * UPGRADES.pre.step;
    return {
      mode: 'daily',
      order: order.key,
      target: order.target,
      seed: order.seed,
      flavors: ids.slice(),
      layers: startLayers(r, pre, ids),
      pre,
      score: 0,
      streak: 0,
      bestStreak: 0,
      perfects: 0,
      over: false,
      delivered: false,
      up: load,
      revived: false,
    };
  }
  // 받침 한 층 + 미리 쌓은 층(모두 가운데, 같은 폭)
  function startLayers(r, pre, ids) {
    const out = [];
    for (let i = 0; i <= pre; i += 1) out.push({ x: 0, z: 0, r, flavor: ids[i % ids.length] });
    return out;
  }
  const top = (run) => run.layers[run.layers.length - 1];
  const height = (run) => run.layers.length - 1; // 첫 층(받침)은 세지 않는다
  // 직접 쌓은 층: 기록·랭킹·별·흔들림 빠르기는 이것으로 센다(미리 쌓은 층 제외).
  const own = (run) => Math.max(0, height(run) - (run.pre || 0));
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
    if (d <= slackOf(run)) {
      const streak = run.streak + 1;
      const grow = streak % GROW_EVERY === 0;
      const cap = run.layers[0].r;
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
    return { v: 1, best: 0, totalLayers: 0, runs: 0, stamps: 0, lastStamp: '', daily: { key: '', best: 0, done: false }, bestStreak: 0, stage: freshStage(), quest: sanitizeQuest(null), attend: sanitizeAttend(null) };
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
      quest: sanitizeQuest(raw.quest),
      attend: sanitizeAttend(raw.attend),
    };
  }
  // 단계 기록: 예전 저장에는 없으므로 비어 있으면 0단계부터.
  // stars(0~3)는 그 단계의 실력 별이고 랭킹에 쓴다. purse는 깰 때마다 모으는 쓸 수 있는 별이다. 둘은 섞지 않는다.
  function freshStage() {
    return { best: 0, stars: [], plays: 0, purse: 0, revive: 0, up: { wide: 0, slow: 0, cushion: 0, pre: 0 } };
  }
  function normalizeUp(raw) {
    const u = raw && typeof raw === 'object' ? raw : {};
    return { wide: num(u.wide, 0, 5), slow: num(u.slow, 0, 5), cushion: num(u.cushion, 0, 3), pre: num(u.pre, 0, UPGRADES.pre.max) };
  }
  function sanitizeStage(raw) {
    const st = raw && typeof raw === 'object' ? raw : {};
    const best = num(st.best, 0, 9999);
    const stars = Array.isArray(st.stars) ? st.stars.slice(0, best).map((x) => num(x, 0, 3)) : [];
    return { best, stars, plays: num(st.plays), purse: num(st.purse), revive: num(st.revive, 0, REVIVE_MAX), up: normalizeUp(st.up) };
  }
  function parseSave(text) {
    try { return sanitize(JSON.parse(text)); } catch { return newSave(); }
  }

  // 한 판이 끝났을 때 기록을 더한다. 새로 열린 맛과 새 기록 여부를 같이 돌려준다.
  function recordRun(save, run, key) {
    const s = sanitize(save);
    const h = own(run);
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
    const layers = raw.layers.slice(0, 3000);
    if (!layers.length) return null;
    for (const l of layers) {
      if (!l || ![l.x, l.z, l.r].every(Number.isFinite) || l.r < MIN_R || l.r > WIDE_CAP || Math.hypot(l.x, l.z) > 5 || !ids.has(l.flavor)) return null;
    }
    const run = newRun(order, null, raw.up);
    run.layers = layers.map((l) => ({ x: l.x, z: l.z, r: l.r, flavor: l.flavor }));
    run.revived = raw.revived === true;
    run.pre = Math.min(num(raw.pre, 0, UPGRADES.pre.max * UPGRADES.pre.step), height(run));
    run.score = num(raw.score);
    run.streak = num(raw.streak);
    run.bestStreak = Math.max(run.streak, num(raw.bestStreak));
    run.perfects = Math.min(num(raw.perfects), own(run));
    run.delivered = height(run) >= run.target;
    return run;
  }

  // 별: 주문을 채웠는지와 딱 맞음 비율
  // 건넨 케이크에서 별 하나 더 받으려면 '딱 맞음'이 몇 번 더 필요했는지. 이미 셋이거나 못 건넸으면 null.
  function perfectsToNextStar(run) {
    if (!run.delivered) return null;
    const h = Math.max(1, own(run));
    const now = stars(run);
    if (now >= 3) return null;
    const target = now === 2 ? Math.ceil(h * 0.5) : Math.ceil(h * 0.2);
    return { next: now + 1, need: Math.max(1, target - run.perfects) };
  }

  function stars(run) {
    if (!run.delivered) return 0;
    const ratio = run.perfects / Math.max(1, own(run));
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

  // ---------- 단계 도전: 1~120단계(10단계마다 새 장치와 테마) 뒤로 끝없는 단계 ----------
  // 모든 장치는 '진자가 가운데(또는 바람·받침을 되갚는 자리)를 지나는 순간'이 반드시 오도록 만든다.
  // 바람·돌개바람·받침·미끄러운 크림은 흔들림과 같은 축 위에서만 움직이고, 8자 짤주머니와는 함께 나오지 않는다(그러면 딱 맞출 자리가 사라진다).
  // 1~60단계는 2026-11-21 첫 판과 똑같다(같은 씨앗, 같은 순서로 난수를 쓴다). 깬 단계·별이 그대로 뜻을 갖게 한다.
  const FALL_T = 0.2; // 손을 뗀 뒤 층이 닿기까지(초). 화면과 판정이 같은 값을 쓴다.
  const STAGE_CAP = 9999;
  const STAGE_MAIN = 120;
  const CHAPTERS = [
    { id: 'kitchen', device: 'basic', ko: '바닐라 주방', en: 'Vanilla Kitchen', ja: 'バニラのキッチン', sky: ['#ffcfc0', '#fff3e3'], plate: '#ffffff', lace: '#ffe0ea', flavors: ['vanilla', 'strawberry', 'choco'] },
    { id: 'garden', device: 'wind', ko: '딸기 정원', en: 'Strawberry Garden', ja: 'いちごの庭', sky: ['#bfe8c9', '#fff4ea'], plate: '#fff7fb', lace: '#ff9fb8', flavors: ['strawberry', 'vanilla', 'lemon', 'matcha'] },
    { id: 'workshop', device: 'slide', ko: '초코 공방', en: 'Choco Workshop', ja: 'チョコ工房', sky: ['#e8c4a4', '#fff1df'], plate: '#f6e8da', lace: '#b07a5a', flavors: ['choco', 'vanilla', 'redvelvet', 'mango'] },
    { id: 'teahouse', device: 'eight', ko: '말차 찻집', en: 'Matcha Teahouse', ja: '抹茶の茶屋', sky: ['#cfe7b8', '#f7f6e6'], plate: '#f4f9ee', lace: '#8cc26a', flavors: ['matcha', 'vanilla', 'blacksesame', 'taro'] },
    { id: 'night', device: 'shrink', ko: '블루베리 밤', en: 'Blueberry Night', ja: 'ブルーベリーの夜', sky: ['#6d78c4', '#d3cdf3'], plate: '#eef0ff', lace: '#8a93e6', flavors: ['blueberry', 'taro', 'mint', 'vanilla'] },
    { id: 'festival', device: 'rubato', ko: '무지개 축제', en: 'Rainbow Festival', ja: 'にじのお祭り', sky: ['#ffd1e8', '#d8f3ff'], plate: '#ffffff', lace: '#ffd166', flavors: ['mango', 'mint', 'strawberry', 'blueberry', 'lemon'] },
    { id: 'greenhouse', device: 'fog', ko: '레몬 온실', en: 'Lemon Greenhouse', ja: 'レモンの温室', sky: ['#fff3b0', '#f2fbe6'], plate: '#fffdf0', lace: '#f5d82a', flavors: ['lemon', 'vanilla', 'matcha', 'mint'] },
    { id: 'icecafe', device: 'slip', ko: '민트 빙수 가게', en: 'Mint Ice Café', ja: 'ミントのかき氷屋', sky: ['#b8ecf0', '#f2fffd'], plate: '#f3fffd', lace: '#3fc4a2', flavors: ['mint', 'vanilla', 'blueberry', 'strawberry'] },
    { id: 'harvest', device: 'spin', ko: '단호박 수확제', en: 'Pumpkin Harvest', ja: 'かぼちゃの収穫祭', sky: ['#ffc98f', '#fff1dc'], plate: '#fff6ea', lace: '#e8731f', flavors: ['pumpkin', 'choco', 'mango', 'vanilla'] },
    { id: 'ballroom', device: 'dance', ko: '별빛 무도회', en: 'Starlight Ball', ja: '星あかりの舞踏会', sky: ['#4b4f8f', '#b9b4e6'], plate: '#f2f0ff', lace: '#ffd166', flavors: ['taro', 'blueberry', 'lemon', 'redvelvet'] },
    { id: 'castle', device: 'gust', ko: '초콜릿 성', en: 'Chocolate Castle', ja: 'チョコレートのお城', sky: ['#c9a07f', '#f4e3d3'], plate: '#f8ece2', lace: '#5a2e1a', flavors: ['choco', 'blacksesame', 'redvelvet', 'vanilla'] },
    { id: 'skyparty', device: 'party', ko: '구름 위 파티', en: 'Party in the Clouds', ja: '雲の上のパーティー', sky: ['#cfe4ff', '#fff5fb'], plate: '#ffffff', lace: '#b89ad6', flavors: ['strawberry', 'mint', 'mango', 'blueberry', 'lemon', 'taro'] },
    { id: 'endless', device: 'mix', ko: '끝없는 주방', en: 'Endless Kitchen', ja: 'はてしないキッチン', sky: ['#ffbe94', '#fff0d0'], plate: '#fffaf0', lace: '#e2627f', flavors: ['pumpkin', 'redvelvet', 'lemon', 'matcha', 'choco'] },
  ];
  const ENDLESS = CHAPTERS.length - 1;

  const clampStage = (n) => Math.max(1, Math.min(STAGE_CAP, Math.floor(Number(n)) || 1));
  const chapterOf = (n) => (clampStage(n) > STAGE_MAIN ? ENDLESS : Math.floor((clampStage(n) - 1) / 10));

  // 단계 n의 설정. 같은 n이면 언제나 같은 판(씨앗으로 정한다).
  function stageSpec(stage) {
    const n = clampStage(stage);
    const ch = chapterOf(n);
    const k = n > STAGE_MAIN ? (n - STAGE_MAIN - 1) % 10 : (n - 1) % 10; // 장 안에서 0~9
    const g = Math.min(1, (n - 1) / 59); // 1~60단계에서 0~1
    const g2 = n > 60 ? Math.min(1, (n - 61) / 59) : 0; // 61~120단계에서 0~1
    const e = Math.max(0, n - STAGE_MAIN); // 끝없는 단계 수
    const r = rng(hash(`stage:${n}`));
    const spec = {
      n, chapter: ch, device: CHAPTERS[ch].device,
      target: n <= 60 ? 5 + Math.ceil(n * 0.55) : n <= STAGE_MAIN ? 38 + Math.floor((n - 60) / 6) : Math.min(56, 48 + Math.floor(e / 8)),
      baseR: Math.round((BASE_R * (1 - 0.16 * g) - 0.06 * g2) * 1000) / 1000,
      amp: Math.min(2.2, 1.6 + 0.35 * g + 0.02 * k),
      speed: Math.min(2.3, 1.1 + 0.035 * k + 0.55 * g + 0.12 * g2 + Math.min(0.2, e * 0.003)),
      turn: 0.26 + r() * 0.18,
      phase: r() * Math.PI * 2,
      wind: 0, slide: 0, slideF: 0, eight: 0, shrink: 0, rubato: 0, rubatoF: 0,
      fog: 0, fogP: 0, slip: 0, gust: 0, gustF: 0, dance: 0,
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
    // ---- 61단계부터 ----
    const fogOn = (lv) => { spec.fog = lv; };
    if (ch === 6) { // 구름 가림: 짤주머니와 고리가 주기적으로 가려진다(보이는 시간 비율 fog)
      fogOn(0.72 - 0.01 * k);
      if (roll < 0.3) spec.wind = 0.22; else if (roll < 0.5) spec.eight = 0.45;
    }
    if (ch === 7) { // 미끄러운 크림: 놓은 층이 흔들리던 쪽으로 더 미끄러진다(slip 초만큼 앞선 자리)
      spec.slip = 0.08 + 0.01 * k;
      if (roll < 0.4) spec.wind = 0.2; else if (roll < 0.6) { spec.slide = 0.35; spec.slideF = 0.8; }
      if (extra < 0.3) spec.shrink = 0.012;
    }
    if (ch === 8) { // 빙글 짤주머니: 흔들리는 축이 빠르게 돈다
      spec.turn = 0.75 + 0.04 * k;
      if (roll < 0.35) spec.eight = 0.5; else if (roll < 0.7) spec.wind = 0.25;
      if (extra < 0.3) spec.shrink = 0.012;
    }
    if (ch === 9) { // 춤추는 짤주머니: 층마다 흔들림 폭이 달라진다(±dance)
      spec.dance = 0.15 + 0.012 * k;
      if (roll < 0.3) spec.eight = 0.5; else if (roll < 0.6) spec.slip = 0.1; else if (roll < 0.8) { spec.slide = 0.35; spec.slideF = 0.85; }
      if (extra < 0.35) { spec.rubato = 0.2; spec.rubatoF = 1.2; }
    }
    if (ch === 10) { // 돌개바람: 바람 세기와 방향이 쉬지 않고 바뀐다
      spec.gust = 0.25 + 0.02 * k;
      spec.gustF = 0.9 + 0.05 * k;
      if (roll < 0.35) { spec.slide = 0.3; spec.slideF = 0.8; }
      if (extra < 0.3) fogOn(0.7);
    }
    if (ch === 11 || ch === ENDLESS) { // 구름 위 파티, 끝없는 주방: 앞 장치를 섞는다(끝없는 쪽은 깊어질수록 조금씩 세진다)
      const s = ch === ENDLESS ? Math.min(1, e / 120) : k / 9;
      const pick = r();
      if (pick < 0.25) spec.eight = 0.5 + 0.2 * s;
      else if (pick < 0.45) { spec.gust = 0.25 + 0.1 * s; spec.gustF = 1 + 0.1 * s; }
      else if (pick < 0.65) { spec.wind = 0.24 + 0.12 * s; spec.slip = 0.09 + 0.03 * s; }
      else if (pick < 0.85) { spec.slide = 0.35 + 0.15 * s; spec.slideF = 0.85 + 0.15 * s; }
      else spec.turn = 0.75 + 0.15 * s;
      if (roll < 0.4) fogOn(0.7 - 0.06 * s);
      if (extra > 0.5) { spec.rubato = 0.24 + 0.08 * s; spec.rubatoF = 1.2; }
      else if (extra > 0.25) spec.dance = 0.15 + 0.06 * s;
      if (r() < 0.4) spec.shrink = 0.012 + 0.006 * s;
    }
    if (spec.eight) { spec.wind = 0; spec.slide = 0; spec.slip = 0; spec.gust = 0; } // 8자와 같이 나오면 딱 맞출 자리가 사라진다
    if (spec.slide || spec.slip) spec.turn = 0; // 받침·미끄러운 크림 판은 흔들리는 축을 돌리지 않는다(같은 줄 위에서만 엇갈린다)
    // 사람이 누를 수 있게: 가운데를 지나는 가장 빠른 속도를 묶어 딱 맞음 구간이 44ms 밑으로 내려가지 않게 한다.
    const geom = Math.hypot(spec.amp * (1 + spec.dance), 2 * spec.eight) * Math.hypot(1, spec.slip * 5);
    const room = (5 - spec.slide * spec.slideF - spec.gust * spec.gustF) / geom - 0.3 - spec.rubato * spec.rubatoF;
    spec.speed = Math.max(0.9, Math.min(spec.speed, room));
    // 구름 주기는 흔들림 반 주기의 황금비 배: 가려지는 때가 가운데를 지나는 순간과 매번 어긋나 오래 기다리지 않는다.
    if (spec.fog) {
      spec.fogP = (1.618 * Math.PI) / spec.speed;
      spec.fog = Math.max(spec.fog, 1 - 0.5 / spec.fogP); // 한 번에 가려지는 시간은 0.5초까지
    }
    spec.seed = hash(`stage-swing:${n}`) % 100000;
    return spec;
  }

  // 흔들림 각: 박자(rubato)는 빨라졌다 느려지지만 늘 앞으로만 간다(되돌아가지 않으므로 가운데를 반드시 지난다).
  function stageTheta(spec, h, t) {
    const full = spec.speedFull || spec.speed;
    const fade = spec.slowLv ? Math.min(1, h / 8) : 1;
    const w = spec.speed + (full - spec.speed) * fade + Math.min(0.3, h * 0.01);
    return w * t + (spec.rubato ? spec.rubato * Math.sin(spec.rubatoF * t) : 0);
  }
  function stageAxis(spec, t) {
    const a = spec.phase + spec.turn * t;
    return { x: Math.cos(a), z: Math.sin(a) };
  }
  // 층마다 흔들림 폭(춤추는 짤주머니). 그 밖에는 늘 같다.
  function stageAmp(spec, h) {
    if (!spec.dance) return spec.amp;
    const r = rng(hash(`dance:${spec.n}:${h}`));
    return spec.amp * (1 - spec.dance + 2 * spec.dance * r());
  }
  // 짤주머니 위치(위층 가운데 기준). 8자 짤주머니는 옆으로도 흔들리지만 가운데를 지날 때는 옆 흔들림도 0이다.
  function stageOffset(spec, h, t) {
    const th = stageTheta(spec, h, t);
    const ax = stageAxis(spec, t);
    const along = stageAmp(spec, h) * Math.sin(th);
    const side = spec.eight ? spec.eight * Math.sin(2 * th) : 0;
    return { x: along * ax.x - side * ax.z, z: along * ax.z + side * ax.x };
  }
  // 바람: 층마다 세기와 방향(축의 앞뒤)이 다르다. 돌개바람은 시간에 따라 세기와 방향이 바뀐다.
  function stageWind(spec, layerIndex, t) {
    const ax = stageAxis(spec, t);
    let s = 0;
    if (spec.gust) s += spec.gust * Math.sin(spec.gustF * t + spec.phase * 3);
    if (spec.wind) {
      const r = rng(hash(`wind:${spec.n}:${layerIndex}`));
      s += (0.55 + 0.45 * r()) * spec.wind * (r() < 0.5 ? -1 : 1);
    }
    if (!s) return { x: 0, z: 0, s: 0 };
    return { x: s * ax.x, z: s * ax.z, s };
  }
  // 흔들리는 받침: 케이크 전체가 흔들림과 같은 축 위에서 미끄러진다.
  function stageSlide(spec, t) {
    if (!spec.slide) return { x: 0, z: 0 };
    const ax = stageAxis(spec, t);
    const m = spec.slide * Math.sin(spec.slideF * t);
    return { x: m * ax.x, z: m * ax.z };
  }
  // 구름 가림: 지금 짤주머니가 보이는지(보이는 시간 비율 fog, 주기 fogP 초)
  function stageVisible(spec, t) {
    if (!spec.fog) return true;
    const u = ((t + spec.phase) % spec.fogP + spec.fogP) % spec.fogP;
    return u / spec.fogP < spec.fog;
  }

  function tune(spec, up) {
    const wide = up && up.wide ? up.wide : 0;
    const slow = up && up.slow ? up.slow : 0;
    if (!wide && !slow) return spec;
    const next = { ...spec };
    if (wide) next.baseR = Math.min(WIDE_CAP, Math.round((spec.baseR + wide * UPGRADES.wide.step) * 1000) / 1000);
    if (slow) {
      const start = Math.max(0.42, 1 - slow * UPGRADES.slow.step);
      next.slowLv = slow;
      next.speedFull = spec.speed;
      next.speed = Math.max(0.5, Math.round(spec.speed * start * 1000) / 1000);
      if (next.fog) {
        next.fogP = (1.618 * Math.PI) / next.speed;
        next.fog = Math.max(spec.fog, 1 - 0.5 / next.fogP);
      }
    }
    return next;
  }
  function playSpec(run) {
    return tune(stageSpec(run.stage), run && run.up);
  }
  function newStageRun(stage, flavorIds, up) {
    const load = normalizeUp(up);
    const spec = tune(stageSpec(stage), load);
    const ids = flavorIds && flavorIds.length ? flavorIds : CHAPTERS[spec.chapter].flavors;
    return {
      mode: 'stage', stage: spec.n, order: `stage-${spec.n}`, target: spec.target, seed: spec.seed,
      flavors: ids.slice(),
      layers: [{ x: 0, z: 0, r: spec.baseR, flavor: ids[0] }],
      score: 0, streak: 0, bestStreak: 0, perfects: 0, over: false, delivered: false, cleared: false,
      up: load, revived: false,
    };
  }

  // 지금 손을 떼면 위층 가운데에서 얼마나 떨어진 곳에 닿는지(케이크 기준). 오늘의 주문은 예전과 똑같다.
  function landingAt(run, t) {
    if (run.mode !== 'stage') return dropperOffset(t, own(run), run.seed, run.up);
    const spec = playSpec(run);
    const o = stageOffset(spec, height(run), t);
    const w = stageWind(spec, run.layers.length, t);
    const p = stageSlide(spec, t + FALL_T);
    let sx = 0;
    let sz = 0;
    if (spec.slip) { // 미끄러운 크림: 짤주머니가 움직이던 쪽으로 slip 초만큼 더 간 자리에 앉는다
      const h = height(run);
      const a = stageOffset(spec, h, t - 0.01);
      const b2 = stageOffset(spec, h, t + 0.01);
      sx = ((b2.x - a.x) / 0.02) * spec.slip;
      sz = ((b2.z - a.z) / 0.02) * spec.slip;
    }
    return { x: o.x + w.x - p.x + sx, z: o.z + w.z - p.z + sz };
  }
  // 화면에 그릴 짤주머니 위치(위층 가운데 기준, 바람 전)
  function hoverAt(run, t) {
    return run.mode === 'stage' ? stageOffset(playSpec(run), height(run), t) : dropperOffset(t, own(run), run.seed, run.up);
  }
  function plateShift(run, t) {
    return run && run.mode === 'stage' ? stageSlide(playSpec(run), t) : { x: 0, z: 0 };
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
  function stagePay(run) {
    return run && run.cleared ? stageStars(run) : 0;
  }
  function grantPurse(save, amount) {
    const s = sanitize(save);
    const add = num(amount);
    if (!add) return s;
    return { ...s, stage: { ...s.stage, purse: num(s.stage.purse + add) } };
  }
  function buy(save, id) {
    const s = sanitize(save);
    const st = { ...s.stage, up: { ...s.stage.up } };
    if (id === 'revive') {
      if (st.revive >= REVIVE_MAX || st.purse < REVIVE_COST) return null;
      st.revive += 1;
      st.purse -= REVIVE_COST;
    } else {
      const def = UPGRADES[id];
      if (!def) return null;
      const lv = st.up[id];
      const cost = upCost(id, lv);
      if (lv >= def.max || st.purse < cost) return null;
      st.purse -= cost;
      st.up[id] = lv + 1;
    }
    return { ...s, stage: st };
  }
  function takeRevive(save) {
    const s = sanitize(save);
    if (!s.stage.revive) return null;
    return { ...s, stage: { ...s.stage, revive: s.stage.revive - 1 } };
  }
  function continueRun(run) {
    if (!run || !run.over || run.revived) return null;
    if (run.mode === 'stage' && run.cleared) return null;
    return { ...run, over: false, revived: true, streak: 0 };
  }
  // 상점에서 산 강화를 이미 쌓던 판에도 붙인다. 아직 첫 층만 있으면 시작 폭도 다시 맞춘다.
  function equipRun(run, up) {
    if (!run) return run;
    const load = normalizeUp(up);
    const next = { ...run, up: load };
    if (own(next) === 0 && next.layers && next.layers[0]) {
      const base = next.mode === 'stage' ? stageSpec(next.stage).baseR : BASE_R;
      const r = Math.min(WIDE_CAP, Math.round((base + load.wide * UPGRADES.wide.step) * 1000) / 1000);
      if (next.mode === 'stage') next.layers = [{ ...next.layers[0], r }];
      else {
        next.pre = load.pre * UPGRADES.pre.step;
        next.layers = startLayers(r, next.pre, next.flavors);
        next.delivered = false;
      }
    }
    return next;
  }

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

  // ---------- 오늘의 할 일·출석 도장 ----------
  // 할 일 3개는 날짜로 정해져 모두 같다. 채우면 바로 별(purse)을 준다(받기 단추 없음). 셋 다 채우면 보너스.
  // 출석 도장은 하루 한 번 앱을 켜면 한 칸. 빠진 날이 있어도 칸이 지워지지 않는다(놓치면 잃는 장치는 두지 않는다).
  const QUESTS = {
    perf: [15, 20, 25], // 오늘 딱 맞음 합계
    tiers: [30, 40, 50], // 오늘 직접 쌓은 층 합계(미리 쌓기 제외)
    stage: [1, 2, 3], // 오늘 단계 통과 횟수
    chain: [5, 6, 8], // 한 판에서 딱 맞음 연속
    order: [1], // 오늘의 주문 완성
    runs: [3, 4, 5], // 오늘 끝낸 판 수
  };
  const QUEST_PAY = 3;
  const QUEST_BONUS = 5;
  const ATTEND = [2, 2, 3, 3, 4, 4, 8];
  function dailyQuests(key) {
    const r = rng(hash(`quest:${key}`));
    const kinds = Object.keys(QUESTS);
    const out = [];
    while (out.length < 3) {
      const kind = kinds.splice(Math.floor(r() * kinds.length), 1)[0];
      const opts = QUESTS[kind];
      out.push({ kind, need: opts[Math.floor(r() * opts.length)], pay: QUEST_PAY });
    }
    return out;
  }
  function questState(save, key) {
    const q = save && save.quest && save.quest.key === key ? save.quest : null;
    return q ? { key, p: q.p.slice(), got: q.got.slice(), all: q.all } : { key, p: [0, 0, 0], got: [false, false, false], all: false };
  }
  function sanitizeQuest(raw) {
    const q = raw && typeof raw === 'object' ? raw : {};
    const arr = (a, f) => [0, 1, 2].map((i) => f(Array.isArray(a) ? a[i] : undefined));
    return {
      key: typeof q.key === 'string' ? q.key.slice(0, 10) : '',
      p: arr(q.p, (v) => num(v, 0, 100000)),
      got: arr(q.got, (v) => v === true),
      all: q.all === true,
    };
  }
  function sanitizeAttend(raw) {
    const a = raw && typeof raw === 'object' ? raw : {};
    return { last: typeof a.last === 'string' ? a.last.slice(0, 10) : '', n: num(a.n, 0, 100000) };
  }
  // 한 판이 끝날 때(무한·단계 모두) 할 일을 채운다. 새로 끝난 할 일과 받은 별을 돌려준다.
  function trackQuests(save, run, key) {
    const s = sanitize(save);
    const list = dailyQuests(key);
    const q = questState(s, key);
    const stage = run.mode === 'stage';
    const gain = {
      perf: run.perfects || 0,
      tiers: stage ? height(run) : own(run),
      stage: stage && run.cleared ? 1 : 0,
      chain: run.bestStreak || 0,
      order: !stage && run.delivered && run.order === key ? 1 : 0,
      runs: 1,
    };
    const done = [];
    let pay = 0;
    list.forEach((t, i) => {
      if (q.got[i]) return;
      q.p[i] = t.kind === 'chain' || t.kind === 'order' ? Math.max(q.p[i], gain[t.kind]) : q.p[i] + gain[t.kind];
      if (q.p[i] >= t.need) { q.got[i] = true; pay += t.pay; done.push(t); }
    });
    let bonus = 0;
    if (!q.all && q.got.every(Boolean)) { q.all = true; bonus = QUEST_BONUS; }
    const next = { ...s, quest: q, stage: { ...s.stage, purse: num(s.stage.purse + pay + bonus) } };
    return { save: next, done, pay, bonus };
  }
  // 앱을 켠 날 출석 한 칸. 오늘 이미 찍었으면 null.
  function attend(save, key) {
    const s = sanitize(save);
    if (s.attend.last === key) return null;
    const day = (s.attend.n % ATTEND.length) + 1;
    const pay = ATTEND[day - 1];
    return { save: { ...s, attend: { last: key, n: s.attend.n + 1 }, stage: { ...s.stage, purse: num(s.stage.purse + pay) } }, day, pay };
  }

  const logic = {
    QUESTS, QUEST_PAY, QUEST_BONUS, ATTEND, dailyQuests, questState, trackQuests, attend,
    FALL_T, STAGE_CAP, STAGE_MAIN, CHAPTERS, chapterOf, stageSpec, stageOffset, stageWind, stageSlide, stageVisible, stageAmp, newStageRun, landingAt, hoverAt, plateShift,
    perfectWindows, nextPerfectTime, stageStars, totalStageStars, stageRankScore, stageUnlocked, recordStage, sanitizeStage,
    REVIVE_COST, REVIVE_MAX, UPGRADES, upCost, slackOf, tune, playSpec, stagePay, grantPurse, buy, takeRevive, continueRun, equipRun,
    perfectsToNextStar,
    BASE_R, LAYER_H, PERFECT, MIN_R, GROW_EVERY, FLAVORS, CUSTOMERS,
    dayKey, hash, rng, unlockedFlavors, nextUnlock, dailyOrder, swing, dropperOffset,
    newRun, top, height, own, flavorAt, drop, newSave, sanitize, parseSave, sanitizeRun, recordRun, stars, nextCenterTime, simulate,
    flavor: (id) => FLAVORS.find((f) => f.id === id) || FLAVORS[0],
    customer: (id) => CUSTOMERS.find((c) => c.id === id) || CUSTOMERS[0],
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
