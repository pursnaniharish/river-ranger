// Problem Detective: drag (or tap) each clue into Undersized / Shallow / Perched.
(function () {
  RR.games = RR.games || {};

  RR.games.sort = function (stage, api, done) {
    const root = api.root;
    const bins = RR_DATA.sortBins;
    const items = balanced(stage.n);
    let i = 0;

    // Take clues round-robin from each bin so every problem shows up.
    function balanced(n) {
      const byBin = bins.map(b => api.shuffle(RR_DATA.sortItems.filter(it => it.bin === b.id)));
      const out = [];
      for (let k = 0; out.length < n && k < 20; k++) {
        byBin.forEach(list => { if (list[k] && out.length < n) out.push(list[k]); });
      }
      return api.shuffle(out);
    }

    function show() {
      if (i >= items.length) return done();
      const it = items[i];
      api.progress(i, items.length);
      root.innerHTML = `<div class="q-card">` +
        `<p class="q-count">Clue ${i + 1} of ${items.length}</p>` +
        `<h3 class="q">Which problem does this clue point to?</h3>` +
        `<p class="hint">Drag the clue into a bin, or just tap a bin.</p>` +
        `<div class="sort-item"><span class="si-emoji" aria-hidden="true">🔍</span><span>${it.text}</span></div>` +
        `<div class="bins">` +
        bins.map((b, k) => `<button class="bin" data-bin="${b.id}"><span class="opt-num">${k + 1}</span><span class="bin-emoji" aria-hidden="true">${b.emoji}</span><b>${b.name}</b><small>${b.hint}</small></button>`).join('') +
        `</div></div>`;

      const card = root.querySelector('.sort-item');
      const binEls = Array.from(root.querySelectorAll('.bin'));
      let answered = false;

      function choose(id) {
        if (answered) return;
        answered = true;
        binEls.forEach(b => { b.disabled = true; });
        const ok = id === it.bin;
        binEls.find(b => b.dataset.bin === it.bin).classList.add('correct');
        if (!ok) binEls.find(b => b.dataset.bin === id).classList.add('wrong');
        card.classList.add(ok ? 'sorted' : 'missorted');
        const pts = api.answer(ok, it.id);
        const right = bins.find(b => b.id === it.bin).name;
        i++;
        api.feedback(ok, ok ? it.tip : `This clue means <b>${right}</b>. ${it.tip}`, show, { pts });
      }

      binEls.forEach(b => b.addEventListener('click', () => choose(b.dataset.bin)));
      api.keys(e => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= bins.length) choose(bins[n - 1].id);
      });

      const binAt = (x, y) => binEls.find(b => {
        const r = b.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      let sx = 0, sy = 0, dragging = false;
      card.addEventListener('pointerdown', e => {
        if (answered) return;
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        card.setPointerCapture(e.pointerId);
        card.classList.add('dragging');
      });
      card.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 30}deg)`;
        const over = binAt(e.clientX, e.clientY);
        binEls.forEach(b => b.classList.toggle('over', b === over));
      });
      const stop = drop => e => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('dragging');
        card.style.transform = '';
        binEls.forEach(b => b.classList.remove('over'));
        const over = drop && binAt(e.clientX, e.clientY);
        if (over) choose(over.dataset.bin);
      };
      card.addEventListener('pointerup', stop(true));
      card.addEventListener('pointercancel', stop(false));
    }

    show();
  };
})();
