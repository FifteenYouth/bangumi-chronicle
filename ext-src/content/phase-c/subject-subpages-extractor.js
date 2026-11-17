/**
 * Bangumi Chronicle · Phase C (C2 + C3) 条目子页面真站 DOM 提取器 (subject-subpages-extractor.js)
 * 覆盖：
 * - P05 条目章节批量管理 (/subject/{id}/ep)
 * - P06 单集讨论详情 (/ep/{id})
 * - P07 条目登场角色列表 (/subject/{id}/characters)
 * - P08 条目制作人员列表 (/subject/{id}/persons)
 * - P09 条目漫友吐槽箱 (/subject/{id}/comments)
 * - P10 条目长评与讨论版 (/subject/{id}/reviews, /subject/{id}/board)
 * - P11 条目收藏统计与透视 (/subject/{id}/stats)
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
  if (!u || /info_only\.png/i.test(u)) return 'https://lain.bgm.tv/pic/user/l/icon.jpg';
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

/**
 * 共享：提取条目子页顶栏信息 (#headerSubject + 右栏 #subject_inner_info 缩略封面)
 */
export function extractSubjectSubpageHeader(doc, route = {}) {
  const hs = findEl(doc, 'headerSubject') || doc.getElementById('headerSubject');
  const titleA = hs?.querySelector('h1 a[property="v:itemreviewed"], h1 a') || doc.querySelector('h1.nameSingle a');
  const subjectId =
    route?.params?.subjectId ||
    titleA?.getAttribute('href')?.match(/\/subject\/(\d+)/)?.[1] ||
    '';

  const titleJp = titleA?.textContent?.trim() || `条目 #${subjectId}`;
  const titleCn = titleA?.getAttribute('title')?.trim() || '';
  const typeLabel = hs?.querySelector('h1 small.grey')?.textContent?.trim() || '条目';

  const navTabs = [];
  hs?.querySelectorAll('ul.navTabs > li > a').forEach((a) => {
    navTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const sideImg = doc.querySelector('#subject_inner_info img.avatar, #columnInSubjectB img.avatar, #columnEpB img.avatar');
  const rawCover = normUrl(sideImg?.getAttribute('src') || '');
  const cover = rawCover && !/no_icon_subject/i.test(rawCover) ? upgradeCoverUrl(rawCover) : '';

  return {
    id: subjectId,
    titleJp,
    titleCn,
    typeLabel,
    navTabs,
    cover,
  };
}

/**
 * C2 · P05 条目章节批量管理 (/subject/{id}/ep)
 */
export function extractSubjectEpData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const episodes = [];
  let currentCat = '本篇';

  doc.querySelectorAll('ul.line_list > li').forEach((li) => {
    if (li.classList.contains('cat')) {
      currentCat = li.textContent.trim() || '本篇';
      return;
    }
    const h6A = li.querySelector('h6 a[href*="/ep/"]');
    if (!h6A) return;
    const href = h6A.getAttribute('href') || '#';
    const epId = href.match(/\/ep\/(\d+)/)?.[1] || '';
    const rawTitle = h6A.textContent.trim();
    const numMatch = rawTitle.match(/^(\d+(?:\.\d+)?)\.(.*)$/);
    const num = numMatch ? numMatch[1] : String(episodes.length + 1);
    const titleJp = numMatch ? numMatch[2].trim() : rawTitle;
    const titleCn = li.querySelector('h6 span.tip')?.textContent?.replace(/^\s*\/\s*/, '')?.trim() || '';

    const statusSpan = li.querySelector('.epAirStatus span');
    const airStatus = statusSpan?.className || 'Air';

    const greys = Array.from(li.querySelectorAll('small.grey')).map((s) => s.textContent.trim());
    const metaText = greys.join(' ');
    const durMatch = metaText.match(/时长:\s*([^/\s]+)/);
    const dateMatch = metaText.match(/首播:\s*([^/\s]+)/);
    const cmtMatch = metaText.match(/讨论:\s*\+?(\d+)/);

    const statusLinks = [];
    li.querySelectorAll('.listEpPrgManager a[href], cite a[href*="status"]').forEach((a) => {
      statusLinks.push({
        label: a.textContent.trim(),
        href: a.getAttribute('href') || '',
      });
    });

    episodes.push({
      epId,
      num,
      cat: currentCat,
      rawTitle,
      titleJp,
      titleCn,
      airStatus,
      duration: durMatch ? durMatch[1] : '',
      airDate: dateMatch ? dateMatch[1] : '',
      discussCount: cmtMatch ? parseInt(cmtMatch[1], 10) : 0,
      href,
      statusLinks,
    });
  });

  const editLinks = [];
  doc.querySelectorAll('#columnInSubjectB a.l[href]').forEach((a) => {
    const label = a.textContent.trim();
    const href = a.getAttribute('href') || '';
    if (label && href && !href.startsWith('javascript')) {
      editLinks.push({ label, href });
    }
  });

  return {
    header,
    episodes,
    editLinks,
  };
}

/**
 * C2 · P06 单集讨论详情 (/ep/{id})
 */
export function extractEpDetailData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const epId =
    route?.params?.epId ||
    (typeof location !== 'undefined' ? location.pathname.match(/\/ep\/(\d+)/)?.[1] : '') ||
    '';

  const h2El = doc.querySelector('#columnEpA h2.title');
  const h2Clone = h2El?.cloneNode(true);
  h2Clone?.querySelectorAll('small')?.forEach((n) => n.remove());
  const epTitle = h2Clone?.textContent?.trim() || `ep.${epId}`;

  const descEl = doc.querySelector('#columnEpA .epDesc');
  const tipText = descEl?.querySelector('.tip')?.textContent?.trim() || '';
  const descClone = descEl?.cloneNode(true);
  descClone?.querySelector('.tip')?.remove();
  const descHtml = (descClone?.innerHTML || '').replace(/^(?:\s*<br\s*\/?>\s*)+/i, '').trim();

  const parseReplyRow = (row) => {
    const id = row.id || '';
    const floor = row.querySelector('a.floor-anchor')?.textContent?.trim() || '';
    const reInfo = row.querySelector('.re_info small')?.textContent?.trim() || '';
    const timeMatch = reInfo.match(/\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/);
    const userA = row.querySelector('strong a.l[href*="/user/"], a.avatar[href*="/user/"]');
    const user = userA?.textContent?.trim() || row.getAttribute('data-item-user') || '漫友';
    const userHref = userA?.getAttribute('href') || '#';
    const avaSpan = row.querySelector('span.avatarNeue, [style*="background-image"]');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan));
    const msgEl = row.querySelector('.message, .cmt_sub_content');
    const messageHtml = msgEl?.innerHTML?.trim() || '';

    const subReplies = [];
    row.querySelectorAll('.topic_sub_reply > div.sub_reply_bg').forEach((sub) => {
      const subUserA = sub.querySelector('strong a.l[href*="/user/"]');
      const subAvaSpan = sub.querySelector('span.avatarNeue, [style*="background-image"]');
      const subReInfo = sub.querySelector('.re_info small')?.textContent?.trim() || '';
      const subTime = subReInfo.match(/\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/)?.[0] || '';
      const subFloor = sub.querySelector('a.floor-anchor')?.textContent?.trim() || '';
      const subMsg = sub.querySelector('.cmt_sub_content')?.innerHTML?.trim() || '';
      if (subMsg) {
        subReplies.push({
          id: sub.id || '',
          floor: subFloor,
          time: subTime,
          user: subUserA?.textContent?.trim() || sub.getAttribute('data-item-user') || '漫友',
          userHref: subUserA?.getAttribute('href') || '#',
          avatar: upgradeAvatarUrl(parseBgUrl(subAvaSpan)),
          messageHtml: subMsg,
        });
      }
    });

    return {
      id,
      floor,
      time: timeMatch ? timeMatch[0] : '',
      user,
      userHref,
      avatar,
      messageHtml,
      subReplies,
    };
  };

  const comments = [];
  doc.querySelectorAll('#comment_list > div.row_reply').forEach((row) => {
    const parsed = parseReplyRow(row);
    if (parsed.messageHtml) comments.push(parsed);
  });

  const sideEps = [];
  doc.querySelectorAll('#columnEpB ul.sideEpList > li, .sideEpList > li').forEach((li) => {
    const a = li.querySelector('a[href]');
    if (!a) return;
    sideEps.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      current: li.classList.contains('cur') || a.classList.contains('focus'),
    });
  });

  const replyFormEl = doc.querySelector('#ReplyForm, form[action*="/ep/"]');
  const replyForm = replyFormEl
    ? {
        action: replyFormEl.getAttribute('action') || `/subject/ep/${epId}/new_reply`,
        formhash: replyFormEl.querySelector('input[name="formhash"]')?.value || '',
        lastview: replyFormEl.querySelector('input[name="lastview"]')?.value || '',
      }
    : null;

  return {
    header,
    epId,
    epTitle,
    tipText,
    descHtml,
    comments,
    sideEps,
    replyForm,
  };
}

