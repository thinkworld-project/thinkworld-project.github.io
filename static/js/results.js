// All numbers shown on the page, transcribed from the paper (Tables 1–9).
// Edit here if results change; charts and tables are rendered from this file.

window.RESULTS = {
  methods: [
    { key: 'dp', name: 'Diffusion Policy', color: 'var(--dp)' },
    { key: 'molmoact2', name: 'MolmoAct2', color: 'var(--molmo)' },
    { key: 'lawam', name: 'LaWAM', color: 'var(--lawam)' },
    { key: 'thinkworld', name: 'ThinkWorld (Ours)', color: 'var(--ours)' },
  ],

  // Table 6 — real-robot success (successes / trials)
  realRobot: {
    tasks: [
      { key: 'color', name: 'Color Matching', instr: 'Put the fruits in the matched color bowl.', demos: 60,
        id: { dp: [18, 30], molmoact2: [24, 30], lawam: [16, 30], thinkworld: [30, 30] },
        ood: { dp: [11, 30], molmoact2: [8, 30], lawam: [8, 30], thinkworld: [24, 30] },
        oodWhat: 'new colors and new objects' },
      { key: 'cup', name: 'Cup Hanging', instr: 'Put the cup on the hanger.', demos: 45,
        id: { dp: [9, 15], molmoact2: [11, 15], lawam: [9, 15], thinkworld: [15, 15] },
        ood: { dp: [1, 15], molmoact2: [14, 15], lawam: [12, 15], thinkworld: [15, 15] },
        oodWhat: 'new objects and new environments' },
      { key: 'sort', name: 'Sorting', instr: 'Sort the same objects into the baskets.', demos: 100,
        id: { dp: [4, 15], molmoact2: [12, 15], lawam: [4, 15], thinkworld: [15, 15] },
        ood: { dp: [1, 15], molmoact2: [3, 15], lawam: [4, 15], thinkworld: [13, 15] },
        oodWhat: 'new objects and unseen sorting trajectories' },
    ],
    macro: { dp: 32.8, molmoact2: 62.2, lawam: 45.6, thinkworld: 94.4 },
    micro: { dp: 36.7, molmoact2: 60.0, lawam: 44.2, thinkworld: 93.3 },
  },

  // Table 1 — LIBERO & LIBERO-PRO
  libero: {
    cols: ['Spatial', 'Object', 'Goal', 'Long', 'Avg.'],
    proCols: ['Object', 'Position', 'Semantic', 'Task', 'Environment', 'Avg.'],
    rows: [
      { name: 'OpenVLA', params: 7.5, libero: [84.7, 88.4, 79.2, 53.7, 76.5], pro: [93.0, 0.0, 97.3, 0.0, 68.0, 51.7] },
      { name: 'π<sub>0</sub>', params: 3.2, libero: [96.8, 98.8, 95.8, 85.2, 94.2], pro: [90.5, 0.0, 90.5, 0.0, 38.8, 44.0] },
      { name: 'π<sub>0.5</sub>', params: 3.4, libero: [98.8, 98.2, 98.0, 92.4, 96.9], pro: [96.0, 20.8, 95.8, 0.8, 52.8, 53.2] },
      { name: 'MolmoAct', params: 8.1, libero: [87.0, 95.4, 87.6, 77.2, 86.6], pro: [76.0, 1.5, 85.8, 1.5, null, 41.2] },
      { name: 'VLA-JEPA', params: 2.8, libero: [96.2, 99.6, 97.2, 95.8, 97.2], pro: [80.4, 3.5, 97.2, 20.8, 41.0, '48.5†'] },
      { name: 'ThinkWorld (Ours)', params: 2.9, libero: [98.2, 98.8, 97.8, 94.2, 97.3], pro: [73.3, 18.2, 93.9, 31.9, 60.9, 55.6], ours: true },
    ],
  },

  // Table 8 — LIBERO-Plus (zero-shot)
  liberoPlus: {
    cols: ['Camera', 'Robot', 'Language', 'Light', 'Background', 'Noise', 'Layout', 'Avg.'],
    rows: [
      { name: 'OpenVLA-OFT', v: [56.4, 31.9, 79.5, 88.7, 93.3, 75.8, 74.2, 69.6] },
      { name: 'π<sub>0</sub>-FAST', v: [65.1, 21.6, 61.0, 73.2, 73.2, 74.4, 68.8, 61.6] },
      { name: 'DreamVLA', v: [65.0, 40.8, 63.5, 85.7, 82.6, 84.9, 74.0, 69.9] },
      { name: 'ThinkWorld (Ours)', v: [46.9, 70.5, 73.5, 90.7, 90.0, 62.7, 79.6, 71.7], ours: true },
    ],
  },

  // Table 7 — SimplerEnv out-of-the-box
  simpler: [
    ['Google · visual matching', 49.31],
    ['Google · variant aggregation (micro)', 46.54],
    ['&nbsp;&nbsp;Pick Coke can', 56.00],
    ['&nbsp;&nbsp;Open/close drawer', 33.33],
    ['&nbsp;&nbsp;Move near', 55.83],
    ['&nbsp;&nbsp;Put in drawer', 2.12],
    ['WidowX · visual matching', 41.67],
    ['Overall (micro)', 46.51],
  ],

  // Table 3 — cumulative ablation on LIBERO-PRO
  ablation: {
    cols: ['Object', 'Pos.', 'Sem.', 'Task', 'Env.', 'Avg.'],
    rows: [
      { name: 'Qwen3-VL + action expert', v: [59.5, 1.9, 84.4, 17.2, 37.8, 40.1] },
      { name: '+ History frames', v: [61.3, 4.9, 84.6, 22.8, 29.8, 40.7] },
      { name: '+ Future prediction', v: [70.0, 11.9, 89.4, 26.3, 54.4, 50.4] },
      { name: '+ Chain-of-Dynamics', v: [74.5, 16.9, 94.4, 29.7, 56.4, 54.4] },
      { name: '+ World-imagination RL', v: [73.3, 18.2, 93.9, 31.9, 60.9, 55.6], ours: true },
    ],
  },

  // Table 2 — cosine similarity to GT DINOv3 features 1 s ahead
  cod: [
    { name: 'Shuffled CoD', all: 0.71, top: 0.55 },
    { name: 'Empty CoD', all: 0.72, top: 0.54 },
    { name: 'No CoD', all: 0.72, top: 0.55 },
    { name: 'Generated CoD', all: 0.74, top: 0.62, ours: true },
  ],

  // Table 4 — training data
  data: [
    { name: 'EgoVerse', hours: 1155.4, episodes: '55.6K', human: true },
    { name: 'RoboCOIN', hours: 755.2, episodes: '112.0K' },
    { name: 'EgoDex', hours: 724.8, episodes: '314.8K', human: true },
    { name: 'Bimanual YAM', hours: 704.1, episodes: '32.2K' },
    { name: 'RT-1', hours: 350.6, episodes: '87.2K' },
    { name: 'DROID', hours: 328.9, episodes: '74.6K' },
    { name: 'BC-Z', hours: 152.0, episodes: '39.4K' },
    { name: 'Bridge', hours: 105.2, episodes: '53.2K' },
  ],

  // Table 9 — inference (batch 1, H100, eager)
  latency: [
    { name: 'MolmoAct2', p50: 335.07, p95: 467.96, mem: 12.11 },
    { name: 'MolmoAct2-Think', p50: 879.37, p95: 1014.47, mem: 12.12 },
    { name: 'ThinkWorld (Ours)', p50: 324.84, p95: 333.09, mem: 7.07, ours: true },
  ],
};
