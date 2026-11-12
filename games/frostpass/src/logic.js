// 서리 고개의 규칙. DOM 없이 쓰며 브라우저와 node 테스트가 같은 코드를 읽는다.
// 판: 다섯 갈래 산길(열) x 여섯 칸(행). 0행 꼭대기에서 눈 괴물이 나타나 한 칸씩 내려오고,
// 5행 아래로 빠져나가면 마을 등불이 꺼진다. 플레이어는 차례마다 카드 한 장을 쓴다.
(function (root) {
  const COLS = 5;
  const ROWS = 6;
  const WAVES = 8;
  const HAND = 3;
  const START_HEARTS = 5;
  const DAILY_TRIES = 12;
  const WOOD_START = 2; // 파도가 시작할 때 장작
  const WOOD_MAX = 5;
  // 파도 세기. 시뮬레이션(tests/balance.test.js)으로 맞춘 값이다.
  const TUNE = { base: 3, per: 1.75, pair3: 0.15, pair5: 0.33, gap: 0.42 };

  const CARDS = {
    thrower: { kind: 'unit', hp: 2, rarity: 1, cost: 2 },
    wall: { kind: 'unit', hp: 4, rarity: 1, cost: 1 },
    brazier: { kind: 'unit', hp: 3, rarity: 2, cost: 2 },
    catapult: { kind: 'unit', hp: 2, rarity: 3, cost: 3 },
    trap: { kind: 'trap', rarity: 1, cost: 1 },
    shovel: { kind: 'spell', rarity: 1, cost: 1 },
    gust: { kind: 'spell', rarity: 2, cost: 1 },
  };
  const CARD_IDS = Object.keys(CARDS);
  const START_DECK = ['thrower', 'thrower', 'thrower', 'wall', 'wall', 'brazier', 'shovel', 'shovel'];

  // hp: 체력, harm: 마을에 닿으면 꺼지는 등불 수, every: 몇 차례에 한 번 움직이는지, steps: 한 번에 몇 칸
  const ENEMIES = {
    blob: { hp: 2, harm: 1, every: 1, steps: 1, bite: 1, points: 10, cost: 1 },
    wisp: { hp: 1, harm: 1, every: 1, steps: 2, bite: 1, points: 12, cost: 1.4, from: 2 },
    splitter: { hp: 3, harm: 1, every: 1, steps: 1, bite: 1, points: 20, cost: 2.2, from: 3 },
    boulder: { hp: 6, harm: 2, every: 2, steps: 1, bite: 2, points: 35, cost: 3.2, from: 4 },
    mini: { hp: 1, harm: 1, every: 1, steps: 1, bite: 1, points: 5, cost: 0 },
  };
  const ENEMY_IDS = Object.keys(ENEMIES);

  // ---- 난수: 상태를 정수 하나로 들고 다녀 저장과 이어 하기가 정확하다.
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function nextRandom(box) {
    box.s = (box.s + 0x6D2B79F5) >>> 0;
    let t = box.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const pickInt = (box, n) => Math.floor(nextRandom(box) * n);
  function shuffle(box, list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = pickInt(box, i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // ---- 파도 만들기: 파도의 적 배치는 씨앗과 파도 번호로만 정해져 같은 날이면 모두 같다.
  function makeWave(seed, wave) {
    const box = { s: hash(`${seed}/wave/${wave}`) };
    let budget = TUNE.base + wave * TUNE.per;
    const spawns = [];
    let turn = 0;
    while (budget > 0.5) {
      const pool = ENEMY_IDS.filter((id) => ENEMIES[id].cost > 0 && (ENEMIES[id].from || 1) <= wave && ENEMIES[id].cost <= budget + 0.4);
      if (!pool.length) break;
      const weights = pool.map((id) => (id === 'blob' ? 3 : 2));
      let roll = nextRandom(box) * weights.reduce((a, b) => a + b, 0);
      let type = pool[0];
      for (let i = 0; i < pool.length; i += 1) {
        roll -= weights[i];
        if (roll < 0) { type = pool[i]; break; }
      }
      const used = spawns.filter((s) => s.t === turn).map((s) => s.col);
      let col = pickInt(box, COLS);
      while (used.includes(col)) col = (col + 1) % COLS;
      spawns.push({ t: turn, col, type });
      budget -= ENEMIES[type].cost;
      const pairChance = wave >= 5 ? TUNE.pair5 : wave >= 3 ? TUNE.pair3 : 0;
      if (nextRandom(box) >= pairChance || used.length >= 1) turn += 1 + (nextRandom(box) < TUNE.gap - wave * 0.03 ? 1 : 0);
    }
    return spawns;
  }

  function makeOffer(seed, wave) {
    const box = { s: hash(`${seed}/offer/${wave}`) };
    const pool = CARD_IDS.flatMap((id) => Array(4 - CARDS[id].rarity).fill(id));
    const offer = [];
    while (offer.length < 3) {
      const id = pool[pickInt(box, pool.length)];
      if (!offer.includes(id)) offer.push(id);
    }
    return offer;
  }

  // ---- 한 판
  function newRun(seed, mode) {
    const run = {
      v: 1, seed: String(seed), mode: mode || 'practice', wave: 1, turn: 0, hearts: START_HEARTS, score: 0, melted: 0,
      deck: START_DECK.slice(), draw: [], discard: [], hand: [], units: [], enemies: [], spawns: [],
      phase: 'battle', offer: [], nextId: 1, wood: WOOD_START, rng: hash(`${seed}/deck`), events: [], seen: [],
    };
    startWave(run);
    return run;
  }

  function drawHand(run) {
    const box = { s: run.rng };
    while (run.hand.length < HAND) {
      if (!run.draw.length) {
        if (!run.discard.length) break;
        run.draw = shuffle(box, run.discard);
        run.discard = [];
      }
      run.hand.push(run.draw.pop());
    }
    run.rng = box.s;
  }

  function startWave(run) {
    run.units = [];
    run.enemies = [];
    run.turn = 0;
    run.wood = WOOD_START;
    run.spawns = makeWave(run.seed, run.wave);
    run.phase = 'battle';
    run.offer = [];
    run.draw = [];
    run.discard = run.deck.slice();
    run.hand = [];
    const box = { s: run.rng };
    run.draw = shuffle(box, run.discard);
    run.discard = [];
    run.rng = box.s;
    spawnNow(run);
    drawHand(run);
  }

  const enemyAt = (run, c, r) => run.enemies.find((e) => e.c === c && e.r === r);
  const unitAt = (run, c, r) => run.units.find((u) => u.c === c && u.r === r && u.type !== 'trap');
  const trapAt = (run, c, r) => run.units.find((u) => u.c === c && u.r === r && u.type === 'trap');

  function spawnNow(run) {
    for (const s of run.spawns) {
      if (s.done || s.t > run.turn) continue;
      if (enemyAt(run, s.col, 0)) { s.t = run.turn + 1; continue; }
      const def = ENEMIES[s.type];
      run.enemies.push({ id: run.nextId++, type: s.type, c: s.col, r: 0, hp: def.hp, age: 0 });
      if (!run.seen.includes(s.type)) run.seen.push(s.type);
      s.done = true;
    }
  }

  function upcoming(run) {
    return run.spawns.filter((s) => !s.done && s.t <= run.turn + 1).map((s) => ({ col: s.col, type: s.type }));
  }

  function hurt(run, enemy, dmg, source) {
    if (enemy.hp <= 0) return;
    enemy.hp -= dmg;
    run.events.push({ type: 'hit', id: enemy.id, c: enemy.c, r: enemy.r, dmg, source });
  }

  function clearDead(run) {
    const dead = run.enemies.filter((e) => e.hp <= 0);
    if (!dead.length) return;
    run.enemies = run.enemies.filter((e) => e.hp > 0);
    for (const e of dead) {
      run.score += ENEMIES[e.type].points;
      run.melted += 1;
      run.events.push({ type: 'melt', id: e.id, c: e.c, r: e.r, enemy: e.type });
      if (e.type === 'splitter') {
        for (const dc of [-1, 1]) {
          const c = e.c + dc;
          if (c < 0 || c >= COLS || enemyAt(run, c, e.r) || unitAt(run, c, e.r)) continue;
          run.enemies.push({ id: run.nextId++, type: 'mini', c, r: e.r, hp: 1, age: 0 });
          if (!run.seen.includes('mini')) run.seen.push('mini');
        }
      }
    }
  }

  function validTargets(run, handIndex) {
    const id = run.hand[handIndex];
    if (run.phase !== 'battle' || !id || CARDS[id].cost > run.wood) return [];
    const kind = CARDS[id].kind;
    const out = [];
    if (kind === 'spell') {
      for (let c = 0; c < COLS; c += 1) {
        if (run.enemies.some((e) => e.c === c)) out.push({ c, r: -1 });
      }
      return out;
    }
    for (let r = kind === 'trap' ? 1 : 2; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (enemyAt(run, c, r) || run.units.some((u) => u.c === c && u.r === r)) continue;
        out.push({ c, r });
      }
    }
    return out;
  }

  function applyCard(run, id, c, r) {
    const def = CARDS[id];
    if (def.kind === 'unit') {
      run.units.push({ id: run.nextId++, type: id, c, r, hp: def.hp });
      run.events.push({ type: 'place', card: id, c, r });
    } else if (def.kind === 'trap') {
      run.units.push({ id: run.nextId++, type: 'trap', c, r, hp: 1 });
      run.events.push({ type: 'place', card: id, c, r });
    } else if (id === 'shovel') {
      const target = run.enemies.filter((e) => e.c === c).sort((a, b) => b.r - a.r)[0];
      if (target) hurt(run, target, 2, 'shovel');
      clearDead(run);
    } else if (id === 'gust') {
      const column = run.enemies.filter((e) => e.c === c).sort((a, b) => a.r - b.r);
      for (const e of column) {
        for (let k = 0; k < 2; k += 1) {
          const nr = e.r - 1;
          if (nr < 0 || enemyAt(run, c, nr) || unitAt(run, c, nr)) break;
          e.r = nr;
        }
        e.age = 0;
        run.events.push({ type: 'push', id: e.id });
      }
    }
  }

  function unitsAct(run) {
    for (const u of run.units.slice()) {
      if (u.type === 'thrower' || u.type === 'catapult') {
        const target = run.enemies.filter((e) => e.c === u.c && e.r < u.r && e.hp > 0).sort((a, b) => b.r - a.r)[0];
        if (target) {
          run.events.push({ type: 'throw', from: u.id, c: u.c, r: u.r, tr: target.r });
          hurt(run, target, u.type === 'catapult' ? 2 : 1, u.type);
        }
      } else if (u.type === 'brazier') {
        for (const e of run.enemies) {
          if (Math.abs(e.c - u.c) <= 1 && Math.abs(e.r - u.r) <= 1) hurt(run, e, 1, 'brazier');
        }
      }
    }
    clearDead(run);
  }

  function enemiesMove(run) {
    const order = run.enemies.slice().sort((a, b) => b.r - a.r);
    for (const e of order) {
      if (e.hp <= 0 || !run.enemies.includes(e)) continue;
      const def = ENEMIES[e.type];
      e.age += 1;
      if (e.age % def.every !== 0) continue;
      for (let k = 0; k < def.steps; k += 1) {
        const nr = e.r + 1;
        if (nr >= ROWS) {
          run.hearts = Math.max(0, run.hearts - def.harm);
          run.enemies = run.enemies.filter((x) => x !== e);
          run.events.push({ type: 'breach', id: e.id, c: e.c, harm: def.harm });
          break;
        }
        if (enemyAt(run, e.c, nr)) break;
        const blocker = unitAt(run, e.c, nr);
        if (blocker) {
          blocker.hp -= def.bite;
          run.events.push({ type: 'bite', id: e.id, unit: blocker.id, c: e.c, r: nr });
          if (blocker.hp <= 0) {
            run.units = run.units.filter((u) => u !== blocker);
            run.events.push({ type: 'crush', c: e.c, r: nr, card: blocker.type });
          }
          break;
        }
        e.r = nr;
        const trap = trapAt(run, e.c, nr);
        if (trap) {
          run.units = run.units.filter((u) => u !== trap);
          hurt(run, e, 3, 'trap');
          if (e.hp <= 0) break;
        }
      }
    }
    clearDead(run);
  }

  function endTurn(run) {
    unitsAct(run);
    enemiesMove(run);
    run.turn += 1;
    run.wood = Math.min(WOOD_MAX, run.wood + 1);
    spawnNow(run);
    if (run.hearts <= 0) {
      run.phase = 'lost';
      return;
    }
    if (run.spawns.every((s) => s.done) && !run.enemies.length) {
      run.score += 25 * run.wave;
      run.events.push({ type: 'clear', wave: run.wave });
      if (run.wave >= WAVES) {
        run.score += run.hearts * 40;
        run.phase = 'won';
      } else {
        run.phase = 'draft';
        run.offer = makeOffer(run.seed, run.wave);
      }
      return;
    }
    drawHand(run);
  }

  // 카드 한 장을 쓰고 차례를 넘긴다. 잘못된 수면 null.
  function play(state, handIndex, c, r) {
    if (!state || state.phase !== 'battle') return null;
    const ok = validTargets(state, handIndex).some((t) => t.c === c && (t.r === r || t.r === -1));
    if (!ok) return null;
    const run = clone(state);
    run.events = [];
    const [id] = run.hand.splice(handIndex, 1);
    run.discard.push(id);
    run.wood -= CARDS[id].cost;
    applyCard(run, id, c, r);
    endTurn(run);
    return run;
  }

  // 카드를 쓰지 않고 기다린다(손패는 새로 뽑힌다).
  function pass(state) {
    if (!state || state.phase !== 'battle') return null;
    const run = clone(state);
    run.events = [];
    run.discard.push(...run.hand);
    run.hand = [];
    endTurn(run);
    return run;
  }

  // 파도 사이에 카드 한 장을 덱에 더한다. index -1은 건너뛰기.
  function pick(state, index) {
    if (!state || state.phase !== 'draft') return null;
    const run = clone(state);
    run.events = [];
    if (index >= 0 && run.offer[index]) run.deck.push(run.offer[index]);
    run.wave += 1;
    startWave(run);
    return run;
  }

  // ---- 컴퓨터 대국자: 난이도 검증과 오늘의 고개 확인에 쓴다.
  function evaluate(run) {
    if (run.phase === 'lost') return -1e6;
    let v = run.hearts * 400 + run.score;
    for (const e of run.enemies) v -= (e.r + 1) * (e.r + 1) * e.hp * 4;
    for (const u of run.units) v += u.type === 'trap' ? 10 : 12 + u.hp * 3;
    return v;
  }
  function bestMove(run) {
    let best = { score: evaluate(pass(run)), move: null };
    run.hand.forEach((id, i) => {
      if (run.hand.indexOf(id) !== i) return;
      for (const t of validTargets(run, i)) {
        const next = play(run, i, t.c, t.r);
        const s = evaluate(next);
        if (s > best.score) best = { score: s, move: { i, c: t.c, r: t.r } };
      }
    });
    return best.move;
  }
  const DRAFT_ORDER = ['catapult', 'brazier', 'thrower', 'trap', 'gust', 'wall', 'shovel'];
  function autoplay(seed, policy) {
    let run = newRun(seed, 'test');
    let guard = 0;
    while ((run.phase === 'battle' || run.phase === 'draft') && guard < 2000) {
      guard += 1;
      if (run.phase === 'draft') {
        const ranked = run.offer.map((id, i) => ({ i, k: DRAFT_ORDER.indexOf(id) })).sort((a, b) => a.k - b.k);
        run = pick(run, policy === 'random' ? pickInt({ s: guard * 7 + 1 }, 3) : ranked[0].i);
        continue;
      }
      if (policy === 'random') {
        const box = { s: hash(`${seed}/${guard}`) };
        const i = pickInt(box, run.hand.length);
        const ts = validTargets(run, i);
        const t = ts[pickInt(box, Math.max(1, ts.length))];
        run = t ? play(run, i, t.c, t.r) || pass(run) : pass(run);
      } else if (policy === 'lazy') {
        // 사람처럼 손패 한 장만 보고 그 카드의 가장 좋은 자리에 둔다.
        const i = pickInt({ s: hash(`${seed}/${guard}`) }, run.hand.length);
        let best = { score: -Infinity, t: null };
        for (const t of validTargets(run, i)) {
          const s = evaluate(play(run, i, t.c, t.r));
          if (s > best.score) best = { score: s, t };
        }
        run = best.t ? play(run, i, best.t.c, best.t.r) : pass(run);
      } else {
        const m = bestMove(run);
        run = m ? play(run, m.i, m.c, m.r) : pass(run);
      }
    }
    return run;
  }

  // 오늘의 고개: 날짜로 정해지고, 컴퓨터 대국자가 끝까지 깨는 씨앗만 쓴다.
  function dailySeed(date) {
    for (let k = 0; k < DAILY_TRIES; k += 1) {
      const seed = k ? `${date}#${k}` : date;
      if (autoplay(seed, 'greedy').phase === 'won') return seed;
    }
    return date;
  }

  // ---- 저장값
  function newMeta() {
    return { v: 1, active: 'daily', daily: null, practice: null, days: {}, best: 0, seen: [], cards: [], melted: 0, runs: 0, wins: 0, sound: true, tip: true };
  }

  function validRun(run) {
    if (!run || typeof run !== 'object') return false;
    const ints = ['wave', 'turn', 'hearts', 'score', 'nextId', 'rng', 'wood'];
    if (ints.some((k) => !Number.isFinite(run[k]))) return false;
    if (!['battle', 'draft', 'won', 'lost'].includes(run.phase)) return false;
    if (run.wave < 1 || run.wave > WAVES || run.hearts < 0 || run.hearts > START_HEARTS || run.wood < 0 || run.wood > WOOD_MAX) return false;
    for (const key of ['deck', 'draw', 'discard', 'hand', 'units', 'enemies', 'spawns', 'offer', 'seen']) {
      if (!Array.isArray(run[key])) return false;
    }
    if (![...run.deck, ...run.draw, ...run.discard, ...run.hand, ...run.offer].every((id) => CARDS[id])) return false;
    const inBoard = (p) => p && Number.isInteger(p.c) && Number.isInteger(p.r) && p.c >= 0 && p.c < COLS && p.r >= 0 && p.r < ROWS && Number.isFinite(p.hp);
    if (!run.units.every((u) => inBoard(u) && (CARDS[u.type] || u.type === 'trap'))) return false;
    if (!run.enemies.every((e) => inBoard(e) && ENEMIES[e.type] && Number.isFinite(e.age))) return false;
    if (run.phase === 'draft' && run.offer.length !== 3) return false;
    return true;
  }

  function sanitize(raw) {
    const base = newMeta();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    const out = { ...base };
    out.active = raw.active === 'practice' ? 'practice' : 'daily';
    out.daily = validRun(raw.daily) ? raw.daily : null;
    out.practice = validRun(raw.practice) ? raw.practice : null;
    if (raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days)) {
      for (const [k, d] of Object.entries(raw.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && d && Number.isFinite(d.score)) {
          out.days[k] = { score: Math.max(0, Math.floor(d.score)), won: !!d.won, wave: Math.min(WAVES, Math.max(1, Math.floor(d.wave) || 1)) };
        }
      }
    }
    for (const k of ['best', 'melted', 'runs', 'wins']) out[k] = Number.isFinite(raw[k]) && raw[k] >= 0 ? Math.floor(raw[k]) : 0;
    out.seen = Array.isArray(raw.seen) ? raw.seen.filter((id, i, a) => ENEMIES[id] && a.indexOf(id) === i) : [];
    out.cards = Array.isArray(raw.cards) ? raw.cards.filter((id, i, a) => CARDS[id] && a.indexOf(id) === i) : [];
    out.sound = raw.sound !== false;
    out.tip = raw.tip !== false;
    return out;
  }

  // 한 판이 끝났을 때 기록에 반영한다.
  function record(meta, run, date) {
    const out = { ...meta, days: { ...meta.days } };
    out.runs += 1;
    if (run.phase === 'won') out.wins += 1;
    out.melted += run.melted;
    if (run.mode === 'daily') {
      const prev = out.days[date];
      if (!prev || run.score > prev.score) out.days[date] = { score: run.score, won: run.phase === 'won', wave: run.wave };
    } else {
      out.best = Math.max(out.best, run.score);
    }
    return out;
  }

  function streakDays(days, today) {
    let n = 0;
    const d = new Date(`${today}T12:00:00`);
    if (!days[today]) d.setDate(d.getDate() - 1);
    while (days[d.toLocaleDateString('sv-SE')]) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  const logic = {
    TUNE, WOOD_START, WOOD_MAX, COLS, ROWS, WAVES, HAND, START_HEARTS, CARDS, CARD_IDS, ENEMIES, ENEMY_IDS, START_DECK,
    hash, makeWave, makeOffer, newRun, validTargets, play, pass, pick, upcoming,
    evaluate, bestMove, autoplay, dailySeed, newMeta, validRun, sanitize, record, streakDays,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
