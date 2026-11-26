"""Write site/index.html: every section as static HTML, so the page reads and paints before any script."""
import json, re
R = json.load(open('/home/claude/mm/tk/export-report.json'))
SVG = lambda n: open(f'/home/claude/mm/master/movemedia-{n}.svg').read().split('?>')[-1].replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)


def widths(name):
    return sorted(int(k.rsplit('-', 1)[1]) for k in R if k.rsplit('-', 1)[0] == name)


def srcset(name, ext):
    return ', '.join(f'./src/img/{name}-{w}.{ext} {w}w' for w in widths(name))


def pic(name, alt, sizes='100vw', tall=None, cls='', eager=False, pos=None):
    ws = widths(name); w = ws[-1]; h = R[f'{name}-{w}'][0]
    src = []
    if tall:
        for ext in ('avif', 'webp'):
            src.append(f'<source media="(max-width: 700px) and (orientation: portrait)" type="image/{ext}" srcset="{srcset(tall, ext)}" sizes="100vw">')
    for ext in ('avif', 'webp'):
        src.append(f'<source type="image/{ext}" srcset="{srcset(name, ext)}" sizes="{sizes}">')
    fb = f'./src/img/{name}-{ws[len(ws) // 2]}.webp'
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    st = f' style="object-position:{pos}"' if pos else ''
    return f'<picture class="{cls}">{"".join(src)}<img src="{fb}" width="{w}" height="{h}" alt="{alt}" {load}{st}></picture>'


ARROW = '<svg class="arr" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'
NAV = [('About', '#about'), ('How it works', '#how'), ('Coverage', '#coverage'), ('Who it is for', '#who'), ('Contact', '#contact')]
PH = {'email': 'Email address to be added', 'phone': 'Phone or WhatsApp number to be added', 'insta': 'Instagram account to be added'}

STEPS = [
    ('Your advertisement comes to us.', 'You send us the advertisement you would like to run on the screens.'),
    ('It joins the 10-second loop.', 'Advertisements run as 10-second spots in a repeating loop, so yours returns to the screen regularly throughout the day.'),
    ('It plays across the fleet.', 'The same loop runs on taxi roofs across the city, on screens that face both sides of the road.'),
    ('Your brand travels the city.', 'The taxis carry your advertisement through the streets all day, past people walking, waiting and driving.'),
]
WHO = [
    ('Brands', 'Keep your name in front of the city, on screens that travel all day.', 'roof-logo', '50% 72%'),
    ('Retailers', 'Show your shops and new arrivals on the streets around them.', 'downtown', '50% 62%'),
    ('Restaurants and cafes', 'Show your menu and your address to people out in the city.', 'skyline-dusk', '50% 60%'),
    ('Events', 'Announce the date and the place to the whole city before the day.', 'VIDEO', None),
    ('Launches and campaigns', 'Give a new product or campaign a presence across the city from its first day.', 'taxi-wide', '46% 45%'),
]
FLEET = json.load(open('/home/claude/mm/tk/fleet.json'))
ROUTE = {'d': [0, 10, 7, 14, 5], 'm': [0, 9, 7, 12, 6]}   # indices into FLEET: from the screen's taxi towards the port


def curve(pts):
    """Smooth path through points (Catmull-Rom to cubic Bezier), in a 0..100 viewBox."""
    d = f'M{pts[0][0]} {pts[0][1]}'
    for i in range(len(pts) - 1):
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]} {p2[1]}'
    return d


def city_layer(v):
    pts = FLEET[v]
    dots = ''.join(f'<i style="left:{x}%;top:{y}%"></i>' for x, y in pts[1:])
    path = curve([pts[i] for i in ROUTE[v]])
    return (f'<div class="fleet fleet-{v}" data-target="{pts[0][0]},{pts[0][1]}">{dots}'
            f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="trail" pathLength="1" d="{path}"/></svg>'
            f'<span class="taxi-light"></span></div>')


def who(i, w):
    n, x, img, pos = w
    if img == 'VIDEO':
        media = ('<div class="vid" data-video>'
                 f'{pic("traffic-poster", "", "(max-width:860px) 70vw, 24vw")}'
                 '<video muted loop playsinline preload="none" aria-hidden="true"></video></div>')
    else:
        media = pic(img, '', '(max-width:860px) 70vw, 24vw', pos=pos)
    return (f'<li class="who-row" tabindex="0"><h3 class="who-name">{n}</h3><p class="who-line">{x}</p>'
            f'<div class="who-pic" aria-hidden="true">{media}</div></li>')


