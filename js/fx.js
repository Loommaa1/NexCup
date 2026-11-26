// Petits effets visuels réutilisables pour donner du retour à chaque action.
//   FX.pop(el)                 — l'élément « saute »
//   FX.delta(el, '+1', color)  — un texte qui s'envole au-dessus de l'élément
//   FX.sparks(el, n)           — étincelles autour de l'élément
//   FX.confetti(el|null, n)    — explosion de confettis (depuis l'élément ou le centre de l'écran)
//   FX.rain(ms)                — pluie de confettis sur tout l'écran
//   FX.flip(selector, key, change) — les éléments glissent vers leur nouvelle place après un changement (classement)
//   FX.mark(el, cls)           — relance une animation CSS de classe `cls`
// Une onde (« ripple ») part du point de clic sur tous les boutons.
const FX = (() => {
  const COLORS = ['#A0228F', '#1E9FAB', '#FFB81C', '#D95BC6', '#4FD1D6', '#FFE14D'];
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

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

  // Onde au point de clic
  const RIPPLE = '.btn, .chip-btn, .segmented button, .stepper button, .l-stepper button, .quick button, .step-btn, .status-toggle, .icon-btn, .g-tabs button, .help-btn';
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
  });

  return { pop, delta, sparks, confetti, rain, flip, mark, reduced };
})();
