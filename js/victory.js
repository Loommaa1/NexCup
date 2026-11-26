// Célébration du vainqueur (10 s, plein écran), quand un tournoi se termine.
// Le thème suit le domaine du tournoi :
//   · « sport » : stade de nuit — projecteurs qui s'allument, flashs de la foule, pelouse, serpentins, feux d'artifice
//   · « game »  : univers néon — grille rétro, soleil synthwave, cadre de jeu, lasers, texte « glitch », pixels
// Victory.play({ theme, tournament, winner, second, third, reward }, done) — un clic, Échap ou « Passer » arrête.
const Victory = (() => {
  const DURATION = 10000;
  const BRAND = ['#A0228F', '#1E9FAB', '#FFB81C', '#D95BC6', '#4FD1D6', '#FFE14D'];
  const GOLD = ['#FFE27A', '#FFC93C', '#FFB81C', '#FFF3C4', '#E0A800'];
  const NEON = ['#FF2BD6', '#00F0FF', '#B4FF00', '#FFE14D', '#7C4DFF'];
  let root = null;
  let timer = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr, i) => arr[i % arr.length];
  const times = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

  // Feux d'artifice (sport) ou explosions de pixels (jeu) : [x %, y %, départ s]
  const BURSTS = [[20, 28, 3.2], [78, 24, 3.6], [50, 14, 4.1], [12, 52, 5.0], [88, 48, 5.4], [32, 18, 6.2], [68, 16, 6.7], [50, 34, 7.4], [22, 40, 8.0], [80, 36, 8.4]];

  function burstsHTML(theme) {
    const colors = theme === 'game' ? NEON : GOLD.concat(BRAND);
    return BURSTS.map(([x, y, d], k) => {
      const c = pick(colors, k);
      const n = theme === 'game' ? 16 : 22;
      return `<div class="v-fw" style="left:${x}%;top:${y}%;--d:${d}s;--c:${c}">
        <span class="v-fw-core"></span>
        ${times(n, (i) => `<span style="--a:${(i / n) * 360}deg;--dist:${rnd(11, 17).toFixed(1)}vmin"></span>`)}
      </div>`;
    }).join('');
  }

  function confettiHTML(theme) {
    const colors = theme === 'game' ? NEON : BRAND.concat(GOLD);
    return times(theme === 'game' ? 70 : 90, (i) =>
      `<span style="left:${rnd(0, 100).toFixed(1)}%;--c:${pick(colors, i)};--d:${rnd(2.6, 8).toFixed(2)}s;--t:${rnd(2.2, 3.6).toFixed(2)}s;--x:${rnd(-10, 10).toFixed(1)}vw;--r:${rnd(-720, 720).toFixed(0)}deg;--w:${rnd(0.8, 1.6).toFixed(2)}vmin"></span>`);
  }

  function sportHTML() {
    const towers = [[6, -1], [30, 1], [70, -1], [94, 1]];
    return `
      <div class="vs-pitch"><span class="vs-line"></span><span class="vs-circle"></span></div>
      <div class="vs-lights">${towers.map(([x, dir], i) => `
        <div class="vs-tower" style="left:${x}%;--i:${i};--dir:${dir}"><span class="vs-lamp"></span><span class="vs-beam"></span></div>`).join('')}</div>
      <div class="vs-crowd"></div>
      <div class="vs-flashes">${times(46, () => `<span style="left:${rnd(1, 99).toFixed(1)}%;top:${rnd(0, 100).toFixed(1)}%;--d:${rnd(0.6, 9.4).toFixed(2)}s"></span>`)}</div>
      <div class="vs-streamers">${times(26, (i) => `<span style="left:${rnd(0, 100).toFixed(1)}%;--c:${pick(GOLD.concat(BRAND), i)};--d:${rnd(4.5, 8.5).toFixed(2)}s;--t:${rnd(2.6, 4).toFixed(2)}s;--sw:${rnd(2, 6).toFixed(1)}vw"></span>`)}</div>`;
  }

  function gameHTML() {
    return `
      <div class="vg-sun"></div>
      <div class="vg-grid"></div>
      <div class="vg-lasers">${times(6, (i) => `<span style="--i:${i};--c:${pick(NEON, i)};--from:${-40 + i * 16}deg"></span>`)}</div>
      <div class="vg-pixels">${times(40, (i) => `<span style="left:${rnd(0, 100).toFixed(1)}%;--c:${pick(NEON, i)};--d:${rnd(0.5, 9).toFixed(2)}s;--t:${rnd(2, 4).toFixed(2)}s;--s:${rnd(0.6, 1.6).toFixed(2)}vmin"></span>`)}</div>
      <div class="vg-hud"><span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span></div>
      <div class="vg-rings"><span></span><span></span><span></span></div>
      <div class="vg-scan"></div>`;
  }

  function play({ theme = 'sport', winner, second, third, reward }, done) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done && done();
    if (root) root.remove();
    const game = theme === 'game';
    root = document.createElement('div');
    root.className = `vic ${game ? 'v-game' : 'v-sport'}`;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', `${game ? 'Victoire' : 'Champion'} : ${winner}`);
    root.innerHTML = `
      <div class="v-bg"></div>
      ${game ? gameHTML() : sportHTML()}
      <div class="v-rays"></div>
      <div class="v-trophy-wrap"><div class="v-halo"></div><img class="v-trophy" src="assets/logo/nexcup-trophy.png" alt="" width="440" height="411"></div>
      <div class="v-text">
        <div class="v-title" data-text="${game ? 'VICTOIRE' : 'CHAMPION'}">${game ? 'VICTOIRE' : 'CHAMPION'}</div>
        <div class="v-name" data-text="${esc(winner)}">${esc(winner)}</div>
        ${reward ? `<div class="v-reward">🏆 ${esc(reward)}</div>` : ''}
        ${second || third ? `<div class="v-podium">
          ${second ? `<span class="v-p v-p2"><b>2</b>${esc(second)}</span>` : ''}
          ${third ? `<span class="v-p v-p3"><b>3</b>${esc(third)}</span>` : ''}
        </div>` : ''}
      </div>
      <div class="v-bursts">${burstsHTML(theme)}</div>
      <div class="v-confetti">${confettiHTML(theme)}</div>
      <div class="v-flash"></div>
      <button type="button" class="v-skip">Passer ›</button>`;
    document.body.appendChild(root);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      const el = root;
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 500);
      root = null;
      if (done) done();
    };
    const onKey = (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    root.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    root.querySelector('.v-skip').focus({ preventScroll: true });
    timer = setTimeout(finish, DURATION);
  }

  return { play };
})();
