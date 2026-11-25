"""Scroll through the built site in Chrome and screenshot every section at the three review sizes."""
import asyncio, sys, subprocess, os, time
from playwright.async_api import async_playwright

DIST = '/home/claude/mm/site/dist'
OUT = '/home/claude/mm/shots/' + (sys.argv[1] if len(sys.argv) > 1 else 'r1')
os.makedirs(OUT, exist_ok=True)
SIZES = [(1440, 900, 'd'), (1280, 800, 'l'), (390, 844, 'm')]
if len(sys.argv) > 2: SIZES = [s for s in SIZES if s[2] in sys.argv[2]]
# (name, selector, fraction through the element's scroll range)
PLAN = [('01-hero', '.hero', 0), ('02-taxi-a', '.taxi', 0.05), ('03-taxi-b', '.taxi', 0.45), ('04-taxi-c', '.taxi', 0.95),
        ('05-about', '.about-head', -0.15), ('06-grow-a', '.about .grow', 0.1), ('07-grow-b', '.about .grow', 0.5), ('08-grow-c', '.about .grow', 1),
        ('09-how', '.how', -0.05), ('10-step1', '.steps', 0.1), ('11-step2', '.steps', 0.35), ('12-step3', '.steps', 0.6), ('13-step4', '.steps', 0.9),
        ('14-close', '.close-grid', -0.25), ('15-close-b', '.close-grid', 0.5), ('16-why', '.why', 0), ('17-why-route', '.why .idea:nth-child(1)', 0.3),
        ('18-why-pair', '.why .idea:nth-child(2)', 0.3), ('19-why-faces', '.why .idea:nth-child(3)', 0.3), ('20-why-print', '.why .idea:nth-child(4)', 0.3),
        ('21-const', '.constellation', 0.35), ('22-cov-a', '.coverage .grow', 0.15), ('23-cov-b', '.coverage .grow', 1),
        ('24-who', '.who-intro', 0), ('25-s1', '.scene:nth-child(1)', 0), ('26-s2', '.scene:nth-child(2)', 0), ('27-s3', '.scene:nth-child(3)', 0),
        ('28-s4', '.scene:nth-child(4)', 0), ('29-s5', '.scene:nth-child(5)', 0), ('30-contact', '.contact', 0), ('31-contact-b', '.contact', 0.6), ('32-footer', '.foot', 1)]

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
                for name, sel, f in PLAN:
                    y = await pg.evaluate(JS_POS, [sel, f])
                    await pg.evaluate(f'window.scrollTo(0, {int(y)})')
                    await pg.wait_for_timeout(1300)
                    await pg.screenshot(path=f'{OUT}/{tag}-{name}.jpg', quality=70, type='jpeg')
                if errs: print(tag, 'ERRORS', errs[:5])
                await ctx.close()
            await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
print('done', OUT)
