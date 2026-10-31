// M&L komaxit – první návrh

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const wide = window.matchMedia('(min-width: 861px)');

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// Úvodní text při načtení vyjede (CSS čeká na is-loaded)
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.classList.add('is-loaded');
}));

// Lišta: po odjetí z úvodu ztmavne; na úvodu ještě nepodtrhává žádnou sekci
const header = document.querySelector('.site-header');
const markScrolled = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 24);
  header.classList.toggle('is-top', window.scrollY < window.innerHeight * 0.4);
};
markScrolled();
window.addEventListener('scroll', markScrolled, { passive: true });

// Mobilní menu přes celou obrazovku
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('menu');

const setMenu = (open) => {
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  document.documentElement.classList.toggle('menu-open', open);
};
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});
wide.addEventListener('change', () => setMenu(false));

// V menu zůstane podtržená sekce, kterou právě čtete
const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
const sectionOf = (link) => {
  const target = document.querySelector(link.getAttribute('href'));
  return target && (target.closest('section') || target);
};
const linkBySection = new Map(navLinks.map((link) => [sectionOf(link), link]));
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const link = linkBySection.get(entry.target);
    if (link) link.toggleAttribute('aria-current', entry.isIntersecting);
    if (link && entry.isIntersecting) link.setAttribute('aria-current', 'true');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
linkBySection.forEach((_, section) => section && spy.observe(section));

// Úvod a postup: kolo projde celou dílnou. Snímky AI videa se kreslí na canvas podle
// scrollu; popisek kroku na jeho začátku rychle přiletí zespodu a pak stojí, dokud
// nepřijde další.
const story = document.querySelector('.story');
const stage = story.querySelector('.story-stage');
const media = story.querySelector('.story-media');
const canvas = story.querySelector('.story-canvas');
const ctx = canvas.getContext('2d');
const spillCanvas = story.querySelector('.story-spill');
const spillCtx = spillCanvas.getContext('2d');
const heroCopy = document.querySelector('.hero-copy');
const storyText = story.querySelector('.story-text');
const storyHead = [story.querySelector('.story-title'), story.querySelector('.story-bars'), story.querySelector('.story-ai')];
const steps = [...story.querySelectorAll('.story-step')];
const bars = [...story.querySelectorAll('.story-bars b')];
// na mobilu se stahuje lehčí sada: poloviční počet snímků v menším rozlišení
const lite = !wide.matches;
const frameDir = lite ? '/img/proces/m' : '/img/proces';
const count = Number(lite ? media.dataset.framesM : media.dataset.frames);
const frames = new Array(count);

// snímek na začátku každého kroku a na konci posledního; když nesedí počet kroků, video
// se rozloží rovnoměrně
let keys = (lite ? media.dataset.keysM : media.dataset.keys).split(',').map(Number);
if (keys.length !== steps.length + 1) {
  keys = steps.map((_, i) => Math.round((i / steps.length) * (count - 1))).concat(count - 1);
}

let W = 0;
let H = 0;
let dpr = 1;
let intro = 0;
let stepLen = 1;
let textRight = 0;
let y = null;
let running = false;
let last = 0;
let drawn = '';
let active = null;

