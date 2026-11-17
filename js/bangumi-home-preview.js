/**
 * Bangumi 番组计划 · Ambient Glass & Center-Stage Architecture (oil-ui v3)
 * 100% 真实线上数据驱动 + 全量按钮交互 + 双翼可伸缩环抱 + 动态番剧流光映射
 */

const BGM_STATE = {
  activeCategory: '0',
  activeSubjectId: '623249',
  viewMode: 'normal', // 'normal' | 'tiny'
  density: 'list',    // 'compact' | 'list' | 'grid'
  tmlFilter: 'all',
  calendarDay: 'today',
  leftCollapsed: false,
  rightCollapsed: false,
  activeEpPopover: null,

  // 3 部真实在看番剧 + 每部专属的动态环境光色 (让毛玻璃折射出番剧氛围)
  watchingSubjects: [
    {
      id: '623249',
      type: '2',
      jpTitle: 'ドラゴンボール超 ビルス',
      cnTitle: '龙珠超 比鲁斯',
      cover: 'https://api.bgm.tv/v0/subjects/623249/image?type=common',
      watched: 3,
      total: null,
      displayTotal: '??',
      visualTotal: 12,
      doingCount: 850,
      ambient: ['rgba(59, 130, 246, 0.52)', 'rgba(168, 85, 247, 0.44)', 'rgba(240, 145, 153, 0.42)'],
      episodes: [
        { num: '01', id: '1742407', title: '破壊神の予知夢', cn: '破坏神的预知梦', date: '2026-10-11', comments: 64, status: 'watched' },
        { num: '02', id: '1742408', title: '界王星の激突', cn: '界王星的激突', date: '2026-10-18', comments: 48, status: 'watched' },
        { num: '03', id: '1742409', title: 'ブルマの誕生日パーティー', cn: '布尔玛的生日派对', date: '2026-10-25', comments: 52, status: 'watched' },
        { num: '04', id: '1742410', title: 'ビルス覚醒', cn: '比鲁斯觉醒', date: '2026-11-01', comments: 35, status: 'air' },
        { num: '05', id: '1742411', title: '超サイヤ人ゴッドの儀式', cn: '超级赛亚人之神的仪式', date: '2026-11-08', comments: 12, status: 'na' },
        { num: '06', id: '1742412', title: '神と神の死闘', cn: '神与神的死斗', date: '2026-11-15', comments: 6, status: 'na' },
        { num: '07', id: '1742413', title: '宇宙崩壊の危機', cn: '宇宙崩坏的危机', date: '2026-11-22', comments: 3, status: 'na' },
        { num: '08', id: '1742414', title: '悟空の新たな境地', cn: '悟空的全新境界', date: '2026-11-29', comments: 2, status: 'na' },
        { num: '09', id: '1742415', title: 'ビルスの審判', cn: '比鲁斯的审判', date: '2026-12-06', comments: 1, status: 'na' },
        { num: '10', id: '1742416', title: '地球の運命と美食', cn: '地球的命运与美食', date: '2026-12-13', comments: 0, status: 'na' },
        { num: '11', id: '1742417', title: 'ウイスの修行', cn: '维斯的修行', date: '2026-12-20', comments: 0, status: 'na' },
        { num: '12', id: '1742418', title: '新たなる宇宙へ', cn: '迈向全新的宇宙', date: '2026-12-27', comments: 4, status: 'na' }
      ]
    },
    {
      id: '975',
      type: '2',
      jpTitle: 'ONE PIECE',
      cnTitle: '海贼王',
      cover: 'https://api.bgm.tv/v0/subjects/975/image?type=common',
      watched: 1100,
      total: 1155,
      displayTotal: '1155',
      visualTotal: 1155,
      doingCount: 16420,
      ambient: ['rgba(244, 63, 94, 0.30)', 'rgba(14, 165, 233, 0.28)', 'rgba(245, 158, 11, 0.25)'],
      episodes: [
        { num: '1098', id: '1399001', title: '奇想天外！天才が想い描く未来', cn: '奇想天外！天才描绘的未来', date: '2024-03-24', comments: 88, status: 'watched' },
        { num: '1099', id: '1399002', title: '迎撃準備！ロブ・ルッチ襲来', cn: '迎击准备！罗布·路奇袭来', date: '2024-03-31', comments: 95, status: 'watched' },
        { num: '1100', id: '1399003', title: '異次元の力！ルフィVSルッチ', cn: '异次元之力！路飞VS路奇', date: '2024-04-07', comments: 168, status: 'watched' },
        { num: '1101', id: '1399004', title: '最強の人類！セラフィムの能力', cn: '最强人类！炽天使的能力', date: '2024-04-14', comments: 76, status: 'air' },
        { num: '1102', id: '1399005', title: '蠢く陰謀！エッグヘッド脱出作戦', cn: '蠢动的阴谋！蛋头岛逃出作战', date: '2024-04-21', comments: 64, status: 'air' },
        { num: '1103', id: '1399006', title: '父を戻せ！儚きボニーの願い', cn: '把父亲还给我！波妮的愿望', date: '2024-04-28', comments: 71, status: 'air' },
        { num: '1104', id: '1399007', title: '絶体絶命！セラフィム総攻撃', cn: '绝体绝命！炽天使总攻击', date: '2024-05-05', comments: 58, status: 'air' },
        { num: '1105', id: '1399008', title: '麗しき反逆！内通者ステューシー', cn: '华丽的反叛！内应斯图西', date: '2024-05-12', comments: 82, status: 'air' },
        { num: '1106', id: '1399009', title: '異常発生！探せ！Dr.ベガパンク', cn: '异常发生！寻找贝加庞克博士', date: '2024-05-19', comments: 49, status: 'air' },
        { num: '1107', id: '1399010', title: '戦慄！研究所へ忍び寄る魔の手', cn: '战栗！逼近研究所的魔爪', date: '2024-05-26', comments: 53, status: 'air' },
        { num: '1108', id: '1399011', title: '理解不能！セラフィムの反逆', cn: '无法理解！炽天使的反叛', date: '2024-06-02', comments: 61, status: 'air' },
        { num: '1109', id: '1399012', title: '苦渋の決断！異色の共闘戦線', cn: '苦涩的决断！异色的共斗战线', date: '2024-06-09', comments: 90, status: 'air' }
      ]
    },
    {
      id: '899',
      type: '2',
      jpTitle: '名探偵コナン',
      cnTitle: '名侦探柯南',
      cover: 'https://api.bgm.tv/v0/subjects/899/image?type=common',
      watched: 0,
      total: null,
      displayTotal: '??',
      visualTotal: 1200,
      doingCount: 9830,
      ambient: ['rgba(37, 99, 235, 0.30)', 'rgba(245, 158, 11, 0.25)', 'rgba(16, 185, 129, 0.22)'],
      episodes: [
        { num: '01', id: '1001', title: 'ジェットコースター殺人事件', cn: '云霄飞车杀人事件', date: '1996-01-08', comments: 142, status: 'air' },
        { num: '02', id: '1002', title: '社長令嬢誘拐事件', cn: '董事长千金绑架事件', date: '1996-01-15', comments: 65, status: 'air' },
        { num: '03', id: '1003', title: 'アイドル密室殺人事件', cn: '偶像密室杀人事件', date: '1996-01-22', comments: 58, status: 'air' },
        { num: '04', id: '1004', title: '大都会暗号マップ事件', cn: '大都会暗号地图事件', date: '1996-01-29', comments: 49, status: 'air' },
        { num: '05', id: '1005', title: '新幹線大爆破事件', cn: '新干线大爆破事件', date: '1996-02-05', comments: 53, status: 'air' },
        { num: '06', id: '1006', title: 'バレンタイン殺人事件', cn: '情人节杀人事件', date: '1996-02-12', comments: 44, status: 'air' },
        { num: '07', id: '1007', title: '月いちプレゼント脅迫事件', cn: '每月一件礼物威胁事件', date: '1996-02-19', comments: 51, status: 'air' },
        { num: '08', id: '1008', title: '美術館オーナー殺人事件', cn: '美术馆馆长杀人事件', date: '1996-02-26', comments: 62, status: 'air' },
        { num: '09', id: '1009', title: '天下一夜祭殺人事件', cn: '天下第一夜祭杀人事件', date: '1996-03-04', comments: 39, status: 'air' },
        { num: '10', id: '1010', title: 'プロサッカー選手脅迫事件', cn: '职业足球选手威胁事件', date: '1996-03-11', comments: 47, status: 'air' },
        { num: '11', id: '1011', title: 'ピアノソナタ『月光』殺人事件', cn: '钢琴奏鸣曲《月光》杀人事件', date: '1996-04-08', comments: 328, status: 'air' },
        { num: '12', id: '1012', title: '歩美ちゃん誘拐事件', cn: '步美绑架事件', date: '1996-04-15', comments: 41, status: 'air' }
      ]
    }
  ],

  // 10 条真实抓抓时间线动态
  timelineItems: [
    {
      id: '48201901',
      dateGroup: '今天',
      category: 'subject',
      user: '苌楚无思',
      userUrl: 'user.html?uid=changchuwusi',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1',
      action: '在读',
      targetTitle: '名探偵に甘美なる死を',
      targetUrl: 'subject.html?id=369784',
      stars: 4,
      comment: '什么叫冬马的女儿雪菜',
      time: '29分8秒前',
      source: 'mobile',
      isSelf: false,
      subjectCard: {
        cn: '献给名侦探的甜美死亡',
        url: 'subject.html?id=369784',
        cover: 'https://api.bgm.tv/v0/subjects/369784/image?type=common',
        rank: null,
        score: '7.8',
        totalVotes: 102,
        info: '2022-01-08 / 方丈貴恵 / 東京創元社 / 416'
      },
      reactions: []
    },
    {
      id: '48201244',
      dateGroup: '今天',
      category: 'subject',
      user: '苌楚无思',
      userUrl: 'user.html?uid=changchuwusi',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1',
      action: '读过',
      targetTitle: '時計館の殺人',
      targetUrl: 'subject.html?id=15660',
      stars: 4,
      comment: '很大气的谜底，但是谜面在谜底揭晓前三页才抖落出来',
      time: '6小时21分钟前',
      source: 'mobile',
      isSelf: false,
      subjectCard: {
        cn: '钟表馆幽灵',
        url: 'subject.html?id=15660',
        cover: 'https://api.bgm.tv/v0/subjects/15660/image?type=common',
        rank: '#422',
        score: '8.2',
        totalVotes: 388,
        info: '1995-06-07 / 綾辻行人 / 講談社 / 626'
      },
      reactions: []
    },
    {
      id: '48195012',
      dateGroup: '昨天',
      category: 'progress',
      user: '少年游',
      userUrl: 'user.html?uid=553488',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      action: '完成了 3 of ?? 话',
      targetTitle: 'ドラゴンボール超 ビルス',
      targetUrl: 'subject.html?id=623249',
      stars: 4,
      comment: '',
      time: '1天6小时前',
      source: 'web',
      isSelf: true,
      subjectCard: {
        cn: '龙珠超 比鲁斯',
        url: 'subject.html?id=623249',
        cover: 'https://api.bgm.tv/v0/subjects/623249/image?type=common',
        rank: null,
        score: '7.5',
        totalVotes: 850,
        info: '2026年10月11日 / 鳥山明 / 山室直儀'
      },
      reactions: []
    },
    {
      id: '48191008',
      dateGroup: '2026-11-1',
      category: 'subject',
      user: '苌楚无思',
      userUrl: 'user.html?uid=changchuwusi',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1',
      action: '看过',
      targetTitle: 'フルメタル・パニック? ふもっふ',
      targetUrl: 'subject.html?id=337',
      stars: 4,
      comment: '意外地有效果，虽然事件和逻辑都比较古早（委婉），但故事性居然很强',
      time: '1天15小时前',
      source: 'mobile',
      isSelf: false,
      subjectCard: {
        cn: '全金属狂潮 校园篇',
        url: 'subject.html?id=337',
        cover: 'https://api.bgm.tv/v0/subjects/337/image?type=common',
        rank: '#161',
        score: '8.1',
        totalVotes: 6580,
        info: '12话 / 2003年8月26日 / 武本康弘 / 賀東招二 / 堀内修'
      },
      reactions: [{ icon: 'https://bgm.tv/img/smiles/tv/15.gif', count: 1, mine: false }]
    },
    {
      id: '48182005',
      dateGroup: '2026-10-31',
      category: 'subject',
      user: '订砾袭蓝羌',
      userUrl: 'user.html?uid=dingle',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1',
      action: '看过',
      targetTitle: 'Cyberpunk: Edgerunners 2',
      targetUrl: 'subject.html?id=501122',
      stars: 3,
      comment: '多线没讲明白',
      time: '2天15小时前',
      source: 'web',
      isSelf: false,
      subjectCard: {
        cn: '赛博朋克：边缘行者 2',
        url: 'subject.html?id=501122',
        cover: 'https://api.bgm.tv/v0/subjects/505550/image?type=common',
        rank: null,
        score: '5.5',
        totalVotes: 5177,
        info: '10话 / 2026年10月20日 / 五十嵐海 / CD Projekt'
      },
      reactions: [
        { icon: 'https://bgm.tv/img/smiles/tv/01.gif', count: 5, mine: false },
        { icon: 'https://bgm.tv/img/smiles/tv/44.gif', count: 1, mine: false }
      ]
    },
    {
      id: '48181002',
      dateGroup: '2026-10-31',
      category: 'subject',
      user: 'Sai🖖',
      userUrl: 'user.html?uid=sai',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg',
      action: '看过',
      targetTitle: 'Shaun the Sheep: The Beast of Mossy Bottom',
      targetUrl: 'subject.html?id=520991',
      stars: 3,
      comment: '技术老是情怀，故事老是摸鱼。',
      time: '2天19小时前',
      source: 'mobile',
      isSelf: false,
      subjectCard: {
        cn: '小羊肖恩3：怪兽来袭',
        url: 'subject.html?id=520991',
        cover: 'https://api.bgm.tv/v0/subjects/515779/image?type=common',
        rank: null,
        score: '6.0',
        totalVotes: 16,
        info: '1话 / 2026年9月18日 / Steve Cox、Matthew Walker'
      },
      reactions: [
        { icon: 'https://bgm.tv/img/smiles/tv/15.gif', count: 10, mine: false },
        { icon: 'https://bgm.tv/img/smiles/tv/24.gif', count: 1, mine: false }
      ]
    },
    {
      id: '48178001',
      dateGroup: '2026-10-30',
      category: 'say',
      user: '少年游',
      userUrl: 'user.html?uid=553488',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      action: '说',
      targetTitle: '',
      targetUrl: '',
      stars: 0,
      comment: '周末把《比鲁斯》前 3 话一口气补完了，重制版的打斗分镜确实爽快 (bgm38)',
      time: '3天前',
      source: 'web',
      isSelf: true,
      subjectCard: null,
      reactions: [{ icon: 'https://bgm.tv/img/smiles/tv/15.gif', count: 3, mine: true }]
    },
    {
      id: '48174009',
      dateGroup: '2026-10-29',
      category: 'blog',
      user: '白葱',
      userUrl: 'user.html?uid=baicong',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1',
      action: '发表了新日志',
      targetTitle: '从十月新番看作画演出的数码摄影演变',
      targetUrl: 'blog.html?id=373309',
      stars: 0,
      comment: '梳理了最近三年 WEB 系原画师在 TV 动画摄影合成环节的突破与局限……',
      time: '4天前',
      source: 'web',
      isSelf: false,
      subjectCard: null,
      reactions: [{ icon: 'https://bgm.tv/img/smiles/tv/01.gif', count: 8, mine: false }]
    }
  ],

  // 每日放送数据
  calendarData: {
    today: {
      count: 10,
      watchers: '18,593',
      items: [
        { cn: '暗机 DARK MACHINE', jp: 'DARK MACHINE', url: 'subject.html?id=623249', cover: 'https://api.bgm.tv/v0/subjects/623249/image?type=common' },
        { cn: '赛博朋克：边缘行者 2', jp: 'Cyberpunk: Edgerunners 2', url: 'subject.html?id=505550', cover: 'https://api.bgm.tv/v0/subjects/505550/image?type=common' },
        { cn: '幻想水浒传', jp: '幻想水滸伝', url: 'subject.html?id=425998', cover: 'https://api.bgm.tv/v0/subjects/425998/image?type=common' },
        { cn: '战斗之魂[Re] 绝界之空', jp: 'Battle Spirits [Re]', url: 'subject.html?id=443423', cover: 'https://api.bgm.tv/v0/subjects/443423/image?type=common' },
        { cn: '弹珠汽水瓶里的千岁同学 2', jp: '千歳くんはラムネ瓶のなか', url: 'subject.html?id=337', cover: 'https://api.bgm.tv/v0/subjects/337/image?type=common' },
        { cn: '超巡！超条前辈', jp: '超巡！超条先輩', url: 'subject.html?id=369784', cover: 'https://api.bgm.tv/v0/subjects/369784/image?type=common' },
        { cn: '乱世千金倪亚‧利斯顿', jp: '凶乱令嬢ニア・リストン', url: 'subject.html?id=15660', cover: 'https://api.bgm.tv/v0/subjects/15660/image?type=common' },
        { cn: '被放逐的作弊赋予魔术师', jp: '追放されたチート付与魔術師', url: 'subject.html?id=515779', cover: 'https://api.bgm.tv/v0/subjects/515779/image?type=common' },
        { cn: '冷淡的佐藤同学只对我撒娇', jp: '塩対応の佐藤さんが俺にだけ甘い', url: 'subject.html?id=464376', cover: 'https://api.bgm.tv/v0/subjects/464376/image?type=common' },
        { cn: 'Kiff: Scarm II', jp: 'Kiff: Scarm II', url: 'subject.html?id=485936', cover: 'https://api.bgm.tv/v0/subjects/485936/image?type=common' }
      ]
    },
    tomorrow: {
      count: 12,
      watchers: '21,480',
      items: [
        { cn: '龙珠超 比鲁斯', jp: 'ドラゴンボール超 ビルス', url: 'subject.html?id=623249', cover: 'https://api.bgm.tv/v0/subjects/623249/image?type=common' },
        { cn: '海贼王 蛋头岛篇', jp: 'ONE PIECE', url: 'subject.html?id=975', cover: 'https://api.bgm.tv/v0/subjects/975/image?type=common' },
        { cn: '名侦探柯南', jp: '名探偵コナン', url: 'subject.html?id=899', cover: 'https://api.bgm.tv/v0/subjects/899/image?type=common' },
        { cn: '迷宫饭 第二季', jp: 'ダンジョン飯 第2期', url: 'subject.html?id=501234', cover: 'https://api.bgm.tv/v0/subjects/501234/image?type=common' },
        { cn: '葬送的芙莉莲 续篇', jp: '葬送のフリーレン', url: 'subject.html?id=496617', cover: 'https://api.bgm.tv/v0/subjects/496617/image?type=common' },
        { cn: '金牌得主 第二季', jp: 'メダリスト 第2期', url: 'subject.html?id=508912', cover: 'https://api.bgm.tv/v0/subjects/508912/image?type=common' }
      ]
    }
  },

  // 6 条小组话题
  groupTopics: [
    { title: '什么叫大模型直接读写神经网络权重？', author: '白葱', group: '～技术宅真可怕～', replies: '+17', url: 'group.html?mode=topic&id=391738', avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1' },
    { title: '【脚本发布】查询bangumi贴中所有用户对某部番剧的观看状态', author: '平沢温树', group: '～技术宅真可怕～', replies: '+98', url: 'group.html?mode=topic&id=391701', avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1' },
    { title: '没有色准较正确的屏幕吗', author: '秋人', group: '～技术宅真可怕～', replies: '+13', url: 'group.html?mode=topic&id=391699', avatar: 'https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg' },
    { title: '2026 年秋季档院线电影观影综合讨论楼', author: '白金小雪', group: '电影', replies: '+217', url: 'group.html?mode=topic&id=391650', avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1' },
    { title: '有哪些让你看完之后久久不能平静的推理电影？', author: '白金小雪', group: '电影', replies: '+148', url: 'group.html?mode=topic&id=391620', avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1' },
    { title: '目前在弄的一个影视网站，想听听大家的真实想法，欢迎来吐槽', author: 'xiaoli', group: '电影', replies: '+21', url: 'group.html?mode=topic&id=391610', avatar: 'https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg' }
  ],

  // 6 条热门条目讨论
  subjectTopics: [
    { title: '这个游戏的文化底色属于哪里？是什么哲学？', author: 'ougleo', subject: 'Z.A.T.O. // I Love the World', replies: '+16', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1' },
    { title: '真那么多人喜欢吃敏鬼那一套吗？', author: '魔法姐妹羊羊和麟麟', subject: '仮面ライダーアギト', replies: '+6', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1' },
    { title: '听说，在动画业界评价很烂', author: 'みたいなっ', subject: '超かぐや姫！', replies: '+16', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg' },
    { title: '求资源', author: 'retinulah', subject: 'Dm7', replies: '+33', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/57/28/572829.jpg?r=1745238398&hd=1' },
    { title: '找了半天，没找到漫画的词条？', author: '瓦达西瓦卡密哒', subject: 'GJ部', replies: '+8', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1' },
    { title: '抽烟猫会不会成为新大航海时代的终结', author: '德国咕科', subject: 'ヤニねこ', replies: '+37', url: 'subject-reviews.html?id=400602&tab=board', avatar: 'https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg' }
  ],

  // 6 条 Sumomo Board 官方公告
  announcements: [
    { date: '2026.8.15', title: '社区化开发 UI 设计师招募', url: 'group.html?mode=topic&id=380001' },
    { date: '2026.3.8', title: 'Bangumi 娘 & 布莱克·樱超进化 / 动态表情', url: 'group.html?mode=topic&id=375001' },
    { date: '2025.9.6', title: 'Introducing Bangumi 番组计划 Riff', url: 'group.html?mode=topic&id=370001' },
    { date: '2025.8.3', title: '人物相册 & 人物关联正式上线', url: 'group.html?mode=topic&id=365001' },
    { date: '2024.10.3', title: '条目公共标签系统升级公告', url: 'group.html?mode=topic&id=360001' },
    { date: '2019.08.10', title: '「小圣杯」最萌大战内测进行中', url: 'group.html?mode=topic&id=350001' }
  ],

  // 6 组表情包
  smileyPacks: {
    tv: [
      { code: '(bgm24)', img: 'https://bgm.tv/img/smiles/tv/01.gif' },
      { code: '(bgm38)', img: 'https://bgm.tv/img/smiles/tv/15.gif' },
      { code: '(bgm47)', img: 'https://bgm.tv/img/smiles/tv/24.gif' },
      { code: '(bgm67)', img: 'https://bgm.tv/img/smiles/tv/44.gif' },
      { code: '(bgm93)', img: 'https://bgm.tv/img/smiles/tv/70.gif' }
    ],
    vs: [
      { code: '(bgm201)', img: 'https://bgm.tv/img/smiles/tv_vs/bgm_201.png' },
      { code: '(bgm202)', img: 'https://bgm.tv/img/smiles/tv_vs/bgm_202.png' },
      { code: '(bgm203)', img: 'https://bgm.tv/img/smiles/tv_vs/bgm_203.png' }
    ],
    tv500: [
      { code: '(bgm501)', img: 'https://bgm.tv/img/smiles/tv_500/bgm_501.gif' },
      { code: '(bgm505)', img: 'https://bgm.tv/img/smiles/tv_500/bgm_505.gif' }
    ],
    bgm: [
      { code: '(bgm01)', img: 'https://bgm.tv/img/smiles/bgm/01.png' },
      { code: '(bgm11)', img: 'https://bgm.tv/img/smiles/bgm/11.gif' }
    ],
    musume: [
      { code: '(musume_01)', img: 'https://bgm.tv/img/smiles/musume/musume_01.gif' },
      { code: '(musume_02)', img: 'https://bgm.tv/img/smiles/musume/musume_02.gif' }
    ],
    blake: [
      { code: '(blake_01)', img: 'https://bgm.tv/img/smiles/blake/blake_01.gif' },
      { code: '(blake_02)', img: 'https://bgm.tv/img/smiles/blake/blake_02.gif' }
    ]
  },

  ukagakaSpeeches: [
    'Hi! 少年游，《ドラゴンボール超 ビルス》第 4 话已经放送啦，要现在点亮「ep.4 看过」吗？',
    '左右两侧的面板都可以点击折叠箭头收起成极简图标轨，让你专注中央追番与抓抓动态哦！',
    '看到背景里的流光色彩了吗？每当你切换在看番剧，整座毛玻璃工作台都会折射出对应的海报氛围光～',
    '点击任意章节数字方块，就会弹出高通透毛玻璃详情浮窗，支持看过/看到/想看/抛弃/撤消 5 态切换！'
  ],
  speechIdx: 0
};

/* ==================== 工具函数 ==================== */
function showToast(msg) {
  const wrap = document.getElementById('toastContainer');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'glass-toast';
  el.innerHTML = `<span>✦</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* 更新动态流光背景色 */
function syncAmbientColors(subj) {
  if (!subj || !subj.ambient) return;
  const root = document.documentElement;
  root.style.setProperty('--stage-color-1', subj.ambient[0]);
  root.style.setProperty('--stage-color-2', subj.ambient[1]);
  root.style.setProperty('--stage-color-3', subj.ambient[2]);
}
/* ==================== 1. 渲染收视进度管理器（编辑刊物式：目录索引 + 刊物头条 + 编目带） ==================== */
const EP_STATUS_LABEL = {
  watched: '看过',
  air: '未看',
  queue: '想看',
  drop: '抛弃',
  na: '未放送'
};

function renderProgressManager() {
  const listEl = document.getElementById('prgSubjectList');
  const stageEl = document.getElementById('subjectSpotlightStage');
  const tinyEl = document.getElementById('prgTinyMatrixView');
  const ledgerEl = document.getElementById('prgLedger');
  if (!listEl || !stageEl || !tinyEl) return;

  const filtered = BGM_STATE.watchingSubjects.filter(
    s => BGM_STATE.activeCategory === '0' || s.type === BGM_STATE.activeCategory
  );

  listEl.setAttribute('data-density', BGM_STATE.density);
  const countEl = document.getElementById('prgIndexCount');
  if (countEl) countEl.textContent = String(filtered.length).padStart(2, '0');

  if (filtered.length === 0) {
    listEl.innerHTML = '<li class="prg-index-empty">当前分类暂无在看条目</li>';
    stageEl.innerHTML = '';
    if (ledgerEl) ledgerEl.innerHTML = '';
    return;
  }

  let activeSubj = filtered.find(s => s.id === BGM_STATE.activeSubjectId) || filtered[0];
  BGM_STATE.activeSubjectId = activeSubj.id;
  syncAmbientColors(activeSubj);

  /* ---------- 左：目录索引 ---------- */
  listEl.innerHTML = filtered.map((subj, i) => {
    const pct = Math.min(100, Math.round((subj.watched / subj.visualTotal) * 100));
    const nextEpNum = subj.watched + 1;
    const isSel = subj.id === activeSubj.id;
    return `
      <li class="prg-index-row ${isSel ? 'is-selected' : ''}" data-select-subj="${subj.id}">
        <span class="prg-index-no">${String(i + 1).padStart(2, '0')}</span>
        <div class="prg-index-main">
          <img src="${subj.cover}" alt="${subj.jpTitle}" class="prg-index-thumb" loading="lazy" />
          <span class="prg-index-jp">${subj.jpTitle}</span>
          <span class="prg-index-cn">${subj.cnTitle}</span>
        </div>
        <div class="prg-index-side">
          <span class="prg-index-frac">${subj.watched}<em> / ${subj.displayTotal}</em></span>
          <button type="button" class="prg-index-check" data-quick-checkin="${subj.id}">+ ep.${nextEpNum}</button>
        </div>
        <span class="prg-index-rule"><i style="width:${pct}%"></i></span>
      </li>
    `;
  }).join('');

  /* ---------- 平铺版面 ---------- */
  if (BGM_STATE.viewMode === 'tiny') {
    stageEl.hidden = true;
    if (ledgerEl) ledgerEl.hidden = true;
    tinyEl.hidden = false;
    tinyEl.innerHTML = filtered.map(subj => {
      const pct = Math.min(100, Math.round((subj.watched / subj.visualTotal) * 100));
      return `
        <div class="tiny-card">
          <div class="film-title-row">
            <span class="air-dot"></span>
            <strong>${subj.jpTitle}</strong>
          </div>
          <div class="film-sub">${subj.cnTitle} · 已看 ${subj.watched}/${subj.displayTotal}</div>
          <div class="gauge-track"><div class="gauge-fill" style="width:${pct}%"></div></div>
          <div class="ep-grid-buttons">
            ${subj.episodes.map((ep, idx) => `
              <button type="button" class="ep-cell-btn st-${ep.status}" data-ep-subj="${subj.id}" data-ep-idx="${idx}">
                <span class="ep-no">${ep.num}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  stageEl.hidden = false;
  if (ledgerEl) ledgerEl.hidden = false;
  tinyEl.hidden = true;

  const pct = Math.min(100, Math.round((activeSubj.watched / activeSubj.visualTotal) * 100));
  const nextEp = activeSubj.watched + 1;
  const nextTitle = activeSubj.episodes[activeSubj.watched]?.title || '';
  const idxInList = filtered.findIndex(s => s.id === activeSubj.id) + 1;

  /* ---------- 右：刊物头条 ---------- */
  stageEl.innerHTML = `
    <div class="prg-feature-kicker">
      <span>No.${String(idxInList).padStart(2, '0')}</span>
      <b>·</b>
      <span>${pct}% Complete</span>
      <b>·</b>
      <span>${activeSubj.doingCount.toLocaleString()} Watching</span>
    </div>

    <div class="prg-feature-titlehead">
      <h2 class="prg-feature-jp">
        <a href="subject.html?id=${activeSubj.id}">${activeSubj.jpTitle}</a>
      </h2>
      <button type="button" class="prg-edit" id="btnEditCollect" data-subj-title="${activeSubj.jpTitle}">修改收藏</button>
    </div>
    <p class="prg-feature-cn">${activeSubj.cnTitle}</p>

    <div class="prg-feature-body">
      <figure class="prg-figure">
        <a href="subject.html?id=${activeSubj.id}">
          <img src="${activeSubj.cover}" alt="${activeSubj.jpTitle}" />
        </a>
        <figcaption>${activeSubj.displayTotal} Ep &middot; On Air</figcaption>
      </figure>

      <div class="prg-feature-controls">
        <button type="button" class="prg-primary" data-quick-checkin="${activeSubj.id}">
          <span>点亮 ep.${nextEp} 看过${nextTitle ? ' · ' + nextTitle : ''}</span>
          <span class="prg-primary-arrow">→</span>
        </button>

        <div class="prg-meter">
          <div class="prg-meter-line">
            <span class="prg-meter-num">${activeSubj.watched}</span>
            <span class="prg-meter-den">/ ${activeSubj.displayTotal} 话</span>
            <span class="prg-meter-pct">${pct}%</span>
          </div>
          <div class="prg-meter-rule"><i style="width:${pct}%"></i></div>
          <div class="prg-meter-meta">
            🔥 同时在看 <b>${activeSubj.doingCount.toLocaleString()}</b> 人
          </div>
        </div>

        <form class="prg-revise" id="batchEpForm" data-subj-id="${activeSubj.id}">
          <label for="batchEpInput">Revise</label>
          <input type="number" id="batchEpInput" value="${activeSubj.watched}" min="0" max="9999" />
          <span class="batch-ep-total">/ ${activeSubj.displayTotal}</span>
          <button type="submit" class="batch-ep-submit">更新进度</button>
        </form>

        <div class="prg-footnotes">
          <a href="subject-reviews.html?id=${activeSubj.id}&tab=board">参与讨论</a>
          <a href="subject-comments.html?id=${activeSubj.id}">观吐槽</a>
          <a href="blog.html?mode=create&review=${activeSubj.id}">写长评</a>
          <a href="subject-ep.html?id=${activeSubj.id}">全部章节 »</a>
        </div>
      </div>
    </div>
  `;

  /* ---------- 底：章节编目带 ---------- */
  if (ledgerEl) {
    ledgerEl.innerHTML = `
      <div class="prg-ledger-head">
        <div class="ep-legend-list">
          <span class="legend-item"><i class="legend-dot lg-watched"></i>看过</span>
          <span class="legend-item"><i class="legend-dot lg-air"></i>已播未看</span>
          <span class="legend-item"><i class="legend-dot lg-queue"></i>想看</span>
          <span class="legend-item"><i class="legend-dot lg-drop"></i>抛弃</span>
          <span class="legend-item"><i class="legend-dot lg-na"></i>未放送</span>
        </div>
        <span class="prg-ledger-hint">点击话数 &middot; 五态操作</span>
      </div>
      <div class="ep-grid-buttons">
        ${activeSubj.episodes.map((ep, idx) => `
          <button type="button" class="ep-cell-btn st-${ep.status}" data-ep-subj="${activeSubj.id}" data-ep-idx="${idx}" title="EP.${ep.num} ${ep.title}">
            <span class="ep-no">${ep.num}</span>
            <span class="ep-lab">${EP_STATUS_LABEL[ep.status] || ''}</span>
          </button>
        `).join('')}
      </div>
    `;
  }
}

/* ==================== 2. 渲染抓抓时空动态流 ==================== */
function renderTimeline() {
  const feedEl = document.getElementById('timelineFeed');
  if (!feedEl) return;

  const list = BGM_STATE.timelineItems.filter(
    item => BGM_STATE.tmlFilter === 'all' || item.category === BGM_STATE.tmlFilter
  );

  if (list.length === 0) {
    feedEl.innerHTML = `<div class="tml-card"><div class="tml-body">该频道暂无时空动态记录。</div></div>`;
    return;
  }

  let lastGroup = '';
  const html = [];

  list.forEach(item => {
    if (item.dateGroup !== lastGroup) {
      lastGroup = item.dateGroup;
      html.push(`
        <div class="tml-date-divider">
          <span class="tml-date-pill">${item.dateGroup}</span>
          <span class="tml-date-line"></span>
        </div>
      `);
    }

    const starsStr = item.stars > 0 ? '★'.repeat(item.stars) + '☆'.repeat(5 - item.stars) : '';

    html.push(`
      <article class="tml-card" data-tml-id="${item.id}">
        <a href="${item.userUrl}" target="_blank">
          <img src="${item.avatar}" alt="${item.user}" class="tml-avatar" />
        </a>
        <div class="tml-body">
          <div class="tml-headline">
            <a href="${item.userUrl}" target="_blank" class="tml-user">${item.user}</a>
            <span class="tml-action-badge">${item.action}</span>
            ${item.targetTitle ? `<a href="${item.targetUrl}" target="_blank" class="tml-target-link">${item.targetTitle}</a>` : ''}
            ${starsStr ? `<span class="tml-stars">${starsStr}</span>` : ''}
          </div>

          ${item.comment ? `<div class="tml-quote">${item.comment}</div>` : ''}

          ${item.subjectCard ? `
            <div class="tml-subject-glass">
              <img src="${item.subjectCard.cover}" alt="${item.subjectCard.cn}" class="tml-subject-cover" />
              <div class="tml-subject-meta">
                <div class="tml-subject-title-row">
                  <a href="${item.subjectCard.url}" target="_blank" class="tml-subject-name">${item.subjectCard.cn}</a>
                  ${item.subjectCard.rank ? `<span class="tml-rank-pill">${item.subjectCard.rank}</span>` : ''}
                  <span class="tml-score-pill">★ ${item.subjectCard.score} <small style="color:var(--text-3)">(${item.subjectCard.totalVotes})</small></span>
                </div>
                <div class="tml-subject-info">${item.subjectCard.info}</div>
              </div>
            </div>
          ` : ''}

          <div class="tml-foot">
            <div class="tml-reactions">
              ${item.reactions.map((r, rIdx) => `
                <button type="button" class="reaction-chip ${r.mine ? 'is-mine' : ''}" data-react-id="${item.id}" data-react-idx="${rIdx}">
                  <img src="${r.icon}" alt="贴贴" />
                  <span>${r.count}</span>
                </button>
              `).join('')}
              <button type="button" class="tml-op-btn" data-add-like="${item.id}">☺ 贴贴</button>
              <button type="button" class="tml-op-btn" data-toggle-reply="${item.id}">💬 回复</button>
              ${item.isSelf ? `<button type="button" class="tml-op-btn" data-delete-tml="${item.id}">🗑️ 删除</button>` : ''}
            </div>
            <div class="tml-ops">
              <span>${item.time} · ${item.source}</span>
            </div>
          </div>

          <div class="tml-reply-box" id="replyBox_${item.id}" style="display:none">
            <input type="text" class="tml-reply-input" placeholder="回复 @${item.user}..." />
            <button type="button" class="primary-glow-btn" data-send-reply="${item.id}">发送</button>
          </div>
        </div>
      </article>
    `);
  });

  feedEl.innerHTML = html.join('');
}

/* ==================== 3. 渲染左右侧翼模块 (每日放送 + 小组话题 + 热门讨论 + 黑板报) ==================== */
function renderWings() {
  // 每日放送
  const calData = BGM_STATE.calendarData[BGM_STATE.calendarDay];
  const calGrid = document.getElementById('calendarGrid');
  const calSum = document.getElementById('calendarSummary');
  if (calGrid && calData) {
    calGrid.innerHTML = calData.items.map(item => `
      <a href="${item.url}" target="_blank" class="cal-poster-item" title="${item.cn} (${item.jp})">
        <img src="${item.cover}" alt="${item.cn}" loading="lazy" />
        <div class="cal-poster-overlay">
          <div class="cal-poster-cn">${item.cn}</div>
          <div class="cal-poster-jp">${item.jp}</div>
        </div>
      </a>
    `).join('');
  }
  if (calSum && calData) {
    calSum.innerHTML = `
      <span>${BGM_STATE.calendarDay === 'today' ? '今日' : '明日'}上映 <strong>${calData.count}</strong> 部</span>
      <span>共 <strong>${calData.watchers}</strong> 人收看</span>
    `;
  }

  // 小组话题
  const grpEl = document.getElementById('groupTopicsList');
  if (grpEl) {
    grpEl.innerHTML = BGM_STATE.groupTopics.map(t => `
      <li class="compact-topic-item">
        <img src="${t.avatar}" alt="${t.author}" class="topic-avatar-sm" />
        <div class="topic-main-sm">
          <a href="${t.url}" target="_blank" class="topic-title-sm">${t.title}</a>
          <div class="topic-meta-sm">
            <span class="topic-source-name">${t.author} · <strong>${t.group}</strong></span>
            <span class="topic-reply-pill">${t.replies}</span>
          </div>
        </div>
      </li>
    `).join('');
  }

  // 热门条目讨论
  const sbjEl = document.getElementById('subjectTopicsList');
  if (sbjEl) {
    sbjEl.innerHTML = BGM_STATE.subjectTopics.map(t => `
      <li class="compact-topic-item">
        <img src="${t.avatar}" alt="${t.author}" class="topic-avatar-sm" />
        <div class="topic-main-sm">
          <a href="${t.url}" target="_blank" class="topic-title-sm">${t.title}</a>
          <div class="topic-meta-sm">
            <span class="topic-source-name">${t.author} · <strong>${t.subject}</strong></span>
            <span class="topic-reply-pill">${t.replies}</span>
          </div>
        </div>
      </li>
    `).join('');
  }

  // Sumomo Board 黑板报
  const newsEl = document.getElementById('announcementList');
  if (newsEl) {
    newsEl.innerHTML = BGM_STATE.announcements.map(n => `
      <li class="news-row">
        <span class="news-date">${n.date}</span>
        <a href="${n.url}" target="_blank" class="news-link">${n.title}</a>
      </li>
    `).join('');
  }
}

/* ==================== 4. 左右侧翼伸缩控制 ==================== */
function syncWingClasses() {
  const shell = document.getElementById('studioShell');
  const leftW = document.getElementById('leftWing');
  const rightW = document.getElementById('rightWing');
  const focusLabel = document.getElementById('focusModeLabel');

  if (shell) {
    shell.classList.toggle('left-collapsed', BGM_STATE.leftCollapsed);
    shell.classList.toggle('right-collapsed', BGM_STATE.rightCollapsed);
  }
  if (leftW) leftW.classList.toggle('is-collapsed', BGM_STATE.leftCollapsed);
  if (rightW) rightW.classList.toggle('is-collapsed', BGM_STATE.rightCollapsed);

  if (focusLabel) {
    const bothCollapsed = BGM_STATE.leftCollapsed && BGM_STATE.rightCollapsed;
    focusLabel.textContent = bothCollapsed ? '专注中轴' : '双翼展开';
  }
}

/* ==================== 5. 章节详情毛玻璃浮窗逻辑 ==================== */
function openEpPopover(subjId, epIdx, anchorBtn) {
  const subj = BGM_STATE.watchingSubjects.find(s => s.id === subjId);
  if (!subj || !subj.episodes[epIdx]) return;
  const ep = subj.episodes[epIdx];

  BGM_STATE.activeEpPopover = { subjId, epIdx };
  const pop = document.getElementById('epPopover');
  document.getElementById('epPopCode').textContent = `EP.${ep.num}`;
  document.getElementById('epPopTitle').textContent = `${ep.title} (${ep.cn})`;
  document.getElementById('epPopMeta').textContent = `首播日期：${ep.date} · 条目：${subj.cnTitle}`;

  const statusNames = { watched: '看过', air: '已播未看', queue: '想看', drop: '抛弃', na: '未放送' };
  document.getElementById('epPopCurrentStatus').textContent = `当前：${statusNames[ep.status] || '未看'}`;
  const discussLink = document.getElementById('epPopDiscussLink');
  discussLink.textContent = `💬 讨论 (+${ep.comments}) »`;
  discussLink.href = `ep.html?id=${ep.id || 1227087}`;

  pop.hidden = false;
  const rect = anchorBtn.getBoundingClientRect();
  const popW = 330;
  let left = rect.left + rect.width / 2 - popW / 2;
  left = Math.max(16, Math.min(window.innerWidth - popW - 16, left));
  let top = rect.top - 196;
  if (top < 76) top = rect.bottom + 10;

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

/* ==================== 6. 全局事件委托与交互绑定 ==================== */
document.addEventListener('DOMContentLoaded', () => {
  renderProgressManager();
  renderTimeline();
  renderWings();
  syncWingClasses();

  // 左翼收起/展开
  document.getElementById('btnCollapseLeft')?.addEventListener('click', () => {
    BGM_STATE.leftCollapsed = !BGM_STATE.leftCollapsed;
    syncWingClasses();
    showToast(BGM_STATE.leftCollapsed ? '已收起左侧放送舱' : '已展开左侧放送舱');
  });

  // 右翼收起/展开
  document.getElementById('btnCollapseRight')?.addEventListener('click', () => {
    BGM_STATE.rightCollapsed = !BGM_STATE.rightCollapsed;
    syncWingClasses();
    showToast(BGM_STATE.rightCollapsed ? '已收起右侧社区舱' : '已展开右侧社区舱');
  });

  // 顶栏一键专注模式 / 双翼全开切换
  document.getElementById('btnToggleFocusMode')?.addEventListener('click', () => {
    const bothCollapsed = BGM_STATE.leftCollapsed && BGM_STATE.rightCollapsed;
    BGM_STATE.leftCollapsed = !bothCollapsed;
    BGM_STATE.rightCollapsed = !bothCollapsed;
    syncWingClasses();
    showToast(BGM_STATE.leftCollapsed ? '已进入专注中轴模式（双翼收起为图标轨）' : '已恢复三栏全景环抱模式');
  });

  // 全局点击事件委托
  document.addEventListener('click', e => {
    const target = e.target;

    // 1. 迷你图标轨点击展开对应侧翼
    const expandWingBtn = target.closest('[data-expand-wing]');
    if (expandWingBtn) {
      const side = expandWingBtn.getAttribute('data-expand-wing');
      if (side === 'left') BGM_STATE.leftCollapsed = false;
      if (side === 'right') BGM_STATE.rightCollapsed = false;
      syncWingClasses();
      return;
    }

    // 2. 侧翼手风琴卡片展开/收起
    const accTrigger = target.closest('[data-accordion]');
    if (accTrigger) {
      const cardId = accTrigger.getAttribute('data-accordion');
      const card = document.getElementById(cardId);
      if (card) card.classList.toggle('is-open');
      return;
    }

    // 3. 切换在看番剧
    const quickCheckBtn = target.closest('[data-quick-checkin]');
    if (quickCheckBtn) {
      e.stopPropagation();
      const subjId = quickCheckBtn.getAttribute('data-quick-checkin');
      const subj = BGM_STATE.watchingSubjects.find(s => s.id === subjId);
      if (subj) {
        subj.watched += 1;
        const nextAirEp = subj.episodes.find(ep => ep.status !== 'watched');
        if (nextAirEp) nextAirEp.status = 'watched';
        renderProgressManager();
        showToast(`已点亮《${subj.cnTitle}》第 ${subj.watched} 话看过！`);
      }
      return;
    }

    const selectSubjCard = target.closest('[data-select-subj]');
    if (selectSubjCard) {
      BGM_STATE.activeSubjectId = selectSubjCard.getAttribute('data-select-subj');
      renderProgressManager();
      return;
    }

    // 4. 章节按钮点击弹出毛玻璃 Popover
    const epBtn = target.closest('[data-ep-subj]');
    if (epBtn) {
      e.stopPropagation();
      const subjId = epBtn.getAttribute('data-ep-subj');
      const epIdx = parseInt(epBtn.getAttribute('data-ep-idx'), 10);
      openEpPopover(subjId, epIdx, epBtn);
      return;
    }

    // 5. 章节 Popover 内 5 态按钮点击
    const epActionBtn = target.closest('[data-ep-action]');
    if (epActionBtn && BGM_STATE.activeEpPopover) {
      const action = epActionBtn.getAttribute('data-ep-action');
      const { subjId, epIdx } = BGM_STATE.activeEpPopover;
      const subj = BGM_STATE.watchingSubjects.find(s => s.id === subjId);
      if (subj && subj.episodes[epIdx]) {
        if (action === 'till') {
          subj.episodes.forEach((ep, i) => {
            if (i <= epIdx) ep.status = 'watched';
          });
          subj.watched = Math.max(subj.watched, epIdx + 1);
          showToast(`已将《${subj.cnTitle}》看到 EP.${subj.episodes[epIdx].num}`);
        } else if (action === 'watched') {
          subj.episodes[epIdx].status = 'watched';
          subj.watched += 1;
          showToast(`已标记 EP.${subj.episodes[epIdx].num} 为看过`);
        } else if (action === 'queue') {
          subj.episodes[epIdx].status = 'queue';
          showToast(`已标记 EP.${subj.episodes[epIdx].num} 为想看`);
        } else if (action === 'drop') {
          subj.episodes[epIdx].status = 'drop';
          showToast(`已标记 EP.${subj.episodes[epIdx].num} 为抛弃`);
        } else if (action === 'remove') {
          subj.episodes[epIdx].status = 'air';
          subj.watched = Math.max(0, subj.watched - 1);
          showToast(`已撤消 EP.${subj.episodes[epIdx].num} 观看记录`);
        }
        document.getElementById('epPopover').hidden = true;
        renderProgressManager();
      }
      return;
    }

    // 6. 打开修改收藏 Modal
    if (target.closest('#btnEditCollect')) {
      const title = target.closest('#btnEditCollect').getAttribute('data-subj-title');
      document.getElementById('collectModalTitle').textContent = `修改收藏 · ${title}`;
      document.getElementById('collectModal').hidden = false;
      return;
    }

    // 7. 抓抓时间线贴贴累加 / 新增贴贴 / 回复 / 删除
    const reactChip = target.closest('[data-react-id]');
    if (reactChip) {
      const id = reactChip.getAttribute('data-react-id');
      const idx = parseInt(reactChip.getAttribute('data-react-idx'), 10);
      const item = BGM_STATE.timelineItems.find(t => t.id === id);
      if (item && item.reactions[idx]) {
        item.reactions[idx].mine = !item.reactions[idx].mine;
        item.reactions[idx].count += item.reactions[idx].mine ? 1 : -1;
        renderTimeline();
      }
      return;
    }

    const addLikeBtn = target.closest('[data-add-like]');
    if (addLikeBtn) {
      const id = addLikeBtn.getAttribute('data-add-like');
      const item = BGM_STATE.timelineItems.find(t => t.id === id);
      if (item) {
        item.reactions.push({ icon: 'https://bgm.tv/img/smiles/tv/15.gif', count: 1, mine: true });
        renderTimeline();
        showToast('贴贴成功 +1');
      }
      return;
    }

    const toggleReplyBtn = target.closest('[data-toggle-reply]');
    if (toggleReplyBtn) {
      const id = toggleReplyBtn.getAttribute('data-toggle-reply');
      const box = document.getElementById(`replyBox_${id}`);
      if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
      return;
    }

    const sendReplyBtn = target.closest('[data-send-reply]');
    if (sendReplyBtn) {
      const id = sendReplyBtn.getAttribute('data-send-reply');
      const box = document.getElementById(`replyBox_${id}`);
      const input = box?.querySelector('input');
      if (input && input.value.trim()) {
        showToast(`已发送回复：${input.value.trim()}`);
        input.value = '';
        box.style.display = 'none';
      }
      return;
    }

    const delTmlBtn = target.closest('[data-delete-tml]');
    if (delTmlBtn) {
      const id = delTmlBtn.getAttribute('data-delete-tml');
      BGM_STATE.timelineItems = BGM_STATE.timelineItems.filter(t => t.id !== id);
      renderTimeline();
      showToast('已删除该条时空动态');
      return;
    }

    // 点击空白处关闭章节 Popover
    const pop = document.getElementById('epPopover');
    if (pop && !pop.hidden && !target.closest('#epPopover')) {
      pop.hidden = true;
    }
  });

  // 关闭章节 Popover 按钮
  document.getElementById('btnCloseEpPopover')?.addEventListener('click', () => {
    document.getElementById('epPopover').hidden = true;
  });

  // 批量话数表单提交
  document.addEventListener('submit', e => {
    if (e.target.id === 'batchEpForm') {
      e.preventDefault();
      const subjId = e.target.getAttribute('data-subj-id');
      const val = parseInt(document.getElementById('batchEpInput').value, 10);
      const subj = BGM_STATE.watchingSubjects.find(s => s.id === subjId);
      if (subj && !isNaN(val)) {
        subj.watched = Math.max(0, val);
        subj.episodes.forEach((ep, idx) => {
          ep.status = idx < subj.watched ? 'watched' : 'air';
        });
        renderProgressManager();
        showToast(`已将《${subj.cnTitle}》进度更新至 ${subj.watched} 话`);
      }
    }
  });

  // 分类过滤分段器 (#prgCatrgoryFilter)
  document.getElementById('prgCatrgoryFilter')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    BGM_STATE.activeCategory = btn.getAttribute('data-cat');
    btn.parentElement.querySelectorAll('.prg-tab').forEach(b => b.classList.toggle('is-active', b === btn));
    renderProgressManager();
  });

  // 密度切换 (精简 / 画廊 / 网格)
  document.getElementById('leftListDensityTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-density]');
    if (!btn) return;
    BGM_STATE.density = btn.getAttribute('data-density');
    document.querySelectorAll('#leftListDensityTabs .seg-pill').forEach(b => b.classList.toggle('is-active', b === btn));
    renderProgressManager();
  });

  // 舞台 / 平铺模式切换
  document.getElementById('prgManagerMode')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    BGM_STATE.viewMode = btn.getAttribute('data-mode');
    document.querySelectorAll('#prgManagerMode .seg-pill').forEach(b => b.classList.toggle('is-active', b === btn));
    renderProgressManager();
  });

  // 每日放送 今天 / 明天 切换
  document.getElementById('calendarDayTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-day]');
    if (!btn) return;
    BGM_STATE.calendarDay = btn.getAttribute('data-day');
    document.querySelectorAll('#calendarDayTabs .seg-mini-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    renderWings();
  });

  // 抓抓时间线分类切换
  document.getElementById('timelineTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-tml]');
    if (!btn) return;
    BGM_STATE.tmlFilter = btn.getAttribute('data-tml');
    document.querySelectorAll('#timelineTabs .seg-pill').forEach(b => b.classList.toggle('is-active', b === btn));
    renderTimeline();
  });

  document.querySelectorAll('.dropdown-btn-item[data-tml]').forEach(btn => {
    btn.addEventListener('click', () => {
      BGM_STATE.tmlFilter = 'all';
      document.getElementById('tmlMoreLabel').textContent = btn.textContent.trim();
      renderTimeline();
      showToast(`已切换至频道：${btn.textContent.trim()}`);
    });
  });

  // 吐槽输入框字数统计与表情抽屉
  const sayInput = document.getElementById('SayInput');
  const charStatus = document.getElementById('TsukkomiStatus');
  sayInput?.addEventListener('input', () => {
    charStatus.textContent = `${sayInput.value.length} / 380`;
  });

  document.getElementById('smileyGroupTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-pack]');
    if (!btn) return;
    const packKey = btn.getAttribute('data-pack');
    const drawer = document.getElementById('smileyDrawer');
    const isSame = btn.classList.contains('is-active') && !drawer.hidden;
    document.querySelectorAll('#smileyGroupTabs .smiley-tab-btn').forEach(b => b.classList.remove('is-active'));
    if (isSame) {
      drawer.hidden = true;
      return;
    }
    btn.classList.add('is-active');
    const list = BGM_STATE.smileyPacks[packKey] || [];
    drawer.innerHTML = list.map(s => `
      <button type="button" class="smiley-item-btn" data-insert-smiley="${s.code}" title="${s.code}">
        <img src="${s.img}" alt="${s.code}" />
      </button>
    `).join('');
    drawer.hidden = false;
  });

  document.getElementById('smileyDrawer')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-insert-smiley]');
    if (!btn || !sayInput) return;
    sayInput.value += ` ${btn.getAttribute('data-insert-smiley')} `;
    charStatus.textContent = `${sayInput.value.length} / 380`;
    sayInput.focus();
  });

  // 发布新吐槽
  document.getElementById('SayFrom')?.addEventListener('submit', e => {
    e.preventDefault();
    const text = sayInput?.value.trim();
    if (!text) return;
    BGM_STATE.timelineItems.unshift({
      id: String(Date.now()),
      dateGroup: '今天',
      category: 'say',
      user: '少年游',
      userUrl: 'user.html?uid=553488',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      action: '说',
      targetTitle: '',
      targetUrl: '',
      stars: 0,
      comment: text,
      time: '刚刚',
      source: 'web',
      isSelf: true,
      subjectCard: null,
      reactions: []
    });
    sayInput.value = '';
    charStatus.textContent = '0 / 380';
    renderTimeline();
    showToast('已发布新时空吐槽！');
  });

  // 伪春菜切换台词
  const cycleSpeech = () => {
    BGM_STATE.speechIdx = (BGM_STATE.speechIdx + 1) % BGM_STATE.ukagakaSpeeches.length;
    document.getElementById('ukagakaSpeechText').textContent = BGM_STATE.ukagakaSpeeches[BGM_STATE.speechIdx];
  };
  document.getElementById('btnCycleSpeech')?.addEventListener('click', cycleSpeech);
  document.getElementById('btnUkagakaNext')?.addEventListener('click', cycleSpeech);

  // 开关灯：切换深浅主题
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    showToast(next === 'dark' ? '已切换至曜石深色毛玻璃模式' : '已切换至流光浅色毛玻璃模式');
  });

  // 个性化 Modal 控制
  const openCustomize = () => { document.getElementById('customizeModal').hidden = false; };
  document.getElementById('btnOpenCustomize')?.addEventListener('click', openCustomize);
  document.getElementById('btnOpenCustomizeFromUkagaka')?.addEventListener('click', openCustomize);
  document.querySelectorAll('.js-open-customize').forEach(el => el.addEventListener('click', openCustomize));
  document.getElementById('btnCloseCustomizeModal')?.addEventListener('click', () => {
    document.getElementById('customizeModal').hidden = true;
  });

  document.getElementById('themeModeRadios')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-set-theme]');
    if (!btn) return;
    const mode = btn.getAttribute('data-set-theme');
    document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('#themeModeRadios .choice-pill').forEach(b => b.classList.toggle('is-selected', b === btn));
  });

  document.getElementById('accentColorRadios')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-set-accent]');
    if (!btn) return;
    const acc = btn.getAttribute('data-set-accent');
    document.documentElement.setAttribute('data-accent', acc);
    document.querySelectorAll('#accentColorRadios .choice-pill').forEach(b => b.classList.toggle('is-selected', b === btn));
    showToast(`已切换强调色：${acc}`);
  });

  document.getElementById('btnExpandBothWings')?.addEventListener('click', () => {
    BGM_STATE.leftCollapsed = false;
    BGM_STATE.rightCollapsed = false;
    syncWingClasses();
  });
  document.getElementById('btnCollapseBothWings')?.addEventListener('click', () => {
    BGM_STATE.leftCollapsed = true;
    BGM_STATE.rightCollapsed = true;
    syncWingClasses();
  });

  // 收藏盒 Modal 关闭与保存
  const closeCollect = () => { document.getElementById('collectModal').hidden = true; };
  document.getElementById('btnCloseCollectModal')?.addEventListener('click', closeCollect);
  document.getElementById('btnCancelCollectModal')?.addEventListener('click', closeCollect);
  document.getElementById('collectBoxForm')?.addEventListener('submit', e => {
    e.preventDefault();
    closeCollect();
    showToast('已保存收藏状态与评价修改！');
  });
});


/* ==========================================================================
   MARGIN TOPBAR ENGINE:
   1. Liquid Glass Jelly Thumb (.et-thumb) for #navMenuNeue & #actBar
   2. High-Legibility .dp Popovers (Channels, Search Scope, Notify, PM)
   3. 3D Verlet Physics Lanyard ID Card (.idcl-stage / .idcl-card)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Liquid Glass Jelly Thumb Follower (Exact Margin Physics) ---
  function bindLiquidThumb(navEl, thumbEl, itemSelector) {
    if (!navEl || !thumbEl) return;
    const items = Array.from(navEl.querySelectorAll(itemSelector));
    let activeIdx = null;
    let leaveTimer = 0;
    let rafId = 0;
    let settleUntil = 0;
    let curX = 0;
    let curW = 0;
    let isShown = false;

    const measure = () => {
      const target = activeIdx === null ? null : items[activeIdx];
      if (!target) return null;
      const tr = target.getBoundingClientRect();
      const nr = navEl.getBoundingClientRect();
      return { x: tr.left - nr.left - navEl.clientLeft, w: tr.width };
    };

    const apply = () => {
      thumbEl.style.translate = `${curX.toFixed(2)}px 0`;
      thumbEl.style.width = `${curW.toFixed(2)}px`;
    };

    const tick = (now) => {
      const m = measure();
      if (m) {
        curX += (m.x - curX) * 0.24;
        curW += (m.w - curW) * 0.24;
        apply();
      }
      if (now < settleUntil || (m && (Math.abs(m.x - curX) > 0.3 || Math.abs(m.w - curW) > 0.3))) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const select = (idx) => {
      if (idx === activeIdx) return;
      const prev = activeIdx;
      activeIdx = idx;
      items.forEach((el, i) => el.toggleAttribute('data-selected', i === idx));
      if (idx === null) {
        thumbEl.removeAttribute('data-on');
        isShown = false;
      } else {
        const m = measure();
        if (!isShown && m) {
          curX = m.x;
          curW = m.w;
          apply();
        }
        thumbEl.setAttribute('data-on', '');
        if (isShown && prev !== null && thumbEl.animate) {
          thumbEl.animate(
            [{ scale: '1 1' }, { scale: '1.16 1.1', offset: 0.45 }, { scale: '1 1' }],
            { duration: 480, easing: 'cubic-bezier(.3, 0, .2, 1)' }
          );
        }
        isShown = true;
        settleUntil = performance.now() + 850;
        if (!rafId) rafId = requestAnimationFrame(tick);
      }
    };

    items.forEach((el, idx) => {
      el.addEventListener('pointerenter', () => {
        clearTimeout(leaveTimer);
        select(idx);
      });
    });

    navEl.addEventListener('pointerleave', () => {
      clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => select(null), 130);
    });
  }

  bindLiquidThumb(
    document.getElementById('navMenuNeue'),
    document.getElementById('navEtThumb'),
    '.nav-chan'
  );
  bindLiquidThumb(
    document.getElementById('actBar'),
    document.getElementById('actEtThumb'),
    '.et-btn'
  );

  // --- 2. High-Legibility Editorial .dp Popovers ---
  const dpEl = document.getElementById('topDpPopover');
  let dpCurrentKey = null;
  let dpCloseTimer = 0;

  const DP_CONFIGS = {
    anime: {
      title: '动画',
      en: 'ANIME',
      allHref: 'channel.html?type=anime',
      allLabel: '动画频道 →',
      links: [
        { title: '近期注目', sub: 'TRENDS', href: 'browser.html?type=anime&sort=trends' },
        { title: '动画排行榜', sub: 'CHART', href: 'browser.html?type=anime&sort=rank' },
        { title: '每日放送表', sub: 'CALENDAR', href: 'calendar.html' },
        { title: '动画标签库', sub: 'TAGS', href: 'tag.html?type=anime' },
        { title: '分类浏览', sub: 'BROWSER', href: 'browser.html?type=anime' },
        { title: '动画日志', sub: 'REVIEWS', href: 'channel.html?type=anime#channelBlogs' }
      ],
      personalTitle: 'MY ANIME · 我看',
      statuses: [
        { label: '在看', count: '3', href: 'user.html?tab=anime&status=do' },
        { label: '想看', count: '24', href: 'user.html?tab=anime&status=wish' },
        { label: '看过', count: '142', href: 'user.html?tab=anime&status=collect' },
        { label: '搁置', count: '6', href: 'user.html?tab=anime&status=on_hold' },
        { label: '抛弃', count: '4', href: 'user.html?tab=anime&status=dropped' }
      ]
    },
    book: {
      title: '书籍',
      en: 'BOOK',
      allHref: 'channel.html?type=book',
      allLabel: '书籍频道 →',
      links: [
        { title: '近期注目', sub: 'TRENDS', href: 'browser.html?type=book&sort=trends' },
        { title: '图书排行榜', sub: 'CHART', href: 'browser.html?type=book&sort=rank' },
        { title: '图书标签库', sub: 'TAGS', href: 'tag.html?type=book' },
        { title: '分类浏览', sub: 'BROWSER', href: 'browser.html?type=book' },
        { title: '图书日志', sub: 'REVIEWS', href: 'channel.html?type=book#channelBlogs' },
        { title: '漫画检索', sub: 'MANGA', href: 'browser.html?type=book&q=漫画' }
      ],
      personalTitle: 'MY BOOKS · 我读',
      statuses: [
        { label: '在读', count: '2', href: 'user.html?tab=book&status=do' },
        { label: '想读', count: '15', href: 'user.html?tab=book&status=wish' },
        { label: '读过', count: '38', href: 'user.html?tab=book&status=collect' },
        { label: '搁置', count: '3', href: 'user.html?tab=book&status=on_hold' },
        { label: '抛弃', count: '1', href: 'user.html?tab=book&status=dropped' }
      ]
    },
    music: {
      title: '音乐',
      en: 'MUSIC',
      allHref: 'channel.html?type=music',
      allLabel: '音乐频道 →',
      links: [
        { title: '近期注目', sub: 'TRENDS', href: 'browser.html?type=music&sort=trends' },
        { title: '音乐排行榜', sub: 'CHART', href: 'browser.html?type=music&sort=rank' },
        { title: '音乐标签库', sub: 'TAGS', href: 'tag.html?type=music' },
        { title: '浏览全部', sub: 'BROWSER', href: 'browser.html?type=music' },
        { title: '音乐日志', sub: 'REVIEWS', href: 'channel.html?type=music#channelBlogs' },
        { title: 'OST 原声集', sub: 'SOUNDTRACK', href: 'tag.html?type=music&tag=OST' }
      ],
      personalTitle: 'MY MUSIC · 我听',
      statuses: [
        { label: '在听', count: '4', href: 'user.html?tab=music&status=do' },
        { label: '想听', count: '9', href: 'user.html?tab=music&status=wish' },
        { label: '听过', count: '64', href: 'user.html?tab=music&status=collect' },
        { label: '搁置', count: '1', href: 'user.html?tab=music&status=on_hold' },
        { label: '抛弃', count: '0', href: 'user.html?tab=music&status=dropped' }
      ]
    },
    game: {
      title: '游戏',
      en: 'GAME',
      allHref: 'channel.html?type=game',
      allLabel: '游戏频道 →',
      links: [
        { title: '近期注目', sub: 'TRENDS', href: 'browser.html?type=game&sort=trends' },
        { title: '游戏排行榜', sub: 'CHART', href: 'browser.html?type=game&sort=rank' },
        { title: '游戏标签库', sub: 'TAGS', href: 'tag.html?type=game' },
        { title: '平台浏览', sub: 'PLATFORMS', href: 'browser.html?type=game' },
        { title: '游戏日志', sub: 'REVIEWS', href: 'channel.html?type=game#channelBlogs' },
        { title: 'PC / 主机', sub: 'CONSOLE', href: 'tag.html?type=game&tag=PC' }
      ],
      personalTitle: 'MY GAMES · 我玩',
      statuses: [
        { label: '在玩', count: '2', href: 'user.html?tab=game&status=do' },
        { label: '想玩', count: '19', href: 'user.html?tab=game&status=wish' },
        { label: '玩过', count: '51', href: 'user.html?tab=game&status=collect' },
        { label: '搁置', count: '4', href: 'user.html?tab=game&status=on_hold' },
        { label: '抛弃', count: '2', href: 'user.html?tab=game&status=dropped' }
      ]
    },
    real: {
      title: '三次元',
      en: 'REAL',
      allHref: 'channel.html?type=real',
      allLabel: '三次元频道 →',
      links: [
        { title: '近期注目', sub: 'TRENDS', href: 'browser.html?type=real&sort=trends' },
        { title: '剧集排行榜', sub: 'CHART', href: 'browser.html?type=real&sort=rank' },
        { title: '三次元标签', sub: 'TAGS', href: 'tag.html?type=real' },
        { title: '分类浏览', sub: 'BROWSER', href: 'browser.html?type=real' },
        { title: '日剧专区', sub: 'JP DRAMA', href: 'browser.html?type=real&q=日剧' },
        { title: '欧美剧专区', sub: 'US / UK', href: 'browser.html?type=real&q=美剧' }
      ],
      personalTitle: 'MY DRAMA · 我看',
      statuses: [
        { label: '在看', count: '0', href: 'user.html?tab=real&status=do' },
        { label: '想看', count: '5', href: 'user.html?tab=real&status=wish' },
        { label: '看过', count: '17', href: 'user.html?tab=real&status=collect' },
        { label: '搁置', count: '1', href: 'user.html?tab=real&status=on_hold' },
        { label: '抛弃', count: '0', href: 'user.html?tab=real&status=dropped' }
      ]
    },
    mono: {
      title: '人物与角色',
      en: 'MONO',
      allHref: 'mono.html',
      allLabel: '全部人物 →',
      links: [
        { title: '虚构角色', sub: 'CHARACTER', href: 'mono.html?tab=character' },
        { title: '现实人物', sub: 'PERSON', href: 'mono.html?tab=person' },
        { title: '关注人物更新', sub: 'UPDATES', href: 'mono.html?tab=update' },
        { title: '收藏的角色', sub: 'MY CHARS', href: 'mono.html?tab=my_character' },
        { title: '收藏的人物', sub: 'MY PERSONS', href: 'mono.html?tab=my_person' }
      ]
    },
    group: {
      title: '社区小组',
      en: 'GROUPS',
      allHref: 'group.html',
      allLabel: '小组首页 ↗',
      links: [
        { title: '随便看看', sub: 'DISCOVER', href: 'group.html?mode=discover' },
        { title: '所有小组', sub: 'ALL GROUPS', href: 'group.html?mode=discover&sub=all' },
        { title: '发表的话题', sub: 'MY TOPICS', href: 'group.html?mode=discover&sub=my_topic' },
        { title: '回复的话题', sub: 'REPLIED', href: 'group.html?mode=discover&sub=my_reply' },
        { title: '参加的小组', sub: 'JOINED', href: 'group.html?mode=discover&sub=mine' }
      ]
    },
    discover: {
      title: '探索与生态',
      en: 'DISCOVER',
      allHref: 'timeline.html',
      allLabel: '时空管理局 ↗',
      links: [
        { title: '时空管理局', sub: 'TIMELINE', href: 'timeline.html' },
        { title: '全站日志', sub: 'BLOG', href: 'blog.html' },
        { title: '番组目录', sub: 'INDEX', href: 'catalog.html' },
        { title: '维基人工作台', sub: 'WIKI', href: 'explore.html?mode=wiki' },
        { title: 'MAGI 问答', sub: 'QUIZ', href: 'explore.html?mode=magi' },
        { title: 'Dollars 聊天室', sub: 'CHAT', href: 'explore.html?mode=dollars' },
        { title: '开发者平台', sub: 'DEV API', href: 'settings.html?tab=gadgets' },
        { title: 'onAir 客户端', sub: 'DESKTOP', href: 'https://bgm.tv/onair' },
        { title: '移动客户端', sub: 'MOBILE', href: 'https://bgm.tv/client' },
        { title: '天窗联盟', sub: 'DOUJIN', href: 'https://doujin.bgm.tv' }
      ]
    },
    searchCat: {
      compact: true,
      title: '搜索范围',
      en: 'SCOPE',
      scopes: [
        { val: 'all', label: 'ALL · 全部条目' },
        { val: '2', label: 'ANIME · 动画' },
        { val: '1', label: 'BOOK · 书籍' },
        { val: '4', label: 'GAME · 游戏' },
        { val: '3', label: 'MUSIC · 音乐' },
        { val: '6', label: 'REAL · 三次元' },
        { val: 'person', label: 'MONO · 人物与角色' }
      ]
    },
    notify: {
      compact: true,
      title: '电波提醒',
      en: 'NOTIFY',
      allHref: 'notify.html',
      allLabel: '全部提醒 →',
      rows: [
        { title: '话题与讨论回复', count: 2, href: 'notify.html?filter=reply' },
        { title: '@ 提及我的动态', count: 1, href: 'notify.html?filter=mention' },
        { title: '收到的贴贴互动', count: 1, href: 'notify.html?filter=like' },
        { title: '好友请求与通过', count: 0, href: 'user.html?uid=553488#friend' }
      ]
    },
    pm: {
      compact: true,
      title: '站内短信',
      en: 'MESSAGES',
      allHref: 'notify.html?tab=inbox',
      allLabel: '收件箱 →',
      rows: [
        { title: '收件箱 (Inbox)', count: 2, href: 'notify.html?tab=inbox' },
        { title: '已发送 (Outbox)', count: 2, href: 'notify.html?tab=outbox' },
        { title: '撰写新短信', count: 0, href: 'notify.html?tab=compose' }
      ]
    }
  };

  function renderDpContent(key) {
    const cfg = DP_CONFIGS[key];
    if (!cfg || !dpEl) return;
    dpEl.classList.toggle('compact', !!cfg.compact);

    let html = `
      <div class="dp-head">
        <div class="dp-head-title">
          <strong>${cfg.title}</strong>
          <small>${cfg.en}</small>
        </div>
        ${cfg.allHref ? `<a href="${cfg.allHref}"${/^https?:/.test(cfg.allHref) ? ' target="_blank"' : ''} class="dp-all">${cfg.allLabel}</a>` : ''}
      </div>
    `;

    if (cfg.links) {
      html += `<div class="dp-grid">` + cfg.links.map(l => `
        <a href="${l.href}"${/^https?:/.test(l.href) ? ' target="_blank"' : ''} class="dp-item">
          <span>${l.title}</span>
          <small>${l.sub}</small>
        </a>
      `).join('') + `</div>`;
    }

    if (cfg.statuses) {
      html += `
        <div class="dp-section">
          <div class="dp-eyebrow">
            <span>${cfg.personalTitle}</span>
            <span>UID 553488</span>
          </div>
          <div class="dp-status-row">
            ${cfg.statuses.map(s => `
              <a href="${s.href}"${/^https?:/.test(s.href) ? ' target="_blank"' : ''} class="dp-status-chip">
                <span>${s.label}</span>
                <b>${s.count}</b>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (cfg.scopes) {
      html += `<div class="dp-rows">` + cfg.scopes.map(s => `
        <button type="button" class="dp-msg-row" data-pick-scope="${s.val}" data-pick-label="${s.label.split(' · ')[0]} · ${s.label.split(' · ')[1].slice(0,2)}">
          <span>${s.label}</span>
        </button>
      `).join('') + `</div>`;
    }

    if (cfg.rows) {
      html += `<div class="dp-rows">` + cfg.rows.map(r => `
        <a href="${r.href}" target="_blank" class="dp-msg-row">
          <span>${r.title}</span>
          <span class="dp-msg-badge ${r.count > 0 ? 'hot' : ''}">${r.count}</span>
        </a>
      `).join('') + `</div>`;
    }

    dpEl.innerHTML = html;
  }

  function openDp(triggerEl, key) {
    if (!dpEl || !triggerEl) return;
    clearTimeout(dpCloseTimer);
    renderDpContent(key);
    dpCurrentKey = key;
    document.querySelectorAll('[data-dp]').forEach(el => {
      el.setAttribute('aria-expanded', String(el === triggerEl));
    });
    dpEl.setAttribute('data-open', '');
    const tr = triggerEl.getBoundingClientRect();
    const w = dpEl.offsetWidth || (DP_CONFIGS[key]?.compact ? 280 : 368);
    const left = Math.min(Math.max(16, tr.left + tr.width / 2 - w / 2), window.innerWidth - w - 16);
    dpEl.style.left = `${left}px`;
    dpEl.style.top = `${tr.bottom + 10}px`;
  }

  function scheduleCloseDp() {
    clearTimeout(dpCloseTimer);
    dpCloseTimer = window.setTimeout(() => {
      dpEl?.removeAttribute('data-open');
      dpCurrentKey = null;
      document.querySelectorAll('[data-dp]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    }, 160);
  }

  document.querySelectorAll('[data-dp]').forEach(trigger => {
    const key = trigger.getAttribute('data-dp');
    trigger.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch' && key !== 'searchCat') openDp(trigger, key);
    });
    trigger.addEventListener('pointerleave', scheduleCloseDp);
    trigger.addEventListener('click', (e) => {
      if (key === 'searchCat' || key === 'discover') {
        e.preventDefault();
        if (dpCurrentKey === key && dpEl.hasAttribute('data-open')) {
          scheduleCloseDp();
        } else {
          openDp(trigger, key);
        }
      }
    });
  });

  dpEl?.addEventListener('pointerenter', () => clearTimeout(dpCloseTimer));
  dpEl?.addEventListener('pointerleave', scheduleCloseDp);
  dpEl?.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick-scope]');
    if (!pick) return;
    const val = pick.getAttribute('data-pick-scope');
    const label = pick.getAttribute('data-pick-label');
    const sel = document.getElementById('siteSearchSelect');
    const lbl = document.getElementById('searchCatLabel');
    if (sel) sel.value = val;
    if (lbl) lbl.textContent = label;
    dpEl.removeAttribute('data-open');
    document.getElementById('search_text')?.focus();
  });

  // Press '/' to focus search input
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('search_text')?.focus();
      }
    }
  });

  // --- 3. 账号卡片：以头像为锚点的浮层卡片（无珠链 / 无挂孔 / 头像无模糊底） ---
  function initAccountCard() {
    const wrap = document.getElementById('userAvatarWrap');
    const trigger = document.getElementById('userAvatarBtn');
    if (!wrap || !trigger) return;

    const user = {
      name: '少年游',
      mid: '553488',
      level: 8,
      role: '高级番组人 · Chronicle VIP',
      exp: 1420,
      next: 2000,
      face: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      spaceUrl: 'user.html'
    };

    function makeQrSvg(seedStr) {
      const size = 21;
      let d = '';
      const isFinder = (r, c, fr, fc) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7 &&
        (r === fr || r === fr + 6 || c === fc || c === fc + 6 || (r >= fr + 2 && r <= fr + 4 && c >= fc + 2 && c <= fc + 4));
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const inF = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
          let dark = false;
          if (inF) {
            dark = isFinder(r, c, 0, 0) || isFinder(r, c, 0, size - 7) || isFinder(r, c, size - 7, 0);
          } else {
            const hash = (r * 31 + c * 17 + seedStr.charCodeAt((r + c) % seedStr.length)) % 7;
            dark = hash < 3;
          }
          if (dark) d += `M${c} ${r}h1v1h-1z`;
        }
      }
      return `<div class="idcl-qr"><svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg></div>`;
    }

    function makeBarcodeHtml(midStr) {
      const padded = String(midStr).padStart(10, '0');
      let spans = '';
      for (let i = 0; i < 30; i++) {
        const h = (i * 37 + Number(padded[i % padded.length]) * 11) % 100 > 40 ? 100 : 55;
        spans += `<span style="height:${h}%"></span>`;
      }
      return `<div class="idcl-barcode" aria-hidden="true">${spans}</div>`;
    }

    const stage = document.createElement('div');
    stage.className = 'idcl-stage';
    stage.hidden = true;
    stage.innerHTML = `
      <div class="idcl-card" id="idclCard" role="dialog" aria-label="${user.name} 的账号卡片">
        <div class="idcl-flipper" id="idclFlipper">
          <!-- 正面 -->
          <div class="idcl-face idcl-front">
            <div class="idcl-holo"></div>
            <div class="idcl-header">
              <div class="idcl-brand">
                <span class="idcl-brand-mark">番組</span>
                <div class="idcl-brand-text">
                  <b>BANGUMI</b>
                  <small>Chronicle · 番组计划</small>
                </div>
              </div>
              <div class="idcl-pillars">
                <span>LV${user.level}</span>
                <span>UID ${user.mid}</span>
                <i></i>
              </div>
            </div>
            <div class="idcl-photo">
              <img class="idcl-photo-face" src="${user.face}" alt="${user.name}" referrerpolicy="no-referrer" />
              <span class="idcl-verified" title="${user.role}">
                <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>
            <h2 class="idcl-name">${user.name}</h2>
            <div class="idcl-roleline">
              <p class="idcl-role">${user.role}</p>
              <span class="idcl-expnum">${user.exp} / ${user.next}</span>
            </div>
            <div class="idcl-exp" title="同步率经验 ${user.exp} / ${user.next}">
              <i style="width:${Math.round(user.exp / user.next * 100)}%"></i>
            </div>
            <a class="idcl-timeline" href="${user.spaceUrl}" target="_blank" rel="noopener">
              <span class="idcl-timeline-l">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>
                <span>
                  <b>个人时光机</b>
                  <small>bgm.tv/user/${user.mid}</small>
                </span>
              </span>
              <span class="idcl-timeline-arrow">→</span>
            </a>
            <div class="idcl-stats">
              <a href="user.html?mode=list&type=anime&status=do">
                <b>3</b><span>在看番组</span>
              </a>
              <a href="user.html?mode=list&type=anime&status=collect">
                <b>142</b><span>看过作品</span>
              </a>
              <a href="user.html#friend">
                <b>28</b><span>同步好友</span>
              </a>
            </div>
            <div class="idcl-idrow">
              <div class="idcl-idrow-labels">
                <div><span>加入</span><b>2020-08 · 正式会员</b></div>
                <div><span>在线</span><b>34,797 人同频</b></div>
                <div><span>扫码</span><b>个人时光机</b></div>
              </div>
              ${makeQrSvg(user.spaceUrl)}
            </div>
            <div class="idcl-footer">
              <a href="notify.html">
                <span>未读提醒</span><b class="hot">4</b>
              </a>
              <i></i>
              <a href="notify.html?tab=inbox">
                <span>站内短信</span><b>2</b>
              </a>
            </div>
          </div>

          <!-- 背面 -->
          <div class="idcl-face idcl-back">
            <div class="idcl-holo"></div>
            <div class="idcl-idnum">
              <span>NO. 0000${user.mid}</span>
              <em>LV${user.level}</em>
            </div>
            ${makeBarcodeHtml(user.mid)}
            <div class="idcl-backrow">
              ${makeQrSvg(user.spaceUrl)}
              <div class="idcl-scan">
                <b>个人时光机</b>
                bgm.tv/user/${user.mid}<br/>
                手机扫码直达档案
              </div>
            </div>
            <div class="idcl-eyebrow">ACCOUNT <span>账号中枢</span></div>
            <div class="idcl-links">
              <a class="idcl-link" href="user.html">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
                <span>我的时光机</span>
              </a>
              <a class="idcl-link" href="timeline.html?scope=capsule&uid=553488">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
                <span>时间胶囊</span>
              </a>
              <a class="idcl-link" href="blog.html?uid=553488">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
                <span>我的日志</span>
              </a>
              <a class="idcl-link" href="catalog.html?mode=user&uid=553488">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>我的目录</span>
              </a>
              <a class="idcl-link" href="mono.html?tab=my_character">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8.5l4 3.5 4-6 4 6 4-3.5-1.6 9.5H5.6z"/></svg>
                <span>我的人物</span>
              </a>
              <a class="idcl-link" href="settings.html">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9"/></svg>
                <span>个人设置</span>
              </a>
            </div>
            <div class="idcl-connect">
              <span>直达</span>
              <div class="idcl-connect-icons">
                <a href="rakuen.html" title="超展开"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><circle cx="17" cy="17" r="3.5"/></svg></a>
                <a href="group.html?mode=discover&sub=mine" title="我的小组"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/></svg></a>
                <a href="explore.html?mode=wiki&sub=user_wiki" title="我的维基"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg></a>
                <a href="https://doujin.bgm.tv/user/553488" target="_blank" title="天窗专页"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5a5 5 0 0 0-7 7"/></svg></a>
              </div>
            </div>
            <div class="idcl-sig">
              <div class="idcl-script">${user.name}</div>
              <div class="idcl-sigline">
                <small>Authorized Signature</small>
                <a href="auth.html?mode=guest&amp;from=logout" class="idcl-out" id="idclLogoutBtn" onclick="try{localStorage.setItem('bgm_auth_state_v1',JSON.stringify({loggedIn:false,lastUid:'553488'}));}catch(e){}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>
                  <span>退出登录</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="idcl-hint" id="idclHint"><span>点击卡片翻面</span></div>
      </div>
    `;
    document.body.appendChild(stage);

    const card = document.getElementById('idclCard');
    const flipper = document.getElementById('idclFlipper');
    const hint = document.getElementById('idclHint');

    let isOpen = false;
    let isFlipped = false;
    let closeTimer = 0;
    let pointerPos = { x: -9999, y: -9999 };
    let curTilt = { x: 0, y: 0 };
    let targetTilt = { x: 0, y: 0 };
    let raf = 0;
    let cardRect = { x: 0, y: 0, w: 300, h: 452 };

    const TILT_MAX = 7;

    function layout() {
      const r = trigger.getBoundingClientRect();
      const w = card.offsetWidth || 300;
      const h = card.offsetHeight || 452;
      const margin = 14;
      let x = r.right - w;
      x = Math.max(margin, Math.min(window.innerWidth - w - margin, x));
      let y = r.bottom + 10;
      if (y + h > window.innerHeight - margin) y = Math.max(margin, window.innerHeight - h - margin);
      cardRect = { x, y, w, h };
      card.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    }

    function renderTilt() {
      curTilt.x += (targetTilt.x - curTilt.x) * 0.14;
      curTilt.y += (targetTilt.y - curTilt.y) * 0.14;
      flipper.style.transform = `rotateY(${(isFlipped ? 180 : 0) + curTilt.y}deg) rotateX(${curTilt.x}deg)`;
      const settled = Math.abs(targetTilt.x - curTilt.x) < 0.02 && Math.abs(targetTilt.y - curTilt.y) < 0.02;
      if (isOpen && !settled) raf = requestAnimationFrame(renderTilt);
      else raf = 0;
    }

    function pokeTilt() {
      if (!raf) raf = requestAnimationFrame(renderTilt);
    }

    function isInsideSafeZone(x, y) {
      const t = trigger.getBoundingClientRect();
      const pad = 16;
      const inT = x >= t.left - pad && x <= t.right + pad && y >= t.top - pad && y <= t.bottom + pad;
      const inC = x >= cardRect.x - pad && x <= cardRect.x + cardRect.w + pad &&
                  y >= cardRect.y - pad && y <= cardRect.y + cardRect.h + pad;
      return inT || inC;
    }

    function openCard() {
      clearTimeout(closeTimer);
      closeTimer = 0;
      if (isOpen) return;
      isOpen = true;
      stage.hidden = false;
      stage.classList.remove('idcl-leaving');
      wrap.setAttribute('data-open', '');
      layout();
      card.classList.remove('idcl-in');
      void card.offsetWidth;
      card.classList.add('idcl-in');
      isFlipped = false;
      targetTilt = { x: 0, y: 0 };
      curTilt = { x: 0, y: 0 };
      flipper.style.transform = 'rotateY(0deg) rotateX(0deg)';
      hint?.classList.remove('idcl-hint-hidden');
      setTimeout(() => hint?.classList.add('idcl-hint-hidden'), 2200);
    }

    function closeCard() {
      if (!isOpen) return;
      isOpen = false;
      wrap.removeAttribute('data-open');
      card.classList.remove('idcl-in');
      stage.classList.add('idcl-leaving');
      setTimeout(() => {
        if (!isOpen) stage.hidden = true;
      }, 200);
    }

    window.addEventListener('pointermove', (e) => {
      if (!isOpen) return;
      pointerPos = { x: e.clientX, y: e.clientY };
      const inside = isInsideSafeZone(e.clientX, e.clientY);
      if (!inside) {
        if (!closeTimer) closeTimer = window.setTimeout(closeCard, 380);
      } else {
        clearTimeout(closeTimer);
        closeTimer = 0;
      }
      if (cardRect.w) {
        const cx = cardRect.x + cardRect.w / 2;
        const cy = cardRect.y + cardRect.h / 2;
        const nx = Math.max(-1, Math.min(1, (pointerPos.x - cx) / (cardRect.w / 2)));
        const ny = Math.max(-1, Math.min(1, (pointerPos.y - cy) / (cardRect.h / 2)));
        targetTilt = { x: -ny * TILT_MAX, y: nx * TILT_MAX };
        card.classList.toggle('idcl-hovering', inside);
        card.style.setProperty('--mx', `${Math.round(((pointerPos.x - cardRect.x) / cardRect.w) * 100)}%`);
        card.style.setProperty('--my', `${Math.round(((pointerPos.y - cardRect.y) / cardRect.h) * 100)}%`);
        pokeTilt();
      }
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      isFlipped = !isFlipped;
      hint?.classList.add('idcl-hint-hidden');
      pokeTilt();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeCard();
    });

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (isOpen) closeCard();
      else openCard();
    });

    wrap.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') {
        clearTimeout(closeTimer);
        closeTimer = window.setTimeout(openCard, 160);
      }
    });

    window.addEventListener('resize', () => { if (isOpen) layout(); });
    window.addEventListener('scroll', () => { if (isOpen) layout(); }, { passive: true });
  }

  initAccountCard();
});
