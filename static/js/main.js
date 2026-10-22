/* ThinkWorld project page — interactive components (vanilla JS, no dependencies). */
(function () {
  'use strict';

  const R = window.RESULTS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';

  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  function s(tag, attrs = {}, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  const fmt = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : v);
  const pct = (k, n) => (100 * k) / n;

  /* ---------------------------------------------------------------- tooltip */
  const tip = $('#tip');
  function showTip(html, ev) {
    tip.innerHTML = html;
    tip.style.opacity = 1;
    const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px';
    tip.style.top = ev.clientY + 14 + 'px';
  }
  const hideTip = () => (tip.style.opacity = 0);
  function bindTip(node, html) {
    node.addEventListener('mousemove', (e) => showTip(html, e));
    node.addEventListener('mouseleave', hideTip);
  }

  /* ---------------------------------------------------------------- lazy video helper */
  const lazyIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
        if (v.dataset.auto === '1') v.play().catch(() => {});
      } else if (v.dataset.auto === '1' && !v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: '200px 0px' });

  function lazyVideo(src, { poster, loop = true, auto = true, rate = 1 } = {}) {
    const v = h('video', { muted: true, playsinline: true, preload: 'none', poster, loop });
    v.muted = true;
    v.dataset.src = src;
    v.dataset.auto = auto ? '1' : '0';
    v.addEventListener('loadedmetadata', () => { v.playbackRate = rate; });
    v.addEventListener('play', () => { v.playbackRate = rate; });
    lazyIO.observe(v);
    return v;
  }

  /* ---------------------------------------------------------------- day / night toggle */
  (function themeToggle() {
    const root = document.documentElement;
    const btn = $('#theme-toggle');
    const meta = document.querySelector('meta[name="theme-color"]');
    const apply = (t) => {
      root.setAttribute('data-theme', t);
      if (meta) meta.setAttribute('content', t === 'dark' ? '#111410' : '#ffffff');
      if (btn) btn.setAttribute('aria-pressed', String(t === 'dark'));
    };
    apply(root.getAttribute('data-theme') || 'dark');
    if (btn) btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('tw-theme', next); } catch (e) {}
    });
  })();

  /* ---------------------------------------------------------------- nav + reveal */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const navLinks = $$('.nav li a');
  const secIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section.block').forEach((sec) => secIO.observe(sec));
  const revIO = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); revIO.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((e) => revIO.observe(e));

  /* ---------------------------------------------------------------- teaser video (placeholder until file exists) */
  (function teaser() {
    const v = $('#teaser-video');
    const ph = $('#teaser-placeholder');
    const show = () => { ph.style.display = 'none'; v.style.visibility = 'visible'; };
    v.style.visibility = 'hidden';
    v.addEventListener('loadeddata', show);
    v.querySelector('source').addEventListener('error', () => { v.removeAttribute('autoplay'); });
  })();

  /* ---------------------------------------------------------------- data mosaic */
  (function mosaic() {
    const box = $('#mosaic');
    if (!box || !window.DATA_MOSAIC) return;
    for (const t of window.DATA_MOSAIC) {
      let media;
      if (t.srcs) {
        // playlist tile: play the dataset's sample clips one after another
        let k = 0;
        media = lazyVideo(t.srcs[0], { poster: t.srcs[0].replace('.mp4', '.webp'), loop: false });
        media.addEventListener('ended', () => {
          k = (k + 1) % t.srcs.length;
          media.src = t.srcs[k];
          media.play().catch(() => {});
        });
      } else if (t.kind === 'video') {
        media = lazyVideo(t.src, { poster: t.src.replace('.mp4', '.webp') });
      } else {
        media = h('img', { src: t.src, alt: t.dataset, loading: 'lazy' });
      }
      box.append(h('div', { class: 'tile' + (t.human ? ' human' : '') }, media, h('span', { class: 'lab' }, t.dataset)));
    }
  })();

  /* ---------------------------------------------------------------- generic charts */
  function hbar(svgSel, rows, { max, unit = '', w = 560, rowH = 30, labelW = 170, valFmt, colorOf, note } = {}) {
    const svg = $(svgSel);
    if (!svg) return;
    const H = rows.length * rowH + 8 + (note ? 18 : 0);
    svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    const plotW = w - labelW - 90;
    max = max || Math.max(...rows.map((r) => r.v));
    rows.forEach((r, i) => {
      const y = i * rowH + 4;
      const g = s('g', {}, svg);
      s('text', { x: labelW - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': 13.5,
        fill: r.ours ? 'var(--accent-ink)' : 'var(--ink-2)', 'font-weight': r.ours ? 700 : 500 }, g).innerHTML = r.label;
      s('rect', { x: labelW, y: y + 5, width: plotW, height: rowH - 10, rx: 5, fill: 'var(--panel-2)' }, g);
      const bw = Math.max(2, (plotW * r.v) / max);
      const bar = s('rect', { x: labelW, y: y + 5, width: 0, height: rowH - 10, rx: 5, fill: colorOf ? colorOf(r) : 'var(--neutral-bar)' }, g);
      bar.style.transition = 'width .9s cubic-bezier(.2,.7,.2,1)';
      requestAnimationFrame(() => setTimeout(() => bar.setAttribute('width', bw), 50 + i * 40));
      s('text', { x: labelW + bw + 8, y: y + rowH / 2 + 4, 'font-size': 13, fill: 'var(--ink-2)', 'font-weight': r.ours ? 700 : 500 }, g)
        .textContent = (valFmt ? valFmt(r) : r.v) + unit;
      if (r.tip) bindTip(g, r.tip);
    });
    if (note) s('text', { x: w - 4, y: H - 2, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' }, svg).textContent = note;
  }

  // Training data by source
  hbar('#chart-data', R.data.map((d) => ({ label: d.name, v: d.hours, human: d.human,
    tip: `<b>${d.name}</b><br>${d.hours.toLocaleString()} h · ${d.episodes} episodes<br>${d.human ? 'Human egocentric video' : 'Robot demonstrations'}` })),
  { unit: ' h', labelW: 120, valFmt: (r) => Math.round(r.v).toLocaleString(), colorOf: (r) => (r.human ? 'var(--data-human)' : 'var(--data-robot)') });

  // Latency
  hbar('#chart-latency', R.latency.map((d) => ({ label: d.name.replace(' (Ours)', ''), v: d.p50, ours: d.ours,
    tip: `<b>${d.name}</b><br>p50 ${d.p50} ms · p95 ${d.p95} ms<br>peak memory ${d.mem} GiB` })),
  { unit: ' ms', labelW: 140, w: 470, valFmt: (r) => Math.round(r.v), colorOf: (r) => (r.ours ? 'var(--ours)' : 'var(--neutral-bar)'), note: 'p50 latency per call, H100, batch 1' });

  // Ablation
  (function () {
    const rows = R.ablation.rows;
    hbar('#chart-ablation', rows.map((r, i) => ({ label: r.name, v: r.v[5], ours: r.ours,
      delta: i ? r.v[5] - rows[i - 1].v[5] : null })),
    { max: 60, labelW: 190, w: 560, rowH: 34,
      valFmt: (r) => r.v.toFixed(1) + (r.delta != null ? `  (+${r.delta.toFixed(1)})` : ''),
      colorOf: (r) => (r.ours ? 'var(--ours)' : 'var(--neutral-bar)'), note: 'LIBERO-PRO average success (%)' });
  })();

  /* ---------------------------------------------------------------- tables */
  function rankCols(rows, getVals) {
    const n = getVals(rows[0]).length;
    const best = [], second = [];
    for (let c = 0; c < n; c++) {
      const vals = rows.map((r) => parseFloat(getVals(r)[c])).filter((v) => !isNaN(v));
      const uniq = [...new Set(vals)].sort((a, b) => b - a);
      best.push(uniq[0]); second.push(uniq[1]);
    }
    return { best, second };
  }
  function cell(v, c, rank, extraClass = '') {
    const num = parseFloat(v);
    let cls = extraClass;
    if (!isNaN(num) && rank) {
      if (num === rank.best[c]) cls += ' best';
      else if (num === rank.second[c]) cls += ' second';
    }
    return h('td', { class: cls.trim() || null, html: v == null ? '–' : (typeof v === 'number' ? v.toFixed(1) : v) });
  }

  (function liberoTable() {
    const L = R.libero;
    const rl = rankCols(L.rows, (r) => r.libero);
    const rp = rankCols(L.rows, (r) => r.pro);
    const t = h('table', { class: 'res' });
    t.append(h('thead', {},
      h('tr', { class: 'grp' }, h('th', {}), h('th', {}), h('th', { colspan: 5, class: 'div' }, 'LIBERO'), h('th', { colspan: 6, class: 'div' }, 'LIBERO-PRO')),
      h('tr', {}, h('th', {}, 'Model'), h('th', {}, 'Params (B)'),
        ...L.cols.map((c, i) => h('th', { class: i === 0 ? 'div' : null }, c)),
        ...L.proCols.map((c, i) => h('th', { class: i === 0 ? 'div' : null }, c)))));
    const tb = h('tbody');
    for (const r of L.rows) {
      tb.append(h('tr', { class: r.ours ? 'ours' : null },
        h('td', { html: r.name }), h('td', {}, r.params.toFixed(1)),
        ...r.libero.map((v, c) => cell(v, c, rl, c === 0 ? 'div' : '')),
        ...r.pro.map((v, c) => cell(v, c, rp, c === 0 ? 'div' : ''))));
    }
    t.append(tb);
    $('#table-libero').append(t);
  })();

  function simpleTable(sel, cols, rows, { first = 'Method', rank = true } = {}) {
    const box = $(sel);
    if (!box) return;
    const rk = rank ? rankCols(rows, (r) => r.v) : null;
    const t = h('table', { class: 'res' },
      h('thead', {}, h('tr', {}, h('th', {}, first), ...cols.map((c) => h('th', {}, c)))),
      h('tbody', {}, rows.map((r) => h('tr', { class: r.ours ? 'ours' : null }, h('td', { html: r.name }),
        ...r.v.map((v, c) => cell(v, c, rk))))));
    box.append(t);
  }
  simpleTable('#table-ablation', R.ablation.cols, R.ablation.rows, { first: 'Variant' });

  /* ---------------------------------------------------------------- CoD effect on future prediction (Table 2) */
  (function codChart() {
    const svg = $('#chart-cod');
    if (!svg) return;
    // Generated CoD first, then the ablated conditions.
    const rows = [...R.cod.filter((r) => r.ours), ...R.cod.filter((r) => !r.ours)];
    const ref = rows[0].top;
    const W = 520, H = 330, padL = 52, padR = 12, padT = 34, padB = 58;
    const lo = 0.50, hi = 0.64;   // zoomed axis, clearly marked with a break
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const plotH = H - padT - padB, plotW = W - padL - padR;
    const Y = (v) => padT + plotH * (1 - (v - lo) / (hi - lo));
    [0.50, 0.55, 0.60].forEach((v) => {
      s('line', { x1: padL, x2: W - padR, y1: Y(v), y2: Y(v), stroke: 'var(--line)' }, svg);
      s('text', { x: padL - 8, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--muted)' }, svg).textContent = v.toFixed(2);
    });
    // axis break marker
    const by = Y(lo) - 2;
    s('path', { d: `M${padL - 7},${by + 5} l5,-5 l4,5 l5,-5`, stroke: 'var(--muted)', fill: 'none', 'stroke-width': 1.4 }, svg);
    s('text', { x: 4, y: 14, 'font-size': 12, fill: 'var(--muted)' }, svg).textContent = 'Cosine similarity, top-25% motion patches';
    const bw = plotW / rows.length;
    const anim = [];
    rows.forEach((r, i) => {
      const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
      const col = r.ours ? 'var(--ours)' : 'var(--neutral-bar)';
      const rect = s('rect', { x, y: Y(lo), width: w, height: 0, rx: 5, fill: col }, svg);
      rect.style.transition = `all .9s cubic-bezier(.2,.7,.2,1) ${i * 90}ms`;
      anim.push(() => { rect.setAttribute('y', Y(r.top)); rect.setAttribute('height', Y(lo) - Y(r.top)); });
      s('text', { x: x + w / 2, y: Y(r.top) - (r.ours ? 9 : 22), 'text-anchor': 'middle', 'font-size': r.ours ? 17 : 14,
        'font-weight': r.ours ? 800 : 600, fill: r.ours ? 'var(--accent-ink)' : 'var(--ink-2)' }, svg).textContent = r.top.toFixed(2);
      if (!r.ours) {
        s('text', { x: x + w / 2, y: Y(r.top) - 7, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--bad)' }, svg)
          .textContent = '−' + (ref - r.top).toFixed(2);
      }
      const lab = s('text', { x: x + w / 2, y: H - padB + 20, 'text-anchor': 'middle', 'font-size': 13,
        'font-weight': r.ours ? 700 : 500, fill: r.ours ? 'var(--accent-ink)' : 'var(--ink-2)' }, svg);
      const [w1, ...rest] = r.name.split(' ');
      lab.textContent = w1;
      s('text', { x: x + w / 2, y: H - padB + 36, 'text-anchor': 'middle', 'font-size': 12, fill: r.ours ? 'var(--accent-ink)' : 'var(--muted)' }, svg)
        .textContent = rest.join(' ');
      const hit = s('rect', { x, y: padT, width: w, height: plotH, fill: 'transparent' }, svg);
      bindTip(hit, `<b>${r.name}</b><br>top-25% motion patches: ${r.top.toFixed(2)}<br>all patches: ${r.all.toFixed(2)}`);
    });
    runWhenVisible(svg, () => anim.forEach((f) => f()));
  })();

  /* ---------------------------------------------------------------- real-robot success chart */
  (function rrChart() {
    const svg = $('#chart-rr');
    const rr_anim = [];
    const M = R.methods;
    $('#rr-legend').append(...M.map((m) => h('span', {}, h('i', { style: `background:${m.color}` }), m.name)));
    const W = 1000, H = 330, padL = 40, padB = 62, padT = 22;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const plotH = H - padB - padT;
    const groups = [];
    R.realRobot.tasks.forEach((t) => ['id', 'ood'].forEach((d) => groups.push({ t, d })));
    const gapTask = 34, gapGroup = 14;
    const usable = W - padL - 10 - gapTask * 2 - gapGroup * 3;
    const gw = usable / groups.length;
    const bw = (gw - 10) / M.length;
    // grid
    [0, 25, 50, 75, 100].forEach((v) => {
      const y = padT + plotH * (1 - v / 100);
      s('line', { x1: padL, x2: W - 6, y1: y, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }, svg);
      s('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--muted)' }, svg).textContent = v;
    });
    let x = padL + 6;
    groups.forEach((g, gi) => {
      if (gi > 0) x += gi % 2 === 0 ? gapTask : gapGroup;
      const g0 = x;
      M.forEach((m, mi) => {
        const [k, n] = g.t[g.d][m.key];
        const v = pct(k, n);
        const bx = x + 5 + mi * bw;
        const bh = plotH * v / 100;
        const rect = s('rect', { x: bx, y: padT + plotH, width: bw - 3, height: 0, rx: 3, fill: m.color }, svg);
        rect.style.transition = `all .9s cubic-bezier(.2,.7,.2,1) ${gi * 60 + mi * 30}ms`;
        rr_anim.push(() => { rect.setAttribute('y', padT + plotH - bh); rect.setAttribute('height', Math.max(bh, 1.5)); });
        const lab = s('text', { x: bx + (bw - 3) / 2, y: padT + plotH - bh - 5, 'text-anchor': 'middle', 'font-size': 10.5,
          fill: m.key === 'thinkworld' ? 'var(--accent-ink)' : 'var(--muted)', 'font-weight': m.key === 'thinkworld' ? 700 : 500 }, svg);
        lab.textContent = v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
        const hit = s('rect', { x: bx, y: padT, width: bw - 3, height: plotH, fill: 'transparent' }, svg);
        bindTip(hit, `<b>${m.name}</b><br>${g.t.name} · ${g.d === 'id' ? 'In-domain' : 'Out-of-distribution'}<br>${k}/${n} trials (${v.toFixed(1)}%)`);
      });
      x += gw;
      s('text', { x: (g0 + x) / 2, y: padT + plotH + 18, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', 'font-weight': 600 }, svg)
        .textContent = g.d === 'id' ? 'In-domain' : 'OOD';
      if (g.d === 'ood') {
        const mid = (g0 - gw - gapGroup + x) / 2;
        s('text', { x: mid, y: padT + plotH + 42, 'text-anchor': 'middle', 'font-size': 14, fill: 'var(--ink)', 'font-weight': 700 }, svg)
          .textContent = g.t.name;
      }
    });
    runWhenVisible(svg, () => rr_anim.forEach((f) => f()));
  })();
  function runWhenVisible(el, fn) {
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { fn(); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
  }

  /* ---------------------------------------------------------------- real-robot comparison player */
  (function rrPlayer() {
    const V = window.VIDEOS && window.VIDEOS.real_robot;
    if (!V) return;
    const st = { task: 'color', speed: 2, playing: true, visible: false };
    const grid = $('#rr-grid');
    let tiles = [];
    let restartTimer = null;

    const taskTabs = $('#rr-task');
    R.realRobot.tasks.forEach((t) => {
      taskTabs.append(h('button', { class: 'tab' + (t.key === st.task ? ' on' : ''), 'data-v': t.key,
        onclick: (e) => { st.task = t.key; $$('.tab', taskTabs).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); render(); } }, t.name));
    });
    segBind('#rr-speed', (v) => { st.speed = +v; tiles.forEach((t) => (t.v.playbackRate = st.speed)); });
    $('#rr-play').addEventListener('click', () => { st.playing = !st.playing; sync(); updatePlayBtn(); });
    $('#rr-restart').addEventListener('click', restartAll);
    const updatePlayBtn = () => ($('#rr-play').textContent = st.playing ? '❚❚ Pause' : '▶ Play');
    $$('.task-go').forEach((b) => b.addEventListener('click', () => {
      const tab = $(`#rr-task .tab[data-v="${b.dataset.task}"]`);
      if (tab) tab.click();
      $('#rollouts').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    function render() {
      clearTimeout(restartTimer);
      tiles.forEach((t) => { t.v.pause(); t.v.removeAttribute('src'); t.v.load(); });
      grid.innerHTML = '';
      const task = R.realRobot.tasks.find((t) => t.key === st.task);
      $('#rr-instr').textContent = `“${task.instr}”`;
      // Matrix: one column per method, in-domain row on top, OOD row below.
      grid.append(h('div', { class: 'cmp-row head' },
        ...R.methods.map((m) => h('div', { class: 'colhead' + (m.key === 'thinkworld' ? ' ours' : '') }, m.name))));
      tiles = [];
      [['id', 'In-domain', 'same setting as the training demos'], ['ood', 'Out-of-distribution', task.oodWhat]].forEach(([dom, label, sub]) => {
        const row = h('div', { class: 'cmp-row' });
        const block = h('div', { class: 'cmp-block ' + dom },
          h('div', { class: 'rowlabel' }, h('b', {}, label), h('span', {}, ' · ' + sub)), row);
        R.methods.forEach((m) => {
          const meta = V[st.task][dom][m.key];
          const base = `static/videos/real_robot/${st.task}/${dom}/${m.key}`;
          const v = h('video', { muted: true, playsinline: true, preload: 'auto', poster: base + '.webp' });
          v.muted = true;
          const bar = h('i');
          const time = h('span', { class: 'time' }, '0:00');
          const ok = meta.outcome === 'success';
          const tile = h('div', { class: 'vtile' + (m.key === 'thinkworld' ? ' ours' : '') }, v,
            h('div', { class: 'done' }),
            h('span', { class: 'result ' + (ok ? 'success' : 'fail') }, ok ? '✓ Success' : '✗ Failure'),
            time, h('div', { class: 'bar' }, bar));
          tile.title = `${m.name} · ${label}`;
          const t = { v, tile, bar, time, ended: false };
          v.addEventListener('loadedmetadata', () => (v.playbackRate = st.speed));
          v.addEventListener('timeupdate', () => {
            if (!v.duration) return;
            bar.style.width = (100 * v.currentTime) / v.duration + '%';
            time.textContent = clock(v.currentTime) + ' / ' + clock(v.duration);
          });
          v.addEventListener('ended', () => {
            t.ended = true; tile.classList.add('ended');
            if (tiles.every((x) => x.ended)) restartTimer = setTimeout(restartAll, 1600);
          });
          row.append(tile);
          if (st.visible) v.src = base + '.mp4'; else v.dataset.src = base + '.mp4';
          tiles.push(t);
        });
        grid.append(block);
      });
      // demos
      const demos = $('#rr-demos');
      demos.innerHTML = '';
      const D = (window.VIDEOS.demos || {})[st.task] || [];
      D.forEach((d, i) => {
        const src = `static/videos/demos/${st.task}_${i + 1}.mp4`;
        demos.append(h('div', { class: 'vtile' }, lazyVideo(src, { poster: src.replace('.mp4', '.webp'), rate: 2 }),
          h('span', { class: 'name' }, `Demo ${i + 1}`)));
      });
      sync();
    }
    function restartAll() {
      clearTimeout(restartTimer);
      tiles.forEach((t) => { t.ended = false; t.tile.classList.remove('ended'); try { t.v.currentTime = 0; } catch (e) {} });
      sync();
    }
    function sync() {
      for (const t of tiles) {
        if (st.visible && !t.v.src && t.v.dataset.src) t.v.src = t.v.dataset.src;
        t.v.playbackRate = st.speed;
        if (st.playing && st.visible && !t.ended) t.v.play().catch(() => {});
        else t.v.pause();
      }
    }
    new IntersectionObserver((en) => { st.visible = en[0].isIntersecting; sync(); }, { rootMargin: '100px 0px' }).observe(grid);
    render();
  })();

  function segBind(sel, fn) {
    const seg = $(sel);
    if (!seg) return;
    $$('button', seg).forEach((b) => b.addEventListener('click', () => {
      $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
      fn(b.dataset.v);
    }));
  }
  function clock(t) { t = Math.max(0, t || 0); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }

  /* ---------------------------------------------------------------- skill composition */
  (function skill() {
    const S = window.VIDEOS && window.VIDEOS.skill;
    if (!S) return;
    // One set per scene. Atomic skills are listed in data order (videos skill/<set>/atomic_<n>);
    // each scenario has one verified ThinkWorld rollout and, if recorded, the human demo of the same task.
    const SETS = [
      { key: 'oven', name: 'Oven',
        atomic: [{ key: 'open', short: 'OPEN' }, { key: 'putL', short: 'PUT-L' }, { key: 'putR', short: 'PUT-R' },
          { key: 'close', short: 'CLOSE' }],
        scen: [{ human: 1, rollout: 1, uses: ['open', 'close'] },
          { human: 2, rollout: 2, uses: ['open', 'putL', 'close'] }] },
      { key: 'drawer', name: 'Drawer',
        atomic: [{ key: 'openU', short: 'OPEN', tag: 'upper' }, { key: 'putLU', short: 'PUT-L', tag: 'upper' },
          { key: 'putRU', short: 'PUT-R', tag: 'upper' }, { key: 'closeU', short: 'CLOSE', tag: 'upper' },
          { key: 'openD', short: 'OPEN', tag: 'lower' }, { key: 'putLD', short: 'PUT-L', tag: 'lower' },
          { key: 'putRD', short: 'PUT-R', tag: 'lower' }, { key: 'closeD', short: 'CLOSE', tag: 'lower' }],
        scen: [{ human: 1, rollout: 1, uses: ['openU', 'putLU', 'closeU'] },
          { human: 2, rollout: 2, uses: ['openU', 'putRU', 'closeU'] },
          { human: 3, rollout: 3, uses: ['openD', 'putLD', 'closeD'] }] },
    ].filter((st) => S[st.key]);
    const st = { set: 0, cur: 0 };
    const vid = (set, name) => `static/videos/skill/${set}/${name}.mp4`;
    const poster = (src) => src.replace('.mp4', '.webp');

    const setSeg = $('#skill-set');
    const tabs = $('#skill-tabs');
    const atomicBox = $('#skill-atomic');
    const humanBox = $('#skill-human');
    const robotBox = $('#skill-robot');
    let atomicItems = [];
    SETS.forEach((set, i) => setSeg.append(h('button', { class: i === 0 ? 'on' : '', type: 'button',
      onclick: (e) => { st.set = i; st.cur = 0; $$('button', setSeg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); build(); } },
    set.name)));

    // tabs + atomic row for the selected set
    function build() {
      const set = SETS[st.set], D = S[set.key];
      tabs.innerHTML = '';
      set.scen.forEach((sc, i) => tabs.append(h('button', { class: 'tab' + (i === st.cur ? ' on' : ''),
        onclick: (e) => { st.cur = i; $$('.tab', tabs).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); render(); } },
      (D.rollout[sc.rollout - 1] || {}).label || `Task ${i + 1}`)));
      atomicBox.innerHTML = '';
      atomicItems = set.atomic.map((a, i) => {
        const src = vid(set.key, `atomic_${i + 1}`);
        const step = h('span', { class: 'step' }, '');
        const item = h('div', { class: 'item' },
          h('div', { class: 'vtile' }, lazyVideo(src, { poster: poster(src), rate: 1.5 })),
          h('div', { class: 'cap' }, step, a.short, a.tag ? h('span', { class: 'tag' }, a.tag) : ''),
          h('div', { class: 'desc' }, D.atomic[i] ? D.atomic[i].label : ''));
        atomicBox.append(item);
        return { a, item, step };
      });
      render();
    }

    function render() {
      const set = SETS[st.set], D = S[set.key], sc = set.scen[st.cur];
      const roll = D.rollout[sc.rollout - 1] || {};
      $('#skill-instr').textContent = roll.task ? `“${roll.task.charAt(0).toUpperCase() + roll.task.slice(1)}.”` : '';
      humanBox.innerHTML = ''; robotBox.innerHTML = '';
      if (sc.human) {
        const hs = vid(set.key, `human_${sc.human}`);
        humanBox.append(lazyVideo(hs, { poster: poster(hs) }), h('span', { class: 'name' }, roll.label || ''));
      } else {
        // human demo of this task not released yet
        humanBox.append(h('div', { class: 'video-placeholder small' },
          h('strong', {}, 'Human demonstration'), h('span', {}, 'coming soon')));
      }
      const rs = vid(set.key, `rollout_${sc.rollout}`);
      robotBox.append(lazyVideo(rs, { poster: poster(rs), rate: 2 }),
        h('span', { class: 'name' }, 'ThinkWorld'), h('span', { class: 'time' }, '2×'),
        h('span', { class: 'result success' }, '✓ Full task'));
      atomicItems.forEach(({ a, item, step }) => {
        const k = sc.uses.indexOf(a.key);
        item.classList.toggle('used', k >= 0);
        step.textContent = k >= 0 ? k + 1 : '–';
      });
    }
    build();
  })();

  /* ---------------------------------------------------------------- future-prediction viewer */
  (function futurePred() {
    const F = window.FUTURE_PRED;
    if (!F) return;
    // short labels; the group headers carry the rest
    const L = { cur_rgb: 'Now', fut_rgb: '+1 s', cur_gt: 'Now', fut_gt: '+1 s · target',
      cod: 'With CoD', shuffle: 'Shuffled CoD', empty: 'Empty CoD', nocod: 'No CoD' };
    const tabs = $('#fp-tabs'), board = $('#fp-board');
    let cur = F.samples[0].id;
    F.samples.forEach((sm) => tabs.append(h('button', { class: 'tab small' + (sm.id === cur ? ' on' : ''),
      onclick: (e) => { cur = sm.id; $$('.tab', tabs).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); render(); } }, sm.dataset)));
    const cell = (key, cls) => h('figure', { class: 'fp-cell' + (cls ? ' ' + cls : '') },
      h('img', { src: `static/images/future_pred/${cur}/${key}.webp`, alt: L[key] }), h('figcaption', {}, L[key]));
    const group = (cls, title, sub, cells) => h('div', { class: 'fp-grp ' + cls },
      h('div', { class: 'fp-gh' }, h('b', {}, title), sub ? h('span', {}, sub) : null), h('div', { class: 'fp-cells' }, cells));
    function render() {
      board.innerHTML = '';
      board.append(
        group('obs', 'Observed', 'frames · DINOv3 features', [cell('cur_rgb'), cell('fut_rgb'), cell('cur_gt'), cell('fut_gt', 'gt')]),
        group('pred', 'Imagined +1 s', 'features, under different CoD', [cell('cod', 'hl'), cell('shuffle'), cell('empty'), cell('nocod')]));
    }
    render();
  })();

  /* ---------------------------------------------------------------- attention gallery */
  (function attention() {
    const A = window.ATTENTION;
    if (!A) return;
    const order = ['EgoDex', 'EgoVerse', 'Bimanual YAM', 'DROID', 'RoboCOIN', 'Bridge', 'RT-1', 'BC-Z'];
    const st = { ds: 'Highlights', src: 'cod', alpha: 1 };
    const tabs = $('#attn-tabs');
    ['Highlights', ...order].forEach((d, i) => tabs.append(h('button', { class: 'tab small' + (i === 0 ? ' on' : ''),
      onclick: (e) => { st.ds = d; $$('.tab', tabs).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); render(); } }, d)));
    segBind('#attn-src', (v) => { st.src = v; render(); });
    $('#attn-alpha').addEventListener('input', (e) => { st.alpha = e.target.value / 100; $$('#attn-grid img.ov').forEach((i) => (i.style.opacity = st.alpha)); });
    const grid = $('#attn-grid');
    function render() {
      grid.innerHTML = '';
      let items = st.ds === 'Highlights'
        ? order.map((d) => A.find((a) => a.dataset === d)).filter(Boolean)
        : A.filter((a) => a.dataset === st.ds);
      for (const a of items) {
        const ov = h('img', { class: 'ov', src: `static/images/attention/${a.id}_${st.src}.webp`, alt: 'attention overlay', loading: 'lazy' });
        ov.style.opacity = st.alpha;
        grid.append(h('figure', { class: 'attn-card' },
          h('div', { class: 'stack' }, h('img', { src: `static/images/attention/${a.id}_raw.webp`, alt: a.task, loading: 'lazy' }), ov),
          h('figcaption', {}, h('span', { class: 'pill' + (a.human ? ' human' : '') }, a.human ? 'Human' : 'Robot'),
            h('b', {}, a.dataset), ' · ', a.task)));
      }
    }
    render();
  })();

  /* ---------------------------------------------------------------- closed-loop viewer */
  (function closedLoop() {
    const C = window.CLOSED_LOOP;
    if (!C) return;
    const st = { t: 0, i: 0, timer: null };
    const tabs = $('#cl-tabs');
    // episode list (left of the viewer): full task name + robot
    C.forEach((c, i) => tabs.append(h('button', { class: 'cl-opt' + (i === 0 ? ' on' : ''), role: 'tab', type: 'button',
      onclick: (e) => { st.t = i; st.i = 0; $$('.cl-opt', tabs).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); setup(); } },
    h('b', {}, c.title), h('span', {}, c.robot))));
    const grid = $('#cl-grid');
    const slider = $('#cl-slider');
    const imgs = {};
    // two small groups: what the robot sees, and the +1 s features (predicted vs. actual)
    const defs = [['cur', 'Now', ''], ['obs', 'Reached, +1 s', ''], ['pred', 'Predicted', 'pca'], ['tgt', 'Actual', 'pca']];
    const cells = {};
    defs.forEach(([k, label, cls]) => {
      const img = h('img', { class: cls || null, alt: label });
      imgs[k] = { img };
      cells[k] = h('figure', { class: 'fp-cell' + (k === 'pred' ? ' hl' : k === 'tgt' ? ' gt' : '') }, img, h('figcaption', {}, label));
    });
    const group = (cls, title, sub, ks) => h('div', { class: 'fp-grp ' + cls },
      h('div', { class: 'fp-gh' }, h('b', {}, title), h('span', {}, sub)), h('div', { class: 'fp-cells' }, ks.map((k) => cells[k])));
    grid.append(group('obs', 'Observed', 'camera frames', ['cur', 'obs']),
      group('pred', 'Features at +1 s', 'imagined vs. real', ['pred', 'tgt']));
    function setup() {
      const c = C[st.t];
      slider.max = c.steps.length - 1;
      slider.value = st.i;
      c.steps.forEach((_, i) => defs.forEach(([k]) => { const im = new Image(); im.src = path(c, i, k); }));  // preload
      show();
    }
    const path = (c, i, k) => `static/images/closed_loop/${c.key}/${String(i).padStart(2, '0')}_${k}.webp`;
    function show() {
      const c = C[st.t], stp = c.steps[st.i];
      defs.forEach(([k]) => (imgs[k].img.src = path(c, st.i, k)));
      $('#cl-step').textContent = `query step ${stp.query} → step ${stp.target}`;
      slider.value = st.i;
    }
    slider.addEventListener('input', () => { st.i = +slider.value; show(); });
    const btn = $('#cl-play');
    btn.addEventListener('click', () => {
      if (st.timer) { clearInterval(st.timer); st.timer = null; btn.textContent = '▶ Play'; return; }
      btn.textContent = '❚❚ Pause';
      st.timer = setInterval(() => { st.i = (st.i + 1) % C[st.t].steps.length; show(); }, 650);
    });
    setup();
  })();

  /* ---------------------------------------------------------------- bibtex copy */
  (function () {
    const pre = $('#bib');
    if (!pre) return;
    const b = h('button', { class: 'copy' }, 'Copy');
    b.addEventListener('click', () => {
      const text = pre.firstChild.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
        () => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); },
        () => { b.textContent = 'Select & copy'; });
    });
    pre.append(b);
  })();
})();
