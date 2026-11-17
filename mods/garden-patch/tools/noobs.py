#!/usr/bin/env python3
"""Draw original classic noob-style figures: yellow skin, blue torso, green legs."""
from pathlib import Path
from art import block, rect, svg

OUT = Path(__file__).resolve().parents[1] / 'assets'
YELLOW = ('#f6cd34', '#d5a923', '#ffe66b')
BLUE = ('#2581da', '#1760b1', '#63a8ef')
GREEN = ('#86b944', '#5c9235', '#b1d36a')


def head(x, y, happy=False, puzzled=False):
    art = f'<path d="M{x+8} {y} H{x+27} Q{x+35} {y} {x+35} {y+7} V{y+27} Q{x+35} {y+33} {x+27} {y+33} H{x+8} Q{x} {y+33} {x} {y+26} V{y+7} Q{x} {y} {x+8} {y}" fill="#f6cd34"/>'
    art += f'<ellipse cx="{x+17.5}" cy="{y+4}" rx="17.5" ry="5" fill="#ffe66b"/>'
    art += f'<path d="M{x+30} {y+6} V{y+26} Q{x+30} {y+30} {x+23} {y+32} Q{x+35} {y+33} {x+35} {y+26} V{y+4}" fill="#d5a923"/>'
    art += rect(x+8, y+12, 3.5, 4.5, '#253132', 1.5) + rect(x+22, y+12, 3.5, 4.5, '#253132', 1.5)
    if puzzled:
        art += f'<path d="M{x+7} {y+9} L{x+12} {y+7} M{x+22} {y+8} L{x+27} {y+10}" stroke="#253132" stroke-width="2" stroke-linecap="round"/>'
    depth = 8 if happy else 5
    art += f'<path d="M{x+9} {y+23} Q{x+17} {y+23+depth} {x+25} {y+22}" fill="none" stroke="#253132" stroke-width="2.5" stroke-linecap="round"/>'
    return art


def noob(pose):
    art = '<ellipse cx="71" cy="141" rx="40" ry="7" fill="#28492525"/>'
    art += block(38, 135, 64, 5, 8, '#84ad63', '#648a4a', '#b6d383')
    # Keep the classic six-part silhouette legible at thumbnail size.
    art += block(49, 100, 19, 33, 6, *GREEN) + block(73, 100, 19, 33, 6, *GREEN)
    art += block(46, 57, 48, 46, 7, *BLUE)
    art += rect(49, 61, 5, 37, '#4898e7', 1)
    if pose == 'working':
        art += block(29, 64, 15, 28, 5, *YELLOW) + block(98, 62, 15, 27, 5, *YELLOW)
        art += block(30, 85, 31, 12, 5, *YELLOW) + block(83, 83, 29, 12, 5, *YELLOW)
    elif pose == 'blocked':
        art += block(28, 60, 15, 43, 5, *YELLOW)
        art += block(98, 55, 23, 15, 5, *YELLOW) + block(109, 23, 14, 35, 5, *YELLOW)
    elif pose == 'done':
        art += '<g transform="rotate(-32 38 62)">' + block(28, 25, 15, 43, 5, *YELLOW) + '</g>'
        art += '<g transform="rotate(32 105 62)">' + block(98, 24, 15, 44, 5, *YELLOW) + '</g>'
    else:
        art += block(28, 59, 15, 43, 5, *YELLOW) + block(98, 58, 15, 43, 5, *YELLOW)
    art += head(52, 21, happy=pose == 'done', puzzled=pose == 'blocked')
    if pose == 'working':
        art += block(39, 98, 66, 5, 6, '#344754', '#23323c', '#7595a0')
        art += block(48, 81, 47, 20, 4, '#293b48', '#1a2832', '#516c79')
        art += rect(53, 85, 36, 11, '#73c5df', 1)
        art += rect(57, 89, 13, 2, '#d4f6eb') + rect(57, 93, 21, 1, '#afe4db')
    return art


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for pose in ['working', 'blocked', 'done', 'idle']:
        (OUT / f'noob-{pose}.svg').write_text(svg(noob(pose), f'Original noob figure — {pose}'))
    (OUT / 'noob-face.svg').write_text(svg(head(12, 12, happy=True), 'Original smiling noob face', 60, 60))
    # Herdr's layout picker uses a compact preview, separate from the live screenshot.
    preview = rect(0, 0, 480, 300, '#14221b', 12) + rect(0, 0, 480, 190, '#a8d17d', 12)
    preview += rect(0, 0, 480, 48, '#c5e7eb', 12)
    preview += '<text x="22" y="29" font-family="sans-serif" font-weight="bold" font-size="17" fill="#263d2c">Your noob crew</text>'
    for i, pose in enumerate(['working', 'blocked', 'done', 'idle']):
        preview += f'<g transform="translate({22+i*114},53) scale(.68)">{noob(pose)}</g>'
    preview += rect(0, 174, 480, 18, '#1d3025') + rect(15, 199, 218, 85, '#21372a', 6) + rect(245, 199, 220, 85, '#21372a', 6)
    for x in [25, 255]:
        preview += rect(x, 210, 100, 4, '#c4e68b', 2) + rect(x, 223, 145, 3, '#57754a', 1)
    (OUT.parents[2] / 'layouts' / 'garden.svg').write_text(svg(preview, 'Noob crew in the garden', 480, 300))
    print('Generated four noob poses, face icon, and layout preview')


if __name__ == '__main__':
    main()
