"""Builds the Eden static site from one shared layout.

Run from the repo root:  python _src/build.py
Writes the HTML pages in place (same URLs as the original welcometoeden.co.za site)
and web-sized photos into img/g/. Content lives in this file; styles in css/eden.css,
behaviour in js/eden.js.
"""
import os, re, html, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

HOME = '/'
ACC = '/p11/accommodation/accommodation-in-kimberley/'
REST = '/p12/restaurant/eden-on-the-grill-restaurant/'
CONF = '/p13/conferences/conference-and-function-venues-in-kimberley/'
GAL = '/gallery/'
CON = '/p3/contact-us/contact-eden-lodge,-restaurant-and-conference-centre/'
TP = '/trampoline-park/'
PRIV = '/p4/privacy-policy.html'
COOK = '/p4/cookie-policy.html'
SITE = 'https://welcometoeden.co.za'

TEL, TEL_H = '+27603339333', '+27 60 333 9333'
WA = 'https://api.whatsapp.com/send?phone=27603339333'
MAIL = 'contact@welcometoeden.co.za'
MAP = 'https://maps.app.goo.gl/M81UKrrQJyFEoRz4A'
ADDR = '112 Landbou Rd, South Ridge, Kimberley, 8301'
MAP_EMBED = ('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d749.451900015318!2d24.74805929440422'
             '!3d-28.778385580580963!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9b1a26696c7e1d'
             '%3A0x50a8fcd6786b1cc!2sEden%20Restaurant%20%26%20Lodge!5e0!3m2!1sen!2sza!4v1740660885265!5m2!1sen!2sza')


# ---------- images ----------
def G(n):
    return f'/uploads/EdenLodgeRestaurantGallery-{n:02d}.jpg'

def E(name):
    return f'/uploads/eden/{name}.jpg'

NEW = ['entrance', 'guest-coffee-bed', 'room-green-throw', 'guest-reading-bed', 'guest-bed-plant', 'room-tray',
       'bathroom-shelf', 'guest-magazine', 'room-bed-magazine', 'garden-path', 'room-tray-close', 'guest-reading-tray',
       'coffee-station', 'room-green-throw-2', 'playground', 'entrance-2', 'reception-sign', 'cafe-sign',
       'pool-garden', 'play-area', 'braai-patio']

def web(src, w=900):
    """Web-sized copy of an /uploads photo (keeps aspect). Returns its URL."""
    name, ext = os.path.splitext(os.path.basename(src))
    png = ext.lower() == '.png'
    out = f'img/g/{name}-{w}.{"png" if png else "jpg"}'
    if not os.path.exists(out):
        os.makedirs('img/g', exist_ok=True)
        im = Image.open(src.lstrip('/'))
        im = im.convert('RGBA' if png else 'RGB')
        if png and im.getbbox():
            im = im.crop(im.getchannel('A').getbbox())
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        if png:
            im.save(out, optimize=True)
        else:
            im.save(out, quality=80, optimize=True, progressive=True)
    return '/' + out

def size(src):
    im = Image.open(src.lstrip('/'))
    return im.width, im.height

def img(src, alt, cls='', w=None, lazy=True):
    s = web(src, w) if w else src
    iw, ih = size(s)
    return (f'<img src="{s}" alt="{html.escape(alt)}" width="{iw}" height="{ih}"'
            f'{" class=%s" % chr(34) + cls + chr(34) if cls else ""}{" loading=lazy decoding=async" if lazy else ""}>')


# ---------- shared layout ----------
NAV_STAY = [(ACC, 'Accommodation'), (REST, 'Restaurant'), (CONF, 'Conferences &amp; Events'), (TP, 'Trampoline Park')]
NAV_EDEN = [(HOME, 'Home'), (GAL, 'Photo Gallery'), (CON, 'Contact Us')]

def ver(path):
    return hashlib.md5(open(path.lstrip('/'), 'rb').read()).hexdigest()[:8]

ARROW = '<span class="arr" aria-hidden="true"></span>'

def head(title, desc, path, hero_img=None):
    pre = f'<link rel="preload" as="image" href="{hero_img}">' if hero_img else ''
    return f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{SITE}{hero_img or G(7)}">
<meta name="theme-color" content="#336633">
<link rel="icon" href="/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500&family=Pinyon+Script&display=swap" rel="stylesheet">
<script>(function(h){{var r=function(){{h.classList.add('fonts-ready')}};if(document.fonts&&document.fonts.ready)document.fonts.ready.then(r);setTimeout(r,2500)}})(document.documentElement)</script>
<link rel="stylesheet" href="/css/eden.css?v={ver('/css/eden.css')}">
{pre}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WWD577N0KL"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-WWD577N0KL');gtag('config','AW-16936927334');</script>
</head>'''

def header(path, plain=False):
    cur = lambda u: ' aria-current="page"' if u == path else ''
    stay = ''.join(f'<a href="{u}"{cur(u)}>{t}</a>' for u, t in NAV_STAY)
    eden = ''.join(f'<a href="{u}"{cur(u)}>{t}</a>' for u, t in NAV_EDEN)
    return f'''<body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr{' plain' if plain else ''}">
