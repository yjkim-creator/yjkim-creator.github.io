/* 짧은 진동(햅틱) 피드백. 게임마다 src/haptics.js 로 복사해 쓴다.
 * <script src="src/haptics.js" data-game="slug" data-sound="#soundBtn" data-style="svg"></script>
 *   data-sound : 소리 버튼 선택자. 그 바로 옆에 '진동' 토글을 붙인다(다시 그려져도 다시 붙는다).
 *   data-style : svg | emoji | text | text-b   (소리 버튼 모양에 맞춘다)
 *   data-off-class / data-on-class : 꺼짐·켜짐일 때 붙일 클래스(기본 off / 없음)
 * 진동을 못 쓰는 곳(아이폰, 데스크톱, 막힌 WebView)에서는 아무것도 하지 않고 버튼도 만들지 않는다.
 * 게임 코드는 window.Haptics && Haptics.buzz('tick'|'good'|'big') 만 부른다. 알림·재촉용으로 쓰지 않는다. */
(function () {
  'use strict';
  var me = document.currentScript;
  var ds = (me && me.dataset) || {};
  var KEY = (ds.game || 'game') + '-haptics';
  var can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  var on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* 기본은 켬 */ }

  // 10~40ms 짧은 진동. 큰 성공만 짧은 무늬.
  var PATTERN = { tick: 12, good: 25, big: [30, 60, 40] };
  var GAP = { tick: 250, good: 150 };
  var last = -1e9;
  var lastBig = -1e9;

  var lang = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  var WORDS = { ko: ['진동', '켜짐', '꺼짐'], ja: ['振動', 'オン', 'オフ'], en: ['Vibration', 'On', 'Off'] };
  var W = WORDS[lang] || WORDS.en;

  function buzz(kind) {
    if (!can || !on || document.hidden) return false;
    var now = Date.now();
    if (kind === 'big') {
      if (now - lastBig < 600) return false;
      lastBig = now;
    } else {
      if (now - last < (GAP[kind] || 150) || now - lastBig < 400) return false;
    }
    last = now;
    try { return navigator.vibrate(PATTERN[kind] || PATTERN.good) !== false; } catch (e) { return false; }
  }

  var SHAPE = 'style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"';
  function icon(onNow, size, cls) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') +
      ' style="width:' + size.w + ';height:' + size.h + '">' +
      '<rect x="8" y="4" width="8" height="16" rx="2" ' + SHAPE + '/>' +
      (onNow ? '<path d="M4.5 9v6M19.5 9v6" ' + SHAPE + '/>' : '<path d="M4 4l16 16" ' + SHAPE + '/>') + '</svg>';
  }

  // data-onoff 가 있으면 '진동 ON/OFF' 처럼 옆 소리 버튼과 같은 꼴로 쓴다.
  function label() { return W[0] + ' ' + (ds.onoff !== undefined ? (on ? 'ON' : 'OFF') : (on ? W[1] : W[2])); }

  var buttons = [];
  function paint(b) {
    var style = b.getAttribute('data-hstyle');
    if (style === 'emoji') b.textContent = on ? '📳' : '📴';
    else if (style === 'text') b.textContent = label();
    else if (style === 'text-b') b.innerHTML = '<b>' + label() + '</b><small>&nbsp;</small>';
    else b.innerHTML = icon(on, { w: b._hw || '22px', h: b._hh || '22px' }, b._hc || '');
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', W[0]);
    b.title = label();
    var offC = ds.offClass === undefined ? 'off' : ds.offClass;
    var onC = ds.onClass || '';
    if (offC) b.classList.toggle(offC, !on);
    if (onC) b.classList.toggle(onC, on);
  }
  function paintAll() {
    buttons = buttons.filter(function (b) { return b.isConnected; });
    buttons.forEach(paint);
  }

  function set(v) {
    on = !!v;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 저장이 막혀도 이번 실행 동안은 따른다 */ }
    paintAll();
  }

  // 소리 버튼의 클래스를 물려받아 같은 모양으로 만든다. 소리 상태를 뜻하는 클래스만 뺀다.
  // data-keep 에 적은 클래스는 빼지 않는다(그 클래스에 모양이 걸려 있는 게임).
  var DROP = ['sound', 'sound-btn', 'snd', 'mute', 'muted', 'off', 'on'];
  var KEEP = String(ds.keep || '').split(/\s+/);
  function inherit(cls) {
    return String(cls).split(/\s+/).filter(function (c) { return c && (DROP.indexOf(c) < 0 || KEEP.indexOf(c) >= 0); }).join(' ');
  }
  function ensure() {
    if (!can || !ds.sound) return;
    var list = document.querySelectorAll(ds.sound);
    for (var i = 0; i < list.length; i += 1) {
      var s = list[i];
      var nx = s.nextElementSibling;
      if (nx && nx.classList.contains('kk-vib')) continue;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = (inherit(s.className) + ' kk-vib').trim();
      b.setAttribute('data-hstyle', ds.style || 'svg');
      var si = s.querySelector('svg');
      if (si) {
        var r = si.getBoundingClientRect();
        if (r.width > 4) { b._hw = r.width + 'px'; b._hh = r.height + 'px'; }
        b._hc = si.getAttribute('class') || '';
      }
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        set(!on);
        if (on) { last = -1e9; buzz('good'); }
      });
      paint(b);
      buttons.push(b);
      s.insertAdjacentElement('afterend', b);
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(function () { queued = false; ensure(); });
  }
  function start() {
    ensure();
    if (can && ds.sound && window.MutationObserver) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  window.Haptics = {
    buzz: buzz,
    set: set,
    get on() { return on; },
    get can() { return can; },
  };
})();
