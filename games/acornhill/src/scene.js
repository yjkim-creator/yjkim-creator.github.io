// 도토리 언덕의 3D 무대: 가을 언덕, 나무 패, 다람쥐, 떨어지는 낙엽. 게임 규칙은 모른다.
(function () {
  const T = THREE;
  const CARD_W = 1;
  const CARD_D = 1.36;
  const CARD_H = 0.03;
  const HALF = 0.52; // 반 장 간격
  const ROW = 0.62; // 줄 간격
  const SUIT_COLORS = ['#8a5424', '#cf452c', '#7a4aa0', '#3d7a47'];
  const PLANK_Z = 1.85;
  const STOCK_POS = new T.Vector3(-1.55, 0.27, PLANK_Z);
  const PILE_POS = new T.Vector3(0.25, 0.27, PLANK_Z);

  // ---------- 그림 도구 ----------
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // 무늬 네 가지를 (cx, cy) 가운데에 크기 s로 그린다.
  function drawSuit(g, suit, cx, cy, s) {
    g.save();
    g.translate(cx, cy);
    g.scale(s / 100, s / 100);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    if (suit === 0) { // 도토리
      g.fillStyle = '#b8732f';
      g.beginPath(); g.ellipse(0, 14, 30, 36, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.ellipse(-11, 8, 7, 14, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6b3f1a';
      g.beginPath(); g.ellipse(0, -14, 38, 20, 0, Math.PI, 0); g.lineTo(38, -10); g.quadraticCurveTo(0, 2, -38, -10); g.fill();
      g.strokeStyle = '#8f5a2a'; g.lineWidth = 3;
      for (let i = -30; i <= 30; i += 12) { g.beginPath(); g.moveTo(i, -28); g.lineTo(i + 8, -8); g.stroke(); }
      g.strokeStyle = '#6b3f1a'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(0, -32); g.quadraticCurveTo(4, -44, 12, -46); g.stroke();
    } else if (suit === 1) { // 단풍잎
      g.fillStyle = '#d9472c';
      g.beginPath();
      const pts = 11;
      for (let i = 0; i <= pts * 2; i += 1) {
        const a = -Math.PI / 2 + (i / (pts * 2)) * Math.PI * 2;
        const lobe = [44, 20, 30, 16, 40, 18, 40, 16, 30, 20, 44][(i >> 1) % 11];
        const r = i % 2 === 0 ? lobe : lobe * 0.5;
        if (a > Math.PI * 0.38 && a < Math.PI * 0.62) continue; // 아래쪽은 잎자루 자리
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4);
      }
      g.closePath(); g.fill();
      g.strokeStyle = '#a3301c'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 46); g.lineTo(0, -34); g.moveTo(0, 0); g.lineTo(-26, -18); g.moveTo(0, 0); g.lineTo(26, -18); g.stroke();
    } else if (suit === 2) { // 버섯
      g.fillStyle = '#f3e3c3';
      roundRect(g, -14, -2, 28, 46, 10); g.fill();
      g.fillStyle = '#7a4aa0';
      g.beginPath(); g.moveTo(-46, 4); g.quadraticCurveTo(-44, -44, 0, -46); g.quadraticCurveTo(44, -44, 46, 4); g.quadraticCurveTo(0, 12, -46, 4); g.fill();
      g.fillStyle = '#fff6e6';
      [[-22, -18, 8], [6, -30, 7], [24, -10, 6], [-4, -8, 5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    } else { // 솔방울
      g.fillStyle = '#3d7a47';
      g.beginPath(); g.ellipse(0, 6, 30, 42, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#285532'; g.lineWidth = 4;
      for (let row = -26; row <= 38; row += 12) {
        for (let col = -24 + ((row / 12) % 2 ? 6 : 0); col <= 24; col += 14) {
          if ((col / 30) ** 2 + ((row - 6) / 42) ** 2 > 0.85) continue;
          g.beginPath(); g.arc(col, row, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        }
      }
      g.fillStyle = '#5a8f45';
      g.beginPath(); g.moveTo(-10, -34); g.lineTo(0, -52); g.lineTo(10, -34); g.fill();
    }
    g.restore();
  }

  const W = 200;
  const H = 272;
  function cardFace(card) {
    const rank = (card % 13) + 1;
    const suit = Math.floor(card / 13);
    const color = SUIT_COLORS[suit];
    return Kit3D.canvasTexture(W, H, (g) => {
      roundRect(g, 0, 0, W, H, 22);
      g.fillStyle = '#fbf2dc'; g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(160,110,60,.10)'; g.lineWidth = 2;
      for (let y = 10; y < H; y += 9) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(60, y + 5, 140, y - 5, W, y + 2); g.stroke(); }
      g.restore();
      roundRect(g, 9, 9, W - 18, H - 18, 14);
      g.strokeStyle = color; g.lineWidth = 5; g.stroke();
      g.fillStyle = color;
      g.font = '900 78px Georgia, "Times New Roman", serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(rank), rank >= 10 ? 62 : 50, 56);
      drawSuit(g, suit, 160, 46, 40);
      drawSuit(g, suit, W / 2, 178, 100);
    });
  }
  let backTex = null;
  function cardBack() {
    if (backTex) return backTex;
    backTex = Kit3D.canvasTexture(W, H, (g) => {
      roundRect(g, 0, 0, W, H, 22);
      const grad = g.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#9a5a2c'); grad.addColorStop(1, '#6e3d1d');
      g.fillStyle = grad; g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(255,220,170,.13)'; g.lineWidth = 3;
      for (let y = -20; y < H + 20; y += 11) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(70, y + 12, 120, y - 10, W, y + 6); g.stroke(); }
      g.restore();
      roundRect(g, 12, 12, W - 24, H - 24, 14);
      g.strokeStyle = '#f2c98a'; g.lineWidth = 4; g.stroke();
      g.setLineDash([6, 8]);
      roundRect(g, 22, 22, W - 44, H - 44, 10); g.lineWidth = 2; g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#f2c98a';
      g.beginPath(); g.arc(W / 2, H / 2, 46, 0, Math.PI * 2); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1;
      drawSuit(g, 0, W / 2, H / 2, 70);
    });
    return backTex;
  }

  // ---------- 무대 ----------
  function build(app) {
    const stage = Kit3D.stage(app, { sky: ['#f4a65f', '#fde3bf'], fog: 46, ground: '#6b4a2a', shadowSize: 7, fov: 46 });
    const { scene, camera } = stage;
    const world = { stage, scene, camera, cards: [], layoutFn: null };

    // 땅과 언덕: 높이 함수로 만든 판 하나.
    let mound = { cz: -3.4, h: 1.5, sx: 5.5, sz: 3.2 };
    const height = (x, z) => mound.h * Math.exp(-((x / mound.sx) ** 2) - (((z - mound.cz) / mound.sz) ** 2));
    const grassTex = Kit3D.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#c99a4a'; g.fillRect(0, 0, w, h);
      const r = Logic.rng(9);
      const cols = ['#b7863a', '#d6ab5b', '#a7772f', '#c76b33', '#d9893c'];
      for (let i = 0; i < 420; i += 1) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 5, 1 + r() * 2.5, r() * 3, 0, Math.PI * 2); g.fill();
      }
    });
    grassTex.wrapS = grassTex.wrapT = T.RepeatWrapping;
    grassTex.repeat.set(6, 6);
    const groundGeo = new T.PlaneGeometry(40, 40, 60, 60);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new T.Mesh(groundGeo, Kit3D.toon('#ffffff', { map: grassTex }));
    ground.receiveShadow = true;
    scene.add(ground);
    function shapeGround() {
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i += 1) pos.setY(i, height(pos.getX(i), pos.getZ(i)) - 0.02);
      pos.needsUpdate = true;
      groundGeo.computeVertexNormals();
    }

    // 앞쪽 나무 판(더미와 바구니 자리).
    const plankTex = Kit3D.canvasTexture(256, 96, (g, w, h) => {
      g.fillStyle = '#9c6234'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(60,30,10,.35)'; g.lineWidth = 2;
      for (let y = 6; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 170, y - 4, w, y + 1); g.stroke(); }
      g.fillStyle = 'rgba(60,30,10,.45)';
      g.beginPath(); g.ellipse(180, 50, 10, 5, 0, 0, Math.PI * 2); g.fill();
    });
    const plank = new T.Mesh(new T.BoxGeometry(5.6, 0.26, 1.9), [Kit3D.toon('#7a4723'), Kit3D.toon('#7a4723'), Kit3D.toon('#ffffff', { map: plankTex }), Kit3D.toon('#5e3518'), Kit3D.toon('#8a5428'), Kit3D.toon('#8a5428')]);
    plank.position.set(0.1, 0.12, PLANK_Z);
    plank.castShadow = true;
    plank.receiveShadow = true;
    scene.add(plank);
    // 바구니 받침(둥근 버들 바구니 테두리)
    const basket = new T.Mesh(new T.TorusGeometry(0.95, 0.09, 8, 28), Kit3D.toon('#d7a35a'));
    basket.rotation.x = Math.PI / 2;
    basket.scale.set(0.85, 1.05, 1);
    basket.position.set(PILE_POS.x, 0.27, PILE_POS.z);
    scene.add(basket);

    // 나무, 버섯, 돌
    const trunkMat = Kit3D.toon('#6d4325');
    const leafMats = ['#e8742a', '#cf4a2c', '#f0b43c', '#d9622b'].map((c) => Kit3D.toon(c));
    const blob = new T.IcosahedronGeometry(1, 1);
    function tree(x, z, s, k) {
      const g = new T.Group();
      const trunk = new T.Mesh(new T.CylinderGeometry(0.18, 0.28, 2.2, 7), trunkMat);
      trunk.position.y = 1.1; trunk.castShadow = true; g.add(trunk);
      [[0, 2.6, 0, 1.25], [-0.7, 2.2, 0.2, 0.85], [0.75, 2.3, -0.1, 0.9], [0.1, 3.3, -0.1, 0.8]].forEach(([px, py, pz, r], i) => {
        const m = new T.Mesh(blob, leafMats[(k + i) % leafMats.length]);
        m.position.set(px, py, pz); m.scale.setScalar(r); m.castShadow = i === 0; g.add(m);
      });
      g.position.set(x, height(x, z), z);
      g.scale.setScalar(s);
      scene.add(g);
      return g;
    }
    const trees = [tree(-5.4, -6.5, 1.25, 0), tree(5.6, -5.8, 1.1, 1), tree(-7.2, -2, 1, 2), tree(7.4, -1.2, 1.05, 3), tree(3.2, -11, 1.3, 1), tree(-2.8, -12, 1.2, 2)];
    const capMat = Kit3D.toon('#c8412b');
    const stemMat = Kit3D.toon('#f4e6c8');
    const dotMat = Kit3D.toon('#fff8ea');
    function mushroom(x, z, s) {
      const g = new T.Group();
      const stem = new T.Mesh(new T.CylinderGeometry(0.1, 0.13, 0.32, 8), stemMat); stem.position.y = 0.16; g.add(stem);
      const cap = new T.Mesh(new T.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat); cap.position.y = 0.3; g.add(cap);
      [[0.1, 0.45, 0.12], [-0.12, 0.42, 0.08], [0.02, 0.5, -0.12]].forEach(([px, py, pz]) => { const d = new T.Mesh(new T.SphereGeometry(0.045, 6, 4), dotMat); d.position.set(px, py, pz); g.add(d); });
      g.position.set(x, height(x, z), z); g.scale.setScalar(s); scene.add(g);
    }
    mushroom(-3.9, 1.2, 1.1); mushroom(-4.4, 0.6, 0.8); mushroom(4.3, 0.2, 1);
    const rockMat = Kit3D.toon('#9d8f7a');
    [[3.9, 1.6, 0.35], [-3.4, -4.6, 0.45], [4.6, -3.5, 0.3]].forEach(([x, z, s]) => {
      const r = new T.Mesh(new T.DodecahedronGeometry(1, 0), rockMat);
      r.position.set(x, height(x, z) + s * 0.4, z); r.scale.set(s * 1.3, s * 0.8, s); scene.add(r);
    });

    // ---------- 도토리(다람쥐가 들고, 도움 때 던진다) ----------
    const acornBody = Kit3D.toon('#b8732f');
    const acornCap = Kit3D.toon('#6b3f1a');
    function acorn() {
      const g = new T.Group();
      const b = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), acornBody); b.scale.set(1, 1.2, 1); g.add(b);
      const c = new T.Mesh(new T.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), acornCap); c.position.y = 0.06; g.add(c);
      const st = new T.Mesh(new T.CylinderGeometry(0.02, 0.025, 0.1, 5), acornCap); st.position.y = 0.24; g.add(st);
      return g;
    }

    // ---------- 다람쥐 ----------
    const fur = Kit3D.toon('#b8622d');
    const furLight = Kit3D.toon('#f2d2a6');
    const furDark = Kit3D.toon('#8e4620');
    const black = new T.MeshBasicMaterial({ color: '#2a1a12' });
    const white = new T.MeshBasicMaterial({ color: '#ffffff' });
    const pink = Kit3D.toon('#f39a8a');
    const squirrel = new T.Group();
    const sq = new T.Group(); // 뛰고 기우는 몸
    squirrel.add(sq);
    const sphere = new T.SphereGeometry(1, 18, 14);
    const part = (mat, x, y, z, sx, sy, sz, parent = sq) => { const m = new T.Mesh(sphere, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
    const body = part(fur, 0, 0.42, 0, 0.36, 0.42, 0.32); body.castShadow = true;
    part(furLight, 0, 0.4, 0.17, 0.24, 0.32, 0.18);
    const head = new T.Group(); head.position.set(0, 0.95, 0.04); sq.add(head);
    part(fur, 0, 0, 0, 0.32, 0.29, 0.29, head).castShadow = true;
    part(furLight, 0, -0.07, 0.17, 0.2, 0.15, 0.14, head);
    [-1, 1].forEach((side) => {
      const ear = new T.Mesh(new T.ConeGeometry(0.09, 0.22, 8), fur); ear.position.set(side * 0.17, 0.27, -0.02); ear.rotation.z = -side * 0.25; head.add(ear);
      const tuft = new T.Mesh(new T.ConeGeometry(0.04, 0.12, 6), furDark); tuft.position.set(side * 0.19, 0.4, -0.02); tuft.rotation.z = -side * 0.35; head.add(tuft);
      part(black, side * 0.12, 0.05, 0.24, 0.055, 0.065, 0.04, head);
      part(white, side * 0.12 + 0.02, 0.08, 0.27, 0.018, 0.018, 0.01, head);
      part(pink, side * 0.2, -0.06, 0.2, 0.06, 0.035, 0.03, head);
      part(fur, side * 0.2, 0.3, 0.22, 0.08, 0.06, 0.08); // 앞발
      part(furDark, side * 0.18, 0.05, 0.12, 0.13, 0.07, 0.18); // 뒷발
    });
    part(black, 0, -0.02, 0.29, 0.035, 0.028, 0.025, head);
    const tail = new T.Group(); tail.position.set(0, 0.28, -0.28); sq.add(tail);
    [[0, 0.05, -0.05, 0.16], [0, 0.32, -0.2, 0.2], [0, 0.62, -0.22, 0.24], [0, 0.9, -0.1, 0.26], [0, 1.08, 0.08, 0.22]].forEach(([x, y, z, r], i) => {
      const m = part(i % 2 ? furDark : fur, x, y, z, r * 1.05, r, r * 0.9, tail); m.castShadow = i === 2;
    });
    const held = acorn(); held.position.set(0, 0.36, 0.3); held.scale.setScalar(0.9); sq.add(held);
    squirrel.position.set(2.1, 0.25, PLANK_Z + 0.05);
    squirrel.rotation.y = -0.5;
    scene.add(squirrel);
    const thrown = acorn(); thrown.visible = false; thrown.castShadow = true; scene.add(thrown);

    const sqAnim = { hop: 0, shake: 0, cheer: 0, look: -0.5 };

    // ---------- 낙엽 ----------
    const leafTex = Kit3D.canvasTexture(64, 64, (g) => drawSuit(g, 1, 32, 34, 58));
    const leaves = [];
    const leafGeo = new T.PlaneGeometry(0.34, 0.34);
    const leafTints = ['#ffffff', '#ffd27a', '#ffb07a'].map((c) => new T.MeshLambertMaterial({ map: leafTex, color: c, transparent: true, alphaTest: 0.3, side: T.DoubleSide }));
    const lr = Logic.rng(31);
    for (let i = 0; i < 18; i += 1) {
      const m = new T.Mesh(leafGeo, leafTints[i % 3]);
      m.position.set((lr() - 0.5) * 12, lr() * 7 + 0.5, -8 + lr() * 10);
      m.userData = { spin: (lr() - 0.5) * 3, sway: lr() * 6, fall: 0.35 + lr() * 0.35 };
      scene.add(m); leaves.push(m);
    }

    // ---------- 패 ----------
    const cardGeo = new T.BoxGeometry(CARD_W, CARD_H, CARD_D);
    const edgeMat = Kit3D.toon('#e5c48c');
    const backMat = new T.MeshLambertMaterial({ map: cardBack(), alphaTest: 0.5 });
    const faceMats = {};
    const faceMat = (card) => {
      if (!faceMats[card]) faceMats[card] = new T.MeshLambertMaterial({ map: cardFace(card), alphaTest: 0.5 });
      return faceMats[card];
    };
    const pool = Array.from({ length: 52 }, () => {
      const m = new T.Mesh(cardGeo, [edgeMat, edgeMat, backMat, backMat, edgeMat, edgeMat]);
      m.castShadow = true;
      m.receiveShadow = true;
      m.visible = false;
      m.userData = { card: -1, slot: -1, where: '', tween: null, nudge: 0 };
      scene.add(m);
      return m;
    });
    function dress(mesh, card) {
      mesh.userData.card = card;
      mesh.material = [edgeMat, edgeMat, faceMat(card), backMat, edgeMat, edgeMat];
    }

    // 언덕 위 자리: 모든 패를 같은 기울기의 비탈면에 얹는다. 앞줄일수록 조금씩 높여 뒷줄 패 위에 겹친다.
    const TILT = 0.3;
    let plane = { y0: 0.4 };
    function fitPlane(lay) {
      const cx = (lay.minX + lay.maxX) / 2;
      let y0 = 0;
      lay.slots.forEach((slot) => {
        const x = (slot.x - cx) * HALF;
        const z = -(lay.rows - 1 - slot.row) * ROW;
        for (const [ox, oz] of [[-0.5, -0.68], [0.5, -0.68], [-0.5, 0.68], [0.5, 0.68], [0, 0]]) {
          y0 = Math.max(y0, height(x + ox, z + oz) - (-(z + oz)) * Math.tan(TILT));
        }
      });
      plane = { y0: y0 + 0.06 };
    }
    function slotPose(lay, slot) {
      const cx = (lay.minX + lay.maxX) / 2;
      const x = (slot.x - cx) * HALF;
      const z = -(lay.rows - 1 - slot.row) * ROW;
      return { pos: new T.Vector3(x, plane.y0 + -z * Math.tan(TILT) + slot.row * 0.055, z), rot: new T.Euler(TILT, 0, 0) };
    }
    function stockPose(k) { return { pos: new T.Vector3(STOCK_POS.x + k * 0.004, STOCK_POS.y + k * 0.018, STOCK_POS.z - k * 0.006), rot: new T.Euler(0.05, 0.04, Math.PI) }; }
    function pilePose(k, card) {
      const wob = ((card * 37) % 11) / 11 - 0.5;
      return { pos: new T.Vector3(PILE_POS.x + wob * 0.12, PILE_POS.y + Math.min(k, 40) * 0.016, PILE_POS.z + wob * 0.06), rot: new T.Euler(0.05, wob * 0.35, 0) };
    }
    const faceDown = (rot) => new T.Euler(rot.x, rot.y, rot.z + Math.PI);

    function setPose(mesh, pose) { mesh.position.copy(pose.pos); mesh.rotation.copy(pose.rot); mesh.userData.tween = null; }
    function fly(mesh, pose, { dur = 0.38, arc = 0.9, delay = 0, done = null } = {}) {
      mesh.userData.tween = {
        from: mesh.position.clone(), fromR: mesh.rotation.clone(), to: pose.pos.clone(), toR: pose.rot.clone(), t: -delay, dur, arc, done,
      };
    }

    // 판 전체를 놓는다. state는 Logic 라운드. instant면 애니메이션 없이 제자리에.
    let cur = null;
    function layout(state, instant) {
      const lay = Logic.layout(state.layout);
      mound = { cz: -(lay.rows - 1) * ROW - 0.4, h: 1.5, sx: Math.max(4.6, (lay.maxX - lay.minX) * HALF * 0.75 + 1.6), sz: 3.2 };
      shapeGround();
      fitPlane(lay);
      trees.forEach((t) => { t.position.y = height(t.position.x, t.position.z); });
      cur = { lay, slotMesh: [], stockMesh: [], pileMesh: [] };
      let used = 0;
      const take = () => pool[used++];
      pool.forEach((m) => { m.visible = false; m.userData.tween = null; m.userData.slot = -1; m.userData.where = ''; });
      state.cards.forEach((card, i) => {
        const m = take();
        dress(m, card);
        m.userData.slot = i; m.userData.where = 'hill';
        cur.slotMesh.push(m);
        if (state.removed[i]) { m.visible = false; return; }
        m.visible = true;
        const pose = slotPose(lay, lay.slots[i]);
        const free = Logic.isFree(state, i);
        const target = { pos: pose.pos, rot: free ? pose.rot : faceDown(pose.rot) };
        if (instant) setPose(m, target);
        else {
          setPose(m, { pos: STOCK_POS.clone().add(new T.Vector3(0, 0.3, 0)), rot: faceDown(new T.Euler()) });
          fly(m, target, { dur: 0.42, arc: 1.4, delay: 0.02 * i });
        }
      });
      state.stock.forEach((card, k) => {
        const m = take();
        dress(m, card);
        m.userData.where = 'stock';
        cur.stockMesh.push(m);
        m.visible = k >= state.drawn;
      });
      layoutStock(state);
      // 바구니: 처음 패와 뒤집은 더미 패, 걷은 패가 섞여 있으므로 pile 목록 순서대로 메시를 고른다.
      const fromStock = new Map(state.stock.map((c, k) => [c, k]));
      const fromHill = new Map(state.cards.map((c, i) => [c, i]));
      state.pile.forEach((card, k) => {
        let m;
        if (fromHill.has(card) && state.removed[fromHill.get(card)]) m = cur.slotMesh[fromHill.get(card)];
        else if (fromStock.has(card)) m = cur.stockMesh[fromStock.get(card)];
        else { m = take(); dress(m, card); }
        m.visible = k >= state.pile.length - 6; // 아래 깔린 패는 보이지 않아도 된다.
        m.userData.where = 'pile';
        setPose(m, pilePose(k, card));
        cur.pileMesh.push(m);
      });
    }
    function layoutStock(state) {
      const left = state.stock.length - state.drawn;
      cur.stockMesh.forEach((m, k) => {
        if (k < state.drawn) return;
        const depth = left - 1 - (k - state.drawn); // 다음에 뒤집을 패가 맨 위
        const pose = stockPose(depth);
        m.visible = depth < 14;
        if (m.userData.where === 'stock') setPose(m, pose);
      });
    }
    // 걷기: 슬롯 패가 바구니로 날아간다.
    function playCard(state, i, after) {
      const m = cur.slotMesh[i];
      m.userData.where = 'pile';
      cur.pileMesh.push(m);
      fly(m, pilePose(state.pile.length - 1, state.cards[i]), { dur: 0.34, arc: 1.1, done: after });
      hidePileBottom();
      refreshFaces(state);
    }
    function drawCard(state, after) {
      const k = state.drawn - 1;
      const m = cur.stockMesh[k];
      m.visible = true;
      m.userData.where = 'pile';
      cur.pileMesh.push(m);
      fly(m, pilePose(state.pile.length - 1, state.stock[k]), { dur: 0.32, arc: 0.6, done: after });
      hidePileBottom();
      layoutStock(state);
    }
    function hidePileBottom() {
      cur.pileMesh.forEach((m, k) => { if (k < cur.pileMesh.length - 6 && !m.userData.tween) m.visible = false; });
    }
    // 새로 비게 된 패를 뒤집는다.
    function refreshFaces(state) {
      state.cards.forEach((_, i) => {
        if (state.removed[i]) return;
        const m = cur.slotMesh[i];
        const pose = slotPose(cur.lay, cur.lay.slots[i]);
        const free = Logic.isFree(state, i);
        const flipped = Math.abs(m.rotation.z - pose.rot.z) > 1;
        if (free && flipped) fly(m, pose, { dur: 0.3, arc: 0.45, delay: 0.12 });
      });
    }
    function nudge(i) { if (cur && cur.slotMesh[i]) cur.slotMesh[i].userData.nudge = 0.35; }

    function slotAt(clientX, clientY, state) {
      if (!cur) return { kind: 'none' };
      const rect = stage.canvas.getBoundingClientRect();
      const ndc = new T.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new T.Raycaster();
      ray.setFromCamera(ndc, camera);
      const targets = cur.slotMesh.filter((m, i) => !state.removed[i]).concat(cur.stockMesh.filter((m) => m.visible && m.userData.where === 'stock'));
      const hit = ray.intersectObjects(targets, false)[0];
      if (hit) {
        const u = hit.object.userData;
        if (u.where === 'stock') return { kind: 'stock' };
        return { kind: 'slot', i: u.slot };
      }
      // 살짝 빗나가도 가까운 빈 패를 고른다.
      let bestI = -1;
      let bestD = 38;
      Logic.freeSlots(state).forEach((i) => {
        const p = cur.slotMesh[i].position.clone().project(camera);
        const sx = (p.x + 1) / 2 * rect.width + rect.left;
        const sy = (1 - p.y) / 2 * rect.height + rect.top;
        const d = Math.hypot(sx - clientX, sy - clientY);
        if (d < bestD) { bestD = d; bestI = i; }
      });
      if (bestI >= 0) return { kind: 'slot', i: bestI };
      const s = STOCK_POS.clone().project(camera);
      const sx = (s.x + 1) / 2 * rect.width + rect.left;
      const sy = (1 - s.y) / 2 * rect.height + rect.top;
      if (Math.hypot(sx - clientX, sy - clientY) < 50) return { kind: 'stock' };
      return { kind: 'none' };
    }
    function screenOf(v) {
      const rect = stage.canvas.getBoundingClientRect();
      const p = v.clone().project(camera);
      return { x: (p.x + 1) / 2 * rect.width, y: (1 - p.y) / 2 * rect.height };
    }
    const slotWorld = (i) => (cur && cur.slotMesh[i] ? cur.slotMesh[i].position.clone() : PILE_POS.clone());

    // ---------- 카메라 맞추기 ----------
    const view = { target: new T.Vector3(0, 0.4, -0.8), dist: 14, want: 14 };
    function fit() {
      const lay = cur ? cur.lay : Logic.layout('ridge');
      const halfW = Math.max(3.2, ((lay.maxX - lay.minX) / 2) * HALF + CARD_W / 2 + 0.45);
      const depthTop = -(lay.rows - 1) * ROW - CARD_D / 2 - 0.2;
      const halfH = (PLANK_Z + 1.2 - depthTop) / 2 + 0.6;
      const vf = T.MathUtils.degToRad(camera.fov / 2);
      const hf = Math.atan(Math.tan(vf) * camera.aspect);
      view.want = Math.max(halfW / Math.tan(hf), halfH * 1.55 / Math.tan(vf));
      view.target.set(0, 0.7, (depthTop + PLANK_Z + 1.2) / 2 - 1.15);
    }
    function placeCamera() {
      const elev = T.MathUtils.degToRad(40);
      camera.position.set(view.target.x, view.target.y + Math.sin(elev) * view.dist, view.target.z + Math.cos(elev) * view.dist);
      camera.lookAt(view.target);
    }
    addEventListener('resize', () => { fit(); view.dist = view.want; placeCamera(); });

    // ---------- 매 프레임 ----------
    const ease = (t) => 1 - (1 - t) ** 3;
    stage.onFrame((dt, time) => {
      view.dist = Kit3D.damp(view.dist, view.want, 3, dt);
      placeCamera();
      for (const m of pool) {
        const tw = m.userData.tween;
        if (tw) {
          tw.t += dt;
          if (tw.t < 0) continue;
          const k = Math.min(1, tw.t / tw.dur);
          const e = ease(k);
          m.position.lerpVectors(tw.from, tw.to, e);
          m.position.y += Math.sin(Math.PI * k) * tw.arc;
          m.rotation.set(tw.fromR.x + (tw.toR.x - tw.fromR.x) * e, tw.fromR.y + (tw.toR.y - tw.fromR.y) * e, tw.fromR.z + (tw.toR.z - tw.fromR.z) * e);
          if (k >= 1) {
            m.userData.tween = null;
            if (tw.done) tw.done();
          }
        }
        if (m.userData.nudge > 0) {
          m.userData.nudge = Math.max(0, m.userData.nudge - dt);
          m.position.x += Math.sin(m.userData.nudge * 60) * 0.012;
        }
      }
      // 다람쥐
      sqAnim.hop = Math.max(0, sqAnim.hop - dt * 2.6);
      sqAnim.shake = Math.max(0, sqAnim.shake - dt * 1.8);
      sqAnim.cheer = Math.max(0, sqAnim.cheer - dt * 0.6);
      const hopY = Math.sin(Math.PI * Math.min(1, 1 - sqAnim.hop)) * (sqAnim.hop > 0 ? 0.35 : 0);
      const cheerY = sqAnim.cheer > 0 ? Math.abs(Math.sin(time * 9)) * 0.45 : 0;
      sq.position.y = hopY + cheerY + Math.sin(time * 2.2) * 0.012;
      sq.scale.y = 1 + Math.sin(time * 2.2) * 0.02;
      sq.rotation.y = sqAnim.cheer > 0 ? time * 6 : 0;
      head.rotation.z = Math.sin(sqAnim.shake * 22) * sqAnim.shake * 0.5;
      head.rotation.x = Math.sin(time * 1.3) * 0.05;
      tail.rotation.x = Math.sin(time * 2.4) * 0.12 - 0.05;
      tail.rotation.z = Math.sin(time * 1.7) * 0.08;
      squirrel.rotation.y = Kit3D.damp(squirrel.rotation.y, sqAnim.look, 5, dt);
      // 던진 도토리
      if (thrown.visible) {
        const tw = thrown.userData;
        tw.t += dt;
        const k = Math.min(1, tw.t / 0.45);
        thrown.position.lerpVectors(tw.from, tw.to, k);
        thrown.position.y += Math.sin(Math.PI * k) * 1.4;
        thrown.rotation.z += dt * 12;
        if (k >= 1) { thrown.visible = false; if (tw.done) tw.done(); }
      }
      // 낙엽
      for (const leaf of leaves) {
        const u = leaf.userData;
        leaf.position.y -= u.fall * dt;
        leaf.position.x += Math.sin(time * 1.2 + u.sway) * dt * 0.4;
        leaf.rotation.x += u.spin * dt;
        leaf.rotation.y += u.spin * 0.7 * dt;
        if (leaf.position.y < height(leaf.position.x, leaf.position.z) + 0.05) {
          leaf.position.y = 7 + Math.random() * 2;
          leaf.position.x = (Math.random() - 0.5) * 12;
        }
      }
    });

    Object.assign(world, {
      layout, playCard, drawCard, refreshFaces, nudge, slotAt, screenOf, slotWorld, fit, placeCamera,
      pilePos: () => PILE_POS.clone(), stockPos: () => STOCK_POS.clone(),
      squirrel: {
        hop() { sqAnim.hop = 1; },
        shake() { sqAnim.shake = 1; },
        cheer() { sqAnim.cheer = 2.4; },
        look(x) { sqAnim.look = x; },
        throwTo(target, done) {
          thrown.visible = true;
          thrown.position.copy(squirrel.position).add(new T.Vector3(0, 0.6, 0.2));
          thrown.userData = { from: thrown.position.clone(), to: target.clone(), t: 0, done };
          sqAnim.hop = 1;
        },
      },
      snapCamera() { fit(); view.dist = view.want; placeCamera(); },
      drawSuit, SUIT_COLORS,
    });
    return world;
  }

  window.HillScene = { build, drawSuit, SUIT_COLORS };
})();
