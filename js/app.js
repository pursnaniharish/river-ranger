// River Ranger: screens, scoring, unlocks, badges, critter cards and certificate.
(function () {
  'use strict';
  const D = window.RR_DATA;
  const S = RR.svg;
  const A = RR.audio;
  const app = document.getElementById('app');
  const $ = (sel, root) => (root || document).querySelector(sel);

  let state = RR.store.load();
  A.setMuted(state.muted);
  let screen = 'home';
  let keyHandler = null;

  // Map positions (in a 100 × 170 box), bottom to top: 7 crossings, storm, cold spring.
  const NODES = [
    { x: 30, y: 152 }, { x: 70, y: 134 }, { x: 32, y: 116 }, { x: 68, y: 98 }, { x: 30, y: 80 },
    { x: 70, y: 62 }, { x: 34, y: 44 }, { x: 64, y: 27 }, { x: 50, y: 10 }
  ];

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const sample = (arr, n) => shuffle(arr.slice()).slice(0, n);
  const oneOf = arr => arr[Math.floor(Math.random() * arr.length)];
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const levelById = id => D.levels.find(l => l.id === id);
  const species = id => D.species.find(s => s.id === id);
  const BADGES = D.levels.map(l => l.badge).concat(D.extraBadges);
  const starsFor = id => (state.levels[id] || {}).stars || 0;
  const passed = id => starsFor(id) > 0;
  const unlocked = id => id === 1 || passed(id - 1);
  const totalStars = () => D.levels.reduce((n, l) => n + starsFor(l.id), 0);
  const maxStars = D.levels.length * 3;

  function save() {
    RR.store.save(state);
    renderTopbar();
  }

  // ---------- question banks built from data ----------
  (function buildBanks() {
    const B = D.banks;
    const T = D.crossingTypes;
    B.l2 = [];
    T.forEach(t => {
      const others = T.filter(o => o.key !== t.key);
      B.l2.push({ id: 'l2-pick-' + t.key, base: t.key, type: 'imgpick',
        q: `Which picture shows a <b>${t.name}</b>?`,
        options: [t.key].concat(sample(others, 3).map(o => o.key)), tip: t.text });
      B.l2.push({ id: 'l2-name-' + t.key, base: t.key, type: 'mc', svg: { key: t.key },
        q: 'What kind of crossing is this?',
        options: [t.name].concat(sample(others, 3).map(o => o.name)), tip: t.text });
    });
    const core = D.glossary.filter(g => g.core);
    B.jargon = [];
    core.forEach(g => {
      const others = core.filter(o => o !== g);
      B.jargon.push({ id: 'gl-def-' + slug(g.term), base: g.term, type: 'mc',
        q: `What does <b>${g.term}</b> mean?`,
        options: [g.short].concat(sample(others, 3).map(o => o.short)), tip: `${g.emoji} ${g.def}` });
      B.jargon.push({ id: 'gl-word-' + slug(g.term), base: g.term, type: 'mc',
        q: `Which ranger word means: “${g.short}”?`,
        options: [g.term].concat(sample(others, 3).map(o => o.term)), tip: `${g.emoji} ${g.def}` });
    });
    B.storm = [].concat(B.l1, B.l2, B.l3, B.l6, B.l7, B.jargon, B.extra);
  })();

  // Questions the kid missed before come first (light spaced repetition).
  function pick(bankName, n) {
    const m = state.missed;
    const sorted = shuffle(D.banks[bankName].slice()).sort((a, b) => (m[b.id] || 0) - (m[a.id] || 0));
    const seen = new Set();
    const out = [];
    for (const q of sorted) {
      const key = q.base || q.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
      if (out.length === n) break;
    }
    return shuffle(out);
  }

  // ---------- top bar ----------
  function renderTopbar() {
    $('#tb-stars').textContent = totalStars();
    $('#tb-points').textContent = state.points;
    const snd = $('#tb-sound');
    snd.innerHTML = `<span aria-hidden="true">${state.muted ? '🔇' : '🔊'}</span>`;
    snd.setAttribute('aria-label', state.muted ? 'Turn sound on' : 'Turn sound off');
    document.querySelectorAll('.tb-nav [data-go]').forEach(b => {
      b.classList.toggle('active', b.dataset.go === screen);
    });
  }

  function toggleSound() {
    state.muted = !state.muted;
    A.setMuted(state.muted);
    save();
    A.play('click');
  }

  // ---------- router ----------
  function go(name, arg) {
    if (screen === 'play' && name !== 'play' &&
        !window.confirm('Leave this level? Your answers in this level won’t be saved.')) return;
    keyHandler = null;
    screen = name;
    const views = { home: renderHome, map: renderMap, guide: renderGuide, backpack: renderBackpack, certificate: renderCertificate };
    if (name === 'intro') renderIntro(levelById(arg));
    else (views[name] || renderMap)(arg);
    renderTopbar();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  // ---------- home ----------
  function renderHome() {
    const started = Object.keys(state.levels).length > 0;
    app.innerHTML = `<section class="screen home">
      <div class="hero card">
        <div class="hero-fish">${S.trouty('bob')}</div>
        <h1>River Ranger</h1>
        <p class="lead">Hi! I’m <b>Trouty</b>, an Eastern brook trout. Road crossings are blocking my stream!
          Help me fix 7 crossings, learn real ranger words, and swim all the way up to the cold spring.</p>
        <label class="name-field">Your Ranger name
          <input id="ranger-name" maxlength="24" autocomplete="off" placeholder="Type your name" value="${esc(state.name)}">
        </label>
        <button class="btn big primary" id="start">${started ? 'Keep going ▶' : 'Start the adventure ▶'}</button>
      </div>
      <div class="compare">
        <figure class="card bad">${S.crossing('perched')}<figcaption>🚫 Blocked! A perched culvert</figcaption></figure>
        <figure class="card good">${S.crossing('arch', { fish: true })}<figcaption>✅ Open! An open-bottom arch</figcaption></figure>
      </div>
      <p class="credit">Facts come from the <i>Massachusetts Stream Crossings Handbook</i> by the Division of Ecological Restoration (DER).</p>
    </section>`;
    const input = $('#ranger-name');
    input.addEventListener('input', () => { state.name = input.value.slice(0, 24); save(); });
    $('#start').addEventListener('click', () => { A.play('click'); go('map'); });
  }

  // ---------- map ----------
  function renderMap() {
    const fixed = D.levels.filter(l => !l.boss && passed(l.id)).length;
    const nextId = (D.levels.find(l => !passed(l.id)) || { id: 9 }).id;
    const tp = NODES[Math.min(nextId, 9) - 1];
    const justFixed = state.justFixed;

    const nodes = D.levels.map((L, i) => {
      const p = NODES[i];
      const st = starsFor(L.id);
      const open = unlocked(L.id);
      const cls = st ? 'fixed' : open ? 'open' : 'locked';
      const icon = L.boss ? '⛈️' : st ? '🌉' : open ? '🚧' : '🔒';
      const stars = st ? '★'.repeat(st) + '☆'.repeat(3 - st) : '';
      const label = `${L.boss ? 'Final' : 'Crossing ' + L.id}: ${L.title}${st ? `, ${st} of 3 stars` : ''}${open ? '' : ', locked'}`;
      return `<button class="node ${cls} ${p.x < 50 ? 'lab-right' : 'lab-left'} ${L.boss ? 'boss' : ''} ${justFixed === L.id ? 'just-fixed' : ''} ${L.id === nextId ? 'next' : ''}"
        style="left:${p.x}%;top:${(p.y / 170 * 100).toFixed(2)}%" data-level="${L.id}" ${open ? '' : 'disabled'} aria-label="${label}">
        <span class="node-icon" aria-hidden="true">${icon}</span>
        <span class="node-label" aria-hidden="true"><b>${L.boss ? '⚡' : L.id + '.'}</b> ${L.title}${stars ? `<span class="node-stars">${stars}</span>` : ''}</span>
      </button>`;
    }).join('');

    const goal = NODES[8];
    const certReady = passed(8);
    app.innerHTML = `<section class="screen map-screen">
      <div class="map-head card">
        <div>
          <h2>Trouty’s Stream</h2>
          <p>Fix each road crossing to help Trouty swim upstream. Crossings fixed: <b>${fixed} / 7</b> · ⭐ <b>${totalStars()} / ${maxStars}</b></p>
        </div>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${fixed + (certReady ? 1 : 0)}"><span style="width:${(fixed + (certReady ? 1 : 0)) / 8 * 100}%"></span></div>
        ${certReady ? `<button class="btn primary" data-go="certificate">🏆 Get your certificate</button>` : ''}
      </div>
      <div class="map">
        ${S.map(NODES)}
        ${nodes}
        <div class="node goal" style="left:${goal.x}%;top:${(goal.y / 170 * 100).toFixed(2)}%" aria-hidden="true"><span class="node-icon">❄️</span></div>
        <div class="map-trouty" style="left:${tp.x}%;top:${(tp.y / 170 * 100).toFixed(2)}%" aria-hidden="true">${S.trouty('bob')}</div>
        <span class="map-tag ocean" aria-hidden="true">🌊 Ocean</span>
        <span class="map-tag spring" aria-hidden="true">Cold spring</span>
      </div>
    </section>`;

    app.querySelectorAll('.node[data-level]').forEach(b => b.addEventListener('click', () => {
      A.play('click');
      go('intro', Number(b.dataset.level));
    }));
    if (justFixed) {
      setTimeout(() => A.play('splash'), 300);
      state.justFixed = null;
      save();
    }
  }

  // ---------- level intro ----------
  function learnCard(c) {
    const art = c.svg ? `<div class="learn-art">${S.crossing(c.svg.key, c.svg.o)}</div>` : `<div class="learn-emoji" aria-hidden="true">${c.emoji}</div>`;
    return `<article class="learn card">${art}<h3>${c.title}</h3><p>${c.text}</p></article>`;
  }

  function learnCardsFor(L) {
    let cards = (L.learn || []).map(learnCard);
    if (L.learnTypes) cards = D.crossingTypes.map(t => learnCard({ svg: { key: t.key }, title: `${t.good ? '✅' : '⚠️'} ${t.name}`, text: t.text }));
    if (L.learnTerms) {
      cards = cards.concat(L.learnTerms.map(term => {
        const g = D.glossary.find(x => x.term === term);
        return learnCard({ emoji: g.emoji, title: g.term, text: g.def });
      }));
    }
    return cards.join('');
  }

  function renderIntro(L) {
    if (!L || !unlocked(L.id)) return go('map');
    app.innerHTML = `<section class="screen intro">
      <button class="link-btn" data-go="map">← Back to map</button>
      <div class="intro-head">
        <span class="intro-icon" aria-hidden="true">${L.icon}</span>
        <div><p class="eyebrow">${L.boss ? 'Final challenge' : 'Crossing ' + L.id + ' of 7'}</p><h2>${L.title}</h2></div>
      </div>
      <div class="bubble-row"><div class="mini-trouty">${S.trouty()}</div><p class="bubble">${L.intro}</p></div>
      <div class="learn-grid">${learnCardsFor(L)}</div>
      <div class="center"><button class="btn big primary" id="go">${L.boss ? 'Face the storm! ⛈️' : 'I’m ready! Let’s play ▶'}</button></div>
    </section>`;
    $('#go').addEventListener('click', () => { A.play('click'); runLevel(L); });
  }

  // ---------- running a level ----------
  function runLevel(L) {
    screen = 'play';
    renderTopbar();
    const sess = { correct: 0, total: 0, points: 0, streak: 0, best: 0, failed: false };
    app.innerHTML = `<section class="screen play">
      <div class="hud card">
        <button class="icon-btn" id="quit" aria-label="Quit level">✖</button>
        <div class="hud-title">${L.icon} ${L.title}</div>
        <div class="hud-stats"><span id="hud-streak" class="streak" aria-live="polite"></span><span class="hud-pts"><b id="hud-points">0</b> pts</span></div>
        <div class="hud-bar" aria-hidden="true"><span id="hud-progress"></span></div>
      </div>
      <div id="stage" class="stage"></div>
      <div id="feedback" class="feedback" hidden></div>
    </section>`;
    $('#quit').addEventListener('click', () => go('map'));
    const stageRoot = $('#stage');
    let scored = true;

    const api = {
      root: stageRoot,
      shuffle,
      pick,
      keys(fn) { keyHandler = fn; },
      progress(done, total) {
        const bar = $('#hud-progress');
        if (bar) bar.style.width = (total ? done / total * 100 : 0) + '%';
      },
      answer(ok, qid) {
        let pts = 0;
        if (scored) sess.total++;
        if (ok) {
          if (scored) sess.correct++;
          sess.streak++;
          sess.best = Math.max(sess.best, sess.streak);
          pts = sess.streak >= 3 ? 20 : 10;
          sess.points += pts;
          if (qid && state.missed[qid]) {
            state.missed[qid]--;
            if (!state.missed[qid]) delete state.missed[qid];
          }
          A.play('correct');
        } else {
          sess.streak = 0;
          if (qid) state.missed[qid] = (state.missed[qid] || 0) + 1;
          A.play('wrong');
        }
        hud();
        return pts;
      },
      bonus(pts) { sess.points += pts; hud(); },
      fail() { sess.failed = true; },
      feedback(ok, tip, onNext, opts) {
        opts = opts || {};
        const fb = $('#feedback');
        const title = opts.title || (ok
          ? oneOf(['Awesome!', 'You got it!', 'Super, Ranger!', 'Fin-tastic!', 'Splash-tastic!'])
          : oneOf(['Not quite!', 'Oops!', 'Good try!']));
        const bonus = opts.pts ? `<span class="fb-pts">+${opts.pts}${sess.streak >= 3 && opts.pts === 20 ? ' 🔥×2' : ''}</span>` : '';
        fb.className = 'feedback ' + (ok ? 'good' : 'bad');
        fb.innerHTML = `<div class="fb-inner" role="status">
          <div class="fb-icon" aria-hidden="true">${ok ? '✅' : '💡'}</div>
          <div class="fb-text"><p class="fb-title">${title} ${bonus}</p><p class="fb-tip"><b>Ranger Tip:</b> ${tip}</p></div>
          <button class="btn primary" id="fb-next">${opts.next || 'Next ▶'}</button>
        </div>`;
        fb.hidden = false;
        const btn = $('#fb-next');
        btn.focus({ preventScroll: true });
        btn.addEventListener('click', () => {
          fb.hidden = true;
          A.play('next');
          onNext();
        });
      }
    };

    function hud() {
      const p = $('#hud-points');
      if (p) p.textContent = sess.points;
      const s = $('#hud-streak');
      if (s) s.textContent = sess.streak >= 2 ? `🔥 ${sess.streak} in a row` : '';
    }

    let k = 0;
    function nextStage() {
      if (k >= L.stages.length || sess.failed) return finish(L, sess);
      const st = L.stages[k++];
      scored = st.scored !== false;
      keyHandler = null;
      stageRoot.innerHTML = '';
      window.scrollTo(0, 0);
      RR.games[st.game](st, api, nextStage);
    }
    nextStage();
  }

  function award(id, list) {
    if (state.badges.indexOf(id) >= 0) return;
    state.badges.push(id);
    list.push(BADGES.find(b => b.id === id));
  }

  function finish(L, sess) {
    keyHandler = null;
    screen = 'results';
    const acc = sess.total ? sess.correct / sess.total : 1;
    const stars = sess.failed ? 0 : acc >= 0.9 ? 3 : acc >= 0.8 ? 2 : acc >= 0.7 ? 1 : 0;
    const prev = starsFor(L.id);
    const newBadges = [];
    const newCards = [];
    state.points += sess.points;
    if (stars) {
      state.levels[L.id] = { stars: Math.max(prev, stars) };
      if (!prev) state.justFixed = L.id;
      award(L.badge.id, newBadges);
      L.cards.forEach(c => {
        if (state.cards.indexOf(c) < 0) { state.cards.push(c); newCards.push(c); }
      });
    }
    if (sess.best >= 5) award('hotstreak', newBadges);
    if (totalStars() === maxStars) award('superranger', newBadges);
    save();

    const winMsg = L.boss
      ? 'The road held! Your crossings carried the flood safely, and Trouty reached the cold spring.'
      : oneOf(['Trouty swam right through your fixed crossing!', 'That crossing is now wildlife-friendly!', 'Another stream reconnected. Great job, Ranger!']);
    const failMsg = sess.failed
      ? 'Three misses and the floodwater overtopped the road. Review the Field Guide and try again, because you can do it!'
      : 'You need 7 out of 10 right to fix this crossing. Peek at the Field Guide, then try again. You’ve got this!';
    const nextL = levelById(L.id + 1);

    app.innerHTML = `<section class="screen results ${stars ? 'win' : 'lose'}">
      <div class="result-card card">
        <div class="big-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map(n => `<span class="star ${n <= stars ? 'on' : ''}" style="animation-delay:${n * 0.25}s" aria-hidden="true">★</span>`).join('')}</div>
        <h2>${stars ? (L.boss ? 'You beat the storm! 🏆' : 'Crossing fixed! 🌉') : (sess.failed ? 'The road overtopped! 🌊' : 'Almost there! 💪')}</h2>
        <p class="score-line">You got <b>${sess.correct}</b> of <b>${sess.total}</b> right · <b>+${sess.points}</b> points${sess.best >= 3 ? ` · best streak 🔥 ${sess.best}` : ''}</p>
        <p>${stars ? winMsg : failMsg}</p>
        ${newBadges.length ? `<div class="new-stuff"><h3>New badge${newBadges.length > 1 ? 's' : ''}!</h3><div class="badge-grid">${newBadges.map(b => badgeHtml(b, true)).join('')}</div></div>` : ''}
        ${newCards.length ? `<div class="new-stuff"><h3>New Critter Card${newCards.length > 1 ? 's' : ''}!</h3><div class="card-grid">${newCards.map(id => cardHtml(species(id))).join('')}</div></div>` : ''}
        <div class="btn-row">
          ${stars && L.boss ? `<button class="btn big primary" data-go="certificate">🏆 Get my certificate</button>` : ''}
          ${stars && !L.boss ? `<button class="btn big primary" data-go="map">Back to the stream ▶</button>` : ''}
          ${!stars ? `<button class="btn big primary" id="again">Try again</button><button class="btn" data-go="guide">📖 Field Guide</button>` : `<button class="btn" id="again">Play again for more stars</button>`}
          ${stars && nextL && unlocked(nextL.id) && !passed(nextL.id) ? `<button class="btn" id="next-level">Next: ${nextL.title} ▶</button>` : ''}
        </div>
      </div>
    </section>`;
    renderTopbar();
    if (stars) {
      A.play('level');
      RR.confetti(stars * 60);
    }
    $('#again').addEventListener('click', () => { A.play('click'); go('intro', L.id); });
    const nx = $('#next-level');
    if (nx) nx.addEventListener('click', () => { A.play('click'); go('intro', nextL.id); });
  }

  // ---------- field guide ----------
  function renderGuide(tab) {
    tab = tab || 'words';
    const tabs = [['words', '🔤 Ranger Words'], ['crossings', '🌉 Crossings'], ['problems', '🧩 Problems'], ['standards', '📏 Standards'], ['animals', '🐟 Why Animals Move']];
    let body = '';
    if (tab === 'words') {
      body = `<label class="search">🔍 <input id="g-search" type="search" placeholder="Search words like DER, riparian, overtop…" aria-label="Search ranger words"></label><div id="g-list" class="glossary"></div>`;
    } else if (tab === 'crossings') {
      body = `<div class="learn-grid">${learnCardsFor({ learnTypes: true })}</div>`;
    } else if (tab === 'problems') {
      body = `<div class="learn-grid">${levelById(6).learn.map(learnCard).join('')}${levelById(3).learn.map(learnCard).join('')}</div>`;
    } else if (tab === 'standards') {
      body = `<p class="note">All new crossings must meet the <b>General Standards</b>. Streams with rare species or important wildlife connections should meet the <b>Optimum Standards</b>.</p><div class="learn-grid">${levelById(7).learn.map(learnCard).join('')}</div>`;
    } else {
      body = `<div class="learn-grid">${levelById(4).learn.map(learnCard).join('')}</div>`;
    }
    app.innerHTML = `<section class="screen guide">
      <div class="page-head"><h2>📖 Field Guide</h2><p>Everything a River Ranger needs to know. Check here any time!</p></div>
      <div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" class="tab ${t[0] === tab ? 'active' : ''}" aria-selected="${t[0] === tab}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
      ${body}
    </section>`;
    app.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { A.play('click'); renderGuide(b.dataset.tab); }));
    if (tab === 'words') {
      const input = $('#g-search');
      const list = $('#g-list');
      const draw = () => {
        const q = input.value.trim().toLowerCase();
        const items = D.glossary.filter(g => !q || (g.term + ' ' + g.def).toLowerCase().indexOf(q) >= 0);
        list.innerHTML = items.length ? items.map(g => `<article class="word card">
            <div class="word-emoji" aria-hidden="true">${g.emoji}</div>
            <div><h3>${g.term}</h3><p>${g.def}</p><p class="example">“${g.example}”</p></div>
          </article>`).join('') : '<p class="note">No words match. Try another search!</p>';
      };
      input.addEventListener('input', draw);
      draw();
    }
  }

  // ---------- backpack ----------
  function badgeHtml(b, has) {
    return `<div class="badge ${has ? 'earned' : 'locked'}"><span class="b-emoji" aria-hidden="true">${has ? b.emoji : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small></div>`;
  }

  function cardHtml(sp) {
    return `<article class="critter-card"><div class="cc-art">${S.critter(sp)}</div><h4>${sp.name}</h4><p>${sp.fact}</p></article>`;
  }

  function renderBackpack() {
    app.innerHTML = `<section class="screen backpack">
      <div class="page-head"><h2>🎒 Ranger Backpack</h2><p>Badges: <b>${state.badges.length} / ${BADGES.length}</b> · Critter Cards: <b>${state.cards.length} / ${D.species.length}</b></p></div>
      <h3 class="section-title">🏅 Badges</h3>
      <div class="badge-grid">${BADGES.map(b => badgeHtml(b, state.badges.indexOf(b.id) >= 0)).join('')}</div>
      <h3 class="section-title">🐾 Critter Cards</h3>
      <p class="note">Every crossing you fix rescues new critters. Collect all ${D.species.length}!</p>
      <div class="card-grid">${D.species.map(sp => state.cards.indexOf(sp.id) >= 0 ? cardHtml(sp)
        : `<article class="critter-card locked"><div class="cc-art"><span class="critter-emoji" aria-hidden="true">❔</span></div><h4>???</h4><p>Fix more crossings to rescue this critter.</p></article>`).join('')}</div>
    </section>`;
  }

  // ---------- certificate ----------
  function renderCertificate() {
    if (!passed(8)) {
      app.innerHTML = `<section class="screen cert-screen"><div class="card center-card">
        <h2>🏆 Ranger Certificate</h2>
        <p>Fix all 7 crossings and survive the Big Storm to earn your <b>Junior Stream Continuity Ranger</b> certificate!</p>
        <button class="btn big primary" data-go="map">Go to the map ▶</button></div></section>`;
      return;
    }
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const earned = BADGES.filter(b => state.badges.indexOf(b.id) >= 0);
    app.innerHTML = `<section class="screen cert-screen">
      <div class="cert-controls card">
        <label class="name-field">Name on certificate <input id="cert-name" maxlength="24" autocomplete="off" value="${esc(state.name)}" placeholder="Type your name"></label>
        <button class="btn big primary" id="print">🖨️ Print certificate</button>
      </div>
      <div class="certificate" id="certificate">
        <div class="cert-border">
          <p class="cert-eyebrow">Certificate of Achievement</p>
          <h2>Junior Stream Continuity Ranger</h2>
          <p>This certifies that</p>
          <p class="cert-name" id="cert-name-out"></p>
          <p class="cert-body">helped Trouty the brook trout swim all the way upstream by fixing 7 stream crossings and surviving the Big Storm.
            This Ranger knows culverts, critters and ranger words, from DER to riparian!</p>
          <p class="cert-stats">⭐ ${totalStars()} / ${maxStars} stars · 🏅 ${earned.length} badges · 🐾 ${state.cards.length} critter cards · ✨ ${state.points} points</p>
          <p class="cert-badges" aria-hidden="true">${earned.map(b => b.emoji).join(' ')}</p>
          <div class="cert-foot"><span>${date}</span><span class="cert-fish">${S.trouty()}</span><span>Trouty, Chief Fish</span></div>
        </div>
      </div>
    </section>`;
    const input = $('#cert-name');
    const out = $('#cert-name-out');
    const draw = () => { out.textContent = input.value.trim() || 'A Super River Ranger'; };
    input.addEventListener('input', () => { state.name = input.value.slice(0, 24); save(); draw(); });
    draw();
    $('#print').addEventListener('click', () => window.print());
    RR.confetti(80);
  }

  // ---------- settings ----------
  function openSettings() {
    if ($('.modal')) return;
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-card card" role="dialog" aria-modal="true" aria-labelledby="set-h">
      <h2 id="set-h">⚙️ Settings</h2>
      <label class="switch"><input type="checkbox" id="set-sound" ${state.muted ? '' : 'checked'}> Sound effects</label>
      <button class="btn danger" id="set-reset">Reset all progress</button>
      <p class="small">The facts in this game come from the <i>Massachusetts Stream Crossings Handbook</i> (Division of Ecological Restoration, 2nd edition 2012, reprinted 2018). All pictures were drawn for this game. Progress is saved only in this browser.</p>
      <button class="btn primary" id="set-close">Close</button>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    $('#set-close').addEventListener('click', close);
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    $('#set-sound').addEventListener('change', toggleSound);
    $('#set-reset').addEventListener('click', () => {
      if (!window.confirm('Erase all stars, badges and critter cards? This can’t be undone.')) return;
      state = RR.store.reset();
      A.setMuted(state.muted);
      close();
      screen = 'home';
      go('home');
    });
    $('#set-close').focus();
  }

  // ---------- global events ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go]');
    if (!t) return;
    e.preventDefault();
    A.play('click');
    go(t.dataset.go);
  });
  $('#tb-sound').addEventListener('click', toggleSound);
  $('#tb-settings').addEventListener('click', openSettings);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const m = $('.modal');
      if (m) m.remove();
      return;
    }
    if ($('.modal')) return;
    const fb = $('#feedback');
    if (keyHandler && (!fb || fb.hidden) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) keyHandler(e);
  });

  $('#brand-fish').innerHTML = S.trouty();
  go('home');
})();