<div class="hdr-in">
<button class="menu-btn" type="button" data-open="menu" aria-controls="menu"><span class="burger" aria-hidden="true"></span><span class="t">Menu</span></button>
<a class="logo" href="/" aria-label="Eden home"><img class="lt" src="/img/logo-light.png" alt="Eden — a delightful dwelling" width="360" height="119"><img class="dk" src="/img/logo-dark.png" alt="" width="360" height="119"></a>
<div class="hdr-r"><a class="hdr-tel" href="tel:{TEL}">{TEL_H}</a><a class="btn" href="{CON}#enquire" data-open="book">Book now</a></div>
</div>
</header>
<div class="menu" id="menu" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Site menu">
<div class="menu-top"><img src="/img/logo-green.png" alt="Eden" width="360" height="119"><button class="menu-close" type="button" data-close>Close <i aria-hidden="true"></i></button></div>
<nav class="menu-body" aria-label="Main">
<div class="menu-col"><h4>Stay, dine &amp; play</h4>{stay}</div>
<div class="menu-col"><h4>Eden</h4>{eden}</div>
</nav>
<div class="menu-foot"><a href="tel:{TEL}">{TEL_H}</a><a href="{WA}">WhatsApp</a><a href="mailto:{MAIL}">{MAIL}</a><a href="{MAP}" target="_blank" rel="noopener">{ADDR}</a></div>
</div>
<div class="book" id="book" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Booking enquiry">
<div class="book-bg" data-close></div>
<div class="book-panel">
<button class="menu-close" type="button" data-close>Close <i aria-hidden="true"></i></button>
<h2>Plan your visit</h2>
<p class="note">Tell us what you have in mind and we will confirm availability with you directly.</p>
<form id="bookForm" action="{CON}">
<label class="field"><span>I would like to book</span><select name="kind"><option>Accommodation</option><option>Restaurant table</option><option>Conference or event</option><option>Trampoline Park</option></select></label>
<div class="dates row2"><label class="field"><span class="lbl-in">Check-in</span><input type="date" name="arrive"></label><label class="field"><span class="lbl-out">Check-out</span><input type="date" name="depart"></label></div>
<label class="field dates"><span>Guests</span><select name="guests"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5 – 10</option><option>10 – 50</option><option>50+</option></select></label>
<p class="note-box bk-note"><strong>Please note:</strong> children aged 0 – 18 are charged 100% of the sharing rate.</p>
<button class="btn solid" type="submit">Continue {ARROW}</button>
</form>
</div>
</div>
<main id="main">'''

def footer():
    stay = ''.join(f'<li><a href="{u}">{t}</a></li>' for u, t in NAV_STAY)
    eden = ''.join(f'<li><a href="{u}">{t}</a></li>' for u, t in NAV_EDEN)
    return f'''</main>
<footer class="ftr">
<div class="wrap">
<div class="ftr-top">
<div><img src="/img/logo-light.png" alt="Eden — a delightful dwelling" width="360" height="119" loading="lazy"><p>Lodge, restaurant, conference centre and trampoline park in Kimberley.</p></div>
<div><h4>Discover</h4><ul>{stay}</ul></div>
<div><h4>Eden</h4><ul>{eden}</ul></div>
<div><h4>Visit</h4><ul><li><a href="tel:{TEL}">{TEL_H}</a></li><li><a href="{WA}">WhatsApp {TEL_H}</a></li><li><a href="mailto:{MAIL}">{MAIL}</a></li><li><a href="{MAP}" target="_blank" rel="noopener">{ADDR}, South Africa</a></li></ul></div>
</div>
<div class="ftr-bot"><span>&copy; <span id="yr">2026</span> Eden Est. All rights reserved.</span><nav aria-label="Legal"><a href="{PRIV}">Privacy Policy</a><a href="{COOK}">Cookie Policy</a></nav></div>
</div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="/js/eden.js?v={ver('/js/eden.js')}" defer></script>
</body>
</html>
'''

def page(path, title, desc, content, hero_img=None, plain=False):
    out = path.lstrip('/')
    if out == '' or out.endswith('/'):
        out += 'index.html'
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    content = re.sub(r'<span class="eyebrow[^"]*">.*?</span>', '', content)
    doc = head(title, desc, path, hero_img) + '\n' + header(path, plain) + '\n' + content + '\n' + footer()
    open(out, 'w', encoding='utf8', newline='\n').write(doc)
    print('wrote', out)


# ---------- building blocks ----------
def hero(src, eyebrow, h1, sub='', full=False, cue=True, cls=''):
    lines = ''.join(f'<span class="ln"><span>{l}</span></span>' for l in re.split(r'\s+(?=<em>)', h1))
    return f'''<section class="hero{'' if full else ' sub'}{(' ' + cls) if cls else ''}">
{img(src, '', 'hero-img', lazy=False)}
<div class="hero-c">
<h1>{lines}</h1>
{f'<p class="hero-sub">{sub}</p>' if sub else ''}
</div>
</section>'''

def split(pic, eyebrow, title, body, cta=None, rev=False, tag='', wide=False, extra=''):
    btn = f'<a class="btn" href="{cta[0]}">{cta[1]} {ARROW}</a>' if cta else ''
    sub = f'<p class="sub">{eyebrow}</p>' if eyebrow else ''
    return f'''<div class="split{' rev' if rev else ''}">
