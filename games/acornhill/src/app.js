// 도토리 언덕 화면. 규칙은 logic.js, 3D 무대는 scene.js.
// 약속: 1) localStorage는 try/catch 2) window.appFlush는 가려질 때 저장 3) window.appBack은 열린 창을 닫고 true
// 4) #shot=번호면 대표 화면 5) window.appDemo()는 저장을 건드리지 않고 스스로 언덕을 걷는다 6) 소리는 Sfx, 소리 끄기 단추
(function () {
  const KEY = 'acornhill-v1';
  const NAV = navigator.language || 'ko';
  const LANG = /^ko/i.test(NAV) ? 'ko' : /^ja/i.test(NAV) ? 'ja' : 'en';
  const ko = LANG === 'ko';
  const JA = {
    hill: (n) => `丘 ${n}`, today: '今日の丘', score: 'スコア', streak: (n) => `${n}連続`, draw: 'めくる', help: 'ヒント',
    coach: 'カゴの一番上より1つ大きいか小さいカードをタップ! 13の次は1です',
    armed: 'どんぐりを投げるカードを選んでください。数字に関係なく取れます',
    noMove: '取れるカードがありません。山札をめくりましょう', covered: '上に別のカードが重なっています', mismatch: (a) => `カゴのカード ${a} の1つ上か下だけつながります`,
    won: '丘をすべて片づけました!', lost: '山札がなくなりました', leftStock: (n) => `残りの山札 ${n}枚`, bonus: '仕上げボーナス', got: (n) => `どんぐり +${n}`,
    next: '次の丘', retry: 'この丘をもう一度', menu: 'メニュー', storeTitle: 'リスの冬の倉庫', mapTitle: '丘の地図', todayBtn: '今日の丘を歩く',
    todayDone: (s) => `今日の記録 ${s}点`, todayNew: 'まだ遊んでいません', acorns: (n) => `集めたどんぐり ${n}`, nextItem: (n, name) => `${name}まであと${n}個`, allItems: '倉庫がいっぱいになりました',
    rank: '🏆 ランキング', close: '閉じる', how: '遊び方', howLines: ['上に何も重なっていない(表向きの)カードだけ取れます。', 'カゴのカードと数字が1つ違いなら取れます。13と1はつながります。', '続けて取るほど得点が上がり、山札をめくると連続が途切れます。', 'どんぐりのヒントは1回の丘につき1度、表のカードをどれでも取れます。', '山札を多く残して勝つと星が増えます。'],
    best: (n) => `最高 ${n}点`, sound: 'サウンド', locked: 'まだ', stars: '星', perfect: 'パーフェクト!', wins: (n) => `勝った回数 ${n}`,
    dateFmt: (d) => `${d.getMonth() + 1}月${d.getDate()}日`, endless: '無限モード。60の丘を越えても丘は続きます', bestChain: '最長連続',
  };
  const L = LANG === 'ja' ? JA : ko ? {
    hill: (n) => `언덕 ${n}`, today: '오늘의 언덕', score: '점수', streak: (n) => `${n}연속`, draw: '뒤집기', help: '도움',
    coach: '바구니 맨 위 패보다 1 크거나 작은 패를 톡! 13 다음은 1이에요',
    armed: '도토리를 던질 패를 고르세요. 숫자와 상관없이 걷어 냅니다',
    noMove: '걷을 패가 없어요. 더미를 뒤집으세요', covered: '위에 다른 패가 덮여 있어요', mismatch: (a) => `바구니 패 ${a}에서 하나 위나 아래만 이어져요`,
    won: '언덕을 다 걷었어요!', lost: '더미가 바닥났어요', leftStock: (n) => `남은 더미 ${n}장`, bonus: '마무리 보너스', got: (n) => `도토리 +${n}`,
    next: '다음 언덕', retry: '이 언덕 다시', menu: '메뉴', storeTitle: '다람쥐 겨울 창고', mapTitle: '언덕 지도', todayBtn: '오늘의 언덕 걷기',
    todayDone: (s) => `오늘 기록 ${s}점`, todayNew: '아직 걷지 않았어요', acorns: (n) => `모은 도토리 ${n}`, nextItem: (n, name) => `${name}까지 ${n}개`, allItems: '창고가 가득 찼어요',
    rank: '🏆 전국 랭킹', close: '닫기', how: '걷는 법', howLines: ['위가 빈(앞면이 보이는) 패만 걷을 수 있어요.', '바구니 패와 숫자가 하나 차이면 걷혀요. 13과 1은 이어져요.', '이어서 걷을수록 점수가 커지고, 더미를 뒤집으면 연속이 끊겨요.', '도토리 도움은 한 판에 한 번, 아무 빈 패나 걷어요.', '더미를 많이 남기고 이기면 별이 늘어요.'],
    best: (n) => `최고 ${n}점`, sound: '소리', locked: '아직', stars: '별', perfect: '완벽!', wins: (n) => `이긴 판 ${n}`,
    dateFmt: (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`, endless: '무한 모드예요. 60언덕을 넘어도 언덕은 계속 이어져요',
  } : {
    hill: (n) => `Hill ${n}`, today: "Today's Hill", score: 'Score', streak: (n) => `${n} chain`, draw: 'Flip', help: 'Help',
    coach: 'Tap a card one higher or lower than the basket card. 13 wraps to 1',
    armed: 'Pick a card for the acorn. It clears any open card',
    noMove: 'No match. Flip the stock', covered: 'Another card is on top of it', mismatch: (a) => `Only one above or below ${a} fits`,
    won: 'Hill cleared!', lost: 'Out of stock cards', leftStock: (n) => `${n} stock cards left`, bonus: 'Finish bonus', got: (n) => `+${n} acorns`,
    next: 'Next hill', retry: 'Retry hill', menu: 'Menu', storeTitle: "Squirrel's Winter Store", mapTitle: 'Hill Map', todayBtn: "Play today's hill",
    todayDone: (s) => `Today: ${s} pts`, todayNew: 'Not played yet', acorns: (n) => `${n} acorns saved`, nextItem: (n, name) => `${n} to ${name}`, allItems: 'The store is full',
    rank: '🏆 Leaderboard', close: 'Close', how: 'How to play', howLines: ['Only face-up cards with nothing on top can be taken.', 'Take a card one above or below the basket card. 13 and 1 connect.', 'Chains score more. Flipping the stock breaks the chain.', 'The acorn help clears any open card, once per hill.', 'Win with more stock left to earn more stars.'],
    best: (n) => `Best ${n}`, sound: 'Sound', locked: 'Locked', stars: 'Stars', perfect: 'Perfect!', wins: (n) => `${n} wins`,
    dateFmt: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), endless: 'Endless mode. Past 60 hills, the hills keep going',
  };
  document.documentElement.lang = LANG;
  // 2026-11-25 가게·강화·출석·특수 패·이어하기 문구
  const X = LANG === 'ja' ? {
    undo: '戻す', shop: 'リスのお店', wallet: (n) => `お財布のどんぐり ${n}`, owned: '所持', equip: '使う', using: '使用中', max: '最大', lv: (n) => `Lv.${n}`,
    items: { wild: ['どんぐりヒント', '表のカードをどれでも取れます'], undo: ['戻す', '直前の一手を取り消します'] },
    adWild: (n, m) => `📺 広告を見てヒントをもらう (${n}/${m})`, adWildDone: '今日の無料ヒントは終わりました',
    upTitle: 'リスの強化', up: { pouch: ['どんぐり袋', '丘ごとのヒント +1'], finish: ['仕上げの腕前', '勝つとどんぐり +3'], gather: ['どんぐり拾い', 'すべてのどんぐり +10%(上限なし)'] },
    backTitle: 'カードの裏面', backs: { oak: 'どんぐり', maple: 'もみじ', moon: '月夜', snow: '初雪', gold: '黄金' },
    houseTitle: 'リスの冬の家', nextIn: (n, name) => `次は ${name} まで ${n}個`,
    contTitle: '山札がなくなりました', contSub: (a, b) => `${b}枚中${a}枚を片づけました`, contAd: '📺 広告を見て続ける', contAcorn: (c) => `🌰 ${c}個で続ける`, contWild: (n) => `どんぐりヒントを使う(所持 ${n})`, contMore: '山札 +5枚', giveUp: 'やめる',
    double: (n) => `📺 広告を見てどんぐり2倍 (+${n})`, doubled: 'どんぐり2倍!', adFail: '広告を読み込めませんでした。少し後でもう一度どうぞ',
    locked: '鍵のかかったカードです。🔑 鍵のカードを先に取ると開きます', unlocked: '🔓 鍵が開きました!', gold: (n) => `+${n} 🌰`,
    attend: (d, a) => `📅 連続${d}日目! どんぐり +${a}`, attendWild: (w) => ` · ヒント +${w}`, streak: (d) => `連続 ${d}日`, attendNext: (a) => `今日の丘を終えると出席ボーナス 🌰${a}`,
    noUndo: '戻せる手がありません', poor: (n) => `どんぐりが${n}個たりません`, bought: '買いました!',
    helpLines: ['🌟 金のカードを取るとどんぐりが10個増えます。', '🔒 鍵のカードは 🔑 のカードを取ると開きます。', 'リスのお店でヒント・戻す・強化・カードの裏面を買えます。'],
  } : ko ? {
    undo: '되돌리기', shop: '다람쥐 가게', wallet: (n) => `지갑 도토리 ${n}`, owned: '보유', equip: '쓰기', using: '쓰는 중', max: '최대', lv: (n) => `Lv.${n}`,
    items: { wild: ['도토리 도움', '아무 빈 패나 걷어요'], undo: ['되돌리기', '방금 한 수를 물러요'] },
    adWild: (n, m) => `📺 광고 보고 도움 받기 (${n}/${m})`, adWildDone: '오늘 무료 도움은 다 받았어요',
    upTitle: '다람쥐 강화', up: { pouch: ['도토리 주머니', '판마다 도움 +1'], finish: ['마무리 솜씨', '이기면 도토리 +3'], gather: ['도토리 줍기', '모든 도토리 +10% (끝없이)'] },
    backTitle: '패 뒷면', backs: { oak: '참나무', maple: '단풍', moon: '달밤', snow: '첫눈', gold: '황금' },
    houseTitle: '다람쥐 겨울 집', nextIn: (n, name) => `다음은 ${name}까지 ${n}개`,
    contTitle: '더미가 바닥났어요', contSub: (a, b) => `${b}장 중 ${a}장을 걷었어요`, contAd: '📺 광고 보고 이어하기', contAcorn: (c) => `🌰 ${c}개로 이어하기`, contWild: (n) => `도토리 도움 쓰기 (보유 ${n})`, contMore: '더미 +5장', giveUp: '그만하기',
    double: (n) => `📺 광고 보고 도토리 2배 (+${n})`, doubled: '도토리 2배 받았어요!', adFail: '광고를 불러오지 못했어요. 잠시 뒤에 다시 해 주세요',
    locked: '자물쇠 패예요. 🔑 열쇠 패를 먼저 걷으면 열려요', unlocked: '🔓 자물쇠가 열렸어요!', gold: (n) => `+${n} 🌰`,
    attend: (d, a) => `📅 연속 출석 ${d}일째! 도토리 +${a}`, attendWild: (w) => ` · 도움 +${w}`, streak: (d) => `연속 ${d}일`, attendNext: (a) => `오늘의 언덕을 끝내면 출석 보상 🌰${a}`,
    noUndo: '되돌릴 수가 없어요', poor: (n) => `도토리가 ${n}개 모자라요`, bought: '샀어요!',
    helpLines: ['🌟 황금 패를 걷으면 도토리 10개를 더 받아요.', '🔒 자물쇠 패는 🔑 열쇠 패를 걷어야 열려요.', '다람쥐 가게에서 도토리로 도움·되돌리기·강화·패 뒷면을 살 수 있어요.'],
  } : {
    undo: 'Undo', shop: 'Squirrel Shop', wallet: (n) => `${n} acorns to spend`, owned: 'Own', equip: 'Use', using: 'In use', max: 'Max', lv: (n) => `Lv.${n}`,
    items: { wild: ['Acorn help', 'Clears any open card'], undo: ['Undo', 'Takes back your last move'] },
    adWild: (n, m) => `📺 Watch an ad for a help (${n}/${m})`, adWildDone: 'No more free helps today',
    upTitle: 'Squirrel Upgrades', up: { pouch: ['Acorn pouch', '+1 help every hill'], finish: ['Finishing touch', '+3 acorns on a win'], gather: ['Acorn gathering', '+10% all acorns (no limit)'] },
    backTitle: 'Card backs', backs: { oak: 'Oak', maple: 'Maple', moon: 'Moonlit', snow: 'First snow', gold: 'Golden' },
    houseTitle: "Squirrel's Winter House", nextIn: (n, name) => `${n} more to ${name}`,
    contTitle: 'Out of stock cards', contSub: (a, b) => `You cleared ${a} of ${b} cards`, contAd: '📺 Watch an ad to continue', contAcorn: (c) => `🌰 Continue for ${c}`, contWild: (n) => `Use an acorn help (own ${n})`, contMore: '+5 stock cards', giveUp: 'Give up',
    double: (n) => `📺 Watch an ad: double acorns (+${n})`, doubled: 'Acorns doubled!', adFail: "Couldn't load an ad. Please try again shortly",
    locked: 'This card is locked. Clear the 🔑 key card first', unlocked: '🔓 Unlocked!', gold: (n) => `+${n} 🌰`,
    attend: (d, a) => `📅 Day ${d} streak! +${a} acorns`, attendWild: (w) => ` · +${w} help`, streak: (d) => `${d}-day streak`, attendNext: (a) => `Finish today's hill for a 🌰${a} streak bonus`,
    noUndo: 'Nothing to undo', poor: (n) => `${n} more acorns needed`, bought: 'Bought!',
    helpLines: ['🌟 Golden cards give 10 extra acorns.', '🔒 Locked cards open once you clear the 🔑 key card.', 'Spend acorns in the Squirrel Shop on helps, undos, upgrades and card backs.'],
  };

  // 2026-11-26 게임 방법 안내(처음 켤 때 자동으로, 그 뒤로는 ? 단추와 메뉴에서). 장마다 그림 한 줄 + 설명.
  const H = LANG === 'ja' ? {
    title: '遊び方', prev: '前へ', next: '次へ', start: 'はじめる', skip: 'とばす', menuBtn: '📖 遊び方を見る',
    pages: [
      { t: 'カゴにつなげて丘を片づけよう', fig: 'match', lines: ['丘のカードを全部カゴに入れたら勝ちです。', 'カゴの一番上のカードより<b>1つ大きいか小さい</b>カードをタップします。', '<b>13と1</b>もつながります(13 → 1、1 → 13)。'] },
      { t: '表のカードだけ取れます', fig: 'cover', lines: ['上に何も重なっていないカードだけ表向きで、取ることができます。', '上のカードを取ると、下のカードがめくれて開きます。', '続けて取るほど<b>連続</b>が伸びて得点が大きくなります。'] },
      { t: '取れないときは山札をめくる', fig: 'stock', lines: ['つながるカードがないときは左下の<b>めくる</b>を押します。', '山札の1枚がカゴの一番上にのり、新しい数字から続けられます。連続は途切れます。', '山札がなくなって取れるカードもなければ負けです。山札を多く残して勝つほど★が増えます。'] },
      { t: 'どんぐりの助け', fig: 'tools', lines: ['🌰 <b>ヒント</b>: 押してから表のカードを選ぶと、数字に関係なく取れます。', '↩ <b>戻す</b>: 直前の一手を取り消します。', '🌟 金のカードはどんぐり+10、🔒 鍵のカードは 🔑 のカードを先に取ると開きます。', '集めたどんぐりはメニューのリスのお店で使えます。'] },
    ],
  } : ko ? {
    title: '게임 방법', prev: '이전', next: '다음', start: '시작하기', skip: '건너뛰기', menuBtn: '📖 게임 방법 보기',
    pages: [
      { t: '바구니에 이어서 언덕을 비워요', fig: 'match', lines: ['언덕 위의 패를 모두 바구니로 걷어 내면 이겨요.', '바구니 맨 위 패보다 숫자가 <b>1 크거나 1 작은</b> 패를 톡 누르세요.', '<b>13과 1</b>도 이어져요 (13 → 1, 1 → 13).'] },
      { t: '앞면이 보이는 패만 걷어요', fig: 'cover', lines: ['위에 다른 패가 겹쳐 있지 않은 패만 앞면이 보이고 걷을 수 있어요.', '위 패를 걷으면 아래 패가 뒤집혀 열려요.', '쉬지 않고 이어 걷을수록 <b>연속</b>이 늘고 점수가 커져요.'] },
      { t: '걷을 패가 없으면 더미를 뒤집어요', fig: 'stock', lines: ['이어지는 패가 없으면 왼쪽 아래 <b>뒤집기</b>를 누르세요.', '더미 한 장이 바구니 맨 위로 올라와 새 숫자로 이어 갈 수 있어요. 연속은 끊겨요.', '더미가 바닥나고 걷을 패도 없으면 져요. 더미를 많이 남기고 이길수록 ★이 늘어요.'] },
      { t: '도토리의 도움', fig: 'tools', lines: ['🌰 <b>도움</b>: 누른 뒤 앞면 패를 고르면 숫자와 상관없이 걷어요.', '↩ <b>되돌리기</b>: 방금 한 수를 물러요.', '🌟 황금 패는 도토리 +10, 🔒 자물쇠 패는 🔑 열쇠 패를 먼저 걷어야 열려요.', '모은 도토리는 메뉴의 다람쥐 가게에서 쓸 수 있어요.'] },
    ],
  } : {
    title: 'How to play', prev: 'Back', next: 'Next', start: 'Start', skip: 'Skip', menuBtn: '📖 How to play',
    pages: [
      { t: 'Clear the hill into the basket', fig: 'match', lines: ['Move every card on the hill into the basket to win.', 'Tap a card that is <b>one higher or one lower</b> than the top card in the basket.', '<b>13 and 1</b> connect too (13 → 1, 1 → 13).'] },
      { t: 'Only face-up cards can be taken', fig: 'cover', lines: ['A card is face up and free only when nothing is lying on top of it.', 'Take the cards on top and the card underneath flips open.', 'Keep taking cards without a break to grow your <b>chain</b> and score more.'] },
      { t: 'Stuck? Flip the stock', fig: 'stock', lines: ['When no card fits, press <b>Flip</b> at the bottom left.', 'One stock card lands on top of the basket, giving you a new number. Your chain resets.', 'If the stock runs out and nothing fits, the hill is lost. Win with more stock left for more ★.'] },
      { t: 'Acorn helpers', fig: 'tools', lines: ['🌰 <b>Help</b>: press it, then pick any face-up card to take it whatever the number.', '↩ <b>Undo</b>: take back your last move.', '🌟 Golden cards give +10 acorns. 🔒 Locked cards open after you take the 🔑 key card.', 'Spend acorns in the Squirrel Shop from the menu.'] },
    ],
  };
  const HOW_KEY = 'acornhill-how-v1';

  const shotN = Number((location.hash.match(/shot=(\d+)/) || [])[1]) || 0;
  const shotMode = shotN > 0;
  if (shotMode) document.body.classList.add('shot');

  // ---------- 저장 ----------
  let save = Logic.newSave();
  if (!shotMode) {
    try { save = Logic.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { save = Logic.newSave(); }
  }
  let demo = false;
  const writeSave = () => {
    if (demo || shotMode) return;
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 저장이 막혀도 게임은 이어진다. */ }
  };

  // ---------- 소리 ----------
  Sfx.define('card', (c, out, t, o) => {
    Sfx.noise(c, out, t, { filterType: 'highpass', freq: 2600, dur: 0.05, vol: 0.22 * (o.vol ?? 1) });
    Sfx.tone(c, out, t, { type: 'triangle', freq: 340 * (o.pitch ?? 1), to: 220, dur: 0.07, vol: 0.12 });
  });
  Sfx.define('chime', (c, out, t, o) => {
    const f = 587 * (o.pitch ?? 1);
    Sfx.tone(c, out, t, { type: 'triangle', freq: f, dur: 0.28, vol: 0.16 });
    Sfx.tone(c, out, t, { type: 'sine', freq: f * 2, dur: 0.18, vol: 0.06 });
    Sfx.tone(c, out, t + 0.05, { type: 'sine', freq: f * 1.5, dur: 0.2, vol: 0.05 });
  });
  Sfx.define('knock', (c, out, t, o) => {
    Sfx.tone(c, out, t, { type: 'triangle', freq: 260 * (o.pitch ?? 1), to: 150, dur: 0.09, vol: 0.28 });
    Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 900, q: 3, dur: 0.06, vol: 0.18 });
  });
  Sfx.define('rustle', (c, out, t) => Sfx.noise(c, out, t, { filterType: 'bandpass', freq: 1800, to: 700, q: 0.8, dur: 0.28, vol: 0.2, attack: 0.05 }));
  const MUSIC = { bpm: 86, mood: 'calm', seed: 11 };
  let musicOn = false;
  const startMusic = () => { if (!musicOn) { musicOn = true; Sfx.music(MUSIC); } };

  // ---------- 화면 뼈대 ----------
  const app = document.getElementById('app');
  const world = HillScene.build(app);
  const ui = document.createElement('div');
  ui.className = 'ui';
  ui.innerHTML = `
    <header class="hud">
      <div class="sign"><small></small><b></b><span class="pips"></span></div>
      <div class="tally"><b class="score">0</b><span class="chain"></span></div>
      <div class="tools">
        <button class="round mute" aria-label="${L.sound}"></button>
        <button class="round menu-btn" aria-label="${L.menu}"><i></i><i></i><i></i></button>
      </div>
    </header>
    <button class="round how-btn" aria-label="${H.title}">?</button>
    <div class="coach" hidden></div>
    <div class="pops"></div>
    <footer class="dock">
      <button class="flip"><span class="deck"><i></i><i></i><i></i></span><b>${L.draw}</b><em class="left">0</em></button>
      <button class="undo"><span class="ico">↩</span><b>${X.undo}</b><em class="cnt">0</em></button>
      <button class="help"><span class="nut"></span><b>${L.help}</b><em class="wild">1</em></button>
    </footer>
    <section class="sheet result" hidden></section>
    <section class="sheet panel" hidden></section>
    <section class="sheet guide" hidden></section>`;
  app.append(ui);
  const $ = (sel) => ui.querySelector(sel);
  const signSmall = $('.sign small');
  const signBig = $('.sign b');
  const pips = $('.pips');
  const scoreEl = $('.score');
  const chainEl = $('.chain');
  const coach = $('.coach');
  const pops = $('.pops');
  const flipBtn = $('.flip');
  const helpBtn = $('.help');
  const undoBtn = $('.undo');
  const resultSheet = $('.result');
  const panel = $('.panel');
  const muteBtn = $('.mute');

  // 메뉴가 화면을 덮고 있을 때는 뒤의 3D를 다시 그리지 않는다(마지막 장면이 그대로 남는다). 배터리와 느린 기기를 위해.
  const render3D = world.stage.render;
  world.stage.render = () => { if (!panel.hidden && !shotMode) return; render3D(); };

  const paintMute = () => { muteBtn.textContent = Sfx.muted ? '🔇' : '🔊'; muteBtn.classList.toggle('off', Sfx.muted); };
  muteBtn.addEventListener('click', () => { Sfx.setMuted(!Sfx.muted); if (!Sfx.muted) { musicOn = false; startMusic(); } Sfx.play('tap'); paintMute(); });
  paintMute();

  // ---------- 판 ----------
  let state = null;
  let armed = false;
  let ended = false;
  let hint = '';
  let hist = []; // 되돌리기용 이전 상태들(저장하지 않는다)
  let declined = false; // 이어하기 대신 그만하기를 고른 판
  let adCont = false; // 이 판에서 광고 이어하기를 썼는지
  let lastResult = null;
  const pushHist = () => { hist.push(state); if (hist.length > 60) hist.shift(); };

  function makeRound(mode, key) {
    const wild = demo ? 1 : Logic.startWild(save);
    if (mode === 'day') {
      const d = Logic.dailyHill(key);
      const { deal, seed } = Logic.solvableDeal(d.seed, d.layout, d.spec);
      return Logic.freshRound(deal, { mode: 'day', key, seed, wild });
    }
    const h = Logic.mapHill(key);
    const { deal, seed } = Logic.solvableDeal(h.seed, h.layout, h.spec);
    return Logic.freshRound(deal, { mode: 'map', key: h.n, seed, wild });
  }
  // 처음 상태로 되돌린 판(이어하기로 섞인 더미도 처음 순서로). 다시 하기에 쓴다.
  function dealOf(s) {
    const d = { layout: s.layout, cards: s.cards, stock: s.stock, start: s.pile[0], gold: s.gold, lock: s.lock };
    if (s.cont > 0) {
      const fresh = s.mode === 'day' ? Logic.dailyHill(s.key) : Logic.mapHill(s.key);
      const again = Logic.dealFromSeed(s.seed, fresh.layout, fresh.spec);
      if (again.layout === s.layout && again.cards.every((c, i) => c === s.cards[i])) return again;
    }
    return d;
  }

  // ---------- 보상형 광고(AndroidAds.showRewarded, iOS도 같은 이름) ----------
  function rewardReady() {
    try {
      const A = window.AndroidAds;
      if (!A || typeof A.showRewarded !== 'function') return false;
      return typeof A.rewardedReady === 'function' ? Boolean(A.rewardedReady()) : true;
    } catch { return false; }
  }
  let adWaiting = false;
  function showReward(cb) {
    if (adWaiting) return;
    if (!rewardReady()) { cb(false); return; }
    adWaiting = true;
    window.__tiertopOnReward = (ok) => {
      window.__tiertopOnReward = null;
      adWaiting = false;
      cb(Boolean(ok));
    };
    try { window.appFlush && window.appFlush(); window.AndroidAds.showRewarded(); } catch { window.__tiertopOnReward = null; adWaiting = false; cb(false); }
  }
  const backURL = {};
  function backImage(id) {
    if (!backURL[id]) { try { backURL[id] = HillScene.cardBack(id).image.toDataURL(); } catch { backURL[id] = ''; } }
    return backURL[id];
  }
  const todayKey = () => Logic.dayKey(new Date());

  function begin(round, instant) {
    state = round;
    armed = false;
    ended = false;
    hint = '';
    hist = [];
    declined = false;
    adCont = false;
    resultSheet.hidden = true;
    world.layout(state, instant);
    world.snapCamera();
    world.squirrel.look(-0.5);
    if (!demo) { save.round = state; writeSave(); }
    paint();
    const st = Logic.status(state);
    if (st !== 'play' && !shotMode) { ended = true; paint(); setTimeout(() => finishRound(st), 700); }
  }
  function paint() {
    if (!state) return;
    if (state.mode === 'day') {
      signSmall.textContent = L.today;
      const [y, m, d] = String(state.key).split('-').map(Number);
      signBig.textContent = L.dateFmt(new Date(y, m - 1, d));
      pips.textContent = Logic.layout(state.layout)[LANG];
    } else {
      const h = Logic.mapHill(state.key);
      signSmall.textContent = `${L.hill(h.n + 1)} · ${Logic.layout(state.layout)[LANG]}`;
      signBig.textContent = h.name[LANG];
      const got = demo ? 0 : (save.stars[h.n] || 0);
      pips.innerHTML = [0, 1, 2].map((i) => `<i class="${i < got ? 'on' : ''}">★</i>`).join('');
    }
    scoreEl.textContent = String(state.score);
    chainEl.textContent = state.streak >= 2 ? L.streak(state.streak) : '';
    chainEl.classList.toggle('hot', state.streak >= 5);
    const left = Logic.stockLeft(state);
    flipBtn.querySelector('.left').textContent = String(left);
    flipBtn.disabled = left < 1 || ended;
    const stuck = Logic.status(state) === 'play' && Logic.playable(state).length === 0 && left > 0;
    flipBtn.classList.toggle('nudge', stuck && !armed);
    const inv = demo ? { wild: 0, undo: 0 } : save.inv;
    helpBtn.querySelector('.wild').textContent = state.wild > 0 ? String(state.wild) : inv.wild > 0 ? `${X.owned} ${inv.wild}` : `🌰${Logic.ITEMS.wild.price}`;
    // 가방에 없고 도토리도 모자라면 누를 수 없게 한다(가격은 단추에 보인다).
    const canGet = (id) => !demo && (inv[id] > 0 || Logic.wallet(save) >= Logic.ITEMS[id].price);
    helpBtn.disabled = ended || (state.wild < 1 && (!canGet('wild') || Logic.takeable(state).length === 0));
    undoBtn.querySelector('.cnt').textContent = inv.undo > 0 ? String(inv.undo) : `🌰${Logic.ITEMS.undo.price}`;
    undoBtn.disabled = ended || hist.length === 0 || !canGet('undo');
    helpBtn.classList.toggle('armed', armed);
    let tip = hint;
    if (!tip && armed) tip = L.armed;
    if (!tip && !demo && save.played === 0 && state.moves < 3 && state.mode === 'map') tip = L.coach;
    coach.hidden = !tip || !guide.hidden;
    coach.textContent = tip;
  }
  let hintTimer = 0;
  function say(text) {
    hint = text;
    paint();
    clearTimeout(hintTimer);
    if (!shotMode) hintTimer = setTimeout(() => { hint = ''; paint(); }, 1800);
  }
  function pop(text, at, cls = '') {
    const el = document.createElement('div');
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    pops.append(el);
    if (!shotMode) setTimeout(() => el.remove(), 1100);
    return el;
  }
  const rankLabel = (c) => String((c % 13) + 1);

  function afterMove() {
    if (!demo) { save.round = state; writeSave(); }
    paint();
    const st = Logic.status(state);
    if (st !== 'play' && !ended) {
      ended = true;
      paint();
      setTimeout(() => finishRound(st), st === 'won' ? 900 : 700);
    }
  }

  function takeSlot(i, viaWild) {
    const next = viaWild ? Logic.useWild(state, i) : Logic.play(state, i);
    if (!next) return false;
    const pos = world.slotWorld(i);
    const card = state.cards[i];
    pushHist();
    state = next;
    const wasGold = (state.gold || []).includes(i);
    const wasKey = Boolean(state.lock) && state.lock[1] === i;
    const go = () => {
      world.playCard(state, i, () => {
        Sfx.play('card', { pitch: 1 + Math.min(state.streak, 10) * 0.03 });
      });
      const gain = Logic.clearGain(state.streak);
      Sfx.play('chime', { pitch: 2 ** (Math.min(state.streak - 1, 12) / 12) });
      if (!demo && window.Haptics) Haptics.buzz(state.streak > 0 && state.streak % 5 === 0 ? 'good' : 'tick');
      Kit3D.burst(world.scene, pos, HillScene.SUIT_COLORS[Math.floor(card / 13)], { count: state.streak >= 5 ? 18 : 10, speed: 3.6, size: 0.13, life: 0.7 });
      const at = world.screenOf(pos);
      pop(`+${gain}`, at, state.streak >= 5 ? 'big' : '');
      if (state.streak >= 3) {
        pop(L.streak(state.streak), { x: at.x, y: at.y - 30 }, 'chain-pop');
        Kit3D.shake(world.stage, Math.min(0.22, 0.04 + state.streak * 0.012));
      }
      if (state.streak > 0 && state.streak % 5 === 0) { Sfx.play('power'); world.squirrel.hop(); }
      world.squirrel.look(pos.x > 1 ? -0.1 : -0.7);
      if (wasGold) {
        pop(X.gold(Logic.GOLD_ACORNS), { x: at.x, y: at.y - 60 }, 'big gold-pop');
        Sfx.play('power');
        Kit3D.burst(world.scene, pos, '#f2b33d', { count: 22, speed: 4.5, size: 0.15, life: 0.9 });
      }
      if (wasKey) { say(X.unlocked); Sfx.play('power'); }
      afterMove();
    };
    if (viaWild) {
      armed = false;
      Sfx.play('jump');
      world.squirrel.throwTo(pos, () => { Sfx.play('knock'); Kit3D.burst(world.scene, pos, '#b8732f', { count: 12, speed: 3, size: 0.12 }); go(); });
      paint();
    } else go();
    return true;
  }
  function doDraw() {
    const next = Logic.draw(state);
    if (!next) { Sfx.play('error'); return false; }
    const hadStreak = state.streak;
    pushHist();
    state = next;
    armed = false;
    Sfx.play('whoosh', { pitch: 1.4, vol: 0.6 });
    world.drawCard(state, () => Sfx.play('card', { pitch: 0.9 }));
    if (hadStreak >= 3) pop(L.streak(hadStreak), world.screenOf(world.pilePos()), 'chain-end');
    afterMove();
    return true;
  }

  function tapAt(x, y) {
    if (!state || ended || demo) return;
    startMusic();
    const hit = world.slotAt(x, y, state);
    if (hit.kind === 'stock') { doDraw(); return; }
    if (hit.kind !== 'slot') return;
    const i = hit.i;
    if (!Logic.isFree(state, i)) {
      world.nudge(i);
      Sfx.play('error', { vol: 0.6 });
      say(L.covered);
      return;
    }
    if (Logic.isLocked(state, i)) {
      world.nudge(i);
      Sfx.play('error', { vol: 0.6 });
      say(X.locked);
      return;
    }
    if (armed) { takeSlot(i, true); return; }
    if (!takeSlot(i, false)) {
      world.nudge(i);
      world.squirrel.shake();
      Sfx.play('error', { vol: 0.6 });
      say(Logic.playable(state).length ? L.mismatch(rankLabel(Logic.top(state))) : L.noMove);
    }
  }
  let downAt = null;
  world.stage.canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  world.stage.canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved < 24) tapAt(e.clientX, e.clientY);
  });
  flipBtn.addEventListener('click', () => { if (!state || ended || demo) return; startMusic(); doDraw(); });
  // 도토리 가방에서 하나 꺼낸다. 없으면 지갑 도토리로 사서 바로 꺼낸다. 성공하면 true.
  function useItem(id) {
    if (save.inv[id] < 1) {
      const b = Logic.buy(save, 'item', id);
      if (!b) { Sfx.play('error'); say(X.poor(Logic.ITEMS[id].price - Logic.wallet(save))); return false; }
      save = b;
    }
    save.inv[id] -= 1;
    writeSave();
    return true;
  }
  helpBtn.addEventListener('click', () => {
    if (!state || ended || demo) return;
    if (state.wild < 1) {
      if (Logic.takeable(state).length === 0 || !useItem('wild')) return;
      state = { ...state, wild: state.wild + 1 };
      save.round = state;
      writeSave();
    }
    startMusic();
    armed = !armed;
    Sfx.play(armed ? 'select' : 'back');
    if (armed) world.squirrel.hop();
    paint();
  });

  undoBtn.addEventListener('click', () => {
    if (!state || ended || demo) return;
    if (!hist.length) { say(X.noUndo); return; }
    if (!useItem('undo')) return;
    startMusic();
    state = hist.pop();
    armed = false;
    world.layout(state, true);
    Sfx.play('back');
    world.squirrel.hop();
    save.round = state;
    writeSave();
    paint();
  });

  // ---------- 이어하기(진 판) ----------
  function resume(next) {
    state = next;
    hist = [];
    ended = false;
    armed = false;
    resultSheet.hidden = true;
    world.layout(state, true);
    Sfx.play('whoosh', { pitch: 1.2 });
    world.squirrel.cheer();
    save.round = state;
    writeSave();
    paint();
  }
  function showContinue() {
    const revived = Logic.revive(state, 5);
    const cost = Logic.continueCost(state.cont);
    const wallet = Logic.wallet(save);
    const canWild = save.inv.wild > 0 && Logic.takeable(state).length > 0;
    const removed = state.removed.filter(Boolean).length;
    resultSheet.innerHTML = `
      <div class="card-sheet lost cont">
        <div class="ribbon">${X.contTitle}</div>
        <p class="goal-line">${X.contSub(removed, state.removed.length)}</p>
        <div class="col">
          ${revived && !adCont && rewardReady() ? `<button class="go primary" data-act="c-ad">${X.contAd}<small>${X.contMore}</small></button>` : ''}
          ${revived ? `<button class="go ${adCont || !rewardReady() ? 'primary' : ''}" data-act="c-acorn" ${wallet < cost ? 'disabled' : ''}>${X.contAcorn(cost)}<small>${X.contMore} · ${X.wallet(wallet)}</small></button>` : ''}
          ${canWild ? `<button class="go" data-act="c-wild">${X.contWild(save.inv.wild)}</button>` : ''}
        </div>
        <div class="row small"><button class="go ghost" data-act="c-quit">${X.giveUp}</button></div>
      </div>`;
    resultSheet.hidden = false;
  }
  const canContinue = () => Boolean(Logic.revive(state, 5)) || (save.inv.wild > 0 && Logic.takeable(state).length > 0);

  // ---------- 판 끝 ----------
  function finishRound(st) {
    if (st === 'lost' && !demo && !shotMode && !declined && canContinue()) { showContinue(); return; }
    realFinish(st);
  }
  function realFinish(st) {
    const before = save.acorns;
    const gained = Logic.acornsFrom(state, demo ? null : save);
    const prevAtt = save.att.last;
    const starCount = Logic.stars(state);
    const prevStars = state.mode === 'map' && !demo ? (save.stars[state.key] || 0) : 0;
    lastStars = { prev: prevStars, removed: state.removed.filter(Boolean).length, total: state.removed.length };
    if (!demo) { save = Logic.finish(save, state); writeSave(); }
    const attend = !demo && state.mode === 'day' && save.att.last === state.key && prevAtt !== state.key ? Logic.attendReward(save.att.days) : null;
    lastResult = { st, gained, starCount, before, attend, doubled: false, days: attend ? save.att.days : 0 };
    if (st === 'won') {
      Sfx.play('win');
      if (!demo && window.Haptics) Haptics.buzz('big');
      world.squirrel.cheer();
      const p = world.pilePos();
      [0, 1, 2].forEach((k) => setTimeout(() => Kit3D.burst(world.scene, p.clone().add(new THREE.Vector3((k - 1) * 1.4, 0.6, -1.5)), ['#f0b43c', '#cf452c', '#e8742a'][k], { count: 20, speed: 5, size: 0.16, life: 1.1 }), k * 160));
      Kit3D.shake(world.stage, 0.25);
    } else {
      Sfx.play('lose');
      world.squirrel.shake();
    }
    showResult(st, gained, starCount, before);
  }
  function extraLines() {
    if (!lastResult) return '';
    let out = '';
    const a = lastResult.attend;
    if (a) out += `<p class="goal-line up">${X.attend(lastResult.days, a.acorns)}${a.wild ? X.attendWild(a.wild) : ''}</p>`;
    if (lastResult.doubled) out += `<p class="goal-line up">${X.doubled}</p>`;
    else if (!demo && lastResult.gained > 0 && rewardReady()) out += `<div class="row"><button class="go gold" data-act="double">${X.double(lastResult.gained)}</button></div>`;
    return out;
  }
  // 결과 화면에 붙이는 말(이 사본에 없는 언어 문구를 따로 둔다).
  const MORE = ko ? {
    toStar: (need, next) => `더미를 ${need}장 더 남기면 ★${next}`, starUp: (a) => `⭐ 이 언덕 별 기록 갱신! (전에는 ${a}개)`, cleared: (a, b) => `${b}장 중 ${a}장을 걷었어요. 거의 다 왔어요!`,
  } : (typeof LANG !== 'undefined' && LANG === 'ja') ? {
    toStar: (need, next) => `山札をあと${need}枚残せば★${next}`, starUp: (a) => `⭐ この丘の星の記録を更新!(前は${a}個)`, cleared: (a, b) => `${b}枚中${a}枚を片づけました。あと少し!`,
  } : {
    toStar: (need, next) => `Leave ${need} more stock card${need === 1 ? '' : 's'} for ★${next}`, starUp: (a) => `⭐ New star record on this hill! (was ${a})`, cleared: (a, b) => `You cleared ${a} of ${b} cards. So close!`,
  };
  let lastStars = { prev: 0, removed: 0, total: 0 };
  function goalLines(st, starCount, left) {
    let out = '';
    if (st === 'won' && state.mode === 'map' && !demo && lastStars.prev > 0 && starCount > lastStars.prev) out += `<p class="goal-line up">${MORE.starUp(lastStars.prev)}</p>`;
    const ns = st === 'won' ? Logic.nextStarNeed(left) : null;
    if (ns) out += `<p class="goal-line">${MORE.toStar(ns.need, ns.next)}</p>`;
    if (st === 'lost' && lastStars.removed > 0) out += `<p class="goal-line">${MORE.cleared(lastStars.removed, lastStars.total)}</p>`;
    return out;
  }
  function showResult(st, gained, starCount, before) {
    const left = Logic.stockLeft(state);
    const total = demo ? before + gained : save.acorns;
    const nxt = Logic.nextItem(total);
    const prevItem = Logic.STORE.filter((it) => it.at <= total).pop();
    const from = prevItem ? prevItem.at : 0;
    const pct = nxt ? Math.round(((total - from) / (nxt.at - from)) * 100) : 100;
    const isMap = state.mode === 'map';
    const canNext = isMap && st === 'won';
    resultSheet.innerHTML = `
      <div class="card-sheet ${st}">
        <div class="ribbon">${st === 'won' ? L.won : L.lost}</div>
        ${st === 'won' ? `<div class="stars">${[0, 1, 2].map((i) => `<i class="${i < starCount ? 'on' : ''}" style="--d:${i * 0.15}s">★</i>`).join('')}</div>` : '<div class="sad"></div>'}
        <dl>
          <div><dt>${L.score}</dt><dd>${state.score}</dd></div>
          <div><dt>${LANG === 'ja' ? L.bestChain : ko ? '가장 긴 연속' : 'Best chain'}</dt><dd>${state.bestStreak}</dd></div>
          ${st === 'won' ? `<div><dt>${L.leftStock(left)}</dt><dd>+${Logic.winBonus(state)}</dd></div>` : ''}
        </dl>
        ${goalLines(st, starCount, left)}
        <div class="gain"><span class="nut"></span><b>${L.got(lastResult && lastResult.doubled ? gained * 2 : gained)}</b></div>
        ${extraLines()}
        <div class="progress"><i style="width:${pct}%"></i></div>
        <p class="next-item">${nxt ? L.nextItem(nxt.at - total, `${nxt.icon} ${nxt[LANG]}`) : L.allItems}</p>
        <div class="row">
          ${canNext ? `<button class="go primary" data-act="next">${L.next}</button>` : ''}
          <button class="go ${canNext ? '' : 'primary'}" data-act="retry">${L.retry}</button>
        </div>
        <div class="row small">
          <button class="go ghost" data-act="menu">${L.menu}</button>
          <button class="go ghost" data-rank-open>${L.rank}</button>
        </div>
      </div>`;
    resultSheet.hidden = false;
  }
  resultSheet.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || demo) return;
    Sfx.play('select');
    const act = b.dataset.act;
    if (act === 'c-ad') {
      showReward((ok) => {
        if (!ok) { say(X.adFail); return; }
        const r = Logic.revive(state, 5);
        if (r) { adCont = true; resume(r); }
      });
      return;
    }
    if (act === 'c-acorn') {
      const cost = Logic.continueCost(state.cont);
      const r = Logic.revive(state, 5);
      if (!r || Logic.wallet(save) < cost) return;
      save.spent += cost;
      resume(r);
      return;
    }
    if (act === 'c-wild') {
      if (save.inv.wild < 1) return;
      save.inv.wild -= 1;
      resume({ ...state, wild: state.wild + 1 });
      return;
    }
    if (act === 'c-quit') { declined = true; realFinish('lost'); return; }
    if (act === 'double') {
      showReward((ok) => {
        if (!ok) { say(X.adFail); return; }
        if (!lastResult || lastResult.doubled) return;
        lastResult.doubled = true;
        save.acorns += lastResult.gained;
        writeSave();
        Sfx.play('win');
        showResult(lastResult.st, lastResult.gained, lastResult.starCount, lastResult.before);
      });
      return;
    }
    // 전면 광고는 '다음/다시' 단추를 누를 때만(2배 보상을 봤으면 안 띄움). 결과 화면이 뜨는 순간·메뉴에서는 띄우지 않는다.
    if ((act === 'next' || act === 'retry') && !shotMode && !(lastResult && lastResult.doubled) && window.onestoreAd) window.onestoreAd.atBreak();
    if (act === 'next') begin(makeRound('map', Number(state.key) + 1));
    else if (act === 'retry') begin(Logic.freshRound(dealOf(state), { mode: state.mode, key: state.key, seed: state.seed, wild: Logic.startWild(save) }));
    else if (act === 'menu') openPanel();
  });

  // ---------- 메뉴(오늘의 언덕, 지도, 창고) ----------
  function openPanel(fakeToday) {
    const tk = fakeToday || todayKey();
    const today = save.daily[tk];
    const total = save.acorns;
    const nxt = Logic.nextItem(total);
    const open = Logic.unlocked(total);
    // 지도는 60언덕 묶음을 보여 준다. 60을 넘으면 지금 언덕이 든 열 개 묶음부터 60칸을 보여 준다.
    const N = Logic.BASE_STAGES;
    const first = save.hill < N ? 0 : Math.floor((save.hill - (N - 10)) / 10) * 10;
    const nodes = Array.from({ length: N }, (_, i) => {
      const k = first + i;
      const lockedNode = k > save.hill;
      const st = save.stars[k] || 0;
      const row = Math.floor(i / 6);
      const col = row % 2 ? 5 - (i % 6) : i % 6; // 굽이진 길
      return `<button class="node ${lockedNode ? 'locked' : ''} ${k === save.hill ? 'here' : ''}" style="grid-row:${row + 1};grid-column:${col + 1}" data-hill="${k}" ${lockedNode ? 'disabled' : ''}>
        <b>${k + 1}</b><span>${[0, 1, 2].map((j) => (j < st ? '★' : '·')).join('')}</span></button>`;
    }).join('');
    const keepScroll = !panel.hidden && panel.querySelector('.paper') ? panel.querySelector('.paper').scrollTop : 0;
    const att = save.att;
    const alive = att.last === tk || att.last === Logic.prevDayKey(tk);
    const attLine = att.last === tk ? X.streak(att.days) : X.attendNext(Logic.attendReward(alive ? att.days + 1 : 1).acorns) + (alive ? ` · ${X.streak(att.days)}` : '');
    const wallet = Logic.wallet(save);
    const buyBtn = (attr, price, can = true) => `<button class="buy" ${attr} ${!can || wallet < price ? 'disabled' : ''}>🌰${price}</button>`;
    const adToday = save.adWild.day === tk ? save.adWild.n : 0;
    const itemRows = Object.keys(Logic.ITEMS).map((id) => {
      const it = Logic.ITEMS[id];
      return `<div class="shop-row"><span class="ic">${it.icon}</span><div><b>${X.items[id][0]} <i>${X.owned} ${save.inv[id]}</i></b><small>${X.items[id][1]}</small></div>${buyBtn(`data-buy="item:${id}"`, it.price, save.inv[id] < it.max)}</div>`;
    }).join('');
    const adRow = rewardReady() || adToday > 0
      ? `<button class="go gold wide" data-act="adwild" ${adToday >= Logic.AD_WILD_PER_DAY || !rewardReady() ? 'disabled' : ''}>${adToday >= Logic.AD_WILD_PER_DAY ? X.adWildDone : X.adWild(adToday, Logic.AD_WILD_PER_DAY)}</button>` : '';
    const upRows = Object.keys(Logic.UPGRADES).map((id) => {
      const u = Logic.UPGRADES[id];
      const lv = Logic.upLevel(save, id);
      const cost = Logic.upCost(save, id);
      return `<div class="shop-row"><span class="ic">${u.icon}</span><div><b>${X.up[id][0]} <i>${X.lv(lv)}${u.max ? `/${u.max}` : ''}</i></b><small>${X.up[id][1]}</small></div>${cost === null ? `<span class="maxed">${X.max}</span>` : buyBtn(`data-buy="up:${id}"`, cost)}</div>`;
    }).join('');
    const backCells = Logic.BACKS.map((b) => {
      const own = save.backs.includes(b.id);
      const on = save.back === b.id;
      return `<button class="bk ${on ? 'on' : ''}" data-back="${b.id}" ${!own && wallet < b.price ? 'disabled' : ''}><img alt="" src="${backImage(b.id)}"><span>${X.backs[b.id]}</span><small>${on ? X.using : own ? X.equip : `🌰${b.price}`}</small></button>`;
    }).join('');
    const SPOTS = [[14, 74], [30, 80], [82, 52], [64, 44], [34, 34], [52, 82], [70, 80], [52, 30], [88, 76], [16, 40], [72, 16], [50, 4]];
    const house = Logic.STORE.map((it, i) => `<span class="hi ${i < open ? '' : 'off'}" style="left:${SPOTS[i][0]}%;top:${SPOTS[i][1]}%" title="${it[LANG]}">${it.icon}</span>`).join('');
    panel.innerHTML = `
      <div class="paper ${panel.hidden ? '' : 'still'}">
        <button class="round x" data-act="close" aria-label="${L.close}">✕</button>
        <div class="today">
          <div><small>${L.today}</small><b>${L.dateFmt(new Date())}</b><span>${today ? L.todayDone(today.score) + (today.won ? ' ✓' : '') : L.todayNew}</span><span class="att">📅 ${attLine}</span></div>
          <button class="go primary" data-act="today">${L.todayBtn}</button>
        </div>
        <h2>${X.shop}</h2>
        <div class="store-head"><span class="nut"></span><b>${X.wallet(wallet)}</b><small>${L.acorns(total)}</small></div>
        ${itemRows}
        ${adRow}
        <h2>${X.upTitle}</h2>
        ${upRows}
        <h2>${X.backTitle}</h2>
        <div class="backs">${backCells}</div>
        <h2>${X.houseTitle}</h2>
        <div class="house"><span class="roof"></span><span class="win"></span><span class="sq">🐿️</span>${house}</div>
        <p class="next-item">${nxt ? X.nextIn(nxt.at - total, `${nxt.icon} ${nxt[LANG]}`) : L.allItems}</p>
        <h2>${L.mapTitle}</h2>
        ${save.hill >= Logic.BASE_STAGES ? `<p class="note">${L.endless}</p>` : ''}
        <div class="map">${nodes}</div>
        <div class="row small"><span class="stat">${L.best(save.best)} · ${L.wins(save.wins)}</span><button class="go ghost" data-rank-open>${L.rank}</button></div>
        <div class="row small"><button class="go ghost wide" data-act="guide">${H.menuBtn}</button></div>
      </div>`;
    const wasOpen = !panel.hidden;
    panel.hidden = false;
    if (wasOpen) panel.querySelector('.paper').scrollTop = keepScroll;
    else Sfx.play('rustle');
    if (!hint) coach.hidden = true; // 첫 판 안내 쪽지가 메뉴를 가리지 않게
  }
  // 닫을 때 내용도 비운다(숨긴 메뉴의 그림·이모지가 남아 있을 필요가 없다).
  const hidePanel = () => { panel.hidden = true; panel.innerHTML = ''; };
  const closePanel = () => { hidePanel(); Sfx.play('back'); paint(); };
  $('.menu-btn').addEventListener('click', () => { if (demo) return; startMusic(); openPanel(); });
  panel.addEventListener('click', (e) => {
    if (e.target === panel) { closePanel(); return; }
    const b = e.target.closest('[data-act],[data-hill],[data-buy],[data-back]');
    if (!b || demo) return;
    if (b.dataset.act === 'close') { closePanel(); return; }
    if (b.dataset.act === 'guide') { hidePanel(); Sfx.play('select'); openGuide(); return; }
    if (b.dataset.buy) {
      const [kind, id] = b.dataset.buy.split(':');
      const next = Logic.buy(save, kind, id);
      if (!next) { Sfx.play('error'); return; }
      save = next;
      if (state && !ended && kind === 'up' && id === 'pouch') save.round = state;
      writeSave();
      Sfx.play('power');
      openPanel();
      paint();
      return;
    }
    if (b.dataset.back) {
      const id = b.dataset.back;
      if (save.back === id) return; // 이미 쓰는 뒷면
      if (save.backs.includes(id)) save.back = id;
      else { const next = Logic.buy(save, 'back', id); if (!next) { Sfx.play('error'); return; } save = next; Sfx.play('power'); }
      writeSave();
      world.setBack(save.back);
      Sfx.play('select');
      openPanel();
      return;
    }
    if (b.dataset.act === 'adwild') {
      showReward((ok) => {
        if (!ok) { say(X.adFail); return; }
        const tk = todayKey();
        const n = save.adWild.day === tk ? save.adWild.n : 0;
        if (n >= Logic.AD_WILD_PER_DAY) return;
        save.adWild = { day: tk, n: n + 1 };
        save.inv.wild = Math.min(Logic.ITEMS.wild.max, save.inv.wild + 1);
        writeSave();
        Sfx.play('power');
        if (!panel.hidden) openPanel();
        paint();
      });
      return;
    }
    Sfx.play('select');
    hidePanel();
    if (b.dataset.act === 'today') begin(makeRound('day', todayKey()));
    else if (b.dataset.hill) begin(makeRound('map', Number(b.dataset.hill)));
  });

  // ---------- 게임 방법 ----------
  const guide = $('.guide');
  const FIGS = {
    match: '<span class="mc base">5</span><span class="arr">→</span><span class="mc ok">4</span><span class="mc ok">6</span><span class="mc no">9</span><span class="gap"></span><span class="mc base">13</span><span class="arr">→</span><span class="mc ok">1</span>',
    cover: '<span class="pair"><span class="mc back"></span><span class="mc ok over">7</span></span><span class="arr">→</span><span class="pair"><span class="mc ok">3</span></span>',
    stock: '<span class="mc back"></span><span class="mc back off"></span><span class="arr">→</span><span class="mc base">8</span>',
    tools: '<span class="emo">🌰</span><span class="emo">↩</span><span class="emo">🌟</span><span class="emo">🔒🔑</span>',
  };
  let guidePage = 0;
  function paintGuide() {
    const p = H.pages[guidePage];
    const last = guidePage === H.pages.length - 1;
    guide.innerHTML = `
      <div class="card-sheet howto">
        <div class="ribbon">${H.title}</div>
        <p class="step">${guidePage + 1} / ${H.pages.length}</p>
        <h3>${p.t}</h3>
        <div class="fig">${FIGS[p.fig]}</div>
        <ul>${p.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
        <div class="dots">${H.pages.map((_, i) => `<i class="${i === guidePage ? 'on' : ''}"></i>`).join('')}</div>
        <div class="row">
          ${guidePage > 0 ? `<button class="go" data-g="prev">${H.prev}</button>` : `<button class="go ghost" data-g="done">${H.skip}</button>`}
          <button class="go primary" data-g="${last ? 'done' : 'next'}">${last ? H.start : H.next}</button>
        </div>
      </div>`;
  }
  function openGuide() {
    guidePage = 0;
    paintGuide();
    guide.hidden = false;
    coach.hidden = true;
  }
  function closeGuide() {
    guide.hidden = true;
    guide.innerHTML = '';
    try { localStorage.setItem(HOW_KEY, '1'); } catch { /* 저장이 막혀도 괜찮다 */ }
    paint();
  }
  guide.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    const g = b.dataset.g;
    if (g === 'next') { guidePage = Math.min(H.pages.length - 1, guidePage + 1); Sfx.play('select'); paintGuide(); }
    else if (g === 'prev') { guidePage = Math.max(0, guidePage - 1); Sfx.play('back'); paintGuide(); }
    else { Sfx.play('select'); closeGuide(); }
  });
  $('.how-btn').addEventListener('click', () => { if (demo) return; startMusic(); Sfx.play('rustle'); openGuide(); });

  // ---------- 시연(녹화용) ----------
  let demoPlan = null;
  function demoRound(k) {
    const h = Logic.mapHill([1, 6, 4][k % 3]);
    const { deal, seed } = Logic.solvableDeal(h.seed, h.layout);
    const r = Logic.freshRound(deal, { mode: 'map', key: h.n, seed });
    begin(r);
    demoPlan = { path: Logic.solve(deal) || [], step: 0, wait: 1.6, round: k };
  }
  world.stage.onFrame((dt) => {
    if (!demo || !demoPlan || shotMode) return;
    demoPlan.wait -= dt;
    if (demoPlan.wait > 0) return;
    if (ended || demoPlan.step >= demoPlan.path.length) {
      if (ended && !resultSheet.hidden) { demoPlan.wait = 1e9; setTimeout(() => demo && demoRound(demoPlan.round + 1), 2600); }
      return;
    }
    const [kind, i] = demoPlan.path[demoPlan.step++];
    if (kind === 'p') {
      // 가끔은 도토리 도움을 쓰는 모습도 보여 준다(풀이 수순과 같은 패라 결과는 같다).
      if (demoPlan.step === 7 && state.wild > 0) { armed = true; paint(); takeSlot(i, true); demoPlan.wait = 0.9; return; }
      takeSlot(i, false);
      demoPlan.wait = state.streak >= 4 ? 0.36 : 0.5;
    } else {
      doDraw();
      demoPlan.wait = 0.62;
    }
  });
  window.appDemo = () => {
    demo = true;
    hidePanel();
    resultSheet.hidden = true;
    musicOn = false;
    startMusic();
    demoRound(0);
  };

  window.appFlush = () => { if (state && !ended && !demo) save.round = state; writeSave(); };
  window.appBack = () => {
    if (!guide.hidden) { closeGuide(); return true; }
    if (!panel.hidden) { closePanel(); return true; }
    if (armed) { armed = false; paint(); return true; }
    if (!resultSheet.hidden) { openPanel(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.appFlush(); });

  // ---------- 대표 화면 ----------
  function replay(round, moves) {
    let s = round;
    const path = Logic.solve(dealOf(round)) || [];
    for (const [kind, i] of path.slice(0, moves)) s = kind === 'p' ? Logic.play(s, i) : Logic.draw(s);
    return s;
  }
  function shot(n) {
    save = Logic.sanitize({ hill: 12, acorns: 640, best: 1480, wins: 14, played: 19, stars: [3, 3, 2, 3, 1, 2, 3, 3, 2, 1, 2, 3], daily: { '2026-11-20': { score: 1210, won: true } } });
    if (n === 1) {
      // 여러 언덕 가운데 연속이 가장 길게 이어지면서 다음 수가 있는 장면을 고른다.
      let base = null;
      let bestK = 0;
      let bestStreak = -1;
      for (const hillN of [6, 1, 8, 9, 3]) {
        const cand = makeRound('map', hillN);
        const path = Logic.solve(dealOf(cand)) || [];
        let s = cand;
        for (let k = 0; k < path.length - 4; k += 1) {
          const [kind, i] = path[k];
          s = kind === 'p' ? Logic.play(s, i) : Logic.draw(s);
          if (k > 6 && s.streak > bestStreak && Logic.playable(s).length > 0 && s.removed.filter(Boolean).length < s.cards.length * 0.6) { bestStreak = s.streak; bestK = k + 1; base = cand; }
        }
      }
      if (!base) base = makeRound('map', 6);
      begin(replay(base, bestK), true);
      const placePops = () => {
        pops.innerHTML = '';
        const at = world.screenOf(world.pilePos());
        pop(`+${Logic.clearGain(state.streak)}`, { x: at.x, y: at.y - 78 }, 'big');
        pop(L.streak(state.streak), { x: at.x, y: at.y - 112 }, 'chain-pop');
      };
      placePops();
      addEventListener('resize', () => setTimeout(placePops, 0));
      setTimeout(placePops, 600);
    } else if (n === 2) {
      save.played = 0;
      begin(replay(makeRound('map', 4), 2), true);
      armed = false;
    } else if (n === 3) {
      const base = makeRound('map', 3);
      const done = replay(base, 999);
      begin(done, true);
      ended = true;
      showResult('won', Logic.acornsFrom(done), Logic.stars(done), save.acorns);
      paint();
    } else {
      begin(replay(makeRound('day', '2026-11-20'), 5), true);
      openPanel('2026-11-20');
    }
    world.snapCamera();
    world.stage.render();
  }

  // ---------- 시작 ----------
  if (!shotMode) world.setBack(save.back);
  if (shotMode) shot(shotN);
  else if (save.round) begin(save.round, false);
  else begin(makeRound('map', save.hill), false);
  // 처음 켠 사람(아직 한 판도 끝내지 않았고 안내를 본 적 없음)에게는 게임 방법을 먼저 보여 준다.
  if (!shotMode) {
    let seen = false;
    try { seen = localStorage.getItem(HOW_KEY) === '1'; } catch { seen = false; }
    if (!seen && save.played === 0) setTimeout(() => { if (!demo && panel.hidden && resultSheet.hidden) openGuide(); }, 900);
  }
})();
