/**
 * Bangumi Chronicle · Phase D 发现与检索体系真站 DOM 提取器 (discovery-extractor.js)
 * 覆盖：
 * - P13 五大频道聚合首页 (/anime, /book, /music, /game, /real)
 * - P14 分类浏览与排行榜 (/{type}/browser*, /{type}/chart)
 * - P15 每日放送日历 (/calendar)
 * - P16 标签广场与标签详情 (/{type}/tag, /{type}/tag/{name}, /tag)
 * - P17 全站综合搜索结果 (/subject_search/{q}, /mono_search/{q})
 */

import { upgradeCoverUrl } from '../cover-upgrader.js';

function normUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (s.startsWith('//')) return 'https:' + s;
  return s;
}

function parseBgUrl(el) {
  if (!el) return '';
  const style = el.getAttribute?.('style') || '';
  const m = style.match(/url\((['"]?)([^'")]+)\1\)/i);
  return m?.[2] ? normUrl(m[2]) : '';
}

function upgradeAvatarUrl(url) {
  const u = normUrl(url);
  if (!u) return 'https://lain.bgm.tv/pic/user/l/icon.jpg';
  return u.replace(/(\/pic\/(?:user|crt)\/)(?:s|m|c|g)(\/)/i, '$1l$2');
}

function findEl(doc, id) {
  if (!doc || !id) return null;
  return (
    doc.getElementById(id) ||
    doc.getElementById('bgm-legacy-' + id) ||
    doc.querySelector('[data-bgm-legacy-id="' + id + '"]') ||
    null
  );
}

export const CHANNEL_META = {
  anime: {
    key: 'anime',
    label: '动画',
    icon: '📺',
    verb: '看',
    square: false,
    pageTitle: '动画频道',
    enTitle: 'ANIME CHANNEL',
    rankTitle: '动画排行榜',
  },
  book: {
    key: 'book',
    label: '书籍',
    icon: '📚',
    verb: '读',
    square: false,
    pageTitle: '图书频道',
    enTitle: 'BOOK CHANNEL',
    rankTitle: '书籍排行榜',
  },
  music: {
    key: 'music',
    label: '音乐',
    icon: '🎵',
    verb: '听',
    square: true,
    pageTitle: '音乐频道',
    enTitle: 'MUSIC CHANNEL',
    rankTitle: '音乐排行榜',
  },
  game: {
    key: 'game',
    label: '游戏',
    icon: '🎮',
    verb: '玩',
    square: false,
    pageTitle: '游戏频道',
    enTitle: 'GAME CHANNEL',
    rankTitle: '游戏排行榜',
  },
  real: {
    key: 'real',
    label: '三次元',
    icon: '🎬',
    verb: '看',
    square: false,
    pageTitle: '三次元频道',
    enTitle: 'REAL CHANNEL',
    rankTitle: '三次元排行榜',
  },
};

function detectChannelFromDoc(doc, route = {}) {
  const pType = route?.params?.type || route?.params?.channel || '';
  if (pType && CHANNEL_META[pType]) return pType;
  const path = typeof location !== 'undefined' ? location.pathname : '';
  const m = path.match(/^\/(anime|book|music|game|real)(?:\/|$)/);
  if (m && CHANNEL_META[m[1]]) return m[1];
  const focusNav = doc.querySelector('#navMenuNeue a.focus[href], #bgm-legacy-headerNeue2 #navMenuNeue a.focus[href]');
  const navChan = focusNav?.getAttribute('href')?.replace(/^\//, '')?.split('/')[0] || '';
  if (CHANNEL_META[navChan]) return navChan;
  return 'anime';
}

/**
 * 通用：解析 #browserItemList > li.item（供 P14 浏览/排行、P16 标签详情、P17 搜索共用）
 */
export function parseBrowserItemList(doc, defaultChannel = 'anime') {
  const items = [];
  const root = findEl(doc, 'browserItemList') || doc.getElementById('browserItemList') || doc;
  const rows = root.querySelectorAll('li.item');

  rows.forEach((li, idx) => {
    const id = (li.id || '').replace(/^item_/, '') || String(idx + 1);
    const titleA = li.querySelector('h3 a.l, h3 a[href*="/subject/"]');
    const href = titleA?.getAttribute('href') || (id ? `/subject/${id}` : '#');
    const title = titleA?.textContent?.trim() || '';
    const orig = li.querySelector('h3 small.grey')?.textContent?.trim() || '';
    if (!title) return;

    const rankEl = li.querySelector('span.rank');
    const rankNum = parseInt((rankEl?.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;

    const imgEl = li.querySelector('img.cover, a.subjectCover img, img');
    const rawSrc = normUrl(imgEl?.getAttribute('src') || parseBgUrl(li.querySelector('[style*="background-image"]')) || '');
    const isNoIcon = !rawSrc || /no_icon_subject/i.test(rawSrc);
    const cover = isNoIcon ? '' : upgradeCoverUrl(rawSrc);

    const info = li.querySelector('p.info.tip, p.tip')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const score = parseFloat(li.querySelector('.rateInfo .fade, span.fade')?.textContent || '0') || 0;
    const votesText = li.querySelector('.rateInfo .tip_j, span.tip_j')?.textContent || '';
    const votes = parseInt(votesText.replace(/[^0-9]/g, ''), 10) || 0;

    // 识别搜索结果里的条目类型图标 (.ico_subject_type.subject_type_2)
    const icoEl = li.querySelector('.ico_subject_type');
    const icoCls = icoEl?.className || '';
    let cat = defaultChannel;
    if (icoCls.includes('subject_type_1')) cat = 'book';
    else if (icoCls.includes('subject_type_2')) cat = 'anime';
    else if (icoCls.includes('subject_type_3')) cat = 'music';
    else if (icoCls.includes('subject_type_4')) cat = 'game';
    else if (icoCls.includes('subject_type_6')) cat = 'real';

    items.push({
      id,
      rank: rankNum,
      title,
      orig,
      href,
      cover,
      isNoIcon,
      info,
      score,
      votes,
      cat,
    });
  });

  return items;
}

function parsePagerLinks(doc) {
  const pagerLinks = [];
  doc.querySelectorAll('.page_inner a, .page_inner strong').forEach((el) => {
    pagerLinks.push({
      label: el.textContent.trim(),
      href: el.tagName === 'A' ? el.getAttribute('href') || '#' : '',
      current: el.tagName === 'STRONG' || el.classList.contains('p_cur'),
    });
  });
  return pagerLinks;
}

/**
 * D1 · P13 五大频道聚合首页提取器 (/anime, /book, /music, /game, /real)
 */
export function extractChannelData(doc, route = {}) {
  const channel = detectChannelFromDoc(doc, route);
  const meta = CHANNEL_META[channel] || CHANNEL_META.anime;

  const subTabs = [];
  doc.querySelectorAll('#header ul.navSubTabs > li > a, ul.navSubTabs > li > a').forEach((a) => {
    subTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  // 近期注目 (ul.featuredItems .mainItem)
  const featured = [];
  doc.querySelectorAll('ul.featuredItems .mainItem, #columnA .section ul.coversSmall > li').forEach((item) => {
    const a = item.querySelector('a[href*="/subject/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const id = href.match(/\/subject\/(\d+)/)?.[1] || '';
    const title =
      item.querySelector('p.title a, .title a')?.textContent?.trim() ||
      a.getAttribute('title')?.trim() ||
      a.textContent.trim() ||
      '';
    const bg = parseBgUrl(item.querySelector('.image, [style*="background"]')) || parseBgUrl(a);
    const img = item.querySelector('img');
    const rawCov = bg || normUrl(img?.getAttribute('src') || '');
    const noIcon = !rawCov || /no_icon_subject/i.test(rawCov);
    const followText = item.querySelector('small.grey, .info')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    if (title) {
      featured.push({
        id,
        title,
        href,
        cover: noIcon ? '' : upgradeCoverUrl(rawCov),
        followText,
      });
    }
  });

  // 频道内其他封面区块（如新番/新书/新碟速递 ul.coversSmall）
  const newReleases = [];
  const seenIds = new Set(featured.map((f) => f.id));
  doc.querySelectorAll('ul.coversSmall > li, .coverList > li, .calendarMini .coverList a.thumbTip').forEach((node) => {
    const a = node.tagName === 'A' ? node : node.querySelector('a[href*="/subject/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const id = href.match(/\/subject\/(\d+)/)?.[1] || '';
    if (!id || seenIds.has(id)) return;
    const subjTitleA =
      node.tagName === 'A'
        ? null
        : node.querySelector?.('p.title a[href*="/subject/"], .title a[href*="/subject/"], a.l[href*="/subject/"]');
    const rawTitle =
      a.getAttribute('data-original-title') ||
      a.getAttribute('title') ||
      subjTitleA?.getAttribute('title') ||
      subjTitleA?.textContent ||
      a.textContent ||
      '';
    const title =
      subjTitleA?.textContent?.trim() ||
      rawTitle
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .split('<br')[0]
        .replace(/<[^>]+>/g, '')
        .trim();
    const img = node.querySelector?.('img');
    const bg = parseBgUrl(node) || parseBgUrl(a);
    const rawCov = normUrl(img?.getAttribute('src') || bg || '');
    if (!title || !rawCov || /no_icon_subject/i.test(rawCov)) return;
    const infoText = node.querySelector?.('small.grey, .info')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    seenIds.add(id);
    newReleases.push({
      id,
      title,
      href,
      cover: upgradeCoverUrl(rawCov),
      followText: infoText && infoText !== title ? infoText : '近期热议',
    });
  });

  // 频道日志 (#entry_list .item, .entry-list .item, #news_list .item)
  const blogs = [];
  doc.querySelectorAll('#entry_list div.item, #bgm-legacy-entry_list div.item, .entry-list div.item, #news_list div.item').forEach((it) => {
    const titleA = it.querySelector('h2.title a') || it.querySelector('.entry h2 a') || it.querySelector('.entry a[href*="/blog/"]');
    if (!titleA) return;
    const href = titleA.getAttribute('href') || '#';
    const id = href.match(/\/blog\/(\d+)/)?.[1] || '';
    const title = titleA.textContent.trim();
    const img = it.querySelector('p.cover img, .cover img, img');
    const rawCov = normUrl(img?.getAttribute('src') || '');
    const cover = rawCov ? upgradeCoverUrl(rawCov) : 'https://lain.bgm.tv/pic/user/l/icon.jpg';
    const timeDiv = it.querySelector('.tools .time, .time');
    const userA = timeDiv?.querySelector('a[href*="/user/"]') || it.querySelector('a[href*="/user/"]');
    const subjA = timeDiv?.querySelector('a[href*="/subject/"]');
    const replyA = timeDiv?.querySelector('a[href*="/blog/"]');
    const rawTime = timeDiv?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const relTimeMatch = rawTime.match(/(\d+\s*(?:秒|分钟|小时|天|月|年)[^·]*前|\d{4}-\d{1,2}-\d{1,2})/);
    const excerpt = (it.querySelector('.content')?.textContent || '').replace(/\s+/g, ' ').trim();

    if (title) {
      blogs.push({
        id,
        title,
        href,
        cover,
        author: userA?.textContent?.trim() || '漫友',
        authorHref: userA?.getAttribute('href') || '#',
        subjectName: subjA?.textContent?.trim() || '',
        subjectHref: subjA?.getAttribute('href') || '#',
        repliesText: replyA?.textContent?.trim() || '0 回复',
        time: relTimeMatch ? relTimeMatch[1].trim() : '',
        excerpt,
      });
    }
  });

  // 最新讨论 (table.topic_list tr)
  const topics = [];
  doc.querySelectorAll('table.topic_list tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    const topicA = tds[0].querySelector('a[href*="/topic/"], a[href*="/ep/"], a.l');
    if (!topicA) return;
    const title = topicA.textContent.trim();
    const href = topicA.getAttribute('href') || '#';
    const replies = tds[0].querySelector('small.grey')?.textContent?.trim() || '';
    const subjA = tds[0].querySelector('small.feed a[href*="/subject/"]') || tds[1]?.querySelector('a[href*="/subject/"]');
    const userA = tds[1]?.querySelector('a[href*="/user/"]') || tds[2]?.querySelector('a[href*="/user/"]');
    const date = tds[1]?.querySelector('small.grey')?.textContent?.trim() || tds[tds.length - 1]?.textContent?.trim() || '';
    if (title) {
      topics.push({
        title,
        href,
        replies,
        subjectName: subjA?.textContent?.trim()?.replace(/^["「]|["」]$/g, '') || '',
        subjectHref: subjA?.getAttribute('href') || '#',
        author: userA?.textContent?.trim() || '',
        authorHref: userA?.getAttribute('href') || '#',
        date,
      });
    }
  });

  // 右侧栏分类浏览入口 (.sideInner ul.grouped)
  const facets = [];
  doc.querySelectorAll('.sideInner ul.grouped').forEach((ul) => {
    const prev = ul.previousElementSibling;
    const prevHeading =
      prev && (prev.classList?.contains('subtitle') || /^H[1-6]$/i.test(prev.tagName))
        ? prev.textContent.replace(/\s+/g, ' ').trim()
        : '';
    const groupTitle =
      ul.querySelector('li.subtitle')?.textContent?.replace(/\s+/g, ' ')?.trim() ||
      prevHeading ||
      '分类索引';
    const values = [];
    ul.querySelectorAll('li:not(.subtitle) a[href]').forEach((a) => {
      const label = a.textContent.trim();
      const href = a.getAttribute('href') || '#';
      if (label && !href.startsWith('javascript')) values.push({ label, href });
    });
    if (values.length) facets.push({ title: groupTitle, values });
  });

  // 右侧栏热门标签 (.SidePanel a[href*="/tag/"])
  const tags = [];
  doc.querySelectorAll('#columnB a[href*="/tag/"], #columnSubjectBrowserB a[href*="/tag/"], .SidePanel a[href*="/tag/"]').forEach((a) => {
    const name = a.textContent.trim();
    const href = a.getAttribute('href') || '#';
    if (!name || name.toLowerCase() === 'more' || !/\/tag\/.+/.test(href)) return;
    if (!tags.some((t) => t.name === name)) {
      const cls = a.className || '';
      const lvMatch = cls.match(/level(\d+)/);
      const lv = lvMatch ? parseInt(lvMatch[1], 10) : 4;
      const levelClass = lv >= 6 ? 'lv-high' : lv >= 3 ? 'lv-mid' : 'lv-low';
      tags.push({ name, href, levelClass });
    }
  });

  return {
    channel,
    meta,
    subTabs,
    featured,
    newReleases: (newReleases.length ? newReleases : featured.slice(8)).slice(0, 6),
    blogs,
    topics,
    facets,
    tags,
  };
}

/**
 * D1 · P14 分类浏览与排行榜提取器 (/{type}/browser*, /{type}/chart)
 */
export function extractBrowserData(doc, route = {}) {
  const channel = detectChannelFromDoc(doc, route);
  const meta = CHANNEL_META[channel] || CHANNEL_META.anime;
  const heading = doc.querySelector('#header h1')?.textContent?.trim() || meta.rankTitle;

  const subTabs = [];
  doc.querySelectorAll('#header ul.navSubTabs > li > a, ul.navSubTabs > li > a').forEach((a) => {
    subTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const sortLinks = [];
  doc.querySelectorAll('#browserTools .filters a, #bgm-legacy-browserTools .filters a').forEach((a) => {
    sortLinks.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const items = parseBrowserItemList(doc, channel);
  const pagerLinks = parsePagerLinks(doc);

  const facetGroups = [];
  const colB = findEl(doc, 'columnSubjectBrowserB') || doc.getElementById('columnSubjectBrowserB') || doc;
  colB.querySelectorAll('.sideInner ul.grouped').forEach((ul) => {
    let prev = ul.previousElementSibling;
    while (prev && prev.tagName !== 'H2' && prev.tagName !== 'UL') {
      prev = prev.previousElementSibling;
    }
    const h2Title = prev?.tagName === 'H2' ? prev.textContent.replace(/\s+/g, ' ').trim() : '';
    const liTitle = ul.querySelector('li.subtitle')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const title = h2Title || liTitle || '分类筛选';
    const links = [];
    ul.querySelectorAll('li:not(.subtitle) a[href]').forEach((a) => {
      const label = a.textContent.replace(/\s+/g, ' ').trim();
      if (label) {
        links.push({
          label,
          href: a.getAttribute('href') || '#',
          active: a.classList.contains('focus'),
        });
      }
    });
    if (links.length) facetGroups.push({ title, links });
  });

  const airtimeLinks = [];
  colB.querySelectorAll('ul.airTime > li > a, ul.airYear > li > a').forEach((a) => {
    const label = a.textContent.trim();
    if (label) {
      airtimeLinks.push({
        label,
        href: a.getAttribute('href') || '#',
        active: a.classList.contains('focus'),
      });
    }
  });

  return {
    channel,
    meta,
    heading,
    subTabs,
    sortLinks,
    items,
    pagerLinks,
    facetGroups,
    airtimeLinks,
  };
}

/**
 * D1 · P15 每日放送日历提取器 (/calendar)
 */
const WEEKDAY_SPECS = [
  { id: 1, cls: 'Mon', en: 'Mon', cn: '星期一', ja: '月' },
  { id: 2, cls: 'Tue', en: 'Tue', cn: '星期二', ja: '火' },
  { id: 3, cls: 'Wed', en: 'Wed', cn: '星期三', ja: '水' },
  { id: 4, cls: 'Thu', en: 'Thu', cn: '星期四', ja: '木' },
  { id: 5, cls: 'Fri', en: 'Fri', cn: '星期五', ja: '金' },
  { id: 6, cls: 'Sat', en: 'Sat', cn: '星期六', ja: '土' },
  { id: 7, cls: 'Sun', en: 'Sun', cn: '星期日', ja: '日' },
];

export function extractCalendarData(doc) {
  const dateLabel = doc.querySelector('#header h1 small')?.textContent?.replace(/^\/\s*/, '')?.trim() || '';
  const summaryTipHtml = doc.querySelector('#header .tip')?.innerHTML?.trim() || '';

  const days = [];
  let totalShows = 0;

  WEEKDAY_SPECS.forEach((sp) => {
    const ddEl = doc.querySelector(`.BgmCalendar dd.${sp.cls}, dd.${sp.cls}`);
    const colEl = ddEl?.closest('li.week') || doc.querySelector(`.BgmCalendar ul.large > li.week.${sp.cls}, li.week.${sp.cls}`);
    const isToday = Boolean(colEl?.querySelector('dl.today, h3.today, dt.today'));
    const items = [];
    const seen = new Set();

    colEl?.querySelectorAll('ul.coverList > li').forEach((li) => {
      const aList = li.querySelectorAll('.info a[href*="/subject/"], a[href*="/subject/"]');
      if (!aList.length) return;
      const href = aList[0].getAttribute('href') || '#';
      const id = href.match(/\/subject\/(\d+)/)?.[1] || '';
      if (!id || seen.has(id)) return;
      seen.add(id);

      const title = aList[0].textContent.trim();
      const orig = li.querySelector('.info em, small em')?.textContent?.trim() || '';
      const rawBg = parseBgUrl(li) || normUrl(li.querySelector('img')?.getAttribute('src') || '');
      const noIcon = !rawBg || /no_icon_subject/i.test(rawBg);
      const cover = noIcon ? '' : upgradeCoverUrl(rawBg);

      if (title || orig) {
        items.push({
          id,
          title: title || orig,
          orig: orig && orig !== title ? orig : '',
          href,
          cover,
          isNoIcon: noIcon,
        });
      }
    });

    totalShows += items.length;
    days.push({
      ...sp,
      isToday,
      count: items.length,
      items,
    });
  });

  return {
    dateLabel,
    summaryTipHtml,
    totalShows,
    days,
  };
}

/**
 * D2 · P16 标签广场与标签详情提取器 (/{type}/tag, /{type}/tag/{name}, /tag)
 */
export function extractTagData(doc, route = {}) {
  const channel = detectChannelFromDoc(doc, route);
  const meta = CHANNEL_META[channel] || CHANNEL_META.anime;
  const heading = doc.querySelector('#header h1')?.textContent?.trim() || `${meta.label}标签`;

  const hasItemList = Boolean(findEl(doc, 'browserItemList') || doc.getElementById('browserItemList'));
  const mode = hasItemList ? 'detail' : 'plaza';

  const tags = [];
  const tagRoot = findEl(doc, 'tagList') || doc.getElementById('tagList') || doc;
  tagRoot.querySelectorAll('a.l[class*="level"], a[href*="/tag/"]').forEach((a) => {
    if (hasItemList && !a.closest('#tagList, #bgm-legacy-tagList')) return;
    const name = a.textContent.trim();
    const href = a.getAttribute('href') || '#';
    if (!name || !href.includes('/tag/')) return;
    const lvMatch = (a.className || '').match(/level(\d+)/);
    const level = lvMatch ? parseInt(lvMatch[1], 10) : 5;
    const nextSmall = a.nextElementSibling;
    const count =
      nextSmall?.tagName === 'SMALL'
        ? parseInt((nextSmall.textContent || '').replace(/[^0-9]/g, ''), 10) || 0
        : 0;
    tags.push({ name, href, level, count });
  });

  const sortLinks = [];
  doc.querySelectorAll('#browserTools .filters a, #bgm-legacy-browserTools .filters a').forEach((a) => {
    sortLinks.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const yearLinks = [];
  doc.querySelectorAll('ul.airYear > li > a, ul.airTime > li > a').forEach((a) => {
    const label = a.textContent.trim();
    if (label) {
      yearLinks.push({
        label,
        href: a.getAttribute('href') || '#',
        active: a.classList.contains('focus'),
      });
    }
  });

  const items = hasItemList ? parseBrowserItemList(doc, channel) : [];
  const pagerLinks = hasItemList ? parsePagerLinks(doc) : [];

  return {
    mode,
    channel,
    meta,
    heading,
    tags,
    sortLinks,
    yearLinks,
    items,
    pagerLinks,
  };
}

/**
 * D2 · P17 全站综合搜索结果提取器 (/subject_search/{q}, /mono_search/{q})
 */
export function extractSearchData(doc, route = {}) {
  const searchInput = doc.querySelector('input.searchInputL, form[action*="/subject_search"] input[name="search_text"]');
  let keyword = searchInput?.value?.trim() || '';
  if (!keyword && route?.params?.query) {
    try {
      keyword = decodeURIComponent(route.params.query);
    } catch {
      keyword = route.params.query;
    }
  }
  if (!keyword && doc.title) {
    const mTitle = doc.title.match(/^(.+?)\s*:\s*番組検索/);
    if (mTitle) keyword = mTitle[1].trim();
  }

  const catLinks = [];
  doc.querySelectorAll('#header ul.navSubTabs > li > a, ul.navSubTabs > li > a').forEach((a) => {
    catLinks.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const resultTip = doc.querySelector('#columnSearchB .searchResultTip, .searchResultTip')?.textContent?.trim() || '';

  // 精准匹配人物/角色 (#columnSearchC a.avatar or #columnSearchB ul.coversSmall > li)
  const relatedPersons = [];
  const seenPersons = new Set();
  doc
    .querySelectorAll(
      '#columnSearchC a.avatar[href*="/person/"], #columnSearchC a.avatar[href*="/character/"], #bgm-legacy-columnSearchC a.avatar[href*="/person/"], #bgm-legacy-columnSearchC a.avatar[href*="/character/"], #columnSearchB ul.coversSmall > li a[href*="/person/"], #columnSearchB ul.coversSmall > li a[href*="/character/"]'
    )
    .forEach((a) => {
      const href = a.getAttribute('href') || '#';
      if (seenPersons.has(href)) return;
      const kind = href.includes('/character/') ? 'character' : 'person';
      const name = a.getAttribute('title')?.trim() || a.textContent.trim() || '';
      const avaSpan = a.querySelector('span.avatarNeue, [style*="background-image"]');
      const avaImg = a.querySelector('img');
      const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');
      if (name) {
        seenPersons.add(href);
        relatedPersons.push({ name, href, avatar, kind });
      }
    });

  const monoItems = [];
  doc.querySelectorAll('#columnSearchB div.light_odd, #columnSearchB div.light_even, #bgm-legacy-columnSearchB div.light_odd, #bgm-legacy-columnSearchB div.light_even').forEach((div) => {
    const a = div.querySelector('h2 a.l, a[href*="/character/"], a[href*="/person/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const title = a.textContent.trim();
    const orig = div.querySelector('h2 small.grey')?.textContent?.trim() || '';
    const img = div.querySelector('img.avatar, img');
    const avatar = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const info = div.querySelector('.prsn_info, .tip')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    if (title) {
      monoItems.push({
        id: href.match(/\/(?:character|person)\/(\d+)/)?.[1] || title,
        rank: 0,
        title,
        orig,
        href,
        cover: avatar,
        info,
        score: 0,
        votes: 0,
        cat: href.includes('/character/') ? 'character' : 'person',
      });
    }
  });

  const subjectItems = parseBrowserItemList(doc, 'anime');
  const items = subjectItems.length ? subjectItems : monoItems;
  const pagerLinks = parsePagerLinks(doc);

  return {
    keyword,
    resultTip,
    catLinks,
    relatedPersons,
    items,
    pagerLinks,
  };
}
