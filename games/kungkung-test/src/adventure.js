// 모험 지도, 팀 편성, 턴제 전투 화면. 규칙은 battle.js와 state.js에 있다.
window.DinoAdventure = (() => {
  const { SPECIES, REGIONS, SKILLS, TYPES, STRONG } = window.DinoData;
  const data = window.DinoData;
  const B = window.DinoBattle;
  const S = window.DinoState;
  const A = window.DinoArt;
  const TEAM_SIZE = 3;
  const NODES = [[22, 86], [64, 73], [30, 59], [72, 46], [34, 32], [62, 14]];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const backIcon = (flip) => `<svg viewBox="0 0 32 32" aria-hidden="true"${flip ? ' style="transform:scaleX(-1)"' : ''}><path class="line" d="M20 7L10 16L20 25"/></svg>`;

  let c; // game.js가 넘겨주는 공용 도구

  const scape = (theme) => `<div class="scape theme-${theme}">${document.getElementById('backdrop-tpl').innerHTML}</div>`;
  const levelOf = (d) => S.levelInfo(d.growth).level;
  const typeBadge = (type) => `<span class="type-badge" style="background:${TYPES[type].color}">${TYPES[type].name}</span>`;

  function teamIds() {
    const { save } = c;
    const chosen = save.team.filter((id) => save.dinos.some((d) => d.id === id));
    if (chosen.length) return chosen;
    return [...save.dinos].sort((a, b) => b.growth - a.growth).slice(0, TEAM_SIZE).map((d) => d.id);
  }

  const teamDinos = () => teamIds().map((id) => c.save.dinos.find((d) => d.id === id));

  function toFighter(d) {
    return B.fighter(data, {
      id: d.id, species: d.species, name: d.name, level: levelOf(d), color: d.color, hat: d.hat, stage: d.stage, plus: d.plus || 0,
    });
  }

  function latestRegion() {
    let index = 0;
    while (index < REGIONS.length - 1 && S.regionCleared(c.save, REGIONS[index].id)) index += 1;
    return index;
  }

  /* ---------- 지도 ---------- */

  function openMap(regionIndex = latestRegion()) {
    const { save, closeBtn } = c;
    const region = REGIONS[regionIndex];
    const nextOpen = regionIndex < REGIONS.length - 1 && S.regionCleared(save, region.id);
    const route = NODES.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
    let foundNext = false;
    const nodes = NODES.map(([x, y], i) => {
      const boss = i === S.BOSS_INDEX;
      const best = save.adv.cleared[S.stageKey(region.id, i)] || 0;
      const open = S.stageOpen(save, REGIONS, regionIndex, i);
      const isNext = open && !best && !foundNext;
      if (isNext) foundNext = true;
      const cls = `node${boss ? ' boss' : ''}${best ? ' done' : ''}${open ? '' : ' locked'}${isNext ? ' next' : ''}`;
      const pips = best ? `<span class="pips">${A.star.repeat(best)}</span>` : '';
      const face = boss ? A.dino({ species: region.boss.species, stage: 'adult', color: SPECIES.find((s) => s.id === region.boss.species).color }, { mini: true }) : i + 1;
      return `<button class="${cls}" data-stage="${i}" style="--x:${x}%;--y:${y}%"${open ? '' : ' disabled'} aria-label="${boss ? '보스' : `${i + 1}번 스테이지`}">${face}${pips}</button>`;
    }).join('');
    const team = teamDinos().map((d) => `<div class="mini">${A.dino(d, { mini: true })}</div>`).join('');
    const sheet = c.openSheet(`<div class="game map">
      ${scape(region.theme)}
      <div class="map-top">
        <button class="icon-btn" id="map-prev" aria-label="이전 지역"${regionIndex ? '' : ' disabled'}>${backIcon(false)}</button>
        <div class="map-title">${region.name}<small>${regionIndex + 1}번째 지역 · 권장 레벨 ${region.level + 3}</small></div>
        <button class="icon-btn" id="map-next" aria-label="다음 지역"${nextOpen ? '' : ' disabled'}>${backIcon(true)}</button>
        ${closeBtn}
      </div>
      <div class="map-field">
        <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${route}"/></svg>
        ${nodes}
      </div>
      <div class="map-foot">
        <div class="map-team">${team}</div>
        <button class="big" id="map-team">팀 편성</button>
      </div></div>`);
    c.$('#map-prev', sheet).addEventListener('click', () => openMap(regionIndex - 1));
    c.$('#map-next', sheet).addEventListener('click', () => openMap(regionIndex + 1));
    c.$('#map-team', sheet).addEventListener('click', () => { c.snd.play.tap(); openTeam(() => openMap(regionIndex)); });
    c.$$('[data-stage]', sheet).forEach((b) => b.addEventListener('click', () => {
      c.snd.play.pop();
      openStage(regionIndex, Number(b.dataset.stage));
    }));
  }

  function openStage(regionIndex, index) {
    const { save, closeBtn } = c;
    const region = REGIONS[regionIndex];
    const foes = B.stageTeam(data, region, index, S.BOSS_INDEX);
    const boss = index === S.BOSS_INDEX;
    const first = !save.adv.cleared[S.stageKey(region.id, index)];
    const story = first && index === 0 ? region.intro : first && boss ? `${region.boss.name}가 앞을 막아섰어요!` : '';
    const cards = foes.map((f) => `<div class="card"><div class="art">${A.dino({ species: f.species, stage: 'adult', color: f.color }, { mini: true })}</div>
      ${c.esc(f.name)}<small>Lv.${f.level}</small>${typeBadge(f.type)}</div>`).join('');
    const reward = boss && first ? '보스 첫 승리 보상: 별 30개, 새 섬 테마, 새 공룡 알' : first ? '첫 승리 보상: 별 6개와 경험치' : '다시 깨면 경험치와 별을 조금 받아요';
    const sheet = c.openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>${region.name} ${boss ? '보스' : `${index + 1}`}</h2>${closeBtn}</div>
      ${story ? `<p class="story">${story}</p>` : ''}
      <p class="lede">나타난 공룡</p>
      <div class="grid">${cards}</div>
      <p class="lede">${reward}</p>
      <button class="big" id="fight">출발!</button>
      <button class="big ghost" id="back">지도로</button></div>`);
    if (story) c.snd.say(story, true);
    c.$('#back', sheet).addEventListener('click', () => openMap(regionIndex));
    c.$('#fight', sheet).addEventListener('click', () => {
      const mine = teamDinos();
      startBattle({
        left: mine.map(toFighter), right: foes, theme: region.theme, title: `${region.name} ${boss ? '보스' : index + 1}`,
        onEnd: (battle) => endStage(battle, regionIndex, index, mine),
      });
    });
  }

  /* ---------- 팀 편성 ---------- */

  function openTeam(onDone) {
    const { save, closeBtn } = c;
    const ids = teamIds();
    const slots = Array.from({ length: TEAM_SIZE }, (_, i) => {
      const d = save.dinos.find((x) => x.id === ids[i]);
      return `<div class="team-slot">${d ? `<div>${A.dino(d, { mini: true })}</div>` : '비어 있음'}</div>`;
    }).join('');
    const cards = [...save.dinos].sort((a, b) => b.growth - a.growth).map((d) => {
      const sp = SPECIES.find((s) => s.id === d.species);
      return `<button class="card${ids.includes(d.id) ? ' on' : ''}" data-pick="${d.id}">
        <div class="art">${A.dino(d, { mini: true })}</div>${c.esc(d.name)}<small>Lv.${levelOf(d)}${d.plus ? ` · 강화 +${d.plus}` : ''}</small>${typeBadge(sp.type)}</button>`;
    }).join('');
    const sheet = c.openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>팀 편성</h2>${closeBtn}</div>
      <p class="lede">공룡을 ${TEAM_SIZE}마리까지 데려갈 수 있어요. 불은 풀에, 풀은 물에, 물은 불에 강해요. 맨 앞 공룡이 먼저 나가요.</p>
      <div class="team-pick">${slots}</div>
      <div class="grid">${cards}</div>
      <button class="big" id="team-ok">다 골랐어요</button></div>`);
    c.$$('[data-pick]', sheet).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.pick;
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-TEAM_SIZE);
      if (!next.length) return;
      save.team = next;
      c.snd.play.tap();
      c.writeSave();
      openTeam(onDone);
    }));
    c.$('#team-ok', sheet).addEventListener('click', onDone);
  }

  /* ---------- 전투 화면 ---------- */

  function startBattle({ left, right, theme, title, onEnd, pvp = false }) {
    const battle = B.create(left, right);
    const sheet = c.openSheet(`<div class="game battle-wrap">
      <div class="arena">
        ${scape(theme)}
        <div class="game-hud"><span style="flex:1">${c.esc(title)}</span>${c.closeBtn}</div>
        <div class="bar-card foe" id="bar-1"></div><div class="unit foe" id="unit-1"></div>
        <div class="unit me" id="unit-0"></div><div class="bar-card me" id="bar-0"></div>
      </div>
      <div class="side-panel">
        <div class="battle-log" id="log"></div>
        <div class="moves" id="moves"></div>
      </div></div>`);
    const arena = c.$('.arena', sheet);
    const shownHp = [0, 0];
    let alive = true;
    c.ui.cleanup = () => { alive = false; };

    const log = (text) => { c.$('#log', sheet).textContent = text; };
    const unit = (side) => c.$(`#unit-${side}`, sheet);

    function bar(side) {
      const f = B.current(battle, side);
      const pct = (shownHp[side] / f.maxHp) * 100;
      const team = battle.sides[side].team;
      c.$(`#bar-${side}`, sheet).innerHTML = `
        <div class="bar-name"><span>${c.esc(f.name)}</span><span>Lv.${f.level}</span>${typeBadge(f.type)}</div>
        <div class="hp"><span class="${pct < 30 ? 'low' : ''}" style="width:${pct}%"></span></div>
        <div class="bench">${team.map((m) => `<i class="${m.hp > 0 ? '' : 'out'}"></i>`).join('')}</div>`;
    }

    function setHp(side, hp) {
      shownHp[side] = hp;
      const f = B.current(battle, side);
      const pct = (hp / f.maxHp) * 100;
      const fill = c.$(`#bar-${side} .hp span`, sheet);
      fill.style.width = `${pct}%`;
      fill.classList.toggle('low', pct < 30);
    }

    function mount(side, fighterObj = B.current(battle, side)) {
      unit(side).innerHTML = A.dino({ ...fighterObj, stage: 'adult' }, { mini: true });
      unit(side).classList.remove('out');
    }

    function floatText(side, text, cls) {
      const box = unit(side).getBoundingClientRect();
      const base = arena.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = `num ${cls}`;
      el.textContent = text;
      el.style.left = `${box.left - base.left + box.width * .4}px`;
      el.style.top = `${box.top - base.top + box.height * .2}px`;
      arena.append(el);
      el.addEventListener('animationend', () => el.remove());
    }

    function impact(side, type) {
      const box = unit(side).getBoundingClientRect();
      const base = arena.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'impact';
      el.style.setProperty('--t', TYPES[type].color);
      el.style.left = `${box.left - base.left + box.width / 2}px`;
      el.style.top = `${box.top - base.top + box.height / 2}px`;
      arena.append(el);
      el.addEventListener('animationend', () => el.remove());
    }

    async function play(events) {
      for (const e of events) {
        if (!alive) return;
        if (e.kind === 'use') {
          const lunge = e.side === 0 ? 'lunge-me' : 'lunge-foe';
          log(`${e.name}의 ${SKILLS[e.skill].name}!`);
          const user = battle.sides[e.side].team.find((f) => f.name === e.name);
          c.snd.cry(S.voiceFor(data.VOICES, user.species, user.stage).cry);
          unit(e.side).classList.add(lunge);
          await wait(260);
          unit(e.side).classList.remove(lunge);
          await wait(120);
        } else if (e.kind === 'hit') {
          impact(e.side, e.type);
          unit(e.side).classList.remove('hurt');
          void unit(e.side).offsetWidth;
          unit(e.side).classList.add('hurt');
          floatText(e.side, e.crit ? `${e.dmg}!` : e.dmg, e.mult > 1 || e.crit ? 'big-hit' : '');
          setHp(e.side, e.hp);
          e.mult > 1 ? c.snd.play.roar() : c.snd.play.crack();
          if (e.crit) log('급소에 맞았어요!');
          else if (e.mult > 1) log('효과가 굉장해요!');
          else if (e.mult < 1) log('효과가 별로예요.');
          await wait(620);
        } else if (e.kind === 'heal') {
          floatText(e.side, `+${e.amount}`, 'heal');
          setHp(e.side, e.hp);
          c.snd.play.happy();
          await wait(560);
        } else if (e.kind === 'guard' || e.kind === 'boost') {
          log(e.kind === 'guard' ? '몸을 단단히 지켜요!' : '힘이 불끈 솟아요!');
          c.snd.play.pop();
          await wait(560);
        } else if (e.kind === 'tired') {
          unit(e.side).classList.add('out');
          log(`${c.josa(e.name, '이', '가')} 지쳐서 쉬어요.`);
          await wait(800);
        } else if (e.kind === 'enter') {
          const f = battle.sides[e.side].team[e.index];
          shownHp[e.side] = e.hp;
          mount(e.side, f);
          battle.sides[e.side].shown = e.index;
          log(`${c.josa(e.name, '이', '가')} 나왔어요!`);
          drawBar(e.side, f);
          await wait(520);
        } else if (e.kind === 'stunned') {
          log(`${c.josa(e.name, '은', '는')} 어질어질해서 움직일 수 없어요.`);
          await wait(620);
        } else if (e.kind === 'dizzy') {
          log(`${c.josa(e.name, '이', '가')} 어질어질해요!`);
          await wait(520);
        }
      }
    }

    // 사건을 재생하는 동안에는 전투가 이미 턴 끝 상태라, 그려야 할 공룡을 직접 받는다.
    function drawBar(side, f) {
      const pct = (shownHp[side] / f.maxHp) * 100;
      const team = battle.sides[side].team;
      c.$(`#bar-${side}`, sheet).innerHTML = `
        <div class="bar-name"><span>${c.esc(f.name)}</span><span>Lv.${f.level}</span>${typeBadge(f.type)}</div>
        <div class="hp"><span class="${pct < 30 ? 'low' : ''}" style="width:${pct}%"></span></div>
        <div class="bench">${team.map((m) => `<i class="${m.hp > 0 ? '' : 'out'}"></i>`).join('')}</div>`;
      const fill = c.$(`#bar-${side} .hp span`, sheet);
      fill.style.width = `${pct}%`;
    }

    function moveButtons(side, pick) {
      const me = B.current(battle, side);
      const foe = B.current(battle, 1 - side);
      const box = c.$('#moves', sheet);
      const skillBtns = me.skills.map((id) => {
        const s = SKILLS[id];
        const color = TYPES[s.type].color;
        const left = me.cool[id] || 0;
        const tag = s.power && B.typeMult(data, s.type, foe.type) > 1 ? '<span class="tag">강함</span>' : '';
        const desc = left ? `${left}턴 기다려요` : s.heal ? '체력 회복' : s.guard ? '피해 절반' : s.boost ? '다음 공격 강화' : `위력 ${s.power}`;
        return `<button class="move" data-skill="${id}" style="--t:${color}"${left ? ' disabled' : ''}>${s.name}<small>${TYPES[s.type].name} · ${desc}</small>${tag}</button>`;
      }).join('');
      const bench = battle.sides[side].team.filter((f) => f !== me && f.hp > 0);
      box.innerHTML = skillBtns + (bench.length ? `<button class="move swap" id="swap">교체<small>다른 공룡 내보내기</small></button>` : '');
      c.$$('[data-skill]', box).forEach((b) => b.addEventListener('click', () => pick({ skill: b.dataset.skill })));
      c.$('#swap', box)?.addEventListener('click', () => {
        c.snd.play.tap();
        box.innerHTML = battle.sides[side].team.map((f, i) => ({ f, i })).filter(({ f }) => f !== me && f.hp > 0)
          .map(({ f, i }) => `<button class="move swap" data-to="${i}">${c.esc(f.name)}<small>${TYPES[f.type].name} · 체력 ${f.hp}/${f.maxHp}</small></button>`).join('')
          + '<button class="move swap" id="swap-back">돌아가기</button>';
        c.$$('[data-to]', box).forEach((b) => b.addEventListener('click', () => pick({ swap: Number(b.dataset.to) })));
        c.$('#swap-back', box).addEventListener('click', () => moveButtons(side, pick));
      });
    }

    const askMove = (side) => new Promise((resolve) => moveButtons(side, (action) => {
      c.snd.play.tap();
      c.$('#moves', sheet).innerHTML = '';
      resolve(action);
    }));

    function passTo(name) {
      return new Promise((resolve) => {
        const el = document.createElement('div');
        el.className = 'pass';
        el.innerHTML = `<div class="title">${c.esc(name)} 차례예요</div><p class="lede">상대가 보지 않게 기기를 넘겨 주세요.</p><button class="big">내가 고를게요</button>`;
        c.$('.battle-wrap', sheet).append(el);
        c.$('.big', el).addEventListener('click', () => { el.remove(); resolve(); });
      });
    }

    async function loop() {
      [0, 1].forEach((side) => { shownHp[side] = B.current(battle, side).hp; mount(side); bar(side); });
      log(pvp ? '대결 시작!' : `${c.josa(B.current(battle, 1).name, '이', '가')} 나타났어요!`);
      await wait(600);
      while (alive && battle.winner === null) {
        if (!pvp) log('어떤 기술을 쓸까요?');
        if (pvp) { await passTo('1P'); log('1P, 기술을 고르세요.'); }
        const mine = await askMove(0);
        let theirs;
        if (pvp) {
          await passTo('2P');
          log('2P, 기술을 고르세요.');
          theirs = await askMove(1);
        } else {
          theirs = B.choose(data, battle, 1);
        }
        if (!alive) return;
        await play(B.turn(data, battle, [mine, theirs]));
        await wait(200);
      }
      if (alive) {
        await wait(500);
        if (alive) onEnd(battle);
      }
    }
    loop();
  }

  function endStage(battle, regionIndex, index, mine) {
    const { save, snd } = c;
    const region = REGIONS[regionIndex];
    c.ui.cleanup = null;
    if (window.onestoreAd) window.onestoreAd.atBreak();
    if (battle.winner !== 0) {
      const foeType = B.current(battle, 1).type;
      const strong = Object.keys(STRONG).filter((t) => STRONG[t].includes(foeType)).map((t) => TYPES[t].name).join(', ');
      snd.play.no();
      const sheet = c.openSheet(`<div class="sheet-in hatch">
        <h2 class="title" style="flex:none">조금 더 키워서 다시 와요</h2>
        <div class="hero">${A.dino(mine[0], { mini: true })}</div>
        <p class="lede">${TYPES[foeType].name} 공룡에게는 ${strong} 속성 기술이 잘 들어요. 돌봐 주면 레벨이 올라요!</p>
        <button class="big" id="again">지도로</button></div>`);
      c.$('#again', sheet).addEventListener('click', () => openMap(regionIndex));
      return;
    }
    const rating = B.rating(battle, 0);
    const before = mine.map(levelOf);
    const result = S.finishStage(save, region, index, rating, mine.map((d) => d.id));
    c.mission('adv');
    c.refresh();
    c.mountDino();
    c.writeSave();
    snd.play.levelUp();
    if (result.boss) c.confetti();
    const rows = mine.map((d, i) => {
      const now = levelOf(d);
      return `<div class="skill-row"><span>${c.esc(d.name)}</span><span>경험치 +${result.xp}</span><small>${now > before[i] ? `레벨 업! Lv.${now}` : `Lv.${now}`}</small></div>`;
    }).join('');
    const newEggs = result.boss && result.first ? SPECIES.filter((s) => s.unlock === region.id).map((s) => s.name).join(', ') : '';
    const sheet = c.openSheet(`<div class="sheet-in hatch">
      <h2 class="title" style="flex:none">이겼어요!</h2>
      <div class="chips">${A.star.replace('<svg', '<svg width="44" height="44"').repeat(rating)}</div>
      <p class="lede">별 ${result.stars}개를 받았어요.</p>
      <div class="skill-list" style="width:100%">${rows}</div>
      ${result.boss && result.first ? `<p class="story">${region.outro}</p>` : ''}
      ${newEggs ? `<p class="story">새 알이 열렸어요: ${newEggs}</p>` : ''}
      <button class="big" id="next">지도로</button></div>`);
    if (result.boss && result.first) snd.say(region.outro, true);
    c.$('#next', sheet).addEventListener('click', () => {
      const up = result.stageUps[0];
      if (!up) return openMap(regionIndex);
      c.celebrate(up.stage, up.dino);
      c.ui.afterClose = () => openMap(regionIndex);
    });
  }

  /* ---------- 2인 팀 대전 ---------- */

  function openPvp() {
    const { closeBtn } = c;
    const mine = teamDinos();
    const level = Math.max(...mine.map(levelOf));
    const picked = [];
    const sheet = c.openSheet(`<div class="sheet-in">
      <div class="sheet-head"><h2>팀 대전</h2>${closeBtn}</div>
      <p class="lede">1P는 내 팀으로, 2P는 공룡 ${TEAM_SIZE}마리를 골라 싸워요. 공평하게 모두 레벨 ${level}이 돼요. 번갈아 기기를 넘기며 기술을 골라요.</p>
      <div class="grid">${SPECIES.map((sp) => `<button class="card" data-p2="${sp.id}"><div class="art">${A.dino({ species: sp.id, stage: 'adult', color: sp.color }, { mini: true })}</div>${sp.name}${typeBadge(sp.type)}</button>`).join('')}</div>
      <button class="big" id="pvp-go" disabled>2P 공룡 ${TEAM_SIZE}마리 고르기</button></div>`);
    const go = c.$('#pvp-go', sheet);
    c.$$('[data-p2]', sheet).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.p2;
      const at = picked.indexOf(id);
      if (at >= 0) picked.splice(at, 1);
      else if (picked.length < TEAM_SIZE) picked.push(id);
      b.classList.toggle('on', picked.includes(id));
      c.snd.play.tap();
      go.disabled = picked.length !== TEAM_SIZE;
      go.textContent = go.disabled ? `2P 공룡 ${TEAM_SIZE - picked.length}마리 더 고르기` : '대결 시작';
    }));
    go.addEventListener('click', () => {
      const left = mine.map((d) => B.fighter(data, { id: d.id, species: d.species, name: d.name, level, color: d.color, hat: d.hat }));
      const right = picked.map((id) => B.fighter(data, { species: id, name: `2P ${SPECIES.find((s) => s.id === id).name}`, level }));
      startBattle({
        left, right, theme: c.save.theme, title: '팀 대전', pvp: true,
        onEnd: (battle) => {
          c.ui.cleanup = null;
          const name = battle.winner === 0 ? '1P' : '2P';
          c.finishGame({
            title: `${name} 승리!`,
            body: '<p class="lede">다 같이 멋진 대결이었어요!</p>',
            stars: battle.winner === 0 ? 5 : 3, fun: 40,
          });
        },
      });
    });
  }

  return {
    init: (ctx) => { c = ctx; },
    scape, openMap, openPvp, typeBadge,
  };
})();
