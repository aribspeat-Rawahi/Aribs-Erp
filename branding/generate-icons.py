#!/usr/bin/env python3
"""Regenerates every app icon / splash from branding/aribs-logo.svg.

Run from the repo root after changing the logo:
    python3 branding/generate-icons.py
Needs: rsvg-convert (librsvg2-bin) and Pillow.
"""
import os
import subprocess
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, 'branding', 'aribs-logo.svg')
RES = os.path.join(ROOT, 'mobile', 'android', 'app', 'src', 'main', 'res')
DESKTOP = os.path.join(ROOT, 'desktop', 'build-resources')
BRAND_GREEN = '#5FBC4A'  # also set in res/values/ic_launcher_background.xml


def render(size: int) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix='.png') as tmp:
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), SVG, '-o', tmp.name], check=True)
        return Image.open(tmp.name).convert('RGBA').copy()


master = render(2048)


def logo(size: int) -> Image.Image:
    return master.resize((size, size), Image.LANCZOS)


# Desktop (Windows exe + window icon)
logo(512).save(os.path.join(DESKTOP, 'icon.png'))
logo(256).save(os.path.join(DESKTOP, 'icon.ico'), sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])

# Android launcher icons (legacy square/round = the round logo itself)
densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, scale in densities.items():
    folder = os.path.join(RES, f'mipmap-{name}')
    icon = logo(round(48 * scale))
    icon.save(os.path.join(folder, 'ic_launcher.png'))
    icon.save(os.path.join(folder, 'ic_launcher_round.png'))
    # Adaptive icon foreground: 108dp canvas, logo 76dp wide in the middle,
    # on a brand-green background so any launcher mask shape looks clean.
    canvas = round(108 * scale)
    fg = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    inner = logo(round(76 * scale))
    off = (canvas - inner.width) // 2
    fg.paste(inner, (off, off), inner)
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

# Splash screens: logo centred on white, 40% of the shorter side
for folder in sorted(os.listdir(RES)):
    path = os.path.join(RES, folder, 'splash.png')
    if not os.path.exists(path):
        continue
    w, h = Image.open(path).size
    splash = Image.new('RGB', (w, h), 'white')
    mark = logo(round(min(w, h) * 0.4))
    splash.paste(mark, ((w - mark.width) // 2, (h - mark.height) // 2), mark)
    splash.save(path)

print('Icons and splash screens regenerated from', SVG)
