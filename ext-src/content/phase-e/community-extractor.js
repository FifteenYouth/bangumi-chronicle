/**
 * Bangumi Chronicle · Phase E (E1 + E2) 社区、人物、阅读与实验室真站 DOM 提取器 (community-extractor.js)
 * 覆盖：
 * - P18 人物频道聚合 (/mono, /character, /person, /user/{uid}/mono*)
 * - P19 角色与人物详情 (/character/{id}*, /person/{id}*)
 * - P20 超展开阅读器 (/rakuen, /rakuen/topiclist, /rakuen/topic/{type}/{id})
 * - P21 小组首页/发现/讨论列表 (/group, /group/discover, /group/{slug}*)
 * - P22 小组与条目话题讨论楼 (/group/topic/{id}, /subject/topic/{id})
 * - P23 日志广场与日志详情 (/blog, /{type}/blog, /blog/{id}, /user/{uid}/blog)
 * - P24 目录广场与目录详情 (/index, /index/browser, /index/{id}*, /user/{uid}/index*)
 * - P29 维基人 / MAGI 问答 / Dollars (/wiki, /magi*, /dollars)
 */

import { upgradeCoverUrl } from '../cover-upgrader.js';
import { parseBrowserItemList } from '../phase-d/discovery-extractor.js';

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

function parseReplyFloors(doc) {
  const comments = [];
  const root = findEl(doc, 'comment_list') || doc.getElementById('comment_list') || doc;
  root.querySelectorAll(':scope > div.row_reply, div.row_reply').forEach((row) => {
    if (row.closest('.topic_sub_reply')) return;
    const id = row.id || '';
    const floor = row.querySelector('a.floor-anchor')?.textContent?.trim() || '';
    const reInfo = row.querySelector('.re_info small, .post_actions small')?.textContent?.trim() || '';
    const timeMatch = reInfo.match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?/);
    const userA = row.querySelector('strong a.l[href*="/user/"], a.avatar[href*="/user/"]');
    const user = userA?.textContent?.trim() || row.getAttribute('data-item-user') || '漫友';
    const userHref = userA?.getAttribute('href') || '#';
    const avaSpan = row.querySelector('span.avatarNeue, [style*="background-image"]');
    const avaImg = row.querySelector('a.avatar img');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');
    const msgEl = row.querySelector('.message, .cmt_sub_content, .reply_content');
    const messageHtml = msgEl?.innerHTML?.trim() || '';

    const subReplies = [];
    row.querySelectorAll('.topic_sub_reply > div.sub_reply_bg').forEach((sub) => {
      const subUserA = sub.querySelector('strong a.l[href*="/user/"]');
      const subAvaSpan = sub.querySelector('span.avatarNeue, [style*="background-image"]');
      const subReInfo = sub.querySelector('.re_info small')?.textContent?.trim() || '';
      const subTime = subReInfo.match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?/)?.[0] || '';
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

    if (messageHtml) {
      comments.push({
        id,
        floor,
        time: timeMatch ? timeMatch[0] : '',
        user,
        userHref,
        avatar,
        messageHtml,
        subReplies,
      });
    }
  });
  return comments;
}

/**
 * E1 · P18 人物频道聚合提取器 (/mono, /character, /person, /user/{uid}/mono*)
 */
