// Build a Super Crossing: each choice redraws the crossing live. A wrong pick
// shows what goes wrong, and the step repeats until the kid finds the right one.
(function () {
  RR.games = RR.games || {};

  RR.games.builder = function (stage, api, done) {
    const root = api.root;
    const steps = RR_DATA.buildSteps;
    const design = { key: 'pipe', o: {} };
    let i = 0;

    root.innerHTML = `<div class="builder">` +
      `<div class="b-preview"><div class="b-art"></div><p class="b-caption" aria-live="polite">Here’s the old rusty pipe 😬 Let’s rebuild it!</p></div>` +
      `<div class="b-panel"></div></div>`;
    const art = root.querySelector('.b-art');
    const cap = root.querySelector('.b-caption');
    const panel = root.querySelector('.b-panel');
    const draw = () => { art.innerHTML = RR.svg.crossing(design.key, design.o); };
    draw();

    function step() {
      if (i >= steps.length) return swim();
      const s = steps[i];
      const opts = api.shuffle(s.options.slice());
      let tried = false;
      api.progress(i, steps.length);

      panel.innerHTML = `<p class="q-count">Step ${i + 1} of ${steps.length} · ${s.standard}</p>` +
        `<h3 class="q">${s.q}</h3><div class="opts opts-stack">` +
        opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="opt-num">${k + 1}</span><span>${o.label}</span></button>`).join('') +
        `</div>`;
      const btns = Array.from(panel.querySelectorAll('.opt'));

      function choose(k) {
        const o = opts[k];
        if (btns[k].disabled) return;
        if (o.key) design.key = o.key;
        Object.assign(design.o, o.set || {});
        draw();
        cap.textContent = o.caption || '';
        if (o.ok) {
          btns.forEach(b => { b.disabled = true; });
          btns[k].classList.add('correct');
          let pts = 0;
          if (tried) RR.audio.play('correct');
          else pts = api.answer(true, s.id);
          i++;
          api.feedback(true, o.tip, step, { pts });
        } else {
          btns[k].classList.add('wrong');
          btns[k].disabled = true;
          if (!tried) { tried = true; api.answer(false, s.id); } else RR.audio.play('wrong');
          api.feedback(false, o.tip + ' Look at the picture, then try another choice.', () => {
            const next = btns.find(b => !b.disabled);
            if (next) next.focus();
          }, { title: 'Hmm, not quite!', next: 'Try again' });
        }
      }

      btns.forEach((b, k) => b.addEventListener('click', () => choose(k)));
      api.keys(e => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= btns.length) choose(n - 1);
      });
    }

    function swim() {
      api.progress(steps.length, steps.length);
      api.keys(null);
      cap.textContent = 'Super Crossing complete! Watch Trouty…';
      panel.innerHTML = `<h3 class="q">🎉 Your crossing meets the Stream Crossing Standards!</h3>` +
        `<ul class="check-list"><li>Open-bottom arch</li><li>Spans 1.2 × bankfull width</li><li>Big and bright openness</li><li>Natural substrate</li><li>Natural water depth and speed</li><li>Tall, with dry banks for wildlife</li></ul>`;
      art.insertAdjacentHTML('beforeend', `<div class="swimmer">${RR.svg.trouty()}</div>`);
      RR.audio.play('splash');
      setTimeout(() => api.feedback(true,
        'Trouty swam right through, and so can turtles, otters and crayfish! Now a few quick questions about the standards.',
        done, { title: 'Trouty made it! 🐟', next: 'Next ▶' }), 2300);
    }

    step();
  };
})();