<div class="split-img"><div class="reveal">{pic}</div></div>
<div class="split-txt rv d1"><h2>{title}</h2>{sub}{body}{extra}{btn}</div>
</div>'''

def feature(title, sub, text, pics, cta=None, rev=False, pq=''):
    if pq:
        link = f'<p class="pq-link"><a href="{cta[0]}">{cta[1]}</a></p>' if cta else ''
        tag = 'h3' if pq == 'season' else 'h2'
        return f'''<div class="pq-feat {pq}">
<div class="pq-pic"><div class="reveal settle">{pics}</div></div>
<div class="pq-txt rv d1"><{tag}>{title}</{tag}><p class="pq-sub">{sub}</p><p>{text}</p>{link}</div>
</div>'''
    btn = f'<a class="btn" href="{cta[0]}">{cta[1]} {ARROW}</a>' if cta else ''
    return f'''<div class="feature{' rev' if rev else ''}">
<div class="feature-pic"><div class="reveal">{pics}</div></div>
<div class="feature-txt rv d1"><h2>{title}</h2><p class="sub">{sub}</p><p class="prose">{text}</p>{btn}</div>
</div>'''

def marquee(srcs, alt='Eden'):
    srcs = [G(n) if isinstance(n, int) else n for n in srcs]
    row = ''.join(img(p, alt, w=900) for p in srcs)
    return f'<div class="marquee" aria-label="Photos of Eden"><div class="marquee-track"><div class="set">{row}</div><div class="set" aria-hidden="true">{row}</div></div></div>'

def band(src, script, h2, sub=''):
    return f'''<section class="band">
{img(src, '', w=None)}
<div class="band-c rv"><span class="script">{script}</span><h2>{h2}</h2>{f'<p style="margin-top:20px">{sub}</p>' if sub else ''}</div>
</section>'''

def cta(script, h2, text, href, label):
    return f'''<section class="sec cta"><div class="narrow rv">
<span class="script">{script}</span><h2>{h2}</h2><span class="rule c"></span><p>{text}</p>
<a class="btn light" href="{href}">{label} {ARROW}</a>
</div></section>'''

def ticks(items, cols=False):
    return f'<ul class="ticks{" cols" if cols else ""}">' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'

def hours_dl():
    return ('<dl><dt>Wed &amp; Thu</dt><dd>4pm – 9pm</dd><dt>Fri &amp; Sat</dt><dd>12pm – 9pm</dd>'
            '<dt>Sun – Tue</dt><dd>Closed</dd></dl>')

def strip(ids, sid, group):
    srcs = [G(n) if isinstance(n, int) else n for n in ids]
    items = ''.join(f'<a href="{p}" data-lb="{group}">{img(p, "Eden Lodge, Restaurant and Conference Centre", w=900)}</a>' for p in srcs)
    return f'<div class="strip" id="{sid}">{items}</div>'


# ---------- pages ----------
FAC = ['Secure, free parking', 'Braai facilities and a BBQ / picnic area', 'A welcoming bar and lounge',
       'On-site laundry service', 'A refreshing outdoor pool', 'Eden on the Grill restaurant',
       'Wi-Fi throughout the property', 'Kimberley Trampoline Park on site']

def two_up(left, right):
    """Reference two-up: narrow portrait photo (1/3) beside a wide photo (2/3), equal height."""
    def col(cls, title, sub, text, src, alt, href, label):
        return (f'<div class="{cls}"><a href="{href}" class="pq-pic"><span class="reveal settle">{img(src, alt, w=1280)}</span></a>'
                f'<div class="pq-txt rv"><h3><a href="{href}">{title}</a></h3><p class="pq-sub">{sub}</p><p>{text}</p>'
                f'<p class="pq-link"><a href="{href}">{label}</a></p></div></div>')
    return '<div class="pq-two">' + col('l', *left) + col('r', *right) + '</div>'

def home():
    c = f'''{hero(G(7), '', 'A delightful <em>dwelling</em>', 'Lodge, restaurant, conference centre and trampoline park in Kimberley, where comfort and luxury meet exceptional service.', full=True, cls='pq-hero')}
