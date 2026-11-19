// 붉은 실 단서판의 규칙. DOM 없이 쓰며 브라우저와 node 테스트가 같은 코드를 읽는다.
// 한 사건 = 낱말 카드 16장, 숨은 공통점 4개(넷씩). 실 4가닥을 다 끊기 전에 넷을 모두 밝히면 해결.
(function (root) {
  const Bank = typeof module !== 'undefined' ? require('./bank') : root.Bank;

  const GROUP = 4;
  const GROUPS = 4;
  const STRANDS = 4;
  const HINTS = 1;

  function mulberry(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(text) {
    let h = 2166136261;
    for (const ch of String(text)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffled(list, rand) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function dateKey(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // 사건 파일 단계가 오를수록 말장난 주제(3단계)가 늘어난다.
  function caseTiers(level) {
    if (level <= 2) return [1, 1, 1, 2];
    if (level <= 5) return [1, 1, 2, 2];
    if (level <= 9) return [1, 2, 2, 3];
    if (level <= 14) return [1, 2, 3, 3];
    return [2, 2, 3, 3];
  }
  const DAILY_TIERS = [1, 2, 2, 3];

  // 고른 주제끼리 겹치는 낱말을 빼고 넷씩 뽑는다. 판의 어떤 낱말도 다른 고른 주제의 목록에 없다.
  function makePuzzle(lang, seed, tiers) {
    const bank = Bank[lang] || Bank.en;
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const rand = mulberry(seed * 31 + attempt * 7919 + 1);
      const want = attempt < 200 ? tiers.slice() : [];
      const pool = shuffled(bank, rand);
      const chosen = [];
      for (const cat of pool) {
        if (chosen.length === GROUPS) break;
        if (chosen.some((c) => c.fam === cat.fam)) continue;
        if (want.length) {
          const at = want.indexOf(cat.tier);
          if (at < 0) continue;
          want.splice(at, 1);
        }
        chosen.push(cat);
      }
      if (chosen.length < GROUPS) continue;
      const groups = [];
      for (const cat of chosen) {
        const others = new Set(chosen.filter((c) => c !== cat).flatMap((c) => c.words));
        const free = cat.words.filter((w) => !others.has(w));
        if (free.length < GROUP) break;
        groups.push({ id: cat.id, name: cat.name, tier: cat.tier, words: shuffled(free, rand).slice(0, GROUP) });
      }
      if (groups.length < GROUPS) continue;
      const all = groups.flatMap((g) => g.words);
      if (new Set(all).size !== all.length) continue;
      return { groups, order: shuffled(all, rand) };
    }
    throw new Error('사건을 만들지 못함');
  }

  function newRun(kind, key, lang) {
    const seed = hash(`${kind}:${key}:${lang}`);
    const tiers = kind === 'daily' ? DAILY_TIERS : caseTiers(Number(key) || 1);
    const { groups, order } = makePuzzle(lang, seed, tiers);
    return { kind, key: String(key), lang, groups, order, solved: [], sel: [], mistakes: 0, hints: 0, hinted: [], guesses: [], done: null };
  }

  const groupOf = (run, word) => run.groups.findIndex((g) => g.words.includes(word));
  const remaining = (run) => run.order.filter((w) => !run.solved.includes(groupOf(run, w)));
  const strandsLeft = (run) => Math.max(0, STRANDS - run.mistakes);

  function toggle(run, word) {
    if (run.done || !remaining(run).includes(word)) return run;
    if (run.sel.includes(word)) return { ...run, sel: run.sel.filter((w) => w !== word) };
    if (run.sel.length >= GROUP) return run;
    return { ...run, sel: [...run.sel, word] };
  }

  // 넷을 묶어 본다. 결과: solved, close(하나 빼고 맞음), wrong, repeat(이미 해 본 조합), invalid
  function submit(run) {
    if (run.done || run.sel.length !== GROUP) return { run, result: 'invalid' };
    const sig = run.sel.slice().sort().join('|');
    if (run.guesses.includes(sig)) return { run: { ...run }, result: 'repeat' };
    const counts = {};
    for (const w of run.sel) counts[groupOf(run, w)] = (counts[groupOf(run, w)] || 0) + 1;
    const best = Math.max(...Object.values(counts));
    const guesses = [...run.guesses, sig];
    if (best === GROUP) {
      const g = groupOf(run, run.sel[0]);
      const solved = [...run.solved, g];
      const done = solved.length === GROUPS ? 'win' : null;
      return { run: { ...run, solved, sel: [], guesses, done }, result: 'solved', group: g };
    }
    const mistakes = run.mistakes + 1;
    let done = null;
    let solved = run.solved;
    if (mistakes >= STRANDS) {
      done = 'lose';
      solved = [...run.solved, ...run.groups.map((_, i) => i).filter((i) => !run.solved.includes(i))];
    }
    return { run: { ...run, mistakes, guesses, sel: done ? [] : run.sel, solved, done }, result: best === GROUP - 1 ? 'close' : 'wrong' };
  }

  function shuffleRun(run, seed) {
    return { ...run, order: shuffled(run.order, mulberry(seed)) };
  }

  // 돋보기: 아직 못 푼 주제에서 같은 편 두 장을 알려 준다.
  function hint(run) {
    if (run.done || run.hints >= HINTS) return { run, pair: null };
    const g = run.groups.findIndex((_, i) => !run.solved.includes(i));
    if (g < 0) return { run, pair: null };
    const pair = run.groups[g].words.slice(0, 2);
    return { run: { ...run, hints: run.hints + 1, hinted: pair, sel: pair.slice() }, pair };
  }

  // 도장: 실을 하나도 안 끊으면 3개, 1~2가닥이면 2개, 3가닥이면 1개, 못 풀면 0개. 돋보기는 도장 하나를 덜어 낸다(최소 1).
  function stamps(run) {
    if (run.done !== 'win') return 0;
    let s = run.mistakes === 0 ? 3 : run.mistakes <= 2 ? 2 : 1;
    if (run.hints > 0) s = Math.max(1, s - 1);
    return s;
  }

  function newState() {
    return { v: 1, level: 1, run: null, daily: {}, found: {}, stats: { played: 0, won: 0, flawless: 0, stampsTotal: 0 } };
  }

  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  const isInt = (n, min) => Number.isInteger(n) && n >= min;

  function validRun(r) {
    if (!isObj(r) || !['daily', 'case'].includes(r.kind) || !Array.isArray(r.groups) || r.groups.length !== GROUPS) return false;
    if (!r.groups.every((g) => isObj(g) && typeof g.name === 'string' && Array.isArray(g.words) && g.words.length === GROUP)) return false;
    const all = r.groups.flatMap((g) => g.words);
    if (!Array.isArray(r.order) || r.order.length !== all.length || !all.every((w) => r.order.includes(w))) return false;
    if (!Array.isArray(r.solved) || !r.solved.every((i) => isInt(i, 0) && i < GROUPS)) return false;
    return isInt(r.mistakes, 0) && r.mistakes <= STRANDS;
  }

  // 저장값이 깨졌거나 예전 형식이어도 앱이 열리도록 다듬는다.
  function sanitize(raw) {
    const base = newState();
    if (!isObj(raw)) return base;
    const out = { ...base };
    if (isInt(raw.level, 1)) out.level = Math.min(raw.level, 9999);
    if (isObj(raw.daily)) {
      for (const [k, v] of Object.entries(raw.daily)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isInt(v, 0) && v <= 3) out.daily[k] = v;
    }
    if (isObj(raw.found)) for (const [k, v] of Object.entries(raw.found)) if (typeof k === 'string' && v) out.found[k] = true;
    if (isObj(raw.stats)) for (const k of Object.keys(base.stats)) if (isInt(raw.stats[k], 0)) out.stats[k] = raw.stats[k];
    if (validRun(raw.run)) {
      const r = raw.run;
      out.run = {
        ...r,
        key: String(r.key),
        sel: Array.isArray(r.sel) ? r.sel.filter((w) => r.order.includes(w)).slice(0, GROUP) : [],
        hints: isInt(r.hints, 0) ? r.hints : 0,
        hinted: Array.isArray(r.hinted) ? r.hinted : [],
        guesses: Array.isArray(r.guesses) ? r.guesses.filter((g) => typeof g === 'string') : [],
        done: ['win', 'lose'].includes(r.done) ? r.done : null,
        solved: [...new Set(r.solved)],
      };
    }
    return out;
  }

  // 사건이 끝나면 기록을 남긴다. 사건 파일을 풀면 다음 단계가 열린다. 오늘의 사건은 가장 좋은 도장만 남긴다.
  function finish(state, run) {
    const s = { ...state, stats: { ...state.stats }, daily: { ...state.daily }, found: { ...state.found } };
    const got = stamps(run);
    s.stats.played += 1;
    if (run.done === 'win') {
      s.stats.won += 1;
      if (run.mistakes === 0 && run.hints === 0) s.stats.flawless += 1;
      s.stats.stampsTotal += got;
      for (const g of run.groups) s.found[g.id] = true;
      if (run.kind === 'case' && Number(run.key) === s.level) s.level += 1;
    }
    if (run.kind === 'daily') s.daily[run.key] = Math.max(s.daily[run.key] || 0, got);
    return s;
  }

  const totalTopics = (lang) => (Bank[lang] || Bank.en).length;
  const foundCount = (state, lang) => (Bank[lang] || Bank.en).filter((c) => state.found[c.id]).length;

  const logic = {
    GROUP, GROUPS, STRANDS, HINTS, DAILY_TIERS,
    mulberry, hash, shuffled, dateKey, caseTiers, makePuzzle, newRun, groupOf, remaining, strandsLeft,
    toggle, submit, shuffleRun, hint, stamps, newState, sanitize, finish, totalTopics, foundCount, validRun,
  };

  if (typeof module !== 'undefined') module.exports = logic;
  else root.Logic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
