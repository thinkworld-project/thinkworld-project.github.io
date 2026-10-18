/* Method figure: a looping "data flow" through the model, in input order.
   inputs light up one by one -> a light band rises through the VLM -> output tokens appear
   -> (stage a) key/value features flow into the action decoder -> action tokens appear.
   Runs only for the stage that is selected (menu, click or tour) and on screen;
   disabled for prefers-reduced-motion. */
(function () {
  'use strict';
  const fig = document.getElementById('flow-arch');
  if (!fig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const q = (root, sel) => Array.from(root.querySelectorAll(sel));

  function stage(rowSel, p, withAction) {
    const row = fig.querySelector(rowSel);
    if (!row) return;
    const inputs = [
      ...q(row, `[data-node=${p}-in] .ar-hist img`),
      ...q(row, `[data-node=${p}-in] .ar-task`),
      ...q(row, `[data-node=${p}-in] .tk.qry i`),
      ...q(row, `[data-node=${p}-in] .ar-it.prop .gi`),
    ];
    const vlm = row.querySelector(`[data-node=${p}-vlm]`);
    const codToks = p === 'a' ? q(row, '[data-node=a-codt] i') : q(row, '[data-node=b-to] .tk.cod i');
    const qToks = p === 'a' ? q(row, '[data-node=a-q] i') : q(row, '[data-node=b-q] i');
    const outs = [...codToks, ...qToks];
    // the panel on the right that each group of tokens is trained against
    const codPanel = row.querySelector(p === 'a' ? '[data-node=agrs]' : '[data-node=wir]');
    const qPanel = p === 'a' ? row.querySelector('[data-node=cfi]') : null;
    const panels = [codPanel, qPanel].filter(Boolean);
    const kv = fig.querySelector('.flow-wires g.fw[data-edge="a-vlm>a-dec"]');
    const noise = withAction ? q(row, '[data-node=a-noise] .tk.noise i') : [];
    const dec = withAction ? row.querySelector('[data-node=a-dec]') : null;
    const acts = withAction ? q(row, '[data-node=a-actt] i') : [];
    const toks = [...outs, ...acts];
    toks.forEach((t) => t.classList.add('fa-tok'));

    let timers = [], running = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      [...inputs, ...noise].forEach((n) => n.classList.remove('fa-lit'));
      toks.forEach((t) => t.classList.remove('fa-on'));
      vlm && vlm.classList.remove('fa-busy');
      panels.forEach((n) => n.classList.remove('fa-glow'));
      dec && dec.classList.remove('fa-busy');
      kv && kv.classList.remove('fa-go');
    }
    function cycle() {
      reset();
      row.classList.add('fa-run');
      let t = 250;
      inputs.forEach((n) => { at(t, () => n.classList.add('fa-lit')); t += 130; });          // 1. inputs, in order
      t += 150;
      at(t, () => { vlm.classList.add('fa-busy'); inputs.forEach((n) => n.classList.remove('fa-lit')); });  // 2. VLM
      t += 1000;
      // 3. CoD tokens, then q~ tokens; the right-hand panel each group connects to glows meanwhile
      at(t, () => codPanel && codPanel.classList.add('fa-glow'));
      codToks.forEach((n) => { at(t, () => n.classList.add('fa-on')); t += 150; });
      if (qPanel) {
        at(t + 250, () => codPanel.classList.remove('fa-glow'));
        at(t, () => qPanel.classList.add('fa-glow'));
      }
      qToks.forEach((n) => { at(t, () => n.classList.add('fa-on')); t += 150; });
      at(t + 450, () => panels.forEach((n) => n.classList.remove('fa-glow')));
      if (withAction) {
        t += 200;
        at(t, () => { kv && kv.classList.add('fa-go'); noise.forEach((n) => n.classList.add('fa-lit')); });  // 4. KV + noised action
        t += 450;
        at(t, () => dec.classList.add('fa-busy'));                                           // 5. action decoder
        t += 600;
        acts.forEach((n) => { at(t, () => n.classList.add('fa-on')); t += 110; });          // 6. action tokens
        at(t + 300, () => { kv && kv.classList.remove('fa-go'); noise.forEach((n) => n.classList.remove('fa-lit')); });
      }
      at(t + 300, () => vlm.classList.remove('fa-busy'));
      at(t + 1800, () => { if (running) cycle(); });                                         // hold, then loop
    }
    function stop() {
      running = false; reset(); row.classList.remove('fa-run');
    }
    // run only while this stage is selected (flow.js marks it .on) and visible
    let visible = false;
    const update = () => {
      const want = visible && row.classList.contains('on');
      if (want && !running) { running = true; cycle(); } else if (!want && running) stop();
    };
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(row);
    new MutationObserver(update).observe(row, { attributes: true, attributeFilter: ['class'] });
  }

  stage('[data-node=sa]', 'a', true);
  stage('[data-node=sb]', 'b', false);
})();
