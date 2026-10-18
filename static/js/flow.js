/* Native diagrams (Overview + Method): HTML node boxes connected by animated SVG arrows,
   with a side menu that highlights one module at a time and a guided tour.
   Configuration (modules, arrows) lives in static/js/figures.js. No dependencies. */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TOUR_MS = 5200;
  const NORMAL = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] };

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c)));
    return e;
  }
  function sv(tag, attrs = {}, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function build(root) {
    const cfg = (window.FIGURES || {})[root.dataset.fig];
    if (!cfg) return;
    const canvas = root.querySelector('.flow-canvas');
    const nodes = {};
    canvas.querySelectorAll('[data-node]').forEach((n) => (nodes[n.dataset.node] = n));
    const nodeMod = {};
    cfg.modules.forEach((m) => m.nodes.forEach((n) => (nodeMod[n] = m.key)));
    const st = { active: null, touring: false, timer: null };

    /* ---------------- arrows */
    // Wires sit under the boxes; their labels get their own layer above the boxes.
    const svg = sv('svg', { class: 'flow-wires', 'aria-hidden': 'true' });
    const lsvg = sv('svg', { class: 'flow-wires flow-labels', 'aria-hidden': 'true' });
    canvas.prepend(svg);
    canvas.append(lsvg);
    const defs = sv('defs', {}, svg);
    const mk = (id, cls, size = 7) => {
      const m = sv('marker', { id, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: size, markerHeight: size, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
      sv('path', { d: 'M0 0.8L9.5 5L0 9.2Z', class: cls }, m);
    };
    const mBase = root.id + '-arr', mOn = root.id + '-arr-on', mLoop = root.id + '-arr-loop', mThick = root.id + '-arr-thick';
    mk(mBase, 'fw-head'); mk(mOn, 'fw-head on'); mk(mLoop, 'fw-head loop'); mk(mThick, 'fw-head thick', 12);
    const wires = cfg.edges.map((e) => {
      const cls = 'fw' + (e.kind ? ' ' + e.kind : '');
      const g = sv('g', { class: cls, 'data-edge': e.from + '>' + e.to }, svg);
      const base = sv('path', { class: 'fw-base' }, g);
      const pulse = sv('path', { class: 'fw-pulse' }, g);
      let lg = null, label = null, pill = null;
      if (e.label) {
        lg = sv('g', { class: cls + ' fwl' + (e.pill ? ' haspill' : '') }, lsvg);
        if (e.pill) pill = sv('rect', { class: 'fw-pill', rx: 4 }, lg);
        const [main, sub] = e.label.split('_');
        label = sv('text', { class: 'fw-label' + (main.startsWith('ℒ') ? ' math' : '') }, lg);
        label.append(document.createTextNode(main));
        if (sub) sv('tspan', { class: 'sub', dy: 4 }, label).textContent = sub;
      }
      return { e, g, lg, base, pulse, label, pill };
    });

    // Box geometry in canvas layout pixels (offset* ignores CSS transforms and page zoom).
    function rectOf(n) {
      let x = 0, y = 0, cur = n;
      while (cur && cur !== canvas) { x += cur.offsetLeft; y += cur.offsetTop; cur = cur.offsetParent; }
      const w = n.offsetWidth, h = n.offsetHeight;
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    }
    // spec: side ('l' 'r' 't' 'b'), optionally '@0.3' (position along the side) or '@=id'
    // (line up with the centre of another node). Otherwise the point lines up with `ref`.
    function anchor(r, spec, ref) {
      const [side, pos] = spec.split('@');
      let f = null, at = null;
      if (pos != null) {
        if (pos[0] === '=') { if (nodes[pos.slice(1)]) at = rectOf(nodes[pos.slice(1)]); } else f = parseFloat(pos);
      }
      if (side === 'l' || side === 'r') {
        const x = side === 'l' ? r.x : r.x + r.w;
        const my = Math.min(14, r.h / 2);
        const y = at ? at.cy : f != null ? r.y + f * r.h : clamp(ref.cy, r.y + my, r.y + r.h - my);
        return [x, y];
      }
      const y = side === 't' ? r.y : r.y + r.h;
      const mx = Math.min(16, r.w / 2);
      const x = at ? at.cx : f != null ? r.x + f * r.w : clamp(ref.cx, r.x + mx, r.x + r.w - mx);
      return [x, y];
    }
    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      for (const s of [svg, lsvg]) {
        s.setAttribute('viewBox', `0 0 ${W} ${H}`);
        s.setAttribute('width', W); s.setAttribute('height', H);
      }
      for (const w of wires) {
        const { e } = w;
        const a = nodes[e.from], b = nodes[e.to];
        if (!a || !b) continue;
        const ra = rectOf(a), rb = rectOf(b);
        const fs = e.fs || 'r', ts = e.ts || 'l';
        const p0 = anchor(ra, fs, rb), p3 = anchor(rb, ts, { cx: p0[0], cy: p0[1] });
        const n0 = NORMAL[fs[0]], n3 = NORMAL[ts[0]];
        // small gaps so arrowheads touch the box edge (negative 'inset' starts inside the box)
        const g0 = e.inset ? -e.inset : e.bi ? 4 : 2, g3 = e.insetEnd != null ? -e.insetEnd : e.inset ? -e.inset : 4;
        const s = [p0[0] + n0[0] * g0, p0[1] + n0[1] * g0], t = [p3[0] + n3[0] * g3, p3[1] + n3[1] * g3];
        let d, lx, ly, anchorTxt = 'middle';
        if (e.route === 'above' || e.route === 'below') {
          const up = e.route === 'above';
          const rise = e.rise || 24;
          let y = up ? Math.min(s[1], t[1]) - rise : Math.max(s[1], t[1]) + rise;
          if (e.under && nodes[e.under]) { const u = rectOf(nodes[e.under]); y = up ? u.y - rise : u.y + u.h + rise; }  // clear a box
          const r = Math.min(10, rise / 2), dx = Math.sign(t[0] - s[0]) || 1, dy = up ? -1 : 1;
          d = `M${s[0]} ${s[1]}V${y - dy * r}Q${s[0]} ${y} ${s[0] + dx * r} ${y}H${t[0] - dx * r}Q${t[0]} ${y} ${t[0]} ${y - dy * r}V${t[1]}`;
          lx = s[0] + (t[0] - s[0]) * (e.lat != null ? e.lat : 0.5); ly = up ? y - (e.lgap || 7) : y + 15;
          if (e.pill) ly = y + 4;
          if (e.lseg === 'end') { lx = t[0]; ly = (y + t[1]) / 2 + 4; }   // on the last (vertical) leg
        } else {
          const dist = Math.hypot(t[0] - s[0], t[1] - s[1]);
          const k = clamp(dist * 0.42, 14, 90);
          const bend = e.bend || 0;
          const c1 = [s[0] + n0[0] * k, s[1] + n0[1] * k + bend], c2 = [t[0] + n3[0] * k, t[1] + n3[1] * k + bend];
          d = `M${s[0]} ${s[1]}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${t[0]} ${t[1]}`;
          if (w.label) {
            w.base.setAttribute('d', d);
            const pt = w.base.getPointAtLength(w.base.getTotalLength() / 2);
            const vertical = Math.abs(t[1] - s[1]) > Math.abs(t[0] - s[0]);
            lx = pt.x + (vertical ? 8 : 0); ly = pt.y + (vertical ? 4 : e.lpos === 'below' ? 16 : -7);
            anchorTxt = vertical ? 'start' : 'middle';
          }
        }
        w.base.setAttribute('d', d); w.pulse.setAttribute('d', d);
        if (w.label) {
          w.label.setAttribute('x', lx); w.label.setAttribute('y', ly);
          w.label.setAttribute('text-anchor', anchorTxt);
          if (w.pill) {
            const bb = w.label.getBBox();
            w.pill.setAttribute('x', bb.x - 8); w.pill.setAttribute('y', bb.y - 2);
            w.pill.setAttribute('width', bb.width + 16); w.pill.setAttribute('height', bb.height + 4);
          }
        }
      }
      paintMarkers();
    }
    function paintMarkers() {
      for (const w of wires) {
        const on = st.active && w.e.mods.includes(st.active);
        const m = `url(#${w.e.kind === 'loop' ? mLoop : w.e.kind === 'thick' ? mThick : on ? mOn : mBase})`;
        w.base.setAttribute('marker-end', m);
        if (w.e.bi) w.base.setAttribute('marker-start', m); else w.base.removeAttribute('marker-start');
      }
    }
    // redraw on size changes, one frame later (drawing inside the observer callback can re-trigger it)
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    ro.observe(canvas);
    canvas.querySelectorAll('img').forEach((im) => im.complete || im.addEventListener('load', draw, { once: true }));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

    /* ---------------- menu */
    const menu = root.querySelector('.ifig-menu');
    const playBtn = el('button', { class: 'ifig-btn', type: 'button', onclick: () => (st.touring ? stopTour() : startTour()) }, '▶ Take the tour');
    const resetBtn = el('button', { class: 'ifig-btn ghost', type: 'button', onclick: () => { stopTour(); select(null); } }, 'Show all');
    // one toolbar above the figure: module chips on the left, tour controls on the right
    const list = el('ol', { class: 'ifig-list', 'aria-label': cfg.label });
    const items = {};
    let lastStage = null;
    cfg.modules.forEach((m, i) => {
      if (m.stage && m.stage !== lastStage) {
        list.append(el('li', { class: 'ifig-stage-label' }, m.stage === 'a' ? 'Stage (a) · supervised training' : 'Stage (b) · reinforcement learning'));
        lastStage = m.stage;
      }
      const body = el('div', { class: 'ifig-body' }, el('div', { class: 'ifig-body-in' }, el('p', {}, m.desc),
        m.link ? el('a', { href: m.link, class: 'ifig-link' }, (m.linkText || 'More') + ' →') : null));
      const btn = el('button', { type: 'button', class: 'ifig-item-btn', 'aria-expanded': 'false',
        onclick: () => { stopTour(); select(st.active === m.key ? null : m.key); } },
      el('span', { class: 'ifig-num' }, String(i + 1)), el('span', { class: 'ifig-title' }, m.title));
      btn.addEventListener('mouseenter', () => hover(m.key));
      btn.addEventListener('mouseleave', () => hover(null));
      const li = el('li', { class: 'ifig-item', 'data-k': m.key }, btn, body, el('i', { class: 'ifig-progress' }));
      items[m.key] = li;
      list.append(li);
      m.nodes.forEach((n) => nodes[n] && nodes[n].setAttribute('data-step', String(i + 1)));
    });
    menu.append(list, el('div', { class: 'ifig-ctrls' }, playBtn, resetBtn));
    const caption = el('div', { class: 'ifig-desc', 'aria-live': 'polite' });
    root.append(caption);

    // nodes are clickable too
    Object.entries(nodes).forEach(([id, n]) => {
      const k = nodeMod[id];
      if (!k) return;
      n.addEventListener('mouseenter', () => hover(k));
      n.addEventListener('mouseleave', () => hover(null));
      n.addEventListener('click', () => { stopTour(); select(st.active === k ? null : k); });
      n.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); stopTour(); select(st.active === k ? null : k); } });
    });

    function hover(k) {
      root.classList.toggle('has-hover', !!k && !st.active);
      for (const [id, n] of Object.entries(nodes)) n.classList.toggle('hov', !!k && nodeMod[id] === k);
      for (const [key, li] of Object.entries(items)) li.classList.toggle('hover', key === k);
    }
    function select(k) {
      st.active = k;
      root.classList.toggle('has-active', !!k);
      for (const [id, n] of Object.entries(nodes)) n.classList.toggle('on', !!k && nodeMod[id] === k);
      for (const w of wires) {
        const on = !!k && w.e.mods.includes(k);
        w.g.classList.toggle('on', on);
        if (w.lg) w.lg.classList.toggle('on', on);
      }
      for (const [key, li] of Object.entries(items)) {
        li.classList.toggle('on', key === k);
        li.querySelector('.ifig-item-btn').setAttribute('aria-expanded', String(key === k));
      }
      const m = cfg.modules.find((x) => x.key === k);
      caption.innerHTML = '';
      if (m) caption.append(el('b', {}, m.title), ' ', m.desc, ' ', m.link ? el('a', { href: m.link }, (m.linkText || 'More') + ' →') : '');
      paintMarkers();
    }

    /* ---------------- guided tour */
    function step(i) {
      if (i >= cfg.modules.length) { stopTour(); select(null); return; }
      const k = cfg.modules[i].key;
      select(k);
      const prog = items[k].querySelector('.ifig-progress');
      prog.style.transition = 'none'; prog.style.width = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { prog.style.transition = `width ${TOUR_MS}ms linear`; prog.style.width = '100%'; }));
      st.timer = setTimeout(() => step(i + 1), TOUR_MS);
    }
    function startTour() {
      st.touring = true; root.classList.add('touring');
      playBtn.textContent = '❚❚ Pause tour';
      const start = st.active ? cfg.modules.findIndex((x) => x.key === st.active) + 1 : 0;
      step(start >= cfg.modules.length ? 0 : start);
    }
    function stopTour() {
      if (!st.touring) return;
      st.touring = false; root.classList.remove('touring');
      clearTimeout(st.timer);
      playBtn.textContent = '▶ Take the tour';
      root.querySelectorAll('.ifig-progress').forEach((p) => { p.style.transition = 'none'; p.style.width = '0'; });
    }
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { stopTour(); select(null); } });
    new IntersectionObserver((en) => { if (!en[0].isIntersecting) stopTour(); }, { threshold: 0.15 }).observe(canvas);
    select(null);
    draw();
  }

  document.querySelectorAll('.flowfig[data-fig]').forEach(build);
})();
