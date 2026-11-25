"""Click, keyboard and form checks for the v3 fix brief (P0-1, P0-2), in Chrome at 1024 x 768."""
import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright

DIST = '/home/claude/move-media-website/dist'
W, H, MOB = (375, 812, True) if 'm' in sys.argv[1:] else (1024, 768, False)
results = []
def ok(name, cond, info=''):
    results.append(('PASS' if cond else 'FAIL', name, info)); print('PASS' if cond else 'FAIL', name, info)

TOP = "(s)=>Math.round(document.querySelector(s).getBoundingClientRect().top)"

async def main():
    srv = subprocess.Popen(['python3', '-m', 'http.server', '8771', '-d', DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
            ctx = await b.new_context(viewport={'width': W, 'height': H}, is_mobile=MOB, has_touch=MOB, device_scale_factor=2 if MOB else 1)
            await ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://localhost:8771')
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            await pg.goto('http://localhost:8771/'); await pg.wait_for_timeout(2500)

            hit = await pg.evaluate("()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return {inMenu:!!e.closest('#menu'),tag:e.tagName,cls:e.className}}")
            ok('closed menu does not cover the page', not hit['inMenu'], str(hit))
            y0 = await pg.evaluate('scrollY'); await pg.mouse.click(W * 0.6, H * 0.45); await pg.wait_for_timeout(1500)
            ok('click on an empty part of the hero does not move the page', await pg.evaluate('scrollY') == y0)

            # menu open, focus, scroll lock, focus trap, Escape
            await pg.click('[data-menu-open]'); await pg.wait_for_timeout(700)
            st = await pg.evaluate("()=>({open:document.getElementById('menu').classList.contains('open'),hidden:document.getElementById('menu').hidden,focus:document.activeElement.className,locked:document.documentElement.classList.contains('lenis-stopped')})")
            ok('Menu opens', st['open'] and not st['hidden'], str(st))
            ok('focus moves to Close on open', 'menu-close' in st['focus'])
            ok('page scroll is locked while the menu is open', st['locked'] or MOB, str(st['locked']))
            inside = True
            for _ in range(9):
                await pg.keyboard.press('Tab')
                inside &= await pg.evaluate("()=>!!document.activeElement.closest('#menu')")
            ok('Tab stays inside the open menu', inside)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
            st = await pg.evaluate("()=>({hidden:document.getElementById('menu').hidden,focus:document.activeElement.className,locked:document.documentElement.classList.contains('lenis-stopped')})")
            ok('Escape closes the menu and focus returns to Menu', st['hidden'] and 'menu-btn' in st['focus'], str(st))
            ok('scroll is unlocked after closing', not st['locked'])
            await pg.click('[data-menu-open]'); await pg.wait_for_timeout(600)
            await pg.click('[data-menu-close]'); await pg.wait_for_timeout(700)
            ok('Close button closes the menu', await pg.evaluate("()=>document.getElementById('menu').hidden"))

            # menu links land on the top of their section, with the menu gone
            for name, sel in [('About', '#about'), ('How it works', '#how'), ('Coverage', '#coverage'), ('Who it is for', '#who'), ('Contact', '#contact')]:
                await pg.click('[data-menu-open]'); await pg.wait_for_timeout(600)
                await pg.click(f'#menu a[href="{sel}"]'); await pg.wait_for_timeout(2900)
                top = await pg.evaluate(TOP, sel); hidden = await pg.evaluate("()=>document.getElementById('menu').hidden")
                ok(f'menu link "{name}" lands on its section', abs(top) <= 3 and hidden, f'top={top}')
            # coverage arrives in its starting state (the photo small, not full width)
            await pg.click('[data-menu-open]'); await pg.wait_for_timeout(600)
            await pg.click('#menu a[href="#coverage"]'); await pg.wait_for_timeout(2900)
            sc = await pg.evaluate("()=>new DOMMatrix(getComputedStyle(document.querySelector('.coverage .grow-frame')).transform).a")
            ok('Coverage photo is small on arrival', sc < 0.8, f'scaleX={sc:.2f}')

            # header Contact and the logo
            await pg.evaluate('scrollTo(0,0)'); await pg.wait_for_timeout(1200)
            await pg.click('.bar-nav a[href="#contact"]'); await pg.wait_for_timeout(3000)
            ok('header Contact lands on the contact section', abs(await pg.evaluate(TOP, '#contact')) <= 3)
            await pg.mouse.wheel(0, -300); await pg.wait_for_timeout(900)   # the header comes back on the way up
            await pg.click('.bar-logo'); await pg.wait_for_timeout(3200)
            ok('logo scrolls back to the top', await pg.evaluate('scrollY') <= 3, str(await pg.evaluate('scrollY')))

            # footer links
            for name, sel in [('About', '#about'), ('Coverage', '#coverage'), ('Contact', '#contact')]:
                await pg.evaluate('scrollTo(0, document.documentElement.scrollHeight)'); await pg.wait_for_timeout(1500)
                await pg.click(f'.foot-links a[href="{sel}"]'); await pg.wait_for_timeout(3000)
                ok(f'footer link "{name}" lands on its section', abs(await pg.evaluate(TOP, sel)) <= 3)

            # contact form
            await pg.evaluate("document.querySelector('#contact').scrollIntoView()"); await pg.wait_for_timeout(1200)
            await pg.click('#f-name'); await pg.keyboard.type('Sami')
            ok('the Name field takes a click and typing', await pg.input_value('#f-name') == 'Sami')
            await pg.fill('#f-name', '')
            await pg.click('[data-form] button[type=submit]'); await pg.wait_for_timeout(300)
            e = await pg.evaluate("()=>['e-name','e-email','e-msg'].map(i=>document.getElementById(i).textContent)")
            ok('empty required fields show their errors', all(e), str(e))
            ok('focus moves to the first field with an error', await pg.evaluate("()=>document.activeElement.id") == 'f-name')
            await pg.fill('#f-name', 'Sami Haddad'); await pg.fill('#f-email', 'not-an-email'); await pg.fill('#f-msg', 'A campaign across the city in March.')
            await pg.click('[data-form] button[type=submit]'); await pg.wait_for_timeout(300)
            e = await pg.evaluate("()=>['e-name','e-email','e-msg'].map(i=>document.getElementById(i).textContent)")
            ok('an invalid email is caught, the others clear', e[1] and not e[0] and not e[2], str(e))
            await pg.fill('#f-email', 'sami@example.com'); await pg.wait_for_timeout(200)
            ok('the email error clears when corrected', await pg.evaluate("()=>document.getElementById('e-email').textContent") == '')
            await pg.click('[data-copy]'); await pg.wait_for_timeout(500)
            status = await pg.evaluate("()=>document.querySelector('.status').textContent")
            clip = await pg.evaluate('navigator.clipboard.readText()')
            ok('Copy message copies the text and confirms it', 'Sami Haddad' in clip and 'copied' in status.lower(), status)
            await pg.evaluate("() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); }")
            await pg.click('[data-copy]'); await pg.wait_for_timeout(400)
            ok('a blocked clipboard shows a failure message', 'not available' in (await pg.evaluate("()=>document.querySelector('.status').textContent")))

            # keyboard order from the top
            await pg.goto('http://localhost:8771/'); await pg.wait_for_timeout(2500)
            order = []
            for _ in range(4):
                await pg.keyboard.press('Tab')
                order.append(await pg.evaluate("()=>{const a=document.activeElement;return (a.className||a.tagName)+':'+(a.textContent||'').trim().slice(0,14)}"))
            ok('Tab order: skip link, logo, Menu, Contact', 'skip' in order[0] and 'bar-logo' in order[1] and 'menu-btn' in order[2] and 'Contact' in order[3], ' | '.join(order))
            await pg.keyboard.press('Tab')
            ok('the next stop is the first form field (no other controls before it)', await pg.evaluate("()=>document.activeElement.id") == 'f-name')
            await pg.keyboard.press('Shift+Tab')
            ring = await pg.evaluate("()=>getComputedStyle(document.activeElement).outlineStyle")
            ok('focus outline is visible', ring != 'none', ring)
            ok('no script errors', not errs, str(errs[:3]))
            await b.close()
    finally:
        srv.terminate()
    fails = [r for r in results if r[0] == 'FAIL']
    print(f'\n{len(results) - len(fails)}/{len(results)} passed')

asyncio.run(main())
