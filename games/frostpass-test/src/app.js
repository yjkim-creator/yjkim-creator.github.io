// 서리 고개 화면 코드.
// 약속: 1) localStorage는 try/catch로 감싼다. 2) window.appFlush는 앱이 가려질 때 저장한다.
// 3) window.appBack은 뒤로 갈 화면이 있으면 처리하고 true를 돌려준다.
// 4) 주소가 #shot=번호이면 그 번호의 대표 화면을 그린다(스토어 스크린샷용).
(function () {
  const L = window.Logic;
  const A = window.Art;
  const KEY = 'frostpass-v1';
  const KO = /^ko/i.test(navigator.language || '');
  const shotMatch = /shot=(\d)/.exec(location.hash);
  const SHOT = shotMatch ? Number(shotMatch[1]) : 0;

  // ---------- 글
  const TEXT = {
    ko: {
      daily: '오늘의 고개', practice: '연습 판', wave: (n) => `파도 ${n}/${L.WAVES}`,
      tipStart: '카드를 골라 빛나는 칸에 놓으세요. 눈덩이가 아래 마을에 닿기 전에!',
      tipPick: (n) => `카드를 고르세요 · 장작 ${n}`,
      tipPlace: '빛나는 칸을 누르세요', tipSpell: '빛나는 길을 누르세요',
      tipCost: (n) => `장작이 모자라요 (필요 ${n}). 기다리면 1개씩 찹니다`,
      tipNo: '그 칸에는 놓을 수 없어요', tipStorm: '위쪽 두 줄은 눈보라 지대라 유닛을 놓을 수 없어요',
      wait: '기다리기', waitSub: '장작 +1 · 새 손패',
      hp: (n) => `체력 ${n}`, cost: '장작',
      draftTitle: (n) => `파도 ${n} 막음`, draftSub: '덱에 넣을 카드를 한 장 고르세요', skip: '넣지 않고 넘기기',
      won: '고개를 지켰습니다', lost: '마을의 등불이 모두 꺼졌습니다',
      score: '점수', meltedN: '녹인 눈덩이', hearts: '남은 등불', reached: '도달한 파도',
      again: '다시 도전', newPractice: '새 연습 판', toDaily: '오늘의 고개로', toPractice: '연습 판 하기',
      streak: (n) => `${n}일 연속으로 고개에 올랐어요`, todayBest: (n) => `오늘 최고 ${n}점`,
      bestPractice: (n) => `연습 최고 ${n}점`,
      menu: '메뉴', resume: '이어 하기', codex: '도감', records: '기록', soundOn: '소리 켜짐', soundOff: '소리 꺼짐', how: '놀이 방법', close: '닫기',
      enemies: '눈 괴물', cards: '카드', unseen: '아직 못 만남', inDeck: '모은 카드', fromDraft: '보상에서 만날 수 있음',
      recTitle: '기록', last28: '최근 4주 오늘의 고개', wins: '이긴 판', runs: '한 판 수', totalMelt: '녹인 눈덩이',
      howLines: [
        '눈덩이는 꼭대기에서 나타나 한 차례에 한 칸씩 내려옵니다. 맨 위 띠에 다음 차례 나올 자리가 보입니다.',
        '차례마다 카드 한 장을 씁니다. 카드 왼쪽 위 숫자만큼 장작이 들고, 장작은 차례마다 1개 찹니다.',
        '아래 마을까지 내려온 눈덩이는 등불을 끕니다. 등불 다섯 개가 다 꺼지면 집니다.',
        '파도 8개를 막으면 승리. 파도 사이에 카드를 골라 덱을 키웁니다. 오늘의 고개는 모두에게 같은 판입니다.',
      ],
      clear: (n) => `파도 ${n} 막음`, lastWave: '마지막 파도',
    },
    en: {
      daily: "Today's Pass", practice: 'Practice', wave: (n) => `Wave ${n}/${L.WAVES}`,
      tipStart: 'Pick a card and drop it on a glowing tile. Stop the snow before it reaches the village!',
      tipPick: (n) => `Pick a card · ${n} firewood`,
      tipPlace: 'Tap a glowing tile', tipSpell: 'Tap a glowing lane',
      tipCost: (n) => `Not enough firewood (needs ${n}). It refills by 1 each turn`,
      tipNo: "Can't place it there", tipStorm: 'The top two rows are the blizzard zone. No units there',
      wait: 'Wait', waitSub: '+1 wood · new hand',
      hp: (n) => `HP ${n}`, cost: 'Wood',
      draftTitle: (n) => `Wave ${n} held`, draftSub: 'Add one card to your deck', skip: 'Skip',
      won: 'You held the pass', lost: 'Every village lantern went out',
      score: 'Score', meltedN: 'Snow melted', hearts: 'Lanterns left', reached: 'Wave reached',
      again: 'Try again', newPractice: 'New practice', toDaily: "Today's Pass", toPractice: 'Play practice',
      streak: (n) => `${n}-day climb streak`, todayBest: (n) => `Today's best ${n}`,
      bestPractice: (n) => `Practice best ${n}`,
      menu: 'Menu', resume: 'Continue', codex: 'Field guide', records: 'Records', soundOn: 'Sound on', soundOff: 'Sound off', how: 'How to play', close: 'Close',
      enemies: 'Snow creatures', cards: 'Cards', unseen: 'Not met yet', inDeck: 'Collected', fromDraft: 'Found in rewards',
      recTitle: 'Records', last28: "Last 4 weeks of Today's Pass", wins: 'Wins', runs: 'Runs', totalMelt: 'Snow melted',
      howLines: [
        'Snow creatures appear at the top and roll down one tile per turn. The strip above the board shows where the next ones appear.',
        'Play one card per turn. The number on a card is its firewood cost; you gain 1 firewood each turn.',
        'Anything that reaches the village puts out lanterns. Lose all five and the run ends.',
        "Hold 8 waves to win. Between waves, pick a card to grow your deck. Today's Pass is the same for everyone.",
      ],
      clear: (n) => `Wave ${n} held`, lastWave: 'Final wave',
    },
  };
  const t = KO ? TEXT.ko : TEXT.en;
  const CARD_TEXT = KO ? {
    thrower: ['투척수', '같은 길 위쪽 가장 가까운 적에게 매 차례 1'],
    wall: ['얼음벽', '체력 4. 길을 막고 버틴다'],
    brazier: ['화롯불', '둘레 8칸의 적에게 매 차례 1'],
    catapult: ['눈 투석기', '같은 길 위쪽 적에게 매 차례 2'],
    trap: ['고드름 덫', '밟은 적에게 3. 한 번 쓰면 사라짐'],
    shovel: ['눈삽', '고른 길 맨 앞 적에게 바로 2'],
    gust: ['산바람', '고른 길의 적을 두 칸 밀어 올림'],
  } : {
    thrower: ['Thrower', 'Hits the nearest foe up its lane for 1 each turn'],
    wall: ['Ice Wall', '4 HP. Blocks the lane'],
    brazier: ['Brazier', 'Deals 1 to every foe in the 8 tiles around it each turn'],
    catapult: ['Snow Catapult', 'Hits the nearest foe up its lane for 2 each turn'],
    trap: ['Icicle Trap', 'Deals 3 to whatever steps on it, then breaks'],
    shovel: ['Shovel', 'Deals 2 right now to the lowest foe in a lane'],
    gust: ['Mountain Gust', 'Pushes every foe in a lane up two tiles'],
  };
  const ENEMY_TEXT = KO ? {
    blob: ['눈뭉치', '체력 2 · 한 차례에 한 칸'],
    wisp: ['싸라기', '체력 1 · 한 차례에 두 칸'],
    splitter: ['금 간 눈뭉치', '체력 3 · 녹으면 양옆에 꼬마 둘'],
    boulder: ['바위눈덩이', '체력 6 · 두 차례에 한 칸 · 등불 2개를 끔'],
    mini: ['꼬마 눈뭉치', '체력 1 · 한 차례에 한 칸'],
  } : {
    blob: ['Snowball', '2 HP · one tile per turn'],
    wisp: ['Sleetling', '1 HP · two tiles per turn'],
    splitter: ['Cracked Snowball', '3 HP · splits into two Snowlets'],
    boulder: ['Boulderball', '6 HP · moves every other turn · puts out 2 lanterns'],
    mini: ['Snowlet', '1 HP · one tile per turn'],
  };
  const UNIT_ROWS_FROM = 2;

  // ---------- 저장
  const today = () => new Date().toLocaleDateString('sv-SE');
  function load() {
    try { return L.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return L.newMeta(); }
  }
  function save() {
    if (SHOT) return;
    try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch { /* 저장이 막힌 환경에서도 앱은 돌아간다. */ }
  }

  let meta = SHOT ? L.newMeta() : load();
  const ui = { sel: -1, overlay: null, tip: '', tipWarn: false };

  function startDaily(force) {
    const date = today();
    if (force || !meta.daily || meta.daily.date !== date) {
      meta.daily = L.newRun(L.dailySeed(date), 'daily');
      meta.daily.date = date;
    }
  }
  function startPractice(force) {
    if (force || !meta.practice) meta.practice = L.newRun(`p${Date.now().toString(36)}`, 'practice');
  }
  function current() { return meta[meta.active]; }

  // ---------- 소리 (Web Audio로 합성)
  let audio = null;
  function ac() {
    if (!meta.sound || SHOT) return null;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch { return null; }
  }
  function tone(freq, dur, opts) {
    const a = ac();
    if (!a) return;
    const o = Object.assign({ type: 'sine', vol: 0.12, to: null, delay: 0 }, opts);
    try {
      const t0 = a.currentTime + o.delay;
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = o.type;
      osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* 소리가 안 나도 게임은 이어진다 */ }
  }
  function crunch(dur, freq, vol, delay) {
    const a = ac();
    if (!a) return;
    try {
      const len = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 0.9;
      const g = a.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(a.destination);
      src.start(a.currentTime + (delay || 0));
    } catch { /* 무시 */ }
  }
  const sfx = {
    select: () => tone(660, 0.07, { type: 'triangle', vol: 0.06 }),
    place: () => { crunch(0.12, 500, 0.5); tone(180, 0.12, { type: 'triangle', vol: 0.1, to: 120 }); },
    hit: (i) => crunch(0.07, 2400, 0.35, i * 0.03),
    melt: (i) => tone(520, 0.22, { vol: 0.07, to: 1100, delay: 0.08 + i * 0.05 }),
    breach: () => { tone(110, 0.4, { type: 'sawtooth', vol: 0.08, to: 55 }); crunch(0.3, 200, 0.6); },
    clear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.08, delay: i * 0.09 })),
    no: () => tone(140, 0.12, { type: 'square', vol: 0.04 }),
    wait: () => tone(330, 0.1, { type: 'triangle', vol: 0.05, to: 300 }),
    win: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.08, delay: i * 0.1 })),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, { type: 'sine', vol: 0.08, delay: i * 0.16 })),
  };

  // ---------- 화면 뼈대
  const app = document.getElementById('app');
  if (SHOT) document.body.classList.add('shot');
  app.innerHTML = `
    <svg class="defs-holder" width="0" height="0" aria-hidden="true">${A.DEFS}</svg>
    <header class="top">
      <button class="menu-btn" data-act="menu" aria-label="${t.menu}">${A.ICONS.menu}</button>
      <div class="title"><b class="mode"></b><span class="wave-label"></span><div class="pips"></div></div>
      <div class="score-box"><small>${t.score}</small><b class="score"></b></div>
    </header>
    <div class="board-col">
      <div class="telegraph"></div>
      <div class="board">
        <svg class="slope" viewBox="0 0 500 600" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="gSlope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B4B7E"/><stop offset=".34" stop-color="#53689E"/><stop offset="1" stop-color="#7B92C2"/></linearGradient></defs>
          <rect width="500" height="600" fill="url(#gSlope)"/>
          ${[0, 1, 2, 3, 4].map((c) => `<path d="M${c * 100 + 50} 0 C${c * 100 + 30} 150 ${c * 100 + 70} 300 ${c * 100 + 50} 600" stroke="#E8EFFA" stroke-opacity=".16" stroke-width="58" fill="none"/>`).join('')}
          <rect width="500" height="200" fill="#1A2448" opacity=".35"/>
          <path d="M0 200 Q125 186 250 200 T500 200" stroke="#CFE0FF" stroke-opacity=".35" stroke-width="3" stroke-dasharray="10 10" fill="none"/>
        </svg>
        <div class="flakes" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${-(i * 1.3) % 9}s;animation-duration:${7 + (i % 5)}s"></i>`).join('')}</div>
        <div class="cells"></div>
        <div class="layer"></div>
        <div class="fx"></div>
      </div>
      <div class="village">
        <svg class="roofs" viewBox="0 0 500 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 L0 22 L40 6 L80 22 L120 10 L170 24 L215 8 L260 22 L300 12 L345 24 L390 6 L430 22 L470 10 L500 20 L500 40Z" fill="#2B2238"/>
          <path d="M0 22 L40 6 L80 22 M120 10 L170 24 M215 8 L260 22 M300 12 L345 24 M390 6 L430 22 M470 10 L500 20" stroke="#F4F7FF" stroke-width="4" fill="none" stroke-linecap="round"/>
        </svg>
        <div class="lanterns"></div>
      </div>
    </div>
    <div class="tip" role="status"></div>
    <div class="tray">
      <div class="wood" aria-label="${t.cost}"></div>
      <button class="wait-btn" data-act="wait">${A.ICONS.wait}<span><b>${t.wait}</b><small>${t.waitSub}</small></span></button>
    </div>
    <div class="hand"></div>
    <div class="sheet" hidden></div>`;

  const $ = (s) => app.querySelector(s);
  const boardEl = $('.board');
  const cellsEl = $('.cells');
  const layer = $('.layer');
  const fx = $('.fx');
  const sheet = $('.sheet');

  for (let r = 0; r < L.ROWS; r += 1) {
    for (let c = 0; c < L.COLS; c += 1) {
      const b = document.createElement('button');
      b.className = `cell${r < UNIT_ROWS_FROM ? ' storm' : ''}`;
      b.dataset.c = c;
      b.dataset.r = r;
      b.setAttribute('aria-label', `${c + 1}-${r + 1}`);
      cellsEl.append(b);
    }
  }
  const pos = (el, c, r) => {
    el.style.left = `${c * (100 / L.COLS)}%`;
    el.style.top = `${r * (100 / L.ROWS)}%`;
  };

  // ---------- 그리기
  const pieces = new Map();

  function pipsHtml(hp, max, cls) {
    let s = '';
    for (let i = 0; i < max; i += 1) s += `<i class="${i < hp ? 'on' : ''}"></i>`;
    return `<span class="hp ${cls}">${s}</span>`;
  }

  function renderPieces(run, events) {
    const live = new Set();
    for (const e of run.enemies) {
      const key = `e${e.id}`;
      live.add(key);
      let el = pieces.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = `piece foe foe-${e.type} appear`;
        el.innerHTML = A.sprite(e.type, 'art') + pipsHtml(e.hp, L.ENEMIES[e.type].hp, 'foe-hp');
        layer.append(el);
        pieces.set(key, el);
      } else {
        el.classList.remove('appear');
        el.querySelector('.foe-hp').outerHTML = pipsHtml(e.hp, L.ENEMIES[e.type].hp, 'foe-hp');
      }
      pos(el, e.c, e.r);
    }
    for (const u of run.units) {
      const key = `u${u.id}`;
      live.add(key);
      let el = pieces.get(key);
      const max = u.type === 'trap' ? 0 : L.CARDS[u.type].hp;
      if (!el) {
        el = document.createElement('div');
        el.className = `piece unit unit-${u.type} drop`;
        el.innerHTML = A.sprite(u.type, 'art') + (max ? pipsHtml(u.hp, max, 'unit-hp') : '');
        layer.append(el);
        pieces.set(key, el);
      } else {
        el.classList.remove('drop');
        if (max) el.querySelector('.unit-hp').outerHTML = pipsHtml(u.hp, max, 'unit-hp');
      }
      pos(el, u.c, u.r);
    }
    const melted = new Set((events || []).filter((v) => v.type === 'melt').map((v) => `e${v.id}`));
    const breached = new Set((events || []).filter((v) => v.type === 'breach').map((v) => `e${v.id}`));
    for (const [key, el] of pieces) {
      if (live.has(key)) continue;
      pieces.delete(key);
      if (SHOT) { el.remove(); continue; }
      if (melted.has(key)) el.classList.add('melting');
      else if (breached.has(key)) { el.classList.add('breaching'); el.style.top = '100%'; } else if (key[0] === 'u') el.classList.add('crushed');
      else { el.remove(); continue; }
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 900);
    }
  }

  function addFx(cls, c, r, html, style) {
    if (SHOT) return;
    const el = document.createElement('div');
    el.className = `fx-item ${cls}`;
    pos(el, c, r);
    if (style) Object.assign(el.style, style);
    el.innerHTML = html || '';
    fx.append(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 1500);
  }

  function playEvents(events) {
    let hits = 0;
    let melts = 0;
    for (const v of events) {
      if (v.type === 'throw') {
        addFx('ball', v.c, v.r, '', { '--dy': `${(v.tr - v.r) * 100}%` });
      } else if (v.type === 'hit') {
        addFx('dmg', v.c, v.r, `-${v.dmg}`);
        if (v.source === 'brazier') addFx('ember', v.c, v.r);
        sfx.hit(hits); hits += 1;
      } else if (v.type === 'melt') {
        addFx('puff', v.c, v.r, '<i></i><i></i><i></i><i></i><i></i><i></i>');
        sfx.melt(melts); melts += 1;
      } else if (v.type === 'place') {
        addFx('ring', v.c, v.r);
        sfx.place();
      } else if (v.type === 'breach') {
        boardEl.classList.remove('hurt');
        void boardEl.offsetWidth;
        boardEl.classList.add('hurt');
        sfx.breach();
      } else if (v.type === 'bite') {
        addFx('bite', v.c, v.r, '');
      } else if (v.type === 'clear') {
        sfx.clear();
      }
    }
  }

  function renderTop(run) {
    $('.mode').textContent = run.mode === 'daily' ? t.daily : t.practice;
    $('.wave-label').textContent = t.wave(run.wave);
    $('.pips').innerHTML = Array.from({ length: L.WAVES }, (_, i) => `<i class="${i + 1 < run.wave ? 'done' : i + 1 === run.wave ? 'now' : ''}"></i>`).join('');
    $('.score').textContent = run.score;
    $('.lanterns').innerHTML = Array.from({ length: L.START_HEARTS }, (_, i) => `<span class="lantern ${i < run.hearts ? 'lit' : 'out'}">${A.ICONS.lantern}</span>`).join('');
    const tele = upcomingSlots(run);
    $('.telegraph').innerHTML = tele.map((type) => `<span class="tg ${type ? 'has' : ''}">${type ? A.sprite(type, 'tg-art') : ''}</span>`).join('');
    $('.wood').innerHTML = Array.from({ length: L.WOOD_MAX }, (_, i) => `<span class="log ${i < run.wood ? 'on' : ''}">${A.ICONS.log}</span>`).join('');
  }

  function upcomingSlots(run) {
    const slots = Array(L.COLS).fill(null);
    if (run.phase !== 'battle') return slots;
    for (const s of L.upcoming(run)) slots[s.col] = slots[s.col] || s.type;
    return slots;
  }

  function cardHtml(id, extra) {
    const [name, desc] = CARD_TEXT[id];
    return `<span class="cost">${L.CARDS[id].cost}</span>${A.sprite(id, 'card-art')}<b class="cname">${name}</b>${extra ? `<small class="cdesc">${desc}</small>` : ''}`;
  }

  function renderHand(run) {
    const hand = $('.hand');
    hand.innerHTML = '';
    run.hand.forEach((id, i) => {
      const b = document.createElement('button');
      const poor = L.CARDS[id].cost > run.wood;
      b.className = `card kind-${L.CARDS[id].kind}${ui.sel === i ? ' sel' : ''}${poor ? ' poor' : ''}`;
      b.dataset.hand = i;
      b.innerHTML = cardHtml(id, true);
      hand.append(b);
    });
    for (let i = run.hand.length; i < L.HAND; i += 1) {
      const s = document.createElement('div');
      s.className = 'card empty';
      hand.append(s);
    }
  }

  function renderCells(run) {
    const targets = ui.sel >= 0 ? L.validTargets(run, ui.sel) : [];
    const spell = ui.sel >= 0 && L.CARDS[run.hand[ui.sel]] && L.CARDS[run.hand[ui.sel]].kind === 'spell';
    for (const b of cellsEl.children) {
      const c = Number(b.dataset.c);
      const r = Number(b.dataset.r);
      const ok = targets.some((x) => x.c === c && (x.r === r || x.r === -1));
      b.classList.toggle('ok', ok && !spell);
      b.classList.toggle('ok-lane', ok && spell);
    }
    boardEl.classList.toggle('aiming', ui.sel >= 0);
  }

  function renderTip(run) {
    const tip = $('.tip');
    let text = ui.tip;
    if (!text) {
      if (ui.sel >= 0) text = L.CARDS[run.hand[ui.sel]].kind === 'spell' ? t.tipSpell : t.tipPlace;
      else if (meta.tip && run.wave === 1 && run.turn < 3) text = t.tipStart;
      else text = t.tipPick(run.wood);
    }
    tip.textContent = text;
    tip.classList.toggle('warn', ui.tipWarn);
  }

  function render(events) {
    const run = current();
    renderTop(run);
    renderPieces(run, events);
    renderCells(run);
    renderHand(run);
    renderTip(run);
    $('.wait-btn').disabled = run.phase !== 'battle';
    if (events) playEvents(events);
    renderSheet();
  }

  // ---------- 겹쳐 뜨는 화면
  function renderSheet() {
    const run = current();
    let kind = ui.overlay;
    if (!kind && run.phase === 'draft') kind = 'draft';
    if (!kind && (run.phase === 'won' || run.phase === 'lost')) kind = 'result';
    if (!kind) { sheet.hidden = true; sheet.innerHTML = ''; return; }
    sheet.hidden = false;
    sheet.className = `sheet sheet-${kind}`;
    sheet.innerHTML = `<div class="panel">${SHEETS[kind](run)}</div>`;
  }

  function weekStrip() {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - 6);
    let s = '';
    for (let i = 0; i < 7; i += 1) {
      const key = d.toLocaleDateString('sv-SE');
      const rec = meta.days[key];
      s += `<span class="day ${rec ? (rec.won ? 'won' : 'tried') : ''}${i === 6 ? ' today' : ''}"><small>${d.getDate()}</small>${rec ? `<b>${rec.score}</b>` : '<b>·</b>'}</span>`;
      d.setDate(d.getDate() + 1);
    }
    return `<div class="week">${s}</div>`;
  }

  const SHEETS = {
    draft(run) {
      return `<p class="eyebrow">${A.ICONS.snow}${t.draftTitle(run.wave)}</p>
        <h2>${t.draftSub}</h2>
        <div class="offer">${run.offer.map((id, i) => `<button class="card big kind-${L.CARDS[id].kind}" data-pick="${i}">${cardHtml(id, true)}</button>`).join('')}</div>
        <button class="ghost" data-pick="-1">${t.skip}</button>`;
    },
    result(run) {
      const won = run.phase === 'won';
      if (window.Rank && !/shot=/.test(location.hash)) Rank.submit(run.score);
      const streak = L.streakDays(meta.days, today());
      const day = meta.days[today()];
      const foot = run.mode === 'daily'
        ? `<p class="note">${streak ? t.streak(streak) : ''}${day ? ` · ${t.todayBest(day.score)}` : ''}</p>${weekStrip()}`
        : `<p class="note">${t.bestPractice(meta.best)}</p>`;
      return `<div class="result-art ${won ? 'won' : 'lost'}">${won ? A.sprite('brazier', 'res-art') : A.sprite('boulder', 'res-art')}</div>
        <h2>${won ? t.won : t.lost}</h2>
        <div class="big-score"><small>${t.score}</small><b>${run.score}</b></div>
        <div class="stats"><span><b>${run.melted}</b><small>${t.meltedN}</small></span><span><b>${run.hearts}</b><small>${t.hearts}</small></span><span><b>${run.wave}</b><small>${t.reached}</small></span></div>
        ${foot}
        <div class="row">
          <button class="primary" data-act="again">${run.mode === 'daily' ? t.again : t.newPractice}</button>
          <button class="ghost" data-act="${run.mode === 'daily' ? 'practice' : 'daily'}">${run.mode === 'daily' ? t.toPractice : t.toDaily}</button>
        </div>
        <button class="ghost" data-rank-open>${/^en/i.test(navigator.language || '') ? '🏆 Leaderboard' : '🏆 전국 랭킹'}</button>`;
    },
    menu(run) {
      const d = meta.daily && meta.daily.date === today() && meta.daily.phase !== 'won' && meta.daily.phase !== 'lost';
      const p = meta.practice && (meta.practice.phase === 'battle' || meta.practice.phase === 'draft');
      return `<h2>${t.menu}</h2>
        <div class="menu-list">
          <button data-act="daily" class="${run.mode === 'daily' ? 'here' : ''}"><b>${t.daily}</b><small>${d ? `${t.resume} · ${t.wave(meta.daily.wave)}` : today()}</small></button>
          <button data-act="practice" class="${run.mode === 'practice' ? 'here' : ''}"><b>${t.practice}</b><small>${p ? `${t.resume} · ${t.wave(meta.practice.wave)}` : t.newPractice}</small></button>
          ${p ? `<button data-act="newpractice"><b>${t.newPractice}</b><small>${t.bestPractice(meta.best)}</small></button>` : ''}
          <button data-act="codex"><b>${t.codex}</b><small>${t.enemies} ${meta.seen.length}/${L.ENEMY_IDS.length} · ${t.cards} ${meta.cards.length}/${L.CARD_IDS.length}</small></button>
          <button data-act="records"><b>${t.records}</b><small>${t.streak(L.streakDays(meta.days, today()))}</small></button>
          <button data-rank-open><b>${/^en/i.test(navigator.language || '') ? '🏆 Leaderboard' : '🏆 전국 랭킹'}</b><small>&nbsp;</small></button>
          <button data-act="how"><b>${t.how}</b><small>&nbsp;</small></button>
          <button data-act="sound"><b>${meta.sound ? t.soundOn : t.soundOff}</b><small>&nbsp;</small></button>
        </div>
        <button class="ghost" data-act="close">${t.close}</button>`;
    },
    codex() {
      const foes = L.ENEMY_IDS.map((id) => {
        const seen = meta.seen.includes(id);
        return `<div class="entry ${seen ? '' : 'unseen'}">${A.sprite(id, 'entry-art')}<b>${seen ? ENEMY_TEXT[id][0] : '?'}</b><small>${seen ? ENEMY_TEXT[id][1] : t.unseen}</small></div>`;
      }).join('');
      const cards = L.CARD_IDS.map((id) => {
        const got = meta.cards.includes(id);
        return `<div class="entry ${got ? '' : 'unseen'}">${A.sprite(id, 'entry-art')}<b>${CARD_TEXT[id][0]} <em>${L.CARDS[id].cost}</em></b><small>${got ? CARD_TEXT[id][1] : t.fromDraft}</small></div>`;
      }).join('');
      return `<h2>${t.codex}</h2><h3>${t.enemies} ${meta.seen.length}/${L.ENEMY_IDS.length}</h3><div class="entries">${foes}</div>
        <h3>${t.cards} ${meta.cards.length}/${L.CARD_IDS.length}</h3><div class="entries">${cards}</div>
        <button class="ghost" data-act="close">${t.close}</button>`;
    },
    records() {
      const d = new Date(`${today()}T12:00:00`);
      d.setDate(d.getDate() - 27);
      let cal = '';
      for (let i = 0; i < 28; i += 1) {
        const key = d.toLocaleDateString('sv-SE');
        const rec = meta.days[key];
        cal += `<span class="day ${rec ? (rec.won ? 'won' : 'tried') : ''}${i === 27 ? ' today' : ''}"><small>${d.getDate()}</small><b>${rec ? rec.score : ''}</b></span>`;
        d.setDate(d.getDate() + 1);
      }
      return `<h2>${t.recTitle}</h2>
        <div class="stats"><span><b>${L.streakDays(meta.days, today())}</b><small>${KO ? '연속 일수' : 'Day streak'}</small></span><span><b>${meta.wins}</b><small>${t.wins}</small></span><span><b>${meta.melted}</b><small>${t.totalMelt}</small></span></div>
        <h3>${t.last28}</h3><div class="cal">${cal}</div>
        <p class="note">${t.bestPractice(meta.best)} · ${t.runs} ${meta.runs}</p>
        <button class="ghost" data-act="close">${t.close}</button>`;
    },
    how() {
      return `<h2>${t.how}</h2><ol class="how">${t.howLines.map((x) => `<li>${x}</li>`).join('')}</ol>
        <div class="how-art">${['blob', 'thrower', 'wall', 'brazier'].map((id) => A.sprite(id, 'how-sp')).join('')}</div>
        <button class="primary" data-act="close">${t.close}</button>`;
    },
  };

  // ---------- 진행
  function noteRun(run) {
    for (const id of run.seen) if (!meta.seen.includes(id)) meta.seen.push(id);
    for (const id of run.deck) if (!meta.cards.includes(id)) meta.cards.push(id);
  }

  function finishIfOver(run) {
    if ((run.phase === 'won' || run.phase === 'lost') && !run.recorded) {
      run.recorded = true;
      meta = L.record(meta, run, run.date || today());
      meta[meta.active] = run;
      (run.phase === 'won' ? sfx.win : sfx.lose)();
    }
  }

  function commit(next) {
    if (!next) return;
    meta[meta.active] = next;
    noteRun(next);
    if (next.turn >= 3 || next.wave > 1) meta.tip = false;
    finishIfOver(next);
    ui.sel = -1;
    ui.tip = '';
    ui.tipWarn = false;
    save();
    render(next.events);
  }

  function say(text, warn) {
    ui.tip = text;
    ui.tipWarn = !!warn;
    renderTip(current());
  }

  function tapCell(c, r) {
    const run = current();
    if (run.phase !== 'battle') return;
    if (ui.sel >= 0) {
      const id = run.hand[ui.sel];
      const next = L.play(run, ui.sel, c, L.CARDS[id].kind === 'spell' ? -1 : r);
      if (next) { commit(next); return; }
      sfx.no();
      say(L.CARDS[id].kind === 'unit' && r < UNIT_ROWS_FROM ? t.tipStorm : t.tipNo, true);
      return;
    }
    const foe = run.enemies.find((e) => e.c === c && e.r === r);
    const unit = run.units.find((u) => u.c === c && u.r === r);
    if (foe) say(`${ENEMY_TEXT[foe.type][0]} · ${t.hp(foe.hp)} · ${ENEMY_TEXT[foe.type][1].split(' · ').slice(1).join(' · ')}`);
    else if (unit) say(`${CARD_TEXT[unit.type][0]}${unit.type === 'trap' ? '' : ` · ${t.hp(unit.hp)}`} · ${CARD_TEXT[unit.type][1]}`);
    else if (r < UNIT_ROWS_FROM) say(t.tipStorm);
  }

  function tapCard(i) {
    const run = current();
    const id = run.hand[i];
    if (!id || run.phase !== 'battle') return;
    if (L.CARDS[id].cost > run.wood) {
      sfx.no();
      say(t.tipCost(L.CARDS[id].cost), true);
      return;
    }
    ui.sel = ui.sel === i ? -1 : i;
    ui.tip = '';
    ui.tipWarn = false;
    if (ui.sel >= 0 && !L.validTargets(run, i).length) {
      ui.sel = -1;
      sfx.no();
      say(t.tipNo, true);
      renderHand(run);
      renderCells(run);
      return;
    }
    sfx.select();
    renderHand(run);
    renderCells(run);
    renderTip(run);
  }

  function action(act) {
    switch (act) {
      case 'menu': ui.overlay = 'menu'; ui.sel = -1; break;
      case 'close': ui.overlay = null; break;
      case 'codex': case 'records': case 'how': ui.overlay = act; break;
      case 'sound': meta.sound = !meta.sound; save(); break;
      case 'wait': {
        const run = current();
        if (run.phase !== 'battle') return;
        sfx.wait();
        commit(L.pass(run));
        return;
      }
      case 'daily':
        meta.active = 'daily';
        startDaily(false);
        ui.overlay = null;
        break;
      case 'practice':
        meta.active = 'practice';
        if (meta.practice && (meta.practice.phase === 'won' || meta.practice.phase === 'lost')) startPractice(true);
        startPractice(false);
        ui.overlay = null;
        break;
      case 'newpractice':
        meta.active = 'practice';
        startPractice(true);
        ui.overlay = null;
        if (window.onestoreAd) window.onestoreAd.atBreak();
        break;
      case 'again':
        if (current().mode === 'daily') { meta.daily = null; startDaily(true); } else startPractice(true);
        ui.overlay = null;
        if (window.onestoreAd) window.onestoreAd.atBreak();
        break;
      default: return;
    }
    ui.sel = -1;
    ui.tip = '';
    ui.tipWarn = false;
    save();
    clearPieces();
    render();
  }

  function clearPieces() {
    for (const el of pieces.values()) el.remove();
    pieces.clear();
    fx.innerHTML = '';
  }

  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('button');
    if (!el || el.disabled) return;
    if (el.dataset.act) { action(el.dataset.act); return; }
    if (el.dataset.pick !== undefined) {
      const run = current();
      const next = L.pick(run, Number(el.dataset.pick));
      if (!next) return;
      sfx.place();
      ui.overlay = null;
      clearPieces();
      commit(next);
      return;
    }
    if (el.dataset.hand !== undefined) { tapCard(Number(el.dataset.hand)); return; }
    if (el.classList.contains('cell')) tapCell(Number(el.dataset.c), Number(el.dataset.r));
  });
  sheet.addEventListener('click', (ev) => {
    if (ev.target === sheet && (ui.overlay === 'codex' || ui.overlay === 'records' || ui.overlay === 'how' || ui.overlay === 'menu')) action('close');
  });

  window.appFlush = save;
  window.appBack = () => {
    if (ui.overlay) { action('close'); return true; }
    if (ui.sel >= 0) {
      ui.sel = -1;
      ui.tip = '';
      const run = current();
      renderHand(run);
      renderCells(run);
      renderTip(run);
      return true;
    }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // ---------- 스토어 스크린샷 화면
  function playUntil(seed, stop) {
    let run = L.newRun(seed, 'daily');
    let guard = 0;
    while (!stop(run) && guard < 3000 && (run.phase === 'battle' || run.phase === 'draft')) {
      guard += 1;
      if (run.phase === 'draft') {
        run = L.pick(run, 0);
        continue;
      }
      const m = L.bestMove(run);
      run = m ? L.play(run, m.i, m.c, m.r) : L.pass(run);
    }
    return run;
  }

  function setupShot(n) {
    const date = today();
    const seed = L.dailySeed(date);
    meta.active = 'daily';
    meta.tip = false;
    if (n === 1) {
      const run = playUntil(seed, (r) => r.wave >= 3 && r.phase === 'battle' && r.enemies.length >= 3 && r.enemies.some((e) => e.r >= 2) && r.units.length >= 2 && r.hand.some((id) => L.CARDS[id].kind === 'unit' && L.CARDS[id].cost <= r.wood));
      run.date = date;
      meta.daily = run;
      ui.sel = run.hand.findIndex((id) => L.CARDS[id].kind === 'unit' && L.CARDS[id].cost <= run.wood);
    } else if (n === 2) {
      const run = playUntil(seed, (r) => r.phase === 'draft' && r.wave === 2);
      run.date = date;
      meta.daily = run;
    } else if (n === 3) {
      const run = playUntil(seed, () => false);
      run.date = date;
      meta.daily = run;
      const d = new Date(`${date}T12:00:00`);
      const pattern = [1, 1, 0, 1, 1, 1];
      for (let i = 6; i >= 1; i -= 1) {
        d.setDate(d.getDate() - 1);
        if (pattern[i - 1]) meta.days[d.toLocaleDateString('sv-SE')] = { score: i === 3 ? 1210 : 1640 + ((i * 97) % 300), won: i !== 3, wave: i === 3 ? 6 : 8 };
      }
      meta = L.record(meta, run, date);
      run.recorded = true;
    } else {
      const run = playUntil(seed, (r) => r.wave === 5);
      run.date = date;
      meta.daily = run;
      meta.seen = L.ENEMY_IDS.filter((id) => id !== 'mini').concat(run.seen.includes('mini') ? ['mini'] : []);
      meta.cards = ['thrower', 'wall', 'brazier', 'shovel', 'trap', 'gust'];
      ui.overlay = 'codex';
    }
  }

  // ---------- 시작
  if (SHOT) setupShot(SHOT);
  else if (meta.active === 'practice' && meta.practice) startPractice(false);
  else { meta.active = 'daily'; startDaily(false); }
  noteRun(current());
  save();
  render();
})();
