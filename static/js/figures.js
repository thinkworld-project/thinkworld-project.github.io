// Native diagrams (Overview + Method): modules shown in the side menu and the arrows
// drawn between boxes. The boxes themselves are plain HTML in index.html (elements with
// data-node="..."); their arrangement follows the original paper figures.
//
// Module fields
//   nodes      data-node ids that light up when the module is selected (one panel / stage each)
// Edge fields
//   from, to   data-node ids;  fs / ts: side of the box the arrow leaves / enters (l r t b),
//              optionally with a position along that side ('t@0.8') or lined up with
//              the centre of another node ('r@=cod')
//   mods       modules that light this arrow up
//   kind       'sup' = dashed, 'loop' = reinforcement update, 'thick' = block arrow
//   route      'curve' (default) | 'below' | 'above'  (elbow route around the boxes);
//              under / rise: run the elbow this far below (or above) another node
//   bend       push a curve up (negative) or down (positive), in px
//   bi         arrowheads on both ends;  inset / insetEnd  start / end this many px inside the boxes
//   label      text on the arrow ('ℒ_GRPO' renders GRPO as a subscript);  pill  label in a pill
//   lat        where the label sits along an elbow route (0 = start, 1 = end);  lgap  label distance above it;
//              lseg: 'end' puts the label on the last (vertical) leg instead

window.FIGURES = {
  teaser: {
    label: 'Explore the overview',
    modules: [
      { key: 'data', title: 'Human + robot experience', nodes: ['exp'],
        desc: 'Thousands of hours of human and robot video, most of it without action labels.',
        link: '#data', linkText: 'Training data' },
      { key: 'think', title: 'Imagine, then reinforce', nodes: ['mid'],
        desc: 'Hands and grippers move in one unified motion space. ThinkWorld reasons in that space as a Chain-of-Dynamics, imagines the future it leads to, and is rewarded when that future matches the real one.',
        link: '#method', linkText: 'Method' },
      { key: 'results', title: 'Real-world results', nodes: ['res'],
        desc: 'Robust to new objects, trajectories and environments, and able to chain skills it only saw in human video.',
        link: '#real-robot', linkText: 'Rollouts' },
    ],
    edges: [
      { from: 'cd-sc', to: 'cd-r', mods: ['think'] },
      { from: 'cd-sc', to: 'cd-h', mods: ['think'] },
      { from: 'cd-r', to: 'cd-fu', ts: 'l@0.26', bend: -30, mods: ['think'] },
      { from: 'cd-h', to: 'cd-fu', ts: 'l@0.74', bend: 30, mods: ['think'] },
      { from: 'tw-cr', to: 'tw-fi', mods: ['think'] },
      { from: 'tw-ch', to: 'tw-fi', mods: ['think'] },
      { from: 'rl-i', to: 'rl-o', bi: true, mods: ['think'] },
    ],
  },

  architecture: {
    label: 'Explore the architecture',
    modules: [
      { key: 'a', title: 'Stage (a) · Learn to think in dynamics',
        nodes: ['sa'],
        desc: 'Human and robot motion become one set of tokens. The VLM learns to write this Chain-of-Dynamics, imagine the future it leads to, and act.' },
      { key: 'b', title: 'Stage (b) · Check it against the world',
        nodes: ['sb'],
        desc: 'Sample several chains, imagine each future, and reinforce the ones that match the real video. No action labels needed.' },
    ],
    edges: [
      // stage (a), model
      { from: 'a-mtt', to: 'a-codt', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'a-vfmt', to: 'a-q', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'a-arm', to: 'a-actt', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'a-vlm', to: 'a-dec', fs: 'r@0.74', ts: 'l@0.74', inset: 40, insetEnd: 4, kind: 'thick', label: 'KV', lpos: 'below', mods: ['a'] },
      // stage (a), reasoning space + imagination
      { from: 'mtk', to: 'ums-t', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'ums-tk', to: 'ums-c', bi: true, label: 'ℒ_CoD', mods: ['a'] },
      { from: 'cfi-q', to: 'cfi-dec', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'cfi-dec', to: 'cfi-p1', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'cfi-vfm', to: 'cfi-p2', fs: 'b', ts: 't', mods: ['a'] },
      { from: 'cfi-p1', to: 'cfi-p2', bi: true, label: 'ℒ_future', mods: ['a'] },
      // stage (b)
      { from: 'b-lrep', to: 'b-c2', fs: 'b', ts: 't', mods: ['b'] },
      { from: 'b-q', to: 'b-c3', fs: 't@0.5', ts: 't@0.5', route: 'above', rise: 22, label: 'ℒ_GRPO', lat: 0.32, lgap: 11, mods: ['b'] },
      { from: 'rh-b', to: 'iw1', mods: ['b'] },
      { from: 'rr-b', to: 'iw2', mods: ['b'] },
      { from: 'iw1', to: 'fw1', bi: true, label: 'sim', mods: ['b'] },
      { from: 'iw2', to: 'fw2', bi: true, label: 'sim', mods: ['b'] },
      { from: 'sim2', to: 'rr-l', fs: 'b@0.5', ts: 'b@0.5', route: 'below', under: 'iwc', rise: 8, kind: 'loop', label: 'GRPO Update', pill: true, lseg: 'end', mods: ['b'] },  // GRPO update: from the lower 'sim' back to the rollout
    ],
  },
};
