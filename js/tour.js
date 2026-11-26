// Petit tutoriel guidé : met en lumière un élément de la page et affiche une bulle d'explication.
// Tour.start([{ target: '#id' | () => Element, title, text }], { onEnd, optOut: { label, checked, onChange } })
const Tour = (() => {
  let steps = [];
  let index = 0;
  let onEnd = null;
  let optOut = null; // case « Ne plus afficher » (facultative)
  let root = null;
  let spot = null;
  let bubble = null;
  let raf = 0;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function targetOf(step) {
    const el = typeof step.target === 'function' ? step.target() : document.querySelector(step.target);
    return el && el.getClientRects().length ? el : null;
  }

  // Place le halo autour de l'élément et la bulle en dessous (ou au-dessus s'il n'y a pas la place)
  function position() {
    const el = targetOf(steps[index]);
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!el) {
      spot.style.cssText = `top:${vh / 2}px;left:${vw / 2}px;width:0;height:0`;
      bubble.style.cssText = `top:${Math.max(16, vh / 2 - 100)}px;left:${Math.max(16, vw / 2 - 170)}px`;
      return;
    }
    const r = el.getBoundingClientRect();
    spot.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;

    const bw = Math.min(340, vw - 32);
    const bh = bubble.offsetHeight || 180;
    let top = r.bottom + pad + 12;
    let place = 'below';
    if (top + bh > vh - 12 && r.top - pad - 12 - bh > 12) {
      top = r.top - pad - 12 - bh;
      place = 'above';
    }
    top = Math.min(Math.max(12, top), vh - bh - 12);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - bw / 2), vw - bw - 16);
    bubble.dataset.place = place;
    bubble.style.cssText = `top:${top}px;left:${left}px;width:${bw}px;--arrow:${Math.min(Math.max(20, r.left + r.width / 2 - left), bw - 20)}px`;
  }

  // Suit l'élément pendant le défilement et les animations
  function follow() {
    position();
    raf = requestAnimationFrame(follow);
  }

  function render() {
    const s = steps[index];
    const last = index === steps.length - 1;
    bubble.innerHTML = `
      <div class="tour-progress">Étape ${index + 1} sur ${steps.length}</div>
      <h3 class="tour-title" id="tourTitle">${esc(s.title)}</h3>
      <p class="tour-text">${s.text}</p>
      <div class="tour-dots" aria-hidden="true">${steps.map((_, i) => `<span class="${i === index ? 'on' : ''}"></span>`).join('')}</div>
      ${
        optOut
          ? `<label class="tour-optout"><input type="checkbox" data-tour-optout ${optOut.checked ? 'checked' : ''}>${esc(optOut.label)}</label>`
          : ''
      }
      <div class="tour-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-tour="skip">${last ? 'Fermer' : 'Passer le tuto'}</button>
        <span class="tour-nav">
          ${index > 0 ? '<button type="button" class="btn btn-ghost btn-sm" data-tour="prev">Précédent</button>' : ''}
          <button type="button" class="btn btn-primary btn-sm" data-tour="next">${last ? 'C’est parti !' : 'Suivant'}</button>
        </span>
      </div>`;
    bubble.classList.remove('tour-bump');
    void bubble.offsetWidth; // relance l'animation de la bulle
    bubble.classList.add('tour-bump');
    const el = targetOf(s);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    bubble.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  }

  function go(i) {
    if (i < 0) return;
    if (i >= steps.length) return end();
    index = i;
    render();
  }

  function onKey(e) {
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  }

  function end() {
    if (!root) return;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    root.remove();
    root = null;
    if (onEnd) onEnd();
  }

  function start(list, opts = {}) {
    end();
    steps = list;
    index = 0;
    onEnd = opts.onEnd || null;
    optOut = opts.optOut ? { ...opts.optOut } : null;
    root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `
      <div class="tour-spot"></div>
      <div class="tour-bubble" role="dialog" aria-modal="true" aria-labelledby="tourTitle"></div>`;
    document.body.appendChild(root);
    spot = root.querySelector('.tour-spot');
    bubble = root.querySelector('.tour-bubble');
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tour]');
      if (!b) return;
      const a = b.dataset.tour;
      if (a === 'next') go(index + 1);
      else if (a === 'prev') go(index - 1);
      else end();
    });
    // Case « Ne plus afficher » : le choix est enregistré tout de suite
    root.addEventListener('change', (e) => {
      if (!e.target.matches('[data-tour-optout]') || !optOut) return;
      optOut.checked = e.target.checked;
      if (optOut.onChange) optOut.onChange(optOut.checked);
    });
    document.addEventListener('keydown', onKey);
    render();
    follow();
  }

  return { start, end, isOpen: () => !!root };
})();
