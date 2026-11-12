// 미니게임(받기, 화석 캐기, 달리기, 짝 맞추기, 퀴즈)과 2인 공룡 대결.
// 섬 화면(game.js)이 init으로 넘겨 준 저장본과 화면 도구를 쓴다.
window.DinoPlay = (() => {
  const { SPECIES, FOSSILS, QUIZ } = window.DinoData;
  const S = window.DinoState;
  const A = window.DinoArt;
  const Adv = window.DinoAdventure;
  const snd = window.DinoSound;

  function init(c) {
    const { save, ui, $, $$, esc, josa, rand, pick, speciesOf, dino, mission, refresh, writeSave, openSheet, closeSheet, closeBtn, celebrate } = c;

    /* ---------- 미니게임 ---------- */

    function openPlayMenu() {
      const sheet = openSheet(`<div class="sheet-in">
        <div class="sheet-head"><h2>무엇을 하고 놀까요?</h2>${closeBtn}</div>
        <div class="grid">
          <button class="card" id="play-catch"><div class="art">${A.food(speciesOf(dino()).diet[0])}</div>먹이 받기<small>떨어지는 먹이를 받아요</small></button>
          <button class="card" id="play-dig"><div class="art">${A.fossil('ammonite')}</div>화석 캐기<small>흙을 문질러 화석을 찾아요</small></button>
          <button class="card" id="play-run"><div class="art">${A.rock}</div>쿵쿵 달리기<small>바위를 폴짝 뛰어넘어요</small></button>
          <button class="card" id="play-pairs"><div class="art">${A.egg(dino().species)}</div>짝 맞추기<small>같은 공룡을 찾아요</small></button>
          <button class="card" id="play-quiz"><div class="art">${A.dino({ species: 'raptor', stage: 'adult', color: 'sun' }, { mini: true })}</div>공룡 퀴즈<small>맞아요, 아니에요?</small></button>
          <button class="card" id="play-duel"><div class="art">${A.dino({ species: 'trex', stage: 'adult', color: 'coral' }, { mini: true })}</div>공룡 대결<small>버튼 연타 힘겨루기</small></button>
          <button class="card" id="play-pvp"><div class="art">${A.dino({ species: 'tricera', stage: 'adult', color: 'sun' }, { mini: true })}</div>팀 대전<small>친구와 기술 대결</small></button>
        </div></div>`);
      $('#play-pvp', sheet).addEventListener('click', Adv.openPvp);
      $('#play-duel', sheet).addEventListener('click', openDuelSetup);
      $('#play-catch', sheet).addEventListener('click', startCatch);
      $('#play-dig', sheet).addEventListener('click', startDig);
      $('#play-run', sheet).addEventListener('click', startRun);
      $('#play-pairs', sheet).addEventListener('click', startPairs);
      $('#play-quiz', sheet).addEventListener('click', startQuiz);
    }

    function finishGame({ title, body, stars, fun, kind }) {
      const result = S.finishPlay(save, { stars, fun });
      mission('play');
      if (kind) mission(kind);
      snd.play.happy();
      closeSheet();
      openSheet(`<div class="sheet-in hatch">
        <h2 style="font:30px var(--display)">${title}</h2>
        ${body}
        <p class="lede">별 ${stars}개를 받았어요!</p>
        <button class="big" data-close>좋아요</button></div>`);
      snd.play.star();
      refresh();
      writeSave();
      if (result.stageUp) ui.afterClose = () => celebrate(result.stageUp);
    }

    function startCatch() {
      const d = dino();
      const diet = speciesOf(d).diet;
      const sheet = openSheet(`<div class="game">
        <div class="game-hud"><span id="score">0</span><div class="meter"><span id="time-fill"></span></div>${closeBtn}</div>
        <div id="field"><div id="catcher">${A.dino({ ...d }, { mini: true })}</div></div></div>`);
      const field = $('#field', sheet);
      const catcher = $('#catcher', sheet);
      const DURATION = 20;
      const items = [];
      let x = .5, elapsed = 0, spawnIn = .3, score = 0, last = performance.now(), raf = 0, over = false;

      const aim = (e) => {
        const r = field.getBoundingClientRect();
        x = Math.min(.92, Math.max(.08, (e.clientX - r.left) / r.width));
      };
      field.addEventListener('pointerdown', aim);
      field.addEventListener('pointermove', aim);

      function frame(now) {
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        elapsed += dt;
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawnIn = Math.max(.55, .95 - elapsed * .02);
          const isStar = Math.random() < .25;
          const el = document.createElement('div');
          el.className = 'item';
          el.innerHTML = isStar ? A.star : A.food(pick(diet));
          field.append(el);
          items.push({ el, x: rand(.1, .9), y: -.08, v: rand(.26, .36) + elapsed * .006 });
        }
        const w = field.clientWidth;
        const h = field.clientHeight;
        const reach = Math.max(.16, 90 / w);
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.v * dt;
          it.el.style.transform = `translate(${it.x * w}px, ${it.y * h}px)`;
          const caught = it.y > .66 && it.y < .9 && Math.abs(it.x - x) < reach;
          if (caught || it.y > 1.05) {
            it.el.remove();
            items.splice(i, 1);
            if (caught) {
              score += 1;
              snd.play.pop();
              $('#score', sheet).textContent = score;
            }
          }
        }
        catcher.style.transform = `translateX(${x * w}px)`;
        $('#time-fill', sheet).style.width = `${(1 - elapsed / DURATION) * 100}%`;
        if (elapsed >= DURATION) {
          over = true;
          const stars = Math.max(1, Math.min(10, Math.ceil(score / 2)));
          finishGame({
            title: `${score}개나 받았어요!`,
            body: `<div class="hero">${A.dino(d, { mini: true })}</div>`,
            stars, fun: 40,
          });
          return;
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      ui.cleanup = () => { if (!over) cancelAnimationFrame(raf); };
    }

    function startDig() {
      const missing = FOSSILS.filter((f) => !save.fossils.includes(f.id));
      const isNew = missing.length > 0;
      const fossil = pick(isNew ? missing : FOSSILS);
      const sheet = openSheet(`<div class="game">
        <div class="game-hud"><span style="flex:1">화석 캐기</span>${closeBtn}</div>
        <div id="dig-wrap">${A.fossil(fossil.id)}<canvas id="dirt" width="400" height="400"></canvas></div>
        <p class="game-tip">손가락으로 흙을 쓱쓱 문질러 보세요!</p></div>`);
      const canvas = $('#dirt', sheet);
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.fillStyle = '#A9774A';
      c.fillRect(0, 0, 400, 400);
      for (let i = 0; i < 700; i++) {
        c.fillStyle = pick(['#976739', '#B98A5B', '#8A5C33', '#C39A6B']);
        c.beginPath();
        c.arc(rand(0, 400), rand(0, 400), rand(2, 9), 0, 7);
        c.fill();
      }
      c.globalCompositeOperation = 'destination-out';
      c.lineWidth = 62;
      c.lineCap = 'round';

      let last = null, strokes = 0, done = false;
      const point = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((e.clientX - r.left) / r.width) * 400, y: ((e.clientY - r.top) / r.height) * 400 };
      };
      const cleared = () => {
        const px = c.getImageData(0, 0, 400, 400).data;
        let empty = 0;
        for (let i = 3; i < px.length; i += 40) if (px[i] === 0) empty += 1;
        return empty / (px.length / 40);
      };
      const scratch = (from, to) => {
        c.beginPath();
        c.moveTo(from.x, from.y);
        c.lineTo(to.x + .01, to.y);
        c.stroke();
        strokes += 1;
        if (strokes % 4 === 0) snd.play.scrape();
        if (strokes % 8 === 0) checkDone();
      };
      const checkDone = () => {
        if (done || cleared() <= .62) return;
        done = true;
        canvas.style.opacity = '0';
        snd.play.hatch();
        setTimeout(() => {
          if (isNew) save.fossils.push(fossil.id);
          finishGame({
            title: isNew ? `${josa(fossil.name, '을', '를')} 찾았어요!` : `${fossil.name} 또 찾았다!`,
            body: `<div class="hero" style="max-width:220px">${A.fossil(fossil.id)}</div><p class="lede">${fossil.fact}</p>`,
            stars: isNew ? 5 : 3, fun: 30, kind: 'dig',
          });
        }, 800);
      };
      canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        last = point(e);
        scratch(last, last);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!last) return;
        const p = point(e);
        scratch(last, p);
        last = p;
      });
      const lift = () => { last = null; checkDone(); };
      canvas.addEventListener('pointerup', lift);
      canvas.addEventListener('pointercancel', lift);
    }

    // 게임오버가 없다. 바위에 부딪혀도 잠깐 비틀거릴 뿐 끝까지 달린다.
    function startRun() {
      const d = dino();
      const sheet = openSheet(`<div class="game">
        <div class="game-hud"><span id="score">0</span><div class="meter"><span id="time-fill"></span></div>${closeBtn}</div>
        <div id="field"><div id="runner">${A.dino(d, { mini: true })}</div></div>
        <p class="game-tip">화면을 누르면 폴짝 뛰어요!</p></div>`);
      const field = $('#field', sheet);
      const runner = $('#runner', sheet);
      const DURATION = 25;
      const items = [];
      let height = 0, velocity = 0, elapsed = 0, spawnIn = 1.2, score = 0, hurt = 0;
      let last = performance.now(), raf = 0, over = false;

      const jump = () => {
        if (height > 0) return;
        velocity = field.clientHeight * 1.15;
        snd.play.pop();
      };
      sheet.querySelector('.game').addEventListener('pointerdown', (e) => {
        if (!e.target.closest('[data-close]')) jump();
      });

      function frame(now) {
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        elapsed += dt;
        spawnIn -= dt;
        const w = field.clientWidth;
        const h = field.clientHeight;
        if (spawnIn <= 0) {
          spawnIn = rand(1.5, 2.3);
          const isStar = Math.random() < .5;
          const el = document.createElement('div');
          el.className = isStar ? 'item' : 'item ground-item';
          el.innerHTML = isStar ? A.star : A.rock;
          field.append(el);
          items.push({ el, isStar, x: w + 50, y: h * .87 - rand(.12, .2) * h });
        }
        velocity -= h * 3 * dt;
        height = Math.max(0, height + velocity * dt);
        if (height === 0) velocity = 0;
        hurt = Math.max(0, hurt - dt);
        runner.style.transform = `translate(-50%, ${-height}px)`;
        runner.classList.toggle('hurt', hurt > 0);

        const speed = Math.min(w * .5, 300) * (hurt > 0 ? .6 : 1);
        const rx = w * .22;
        const footY = h * .87 - height;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.x -= speed * dt;
          it.el.style.transform = it.isStar ? `translate(${it.x}px, ${it.y}px)` : `translateX(${it.x}px)`;
          const near = Math.abs(it.x - rx) < 44;
          if (it.isStar && near && Math.abs(footY - 60 - it.y) < 80) {
            it.el.remove();
            items.splice(i, 1);
            score += 1;
            snd.play.star();
            $('#score', sheet).textContent = score;
          } else if (!it.isStar && !it.hit && near && height < 44) {
            it.hit = true;
            hurt = .8;
            snd.play.no();
          } else if (it.x < -60) {
            it.el.remove();
            items.splice(i, 1);
          }
        }
        $('#time-fill', sheet).style.width = `${(1 - elapsed / DURATION) * 100}%`;
        if (elapsed >= DURATION) {
          over = true;
          finishGame({
            title: '끝까지 달렸어요!',
            body: `<div class="hero">${A.dino(d, { mini: true })}</div>`,
            stars: Math.max(2, Math.min(10, score + 1)), fun: 40,
          });
          return;
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      ui.cleanup = () => { if (!over) cancelAnimationFrame(raf); };
    }

    function startPairs() {
      const pairs = dino().stage === 'baby' ? 4 : 6;
      const chosen = [...SPECIES].sort(() => Math.random() - .5).slice(0, pairs);
      const deck = [...chosen, ...chosen].map((sp) => ({ sp, key: Math.random() })).sort((a, b) => a.key - b.key).map((c) => c.sp);
      const sheet = openSheet(`<div class="game">
        <div class="game-hud"><span style="flex:1">짝 맞추기</span>${closeBtn}</div>
        <div id="pairs" style="--cols:${pairs === 4 ? 4 : 3}"></div></div>`);
      const grid = $('#pairs', sheet);
      grid.innerHTML = deck.map((sp, i) => `<button class="pair" data-i="${i}" aria-label="카드 ${i + 1}">${A.egg(sp.id)}</button>`).join('');
      let open = [];
      let got = 0;
      let busy = false;
      const face = (i) => A.dino({ species: deck[i].id, stage: 'adult', color: deck[i].color }, { mini: true });
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.pair');
        if (!card || busy || card.classList.contains('open')) return;
        const i = Number(card.dataset.i);
        card.classList.add('open');
        card.innerHTML = face(i);
        snd.play.pop();
        open.push(card);
        if (open.length < 2) return;
        const [a, b] = open;
        open = [];
        if (deck[a.dataset.i] === deck[b.dataset.i]) {
          a.classList.add('got');
          b.classList.add('got');
          got += 1;
          snd.play.star();
          snd.say(deck[a.dataset.i].name, true);
          if (got === pairs) {
            setTimeout(() => finishGame({
              title: '짝을 다 찾았어요!',
              body: `<div class="hero">${A.dino(dino(), { mini: true })}</div>`,
              stars: pairs === 4 ? 5 : 8, fun: 35,
            }), 700);
          }
          return;
        }
        busy = true;
        setTimeout(() => {
          for (const c of [a, b]) {
            c.classList.remove('open');
            c.innerHTML = A.egg(deck[c.dataset.i].id);
          }
          busy = false;
        }, 900);
      });
    }

    function startQuiz() {
      const ROUND = 5;
      const list = [...QUIZ].sort(() => Math.random() - .5).slice(0, ROUND);
      let index = 0;
      let right = 0;

      function show() {
        const item = list[index];
        const sp = SPECIES.find((s) => s.id === item.sp);
        const sheet = openSheet(`<div class="sheet-in">
          <div class="sheet-head"><h2>공룡 퀴즈 ${index + 1}/${ROUND}</h2>${closeBtn}</div>
          <div class="quiz-art">${A.dino({ species: sp.id, stage: 'adult', color: sp.color }, { mini: true })}</div>
          <p class="quiz-q">${item.q}</p>
          <div class="quiz-btns" id="quiz-btns">
            <button class="big" data-a="1">맞아요</button><button class="big" data-a="0">아니에요</button>
          </div>
          <p class="quiz-why" id="quiz-why" hidden></p>
          <button class="big ghost" id="quiz-next" hidden>다음</button></div>`);
        snd.say(item.q, true);
        $('#quiz-btns', sheet).addEventListener('click', (e) => {
          const btn = e.target.closest('[data-a]');
          if (!btn) return;
          const ok = (btn.dataset.a === '1') === item.a;
          if (ok) right += 1;
          ok ? snd.play.happy() : snd.play.no();
          const why = $('#quiz-why', sheet);
          why.textContent = `${ok ? '딩동댕! ' : '아쉬워요. '}${item.why}`;
          why.hidden = false;
          $('#quiz-btns', sheet).hidden = true;
          $('#quiz-next', sheet).hidden = false;
          snd.say(why.textContent, true, undefined, item.why);
        });
        $('#quiz-next', sheet).addEventListener('click', () => {
          snd.play.tap();
          index += 1;
          if (index < ROUND) return show();
          finishGame({
            title: `${ROUND}문제 중 ${right}개 맞혔어요!`,
            body: `<div class="hero">${A.dino(dino(), { mini: true })}</div>`,
            stars: Math.max(2, right * 2), fun: 30, kind: 'quiz',
          });
        });
      }
      show();
    }

    /* ---------- 공룡 대결 ---------- */

    function openDuelSetup() {
      const sheet = openSheet(`<div class="sheet-in">
        <div class="sheet-head"><h2>누구와 대결할까요?</h2>${closeBtn}</div>
        <p class="lede">친구와 하려면 기기를 가운데 놓고 마주 앉아요. 각자 내 쪽 버튼을 빠르게 눌러요.</p>
        <div class="tabs">
          <button class="tab on" data-foe="friend">친구와</button>
          <button class="tab" data-foe="cpu">컴퓨터와</button>
        </div>
        <p class="lede">상대 공룡을 골라 주세요.</p>
        <div class="grid">${SPECIES.filter((sp) => S.isUnlocked(save, sp)).map((sp) => `
          <button class="card" data-rival="${sp.id}"><div class="art">${A.dino({ species: sp.id, stage: 'adult', color: sp.color }, { mini: true })}</div>${sp.name}</button>`).join('')}
        </div></div>`);
      let cpu = false;
      $$('[data-foe]', sheet).forEach((b) => b.addEventListener('click', () => {
        snd.play.tap();
        cpu = b.dataset.foe === 'cpu';
        $$('[data-foe]', sheet).forEach((x) => x.classList.toggle('on', x === b));
      }));
      $$('[data-rival]', sheet).forEach((b) => b.addEventListener('click', () => startDuel(b.dataset.rival, cpu)));
    }

    function startDuel(rivalId, cpu) {
      const mine = dino();
      const rival = SPECIES.find((s) => s.id === rivalId);
      const side = (player, art, label) => `<div class="duel-side p${player}" data-side="${player}">
        <div class="duel-label">${esc(label)}</div>
        <div class="meter duel-hp"><span></span></div>
        <div class="duel-art">${art}</div>
        <button class="duel-btn" data-hit="${player}"${cpu && player === 1 ? ' disabled' : ''}>쿵!</button>
      </div>`;
      const sheet = openSheet(`<div class="game duel">
        ${side(1, A.dino({ species: rival.id, stage: 'adult', color: rival.color }, { mini: true }), cpu ? `컴퓨터 ${rival.name}` : rival.name)}
        <div class="duel-mid"><b id="duel-count">3</b>${closeBtn}</div>
        ${side(0, A.dino(mine, { mini: true }), mine.name)}
      </div>`);
      const duel = S.newDuel();
      const panels = [$('[data-side="0"]', sheet), $('[data-side="1"]', sheet)];
      const timers = [];
      let live = false;

      const render = () => {
        panels.forEach((panel, p) => {
          $('.duel-hp span', panel).style.width = `${(duel.hp[p] / S.DUEL_HP) * 100}%`;
          $('.duel-btn', panel).classList.toggle('charged', duel.power[p] >= S.DUEL_POWER);
        });
      };
      const hit = (player) => {
        if (!live) return;
        const { strong } = S.duelHit(duel, player);
        const foe = panels[1 - player];
        foe.classList.remove('bumped');
        void foe.offsetWidth;
        foe.classList.add('bumped');
        strong ? snd.play.roar() : snd.play.tap();
        render();
        if (duel.winner !== null) finish();
      };
      const finish = () => {
        live = false;
        timers.forEach(clearInterval);
        const youWon = duel.winner === 0;
        const winnerName = youWon ? mine.name : rival.name;
        panels[1 - duel.winner].classList.add('tired');
        $('#duel-count', sheet).textContent = `${winnerName} 승리!`;
        snd.say(`${josa(winnerName, '이', '가')} 이겼어요! 둘 다 잘했어요!`, true, undefined, '둘 다 잘했어요!');
        setTimeout(() => {
          if ($('#sheet').hidden) return;
          finishGame({
            title: `${josa(winnerName, '이', '가')} 이겼어요!`,
            body: `<div class="hero">${youWon ? A.dino(mine, { mini: true }) : A.dino({ species: rival.id, stage: 'adult', color: rival.color }, { mini: true })}</div><p class="lede">진 공룡은 지쳐서 잠깐 쉬어요. 다 같이 잘했어요!</p>`,
            stars: youWon ? 4 : 2, fun: 30,
          });
        }, 1500);
      };

      $('.duel', sheet).addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('[data-hit]');
        if (btn && !btn.disabled) hit(Number(btn.dataset.hit));
      });
      render();

      const count = $('#duel-count', sheet);
      ['2', '1', '시작!'].forEach((text, i) => {
        timers.push(setTimeout(() => {
          count.textContent = text;
          snd.play.tap();
          if (text === '시작!') {
            live = true;
            if (cpu) timers.push(setInterval(() => { if (Math.random() < .7) hit(1); }, 230));
          }
        }, (i + 1) * 800));
      });
      ui.cleanup = () => {
        live = false;
        timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      };
    }

    return { openPlayMenu, finishGame };
  }

  return { init };
})();