/**
 * C2 · P07 条目登场角色列表 (/subject/{id}/characters)
 */
export function extractSubjectCharactersData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const characters = [];

  doc.querySelectorAll('#columnInSubjectA div.item, #browserItemList > div.item').forEach((item) => {
    const titleA = item.querySelector('h2 a.l[href*="/character/"], h2 a[href*="/character/"]');
    if (!titleA) return;
    const href = titleA.getAttribute('href') || '#';
    const id = href.match(/\/character\/(\d+)/)?.[1] || '';
    const nameJp = titleA.textContent.trim();
    const nameCn = item.querySelector('h2 span.tip')?.textContent?.replace(/^\s*\/\s*/, '')?.trim() || '';
    const avaImg = item.querySelector('a.avatar img, img.avatar');
    const avaSpan = item.querySelector('span.avatarNeue');
    const avatar = upgradeAvatarUrl(avaImg?.getAttribute('src') || parseBgUrl(avaSpan) || '');
    const role = item.querySelector('.badge_job_tip')?.textContent?.trim() || '角色';
    const commentCount = item.querySelector('.rr small.primary, .rr small')?.textContent?.trim() || '';

    const infoClone = item.querySelector('.crt_info .tip')?.cloneNode(true);
    infoClone?.querySelector('.badge_job_tip')?.remove();
    const infoText = infoClone?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

    const actors = [];
    item.querySelectorAll('.actorBadge').forEach((ab) => {
      const pA = ab.querySelector('p a.l[href*="/person/"], a[href*="/person/"]:not(.avatar)');
      const pImg = ab.querySelector('img.avatar, img');
      const tag = ab.querySelector('span.tip_j')?.textContent?.trim() || 'CV';
      if (pA) {
        actors.push({
          name: pA.textContent.trim(),
          href: pA.getAttribute('href') || '#',
          avatar: upgradeAvatarUrl(pImg?.getAttribute('src') || ''),
          tag,
        });
      }
    });

    characters.push({
      id,
      href,
      nameJp,
      nameCn,
      avatar,
      role,
      infoText,
      commentCount,
      actors,
    });
  });

  return {
    header,
    characters,
  };
}

