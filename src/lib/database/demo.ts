/**
 * Original fictional demonstration project, written for Subtext Studio.
 * It is not based on any published or private manuscript.
 */
import { SCHEMA_VERSION } from "./db";
import { BACKUP_FORMAT } from "@/lib/validation/backup";
import type { ProjectBackup } from "@/lib/export/backup";
import {
  AUTHOR_AGENT,
  READER_AGENT,
  type CharacterAction,
  type KnowledgeLevel,
  type KnowledgeState,
  type ReaderExperienceMetric,
} from "@/types";
import { makeChapter, makeCharacter, makeEvent, makeFact, makeNote, makeProject, makeScene } from "@/lib/repositories/factories";
import { docFromParagraphs, docToPlainText } from "@/lib/utils/rich";
import { countText } from "@/lib/utils/text";
import { newId, now } from "@/lib/utils/id";

const CH1 = [
  "雾是从海上来的，像一封没有署名的信。",
  "林雯在午后抵达港口档案馆。门房把一串黄铜钥匙交给她，说奥斯特罗姆先生的遗物都在三楼——“钟表、账本、信，还有一些说不清是什么的东西。”",
  "三楼的窗朝向钟楼。钟楼的指针停在四点十七分，比真正的时间早了整整一个下午。",
  "“它已经停了二十多年了。”一个女人的声音从楼梯口传来。她穿着沾了机油的工作围裙，手里拿着一只放大镜。“我叫艾丽丝，是来修那座钟的。”",
  "林雯和她握手。那只手很凉，握得也很短，好像在确认什么，又好像在避免确认什么。",
  "“我们见过吗？”林雯问。",
  "“没有。”艾丽丝说得很快。“我不常来这里。”",
];

const CH2 = [
  "The archive smelled of brass polish and old paper. Lin Wen catalogued forty-two letters before noon, each one addressed to someone who had never replied.",
  "在第四十三个信封里，她找到一张照片：钟表铺的橱窗前站着两个女孩，大约八九岁，一个抱着一只没有指针的表盘。",
  "照片的背面写着：1998，夏。",
  "她把照片举到窗前。玻璃上映出她自己的脸，和照片里那个抱着表盘的女孩，在雾里重叠了一瞬。",
  "***",
  "那年夏天，钟表铺的门总是开着。一个女孩每天下午都来，看老人把齿轮一枚一枚放回原处。另一个女孩从不进门，只是站在橱窗外，把额头贴在玻璃上。",
  "她们约定过一件事。至于是什么，照片没有记录。",
];

const CH3 = [
  "艾丽丝打开钟楼的机芯时，林雯就站在她身后。",
  "“不是坏了。”艾丽丝说。她用镊子指着擒纵轮上一枚细小的铜楔。“有人把它卡住了。故意的。”",
  "“为什么有人要让一座钟停下来？”",
  "艾丽丝没有回答。她把铜楔取下来，放进口袋，像收起一句不该说出口的话。",
  "那天晚上，林雯在账本夹层里发现了一封信，落款是奥斯特罗姆，日期是他去世前一周。信里写着：钟楼的钟要永远停在那一刻，这是我欠一个孩子的。",
  "She read it twice. The handwriting was careful — too careful, as if someone had studied it before writing it.",
];

const CH4 = [
  "（草稿）",
  "林雯终于把照片放在艾丽丝的工作台上。",
  "“你说我们没有见过。”",
  "艾丽丝看着照片很久。久到窗外的雾都散了一层。",
  "“我说的是，我不常来这里。”她终于开口，“我没说我从没来过。”",
  "【待写：艾丽丝讲述1999年冬天离开的原因——不要一次说完，让她只说一半。】",
];