<section class="sec pq-s01" id="start"><div class="pq-wrap rv">
<span class="script">Welcome to Eden</span>
<p class="lead">Our lodge offers a relaxing stay with stylish accommodation for those seeking a peaceful retreat. Whether you are travelling for business or leisure, Eden is the perfect place to unwind, connect and enjoy.</p>
<p class="quote">&ldquo;Eden promises a memorable experience for all who visit.&rdquo;</p>
</div></section>
<section class="sec pq-feats" style="padding-top:0"><div class="pq-wrap">
{feature('Accommodation', 'The Lodge &middot; from R750 per room',
  'Superior rooms for two and family rooms for up to four, each with a king-size bed, DSTV, air conditioning, uncapped Wi-Fi and daily housekeeping. A peaceful home-away-from-home for travellers, families and business guests alike.',
  img(E('guest-reading-bed'), 'A guest relaxing in bed at Eden Lodge', w=1280),
  (ACC, 'Book Accommodation'), pq='season')}
{two_up(
  ('Eden on the Grill', 'Restaurant &amp; sports bar',
   'A fully stocked bar, a pool table and a menu of hearty grills, ribs and generous sharing platters. Relaxed and family-friendly, with the big game on screen and daily specials well worth asking about.',
   G(30), 'Loaded burger at Eden on the Grill', REST, 'View Menu'),
  ('Conferences &amp; Events', 'Three venues in Kimberley',
   'Live music in the Dynamic Hall, weddings and celebrations in the Reception Space, and focused meetings in the Professional Meeting Room, with audio-visual, catering and a dedicated team to look after every detail.',
   E('event-lounge'), 'A launch event in the lounge at Eden', CONF, 'Enquire on Availability'))}
{feature('Kimberley Trampoline Park', 'On the Eden grounds',
  'Bounce, play and celebrate. Jump sessions, birthday parties and group visits for the whole family, just a few steps from the lodge and the restaurant.',
  '<div class="logo-panel">' + img('/trampoline-park/assets/logo.png', 'Kimberley Trampoline Park', w=900) + '</div>',
  (TP, 'Book Jump Session'), pq='suites')}
</div></section>
{band(E('garden-dining-2'), 'Take refuge', 'In our greenery, <em>away from the crowds</em>', 'A sparkling pool, a braai area and quiet gardens to come back to at the end of the day.')}
<section class="sec find"><div class="wrap find-in">
<div class="find-txt rv"><h2>Finding Eden</h2><p class="sub">112 Landbou Road, South Ridge, Kimberley</p>
<p class="prose">Just 5km from Kimberley Airport and 3km from the Diamond Pavilion Mall, Eden is easy to reach and easy to settle into.</p>
<dl class="lines"><dt>Phone</dt><dd><a href="tel:{TEL}">{TEL_H}</a></dd><dt>WhatsApp</dt><dd><a href="{WA}">{TEL_H}</a></dd><dt>Email</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd><dt>Office</dt><dd>Mon – Fri, 9am – 4pm</dd><dt>Restaurant</dt><dd>Wed &amp; Thu 4pm – 9pm &middot; Fri &amp; Sat 12pm – 9pm</dd></dl>
<a class="btn" href="{MAP}" target="_blank" rel="noopener">Get Directions {ARROW}</a></div>
<div class="find-map rv d1"><iframe title="Map to Eden Lodge, 112 Landbou Road, Kimberley" src="{MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
</div></section>
{cta('Your stay awaits', 'Contact Eden today', 'Send us your dates and we will confirm availability, rates and anything else you need.', CON + '#enquire', 'Make an enquiry')}'''
    page(HOME, 'Eden Lodge, Restaurant &amp; Conference Centre in Kimberley',
         'Eden is a lodge, restaurant, conference centre and trampoline park in Kimberley offering comfortable accommodation to travellers, families, business people and contractors.',
         c, G(7))

def accommodation():
    sup = ['Choice of a luxurious king-size bed, or two &frac34; beds on request', 'Private bathroom', 'Uncapped Wi-Fi',
           'TV with DSTV', 'Air conditioning and ceiling fan', 'Comfortable sitting area and desk',
           'Bar fridge, coffee and tea facilities', 'Daily cleaning service']
    fam = ['A sleeping area with a king-size bed', 'A second area with two &frac34; beds and a corner lounge unit',
           'En-suite bathroom', 'Uncapped Wi-Fi', 'TV with DSTV', 'Air conditioning and ceiling fan',
           'Non-smoking, with a sitting area and desk', 'Bar fridge, coffee and tea facilities', 'Daily cleaning service']
    note = '<p class="note-box"><strong>Please note:</strong> children aged 0 – 18 are charged 100% of the sharing rate.</p>'
    price = '<p class="price"><small>Starting from</small>R750 per room</p>'
    c = f'''{hero(E('guest-reading-tray'), 'Accommodation in Kimberley', 'Your home <em>away from home</em>', 'An exceptional retreat for travellers, families and business professionals alike.')}
