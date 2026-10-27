// M&L komaxit – první návrh

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

// Úvod a postup: kolo projde celou dílnou. Snímky AI videa se kreslí na canvas podle
// scrollu a k tomu vyjíždějí popisky kroků. Pohyb řídí jen scroll návštěvníka; při
// omezení animací popisky jen prolínají a fotka se nepřibližuje.
const story = document.querySelector('.story');
const stage = story.querySelector('.story-stage');
const media = story.querySelector('.story-media');
const canvas = story.querySelector('.story-canvas');
const ctx = canvas.getContext('2d');
const heroCopy = document.querySelector('.hero-copy');
const header = document.querySelector('.site-header');
const storyHead = [story.querySelector('.story-title'), story.querySelector('.story-bars')];
const steps = [...story.querySelectorAll('.story-step')];
const bars = [...story.querySelectorAll('.story-bars b')];
const wide = window.matchMedia('(min-width: 861px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const count = Number(media.dataset.frames);
const frames = new Array(count);

// snímek na začátku každého kroku a na konci posledního; když nesedí počet kroků, video
// se rozloží rovnoměrně
let keys = media.dataset.keys.split(',').map(Number);
if (keys.length !== steps.length + 1) {
  keys = steps.map((_, i) => Math.round((i / steps.length) * (count - 1))).concat(count - 1);
}

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

let W = 0;
let H = 0;
let dpr = 1;
let intro = 0;
let stepLen = 1;
let y = null;
let running = false;
let last = 0;
let drawn = '';

const measure = () => {
  W = stage.clientWidth;
  H = stage.clientHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(media.clientWidth * dpr);
  canvas.height = Math.round(media.clientHeight * dpr);
  const css = getComputedStyle(story);
  intro = parseFloat(css.getPropertyValue('--intro')) * H;
  stepLen = parseFloat(css.getPropertyValue('--step')) * H;
  drawn = '';
};

// nejbližší snímek, který už je stažený
const nearest = (i) => {
  for (let d = 0; d < count; d++) {
    if (frames[i - d]) return i - d;
    if (frames[i + d]) return i + d;
  }
  return -1;
};

// video běží uprostřed kroku, na krajích se drží, než se vymění popisek
const frameAt = (s) => {
  const i = clamp(Math.floor(s), 0, steps.length - 1);
  return lerp(keys[i], keys[i + 1], easeInOut(clamp((s - i - 0.15) / 0.7)));
};

const draw = (s, left) => {
  const f = frameAt(s);
  const i = nearest(Math.floor(f));
  if (i < 0) return;
  // mezi sousedními snímky se prolíná, aby scroll běžel plynule
  const j = i === Math.floor(f) && frames[i + 1] ? i + 1 : -1;
  const t = j < 0 ? 0 : Math.round((f - i) * 16) / 16;
  const zoom = calm.matches ? 1 : 1 + 0.04 * clamp(s / steps.length);
  const key = `${i}:${t}:${Math.round(left)}:${zoom.toFixed(3)}`;
  if (key === drawn) return;
  drawn = key;

  // fotka vyplní výřez od levého okraje fotky doprava (jako object-fit: cover)
  const x0 = left * dpr;
  const size = Math.max(canvas.height, canvas.width - x0) * zoom;
  const x = x0 + (canvas.width - x0 - size) / 2;
  const top = (canvas.height - size) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(frames[i], x, top, size, size);
  if (t > 0) {
    ctx.globalAlpha = t;
    ctx.drawImage(frames[j], x, top, size, size);
  }
};

const render = (pos) => {
  const s = (pos - intro) / stepLen;
  let left = 0;

  if (wide.matches) {
    // úvodní text odjede nahoru sám, tady jen zhasne a fotka se rozšíří doleva
    const open = easeInOut(clamp(pos / intro));
    left = lerp(W * 0.54, clamp(W - H, W * 0.4, W * 0.5), open);
    const slant = H * 0.2126;
    media.style.clipPath = `polygon(${left + slant}px 0, 100% 0, 100% 100%, ${left}px 100%)`;
    heroCopy.style.opacity = 1 - clamp(pos / (intro * 0.8));
    const headIn = String(clamp((pos - intro * 0.6) / (intro * 0.4)));
    storyHead.forEach((el) => { el.style.opacity = headIn; });
  } else {
    media.style.clipPath = '';
    heroCopy.style.opacity = '';
    storyHead.forEach((el) => { el.style.opacity = ''; });
  }

  // popisek vyjede zespodu, chvíli zůstane a odjede nahoru; další přijede, až když
  // předchozí zmizí, aby se nadpisy nepřekrývaly
  steps.forEach((el, i) => {
    const t = s - i;
    const alwaysIn = i === 0 && !wide.matches;
    const stays = i === steps.length - 1;
    // první popisek přijede už ve chvíli, kdy úvodní text odjíždí
    const from = i === 0 ? -0.3 : 0;
    let o = 1;
    let shift = 0;
    if (!alwaysIn && t < from + 0.2) {
      const k = easeOut(clamp((t - from) / 0.2));
      o = k;
      shift = (1 - k) * 48;
    }
    if (!stays && t > 0.8) {
      const k = easeOut(clamp((t - 0.8) / 0.2));
      o = 1 - k;
      shift = -k * 48;
    }
    el.style.opacity = String(o);
    el.style.transform = calm.matches || !shift ? '' : `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    bars[i].style.transform = `scaleX(${clamp(t).toFixed(3)})`;
  });

  draw(s, left);
};

// vyhlazení, aby kolečko myši neposouvalo video po skocích
const tick = (now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const target = header.offsetHeight - story.getBoundingClientRect().top;
  y = y === null ? target : y + (target - y) * (1 - Math.exp(-dt * 12));
  if (Math.abs(target - y) < 0.5) y = target;
  render(y);
  if (y !== target) requestAnimationFrame(tick);
  else running = false;
};

const kick = () => {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(tick);
};

new ResizeObserver(() => {
  measure();
  kick();
}).observe(stage);

window.addEventListener('scroll', kick, { passive: true });
calm.addEventListener('change', () => { drawn = ''; kick(); });

// snímky se stahují až po načtení stránky: nejdřív začátky kroků a konec, pak po osmi
// a postupně se doplňují
const order = [...new Set([...keys, count - 1])];
for (let step = 8; step >= 1; step /= 2) {
  for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
}
const loadNext = async () => {
  while (order.length) {
    const i = order.shift();
    const img = new Image();
    img.src = `/img/proces/f${String(i).padStart(3, '0')}.webp`;
    try {
      await img.decode();
      frames[i] = img;
      drawn = '';
      kick();
    } catch {
      // chybějící snímek nahradí nejbližší stažený
    }
  }
};
const startLoading = () => {
  for (let k = 0; k < 4; k++) loadNext();
};
if (document.readyState === 'complete') startLoading();
else window.addEventListener('load', startLoading);

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
