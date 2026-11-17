/**
 * Bangumi Chronicle · P01/P02 首页与登录认证页真站 DOM 提取器 (home-extractor.js)
 */

import { upgradeCoverUrl } from '../cover-upgrader.js';
import { parseTimelineItems } from './timeline-extractor.js';

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

/**
 * 原站容器可能已被 dom-vault 改名搬进 #bgm-legacy-vault（id → bgm-legacy-<id>），
 * 因此提取器必须同时兼容 原名 / 改名 / data-bgm-legacy-id 三种状态。
 */
export function findLegacyEl(doc, id) {
  if (!doc || !id) return null;
  return (
    doc.getElementById(id) ||
    doc.getElementById('bgm-legacy-' + id) ||
    doc.querySelector('[data-bgm-legacy-id="' + id + '"]') ||
    null
  );
}

function queryLegacy(doc, id, selector) {
  const root = findLegacyEl(doc, id);
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector));
}

function parseEpStatusClass(cls = '') {
  if (cls.includes('epBtnWatched')) return 'watched';
  if (cls.includes('epBtnToday')) return 'today';
  if (cls.includes('epBtnAir')) return 'air';
  if (cls.includes('epBtnQueue')) return 'queue';
  if (cls.includes('epBtnDrop')) return 'drop';
  return 'na';
}

/**
 * 共享：#home_calendar 每日放送解析
 * 真站结构：#home_calendar > .sidePanelHome > ul.calendarMini > li.clearit.week.Sat
 *   > h3 (今天 / <small>Sat</small>) + div.coverList > a.thumbTip[title="原名<br /><small>中文名</small>"] > img
 */
function parseCalendarItems(doc) {
  const out = [];
  const seen = new Set();
  const root = findLegacyEl(doc, 'home_calendar') || doc;

  const push = (a, dayLabel, weekday) => {
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href === '#' || seen.has(href)) return;
    seen.add(href);
    const img = a.querySelector('img');
    // 真站 a.thumbTip 的 title 常为空串，真实名称在 data-original-title（HTML 转义过的 "原名<br /><small>中文名</small>"）
    const rawTitle =
      a.getAttribute('data-original-title') || a.getAttribute('title') || a.textContent || '';
    const decoded = rawTitle
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    const title = decoded.split('<br')[0].replace(/<[^>]+>/g, '').trim();
    const subTitle = decoded.match(/<small>([^<]*)<\/small>/i)?.[1]?.trim() || '';
    if (!title) return;
    out.push({
      href,
      title,
      subTitle,
      cover: upgradeCoverUrl(normUrl(img?.getAttribute('src'))),
      dayLabel,
      weekday,
    });
  };

  const rows = root.querySelectorAll('ul.calendarMini > li, li.week');
  if (rows.length) {
    Array.from(rows).forEach((li) => {
      const h3 = li.querySelector('h3');
      const dayLabel = (h3?.childNodes?.[0]?.textContent || '').trim();
      const weekday = h3?.querySelector('small')?.textContent?.trim() || '';
      li.querySelectorAll('div.coverList a, a.thumbTip').forEach((a) => push(a, dayLabel, weekday));
    });
  } else {
    root.querySelectorAll('.coverList a, a.thumbTip').forEach((a) => push(a, '', ''));
  }
  return out;
}

/**
 * 共享：侧翼「在刚才」紧凑时间线解析
 * 真站结构：#home_tml > .sidePanelHome > ul.timeline_img > li.clearit
 *   > .avatar > a.avatar > span.avatarNeue[style=background-image]
 *   + .info > a.l[href=/user/xxx] 用户名 + 动作文字 + a.l[href=/subject/ep/xxx]
 */
function upgradeUserAvatarUrl(url) {
  const u = normUrl(url);
  if (!u) return '';
  return u.replace(/(\/pic\/user\/)(?:s|m)(\/)/i, '$1l$2');
}