html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Move Media · Digital advertising on the move</title>
<meta name="description" content="Move Media places double-sided digital LED screens on the roofs of taxis in Lebanon. Your advertisement travels through the city all day.">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#FF5A1F">
<link rel="preload" href="./src/fonts/InterDisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="./src/fonts/InterDisplay-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" type="image/avif" imagesrcset="{srcset("beirut-night", "avif")}" imagesizes="100vw" media="(min-width: 701px), (orientation: landscape)">
<link rel="preload" as="image" type="image/avif" imagesrcset="{srcset("beirut-night-tall", "avif")}" imagesizes="100vw" media="(max-width: 700px) and (orientation: portrait)">
<script>document.documentElement.classList.add('js');</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<div class="loader" aria-hidden="true"><div class="loader-mark">{SVG("symbol-orange")}</div><p class="loader-n"><span data-pct>0</span></p></div>

<header class="bar" data-bar>
  <a class="bar-logo" href="#top" aria-label="Move Media, back to the top"><span class="on-dark">{SVG("horizontal-colour-on-dark")}</span><span class="on-light">{SVG("horizontal-colour")}</span></a>
  <nav class="bar-nav" aria-label="Main"><button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-open>Menu</button><a href="#contact">Contact</a></nav>
</header>

<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="menu-top"><span class="menu-logo">{SVG("horizontal-colour-on-dark")}</span><button class="menu-close" type="button" data-menu-close>Close</button></div>
  <ul class="menu-links">{"".join(f'<li><a href="{h}">{n}</a></li>' for n, h in NAV)}</ul>
  <div class="menu-foot"><p>{PH["email"]}</p><p>{PH["phone"]}</p><p>{PH["insta"]}</p></div>
</div>

<main id="main" tabindex="-1">
<section class="hero" id="top" data-theme="dark">
  <div class="hero-media"><div class="drift">{pic("beirut-night", "Beirut at night, seen from the hills, with the port lit on the right.", tall="beirut-night-tall", eager=True, pos="100% 50%")}</div></div>
  <div class="hero-text"><h1>Digital advertising<br>on the move.</h1></div>
  <p class="hero-cue">Scroll down<i aria-hidden="true"></i></p>
</section>

<section class="taxi" data-theme="dark" aria-label="On the roof of a taxi">
  <div class="taxi-pin">
    <div class="taxi-frame f1">{pic("taxi-wide", "A taxi at night with a Move Media screen on its roof.", tall="taxi-tall")}</div>
    <div class="taxi-frame f2">{pic("roof-logo", "Close to the roof: the Move Media screen, lit.", tall="roof-logo-tall")}</div>
    <div class="taxi-text t1"><h2>On the roof of a taxi</h2><p>A double-sided digital screen that travels through the city all day.</p></div>
    <div class="taxi-text t2"><h2>Two faces, one on each side</h2><p>Seen at street level from both sides of the road.</p></div>
  </div>
</section>

<section class="about light" id="about" data-theme="light">
  <div class="wrap about-head">
    <p class="label">About</p>
    <h2 class="display">Move Media is a Lebanese advertising company.</h2>
    <p class="statement">We place double-sided digital LED screens on the roofs of taxis. Brands book space on the screens, and their advertisements travel through the city all day, seen by people on the street, in traffic and on the pavement.</p>
  </div>
  <div class="grow" data-grow data-from="0.62,0.42" data-from-m="0.84,0.36" data-shift="-0.21" data-shift-m="-0.15"><div class="grow-pin"><div class="grow-frame"><div class="grow-inner">{pic("roof-tag", "The rooftop screen showing the line: Digital advertising on the move.", tall="roof-tag-tall")}</div></div></div></div>
</section>

<section class="how" id="how" data-theme="dark" aria-labelledby="how-h">
  <div class="how-stage">
    <div class="how-city" aria-hidden="true"><div class="how-box city-box">{pic("beirut-night", "", tall="beirut-night-tall")}{city_layer("d")}{city_layer("m")}</div></div>
    <div class="how-shot" aria-hidden="true"><div class="how-box shot-box">
      <div class="shots">{pic("roof-text", "", tall="roof-text-tall", cls="on")}{pic("roof-logo", "", tall="roof-logo-tall")}{pic("roof-tag", "", tall="roof-tag-tall")}</div>
      <div class="panel"><i class="wipe"></i></div>
    </div></div>
    <div class="how-head"><h2 id="how-h" class="how-title">How it works</h2></div>
    <div class="how-bar" aria-hidden="true"><span><i></i></span><span><i></i></span><span><i></i></span><span><i></i></span></div>
    <ol class="how-copy">{"".join(f'<li class="how-item"><span class="how-num" aria-hidden="true">{i + 1}</span><div class="how-step"><h3>{t}</h3><p>{x}</p></div></li>' for i, (t, x) in enumerate(STEPS))}</ol>
    <div class="how-timer" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/><circle class="t" cx="32" cy="32" r="30" pathLength="1"/></svg><span class="how-sec">10</span><span class="how-unit">seconds</span></div>
  </div>
