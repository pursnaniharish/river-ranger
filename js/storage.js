// Saves progress in this browser only. Every access is guarded so the game
// still works in private windows or when storage is blocked.
(function () {
  const KEY = 'riverRanger.v1';

  function fresh() {
    return { name: '', points: 0, levels: {}, badges: [], cards: [], missed: {}, muted: false, justFixed: null };
  }

  const ID = /^[a-z0-9-]{1,40}$/;
  const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const ids = v => Array.isArray(v) ? Array.from(new Set(v.filter(x => typeof x === 'string' && ID.test(x)))).slice(0, 50) : [];

  // Saved data can be edited by anyone with access to this browser (or by other
  // pages on the same web address), so keep only values of the expected shape.
  // Anything else falls back to a fresh value instead of reaching the page.
  function clean(d) {
    const s = fresh();
    if (!d || typeof d !== 'object') return s;
    if (typeof d.name === 'string') s.name = d.name.slice(0, 24);
    if (isInt(d.points, 0, 1e7)) s.points = d.points;
    if (d.levels && typeof d.levels === 'object') {
      Object.keys(d.levels).forEach(k => {
        const lv = d.levels[k];
        if (/^[1-8]$/.test(k) && lv && isInt(lv.stars, 1, 3)) s.levels[k] = { stars: lv.stars };
      });
    }
    s.badges = ids(d.badges);
    s.cards = ids(d.cards);
    if (d.missed && typeof d.missed === 'object') {
      Object.keys(d.missed).slice(0, 500).forEach(k => {
        if (ID.test(k) && isInt(d.missed[k], 1, 99)) s.missed[k] = d.missed[k];
      });
    }
    s.muted = d.muted === true;
    if (isInt(d.justFixed, 1, 8)) s.justFixed = d.justFixed;
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return clean(JSON.parse(raw));
    } catch (e) { /* storage unavailable or unreadable */ }
    return fresh();
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return fresh();
  }

  window.RR = window.RR || {};
  RR.store = { load, save, reset };
})();