const measure = () => {
  W = stage.clientWidth;
  H = stage.clientHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(media.clientWidth * dpr);
  canvas.height = Math.round(media.clientHeight * dpr);
  spillCanvas.width = Math.ceil(media.clientWidth * SPILL);
  spillCanvas.height = Math.ceil(media.clientHeight * SPILL);
  const css = getComputedStyle(story);
  intro = parseFloat(css.getPropertyValue('--intro')) * H;
  stepLen = parseFloat(css.getPropertyValue('--step')) * H;
  textRight = storyText.offsetLeft + storyText.offsetWidth;
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

// video běží v jednom kuse, každý krok má svůj úsek
const frameAt = (s) => {
  const i = clamp(Math.floor(s), 0, steps.length - 1);
  return lerp(keys[i], keys[i + 1], clamp(s - i));
};

// rozostřená vrstva má osminové rozlišení scény
const SPILL = 1 / 8;

// spill = jak moc scéna vlevo od šikmého řezu pokračuje rozostřeně do tmy (0 = čistá černá)
const draw = (s, left, spill) => {
  const f = frameAt(s);
  const i = nearest(Math.floor(f));
  if (i < 0) return;
  // mezi sousedními snímky se prolíná, aby scroll běžel plynule
  const j = i === Math.floor(f) && frames[i + 1] ? i + 1 : -1;
  const t = j < 0 ? 0 : Math.round((f - i) * 32) / 32;
  const zoom = calm.matches ? 1 : 1 + 0.04 * clamp(s / steps.length);
  const key = `${i}:${t}:${Math.round(left)}:${zoom.toFixed(3)}:${spill.toFixed(2)}`;
  if (key === drawn) return;
  drawn = key;

  // fotka vyplní výřez od levého okraje fotky doprava (jako object-fit: cover)
  const cw = canvas.width;
  const ch = canvas.height;
  const x0 = left * dpr;
  const slant = wide.matches ? ch * 0.2126 : 0;
  const size = Math.max(ch, cw - x0) * zoom;
  const x = x0 + (cw - x0 - size) / 2;
  const top = (ch - size) / 2;
  const paint = (target, px, py, ps) => {
    target.globalAlpha = 1;
    target.drawImage(frames[i], px, py, ps, ps);
    if (t > 0) {
      target.globalAlpha = t;
      target.drawImage(frames[j], px, py, ps, ps);
    }
  };
  ctx.clearRect(0, 0, cw, ch);

  spillCanvas.style.opacity = spill.toFixed(2);
  if (spill > 0) {
    // stejný záběr, jen rozostřený a větší, aby se rozlil doleva až za text do černé;
    // za textem čistá černá, u řezu prosvítá zhruba polovina
    const k = SPILL / dpr;
    const sw = spillCanvas.width;
    const sh = spillCanvas.height;
    const big = size * 2.4 * k;
    spillCtx.clearRect(0, 0, sw, sh);
    spillCtx.filter = 'blur(4px)';
    spillCtx.globalAlpha = 1;
    spillCtx.drawImage(frames[i], (x + size / 2) * k - big / 2, (top + size / 2) * k - big / 2, big, big);
    if (t > 0) {
      spillCtx.globalAlpha = t;
      spillCtx.drawImage(frames[j], (x + size / 2) * k - big / 2, (top + size / 2) * k - big / 2, big, big);
    }
    spillCtx.filter = 'none';
    const fade = spillCtx.createLinearGradient((x0 - cw * 0.3) * k, 0, (x0 + slant) * k, 0);
    fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    spillCtx.globalAlpha = 1;
    spillCtx.fillStyle = fade;
    spillCtx.fillRect(0, 0, sw, sh);
  }

  // ostrá fotka jen za šikmým řezem
  ctx.save();
  if (slant) {
    ctx.beginPath();
    ctx.moveTo(x0 + slant, 0);
    ctx.lineTo(cw, 0);
    ctx.lineTo(cw, ch);
    ctx.lineTo(x0, ch);
    ctx.closePath();
    ctx.clip();
  }
  paint(ctx, x, top, size);
  ctx.restore();

  if (spill > 0) {
    // řez jako hrana skla: tenká tyrkysová linka z loga mezi ostrou a rozostřenou částí
    ctx.globalAlpha = spill;
    ctx.strokeStyle = 'rgba(34, 184, 216, 0.6)';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(x0 + slant, 0);
    ctx.lineTo(x0, ch);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

// popisek kroku: aktivní stojí, předchozí odletěly nahoru, další čekají dole (CSS přechody)
const setActive = (a) => {
  if (a === active) return;
  const first = active === null;
  if (first) story.classList.add('no-anim');
  active = a;
  steps.forEach((el, i) => {
    el.classList.toggle('is-active', i === a);
    el.classList.toggle('is-next', i > a);
  });
  if (first) requestAnimationFrame(() => requestAnimationFrame(() => story.classList.remove('no-anim')));
};

const render = (pos) => {
  const s = (pos - intro) / stepLen;
  let left = 0;
  let spill = 0;

  if (wide.matches) {
    // úvodní text odjede nahoru sám, tady jen zhasne, fotka se rozšíří doleva
    // a scéna se začne rozlévat do tmy za textem (v úvodu zůstává vlevo čistá černá)
    const open = easeInOut(clamp(pos / intro));
    // v příběhu řez vede šikmo kousek za pravým okrajem textu
    left = lerp(W * 0.54, clamp(textRight + 28, W * 0.36, W * 0.52), open);
    spill = open;
    heroCopy.style.opacity = 1 - clamp(pos / (intro * 0.8));
    const headIn = String(clamp((pos - intro * 0.6) / (intro * 0.4)));
    storyHead.forEach((el) => { el.style.opacity = headIn; });
  } else {
    heroCopy.style.opacity = '';
    storyHead.forEach((el) => { el.style.opacity = ''; });
  }

  // na desktopu první popisek přiletí, až úvodní text skoro zmizí; na mobilu je hned
  setActive(wide.matches && s < -0.2 ? -1 : clamp(Math.floor(s), 0, steps.length - 1));
  bars.forEach((bar, i) => { bar.style.transform = `scaleX(${clamp(s - i).toFixed(3)})`; });

  draw(s, left, spill);
};

// vyhlazení, aby kolečko myši neposouvalo video po skocích
const tick = (now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const target = -story.getBoundingClientRect().top;
  y = y === null ? target : y + (target - y) * (1 - Math.exp(-dt * 10));
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
    img.src = `${frameDir}/f${String(i).padStart(3, '0')}.webp`;
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

// Reakce na kurzor (jen myš, při omezení animací nic neuhýbá)
if (finePointer.matches) {
  // tlačítka se lehce přitáhnou ke kurzoru a při stisku se zmáčknou
  document.querySelectorAll('.btn').forEach((btn) => {
    let mx = 0;
    let my = 0;
    let press = 1;
    const apply = () => {
      btn.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0) scale(${press})`;
    };
    btn.addEventListener('pointermove', (e) => {
      if (calm.matches) return;
      const r = btn.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 10;
      my = ((e.clientY - r.top) / r.height - 0.5) * 8;
      apply();
    });
    btn.addEventListener('pointerdown', () => { press = 0.97; apply(); });
    btn.addEventListener('pointerup', () => { press = 1; apply(); });
    btn.addEventListener('pointerleave', () => {
      mx = 0;
      my = 0;
      press = 1;
      btn.style.transform = '';
    });
  });

  // kovový přechod v hlavním nadpisu se leskne podle výšky kurzoru
  const heroTitle = document.querySelector('.hero h1');
  document.querySelector('.hero').addEventListener('pointermove', (e) => {
    if (calm.matches) return;
    heroTitle.style.backgroundPosition = `50% ${(30 + (e.clientY / window.innerHeight) * 40).toFixed(1)}%`;
  });

}

// Obsah při scrollu jemně vyjede zespodu; co se objeví naráz, jede postupně po sobě
const reveal = new IntersectionObserver((entries) => {
  let n = 0;
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.style.setProperty('--d', `${n++ * 70}ms`);
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

// Mapa: Mapy Google (a jejich cookies) se načtou až po kliknutí na náhled
document.querySelectorAll('.map-load').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = link.dataset.embed;
    frame.title = link.dataset.title;
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    link.replaceWith(frame);
  });
});

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

const shots = [...document.querySelectorAll('.g-open')];
let current = 0;

const showShot = (i) => {
  current = (i + shots.length) % shots.length;
  const btn = shots[current];
  const img = btn.querySelector('img');
  const caption = btn.closest('figure').querySelector('figcaption');
  lbImg.src = largestSrc(btn, img);
  lbImg.alt = img.alt;
  lbCaption.innerHTML = caption ? caption.innerHTML : '';
};

shots.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    showShot(i);
    lightbox.showModal();
  });
});

lightbox.querySelectorAll('.lightbox-nav').forEach((nav) => { nav.hidden = shots.length < 2; });
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showShot(current - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showShot(current + 1));
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') showShot(current - 1);
  if (e.key === 'ArrowRight') showShot(current + 1);
});
lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.close();
});

// Fotky v poptávce: Netlify Forms bere jeden soubor na pole, takže pole jsou tři.
// Další se ukáže, až je předchozí vyplněné; víc než 8 MB Netlify odmítne, proto to hlídáme předem.
const form = document.querySelector('.form');
const photoInputs = [...form.querySelectorAll('input[type="file"]')];
const photoNote = form.querySelector('#f-files-note');
const photoNoteText = photoNote.textContent;
const MAX_UPLOAD = 7.9e6;

const syncPhotos = () => {
  photoInputs.forEach((input, i) => {
    if (i > 0) input.hidden = !photoInputs[i - 1].files.length && !input.files.length;
  });
};
photoInputs.forEach((input) => input.addEventListener('change', () => {
  syncPhotos();
  photoNote.textContent = photoNoteText;
  photoNote.classList.remove('is-error');
}));
syncPhotos();

// Poptávka se odešle na pozadí (Netlify Forms přijme FormData i s fotkami, bez hlavičky Content-Type)
// a místo formuláře se ukáže poděkování. Bez JavaScriptu formulář přesměruje na /dekujeme/.
const formDone = document.querySelector('.form-done');
const formError = form.querySelector('.form-error');
const submit = form.querySelector('[type="submit"]');
const submitLabel = submit.querySelector('span');
const submitText = submitLabel.textContent;

const resetSubmit = () => {
  submit.disabled = false;
  submitLabel.textContent = submitText;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const total = photoInputs.reduce((sum, input) => sum + (input.files[0]?.size || 0), 0);
  if (total > MAX_UPLOAD) {
    const mb = (total / 1e6).toFixed(1).replace('.', ',');
    photoNote.textContent = `Fotky mají dohromady ${mb} MB, vejde se 8 MB. Přiložte menší, nebo je pošlete e-mailem.`;
    photoNote.classList.add('is-error');
    photoInputs[0].focus();
    return;
  }
  // tlačítko se zamkne, aby se poptávka neodeslala dvakrát
  submit.disabled = true;
  submitLabel.textContent = 'Odesílám…';
  formError.hidden = true;
  try {
    const res = await fetch('/', { method: 'POST', body: new FormData(form) });
    if (!res.ok) throw new Error(res.status);
    form.hidden = true;
    formDone.hidden = false;
    formDone.focus();
  } catch {
    formError.hidden = false;
    resetSubmit();
  }
});

formDone.querySelector('.form-again').addEventListener('click', () => {
  form.reset();
  syncPhotos();
  photoNote.textContent = photoNoteText;
  photoNote.classList.remove('is-error');
  resetSubmit();
  formDone.hidden = true;
  form.hidden = false;
  form.querySelector('#f-name').focus();
});