export function extractMonoChannelData(doc) {
  const heading = doc.querySelector('#header h1, #headerProfile h1')?.textContent?.trim() || '人物频道';
  const subTabs = [];
  doc.querySelectorAll('#header ul.navSubTabs > li > a, ul.navSubTabs > li > a').forEach((a) => {
    subTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const sections = [];
  const colA = findEl(doc, 'columnSubjectBrowserA') || doc.getElementById('columnSubjectBrowserA') || doc;
  colA.querySelectorAll('.section').forEach((sec) => {
    const title = sec.querySelector('h2')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const items = [];
    sec.querySelectorAll('ul.coversSmall > li').forEach((li) => {
      const aList = li.querySelectorAll('a[href]');
      if (!aList.length) return;
      const href = aList[0].getAttribute('href') || '#';
      const name = (aList[1]?.textContent || aList[0].getAttribute('title') || '').trim();
      const cnName = li.querySelector('p.info')?.textContent?.trim() || '';
      const img = li.querySelector('img');
      const avatar = upgradeAvatarUrl(img?.getAttribute('src') || '');
      if (name) items.push({ name, cnName, href, avatar });
    });
    if (items.length) sections.push({ title, items });
  });

  // 列表模式 (.browserCrtList > div[id^="item_"] or ul.coversSmall > li)
  const listItems = [];
  colA.querySelectorAll('.browserCrtList > div[id^="item_"]').forEach((node) => {
    const a = node.querySelector('h3 a.l, a[href*="/character/"], a[href*="/person/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const name = a.textContent.trim();
    const img = node.querySelector('a.avatar img, img');
    const avatar = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const info = node.querySelector('.prsn_info .tip')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const commentCount = node.querySelector('small.na')?.textContent?.trim() || '';
    if (name) listItems.push({ name, cnName: info, href, avatar, commentCount });
  });

  if (!sections.length && !listItems.length) {
    colA.querySelectorAll('ul.coversSmall > li').forEach((li) => {
      const aList = li.querySelectorAll('a[href]');
      if (!aList.length) return;
      const href = aList[0].getAttribute('href') || '#';
      const name = (aList[1]?.textContent || aList[0].getAttribute('title') || aList[0].textContent || '').trim();
      const img = li.querySelector('img');
      const bg = parseBgUrl(li.querySelector('[style*="background-image"]'));
      const avatar = upgradeAvatarUrl(img?.getAttribute('src') || bg || '');
      if (name) listItems.push({ name, cnName: '', href, avatar, commentCount: '' });
    });
  }

  const sideGroups = [];
  const colB = findEl(doc, 'columnSubjectBrowserB') || doc.getElementById('columnSubjectBrowserB');
  colB?.querySelectorAll('dl').forEach((dl) => {
    const aList = dl.querySelectorAll('a[href]');
    if (!aList.length) return;
    const href = aList[0].getAttribute('href') || '#';
    const name = (aList[aList.length - 1]?.textContent || aList[0].getAttribute('title') || '').trim();
    const avaSpan = dl.querySelector('span.avatarNeue');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan));
    if (name) sideGroups.push({ name, href, avatar });
  });

  const facetGroups = [];
  colB?.querySelectorAll('.sideInner ul.grouped').forEach((ul) => {
    const prev = ul.previousElementSibling;
    const h2Title = prev?.tagName === 'H2' ? prev.textContent.replace(/\s+/g, ' ').trim() : '';
    const title = h2Title || ul.querySelector('li.subtitle')?.textContent?.replace(/\s+/g, ' ')?.trim() || '分类筛选';
    const links = [];
    ul.querySelectorAll('li:not(.subtitle) a[href]').forEach((a) => {
      const label = a.textContent.trim();
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

  return {
    heading,
    subTabs,
    sections,
    listItems,
    sideGroups: sideGroups.slice(0, 18),
    facetGroups,
    pagerLinks: parsePagerLinks(doc),
  };
}

/**
 * E1 · P19 角色与人物详情提取器 (/character/{id}*, /person/{id}*)
 */
export function extractMonoDetailData(doc, route = {}) {
  const hs = findEl(doc, 'headerSubject') || doc.getElementById('headerSubject');
  const titleA = hs?.querySelector('h1 a') || doc.querySelector('h1.nameSingle a');
  const href = titleA?.getAttribute('href') || '';
  const kind = route?.params?.kind || (href.includes('/person/') ? 'person' : 'character');
  const id = route?.params?.monoId || href.match(/\/(?:character|person)\/(\d+)/)?.[1] || '';

  const nameJp = titleA?.textContent?.trim() || `#${id}`;
  const nameCn = hs?.querySelector('h1 small.grey')?.textContent?.trim() || titleA?.getAttribute('title')?.trim() || '';

  const navTabs = [];
  hs?.querySelectorAll('ul.navTabs > li > a').forEach((a) => {
    navTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const collectA = hs?.querySelector('.subjectNav a.collect, a[href*="/collect"]');
  const collectAction = collectA
    ? {
        label: collectA.textContent.replace(/\s+/g, ' ').trim(),
        href: collectA.getAttribute('href') || '',
      }
    : null;

  const colA = findEl(doc, 'columnCrtA') || doc.getElementById('columnCrtA');
  const coverImg = colA?.querySelector('.infobox img.cover, img.cover');
  const cover = upgradeAvatarUrl(coverImg?.getAttribute('src') || '');

  const infobox = [];
  const infoboxUl = findEl(doc, 'infobox') || colA?.querySelector('ul#infobox');
  infoboxUl?.querySelectorAll(':scope > li').forEach((li) => {
    const tipEl = li.querySelector('span.tip');
    const key = tipEl?.textContent?.replace(/[:：\s]+$/g, '')?.trim() || '信息';
    const clone = li.cloneNode(true);
    clone.querySelector('span.tip')?.remove();
    const valHtml = clone.innerHTML.trim();
    if (valHtml) infobox.push({ key, valHtml });
  });

  const colB = findEl(doc, 'columnCrtB') || doc.getElementById('columnCrtB') || doc;
  const detailEl = colB.querySelector('div.detail');
  const detailHtml = detailEl?.innerHTML?.trim() || '';

  const works = [];
  colB.querySelectorAll('ul.browserList > li.item, ul.voiceWorksList > li.item').forEach((li) => {
    const subjA = li.querySelector('h3 a.l, a[href*="/subject/"]:not(.avatar)');
    if (!subjA) return;
    const sHref = subjA.getAttribute('href') || '#';
    const sTitle = subjA.textContent.trim();
    const sOrig = li.querySelector('h3 small.grey')?.textContent?.trim() || '';
    const sImg = li.querySelector('img.cover, a.subjectCover img, img');
    const rawCov = normUrl(sImg?.getAttribute('src') || '');
    const sCover = rawCov && !/no_icon_subject/i.test(rawCov) ? upgradeCoverUrl(rawCov) : '';
    const badges = Array.from(li.querySelectorAll('span.badge_job')).map((b) => b.textContent.trim());
    const info = li.querySelector('p.info.tip, .tip')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    works.push({
      title: sTitle,
      orig: sOrig,
      href: sHref,
      cover: sCover,
      badges,
      info,
    });
  });

  const collectors = [];
  doc.querySelectorAll('#crtPanelCollect ul.groupsLine > li, ul#memberUserList > li').forEach((li) => {
    const uA = li.querySelector('a[href*="/user/"]:not(.avatar)') || li.querySelector('a[href*="/user/"]');
    if (!uA) return;
    const uName = uA.textContent.trim();
    const uHref = uA.getAttribute('href') || '#';
    const avaSpan = li.querySelector('span.avatarNeue');
    const avaImg = li.querySelector('img');
    const uAva = upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');
    const meta = li.querySelector('small.grey, p.info')?.textContent?.trim() || '';
    if (uName) collectors.push({ name: uName, href: uHref, avatar: uAva, meta });
  });

  const comments = parseReplyFloors(doc);
  const replyFormEl = doc.querySelector('#ReplyForm, form[action*="new_reply"]');
  const replyForm = replyFormEl
    ? {
        action: replyFormEl.getAttribute('action') || '',
        formhash: replyFormEl.querySelector('input[name="formhash"]')?.value || '',
        lastview: replyFormEl.querySelector('input[name="lastview"]')?.value || '',
      }
    : null;

  return {
    kind,
    id,
    nameJp,
    nameCn,
    navTabs,
    collectAction,
    cover,
    infobox,
    detailHtml,
    works,
    collectors: collectors.slice(0, 18),
    comments,
    replyForm,
  };
}

/**
 * E1 · P20 超展开话题列表提取器 (/rakuen/topiclist)
 */
export function extractRakuenTopiclistData(doc) {
  const tabs = [];
  doc.querySelectorAll('#rakuenTab a[href], .rakuenTab a[href]').forEach((a) => {
    tabs.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus') || a.classList.contains('selected'),
    });
  });

  const items = [];
  const root = findEl(doc, 'eden_tpc_list') || doc.getElementById('eden_tpc_list') || doc;
  root.querySelectorAll('li.item_list').forEach((li) => {
    const titleA = li.querySelector('.inner a.title, a.title');
    if (!titleA) return;
    const href = titleA.getAttribute('href') || '#';
    const title = titleA.textContent.trim();
    const replies = li.querySelector('.inner small.grey')?.textContent?.trim() || '(+0)';
    const avaSpan = li.querySelector('span.avatarNeue, [style*="background-image"]');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan));
    const parentA = li.querySelector('.inner span.row a');
    const time = li.querySelector('.inner small.time')?.textContent?.replace(/^\./, '')?.trim() || '';
    items.push({
      id: li.id || title,
      title,
      href,
      replies,
      avatar,
      parentLabel: parentA?.textContent?.trim() || '',
      parentHref: parentA?.getAttribute('href') || '#',
      time,
    });
  });

  return { tabs, items };
}

/**
 * E1 · P21 小组首页/发现/讨论列表提取器 (/group, /group/discover, /group/{slug}*)
 */
export function extractGroupPageData(doc) {
  const heading = doc.querySelector('#header h1, #pageHeader h1')?.textContent?.replace(/\s+/g, ' ')?.trim() || '番组小组';

  const hotGroups = [];
  doc.querySelectorAll('ul.groupsLarge > li').forEach((li) => {
    const a = li.querySelector('a[href*="/group/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const title = a.getAttribute('title')?.trim() || li.textContent.split('\n')[0]?.trim() || '';
    const img = li.querySelector('img');
    const icon = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const members = li.querySelector('small.grey, .grey')?.textContent?.trim() || '';
    if (title) hotGroups.push({ title, href, icon, members });
  });

  const sideGroups = [];
  doc.querySelectorAll('ul.groupsSmall > li, ul.groupsLine > li').forEach((li) => {
    const aList = li.querySelectorAll('a[href*="/group/"]');
    if (!aList.length) return;
    const href = aList[0].getAttribute('href') || '#';
    const title = (aList[aList.length - 1]?.textContent || aList[0].getAttribute('title') || '').trim();
    const img = li.querySelector('img');
    const icon = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const members = li.querySelector('small.grey, small.feed')?.textContent?.trim() || '';
    if (title) sideGroups.push({ title, href, icon, members });
  });

  const topics = [];
  doc.querySelectorAll('table.topic_list tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    const topicA = tds[0].querySelector('a[href*="/topic/"], a.l');
    if (!topicA) return;
    const title = topicA.textContent.trim();
    const href = topicA.getAttribute('href') || '#';
    const replies = tds[0].querySelector('small.grey')?.textContent?.trim() || tds[2]?.textContent?.trim() || '';
    const groupA = tds[1]?.querySelector('a[href*="/group/"]');
    const userA = (groupA ? tds[2] : tds[1])?.querySelector('a[href*="/user/"]');
    const date = tds[tds.length - 1]?.textContent?.trim() || '';
    if (title) {
      topics.push({
        title,
        href,
        replies,
        groupName: groupA?.textContent?.trim() || '',
        groupHref: groupA?.getAttribute('href') || '#',
        author: userA?.textContent?.trim() || '',
        authorHref: userA?.getAttribute('href') || '#',
        date,
      });
    }
  });

  return {
    heading,
    hotGroups,
    sideGroups: sideGroups.slice(0, 16),
    topics,
    pagerLinks: parsePagerLinks(doc),
  };
}

/**
 * E1 · P22 小组与条目话题讨论楼提取器 (/group/topic/{id}, /subject/topic/{id}, /rakuen/topic/*)
 */
export function extractTopicDetailData(doc) {
  const ph = findEl(doc, 'pageHeader') || doc.getElementById('pageHeader');
  const h1 = ph?.querySelector('h1') || doc.querySelector('#header h1');
  const parentA = h1?.querySelector('a[href*="/group/"], a[href*="/subject/"], a[href]');
  const parentName = parentA?.textContent?.trim() || '讨论区';
  const parentHref = parentA?.getAttribute('href') || '/group';
  const parentImg = ph?.querySelector('img.avatar, img');
  const parentIcon = parentImg ? upgradeAvatarUrl(parentImg.getAttribute('src')) : '';

  const h1Clone = h1?.cloneNode(true);
  h1Clone?.querySelectorAll('span, a, small')?.forEach((n) => n.remove());
  const title = h1Clone?.textContent?.replace(/^[»\s/]+/, '')?.trim() || h1?.textContent?.trim() || '话题详情';

  const opEl = doc.querySelector('.postTopic');
  let op = null;
  if (opEl) {
    const userA = opEl.querySelector('.inner strong a, a.l[href*="/user/"]');
    const avaSpan = opEl.querySelector('span.avatarNeue, [style*="background-image"]');
    const timeText = opEl.querySelector('.post_actions small, .re_info small')?.textContent?.trim() || '';
    const contentHtml = opEl.querySelector('.topic_content, .message')?.innerHTML?.trim() || '';
    op = {
      user: userA?.textContent?.trim() || opEl.getAttribute('data-item-user') || '楼主',
      userHref: userA?.getAttribute('href') || '#',
      avatar: upgradeAvatarUrl(parseBgUrl(avaSpan)),
      time: timeText,
      contentHtml,
    };
  }

  const replies = parseReplyFloors(doc);
  const replyFormEl = doc.querySelector('#ReplyForm, form[action*="new_reply"]');
  const replyForm = replyFormEl
    ? {
        action: replyFormEl.getAttribute('action') || '',
        formhash: replyFormEl.querySelector('input[name="formhash"]')?.value || '',
        lastview: replyFormEl.querySelector('input[name="lastview"]')?.value || '',
      }
    : null;

  return {
    title,
    parentName,
    parentHref,
    parentIcon,
    op,
    replies,
    replyForm,
  };
}

/**
 * E2 · P23 日志广场与日志详情提取器 (/blog, /{type}/blog, /blog/{id}, /user/{uid}/blog)
 */
export function extractBlogPageData(doc, route = {}) {
  const entryContent = findEl(doc, 'entry_content') || doc.getElementById('entry_content');
  const isDetail = Boolean(entryContent || route?.params?.blogId);

  if (isDetail) {
    const h1 = doc.querySelector('#pageHeader h1, #header h1');
    const userA = doc.querySelector('#pageHeader a[href*="/user/"], .author a[href*="/user/"]');
    const avaImg = doc.querySelector('#pageHeader img.avatar, img.avatar');
    const reInfo = doc.querySelector('.re_info')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const titleClone = h1?.cloneNode(true);
    titleClone?.querySelectorAll('span, a')?.forEach((n) => n.remove());
    const title = titleClone?.textContent?.replace(/^[»\s/]+/, '')?.trim() || h1?.textContent?.trim() || '日志详情';

    const relatedSubjects = [];
    doc.querySelectorAll('#related_subject_list > li, ul.coversSmall > li').forEach((li) => {
      const a = li.querySelector('a[href*="/subject/"]');
      if (!a) return;
      const sTitle = li.querySelector('.info a, a.l')?.textContent?.trim() || a.getAttribute('title') || '';
      const img = li.querySelector('img');
      if (sTitle) {
        relatedSubjects.push({
          title: sTitle,
          href: a.getAttribute('href') || '#',
          cover: upgradeCoverUrl(normUrl(img?.getAttribute('src') || '')),
        });
      }
    });

    const comments = parseReplyFloors(doc);
    const replyFormEl = doc.querySelector('#ReplyForm, form[action*="new_reply"]');
    const replyForm = replyFormEl
      ? {
          action: replyFormEl.getAttribute('action') || '',
          formhash: replyFormEl.querySelector('input[name="formhash"]')?.value || '',
          lastview: replyFormEl.querySelector('input[name="lastview"]')?.value || '',
        }
      : null;

    return {
      mode: 'detail',
      title,
      author: userA?.textContent?.trim() || '作者',
      authorHref: userA?.getAttribute('href') || '#',
      avatar: upgradeAvatarUrl(avaImg?.getAttribute('src') || ''),
      time: reInfo,
      contentHtml: entryContent?.innerHTML?.trim() || '',
      relatedSubjects,
      comments,
      replyForm,
    };
  }

  const heading = doc.querySelector('#header h1, #headerProfile h1')?.textContent?.trim() || '全站日志广场';
  const tabs = [];
  doc.querySelectorAll('#header ul.navSubTabs > li > a, ul.navSubTabs > li > a').forEach((a) => {
    tabs.push({
      label: a.textContent.trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  const blogs = [];
  doc.querySelectorAll('#entry_list div.item, #bgm-legacy-entry_list div.item, .entry-list div.item').forEach((it) => {
    const titleA = it.querySelector('h2.title a') || it.querySelector('.entry h2 a');
    if (!titleA) return;
    const href = titleA.getAttribute('href') || '#';
    const title = titleA.textContent.trim();
    const img = it.querySelector('p.cover img, .cover img, img');
    const cover = upgradeAvatarUrl(img?.getAttribute('src') || '');
    const timeDiv = it.querySelector('.tools .time, .time');
    const userA = timeDiv?.querySelector('a[href*="/user/"]');
    const subjA = timeDiv?.querySelector('a[href*="/subject/"]');
    const replyA = timeDiv?.querySelector('a[href*="/blog/"]');
    const rawTime = timeDiv?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const timeMatch = rawTime.match(/(\d+\s*(?:秒|分钟|小时|天|月|年)[^·]*前|\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?)/);
    const excerpt = (it.querySelector('.content')?.textContent || '').replace(/\s+/g, ' ').trim();

    blogs.push({
      title,
      href,
      cover,
      author: userA?.textContent?.trim() || '漫友',
      authorHref: userA?.getAttribute('href') || '#',
      subjectName: subjA?.textContent?.trim() || '',
      subjectHref: subjA?.getAttribute('href') || '#',
      replies: replyA?.textContent?.trim() || '0 回复',
      time: timeMatch ? timeMatch[1].trim() : '',
      excerpt,
    });
  });

  return {
    mode: 'list',
    heading,
    tabs,
    blogs,
    pagerLinks: parsePagerLinks(doc),
  };
}

/**
 * E2 · P24 目录广场与目录详情提取器 (/index, /index/browser, /index/{id}*, /user/{uid}/index*)
 */
export function extractCatalogPageData(doc, route = {}) {
  const hasBrowserItems = Boolean(findEl(doc, 'browserItemList') || doc.getElementById('browserItemList'));
  const isDetail = Boolean(route?.params?.indexId || hasBrowserItems);

  if (isDetail) {
    const title = doc.querySelector('#header h1')?.textContent?.trim() || '目录详情';
    const userA = doc.querySelector('.grp_box a.l[href*="/user/"], a[href*="/user/"]');
    const avaSpan = doc.querySelector('.grp_box span.avatarNeue, span.avatarNeue');
    const descHtml = doc.querySelector('.line_detail .tip')?.innerHTML?.trim() || '';
    const catTabs = [];
    doc.querySelectorAll('ul.navSubTabs > li > a').forEach((a) => {
      catTabs.push({
        label: a.textContent.replace(/\s+/g, ' ').trim(),
        href: a.getAttribute('href') || '#',
        active: a.classList.contains('focus'),
      });
    });

    const items = parseBrowserItemList(doc, 'anime');
    return {
      mode: 'detail',
      title,
      author: userA?.textContent?.trim() || '创建者',
      authorHref: userA?.getAttribute('href') || '#',
      avatar: upgradeAvatarUrl(parseBgUrl(avaSpan)),
      descHtml,
      catTabs,
      items,
    };
  }

  const heading = doc.querySelector('#header h1, #headerProfile h1')?.textContent?.trim() || '目录广场';
  const catalogs = [];
  doc.querySelectorAll('#timeline ul > li.tml_item, ul.line_list > li, .index-list > li').forEach((li) => {
    const a = li.querySelector('h3 a[href*="/index/"], a[href*="/index/"]:not(.avatar)');
    if (!a) return;
    const href = a.getAttribute('href') || '#';
    const title = a.textContent.trim();
    const userA = li.querySelector('.tip_j a[href*="/user/"], a[href*="/user/"]');
    const avaSpan = li.querySelector('span.avatarNeue, [style*="background-image"]');
    const time = li.querySelector('small.grey, .tip_i')?.textContent?.trim() || '';
    if (title) {
      catalogs.push({
        title,
        href,
        author: userA?.textContent?.trim() || '',
        authorHref: userA?.getAttribute('href') || '#',
        avatar: upgradeAvatarUrl(parseBgUrl(avaSpan)),
        time,
      });
    }
  });

  return {
    mode: 'plaza',
    heading,
    catalogs,
    pagerLinks: parsePagerLinks(doc),
  };
}

/**
 * E2 · P29 维基人 / MAGI 问答 / Dollars 提取器 (/wiki, /magi*, /dollars)
 */
export function extractExploreWikiData(doc) {
  const revisions = [];
  doc.querySelectorAll('ul.line_list > li').forEach((li) => {
    const subjA = li.querySelector('h6 a[href*="/subject/"], a[href*="/subject/"]');
    if (!subjA) return;
    const title = subjA.textContent.trim();
    const href = subjA.getAttribute('href') || '#';
    const time = li.querySelector('cite small.grey, small.grey')?.textContent?.trim() || '';
    const comment = li.querySelector('span.tip_j')?.textContent?.trim() || '';
    const userA = li.querySelector('a[href*="/user/"]');
    revisions.push({
      title,
      href,
      time,
      comment,
      editor: userA?.textContent?.trim() || '维基人',
      editorHref: userA?.getAttribute('href') || '#',
    });
  });

  const contributors = [];
  doc.querySelectorAll('ul.coversSmall > li').forEach((li) => {
    const a = li.querySelector('a[href*="/user/"]');
    if (!a) return;
    const name = a.textContent.trim() || a.getAttribute('title') || '';
    const avaSpan = li.querySelector('span.avatarNeue, [style*="background-image"]');
    const img = li.querySelector('img');
    if (name) {
      contributors.push({
        name,
        href: a.getAttribute('href') || '#',
        avatar: upgradeAvatarUrl(parseBgUrl(avaSpan) || img?.getAttribute('src') || ''),
      });
    }
  });

  return { revisions, contributors };
}
