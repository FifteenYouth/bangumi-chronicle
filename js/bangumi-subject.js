/**
 * Bangumi Redesign - Subject Page Preview Interaction Script
 * 职责：
 * 1. 动态挂载与渲染条目真实数据 (400602 芙莉莲 / 265 EVA / 253 星际牛仔)
 * 2. 交互式 10 级评分器 (波浪弹性悬浮 + 爆破点击星动效 + 实时文案弹性跳动)
 * 3. 全站评分透视：仿照原版 10~1 竖向立柱直方图与水平明细双模切换 + 实时分段侦测
 * 4. 关联企划与音乐：分类筛选 (原作/音乐/衍生) + 高保真封面 + 创作者副标题与条目评分
 * 5. 漫友吐槽箱：漫画气泡对话卡片 + 专属小尾巴 + 快捷标签发射台 + "贴贴"浮空粒子动效
 * 6. 收藏盒 5 态切换与章节打卡矩阵
 */

(function () {
  'use strict';

  // 内置预设数据（确保在本地 file:// 协议或任何环境下 100% 完美无死角运行）
  const DEFAULT_SUBJECTS = {
    "400602": {
      id: 400602,
      name: "葬送のフリーレン",
      name_cn: "葬送的芙莉莲",
      type: 2,
      type_label: "TV 动画 · 2023年10月番",
      rank: 43,
      rating: {
        score: 8.5,
        total: 36832,
        desc: "力荐 (Great)",
        standard_deviation: 1.14
      },
      eps: 28,
      date: "2023-09-29",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/d0/58/400602_d8U89.jpg",
        common: "https://lain.bgm.tv/pic/cover/c/d0/58/400602_d8U89.jpg"
      },
      summary: "魔王被勇者一行人打倒，世界迎来了和平。作为长寿的精灵魔法使芙莉莲，在与勇者辛美尔等人约定五十年后再相见后独自踏上旅行……\n五十年后，当她再度与故人重聚时，辛美尔已是白发苍苍的老人，并不久后离世。在辛美尔的葬礼上，芙莉莲为自己未曾真正去了解人类而流下悔恨的眼泪。\n为了“了解人类”，芙莉莲带着新收的徒弟菲伦，再次踏上巡礼这片曾经走过的大陆的旅途。",
      infobox: [
        { key: "中文名", val: "葬送的芙莉莲" },
        { key: "话数", val: "28 话" },
        { key: "放送开始", val: "2023年9月29日" },
        { key: "原作", val: "山田鐘人、アベツカサ" },
        { key: "导演", val: "斎藤圭一郎" },
        { key: "脚本", val: "鈴木智尋" },
        { key: "音乐", val: "Evan Call" },
        { key: "人物设定", val: "長澤礼子" },
        { key: "系列构成", val: "鈴木智尋" },
        { key: "动画制作", val: "MADHOUSE" }
      ],
      tags: [
        { name: "2023年10月", count: 4210 },
        { name: "MADHOUSE", count: 3580 },
        { name: "奇幻", count: 3120 },
        { name: "公路片", count: 2890 },
        { name: "治愈", count: 2450 },
        { name: "漫画改", count: 2190 },
        { name: "斋藤圭一郎", count: 1840 },
        { name: "EvanCall", count: 1620 }
      ],
      collection: {
        wish: 5120,
        collect: 26840,
        doing: 4872,
        on_hold: 620,
        dropped: 380
      },
      chart_bars: [
        { star: 10, percent: 20.49, count: 7547 },
        { star: 9, percent: 35.36, count: 13024 },
        { star: 8, percent: 29.04, count: 10695 },
        { star: 7, percent: 10.21, count: 3759 },
        { star: 6, percent: 2.99, count: 1102 },
        { star: 5, percent: 1.03, count: 380 },
        { star: 4, percent: 0.39, count: 142 },
        { star: 3, percent: 0.21, count: 78 },
        { star: 2, percent: 0.12, count: 45 },
        { star: 1, percent: 0.16, count: 60 }
      ],
      characters: [
        { name: "芙莉莲 (Frieren)", cv: "种崎敦美", role: "主角 / 魔法使", img: "https://lain.bgm.tv/pic/crt/m/68/72/107767_crt_fFF33.jpg" },
        { name: "菲伦 (Fern)", cv: "市之濑加那", role: "主角 / 弟子", img: "https://lain.bgm.tv/pic/crt/m/3b/b1/107768_crt_9L46a.jpg" },
        { name: "修尔克 (Stark)", cv: "小林千晃", role: "主角 / 战士", img: "https://lain.bgm.tv/pic/crt/m/31/3c/107769_crt_x2J6p.jpg" },
        { name: "辛美尔 (Himmel)", cv: "冈本信彦", role: "配角 / 勇者", img: "https://lain.bgm.tv/pic/crt/m/a2/e2/107770_crt_39n2y.jpg" },
        { name: "海塔 (Heiter)", cv: "东地宏树", role: "配角 / 僧侣", img: "https://lain.bgm.tv/pic/crt/m/2e/52/107771_crt_62xYy.jpg" },
        { name: "艾泽 (Eisen)", cv: "上田耀司", role: "配角 / 战士", img: "https://lain.bgm.tv/pic/crt/m/17/dc/107772_crt_z2Y92.jpg" }
      ],
      comments: [
        { user: "ner35", avatar: "https://lain.bgm.tv/pic/user/l/000/28/76/287622.jpg", star: 8, time: "17h ago", text: "后面魔法考核的设定越来越像传统少年漫，要是能一直保持前期的公路片公路行就好了。Evan Call的配乐一如既往出色。", likes: 42, vibe: "公路片情怀" },
        { user: "kamitsure", avatar: "https://lain.bgm.tv/pic/user/l/000/03/90/39066.jpg", star: 9, time: "1天前", text: "对于时间流逝的刻画入木三分。齐藤圭一郎对节奏和长镜头的把控太强了，辛美尔的每一个笑容都让人释怀又落泪。", likes: 78, vibe: "神作泪目" },
        { user: "月光旅人", avatar: "https://lain.bgm.tv/pic/user/l/000/31/45/314520.jpg", star: 9, time: "2天前", text: "勇者辛美尔已经不在了，但辛美尔所留下的勇气和温柔，早已随风吹遍了整个大陆。", likes: 119, vibe: "辛美尔太温柔" },
        { user: "Acacia", avatar: "https://lain.bgm.tv/pic/user/l/000/51/02/510204.jpg", star: 8, time: "3天前", text: "制作水平毫无疑问是年霸级别。动画给漫画原作注入了无比生动的灵魂与动作细节。", likes: 35, vibe: "年霸制作" },
        { user: "魔法使学徒", avatar: "https://lain.bgm.tv/pic/user/l/000/12/34/123456.jpg", star: 10, time: "4天前", text: "第9集阿乌拉天平战是今年看过的最燃文戏！完全不需要多余废话，一句‘阿乌拉，自刎吧’直接封神！", likes: 96, vibe: "阿乌拉自刎" }
      ],
      reviews: [
        {
          title: "时间的旅者与回忆的锚点：从葬送看后史诗叙事的胜利",
          user: "晨曦微露",
          avatar: "https://lain.bgm.tv/pic/user/l/000/86/32/863286_21e8Z.jpg",
          star: 9,
          time: "2026-10-25",
          summary: "魔王被打倒后的故事并不罕见，但《葬送的芙莉莲》以极其从容的姿态把冒险的意义从‘抵达终点’转向了‘感受过程’。长寿者的哀伤并非痛哭流涕，而是漫不经心发现每一处故人足迹时的静默……"
        },
        {
          title: "辛美尔，哪怕百年之后，你依然活在芙莉莲的魔法之中",
          user: "光影漫步",
          avatar: "https://lain.bgm.tv/pic/user/l/000/52/00/520087.jpg",
          star: 10,
          time: "2026-10-18",
          summary: "芙莉莲寻找的花田魔法、整理铜像的顽皮咒语，在最初看来不过是微不足道的爱好。直到后来我们才明白，这些看似无用的魔法，都是辛美尔为了不让她在未来的漫长孤独中遗忘他们而种下的锚点。"
        }
      ],
      topics: [
        { title: "芙莉莲第一季完结，讨论一下制作水准在动画史上的定位", user: "动漫研究社", replies: 184, time: "09-12" },
        { title: "漫画第130话更新讨论：关于黄金乡篇章的哲学隐喻", user: "黑麦草", replies: 92, time: "10-04" },
        { title: "Evan Call 原声带 OST 全球巡演北京站观后感", user: "音符跳跃", replies: 47, time: "10-28" }
      ],
      relations: [
        {
          id: 307485,
          title: "葬送のフリーレン (漫画)",
          category: "manga",
          tag: "原作漫画",
          tagClass: "tag-cat-manga",
          subtitle: "山田钟人 / 阿部司 · 连载中",
          score: 9.1,
          cover: "https://lain.bgm.tv/pic/cover/m/a1/39/307485_4x12N.jpg",
          fallbackSvg: "linear-gradient(135deg, #059669, #10b981)"
        },
        {
          id: 454988,
          title: "勇者 (YOASOBI 单曲)",
          category: "music",
          tag: "片头曲 OP",
          tagClass: "tag-cat-op",
          subtitle: "YOASOBI · 2023.09",
          score: 8.6,
          cover: "https://lain.bgm.tv/pic/cover/m/17/74/454988_zS6u5.jpg",
          fallbackSvg: "linear-gradient(135deg, #e11d48, #f43f5e)"
        },
        {
          id: 454992,
          title: "Anytime Anywhere (milet)",
          category: "music",
          tag: "片尾曲 ED",
          tagClass: "tag-cat-ed",
          subtitle: "milet · 2023.10",
          score: 8.4,
          cover: "https://lain.bgm.tv/pic/cover/m/26/b9/454992_4kR01.jpg",
          fallbackSvg: "linear-gradient(135deg, #2563eb, #3b82f6)"
        },
        {
          id: 476288,
          title: "TV 动画 原声音乐集 OST",
          category: "music",
          tag: "原声集 OST",
          tagClass: "tag-cat-ost",
          subtitle: "Evan Call · 70首双CD",
          score: 9.2,
          cover: "https://lain.bgm.tv/pic/cover/m/b5/1d/476288_v9Z1k.jpg",
          fallbackSvg: "linear-gradient(135deg, #d97706, #f59e0b)"
        }
      ]
    },
    "265": {
      id: 265,
      name: "新世紀エヴァンゲリオン",
      name_cn: "新世纪福音战士",
      type: 2,
      type_label: "TV 动画 · 1995年10月番",
      rank: 3,
      rating: {
        score: 8.7,
        total: 29840,
        desc: "神作 (Masterpiece)",
        standard_deviation: 1.35
      },
      eps: 26,
      date: "1995-10-04",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/d0/58/265_38N82.jpg",
        common: "https://lain.bgm.tv/pic/cover/c/d0/58/265_38N82.jpg"
      },
      summary: "突袭世界的大灾难“第二次冲击”后，世界在废墟中重建。14岁少年碇真嗣被多年未见的父亲碇源堂召唤至第三新东京市的地下都市NERV，在毫无心理准备的情况下被要求驾驶泛用人型决战兵器EVANGELION初号机迎击来袭的未知生命体“使徒”……\n面对内心的恐惧、人与人之间无法逾越的“绝对领域（A.T. Field）”，真嗣在痛苦、迷茫与自我反思中寻求生存与救赎的真正意义。",
      infobox: [
        { key: "中文名", val: "新世纪福音战士" },
        { key: "话数", val: "26 话" },
        { key: "放送开始", val: "1995年10月4日" },
        { key: "导演", val: "庵野秀明" },
        { key: "人物设定", val: "贞本义行" },
        { key: "机械设定", val: "山下いくと、山内則康" },
        { key: "音乐", val: "鹭巢诗郎" },
        { key: "动画制作", val: "GAINAX / 龙之子" }
      ],
      tags: [
        { name: "EVA", count: 5420 },
        { name: "神作", count: 4890 },
        { name: "庵野秀明", count: 4320 },
        { name: "GAINAX", count: 3950 },
        { name: "心理", count: 3200 },
        { name: "机战", count: 2890 },
        { name: "1995", count: 2450 }
      ],
      collection: {
        wish: 3200,
        collect: 24500,
        doing: 2100,
        on_hold: 420,
        dropped: 310
      },
      chart_bars: [
        { star: 10, percent: 32.50, count: 9698 },
        { star: 9, percent: 31.20, count: 9310 },
        { star: 8, percent: 21.40, count: 6385 },
        { star: 7, percent: 8.90, count: 2655 },
        { star: 6, percent: 3.10, count: 925 },
        { star: 5, percent: 1.40, count: 417 },
        { star: 4, percent: 0.60, count: 179 },
        { star: 3, percent: 0.35, count: 104 },
        { star: 2, percent: 0.25, count: 74 },
        { star: 1, percent: 0.30, count: 93 }
      ],
      characters: [
        { name: "碇真嗣 (Shinji Ikari)", cv: "绪方惠美", role: "主角 / 初号机驾驶员", img: "https://lain.bgm.tv/pic/crt/m/6c/42/1531_crt_Bbx67.jpg" },
        { name: "绫波丽 (Rei Ayanami)", cv: "林原惠", role: "主角 / 零号机驾驶员", img: "https://lain.bgm.tv/pic/crt/m/17/dc/1532_crt_Yd2Fz.jpg" },
        { name: "明日香 (Asuka Langley)", cv: "宫村优子", role: "主角 / 贰号机驾驶员", img: "https://lain.bgm.tv/pic/crt/m/3b/b1/1533_crt_88t80.jpg" },
        { name: "葛城美里 (Misato Katsuragi)", cv: "三石琴乃", role: "配角 / 作战部长", img: "https://lain.bgm.tv/pic/crt/m/31/3c/1534_crt_39n2y.jpg" }
      ],
      comments: [
        { user: "使徒袭来", avatar: "https://lain.bgm.tv/pic/user/l/000/11/22/112233.jpg", star: 10, time: "1天前", text: "永远的初恋与无法超越的动画丰碑。庵野秀明把全人类的潜意识绝望彻底撕裂给你看。", likes: 165, vibe: "世纪神作" },
        { user: "第三少年", avatar: "https://lain.bgm.tv/pic/user/l/000/44/55/445566.jpg", star: 9, time: "2天前", text: "不能逃避，不能逃避……这句话支撑了无数人走出自闭与迷茫的青春期。", likes: 88, vibe: "不能逃避" }
      ],
      reviews: [
        {
          title: "真嗣为什么不愿坐上初号机：关于自我防卫机制的精神分析",
          user: "心理观察站",
          avatar: "https://lain.bgm.tv/pic/user/l/000/77/88/778899.jpg",
          star: 10,
          time: "2026-09-12",
          summary: "很多人批评真嗣的懦弱，却未曾察觉他所背负的是怎样一种绝对冷酷的父权投射与毁灭性世界。"
        }
      ],
      topics: [
        { title: "旧剧场版 Air/真心为你 与 TV 版 25-26 话在叙事维度的对应关系分析", user: "使徒观察员", replies: 310, time: "09-20" }
      ],
      relations: [
        {
          id: 266,
          title: "新世纪福音战士剧场版 Air/真心为你",
          category: "anime",
          tag: "完结剧场版",
          tagClass: "tag-cat-anime",
          subtitle: "庵野秀明 · 1997.07",
          score: 9.0,
          cover: "https://lain.bgm.tv/pic/cover/m/a0/21/266_NqFqN.jpg",
          fallbackSvg: "linear-gradient(135deg, #7c3aed, #8b5cf6)"
        },
        {
          id: 3211,
          title: "残酷な天使のテーゼ",
          category: "music",
          tag: "片头曲 OP",
          tagClass: "tag-cat-op",
          subtitle: "高桥洋子 · 1995.10",
          score: 9.3,
          cover: "https://lain.bgm.tv/pic/cover/m/66/12/3211_bK78v.jpg",
          fallbackSvg: "linear-gradient(135deg, #e11d48, #f43f5e)"
        },
        {
          id: 864,
          title: "新世紀エヴァンゲリオン (漫画)",
          category: "manga",
          tag: "原作漫画",
          tagClass: "tag-cat-manga",
          subtitle: "贞本义行 · 全14卷",
          score: 8.6,
          cover: "https://lain.bgm.tv/pic/cover/m/6a/dc/864_D1eP2.jpg",
          fallbackSvg: "linear-gradient(135deg, #059669, #10b981)"
        }
      ]
    },
    "253": {
      id: 253,
      name: "カウボーイビバップ",
      name_cn: "星际牛仔",
      type: 2,
      type_label: "TV 动画 · 1998年4月番",
      rank: 1,
      rating: {
        score: 9.1,
        total: 24900,
        desc: "神作 (Masterpiece)",
        standard_deviation: 1.05
      },
      eps: 26,
      date: "1998-04-03",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/7d/52/253_S70g1.jpg",
        common: "https://lain.bgm.tv/pic/cover/c/7d/52/253_S70g1.jpg"
      },
      summary: "2071年，随着超光速航行技术的突破，人类活动范围拓展至整个太阳系。然而恶性犯罪亦日益猖獗，赏金猎人制度随之复兴。驾驶老旧改造渔船“Bebop号”的前黑帮杀手斯派克·斯皮格尔与前警官杰特·布莱克，在星际漫游中相继结识了嗜赌如命的美女骗子菲·瓦伦丁、天才黑客少女艾德以及高智商数据犬爱因……\n五个各怀心事与过去的游侠，在爵士乐与香烟缭绕的太空角落里，谱写着属于成年人的浪漫与无常。",
      infobox: [
        { key: "中文名", val: "星际牛仔" },
        { key: "话数", val: "26 话" },
        { key: "放送开始", val: "1998年4月3日" },
        { key: "导演", val: "渡边信一郎" },
        { key: "系列构成", val: "信本敬子" },
        { key: "音乐", val: "菅野洋子" },
        { key: "人物设定", val: "川元利浩" },
        { key: "动画制作", val: "SUNRISE" }
      ],
      tags: [
        { name: "SUNRISE", count: 4210 },
        { name: "渡边信一郎", count: 3990 },
        { name: "菅野洋子", count: 3750 },
        { name: "神作", count: 3620 },
        { name: "爵士", count: 3100 },
        { name: "硬汉", count: 2680 },
        { name: "1998", count: 2400 }
      ],
      collection: {
        wish: 2400,
        collect: 21000,
        doing: 1540,
        on_hold: 310,
        dropped: 190
      },
      chart_bars: [
        { star: 10, percent: 43.10, count: 10731 },
        { star: 9, percent: 34.60, count: 8615 },
        { star: 8, percent: 16.20, count: 4033 },
        { star: 7, percent: 4.50, count: 1120 },
        { star: 6, percent: 1.00, count: 249 },
        { star: 5, percent: 0.30, count: 74 },
        { star: 4, percent: 0.12, count: 30 },
        { star: 3, percent: 0.08, count: 20 },
        { star: 2, percent: 0.04, count: 10 },
        { star: 1, percent: 0.06, count: 18 }
      ],
      characters: [
        { name: "斯派克·斯皮格尔", cv: "山寺宏一", role: "主角 / 赏金猎人", img: "https://lain.bgm.tv/pic/crt/m/68/72/1_crt_Bbx67.jpg" },
        { name: "杰特·布莱克", cv: "石冢运升", role: "主角 / Bebop船长", img: "https://lain.bgm.tv/pic/crt/m/3b/b1/2_crt_9L46a.jpg" },
        { name: "菲·瓦伦丁", cv: "林原惠", role: "主角 / 赌徒赏金猎人", img: "https://lain.bgm.tv/pic/crt/m/31/3c/3_crt_x2J6p.jpg" }
      ],
      comments: [
        { user: "火星牛仔", avatar: "https://lain.bgm.tv/pic/user/l/000/66/77/667788.jpg", star: 10, time: "3天前", text: "Bangumi 排名第一名副其实。每一秒每一帧都在散发着无可救药的浪漫。Bang!", likes: 210, vibe: "男人的浪漫" }
      ],
      reviews: [
        {
          title: "一只眼睛看过去，一只眼睛看现在：论斯派克的宿命",
          user: "萨克斯风手",
          avatar: "https://lain.bgm.tv/pic/user/l/000/99/00/990011.jpg",
          star: 10,
          time: "2026-10-01",
          summary: "斯派克常说他的一只眼睛看着现在，另一只眼睛看着过去。当我们终于看到他走向宿命的那一刻，才懂得什么叫真正的从容不迫……"
        }
      ],
      topics: [
        { title: "盘点 Bebop 每一集出现的爵士乐与摇滚乐原型曲目考据", user: "黑胶唱片客", replies: 198, time: "10-15" }
      ],
      relations: [
        {
          id: 254,
          title: "星际牛仔 天国之扉 (剧场版)",
          category: "anime",
          tag: "剧场版",
          tagClass: "tag-cat-anime",
          subtitle: "渡边信一郎 · 2001.09",
          score: 8.9,
          cover: "https://lain.bgm.tv/pic/cover/m/d4/01/254_31Z81.jpg",
          fallbackSvg: "linear-gradient(135deg, #7c3aed, #8b5cf6)"
        },
        {
          id: 1042,
          title: "Tank! (菅野洋子 单曲)",
          category: "music",
          tag: "片头曲 OP",
          tagClass: "tag-cat-op",
          subtitle: "SEATBELTS / 菅野洋子",
          score: 9.6,
          cover: "https://lain.bgm.tv/pic/cover/m/26/5d/1042_cZ738.jpg",
          fallbackSvg: "linear-gradient(135deg, #e11d48, #f43f5e)"
        }
      ]
    },
    "305429": {
      id: 305429,
      category: "book_series",
      verb: "读",
      noun: "这个系列",
      name: "葬送のフリーレン",
      name_cn: "葬送的芙莉莲 (系列总览 · 全15卷+)",
      type_label: "书籍 · 漫画系列 (Series)",
      year: "2020",
      eps: 0,
      volumes_total: 15,
      volumes_read: 13,
      chaps_total: 140,
      chaps_read: 135,
      score: 8.6,
      rank: 42,
      total_votes: 8942,
      std_dev: "1.08",
      score_desc: "力荐 (Great)",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/19/75/305429_ab437.jpg"
      },
      summary: "打倒魔王「之后」的勇者一行人，开启了后日谈奇幻物语！\\n身为魔法使的精灵芙莉莲，与勇者欣梅尔、僧侣海塔、战士艾泽在历经十年的冒险后击败魔王，为世界带回了和平。由于精灵拥有近乎无限的寿命，芙莉莲在目睹昔日伙伴相继离世后，终于意识到自己过去未曾真正「了解人类」。\\n在《周刊少年Sunday》连载并斩获「2021漫画大赏」第一名、第25届手冢治虫文化奖新生奖的王道奇幻漫画主系列条目。",
      collection: {
        wish: 2150,
        collect: 3420,
        doing: 5680,
        on_hold: 480,
        dropped: 190
      },
      tags: [
        { name: "漫画", count: 3820 },
        { name: "奇幻", count: 3150 },
        { name: "山田钟人", count: 2410 },
        { name: "アベツカサ", count: 2190 },
        { name: "小学馆", count: 1680 },
        { name: "周刊少年Sunday", count: 1420 },
        { name: "公路片", count: 1180 },
        { name: "治愈", count: 960 }
      ],
      infobox: [
        { key: "中文名", val: "葬送的芙莉莲" },
        { key: "册数", val: "既刊 15 卷 (连载中)" },
        { key: "话数", val: "140+ 话 (连载中)" },
        { key: "原作", val: "山田鐘人" },
        { key: "作画", val: "アベツカサ (阿部司)" },
        { key: "出版社", val: "小学館 / 東立出版社 / 中信出版社" },
        { key: "连载杂志", val: "週刊少年サンデー (Weekly Shonen Sunday)" },
        { key: "开始连载", val: "2020-04-28 (2020年22・23合并号)" },
        { key: "斩获荣誉", val: "2021漫画大赏 第1位 / 第69回小学馆漫画赏" }
      ],
      tankobon_volumes: [
        { id: "310920", vol: "Vol. 01", title: "葬送のフリーレン (1)", date: "2020-08-18", img: "https://lain.bgm.tv/pic/cover/m/c8/b0/310920_s9P5I.jpg", isRead: true },
        { id: "316809", vol: "Vol. 02", title: "葬送のフリーレン (2)", date: "2020-10-16", img: "https://lain.bgm.tv/pic/cover/m/1a/2a/316809_32f9K.jpg", isRead: true },
        { id: "322156", vol: "Vol. 03", title: "葬送のフリーレン (3)", date: "2020-12-18", img: "https://lain.bgm.tv/pic/cover/m/b7/58/322156_B9X1N.jpg", isRead: true },
        { id: "329894", vol: "Vol. 04", title: "葬送のフリーレン (4)", date: "2021-03-17", img: "https://lain.bgm.tv/pic/cover/m/00/57/329894_20p6m.jpg", isRead: true },
        { id: "339567", vol: "Vol. 05", title: "葬送のフリーレン (5)", date: "2021-07-16", img: "https://lain.bgm.tv/pic/cover/m/4a/a3/339567_R43yA.jpg", isRead: true },
        { id: "351565", vol: "Vol. 06", title: "葬送のフリーレン (6)", date: "2021-11-18", img: "https://lain.bgm.tv/pic/cover/m/83/44/351565_A2m3a.jpg", isRead: true },
        { id: "368514", vol: "Vol. 07", title: "葬送のフリーレン (7)", date: "2022-03-17", img: "https://lain.bgm.tv/pic/cover/m/72/3c/368514_5kM54.jpg", isRead: true },
        { id: "381232", vol: "Vol. 08", title: "葬送のフリーレン (8)", date: "2022-06-17", img: "https://lain.bgm.tv/pic/cover/m/f7/0d/381232_kC894.jpg", isRead: false }
      ],
      characters: [
        { name: "芙莉莲", role: "主角 / フリーレン", cv: "漫画原作角色", img: "https://lain.bgm.tv/pic/crt/m/b3/c6/86701_crt_3422v.jpg" },
        { name: "菲伦", role: "主角 / フェルン", cv: "漫画原作角色", img: "https://lain.bgm.tv/pic/crt/m/2f/6a/116634_crt_M9u1f.jpg" },
        { name: "休塔尔克", role: "主角 / シュタルク", cv: "漫画原作角色", img: "https://lain.bgm.tv/pic/crt/m/8b/5b/116635_crt_B7X67.jpg" },
        { name: "欣梅尔", role: "主角 / ヒンメル", cv: "漫画原作角色", img: "https://lain.bgm.tv/pic/crt/m/90/7e/116636_crt_62x29.jpg" }
      ],
      chart_bars: [
        { star: 10, count: 1980 },
        { star: 9, count: 3420 },
        { star: 8, count: 2450 },
        { star: 7, count: 780 },
        { star: 6, count: 210 },
        { star: 5, count: 62 },
        { star: 4, count: 20 },
        { star: 3, count: 10 },
        { star: 2, count: 6 },
        { star: 1, count: 4 }
      ],
      reviews: [
        {
          title: "分镜的留白与时间的重量：谈《葬送的芙莉莲》原作漫画的叙事克制",
          user: "漫画考古学",
          avatar: "https://lain.bgm.tv/pic/user/l/000/41/20/412098.jpg",
          time: "2023-12-08",
          replies: 84,
          excerpt: "阿部司老师极其擅长用无台词的四格连续小分镜表现旅途的流逝。黄金乡马哈特篇更是将漫画媒介的心理博弈推向了巅峰..."
        }
      ],
      topics: [
        { title: "【漫画进度】黄金乡篇马哈特与邓肯的塑造是不是目前全书最高峰？", user: "Sunday读者", replies: "+96", time: "2024-03-10" },
        { title: "单行本第13卷特装版附赠短篇小说集讨论楼", user: "苍月草收集者", replies: "+42", time: "2024-04-18" }
      ],
      comments: [
        { user: "纸片党阿哲", avatar: "https://lain.bgm.tv/pic/user/l/000/52/11/521104.jpg", star: 10, time: "2 小时前", text: "黄金乡篇漫画原作的节奏神中神！强烈建议动画党直接从第 7 卷第 61 话开始补漫画，Vol. 卷数和 Chap. 话数双轨进度条太适合追连载了！", likes: 48, vibe: "神作必读" },
        { user: "白羽", avatar: "https://lain.bgm.tv/pic/user/l/000/63/82/638291.jpg", star: 9, time: "昨天", text: "单元回的余韵在纸质单行本上翻阅时更加动人，每次翻过一页看到『勇者欣梅尔死后 XX 年』都会心头一颤。", likes: 29, vibe: "纸书质感" }
      ],
      relations: [
        { title: "葬送的芙莉莲 (TV动画第1季)", subtitle: "MADHOUSE · 2023年10月动画化", type: "动画化", cat: "anime", catLabel: "TV 动画", score: "8.5", img: "https://lain.bgm.tv/pic/cover/m/13/c5/400602_ZI8Y9.jpg", fallbackSvg: "linear-gradient(135deg, #2563eb, #3b82f6)" },
        { title: "葬送のフリーレン (1)", subtitle: "小学馆 · 单行本第1卷 (可点击切换)", type: "单行本", cat: "manga", catLabel: "第 1 卷", score: "8.5", img: "https://lain.bgm.tv/pic/cover/m/c8/b0/310920_s9P5I.jpg", fallbackSvg: "linear-gradient(135deg, #059669, #10b981)" }
      ]
    },
    "310920": {
      id: 310920,
      category: "book_vol",
      verb: "读",
      noun: "这本书",
      parent_series_id: "305429",
      parent_series_title: "葬送のフリーレン (主系列 · 共15卷)",
      name: "葬送のフリーレン (1)",
      name_cn: "葬送的芙莉莲 第一卷 (单行本 · 多版本可切换)",
      type_label: "书籍 · 单行本 (Volume 01)",
      year: "2020",
      eps: 0,
      score: 8.5,
      rank: 128,
      total_votes: 642,
      std_dev: "0.96",
      score_desc: "力荐 (Great)",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/c8/b0/310920_s9P5I.jpg"
      },
      summary: "收录第 1 话「冒险的终结」至第 7 话「杀人魔法」。\\n打倒魔王凯旋归来王都的勇者欣梅尔一行人，在五十年一遇的流星雨下许下再会的约定。五十年后，容颜未改的精灵芙莉莲送别了苍老逝去的欣梅尔，带着后悔与思念，踏上了收集魔法并前往灵魂安眠之地（奥蕾欧露）的旅途。",
      collection: {
        wish: 98,
        collect: 864,
        doing: 42,
        on_hold: 11,
        dropped: 4
      },
      tags: [
        { name: "单行本", count: 310 },
        { name: "山田钟人", count: 245 },
        { name: "アベツカサ", count: 220 },
        { name: "小学馆", count: 185 },
        { name: "东立", count: 112 },
        { name: "奇幻", count: 95 }
      ],
      editions: {
        jp: [
          { key: "版本名称", val: "🇯🇵 日版初版 (少年サンデーコミックス)" },
          { key: "出版社", val: "小学館 (Shogakukan)" },
          { key: "价格", val: "￥499 (税込)" },
          { key: "发售日", val: "2020-08-18" },
          { key: "页数", val: "192 页" },
          { key: "ISBN", val: "978-4098501809" },
          { key: "原作 / 作画", val: "山田鐘人 / アベツカサ" },
          { key: "收录话数", val: "第1话 ~ 第7话" }
        ],
        tw: [
          { key: "版本名称", val: "🇹🇼 繁体中文版 (东立少年系列)" },
          { key: "出版社", val: "東立出版社 (Tong Li)" },
          { key: "价格", val: "NT$ 110" },
          { key: "发售日", val: "2021-07-02" },
          { key: "页数", val: "192 页 (36K)" },
          { key: "ISBN", val: "978-9572666029" },
          { key: "译者", val: "林志昌" },
          { key: "收录话数", val: "第1话 ~ 第7话" }
        ],
        cn: [
          { key: "版本名称", val: "🇨🇳 简体中文版 (墨狸工作室)" },
          { key: "出版社", val: "中信出版社" },
          { key: "价格", val: "¥ 28.00" },
          { key: "发售日", val: "2022-05-01" },
          { key: "页数", val: "192 页 (32开)" },
          { key: "ISBN", val: "978-7521740820" },
          { key: "装帧", val: "平装双封 + 首刷书签" },
          { key: "收录话数", val: "第1话 ~ 第7话" }
        ]
      },
      infobox: [
        { key: "版本名称", val: "🇯🇵 日版初版 (少年サンデーコミックス)" },
        { key: "出版社", val: "小学館 (Shogakukan)" },
        { key: "价格", val: "￥499 (税込)" },
        { key: "发售日", val: "2020-08-18" },
        { key: "页数", val: "192 页" },
        { key: "ISBN", val: "978-4098501809" },
        { key: "原作 / 作画", val: "山田鐘人 / アベツカサ" },
        { key: "收录话数", val: "第1话 ~ 第7话" }
      ],
      characters: [
        { name: "芙莉莲", role: "第一卷封面人物", cv: "精灵魔法使", img: "https://lain.bgm.tv/pic/crt/m/b3/c6/86701_crt_3422v.jpg" },
        { name: "欣梅尔", role: "第一卷核心人物", cv: "勇者", img: "https://lain.bgm.tv/pic/crt/m/90/7e/116636_crt_62x29.jpg" },
        { name: "菲伦", role: "第2话登场", cv: "海塔收养的孤儿", img: "https://lain.bgm.tv/pic/crt/m/2f/6a/116634_crt_M9u1f.jpg" },
        { name: "休塔尔克", role: "第10话预告", cv: "艾泽的弟子", img: "https://lain.bgm.tv/pic/crt/m/8b/5b/116635_crt_B7X67.jpg" }
      ],
      chart_bars: [
        { star: 10, count: 142 },
        { star: 9, count: 238 },
        { star: 8, count: 196 },
        { star: 7, count: 52 },
        { star: 6, count: 10 },
        { star: 5, count: 3 },
        { star: 4, count: 1 },
        { star: 3, count: 0 },
        { star: 2, count: 0 },
        { star: 1, count: 0 }
      ],
      reviews: [
        {
          title: "第一卷单行本装帧对比：日版小学馆、台版东立与简中版纸张印刷评测",
          user: "实体书收藏家",
          avatar: "https://lain.bgm.tv/pic/user/l/000/33/19/331920.jpg",
          time: "2022-08-14",
          replies: 27,
          excerpt: "左侧 Infobox 支持直接切换日版/台版/简中版出版属性（对应原版 Bangumi 的 sub_group 多版本标签页），方便藏书党核对 ISBN 与译者..."
        }
      ],
      topics: [
        { title: "第一卷第1话『半世纪流星』分镜赏析", user: "漫画分镜控", replies: "+19", time: "2023-10-02" }
      ],
      comments: [
        { user: "藏书癖K", avatar: "https://lain.bgm.tv/pic/user/l/000/44/12/441209.jpg", star: 9, time: "3 天前", text: "单行本条目专门隐藏了冗余的章节格子，左侧支持一键切换日版/台版/简中版的 ISBN 和定价，还能随时跳回主系列，太懂实体书党了！", likes: 36, vibe: "实体书党狂喜" }
      ],
      relations: [
        { title: "葬送のフリーレン (主系列)", subtitle: "点击返回主系列总览 (Subject 305429)", type: "所属系列", cat: "manga", catLabel: "主系列", score: "8.6", img: "https://lain.bgm.tv/pic/cover/m/19/75/305429_ab437.jpg", fallbackSvg: "linear-gradient(135deg, #059669, #10b981)" },
        { title: "葬送のフリーレン (2)", subtitle: "单行本下一卷 · 2020-10-16 发售", type: "下一卷", cat: "manga", catLabel: "第 2 卷", score: "8.5", img: "https://lain.bgm.tv/pic/cover/m/1a/2a/316809_32f9K.jpg", fallbackSvg: "linear-gradient(135deg, #0d9488, #14b8a6)" }
      ]
    },
    "477900": {
      id: 477900,
      category: "music",
      verb: "听",
      noun: "这张唱片",
      name: "TVアニメ『葬送のフリーレン』Original Soundtrack",
      name_cn: "葬送的芙莉莲 原声音乐集 (2CD · 70曲)",
      type_label: "音乐 · Original Soundtrack",
      year: "2024",
      eps: 0,
      score: 8.6,
      rank: 38,
      total_votes: 1420,
      std_dev: "0.94",
      score_desc: "力荐 (Great)",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/c1/37/477900_9228R.jpg"
      },
      summary: "由美国作曲家 Evan Call 倾力谱写的 TV 动画《葬送的芙莉莲》全篇原声带专辑。\\n远赴匈牙利布达佩斯录制管弦乐与凯尔特古乐器（鲁特琴、爱尔兰哨笛、风笛、手摇琴），双 CD 豪华收录全 70 首曲目，包含第1季高潮曲《Zoltraak》与主题曲《Journey of a Lifetime》。",
      collection: {
        wish: 245,
        collect: 1680,
        doing: 310,
        on_hold: 24,
        dropped: 6
      },
      tags: [
        { name: "OST", count: 820 },
        { name: "EvanCall", count: 740 },
        { name: "2024", count: 430 },
        { name: "葬送的芙莉莲", count: 390 },
        { name: "管弦乐", count: 310 },
        { name: "凯尔特民谣", count: 265 }
      ],
      infobox: [
        { key: "艺术家", val: "Evan Call / milet" },
        { key: "作曲 / 编曲", val: "Evan Call" },
        { key: "版本特性", val: "CD (2枚组 / 全70曲)" },
        { key: "发售日期", val: "2024-04-17" },
        { key: "价格", val: "￥3,850 (税込)" },
        { key: "播放时长", val: "139 分 (Disc 1: 72分 / Disc 2: 67分)" },
        { key: "厂牌", val: "TOHO animation RECORDS" },
        { key: "碟片编号", val: "THCA-60290~1" }
      ],
      discs: [
        {
          name: "Disc 1 (36曲精选)",
          tracks: [
            { num: "01", title: "Journey of a Lifetime ~ Frieren Main Theme", artist: "Evan Call", duration: "04:32" },
            { num: "02", title: "The End of One Journey", artist: "Evan Call", duration: "02:41" },
            { num: "03", title: "For 1000 Years", artist: "Evan Call", duration: "03:18" },
            { num: "04", title: "One Last Adventure", artist: "Evan Call", duration: "02:55" },
            { num: "05", title: "Zoltraak (一般攻击魔法)", artist: "Evan Call feat. Budapest Scoring", duration: "03:04" },
            { num: "06", title: "Frieren the Slayer (葬送的芙莉莲)", artist: "Evan Call", duration: "03:46" },
            { num: "07", title: "Stark the Warrior", artist: "Evan Call", duration: "02:39" },
            { num: "08", title: "Beyond the Ende", artist: "Evan Call", duration: "03:52" }
          ]
        },
        {
          name: "Disc 2 (34曲精选)",
          tracks: [
            { num: "01", title: "Time Flows Ever Onward", artist: "Evan Call", duration: "03:27" },
            { num: "02", title: "Dragon Smasher", artist: "Evan Call", duration: "02:58" },
            { num: "03", title: "A Waltz for Himmel and Frieren", artist: "Evan Call", duration: "03:15" },
            { num: "04", title: "First-Class Mage Exam", artist: "Evan Call", duration: "03:41" },
            { num: "05", title: "The Height of Magic (魔法的巅峰)", artist: "Evan Call", duration: "04:12" },
            { num: "06", title: "Bliss (ED Special Piano Ver.)", artist: "Evan Call / milet", duration: "04:50" }
          ]
        }
      ],
      characters: [
        { name: "Evan Call", role: "全曲作曲 · 编曲", cv: "代表作：紫罗兰永恒花园 / 芙莉莲", img: "https://lain.bgm.tv/pic/crt/m/b3/c6/86701_crt_3422v.jpg" },
        { name: "milet", role: "片尾曲献唱", cv: "Anytime Anywhere / bliss", img: "https://lain.bgm.tv/pic/crt/m/2f/6a/116634_crt_M9u1f.jpg" }
      ],
      chart_bars: [
        { star: 10, count: 380 },
        { star: 9, count: 590 },
        { star: 8, count: 340 },
        { star: 7, count: 86 },
        { star: 6, count: 18 },
        { star: 5, count: 4 },
        { star: 4, count: 2 },
        { star: 3, count: 0 },
        { star: 2, count: 0 },
        { star: 1, count: 0 }
      ],
      reviews: [
        {
          title: "从中世纪鲁特琴到交响史诗：解析 Evan Call 如何在《芙莉莲》OST 中构建时间感",
          user: "古典乐迷M",
          avatar: "https://lain.bgm.tv/pic/user/l/000/29/10/291044.jpg",
          time: "2024-04-20",
          replies: 53,
          excerpt: "1:1 黑胶方封设计搭配右侧露出的黑胶唱盘边缘，点击中栏 Disc 1 / Disc 2 曲目表即可高亮试听曲目，音乐条目的仪式感拉满了..."
        }
      ],
      topics: [
        { title: "《Zoltraak》和《The Height of Magic》哪首是全专最燃曲目？", user: "Hi-Res发烧友", replies: "+64", time: "2024-04-25" }
      ],
      comments: [
        { user: "耳机发烧友Lin", avatar: "https://lain.bgm.tv/pic/user/l/000/58/12/581290.jpg", star: 10, time: "1 小时前", text: "音乐条目自动切换成 1:1 方形黑胶封面和 Disc 1/2 曲目表！点击曲目行还能直接切换试听高亮，Zoltraak 响起瞬间鸡皮疙瘩起来了！", likes: 62, vibe: "耳朵怀孕" }
      ],
      relations: [
        { title: "葬送的芙莉莲 (TV动画)", subtitle: "MADHOUSE · 动画本篇 (Subject 400602)", type: "所属动画", cat: "anime", catLabel: "TV 动画", score: "8.5", img: "https://lain.bgm.tv/pic/cover/m/13/c5/400602_ZI8Y9.jpg", fallbackSvg: "linear-gradient(135deg, #2563eb, #3b82f6)" }
      ]
    },
    "37141": {
      id: 37141,
      category: "game",
      verb: "玩",
      noun: "这部游戏",
      name: "Baldur's Gate 3",
      name_cn: "博德之门 3 (TGA 年度游戏 · CRPG 巅峰)",
      type_label: "游戏 · CRPG (PC / PS5 / Xbox)",
      year: "2023",
      eps: 0,
      score: 8.9,
      rank: 15,
      total_votes: 5840,
      std_dev: "1.12",
      score_desc: "神作 (Masterpiece)",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/26/c8/37141_6c6cO.jpg"
      },
      summary: "召集你的队伍，返回被遗忘的国度，开启一段充满友谊与背叛、牺牲与生存、以及至上力量诱惑的传奇故事。\\n由拉瑞安工作室（Larian Studios）基于龙与地下城第5版（D&D 5e）规则打造的次世代 CRPG 巨作，囊括 TGA、金摇杆、DICE、GDC 与 BAFTA 五大满贯年度最佳游戏。",
      collection: {
        wish: 1840,
        collect: 4620,
        doing: 1290,
        on_hold: 540,
        dropped: 165
      },
      tags: [
        { name: "CRPG", count: 2480 },
        { name: "LarianStudios", count: 1920 },
        { name: "DND", count: 1650 },
        { name: "RPG", count: 1420 },
        { name: "PC", count: 1180 },
        { name: "回合制", count: 960 }
      ],
      infobox: [
        { key: "中文名", val: "博德之门 3" },
        { key: "平台", val: "PC (Steam/GOG) / PS5 / Xbox Series X|S / macOS" },
        { key: "游戏类型", val: "CRPG / 回合制战术角色扮演" },
        { key: "开发 / 发行", val: "Larian Studios (拉瑞安工作室)" },
        { key: "游戏引擎", val: "Divinity 4.0 Engine" },
        { key: "游玩人数", val: "单人 / 1-4人联机合作" },
        { key: "正式发行日", val: "2023-08-03 (PC) / 2023-09-06 (PS5)" },
        { key: "总监", val: "Swen Vincke" }
      ],
      platforms: [
        { id: "pc", label: "💻 PC (Steam / GOG)", active: true },
        { id: "ps5", label: "🎮 PlayStation 5", active: false },
        { id: "xbox", label: "🟢 Xbox Series X|S", active: false },
        { id: "mac", label: "🍎 macOS (Apple Silicon)", active: false }
      ],
      play_stats: {
        hours: "142.5 h",
        run: "第 2 周目 (荣誉模式 · 邪念线)",
        achievements: "48 / 54 (89%)"
      },
      characters: [
        { name: "影心 (Shadowheart)", role: "起源同伴 / 莎尔牧师", cv: "Jennifer English", img: "https://lain.bgm.tv/pic/crt/m/b3/c6/86701_crt_3422v.jpg" },
        { name: "阿斯代伦 (Astarion)", role: "起源同伴 / 高等精灵游荡者", cv: "Neil Newbon", img: "https://lain.bgm.tv/pic/crt/m/90/7e/116636_crt_62x29.jpg" },
        { name: "卡菈克 (Karlach)", role: "起源同伴 / 提夫林野蛮人", cv: "Samantha Béart", img: "https://lain.bgm.tv/pic/crt/m/2f/6a/116634_crt_M9u1f.jpg" },
        { name: "盖尔 (Gale)", role: "起源同伴 / 深水城法师", cv: "Tim Downie", img: "https://lain.bgm.tv/pic/crt/m/8b/5b/116635_crt_B7X67.jpg" }
      ],
      chart_bars: [
        { star: 10, count: 2340 },
        { star: 9, count: 2180 },
        { star: 8, count: 920 },
        { star: 7, count: 260 },
        { star: 6, count: 80 },
        { star: 5, count: 32 },
        { star: 4, count: 12 },
        { star: 3, count: 8 },
        { star: 2, count: 4 },
        { star: 1, count: 4 }
      ],
      reviews: [
        {
          title: "电子游戏工业的奇迹：当《博德之门3》把桌游 DM 的自由度真正搬进 3A 演出",
          user: "被遗忘国度旅人",
          avatar: "https://lain.bgm.tv/pic/user/l/000/49/88/498812.jpg",
          time: "2023-09-12",
          replies: 146,
          excerpt: "游戏条目完全不需要动画的章节格子，取而代之的是游玩平台选择器（PC/PS5/Xbox/macOS）与周目/时长/全成就进度看板..."
        }
      ],
      topics: [
        { title: "【荣誉模式】拉斐尔希望之邸BOSS战逃课与正攻配置分享", user: "剑咏诗人", replies: "+88", time: "2024-01-19" }
      ],
      comments: [
        { user: "骰子女神眷顾者", avatar: "https://lain.bgm.tv/pic/user/l/000/71/02/710233.jpg", star: 10, time: "4 小时前", text: "游戏条目把『想看/看过/在看』全部自动改成了『想玩/玩过/在玩』，中栏还能选 Steam / PS5 平台并记录周目和成就进度，太贴合玩家习惯了！", likes: 81, vibe: "骰出大成功 20" }
      ],
      relations: [
        { title: "Baldur's Gate II: Shadows of Amn", subtitle: "BioWare · 2000年经典前作", type: "前作", cat: "anime", catLabel: "前作游戏", score: "8.8", img: "https://lain.bgm.tv/pic/cover/m/26/c8/37141_6c6cO.jpg", fallbackSvg: "linear-gradient(135deg, #d97706, #f59e0b)" }
      ]
    },
    "225581": {
      id: 225581,
      category: "real",
      verb: "看",
      noun: "这部影视",
      name: "アンナチュラル",
      name_cn: "非自然死亡 (Unnatural · TBS 金曜剧)",
      type_label: "三次元 · 日剧 (TV Drama)",
      year: "2018",
      eps: 10,
      score: 8.5,
      rank: 18,
      total_votes: 9420,
      std_dev: "0.98",
      score_desc: "力荐 (Great)",
      images: {
        large: "https://lain.bgm.tv/pic/cover/l/4c/58/225581_2229b.jpg"
      },
      summary: "在「非自然死亡原因研究所」（简称 UDI）工作的三澄美琴（石原里美 饰）是专门探查死因的解剖法医。\\n在她看来，「非自然死亡」的背后必定隐藏着需要被倾听的真相——伪装杀人、医疗失误、未知病毒、过劳死与校园霸凌。她与毒舌法医中堂系（井浦新 饰）、记录员久部六郎（洼田正孝 饰）共同在法医解剖台上为死者寻找最后的尊严。",
      collection: {
        wish: 980,
        collect: 11240,
        doing: 420,
        on_hold: 190,
        dropped: 65
      },
      tags: [
        { name: "日剧", count: 3420 },
        { name: "野木亚纪子", count: 2680 },
        { name: "石原里美", count: 2410 },
        { name: "法医", count: 1890 },
        { name: "米津玄师", count: 1650 },
        { name: "2018冬", count: 1120 }
      ],
      infobox: [
        { key: "中文名", val: "非自然死亡" },
        { key: "放送星期", val: "金曜剧 (每周五 22:00)" },
        { key: "集数", val: "全 10 集" },
        { key: "编剧", val: "野木亜紀子" },
        { key: "导演", val: "塚原あゆ子 / 竹村謙太郎 / 村尾嘉昭" },
        { key: "主演", val: "石原さとみ / 井浦新 / 窪田正孝 / 市川実日子 / 松重豊" },
        { key: "主题曲", val: "米津玄師「Lemon」" },
        { key: "电视台", val: "TBSテレビ" }
      ],
      characters: [
        { name: "三澄美琴", role: "主演 / UDI 解剖法医", cv: "出演: 石原さとみ (石原里美)", img: "https://lain.bgm.tv/pic/crt/m/b3/c6/86701_crt_3422v.jpg" },
        { name: "中堂系", role: "主演 / UDI 资深法医", cv: "出演: 井浦新 (Arata Iura)", img: "https://lain.bgm.tv/pic/crt/m/90/7e/116636_crt_62x29.jpg" },
        { name: "久部六郎", role: "主演 / UDI 记录员", cv: "出演: 窪田正孝 (Masataka Kubota)", img: "https://lain.bgm.tv/pic/crt/m/8b/5b/116635_crt_B7X67.jpg" },
        { name: "神仓保夫", role: "共演 / UDI 所长", cv: "出演: 松重豊 (Yutaka Matsushige)", img: "https://lain.bgm.tv/pic/crt/m/2f/6a/116634_crt_M9u1f.jpg" }
      ],
      chart_bars: [
        { star: 10, count: 1680 },
        { star: 9, count: 3820 },
        { star: 8, count: 2940 },
        { star: 7, count: 760 },
        { star: 6, count: 160 },
        { star: 5, count: 40 },
        { star: 4, count: 12 },
        { star: 3, count: 4 },
        { star: 2, count: 2 },
        { star: 1, count: 2 }
      ],
      reviews: [
        {
          title: "当米津玄师的《Lemon》在第七集响起：野木亚纪子如何写出社会派日剧的最高教科书",
          user: "日剧档案馆",
          avatar: "https://lain.bgm.tv/pic/user/l/000/38/91/389102.jpg",
          time: "2018-03-20",
          replies: 118,
          excerpt: "三次元影视条目保留了 10 集剧集打卡矩阵，同时将『主要角色 & 声优』自动适配为『主要角色 & 出演演员 (Cast)』..."
        }
      ],
      topics: [
        { title: "与《机动搜查队404 (MIU404)》同世界观联动映画《Last Mile》讨论", user: "UDI法医实习生", replies: "+75", time: "2024-08-25" }
      ],
      comments: [
        { user: "柠檬味汽水", avatar: "https://lain.bgm.tv/pic/user/l/000/66/41/664120.jpg", star: 10, time: "5 小时前", text: "有功夫绝望的话，不如去吃点好吃的然后睡一觉吧！三次元日剧条目的 10 集格子和演员 Cast 表排版太舒服了。", likes: 94, vibe: "梦回2018冬天" }
      ],
      relations: [
        { title: "MIU404 (机动搜查队404)", subtitle: "TBS · 野木亚纪子同世界观姊妹篇", type: "相同世界观", cat: "anime", catLabel: "三次元日剧", score: "8.3", img: "https://lain.bgm.tv/pic/cover/m/4c/58/225581_2229b.jpg", fallbackSvg: "linear-gradient(135deg, #2563eb, #3b82f6)" },
        { title: "Lemon / 米津玄師", subtitle: "Sony Music · 剧集主题曲单曲", type: "主题曲", cat: "ed", catLabel: "主题曲 CD", score: "8.7", img: "https://lain.bgm.tv/pic/cover/m/c1/37/477900_9228R.jpg", fallbackSvg: "linear-gradient(135deg, #ca8a04, #eab308)" }
      ]
    }
  };

  let currentSubjectId = "400602";
  let userEpisodeState = {}; // ep_num -> boolean
  let userInterestState = "3"; // '3' = 在看
  let userRatingScore = 9;

  // 10 颗星对应的悬浮文字
  const STAR_DESCRIPTIONS = [
    "未评分",
    "1 不忍直视",
    "2 很差",
    "3 差",
    "4 较差",
    "5 不过不失",
    "6 还行",
    "7 推荐",
    "8 力荐",
    "9 神作",
    "10 极品！超神！"
  ];

  // Toast 浮动提示（统一使用 #toastContainer + .glass-toast）
  function showToast(message) {
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(message);
      return;
    }
    const host = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = 'glass-toast';
    toast.textContent = '✨ ' + message;
    host.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  }

  function getSubjectData(id) {
    return DEFAULT_SUBJECTS[id] || DEFAULT_SUBJECTS["400602"];
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderInfoboxRows(rows) {
    const infoboxContainer = document.getElementById('infoboxList');
    if (!infoboxContainer) return;
    infoboxContainer.classList.remove('expanded');
    infoboxContainer.innerHTML = '';
    (rows || []).forEach((item, index) => {
      const li = document.createElement('li');
      li.className = index >= 7 ? 'infobox-row infobox-folded' : 'infobox-row';
      const valText = item.val !== undefined ? item.val : item.value;
      li.innerHTML = `<span class="info-key">${item.key}</span><span class="info-val">${valText}</span>`;
      infoboxContainer.appendChild(li);
    });
  }

  function syncSwitcherPills(id) {
    document.querySelectorAll('.banner-cat-pill, .subject-preset-pills .preset-pill-btn, #subjectSwitcher .switcher-pill').forEach((btn) => {
      btn.classList.toggle('active', String(btn.dataset.subjectId) === String(id));
    });
  }

  // 渲染指定 ID 条目所有信息（全量适配 动画 / 书籍·系列 / 书籍·单行本 / 音乐 / 游戏 / 三次元）
  function renderSubject(id) {
    currentSubjectId = String(id);
    const data = getSubjectData(currentSubjectId);
    const cat = data.category || 'anime';
    const verb = data.verb || '看';
    const noun = data.noun || '这部动画';

    syncSwitcherPills(currentSubjectId);

    // 1. 专属顶栏 & 二级 Tab 自适应
    document.title = `${data.name_cn || data.name} | Bangumi 番组计划 (Liquid Redesign)`;
    setText('subjectTitleCn', data.name_cn || data.name);
    setText('subjectTitleJp', data.name);
    setText('subjectTypeBadge', data.type_label || "TV 动画");
    setText('subjectRankBadge', `Rank #${data.rank}`);

    const navTabsEl = document.getElementById('subjectNavTabs');
    if (navTabsEl) {
      let tabsSchema = [];
      if (cat === 'book_series') {
        tabsSchema = [
          { label: '概览', active: true },
          { label: '角色', href: `subject-characters.html?id=${id}` },
          { label: '制作人员', href: `subject-persons.html?id=${id}` },
          { label: '单行本', count: data.volumes_total || 15, href: '#subjectPanelTankobon' },
          { label: '关联', href: `subject-wiki.html?id=${id}&tab=add_related_subject` },
          { label: '吐槽', href: `subject-comments.html?id=${id}` },
          { label: '评论', href: `subject-reviews.html?id=${id}&tab=reviews` },
          { label: '讨论版', href: `subject-reviews.html?id=${id}&tab=board` },
          { label: '透视分析', href: `subject-stats.html?id=${id}` },
          { label: '维基修订', href: `subject-wiki.html?id=${id}` }
        ];
      } else if (cat === 'book_vol') {
        tabsSchema = [
          { label: '概览', active: true },
          { label: '所属系列', jumpToId: data.parent_series_id || '305429' },
          { label: '角色', href: `subject-characters.html?id=${id}` },
          { label: '制作人员', href: `subject-persons.html?id=${id}` },
          { label: '关联', href: `subject-wiki.html?id=${id}&tab=add_related_subject` },
          { label: '吐槽', href: `subject-comments.html?id=${id}` },
          { label: '评论', href: `subject-reviews.html?id=${id}&tab=reviews` },
          { label: '讨论版', href: `subject-reviews.html?id=${id}&tab=board` },
          { label: '透视分析', href: `subject-stats.html?id=${id}` },
          { label: '维基修订', href: `subject-wiki.html?id=${id}` }
        ];
      } else if (cat === 'music') {
        tabsSchema = [
          { label: '概览', active: true },
          { label: '曲目列表', count: 70, href: `subject-ep.html?id=${id}` },
          { label: '艺术家', href: `subject-characters.html?id=${id}` },
          { label: '制作人员', href: `subject-persons.html?id=${id}` },
          { label: '关联', href: `subject-wiki.html?id=${id}&tab=add_related_subject` },
          { label: '吐槽', href: `subject-comments.html?id=${id}` },
          { label: '乐评', href: `subject-reviews.html?id=${id}&tab=reviews` },
          { label: '讨论版', href: `subject-reviews.html?id=${id}&tab=board` },
          { label: '透视分析', href: `subject-stats.html?id=${id}` },
          { label: '维基修订', href: `subject-wiki.html?id=${id}` }
        ];
      } else if (cat === 'game') {
        tabsSchema = [
          { label: '概览', active: true },
          { label: '角色', href: `subject-characters.html?id=${id}` },
          { label: '开发团队', href: `subject-persons.html?id=${id}` },
          { label: '关联', href: `subject-wiki.html?id=${id}&tab=add_related_subject` },
          { label: '吐槽', href: `subject-comments.html?id=${id}` },
          { label: '评测', href: `subject-reviews.html?id=${id}&tab=reviews` },
          { label: '讨论版', href: `subject-reviews.html?id=${id}&tab=board` },
          { label: '透视分析', href: `subject-stats.html?id=${id}` },
          { label: '维基修订', href: `subject-wiki.html?id=${id}` }
        ];
      } else {
        tabsSchema = [
          { label: '概览', active: true },
          { label: '章节', count: data.eps, href: `subject-ep.html?id=${id}` },
          { label: cat === 'real' ? '出演者' : '角色', href: `subject-characters.html?id=${id}` },
          { label: '制作人员', href: `subject-persons.html?id=${id}` },
          { label: '关联', href: `subject-wiki.html?id=${id}&tab=add_related_subject` },
          { label: '吐槽', href: `subject-comments.html?id=${id}` },
          { label: '评论', href: `subject-reviews.html?id=${id}&tab=reviews` },
          { label: '讨论版', href: `subject-reviews.html?id=${id}&tab=board` },
          { label: '透视分析', href: `subject-stats.html?id=${id}` },
          { label: '维基修订', href: `subject-wiki.html?id=${id}` }
        ];
      }
      navTabsEl.innerHTML = tabsSchema.map((t) => `
        <li>
          <a href="${t.href || '#'}" class="${t.active ? 'active' : ''}" ${t.jumpToId ? `data-jump-id="${t.jumpToId}"` : ''}>
            ${t.label}${t.count ? ` <span class="tab-count">${t.count}</span>` : ''}
          </a>
        </li>
      `).join('');
      navTabsEl.querySelectorAll('a[data-jump-id]').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          renderSubject(a.dataset.jumpId);
          showToast('已跳转至所属主系列条目！📚', 'info');
        });
      });
    }

    // 氛围流体模糊背景
    const backdrop = document.getElementById('subjectBackdrop');
    if (backdrop) {
      backdrop.style.backgroundImage = `url('${data.images.large}')`;
    }

    // 2. 左栏：封面形态自适应（1:1 音乐黑胶方图 / 单行本书脊折痕 / 标准竖封）
    const coverWrap = document.getElementById('subjectCoverWrapper');
    if (coverWrap) {
      coverWrap.classList.toggle('is-music-cover', cat === 'music');
      coverWrap.classList.toggle('is-book-volume-cover', cat === 'book_vol');
    }
    const coverImg = document.getElementById('subjectCoverImg');
    if (coverImg) {
      coverImg.src = data.images.large;
      coverImg.alt = data.name_cn || data.name;
    }
    const coverZoomLink = document.getElementById('coverZoomLink');
    if (coverZoomLink) {
      coverZoomLink.href = data.images.large;
    }

    // 2.1 左栏：书籍单行本专属「所属主系列回跳横幅」与「多版本出版属性切换器 (sub_group)」
    const seriesParentBanner = document.getElementById('seriesParentBanner');
    if (seriesParentBanner) {
      if (cat === 'book_vol' && data.parent_series_id) {
        seriesParentBanner.style.display = 'block';
        seriesParentBanner.innerHTML = `
          <div class="series-parent-banner" id="btnJumpParentSeries">
            <span class="sp-kicker">📚 所属主系列 (Parent Series)</span>
            <span class="sp-title">
              <span>${data.parent_series_title}</span>
              <span class="sp-arrow">返回主系列 ↗</span>
            </span>
          </div>
        `;
        const jumpBtn = document.getElementById('btnJumpParentSeries');
        if (jumpBtn) {
          jumpBtn.addEventListener('click', () => {
            renderSubject(data.parent_series_id);
            showToast('已返回《葬送的芙莉莲》漫画主系列总览！📚', 'info');
          });
        }
      } else {
        seriesParentBanner.style.display = 'none';
        seriesParentBanner.innerHTML = '';
      }
    }

    const editionWrap = document.getElementById('infoboxEditionWrap');
    if (editionWrap) {
      if (cat === 'book_vol' && data.editions) {
        editionWrap.style.display = 'block';
        editionWrap.innerHTML = `
          <div class="infobox-edition-switcher">
            <button type="button" class="edition-tab-btn active" data-ed="jp">🇯🇵 日版(小学馆)</button>
            <button type="button" class="edition-tab-btn" data-ed="tw">🇹🇼 繁中(东立)</button>
            <button type="button" class="edition-tab-btn" data-ed="cn">🇨🇳 简中(中信)</button>
          </div>
        `;
        editionWrap.querySelectorAll('.edition-tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            editionWrap.querySelectorAll('.edition-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const edKey = btn.dataset.ed;
            renderInfoboxRows(data.editions[edKey] || data.infobox);
            showToast(`已切换单行本出版版本：${btn.textContent.trim()}`, 'info');
          });
        });
      } else {
        editionWrap.style.display = 'none';
        editionWrap.innerHTML = '';
      }
    }

    renderInfoboxRows(data.infobox);

    const infoboxToggleBtn = document.getElementById('infoboxToggleBtn');
    if (infoboxToggleBtn) {
      infoboxToggleBtn.textContent = cat === 'book_vol'
        ? '展开完整出版信息 ▾'
        : '展开全部制作人员 (68项) ▾';
    }

    // 3. 左栏 & 右栏：收藏动词全面自适应 (看 / 读 / 听 / 玩)
    setText('collectPanelTitle', `谁${verb}${noun}?`);
    const col = data.collection;
    const totalCol = col.wish + col.collect + col.doing + col.on_hold + col.dropped;

    const updateLegendVerb = (countId, labelText, valNum) => {
      const el = document.getElementById(countId);
      if (el && el.parentElement) {
        const dot = el.parentElement.querySelector('.dot');
        el.parentElement.innerHTML = '';
        if (dot) el.parentElement.appendChild(dot);
        el.parentElement.appendChild(document.createTextNode(` ${labelText} `));
        const strong = document.createElement('strong');
        strong.id = countId;
        strong.textContent = valNum.toLocaleString();
        el.parentElement.appendChild(strong);
      }
    };
    updateLegendVerb('countWish', `想${verb}`, col.wish);
    updateLegendVerb('countCollect', `${verb}过`, col.collect);
    updateLegendVerb('countDo', `在${verb}`, col.doing);
    updateLegendVerb('countHold', '搁置', col.on_hold);
    updateLegendVerb('countDrop', '抛弃', col.dropped);

    const interestTitleMap = {
      anime: '我的追番收藏盒',
      book_series: '我的阅读收藏盒 (系列)',
      book_vol: '我的单行本藏书盒',
      music: '我的唱片聆听盒',
      game: '我的游戏库收藏盒',
      real: '我的追剧收藏盒'
    };
    setText('interestPanelTitle', interestTitleMap[cat] || '我的追番收藏盒');

    const statusPills = document.querySelectorAll('.interest-status-selector .interest-btn');
    const verbPillLabels = {
      '1': `想${verb}`,
      '2': `${verb}过`,
      '3': `在${verb}`,
      '4': '搁置',
      '5': '抛弃'
    };
    statusPills.forEach((p) => {
      const st = p.dataset.status;
      if (verbPillLabels[st]) p.textContent = verbPillLabels[st];
    });
    const stateDescMap = {
      '1': `想${verb}${noun}`,
      '2': `${verb}过${noun}`,
      '3': `我正巧在${verb}${noun}`,
      '4': `暂时搁置了${noun}`,
      '5': `已抛弃${noun}`
    };
    setText('userInterestStateLabel', stateDescMap[userInterestState] || `我正巧在${verb}${noun}`);

    const setSegWidth = (segId, val) => {
      const seg = document.getElementById(segId);
      if (seg) seg.style.width = `${(val / totalCol * 100).toFixed(1)}%`;
    };
    setSegWidth('segWish', col.wish);
    setSegWidth('segCollect', col.collect);
    setSegWidth('segDo', col.doing);
    setSegWidth('segHold', col.on_hold);
    setSegWidth('segDrop', col.dropped);

    // 4. 中栏第一工作台：按 6 大形态动态切换
    renderCategoryWorkbench(data, cat);

    // 4.1 中栏：书籍主系列专属「单行本封面画廊 (#tankobonPanel)」
    const tankobonPanel = document.getElementById('tankobonPanel');
    const tankobonGrid = document.getElementById('tankobonGrid');
    if (tankobonPanel && tankobonGrid) {
      if (cat === 'book_series' && Array.isArray(data.tankobon_volumes)) {
        tankobonPanel.style.display = 'block';
        setText('tankobonTotalBadge', `共 ${data.volumes_total || data.tankobon_volumes.length} 卷 · 点击 Vol.01 可进入单行本详情页`);
        tankobonGrid.innerHTML = data.tankobon_volumes.map((v) => `
          <div class="tankobon-vol-card ${v.id === '310920' ? 'active-vol' : ''}" data-vol-id="${v.id}" data-vol-title="${v.title}">
            <div class="tankobon-cover-box">
              <img src="${v.img}" alt="${v.title}" loading="lazy" onerror="this.src='https://lain.bgm.tv/pic/cover/l/19/75/305429_ab437.jpg'" />
              <span class="vol-num-ribbon">${v.vol}</span>
              ${v.isRead ? '<span class="vol-read-check" title="已读过">✓</span>' : ''}
            </div>
            <div class="tankobon-vol-title">${v.title}</div>
            <div class="tankobon-vol-date">${v.date}</div>
          </div>
        `).join('');

        tankobonGrid.querySelectorAll('.tankobon-vol-card').forEach((card) => {
          card.addEventListener('click', () => {
            const vid = card.dataset.volId;
            if (DEFAULT_SUBJECTS[vid]) {
              renderSubject(vid);
              showToast(`已进入单行本详情页：《${card.dataset.volTitle}》📖`, 'success');
            } else {
              showToast(`已标记《${card.dataset.volTitle}》阅读状态！点击 Vol.01 可进入单行本详情页`, 'info');
            }
          });
        });
      } else {
        tankobonPanel.style.display = 'none';
      }
    }

    // 5. 中栏：剧情/作品简介
    const summaryEl = document.getElementById('subjectSummaryText');
    if (summaryEl) {
      const secHeader = summaryEl.closest('.subject-card')?.querySelector('.sec-title');
      if (secHeader) {
        const titleMap = {
          anime: '故事简介',
          book_series: '漫画系列简介',
          book_vol: '本卷内容简介 (Volume 01)',
          music: '专辑制作背景与曲目赏析',
          game: '游戏世界观与玩法简介',
          real: '剧集剧情简介'
        };
        secHeader.innerHTML = `<span class="sec-dot"></span> ${titleMap[cat] || '故事简介'}`;
      }
      summaryEl.innerHTML = String(data.summary || '')
        .replace(/\\n/g, '\n')
        .split('\n')
        .filter(Boolean)
        .map(p => `<p style="margin:0 0 10px 0;">${p}</p>`)
        .join('');
    }

    // 6. 中栏：高频标签云
    const tagsContainer = document.getElementById('subjectTagsCloud');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      data.tags.forEach((tag, idx) => {
        const a = document.createElement('a');
        a.href = `tag.html?type=${encodeURIComponent(cat || 'anime')}&tag=${encodeURIComponent(tag.name)}`;
        a.className = idx < 3 ? 'tag-badge highlight' : 'tag-badge';
        a.innerHTML = `<span class="t-name">${tag.name}</span><span class="t-count">${tag.count}</span>`;
        tagsContainer.appendChild(a);
      });
    }

    // 7. 中栏：主要角色 / 艺术家 / 出演者
    const charMoreLink = document.getElementById('characterMoreLink');
    if (charMoreLink) {
      charMoreLink.setAttribute('href', `subject-characters.html?id=${id}`);
      charMoreLink.textContent = `全部${cat === 'real' ? '出演者' : (cat === 'music' ? '艺术家' : '角色')} »`;
    }
    const charGrid = document.getElementById('characterGrid');
    if (charGrid) {
      const charSecTitle = charGrid.closest('.subject-card')?.querySelector('.sec-title');
      if (charSecTitle) {
        const charTitleMap = {
          anime: '主要角色 & 声优',
          book_series: '主要登场角色 (漫画原作)',
          book_vol: '本卷登场人物',
          music: '核心主创艺术家 (Artists & Composers)',
          game: '起源同伴与主要角色 & 配音',
          real: '主要角色 & 出演演员 (Cast)'
        };
        charSecTitle.innerHTML = `<span class="sec-dot"></span> ${charTitleMap[cat] || '主要角色 & 声优'}`;
      }
      charGrid.innerHTML = '';
      const CRT_ID_MAP = {
        '芙莉莲': 86246, '菲伦': 86247, '修尔克': 89182, '修塔尔克': 89182, '辛美尔': 88208, '海塔': 89183, '艾泽': 89184,
        '碇真嗣': 302, '绫波丽': 303, '明日香': 304, '葛城美里': 305,
        '斯派克': 77, '杰特': 78, '菲·瓦伦丁': 79
      };
      const PRSN_ID_MAP = {
        '种崎敦美': 7575, '市之濑加那': 31136, '小林千晃': 32265, '冈本信彦': 4950, '东地宏树': 4658, '上田耀司': 4920,
        '绪方惠美': 4054, '林原惠': 3919, '宫村优子': 3878, '三石琴乃': 3918, '山寺宏一': 3914, '石冢运升': 4045,
        'Evan Call': 10895
      };
      function resolveMonoHref(rawName, fallbackKind) {
        const clean = String(rawName || '').split('(')[0].split('·')[0].trim();
        const map = fallbackKind === 'person' ? PRSN_ID_MAP : CRT_ID_MAP;
        for (const k of Object.keys(map)) {
          if (clean.includes(k) || String(rawName || '').includes(k)) {
            return fallbackKind === 'person' ? `person.html?id=${map[k]}` : `character.html?id=${map[k]}`;
          }
        }
        return `mono.html?tab=${fallbackKind}&q=${encodeURIComponent(clean)}`;
      }
      data.characters.forEach((ch) => {
        const card = document.createElement('div');
        card.className = 'char-card';
        const isPersonCard = PRSN_ID_MAP[ch.name] || cat === 'music';
        const primaryHref = isPersonCard ? resolveMonoHref(ch.name, 'person') : resolveMonoHref(ch.name, 'character');
        const cvHref = resolveMonoHref(ch.cv, 'person');
        const cvPrefix = (cat === 'real' || cat === 'music' || cat === 'book_series' || cat === 'book_vol') ? '' : 'CV: ';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <a href="${primaryHref}" style="display:contents;color:inherit;text-decoration:none;">
            <img class="char-avatar" src="${ch.img}" alt="${ch.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://lain.bgm.tv/pic/user/l/icon.jpg'" />
          </a>
          <div class="char-info">
            <div class="char-name-row">
              <a href="${primaryHref}" class="char-name" style="color:inherit;text-decoration:none;">${ch.name}</a>
              <span class="char-role-badge">${ch.role.split('/')[0].trim()}</span>
            </div>
            <div class="char-jp">${ch.role}</div>
            <div class="char-cv">${cvPrefix}<a href="${cvHref}" style="color:inherit;text-decoration:none;" onclick="event.stopPropagation()"><strong>${ch.cv}</strong></a></div>
          </div>
        `;
        card.addEventListener('click', (ev) => {
          if (ev.target && ev.target.closest('a')) return;
          window.location.href = primaryHref;
        });
        charGrid.appendChild(card);
      });
    }

    // 8. 中栏：关联条目 (全新高可读性卡片网格 + 分类筛选)
    renderRelations(data.relations || [], 'all');

    // 9. 中栏：长评列表
    const reviewMoreLink = document.getElementById('reviewMoreLink');
    if (reviewMoreLink) {
      reviewMoreLink.setAttribute('href', `subject-reviews.html?id=${id}&tab=reviews`);
    }
    const reviewList = document.getElementById('reviewCardsList');
    if (reviewList) {
      reviewList.innerHTML = '';
      data.reviews.forEach((rv) => {
        const starVal = rv.star || 9;
        const excerptText = rv.summary || rv.excerpt || '';
        const item = document.createElement('article');
        item.className = 'review-card';
        item.innerHTML = `
          <img class="review-author-avatar" src="${rv.avatar}" alt="${rv.user}" onerror="this.src='https://lain.bgm.tv/pic/user/l/icon.jpg'" />
          <div class="review-body">
            <h4 class="review-title"><a href="subject-reviews.html?id=${id}&tab=reviews" style="color:inherit;text-decoration:none;">${rv.title}</a></h4>
            <div class="review-meta">
              <strong>${rv.user}</strong> · <span>评 ${starVal}.0 ★</span> · <span>${rv.time}</span>
            </div>
            <p class="review-excerpt">${excerptText}</p>
          </div>
        `;
        reviewList.appendChild(item);
      });
    }

    // 10. 中栏：小组讨论版
    const topicMoreLink = document.getElementById('topicMoreLink');
    if (topicMoreLink) {
      topicMoreLink.setAttribute('href', `subject-reviews.html?id=${id}&tab=board`);
    }
    const topicBody = document.getElementById('topicTableBody');
    if (topicBody) {
      topicBody.innerHTML = '';
      data.topics.forEach((tp) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="topic-title-cell"><a href="subject-reviews.html?id=${id}&tab=board">${tp.title}</a></td>
          <td><span class="topic-replies-badge">💬 ${tp.replies}</span></td>
          <td class="topic-author">${tp.user}</td>
          <td class="topic-date">${tp.time}</td>
        `;
        topicBody.appendChild(tr);
      });
    }

    // 11. 中栏：漫友吐槽箱 (气泡流与频道过滤)
    const commentMoreLink = document.getElementById('commentMoreLink');
    if (commentMoreLink) {
      commentMoreLink.setAttribute('href', `subject-comments.html?id=${id}`);
    }
    renderTsukkomiStream(data.comments || [], 'all');

    // 12. 右栏：全站评分透视 (仿原版竖向直方图 + 水平条形图双模)
    const chartMoreStatsLink = document.getElementById('chartMoreStatsLink'); if (chartMoreStatsLink) chartMoreStatsLink.setAttribute('href', `subject-stats.html?id=${id}`);
    const infoboxEditWikiLink = document.getElementById('infoboxEditWikiLink'); if (infoboxEditWikiLink) infoboxEditWikiLink.setAttribute('href', `subject-wiki.html?id=${id}`);
    renderRatingChart(data);
  }

  // 根据 6 大形态动态渲染中栏第一工作台 (#subjectPrgCard)
  function renderCategoryWorkbench(data, cat) {
    const epGrid = document.getElementById('epGridContainer');
    const epLegend = document.getElementById('epPrgLegend');
    const btnWatchAll = document.getElementById('btnWatchAll');
    const btnOpenAllEps = document.getElementById('btnOpenAllEps');
    const btnOpenEpDiscuss = document.getElementById('btnOpenEpDiscuss');
    const mediaWorkbench = document.getElementById('mediaSpecificWorkbench');
    const curSubjId = String(data.id || '400602');
    const epSubjId = (curSubjId === '225581' || curSubjId === '477900') ? curSubjId : '400602';
    const epFirstId = curSubjId === '225581' ? '770528' : (curSubjId === '477900' ? '4779001' : '1227087');
    if (btnOpenAllEps) {
      btnOpenAllEps.href = `subject-ep.html?id=${epSubjId}`;
      btnOpenAllEps.style.display = (cat === 'anime' || cat === 'real' || cat === 'music') ? 'inline-flex' : 'none';
    }
    if (btnOpenEpDiscuss) {
      btnOpenEpDiscuss.href = `ep.html?id=${epFirstId}`;
      btnOpenEpDiscuss.style.display = (cat === 'anime' || cat === 'real' || cat === 'music') ? 'inline-flex' : 'none';
    }

    if (cat === 'anime' || cat === 'real') {
      if (epGrid) epGrid.style.display = 'grid';
      if (epLegend) epLegend.style.display = 'flex';
      if (btnWatchAll) {
        btnWatchAll.style.display = 'inline-flex';
        btnWatchAll.textContent = '✓ 全部看过';
      }
      if (mediaWorkbench) {
        mediaWorkbench.style.display = 'none';
        mediaWorkbench.innerHTML = '';
      }
      setText('workbenchSecTitle', cat === 'real' ? '剧集观看进度打卡' : '章节进度打卡');
      userEpisodeState = {};
      const defaultWatched = Math.min(cat === 'real' ? 6 : 12, data.eps);
      for (let i = 1; i <= data.eps; i++) {
        userEpisodeState[i] = i <= defaultWatched;
      }
      renderEpisodeGrid(data.eps);
      return;
    }

    // 非剧集条目：隐藏章节格子，开启专属媒介工作台
    if (epGrid) epGrid.style.display = 'none';
    if (epLegend) epLegend.style.display = 'none';
    if (btnWatchAll) btnWatchAll.style.display = 'none';
    if (!mediaWorkbench) return;
    mediaWorkbench.style.display = 'block';

    if (cat === 'book_series') {
      setText('workbenchSecTitle', '漫画系列 · 卷数 / 话数双轨阅读进度');
      let vRead = data.volumes_read || 13;
      const vTotal = data.volumes_total || 15;
      let cRead = data.chaps_read || 135;
      const cTotal = data.chaps_total || 140;

      const updateBookProgressHeader = () => {
        const prgDisplay = document.getElementById('prgCountDisplay');
        if (prgDisplay) {
          prgDisplay.innerHTML = `Vol. <span class="accent">${vRead}</span>/${vTotal} 卷 · Chap. <span class="accent">${cRead}</span>/${cTotal} 话`;
        }
      };
      updateBookProgressHeader();

      mediaWorkbench.innerHTML = `
        <div class="book-series-workbench">
          <div class="book-stepper-card">
            <div class="stepper-header">
              <span class="stepper-label">📚 单行本卷数进度</span>
              <span class="stepper-badge">Vol. Volume</span>
            </div>
            <div class="stepper-controls">
              <div class="stepper-input-group">
                <input type="number" class="stepper-input" id="inputVolRead" value="${vRead}" min="0" max="${vTotal}" />
                <span class="stepper-slash">/ ${vTotal} 卷</span>
              </div>
              <button type="button" class="stepper-plus-btn" id="btnPlusVol">+1 卷</button>
            </div>
            <div class="stepper-bar-track">
              <div class="stepper-bar-fill" id="barFillVol" style="width: ${(vRead / vTotal * 100).toFixed(1)}%;"></div>
            </div>
          </div>

          <div class="book-stepper-card">
            <div class="stepper-header">
              <span class="stepper-label">📖 连载章节进度</span>
              <span class="stepper-badge">Chap. Chapter</span>
            </div>
            <div class="stepper-controls">
              <div class="stepper-input-group">
                <input type="number" class="stepper-input" id="inputChapRead" value="${cRead}" min="0" max="${cTotal}" />
                <span class="stepper-slash">/ ${cTotal} 话</span>
              </div>
              <button type="button" class="stepper-plus-btn" id="btnPlusChap">+1 话</button>
            </div>
            <div class="stepper-bar-track">
              <div class="stepper-bar-fill" id="barFillChap" style="width: ${(cRead / cTotal * 100).toFixed(1)}%;"></div>
            </div>
          </div>
        </div>
      `;

      const btnPlusVol = document.getElementById('btnPlusVol');
      const inputVol = document.getElementById('inputVolRead');
      const barVol = document.getElementById('barFillVol');
      if (btnPlusVol && inputVol && barVol) {
        btnPlusVol.addEventListener('click', () => {
          vRead = Math.min(vTotal, vRead + 1);
          data.volumes_read = vRead;
          inputVol.value = vRead;
          barVol.style.width = `${(vRead / vTotal * 100).toFixed(1)}%`;
          updateBookProgressHeader();
          showToast(`单行本进度已推进至：Vol.${vRead} / ${vTotal} 卷 📚`, 'success');
        });
      }

      const btnPlusChap = document.getElementById('btnPlusChap');
      const inputChap = document.getElementById('inputChapRead');
      const barChap = document.getElementById('barFillChap');
      if (btnPlusChap && inputChap && barChap) {
        btnPlusChap.addEventListener('click', () => {
          cRead = Math.min(cTotal, cRead + 1);
          data.chaps_read = cRead;
          inputChap.value = cRead;
          barChap.style.width = `${(cRead / cTotal * 100).toFixed(1)}%`;
          updateBookProgressHeader();
          showToast(`连载话数进度已推进至：Chap.${cRead} / ${cTotal} 话 📖`, 'success');
        });
      }
    } else if (cat === 'book_vol') {
      setText('workbenchSecTitle', '单行本分卷导航与藏书档案 (Tankobon Volume 01)');
      const prgDisplay = document.getElementById('prgCountDisplay');
      if (prgDisplay) {
        prgDisplay.innerHTML = `<span class="accent">已读完本卷</span> · 收录第 1~7 话`;
      }
      mediaWorkbench.innerHTML = `
        <div class="single-vol-workbench">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-size:12.5px; color:var(--muted);">💡 提示：单行本条目无独立章节格子，您可通过下方分卷导航快速返回主系列或切换相邻卷：</span>
            <span style="font-size:11.5px; font-weight:700; color:#059669; background:rgba(16,185,129,0.1); padding:3px 10px; border-radius:999px;">✓ 2024-02-18 已读过 · 实体书已入库</span>
          </div>
          <div class="vol-sibling-nav">
            <button type="button" class="vol-pill parent-link" id="btnBackToMainSeries">← 返回《葬送的芙莉莲》主系列总览</button>
            <button type="button" class="vol-pill current">Vol.01 (当前卷)</button>
            <button type="button" class="vol-pill" data-vol-toast="Vol.02 (2020-10-16)">Vol.02</button>
            <button type="button" class="vol-pill" data-vol-toast="Vol.03 (2020-12-18)">Vol.03</button>
            <button type="button" class="vol-pill" data-vol-toast="Vol.04 (2021-03-17)">Vol.04</button>
            <button type="button" class="vol-pill" data-vol-toast="Vol.05 (2021-07-16)">Vol.05</button>
            <button type="button" class="vol-pill" data-vol-toast="Vol.06 (2021-11-18)">Vol.06</button>
          </div>
        </div>
      `;
      const backBtn = document.getElementById('btnBackToMainSeries');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          renderSubject('305429');
          showToast('已返回《葬送的芙莉莲》主系列总览！📚', 'info');
        });
      }
      mediaWorkbench.querySelectorAll('.vol-pill[data-vol-toast]').forEach((b) => {
        b.addEventListener('click', () => {
          showToast(`已选中相邻单行本：${b.dataset.volToast}`, 'info');
        });
      });
    } else if (cat === 'music') {
      setText('workbenchSecTitle', '专辑曲目列表 (Disc 1 / Disc 2 Tracklist)');
      const prgDisplay = document.getElementById('prgCountDisplay');
      if (prgDisplay) {
        prgDisplay.innerHTML = `2CD · 全 <span class="accent">70</span> 曲 · 139 分钟`;
      }
      let activeDiscIdx = 0;
      const renderDiscView = (discIdx) => {
        const disc = (data.discs || [])[discIdx] || { name: 'Disc 1', tracks: [] };
        mediaWorkbench.innerHTML = `
          <div class="music-tracklist-workbench">
            <div class="disc-tabs-row">
              ${(data.discs || []).map((d, idx) => `
                <button type="button" class="disc-tab-btn ${idx === discIdx ? 'active' : ''}" data-disc-idx="${idx}">
                  💿 ${d.name}
                </button>
              `).join('')}
            </div>
            <div class="tracklist-grid">
              ${disc.tracks.map((tr, tIdx) => `
                <div class="track-item-row ${tIdx === 0 ? 'playing' : ''}" data-track-title="${tr.title}">
                  <span class="track-num">${tIdx === 0 ? '▶' : tr.num}</span>
                  <span class="track-title">${tr.title}</span>
                  <span class="track-artist">${tr.artist}</span>
                  <span class="track-duration">${tr.duration}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        mediaWorkbench.querySelectorAll('.disc-tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            activeDiscIdx = Number(btn.dataset.discIdx);
            renderDiscView(activeDiscIdx);
            showToast(`已切换至 ${data.discs[activeDiscIdx].name} 💿`, 'info');
          });
        });
        mediaWorkbench.querySelectorAll('.track-item-row').forEach((row) => {
          row.addEventListener('click', () => {
            mediaWorkbench.querySelectorAll('.track-item-row').forEach((r, i) => {
              r.classList.remove('playing');
              const numEl = r.querySelector('.track-num');
              if (numEl) numEl.textContent = disc.tracks[i].num;
            });
            row.classList.add('playing');
            const numEl = row.querySelector('.track-num');
            if (numEl) numEl.textContent = '▶';
            showToast(`正在试听曲目：♪ ${row.dataset.trackTitle}`, 'success');
          });
        });
      };
      renderDiscView(0);
    } else if (cat === 'game') {
      setText('workbenchSecTitle', '游玩平台选择与全成就档案 (Game Profile)');
      const prgDisplay = document.getElementById('prgCountDisplay');
      if (prgDisplay) {
        prgDisplay.innerHTML = `累计游玩 <span class="accent">${data.play_stats?.hours || '142.5 h'}</span> · 全成就 <span class="accent">89%</span>`;
      }
      mediaWorkbench.innerHTML = `
        <div class="game-platform-workbench">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">选择您游玩的硬件平台 (点击切换)：</div>
          <div class="platform-pills-row">
            ${(data.platforms || []).map((pf) => `
              <button type="button" class="platform-badge-btn ${pf.active ? 'active' : ''}" data-pf-label="${pf.label}">
                ${pf.label}
              </button>
            `).join('')}
          </div>
          <div class="game-stats-cards">
            <div class="game-stat-card">
              <span class="g-label">⏱️ 累计游玩时长</span>
              <span class="g-val">${data.play_stats?.hours || '142.5 h'}</span>
            </div>
            <div class="game-stat-card">
              <span class="g-label">⚔️ 当前周目进度</span>
              <span class="g-val">${data.play_stats?.run || '第 2 周目'}</span>
            </div>
            <div class="game-stat-card">
              <span class="g-label">🏆 奖杯 / 成就解锁</span>
              <span class="g-val">${data.play_stats?.achievements || '48 / 54 (89%)'}</span>
            </div>
          </div>
        </div>
      `;
      mediaWorkbench.querySelectorAll('.platform-badge-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          mediaWorkbench.querySelectorAll('.platform-badge-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          showToast(`已将游玩平台切换为：${btn.dataset.pfLabel}`, 'success');
        });
      });
    }
  }

  // 渲染关联条目卡片网格与分类筛选
  function renderRelations(relations, filterCat) {
    const row = document.getElementById('relationsRow');
    const countLabel = document.getElementById('relTotalCount');
    if (!row) return;

    const normalized = (relations || []).map((r, idx) => {
      const catKey = r.category || r.cat || 'anime';
      const tagText = r.tag || r.catLabel || r.type || '关联';
      const tagClassMap = {
        manga: 'tag-cat-manga',
        op: 'tag-cat-op',
        ed: 'tag-cat-ed',
        ost: 'tag-cat-ost',
        anime: 'tag-cat-anime'
      };
      return {
        id: r.id || (r.title && r.title.includes('(1)') ? '310920' : r.title && r.title.includes('主系列') ? '305429' : r.title && r.title.includes('TV动画') ? '400602' : 300000 + idx),
        category: catKey,
        tag: tagText,
        tagClass: r.tagClass || tagClassMap[catKey] || 'tag-cat-anime',
        title: r.title,
        subtitle: r.subtitle || '',
        score: Number(r.score || 8.5),
        cover: r.cover || r.img || '',
        fallbackSvg: r.fallbackSvg || 'linear-gradient(135deg, #2563eb, #3b82f6)'
      };
    });

    const filtered = filterCat === 'all'
      ? normalized
      : normalized.filter(r => r.category === filterCat);

    if (countLabel) {
      countLabel.textContent = `共 ${filtered.length} 部关联企划`;
    }

    row.innerHTML = '';
    filtered.forEach((rel) => {
      const a = document.createElement('a');
      a.className = 'relation-card';
      a.href = '#relation-' + rel.id;
      a.innerHTML = `
        <div class="relation-cover-box" style="background: ${rel.fallbackSvg || 'var(--surface)'};">
          <img class="relation-cover" src="${rel.cover}" alt="${rel.title}" referrerpolicy="no-referrer"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="relation-fallback-poster" style="display:none; width:100%; height:100%; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:18px; text-shadow:0 2px 6px rgba(0,0,0,0.25);">
            ${rel.tag.slice(0, 2)}
          </div>
          <span class="relation-score-pill">★ ${rel.score.toFixed(1)}</span>
        </div>
        <div class="relation-card-body">
          <div class="relation-meta-top">
            <span class="relation-card-tag ${rel.tagClass || ''}">${rel.tag}</span>
            <span class="relation-id-code">bgm#${rel.id}</span>
          </div>
          <div class="relation-card-title" title="${rel.title}">${rel.title}</div>
          <div class="relation-card-sub">${rel.subtitle || ''}</div>
        </div>
      `;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (DEFAULT_SUBJECTS[String(rel.id)]) {
          renderSubject(String(rel.id));
          showToast(`已跳转至关联条目：${rel.title}`, 'success');
        } else {
          showToast(`查看关联条目：${rel.title} (★${rel.score})`, 'info');
        }
      });
      row.appendChild(a);
    });
  }

  // 渲染吐槽箱漫画气泡流
  function renderTsukkomiStream(comments, filterType) {
    const stream = document.getElementById('commentStream');
    if (!stream) return;

    let list = comments.slice();
    if (filterType === 'high') {
      list = list.filter(c => c.star >= 9);
    } else if (filterType === 'hot') {
      list = list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    stream.innerHTML = '';
    list.forEach((cm) => {
      const card = buildTsukkomiBubbleCard(cm);
      stream.appendChild(card);
    });
  }

  function buildTsukkomiBubbleCard(cm, isNew = false) {
    const div = document.createElement('div');
    div.className = isNew ? 'tsukkomi-bubble-card highlight-new' : 'tsukkomi-bubble-card';
    const starNum = Math.max(1, Math.min(10, Math.round(Number(cm.star) || 8)));
    const starsStr = '★'.repeat(starNum) + '☆'.repeat(10 - starNum);
    const likesCount = cm.likes || Math.floor(Math.random() * 40 + 5);
    const vibeLabel = cm.vibe || (cm.star >= 9 ? '神作安利' : '客观锐评');
    const curData = getSubjectData(currentSubjectId);
    const badgeMap = {
      anime: `EP.${curData.eps || 28}`,
      book_series: `Vol.${curData.volumes_read || 13}`,
      book_vol: 'Vol.01',
      music: 'Disc 1',
      game: '142h',
      real: `EP.${curData.eps || 10}`
    };
    const epBadgeText = badgeMap[curData.category || 'anime'] || 'EP.28';

    div.innerHTML = `
      <div class="tsukkomi-avatar-col">
        <img class="comment-avatar" src="${cm.avatar}" alt="${cm.user}" referrerpolicy="no-referrer"
          onerror="this.src='https://lain.bgm.tv/pic/user/l/icon.jpg'" />
        <span class="tsukkomi-ep-badge">${epBadgeText}</span>
      </div>
      <div class="tsukkomi-speech-bubble">
        <div class="tsukkomi-bubble-header">
          <div class="tsukkomi-user-meta">
            <span class="comment-user">${cm.user}</span>
            <span class="comment-stars" title="评分 ${starNum} 星">${starsStr} <strong>${starNum}</strong></span>
            <span class="tsukkomi-vibe-pill"># ${vibeLabel}</span>
          </div>
          <span class="comment-time">${cm.time}</span>
        </div>
        <div class="tsukkomi-bubble-text">${cm.text}</div>
        <div class="tsukkomi-bubble-footer">
          <span class="tsukkomi-via">来自 Bangumi Web 吐槽终端</span>
          <div class="tsukkomi-actions">
            <button class="tiete-btn" type="button" title="给这条吐槽贴贴点赞">
              <span class="tiete-icon">💖</span>
              <span>贴贴</span>
              <span class="tiete-count">${likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const tieteBtn = div.querySelector('.tiete-btn');
    if (tieteBtn) {
      tieteBtn.addEventListener('click', () => {
        const countSpan = tieteBtn.querySelector('.tiete-count');
        let current = parseInt(countSpan.textContent, 10) || 0;
        if (tieteBtn.classList.contains('liked')) {
          tieteBtn.classList.remove('liked');
          countSpan.textContent = String(Math.max(0, current - 1));
        } else {
          tieteBtn.classList.add('liked');
          countSpan.textContent = String(current + 1);
          const heart = document.createElement('span');
          heart.className = 'floating-heart';
          heart.textContent = '+1 💖';
          tieteBtn.appendChild(heart);
          setTimeout(() => heart.remove(), 750);
        }
      });
    }

    return div;
  }

  // 渲染章节格子矩阵
  function renderEpisodeGrid(totalEps) {
    const grid = document.getElementById('epGridContainer');
    if (!grid) return;
    grid.innerHTML = '';
    let watchedCount = 0;

    for (let i = 1; i <= totalEps; i++) {
      const isWatched = !!userEpisodeState[i];
      if (isWatched) watchedCount++;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-btn';
      if (isWatched) {
        btn.classList.add('watched');
      } else if (i === watchedCount + 1) {
        btn.classList.add('current');
      }

      const numStr = i < 10 ? `0${i}` : `${i}`;
      btn.innerHTML = `
        ${numStr}
        <span class="ep-tooltip">EP.${numStr} · 点击切换看过状态</span>
      `;

      btn.addEventListener('click', () => {
        if (!userEpisodeState[i] && i > 1 && !userEpisodeState[i - 1]) {
          for (let k = 1; k <= i; k++) userEpisodeState[k] = true;
          showToast(`已连带标记至 EP.${numStr} 看过`, 'success');
        } else {
          userEpisodeState[i] = !userEpisodeState[i];
          showToast(
            userEpisodeState[i] ? `已标记 EP.${numStr} 看过` : `已取消 EP.${numStr} 标记`,
            'info'
          );
        }
        renderEpisodeGrid(totalEps);
      });

      grid.appendChild(btn);
    }

    const prgDisplay = document.getElementById('prgCountDisplay');
    if (prgDisplay) {
      prgDisplay.innerHTML = `已看 <span class="accent">${watchedCount}</span> / ${totalEps} 话`;
    }
  }

  // 渲染右栏：全站评分透视 (仿原版 10~1 竖向直方图 + 水平条形图)
  function renderRatingChart(data) {
    setText('scoreRankAlarm', `#${data.rank}`);

    const rScore = data.rating ? Number(data.rating.score) : Number(data.score || 8.5);
    const rTotal = data.rating ? Number(data.rating.total) : Number(data.total_votes || 1000);
    const rStdDev = data.rating ? Number(data.rating.standard_deviation) : Number(data.std_dev || 1.05);
    const rDesc = data.rating ? data.rating.desc : (data.score_desc || '力荐 (Great)');

    const scoreStr = rScore.toFixed(1);
    const [intPart, decPart] = scoreStr.split('.');
    const scoreBigEl = document.getElementById('scoreBigNum');
    if (scoreBigEl) {
      scoreBigEl.innerHTML = `<span class="score-int">${intPart}</span><span class="score-dot">.</span><span class="score-dec">${decPart}</span>`;
    }

    setText('scoreDescBadge', rDesc);

    const starsVisualEl = document.getElementById('scoreStarsVisual');
    if (starsVisualEl) {
      const fullStars = Math.min(5, Math.max(1, Math.round(rScore / 2)));
      starsVisualEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    }

    const totalVotesEl = document.getElementById('scoreTotalVotes');
    if (totalVotesEl) {
      totalVotesEl.innerHTML = `由 <strong>${rTotal.toLocaleString()}</strong> 人评价`;
    }

    setText('chartStdDev', `${rStdDev}`);

    const consensusEl = document.getElementById('chartConsensus');
    if (consensusEl) {
      consensusEl.textContent = rStdDev <= 1.2 ? '极高 (稳固力荐)' : '中等 (神作分歧)';
    }

    const sumVotes = (data.chart_bars || []).reduce((acc, b) => acc + (b.count || 0), 0) || 1;
    const normalizedBars = (data.chart_bars || []).map((b) => ({
      star: b.star,
      count: b.count,
      percent: b.percent !== undefined ? Number(b.percent) : (b.count / sumVotes) * 100
    }));

    const maxPercent = Math.max(...normalizedBars.map(b => b.percent), 1);

    // A. 渲染原版 10~1 竖向柱状分布图
    const histContainer = document.getElementById('histogramBarsContainer');
    const histLabels = document.getElementById('histogramLabelsRow');
    const inspectBadge = document.getElementById('inspectStarBadge');
    const inspectDetail = document.getElementById('inspectDetailText');

    // 找出最高票分段作为默认展示
    const peakBar = normalizedBars.reduce((acc, cur) => (cur.count > acc.count ? cur : acc), normalizedBars[0]);
    if (inspectBadge && inspectDetail && peakBar) {
      inspectBadge.textContent = `峰值 ${peakBar.star}★ (${STAR_DESCRIPTIONS[peakBar.star].split(' ')[1]})`;
      inspectDetail.textContent = `${peakBar.count.toLocaleString()} 人 (${peakBar.percent.toFixed(1)}%)`;
    }

    if (histContainer && histLabels) {
      histContainer.innerHTML = '';
      histLabels.innerHTML = '';

      normalizedBars.forEach((bar) => {
        const isPeak = bar.star === peakBar.star;
        const heightRatio = Math.max(6, Math.round((bar.percent / maxPercent) * 100));

        const col = document.createElement('div');
        col.className = isPeak ? 'hist-bar-col is-peak' : 'hist-bar-col';
        col.dataset.star = bar.star;
        col.innerHTML = `
          <div class="hist-col-tooltip">${bar.star}分: ${bar.count.toLocaleString()}人 (${bar.percent.toFixed(1)}%)</div>
          <span class="hist-bar-top-pct">${Math.round(bar.percent)}%</span>
          <div class="hist-bar-track">
            <div class="hist-bar-fill" style="height: ${heightRatio}%;"></div>
          </div>
        `;

        const labelSpan = document.createElement('span');
        labelSpan.className = isPeak ? 'hist-x-label is-active' : 'hist-x-label';
        labelSpan.dataset.star = bar.star;
        labelSpan.textContent = bar.star;

        col.addEventListener('mouseenter', () => {
          histLabels.querySelectorAll('.hist-x-label').forEach(l => {
            l.classList.toggle('is-active', Number(l.dataset.star) === bar.star);
          });
          if (inspectBadge && inspectDetail) {
            inspectBadge.textContent = `${bar.star}★ ${STAR_DESCRIPTIONS[bar.star].split(' ')[1]}`;
            inspectDetail.textContent = `${bar.count.toLocaleString()} 人投出此分 (占 ${bar.percent.toFixed(2)}%)`;
          }
        });

        col.addEventListener('mouseleave', () => {
          histLabels.querySelectorAll('.hist-x-label').forEach(l => {
            l.classList.toggle('is-active', Number(l.dataset.star) === peakBar.star);
          });
          if (inspectBadge && inspectDetail) {
            inspectBadge.textContent = `峰值 ${peakBar.star}★ (${STAR_DESCRIPTIONS[peakBar.star].split(' ')[1]})`;
            inspectDetail.textContent = `${peakBar.count.toLocaleString()} 人 (${peakBar.percent.toFixed(1)}%)`;
          }
        });

        histContainer.appendChild(col);
        histLabels.appendChild(labelSpan);
      });
    }

    // B. 渲染水平横向对比明细视图 (用于双模切换)
    const barsContainer = document.getElementById('chartBarsList');
    if (barsContainer) {
      barsContainer.innerHTML = '';
      normalizedBars.forEach((bar) => {
        const isPeak = bar.star === peakBar.star;
        const relativeWidth = Math.max(3, (bar.percent / maxPercent) * 100);
        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.title = `${bar.star}星: ${bar.count.toLocaleString()}人 (${bar.percent.toFixed(2)}%)`;
        row.innerHTML = `
          <span class="chart-star-num">${bar.star}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill ${isPeak ? 'peak' : ''}" style="width: ${relativeWidth.toFixed(1)}%;"></div>
          </div>
          <span class="chart-bar-pct">${bar.percent.toFixed(1)}%</span>
          <span class="chart-bar-count">(${bar.count})</span>
        `;
        barsContainer.appendChild(row);
      });
    }
  }

  // 初始化 10 级星级评价器 (带波浪弹簧悬浮 & 点击爆破发光动画)
  function initStarRating() {
    const starsContainer = document.getElementById('starsRow');
    const hintEl = document.getElementById('ratingHoverHint');
    const ratingBox = starsContainer ? starsContainer.closest('.star-rating-box') : null;
    if (!starsContainer || !hintEl) return;

    starsContainer.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'star-unit';
      btn.dataset.val = i;
      btn.setAttribute('aria-label', `评 ${i} 星`);
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;

      // 鼠标移入：阶梯波浪缩放 + 高亮预览
      btn.addEventListener('mouseenter', () => {
        if (ratingBox) ratingBox.classList.add('rating-active');
        highlightStarsWave(i, true, false);
        hintEl.textContent = STAR_DESCRIPTIONS[i];
        hintEl.classList.add('is-active');
      });

      // 鼠标点击：锁定星级 + 触发错峰弹簧爆破发光动画
      btn.addEventListener('click', () => {
        userRatingScore = i;
        highlightStarsWave(i, false, true);
        hintEl.textContent = `${STAR_DESCRIPTIONS[i]} (已评)`;
        hintEl.classList.remove('is-active', 'pop-anim');
        void hintEl.offsetWidth; // 触发 reflow 重播弹簧动画
        hintEl.classList.add('pop-anim');

        // 同步吐槽箱的下拉评分
        const scoreSel = document.getElementById('launchpadScoreSelect');
        if (scoreSel) scoreSel.value = String(i);

        showToast(`已成功为本条目评出：${STAR_DESCRIPTIONS[i]} ⭐`, 'success');
      });

      starsContainer.appendChild(btn);
    }

    starsContainer.addEventListener('mouseleave', () => {
      if (ratingBox) ratingBox.classList.remove('rating-active');
      highlightStarsWave(userRatingScore, false, false);
      hintEl.classList.remove('is-active');
      hintEl.textContent = userRatingScore > 0
        ? `${STAR_DESCRIPTIONS[userRatingScore]} (已选)`
        : "未评分";
    });

    highlightStarsWave(userRatingScore, false, false);
    hintEl.textContent = `${STAR_DESCRIPTIONS[userRatingScore]} (已选)`;
  }

  function highlightStarsWave(targetVal, isHover, triggerBurst) {
    const units = document.querySelectorAll('#starsRow .star-unit');
    units.forEach((u) => {
      const val = Number(u.dataset.val);
      u.classList.remove('active', 'hover-preview', 'wave-near', 'wave-far', 'burst-pop');

      if (val <= targetVal) {
        u.classList.add(isHover ? 'hover-preview' : 'active');
      }

      if (isHover) {
        const dist = Math.abs(val - targetVal);
        if (dist === 1) u.classList.add('wave-near');
        else if (dist === 2) u.classList.add('wave-far');
      }

      if (triggerBurst && val <= targetVal) {
        u.style.animationDelay = `${(val - 1) * 28}ms`;
        u.classList.add('burst-pop');
      } else {
        u.style.animationDelay = '0ms';
      }
    });
  }

  // 初始化收藏盒 5 态切换 (自适应 看/读/听/玩)
  function initInterestStatusPills() {
    const pills = document.querySelectorAll('.interest-status-selector .interest-btn, #interestStatusPills .status-pill');
    const stateLabel = document.getElementById('userInterestStateLabel');

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        userInterestState = pill.dataset.status || pill.dataset.state || '3';
        const data = getSubjectData(currentSubjectId);
        const verb = data.verb || '看';
        const noun = data.noun || '这部动画';
        const stateMap = {
          '1': `想${verb}${noun}`,
          '2': `${verb}过${noun}`,
          '3': `我正巧在${verb}${noun}`,
          '4': `暂时搁置了${noun}`,
          '5': `已抛弃${noun}`
        };
        const name = stateMap[userInterestState] || `我正巧在${verb}${noun}`;
        if (stateLabel) stateLabel.textContent = name;

        if (userInterestState === '2' && (data.category === 'anime' || data.category === 'real')) {
          for (let i = 1; i <= data.eps; i++) userEpisodeState[i] = true;
          renderEpisodeGrid(data.eps);
          showToast(`已将条目设为「${verb}过」，全部章节已同步点亮！`, 'success');
        } else {
          showToast(`收藏状态已切换为：「${pill.textContent.trim()}」`, 'info');
        }
      });
    });
  }

  // 初始化交互事件（顶部6大形态切换器、关联筛选、直方图切换、吐槽箱发射台等）
  function initInteractiveControls() {
    // 1. 顶部横幅 6 大形态切换器 + 右侧全品类示例作品切换器
    const switcherPills = document.querySelectorAll('.banner-cat-pill, .subject-preset-pills .preset-pill-btn, #subjectSwitcher .switcher-pill');
    switcherPills.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.subjectId;
        if (!targetId) return;
        renderSubject(targetId);
        document.querySelectorAll('#relationFilterTabs .rel-filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.cat === 'all');
        });
        showToast(`已切换条目形态：${btn.textContent.trim()}`, 'info');
      });
    });

    // 2. 关联条目分类筛选按钮
    const relFilterBtns = document.querySelectorAll('#relationFilterTabs .rel-filter-btn');
    relFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        relFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat || 'all';
        const data = getSubjectData(currentSubjectId);
        renderRelations(data.relations || [], cat);
      });
    });

    // 3. 评分统计图：竖向立柱 vs 横向明细切换
    const chartToggleBtns = document.querySelectorAll('#chartViewToggle .chart-toggle-btn');
    const histWrapper = document.getElementById('bangumiHistogramWrapper');
    const horizBars = document.getElementById('chartBarsList');
    chartToggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        chartToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'list' || mode === 'horizontal') {
          if (histWrapper) histWrapper.style.display = 'none';
          if (horizBars) horizBars.style.display = 'flex';
        } else {
          if (histWrapper) histWrapper.style.display = 'block';
          if (horizBars) horizBars.style.display = 'none';
        }
      });
    });

    // 4. 漫友吐槽箱：频道切换 (全部 / 高分安利 / 热门贴贴)
    const channelPills = document.querySelectorAll('#tsukkomiChannelPills .channel-pill');
    channelPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        channelPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.dataset.filter || 'all';
        const data = getSubjectData(currentSubjectId);
        renderTsukkomiStream(data.comments || [], filter);
      });
    });

    // 5. 漫友吐槽箱：快捷词条一键填入
    const quickTags = document.querySelectorAll('#launchpadQuickTags .quick-tag-chip');
    const tsukkomiInput = document.getElementById('tsukkomiInput');
    quickTags.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!tsukkomiInput) return;
        const insertText = chip.dataset.text || chip.dataset.insert || chip.textContent;
        tsukkomiInput.value = tsukkomiInput.value
          ? `${tsukkomiInput.value} ${insertText}`
          : insertText;
        tsukkomiInput.focus();
      });
    });

    // 6. 漫友吐槽箱：发射吐槽按钮
    const sendBtn = document.getElementById('btnSendTsukkomi');
    const scoreSelect = document.getElementById('launchpadScoreSelect');
    if (sendBtn && tsukkomiInput) {
      const submitTsukkomi = () => {
        const text = tsukkomiInput.value.trim();
        if (!text) {
          showToast('先写点吐槽内容再发射吧 ✨', 'info');
          tsukkomiInput.focus();
          return;
        }
        const selectedStar = scoreSelect ? Number(scoreSelect.value) : userRatingScore || 9;
        const newComment = {
          user: "少年游 (你)",
          avatar: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg",
          star: selectedStar,
          time: "刚刚",
          text: text,
          likes: 1,
          vibe: "新鲜首评"
        };

        // 写入当前数据并插入气泡流顶部
        const data = getSubjectData(currentSubjectId);
        data.comments.unshift(newComment);

        const stream = document.getElementById('commentStream');
        if (stream) {
          const card = buildTsukkomiBubbleCard(newComment, true);
          stream.prepend(card);
        }

        tsukkomiInput.value = '';
        showToast('吐槽弹幕已成功打入吐槽箱！💬', 'success');
      };

      sendBtn.addEventListener('click', submitTsukkomi);
      tsukkomiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitTsukkomi();
        }
      });
    }

    // 7. Infobox 展开/收起
    const btnInfobox = document.getElementById('infoboxToggleBtn');
    const infoboxList = document.getElementById('infoboxList');
    if (btnInfobox && infoboxList) {
      btnInfobox.addEventListener('click', () => {
        const isExp = infoboxList.classList.toggle('expanded');
        btnInfobox.textContent = isExp ? '收起详细制作人员 ▴' : '展开全部制作人员 (68项) ▾';
      });
    }

    // 8. 剧情简介展开/收起
    const btnSummary = document.getElementById('summaryExpandBtn');
    const summaryText = document.getElementById('subjectSummaryText');
    if (btnSummary && summaryText) {
      btnSummary.addEventListener('click', () => {
        const isCol = summaryText.classList.toggle('collapsed');
        const fadeMask = summaryText.parentElement
          ? summaryText.parentElement.querySelector('.summary-fade-mask')
          : null;
        if (fadeMask) {
          fadeMask.style.display = isCol ? 'block' : 'none';
        }
        btnSummary.textContent = isCol ? '展开完整剧情简介 ▾' : '收起完整剧情简介 ▴';
      });
    }

    // 9. 一键全部看过按钮
    const btnWatchAll = document.getElementById('btnWatchAll');
    if (btnWatchAll) {
      btnWatchAll.addEventListener('click', () => {
        const data = getSubjectData(currentSubjectId);
        for (let i = 1; i <= data.eps; i++) userEpisodeState[i] = true;
        renderEpisodeGrid(data.eps);
        showToast(`已将全部 ${data.eps} 话标记为看过！`, 'success');
      });
    }

    // 10. 顶栏日夜主题切换
    const themeToggle = document.getElementById('btnThemeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStarRating();
    initInterestStatusPills();
    initInteractiveControls();
    const qsId = new URLSearchParams(window.location.search).get('id');
    renderSubject(qsId && DEFAULT_SUBJECTS[qsId] ? qsId : "400602");
  });
})();
