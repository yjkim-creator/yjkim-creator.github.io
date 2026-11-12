// Pure game rules: no DOM, no timers. State is plain JSON so it can be saved as-is.
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.BloomGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SIZE = 8;
  const COLORS = 7;
  const TRAY_SIZE = 3;
  const COMBO_GRACE = 3; // moves without a clear before the combo drops
  const PERFECT_BONUS = 300;
  const MAX_SEARCH_NODES = 20000;

  const BASE_SHAPES = [
    { weight: 2, rows: ['#'] },
    { weight: 3, rows: ['##'] },
    { weight: 4, rows: ['###'] },
    { weight: 4, rows: ['####'] },
    { weight: 2, rows: ['#####'] },
    { weight: 5, rows: ['##', '##'] },
    { weight: 3, rows: ['###', '###'] },
    { weight: 2, rows: ['###', '###', '###'] },
    { weight: 4, rows: ['#.', '##'] },
    { weight: 4, rows: ['#.', '#.', '##'] },
    { weight: 4, rows: ['###', '.#.'] },
    { weight: 3, rows: ['##.', '.##'] },
    { weight: 2, rows: ['#..', '#..', '###'] },
  ];

  function normalize(cells) {
    const minR = Math.min(...cells.map((p) => p[0]));
    const minC = Math.min(...cells.map((p) => p[1]));
    return cells
      .map(([r, c]) => [r - minR, c - minC])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  function orientations(cells) {
    const seen = new Map();
    let current = cells;
    for (let i = 0; i < 4; i++) {
      current = current.map(([r, c]) => [c, -r]);
      for (const variant of [current, current.map(([r, c]) => [r, -c])]) {
        const shape = normalize(variant);
        seen.set(JSON.stringify(shape), shape);
      }
    }
    return [...seen.values()];
  }

  const SHAPES = BASE_SHAPES.flatMap(({ weight, rows }) => {
    const cells = [];
    rows.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && cells.push([r, c])));
    const variants = orientations(cells);
    return variants.map((shape) => ({ cells: shape, weight: weight / variants.length }));
  });

  function nextRandom(state) {
    state.rng = (state.rng + 0x6d2b79f5) | 0;
    let t = state.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function difficulty(score) {
    return Math.min(1, score / 12000);
  }

  function canPlace(board, cells, row, col) {
    for (const [r, c] of cells) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || y >= SIZE || x < 0 || x >= SIZE || board[y * SIZE + x]) return false;
    }
    return true;
  }

  function anyFit(board, cells) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlace(board, cells, r, c)) return true;
      }
    }
    return false;
  }

  // Places a piece on a copy of the board and removes every completed line.
  function applyPiece(board, cells, row, col, value) {
    const next = board.slice();
    for (const [r, c] of cells) next[(row + r) * SIZE + col + c] = value;

    const rows = [];
    const cols = [];
    for (let i = 0; i < SIZE; i++) {
      let rowFull = true;
      let colFull = true;
      for (let j = 0; j < SIZE; j++) {
        if (!next[i * SIZE + j]) rowFull = false;
        if (!next[j * SIZE + i]) colFull = false;
      }
      if (rowFull) rows.push(i);
      if (colFull) cols.push(i);
    }

    const cleared = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (rows.includes(r) || cols.includes(c)) {
          cleared.push({ r, c, color: next[r * SIZE + c] });
          next[r * SIZE + c] = 0;
        }
      }
    }
    return { board: next, rows, cols, cleared };
  }

  function canPlaceAll(board, pieces, budget = { nodes: MAX_SEARCH_NODES }) {
    if (pieces.length === 0) return true;
    for (let i = 0; i < pieces.length; i++) {
      const rest = pieces.filter((_, j) => j !== i);
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!canPlace(board, pieces[i].cells, r, c)) continue;
          if (--budget.nodes < 0) return false;
          const next = applyPiece(board, pieces[i].cells, r, c, 1).board;
          if (canPlaceAll(next, rest, budget)) return true;
        }
      }
    }
    return false;
  }

  function randomShape(state, shapes, d) {
    const weights = shapes.map((s) => s.weight * (1 + (d * (s.cells.length - 4)) / 4));
    let roll = nextRandom(state) * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < shapes.length; i++) {
      roll -= weights[i];
      if (roll < 0) return shapes[i];
    }
    return shapes[shapes.length - 1];
  }

  function makePiece(state, shape) {
    return {
      cells: shape.cells,
      color: 1 + Math.floor(nextRandom(state) * COLORS),
      height: 1 + Math.max(...shape.cells.map((p) => p[0])),
      width: 1 + Math.max(...shape.cells.map((p) => p[1])),
    };
  }

  // New trays are always playable. Early on the whole tray is guaranteed to fit;
  // as the score climbs that guarantee fades to "at least one piece fits".
  function deal(state) {
    const d = difficulty(state.score);
    const strict = nextRandom(state) >= d * 0.65;
    for (let attempt = 0; attempt < 24; attempt++) {
      const pieces = [];
      for (let i = 0; i < TRAY_SIZE; i++) pieces.push(makePiece(state, randomShape(state, SHAPES, d)));
      const ok = strict
        ? canPlaceAll(state.board, pieces)
        : pieces.some((p) => anyFit(state.board, p.cells));
      if (ok) return pieces;
    }
    // A full board always clears, so a single cell always fits here.
    const rescue = SHAPES.filter((s) => s.cells.length <= 3 && anyFit(state.board, s.cells));
    const pieces = [];
    for (let i = 0; i < TRAY_SIZE; i++) pieces.push(makePiece(state, randomShape(state, rescue, 0)));
    return pieces;
  }

  function createGame({ seed = Date.now() | 0, best = 0 } = {}) {
    const state = {
      board: new Array(SIZE * SIZE).fill(0),
      tray: [],
      score: 0,
      best,
      combo: 0,
      idle: 0,
      moves: 0,
      gameOver: false,
      rng: seed | 0,
    };
    state.tray = deal(state);
    return state;
  }

  function linePoints(lines, combo) {
    return Math.round(lines * lines * 10 * (1 + (combo - 1) * 0.5));
  }

  function place(state, slot, row, col) {
    const piece = state.tray[slot];
    if (state.gameOver || !piece || !canPlace(state.board, piece.cells, row, col)) return null;

    const result = applyPiece(state.board, piece.cells, row, col, piece.color);
    const lines = result.rows.length + result.cols.length;
    let points = piece.cells.length;

    if (lines > 0) {
      state.combo += 1;
      state.idle = 0;
      points += linePoints(lines, state.combo);
    } else if (++state.idle >= COMBO_GRACE) {
      state.combo = 0;
    }

    const perfect = lines > 0 && result.board.every((v) => v === 0);
    if (perfect) points += PERFECT_BONUS;

    state.board = result.board;
    state.tray[slot] = null;
    state.score += points;
    state.best = Math.max(state.best, state.score);
    state.moves += 1;

    const dealt = state.tray.every((p) => p === null);
    if (dealt) state.tray = deal(state);
    state.gameOver = !state.tray.some((p) => p && anyFit(state.board, p.cells));

    return {
      rows: result.rows,
      cols: result.cols,
      cleared: result.cleared,
      lines,
      points,
      combo: state.combo,
      perfect,
      dealt,
      gameOver: state.gameOver,
    };
  }

  return {
    SIZE,
    COLORS,
    TRAY_SIZE,
    SHAPES,
    PERFECT_BONUS,
    createGame,
    place,
    canPlace,
    anyFit,
    applyPiece,
    canPlaceAll,
    deal,
    difficulty,
    linePoints,
  };
});
