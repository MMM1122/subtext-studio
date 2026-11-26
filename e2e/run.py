import sys, asyncio, importlib.util
from playwright.async_api import async_playwright
# usage: flow.py script.py  — script defines async def run(page, shot)
async def main():
    spec = importlib.util.spec_from_file_location("s", sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":1440,"height":900}, color_scheme=getattr(m,"SCHEME","light"), accept_downloads=True)
        page = await ctx.new_page()
        errs=[]
        page.on("console", lambda msg: errs.append(f"{msg.type}: {msg.text[:300]}") if msg.type in ("error",) else None)
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        async def shot(name): await page.screenshot(path=f"/tmp/{name}.png")
        try:
            await m.run(page, shot)
        finally:
            print("ERRORS:\n" + "\n".join(errs[:20]))
            await b.close()
asyncio.run(main())
