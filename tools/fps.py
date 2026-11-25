import asyncio, subprocess, time, json, statistics
from playwright.async_api import async_playwright
async def main():
    srv = subprocess.Popen(['python3','-m','http.server','8767','-d','/home/claude/mm/site/dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--enable-gpu-rasterization','--ignore-gpu-blocklist','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1440,'height':900})
        await pg.goto('http://localhost:8767/'); await pg.wait_for_timeout(3000)
        await pg.evaluate("window.__d=[];let l=performance.now();(function f(t){window.__d.push(t-l);l=t;requestAnimationFrame(f)})(l)")
        H = await pg.evaluate('document.documentElement.scrollHeight')
        await pg.mouse.move(700,450)
        y=0
        while y < H:
            await pg.mouse.wheel(0, 120); y += 120
            await pg.wait_for_timeout(16)
        await pg.wait_for_timeout(1500)
        d = await pg.evaluate('window.__d.slice(5)')
        d=[x for x in d if x>0]
        fps=[1000/x for x in d]
        print(json.dumps({'frames':len(d),'median_ms':round(statistics.median(d),2),'avg_fps':round(1000/statistics.mean(d),1),'p95_ms':round(sorted(d)[int(len(d)*.95)],1),'share_over_20ms':round(sum(x>20 for x in d)/len(d),3)}))
        await b.close()
    srv.terminate()
asyncio.run(main())
