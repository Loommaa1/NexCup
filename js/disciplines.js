// Domaines : sports et jeux vidéo, avec la façon de compter le score.
//  - mode 'pts'  : le score est en points / buts / rounds…, plafonné à `max` (limite modifiable à la création)
//  - mode 'sets' : le score est en manches gagnées, avec un format Bo1 / Bo3 / Bo5
const Disciplines = (() => {
  // nom | mode | unité | limite (pour 'pts') | 2 = règle des 2 points d'écart | plafond absolu
  const SPORTS = `
    Athlétisme (relais)|pts|points|100
    Badminton|pts|points|21|2|30
    Baby-foot|pts|buts|10
    Baseball|pts|points|20
    Basket-ball|pts|points|150
    Basket 3x3|pts|points|21
    Beach soccer|pts|buts|15
    Beach-volley|pts|points|21|2
    Billard|sets|manches
    Boules lyonnaises|pts|points|13
    Bowling|pts|quilles|300
    Boxe|pts|rounds|12
    Cricket|pts|points|400
    Curling|pts|points|15
    Dames|sets|parties
    Dodgeball|sets|manches
    Échecs|sets|parties
    Escrime|pts|touches|15
    Fléchettes|sets|manches
    Flag football|pts|points|60
    Football|pts|buts|10
    Football américain|pts|points|70
    Foot à 5|pts|buts|15
    Futsal|pts|buts|15
    Golf (match play)|pts|trous|18
    Handball|pts|buts|50
    Hockey sur gazon|pts|buts|10
    Hockey sur glace|pts|buts|10
    Judo|pts|points|10
    Karaté|pts|points|8
    Kick-boxing|pts|rounds|5
    Korfbal|pts|buts|40
    Lacrosse|pts|buts|20
    Lutte|pts|points|15
    MMA|pts|rounds|5
    Mölkky|pts|points|50
    Netball|pts|buts|80
    Padel|sets|sets
    Pétanque|pts|points|13
    Pickleball|pts|points|11|2
    Rink hockey / Roller hockey|pts|buts|15
    Rugby à XIII|pts|points|80
    Rugby à XV|pts|points|100
    Rugby à 7|pts|points|60
    Sepak takraw|pts|points|21|2
    Softball|pts|points|20
    Squash|pts|points|11|2
    Taekwondo|pts|points|30
    Tennis|sets|sets
    Tennis de table|pts|points|11|2
    Tir à l'arc (duel)|pts|points|6
    Ultimate frisbee|pts|points|15
    Volley-ball|pts|points|25|2
    Water-polo|pts|buts|25`;

  // Les 50 jeux vidéo les plus connus en compétition
  const GAMES = `
    Among Us|pts|points|10
    Apex Legends|pts|points|100
    Brawl Stars|sets|manches
    Brawlhalla|sets|manches
    Call of Duty: Black Ops 6|pts|points|250
    Call of Duty: Warzone|pts|points|100
    Clash of Clans|pts|étoiles|3
    Clash Royale|pts|couronnes|3
    Counter-Strike 2|pts|rounds|13
    Dead by Daylight|pts|points|4
    Dota 2|sets|parties
    Dragon Ball FighterZ|sets|manches
    EA Sports FC 25|pts|buts|10
    eFootball|pts|buts|10
    F1 25|pts|points|25
    Fall Guys|pts|points|10
    Fortnite|pts|points|100
    Free Fire|pts|points|100
    GeoGuessr|pts|points|25000
    Gran Turismo 7|pts|points|25
    Guilty Gear Strive|sets|manches
    Halo Infinite|pts|points|50
    Hearthstone|sets|parties
    Honor of Kings|sets|parties
    Just Dance|pts|points|13333
    League of Legends|sets|parties
    League of Legends: Wild Rift|sets|parties
    Mario Kart 8 Deluxe|pts|points|60
    Marvel Rivals|sets|maps
    Minecraft|pts|points|100
    Mobile Legends: Bang Bang|sets|parties
    Mortal Kombat 1|sets|manches
    NBA 2K25|pts|points|150
    Overwatch 2|sets|maps
    Pokémon Écarlate et Violet|sets|parties
    Pokémon Unite|sets|parties
    PUBG: Battlegrounds|pts|points|100
    Rainbow Six Siege|pts|rounds|7
    Roblox|pts|points|
    Rocket League|pts|buts|10
    Splatoon 3|pts|points|100
    StarCraft II|sets|parties
    Street Fighter 6|sets|manches
    Super Mario Party Jamboree|pts|étoiles|10
    Super Smash Bros. Ultimate|sets|manches
    Teamfight Tactics|pts|points|8
    Tekken 8|sets|manches
    Tetris|sets|parties
    Trackmania|pts|points|100
    Valorant|pts|rounds|13
    World of Warcraft (arène)|sets|manches`;

  const slug = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const parse = (text, cat) =>
    text
      .trim()
      .split('\n')
      .map((l) => l.trim().split('|'))
      .map(([name, mode, unit, max, by2, cap]) => ({
        id: `${cat}-${slug(name)}`, name, cat, mode, unit,
        max: max ? Number(max) : null,
        winBy2: by2 === '2',
        hardCap: cap ? Number(cap) : null,
      }));

  // Sports / jeux à filet ou raquette : on propose d'office la règle des 2 points d'écart
  // (sert pour les jeux trouvés en ligne et les jeux Roblox comme « Volleyball Legends »).
  const WIN_BY_2 = /volley|ping[\s-]?pong|tennis de table|table tennis|badminton|squash|pickleball|sepak/i;
  const suggestsWinBy2 = (name) => WIN_BY_2.test(name || '');
  // Score à atteindre conseillé quand le nom fait penser à un de ces sports
  const suggestedTarget = (name) => (/volley/i.test(name) ? 25 : /badminton|sepak/i.test(name) ? 21 : 11);

  const CUSTOM = { id: 'custom', name: 'Autre (personnalisé)', cat: 'other', mode: 'pts', unit: 'points', max: null };
  const ALL = [...parse(SPORTS, 'sport'), ...parse(GAMES, 'game'), CUSTOM];
  const BY_ID = new Map(ALL.map((d) => [d.id, d]));

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const byName = (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

  // Texte sous le nom dans les menus : « Buts · limite 10 » ou « En sets (Bo3 / Bo5) »
  function describe(d) {
    if (d.mode === 'sets') return `En ${d.unit} · Bo1 / Bo3 / Bo5`;
    if (d.winBy2 && d.max) return `${d.max} pts · 2 d’écart`;
    return d.max ? `${d.unit[0].toUpperCase() + d.unit.slice(1)} · limite ${d.max}` : 'Limite au choix';
  }

  const item = (d) => ({ label: d.name, sub: describe(d), value: d.name, discipline: d });

  // Groupes pour un menu déroulant : liste intégrée filtrée + résultats en ligne (`remote`)
  function groups(query, remote = { sports: [], games: [] }) {
    const q = norm(query.trim());
    const match = (d) => !q || norm(d.name).includes(q);
    // Ordre alphabétique, mais le nom identique à la recherche passe en premier (« roblox » → Roblox)
    const exactFirst = (a, b) => (norm(b.name) === q) - (norm(a.name) === q) || byName(a, b);
    const merge = (cat, extra) => {
      const local = ALL.filter((d) => d.cat === cat && match(d));
      const seen = new Set(local.map((d) => norm(d.name)));
      return local.concat(extra.filter((d) => !seen.has(norm(d.name)))).sort(exactFirst).map(item);
    };
    return [
      { label: 'Sports', items: merge('sport', remote.sports) },
      { label: 'Jeux vidéo', items: merge('game', remote.games) },
      { label: 'Autre', items: [CUSTOM].filter(match).map(item) },
    ];
  }

  /* ---------- Tous les sports et tous les jeux vidéo (Wikidata, base libre de Wikipédia) ---------- */
  const WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
  const KINDS = { sport: 'P31=Q31629', game: 'P31=Q7889' }; // « type de sport », « jeu vidéo »
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  async function searchKind(cat, query, signal) {
    const q = `haswbstatement:${KINDS[cat]} ${query.trim().replace(/[*"]/g, '')}*`;
    const res = await fetch(`${WD}&action=query&list=search&srnamespace=0&srlimit=20&srprop=&srsearch=${encodeURIComponent(q)}`, { signal });
    const ids = (await res.json()).query.search.map((r) => r.title);
    if (!ids.length) return [];
    const res2 = await fetch(`${WD}&action=wbgetentities&props=labels&languages=fr&languagefallback=1&ids=${ids.join('|')}`, { signal });
    const { entities } = await res2.json();
    const byNorm = new Map(ALL.map((d) => [norm(d.name), d]));
    const seen = new Set(); // Wikidata a parfois plusieurs fiches au même nom
    return ids
      .map((id) => {
        const label = entities[id] && entities[id].labels.fr && entities[id].labels.fr.value;
        if (!label || /^Q\d+$/.test(label)) return null;
        const name = capitalize(label);
        if (seen.has(norm(name))) return null;
        seen.add(norm(name));
        // Si le jeu / sport est déjà dans la liste intégrée, on garde ses réglages de score
        if (byNorm.has(norm(name))) return byNorm.get(norm(name));
        const by2 = suggestsWinBy2(name);
        return { id: `wd-${id}`, name, cat, mode: 'pts', unit: 'points', max: by2 ? suggestedTarget(name) : null, winBy2: by2, hardCap: null };
      })
      .filter(Boolean);
  }

  async function searchAll(query, signal) {
    const [sports, games] = await Promise.all([searchKind('sport', query, signal), searchKind('game', query, signal)]);
    return { sports, games };
  }

  /* ---------- Jeux Roblox ----------
     L'API officielle de Roblox refuse les appels depuis un site web : on passe par RoProxy,
     un relais communautaire (non officiel) vers cette même API. Liste intégrée en secours. */
  const ROBLOX_POPULAR = [
    '99 Nights in the Forest', 'Adopt Me!', 'Arsenal', 'BedWars', 'Bee Swarm Simulator', 'Blade Ball', 'Blox Fruits',
    'Brookhaven RP', 'Car Dealership Tycoon', 'Da Hood', 'Doors', 'Dress to Impress', 'Epic Minigames', 'Evade', 'Fisch',
    'Flee the Facility', 'Funky Friday', 'Grow a Garden', 'Hide and Seek Extreme', 'Jailbreak', 'MeepCity',
    'Murder Mystery 2', 'Natural Disaster Survival', 'Pet Simulator 99', 'Phantom Forces', 'Piggy', 'Rivals',
    'Royale High', 'Shindo Life', 'Speed Run 4', 'Steal a Brainrot', 'The Strongest Battlegrounds', 'Theme Park Tycoon 2',
    'Tower of Hell', 'Volleyball Legends', 'Welcome to Bloxburg', 'Work at a Pizza Place',
  ];

  // « [🐶] Adopt Me! » → « Adopt Me! »
  const cleanRoblox = (s) =>
    s.replace(/^\s*(\[[^\]]*\]\s*|\([^)]*\)\s*)+/, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();

  function robloxLocal(query) {
    const q = norm(query.trim());
    return ROBLOX_POPULAR.filter((n) => !q || norm(n).includes(q)).map((name) => ({ name, players: null }));
  }

  async function searchRoblox(query, signal) {
    const url = `https://apis.roproxy.com/search-api/omni-search?searchQuery=${encodeURIComponent(query.trim())}&pageType=all&sessionId=nexcup`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Roblox indisponible');
    const data = await res.json();
    const out = [];
    const seen = new Set();
    (data.searchResults || [])
      .filter((g) => g.contentGroupType === 'Game')
      .flatMap((g) => g.contents || [])
      .forEach((c) => {
        const name = cleanRoblox(c.name || '');
        if (!name || seen.has(norm(name))) return;
        seen.add(norm(name));
        out.push({ name, players: c.playerCount ?? null });
      });
    return out;
  }

  return {
    all: ALL, get: (id) => BY_ID.get(id) || null, groups, describe, searchAll, searchRoblox, robloxLocal, norm,
    suggestsWinBy2, suggestedTarget,
  };
})();
