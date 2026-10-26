import * as THREE from './vendor/three.module.min.js';

history.scrollRestoration = 'manual';
scrollTo(0, 0);
addEventListener('pagehide', () => scrollTo(0, 0));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const navEl = $('#nav');
const setNavH = () => document.documentElement.style.setProperty('--nav-h', navEl.offsetHeight + 'px');
new ResizeObserver(setNavH).observe(navEl);
setNavH();
document.getElementById('yr').textContent = new Date().getFullYear();

/* ---------- 3D hero: neural network, mouse / gyroscope / scroll reactive ---------- */
const canvas = $('#scene');
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.z = 6;
const coarse = matchMedia('(pointer: coarse)').matches;
const BASE_OPACITY = 0.4;

function initScene() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  const scene = new THREE.Scene();
  const phone = innerWidth <= 900;

  const TEAL = 0x38cdd6;
  const disc = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.beginPath(); g.arc(32, 32, 30, 0, 6.283); g.fillStyle = '#fff'; g.fill();
    return new THREE.CanvasTexture(c);
  })();
  /* nodes in a loose sphere, edges between neighbours, pulses travelling along edges */
  const group = new THREE.Group();
  scene.add(group);
  const NODES = 90, R = 2.2;
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    const r = R * Math.cbrt(Math.random()), a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    nodes.push(new THREE.Vector3(r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a), r * Math.cos(b)));
  }
  const edges = [];
  nodes.forEach((p, i) => {
    nodes
      .map((q, j) => [j, p.distanceTo(q)])
      .filter(([j, d]) => j > i && d < 1.15)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 3)
      .forEach(([j]) => edges.push([i, j]));
  });
  const out = nodes.map(() => []);
  edges.forEach(([i], k) => out[i].push(k));
  const tmp = new THREE.Vector3();
  const lp = new Float32Array(edges.length * 6);
  edges.forEach(([i, j], k) => lp.set([...nodes[i].toArray(), ...nodes[j].toArray()], k * 6));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  /* 1px lines vanish on a phone screen, so phones get brighter lines and bigger nodes */
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: phone ? 0.9 : 0.5 }));
  const np = new Float32Array(NODES * 3);
  nodes.forEach((p, i) => p.toArray(np, i * 3));
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
  const dots = new THREE.Points(ng, new THREE.PointsMaterial({ color: 0xffffff, size: phone ? 0.14 : 0.09, map: disc, alphaTest: 0.5, transparent: true, opacity: 0.95 }));
  const PULSES = 28;
  const pulses = Array.from({ length: PULSES }, () => ({ e: Math.floor(Math.random() * edges.length), t: Math.random(), s: 0.4 + Math.random() * 0.6 }));
  const pp = new Float32Array(PULSES * 3);
  const pg2 = new THREE.BufferGeometry();
  pg2.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pulsePts = new THREE.Points(pg2, new THREE.PointsMaterial({ color: TEAL, size: phone ? 0.3 : 0.2, map: disc, alphaTest: 0.1, transparent: true, opacity: 1, depthWrite: false }));
  group.add(lines, dots, pulsePts);

  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 4 + Math.random() * 8, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a), r * Math.cos(b)], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: TEAL, size: 0.04, map: disc, alphaTest: 0.5, transparent: true, opacity: 0.7 }));
  scene.add(points);

  const mouse = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tgt.x = (e.clientX / innerWidth) * 2 - 1;
    tgt.y = (e.clientY / innerHeight) * 2 - 1;
  });

  /* gyroscope: tilt is measured from wherever the phone is first held, and the
     reference drifts slowly so a new resting angle becomes the new centre */
  let base = null, gyro = false;
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  function onTilt(e) {
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { g: e.gamma, b: e.beta };
    base.g += (e.gamma - base.g) * 0.002;
    base.b += (e.beta - base.b) * 0.002;   // slow re-centre so a held tilt keeps working while you scroll
    tgt.x = clamp((e.gamma - base.g) / 22);
    tgt.y = clamp((e.beta - base.b) / 22);
    gyro = true;
  }
  if (coarse && 'DeviceOrientationEvent' in window) {
    addEventListener('deviceorientation', onTilt);   // Android: events flow straight away
    // iOS sends nothing until a tap grants permission, so offer a button if no data arrives
    setTimeout(() => {
      if (gyro || typeof DeviceOrientationEvent.requestPermission !== 'function') return;
      const btn = document.createElement('button');
      btn.className = 'tilt-btn'; btn.type = 'button'; btn.textContent = 'Enable tilt';
      btn.addEventListener('click', () =>
        DeviceOrientationEvent.requestPermission()
          .then((s) => { btn.textContent = s === 'granted' ? 'Tilt on' : 'Tilt blocked'; setTimeout(() => btn.remove(), 1200); })
          .catch(() => { btn.textContent = 'Tilt unavailable'; setTimeout(() => btn.remove(), 1500); })
      );
      document.body.appendChild(btn);
    }, 1500);
  }

  let lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    group.position.x = innerWidth > 900 ? 1.9 : 0;
    if (w === lastW && h === lastH) return;   // toolbar show/hide must not rebuild the GL buffer
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const lineO = lines.material.opacity, dotO = dots.material.opacity;
  let lastS = -1, smooth = 0;
  canvas.style.opacity = BASE_OPACITY;
  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    mouse.x += (tgt.x - mouse.x) * 0.06;
    mouse.y += (tgt.y - mouse.y) * 0.06;
    const k = reduce ? 0 : 1;
    const gain = gyro ? 0.84 : 0.8;   // tilt strength: 30% below the previous 1.2
    smooth += (Math.max(0, window.scrollY) - smooth) * 0.08;   // clamp rubber-band, smooth stepped readings
    group.rotation.y = t * 0.12 * k + mouse.x * gain + smooth * 0.0012;
    group.rotation.x = mouse.y * gain * 0.7 + Math.sin(t * 0.2) * 0.1 * k;
    pulses.forEach((p, i) => {
      p.t += (reduce ? 0 : 1) * p.s * 0.016;
      if (p.t >= 1) {
        p.t = 0;
        // continue from the end node along a connected edge, else jump
        const next = out[edges[p.e][1]];
        p.e = next.length ? next[Math.floor(Math.random() * next.length)] : Math.floor(Math.random() * edges.length);
      }
      const [a, b] = edges[p.e];
      tmp.copy(nodes[a]).lerp(nodes[b], p.t).toArray(pp, i * 3);
    });
    pg2.attributes.position.needsUpdate = true;
    points.rotation.y = t * 0.02 * k + smooth * 0.0004;
    const s = 1 - 0.75 * Math.min(smooth / (innerHeight * 3), 1);
    if (Math.abs(s - lastS) > 0.002) {
      lastS = s;
      lines.material.opacity = lineO * s;
      dots.material.opacity = dotO * s;
      pulsePts.material.opacity = s;
      points.material.opacity = 0.7 * s;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
try {
  initScene();
} catch (err) {
  // no WebGL: the page still works without the background
  console.warn('3D background disabled:', err);
  canvas.style.display = 'none';
}

/* ---------- smooth scroll + ScrollTrigger ---------- */
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reduce, syncTouch: !reduce, syncTouchLerp: 0.05, touchInertiaMultiplier: 35 });   // touch scrolling and its glide run in JS, so iOS never enters its native momentum state that silences motion sensors
lenis.on('scroll', (e) => { ScrollTrigger.update(); $('#nav').classList.toggle('scrolled', e.scroll > 40); });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -navEl.offsetHeight });
  })
);

function intro() {
  if (reduce) return;
  gsap.from('.hero-title .line span', { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'power4.out' });
  gsap.from('.eyebrow,.hero-role,.hero-sub,.hero-buttons,.hero .social-icons,.scroll-hint', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08, delay: 0.5, ease: 'power3.out' });
  gsap.from(camera.position, { z: 12, duration: 2, ease: 'power3.out' });
}

if (!reduce) {
  gsap.utils.toArray('.reveal').forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  );
}

intro();

/* the marquee only animates while it is on screen */
const marquee = $('.marquee');
new IntersectionObserver(([e]) => marquee.classList.toggle('paused', !e.isIntersecting)).observe(marquee);

/* ---------- cursor + magnetic buttons ---------- */
if (matchMedia('(hover:hover)').matches && !reduce) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.3);
      my((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
  });
}
