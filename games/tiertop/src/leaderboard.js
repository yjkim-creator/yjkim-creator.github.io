// 전국 랭킹 공용 모듈 (쿵쿵랩 게임 공통). Firebase Firestore REST + 익명 로그인만 씁니다.
// 게임 쪽 약속:
//   Rank.setup({ game, title, unit, read, theme })  // read(): 기기에 저장된 최고 기록(숫자)
//   Rank.submit(n)                                    // 판이 끝났을 때 이번 기록(또는 최고 기록)
//   (보드를 더 둘 때) Rank.setup({ ..., boards: [{ id, game, title, unit, max, read, format }] }),
//   Rank.submit(n, id), Rank.place(id) -> Promise<{ rank, approx } | null>  // 전체 순위(인터넷이 안 되면 null)
//   <button data-rank-open>랭킹</button>               // 누르면 랭킹 화면이 열립니다
// 인터넷이 없거나 서버가 안 되면 조용히 넘어가고, 다음 기회에 다시 보냅니다. 게임은 그대로 돕니다.
(function () {
  'use strict';
  const CONFIG = { apiKey: 'AIzaSyDIyZn6P40oPDt-Hhn5K-KxErH6AgUApFc', projectId: 'kungkunglab-rank' };
  const READY = !!CONFIG.apiKey;
  const DOCS = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents`;
  // 기기 언어: 일본어면 ja, 영어면 en, 그 밖(한국어 포함)은 ko.
  const NAV = navigator.language || '';
  const LANG = /^ja/i.test(NAV) ? 'ja' : /^en/i.test(NAV) ? 'en' : 'ko';
  const KO = LANG === 'ko';
  const PROFILE = 'kk-rank-profile';
  const TEXT = {};
  TEXT.ko = {
    rank: '전국 랭킹', week: '이번 주', all: '전체', weekNote: '매주 월요일 0시에 새로 시작해요', me: '내 기록', myRank: (n) => `${n}위`, aboutRank: (n) => `약 ${n}위`, none: '아직 기록이 없어요',
    empty: '첫 번째 주인공이 되어 보세요!', offline: '인터넷에 연결되면 랭킹을 볼 수 있어요.\n게임은 그대로 즐길 수 있어요.',
    loading: '불러오는 중…', close: '닫기', privacy: '광고 개인정보 설정', nameTitle: '랭킹에 쓸 별명', nameHint: '한글·영문·숫자 2~10자. 별명과 점수만 저장돼요.',
    save: '저장', change: '별명 바꾸기', bad: '쓸 수 없는 별명이에요', short: '2~10자로 적어 주세요', pending: '연결되면 올라가요',
    notReady: '랭킹 준비 중이에요',
    wipe: '내 기록 지우기', wipeTitle: '내 기록을 지울까요?', wipeBody: '서버에 올린 이 게임의 별명과 점수를 모두 지우고, 랭킹용 익명 계정도 없앱니다. 되돌릴 수 없어요.\n기기에 저장된 게임 진행은 그대로 남아요.',
    wipeGo: '지우기', cancel: '취소', wiping: '지우는 중…', wiped: '서버의 내 기록을 모두 지웠어요.', wipeFail: '지금은 지울 수 없어요. 인터넷 연결을 확인하고 다시 해 주세요.',
  };
  TEXT.en = {
    rank: 'Leaderboard', week: 'This week', all: 'All time', weekNote: 'Resets every Monday 00:00 KST', me: 'My best', myRank: (n) => `#${n}`, aboutRank: (n) => `~#${n}`, none: 'No record yet',
    empty: 'Be the first one on the board!', offline: 'Connect to the internet to see the leaderboard.\nThe game still works offline.',
    loading: 'Loading…', close: 'Close', privacy: 'Ad privacy settings', nameTitle: 'Your nickname', nameHint: '2–10 letters or numbers. Only the nickname and score are stored.',
    save: 'Save', change: 'Change nickname', bad: 'That nickname is not allowed', short: 'Use 2–10 characters', pending: 'Will upload when online',
    notReady: 'Leaderboard coming soon',
    wipe: 'Delete my data', wipeTitle: 'Delete your data?', wipeBody: 'This removes your nickname and every score you uploaded for this game, and deletes the anonymous leaderboard account. This cannot be undone.\nYour game progress on this device stays.',
    wipeGo: 'Delete', cancel: 'Cancel', wiping: 'Deleting…', wiped: 'Your data on the server has been deleted.', wipeFail: 'Could not delete right now. Check your connection and try again.',
  };
  TEXT.ja = {
    rank: 'ランキング', week: '今週', all: '総合', weekNote: '毎週月曜 0:00(日本時間)にリセット', me: '自己ベスト', myRank: (n) => `${n}位`, aboutRank: (n) => `約${n}位`, none: 'まだ記録がありません',
    empty: '最初のランカーになろう!', offline: 'インターネットに接続するとランキングを見られます。\nゲームはオフラインでも遊べます。',
    loading: '読み込み中…', close: '閉じる', privacy: '広告のプライバシー設定', nameTitle: 'ランキング用ニックネーム', nameHint: 'ひらがな・カタカナ・英数字で2〜10文字。ニックネームとスコアだけが保存されます。',
    save: '保存', change: 'ニックネーム変更', bad: 'このニックネームは使えません', short: '2〜10文字で入力してください', pending: '接続するとアップロードされます',
    notReady: 'ランキングは準備中です',
    wipe: '自分の記録を削除', wipeTitle: '記録を削除しますか?', wipeBody: 'このゲームでアップロードしたニックネームとスコアをすべて削除し、ランキング用の匿名アカウントも削除します。元に戻せません。\n端末に保存されたゲームの進行はそのまま残ります。',
    wipeGo: '削除する', cancel: 'キャンセル', wiping: '削除中…', wiped: 'サーバー上の記録をすべて削除しました。', wipeFail: '今は削除できません。接続を確認してもう一度お試しください。',
  };
  const T = TEXT[LANG];
  // title·unit 은 문자열이거나 { ko, en, ja } 객체일 수 있다.
  const pick = (v) => (v && typeof v === 'object' ? (v[LANG] || v.en || v.ko || '') : (v || ''));

  let cfg = null;
  // 보드: 첫 보드는 게임의 기본 기록(cfg 그대로). cfg.boards 로 보드를 더할 수 있다(예: 최고 도달 단계).
  let boards = [];
  let bi = 0;
  const board = (id) => boards.find((b) => b.id === id) || boards[0];
  const B = () => boards[bi] || boards[0];
  let token = null;
  let tokenUntil = 0;
  let busy = false;
  let lastTry = 0;

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장이 막혀도 게임은 돈다 */ } },
  };
  const key = (b) => `kk-rank-${(b || boards[0]).game}`;
  // 이번 주 = 한국 시간 월요일 0시부터. 주 이름은 그 월요일 날짜(YYYY-MM-DD).
  function weekKey(ms) {
    const d = new Date((ms || Date.now()) + 9 * 3600000);
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
  }
  const rec = (b) => {
    const r = store.get(key(b), {});
    const wk = weekKey();
    const same = r.wk === wk;
    return { best: +r.best || 0, sent: +r.sent || 0, wk, wbest: same ? +r.wbest || 0 : 0, wsent: same ? +r.wsent || 0 : 0 };
  };
  // 기록 하나를 받아 전체 최고·이번 주 최고를 함께 갱신한다.
  function note(b, v) {
    if (!(v > 0) || v > (b.max || 1e9)) return;
    const r = rec(b);
    if (v > r.best || v > r.wbest) store.set(key(b), { ...r, best: Math.max(r.best, v), wbest: Math.max(r.wbest, v) });
  }
  const profile = () => store.get(PROFILE, {});

  // ---------- 별명 검사 (욕설·비하·사칭)
  const BAD = [
    '시발', '씨발', '씨빨', '시빨', '씨바', '시바', '씨팔', '시팔', '쓰발', '쉬발', '슈발', '십알', '씹', '병신', '븅신', '빙신', '병쉰', '좆', '존나', '졸라',
    '좃', '개새', '개색', '개세', '개쉐', '개섀', '새끼', '쌔끼', '섹스', '쎅스', '보지', '자지', '니미', '느금', '애미', '애비', '에미', '엠창', '지랄',
    '미친', '미췬', '또라이', '꺼져', '닥쳐', '염병', '썅', '쌍놈', '쌍년', '년놈', '창녀', '창놈', '걸레', '호로', '후장', '딸딸', '자위', '강간', '성폭',
    '야동', '포르노', '자살', '한남', '한녀', '김치녀', '된장녀', '메갈', '일베', '워마드', '홍어', '짱깨', '짱개', '쪽바리', '틀딱', '급식충', '맘충',
    '틀니', '흑형', '깜둥', '운지', '노무노', '장애인', '애자', '찐따', '정신병', '느개비', '니애미', '느그', '븅', '썅년', '좆까', '쳐죽',
    'fuck', 'fuk', 'shit', 'bitch', 'sex', 'porn', 'nigg', 'nigga', 'cunt', 'dick', 'pussy', 'slut', 'whore', 'rape', 'nazi', 'hitler', 'fag',
    '운영자', '관리자', '쿵쿵랩', '원스토어', '구글', 'admin', 'onestore', 'google', 'kungkung',
  ];
  const JAMO = ['ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅈㄴ', 'ㅈㄹ', 'ㅄ', 'ㅗ'];
  // 일본어 별명(가나)용. 가타카나는 히라가나로 바꿔서 비교한다.
  const BAD_JA = [
    'しね', 'ころす', 'ころせ', 'くたばれ', 'きえろ', 'ちんこ', 'ちんぽ', 'まんこ', 'おまんこ', 'せっくす', 'えっち', 'やりまん', 'やりちん', 'ぱいぱん',
    'おっぱい', 'れいぷ', 'ごうかん', 'うんこ', 'くそ', 'ばか', 'あほ', 'きちがい', 'がいじ', 'しょうがい', 'ちょん', 'しなじん', 'ちゃんころ',
    'ぶす', 'でぶ', 'はげ', 'ぽるの', 'なちす', 'ひとらー', 'うんえい', 'かんりしゃ', 'ぐーぐる', 'くんくん',
  ];
  const hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function nameProblem(raw) {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 10) return T.short;
    // 서버 규칙(firestore.rules)과 같은 글자만 허용한다.
    if (!/^[가-힣a-zA-Zぁ-んァ-ヶー0-9_ ]+$/.test(name)) return T.bad;
    const flat = name.toLowerCase().replace(/[\s_0-9]/g, '').replace(/1/g, 'i').replace(/0/g, 'o');
    if (BAD.some((w) => flat.includes(w))) return T.bad;
    const kana = hira(flat).replace(/ー/g, '');
    if (BAD_JA.some((w) => kana.includes(w.replace(/ー/g, '')))) return T.bad;
    if (JAMO.some((w) => name.includes(w))) return T.bad;
    return '';
  }

  // ---------- 서버
  function timed(url, opt, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms || 8000);
    return fetch(url, { ...opt, signal: ctl && ctl.signal }).finally(() => clearTimeout(t));
  }
  async function json(url, opt, ms) {
    const r = await timed(url, opt, ms);
    if (!r.ok) throw new Error(`http ${r.status}`);
    return r.json();
  }
  async function auth() {
    if (token && Date.now() < tokenUntil) return token;
    const p = profile();
    let out;
    if (p.refresh) {
      try {
        out = await json(`https://securetoken.googleapis.com/v1/token?key=${CONFIG.apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(p.refresh)}`,
        });
        out = { idToken: out.id_token, refreshToken: out.refresh_token, localId: out.user_id, expiresIn: out.expires_in };
      } catch (e) { out = null; }
    }
    if (!out) {
      out = await json(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
      });
    }
    store.set(PROFILE, { ...profile(), uid: out.localId, refresh: out.refreshToken });
    token = out.idToken;
    tokenUntil = Date.now() + (Number(out.expiresIn) || 3600) * 1000 - 120000;
    return token;
  }

  async function upload() {
    const p = profile();
    if (!READY || !cfg || busy || !p.name) return false;
    const b = boards.find((x) => { const r = rec(x); return r.best > r.sent || r.wbest > r.wsent; });
    if (!b) return false;
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) return false;
    if (Date.now() - lastTry < 12000) return false;
    busy = true;
    lastTry = Date.now();
    try {
      const tk = await auth();
      const uid = profile().uid;
      const r2 = rec(b);
      const best = r2.best > r2.sent ? r2.best : r2.wbest;
      const wk = r2.wk;
      const now = { fieldPath: 't', setToServerValue: 'REQUEST_TIME' };
      const base = `projects/${CONFIG.projectId}/databases/(default)/documents`;
      const body = {
        writes: [
          { update: { name: `${base}/limits/${uid}`, fields: {} }, updateTransforms: [now] },
          {
            update: {
              name: `${base}/boards/${b.game}/scores/${uid}_${Date.now()}`,
              fields: { game: { stringValue: b.game }, name: { stringValue: p.name }, score: { integerValue: String(best) }, uid: { stringValue: uid }, wk: { stringValue: wk } },
            },
            updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
            currentDocument: { exists: false },
          },
        ],
      };
      await json(`${DOCS}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });
      const r3 = rec(b);
      store.set(key(b), { ...r3, sent: best >= r3.best ? best : r3.sent, wsent: r3.wk === wk ? Math.max(r3.wsent, best) : r3.wsent });
      return true;
    } catch (e) {
      return false;
    } finally {
      busy = false;
    }
  }

  function val(f) { return f.integerValue != null ? Number(f.integerValue) : f.stringValue; }
  const weekWhere = (wk) => ({ fieldFilter: { field: { fieldPath: 'wk' }, op: 'EQUAL', value: { stringValue: wk } } });
  async function top(wk, b) {
    const q = { structuredQuery: { from: [{ collectionId: 'scores' }], ...(wk ? { where: weekWhere(wk) } : {}), orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 200 } };
    const rows = await json(`${DOCS}/boards/${(b || B()).game}:runQuery?key=${CONFIG.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    const seen = new Set();
    const list = [];
    for (const row of rows) {
      if (!row.document) continue;
      const f = row.document.fields || {};
      const uid = f.uid ? val(f.uid) : row.document.name;
      if (seen.has(uid)) continue;
      seen.add(uid);
      list.push({ uid, name: String(val(f.name || {}) || ''), score: Number(val(f.score || {}) || 0) });
      if (list.length >= 50) break;
    }
    return list;
  }
  async function above(score, wk, b) {
    const gt = { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: { integerValue: String(score) } } };
    const q = {
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: 'scores' }], where: wk ? { compositeFilter: { op: 'AND', filters: [weekWhere(wk), gt] } } : gt },
        aggregations: [{ alias: 'n', count: {} }],
      },
    };
    const rows = await json(`${DOCS}/boards/${(b || B()).game}:runAggregationQuery?key=${CONFIG.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    const n = rows[0] && rows[0].result && rows[0].result.aggregateFields && rows[0].result.aggregateFields.n;
    return n ? Number(n.integerValue) : 0;
  }

  // 내 기록 지우기: 서버의 이 게임 점수 문서, 쓰기 간격 문서, 익명 계정을 모두 지우고 기기의 별명도 지운다.
  // (App Store 심사 5.1.1(v) 계정 삭제 요건. firestore.rules 에 본인 문서 삭제 허용이 게시돼 있어야 한다.)
  async function wipe() {
    if (READY && profile().refresh) {
      const tk = await auth();
      const uid = profile().uid;
      const head = { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` };
      const mineQ = {
        structuredQuery: {
          from: [{ collectionId: 'scores' }],
          where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
          select: { fields: [{ fieldPath: 'uid' }] }, limit: 400,
        },
      };
      for (const b of boards) for (let i = 0; i < 50; i++) {
        const rows = await json(`${DOCS}/boards/${b.game}:runQuery`, { method: 'POST', headers: head, body: JSON.stringify(mineQ) }, 12000);
        const names = rows.filter((x) => x.document).map((x) => x.document.name);
        if (!names.length) break;
        await json(`${DOCS}:commit`, { method: 'POST', headers: head, body: JSON.stringify({ writes: names.map((n) => ({ delete: n })) }) }, 12000);
        if (names.length < 400) break;
      }
      const base = `projects/${CONFIG.projectId}/databases/(default)/documents`;
      await json(`${DOCS}:commit`, { method: 'POST', headers: head, body: JSON.stringify({ writes: [{ delete: `${base}/limits/${uid}` }] }) }, 12000);
      await json(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${CONFIG.apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tk }),
      }, 12000);
    }
    try { localStorage.removeItem(PROFILE); } catch (e) { /* */ }
    boards.forEach((b) => store.set(key(b), { ...rec(b), sent: 0, wsent: 0 }));
    token = null;
    tokenUntil = 0;
  }

  // ---------- 화면
  const fmt = (n, b) => {
    const f = (b && b.format) || cfg.format;
    return f ? f(n) : Number(n).toLocaleString();
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let root = null;
  let prevBack = null;
  let tab = 'week';

  function css() {
    if (document.getElementById('kk-rank-css')) return;
    const th = { bg: 'rgba(10,14,28,.72)', panel: '#1F2A4F', text: '#EEF3FC', mute: '#9FB0D3', accent: '#FFC857', accentText: '#1B2440', line: 'rgba(255,255,255,.12)', radius: '18px', font: 'inherit', ...(cfg.theme || {}) };
    const s = document.createElement('style');
    s.id = 'kk-rank-css';
    s.textContent = `
.kk-rank{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:${th.bg};font-family:${th.font};-webkit-user-select:none;user-select:none;animation:kkIn .18s ease-out}
@keyframes kkIn{from{opacity:0}to{opacity:1}}
.kk-rank .kk-p{box-sizing:border-box;width:min(92vw,420px);max-height:min(86vh,720px);display:flex;flex-direction:column;background:${th.panel};color:${th.text};border-radius:${th.radius};box-shadow:0 18px 50px rgba(0,0,0,.35);padding:18px 16px 14px;border:1px solid ${th.line}}
.kk-rank h2{margin:0 0 4px;font-size:20px;text-align:center;letter-spacing:.02em}
.kk-rank .kk-sub{margin:0 0 10px;text-align:center;font-size:13px;color:${th.mute}}
.kk-rank .kk-me{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:${th.accent};color:${th.accentText};font-weight:700;margin-bottom:10px}
.kk-rank .kk-me small{font-weight:600;opacity:.8;display:block;font-size:11px}
.kk-rank ol{list-style:none;margin:0;padding:0 2px;overflow-y:auto;flex:1;min-height:80px;-webkit-overflow-scrolling:touch}
.kk-rank li{display:grid;grid-template-columns:36px 1fr auto;align-items:center;gap:6px;padding:8px 6px;border-bottom:1px solid ${th.line};font-size:15px}
.kk-rank li b{font-variant-numeric:tabular-nums;text-align:center;color:${th.mute}}
.kk-rank li.t1 b,.kk-rank li.t2 b,.kk-rank li.t3 b{color:${th.accent};font-size:17px}
.kk-rank li.mine{background:${th.line};border-radius:8px}
.kk-rank li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kk-rank li em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums}
.kk-rank .kk-msg{text-align:center;white-space:pre-line;color:${th.mute};padding:26px 8px;font-size:14px;line-height:1.5}
.kk-rank .kk-row{display:flex;gap:8px;margin-top:12px}
.kk-rank button{flex:1;font:inherit;font-weight:700;font-size:15px;border:0;border-radius:12px;padding:12px 10px;cursor:pointer;background:${th.line};color:${th.text}}
.kk-rank button.kk-go{background:${th.accent};color:${th.accentText}}
.kk-rank input{box-sizing:border-box;width:100%;font:inherit;font-size:17px;padding:12px;border-radius:12px;border:2px solid ${th.line};background:rgba(255,255,255,.95);color:#1a1a1a;outline:none;-webkit-user-select:text;user-select:text}
.kk-rank input:focus{border-color:${th.accent}}
.kk-rank .kk-err{min-height:18px;margin:6px 2px 0;font-size:13px;color:#ff6b6b}
.kk-rank .kk-tabs{display:flex;gap:6px;margin:0 0 10px}
.kk-rank .kk-tabs button{padding:8px 6px;font-size:14px;border-radius:10px}
.kk-rank .kk-tabs button.on{background:${th.accent};color:${th.accentText}}
.kk-rank .kk-hint{font-size:12px;color:${th.mute};margin:8px 2px 0;line-height:1.4}`;
    document.head.appendChild(s);
  }

  function close() {
    if (!root) return;
    root.remove();
    root = null;
    window.appBack = prevBack;
    prevBack = null;
  }
  function shell(html) {
    css();
    if (!root) {
      root = document.createElement('div');
      root.className = 'kk-rank';
      root.setAttribute('role', 'dialog');
      // 게임의 '화면 아무 데나 톡' 입력이 뒤에서 반응하지 않게 막는다.
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'wheel'].forEach((ev) => root.addEventListener(ev, (e) => {
        e.stopPropagation();
        if (ev === 'click' && e.target === root) close();
      }));
      document.body.appendChild(root);
      prevBack = window.appBack;
      window.appBack = () => { close(); return true; };
    }
    root.innerHTML = `<div class="kk-p">${html}</div>`;
    root.querySelectorAll('[data-kk]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = b.getAttribute('data-kk');
      if (a === 'close') close();
      if (a === 'name') askName();
      if (a === 'save') saveName();
      if (a === 'privacy') { try { window.AndroidAds.privacyOptions(); } catch (err) { /* */ } }
      if (a === 'week' || a === 'all') { tab = a; show(); }
      if (/^board\d+$/.test(a)) { bi = Number(a.slice(5)) || 0; show(); }
      if (a === 'wipe') askWipe();
      if (a === 'wipeGo') doWipe();
      if (a === 'back') show();
    }));
    return root;
  }

  function askWipe() {
    shell(`<h2>${T.wipeTitle}</h2><p class="kk-msg" style="padding:14px 4px">${T.wipeBody}</p>
      <div class="kk-row"><button data-kk="back">${T.cancel}</button><button class="kk-go" data-kk="wipeGo">${T.wipeGo}</button></div>`);
  }
  let wiping = false;
  async function doWipe() {
    if (wiping) return;
    wiping = true;
    shell(`<h2>${T.wipeTitle}</h2><p class="kk-msg">${T.wiping}</p>`);
    const mine = root;
    let msg = T.wiped;
    try { await wipe(); } catch (e) { msg = T.wipeFail; }
    wiping = false;
    if (root !== mine) return;
    shell(`<h2>${T.rank}</h2><p class="kk-msg">${msg}</p><div class="kk-row"><button class="kk-go" data-kk="close">${T.close}</button></div>`);
  }
  const wipeLink = () => (profile().name || profile().refresh
    ? `<p class="kk-hint" style="text-align:center;margin-top:4px"><button data-kk="wipe" style="background:none;border:0;color:inherit;text-decoration:underline;font:inherit;font-size:12px;padding:4px">${T.wipe}</button></p>`
    : '');

  // 유럽 등 동의가 필요한 지역의 Android 앱에서만 광고 동의를 다시 고를 수 있는 링크를 보여 준다.
  function privacyLink() {
    let need = false;
    try { need = !!(window.AndroidAds && window.AndroidAds.privacyRequired && window.AndroidAds.privacyRequired()); } catch (e) { /* */ }
    return need ? `<p class="kk-hint" style="text-align:center"><button data-kk="privacy" style="background:none;border:0;color:inherit;text-decoration:underline;font:inherit;padding:4px">${T.privacy}</button></p>` : '';
  }

  function askName() {
    const p = profile();
    const r = shell(`<h2>${T.nameTitle}</h2><input maxlength="10" value="${esc(p.name || '')}" autocomplete="off" enterkeyhint="done"><p class="kk-err"></p><p class="kk-hint">${T.nameHint}</p>
      <div class="kk-row"><button data-kk="close">${T.close}</button><button class="kk-go" data-kk="save">${T.save}</button></div>`);
    const input = r.querySelector('input');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
    setTimeout(() => { try { input.focus(); } catch (e) { /* */ } }, 60);
  }
  function saveName() {
    const input = root && root.querySelector('input');
    if (!input) return;
    const name = input.value.trim().replace(/\s+/g, ' ');
    const err = nameProblem(name);
    if (err) { root.querySelector('.kk-err').textContent = err; return; }
    store.set(PROFILE, { ...profile(), name });
    // 별명이 바뀌면 지금 최고 기록을 새 별명으로 한 번 더 올린다.
    boards.forEach((b) => store.set(key(b), { ...rec(b), sent: 0, wsent: 0 }));
    lastTry = 0;
    show();
  }

  function refreshBest(only) {
    if (!cfg) return;
    (only ? [only] : boards).forEach((bd) => {
      let v = 0;
      try { v = Math.floor(Number(bd.read && bd.read()) || 0); } catch (e) { v = 0; }
      if (v > rec(bd).best) note(bd, v);
    });
  }

  // 전체 순위 한 번 알아보기(결과 화면용). 상위 200 안이면 정확한 순위, 아니면 '약 n위'.
  async function place(id) {
    if (!READY || !cfg) return null;
    const b = board(id);
    refreshBest(b);
    const r = rec(b);
    if (!r.best) return null;
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) return null;
    try {
      const list = await top('', b);
      const uid = profile().uid;
      const i = uid ? list.findIndex((x) => x.uid === uid && x.score >= r.best) : -1;
      if (i >= 0) return { rank: i + 1, approx: false };
      return { rank: (await above(r.best, '', b)) + 1, approx: true };
    } catch (e) {
      return null;
    }
  }

  async function show() {
    if (!READY) { shell(`<h2>${T.rank}</h2><p class="kk-msg">${T.notReady}</p><div class="kk-row"><button data-kk="close">${T.close}</button></div>`); return; }
    refreshBest();
    if (!profile().name) { askName(); return; }
    const p = profile();
    const bd = B();
    const myBoard = bi;
    const r = rec(bd);
    const weekly = tab === 'week';
    const mineBest = weekly ? r.wbest : r.best;
    const mineSent = weekly ? r.wsent : r.sent;
    const boardTabs = boards.length > 1 ? `<div class="kk-tabs">${boards.map((x, i) => `<button data-kk="board${i}" class="${i === bi ? 'on' : ''}">${esc(pick(x.tab || x.title))}</button>`).join('')}</div>` : '';
    const head = `<h2>🏆 ${T.rank}</h2>${boardTabs}<p class="kk-sub">${esc(pick(bd.title))}</p>
      <div class="kk-tabs"><button data-kk="week" class="${weekly ? 'on' : ''}">${T.week}</button><button data-kk="all" class="${weekly ? '' : 'on'}">${T.all}</button></div>`;
    const meBox = (txt) => `<div class="kk-me"><div><small>${esc(p.name)}</small>${mineBest ? `${fmt(mineBest, bd)} ${esc(pick(bd.unit))}` : T.none}</div><div>${txt}</div></div>`;
    const foot = `${weekly ? `<p class="kk-hint" style="text-align:center">${T.weekNote}</p>` : ''}<div class="kk-row"><button data-kk="name">${T.change}</button><button class="kk-go" data-kk="close">${T.close}</button></div>${wipeLink()}${privacyLink()}`;
    shell(`${head}${meBox('')}<p class="kk-msg">${T.loading}</p>${foot}`);
    const mine = root;
    const myTab = tab;
    const stale = () => root !== mine || tab !== myTab || bi !== myBoard;
    try {
      lastTry = 0;
      await upload();
      const after = rec(bd);
      const list = await top(weekly ? r.wk : '', bd);
      if (stale()) return;
      const uid = profile().uid;
      const idx = list.findIndex((x) => x.uid === uid);
      const sentNow = weekly ? after.wsent : after.sent;
      let place = '';
      if (idx >= 0) place = T.myRank(idx + 1);
      else if (mineBest && sentNow >= mineBest) place = T.aboutRank((await above(mineBest, weekly ? r.wk : '', bd)) + 1);
      else if (mineBest) place = T.pending;
      if (stale()) return;
      const rows = list.map((x, i) => `<li class="${i < 3 ? `t${i + 1}` : ''}${x.uid === uid ? ' mine' : ''}"><b>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b><span>${esc(x.name)}</span><em>${fmt(x.score, bd)}</em></li>`).join('');
      shell(`${head}${meBox(place)}${rows ? `<ol>${rows}</ol>` : `<p class="kk-msg">${T.empty}</p>`}${foot}`);
    } catch (e) {
      if (stale()) return;
      shell(`${head}${meBox(mineBest > mineSent ? T.pending : '')}<p class="kk-msg">${T.offline}</p>${foot}`);
    }
  }

  // ---------- 바깥에 보이는 것
  window.Rank = {
    setup(c) {
      cfg = c;
      boards = [{ id: 'main', game: c.game, title: c.title, tab: c.tab, unit: c.unit, max: c.max, read: c.read, format: c.format }]
        .concat((c.boards || []).map((x) => ({ ...x, game: x.game || `${c.game}-${x.id}` })));
      bi = 0;
      refreshBest();
      setTimeout(upload, 3000);
      // 판이 끝나 저장된 최고 기록을 몇 초마다 확인해 새 기록이면 올린다(별명이 있을 때만).
      setInterval(() => { refreshBest(); upload(); }, 6000);
      window.addEventListener('online', () => { lastTry = 0; upload(); });
    },
    submit(n, id) {
      if (!cfg) return;
      const b = board(id);
      note(b, Math.floor(Number(n) || 0));
      refreshBest(b);
      upload();
    },
    place,
    open(id) { if (id && boards.length) bi = Math.max(0, boards.indexOf(board(id))); return show(); },
    label: LANG === 'ja' ? '🏆 ランキング' : KO ? '🏆 전국 랭킹' : '🏆 Leaderboard',
    lang: LANG,
    close,
    get isOpen() { return !!root; },
  };
  // 게임 화면 어디에 있든 data-rank-open 버튼을 누르면 랭킹이 열린다(게임 자체 버튼 처리보다 먼저).
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-rank-open]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    show();
  }, true);
})();
