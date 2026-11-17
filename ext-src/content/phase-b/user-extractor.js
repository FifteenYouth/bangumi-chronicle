/**
 * Bangumi Chronicle · P25 个人时光机 & P26 用户专项收藏列表提取器 (user-extractor.js)
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

function upgradeUserAvatar(url) {
  const u = normUrl(url);
  if (!u) return 'https://lain.bgm.tv/pic/user/l/icon.jpg';
  return u.replace(/(\/pic\/(?:user|crt|icon)\/)(?:s|m|c|g)(\/)/i, '$1l$2');
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

const CHANNEL_META = {
  anime: { icon: '🎬', defaultLabel: '动画收藏', verb: '看', isSquare: false },
  book: { icon: '📚', defaultLabel: '书籍收藏', verb: '读', isSquare: false },
  music: { icon: '💿', defaultLabel: '音乐收藏', verb: '听', isSquare: true },
  game: { icon: '🎮', defaultLabel: '游戏收藏', verb: '玩', isSquare: false },
  real: { icon: '🎞️', defaultLabel: '三次元收藏', verb: '看', isSquare: false },
};

const STAT_TONES = [
  'tone-collect',
  'tone-complete',
  'tone-rate',
  'tone-mean',
  'tone-std',
  'tone-scored',
];

export function extractUserHeaderProfile(doc, route) {
  const hp = findEl(doc, 'headerProfile');
  const uid =
    route?.params?.uid ||
    hp?.querySelector('.name a')?.getAttribute('href')?.match(/\/user\/([^/?#]+)/)?.[1] ||
    '';

  const avaSpan = hp?.querySelector('.headerAvatar span.avatarNeue, span.avatarNeue');
  const avaImg = hp?.querySelector('.headerAvatar img, img.header-avatar-img');
  const avatar = upgradeUserAvatar(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');

  const nickname =
    hp?.querySelector('.name a, .profile-nickname')?.textContent?.trim() || uid || 'Bangumi 用户';
  const friendFlagEl = hp?.querySelector('#friend_flag, #bgm-legacy-friend_flag, .friend-flag-pill');
  const friendFlag = friendFlagEl?.textContent?.trim() || '';

  const actions = [];
  hp?.querySelectorAll('.actions a, .actions button').forEach((el) => {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    if (!label) return;
    actions.push({
      id: el.id || '',
      label,
      href: el.getAttribute('href') || '',
      onclick: el.getAttribute('onclick') || '',
      isPrimary: el.classList.contains('chiiBtn') || el.classList.contains('is-primary') || el.classList.contains('primary'),
    });
  });

  const navTabs = [];
  hp?.querySelectorAll('ul.navTabs > li').forEach((li) => {
    const a = li.querySelector(':scope > a, :scope > button');
    if (!a) return;
    navTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || 'javascript:void(0)',
      id: a.id || li.id || '',
      active: a.classList.contains('focus') || a.classList.contains('active'),
    });
  });

  return {
    uid,
    nickname,
    avatar,
    friendFlag,
    actions,
    navTabs,
  };
}

export function extractUserHomeData(doc, route) {
  const profile = extractUserHeaderProfile(doc, route);
  const bioEl = doc.querySelector('.user_box .bio, .intro .bio');
  const bioRawHtml = bioEl?.innerHTML || '';
  const bgMatch = (bioEl?.textContent || '').match(/\[bg\](https?:\/\/[^\[]+)\[\/bg\]/i);
  const customBg = bgMatch?.[1]?.trim() || '';
  const bioCleanHtml = bioRawHtml
    .replace(/\[bg\][^\[]*\[\/bg\]/gi, '')
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    .replace(/(?:\s*<br\s*\/?>\s*)+$/gi, '')
    .replace(/^(?:\s*<br\s*\/?>\s*)+/gi, '')
    .trim();

  const syncEl = doc.querySelector('.userSynchronize');
  const syncPctText = syncEl?.querySelector('.percent_text, .percent')?.textContent?.trim() || '';
  const syncNum = parseFloat(syncPctText.replace(/[^0-9.]/g, '')) || 0;
  const syncParts = syncNum.toFixed(2).split('.');
  const syncShared = syncEl?.querySelector('small.hot, .hot')?.textContent?.trim() || '';

  let joinDate = '';
  let serviceYears = '';
  const services = [];
  doc.querySelectorAll('ul.network_service > li').forEach((li) => {
    const svcEl = li.querySelector('.service');
    const svc = svcEl?.textContent?.trim() || '';
    const bgColor = svcEl?.style?.backgroundColor || '';
    const hasCustomControl = Boolean(li.querySelector('select, input, button') || li.id);
    if (svc.toLowerCase() === 'bangumi') {
      const text = li.textContent.replace(/^\s*Bangumi\s*/i, '').trim();
      if (text) {
        joinDate = text;
        const yrMatch = text.match(/(\d{4})/);
        if (yrMatch) {
          const yrs = Math.max(1, new Date().getFullYear() - parseInt(yrMatch[1], 10));
          serviceYears = `时光机服役 ${yrs} 年`;
        }
      }
    }
    if (hasCustomControl) {
      services.push({
        svc,
        tip: '',
        href: '',
        bgColor,
        rawHtml: li.innerHTML,
        liId: li.id || '',
      });
      return;
    }
    const aEl = li.querySelector('a');
    const tip =
      li.querySelector('.tip')?.textContent?.trim() ||
      aEl?.textContent?.trim() ||
      li.textContent.replace(svc, '').trim();
    const href = aEl?.getAttribute('href') || '';
    if (svc || tip) {
      services.push({ svc, tip, href, bgColor, rawHtml: '', liId: li.id || '' });
    }
  });

  const channels = [];
  for (const key of ['anime', 'book', 'music', 'game', 'real']) {
    const sec = findEl(doc, key);
    if (!sec) continue;
    const meta = CHANNEL_META[key];
    const titleA = sec.querySelector('.horizontalOptions .title a');
    const statuses = [];
    sec.querySelectorAll('.horizontalOptions li:not(.title) a').forEach((a) => {
      statuses.push({
        label: a.querySelector('.type')?.textContent?.trim() || a.textContent.trim(),
        count: a.querySelector('.num')?.textContent?.trim() || '0',
        href: a.getAttribute('href') || '#',
      });
    });

    const parseItemLi = (li, groupLabel = '') => {
      const a = li.querySelector('a[href*="/subject/"]');
      if (!a) return null;
      const img = li.querySelector('img');
      const rawSrc = img?.getAttribute('src') || parseBgUrl(li.querySelector('[style*="background-image"]')) || '';
      const isNoIcon = !rawSrc || /no_icon_subject/i.test(rawSrc);
      const cover = isNoIcon ? '' : upgradeCoverUrl(normUrl(rawSrc));
      const fullTitleAttr = a.getAttribute('title') || a.getAttribute('data-original-title') || '';
      const nameText =
        li.querySelector('.title .name, .title, .name')?.textContent?.trim() ||
        fullTitleAttr.split('/')[0]?.trim() ||
        '';
      const cnTitle = fullTitleAttr.includes('/') ? fullTitleAttr.split('/').slice(1).join('/').trim() : '';
      return {
        title: nameText,
        cnTitle,
        href: a.getAttribute('href') || '#',
        cover,
        isNoIcon,
        groupLabel,
      };
    };

    const groups = [];
    const allItems = [];
    const seenHrefs = new Set();
    const listContainers = sec.querySelectorAll('.listContainer');
    if (listContainers.length) {
      listContainers.forEach((lc) => {
        const gLabel = lc.querySelector('.tip_j')?.textContent?.trim() || '';
        const gItems = [];
        lc.querySelectorAll('.coverList li, ul.coversSmall li, li.item').forEach((li) => {
          const parsed = parseItemLi(li, gLabel);
          if (!parsed) return;
          gItems.push(parsed);
          if (!seenHrefs.has(parsed.href)) {
            seenHrefs.add(parsed.href);
            allItems.push(parsed);
          }
        });
        if (gItems.length) {
          groups.push({ label: gLabel, items: gItems.slice(0, 12) });
        }
      });
    } else {
      sec.querySelectorAll('.coverList li, ul.coversSmall li, li.item').forEach((li) => {
        const parsed = parseItemLi(li, '');
        if (!parsed || seenHrefs.has(parsed.href)) return;
        seenHrefs.add(parsed.href);
        allItems.push(parsed);
      });
      if (allItems.length) {
        groups.push({ label: '', items: allItems.slice(0, 12) });
      }
    }

    channels.push({
      key,
      icon: meta.icon,
      verb: meta.verb,
      isSquare: meta.isSquare,
      label: titleA?.textContent?.trim() || meta.defaultLabel,
      href: titleA?.getAttribute('href') || `/${key}/list/${encodeURIComponent(profile.uid)}`,
      statuses,
      groups,
      items: allItems.slice(0, 12),
    });
  }

  // 统计面板 Tab 与各分类 6 维指标 + 10~1 评分分布直方图
  const statsTabs = [];
  doc.querySelectorAll('ul.userStatsTab > li > a').forEach((a) => {
    const id = a.id || '';
    const tabKey = id.replace(/^userStatsTab_/, '') || 'all';
    const label = a.querySelector('.type')?.textContent?.trim() || a.textContent.trim();
    if (label) {
      statsTabs.push({
        key: tabKey,
        label: label === '全部' ? '总览' : label,
        active: a.classList.contains('focus') || tabKey === 'all',
      });
    }
  });

  const statsByTab = {};
  doc.querySelectorAll('[id^="userStats_"]').forEach((block) => {
    const tabKey = block.id.replace(/^userStats_/, '');
    const metrics = [];
    block.querySelectorAll('.gridStats .item').forEach((it, idx) => {
      metrics.push({
        num: it.querySelector('.num')?.textContent?.trim() || '0',
        desc: it.querySelector('.desc')?.textContent?.trim() || '',
        tone: STAT_TONES[idx] || 'tone-collect',
      });
    });
    const chartBars = [];
    block.querySelectorAll('.horizontalChart li, .chart_desc li').forEach((li) => {
      const label = li.querySelector('.label')?.textContent?.trim() || '';
      const countEl = li.querySelector('.count');
      const count = parseInt(countEl?.textContent?.replace(/[^0-9]/g, '') || '0', 10);
      const styleH = countEl?.getAttribute('style')?.match(/height:\s*([0-9.]+)%/i)?.[1];
      const tipAttr =
        li.querySelector('a')?.getAttribute('data-original-title') ||
        li.querySelector('a')?.getAttribute('title') ||
        '';
      const pctMatch = tipAttr.match(/([0-9.]+%)/);
      if (label) {
        chartBars.push({
          label,
          count,
          heightPct: styleH ? parseFloat(styleH) : 0,
          pctText: pctMatch ? pctMatch[1] : '',
        });
      }
    });
    // 若原站未写内联 height%，按最大 count 归一化计算高度
    const maxCount = Math.max(1, ...chartBars.map((b) => b.count));
    const totalCount = chartBars.reduce((acc, b) => acc + b.count, 0);
    chartBars.forEach((b) => {
      if (!b.heightPct && b.count > 0) {
        b.heightPct = Math.round((b.count / maxCount) * 100);
      }
      if (!b.pctText && totalCount > 0) {
        b.pctText = ((b.count / totalCount) * 100).toFixed(1) + '%';
      }
    });
    statsByTab[tabKey] = { metrics, chartBars };
  });

  // 时间胶囊 (ul.timeline.dots)
  const capsule = [];
  doc.querySelectorAll('#pinnedLayout ul.timeline.dots > li, .SidePanel ul.timeline.dots > li').forEach((li) => {
    const clone = li.cloneNode(true);
    const timeEl = clone.querySelector('small.time, .time');
    const time = timeEl?.textContent?.trim() || '';
    timeEl?.remove();
    const text = clone.textContent.replace(/\s+/g, ' ').trim();
    const html = clone.innerHTML.trim();
    let cat = 'all';
    if (/看过|想看|在看|读过|想读|玩过|想玩|听过|收藏/.test(text)) cat = 'collect';
    else if (/完成|话|ep\./i.test(text)) cat = 'progress';
    else if (/日志/.test(text)) cat = 'blog';
    if (html) {
      capsule.push({ html, text, time, category: cat });
    }
  });

  // 个人日志 (#blog)
  const blogs = [];
  const blogSec = findEl(doc, 'blog');
  blogSec?.querySelectorAll('#entry_list .item, .entry_list .item, ul > li:not(.title)').forEach((it) => {
    const a = it.querySelector('a[href*="/blog/"]');
    if (!a) return;
    const title = a.textContent.trim();
    const href = a.getAttribute('href') || '#';
    const time = it.querySelector('.time, small.grey')?.textContent?.trim() || '';
    const excerpt = it.querySelector('.content, p')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (title) blogs.push({ title, href, time, excerpt });
  });

  // 好友 (#friend) 与 收藏人物 (#mono) —— 兼容真站 dl.side_port 与 li 结构
  const parsePortGrid = (id) => {
    const out = [];
    const seen = new Set();
    const el = findEl(doc, id);
    if (!el) return out;

    el.querySelectorAll('dl.side_port').forEach((dl) => {
      const dtA = dl.querySelector('dt a[href]');
      const ddA = dl.querySelector('dd a[href]');
      const href = dtA?.getAttribute('href') || ddA?.getAttribute('href') || '';
      if (!href || seen.has(href)) return;
      const img = dl.querySelector('img');
      const bg = parseBgUrl(dl.querySelector('.avatarNeue, [style*="background-image"]'));
      const title =
        ddA?.textContent?.trim() ||
        dtA?.getAttribute('title') ||
        img?.getAttribute('alt') ||
        '';
      const ava = upgradeUserAvatar(normUrl(img?.getAttribute('src')) || bg);
      if (title) {
        seen.add(href);
        out.push({ title, href, avatar: ava });
      }
    });

    if (!out.length) {
      el.querySelectorAll('li').forEach((li) => {
        const a = li.querySelector('a[href]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href || seen.has(href)) return;
        const img = li.querySelector('img');
        const bg = parseBgUrl(li.querySelector('.avatarNeue, [style*="background-image"]'));
        const title =
          li.querySelector('a.l')?.textContent?.trim() ||
          a.getAttribute('title') ||
          img?.getAttribute('alt') ||
          a.textContent?.trim() ||
          '';
        const ava = upgradeUserAvatar(normUrl(img?.getAttribute('src')) || bg);
        if (title) {
          seen.add(href);
          out.push({ title, href, avatar: ava });
        }
      });
    }
    return out.slice(0, 16);
  };

  // 参加的小组 (#group > ul.groupsLine > li)
  const parseGroupsGrid = () => {
    const out = [];
    const seen = new Set();
    const el = findEl(doc, 'group');
    if (!el) return out;

    el.querySelectorAll('ul.groupsLine > li, li').forEach((li) => {
      const titleA = li.querySelector('.ll a.l, a.l[href*="/group/"]') || li.querySelector('a[href*="/group/"]');
      const href = titleA?.getAttribute('href') || '';
      if (!href || seen.has(href)) return;
      const img = li.querySelector('img.groupImage, a.avatar img, img');
      const bg = parseBgUrl(li.querySelector('.avatarNeue, [style*="background-image"]'));
      const title =
        titleA?.textContent?.trim() ||
        img?.getAttribute('alt') ||
        '';
      const count = li.querySelector('small.feed, small')?.textContent?.trim() || '';
      const rawIcon = normUrl(img?.getAttribute('src')) || bg;
      const avatar = rawIcon ? upgradeUserAvatar(rawIcon) : 'https://lain.bgm.tv/pic/user/l/icon.jpg';
      if (title) {
        seen.add(href);
        out.push({ title, href, avatar, count });
      }
    });
    return out.slice(0, 12);
  };

  const rssA = doc.querySelector('.menu_inner a[href*="/feed/"]');
  const wikiA = doc.querySelector('.menu_inner a[href*="/wiki"]');

  return {
    profile,
    joinDate,
    serviceYears,
    customBg,
    bioCleanHtml,
    sync: syncEl
      ? {
          pct: syncNum,
          pctInt: syncParts[0],
          pctDec: '.' + syncParts[1] + '%',
          pctText: syncPctText,
          shared: syncShared,
        }
      : null,
    services,
    channels,
    statsTabs,
    statsByTab,
    capsule: capsule.slice(0, 10),
    blogs: blogs.slice(0, 6),
    friends: parsePortGrid('friend'),
    groups: parseGroupsGrid(),
    mono: parsePortGrid('mono'),
    rssHref: rssA?.getAttribute('href') || `/feed/user/${encodeURIComponent(profile.uid)}/interests`,
    wikiHref: wikiA?.getAttribute('href') || `/user/${encodeURIComponent(profile.uid)}/wiki`,
  };
}

