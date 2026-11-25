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
    { id: 'mound', ko: '둥근 둔덕', en: 'Round Mound', ja: 'まるい塚', rows: [[5], [4, 6], [3, 5, 7], [2, 4, 6, 8], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10]] },
    { id: 'twin', ko: '쌍둥이 언덕', en: 'Twin Knolls', ja: 'ふたごの丘', rows: [[3, 9], [2, 4, 8, 10], [1, 3, 5, 7, 9, 11], [0, 2, 4, 6, 8, 10, 12], [1, 3, 5, 7, 9, 11]] },
    { id: 'steps', ko: '솔숲 계단', en: 'Pine Steps', ja: '松林の階段', rows: [[0, 2], [1, 3, 5], [2, 4, 6, 8], [3, 5, 7, 9, 11], [4, 6, 8, 10, 12], [7, 9, 11]] },
    { id: 'ridge', ko: '긴 능선', en: 'Long Ridge', ja: '長い尾根', rows: [[4, 6, 8, 10, 12], [3, 5, 7, 9, 11, 13], [2, 4, 6, 8, 10, 12, 14], [3, 5, 7, 9, 11, 13], [4, 6, 8, 10, 12]] },
    { id: 'burrow', ko: '다람쥐 굴', en: 'Squirrel Burrow', ja: 'リスの巣穴', rows: [[1, 11], [0, 2, 10, 12], [1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10], [1, 3, 9, 11], [0, 2, 4, 8, 10, 12]] },
  ];
  // 31단계부터 쓰는 언덕 모양. id는 'g<단계 번호>'. 줄마다 한 장씩 늘거나(뒤가 좁은 쪽) 줄어들며(뒤가 넓은 쪽) 쌓인다.
  // 줄 가운데를 5에 맞춰 두면 인접한 줄의 x 홀짝이 번갈아 나와, 앞 줄 패가 뒤 줄 패를 빠짐없이 덮는다.
  // 10단계 묶음마다 모양 방향과 줄 수가 바뀐다(단계 40부터 일곱 줄). 한 줄에 최대 일곱 장.
  function genSpec(id) {
    const m = /^g(\d+)$/.exec(String(id));
    if (!m) return null;
    const k = Number(m[1]);
    if (k < 30 || k >= HILL_MAX) return null;
    const c = Math.floor(k / 10);
    const R = c >= 4 ? 7 : 6;
    const wideBack = c % 2 === 0;
    const rows = [];
    for (let r = 0; r < R; r += 1) {
      const size = wideBack ? R - r : r + 1;
      const x0 = 5 - (size - 1);
      rows.push(Array.from({ length: size }, (_, j) => x0 + 2 * j));
    }
    const names = wideBack
      ? { ko: '뒤가 넓은 언덕', en: 'Broad-Back Hill', ja: 'うしろの広い丘' }
      : { ko: '쌓인 언덕', en: 'Stacked Hill', ja: '積まれた丘' };
    return { id, ...names, rows };
  }
  const layoutKnown = (id) => LAYOUTS.some((l) => l.id === id) || genSpec(id) !== null;
  const layoutCache = {};
  function layout(id) {
    if (layoutCache[id]) return layoutCache[id];
    const spec = LAYOUTS.find((l) => l.id === id) || genSpec(id) || LAYOUTS[0];
    const slots = [];
    spec.rows.forEach((xs, row) => xs.forEach((x) => slots.push({ row, x, coveredBy: [] })));
    slots.forEach((slot, i) => {
      slots.forEach((other, j) => {
        if (other.row === slot.row + 1 && Math.abs(other.x - slot.x) <= 1) slot.coveredBy.push(j);
      });
      slot.i = i;
    });
    const xs = slots.map((s) => s.x);
    const result = { id: spec.id, ko: spec.ko, en: spec.en, ja: spec.ja, slots, rows: spec.rows.length, minX: Math.min(...xs), maxX: Math.max(...xs) };
    layoutCache[spec.id] = result;
    return result;
  }

  // ---------- 판 ----------
  // spec: { gold: 황금 도토리 패 수, lock: 자물쇠 패 하나와 그 열쇠 패를 둘지 }. 패 배치는 spec과 상관없이 씨앗만으로 정해진다.
  function dealFromSeed(seed, layoutId, spec) {
    const lay = layout(layoutId);
    const deck = shuffle(Array.from({ length: RANKS * SUITS }, (_, i) => i), rng(seed));
    const n = lay.slots.length;
    const deal = { layout: lay.id, cards: deck.slice(0, n), stock: deck.slice(n + 1), start: deck[n] };
    const sp = specials(seed, lay, spec);
    if (sp.gold.length) deal.gold = sp.gold;
    if (sp.lock) deal.lock = sp.lock;
    return deal;
  }
  // 자물쇠는 뒤쪽 줄(앞에서 셋째 줄부터)에, 열쇠는 앞 두 줄에 둔다. 앞 두 줄은 뒤 줄에 덮이지 않으니 열쇠는 언제나 걷을 수 있다.
  function specials(seed, lay, spec) {
    const r = rng((seed ^ 0x5bd1e995) >>> 0);
    let lock = null;
    if (spec && spec.lock) {
      const back = lay.slots.filter((s) => s.row <= lay.rows - 3).map((s) => s.i);
      const front = lay.slots.filter((s) => s.row >= lay.rows - 2).map((s) => s.i);
      if (back.length && front.length) lock = [back[Math.floor(r() * back.length)], front[Math.floor(r() * front.length)]];
    }
    const gold = [];
    const want = spec ? Math.max(0, spec.gold | 0) : 0;
    const pool = lay.slots.map((s) => s.i).filter((i) => !lock || !lock.includes(i));
    while (gold.length < want && pool.length) gold.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return { gold: gold.sort((a, b) => a - b), lock };
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
      wild: meta.wild ?? 1,
      moves: 0,
      gold: (deal.gold || []).slice(),
      lock: deal.lock ? deal.lock.slice() : null,
      cont: 0,
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
  // 자물쇠 패는 열쇠 패를 걷기 전까지 걷을 수 없다(도토리 도움으로도).
  const isLocked = (s, i) => Boolean(s.lock) && s.lock[0] === i && !s.removed[s.lock[1]];
  const takeable = (s) => freeSlots(s).filter((i) => !isLocked(s, i));
  function canPlay(s, i) {
    return isFree(s, i) && !isLocked(s, i) && adjacent(s.cards[i], top(s));
  }
  function playable(s) {
    return takeable(s).filter((i) => adjacent(s.cards[i], top(s)));
  }
  const goldTaken = (s) => (s.gold || []).filter((i) => s.removed[i]).length;
  const clearGain = (streak) => Math.min(60, 10 + 5 * (streak - 1));

  function play(s, i) {
    if (status(s) !== 'play' || !canPlay(s, i)) return null;
    return take(s, i, false);
  }
  function useWild(s, i) {
    if (status(s) !== 'play' || s.wild < 1 || !isFree(s, i) || isLocked(s, i)) return null;
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
    if (s.wild > 0 && takeable(s).length > 0) return 'play';
    return 'lost';
  }
  // 이어하기: 바구니에 깔린, 더미에서 뒤집었던 패 가운데 최근 것 k장을 다시 더미로 돌려 놓는다(맨 위 패는 그대로).
  // 52장을 새로 만들지 않고 자리만 옮기므로 판의 패는 늘 겹치지 않는다.
  function revive(s, k = 5) {
    if (status(s) !== 'lost') return null;
    const topCard = top(s);
    const drawnCards = s.stock.slice(0, s.drawn);
    const pick = [];
    for (let j = drawnCards.length - 1; j >= 0 && pick.length < k; j -= 1) if (drawnCards[j] !== topCard) pick.push(drawnCards[j]);
    if (!pick.length) return null;
    const picked = new Set(pick);
    const keep = drawnCards.filter((c) => !picked.has(c));
    const back = shuffle(pick, rng((s.seed + 977 * ((s.cont || 0) + 1)) >>> 0));
    return {
      ...s, stock: keep.concat(back, s.stock.slice(s.drawn)), drawn: keep.length,
      pile: s.pile.filter((c) => !picked.has(c)), streak: 0, cont: (s.cont || 0) + 1,
    };
  }
  // 별: 이기면 하나, 더미가 6장 이상 남으면 둘, 12장 이상이면 셋.
  // 이어하기를 쓴 판은 별 하나까지만.
  function stars(s) {
    if (status(s) !== 'won') return 0;
    if (s.cont > 0) return 1;
    const left = stockLeft(s);
    return left >= 12 ? 3 : left >= 6 ? 2 : 1;
  }
  // 이긴 판에서 별 하나를 더 받으려면 더미를 몇 장 더 남겨야 했는지. 이미 셋이면 null.
  function nextStarNeed(left) {
    const n = Math.max(0, left | 0);
    if (n >= 12) return null;
    return n >= 6 ? { next: 3, need: 12 - n } : { next: 2, need: 6 - n };
  }
  // 도토리: 점수 10점에 하나, 이기면 5개(+마무리 강화), 황금 패마다 10개. 줍기 강화가 전체를 늘린다.
  const GOLD_ACORNS = 10;
  function acornsFrom(s, save) {
    const up = save && save.up ? save.up : {};
    const won = status(s) === 'won';
    const base = Math.floor(s.score / 10) + (won ? 5 + 3 * (up.finish | 0) : 0) + GOLD_ACORNS * goldTaken(s);
    return Math.floor(base * (1 + 0.1 * (up.gather | 0)));
  }

  // ---------- 풀이(도움 없이 이길 수 있는지) ----------
  // 깊이 우선으로 찾되 같은 상태는 다시 보지 않는다. 찾은 수순을 돌려준다(['p', 슬롯] 또는 ['d']).
  function solve(deal, limit = 40000) {
    const lay = layout(deal.layout);
    const n = lay.slots.length;
    const coverMask = lay.slots.map((sl) => sl.coveredBy.reduce((m, j) => m | (1 << j), 0));
    const lockI = deal.lock ? deal.lock[0] : -1;
    const keyBit = deal.lock ? 1 << deal.lock[1] : 0;
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
        if (i === lockI && !(removed & keyBit)) continue;
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
  function solvableDeal(seed, layoutId, spec) {
    const cacheKey = `${seed}|${layoutId}|${spec ? `${spec.gold | 0}${spec.lock ? 'L' : ''}` : ''}`;
    if (solvedCache.has(cacheKey)) return solvedCache.get(cacheKey);
    const result = findDeal(seed, layoutId, spec);
    solvedCache.set(cacheKey, result);
    return result;
  }
  function findDeal(seed, layoutId, spec) {
    let last = null;
    // 새 모양(g 번호)은 풀이 가능한 판이 드물 수 있어 더 많이 찾아본다.
    const tries = /^g\d+$/.test(layoutId) ? 400 : 40;
    for (let k = 0; k < tries; k += 1) {
      const deal = dealFromSeed((seed + k * 7919) >>> 0, layoutId, spec);
      last = deal;
      if (solve(deal)) return { deal, seed: (seed + k * 7919) >>> 0 };
    }
    return { deal: last, seed };
  }

  // ---------- 언덕 지도와 오늘의 언덕 ----------
  // 단계 번호(언덕 번호)는 0부터. 60단계까지가 기본 지도이고, 그 뒤로는 끝없는 무한 모드.
  const BASE_STAGES = 60;
  const HILL_MAX = 99999;
  // 10단계 묶음마다 새 테마. 31단계(묶음 3)부터 쓴다. 0~29단계는 예전 그대로.
  const THEMES = [
    { ko: '달빛 숲', en: 'Moonlit Forest', ja: '月明かりの森', ground: '#8ea3c9' },
    { ko: '밤송이 골짜기', en: 'Chestnut Valley', ja: 'いがぐりの谷', ground: '#c08a4e' },
    { ko: '첫눈 언덕', en: 'First Snow Hill', ja: '初雪の丘', ground: '#e6f0f4' },
    { ko: '단풍 불꽃', en: 'Maple Blaze', ja: 'もみじの炎', ground: '#d0603f' },
    { ko: '호숫가 갈대', en: 'Lakeside Reeds', ja: '湖畔の葦', ground: '#8fb88f' },
  ];
  function themeOf(n) {
    const k = Number(n) | 0;
    if (k < 30 || k >= HILL_MAX) return null;
    return THEMES[(Math.floor(k / 10) - 3) % THEMES.length];
  }
  const HILL_NAMES = {
    ko: ['밤나무 아래', '첫 서리 둔덕', '갈대 바람길', '버섯 그늘', '솔방울 비탈', '단풍 오솔길', '개울 건너', '옹이 바위', '부엉이 고개', '안개 언덕'],
    ja: ['栗の木の下', '初霜の塚', '葦の風の道', 'きのこの木陰', '松ぼっくりの坂', '紅葉の小道', '小川の向こう', 'こぶ岩', 'ふくろう峠', '霧の丘'],
    en: ['Chestnut Shade', 'First Frost', 'Reed Path', 'Mushroom Hollow', 'Pinecone Slope', 'Maple Lane', 'Across the Brook', 'Knot Rock', 'Owl Pass', 'Misty Hill'],
  };
  // 특수 패: 4단계부터 황금 도토리 패 하나(31단계부터 둘), 11단계부터 홀수 번째 언덕(11, 13, …)마다 자물쇠와 열쇠.
  function hillSpec(k) {
    return { gold: k >= 30 ? 2 : k >= 3 ? 1 : 0, lock: k >= 10 && k % 2 === 0 };
  }
  function mapHill(n) {
    const k = Math.max(0, Math.min(HILL_MAX - 1, n | 0));
    if (k >= 30) {
      const t = themeOf(k);
      const i = k % 10 + 1;
      return { n: k, layout: `g${k}`, seed: hashString(`acornhill-map-${k}`), name: { ko: `${t.ko} ${i}`, en: `${t.en} ${i}`, ja: `${t.ja} ${i}` }, lap: Math.floor(k / 10), theme: t, spec: hillSpec(k) };
    }
    // 처음 다섯 언덕은 작은 모양부터, 그 뒤로는 모양을 돌려 가며 쓴다.
    const order = ['mound', 'twin', 'steps', 'mound', 'burrow', 'twin', 'ridge', 'steps', 'burrow', 'ridge'];
    const layoutId = order[k % order.length];
    return { n: k, layout: layoutId, seed: hashString(`acornhill-map-${k}`), name: { ko: HILL_NAMES.ko[k % 10], en: HILL_NAMES.en[k % 10], ja: HILL_NAMES.ja[k % 10] }, lap: Math.floor(k / 10), spec: hillSpec(k) };
  }
  function dayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function dailyHill(key) {
    const seed = hashString(`acornhill-day-${key}`);
    return { key, layout: LAYOUTS[seed % LAYOUTS.length].id, seed, spec: { gold: 1, lock: (seed >>> 3) % 2 === 0 } };
  }

  // ---------- 겨울 창고 ----------
  const STORE = [
    { at: 20, icon: '🫙', ko: '도토리 단지', en: 'Acorn jar', ja: 'どんぐりの壺' },
    { at: 60, icon: '🧺', ko: '밤 바구니', en: 'Chestnut basket', ja: '栗のかご' },
    { at: 120, icon: '🍄', ko: '버섯 등잔', en: 'Mushroom lamp', ja: 'きのこのランプ' },
    { at: 200, icon: '🧣', ko: '털실 목도리', en: 'Knitted scarf', ja: '毛糸のマフラー' },
    { at: 300, icon: '🍁', ko: '단풍 액자', en: 'Maple frame', ja: '紅葉の額縁' },
    { at: 420, icon: '🛏️', ko: '솔잎 이불', en: 'Pine-needle quilt', ja: '松葉のふとん' },
    { at: 560, icon: '🍯', ko: '꿀단지', en: 'Honey pot', ja: 'はちみつ壺' },
    { at: 720, icon: '🕰️', ko: '호두 시계', en: 'Walnut clock', ja: 'くるみの時計' },
    { at: 900, icon: '🔥', ko: '작은 난로', en: 'Little stove', ja: '小さなストーブ' },
    { at: 1100, icon: '🎐', ko: '바람 풍경', en: 'Wind chime', ja: '風鈴' },
    { at: 1350, icon: '⭐', ko: '별 모빌', en: 'Star mobile', ja: '星のモビール' },
    { at: 1650, icon: '❄️', ko: '눈 지붕', en: 'Snowy roof', ja: '雪の屋根' },
  ];
  const unlocked = (total) => STORE.filter((item) => total >= item.at).length;
  function nextItem(total) {
    return STORE.find((item) => total < item.at) || null;
  }

  // ---------- 다람쥐 가게(도토리 쓰기) ----------
  // acorns는 지금까지 모은 도토리 전부(겨울 창고 해금 기준), spent는 가게에서 쓴 도토리. 지갑 = acorns - spent.
  const ITEMS = {
    wild: { price: 40, icon: '🌰', max: 99 },
    undo: { price: 20, icon: '↩️', max: 99 },
  };
  // 강화: max가 0이면 끝없이 올린다(줍기).
  const UPGRADES = {
    pouch: { icon: '👝', max: 2, cost: (lv) => [250, 750][lv] },
    finish: { icon: '🏁', max: 5, cost: (lv) => 150 * (lv + 1) },
    gather: { icon: '🧺', max: 0, cost: (lv) => Math.round(120 * 1.4 ** lv / 10) * 10 },
  };
  const BACKS = [
    { id: 'oak', price: 0 },
    { id: 'maple', price: 200 },
    { id: 'moon', price: 400 },
    { id: 'snow', price: 600 },
    { id: 'gold', price: 1500 },
  ];
  const continueCost = (cont) => 30 * 2 ** Math.max(0, cont | 0);
  const AD_WILD_PER_DAY = 3;
  const wallet = (save) => Math.max(0, (save.acorns | 0) - (save.spent | 0));
  const upLevel = (save, id) => (save.up && save.up[id]) | 0;
  function upCost(save, id) {
    const u = UPGRADES[id];
    if (!u) return null;
    const lv = upLevel(save, id);
    if (u.max && lv >= u.max) return null;
    return u.cost(lv);
  }
  // 산 뒤의 저장을 돌려준다. 도토리가 모자라거나 살 수 없으면 null.
  function buy(save, kind, id) {
    const out = sanitize(save);
    let price = null;
    if (kind === 'item' && ITEMS[id] && out.inv[id] < ITEMS[id].max) price = ITEMS[id].price;
    else if (kind === 'up') price = upCost(out, id);
    else if (kind === 'back') { const b = BACKS.find((x) => x.id === id); if (b && !out.backs.includes(id)) price = b.price; }
    if (price === null || wallet(out) < price) return null;
    out.spent += price;
    if (kind === 'item') out.inv[id] += 1;
    else if (kind === 'up') out.up[id] += 1;
    else { out.backs.push(id); out.back = id; }
    return out;
  }
  // 판 시작 때의 도토리 도움 수(주머니 강화마다 하나 더).
  const startWild = (save) => 1 + upLevel(save, 'pouch');

  // ---------- 오늘의 언덕 연속 출석 ----------
  // 오늘의 언덕을 끝낼 때(이기든 지든) 하루에 한 번. 7일마다 처음으로 돌아간다.
  function attendReward(days) {
    const d = ((Math.max(1, days) - 1) % 7) + 1;
    return { acorns: 10 * d, wild: d === 3 ? 1 : d === 7 ? 2 : 0, day: d };
  }
  function prevDayKey(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return dayKey(new Date(y, m - 1, d - 1));
  }

  // ---------- 저장 ----------
  function newSave() {
    return {
      v: 1, hill: 0, stars: [], acorns: 0, best: 0, bestStreak: 0, wins: 0, played: 0, daily: {}, round: null,
      spent: 0, inv: { wild: 0, undo: 0 }, up: { pouch: 0, finish: 0, gather: 0 }, backs: ['oak'], back: 'oak', att: { last: '', days: 0 }, adWild: { day: '', n: 0 },
    };
  }
  const num = (x, lo, hi, d = lo) => (Number.isFinite(Number(x)) ? Math.max(lo, Math.min(hi, Math.floor(Number(x)))) : d);
  function validRound(r) {
    if (!r || typeof r !== 'object') return null;
    if (!layoutKnown(r.layout)) return null;
    const n = layout(r.layout).slots.length;
    const okCard = (c) => Number.isInteger(c) && c >= 0 && c < RANKS * SUITS;
    if (!Array.isArray(r.cards) || r.cards.length !== n || !r.cards.every(okCard)) return null;
    if (!Array.isArray(r.removed) || r.removed.length !== n) return null;
    if (!Array.isArray(r.stock) || !r.stock.every(okCard) || r.cards.length + r.stock.length !== RANKS * SUITS - 1) return null;
    if (!Array.isArray(r.pile) || r.pile.length < 1 || !r.pile.every(okCard)) return null;
    const s = {
      layout: r.layout, cards: r.cards.slice(), removed: r.removed.map(Boolean), stock: r.stock.slice(),
      drawn: num(r.drawn, 0, r.stock.length), pile: r.pile.slice(), streak: num(r.streak, 0, 99), bestStreak: num(r.bestStreak, 0, 99),
      score: num(r.score, 0, 5000), wild: num(r.wild, 0, 9), moves: num(r.moves, 0, 999),
      mode: r.mode === 'day' ? 'day' : 'map', key: r.mode === 'day' ? String(r.key || '') : num(r.key, 0, HILL_MAX - 1), seed: num(r.seed, 0, 4294967295),
      gold: Array.isArray(r.gold) ? [...new Set(r.gold.filter((i) => Number.isInteger(i) && i >= 0 && i < n))].slice(0, 3) : [],
      lock: Array.isArray(r.lock) && r.lock.length === 2 && r.lock.every((i) => Number.isInteger(i) && i >= 0 && i < n) && r.lock[0] !== r.lock[1] ? r.lock.slice() : null,
      cont: num(r.cont, 0, 9, 0),
    };
    // 바구니와 더미가 같은 패를 겹쳐 갖지 않는지(이어하기 뒤에도 지켜져야 한다).
    const seen = new Set(s.cards);
    if (s.stock.some((c) => seen.has(c))) return null;
    return s;
  }
  function sanitize(raw) {
    const base = newSave();
    if (!raw || typeof raw !== 'object') return base;
    const out = {
      v: 1,
      hill: num(raw.hill, 0, HILL_MAX, 0),
      stars: Array.isArray(raw.stars) ? raw.stars.slice(0, HILL_MAX).map((x) => num(x, 0, 3, 0)) : [],
      acorns: num(raw.acorns, 0, 1e7, 0),
      best: num(raw.best, 0, 5000, 0),
      bestStreak: num(raw.bestStreak, 0, 99, 0),
      wins: num(raw.wins, 0, 1e6, 0),
      played: num(raw.played, 0, 1e6, 0),
      daily: {},
      round: validRound(raw.round),
      spent: 0,
      inv: { wild: 0, undo: 0 },
      up: { pouch: 0, finish: 0, gather: 0 },
      backs: ['oak'],
      back: 'oak',
      att: { last: '', days: 0 },
      adWild: { day: '', n: 0 },
    };
    out.spent = num(raw.spent, 0, out.acorns, 0);
    if (raw.inv && typeof raw.inv === 'object') Object.keys(ITEMS).forEach((k) => { out.inv[k] = num(raw.inv[k], 0, ITEMS[k].max, 0); });
    if (raw.up && typeof raw.up === 'object') Object.keys(UPGRADES).forEach((k) => { out.up[k] = num(raw.up[k], 0, UPGRADES[k].max || 999, 0); });
    if (Array.isArray(raw.backs)) raw.backs.forEach((b) => { if (BACKS.some((x) => x.id === b) && !out.backs.includes(b)) out.backs.push(b); });
    if (out.backs.includes(raw.back)) out.back = raw.back;
    const isKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k));
    if (raw.att && isKey(raw.att.last)) out.att = { last: raw.att.last, days: num(raw.att.days, 1, 99999, 1) };
    if (raw.adWild && isKey(raw.adWild.day)) out.adWild = { day: raw.adWild.day, n: num(raw.adWild.n, 0, AD_WILD_PER_DAY, 0) };
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
    out.acorns += acornsFrom(s, out);
    out.best = Math.max(out.best, s.score);
    out.bestStreak = Math.max(out.bestStreak, s.bestStreak);
    if (st === 'won') out.wins += 1;
    if (s.mode === 'map') {
      const k = Number(s.key);
      const got = stars(s);
      while (out.stars.length <= k) out.stars.push(0);
      out.stars[k] = Math.max(out.stars[k], got);
      if (st === 'won' && k === out.hill) out.hill = Math.min(HILL_MAX, k + 1);
    } else {
      const prev = out.daily[s.key] || { score: 0, won: false };
      out.daily[s.key] = { score: Math.max(prev.score, s.score), won: prev.won || st === 'won' };
      if (out.att.last !== s.key) {
        const days = out.att.last && out.att.last === prevDayKey(s.key) ? out.att.days + 1 : 1;
        const rw = attendReward(days);
        out.att = { last: String(s.key), days };
        out.acorns += rw.acorns;
        out.inv.wild = Math.min(ITEMS.wild.max, out.inv.wild + rw.wild);
      }
    }
    out.round = null;
    return out;
  }
  const best = (save) => sanitize(save).best;

  const logic = {
    RANKS, SUITS, LAYOUTS, BASE_STAGES, HILL_MAX, THEMES, STORE,
    hashString, rng, shuffle, rankOf, suitOf, adjacent, layout, layoutKnown,
    dealFromSeed, freshRound, solve, solvableDeal, top, stockLeft, isFree, freeSlots, canPlay, playable,
    play, useWild, draw, status, stars, clearGain, winBonus, acornsFrom, nextStarNeed,
    mapHill, themeOf, dayKey, dailyHill, unlocked, nextItem, newSave, sanitize, finish, best,
    isLocked, takeable, goldTaken, revive, GOLD_ACORNS, hillSpec,
    ITEMS, UPGRADES, BACKS, continueCost, AD_WILD_PER_DAY, wallet, upLevel, upCost, buy, startWild, attendReward, prevDayKey,
  };
  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
