#!/usr/bin/env python3
"""Re-color the teaser PPTX figure to the page's green palette and render the two raster
image the page still needs (the Overview / Method diagrams themselves are native HTML).

    python3 tools/build_figures.py --src ~/Desktop/thinkworld_projectpage/figure_sources

Input (in --src):
    thinkworld_teaser_blue_v2_final.pptx      (visible slide = the teaser figure)

Outputs:
    static/images/figures/teaser_og.jpg          (social preview)

What is re-colored
    * every srgbClr in the slide / chart XML whose hue is purple (225-300 deg) becomes
      leaf green, and blue (190-225 deg) becomes teal green, keeping lightness, so the
      two branches of the figure (motion / CoD vs. vision / imagination) stay distinct;
    * icon duotones (srgbClr inside <a:duotone>) follow the same rule;
    * PNG icons with transparency get the same per-pixel hue mapping;
    * the mini success-rate chart and its legend use the page's chart colors
      (sage-gray baselines, green ThinkWorld).
Photos, PCA panels and the semantic skill colors (Open/Put/Close tags, OOD arrows)
are left untouched.

Requires LibreOffice (soffice), poppler (pdftocairo), Pillow, numpy, lxml.
NVIDIA Sans must be installed for the renderer (fc-list | grep "NVIDIA Sans").
"""
import argparse
import colorsys
import io
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static', 'images', 'figures')

# The page draws both figures natively (index.html + static/js/flow.js). Only the teaser is
# rendered to a raster here, for the social-preview image.
FIGURES = {
    'teaser': 'thinkworld_teaser_blue_v2_final.pptx',
}
KEEP = {'4E79A7', 'B07AA1', '59A14F', 'E8871E', 'FFB000'}   # semantic colors, never re-mapped
CHART_MAP = {                                                 # mini SR chart + its legend swatches
    'C2C5E4': 'D7DED1', 'A9ADD6': 'B3BCAB', '7479B8': '8A9484', '47387C': '5E9E1A',
    '6B6F9E': '687064', 'BFC2DA': 'DCE1D7',
}
LEAF_HUE, TEAL_HUE = 92, 160


def remap_hex(h):
    h = h.upper()
    if h in KEEP:
        return h
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = hh * 360
    if s < 0.12 or not (190 <= deg <= 300):
        return h
    if deg < 225:   # blue -> teal green (vision / imagination branch)
        hue, s2 = TEAL_HUE, min(0.45, s * 0.9)
    else:           # purple -> leaf green (motion / CoD branch)
        hue, s2 = LEAF_HUE, min(0.62, s * 1.05 + 0.05)
    r, g, b = colorsys.hls_to_rgb(hue / 360, l, s2)
    return '%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))


def remap_xml(xml, table=None):
    def sub(m):
        v = m.group(2).upper()
        new = (table or {}).get(v) or remap_hex(v)
        return m.group(1) + new + m.group(3)
    return re.sub(r'(srgbClr val=")([0-9A-Fa-f]{6})(")', sub, xml)


def remap_slide(xml):
    """General remap, but legend swatches of the mini chart use the chart palette."""
    def swatch(m):
        return remap_xml(m.group(0), CHART_MAP)
    xml = re.sub(r'<p:sp>(?:(?!</p:sp>).)*?name="Legend Swatch[^"]*".*?</p:sp>', swatch, xml, flags=re.S)
    return remap_xml(xml)


def remap_png(data):
    im = Image.open(io.BytesIO(data))
    if im.mode not in ('RGBA', 'LA', 'P'):
        return None
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    if (a[..., 3] < 0.08).mean() < 0.2:      # not an icon
        return None
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d == 0, 0, d / (1 - np.abs(2 * l - 1) + 1e-6))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(l)
    nz = d > 0
    h = np.where(nz & (mx == r), ((g - b) / (d + 1e-6)) % 6, h)
    h = np.where(nz & (mx == g), (b - r) / (d + 1e-6) + 2, h)
    h = np.where(nz & (mx == b), (r - g) / (d + 1e-6) + 4, h)
    deg = h * 60
    sel = (s >= 0.12) & (deg >= 190) & (deg <= 300) & (a[..., 3] > 0.02)
    if not sel.any():
        return None
    # vectorized version of remap_hex()
    teal = deg < 225
    hue = np.where(teal, TEAL_HUE, LEAF_HUE) / 360.0
    s2 = np.where(teal, np.minimum(0.45, s * 0.9), np.minimum(0.62, s * 1.05 + 0.05))
    q2 = np.where(l < 0.5, l * (1 + s2), l + s2 - l * s2)
    p2 = 2 * l - q2

    def h2c(t):
        t = t % 1.0
        return np.where(t < 1 / 6, p2 + (q2 - p2) * 6 * t,
               np.where(t < 1 / 2, q2,
               np.where(t < 2 / 3, p2 + (q2 - p2) * (2 / 3 - t) * 6, p2)))
    new = np.stack([h2c(hue + 1 / 3), h2c(hue), h2c(hue - 1 / 3)], -1)
    out = a.copy()
    out[..., :3] = np.where(sel[..., None], new, rgb)
    buf = io.BytesIO()
    Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA').save(buf, 'PNG')
    return buf.getvalue()


def recolor_pptx(src, dst):
    zin = zipfile.ZipFile(src)
    zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
    for item in zin.infolist():
        data = zin.read(item.filename)
        name = item.filename
        if re.match(r'ppt/slides/slide\d+\.xml$', name):
            data = remap_slide(data.decode('utf8')).encode('utf8')
        elif re.match(r'ppt/charts/chart\d+\.xml$', name):
            data = remap_xml(data.decode('utf8'), CHART_MAP).encode('utf8')
        elif name.startswith('ppt/media/') and name.endswith('.svg'):
            txt = data.decode('utf8', 'ignore')
            data = re.sub(r'#([0-9A-Fa-f]{6})', lambda m: '#' + remap_hex(m.group(1)), txt).encode('utf8')
        elif name.startswith('ppt/media/') and name.endswith('.png'):
            new = remap_png(data)
            if new is not None:
                data = new
        zout.writestr(item, data)
    zout.close()


def render(pptx, width):
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', td, pptx],
                       check=True, capture_output=True, timeout=300)
        pdf = os.path.join(td, os.path.splitext(os.path.basename(pptx))[0] + '.pdf')
        stem = os.path.join(td, 'page')
        subprocess.run(['pdftocairo', '-png', '-singlefile', '-f', '1', '-l', '1',
                        '-scale-to-x', str(width), '-scale-to-y', '-1', pdf, stem], check=True)
        return Image.open(stem + '.png').convert('RGB').copy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='folder with the two source PPTX files')
    ap.add_argument('--width', type=int, default=2600)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        for key, fn in FIGURES.items():
            green = os.path.join(td, key + '.pptx')
            recolor_pptx(os.path.join(os.path.expanduser(a.src), fn), green)
            im = render(green, a.width)
            print(f'  {key}: {im.size}')
            if key == 'teaser':
                og = im.copy(); og.thumbnail((1600, 1600)); og.save(os.path.join(OUT, 'teaser_og.jpg'), quality=86)
            shutil.copy(green, os.path.join(td, key + '_green_keep.pptx'))


if __name__ == '__main__':
    main()