export function buildDemoBackup(): ProjectBackup {
  const t = now();
  const project = makeProject({
    title: "灯下时刻 · The Lantern Hours",
    author: "Demo Author",
    genre: "Psychological mystery / 心理悬疑",
    synopsis:
      "一位档案员来到雾港，整理已故钟表匠的遗物，遇见正在修复他最后一座钟的女人。对方坚称两人从未见过，档案却暗示了另一段被遗忘的童年。\n\nAn archivist cataloguing a dead clockmaker's papers meets the woman restoring his last clock — who insists they have never met.",
    tracks: ["Present", "1998"],
    wordGoal: 60000,
    isDemo: true,
  });
  const pid = project.id;

  const mk = (order: number, title: string, paras: string[], status: "draft" | "revising" | "complete", notes = "") => {
    const doc = docFromParagraphs(paras);
    const text = docToPlainText(doc);
    return makeChapter(pid, order, { title, doc, text, wordCount: countText(text).total, status, notes });
  };
  const ch1 = mk(0, "第一章 雾港 · Harbor of Fog", CH1, "complete", "开篇只给读者一个异常：钟停在 4:17。艾丽丝否认见过林雯——读者此时应当相信她。");
  const ch2 = mk(1, "第二章 窗中的倒影 · The Reflection", CH2, "revising", "照片 + 倒影：第一次让读者怀疑两人见过。下半章是 1998 年的闪回。");
  const ch3 = mk(2, "第三章 停摆的钟 · The Stopped Clock", CH3, "draft", "钟是被故意停下的。信是伪造的——但林雯此时相信它。");
  const ch4 = mk(3, "第四章 离开的理由 · Reasons for Leaving", CH4, "draft", "");
  const chapters = [ch1, ch2, ch3, ch4];

  const sceneDoc = docFromParagraphs([
    "钟楼的楼梯一共一百零八级。林雯数到第六十级时，听见上面有齿轮转动的声音——可是钟明明是停着的。",
  ]);
  const scene = makeScene(pid, ch3.id, 0, {
    title: "钟楼楼梯 · The Stairs",
    summary: "林雯独自上钟楼，听见不该存在的声音。",
    doc: sceneDoc,
    text: docToPlainText(sceneDoc),
    wordCount: countText(docToPlainText(sceneDoc)).total,
  });

  const lin = makeCharacter(pid, {
    name: "林雯 Lin Wen",
    role: "protagonist",
    position: { x: 80, y: 180 },
    appearance: "短发，总戴一副细框眼镜；手指上常有墨迹。",
    background: "城市档案馆的合同档案员，童年在雾港度过一个夏天，但对那段时间的记忆很模糊。",
    personality: "细致、克制，习惯把情绪归档而不是表达。",
    goals: "完成奥斯特罗姆遗物的编目。",
    motivations: "想证明自己的工作不只是整理别人的过去。",
    fears: "害怕发现自己的记忆是不可靠的。",
    values: "准确、诚实、证据。",
    internalConflicts: "相信档案 vs. 相信直觉。",
    externalConflicts: "委托人玛拉希望她尽快结束工作。",
    memories: "一扇总是开着的店门；玻璃贴在额头上的凉意。",
    beliefs: "过去是可以被完整记录的。",
    secrets: "她其实认出了照片里的自己，但没有告诉任何人。",
    arc: "从“记录过去”到“承认过去会被重写”。",
  });
  const iris = makeCharacter(pid, {
    name: "艾丽丝 Iris Hale",
    role: "deuteragonist",
    position: { x: 420, y: 120 },
    appearance: "高个子，工作围裙从不离身，手很凉。",
    background: "钟表修复师，少年时曾在奥斯特罗姆的店里当学徒。",
    personality: "冷静、话少，说话只说一半。",
    goals: "修好钟楼的钟——或者确认它应该继续停着。",
    motivations: "履行一个童年的约定。",
    fears: "被林雯认出来，又害怕她永远认不出来。",
    values: "守约。",
    internalConflicts: "坦白 vs. 保护对方。",
    beliefs: "有些时间应该停在原地。",
    secrets: "她记得林雯，也知道钟为什么停在 4:17。",
    arc: "从隐瞒到部分坦白。",
  });
  const ostrom = makeCharacter(pid, {
    name: "奥斯特罗姆 Mr. Ostrom",
    role: "supporting",
    position: { x: 700, y: 260 },
    background: "已故钟表匠，一生没有离开雾港。",
    personality: "温和、固执。",
    secrets: "他确实停下了钟，但从未写过那封信。",
  });
  const mara = makeCharacter(pid, {
    name: "玛拉 Mara Ostrom",
    role: "antagonist",
    position: { x: 420, y: 380 },
    background: "钟表匠的侄女与遗嘱执行人。",
    goals: "尽快出售钟楼。",
    motivations: "债务。",
    secrets: "伪造了叔叔的信，以证明钟楼“不值得修”。",
  });
  const characters = [lin, iris, ostrom, mara];

  const rel = (sourceId: string, targetId: string, type: string, direction: "forward" | "mutual", description: string, strength: number | null) => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    sourceId,
    targetId,
    type,
    direction,
    description,
    strength,
  });
  const relationships = [
    rel(lin.id, iris.id, "forgotten friendship · 被遗忘的童年", "mutual", "1998 年夏天的约定。一个记得，一个忘了。", 8),
    rel(iris.id, ostrom.id, "apprentice · 学徒", "forward", "艾丽丝曾在他的店里学修表。", 6),
    rel(mara.id, lin.id, "employs · 雇佣", "forward", "玛拉委托林雯整理遗物，并催促她尽快结束。", 4),
    rel(mara.id, ostrom.id, "niece / executor · 侄女", "forward", "遗嘱执行人。", 5),
  ];

  const state = (characterId: string, chapterId: string, summary: string, emotionalState: string, vars: [string, string][]) => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    characterId,
    chapterId,
    sceneId: null,
    summary,
    emotionalState,
    variables: vars.map(([name, value]) => ({ id: newId(), name, value })),
  });
  const characterStates = [
    state(lin.id, ch1.id, "专注于工作，对艾丽丝有模糊的熟悉感。", "平静 / 轻微不安", [["对艾丽丝的信任", "3"], ["好奇", "6"]]),
    state(lin.id, ch2.id, "看到照片后开始怀疑自己的记忆。", "动摇", [["对艾丽丝的信任", "4"], ["好奇", "8"]]),
    state(lin.id, ch3.id, "相信了伪造的信，误以为钟是为她停下的。", "被打动", [["对艾丽丝的信任", "6"], ["好奇", "9"]]),
    state(iris.id, ch1.id, "否认相识。", "防备", [["防备", "8"]]),
    state(iris.id, ch4.id, "承认“来过”。", "松动", [["防备", "4"]]),
  ];

  const e1 = makeEvent(pid, 0, 3, {
    title: "两个女孩在钟表铺相遇",
    storyTime: "1998 夏",
    track: "1998",
    chapterId: ch2.id,
    characterIds: [lin.id, iris.id, ostrom.id],
    location: "奥斯特罗姆钟表铺",
    description: "一个进门学修表，一个站在橱窗外。她们定下一个约定。",
    tags: ["memory", "flashback"],
  });
  const e2 = makeEvent(pid, 1, 6, {
    title: "艾丽丝离开雾港",
    storyTime: "1999 冬",
    track: "1998",
    chapterId: ch4.id,
    characterIds: [iris.id],
    description: "原因待揭示。",
    causeIds: [e1.id],
    tags: ["secret"],
  });
  const e3 = makeEvent(pid, 2, 4, {
    title: "奥斯特罗姆卡住钟楼的擒纵轮",
    storyTime: "2000 年代初",
    track: "1998",
    chapterId: ch3.id,
    characterIds: [ostrom.id],
    location: "钟楼",
    causeIds: [e2.id],
    consequences: "钟停在 4:17。",
    tags: ["clue"],
  });
  const e4 = makeEvent(pid, 3, 0, {
    title: "奥斯特罗姆去世",
    storyTime: "Present − 3 weeks",
    track: "Present",
    chapterId: ch1.id,
    characterIds: [ostrom.id, mara.id],
  });
  const e5 = makeEvent(pid, 4, 1, {
    title: "林雯抵达雾港档案馆",
    storyTime: "Present, Day 1",
    track: "Present",
    chapterId: ch1.id,
    characterIds: [lin.id, mara.id],
    location: "港口档案馆",
    causeIds: [e4.id],
  });
  const e6 = makeEvent(pid, 5, 2, {
    title: "林雯与艾丽丝在钟楼下“初次”见面",
    storyTime: "Present, Day 1",
    track: "Present",
    chapterId: ch1.id,
    characterIds: [lin.id, iris.id],
    causeIds: [e5.id],
  });
  const e7 = makeEvent(pid, 6, 5, {
    title: "林雯发现奥斯特罗姆的“信”",
    storyTime: "Present, Day 4",
    track: "Present",
    chapterId: ch3.id,
    characterIds: [lin.id],
    tags: ["forgery"],
  });
  e1.subjective = { [lin.id]: { order: 2, note: "她记得的只是“一扇开着的门”。" }, [iris.id]: { order: 0, note: "一切的起点。" } };
  e6.subjective = { [lin.id]: { order: 0, note: "对她来说，这才是第一次。" }, [iris.id]: { order: 1, note: "重逢。" } };
  e7.subjective = { [lin.id]: { order: 1, note: "" } };
  const events = [e1, e2, e3, e4, e5, e6, e7];

  const f1 = makeFact(pid, 0, { title: "林雯和艾丽丝童年时曾见过", category: "secret", eventId: e1.id, description: "1998 年夏天，钟表铺。" });
  const f2 = makeFact(pid, 1, { title: "钟是被故意停在 4:17 的", category: "clue", eventId: e3.id });
  const f3 = makeFact(pid, 2, { title: "奥斯特罗姆的信是伪造的", category: "secret", eventId: e7.id, description: "玛拉模仿了笔迹。" });
  const f4 = makeFact(pid, 3, { title: "艾丽丝离开的真正原因", category: "secret", eventId: e2.id });
  const facts = [f1, f2, f3, f4];

  const k = (factId: string, agentId: string, chapterId: string, level: KnowledgeLevel, reason = ""): KnowledgeState => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    factId,
    agentId,
    chapterId,
    sceneId: null,
    level,
    reason,
  });
  const knowledge: KnowledgeState[] = [
    ...facts.map((f) => k(f.id, AUTHOR_AGENT, ch1.id, "known")),
    k(f1.id, iris.id, ch1.id, "known", "她一眼就认出了林雯。"),
    k(f1.id, lin.id, ch1.id, "unknown"),
    k(f1.id, lin.id, ch3.id, "suspected", "照片 + 艾丽丝的回避。"),
    k(f1.id, READER_AGENT, ch1.id, "unknown"),
    k(f1.id, READER_AGENT, ch2.id, "suspected", "照片与倒影的重叠。"),
    k(f1.id, READER_AGENT, ch4.id, "known", "艾丽丝承认“来过”。"),
    k(f2.id, iris.id, ch1.id, "known"),
    k(f2.id, lin.id, ch3.id, "known", "艾丽丝指给她看铜楔。"),
    k(f2.id, READER_AGENT, ch1.id, "unknown"),
    k(f2.id, READER_AGENT, ch3.id, "known"),
    k(f3.id, mara.id, ch1.id, "known"),
    k(f3.id, lin.id, ch3.id, "misunderstood", "她相信信是真的——笔迹“太工整”只让她更感动。"),
    k(f3.id, READER_AGENT, ch3.id, "suspected", "叙述者提到笔迹“too careful”。"),
    k(f4.id, iris.id, ch1.id, "known"),
    k(f4.id, lin.id, ch4.id, "misunderstood", "以为艾丽丝是被家人带走的。"),
    k(f4.id, READER_AGENT, ch1.id, "unknown"),
  ];

  const act = (characterId: string, chapterId: string, factId: string, description: string, requires: CharacterAction["requires"]): CharacterAction => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    characterId,
    chapterId,
    factId,
    description,
    requires,
  });
  const actions = [
    act(iris.id, ch1.id, f1.id, "假装不认识林雯", "known"),
    act(lin.id, ch1.id, f1.id, "问艾丽丝“我们见过吗？”", "aware"),
    act(lin.id, ch3.id, f3.id, "把信当作真实证据收进档案", "unknown"),
  ];

  const m = (chapterId: string, v: [number, number, number, number, number, number], note = ""): ReaderExperienceMetric => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    chapterId,
    sceneId: null,
    values: {
      emotionalIntensity: v[0],
      tension: v[1],
      suspense: v[2],
      uncertainty: v[3],
      informationDensity: v[4],
      pacing: v[5],
    },
    source: "author",
    note,
  });
  const metrics = [
    m(ch1.id, [3, 4, 5, 6, 4, 4], "安静的开场，唯一的异常是停摆的钟。"),
    m(ch2.id, [5, 5, 6, 8, 6, 3]),
    m(ch3.id, [6, 7, 8, 7, 8, 6]),
    m(ch4.id, [8, 6, 6, 5, 5, 5]),
  ];

  const fs = (description: string, introducedChapterId: string | null, expectedPayoffChapterId: string | null, actualPayoffChapterId: string | null, status: "planned" | "planted" | "reinforced" | "paid-off", characterIds: string[], eventIds: string[]) => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    description,
    introducedChapterId,
    expectedPayoffChapterId,
    actualPayoffChapterId,
    status,
    characterIds,
    eventIds,
  });
  const foreshadowing = [
    fs("钟停在 4:17", ch1.id, ch3.id, ch3.id, "paid-off", [iris.id, ostrom.id], [e3.id]),
    fs("“我不常来这里”——艾丽丝措辞中的缝隙", ch1.id, ch4.id, null, "reinforced", [iris.id], [e6.id]),
    fs("照片里抱着表盘的女孩", ch2.id, ch4.id, null, "planted", [lin.id, iris.id], [e1.id]),
    fs("信的笔迹“太工整”", ch3.id, null, null, "planted", [mara.id], [e7.id]),
  ];

  const notes = [
    makeNote(pid, { title: "记忆是档案还是重写？", body: "如果每一次回忆都是一次重写，那么林雯的工作——“保存过去”——本身就是一个悖论。", kind: "question", tags: ["theme", "memory"], pinned: true }),
    makeNote(pid, { title: "Dialogue fragment", body: "“你修的是钟，还是时间？”\n“钟。时间不归我管。”", kind: "dialogue", tags: ["iris"], chapterIds: [ch3.id] }),
    makeNote(pid, { title: "擒纵机构 research", body: "擒纵轮（escapement wheel）每次释放一个齿，控制钟摆的节奏。卡住它就能让整座钟停下，而不损坏发条。", kind: "research", tags: ["clock"], chapterIds: [ch3.id] }),
    makeNote(pid, { title: "Alt: 玛拉也认识照片里的女孩？", body: "如果第三个孩子是玛拉呢？——可能太多了，先放着。", kind: "plot", tags: ["alt"] }),
  ];

  project.lastDocId = ch2.id;
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(t).toISOString(),
    app: "Subtext Studio",
    project,
    chapters,
    scenes: [scene],
    characters,
    relationships,
    characterStates,
    events,
    facts,
    knowledge,
    actions,
    foreshadowing,
    metrics,
    notes,
    snapshots: [],
    sessions: [],
  };
}
