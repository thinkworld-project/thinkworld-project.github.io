#!/usr/bin/env python3
"""Collect the real-robot videos needed for the ThinkWorld project page.

Run this ON THE LAB SERVER (the machine that has /mnt/hdd1/chyun), then pull
the output folder to your Mac:

    python3 collect_page_assets.py --out ~/thinkworld_page_assets
    # optional: --all-cams to also copy wrist cameras (≈3x size)

    # on your Mac
    rsync -avP <user>@<server>:~/thinkworld_page_assets/ \
        ~/Desktop/thinkworld_projectpage/assets/raw/

What it collects (episode IDs taken from your figure sources):
  * real_robot/      the 24 rollouts used in appendix Fig. 9
                     (3 tasks x {ID, OOD} x {DP, MolmoAct2, LaWAM, ThinkWorld})
  * train_demo/      the 12 teleop demos shown in Fig. 9(a)
  * skill_composition/  4 human demos, 4 atomic robot skills,
                        5 verified ThinkWorld composite rollouts (Fig. 4/10)
  * rollouts_index.csv  every rollout.json under rr_recordings (all models),
                        so we can pick more trials / map ID-OOD settings later
  * report.txt          found / missing episodes

Standard library only. Episode folders are located by ID, so the exact
checkpoint directory names for the baselines do not need to be known.
"""
import argparse
import csv
import glob
import json
import os
import shutil

ROOT = '/mnt/hdd1/chyun'
RR = f'{ROOT}/rr_recordings'

# (task, split, method, episode_id) -- from rr_task_pages.pptx (paper Fig. 9)
ROLLOUTS = [
    ('color_matching', 'id',  'diffusion',  '033357_05372b2f'),
    ('color_matching', 'id',  'molmoact2',  '060057_f94077d2'),
    ('color_matching', 'id',  'lawam',      '015303_43aa3f9d'),
    ('color_matching', 'id',  'thinkworld', '013203_acdf9289'),
    ('color_matching', 'ood', 'diffusion',  '041233_ea681159'),
    ('color_matching', 'ood', 'molmoact2',  '052755_7a83b475'),
    ('color_matching', 'ood', 'lawam',      '022415_bc2c40a6'),
    ('color_matching', 'ood', 'thinkworld', '021809_ed7bff43'),
    ('cup_hanging',    'id',  'diffusion',  '003511_d6e469bb'),
    ('cup_hanging',    'id',  'molmoact2',  '014345_3ec43e5f'),
    ('cup_hanging',    'id',  'lawam',      '031416_e6dbb49f'),
    ('cup_hanging',    'id',  'thinkworld', '011117_80573e84'),
    ('cup_hanging',    'ood', 'diffusion',  '002639_6f9d5451'),
    ('cup_hanging',    'ood', 'molmoact2',  '013256_5e3f7f66'),
    ('cup_hanging',    'ood', 'lawam',      '030752_2367656e'),
    ('cup_hanging',    'ood', 'thinkworld', '012303_3a501542'),
    ('sorting',        'id',  'diffusion',  '053730_6df7fb93'),
    ('sorting',        'id',  'molmoact2',  '052031_470cdcc3'),
    ('sorting',        'id',  'lawam',      '032642_09f855cc'),
    ('sorting',        'id',  'thinkworld', '040305_71f395f7'),
    ('sorting',        'ood', 'diffusion',  '060817_e94e7cf8'),
    ('sorting',        'ood', 'molmoact2',  '031436_5e2ff9a7'),
    ('sorting',        'ood', 'lawam',      '034941_a730ace8'),
    ('sorting',        'ood', 'thinkworld', '020500_04f816ea'),
]

# (task, episode_id) -- Fig. 9(a) teleop demos
TRAIN_DEMOS = [
    ('color_matching', '213606_0a2d9187'), ('color_matching', '215023_9706784b'),
    ('color_matching', '220556_4641a42c'), ('color_matching', '221713_04a36c42'),
    ('cup_hanging', '232216_f654ae31'), ('cup_hanging', '232739_9b8a088b'),
    ('cup_hanging', '233059_fc00de39'), ('cup_hanging', '233937_6709b201'),
    ('sorting', '214027_15c85323'), ('sorting', '223616_c02a0193'),
    ('sorting', '235153_29719f69'), ('sorting', '001125_57205596'),
]