</section>

<section class="close" data-theme="dark" aria-labelledby="close-h">
  <div class="wrap close-head"><p class="label">Up close</p><h2 class="display" id="close-h">The screen, in detail.</h2></div>
  <div class="close-grid wrap">
    <figure class="c1" data-speed="-0.025">{pic("led-pixels", "Close-up of the LED pixels, lit orange.", "(max-width:700px) 92vw, 44vw")}<figcaption>Bright by day and by night.</figcaption></figure>
    <figure class="c2" data-speed="0.03">{pic("screen-face", "One face of the rooftop screen, showing the Move Media logo.", "(max-width:700px) 80vw, 34vw")}<figcaption>Each side can show the same advertisement or a different one.</figcaption></figure>
    <figure class="c3" data-speed="-0.015">{pic("led-rake", "The LED surface at a raking angle.", "(max-width:700px) 70vw, 30vw")}<figcaption>Advertisements change quickly, with nothing to print.</figcaption></figure>
    <figure class="c4" data-speed="0.03">{pic("roof-light", "The lit screen and its reflection on the roof of the taxi.", "(max-width:700px) 80vw, 40vw")}<figcaption>Seen at street level from both sides of the road.</figcaption></figure>
  </div>
</section>

<section class="why light" id="why" data-theme="light">
  <div class="wrap"><p class="label">Why taxi tops</p><h2 class="display">Four reasons the roof of a taxi works.</h2></div>
  <div class="wrap why-list">
    <article class="idea"><div class="idea-text"><h3>It goes where people are.</h3><p>The advertisement moves with the taxi, through the streets where people walk, shop and wait in traffic.</p></div>
      <figure class="idea-fig route"><svg viewBox="0 0 600 380" role="img" aria-label="Diagram: one taxi's route through a grid of streets."><g class="grid">{"".join(f'<line x1="{x}" y1="20" x2="{x}" y2="360"/>' for x in range(40, 600, 76))}{"".join(f'<line x1="20" y1="{y}" x2="580" y2="{y}"/>' for y in range(40, 380, 64))}</g><path class="route-line" pathLength="1" d="M40 360 V296 H192 V232 H344 V104 H496 V40 H572"/><circle class="route-end" cx="572" cy="40" r="5"/><circle class="route-start" cx="40" cy="360" r="5"/></svg><figcaption>One taxi, one day: the advertisement passes every street on its route.</figcaption></figure></article>
    <article class="idea"><div class="idea-text"><h3>Bright by day and by night.</h3><p>The screens stay clear in full sun and after dark, so the advertisement is seen at every hour.</p></div>
      <div class="idea-fig pair"><figure>{pic("downtown", "A Beirut street at midday.", "(max-width:700px) 46vw, 24vw")}</figure><figure>{pic("beirut-night-crop", "Beirut at night.", "(max-width:700px) 46vw, 24vw")}</figure></div></article>
    <article class="idea"><div class="idea-text"><h3>Seen from both sides of the road.</h3><p>Each screen has two faces, seen at street level from either side. Each side can show the same advertisement or a different one.</p></div>
      <figure class="idea-fig faces"><svg viewBox="0 0 600 340" role="img" aria-label="Diagram seen from above: a taxi in the road with its two screen faces, one towards each pavement."><line class="kerb" x1="20" y1="60" x2="580" y2="60"/><line class="kerb" x1="20" y1="280" x2="580" y2="280"/><line class="lane" x1="20" y1="170" x2="580" y2="170"/><rect class="car" x="210" y="136" width="180" height="68" rx="20"/><rect class="scr" x="250" y="160" width="100" height="20"/><line class="face" x1="250" y1="160" x2="350" y2="160"/><line class="face" x1="250" y1="180" x2="350" y2="180"/><path class="look" d="M300 150 V78 M292 88 L300 76 L308 88"/><path class="look" d="M300 190 V262 M292 252 L300 264 L308 252"/><text x="300" y="44">Pavement, one side</text><text x="300" y="312">Pavement, other side</text></svg><figcaption>Seen from above: one face towards each pavement.</figcaption></figure></article>
    <article class="idea"><div class="idea-text"><h3>Nothing to print.</h3><p>Advertisements change quickly on the screens, with nothing to print and nothing to install.</p></div>
      <div class="idea-fig loop" data-clock>{pic("roof-text", "The rooftop screen showing: Your brand, across the city.", "(max-width:700px) 92vw, 48vw", cls="on")}{pic("roof-tag", "The rooftop screen showing: Digital advertising on the move.", "(max-width:700px) 92vw, 48vw")}</div></article>
  </div>
