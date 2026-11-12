// 게임 규칙만 담은 순수 로직. DOM을 쓰지 않아 node --test로 검증할 수 있다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DinoState = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = 1;
  const NEEDS = ['food', 'clean', 'fun', 'energy'];
  // 분당 감소량. 한 번 돌본 뒤 5분쯤 지나면 다시 돌볼 수 있는 속도다.
  const DECAY_PER_MIN = { food: 2.2, clean: 1.6, fun: 2.2, energy: 1.4 };
  const STAGE_AT = { baby: 0, kid: 60, adult: 200 };
  // clip은 미리 만든 음성의 재생 속도. 어린 공룡일수록 조금 빠르고 높게 들린다.
  const VOICE_AGE = {
    baby: { pitch: 1.3, rate: 1.05, hz: 1.7, clip: 1.08 },
    kid: { pitch: 1.12, rate: 1, hz: 1.3, clip: 1.04 },
    adult: { pitch: 1, rate: 1, hz: 1, clip: 1 },
  };
  const VOICE_PITCH_MAX = 1.75; // 이보다 높으면 말이 뭉개져 알아듣기 어렵다.
  const FULL_AT = 90; // 이 값 이상이면 돌봄을 거절한다(무한 반복 방지).
  const AWAY_FLOOR = 25; // 앱을 꺼 둔 동안 내려갈 수 있는 하한. 돌아왔을 때 벌을 주지 않는다.
  const AWAY_MAX_HOURS = 8;
  const CARE_GROWTH = 8;
  const CARE_STARS = 2;
  const DAILY_COUNT = 3;
  const DAILY_STARS = 10;
  const STAMP_CARD = 7;
  const STAMP_BONUS = 30;
  const MAX_LEVEL = 30;
  const BOSS_INDEX = 5;
  const DUEL_HP = 50;
  const DUEL_POWER = 10;
  const DUEL_STRONG = 5;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function newSave(now = Date.now()) {
    return {
      v: VERSION,
      dinos: [],
      active: null,
      stars: 0,
      hats: [],
      fossils: [],
      themes: ['beach'],
      theme: 'beach',
      daily: null,
      stamps: 0,
      team: [],
      adv: { cleared: {} },
      achv: [],
      idle: { coins: 0, total: 0, life: 0, tapLv: 0, workers: {}, gems: 0, moves: 0, rank: 0, rainAt: 0, rushAt: 0 },
      opts: { sound: true, voice: true },
      lastSeen: now,
    };
  }

  function newDino(species, name, color, now = Date.now()) {
    return {
      id: `${species}-${now}`,
      species,
      name,
      color,
      stage: 'baby',
      growth: 0,
      needs: { food: 70, clean: 80, fun: 70, energy: 80 },
      hat: null,
      born: now,
    };
  }

  // 코인 값이 깨져 있어도 게임이 멈추지 않게 숫자와 일꾼 목록만 남긴다.
  function cleanIdle(base, stored) {
    const idle = { ...base };
    for (const key of Object.keys(base)) {
      if (key !== 'workers' && Number.isFinite(stored?.[key])) idle[key] = stored[key];
    }
    const workers = stored?.workers;
    if (workers && typeof workers === 'object') {
      idle.workers = Object.fromEntries(Object.entries(workers).filter(([, lv]) => Number.isFinite(lv)));
    }
    return idle;
  }

  // 저장본이 깨졌거나 비어 있어도 항상 쓸 수 있는 세이브를 돌려준다.
  function load(raw, now = Date.now()) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return newSave(now);
    }
    if (!data || typeof data !== 'object' || data.v !== VERSION || !Array.isArray(data.dinos)) {
      return newSave(now);
    }
    const base = newSave(now);
    const save = { ...base, ...data, idle: cleanIdle(base.idle, data.idle), opts: { ...base.opts, ...data.opts } };
    if (!save.dinos.some((d) => d.id === save.active)) save.active = save.dinos[0]?.id ?? null;
    save.team = save.team.filter((id) => save.dinos.some((d) => d.id === id));
    if (!Array.isArray(save.achv)) save.achv = [];
    return save;
  }

  const active = (save) => save.dinos.find((d) => d.id === save.active) || null;

  function tick(dino, dtSec, { sleeping = false } = {}) {
    const mins = dtSec / 60;
    for (const key of NEEDS) {
      if (sleeping && key === 'energy') continue;
      const rate = sleeping ? DECAY_PER_MIN[key] / 3 : DECAY_PER_MIN[key];
      dino.needs[key] = clamp(dino.needs[key] - rate * mins, 0, 100);
    }
  }

  function catchUp(save, now = Date.now()) {
    const hours = clamp((now - save.lastSeen) / 3600000, 0, AWAY_MAX_HOURS);
    const mins = hours * 60;
    for (const dino of save.dinos) {
      for (const key of NEEDS) {
        const start = dino.needs[key];
        const dropped = start - DECAY_PER_MIN[key] * mins;
        // 이미 하한보다 낮았다면 더 내리지 않는다.
        dino.needs[key] = Math.min(start, Math.max(AWAY_FLOOR, dropped));
      }
    }
    save.lastSeen = now;
  }

  // 레벨은 성장 점수 하나에서 계산한다. 돌봄과 전투가 같은 점수를 올린다.
  const xpToNext = (level) => 20 + level * 8;
  function maxGrowth() {
    let total = 0;
    for (let l = 1; l < MAX_LEVEL; l++) total += xpToNext(l);
    return total;
  }
  function levelInfo(growth) {
    let level = 1;
    let left = growth;
    while (level < MAX_LEVEL && left >= xpToNext(level)) {
      left -= xpToNext(level);
      level += 1;
    }
    return { level, into: left, need: xpToNext(level) };
  }

  function stageFor(growth) {
    if (growth >= STAGE_AT.adult) return 'adult';
    if (growth >= STAGE_AT.kid) return 'kid';
    return 'baby';
  }

  // 어릴수록 목소리가 높다. slot은 기기 음성이 여럿일 때 해설과 다른 음성을 쓰기 위한 번호다.
  function voiceFor(voices, species, stage = 'adult') {
    const v = voices[species];
    const age = VOICE_AGE[stage];
    return {
      slot: 1,
      species,
      clipRate: age.clip,
      pitch: Math.min(VOICE_PITCH_MAX, v.pitch * age.pitch),
      rate: v.rate * age.rate,
      cry: { ...v.cry, hz: v.cry.hz * age.hz },
    };
  }

  function grow(dino, points) {
    const before = dino.stage;
    dino.growth = Math.min(maxGrowth(), dino.growth + points);
    dino.stage = stageFor(dino.growth);
    return dino.stage !== before ? dino.stage : null;
  }

  // 돌봄 한 번. 이미 충분하면 ok:false를 돌려주고 아무것도 바꾸지 않는다.
  function care(save, need, amount) {
    const dino = active(save);
    if (dino.needs[need] >= FULL_AT) return { ok: false };
    dino.needs[need] = clamp(dino.needs[need] + amount, 0, 100);
    save.stars += CARE_STARS;
    return { ok: true, stars: CARE_STARS, stageUp: grow(dino, CARE_GROWTH) };
  }

  // 미니게임은 언제나 할 수 있지만, 성장은 심심할 때 놀아 준 경우에만 오른다.
  function finishPlay(save, { stars, fun }) {
    const dino = active(save);
    const wasBored = dino.needs.fun < FULL_AT;
    dino.needs.fun = clamp(dino.needs.fun + fun, 0, 100);
    save.stars += stars;
    return { stars, stageUp: wasBored ? grow(dino, CARE_GROWTH + 4) : null };
  }

  function buyHat(save, hat) {
    if (save.hats.includes(hat.id) || save.stars < hat.price) return false;
    save.stars -= hat.price;
    save.hats.push(hat.id);
    return true;
  }

  function buyTheme(save, theme) {
    if (save.themes.includes(theme.id) || save.stars < theme.price) return false;
    save.stars -= theme.price;
    save.themes.push(theme.id);
    return true;
  }

  function dateKey(now) {
    const d = new Date(now);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // 날이 바뀌면 미션 3개를 새로 뽑는다.
  function ensureDaily(save, pool, now = Date.now(), rng = Math.random) {
    const date = dateKey(now);
    if (save.daily?.date === date) return false;
    const missions = pool
      .map((m) => ({ m, key: rng() }))
      .sort((a, b) => a.key - b.key)
      .slice(0, DAILY_COUNT)
      .map(({ m }) => ({ id: m.id, goal: m.goal, done: 0 }));
    save.daily = { date, missions, claimed: false };
    return true;
  }

  // 이번 걸음으로 미션 하나가 끝났으면 true.
  function missionStep(save, id) {
    const m = save.daily?.missions.find((x) => x.id === id);
    if (!m || m.done >= m.goal) return false;
    m.done += 1;
    return m.done >= m.goal;
  }

  const missionsDone = (save) => !!save.daily && save.daily.missions.every((m) => m.done >= m.goal);

  // 도장 7개마다 큰 보너스. 며칠 걸러도 도장은 사라지지 않는다.
  function claimDaily(save) {
    if (!missionsDone(save) || save.daily.claimed) return null;
    save.daily.claimed = true;
    save.stamps += 1;
    const stars = save.stamps % STAMP_CARD === 0 ? STAMP_BONUS : DAILY_STARS;
    save.stars += stars;
    return { stars, stamps: save.stamps };
  }

  function newDuel() {
    return { hp: [DUEL_HP, DUEL_HP], power: [0, 0], winner: null };
  }

  // 누를 때마다 힘이 모이고, 다 모이면 다음 한 번이 세게 들어간다.
  function duelHit(duel, player) {
    if (duel.winner !== null) return { strong: false };
    const strong = duel.power[player] >= DUEL_POWER;
    const foe = 1 - player;
    duel.power[player] = strong ? 0 : duel.power[player] + 1;
    duel.hp[foe] = Math.max(0, duel.hp[foe] - (strong ? DUEL_STRONG : 1));
    if (duel.hp[foe] === 0) duel.winner = player;
    return { strong };
  }

  const adultCount = (save) => save.dinos.filter((d) => d.stage === 'adult').length;
  // 아기가 어린이로 자라면 다음 알을 받을 수 있다.
  const canHatch = (save) => save.dinos.every((d) => d.stage !== 'baby');

  const stageKey = (regionId, index) => `${regionId}-${index}`;
  const regionCleared = (save, regionId) => !!save.adv.cleared[stageKey(regionId, BOSS_INDEX)];

  function isUnlocked(save, species) {
    return !species.unlock || regionCleared(save, species.unlock);
  }

  function stageOpen(save, regions, regionIndex, index) {
    if (regionIndex > 0 && !regionCleared(save, regions[regionIndex - 1].id)) return false;
    return index === 0 || !!save.adv.cleared[stageKey(regions[regionIndex].id, index - 1)];
  }

  // 이긴 스테이지를 기록하고 출전한 공룡에게 경험치를 나눈다. 처음 깨면 보상이 크다.
  function finishStage(save, region, index, rating, teamIds) {
    const key = stageKey(region.id, index);
    const first = !save.adv.cleared[key];
    save.adv.cleared[key] = Math.max(save.adv.cleared[key] || 0, rating);
    const boss = index === BOSS_INDEX;
    const xp = Math.round((14 + (region.level + index) * 5) * (boss ? 2 : 1) * (first ? 1 : 0.5));
    const stars = first ? (boss ? 30 : 6) + rating : rating;
    save.stars += stars;
    const stageUps = [];
    for (const id of teamIds) {
      const dino = save.dinos.find((d) => d.id === id);
      const up = grow(dino, xp);
      if (up) stageUps.push({ dino, stage: up });
    }
    if (first && boss && !save.themes.includes(region.theme)) save.themes.push(region.theme);
    return { first, xp, stars, stageUps, boss };
  }

  // 기기를 바꿀 때 옮겨 적는 저장 코드. 한글 이름이 깨지지 않게 UTF-8로 바꿔서 base64로 만든다.
  const CODE_HEAD = 'KK1-';
  function exportCode(save) {
    const bytes = new TextEncoder().encode(JSON.stringify(save));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return CODE_HEAD + btoa(bin);
  }

  // 코드가 틀리거나 공룡이 없는 저장이면 null. 쓸 수 있으면 load를 거친 저장본을 돌려준다.
  function importCode(code, now = Date.now()) {
    const text = String(code).replace(/\s+/g, '');
    if (!text.startsWith(CODE_HEAD)) return null;
    try {
      const bin = atob(text.slice(CODE_HEAD.length));
      const raw = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      const data = JSON.parse(raw);
      const ok = data && data.v === VERSION && Array.isArray(data.dinos) && data.dinos.length > 0
        && data.dinos.every((d) => d && typeof d.id === 'string' && typeof d.species === 'string' && typeof d.name === 'string'
          && Number.isFinite(d.growth) && d.needs && typeof d.needs === 'object');
      return ok ? load(raw, now) : null;
    } catch {
      return null;
    }
  }

  function touch(save, now = Date.now()) {
    save.lastSeen = now;
    return JSON.stringify(save);
  }

  return {
    NEEDS, FULL_AT, STAGE_AT, AWAY_FLOOR, STAMP_CARD, MAX_LEVEL, BOSS_INDEX,
    levelInfo, stageOpen, stageKey, regionCleared, finishStage,
    newSave, newDino, load, active, tick, catchUp, stageFor, voiceFor, grow, care, finishPlay,
    DUEL_HP, DUEL_POWER, newDuel, duelHit,
    buyHat, buyTheme, ensureDaily, missionStep, missionsDone, claimDaily,
    adultCount, canHatch, isUnlocked, touch, exportCode, importCode,
  };
});
