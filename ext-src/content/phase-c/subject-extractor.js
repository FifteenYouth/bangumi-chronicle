/**
 * Bangumi Chronicle · Phase C · P04 条目概览主页真站 DOM 提取器 (subject-extractor.js)
 * 完整支持 6 大形态自适应：动画 (anime) / 书籍系列 (book_series) / 单行本 (book_vol) / 音乐 (music) / 游戏 (game) / 三次元 (real)
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

function parseEpStatusClass(cls = '') {
  if (cls.includes('epBtnWatched')) return 'watched';
  if (cls.includes('epBtnToday')) return 'today';
  if (cls.includes('epBtnAir')) return 'air';
  if (cls.includes('epBtnQueue')) return 'queue';
  if (cls.includes('epBtnDrop')) return 'drop';
  return 'na';
}

function detectSubjectCategory(doc, typeLabel, infoboxRows, sectionsMap) {
  if (doc.querySelector('ul.line_list_music')) return 'music';

  const tagLink = doc.querySelector('.subject_tag_section a[href*="/tag/"]');
  const tagChan = tagLink?.getAttribute('href')?.match(/^\/(anime|book|music|game|real)\/tag\//)?.[1] || '';

  const focusNav = doc.querySelector(
    '#navMenuNeue a.focus[href], #bgm-legacy-headerNeue2 #navMenuNeue a.focus[href], #headerNeue2 .nav-chan.is-active[href]'
  );
  const navChan = focusNav?.getAttribute('href')?.replace(/^\//, '')?.split('/')[0] || '';

  const rawChan = tagChan || navChan;
  if (rawChan === 'music') return 'music';
  if (rawChan === 'game') return 'game';
  if (rawChan === 'real') return 'real';
  if (rawChan === 'book' || /漫画|小说|画集|单行本|书籍/.test(typeLabel)) {
    if (sectionsMap.has('单行本') || doc.querySelector('input[name="watched_vols"]')) {
      return 'book_series';
    }
    if (sectionsMap.has('所属系列')) {
      return 'book_vol';
    }
    const hasIsbn = infoboxRows.some((r) => /ISBN/i.test(r.key));
    const hasVols = infoboxRows.some((r) => /册数|卷数|话数/.test(r.key));
    if (hasIsbn && !hasVols) return 'book_vol';
    return 'book_series';
  }
  if (/游戏|PC|PS5|Switch/i.test(typeLabel)) return 'game';
  if (/Album|Single|OST|原声|唱片/i.test(typeLabel)) return 'music';
  if (/日剧|美剧|韩剧|电视剧|电影|三次元/.test(typeLabel)) return 'real';
  return 'anime';
}

const CATEGORY_META = {
  anime: { verb: '看', noun: '这部动画', defaultBadge: '动画' },
  book_series: { verb: '读', noun: '这部作品', defaultBadge: '书籍·系列' },
  book_vol: { verb: '读', noun: '这本单行本', defaultBadge: '书籍·单行本' },
  music: { verb: '听', noun: '这张唱片', defaultBadge: '音乐' },
  game: { verb: '玩', noun: '这款游戏', defaultBadge: '游戏' },
  real: { verb: '看', noun: '这部剧集', defaultBadge: '三次元' },
};

export function extractSubjectData(doc, route = {}) {
  const hs = findEl(doc, 'headerSubject');
  const titleA = hs?.querySelector('h1 a[property="v:itemreviewed"], h1 a') || doc.querySelector('h1.nameSingle a');
  const subjectId =
    route?.params?.subjectId ||
    titleA?.getAttribute('href')?.match(/\/subject\/(\d+)/)?.[1] ||
    (typeof location !== 'undefined' ? location.pathname.match(/\/subject\/(\d+)/)?.[1] : '') ||
    '';

  const titleJp = titleA?.textContent?.trim() || `条目 #${subjectId}`;
  const typeSmall = hs?.querySelector('h1 small.grey')?.textContent?.trim() || '';

  // 1. 一级导航 Tabs
  const navTabs = [];
  hs?.querySelectorAll('ul.navTabs > li > a').forEach((a) => {
    navTabs.push({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href') || '#',
      active: a.classList.contains('focus'),
    });
  });

  // 2. 左栏：主封面与 Infobox
  const bgmInfo = findEl(doc, 'bangumiInfo');
  const coverLink = bgmInfo?.querySelector('a.cover');
  const coverImg = bgmInfo?.querySelector('img.cover, img');
  const rawCover = normUrl(coverImg?.getAttribute('src') || coverLink?.getAttribute('href') || '');
  const isNoIcon = !rawCover || /no_icon_subject/i.test(rawCover);
  const cover = isNoIcon ? '' : upgradeCoverUrl(rawCover);
  const coverFull = normUrl(coverLink?.getAttribute('href') || cover);

  const infobox = [];
  let infoboxCnName = '';
  const infoboxUl = findEl(doc, 'infobox') || bgmInfo?.querySelector('ul#infobox');
  infoboxUl?.querySelectorAll(':scope > li').forEach((li, idx) => {
    if (li.classList.contains('sub_container') || li.classList.contains('sub_group')) return;
    const tipEl = li.querySelector('span.tip');
    const rawKey = tipEl?.textContent?.replace(/[:：\s]+$/g, '')?.trim() || '';
    const clone = li.cloneNode(true);
    clone.querySelector('span.tip')?.remove();
    const valHtml = clone.innerHTML.trim();
    const valText = clone.textContent.replace(/\s+/g, ' ').trim();
    if (rawKey === '中文名' && valText && !infoboxCnName) {
      infoboxCnName = valText;
    }
    if (rawKey || valHtml) {
      infobox.push({
        key: rawKey || '信息',
        valHtml,
        valText,
        folded: li.classList.contains('folded') || idx >= 9,
      });
    }
  });

  const titleCn = infoboxCnName || titleA?.getAttribute('title')?.trim() || '';

  // 扫描所有 .subject_section 按标题索引
  const sectionsMap = new Map();
  doc.querySelectorAll('.subject_section').forEach((sec) => {
    const sub = sec.querySelector('h2.subtitle')?.textContent?.trim() || '';
    if (sub) sectionsMap.set(sub, sec);
  });

  const category = detectSubjectCategory(doc, typeSmall, infobox, sectionsMap);
  const catMeta = CATEGORY_META[category] || CATEGORY_META.anime;
  const typeLabel = typeSmall || catMeta.defaultBadge;

  // 3. 左栏：谁看这部作品 (#subjectPanelCollect) 与 推荐目录 (#subjectPanelIndex)
  const collectPanel = findEl(doc, 'subjectPanelCollect');
  const collection = {
    wish: 0,
    collect: 0,
    doing: 0,
    on_hold: 0,
    dropped: 0,
    users: [],
  };
  if (collectPanel) {
    collectPanel.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const num = parseInt((a.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (href.endsWith('/wishes')) collection.wish = num;
      else if (href.endsWith('/collections')) collection.collect = num;
      else if (href.endsWith('/doings')) collection.doing = num;
      else if (href.endsWith('/on_hold')) collection.on_hold = num;
      else if (href.endsWith('/dropped')) collection.dropped = num;
    });
    collectPanel.querySelectorAll('ul.groupsLine > li').forEach((li) => {
      const userA = li.querySelector('.innerWithAvatar a[href*="/user/"], a.avatar[href*="/user/"]');
      if (!userA) return;
      const avaSpan = li.querySelector('span.avatarNeue');
      const avaImg = li.querySelector('img');
      const meta = li.querySelector('small.grey')?.textContent?.trim() || '';
      const name = li.querySelector('.innerWithAvatar a')?.textContent?.trim() || '';
      if (name) {
        collection.users.push({
          name,
          href: userA.getAttribute('href') || '#',
          avatar: upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || ''),
          meta,
        });
      }
    });
  }

  const indexes = [];
  const indexPanel = findEl(doc, 'subjectPanelIndex');
  indexPanel?.querySelectorAll('ul.groupsLine > li').forEach((li) => {
    const idxA = li.querySelector('a[href*="/index/"]');
    if (!idxA) return;
    const userA = li.querySelector('small a[href*="/user/"], a[href*="/user/"]');
    const avaSpan = li.querySelector('span.avatarNeue');
    indexes.push({
      title: idxA.textContent.trim(),
      href: idxA.getAttribute('href') || '#',
      author: userA?.textContent?.trim() || '',
      authorHref: userA?.getAttribute('href') || '#',
      avatar: upgradeAvatarUrl(parseBgUrl(avaSpan)),
    });
  });

  // 4. 中栏：章节列表 (ul.prg_list) 或 音乐曲目列表 (ul.line_list_music)
  const episodes = [];
  let currentGroup = '本篇';
  doc.querySelectorAll('.subject_prg ul.prg_list > li').forEach((li) => {
    if (li.classList.contains('subtitle')) {
      currentGroup = li.textContent.trim() || 'SP';
      return;
    }
    const a = li.querySelector('a.load-epinfo, a[id^="prg_"]');
    if (!a) return;
    const epId = a.getAttribute('ep_id') || (a.id || '').replace(/^prg_/, '');
    const num = a.textContent.trim();
    const status = parseEpStatusClass(a.className || '');
    const rawTitle = a.getAttribute('title') || `ep.${num}`;
    const href = a.getAttribute('href') || `/ep/${epId}`;

    const popup = doc.getElementById(`prginfo_${epId}`);
    const tipText = popup?.querySelector('.tip')?.innerHTML || '';
    const cnMatch = tipText.match(/中文标题:\s*([^<\n]+)/);
    const dateMatch = tipText.match(/首播:\s*([^<\n]+)/);
    const durMatch = tipText.match(/时长:\s*([^<\n]+)/);
    const cmtA = popup?.querySelector('.cmt a[href]');
    const cmtCount = popup?.querySelector('.cmt small')?.textContent?.trim() || '';

    episodes.push({
      epId,
      num,
      group: currentGroup,
      status,
      rawTitle,
      cnTitle: cnMatch ? cnMatch[1].trim() : '',
      airDate: dateMatch ? dateMatch[1].trim() : '',
      duration: durMatch ? durMatch[1].trim() : '',
      discussHref: cmtA?.getAttribute('href') || href,
      discussCount: cmtCount,
      href,
    });
  });

  // 音乐曲目表 (ul.line_list_music)
  const discs = [];
  const musicUl = doc.querySelector('ul.line_list_music');
  if (musicUl) {
    let curDisc = { name: 'Disc 1', tracks: [] };
    musicUl.querySelectorAll(':scope > li').forEach((li) => {
      if (li.classList.contains('cat')) {
        if (curDisc.tracks.length) discs.push(curDisc);
        curDisc = { name: li.textContent.trim() || `Disc ${discs.length + 1}`, tracks: [] };
        return;
      }
      const a = li.querySelector('h6 a, a[href*="/ep/"]');
      if (!a) return;
      const raw = a.textContent.trim();
      const numMatch = raw.match(/^(\d+)\s+(.*)$/);
      curDisc.tracks.push({
        num: numMatch ? numMatch[1].padStart(2, '0') : String(curDisc.tracks.length + 1).padStart(2, '0'),
        title: numMatch ? numMatch[2].trim() : raw,
        href: a.getAttribute('href') || '#',
      });
    });
    if (curDisc.tracks.length) discs.push(curDisc);
  }

  // 5. 中栏：故事简介 (#subject_summary) 与 标签词云 (.subject_tag_section)
  const summaryEl = findEl(doc, 'subject_summary');
  const summaryRaw = summaryEl?.innerHTML || '';
  const summaryParagraphs = summaryRaw
    .split(/<br\s*\/?>|\r?\n/i)
    .map((s) => s.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);

  const tags = [];
  doc.querySelectorAll('.subject_tag_section .inner a[href]').forEach((a) => {
    const name = a.querySelector('span')?.textContent?.trim() || a.childNodes?.[0]?.textContent?.trim() || '';
    const count = parseInt(a.querySelector('small')?.textContent?.replace(/[^0-9]/g, '') || '0', 10);
    if (name) {
      tags.push({
        name,
        count,
        href: a.getAttribute('href') || '#',
        isMeta: a.classList.contains('meta'),
      });
    }
  });

  // 6. 中栏：角色介绍 (#browserItemList > li.item)
  const characters = [];
  doc.querySelectorAll('.subject_section #browserItemList > li.item, #browserItemList.crtList > li.item').forEach((li) => {
    const titleLink = li.querySelector('p.title a[href*="/character/"]') || li.querySelector('.inner a[href*="/character/"]') || li.querySelector('a[href*="/character/"]');
    if (!titleLink) return;
    const href = titleLink.getAttribute('href') || '#';
    const id = href.match(/\/character\/(\d+)/)?.[1] || '';
    const thumbA = li.querySelector('a.thumbTip[title]');
    const nameJp = titleLink.textContent.trim();
    const nameCn = thumbA?.getAttribute('title')?.trim() || '';
    const avaSpan = li.querySelector('span.avatarNeue, [style*="background-image"]');
    const avaImg = li.querySelector('img');
    const avatar = upgradeAvatarUrl(parseBgUrl(avaSpan) || avaImg?.getAttribute('src') || '');
    const role = li.querySelector('.badge_job_tip')?.textContent?.trim() || '角色';
    const commentCount = li.querySelector('p.jobs small.primary')?.textContent?.trim() || '';

    const actors = [];
    li.querySelectorAll('p.badge_actor').forEach((p) => {
      const label = p.querySelector('.tip_i')?.textContent?.trim() || 'CV';
      const personA = p.querySelector('a[href*="/person/"]');
      if (personA) {
        actors.push({
          label,
          name: personA.textContent.trim(),
          href: personA.getAttribute('href') || '#',
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
      commentCount,
      actors,
    });
  });

  // 7. 中栏：单行本矩阵 & 关联条目
  const parseSectionCoverList = (sec) => {
    if (!sec) return [];
    const out = [];
    let currentRelType = '';
    sec.querySelectorAll('ul.browserCoverMedium > li, ul.coverList > li').forEach((li) => {
      const subText = li.querySelector('span.sub')?.textContent?.trim() || '';
      if (subText) currentRelType = subText;
      const titleLink = li.querySelector('a.title[href*="/subject/"], a[href*="/subject/"]:not(.avatar)');
      const avaLink = li.querySelector('a.avatar[href*="/subject/"]');
      const href = (titleLink || avaLink)?.getAttribute('href') || '';
      const id = href.match(/\/subject\/(\d+)/)?.[1] || '';
      if (!href) return;
      const title = titleLink?.textContent?.trim() || avaLink?.getAttribute('title') || `#${id}`;
      const cnTitle = avaLink?.getAttribute('title')?.trim() || '';
      const coverSpan = li.querySelector('span.coverNeue, [style*="background-image"]');
      const coverImg = li.querySelector('img');
      const rawCov = parseBgUrl(coverSpan) || normUrl(coverImg?.getAttribute('src') || '');
      const noIcon = !rawCov || /no_icon_subject/i.test(rawCov);

      let catKey = 'other';
      if (/漫画|书籍|小说|画集|单行本/.test(currentRelType)) catKey = 'manga';
      else if (/原声|片头|片尾|插入|音乐|歌曲|广播剧|OP|ED|OST/i.test(currentRelType)) catKey = 'music';
      else if (/续集|前传|衍生|番外|总集|主线|动画|全集/.test(currentRelType)) catKey = 'anime';

      out.push({
        id,
        href,
        title,
        cnTitle,
        cover: noIcon ? '' : upgradeCoverUrl(rawCov),
        isNoIcon: noIcon,
        relType: currentRelType || '关联',
        catKey,
      });
    });
    return out;
  };

  const tankobon = parseSectionCoverList(sectionsMap.get('单行本'));
  const relations = parseSectionCoverList(sectionsMap.get('关联条目'));

  // 8. 中栏：评论长评 (#entry_list > div.item)
  const reviews = [];
  const entryList = findEl(doc, 'entry_list') || doc.getElementById('entry_list');
  entryList?.querySelectorAll(':scope > div.item').forEach((it) => {
    const titleLink = it.querySelector('h2.title a, .title a');
    if (!titleLink) return;
    const href = titleLink.getAttribute('href') || '#';
    const title = titleLink.textContent.trim();
    const userA = it.querySelector('.time a[href*="/user/"], a[href*="/user/"]');
    const user = userA?.textContent?.trim() || '';
    const userHref = userA?.getAttribute('href') || '#';
    const avaImg = it.querySelector('img.avatarCover, img');
    const avatar = upgradeAvatarUrl(avaImg?.getAttribute('src') || '');
    const replyA = it.querySelector('.time a[href*="/blog/"]');
    const replies = replyA?.textContent?.trim() || '0 回复';
    const timeRaw = it.querySelector('.time')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const timeMatch = timeRaw.match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?/);
    const excerptClone = it.querySelector('.content')?.cloneNode(true);
    excerptClone?.querySelectorAll('a.more')?.forEach((n) => n.remove());
    const excerpt = excerptClone?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

    reviews.push({
      title,
      href,
      user,
      userHref,
      avatar,
      time: timeMatch ? timeMatch[0] : '',
      replies,
      excerpt,
    });
  });

  // 9. 中栏：讨论版 (table.topic_list tr)
  const topics = [];
  doc.querySelectorAll('table.topic_list tbody tr, table.topic_list tr').forEach((tr) => {
    const subjA = tr.querySelector('td.subject a[href]');
    if (!subjA) return;
    const tds = tr.querySelectorAll('td');
    const userA = tds[1]?.querySelector('a[href]');
    const replies = tds[2]?.textContent?.trim() || '';
    const time = tds[3]?.textContent?.trim() || '';
    topics.push({
      title: subjA.textContent.trim(),
      href: subjA.getAttribute('href') || '#',
      user: userA?.textContent?.trim() || tds[1]?.textContent?.trim() || '',
      userHref: userA?.getAttribute('href') || '#',
      replies,
      time,
    });
  });

  // 10. 中栏：吐槽箱 (#comment_box > div.item)
  const comments = [];
  const commentBox = findEl(doc, 'comment_box') || doc.getElementById('comment_box');
  commentBox?.querySelectorAll(':scope > div.item').forEach((it, idx) => {
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
    const likesGrid = it.querySelector('.likes_grid');
    const id = (likesGrid?.id || '').replace(/^likes_grid_/, '') || String(idx + 1);

    if (text) {
      comments.push({
        id,
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

  // 11. 右栏：收藏盒 (#panelInterestWrapper & #collectBoxForm) + 进度更新表单 (.panelProgress)
  const pw = findEl(doc, 'panelInterestWrapper');
  const collectForm = findEl(doc, 'collectBoxForm') || pw?.querySelector('#collectBoxForm, form[action*="/interest/update"]');
  const checkedInterest = collectForm?.querySelector('input[name="interest"]:checked')?.value || '';
  const checkedRating =
    parseInt(
      collectForm?.querySelector('input[name="rating"]:checked')?.value ||
        pw?.querySelector('input[name="rate"]:checked')?.value ||
        '0',
      10
    ) || 0;
  const formAction = collectForm?.getAttribute('action') || (subjectId ? `/subject/${subjectId}/interest/update` : '');
  const ghMatch =
    formAction.match(/[?&]gh=([a-zA-Z0-9_-]+)/) ||
    (pw?.innerHTML || '').match(/eraseSubjectCollect\(\s*\d+\s*,\s*'([a-zA-Z0-9_-]+)'\)/);

  const popularTags = [];
  collectForm?.querySelectorAll('.tagList a.btnGray').forEach((a) => {
    const t = a.textContent.trim();
    if (t && !popularTags.includes(t)) popularTags.push(t);
  });

  const interest = {
    loggedIn: Boolean(collectForm),
    collected: Boolean(pw?.querySelector('.interest_now')),
    statusLabel: pw?.querySelector('.interest_now')?.textContent?.trim() || `未收藏${catMeta.noun}`,
    collectedTime: pw?.querySelector('p.tip')?.textContent?.replace(/\s+/g, ' ')?.trim() || '',
    formAction,
    gh: ghMatch ? ghMatch[1] : '',
    currentStatus: checkedInterest || '3',
    currentRating: checkedRating,
    currentTags: collectForm?.querySelector('input#tags, input[name="tags"]')?.value?.trim() || '',
    popularTags: popularTags.slice(0, 12),
    currentComment: collectForm?.querySelector('textarea#comment, textarea[name="comment"]')?.value?.trim() || '',
    privacy: Boolean(collectForm?.querySelector('input#privacy[name="privacy"]:checked')),
  };

  const progEl = pw?.querySelector('.panelProgress');
  const progFormEl = progEl?.querySelector('form[action*="/subject/set/watched/"]');
  const progressForm = progFormEl
    ? {
        action: progFormEl.getAttribute('action') || `/subject/set/watched/${subjectId}`,
        progressText: progEl.querySelector('.progress small')?.textContent?.trim() || '',
        watchedEps: progFormEl.querySelector('input[name="watchedeps"], input[name="watched_eps"]')?.value || '0',
        watchedVols: progFormEl.querySelector('input[name="watched_vols"]')?.value ?? null,
      }
    : null;

  // 12. 右栏：全局评分与 10~1 评分直方图 (div[rel="v:rating"] & #ChartWarpper)
  const ratingRoot = pw?.querySelector('[rel="v:rating"]') || doc.querySelector('[rel="v:rating"]');
  const score = parseFloat(ratingRoot?.querySelector('.number[property="v:average"], .global_score .number')?.textContent || '0') || 0;
  const scoreDesc = ratingRoot?.querySelector('.description')?.textContent?.trim() || '评价';
  const rankText = ratingRoot?.querySelector('small.alarm')?.textContent?.trim() || '';
  const totalVotes = parseInt(ratingRoot?.querySelector('[property="v:votes"]')?.textContent?.replace(/[^0-9]/g, '') || '0', 10);

  const chartEl = findEl(doc, 'ChartWarpper') || ratingRoot?.querySelector('.chartWrapper');
  const bars = [];
  chartEl?.querySelectorAll('ul.horizontalChart > li').forEach((li) => {
    const star = parseInt(li.querySelector('.label')?.textContent?.trim() || '0', 10);
    const countEl = li.querySelector('.count');
    const count = parseInt((countEl?.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
    const tipAttr =
      li.querySelector('a')?.getAttribute('data-original-title') ||
      li.querySelector('a')?.getAttribute('title') ||
      '';
    const pctMatch = tipAttr.match(/([0-9.]+)%/);
    if (star >= 1 && star <= 10) {
      bars.push({
        star,
        count,
        percent: pctMatch ? parseFloat(pctMatch[1]) : 0,
      });
    }
  });

  const sumVotes = bars.reduce((acc, b) => acc + b.count, 0) || totalVotes || 1;
  const maxBarCount = Math.max(1, ...bars.map((b) => b.count));
  let weightedMean = 0;
  bars.forEach((b) => {
    if (!b.percent && sumVotes > 0) {
      b.percent = Number(((b.count / sumVotes) * 100).toFixed(2));
    }
    b.heightPct = b.count > 0 ? Math.max(6, Math.round((b.count / maxBarCount) * 92)) : 3;
    weightedMean += b.star * b.count;
  });
  const meanVal = sumVotes > 0 ? weightedMean / sumVotes : score;
  const variance =
    sumVotes > 0
      ? bars.reduce((acc, b) => acc + b.count * Math.pow(b.star - meanVal, 2), 0) / sumVotes
      : 0;
  const stdDev = variance > 0 ? Math.sqrt(variance).toFixed(2) : '1.00';

  const rating = {
    score,
    desc: scoreDesc,
    rank: rankText,
    votes: totalVotes || sumVotes,
    stdDev,
    bars,
  };

  return {
    id: subjectId,
    titleJp,
    titleCn,
    typeLabel,
    category,
    verb: catMeta.verb,
    noun: catMeta.noun,
    navTabs,
    cover,
    coverFull,
    infobox,
    collection,
    indexes,
    episodes,
    discs,
    progressForm,
    tankobon,
    summaryParagraphs,
    tags,
    characters,
    relations,
    reviews,
    topics,
    comments,
    interest,
    rating,
  };
}
