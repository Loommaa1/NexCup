// Guide de l'accueil : grande fenêtre avec une coupe qui tourne (à gauche) et le guide détaillé (à droite).
// Guide.open(index) — index 0, 1 ou 2 (les trois étapes de l'accueil).
const Guide = (() => {
  const STEPS = [
    {
      title: 'Crée le tournoi',
      intro: 'Tout se règle sur une seule page, en moins d’une minute.',
      items: [
        ['Nom et domaine', 'Donne un nom, puis cherche ton <b>sport ou jeu vidéo</b> parmi tous ceux qui existent. NexCup règle tout seul la façon de compter les points : limite de points, <b>2 points d’écart</b> au ping-pong ou au volley…'],
        ['Lieu', 'Tape une ville, un village ou un code postal : toutes les communes de France sont proposées, puis la <b>salle ou le stade</b> de la commune.'],
        ['Équipes ou participants', 'Choisis si le tournoi oppose des <b>équipes</b> ou des <b>joueurs seuls</b>, et combien (de 2 à 64).'],
        ['Format', '<b>Éliminatoire</b> : le perdant sort, jusqu’à la finale (option match pour la 3e place).<br><b>Championnat</b> : tout le monde se rencontre, en aller simple ou aller-retour, avec le barème de points de ton choix.'],
        ['Les noms', 'Écris-les un par un ou clique sur <b>« Coller une liste »</b>. Coche <b>« aléatoires »</b> pour un tirage au sort.'],
      ],
      cta: { label: 'Créer mon premier tournoi', href: '#/new' },
    },
    {
      title: 'Saisis les scores',
      intro: 'Pas besoin de clavier : quelques clics suffisent, même sur téléphone.',
      items: [
        ['Le prochain match', 'En haut de chaque tournoi, la carte <b>« Prochain match »</b> te montre qui joue. Un clic et tu saisis le score.'],
        ['Les boutons', '<b>+ / −</b> pour ajouter ou retirer un point, <b>½</b> pour ajouter la moitié de la limite, <b>Max</b> pour mettre le score gagnant. Tu peux aussi taper le score.'],
        ['Valider', 'Clique sur <b>« Valider »</b> : le gagnant passe tout seul au tour suivant. <b>« En cours »</b> garde un score provisoire.'],
        ['Règles respectées', 'Impossible de dépasser la limite ou de finir sans 2 points d’écart quand le sport l’exige : NexCup te prévient.'],
        ['Championnat', 'Le badge de chaque match passe de <b>À venir</b> à <b>En cours</b> puis <b>Fini</b>. Seuls les matchs finis comptent au classement.'],
      ],
    },
    {
      title: 'Suis le classement',
      intro: 'Tout se met à jour en direct, pour toi et pour ceux qui regardent l’écran.',
      items: [
        ['Tableau et classement', 'L’arbre éliminatoire montre qui avance ; le classement du championnat affiche <b>J, G, N, P, différence et points</b>.'],
        ['Podium', 'À la fin, le <b>podium</b> s’affiche avec le vainqueur, le 2e, le 3e et la récompense.'],
        ['Plein écran', 'Projette le tableau ou le classement sur un grand écran avec <b>« Plein écran »</b>.'],
        ['Gérer', '<b>Modifier</b> (noms, lieu, date…), <b>Dupliquer</b> pour rejouer avec les mêmes équipes, changer le <b>statut</b> (à venir, en cours, terminé).'],
        ['Sauvegarder', 'Tes tournois restent dans ton navigateur. Télécharge une <b>sauvegarde</b> depuis l’accueil pour ne rien perdre.'],
      ],
    },
  ];

  let dlg = null;
  let index = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Étincelles et confettis placés autour de la coupe (positions générées une fois)
  const SPARKS = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const r = 38 + (i % 3) * 6;
    return `<span class="g-spark" style="left:${50 + Math.cos(a) * r}%;top:${50 + Math.sin(a) * r}%;--d:${(i * 0.27) % 2}s"></span>`;
  }).join('');
  const COLORS = ['#A0228F', '#1E9FAB', '#FFB81C', '#D95BC6', '#4FD1D6', '#FFE14D'];
  const confetti = () =>
    Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * 360 + Math.random() * 14;
      const dist = 140 + Math.random() * 120;
      return `<span class="g-confetti" style="--a:${a}deg;--dist:${dist}px;--c:${COLORS[i % COLORS.length]};--r:${Math.random() * 720 - 360}deg;--w:${6 + Math.random() * 6}px"></span>`;
    }).join('');

  function render(burst) {
    const s = STEPS[index];
    dlg.querySelector('.g-num').textContent = index + 1;
    dlg.querySelector('.g-burst').innerHTML = burst ? confetti() : '';
    // relance l'animation de la coupe (petit tour supplémentaire) et du texte
    ['.g-trophy-wrap', '.g-text'].forEach((sel) => {
      const el = dlg.querySelector(sel);
      el.classList.remove('g-replay');
      void el.offsetWidth;
      el.classList.add('g-replay');
    });
    dlg.querySelector('.g-text').innerHTML = `
      <div class="g-kicker">Étape ${index + 1} sur ${STEPS.length}</div>
      <h2 class="g-title" id="guideTitle">${esc(s.title)}</h2>
      <p class="g-intro">${esc(s.intro)}</p>
      <ol class="g-list">
        ${s.items.map(([t, d], i) => `<li style="--i:${i}"><span class="g-bullet">${i + 1}</span><div><b>${esc(t)}</b><p>${d}</p></div></li>`).join('')}
      </ol>
      <div class="g-nav">
        <div class="g-tabs" role="tablist" aria-label="Étapes du guide">
          ${STEPS.map((x, i) => `<button type="button" role="tab" aria-selected="${i === index}" class="${i === index ? 'on' : ''}" data-g="${i}">${i + 1}. ${esc(x.title)}</button>`).join('')}
        </div>
        <div class="g-actions">
          ${index > 0 ? '<button type="button" class="btn btn-ghost" data-g="prev">Précédent</button>' : ''}
          ${
            index < STEPS.length - 1
              ? '<button type="button" class="btn btn-primary" data-g="next">Étape suivante</button>'
              : `<a class="btn btn-primary" href="${STEPS[0].cta.href}" data-tour-start data-g="close">${esc(STEPS[0].cta.label)}</a>`
          }
        </div>
      </div>`;
  }

  function go(i, burst = true) {
    if (i < 0 || i >= STEPS.length) return;
    index = i;
    render(burst);
  }

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'guide-dialog';
    dlg.setAttribute('aria-labelledby', 'guideTitle');
    dlg.innerHTML = `
      <button type="button" class="icon-link g-close" data-g="close" aria-label="Fermer le guide">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="g-stage" aria-hidden="true">
        <div class="g-rays"></div>
        <div class="g-orb"></div>
        <div class="g-ring g-ring-1"></div>
        <div class="g-ring g-ring-2"></div>
        ${SPARKS}
        <div class="g-burst"></div>
        <div class="g-trophy-wrap">
          <img class="g-trophy" src="assets/logo/nexcup-trophy.png" alt="" width="440" height="411">
          <span class="g-shine"></span>
        </div>
        <div class="g-shadow"></div>
        <div class="g-num"></div>
      </div>
      <div class="g-text"></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) return dlg.close(); // clic sur le fond
      const b = e.target.closest('[data-g]');
      if (!b) return;
      const g = b.dataset.g;
      if (g === 'close') dlg.close();
      else if (g === 'next') go(index + 1);
      else if (g === 'prev') go(index - 1);
      else go(+g);
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    });
  }

  /* ---------- Cinématiques plein écran (4 s, sans texte) avant le guide ----------
     Une scène différente par étape, liée à son sujet :
     · 1. Crée le tournoi    → « Décollage » : la coupe se charge, décolle et traverse les nuages jusqu'au soleil
     · 2. Saisis les scores  → « Duel » : deux énergies (magenta / turquoise) s'affrontent, la coupe naît de l'impact,
                                 les points s'allument de chaque côté comme un tableau de score
     · 3. Suis le classement → « Podium » : les marches montent, la coupe tombe sur la première, feux d'artifice
     Un clic, Échap, Entrée ou Espace passe directement au guide. */
  const CINE_MS = 4000;
  const SCENES = ['launch', 'duel', 'podium'];
  let cine = null;
  let cineTimers = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TROPHY = '<img class="c-trophy" src="assets/logo/nexcup-trophy.png" alt="" width="440" height="411">';

  const burstHTML = (n, minD, maxD, colors = COLORS) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 360 + rnd(0, 10);
      return `<span class="c-confetti" style="--a:${a}deg;--dist:${rnd(minD, maxD)}vmin;--c:${colors[i % colors.length]};--r:${rnd(-450, 450)}deg;--w:${rnd(0.9, 2)}vmin"></span>`;
    }).join('');

  // Un nuage = une forme arrondie + deux « bosses » (::before / ::after)
  const cloudsHTML = (n, minW, maxW) =>
    Array.from({ length: n }, () => `<span class="c-cloud" style="left:${rnd(-15, 95)}%;top:${rnd(0, 90)}%;--w:${rnd(minW, maxW)}vmin;--o:${rnd(0.55, 0.95)}"></span>`).join('');
  const starsHTML = (n) =>
    Array.from({ length: n }, () => `<span class="c-star" style="left:${rnd(0, 100)}%;top:${rnd(0, 100)}%;--s:${rnd(0.5, 1.8)}vmin;--d:${rnd(0, 1.5).toFixed(2)}s"></span>`).join('');

  // Scène 1 : décollage à travers les nuages
  function sceneLaunch() {
    const lines = Array.from({ length: 26 }, () => `<span class="c-line" style="left:${rnd(0, 100)}%;--h:${rnd(14, 40)}vh;--d:${rnd(0, 0.4).toFixed(2)}s;--t:${rnd(0.22, 0.4).toFixed(2)}s"></span>`).join('');
    const trail = Array.from({ length: 18 }, (_, i) => `<span class="c-ember" style="--x:${rnd(-30, 30)}%;--d:${(i * 0.045).toFixed(3)}s;--c:${COLORS[i % COLORS.length]}"></span>`).join('');
    return `
      <div class="scene scene-launch">
        <div class="c-sky"></div>
        <div class="c-stars">${starsHTML(36)}</div>
        <div class="c-sun"></div>
        <div class="c-lines">${lines}</div>
        <div class="c-clouds c-clouds-far">${cloudsHTML(12, 14, 26)}</div>
        <div class="c-clouds c-clouds-mid">${cloudsHTML(10, 22, 40)}</div>
        <div class="c-wave"></div>
        <div class="c-burst c-burst-1"></div>
        <div class="c-trophy-wrap">
          <div class="c-aura"></div>
          <div class="c-trail">${trail}</div>
          ${TROPHY}
        </div>
        <div class="c-clouds c-clouds-near">${cloudsHTML(7, 40, 70)}</div>
        <div class="c-floor"></div>
        <div class="c-burst c-burst-2"></div>
        <div class="c-flash"></div>
      </div>`;
  }

  // Scène 2 : duel d'énergies et tableau de score lumineux
  function sceneDuel() {
    const pips = (side) =>
      `<div class="d-pips d-pips-${side}">${Array.from({ length: 5 }, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>`;
    const bolts = Array.from({ length: 8 }, (_, i) => `<span class="d-bolt" style="--a:${i * 45 + rnd(-12, 12)}deg;--l:${rnd(28, 46)}vmin"></span>`).join('');
    const tail = (c) => Array.from({ length: 10 }, (_, i) => `<span style="--i:${i};--c:${c}"></span>`).join('');
    return `
      <div class="scene scene-duel">
        <div class="d-bg"></div>
        <div class="d-floor"></div>
        <div class="d-spot d-spot-l"></div><div class="d-spot d-spot-r"></div>
        <div class="d-split"></div>
        ${pips('l')}${pips('r')}
        <div class="d-orb d-orb-l"><div class="d-tail">${tail('#D95BC6')}</div></div>
        <div class="d-orb d-orb-r"><div class="d-tail">${tail('#4FD1D6')}</div></div>
        <div class="d-impact"></div>
        <div class="d-bolts">${bolts}</div>
        <div class="d-ring d-ring-1"></div><div class="d-ring d-ring-2"></div>
        <div class="c-burst d-burst-1"></div>
        <div class="d-trophy-wrap">
          <div class="d-orbit d-orbit-l"></div><div class="d-orbit d-orbit-r"></div>
          ${TROPHY}
        </div>
        <div class="c-burst d-burst-2"></div>
        <div class="c-flash d-flash"></div>
      </div>`;
  }

  // Scène 3 : podium, projecteurs, barres de classement et feux d'artifice
  function scenePodium() {
    const bars = Array.from({ length: 9 }, (_, i) => `<span style="--i:${i};--h:${rnd(18, 62)}vh"></span>`).join('');
    const fireworks = [
      [22, 26, 2.15, '#FFD24A'], [78, 22, 2.35, '#4FD1D6'], [50, 12, 2.6, '#D95BC6'], [14, 46, 2.85, '#4FD1D6'], [86, 44, 3.0, '#FFD24A'],
    ]
      .map(([x, y, d, c]) => `<div class="p-fw" style="left:${x}%;top:${y}%;--d:${d}s;--c:${c}">${Array.from({ length: 18 }, (_, i) => `<span style="--a:${i * 20}deg"></span>`).join('')}</div>`)
      .join('');
    const rain = Array.from({ length: 40 }, (_, i) => `<span style="left:${rnd(0, 100)}%;--c:${COLORS[i % COLORS.length]};--d:${rnd(1.9, 3).toFixed(2)}s;--t:${rnd(1.2, 2).toFixed(2)}s;--r:${rnd(-540, 540)}deg;--x:${rnd(-8, 8)}vw"></span>`).join('');
    return `
      <div class="scene scene-podium">
        <div class="p-bg"></div>
        <div class="c-stars">${starsHTML(26)}</div>
        <div class="p-bars">${bars}</div>
        <div class="p-beam p-beam-1"></div><div class="p-beam p-beam-2"></div><div class="p-beam p-beam-3"></div>
        ${fireworks}
        <div class="p-podium">
          <div class="p-step p-step-2"><span class="p-medal"></span></div>
          <div class="p-step p-step-1"><span class="p-medal"></span></div>
          <div class="p-step p-step-3"><span class="p-medal"></span></div>
        </div>
        <div class="p-dust"></div>
        <div class="p-trophy-wrap"><div class="p-glow"></div>${TROPHY}</div>
        <div class="p-rain">${rain}</div>
        <div class="c-flash p-flash"></div>
      </div>`;
  }

  function buildCine() {
    cine = document.createElement('div');
    cine.className = 'cine';
    cine.setAttribute('aria-hidden', 'true');
    cine.innerHTML = sceneLaunch() + sceneDuel() + scenePodium();
    document.body.appendChild(cine);
  }

  function playCinematic(scene, done) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    if (!cine) buildCine();
    cine.dataset.scene = scene;
    // nouvelles explosions de confettis à chaque fois
    const set = (sel, html) => (cine.querySelector(sel).innerHTML = html);
    if (scene === 'launch') {
      set('.c-burst-1', burstHTML(34, 25, 55));
      set('.c-burst-2', burstHTML(46, 35, 80));
    } else if (scene === 'duel') {
      set('.d-burst-1', burstHTML(40, 25, 60, ['#D95BC6', '#4FD1D6', '#FFE14D', '#FFFFFF']));
      set('.d-burst-2', burstHTML(46, 35, 85));
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cineTimers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey, true);
      cine.removeEventListener('click', finish);
      cine.classList.add('is-out');
      setTimeout(() => cine.classList.remove('is-playing', 'is-out'), 350);
      done();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    cine.classList.remove('is-playing', 'is-out');
    void cine.offsetWidth; // relance toutes les animations
    cine.classList.add('is-playing');
    cine.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    cineTimers = [setTimeout(finish, CINE_MS)];
  }

  function open(i = 0) {
    if (!dlg) build();
    index = i;
    playCinematic(SCENES[i] || 'launch', () => {
      render(true);
      dlg.showModal();
      dlg.querySelector('.g-tabs .on').focus({ preventScroll: true });
    });
  }

  return { open, close: () => dlg && dlg.open && dlg.close() };
})();
