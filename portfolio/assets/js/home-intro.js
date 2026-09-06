(() => {
  'use strict';
  const bench = document.getElementById('workbench');
  const canvas = document.getElementById('curiosity-orb');
  const touch = document.getElementById('orb-touch');
  const toggle = document.getElementById('motion-toggle');
  if (!bench || !canvas || !touch || !toggle) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    touch.hidden = true;
    toggle.hidden = true;
    document.querySelector('.bench-instruction').textContent = 'Explore a question below.';
    return;
  }
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const ideas = [
    { question: 'What if you could hold a feeling?', label: 'Meet MoodBall', url: 'projects/moodball/' },
    { question: 'Could everyday objects help us care?', label: 'Explore FoodCare', url: 'projects/foodcare/' },
    { question: 'When should a smart object ask us?', label: 'Explore the research', url: 'projects/smart-medication/' },
    { question: 'Could a washer listen, then wait?', label: 'Meet Washing Machine', url: 'projects/washing-machine/' }
  ];
  let width = 0, height = 0, frame = 0, lastTime = 0, time = 0;
  let paused = preference.matches, visible = true, index = 0;
  let active = false, strength = .27, pulse = 0, down = null;
  let bounce = null;
  const target = { x: -.32, y: -.25 }, light = { x: -.32, y: -.25 };
  const count = 1150;
  // An even spherical point distribution keeps the glass open, without opaque polygons.
  const points = Array.from({ length: count }, (_, i) => {
    const y = 1 - (i + .5) / count * 2;
    const ring = Math.sqrt(1 - y * y), angle = i * 2.399963229728653;
    return { x: ring * Math.cos(angle), y, z: ring * Math.sin(angle), glow: 0 };
  });
  const edges = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = points[i], b = points[j];
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 < .015) edges.push([i, j]);
    }
  }
  const projected = points.map(() => ({ x: 0, y: 0, z: 0, glow: 0, warm: false }));
  const glowColors = ['104,244,232', '205,255,226', '231,255,99'];
  const sprites = glowColors.map(color => {
    const image = document.createElement('canvas'); image.width = image.height = 64;
    const brush = image.getContext('2d');
    if (!brush) return null;
    const glow = brush.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, `rgba(${color},1)`);
    glow.addColorStop(.075, `rgba(${color},.95)`);
    glow.addColorStop(.22, `rgba(${color},.4)`);
    glow.addColorStop(.55, `rgba(${color},.085)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    brush.fillStyle = glow; brush.fillRect(0, 0, 64, 64);
    return image;
  });
  const moving = () => !paused && !preference.matches;
  function geometry() {
    return { x: width * .51, y: height * .465, radius: Math.min(width * .405, height * .405) };
  }
  function animate() {
    if (!frame && visible && !document.hidden && moving()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const g = geometry();
    touch.style.left = `${g.x - g.radius}px`; touch.style.top = `${g.y - g.radius}px`;
    touch.style.width = touch.style.height = `${g.radius * 2}px`;
    draw(1);
  }
  function draw(step = 1 / 60) {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const g = geometry(), r = g.radius;
    const yaw = time * .038, pitch = -.13;
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sx = Math.sin(pitch), cx = Math.cos(pitch);
    const q = Math.hypot(light.x, light.y), k = q > .96 ? .96 / q : 1;
    const lx = light.x * k, ly = light.y * k, lz = Math.sqrt(Math.max(.02, 1 - lx * lx - ly * ly));
    const lpX = g.x + lx * r, lpY = g.y + ly * r;
    // A faint optical edge and a transparent centre show both halves of the structure.
    const atmosphere = ctx.createRadialGradient(g.x, g.y, r * .87, g.x, g.y, r * 1.23);
    atmosphere.addColorStop(0, 'rgba(67,148,141,0)');
    atmosphere.addColorStop(.36, 'rgba(91,174,165,.065)');
    atmosphere.addColorStop(1, 'rgba(53,128,122,0)');
    ctx.fillStyle = atmosphere; ctx.fillRect(g.x - r * 1.25, g.y - r * 1.25, r * 2.5, r * 2.5);
    const glass = ctx.createRadialGradient(g.x - r * .17, g.y - r * .19, r * .08, g.x, g.y, r);
    glass.addColorStop(0, 'rgba(178,227,217,.004)');
    glass.addColorStop(.8, 'rgba(156,221,208,.008)');
    glass.addColorStop(.965, 'rgba(146,219,204,.035)');
    glass.addColorStop(1, 'rgba(194,243,230,.13)');
    ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < count; i++) {
      const p = points[i], out = projected[i];
      const rx = p.x * cy + p.z * sy, rz = -p.x * sy + p.z * cy;
      const ry = p.y * cx - rz * sx, z = p.y * sx + rz * cx;
      const dot = Math.max(-1, Math.min(1, rx * lx + ry * ly + z * lz));
      const cone = Math.max(0, (dot - .62) / .38);
      const local = Math.pow(cone, 2.4) * strength;
      const wave = pulse > 0 ? Math.max(0, 1 - Math.abs(Math.acos(dot) - (1 - pulse) * 3.1) / .16) * pulse : 0;
      const desired = Math.max(local, wave * .9);
      const blend = moving() ? 1 - Math.exp(-step * (desired > p.glow ? 17 : 3.4)) : 1;
      p.glow += (desired - p.glow) * blend;
      out.x = g.x + rx * r; out.y = g.y + ry * r; out.z = z; out.glow = p.glow;
      out.warm = cone > .64 && (rx + ry * .65 > lx + ly * .65 - .17);
    }
    // Back-facing lines are intentionally visible through the glass.
    for (let side = 0; side < 2; side++) {
      ctx.beginPath();
      for (const [i, j] of edges) {
        const a = projected[i], b = projected[j];
        if ((a.z + b.z > 0 ? 1 : 0) !== side) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.lineWidth = side ? .6 : .42;
      ctx.strokeStyle = side ? 'rgba(149,187,179,.12)' : 'rgba(131,163,158,.044)';
      ctx.stroke();
    }
    // Light blooms over a local patch, never filling the whole sphere.
    ctx.save(); ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(lpX, lpY, 0, lpX, lpY, r * .52);
    bloom.addColorStop(0, `rgba(72,211,195,${strength * .085})`);
    bloom.addColorStop(.45, `rgba(68,181,169,${strength * .043})`);
    bloom.addColorStop(1, 'rgba(63,172,161,0)');
    ctx.fillStyle = bloom; ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
    // Quantised paths keep the number of canvas stroke calls bounded.
    for (let band = 0; band < 6; band++) {
      for (let color = 0; color < 2; color++) {
        ctx.beginPath(); let used = false;
        for (const [i, j] of edges) {
          const a = projected[i], b = projected[j], energy = (a.glow + b.glow) * .5;
          if (energy < .035 || Math.min(5, Math.floor(energy * 6)) !== band) continue;
          if ((a.warm && b.warm ? 1 : 0) !== color) continue;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); used = true;
        }
        if (!used) continue;
        ctx.lineWidth = .55 + band * .14;
        ctx.strokeStyle = color ? `rgba(231,255,99,${.14 + band * .11})` : `rgba(104,244,232,${.12 + band * .105})`;
        ctx.stroke();
      }
    }
    for (let i = 0; i < count; i++) {
      const p = projected[i], front = p.z > 0;
      ctx.fillStyle = front ? 'rgba(202,228,219,.2)' : 'rgba(162,191,184,.06)';
      ctx.beginPath(); ctx.arc(p.x, p.y, front ? .68 : .45, 0, Math.PI * 2); ctx.fill();
      if (p.glow < .035) continue;
      const color = p.warm ? 2 : i % 7 === 0 ? 1 : 0;
      const brush = sprites[color];
      if (brush) {
        const size = (9 + p.glow * 34) * Math.min(1.3, r / 210);
        ctx.globalAlpha = Math.min(1, p.glow * 1.3);
        ctx.drawImage(brush, p.x - size / 2, p.y - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    // Subtle Fresnel highlights keep the silhouette legible as the light moves.
    const rim = ctx.createLinearGradient(g.x - r, g.y - r, g.x + r, g.y + r);
    rim.addColorStop(0, 'rgba(158,244,223,.55)'); rim.addColorStop(.26, 'rgba(151,203,189,.08)');
    rim.addColorStop(.56, 'rgba(136,191,179,.13)'); rim.addColorStop(.8, 'rgba(218,230,156,.33)'); rim.addColorStop(1, 'rgba(180,215,199,.08)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(205,233,221,.055)'; ctx.lineWidth = .65;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r * .985, r * .19, -.28, 0, Math.PI * 2); ctx.stroke();
    bench.dataset.lightX = lx.toFixed(3); bench.dataset.lightY = ly.toFixed(3);
    bench.dataset.lightStrength = strength.toFixed(3);
  }
  function tick(timestamp) {
    frame = 0; if (!visible || document.hidden || !moving()) return;
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .04) : 1 / 60;
    lastTime = timestamp; time += delta;
    const follow = 1 - Math.exp(-delta * 11);
    light.x += (target.x - light.x) * follow; light.y += (target.y - light.y) * follow;
    strength += ((active ? 1 : .27) - strength) * (1 - Math.exp(-delta * (active ? 9 : 1.5)));
    pulse = Math.max(0, pulse - delta * .6);
    draw(delta); animate();
  }
  function syncMotion() {
    const enabled = moving();
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.replaceChildren(document.createTextNode(enabled ? 'Pause motion ' : 'Motion paused '));
    toggle.disabled = preference.matches;
    if (preference.matches) toggle.setAttribute('aria-label', 'Animation paused to respect your reduced motion setting');
    else toggle.removeAttribute('aria-label');
    bench.dataset.motion = enabled ? 'playing' : 'paused';
    if (enabled) { lastTime = 0; animate(); }
    else { cancelAnimationFrame(frame); frame = 0; pulse = 0; bounce?.cancel(); bench.style.setProperty('--scroll', '0'); draw(1); }
  }
  function pointAt(event) {
    const rect = canvas.getBoundingClientRect(), g = geometry();
    // Account for the small scroll transform so the illuminated patch stays under the cursor.
    target.x = ((event.clientX - rect.left) * width / rect.width - g.x) / g.radius;
    target.y = ((event.clientY - rect.top) * height / rect.height - g.y) / g.radius;
    const length = Math.hypot(target.x, target.y);
    if (length > .98) { target.x *= .98 / length; target.y *= .98 / length; }
    active = true;
    if (!moving()) { light.x = target.x; light.y = target.y; strength = 1; draw(1); }
    else animate();
  }
  function discover() {
    index = (index + 1) % ideas.length;
    const idea = ideas[index]; document.getElementById('idea-question').textContent = idea.question;
    const link = document.getElementById('idea-link'); link.href = idea.url;
    link.replaceChildren(document.createTextNode(idea.label));
    document.getElementById('idea-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(ideas.length).padStart(2, '0')}`;
    touch.setAttribute('aria-label', `${idea.question} Click or press Enter for another project question.`);
    if (moving()) {
      pulse = 1; strength = 1;
      bounce?.cancel();
      // Animate only the drawing; the pointer target stays stable while the ball springs back.
      bounce = canvas.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(5px) scale(1.025,.96)', offset: .15 },
        { transform: 'translateY(-18px) scale(.985,1.025)', offset: .43 },
        { transform: 'translateY(3px) scale(1.008,.992)', offset: .73 },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 650, easing: 'cubic-bezier(.22,.7,.3,1)' });
      animate();
    } else draw(1);
  }
  touch.addEventListener('pointermove', pointAt, { passive: true });
  touch.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; pointAt(event); });
  touch.addEventListener('pointerleave', () => { active = false; if (!moving()) { strength = .27; draw(1); } });
  touch.addEventListener('pointercancel', () => { active = false; down = null; });
  touch.addEventListener('pointerup', event => { if (event.pointerType === 'touch') active = false; });
  touch.addEventListener('click', event => {
    if (event.detail !== 0 && down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 20) return;
    discover();
  });
  toggle.addEventListener('click', () => { paused = !paused; syncMotion(); });
  preference.addEventListener('change', () => { paused = preference.matches; syncMotion(); });
  window.addEventListener('scroll', () => {
    if (!moving()) return;
    const hero = bench.closest('.studio-hero').getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -hero.top / (hero.height * .65)));
    bench.style.setProperty('--scroll', progress.toFixed(3));
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { lastTime = 0; animate(); }
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { lastTime = 0; animate(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  }, { threshold: 0 }).observe(bench);
  new ResizeObserver(resize).observe(canvas);
  resize(); syncMotion();
})();
