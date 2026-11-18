// 산들섬 정원 3D 무대: 섬, 바다, 장난감 같은 저폴리 모형, 칸 고르기, 움직임.
// 모형은 THREE 기본 도형을 조합한다. 도형과 재질은 한 번 만들어 모든 모형이 나눠 쓴다.
(function () {
  const T = THREE;
  const N = 6;
  const CELL = 1;
  const TOP = 0; // 섬 풀밭 높이

  const mats = {};
  const mat = (color, extra) => {
    const key = color + (extra ? JSON.stringify(extra) : '');
    if (!mats[key]) mats[key] = Kit3D.toon(color, extra);
    return mats[key];
  };
  const geos = {
    sphere: new T.SphereGeometry(1, 18, 12),
    lowSphere: new T.IcosahedronGeometry(1, 1),
    box: new T.BoxGeometry(1, 1, 1),
    cyl: new T.CylinderGeometry(1, 1, 1, 16),
    cyl8: new T.CylinderGeometry(1, 1, 1, 8),
    cone4: new T.ConeGeometry(1, 1, 4),
    cone8: new T.ConeGeometry(1, 1, 8),
    cone10: new T.ConeGeometry(1, 1, 12),
    octa: new T.OctahedronGeometry(1, 0),
  };
  // 둥근 모서리 상자: 장난감처럼 보이게 하는 핵심.
  const roundBoxCache = {};
  function roundBox(w, h, d, r) {
    const key = [w, h, d, r].join(',');
    if (roundBoxCache[key]) return roundBoxCache[key];
    const shape = new T.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geo = new T.ExtrudeGeometry(shape, { depth: d - r * 2, bevelEnabled: true, bevelSize: r * 0.9, bevelThickness: r, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -(d - r * 2) / 2);
    roundBoxCache[key] = geo;
    return geo;
  }

  function part(geo, color, sx, sy, sz, x = 0, y = 0, z = 0, extra) {
    const m = new T.Mesh(geo, typeof color === 'string' ? mat(color, extra) : color);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    return m;
  }

  function eyes(g, y, z, spread = 0.07, size = 0.035) {
    for (const s of [-1, 1]) {
      g.add(part(geos.sphere, '#1d2633', size, size * 1.25, size * 0.6, s * spread, y, z));
      g.add(part(geos.sphere, '#ffffff', size * 0.35, size * 0.35, size * 0.2, s * spread + size * 0.3, y + size * 0.45, z + size * 0.45));
    }
  }

  // ---------- 모형 ----------
  const build = {
    sprout(g) {
      g.add(part(geos.sphere, '#a0724a', 0.2, 0.07, 0.2, 0, 0.02, 0));
      g.add(part(geos.cyl, '#5aa83c', 0.025, 0.24, 0.025, 0, 0.14, 0));
      const l1 = part(geos.sphere, '#7fd04b', 0.13, 0.04, 0.07, -0.1, 0.27, 0);
      l1.rotation.z = 0.5;
      const l2 = part(geos.sphere, '#8edc58', 0.13, 0.04, 0.07, 0.1, 0.27, 0);
      l2.rotation.z = -0.5;
      g.add(l1, l2);
      eyes(g, 0.05, 0.17, 0.06, 0.028);
      g.userData.sway = 0.18;
    },
    bush(g) {
      g.add(part(geos.sphere, '#3f9a45', 0.24, 0.21, 0.24, -0.1, 0.18, 0));
      g.add(part(geos.sphere, '#4caf50', 0.26, 0.24, 0.26, 0.1, 0.2, -0.04));
      g.add(part(geos.sphere, '#5cc160', 0.2, 0.19, 0.2, 0, 0.34, 0.04));
      for (const [x, y, z] of [[-0.16, 0.3, 0.14], [0.17, 0.33, 0.12], [0.02, 0.48, 0.1]]) g.add(part(geos.sphere, '#ff6f8f', 0.045, 0.045, 0.045, x, y, z));
      eyes(g, 0.2, 0.24, 0.08, 0.035);
      g.userData.sway = 0.08;
    },
    tree(g) {
      g.add(part(geos.cyl8, '#8a5a36', 0.08, 0.42, 0.08, 0, 0.21, 0));
      g.add(part(geos.lowSphere, mat('#3c9b4a', { flatShading: true }), 0.34, 0.3, 0.34, 0, 0.55, 0));
      g.add(part(geos.lowSphere, mat('#52b95a', { flatShading: true }), 0.25, 0.22, 0.25, 0.05, 0.78, 0.03));
      g.add(part(geos.sphere, '#ff9f43', 0.05, 0.05, 0.05, 0.2, 0.5, 0.2));
      g.add(part(geos.sphere, '#ff9f43', 0.05, 0.05, 0.05, -0.18, 0.62, 0.18));
      g.userData.sway = 0.06;
    },
    hut(g) {
      g.add(part(roundBox(0.56, 0.38, 0.5, 0.06), '#c98b55', 1, 1, 1, 0, 0.2, 0));
      const roof = part(geos.cone4, mat('#e9a83a', { flatShading: true }), 0.5, 0.46, 0.5, 0, 0.62, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(part(roundBox(0.16, 0.22, 0.04, 0.02), '#6b3f22', 1, 1, 1, 0, 0.12, 0.26));
      g.add(part(geos.sphere, '#ffe08a', 0.05, 0.05, 0.02, 0.17, 0.25, 0.255));
      g.userData.sway = 0.015;
    },
    house(g) {
      g.add(part(roundBox(0.66, 0.48, 0.56, 0.06), '#fff3dc', 1, 1, 1, 0, 0.25, 0));
      const roof = part(geos.cone4, mat('#e8574a', { flatShading: true }), 0.6, 0.38, 0.52, 0, 0.68, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(part(roundBox(0.09, 0.2, 0.09, 0.02), '#9b5b3f', 1, 1, 1, 0.18, 0.78, -0.06));
      g.add(part(roundBox(0.16, 0.24, 0.04, 0.02), '#4c7bd9', 1, 1, 1, -0.14, 0.13, 0.29));
      for (const x of [0.13, 0.25]) g.add(part(roundBox(0.09, 0.1, 0.03, 0.015), '#bde8ff', 1, 1, 1, x, 0.3, 0.29, { emissive: '#305070' }));
      g.userData.sway = 0.01;
    },
    mill(g) {
      g.add(part(geos.cyl, '#f6ead2', 0.2, 0.78, 0.2, 0, 0.39, 0));
      g.add(part(geos.cyl, '#f6ead2', 0.27, 0.12, 0.27, 0, 0.06, 0));
      g.add(part(geos.cone10, '#4a8fd9', 0.26, 0.28, 0.26, 0, 0.92, 0));
      g.add(part(roundBox(0.12, 0.18, 0.04, 0.02), '#6b3f22', 1, 1, 1, 0, 0.11, 0.24));
      const blades = new T.Group();
      blades.position.set(0, 0.7, 0.24);
      blades.add(part(geos.sphere, '#e8574a', 0.06, 0.06, 0.05));
      for (let i = 0; i < 4; i += 1) {
        const arm = new T.Group();
        arm.rotation.z = (i * Math.PI) / 2;
        arm.add(part(roundBox(0.11, 0.4, 0.02, 0.008), i % 2 ? '#fffaf0' : '#ffd6c4', 1, 1, 1, 0.03, 0.24, 0));
        blades.add(arm);
      }
      g.add(blades);
      g.userData.spin = blades;
    },
    lighthouse(g) {
      const stripes = ['#ffffff', '#e8574a', '#ffffff', '#e8574a'];
      stripes.forEach((c, i) => {
        const r0 = 0.27 - i * 0.035;
        const seg = new T.Mesh(new T.CylinderGeometry(r0 - 0.035, r0, 0.22, 16), mat(c));
        seg.position.y = 0.11 + i * 0.22;
        g.add(seg);
      });
      g.add(part(geos.cyl, '#2c3e50', 0.17, 0.04, 0.17, 0, 0.9, 0));
      const lamp = part(geos.cyl, '#fff3a0', 0.12, 0.15, 0.12, 0, 0.99, 0, { emissive: '#ffcf33', emissiveIntensity: 0.9 });
      g.add(lamp);
      g.add(part(geos.cone8, '#e8574a', 0.16, 0.16, 0.16, 0, 1.14, 0));
      g.add(part(roundBox(0.1, 0.16, 0.03, 0.015), '#2c3e50', 1, 1, 1, 0, 0.09, 0.26));
      g.userData.lamp = lamp;
    },
    tower(g) {
      g.add(part(geos.cyl8, '#b9a6e8', 0.32, 0.5, 0.32, 0, 0.25, 0));
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        g.add(part(geos.box, '#a48fdc', 0.08, 0.1, 0.08, Math.cos(a) * 0.29, 0.55, Math.sin(a) * 0.29));
      }
      g.add(part(geos.cyl8, '#cdbdf2', 0.18, 0.4, 0.18, 0, 0.75, 0));
      g.add(part(geos.cone8, '#ffcf33', 0.2, 0.32, 0.2, 0, 1.11, 0, { emissive: '#7a5a00' }));
      g.add(part(roundBox(0.14, 0.22, 0.04, 0.02), '#5b3fa0', 1, 1, 1, 0, 0.11, 0.31));
      const star = part(geos.octa, '#ffe066', 0.12, 0.12, 0.05, 0, 1.38, 0, { emissive: '#ffb000', emissiveIntensity: 0.8 });
      g.add(star);
      g.userData.star = star;
    },
    gull(g) {
      const body = new T.Group();
      body.add(part(geos.sphere, '#ffffff', 0.18, 0.15, 0.24, 0, 0.22, 0));
      body.add(part(geos.sphere, '#ffffff', 0.12, 0.12, 0.12, 0, 0.38, 0.13));
      body.add(part(geos.cone8, '#ff9f1c', 0.04, 0.12, 0.04, 0, 0.37, 0.28).rotateX(Math.PI / 2));
      body.add(part(geos.sphere, '#9aa7b4', 0.08, 0.05, 0.1, 0, 0.27, -0.24));
      eyes(body, 0.42, 0.22, 0.06, 0.025);
      const wings = [];
      for (const s of [-1, 1]) {
        const w = new T.Group();
        w.position.set(s * 0.15, 0.27, 0);
        w.add(part(geos.sphere, '#b8c4cf', 0.14, 0.03, 0.16, s * 0.1, 0, 0));
        body.add(w);
        wings.push(w);
      }
      for (const s of [-1, 1]) body.add(part(geos.cyl8, '#ff9f1c', 0.02, 0.1, 0.02, s * 0.07, 0.05, 0));
      g.add(body);
      g.userData.gull = { body, wings };
    },
    shell(g) {
      const s = part(geos.cone10, mat('#ffb3c1', { flatShading: true }), 0.28, 0.14, 0.24, 0, 0.07, 0);
      g.add(s);
      g.add(part(geos.sphere, '#ff8fa8', 0.08, 0.05, 0.06, 0, 0.03, -0.22));
      eyes(g, 0.1, 0.2, 0.06, 0.025);
    },
    pearl(g) {
      g.add(part(geos.sphere, '#ff9fb4', 0.3, 0.06, 0.26, 0, 0.04, 0));
      const lid = part(geos.sphere, '#ffb3c1', 0.3, 0.06, 0.26, 0, 0.3, -0.18);
      lid.rotation.x = -1.1;
      g.add(lid);
      const pearl = part(geos.sphere, '#fbfbff', 0.13, 0.13, 0.13, 0, 0.17, 0.02, { emissive: '#6a6a8a', emissiveIntensity: 0.5 });
      g.add(pearl);
      g.userData.glow = pearl;
    },
    chest(g) {
      g.add(part(roundBox(0.56, 0.3, 0.38, 0.04), '#a8683a', 1, 1, 1, 0, 0.16, 0));
      const lid = part(new T.CylinderGeometry(0.19, 0.19, 0.56, 12, 1, false, 0, Math.PI), mat('#bf7a45'), 1, 1, 1, 0, 0.31, 0);
      lid.rotation.z = Math.PI / 2;
      lid.rotation.y = Math.PI / 2;
      g.add(lid);
      for (const x of [-0.2, 0.2]) g.add(part(geos.box, '#ffcf33', 0.05, 0.33, 0.4, x, 0.2, 0, { emissive: '#7a5a00' }));
      g.add(part(geos.box, '#ffcf33', 0.1, 0.1, 0.04, 0, 0.24, 0.2, { emissive: '#7a5a00' }));
      for (const [x, z] of [[-0.12, 0.27], [0.25, 0.24], [0.05, 0.3]]) g.add(part(geos.cyl, '#ffd84d', 0.06, 0.02, 0.06, x, 0.015, z, { emissive: '#7a5a00' }));
    },
    wind(g) {
      g.add(part(geos.cyl, '#d9f4ff', 0.16, 0.36, 0.16, 0, 0.2, 0, { transparent: true, opacity: 0.85 }));
      g.add(part(geos.cyl, '#b07a4a', 0.1, 0.08, 0.1, 0, 0.42, 0));
      const swirl = new T.Group();
      for (let i = 0; i < 3; i += 1) {
        const ring = new T.Mesh(new T.TorusGeometry(0.1 - i * 0.025, 0.012, 6, 20, Math.PI * 1.4), mat('#ffffff'));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.12 + i * 0.09;
        swirl.add(ring);
      }
      g.add(swirl);
      g.userData.spinY = swirl;
    },
    rainbow(g) {
      const cols = ['#ff6b6b', '#ffb347', '#ffe066', '#6bd66b', '#5ab0ff', '#b48cff'];
      cols.forEach((c, i) => {
        const a = (i / cols.length) * Math.PI * 2;
        g.add(part(geos.sphere, c, 0.1, 0.1, 0.1, Math.cos(a) * 0.12, 0.25 + Math.sin(a) * 0.05, Math.sin(a) * 0.12, { emissive: c, emissiveIntensity: 0.25 }));
      });
      g.add(part(geos.sphere, '#ffffff', 0.12, 0.14, 0.12, 0, 0.3, 0, { emissive: '#ffffff', emissiveIntensity: 0.4 }));
      eyes(g, 0.32, 0.11, 0.045, 0.022);
      g.userData.spinY = g;
    },
  };

  function makeModel(kind) {
    const g = new T.Group();
    const inner = new T.Group();
    inner.scale.setScalar(1.25);
    build[kind](inner);
    g.add(inner);
    Object.assign(g.userData, inner.userData);
    if (inner.userData.spinY === inner) g.userData.spinY = inner;
    g.userData.kind = kind;
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
    return g;
  }

  // 모형을 다시 쓰기 위한 보관함.
  const pool = {};
  function take(kind) {
    const list = pool[kind] || (pool[kind] = []);
    const g = list.pop() || makeModel(kind);
    g.visible = true;
    g.scale.setScalar(1);
    g.rotation.set(0, 0, 0);
    g.userData.phase = Math.random() * 6.28;
    return g;
  }
  function give(g) {
    if (!g) return;
    g.parent?.remove(g);
    (pool[g.userData.kind] || (pool[g.userData.kind] = [])).push(g);
  }

  const cellPos = (i, y = TOP) => new T.Vector3(((i % N) - (N - 1) / 2) * CELL, y, (Math.floor(i / N) - (N - 1) / 2) * CELL);

  // ---------- 섬과 바다 ----------
  function buildIsland(scene) {
    const island = new T.Group();
    const sand = new T.Mesh(roundBox(7.4, 7.4, 0.7, 0.5), mat('#f3d9a4'));
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.55;
    sand.receiveShadow = true;
    island.add(sand);
    const grassTex = Kit3D.canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#7fcf6a';
      g.fillRect(0, 0, w, h);
      const s = w / N;
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          g.fillStyle = (r + c) % 2 ? '#8ad874' : '#79c964';
          const p = 6;
          const x = c * s + p;
          const y = r * s + p;
          const q = s - p * 2;
          g.beginPath();
          g.moveTo(x + 14, y);
          g.arcTo(x + q, y, x + q, y + q, 14);
          g.arcTo(x + q, y + q, x, y + q, 14);
          g.arcTo(x, y + q, x, y, 14);
          g.arcTo(x, y, x + q, y, 14);
          g.fill();
        }
      }
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 90; i += 1) {
        g.fillStyle = ['#a6e48f', '#6bbd57', '#fff7d6', '#ffd1dc'][i % 4];
        g.beginPath();
        g.arc(rnd() * w, rnd() * h, i % 4 > 1 ? 2.5 : 3.5, 0, 6.3);
        g.fill();
      }
    });
    const grass = new T.Mesh(roundBox(6.5, 6.5, 0.3, 0.25), [mat('#79c964'), mat('#6bb85a')]);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.15;
    grass.receiveShadow = true;
    island.add(grass);
    const top = new T.Mesh(new T.PlaneGeometry(6.2, 6.2), new T.MeshToonMaterial({ map: grassTex, gradientMap: mat('#fff').gradientMap }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = TOP + 0.002;
    top.receiveShadow = true;
    island.add(top);

    // 섬 둘레 장식: 바위, 야자수, 작은 부두.
    const rocks = [[-3.9, 2.6], [3.85, -2.9], [3.7, 3.4], [-3.6, -3.7]];
    for (const [x, z] of rocks) {
      const rock = part(geos.lowSphere, mat('#9aa6b2', { flatShading: true }), 0.35, 0.25, 0.3, x, -0.3, z);
      island.add(rock);
    }
    const palm = new T.Group();
    for (let i = 0; i < 5; i += 1) {
      const seg = part(geos.cyl8, '#b9844f', 0.07 - i * 0.006, 0.22, 0.07 - i * 0.006, i * 0.03, -0.25 + i * 0.2, 0);
      palm.add(seg);
    }
    for (let i = 0; i < 6; i += 1) {
      const leaf = part(geos.sphere, '#3fae5a', 0.42, 0.04, 0.12, 0, 0, 0);
      const holder = new T.Group();
      holder.position.set(0.15, 0.78, 0);
      holder.rotation.y = (i / 6) * Math.PI * 2;
      leaf.position.x = 0.36;
      leaf.rotation.z = -0.35;
      holder.add(leaf);
      palm.add(holder);
    }
    palm.position.set(-3.55, 0, -2.2);
    palm.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    island.add(palm);
    const pier = new T.Group();
    for (let i = 0; i < 4; i += 1) pier.add(part(roundBox(0.8, 0.06, 0.28, 0.02), '#c49563', 1, 1, 1, 0, -0.32, 3.9 + i * 0.32));
    for (const x of [-0.36, 0.36]) for (const z of [4.1, 4.8]) pier.add(part(geos.cyl8, '#8a5a36', 0.05, 0.6, 0.05, x, -0.5, z));
    pier.position.x = 1.6;
    island.add(pier);
    scene.add(island);

    const waveTex = Kit3D.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#4fc0d8';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 3;
      for (let y = 16; y < h; y += 42) {
        for (let x = (y % 84) ? 0 : 40; x < w; x += 90) {
          g.beginPath();
          g.arc(x + 14, y, 12, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
      }
    });
    waveTex.wrapS = waveTex.wrapT = T.RepeatWrapping;
    waveTex.repeat.set(14, 14);
    const sea = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshToonMaterial({ map: waveTex, gradientMap: mat('#fff').gradientMap }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.48;
    sea.receiveShadow = true;
    scene.add(sea);
    const foam = new T.Mesh(roundBox(8.1, 8.1, 0.04, 0.6), new T.MeshBasicMaterial({ color: '#e9fbff', transparent: true, opacity: 0.55 }));
    foam.rotation.x = -Math.PI / 2;
    foam.position.y = -0.47;
    scene.add(foam);
    return { island, sea, waveTex, foam };
  }

  // ---------- 무대 ----------
  function create(container) {
    const stage = Kit3D.stage(container, { sky: ['#8fd6f5', '#fff0d4'], fog: 70, fov: 38, shadowSize: 6, ground: '#6a8f5a' });
    const { scene, camera } = stage;
    const world = buildIsland(scene);
    const items = new Array(N * N).fill(null);
    const tweens = [];
    let clock = 0;

    // 칸 고르기 표시: 둥근 테두리와 반투명 미리보기.
    const ringGeo = new T.RingGeometry(0.4, 0.47, 4, 1);
    const ringMat = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    ring.visible = false;
    scene.add(ring);
    const glowMat = new T.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.55, depthWrite: false });
    const glows = Array.from({ length: 12 }, () => {
      const m = new T.Mesh(new T.PlaneGeometry(0.86, 0.86), glowMat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      return m;
    });
    let ghost = null;

    function fit() {
      // 휴대폰 세로 화면에서 섬 전체가 위아래 띠(점수, 손 패) 사이에 들어오게 거리를 맞춘다.
      const aspect = camera.aspect || 0.5;
      const halfW = 4.05;
      const tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(halfW / (tanH * aspect), 10);
      const dir = new T.Vector3(0, 0.72, 0.7).normalize();
      camera.position.copy(dir.multiplyScalar(dist));
      camera.lookAt(0, -0.2, 0.55 + (aspect < 0.6 ? 0.35 : 0));
    }
    addEventListener('resize', fit);
    fit();

    function setItem(i, kind, pop = true) {
      if (items[i]) give(items[i]);
      items[i] = null;
      if (!kind) return null;
      const g = take(kind);
      g.position.copy(cellPos(i));
      scene.add(g);
      items[i] = g;
      if (pop) {
        g.scale.setScalar(0.01);
        tween(0.35, (p) => g.scale.setScalar(Math.max(0.01, Kit3D.ease.outBack(p))));
      }
      return g;
    }

    function sync(board) {
      for (let i = 0; i < board.length; i += 1) {
        const want = board[i];
        const have = items[i]?.userData.kind || null;
        if (want !== have) setItem(i, want, false);
      }
    }

    function tween(dur, fn, delay = 0, done) {
      tweens.push({ start: clock + delay, dur, fn, done });
    }

    const raycaster = new T.Raycaster();
    const plane = new T.Plane(new T.Vector3(0, 1, 0), -TOP);
    function cellAt(clientX, clientY) {
      const rect = stage.canvas.getBoundingClientRect();
      const v = new T.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(v, camera);
      const hit = new T.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return -1;
      const c = Math.round(hit.x / CELL + (N - 1) / 2);
      const r = Math.round(hit.z / CELL + (N - 1) / 2);
      if (c < 0 || c >= N || r < 0 || r >= N) return -1;
      return r * N + c;
    }

    function screenOf(i, y = 0.9) {
      const v = cellPos(i, y).project(camera);
      const rect = stage.canvas.getBoundingClientRect();
      return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height };
    }

    function showCursor(i, kind, mergeCells, ok) {
      ring.visible = i >= 0;
      if (ghost) { give(ghost); ghost = null; }
      glows.forEach((g) => { g.visible = false; });
      if (i < 0) return;
      ring.position.copy(cellPos(i, TOP + 0.02));
      ringMat.color.set(ok ? '#ffffff' : '#ff6b6b');
      if (ok && kind && kind !== 'wind') {
        ghost = take(kind);
        ghost.position.copy(cellPos(i, TOP + 0.08));
        ghost.scale.setScalar(0.85);
        scene.add(ghost);
      }
      (mergeCells || []).slice(0, glows.length).forEach((c, n) => {
        glows[n].visible = true;
        glows[n].position.copy(cellPos(c, TOP + 0.01));
      });
    }

    function flyAway(g, delay = 0) {
      if (!g) return;
      const from = g.position.clone();
      tween(0.55, (p) => {
        g.position.set(from.x + p * 1.5, from.y + p * 2.5, from.z - p * 1.2);
        g.rotation.y = p * 8;
        g.scale.setScalar(Math.max(0.01, 1 - p));
      }, delay, () => give(g));
    }

    // 규칙이 돌려준 사건을 순서대로 움직임으로 보여 준다. 끝나면 판과 맞춘다.
    function play(events, board, hooks = {}) {
      let t = 0;
      for (const e of events) {
        if (e.type === 'place') {
          const at = t;
          tween(0.01, () => {}, at, () => {
            setItem(e.at, e.kind);
            Kit3D.burst(scene, cellPos(e.at, 0.2), e.rainbow ? '#ffe066' : '#d9f7c7', { count: 6, speed: 2, size: 0.08, life: 0.4 });
            hooks.place?.(e);
          });
          t += 0.12;
        } else if (e.type === 'merge') {
          const at = t;
          const target = cellPos(e.at);
          tween(0.01, () => {}, at, () => {
            for (const c of e.from) {
              const g = items[c];
              items[c] = null;
              if (!g) continue;
              const from = g.position.clone();
              tween(0.26, (p) => {
                g.position.lerpVectors(from, target, Kit3D.ease.outCubic(p));
                g.position.y = from.y + Math.sin(p * Math.PI) * 0.6;
                g.scale.setScalar(Math.max(0.01, 1 - p * 0.7));
              }, 0, () => give(g));
            }
          });
          tween(0.01, () => {}, at + 0.26, () => {
            setItem(e.at, e.kind);
            Kit3D.burst(scene, cellPos(e.at, 0.4), COLORS[e.kind] || '#ffffff', { count: 18, speed: 4.5, size: 0.13, life: 0.75 });
            Kit3D.shake(stage, 0.05 + Math.min(0.25, e.pts / 4000));
            hooks.merge?.(e);
          });
          t += 0.42;
        } else if (e.type === 'festival') {
          const at = t;
          tween(0.01, () => {}, at, () => {
            for (const c of e.cells) {
              Kit3D.burst(scene, cellPos(c, 0.6), '#ffe066', { count: 24, speed: 6, size: 0.15, life: 1.1 });
              flyAway(items[c]);
              items[c] = null;
            }
            Kit3D.shake(stage, 0.45);
            hooks.festival?.(e);
          });
          t += 0.6;
        } else if (e.type === 'trap') {
          const at = t;
          tween(0.01, () => {}, at, () => {
            for (const c of e.cells) {
              setItem(c, 'shell');
              Kit3D.burst(scene, cellPos(c, 0.4), '#ffffff', { count: 10, speed: 3, size: 0.09, life: 0.6 });
            }
            hooks.trap?.(e);
          });
          t += 0.3;
        } else if (e.type === 'blow') {
          const at = t;
          tween(0.01, () => {}, at, () => {
            flyAway(items[e.at]);
            items[e.at] = null;
            Kit3D.burst(scene, cellPos(e.at, 0.3), '#e6f8ff', { count: 14, speed: 3.5, size: 0.1, life: 0.6 });
            hooks.blow?.(e);
          });
          t += 0.3;
        } else if (e.type === 'hop') {
          const at = t;
          tween(0.01, () => {}, at, () => {
            const g = items[e.from];
            items[e.from] = null;
            if (!g) return;
            items[e.to] = g;
            const a = cellPos(e.from);
            const b = cellPos(e.to);
            g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
            tween(0.3, (p) => {
              g.position.lerpVectors(a, b, p);
              g.position.y = Math.sin(p * Math.PI) * 0.35;
            });
            hooks.hop?.(e);
          });
          t += 0.06;
        }
      }
      tween(0.01, () => {}, t + 0.35, () => { sync(board); hooks.done?.(); });
      return t + 0.36;
    }

    stage.onFrame((dt, time) => {
      clock += dt;
      for (let k = tweens.length - 1; k >= 0; k -= 1) {
        const tw = tweens[k];
        if (clock < tw.start) continue;
        const p = Math.min(1, (clock - tw.start) / tw.dur);
        tw.fn(p);
        if (p >= 1) { tweens.splice(k, 1); tw.done?.(); }
      }
      world.waveTex.offset.set(time * 0.012, time * 0.02);
      world.foam.scale.setScalar(1 + Math.sin(time * 1.4) * 0.012);
      for (const g of items) if (g) animateIdle(g, time);
      if (ghost) { ghost.position.y = TOP + 0.08 + Math.sin(time * 5) * 0.05; animateIdle(ghost, time); }
      ring.material.opacity = 0.65 + Math.sin(time * 6) * 0.3;
      glowMat.opacity = 0.35 + Math.sin(time * 6) * 0.2;
    });

    return { stage, scene, camera, items, play, sync, cellAt, screenOf, showCursor, setItem, get busy() { return tweens.length > 0; }, fit };
  }

  function animateIdle(g, time) {
    const u = g.userData;
    const ph = u.phase || 0;
    if (u.sway) g.rotation.z = Math.sin(time * 2.2 + ph) * u.sway;
    if (u.spin) u.spin.rotation.z = time * 2.5;
    if (u.spinY) u.spinY.rotation.y = time * 1.6;
    if (u.lamp) u.lamp.material.emissiveIntensity = 0.6 + Math.sin(time * 4) * 0.4;
    if (u.star) { u.star.rotation.y = time * 2; u.star.position.y = 1.38 + Math.sin(time * 3) * 0.04; }
    if (u.gull) {
      u.gull.body.position.y = Math.abs(Math.sin(time * 3 + ph)) * 0.05;
      const flap = Math.sin(time * 9 + ph) * 0.35;
      u.gull.wings[0].rotation.z = flap;
      u.gull.wings[1].rotation.z = -flap;
    }
  }

  // 손 패에 쓸 그림: 같은 모형을 작은 화면에 한 번씩 찍어 둔다.
  function icons(kinds, size = 160) {
    const out = {};
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      return out;
    }
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#8a7a6a', 1.4));
    const sun = new T.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    for (const kind of kinds) {
      const g = makeModel(kind);
      const box = new T.Box3().setFromObject(g);
      const center = box.getCenter(new T.Vector3());
      const span = Math.max(box.max.y - box.min.y, box.max.x - box.min.x, 0.5);
      cam.position.set(center.x, center.y + span * 1.05, center.z + span * 2.05);
      cam.lookAt(center);
      scene.add(g);
      renderer.render(scene, cam);
      out[kind] = renderer.domElement.toDataURL('image/png');
      scene.remove(g);
    }
    renderer.dispose();
    renderer.forceContextLoss?.();
    return out;
  }

  const COLORS = { sprout: '#9be36b', bush: '#5cc160', tree: '#52b95a', hut: '#f2c94c', house: '#e8574a', mill: '#4a8fd9', lighthouse: '#ffcf33', tower: '#b9a6e8', shell: '#ffb3c1', pearl: '#ffffff', chest: '#ffcf33', gull: '#ffffff' };

  window.IsleScene = { create, icons, cellPos, COLORS };
})();