<section class="sec intro center" id="start"><div class="narrow rv">
<span class="script">Rest well</span>
<p class="lead">Our rooms are designed with your comfort in mind, with modern amenities for a truly relaxing, stress-free stay. Whether you are planning a short getaway or an extended stay, Eden Lodge is the perfect home-away-from-home.</p>
</div></section>
<section class="sec" style="padding-top:0"><div class="wrap">
{split(img(E('guest-coffee-bed'), 'A guest with coffee in a Superior room', w=1280), 'Up to 2 adults', 'Superior Rooms', '<p>Thoughtfully appointed to provide a peaceful escape. Each room includes:</p>' + ticks(sup) + price + note, (CON + '?kind=Accommodation#enquire', 'Book a Superior Room'))}
{split(img(E('room-bed-magazine'), 'Family room at Eden Lodge', w=1280), 'Up to 4 adults', 'Family Rooms', '<p>Versatile living spaces for families and larger groups. Each family room features:</p>' + ticks(fam) + price + note, (CON + '?kind=Accommodation#enquire', 'Book a Family Room'), rev=True)}
</div></section>
{band(G(22), 'Unwind', 'A pool, a braai and <em>space to breathe</em>')}
<section class="sec"><div class="wrap">
<div class="split"><div class="split-txt rv"><h2>Everything you need</h2><p class="sub">General facilities</p><p>Guests at Eden Lodge enjoy access to a host of on-site facilities designed to make your stay easy:</p>{ticks(FAC)}<p>Every detail is crafted to provide a refined and welcoming atmosphere, whether you are travelling alone, with family or on business.</p></div>
<div class="split-img rv d1">{img(E('playground'), 'The play area at Eden', w=1280)}</div></div>
</div></section>
<section class="sec mint tight"><div class="wrap">
<div class="head-row sec-head rv" style="margin-bottom:34px"><div><span class="eyebrow">The rooms</span><h2 class="h3">A closer look</h2></div><div class="strip-nav" data-strip="roomStrip"><button type="button" data-dir="prev" aria-label="Previous photos">&#8592;</button><button type="button" data-dir="next" aria-label="Next photos">&#8594;</button></div></div>
</div>{strip([E('room-tray'), E('guest-bed-plant'), E('bathroom-shelf'), E('guest-magazine'), E('coffee-station'), E('room-green-throw'), E('room-tray-close'), E('guest-coffee-bed')], 'roomStrip', 'rooms')}</section>
{cta('Book your stay', 'Reserve a room', 'Contact us to find out more about our accommodation or to make a booking.', CON + '?kind=Accommodation#enquire', 'Book Accommodation')}'''
    page(ACC, 'Accommodation in Kimberley | Eden Lodge',
         'Superior and family rooms at Eden Lodge in Kimberley from R750 per room: king-size beds, DSTV, air conditioning, uncapped Wi-Fi, pool and secure parking.', c, E('guest-reading-tray'))

def restaurant():
    c = f'''{hero(G(3), '', 'Good food, <em>good company</em>', 'A family-friendly restaurant and sports bar in the heart of Eden.')}