function parseCompactTimeline(doc) {
  const out = [];
  // #home_tml / #timeline 都会被 dom-vault 改名为 bgm-legacy-*，必须走 findLegacyEl
  const root = findLegacyEl(doc, 'home_tml') || findLegacyEl(doc, 'timeline');
  if (!root) return out;

  // 仅匹配游客态侧栏 ul.timeline_img 紧凑条目，绝不拦截已登录主页的 li.tml_item（含 .card 封面卡）
  const rows = root.querySelectorAll('ul.timeline_img > li:not(.tml_item)');
  rows.forEach((li, idx) => {
    if (li.classList.contains('tml_item') || li.querySelector('li')) return;
    const avaLink = li.querySelector('.avatar a.avatar, a.avatar');
    const avaSpan = li.querySelector('span.avatarNeue');
    const avaImg = li.querySelector('img');
    const avatar =
      parseBgUrl(avaSpan) ||
      normUrl(avaImg?.getAttribute('src')) ||
      'https://lain.bgm.tv/pic/user/l/icon.jpg';

    const infoEl = li.querySelector('.info') || li;
    const userA = infoEl.querySelector('a.l[href*="/user/"]');
    const uid = (userA?.getAttribute('href') || avaLink?.getAttribute('href') || '').match(/\/user\/([^/?#]+)/)?.[1] || '';
    const user = userA?.textContent?.trim() || uid || 'Bangumi 用户';

    const clone = infoEl.cloneNode(true);
    clone.querySelectorAll('.avatar').forEach((n) => n.remove());
    const actionHtml = clone.innerHTML.trim();
    const actionText = clone.textContent.replace(/\s+/g, ' ').trim();
    if (!actionText) return;

    out.push({
      id: li.id || 'ctml_' + idx,
      uid,
      user,
      userHref: uid ? `/user/${uid}` : '#',
      avatar,
      actionHtml,
      quoteText: '',
      card: null,
      stars: 0,
      time: '',
      replyUrl: '',
      replyCount: 0,
      delUrl: '',
      category: 'say',
    });
  });
  return out;
}

/**
 * 解析 P01 已登录首页真站 DOM
 */
export function extractLoggedInHome(doc) {
  const subjects = [];
  const listItems = doc.querySelectorAll('#prgSubjectList > li');

  for (let i = 0; i < listItems.length; i++) {
    const li = listItems[i];
    const subjectType = li.getAttribute('subject_type') || '2';
    const titleA = li.querySelector('a.subjectItem.title, a.title[subject_id]');
    const subjectId =
      titleA?.getAttribute('subject_id') ||
      li.querySelector('[subject_id]')?.getAttribute('subject_id') ||
      (titleA?.getAttribute('href') || '').match(/\/subject\/(\d+)/)?.[1] ||
      '';
    if (!subjectId) continue;

    const thumbImg = li.querySelector('img');
    const rawThumb = normUrl(thumbImg?.getAttribute('src'));
    const panel = doc.getElementById(`subjectPanel_${subjectId}`);
    const panelImg = panel?.querySelector('.pictureFrameGroup img');
    const rawPanelCover = normUrl(panelImg?.getAttribute('src'));
    const cover = upgradeCoverUrl(rawPanelCover || rawThumb || '');

    const progText = li.querySelector('small.progress_percent_text, .progress_percent_text')?.textContent?.trim() || '';
    let cleanTitle = '';
    if (titleA) {
      const titleClone = titleA.cloneNode(true);
      titleClone.querySelectorAll('small, .progress_percent_text, .onAir').forEach((n) => n.remove());
      cleanTitle = titleClone.textContent || '';
    }
    const title =
      cleanTitle.replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim() ||
      (titleA?.getAttribute('data-original-title') || titleA?.getAttribute('title') || '').replace(/<[^>]+>/g, '').trim() ||
      `条目 #${subjectId}`;
    const subjectUrl = titleA?.getAttribute('href') || `/subject/${subjectId}`;
    const progMatch = progText.match(/(\d+)\s*\/\s*(\d+|\?+)/);
    const watched = progMatch ? parseInt(progMatch[1], 10) : 0;
    const total = progMatch && /^\d+$/.test(progMatch[2]) ? parseInt(progMatch[2], 10) : 0;
    const onAir = Boolean(li.querySelector('.onAir'));

    const checkInA = li.querySelector('a.prgCheckIn');
    let nextEp = checkInA
      ? {
          epId: checkInA.getAttribute('ep_id') || checkInA.id.replace(/^prg_/, ''),
          label: checkInA.textContent.replace(/\s+/g, ' ').trim(),
          href: checkInA.getAttribute('href') || '',
        }
      : null;

    // 解析章节矩阵
    const episodes = [];
    if (panel) {
      let currentGroup = '本篇';
      panel.querySelectorAll('ul.prg_list > li').forEach((epLi) => {
        if (epLi.classList.contains('subtitle')) {
          currentGroup = epLi.textContent.trim() || '本篇';
          return;
        }
        const a = epLi.querySelector('a.load-epinfo, a[id^="prg_"]');
        if (!a) return;
        const epId = a.getAttribute('ep_id') || a.id.replace(/^prg_/, '');
        const num = a.textContent.trim();
        const status = parseEpStatusClass(a.className || '');
        const relSel = a.getAttribute('rel');
        const infoEl = (relSel ? doc.querySelector(relSel) : null) || doc.getElementById(`prginfo_${epId}`);
        const infoTitle = infoEl?.querySelector('.ep_title, h3, strong')?.textContent?.trim() || a.getAttribute('title') || `第 ${num} 话`;
        const infoTip = infoEl?.querySelector('.tip')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const epHref = a.getAttribute('href') || `/ep/${epId}`;
        episodes.push({
          epId,
          num,
          group: currentGroup,
          status,
          title: infoTitle,
          meta: infoTip,
          href: epHref,
        });
      });
    }

    if (episodes.length) {
      const curNextInList = nextEp ? episodes.find((e) => e.epId === nextEp.epId) : null;
      const nextNumMatch = nextEp?.label?.match(/ep\.(\d+)/i);
      const nextEpNum = nextNumMatch ? parseInt(nextNumMatch[1], 10) : NaN;
      if (
        !nextEp ||
        curNextInList?.status === 'watched' ||
        (Number.isFinite(nextEpNum) && watched > 0 && nextEpNum <= watched)
      ) {
        const mainEps = episodes.filter((e) => e.group === '本篇');
        const pool = mainEps.length ? mainEps : episodes;
        const candidate =
          pool.find((e) => {
            const n = parseInt(e.num, 10);
            return e.status !== 'watched' && e.status !== 'drop' && (!Number.isFinite(n) || n > watched);
          }) || pool.find((e) => e.status !== 'watched' && e.status !== 'drop');
        if (candidate) {
          nextEp = {
            epId: candidate.epId,
            label: `ep.${candidate.num} 看过`,
            href: candidate.href,
          };
        } else if (curNextInList?.status === 'watched') {
          nextEp = null;
        }
      }
    }

    const batchFormEl = panel?.querySelector('form.prgBatchManagerForm');
    const batchForm = batchFormEl
      ? {
          action: batchFormEl.getAttribute('action') || `/subject/set/watched/${subjectId}`,
          formhash: batchFormEl.querySelector('input[name="formhash"]')?.value || '',
          watchedEps: batchFormEl.querySelector('input[name="watched_eps"]')?.value || String(watched),
          watchedVols: batchFormEl.querySelector('input[name="watched_vols"]')?.value ?? null,
        }
      : null;

    const editA = panel?.querySelector('a.thickbox[id^="sbj_prg_"], a[href*="/interest/"]');
    const watchingCount = panel?.querySelector('small.tip_j')?.textContent?.trim() || '';

    subjects.push({
      id: subjectId,
      type: subjectType,
      title,
      subjectUrl,
      cover,
      watched,
      total,
      progText,
      onAir,
      nextEp,
      episodes,
      batchForm,
      editHref: editA?.getAttribute('href') || `/subject/${subjectId}`,
      watchingCount,
    });
  }

  // 今日放送 (#home_calendar)
  const calendarItems = parseCalendarItems(doc);

  // 热门小组话题 (#home_grp_tpc) & 热门条目讨论 (#home_subject_tpc)
  // 侧翼话题：只接受真正指向话题/条目/单集的链接，且标题必须有实质文字，
  // 避免把计数徽章（如 "+12"）之类的短文本误当成话题标题。
  const parseSideTopics = (id) => {
    const out = [];
    const seen = new Set();
    const roots = Array.from(doc.querySelectorAll(`${id} ul.sideTpcList > li, ${id} .sideTpcList > li`));
    // 原站容器被改名搬进 vault 后 #id 选择器失效，改走 findLegacyEl 兜底
    if (!roots.length) {
      const legacy = findLegacyEl(doc, id.replace(/^#/, ''));
      if (legacy) roots.push(...legacy.querySelectorAll('ul.sideTpcList > li, .sideTpcList > li'));
    }
    roots.forEach((li) => {
      const links = Array.from(li.querySelectorAll('a[href]'));
      // 真站 li 里第一个匹配 href 的往往是头像链接（无文字），必须按「有实质标题的最长锚点」挑选
      let mainA = null;
      let bestLen = 0;
      links.forEach((a) => {
        if (!/\/group\/topic\/|\/subject\/topic\/|\/ep\/|\/subject\/\d+\/board/.test(a.getAttribute('href') || '')) return;
        const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (t.length >= 4 && t.length > bestLen) {
          bestLen = t.length;
          mainA = a;
        }
      });
      if (!mainA) return;
      const href = mainA.getAttribute('href') || '';
      const title = (mainA.textContent || '').replace(/\s+/g, ' ').trim();
      if (!href || href === '#') return;
      if (title.length < 4) return;
      if (/^[\s+\-()（）\d]+$/.test(title)) return;
      if (seen.has(href)) return;
      seen.add(href);
      const avaSpan = li.querySelector('span.avatarNeue, .avatar [style*="background-image"], [style*="background-image"]');
      const avaImg = li.querySelector('img');
      const rawAva =
        parseBgUrl(avaSpan) ||
        normUrl(avaImg?.getAttribute('src')) ||
        '';
      const avatar = upgradeUserAvatarUrl(rawAva) || 'https://lain.bgm.tv/pic/user/l/icon.jpg';
      const author = avaSpan?.getAttribute('title')?.trim() || li.getAttribute('data-item-user')?.trim() || '';
      const replyCount = li.querySelector('small.grey')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const sourceName = li.querySelector('p.info .tip, .inner .tip')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const metaParts = [sourceName || author, replyCount].filter(Boolean);
      out.push({
        title,
        href,
        avatar,
        author,
        sourceName,
        replyCount,
        meta: metaParts.join(' · '),
      });
    });
    return out;
  };

  // 公告 (#home_announcement) —— 容器可能已被 dom-vault 改名为 bgm-legacy-home_announcement
  const announcements = [];
  const annRoot = findLegacyEl(doc, 'home_announcement');
  const annItems = annRoot
    ? Array.from(annRoot.querySelectorAll('li'))
    : Array.from(doc.querySelectorAll('#home_announcement li'));
  annItems.forEach((li) => {
    const a = li.querySelector('a[href]');
    if (!a) return;
    const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (title.length < 4) return;
    announcements.push({
      title,
      href: a.getAttribute('href') || '#',
      date: (li.textContent || '').match(/\d{4}[\.\-/]\d{1,2}[\.\-/]\d{1,2}/)?.[0] || '',
    });
  });

  // 时间线 (#home_tml)
  const sayFormEl = findLegacyEl(doc, 'SayFrom') || doc.querySelector('#SayFrom, form[action*="/timeline"]');
  const sayForm = sayFormEl
    ? {
        action: sayFormEl.getAttribute('action') || '/timeline?ajax=1',
        formhash: sayFormEl.querySelector('input[name="formhash"]')?.value || '',
      }
    : null;

  const tmlTabs = [];
  const tmlTabsRoot = findLegacyEl(doc, 'timelineTabs') || doc;
  tmlTabsRoot.querySelectorAll('a[href]').forEach((a) => {
    if (tmlTabsRoot === doc && !a.closest('#timelineTabs')) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('javascript')) return;
    tmlTabs.push({
      id: a.id || '',
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href,
      active: a.classList.contains('focus'),
    });
  });

  let timelineItems = parseTimelineItems(findLegacyEl(doc, 'timeline') || findLegacyEl(doc, 'home_tml') || doc);
  if (!timelineItems.length) {
    timelineItems = parseCompactTimeline(doc);
  }

  return {
    subjects,
    calendarItems: calendarItems.slice(0, 16),
    groupTopics: parseSideTopics('#home_grp_tpc').slice(0, 12),
    subjectTopics: parseSideTopics('#home_subject_tpc').slice(0, 12),
    announcements: announcements.slice(0, 8),
    sayForm,
    tmlTabs,
    timelineItems,
  };
}

/**
 * 解析 P02 游客首页 / 登录 / 注册页真站 DOM
 */
export function extractGuestOrAuthData(doc, route) {
  const pathname = typeof location !== 'undefined' ? location.pathname : '';
  let mode = 'guest';
  if (pathname.startsWith('/signup')) mode = 'signup';
  else if (pathname.startsWith('/login') || pathname.startsWith('/oauth')) mode = 'login';
  else if (route?.slug === 'login') mode = 'login';
  else if (route?.slug === 'signup') mode = 'signup';

  const featured = [];
  doc.querySelectorAll('#featuredItems > li, #featuredItems .item').forEach((li) => {
    const a = li.querySelector('a[href*="/subject/"]');
    if (!a) return;
    const img = li.querySelector('img');
    const bg = parseBgUrl(li.querySelector('[style*="background-image"]')) || parseBgUrl(a);
    featured.push({
      title: a.getAttribute('title') || li.querySelector('.title, h3')?.textContent?.trim() || a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      cover: upgradeCoverUrl(normUrl(img?.getAttribute('src')) || bg),
      meta: li.querySelector('.tip, small')?.textContent?.trim() || '',
    });
  });

  const calendarItems = parseCalendarItems(doc);

  const announcements = [];
  const guestAnnRoot = findLegacyEl(doc, 'home_announcement');
  const guestAnnItems = guestAnnRoot
    ? Array.from(guestAnnRoot.querySelectorAll('li'))
    : Array.from(doc.querySelectorAll('#home_announcement li'));
  guestAnnItems.forEach((li) => {
    const a = li.querySelector('a[href]');
    if (a) announcements.push({ title: a.textContent.trim(), href: a.getAttribute('href') || '#' });
  });

  const slides = [];
  doc.querySelectorAll('#sliderSequence > div, #sliderNav li').forEach((el) => {
    const h = el.querySelector('h2, h3, strong')?.textContent?.trim();
    const p = Array.from(el.querySelectorAll('p')).map((n) => n.textContent.trim()).filter(Boolean);
    if (h) slides.push({ heading: h, lines: p });
  });

  // 真站 #home_tml 在首页侧栏是 ul.timeline_img 紧凑结构，先用紧凑解析，
  // 若为空再回落到标准 li.tml_item 解析器（/timeline 页面结构）。
  let timelineItems = parseCompactTimeline(doc);
  if (!timelineItems.length) {
    timelineItems = parseTimelineItems(findLegacyEl(doc, 'home_tml') || findLegacyEl(doc, 'timeline') || doc);
  }

  const authHeading = doc.querySelector('#columnLoginA h1, #main h1, .title')?.textContent?.trim() || (mode === 'signup' ? '注册 Bangumi 账号' : '登录 Bangumi 番组计划');

  return {
    mode,
    authHeading,
    slides,
    featured: featured.slice(0, 18),
    calendarItems: calendarItems.slice(0, 12),
    announcements: announcements.slice(0, 6),
    timelineItems: timelineItems.slice(0, 10),
    hasLoginForm: Boolean(doc.getElementById('loginForm')),
    hasSignupForm: Boolean(doc.querySelector('form[name="signup"], form[action*="/signup"]')),
  };
}
