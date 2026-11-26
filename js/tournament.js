// Logique métier : création, tableau éliminatoire, championnat, classement.
const T = (() => {
  const POINTS = { win: 5, draw: 2, loss: 0 };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- Création ---------------- */

  function create(opts) {
    let names = opts.teamNames.slice();
    if (opts.random) names = shuffle(names);

    const t = {
      id: uid(),
      name: opts.name,
      location: opts.location,
      venue: opts.venue || '',
      // Domaine (sport / jeu vidéo) et façon de compter le score
      discipline: opts.discipline ? { id: opts.discipline.id, name: opts.discipline.name, cat: opts.discipline.cat } : null,
      subGame: opts.subGame || '', // ex. le jeu Roblox choisi
      scoreMode: opts.scoreMode || 'sets', // 'pts' = points plafonnés, 'sets' = manches gagnées (Bo)
      unit: opts.unit || 'manches',
      maxPoints: opts.scoreMode === 'pts' ? opts.maxPoints || null : null,
      // Règle des 2 points d'écart (ping-pong, volley…) : maxPoints devient le score à atteindre
      winBy2: opts.scoreMode === 'pts' && !!opts.maxPoints && !!opts.winBy2,
      hardCap: opts.scoreMode === 'pts' && opts.winBy2 ? opts.hardCap || null : null, // ex. 30 au badminton
      date: opts.date,
      reward: opts.reward,
      bo: opts.bo,
      type: opts.type, // 'elim' | 'league'
      random: opts.random,
      homeAway: opts.type === 'league' && opts.homeAway,
      teams: names.map((name, id) => ({ id, name })),
      createdAt: Date.now(),
    };

    if (t.type === 'elim') {
      t.rounds = buildBracket(t.teams.length);
      refreshBracket(t);
    } else {
      t.days = buildSchedule(t.teams.length, t.homeAway);
    }
    return t;
  }

  /* ---------------- Élimination directe ---------------- */

  const emptyMatch = () => ({ a: null, b: null, sa: null, sb: null, winner: null, status: 'pending' });

  // Construit un tableau à 2^k places ; les places manquantes deviennent des "exempts"
  // répartis régulièrement pour qu'aucun match n'oppose deux exempts.
  function buildBracket(n) {
    let size = 1;
    while (size < n) size *= 2;
    const firstCount = size / 2;
    const byes = size - n;
    const byeIdx = new Set();
    for (let i = 0; i < byes; i++) byeIdx.add(Math.floor((i * firstCount) / byes));

    let next = 0;
    const first = [];
    for (let k = 0; k < firstCount; k++) {
      const m = emptyMatch();
      m.a = next++;
      m.b = byeIdx.has(k) ? null : next++;
      m.status = m.b === null ? 'bye' : 'upcoming';
      if (m.b === null) m.winner = m.a;
      first.push(m);
    }

    const rounds = [first];
    let count = firstCount;
    while (count > 1) {
      count /= 2;
      rounds.push(Array.from({ length: count }, emptyMatch));
    }
    return rounds;
  }

  // Fait avancer les gagnants dans le tableau. Si un résultat précédent change,
  // les matchs suivants concernés sont réinitialisés.
  function refreshBracket(t) {
    const R = t.rounds;
    for (let r = 1; r < R.length; r++) {
      R[r].forEach((m, i) => {
        const na = R[r - 1][2 * i].winner;
        const nb = R[r - 1][2 * i + 1].winner;
        if (m.a !== na || m.b !== nb) {
          Object.assign(m, { a: na, b: nb, sa: null, sb: null, winner: null });
          m.status = na !== null && nb !== null ? 'upcoming' : 'pending';
        }
      });
    }
  }

  function roundName(matchCount) {
    return (
      { 1: 'Finale', 2: 'Demi-finales', 4: 'Quarts de finale', 8: 'Huitièmes de finale', 16: 'Seizièmes de finale' }[matchCount] ||
      `Tour à ${matchCount * 2}`
    );
  }

  const isPts = (t) => t.scoreMode === 'pts';
  const winsNeeded = (t) => (!isPts(t) && t.bo > 1 ? Math.ceil(t.bo / 2) : null);

  // Score maximum d'une équipe dans un match (null = pas de limite)
  const scoreMax = (t) => (isPts(t) ? t.maxPoints || null : winsNeeded(t));
  const isWinBy2 = (t) => isPts(t) && !!t.winBy2 && !!t.maxPoints;

  // Score le plus haut qu'une équipe peut avoir face à un adversaire qui a `other` points.
  // Avec 2 points d'écart : 11 contre ≤ 9, puis 12-10, 13-11… (plafond éventuel, ex. 30 au badminton).
  function capFor(t, other) {
    if (isWinBy2(t)) {
      const v = Math.max(t.maxPoints, (other ?? 0) + 2);
      return t.hardCap ? Math.min(v, t.hardCap) : v;
    }
    return scoreMax(t) ?? 99999;
  }

  // Le score final respecte-t-il la règle des 2 points d'écart ? (null = oui, sinon message)
  function checkWinBy2(t, sa, sb) {
    const target = t.maxPoints;
    const w = Math.max(sa, sb);
    const l = Math.min(sa, sb);
    if (t.hardCap && w > t.hardCap) return `Le score ne peut pas dépasser ${t.hardCap} ${t.unit}.`;
    if (w === target && l <= target - 2) return null; // ex. 11-7
    if (l >= target - 1 && w === l + 2) return null; // ex. 12-10, 15-13
    if (t.hardCap && w === t.hardCap && l === t.hardCap - 1) return null; // ex. 30-29
    if (w < target) return `Il faut atteindre ${target} ${t.unit} pour gagner.`;
    if (w - l < 2) return `Il faut 2 ${t.unit} d’écart pour gagner (ex. ${Math.max(target, l + 2)}–${l}).`;
    return `Score impossible : le match s’arrête à ${Math.max(target, l + 2)}–${l}.`;
  }

  function validateFinal(t, sa, sb) {
    if (sa === null || sb === null) return 'Saisis le score des deux équipes.';
    if (Number.isNaN(sa) || Number.isNaN(sb)) return 'Les scores doivent être des nombres entiers positifs.';
    if (sa === sb) return isWinBy2(t) ? `Égalité : il faut 2 ${t.unit} d’écart pour gagner.` : 'Pas d’égalité possible en élimination directe.';
    if (isWinBy2(t)) return checkWinBy2(t, sa, sb);
    if (isPts(t)) {
      const max = scoreMax(t);
      return max !== null && Math.max(sa, sb) > max ? `La limite est de ${max} ${t.unit} par équipe.` : null;
    }
    const need = winsNeeded(t);
    if (need !== null && (Math.max(sa, sb) !== need || Math.min(sa, sb) >= need)) {
      return `En Bo${t.bo}, le vainqueur doit avoir exactement ${need} manches gagnées.`;
    }
    return null;
  }

  function setElimResult(t, r, i, sa, sb) {
    const err = validateFinal(t, sa, sb);
    if (err) return err;
    const m = t.rounds[r][i];
    Object.assign(m, { sa, sb, winner: sa > sb ? m.a : m.b, status: 'done' });
    refreshBracket(t);
    return null;
  }

  function setElimLive(t, r, i, sa, sb) {
    if (Number.isNaN(sa) || Number.isNaN(sb)) return 'Les scores doivent être des nombres entiers positifs.';
    if (isWinBy2(t)) {
      if ((sa ?? 0) > capFor(t, sb) || (sb ?? 0) > capFor(t, sa)) return 'Score impossible avec la règle des 2 points d’écart.';
    } else if (isPts(t)) {
      const max = scoreMax(t);
      if (max !== null && Math.max(sa ?? 0, sb ?? 0) > max) return `La limite est de ${max} ${t.unit} par équipe.`;
    }
    const need = winsNeeded(t);
    if (need !== null && ((sa ?? 0) >= need || (sb ?? 0) >= need)) {
      return `Une équipe a déjà ${need} manches : clique plutôt sur « Valider le résultat ».`;
    }
    const m = t.rounds[r][i];
    Object.assign(m, { sa, sb, winner: null, status: 'live' });
    refreshBracket(t);
    return null;
  }

  function resetElim(t, r, i) {
    Object.assign(t.rounds[r][i], { sa: null, sb: null, winner: null, status: 'upcoming' });
    refreshBracket(t);
  }

  /* ---------------- Championnat ---------------- */

  // Calendrier "toutes rondes" (méthode du cercle). Nombre impair → une équipe exempte par journée.
  function buildSchedule(n, homeAway) {
    const ids = Array.from({ length: n }, (_, i) => i);
    if (n % 2) ids.push(null);
    const N = ids.length;
    let arr = ids;
    const days = [];

    for (let d = 0; d < N - 1; d++) {
      const matches = [];
      let rest = null;
      for (let k = 0; k < N / 2; k++) {
        let h = arr[k];
        let a = arr[N - 1 - k];
        if (h === null || a === null) {
          rest = h === null ? a : h;
          continue;
        }
        if ((d + k) % 2 === 1) [h, a] = [a, h]; // alterne domicile / extérieur
        matches.push({ a: h, b: a, sa: null, sb: null, status: 'upcoming' });
      }
      days.push({ n: d + 1, phase: 'aller', rest, matches });
      arr = [arr[0], arr[N - 1], ...arr.slice(1, N - 1)];
    }

    if (homeAway) {
      const count = days.length;
      days.slice().forEach((day, d) => {
        days.push({
          n: count + d + 1,
          phase: 'retour',
          rest: day.rest,
          matches: day.matches.map((m) => ({ a: m.b, b: m.a, sa: null, sb: null, status: 'upcoming' })),
        });
      });
    }
    return days;
  }

  function points(sa, sb) {
    if (sa > sb) return [POINTS.win, POINTS.loss];
    if (sa < sb) return [POINTS.loss, POINTS.win];
    return [POINTS.draw, POINTS.draw];
  }

  function standings(t) {
    const rows = t.teams.map((tm) => ({ id: tm.id, name: tm.name, j: 0, g: 0, n: 0, p: 0, gf: 0, ga: 0, pts: 0 }));
    t.days.forEach((day) =>
      day.matches.forEach((m) => {
        if (m.status !== 'done') return;
        const h = rows[m.a];
        const a = rows[m.b];
        const [ph, pa] = points(m.sa, m.sb);
        h.j++; a.j++;
        h.gf += m.sa; h.ga += m.sb;
        a.gf += m.sb; a.ga += m.sa;
        h.pts += ph; a.pts += pa;
        if (m.sa > m.sb) { h.g++; a.p++; }
        else if (m.sa < m.sb) { a.g++; h.p++; }
        else { h.n++; a.n++; }
      })
    );
    return rows.sort(
      (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.name.localeCompare(y.name, 'fr')
    );
  }

  /* ---------------- État global ---------------- */

  function status(t) {
    if (t.type === 'elim') {
      if (winner(t) !== null) return 'done';
      return t.rounds.flat().some((m) => m.status === 'live' || m.status === 'done') ? 'live' : 'upcoming';
    }
    const ms = t.days.flatMap((d) => d.matches);
    if (ms.length && ms.every((m) => m.status === 'done')) return 'done';
    return ms.some((m) => m.status !== 'upcoming') ? 'live' : 'upcoming';
  }

  function winner(t) {
    if (t.type === 'elim') return t.rounds[t.rounds.length - 1][0].winner;
    const ms = t.days.flatMap((d) => d.matches);
    return ms.length && ms.every((m) => m.status === 'done') ? standings(t)[0].id : null;
  }

  return {
    POINTS, create, roundName, winsNeeded, scoreMax, isPts, isWinBy2, capFor, validateFinal,
    setElimResult, setElimLive, resetElim,
    points, standings, status, winner,
  };
})();