<section class="sec intro center" id="start"><div class="narrow rv">
<span class="script">Pull up a chair</span>
<p class="lead">Eden on the Grill is the perfect spot for a night out with friends or family. Catch up with friends, watch a game, or simply enjoy some good food, with a fully stocked bar and a pool table for any occasion.</p>
</div></section>
<section class="sec" style="padding-top:0" id="menu"><div class="wrap">
<div class="dine">
<div class="dine-pic"><div class="reveal">{img(G(21), 'Sharing platter at Eden on the Grill', w=1280)}</div></div>
<div class="dine-txt rv"><h2>Hearty grills &amp; platters</h2><p class="sub">Our menu &middot; daily specials</p>
<p>Ribs, wings, burgers and generous sharing platters, made to be enjoyed together, with a fully stocked bar, a pool table and the big game on screen. Be sure to ask about the daily specials.</p>
<a class="btn" href="{CON}?kind=Restaurant%20table#enquire">Reserve a Table {ARROW}</a></div>
<div class="dine-pic"><div class="reveal">{img(E('lounge-night'), 'The bar and lounge at Eden on the Grill', w=1280)}</div></div>
</div>
</div></section>
{band(E('patio-lights'), 'Outdoors', 'Dinner under <em>Kimberley skies</em>')}
<section class="sec"><div class="wrap"><div class="info">
<div class="rv"><h3>Restaurant hours</h3>{hours_dl()}</div>
<div class="rv d1"><h3>Reserve a table</h3><dl><dt>Phone</dt><dd><a href="tel:{TEL}">{TEL_H}</a></dd><dt>WhatsApp</dt><dd><a href="{WA}">{TEL_H}</a></dd><dt>Email</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></dl></div>
<div class="rv d2"><h3>112 Landbou Road</h3><p>South Ridge, Kimberley, 8301</p><a class="link" href="{MAP}" target="_blank" rel="noopener">Get directions</a></div>
</div></div></section>
{cta('See you soon', 'Book a table', 'Contact us for bookings or to find out more about our restaurant and menu.', CON + '?kind=Restaurant%20table#enquire', 'Book a Table')}'''
    page(REST, 'Eden on the Grill Restaurant | Kimberley',
         'Eden on the Grill: a family-friendly restaurant and sports bar in Kimberley with a fully stocked bar, pool table, grills and daily specials.', c, G(3))

def conferences():
    def venue(n, title, sub, text, pics, rev=False):
        ph = ''.join(img(p, f'{title}', w=1280 if i == 0 else 640) for i, p in enumerate(pics))
        return f'''<div class="venue{' rev' if rev else ''}">
<div class="venue-img{' one' if len(pics) == 1 else ''} rv">{ph}</div>
<div class="rv d1"><span class="num">Room {n}</span><h3>{title}</h3><p class="eyebrow" style="margin-bottom:16px">{sub}</p><p>{text}</p></div>
</div>'''
    c = f'''{hero('/uploads/Room1c.jpg', 'Conference &amp; function venues', 'Where every event <em>becomes memorable</em>', 'Versatile spaces, modern amenities and attentive service in Kimberley.')}
