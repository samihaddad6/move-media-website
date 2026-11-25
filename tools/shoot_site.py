"""Scroll through the built site in Chrome and screenshot every section at the three review sizes."""
import asyncio, sys, subprocess, os, time
from playwright.async_api import async_playwright

DIST = '/home/claude/move-media-website/dist'
OUT = '/home/claude/mm/shots/' + (sys.argv[1] if len(sys.argv) > 1 else 'r1')
os.makedirs(OUT, exist_ok=True)
SIZES = [(1440, 900, 'd'), (1280, 800, 'l'), (390, 844, 'm'), (1024, 768, 's'), (375, 812, 'p')]
if len(sys.argv) > 2: SIZES = [s for s in SIZES if s[2] in sys.argv[2]]
# (name, selector, fraction through the element's scroll range)
PLAN = [('01-hero', '.hero', 0), ('02-hero-fade', '.taxi', -0.7), ('03-hero-to-taxi', '.taxi', -0.45),
        ('04-taxi-a', '.taxi', 0.1), ('05-taxi-b', '.taxi', 0.4), ('06-taxi-dip', '.taxi', 0.47), ('07-taxi-c', '.taxi', 0.53), ('08-taxi-d', '.taxi', 0.9),
        ('09-taxi-to-about', '.about', -0.5), ('10-about', '.about-head', 0.0), ('11-grow-a', '.about .grow', 0.0), ('12-grow-b', '.about .grow', 0.45), ('13-grow-c', '.about .grow', 0.95),
        ('14-step1', '.steps', 0.05), ('15-step1b', '.steps', 0.2), ('16-step-switch', '.steps', 0.248), ('17-step2', '.steps', 0.4), ('18-step3', '.steps', 0.62), ('19-step3-4', '.steps', 0.745), ('20-step4', '.steps', 0.9),
        ('21-close', '.close-grid', -0.3), ('22-close-b', '.close-grid', 0.3), ('23-close-to-why', '.why', -0.5), ('24-why-route', '.why .idea:nth-child(1)', 0.2),
        ('25-why-faces', '.why .idea:nth-child(3)', 0.2), ('26-why-print', '.why .idea:nth-child(4)', 0.3), ('27-why-to-cov', '.coverage', -0.5), ('28-const', '.constellation', 0.3),
        ('29-cov-a', '.coverage .grow', 0.02), ('30-cov-b', '.coverage .grow', 0.5), ('31-cov-c', '.coverage .grow', 1),
        ('32-s1', '.scene:nth-child(1)', 0), ('33-s1-2', '.scene:nth-child(2)', -0.5), ('34-s2', '.scene:nth-child(2)', 0), ('35-s4', '.scene:nth-child(4)', 0), ('36-s4-5', '.scene:nth-child(5)', -0.3),
        ('37-contact', '.contact', 0), ('38-contact-b', '.contact', 0.55), ('39-footer', '.foot', 1)]

JS_POS = """([sel, f]) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const top = r.top + scrollY;
  const range = Math.max(0, el.offsetHeight - innerHeight); return f >= 0 ? top + range * f : top + innerHeight * f; }"""


async def main():
    srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '-d', DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
            for w, h, tag in SIZES:
                mob = tag == 'm'
                ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
                pg = await ctx.new_page()
                errs = []
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(2600)
                plan = PLAN[::-1] if os.environ.get('REVERSE') else PLAN
                if os.environ.get('REVERSE'):
                    await pg.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)'); await pg.wait_for_timeout(1500)
                for name, sel, f in plan:
                    y = await pg.evaluate(JS_POS, [sel, f])
                    await pg.evaluate(f'window.scrollTo(0, {int(y)})')
                    await pg.wait_for_timeout(1300)
                    await pg.screenshot(path=f'{OUT}/{tag}-{name}.jpg', quality=70, type='jpeg')
                    if name in ('37-contact', '30-cov-b', '24-why-route'):
                        await pg.evaluate(f'window.scrollTo(0, {int(y) - 140})'); await pg.wait_for_timeout(1100)
                        await pg.screenshot(path=f'{OUT}/{tag}-{name}-up.jpg', quality=70, type='jpeg')
                if errs: print(tag, 'ERRORS', errs[:5])
                await ctx.close()
            await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
print('done', OUT)
