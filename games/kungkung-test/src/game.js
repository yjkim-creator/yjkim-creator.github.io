(() => {
  const { SPECIES, FOODS, HATS, FOSSILS, NAMES, COLORS, STAGE_LABEL, BUS_M, CARE_TEXT, FULL_TEXT, THEMES, MISSIONS, QUIZ, REGIONS, SKILLS, TYPES, VOICES, WORKERS, RANKS, ACHIEVEMENTS } = window.DinoData;
  const S = window.DinoState;
  const I = window.DinoIdle;
  const A = window.DinoArt;
  const B = window.DinoBattle;
  const Adv = window.DinoAdventure;
  const snd = window.DinoSound;
  const KEY = 'kungkung-island-save';

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const speciesOf = (d) => SPECIES.find((s) => s.id === d.species);
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const hasBatchim = (word) => {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0;
  };
  const josa = (word, withB, without) => word + (hasBatchim(word) ? withB : without);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function readSave() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  function writeSave() {
    try {
      localStorage.setItem(KEY, S.touch(save));
    } catch {
      /* 저장소를 못 쓰는 환경에서는 이번 실행 동안만 유지된다 */
    }
  }

  A.installGradients();
  const save = S.load(readSave());
  const awayAtStart = I.offline(save, WORKERS);
  S.catchUp(save);
  S.ensureDaily(save, MISSIONS);
  snd.configure(save.opts);

  // 지금 공룡이 무엇을 하는 중인지. idle일 때만 돌아다니고 말을 건다.
  const ui = { mode: 'idle', cleanup: null, bubbleTimer: 0, lastHint: 0, sleepStart: 0, taps: 0, pops: 0, coinFrame: 0, rushing: false, nextGold: Date.now() + 30000 };
  const dino = () => S.active(save);
  const dinoEl = $('#dino');
  const scene = $('#scene');
  $('#scene-art').innerHTML = Adv.scape('beach');
  const island = $('#scene-art .scape');

  /* ---------- 공룡 표시 ---------- */

  function mountDino() {
    dinoEl.innerHTML = A.dino(dino());
    // 함께 키운 공룡들이 섬 뒤쪽에 나와 있다.
    const spots = [[14, '26%', false], [86, '24%', true], [30, '34%', false]];
    const others = save.dinos.filter((d) => d.id !== save.active).slice(0, spots.length);
    $('#friends').innerHTML = others.map((d, i) => {
      const [left, bottom, flip] = spots[i];
      return `<div class="friend${flip ? ' flip' : ''}" style="--l:${left}%;--b:${bottom}">${A.dino(d, { mini: true })}</div>`;
    }).join('');
    refresh();
  }

  function applyTheme() {
    THEMES.forEach((t) => island.classList.toggle(`theme-${t.id}`, t.id === save.theme));
  }

  function mission(id) {
    if (S.missionStep(save, id)) snd.play.star();
    refresh();
  }

  function refresh() {
    const d = dino();
    if (!d) return;
    const label = STAGE_LABEL[d.stage];
    const lv = S.levelInfo(d.growth);
    $('#dino-name').innerHTML = `<em>Lv.${lv.level}</em>${esc(d.name)}${plusTag(d)} · ${label}`;
    $('#world').classList.toggle('raised', ui.mode === 'feed' || ui.mode === 'bath');
    $('#growth-fill').style.width = `${lv.level >= S.MAX_LEVEL ? 100 : (lv.into / lv.need) * 100}%`;
    $('#star-count').textContent = save.stars;
    const list = save.daily.missions;
    $('#mission-count').textContent = `${list.filter((m) => m.done >= m.goal).length}/${list.length}`;
    $('#btn-mission').classList.toggle('ready', S.missionsDone(save) && !save.daily.claimed);
    for (const key of S.NEEDS) {
      const value = d.needs[key];
      const btn = $(`.act[data-act="${key}"]`);
      $('.ring', btn).style.setProperty('--p', Math.round(value));
      btn.classList.toggle('low', value < 30);
      btn.classList.toggle('mid', value >= 30 && value < 60);
      btn.setAttribute('aria-label', `${$('b', btn).textContent} ${Math.round(value)}퍼센트`);
    }
    dinoEl.classList.toggle('sad', Math.min(...S.NEEDS.map((k) => d.needs[k])) < 30);
    dinoEl.style.setProperty('--dirt', d.needs.clean < 55 ? String(1 - d.needs.clean / 55) : '0');
  }

  // alt: 공룡 이름처럼 바뀌는 말이 들어 있어 미리 녹음할 수 없을 때 대신 들려줄 문장
  function say(text, voice = true, alt) {
    const el = $('#bubble');
    el.hidden = false;
    el.textContent = text;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(ui.bubbleTimer);
    ui.bubbleTimer = setTimeout(() => { el.hidden = true; }, 3600);
    if (voice) snd.say(text, false, dinoVoice(dino()), alt);
  }

  const dinoVoice = (d) => S.voiceFor(VOICES, d.species, d.stage);

  function flash(cls, ms) {
    dinoEl.classList.add(cls);
    setTimeout(() => dinoEl.classList.remove(cls), ms);
  }

  function particle(kind, x, y, html = '') {
    const el = document.createElement('div');
    el.className = `fx ${kind}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = html;
    $('#fx').append(el);
    el.addEventListener('animationend', () => el.remove());
    return el;
  }

  function burst(kind, count = 5) {
    const r = dinoEl.getBoundingClientRect();
    const o = scene.getBoundingClientRect();
    const html = kind === 'heart' ? A.heart : A.star;
    for (let i = 0; i < count; i++) {
      const el = particle('', r.left - o.left + rand(.2, .8) * r.width, r.top - o.top + rand(.2, .6) * r.height, html);
      el.style.animationDelay = `${i * 80}ms`;
    }
  }

  function mouthPoint() {
    const r = $('.d-head', dinoEl).getBoundingClientRect();
    const flipped = $('#dino-flip').classList.contains('flip');
    return { x: flipped ? r.left + r.width * .15 : r.right - r.width * .15, y: r.top + r.height * .6 };
  }

  function reward(result) {
    if (result.stars) {
      $('#btn-stars').classList.remove('bump');
      void $('#btn-stars').offsetWidth;
      $('#btn-stars').classList.add('bump');
      snd.play.star();
    }
    refresh();
    writeSave();
    if (result.stageUp) setTimeout(() => celebrate(result.stageUp), 900);
  }

  /* ---------- 돌보기: 밥 ---------- */

  function openTray() {
    ui.mode = 'feed';
    stopWalking();
    $('#tray-foods').innerHTML = FOODS.map((f) => `<button class="food" data-food="${f.id}">${A.food(f.id)}${f.name}</button>`).join('');
    $('#tray').hidden = false;
    refresh();
    say(`${dino().name}에게 먹이를 끌어다 주세요!`, true, '먹이를 끌어다 주세요!');
  }

  function closeTray() {
    $('#tray').hidden = true;
    ui.mode = 'idle';
    refresh();
  }

  function startDrag(e, id) {
    const start = { x: e.clientX, y: e.clientY };
    const ghost = document.createElement('div');
    ghost.id = 'drag-food';
    ghost.innerHTML = A.food(id);
    document.body.append(ghost);
    const place = (x, y) => { ghost.style.transform = `translate(${x}px, ${y}px)`; };
    place(start.x, start.y);
    snd.play.tap();

    const move = (ev) => place(ev.clientX, ev.clientY);
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const r = dinoEl.getBoundingClientRect();
      const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
      const onDino = ev.clientX > r.left - 20 && ev.clientX < r.right + 20 && ev.clientY > r.top - 20 && ev.clientY < r.bottom + 20;
      if (moved < 12 || onDino) {
        // 끌기가 어려운 어린아이는 그냥 눌러도 먹이가 날아간다.
        const m = mouthPoint();
        ghost.classList.add('fly');
        void ghost.offsetWidth;
        place(m.x, m.y);
        setTimeout(() => { ghost.remove(); feed(id); }, 360);
      } else {
        ghost.remove();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function feed(foodId) {
    const d = dino();
    const sp = speciesOf(d);
    const food = FOODS.find((f) => f.id === foodId);
    if (!sp.diet.includes(foodId)) {
      flash('shake', 900);
      snd.play.no();
      const [first, second] = sp.diet.map((id) => FOODS.find((f) => f.id === id).name);
      const likes = second ? `${josa(first, '이나', '나')} ${second}` : first;
      say(`${josa(food.name, '은', '는')} 안 먹어요. 나는 ${sp.dietLabel}! ${likes} 주세요.`, true, '그건 안 먹어요! 다른 걸 주세요.');
      return;
    }
    const result = S.care(save, 'food', 32);
    if (!result.ok) {
      flash('shake', 900);
      snd.play.no();
      say(FULL_TEXT.food);
      return;
    }
    flash('eating', 1300);
    snd.play.eat();
    const m = mouthPoint();
    const o = scene.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const c = particle('crumb', m.x - o.left + rand(-12, 12), m.y - o.top + rand(0, 10));
      c.style.setProperty('--dx', `${rand(-30, 30)}px`);
      c.style.setProperty('--c', foodId === 'meat' ? '#C8553D' : foodId === 'fish' ? '#45BFD6' : foodId === 'fern' ? '#58B947' : '#E0483E');
    }
    say(pick(['냠냠! 맛있어요!', '우와, 또 주세요!', '꿀꺽! 고마워요!']));
    setTimeout(() => burst('heart', 3), 900);
    mission('food');
    reward(result);
    if (d.needs.food >= S.FULL_AT) setTimeout(closeTray, 1400);
  }

  /* ---------- 돌보기: 씻기 ---------- */

  function startBath() {
    if (dino().needs.clean >= S.FULL_AT) {
      flash('shake', 900);
      say(FULL_TEXT.clean);
      return;
    }
    ui.mode = 'bath';
    ui.bath = { done: 0, last: null, sinceBubble: 0 };
    stopWalking();
    $('#bath-bar').hidden = false;
    $('#bath-fill').style.width = '0';
    $('#sponge').hidden = false;
    refresh();
    const r = dinoEl.getBoundingClientRect();
    const o = scene.getBoundingClientRect();
    moveSponge(r.left - o.left + r.width / 2, r.top - o.top + r.height / 2 - 112);
  }

  function moveSponge(x, y) {
    $('#sponge').style.transform = `translate(${x}px, ${y}px)`;
  }

  function scrub(x, y, amount) {
    const b = ui.bath;
    b.done = Math.min(1, b.done + amount);
    $('#bath-fill').style.width = `${b.done * 100}%`;
    b.sinceBubble += amount;
    if (b.sinceBubble > .03) {
      b.sinceBubble = 0;
      const el = particle('bubble', x + rand(-34, 34), y + rand(-24, 24));
      const size = rand(16, 40);
      el.style.width = el.style.height = `${size}px`;
      snd.play.splash();
    }
    const d = dino();
    dinoEl.style.setProperty('--dirt', String(Math.max(0, (1 - d.needs.clean / 55) * (1 - b.done))));
    if (b.done >= 1) finishBath();
  }

  function endBath() {
    ui.mode = 'idle';
    $('#bath-bar').hidden = true;
    $('#sponge').hidden = true;
    refresh();
  }

  function finishBath() {
    endBath();
    const result = S.care(save, 'clean', 70);
    flash('cheer', 1100);
    snd.play.happy();
    burst('star', 6);
    say('뽀득뽀득! 정말 시원해요!');
    mission('clean');
    reward(result);
  }

  scene.addEventListener('pointerdown', () => {
    if (ui.mode === 'bath') ui.bath.last = null; // 손을 뗐다 다른 곳을 눌러도 문지른 거리로 치지 않는다.
  });

  scene.addEventListener('pointermove', (e) => {
    if (ui.mode !== 'bath') return;
    const o = scene.getBoundingClientRect();
    const x = e.clientX - o.left;
    const y = e.clientY - o.top;
    moveSponge(x, y);
    const r = dinoEl.getBoundingClientRect();
    const over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    const b = ui.bath;
    if (over && b.last && e.buttons !== 0) {
      scrub(x, y, Math.hypot(x - b.last.x, y - b.last.y) / 1600);
    }
    b.last = { x, y };
  });

  /* ---------- 돌보기: 잠 ---------- */

  function startSleep() {
    if (dino().needs.energy >= S.FULL_AT) {
      flash('shake', 900);
      say(FULL_TEXT.energy);
      return;
    }
    ui.mode = 'sleep';
    stopWalking();
    const result = S.care(save, 'energy', 10);
    island.classList.add('night');
    dinoEl.classList.add('sleeping');
    $('#zzz').hidden = false;
    $('#bubble').hidden = true;
    snd.play.night();
    snd.say('잘 자요.');
    mission('energy');
    reward(result);
  }

  function wake() {
    ui.mode = 'idle';
    island.classList.remove('night');
    dinoEl.classList.remove('sleeping');
    $('#zzz').hidden = true;
    flash('cheer', 1000);
    snd.play.happy();
    say(dino().needs.energy >= 95 ? '잘 잤다! 기운이 펄펄 나요!' : '벌써 아침이에요?');
    writeSave();
  }

  /* ---------- 공룡 만지기 ---------- */

  dinoEl.addEventListener('click', (e) => {
    if (ui.mode === 'sleep') return wake();
    if (ui.mode === 'bath') {
      const r = dinoEl.getBoundingClientRect();
      const o = scene.getBoundingClientRect();
      return scrub(r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, .1);
    }
    if (ui.mode === 'idle' && e.detail === 0) earnTap(); // 키보드와 화면 낭독기로 누른 경우
  });

  /* ---------- 코인 모으기 ---------- */

  const TALK_EVERY = 15; // 연타할 때 말이 겹치지 않게 이 횟수마다 한 번만 말한다.
  const MAX_POPS = 14; // 연타해도 화면이 느려지지 않게 떠 있는 숫자 수를 제한한다.
  const dinoLevel = () => S.levelInfo(dino().growth).level;
  const coinOf = (n) => `${I.format(n)} 코인`;
  function earnTap(x, y) {
    tapCoin(x, y);
    snd.play.coin();
    ui.taps += 1;
    if (S.missionStep(save, 'pet')) {
      snd.play.star();
      refresh();
    }
    if (ui.taps % TALK_EVERY !== 1) return;
    flash('cheer', 1000);
    snd.cry(dinoVoice(dino()).cry);
    burst('heart', 2);
    const d = dino();
    const low = S.NEEDS.filter((k) => d.needs[k] < 40).sort((a, b) => d.needs[a] - d.needs[b])[0];
    const intro = `나는 ${josa(d.name, '이에요', '예요')}!`;
    const line = low ? CARE_TEXT[low] : pick([intro, '쓰다듬어 줘서 좋아요!', '크아앙!', '오늘도 같이 놀자!']);
    say(line, true, line === intro ? '안녕! 반가워요!' : undefined);
  }
  // 별과 헷갈리지 않게 발자국이 찍힌 금화로 그린다.
  const COIN = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#C9760B"/><circle cx="16" cy="14.5" r="13" fill="#FFB627"/><circle cx="16" cy="14.5" r="10" fill="#FFD76A"/><g fill="#C9760B"><ellipse cx="16" cy="18" rx="4.6" ry="3.8"/><circle cx="10.5" cy="13.5" r="2"/><circle cx="16" cy="10.5" r="2.2"/><circle cx="21.5" cy="13.5" r="2"/></g></svg>';

  function popCoin(amount, big = false, x = null, y = null) {
    if (!big && ui.pops >= MAX_POPS) return;
    const r = dinoEl.getBoundingClientRect();
    const o = scene.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `coin-pop${big ? ' big' : ''}`;
    el.textContent = `+${I.format(amount)}`;
    el.style.left = `${(x ?? r.left + r.width * rand(.2, .8)) - o.left}px`;
    el.style.top = `${(y ?? r.top + r.height * rand(.05, .4)) - o.top - 30}px`;
    ui.pops += 1;
    el.addEventListener('animationend', () => {
      ui.pops -= 1;
      el.remove();
    });
    $('#fx').append(el);
    if (x === null) return;
    const ring = document.createElement('div');
    ring.className = 'tap-ring';
    ring.style.left = `${x - o.left}px`;
    ring.style.top = `${y - o.top}px`;
    ring.addEventListener('animationend', () => ring.remove());
    $('#fx').append(ring);
  }

  function tapCoin(x, y) {
    if (!dino()) return;
    popCoin(I.earn(save, I.tapValue(save, WORKERS, dinoLevel())), false, x, y);
    dinoEl.animate?.([{ transform: 'none' }, { transform: 'scale(1.1, .9)' }, { transform: 'none' }], 120);
    if (ui.coinFrame) return;
    ui.coinFrame = requestAnimationFrame(() => {
      ui.coinFrame = 0;
      updateCoins();
    });
  }

  // 손가락이 닿는 순간 센다. click은 빠른 연타와 두 손가락 터치를 놓친다.
  scene.addEventListener('pointerdown', (e) => {
    if (ui.mode !== 'idle' || !dino()) return;
    const btn = e.target.closest('button');
    if (!btn || btn === dinoEl) earnTap(e.clientX, e.clientY);
  });
  scene.addEventListener('pointerup', snd.unlock); // 브라우저는 손을 뗄 때 소리를 허용한다.

  const affordable = () => save.idle.coins >= I.tapCost(save.idle.tapLv)
    || WORKERS.some((w) => save.idle.coins >= I.workerCost(w, I.workerLevel(save, w.id)));

  function skillState(btn, left, total) {
    btn.disabled = left > 0;
    const mark = $('i', btn);
    mark.textContent = left > 0 ? left : '';
    mark.style.setProperty('--cd', left / total * 100);
  }

  function updateCoins() {
    const { idle } = save;
    $('#coin-count').textContent = I.format(idle.coins);
    $('#coin-rate').textContent = `${RANKS[idle.rank].name} · 초당 ${I.formatRate(I.income(save, WORKERS))}`;
    $('#idle-tools').hidden = ui.mode !== 'idle' || !dino();
    $('#btn-grow').classList.toggle('ready', affordable());
    skillState($('#btn-rain'), I.coolLeft(idle.rainAt, I.RAIN_COOL), I.RAIN_COOL);
    skillState($('#btn-rush'), I.coolLeft(idle.rushAt, I.RUSH_COOL), I.RUSH_COOL);
  }

  function checkRank() {
    const rank = I.claimRank(save, RANKS);
    if (!rank) return;
    snd.play.levelUp();
    confetti();
    say(`우리 섬이 ${josa(rank.name, '이', '가')} 됐어요! 별 ${rank.stars}개!`);
    refresh();
  }

  function useRain() {
    const got = I.rain(save, WORKERS, dinoLevel());
    if (!got) return;
    snd.play.rain();
    popCoin(got, true);
    updateCoins();
  }

  function useRush() {
    if (ui.rushing || !I.rush(save)) return;
    snd.play.roar();
    ui.rushing = true;
    const timer = setInterval(() => tapCoin(), 1000 / I.RUSH_PER_SEC);
    setTimeout(() => {
      clearInterval(timer);
      ui.rushing = false;
      updateCoins();
    }, I.RUSH_SEC * 1000);
    updateCoins();
  }

  // 가끔 나타나는 황금 코인. 놓쳐도 손해는 없다.
  function spawnGold() {
    const el = document.createElement('button');
    el.className = 'gold-egg';
    el.setAttribute('aria-label', '황금 코인');
    el.innerHTML = COIN;
    el.style.left = `${rand(10, 76)}%`;
    el.style.top = `${rand(26, 52)}%`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const got = I.earn(save, I.goldValue(save, WORKERS, dinoLevel()));
      snd.play.rain();
      popCoin(got, true);
      el.remove();
      updateCoins();
    });
    scene.append(el);
    setTimeout(() => el.remove(), 7000);
  }

  function showAway(away) {
    if (!away || !dino() || !$('#sheet').hidden) return;
    const mins = Math.round(away.secs / 60);
    const time = mins >= 60 ? `${Math.floor(mins / 60)}시간` : `${mins}분`;
    openSheet(`<div class="sheet-in center">
      <div class="hero">${A.dino(dino(), { mini: true })}</div>
      <h2 class="title">일꾼들이 코인을 모아 뒀어요!</h2>
      <p class="lede">${time} 동안 <b class="amber">${coinOf(away.coins)}</b>을 벌었어요.</p>
      <button class="big" data-close>받기</button></div>`);
    snd.play.rain();
    updateCoins();
  }

  const foodCap = () => I.foodCap(REGIONS, (id) => S.regionCleared(save, id), S.MAX_LEVEL);
  const regionsCleared = () => REGIONS.filter((r) => S.regionCleared(save, r.id)).length;
  const plusCap = () => I.plusCap(regionsCleared());
  const eggsForSale = () => I.eggsForSale(save, SPECIES, (sp) => S.isUnlocked(save, sp));
  function plusTag(d) {
    const plus = I.plusOf(d);
    return plus ? `<i class="plus-tag">+${plus}</i>` : '';
  }

  function checkAchievements() {
    const fresh = I.claimAchievements(save, ACHIEVEMENTS, I.achvStats(save, regionsCleared()));
    if (!fresh.length) return;
    snd.play.levelUp();
    confetti();
    const stars = fresh.reduce((sum, a) => sum + a.stars, 0);
    const text = `업적 달성! ${fresh[fresh.length - 1].name} · 별 ${stars}개`;
    say(text, false);
    refresh();
    writeSave();
  }

  function growRows() {
    const d = dino();
    const level = dinoLevel();
    const { idle } = save;
    const row = (id, art, name, sub, cost, lv = 0, bar = '', done = '모험 필요') => `<button class="up-row" data-buy="${id}" data-cost="${cost}">
      <span class="up-art">${art}${lv ? `<i class="up-lv">${lv}</i>` : ''}</span>
      <span class="up-text"><b>${name}</b><small>${sub}</small>${bar}</span>
      <span class="up-cost">${cost === Infinity ? done : `${COIN}${I.format(cost)}`}</span></button>`;
    const nextTap = { ...save, idle: { ...idle, tapLv: idle.tapLv + 1 } };
    const rows = [
      '<h3 class="up-head">내 힘</h3>',
      row('tap', A.heart, '터치 강화', `터치 ${I.format(I.tapValue(save, WORKERS, level))} → ${I.format(I.tapValue(nextTap, WORKERS, level))}`, I.tapCost(idle.tapLv), idle.tapLv),
    ];
    if (level < S.MAX_LEVEL) {
      const open = level < foodCap();
      rows.push(row('food', A.food(FOODS[0].id), `${d.name} 먹이 상자`, open ? '터치와 전투가 강해져요' : '보스를 이기면 더 자라요', open ? I.foodCost(level) : Infinity, level));
    }
    // 강화는 공룡마다 따로 한다. 지금 데리고 있는 공룡이 맨 위에 온다.
    rows.push('<h3 class="up-head">공룡 강화</h3>');
    const cap = plusCap();
    for (const x of [d, ...save.dinos.filter((o) => o !== d)]) {
      const plus = I.plusOf(x);
      const max = plus >= I.PLUS_MAX;
      const waiting = !max && plus >= cap;
      const sub = max ? '최고로 강해졌어요!' : waiting ? '보스를 이기면 더 강화할 수 있어요'
        : `터치 +${Math.round(I.PLUS_TAP * 100)}% · 전투 +${Math.round(B.PLUS_POWER * 100)}%`;
      const bar = `<span class="up-bar" aria-hidden="true"><i style="width:${plus / I.PLUS_MAX * 100}%"></i></span>`;
      rows.push(row(`plus:${x.id}`, A.dino(x, { mini: true }), `${x.name} 강화`, sub, waiting ? Infinity : I.plusCost(plus), plus ? `+${plus}` : 0, bar, max ? '최고' : '모험 필요'));
    }
    const eggs = eggsForSale();
    const hidden = SPECIES.filter((sp) => !save.dinos.some((x) => x.species === sp.id) && !S.isUnlocked(save, sp)).length;
    if (eggs.length || hidden) {
      rows.push('<h3 class="up-head" id="egg-head">알 가게</h3>');
      const price = I.eggCost(save.dinos.length);
      for (const sp of eggs) {
        rows.push(row(`egg:${sp.id}`, A.egg(sp.id), `${sp.name} 알`, `친구가 생기면 모든 코인 +${Math.round(I.FRIEND_BONUS * 100)}%`, price));
      }
      if (hidden) rows.push(`<p class="note">숨겨진 알 ${hidden}개는 모험에서 보스를 이기면 가게에 나와요.</p>`);
    }
    rows.push('<h3 class="up-head">일꾼 공룡</h3>');
    const hired = WORKERS.filter((w) => I.workerLevel(save, w.id) > 0).length;
    for (const w of WORKERS.slice(0, hired + 1)) {
      const lv = I.workerLevel(save, w.id);
      const color = SPECIES.find((s) => s.id === w.species).color;
      const after = I.workerIncome(w, lv + 1) - I.workerIncome(w, lv);
      const bar = lv ? `<span class="up-bar" aria-hidden="true"><i style="width:${(lv % I.WORKER_DOUBLE_EVERY) / I.WORKER_DOUBLE_EVERY * 100}%"></i></span>` : '';
      rows.push(row(`worker:${w.id}`, A.dino({ species: w.species, stage: 'kid', color }, { mini: true }), w.name, `초당 ${lv ? '+' : ''}${I.formatRate(after)} 코인`, I.workerCost(w, lv), lv, bar));
    }
    const gems = I.moveGems(save);
    rows.push('<h3 class="up-head">새 섬으로 이사</h3>');
    const gemNote = idle.gems ? `<p class="note">보석 ${idle.gems}개 · 모든 코인 +${Math.round(idle.gems * I.GEM_BONUS * 100)}%</p>` : '';
    rows.push(`<div class="move-card">${gems
      ? `<button class="big" id="go-move">이사하고 보석 ${gems}개 받기</button>`
      : `<p class="note">이번 섬에서 ${I.format(I.MOVE_AT)} 코인을 벌면 이사할 수 있어요. 지금 ${I.format(idle.total)} 코인.</p>
         <div class="up-bar" aria-hidden="true"><i style="width:${Math.min(100, idle.total / I.MOVE_AT * 100)}%"></i></div>`}${gemNote}</div>`);
    return rows.join('');
  }

  function buyUpgrade(id) {
    if (id === 'tap') return I.buyTap(save);
    if (id.startsWith('plus:')) {
      const target = save.dinos.find((x) => `plus:${x.id}` === id);
      if (!target || !I.enhance(save, target, plusCap())) return false;
      snd.play.star();
      if (target === dino()) {
        flash('cheer', 700);
        burst('star', 4);
        refresh();
      }
      return 'quiet';
    }
    if (id.startsWith('egg:')) {
      const speciesId = id.slice(4);
      if (!I.buyEgg(save, SPECIES, (sp) => S.isUnlocked(save, sp), speciesId)) return false;
      writeSave();
      updateCoins();
      if (ui.cleanup) ui.cleanup(); // 키우기 화면의 타이머를 끝내고 부화 화면으로 넘어간다.
      ui.cleanup = null;
      startHatch(speciesId);
      return 'hatch';
    }
    if (id === 'food') {
      if (dinoLevel() >= foodCap() || !I.spend(save, I.foodCost(dinoLevel()))) return false;
      const stage = S.grow(dino(), I.FOOD_GROWTH);
      if (stage) {
        ui.afterClose = () => openGrow();
        celebrate(stage);
      }
      return true;
    }
    return I.buyWorker(save, WORKERS.find((w) => `worker:${w.id}` === id));
  }

  function openGrow(focus) {
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>섬 키우기</h2><span class="chip"><span class="coin-icon">${COIN}</span><b id="grow-coins"></b></span>${closeBtn}</div>
      <div id="grow-list" class="grow-list"></div></div>`);
    const list = $('#grow-list', sheet);
    const paint = () => {
      if (!list.isConnected) return;
      $('#grow-coins', sheet).textContent = I.format(save.idle.coins);
      $$('.up-row', list).forEach((b) => { b.disabled = save.idle.coins < Number(b.dataset.cost); });
    };
    const render = () => {
      list.innerHTML = growRows();
      paint();
    };
    const buy = (id) => {
      const bought = buyUpgrade(id);
      if (!bought || bought === 'hatch') return bought;
      if (bought !== 'quiet') snd.play.pop();
      if (list.isConnected) render();
      updateCoins();
      writeSave();
      return bought;
    };
    // 꾹 누르고 있으면 코인이 모자랄 때까지 이어서 산다. 알은 한 번에 하나만 산다.
    let holdTimer = 0;
    let held = false;
    const release = () => { clearTimeout(holdTimer); holdTimer = 0; };
    list.addEventListener('pointerdown', (e) => {
      const id = e.target.closest('.up-row')?.dataset.buy;
      release();
      held = false;
      if (!id || id.startsWith('egg:')) return;
      const again = () => {
        held = true;
        holdTimer = buy(id) === false ? 0 : setTimeout(again, 110);
      };
      holdTimer = setTimeout(again, 400);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) list.addEventListener(type, release);
    list.addEventListener('click', (e) => {
      if (e.target.closest('#go-move')) return openMove();
      const btn = e.target.closest('.up-row');
      if (held) { held = false; return; } // 꾹 눌러서 이미 샀다.
      if (btn) buy(btn.dataset.buy);
    });
    render();
    if (focus === 'egg') $('#egg-head', list)?.scrollIntoView({ block: 'start' });
    const timer = setInterval(paint, 400);
    ui.cleanup = () => { clearInterval(timer); release(); };
  }

  function openMove() {
    if (ui.cleanup) ui.cleanup(); // 키우기 화면의 타이머를 끝낸다. 이 화면은 시트를 그대로 덮어쓴다.
    ui.cleanup = null;
    const gems = I.moveGems(save);
    const percent = Math.round((save.idle.gems + gems) * I.GEM_BONUS * 100);
    const sheet = openSheet(`<div class="sheet-in center">
      <h2 class="title">새 섬으로 이사할까요?</h2>
      <p class="lede">코인과 일꾼, 터치 강화는 처음부터 다시 시작해요. 공룡과 레벨, 별, 모자, 모험 기록은 그대로예요.</p>
      <p class="lede">보석 ${gems}개를 받아서 앞으로 모든 코인이 <b class="amber">${percent}%</b> 더 많아져요.</p>
      <button class="big" id="move-ok">이사하기</button>
      <button class="big ghost" id="move-no">아직 안 할래요</button></div>`);
    $('#move-no', sheet).addEventListener('click', () => openGrow());
    $('#move-ok', sheet).addEventListener('click', () => {
      I.move(save);
      writeSave();
      closeSheet();
      snd.play.levelUp();
      confetti();
      updateCoins();
      say('새 섬에 도착했어요! 다시 힘내요!');
    });
  }

  $('#btn-grow').addEventListener('click', () => { snd.play.tap(); openGrow(); });
  $('#btn-rain').addEventListener('click', useRain);
  $('#btn-rush').addEventListener('click', useRush);
  $('#coinbar .coin-icon').innerHTML = COIN;

  scene.addEventListener('click', (e) => {
    if (ui.mode === 'sleep' && e.target !== dinoEl && !dinoEl.contains(e.target)) wake();
  });

  $('#actions').addEventListener('click', (e) => {
    const btn = e.target.closest('.act');
    if (!btn) return;
    snd.play.tap();
    const act = btn.dataset.act;
    const mode = ui.mode;
    if (mode === 'sleep') {
      wake();
      if (act === 'energy') return;
    }
    if (mode === 'feed') closeTray();
    if (mode === 'bath') endBath();
    if (act === 'food') { if (mode !== 'feed') openTray(); }
    if (act === 'clean') { if (mode !== 'bath') startBath(); }
    if (act === 'adv') {
      if (mode === 'feed' || mode === 'bath') refresh();
      Adv.openMap();
    }
    if (act === 'fun') openPlayMenu();
    if (act === 'energy') startSleep();
    refresh();
  });

  $('#tray-foods').addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.food');
    if (!btn) return;
    e.preventDefault();
    startDrag(e, btn.dataset.food);
  });
  $('#tray-close').addEventListener('click', closeTray);
  $('#bath-close').addEventListener('click', () => { endBath(); refresh(); });

  /* ---------- 돌아다니기 ---------- */

  function stopWalking() {
    dinoEl.classList.remove('walking');
    const wrap = $('#dino-wrap');
    wrap.style.setProperty('--x', String(parseFloat(getComputedStyle(wrap).left) / scene.clientWidth * 100));
    if (ui.mode !== 'idle') wrap.style.setProperty('--x', '50');
    $('#dino-flip').classList.remove('flip');
  }

  function wander() {
    if (ui.mode !== 'idle' || !$('#sheet').hidden) return;
    const wrap = $('#dino-wrap');
    const now = parseFloat(wrap.style.getPropertyValue('--x')) || 50;
    const next = rand(34, 66);
    $('#dino-flip').classList.toggle('flip', next < now);
    dinoEl.classList.add('walking');
    wrap.style.setProperty('--x', String(next));
    setTimeout(() => dinoEl.classList.remove('walking'), 2600);
  }

  /* ---------- 시트 공통 ---------- */

  function openSheet(html) {
    const sheet = $('#sheet');
    sheet.innerHTML = html;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    return sheet;
  }

  function closeSheet() {
    if (ui.cleanup) ui.cleanup();
    ui.cleanup = null;
    $('#sheet').hidden = true;
    $('#sheet').innerHTML = '';
    const next = ui.afterClose;
    ui.afterClose = null;
    if (next) next();
  }

  const closeBtn = '<button class="icon-btn" data-close aria-label="닫기"><svg viewBox="0 0 32 32" aria-hidden="true"><path class="line" d="M9 9L23 23M23 9L9 23"/></svg></button>';

  $('#sheet').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      snd.play.tap();
      closeSheet();
    }
  });

  /* ---------- 알 고르기와 부화 ---------- */

  function openEggPicker() {
    const first = save.dinos.length === 0;
    const owned = new Set(save.dinos.map((d) => d.species));
    const left = SPECIES.filter((s) => !owned.has(s.id));
    const cards = left.map((sp) => {
      const open = S.isUnlocked(save, sp);
      return `<button class="card${open ? '' : ' locked'}" data-egg="${sp.id}"${open ? '' : ' disabled'}>
        <div class="art${open ? '' : ' silhouette'}">${A.egg(sp.id)}</div>
        ${open ? sp.name : '숨겨진 알'}
        ${open ? '' : `<small>${REGIONS.find((r) => r.id === sp.unlock).name} 보스를 이기면 열려요</small>`}
      </button>`;
    }).join('');
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>어떤 알을 품어 볼까요?</h2>${first ? '' : closeBtn}</div>
      <p class="lede">알을 하나 고르면 내 공룡이 태어나요.</p>
      <div class="grid">${cards}</div></div>`);
    $$('[data-egg]', sheet).forEach((el) => el.addEventListener('click', () => {
      snd.play.pop();
      startHatch(el.dataset.egg);
    }));
  }

  function startHatch(speciesId) {
    let taps = 0;
    const sheet = openSheet(`<div class="sheet-in hatch">
      <h2 style="font:28px var(--display)">알을 톡톡 두드려 주세요!</h2>
      <button id="egg-big" aria-label="알 두드리기">${A.egg(speciesId)}</button>
      <p class="lede" id="egg-tip">안에서 뭔가 움직여요.</p></div>`);
    const egg = $('#egg-big', sheet);
    snd.say('알을 톡톡 두드려 주세요!');
    egg.addEventListener('click', () => {
      taps += 1;
      snd.play.crack();
      egg.innerHTML = A.egg(speciesId, Math.min(4, taps));
      egg.classList.remove('wobble');
      void egg.offsetWidth;
      egg.classList.add('wobble');
      if (taps === 2) $('#egg-tip', sheet).textContent = '금이 갔어요! 조금만 더!';
      if (taps >= 5) {
        snd.play.hatch();
        confetti();
        openNaming(speciesId);
      }
    });
  }

  function openNaming(speciesId) {
    const sp = SPECIES.find((s) => s.id === speciesId);
    const draft = { species: speciesId, stage: 'baby', color: sp.color, name: '' };
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>태어났어요! 아기 ${sp.name}</h2></div>
      <div class="hero" id="hero">${A.dino(draft, { mini: true })}</div>
      <div class="swatches">${Object.entries(COLORS).map(([id, c]) => `<button class="swatch${id === draft.color ? ' on' : ''}" data-color="${id}" style="background:${c.c1}" aria-label="${c.label} 색"></button>`).join('')}</div>
      <label class="field">이름을 지어 주세요
        <input id="name-input" maxlength="8" autocomplete="off" placeholder="이름 쓰기"></label>
      <div class="chips">${NAMES.map((n) => `<button class="name-chip" data-name="${n}">${n}</button>`).join('')}</div>
      <button class="big" id="name-ok" disabled>이 이름으로 할래요</button></div>`);
    const input = $('#name-input', sheet);
    const ok = $('#name-ok', sheet);
    const sync = () => {
      input.value = input.value.replace(/[<>&"]/g, ''); // 이름은 화면 곳곳의 HTML에 그대로 들어간다.
      ok.disabled = !input.value.trim();
      $$('.name-chip', sheet).forEach((c) => c.classList.toggle('on', c.dataset.name === input.value));
    };
    input.addEventListener('input', sync);
    $$('.name-chip', sheet).forEach((c) => c.addEventListener('click', () => {
      snd.play.tap();
      input.value = c.dataset.name;
      sync();
    }));
    $$('.swatch', sheet).forEach((c) => c.addEventListener('click', () => {
      snd.play.pop();
      draft.color = c.dataset.color;
      $$('.swatch', sheet).forEach((x) => x.classList.toggle('on', x === c));
      $('#hero', sheet).innerHTML = A.dino(draft, { mini: true });
    }));
    ok.addEventListener('click', () => {
      const d = S.newDino(speciesId, input.value.trim(), draft.color);
      save.dinos.push(d);
      save.active = d.id;
      writeSave();
      closeSheet();
      mountDino();
      snd.cry(dinoVoice(d).cry);
      flash('cheer', 1000);
      say(`안녕! 나는 ${josa(d.name, '이에요', '예요')}!`, true, '안녕! 반가워요!');
    });
  }

  /* ---------- 성장 축하 ---------- */

  function celebrate(stage, d = dino()) {
    snd.play.levelUp();
    confetti();
    mountDino();
    const canEgg = stage === 'adult' && eggsForSale().length > 0;
    const sheet = openSheet(`<div class="sheet-in hatch">
      <h2 style="font:30px var(--display)">${josa(d.name, '이', '가')} ${STAGE_LABEL[stage]} 공룡이 됐어요!</h2>
      <div class="hero">${A.dino(d, { mini: true })}</div>
      <p class="lede">${stage === 'adult' ? '정성껏 돌봐 줘서 튼튼하게 다 컸어요. 도감에 기록했어요.' : '몸도 머리도 쑥쑥 자랐어요.'}</p>
      ${canEgg ? '<button class="big" id="more-egg">알 가게 가기</button>' : ''}
      <button class="big ${canEgg ? 'ghost' : ''}" data-close>계속 놀기</button></div>`);
    snd.say(`${josa(d.name, '이', '가')} ${STAGE_LABEL[stage]} 공룡이 됐어요!`, false, undefined, `${STAGE_LABEL[stage]} 공룡이 됐어요!`);
    $('#more-egg', sheet)?.addEventListener('click', () => {
      ui.afterClose = null;
      openGrow('egg');
    });
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.id = 'confetti';
    const colors = ['#FF6B4A', '#FFD23F', '#3CC4C9', '#58B947', '#FF5C8A'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i');
      c.style.left = `${rand(0, 100)}%`;
      c.style.background = pick(colors);
      c.style.animationDuration = `${rand(1.6, 3)}s`;
      c.style.animationDelay = `${rand(0, .6)}s`;
      box.append(c);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 3800);
  }

  /* ---------- 도감 ---------- */

  function openBook(tab = 'dinos') {
    const owned = (id) => save.dinos.find((d) => d.species === id);
    const dinoCards = SPECIES.map((sp) => {
      const d = owned(sp.id);
      const shown = d || { species: sp.id, stage: 'adult', color: sp.color };
      const unknownLocked = !d && !S.isUnlocked(save, sp);
      return `<button class="card${d && d.id === save.active ? ' on' : ''}" data-sp="${sp.id}"${d ? '' : ' disabled'}>
        <div class="art${d ? '' : ' silhouette'}">${A.dino(shown, { mini: true })}</div>
        ${d ? esc(d.name) : unknownLocked ? '숨겨진 공룡' : sp.name}
        <small>${d ? `${STAGE_LABEL[d.stage]} ${sp.name}${plusTag(d)}` : '아직 못 만났어요'}</small>
      </button>`;
    }).join('');
    const fossilCards = FOSSILS.map((f) => {
      const has = save.fossils.includes(f.id);
      return `<button class="card" data-fossil="${f.id}"${has ? '' : ' disabled'}>
        <div class="art${has ? '' : ' silhouette'}">${A.fossil(f.id)}</div>
        ${has ? f.name : '아직 못 찾았어요'}
      </button>`;
    }).join('');
    // 첫 알만 공짜다. 다음 알부터는 코인으로 산다.
    const eggBtn = eggsForSale().length ? '<button class="big" id="book-egg">알 가게 가기</button>' : '';
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>공룡 도감</h2>${closeBtn}</div>
      <div class="tabs">
        <button class="tab${tab === 'dinos' ? ' on' : ''}" data-tab="dinos">공룡 ${save.dinos.length}/${SPECIES.length}</button>
        <button class="tab${tab === 'fossils' ? ' on' : ''}" data-tab="fossils">화석 ${save.fossils.length}/${FOSSILS.length}</button>
      </div>
      ${tab === 'dinos' ? eggBtn : ''}
      <div class="grid">${tab === 'dinos' ? dinoCards : fossilCards}</div></div>`);
    $$('[data-tab]', sheet).forEach((b) => b.addEventListener('click', () => { snd.play.tap(); openBook(b.dataset.tab); }));
    $$('[data-sp]', sheet).forEach((b) => b.addEventListener('click', () => { snd.play.tap(); openFacts(b.dataset.sp); }));
    $$('[data-fossil]', sheet).forEach((b) => b.addEventListener('click', () => { snd.play.tap(); openFossil(b.dataset.fossil); }));
    $('#book-egg', sheet)?.addEventListener('click', () => { snd.play.tap(); openGrow('egg'); });
  }

  function openFacts(speciesId) {
    const sp = SPECIES.find((s) => s.id === speciesId);
    const d = save.dinos.find((x) => x.species === speciesId);
    const level = S.levelInfo(d.growth).level;
    const f = B.fighter(window.DinoData, { species: d.species, name: d.name, level, plus: I.plusOf(d) });
    // 길이 감각을 익히도록 12m 버스와 나란히 그린다. 가장 긴 공룡이 폭을 꽉 채운다.
    const longest = Math.max(BUS_M, ...SPECIES.map((s) => s.lengthM));
    const buses = sp.lengthM / BUS_M;
    const compare = buses >= 1.5 ? `버스 ${Math.round(buses * 2) / 2}대쯤` : buses >= .9 ? '버스 1대쯤' : buses >= .4 ? '버스의 절반쯤' : '어른 키만큼';
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>${sp.name}</h2>${closeBtn}</div>
      <div class="hero">${A.dino(d, { mini: true })}</div>
      <div class="facts">
        <div class="fact-row"><b>이름</b><span>${esc(d.name)} (${STAGE_LABEL[d.stage]})</span></div>
        <div class="fact-row"><b>살던 때</b><span>${sp.era}, ${sp.age}</span></div>
        <div class="fact-row"><b>먹이</b><span>${sp.dietLabel}</span></div>
        <div class="fact-row"><b>이야기</b><span>${sp.fact}</span></div>
      </div>
      <div class="sheet-head"><h2 style="font-size:20px">Lv.${level} 능력</h2>${Adv.typeBadge(sp.type)}</div>
      <div class="stat-grid">
        <div class="stat">${Math.round(f.maxHp)}<small>체력</small></div><div class="stat">${Math.round(f.atk)}<small>공격</small></div>
        <div class="stat">${Math.round(f.def)}<small>방어</small></div><div class="stat">${Math.round(f.spd)}<small>속도</small></div>
      </div>
      <div class="skill-list">${sp.learn.map(([at, id]) => `<div class="skill-row${level >= at ? '' : ' locked'}">${Adv.typeBadge(SKILLS[id].type)}<span>${SKILLS[id].name}</span><small>${level >= at ? (SKILLS[id].power ? `위력 ${SKILLS[id].power}` : '보조') : `Lv.${at}에 배워요`}</small></div>`).join('')}</div>
      <div class="ruler">
        <span>${sp.lengthWord || '몸길이'} 약 ${sp.lengthM}m, ${compare}</span>
        <div class="bar dino-bar" style="width:${(sp.lengthM / longest) * 100}%"></div>
        <span>버스 12m</span>
        <div class="bar bus-bar" style="width:${(BUS_M / longest) * 100}%"></div>
      </div>
      ${d.id === save.active ? '' : `<button class="big" id="switch">${d.name}${hasBatchim(d.name) ? '과' : '와'} 놀기</button>`}
      <button class="big ghost" id="back">도감으로</button></div>`);
    $('#back', sheet).addEventListener('click', () => openBook());
    $('#switch', sheet)?.addEventListener('click', () => {
      save.active = d.id;
      writeSave();
      closeSheet();
      mountDino();
      flash('cheer', 1000);
      snd.cry(dinoVoice(d).cry);
      say(`${d.name}, 왔어요!`, false);
    });
  }

  function openFossil(id) {
    const f = FOSSILS.find((x) => x.id === id);
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>${f.name}</h2>${closeBtn}</div>
      <div class="hero" style="max-width:260px">${A.fossil(id)}</div>
      <p class="lede">${f.fact}</p>
      <button class="big ghost" id="back">도감으로</button></div>`);
    $('#back', sheet).addEventListener('click', () => openBook('fossils'));
  }

  /* ---------- 꾸미기 가게 ---------- */

  function openShop(tab = 'hats') {
    const d = dino();
    const themeCards = THEMES.map((t) => {
      const has = save.themes.includes(t.id);
      const on = save.theme === t.id;
      return `<button class="card${on ? ' on' : ''}" data-theme="${t.id}"${has || save.stars >= t.price ? '' : ' disabled'}>
        <div class="theme-chip" style="background:linear-gradient(${t.sky} 62%, ${t.ground} 62%)"></div>${t.name}
        <small>${on ? '지금 섬' : has ? '내 섬' : `별 ${t.price}개`}</small></button>`;
    }).join('');
    const cards = HATS.map((h) => {
      const has = save.hats.includes(h.id);
      const wearing = d.hat === h.id;
      const afford = save.stars >= h.price;
      return `<button class="card${wearing ? ' on' : ''}" data-hat="${h.id}"${has || afford ? '' : ' disabled'}>
        <div class="art">${A.hat(h.id)}</div>${h.name}
        <small>${wearing ? '쓰고 있어요' : has ? '내 모자' : `별 ${h.price}개`}</small></button>`;
    }).join('');
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>꾸미기 가게</h2>${closeBtn}</div>
      <p class="lede">가진 별 ${save.stars}개. 돌봐 주고 놀아 주면 별을 받아요.</p>
      <div class="tabs">
        <button class="tab${tab === 'hats' ? ' on' : ''}" data-tab="hats">모자</button>
        <button class="tab${tab === 'themes' ? ' on' : ''}" data-tab="themes">섬</button>
      </div>
      <div class="grid">${tab === 'hats' ? cards : themeCards}</div></div>`);
    $$('[data-tab]', sheet).forEach((b) => b.addEventListener('click', () => { snd.play.tap(); openShop(b.dataset.tab); }));
    $$('[data-hat]', sheet).forEach((b) => b.addEventListener('click', () => {
      const hat = HATS.find((h) => h.id === b.dataset.hat);
      if (!save.hats.includes(hat.id)) S.buyHat(save, hat);
      d.hat = d.hat === hat.id ? null : hat.id;
      snd.play.happy();
      writeSave();
      mountDino();
      openShop();
    }));
    $$('[data-theme]', sheet).forEach((b) => b.addEventListener('click', () => {
      const theme = THEMES.find((t) => t.id === b.dataset.theme);
      if (!save.themes.includes(theme.id)) S.buyTheme(save, theme);
      save.theme = theme.id;
      snd.play.happy();
      applyTheme();
      refresh();
      writeSave();
      openShop('themes');
    }));
  }

  /* ---------- 오늘의 미션 ---------- */

  function openAchievements() {
    const stats = I.achvStats(save, regionsCleared());
    const rows = ACHIEVEMENTS.map((a) => {
      const done = save.achv.includes(a.id);
      const now = Math.min(stats[a.stat], a.goal);
      return `<div class="mission achv${done ? ' done' : ''}"><span>${a.name}<small>${a.text}</small></span>
        <b>${done ? '완료' : `${I.format(now)}/${I.format(a.goal)}`}</b><em>${A.star}${a.stars}</em></div>`;
    }).join('');
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>업적</h2>${closeBtn}</div>
      ${missionTabs('achv')}
      <div class="facts">${rows}</div></div>`);
    bindMissionTabs(sheet);
  }

  const missionTabs = (tab) => `<div class="tabs">
    <button class="tab${tab === 'daily' ? ' on' : ''}" data-tab="daily">오늘의 미션</button>
    <button class="tab${tab === 'achv' ? ' on' : ''}" data-tab="achv">업적 ${save.achv.length}/${ACHIEVEMENTS.length}</button></div>`;
  function bindMissionTabs(sheet) {
    $$('[data-tab]', sheet).forEach((b) => b.addEventListener('click', () => {
      snd.play.tap();
      if (b.dataset.tab === 'achv') openAchievements();
      else openMissions();
    }));
  }

  function openMissions() {
    const daily = save.daily;
    const rows = daily.missions.map((m) => {
      const info = MISSIONS.find((x) => x.id === m.id);
      return `<button class="mission${m.done >= m.goal ? ' done' : ''}" data-text="${info.text}"><span>${info.text}</span><b>${m.done}/${m.goal}</b></button>`;
    }).join('');
    const filled = save.stamps % S.STAMP_CARD;
    // 7칸을 막 채운 직후에는 다음 판으로 넘기지 않고 꽉 찬 판을 보여 준다.
    const shown = daily.claimed && save.stamps > 0 && filled === 0 ? S.STAMP_CARD : filled;
    const stamps = Array.from({ length: S.STAMP_CARD }, (_, i) => `<div class="stamp${i < shown ? ' on' : ''}">${i < shown ? A.star : i + 1}</div>`).join('');
    const ready = S.missionsDone(save) && !daily.claimed;
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>오늘의 미션</h2>${closeBtn}</div>
      ${missionTabs('daily')}
      <div class="facts">${rows}</div>
      <p class="lede">미션을 다 하면 도장을 찍어요. 도장 ${S.STAMP_CARD}개를 모으면 별 30개를 받아요.</p>
      <div class="stamps">${stamps}</div>
      ${daily.claimed ? '<p class="lede">오늘 도장을 찍었어요. 내일 또 만나요!</p>' : `<button class="big" id="claim"${ready ? '' : ' disabled'}>도장 찍기</button>`}</div>`);
    bindMissionTabs(sheet);
    $$('.mission', sheet).forEach((b) => b.addEventListener('click', () => snd.say(b.dataset.text, true)));
    $('#claim', sheet)?.addEventListener('click', () => {
      const got = S.claimDaily(save);
      if (!got) return;
      snd.play.levelUp();
      confetti();
      refresh();
      writeSave();
      openMissions();
      snd.say(`도장 쾅! 별 ${got.stars}개를 받았어요!`, true);
    });
  }

  /* ---------- 미니게임과 공룡 대결 (play.js) ---------- */

  const { openPlayMenu, finishGame } = window.DinoPlay.init({
    save, ui, $, $$, esc, josa, rand, pick, speciesOf, dino, mission, refresh, writeSave, openSheet, closeSheet, closeBtn, celebrate,
  });

  /* ---------- 어른용 설정 ---------- */

  function openSettings() {
    const row = (key, label) => `<button class="toggle${save.opts[key] ? ' on' : ''}" data-opt="${key}"><span>${label}</span><i>${save.opts[key] ? '켜짐' : '꺼짐'}</i></button>`;
    const sheet = openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>어른용 설정</h2>${closeBtn}</div>
      ${row('sound', '효과음')}${row('voice', '공룡 말 읽어주기')}
      <p class="note">이 앱에는 광고와 결제가 없고, 아이의 정보를 어디로도 보내지 않습니다. 공룡과 별은 지금 이 기기에만 저장되므로 앱을 지우거나 앱 데이터를 지우면 함께 사라집니다.</p>
      <p class="note">공룡은 오래 돌보지 않아도 죽지 않습니다. 앱을 꺼 둔 동안에는 상태가 일정 수준 아래로 내려가지 않습니다.</p>
      <h3 class="up-head">저장 옮기기</h3>
      <p class="note">기기를 바꾸거나 앱을 다시 깔 때 쓰는 저장 코드예요. 코드를 메모장이나 메신저에 붙여 두었다가 새 기기에서 넣으면 공룡과 코인이 그대로 돌아옵니다.</p>
      <button class="big ghost" id="code-make">저장 코드 만들기</button>
      <textarea class="code" id="code-box" rows="4" spellcheck="false" autocomplete="off" placeholder="다른 기기에서 만든 저장 코드를 여기에 붙여 넣어요"></textarea>
      <p class="note" id="code-note" hidden></p>
      <button class="big ghost" id="code-load">저장 코드로 불러오기</button>
      <h3 class="up-head">처음으로</h3>
      <button class="big" id="reset"><span id="reset-label">처음부터 다시 하기 (3초 꾹 누르기)</span></button></div>`);
    const box = $('#code-box', sheet);
    const note = (text) => {
      $('#code-note', sheet).hidden = false;
      $('#code-note', sheet).textContent = text;
    };
    let sure = false;
    box.addEventListener('input', () => { sure = false; $('#code-load', sheet).textContent = '저장 코드로 불러오기'; });
    $('#code-make', sheet).addEventListener('click', async () => {
      snd.play.tap();
      box.value = S.exportCode(save);
      box.select();
      try {
        await navigator.clipboard.writeText(box.value);
        note('코드를 복사했어요. 메모장이나 메신저에 붙여 넣어 두세요.');
      } catch {
        note('코드를 만들었어요. 위 칸을 길게 눌러 모두 복사해 두세요.');
      }
    });
    $('#code-load', sheet).addEventListener('click', () => {
      snd.play.tap();
      const loaded = S.importCode(box.value);
      if (!loaded) return note('코드가 맞지 않아요. 처음부터 끝까지 빠짐없이 붙여 넣었는지 확인해 주세요.');
      if (!sure) {
        sure = true;
        $('#code-load', sheet).textContent = '한 번 더 누르면 불러와요';
        return note(`이 코드에는 공룡 ${loaded.dinos.length}마리가 들어 있어요. 불러오면 지금 이 기기의 공룡과 코인은 사라집니다.`);
      }
      try {
        localStorage.setItem(KEY, S.touch(loaded));
      } catch {
        return note('이 기기에는 저장할 수 없어요.');
      }
      ui.resetting = true;
      location.reload();
    });
    $$('[data-opt]', sheet).forEach((b) => b.addEventListener('click', () => {
      save.opts[b.dataset.opt] = !save.opts[b.dataset.opt];
      snd.configure(save.opts);
      writeSave();
      openSettings();
    }));
    const reset = $('#reset', sheet);
    let timer = 0;
    const cancel = () => { clearTimeout(timer); reset.classList.remove('holding'); };
    reset.addEventListener('pointerdown', () => {
      reset.classList.add('holding');
      timer = setTimeout(() => {
        try { localStorage.removeItem(KEY); } catch { /* 저장소를 못 쓰면 새로고침만 한다 */ }
        ui.resetting = true;
        location.reload();
      }, 3000);
    });
    reset.addEventListener('pointerup', cancel);
    reset.addEventListener('pointerleave', cancel);
    reset.addEventListener('pointercancel', cancel);
  }

  $('#btn-stars').addEventListener('click', () => { snd.play.tap(); openShop(); });
  $('#btn-book').addEventListener('click', () => { snd.play.tap(); openBook(); });
  $('#btn-settings').addEventListener('click', () => { snd.play.tap(); openSettings(); });
  $('#btn-mission').addEventListener('click', () => { snd.play.tap(); openMissions(); });
  $('#star-icon').innerHTML = A.star;

  /* ---------- 시간 흐름 ---------- */

  setInterval(() => {
    const d = dino();
    if (!d) return;
    if (!document.hidden) I.earn(save, I.income(save, WORKERS));
    const sleeping = ui.mode === 'sleep';
    S.tick(d, 1, { sleeping });
    if (sleeping) {
      d.needs.energy = Math.min(100, d.needs.energy + 7);
      if (d.needs.energy >= 100) wake();
    }
    refresh();
    updateCoins();
    const now = Date.now();
    if (ui.mode === 'idle' && $('#sheet').hidden) {
      checkRank();
      checkAchievements();
      if (now >= ui.nextGold) {
        ui.nextGold = now + rand(40000, 80000);
        spawnGold();
      }
      if (!save.idle.life && now - ui.lastHint > 8000) {
        ui.lastHint = now;
        say('화면을 톡톡 눌러서 코인을 모아 봐요!');
      }
    }
    if (ui.mode === 'idle' && $('#sheet').hidden && now - ui.lastHint > 25000) {
      const low = S.NEEDS.filter((k) => d.needs[k] < 35).sort((a, b) => d.needs[a] - d.needs[b])[0];
      if (low) {
        ui.lastHint = now;
        say(CARE_TEXT[low]);
      }
    }
  }, 1000);

  setInterval(wander, 6000);
  // 숨겨진 동안 저장하면 lastSeen이 갱신되어 자리 비움 수입이 사라진다.
  setInterval(() => { if (!document.hidden) writeSave(); }, 10000);
  setInterval(() => { if (S.ensureDaily(save, MISSIONS)) refresh(); }, 60000);
  setInterval(() => {
    const svg = $('.dino-svg', dinoEl);
    if (!svg || ui.mode === 'sleep') return;
    dinoEl.classList.add('blink');
    setTimeout(() => dinoEl.classList.remove('blink'), 140);
  }, 3400);

  const flush = () => { if (!ui.resetting) writeSave(); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
    else {
      const away = I.offline(save, WORKERS);
      S.catchUp(save);
      S.ensureDaily(save, MISSIONS);
      refresh();
      updateCoins();
      showAway(away);
    }
  });
  window.addEventListener('pagehide', () => { if (!document.hidden) flush(); });

  // 안드로이드 앱에서 부른다. 처리했으면 true, 앱을 내려도 되면 false를 돌려준다.
  window.dinoFlush = flush;
  window.dinoBack = () => {
    if (!$('#sheet').hidden) {
      if (!$('#sheet [data-close]')) return save.dinos.length > 0;
      closeSheet();
      return true;
    }
    if (ui.mode === 'feed') closeTray();
    else if (ui.mode === 'bath') endBath();
    else if (ui.mode === 'sleep') wake();
    else return false;
    return true;
  };

  Adv.init({
    save, $, $$, esc, josa, ui, snd, closeBtn, openSheet, closeSheet, writeSave, refresh, mountDino, mission, confetti, celebrate, finishGame,
  });
  applyTheme();
  if (dino()) mountDino();
  else openEggPicker();
  refresh();
  updateCoins();
  showAway(awayAtStart);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인 설치만 못 할 뿐 게임은 돌아간다 */ });
  }
})();
