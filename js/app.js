// Interface : routage par hash, rendu des écrans et gestion des événements.
(() => {
  'use strict';

  const app = document.getElementById('app');
  const dialog = document.getElementById('scoreDialog');
  const ui = {}; // état d'affichage par tournoi (onglet, phase, journée)

  /* ---------------- Utilitaires ---------------- */

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const fmtDiff = (d) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0');
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

  const STATUS = { upcoming: 'À venir', live: 'En cours', done: 'Terminé' };
  const MATCH_STATUS = { upcoming: 'À venir', live: 'En cours', done: 'Fini' };
  const pointsBanner = (t) => {
    const P = T.pointsOf(t);
    return `<div class="info-banner"><b>Points :</b> victoire ${P.win} · égalité ${P.draw} pour ${W(t).each} · défaite ${P.loss}</div>`;
  };

  const ICON = {
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    expand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    trophy: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  };

  function scoreLabel(t) {
    if (!T.isPts(t)) return `Bo${t.bo}`;
    if (T.isWinBy2(t)) return `${t.maxPoints} ${t.unit}, 2 d’écart`;
    return t.maxPoints ? `${t.maxPoints} ${t.unit} max` : `En ${t.unit}`;
  }
  const formatLabel = (t) => `${scoreLabel(t)} · ${t.type === 'elim' ? 'Éliminatoire' : 'Championnat'}`;
  let homeDomain = null; // domaine choisi dans le menu de l'accueil (filtre + création)
  const ROBLOX_ID = 'game-roblox';
  const domainLabel = (t) => (t.discipline ? t.discipline.name + (t.subGame ? ` · ${t.subGame}` : '') : '');
  const MAX_TEAMS = 64;
  // Le tournoi oppose des équipes ou des participants (joueurs seuls) : on adapte les mots partout
  const WORDS = {
    team: { one: 'équipe', many: 'équipes', One: 'Équipe', Many: 'Équipes', each: 'chaque équipe', entered: 'saisies', added: 'ajoutées', placeholder: 'Nom de l’équipe', examples: 'Wolves&#10;Corsaires&#10;Vortex' },
    player: { one: 'participant', many: 'participants', One: 'Participant', Many: 'Participants', each: 'chaque participant', entered: 'saisis', added: 'ajoutés', placeholder: 'Nom du participant', examples: 'Alice&#10;Bruno&#10;Chloé' },
  };
  const W = (t) => WORDS[(t && t.entrant) || 'team'];
  const countLabel = (t, n) => `${n} ${n > 1 ? W(t).many : W(t).one}`;
  const teamName = (t, id) => (id === null || id === undefined ? '' : t.teams[id].name);

  /* ---------------- Logo NexCup (en-tête) ---------------- */
  const brandHTML = () => `
    <a href="#/" class="brand" aria-label="NexCup, accueil">
      <img class="brand-mark" src="assets/logo/nexcup-mark.png" alt="" width="512" height="478">
      <span class="brand-name"><span class="brand-nex">Nex</span><span class="brand-cup">Cup</span></span>
    </a>`;

  /* ---------------- Thème clair / sombre ---------------- */
  const SUN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>';
  const isDark = () => document.documentElement.dataset.theme === 'dark';

  function themeToggleHTML() {
    const dark = isDark();
    return `
      <button type="button" class="theme-toggle" data-theme-toggle role="switch" aria-checked="${dark}"
        aria-label="Thème sombre" title="${dark ? 'Passer en mode clair' : 'Passer en mode sombre'}">
        <span class="tt-icons" aria-hidden="true">${SUN}${MOON}</span>
        <span class="tt-knob" aria-hidden="true">${dark ? MOON : SUN}</span>
      </button>`;
  }

  // Un seul écouteur pour tous les boutons (ils sont recréés à chaque page)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const dark = !isDark();
    const apply = () => (document.documentElement.dataset.theme = dark ? 'dark' : 'light');
    if (document.startViewTransition && !FX.reduced()) {
      const r = btn.getBoundingClientRect();
      document.documentElement.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
      document.documentElement.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
      document.startViewTransition(apply);
    } else apply();
    try {
      localStorage.setItem('arena.theme', dark ? 'dark' : 'light');
    } catch {}
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-checked', dark);
      b.title = dark ? 'Passer en mode clair' : 'Passer en mode sombre';
      b.querySelector('.tt-knob').innerHTML = dark ? MOON : SUN;
    });
  });

  /* ---------------- Messages de confirmation (en bas de l'écran) ---------------- */
  const toasts = document.getElementById('toasts');
  function toast(message, kind = 'ok') {
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-icon" aria-hidden="true">${kind === 'error' ? '!' : '✓'}</span><span></span>`;
    el.lastChild.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('hide'), 2600);
    setTimeout(() => el.remove(), 3000);
  }

  /* ---------------- Fenêtre de confirmation ----------------
     Remplace confirm() du navigateur, bloqué dans certains aperçus (il répond « Annuler » sans s'afficher). */
  const confirmDialog = document.getElementById('confirmDialog');

  function askConfirm({ title, message, ok = 'Confirmer', danger = false }) {
    return new Promise((resolve) => {
      confirmDialog.innerHTML = `
        <form class="dlg" method="dialog">
          <h2 class="dlg-title">${esc(title)}</h2>
          ${message ? `<p class="muted">${esc(message)}</p>` : ''}
          <div class="dlg-actions">
            <button type="submit" value="ok" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}">${esc(ok)}</button>
            <button type="submit" value="cancel" class="btn btn-ghost">Annuler</button>
          </div>
        </form>`;
      confirmDialog.onclose = () => resolve(confirmDialog.returnValue === 'ok');
      confirmDialog.returnValue = 'cancel'; // Échap = Annuler
      confirmDialog.showModal();
      confirmDialog.querySelector('[value="cancel"]').focus(); // par sécurité, Annuler a le focus
    });
  }

  const askDelete = (t) =>
    askConfirm({
      title: `Supprimer « ${t.name} » ?`,
      message: 'Le tournoi, ses matchs et ses résultats seront effacés définitivement.',
      ok: 'Supprimer',
      danger: true,
    });

  /* ---------------- Routage ---------------- */

  function router() {
    app.onclick = null;
    app.oninput = null;
    app.onchange = null;
    if (dialog.open) dialog.close();
    if (confirmDialog.open) confirmDialog.close();
    const shareDlg = document.getElementById('shareDialog');
    if (shareDlg && shareDlg.open) shareDlg.close();
    if (typeof Guide !== 'undefined') Guide.close();
    if (typeof Tour !== 'undefined' && Tour.isOpen() && !location.hash.startsWith('#/new')) Tour.end();
    const editDialog = document.getElementById('editDialog');
    if (editDialog.open) editDialog.close();
    const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
    if (view === 'new') {
      const did = id ? decodeURIComponent(id) : null;
      renderCreate(did ? (homeDomain && homeDomain.id === did ? homeDomain : Disciplines.get(did)) : null);
    }
    else if (view === 't' && id) renderTournament(id);
    else if (view === 'share' && id) renderShared(id);
    else renderHome();
    window.scrollTo(0, 0);
    // Animation d'arrivée, seulement quand on change de page (pas à chaque score saisi)
    const page = app.querySelector('.page');
    if (page) page.classList.add('page-enter');
  }

  /* ---------------- Accueil ---------------- */

  function domainComboHTML(id, label, placeholder) {
    return `
      <div class="field"><span class="label" id="${id}Label">${label}</span>
        <div class="combo" id="${id}Combo">
          <span class="combo-icon">${ICON.search}</span>
          <input class="input combo-input" name="${id}" placeholder="${placeholder}" maxlength="60"
            autocomplete="off" role="combobox" aria-labelledby="${id}Label" aria-expanded="false" aria-controls="${id}List" aria-autocomplete="list">
          <button type="button" class="combo-toggle" tabindex="-1" aria-label="Afficher la liste des sports et jeux vidéo">${ICON.chevron}</button>
          <ul class="combo-list" id="${id}List" role="listbox" aria-labelledby="${id}Label" hidden></ul>
        </div>
      </div>`;
  }

  // Filtres de l'accueil (gardés en mémoire pendant la visite)
  const homeFilter = { query: '', status: 'all' };

  // Avancement d'un tournoi : matchs terminés / matchs à jouer
  function progress(t) {
    const ms = t.type === 'elim' ? T.allMatches(t).filter((m) => m.status !== 'bye') : t.days.flatMap((d) => d.matches);
    return { done: ms.filter((m) => m.status === 'done').length, total: ms.length };
  }

  function progressHTML(t) {
    const p = progress(t);
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return `
      <div class="progress" title="${p.done} match(s) joué(s) sur ${p.total}">
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <span class="progress-text">${p.done} / ${p.total} matchs</span>
      </div>`;
  }

  function renderHome() {
    const all = Store.all();
    // Sur ordinateur, le bouton « Créer » est dans la barre du haut ; sur mobile, en bas de l'écran
    app.innerHTML = `
      <div class="page page-home">
        <header class="topbar">
          ${brandHTML()}
          <div class="topbar-right">
            <a class="btn btn-primary topbar-cta only-desktop" data-create href="#/new">${ICON.plus}<span>Créer un tournoi</span></a>
            ${themeToggleHTML()}
          </div>
        </header>
        ${
          all.length
            ? `<div class="home-head">
                 <h1 class="h1">Mes tournois</h1>
                 <div class="home-filter">${domainComboHTML('homeDomain', 'Domaine', 'Tous les sports et jeux vidéo')}</div>
               </div>
               <div class="home-toolbar">
                 <div class="search-box">
                   <span class="combo-icon">${ICON.search}</span>
                   <input class="input search-input" id="homeSearch" type="search" placeholder="Rechercher un tournoi, un lieu, une équipe…" value="${esc(homeFilter.query)}" aria-label="Rechercher un tournoi">
                 </div>
                 <div class="chips" id="statusChips" role="group" aria-label="Filtrer par état"></div>
               </div>
               <div id="homeList" class="cards"></div>`
            : `<div class="welcome">
                 <h1 class="h1">Organise ton prochain tournoi</h1>
                 <p class="lead">Sport ou jeux vidéo, en quelques minutes.</p>
               </div>
               <ol class="steps">
                 <li><button type="button" class="step-btn" data-guide="0"><b>1. Crée le tournoi</b><span>Choisis le sport ou le jeu, le lieu, le format (éliminatoire ou championnat) et les équipes.</span><em>Voir le guide →</em></button></li>
                 <li><button type="button" class="step-btn" data-guide="1"><b>2. Saisis les scores</b><span>Clique sur un match : boutons + / −, ½ et Max. Le gagnant avance tout seul.</span><em>Voir le guide →</em></button></li>
                 <li><button type="button" class="step-btn" data-guide="2"><b>3. Suis le classement</b><span>Tableau, classement et podium se mettent à jour en direct.</span><em>Voir le guide →</em></button></li>
               </ol>
               <a class="btn btn-primary btn-lg start-btn" href="#/new" data-tour-start>${ICON.plus}Créer mon premier tournoi</a>
               ${tourHidden() ? '' : '<p class="helper start-hint">Un petit tutoriel te guidera pas à pas.</p>'}`
        }
        <div class="home-footer">
          <button type="button" class="btn btn-ghost btn-sm" data-action="export" ${all.length ? '' : 'disabled'}>${ICON.download}Sauvegarder mes tournois</button>
          <label class="btn btn-ghost btn-sm file-btn">${ICON.upload}Restaurer une sauvegarde<input type="file" accept="application/json,.json" id="importFile" hidden></label>
        </div>
        ${all.length ? `<a class="btn btn-primary btn-lg sticky-bottom only-mobile" data-create href="#/new">${ICON.plus}<span>Créer un tournoi</span></a>` : ''}
      </div>`;

    const listEl = app.querySelector('#homeList');

    function matchesQuery(t, q) {
      if (!q) return true;
      const hay = [t.name, t.location, t.venue, domainLabel(t), ...t.teams.map((x) => x.name)].join(' ');
      return Disciplines.norm(hay).includes(q);
    }

    function renderList() {
      app.querySelectorAll('[data-create]').forEach((a) => {
        a.href = homeDomain ? `#/new/${encodeURIComponent(homeDomain.id)}` : '#/new';
        a.querySelector('span').textContent = homeDomain ? `Créer un tournoi de ${homeDomain.name}` : 'Créer un tournoi';
      });
      if (!listEl) return;
      const q = Disciplines.norm(homeFilter.query.trim());
      const base = all.filter((t) => (!homeDomain || (t.discipline && t.discipline.id === homeDomain.id)) && matchesQuery(t, q));
      const count = { all: base.length, live: 0, upcoming: 0, done: 0 };
      base.forEach((t) => count[T.status(t)]++);
      const labels = { all: 'Tous', live: 'En cours', upcoming: 'À venir', done: 'Terminés' };
      app.querySelector('#statusChips').innerHTML = Object.keys(labels)
        .map((k) => `<button type="button" class="chip-btn ${homeFilter.status === k ? 'active' : ''}" data-status="${k}" aria-pressed="${homeFilter.status === k}">${labels[k]} <span>${count[k]}</span></button>`)
        .join('');
      // En cours d'abord, puis à venir, puis terminés
      const order = { live: 0, upcoming: 1, done: 2 };
      const list = base
        .filter((t) => homeFilter.status === 'all' || T.status(t) === homeFilter.status)
        .sort((x, y) => order[T.status(x)] - order[T.status(y)] || y.createdAt - x.createdAt);
      listEl.innerHTML = list.length
        ? list.map((t, i) => tournamentCard(t).replace('<article class="t-card"', `<article class="t-card" style="--i:${Math.min(i, 8)}"`)).join('')
        : `<div class="empty">
             <strong>Aucun tournoi ne correspond</strong>
             <span>Change la recherche ou les filtres.</span>
           </div>`;
    }

    if (all.length) {
      // Menu Domaine : « Tous » + tous les sports et jeux vidéo, avec recherche
      const combo = setupDomainCombo(app.querySelector('#homeDomainCombo'), {
        withAll: true,
        current: () => homeDomain,
        onChoose: (it) => {
          homeDomain = it.discipline;
          renderList();
        },
      });
      combo.input.value = homeDomain ? homeDomain.name : '';
      app.querySelector('#homeSearch').addEventListener('input', (e) => {
        homeFilter.query = e.target.value;
        renderList();
      });
    }
    renderList();

    // Restaurer une sauvegarde (fichier .json)
    app.querySelector('#importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      let list;
      try {
        list = JSON.parse(await file.text());
        if (!Array.isArray(list)) list = [list];
        list = list.filter((t) => t && t.id && t.name && Array.isArray(t.teams) && (t.rounds || t.days));
      } catch {
        list = [];
      }
      if (!list.length) return toast('Ce fichier n’est pas une sauvegarde NexCup valide.', 'error');
      const existing = new Set(Store.all().map((t) => t.id));
      const replaced = list.filter((t) => existing.has(t.id)).length;
      const ok = await askConfirm({
        title: `Restaurer ${list.length} tournoi${list.length > 1 ? 's' : ''} ?`,
        message: replaced
          ? `${replaced} tournoi(s) déjà présent(s) seront remplacés par la version de la sauvegarde.`
          : 'Ils seront ajoutés à tes tournois.',
        ok: 'Restaurer',
      });
      if (!ok) return;
      list.forEach((t) => Store.save(t));
      toast(`${list.length} tournoi${list.length > 1 ? 's' : ''} restauré${list.length > 1 ? 's' : ''}`);
      renderHome();
    });

    app.onclick = async (e) => {
      const step = e.target.closest('[data-guide]');
      if (step) return Guide.open(+step.dataset.guide); // guide animé de l'étape
      const chip = e.target.closest('[data-status]');
      if (chip) {
        homeFilter.status = chip.dataset.status;
        return renderList();
      }
      if (e.target.closest('[data-action="export"]')) {
        downloadJSON(Store.all(), `nexcup-tournois-${todayIso()}.json`);
        return toast('Sauvegarde téléchargée');
      }
      const b = e.target.closest('[data-action="delete-card"]');
      if (!b) return;
      const t = Store.get(b.dataset.id);
      if (t && (await askDelete(t))) {
        const card = b.closest('.t-card');
        if (card && !FX.reduced()) {
          card.classList.add('fx-leave');
          await new Promise((res) => setTimeout(res, 450));
        }
        Store.remove(t.id);
        delete ui[t.id];
        toast(`« ${t.name} » supprimé`);
        renderHome();
      }
    };
  }

  function downloadJSON(data, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function kv(label, value) {
    return `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function tournamentCard(t) {
    const s = T.status(t);
    const w = T.winner(t);
    return `
      <article class="t-card">
        <div class="t-card-head"><h2>${esc(t.name)}</h2><span class="badge badge-${s}">${STATUS[s]}</span></div>
        <div class="divider"></div>
        ${t.discipline ? kv('Domaine', domainLabel(t)) : ''}
        ${kv('Lieu', t.location || '—')}
        ${t.venue ? kv('Salle / stade', t.venue) : ''}
        ${kv('Date', fmtDate(t.date))}
        ${kv(W(t).Many, countLabel(t, t.teams.length))}
        ${kv('Format', formatLabel(t))}
        ${t.reward ? kv('Récompense', t.reward) : ''}
        ${w !== null ? kv('Vainqueur', teamName(t, w)) : ''}
        ${progressHTML(t)}
        <div class="t-card-actions">
          <a class="btn btn-outline" href="#/t/${t.id}">Voir le tournoi</a>
          ${s === 'done' ? `<button type="button" class="btn btn-danger" data-action="delete-card" data-id="${t.id}" aria-label="Supprimer ${esc(t.name)}">${ICON.trash}Supprimer</button>` : ''}
        </div>
      </article>`;
  }

  /* ---------------- Création ---------------- */

  function renderCreate(preset) {
    const st = { bo: 3, type: 'elim', count: 8, names: [], discipline: null, entrant: 'team' };

    app.innerHTML = `
      <div class="page page-create">
        <header class="topbar">
          <span class="title-lg">Nouveau tournoi</span>
          <div class="topbar-right">
            <button type="button" class="help-btn" data-tour-start title="Revoir le tutoriel" aria-label="Revoir le tutoriel">?</button>
            ${themeToggleHTML()}
            <a href="#/" class="icon-link" aria-label="Fermer">${ICON.close}</a>
          </div>
        </header>
        <form id="createForm" class="form form-create" novalidate>
          <section class="form-col">
          <h2 class="form-section">Informations</h2>
          <label class="field"><span class="label">Nom du tournoi</span>
            <input class="input" name="tname" placeholder="Coupe de Poitiers" maxlength="60" autocomplete="off"></label>
          ${domainComboHTML('domain', 'Domaine (sport ou jeu vidéo)', 'Football, pétanque, Rocket League…')}
          <div class="field" id="robloxField" hidden><span class="label" id="robloxLabel">Jeu Roblox</span>
            <div class="combo" id="robloxCombo">
              <span class="combo-icon">${ICON.search}</span>
              <input class="input combo-input" name="roblox" placeholder="Rechercher un jeu Roblox…" maxlength="80"
                autocomplete="off" role="combobox" aria-labelledby="robloxLabel" aria-expanded="false" aria-controls="robloxList" aria-autocomplete="list">
              <button type="button" class="combo-toggle" tabindex="-1" aria-label="Afficher la liste des jeux Roblox">${ICON.chevron}</button>
              <ul class="combo-list" id="robloxList" role="listbox" aria-labelledby="robloxLabel" hidden></ul>
            </div>
          </div>
          <div id="limitBlock" class="limit-block" hidden>
            <label class="field"><span class="label" id="limitLabel">Limite de points par match</span>
              <div class="limit-row">
                <input class="input" type="number" name="maxPoints" min="1" max="100000" inputmode="numeric" placeholder="Sans limite">
                <span class="limit-unit" id="limitUnit"></span>
              </div>
            </label>
            <label class="check check-sm"><input type="checkbox" name="winBy2">
              <span class="check-label">2 points d’écart pour gagner</span><span class="check-hint" id="winBy2Hint"></span></label>
            <p class="helper" id="limitHelp"></p>
          </div>
          <div class="field"><span class="label" id="locLabel">Lieu</span>
            <div class="combo" id="locCombo">
              <span class="combo-icon">${ICON.search}</span>
              <input class="input combo-input" name="location" placeholder="Ville, village, région, code postal…" maxlength="80"
                autocomplete="off" role="combobox" aria-labelledby="locLabel" aria-expanded="false" aria-controls="locList" aria-autocomplete="list">
              <button type="button" class="combo-toggle" tabindex="-1" aria-label="Afficher la liste des lieux">${ICON.chevron}</button>
              <ul class="combo-list" id="locList" role="listbox" aria-labelledby="locLabel" hidden></ul>
            </div>
          </div>
          <div class="field" id="venueField" hidden><span class="label" id="venueLabel">Salle ou stade</span>
            <div class="combo" id="venueCombo">
              <span class="combo-icon">${ICON.search}</span>
              <input class="input combo-input" name="venue" placeholder="Salle, gymnase, stade… (facultatif)" maxlength="100"
                autocomplete="off" role="combobox" aria-labelledby="venueLabel" aria-expanded="false" aria-controls="venueList" aria-autocomplete="list">
              <button type="button" class="combo-toggle" tabindex="-1" aria-label="Afficher la liste des salles et stades">${ICON.chevron}</button>
              <ul class="combo-list" id="venueList" role="listbox" aria-labelledby="venueLabel" hidden></ul>
            </div>
          </div>
          <div class="field"><span class="label">Le tournoi oppose des…</span>
            <div class="segmented" data-name="entrant">
              <button type="button" data-value="team" class="active">Équipes</button>
              <button type="button" data-value="player">Participants (joueurs seuls)</button>
            </div>
          </div>
          <div class="row2">
            <label class="field"><span class="label">Date</span>
              <input class="input" type="date" name="date" value="${todayIso()}"></label>
            <label class="field"><span class="label" id="countLabel">Nombre d’équipes</span>
              <input class="input" type="number" name="count" min="2" max="${MAX_TEAMS}" value="${st.count}"></label>
          </div>
          <label class="field"><span class="label">Récompenses</span>
            <input class="input" name="reward" placeholder="Cagnotte 500 €" maxlength="80"></label>
          </section>

          <section class="form-col">
          <h2 class="form-section" id="teamsSection">Format et équipes</h2>
          <div class="field" id="boField"><span class="label" id="boLabel">Format des matchs</span>
            <div class="segmented" data-name="bo">
              <button type="button" data-value="1">Bo1</button>
              <button type="button" data-value="3" class="active">Bo3</button>
              <button type="button" data-value="5">Bo5</button>
            </div>
          </div>
          <div class="field"><span class="label">Type de tournoi</span>
            <div class="segmented" data-name="type">
              <button type="button" data-value="elim" class="active">Éliminatoire</button>
              <button type="button" data-value="league">Championnat</button>
            </div>
          </div>

          <div id="leagueOpts" hidden>
            <label class="check"><input type="checkbox" name="homeAway" checked>
              <span class="check-label">Matchs aller et retour</span><span class="check-hint" id="daysHint"></span></label>
            <div class="field"><span class="label">Points au classement</span>
              <div class="points-row">
                <label><span>Victoire</span><input class="input" type="number" name="pWin" min="0" max="99" value="${T.POINTS.win}"></label>
                <label><span>Égalité</span><input class="input" type="number" name="pDraw" min="0" max="99" value="${T.POINTS.draw}"></label>
                <label><span>Défaite</span><input class="input" type="number" name="pLoss" min="0" max="99" value="${T.POINTS.loss}"></label>
              </div>
              <div class="chips" id="pointsPresets">
                <button type="button" class="chip-btn" data-preset="5,2,0">5 / 2 / 0</button>
                <button type="button" class="chip-btn" data-preset="3,1,0">3 / 1 / 0 (football)</button>
                <button type="button" class="chip-btn" data-preset="2,1,0">2 / 1 / 0</button>
              </div>
            </div>
          </div>
          <div id="elimOpts">
            <label class="check"><input type="checkbox" name="thirdPlace">
              <span class="check-label">Match pour la 3e place</span><span class="check-hint">entre les perdants des demi-finales</span></label>
          </div>

          <label class="check"><input type="checkbox" name="random">
            <span class="check-label" id="randomLabel">Équipes aléatoires</span><span class="check-hint" id="randomHint"></span></label>

          <div class="field"><span class="label" id="namesLabel">Noms des équipes</span>
            <div class="team-tools">
              <span class="counter" id="teamCounter"></span>
              <button type="button" class="btn btn-ghost btn-sm" data-team-tool="paste">Coller une liste</button>
              <button type="button" class="btn btn-ghost btn-sm" data-team-tool="clear">Vider</button>
            </div>
            <div class="paste-box" id="pasteBox" hidden>
              <textarea class="input textarea" id="pasteArea" rows="6" placeholder="Une équipe par ligne (ou séparées par des virgules)&#10;Wolves&#10;Corsaires&#10;Vortex"></textarea>
              <div class="paste-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-team-tool="paste-cancel">Annuler</button>
                <button type="button" class="btn btn-primary btn-sm" data-team-tool="paste-apply">Utiliser cette liste</button>
              </div>
            </div>
            <div class="team-list" id="teamList"></div>
          </div>
          </section>

          <div class="form-footer">
            <p class="error" id="formError" hidden></p>
            <button type="submit" class="btn btn-primary btn-lg">Créer le tournoi</button>
          </div>
        </form>
      </div>`;

    const form = app.querySelector('#createForm');
    const field = (name) => form.elements.namedItem(name);
    const teamList = form.querySelector('#teamList');

    function syncNames() {
      teamList.querySelectorAll('input').forEach((inp, i) => (st.names[i] = inp.value));
    }

    function renderTeams() {
      syncNames();
      teamList.innerHTML = Array.from(
        { length: st.count },
        (_, i) => `
          <label class="team-row" style="--i:${Math.min(i, 20)}"><span>${WORDS[st.entrant].One} ${i + 1} :</span>
            <input class="input input-sm" placeholder="${WORDS[st.entrant].placeholder}" maxlength="40" value="${esc(st.names[i] || '')}"></label>`
      ).join('');
      updateCounter();
    }

    function updateCounter() {
      const filled = [...teamList.querySelectorAll('input')].filter((i) => i.value.trim()).length;
      form.querySelector('#teamCounter').textContent =
        `${filled} / ${st.count} ${WORDS[st.entrant].many} ${WORDS[st.entrant].entered}` + (filled < st.count ? ` — les cases vides seront nommées « ${WORDS[st.entrant].One} N »` : '');
    }

    // Équipes ou participants : libellés du formulaire
    function applyEntrant() {
      const w = WORDS[st.entrant];
      form.querySelector('#countLabel').textContent = `Nombre ${st.entrant === 'player' ? 'de participants' : 'd’équipes'}`;
      form.querySelector('#teamsSection').textContent = `Format et ${w.many}`;
      form.querySelector('#namesLabel').textContent = `Noms des ${w.many}`;
      form.querySelector('#randomLabel').textContent = `${w.Many} aléatoires`;
      pasteArea.placeholder = `Un ${st.entrant === 'player' ? 'participant' : 'nom d’équipe'} par ligne (ou séparés par des virgules)\n${w.examples.replace(/&#10;/g, '\n')}`;
      syncNames();
      teamList.innerHTML = '';
      renderTeams();
    }

    function updateHints() {
      form.querySelector('#leagueOpts').hidden = st.type !== 'league';
      form.querySelector('#elimOpts').hidden = st.type !== 'elim';
      field('thirdPlace').disabled = st.count < 4;
      const perPhase = st.count % 2 === 0 ? st.count - 1 : st.count;
      const total = perPhase * (field('homeAway').checked ? 2 : 1);
      form.querySelector('#daysHint').textContent = `${total} journée${total > 1 ? 's' : ''}`;
      form.querySelector('#randomHint').textContent = field('random').checked ? 'Tirage au sort' : 'Ordre de saisie';
    }

    // Outils de la liste d'équipes : coller une liste, vider
    const pasteBox = form.querySelector('#pasteBox');
    const pasteArea = form.querySelector('#pasteArea');
    form.addEventListener('click', (e) => {
      const tool = e.target.closest('[data-team-tool]');
      if (!tool) return;
      const what = tool.dataset.teamTool;
      if (what === 'paste') {
        syncNames();
        pasteArea.value = st.names.slice(0, st.count).filter((n) => n.trim()).join('\n');
        pasteBox.hidden = false;
        pasteArea.focus();
      } else if (what === 'paste-cancel') {
        pasteBox.hidden = true;
      } else if (what === 'paste-apply') {
        const list = pasteArea.value.split(/[\n,;\t]+/).map((x) => x.trim()).filter(Boolean).slice(0, MAX_TEAMS);
        if (list.length < 2) return toast(`Il faut au moins 2 ${WORDS[st.entrant].many}.`, 'error');
        st.names = list;
        st.count = list.length;
        field('count').value = st.count;
        teamList.innerHTML = ''; // évite que syncNames écrase la liste collée
        renderTeams();
        updateHints();
        pasteBox.hidden = true;
        FX.mark(teamList, 'fx-cascade');
        toast(`${list.length} ${WORDS[st.entrant].many} ${WORDS[st.entrant].added}`);
      } else if (what === 'clear') {
        st.names = [];
        teamList.innerHTML = '';
        renderTeams();
      }
    });
    // Barèmes de points prédéfinis
    form.querySelector('#pointsPresets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset]');
      if (!b) return;
      const [w, d, l] = b.dataset.preset.split(',');
      field('pWin').value = w;
      field('pDraw').value = d;
      field('pLoss').value = l;
    });

    form.addEventListener('click', (e) => {
      const b = e.target.closest('.segmented button');
      if (!b) return;
      const seg = b.parentElement;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      st[seg.dataset.name] = seg.dataset.name === 'bo' ? Number(b.dataset.value) : b.dataset.value;
      if (seg.dataset.name === 'entrant') applyEntrant();
      updateHints();
    });

    form.addEventListener('input', (e) => {
      if (e.target.name === 'count') {
        const v = parseInt(e.target.value, 10);
        if (v >= 2 && v <= MAX_TEAMS) {
          st.count = v;
          renderTeams();
          updateHints();
        }
      } else if (teamList.contains(e.target)) {
        updateCounter();
      }
    });

    form.addEventListener('change', (e) => {
      if (e.target.name === 'count') {
        let v = parseInt(e.target.value, 10);
        if (Number.isNaN(v)) v = 8;
        v = Math.min(MAX_TEAMS, Math.max(2, v));
        e.target.value = v;
        st.count = v;
        renderTeams();
      }
      updateHints();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      syncNames();
      const errorEl = form.querySelector('#formError');
      const fail = (msg) => {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };

      const name = field('tname').value.trim();
      if (!name) return fail('Donne un nom à ton tournoi.');

      const names = Array.from({ length: st.count }, (_, i) => (st.names[i] || '').trim() || `${WORDS[st.entrant].One} ${i + 1}`);
      const lower = names.map((n) => n.toLowerCase());
      const dup = names.find((n, i) => lower.indexOf(n.toLowerCase()) !== i);
      if (dup) return fail(`Le nom « ${dup} » est utilisé deux fois.`);

      const d = st.discipline;
      const pts = !!d && d.mode === 'pts';
      const maxPoints = pts ? parseInt(field('maxPoints').value, 10) || null : null;
      if (maxPoints !== null && maxPoints < 1) return fail('La limite de points doit être d’au moins 1.');
      const winBy2 = pts && field('winBy2').checked;
      if (winBy2 && maxPoints === null) return fail('Avec la règle des 2 points d’écart, indique le score à atteindre (ex. 11).');

      const t = T.create({
        name,
        entrant: st.entrant,
        discipline: d,
        subGame: d && d.id === ROBLOX_ID ? field('roblox').value.trim() : '',
        scoreMode: pts ? 'pts' : 'sets',
        unit: d ? d.unit : 'manches',
        maxPoints,
        winBy2,
        hardCap: winBy2 && d.winBy2 && maxPoints === d.max ? d.hardCap : null, // plafond (badminton : 30) si la cible n'a pas changé
        location: field('location').value.trim(),
        venue: commune ? field('venue').value.trim() : '',
        date: field('date').value,
        reward: field('reward').value.trim(),
        bo: pts ? 1 : st.bo,
        type: st.type,
        random: field('random').checked,
        homeAway: field('homeAway').checked,
        points: {
          win: Math.max(0, parseInt(field('pWin').value, 10) || 0),
          draw: Math.max(0, parseInt(field('pDraw').value, 10) || 0),
          loss: Math.max(0, parseInt(field('pLoss').value, 10) || 0),
        },
        thirdPlace: field('thirdPlace').checked,
        teamNames: names,
      });
      Store.save(t);
      // Animation de création, puis arrivée directe sur le tournoi (sans la transition de page)
      const sub = [domainLabel(t), countLabel(t, t.teams.length), t.type === 'elim' ? 'Éliminatoire' : 'Championnat'].filter(Boolean).join(' · ');
      freshlyCreated.add(t.id);
      CreateAnim.play({ name: t.name, sub, teams: t.teams.map((x) => x.name) }, () => {
        skipNextTransition = true;
        location.hash = `#/t/${t.id}`;
        toast('Tournoi créé ! Clique sur un match pour saisir le score.');
      });
    });

    renderTeams();
    updateHints();

    // Domaine : règle la façon de compter le score (limite de points ou format Bo)
    const robloxField = form.querySelector('#robloxField');
    const limitBlock = form.querySelector('#limitBlock');
    function applyDiscipline(d) {
      st.discipline = d;
      const isRoblox = !!d && d.id === ROBLOX_ID;
      if (!isRoblox) field('roblox').value = '';
      robloxField.hidden = !isRoblox;
      const pts = !!d && d.mode === 'pts';
      form.querySelector('#boField').hidden = pts;
      limitBlock.hidden = !pts;
      form.querySelector('#boLabel').textContent = d ? `Format des matchs (en ${d.unit} gagnés)`.replace(/(manches|parties) gagnés/, '$1 gagnées') : 'Format des matchs';
      if (pts) {
        field('maxPoints').value = d.max ?? '';
        field('winBy2').checked = !!d.winBy2;
        form.querySelector('#limitUnit').textContent = d.unit;
        updateLimitTexts();
      }
    }

    // Textes du bloc « limite » selon que la règle des 2 points d'écart est cochée ou non
    function updateLimitTexts() {
      const d = st.discipline;
      if (!d || d.mode !== 'pts') return;
      const by2 = field('winBy2').checked;
      const target = parseInt(field('maxPoints').value, 10);
      form.querySelector('#limitLabel').textContent = by2 ? 'Score à atteindre pour gagner' : 'Limite de points par match';
      field('maxPoints').placeholder = by2 ? 'ex. 11' : 'Sans limite';
      form.querySelector('#winBy2Hint').textContent = by2 && target > 1
        ? `ex. ${target}–${target - 2}, ${target + 1}–${target - 1}, ${target + 2}–${target}…` + (d.hardCap && target === d.max ? ` (max ${d.hardCap})` : '')
        : '';
      form.querySelector('#limitHelp').innerHTML = (by2
        ? `Le match continue tant qu’une équipe n’a pas <b>2 ${esc(d.unit)} d’écart</b> : à ${target - 1 || 'X'}–${target - 1 || 'X'}, il faut aller à ${target + 1 || 'X+1'}–${target - 1 || 'X'}, etc.`
        : d.max && parseInt(field('maxPoints').value, 10) === d.max
          ? `Limite conseillée pour <b>${esc(d.name)}</b> : ${d.max} ${esc(d.unit)}. Tu peux la modifier.`
          : 'Choisis la limite de points d’une équipe par match (laisse vide pour aucune limite).') +
        ' Pendant les matchs, les boutons <b>½</b> et <b>Max</b> ajoutent la moitié des points ou mettent le score gagnant.';
    }
    form.addEventListener('input', (e) => {
      if (e.target.name === 'maxPoints') updateLimitTexts();
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'winBy2') {
        // Cocher la règle sans score cible : on propose une valeur courante
        if (e.target.checked && !field('maxPoints').value) field('maxPoints').value = Disciplines.suggestedTarget(st.discipline.name);
        updateLimitTexts();
      }
    });

    // Jeu Roblox choisi : si c'est un jeu de volley / ping-pong…, on active la règle des 2 points d'écart
    function applyRobloxGame(name) {
      if (!st.discipline || st.discipline.id !== ROBLOX_ID) return;
      if (Disciplines.suggestsWinBy2(name)) {
        field('winBy2').checked = true;
        field('maxPoints').value = Disciplines.suggestedTarget(name);
      }
      updateLimitTexts();
    }
    const domain = setupDomainCombo(form.querySelector('#domainCombo'), {
      current: () => st.discipline,
      onChoose: (it) => applyDiscipline(it.discipline),
    });
    domain.input.addEventListener('input', () => {
      if (st.discipline && domain.input.value !== st.discipline.name) applyDiscipline(null);
    });
    setupRobloxCombo(form.querySelector('#robloxCombo'), (it) => applyRobloxGame(it.value));
    if (preset) {
      domain.input.value = preset.name;
      applyDiscipline(preset);
    }

    // Le champ « Salle ou stade » apparaît une fois une commune choisie dans Lieu
    let commune = null;
    const venueField = form.querySelector('#venueField');
    const venue = setupVenueCombo(form.querySelector('#venueCombo'), () => commune);
    setupLocationCombo(form.querySelector('#locCombo'), (c) => {
      const same = c && commune && c.name === commune.name && c.dept === commune.dept;
      if (!same) venue.input.value = '';
      commune = c;
      venueField.hidden = !c;
      if (c) form.querySelector('#venueLabel').textContent = `Salle ou stade à ${c.name}`;
    });

    if (pendingTour) {
      pendingTour = false;
      setTimeout(startCreateTour, 800); // après la transition et l'animation d'arrivée de la page
    }
  }

  /* ---------------- Tutoriel de création ---------------- */
  let pendingTour = false;
  const fieldOf = (sel) => () => document.querySelector(sel)?.closest('.field, .check, .form-footer');

  function startCreateTour() {
    if (!document.getElementById('createForm')) return;
    Tour.start(
      [
        { target: fieldOf('[name="tname"]'), title: 'Bienvenue sur NexCup 👋', text: 'Commence par donner un <b>nom</b> à ton tournoi, par exemple « Coupe de Poitiers ».' },
        { target: fieldOf('#domainCombo'), title: 'Le sport ou le jeu', text: 'Cherche ton <b>sport ou jeu vidéo</b>. NexCup règle tout seul la façon de compter les points (limite, 2 points d’écart…).' },
        { target: fieldOf('#locCombo'), title: 'Le lieu', text: 'Tape une <b>ville, un village ou un code postal</b>. Tu pourras ensuite choisir la salle ou le stade.' },
        { target: fieldOf('[data-name="entrant"]'), title: 'Équipes ou joueurs ?', text: 'Indique si le tournoi oppose des <b>équipes</b> ou des <b>participants seuls</b>.' },
        { target: fieldOf('[name="count"]'), title: 'Combien sont-ils ?', text: 'Choisis le <b>nombre d’inscrits</b> (de 2 à 64). La liste des noms s’adapte.' },
        { target: fieldOf('[data-name="type"]'), title: 'Le format', text: '<b>Éliminatoire</b> : le perdant sort, jusqu’à la finale.<br><b>Championnat</b> : tout le monde se rencontre, avec un classement.' },
        { target: fieldOf('#teamList'), title: 'Les noms', text: 'Écris les noms un par un, ou clique sur <b>« Coller une liste »</b> pour tout ajouter d’un coup. Les cases vides sont nommées automatiquement.' },
        { target: fieldOf('#createForm [type="submit"]'), title: 'C’est prêt !', text: 'Clique sur <b>« Créer le tournoi »</b>. Ensuite, clique sur un match pour saisir le score : le gagnant avance tout seul.' },
      ],
      {
        optOut: {
          label: 'Ne plus afficher ce tutoriel',
          checked: tourHidden(),
          onChange: (hide) => {
            try {
              if (hide) localStorage.setItem(TOUR_KEY, '1');
              else localStorage.removeItem(TOUR_KEY);
            } catch {}
          },
        },
      }
    );
  }

  // « Ne plus afficher » : mémorisé dans le navigateur (le bouton « ? » permet toujours de le revoir)
  const TOUR_KEY = 'arena.tourHidden';
  function tourHidden() {
    try {
      return localStorage.getItem(TOUR_KEY) === '1';
    } catch {
      return false;
    }
  }

  // « Créer mon premier tournoi » et le bouton « ? » lancent le tutoriel
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tour-start]');
    if (!btn) return;
    if (document.getElementById('createForm')) startCreateTour(); // bouton « ? » : toujours
    else if (!tourHidden()) pendingTour = true; // « Créer mon premier tournoi » : sauf si « Ne plus afficher »
  });

  /* ---------------- Menus déroulants avec recherche (Lieu, Salle ou stade) ---------------- */

  // Composant générique : `source(query, show)` appelle show(groupes, message) une ou plusieurs fois,
  // chaque groupe étant { label, items: [{ label, sub, value }] }.
  function createCombo(combo, { source, emptyText, onChoose, idPrefix }) {
    const input = combo.querySelector('input');
    const list = combo.querySelector('.combo-list');
    let items = [];
    let active = -1;
    let seq = 0;

    function open() {
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function show(groups, status) {
      items = groups.flatMap((g) => g.items);
      active = items.length && input.value.trim() ? 0 : -1;
      let i = 0;
      const opt = (it) => `
        <li class="combo-opt" role="option" id="${idPrefix}-opt-${i}" data-i="${i++}">
          <span class="combo-opt-label">${esc(it.label)}</span><span class="combo-opt-sub">${esc(it.sub || '')}</span>
        </li>`;
      list.innerHTML =
        groups
          .filter((g) => g.items.length)
          .map((g) => `<li class="combo-group" role="presentation">${esc(g.label)}</li>${g.items.map(opt).join('')}`)
          .join('') +
        (status ? `<li class="combo-status" role="presentation">${esc(status)}</li>` : '') +
        (!items.length && !status ? `<li class="combo-status" role="presentation">${esc(emptyText)}</li>` : '');
      highlight();
      open();
    }

    function highlight() {
      list.querySelectorAll('.combo-opt').forEach((li) => li.classList.toggle('active', +li.dataset.i === active));
      const el = list.querySelector(`[data-i="${active}"]`);
      if (el) {
        input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }

    function choose(i) {
      const it = items[i];
      if (!it) return;
      input.value = it.value;
      close();
      if (onChoose) onChoose(it);
    }

    function search() {
      const mySeq = ++seq;
      const q = input.value;
      // On ignore les réponses d'une ancienne recherche (l'utilisateur a continué de taper)
      source(q, (groups, status) => {
        if (mySeq === seq && document.activeElement === input) show(groups, status);
      });
    }

    input.addEventListener('focus', search);
    input.addEventListener('input', search);
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) return search();
        if (!items.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        highlight();
      } else if (e.key === 'Enter' && !list.hidden) {
        e.preventDefault(); // ne pas envoyer le formulaire
        if (active >= 0) choose(active);
        else close();
      } else if (e.key === 'Escape' && !list.hidden) {
        e.preventDefault();
        close();
      }
    });
    // mousedown (et pas click) pour choisir avant que le champ perde le focus
    list.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const li = e.target.closest('.combo-opt');
      if (li) choose(+li.dataset.i);
    });
    combo.querySelector('.combo-toggle').addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!list.hidden) return close();
      if (document.activeElement === input) search();
      else input.focus();
    });

    return { input, close };
  }

  const byName = (x, y) => x.label.localeCompare(y.label, 'fr', { sensitivity: 'base' }) || (x.sub || '').localeCompare(y.sub || '', 'fr');

  // Lieu : régions + communes. `onCommune` reçoit la commune choisie (ou null si le texte est modifié).
  function setupLocationCombo(combo, onCommune) {
    let timer = null;
    let ctrl = null;

    const groups = (regions, cities) => [
      { label: 'Régions', items: regions.slice().sort(byName) },
      { label: 'Villes, villages et communes', items: cities.slice().sort(byName) },
    ];

    const { input } = createCombo(combo, {
      idPrefix: 'loc',
      emptyText: 'Aucun résultat : le texte saisi sera utilisé tel quel.',
      onChoose: (it) => onCommune(it.type === 'city' ? it.commune : null),
      source(q, show) {
        const local = Places.searchLocal(q);
        clearTimeout(timer);
        if (ctrl) ctrl.abort();
        if (Places.norm(q).length < 2) return show(groups(local.regions, local.cities), '');
        show(groups(local.regions, local.cities), 'Recherche dans toutes les communes…');
        // Petite attente pour ne pas interroger l'API à chaque lettre
        timer = setTimeout(async () => {
          ctrl = new AbortController();
          try {
            const remote = await Places.searchRemote(q, ctrl.signal);
            // On garde les communes de l'API (plus complètes), puis les villes locales absentes
            const keys = new Set(remote.items.map((c) => c.key));
            show(groups(local.regions, remote.items.concat(local.cities.filter((c) => !keys.has(c.key)))), remote.hint);
          } catch (err) {
            if (err.name !== 'AbortError') {
              show(groups(local.regions, local.cities), 'Hors connexion : seules les régions et les grandes villes sont proposées.');
            }
          }
        }, 220);
      },
    });

    // Taper à la main dans le Lieu annule la commune choisie
    input.addEventListener('input', () => onCommune(null));
  }

  // Domaine : liste intégrée (avec réglages de score) + tous les sports et jeux vidéo en ligne
  function setupDomainCombo(combo, { withAll = false, current, onChoose }) {
    let timer = null;
    let ctrl = null;
    return createCombo(combo, {
      idPrefix: combo.id,
      emptyText: 'Aucun sport ni jeu trouvé : choisis « Autre (personnalisé) ».',
      onChoose,
      source(q, show) {
        const cur = current();
        if (cur && q === cur.name) q = ''; // à l'ouverture, montrer toute la liste
        const top = withAll && !q.trim()
          ? [{ label: 'Tous', items: [{ label: 'Tous les sports et jeux vidéo', sub: '', value: '', discipline: null }] }]
          : [];
        clearTimeout(timer);
        if (ctrl) ctrl.abort();
        const local = Disciplines.groups(q);
        if (Disciplines.norm(q.trim()).length < 2) return show([...top, ...local], '');
        show([...top, ...local], 'Recherche dans tous les sports et jeux vidéo…');
        timer = setTimeout(async () => {
          ctrl = new AbortController();
          try {
            const remote = await Disciplines.searchAll(q, ctrl.signal);
            show([...top, ...Disciplines.groups(q, remote)], '');
          } catch (err) {
            if (err.name !== 'AbortError') show([...top, ...local], 'Hors connexion : seule la liste intégrée est proposée.');
          }
        }, 250);
      },
    });
  }

  // Jeux Roblox : populaires (intégrés) + tous les jeux via la recherche Roblox
  function setupRobloxCombo(combo, onChoose) {
    let timer = null;
    let ctrl = null;
    const fmt = (n) => (n >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k` : String(n));
    const toItem = (g) => ({ label: g.name, sub: g.players ? `${fmt(g.players)} en ligne` : '', value: g.name });
    return createCombo(combo, {
      idPrefix: 'roblox',
      onChoose,
      emptyText: 'Aucun jeu trouvé : le nom saisi sera utilisé tel quel.',
      source(q, show) {
        clearTimeout(timer);
        if (ctrl) ctrl.abort();
        const popular = { label: 'Jeux populaires', items: Disciplines.robloxLocal(q).map(toItem) };
        if (Disciplines.norm(q.trim()).length < 2) return show([popular], '');
        show([popular], 'Recherche dans tous les jeux Roblox…');
        timer = setTimeout(async () => {
          ctrl = new AbortController();
          try {
            const found = await Disciplines.searchRoblox(q, ctrl.signal);
            const seen = new Set(found.map((g) => Disciplines.norm(g.name)));
            show([
              { label: 'Tous les jeux Roblox', items: found.map(toItem) },
              { label: 'Jeux populaires', items: popular.items.filter((it) => !seen.has(Disciplines.norm(it.label))) },
            ], '');
          } catch (err) {
            if (err.name !== 'AbortError') show([popular], 'Recherche Roblox indisponible : seuls les jeux populaires sont proposés.');
          }
        }, 250);
      },
    });
  }

  // Salle ou stade : installations sportives de la commune choisie, filtrées en local
  function setupVenueCombo(combo, getCommune) {
    return createCombo(combo, {
      idPrefix: 'venue',
      emptyText: 'Aucune salle ni stade trouvé : le texte saisi sera utilisé tel quel.',
      async source(q, show) {
        const commune = getCommune();
        if (!commune) return show([], 'Choisis d’abord une commune dans le champ Lieu.');
        show([], 'Chargement des salles et stades…');
        try {
          const all = await Places.searchVenues(commune);
          const nq = Places.norm(q);
          const groups = all.map((g) => ({
            label: g.label,
            items: nq ? g.items.filter((it) => Places.norm(it.label).includes(nq)) : g.items,
          }));
          const total = all.reduce((n, g) => n + g.items.length, 0);
          show(groups, total ? '' : `Aucun équipement recensé à ${commune.name}.`);
        } catch {
          show([], 'Impossible de charger les équipements (connexion ?). Tu peux écrire le nom à la main.');
        }
      },
    });
  }

  /* ---------------- Page d'un tournoi ---------------- */

  function firstOpenDay(t, phase) {
    const days = t.days.filter((d) => d.phase === phase);
    const i = days.findIndex((d) => d.matches.some((m) => m.status !== 'done'));
    return i < 0 ? days.length - 1 : i;
  }

  function initUi(t) {
    if (t.type === 'elim') return { tab: 'bracket' };
    const allerDone = t.days.filter((d) => d.phase === 'aller').every((d) => d.matches.every((m) => m.status === 'done'));
    const phase = t.homeAway && allerDone ? 'retour' : 'aller';
    return { tab: T.status(t) === 'upcoming' ? 'matches' : 'standings', phase, dayIdx: firstOpenDay(t, phase) };
  }

  // Un tournoi reçu via un lien de partage ne se modifie pas : seul son créateur peut le faire.
  const isReadOnly = (t) => !!(t && t.shared);
  const EDIT_ACTIONS = new Set(['edit', 'score', 'toggle', 'lstep', 'lquick']);

  function renderTournament(id) {
    const t = Store.get(id);
    if (!t) {
      location.hash = '#/';
      return;
    }
    const u = ui[id] || (ui[id] = initUi(t));
    const s = T.status(t);
    const ro = isReadOnly(t); // tournoi reçu via un lien : consultation seulement
    const tabs = t.type === 'elim'
      ? [['bracket', 'Tableau'], ['matches', 'Matchs']]
      : [['standings', 'Classement'], ['matches', 'Matchs']];
    const meta = [t.shared ? 'Reçu via un lien' : '', domainLabel(t), t.venue, t.location, fmtDate(t.date), countLabel(t, t.teams.length), formatLabel(t)].filter(Boolean).join(' · ');

    // Les deux vues sont rendues : sur mobile, les onglets n'en montrent qu'une ;
    // sur ordinateur, elles s'affichent ensemble (tableau puis matchs, ou classement à côté des matchs).
    const pane = (key, title, html) => `
      <section class="pane pane-${key} ${u.tab === key ? 'is-active' : ''}">
        <h2 class="h2 pane-title only-desktop">${title}</h2>
        ${html}
      </section>`;
    const body = t.type === 'elim'
      ? pane('bracket', 'Tableau', bracketHTML(t)) + pane('matches', 'Matchs', elimMatchesHTML(t))
      : pane('standings', 'Classement', standingsHTML(t)) + pane('matches', 'Matchs', leagueMatchesHTML(t, u));

    app.innerHTML = `
      <div class="page page-tournament page-${t.type}">
        <header class="topbar">
          <a href="#/" class="back">${ICON.left}Mes tournois</a>
          <div class="topbar-right">
            ${brandHTML()}
            ${themeToggleHTML()}
          </div>
        </header>
        <div class="t-head">
          <div><h1 class="h1">${esc(t.name)}</h1><p class="muted">${esc(meta)}</p></div>
          ${ro ? `<span class="badge badge-${s}">${STATUS[s]}</span>` : `
          <label class="status-pick badge badge-${s}" title="Changer le statut du tournoi">
            <span class="sr-only">Statut du tournoi</span>
            <select data-status-select aria-label="Statut du tournoi">
              <option value="auto" ${t.statusOverride ? '' : 'selected'}>${t.statusOverride ? 'Automatique' : `${STATUS[s]} (auto)`}</option>
              ${['upcoming', 'live', 'done'].map((k) => `<option value="${k}" ${t.statusOverride === k ? 'selected' : ''}>${STATUS[k]}</option>`).join('')}
            </select>
            ${ICON.chevron}
          </label>`}
        </div>
        <div class="t-actions" role="toolbar" aria-label="Actions du tournoi">
          <button type="button" class="btn btn-ghost btn-sm t-actions-share" data-action="share">${ICON.share}Partager</button>
          ${ro ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-action="edit">${ICON.edit}Modifier</button>`}
          <button type="button" class="btn btn-ghost btn-sm" data-action="duplicate">${ICON.copy}Dupliquer</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="fullscreen">${ICON.expand}Plein écran</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="export-one">${ICON.download}Exporter</button>
          <button type="button" class="btn btn-ghost btn-sm t-actions-danger" data-action="delete">${ICON.trash}Supprimer</button>
        </div>
        ${
          freshlyCreated.has(id)
            ? `<section class="share-banner">
                 <span class="share-banner-ico" aria-hidden="true">🎉</span>
                 <div><strong>Ton tournoi est prêt !</strong><span>Invite tes amis à le suivre sur Discord, Snapchat, WhatsApp…</span></div>
                 <button type="button" class="btn btn-primary btn-sm" data-action="share">${ICON.share}Partager</button>
                 <button type="button" class="icon-link share-banner-close" data-action="hide-banner" aria-label="Masquer">${ICON.close}</button>
               </section>`
            : ''
        }
        ${
          ro
            ? `<section class="readonly-banner" role="note">
                 <span class="readonly-banner-ico" aria-hidden="true">🔒</span>
                 <div><strong>Tournoi partagé : lecture seule</strong><span>Tu peux le consulter, mais pas modifier les scores ni les réglages. Demande un nouveau lien pour avoir les derniers résultats.</span></div>
               </section>`
            : ''
        }
        ${podiumHTML(t)}
        ${nextMatchHTML(t)}
        <div class="segmented t-tabs" role="tablist">
          ${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${u.tab === k}" data-action="tab" data-tab="${k}" class="${u.tab === k ? 'active' : ''}">${l}</button>`).join('')}
        </div>
        <div id="view" class="t-view">${body}</div>
      </div>`;

    app.onclick = async (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (ro && EDIT_ACTIONS.has(a)) {
        toast('Ce tournoi partagé est en lecture seule.', 'error');
        return;
      }
      if (a === 'tab') {
        u.tab = el.dataset.tab;
        renderTournament(id);
        app.querySelector('.pane.is-active')?.classList.add('pane-enter'); // fondu en changeant d'onglet
      } else if (a === 'delete') {
        if (await askDelete(t)) {
          Store.remove(id);
          delete ui[id];
          location.hash = '#/';
          toast(`« ${t.name} » supprimé`);
        }
      } else if (a === 'share') {
        openShareDialog(Store.get(id) || t);
      } else if (a === 'hide-banner') {
        freshlyCreated.delete(id);
        const bn = app.querySelector('.share-banner');
        if (bn) {
          bn.classList.add('is-leaving');
          setTimeout(() => bn.remove(), 300);
        }
      } else if (a === 'edit') {
        openEditDialog(t);
      } else if (a === 'duplicate') {
        const copy = T.duplicate(t);
        Store.save(copy);
        location.hash = `#/t/${copy.id}`;
        toast(`Tournoi dupliqué : mêmes ${W(t).many} et réglages, scores remis à zéro.`);
      } else if (a === 'export-one') {
        downloadJSON([t], `nexcup-${Disciplines.norm(t.name).replace(/[^a-z0-9]+/g, '-')}.json`);
        toast('Tournoi exporté');
      } else if (a === 'fullscreen') {
        // Tableau (éliminatoire) ou classement (championnat) en plein écran, pour un écran ou un projecteur
        const target = app.querySelector(t.type === 'elim' ? '.board' : '.t-view');
        if (target && target.requestFullscreen) target.requestFullscreen().catch(() => toast('Plein écran indisponible ici.', 'error'));
        else toast('Plein écran indisponible ici.', 'error');
      } else if (a === 'goto-day') {
        u.phase = el.dataset.phase;
        u.dayIdx = +el.dataset.idx;
        u.tab = 'matches';
        renderTournament(id);
        app.querySelector('.pane-matches').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (a === 'score') {
        openScoreDialog(t, +el.dataset.r, +el.dataset.i);
      } else if (a === 'phase') {
        u.phase = el.dataset.phase;
        u.dayIdx = firstOpenDay(t, u.phase);
        renderTournament(id);
        FX.mark(app.querySelector('.pane-matches .card'), u.phase === 'retour' ? 'fx-slide-next' : 'fx-slide-prev');
      } else if (a === 'prev' || a === 'next') {
        u.dayIdx += a === 'prev' ? -1 : 1;
        renderTournament(id);
        FX.mark(app.querySelector('.pane-matches .card'), a === 'next' ? 'fx-slide-next' : 'fx-slide-prev');
        FX.mark(app.querySelector('.day-center'), 'fx-pop');
      } else if (a === 'toggle') {
        toggleLeagueMatch(t, u, +el.dataset.k);
      } else if (a === 'lstep') {
        setLeagueScore(t, u, +el.dataset.k, el.dataset.side, { step: Number(el.dataset.step) });
      } else if (a === 'lquick') {
        setLeagueScore(t, u, +el.dataset.k, el.dataset.side, { quick: el.dataset.quick });
      }
    };

    // Score du championnat tapé au clavier
    app.oninput = (e) => {
      const el = e.target;
      if (ro || !el.classList.contains('l-score')) return;
      const v = parseInt(el.value, 10);
      setLeagueScore(t, u, +el.dataset.k, el.dataset.side, { value: Number.isNaN(v) ? null : v });
    };
    app.onchange = (e) => {
      const el = e.target;
      if (ro) return;
      // Statut du tournoi choisi à la main (ou « Automatique » : selon les matchs joués)
      if (el.matches('[data-status-select]')) {
        t.statusOverride = el.value === 'auto' ? null : el.value;
        Store.save(t);
        renderTournament(id);
        FX.pop(app.querySelector('.status-pick'));
        FX.sparks(app.querySelector('.status-pick'), 10);
        toast(t.statusOverride ? `Statut : ${STATUS[t.statusOverride]}` : `Statut automatique : ${STATUS[T.status(t)]}`);
        return;
      }
      // À la sortie du champ, on affiche la valeur retenue (ex. ramenée à la limite)
      if (!el.classList.contains('l-score')) return;
      const m = currentDay(t, u).matches[+el.dataset.k];
      el.value = m[el.dataset.side] ?? '';
    };
  }

  /* ---------------- Partage d'un tournoi (Discord, Snapchat, WhatsApp, Facebook…) ---------------- */
  const freshlyCreated = new Set(); // tournois tout juste créés : on propose de les partager

  function shareMessage(t) {
    const bits = [domainLabel(t), countLabel(t, t.teams.length), t.date ? fmtDate(t.date) : '', t.location].filter(Boolean).join(' · ');
    return `🏆 Viens suivre mon tournoi « ${t.name} » sur NexCup !${bits ? `\n${bits}` : ''}`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  async function nativeShare(t, url) {
    try {
      await navigator.share({ title: `NexCup – ${t.name}`, text: shareMessage(t), url });
      return true;
    } catch (err) {
      return err && err.name === 'AbortError'; // l'utilisateur a fermé la fenêtre de partage
    }
  }

  async function openShareDialog(t) {
    let dlg = document.getElementById('shareDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'shareDialog';
      dlg.className = 'share-dialog';
      document.body.appendChild(dlg);
    }
    const url = await Share.link(t);
    const msg = shareMessage(t);
    const full = `${msg}\n${url}`;
    const enc = encodeURIComponent;
    const canNative = !!navigator.share;
    // Discord, Snapchat et Instagram n'ont pas de lien de partage web : partage du téléphone, sinon copie du message
    const targets = [
      { id: 'discord', label: 'Discord', color: '#5865F2', icon: 'D' },
      { id: 'snapchat', label: 'Snapchat', color: '#FFFC00', ink: '#111', icon: 'S' },
      { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: 'W', href: `https://wa.me/?text=${enc(full)}` },
      { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
      { id: 'instagram', label: 'Instagram', color: 'linear-gradient(45deg,#F58529,#DD2A7B 50%,#8134AF)', icon: 'I' },
      { id: 'x', label: 'X', color: '#111', icon: 'X', href: `https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(url)}` },
      { id: 'telegram', label: 'Telegram', color: '#26A5E4', icon: 'T', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(msg)}` },
      { id: 'email', label: 'E-mail', color: '#5B6070', icon: '@', href: `mailto:?subject=${enc(`Tournoi ${t.name} sur NexCup`)}&body=${enc(full)}` },
    ];
    dlg.innerHTML = `
      <form class="dlg share" method="dialog">
        <div class="dlg-head">
          <h2 class="dlg-title">Partager le tournoi</h2>
          <button type="button" class="icon-link" data-close aria-label="Fermer">${ICON.close}</button>
        </div>
        <div class="share-card">
          <img src="assets/logo/nexcup-mark.png" alt="" width="128" height="119">
          <div>
            <strong>${esc(t.name)}</strong>
            <span>${esc([domainLabel(t), countLabel(t, t.teams.length), formatLabel(t)].filter(Boolean).join(' · '))}</span>
          </div>
        </div>
        ${
          Share.isLocal()
            ? `<p class="share-warn">⚠️ Le site tourne seulement sur ton ordinateur (<b>${esc(location.host || 'fichier local')}</b>) : tes amis ne pourront ouvrir ce lien qu’une fois NexCup mis en ligne.</p>`
            : ''
        }
        ${canNative ? `<button type="button" class="btn btn-primary share-native" data-share="native">${ICON.share}Partager avec une appli…</button>` : ''}
        <div class="share-grid">
          ${targets
            .map(
              (x, i) => `
            <${x.href ? `a href="${x.href}" target="_blank" rel="noopener"` : 'button type="button"'} class="share-btn" data-share="${x.id}" style="--i:${i}">
              <span class="share-ico" style="background:${x.color};color:${x.ink || '#fff'}">${x.icon}</span>
              <span>${x.label}</span>
            </${x.href ? 'a' : 'button'}>`
            )
            .join('')}
        </div>
        <label class="field"><span class="label">Lien du tournoi</span>
          <div class="share-link">
            <input class="input" readonly value="${esc(url)}" aria-label="Lien du tournoi">
            <button type="button" class="btn btn-outline" data-share="copy">${ICON.copy}Copier</button>
          </div>
        </label>
        <p class="helper">Le lien contient une copie du tournoi <b>à cet instant</b> (${url.length.toLocaleString('fr-FR')} caractères). Tes amis peuvent l’ouvrir et l’ajouter à leurs tournois ; repartage-le après de nouveaux scores.</p>
      </form>`;

    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.querySelector('.share-link input').addEventListener('focus', (e) => e.target.select());
    dlg.querySelector('form').onclick = async (e) => {
      const b = e.target.closest('[data-share]');
      if (!b) return;
      const id = b.dataset.share;
      if (b.tagName === 'A') {
        FX.pop(b);
        return; // lien de partage du réseau (nouvel onglet)
      }
      if (id === 'native') {
        if (await nativeShare(t, url)) dlg.close();
        return;
      }
      if (id === 'copy') {
        if (await copyText(url)) {
          FX.pop(b);
          FX.sparks(b, 10);
          toast('Lien copié !');
        } else toast('Impossible de copier : sélectionne le lien à la main.', 'error');
        return;
      }
      // Discord, Snapchat, Instagram : partage du téléphone si possible, sinon on copie le message
      if (canNative && (await nativeShare(t, url))) return dlg.close();
      let text = id === 'discord' ? `**${msg.split('\n')[0]}**\n${msg.split('\n').slice(1).join('\n')}\n${url}` : full;
      const tooLong = id === 'discord' && text.length > 2000; // limite d'un message Discord
      if (tooLong) text = url;
      const ok = await copyText(text);
      FX.pop(b);
      FX.sparks(b, 10);
      const app_ = b.querySelector('span:last-child').textContent;
      if (!ok) toast('Impossible de copier le message.', 'error');
      else if (tooLong) toast('Lien copié (gros tournoi : il dépasse la limite d’un message Discord, envoie-le seul).');
      else toast(`Message copié : colle-le dans ${app_} (Ctrl+V)`);
    };
    dlg.showModal();
  }

  /* ---------------- Page d'arrivée d'un lien partagé ---------------- */
  async function renderShared(code) {
    app.innerHTML = `
      <div class="page">
        <header class="topbar">${brandHTML()}<div class="topbar-right">${themeToggleHTML()}</div></header>
        <p class="muted">Ouverture du tournoi partagé…</p>
      </div>`;
    let t;
    try {
      t = await Share.decode(code);
    } catch {
      app.innerHTML = `
        <div class="page">
          <header class="topbar">${brandHTML()}<div class="topbar-right">${themeToggleHTML()}</div></header>
          <div class="empty"><strong>Ce lien de partage est invalide ou incomplet</strong><span>Demande à ton ami de te le renvoyer en entier.</span></div>
          <a class="btn btn-primary" href="#/">Aller à l’accueil</a>
        </div>`;
      return;
    }
    const mine = Store.get(t.id);
    const s = T.status(t);
    const w = T.winner(t);
    app.innerHTML = `
      <div class="page page-shared page-enter">
        <header class="topbar">${brandHTML()}<div class="topbar-right">${themeToggleHTML()}</div></header>
        <div class="shared-hero">
          <span class="shared-gift" aria-hidden="true">🎁</span>
          <h1 class="h1">Un ami t’a partagé un tournoi</h1>
          <p class="lead">Ajoute-le à tes tournois pour voir le tableau, les matchs et le classement.</p>
        </div>
        <article class="t-card shared-card">
          <div class="t-card-head"><h2>${esc(t.name)}</h2><span class="badge badge-${s}">${STATUS[s]}</span></div>
          <div class="divider"></div>
          ${t.discipline ? kv('Domaine', domainLabel(t)) : ''}
          ${kv('Lieu', t.location || '—')}
          ${t.venue ? kv('Salle / stade', t.venue) : ''}
          ${kv('Date', fmtDate(t.date))}
          ${kv(W(t).Many, countLabel(t, t.teams.length))}
          ${kv('Format', formatLabel(t))}
          ${t.reward ? kv('Récompense', t.reward) : ''}
          ${w !== null ? kv('Vainqueur', teamName(t, w)) : ''}
          ${progressHTML(t)}
          <div class="team-chips">${t.teams.slice(0, 24).map((x) => `<span class="team-chip">${esc(x.name)}</span>`).join('')}${t.teams.length > 24 ? `<span class="team-chip">+${t.teams.length - 24}</span>` : ''}</div>
        </article>
        <div class="shared-actions">
          <button type="button" class="btn btn-primary btn-lg" data-action="import-shared">${ICON.plus}${mine ? 'Mettre à jour mon exemplaire' : 'Ajouter à mes tournois'}</button>
          <a class="btn btn-ghost" href="#/">Plus tard</a>
        </div>
        ${mine ? '<p class="helper">Tu as déjà ce tournoi : il sera remplacé par la version du lien (scores à jour).</p>' : ''}
        <p class="helper">C’est une copie : les scores ne se mettent pas à jour tout seuls. Demande un nouveau lien pour avoir les derniers résultats.</p>
      </div>`;
    app.onclick = async (e) => {
      if (!e.target.closest('[data-action="import-shared"]')) return;
      Store.save({ ...t, shared: true });
      delete ui[t.id];
      FX.confetti(e.target.closest('button'), 50);
      toast(mine ? 'Tournoi mis à jour' : 'Tournoi ajouté à tes tournois !');
      setTimeout(() => (location.hash = `#/t/${t.id}`), 500);
    };
  }

  /* ---------------- Podium, prochain match ---------------- */

  function podiumHTML(t) {
    const p = T.podium(t);
    if (!p) return '';
    const step = (rank, id) =>
      id === null || id === undefined
        ? ''
        : `<div class="podium-step podium-${rank}">
             <span class="podium-medal">${rank}</span>
             <strong>${esc(teamName(t, id))}</strong>
             ${rank === 1 && t.reward ? `<em>${esc(t.reward)}</em>` : ''}
           </div>`;
    return `
      <section class="podium" aria-label="Podium">
        <div class="podium-head">${ICON.trophy}<span>Tournoi terminé — félicitations !</span></div>
        <div class="podium-steps">${step(2, p[1])}${step(1, p[0])}${step(3, p[2])}</div>
      </section>`;
  }

  // Carte « Prochain match » : un clic pour saisir le score (éliminatoire) ou aller à la journée (championnat)
  function nextMatchHTML(t) {
    const n = T.nextMatch(t);
    if (!n) return '';
    const m = n.m;
    const live = m.status === 'live';
    const where = t.type === 'elim' ? T.matchName(t, n.r) : `Journée ${n.day.n}`;
    let btn;
    if (t.type === 'elim') btn = isReadOnly(t) ? '' : `<button type="button" class="btn btn-primary btn-sm" data-action="score" data-r="${n.r}" data-i="${n.i}">Saisir le score</button>`;
    else {
      const idx = t.days.filter((d) => d.phase === n.day.phase).indexOf(n.day);
      btn = `<button type="button" class="btn btn-primary btn-sm" data-action="goto-day" data-phase="${n.day.phase}" data-idx="${idx}">Aller à la journée</button>`;
    }
    return `
      <section class="next-match ${live ? 'is-live' : ''}">
        <div class="next-label">${live ? '<span class="status-dot"></span>En cours' : 'Prochain match'} · ${esc(where)}</div>
        <div class="next-teams">
          <strong>${esc(teamName(t, m.a))}</strong>
          <span class="next-vs">${live && m.sa !== null ? `${m.sa} – ${m.sb ?? 0}` : 'vs'}</span>
          <strong>${esc(teamName(t, m.b))}</strong>
        </div>
        ${btn}
      </section>`;
  }

  /* ---------------- Modifier un tournoi ---------------- */

  function openEditDialog(t) {
    if (isReadOnly(t)) return;
    const editDialog = document.getElementById('editDialog');
    editDialog.innerHTML = `
      <form class="dlg" method="dialog">
        <div class="dlg-head">
          <h2 class="dlg-title">Modifier le tournoi</h2>
          <button type="button" class="icon-link" data-close aria-label="Fermer">${ICON.close}</button>
        </div>
        <label class="field"><span class="label">Nom du tournoi</span>
          <input class="input" name="name" maxlength="60" value="${esc(t.name)}" required></label>
        <div class="row2">
          <label class="field"><span class="label">Date</span><input class="input" type="date" name="date" value="${esc(t.date || '')}"></label>
          <label class="field"><span class="label">Récompense</span><input class="input" name="reward" maxlength="80" value="${esc(t.reward || '')}"></label>
        </div>
        <label class="field"><span class="label">Lieu</span><input class="input" name="location" maxlength="80" value="${esc(t.location || '')}"></label>
        <label class="field"><span class="label">Salle ou stade</span><input class="input" name="venue" maxlength="100" value="${esc(t.venue || '')}"></label>
        ${
          t.type === 'league'
            ? `<div class="field"><span class="label">Points au classement</span>
                 <div class="points-row">
                   <label><span>Victoire</span><input class="input" type="number" name="pWin" min="0" max="99" value="${T.pointsOf(t).win}"></label>
                   <label><span>Égalité</span><input class="input" type="number" name="pDraw" min="0" max="99" value="${T.pointsOf(t).draw}"></label>
                   <label><span>Défaite</span><input class="input" type="number" name="pLoss" min="0" max="99" value="${T.pointsOf(t).loss}"></label>
                 </div>
               </div>`
            : ''
        }
        <div class="field"><span class="label">Noms des ${W(t).many}</span>
          <div class="team-list edit-teams">
            ${t.teams.map((tm, i) => `<label class="team-row"><span>${W(t).One} ${i + 1} :</span><input class="input input-sm" data-team="${tm.id}" maxlength="40" value="${esc(tm.name)}"></label>`).join('')}
          </div>
          <p class="helper">Renommer ${t.entrant === 'player' ? 'un participant' : 'une équipe'} ne change pas ses résultats.</p>
        </div>
        <p class="error" hidden></p>
        <div class="dlg-actions">
          <button type="submit" value="save" class="btn btn-primary">Enregistrer</button>
          <button type="submit" value="cancel" class="btn btn-ghost">Annuler</button>
        </div>
      </form>`;
    const form = editDialog.querySelector('form');
    editDialog.querySelector('[data-close]').onclick = () => editDialog.close();
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!e.submitter || e.submitter.value !== 'save') return editDialog.close();
      const f = (n) => form.elements.namedItem(n);
      const fail = (msg) => {
        const p = form.querySelector('.error');
        p.textContent = msg;
        p.hidden = false;
      };
      const name = f('name').value.trim();
      if (!name) return fail('Le nom du tournoi est obligatoire.');
      const names = [...form.querySelectorAll('[data-team]')].map((inp) => inp.value.trim());
      if (names.some((n) => !n)) return fail(`${W(t).each[0].toUpperCase() + W(t).each.slice(1)} doit avoir un nom.`);
      const lower = names.map((n) => n.toLowerCase());
      const dup = names.find((n, i) => lower.indexOf(n.toLowerCase()) !== i);
      if (dup) return fail(`Le nom « ${dup} » est utilisé deux fois.`);

      Object.assign(t, {
        name,
        date: f('date').value,
        reward: f('reward').value.trim(),
        location: f('location').value.trim(),
        venue: f('venue').value.trim(),
      });
      if (t.type === 'league') {
        t.points = {
          win: Math.max(0, parseInt(f('pWin').value, 10) || 0),
          draw: Math.max(0, parseInt(f('pDraw').value, 10) || 0),
          loss: Math.max(0, parseInt(f('pLoss').value, 10) || 0),
        };
      }
      form.querySelectorAll('[data-team]').forEach((inp) => (t.teams[+inp.dataset.team].name = inp.value.trim()));
      Store.save(t);
      editDialog.close();
      renderTournament(t.id);
      toast('Modifications enregistrées');
      FX.mark(app.querySelector('.t-head .h1'), 'fx-glow');
    };
    editDialog.showModal();
    form.elements.namedItem('name').focus();
  }

  /* ---------------- Élimination : tableau ---------------- */

  function bracketHTML(t) {
    const champ = T.winner(t);
    const sub = `${t.random ? 'Tirage au sort effectué' : 'Ordre de saisie'} · ${countLabel(t, t.teams.length)} · ${formatLabel(t)}`;
    return `
      <div class="board">
        <div>
          <div class="board-title">${esc(t.name)}</div>
          <div class="board-sub">${esc(sub)}</div>
        </div>
        <div class="board-scroll">
          <div class="bracket">
            ${t.rounds
              .map(
                (round, r) => `
              <div class="round">
                <div class="round-title">${T.roundName(round.length)}</div>
                <div class="round-body">
                  ${chunk(round, 2)
                    .map((pair, p) => `<div class="pair${round.length === 1 ? ' single' : ''}">${pair.map((m, k) => bracketMatch(t, m, r, p * 2 + k)).join('')}</div>`)
                    .join('')}
                </div>
              </div>`
              )
              .join('')}
            <div class="round round-champ">
              <div class="round-title">Vainqueur</div>
              <div class="round-body">
                <div class="champ ${champ !== null ? 'has' : ''}">${ICON.trophy}<span>${champ !== null ? esc(teamName(t, champ)) : 'À déterminer'}</span></div>
              </div>
            </div>
          </div>
        </div>
        ${
          t.third
            ? `<div class="third-place">
                 <div class="round-title">Match pour la 3e place</div>
                 <div class="third-match">${bracketMatch(t, t.third, T.THIRD, 0)}</div>
               </div>`
            : ''
        }
        ${isReadOnly(t) ? '' : '<p class="board-help">Clique sur un match pour saisir le score. Le gagnant passe automatiquement au tour suivant.</p>'}
      </div>`;
  }

  function bracketMatch(t, m, r, i) {
    const finished = m.status === 'done' || m.status === 'bye';
    const slot = (id, score, side) => {
      if (id === null) {
        const label = m.status === 'bye' ? 'Exempt' : 'À déterminer';
        return `<span class="slot tbd"><span class="slot-name">${label}</span><span class="slot-score">–</span></span>`;
      }
      const cls = `side-${side}${finished ? (m.winner === id ? ' win' : ' lose') : ''}`;
      return `<span class="slot ${cls}"><span class="slot-name">${esc(teamName(t, id))}</span><span class="slot-score">${score ?? '–'}</span></span>`;
    };
    const playable = m.a !== null && m.b !== null;
    if (isReadOnly(t)) {
      return `
      <div class="match-wrap">
        <div class="bm bm-${m.status} is-readonly">
          ${slot(m.a, m.sa, 'a')}${slot(m.b, m.sb, 'b')}
          ${m.status === 'live' ? '<span class="bm-live">En cours</span>' : ''}
        </div>
      </div>`;
    }
    const label = playable ? `${teamName(t, m.a)} contre ${teamName(t, m.b)} : saisir le score` : 'Match en attente';
    return `
      <div class="match-wrap">
        <button type="button" class="bm bm-${m.status}" data-action="score" data-r="${r}" data-i="${i}" ${playable ? '' : 'disabled'} aria-label="${esc(label)}">
          ${slot(m.a, m.sa, 'a')}${slot(m.b, m.sb, 'b')}
          ${m.status === 'live' ? '<span class="bm-live">En cours</span>' : ''}
        </button>
      </div>`;
  }

  /* ---------------- Élimination : matchs / résultats ---------------- */

  function elimMatchesHTML(t) {
    const all = [];
    t.rounds.forEach((round, r) => round.forEach((m, i) => all.push({ m, r, i, rn: T.roundName(round.length) })));
    // La petite finale se place juste avant la finale
    if (t.third) all.splice(all.length - 1, 0, { m: t.third, r: T.THIRD, i: 0, rn: T.matchName(t, T.THIRD) });
    const toPlay = all.filter((x) => x.m.status === 'upcoming' || x.m.status === 'live');
    const pending = all.filter((x) => x.m.status === 'pending').length;
    const done = all.filter((x) => x.m.status === 'done').reverse();

    const eliminated = new Set(done.filter((x) => x.r !== T.THIRD).map((x) => (x.m.winner === x.m.a ? x.m.b : x.m.a)));

    const upcomingRows = toPlay
      .map(
        ({ m, r, i, rn }) => `
        <div class="match-row">
          <div class="match-round">${rn}${m.status === 'live' ? ' · <span class="live-text">En cours</span>' : ''}</div>
          <div class="match-main">
            <span class="team-name team-home">${esc(teamName(t, m.a))}</span>
            <span class="vs">${m.status === 'live' ? `${m.sa ?? 0} – ${m.sb ?? 0}` : 'vs'}</span>
            <span class="team-name team-away">${esc(teamName(t, m.b))}</span>
          </div>
          ${isReadOnly(t) ? '' : `<button type="button" class="btn btn-outline btn-sm" data-action="score" data-r="${r}" data-i="${i}">Saisir le score</button>`}
        </div>`
      )
      .join('');

    const resultRows = done
      .map(({ m, r, i, rn }) => {
        const aWin = m.winner === m.a;
        return `
        <div class="match-row">
          <div class="match-round">${rn}</div>
          <div class="match-main">
            <span class="team-name team-home ${aWin ? 'is-win' : 'is-lose'}">${esc(teamName(t, m.a))}</span>
            <span class="score-final">${m.sa} – ${m.sb}</span>
            <span class="team-name team-away ${aWin ? 'is-lose' : 'is-win'}">${esc(teamName(t, m.b))}</span>
          </div>
          <div class="match-meta">
            <span class="points-text"><span class="chip chip-win">Gagnant</span> ${esc(teamName(t, m.winner))}
              &nbsp;<span class="chip chip-lose">Perdant</span> ${esc(teamName(t, aWin ? m.b : m.a))}</span>
            ${isReadOnly(t) ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-action="score" data-r="${r}" data-i="${i}">Modifier</button>`}
          </div>
        </div>`;
      })
      .join('');

    return `
      <section class="section">
        <h2 class="h2">Matchs à venir <span class="count">${toPlay.length}</span></h2>
        ${toPlay.length ? `<div class="card">${upcomingRows}</div>`
          : `<p class="helper">${T.winner(t) !== null ? 'Le tournoi est terminé.' : 'Aucun match jouable pour le moment.'}</p>`}
        ${pending ? `<p class="helper">${pending} match${pending > 1 ? 's' : ''} en attente des résultats précédents.</p>` : ''}
      </section>
      <section class="section">
        <h2 class="h2">Résultats <span class="count">${done.length}</span></h2>
        ${done.length ? `<div class="card">${resultRows}</div>` : '<p class="helper">Aucun résultat pour le moment.</p>'}
      </section>
      <section class="section">
        <h2 class="h2">${W(t).Many} <span class="count">${t.teams.length - eliminated.size} en lice</span></h2>
        <div class="team-chips">
          ${t.teams.map((tm) => `<span class="team-chip ${eliminated.has(tm.id) ? 'out' : ''}">${esc(tm.name)}</span>`).join('')}
        </div>
      </section>`;
  }

  /* ---------------- Élimination : saisie du score ---------------- */

  function openScoreDialog(t, r, i) {
    if (isReadOnly(t)) return;
    const m = T.getMatch(t, r, i);
    if (m.a === null || m.b === null) return;
    const need = T.winsNeeded(t);
    const cap = T.scoreMax(t); // limite de points (ou de manches) ; null = pas de limite
    const pts = T.isPts(t);
    // Matchs qui dépendent de celui-ci : tour suivant (+ petite finale pour une demi-finale)
    const played = (x) => x && (x.status === 'done' || x.status === 'live');
    const next = r >= 0 && r + 1 < t.rounds.length ? t.rounds[r + 1][Math.floor(i / 2)] : null;
    const nextPlayed = played(next) || (r === t.rounds.length - 2 && played(t.third));

    dialog.innerHTML = `
      <form class="dlg" method="dialog">
        <div class="dlg-head">
          <span class="dlg-round">${T.matchName(t, r)}</span>
          <button type="button" class="icon-link" data-close aria-label="Fermer">${ICON.close}</button>
        </div>
        <p class="muted">${
          pts
            ? T.isWinBy2(t)
              ? `Match en ${cap} ${esc(t.unit)} avec <b>2 points d’écart</b> : à ${cap - 1}–${cap - 1}, on continue (${cap + 1}–${cap - 1}, ${cap + 2}–${cap}…)${t.hardCap ? `, jusqu’à ${t.hardCap} au maximum` : ''}.`
              : `Score en ${esc(t.unit)}${cap ? ` · limite ${cap} par équipe` : ''}. Le plus haut l’emporte (pas d’égalité).`
            : need ? `Bo${t.bo} : le vainqueur doit remporter ${need} manches.` : 'Bo1 : le score le plus élevé l’emporte (pas d’égalité).'
        }</p>
        <div class="dlg-score">
          ${['sa', 'sb'].map((side, n) => {
            const nm = esc(teamName(t, n === 0 ? m.a : m.b));
            return `${n === 1 ? '<span class="score-sep">–</span>' : ''}
            <div class="dlg-team side-${n === 0 ? 'a' : 'b'}">
              <span class="dlg-name">${nm}</span>
              <input class="score-big" type="number" min="0" inputmode="numeric" data-out="${side}" aria-label="Score de ${nm}">
              <div class="stepper">
                <button type="button" data-step="-1" data-side="${side}" aria-label="Retirer un point à ${nm}">−</button>
                <button type="button" data-step="1" data-side="${side}" aria-label="Ajouter un point à ${nm}">+</button>
              </div>
              ${cap !== null ? `<div class="quick">
                <button type="button" data-quick="half" data-side="${side}" aria-label="Ajouter la moitié des points à ${nm}">½</button>
                <button type="button" data-quick="max" data-side="${side}" aria-label="Mettre le maximum de points à ${nm}">Max</button>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
        <p class="dlg-hint muted" id="dlgHint"></p>
        <p class="error" hidden></p>
        <div class="dlg-actions">
          <button type="submit" value="save" class="btn btn-primary">Valider le résultat</button>
          <button type="submit" value="live" class="btn btn-outline">En cours</button>
          ${m.status === 'done' || m.status === 'live' ? '<button type="submit" value="reset" class="btn btn-ghost">Réinitialiser</button>' : ''}
        </div>
      </form>`;

    const form = dialog.querySelector('form');
    dialog.querySelector('[data-close]').onclick = () => dialog.close();

    // Score courant manipulé par les boutons + / −
    const sc = { sa: m.sa ?? 0, sb: m.sb ?? 0 };
    const maxFor = (side) => {
      if (pts) return T.capFor(t, sc[side === 'sa' ? 'sb' : 'sa']); // avec 2 pts d'écart, dépend du score adverse
      if (need === null) return 999;
      const other = sc[side === 'sa' ? 'sb' : 'sa'];
      return other >= need ? need - 1 : need; // une seule équipe peut atteindre le nombre de manches requis
    };
    const half = cap !== null ? Math.max(1, Math.floor(cap / 2)) : 0;
    // 2 points d'écart : si une équipe baisse (25 → 24), l'autre redescend au score possible (27 → 26)
    const clampOther = (side) => {
      if (!T.isWinBy2(t)) return;
      const o = side === 'sa' ? 'sb' : 'sa';
      sc[o] = Math.min(sc[o], maxFor(o));
    };
    const saveBtn = form.querySelector('[value="save"]');

    function updateScore() {
      ['sa', 'sb'].forEach((side) => {
        const out = form.querySelector(`[data-out="${side}"]`);
        if (document.activeElement !== out) out.value = sc[side];
        form.querySelector(`[data-side="${side}"][data-step="-1"]`).disabled = sc[side] <= 0;
        form.querySelector(`[data-side="${side}"][data-step="1"]`).disabled = sc[side] >= maxFor(side);
        form.querySelectorAll(`[data-quick][data-side="${side}"]`).forEach((b) => (b.disabled = sc[side] >= maxFor(side)));
      });
      const invalid = T.validateFinal(t, sc.sa, sc.sb);
      saveBtn.disabled = !!invalid;
      if (invalid) {
        saveBtn.textContent = 'Valider le résultat';
        form.querySelector('#dlgHint').textContent = T.isWinBy2(t)
          ? sc.sa + sc.sb === 0 ? '' : invalid
          : sc.sa === sc.sb && need === null
            ? 'Égalité : départagez les équipes pour valider.'
            : need !== null ? `Encore ${need - Math.max(sc.sa, sc.sb)} manche(s) pour un vainqueur.` : '';
      } else {
        const win = teamName(t, sc.sa > sc.sb ? m.a : m.b);
        saveBtn.textContent = `Valider : ${win} gagne ${Math.max(sc.sa, sc.sb)}–${Math.min(sc.sa, sc.sb)}`;
        form.querySelector('#dlgHint').textContent = '';
      }
      form.querySelector('.error').hidden = true;
    }

    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step], [data-quick]');
      if (!b) return;
      const side = b.dataset.side;
      const before = sc[side];
      let v = sc[side] + Number(b.dataset.step || 0);
      if (b.dataset.quick === 'half') v = sc[side] + half; // ajoute la moitié de la limite
      if (b.dataset.quick === 'max') v = maxFor(side); // met directement le maximum
      sc[side] = Math.min(maxFor(side), Math.max(0, v));
      clampOther(side);
      updateScore();
      scoreFx(form.querySelector(`[data-out="${side}"]`), sc[side] - before, side, b.dataset.quick);
    });
    // Saisie directe au clavier (pratique pour les grands scores)
    form.addEventListener('input', (e) => {
      const side = e.target.dataset.out;
      if (!side) return;
      const v = parseInt(e.target.value, 10);
      sc[side] = Number.isNaN(v) ? 0 : Math.min(maxFor(side), Math.max(0, v));
      clampOther(side);
      updateScore();
    });
    form.addEventListener('focusout', (e) => {
      if (e.target.dataset.out) e.target.value = sc[e.target.dataset.out];
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const action = (e.submitter && e.submitter.value) || 'save';
      const { sa, sb } = sc;
      const confirmReset = () =>
        askConfirm({
          title: 'Réinitialiser la suite du tableau ?',
          message: 'Le tour suivant a déjà commencé : ses scores seront effacés.',
          ok: 'Continuer',
        });
      let error = null;
      const wasDone = T.autoStatus(t) === 'done'; // pour ne fêter la victoire qu'au moment où le tournoi se termine

      if (action === 'save') {
        const newWinner = sa !== null && sb !== null && sa !== sb ? (sa > sb ? m.a : m.b) : null;
        if (nextPlayed && newWinner !== null && newWinner !== m.winner && !(await confirmReset())) return;
        error = T.setElimResult(t, r, i, sa, sb);
      } else {
        if (nextPlayed && !(await confirmReset())) return;
        if (action === 'live') error = T.setElimLive(t, r, i, sa, sb);
        else T.resetElim(t, r, i);
      }

      if (error) {
        const p = form.querySelector('.error');
        p.textContent = error;
        p.hidden = false;
        return;
      }
      Store.save(t);
      dialog.close();
      renderTournament(t.id);
      if (action === 'save') celebrateBracket(t, r, i, wasDone);
      else FX.mark(app.querySelector(`.bm[data-r="${r}"][data-i="${i}"]`), 'fx-pop');
      if (action === 'save') {
        const st = T.status(t);
        toast(st === 'done' ? 'Tournoi terminé ! Le podium est affiché.' : `${teamName(t, m.winner)} remporte le match`);
      } else toast(action === 'live' ? 'Match marqué en cours' : 'Match réinitialisé');
    };

    updateScore();
    dialog.showModal();
    form.querySelector('[data-side="sa"][data-step="1"]').focus();
  }

  /* ---------------- Championnat : classement ---------------- */

  function standingsHTML(t) {
    const rows = T.standings(t);
    const started = rows.some((r) => r.j > 0);
    return `
      <div class="table-card" role="table" aria-label="Classement">
        <div class="st-row st-head" role="row">
          <span>#</span><span class="l">${W(t).One}</span><span title="Joués">J</span><span title="Gagnés">G</span>
          <span title="Nuls">N</span><span title="Perdus">P</span><span title="Différence">Diff</span><span>PTS</span>
        </div>
        ${rows
          .map(
            (r, i) => `
          <div class="st-row ${started && i === 0 ? 'lead' : ''}" role="row" data-team="${r.id}">
            <span class="muted">${i + 1}</span><span class="l name">${esc(r.name)}</span>
            <span>${r.j}</span><span>${r.g}</span><span>${r.n}</span><span>${r.p}</span>
            <span>${fmtDiff(r.gf - r.ga)}</span><span class="pts">${r.pts}</span>
          </div>`
          )
          .join('')}
      </div>
      ${pointsBanner(t)}
      <p class="helper">Seuls les matchs marqués <b>Fini</b> sont comptabilisés dans le classement.</p>`;
  }

  /* ---------------- Championnat : journées ---------------- */

  const phaseDays = (t, u) => t.days.filter((d) => d.phase === u.phase);
  const phaseLabel = (t, phase) => (t.homeAway ? (phase === 'aller' ? 'Match aller' : 'Match retour') : 'Championnat');

  function daySub(t, u, day) {
    const live = day.matches.filter((m) => m.status === 'live').length;
    const done = day.matches.filter((m) => m.status === 'done').length;
    const label = phaseLabel(t, u.phase);
    if (live) return { text: `${label} · ${live} match${live > 1 ? 's' : ''} en cours`, live: true };
    if (done === day.matches.length) return { text: `${label} · terminée`, live: false };
    if (done === 0) return { text: `${label} · à venir`, live: false };
    return { text: `${label} · ${done}/${day.matches.length} matchs joués`, live: false };
  }

  function ptsText(t, m) {
    if (m.sa === null || m.sb === null) return 'Score non saisi';
    // Avec 2 points d'écart, tant qu'il n'y a pas de vainqueur on l'indique
    if (T.isWinBy2(t) && T.validateFinal(t, m.sa, m.sb)) return m.sa + m.sb === 0 ? 'En jeu' : 'En jeu · pas encore 2 points d’écart';
    const [pa, pb] = T.points(m.sa, m.sb, t);
    return `${m.status === 'live' ? 'Provisoire · ' : ''}+${pa} / +${pb} pts`;
  }

  const toggleHTML = (m, k, ro) =>
    ro
      ? `<span class="status-toggle st-${m.status} is-readonly"><span class="status-dot"></span>${MATCH_STATUS[m.status]}</span>`
      : `<button type="button" class="status-toggle st-${m.status}" data-action="toggle" data-k="${k}"><span class="status-dot"></span>${MATCH_STATUS[m.status]}</button>`;

  function leagueMatchesHTML(t, u) {
    const days = phaseDays(t, u);
    u.dayIdx = Math.min(Math.max(u.dayIdx, 0), days.length - 1);
    const day = days[u.dayIdx];
    const sub = daySub(t, u, day);

    return `
      ${
        t.homeAway
          ? `<div class="segmented segmented-light" role="tablist" aria-label="Phase">
               <button type="button" data-action="phase" data-phase="aller" class="${u.phase === 'aller' ? 'active' : ''}">Aller</button>
               <button type="button" data-action="phase" data-phase="retour" class="${u.phase === 'retour' ? 'active' : ''}">Retour</button>
             </div>`
          : ''
      }
      <div class="day-nav">
        <button type="button" class="icon-btn" data-action="prev" aria-label="Journée précédente" ${u.dayIdx === 0 ? 'disabled' : ''}>${ICON.left}</button>
        <div class="day-center">
          <div class="day-label">Journée ${day.n}</div>
          <div class="day-sub ${sub.live ? 'live' : ''}" id="daySub">${sub.text}</div>
        </div>
        <button type="button" class="icon-btn" data-action="next" aria-label="Journée suivante" ${u.dayIdx === days.length - 1 ? 'disabled' : ''}>${ICON.right}</button>
      </div>
      <div class="card">
        ${day.matches
          .map(
            (m, k) => `
          <div class="match-row" data-k="${k}">
            ${leagueLine(t, m, k, 'sa')}
            ${leagueLine(t, m, k, 'sb')}
            <div class="match-meta"><span class="points-text">${ptsText(t, m)}</span>${toggleHTML(m, k, isReadOnly(t))}</div>
          </div>`
          )
          .join('')}
        ${day.rest !== null ? `<div class="rest">Exempt cette journée : <b>${esc(teamName(t, day.rest))}</b></div>` : ''}
      </div>
      ${pointsBanner(t)}
      ${isReadOnly(t) ? '' : `<p class="helper">Utilise les boutons <b>+</b> / <b>−</b>${T.scoreMax(t) !== null ? `, <b>½</b> (ajoute ${Math.max(1, Math.floor(T.scoreMax(t) / 2))}) et <b>Max</b> (${T.isWinBy2(t) ? 'score gagnant' : T.scoreMax(t)})` : ''} ou tape le score.
        ${T.isWinBy2(t) ? `Match en ${T.scoreMax(t)} points avec <b>2 points d’écart</b> : le match n’est marqué <b>Fini</b> qu’avec un score gagnant valide.` : ''} Clique sur le badge pour passer de <b>À venir</b> à <b>En cours</b> puis <b>Fini</b>.
        ${t.homeAway ? ' Les matchs retour reprennent les mêmes rencontres, domicile et extérieur inversés.' : ''}</p>`}`;
  }

  function currentDay(t, u) {
    return phaseDays(t, u)[u.dayIdx];
  }

  // Score max d'une équipe dans ce match (avec 2 pts d'écart, dépend du score adverse)
  const leagueCap = (t, m, side) => T.capFor(t, m[side === 'sa' ? 'sb' : 'sa']);

  // Une ligne équipe + score avec boutons − / + et ½ / Max (le domicile en bleu, l'extérieur en rouge).
  function leagueLine(t, m, k, side) {
    const name = esc(teamName(t, side === 'sa' ? m.a : m.b));
    const v = m[side];
    const other = m[side === 'sa' ? 'sb' : 'sa'];
    const lead = v !== null && other !== null && v > other;
    const cap = leagueCap(t, m, side);
    const full = v !== null && v >= cap;
    if (isReadOnly(t)) {
      return `
      <div class="l-line ${lead ? 'is-lead' : ''}" data-line="${side}">
        <span class="l-side side-${side === 'sa' ? 'a' : 'b'}" aria-hidden="true"></span>
        <span class="l-name">${name}</span>
        <span class="l-score-ro" aria-label="Score de ${name}">${v ?? '–'}</span>
      </div>`;
    }
    return `
      <div class="l-line ${lead ? 'is-lead' : ''}" data-line="${side}">
        <span class="l-side side-${side === 'sa' ? 'a' : 'b'}" aria-hidden="true"></span>
        <span class="l-name">${name}</span>
        <div class="l-stepper">
          <button type="button" data-action="lstep" data-k="${k}" data-side="${side}" data-step="-1" aria-label="Retirer un point à ${name}" ${!v ? 'disabled' : ''}>−</button>
          <input class="l-score" type="number" min="0" inputmode="numeric" data-k="${k}" data-side="${side}" value="${v ?? ''}" placeholder="–" aria-label="Score de ${name}">
          <button type="button" data-action="lstep" data-k="${k}" data-side="${side}" data-step="1" aria-label="Ajouter un point à ${name}" ${full ? 'disabled' : ''}>+</button>
          ${T.scoreMax(t) !== null ? `
          <button type="button" class="l-quick" data-action="lquick" data-quick="half" data-k="${k}" data-side="${side}" aria-label="Ajouter la moitié des points à ${name}" ${full ? 'disabled' : ''}>½</button>
          <button type="button" class="l-quick" data-action="lquick" data-quick="max" data-k="${k}" data-side="${side}" aria-label="Mettre le maximum de points à ${name}" ${full ? 'disabled' : ''}>Max</button>` : ''}
        </div>
      </div>`;
  }

  // Change le score d'une équipe : `how` = { step } (+1 / −1), { quick: 'half' | 'max' } ou { value } (saisi au clavier).
  function setLeagueScore(t, u, k, side, how) {
    if (isReadOnly(t)) return;
    const day = currentDay(t, u);
    const m = day.matches[k];
    const otherSide = side === 'sa' ? 'sb' : 'sa';
    const cap = leagueCap(t, m, side);
    const cur = m[side] ?? 0;
    const beforeScore = m[side] ?? 0;
    let v;
    if (how.step !== undefined) {
      if (m[side] === null && how.step < 0) return;
      v = cur + how.step;
    } else if (how.quick === 'half') v = cur + Math.max(1, Math.floor((T.scoreMax(t) ?? cap) / 2));
    else if (how.quick === 'max') v = cap;
    else v = how.value;
    m[side] = v === null ? null : Math.min(cap, Math.max(0, v));
    if (m[side] !== null && m[otherSide] === null) m[otherSide] = 0; // le premier point démarre le match à 0
    if (T.isWinBy2(t) && m[otherSide] !== null) m[otherSide] = Math.min(m[otherSide], leagueCap(t, m, otherSide));
    if (m.status === 'upcoming' && m[side] !== null) m.status = 'live';
    if (m.status === 'done' && (m.sa === null || m.sb === null)) m.status = 'live';
    if (m.status === 'done' && T.isWinBy2(t) && T.validateFinal(t, m.sa, m.sb)) m.status = 'live'; // plus de vainqueur valide
    Store.save(t);

    // Mise à jour sur place, sans toucher au champ en cours de saisie
    const row = app.querySelector(`.match-row[data-k="${k}"]`);
    ['sa', 'sb'].forEach((s) => {
      const line = row.querySelector(`[data-line="${s}"]`);
      if (line.contains(document.activeElement) && document.activeElement.classList.contains('l-score')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = leagueLine(t, m, k, s);
        const fresh = tmp.firstElementChild;
        line.className = fresh.className;
        line.querySelectorAll('button').forEach((b, i) => (b.disabled = fresh.querySelectorAll('button')[i].disabled));
      } else {
        line.outerHTML = leagueLine(t, m, k, s);
      }
    });
    if (how.value === undefined) scoreFx(row.querySelector(`.l-score[data-side="${side}"]`), (m[side] ?? 0) - beforeScore, side, how.quick);
    const ptsEl = row.querySelector('.points-text');
    ptsEl.textContent = ptsText(t, m);
    ptsEl.classList.remove('is-error');
    row.querySelector('.status-toggle').outerHTML = toggleHTML(m, k);
    const s = T.status(t);
    const badge = app.querySelector('.t-head .status-pick');
    badge.className = `status-pick badge badge-${s}`;
    if (!t.statusOverride) badge.querySelector('option[value="auto"]').textContent = `${STATUS[s]} (auto)`;
    const sub = daySub(t, u, day);
    // Sur ordinateur, le classement est affiché à côté : on le recalcule
    const standingsPane = app.querySelector('.pane-standings');
    if (standingsPane) {
      FX.flip('.pane-standings .st-row[data-team]', 'team', () => {
        standingsPane.innerHTML = '<h2 class="h2 pane-title only-desktop">Classement</h2>' + standingsHTML(t);
      });
    }
    const subEl = app.querySelector('#daySub');
    subEl.textContent = sub.text;
    subEl.classList.toggle('live', sub.live);
  }

  function toggleLeagueMatch(t, u, k) {
    if (isReadOnly(t)) return;
    const m = currentDay(t, u).matches[k];
    const wasDone = T.autoStatus(t) === 'done';
    if (m.status === 'live') {
      m.sa = m.sa ?? 0;
      m.sb = m.sb ?? 0;
      // 2 points d'écart : on ne peut pas terminer un match sans vainqueur valide
      const err = T.isWinBy2(t) ? T.validateFinal(t, m.sa, m.sb) : null;
      if (err) {
        const el = app.querySelector(`.match-row[data-k="${k}"] .points-text`);
        el.textContent = err;
        el.classList.add('is-error');
        return;
      }
      m.status = 'done';
    } else {
      m.status = 'live';
    }
    Store.save(t);
    // Le classement glisse vers sa nouvelle position, le badge se retourne
    FX.flip('.pane-standings .st-row[data-team]', 'team', () => renderTournament(t.id));
    const newRow = app.querySelector(`.match-row[data-k="${k}"]`);
    FX.mark(newRow && newRow.querySelector('.status-toggle'), 'fx-flipin');
    if (m.status === 'done') {
      FX.mark(newRow, 'fx-done');
      [m.a, m.b].forEach((id) => FX.mark(app.querySelector(`.pane-standings .st-row[data-team="${id}"]`), 'fx-flash'));
      FX.sparks(newRow && newRow.querySelector('.status-toggle'), 12);
      if (!wasDone && T.autoStatus(t) === 'done') setTimeout(() => celebrateWinner(t), 900);
    }
    FX.mark(app.querySelector('.next-match'), 'fx-swap');
  }

  // Retour visuel sur un changement de score : le chiffre saute, « +1 » s'envole, étincelles pour ½ / Max
  function scoreFx(el, diff, side, quick) {
    if (!el) return;
    FX.pop(el);
    if (diff) FX.delta(el, `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`, side === 'sa' ? '#1E9FAB' : '#A0228F');
    if (quick && diff) FX.sparks(el, quick === 'max' ? 14 : 8);
  }

  // Après un résultat validé dans le tableau : la case du gagnant s'illumine et il arrive au tour suivant
  function celebrateBracket(t, r, i, wasDone = true) {
    const bm = app.querySelector(`.bm[data-r="${r}"][data-i="${i}"]`);
    if (bm) FX.mark(bm.querySelector('.slot.win'), 'fx-win');
    if (r >= 0 && r + 1 < t.rounds.length) {
      const nb = app.querySelector(`.bm[data-r="${r + 1}"][data-i="${Math.floor(i / 2)}"]`);
      if (nb) setTimeout(() => FX.mark(nb.querySelectorAll('.slot')[i % 2], 'fx-arrive'), 250);
    }
    FX.mark(app.querySelector('.next-match'), 'fx-swap');
    const champ = app.querySelector('.champ.has');
    if (r === t.rounds.length - 1 && champ) {
      FX.mark(champ, 'fx-champ');
      setTimeout(() => FX.confetti(champ, 60), 300);
    }
    if (!wasDone && T.autoStatus(t) === 'done') setTimeout(() => celebrateWinner(t), 900);
  }

  // Grande célébration du vainqueur (10 s), au thème du domaine : sport ou jeu vidéo
  function celebrateWinner(t) {
    const p = T.podium(t);
    if (!p || p[0] === null || p[0] === undefined) return;
    Victory.play(
      {
        theme: t.discipline && t.discipline.cat === 'game' ? 'game' : 'sport',
        winner: teamName(t, p[0]),
        second: p[1] !== null && p[1] !== undefined ? teamName(t, p[1]) : '',
        third: p[2] !== null && p[2] !== undefined ? teamName(t, p[2]) : '',
        reward: t.reward,
      },
      () => {
        FX.rain(1800);
        FX.mark(app.querySelector('.podium'), 'fx-pop');
      }
    );
  }

  /* ---------------- Démarrage ---------------- */

  /* ---------------- Transition entre les pages ----------------
     Des bandes en biais balaient l'écran, le nom de la page s'affiche au centre,
     la nouvelle page est dessinée pendant qu'elles couvrent l'écran, puis elles repartent. */
  const pt = document.getElementById('pageTransition');
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COVER_MS = 520; // temps pour couvrir l'écran
  const REVEAL_MS = 620; // temps pour le dévoiler
  let ptTimers = [];

  function pageLabel() {
    const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
    if (view === 'new') return 'Nouveau tournoi';
    if (view === 'share') return 'Tournoi partagé';
    if (view === 't' && id) return (Store.get(id) || {}).name || 'Tournoi';
    return 'Mes tournois';
  }

  function playTransition(run) {
    if (!pt || reducedMotion()) return run();
    ptTimers.forEach(clearTimeout); // clics rapides : on repart proprement
    pt.querySelector('.pt-page').textContent = pageLabel();
    pt.className = 'pt is-active is-cover';
    ptTimers = [
      setTimeout(() => {
        run();
        pt.className = 'pt is-active is-reveal';
      }, COVER_MS),
      setTimeout(() => (pt.className = 'pt'), COVER_MS + REVEAL_MS),
    ];
  }

  // Écran d'ouverture : l'écran démarre couvert (logo NexCup), puis se dévoile
  function playIntro() {
    if (!pt) return;
    if (reducedMotion()) return (pt.className = 'pt'); // pas d'animation : on découvre tout de suite
    pt.querySelector('.pt-page').textContent = 'Tournois sport & e-sport';
    pt.className = 'pt is-active is-covered is-intro';
    ptTimers = [
      setTimeout(() => (pt.className = 'pt is-active is-reveal is-intro'), 750),
      setTimeout(() => (pt.className = 'pt'), 750 + REVEAL_MS),
    ];
  }

  // Après l'animation de création, on arrive sur le tournoi sans rejouer la transition de page
  let skipNextTransition = false;
  window.addEventListener('hashchange', () => {
    if (skipNextTransition) {
      skipNextTransition = false;
      router();
    } else playTransition(router);
  });
  playIntro();
  router();
})();
