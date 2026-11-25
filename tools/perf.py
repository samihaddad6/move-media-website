"""Measure the first screen under Chrome DevTools' "Slow 4G" profile, served with gzip like Render."""
import asyncio, gzip, threading, os, json, io, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

DIST = '/home/claude/move-media-website/dist'
class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=DIST, **k)
    def log_message(s, *a): pass
    def send_head(s):
        path = s.translate_path(s.path.split('?')[0])
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if path.endswith(('.html', '.js', '.css', '.svg', '.webmanifest')) and os.path.exists(path) and 'gzip' in s.headers.get('Accept-Encoding', ''):
            data = gzip.compress(open(path, 'rb').read(), 9)
            s.send_response(200)
            s.send_header('Content-Type', s.guess_type(path)); s.send_header('Content-Encoding', 'gzip'); s.send_header('Content-Length', str(len(data)))
            s.end_headers(); return io.BytesIO(data)
        return super().send_head()
srv = ThreadingHTTPServer(('127.0.0.1', 8766), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()

PROFILES = {'slow4g': dict(offline=False, latency=562.5, downloadThroughput=180000, uploadThroughput=84375),
            'fast': dict(offline=False, latency=40, downloadThroughput=6_250_000, uploadThroughput=2_000_000)}

async def run(b, w, h, mob, prof):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    await cdp.send('Network.emulateNetworkConditions', PROFILES[prof])
    reqs = {}
    cdp.on('Network.responseReceived', lambda e: reqs.setdefault(e['requestId'], {'url': e['response']['url']}))
    cdp.on('Network.loadingFinished', lambda e: reqs.setdefault(e['requestId'], {}).update(bytes=e['encodedDataLength'], t=e['timestamp']))
    cdp.on('Network.requestWillBeSent', lambda e: reqs.setdefault(e['requestId'], {}).update(url=e['request']['url'], t0=e['timestamp']))
    await pg.add_init_script("""window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
      window.__out=0;document.addEventListener('DOMContentLoaded',()=>{const l=document.querySelector('.loader');new MutationObserver(()=>{if(!window.__out&&l.classList.contains('out'))window.__out=performance.now()}).observe(l,{attributes:true})});window.__fcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.name==='first-contentful-paint') window.__fcp=e.startTime}).observe({type:'paint',buffered:true});""")
    await pg.goto('http://127.0.0.1:8766/', wait_until='load', timeout=120000)
    await pg.wait_for_timeout(3000)
    r = await pg.evaluate("""()=>{const nav=performance.getEntriesByType('navigation')[0];
      const hero=document.querySelector('.hero img');
      const loaderGone=document.querySelector('.loader').classList.contains('out');
      return {out:Math.round(window.__out), fcp:Math.round(window.__fcp), lcp:Math.round(window.__lcp), load:Math.round(nav.loadEventEnd), hero:hero.currentSrc.split('/').pop(), loaderGone,
        res: performance.getEntriesByType('resource').map(e=>({n:e.name.split('/').pop(), end:Math.round(e.responseEnd), b:e.transferSize}))}}""")
    heroEnd = max([x['end'] for x in r['res'] if x['n'] == r['hero']] or [0])
    first = [x for x in r['res'] if x['n'] == r['hero'] or x['n'].endswith(('.woff2', '.css')) or (x['n'].startswith('index-') and x['n'].endswith('.js'))]
    lcp = max(heroEnd, max(x['end'] for x in first))
    navb = sum(v.get('bytes', 0) for v in reqs.values() if v.get('url', '').endswith('/'))
    tot = navb + sum(x['b'] for x in first)
    await ctx.close()
    return dict(size=f'{w}x{h}', profile=prof, loader_out_ms=r['out'], first_screen_ready_ms=lcp, hero_end_ms=heroEnd, hero=r['hero'], first_screen_KB=round(tot / 1024, 1),
                files=[(x['n'][:40], round(x['b'] / 1024, 1)) for x in first], html_KB=round(navb / 1024, 1))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        out = []
        for (w, h, mob) in [(1440, 900, False), (390, 844, True)]:
            out.append(await run(b, w, h, mob, 'slow4g'))
        await b.close()
    print(json.dumps(out, indent=1))
    json.dump(out, open('/home/claude/mm/tk/perf.json', 'w'), indent=1)
asyncio.run(main())
