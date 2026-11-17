/**
 * Bangumi Redesign — Ranking & Category Browser (Page 14: /{type}/browser)
 * 职责：
 * 1. 五大频道（动画/书籍/音乐/游戏/三次元）全适配，读取真实抓取的 120 条榜单数据
 * 2. 频道切换胶囊 + 殿堂前三甲领奖台 + 全站评分透视一致性（传统 10 星 + 数字）
 * 3. 排序（排名/热度/收藏/日期/名称）、三视图（列表/精简/网格）、榜内检索、分页
 * 4. 右侧多维分类筛选（形式/来源/类型/地区/受众/年代/拼音/年月查询）+ 面包屑与重置
 * 5. 收藏五态（看/读/听/玩 动词随频道自适应）+ 玻璃 Toast + 日夜主题切换
 * 6. 与 index.html / subject.html / user.html 全局互联（URL ?type= 频道直达）
 */
(function () {
  'use strict';

  /* ============================ 常量与配置 ============================ */

  const PAGE_SIZE = 8;
  const DATA = (window.BROWSER_RANK_DATA || {});

  // 五大频道元数据（动词 / 收藏五态 / 封面比例 / Kicker）
  const CHANNELS = {
    anime: {
      key: 'anime', label: '动画', icon: '📺', verb: '看', path: 'anime',
      title: '动画排行榜', kicker: '📊 ANIME RANKING / BROWSE',
      statuses: ['想看', '看过', '在看', '搁置', '抛弃'], square: false
    },
    book: {
      key: 'book', label: '书籍', icon: '📚', verb: '读', path: 'book',
      title: '书籍排行榜', kicker: '📚 BOOK RANKING / BROWSE',
      statuses: ['想读', '读过', '在读', '搁置', '抛弃'], square: false
    },
    music: {
      key: 'music', label: '音乐', icon: '🎵', verb: '听', path: 'music',
      title: '音乐排行榜', kicker: '🎵 MUSIC RANKING / BROWSE',
      statuses: ['想听', '听过', '在听', '搁置', '抛弃'], square: true
    },
    game: {
      key: 'game', label: '游戏', icon: '🎮', verb: '玩', path: 'game',
      title: '游戏排行榜', kicker: '🎮 GAME RANKING / BROWSE',
      statuses: ['想玩', '玩过', '在玩', '搁置', '抛弃'], square: false
    },
    real: {
      key: 'real', label: '三次元', icon: '🎬', verb: '看', path: 'real',
      title: '三次元影视排行榜', kicker: '🎬 REAL RANKING / BROWSE',
      statuses: ['想看', '看过', '在看', '搁置', '抛弃'], square: false
    }
  };

  const CHANNEL_ORDER = ['anime', 'book', 'music', 'game', 'real'];

  // 排序定义（对齐真实 div.filters：排名(focus)/热度/收藏/日期/名称）
  const SORTS = [
    { key: 'rank', label: '排名', icon: '🏆' },
    { key: 'trends', label: '热度', icon: '🔥' },
    { key: 'collects', label: '收藏', icon: '📌' },
    { key: 'date', label: '日期', icon: '📅' },
    { key: 'title', label: '名称', icon: '🔤' }
  ];

  // 三视图（对齐 ul#browserTypeSelector：精简/列表/网格）
  const VIEWS = [
    { key: 'compact', label: '精简', mode: 'mode-compact', icon: '☰' },
    { key: 'full', label: '列表', mode: '', icon: '▤' },
    { key: 'grid', label: '网格', mode: 'mode-grid', icon: '▦' }
  ];

  // 各频道的多维筛选组（尽量对齐真实 ul.grouped facet 结构）
  const FACET_DEFS = {
    anime: [
      { key: 'form', title: '作品形式', icon: '🎞️', values: ['全部', 'TV', 'WEB', 'OVA', '剧场版', '动态漫画', '其他'] },
      { key: 'source', title: '改编来源', icon: '📖', values: ['全部', '原创', '漫画改', '游戏改', '小说改', '动画改', '影视改'] },
      { key: 'genre', title: '类型标签', icon: '🏷️', values: ['全部', '科幻', '喜剧', '校园', '机战', '悬疑', '恋爱', '奇幻', '推理', '运动', '音乐', '战斗', '冒险', '萌系', '历史', '日常', '剧情', '武侠', '治愈', '热血', '美食', '职场', '穿越', '玄幻', '恐怖', '百合', '耽美'] },
      { key: 'region', title: '地区', icon: '🌏', values: ['全部', '日本', '欧美', '中国', '美国', '韩国', '法国', '英国', '中国香港', '中国台湾'] },
      { key: 'audience', title: '受众', icon: '👥', values: ['全部', '子供向', '少年向', '少女向', '青年向', '女性向', 'BL', 'GL', '无CP'] }
    ],
    book: [
      { key: 'form', title: '书籍形态', icon: '📕', values: ['全部', '漫画', '小说', '画集', '文库', '杂志', '其他'] },
      { key: 'source', title: '作品来源', icon: '✍️', values: ['全部', '原创', '漫画改', '游戏改', '小说改', '动画改', '影视改'] },
      { key: 'genre', title: '题材标签', icon: '🏷️', values: ['全部', '热血', '恋爱', '奇幻', '科幻', '推理', '悬疑', '历史', '日常', '治愈', '喜剧', '冒险', '运动', '校园', '耽美', '百合', '武侠', '恐怖', '美食', '职场', '剧情'] },
      { key: 'region', title: '地区', icon: '🌏', values: ['全部', '日本', '中国', '欧美', '韩国', '中国香港', '中国台湾', '法国', '英国'] },
      { key: 'audience', title: '受众', icon: '👥', values: ['全部', '少年向', '少女向', '青年向', '女性向', '子供向', 'BL', 'GL', '无CP'] }
    ],
    music: [
      { key: 'form', title: '唱片形态', icon: '💿', values: ['全部', '原声集', '专辑', '单曲', '精选', '广播剧', '其他'] },
      { key: 'source', title: '关联作品', icon: '🎼', values: ['全部', '动画', '游戏', '影视', '独立', '同人', 'VOCALOID'] },
      { key: 'genre', title: '曲风标签', icon: '🏷️', values: ['全部', '管弦', '爵士', '电子', '摇滚', '钢琴', '和风', '氛围', '人声', 'ACG', '古典', '民族', '流行', '实验'] },
      { key: 'region', title: '地区', icon: '🌏', values: ['全部', '日本', '欧美', '中国', '韩国', '法国', '英国', '其他'] },
      { key: 'audience', title: '受众', icon: '👥', values: ['全部', '大众', '核心向', '同人', '收藏向'] }
    ],
    game: [
      { key: 'form', title: '游戏载体', icon: '🕹️', values: ['全部', 'PC', 'PS5', 'Xbox', 'Switch', '手机', '掌机', '街机'] },
      { key: 'source', title: '发行来源', icon: '📦', values: ['全部', '原创', '动漫改', '小说改', '影视改', '移植', '同人'] },
      { key: 'genre', title: '游戏类型', icon: '🏷️', values: ['全部', 'RPG', 'AVG', 'ACT', 'SLG', 'FPS', 'AAVG', 'CRPG', 'JRPG', 'Galgame', '解谜', '竞速', '模拟', '恐怖', '开放世界', ' Roguelike'] },
      { key: 'region', title: '开发地区', icon: '🌏', values: ['全部', '日本', '欧美', '中国', '韩国', '法国', '英国', '加拿大', '其他'] },
      { key: 'audience', title: '受众分级', icon: '👥', values: ['全部', '全年龄', 'R15', 'R18', '核心向', '休闲向'] }
    ],
    real: [
      { key: 'form', title: '影视形态', icon: '🎬', values: ['全部', '电视剧', '电影', '纪录片', '动画剧', '特别篇', '综艺', '其他'] },
      { key: 'source', title: '改编来源', icon: '📖', values: ['全部', '原创', '漫画改', '游戏改', '小说改', '真实事件', '舞台剧'] },
      { key: 'genre', title: '题材标签', icon: '🏷️', values: ['全部', '剧情', '喜剧', '悬疑', '推理', '恋爱', '历史', '职场', '医疗', '法律', '科幻', '恐怖', '家庭', '战争', '美食', '传记', '犯罪', '政治'] },
      { key: 'region', title: '地区', icon: '🌏', values: ['全部', '日本', '中国', '美国', '英国', '韩国', '法国', '中国香港', '中国台湾', '苏联'] },
      { key: 'audience', title: '受众', icon: '👥', values: ['全部', '全年龄', '青年向', '成人向', '合家欢'] }
    ]
  };

  const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const MONTHS = ['全部月份', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

  /* ============================ 运行时状态 ============================ */

  const state = {
    type: 'anime',
    sort: 'rank',
    view: 'full',
    page: 1,
    query: '',
    facets: {},                 // { groupKey: value } —— 值为 '全部' 时不写入
    collected: loadCollected()  // { id: statusString }
  };

  // 支持 browser.html?type=book 频道直达（全局互联）
  try {
    const p = new URLSearchParams(location.search).get('type');
    if (p && CHANNELS[p]) state.type = p;
  } catch (e) { /* file:// 兼容 */ }

  function loadCollected() {
    try { return JSON.parse(localStorage.getItem('bgm-browser-collect') || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveCollected() {
    try { localStorage.setItem('bgm-browser-collect', JSON.stringify(state.collected)); }
    catch (e) { /* 忽略：无持久化权限时仍可内存运行 */ }
  }

  /* ============================ 通用工具 ============================ */

  function decodeEntities(s) {
    return String(s == null ? '' : s)
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  }
  function esc(s) {
    return decodeEntities(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function $(id) { return document.getElementById(id); }

  // 传统 10 颗星 + 数字（用户 m01337 指令；沿用 bangumi-user.js renderTenStars 范式）
  function tenStars(score) {
    const val = Number(score) || 0;
    const n = Math.max(0, Math.min(10, Math.round(val)));
    return '<span class="rate-ten-stars" title="' + n + ' 星评价">'
      + '<span class="stars-filled">' + '★'.repeat(n) + '</span>'
      + '<span class="stars-empty">' + '☆'.repeat(10 - n) + '</span>'
      + '</span>'
      + '<span class="rate-score-num">' + val.toFixed(1) + '</span>';
  }

  function coverHtml(item, ch, cls) {
    const square = ch.square ? ' is-music-square' : '';
    if (item.cover) {
      return '<img class="' + cls + '" src="' + esc(item.cover)
        + '" alt="' + esc(item.title) + '" loading="lazy" referrerpolicy="no-referrer" />';
    }
    // 真实缺失封面的 3 个游戏条目：优雅占位（首字母 + 频道色）
    const letter = decodeEntities(item.title || '?').trim().charAt(0) || '?';
    return '<div class="' + cls + '" style="width:100%;height:100%;display:flex;align-items:center;'
      + 'justify-content:center;background:linear-gradient(135deg,var(--accent-faint),var(--surface));'
      + 'color:var(--accent);font-family:var(--serif);font-size:34px;font-style:italic;">'
      + esc(letter) + '</div>';
  }

  function extractYear(info) {
    const m = decodeEntities(info || '').match(/(19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : null;
  }
  function alphaOf(item) {
    const o = decodeEntities(item.orig || '').trim();
    const t = decodeEntities(item.title || '').trim();
    let c = '';
    for (const s of [o, t]) {
      if (s) { const ch = s[0].toUpperCase(); if (/[A-Z]/.test(ch)) { c = ch; break; } }
    }
    if (!c) {
      let h = 0; const id = String(item.id);
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      c = String.fromCharCode(65 + (h % 26));
    }
    return c;
  }
  // 确定性分桶：让每个 facet pill 真实改变结果集（原型演示用，可复现）
  function bucketOf(item, key, value) {
    if (value === '全部') return true;
    const seed = String(item.id) + '|' + key + '|' + value;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return (h % 100) < 46;
  }

  /* ============================ 数据过滤 / 排序 / 分页 ============================ */

  function getChannelItems() { return (DATA[state.type] || []).slice(); }

  function getFiltered() {
    const defs = FACET_DEFS[state.type] || [];
    const bucketKeys = defs.map(d => d.key);
    let list = getChannelItems().filter(item => {
      if (state.query) {
        const q = state.query.toLowerCase();
        const hay = (decodeEntities(item.title) + ' ' + decodeEntities(item.orig)
          + ' ' + decodeEntities(item.info)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (state.facets.year) {
        const y = extractYear(item.info);
        if (state.facets.year === 'past') { if (!y || y >= 2017) return false; }
        else if (String(y) !== state.facets.year) return false;
      }
      if (state.facets.alpha && alphaOf(item) !== state.facets.alpha) return false;
      for (const k of bucketKeys) {
        if (state.facets[k] && !bucketOf(item, k, state.facets[k])) return false;
      }
      return true;
    });

    const cmp = {
      rank: (a, b) => a.rank - b.rank,
      trends: (a, b) => (b.votes - a.votes) || (a.rank - b.rank),
      collects: (a, b) => (b.votes - a.votes) || (String(a.id).localeCompare(String(b.id))),
      date: (a, b) => ((extractYear(b.info) || 0) - (extractYear(a.info) || 0)) || (a.rank - b.rank),
      title: (a, b) => decodeEntities(a.title).localeCompare(decodeEntities(b.title), 'zh-Hans-CN')
    }[state.sort] || ((a, b) => a.rank - b.rank);
    list.sort(cmp);
    return list;
  }

  function pageCount(total) { return Math.max(1, Math.ceil(total / PAGE_SIZE)); }
  function pageSlice(list) {
    const pages = pageCount(list.length);
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }

  /* ============================ 渲染：英雄顶栏 ============================ */

  function renderHero() {
    const ch = CHANNELS[state.type];
    $('browserKickerBadge').textContent = ch.kicker;
    $('browserKickerSub').textContent = 'bgm.tv / ' + ch.path + ' / browser?sort=' + state.sort;
    $('browserMainTitle').innerHTML = esc(ch.title)
      + ' <small>Ranking &amp; Category Browser</small>';

    // 顶栏背景：当前频道榜首封面（真实图片，低透明度模糊）
    const top = getChannelItems().slice().sort((a, b) => a.rank - b.rank)[0];
    const bd = $('browserHeroBackdrop');
    if (top && top.cover) bd.style.backgroundImage = 'url("' + top.cover + '")';
    else bd.style.backgroundImage = 'none';

    // 五大频道切换胶囊
    $('channelSwitcher').innerHTML = CHANNEL_ORDER.map(k => {
      const c = CHANNELS[k];
      const n = (DATA[k] || []).length;
      return '<button type="button" class="channel-pill-btn' + (k === state.type ? ' active' : '')
        + '" data-channel="' + k + '" role="tab" aria-selected="' + (k === state.type) + '">'
        + c.icon + ' ' + esc(c.label)
        + '<span class="channel-pill-count">' + n + '</span></button>';
    }).join('');

    // 顶栏 data-br-type 链接高亮同步
    document.querySelectorAll('[data-br-type]').forEach(a => {
      const on = a.getAttribute('data-br-type') === state.type;
      a.style.background = on ? 'var(--accent-faint)' : '';
      a.style.color = on ? 'var(--accent)' : '';
      a.style.fontWeight = on ? '700' : '';
    });
  }

  function renderActiveFacets() {
    const ch = CHANNELS[state.type];
    const defs = FACET_DEFS[state.type] || [];
    let html = '<span class="facet-breadcrumb-label">CURRENT VIEW</span>';
    html += '<span class="active-facet-chip">' + ch.icon + ' ' + esc(ch.label) + ' <em>频道</em></span>';
    const s = SORTS.find(x => x.key === state.sort);
    if (s && s.key !== 'rank') html += '<span class="active-facet-chip">' + s.icon + ' ' + esc(s.label) + ' <em>排序</em></span>';
    if (state.query) html += '<span class="active-facet-chip">🔎 ' + esc(state.query) + ' <em>检索</em></span>';
    for (const d of defs) {
      if (state.facets[d.key]) html += '<span class="active-facet-chip">' + esc(d.title) + ' <em>' + esc(state.facets[d.key]) + '</em></span>';
    }
    if (state.facets.year) html += '<span class="active-facet-chip">📅 年代 <em>' + esc(state.facets.year === 'past' ? '往年们' : state.facets.year) + '</em></span>';
    if (state.facets.alpha) html += '<span class="active-facet-chip">🔤 拼音 <em>' + esc(state.facets.alpha) + '</em></span>';
    $('activeFacetsList').innerHTML = html;
  }

  /* ============================ 渲染：前三甲领奖台 ============================ */

  function renderPodium() {
    const ch = CHANNELS[state.type];
    const top3 = getChannelItems().slice().sort((a, b) => a.rank - b.rank).slice(0, 3);
    const crowns = ['👑 冠军', '🥈 亚军', '🥉 季军'];
    $('browserPodiumGrid').innerHTML = top3.map((it, i) => {
      const sq = ch.square ? ' is-music-square' : '';
      return '<a class="podium-card podium-rank-' + (i + 1) + '" href="subject.html?sid=' + esc(it.id) + '" title="查看条目详情">'
        + '<div class="podium-cover-wrap' + sq + '">'
        + '<span class="podium-crown-pill">' + crowns[i] + '</span>'
        + coverHtml(it, ch, 'podium-cover-img')
        + '</div>'
        + '<div class="podium-info">'
        + '<h4 class="podium-title">' + esc(it.title) + '</h4>'
        + '<div class="podium-orig">' + esc(it.orig || '—') + '</div>'
        + '<div class="podium-meta">Rank ' + it.rank + ' · ' + (it.votes || 0).toLocaleString() + ' 人评分</div>'
        + '<div class="podium-score-row">' + tenStars(it.score)
        + '<span class="rate-votes-tip">(' + (it.votes || 0).toLocaleString() + '人评分)</span></div>'
        + '</div></a>';
    }).join('');
    $('browserPodiumSection').style.display = top3.length ? '' : 'none';
  }

  /* ============================ 渲染：排序工具栏与视图切换 ============================ */

  function renderSortFilters() {
    const host = $('browserSortFilters');
    host.innerHTML = '<span class="sort-prefix-label">排序 :</span>'
      + SORTS.map(s => '<a href="javascript:void(0)" class="sort-pill-link'
        + (s.key === state.sort ? ' focus active' : '') + '" data-sort="' + s.key + '">'
        + s.icon + ' ' + esc(s.label) + '</a>').join('');
  }

  function renderTypeSelector() {
    $('browserTypeSelector').innerHTML = VIEWS.map(v =>
      '<li><button type="button" class="browser-type-btn' + (v.key === state.view ? ' active' : '')
      + '" data-view="' + v.key + '">' + v.icon + ' ' + esc(v.label) + '</button></li>').join('');
  }

  /* ============================ 渲染：排名条目卡片 ============================ */

  function subtypeChip(item, ch) {
    // 依据真实 info 首段派生一枚轻量副标题芯片（如 "26话" / "2017" / "TV"）
    const info = decodeEntities(item.info || '');
    const ep = info.match(/^\s*(\d+)\s*话/);
    if (ep) return ep[1] + ' 话';
    const yr = extractYear(info);
    if (yr) return String(yr);
    return ch.label;
  }

  function collectBlock(item, ch) {
    const st = state.collected[item.id];
    const minis = ch.statuses.map(s =>
      '<button type="button" class="collect-mini-btn' + (s === st ? ' active' : '')
      + '" data-set-status="' + esc(item.id) + '" data-status="' + esc(s) + '">' + esc(s) + '</button>').join('');
    if (st) {
      return '<div class="ranking-collect-block">'
        + '<button type="button" class="collect-trigger-btn is-collected" data-collect="' + esc(item.id) + '">✓ ' + esc(st) + '</button>'
        + '<div class="collect-quick-status-row">' + minis + '</div></div>';
    }
    return '<div class="ranking-collect-block">'
      + '<button type="button" class="collect-trigger-btn" data-collect="' + esc(item.id) + '">＋ ' + esc(ch.statuses[0]) + '</button>'
      + '<div class="collect-quick-status-row">' + minis + '</div></div>';
  }

  function rankingCard(item, ch) {
    const sq = ch.square ? ' is-music-square' : '';
    const topCls = item.rank <= 3 ? ' is-top-' + item.rank : '';
    const info = decodeEntities(item.info || '');
    // 轻量标签：从 info 中取 2~3 个分隔符片段
    const bits = info.split(/\s*\/\s*/).filter(Boolean).slice(1, 3);
    const tags = bits.map(b => '<span class="ranking-tag-pill">' + esc(b.length > 14 ? b.slice(0, 14) + '…' : b) + '</span>').join('');
    return '<li class="ranking-item-card" data-id="' + esc(item.id) + '">'
      + '<div class="rank-badge-col"><span class="rank-medal-pill' + topCls + '">'
      + '<small>Rank</small><strong>' + item.rank + '</strong></span></div>'
      + '<a class="ranking-cover-link' + sq + '" href="subject.html?sid=' + esc(item.id) + '" title="查看条目详情">'
      + coverHtml(item, ch, 'ranking-cover-img') + '</a>'
      + '<div class="ranking-item-inner">'
      + '<div class="ranking-title-row"><h3>'
      + '<a class="ranking-title-link" href="subject.html?sid=' + esc(item.id) + '">' + esc(item.title) + '</a>'
      + '<span class="ranking-orig-title">' + esc(item.orig || '') + '</span>'
      + '<span class="ranking-subtype-chip">' + esc(subtypeChip(item, ch)) + '</span>'
      + '</h3></div>'
      + '<p class="ranking-info-tip">' + esc(info) + '</p>'
      + '<div class="ranking-rate-row">' + tenStars(item.score)
      + '<span class="rate-votes-tip">(' + (item.votes || 0).toLocaleString() + '人评分)</span></div>'
      + (tags ? '<div class="ranking-tags-mini">' + tags + '</div>' : '')
      + '</div>'
      + collectBlock(item, ch)
      + '</li>';
  }

  function renderRankingList(filtered) {
    const ch = CHANNELS[state.type];
    const v = VIEWS.find(x => x.key === state.view) || VIEWS[1];
    const list = $('browserItemList');
    list.className = 'ranking-item-list' + (v.mode ? ' ' + v.mode : '');
    const slice = pageSlice(filtered);
    list.innerHTML = slice.length
      ? slice.map(it => rankingCard(it, ch)).join('')
      : '<li class="ranking-item-card" style="justify-content:center;padding:38px 20px;color:var(--muted);">'
        + '🔍 当前筛选条件下没有匹配条目，试试「↺ 重置全部筛选」吧</li>';
  }

  function renderPagination(total) {
    const pages = pageCount(total);
    $('multipageInfo').textContent = '第 ' + state.page + ' / ' + pages + ' 页 · 共 ' + total + ' 条';
    let html = '<button type="button" class="page-num-btn" data-page="' + (state.page - 1) + '"'
      + (state.page <= 1 ? ' disabled style="opacity:.4;cursor:not-allowed;"' : '') + '>‹</button>';
    for (let p = 1; p <= pages; p++) {
      html += '<button type="button" class="page-num-btn' + (p === state.page ? ' p_cur' : '')
        + '" data-page="' + p + '">' + p + '</button>';
    }
    html += '<button type="button" class="page-num-btn" data-page="' + (state.page + 1) + '"'
      + (state.page >= pages ? ' disabled style="opacity:.4;cursor:not-allowed;"' : '') + '>›</button>';
    $('pageNumsGroup').innerHTML = html;
    $('multipage').style.display = '';
  }

  /* ============================ 渲染：右侧多维筛选边栏 ============================ */

  function facetGroupBlock(def) {
    const cur = state.facets[def.key] || '全部';
    const pills = def.values.map(val =>
      '<li><button type="button" class="facet-pill-btn' + (val === cur ? ' focus active' : '')
      + '" data-group="' + def.key + '" data-value="' + esc(val) + '">' + esc(val) + '</button></li>').join('');
    return '<div class="facet-group-block">'
      + '<h4 class="facet-subtitle">' + def.icon + ' ' + esc(def.title)
      + ' <small>' + (cur === '全部' ? '全部' : '已选 · ' + esc(cur)) + '</small></h4>'
      + '<ul class="facet-grouped-list">' + pills + '</ul></div>';
  }

  function yearBlock() {
    const cur = state.facets.year || 'all';
    let btns = '<button type="button" class="season-mini-btn' + (cur === 'all' ? ' active' : '')
      + '" data-year="all">全部</button>';
    btns += YEARS.map(y => '<button type="button" class="season-mini-btn'
      + (cur === y ? ' active' : '') + '" data-year="' + y + '">' + y + '</button>').join('');
    btns += '<button type="button" class="season-mini-btn' + (cur === 'past' ? ' active' : '')
      + '" data-year="past">往年们</button>';
    const months = MONTHS.map((m, i) => '<option value="' + i + '">' + esc(m) + '</option>').join('');
    return '<div class="facet-group-block">'
      + '<h4 class="facet-subtitle">📅 放送 / 发行年代 <small>按 info 年份</small></h4>'
      + '<div class="airtime-season-row">' + btns + '</div>'
      + '<form class="airtime-search-form" id="airTimeSearchForm">'
      + '<input class="airtime-input-year" id="airtimeInputYear" type="text" inputmode="numeric" placeholder="年份" value="' + (/\d{4}/.test(cur) ? esc(cur) : '') + '" />'
      + '<select class="airtime-select-month" id="airtimeSelectMonth">' + months + '</select>'
      + '<button type="submit" class="airtime-submit-btn">Go</button>'
      + '</form></div>';
  }

  function alphaBlock() {
    const cur = state.facets.alpha || 'all';
    let cells = '<li><button type="button" class="alpha-cell-btn' + (cur === 'all' ? ' active' : '')
      + '" data-alpha="all">全</button></li>';
    cells += ALPHABET.map(a => '<li><button type="button" class="alpha-cell-btn'
      + (cur === a ? ' active' : '') + '" data-alpha="' + a + '">' + a + '</button></li>').join('');
    return '<div class="facet-group-block">'
      + '<h4 class="facet-subtitle">🔤 拼音首字母 <small>A ~ Z</small></h4>'
      + '<ul class="alpha-grid-list">' + cells + '</ul></div>';
  }

  function renderFacets(total) {
    const defs = FACET_DEFS[state.type] || [];
    $('facetGroupsHost').innerHTML = defs.map(facetGroupBlock).join('') + yearBlock() + alphaBlock();
    $('facetResultCount').textContent = '· ' + total + ' 条结果';
  }

  /* ============================ 总渲染入口 ============================ */

  function renderAll() {
    const filtered = getFiltered();
    renderHero();
    renderActiveFacets();
    renderPodium();
    renderSortFilters();
    renderTypeSelector();
    renderRankingList(filtered);
    renderPagination(filtered.length);
    renderFacets(filtered.length);
  }

  /* ============================ 交互 ============================ */

  function showToast(message, type) {
    const host = $('toastContainer');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'glass-toast' + (type === 'success' ? ' toast-success' : '');
    t.textContent = message;
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s ease'; }, 2400);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2800);
  }

  function switchChannel(k) {
    if (!CHANNELS[k] || k === state.type) return;
    state.type = k;
    state.page = 1;
    state.facets = {};
    state.query = '';
    const inline = $('browserInlineSearch'); if (inline) inline.value = '';
    try {
      const u = new URL(location.href);
      u.searchParams.set('type', k);
      history.replaceState(null, '', u.toString());
    } catch (e) { /* file:// 兼容 */ }
    renderAll();
    showToast('已切换到「' + CHANNELS[k].label + '」频道 · ' + (DATA[k] || []).length + ' 条真实榜单');
  }

  function setFacet(group, value) {
    if (value === '全部' || value === 'all') delete state.facets[group];
    else state.facets[group] = value;
    state.page = 1;
    renderAll();
  }

  function resetAll() {
    state.facets = {};
    state.query = '';
    state.sort = 'rank';
    state.page = 1;
    const inline = $('browserInlineSearch'); if (inline) inline.value = '';
    renderAll();
    showToast('已重置全部筛选 · 恢复默认排名榜', 'success');
  }

  function setCollect(id, status) {
    if (!status) { delete state.collected[id]; }
    else state.collected[id] = status;
    saveCollected();
    renderAll();
    const ch = CHANNELS[state.type];
    showToast(status ? ('✓ 已标记为「' + status + '」· ' + ch.label) : '已取消收藏', 'success');
  }

  function initEvents() {
    // —— 全局事件委托（重渲染后依然有效）——
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-channel],[data-sort],[data-view],[data-group],'
        + '[data-year],[data-alpha],[data-collect],[data-set-status],[data-page],#resetFacetsBtn');
      if (!t) return;

      if (t.id === 'resetFacetsBtn') { e.preventDefault(); resetAll(); return; }
      if (t.hasAttribute('data-channel')) { e.preventDefault(); switchChannel(t.getAttribute('data-channel')); return; }
      if (t.hasAttribute('data-sort')) {
        e.preventDefault(); state.sort = t.getAttribute('data-sort'); state.page = 1; renderAll(); return;
      }
      if (t.hasAttribute('data-view')) {
        e.preventDefault(); state.view = t.getAttribute('data-view'); renderAll(); return;
      }
      if (t.hasAttribute('data-group')) {
        e.preventDefault(); setFacet(t.getAttribute('data-group'), t.getAttribute('data-value')); return;
      }
      if (t.hasAttribute('data-year')) {
        e.preventDefault(); setFacet('year', t.getAttribute('data-year')); return;
      }
      if (t.hasAttribute('data-alpha')) {
        e.preventDefault(); setFacet('alpha', t.getAttribute('data-alpha')); return;
      }
      if (t.hasAttribute('data-set-status')) {
        e.preventDefault(); setCollect(t.getAttribute('data-set-status'), t.getAttribute('data-status')); return;
      }
      if (t.hasAttribute('data-collect')) {
        e.preventDefault();
        const id = t.getAttribute('data-collect');
        const ch = CHANNELS[state.type];
        if (state.collected[id]) setCollect(id, null);
        else setCollect(id, ch.statuses[0]);
        return;
      }
      if (t.hasAttribute('data-page')) {
        e.preventDefault();
        if (t.disabled) return;
        const p = parseInt(t.getAttribute('data-page'), 10);
        const filtered = getFiltered();
        const pages = pageCount(filtered.length);
        if (p >= 1 && p <= pages) {
          state.page = p; renderAll();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
    });

    // —— 榜内检索 ——
    const inline = $('browserInlineSearch');
    if (inline) inline.addEventListener('input', () => {
      state.query = inline.value.trim(); state.page = 1; renderAll();
    });

    // —— 顶栏搜索框：同步到榜内检索 ——
    const headerForm = $('headerSearch');
    if (headerForm) headerForm.addEventListener('submit', ev => {
      ev.preventDefault();
      const inp = headerForm.querySelector('input[type="search"]');
      if (inp && inp.value.trim()) {
        state.query = inp.value.trim(); state.page = 1;
        if (inline) inline.value = state.query;
        renderAll();
        showToast('榜内检索：' + state.query);
      }
    });

    // —— 年月查询表单（委托，因节点会被重渲染）——
    document.addEventListener('submit', ev => {
      if (ev.target && ev.target.id === 'airTimeSearchForm') {
        ev.preventDefault();
        const y = (ev.target.querySelector('#airtimeInputYear') || {}).value || '';
        const m = (ev.target.querySelector('#airtimeSelectMonth') || {}).value || '0';
        const yNum = y.replace(/\D/g, '').slice(0, 4);
        if (yNum.length === 4) {
          setFacet('year', yNum);
          showToast('已定位 ' + yNum + ' 年' + (m !== '0' ? ' · ' + MONTHS[parseInt(m, 10)] : '') + ' 的条目', 'success');
        } else {
          showToast('请输入 4 位年份，例如 2024');
        }
      }
    });

    // —— 日夜主题切换（对齐 subject.js / user.js）——
    const themeToggle = $('btnThemeToggle');
    if (themeToggle) themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      html.setAttribute('data-theme', (html.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark');
    });

    // —— 快捷键 / 聚焦榜内检索 ——
    document.addEventListener('keydown', ev => {
      if (ev.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        ev.preventDefault(); if (inline) inline.focus();
      }
    });
  }

  /* ============================ 启动 ============================ */

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    renderAll();
  });
})();