/**
 * C2 · P08 条目制作人员列表 (/subject/{id}/persons)
 */
export function extractSubjectPersonsData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const secTabs = [];
  doc.querySelectorAll('#SecTab ul.secTab > li > a').forEach((a) => {
    secTabs.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('selected') || a.classList.contains('focus'),
    });
  });

  const persons = [];
  doc.querySelectorAll('#columnInSubjectA > div.light_odd, #columnInSubjectA > div.light_even').forEach((div) => {
    const h2A = div.querySelector('h2 a[href*="/person/"]');
    if (!h2A) return;
    const href = h2A.getAttribute('href') || '#';
    const id = href.match(/\/person\/(\d+)/)?.[1] || '';
    const h2Clone = h2A.cloneNode(true);
    const tipEl = h2Clone.querySelector('span.tip');
    const nameCn = tipEl?.textContent?.replace(/^\s*\/\s*/, '')?.trim() || '';
    tipEl?.remove();
    const nameJp = h2Clone.textContent.trim();

    const avaImg = div.querySelector('img.avatar, a.avatar img');
    const avatar = upgradeAvatarUrl(avaImg?.getAttribute('src') || '');
    const commentCount = div.querySelector('.rr small')?.textContent?.trim() || '';

    const jobs = [];
    div.querySelectorAll('.prsn_info span.badge_job').forEach((bj) => {
      const jobName = bj.textContent.trim();
      const nextTip = bj.nextElementSibling;
      const eps = nextTip?.classList?.contains('tip') ? nextTip.textContent.trim() : '';
      if (jobName) jobs.push({ job: jobName, eps });
    });

    persons.push({
      id,
      href,
      nameJp,
      nameCn,
      avatar,
      commentCount,
      jobs,
    });
  });

  return {
    header,
    secTabs,
    persons,
  };
}

/**
 * C3 · P09 条目漫友吐槽箱 (/subject/{id}/comments)
 */
