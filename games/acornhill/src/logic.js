// 도토리 언덕의 규칙. DOM 없이 쓰고 브라우저와 node 테스트가 같은 코드를 읽는다.
// 언덕에 겹겹이 놓인 나무 패 가운데 위가 비어 있는 패를, 바구니 맨 위 패와 숫자가 하나 차이(13과 1은 이어짐)이면 걷어 낸다.
// 걷을 패가 없으면 더미에서 한 장을 뒤집어 바구니에 올린다. 언덕을 다 걷으면 이기고, 더미가 비고 걷을 패가 없으면 끝난다.
(function (root) {
  const RANKS = 13;
  const SUITS = 4; // 0 도토리, 1 단풍잎, 2 버섯, 3 솔방울

  // ---------- 씨앗 난수 ----------
  function hashString(text) {
    let h = 2166136261;
    for (const ch of String(text)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // ---------- 패 ----------
  const rankOf = (card) => (card % RANKS) + 1;
  const suitOf = (card) => Math.floor(card / RANKS);
  function adjacent(a, b) {
    const d = Math.abs(rankOf(a) - rankOf(b));
    return d === 1 || d === RANKS - 1;
  }

  // ---------- 언덕 모양 ----------
  // rows[0]이 언덕 꼭대기(가장 뒤, 가장 아래 깔림), 마지막 줄이 가장 앞(맨 위에 얹힘).
  // x는 반 장 단위. 바로 앞 줄의 패와 x 차이가 1 이하이면 그 패에 덮인다.
  const LAYOUTS = [
    { id: 'mound', ko: '둥근 둔덕', en: 'Round Mound', rows: [[5], [4, 6], [3, 5, 7], [2, 4, 6, 8], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10]] },
    { id: 'twin', ko: '쌍둥이 언덕', en: 'Twin Knolls', rows: [[3, 9], [2, 4, 8, 10], [1, 3, 5, 7, 9, 11], [0, 2, 4, 6, 8, 10, 12], [1, 3, 5, 7, 9, 11]] },
    { id: 'steps', ko: '솔숲 계단', en: 'Pine Steps', rows: [[0, 2], [1, 3, 5], [2, 4, 6, 8], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12], [7, 9, 11]] },
    { id: 'ridge', ko: '긴 능선', en: 'Long Ridge', rows: [[4, 6, 8, 10, 12], [3, 5, 7, 9, 11, 13], [2, 4, 6, 8, 10, 12, 14], [3, 5, 7, 9, 11, 13], [4, 6, 8, 10, 12]] },
    { id: 'burrow', ko: '다람쥐 굴', en: 'Squirrel Burrow', rows: [[1, 11], [0, 2, 10, 12], [1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10], [1, 3, 9, 11], [0, 2, 4, 8, 10, 12]] },
  ];
  const layoutCache = {};
  function layout(id) {
    if (layoutCache[id]) return layoutCache[id];
    const spec = LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
    const slots = [];
    spec.rows.forEach((xs, row) => xs.forEach((x) => slots.push({ row, x, coveredBy: [] })));
    slots.forEach((slot, i) => {
      slots.forEach((other, j) => {
        if (other.row === slot.row + 1 && Math.abs(other.x - slot.x) <= 1) slot.coveredBy.push(j);
      });
      slot.i = i;
    });
    const xs = slots.map((s) => s.x);
    const result = { id: spec.id, ko: spec.ko, en: spec.en, slots, rows: spec.rows.length, minX: Math.min(...xs), maxX: Math.max(...xs) };
    layoutCache[spec.id] = result;
    return result;
  }

  // ---------- 판 ----------
  function dealFromSeed(seed, layoutId) {
    const lay = layout(layoutId);
    const deck = shuffle(Array.from({ length: RANKS * SUITS }, (_, i) => i), rng(seed));
    const n = lay.slots.length;
    return { layout: lay.id, cards: deck.slice(0, n), stock: deck.slice(n + 1), start: deck[n] };
  }

  function freshRound(deal, meta = {}) {
    return {
      layout: deal.layout,
      cards: deal.cards.slice(),
      removed: deal.cards.map(() => false),
      stock: deal.stock.slice(),
      drawn: 0,
      pile: [deal.start],
      streak: 0,
      bestStreak: 0,
      score: 0,
      wild: 1,
      moves: 0,
      mode: meta.mode || 'map',
      key: meta.key ?? 0,
      seed: meta.seed ?? 0,
    };
  }

  const top = (s) => s.pile[s.pile.length - 1];
  const stockLeft = (s) => s.stock.length - s.drawn;
  function isFree(s, i) {
    if (s.removed[i]) return false;
    return layout(s.layout).slots[i].coveredBy.every((j) => s.removed[j]);
  }
  function freeSlots(s) {
    return s.cards.map((_, i) => i).filter((i) => isFree(s, i));
  }
  function canPlay(s, i) {
    return isFree(s, i) && adjacent(s.cards[i], top(s));
  }
  function playable(s) {
    return freeSlots(s).filter((i) => adjacent(s.cards[i], top(s)));
  }
  const clearGain = (streak) => Math.min(60, 10 + 5 * (streak - 1));

  function play(s, i) {
    if (status(s) !== 'play' || !canPlay(s, i)) return null;
    return take(s, i, false);
  }
  function useWild(s, i) {
    if (status(s) !== 'play' || s.wild < 1 || !isFree(s, i)) return null;
    return take(s, i, true);
  }
  function take(s, i, wild) {
    const removed = s.removed.slice();
    removed[i] = true;
    const streak = s.streak + 1;
    const next = {
      ...s, removed, pile: s.pile.concat(s.cards[i]), streak, bestStreak: Math.max(s.bestStreak, streak),
      score: s.score + clearGain(streak), moves: s.moves + 1, wild: wild ? s.wild - 1 : s.wild,
    };
    if (removed.every(Boolean)) next.score += winBonus(next);
    return next;
  }
  function draw(s) {
    if (status(s) !== 'play' || stockLeft(s) < 1) return null;
    return { ...s, pile: s.pile.concat(s.stock[s.drawn]), drawn: s.drawn + 1, streak: 0, moves: s.moves + 1 };
  }
  const winBonus = (s) => 100 + 25 * stockLeft(s);
  function status(s) {
    if (s.removed.every(Boolean)) return 'won';
    if (stockLeft(s) > 0 || playable(s).length > 0) return 'play';
    if (s.wild > 0 && freeSlots(s).length > 0) return 'play';
    return 'lost';
  }
  // 별: 이기면 하나, 더미가 6장 이상 남으면 둘, 12장 이상이면 셋.
  function stars(s) {
    if (status(s) !== 'won') return 0;
    const left = stockLeft(s);
    return left >= 12 ? 3 : left >= 6 ? 2 : 1;
  }
  const acornsFrom = (s) => Math.floor(s.score / 10) + (status(s) === 'won' ? 5 : 0);

  // ---------- 풀이(도움 없이 이길 수 있는지) ----------
  // 깊이 우선으로 찾되 같은 상태는 다시 보지 않는다. 찾은 수순을 돌려준다(['p', 슬롯] 또는 ['d']).
  function solve(deal, limit = 40000) {
    const lay = layout(deal.layout);
    const n = lay.slots.length;
    const coverMask = lay.slots.map((sl) => sl.coveredBy.reduce((m, j) => m | (1 << j), 0));
    const seen = new Set();
    const path = [];
    let nodes = 0;
    // removed는 비트 묶음(최대 29장이라 32비트 정수에 들어간다).
    function go(removed, drawn, topCard, remaining) {
      if (remaining === 0) return true;
      if (++nodes > limit) return false;
      const key = ((removed >>> 0) * 32 + drawn) * 64 + topCard;
      if (seen.has(key)) return false;
      seen.add(key);
      // 앞 줄(더 많은 패를 여는 쪽)부터 본다.
      for (let i = n - 1; i >= 0; i -= 1) {
        const bit = 1 << i;
        if ((removed & bit) || (coverMask[i] & removed) !== coverMask[i] || !adjacent(deal.cards[i], topCard)) continue;
        path.push(['p', i]);
        if (go(removed | bit, drawn, deal.cards[i], remaining - 1)) return true;
        path.pop();
        if (nodes > limit) return false;
      }
      if (drawn < deal.stock.length) {
        path.push(['d']);
        if (go(removed, drawn + 1, deal.stock[drawn], remaining)) return true;
        path.pop();
      }
      return false;
    }
    return go(0, 0, deal.start, n) ? path.slice() : null;
  }

  const solvedCache = new Map();
  // 씨앗에서 시작해 도움 없이 풀리는 판을 고른다.
  function solvableDeal(seed, layoutId) {
    const cacheKey = `${seed}|${layoutId}`;
    if (solvedCache.has(cacheKey)) return solvedCache.get(cacheKey);
    const result = findDeal(seed, layoutId);
    solvedCache.set(cacheKey, result);
    return result;
  }
  function findDeal(seed, layoutId) {
    let last = null;
    for (let k = 0; k < 40; k += 1) {
      const deal = dealFromSeed((seed + k * 7919) >>> 0, layoutId);
      last = deal;
      if (solve(deal)) return { deal, seed: (seed + k * 7919) >>> 0 };
    }
    return { deal: last, seed };
  }

  // ---------- 언덕 지도와 오늘의 언덕 ----------
  const MAP_SIZE = 30;
  const HILL_NAMES = {
    ko: ['밤나무 아래', '첫 서리 둔덕', '갈대 바람길', '버섯 그늘', '솔방울 비탈', '단풍 오솔길', '개울 건너', '옹이 바위', '부엉이 고개', '안개 언덕'],
    en: ['Chestnut Shade', 'First Frost', 'Reed Path', 'Mushroom Hollow', 'Pinecone Slope', 'Maple Lane', 'Across the Brook', 'Knot Rock', 'Owl Pass', 'Misty Hill'],
  };
  function mapHill(n) {
    const k = Math.max(0, Math.min(MAP_SIZE - 1, n | 0));
    // 처음 다섯 언덕은 작은 모양부터, 그 뒤로는 모양을 돌려 가며 쓴다.
    const order = ['mound', 'twin', 'steps', 'mound', 'burrow', 'twin', 'ridge', 'steps', 'burrow', 'ridge'];
    const layoutId = order[k % order.length];
    return { n: k, layout: layoutId, seed: hashString(`acornhill-map-${k}`), name: { ko: HILL_NAMES.ko[k % 10], en: HILL_NAMES.en[k % 10] }, lap: Math.floor(k / 10) };
  }
  function dayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function dailyHill(key) {
    const seed = hashString(`acornhill-day-${key}`);
    return { key, layout: LAYOUTS[seed % LAYOUTS.length].id, seed };
  }

  // ---------- 겨울 창고 ----------
  const STORE = [
    { at: 20, icon: '🫙', ko: '도토리 단지', en: 'Acorn jar' },
    { at: 60, icon: '🧺', ko: '밤 바구니', en: 'Chestnut basket' },
    { at: 120, icon: '🍄', ko: '버섯 등잔', en: 'Mushroom lamp' },
    { at: 200, icon: '🧣', ko: '털실 목도리', en: 'Knitted scarf' },
    { at: 300, icon: '🍁', ko: '단풍 액자', en: 'Maple frame' },
    { at: 420, icon: '🛏️', ko: '솔잎 이불', en: 'Pine-needle quilt' },
    { at: 560, icon: '🍯', ko: '꿀단지', en: 'Honey pot' },
    { at: 720, icon: '🕰️', ko: '호두 시계', en: 'Walnut clock' },
    { at: 900, icon: '🔥', ko: '작은 난로', en: 'Little stove' },
    { at: 1100, icon: '🎐', ko: '바람 풍경', en: 'Wind chime' },
    { at: 1350, icon: '⭐', ko: '별 모빌', en: 'Star mobile' },
    { at: 1650, icon: '❄️', ko: '눈 지붕', en: 'Snowy roof' },
  ];
  const unlocked = (total) => STORE.filter((item) => total >= item.at).length;
  function nextItem(total) {
    return STORE.find((item) => total < item.at) || null;
  }

  // ---------- 저장 ----------
  function newSave() {
    return { v: 1, hill: 0, stars: [], acorns: 0, best: 0, bestStreak: 0, wins: 0, played: 0, daily: {}, round: null };
  }
  const num = (x, lo, hi, d = lo) => (Number.isFinite(Number(x)) ? Math.max(lo, Math.min(hi, Math.floor(Number(x)))) : d);
  function validRound(r) {
    if (!r || typeof r !== 'object') return null;
    const lay = LAYOUTS.find((l) => l.id === r.layout);
    if (!lay) return null;
    const n = layout(r.layout).slots.length;
    const okCard = (c) => Number.isInteger(c) && c >= 0 && c < RANKS * SUITS;
    if (!Array.isArray(r.cards) || r.cards.length !== n || !r.cards.every(okCard)) return null;
    if (!Array.isArray(r.removed) || r.removed.length !== n) return null;
    if (!Array.isArray(r.stock) || !r.stock.every(okCard) || r.cards.length + r.stock.length !== RANKS * SUITS - 1) return null;
    if (!Array.isArray(r.pile) || r.pile.length < 1 || !r.pile.every(okCard)) return null;
    const s = {
      layout: r.layout, cards: r.cards.slice(), removed: r.removed.map(Boolean), stock: r.stock.slice(),
      drawn: num(r.drawn, 0, r.stock.length), pile: r.pile.slice(), streak: num(r.streak, 0, 99), bestStreak: num(r.bestStreak, 0, 99),
      score: num(r.score, 0, 5000), wild: num(r.wild, 0, 1), moves: num(r.moves, 0, 999),
      mode: r.mode === 'day' ? 'day' : 'map', key: r.mode === 'day' ? String(r.key || '') : num(r.key, 0, MAP_SIZE - 1), seed: num(r.seed, 0, 4294967295),
    };
    return s;
  }
  function sanitize(raw) {
    const base = newSave();
    if (!raw || typeof raw !== 'object') return base;
    const out = {
      v: 1,
      hill: num(raw.hill, 0, MAP_SIZE, 0),
      stars: Array.isArray(raw.stars) ? raw.stars.slice(0, MAP_SIZE).map((x) => num(x, 0, 3, 0)) : [],
      acorns: num(raw.acorns, 0, 1e7, 0),
      best: num(raw.best, 0, 5000, 0),
      bestStreak: num(raw.bestStreak, 0, 99, 0),
      wins: num(raw.wins, 0, 1e6, 0),
      played: num(raw.played, 0, 1e6, 0),
      daily: {},
      round: validRound(raw.round),
    };
    if (raw.daily && typeof raw.daily === 'object') {
      Object.keys(raw.daily).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-60).forEach((k) => {
        const d = raw.daily[k] || {};
        out.daily[k] = { score: num(d.score, 0, 5000, 0), won: Boolean(d.won) };
      });
    }
    return out;
  }
  // 한 판이 끝났을 때 저장에 반영한다.
  function finish(save, s) {
    const out = sanitize(save);
    const st = status(s);
    if (st === 'play') return out;
    out.played += 1;
    out.acorns += acornsFrom(s);
    out.best = Math.max(out.best, s.score);
    out.bestStreak = Math.max(out.bestStreak, s.bestStreak);
    if (st === 'won') out.wins += 1;
    if (s.mode === 'map') {
      const k = Number(s.key);
      const got = stars(s);
      while (out.stars.length <= k) out.stars.push(0);
      out.stars[k] = Math.max(out.stars[k], got);
      if (st === 'won' && k === out.hill) out.hill = Math.min(MAP_SIZE, k + 1);
    } else {
      const prev = out.daily[s.key] || { score: 0, won: false };
      out.daily[s.key] = { score: Math.max(prev.score, s.score), won: prev.won || st === 'won' };
    }
    out.round = null;
    return out;
  }
  const best = (save) => sanitize(save).best;

  const logic = {
    RANKS, SUITS, LAYOUTS, MAP_SIZE, STORE,
    hashString, rng, shuffle, rankOf, suitOf, adjacent, layout,
    dealFromSeed, freshRound, solve, solvableDeal, top, stockLeft, isFree, freeSlots, canPlay, playable,
    play, useWild, draw, status, stars, clearGain, winBonus, acornsFrom,
    mapHill, dayKey, dailyHill, unlocked, nextItem, newSave, sanitize, finish, best,
  };
  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
