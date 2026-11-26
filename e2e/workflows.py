import json, os, re
import os
BASE=os.environ.get("BASE_URL","http://localhost:3000")
results=[]
def ok(name, cond, detail=""):
    results.append((name, bool(cond), detail)); print(("PASS " if cond else "FAIL ")+name+(" — "+detail if detail else ""))

async def type_in_editor(page, text):
    ed = page.locator(".ProseMirror")
    await ed.click()
    await page.keyboard.press("Control+End")
    await page.keyboard.type(text)

async def run(page, shot):
    # 1. Create project
    await page.goto(BASE+"/library", wait_until="networkidle")
    await page.get_by_role("button", name="New project").click()
    await page.get_by_placeholder("书名 / Title").fill("E2E 测试小说")
    await page.get_by_role("button", name="Create project").click()
    await page.wait_for_url("**/write**", timeout=15000)
    await page.wait_for_selector(".ProseMirror", timeout=15000)
    ok("1. create project", "E2E 测试小说" in await page.locator("header").inner_text())
    pid = re.search(r"/projects/([^/]+)/", page.url).group(1)

    # 2. Write chapter 1, including simulated Chinese IME composition
    await type_in_editor(page, "The first line. ")
    cdp = await page.context.new_cdp_session(page)
    await cdp.send("Input.imeSetComposition", {"text": "wu", "selectionStart": 2, "selectionEnd": 2})
    await cdp.send("Input.imeSetComposition", {"text": "雾", "selectionStart": 1, "selectionEnd": 1})
    await cdp.send("Input.insertText", {"text": "雾是从海上来的"})
    await page.wait_for_timeout(1500)
    t1 = await page.locator(".ProseMirror").inner_text()
    ok("2a. IME composition inserts Chinese once", t1.count("雾是从海上来的") == 1 and "wu" not in t1, t1[:80])
    # add chapter 2 and write
    await page.get_by_role("button", name="Add chapter").click()
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(800)
    await type_in_editor(page, "Second chapter text 第二章。")
    await page.wait_for_timeout(1500)
    ok("2b. save indicator shows saved", "Saved locally" in await page.locator("[role=status]").first.inner_text())

    # 3. Refresh and verify persistence
    await page.goto(BASE+f"/projects/{pid}/write", wait_until="networkidle")
    await page.wait_for_selector(".ProseMirror", timeout=15000)
    await page.wait_for_timeout(800)
    txt = await page.locator(".ProseMirror").inner_text()
    ok("3a. last chapter restored after refresh", "Second chapter text 第二章。" in txt, txt[:60])
    await page.get_by_role("button", name=re.compile(r"^\d+\s*Chapter 1$")).click()
    await page.wait_for_timeout(800)
    txt = await page.locator(".ProseMirror").inner_text()
    ok("3b. chapter 1 persisted", "The first line." in txt and "雾是从海上来的" in txt, txt[:60])

    # find & replace
    await page.locator(".ProseMirror").click()
    await page.keyboard.press("Control+f")
    await page.get_by_label("Find", exact=True).fill("first")
    await page.get_by_label("Replace with").fill("opening")
    await page.get_by_role("button", name="Replace all").click()
    await page.wait_for_timeout(300)
    ok("2c. find & replace", "The opening line." in await page.locator(".ProseMirror").inner_text())
    await page.keyboard.press("Escape")

    # 4. Reorder chapters with keyboard (dnd-kit)
    handle = page.get_by_role("button", name="Reorder Chapter 1")
    await handle.focus()
    await page.keyboard.press("Space"); await page.wait_for_timeout(200)
    await page.keyboard.press("ArrowDown"); await page.wait_for_timeout(200)
    await page.keyboard.press("Space"); await page.wait_for_timeout(1200)
    names = await page.locator("ul[aria-label=Chapters] > li").all_inner_texts()
    ok("4. reorder chapters", len(names) >= 2 and "Chapter 2" in names[0] and "Chapter 1" in names[1], str([n.split(chr(10))[1] if chr(10) in n else n for n in names]))
    await page.reload(wait_until="networkidle"); await page.wait_for_timeout(1500)
    names = await page.locator("ul[aria-label=Chapters] > li").all_inner_texts()
    ok("4b. chapter order persisted", "Chapter 2" in names[0])

    # 10. Theme switch
    before = await page.evaluate("document.documentElement.classList.contains('dark')")
    await page.locator("button[aria-label^='Theme:']").click(); await page.wait_for_timeout(300)
    await page.locator("button[aria-label^='Theme:']").click(); await page.wait_for_timeout(300)
    lbl = await page.locator("button[aria-label^='Theme:']").get_attribute("aria-label")
    after = await page.evaluate("document.documentElement.classList.contains('dark')")
    ok("10. theme switch (system→light→dark)", after and lbl.startswith("Theme: dark"), lbl)
    await shot("e2e-dark-write")
    await page.locator("button[aria-label^='Theme:']").click(); await page.locator("button[aria-label^='Theme:']").click()

    # 5. Characters & relationships
    await page.goto(BASE+f"/projects/{pid}/characters", wait_until="networkidle")
    await page.get_by_role("button", name="Create a character").click()
    await page.wait_for_timeout(500)
    await page.get_by_role("button", name="Add character").click()
    await page.wait_for_timeout(500)
    await page.get_by_role("tab", name="Relationship graph").click()
    await page.wait_for_selector(".react-flow__node", timeout=15000)
    await page.wait_for_timeout(1000)
    nodes = page.locator(".react-flow__node")
    ok("5a. two characters on graph", await nodes.count() == 2)
    src = nodes.nth(0).locator(".react-flow__handle-bottom")
    dst = nodes.nth(1).locator(".react-flow__handle-top")
    sb = await src.bounding_box(); db_ = await dst.bounding_box()
    await page.mouse.move(sb["x"]+sb["width"]/2, sb["y"]+sb["height"]/2)
    await page.mouse.down()
    await page.mouse.move(sb["x"]+30, sb["y"]+30, steps=5)
    await page.mouse.move(db_["x"]+db_["width"]/2, db_["y"]+db_["height"]/2, steps=20)
    await page.mouse.up()
    await page.wait_for_timeout(1000)
    ok("5b. relationship created by connecting nodes", await page.locator(".react-flow__edge").count() == 1)
    await page.get_by_placeholder("e.g. rivals, mentor, 姐妹").fill("rivals 对手")
    await page.get_by_placeholder("e.g. rivals, mentor, 姐妹").blur()
    await page.wait_for_timeout(800)
    await page.reload(wait_until="networkidle"); await page.wait_for_selector(".react-flow__edge", timeout=15000); await page.wait_for_timeout(800)
    ok("5c. relationship type persisted", "rivals 对手" in await page.locator(".react-flow").inner_text())

    # 6. Timeline: add 3 events, reorder narrative only
    await page.goto(BASE+f"/projects/{pid}/timeline", wait_until="networkidle")
    await page.get_by_role("button", name="Add the first event").click()
    for _ in range(2):
        await page.get_by_role("button", name="Event", exact=True).click(); await page.wait_for_timeout(300)
    await page.wait_for_timeout(500)
    narr = page.locator("ol[aria-label='Narrative order'] li")
    ok("6a. three events", await narr.count() == 3)
    await narr.nth(0).get_by_role("button", name="Drag to reorder").focus()
    await page.keyboard.press("Space"); await page.wait_for_timeout(200)
    await page.keyboard.press("ArrowDown"); await page.wait_for_timeout(150)
    await page.keyboard.press("ArrowDown"); await page.wait_for_timeout(150)
    await page.keyboard.press("Space"); await page.wait_for_timeout(1200)
    n_txt = [t.strip().split("\n")[0] for t in await page.locator("ol[aria-label='Narrative order'] li").all_inner_texts()]
    c_txt = [t.strip().split("\n")[0] for t in await page.locator("ol[aria-label='Chronological order'] li").all_inner_texts()]
    ok("6b. narrative reordered independently", n_txt[-1] == "Event 1" and c_txt[0] == "Event 1", f"narr={n_txt} chrono={c_txt}")
    await page.reload(wait_until="networkidle"); await page.wait_for_timeout(1200)
    n2 = [t.strip().split("\n")[0] for t in await page.locator("ol[aria-label='Narrative order'] li").all_inner_texts()]
    c2 = [t.strip().split("\n")[0] for t in await page.locator("ol[aria-label='Chronological order'] li").all_inner_texts()]
    ok("6c. both orders persisted", n2 == n_txt and c2 == c_txt)

    # 7. Knowledge across chapters
    await page.goto(BASE+f"/projects/{pid}/knowledge", wait_until="networkidle")
    await page.get_by_label("New fact").fill("秘密 A")
    await page.get_by_role("button", name="Add", exact=True).click()
    await page.wait_for_timeout(600)
    reader_cell = page.locator("td button[aria-label^='秘密 A — Reader']")
    await reader_cell.click(); await page.wait_for_timeout(500)   # ch1: known
    lab1 = await reader_cell.get_attribute("aria-label")
    await page.get_by_role("button", name="2", exact=True).click(); await page.wait_for_timeout(400)
    lab2_inherited = await reader_cell.get_attribute("aria-label")
    await reader_cell.click(); await page.wait_for_timeout(500)  # ch2: suspected
    lab2 = await reader_cell.get_attribute("aria-label")
    await page.get_by_role("button", name="1", exact=True).click(); await page.wait_for_timeout(400)
    lab1b = await reader_cell.get_attribute("aria-label")
    ok("7. knowledge history per chapter", "known" in lab1 and "carried over" in lab2_inherited and "suspected" in lab2 and "known" in lab1b and "suspected" not in lab1b, f"{lab1} | {lab2_inherited} | {lab2} | {lab1b}")

    # 8. Notes: create and search
    await page.goto(BASE+f"/projects/{pid}/notes", wait_until="networkidle")
    await page.get_by_label("Quick capture").fill("钟楼的声音\n齿轮在停摆的钟里转动")
    await page.get_by_label("Tags").fill("clock, 声音")
    await page.get_by_role("button", name="Capture").click(); await page.wait_for_timeout(500)
    await page.get_by_label("Quick capture").fill("An unrelated idea about rain")
    await page.get_by_role("button", name="Capture").click(); await page.wait_for_timeout(500)
    await page.get_by_label("Search notes").fill("齿轮")
    await page.wait_for_timeout(400)
    cards = await page.locator("ul.columns-1 > li").count()
    ok("8a. note search", cards == 1)
    await page.get_by_role("tab", name="Search whole project").click()
    await page.get_by_label("Search project").fill("雾是从海上")
    await page.wait_for_timeout(600)
    ok("8b. project-wide search finds manuscript text", "Chapter" in await page.locator("main").inner_text() and "雾是从海上" in await page.locator("main").inner_text())

    # 9. Export & restore
    await page.goto(BASE+f"/projects/{pid}/write", wait_until="networkidle")
    await page.get_by_role("button", name="Export").click()
    async with page.expect_download() as dl:
        await page.get_by_role("menuitem", name="Export backup (.json)").click()
    d = await dl.value
    path = "/tmp/e2e-backup.json"; await d.save_as(path)
    data = json.load(open(path))
    ok("9a. backup exported", data["format"] == "subtext-studio/project" and len(data["chapters"]) == 2 and len(data["knowledge"]) == 2, f"{len(data['chapters'])} chapters")
    await page.get_by_role("button", name="Export").click()
    async with page.expect_download() as dl2:
        await page.get_by_role("menuitem", name="Export manuscript (.md)").click()
    md_path="/tmp/e2e.md"; await (await dl2.value).save_as(md_path)
    md = open(md_path).read()
    ok("9b. markdown manuscript", md.startswith("# E2E 测试小说") and "雾是从海上来的" in md)
    await page.goto(BASE+"/library", wait_until="networkidle")
    await page.locator("input[aria-label='Import project backup']").set_input_files(path)
    await page.wait_for_timeout(1500)
    titles = await page.locator("article h2").all_inner_texts()
    ok("9c. restore creates a new project, original kept", "E2E 测试小说" in titles and "E2E 测试小说 (restored)" in titles, str(titles))
    await page.get_by_role("link", name="Open E2E 测试小说 (restored)").click() if False else None
    await shot("e2e-library")
    print("SUMMARY", sum(1 for r in results if r[1]), "/", len(results))
