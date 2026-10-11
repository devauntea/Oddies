"""Builds the home-map art for the app from the source layers in ../temporal.

    python3 mobile/scripts/build_map_assets.py          (needs Pillow: pip install pillow)

For each layer it crops away transparent padding, compresses to WebP and writes
mobile/assets/map/scene-layout.json with where each layer sits on the shared 1024x1536 canvas.
Edit PLACEMENT and re-run to move or resize things; the app reads only the JSON.
Also writes mobile/assets/map/_preview.png (git-ignored) so you can check the composition.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'temporal'
OUT = ROOT / 'mobile' / 'assets' / 'map'
CANVAS = (1024, 1536)

# id -> (source file, draw order, placement). Placement is in canvas pixels:
#   cx/cy = where the cropped layer's centre goes, w = its width (height keeps aspect).
#   'full' layers already cover the whole canvas.
LAYERS = {
    'background': ('Green meadow with winding paths-2.png', 0, 'full'),
    'serenity': ('Golden temple garden with mountains-1.png', 10, {'cx': 236, 'cy': 372, 'w': 460}),
    'midnight': ('Indigo midnight city world-3.png', 20, {'cx': 792, 'cy': 360, 'w': 450}),
    'artist': ('Coral-peach artist cottage world-2.png', 30, {'cx': 238, 'cy': 1196, 'w': 456}),
    'founder': ('Lower-right lavender founder world-1.png', 40, {'cx': 790, 'cy': 1200, 'w': 464}),
    'details': ('Ambient meadow foliage layer.png', 50, 'full'),
    'character': ('Central woman cutout on transparent background-3.png', 60, {'cx': 522, 'cy': 640, 'h': 430}),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    layout = {'canvas': {'width': CANVAS[0], 'height': CANVAS[1]}, 'layers': []}
    preview = Image.new('RGBA', CANVAS)

    for layer_id, (filename, order, place) in sorted(LAYERS.items(), key=lambda kv: kv[1][1]):
        image = Image.open(SRC / filename).convert('RGBA')
        if place == 'full':
            box = (0, 0, *CANVAS)
            rect = {'left': 0, 'top': 0, 'width': CANVAS[0], 'height': CANVAS[1]}
        else:
            box = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            image = image.crop(box)
            w, h = image.size
            width = place['w'] if 'w' in place else place['h'] * w / h
            height = width * h / w
            rect = {
                'left': round(place['cx'] - width / 2, 1),
                'top': round(place['cy'] - height / 2, 1),
                'width': round(width, 1),
                'height': round(height, 1),
            }

        # A 430pt-wide phone shows the 1024 canvas at ~0.42x, so 1.5x the placed size covers 3x
        # screens with headroom while keeping files small. Never upscale.
        target = min(image.size[0], round(rect['width'] * 1.5))
        stored = image.resize((target, round(image.size[1] * target / image.size[0])), Image.LANCZOS)
        name = f'{order:02d}_{layer_id}.webp'
        stored.save(OUT / name, 'WEBP', quality=86, method=6)
        layout['layers'].append({'id': layer_id, 'order': order, 'file': name, **rect})

        placed = image.resize((round(rect['width']), round(rect['height'])), Image.LANCZOS)
        preview.alpha_composite(placed, (round(rect['left']), round(rect['top'])))

    (OUT / 'scene-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    preview.convert('RGB').resize((512, 768), Image.LANCZOS).save(OUT / '_preview.png')
    for f in sorted(OUT.iterdir()):
        print(f'{f.stat().st_size / 1024:8.0f} KB  {f.name}')


if __name__ == '__main__':
    main()
