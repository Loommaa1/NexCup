// Partage d'un tournoi par lien.
// Pas encore de serveur : le tournoi entier est compressé (deflate) puis encodé dans l'adresse
//   https://site/#/share/<code>
// Tes amis ouvrent le lien, voient un aperçu et peuvent ajouter le tournoi à leurs propres tournois
// (c'est une copie à l'instant du partage : pas de mise à jour en direct).
const Share = (() => {
  const toB64url = (bytes) => {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64url = (s) => {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  };
  const canZip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
  }

  // « z » + données compressées, ou « j » + JSON brut si le navigateur ne sait pas compresser
  async function encode(t) {
    const json = new TextEncoder().encode(JSON.stringify({ v: 1, t }));
    if (canZip) return 'z' + toB64url(await pipe(json, new CompressionStream('deflate-raw')));
    return 'j' + toB64url(json);
  }

  async function decode(code) {
    const kind = code[0];
    let bytes = fromB64url(code.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') throw new Error('format inconnu');
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const t = data && data.t;
    if (!t || !t.id || !t.name || !Array.isArray(t.teams) || !(t.rounds || t.days)) throw new Error('tournoi invalide');
    return t;
  }

  async function link(t) {
    const base = location.origin + location.pathname;
    return `${base}#/share/${await encode(t)}`;
  }

  // Le site tourne-t-il seulement sur cet ordinateur ? (les amis ne pourront pas ouvrir le lien)
  const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';

  return { encode, decode, link, isLocal };
})();
