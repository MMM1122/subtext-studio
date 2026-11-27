/**
 * Original fictional demonstration project, written for Subtext Studio:
 * 《筝探》—— a guzheng player who can catch fragments of a scene's past
 * through music, and must reason them into a whole case.
 * Not based on any published or private manuscript.
 */
import { SCHEMA_VERSION } from "./db";
import { BACKUP_FORMAT } from "@/lib/validation/backup";
import type { ProjectBackup } from "@/lib/export/backup";
import {
  AUTHOR_AGENT,
  READER_AGENT,
  type Chapter,
  type CharacterAction,
  type CharacterRelationship,
  type CharacterState,
  type ChapterStatus,
  type Foreshadowing,
  type ForeshadowingStatus,
  type KnowledgeLevel,
  type KnowledgeState,
  type ReaderExperienceMetric,
} from "@/types";
import { makeChapter, makeCharacter, makeEvent, makeFact, makeNote, makeProject, makeScene } from "@/lib/repositories/factories";
import { docFromParagraphs, docToPlainText } from "@/lib/utils/rich";
import { countText } from "@/lib/utils/text";
import { newId, now } from "@/lib/utils/id";

/** Bump when the demo content changes, so existing browsers receive the new demo once. */
export const DEMO_VERSION = 2;

const CHAPTERS: { title: string; status: ChapterStatus; notes: string; text: string[] }[] = [
  {
    title: "第一章 断弦",
    status: "complete",
    notes: "开篇只给读者三个异常：断掉的第七弦、少了一只的布鞋、筝尾的“赠清”。许默第一次出场——软，但看得见别人看不见的东西。",
    text: [
      "雨下了一整夜。早上七点，宋听澜在筝舍给第一个学生调弦，第七根弦在她指下发出一声闷响——没有断，只是走了音。她把弦轴往回拧了半圈，心里莫名一沉。",
      "八点十分，父亲的电话打了进来。宋国峰很少在上班时间打给她，开口第一句是：“顾氏琴坊的顾明远，你认识吧。”",
      "她当然认识。她的第一张筝是顾明远做的，母亲留下的那张也是。",
      "“人没了，昨晚的事。”父亲顿了顿，“你别过来。”",
      "她还是去了。雨巷尽头，琴坊门口拉着警戒线。刑侦支队的赵磊认出她，皱着眉让开半步：“局长知道你来吗？”",
      "屋里是桐木和松香的味道。顾明远仰面躺在阁楼木梯下，额角一道发黑的血痕，右脚的布鞋不见了。梯子歪在一边。",
      "“初步看是意外。”赵磊说，“老人家晚上爬阁楼拿东西，脚下一滑。”",
      "工作台上横着一张还没上漆的筝。第七根弦断了，卷曲的弦头垂在琴码旁边，像一句没说完的话。",
      "一个穿痕检制服的年轻人蹲在琴边拍照，拍一张，凑近看一眼，再拍一张。听澜走近时，他吓了一跳，相机差点脱手：“那、那个……这里不能碰。”",
      "“我不碰。”她说。她只是看见了筝尾的刻字：赠清。",
      "她母亲叫沈清。",
      "年轻人顺着她的目光看过去，小声说：“这根弦……断口不太对。”赵磊在门口咳了一声，他立刻闭上了嘴。后来她才知道，他叫许默，技术科新来的。",
    ],
  },
  {
    title: "第二章 残响",
    status: "complete",
    notes: "第一次完整展示能力，同时立下规则：只在现场、一曲为限、只有碎片、看不清脸、有代价。三片碎片 A/B/C 全部埋下。",
    text: [
      "夜里十一点，听澜背着琴包，站在技术科的走廊里。许默抱着一摞物证袋从电梯出来，看见她，脚步明显慢了半拍。",
      "“我想回现场看看。十分钟。”",
      "“不、不行的。”他说完，又补了一句，“……现场明天才解封。”",
      "她没有争，只是安静地看着他。三十秒后，许默叹了口气，去拿了钥匙。",
      "琴坊没有开灯。听澜在那张未完成的筝前坐下，避开断掉的第七弦，把义甲一片一片缠好。",
      "“你要……弹琴？”",
      "“你就当我是在悼念。”",
      "她弹《渔舟唱晚》。这是母亲教她的第一首曲子，也是她唯一能“听见”的方式。第一个乐句落下，屋里的雨声变了——不是窗外的雨，是另一场雨，更急，更冷。",
      "她看见一双手。苍老的手，指甲剪得很短，正一圈一圈地拧着琴轸。看不见脸。",
      "她看见阁楼的梯子在晃。一只布鞋从高处掉下来，落进木屑里。",
      "她听见有人在哼歌，就是她正在弹的这一段，但第三小节有一个音唱低了——不是唱错，是一种很老的唱法。",
      "然后什么都没有了。曲子还剩一半，她的手指已经抬不起来。左手中指的指腹裂开一道细口，渗出血来。",
      "许默站在门边，一动不动。过了很久，他才问：“你、你刚才……在看什么？”",
      "“没什么。”听澜把义甲收进盒子，“我累了。”",
      "回家的路上，她在手机备忘录里写下三行字：拧琴轸的老人的手。掉下来的布鞋。唱低的第三小节。",
      "没有时间，没有顺序，没有脸。这就是她的能力——从来只有碎片。",
    ],
  },
  {
    title: "第三章 四个人",
    status: "complete",
    notes: "信息密度最高的一章：四个嫌疑人一次摊开。关键误导——陈怀远的“十一点还听见琴声”，让警方和读者都把死亡时间放在 23 点以后。",
    text: [
      "第二天上午的案情会，听澜没有资格参加。她坐在父亲办公室外的长椅上，隔着门听见赵磊的声音。",
      "“排查了四个人。”",
      "周启华，城南置业的经理，半年里七次上门谈收购。案发当晚七点半到过琴坊，监控拍到他八点十分离开，邻居说两人吵得很凶。之后整晚在酒店陪客户吃饭，有人证。",
      "顾一帆，死者独子，欠了四十多万赌债。自称整晚在酒吧，但酒吧监控显示他有两段空档：八点半到九点二十，十点五十到十一点四十。",
      "林素，跟了顾明远八年的学徒。上个月顾明远在律师那里改了遗嘱，琴坊留给她，不留给儿子。她说那晚一个人在家，没人能证明。",
      "陈怀远，隔壁的退休音乐老师，七十一岁。是他提供了最关键的一条：“十一点钟我还听见老顾店里有琴声，‘铮’的一下。楼上的租客也听见了。”十点五十五到十一点十分，便利店的监控拍到他在买烟。",
      "“所以死亡时间在十一点以后。”赵磊说，“法医给的范围是九点到半夜十二点，下了一夜雨，窗还开着，尸温参考价值不大。十一点以后没有不在场证明的，只有顾一帆和林素。”",
      "门里安静了一会儿。然后是父亲的声音：“先查顾一帆。”",
      "听澜低头看着自己裂开的指腹。她想，十一点那一声“铮”，未必是有人在弹琴。",
      "断弦也会响。",
    ],
  },
  {
    title: "第四章 许默的笔记本",
    status: "complete",
    notes: "两人正式搭档。她的碎片没有时间，他的笔记本每一行都有时间——这是全书的方法论。452 赫兹第一次出现。",
    text: [
      "许默约她在市局后门的面馆，坐下之前先把桌面擦了三遍。他从包里拿出一个牛皮笔记本，翻开，推到她面前。字很小，很密，每一条都标了时间。",
      "“我、我不是要问你那天晚上的事。”他避开她的眼睛，“我只是……多看了几眼。”",
      "第一条：第七弦断口呈颈缩状，是被拉断的，不是锈断。",
      "第二条：第七弦的琴码比相邻几个往琴尾偏了三毫米。有人调过这根弦，而且调得很紧。",
      "第三条：工作台上的电子调音器，校准频率被改成了 452 赫兹。正常是 440 或 442。",
      "第四条：死者右脚的布鞋在梯子第三级下方找到，鞋底沾着松香粉。阁楼地板上有松香粉，楼下没有。",
      "第五条：窗户插销是从里面拨开的，窗台没有攀爬痕迹。",
      "听澜一条一条看下去。她的碎片是没有时间的，而他的笔记本，每一行都有。",
      "“452，”她慢慢地说，“比标准音高了将近半个音。如果有人把第七弦按 452 去调——”",
      "“弦会绷到快断。”许默接上，声音第一次没有发抖，“下雨的晚上，琴码会一点点滑……可能一个小时以内，它就会自己断。”",
      "两个人对视了一眼。",
      "“你那天晚上，是不是看见了什么？”许默问。",
      "听澜沉默了很久，说：“一双在调弦的手。”",
      "许默没有笑，也没有追问。他只是在笔记本上新起一行：调弦的人＝老人？（待证）",
      "那天以后，她把他当成搭档。",
    ],
  },
  {
    title: "第五章 林素",
    status: "revising",
    notes: "林素的隐瞒不是因为她是凶手，而是因为她“看起来最像”。她给出的 21:30 是整条时间线的第一颗钉子。",
    text: [
      "林素在城西租了一间小工作室，继续接修琴的活。听澜抱着自己的筝上门，说琴码松了。",
      "林素只看了一眼就笑了：“码没松，是你自己调得太紧。”她的手很稳，说话时却一直看着窗外。",
      "修到一半，听澜问：“那天晚上，你回过琴坊吗？”",
      "林素手里的镊子停住了。",
      "“九点半。我回去拿忘带的刻刀。”她声音很低，“师傅额头破了，在流血，但人好好的，还骂我丢三落四。他说一帆来过，又是要钱。”",
      "“你为什么没告诉警察？”",
      "“遗嘱写的是我。”林素放下镊子，“我在那里出现过，又什么都证明不了。你说他们会怎么想？”",
      "她走之前，师傅让她十一点再来一趟，说要她听听那张新琴的音。“可那天雨太大，我没去。”林素的眼圈红了，“如果我去了……”",
      "听澜没有安慰她。她在想另一件事：九点半，顾明远还活着，而且只是轻伤。十一点，有人听见“铮”的一声。中间那一个半小时，发生了什么？",
      "电话里，许默听完，小声问：“她说的‘听听音’……那张琴的第七弦，是不是本来就要在那天晚上调好？”",
      "听澜忽然想起碎片里那双手——如果，那是顾明远自己在调弦呢？",
    ],
  },
  {
    title: "第六章 父亲",
    status: "revising",
    notes: "父亲表面否定她（“又是你那套听见”），但 Knowledge Matrix 里他从第一章就是“怀疑”——读者在第十章之前都被蒙在鼓里。第二次弹奏：碎片 D/E。",
    text: [
      "顾一帆是在高速服务区被拦下的。车里有一份没签字的遗嘱草稿，袖口有干掉的血迹，比对结果是顾明远的。",
      "晚上，宋国峰难得回家吃饭。饭桌上他只说了一句：“案子差不多了。”",
      "“他没有杀人。”听澜说。",
      "父亲放下筷子：“证据呢？”",
      "她说不出口。她总不能说，我在现场弹了一首曲子，看见了一双老人的手。",
      "“又是你那套‘听见’？”宋国峰的语气不重，却像一记耳光，“你妈当年也总说她能听见。后来呢？”",
      "后来母亲死了。这句话谁都没有说出来。",
      "那天深夜，听澜第二次走进琴坊。许默替她守在门外，攥着手电，一直在发抖，却没有走。",
      "这一次，碎片更少，也更清楚。",
      "她看见一个年轻男人的背影，摔门而出，手里攥着几张纸。门外的雨很大。",
      "她看见调音器的小屏幕亮着，绿色的数字：A4＝452Hz。",
      "曲子弹到第二段，她的指尖又裂了。她停下来，在黑暗里坐了很久。年轻男人攥着纸离开——那应该是顾一帆。可那是他第一次离开，还是第二次？",
      "出门时，许默递给她一张创可贴，犹豫了一下说：“局长……局长下午来过技术科，看了那台调音器很久。”",
    ],
  },
  {
    title: "第七章 两个夜晚",
    status: "revising",
    notes: "顾一帆的“冰的”是全案转折。听澜把碎片 D 放进 23:20 之后——同一个人，两个夜晚。第三个人的轮廓出现：会调弦的人。",
    text: [
      "审讯室的单向玻璃后面，听澜站在许默身边。赵磊破例放她进来，条件是不许出声。",
      "顾一帆比照片上更瘦，眼睛通红。",
      "“八点四十我去找他要钱。他不给，还说琴坊不留给我。我推了他一把，他撞在工作台上，额头出血了。”他抱着头，“我以为没事，他还在骂我。我就走了，九点多。”",
      "“然后呢？”",
      "“十一点多，我越想越后悔，回去想跟他道歉。门没锁，灯开着，他躺在梯子底下……我摸了一下他的手，冰的。冰得不像刚出事。”",
      "“所以你拿走了遗嘱。”",
      "“我怕你们以为是我。我只想把那张纸烧了。”",
      "赵磊冷笑：“十一点多回去，人已经凉透了？十一点钟陈老先生还听见琴声。”",
      "玻璃这一侧，许默的笔记本翻得哗哗响。他压低声音：“冰的……如果十一点二十人已经冰了，开着窗，下雨，九月……至少死了一个小时。”",
      "听澜在心里把碎片重新排了一遍。年轻男人攥着纸摔门而出——那是十一点二十以后，他第二次离开。九点多他第一次离开时，顾明远只是额头受伤；九点半林素看见他还活着。",
      "那么，在九点半到十一点二十之间，还有第三个人来过。",
      "一个会调弦、会把调音器改成 452、知道十一点那一声会被人听见的人。",
    ],
  },
  {
    title: "第八章 452赫兹",
    status: "draft",
    notes: "用实验代替灵异：能力只给方向，证据要靠复现。注意——赵磊在本章末就按 22 点重排不在场证明，但矩阵里他第九章才确认死亡时间（见 Action checks 的提醒）。",
    text: [
      "许默从仓库借来一张同款的筝，又从气象站要来了案发当晚每小时的湿度记录。",
      "“我、我只试一次。”他说，“如果不行，就当我没说过。”",
      "他把第七弦按 452 赫兹调好，把琴码往琴尾推了三毫米，关上窗，打开加湿器，把湿度调到和那晚一样，然后按下计时器。两个人坐在仓库的地上，看着那张筝，像在等一场判决。",
      "第四十七分钟——“铮”。第七弦断了。声音又尖又亮，在空旷的仓库里回荡了很久。",
      "许默盯着秒表，半天没说出话来。听澜却笑了。",
      "十一点那一声，不是有人在弹琴。是有人在十点左右把一根弦调到了极限，然后离开。“十一点他还活着”这句话，不成立了。",
      "而十点到十一点之间，所有人里，只有一个人突然有了一段完美的不在场证明：十点五十五分，便利店，买烟。",
      "回到琴坊，许默在废纸篓最底下翻出一张揉皱的旧报纸。两周前的晚报，文化版：《老匠人顾明远：失传三十年的“断纹”技法，由我复原》。",
      "报纸的空白处，有人用圆珠笔写了两个字，力透纸背：叶秋。",
      "赵磊听完他们的实验，第一反应是：“谁让你们私自做实验的？”第二反应，是把所有人的不在场证明，按十点重新排一遍。",
    ],
  },
  {
    title: "第九章 走调",
    status: "draft",
    notes: "用碎片 C（唱低的第三小节）做试探，而不是用证据逼供。陈怀远那句“你和你妈妈一样”把个案接到主线。",
    text: [
      "叶秋是陈怀远的亡妻。三十年前，她在县文化馆做琴，最出名的就是一手“断纹”——让新琴的漆面像老琴一样自然开裂，音色因此更松更透。她去世后，手稿下落不明。",
      "听澜没有带警察，只带了自己的筝，敲开了陈怀远的门。老人的屋子很干净，墙上挂着一张没上弦的旧筝，漆面布满细密的裂纹。",
      "“陈老师，我想请您听听我这首《渔舟唱晚》。”",
      "她弹到第三小节，故意把那个音唱低了半分——和碎片里一模一样的唱法。",
      "陈怀远的手指在膝盖上轻轻跟了一下拍子，脱口而出：“对，老谱就是这么唱的。现在的年轻人，没人这么教了。”",
      "他说完，自己愣住了。",
      "听澜放下手：“那天晚上，您在琴坊哼的，也是这一段。”",
      "屋子里很久没有声音。窗外又开始下雨。",
      "“你看见了？”陈怀远终于问，声音很轻，“你和你妈妈一样。”",
      "听澜的手心一下子凉了。",
      "她还想问，楼道里传来脚步声。许默和赵磊站在门口——赵磊手里是搜查令，许默手里是一个证物袋，里面是一枚琴轸，从陈家楼下的垃圾桶里找到的，和那张未完成的筝上缺的那一枚，尺寸完全吻合。",
      "陈怀远看着那枚琴轸，笑了一下：“老顾做的琴轸，三十年了，还是这个样子。”",
    ],
  },
  {
    title: "第十章 一曲终了",
    status: "draft",
    notes: "收束第一案：所有碎片各归其位。结尾两句把第二案（母亲沈清之死）打开。",
    text: [
      "对质安排在琴坊。宋国峰亲自来了，站在门口，没有进去。陈怀远坐在那张未完成的筝前，像在上一堂课。",
      "“那天十点，我拿着报纸去找他。他说手稿是叶秋临走前托付给他的，他只是‘替她复原’。”老人的手搭在断掉的第七弦上，“三十年了，他把她的名字，写成了他自己的。”",
      "争执从楼下吵到阁楼。顾明远要上去取那本手稿证明自己，陈怀远在梯子下拽住了他的裤脚。“我只想让他下来，把话说清楚。”",
      "布鞋掉了下来。然后是人。",
      "“他摔下来的时候，额头的伤又裂开了。我在旁边站了十分钟，确定他不动了。”陈怀远的声音很平静，“然后我想起了那根弦。”",
      "他是音乐老师。他知道一根被拧到 452 赫兹的弦，在那样的雨夜能撑多久。他把弦调好，把调音器的数字留在了屏幕上——“我本来想改回去的，可手一直在抖。”——然后去便利店，买了一包已经戒了十年的烟。",
      "十一点，弦断了。楼上的租客听见了。第二天，他自己也把这一声告诉了警察。",
      "所有的碎片都有了位置：拧琴轸的手是陈怀远的；布鞋掉下来是在十点二十分；唱低的第三小节，是叶秋教给他的老谱；摔门而出的年轻人，是十一点二十回来又离开的顾一帆；452，是一双发抖的手没来得及抹掉的数字。",
      "被带走前，陈怀远在听澜面前停了一下。“这张琴，”他看了一眼筝尾的刻字，“是老顾给你妈妈做的。他说他欠她一样东西。你妈妈出事那年，他本来要把琴送过去。”",
      "听澜回头。父亲站在门口的雨里，脸色比谁都白。",
      "回家的车上，父女俩谁都没有说话。快到楼下时，宋国峰忽然开口：“你能听见，我知道。”",
      "他停了一下。“你妈也是。”",
      "雨刷来回摆动。听澜看着窗外，想起碎片里那些从来看不清的脸。",
      "第一个案子结束了。第二个，十二年前就开始了。",
    ],
  },
];