<section class="sec intro center" id="start"><div class="narrow rv">
<span class="script">Gather at Eden</span>
<p class="lead">Perfectly situated for local and international guests, just 5km from Kimberley Airport and 3km from the Diamond Pavilion Mall. Whether you are planning a corporate conference, a wedding reception or a live music event, Eden has the space for it.</p>
</div></section>
<section class="sec" style="padding-top:0"><div class="wrap">
<div class="sec-head center rv"><span class="eyebrow">Our signature venues</span><h2 class="h2">Three rooms, every occasion</h2></div>
{venue(1, 'The Dynamic Hall', 'Live music &middot; large events', 'Ideal for live music performances and large-scale events, Room 1 offers a spacious, adaptable layout that encourages interaction and enjoyment. Equipped with audio-visual technology and complemented by comprehensive catering, it transforms effortlessly for corporate functions, private parties or entertainment events.', ['/uploads/Room1b.jpg', '/uploads/Room1a.jpg', '/uploads/Room1d.jpg'])}
{venue(2, 'The Elegant Reception Space', 'Weddings &middot; celebrations', 'Perfect for weddings, family celebrations or business gatherings, Room 2 provides a sophisticated setting with expansive interiors and modern audio and video systems. From custom décor to tailored catering, every detail is designed to create a warm and memorable atmosphere.', ['/uploads/Room2a.jpg', '/uploads/Room2b.jpg', G(4)], rev=True)}
{venue(3, 'The Professional Meeting Room', 'Meetings &middot; workshops', 'Designed with productivity in mind, Room 3 is the space for business meetings, presentations and workshops. Its modern design and technology ensure a distraction-free environment, with our technical team on hand for anything you need.', ['/uploads/Room3a.jpg', G(28)])}
</div></section>
{band(E('lounge-night-2'), 'Style &amp; service', 'The perfect blend of <em>style and function</em>')}
<section class="sec"><div class="wrap">
<div class="sec-head center rv"><span class="eyebrow">Included</span><h2 class="h3">Everything for a seamless event</h2></div>
<div class="feats">
<div class="feat rv"><span class="num">01</span><h3>Audio-visual</h3><p>Modern sound, projection and video systems in every venue.</p></div>
<div class="feat rv d1"><span class="num">02</span><h3>Catering</h3><p>Tailored menus from our own kitchen, from coffee breaks to banquets.</p></div>
<div class="feat rv d2"><span class="num">03</span><h3>Support</h3><p>A dedicated team on hand to help set up and run your day.</p></div>
<div class="feat rv"><span class="num">04</span><h3>Accommodation</h3><p>Rooms on site for delegates, speakers and wedding guests.</p></div>
<div class="feat rv d1"><span class="num">05</span><h3>Parking</h3><p>Secure, free parking for all your guests.</p></div>
<div class="feat rv d2"><span class="num">06</span><h3>Location</h3><p>5km from Kimberley Airport and 3km from the Diamond Pavilion Mall.</p></div>
</div></div></section>
{cta('Plan your event', 'Enquire on availability', 'Contact us to find out more about our venues or to make a booking.', CON + '?kind=Conference%20or%20event#enquire', 'Enquire on Availability')}'''
    page(CONF, 'Conference &amp; Function Venues in Kimberley | Eden',
         'Three conference and function venues in Kimberley for conferences, weddings, live music and meetings, with audio-visual, catering and accommodation on site.', c, '/uploads/Room1c.jpg')

GALLERY = [
    ('lodge', 'The Lodge', 'Rest &amp; unwind', [E(n) for n in ('chalets', 'guest-reading-bed', 'room-green-throw', 'guest-bed-plant', 'room-tray', 'guest-coffee-bed', 'bathroom-shelf', 'guest-reading-tray', 'room-green-throw-2', 'guest-magazine', 'coffee-station', 'room-bed-magazine', 'room-tray-close', 'chalets-2', 'chalets-pool', 'chalets-row')]),
    ('dining', 'Dining &amp; Bar', 'Eden on the Grill', [E(n) for n in ('lounge-night-2', 'patio-lights')] + [G(n) for n in (30, 21, 15)] + [E(n) for n in ('lounge-night', 'garden-dining-2', 'patio-lights-2')] + [G(n) for n in (1, 9, 10, 26)] + [E(n) for n in ('garden-dining', 'garden-night', 'garden-dining-3')] + [G(n) for n in (2, 3, 29)]),
    ('events', 'Events', 'Conferences &amp; celebrations', ['/uploads/Room1b.jpg', G(4), E('event-lounge'), '/uploads/Room1c.jpg', '/uploads/Room2a.jpg', '/uploads/Room1a.jpg', '/uploads/Room2b.jpg', '/uploads/Room1d.jpg', '/uploads/Room3a.jpg', G(28)]),
    ('outdoors', 'Outdoors &amp; Play', 'Pool, gardens &amp; play area', [E(n) for n in ('entrance-night-2', 'play-trampoline-night')] + [G(n) for n in (7, 22, 16)] + [E(n) for n in ('playground', 'play-night', 'entrance-night')] + [G(n) for n in (35, 12, 41)]),
]

def gallery():
    nav = ''.join(f'<a href="#{k}">{t}</a>' for k, t, _, _ in GALLERY)
    groups = ''
    for k, t, sub, srcs in GALLERY:
        tiles = ''.join(f'<a href="{p}" data-lb="{k}" class="rv">{img(p, t.replace("&amp;", "and") + " at Eden", w=900)}</a>' for p in srcs)
        groups += f'''<div class="gal-group" id="{k}"><div class="head-row rv"><div><span class="eyebrow">{sub}</span><h2 class="h3">{t}</h2></div><span class="count">{len(srcs)} photos</span></div>
<div class="masonry">{tiles}</div></div>'''
    c = f'''{hero(E('guest-bed-plant'), 'Photo gallery', 'Moments <em>at Eden</em>', 'The lodge, the restaurant, the venues and the gardens.')}
<nav class="gal-nav" id="start" aria-label="Gallery sections">{nav}</nav>
<section class="sec"><div class="wrap">{groups}</div></section>
{cta('Come and see', 'Experience Eden in person', 'We would love to welcome you. Get in touch to plan your stay, meal or event.', CON + '#enquire', 'Make an enquiry')}'''
    page(GAL, 'Photo Gallery | Eden Lodge, Restaurant &amp; Conference Centre',
         'Photos of Eden Lodge, Eden on the Grill restaurant, the conference venues and gardens in Kimberley.', c, E('guest-bed-plant'))

def contact():
    c = f'''{hero(E('entrance-night-2'), 'Contact us', 'We look forward <em>to welcoming you</em>', 'Eden Lodge, Restaurant and Conference Centre, Kimberley.', cue=False)}
