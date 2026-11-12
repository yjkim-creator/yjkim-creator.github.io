// 턴제 전투 규칙. 화면을 모르는 순수 로직이라 시뮬레이션과 테스트가 가능하다.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DinoBattle = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const STRONG_MULT = 1.5;
  const WEAK_MULT = 0.7;
  const CRIT_RATE = 1 / 12;
  const CRIT_MULT = 1.5;
  const DAMAGE_SCALE = 0.5;
  const LEVEL_GROWTH = 0.1;
  const BOOST_MULT = 1.5;
  const GUARD_MULT = 0.5;
  // 아이가 상성을 몰라도 진행할 수 있도록 적은 같은 레벨 공룡보다 약하게 때린다.
  const ENEMY_ATK = 0.8;
  const BOSS_HP = 1.25;
  const PLUS_POWER = 0.04; // 코인으로 강화한 단계마다 체력, 공격, 방어가 이만큼 오른다.

  function typeMult(data, attack, target) {
    if (attack === 'none') return 1;
    if (data.STRONG[attack]?.includes(target)) return STRONG_MULT;
    if (data.STRONG[target]?.includes(attack)) return WEAK_MULT;
    return 1;
  }

  const skillsAt = (species, level) => species.learn.filter(([at]) => at <= level).map(([, id]) => id);

  function fighter(data, { species, name, level, color, hat, stage = 'adult', id = null, scale = 1, plus = 0 }) {
    const sp = data.SPECIES.find((s) => s.id === species);
    const grow = 1 + (level - 1) * LEVEL_GROWTH;
    const tough = grow * (1 + plus * PLUS_POWER);
    const [hp, atk, def, spd] = sp.stats;
    const maxHp = Math.round(hp * tough * scale);
    return {
      id, species, name, level, stage, type: sp.type, color: color || sp.color, hat: hat || null,
      hp: maxHp, maxHp, atk: atk * tough, def: def * tough, spd: spd * grow, might: grow,
      skills: skillsAt(sp, level), cool: {}, guard: 0, boost: 0, stunned: false,
    };
  }

  function create(left, right) {
    return { sides: [{ team: left, active: 0 }, { team: right, active: 0 }], winner: null, turn: 0 };
  }

  const current = (battle, side) => battle.sides[side].team[battle.sides[side].active];
  const alive = (team) => team.filter((f) => f.hp > 0);

  const ready = (f, id) => !(f.cool[id] > 0);

  function damageOf(data, user, target, skill, rng) {
    const mult = typeMult(data, skill.type, target.type);
    const crit = rng() < CRIT_RATE;
    const roll = 0.9 + rng() * 0.2;
    // 체력이 레벨과 함께 늘므로 피해도 함께 키운다. 아니면 회복이 피해를 앞질러 전투가 끝나지 않는다.
    let dmg = skill.power * (user.atk / target.def) * user.might * DAMAGE_SCALE * mult * roll;
    if (user.boost > 0) dmg *= BOOST_MULT;
    if (target.guard > 0) dmg *= GUARD_MULT;
    if (crit) dmg *= CRIT_MULT;
    return { dmg: Math.max(1, Math.round(dmg)), mult, crit };
  }

  function bringNext(battle, side, events) {
    const s = battle.sides[side];
    const next = s.team.findIndex((f) => f.hp > 0);
    if (next < 0) {
      battle.winner = 1 - side;
      return;
    }
    s.active = next;
    events.push({ kind: 'enter', side, index: next, name: s.team[next].name, hp: s.team[next].hp });
  }

  function useSkill(data, battle, side, skillId, rng, events) {
    const user = current(battle, side);
    const foeSide = 1 - side;
    const target = current(battle, foeSide);
    const skill = data.SKILLS[skillId];
    if (user.stunned) {
      user.stunned = false;
      events.push({ kind: 'stunned', side, name: user.name });
      return;
    }
    if (skill.cool) user.cool[skillId] = skill.cool + 1;
    events.push({ kind: 'use', side, name: user.name, skill: skillId });

    if (skill.heal) {
      const amount = Math.round(user.maxHp * skill.heal);
      user.hp = Math.min(user.maxHp, user.hp + amount);
      events.push({ kind: 'heal', side, amount, hp: user.hp });
      return;
    }
    if (skill.guard) {
      user.guard = skill.guard + 1;
      events.push({ kind: 'guard', side });
      return;
    }
    if (skill.boost) {
      user.boost = skill.boost + 1;
      events.push({ kind: 'boost', side });
      return;
    }
    const { dmg, mult, crit } = damageOf(data, user, target, skill, rng);
    target.hp = Math.max(0, target.hp - dmg);
    events.push({ kind: 'hit', side: foeSide, dmg, mult, crit, type: skill.type, hp: target.hp });
    if (target.hp === 0) {
      events.push({ kind: 'tired', side: foeSide, name: target.name });
      bringNext(battle, foeSide, events);
    } else if (skill.stun && rng() < skill.stun) {
      target.stunned = true;
      events.push({ kind: 'dizzy', side: foeSide, name: target.name });
    }
  }

  // actions[side]: { skill: id } 또는 { swap: 팀 번호 }. 교체가 먼저, 그다음 빠른 쪽부터 움직인다.
  function turn(data, battle, actions, rng = Math.random) {
    const events = [];
    battle.turn += 1;
    [0, 1].forEach((side) => {
      if (actions[side].swap === undefined) return;
      battle.sides[side].active = actions[side].swap;
      const f = current(battle, side);
      events.push({ kind: 'enter', side, index: actions[side].swap, name: f.name, hp: f.hp });
    });

    // 방패는 속도와 상관없이 먼저 든다.
    const priority = (side) => (data.SKILLS[actions[side].skill].guard ? 1 : 0);
    const order = [0, 1].filter((side) => actions[side].skill)
      .sort((a, b) => priority(b) - priority(a) || current(battle, b).spd - current(battle, a).spd);
    for (const side of order) {
      if (battle.winner !== null) break;
      // 이번 턴에 지쳐서 교대한 공룡은 앞선 공룡의 기술을 대신 쓰지 않는다.
      if (!events.some((e) => e.kind === 'enter' && e.side === side && actions[side].swap === undefined)) {
        useSkill(data, battle, side, actions[side].skill, rng, events);
      }
    }

    for (const side of [0, 1]) {
      for (const f of battle.sides[side].team) {
        for (const id of Object.keys(f.cool)) if (f.cool[id] > 0) f.cool[id] -= 1;
        if (f.guard > 0) f.guard -= 1;
        if (f.boost > 0) f.boost -= 1;
      }
    }
    return events;
  }

  // 컴퓨터는 상성을 보고 고르지만 가끔 실수해서 아이도 이길 수 있다.
  function choose(data, battle, side, rng = Math.random) {
    const me = current(battle, side);
    const foe = current(battle, 1 - side);
    const options = me.skills.filter((id) => ready(me, id));
    let best = options[0];
    let bestScore = -1;
    for (const id of options) {
      const skill = data.SKILLS[id];
      let score = skill.power ? skill.power * typeMult(data, skill.type, foe.type) : 0;
      if (skill.heal) score = me.hp < me.maxHp * 0.4 ? 90 : 0;
      if (skill.guard || skill.boost) score = me.hp > me.maxHp * 0.6 ? 45 : 10;
      score *= 0.6 + rng() * 0.8;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return { skill: best };
  }

  function rating(battle, side) {
    const lost = battle.sides[side].team.filter((f) => f.hp === 0).length;
    return lost === 0 ? 3 : lost === 1 ? 2 : 1;
  }

  // 스테이지 5개 + 보스. 뒤로 갈수록 상대가 늘고 강해진다.
  function stageTeam(data, region, index, bossIndex) {
    const make = (species, name, level, scale) => {
      const foe = fighter(data, {
        species, level, scale, name: name || data.SPECIES.find((s) => s.id === species).name,
      });
      foe.atk *= ENEMY_ATK;
      return foe;
    };
    if (index === bossIndex) {
      const { boss } = region;
      const level = region.level + bossIndex - 1;
      return [...boss.team.map((sp) => make(sp, null, level - 1, 1)), make(boss.species, boss.name, level, BOSS_HP)];
    }
    const level = region.level + index;
    const count = index < 2 ? 1 : index < 4 ? 2 : 3;
    return Array.from({ length: count }, (_, i) => make(region.pool[(index + i) % region.pool.length], null, level, 1));
  }

  return { PLUS_POWER, typeMult, fighter, create, current, alive, ready, turn, choose, rating, stageTeam, skillsAt };
});
