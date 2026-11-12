// 바다 생물과 손님 그림. 전부 캔버스 경로로 직접 그린다.
(function (root) {
  const TAU = Math.PI * 2;

  // 바위 모양은 칸 번호로 정해져 매번 같다.
  function rockShape(i) {
    const pts = [];
    let seed = (i + 3) * 7919;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let k = 0; k < 9; k += 1) pts.push(0.82 + rnd() * 0.22);
    return pts;
  }

  function blob(ctx, x, y, r, pts, squash = 0.78) {
    ctx.beginPath();
    const n = pts.length;
    for (let k = 0; k <= n; k += 1) {
      const a = (k / n) * TAU;
      const rr = r * pts[k % n];
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * squash;
      if (k === 0) ctx.moveTo(px, py);
      else {
        const pa = ((k - 0.5) / n) * TAU;
        const pr = r * ((pts[(k - 1) % n] + pts[k % n]) / 2) * 1.06;
        ctx.quadraticCurveTo(x + Math.cos(pa) * pr, y + Math.sin(pa) * pr * squash, px, py);
      }
    }
    ctx.closePath();
  }

  function rock(ctx, i, x, y, r, selected) {
    const pts = rockShape(i);
    ctx.save();
    ctx.fillStyle = 'rgba(4, 30, 38, 0.35)';
    blob(ctx, x + r * 0.08, y + r * 0.14, r, pts);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, '#6f8f93');
    g.addColorStop(1, '#2f4d55');
    ctx.fillStyle = g;
    blob(ctx, x, y, r, pts);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210, 236, 230, 0.18)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
    if (selected) {
      ctx.setLineDash([r * 0.18, r * 0.12]);
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = Math.max(2, r * 0.09);
      blob(ctx, x, y, r * 1.12, pts);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  const DRAW = [
    function kelp(ctx, x, y, s, t) {
      ctx.lineCap = 'round';
      const blades = [[-0.32, '#2f8f4e'], [0.02, '#46b062'], [0.3, '#3a9d58']];
      for (const [dx, color] of blades) {
        ctx.strokeStyle = color;
        ctx.lineWidth = s * 0.17;
        ctx.beginPath();
        const bx = x + dx * s;
        ctx.moveTo(bx, y + s * 0.45);
        const sw = Math.sin(t * 1.6 + dx * 6) * s * 0.18;
        ctx.bezierCurveTo(bx - s * 0.25, y + s * 0.1, bx + s * 0.25 + sw, y - s * 0.3, bx + sw * 1.4, y - s * 0.75);
        ctx.stroke();
      }
      ctx.fillStyle = '#9ee08e';
      ctx.beginPath();
      ctx.arc(x + Math.sin(t * 1.6) * s * 0.25, y - s * 0.72, s * 0.08, 0, TAU);
      ctx.fill();
    },
    function snail(ctx, x, y, s, t) {
      const bob = Math.sin(t * 2) * s * 0.03;
      ctx.fillStyle = '#e9b98a';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.12, y + s * 0.32 + bob, s * 0.5, s * 0.14, 0, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(x - s * 0.15, y - s * 0.2, s * 0.05, x, y, s * 0.6);
      g.addColorStop(0, '#f6c66b');
      g.addColorStop(1, '#a8582a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x - s * 0.05, y + bob, s * 0.42, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#6f3417';
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) {
        const rr = s * 0.36 * (1 - a / (TAU * 2.5));
        const px = x - s * 0.05 + Math.cos(a) * rr;
        const py = y + bob + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.strokeStyle = '#e9b98a';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.26 + bob);
      ctx.lineTo(x + s * 0.62, y + s * 0.02 + bob);
      ctx.stroke();
    },
    function anemone(ctx, x, y, s, t) {
      ctx.lineCap = 'round';
      for (let k = 0; k < 11; k += 1) {
        const a = -Math.PI + (k / 10) * Math.PI;
        const sw = Math.sin(t * 2.2 + k) * 0.18;
        ctx.strokeStyle = k % 2 ? '#ff8fb1' : '#f56d97';
        ctx.lineWidth = s * 0.11;
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.15);
        ctx.quadraticCurveTo(x + Math.cos(a + sw) * s * 0.4, y + Math.sin(a) * s * 0.4, x + Math.cos(a + sw * 2) * s * 0.7, y + Math.sin(a + sw) * s * 0.62);
        ctx.stroke();
        ctx.fillStyle = '#ffd3e1';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a + sw * 2) * s * 0.7, y + Math.sin(a + sw) * s * 0.62, s * 0.06, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#c23d6a';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.28, s * 0.36, s * 0.2, 0, 0, TAU);
      ctx.fill();
    },
    function sponge(ctx, x, y, s, t) {
      const pulse = 1 + Math.sin(t * 1.3) * 0.03;
      const g = ctx.createLinearGradient(x, y - s * 0.6, x, y + s * 0.5);
      g.addColorStop(0, '#ffd34d');
      g.addColorStop(1, '#e48a1f');
      ctx.fillStyle = g;
      blob(ctx, x, y, s * 0.55 * pulse, [1, 0.86, 1.05, 0.92, 1.1, 0.9, 1, 0.95], 1.05);
      ctx.fill();
      ctx.fillStyle = '#a3520e';
      for (const [dx, dy, r] of [[-0.2, -0.2, 0.09], [0.15, -0.1, 0.11], [-0.05, 0.15, 0.08], [0.25, 0.22, 0.07], [-0.3, 0.12, 0.06]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 1.3, 0, 0, TAU);
        ctx.fill();
      }
    },
    function urchin(ctx, x, y, s, t) {
      ctx.strokeStyle = '#3e1f63';
      ctx.lineWidth = s * 0.05;
      ctx.lineCap = 'round';
      for (let k = 0; k < 22; k += 1) {
        const a = (k / 22) * TAU + Math.sin(t + k) * 0.04;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * s * 0.66, y + Math.sin(a) * s * 0.6);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(x - s * 0.12, y - s * 0.12, s * 0.04, x, y, s * 0.36);
      g.addColorStop(0, '#b081e6');
      g.addColorStop(1, '#4b2582');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.34, 0, TAU);
      ctx.fill();
    },
    function coral(ctx, x, y, s, t) {
      ctx.strokeStyle = '#ff6f5e';
      ctx.lineCap = 'round';
      const branch = (bx, by, len, ang, w, depth) => {
        const sw = Math.sin(t * 0.9 + depth) * 0.05;
        const ex = bx + Math.cos(ang + sw) * len;
        const ey = by + Math.sin(ang + sw) * len;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        if (depth > 0) {
          branch(ex, ey, len * 0.7, ang - 0.5, w * 0.7, depth - 1);
          branch(ex, ey, len * 0.7, ang + 0.45, w * 0.7, depth - 1);
        } else {
          ctx.fillStyle = '#ffd2c4';
          ctx.beginPath();
          ctx.arc(ex, ey, w * 0.6, 0, TAU);
          ctx.fill();
        }
      };
      branch(x, y + s * 0.5, s * 0.42, -Math.PI / 2, s * 0.16, 3);
    },
    function star(ctx, x, y, s, t) {
      const rot = Math.sin(t * 0.4) * 0.1;
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      for (let k = 0; k <= 10; k += 1) {
        const a = rot - Math.PI / 2 + (k / 10) * TAU;
        const rr = k % 2 ? s * 0.26 : s * 0.66;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c95f13';
      ctx.lineWidth = s * 0.04;
      ctx.stroke();
      ctx.fillStyle = '#ffe1b8';
      for (let k = 0; k < 5; k += 1) {
        const a = rot - Math.PI / 2 + (k / 5) * TAU;
        for (const d of [0.2, 0.36]) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * s * d, y + Math.sin(a) * s * d, s * 0.04, 0, TAU);
          ctx.fill();
        }
      }
    },
    function lantern(ctx, x, y, s, t) {
      const bob = Math.sin(t * 1.4) * s * 0.08;
      const glow = ctx.createRadialGradient(x, y - s * 0.1 + bob, 0, x, y + bob, s * 0.9);
      glow.addColorStop(0, 'rgba(180, 255, 236, 0.55)');
      glow.addColorStop(1, 'rgba(180, 255, 236, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y + bob, s * 0.9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 240, 255, 0.8)';
      ctx.lineWidth = s * 0.04;
      for (let k = -2; k <= 2; k += 1) {
        ctx.beginPath();
        ctx.moveTo(x + k * s * 0.12, y + bob);
        ctx.quadraticCurveTo(x + k * s * 0.14 + Math.sin(t * 2 + k) * s * 0.12, y + s * 0.35 + bob, x + k * s * 0.1, y + s * 0.65 + bob);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(206, 255, 244, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x, y + bob, s * 0.4, s * 0.36, 0, Math.PI, TAU);
      ctx.quadraticCurveTo(x, y + s * 0.1 + bob, x - s * 0.4, y + bob);
      ctx.fill();
      ctx.fillStyle = '#fff6b0';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.14 + bob, s * 0.1, 0, TAU);
      ctx.fill();
    },
  ];

  function organism(ctx, sp, x, y, s, t) {
    ctx.save();
    DRAW[sp](ctx, x, y, s, t);
    ctx.restore();
  }

  // 손님은 몇 가지 몸꼴에 색을 입혀 그린다. dir은 헤엄치는 방향(1 오른쪽, -1 왼쪽).
  const LOOKS = {
    goby: { kind: 'fish', body: '#c7b48a', fin: '#8f7b52', spots: '#5f4f30', long: 1.5 },
    shrimp: { kind: 'shrimp', body: '#ff9d7a' },
    hermit: { kind: 'crab', body: '#e2563d', shell: '#d9c6a0' },
    wrasse: { kind: 'fish', body: '#4fb7e8', fin: '#2a6fb0', stripe: '#ffe066', long: 1.25 },
    seahorse: { kind: 'seahorse', body: '#f2c14e' },
    blenny: { kind: 'fish', body: '#8fae5a', fin: '#5b7a2c', spots: '#3e5420', long: 1.7 },
    nudibranch: { kind: 'slug', body: '#8f5bea', tips: '#ffb347' },
    turtle: { kind: 'turtle', body: '#7fae6b', shell: '#5c7a3c' },
    ray: { kind: 'ray', body: '#5c7d8f' },
    octopus: { kind: 'octopus', body: '#d1605d' },
    moonjelly: { kind: 'jelly', body: 'rgba(220, 230, 255, 0.8)' },
    whale: { kind: 'whale', body: '#36546a' },
  };

  function creature(ctx, id, x, y, s, t, dir = 1) {
    const L = LOOKS[id];
    if (!L) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const wag = Math.sin(t * 6) * 0.25;
    if (L.kind === 'fish') {
      const len = s * L.long;
      ctx.fillStyle = L.fin;
      ctx.beginPath();
      ctx.moveTo(-len * 0.45, 0);
      ctx.lineTo(-len * 0.75, -s * 0.3 + wag * s * 0.3);
      ctx.lineTo(-len * 0.75, s * 0.3 + wag * s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.5, s * 0.32, 0, 0, TAU);
      ctx.fill();
      if (L.stripe) {
        ctx.fillStyle = L.stripe;
        ctx.fillRect(-len * 0.1, -s * 0.3, len * 0.1, s * 0.6);
      }
      if (L.spots) {
        ctx.fillStyle = L.spots;
        for (let k = 0; k < 4; k += 1) {
          ctx.beginPath();
          ctx.arc(-len * 0.3 + k * len * 0.16, -s * 0.05 + (k % 2) * s * 0.12, s * 0.05, 0, TAU);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#10232a';
      ctx.beginPath();
      ctx.arc(len * 0.3, -s * 0.07, s * 0.06, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'shrimp') {
      ctx.strokeStyle = L.body;
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, Math.PI * 0.1, Math.PI * 1.1);
      ctx.stroke();
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(s * 0.38, -s * 0.05);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.5, s * 1.1, -s * 0.2 + wag * s * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#10232a';
      ctx.beginPath();
      ctx.arc(s * 0.32, -s * 0.12, s * 0.05, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'crab') {
      ctx.fillStyle = L.shell;
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.05, s * 0.45, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.ellipse(s * 0.3, s * 0.05, s * 0.28, s * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = L.body;
      ctx.lineWidth = s * 0.07;
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.moveTo(s * (0.1 + k * 0.15), s * 0.15);
        ctx.lineTo(s * (0.05 + k * 0.18), s * 0.4 + Math.sin(t * 8 + k) * s * 0.05);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(s * 0.62, -s * 0.05, s * 0.12, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'seahorse') {
      ctx.strokeStyle = L.body;
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.26;
      ctx.beginPath();
      ctx.moveTo(s * 0.05, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.35, -s * 0.05, 0, s * 0.3);
      ctx.quadraticCurveTo(-s * 0.25, s * 0.6, s * 0.05, s * 0.6);
      ctx.stroke();
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.moveTo(s * 0.05, -s * 0.5);
      ctx.lineTo(s * 0.4, -s * 0.45);
      ctx.stroke();
      ctx.fillStyle = '#10232a';
      ctx.beginPath();
      ctx.arc(s * 0.1, -s * 0.55, s * 0.05, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'slug') {
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = L.tips;
      for (let k = 0; k < 6; k += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.45 + k * s * 0.16, -s * 0.2 + Math.sin(t * 3 + k) * s * 0.03, s * 0.08, 0, TAU);
        ctx.fill();
      }
    } else if (L.kind === 'turtle') {
      ctx.fillStyle = L.body;
      const fl = Math.sin(t * 3) * s * 0.15;
      for (const [fx, fy] of [[0.35, -0.4], [0.35, 0.4], [-0.4, -0.3], [-0.4, 0.3]]) {
        ctx.beginPath();
        ctx.ellipse(fx * s, fy * s + (fy < 0 ? -fl : fl), s * 0.22, s * 0.1, fy * 1.2, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(s * 0.65, 0, s * 0.18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = L.shell;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.55, s * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3e5426';
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.3, s * 0.2);
      ctx.moveTo(-s * 0.3, s * 0.2);
      ctx.lineTo(s * 0.3, -s * 0.2);
      ctx.stroke();
    } else if (L.kind === 'ray') {
      const fl = Math.sin(t * 2.5) * s * 0.15;
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.moveTo(s * 0.6, 0);
      ctx.quadraticCurveTo(0, -s * 0.9 - fl, -s * 0.4, 0);
      ctx.quadraticCurveTo(0, s * 0.9 + fl, s * 0.6, 0);
      ctx.fill();
      ctx.strokeStyle = L.body;
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0);
      ctx.lineTo(-s * 1.1, wag * s * 0.3);
      ctx.stroke();
    } else if (L.kind === 'octopus') {
      ctx.strokeStyle = L.body;
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.1;
      for (let k = 0; k < 6; k += 1) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, (k - 2.5) * s * 0.08);
        ctx.quadraticCurveTo(-s * 0.6, (k - 2.5) * s * 0.2 + Math.sin(t * 4 + k) * s * 0.2, -s * 0.95, (k - 2.5) * s * 0.18);
        ctx.stroke();
      }
      ctx.fillStyle = L.body;
      ctx.beginPath();
      ctx.ellipse(s * 0.2, 0, s * 0.42, s * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(s * 0.15, -s * 0.12, s * 0.07, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'jelly') {
      ctx.rotate(-Math.PI / 2 * dir);
      DRAW[7](ctx, 0, 0, s * 0.9, t);
      ctx.fillStyle = 'rgba(190, 200, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(0, -s * 0.08, s * 0.2, 0, TAU);
      ctx.fill();
    } else if (L.kind === 'whale') {
      ctx.fillStyle = 'rgba(20, 40, 60, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 1.1, 0);
      ctx.lineTo(-s * 1.6, -s * 0.35 + wag * s * 0.2);
      ctx.lineTo(-s * 1.5, 0);
      ctx.lineTo(-s * 1.6, s * 0.35 + wag * s * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 손님이 아직 오지 않았을 때 보여 줄 그림자.
  function silhouette(ctx, id, x, y, s) {
    ctx.save();
    creature(ctx, id, x, y, s, 0, 1);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#c9bfa5';
    ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
    ctx.restore();
  }

  root.Art = { rock, organism, creature, silhouette, TAU };
})(typeof window !== 'undefined' ? window : globalThis);
