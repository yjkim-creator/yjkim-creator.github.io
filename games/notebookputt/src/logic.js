// 공책 골프의 규칙: 코스 생성, 공 물리, 타수와 기록. DOM 없이 브라우저와 node 테스트가 함께 쓴다.
// 좌표 단위는 모눈 한 칸이다. 코스는 W x H 칸이고 바깥 테두리는 항상 벽이다.
(function (root) {
  const W = 9;
  const H = 15;
  const TILE = { WALL: 0, FLOOR: 1, SAND: 2, WATER: 3, BUMPER: 4 };
  const BALL_R = 0.26;
  const CUP_R = 0.42;
  const BUMPER_R = 0.36;
  const MAX_SPEED = 17;
  const MIN_SPEED = 1.4;
  const CUP_SPEED = 8; // 이보다 빠르면 컵 위를 지나친다.
  const DT = 1 / 120;
  const SUB = 4;
  const STROKE_CAP = 8; // 이 타수까지 못 넣으면 공을 집어 들고 다음 홀로 간다.
  const HOLES_PER_DAY = 6;
  const MAX_STEPS = 120 * 20; // 한 번 친 공은 20초 안에 반드시 멈춘다.

  function hashString(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
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

  // ---------- 코스 ----------

  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const tileOf = (hole, cx, cy) => (inside(cx, cy) ? hole.grid[cy * W + cx] : TILE.WALL);
  const tileAt = (hole, x, y) => tileOf(hole, Math.floor(x), Math.floor(y));
  const solid = (t) => t === TILE.WALL;
  const walkable = (t) => t === TILE.FLOOR || t === TILE.SAND;

  // 길은 2x2 칸 덩어리를 이어 파서 만든다. 길 위에는 벽, 물, 범퍼를 두지 않으므로
  // 공이 지나갈 폭 2칸짜리 통로가 티에서 컵까지 언제나 열려 있다.
  function generateHole(seed, tier) {
    const r = rng(seed);
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const grid = new Array(W * H).fill(TILE.WALL);
    const onPath = new Array(W * H).fill(false);
    const level = Math.max(0, Math.min(9, tier | 0));

    const carve = (x, y, path) => {
      if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return;
      grid[y * W + x] = TILE.FLOOR;
      if (path) onPath[y * W + x] = true;
    };
    const block = (x, y) => {
      carve(x, y, true); carve(x + 1, y, true); carve(x, y + 1, true); carve(x + 1, y + 1, true);
    };

    const legs = Math.min(4, 1 + Math.floor(level / 3) + ri(0, 1));
    const points = [{ x: ri(1, W - 3), y: H - 3 }];
    for (let i = 1; i <= legs; i += 1) {
      const last = i === legs;
      const span = (H - 4) / legs;
      const y = last ? ri(1, 2) : Math.max(2, Math.round(H - 3 - span * i + ri(-1, 1)));
      const prev = points[i - 1];
      let x = ri(1, W - 3);
      for (let tries = 0; tries < 6 && Math.abs(x - prev.x) < 2; tries += 1) x = ri(1, W - 3);
      points.push({ x, y });
    }

    let turns = 0;
    let lastDir = null;
    const go = (dir) => {
      if (lastDir && dir !== lastDir) turns += 1;
      lastDir = dir;
    };
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      block(p.x, p.y);
      if (i === 0) continue;
      const a = points[i - 1];
      const horizontalFirst = r() < 0.5;
      const moveX = (y) => {
        if (a.x === p.x) return;
        go('h');
        for (let x = Math.min(a.x, p.x); x <= Math.max(a.x, p.x); x += 1) block(x, y);
      };
      const moveY = (x) => {
        if (a.y === p.y) return;
        go('v');
        for (let y = Math.min(a.y, p.y); y <= Math.max(a.y, p.y); y += 1) block(x, y);
      };
      if (horizontalFirst) { moveX(a.y); moveY(p.x); } else { moveY(a.x); moveX(p.y); }
    }

    // 길 옆에 붙은 빈터. 물웅덩이와 범퍼는 여기에만 놓인다.
    const pathCells = [];
    onPath.forEach((v, i) => { if (v) pathCells.push(i); });
    const rooms = ri(1, 2) + Math.floor(level / 3);
    for (let n = 0; n < rooms; n += 1) {
      const base = pathCells[ri(0, pathCells.length - 1)];
      const bx = (base % W) + ri(-3, 2);
      const by = Math.floor(base / W) + ri(-3, 2);
      const w = ri(2, 3);
      const h = ri(2, 3);
      for (let y = by; y < by + h; y += 1) for (let x = bx; x < bx + w; x += 1) carve(x, y, false);
    }

    const spare = [];
    grid.forEach((t, i) => { if (t === TILE.FLOOR && !onPath[i]) spare.push(i); });
    const waterChance = Math.min(0.75, 0.15 + level * 0.08);
    const bumpers = [];
    for (const i of spare) {
      const roll = r();
      if (roll < waterChance) grid[i] = TILE.WATER;
      else if (roll < waterChance + 0.12 && bumpers.length < 3) {
        grid[i] = TILE.BUMPER;
        bumpers.push({ x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 });
      }
    }

    const sandPatches = level >= 1 ? ri(0, 1 + Math.floor(level / 3)) : 0;
    for (let n = 0; n < sandPatches; n += 1) {
      const start = pathCells[ri(0, pathCells.length - 1)];
      const sx = start % W;
      const sy = Math.floor(start / W);
      for (let y = sy; y < sy + 2; y += 1) {
        for (let x = sx; x < sx + 2; x += 1) if (inside(x, y) && onPath[y * W + x]) grid[y * W + x] = TILE.SAND;
      }
    }

    const tee = { x: points[0].x + 1, y: points[0].y + 1 };
    const end = points[points.length - 1];
    const cup = { x: end.x + 1, y: end.y + 1 };
    // 티와 컵 둘레 네 칸은 깨끗한 바닥으로 둔다.
    for (const p of [tee, cup]) {
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) grid[(p.y + dy) * W + p.x + dx] = TILE.FLOOR;
    }
    const hole = { grid, tee, cup, par: 3, bumpers, turns, seed: seed >>> 0, tier: level };
    // 파는 단순한 봇이 실제로 쳐 본 타수로 정한다. 사람은 벽을 맞혀 더 줄일 수 있다.
    const bot = playHoleWithBot(hole, 6);
    hole.par = Math.max(2, Math.min(5, bot === null ? 5 : bot));
    return hole;
  }

  function dailyHole(date, index) {
    return generateHole(hashString(`daily:${date}:${index}`), Math.min(9, index + 1));
  }

  function ladderHole(level) {
    return generateHole(hashString(`ladder:${level}`), Math.min(9, Math.floor(level / 3)));
  }

  // ---------- 물리 ----------

  function newBall(x, y) {
    return { x, y, vx: 0, vy: 0 };
  }

  function speedFor(power) {
    const p = Math.max(0, Math.min(1, power));
    return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * p;
  }

  function launch(ball, angle, power) {
    const s = speedFor(power);
    return { x: ball.x, y: ball.y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s };
  }

  function friction(tile, speed) {
    return tile === TILE.SAND ? 9 + 2.4 * speed : 2.2 + 0.55 * speed;
  }

  // 공을 DT만큼 움직인다. 결과: 'roll' | 'stop' | 'cup' | 'water'. events에 부딪힘을 넣는다.
  function step(hole, ball, events) {
    const h = DT / SUB;
    for (let s = 0; s < SUB; s += 1) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed === 0) return 'stop';
      const next = Math.max(0, speed - friction(tileAt(hole, ball.x, ball.y), speed) * h);
      ball.vx *= next / speed;
      ball.vy *= next / speed;
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      collideWalls(hole, ball, events);
      collideBumpers(hole, ball, events);

      const dc = Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y);
      if (dc < CUP_R) {
        if (next < CUP_SPEED && dc < CUP_R - BALL_R * 0.4) {
          ball.x = hole.cup.x; ball.y = hole.cup.y; ball.vx = 0; ball.vy = 0;
          return 'cup';
        }
        if (next < CUP_SPEED) {
          // 컵 가장자리에서는 살짝 안쪽으로 끌린다.
          ball.vx += ((hole.cup.x - ball.x) / dc) * 6 * h;
          ball.vy += ((hole.cup.y - ball.y) / dc) * 6 * h;
        }
      }
      if (tileAt(hole, ball.x, ball.y) === TILE.WATER) return 'water';
      if (next < 0.06) { ball.vx = 0; ball.vy = 0; return 'stop'; }
    }
    return 'roll';
  }

  function collideWalls(hole, ball, events) {
    const R = BALL_R;
    for (let cy = Math.floor(ball.y - R); cy <= Math.floor(ball.y + R); cy += 1) {
      for (let cx = Math.floor(ball.x - R); cx <= Math.floor(ball.x + R); cx += 1) {
        if (!solid(tileOf(hole, cx, cy))) continue;
        const px = Math.max(cx, Math.min(ball.x, cx + 1));
        const py = Math.max(cy, Math.min(ball.y, cy + 1));
        let dx = ball.x - px;
        let dy = ball.y - py;
        let d = Math.hypot(dx, dy);
        if (d >= R) continue;
        if (d === 0) { // 중심이 벽 안에 들어간 드문 경우: 칸 중심의 반대쪽으로 민다.
          dx = ball.x - (cx + 0.5); dy = ball.y - (cy + 0.5); d = Math.hypot(dx, dy) || 1;
        }
        const nx = dx / d;
        const ny = dy / d;
        ball.x = px + nx * R;
        ball.y = py + ny * R;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= 1.72 * vn * nx;
          ball.vy -= 1.72 * vn * ny;
          if (events && -vn > 1) events.push({ type: 'wall', speed: -vn });
        }
      }
    }
  }

  function collideBumpers(hole, ball, events) {
    for (const b of hole.bumpers) {
      const dx = ball.x - b.x;
      const dy = ball.y - b.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      if (d >= BALL_R + BUMPER_R) continue;
      const nx = dx / d;
      const ny = dy / d;
      ball.x = b.x + nx * (BALL_R + BUMPER_R);
      ball.y = b.y + ny * (BALL_R + BUMPER_R);
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= 2.15 * vn * nx;
        ball.vy -= 2.15 * vn * ny;
        const s = Math.hypot(ball.vx, ball.vy);
        if (s > MAX_SPEED) { ball.vx *= MAX_SPEED / s; ball.vy *= MAX_SPEED / s; }
        if (events) events.push({ type: 'bumper', speed: -vn });
      }
    }
  }

  // 한 타를 끝까지 굴린다. 물에 빠지면 친 자리로 돌아간다.
  function simulate(hole, from, angle, power, keepPath) {
    const ball = launch(from, angle, power);
    const path = keepPath ? [{ x: ball.x, y: ball.y }] : null;
    const events = [];
    let result = 'roll';
    let steps = 0;
    while (result === 'roll' && steps < MAX_STEPS) {
      result = step(hole, ball, events);
      steps += 1;
      if (path && steps % 3 === 0) path.push({ x: ball.x, y: ball.y });
    }
    if (result === 'roll') result = 'stop';
    const end = result === 'water' ? { x: from.x, y: from.y } : { x: ball.x, y: ball.y };
    return { result, x: end.x, y: end.y, splash: result === 'water' ? { x: ball.x, y: ball.y } : null, events, steps, path };
  }

  // ---------- 길찾기 도우미 (테스트와 스크린샷용) ----------

  function distanceField(hole) {
    const dist = new Array(W * H).fill(Infinity);
    const start = Math.floor(hole.cup.y) * W + Math.floor(hole.cup.x);
    const queue = [start];
    dist[start] = 0;
    for (let q = 0; q < queue.length; q += 1) {
      const i = queue[q];
      const x = i % W;
      const y = Math.floor(i / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(nx, ny)) continue;
        const j = ny * W + nx;
        if (dist[j] !== Infinity || !walkable(hole.grid[j])) continue;
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
    return dist;
  }

  function clearLine(hole, a, b) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(2, Math.ceil(len * 6));
    const ox = (-(b.y - a.y) / (len || 1)) * (BALL_R + 0.04);
    const oy = ((b.x - a.x) / (len || 1)) * (BALL_R + 0.04);
    for (let k = 0; k <= n; k += 1) {
      const x = a.x + ((b.x - a.x) * k) / n;
      const y = a.y + ((b.y - a.y) * k) / n;
      for (const [sx, sy] of [[0, 0], [ox, oy], [-ox, -oy]]) {
        if (!walkable(tileAt(hole, x + sx, y + sy))) return false;
      }
      for (const bp of hole.bumpers) if (Math.hypot(x - bp.x, y - bp.y) < BALL_R + BUMPER_R + 0.05) return false;
    }
    return true;
  }

  // 바닥에서 거리 d를 굴러가게 하는 힘. 바닥 마찰만으로 계산한 근사다.
  function powerFor(distance) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      let v = speedFor(mid);
      let d = 0;
      while (v > 0.06) { d += v * DT; v -= friction(TILE.FLOOR, v) * DT; }
      if (d < distance) lo = mid; else hi = mid;
    }
    return hi;
  }

  // 보이는 칸 중 컵에 가장 가까운 곳을 겨냥하는 단순한 봇.
  function botShot(hole, ball, dist) {
    const field = dist || distanceField(hole);
    const target = { x: hole.cup.x, y: hole.cup.y };
    let best = Infinity;
    if (clearLine(hole, ball, hole.cup)) {
      best = -1;
    } else {
      for (let i = 0; i < W * H; i += 1) {
        if (field[i] === Infinity) continue;
        const c = { x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 };
        if (field[i] >= best) continue;
        if (!clearLine(hole, ball, c)) continue;
        best = field[i];
        target.x = c.x; target.y = c.y;
      }
    }
    const d = Math.hypot(target.x - ball.x, target.y - ball.y);
    const want = best === -1 ? d + 0.25 : d;
    const angle = Math.atan2(target.y - ball.y, target.x - ball.x);
    let power = powerFor(want);
    let safe = null;
    // 모래를 지나면 덜 굴러가므로 실제로 굴려 보며 힘을 몇 번 맞춘다. 물에 빠지는 힘은 쓰지 않는다.
    for (let k = 0; k < 6; k += 1) {
      const out = simulate(hole, ball, angle, power, false);
      if (out.result === 'cup') return { angle, power };
      if (out.result === 'water') { power *= 0.7; continue; }
      safe = power;
      const got = (out.x - ball.x) * Math.cos(angle) + (out.y - ball.y) * Math.sin(angle);
      if (got > want - 0.5 || power >= 1) break;
      power = Math.min(1, power * Math.min(1.8, Math.sqrt(want / Math.max(0.3, got))));
    }
    return { angle, power: safe === null ? power : safe };
  }

  function playHoleWithBot(hole, limit) {
    const field = distanceField(hole);
    let ball = { x: hole.tee.x, y: hole.tee.y };
    for (let strokes = 1; strokes <= limit; strokes += 1) {
      const shot = botShot(hole, ball, field);
      const out = simulate(hole, ball, shot.angle, shot.power, false);
      if (out.result === 'cup') return strokes;
      ball = { x: out.x, y: out.y };
    }
    return null;
  }

  // ---------- 타수와 기록 ----------

  function dateKey(d) {
    const date = d instanceof Date ? d : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  function newDaily(date) {
    return { date, hole: 0, scores: [], strokes: 0, ball: null, done: false };
  }

  function newState(date) {
    return {
      v: 1,
      mode: 'daily',
      sound: true,
      coached: false,
      daily: newDaily(date || dateKey()),
      ladder: { level: 1, strokes: 0, ball: null, best: 1, underPar: 0 },
      history: {},
      stats: { rounds: 0, aces: 0, holes: 0, bestToPar: null },
    };
  }

  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  const intIn = (n, lo, hi, fallback) => (Number.isInteger(n) && n >= lo && n <= hi ? n : fallback);
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function cleanBall(b) {
    if (!b || !isNum(b.x) || !isNum(b.y) || b.x <= 0 || b.y <= 0 || b.x >= W || b.y >= H) return null;
    return { x: b.x, y: b.y };
  }

  // 저장값이 깨져 있어도 쓸 수 있는 부분만 살린다.
  function sanitize(raw, today) {
    const base = newState(today);
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
    const s = base;
    s.mode = raw.mode === 'ladder' ? 'ladder' : 'daily';
    s.sound = raw.sound !== false;
    s.coached = raw.coached === true;

    const d = raw.daily;
    if (d && typeof d === 'object' && d.date === today) {
      const scores = Array.isArray(d.scores) ? d.scores.filter((n) => Number.isInteger(n) && n >= 1 && n <= STROKE_CAP + 1).slice(0, HOLES_PER_DAY) : [];
      s.daily = {
        date: today,
        scores,
        hole: scores.length,
        strokes: scores.length >= HOLES_PER_DAY ? 0 : intIn(d.strokes, 0, STROKE_CAP, 0),
        ball: scores.length >= HOLES_PER_DAY ? null : cleanBall(d.ball),
        done: scores.length >= HOLES_PER_DAY,
      };
      if (s.daily.strokes === 0) s.daily.ball = null;
    }

    const l = raw.ladder;
    if (l && typeof l === 'object') {
      s.ladder.level = intIn(l.level, 1, 99999, 1);
      s.ladder.strokes = intIn(l.strokes, 0, STROKE_CAP, 0);
      s.ladder.ball = s.ladder.strokes ? cleanBall(l.ball) : null;
      s.ladder.best = Math.max(s.ladder.level, intIn(l.best, 1, 99999, 1));
      s.ladder.underPar = intIn(l.underPar, 0, 99999, 0);
    }

    if (raw.history && typeof raw.history === 'object') {
      for (const [key, rec] of Object.entries(raw.history)) {
        if (!DATE_RE.test(key) || !rec || !Number.isInteger(rec.strokes) || !Number.isInteger(rec.par)) continue;
        if (rec.strokes < 1 || rec.strokes > 200 || rec.par < 1 || rec.par > 60) continue;
        s.history[key] = { strokes: rec.strokes, par: rec.par, aces: intIn(rec.aces, 0, HOLES_PER_DAY, 0) };
      }
    }

    const st = raw.stats;
    if (st && typeof st === 'object') {
      s.stats.rounds = intIn(st.rounds, 0, 1e7, 0);
      s.stats.aces = intIn(st.aces, 0, 1e7, 0);
      s.stats.holes = intIn(st.holes, 0, 1e8, 0);
      s.stats.bestToPar = Number.isInteger(st.bestToPar) && Math.abs(st.bestToPar) < 100 ? st.bestToPar : null;
    }
    return s;
  }

  function rollDay(state, today) {
    if (state.daily.date === today) return state;
    return { ...state, daily: newDaily(today) };
  }

  function currentHole(state) {
    return state.mode === 'ladder' ? ladderHole(state.ladder.level) : dailyHole(state.daily.date, Math.min(state.daily.hole, HOLES_PER_DAY - 1));
  }

  function roundPar(date) {
    let total = 0;
    for (let i = 0; i < HOLES_PER_DAY; i += 1) total += dailyHole(date, i).par;
    return total;
  }

  // 한 타의 결과를 상태에 반영한다. 돌려주는 holeOut은 홀이 끝났을 때만 채워진다.
  function applyShot(state, outcome, hole) {
    const s = JSON.parse(JSON.stringify(state));
    const cur = s.mode === 'ladder' ? s.ladder : s.daily;
    if (s.mode === 'daily' && s.daily.done) return { state: s, holeOut: null };

    cur.strokes += outcome.result === 'water' ? 2 : 1;
    const holed = outcome.result === 'cup';
    const capped = !holed && cur.strokes >= STROKE_CAP;
    if (!holed && !capped) {
      cur.ball = { x: outcome.x, y: outcome.y };
      return { state: s, holeOut: null };
    }

    const strokes = holed ? cur.strokes : STROKE_CAP + 1;
    const holeOut = { strokes, par: hole.par, ace: holed && strokes === 1, pickedUp: capped, roundDone: false };
    s.stats.holes += 1;
    if (holeOut.ace) s.stats.aces += 1;
    cur.strokes = 0;
    cur.ball = null;

    if (s.mode === 'ladder') {
      if (strokes <= hole.par) s.ladder.underPar += 1;
      s.ladder.level += 1;
      s.ladder.best = Math.max(s.ladder.best, s.ladder.level);
    } else {
      s.daily.scores.push(strokes);
      s.daily.hole = s.daily.scores.length;
      if (s.daily.scores.length >= HOLES_PER_DAY) {
        s.daily.done = true;
        const total = s.daily.scores.reduce((a, b) => a + b, 0);
        const par = roundPar(s.daily.date);
        const aces = s.daily.scores.filter((n) => n === 1).length;
        s.history[s.daily.date] = { strokes: total, par, aces };
        s.stats.rounds += 1;
        const toPar = total - par;
        if (s.stats.bestToPar === null || toPar < s.stats.bestToPar) s.stats.bestToPar = toPar;
        holeOut.roundDone = true;
        holeOut.total = total;
        holeOut.roundPar = par;
      }
    }
    return { state: s, holeOut };
  }

  // 오늘이나 어제까지 끊기지 않고 이어진 라운드 날 수.
  function streak(history, today) {
    const d = new Date(`${today}T12:00:00`);
    if (!history[today]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (history[dateKey(d)]) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }

  // 타수와 파의 차이를 이름으로. 'ace' 'eagle' 'birdie' 'par' 'bogey' 'double' 'over' 'pickup'
  function scoreName(strokes, par) {
    if (strokes > STROKE_CAP) return 'pickup';
    if (strokes === 1) return 'ace';
    const diff = strokes - par;
    if (diff <= -2) return 'eagle';
    if (diff === -1) return 'birdie';
    if (diff === 0) return 'par';
    if (diff === 1) return 'bogey';
    if (diff === 2) return 'double';
    return 'over';
  }

  const logic = {
    W, H, TILE, BALL_R, CUP_R, BUMPER_R, MAX_SPEED, STROKE_CAP, HOLES_PER_DAY,
    hashString, rng, generateHole, dailyHole, ladderHole, tileAt, tileOf,
    newBall, launch, speedFor, step, simulate,
    distanceField, clearLine, powerFor, botShot, playHoleWithBot,
    dateKey, newState, sanitize, rollDay, currentHole, roundPar, applyShot, streak, scoreName,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
