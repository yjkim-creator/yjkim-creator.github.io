// 층층 베이커리의 3D 무대: 빵집 계산대, 케이크 받침, 층, 흔들리는 짤주머니, 손님.
// 모든 물체는 THREE 기본 도형으로 만들고 Kit3D.toon으로 칠한다. 층과 부스러기는 미리 만든 것을 다시 쓴다.
(function () {
  const H = Logic.LAYER_H;
  const PLATE_TOP = 0.62; // 받침 윗면 높이

  function build(container) {
    const stage = Kit3D.stage(container, { sky: ['#ffcfc0', '#fff3e3'], fog: 60, shadowSize: 6, fov: 50 });
    const { scene, camera } = stage;
    stage.hemi.intensity = 1.25;
    const toon = Kit3D.toon;

    // ---------- 빵집 ----------
    const wood = Kit3D.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#d39a68';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i += 1) {
        g.fillStyle = i % 2 ? 'rgba(120,70,40,.10)' : 'rgba(255,230,200,.10)';
        g.fillRect(0, i * 16, w, 16);
        g.strokeStyle = 'rgba(110,60,30,.18)';
        g.beginPath();
        g.moveTo(0, i * 16 + 8);
        for (let x = 0; x <= w; x += 32) g.quadraticCurveTo(x + 16, i * 16 + 8 + ((i * 7 + x) % 5) - 2, x + 32, i * 16 + 8);
        g.stroke();
      }
    });
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(3, 2);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 7), toon('#ffffff', { map: wood }));
    counter.position.set(0, -0.5, -0.5);
    counter.receiveShadow = true;
    scene.add(counter);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 0.25), toon('#f59ab0'));
    trim.position.set(0, -0.09, 3.05);
    scene.add(trim);

    const wall = Kit3D.canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#fde9dc';
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(245,154,176,.22)'; g.fillRect(x, 0, 28, h); }
      for (let y = 30; y < h; y += 90) for (let x = 46; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x + ((y / 90) % 2) * 32, y, 4, 0, 7); g.fill(); }
      g.fillStyle = '#c98a6a';
      g.fillRect(0, h - 70, w, 70);
      g.fillStyle = '#b27455';
      for (let x = 0; x < w; x += 40) g.fillRect(x, h - 70, 3, 70);
    });
    wall.wrapS = THREE.RepeatWrapping;
    wall.repeat.set(4, 1);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(44, 30), new THREE.MeshBasicMaterial({ map: wall, fog: true }));
    back.position.set(0, 11, -9);
    scene.add(back);

    // 창문: 바깥 하늘과 구름
    const windowTex = Kit3D.canvasTexture(256, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#8fd0ff');
      grad.addColorStop(1, '#d9f1ff');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff';
      for (const [x, y, s] of [[60, 70, 26], [170, 120, 34], [90, 190, 20]]) {
        g.beginPath(); g.arc(x, y, s, 0, 7); g.arc(x + s, y + 6, s * 0.8, 0, 7); g.arc(x - s * 0.9, y + 8, s * 0.7, 0, 7); g.fill();
      }
      g.strokeStyle = '#ffffff';
      g.lineWidth = 14;
      g.strokeRect(0, 0, w, h);
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    });
    for (const x of [-6.2, 6.2]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.6), new THREE.MeshBasicMaterial({ map: windowTex }));
      win.position.set(x, 6.4, -8.95);
      scene.add(win);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 0.5), toon('#ffffff'));
      sill.position.set(x, 4, -8.75);
      scene.add(sill);
    }

    // 선반과 병
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 1), toon('#b97b55'));
    shelf.position.set(0, 3.2, -8.5);
    scene.add(shelf);
    const jarColors = ['#f59ab0', '#ffd166', '#9cc47a', '#b89ad6', '#ef8f3c'];
    jarColors.forEach((c, i) => {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 16), toon('#ffffff', { transparent: true, opacity: 0.85 }));
      jar.position.set(-2.4 + i * 1.2, 3.72, -8.4);
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), toon(c));
      fill.position.y = -0.12;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), toon('#7a4a32'));
      lid.position.y = 0.46;
      jar.add(fill, lid);
      scene.add(jar);
    });

    // 깃발 장식
    const flagGeo = new THREE.ConeGeometry(0.32, 0.7, 3);
    const flagMats = ['#f59ab0', '#ffd166', '#86dcc6', '#ffffff'].map((c) => toon(c));
    for (let i = 0; i < 15; i += 1) {
      const x = -10.5 + i * 1.5;
      const flag = new THREE.Mesh(flagGeo, flagMats[i % 4]);
      flag.rotation.x = Math.PI;
      flag.position.set(x, 10.4 - Math.sin((i / 14) * Math.PI) * 0.9, -8.6);
      scene.add(flag);
    }

    // ---------- 케이크 받침 ----------
    const stand = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.1, 0.14, 48), toon('#ffffff'));
    plate.position.y = PLATE_TOP - 0.07;
    const lace = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 6, 48), toon('#ffe0ea'));
    lace.rotation.x = Math.PI / 2;
    lace.position.y = PLATE_TOP - 0.02;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.5, 20), toon('#ffffff'));
    stem.position.y = 0.25;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.1, 32), toon('#ffffff'));
    foot.position.y = 0.05;
    plate.castShadow = true;
    plate.receiveShadow = true;
    stand.add(plate, lace, stem, foot);
    scene.add(stand);

    // ---------- 층 ----------
    const sideMats = new Map();
    function layerMats(flavorId) {
      if (!sideMats.has(flavorId)) {
        const f = Logic.flavor(flavorId);
        const side = Kit3D.canvasTexture(256, 64, (g, w, h) => {
          g.fillStyle = f.color;
          g.fillRect(0, 0, w, h);
          // 스펀지 결
          const rand = Logic.rng(Logic.hash(flavorId));
          for (let i = 0; i < 70; i += 1) {
            g.fillStyle = i % 2 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.07)';
            g.beginPath();
            g.arc(4 + rand() * (w - 8), 24 + rand() * (h - 30), 1 + rand() * 1.5, 0, 7);
            g.fill();
          }
          // 위쪽 크림과 흘러내린 자국
          g.fillStyle = f.cream;
          g.fillRect(0, 0, w, 14);
          for (let x = 0; x < w; x += 16) {
            const len = 8 + ((x * 13) % 17);
            g.beginPath();
            g.moveTo(x, 12);
            g.lineTo(x + 10, 12);
            g.lineTo(x + 10, 12 + len - 4);
            g.arc(x + 5, 12 + len - 4, 5, 0, Math.PI);
            g.fill();
          }
          g.fillStyle = 'rgba(0,0,0,.12)';
          g.fillRect(0, h - 4, w, 4);
        });
        side.wrapS = THREE.RepeatWrapping;
        side.repeat.set(3, 1);
        sideMats.set(flavorId, [toon('#ffffff', { map: side }), toon(f.cream), toon(f.color)]);
      }
      return sideMats.get(flavorId);
    }
    const layerGeo = new THREE.CylinderGeometry(1, 1, H, 40);
    const rimGeo = new THREE.TorusGeometry(0.97, 0.07, 6, 40);
    const rimMats = new Map();
    const rimMat = (flavorId) => {
      if (!rimMats.has(flavorId)) rimMats.set(flavorId, toon(Logic.flavor(flavorId).cream));
      return rimMats.get(flavorId);
    };
    function makeLayer() {
      const group = new THREE.Group();
      const body = new THREE.Mesh(layerGeo, layerMats('vanilla'));
      body.castShadow = true;
      body.receiveShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat('vanilla'));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H / 2;
      group.add(body, rim);
      group.userData = { body, rim, flavor: 'vanilla' };
      return group;
    }
    function paintLayer(group, flavorId) {
      if (group.userData.flavor === flavorId) return;
      group.userData.flavor = flavorId;
      group.userData.body.material = layerMats(flavorId);
      group.userData.rim.material = rimMat(flavorId);
    }
    const cake = new THREE.Group();
    scene.add(cake);
    const pool = [];
    function setLayers(layers, squashLast = 0) {
      while (pool.length < layers.length) {
        const g = makeLayer();
        pool.push(g);
        cake.add(g);
      }
      pool.forEach((g, i) => {
        const l = layers[i];
        g.visible = Boolean(l);
        if (!l) return;
        paintLayer(g, l.flavor);
        const squash = i === layers.length - 1 ? squashLast : 0;
        g.scale.set(l.r * (1 + squash * 0.25), 1 - squash * 0.4, l.r * (1 + squash * 0.25));
        g.position.set(l.x, layerY(i) - squash * H * 0.2, l.z);
        // 그림자는 위쪽 몇 층만(아래층은 어차피 가려진다)
        g.userData.body.castShadow = i >= layers.length - 6;
      });
    }
    const layerY = (i) => PLATE_TOP + H / 2 + i * H;

    // 떠 있는 새 층과 짤주머니
    const hover = makeLayer();
    scene.add(hover);
    const bag = new THREE.Group();
    const bagBody = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 20), toon('#ffffff'));
    bagBody.rotation.x = Math.PI;
    bagBody.position.y = 0.55;
    const bagBand = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 6, 20), toon('#f59ab0'));
    bagBand.rotation.x = Math.PI / 2;
    bagBand.position.y = 0.95;
    const bagTip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.2, 10), toon('#c0c6cf'));
    bagTip.position.y = -0.04;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), toon('#ffffff'));
    string.position.y = -0.38;
    bag.add(bagBody, bagBand, bagTip, string);
    scene.add(bag);

    // 겨냥 고리: 떨어질 자리를 위층 위에 비춘다
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const centerDot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
    centerDot.rotation.x = -Math.PI / 2;
    scene.add(centerDot);

    // 잘려 나가는 부스러기: 미리 만든 6조각을 돌려 쓴다
    const scraps = Array.from({ length: 6 }, () => {
      const m = makeLayer();
      m.visible = false;
      m.userData.v = new THREE.Vector3();
      m.userData.spin = new THREE.Vector3();
      m.userData.life = 0;
      scene.add(m);
      return m;
    });
    let scrapIndex = 0;
    function scrap(pos, radius, flavorId, push) {
      const m = scraps[scrapIndex % scraps.length];
      scrapIndex += 1;
      paintLayer(m, flavorId);
      m.visible = true;
      m.position.copy(pos);
      m.rotation.set(0, 0, 0);
      m.scale.set(radius, 0.9, radius);
      m.userData.v.set(push.x * 2.2, 1.2, push.z * 2.2);
      m.userData.spin.set(push.z * 5, 0, -push.x * 5);
      m.userData.life = 1.6;
    }

    // 주문 완성 장식: 딸기와 초
    const topper = new THREE.Group();
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), toon('#e8364a'));
    berry.scale.y = 1.15;
    berry.position.set(0.32, 0.25, 0.1);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 5), toon('#5aa846'));
    leaf.position.set(0.32, 0.53, 0.1);
    leaf.rotation.x = Math.PI;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), toon('#a7d8ff'));
    candle.position.set(-0.2, 0.35, -0.05);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffcc33' }));
    flame.scale.y = 1.6;
    flame.position.set(-0.2, 0.8, -0.05);
    topper.add(berry, leaf, candle, flame);
    topper.visible = false;
    scene.add(topper);

    // ---------- 손님 ----------
    const guest = new THREE.Group();
    guest.position.set(3.15, 0, -1.9);
    guest.rotation.y = -0.5;
    scene.add(guest);
    const guestParts = { kind: '' };
    function buildGuest(id) {
      if (guestParts.kind === id) return;
      guestParts.kind = id;
      while (guest.children.length) guest.remove(guest.children[0]);
      const c = Logic.customer(id);
      const fur = toon(c.fur);
      const dark = toon('#2b2230');
      const pink = toon('#ff9fb4');
      const apron = toon(id === 'frog' ? '#ffd166' : '#ffffff');
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 18), fur);
      body.scale.set(1, 1.15, 0.9);
      body.position.y = 0.9;
      body.castShadow = true;
      const front = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), apron);
      front.scale.set(1, 1.1, 0.55);
      front.position.set(0, 0.85, 0.42);
      const head = new THREE.Group();
      head.position.y = 2.15;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 18), fur);
      skull.castShadow = true;
      head.add(skull);
      const eyeGeo = new THREE.SphereGeometry(0.075, 10, 8);
      for (const s of [-1, 1]) {
        if (id === 'panda') {
          const patch = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), dark);
          patch.scale.set(1, 1.3, 0.5);
          patch.position.set(s * 0.23, 0.06, 0.56);
          patch.rotation.z = s * 0.5;
          head.add(patch);
        }
        const eye = new THREE.Mesh(eyeGeo, id === 'panda' ? toon('#ffffff') : dark);
        eye.position.set(s * 0.22, 0.08, id === 'frog' ? 0.5 : 0.61);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), toon('#ffffff'));
        shine.position.set(0.03, 0.03, 0.06);
        eye.add(shine);
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), pink);
        cheek.scale.set(1, 0.6, 0.4);
        cheek.position.set(s * 0.38, -0.14, 0.52);
        head.add(eye, cheek);
        // 귀
        let ear;
        if (id === 'bunny') {
          ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.7, 4, 10), fur);
          ear.position.set(s * 0.25, 0.85, -0.05);
          ear.rotation.z = -s * 0.15;
          const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 4, 8), pink);
          inner.position.z = 0.08;
          ear.add(inner);
        } else if (id === 'fox' || id === 'cat') {
          ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 4), fur);
          ear.position.set(s * 0.36, 0.6, 0);
          ear.rotation.z = -s * 0.35;
        } else if (id === 'frog') {
          ear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), fur);
          ear.position.set(s * 0.24, 0.42, 0.28);
          eye.position.set(s * 0.24, 0.48, 0.48);
          eye.scale.setScalar(1.3);
        } else {
          ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), id === 'panda' ? dark : fur);
          ear.position.set(s * 0.45, 0.48, -0.05);
        }
        head.add(ear);
      }
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), toon(id === 'fox' ? '#fff3e6' : id === 'frog' ? '#a7dd8f' : '#f6e7da'));
      snout.scale.set(1.2, 0.8, 0.8);
      snout.position.set(0, -0.12, 0.56);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark);
      nose.position.set(0, -0.06, 0.73);
      head.add(snout, nose);
      // 작은 제빵 모자
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.3, 16), toon('#ffffff'));
      hat.position.set(0.12, 0.66, -0.1);
      hat.rotation.z = -0.25;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), toon('#ffffff'));
      puff.position.y = 0.25;
      hat.add(puff);
      if (id !== 'bunny') head.add(hat);
      guest.add(body, front, head);
      guestParts.head = head;
      guestParts.body = body;
    }

    // ---------- 매 프레임 갱신 도우미 ----------
    let guestHop = 0;
    let guestNod = 0;
    function update(dt, time) {
      for (const m of scraps) {
        if (!m.visible) continue;
        m.userData.life -= dt;
        m.userData.v.y -= 14 * dt;
        m.position.addScaledVector(m.userData.v, dt);
        m.rotation.x += m.userData.spin.x * dt;
        m.rotation.z += m.userData.spin.z * dt;
        if (m.userData.life <= 0 || m.position.y < -6) m.visible = false;
      }
      guestHop = Math.max(0, guestHop - dt * 2.4);
      guestNod = Math.max(0, guestNod - dt * 1.5);
      if (guestParts.head) {
        guest.position.y = Math.sin(guestHop * Math.PI) * 0.5;
        guestParts.head.rotation.z = Math.sin(time * 1.6) * 0.06 + Math.sin(guestNod * 18) * guestNod * 0.25;
        guestParts.body.scale.y = 1.15 + Math.sin(time * 2.2) * 0.02;
      }
      flame.scale.set(1 + Math.sin(time * 23) * 0.1, 1.6 + Math.sin(time * 17) * 0.25, 1);
    }

    return {
      stage, scene, camera, cake, hover, bag, ring, ringMat, centerDot, topper, guest,
      PLATE_TOP, layerY, setLayers, paintLayer, scrap, buildGuest, update,
      hop() { guestHop = 1; },
      nod() { guestNod = 1; },
    };
  }

  window.BakeryScene = { build };
})();
