/**
 * Bangumi Chronicle · P03 时空管理局 & 首页抓抓时间线提取器 (timeline-extractor.js)
 * 共享 parseTimelineItems(root, fallbackUser) 供 P01 (#home_tml) 与 P03 (/timeline) 复用。
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
  if (!u) return '';
  return u.replace(/(\/pic\/user\/)(?:s|m|c)(\/)/i, '$1l$2');
}

function parseStarsFromEl(root) {
  const starEl = root?.querySelector?.('.starlight');
  if (!starEl) return 0;
  const cls = starEl.className || '';
  const m = cls.match(/stars(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function inferCategory(actionText, hasCard) {
  const t = actionText || '';
  if (t.includes('日志')) return 'blog';
  if (t.includes('目录')) return 'index';
  if (t.includes('好友') || t.includes('加为了')) return 'relation';
  if (t.includes('小组') || t.includes('话题')) return 'group';
  if (t.includes('角色') || t.includes('人物') || t.includes('配音')) return 'mono';
  if (t.includes('维基') || t.includes('修订') || t.includes('编辑')) return 'wiki';
  if ((t.includes('看过') || t.includes('完成')) && /ep\.|第\d+话|of\s*\d+|of\s*\?+/i.test(t)) return 'progress';
  if (hasCard && /(想看|看过|在看|搁置|抛弃|想读|读过|在读|想听|听过|在听|想玩|玩过|在玩)/.test(t)) {
    return 'subject';
  }
  return 'say';
}

function findDateHeaderForLi(li) {
  const ul = li.parentElement;
  if (!ul) return '';
  let prev = ul.previousElementSibling;
  while (prev) {
    if (/^H[1-6]$/i.test(prev.tagName) || prev.classList?.contains('Header')) {
      return prev.textContent.trim();
    }
    prev = prev.previousElementSibling;
  }
  return '';
}

export function parseTimelineItems(root, fallbackUser = null) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const rows = root.querySelectorAll('li.tml_item');
  const items = [];
  const avatarByUid = new Map();
  if (fallbackUser?.uid && fallbackUser?.avatar) {
    avatarByUid.set(fallbackUser.uid, fallbackUser.avatar);
  }

  for (let i = 0; i < rows.length; i++) {
    const li = rows[i];
    const id = (li.id || '').replace(/^tml_/, '') || String(i + 1);
    const uidAttr = li.getAttribute('data-item-user') || '';
    const dateLabel = findDateHeaderForLi(li);

    const infoEl = li.querySelector('span.info, span.info_full') || li;
    const avaAnchor = li.querySelector('span.avatar a, a.avatar');
    const firstUserLink = infoEl.querySelector('a.l[href*="/user/"]');
    const userHref =
      avaAnchor?.getAttribute('href') ||
      firstUserLink?.getAttribute('href') ||
      (fallbackUser?.uid ? `/user/${fallbackUser.uid}` : '');
    const uid =
      uidAttr ||
      userHref.match(/\/user\/([^/?#]+)/)?.[1] ||
      fallbackUser?.uid ||
      '';
    const user =
      firstUserLink?.textContent?.trim() ||
      fallbackUser?.nickname ||
      uid ||
      'Bangumi 用户';

    const avaSpan = li.querySelector('span.avatarNeue');
    const avaImg = li.querySelector('span.avatar img');
    const rawAvatar = upgradeUserAvatar(parseBgUrl(avaSpan) || normUrl(avaImg?.getAttribute('src')) || '');
    if (uid && rawAvatar) {
      avatarByUid.set(uid, rawAvatar);
    }
    const avatar =
      rawAvatar ||
      (uid && avatarByUid.get(uid)) ||
      fallbackUser?.avatar ||
      'https://lain.bgm.tv/pic/user/l/icon.jpg';

    // Clone infoEl to extract clean action summary without card & post_actions
    const infoClone = infoEl.cloneNode(true);
    infoClone
      .querySelectorAll('.card, .post_actions, .likes_grid, .likes, .status, .collectInfo, blockquote, .comment, .reply_content')
      .forEach((n) => n.remove());
    infoClone.querySelectorAll('img').forEach((img) => {
      const src = normUrl(img.getAttribute('src'));
      if (src) img.setAttribute('src', src);
      img.setAttribute('referrerpolicy', 'no-referrer');
      const isSmiley = img.hasAttribute('smileid') || /\/img\/smiles\//i.test(src);
      img.classList.add(isSmiley ? 'tml-smiley' : 'tml-inline-thumb');
    });
    const actionHtml = infoClone.innerHTML.trim();
    const actionText = infoClone.textContent.replace(/\s+/g, ' ').trim();

    const quoteEl = infoEl.querySelector('.status, .collectInfo .comment, blockquote');
    const quoteText = quoteEl?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const cardEl = infoEl.querySelector('.card');
    let card = null;
    if (cardEl) {
      const coverImg = cardEl.querySelector('img');
      const rawCover = normUrl(coverImg?.getAttribute('src'));
      const isNoIcon = !rawCover || /no_icon_subject/i.test(rawCover);
      const titleA = cardEl.querySelector('.title a, a[href*="/subject/"], a');
      card = {
        title: titleA?.textContent?.replace(/\s+/g, ' ').trim() || '',
        href: titleA?.getAttribute('href') || '',
        cover: isNoIcon ? '' : upgradeCoverUrl(rawCover),
        isTiny: cardEl.classList.contains('card_tiny'),
        info: cardEl.querySelector('.info.tip, .tip')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        stars: parseStarsFromEl(cardEl),
      };
    }

    const stars = card?.stars || parseStarsFromEl(infoEl);
    const actionsEl = infoEl.querySelector('.post_actions');
    const timeEl = actionsEl?.querySelector('.titleTip, .date') || infoEl.querySelector('.date');
    const time =
      timeEl?.textContent?.trim() ||
      actionsEl?.textContent?.replace(/\s+/g, ' ')?.replace(/^·\s*/, '')?.trim() ||
      '';
    const timeTitle = timeEl?.getAttribute?.('title') || time;

    const replyA = actionsEl?.querySelector('a.tml_comment, a[href*="/timeline/status/"]');
    const replyUrl = replyA?.getAttribute('href') || '';
    const replyText = replyA?.textContent?.trim() || '';
    const replyCount = parseInt(replyText.match(/(\d+)/)?.[1] || '0', 10);

    const delA = actionsEl?.querySelector('a.tml_del, a[href*="erase"]');
    const delUrl = delA?.getAttribute('href') || '';

    const likeChips = [];
    li.querySelectorAll('.likes_grid a.item, .likes a.item').forEach((lk) => {
      const emoji = lk.querySelector('img')?.getAttribute('alt') || lk.textContent?.trim() || '👍';
      const cnt = parseInt(lk.querySelector('.num')?.textContent || '1', 10);
      likeChips.push({ emoji, count: cnt });
    });

    items.push({
      id,
      uid,
      user,
      userHref: userHref || (uid ? `/user/${uid}` : '#'),
      avatar,
      dateLabel,
      actionHtml,
      actionText,
      quoteText,
      card,
      stars,
      time,
      timeTitle,
      replyUrl,
      replyCount,
      delUrl,
      likeChips,
      category: inferCategory(actionText, Boolean(card)),
    });
  }

  return items;
}

