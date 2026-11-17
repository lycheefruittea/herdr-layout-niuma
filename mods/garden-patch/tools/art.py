#!/usr/bin/env python3
"""Original vector garden art. Run from any folder; no third-party assets or packages."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / 'assets'

def polygon(points, color, stroke=None):
    return f'<polygon points="{points}" fill="{color}"' + (f' stroke="{stroke}" stroke-width="1.5" stroke-linejoin="round"' if stroke else '') + '/>'

def rect(x,y,w,h,c,r=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}"/>'

def block(x,y,w,h,d,front,side,top):
    return (rect(x,y,w,h,front,1) + polygon(f'{x},{y} {x+d},{y-d} {x+w+d},{y-d} {x+w},{y}',top)
        + polygon(f'{x+w},{y} {x+w+d},{y-d} {x+w+d},{y+h-d} {x+w},{y+h}',side))

def leaf(x,y,dx,dy,c='#55a844'):
    return polygon(f'{x},{y} {x+dx*.1},{y+dy*.8} {x+dx},{y+dy} {x+dx*.7},{y+dy*.15}',c)

def stem(x,y,h):
    return block(x,y-h,5,h,2,'#548d38','#367036','#91bf58')

def bed():
    return ('<ellipse cx="72" cy="140" rx="55" ry="9" fill="#243d242a"/>'
        + block(16,111,101,24,9,'#b98550','#88623e','#e0b17b')
        + polygon('22,108 112,108 122,101 32,101','#624a34')
        + polygon('25,110 109,110 119,104 35,104','#77563a')
        + rect(22,118,89,3,'#c79863') + rect(24,127,8,3,'#8c653e') + rect(101,118,5,4,'#76553c')
        + polygon('28,110 31,108 34,110','#a27d52') + polygon('100,106 103,103 108,105','#9b774e'))

def seedling():
    return stem(66,109,20)+leaf(68,96,-23,-9,'#67aa40')+leaf(69,89,25,-14,'#9acd59')+leaf(68,88,-11,-15,'#7cbf4c')

def fruit(x,y,w,h,kind,ripe):
    palettes={
        'strawberry':('#ed596a','#bd354f','#ff8290'),
        'tomato':('#ed684c','#b74134','#ff9570'),
        'blueberry':('#6c75cb','#485597','#a4a7f0'),
        'watermelon':('#65ae51','#348744','#a3d762'),
    }
    colors=palettes[kind] if ripe else ('#91b75e','#5b9145','#c1d68a')
    art=block(x,y,w,h,5,*colors)
    if kind=='strawberry':
        for xx,yy in [(x+5,y+5),(x+12,y+9),(x+6,y+15)]: art+=rect(xx,yy,2,3,'#ffe7a1',.5)
    if kind=='watermelon':
        for xx in range(int(x+5),int(x+w-2),8): art+=rect(xx,y+2,3,h-4,'#367a45',1)
    art+=leaf(x+w/2,y,11,-6,'#327b3b')+leaf(x+w/2,y,-9,-5,'#60a84c')
    return art

def crop(kind,stage):
    if stage=='seedling': return seedling()
    ripe=stage=='ripe'
    a=''
    if kind in ('strawberry','tomato','blueberry'):
        a+=stem(67,110,56)
        for x,y,dx,dy in [(69,85,-28,-17),(69,72,32,-18),(69,58,-23,-10),(68,98,32,-14)]: a+=leaf(x,y,dx,dy)
        a+=leaf(67,77,-36,-7,'#8cc54c')+leaf(70,96,31,-3,'#8cc54c')
        if kind=='blueberry':
            for x,y in [(42,70),(59,61),(76,77),(59,88)]: a+=fruit(x,y,14,14,kind,ripe)
        else:
            a+=fruit(41,70,21,24,kind,ripe)+fruit(77,79,23,25,kind,ripe)
            if ripe:a+=fruit(64,49,18,20,kind,True)
    elif kind=='carrot':
        for x,y in [(44,81),(73,76)]:
            a+=polygon(f'{x},{y} {x+22},{y-4} {x+17},{y+30} {x+9},{y+40}', '#f5a33e' if ripe else '#d8b45c')
            a+=polygon(f'{x+22},{y-4} {x+28},{y-8} {x+22},{y+24} {x+9},{y+40}', '#d47931' if ripe else '#aa9c4d')
            a+=rect(x+5,y+9,10,2,'#cf7330')+rect(x+10,y+19,7,2,'#cf7330')
            for dx,dy,c in [(-20,-25,'#57a740'),(4,-35,'#86bf4e'),(25,-26,'#45943e')]:a+=leaf(x+12,y-3,dx,dy,c)
    elif kind=='corn':
        a+=stem(67,111,79)
        for y,dx in [(66,-34),(88,33),(45,24)]:a+=leaf(69,y,dx,-22)
        for x,y in [(48,59),(74,75)]:
            a+=block(x,y,15,29,5,'#f2ca54' if ripe else '#91b955','#c8a645','#ffe381')
            for yy in range(y+5,y+28,6):a+=rect(x+2,yy,11,1,'#d9af3b')
            a+=leaf(x+7,y+30,-15,-28,'#74ad3b')
        a+=polygon('70,37 61,24 66,22 73,29 77,17 80,21 75,39','#ddc37b')
    elif kind=='sunflower':
        a+=stem(67,111,71)+leaf(69,89,-31,-17)+leaf(70,76,31,-18,'#86bd45')
        if ripe:
            for x,y,w,h in [(53,22,26,15),(52,58,29,16),(36,37,18,27),(80,35,18,28)]:a+=block(x,y,w,h,3,'#f4c94d','#dea536','#ffe585')
            a+=block(53,37,27,27,5,'#836137','#634835','#ab813f')
            a+=rect(59,43,3,3,'#c49d58')+rect(69,51,3,3,'#c49d58')
        else:a+=block(57,42,23,25,4,'#83b74f','#588d3d','#bbcf72')
    elif kind=='watermelon':
        a+=leaf(64,111,-39,-17,'#5b9d3f')+leaf(83,110,30,-13,'#75ae40')
        a+=fruit(43,81,43 if ripe else 31,30,'watermelon',ripe)
        a+=stem(78,82,18)+leaf(80,69,23,-12,'#75b343')
    elif kind=='bamboo':
        for x,y,h in [(44,110,65),(67,109,88 if ripe else 66),(87,108,53)]:
            a+=block(x,y-h,9,h,4,'#8bb34c','#5e9141','#c2d97b')
            for yy in range(y-h+14,y,18):a+=rect(x,yy,9,3,'#d0d98a')
            a+=leaf(x+5,y-h+10,-20,-18,'#57a249')+leaf(x+5,y-h+6,22,-10,'#85c258')
    return a

def svg(content,title,w=140,h=154):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*2}" height="{h*2}" viewBox="0 0 {w} {h}"><title>{escape(title)}</title>{content}</svg>\n'

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for kind in ['strawberry','carrot','tomato','corn','blueberry','sunflower','watermelon','bamboo']:
        for stage in ['seedling','growing','ripe']:
            (OUT/f'{kind}-{stage}.svg').write_text(svg(bed()+crop(kind,stage),f'Original {kind} {stage}'))
    tree=block(51,81,15,54,8,'#936b45','#654e38','#b08a55')
    tree+=block(19,38,74,55,18,'#6aab48','#438941','#a0c65a')
    tree+=block(32,14,49,39,15,'#81bc51','#57a144','#b6d56b')
    tree+=block(26,56,11,12,3,'#e77d55','#ba553e','#ffab70')+block(77,38,11,12,3,'#e77d55','#ba553e','#ffab70')
    (OUT/'tree.svg').write_text(svg(tree,'Original blocky orchard tree'))
    bee=block(23,24,31,23,5,'#f3cf59','#d6a83f','#ffe695')+rect(31,24,7,23,'#5b513b')+rect(45,24,7,23,'#5b513b')
    bee+=block(15,22,13,18,3,'#625541','#453e33','#897453')+rect(16,26,3,4,'#171f24')
    bee+=polygon('30,25 24,9 37,6 41,23','#eefaffcc')+polygon('38,25 45,9 59,12 48,28','#e0f3f9dd')
    (OUT/'bee.svg').write_text(svg(bee,'Original garden helper bee',76,60))
    can=block(28,30,37,27,7,'#85cbd1','#529ca9','#b8e9e7')+polygon('29,37 12,25 8,31 28,49','#77bec7')
    can+=f'<path d="M66 31 C91 15 89 63 66 54" fill="none" stroke="#72b7c0" stroke-width="6"/>'
    can+=block(36,23,19,9,4,'#b1dcd4','#78aeba','#dff7e8')
    (OUT/'watering-can.svg').write_text(svg(can,'Original watering can',100,76))
    bag=block(27,19,39,40,5,'#d4b881','#aa915e','#f5d99a')+rect(30,33,30,20,'#4e9259',2)+leaf(45,48,-10,-10,'#d4e9a8')+leaf(45,43,10,-10,'#d4e9a8')
    (OUT/'seed-bag.svg').write_text(svg(bag,'Original seed bag',100,76))
    crate=block(17,31,64,27,8,'#bf8d50','#8f693e','#e8b969')+rect(20,41,56,3,'#946b3c')
    for x,y in [(26,17),(47,15),(62,22)]:crate+=fruit(x,y,13,17,'tomato',True)
    (OUT/'harvest.svg').write_text(svg(crate,'Original harvest crate',100,76))
    logo=stem(43,73,29)+leaf(45,57,-25,-21,'#72b742')+leaf(46,47,28,-21,'#a9d75c')
    (OUT/'sprout.svg').write_text(svg(logo,'Original garden sprout',100,100))
    print('Generated',len(list(OUT.glob('*.svg'))),'original SVG assets')

if __name__=='__main__': main()
