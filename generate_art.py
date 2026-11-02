"""Original SVG botanical illustrations; no third-party images/assets required."""
from pathlib import Path
from math import sin, cos, pi
from html import escape
import random
root=Path(__file__).resolve().parent / 'web' / 'assets'
root.mkdir(parents=True,exist_ok=True)
palettes={
 'blush': ['#b85e7c','#dd9db2','#f6c6c8','#f0e2c7','#bd8a8c'],
 'apricot':['#cb866b','#ecb397','#e5c4a6','#e6dbb4','#e4a4a0'],
 'berry':['#9a4356','#bb6d75','#ddb2b2','#e9d1ba','#ba6270'],
 'peach':['#d3786e','#ecc0a0','#f3d5ba','#b75d6a','#d79b9a'],
 'holiday':['#992e42','#bc5360','#e8e0c7','#f1d0c4','#a44a51'],
 'poinsettia':['#a5324a','#b8374b','#bf5262','#d06468','#8e2a41'],
 'winter':['#e2d7ca','#f2ece3','#e8c9cd','#e9debc','#ded2d1'],
 'hero':['#c8797b','#dca2a1','#e8c3b7','#f1dfc6','#a74b61'],
}


def bouquet(key):
 r=random.Random(2026+sum(map(ord,key)))
 colors=palettes[key]
 w,h=(760,820) if key=='hero' else (540,560)
 scale=w/540
 elements=[]
 def add(s): elements.append(s)
 add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="Illustrated floral arrangement in {key} tones">')
 add(f'''<defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9efe0"/><stop offset="1" stop-color="#dcc6b6"/></linearGradient><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b7d2b9" stop-opacity=".84"/><stop offset="1" stop-color="#799d8f" stop-opacity=".7"/></linearGradient></defs>''')
 add(f'<g transform="translate({(w-540)/2:.1f} {(h-560)/2:.1f}) scale(1)">')
 add('<ellipse cx="270" cy="510" rx="155" ry="21" fill="#54413b" opacity=".09"/>')
 # leaf stalks beneath heads
 stems=[(118,165,252,416), (198,100,261,423),(258,119,265,427),(355,122,282,423),(421,198,285,427),(177,245,259,433),(312,229,274,430),(398,280,288,424)]
 for i,(x,y,xe,ye) in enumerate(stems):
  add(f'<path d="M{x} {y} Q{(x+xe)/2-16:.0f} 300 {xe} {ye}" stroke="#718c66" stroke-width="5" fill="none" stroke-linecap="round"/>')
  for step in (0.48,0.69):
   lx=x+(xe-x)*step
   ly=y+(ye-y)*step+10
   flip=1 if i%2==0 else -1
   add(f'<path d="M{lx:.0f} {ly:.0f} q{flip*32} -41 {flip*56} -13 q{-flip*22} 29 {-flip*56} 13Z" fill="{r.choice(["#7d9475","#90a785","#a4b59b","#5f856c"])}" opacity=".9"/>')
 # leaf accents
 for _ in range(10):
  x=r.randint(130,402); y=r.randint(138,290)
  ang=r.randrange(0,360)
  add(f'<path d="M{x} {y}q28 -52 56 0q-28 34 -56 0Z" fill="{r.choice(["#788e6e","#adc1a3","#6a856a"])}" opacity=".72" transform="rotate({ang} {x} {y})"/>')
 # flowers: organic layered petals
 positions=[(148,178,56),(210,107,51),(281,128,53),(353,160,58),(409,217,51),(186,255,54),(280,228,65),(344,280,46),(112,274,38),(405,314,42)]
 for idx,(x,y,rad) in enumerate(positions):
  c=colors[idx%len(colors)]
  add(f'<g transform="translate({x} {y}) rotate({r.randint(-22,22)})">')
  petals=7 if idx%3 else 8
  for j in range(petals):
   angle=j*360/petals
   add(f'<ellipse cx="0" cy="-{rad*.54:.1f}" rx="{rad*.39:.1f}" ry="{rad*.69:.1f}" fill="{c}" opacity="{.93 if j%2 else .82}" transform="rotate({angle})"/>')
  inner=r.choice(colors)
  for j in range(5):
   add(f'<ellipse cx="0" cy="-{rad*.22:.1f}" rx="{rad*.18:.1f}" ry="{rad*.33:.1f}" fill="{inner}" opacity=".72" transform="rotate({j*72+12})"/>')
  add(f'<circle r="{rad*.14:.1f}" fill="#d3ac75"/><circle r="{rad*.07:.1f}" fill="#fff1c6"/>')
  add('</g>')
 # wrapping paper outer silhouette
 if key=='poinsettia':
  add('<path d="M165 345 Q272 374 388 350 L366 470 Q271 518 177 473Z" fill="#c29b9c" opacity=".94"/><path d="M185 364L351 365L330 467Q273 493 207 470Z" fill="#f2dfd0"/>')
 elif key in ('berry','holiday'):
  add('<path d="M113 345L235 400L271 505L155 449Z" fill="#ead7c5"/><path d="M417 346L307 396L271 505L386 447Z" fill="#f5e9dc"/><path d="M136 354Q270 396 405 350L314 497Q266 523 224 493Z" fill="url(#paper)"/>')
 else:
  add('<path d="M111 336L238 385L269 502L147 442Z" fill="#ece0d1"/><path d="M418 342L309 388L269 502L395 447Z" fill="#f8e9e0"/><path d="M135 355Q265 396 408 350L315 506Q267 529 221 500Z" fill="url(#paper)"/>')
 add('<path d="M221 499Q268 520 315 502" fill="none" stroke="#c48c92" stroke-width="7" opacity=".7"/>')
 add('<path d="M260 480q-50 -37 -51 1q23 24 51 -1Zm10 0q44 -34 53 -3q-19 29 -53 3Z" fill="#bd7d82"/><path d="M263 479q1 30 -14 48M268 480q18 26 17 48" stroke="#bd7d82" stroke-width="6" fill="none"/>')
 add('</g></svg>')
 return ''.join(elements)

for key in palettes:
 (root/f'{key}.svg').write_text(bouquet(key),encoding='utf-8')

(root/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#244b3c"/><path d="M17 45 31 17h3l14 28h-6l-3-7H26l-3 7Zm11-12h9l-4-10Z" fill="#f5e9df"/><path d="M18 19q9-11 17-2" fill="none" stroke="#d5a88e" stroke-width="3"/></svg>''',encoding='utf-8')
print('Illustrations generated')