export function extractTimelineData(doc, route) {
  const isCapsule = Boolean(route?.params?.uid);
  const uid = route?.params?.uid || '';

  const tabs = [];
  doc.querySelectorAll('#timelineTabs a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('javascript')) return;
    tabs.push({
      id: a.id || '',
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href,
      active: a.classList.contains('focus'),
    });
  });

  const sayFormEl = doc.querySelector('#SayFrom, form[action*="/timeline"]');
  const sayForm = sayFormEl
    ? {
        action: sayFormEl.getAttribute('action') || '/timeline?ajax=1',
        formhash: sayFormEl.querySelector('input[name="formhash"]')?.value || '',
      }
    : null;

  let profile = null;
  const hp = doc.getElementById('headerProfile');
  if (hp) {
    const avaSpan = hp.querySelector('span.avatarNeue');
    const avaImg = hp.querySelector('.headerAvatar img');
    const nameA = hp.querySelector('.name a');
    const rawAva = parseBgUrl(avaSpan) || normUrl(avaImg?.getAttribute('src')) || '';
    profile = {
      uid: uid || nameA?.getAttribute('href')?.match(/\/user\/([^/?#]+)/)?.[1] || '',
      nickname: nameA?.textContent?.trim() || uid,
      avatar: upgradeUserAvatar(rawAva) || 'https://lain.bgm.tv/pic/user/l/icon.jpg',
      navLinks: Array.from(hp.querySelectorAll('ul.navTabs > li > a')).map((a) => ({
        label: a.textContent.replace(/\s+/g, ' ').trim(),
        href: a.getAttribute('href') || '#',
        active: a.classList.contains('focus'),
      })),
    };
  }

  const pagerLinks = [];
  doc.querySelectorAll('#columnTimelineA .page_inner a, #columnTimelineA .page_inner strong, #tmlPager .page_inner a, #tmlPager .page_inner strong').forEach((el) => {
    pagerLinks.push({
      label: el.textContent.trim(),
      href: el.tagName === 'A' ? el.getAttribute('href') || '#' : '',
      current: el.tagName === 'STRONG' || el.classList.contains('p_cur'),
    });
  });

  const sideLinks = [];
  doc.querySelectorAll('#columnTimelineB a[href]').forEach((a) => {
    const label = a.textContent.replace(/\s+/g, ' ').trim();
    const href = a.getAttribute('href') || '';
    if (label && href && !href.startsWith('javascript')) {
      sideLinks.push({ label, href, active: a.classList.contains('focus') });
    }
  });

  const rssA = doc.querySelector('#columnTimelineB a[href*="/feed/"]');
  const rssHref = rssA?.getAttribute('href') || (isCapsule && uid ? `/feed/user/${encodeURIComponent(uid)}/timeline` : '/feed/timeline');

  const items = parseTimelineItems(doc.getElementById('timeline') || doc, profile);

  return {
    isCapsule,
    uid,
    profile,
    tabs,
    sayForm,
    items,
    pagerLinks,
    sideLinks,
    rssHref,
    heading: doc.querySelector('#header h1')?.textContent?.trim() || (isCapsule ? `${profile?.nickname || uid} 的时间胶囊` : '时空管理局'),
  };
}
