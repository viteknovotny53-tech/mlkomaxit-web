// M&L komaxit – první návrh

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mobilní menu
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('menu');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('is-open', !open);
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }
});

// Srovnání před / po
const compare = document.querySelector('.compare');
const range = compare.querySelector('.compare-range');
let introRunning = false;
let pos = Number(range.value);

// Prášek ze spreje: při posunu se od dělicí čáry rozstřikují barvy z loga
const SPRAY_COLORS = ['#e8338a', '#e8338a', '#f45ea3', '#22b8d8', '#22b8d8', '#e4e7eb'];

const createSpray = (root) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'compare-spray';
  canvas.setAttribute('aria-hidden', 'true');
  root.querySelector('.compare-tag').before(canvas);
  const ctx = canvas.getContext('2d');

  // měkké tečky předkreslené pro každou barvu
  const sprites = SPRAY_COLORS.map((color) => {
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const c = dot.getContext('2d');
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, color);
    g.addColorStop(0.45, `${color}88`);
    g.addColorStop(1, `${color}00`);
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return dot;
  });

  let w = 0;
  let h = 0;
  let dpr = 1;
  new ResizeObserver(() => {
    w = root.clientWidth;
    h = root.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }).observe(root);

  // stříká se tam, kde je prst nebo myš, jinak u úchytu uprostřed
  let originY = null;
  root.addEventListener('pointermove', (e) => {
    originY = e.clientY - root.getBoundingClientRect().top;
  });
  root.addEventListener('pointerleave', () => { originY = null; });

  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  const particles = [];
  let running = false;
  let last = 0;

  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const drag = Math.exp(-3.2 * dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }
      p.vx *= drag;
      p.vy = p.vy * drag + 25 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.age / p.life;
      const size = p.size * (1 + t * 0.6);
      ctx.globalAlpha = p.alpha * (1 - t) ** 1.5;
      ctx.drawImage(sprites[p.color], p.x - size / 2, p.y - size / 2, size, size);
    }

    if (particles.length) requestAnimationFrame(tick);
    else running = false;
  };

  let lastEmit = 0;

  // to = nová poloha v %, delta = posun v % (záporný doleva)
  return (to, delta) => {
    const dx = (delta / 100) * w;
    if (!dx) return;
    const now = performance.now();
    // prášek si nese rychlost pistole, ať se drží u čáry a nezůstává jen za ní
    const lineV = Math.max(-1500, Math.min(1500, dx / Math.max((now - lastEmit) / 1000, 0.008)));
    lastEmit = now;
    const lineX = (to / 100) * w;
    const cy = originY ?? h / 2;
    const spreadY = Math.min(h * 0.14, 70);
    const push = 0.6 + Math.min(Math.abs(dx) / 12, 1.2);
    const count = 2 + Math.min(64, Math.ceil(Math.abs(dx) * 1.8));

    for (let i = 0; i < count; i++) {
      // většina prášku vylétá od čáry, zbytek vyplní stopu za ní
      const x = Math.random() < 0.6 ? lineX : lineX - Math.random() * dx;
      const angle = (dx < 0 ? Math.PI : 0) + gauss() * 0.8;
      const speed = (60 + Math.random() * 260) * push;
      const haze = Math.random() < 0.2;
      const r = haze ? 8 + Math.random() * 14 : 0.8 + Math.random() ** 2 * 2.4;
      particles.push({
        x: x + gauss() * 6,
        y: cy + gauss() * spreadY,
        vx: Math.cos(angle) * speed + lineV * 0.7,
        vy: Math.sin(angle) * speed,
        size: r * 4,
        alpha: haze ? 0.1 : 0.85,
        color: Math.floor(Math.random() * sprites.length),
        age: 0,
        life: haze ? 1 + Math.random() * 0.6 : 0.5 + Math.random() * 0.6,
      });
    }
    if (particles.length > 900) particles.splice(0, particles.length - 900);

    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
  };
};

const spray = reduceMotion ? null : createSpray(compare);

const setPos = (value, withSpray = true) => {
  if (spray && withSpray) spray(value, value - pos);
  pos = value;
  compare.style.setProperty('--pos', `${value}%`);
  range.value = value;
};

range.addEventListener('input', () => {
  introRunning = false;
  setPos(Number(range.value));
});

// Jednorázový „nástřik“ při načtení: posuvník přejede z „před“ na střed
const runIntro = () => {
  if (reduceMotion) return;
  introRunning = true;
  const from = 100;
  const to = 50;
  const duration = 1400;
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const frame = (now) => {
    if (!introRunning) return;
    const t = Math.min((now - start) / duration, 1);
    setPos(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(frame);
    else introRunning = false;
  };
  setPos(from, false);
  setTimeout(() => requestAnimationFrame(frame), 350);
};

const images = [...compare.querySelectorAll('img')];
Promise.all(images.map((img) => img.complete ? null : img.decode().catch(() => null)))
  .then(runIntro);

// Lightbox pro realizace
const lightbox = document.querySelector('.lightbox');
const lbImg = lightbox.querySelector('img');
const lbCaption = lightbox.querySelector('.lightbox-caption');

// největší varianta fotky z <picture> (build generuje několik šířek)
const largestSrc = (btn, img) => {
  const source = btn.querySelector('source');
  if (!source) return img.currentSrc || img.src;
  return source.srcset.split(',').pop().trim().split(' ')[0];
};

document.querySelectorAll('.g-open').forEach((btn) => {
  btn.addEventListener('click', () => {
    const img = btn.querySelector('img');
    const caption = btn.closest('figure').querySelector('figcaption');
    lbImg.src = largestSrc(btn, img);
    lbImg.alt = img.alt;
    lbCaption.innerHTML = caption ? caption.innerHTML : '';
    lightbox.showModal();
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.close();
});
