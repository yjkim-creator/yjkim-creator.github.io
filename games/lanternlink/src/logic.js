// 등불 골목 규칙. DOM 없이 쓰고, 브라우저와 node 테스트가 같은 코드를 읽는다.
// 칸마다 전선 방향을 비트로 적는다: 북 1, 동 2, 남 4, 서 8.
(function (root) {
  const N = 1; const E = 2; const S = 4; const W = 8;
  const DIRS = [N, E, S, W];
  const STEP = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] };
  const OPP = { 1: S, 2: W, 4: N, 8: E };
  const DAILY_SIZES = [[4, 5], [5, 6], [6, 7]];
  const MAX_W = 6; const MAX_H = 8;

  // 시계 방향으로 한 번 돌린다.
  const turn = (mask) => ((mask << 1) | (mask >> 3)) & 15;
  function turnBy(mask, k) {
    let m = mask;
    for (let i = 0; i < ((k % 4) + 4) % 4; i += 1) m = turn(m);
    return m;
  }
  // from을 몇 번 돌려야 to가 되는지. 될 수 없으면 -1.
  function turnsTo(from, to) {
    for (let k = 0; k < 4; k += 1) if (turnBy(from, k) === to) return k;
    return -1;
  }
  const bits = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

  function hashText(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function neighbour(w, h, i, dir) {
    const x = (i % w) + STEP[dir][0];
    const y = Math.floor(i / w) + STEP[dir][1];
    if (x < 0 || y < 0 || x >= w || y >= h) return -1;
    return y * w + x;
  }

  // 발전기에서 퍼지는 나무 모양 전선망을 만든다. 십자 갈림길은 막혔을 때만 쓴다.
  function growTree(rand, w, h, src) {
    const sol = new Array(w * h).fill(0);
    const inTree = new Array(w * h).fill(false);
    inTree[src] = true;
    let left = w * h - 1;
    while (left > 0) {
      const edges = [];
      const crowded = [];
      for (let i = 0; i < w * h; i += 1) {
        if (!inTree[i]) continue;
        for (const d of DIRS) {
          const j = neighbour(w, h, i, d);
          if (j < 0 || inTree[j]) continue;
          (bits(sol[i]) >= 3 ? crowded : edges).push([i, j, d]);
        }
      }
      const pool = edges.length ? edges : crowded;
      const [i, j, d] = pool[Math.floor(rand() * pool.length)];
      sol[i] |= d;
      sol[j] |= OPP[d];
      inTree[j] = true;
      left -= 1;
    }
    return sol;
  }

  function makeBoard(seed, w, h) {
    const rand = rng(seed);
    const src = Math.floor(h / 2) * w + Math.floor((w - 1) / 2);
    const sol = growTree(rand, w, h, src);
    let cur;
    let par;
    for (let tries = 0; ; tries += 1) {
      // 발전기 칸은 돌릴 수 없으므로 정답 방향으로 둔다.
      cur = sol.map((m, i) => (i === src ? m : turnBy(m, Math.floor(rand() * 4))));
      par = cur.reduce((sum, m, i) => sum + turnsTo(m, sol[i]), 0);
      if ((par >= w * h * 0.6 && !isSolved({ w, h, src, cur })) || tries > 40) break;
    }
    // 마지막 보루: 이미 풀린 판이면 발전기 옆 칸 하나를 돌려 둔다.
    if (isSolved({ w, h, src, cur })) {
      const k = cur.findIndex((m, i) => i !== src && turn(m) !== m);
      cur[k] = turn(cur[k]);
      par = cur.reduce((sum, m, i) => sum + turnsTo(m, sol[i]), 0);
    }
    return { w, h, src, sol, start: cur.slice(), cur, par, moves: 0, done: false, stars: 0 };
  }

  function isLantern(board, i) {
    return i !== board.src && bits(board.sol ? board.sol[i] : board.cur[i]) === 1;
  }

  // 발전기에서 서로 맞물린 전선을 따라 닿는 칸들.
  function litCells(board) {
    const { w, h, src, cur } = board;
    const lit = new Array(w * h).fill(false);
    const queue = [src];
    lit[src] = true;
    while (queue.length) {
      const i = queue.pop();
      for (const d of DIRS) {
        if (!(cur[i] & d)) continue;
        const j = neighbour(w, h, i, d);
        if (j < 0 || lit[j] || !(cur[j] & OPP[d])) continue;
        lit[j] = true;
        queue.push(j);
      }
    }
    return lit;
  }

  // 짝 없이 허공이나 벽을 향한 전선 끝의 수.
  function looseEnds(board) {
    const { w, h, cur } = board;
    let count = 0;
    for (let i = 0; i < w * h; i += 1) {
      for (const d of DIRS) {
        if (!(cur[i] & d)) continue;
        const j = neighbour(w, h, i, d);
        if (j < 0 || !(cur[j] & OPP[d])) count += 1;
      }
    }
    return count;
  }

  function isSolved(board) {
    return litCells(board).every(Boolean) && looseEnds(board) === 0;
  }

  function starsFor(moves, par) {
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.5)) return 2;
    return 1;
  }

  function rotate(board, i) {
    if (board.done || i < 0 || i >= board.cur.length || i === board.src) return board;
    const cur = board.cur.slice();
    cur[i] = turn(cur[i]);
    const next = { ...board, cur, moves: board.moves + 1 };
    if (isSolved(next)) {
      next.done = true;
      next.stars = starsFor(next.moves, next.par);
    }
    return next;
  }

  function restart(board) {
    return { ...board, cur: board.start.slice(), moves: 0, done: false, stars: 0 };
  }

  function lanternCount(board) {
    let n = 0;
    for (let i = 0; i < board.cur.length; i += 1) if (isLantern(board, i)) n += 1;
    return n;
  }
  function litLanterns(board) {
    const lit = litCells(board);
    let n = 0;
    for (let i = 0; i < board.cur.length; i += 1) if (lit[i] && isLantern(board, i)) n += 1;
    return n;
  }

  function dailyBoards(date) {
    return DAILY_SIZES.map(([w, h], k) => makeBoard(hashText(`alley:${date}:${k}`), w, h));
  }

  // 자유 골목은 단계마다 조금씩 넓어진다. 6x8에서 멈춘다.
  function freeSize(level) {
    const n = Math.max(1, Math.floor(level));
    const w = Math.min(MAX_W, 4 + Math.floor((n - 1) / 5));
    const h = Math.min(MAX_H, w + 1 + Math.floor(((n - 1) % 5) / 3));
    return [w, h];
  }
  function freeBoard(level) {
    const [w, h] = freeSize(level);
    return makeBoard(hashText(`free:${level}`), w, h);
  }

  function dateKey(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function shiftDay(key, delta) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + delta));
  }

  // 오늘(또는 어제)까지 세 판을 모두 밝힌 날이 며칠 이어지는지.
  function streak(days, today) {
    let key = days[today] ? today : shiftDay(today, -1);
    let n = 0;
    while (days[key]) {
      n += 1;
      key = shiftDay(key, -1);
    }
    return n;
  }

  function newState(today) {
    const date = today || dateKey(new Date());
    return {
      v: 1,
      day: { date, at: 0, boards: dailyBoards(date) },
      free: { level: 1, board: freeBoard(1) },
      days: {},
      cleared: 0,
      sound: true,
    };
  }

  // 판을 기록에서 되살린다. 숫자가 틀렸거나 전선이 원래 모양을 돌린 것이 아니면 null.
  function cleanBoard(raw, fresh) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.cur) || raw.cur.length !== fresh.sol.length) return null;
    if (raw.w !== fresh.w || raw.h !== fresh.h) return null;
    const ok = raw.cur.every((m, i) => Number.isInteger(m) && turnsTo(m, fresh.sol[i]) >= 0);
    if (!ok) return null;
    const moves = Number.isInteger(raw.moves) && raw.moves >= 0 ? Math.min(raw.moves, 99999) : 0;
    const board = { ...fresh, cur: raw.cur.slice(), moves, done: false, stars: 0 };
    if (isSolved(board)) {
      board.done = true;
      board.stars = [1, 2, 3].includes(raw.stars) ? raw.stars : starsFor(moves, board.par);
    }
    return board;
  }

  function sanitize(raw, today) {
    const fresh = newState(today);
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return fresh;
    const state = fresh;
    if (raw.days && typeof raw.days === 'object') {
      for (const [k, v] of Object.entries(raw.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 9) state.days[k] = v;
      }
    }
    if (raw.day && raw.day.date === state.day.date && Array.isArray(raw.day.boards)) {
      state.day.boards = state.day.boards.map((b, k) => cleanBoard(raw.day.boards[k], b) || b);
      if (Number.isInteger(raw.day.at) && raw.day.at >= 0 && raw.day.at < 3) state.day.at = raw.day.at;
    }
    if (raw.free && Number.isInteger(raw.free.level) && raw.free.level >= 1 && raw.free.level < 100000) {
      state.free.level = raw.free.level;
      const fb = freeBoard(raw.free.level);
      state.free.board = cleanBoard(raw.free.board, fb) || fb;
    }
    if (Number.isInteger(raw.cleared) && raw.cleared >= 0) state.cleared = raw.cleared;
    state.sound = raw.sound !== false;
    return state;
  }

  // 오늘의 판 하나를 돌린다. 세 판을 다 밝히면 그날의 별을 기록한다.
  function playDaily(state, i) {
    const k = state.day.at;
    const before = state.day.boards[k];
    const after = rotate(before, i);
    if (after === before) return state;
    const boards = state.day.boards.slice();
    boards[k] = after;
    const next = { ...state, day: { ...state.day, boards } };
    if (after.done) {
      next.cleared = state.cleared + 1;
      if (boards.every((b) => b.done)) {
        next.days = { ...state.days, [state.day.date]: boards.reduce((s, b) => s + b.stars, 0) };
      }
    }
    return next;
  }

  function playFree(state, i) {
    const before = state.free.board;
    const after = rotate(before, i);
    if (after === before) return state;
    return { ...state, free: { ...state.free, board: after }, cleared: state.cleared + (after.done ? 1 : 0) };
  }

  function nextFree(state) {
    if (!state.free.board.done) return state;
    const level = state.free.level + 1;
    return { ...state, free: { level, board: freeBoard(level) } };
  }

  // 날짜가 바뀌었으면 새 골목 세 판을 깐다.
  function rollDay(state, today) {
    if (state.day.date === today) return state;
    return { ...state, day: { date: today, at: 0, boards: dailyBoards(today) } };
  }

  const logic = {
    N, E, S, W, DIRS, OPP, MAX_W, MAX_H, DAILY_SIZES,
    turn, turnBy, turnsTo, bits, hashText, rng, neighbour,
    makeBoard, isLantern, litCells, looseEnds, isSolved, starsFor, rotate, restart,
    lanternCount, litLanterns, dailyBoards, freeSize, freeBoard,
    dateKey, shiftDay, streak, newState, sanitize, playDaily, playFree, nextFree, rollDay,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
