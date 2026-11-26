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
  const POINTS_BANNER = `<div class="info-banner"><b>Points :</b> victoire ${T.POINTS.win} · égalité ${T.POINTS.draw} pour chaque équipe · défaite ${T.POINTS.loss}</div>`;

  const ICON = {
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
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
  const teamName = (t, id) => (id === null || id === undefined ? '' : t.teams[id].name);

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
    const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
    if (view === 'new') {
      const did = id ? decodeURIComponent(id) : null;
      renderCreate(did ? (homeDomain && homeDomain.id === did ? homeDomain : Disciplines.get(did)) : null);
    }
    else if (view === 't' && id) renderTournament(id);
    else renderHome();
    window.scrollTo(0, 0);
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

  function renderHome() {
    const all = Store.all();
    app.innerHTML = `
      <div class="page">
        <header class="topbar"><span class="brand">ARENA</span><span class="muted">Accueil</span></header>
        ${
          all.length
            ? '<h1 class="h1">Mes tournois</h1>'
            : `<div>
                 <h1 class="h1">Organise ton prochain tournoi</h1>
                 <p class="lead">Sport ou jeux vidéo, en quelques minutes.</p>
               </div>`
        }
        ${domainComboHTML('homeDomain', 'Domaine', 'Tous les sports et jeux vidéo')}
        <div id="homeList" class="cards"></div>
        <a class="btn btn-primary btn-lg sticky-bottom" id="createBtn" href="#/new">${ICON.plus}Créer un tournoi</a>
      </div>`;

    const listEl = app.querySelector('#homeList');
    const createBtn = app.querySelector('#createBtn');

    function renderList() {
      const list = homeDomain ? all.filter((t) => t.discipline && t.discipline.id === homeDomain.id) : all;
      createBtn.href = homeDomain ? `#/new/${encodeURIComponent(homeDomain.id)}` : '#/new';
      createBtn.lastChild.textContent = homeDomain ? `Créer un tournoi de ${homeDomain.name}` : 'Créer un tournoi';
      listEl.innerHTML = list.length
        ? list.map(tournamentCard).join('')
        : `<div class="empty">
             <strong>${homeDomain ? `Aucun tournoi de ${esc(homeDomain.name)}` : 'Aucun tournoi pour l’instant'}</strong>
             <span>Tes tournois créés apparaîtront ici.</span>
           </div>`;
    }

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
    renderList();

    app.onclick = async (e) => {
      const b = e.target.closest('[data-action="delete-card"]');
      if (!b) return;
      const t = Store.get(b.dataset.id);
      if (t && (await askDelete(t))) {
        Store.remove(t.id);
        delete ui[t.id];
        renderHome();
      }
    };
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
        ${kv('Participants', `${t.teams.length} équipes`)}
        ${kv('Format', formatLabel(t))}
        ${t.reward ? kv('Récompense', t.reward) : ''}
        ${w !== null ? kv('Vainqueur', teamName(t, w)) : ''}
        <div class="t-card-actions">
          <a class="btn btn-outline" href="#/t/${t.id}">Voir le tournoi</a>
          ${s === 'done' ? `<button type="button" class="btn btn-danger" data-action="delete-card" data-id="${t.id}" aria-label="Supprimer ${esc(t.name)}">${ICON.trash}Supprimer</button>` : ''}
        </div>
      </article>`;
  }

  /* ---------------- Création ---------------- */

  function renderCreate(preset) {
    const st = { bo: 3, type: 'elim', count: 8, names: [], discipline: null };

    app.innerHTML = `
      <div class="page">
        <header class="topbar">
          <span class="title-lg">Nouveau tournoi</span>
          <a href="#/" class="icon-link" aria-label="Fermer">${ICON.close}</a>
        </header>
        <form id="createForm" class="form" novalidate>
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
          <div class="row2">
            <label class="field"><span class="label">Date</span>
              <input class="input" type="date" name="date" value="${todayIso()}"></label>
            <label class="field"><span class="label">Participants / équipes</span>
              <input class="input" type="number" name="count" min="2" max="32" value="${st.count}"></label>
          </div>
          <label class="field"><span class="label">Récompenses</span>
            <input class="input" name="reward" placeholder="Cagnotte 500 €" maxlength="80"></label>

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
            ${POINTS_BANNER}
          </div>

          <label class="check"><input type="checkbox" name="random">
            <span class="check-label">Équipes aléatoires</span><span class="check-hint" id="randomHint"></span></label>

          <div class="field"><span class="label">Noms des équipes</span>
            <div class="counter" id="teamCounter"></div>
            <div class="team-list" id="teamList"></div>
          </div>

          <p class="error" id="formError" hidden></p>
          <button type="submit" class="btn btn-primary btn-lg">Créer le tournoi</button>
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
          <label class="team-row"><span>Équipe ${i + 1} :</span>
            <input class="input input-sm" placeholder="Nom de l’équipe" maxlength="40" value="${esc(st.names[i] || '')}"></label>`
      ).join('');
      updateCounter();
    }

    function updateCounter() {
      const filled = [...teamList.querySelectorAll('input')].filter((i) => i.value.trim()).length;
      form.querySelector('#teamCounter').textContent =
        `${filled} / ${st.count} équipes saisies` + (filled < st.count ? ' — les cases vides seront nommées « Équipe N »' : '');
    }

    function updateHints() {
      form.querySelector('#leagueOpts').hidden = st.type !== 'league';
      const perPhase = st.count % 2 === 0 ? st.count - 1 : st.count;
      const total = perPhase * (field('homeAway').checked ? 2 : 1);
      form.querySelector('#daysHint').textContent = `${total} journée${total > 1 ? 's' : ''}`;
      form.querySelector('#randomHint').textContent = field('random').checked ? 'Tirage au sort' : 'Ordre de saisie';
    }

    form.addEventListener('click', (e) => {
      const b = e.target.closest('.segmented button');
      if (!b) return;
      const seg = b.parentElement;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      st[seg.dataset.name] = seg.dataset.name === 'bo' ? Number(b.dataset.value) : b.dataset.value;
      updateHints();
    });

    form.addEventListener('input', (e) => {
      if (e.target.name === 'count') {
        const v = parseInt(e.target.value, 10);
        if (v >= 2 && v <= 32) {
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
        v = Math.min(32, Math.max(2, v));
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

      const names = Array.from({ length: st.count }, (_, i) => (st.names[i] || '').trim() || `Équipe ${i + 1}`);
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
        teamNames: names,
      });
      Store.save(t);
      location.hash = `#/t/${t.id}`;
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
  }

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

  function renderTournament(id) {
    const t = Store.get(id);
    if (!t) {
      location.hash = '#/';
      return;
    }
    const u = ui[id] || (ui[id] = initUi(t));
    const s = T.status(t);
    const w = T.winner(t);
    const tabs = t.type === 'elim'
      ? [['bracket', 'Tableau'], ['matches', 'Matchs']]
      : [['standings', 'Classement'], ['matches', 'Matchs']];
    const meta = [domainLabel(t), t.venue, t.location, fmtDate(t.date), `${t.teams.length} équipes`, formatLabel(t)].filter(Boolean).join(' · ');

    let body;
    if (t.type === 'elim') body = u.tab === 'bracket' ? bracketHTML(t) : elimMatchesHTML(t);
    else body = u.tab === 'standings' ? standingsHTML(t) : leagueMatchesHTML(t, u);

    app.innerHTML = `
      <div class="page ${t.type === 'elim' && u.tab === 'bracket' ? 'page-wide' : ''}">
        <header class="topbar">
          <a href="#/" class="back">${ICON.left}Mes tournois</a>
          <span class="brand">ARENA</span>
        </header>
        <div class="t-head">
          <div><h1 class="h1">${esc(t.name)}</h1><p class="muted">${esc(meta)}</p></div>
          <span class="badge badge-${s}">${STATUS[s]}</span>
        </div>
        ${
          w !== null
            ? `<div class="winner-banner">${ICON.trophy}
                 <div><span>Vainqueur</span><strong>${esc(teamName(t, w))}</strong></div>
                 ${t.reward ? `<em>${esc(t.reward)}</em>` : ''}
               </div>`
            : ''
        }
        <div class="segmented" role="tablist">
          ${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${u.tab === k}" data-action="tab" data-tab="${k}" class="${u.tab === k ? 'active' : ''}">${l}</button>`).join('')}
        </div>
        <div id="view" class="section">${body}</div>
        <button type="button" class="btn btn-danger-ghost" data-action="delete">Supprimer le tournoi</button>
      </div>`;

    app.onclick = async (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'tab') {
        u.tab = el.dataset.tab;
        renderTournament(id);
      } else if (a === 'delete') {
        if (await askDelete(t)) {
          Store.remove(id);
          delete ui[id];
          location.hash = '#/';
        }
      } else if (a === 'score') {
        openScoreDialog(t, +el.dataset.r, +el.dataset.i);
      } else if (a === 'phase') {
        u.phase = el.dataset.phase;
        u.dayIdx = firstOpenDay(t, u.phase);
        renderTournament(id);
      } else if (a === 'prev' || a === 'next') {
        u.dayIdx += a === 'prev' ? -1 : 1;
        renderTournament(id);
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
      if (!el.classList.contains('l-score')) return;
      const v = parseInt(el.value, 10);
      setLeagueScore(t, u, +el.dataset.k, el.dataset.side, { value: Number.isNaN(v) ? null : v });
    };
    app.onchange = (e) => {
      // À la sortie du champ, on affiche la valeur retenue (ex. ramenée à la limite)
      const el = e.target;
      if (!el.classList.contains('l-score')) return;
      const m = currentDay(t, u).matches[+el.dataset.k];
      el.value = m[el.dataset.side] ?? '';
    };
  }

  /* ---------------- Élimination : tableau ---------------- */

  function bracketHTML(t) {
    const champ = T.winner(t);
    const sub = `${t.random ? 'Tirage au sort effectué' : 'Ordre de saisie'} · ${t.teams.length} équipes · ${formatLabel(t)}`;
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
        <p class="board-help">Clique sur un match pour saisir le score. Le gagnant passe automatiquement au tour suivant.</p>
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
    const toPlay = all.filter((x) => x.m.status === 'upcoming' || x.m.status === 'live');
    const pending = all.filter((x) => x.m.status === 'pending').length;
    const done = all.filter((x) => x.m.status === 'done').reverse();

    const eliminated = new Set(done.map((x) => (x.m.winner === x.m.a ? x.m.b : x.m.a)));

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
          <button type="button" class="btn btn-outline btn-sm" data-action="score" data-r="${r}" data-i="${i}">Saisir le score</button>
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
            <button type="button" class="btn btn-ghost btn-sm" data-action="score" data-r="${r}" data-i="${i}">Modifier</button>
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
        <h2 class="h2">Équipes <span class="count">${t.teams.length - eliminated.size} en lice</span></h2>
        <div class="team-chips">
          ${t.teams.map((tm) => `<span class="team-chip ${eliminated.has(tm.id) ? 'out' : ''}">${esc(tm.name)}</span>`).join('')}
        </div>
      </section>`;
  }

  /* ---------------- Élimination : saisie du score ---------------- */

  function openScoreDialog(t, r, i) {
    const m = t.rounds[r][i];
    if (m.a === null || m.b === null) return;
    const need = T.winsNeeded(t);
    const cap = T.scoreMax(t); // limite de points (ou de manches) ; null = pas de limite
    const pts = T.isPts(t);
    const next = r + 1 < t.rounds.length ? t.rounds[r + 1][Math.floor(i / 2)] : null;
    const nextPlayed = next && (next.status === 'done' || next.status === 'live');

    dialog.innerHTML = `
      <form class="dlg" method="dialog">
        <div class="dlg-head">
          <span class="dlg-round">${T.roundName(t.rounds[r].length)}</span>
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
      let v = sc[side] + Number(b.dataset.step || 0);
      if (b.dataset.quick === 'half') v = sc[side] + half; // ajoute la moitié de la limite
      if (b.dataset.quick === 'max') v = maxFor(side); // met directement le maximum
      sc[side] = Math.min(maxFor(side), Math.max(0, v));
      clampOther(side);
      updateScore();
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
          <span>#</span><span class="l">Équipe</span><span title="Joués">J</span><span title="Gagnés">G</span>
          <span title="Nuls">N</span><span title="Perdus">P</span><span title="Différence">Diff</span><span>PTS</span>
        </div>
        ${rows
          .map(
            (r, i) => `
          <div class="st-row ${started && i === 0 ? 'lead' : ''}" role="row">
            <span class="muted">${i + 1}</span><span class="l name">${esc(r.name)}</span>
            <span>${r.j}</span><span>${r.g}</span><span>${r.n}</span><span>${r.p}</span>
            <span>${fmtDiff(r.gf - r.ga)}</span><span class="pts">${r.pts}</span>
          </div>`
          )
          .join('')}
      </div>
      ${POINTS_BANNER}
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
    const [pa, pb] = T.points(m.sa, m.sb);
    return `${m.status === 'live' ? 'Provisoire · ' : ''}+${pa} / +${pb} pts`;
  }

  const toggleHTML = (m, k) =>
    `<button type="button" class="status-toggle st-${m.status}" data-action="toggle" data-k="${k}"><span class="status-dot"></span>${MATCH_STATUS[m.status]}</button>`;

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
            <div class="match-meta"><span class="points-text">${ptsText(t, m)}</span>${toggleHTML(m, k)}</div>
          </div>`
          )
          .join('')}
        ${day.rest !== null ? `<div class="rest">Exempt cette journée : <b>${esc(teamName(t, day.rest))}</b></div>` : ''}
      </div>
      ${POINTS_BANNER}
      <p class="helper">Utilise les boutons <b>+</b> / <b>−</b>${T.scoreMax(t) !== null ? `, <b>½</b> (ajoute ${Math.max(1, Math.floor(T.scoreMax(t) / 2))}) et <b>Max</b> (${T.isWinBy2(t) ? 'score gagnant' : T.scoreMax(t)})` : ''} ou tape le score.
        ${T.isWinBy2(t) ? `Match en ${T.scoreMax(t)} points avec <b>2 points d’écart</b> : le match n’est marqué <b>Fini</b> qu’avec un score gagnant valide.` : ''} Clique sur le badge pour passer de <b>À venir</b> à <b>En cours</b> puis <b>Fini</b>.
        ${t.homeAway ? ' Les matchs retour reprennent les mêmes rencontres, domicile et extérieur inversés.' : ''}</p>`;
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
    const day = currentDay(t, u);
    const m = day.matches[k];
    const otherSide = side === 'sa' ? 'sb' : 'sa';
    const cap = leagueCap(t, m, side);
    const cur = m[side] ?? 0;
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
    const ptsEl = row.querySelector('.points-text');
    ptsEl.textContent = ptsText(t, m);
    ptsEl.classList.remove('is-error');
    row.querySelector('.status-toggle').outerHTML = toggleHTML(m, k);
    const s = T.status(t);
    const badge = app.querySelector('.t-head .badge');
    badge.className = `badge badge-${s}`;
    badge.textContent = STATUS[s];
    const sub = daySub(t, u, day);
    const subEl = app.querySelector('#daySub');
    subEl.textContent = sub.text;
    subEl.classList.toggle('live', sub.live);
  }

  function toggleLeagueMatch(t, u, k) {
    const m = currentDay(t, u).matches[k];
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
    renderTournament(t.id);
  }

  /* ---------------- Démarrage ---------------- */

  window.addEventListener('hashchange', router);
  router();
})();
