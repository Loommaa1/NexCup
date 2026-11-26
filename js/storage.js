// Persistance des tournois dans le navigateur (localStorage).
const Store = (() => {
  const KEY = 'arena.tournaments.v1';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function write(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  return {
    all() {
      return read().sort((a, b) => b.createdAt - a.createdAt);
    },
    get(id) {
      return read().find((t) => t.id === id) || null;
    },
    save(tournament) {
      const list = read();
      const i = list.findIndex((t) => t.id === tournament.id);
      if (i >= 0) list[i] = tournament;
      else list.push(tournament);
      write(list);
    },
    remove(id) {
      write(read().filter((t) => t.id !== id));
    },
  };
})();