# (block, label, episode_id, camera) -- rr_oven_qual/manifest.json
OVEN = [
    ('human',   'open_close',          '233844_55a8e3c5', 'camera_ego'),
    ('human',   'open_putL_close',     '234724_680c22a1', 'camera_ego'),
    ('human',   'open_putR_close',     '000009_9c7db4ce', 'camera_ego'),
    ('human',   'open_putL_putR_close', '001214_2af675ca', 'camera_ego'),
    ('atomic',  'open',                '002659_0f744959', 'camera_top'),
    ('atomic',  'put_left',            '215441_c265fd42', 'camera_top'),
    ('atomic',  'put_right',           '221120_66c92e43', 'camera_top'),
    ('atomic',  'close',               '222830_a4241dc1', 'camera_top'),
    ('rollout', 'open_close',          '212830_80946f50', 'camera_top'),
    ('rollout', 'open_close',          '052239_5fafe094', 'camera_top'),
    ('rollout', 'open_close',          '055406_6b9fc2a5', 'camera_top'),
    ('rollout', 'open_close',          '055744_8dfaca67', 'camera_top'),
    ('rollout', 'open_putL_close',     '213045_13fd4dcc', 'camera_top'),
]


def index_episode_dirs(root):
    """Map 'episode_<id>' -> [paths], without descending into episode dirs."""
    idx = {}
    for dirpath, dirnames, _ in os.walk(root, followlinks=False):
        keep = []
        for d in dirnames:
            if d.startswith('episode_'):
                idx.setdefault(d, []).append(os.path.join(dirpath, d))
            elif not d.startswith('.'):
                keep.append(d)
        dirnames[:] = keep
    return idx


def copy_episode(src, dst, camera, all_cams):
    os.makedirs(dst, exist_ok=True)
    mp4s = sorted(glob.glob(os.path.join(src, '*.mp4')))
    pick = mp4s if all_cams else [m for m in mp4s if os.path.basename(m).startswith(camera)]
    if not pick:          # unexpected layout: take everything rather than nothing
        pick = mp4s
    for f in pick + glob.glob(os.path.join(src, '*.json')):
        out = os.path.join(dst, os.path.basename(f))
        if not os.path.exists(out):
            shutil.copy2(f, out)
    with open(os.path.join(dst, 'SOURCE.txt'), 'w') as fh:
        fh.write(src + '\n')
    return len(pick)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--root', default=ROOT)
    ap.add_argument('--all-cams', action='store_true')
    a = ap.parse_args()
    out = os.path.expanduser(a.out)
    os.makedirs(out, exist_ok=True)

    print(f'indexing episode folders under {a.root} ...')
    idx = index_episode_dirs(a.root)
    print(f'  {len(idx)} episode ids indexed')

    report = []

    def grab(eid, dst, camera, prefer=None):
        hits = idx.get(f'episode_{eid}', [])
        if prefer:
            hits = sorted(hits, key=lambda p: (prefer not in p, p))
        if not hits:
            report.append(f'MISSING  episode_{eid}  -> {dst}')
            return
        if len(hits) > 1:
            report.append(f'NOTE     episode_{eid} has {len(hits)} copies; used {hits[0]}')
        n = copy_episode(hits[0], os.path.join(out, dst), camera, a.all_cams)
        report.append(f'OK       episode_{eid}  ({n} mp4)  -> {dst}')

    for task, split, method, eid in ROLLOUTS:
        grab(eid, f'real_robot/{task}/{split}/{method}/episode_{eid}', 'camera_top', RR)
    for task, eid in TRAIN_DEMOS:
        grab(eid, f'train_demo/{task}/episode_{eid}', 'camera_top')
    for block, label, eid, cam in OVEN:
        grab(eid, f'skill_composition/{block}/{label}/episode_{eid}', cam)

    # Full rollout index (all models) for picking more trials later.
    rows, keys = [], set()
    for f in glob.glob(os.path.join(RR, '*', '*', 'episode_*', 'rollout.json')):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        flat = {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in d.items()}
        flat['_path'] = os.path.dirname(f)
        rows.append(flat)
        keys.update(flat)
    if rows:
        with open(os.path.join(out, 'rollouts_index.csv'), 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=sorted(keys))
            w.writeheader()
            w.writerows(rows)
    report.append(f'rollouts_index.csv: {len(rows)} rollout.json files')

    with open(os.path.join(out, 'report.txt'), 'w') as fh:
        fh.write('\n'.join(report) + '\n')
    print('\n'.join(report))
    print(f'\ndone -> {out}')


if __name__ == '__main__':
    main()
