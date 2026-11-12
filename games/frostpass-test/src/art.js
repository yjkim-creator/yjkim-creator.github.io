// 서리 고개의 그림. 모두 손으로 그린 SVG 문자열이며 게임 화면과 카드, 도감이 함께 쓴다.
(function (root) {
  const eyes = (y, gap, r) => `<circle cx="${50 - gap}" cy="${y}" r="${r}" fill="#1D2238"/><circle cx="${50 + gap}" cy="${y}" r="${r}" fill="#1D2238"/>`
    + `<circle cx="${50 - gap + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/><circle cx="${50 + gap + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;

  const ART = {
    blob: `<ellipse cx="50" cy="86" rx="30" ry="7" fill="#0E1730" opacity=".35"/>
      <circle cx="50" cy="56" r="30" fill="url(#gSnow)"/>
      <path d="M26 66 Q50 84 74 66 Q62 80 50 80 Q38 80 26 66Z" fill="#B9CCE8"/>
      ${eyes(52, 10, 4.2)}<path d="M42 66 Q50 62 58 66" stroke="#1D2238" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="38" r="5" fill="#fff" opacity=".9"/>`,
    wisp: `<ellipse cx="50" cy="88" rx="16" ry="5" fill="#0E1730" opacity=".3"/>
      <path d="M50 18 C72 30 76 56 62 70 C56 76 58 84 50 90 C44 82 30 78 30 60 C30 42 42 34 50 18Z" fill="url(#gWisp)"/>
      <path d="M50 30 C60 40 62 54 54 62" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>
      ${eyes(56, 8, 3.6)}
      <path d="M22 30 l6 3 M78 36 l-6 2 M24 50 l5 0" stroke="#CFF2FF" stroke-width="3" stroke-linecap="round"/>`,
    splitter: `<ellipse cx="50" cy="87" rx="30" ry="7" fill="#0E1730" opacity=".35"/>
      <circle cx="50" cy="55" r="31" fill="url(#gSnow)"/>
      <path d="M50 24 L45 38 L55 48 L46 60 L54 72 L50 86" stroke="#6C86B8" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
      <circle cx="38" cy="52" r="4.2" fill="#1D2238"/><circle cx="62" cy="52" r="4.2" fill="#1D2238"/>
      <path d="M31 44 l10 3 M69 44 l-10 3" stroke="#1D2238" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 68 q6 -4 10 0 M54 68 q6 -4 10 0" stroke="#1D2238" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    boulder: `<ellipse cx="50" cy="90" rx="38" ry="7" fill="#0E1730" opacity=".4"/>
      <circle cx="50" cy="53" r="38" fill="url(#gSnowDark)"/>
      <circle cx="28" cy="40" r="6" fill="#58607A"/><circle cx="70" cy="70" r="7" fill="#58607A"/><circle cx="74" cy="34" r="4" fill="#58607A"/><circle cx="30" cy="72" r="4" fill="#58607A"/>
      ${eyes(50, 12, 5)}
      <path d="M30 40 l14 6 M70 40 l-14 6" stroke="#1D2238" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M38 68 Q50 60 62 68" stroke="#1D2238" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    mini: `<ellipse cx="50" cy="80" rx="18" ry="5" fill="#0E1730" opacity=".3"/>
      <circle cx="50" cy="62" r="18" fill="url(#gSnow)"/>${eyes(60, 6, 3)}`,
    thrower: `<ellipse cx="50" cy="90" rx="24" ry="6" fill="#0E1730" opacity=".35"/>
      <path d="M28 88 Q28 58 50 56 Q72 58 72 88Z" fill="#8A4B2A"/>
      <path d="M28 88 Q28 70 36 64 L40 88Z M72 88 Q72 70 64 64 L60 88Z" fill="#6E3A20"/>
      <path d="M44 60 L50 76 L56 60Z" fill="#E7DCC5"/>
      <circle cx="50" cy="44" r="15" fill="#F2C9A0"/>
      <path d="M33 42 Q34 22 50 22 Q66 22 67 42Z" fill="#D9473A"/>
      <path d="M33 42 h34 v6 h-34z" fill="#F2E6D0"/>
      <circle cx="50" cy="19" r="6" fill="#F2E6D0"/>
      <circle cx="45" cy="50" r="2" fill="#2A1A12"/><circle cx="55" cy="50" r="2" fill="#2A1A12"/>
      <circle cx="78" cy="48" r="9" fill="url(#gSnow)"/><path d="M68 62 Q74 56 76 54" stroke="#6E3A20" stroke-width="7" stroke-linecap="round"/>`,
    catapult: `<ellipse cx="50" cy="90" rx="34" ry="6" fill="#0E1730" opacity=".35"/>
      <rect x="18" y="72" width="64" height="10" rx="4" fill="#7A4A26"/>
      <circle cx="28" cy="84" r="7" fill="#4E2E16"/><circle cx="72" cy="84" r="7" fill="#4E2E16"/>
      <path d="M40 72 L50 50 L60 72" stroke="#7A4A26" stroke-width="7" fill="none" stroke-linejoin="round"/>
      <path d="M50 52 L24 26" stroke="#A86A3A" stroke-width="7" stroke-linecap="round"/>
      <path d="M14 20 Q22 36 34 24 Z" fill="#A86A3A"/>
      <circle cx="22" cy="20" r="11" fill="url(#gSnow)"/>`,
    wall: `<ellipse cx="50" cy="90" rx="38" ry="6" fill="#0E1730" opacity=".35"/>
      <path d="M14 86 L18 34 L50 22 L84 34 L86 86Z" fill="url(#gIce)"/>
      <path d="M18 34 L50 46 L84 34 M50 46 L50 86 M18 60 L50 66 L86 60" stroke="#E6FAFF" stroke-width="2.5" fill="none" opacity=".7"/>
      <path d="M24 40 L30 70" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round"/>`,
    brazier: `<ellipse cx="50" cy="91" rx="26" ry="6" fill="#0E1730" opacity=".35"/>
      <circle cx="50" cy="58" r="34" fill="url(#gGlow)"/>
      <path d="M36 92 L42 74 M64 92 L58 74" stroke="#3A3A48" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 58 Q50 92 76 58Z" fill="#454556"/><path d="M24 58 h52" stroke="#6B6B80" stroke-width="5" stroke-linecap="round"/>
      <g class="sp-flame"><path d="M50 18 C62 32 66 44 60 56 L40 56 C34 44 40 34 46 30 C46 38 50 40 50 18Z" fill="#FF8A3D"/>
      <path d="M50 34 C56 42 58 50 54 56 L46 56 C42 50 46 44 50 34Z" fill="#FFD25A"/></g>`,
    trap: `<ellipse cx="50" cy="84" rx="30" ry="6" fill="#0E1730" opacity=".3"/>
      <path d="M22 84 L30 44 L36 84Z M40 84 L50 30 L60 84Z M64 84 L70 50 L78 84Z" fill="url(#gIce)" stroke="#E6FAFF" stroke-width="2" stroke-linejoin="round"/>
      <path d="M48 42 L46 70" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>`,
    shovel: `<path d="M64 14 L70 20 L44 58" stroke="#8A5A32" stroke-width="7" stroke-linecap="round"/>
      <path d="M58 10 h18" stroke="#5A3A20" stroke-width="7" stroke-linecap="round" transform="rotate(45 67 14)"/>
      <path d="M44 52 L58 66 L36 90 Q24 92 18 86 Q12 80 14 68Z" fill="#9DB3CF" stroke="#E6F0FF" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="74" cy="76" r="9" fill="url(#gSnow)"/><circle cx="84" cy="62" r="5" fill="url(#gSnow)"/>`,
    gust: `<path d="M14 70 Q40 70 52 56 Q62 44 52 36 Q42 30 38 42" stroke="#CFF2FF" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M14 54 Q30 54 38 48" stroke="#8FD3F4" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M20 86 Q56 86 72 70 Q86 54 76 42 Q66 34 60 46" stroke="#8FD3F4" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M70 22 l0 14 M63 29 l14 0 M65 24 l10 10 M75 24 l-10 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  };

  const DEFS = `<defs>
    <radialGradient id="gSnow" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".65" stop-color="#E4EDFA"/><stop offset="1" stop-color="#A9BEDF"/></radialGradient>
    <radialGradient id="gSnowDark" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#F3F6FC"/><stop offset=".6" stop-color="#C9D4E8"/><stop offset="1" stop-color="#8091B5"/></radialGradient>
    <linearGradient id="gWisp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9FBFF"/><stop offset="1" stop-color="#6FC4EE"/></linearGradient>
    <linearGradient id="gIce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D8F6FF"/><stop offset=".55" stop-color="#8FD3F4"/><stop offset="1" stop-color="#4E9BCB"/></linearGradient>
    <radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB25A" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></radialGradient>
  </defs>`;

  function sprite(id, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 100 100" aria-hidden="true">${ART[id] || ''}</svg>`;
  }

  const ICONS = {
    log: '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="2" y="5" width="32" height="14" rx="7" fill="#A8683A"/><ellipse cx="33" cy="12" rx="6" ry="7" fill="#E9B67F"/><ellipse cx="33" cy="12" rx="3" ry="3.5" fill="none" stroke="#A8683A" stroke-width="1.5"/><path d="M8 9 h14 M10 15 h12" stroke="#7A4524" stroke-width="1.6" stroke-linecap="round"/></svg>',
    lantern: '<svg viewBox="0 0 30 40" aria-hidden="true"><path d="M15 1 v5" stroke="#5A4A3A" stroke-width="2"/><rect x="9" y="6" width="12" height="4" rx="1.5" fill="#3B3346"/><path d="M7 12 Q15 7 23 12 L23 30 Q15 35 7 30Z" class="lan-body"/><rect x="9" y="31" width="12" height="4" rx="1.5" fill="#3B3346"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 19 L9 7 L13 13 L16 9 L22 19Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10.5 L9 7 L11 10.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    snow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wait: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  root.Art = { ART, DEFS, sprite, ICONS };
})(typeof window !== 'undefined' ? window : globalThis);