<section class="sec" id="start"><div class="wrap"><div class="info">
<div class="rv"><span class="eyebrow">Contact details</span><h3>Talk to us</h3><dl><dt>Telephone</dt><dd><a href="tel:{TEL}">{TEL_H}</a></dd><dt>WhatsApp</dt><dd><a href="{WA}">{TEL_H}</a></dd><dt>Email</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></dl></div>
<div class="rv d1"><span class="eyebrow">Hours</span><h3>When to find us</h3><dl><dt>Office</dt><dd>Mon – Fri, 9am – 4pm</dd></dl><p style="margin:14px 0 6px;color:var(--ink)">Restaurant</p>{hours_dl()}</div>
<div class="rv d2"><span class="eyebrow">Physical address</span><h3>112 Landbou Road</h3><p>South Ridge, Kimberley, 8301<br>South Africa</p><a class="link" href="{MAP}" target="_blank" rel="noopener">Get directions</a></div>
</div></div></section>
<section class="sec mint" id="enquire"><div class="wrap">
<div class="split"><div class="split-txt rv"><span class="script">Let us contact you</span><h2>Send an enquiry</h2><span class="rule"></span><p>Share a few details and our team will get back to you to confirm availability and rates.</p><p>Prefer to chat? <a class="link" href="{WA}">WhatsApp us</a></p></div>
<form id="enquiryForm" class="rv d1" novalidate>
<input type="hidden" name="_subject" value="Website enquiry - Eden Lodge, Restaurant and Conference Centre">
<input type="hidden" name="_template" value="table">
<input type="hidden" name="_captcha" value="false">
<label class="hp" aria-hidden="true">Leave empty<input type="text" name="_honey" tabindex="-1" autocomplete="off"></label>
<div class="row2"><label class="field"><span>Your name *</span><input name="Name" required maxlength="80" autocomplete="name"></label><label class="field"><span>Telephone *</span><input name="Telephone" type="tel" required maxlength="40" autocomplete="tel"></label></div>
<div class="row2"><label class="field"><span>Email *</span><input name="email" type="email" required maxlength="125" autocomplete="email"></label><label class="field"><span>City / Town *</span><input name="City/Town" required maxlength="125" autocomplete="address-level2"></label></div>
<div class="row2"><label class="field"><span>Enquiry about</span><select name="kind"><option>Accommodation</option><option>Restaurant table</option><option>Conference or event</option><option>Trampoline Park</option><option>Something else</option></select></label><label class="field"><span>Guests</span><select name="guests"><option></option><option>1</option><option>2</option><option>3</option><option>4</option><option>5 – 10</option><option>10 – 50</option><option>50+</option></select></label></div>
<div class="row2"><label class="field"><span>Arrival / date</span><input type="date" name="arrive"></label><label class="field"><span>Departure</span><input type="date" name="depart"></label></div>
<label class="field"><span>Your enquiry</span><textarea name="Enquiry" maxlength="2000"></textarea></label>
<button class="btn solid" type="submit">Submit enquiry {ARROW}</button>
<p class="form-msg" role="status" aria-live="polite"></p>
</form></div>
</div></section>
<iframe class="map" title="Map to Eden Lodge, 112 Landbou Road, Kimberley" src="{MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>'''
    page(CON, 'Contact Eden Lodge, Restaurant &amp; Conference Centre | Kimberley',
         'Contact Eden in Kimberley: +27 60 333 9333, WhatsApp or contact@welcometoeden.co.za. 112 Landbou Rd, South Ridge, Kimberley.', c, E('entrance-night-2'))

def legal(path, title, src):
    body = open(src, encoding='utf8').read()
    body = re.sub(r'<h1>.*?</h1>', '', body, flags=re.S)
    body = re.sub(r'(<h3>)\s*(<br\s*/?>\s*)+', r'\1', body)
    body = re.sub(r'(\s*<br\s*/?>\s*(&nbsp;)?\s*)+</h3>', '</h3>', body)
    body = re.sub(r'<p>\s*<br\s*/?>\s*', '<p>', body)
    c = f'''<section class="sec" style="padding-top:clamp(140px,16vw,200px)"><div class="narrow legal">
<span class="eyebrow">Eden Est.</span><h1 class="h2">{title}</h1><span class="rule"></span>
{body}
</div></section>'''
    page(path, f'{title} | Eden Guest House and Conference Centre', f'{title} for Eden Guest House and Conference Centre, Kimberley.', c, plain=True)


if __name__ == '__main__':
    pol = os.path.join(os.path.dirname(__file__), 'policies')
    home(); accommodation(); restaurant(); conferences(); gallery(); contact()
    legal(PRIV, 'Privacy Policy', os.path.join(pol, 'privacy.html'))
    legal(COOK, 'Cookie Policy', os.path.join(pol, 'cookie.html'))