export function extractSubjectCommentsData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const secTabs = [];
  doc.querySelectorAll('#SecTab ul.secTab > li > a').forEach((a) => {
    secTabs.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('selected') || a.classList.contains('focus'),
    });
  });

  const comments = [];
  doc.querySelectorAll('#comment_box > div.item, #bgm-legacy-comment_box > div.item').forEach((it, idx) => {
    const userA = it.querySelector('.text a.l[href*="/user/"], a[href*="/user/"]');
    const user = userA?.textContent?.trim() || it.getAttribute('data-item-user') || '漫友';
    const userHref = userA?.getAttribute('href') || '#';
    const avaSpan = it.querySelector('span.avatarNeue, [style*="background-image"]');
    const avaImg = it.querySelector('img');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');
    const starEl = it.querySelector('.starlight');
    const starMatch = (starEl?.className || '').match(/stars(\d+)/);
    const star = starMatch ? parseInt(starMatch[1], 10) : 0;

    const greys = Array.from(it.querySelectorAll('small.grey')).map((s) => s.textContent.trim());
    const statusText = greys.find((g) => !g.startsWith('@')) || '';
    const timeText = (greys.find((g) => g.startsWith('@')) || greys[greys.length - 1] || '').replace(/^@\s*/, '').trim();
    const text = it.querySelector('p.comment')?.textContent?.trim() || '';

    if (text) {
      comments.push({
        id: String(idx + 1),
        user,
        userHref,
        avatar,
        star,
        statusText,
        time: timeText,
        text,
      });
    }
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
    header,
    secTabs,
    comments,
    pagerLinks,
  };
}

/**
 * C3 · P10 条目长评与讨论版 (/subject/{id}/reviews, /subject/{id}/board)
 */
export function extractSubjectReviewsBoardData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);
  const isBoard =
    route?.params?.subSection === 'board' ||
    (typeof location !== 'undefined' && location.pathname.endsWith('/board')) ||
    Boolean(doc.querySelector('table.topic_list') && !doc.querySelector('#entry_list'));

  const reviews = [];
  doc.querySelectorAll('#entry_list div.item, #bgm-legacy-entry_list div.item').forEach((it) => {
    const titleA = it.querySelector('h2.title a') || it.querySelector('.entry h2 a');
    if (!titleA) return;
    const href = titleA.getAttribute('href') || '#';
    const title = titleA.textContent.trim();
    const img = it.querySelector('img.avatarCover, img');
    const avatar = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const timeDiv = it.querySelector('.tools .time, .time');
    const userA = timeDiv?.querySelector('a[href*="/user/"]');
    const replyA = timeDiv?.querySelector('a[href*="/blog/"]');
    const rawTime = timeDiv?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const dateMatch = rawTime.match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?/);
    const excerpt = (it.querySelector('.content')?.textContent || '').replace(/\s+/g, ' ').trim();

    reviews.push({
      title,
      href,
      user: userA?.textContent?.trim() || '漫友',
      userHref: userA?.getAttribute('href') || '#',
      avatar,
      time: dateMatch ? dateMatch[0] : '',
      replies: replyA?.textContent?.trim() || '0 回复',
      excerpt,
    });
  });

  const topics = [];
  doc.querySelectorAll('table.topic_list tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 3) return;
    const subjA = tds[0].querySelector('a[href]');
    if (!subjA) return;
    const userA = tds[1]?.querySelector('a[href]');
    topics.push({
      title: subjA.textContent.trim(),
      href: subjA.getAttribute('href') || '#',
      user: userA?.textContent?.trim() || tds[1]?.textContent?.trim() || '',
      userHref: userA?.getAttribute('href') || '#',
      replies: tds[2]?.textContent?.trim() || '0',
      time: tds[3]?.textContent?.trim() || '',
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
    header,
    mode: isBoard ? 'board' : 'reviews',
    reviews,
    topics,
    pagerLinks,
  };
}

/**
 * C3 · P11 条目收藏统计与透视 (/subject/{id}/stats)
 */
export function extractSubjectStatsData(doc, route = {}) {
  const header = extractSubjectSubpageHeader(doc, route);

  const statBlocks = [];
  doc.querySelectorAll('#columnInSubjectA .gridStats, .gridStats').forEach((gs, gIdx) => {
    const prevH2 = gs.previousElementSibling;
    const blockTitle = prevH2?.tagName === 'H2' ? prevH2.textContent.trim() : gIdx === 0 ? '总体收藏统计' : 'VIB 评价统计';
    const items = [];
    gs.querySelectorAll('.item').forEach((it) => {
      const cls = it.className || '';
      const color = ['green', 'blue', 'orange', 'purple', 'sky'].find((c) => cls.includes(c)) || 'default';
      items.push({
        num: it.querySelector('.num')?.textContent?.trim() || '0',
        desc: it.querySelector('.desc')?.textContent?.trim() || '',
        color,
      });
    });
    if (items.length) statBlocks.push({ title: blockTitle, items });
  });

  // 解析页面内联 CHART_SETS 脚本数据
  let chartSets = null;
  doc.querySelectorAll('script').forEach((sc) => {
    const txt = sc.textContent || '';
    const m = txt.match(/CHART_SETS\s*=\s*(\{[\s\S]*?\});/);
    if (m && !chartSets) {
      try {
        chartSets = JSON.parse(m[1]);
      } catch {}
    }
  });

  return {
    header,
    statBlocks,
    chartSets,
  };
}
