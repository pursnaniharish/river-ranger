// Original inline-SVG art: road crossings (front view looking upstream),
// fish, Trouty the mascot, and the stream map. Everything is drawn in code.
(function () {
  const BED = 126;           // natural streambed level at the crossing
  const CX = 100;            // centre of the stream
  const CH_L = 30;           // stream channel (bankfull) edges
  const CH_R = 170;
  let uid = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f = n => Math.round(n * 10) / 10;

  const TYPES = {
    bridge: { shape: 'bridge' },
    arch: { shape: 'arch', w: 1.2, h: 1 },
    box3: { shape: 'box', w: 1.15, h: 0.95, footings: true },
    embedded: { shape: 'box', w: 0.95, h: 0.7, embedded: true },
    pipe: { shape: 'pipe', w: 0.32, bed: 'metal', water: 'low', rusty: true },
    corrugated: { shape: 'pipe', w: 0.34, bed: 'metal', water: 'fast', rusty: true, corrugated: true },
    doublebox: { shape: 'double', w: 0.6, bed: 'concrete', water: 'low' },
    perched: { shape: 'pipe', w: 0.26, bed: 'metal', water: 'low', rusty: true, perched: true },
    slipline: { shape: 'slipline', w: 0.42, bed: 'metal', water: 'fast' }
  };

  const TROUT = { body: '#5d7a3a', belly: '#f08a4b', fin: '#e8743b', spots: ['#f4d35e', '#d6322f'] };

  function rng(seed) {
    let s = seed % 233280;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
  }

  function rocks(x1, x2, y1, y2, n, seed) {
    const r = rng(seed);
    const colors = ['#8d7b68', '#a39382', '#6f6458', '#b8a990'];
    let out = '';
    for (let i = 0; i < n; i++) {
      const x = x1 + r() * (x2 - x1);
      const y = y1 + r() * (y2 - y1);
      const rr = 1.6 + r() * 3.4;
      out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.7)}" fill="${colors[Math.floor(r() * 4)]}"/>`;
    }
    return out;
  }

  const circ = (cx, cy, r) =>
    `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;

  // ---------- fish ----------
  function fishG(o) {
    if (o.shape === 'eel') {
      const d = 'M10 44 C26 28 40 58 60 42 S94 26 110 38';
      return `<path d="${d}" stroke="${o.body}" stroke-width="13" fill="none" stroke-linecap="round"/>` +
        `<path d="${d}" stroke="${o.belly}" stroke-width="3" fill="none" stroke-linecap="round" transform="translate(0 4)" opacity=".7"/>` +
        `<circle cx="104" cy="35" r="2.6" fill="#111"/>` +
        (o.sucker ? `<circle cx="113" cy="39" r="3.4" fill="#3b2f22" stroke="#d9c7a5" stroke-width="1.2"/>` : '');
    }
    const fin = o.fin || o.body;
    let s = `<path d="M22 40 L4 24 Q10 40 4 56 Z" fill="${fin}"/>` +
      `<path d="M50 25 Q62 8 76 25 Z" fill="${fin}"/>` +
      `<ellipse cx="60" cy="40" rx="44" ry="17" fill="${o.body}"/>` +
      `<ellipse cx="62" cy="48.5" rx="34" ry="7.5" fill="${o.belly}"/>`;
    if (o.stripes) [33, 39, 45].forEach(y => { s += `<path d="M26 ${y} Q60 ${y - 2} 96 ${y}" stroke="#2d3540" stroke-width="1.8" fill="none"/>`; });
    if (o.stripe) s += `<path d="M20 40 Q60 37 102 38" stroke="#222" stroke-width="3.6" fill="none"/>`;
    if (o.spots) {
      const r = rng(3);
      for (let i = 0; i < 14; i++) {
        s += `<circle cx="${f(32 + r() * 52)}" cy="${f(29 + r() * 13)}" r="${f(1.3 + r() * 1.1)}" fill="${o.spots[i % o.spots.length]}"/>`;
      }
    }
    if (o.gill) s += `<circle cx="84" cy="37" r="2.4" fill="#222"/>`;
    s += `<path d="M78 46 Q72 57 64 50 Z" fill="${o.fin || o.belly}" opacity=".9"/>`;
    s += `<circle cx="92" cy="36" r="4.4" fill="#fff"/><circle cx="93" cy="36" r="2.3" fill="#111"/>`;
    if (o.face) s += `<path d="M95 46 Q100 50 105 45" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<circle cx="86" cy="44" r="2.6" fill="#ff9aa2" opacity=".7"/>`;
    return s;
  }

  const smallFish = (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">${fishG(TROUT)}</g>`;

  // ---------- crossing geometry ----------
  function geom(c) {
    const halfW = 70 * c.w;
    if (c.shape === 'arch') {
      const left = CX - halfW, right = CX + halfW;
      const top = clamp(BED - 80 * c.h, 42, 112);
      const rise = Math.max(3, Math.min(halfW * 0.55, 38, BED - 4 - top));
      const spring = top + rise, bottom = BED + 10;
      return { left, right, top, bottom,
        d: `M${f(left)} ${bottom} L${f(left)} ${f(spring)} A${f(halfW)} ${f(rise)} 0 0 1 ${f(right)} ${f(spring)} L${f(right)} ${bottom} Z` };
    }
    if (c.shape === 'box') {
      const left = CX - halfW, right = CX + halfW;
      const top = clamp(BED - 80 * c.h, 42, 116), bottom = BED + 10;
      return { left, right, top, bottom, d: `M${f(left)} ${bottom} V${f(top)} H${f(right)} V${bottom} Z` };
    }
    if (c.shape === 'double') {
      const bw = clamp(halfW * 0.75, 10, 60), gap = 8, top = BED - 40, bottom = BED - 3;
      const l1 = CX - gap / 2 - bw, r2 = CX + gap / 2 + bw;
      return { left: l1, right: r2, top, bottom,
        d: `M${f(l1)} ${bottom} V${top} H${f(CX - gap / 2)} V${bottom} Z M${f(CX + gap / 2)} ${bottom} V${top} H${f(r2)} V${bottom} Z` };
    }
    // pipe / slipline
    const r = clamp(halfW, 8, 42);
    const bottom = c.perched ? BED - 26 : BED - 1;
    const cy = bottom - r;
    const ri = c.shape === 'slipline' ? r * 0.62 : r;
    return { left: CX - ri, right: CX + ri, top: bottom - 2 * ri, bottom, r, cy, ri, d: circ(CX, bottom - ri, ri) };
  }

  function culvertArt(c, id) {
    const g = geom(c);
    const floor = Math.min(g.bottom, BED);
    const isPipe = c.shape === 'pipe' || c.shape === 'slipline';
    let surf = null;
    if (c.water === 'high') surf = g.top + (floor - g.top) * 0.3;
    else if (c.water === 'low') surf = floor - 3;
    else if (c.water !== 'dry') surf = floor - (isPipe ? Math.min(10, g.ri * 0.6) : 10);
    const wide = (c.shape === 'arch' || c.shape === 'box') && g.right - g.left > CH_R - CH_L + 4;

    // inside the opening (clipped)
    let inner = `<rect width="200" height="140" fill="#1f2c38"/>`;
    // Light at the far end: bigger for open, short crossings. Double boxes stay dark.
    if (c.shape !== 'double') {
      const sc = isPipe ? 0.3 : clamp(0.2 + 0.32 * c.h, 0.22, 0.56);
      inner += `<path d="${g.d}" fill="#d4f1c4" transform="translate(${CX} ${f(floor)}) scale(${f(sc * 100) / 100}) translate(${-CX} ${f(-floor)})"/>`;
    }
    if (c.bed === 'natural') {
      inner += `<rect x="0" y="${BED - 6}" width="200" height="30" fill="#9c8467"/>` + rocks(g.left, g.right, BED - 7, BED + 1, 18, 11);
      if (wide) {
        inner += `<path d="M${f(g.left - 2)} ${BED - 15} Q${CH_L - 4} ${BED - 15} ${CH_L + 5} ${BED - 4} L${CH_L + 5} ${BED + 4} H${f(g.left - 2)} Z" fill="#76bf55"/>`;
        inner += `<path d="M${f(g.right + 2)} ${BED - 15} Q${CH_R + 4} ${BED - 15} ${CH_R - 5} ${BED - 4} L${CH_R - 5} ${BED + 4} H${f(g.right + 2)} Z" fill="#76bf55"/>`;
      }
    } else if (c.bed === 'metal') {
      inner += `<rect x="0" y="${f(floor - 7)}" width="200" height="40" fill="#7f8b94"/>`;
      inner += `<path d="M0 ${f(floor - 5)} H200" stroke="#9aa6ae" stroke-width="1"/>`;
    } else {
      inner += `<rect x="0" y="${f(floor - 6)}" width="200" height="40" fill="#c4c2b9"/>`;
    }
    if (surf != null) {
      const wl = wide ? CH_L + 3 : 0, wr = wide ? CH_R - 3 : 200;
      inner += `<rect x="${wl}" y="${f(surf)}" width="${wr - wl}" height="${f(140 - surf)}" fill="#4ba6e6" opacity="${c.bed === 'natural' ? 0.6 : 0.85}"/>`;
      inner += `<path d="M${wl} ${f(surf)} H${wr}" stroke="#bfe6ff" stroke-width="1.2"/>`;
      if (c.water === 'fast') {
        for (let x = g.left + 5; x < g.right - 6; x += 11) {
          inner += `<path d="M${f(x)} ${f(surf + 2)} l4 1.8 l-4 1.8" stroke="#fff" stroke-width="1.1" fill="none"/>`;
        }
      }
      if (c.fish) inner += smallFish(CX - 22, surf - 6, 0.24);
    }

    let s = `<defs><clipPath id="${id}"><path d="${g.d}"/></clipPath>` +
      `<linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ad8a5d"/><stop offset="1" stop-color="#8a6a45"/></linearGradient></defs>`;
    s += `<g clip-path="url(#${id})">${inner}</g>`;
    const emb = `M0 30 H200 V140 H0 Z ${g.d}`;
    s += `<clipPath id="${id}m"><path d="${emb}" clip-rule="evenodd"/></clipPath>`;
    s += `<path d="${emb}" fill="url(#${id}e)" fill-rule="evenodd"/>`;
    s += `<g clip-path="url(#${id}m)">${rocks(2, 198, 44, 118, 10, 21).replace(/fill="#[0-9a-f]+"/g, 'fill="#7a5c3a" opacity=".35"')}</g>`;
    s += `<path d="M0 30 H200 V38 Q150 42 100 38 T0 38 Z" fill="#6cc04a"/>`;
    if (c.shape === 'slipline') {
      s += `<path d="${circ(CX, g.cy, g.r)} ${g.d}" fill="#9d9d95" fill-rule="evenodd"/>`;
      s += `<circle cx="${CX}" cy="${f(g.cy)}" r="${f(g.r)}" fill="none" stroke="#b4632a" stroke-width="4"/>`;
    }
    const rim = c.rusty ? '#b4632a' : '#a9abad';
    s += `<path d="${g.d}" fill="none" stroke="${rim}" stroke-width="${isPipe ? 4 : 3}"/>`;
    if (c.corrugated) {
      for (let k = 1; k <= 3; k++) s += `<circle cx="${CX}" cy="${f(g.cy)}" r="${f(g.r - k * 3.5)}" fill="none" stroke="#c07a45" stroke-width=".9" opacity=".7"/>`;
    }

    // foreground: banks and stream in front of the crossing
    s += `<path d="M0 ${BED} H${CH_L} L${CH_L - 14} 140 H0 Z" fill="#6cc04a"/>`;
    s += `<path d="M200 ${BED} H${CH_R} L${CH_R + 14} 140 H200 Z" fill="#6cc04a"/>`;
    const chan = `M${CH_L} ${BED} H${CH_R} L${CH_R + 14} 140 H${CH_L - 14} Z`;
    s += `<path d="${chan}" fill="#9c8467"/>` + rocks(CH_L - 6, CH_R + 6, BED + 3, 138, 22, 5);
    if (c.water !== 'dry') s += `<path d="${chan}" fill="#55b0ec" opacity=".72"/>`;

    if (c.perched) {
      const w = g.r * 0.9;
      s += `<ellipse cx="${CX}" cy="${BED + 7}" rx="34" ry="8" fill="#235f99" opacity=".85"/>`;
      s += `<path d="M${f(CX - w / 2)} ${f(g.bottom - 2)} h${f(w)} l3 ${f(BED + 6 - g.bottom)} h${f(-w - 6)} Z" fill="#a6dcfb" opacity=".95"/>`;
      for (let k = -1; k <= 1; k++) s += `<path d="M${f(CX + k * w / 3)} ${f(g.bottom + 2)} v${f(BED - g.bottom - 2)}" stroke="#fff" stroke-width="1" opacity=".8"/>`;
      s += `<circle cx="${CX - 10}" cy="${BED + 3}" r="2" fill="#fff" opacity=".8"/><circle cx="${CX + 11}" cy="${BED + 2}" r="1.6" fill="#fff" opacity=".8"/>`;
    }
    // Cut-away below the streambed: show the buried floor (embedded) or the
    // footings with no floor at all (3-sided box).
    if ((c.footings || c.embedded) && c.bed === 'natural') {
      s += `<rect x="${f(g.left)}" y="${BED}" width="${f(g.right - g.left)}" height="13" fill="#8f7558"/>` +
        rocks(g.left + 2, g.right - 2, BED + 2, BED + 11, 16, 31);
    }
    if (c.footings && c.bed === 'natural') {
      s += `<rect x="${f(g.left - 7)}" y="${BED - 1}" width="11" height="14" rx="1" fill="#9a9a93" stroke="#7d7d77"/>`;
      s += `<rect x="${f(g.right - 4)}" y="${BED - 1}" width="11" height="14" rx="1" fill="#9a9a93" stroke="#7d7d77"/>`;
    }
    if (c.embedded) {
      s += `<path d="M${f(g.left)} ${BED - 2} V${BED + 12} H${f(g.right)} V${BED - 2}" stroke="#d6d7d2" stroke-width="3" fill="none"/>`;
    }
    if (c.debris) {
      const y = floor - 4;
      s += `<g stroke="#6b4423" stroke-width="2.6" stroke-linecap="round">` +
        `<line x1="${f(g.left + 3)}" y1="${f(y)}" x2="${f(g.right - 3)}" y2="${f(y - 9)}"/>` +
        `<line x1="${f(g.left + 7)}" y1="${f(y - 12)}" x2="${CX + 8}" y2="${f(y + 1)}"/>` +
        `<line x1="${CX - 6}" y1="${f(y - 3)}" x2="${f(g.right + 4)}" y2="${f(y - 1)}"/></g>`;
      [[-12, -6, '#d98a2b'], [6, -10, '#8bbd3c'], [14, -3, '#c0541f'], [-2, -14, '#e0b13a']].forEach(l => {
        s += `<ellipse cx="${CX + l[0]}" cy="${f(y + l[1])}" rx="3.4" ry="2" fill="${l[2]}"/>`;
      });
    }
    return s;
  }

  function bridgeArt(c) {
    let s = `<rect x="0" y="31" width="200" height="109" fill="#cdeeff"/>`;
    s += `<path d="M0 62 Q50 48 100 60 T200 56 V140 H0 Z" fill="#9bd57b"/>`;
    s += `<path d="M20 140 L22 92 Q60 82 92 66 L44 140 Z" fill="#6cc04a"/>`;
    s += `<path d="M180 140 L178 92 Q140 82 108 66 L156 140 Z" fill="#6cc04a"/>`;
    const water = 'M92 66 H108 L160 140 H40 Z';
    s += `<path d="${water}" fill="#9c8467"/>` + rocks(50, 150, 96, 138, 24, 9) + `<path d="${water}" fill="#55b0ec" opacity=".72"/>`;
    s += `<path d="M0 37 H24 L20 140 H0 Z" fill="#a3a39b"/><path d="M200 37 H176 L180 140 H200 Z" fill="#a3a39b"/>`;
    for (let y = 52; y < 140; y += 16) s += `<path d="M0 ${y} H22 M178 ${y} H200" stroke="#8a8a83" stroke-width="1"/>`;
    if (c.fish) s += smallFish(86, 110, 0.26);
    return s;
  }

  function road(isBridge) {
    let s = `<rect x="0" y="18" width="200" height="13" fill="#5b5f63"/>`;
    for (let x = 4; x < 200; x += 22) s += `<rect x="${x}" y="23.6" width="11" height="1.8" rx=".9" fill="#ffd34d"/>`;
    s += `<rect x="0" y="12.5" width="200" height="1.8" fill="#d9dde0"/>`;
    for (let x = 6; x < 200; x += 24) s += `<rect x="${x}" y="12.5" width="1.8" height="5.5" fill="#c4c9cd"/>`;
    if (isBridge) s += `<rect x="0" y="31" width="200" height="6" fill="#474b4f"/>`;
    return s;
  }

  function trees() {
    const r = rng(7);
    let out = '';
    for (let x = -4; x < 210; x += 13) {
      const h = 6 + r() * 6;
      out += `<circle cx="${f(x + r() * 6)}" cy="${f(19 - h * 0.6)}" r="${f(h)}" fill="${r() > 0.5 ? '#4f9d3a' : '#5fb043'}"/>`;
    }
    return out;
  }

  function pond(y) {
    let d = `M0 ${f(y)}`;
    for (let x = 0; x < 200; x += 20) d += ' q5 -3 10 0 t10 0';
    return `<path d="${d} V140 H0 Z" fill="#3b8fd8" opacity=".6"/>`;
  }

  function rain() {
    let s = `<g fill="#9aa7b2" opacity=".9"><ellipse cx="40" cy="4" rx="34" ry="9"/><ellipse cx="110" cy="2" rx="40" ry="9"/><ellipse cx="175" cy="5" rx="32" ry="9"/></g>`;
    const r = rng(13);
    s += '<g stroke="#7fb6e6" stroke-width="1.2" stroke-linecap="round" opacity=".8">';
    for (let i = 0; i < 34; i++) {
      const x = r() * 200, y = 10 + r() * 120;
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - 3)}" y2="${f(y + 8)}"/>`;
    }
    return s + '</g>';
  }

  // ---------- public builders ----------
  function crossing(key, over) {
    const c = Object.assign({ w: 1, h: 1, water: 'normal', bed: 'natural' }, TYPES[key] || TYPES.pipe, over || {});
    const id = 'rr' + (++uid);
    let s = `<svg viewBox="0 0 200 140" class="cx-art" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">`;
    s += `<rect width="200" height="140" fill="#cdeeff"/>` + trees();
    s += c.shape === 'bridge' ? bridgeArt(c) : culvertArt(c, id);
    s += road(c.shape === 'bridge');
    if (c.pond) s += pond(c.pondY == null ? 84 : c.pondY);
    if (c.rain) s += rain();
    return s + '</svg>';
  }

  function storm(misses, lives) {
    const pondY = 104 - (104 - 10) * Math.min(1, misses / lives);
    return crossing('pipe', { pond: true, pondY, rain: true, debris: misses > 0, water: 'high' });
  }

  function trouty(cls) {
    return `<svg viewBox="0 0 120 80" class="trouty ${cls || ''}" aria-hidden="true" focusable="false">${fishG(Object.assign({ face: true }, TROUT))}</svg>`;
  }

  function critter(sp) {
    if (sp.fish) return `<svg viewBox="0 0 120 80" class="critter-svg" aria-hidden="true" focusable="false">${fishG(sp.fish)}</svg>`;
    return `<span class="critter-emoji" aria-hidden="true">${sp.emoji}</span>`;
  }

  function smooth(p) {
    let d = `M${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // Stream map in a 100 × 170 box. `nodes` are crossing positions from bottom to top.
  function map(nodes) {
    const pts = [{ x: 50, y: 172 }].concat(nodes);
    const d = smooth(pts);
    const r = rng(17);
    let s = `<svg viewBox="0 0 100 170" class="map-bg" aria-hidden="true" focusable="false">`;
    s += `<rect width="100" height="170" fill="#bfe8a6"/>`;
    for (let i = 0; i < 40; i++) {
      const side = r() > 0.5;
      const x = side ? 2 + r() * 14 : 84 + r() * 14;
      const y = 4 + r() * 160;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.2 + r() * 2.4)}" fill="${r() > 0.5 ? '#5fb043' : '#4f9d3a'}"/>`;
    }
    for (let i = 0; i < 18; i++) s += `<circle cx="${f(20 + r() * 60)}" cy="${f(6 + r() * 156)}" r=".8" fill="#9ccf7f"/>`;
    s += `<rect y="162" width="100" height="8" fill="#2f8fd8"/><path d="M0 162 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" fill="#2f8fd8"/>`;
    s += `<path d="${d}" stroke="#2f8fd8" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${d}" stroke="#7fd0ff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-dasharray="6 3" class="map-flow"/>`;
    nodes.slice(0, -1).forEach(n => {
      s += `<rect x="${n.x - 15}" y="${n.y - 2.2}" width="30" height="4.4" rx="1" fill="#6b6f73"/>`;
      s += `<path d="M${n.x - 13} ${n.y} H${n.x + 13}" stroke="#ffd34d" stroke-width=".6" stroke-dasharray="2 2"/>`;
    });
    const top = nodes[nodes.length - 1];
    s += `<circle cx="${top.x}" cy="${top.y}" r="7" fill="#bff0ff" stroke="#2f8fd8" stroke-width="1.5"/>`;
    return s + '</svg>';
  }

  RR.svg = { crossing, storm, trouty, critter, map, TYPES };
})();
