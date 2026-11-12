// 터치와 일꾼으로 코인을 모으는 방치형 성장 규칙. DOM이 없어서 진행 속도를 시뮬레이션할 수 있다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DinoIdle = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const WORKER_GROWTH = 1.15;
  const WORKER_DOUBLE_EVERY = 25; // 이 레벨마다 일꾼 수입이 두 배가 된다.
  const TAP_GROWTH = 1.4;
  const TAP_INCOME_SHARE = 0.002; // 터치 강화 1단계마다 초당 수입의 이만큼을 터치에 더한다. 후반에도 강화가 체감되게 한다.
  const OFFLINE_RATE = 0.5;
  const OFFLINE_MAX_HOURS = 8;
  const OFFLINE_MIN_SEC = 60;
  const RAIN_SEC = 60; // 코인 소나기는 초당 수입의 이만큼을 준다.
  const RAIN_TAPS = 40;
  const RAIN_COOL = 90;
  const RUSH_COOL = 180;
  const RUSH_SEC = 10;
  const RUSH_PER_SEC = 8;
  const GOLD_SEC = 20;
  const GOLD_TAPS = 15;
  const FOOD_GROWTH = 12;
  const REGION_LEVEL_LIFT = 3; // 지역의 권장 레벨은 시작 레벨보다 이만큼 높다.
  const MOVE_AT = 1e6; // 이번 섬에서 이만큼 벌면 새 섬으로 이사할 수 있다.
  const GEM_BONUS = 0.1;
  const FRIEND_BONUS = 0.05;
  const PLUS_MAX = 10; // 공룡 강화는 +10까지.
  const PLUS_TAP = 0.1; // 강화 1단계마다 그 공룡의 터치가 이만큼 세진다. 전투 몫은 battle.js의 PLUS_POWER.
  const PLUS_START = 2; // 모험을 하지 않아도 여기까지는 강화할 수 있다.
  const PLUS_PER_REGION = 2; // 지역 보스를 이길 때마다 강화 한도가 이만큼 늘어난다.
  const PLUS_BASE = 2000;
  const PLUS_GROWTH = 2.3;
  const EGG_BASE = 3000; // 두 번째 알 값. 알을 살 때마다 값이 EGG_GROWTH배가 된다.
  const EGG_GROWTH = 5;

  const allBonus = (save) => (1 + save.idle.gems * GEM_BONUS) * (1 + Math.max(0, save.dinos.length - 1) * FRIEND_BONUS);
  const workerLevel = (save, id) => save.idle.workers[id] || 0;
  const workerCost = (worker, level) => Math.ceil(worker.cost * WORKER_GROWTH ** level);
  const workerIncome = (worker, level) => worker.rate * level * 2 ** Math.floor(level / WORKER_DOUBLE_EVERY);
  const income = (save, workers) => workers.reduce((sum, w) => sum + workerIncome(w, workerLevel(save, w.id)), 0) * allBonus(save);

  const tapCost = (level) => Math.ceil(10 * TAP_GROWTH ** level);
  // 터치 레벨, 키운 공룡의 레벨, 초당 수입이 모두 터치 한 번의 값을 올린다.
  // 강화 단계는 지금 데리고 있는 공룡의 것을 쓴다.
  const plusOf = (dino) => (Number.isFinite(dino?.plus) ? Math.max(0, Math.min(PLUS_MAX, dino.plus)) : 0);
  const activePlus = (save) => plusOf(save.dinos?.find((d) => d.id === save.active));
  const tapValue = (save, workers, dinoLevel = 1) => {
    const base = (1 + save.idle.tapLv) * 1.15 ** save.idle.tapLv * (1 + (dinoLevel - 1) * 0.1) * (1 + activePlus(save) * PLUS_TAP);
    return Math.ceil(base * allBonus(save) + income(save, workers) * TAP_INCOME_SHARE * save.idle.tapLv);
  };
  const foodCost = (level) => Math.ceil(50 * 1.32 ** (level - 1));
  // 코인만으로 모험을 건너뛰지 않게, 먹이로 올릴 수 있는 레벨은 지금 지역의 권장 레벨까지다.
  function foodCap(regions, isCleared, maxLevel) {
    const next = regions.find((r) => !isCleared(r.id));
    return next ? next.level + REGION_LEVEL_LIFT : maxLevel;
  }

  function earn(save, amount) {
    save.idle.coins += amount;
    save.idle.total += amount;
    save.idle.life += amount;
    return amount;
  }

  function spend(save, cost) {
    if (save.idle.coins < cost) return false;
    save.idle.coins -= cost;
    return true;
  }

  function buyWorker(save, worker) {
    if (!spend(save, workerCost(worker, workerLevel(save, worker.id)))) return false;
    save.idle.workers[worker.id] = workerLevel(save, worker.id) + 1;
    return true;
  }

  function buyTap(save) {
    if (!spend(save, tapCost(save.idle.tapLv))) return false;
    save.idle.tapLv += 1;
    return true;
  }

  const plusCost = (plus) => (plus >= PLUS_MAX ? Infinity : Math.ceil(PLUS_BASE * PLUS_GROWTH ** plus));
  // 강화는 공룡에게 남으므로 이사해도 사라지지 않는다.
  // 코인만으로 모험을 건너뛰지 않게, 강화 한도는 이긴 지역 수를 따라간다.
  const plusCap = (regionsCleared) => Math.min(PLUS_MAX, PLUS_START + PLUS_PER_REGION * regionsCleared);
  function enhance(save, dino, cap = PLUS_MAX) {
    const plus = plusOf(dino);
    if (plus >= Math.min(cap, PLUS_MAX) || !spend(save, plusCost(plus))) return false;
    dino.plus = plus + 1;
    return true;
  }

  // 알 값은 이미 가진 공룡 수로 정한다. 첫 알은 공짜로 받으므로 두 번째부터 값이 있다.
  const eggCost = (owned) => Math.ceil(EGG_BASE * EGG_GROWTH ** Math.max(0, owned - 1));
  // 아직 없고 열려 있는 종만 살 수 있다. 공룡이 늘면 친구 보너스로 모든 코인이 늘어난다.
  const eggsForSale = (save, species, isUnlocked) =>
    species.filter((sp) => !save.dinos.some((d) => d.species === sp.id) && isUnlocked(sp));
  function buyEgg(save, species, isUnlocked, speciesId) {
    const sp = eggsForSale(save, species, isUnlocked).find((s) => s.id === speciesId);
    return !!sp && spend(save, eggCost(save.dinos.length));
  }

  function offline(save, workers, now = Date.now()) {
    const secs = Math.min((now - save.lastSeen) / 1000, OFFLINE_MAX_HOURS * 3600);
    if (secs < OFFLINE_MIN_SEC) return null;
    const coins = Math.floor(income(save, workers) * secs * OFFLINE_RATE);
    if (coins < 1) return null;
    earn(save, coins);
    return { secs, coins };
  }

  // 기기 시계를 되돌리면 남은 시간이 원래 쿨타임보다 길어진다. 그런 값은 없던 것으로 친다.
  function coolLeft(until, cool, now = Date.now()) {
    const left = Math.ceil((until - now) / 1000);
    return left > 0 && left <= cool ? left : 0;
  }

  function rain(save, workers, dinoLevel, now = Date.now()) {
    if (coolLeft(save.idle.rainAt, RAIN_COOL, now) > 0) return 0;
    save.idle.rainAt = now + RAIN_COOL * 1000;
    return earn(save, Math.max(income(save, workers) * RAIN_SEC, tapValue(save, workers, dinoLevel) * RAIN_TAPS));
  }

  function rush(save, now = Date.now()) {
    if (coolLeft(save.idle.rushAt, RUSH_COOL, now) > 0) return false;
    save.idle.rushAt = now + RUSH_COOL * 1000;
    return true;
  }

  const goldValue = (save, workers, dinoLevel) =>
    Math.max(income(save, workers) * GOLD_SEC, tapValue(save, workers, dinoLevel) * GOLD_TAPS);

  const moveGems = (save) => Math.floor(Math.sqrt(save.idle.total / MOVE_AT));

  // 공룡, 레벨, 별은 그대로 두고 코인과 일꾼만 처음으로 돌린다. 보석이 영구 보너스가 된다.
  function move(save) {
    const gems = moveGems(save);
    if (gems < 1) return 0;
    const { idle } = save;
    idle.gems += gems;
    idle.moves += 1;
    idle.coins = 0;
    idle.total = 0;
    idle.tapLv = 0;
    idle.workers = {};
    return gems;
  }

  const rankIndex = (life, ranks) => ranks.reduce((best, r, i) => (life >= r.at ? i : best), 0);

  // 처음 오른 등급마다 별을 준다.
  function claimRank(save, ranks) {
    const index = rankIndex(save.idle.life, ranks);
    if (index <= save.idle.rank) return null;
    save.stars += ranks.slice(save.idle.rank + 1, index + 1).reduce((sum, r) => sum + r.stars, 0);
    save.idle.rank = index;
    return ranks[index];
  }

  // 업적에 쓰는 숫자들. 한 번 이룬 업적은 값이 줄어도 사라지지 않는다.
  function achvStats(save, regionsCleared = 0) {
    const pluses = save.dinos.map(plusOf);
    return {
      life: save.idle.life,
      dinos: save.dinos.length,
      adults: save.dinos.filter((d) => d.stage === 'adult').length,
      plusBest: Math.max(0, ...pluses),
      plusSum: pluses.reduce((a, b) => a + b, 0),
      moves: save.idle.moves,
      regions: regionsCleared,
      fossils: save.fossils.length,
      stamps: save.stamps,
    };
  }

  // 새로 이룬 업적을 기록하고 별을 준다.
  function claimAchievements(save, list, stats) {
    const fresh = list.filter((a) => !save.achv.includes(a.id) && stats[a.stat] >= a.goal);
    for (const a of fresh) {
      save.achv.push(a.id);
      save.stars += a.stars;
    }
    return fresh;
  }

  const UNITS = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
  function format(n) {
    for (const [size, unit] of UNITS) {
      if (n >= size) {
        const v = n / size;
        return `${v >= 1000 ? Math.floor(v).toLocaleString('ko-KR') : Math.floor(v * 10) / 10}${unit}`;
      }
    }
    return Math.floor(n).toLocaleString('ko-KR');
  }
  // 초당 수입처럼 1 아래도 의미 있는 값에 쓴다.
  const formatRate = (n) => (n < 100 ? String(Math.round(n * 10) / 10) : format(n));

  return {
    PLUS_MAX, PLUS_TAP, FRIEND_BONUS, plusOf, plusCost, plusCap, enhance, achvStats, claimAchievements, eggCost, eggsForSale, buyEgg,
    RAIN_COOL, RUSH_COOL, RUSH_SEC, RUSH_PER_SEC, WORKER_DOUBLE_EVERY, FOOD_GROWTH, MOVE_AT, GEM_BONUS, OFFLINE_RATE, OFFLINE_MAX_HOURS,
    workerLevel, workerCost, workerIncome, income, tapCost, tapValue, foodCost, foodCap, earn, spend, buyWorker, buyTap,
    offline, coolLeft, rain, rush, goldValue, moveGems, move, rankIndex, claimRank, format, formatRate,
  };
});