</section>

<section class="coverage" id="coverage" data-theme="dark">
  <div class="constellation" data-constellation>
    <h2 class="display">Coverage</h2>
    <p class="const-text">At launch, the fleet covers Beirut, Matn and Keserwan.</p>
    <figure class="k k1" data-k="-1,-1">{pic("jounieh", "The bay seen from the hills, by day.", "(max-width:700px) 40vw, 22vw")}</figure>
    <figure class="k k2" data-k="1,-0.6">{pic("skyline-dusk", "The Beirut skyline at dusk.", "(max-width:700px) 44vw, 24vw")}</figure>
    <figure class="k k3" data-k="-0.8,1">{pic("downtown", "A street in central Beirut.", "(max-width:700px) 30vw, 14vw")}</figure>
    <figure class="k k4" data-k="1,1">{pic("beirut-night-crop", "Beirut at night.", "(max-width:700px) 34vw, 16vw")}</figure>
  </div>
  <div class="grow" data-grow><div class="grow-pin"><div class="grow-frame"><div class="grow-inner">{pic("beirut-aerial", "Beirut from the air, by day.")}</div></div>
    <div class="figures"><p><strong>Up to 300</strong><span>taxis in the launch fleet</span><em class="ph">Placeholder, to be confirmed</em></p><p><strong>January 2027</strong><span>launch date</span><em class="ph">Placeholder, to be confirmed</em></p></div></div></div>
</section>

<section class="who" id="who" data-theme="dark" aria-labelledby="who-h">
  <div class="wrap"><p class="label">Who it is for</p><h2 class="display" id="who-h">For anyone who wants to be seen across the city.</h2>
  <ul class="who-list">{"".join(who(i, w) for i, w in enumerate(WHO))}</ul></div>
</section>

<section class="contact light" id="contact" data-theme="light">
  <div class="wrap contact-grid">
    <div class="contact-text">
      <p class="label">Contact</p>
      <h2 class="display">Tell us about your campaign.</h2>
      <p class="lead">Send us a few details and we will get back to you.</p>
      <form class="form" novalidate data-form>
        <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required><p class="err" id="e-name"></p></div>
        <div class="field"><label for="f-company">Company <span class="opt">(optional)</span></label><input id="f-company" name="company" autocomplete="organization"></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required><p class="err" id="e-email"></p></div>
        <div class="field"><label for="f-msg">About your campaign</label><textarea id="f-msg" name="message" rows="4" required></textarea><p class="err" id="e-msg"></p></div>
        <div class="actions"><button class="btn" type="submit">Open in email app {ARROW}</button><button class="btn ghost" type="button" data-copy>Copy message</button></div>
        <p class="status" role="status" aria-live="polite"></p>
      </form>
      <ul class="contact-ph"><li>{PH["email"]}</li><li>{PH["phone"]}</li><li>{PH["insta"]}</li></ul>
    </div>
    <figure class="contact-fig">{pic("roof-logo-tall", "The Move Media screen on the roof of a taxi at night.", "(max-width:900px) 100vw, 46vw", pos="50% 66%")}</figure>
  </div>
</section>
</main>

<footer class="foot" data-theme="dark">
  <div class="foot-media"><div class="foot-inner">{pic("beirut-night", "", tall="beirut-night-tall", pos="100% 50%")}</div></div>
  <div class="foot-mark">{SVG("symbol-orange")}</div>
  <div class="foot-body">
    <div class="foot-row">
      <p class="foot-tag">Digital advertising<br>on the move.</p>
      <ul class="foot-links">{"".join(f'<li><a href="{h}">{n}</a></li>' for n, h in NAV)}</ul>
      <ul class="foot-ph"><li>{PH["email"]}</li><li>{PH["phone"]}</li><li>{PH["insta"]}</li></ul>
    </div>
    <div class="foot-base"><p>© 2026 Move Media. All rights reserved.</p><p>A Lebanese advertising company.</p></div>
  </div>
</footer>
<script type="module" src="./src/main.js"></script>
</body>
</html>
'''
# master SVGs carry their own <title>; inside links and decorative spots they would be read twice
head, body = html.split('</head>', 1)
html = head + '</head>' + re.sub(r'<title>[^<]*</title>', '', body)
open('/home/claude/move-media-website/index.html', 'w').write(html)
print('written', len(html))
