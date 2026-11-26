// Animation plein écran à la création d'un tournoi (≈ 3 s) :
// la carte du tournoi apparaît, les équipes arrivent de tous les bords et se placent en cercle,
// des liens lumineux les relient, la coupe s'abat sur la carte (tampon « validé »), confettis, puis zoom.
// CreateAnim.play({ name, sub, teams: [...] }, done) — un clic, Échap, Entrée ou Espace passe l'animation.
const CreateAnim = (() => {
  const DURATION = 3000;
  const MAX_CHIPS = 16; // au-delà, une pastille « +N »
  const COLORS = ['#E21FA0', '#7B3FF2', '#00B4D8', '#FFB81C', '#FF3D6E', '#6BCB00', '#2F6BFF', '#FF7A1A'];
  let root = null;
  let timer = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);

  function chipsHTML(teams) {
    const shown = teams.slice(0, MAX_CHIPS);
    const extra = teams.length - shown.length;
    const labels = extra > 0 ? [...shown.slice(0, MAX_CHIPS - 1), `+${extra + 1}`] : shown;
    const n = labels.length;
    // Sur un téléphone en hauteur, la carte occupe toute la largeur : les équipes posées à gauche et
    // à droite seraient cachées derrière. On les répartit alors sur deux arcs, au-dessus et en dessous.
    const portrait = window.matchMedia('(orientation: portrait) and (max-width: 760px)').matches;
    const top = Math.ceil(n / 2);
    const arc = (k, count, from, to) => (count === 1 ? (from + to) / 2 : from + (k / (count - 1)) * (to - from));
    const deg = Math.PI / 180;
    const angle = (i) => {
      if (!portrait || n < 3) return (i / n) * Math.PI * 2 - Math.PI / 2; // départ en haut, sens horaire
      return i < top ? arc(i, top, -150, -30) * deg : arc(i - top, n - top, 30, 150) * deg;
    };
    return labels
      .map((name, i) => {
        const a = angle(i);
        // position finale sur une ellipse (plus large que haute pour tenir sur ordinateur et mobile)
        const x = Math.cos(a);
        const y = Math.sin(a);
        return `
          <span class="ca-link" style="--x:${x.toFixed(3)};--y:${y.toFixed(3)};--d:${(1.15 + i * 0.035).toFixed(3)}s;--c:${COLORS[i % COLORS.length]}"></span>
          <span class="ca-chip" style="--x:${x.toFixed(3)};--y:${y.toFixed(3)};--d:${(0.3 + i * (0.8 / n)).toFixed(3)}s;--c:${COLORS[i % COLORS.length]};--r:${rnd(-200, 200).toFixed(0)}deg">${esc(name)}</span>`;
      })
      .join('');
  }

  function confettiHTML(n) {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 360 + rnd(0, 10);
      return `<span class="ca-confetti" style="--a:${a}deg;--dist:calc(${rnd(28, 70)} * var(--u));--c:${COLORS[i % COLORS.length]};--r:${rnd(-500, 500)}deg;--w:calc(${rnd(0.9, 2)} * var(--u))"></span>`;
    }).join('');
  }

  function play({ name, sub, teams }, done) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    if (root) root.remove();
    root = document.createElement('div');
    root.className = 'ca';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="ca-bg"></div>
      <div class="ca-grid"></div>
      <div class="ca-ring"></div>
      <div class="ca-orbit">${chipsHTML(teams)}</div>
      <div class="ca-card">
        <span class="ca-card-shine"></span>
        <div class="ca-name">${esc(name)}</div>
        <div class="ca-sub">${esc(sub)}</div>
        <div class="ca-stamp"><img src="assets/logo/nexcup-trophy.png" alt="" width="440" height="411"></div>
      </div>
      <div class="ca-wave"></div>
      <div class="ca-burst">${confettiHTML(48)}</div>
      <div class="ca-flash"></div>`;
    document.body.appendChild(root);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      const el = root;
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 380);
      root = null;
      done();
    };
    const onKey = (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    root.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    timer = setTimeout(finish, DURATION);
  }

  return { play };
})();
