// Quiz stage: multiple choice ("mc"), picture pick ("imgpick") and
// thumbs up/down on a crossing scene ("thumbs"). With `lives` set it becomes
// the Big Storm: each miss raises the floodwater.
(function () {
  RR.games = RR.games || {};

  RR.games.quiz = function (stage, api, done) {
    const qs = api.pick(stage.bank, stage.n);
    const lives = stage.lives || 0;
    const root = api.root;
    let i = 0;
    let misses = 0;

    function stormHtml() {
      if (!lives) return '';
      const left = lives - misses;
      return `<div class="storm-wrap"><div class="storm-art">${RR.svg.storm(misses, lives)}</div>` +
        `<p class="lives" aria-label="${left} flood shields left">${'🛡️'.repeat(left)}${'💧'.repeat(misses)}</p></div>`;
    }

    function show() {
      if (i >= qs.length) return done();
      const q = qs[i];
      const type = q.type || 'mc';
      api.progress(i, qs.length);

      const opts = type === 'thumbs'
        ? [{ value: '👍 Good for wildlife', ok: q.good }, { value: '👎 Not so good', ok: !q.good }]
        : api.shuffle(q.options.map((o, k) => ({ value: o, ok: k === 0 })));

      const art = q.svg ? `<div class="q-art">${RR.svg.crossing(q.svg.key, q.svg.o)}</div>` : '';
      const optHtml = opts.map((o, k) => {
        const body = type === 'imgpick' ? RR.svg.crossing(o.value) : `<span>${o.value}</span>`;
        const label = type === 'imgpick' ? ` aria-label="Picture ${k + 1}"` : '';
        return `<button class="opt ${type}" data-k="${k}"${label}><span class="opt-num">${k + 1}</span>${body}</button>`;
      }).join('');

      root.innerHTML = `${stormHtml()}<div class="q-card">` +
        `<p class="q-count">Question ${i + 1} of ${qs.length}</p>` +
        `<h3 class="q">${q.q || 'Is this crossing good for fish and wildlife?'}</h3>${art}` +
        `<div class="opts opts-${type}">${optHtml}</div></div>`;

      const buttons = Array.from(root.querySelectorAll('.opt'));
      let answered = false;

      function choose(k) {
        if (answered) return;
        answered = true;
        buttons.forEach(b => { b.disabled = true; });
        const ok = opts[k].ok;
        const ck = opts.findIndex(o => o.ok);
        buttons[ck].classList.add('correct');
        if (!ok) buttons[k].classList.add('wrong');
        const pts = api.answer(ok, q.id);

        let tip = q.tip;
        if (!ok && type !== 'thumbs') {
          tip = `The answer is <b>${type === 'imgpick' ? 'picture ' + (ck + 1) : opts[ck].value}</b>. ${q.tip}`;
        }
        i++;
        if (!ok && lives) {
          misses++;
          const wrap = root.querySelector('.storm-wrap');
          if (wrap) wrap.outerHTML = stormHtml();
          if (misses >= lives) {
            api.fail();
            return api.feedback(false, tip + ' Oh no, the floodwater overtopped the road!', done,
              { title: 'Overtopped! 🌊', next: 'See results' });
          }
        }
        api.feedback(ok, tip, show, { pts });
      }

      buttons.forEach((b, k) => b.addEventListener('click', () => choose(k)));
      api.keys(e => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= buttons.length) choose(n - 1);
      });
    }

    show();
  };
})();
