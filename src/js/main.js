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

// Úvod: kolo se při scrollu nastříká – snímky videa se kreslí na canvas.
// Pohyb řídí jen scroll návštěvníka, proto běží i při omezení animací.
const pin = document.querySelector('.hero-pin');
const coat = document.querySelector('.coat');
const canvas = coat.querySelector('.coat-canvas');
const ctx = canvas.getContext('2d');
const tagBefore = coat.querySelector('.coat-tag-before');
const tagAfter = coat.querySelector('.coat-tag-after');
const header = document.querySelector('.site-header');
const pinned = window.matchMedia('(min-width: 861px)');
const count = Number(coat.dataset.frames);
const frames = new Array(count);
let shown = '';
let queued = false;

pin.classList.add('is-scrub');

const progress = () => {
  if (pinned.matches) {
    const range = pin.offsetHeight - coat.parentElement.offsetHeight;
    return (header.offsetHeight - pin.getBoundingClientRect().top) / range;
  }
  // na mobilu bez zastavení: od chvíle, kdy fotka vyjede zespodu, do horní třetiny
  const rect = coat.getBoundingClientRect();
  const vh = window.innerHeight;
  return (vh * 0.9 - (rect.top + rect.height / 2)) / (vh * 0.55);
};

// nejbližší snímek, který už je stažený
const nearest = (i) => {
  for (let d = 0; d < count; d++) {
    if (frames[i - d]) return i - d;
    if (frames[i + d]) return i + d;
  }
  return -1;
};

// jako object-fit: cover
const paint = (img, alpha) => {
  const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
};

const draw = () => {
  queued = false;
  const p = Math.min(1, Math.max(0, progress()));
  tagBefore.style.opacity = Math.max(0, 1 - p * 4);
  tagAfter.style.opacity = Math.max(0, p * 4 - 3);

  // mezi sousedními snímky se prolíná, aby scroll běžel plynule
  const f = p * (count - 1);
  const i = nearest(Math.floor(f));
  if (i < 0) return;
  const next = i === Math.floor(f) && frames[i + 1] ? i + 1 : -1;
  const t = next < 0 ? 0 : Math.round((f - i) * 20) / 20;
  const key = `${i}:${t}`;
  if (key === shown) return;
  shown = key;
  paint(frames[i], 1);
  if (t > 0) paint(frames[next], t);
};

const request = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(draw);
};

new ResizeObserver(() => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(coat.clientWidth * dpr);
  canvas.height = Math.round(coat.clientHeight * dpr);
  shown = '';
  request();
}).observe(coat);

window.addEventListener('scroll', request, { passive: true });
pinned.addEventListener('change', request);

// snímky se stahují až po načtení stránky, nejdřív řídce (každý 8.), pak se doplňují
const order = [0, count - 1];
for (let step = 8; step >= 1; step /= 2) {
  for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
}
const loadNext = async () => {
  while (order.length) {
    const i = order.shift();
    const img = new Image();
    img.src = `/img/nastrik/f${String(i).padStart(3, '0')}.webp`;
    try {
      await img.decode();
      frames[i] = img;
      request();
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