export function extractUserCollectionData(doc, route) {
  const profile = extractUserHeaderProfile(doc, route);
  const type = route?.params?.type || 'anime';
  const status = route?.params?.status || 'collect';

  const subTabs = [];
  doc.querySelectorAll('.navSubTabs > li > a').forEach((a) => {
    subTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const sortLinks = [];
  doc.querySelectorAll('#browserTools .filters a, #browserTools a[href*="orderby="]').forEach((a) => {
    sortLinks.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const items = [];
  doc.querySelectorAll('#browserItemList > li.item, #bgm-legacy-browserItemList > li.item').forEach((li) => {
    const id = (li.id || '').replace(/^item_/, '');
    const titleA = li.querySelector('h3 a.l');
    const title = titleA?.textContent?.trim() || '';
    const jpTitle = li.querySelector('h3 small.grey')?.textContent?.trim() || '';
    const href = titleA?.getAttribute('href') || (id ? `/subject/${id}` : '#');
    const coverImg = li.querySelector('img.cover, img');
    const rawSrc = coverImg?.getAttribute('src') || '';
    const isNoIcon = !rawSrc || /no_icon_subject/i.test(rawSrc);
    const cover = isNoIcon ? '' : upgradeCoverUrl(normUrl(rawSrc));
    const info = li.querySelector('p.info.tip')?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const starEl = li.querySelector('.starlight');
    const starMatch = (starEl?.className || '').match(/stars(\d+)/);
    const stars = starMatch ? parseInt(starMatch[1], 10) : 0;
    const collectDate = li.querySelector('.collectInfo .tip_j')?.textContent?.trim() || '';
    const rawTags = li.querySelector('.collectInfo .tip')?.textContent?.replace(/^\s*标签:\s*/i, '').trim() || '';
    const comment = li.querySelector('#comment_box .text, .comment-box .text, .text')?.textContent?.trim() || '';

    const editA = li.querySelector('.collectBlock a.thickbox, a[href*="/update"]');
    const delA = li.querySelector('.collectBlock a[href*="erase"], a[onclick*="erase"]');

    items.push({
      id,
      title,
      jpTitle,
      href,
      cover,
      info,
      stars,
      collectDate,
      tags: rawTags ? rawTags.split(/\s+/).filter(Boolean) : [],
      comment,
      editHref: editA?.getAttribute('href') || '',
      delHref: delA?.getAttribute('href') || '',
    });
  });

  const userTags = [];
  doc.querySelectorAll('#userTagList li a, #bgm-legacy-userTagList li a').forEach((a) => {
    const count = a.parentElement?.querySelector('small')?.textContent?.trim() || '';
    userTags.push({
      name: a.textContent.trim(),
      count,
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const pagerLinks = [];
  doc.querySelectorAll('.page_inner a, .page_inner strong').forEach((el) => {
    pagerLinks.push({
      label: el.textContent.trim(),
      href: el.tagName === 'A' ? el.getAttribute('href') || '#' : '',
      current: el.tagName === 'STRONG' || el.classList.contains('p_cur'),
    });
  });

  return {
    profile,
    type,
    status,
    subTabs,
    sortLinks,
    items,
    userTags,
    pagerLinks,
  };
}
