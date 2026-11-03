"""Original deterministic botanical artworks, generated for ALUSORA with code. No third-party imagery."""
from pathlib import Path
import random, math
from html import escape
OUT=Path(__file__).resolve().parent/'public/assets'
W,H=900,720

def flower(x,y,size,color,second,rng,kind='petal'):
    n=rng.choice([8,9,10,11,12]); angle=rng.randint(0,30)
    s=f'<g transform="translate({x:.1f} {y:.1f}) rotate({angle})" filter="url(#petalShadow)">'
    for i in range(n):
        theta=i*360/n
        rx=size*0.28;ry=size*0.64
        s+=f'<ellipse cx="0" cy="{-size*.37:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" transform="rotate({theta:.1f})" fill="url(#{color})" stroke="{second}" stroke-opacity=".28" stroke-width=".7"/>'
    for i in range(n):
        theta=i*360/n+360/(2*n)
        s+=f'<ellipse cx="0" cy="{-size*.24:.1f}" rx="{size*.19:.1f}" ry="{size*.4:.1f}" transform="rotate({theta:.1f})" fill="url(#{color})" opacity=".83"/>'
    s+=f'<circle r="{size*.25:.1f}" fill="{second}" opacity=".9"/><circle r="{size*.12:.1f}" fill="#c48c4a" opacity=".6"/>'
    for i in range(11):
        a=rng.random()*math.pi*2;r=rng.random()*size*.22
        s+=f'<circle cx="{math.cos(a)*r:.1f}" cy="{math.sin(a)*r:.1f}" r="1.2" fill="#f6e8b4" opacity=".9"/>'
    return s+'</g>'

def vase(x,base,scale,body,edge,rng):
    wide=90*scale;high=175*scale
    top=base-high
    return f'''<g filter="url(#vaseShadow)">
    <ellipse cx="{x:.1f}" cy="{base+9*scale:.1f}" rx="{wide*.9:.1f}" ry="{10*scale:.1f}" fill="#543c43" opacity=".18"/>
    <path d="M{x-wide*.59:.1f} {top:.1f} Q{x-wide*.8:.1f} {top+25*scale:.1f} {x-wide:.1f} {base-62*scale:.1f} Q{x-wide*1.01:.1f} {base+4*scale:.1f} {x:.1f} {base:.1f} Q{x+wide*1.01:.1f} {base+4*scale:.1f} {x+wide:.1f} {base-62*scale:.1f} Q{x+wide*.8:.1f} {top+25*scale:.1f} {x+wide*.59:.1f} {top:.1f}Z" fill="{body}" stroke="{edge}" stroke-width="1.5"/>
    <ellipse cx="{x:.1f}" cy="{top:.1f}" rx="{wide*.6:.1f}" ry="{10*scale:.1f}" fill="{edge}"/>
    <path d="M{x-wide*.47:.1f} {top+25*scale:.1f} Q{x-wide*.58:.1f} {base-57*scale:.1f} {x-wide*.34:.1f} {base-18*scale:.1f}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="{9*scale:.1f}" stroke-linecap="round"/>
    </g>'''

def bouquet(x,base,scale,rng,colors,body,edge,n=15,spread=1.15):
    top=base-175*scale
    out=[]
    # foliage and flowering stems
    for i in range(n):
        xx=x+(i-(n-1)/2)*rng.uniform(13,20)*scale*spread
        yy=top-rng.uniform(55,220)*scale + abs(xx-x)*.30
        ctrl=x+(xx-x)*rng.uniform(.1,.5)
        out.append(f'<path d="M{x+rng.randint(-15,15)*scale:.1f} {top+4*scale:.1f} Q{ctrl:.1f} {top-90*scale:.1f} {xx:.1f} {yy:.1f}" fill="none" stroke="#516f59" stroke-width="{rng.uniform(2.1,3.4)*scale:.1f}"/>' )
        for j in (0,1):
            ly=yy+(top-yy)*rng.uniform(.35,.76)
            lx=(xx+x)/2+(xx-x)*rng.uniform(-.1,.15)
            sign=(-1)**(i+j)
            leafendx=lx+sign*rng.uniform(21,43)*scale
            leafendy=ly-rng.uniform(16,30)*scale
            leaf=f'M{lx:.1f} {ly:.1f} Q{leafendx-sign*5*scale:.1f} {leafendy-18*scale:.1f} {leafendx:.1f} {leafendy:.1f} Q{leafendx-sign*20*scale:.1f} {ly+9*scale:.1f} {lx:.1f} {ly:.1f}'
            out.append(f'<path d="{leaf}" fill="{rng.choice(["#617c60","#89a27c","#4c705d","#a0ad83"])}" opacity=".94"/>')
        c=rng.choice(colors)
        out.append(flower(xx, yy, rng.uniform(27,43)*scale,c,rng.choice(['#c7a55c','#bf8b62','#87644b']),rng))
    out.append(vase(x,base,scale,body,edge,rng))
    return ''.join(out)

