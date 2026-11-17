/* ==========================================================================
   Bangumi Time Machine (个人时光机 Page 25 & 分类收藏夹 Page 26)
   Interactive Controller & Real Multi-Profile Dataset
   ========================================================================== */

(function () {
  "use strict";

  const USER_PROFILES = {
    "553488": {
      uid: "553488",
      handle: "@553488",
      nickname: "少年游",
      roleBadge: "ACGN 深度阅片家 · LV.9",
      joinDate: "2020-06-27",
      serviceYears: "时光机服役 6 年",
      avatar: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1",
      backdrop: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
      customBgArt: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1",
      bioText: "「勇者ヒンメルならそうした。」\n偏爱慢节奏公路片、90年代赛璐珞机甲、CRPG与叙事向独游。\n打分标准：10★ 灵魂烙印 / 9★ 年度挚爱 / 8★ 诚意佳作 / 7★ 不虚此行。",
      bioTags: ["公路奇幻", "90年代赛璐珞", "菅野洋子", "CRPG博德之门", "漫画单行本党", "OST黑胶控"],
      counters: {
        totalCollect: "1,142",
        completed: "868",
        completionRate: "76.0%",
        wikiEdits: "186"
      },
      sync: {
        sharedCount: 42,
        rateInt: "78",
        rateDec: ".92%",
        rateFloat: 78.92,
        verdict: "电波高度同频 · 灵魂知己",
        resonances: [
          { id: "400602", title: "葬送的芙莉莲", myScore: 9, theirScore: 9 },
          { id: "265", title: "新世纪福音战士", myScore: 10, theirScore: 10 },
          { id: "253", title: "星际牛仔", myScore: 10, theirScore: 10 },
          { id: "37141", title: "博德之门 3", myScore: 10, theirScore: 9 }
        ]
      },
      services: [
        { type: "bgm", label: "Bangumi", value: "2020-06-27 加入", url: "#headerProfile" },
        { type: "steam", label: "Steam", value: "ShaoNianYou_99", url: "javascript:void(0)" },
        { type: "psn", label: "PSN", value: "SNY_Tokyo", url: "javascript:void(0)" },
        { type: "github", label: "GitHub", value: "shaonianyou-dev", url: "javascript:void(0)" },
        { type: "blog", label: "个人站点", value: "notes.bgm.studio", url: "javascript:void(0)" }
      ],
      stats: {
        all: {
          collect: 1142, complete: 868, rate: "76.0%", mean: "7.84", std: "1.18", scored: 792,
          counts: { 10: 68, 9: 164, 8: 285, 7: 176, 6: 64, 5: 21, 4: 8, 3: 4, 2: 1, 1: 1 }
        },
        anime: {
          collect: 845, complete: 674, rate: "79.8%", mean: "7.76", std: "1.21", scored: 612,
          counts: { 10: 46, 9: 122, 8: 224, 7: 142, 6: 52, 5: 16, 4: 6, 3: 3, 2: 1, 1: 0 }
        },
        book: {
          collect: 128, complete: 92, rate: "71.9%", mean: "8.24", std: "0.96", scored: 84,
          counts: { 10: 12, 9: 22, 8: 34, 7: 12, 6: 3, 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        music: {
          collect: 64, complete: 52, rate: "81.3%", mean: "8.48", std: "0.88", scored: 48,
          counts: { 10: 6, 9: 14, 8: 22, 7: 5, 6: 1, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        game: {
          collect: 76, complete: 34, rate: "44.7%", mean: "8.12", std: "1.14", scored: 32,
          counts: { 10: 3, 9: 5, 8: 12, 7: 8, 6: 3, 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        real: {
          collect: 29, complete: 16, rate: "55.2%", mean: "7.95", std: "1.05", scored: 16,
          counts: { 10: 1, 9: 3, 8: 7, 7: 3, 6: 2, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }
      },
      categories: {
        anime: {
          title: "动画收藏",
          verb: "看",
          icon: "🎬",
          counts: { do: 23, collect: 674, wish: 118, on_hold: 19, dropped: 11 },
          doing: [
            {
              id: "400602",
              title: "葬送的芙莉莲",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
              prgText: "EP 28 / 28",
              prgPct: 100,
              score: 9,
              date: "2026-11-02",
              tags: ["MADHOUSE", "奇幻", "斋藤圭一郎", "2023年10月"],
              info: "28话 / 2023年9月29日 / 斋藤圭一郎 / MADHOUSE",
              comment: "在辛美尔死后的第29年，光阴终于有了具体的重量。斋藤圭一郎与Evan Call把余生拍成了一首散文诗。"
            },
            {
              id: "253",
              title: "星际牛仔",
              orig: "カウボーイビバップ",
              cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
              prgText: "EP 24 / 26",
              prgPct: 92,
              score: 10,
              date: "2026-10-28",
              tags: ["渡边信一郎", "菅野洋子", "SUNRISE", "科幻"],
              info: "26话 / 1998年4月3日 / 渡边信一郎 / SUNRISE",
              comment: "多轨重温第4遍，布鲁斯与爵士乐在太空回荡，You're gonna carry that weight."
            }
          ],
          collected: [
            {
              id: "265",
              title: "新世纪福音战士",
              orig: "新世紀エヴァンゲリオン",
              cover: "https://lain.bgm.tv/pic/cover/l/e5/69/265_Z5Uou.jpg",
              score: 10,
              date: "2026-09-15",
              tags: ["庵野秀明", "GAINAX", "EVA", "神作", "科幻"],
              info: "26话 / 1995年10月4日 / 庵野秀明 / GAINAX",
              comment: "第24话长达一分钟的静止帧与欢乐颂，永远定义了TV动画演出的极限。"
            },
            {
              id: "400602",
              title: "葬送的芙莉莲",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
              score: 9,
              date: "2026-11-02",
              tags: ["MADHOUSE", "奇幻", "2023年10月", "神作"],
              info: "28话 / 2023年9月29日 / 斋藤圭一郎 / MADHOUSE",
              comment: "半年番的贅沢工期，每一帧背景美术都能直接装裱。"
            },
            {
              id: "253",
              title: "星际牛仔",
              orig: "カウボーイビバップ",
              cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
              score: 10,
              date: "2026-08-19",
              tags: ["渡边信一郎", "菅野洋子", "太空歌剧", "神作"],
              info: "26话 / 1998年4月3日 / 渡边信一郎 / SUNRISE",
              comment: "Bang! 浪漫与孤独的终极形态。"
            },
            {
              id: "400602",
              title: "攻壳机动队 S.A.C.",
              orig: "攻殻機動隊 STAND ALONE COMPLEX",
              cover: "https://lain.bgm.tv/pic/cover/l/32/14/324_y2h22.jpg",
              score: 10,
              date: "2026-07-04",
              tags: ["神山健治", "Production.I.G", "赛博朋克", "科幻"],
              info: "26话 / 2002年10月1日 / 神山健治 / Production I.G",
              comment: "笑面男事件的社会学预言在二十年后的互联网时代愈发振聋发聩。"
            },
            {
              id: "265",
              title: "乒乓 THE ANIMATION",
              orig: "ピンポン THE ANIMATION",
              cover: "https://lain.bgm.tv/pic/cover/l/67/88/92784_6212E.jpg",
              score: 10,
              date: "2026-05-12",
              tags: ["汤浅政明", "松本大洋", "青春", "神作"],
              info: "11话 / 2014年4月10日 / 汤浅政明 / 龙之子",
              comment: "英雄登场！鲜血淋漓的胜负与超越胜负的自由。"
            },
            {
              id: "253",
              title: "日常",
              orig: "日常",
              cover: "https://lain.bgm.tv/pic/cover/l/be/1f/9912_LZML8.jpg",
              score: 9,
              date: "2026-04-01",
              tags: ["京都动画", "石原立也", "搞笑", "神作"],
              info: "26话 / 2011年4月2日 / 石原立也 / 京都动画",
              comment: "我们所度过的每个平凡的日常，也许就是连续发生的奇迹。"
            }
          ]
        },
        book: {
          title: "书籍收藏 (系列 & 单行本)",
          verb: "读",
          icon: "📚",
          counts: { do: 8, collect: 92, wish: 24, on_hold: 3, dropped: 1 },
          doing: [
            {
              id: "305429",
              title: "葬送的芙莉莲 [漫画系列]",
              orig: "葬送のフリーレン (全15卷连载中)",
              cover: "https://lain.bgm.tv/pic/cover/l/b2/77/305429_f4634.jpg",
              prgText: "Vol.13/15 · Chap.135/140",
              prgPct: 96,
              score: 9,
              date: "2026-10-30",
              tags: ["山田钟人", "阿部司", "小学馆", "奇幻", "系列"],
              info: "系列总览 / 2020年4月28日连载开始 / 少年Sunday",
              comment: "黄金乡篇的分镜情绪张力拉满，马哈特与邓肯的博弈堪称近十年奇幻漫画巅峰。"
            }
          ],
          collected: [
            {
              id: "310920",
              title: "葬送的芙莉莲 (1) [单行本]",
              orig: "葬送のフリーレン (1)",
              cover: "https://lain.bgm.tv/pic/cover/l/8c/48/310920_s186n.jpg",
              score: 9,
              date: "2026-10-12",
              tags: ["单行本", "日版小学馆", "阿部司"],
              info: "192页 / 2020-08-18 / ISBN 9784098501809",
              comment: "日版初版单行本入手，封面苍月草的印刷质感太棒了。"
            },
            {
              id: "305429",
              title: "葬送的芙莉莲 [漫画系列]",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/b2/77/305429_f4634.jpg",
              score: 9,
              date: "2026-10-30",
              tags: ["山田钟人", "小学馆", "奇幻", "神作"],
              info: "漫画系列 / 15卷既刊 / 小学馆",
              comment: "淡淡的留白里藏着千年的思念。"
            },
            {
              id: "310920",
              title: "迷宫饭 漫画全14卷",
              orig: "ダンジョン飯",
              cover: "https://lain.bgm.tv/pic/cover/l/5a/89/115360_776N1.jpg",
              score: 10,
              date: "2026-06-18",
              tags: ["九井谅子", "奇幻", "设定集", "神作"],
              info: "全14卷完结 / 九井谅子 / KADOKAWA",
              comment: "世界观生态闭环与结局回收教科书级别的杰作。"
            }
          ]
        },
        music: {
          title: "音乐唱片收藏",
          verb: "听",
          icon: "💿",
          isSquare: true,
          counts: { do: 5, collect: 52, wish: 7, on_hold: 0, dropped: 0 },
          doing: [
            {
              id: "477900",
              title: "葬送的芙莉莲 Original Soundtrack",
              orig: "TVアニメ『葬送のフリーレン』OST",
              cover: "https://lain.bgm.tv/pic/cover/l/79/c9/477900_0c6U8.jpg",
              prgText: "2CD · 70 Tracks 循环中",
              prgPct: 100,
              score: 9,
              date: "2026-11-01",
              tags: ["EvanCall", "OST", "凯尔特管弦", "2024"],
              info: "2CD (70曲) / 2024-04-17 / Evan Call / TOHO animation",
              comment: "《Zoltraak》高燃交响与《Journey of a Lifetime》古乐器独奏百听不厌。"
            }
          ],
          collected: [
            {
              id: "477900",
              title: "葬送的芙莉莲 OST",
              orig: "Frieren: Beyond Journey's End OST",
              cover: "https://lain.bgm.tv/pic/cover/l/79/c9/477900_0c6U8.jpg",
              score: 9,
              date: "2026-11-01",
              tags: ["EvanCall", "OST", "管弦乐"],
              info: "2024-04-17 / Evan Call",
              comment: "年度最佳动画原声大碟。"
            },
            {
              id: "253",
              title: "COWBOY BEBOP Vitaminless",
              orig: "COWBOY BEBOP O.S.T. 1",
              cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
              score: 10,
              date: "2026-08-20",
              tags: ["菅野洋子", "SEATBELTS", "爵士", "神作"],
              info: "1998-05-21 / 菅野洋子 & THE SEATBELTS",
              comment: "Tank! 前奏一响，全宇宙的赏金猎人都醒了。"
            }
          ]
        },
        game: {
          title: "游戏收藏",
          verb: "玩",
          icon: "🎮",
          counts: { do: 4, collect: 34, wish: 31, on_hold: 5, dropped: 2 },
          doing: [
            {
              id: "37141",
              title: "博德之门 3",
              orig: "Baldur's Gate 3",
              cover: "https://lain.bgm.tv/pic/cover/l/9b/63/37141_627B9.jpg",
              prgText: "PC Steam · 184.5h · 二周目荣誉模式",
              prgPct: 88,
              score: 10,
              date: "2026-10-25",
              tags: ["CRPG", "拉瑞安", "DND", "神作"],
              info: "PC / PS5 / Xbox / 2023-08-03 / Larian Studios",
              comment: "拉瑞安用难以想象的网状叙事自由度重塑了现代CRPG王座。"
            }
          ],
          collected: [
            {
              id: "37141",
              title: "博德之门 3",
              orig: "Baldur's Gate 3",
              cover: "https://lain.bgm.tv/pic/cover/l/9b/63/37141_627B9.jpg",
              score: 10,
              date: "2026-10-25",
              tags: ["CRPG", "拉瑞安", "神作"],
              info: "2023-08-03 / Larian Studios",
              comment: "184小时依然每次掷骰子都有新惊喜。"
            }
          ]
        },
        real: {
          title: "三次元影视收藏",
          verb: "看",
          icon: "🎞️",
          counts: { do: 2, collect: 16, wish: 9, on_hold: 2, dropped: 0 },
          doing: [
            {
              id: "225581",
              title: "非自然死亡",
              orig: "アンナチュラル (Unnatural)",
              cover: "https://lain.bgm.tv/pic/cover/l/f8/e2/225581_33G33.jpg",
              prgText: "EP 10 / 10 完结重温",
              prgPct: 100,
              score: 9,
              date: "2026-10-18",
              tags: ["日剧", "野木亚纪子", "石原里美", "米津玄师"],
              info: "10话 / 2018-01-12 / TBS金曜剧",
              comment: "法医学是为未来而生的工作，Lemon切入的时机每次都让人鼻酸。"
            }
          ],
          collected: [
            {
              id: "225581",
              title: "非自然死亡",
              orig: "アンナチュラル",
              cover: "https://lain.bgm.tv/pic/cover/l/f8/e2/225581_33G33.jpg",
              score: 9,
              date: "2026-10-18",
              tags: ["日剧", "野木亚纪子", "神作"],
              info: "10话 / 2018-01-12 / TBS",
              comment: "有空绝望的话，不如去吃点好吃的然后睡觉吧！"
            }
          ]
        }
      },
      blogs: [
        {
          id: "400602",
          blogId: "385001",
          title: "论《葬送的芙莉莲》的「后日谈时间学」：当千年的精灵开始丈量人类的二十九年",
          date: "2026-11-01 22:18",
          category: "动画长评 · 葬送的芙莉莲",
          replies: "+42 回复",
          cover: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
          excerpt: "传统奇幻故事在打倒魔王的那一刻画上句号，而芙莉莲的故事却从辛美尔老去逝世的葬礼拉开序幕。斋藤圭一郎在演出中大量运用静物空镜与光影流转，让「回忆」不再是闪回的工具，而成为旅途中呼吸的一部分……"
        },
        {
          id: "265",
          blogId: "385002",
          title: "从赛璐珞静止帧到心灵补完：重看 95 版《新世纪福音战士》第 24-26 话的演出革命",
          date: "2026-09-16 01:05",
          category: "动画考据 · 新世纪福音战士",
          replies: "+68 回复",
          cover: "https://lain.bgm.tv/pic/cover/l/e5/69/265_Z5Uou.jpg",
          excerpt: "当贝多芬第九交响曲《欢乐颂》在中央教条区响起，渚薰与初号机的长达 64 秒静止画面并非经费枯竭的妥协，而是庵野秀明与摩砂雪对观众心理压迫感的精密控制……"
        }
      ],
      capsule: [
        {
          type: "collect",
          verb: "看过",
          subjectId: "400602",
          subjectTitle: "葬送的芙莉莲",
          score: "★ 9",
          quote: "在辛美尔死后的第29年，光阴终于有了具体的重量。",
          time: "18 分钟前 · 网页端"
        },
        {
          type: "progress",
          verb: "读完",
          subjectId: "305429",
          subjectTitle: "葬送的芙莉莲 第 135 话「前哨」",
          score: "",
          quote: "帝国篇各方势力暗流涌动，修塔尔克那一下太帅了。",
          time: "3 小时前 · 时光机打卡"
        },
        {
          type: "collect",
          verb: "听过",
          subjectId: "477900",
          subjectTitle: "TVアニメ『葬送のフリーレン』Original Soundtrack",
          score: "★ 9",
          quote: "Evan Call 把凯尔特民族乐器与大编制管弦融合得天衣无缝。",
          time: "昨天 23:14 · 音乐频道"
        },
        {
          type: "progress",
          verb: "玩过",
          subjectId: "37141",
          subjectTitle: "博德之门 3",
          score: "★ 10",
          quote: "PC Steam 二周目荣誉模式第 3 章达成，拉斐尔BOSS战音乐封神！",
          time: "3 天前 · 游戏频道"
        },
        {
          type: "blog",
          verb: "发表了日志",
          subjectId: "400602",
          subjectTitle: "论《葬送的芙莉莲》的「后日谈时间学」",
          score: "",
          quote: "已被 42 位番組友推荐至频道首页日志专栏。",
          time: "2026-11-01 · 个人日志"
        }
      ],
      indexes: [
        { id: "100001", title: "个人年度十佳 TV 动画档案馆 (2015–2026)", count: "68 个条目", updated: "2天前更新" },
        { id: "100002", title: "值得买实体单行本收藏的奇幻/SF漫画清单", count: "34 个条目", updated: "1周前更新" },
        { id: "100003", title: "深夜写代码必备的原声带 OST 与爵士黑胶", count: "45 张唱片", updated: "2周前更新" }
      ],
      characters: [
        { id: 86246, name: "芙莉莲", role: "葬送的芙莉莲", avatar: "https://lain.bgm.tv/pic/crt/m/13/68/85835_crt_52p2X.jpg" },
        { id: 88208, name: "辛美尔", role: "葬送的芙莉莲", avatar: "https://lain.bgm.tv/pic/crt/m/8e/77/85836_crt_Y87q0.jpg" },
        { id: 77, name: "斯派克", role: "星际牛仔", avatar: "https://lain.bgm.tv/pic/crt/m/00/18/1_crt_4F23c.jpg" },
        { id: 304, name: "明日香", role: "EVA", avatar: "https://lain.bgm.tv/pic/crt/m/94/97/304_crt_n473K.jpg" }
      ],
      groups: [
        { title: "番組美术馆 · UI设计研究", members: "2,840 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/06/651.jpg" },
        { title: "90年代赛璐珞作画考据", members: "5,120 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/03/364.jpg" },
        { title: "CRPG 与跑团俱乐部", members: "3,490 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/41/4182.jpg" },
        { title: "漫画单行本买书败家党", members: "8,910 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/12/1208.jpg" }
      ],
      friends: [
        { name: "Sai", handle: "@sai", avatar: "https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg?r=1391790456" },
        { name: "花园", handle: "@rikka", avatar: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1" },
        { name: "苍月草", handle: "@himmel", avatar: "https://lain.bgm.tv/pic/crt/m/8e/77/85836_crt_Y87q0.jpg" },
        { name: "菲伦", handle: "@fern", avatar: "https://lain.bgm.tv/pic/crt/m/13/68/85835_crt_52p2X.jpg" }
      ]
    },

    "sai": {
      uid: "1",
      handle: "@sai",
      nickname: "Sai",
      roleBadge: "Bangumi 创始人 · UID #1",
      joinDate: "2008-07-14",
      serviceYears: "时光机服役 18 年",
      avatar: "https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg?r=1391790456",
      backdrop: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
      customBgArt: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
      bioText: "Built Bangumi from scratch since 2008.\n专注于 ACG 圣地构建、摄影、主机游戏与独立产品设计。\n愿每一位热爱番组、书籍、音乐与游戏的朋友都能在时光机里安放自己的记忆。",
      bioTags: ["Bangumi站长", "UID #1", "主机全平台", "摄影", "黑胶原声", "科幻经典"],
      counters: {
        totalCollect: "2,418",
        completed: "1,796",
        completionRate: "74.3%",
        wikiEdits: "1,420"
      },
      sync: {
        sharedCount: 58,
        rateInt: "84",
        rateDec: ".60%",
        rateFloat: 84.6,
        verdict: "殿堂级品味共鸣 · 时代见证者",
        resonances: [
          { id: "253", title: "星际牛仔", myScore: 10, theirScore: 10 },
          { id: "265", title: "新世纪福音战士", myScore: 10, theirScore: 10 },
          { id: "37141", title: "博德之门 3", myScore: 10, theirScore: 10 },
          { id: "400602", title: "葬送的芙莉莲", myScore: 9, theirScore: 9 }
        ]
      },
      services: [
        { type: "bgm", label: "Bangumi", value: "2008-07-14 加入 (初代站长)", url: "#headerProfile" },
        { type: "xbox", label: "Xbox Live", value: "Sais", url: "javascript:void(0)" },
        { type: "psn", label: "PSN", value: "Sai", url: "javascript:void(0)" },
        { type: "steam", label: "Steam", value: "saicr", url: "javascript:void(0)" },
        { type: "github", label: "GitHub", value: "sai", url: "javascript:void(0)" },
        { type: "ins", label: "Instagram", value: "sais", url: "javascript:void(0)" }
      ],
      stats: {
        all: {
          collect: 2418, complete: 1796, rate: "74.3%", mean: "7.62", std: "1.32", scored: 1540,
          counts: { 10: 112, 9: 298, 8: 540, 7: 380, 6: 138, 5: 44, 4: 16, 3: 7, 2: 3, 1: 2 }
        },
        anime: {
          collect: 1120, complete: 890, rate: "79.5%", mean: "7.58", std: "1.34", scored: 810,
          counts: { 10: 58, 9: 154, 8: 280, 7: 210, 6: 74, 5: 22, 4: 7, 3: 3, 2: 1, 1: 1 }
        },
        book: {
          collect: 340, complete: 260, rate: "76.5%", mean: "7.88", std: "1.12", scored: 210,
          counts: { 10: 18, 9: 46, 8: 82, 7: 45, 6: 14, 5: 4, 4: 1, 3: 0, 2: 0, 1: 0 }
        },
        music: {
          collect: 420, complete: 380, rate: "90.5%", mean: "7.92", std: "1.08", scored: 310,
          counts: { 10: 22, 9: 64, 8: 132, 7: 68, 6: 18, 5: 5, 4: 1, 3: 0, 2: 0, 1: 0 }
        },
        game: {
          collect: 460, complete: 212, rate: "46.1%", mean: "7.45", std: "1.41", scored: 170,
          counts: { 10: 12, 9: 28, 8: 36, 7: 48, 6: 28, 5: 11, 4: 5, 3: 2, 2: 0, 1: 0 }
        },
        real: {
          collect: 78, complete: 54, rate: "69.2%", mean: "7.51", std: "1.25", scored: 40,
          counts: { 10: 2, 9: 6, 8: 10, 7: 9, 6: 4, 5: 2, 4: 2, 3: 2, 2: 2, 1: 1 }
        }
      },
      categories: {
        anime: {
          title: "动画收藏",
          verb: "看",
          icon: "🎬",
          counts: { do: 14, collect: 890, wish: 164, on_hold: 32, dropped: 20 },
          doing: [
            {
              id: "253",
              title: "星际牛仔",
              orig: "カウボーイビバップ",
              cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
              prgText: "EP 26 / 26 殿堂收藏",
              prgPct: 100,
              score: 10,
              date: "2026-10-30",
              tags: ["渡边信一郎", "菅野洋子", "SUNRISE", "神作"],
              info: "26话 / 1998年4月3日 / 渡边信一郎",
              comment: "Bangumi 创站之初测试条目的永恒标杆，See You Space Cowboy..."
            },
            {
              id: "400602",
              title: "葬送的芙莉莲",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
              prgText: "EP 28 / 28",
              prgPct: 100,
              score: 9,
              date: "2026-10-12",
              tags: ["MADHOUSE", "奇幻", "2023年10月"],
              info: "28话 / 2023年9月29日 / 斋藤圭一郎",
              comment: "难得一见的古典派公路奇幻佳作。"
            }
          ],
          collected: [
            {
              id: "253",
              title: "星际牛仔",
              orig: "カウボーイビバップ",
              cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
              score: 10,
              date: "2008-07-15",
              tags: ["渡边信一郎", "菅野洋子", "神作"],
              info: "26话 / 1998年4月3日 / SUNRISE",
              comment: "无可挑剔的黄金时代浪漫。"
            },
            {
              id: "265",
              title: "新世纪福音战士",
              orig: "新世紀エヴァンゲリオン",
              cover: "https://lain.bgm.tv/pic/cover/l/e5/69/265_Z5Uou.jpg",
              score: 10,
              date: "2008-07-16",
              tags: ["庵野秀明", "GAINAX", "EVA", "神作"],
              info: "26话 / 1995年10月4日 / GAINAX",
              comment: "动画史上的分水岭。"
            },
            {
              id: "400602",
              title: "葬送的芙莉莲",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg",
              score: 9,
              date: "2024-03-23",
              tags: ["MADHOUSE", "奇幻"],
              info: "28话 / 2023年9月29日 / MADHOUSE",
              comment: "节奏沉稳，余韵悠长。"
            }
          ]
        },
        game: {
          title: "游戏收藏",
          verb: "玩",
          icon: "🎮",
          counts: { do: 9, collect: 212, wish: 180, on_hold: 41, dropped: 18 },
          doing: [
            {
              id: "37141",
              title: "博德之门 3",
              orig: "Baldur's Gate 3",
              cover: "https://lain.bgm.tv/pic/cover/l/9b/63/37141_627B9.jpg",
              prgText: "PS5 / Steam Deck 跨平台存档",
              prgPct: 95,
              score: 10,
              date: "2026-10-20",
              tags: ["CRPG", "Larian", "DND", "神作"],
              info: "2023-08-03 / Larian Studios",
              comment: "关卡设计与分支叙事密度令人叹服。"
            }
          ],
          collected: [
            {
              id: "37141",
              title: "博德之门 3",
              orig: "Baldur's Gate 3",
              cover: "https://lain.bgm.tv/pic/cover/l/9b/63/37141_627B9.jpg",
              score: 10,
              date: "2026-10-20",
              tags: ["CRPG", "神作"],
              info: "2023-08-03 / Larian Studios",
              comment: "十年一遇的 RPG 标杆。"
            }
          ]
        },
        book: {
          title: "书籍收藏 (系列 & 单行本)",
          verb: "读",
          icon: "📚",
          counts: { do: 6, collect: 260, wish: 58, on_hold: 10, dropped: 6 },
          doing: [
            {
              id: "305429",
              title: "葬送的芙莉莲 [漫画系列]",
              orig: "葬送のフリーレン",
              cover: "https://lain.bgm.tv/pic/cover/l/b2/77/305429_f4634.jpg",
              prgText: "Vol.15 · Chap.140",
              prgPct: 100,
              score: 9,
              date: "2026-10-15",
              tags: ["山田钟人", "小学馆", "奇幻"],
              info: "漫画系列 / 小学馆",
              comment: "分镜干净利落，世界观细腻。"
            }
          ],
          collected: [
            {
              id: "310920",
              title: "葬送的芙莉莲 (1)",
              orig: "葬送のフリーレン (1)",
              cover: "https://lain.bgm.tv/pic/cover/l/8c/48/310920_s186n.jpg",
              score: 9,
              date: "2021-03-10",
              tags: ["单行本", "小学馆"],
              info: "2020-08-18 / 小学馆",
              comment: "开篇第一卷就已经奠定了全书的气质。"
            }
          ]
        },
        music: {
          title: "音乐唱片收藏",
          verb: "听",
          icon: "💿",
          isSquare: true,
          counts: { do: 4, collect: 380, wish: 32, on_hold: 4, dropped: 0 },
          doing: [
            {
              id: "477900",
              title: "葬送的芙莉莲 Original Soundtrack",
              orig: "TVアニメ『葬送のフリーレン』OST",
              cover: "https://lain.bgm.tv/pic/cover/l/79/c9/477900_0c6U8.jpg",
              prgText: "Disc 1 & Disc 2",
              prgPct: 100,
              score: 9,
              date: "2026-09-28",
              tags: ["EvanCall", "OST"],
              info: "2024-04-17 / Evan Call",
              comment: "工作背景音首选原声集。"
            }
          ],
          collected: [
            {
              id: "477900",
              title: "葬送的芙莉莲 OST",
              orig: "Frieren OST",
              cover: "https://lain.bgm.tv/pic/cover/l/79/c9/477900_0c6U8.jpg",
              score: 9,
              date: "2026-09-28",
              tags: ["EvanCall", "OST"],
              info: "2024-04-17 / Evan Call",
              comment: "录音品质极佳。"
            }
          ]
        },
        real: {
          title: "三次元影视收藏",
          verb: "看",
          icon: "🎞️",
          counts: { do: 1, collect: 54, wish: 19, on_hold: 4, dropped: 0 },
          doing: [],
          collected: [
            {
              id: "225581",
              title: "非自然死亡",
              orig: "アンナチュラル",
              cover: "https://lain.bgm.tv/pic/cover/l/f8/e2/225581_33G33.jpg",
              score: 9,
              date: "2018-03-20",
              tags: ["日剧", "野木亚纪子"],
              info: "10话 / 2018-01-12 / TBS",
              comment: "单元剧剧本结构非常扎实。"
            }
          ]
        }
      },
      blogs: [
        {
          id: "253",
          blogId: "273601",
          title: "Bangumi 番组计划 18 周年时光机手记：从个人书影音记录到社区共同记忆",
          date: "2026-07-14 20:00",
          category: "站务手记 · 时光机演进",
          replies: "+312 回复",
          cover: "https://lain.bgm.tv/pic/cover/l/c2/4c/253_t3X14.jpg",
          excerpt: "回望 2008 年写下第一行点格子代码的时候，未曾想过十八年后会有数百万条章节打卡、长评与电波同步率在这里交汇……"
        }
      ],
      capsule: [
        {
          type: "collect",
          verb: "玩过",
          subjectId: "37141",
          subjectTitle: "博德之门 3",
          score: "★ 10",
          quote: "关卡设计与分支叙事密度令人叹服。",
          time: "2 小时前 · 游戏频道"
        },
        {
          type: "collect",
          verb: "看过",
          subjectId: "400602",
          subjectTitle: "葬送的芙莉莲",
          score: "★ 9",
          quote: "难得一见的古典派公路奇幻佳作。",
          time: "昨天 19:40 · 网页端"
        },
        {
          type: "blog",
          verb: "发表了日志",
          subjectId: "253",
          subjectTitle: "Bangumi 番组计划 18 周年时光机手记",
          score: "",
          quote: "感谢所有维基人与番组友十八年来的陪伴。",
          time: "2026-07-14 · 站务日志"
        }
      ],
      indexes: [
        { id: "81881", title: "Bangumi 历代 UI 改版与超合金组件纪念目录", count: "29 个节点", updated: "置顶" },
        { id: "87787", title: "个人私藏科幻与赛博朋克名作选", count: "52 个条目", updated: "1个月前" }
      ],
      characters: [
        { id: 77, name: "斯派克", role: "星际牛仔", avatar: "https://lain.bgm.tv/pic/crt/m/00/18/1_crt_4F23c.jpg" },
        { id: 134101, name: "草薙素子", role: "攻壳机动队", avatar: "https://lain.bgm.tv/pic/crt/m/13/68/85835_crt_52p2X.jpg" },
        { id: 302, name: "碇真嗣", role: "EVA", avatar: "https://lain.bgm.tv/pic/crt/m/94/97/304_crt_n473K.jpg" },
        { id: 86246, name: "芙莉莲", role: "葬送的芙莉莲", avatar: "https://lain.bgm.tv/pic/crt/m/8e/77/85836_crt_Y87q0.jpg" }
      ],
      groups: [
        { title: "站务论坛 · Bangumi 公告板", members: "98,420 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/06/651.jpg" },
        { title: "Bangumi 维基人协会", members: "14,200 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/03/364.jpg" },
        { title: "主机玩家俱乐部 (PS5/Xbox/NS)", members: "21,500 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/41/4182.jpg" },
        { title: "摄影与器材党", members: "6,310 位成员", icon: "https://lain.bgm.tv/pic/icon/m/000/00/12/1208.jpg" }
      ],
      friends: [
        { name: "少年游", handle: "@553488", avatar: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1" },
        { name: "花园", handle: "@rikka", avatar: "https://lain.bgm.tv/pic/crt/m/13/68/85835_crt_52p2X.jpg" },
        { name: "渡边", handle: "@bebop", avatar: "https://lain.bgm.tv/pic/crt/m/00/18/1_crt_4F23c.jpg" },
        { name: "庵野", handle: "@khara", avatar: "https://lain.bgm.tv/pic/crt/m/94/97/304_crt_n473K.jpg" }
      ]
    }
  };

  const state = {
    currentUid: "553488",
    visitorRelation: "friend", // "self" | "friend" | "visitor"
    pageMode: "overview",      // "overview" (Page 25) | "browser" (Page 26)
    activeCategoryFilter: "all",
    activeStatsTab: "all",
    activeCapsuleFilter: "all",
    customArtEnabled: false,
    // Page 26 Collection Browser State
    browserCat: "anime",
    browserStatus: "collect",
    browserSort: "date",
    browserLayout: "list",
    browserTag: "all",
    browserQuery: ""
  };

  function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.style.cssText =
      "padding:10px 16px;border-radius:999px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:600;box-shadow:var(--sh-md);margin-top:8px;transition:all 0.25s ease;";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 260);
    }, 2400);
  }

  function getProfile() {
    return USER_PROFILES[state.currentUid] || USER_PROFILES["553488"];
  }

  // 传统 10 星评价渲染（10星即10颗星 + 评分数字）
  function renderTenStars(score) {
    const num = typeof score === "string"
      ? parseInt(score.replace(/\D/g, ""), 10)
      : Math.round(Number(score) || 0);
    const n = Math.max(0, Math.min(10, num || 0));
    if (!n) return "";
    const filled = "★".repeat(n);
    const empty = "☆".repeat(10 - n);
    return `<span class="starstop-ten" title="${n} 星评价"><span class="stars-filled">${filled}</span><span class="stars-empty">${empty}</span><strong class="stars-score-num">${n}</strong></span>`;
  }

  // --- 1. 渲染 #headerProfile 与关系视角 (.actions) ---
  function renderProfileBanner() {
    const p = getProfile();
    const bannerEl = document.getElementById("headerProfile");
    const backdropEl = document.getElementById("profileBackdrop");
    if (backdropEl) {
      backdropEl.style.backgroundImage = `url('${state.customArtEnabled ? p.customBgArt : p.backdrop}')`;
    }
    if (bannerEl) {
      bannerEl.classList.toggle("has-custom-art", state.customArtEnabled);
    }

    const avaImg = document.getElementById("profileAvatarImg");
    if (avaImg) {
      avaImg.src = p.avatar;
      avaImg.alt = p.nickname;
    }
    const uidBadge = document.getElementById("profileUidBadge");
    if (uidBadge) uidBadge.textContent = `UID #${p.uid}`;

    const roleBadge = document.getElementById("profileRoleBadge");
    if (roleBadge) roleBadge.textContent = p.roleBadge;

    const joinChip = document.getElementById("profileJoinedDate");
    if (joinChip) joinChip.textContent = `${p.joinDate} 加入 Bangumi`;

    const serviceYears = document.getElementById("profileServiceYears");
    if (serviceYears) serviceYears.textContent = p.serviceYears;

    const nicknameEl = document.getElementById("profileNickname");
    if (nicknameEl) nicknameEl.textContent = p.nickname;

    const handleEl = document.getElementById("profileUidHandle");
    if (handleEl) handleEl.textContent = p.handle;

    // 关系徽章 (#friend_flag)
    const friendFlag = document.getElementById("friend_flag");
    if (friendFlag) {
      if (state.visitorRelation === "friend") {
        friendFlag.hidden = false;
        friendFlag.innerHTML = `<span>✓ 我的好友</span>`;
      } else if (state.visitorRelation === "self") {
        friendFlag.hidden = false;
        friendFlag.innerHTML = `<span>✨ 我的时光机主页</span>`;
      } else {
        friendFlag.hidden = true;
      }
    }

    // 顶部四个核心计数器
    const cTotal = document.getElementById("counterTotalCollect");
    const cComp = document.getElementById("counterCompleted");
    const cRate = document.getElementById("counterCompletionRate");
    const cWiki = document.getElementById("counterWikiEdits");
    if (cTotal) cTotal.textContent = p.counters.totalCollect;
    if (cComp) cComp.textContent = p.counters.completed;
    if (cRate) cRate.textContent = p.counters.completionRate;
    if (cWiki) cWiki.textContent = p.counters.wikiEdits;

    // 渲染右侧关系操作栏 (.actions)
    const actionsEl = document.getElementById("profileActionsBar");
    if (actionsEl) {
      if (state.visitorRelation === "self") {
        actionsEl.innerHTML = `
          <button type="button" class="profile-act-btn primary" data-act="edit-profile">
            <span>⚙️ 修改个人资料</span>
          </button>
          <button type="button" class="profile-act-btn" data-act="toggle-bg">
            <span>🎨 ${state.customArtEnabled ? "关闭看板背景 [bg]" : "启用看板背景 [bg]"}</span>
          </button>
          <button type="button" class="profile-act-btn" data-act="export-csv">
            <span>📥 导出收藏备份</span>
          </button>
        `;
      } else if (state.visitorRelation === "friend") {
        actionsEl.innerHTML = `
          <button type="button" class="profile-act-btn primary" data-act="send-pm">
            <span>✉️ 发送短消息 (PM)</span>
          </button>
          <button type="button" class="profile-act-btn" data-act="toggle-bg">
            <span>🖼️ ${state.customArtEnabled ? "标准背景" : "预览 Ta 的背景卡"}</span>
          </button>
          <button type="button" class="profile-act-btn danger-subtle" data-act="unfriend">
            <span>解除好友</span>
          </button>
        `;
      } else {
        actionsEl.innerHTML = `
          <button type="button" class="profile-act-btn primary" data-act="add-friend">
            <span>＋ 加为好友</span>
          </button>
          <button type="button" class="profile-act-btn" data-act="send-pm">
            <span>✉️ 发送短消息</span>
          </button>
          <button type="button" class="profile-act-btn danger-subtle" data-act="block-report">
            <span>⚠️ 绝交 / 报告</span>
          </button>
        `;
      }

      actionsEl.querySelectorAll("[data-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.getAttribute("data-act");
          if (act === "toggle-bg") {
            state.customArtEnabled = !state.customArtEnabled;
            renderProfileBanner();
            showToast(state.customArtEnabled ? "已开启 [bg] 自定义背景卡片视觉效果" : "已恢复纯净液态毛玻璃顶栏");
          } else if (act === "add-friend") {
            state.visitorRelation = "friend";
            syncStudioButtons();
            renderProfileBanner();
            showToast(`已将 ${p.nickname} (${p.handle}) 添加为好友！`);
          } else if (act === "unfriend") {
            state.visitorRelation = "visitor";
            syncStudioButtons();
            renderProfileBanner();
            showToast(`已解除与 ${p.nickname} 的好友关系`);
          } else if (act === "send-pm") {
            const targetUid = p.uid === "1" ? "sai" : p.uid;
            window.location.href = `notify.html?tab=compose&to=${encodeURIComponent(targetUid)}`;
          } else if (act === "edit-profile") {
            window.location.href = "settings.html";
          } else if (act === "export-csv") {
            showToast(`已生成 ${p.nickname} 的全站收藏 JSON/CSV 归档包`);
          } else if (act === "block-report") {
            showToast("已打开社区风纪与屏蔽确认面板");
          }
        });
      });
    }
  }

  // --- 2. 渲染 div.user_box (签名档 Bio + 电波同步率 + 外部网络服务) ---
  function renderUserBox() {
    const p = getProfile();
    const bioTextEl = document.getElementById("userBioText");
    if (bioTextEl) bioTextEl.textContent = p.bioText;

    const bioTagsEl = document.getElementById("userBioTags");
    if (bioTagsEl) {
      bioTagsEl.innerHTML = p.bioTags
        .map((t) => `<span class="bio-interest-pill"># ${t}</span>`)
        .join("");
    }

    const netListEl = document.getElementById("networkServiceList");
    if (netListEl) {
      netListEl.innerHTML = p.services
        .map(
          (s) => `
          <li>
            <a href="${s.url}" class="net-service-chip">
              <span class="net-service-tag ${s.type}">${s.label}</span>
              <span>${s.value}</span>
            </a>
          </li>
        `
        )
        .join("");
    }

    // 电波同步率 (div.userSynchronize)
    const syncSharedEl = document.getElementById("syncSharedCount");
    const syncIntEl = document.getElementById("syncPctInt");
    const syncDecEl = document.getElementById("syncPctDec");
    const syncBarEl = document.getElementById("syncBarFill");
    const syncVerdictEl = document.getElementById("syncVerdictText");
    const syncResEl = document.getElementById("syncResonanceList");

    if (syncSharedEl) syncSharedEl.textContent = `${p.sync.sharedCount} 部共同收藏`;
    if (syncIntEl) syncIntEl.textContent = p.sync.rateInt;
    if (syncDecEl) syncDecEl.textContent = p.sync.rateDec;
    if (syncBarEl) syncBarEl.style.width = `${p.sync.rateFloat}%`;
    if (syncVerdictEl) syncVerdictEl.textContent = p.sync.verdict;
    if (syncResEl) {
      syncResEl.innerHTML = p.sync.resonances
        .map(
          (r) => `
          <a href="subject.html?id=${r.id}" class="resonance-chip" title="点击跳转条目详情页">
            <span>${r.title}</span>
            <em>★${r.myScore}/${r.theirScore}</em>
          </a>
        `
        )
        .join("");
    }
  }

  // --- 3. 渲染 #columnA 五大分类收藏橱窗 (#anime, #game, #book, #music, #real) ---
  function renderCategoryShowcases() {
    const p = getProfile();
    const container = document.getElementById("userCategoryShowcases");
    if (!container) return;

    const order = ["anime", "book", "music", "game", "real"];
    const filteredOrder =
      state.activeCategoryFilter === "all"
        ? order
        : order.filter((k) => k === state.activeCategoryFilter);

    container.innerHTML = filteredOrder
      .map((catKey) => {
        const cat = p.categories[catKey];
        if (!cat) return "";
        const v = cat.verb;
        const c = cat.counts;
        const isSquare = Boolean(cat.isSquare);

        const doingHtml =
          cat.doing && cat.doing.length > 0
            ? `
          <div class="cat-doing-strip">
            ${cat.doing
              .map(
                (item) => `
              <a href="subject.html?id=${item.id}" class="doing-spotlight-card" title="进入《${item.title}》条目详情页">
                <img src="${item.cover}" alt="${item.title}" class="doing-thumb ${isSquare ? "is-square" : ""}" referrerpolicy="no-referrer" />
                <div class="doing-card-info">
                  <div class="doing-card-title-row">
                    <span class="doing-card-title">${item.title}</span>
                    <span class="doing-status-tag">在${v}</span>
                  </div>
                  <div class="doing-prg-row">
                    <div class="doing-prg-bar"><div class="doing-prg-fill" style="width:${item.prgPct}%"></div></div>
                    <span class="doing-prg-label">${item.prgText}</span>
                  </div>
                  <div class="doing-comment-snip">💬 ${item.comment}</div>
                </div>
              </a>
            `
              )
              .join("")}
          </div>
        `
            : "";

        const collectedHtml = (cat.collected || [])
          .map(
            (item) => `
          <li>
            <a href="subject.html?id=${item.id}" class="cover-wall-item" title="${item.title} (${item.orig})">
              <div class="cover-wall-poster-wrap ${isSquare ? "is-music-square" : ""}">
                <img src="${item.cover}" alt="${item.title}" class="cover-wall-img" referrerpolicy="no-referrer" />
                <span class="cover-wall-score-pill">★ ${item.score}</span>
                <div class="cover-wall-hover-quote">${item.comment}</div>
              </div>
              <span class="cover-wall-title">${item.title}</span>
              <span class="cover-wall-sub">${item.date} · ${v}过</span>
            </a>
          </li>
        `
          )
          .join("");

        return `
        <section class="user-cat-showcase-card" id="${catKey}" data-cat-section="${catKey}">
          <div class="cat-showcase-header">
            <div class="cat-title-wrap">
              <span class="cat-icon-badge">${cat.icon}</span>
              <h2 class="cat-showcase-title">${p.nickname} 的${cat.title}</h2>
            </div>
            <ul class="cat-status-pills horizontalOptions">
              <li>
                <button type="button" class="cat-status-pill active" data-open-browser="${catKey}" data-status="collect">
                  <span>${v}过</span><strong>${c.collect}</strong>
                </button>
              </li>
              <li>
                <button type="button" class="cat-status-pill" data-open-browser="${catKey}" data-status="do">
                  <span>在${v}</span><strong>${c.do}</strong>
                </button>
              </li>
              <li>
                <button type="button" class="cat-status-pill" data-open-browser="${catKey}" data-status="wish">
                  <span>想${v}</span><strong>${c.wish}</strong>
                </button>
              </li>
              <li>
                <button type="button" class="cat-status-pill" data-open-browser="${catKey}" data-status="on_hold">
                  <span>搁置</span><strong>${c.on_hold}</strong>
                </button>
              </li>
              <li>
                <button type="button" class="cat-more-link" data-open-browser="${catKey}" data-status="collect">
                  全部${cat.title} »
                </button>
              </li>
            </ul>
          </div>
          <div class="listContainer">
            ${doingHtml}
            <ul class="cat-cover-wall browserCoverMedium coverList">
              ${collectedHtml}
            </ul>
          </div>
        </section>
      `;
      })
      .join("");

    // 绑定点击状态胶囊进入 Page 26 分类收藏夹视图
    container.querySelectorAll("[data-open-browser]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catKey = btn.getAttribute("data-open-browser");
        const st = btn.getAttribute("data-status") || "collect";
        openCollectionBrowser(catKey, st);
      });
    });
  }

  // --- 4. 渲染 #blog 个人日志专栏 ---
  function renderUserBlogs() {
    const p = getProfile();
    const listEl = document.getElementById("entry_list");
    const countEl = document.getElementById("userBlogCountBadge");
    const moreLink = document.getElementById("userBlogMoreLink");
    if (countEl) countEl.textContent = `${p.blogs.length} 篇精选长评`;
    if (moreLink) {
      moreLink.setAttribute("href", `blog.html?uid=${encodeURIComponent(state.currentUid || "553488")}`);
    }
    if (!listEl) return;

    listEl.innerHTML = p.blogs
      .map(
        (b) => `
        <article class="user-blog-card item odd">
          <a href="blog.html?id=${encodeURIComponent(b.blogId || b.id)}" style="flex-shrink:0;">
            <img src="${b.cover}" alt="${b.title}" class="blog-subject-cover" referrerpolicy="no-referrer" />
          </a>
          <div class="blog-card-body">
            <div class="blog-card-title-row">
              <a href="blog.html?id=${encodeURIComponent(b.blogId || b.id)}" class="blog-card-title">${b.title}</a>
              <span class="blog-reply-pill">${b.replies}</span>
            </div>
            <div class="blog-card-meta">
              <span>📅 ${b.date}</span>
              <span>·</span>
              <span>🏷️ ${b.category}</span>
              <span>·</span>
              <a href="subject.html?id=${encodeURIComponent(b.id)}" style="color:var(--accent);text-decoration:none;font-weight:600;">关联条目 →</a>
            </div>
            <p class="blog-card-excerpt">${b.excerpt}</p>
          </div>
        </article>
      `
      )
      .join("");
  }

  // --- 5. 渲染右栏 #pinnedLayout: 时间胶囊 (ul.timeline.dots) ---
  function renderTimeCapsule() {
    const p = getProfile();
    const moreLink = document.getElementById("userCapsuleMoreLink");
    if (moreLink) {
      moreLink.setAttribute("href", `timeline.html?scope=capsule&uid=${encodeURIComponent(state.currentUid || "553488")}`);
    }
    const listEl = document.getElementById("userTimelineDots");
    if (!listEl) return;

    const items =
      state.activeCapsuleFilter === "all"
        ? p.capsule
        : p.capsule.filter((item) => item.type === state.activeCapsuleFilter);

    listEl.innerHTML = items
      .map(
        (item) => `
        <li class="timeline-dot-item clearit">
          <span class="timeline-dot-node"></span>
          <div>
            <span class="timeline-action-verb">${item.verb}</span>
            <a href="subject.html?id=${item.subjectId}" class="timeline-subject-link">《${item.subjectTitle}》</a>
            ${item.score ? `<span class="timeline-score-chip">${renderTenStars(item.score)}</span>` : ""}
          </div>
          ${item.quote ? `<div class="timeline-quote-bubble">“${item.quote}”</div>` : ""}
          <span class="timeline-time-stamp">${item.time}</span>
        </li>
      `
      )
      .join("");
  }

  // --- 6. 渲染右栏 #pinnedLayout: 收藏统计透视 (div.userStats + 10~1 垂直直方图) ---
  function renderUserStatsPanel() {
    const p = getProfile();
    const statObj = p.stats[state.activeStatsTab] || p.stats.all;

    const elCollect = document.getElementById("statNumCollect");
    const elComplete = document.getElementById("statNumComplete");
    const elRate = document.getElementById("statNumRate");
    const elMean = document.getElementById("statNumMean");
    const elStd = document.getElementById("statNumStd");
    const elScored = document.getElementById("statNumScored");

    if (elCollect) elCollect.textContent = statObj.collect;
    if (elComplete) elComplete.textContent = statObj.complete;
    if (elRate) elRate.textContent = statObj.rate;
    if (elMean) elMean.textContent = statObj.mean;
    if (elStd) elStd.textContent = statObj.std;
    if (elScored) elScored.textContent = statObj.scored;

    // 渲染 10~1 垂直直方图
    const histContainer = document.getElementById("userHistColumns");
    const inspectStarEl = document.getElementById("userChartInspectStar");
    const inspectValEl = document.getElementById("userChartInspectVal");
    if (!histContainer) return;

    const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const maxVal = Math.max(1, ...scores.map((s) => statObj.counts[s] || 0));
    const totalVotes = Math.max(
      1,
      scores.reduce((acc, s) => acc + (statObj.counts[s] || 0), 0)
    );

    // 找出众数峰值
    let peakScore = 8;
    scores.forEach((s) => {
      if ((statObj.counts[s] || 0) >= (statObj.counts[peakScore] || 0)) {
        peakScore = s;
      }
    });

    const updateInspect = (star) => {
      const cnt = statObj.counts[star] || 0;
      const pct = ((cnt / totalVotes) * 100).toFixed(1);
      if (inspectStarEl) inspectStarEl.textContent = `${star}★ 评分分布`;
      if (inspectValEl) inspectValEl.textContent = `${cnt} 部作品 (占比 ${pct}%)`;
    };

    updateInspect(peakScore);

    histContainer.innerHTML = scores
      .map((star) => {
        const cnt = statObj.counts[star] || 0;
        const heightPct = Math.max(6, Math.round((cnt / maxVal) * 84));
        const isPeak = star === peakScore;
        return `
        <div class="user-hist-col ${isPeak ? "is-peak" : ""}" data-star="${star}">
          <span class="user-hist-count-top">${cnt}</span>
          <div class="user-hist-bar" style="height:${heightPct}%"></div>
        </div>
      `;
      })
      .join("");

    histContainer.querySelectorAll(".user-hist-col").forEach((col) => {
      col.addEventListener("mouseenter", () => {
        const star = Number(col.getAttribute("data-star"));
        updateInspect(star);
      });
    });
  }

  // --- 7. 渲染右栏 #sideLayout: 目录 / 人物 / 小组 / 好友 ---
  function renderSideSocialPanels() {
    const p = getProfile();

    const indexEl = document.getElementById("userIndexList");
    if (indexEl) {
      indexEl.innerHTML = p.indexes
        .map(
          (idx) => `
          <a href="${idx.id ? `catalog.html?id=${idx.id}` : `catalog.html?mode=user&uid=${p.uid === "1" ? "sai" : "553488"}`}" class="user-index-item">
            <span class="user-index-title">📑 ${idx.title}</span>
            <span class="user-index-count">${idx.count} · ${idx.updated}</span>
          </a>
        `
        )
        .join("");
    }

    const indexMore = document.getElementById("userIndexMoreLink");
    if (indexMore) {
      indexMore.href = "catalog.html?mode=user&uid=" + (p.uid === "1" ? "sai" : "553488");
    }

    const monoMore = document.getElementById("userMonoMoreLink");
    if (monoMore) {
      monoMore.href = "mono.html?tab=my_character&user=" + (p.uid === "1" ? "sai" : "553488");
    }

    const monoEl = document.getElementById("userMonoGrid");
    if (monoEl) {
      monoEl.innerHTML = p.characters
        .map(
          (c) => `
          <a href="character.html?id=${c.id || 86246}" class="port-avatar-card">
            <img src="${c.avatar}" alt="${c.name}" class="port-avatar-img" referrerpolicy="no-referrer" />
            <span class="port-avatar-name">${c.name}</span>
            <span class="port-avatar-role">${c.role}</span>
          </a>
        `
        )
        .join("");
    }

    const groupEl = document.getElementById("userGroupsGrid");
    if (groupEl) {
      groupEl.innerHTML = p.groups
        .map(
          (g) => `
          <li>
            <a href="javascript:void(0)" class="group-line-card">
              <img src="${g.icon}" alt="${g.title}" class="group-line-icon" referrerpolicy="no-referrer" />
              <div class="group-line-meta">
                <div class="group-line-title">${g.title}</div>
                <div class="group-line-count">${g.members}</div>
              </div>
            </a>
          </li>
        `
        )
        .join("");
    }

    const friendEl = document.getElementById("userFriendsGrid");
    if (friendEl) {
      friendEl.innerHTML = p.friends
        .map(
          (f) => `
          <a href="javascript:void(0)" class="port-avatar-card" data-switch-friend="${f.handle === "@sai" ? "sai" : "553488"}">
            <img src="${f.avatar}" alt="${f.name}" class="port-avatar-img" referrerpolicy="no-referrer" />
            <span class="port-avatar-name">${f.name}</span>
            <span class="port-avatar-role">${f.handle}</span>
          </a>
        `
        )
        .join("");

      friendEl.querySelectorAll("[data-switch-friend]").forEach((card) => {
        card.addEventListener("click", (e) => {
          e.preventDefault();
          const targetUid = card.getAttribute("data-switch-friend");
          if (USER_PROFILES[targetUid]) {
            state.currentUid = targetUid;
            syncStudioButtons();
            renderAll();
            showToast(`已切换至好友 ${USER_PROFILES[targetUid].nickname} 的个人时光机`);
          }
        });
      });
    }
  }

  // --- 8. Page 26 分类收藏详情视图 (/{type}/list/{uid}/{status}) ---
  function getBrowserAllItems() {
    const p = getProfile();
    const cat = p.categories[state.browserCat] || p.categories.anime;
    const allItems = [...(cat.doing || []), ...(cat.collected || [])];
    // Deduplicate by id+title
    const seen = new Set();
    return allItems.filter((it) => {
      const k = `${it.id}_${it.title}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function renderCollectionBrowser() {
    const p = getProfile();
    const cat = p.categories[state.browserCat] || p.categories.anime;
    const v = cat.verb;

    const titleEl = document.getElementById("browserHeaderTitle");
    if (titleEl) {
      titleEl.textContent = `${p.nickname} 的${cat.title} · 分类检阅工作台`;
    }

    // 更新五态子导航 (ul.navSubTabs)
    const subTabsEl = document.getElementById("browserNavSubTabs");
    if (subTabsEl) {
      const statuses = [
        { key: "collect", label: `${v}过 (${cat.counts.collect})` },
        { key: "do", label: `在${v} (${cat.counts.do})` },
        { key: "wish", label: `想${v} (${cat.counts.wish})` },
        { key: "on_hold", label: `搁置 (${cat.counts.on_hold})` },
        { key: "dropped", label: `抛弃 (${cat.counts.dropped})` }
      ];
      subTabsEl.innerHTML = statuses
        .map(
          (st) => `
          <li>
            <button type="button" class="nav-sub-tab-btn ${state.browserStatus === st.key ? "active" : ""}" data-sub-status="${st.key}">
              ${st.label}
            </button>
          </li>
        `
        )
        .join("");

      subTabsEl.querySelectorAll("[data-sub-status]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.browserStatus = btn.getAttribute("data-sub-status");
          renderCollectionBrowser();
        });
      });
    }

    const rawItems = getBrowserAllItems();

    // 统计右侧个人标签云 (ul#userTagList)
    const tagCounts = {};
    rawItems.forEach((item) => {
      (item.tags || []).forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const tagListEl = document.getElementById("userTagList");
    if (tagListEl) {
      const tagEntries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
      tagListEl.innerHTML = [
        `<li>
          <button type="button" class="user-tag-pill-btn ${state.browserTag === "all" ? "active" : ""}" data-tag="all">
            <span>全部标签</span><small>${rawItems.length}</small>
          </button>
        </li>`,
        ...tagEntries.map(
          ([tagName, cnt]) => `
          <li>
            <button type="button" class="user-tag-pill-btn ${state.browserTag === tagName ? "active" : ""}" data-tag="${tagName}">
              <span>${tagName}</span><small>${cnt}</small>
            </button>
          </li>
        `
        )
      ].join("");

      tagListEl.querySelectorAll("[data-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.browserTag = btn.getAttribute("data-tag");
          renderCollectionBrowser();
        });
      });
    }

    // 过滤与排序
    let filtered = rawItems.filter((item) => {
      if (state.browserTag !== "all" && !(item.tags || []).includes(state.browserTag)) {
        return false;
      }
      if (state.browserQuery) {
        const q = state.browserQuery.toLowerCase();
        const matchTitle =
          item.title.toLowerCase().includes(q) ||
          (item.orig || "").toLowerCase().includes(q) ||
          (item.comment || "").toLowerCase().includes(q);
        if (!matchTitle) return false;
      }
      return true;
    });

    if (state.browserSort === "score") {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (state.browserSort === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    } else {
      filtered.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }

    const listEl = document.getElementById("browserItemList");
    if (!listEl) return;
    listEl.classList.toggle("mode-grid", state.browserLayout === "grid");

    listEl.innerHTML = filtered
      .map(
        (item) => `
        <li class="browser-item-card item odd clearit">
          <a href="subject.html?id=${item.id}">
            <img src="${item.cover}" alt="${item.title}" class="browser-item-cover" referrerpolicy="no-referrer" />
          </a>
          <div class="browser-item-body inner">
            <div class="browser-item-title-row">
              <h3>
                <a href="subject.html?id=${item.id}" class="browser-item-title l">${item.title}</a>
                <small class="browser-item-orig grey">${item.orig || ""}</small>
              </h3>
              <span class="browser-star-badge starstop-s">${renderTenStars(item.score)}</span>
            </div>
            <p class="browser-item-info-tip info tip">${item.info || ""}</p>
            <div class="browser-collect-info collectInfo">
              <span>📅 收藏于 ${item.date}</span>
              <div class="browser-user-tags">
                ${(item.tags || [])
                  .map((t) => `<span class="browser-tag-chip">${t}</span>`)
                  .join("")}
              </div>
            </div>
            <div class="browser-comment-bubble" id="comment_box">
              💬 “${item.comment}”
            </div>
          </div>
        </li>
      `
      )
      .join("");
  }

  function openCollectionBrowser(catKey, statusKey) {
    state.pageMode = "browser";
    if (catKey) state.browserCat = catKey;
    if (statusKey) state.browserStatus = statusKey;
    state.browserTag = "all";
    syncStudioButtons();
    updatePageModeVisibility();
    renderCollectionBrowser();
  }

  function updatePageModeVisibility() {
    const overviewEl = document.getElementById("user_home");
    const browserEl = document.getElementById("collectionBrowserView");
    if (overviewEl) overviewEl.hidden = state.pageMode !== "overview";
    if (browserEl) browserEl.hidden = state.pageMode !== "browser";

    // Sync navTabs active state
    document.querySelectorAll(".profile-nav-tab[data-nav-tab]").forEach((tab) => {
      const t = tab.getAttribute("data-nav-tab");
      if (state.pageMode === "overview" && t === "overview") {
        tab.classList.add("active");
      } else if (state.pageMode === "browser" && t === state.browserCat) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
  }

  function syncStudioButtons() {
    document.querySelectorAll("[data-studio-uid]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-studio-uid") === state.currentUid);
    });
    document.querySelectorAll("[data-studio-rel]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-studio-rel") === state.visitorRelation);
    });
    document.querySelectorAll("[data-studio-mode]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-studio-mode") === state.pageMode);
    });
  }

  function renderAll() {
    renderProfileBanner();
    renderUserBox();
    renderCategoryShowcases();
    renderUserBlogs();
    renderTimeCapsule();
    renderUserStatsPanel();
    renderSideSocialPanels();
    updatePageModeVisibility();
    if (state.pageMode === "browser") {
      renderCollectionBrowser();
    }
  }

  function initEvents() {
    // 1. Studio 档案切换
    document.querySelectorAll("[data-studio-uid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentUid = btn.getAttribute("data-studio-uid");
        syncStudioButtons();
        renderAll();
        showToast(`已切换至 ${getProfile().nickname} (${getProfile().handle}) 的时光机`);
      });
    });

    // 2. Studio 关系视角切换 (本人 / 好友 / 访客)
    document.querySelectorAll("[data-studio-rel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.visitorRelation = btn.getAttribute("data-studio-rel");
        syncStudioButtons();
        renderProfileBanner();
        showToast(`已切换为「${btn.textContent.trim()}」关系状态`);
      });
    });

    // 3. Studio 页面模态切换 (Page 25 时光机概览 vs Page 26 分类收藏夹)
    document.querySelectorAll("[data-studio-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.pageMode = btn.getAttribute("data-studio-mode");
        syncStudioButtons();
        updatePageModeVisibility();
        if (state.pageMode === "browser") {
          renderCollectionBrowser();
        }
      });
    });

    // 4. 顶栏 10 个一级 Tab (ul.navTabs)
    document.querySelectorAll(".profile-nav-tab[data-nav-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-nav-tab");
        if (target === "overview") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
        } else if (["anime", "book", "music", "game", "real"].includes(target)) {
          openCollectionBrowser(target, "collect");
        } else if (target === "capsule") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("pinnedCapsuleCard");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (target === "blog") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("blog");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (target === "mono") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("mono");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (target === "index") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("index");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (target === "group") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("group");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (target === "friend") {
          state.pageMode = "overview";
          syncStudioButtons();
          updatePageModeVisibility();
          const el = document.getElementById("friend");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    // 5. 主栏分类筛选胶囊 (.cat-filter-pill)
    document.querySelectorAll(".cat-filter-pill[data-cat-filter]").forEach((pill) => {
      pill.addEventListener("click", () => {
        state.activeCategoryFilter = pill.getAttribute("data-cat-filter");
        document.querySelectorAll(".cat-filter-pill[data-cat-filter]").forEach((p) => {
          p.classList.toggle("active", p === pill);
        });
        renderCategoryShowcases();
      });
    });

    // 6. 右栏收藏统计 6 分类 Tab (#userStatsTab_all ~ _6)
    document.querySelectorAll(".user-stats-tab-btn[data-stats-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeStatsTab = btn.getAttribute("data-stats-tab");
        document.querySelectorAll(".user-stats-tab-btn[data-stats-tab]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderUserStatsPanel();
      });
    });

    // 7. 右栏时间胶囊筛选按钮
    document.querySelectorAll(".capsule-filter-btn[data-cap-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCapsuleFilter = btn.getAttribute("data-cap-filter");
        document.querySelectorAll(".capsule-filter-btn[data-cap-filter]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderTimeCapsule();
      });
    });

    // 8. Page 26 分类收藏夹工具栏 (排序 + 视图模式 + 分类切换 + 搜索)
    document.querySelectorAll("[data-browser-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.browserCat = btn.getAttribute("data-browser-cat");
        state.browserTag = "all";
        document.querySelectorAll("[data-browser-cat]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderCollectionBrowser();
      });
    });

    document.querySelectorAll("[data-browser-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.browserSort = btn.getAttribute("data-browser-sort");
        document.querySelectorAll("[data-browser-sort]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderCollectionBrowser();
      });
    });

    document.querySelectorAll("[data-browser-layout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.browserLayout = btn.getAttribute("data-browser-layout");
        document.querySelectorAll("[data-browser-layout]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderCollectionBrowser();
      });
    });

    const searchInput = document.getElementById("browserSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.browserQuery = searchInput.value.trim();
        renderCollectionBrowser();
      });
    }

    // 9. 昼夜主题切换 (.ts)
    const themeBtn = document.getElementById("btnThemeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const root = document.documentElement;
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Support ?uid=sai or ?mode=browser URL query
    const params = new URLSearchParams(window.location.search);
    const qUid = params.get("uid");
    if (qUid && USER_PROFILES[qUid]) {
      state.currentUid = qUid;
    }
    const qMode = params.get("mode");
    if (qMode === "browser") {
      state.pageMode = "browser";
    }
    syncStudioButtons();
    initEvents();
    renderAll();
  });
})();
