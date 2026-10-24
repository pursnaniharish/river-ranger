// Critter Rescue (tap a critter, then its clue) and the Jargon Jungle memory game.
(function () {
  RR.games = RR.games || {};

  RR.games.pairs = function (stage, api, done) {
    const root = api.root;
    const rounds = buildRounds(stage.rounds, stage.size);
    const total = rounds.reduce((n, r) => n + r.length, 0);
    let matchedAll = 0;
    let r = 0;

    // Never put two look-alike clues (same group) in one round.
    function buildRounds(count, size) {
      const pool = api.shuffle(RR_DATA.species.slice());
      const used = new Set();
      const out = [];
      for (let k = 0; k < count; k++) {
        const round = [];
        const groups = new Set();
        for (const sp of pool) {
          if (round.length === size) break;
          if (used.has(sp.id) || (sp.group && groups.has(sp.group))) continue;
          round.push(sp);
          used.add(sp.id);
          if (sp.group) groups.add(sp.group);
        }
        out.push(round);
      }
      return out;
    }

    function playRound() {
      if (r >= rounds.length) return done();
      const round = rounds[r];
      const lefts = api.shuffle(round.slice());
      const rights = api.shuffle(round.slice());
      const wrong = new Set();
      let sel = { l: null, r: null };
      let matched = 0;

      root.innerHTML = `<div class="q-card">` +
        `<p class="q-count">Round ${r + 1} of ${rounds.length}</p>` +
        `<h3 class="q">Match each critter to its clue!</h3>` +
        `<p class="hint">Tap a critter, then tap the clue that goes with it.</p>` +
        `<div class="match"><div class="match-col">` +
        lefts.map(sp => `<button class="m-item critter" data-side="l" data-id="${sp.id}"><span class="m-art">${RR.svg.critter(sp)}</span><span>${sp.name}</span></button>`).join('') +
        `</div><div class="match-col">` +
        rights.map(sp => `<button class="m-item clue" data-side="r" data-id="${sp.id}">${sp.why}</button>`).join('') +
        `</div></div><p class="match-fact" aria-live="polite"></p></div>`;

      const fact = root.querySelector('.match-fact');

      root.querySelectorAll('.m-item').forEach(b => b.addEventListener('click', () => {
        if (b.disabled) return;
        const side = b.dataset.side;
        root.querySelectorAll(`.m-item[data-side="${side}"]`).forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        sel[side] = b;
        RR.audio.play('click');
        if (!sel.l || !sel.r) return;

        const a = sel.l;
        const c = sel.r;
        const id = a.dataset.id;
        sel = { l: null, r: null };
        if (id === c.dataset.id) {
          [a, c].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); x.disabled = true; });
          if (!wrong.has(id)) api.answer(true, 'sp-' + id);
          else RR.audio.play('correct');
          matched++;
          matchedAll++;
          api.progress(matchedAll, total);
          const sp = RR_DATA.species.find(s => s.id === id);
          fact.innerHTML = `✅ <b>${sp.name}:</b> ${sp.fact}`;
          if (matched === round.length) {
            r++;
            setTimeout(() => api.feedback(true,
              'Every one of these critters needs connected streams to survive. Good crossings keep them safe!',
              playRound, { title: 'Round complete! 🎉', next: r < rounds.length ? 'Next round ▶' : 'Finish ▶' }), 700);
          }
        } else {
          [a, c].forEach(x => {
            x.classList.remove('sel');
            x.classList.add('shake');
            setTimeout(() => x.classList.remove('shake'), 450);
          });
          if (!wrong.has(id)) { wrong.add(id); api.answer(false, 'sp-' + id); } else RR.audio.play('wrong');
          fact.textContent = '❌ Not a match. Try again!';
        }
      }));
    }

    api.progress(0, total);
    playRound();
  };

  RR.games.memory = function (stage, api, done) {
    const root = api.root;
    const G = RR_DATA.glossary;
    const must = (stage.terms || []).map(t => G.find(g => g.term === t)).filter(Boolean);
    const rest = api.shuffle(G.filter(g => g.core && must.indexOf(g) < 0));
    const terms = must.concat(rest).slice(0, stage.pairs);
    const cards = api.shuffle(terms.reduce((all, g, k) => all.concat([
      { k, face: `<span class="mem-emoji">${g.emoji}</span><b>${g.term}</b>`, label: g.term },
      { k, face: `<span>${g.short}</span>`, label: g.short }
    ]), []));
    const t0 = Date.now();
    let open = [];
    let found = 0;
    let misses = 0;
    let lock = false;

    root.innerHTML = `<div class="q-card">` +
      `<h3 class="q">Memory match: find each ranger word and its meaning!</h3>` +
      `<p class="hint">Flip two cards at a time. Matching pairs stay open.</p>` +
      `<div class="memory">` +
      cards.map((c, i) => `<button class="mem" data-i="${i}" aria-label="Hidden card ${i + 1}"><span class="mem-back" aria-hidden="true">🌿</span><span class="mem-face">${c.face}</span></button>`).join('') +
      `</div><p class="mem-stats" aria-live="polite">Pairs found: 0 of ${terms.length}</p></div>`;

    const els = Array.from(root.querySelectorAll('.mem'));
    const stats = root.querySelector('.mem-stats');
    api.progress(0, terms.length);

    els.forEach((el, i) => el.addEventListener('click', () => {
      if (lock || el.classList.contains('flipped')) return;
      el.classList.add('flipped');
      el.setAttribute('aria-label', cards[i].label);
      RR.audio.play('flip');
      open.push(i);
      if (open.length < 2) return;

      const [a, b] = open;
      open = [];
      if (cards[a].k === cards[b].k) {
        els[a].classList.add('matched');
        els[b].classList.add('matched');
        found++;
        RR.audio.play('correct');
        api.progress(found, terms.length);
        stats.textContent = `Pairs found: ${found} of ${terms.length}`;
        if (found === terms.length) finish();
      } else {
        misses++;
        lock = true;
        setTimeout(() => {
          [a, b].forEach(j => {
            els[j].classList.remove('flipped');
            els[j].setAttribute('aria-label', `Hidden card ${j + 1}`);
          });
          lock = false;
        }, 1000);
      }
    }));

    function finish() {
      const secs = Math.round((Date.now() - t0) / 1000);
      const bonus = Math.max(10, 80 - misses * 4 - Math.max(0, secs - 60));
      api.bonus(bonus);
      setTimeout(() => api.feedback(true,
        `You found all ${terms.length} pairs in ${secs} seconds with ${misses} misses. Now let’s see if you remember what they mean!`,
        done, { title: 'Memory master! 🧠', pts: bonus, next: 'Word quiz ▶' }), 500);
    }
  };
})();
