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

const setPos = (value) => {
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
  setPos(from);
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
