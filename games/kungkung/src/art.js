// 모든 그림을 코드로 그린다. 이미지 파일이 없어 오프라인에서도 바로 뜬다.
window.DinoArt = (() => {
  const { COLORS, SPECIES } = window.DinoData;

  const eyes = (x, y, base = 13) => {
    const r = base * 1.22;
    return `
    <g class="eye-open">
      <circle class="white" cx="${x}" cy="${y}" r="${r}"/>
      <circle class="iris" cx="${x + 3}" cy="${y + 1}" r="${r * 0.74}"/>
      <circle class="iris-lite" cx="${x + 3}" cy="${y + 1 + r * 0.3}" r="${r * 0.44}"/>
      <circle class="pupil" cx="${x + 4}" cy="${y + 1}" r="${r * 0.42}"/>
      <circle class="glint" cx="${x + 7.5}" cy="${y - 4.5}" r="${r * 0.28}"/>
      <circle class="glint" cx="${x - 1}" cy="${y + 5.5}" r="${r * 0.13}"/>
      <path class="lid" d="M${x - r} ${y - r * 0.2}Q${x} ${y - r * 1.5} ${x + r} ${y - r * 0.2}"/>
    </g>
    <path class="eye-closed line" d="M${x - r} ${y}q${r} ${r} ${r * 2} 0"/>`;
  };

  const mouth = (x, y, w = 14) => `
    <path class="m-smile line" d="M${x - w} ${y}q${w} ${w * 0.8} ${w * 2} 0"/>
    <path class="m-sad line" d="M${x - w} ${y + 7}q${w} ${-w * 0.8} ${w * 2} 0"/>
    <ellipse class="m-open" cx="${x}" cy="${y + 5}" rx="${w * 0.7}" ry="${w * 0.8}"/>`;

  const cheek = (x, y) => `<ellipse class="cheek" cx="${x}" cy="${y}" rx="11" ry="7"/>`;

  // 허벅지 위쪽이 둥글어서 몸 위에 겹쳐도 네모난 경계선이 보이지 않는다.
  function leg(x, top, w, bottom, cls) {
    const b = bottom;
    const m = (top + b) / 2;
    return `<g class="leg ${cls}">
      <path class="f1 s" d="M${x - 3} ${top + 12}Q${x + w / 2} ${top - 14} ${x + w + 3} ${top + 12}Q${x + w + 5} ${m} ${x + w - 1} ${b - 15}Q${x + w + 13} ${b - 13} ${x + w + 13} ${b - 5}Q${x + w + 13} ${b} ${x + w + 7} ${b}L${x - 2} ${b}Q${x - 8} ${b} ${x - 7} ${b - 5}Q${x - 7} ${b - 11} ${x + 1} ${b - 14}Q${x - 6} ${m} ${x - 3} ${top + 12}Z"/>
      <ellipse class="nail" cx="${x + w + 6}" cy="${b - 4.5}" rx="4.6" ry="3.6"/>
      <ellipse class="nail" cx="${x + w - 4}" cy="${b - 4}" rx="4.6" ry="3.6"/>
      <ellipse class="nail" cx="${x + w * 0.42}" cy="${b - 4}" rx="4.6" ry="3.6"/>
    </g>`;
  }

  // 위에서 비치는 빛. 몸과 머리의 왼쪽 위에 얹는다.
  const shine = (cx, cy, rx, ry, rot = -18) => `<ellipse class="shine" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`;

  // 밝은 배. 세로로 긴 배에는 가로 줄무늬, 납작한 배에는 세로 줄무늬를 넣는다.
  function belly(cx, cy, rx, ry) {
    const lines = ry >= 26
      ? [-0.42, 0.02, 0.44].map((t) => {
        const half = rx * Math.sqrt(1 - t * t) * 0.7;
        return `M${cx - half} ${cy + t * ry}q${half} ${ry * 0.14} ${half * 2} 0`;
      })
      : [-0.56, -0.2, 0.2, 0.56].map((u) => {
        const half = ry * Math.sqrt(1 - u * u) * 0.55;
        return `M${cx + u * rx} ${cy - half}q${rx * 0.05} ${half} 0 ${half * 2}`;
      });
    return `<ellipse class="f2" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><path class="belly-line" d="${lines.join('')}"/>`;
  }

  const dots = (list) => `<g class="spots">${list.map(([x, y, r], i) => `<ellipse class="f3" cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.78}" transform="rotate(${i % 2 ? 24 : -20} ${x} ${y})"/>
    <circle class="f3" cx="${x + r * 1.25}" cy="${y + r * 0.95}" r="${r * 0.3}"/>`).join('')}</g>`;
  const dirt = (x, y) => `<g class="dirt">
    <ellipse cx="${x}" cy="${y}" rx="17" ry="11"/><ellipse cx="${x + 46}" cy="${y + 22}" rx="12" ry="9"/>
    <ellipse cx="${x - 40}" cy="${y + 26}" rx="10" ry="7"/></g>`;

  const BUILD = {
    trex: () => ({
      back: '<path class="f3 s" d="M112 128L104 104L128 114L132 92L152 110L164 96L172 116Z"/>',
      tail: `<path class="f1 s" d="M125 165C85 165 45 145 10 112C30 185 85 222 140 222Z"/>
        <path class="stripe" d="M38 142q10 16 8 34M62 158q10 16 6 36M88 166q8 18 4 38"/>`,
      legsBack: leg(130, 200, 42, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="170" cy="168" rx="72" ry="64"/>
        ${belly(192, 186, 42, 40)}
        ${dots([[120, 140, 9], [145, 118, 7], [112, 172, 6]])}${shine(140, 124, 26, 9, -34)}${dirt(150, 150)}`,
      legsFront: leg(175, 205, 46, 258, 'lf'),
      front: `<g class="arm"><path class="f1 s" d="M222 165q24 -4 28 12q-6 8 -14 2q-10 2 -18 -2Z"/></g>`,
      head: {
        x: 225, y: 92,
        svg: `<path class="f1 s" d="M-52 -34Q0 -62 58 -38Q88 -24 88 6Q88 34 56 34L-28 36Q-58 26 -52 -34Z"/>
          <path class="f2" d="M-20 34L58 32Q82 28 84 12L-14 18Z"/>
          <path class="white s-thin" d="M28 16l7 12l7 -12zM50 15l7 12l7 -12z"/>
          ${shine(-8, -36, 30, 7, -8)}
          ${eyes(16, -16, 14)}${mouth(60, 6, 12)}${cheek(-14, 8)}
          <circle class="pupil" cx="74" cy="-12" r="3"/>`,
        hat: [-4, -46, 1.1, -6],
      },
    }),

    tricera: () => ({
      tail: '<path class="f1 s" d="M78 165C50 170 25 190 8 222C50 232 95 225 120 215Z"/>',
      legsBack: leg(75, 205, 44, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="145" cy="170" rx="96" ry="62"/>
        ${belly(150, 208, 66, 20)}
        ${dots([[95, 135, 9], [130, 122, 7], [165, 128, 8], [80, 170, 6]])}${shine(104, 124, 34, 9, -16)}${dirt(135, 150)}`,
      legsFront: leg(170, 205, 44, 258, 'lf'),
      head: {
        x: 240, y: 150,
        svg: `<circle class="f3 s" cx="-26" cy="-14" r="60"/>
          <circle class="f2" cx="-26" cy="-14" r="42"/>
          <g class="frill-dot"><circle cx="-70" cy="-34" r="6"/><circle cx="-76" cy="-4" r="6"/><circle cx="-66" cy="24" r="6"/><circle cx="-48" cy="-58" r="6"/></g>
          <path class="horn s" d="M-8 -36Q-6 -84 22 -92Q14 -60 22 -32Z"/>
          <path class="horn s" d="M-38 -44Q-44 -86 -20 -98Q-24 -70 -12 -42Z"/>
          <ellipse class="f1 s" cx="8" cy="4" rx="56" ry="44"/>
          <path class="horn s" d="M46 -20Q52 -42 70 -48Q68 -28 64 -10Z"/>
          <path class="f2 s-thin" d="M40 8Q70 4 76 22Q66 42 34 40Z"/>
          ${shine(-6, -24, 24, 7, -12)}<circle class="pupil" cx="66" cy="14" r="2.5"/>
          ${eyes(14, -10, 13)}${mouth(38, 20, 11)}${cheek(-14, 16)}`,
        hat: [6, -42, 0.9, -6],
      },
    }),

    brachio: () => ({
      tail: '<path class="f1 s" d="M72 180C45 180 20 200 4 236C40 240 85 240 110 228Z"/>',
      legsBack: leg(70, 210, 44, 258, 'lb'),
      body: `<path class="f1 s" d="M170 150C190 110 205 80 216 44L262 60C250 110 240 150 228 190Z"/>
        <ellipse class="f1 s" cx="140" cy="190" rx="92" ry="54"/>
        <path class="f1" d="M172 154L226 186L190 200L160 165Z"/>
        ${belly(150, 226, 60, 16)}
        ${dots([[100, 165, 8], [135, 152, 7], [170, 165, 6], [214, 110, 6], [224, 80, 5]])}${shine(102, 150, 34, 8, -14)}${dirt(125, 175)}`,
      legsFront: leg(165, 210, 44, 258, 'lf'),
      head: {
        x: 244, y: 44,
        svg: `<ellipse class="f1 s" cx="8" cy="0" rx="48" ry="34"/>
          <ellipse class="f1 s" cx="-8" cy="-28" rx="17" ry="13"/>
          ${shine(-4, -18, 20, 6, -14)}
          ${eyes(10, -8, 12)}${mouth(32, 10, 12)}${cheek(-14, 12)}
          <circle class="pupil" cx="46" cy="-8" r="2.5"/>`,
        hat: [-6, -38, 0.75, -4],
      },
    }),

    stego: () => ({
      back: `<g class="f3 s">
        <path d="M58 150L52 104L92 122Z"/><path d="M84 124L84 66L132 104Z"/>
        <path d="M124 104L138 44L180 100Z"/><path d="M170 104L196 58L216 122Z"/>
        <path d="M208 128L238 100L238 150Z"/></g>
        <path class="plate-line" d="M72 132L62 112M104 112L92 82M146 92L140 60M190 100L196 74"/>`,
      tail: `<path class="horn s" d="M36 186L4 150L50 170Z"/><path class="horn s" d="M24 200L-6 196L36 186Z"/>
        <path class="f1 s" d="M78 165C50 170 25 180 14 212C50 228 95 225 120 215Z"/>`,
      legsBack: leg(75, 205, 42, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="145" cy="172" rx="96" ry="60"/>
        ${belly(150, 210, 62, 18)}
        ${dots([[100, 150, 8], [140, 140, 7], [180, 150, 8]])}${shine(104, 130, 34, 8, -14)}${dirt(135, 155)}`,
      legsFront: leg(172, 208, 40, 258, 'lf'),
      head: {
        x: 252, y: 185,
        svg: `<ellipse class="f1 s" cx="6" cy="0" rx="48" ry="34"/>
          ${shine(-8, -20, 20, 6, -14)}<circle class="pupil" cx="44" cy="-6" r="2.5"/>
          ${eyes(10, -10, 12)}${mouth(32, 10, 11)}${cheek(-14, 12)}`,
        hat: [-2, -30, 0.75, -4],
      },
    }),

    ankylo: () => ({
      tail: `<path class="f1 s" d="M78 190C60 190 45 196 30 206L34 222C60 226 90 228 110 226Z"/>
        <path class="horn s" d="M22 188L6 172L34 182Z"/><path class="horn s" d="M12 228L-6 240L24 238Z"/>
        <circle class="f3 s" cx="20" cy="212" r="25"/>`,
      legsBack: leg(82, 222, 40, 258, 'lb'),
      body: `<path class="f1 s" d="M56 212C56 140 110 122 165 124C225 126 256 170 256 214C256 232 70 236 56 212Z"/>
        <path class="f2" d="M78 222Q156 206 238 222Q156 234 78 222Z"/>
        <g class="f3 s-thin"><circle cx="100" cy="162" r="13"/><circle cx="136" cy="145" r="14"/><circle cx="176" cy="145" r="14"/>
        <circle cx="214" cy="166" r="12"/><circle cx="120" cy="190" r="11"/><circle cx="160" cy="180" r="12"/><circle cx="198" cy="194" r="10"/></g>
        <g class="shine"><circle cx="96" cy="157" r="4"/><circle cx="132" cy="140" r="4.5"/><circle cx="172" cy="140" r="4.5"/><circle cx="210" cy="161" r="4"/><circle cx="116" cy="186" r="3.5"/><circle cx="156" cy="175" r="4"/><circle cx="194" cy="190" r="3.2"/></g>
        ${dirt(150, 172)}`,
      legsFront: leg(180, 222, 40, 258, 'lf'),
      head: {
        x: 256, y: 196,
        svg: `<path class="horn s" d="M-22 -22L-40 -42L-2 -30Z"/>
          <path class="horn s" d="M-22 24L-42 40L-4 32Z"/>
          <ellipse class="f1 s" cx="6" cy="0" rx="46" ry="34"/>
          ${shine(-8, -20, 20, 6, -14)}<circle class="pupil" cx="42" cy="-4" r="2.5"/>
          ${eyes(10, -8, 12)}${mouth(30, 12, 11)}${cheek(-16, 12)}`,
        hat: [0, -30, 0.75, -4],
      },
    }),

    ptero: () => ({
      back: `<g class="wing wing-back"><path class="f3 s" d="M150 150L22 84Q26 170 82 196Q116 186 150 200Z"/>
        <path class="line thin" d="M150 160L60 124M150 174L84 164"/></g>`,
      tail: '',
      legsBack: leg(136, 222, 24, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="164" cy="182" rx="46" ry="56"/>
        ${belly(176, 196, 28, 36)}${shine(146, 150, 14, 6, -50)}${dirt(150, 165)}`,
      legsFront: leg(170, 222, 24, 258, 'lf'),
      front: `<g class="wing wing-front"><path class="f3 s" d="M176 148L304 96Q300 168 246 192Q214 184 176 200Z"/>
        <path class="line thin" d="M176 158L266 130M176 172L244 164"/></g>`,
      head: {
        x: 176, y: 100,
        svg: `<path class="f3 s" d="M-14 -20L-88 -62Q-70 -18 -22 8Z"/>
          <path class="horn s" d="M16 -14L112 2Q112 12 106 14L16 26Z"/>
          <path class="line" d="M24 8L100 8"/>
          <circle class="f1 s" cx="0" cy="0" r="36"/>
          ${shine(-10, -22, 16, 6, -24)}
          ${eyes(6, -8, 12)}${cheek(-12, 14)}
          <g class="mouth-hide">${mouth(16, 14, 8)}</g>`,
        hat: [-2, -34, 0.72, -6],
      },
    }),

    raptor: () => ({
      back: '<path class="f3 s" d="M112 128L96 100L126 110L126 84L152 104L164 84L180 110Z"/>',
      tail: `<path class="f1 s" d="M125 148C85 142 42 120 4 126C34 164 90 192 138 190Z"/>
        <path class="stripe" d="M36 130q10 12 10 28M62 136q10 14 8 34M90 142q8 16 4 38"/>`,
      legsBack: leg(132, 190, 28, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="165" cy="158" rx="60" ry="46"/>
        ${belly(182, 172, 34, 28)}
        ${dots([[126, 150, 7], [148, 130, 6], [122, 172, 5]])}${shine(142, 126, 22, 7, -24)}${dirt(150, 145)}`,
      legsFront: leg(166, 192, 30, 258, 'lf'),
      front: `<path class="horn s-thin" d="M192 248Q212 236 208 216Q200 228 186 234Z"/>
        <g class="arm"><path class="f3 s" d="M196 146Q232 152 240 184Q218 182 208 172Q196 176 186 166Z"/></g>`,
      head: {
        x: 222, y: 100,
        svg: `<path class="f1 s" d="M-38 -24Q0 -44 40 -28Q76 -16 84 6Q60 24 20 24L-26 30Q-48 8 -38 -24Z"/>
          <path class="f2" d="M-14 26L22 22Q62 22 80 8L-8 12Z"/>
          <path class="white s-thin" d="M34 15l6 10l6 -10zM54 13l6 10l6 -10z"/>
          ${shine(-6, -26, 22, 6, -8)}<circle class="pupil" cx="70" cy="-4" r="2.5"/>
          ${eyes(10, -10, 13)}${mouth(46, 2, 10)}${cheek(-14, 8)}`,
        hat: [-2, -38, 0.85, -6],
      },
    }),

    para: () => ({
      tail: '<path class="f1 s" d="M80 165C50 165 24 176 6 200C44 224 92 224 120 214Z"/>',
      legsBack: leg(78, 205, 44, 258, 'lb'),
      body: `<path class="f1 s" d="M190 142Q212 122 218 100L262 118Q252 160 226 192Z"/>
        <ellipse class="f1 s" cx="145" cy="170" rx="94" ry="60"/>
        <path class="f1" d="M192 146L228 190L200 200L170 160Z"/>
        ${belly(150, 208, 62, 18)}
        ${dots([[100, 145, 9], [140, 130, 7], [178, 146, 7], [84, 176, 6]])}${shine(104, 126, 34, 8, -14)}${dirt(135, 150)}`,
      legsFront: leg(170, 205, 42, 258, 'lf'),
      head: {
        x: 240, y: 104,
        svg: `<path class="f3 s" d="M-6 -20Q-40 -52 -96 -68Q-102 -54 -92 -46Q-52 -32 -28 10Z"/>
          <ellipse class="f1 s" cx="6" cy="0" rx="46" ry="32"/>
          <path class="f2 s-thin" d="M30 -8Q68 -10 74 8Q64 26 30 22Z"/>
          <path class="plate-line" d="M-34 -36q-8 8 -10 20M-54 -48q-8 8 -10 18M-74 -57q-6 6 -8 14"/>
          ${shine(-8, -18, 18, 6, -14)}<circle class="pupil" cx="62" cy="2" r="2.5"/>
          ${eyes(8, -8, 12)}${mouth(36, 14, 10)}${cheek(-16, 12)}`,
        hat: [10, -30, 0.7, 2],
      },
    }),

    spino: () => ({
      back: `<path class="f3 s" d="M72 152Q92 40 150 34Q202 40 224 142Z"/>
        <path class="line thin" d="M112 148L122 70M150 148V50M188 148L186 68"/>`,
      tail: `<path class="f1 s" d="M100 158C70 152 40 136 6 110C22 180 70 220 130 222Z"/>
        <path class="stripe" d="M34 138q10 18 10 38M58 152q10 18 8 40M84 160q8 20 4 44"/>`,
      legsBack: leg(122, 205, 42, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="160" cy="170" rx="84" ry="58"/>
        ${belly(178, 192, 46, 32)}
        ${dots([[110, 165, 8], [132, 145, 6], [100, 190, 6]])}${shine(126, 132, 28, 8, -22)}${dirt(150, 155)}`,
      legsFront: leg(168, 208, 44, 258, 'lf'),
      front: `<g class="arm"><path class="f1 s" d="M222 172q26 -2 32 14q-8 8 -16 2q-12 2 -20 -4Z"/></g>`,
      head: {
        x: 232, y: 110,
        svg: `<path class="f1 s" d="M-40 -22Q-10 -42 24 -28Q80 -18 96 -2Q98 14 80 18Q40 28 -28 30Q-52 10 -40 -22Z"/>
          <path class="f2" d="M-16 28L40 22Q78 18 92 6L-6 14Z"/>
          <path class="white s-thin" d="M44 18l5 9l5 -9zM62 15l5 9l5 -9z"/>
          ${shine(-12, -26, 22, 6, -6)}
          ${eyes(2, -12, 13)}${mouth(54, 4, 10)}${cheek(-18, 8)}
          <circle class="pupil" cx="84" cy="-4" r="3"/>`,
        hat: [-12, -34, 0.85, -6],
      },
    }),

    korea: () => ({
      tail: `<path class="f3 s" d="M104 150C70 120 34 112 8 118C12 176 46 216 104 220Z"/>
        <path class="plate-line" d="M22 132q30 14 52 44M44 124q28 18 44 50M30 160q22 14 38 36"/>`,
      legsBack: leg(84, 205, 42, 258, 'lb'),
      body: `<ellipse class="f1 s" cx="150" cy="176" rx="82" ry="56"/>
        ${belly(156, 212, 56, 16)}
        ${dots([[120, 145, 8], [155, 136, 7], [190, 150, 6]])}${shine(116, 138, 30, 8, -16)}${dirt(140, 160)}`,
      legsFront: leg(172, 208, 40, 258, 'lf'),
      head: {
        x: 232, y: 130,
        svg: `<path class="f3 s" d="M-34 -30Q-58 8 -24 36L6 -36Z"/>
          <ellipse class="f1 s" cx="8" cy="2" rx="50" ry="40"/>
          <path class="f2 s-thin" d="M40 2Q68 2 72 18Q60 36 34 34Z"/>
          ${shine(-8, -24, 22, 7, -14)}<circle class="pupil" cx="62" cy="10" r="2.5"/>
          ${eyes(12, -10, 13)}${mouth(36, 18, 10)}${cheek(-14, 14)}`,
        hat: [4, -38, 0.85, -6],
      },
    }),
  };

  const HATS = {
    ribbon: `<g class="s"><path fill="#FF5C8A" d="M0 -14L-34 -32V6Z"/><path fill="#FF5C8A" d="M0 -14L34 -32V6Z"/><circle fill="#FFD23F" cx="0" cy="-14" r="10"/></g>`,
    flower: `<g class="s" fill="#FFF"><circle cx="0" cy="-34" r="13"/><circle cx="-18" cy="-20" r="13"/><circle cx="18" cy="-20" r="13"/><circle cx="-11" cy="-2" r="13"/><circle cx="11" cy="-2" r="13"/><circle fill="#FFD23F" cx="0" cy="-17" r="11"/></g>`,
    party: `<g class="s"><path fill="#3CC4C9" d="M-30 4L0 -66L30 4Q0 16 -30 4Z"/><path fill="#FFD23F" stroke="none" d="M-16 -28L12 -38L18 -22L-22 -14Z"/><circle fill="#FF6B4A" cx="0" cy="-70" r="10"/></g>`,
    straw: `<g class="s"><ellipse fill="#F4D27A" cx="0" cy="2" rx="68" ry="15"/><path fill="#F4D27A" d="M-36 0Q-34 -46 0 -46Q34 -46 36 0Q0 12 -36 0Z"/><path fill="#E0483E" d="M-36 -6Q0 8 36 -6L36 -18Q0 -4 -36 -18Z"/></g>`,
    explorer: `<g class="s"><path fill="#E9C48A" d="M-62 8Q-44 -6 -40 -8Q-38 -52 0 -52Q38 -52 40 -8Q44 -6 62 8Q0 22 -62 8Z"/><path fill="#7A5230" stroke="none" d="M-40 -14Q0 2 40 -14L40 -4Q0 12 -40 -4Z"/></g>`,
    crown: `<g class="s"><path fill="#FFD23F" d="M-40 6L-46 -40L-20 -16L0 -50L20 -16L46 -40L40 6Q0 16 -40 6Z"/><circle fill="#FF6B4A" cx="0" cy="-8" r="7"/><circle fill="#3CC4C9" cx="-24" cy="-4" r="5"/><circle fill="#3CC4C9" cx="24" cy="-4" r="5"/></g>`,
  };

  function dino(d, { mini = false } = {}) {
    const p = COLORS[d.color] || COLORS.fern;
    const b = BUILD[d.species]();
    const headScale = d.stage === 'baby' ? 1.26 : d.stage === 'kid' ? 1.12 : 1;
    const [hx, hy, hs, hr] = b.head.hat;
    const hat = d.hat && HATS[d.hat]
      ? `<g transform="translate(${hx} ${hy}) rotate(${hr}) scale(${hs})">${HATS[d.hat]}</g>` : '';
    const id = d.color in COLORS ? d.color : 'fern';
    return `<svg class="dino-svg stage-${d.stage} sp-${d.species}${mini ? ' mini' : ''}" viewBox="-14 -24 340 300" aria-hidden="true"
        style="--c1:${p.c1};--c2:${p.c2};--c3:${p.c3};--ln:${p.ln};--g1:url(#body-${id});--gw:url(#whole-${id});--g3:url(#back-${id})">
      <ellipse class="d-shadow" cx="158" cy="262" rx="${d.species === 'ptero' ? 70 : 118}" ry="11"/>
      ${b.back || ''}<g class="d-tail">${b.tail}</g>
      ${b.legsBack}${b.body}${b.legsFront}${b.front || ''}
      <g transform="translate(${b.head.x} ${b.head.y}) scale(${headScale})"><g class="d-head">${b.head.svg}${hat}</g></g>
    </svg>`;
  }

  // 몸 전체에 위쪽 빛이 닿는 음영을 준다. 색마다 한 번만 정의해 공룡들이 함께 쓴다.
  function installGradients() {
    const stops = (list) => list.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
    const html = Object.entries(COLORS).map(([id, c]) => `
      <linearGradient id="body-${id}" x1="0.3" y1="0" x2="0.5" y2="1">${stops([[0, c.c0], [0.5, c.c1], [1, c.cd]])}</linearGradient>
      <linearGradient id="whole-${id}" gradientUnits="userSpaceOnUse" x1="120" y1="30" x2="170" y2="300">${stops([[0, c.c0], [0.5, c.c1], [1, c.cd]])}</linearGradient>
      <linearGradient id="back-${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, c.c1], [1, c.c3]])}</linearGradient>`).join('');
    document.querySelector('#defs defs').insertAdjacentHTML('beforeend', html);
  }

  function egg(speciesId, crack = 0) {
    const sp = SPECIES.find((s) => s.id === speciesId);
    const p = COLORS[sp.color];
    const cracks = [
      'M100 30L88 58L106 72L92 96',
      'M52 120L78 132L70 158L94 170',
      'M150 108L126 122L136 150L116 164',
      'M92 96L112 112L104 134L126 122',
    ];
    return `<svg class="egg-svg" viewBox="0 0 200 240" aria-hidden="true">
      <linearGradient id="egg-${speciesId}${crack}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="${p.c2}"/><stop offset="1" stop-color="${p.c1}"/></linearGradient>
      <ellipse cx="100" cy="226" rx="74" ry="10" fill="#000" opacity=".2"/>
      <path fill="url(#egg-${speciesId}${crack})" d="M100 8C150 8 186 92 186 142C186 196 148 232 100 232C52 232 14 196 14 142C14 92 50 8 100 8Z"/>
      <g fill="${p.c3}" opacity=".7"><circle cx="70" cy="72" r="15"/><circle cx="134" cy="84" r="20"/><circle cx="56" cy="150" r="18"/>
      <circle cx="126" cy="170" r="24"/><circle cx="92" cy="122" r="10"/></g>
      ${cracks.slice(0, crack).map((d) => `<path class="line crack" d="${d}"/>`).join('')}
    </svg>`;
  }

  const FOODS = {
    meat: `<path class="s" fill="#F7EEDC" d="M40 44L54 58a6 6 0 0 0 4 -10a6 6 0 0 0 -10 -4Z"/><path class="s" fill="#C8553D" d="M12 30C10 14 28 6 40 12C52 20 52 36 42 44C32 52 14 46 12 30Z"/><path fill="#E8846B" d="M20 24q6 -8 16 -6q-10 2 -12 12z"/>`,
    fish: `<path class="s" fill="#45BFD6" d="M6 32C16 16 36 14 46 30L60 18L56 32L60 46L46 34C36 50 16 48 6 32Z"/><circle class="pupil" cx="18" cy="28" r="3"/><path class="line thin" d="M28 22q6 10 0 20"/>`,
    fern: `<path class="line" d="M32 60Q30 34 40 8"/><g class="s-thin" fill="#58B947"><ellipse cx="20" cy="44" rx="11" ry="6" transform="rotate(20 20 44)"/><ellipse cx="44" cy="44" rx="11" ry="6" transform="rotate(-25 44 44)"/><ellipse cx="22" cy="28" rx="10" ry="5" transform="rotate(25 22 28)"/><ellipse cx="48" cy="26" rx="10" ry="5" transform="rotate(-30 48 26)"/><ellipse cx="30" cy="14" rx="8" ry="4" transform="rotate(30 30 14)"/></g>`,
    berry: `<path class="line thin" d="M32 16Q30 8 40 4"/><path class="s-thin" fill="#58B947" d="M32 14Q42 6 50 14Q40 20 32 14Z"/><g class="s-thin" fill="#E0483E"><circle cx="20" cy="30" r="12"/><circle cx="44" cy="30" r="12"/><circle cx="32" cy="48" r="12"/></g>`,
  };
  const food = (id) => `<svg class="food-svg" viewBox="0 0 64 64" aria-hidden="true">${FOODS[id]}</svg>`;

  const FOSSILS = {
    ammonite: `<circle class="fossil" cx="100" cy="100" r="74"/><path class="line" d="M100 100a12 12 0 0 1 22 8a30 30 0 0 1 -50 8a46 46 0 0 1 60 -66a62 62 0 0 1 -22 110"/>`,
    trilobite: `<ellipse class="fossil" cx="100" cy="102" rx="58" ry="78"/><path class="line" d="M72 34V168M128 34V168M46 72H154M42 96H158M44 120H156M54 144H146"/>`,
    tooth: `<path class="fossil" d="M60 40Q100 22 140 40Q140 110 108 176Q100 186 94 174Q60 110 60 40Z"/><path class="line" d="M78 56q4 40 18 88"/>`,
    bone: `<path class="fossil" d="M56 34a22 22 0 0 1 32 26L142 114a22 22 0 1 1 -14 30a22 22 0 1 1 -30 -14L44 76a22 22 0 1 1 12 -42Z"/>`,
    footprint: `<g class="fossil"><path d="M100 176Q58 150 66 104Q84 82 100 96Q116 82 134 104Q142 150 100 176Z"/><ellipse cx="62" cy="62" rx="15" ry="30" transform="rotate(-20 62 62)"/><ellipse cx="100" cy="46" rx="15" ry="32"/><ellipse cx="138" cy="62" rx="15" ry="30" transform="rotate(20 138 62)"/></g>`,
    leaf: `<path class="line" d="M100 186Q94 110 110 24"/><g class="fossil">${[[76, 150, 26], [130, 146, -30], [74, 116, 26], [134, 112, -30], [82, 84, 28], [134, 80, -32], [92, 52, 30], [128, 50, -34]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="11" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g>`,
  };
  const fossil = (id) => `<svg class="fossil-svg" viewBox="0 0 200 200" aria-hidden="true">${FOSSILS[id]}</svg>`;

  const heart = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#FF5C8A" stroke="#2B2A5A" stroke-width="2.5" d="M16 28C4 19 2 12 6 8C10 4 14 6 16 10C18 6 22 4 26 8C30 12 28 19 16 28Z"/></svg>';
  const star = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#FFD23F" stroke="#2B2A5A" stroke-width="2.5" stroke-linejoin="round" d="M16 3L20 12L30 13L23 20L25 30L16 25L7 30L9 20L2 13L12 12Z"/></svg>';

  const rock = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="s" fill="#A9A3B8" d="M6 60Q4 34 22 20Q40 6 54 26Q62 42 60 60Z"/><path class="line thin" d="M24 34q6 -6 12 -2"/></svg>';

  return { installGradients, dino, egg, food, fossil, rock, hat:(id) => `<svg class="hat-svg" viewBox="-75 -80 150 105" aria-hidden="true">${HATS[id]}</svg>`, heart, star };
})();