def graphic(name, seed, palette, background, vessels, caption='', decor='event'):
    rng=random.Random(seed)
    blocks=[]
    blocks.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Original digitally illustrated floral arrangement">
    <defs>
      <linearGradient id="background" x2="1" y2="1"><stop stop-color="{background[0]}"/><stop offset="1" stop-color="{background[1]}"/></linearGradient>
      <linearGradient id="floor" y2="1" x2="0"><stop stop-color="#f3e5d6"/><stop offset="1" stop-color="#d9c3b0"/></linearGradient>
      <radialGradient id="blush"><stop stop-color="#fffbf6"/><stop offset=".56" stop-color="#f3c7cc"/><stop offset="1" stop-color="#cc879b"/></radialGradient>
      <radialGradient id="cream"><stop stop-color="#fffdf8"/><stop offset=".6" stop-color="#f8e8c6"/><stop offset="1" stop-color="#d0b68e"/></radialGradient>
      <radialGradient id="white"><stop stop-color="#fff"/><stop offset=".65" stop-color="#fcfbf5"/><stop offset="1" stop-color="#c8cebf"/></radialGradient>
      <radialGradient id="peach"><stop stop-color="#fff5dd"/><stop offset=".55" stop-color="#ffc7a3"/><stop offset="1" stop-color="#df977f"/></radialGradient>
      <radialGradient id="red"><stop stop-color="#ffd9dd"/><stop offset=".5" stop-color="#cf566d"/><stop offset="1" stop-color="#852a49"/></radialGradient>
      <radialGradient id="lavender"><stop stop-color="#fff"/><stop offset=".55" stop-color="#d7c3e0"/><stop offset="1" stop-color="#96809d"/></radialGradient>
      <radialGradient id="yellow"><stop stop-color="#fff9d3"/><stop offset=".58" stop-color="#f3d886"/><stop offset="1" stop-color="#cc9a4e"/></radialGradient>
      <radialGradient id="coral"><stop stop-color="#ffe5d9"/><stop offset=".58" stop-color="#f49f9e"/><stop offset="1" stop-color="#bb5967"/></radialGradient>
      <filter id="vaseShadow"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feOffset dy="6" dx="0"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="petalShadow"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#57454a" flood-opacity=".17"/></filter>
      <filter id="ambient"><feGaussianBlur stdDeviation="32"/></filter>
    </defs>
    <rect width="900" height="720" fill="url(#background)"/>
    <ellipse cx="465" cy="180" rx="310" ry="210" fill="#fff" opacity=".14" filter="url(#ambient)"/>
    <path d="M-60 530 Q120 475 250 520 T560 508 T960 518 L960 750 L-60 750Z" fill="url(#floor)"/>
    <path d="M0 518 Q440 532 900 512" stroke="#fff" stroke-opacity=".25" stroke-width="6" fill="none"/>
    ''')
    if decor=='statement':
        blocks.append('<path d="M640 0 C640 170 765 210 780 460" stroke="#eee0ce" stroke-width="130" fill="none" opacity=".55"/><ellipse cx="160" cy="560" rx="110" ry="22" fill="#cab2a2" opacity=".36"/>')
    elif decor=='church':
        blocks.append('<path d="M180 520 L180 240 Q450 -105 720 240 L720 520" fill="none" stroke="#e7d9cd" stroke-width="45" opacity=".5"/><path d="M450 70 L450 225 M406 135 L494 135" stroke="#c0a27a" stroke-width="7" opacity=".3"/>')
    elif decor=='memorial':
        blocks.append('<path d="M690 0 Q580 330 800 510" stroke="#f8f8ef" stroke-width="145" fill="none" opacity=".5"/>')
    else:
        blocks.append('<path d="M690 -40 C530 210 895 340 736 540" fill="none" stroke="#fffaf0" stroke-width="135" opacity=".17"/>')
    # candles, for scale and styling
    if decor in ('event','statement'):
        blocks.append('<rect x="728" y="458" width="28" height="61" rx="5" fill="#f8f3e9"/><path d="M742 458 v-13" stroke="#73675d" stroke-width="2"/><ellipse cx="742" cy="440" rx="4" ry="8" fill="#efca82" opacity=".85"/>')
    for x,base,scale,body,edge,n,spread in vessels:
        blocks.append(bouquet(x,base,scale,rng,palette,body,edge,n,spread))
    # decorative specks produce printed watercolor mood
    for i in range(34):
        x=rng.randrange(20,W-20); y=rng.randrange(30,480)
        blocks.append(f'<circle cx="{x}" cy="{y}" r="{rng.uniform(.8,2):.2f}" fill="#fff8ec" opacity="{rng.uniform(.15,.5):.2f}"/>')
    blocks.append('</svg>')
    (OUT/name).write_text(''.join(blocks), encoding='utf-8')

graphic('hero-florals.svg',42,['blush','cream','peach','red','lavender'],('#e5d7ca','#e4bdaf'),[(460,650,1.75,'#bd7a77','#996168',24,1.2)],'','statement')
graphic('little-celebration.svg',16,['blush','cream','yellow'],('#ece0d7','#e7c6c4'),[(230,615,.63,'#e1c4b3','#c69f99',9,1),(445,614,.6,'#f3e7dc','#bfb3b0',8,1),(660,615,.65,'#d1a4a3','#a1777e',9,1)])
graphic('birthday-garden.svg',18,['peach','blush','cream','lavender'],('#dfdfd7','#eccdc7'),[(224,615,.74,'#e5d0b6','#ad947e',9,1),(456,628,1.12,'#b8ac96','#8b917a',16,1.1),(716,615,.74,'#eedcc5','#bda69f',9,1)])
graphic('birthday-statement.svg',24,['red','blush','peach','cream'],('#ddcbd2','#e9bbb4'),[(270,638,1.33,'#83495c','#6b3447',19,1.18),(657,647,1.45,'#a97468','#81514d',21,1.14)],'','statement')
graphic('gentle-tribute.svg',31,['white','cream','blush'],('#e9e9e3','#d6dcd3'),[(470,648,1.6,'#c9d1bb','#9fae9b',25,1.25)],'','memorial')
graphic('sacred-harmony.svg',34,['white','cream','yellow'],('#e5e0d7','#d9c7b2'),[(263,639,1.24,'#d4c4a2','#a99f85',16,1.2),(655,639,1.24,'#d4c4a2','#a99f85',16,1.2)],'','church')
graphic('sacred-celebration.svg',35,['blush','white','lavender','cream'],('#e2ddd8','#d3c4c5'),[(189,625,.72,'#b5b3a7','#8e9487',10,1),(363,635,1.15,'#b5ada9','#8c7777',15,1),(573,635,1.15,'#b5ada9','#8c7777',15,1),(758,625,.72,'#b5b3a7','#8e9487',10,1)],'','church')
graphic('bouquet-builder.svg',48,['blush','cream','coral','yellow'],('#eddbcf','#e2c0bf'),[(457,645,1.58,'#e7c7a9','#c59687',23,1.18)])
print('\n'.join(f'{p.name}: {p.stat().st_size//1024} KB' for p in OUT.glob('*.svg')))
