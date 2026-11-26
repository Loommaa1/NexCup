// Petits effets visuels réutilisables pour donner du retour à chaque action.
//   FX.pop(el)                 — l'élément « saute »
//   FX.delta(el, '+1', color)  — un texte qui s'envole au-dessus de l'élément
//   FX.sparks(el, n)           — étincelles autour de l'élément
//   FX.confetti(el|null, n)    — explosion de confettis (depuis l'élément ou le centre de l'écran)
//   FX.rain(ms)                — pluie de confettis sur tout l'écran
//   FX.flip(selector, key, change) — les éléments glissent vers leur nouvelle place après un changement (classement)
//   FX.mark(el, cls)           — relance une animation CSS de classe `cls`
//   FX.countUp(root)           — les nombres [data-count] défilent de 0 à leur valeur
//   FX.glyph(name)             — petite icône dessinée (ballon, manette, coupe, éclair…)
// Une onde (« ripple ») part du point de clic sur tous les boutons, des étincelles jaillissent des boutons
// principaux, les cartes s'éclairent sous la souris et des icônes sport / e-sport flottent dans le fond.
const FX = (() => {
  // Palette « festival » : magenta, violet, cyan, or, corail, citron vert, bleu, orange
  const COLORS = ['#E21FA0', '#7B3FF2', '#00B4D8', '#FFB81C', '#FF3D6E', '#6BCB00', '#2F6BFF', '#FF7A1A'];
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Icônes au trait (24 × 24), couleur = currentColor
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const GLYPHS = {
    ball: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.4 4.5H9.6l-1.4-4.5z"/><path d="M12 3v4.5M15.8 10.3l4.6-1.6M14.4 14.8l2.8 3.9M9.6 14.8l-2.8 3.9M8.2 10.3L3.6 8.7"/>'),
    basket: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3.6 3.6 3.6 9.2 0 12.8M18.4 5.6c-3.6 3.6-3.6 9.2 0 12.8"/>'),
    pad: svg('<path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.6 2.6 0 0 1-4.5 1.1L14.7 16H9.3l-1.9 2.1A2.6 2.6 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7z"/><path d="M7.5 10v4M5.5 12h4"/><path d="M15.5 10.5h.01M17.5 12.5h.01" stroke-width="3"/>'),
    trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    bolt: svg('<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>'),
    star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    medal: svg('<circle cx="12" cy="15" r="5"/><path d="M8.5 11.2L6 3h4l2 5 2-5h4l-2.5 8.2"/><path d="M12 13v4"/>'),
    target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5V6M12 18v4.5M1.5 12H6M18 12h4.5"/>'),
    racket: svg('<circle cx="10" cy="10" r="6.5"/><path d="M14.6 14.6L20 20"/><circle cx="19" cy="5" r="1.8"/>'),
    joystick: svg('<rect x="4" y="15" width="16" height="6" rx="2"/><path d="M12 15V9"/><circle cx="12" cy="6" r="3"/><path d="M16.5 18h.01" stroke-width="3"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  };
  const glyph = (name) => GLYPHS[name] || GLYPHS.trophy;

  let layer = null;
  function getLayer() {
    if (!layer || !layer.isConnected) {
      layer = document.createElement('div');
      layer.className = 'fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    // au-dessus des fenêtres ouvertes (elles sont dans la « top layer ») : on se place dans la fenêtre active
    const openDialog = [...document.querySelectorAll('dialog[open]')].pop();
    if (openDialog && layer.parentElement !== openDialog) openDialog.appendChild(layer);
    if (!openDialog && layer.parentElement !== document.body) document.body.appendChild(layer);
    return layer;
  }

  function spawn(cls, x, y, style = '', html = '', life = 1200) {
    const el = document.createElement('span');
    el.className = cls;
    el.style.cssText = `left:${x}px;top:${y}px;${style}`;
    el.innerHTML = html;
    getLayer().appendChild(el);
    setTimeout(() => el.remove(), life);
    return el;
  }

  const center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  };

  function mark(el, cls) {
    if (!el || reduced()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  const pop = (el) => mark(el, 'fx-pop');

  function delta(el, text, color = '#A0228F') {
    if (!el || reduced()) return;
    const { x, r } = center(el);
    spawn('fx-delta', x, r.top, `--c:${color}`, text, 900);
  }

  function sparks(el, n = 10) {
    if (!el || reduced()) return;
    const { x, y } = center(el);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + rnd(-10, 10);
      spawn('fx-spark', x, y, `--a:${a}deg;--d:${rnd(28, 60)}px;--c:${COLORS[i % COLORS.length]}`, '', 700);
    }
  }

  function confetti(el, n = 36) {
    if (reduced()) return;
    const p = el ? center(el) : { x: innerWidth / 2, y: innerHeight / 2 };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + rnd(0, 10);
      spawn('fx-confetti', p.x, p.y, `--a:${a}deg;--dist:${rnd(80, 220)}px;--c:${COLORS[i % COLORS.length]};--r:${rnd(-540, 540)}deg;--w:${rnd(7, 13)}px`, '', 1300);
    }
  }

  function rain(ms = 2400, n = 70) {
    if (reduced()) return;
    for (let i = 0; i < n; i++) {
      spawn('fx-rain', rnd(0, innerWidth), -20,
        `--c:${COLORS[i % COLORS.length]};--x:${rnd(-80, 80)}px;--r:${rnd(-720, 720)}deg;--t:${rnd(1.4, 2.4).toFixed(2)}s;animation-delay:${rnd(0, ms / 2000).toFixed(2)}s`,
        '', ms + 1500);
    }
  }

  // FLIP : on note les positions, on applique le changement, puis chaque élément glisse depuis son ancienne place
  function flip(selector, key, change) {
    if (reduced()) return change();
    const before = new Map();
    document.querySelectorAll(selector).forEach((el) => before.set(el.dataset[key], el.getBoundingClientRect().top));
    change();
    document.querySelectorAll(selector).forEach((el) => {
      const old = before.get(el.dataset[key]);
      if (old === undefined) return;
      const dy = old - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 2) return;
      el.animate(
        [{ transform: `translateY(${dy}px)`, zIndex: 2 }, { transform: 'translateY(0)', zIndex: 2 }],
        { duration: 550, easing: 'cubic-bezier(.2, .8, .2, 1)' }
      );
      el.classList.add(dy > 0 ? 'fx-up' : 'fx-down');
      setTimeout(() => el.classList.remove('fx-up', 'fx-down'), 1200);
    });
  }

  // Les nombres [data-count] défilent de 0 à leur valeur (chiffres clés de l'accueil)
  function countUp(root) {
    const els = root ? root.querySelectorAll('[data-count]') : [];
    els.forEach((el) => {
      const target = +el.dataset.count || 0;
      if (reduced() || !target) return (el.textContent = target);
      const t0 = performance.now();
      const dur = 900 + Math.min(target, 40) * 12;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }

  // Onde au point de clic (+ étincelles sur les boutons principaux)
  const RIPPLE = '.btn, .chip-btn, .segmented button, .stepper button, .l-stepper button, .quick button, .step-btn, .status-toggle, .icon-btn, .g-tabs button, .help-btn, .share-btn';
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest(RIPPLE);
    if (!b || b.disabled || reduced()) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
    if (b.classList.contains('btn-primary')) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 360 + rnd(-12, 12);
        spawn('fx-spark', e.clientX, e.clientY, `--a:${a}deg;--d:${rnd(22, 46)}px;--c:${COLORS[i % COLORS.length]}`, '', 700);
      }
    }
  });

  // Halo de couleur qui suit la souris sur les cartes (variables --mx / --my lues par le CSS)
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.t-card, .step-btn');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // Icônes sport / e-sport qui flottent dans le fond (moins nombreuses sur un petit écran)
  function floatingIcons() {
    const host = document.querySelector('.bg-icons');
    if (!host || host.childElementCount) return;
    const names = ['ball', 'pad', 'trophy', 'bolt', 'basket', 'star', 'joystick', 'medal', 'target', 'racket', 'flag', 'chart'];
    const n = window.innerWidth < 700 ? 7 : 12;
    // une grille grossière pour bien répartir les icônes sur l'écran
    const cols = n > 8 ? 4 : 3;
    const rows = Math.ceil(n / cols);
    host.innerHTML = Array.from({ length: n }, (_, i) => {
      const cx = ((i % cols) + rnd(0.15, 0.85)) / cols;
      const cy = (Math.floor(i / cols) + rnd(0.15, 0.85)) / rows;
      return `<span class="bg-ico" style="left:${(cx * 100).toFixed(1)}%;top:${(cy * 100).toFixed(1)}%;--s:${rnd(26, 52).toFixed(0)}px;--c:${COLORS[i % COLORS.length]};--t:${rnd(9, 16).toFixed(1)}s;--d:${(-rnd(0, 12)).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px;--r0:${rnd(-30, 30).toFixed(0)}deg">${glyph(names[i % names.length])}</span>`;
    }).join('');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', floatingIcons);
  else floatingIcons();

  return { pop, delta, sparks, confetti, rain, flip, mark, reduced, countUp, glyph, COLORS };
})();
