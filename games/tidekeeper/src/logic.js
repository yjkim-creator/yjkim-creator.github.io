// 조수 웅덩이의 규칙. DOM 없이 쓰고, 브라우저와 node 테스트가 같은 코드를 읽는다.
// 시간은 모두 밀리초 정수로 받고, 화면은 이 모듈이 돌려준 상태만 그린다.
(function (root) {
  const COLS = 4;
  const ROWS = 5;
  const SLOTS = COLS * ROWS;
  const OFFLINE_CAP = 8 * 3600 * 1000;
  const MAX_LEVEL = 99;
  const LIKE_BONUS = 1.5;
  const PEARL_BONUS = 0.1;
  const VISITOR_BONUS = 0.05;
  const PEARL_UNIT = 1e6;
  const RELEASE_START = 50; // 새 판을 탭 없이도 바로 심기 시작할 수 있게 준다.

  // 좋아하는 이웃(likes)이 상하좌우에 하나라도 있으면 1.5배로 자란다.
  const SPECIES = [
    { id: 'kelp', base: 10, rate: 0.4, likes: 1 },
    { id: 'snail', base: 120, rate: 2, likes: 0 },
    { id: 'anemone', base: 1500, rate: 10, likes: 1 },
    { id: 'sponge', base: 2e4, rate: 50, likes: 2 },
    { id: 'urchin', base: 3e5, rate: 300, likes: 0 },
    { id: 'coral', base: 1.5e7, rate: 5000, likes: 3 },
    { id: 'star', base: 4e8, rate: 60000, likes: 4 },
    { id: 'lantern', base: 1.2e10, rate: 6e5, likes: 5 },
  ];

  const count = (s, sp) => s.grid.filter((t) => t && t.s === sp).length;
  const VISITORS = [
    { id: 'goby', test: (s) => count(s, 0) >= 3 },
    { id: 'shrimp', test: (s) => s.grid.some((t, i) => t && t.s === 0 && liked(s, i)) },
    { id: 'hermit', test: (s) => s.taps >= 200 },
    { id: 'wrasse', test: (s) => count(s, 2) >= 3 },
    { id: 'seahorse', test: (s) => s.grid.some((t) => t && t.s === 3 && t.l >= 10) },
    { id: 'blenny', test: (s) => s.grid.every(Boolean) },
    { id: 'nudibranch', test: (s) => new Set(s.grid.filter(Boolean).map((t) => t.s)).size >= 6 },
    { id: 'turtle', test: (s) => s.releases >= 1 },
    { id: 'ray', test: (s, now) => perSecond(s, now) >= 1e6 },
    { id: 'octopus', test: (s) => s.totalEarned >= 1e10 },
    { id: 'moonjelly', test: (s) => count(s, 7) >= 1 },
    { id: 'whale', test: (s) => s.stamps.length >= 5 },
  ];

  const TASKS = [
    { id: 'tap', goal: 150 },
    { id: 'plant', goal: 4 },
    { id: 'upgrade', goal: 15 },
  ];

  function dateKey(now) {
    const d = new Date(now);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function newDaily(now) {
    return { date: dateKey(now), taps: 0, plants: 0, upgrades: 0, done: false };
  }

  function newState(now = Date.now()) {
    return {
      v: 1,
      plankton: 0,
      runEarned: 0,
      totalEarned: 0,
      pearls: 0,
      releases: 0,
      taps: 0,
      grid: new Array(SLOTS).fill(null),
      unlocked: 1,
      visitors: [],
      stamps: [],
      daily: newDaily(now),
      lastSeen: now,
      rateTier: 0,
    };
  }

  const num = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);

  // 저장값이 깨졌거나 예전 형식이어도 앱이 열리게 맞춘다.
  function sanitize(raw, now = Date.now()) {
    const s = newState(now);
    if (!raw || typeof raw !== 'object') return s;
    s.plankton = num(raw.plankton, 0, 1e300, 0);
    s.runEarned = num(raw.runEarned, 0, 1e300, 0);
    s.totalEarned = Math.max(s.runEarned, num(raw.totalEarned, 0, 1e300, 0));
    s.pearls = Math.floor(num(raw.pearls, 0, 1e6, 0));
    s.releases = Math.floor(num(raw.releases, 0, 1e6, 0));
    s.taps = Math.floor(num(raw.taps, 0, 1e12, 0));
    if (Array.isArray(raw.grid)) {
      for (let i = 0; i < SLOTS; i += 1) {
        const t = raw.grid[i];
        if (t && Number.isInteger(t.s) && t.s >= 0 && t.s < SPECIES.length) {
          s.grid[i] = { s: t.s, l: Math.floor(num(t.l, 1, MAX_LEVEL, 1)) };
        }
      }
    }
    const top = s.grid.reduce((m, t) => (t ? Math.max(m, t.s + 2) : m), 1);
    s.unlocked = Math.floor(num(raw.unlocked, 1, SPECIES.length, 1));
    s.unlocked = Math.min(SPECIES.length, Math.max(s.unlocked, top));
    const ids = VISITORS.map((v) => v.id);
    if (Array.isArray(raw.visitors)) s.visitors = [...new Set(raw.visitors.filter((v) => ids.includes(v)))];
    if (Array.isArray(raw.stamps)) s.stamps = [...new Set(raw.stamps.filter((d) => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d)))].sort();
    const d = raw.daily;
    if (d && typeof d === 'object' && typeof d.date === 'string') {
      s.daily = {
        date: d.date,
        taps: Math.floor(num(d.taps, 0, 1e9, 0)),
        plants: Math.floor(num(d.plants, 0, 1e9, 0)),
        upgrades: Math.floor(num(d.upgrades, 0, 1e9, 0)),
        done: d.done === true,
      };
    }
    // 시계가 뒤로 갔거나 미래 시각이 저장돼 있으면 지금으로 본다.
    const seen = num(raw.lastSeen, 0, 1e15, now);
    s.lastSeen = seen > now ? now : seen;
    // 예전 저장값에는 이정표가 없다. 지금 생산량으로 채워서 돌아오자마자 축하가 쏟아지지 않게 한다.
    s.rateTier = typeof raw.rateTier === 'number' && Number.isFinite(raw.rateTier) ? Math.floor(num(raw.rateTier, 0, 300, 0)) : rateTier(perSecond(s, now));
    return s;
  }

  function neighbors(i) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const out = [];
    if (r > 0) out.push(i - COLS);
    if (r < ROWS - 1) out.push(i + COLS);
    if (c > 0) out.push(i - 1);
    if (c < COLS - 1) out.push(i + 1);
    return out;
  }

  function liked(s, i) {
    const t = s.grid[i];
    if (!t) return false;
    const want = SPECIES[t.s].likes;
    return neighbors(i).some((n) => s.grid[n] && s.grid[n].s === want);
  }

  function tide(s, now) {
    const key = dateKey(now);
    const h = hash(`tide:${key}`);
    return { species: h % Math.max(1, s.unlocked), task: TASKS[(h >>> 8) % TASKS.length] };
  }

  function globalMult(s) {
    return (1 + PEARL_BONUS * s.pearls) * (1 + VISITOR_BONUS * s.visitors.length);
  }

  function levelMult(l) {
    return (l >= 10 ? 2 : 1) * (l >= 25 ? 2 : 1) * (l >= 50 ? 2 : 1);
  }

  function tileRate(s, i, now) {
    const t = s.grid[i];
    if (!t) return 0;
    const sp = SPECIES[t.s];
    const boost = tide(s, now).species === t.s ? 2 : 1;
    return sp.rate * t.l * levelMult(t.l) * (liked(s, i) ? LIKE_BONUS : 1) * boost * globalMult(s);
  }

  function perSecond(s, now) {
    let sum = 0;
    for (let i = 0; i < SLOTS; i += 1) sum += tileRate(s, i, now);
    return sum;
  }

  function tapValue(s, now) {
    return Math.max(1, perSecond(s, now) * 0.2) * (1 + PEARL_BONUS * s.pearls);
  }

  function plantCost(s, sp) {
    return Math.ceil(SPECIES[sp].base * 1.15 ** count(s, sp));
  }

  function upgradeCost(s, i) {
    const t = s.grid[i];
    if (!t) return Infinity;
    return Math.ceil(SPECIES[t.s].base * 0.5 * 1.3 ** t.l);
  }

  function earn(s, amount) {
    s.plankton += amount;
    s.runEarned += amount;
    s.totalEarned += amount;
  }

  // 날짜가 바뀌었으면 오늘의 과제를 새로 시작한다.
  function rollDay(s, now) {
    if (s.daily.date !== dateKey(now)) s.daily = newDaily(now);
  }

  function checkDaily(s, now) {
    if (s.daily.done) return null;
    const task = tide(s, now).task;
    const have = { tap: s.daily.taps, plant: s.daily.plants, upgrade: s.daily.upgrades }[task.id];
    if (have < task.goal) return null;
    s.daily.done = true;
    s.pearls += 1;
    if (!s.stamps.includes(s.daily.date)) s.stamps.push(s.daily.date);
    return 'daily';
  }

  function checkVisitors(s, now) {
    const found = [];
    for (const v of VISITORS) {
      if (!s.visitors.includes(v.id) && v.test(s, now)) {
        s.visitors.push(v.id);
        found.push(v.id);
      }
    }
    return found;
  }

  function clone(s) {
    return { ...s, grid: s.grid.map((t) => (t ? { ...t } : null)), visitors: [...s.visitors], stamps: [...s.stamps], daily: { ...s.daily } };
  }

  // 초당 생산량 자릿수 이정표: 10 → 1, 100 → 2, 1천 → 3 ...
  function rateTier(rate) {
    return rate >= 10 ? Math.floor(Math.log10(rate) + 1e-9) : 0;
  }

  function after(s, now) {
    const visitors = checkVisitors(s, now);
    const daily = checkDaily(s, now);
    const tier = rateTier(perSecond(s, now));
    let milestone = 0;
    if (tier > (s.rateTier || 0)) { s.rateTier = tier; milestone = tier; }
    return { state: s, visitors, daily, milestone };
  }

  // 흐른 시간만큼 쌓는다. 앱을 닫아 둔 시간은 8시간까지만 센다.
  function tick(state, now) {
    const s = clone(state);
    rollDay(s, now);
    const elapsed = Math.min(OFFLINE_CAP, Math.max(0, now - s.lastSeen));
    const gained = perSecond(s, now) * (elapsed / 1000);
    earn(s, gained);
    s.lastSeen = now;
    const out = after(s, now);
    out.gained = gained;
    out.elapsed = elapsed;
    return out;
  }

  function tap(state, now) {
    const s = clone(state);
    rollDay(s, now);
    const value = tapValue(s, now);
    earn(s, value);
    s.taps += 1;
    s.daily.taps += 1;
    const out = after(s, now);
    out.value = value;
    return out;
  }

  function plant(state, slot, sp, now) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS) return null;
    if (!Number.isInteger(sp) || sp < 0 || sp >= state.unlocked) return null;
    if (state.grid[slot]) return null;
    const cost = plantCost(state, sp);
    if (state.plankton < cost) return null;
    const s = clone(state);
    rollDay(s, now);
    s.plankton -= cost;
    s.grid[slot] = { s: sp, l: 1 };
    s.unlocked = Math.min(SPECIES.length, Math.max(s.unlocked, sp + 2));
    s.daily.plants += 1;
    return after(s, now);
  }

  function upgrade(state, slot, now) {
    const t = state.grid[slot];
    if (!t || t.l >= MAX_LEVEL) return null;
    const cost = upgradeCost(state, slot);
    if (state.plankton < cost) return null;
    const s = clone(state);
    rollDay(s, now);
    s.plankton -= cost;
    s.grid[slot].l += 1;
    s.daily.upgrades += 1;
    return after(s, now);
  }

  // 칸을 비워 더 좋은 생물을 심을 자리를 만든다. 값을 돌려주지는 않는다.
  function clear(state, slot, now) {
    if (!state.grid[slot]) return null;
    const s = clone(state);
    s.grid[slot] = null;
    return after(s, now);
  }

  // 자리를 바꾸는 것은 공짜다. 빈칸이면 옮기고, 생물이 있으면 맞바꾼다.
  function move(state, from, to, now) {
    if (from === to || !state.grid[from] || to < 0 || to >= SLOTS) return null;
    const s = clone(state);
    [s.grid[from], s.grid[to]] = [s.grid[to], s.grid[from]];
    return after(s, now);
  }

  function pendingPearls(s) {
    return Math.floor(Math.cbrt(s.runEarned / PEARL_UNIT));
  }

  // 웅덩이를 바다로 돌려보내고 진주를 받는다. 도감, 도장, 진주는 남는다.
  function release(state, now) {
    const gain = pendingPearls(state);
    if (gain < 1) return null;
    const s = clone(state);
    const fresh = newState(now);
    Object.assign(s, {
      plankton: RELEASE_START, runEarned: 0, grid: fresh.grid, unlocked: 1,
      pearls: s.pearls + gain, releases: s.releases + 1, lastSeen: now,
    });
    const out = after(s, now);
    out.gain = gain;
    return out;
  }

  function taskProgress(s, now) {
    const task = tide(s, now).task;
    const have = s.daily.date === dateKey(now) ? { tap: s.daily.taps, plant: s.daily.plants, upgrade: s.daily.upgrades }[task.id] : 0;
    return { id: task.id, goal: task.goal, have: Math.min(have, task.goal), done: s.daily.date === dateKey(now) && s.daily.done };
  }

  const logic = {
    COLS, ROWS, SLOTS, SPECIES, VISITORS, OFFLINE_CAP, MAX_LEVEL, PEARL_UNIT,
    newState, sanitize, neighbors, liked, tide, tileRate, perSecond, tapValue, plantCost, upgradeCost,
    tick, tap, plant, upgrade, move, clear, release, pendingPearls, taskProgress, dateKey, globalMult, levelMult, rateTier,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
