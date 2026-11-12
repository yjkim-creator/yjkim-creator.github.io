// Rendering, input, sound and persistence. All rules live in game.js.
(function () {
  'use strict';

  const G = window.BloomGame;
  const SIZE = G.SIZE;
  const SAVE_KEY = 'bloom.save.v1';
  const BEST_KEY = 'bloom.best';
  const MUTED_KEY = 'bloom.muted';

  const PALETTE = [null, '#ff6b6b', '#ffb347', '#8bd450', '#2ec4b6', '#4ea8ff', '#9b7bff', '#ff7ac6'];
  const KOREAN = (navigator.language || '').toLowerCase().startsWith('ko');
  const TEXT = KOREAN
    ? {
        best: '최고',
        hint: '블록을 끌어다 놓으세요',
        over: '더 놓을 곳이 없어요',
        record: '새로운 최고 기록!',
        bestScore: (n) => `최고 기록 ${n}`,
        again: '다시 하기',
        restartTitle: '새 게임을 시작할까요?',
        restartDetail: '현재 진행 상황은 사라져요.',
        restart: '새 게임',
        cancel: '계속하기',
        combo: (n) => `콤보 ${n}`,
        perfect: '퍼펙트!',
      }
    : {
        best: 'Best',
        hint: 'Drag a block onto the board',
        over: 'No more moves',
        record: 'New best score!',
        bestScore: (n) => `Best ${n}`,
        again: 'Play again',
        restartTitle: 'Start a new game?',
        restartDetail: 'Your current progress will be lost.',
        restart: 'New game',
        cancel: 'Keep playing',
        combo: (n) => `Combo ${n}`,
        perfect: 'Perfect!',
      };

  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function load(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (_) {
      // Storage can be unavailable; the game still plays without persistence.
    }
  }

  function restoreGame() {
    try {
      const saved = JSON.parse(load(SAVE_KEY));
      if (saved && Array.isArray(saved.board) && saved.board.length === SIZE * SIZE && !saved.gameOver) {
        return saved;
      }
    } catch (_) {
      // Corrupt save: fall through to a new game.
    }
    return null;
  }

  let best = Number(load(BEST_KEY)) || 0;
  let state = restoreGame() || G.createGame({ best });
  let muted = load(MUTED_KEY) === '1';
  let startBest = best;

  let W = 0, H = 0, dpr = 1;
  let cell = 32, boardX = 0, boardY = 0, boardPx = 0;
  let trayTop = 0, trayHeight = 0, miniCell = 16;
  let tiles = [];

  let drag = null;
  let returning = null;
  let raf = 0;
  let overlayAction = null;
  const fx = { clearing: [], particles: [], floaters: [], pops: [], shake: null };

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }

  function buildTiles() {
    const px = Math.max(8, Math.round(cell * dpr));
    tiles = PALETTE.map((color) => {
      if (!color) return null;
      const tile = document.createElement('canvas');
      tile.width = tile.height = px;
      const c = tile.getContext('2d');
      const inset = px * 0.04;
      const size = px - inset * 2;
      const gradient = c.createLinearGradient(0, 0, 0, px);
      gradient.addColorStop(0, shade(color, 0.28));
      gradient.addColorStop(0.55, color);
      gradient.addColorStop(1, shade(color, -0.26));
      roundRect(c, inset, inset, size, size, px * 0.2);
      c.fillStyle = gradient;
      c.fill();
      c.lineWidth = px * 0.035;
      c.strokeStyle = 'rgba(255,255,255,0.32)';
      c.stroke();

      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.translate(px / 2, px / 2);
      for (let i = 0; i < 5; i++) {
        c.rotate((Math.PI * 2) / 5);
        c.beginPath();
        c.ellipse(0, -px * 0.13, px * 0.075, px * 0.125, 0, 0, Math.PI * 2);
        c.fill();
      }
      return tile;
    });
  }

  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const top = $('hud').offsetHeight + 8;
    const available = H - top - 12;
    const maxBoard = Math.min(W - 32, 560, available * 0.68);
    cell = Math.max(16, Math.floor(maxBoard / SIZE));
    boardPx = cell * SIZE;
    boardX = Math.round((W - boardPx) / 2);

    const trayIdeal = Math.min(cell * 3.6, 200);
    const spare = Math.max(0, available - boardPx - trayIdeal);
    boardY = Math.round(top + spare * 0.35);
    trayTop = boardY + boardPx + 12;
    trayHeight = H - trayTop - 12;
    const slotWidth = boardPx / G.TRAY_SIZE;
    miniCell = Math.min(cell * 0.6, (slotWidth - 12) / 5, (trayHeight - 8) / 5);

    buildTiles();
    requestDraw();
  }

  function slotCenter(slot) {
    return {
      x: boardX + (boardPx / G.TRAY_SIZE) * (slot + 0.5),
      y: trayTop + trayHeight / 2,
    };
  }

  function drawPiece(piece, x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    for (const [r, c] of piece.cells) {
      ctx.drawImage(tiles[piece.color], x + c * size, y + r * size, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function drawBoard(now) {
    roundRect(ctx, boardX - 6, boardY - 6, boardPx + 12, boardPx + 12, 16);
    ctx.fillStyle = 'rgba(8,6,24,0.55)';
    ctx.fill();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = boardX + c * cell;
        const y = boardY + r * cell;
        const value = state.board[r * SIZE + c];
        if (value) {
          ctx.drawImage(tiles[value], x, y, cell, cell);
        } else {
          roundRect(ctx, x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.18);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fill();
        }
      }
    }

    if (drag && drag.snap) {
      const { r, c, rows, cols } = drag.snap;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      rows.forEach((row) => ctx.fillRect(boardX, boardY + row * cell, boardPx, cell));
      cols.forEach((col) => ctx.fillRect(boardX + col * cell, boardY, cell, boardPx));
      drawPiece(drag.piece, boardX + c * cell, boardY + r * cell, cell, 0.42);
    }

    fx.clearing = fx.clearing.filter((item) => {
      const t = (now - item.start - item.delay) / 260;
      if (t >= 1) return false;
      const scale = t < 0 ? 1 : 1 - easeOut(t);
      const size = cell * scale;
      const offset = (cell - size) / 2;
      ctx.drawImage(tiles[item.color], boardX + item.c * cell + offset, boardY + item.r * cell + offset, size, size);
      return true;
    });
  }

  function drawTray(now) {
    state.tray.forEach((piece, slot) => {
      if (!piece || (drag && drag.slot === slot) || (returning && returning.slot === slot)) return;
      const center = slotCenter(slot);
      const pop = fx.pops[slot];
      const t = pop ? Math.min(1, (now - pop) / 240) : 1;
      if (t >= 1) fx.pops[slot] = 0;
      const size = miniCell * (0.6 + 0.4 * easeOut(t));
      const fits = G.anyFit(state.board, piece.cells);
      drawPiece(
        piece,
        center.x - (piece.width * size) / 2,
        center.y - (piece.height * size) / 2,
        size,
        (fits ? 1 : 0.32) * t,
      );
    });
  }

  function drawEffects(now) {
    fx.particles = fx.particles.filter((p) => {
      const t = (now - p.start) / p.life;
      if (t >= 1) return false;
      const age = (now - p.start) / 1000;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(p.x + p.vx * age, p.y + p.vy * age + 260 * age * age);
      ctx.rotate(p.spin * age);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fx.floaters = fx.floaters.filter((f) => {
      const t = (now - f.start) / f.life;
      if (t >= 1) return false;
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      ctx.font = `800 ${f.size}px system-ui, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,18,43,0.85)';
      const y = f.y - easeOut(t) * cell;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (fx.shake) {
      const t = (now - fx.shake.start) / 260;
      if (t >= 1) {
        fx.shake = null;
      } else {
        const m = fx.shake.magnitude * (1 - t);
        ctx.translate(Math.sin(now * 0.09) * m, Math.cos(now * 0.11) * m);
      }
    }

    drawBoard(now);
    drawTray(now);

    if (state.moves === 0 && !drag) {
      ctx.font = `600 ${Math.max(15, cell * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(246,243,255,0.7)';
      ctx.fillText(TEXT.hint, W / 2, boardY + boardPx / 2);
    }

    if (returning) {
      const t = Math.min(1, (now - returning.start) / 140);
      const center = slotCenter(returning.slot);
      const size = returning.size + (miniCell - returning.size) * easeOut(t);
      const piece = returning.piece;
      const endX = center.x - (piece.width * miniCell) / 2;
      const endY = center.y - (piece.height * miniCell) / 2;
      drawPiece(
        piece,
        returning.x + (endX - returning.x) * easeOut(t),
        returning.y + (endY - returning.y) * easeOut(t),
        size,
        1,
      );
      if (t >= 1) returning = null;
    }

    if (drag) drawPiece(drag.piece, drag.left, drag.top, cell, 1);
    drawEffects(now);
  }

  function isBusy() {
    return Boolean(
      drag || returning || fx.shake || fx.clearing.length || fx.particles.length ||
      fx.floaters.length || fx.pops.some(Boolean),
    );
  }

  function frame(now) {
    raf = 0;
    draw(now);
    if (isBusy()) requestDraw();
  }

  function requestDraw() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // Sound -------------------------------------------------------------------

  let audio = null;

  function unlockAudio() {
    if (!audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) audio = new Context();
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(freq, delay, duration, type, gain) {
    if (muted || !audio) return;
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  function haptic(ms) {
    if (muted) return;
    if (window.Native) window.Native.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  }

  function soundPlace() {
    tone(180, 0, 0.09, 'triangle', 0.22);
    haptic(10);
  }

  function soundClear(lines, combo) {
    const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
    const root = Math.min(combo - 1, 4);
    for (let i = 0; i < lines + 2; i++) {
      tone(scale[Math.min(root + i, scale.length - 1)], i * 0.07, 0.24, 'sine', 0.16);
    }
    haptic(30);
  }

  function soundOver() {
    [392, 330, 262].forEach((freq, i) => tone(freq, i * 0.16, 0.3, 'sine', 0.16));
    haptic(60);
  }

  // Effects -----------------------------------------------------------------

  function spawnClear(result, now) {
    const originX = boardX + (result.cols.length ? result.cols[0] + 0.5 : SIZE / 2) * cell;
    const originY = boardY + (result.rows.length ? result.rows[0] + 0.5 : SIZE / 2) * cell;

    result.cleared.forEach(({ r, c, color }) => {
      const x = boardX + (c + 0.5) * cell;
      const y = boardY + (r + 0.5) * cell;
      const delay = Math.hypot(x - originX, y - originY) * 0.45;
      fx.clearing.push({ r, c, color, start: now, delay });
      if (reducedMotion) return;
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 160;
        fx.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 80,
          size: cell * (0.09 + Math.random() * 0.1),
          spin: (Math.random() - 0.5) * 12,
          color: PALETTE[color],
          start: now + delay,
          life: 620 + Math.random() * 300,
        });
      }
    });

    if (!reducedMotion && result.lines >= 2) {
      fx.shake = { start: now, magnitude: Math.min(8, 2 + result.lines * 1.5) };
    }
  }

  function addFloater(text, x, y, size, color) {
    fx.floaters.push({ text, x, y, size, color, start: performance.now(), life: 900 });
  }

  function updateHud(bump) {
    const score = $('score');
    score.textContent = state.score;
    $('best').textContent = Math.max(best, state.score);
    if (bump) {
      score.classList.remove('bump');
      void score.offsetWidth;
      score.classList.add('bump');
    }
  }

  // Overlay -----------------------------------------------------------------

  function showOverlay({ title, score, detail, primary, secondary, action }) {
    $('overlay-title').textContent = title;
    $('overlay-score').textContent = score;
    $('overlay-detail').textContent = detail;
    $('overlay-primary').textContent = primary;
    $('overlay-secondary').textContent = secondary || '';
    $('overlay-secondary').hidden = !secondary;
    overlayAction = action;
    $('overlay').hidden = false;
  }

  function showGameOver() {
    const record = state.score > startBest && state.score > 0;
    soundOver();
    showOverlay({
      title: record ? TEXT.record : TEXT.over,
      score: String(state.score),
      detail: record ? '' : TEXT.bestScore(best),
      primary: TEXT.again,
      action: newGame,
    });
  }

  function newGame() {
    startBest = best;
    state = G.createGame({ best });
    fx.clearing = [];
    fx.particles = [];
    fx.floaters = [];
    fx.shake = null;
    const now = performance.now();
    fx.pops = state.tray.map(() => now);
    saveGame();
    updateHud(false);
    requestDraw();
  }

  function saveGame() {
    store(SAVE_KEY, state.gameOver ? null : JSON.stringify(state));
  }

  // Input -------------------------------------------------------------------

  function findSnap(piece, left, top) {
    const col = (left - boardX) / cell;
    const row = (top - boardY) / cell;
    const baseR = Math.round(row);
    const baseC = Math.round(col);
    const candidates = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = baseR + dr;
        const c = baseC + dc;
        const distance = Math.hypot(r - row, c - col);
        if (distance < 0.85 && G.canPlace(state.board, piece.cells, r, c)) {
          candidates.push({ r, c, distance });
        }
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    if (!candidates.length) return null;
    const { r, c } = candidates[0];
    const { rows, cols } = G.applyPiece(state.board, piece.cells, r, c, piece.color);
    return { r, c, rows, cols };
  }

  function moveDrag(event) {
    drag.left = event.clientX - (drag.piece.width * cell) / 2;
    drag.top = event.clientY - drag.lift - drag.piece.height * cell;
    drag.snap = findSnap(drag.piece, drag.left, drag.top);
  }

  function onPointerDown(event) {
    unlockAudio();
    if (drag || returning || !$('overlay').hidden || event.clientY < trayTop - 8) return;
    const slot = Math.floor(((event.clientX - boardX) / boardPx) * G.TRAY_SIZE);
    const piece = state.tray[Math.min(G.TRAY_SIZE - 1, Math.max(0, slot))];
    if (!piece) return;
    drag = {
      slot: Math.min(G.TRAY_SIZE - 1, Math.max(0, slot)),
      piece,
      lift: event.pointerType === 'mouse' ? cell * 0.3 : cell * 1.3,
      snap: null,
      left: 0,
      top: 0,
    };
    moveDrag(event);
    canvas.setPointerCapture(event.pointerId);
    requestDraw();
  }

  function onPointerMove(event) {
    if (!drag) return;
    moveDrag(event);
    requestDraw();
  }

  function cancelDrag() {
    returning = {
      slot: drag.slot,
      piece: drag.piece,
      x: drag.left,
      y: drag.top,
      size: cell,
      start: performance.now(),
    };
    drag = null;
    requestDraw();
  }

  function onPointerUp() {
    if (!drag) return;
    const { slot, snap } = drag;
    if (!snap) {
      cancelDrag();
      return;
    }
    drag = null;
    commit(slot, snap.r, snap.c);
  }

  function commit(slot, r, c) {
    const piece = state.tray[slot];
    const result = G.place(state, slot, r, c);
    if (!result) return;

    const now = performance.now();
    if (state.score > best) {
      best = state.score;
      store(BEST_KEY, String(best));
    }

    const x = Math.max(boardX + cell, Math.min(boardX + boardPx - cell, boardX + (c + piece.width / 2) * cell));
    const y = boardY + (r + piece.height / 2) * cell;
    if (result.lines) {
      spawnClear(result, now);
      addFloater(`+${result.points}`, x, y, Math.max(22, cell * 0.7), '#ffffff');
      if (result.combo >= 2) {
        addFloater(TEXT.combo(result.combo), W / 2, boardY + boardPx * 0.3, Math.max(28, cell * 0.85), '#ffb347');
      }
      if (result.perfect) {
        addFloater(TEXT.perfect, W / 2, boardY + boardPx * 0.5, Math.max(34, cell), '#ff7ac6');
      }
      soundClear(result.lines, result.combo);
    } else {
      soundPlace();
    }

    if (result.dealt) fx.pops = state.tray.map(() => now);
    saveGame();
    updateHud(result.lines > 0);
    requestDraw();
    if (result.gameOver) setTimeout(showGameOver, result.lines ? 900 : 500);
  }

  function setMuted(value) {
    muted = value;
    store(MUTED_KEY, muted ? '1' : '0');
    $('sound').setAttribute('aria-pressed', String(!muted));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', () => drag && cancelDrag());

  $('sound').addEventListener('click', () => {
    unlockAudio();
    setMuted(!muted);
  });

  $('restart').addEventListener('click', () => {
    unlockAudio();
    if (drag || state.gameOver) return;
    showOverlay({
      title: TEXT.restartTitle,
      score: '',
      detail: TEXT.restartDetail,
      primary: TEXT.restart,
      secondary: TEXT.cancel,
      action: newGame,
    });
  });

  $('overlay-primary').addEventListener('click', () => {
    $('overlay').hidden = true;
    if (overlayAction) overlayAction();
  });

  $('overlay-secondary').addEventListener('click', () => {
    $('overlay').hidden = true;
  });

  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
  });

  document.documentElement.lang = KOREAN ? 'ko' : 'en';
  $('best-label').textContent = TEXT.best;
  setMuted(muted);
  updateHud(false);
  layout();
  if (state.gameOver) showGameOver();
  else fx.pops = state.tray.map(() => performance.now());
  requestDraw();
})();
