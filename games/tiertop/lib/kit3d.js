// 공장 공용 3D 도우미. three.js(lib/three.min.js) 위에서 휴대폰에 맞는 무대를 차린다.
// 앱은 이 파일을 고치지 않는다. 필요한 것은 src 쪽에서 THREE로 직접 만든다.
//   const stage = Kit3D.stage(document.getElementById('app'), { sky: ['#8fd3ff', '#fff2d6'], fog: 60 });
//   stage.onFrame((dt, time) => { ... });   매 프레임. dt는 초, 화면이 가려지면 멈춘다
//   Kit3D.burst(stage.scene, position, '#ffcc00')   터지는 조각
//   Kit3D.shake(stage, 0.4)                          화면 흔들림
//   Kit3D.toon('#ff6a3d')                            만화풍 재질
//   Kit3D.canvasTexture(256, 256, (g, w, h) => {...}) 코드로 그리는 무늬
(function () {
  const T = window.THREE;
  if (!T) throw new Error('kit3d.js보다 three.min.js를 먼저 불러야 함');

  const Kit3D = { frames: 0 };
  let toonRamp = null;

  Kit3D.canvasTexture = (w, h, paint) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    paint(canvas.getContext('2d'), w, h);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  };

  Kit3D.toon = (color, extra = {}) => {
    if (!toonRamp) {
      toonRamp = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
      toonRamp.minFilter = T.NearestFilter;
      toonRamp.magFilter = T.NearestFilter;
      toonRamp.needsUpdate = true;
    }
    return new T.MeshToonMaterial({ color, gradientMap: toonRamp, ...extra });
  };

  Kit3D.stage = (container, options = {}) => {
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: Boolean(options.keepFrame) });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = options.exposure ?? 1.05;
    renderer.shadowMap.enabled = options.shadows !== false;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
    container.style.position = container.style.position || 'relative';
    container.prepend(canvas);

    const scene = new T.Scene();
    const sky = options.sky || ['#86c9ff', '#f4f1e6'];
    scene.background = Kit3D.canvasTexture(4, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, sky[0]);
      grad.addColorStop(1, sky[1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    if (options.fog) scene.fog = new T.Fog(sky[1], options.fog * 0.35, options.fog);

    const camera = new T.PerspectiveCamera(options.fov || 55, 1, 0.1, options.far || 400);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0, 0);

    const hemi = new T.HemisphereLight(sky[0], options.ground || '#5a4a3a', 1.1);
    scene.add(hemi);
    const sun = new T.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(6, 12, 5);
    sun.castShadow = renderer.shadowMap.enabled;
    sun.shadow.mapSize.set(1024, 1024);
    const s = options.shadowSize || 14;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);

    const stage = {
      renderer, scene, camera, sun, hemi, canvas,
      shakeAmount: 0,
      callbacks: [],
      onFrame(fn) { stage.callbacks.push(fn); },
      // 그림자 영역을 따라다니게 한다(넓은 맵에서 주인공 주변만 그림자를 그린다).
      followSun(target) {
        sun.position.set(target.x + 6, target.y + 12, target.z + 5);
        sun.target.position.copy(target);
      },
      resize() {
        const w = container.clientWidth || innerWidth;
        const h = container.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },
      render() {
        const base = camera.position.clone();
        if (stage.shakeAmount > 0.001) {
          camera.position.x += (Math.random() - 0.5) * stage.shakeAmount;
          camera.position.y += (Math.random() - 0.5) * stage.shakeAmount;
        }
        renderer.render(scene, camera);
        camera.position.copy(base);
        Kit3D.frames += 1;
      },
    };
    addEventListener('resize', stage.resize);
    stage.resize();

    let last = performance.now();
    let elapsed = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); // 탭을 오래 비웠다 와도 한 번에 튀지 않는다.
      last = now;
      if (document.hidden) return;
      elapsed += dt;
      for (const fn of stage.callbacks) fn(dt, elapsed);
      stage.shakeAmount *= 0.86;
      Kit3D.updateParticles(dt);
      stage.render();
    }
    requestAnimationFrame(loop);
    return stage;
  };

  Kit3D.shake = (stage, amount) => { stage.shakeAmount = Math.max(stage.shakeAmount, amount); };

  // ---------- 터지는 조각 ----------
  const particles = [];
  const cube = new T.BoxGeometry(1, 1, 1);
  Kit3D.burst = (scene, position, color = '#ffffff', { count = 14, speed = 5, size = 0.18, life = 0.8 } = {}) => {
    const material = new T.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < count; i += 1) {
      const mesh = new T.Mesh(cube, material);
      mesh.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      mesh.position.copy(position);
      const dir = new T.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
      scene.add(mesh);
      particles.push({ mesh, material, velocity: dir.multiplyScalar(speed * (0.5 + Math.random())), life, age: 0, scene });
    }
  };
  Kit3D.updateParticles = (dt) => {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += dt;
      p.velocity.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
      p.material.opacity = Math.max(0, 1 - p.age / p.life);
      if (p.age >= p.life) {
        p.scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
  };

  // ---------- 자주 쓰는 계산 ----------
  Kit3D.damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
  Kit3D.ease = { outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, outCubic: (t) => 1 - (1 - t) ** 3 };

  window.Kit3D = Kit3D;
})();
