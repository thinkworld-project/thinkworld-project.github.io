"""Extract the photos used by the Overview / Method diagrams from the source PPTX files.

The diagrams themselves are HTML (index.html) + static/js/figures.js + static/js/flow.js.
Only the photographs, feature maps and the apple/plate illustration come from the slides;
boxes, tokens, icons and arrows are drawn natively by the page.

Usage:
  python tools/build_diagram_assets.py \
      --teaser ../figure_sources/thinkworld_teaser_blue_v2_final.pptx \
      --arch   ../figure_sources/thinkworld_main_arch_full_blue.pptx
Writes static/images/diagram/*.webp
"""
import argparse
import io
import os
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static', 'images', 'diagram')

# (output name, media file, max width, crop) - crop = (l, t, r, b) fractions removed, or 'square' to squash
TEASER = (
    [(f'hum_{i + 1:02d}', f'image{37 + i}.png', 240, None) for i in range(12)]
    + [(f'rob_{i + 1:02d}', f'image{80 + i}.png', 240, None) for i in range(12)]
    + [
        ('plate', 'image73.png', 260, None), ('apple', 'image74.png', 160, None),
        ('gen_id_obj', 'image104.jpeg', 360, None), ('gen_id_traj', 'image106.jpeg', 360, None),
        ('gen_id_env', 'image107.jpeg', 360, None), ('gen_ood_obj', 'image105.jpeg', 360, None),
        ('gen_ood_traj', 'image92.jpeg', 360, None), ('gen_ood_env', 'image93.jpeg', 360, None),
    ]
    + [(f'skl_atomic_{i + 1}', f'image{n}.jpg', 300, None) for i, n in enumerate((100, 101, 102, 103))]
    + [(f'skl_human_{i + 1}', f'image{n}.jpg', 300, None) for i, n in enumerate((70, 94, 95, 96))]
    + [(f'skl_robot_{i + 1}', f'image{n}.jpg', 300, None) for i, n in enumerate((71, 97, 98, 99))]
)
SIDE = (.125, 0, .125, 0)
ARCH = (
    [(f'a_hist_{i + 1}', f'image{n}.png', 240, SIDE) for i, n in enumerate((36, 37, 38, 32))]
    + [(f'b_hist_{i + 1}', f'image{n}.png', 240, SIDE) for i, n in enumerate((28, 29, 30, 27))]
    + [(f'eef_r_{i + 1}', f'image{n}.png', 240, SIDE) for i, n in enumerate((49, 36, 37, 38))]
    + [
        ('gt_future', 'image42.png', 320, SIDE), ('pca_pred', 'image44.png', 300, 'square'),
        ('human_video', 'image27.png', 340, SIDE), ('robot_video', 'image32.png', 340, SIDE),
        ('iw_1', 'image52.png', 300, 'square'), ('iw_2', 'image50.png', 300, 'square'),
    ]
)
# future world state = RGB frame (centre square) with the feature map on top at 70% opacity
BLENDS = (('fw_1', 'image51.png', 'image52.png'), ('fw_2', 'image42.png', 'image50.png'))


def load(z, name):
    return Image.open(io.BytesIO(z.read('ppt/media/' + name)))


def prep(im, width, crop):
    if crop == 'square':
        s = min(im.size)
        im = im.resize((s, s), Image.LANCZOS)
    elif crop:
        w, h = im.size
        l, t, r, b = crop
        im = im.crop((round(w * l), round(h * t), round(w * (1 - r)), round(h * (1 - b))))
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    return im


def save(im, name):
    path = os.path.join(OUT, name + '.webp')
    if im.mode == 'RGBA':
        im.save(path, 'WEBP', quality=90, method=6)
    else:
        im.convert('RGB').save(path, 'WEBP', quality=82, method=6)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--teaser', required=True)
    ap.add_argument('--arch', required=True)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for pptx, table in ((a.teaser, TEASER), (a.arch, ARCH)):
        with zipfile.ZipFile(pptx) as z:
            for out, media, width, crop in table:
                save(prep(load(z, media), width, crop), out)
                n += 1
    with zipfile.ZipFile(a.arch) as z:
        for out, base, over in BLENDS:
            b = prep(load(z, base).convert('RGB'), 300, (.21875, 0, .21875, 0))
            b = b.resize((300, 300), Image.LANCZOS)
            o = prep(load(z, over).convert('RGB'), 300, 'square').resize((300, 300), Image.LANCZOS)
            save(Image.blend(b, o, .7), out)
            n += 1
    print(f'wrote {n} images to {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
