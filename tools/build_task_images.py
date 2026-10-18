"""Extract the real-robot task photos (in-domain / out-of-distribution setups) from slide 1 of
the success-rate PPTX into static/images/tasks/. The overlays (dotted ellipses, arrows) and
tags are drawn by the page, not baked into the photos.

Usage:
  python tools/build_task_images.py --pptx ../figure_sources/thinkworld_real_sr.pptx
"""
import argparse
import io
import os
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static', 'images', 'tasks')

# output name -> media file on slide 1 (left column = in-domain, right column = OOD)
SHOTS = {
    'color_id1': 'image6.jpeg', 'color_id2': 'image5.jpeg', 'color_ood1': 'image7.jpeg', 'color_ood2': 'image8.jpeg',
    'cup_id1': 'image4.jpeg', 'cup_id2': 'image3.jpeg', 'cup_ood1': 'image9.jpeg', 'cup_ood2': 'image10.jpeg',
    'sort_id1': 'image2.jpeg', 'sort_id2': 'image1.jpeg', 'sort_ood1': 'image11.jpeg', 'sort_ood2': 'image12.jpeg',
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pptx', required=True)
    ap.add_argument('--width', type=int, default=640)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    with zipfile.ZipFile(os.path.expanduser(a.pptx)) as z:
        for name, media in SHOTS.items():
            im = Image.open(io.BytesIO(z.read('ppt/media/' + media))).convert('RGB')
            if im.width > a.width:
                im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
            im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=84, method=6)
    print(f'wrote {len(SHOTS)} task photos to {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
