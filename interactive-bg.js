(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Basic config — tweak counts/thresholds if needed
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

  const CONFIG = {
    particleCount: prefersReduced ? 0 : (isMobile ? 220 : 380),
    linkDistance: isMobile ? 85 : 110,         // max distance to draw lines between particles
    cursorLinkDistance: isMobile ? 140 : 180,  // max distance for temporary lines to cursor
    particleSize: isMobile ? 6 : 7.5,          // sprite size in px (scaled by DPR in material)
    repelRadius: isMobile ? 90 : 120,          // radius for repelling effect
    repelStrength: isMobile ? 0.09 : 0.12,     // how strongly particles are pushed
    damping: 0.96,                              // velocity damping for smoothness
    driftAmp: 0.12,                             // subtle ambient motion amplitude
    driftSpeed: 0.0008,                         // slower = smoother
    bgColor: 0x061826,
    dotColor: new THREE.Color(0x78baff),       // light blue dots
    lineColor: new THREE.Color(0x5db2ff),      // connecting lines
    opacityDot: 0.9,
    opacityLine: 0.35
  };

  // Early exit if reduced motion
  if (CONFIG.particleCount === 0) {
    // still create a static canvas to keep layout consistent
    const container = document.getElementById('bg3d');
    container.style.backgroundColor = '#061826';
    return;
  }

  // Renderer
  const container = document.getElementById('bg3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(CONFIG.bgColor, 1);
  container.appendChild(renderer.domElement);

  // Scene + Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 2000);
  camera.position.z = 400;

  // Fog helps depth feel (very subtle)
  scene.fog = new THREE.FogExp2(CONFIG.bgColor, 0.0022);

  // Create a radial gradient sprite for soft glowing dots (generated at runtime)
  function makeDotTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, 'rgba(120,186,255,1)');   // center bright
    g.addColorStop(0.35, 'rgba(120,186,255,0.9)');
    g.addColorStop(0.7, 'rgba(120,186,255,0.25)');
    g.addColorStop(1, 'rgba(120,186,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }
  const dotTexture = makeDotTexture();

  // Particle geometry
  const count = CONFIG.particleCount;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const anchors = new Float32Array(count * 3); // base positions for drift
  const seeds = new Float32Array(count);       // per-particle drift seed

  // Spawn in a wide, shallow volume
  const rangeX = 900, rangeY = 420, rangeZ = 600;
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const x = (Math.random() - 0.5) * rangeX;
    const y = (Math.random() - 0.5) * rangeY;
    const z = (Math.random() - 0.5) * rangeZ;
    positions[ix] = anchors[ix] = x;
    positions[ix + 1] = anchors[ix + 1] = y;
    positions[ix + 2] = anchors[ix + 2] = z;

    velocities[ix] = (Math.random() - 0.5) * 0.4;
    velocities[ix + 1] = (Math.random() - 0.5) * 0.4;
    velocities[ix + 2] = (Math.random() - 0.5) * 0.4;

    seeds[i] = Math.random() * 1000;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMat = new THREE.PointsMaterial({
    map: dotTexture,
    color: CONFIG.dotColor,
    size: CONFIG.particleSize * DPR,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    opacity: CONFIG.opacityDot,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // Line segments (between particles)
  // Prepare a generous buffer; we'll update each frame
  const maxSegments = count * 6; // heuristic
  const linePositions = new Float32Array(maxSegments * 6); // 2 points per segment, 3 coords each
  const lineColors = new Float32Array(maxSegments * 6);
  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  linesGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
  linesGeo.setDrawRange(0, 0);
  const linesMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: CONFIG.opacityLine,
    blending: THREE.AdditiveBlending
  });
  const lines = new THREE.LineSegments(linesGeo, linesMat);
  scene.add(lines);

  // Cursor line(s): from cursor to nearby particles
  const cursorLinePositions = new Float32Array(count * 6);
  const cursorLineColors = new Float32Array(count * 6);
  const cursorGeo = new THREE.BufferGeometry();
  cursorGeo.setAttribute('position', new THREE.BufferAttribute(cursorLinePositions, 3).setUsage(THREE.DynamicDrawUsage));
  cursorGeo.setAttribute('color', new THREE.BufferAttribute(cursorLineColors, 3).setUsage(THREE.DynamicDrawUsage));
  cursorGeo.setDrawRange(0, 0);
  const cursorLines = new THREE.LineSegments(cursorGeo, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: Math.min(1, CONFIG.opacityLine + 0.2),
    blending: THREE.AdditiveBlending
  }));
  scene.add(cursorLines);

  // Pointer handling (mouse & touch via Pointer Events)
  const pointer = new THREE.Vector2(9999, 9999); // offscreen initially
  const pointer3D = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0 plane for mapping pointer
  let pointerActive = false;

  function updatePointer(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, pointer3D);
    pointerActive = true;
  }

  window.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => updatePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerup', () => { pointerActive = false; }, { passive: true });
  window.addEventListener('pointercancel', () => { pointerActive = false; }, { passive: true });
  window.addEventListener('mouseleave', () => { pointerActive = false; }, { passive: true });

  // Resize handling
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const resizeObs = new ResizeObserver(onResize);
  resizeObs.observe(container);
  window.addEventListener('orientationchange', onResize);

  // Animation loop
  const tmpVec = new THREE.Vector3();
  const posAttr = pointsGeo.getAttribute('position');

  function animate(ts = 0) {
    requestAnimationFrame(animate);

    const time = ts * CONFIG.driftSpeed;

    // Update particles (drift + repel + bounds)
    for (let i = 0; i < count; i++) {
      const ix = i * 3;

      // Subtle organic drift relative to anchor
      const seed = seeds[i];
      const dx = Math.sin(time + seed) * CONFIG.driftAmp * 10;
      const dy = Math.cos(time * 1.1 + seed) * CONFIG.driftAmp * 10;
      const dz = Math.sin(time * 0.9 + seed * 1.3) * CONFIG.driftAmp * 14;

      let x = positions[ix] + velocities[ix];
      let y = positions[ix + 1] + velocities[ix + 1];
      let z = positions[ix + 2] + velocities[ix + 2];

      // Repel from pointer
      if (pointerActive) {
        tmpVec.set(x, y, z);
        const dist = tmpVec.distanceTo(pointer3D);
        if (dist < CONFIG.repelRadius && dist > 0.001) {
          const force = (1 - dist / CONFIG.repelRadius) * CONFIG.repelStrength;
          const dirX = (tmpVec.x - pointer3D.x) / dist;
          const dirY = (tmpVec.y - pointer3D.y) / dist;
          const dirZ = (tmpVec.z - pointer3D.z) / dist;
          velocities[ix] += dirX * force;
          velocities[ix + 1] += dirY * force;
          velocities[ix + 2] += dirZ * force;
        }
      }

      // Gentle pull toward drifted anchor point
      velocities[ix] += ((anchors[ix] + dx) - x) * 0.0009;
      velocities[ix + 1] += ((anchors[ix + 1] + dy) - y) * 0.0009;
      velocities[ix + 2] += ((anchors[ix + 2] + dz) - z) * 0.0009;

      // Damping (smoothness)
      velocities[ix] *= CONFIG.damping;
      velocities[ix + 1] *= CONFIG.damping;
      velocities[ix + 2] *= CONFIG.damping;

      // Update positions
      positions[ix] = x + velocities[ix];
      positions[ix + 1] = y + velocities[ix + 1];
      positions[ix + 2] = z + velocities[ix + 2];

      // Soft bounds (wrap + slight random nudge)
      if (positions[ix] < -rangeX/1.1 || positions[ix] > rangeX/1.1) velocities[ix] *= -0.8;
      if (positions[ix + 1] < -rangeY/1.1 || positions[ix + 1] > rangeY/1.1) velocities[ix + 1] *= -0.8;
      if (positions[ix + 2] < -rangeZ/1.1 || positions[ix + 2] > rangeZ/1.1) velocities[ix + 2] *= -0.8;
    }
    posAttr.needsUpdate = true;

    // Build inter-particle lines
    let segs = 0;
    const max = maxSegments;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const xi = positions[ix], yi = positions[ix + 1], zi = positions[ix + 2];
      for (let j = i + 1; j < count; j++) {
        const jx = j * 3;
        const xj = positions[jx], yj = positions[jx + 1], zj = positions[jx + 2];
        const dx = xi - xj, dy = yi - yj, dz = zi - zj;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < CONFIG.linkDistance * CONFIG.linkDistance) {
          if ((segs + 1) * 6 > linePositions.length) break;
          const alpha = 1 - Math.sqrt(d2) / CONFIG.linkDistance; // fade with distance
          const c = CONFIG.lineColor.clone().lerp(CONFIG.dotColor, 0.25).multiplyScalar(1.0);

          // write segment
          let o = segs * 6;
          linePositions[o] = xi; linePositions[o+1] = yi; linePositions[o+2] = zi;
          linePositions[o+3] = xj; linePositions[o+4] = yj; linePositions[o+5] = zj;
          lineColors[o] = c.r; lineColors[o+1] = c.g; lineColors[o+2] = c.b;
          lineColors[o+3] = c.r; lineColors[o+4] = c.g; lineColors[o+5] = c.b;

          // scale per-vertex opacity by material.opacity; we simulate by lowering colors
          // (LineBasicMaterial has no per-vertex alpha, so we rely on material opacity)
          linesMat.opacity = CONFIG.opacityLine * (0.85 + 0.15 * Math.min(alpha + 0.15, 1));

          segs++;
          if (segs >= max) break;
        }
      }
      if (segs >= max) break;
    }
    linesGeo.setDrawRange(0, segs * 2);
    linesGeo.attributes.position.needsUpdate = true;
    linesGeo.attributes.color.needsUpdate = true;

    // Cursor lines
    let csegs = 0;
    if (pointerActive) {
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const xi = positions[ix], yi = positions[ix + 1], zi = positions[ix + 2];
        const dx = xi - pointer3D.x, dy = yi - pointer3D.y, dz = zi - pointer3D.z;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < CONFIG.cursorLinkDistance * CONFIG.cursorLinkDistance) {
          const d = Math.sqrt(d2);
          const alpha = 1 - d / CONFIG.cursorLinkDistance;
          const o = csegs * 6;
          cursorLinePositions[o] = pointer3D.x; cursorLinePositions[o+1] = pointer3D.y; cursorLinePositions[o+2] = pointer3D.z;
          cursorLinePositions[o+3] = xi; cursorLinePositions[o+4] = yi; cursorLinePositions[o+5] = zi;
          const c = CONFIG.dotColor.clone().lerp(CONFIG.lineColor, 0.5);
          // fade by distance using color intensity
          const f = 0.6 + 0.4 * alpha;
          cursorLineColors[o] = c.r * f; cursorLineColors[o+1] = c.g * f; cursorLineColors[o+2] = c.b * f;
          cursorLineColors[o+3] = c.r * f; cursorLineColors[o+4] = c.g * f; cursorLineColors[o+5] = c.b * f;
          csegs++;
        }
        if ((csegs + 1) * 6 > cursorLinePositions.length) break;
      }
    }
    cursorGeo.setDrawRange(0, csegs * 2);
    cursorGeo.attributes.position.needsUpdate = true;
    cursorGeo.attributes.color.needsUpdate = true;

    // Slight parallax on the container for extra depth
    if (pointerActive) {
      const px = pointer.x * 3; // tiny shift
      const py = pointer.y * 3;
      container.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    }

    renderer.render(scene, camera);
  }
  animate();

  // Cleanup if needed (SPA navigation etc.)
  window.addEventListener('beforeunload', () => {
    renderer.dispose();
    pointsGeo.dispose(); linesGeo.dispose(); cursorGeo.dispose();
    pointsMat.dispose(); linesMat.dispose(); cursorLines.material.dispose();
    dotTexture.dispose();
  });
})();
