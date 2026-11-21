// 종이배 포구의 규칙. DOM 없이 쓰며 브라우저와 node 테스트가 같은 코드를 읽는다.
// 판: w x h 칸의 포구. 배는 뱃머리 칸(x, y)과 방향(dir), 길이(len)로 정해지고 몸통은 뱃머리 뒤로 이어진다.
// 배를 누르면 뱃머리 쪽으로 곧장 미끄러져 판 밖(바다)으로 나간다. 앞에 배나 바위가 있으면 부딪혀 되돌아온다.
(function (root) {
  const DIRS = {
    U: { dx: 0, dy: -1 },
    D: { dx: 0, dy: 1 },
    L: { dx: -1, dy: 0 },
    R: { dx: 1, dy: 0 },
  };
  const DIR_KEYS = ['U', 'D', 'L', 'R'];
  const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' };
  const MAX_LANTERNS = 3;
  const DAILY_COUNT = 3;
  const SAVE_VERSION = 1;

  // 같은 씨앗이면 같은 수열. 오늘의 포구가 모든 폰에서 같도록.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function cellsOf(boat) {
    const d = DIRS[boat.dir];
    const cells = [];
    for (let i = 0; i < boat.len; i += 1) cells.push({ x: boat.x - d.dx * i, y: boat.y - d.dy * i });
    return cells;
  }

  function inside(p, x, y) {
    return x >= 0 && y >= 0 && x < p.w && y < p.h;
  }

  // 칸마다 무엇이 있는지: 배 id, 'rock', 또는 null
  function occupancy(p, removed) {
    const grid = new Array(p.w * p.h).fill(null);
    for (const r of p.rocks) grid[r.y * p.w + r.x] = 'rock';
    for (const b of p.boats) {
      if (removed && removed.has(b.id)) continue;
      for (const c of cellsOf(b)) grid[c.y * p.w + c.x] = b.id;
    }
    return grid;
  }

  // 배가 지금 나갈 수 있는지. free면 판 끝까지의 거리, 아니면 처음 막힌 것과 거리.
  function pathStatus(p, removed, id, grid) {
    const boat = p.boats.find((b) => b.id === id);
    if (!boat) return null;
    const g = grid || occupancy(p, removed);
    const d = DIRS[boat.dir];
    let x = boat.x + d.dx;
    let y = boat.y + d.dy;
    let dist = 0;
    while (inside(p, x, y)) {
      const what = g[y * p.w + x];
      if (what !== null && what !== id) return { free: false, hit: what, dist, at: { x, y } };
      x += d.dx;
      y += d.dy;
      dist += 1;
    }
    return { free: true, dist };
  }

  function boatAt(p, removed, x, y) {
    if (!inside(p, x, y)) return null;
    const what = occupancy(p, removed)[y * p.w + x];
    return typeof what === 'number' ? what : null;
  }

  // 나갈 수 있는 배를 빼면 다른 배의 길이 열리기만 하므로(닫히지 않으므로) 탐욕적으로 빼서 다 빠지면 풀리는 판이다.
  // 돌려주는 layers는 "한 물결에 동시에 나갈 수 있는 배" 묶음이며 그 수가 판의 깊이(난이도)다.
  function solve(p, removedIds) {
    const removed = new Set(removedIds || []);
    const layers = [];
    const left = () => p.boats.filter((b) => !removed.has(b.id));
    while (left().length) {
      const grid = occupancy(p, removed);
      const wave = left().filter((b) => pathStatus(p, removed, b.id, grid).free).map((b) => b.id);
      if (!wave.length) return null;
      layers.push(wave);
      for (const id of wave) removed.add(id);
    }
    return layers;
  }

  function freeBoats(p, removedIds) {
    const removed = new Set(removedIds || []);
    const grid = occupancy(p, removed);
    return p.boats.filter((b) => !removed.has(b.id) && pathStatus(p, removed, b.id, grid).free).map((b) => b.id);
  }

  function tryPlace(p, grid, boat) {
    const cells = cellsOf(boat);
    for (const c of cells) {
      if (!inside(p, c.x, c.y) || grid[c.y * p.w + c.x] !== null) return false;
    }
    for (const c of cells) grid[c.y * p.w + c.x] = boat.id;
    return true;
  }

  // 무작위로 빽빽하게 배를 놓고, 막힌 배는 방향을 뒤집어 풀리는 판으로 고친다. 후보 여럿 중 가장 깊은 판을 고른다.
  function generateOnce(seed, spec) {
    const rand = rng(seed);
    const p = { w: spec.w, h: spec.h, boats: [], rocks: [], seed };
    const grid = new Array(p.w * p.h).fill(null);
    for (let i = 0; i < (spec.rocks || 0); i += 1) {
      const x = 1 + Math.floor(rand() * (p.w - 2));
      const y = 1 + Math.floor(rand() * (p.h - 2));
      if (grid[y * p.w + x] === null) {
        grid[y * p.w + x] = 'rock';
        p.rocks.push({ x, y });
      }
    }
    const target = Math.round(p.w * p.h * spec.fill);
    let filled = p.rocks.length;
    let tries = 0;
    let id = 0;
    while (filled < target && tries < 600) {
      tries += 1;
      const roll = rand();
      const len = roll < spec.long ? 3 : roll < spec.long + 0.5 ? 2 : 1;
      const boat = { id, x: Math.floor(rand() * p.w), y: Math.floor(rand() * p.h), len, dir: DIR_KEYS[Math.floor(rand() * 4)], hue: Math.floor(rand() * 6) };
      if (tryPlace(p, grid, boat)) {
        p.boats.push(boat);
        filled += len;
        id += 1;
      }
    }
    // 고치기: 끝까지 빠지지 않는 배를 뒤집거나(같은 칸 그대로) 바꾸지 못하면 뺀다.
    for (let round = 0; round < 40; round += 1) {
      const removed = new Set();
      let progress = true;
      while (progress) {
        progress = false;
        const g = occupancy(p, removed);
        for (const b of p.boats) {
          if (!removed.has(b.id) && pathStatus(p, removed, b.id, g).free) { removed.add(b.id); progress = true; }
        }
      }
      const stuck = p.boats.filter((b) => !removed.has(b.id));
      if (!stuck.length) break;
      const pick = stuck[Math.floor(rand() * stuck.length)];
      const cells = cellsOf(pick);
      const tail = cells[cells.length - 1];
      if (round < 30 && rand() < 0.7) {
        pick.x = tail.x;
        pick.y = tail.y;
        pick.dir = OPPOSITE[pick.dir];
      } else {
        p.boats = p.boats.filter((b) => b !== pick);
      }
    }
    p.boats.forEach((b, i) => { b.id = i; });
    return p;
  }

  function generate(seed, spec) {
    let best = null;
    let bestDepth = -1;
    for (let k = 0; k < (spec.candidates || 6); k += 1) {
      const p = generateOnce((seed + k * 7919) >>> 0, spec);
      const layers = solve(p);
      if (!layers || p.boats.length < 3) continue;
      if (layers.length > bestDepth) { best = p; bestDepth = layers.length; }
    }
    if (!best) {
      // 거의 일어나지 않지만, 생기면 누구나 풀 수 있는 작은 판으로 대신한다.
      best = { w: spec.w, h: spec.h, rocks: [], seed, boats: [
        { id: 0, x: 0, y: 0, len: 1, dir: 'L', hue: 0 },
        { id: 1, x: 1, y: 0, len: 1, dir: 'L', hue: 1 },
        { id: 2, x: 2, y: 0, len: 1, dir: 'L', hue: 2 },
      ] };
    }
    best.depth = solve(best).length;
    return best;
  }

  // 항해 단계: 판이 커지고 빽빽해지며 바위가 생긴다. 판 폭은 7칸까지(터치 영역 44px 이상 유지).
  function levelSpec(level) {
    const n = Math.max(1, Math.floor(level) || 1);
    const w = Math.min(7, 4 + Math.floor((n + 1) / 3));
    const h = Math.min(9, 5 + Math.floor(n / 3));
    return {
      w, h,
      fill: Math.min(0.86, 0.62 + n * 0.012),
      long: Math.min(0.35, 0.08 + n * 0.015),
      rocks: n < 6 ? 0 : Math.min(4, Math.floor((n - 3) / 4)),
      candidates: 8,
    };
  }

  function levelSeed(level) {
    return hashString(`voyage-${level}`);
  }

  function dateKey(date) {
    const d = date || new Date();
    const pad = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function dailySpec(index) {
    return [
      { w: 5, h: 6, fill: 0.7, long: 0.15, rocks: 0, candidates: 8 },
      { w: 6, h: 8, fill: 0.78, long: 0.25, rocks: 1, candidates: 8 },
      { w: 7, h: 9, fill: 0.84, long: 0.32, rocks: 3, candidates: 10 },
    ][index] || null;
  }

  function dailySeed(key, index) {
    return hashString(`harbor-${key}-${index}`);
  }

  function puzzleFor(ref) {
    if (ref.mode === 'daily') return generate(dailySeed(ref.date, ref.index), dailySpec(ref.index));
    return generate(levelSeed(ref.level), levelSpec(ref.level));
  }

  function starsFor(bumps) {
    return Math.max(1, MAX_LANTERNS - Math.max(0, bumps | 0));
  }

  // 별 3개까지 덜 부딪혀야 하는 횟수(이미 3개면 0).
  function bumpsToThree(bumps) {
    return Math.max(0, Math.max(0, bumps | 0));
  }

  // 한 판 진행. run = { removed: [id], bumps, done, lost }
  function newRun() {
    return { removed: [], bumps: 0, done: false, lost: false };
  }

  function tap(p, run, id) {
    if (run.done || run.lost) return { run, result: 'ignored' };
    if (run.removed.includes(id) || !p.boats.some((b) => b.id === id)) return { run, result: 'ignored' };
    const status = pathStatus(p, new Set(run.removed), id);
    if (status.free) {
      const removed = [...run.removed, id];
      const done = removed.length === p.boats.length;
      return { run: { ...run, removed, done }, result: done ? 'win' : 'sail', dist: status.dist };
    }
    const bumps = run.bumps + 1;
    const lost = bumps >= MAX_LANTERNS;
    return { run: { ...run, bumps, lost }, result: lost ? 'lose' : 'bump', dist: status.dist, hit: status.hit };
  }

  function newState() {
    return { v: SAVE_VERSION, level: 1, best: {}, daily: {}, sailed: 0, current: null };
  }

  const isInt = (v) => Number.isInteger(v);

  // 저장값이 깨지거나 손으로 고쳐져도 앱이 열리도록 다듬는다.
  function sanitize(raw) {
    const s = newState();
    if (!raw || typeof raw !== 'object') return s;
    if (isInt(raw.level) && raw.level >= 1 && raw.level <= 9999) s.level = raw.level;
    if (isInt(raw.sailed) && raw.sailed >= 0) s.sailed = raw.sailed;
    if (raw.best && typeof raw.best === 'object') {
      for (const [k, v] of Object.entries(raw.best)) {
        if (/^\d+$/.test(k) && isInt(v) && v >= 1 && v <= 3) s.best[k] = v;
      }
    }
    if (raw.daily && typeof raw.daily === 'object') {
      for (const [k, v] of Object.entries(raw.daily)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(v) && v.length === DAILY_COUNT) {
          s.daily[k] = v.map((x) => (isInt(x) && x >= 0 && x <= 3 ? x : 0));
        }
      }
    }
    const c = raw.current;
    if (c && typeof c === 'object' && c.run && Array.isArray(c.run.removed)) {
      const ref = c.mode === 'daily'
        ? (/^\d{4}-\d{2}-\d{2}$/.test(c.date) && isInt(c.index) && c.index >= 0 && c.index < DAILY_COUNT ? { mode: 'daily', date: c.date, index: c.index } : null)
        : (isInt(c.level) && c.level >= 1 && c.level <= s.level ? { mode: 'voyage', level: c.level } : null);
      if (ref) {
        const bumps = isInt(c.run.bumps) && c.run.bumps >= 0 && c.run.bumps < MAX_LANTERNS ? c.run.bumps : 0;
        const removed = [...new Set(c.run.removed.filter((x) => isInt(x) && x >= 0 && x < 200))];
        s.current = { ...ref, run: { removed, bumps, done: false, lost: false } };
      }
    }
    return s;
  }

  // 판을 마쳤을 때 기록을 남긴다. 기록은 좋아지기만 한다.
  function recordWin(state, ref, bumps) {
    const s = { ...state, best: { ...state.best }, daily: { ...state.daily } };
    const stars = starsFor(bumps);
    if (ref.mode === 'daily') {
      const row = (s.daily[ref.date] || [0, 0, 0]).slice();
      row[ref.index] = Math.max(row[ref.index] || 0, stars);
      s.daily[ref.date] = row;
    } else {
      s.best[ref.level] = Math.max(s.best[ref.level] || 0, stars);
      if (ref.level === s.level) s.level += 1;
    }
    return s;
  }

  function totalStars(state) {
    let n = 0;
    for (const v of Object.values(state.best)) n += v;
    for (const row of Object.values(state.daily)) for (const v of row) n += v;
    return n;
  }

  // 도장첩: 오늘의 포구 세 판을 모두 띄운 날 수
  function stampDays(state) {
    return Object.values(state.daily).filter((row) => row.every((v) => v > 0)).length;
  }

  const logic = {
    bumpsToThree,
    DIRS, MAX_LANTERNS, DAILY_COUNT,
    rng, hashString, cellsOf, occupancy, pathStatus, boatAt, solve, freeBoats,
    generate, levelSpec, levelSeed, dateKey, dailySpec, dailySeed, puzzleFor,
    starsFor, newRun, tap, newState, sanitize, recordWin, totalStars, stampDays,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