export function buildDemoBackup(): ProjectBackup {
  const t = now();
  const project = makeProject({
    title: "筝探",
    author: "Demo Author",
    genre: "推理 · 悬疑 / Mystery",
    synopsis:
      "古筝老师宋听澜有一种无法向人解释的能力：在案发现场弹奏时，她能“听见”那里残留的过去——但只有碎片。没有时间，没有顺序，看不清脸。\n\n老琴匠顾明远在雨夜死于自家琴坊，现场一根断弦、一只掉落的布鞋、一台被调到 452 赫兹的调音器。身为市局局长的父亲不许她插手；技术科那个说话结巴、却什么细节都不放过的许默，成了她唯一的搭档。她必须靠人物关系、动机和每一种可能性，把碎片拼回那一夜。\n\nA guzheng teacher who can hear fragments of a crime scene's past must reason them into a whole case.",
    tracks: ["调查", "案发当夜", "往事"],
    wordGoal: 150000,
    isDemo: true,
  });
  const pid = project.id;

  const chapters: Chapter[] = CHAPTERS.map((c, i) => {
    const doc = docFromParagraphs(c.text);
    const text = docToPlainText(doc);
    return makeChapter(pid, i, { title: c.title, doc, text, wordCount: countText(text).total, status: c.status, notes: c.notes });
  });
  const [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10] = chapters;

  const sceneText = [
    "【推理板 · 第一个分叉】",
    "调弦的人是死者本人 → 他在等林素十一点来“听音”→ 第七弦是自己调紧的 → 十一点的“铮”是意外 → 死亡时间仍可能在十一点后。",
    "调弦的人是凶手 → 452 是故意的 → “十一点还活着”是被制造出来的 → 真正的死亡时间更早 → 谁在更早的时间里没有不在场证明？",
    "两条路只有一个交点：那双手。指甲很短——制琴的人要留指甲刮漆，弹琴的人才会剪短。",
  ];
  const sceneDoc = docFromParagraphs(sceneText);
  const scene = makeScene(pid, ch5.id, 0, {
    title: "推理板 · 两个分叉",
    summary: "听澜把“谁在调弦”拆成两条推理路径，第一次注意到指甲的细节。",
    doc: sceneDoc,
    text: docToPlainText(sceneDoc),
    wordCount: countText(docToPlainText(sceneDoc)).total,
  });

  // ---------- Characters ----------
  const tl = makeCharacter(pid, {
    name: "宋听澜",
    role: "protagonist",
    position: { x: 420, y: 230 },
    appearance: "二十四岁，长发总是随手挽起；左手指腹常贴着创可贴。",
    background: "在老城区开一间小筝舍教古筝。四岁学筝，第一张琴出自顾明远之手。母亲沈清十二年前去世，死因至今没有说清。",
    personality: "安静、固执，习惯先听完再开口；不擅长解释自己。",
    goals: "证明顾一帆不是凶手，找出那一夜真正发生了什么。",
    motivations: "顾明远是看着她长大的人；更深一层，她想知道自己的能力究竟意味着什么。",
    fears: "怕自己“听见”的东西只是幻觉，像别人说母亲的那样。",
    values: "真相要完整，不能只要一个够用的答案。",
    internalConflicts: "相信碎片 vs. 相信证据；想靠近父亲 vs. 不得不瞒着父亲。",
    externalConflicts: "父亲不许她插手；赵磊视她为外行。",
    memories: "母亲教她的第一首曲子是《渔舟唱晚》，第三小节总是唱得很低。",
    beliefs: "碎片不会撒谎，但会误导。",
    secrets: "能在案发现场“听见”残响——只有碎片，一曲为限，代价是指尖开裂。",
    arc: "从独自承受能力，到学会和一个看得见细节的人一起拼图；从隐瞒父亲，到父亲先开口。",
    customFields: [
      { id: newId(), label: "能力：残响", value: "现场弹奏时触发；只有手、物件、声音、光，看不清脸；没有时间戳；一晚最多两次。" },
      { id: newId(), label: "常弹曲目", value: "《渔舟唱晚》" },
    ],
  });
  const xm = makeCharacter(pid, {
    name: "许默",
    role: "deuteragonist",
    position: { x: 760, y: 250 },
    appearance: "瘦高，戴眼镜，制服永远熨得笔直；随身带牛皮笔记本。",
    background: "市局技术科新人，痕迹检验专业。",
    personality: "软弱、说话结巴、害怕冲突，几乎不会拒绝别人；但对细节有近乎偏执的敏感。",
    goals: "把每一个细节都放到它该在的位置。",
    motivations: "想证明“多看一眼”不是多余。",
    fears: "当众出错；被赵磊训。",
    values: "精确。",
    internalConflicts: "知道自己是对的 vs. 不敢说出来。",
    memories: "笔记本第一页写着：先记下来，再判断。",
    beliefs: "所有东西都有时间，只是有人没去看。",
    secrets: "第二章之后就猜到听澜能“看见”什么，但一直替她保密。",
    arc: "从在门口发抖的人，到在审讯室外第一个说出“至少死了一个小时”的人。",
    notes: "口头禅：“那、那个……我只是多看了一眼。”",
  });
  const sf = makeCharacter(pid, {
    name: "宋国峰",
    role: "supporting",
    position: { x: 420, y: 20 },
    background: "江城市公安局局长，宋听澜的父亲，沈清的丈夫。",
    personality: "克制、强硬，习惯用命令代替解释。",
    goals: "尽快结案；让女儿远离案子。",
    motivations: "保护女儿——用他知道的唯一方式。",
    fears: "女儿走上妻子的路。",
    secrets: "一直知道女儿能“听见”，因为妻子沈清也能。十二年前的事，他知道的比他说的多。",
    arc: "从否认，到在第十章结尾亲口承认。",
  });
  const zl = makeCharacter(pid, {
    name: "赵磊",
    role: "supporting",
    position: { x: 900, y: 60 },
    background: "刑侦支队副队长，宋国峰一手带出来的人。",
    personality: "务实、嘴硬，对“外行”不耐烦，但服证据。",
    goals: "破案。",
  });
  const gmy = makeCharacter(pid, {
    name: "顾明远",
    role: "other",
    position: { x: 420, y: 440 },
    background: "顾氏琴坊主人，制琴四十年。死者。",
    personality: "固执、好面子。",
    secrets: "叶秋的“断纹”手稿在他手里。他曾为沈清做过一张琴，没来得及送出。",
  });
  const yf = makeCharacter(pid, {
    name: "顾一帆",
    role: "minor",
    position: { x: 100, y: 440 },
    background: "顾明远独子，三十二岁，欠赌债四十余万。",
    motivations: "钱；对父亲把琴坊留给外人的怨恨。",
    secrets: "当晚两次来过琴坊：第一次推伤父亲，第二次发现尸体并拿走遗嘱。",
  });
  const ls = makeCharacter(pid, {
    name: "林素",
    role: "minor",
    position: { x: 250, y: 620 },
    background: "顾明远的学徒，跟师八年；新遗嘱的受益人。",
    personality: "手稳，话少，警惕。",
    secrets: "九点半回过琴坊，看见师傅受伤但活着；因为怕被怀疑而隐瞒。",
  });
  const zq = makeCharacter(pid, {
    name: "周启华",
    role: "minor",
    position: { x: 640, y: 620 },
    background: "城南置业经理，半年来反复上门谈收购。",
    motivations: "拿下雨巷地块。",
    notes: "最明显的嫌疑人，也是最早被排除的人。",
  });
  const ch_ = makeCharacter(pid, {
    name: "陈怀远",
    role: "antagonist",
    position: { x: 760, y: 420 },
    appearance: "七十一岁，衣着整洁，指甲剪得很短，左手指尖有弹琴留下的老茧。",
    background: "隔壁的退休音乐老师。亡妻叶秋是县文化馆的制琴师，“断纹”技法的真正创造者。",
    personality: "温和、讲究、教了一辈子书。",
    motivations: "顾明远在报纸上把叶秋的技法写成了自己的。",
    secrets: "当晚十点上门对质，顾明远从阁楼梯子上摔下身亡；他把第七弦调到 452 赫兹，制造“十一点还活着”的假象。",
    arc: "从“好心的证人”到凶手；结尾留下通往沈清之死的线索。",
  });
  const characters = [tl, xm, sf, zl, gmy, yf, ls, zq, ch_];
  // Stable display order (protagonist first) wherever characters are listed by creation time.
  characters.forEach((x, i) => (x.createdAt = x.updatedAt = t + i));

  const rel = (
    sourceId: string,
    targetId: string,
    type: string,
    direction: CharacterRelationship["direction"],
    description: string,
    strength: number | null,
  ): CharacterRelationship => ({ id: newId(), createdAt: t, updatedAt: t, projectId: pid, sourceId, targetId, type, direction, description, strength });
  const relationships = [
    rel(sf.id, tl.id, "父女", "mutual", "他想保护她，也想瞒住她。", 9),
    rel(tl.id, xm.id, "搭档", "mutual", "她看见碎片，他看见细节。", 6),
    rel(sf.id, zl.id, "上下级", "forward", "赵磊是他带出来的人。", 5),
    rel(zl.id, xm.id, "带教（常训他）", "forward", "", 3),
    rel(yf.id, gmy.id, "父子", "mutual", "欠债的儿子，固执的父亲。", 7),
    rel(ls.id, gmy.id, "学徒", "forward", "八年学艺；遗嘱上的继承人。", 8),
    rel(zq.id, gmy.id, "逼迁 / 收购", "forward", "半年七次上门。", 4),
    rel(ch_.id, gmy.id, "宿怨", "forward", "三十年前的“断纹”之争。", 9),
    rel(ls.id, yf.id, "互相提防", "mutual", "", 4),
    rel(gmy.id, tl.id, "制琴人 / 故人之女", "forward", "她的第一张筝是他做的。", 5),
  ];

  const state = (characterId: string, chapterId: string, summary: string, emotionalState: string, vars: [string, string][]): CharacterState => ({
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
    state(tl.id, ch2.id, "第一次在现场弹奏，只拿到三片碎片。", "隐忍", [["体力", "4"], ["对父亲的信任", "6"], ["对许默的信任", "3"]]),
    state(tl.id, ch4.id, "看到许默的笔记本，决定和他搭档。", "被理解", [["体力", "6"], ["对父亲的信任", "5"], ["对许默的信任", "7"]]),
    state(tl.id, ch6.id, "被父亲当面否定；第二次弹奏。", "受伤、倔强", [["体力", "2"], ["对父亲的信任", "2"], ["对许默的信任", "8"]]),
    state(tl.id, ch10.id, "案子拼完；父亲先开了口。", "空落，然后是不安", [["体力", "3"], ["对父亲的信任", "6"], ["对许默的信任", "9"]]),
    state(xm.id, ch1.id, "在现场被赵磊一声咳嗽打断。", "紧张", [["自信", "2"]]),
    state(xm.id, ch4.id, "把笔记本推给听澜。", "鼓起勇气", [["自信", "4"]]),
    state(xm.id, ch8.id, "第四十七分钟，弦断了。", "震动", [["自信", "8"]]),
    state(sf.id, ch1.id, "让女儿别来现场。", "压着", [["对女儿插手的容忍度", "2"]]),
    state(sf.id, ch6.id, "“又是你那套听见？”", "恐惧伪装成强硬", [["对女儿插手的容忍度", "1"]]),
    state(sf.id, ch10.id, "“你能听见，我知道。”", "松动", [["对女儿插手的容忍度", "5"]]),
  ];

  // ---------- Events (chronological truth vs. narrative revelation) ----------
  let c = 0;
  const ev = (narrativeOrder: number, p: Parameters<typeof makeEvent>[3]) => makeEvent(pid, c++, narrativeOrder, p);
  const eYe = ev(11, { title: "叶秋首创“断纹”技法", storyTime: "约三十年前", track: "往事", chapterId: ch9.id, characterIds: [ch_.id], location: "县文化馆", tags: ["动机"] });
  const eYeDie = ev(12, { title: "叶秋病逝，手稿下落不明", storyTime: "约二十八年前", track: "往事", chapterId: ch9.id, characterIds: [ch_.id, gmy.id], causeIds: [eYe.id] });
  const eQing = ev(17, { title: "沈清去世（未解）", storyTime: "十二年前", track: "往事", chapterId: ch10.id, characterIds: [tl.id, sf.id], description: "第二案的入口。", tags: ["主线", "母亲"] });
  const ePaper = ev(10, { title: "晚报专访：顾明远宣称复原“断纹”", storyTime: "案发前两周", track: "往事", chapterId: ch8.id, characterIds: [gmy.id, ch_.id], causeIds: [eYeDie.id], tags: ["动机"] });
  const eZhou = ev(1, { title: "周启华上门谈收购，争吵", storyTime: "9月17日 19:30–20:10", track: "案发当夜", chapterId: ch3.id, characterIds: [zq.id, gmy.id], location: "顾氏琴坊" });
  const ePush = ev(6, { title: "顾一帆要钱，推搡，顾明远额头受伤", storyTime: "9月17日 20:40–21:15", track: "案发当夜", chapterId: ch7.id, characterIds: [yf.id, gmy.id], location: "顾氏琴坊", consequences: "额头伤口；顾一帆第一次离开。" });
  const eLin = ev(4, { title: "林素回琴坊取刻刀，师傅受伤但活着", storyTime: "9月17日 21:30", track: "案发当夜", chapterId: ch5.id, characterIds: [ls.id, gmy.id], causeIds: [ePush.id], consequences: "师傅让她十一点再来听音——她没去。" });
  const eFall = ev(15, { title: "陈怀远上门对质；顾明远从阁楼梯子摔下身亡", storyTime: "9月17日 22:00–22:20", track: "案发当夜", chapterId: ch10.id, characterIds: [ch_.id, gmy.id], location: "顾氏琴坊阁楼", causeIds: [ePaper.id], tags: ["真相"] });
  const eTune = ev(16, { title: "陈怀远把第七弦调到 452 赫兹，布置现场", storyTime: "9月17日 22:30", track: "案发当夜", chapterId: ch10.id, characterIds: [ch_.id], causeIds: [eFall.id], consequences: "制造“十一点还活着”的假象。", tags: ["诡计"] });
  const eStore = ev(3, { title: "陈怀远在便利店买烟（不在场证明）", storyTime: "9月17日 22:55–23:10", track: "案发当夜", chapterId: ch3.id, characterIds: [ch_.id], causeIds: [eTune.id] });
  const eSnap = ev(2, { title: "第七弦崩断，楼上租客听见“琴声”", storyTime: "9月17日 23:00", track: "案发当夜", chapterId: ch3.id, characterIds: [], causeIds: [eTune.id], tags: ["误导"] });
  const eReturn = ev(7, { title: "顾一帆返回，发现尸体，拿走遗嘱逃离", storyTime: "9月17日 23:20", track: "案发当夜", chapterId: ch7.id, characterIds: [yf.id], causeIds: [ePush.id, eFall.id], consequences: "“冰的。冰得不像刚出事。”" });
  const eFound = ev(0, { title: "林素清晨发现尸体报警", storyTime: "9月18日 清晨", track: "调查", chapterId: ch1.id, characterIds: [ls.id, tl.id, xm.id, zl.id], causeIds: [eFall.id] });
  const eArrest = ev(5, { title: "顾一帆在服务区被捕", storyTime: "9月20日", track: "调查", chapterId: ch6.id, characterIds: [yf.id, sf.id, zl.id], causeIds: [eReturn.id] });
  const eExp = ev(8, { title: "许默复现断弦：第四十七分钟", storyTime: "9月21日", track: "调查", chapterId: ch8.id, characterIds: [xm.id, tl.id], causeIds: [eSnap.id], tags: ["实验"] });
  const ePaperFound = ev(9, { title: "废纸篓里的晚报与“叶秋”二字", storyTime: "9月21日", track: "调查", chapterId: ch8.id, characterIds: [xm.id], causeIds: [ePaper.id] });
  const eConfront = ev(13, { title: "听澜以走调的第三小节试探陈怀远", storyTime: "9月22日", track: "调查", chapterId: ch9.id, characterIds: [tl.id, ch_.id, xm.id, zl.id], causeIds: [eExp.id, ePaperFound.id] });
  const eTruth = ev(14, { title: "琴坊对质，全案还原", storyTime: "9月23日", track: "调查", chapterId: ch10.id, characterIds: [tl.id, xm.id, sf.id, zl.id, ch_.id], causeIds: [eConfront.id] });

  // Subjective time: the order in which 听澜 "heard" the night.
  eFall.subjective = { [tl.id]: { order: 0, note: "碎片 B：梯子在晃，布鞋落下（第二章）" } };
  eTune.subjective = { [tl.id]: { order: 1, note: "碎片 A：拧琴轸的老人的手（第二章）；碎片 E：452（第六章）" } };
  eReturn.subjective = { [tl.id]: { order: 2, note: "碎片 D：攥着纸摔门而出的年轻人（第六章）——起初以为是第一次离开" } };
  ePush.subjective = { [tl.id]: { order: 3, note: "没有碎片；第七章从审讯里才知道" } };
  eQing.subjective = { [tl.id]: { order: 4, note: "她从未“听见”过母亲的那一晚。" } };

  const events = [eYe, eYeDie, eQing, ePaper, eZhou, ePush, eLin, eFall, eTune, eStore, eSnap, eReturn, eFound, eArrest, eExp, ePaperFound, eConfront, eTruth];
  // Chronological order = creation order above; narrative order = the chapter in which readers learn each event.

  // ---------- Knowledge Matrix ----------
  const fTime = makeFact(pid, 0, { title: "顾明远死于 22 点左右，而非 23 点之后", category: "fact", eventId: eFall.id });
  const fString = makeFact(pid, 1, { title: "23 点的“琴声”是过紧的弦自己崩断", category: "clue", eventId: eSnap.id, description: "452 赫兹 + 琴码后移三毫米。" });
  const fTwice = makeFact(pid, 2, { title: "顾一帆当晚两次来过琴坊", category: "fact", eventId: eReturn.id });
  const fLin = makeFact(pid, 3, { title: "林素 21:30 见过受伤但活着的师傅", category: "secret", eventId: eLin.id });
  const fYe = makeFact(pid, 4, { title: "叶秋才是“断纹”技法的创造者", category: "secret", eventId: eYe.id, description: "陈怀远的动机。" });
  const fGift = makeFact(pid, 5, { title: "宋听澜能在现场“听见”残响", category: "secret" });
  const fQing = makeFact(pid, 6, { title: "“赠清”琴是为听澜母亲沈清做的", category: "clue", eventId: eQing.id });
  const facts = [fTime, fString, fTwice, fLin, fYe, fGift, fQing];

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
  const R = READER_AGENT;
  const knowledge: KnowledgeState[] = [
    ...facts.map((f) => k(f.id, AUTHOR_AGENT, ch1.id, "known")),
    // 死亡时间
    k(fTime.id, ch_.id, ch1.id, "known", "他就在现场。"),
    k(fTime.id, zl.id, ch3.id, "misunderstood", "相信了“十一点还听见琴声”。"),
    k(fTime.id, zl.id, ch9.id, "known", "看过实验报告后才改口。"),
    k(fTime.id, sf.id, ch3.id, "misunderstood", "据此下令先查顾一帆。"),
    k(fTime.id, sf.id, ch10.id, "known"),
    k(fTime.id, tl.id, ch4.id, "suspected", "许默的五条笔记 + 碎片顺序对不上。"),
    k(fTime.id, tl.id, ch8.id, "known", "第四十七分钟。"),
    k(fTime.id, xm.id, ch4.id, "suspected"),
    k(fTime.id, xm.id, ch8.id, "known"),
    k(fTime.id, yf.id, ch7.id, "suspected", "“冰的。冰得不像刚出事。”"),
    k(fTime.id, R, ch3.id, "misunderstood", "读者和警方一起接受了 23 点。"),
    k(fTime.id, R, ch7.id, "suspected"),
    k(fTime.id, R, ch8.id, "known"),
    // 断弦
    k(fString.id, ch_.id, ch1.id, "known"),
    k(fString.id, xm.id, ch1.id, "suspected", "“断口不太对。”"),
    k(fString.id, xm.id, ch8.id, "known"),
    k(fString.id, tl.id, ch3.id, "suspected", "“断弦也会响。”"),
    k(fString.id, tl.id, ch8.id, "known"),
    k(fString.id, zl.id, ch9.id, "known"),
    k(fString.id, sf.id, ch6.id, "suspected", "他去技术科看了那台调音器很久。"),
    k(fString.id, sf.id, ch10.id, "known"),
    k(fString.id, R, ch3.id, "suspected"),
    k(fString.id, R, ch8.id, "known"),
    // 两次来访
    k(fTwice.id, yf.id, ch1.id, "known"),
    k(fTwice.id, ls.id, ch5.id, "suspected", "只知道第一次：“一帆来过，又是要钱。”"),
    k(fTwice.id, tl.id, ch7.id, "known", "把碎片 D 放进 23:20 之后。"),
    k(fTwice.id, xm.id, ch7.id, "known"),
    k(fTwice.id, zl.id, ch7.id, "known"),
    k(fTwice.id, sf.id, ch7.id, "known"),
    k(fTwice.id, R, ch6.id, "suspected", "碎片 D 的“第一次还是第二次”。"),
    k(fTwice.id, R, ch7.id, "known"),
    // 林素
    k(fLin.id, ls.id, ch1.id, "known"),
    k(fLin.id, tl.id, ch5.id, "known"),
    k(fLin.id, xm.id, ch5.id, "known"),
    k(fLin.id, zl.id, ch7.id, "known"),
    k(fLin.id, R, ch5.id, "known"),
    // 叶秋
    k(fYe.id, ch_.id, ch1.id, "known"),
    k(fYe.id, xm.id, ch8.id, "suspected", "报纸上的“叶秋”二字。"),
    k(fYe.id, xm.id, ch9.id, "known"),
    k(fYe.id, tl.id, ch8.id, "suspected"),
    k(fYe.id, tl.id, ch9.id, "known"),
    k(fYe.id, zl.id, ch10.id, "known"),
    k(fYe.id, sf.id, ch10.id, "known"),
    k(fYe.id, R, ch8.id, "suspected"),
    k(fYe.id, R, ch9.id, "known"),
    // 能力
    k(fGift.id, tl.id, ch1.id, "known"),
    k(fGift.id, xm.id, ch2.id, "suspected", "看见她弹到指尖出血。"),
    k(fGift.id, xm.id, ch4.id, "known", "她亲口说：“一双在调弦的手。”"),
    k(fGift.id, sf.id, ch1.id, "suspected", "因为沈清也是。他一直知道，只是不说。"),
    k(fGift.id, sf.id, ch10.id, "known"),
    k(fGift.id, ch_.id, ch9.id, "known", "“你和你妈妈一样。”"),
    k(fGift.id, zl.id, ch10.id, "suspected"),
    k(fGift.id, R, ch2.id, "known"),
    // 赠清
    k(fQing.id, sf.id, ch1.id, "known"),
    k(fQing.id, ch_.id, ch1.id, "known"),
    k(fQing.id, tl.id, ch1.id, "suspected", "母亲叫沈清。"),
    k(fQing.id, tl.id, ch10.id, "known"),
    k(fQing.id, R, ch1.id, "suspected"),
    k(fQing.id, R, ch10.id, "known"),
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
    act(ch_.id, ch3.id, fTime.id, "对警方说“十一点还听见琴声，老顾那时还活着”", "known"),
    act(ls.id, ch3.id, fLin.id, "向警方隐瞒自己 21:30 回过琴坊", "known"),
    act(sf.id, ch6.id, fTime.id, "以 23 点后死亡为前提逮捕顾一帆", "unknown"),
    act(sf.id, ch6.id, fGift.id, "嘲讽听澜“又是你那套听见”", "aware"),
    act(xm.id, ch6.id, fGift.id, "替听澜在琴坊门外放风", "aware"),
    act(zl.id, ch8.id, fTime.id, "按 22 点重新排查所有人的不在场证明", "known"),
  ];

  const m = (chapterId: string, v: [number, number, number, number, number, number], note = ""): ReaderExperienceMetric => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    chapterId,
    sceneId: null,
    values: { emotionalIntensity: v[0], tension: v[1], suspense: v[2], uncertainty: v[3], informationDensity: v[4], pacing: v[5] },
    source: "author",
    note,
  });
  const metrics = [
    m(ch1.id, [4, 5, 6, 7, 5, 4], "三个异常，不解释。"),
    m(ch2.id, [6, 6, 7, 8, 4, 3], "能力第一次出现，慢下来。"),
    m(ch3.id, [3, 5, 6, 7, 9, 5], "信息最密的一章。"),
    m(ch4.id, [4, 5, 6, 6, 8, 4]),
    m(ch5.id, [6, 5, 6, 7, 6, 4]),
    m(ch6.id, [8, 7, 7, 7, 5, 6], "父女冲突。"),
    m(ch7.id, [7, 8, 7, 6, 7, 7], "转折：冰的。"),
    m(ch8.id, [6, 7, 8, 5, 8, 8]),
    m(ch9.id, [8, 8, 9, 4, 6, 6], "试探。"),
    m(ch10.id, [9, 7, 6, 3, 8, 7], "收束第一案，打开第二案。"),
  ];

  const fs = (
    description: string,
    intro: Chapter | null,
    expected: Chapter | null,
    actual: Chapter | null,
    status: ForeshadowingStatus,
    characterIds: string[],
    eventIds: string[],
  ): Foreshadowing => ({
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: pid,
    description,
    introducedChapterId: intro?.id ?? null,
    expectedPayoffChapterId: expected?.id ?? null,
    actualPayoffChapterId: actual?.id ?? null,
    status,
    characterIds,
    eventIds,
  });
  const foreshadowing = [
    fs("断掉的第七弦（第一章）", ch1, ch8, ch8, "paid-off", [xm.id, ch_.id], [eSnap.id, eExp.id]),
    fs("唱低的第三小节（碎片 C）", ch2, ch9, ch9, "paid-off", [tl.id, ch_.id], [eConfront.id]),
    fs("调音器上的 452", ch4, ch8, ch8, "paid-off", [xm.id, ch_.id], [eTune.id]),
    fs("“断弦也会响”", ch3, ch8, ch8, "paid-off", [tl.id], [eSnap.id]),
    fs("父亲：“你妈当年也总说她能听见。”", ch6, ch10, ch10, "paid-off", [sf.id, tl.id], [eQing.id]),
    fs("筝尾刻字“赠清”", ch1, null, null, "reinforced", [tl.id, gmy.id, sf.id], [eQing.id]),
    fs("“你和你妈妈一样。”——陈怀远认识沈清？", ch9, null, null, "planted", [ch_.id, tl.id], [eQing.id]),
  ];

  const notes = [
    makeNote(pid, {
      title: "能力规则：残响（设定）",
      body:
        "1. 只在“现场”生效：必须在事情发生的地方弹奏。\n2. 一曲为限：通常撑不完一首，曲子停，画面就停。\n3. 只有碎片：没有时间戳、没有顺序；看不清脸——只有手、物件、声音、光。\n4. 代价：指尖开裂、头痛，一晚最多两次。\n5. 碎片不会撒谎，但会误导：它只给“发生过什么”，不给“为什么”和“什么时候”。\n\n→ 所以她必须靠人物关系、动机和细节，把碎片排进时间线。能力是方向，推理才是证据。",
      kind: "idea",
      tags: ["设定", "能力"],
      pinned: true,
    }),
    makeNote(pid, {
      title: "残响碎片清单",
      body:
        "A 拧琴轸的老人的手，指甲很短（第二章）→ 陈怀远（弹琴的人才剪短指甲）\nB 阁楼梯子在晃，布鞋落下（第二章）→ 22:20\nC 雨里有人哼《渔舟唱晚》，第三小节唱低（第二章）→ 叶秋教的老谱\nD 年轻男人攥着纸摔门而出（第六章）→ 顾一帆第二次离开，23:20 后\nE 调音器屏幕 A4＝452Hz（第六章）→ 布置现场",
      kind: "visual",
      tags: ["残响", "线索"],
      pinned: true,
      chapterIds: [ch2.id, ch6.id],
    }),
    makeNote(pid, {
      title: "推理板：四种可能",
      body:
        "① 意外（警方初判）：梯子、雨夜、老人。→ 解释不了 452。\n② 顾一帆：钱 + 遗嘱 + 袖口血迹。→ 解释不了“冰的”。\n③ 林素：遗嘱受益人，隐瞒行踪。→ 她九点半看见师傅活着，没有理由说出来害自己。\n④ 第三个人：会调弦、懂调音器、需要一个 23 点的不在场证明。→ 陈怀远。",
      kind: "plot",
      tags: ["推理"],
      chapterIds: [ch5.id, ch7.id],
    }),
    makeNote(pid, { title: "许默的口头禅", body: "“那、那个……我只是多看了一眼。”", kind: "dialogue", tags: ["许默"] }),
    makeNote(pid, {
      title: "TODO：赵磊第八章的行动太早",
      body: "Knowledge Matrix 提醒：赵磊在第八章末就按 22 点重排不在场证明，但他第九章才确认死亡时间。要么第八章让许默当面说服他，要么把这个动作挪到第九章开头。",
      kind: "question",
      tags: ["TODO", "一致性"],
      chapterIds: [ch8.id],
    }),
    makeNote(pid, {
      title: "主线：沈清之死",
      body: "十二年前。父亲知道她能“听见”；顾明远“欠她一样东西”；陈怀远认识她。第二案从“赠清”这张琴开始——琴本该在她出事那年送到。",
      kind: "question",
      tags: ["主线", "母亲"],
      chapterIds: [ch10.id],
    }),
    makeNote(pid, {
      title: "452 赫兹 research",
      body: "标准音 A4＝440Hz（乐团常用 442）。按 452 调弦约高 45 音分，接近半音。弦长不变时张力随频率平方增长：(452/440)² ≈ 1.055，单根弦多承受约 5.5% 张力；配合琴码后移、湿度变化，旧弦可能在短时间内崩断。（小说处理，细节可再核实。）",
      kind: "research",
      tags: ["古筝", "核实"],
      chapterIds: [ch4.id, ch8.id],
    }),
  ];

  project.lastDocId = ch1.id;
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
