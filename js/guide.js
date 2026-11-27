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
  const COLORS = ['#E21FA0', '#7B3FF2', '#00B4D8', '#FFB81C', '#FF3D6E', '#6BCB00', '#2F6BFF', '#FF7A1A'];
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
    if (i < 0 || i >= STEPS.length || i === index) return;
    // Changer d'étape rejoue la cinématique de la nouvelle étape, puis rouvre le guide
    index = i;
    if (dlg.open) dlg.close();
    playCinematic(SCENES[i], () => {
      render(burst);
      dlg.showModal();
      dlg.querySelector('.g-tabs .on').focus({ preventScroll: true });
    });
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

  /* ---------- Cinématiques plein écran (4,5 s, sans texte) avant le guide ----------
     Chaque scène mélange le sport (stade, pelouse, lumière dorée) et l'e-sport (arène néon, grille, pixels),
     séparés par une diagonale lumineuse, et illustre le but de l'étape :
     · 1. Crée le tournoi    → « Fusion » : un ballon et une manette se rencontrent au centre,
                                 le tableau du tournoi se dessine depuis l'impact, la coupe se pose au milieu
     · 2. Saisis les scores  → « Tableau de score » : but côté stade, tir réussi côté arène, les chiffres basculent,
                                 le gagnant monte dans la case du tour suivant
     · 3. Suis le classement → « Classement en direct » : les lignes arrivent, les barres se remplissent,
                                 une équipe double les autres, la coupe se pose sur la première place
     Un clic, Échap, Entrée ou Espace passe directement au guide. */
  const CINE_MS = 4500;
  const SCENES = ['create', 'score', 'rank'];
  let cine = null;
  let cineTimers = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TROPHY = '<img class="x-trophy-img" src="assets/logo/nexcup-trophy.png" alt="" width="440" height="411">';
  const GOLD = ['#FFE27A', '#FFC93C', '#FFB81C', '#FFFFFF'];
  const NEON = ['#FF2BD6', '#00F0FF', '#B4FF00', '#7C4DFF'];
  const MIX = ['#FFE27A', '#00F0FF', '#FFB81C', '#FF2BD6', '#FFFFFF', '#B4FF00'];
  const PALETTES = { gold: GOLD, neon: NEON, mix: MIX };
  // Même condition que l'unité --u du CSS (téléphone tenu en hauteur)
  const isPortrait = () => window.matchMedia('(orientation: portrait) and (max-width: 760px)').matches;

  // Explosion de confettis (rectangles dorés) ou de pixels (carrés néon)
  const burstHTML = (n, minD, maxD, colors) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 360 + rnd(0, 10);
      return `<span class="x-conf" style="--a:${a}deg;--dist:calc(${rnd(minD, maxD).toFixed(1)} * var(--u));--c:${colors[i % colors.length]};--r:${rnd(-450, 450).toFixed(0)}deg;--w:calc(${rnd(0.9, 2).toFixed(2)} * var(--u))"></span>`;
    }).join('');
  // data-* : nombre, distances min / max, palette — rempli à chaque lecture (nouveau tirage)
  const burst = (cls, n, min, max, pal) => `<div class="x-burst ${cls}" data-n="${n}" data-min="${min}" data-max="${max}" data-pal="${pal}"></div>`;

  // Icônes dessinées (pas d'image) : ballon, basket, manette, joystick
  const ICONS = {
    ball: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#1A1A1A" stroke-width="4"/>
      <polygon points="50,30 69,44 62,66 38,66 31,44" fill="#1A1A1A"/>
      <path d="M50 30V5M69 44l23-8M62 66l14 22M38 66L24 88M31 44L8 36" stroke="#1A1A1A" stroke-width="4"/></svg>`,
    basket: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#F08A24" stroke="#3A1A00" stroke-width="4"/>
      <path d="M50 4v92M4 50h92M20 16q30 34 0 68M80 16q-30 34 0 68" fill="none" stroke="#3A1A00" stroke-width="4"/></svg>`,
    pad: `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M22 12h76a18 18 0 0 1 18 17l2 30a13 13 0 0 1-23 9l-11-13H36L25 68a13 13 0 0 1-23-9l2-30a18 18 0 0 1 18-17z" fill="#24124F" stroke="#00F0FF" stroke-width="4"/>
      <path d="M30 28v20M20 38h20" stroke="#00F0FF" stroke-width="6" stroke-linecap="round"/>
      <circle cx="88" cy="29" r="5" fill="#FF2BD6"/><circle cx="98" cy="39" r="5" fill="#B4FF00"/><circle cx="78" cy="39" r="5" fill="#FFE14D"/><circle cx="88" cy="49" r="5" fill="#00F0FF"/></svg>`,
    stick: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="12" y="62" width="76" height="26" rx="9" fill="#24124F" stroke="#FF2BD6" stroke-width="4"/>
      <rect x="46" y="30" width="8" height="34" rx="3" fill="#D9D3EE"/><circle cx="50" cy="26" r="15" fill="#FF2BD6"/><circle cx="74" cy="75" r="5" fill="#00F0FF"/></svg>`,
  };

  // Décor commun : à gauche le stade (pelouse, projecteurs), à droite l'arène néon (grille), séparés en diagonale
  const bgHTML = () => `
    <div class="x-sport"><span class="x-flood x-flood-1"></span><span class="x-flood x-flood-2"></span><span class="x-pitch"></span></div>
    <div class="x-neon"><span class="x-sun"></span><span class="x-grid"></span><span class="x-scan"></span></div>
    <svg class="x-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="xSeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#00F0FF"/></linearGradient></defs>
      <line x1="58" y1="0" x2="42" y2="100" stroke="url(#xSeam)" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>`;

  // Scène 1 : le ballon et la manette fusionnent, le tableau du tournoi se dessine
  function sceneCreate() {
    // Tableau symétrique : 4 + 2 + 1 cases de chaque côté (or = sport, néon = e-sport).
    // Sur un téléphone en hauteur, le tableau est étiré verticalement (et les cases un peu plus épaisses)
    // pour occuper l'écran au lieu d'une fine bande.
    const tall = isPortrait();
    const H = tall ? 170 : 100;
    const Y = (v) => +(v * H / 100).toFixed(1);
    const ph = tall ? 13 : 10;
    const pill = (x, cy, side, d, w = 26) =>
      `<g class="bk-pill bk-${side}" style="--d:${d}s"><rect x="${x}" y="${Y(cy) - ph / 2}" width="${w}" height="${ph}" rx="${ph / 2}"/><circle cx="${side === 'l' ? x + 5 : x + w - 5}" cy="${Y(cy)}" r="${tall ? 3.2 : 2.6}"/></g>`;
    // crochet qui relie deux cases (x1 → coude en xm → case suivante en x2)
    const join = (x1, xm, x2, ya, yb) => `M${x1} ${Y(ya)}H${xm}V${Y(yb)}H${x1}M${xm} ${Y((ya + yb) / 2)}H${x2}`;
    const line = (d, delay) => `<path class="bk-line" d="${d}" pathLength="1" style="--d:${delay}s"/>`;
    const r1 = [14, 38, 62, 86];
    const bracket = `
      <svg class="bk" viewBox="0 0 200 ${H}" aria-hidden="true">
        ${line(join(30, 35, 40, 14, 38), 1.85)}${line(join(30, 35, 40, 62, 86), 1.9)}
        ${line(join(170, 165, 160, 14, 38), 1.85)}${line(join(170, 165, 160, 62, 86), 1.9)}
        ${line(join(66, 68, 70, 26, 74), 2.2)}${line(join(134, 132, 130, 26, 74), 2.2)}
        ${line(`M92 ${Y(50)}H108`, 2.5)}
        ${r1.map((y, i) => pill(4, y, 'l', 1.55 + i * 0.06)).join('')}
        ${r1.map((y, i) => pill(170, y, 'r', 1.58 + i * 0.06)).join('')}
        ${pill(40, 26, 'l', 2.0)}${pill(40, 74, 'l', 2.05)}${pill(134, 26, 'r', 2.0)}${pill(134, 74, 'r', 2.05)}
        ${pill(70, 50, 'l', 2.3, 22)}${pill(108, 50, 'r', 2.3, 22)}
        <circle class="bk-node" cx="100" cy="${Y(50)}" r="4"/>
      </svg>`;
    return `
      <div class="scene scene-create">
        ${bgHTML()}
        <div class="x-trail x-trail-l"></div><div class="x-trail x-trail-r"></div>
        <div class="cr-ball">${ICONS.ball}</div>
        <div class="cr-pad">${ICONS.pad}</div>
        <div class="x-ring cr-ring-1"></div><div class="x-ring cr-ring-2"></div>
        <div class="cr-bracket">${bracket}<div class="x-trophy cr-trophy">${TROPHY}</div></div>
        ${burst('cr-burst-1', 30, 20, 45, 'mix')}
        ${burst('cr-burst-2', 46, 30, 75, 'mix')}
        <div class="x-flash"></div>
      </div>`;
  }

  // Scène 2 : but côté stade, tir réussi côté arène, le tableau de score bascule, le gagnant avance
  function sceneScore() {
    const digits = (n) => Array.from({ length: n }, (_, i) => `<span>${i}</span>`).join('');
    const pixels = Array.from({ length: 22 }, (_, i) => `<span style="--a:${(i / 22) * 360 + rnd(-8, 8)}deg;--dist:calc(${rnd(8, 16).toFixed(1)} * var(--u));--c:${NEON[i % NEON.length]}"></span>`).join('');
    return `
      <div class="scene scene-score">
        ${bgHTML()}
        <div class="sc-goal"><svg viewBox="0 0 100 60" aria-hidden="true">
          <defs><pattern id="scNet" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0L6 6M6 0L0 6" stroke="rgba(255,255,255,.45)" stroke-width=".8"/></pattern></defs>
          <rect x="4" y="4" width="92" height="56" fill="url(#scNet)"/><path d="M4 60V4H96V60" fill="none" stroke="#fff" stroke-width="4"/></svg></div>
        <div class="sc-shot">${ICONS.ball}</div>
        <div class="sc-target"><span></span><span></span></div>
        <div class="sc-laser"></div>
        <div class="sc-cross"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#B4FF00" stroke-width="2.5"/><path d="M20 2v10M20 28v10M2 20h10M28 20h10" stroke="#B4FF00" stroke-width="2.5"/></svg></div>
        <div class="sc-pixels">${pixels}</div>
        <div class="sc-board">
          <div class="sc-side sc-side-l"><span class="sc-ico">${ICONS.ball}</span><div class="sc-digit"><div class="sc-strip sc-strip-l">${digits(3)}</div></div></div>
          <span class="sc-colon"></span>
          <div class="sc-side sc-side-r"><span class="sc-ico">${ICONS.pad}</span><div class="sc-digit"><div class="sc-strip sc-strip-r">${digits(2)}</div></div></div>
        </div>
        <div class="sc-next"><span class="sc-chev"></span><span class="sc-chev"></span><span class="sc-chev"></span><span class="sc-slot"></span><span class="sc-winner">${ICONS.ball}</span></div>
        ${burst('sc-burst', 40, 25, 60, 'gold')}
        <div class="x-flash"></div>
      </div>`;
  }

  // Scène 3 : classement en direct — une équipe double les autres, la coupe se pose sur la première place
  function sceneRank() {
    // [icône, monde, positions (avant / après le 1er dépassement / à la fin), longueur de la barre aux mêmes moments]
    const rows = [
      ['ball', 'gold', [0, 0, 1], [0.82, 0.86, 0.86]],
      ['pad', 'neon', [1, 2, 2], [0.7, 0.72, 0.72]],
      ['basket', 'gold', [2, 1, 0], [0.55, 0.8, 0.98]],
      ['stick', 'neon', [3, 3, 3], [0.38, 0.42, 0.46]],
    ];
    const rowsHTML = rows
      .map(([ico, world, p, w], i) => `
        <div class="rk-row rk-${world} ${i === 2 ? 'rk-up' : ''}" style="--p0:${p[0]};--p1:${p[1]};--p2:${p[2]}">
          <div class="rk-in" style="--d:${(0.45 + i * 0.12).toFixed(2)}s">
            <span class="rk-ico">${ICONS[ico]}</span>
            <span class="rk-name"></span>
            <span class="rk-bar"><span style="--w0:${w[0]};--w1:${w[1]};--w2:${w[2]}"></span></span>
            ${i === 2 ? '<span class="rk-arrows"><span></span><span></span></span>' : ''}
          </div>
        </div>`)
      .join('');
    return `
      <div class="scene scene-rank">
        ${bgHTML()}
        <div class="rk">
          <div class="rk-ranks">${[1, 2, 3, 4].map((n) => `<span class="rk-rank rk-rank-${n}">${n}</span>`).join('')}</div>
          <div class="rk-rows">${rowsHTML}</div>
          <div class="x-trophy rk-trophy">${TROPHY}</div>
        </div>
        ${burst('rk-fw-1', 22, 10, 18, 'gold')}
        ${burst('rk-fw-2', 22, 10, 18, 'neon')}
        ${burst('rk-burst', 44, 30, 70, 'mix')}
        <div class="x-flash"></div>
      </div>`;
  }

  function buildCine() {
    cine = document.createElement('div');
    cine.className = 'cine';
    cine.setAttribute('aria-hidden', 'true');
    cine.innerHTML = sceneCreate() + sceneScore() + sceneRank();
    cine.dataset.portrait = isPortrait();
    document.body.appendChild(cine);
  }

  function playCinematic(scene, done) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    // l'écran a pivoté depuis la dernière fois : on reconstruit les scènes à la bonne forme
    if (cine && cine.dataset.portrait !== String(isPortrait())) {
      cine.remove();
      cine = null;
    }
    if (!cine) buildCine();
    cine.dataset.scene = scene;
    // nouvelles explosions de confettis à chaque fois
    cine.querySelectorAll(`.scene-${scene} .x-burst`).forEach((el) => {
      const { n, min, max, pal } = el.dataset;
      el.innerHTML = burstHTML(+n, +min, +max, PALETTES[pal] || MIX);
    });
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
    playCinematic(SCENES[i] || 'create', () => {
      render(true);
      dlg.showModal();
      dlg.querySelector('.g-tabs .on').focus({ preventScroll: true });
    });
  }

  return { open, close: () => dlg && dlg.open && dlg.close() };
})();
