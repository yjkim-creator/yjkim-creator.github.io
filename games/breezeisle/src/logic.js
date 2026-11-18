// 산들섬 정원 규칙. DOM 없이 브라우저와 node 테스트가 같은 코드를 읽는다.
// 6x6 섬 칸에 손에 든 조각을 놓는다. 같은 것이 셋 이상 이어지면 놓은 칸에서 한 단계 위로 합쳐진다.
// 갈매기는 매 차례 빈 칸으로 한 걸음 걷고, 무리째 갇히면 조개가 된다. 조개도 셋이면 진주, 진주 셋이면 보물상자.
(function (root) {
  const N = 6;
  const CELLS = N * N;
  const GARDEN = ['sprout', 'bush', 'tree', 'hut', 'house', 'mill', 'lighthouse', 'tower'];
  const SEA = ['shell', 'pearl', 'chest'];
  const SPECIAL = ['gull', 'wind', 'rainbow'];
  const ITEMS = GARDEN.concat(SEA);
  const PIECES = ITEMS.concat(SPECIAL);
  // 합쳐서 그 단계가 생길 때 얻는 점수.
  const POINTS = { bush: 10, tree: 40, hut: 150, house: 500, mill: 1500, lighthouse: 5000, tower: 15000, pearl: 60, chest: 400 };
  const FESTIVAL = 50000; // 별탑 셋이 모이면 섬 축제: 모두 비우고 큰 점수.
  // 손에 오는 조각의 비율(합 100).
  const DRAW = [['sprout', 58], ['bush', 18], ['tree', 4], ['hut', 1], ['gull', 12], ['wind', 4], ['rainbow', 3]];

  function nextOf(kind) {
    let i = GARDEN.indexOf(kind);
    if (i >= 0) return i < GARDEN.length - 1 ? GARDEN[i + 1] : null;
    i = SEA.indexOf(kind);
    if (i >= 0) return i < SEA.length - 1 ? SEA[i + 1] : null;
    return null;
  }

  // ---------- 난수: 상태를 숫자 하나로 들고 다녀 저장과 재현이 쉽다 ----------
  function rand(run) {
    let t = (run.rng = (run.rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hashSeed(text) {
    let h = 2166136261;
    for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h >>> 0;
  }
  function draw(run) {
    let x = rand(run) * 100;
    for (const [kind, weight] of DRAW) {
      x -= weight;
      if (x < 0) return kind;
    }
    return 'sprout';
  }

  function neighbors(i) {
    const r = Math.floor(i / N);
    const c = i % N;
    const out = [];
    if (r > 0) out.push(i - N);
    if (r < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1);
    if (c < N - 1) out.push(i + 1);
    return out;
  }

  function group(board, i, kind) {
    const seen = new Set([i]);
    const stack = [i];
    while (stack.length) {
      const cur = stack.pop();
      for (const n of neighbors(cur)) {
        if (!seen.has(n) && board[n] === kind) { seen.add(n); stack.push(n); }
      }
    }
    return [...seen];
  }

  function clone(run) {
    return { ...run, board: run.board.slice(), made: { ...run.made } };
  }

  function empties(board) {
    const out = [];
    for (let i = 0; i < CELLS; i += 1) if (!board[i]) out.push(i);
    return out;
  }

  // 놓은 칸 i의 kind에서 시작해 이어지는 합치기를 끝까지 한다. events에 기록한다.
  function resolve(run, i, kind, events) {
    run.board[i] = kind;
    for (;;) {
      const g = group(run.board, i, kind);
      if (g.length < 3) break;
      const extra = g.length - 3;
      if (kind === 'tower') {
        for (const cell of g) run.board[cell] = null;
        const pts = FESTIVAL * (1 + extra);
        run.score += pts;
        run.festivals = (run.festivals || 0) + 1;
        events.push({ type: 'festival', cells: g, at: i, pts });
        break;
      }
      const up = nextOf(kind);
      if (!up) break; // 보물상자는 더 합쳐지지 않는다.
      for (const cell of g) if (cell !== i) run.board[cell] = null;
      run.board[i] = up;
      const pts = POINTS[up] + Math.round(POINTS[up] * 0.5 * extra);
      run.score += pts;
      run.made[up] = (run.made[up] || 0) + 1;
      events.push({ type: 'merge', from: g.filter((c) => c !== i), at: i, kind: up, pts });
      kind = up;
    }
  }

  // 무지개 씨앗: 이웃과 합쳐서 가장 높이 올라가는 것으로 변한다. 아무것도 안 되면 새싹.
  function rainbowKind(run, i) {
    let best = null;
    let bestRank = -1;
    const kinds = new Set(neighbors(i).map((n) => run.board[n]).filter((k) => k && ITEMS.includes(k)));
    for (const kind of kinds) {
      const trial = clone(run);
      const ev = [];
      resolve(trial, i, kind, ev);
      if (!ev.length) continue;
      const rank = trial.score - run.score;
      if (rank > bestRank) { bestRank = rank; best = kind; }
    }
    return best || 'sprout';
  }

  // 갈매기: 무리(이어진 갈매기)가 빈 칸에 닿지 않으면 모두 조개가 된다. 아니면 각자 한 걸음.
  function moveGulls(run, events) {
    const done = new Set();
    for (let i = 0; i < CELLS; i += 1) {
      if (run.board[i] !== 'gull' || done.has(i)) continue;
      const g = group(run.board, i, 'gull');
      g.forEach((c) => done.add(c));
      const free = g.some((c) => neighbors(c).some((n) => !run.board[n]));
      if (!free) {
        g.sort((a, b) => a - b);
        for (const c of g) run.board[c] = 'shell';
        run.made.shell = (run.made.shell || 0) + g.length;
        run.score += 5 * g.length;
        events.push({ type: 'trap', cells: g.slice() });
        resolve(run, g[g.length - 1], 'shell', events);
      }
    }
    const moved = new Set();
    for (let i = 0; i < CELLS; i += 1) {
      if (run.board[i] !== 'gull' || moved.has(i)) continue;
      const open = neighbors(i).filter((n) => !run.board[n]);
      if (!open.length) continue;
      const to = open[Math.floor(rand(run) * open.length)];
      run.board[i] = null;
      run.board[to] = 'gull';
      moved.add(to);
      events.push({ type: 'hop', from: i, to });
    }
  }

  function canPlace(run, i, kind = run.cur) {
    if (run.over || i < 0 || i >= CELLS) return false;
    if (kind === 'wind') return Boolean(run.board[i]);
    return !run.board[i];
  }

  function fixHand(run) {
    // 섬이 비어 바람이 쓸 곳이 없으면 새싹으로 바꿔 판이 멈추지 않게 한다.
    if (run.cur === 'wind' && !run.board.some(Boolean)) run.cur = 'sprout';
  }

  // 한 차례: 손에 든 조각을 i에 놓는다. { run, events }를 돌려준다. 놓을 수 없으면 events가 빈 배열.
  function place(prev, i) {
    if (!canPlace(prev, i)) return { run: prev, events: [] };
    const run = clone(prev);
    const events = [];
    const kind = run.cur;
    if (kind === 'wind') {
      events.push({ type: 'blow', at: i, kind: run.board[i] });
      run.board[i] = null;
    } else if (kind === 'gull') {
      run.board[i] = 'gull';
      events.push({ type: 'place', at: i, kind });
    } else {
      const real = kind === 'rainbow' ? rainbowKind(run, i) : kind;
      events.push({ type: 'place', at: i, kind: real, rainbow: kind === 'rainbow' });
      run.made[real] = (run.made[real] || 0) + 1;
      resolve(run, i, real, events);
    }
    moveGulls(run, events);
    run.turn += 1;
    run.cur = run.next;
    run.next = draw(run);
    fixHand(run);
    if (!empties(run.board).length) {
      run.over = true;
      events.push({ type: 'over' });
    }
    return { run, events };
  }

  // 주머니와 손 바꾸기. 주머니가 비었으면 손의 것을 넣고 다음 조각을 든다. 차례는 지나지 않는다.
  function swap(prev) {
    if (prev.over || prev.store === prev.cur) return prev;
    const run = clone(prev);
    if (run.store) [run.store, run.cur] = [run.cur, run.store];
    else {
      run.store = run.cur;
      run.cur = run.next;
      run.next = draw(run);
    }
    fixHand(run);
    return run;
  }

  function newRun({ seed = 1, mode = 'free', date = '' } = {}) {
    const run = { v: 1, mode, date, seed: seed >>> 0, rng: seed >>> 0, board: new Array(CELLS).fill(null), cur: 'sprout', next: 'sprout', store: null, score: 0, turn: 0, over: false, made: {}, festivals: 0 };
    // 처음 섬: 합쳐지지 않게 몇 가지를 흩어 둔다.
    const starts = ['sprout', 'sprout', 'bush', 'sprout', 'tree', 'bush', 'gull'];
    for (const kind of starts) {
      for (let tries = 0; tries < 40; tries += 1) {
        const i = Math.floor(rand(run) * CELLS);
        if (run.board[i]) continue;
        run.board[i] = kind;
        if (kind !== 'gull' && group(run.board, i, kind).length >= 2) { run.board[i] = null; continue; }
        break;
      }
    }
    run.cur = draw(run);
    if (run.cur === 'wind' || run.cur === 'gull') run.cur = 'sprout'; // 첫 조각은 바로 놓아 볼 수 있는 새싹 쪽으로.
    run.next = draw(run);
    return run;
  }

  function dailyRun(date) {
    return newRun({ seed: hashSeed(`breezeisle:${date}`), mode: 'daily', date });
  }

  // ---------- 판 평가와 봇(시연과 난이도 확인용) ----------
  function evaluate(run) {
    if (run.over) return run.score - 100000;
    let v = run.score;
    const b = run.board;
    let free = 0;
    for (let i = 0; i < CELLS; i += 1) {
      const k = b[i];
      if (!k) { free += 1; continue; }
      if (k === 'gull') continue;
      for (const n of neighbors(i)) if (n > i && b[n] === k) v += 6 + (POINTS[nextOf(k)] || 0) * 0.05;
      const r = Math.floor(i / N);
      const c = i % N;
      // 높은 단계는 가장자리로 밀어 가운데를 비워 둔다.
      const tier = GARDEN.indexOf(k);
      if (tier >= 3 && (r === 0 || r === N - 1 || c === 0 || c === N - 1)) v += tier;
    }
    v += free * (free < 8 ? 14 : 4);
    return v;
  }

  function bestMove(run) {
    if (run.over) return null;
    let best = null;
    const tryHand = (state, swapped) => {
      for (let i = 0; i < CELLS; i += 1) {
        if (!canPlace(state, i)) continue;
        const after = place(state, i).run;
        let v = evaluate(after);
        if (state.cur === 'wind') v -= 30 + (GARDEN.indexOf(state.board[i]) + 1) * 40; // 바람은 아껴 쓴다.
        if (state.board[i] === 'gull' && state.cur === 'wind') v += 60;
        if (swapped) v -= 2;
        v -= (Math.abs((i % N) - 2.5) + Math.abs(Math.floor(i / N) - 2.5)) * 0.4; // 비기면 가운데 쪽.
        if (!best || v > best.value) best = { swap: swapped, cell: i, value: v };
      }
    };
    tryHand(run, false);
    const swapped = swap(run);
    if (swapped !== run) tryHand(swapped, true);
    return best;
  }

  function playMove(run, move) {
    let state = run;
    if (move.swap) state = swap(state);
    return place(state, move.cell);
  }

  // ---------- 저장값 ----------
  function sanitizeRun(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!Array.isArray(raw.board) || raw.board.length !== CELLS) return null;
    const board = raw.board.map((k) => (ITEMS.includes(k) || k === 'gull' ? k : null));
    const hand = (k) => (PIECES.includes(k) ? k : 'sprout');
    const num = (x) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.floor(Number(x)) : 0);
    const made = {};
    if (raw.made && typeof raw.made === 'object') for (const k of PIECES) if (raw.made[k]) made[k] = num(raw.made[k]);
    const run = {
      v: 1,
      mode: raw.mode === 'daily' ? 'daily' : 'free',
      date: typeof raw.date === 'string' ? raw.date.slice(0, 10) : '',
      seed: num(raw.seed) >>> 0,
      rng: num(raw.rng) >>> 0,
      board,
      cur: hand(raw.cur),
      next: hand(raw.next),
      store: raw.store && PIECES.includes(raw.store) ? raw.store : null,
      score: num(raw.score),
      turn: num(raw.turn),
      over: false,
      made,
      festivals: num(raw.festivals),
    };
    fixHand(run);
    run.over = !empties(board).length;
    return run;
  }

  function newSave() {
    return { v: 1, mode: 'daily', daily: null, free: null, best: 0, days: {}, codex: {}, plays: 0 };
  }

  function sanitizeSave(raw) {
    const s = newSave();
    if (!raw || typeof raw !== 'object') return s;
    s.mode = raw.mode === 'free' ? 'free' : 'daily';
    s.daily = sanitizeRun(raw.daily);
    s.free = sanitizeRun(raw.free);
    if (s.daily && s.daily.mode !== 'daily') s.daily = null;
    s.best = Number.isFinite(Number(raw.best)) && Number(raw.best) > 0 ? Math.floor(Number(raw.best)) : 0;
    if (raw.days && typeof raw.days === 'object') {
      for (const [d, v] of Object.entries(raw.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Number(v)) && Number(v) >= 0) s.days[d] = Math.floor(Number(v));
      }
    }
    if (raw.codex && typeof raw.codex === 'object') for (const k of ITEMS) if (raw.codex[k]) s.codex[k] = true;
    s.plays = Number.isFinite(Number(raw.plays)) && Number(raw.plays) > 0 ? Math.floor(Number(raw.plays)) : 0;
    return s;
  }

  // 판의 기록을 저장에 반영한다(도감, 최고 점수, 오늘의 섬 점수).
  function record(save, run) {
    const s = { ...save, days: { ...save.days }, codex: { ...save.codex } };
    for (const k of ITEMS) if (run.made[k] || run.board.includes(k)) s.codex[k] = true;
    if (run.mode === 'daily' && run.date) s.days[run.date] = Math.max(s.days[run.date] || 0, run.score);
    else s.best = Math.max(s.best, run.score);
    return s;
  }

  function dateKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  const logic = {
    N, CELLS, GARDEN, SEA, SPECIAL, ITEMS, PIECES, POINTS, FESTIVAL, DRAW,
    nextOf, neighbors, group, empties, hashSeed, canPlace, place, swap, newRun, dailyRun,
    evaluate, bestMove, playMove, sanitizeRun, sanitizeSave, newSave, record, dateKey,
  };
  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
