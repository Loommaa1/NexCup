// Lieux de France : 18 régions + grandes villes en local (fonctionne hors connexion),
// complétés par toutes les communes via l'API officielle geo.api.gouv.fr.
const Places = (() => {
  const REGIONS = {
    ARA: 'Auvergne-Rhône-Alpes',
    BFC: 'Bourgogne-Franche-Comté',
    BRE: 'Bretagne',
    CVL: 'Centre-Val de Loire',
    COR: 'Corse',
    GE: 'Grand Est',
    HDF: 'Hauts-de-France',
    IDF: 'Île-de-France',
    NOR: 'Normandie',
    NA: 'Nouvelle-Aquitaine',
    OCC: 'Occitanie',
    PDL: 'Pays de la Loire',
    PACA: 'Provence-Alpes-Côte d’Azur',
    GUA: 'Guadeloupe',
    MTQ: 'Martinique',
    GUY: 'Guyane',
    REU: 'La Réunion',
    MAY: 'Mayotte',
  };

  // nom | département | région (classées par population décroissante)
  const CITIES = `Paris|75|IDF, Marseille|13|PACA, Lyon|69|ARA, Toulouse|31|OCC, Nice|06|PACA, Nantes|44|PDL
    Montpellier|34|OCC, Strasbourg|67|GE, Bordeaux|33|NA, Lille|59|HDF, Rennes|35|BRE, Toulon|83|PACA
    Reims|51|GE, Saint-Étienne|42|ARA, Le Havre|76|NOR, Villeurbanne|69|ARA, Dijon|21|BFC
    Grenoble|38|ARA, Angers|49|PDL, Nîmes|30|OCC, Saint-Denis|974|REU, Clermont-Ferrand|63|ARA
    Aix-en-Provence|13|PACA, Le Mans|72|PDL, Brest|29|BRE, Tours|37|CVL, Amiens|80|HDF, Limoges|87|NA
    Annecy|74|ARA, Perpignan|66|OCC, Boulogne-Billancourt|92|IDF, Metz|57|GE, Besançon|25|BFC
    Orléans|45|CVL, Rouen|76|NOR, Mulhouse|68|GE, Caen|14|NOR, Nancy|54|GE, Argenteuil|95|IDF
    Montreuil|93|IDF, Roubaix|59|HDF, Tourcoing|59|HDF, Avignon|84|PACA, Nanterre|92|IDF, Créteil|94|IDF
    Versailles|78|IDF, Poitiers|86|NA, Pau|64|NA, Dunkerque|59|HDF, La Rochelle|17|NA, Calais|62|HDF
    Cannes|06|PACA, Antibes|06|PACA, Béziers|34|OCC, Colmar|68|GE, Saint-Nazaire|44|PDL, Ajaccio|2A|COR
    Bastia|2B|COR, Bourges|18|CVL, Quimper|29|BRE, Valence|26|ARA, Troyes|10|GE, Chambéry|73|ARA
    Niort|79|NA, Lorient|56|BRE, Vannes|56|BRE, Cherbourg-en-Cotentin|50|NOR, Beauvais|60|HDF
    Saint-Malo|35|BRE, Bayonne|64|NA, Montauban|82|OCC, Albi|81|OCC, Carcassonne|11|OCC, Angoulême|16|NA
    Chartres|28|CVL, Blois|41|CVL, Laval|53|PDL, Cholet|49|PDL, La Roche-sur-Yon|85|PDL, Évreux|27|NOR
    Saint-Quentin|02|HDF, Belfort|90|BFC, Auxerre|89|BFC, Arras|62|HDF, Lens|62|HDF, Biarritz|64|NA
    Châtellerault|86|NA, Brive-la-Gaillarde|19|NA, Périgueux|24|NA, Agen|47|NA, Tarbes|65|OCC
    Narbonne|11|OCC, Sète|34|OCC, Fréjus|83|PACA, Gap|05|PACA, Valenciennes|59|HDF
    Charleville-Mézières|08|GE, Épinal|88|GE, Fort-de-France|972|MTQ, Pointe-à-Pitre|971|GUA
    Les Abymes|971|GUA, Cayenne|973|GUY, Saint-Pierre|974|REU, Mamoudzou|976|MAY`
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('|'))
    .map(([name, dept, reg]) => ({ name, dept, region: REGIONS[reg] }));

  // Recherche insensible aux accents, à la casse, aux tirets et aux apostrophes
  const norm = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim();

  const regionItem = (name) => ({ type: 'region', label: name, sub: 'Région', value: name });
  const cityItem = (c) => ({
    type: 'city',
    label: c.name,
    sub: [c.cp || c.dept, c.deptName || c.region].filter(Boolean).join(' · '),
    value: c.region ? `${c.name}, ${c.region}` : c.name,
    key: `${norm(c.name)}|${c.dept}`,
    commune: { name: c.name, dept: c.dept, insee: c.insee || null },
  });

  const isDept = (q) => /^(\d{2}|2[ab]|97\d)$/i.test(q);
  const isPostal = (q) => /^\d{5}$/.test(q);

  // Les noms qui commencent par la recherche passent avant ceux qui la contiennent
  function rank(list, q, get) {
    const starts = [];
    const contains = [];
    list.forEach((x) => {
      const n = norm(get(x));
      if (n.startsWith(q) || n.includes(' ' + q)) starts.push(x);
      else if (n.includes(q)) contains.push(x);
    });
    return starts.concat(contains);
  }

  function searchLocal(query) {
    const q = norm(query);
    const regions = Object.values(REGIONS).sort((a, b) => a.localeCompare(b, 'fr'));
    if (!q) return { regions: regions.map(regionItem), cities: CITIES.map(cityItem) };
    if (/^\d|^2[ab]$/i.test(q)) {
      // Numéro de département : grandes villes de ce département (le code postal est géré par l'API)
      return { regions: [], cities: CITIES.filter((c) => c.dept.toLowerCase() === q).map(cityItem) };
    }
    return {
      regions: rank(regions, q, (r) => r).map(regionItem),
      cities: rank(CITIES, q, (c) => c.name).slice(0, 20).map(cityItem),
    };
  }

  // Toutes les communes de France : villes, villages… (API publique et gratuite de l'État)
  //  - un nom (même partiel)       → les 50 communes correspondantes les plus peuplées
  //  - un code postal (86300)      → toutes les communes de ce code postal
  //  - un département (86, 2A, 974) → toutes les communes du département
  const MAX_BY_NAME = 50;
  const FIELDS = 'fields=nom,code,codeDepartement,codesPostaux,departement,region';

  async function searchRemote(query, signal) {
    const q = query.trim();
    let url;
    let mode = 'name';
    if (isPostal(q)) {
      mode = 'postal';
      url = `https://geo.api.gouv.fr/communes?codePostal=${q}&${FIELDS}`;
    } else if (isDept(q)) {
      mode = 'dept';
      url = `https://geo.api.gouv.fr/departements/${q.toUpperCase()}/communes?${FIELDS}`;
    } else if (/^\d+$/.test(q)) {
      return { items: [], hint: 'Tape le code postal complet (5 chiffres) ou un numéro de département.' };
    } else {
      url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&${FIELDS}&boost=population&limit=${MAX_BY_NAME}`;
    }

    const res = await fetch(url, { signal });
    if (res.status === 404) return { items: [], hint: '' };
    if (!res.ok) throw new Error('API indisponible');
    const data = await res.json();
    const items = data.map((c) =>
      cityItem({
        name: c.nom,
        insee: c.code,
        dept: c.codeDepartement,
        cp: mode === 'postal' ? q : (c.codesPostaux || [])[0],
        deptName: c.departement && c.departement.nom,
        region: c.region && c.region.nom,
      })
    );

    let hint = '';
    if (mode === 'dept' && items.length) hint = `${items.length} communes dans ce département.`;
    if (mode === 'name' && items.length >= MAX_BY_NAME) {
      hint = `Seules les ${MAX_BY_NAME} communes les plus peuplées sont affichées : précise le nom, ou tape un code postal.`;
    }
    return { items, hint };
  }

  /* ---------- Salles de sport et stades d'une commune ----------
     Source : Recensement des équipements sportifs (ministère des Sports), API ouverte. */
  const ES_API = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records';
  const CATEGORIES = [
    { label: 'Stades et terrains', families: ['Terrain de grands jeux', "Equipement d'athlétisme"] },
    { label: 'Salles et gymnases', families: ['Salle multisports', 'Salle non spécialisée', 'Salle ou terrain spécialisé', 'Salle de combat', "Equipement d'activités de forme et de santé"] },
    { label: 'City-stades et terrains de quartier', families: ['Multisports/City-stades', 'Terrain extérieur de petits jeux collectifs'] },
    { label: 'Autres équipements', families: ['Court de tennis', 'Bassin de natation', 'Boulodrome', 'Aire de sports de glaces', "Structure Artificielle d'Escalade", 'Skatepark & vélo Freestyle', 'Mur et fronton'] },
  ];
  const familyRank = {};
  CATEGORIES.forEach((c, i) => c.families.forEach((f) => (familyRank[f] = i)));

  const quote = (s) => '"' + String(s).replace(/"/g, '\\"') + '"';

  // Beaucoup de noms sont en MAJUSCULES dans la base : on les remet en casse normale
  const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'sur', 'sous', 'a', 'à']);
  function prettyName(s) {
    const n = s.trim().replace(/\s+/g, ' ');
    if (n !== n.toUpperCase()) return n;
    return n
      .toLowerCase()
      .split(' ')
      .map((w, i) => {
        if (i > 0 && SMALL.has(w)) return w;
        return w.replace(/(^|[-'’])(\p{L})/gu, (m, p, l) => p + l.toUpperCase()).replace(/^(D|L)'(\p{L})/u, (m, a, b) => a.toLowerCase() + "'" + b.toUpperCase());
      })
      .join(' ')
      .replace(/^./, (c) => c.toUpperCase());
  }

  const venueCache = new Map();

  async function searchVenues(commune, signal) {
    const key = commune.insee || `${commune.name}|${commune.dept}`;
    if (venueCache.has(key)) return venueCache.get(key);

    const fams = Object.keys(familyRank).map(quote).join(',');
    const place = commune.insee
      ? `new_code=${quote(commune.insee)}`
      : `new_name=${quote(commune.name)} and dep_code=${quote(commune.dept)}`;
    const url =
      `${ES_API}?select=inst_numero,inst_nom,equip_type_famille,count(*) as n` +
      `&group_by=inst_numero,inst_nom,equip_type_famille&limit=5000` +
      `&where=${encodeURIComponent(`${place} and equip_type_famille in (${fams})`)}`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('API indisponible');
    const { results = [] } = await res.json();

    // Une installation (ex. « Complexe sportif ») regroupe plusieurs équipements :
    // on la classe dans la catégorie la plus « stade / salle » de ses équipements.
    const byInst = new Map();
    results.forEach((r) => {
      if (!r.inst_nom) return;
      let v = byInst.get(r.inst_numero);
      if (!v) {
        v = { name: prettyName(r.inst_nom), cat: 9, families: new Set(), count: 0 };
        byInst.set(r.inst_numero, v);
      }
      v.cat = Math.min(v.cat, familyRank[r.equip_type_famille]);
      v.families.add(r.equip_type_famille);
      v.count += r.n;
    });

    const groups = CATEGORIES.map((c, i) => ({
      label: c.label,
      items: [...byInst.values()]
        .filter((v) => v.cat === i)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        .map((v) => ({
          label: v.name,
          sub: [...v.families]
            .sort((a, b) => familyRank[a] - familyRank[b])
            .slice(0, 2)
            .join(' · ') + (v.families.size > 2 ? ' …' : ''),
          value: v.name,
        })),
    })).filter((g) => g.items.length);

    venueCache.set(key, groups);
    return groups;
  }

  return { searchLocal, searchRemote, searchVenues, norm };
})();
