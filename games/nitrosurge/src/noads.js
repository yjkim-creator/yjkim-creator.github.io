// 광고 제거(한 번 사면 영구) 공용 처리. 게임 폴더 src/noads.js 로 복사해 쓴다(원본: AppFactory/shared/iap/noads.js).
// window.kkNoAds
//   owned()        산 적 있으면 true(이 기기에 저장, 앱 시작 때 스토어 기록으로 다시 맞춤)
//   available()    지금 이 화면에서 살 수 있는지(원스토어 앱·Play 앱·iOS 앱 안에서만, 일반 브라우저는 false)
//   price()        스토어가 알려 준 가격 글자(못 받았으면 '')
//   canRestore()   따로 '구매 복원' 단추가 필요한지(Play·iOS). 원스토어는 사기 단추가 이미 산 것을 알아서 복원한다.
//   buy(cb)        cb('ok' | 'restored' | 'cancel' | 'pending' | 'fail')
//   restore(cb)    cb('restored' | 'none' | 'fail')
//   onChange(f)    산 상태나 가격이 바뀌면 f(owned)
// 네이티브(Play IapBridge.java, iOS IapBridge.swift)는 window.KKIAP { available, price, buy, restore, sync } 를 주고,
// 결과는 window.kkNoAds._done(kind, status), 산 상태는 window.kkNoAds._set(bool), 가격은 _price(str) 로 알린다.
// 원스토어 웹은 index.html 의 원스토어 스크립트가 kkNoAds._provider({ buy, price }) 로 등록한다.
(function () {
  if (window.kkNoAds) return;
  // 웹(원스토어)은 모든 게임이 같은 주소(github.io)를 써서 저장소를 함께 쓰므로 게임마다 따로 저장한다.
  const me = document.currentScript;
  const game = (me && me.dataset.game) || (location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'game');
  const KEY = 'kk-noads-v1:' + game;
  const subs = [];
  let owned = false;
  try { owned = localStorage.getItem(KEY) === '1'; } catch (e) { /* 저장소가 막혀도 진행 */ }
  let web = null; // 원스토어 웹 제공자
  let priceText = '';
  const waiting = { buy: null, restore: null };
  const native = () => (window.KKIAP && typeof window.KKIAP.buy === 'function' ? window.KKIAP : null);
  const tell = () => subs.slice().forEach((f) => { try { f(owned); } catch (e) { /* */ } });
  function set(v) {
    v = !!v;
    if (v === owned) return;
    owned = v;
    try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* */ }
    tell();
  }
  function finish(kind, status) {
    const cb = waiting[kind];
    waiting[kind] = null;
    if (status === 'ok' || status === 'restored') set(true);
    if (cb) { try { cb(status); } catch (e) { /* */ } }
  }
  window.kkNoAds = {
    owned: () => owned,
    available() {
      const n = native();
      if (n) { try { return !!n.available(); } catch (e) { return false; } }
      return !!web;
    },
    price() {
      const n = native();
      if (n) { try { return String(n.price() || priceText || ''); } catch (e) { return priceText; } }
      return priceText;
    },
    canRestore: () => !!native(),
    buy(cb) {
      if (owned) { if (cb) cb('restored'); return; }
      if (waiting.buy) return; // 이미 결제 창이 떠 있음
      waiting.buy = cb || null;
      const n = native();
      try {
        if (n) { n.buy(); return; }
        if (web) { web.buy((s) => finish('buy', s)); return; }
      } catch (e) { /* 아래 */ }
      finish('buy', 'fail');
    },
    restore(cb) {
      if (waiting.restore) return;
      waiting.restore = cb || null;
      const n = native();
      try { if (n) { n.restore(); return; } } catch (e) { /* */ }
      finish('restore', owned ? 'restored' : 'none');
    },
    onChange(f) { if (typeof f === 'function') subs.push(f); },
    _set: set,
    _done: finish,
    _price(p, cur) {
      p = String(p || '');
      // 원스토어는 숫자만 줄 수 있다 → 통화 기호를 붙인다.
      if (/^\d+(\.\d+)?$/.test(p)) {
        try { p = new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: cur || 'KRW', maximumFractionDigits: cur && cur !== 'KRW' ? 2 : 0 }).format(Number(p)); } catch (e) { /* 그대로 */ }
      }
      priceText = p;
      tell();
    },
    _provider(p) { web = p || null; tell(); },
    mount,
  };

  // ── 상점에 넣는 '광고 제거' 칸. 게임이 kkNoAds.mount(빈 요소, { lang: 'ko'|'en'|'ja' }) 로 부른다.
  // 모양은 게임 CSS 가 .kkna, .kkna-row, .kkna-tx, .kkna-buy, .kkna-foot, .kkna-restore, .kkna-msg 로 꾸민다.
  const TEXT = {
    ko: { title: '광고 제거', desc: '중간 광고가 사라지고, 2배·3배 보상을 광고 없이 바로 받아요. 한 번 사면 계속 유지돼요.',
      done: '✓ 구매함', doneDesc: '고마워요! 이제 광고 없이 즐길 수 있어요.', buy: '구매', restore: '구매 복원', tip: '이미 샀다면 같은 단추를 누르면 복원돼요.',
      ok: '광고를 제거했어요. 고마워요!', restored: '구매를 복원했어요.', none: '복원할 구매 내역이 없어요.', pending: '결제를 확인하고 있어요. 끝나면 광고가 사라져요.',
      fail: '결제를 마치지 못했어요. 잠시 후 다시 해 주세요.', cancel: '' },
    en: { title: 'Remove ads', desc: 'No more ads between games, and 2×/3× rewards come instantly without watching an ad. Buy once, keep it forever.',
      done: '✓ Purchased', doneDesc: 'Thank you! Enjoy the game ad-free.', buy: 'Buy', restore: 'Restore purchase', tip: 'Already bought it? Tap the same button to restore.',
      ok: 'Ads removed. Thank you!', restored: 'Purchase restored.', none: 'No purchase to restore.', pending: 'Payment is being confirmed. Ads will go away once it completes.',
      fail: 'The purchase did not go through. Please try again later.', cancel: '' },
    ja: { title: '広告を削除', desc: 'ゲームの合間の広告がなくなり、2倍・3倍のごほうびも広告なしですぐにもらえます。一度買えばずっと有効です。',
      done: '✓ 購入済み', doneDesc: 'ありがとうございます！広告なしでお楽しみください。', buy: '購入', restore: '購入を復元', tip: 'すでに購入済みなら、同じボタンで復元できます。',
      ok: '広告を削除しました。ありがとうございます！', restored: '購入を復元しました。', none: '復元できる購入がありません。', pending: '支払いを確認しています。完了すると広告がなくなります。',
      fail: '購入を完了できませんでした。しばらくしてからもう一度お試しください。', cancel: '' },
  };
  const boxes = [];
  let busy = '';
  let note = '';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function paint(box) {
    const el = box.el;
    const t = TEXT[box.lang] || TEXT.en;
    const api = window.kkNoAds;
    if (!owned && !api.available()) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const btn = owned ? `<button class="kkna-buy ${box.buyClass || ''}" disabled>${esc(t.done)}</button>`
      : `<button class="kkna-buy ${box.buyClass || ''}" data-kkna="buy" ${busy ? 'disabled' : ''}>${busy === 'buy' ? '…' : esc(api.price() || t.buy)}</button>`;
    const foot = owned ? '' : api.canRestore()
      ? `<button class="kkna-restore" data-kkna="restore" ${busy ? 'disabled' : ''}>${busy === 'restore' ? '…' : esc(t.restore)}</button>`
      : `<small class="kkna-tip">${esc(t.tip)}</small>`;
    el.innerHTML = `<div class="kkna-row"><div class="kkna-tx"><b>${esc(t.title)}</b><small>${esc(owned ? t.doneDesc : t.desc)}</small></div>${btn}</div>`
      + (foot || note ? `<div class="kkna-foot">${foot}${note ? `<span class="kkna-msg">${esc(note)}</span>` : ''}</div>` : '');
  }
  function paintAll() {
    for (let i = boxes.length - 1; i >= 0; i -= 1) {
      if (!boxes[i].el.isConnected) boxes.splice(i, 1);
      else paint(boxes[i]);
    }
  }
  subs.push(paintAll);
  function mount(el, opts) {
    if (!el) return;
    opts = opts || {};
    const old = boxes.find((b) => b.el === el);
    const box = old || { el };
    box.lang = opts.lang || 'en';
    box.buyClass = opts.buyClass || '';
    if (!old) {
      boxes.push(box);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-kkna]');
        if (!b || b.disabled) return;
        e.stopPropagation();
        const kind = b.dataset.kkna;
        const t = TEXT[box.lang] || TEXT.en;
        busy = kind;
        note = '';
        paintAll();
        const end = (status) => { busy = ''; note = t[status] || ''; paintAll(); if (opts.onResult) opts.onResult(status); };
        if (kind === 'buy') window.kkNoAds.buy(end);
        else window.kkNoAds.restore(end);
      });
    }
    note = '';
    paint(box);
  }
  // 네이티브 앱: 앱이 먼저 읽어 둔 구매 기록·가격을 다시 보내 달라고 한다.
  try { const n = native(); if (n && typeof n.sync === 'function') n.sync(); } catch (e) { /* */ }
})();
