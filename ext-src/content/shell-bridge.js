/**
 * Bangumi Chronicle · 全站共享壳层真站桥接 (shell-bridge.js)
 * - 从真站 DOM 实时提取用户会话（loggedIn / uid / nickname / avatar / formhash / gh / logoutUrl / notifyCount / pmCount）
 * - 通过 #bgm-legacy-vault 无损保留原站 #dock / #robot / #badgeUserPanel / #navNeue2（超合金兼容）
 * - 注入真站路由版美化顶栏 #headerNeue2（含 .et-thumb 弹性滑块、.dp 面板、.idcl-stage 账号工牌）、
 *   底部灵动岛 #bsh-dock、伪春菜 #bsh-robot、外观与超合金模态框 #customizeModal、四列毛玻璃页脚 .glass-footer
 * - 子帧（/rakuen/* iframe、ThickBox）仅保留 Toast 与外观变量，不重复挂载顶栏/页脚/Dock
 */

import { ACCENTS, ACCENT_META } from '../shared/settings.js';
import { upgradeEmojisInTree } from '../shared/icons.js';

const FALLBACK_AVATAR = 'https://lain.bgm.tv/pic/user/l/icon.jpg';
const LEGACY_RENAME_IDS = new Set([
  'headerNeue2',
  'headerSearch',
  'search_text',
  'siteSearchSelect',
  'footer',
  'toastContainer',
]);

let boundEvents = false;
let currentShellContext = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}

function upgradeUserAvatar(url) {
  const u = normalizeUrl(url);
  if (!u) return FALLBACK_AVATAR;
  return u.replace(/(\/pic\/user\/)(?:s|m)(\/)/i, '$1l$2');
}

function parseBadgeNumber(el) {
  if (!el) return 0;
  const badge = el.querySelector?.('.badge, .badge_num, .notify_count, sup, em') || el;
  const text = String(badge.textContent || '').trim();
  const m = text.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * 从真实 Bangumi 页面 DOM 提取当前会话与计数信息（纯函数，可用于离线测试）
 */
export function extractSessionFromDOM(doc = document) {
  const result = {
    loggedIn: false,
    uid: '',
    nickname: '游客',
    avatar: FALLBACK_AVATAR,
    formhash: '',
    gh: '',
    logoutUrl: '',
    notifyCount: 0,
    pmCount: 0,
    searchCat: 'all',
    searchQuery: '',
  };
  if (!doc || typeof doc.querySelector !== 'function') return result;

  const formhashInput = doc.querySelector('input[name="formhash"]');
  if (formhashInput?.value) result.formhash = String(formhashInput.value).trim();

  const logoutEl = doc.querySelector(
    '#dock a[href*="/logout/"], #badgeUserPanel a[href*="/logout/"], a.logout[href*="/logout/"], #headerNeue2 a[href*="/logout/"]'
  );
  if (logoutEl) {
    result.logoutUrl = logoutEl.getAttribute('href') || '';
    const ghMatch = result.logoutUrl.match(/\/logout\/([a-zA-Z0-9_-]+)/);
    if (ghMatch) result.gh = ghMatch[1];
  }
  if (!result.gh) {
    const ghLink = doc.querySelector('a[href*="gh="]');
    const m = ghLink?.getAttribute('href')?.match(/[?&]gh=([a-zA-Z0-9_-]+)/);
    if (m) result.gh = m[1];
  }
  if (!result.formhash && result.gh) {
    result.formhash = result.gh;
  }

  const hasGuest = Boolean(
    doc.querySelector('#headerNeue2 .guest, #dock a[href$="/login"], #dock a[href*="/login?"]')
  );
  const userLink = doc.querySelector(
    '#dock li.first a[href*="/user/"], #headerNeue2 .idBadgerNeue a.avatar[href*="/user/"], #badgeUserPanel a[href*="/user/"]'
  );
  if (result.logoutUrl || (!hasGuest && userLink)) {
    result.loggedIn = true;
  }

  if (userLink) {
    const href = userLink.getAttribute('href') || '';
    const uidMatch = href.match(/\/user\/([^/?#]+)/);
    if (uidMatch) result.uid = decodeURIComponent(uidMatch[1]);
  }

  const dockUserLink = doc.querySelector('#dock li.first a[href*="/user/"]');
  const badgeUserLink = doc.querySelector('#badgeUserPanel li.first a[href*="/user/"]');
  const avatarImg = doc.querySelector('#headerNeue2 .idBadgerNeue img');
  const rawName =
    dockUserLink?.textContent?.trim() ||
    badgeUserLink?.textContent?.trim() ||
    avatarImg?.getAttribute('alt')?.trim() ||
    '';
  if (rawName) {
    result.nickname = rawName;
  } else if (result.loggedIn && result.uid) {
    result.nickname = result.uid;
  }

  const avatarSpan = doc.querySelector('#headerNeue2 .idBadgerNeue span.avatarNeue');
  if (avatarSpan) {
    const styleAttr = avatarSpan.getAttribute('style') || '';
    const bgMatch = styleAttr.match(/url\((['"]?)([^'")]+)\1\)/i);
    if (bgMatch?.[2]) result.avatar = upgradeUserAvatar(bgMatch[2]);
  } else if (avatarImg?.getAttribute('src')) {
    result.avatar = upgradeUserAvatar(avatarImg.getAttribute('src'));
  }

  const notifyEl = doc.querySelector(
    '#dock a[href*="/notify"], #badgeUserPanel a[href*="/notify"], #headerNeue2 a[href*="/notify"]'
  );
  const pmEl = doc.querySelector(
    '#dock a[href*="/pm"], #badgeUserPanel a[href*="/pm"], #headerNeue2 a[href*="/pm"]'
  );
  result.notifyCount = parseBadgeNumber(notifyEl);
  result.pmCount = parseBadgeNumber(pmEl);

  const searchSelect = doc.querySelector('#siteSearchSelect');
  if (searchSelect?.value) result.searchCat = searchSelect.value;
  const searchInput = doc.querySelector('#search_text');
  if (searchInput?.value) result.searchQuery = searchInput.value;

  return result;
}

export function showToast(_msg, _doc = document) {
  // 遵照用户交互准则：取消右上角悬浮 Toast 弹窗，所有操作结果均通过页面内原地状态更新直接呈现
}

function renameLegacyConflictingIds(el) {
  if (!el) return;
  if (el.id && LEGACY_RENAME_IDS.has(el.id)) {
    el.setAttribute('data-bgm-legacy-id', el.id);
    el.id = 'bgm-legacy-' + el.id;
  }
  const children = el.querySelectorAll?.('[id]');
  if (!children) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (LEGACY_RENAME_IDS.has(child.id)) {
      child.setAttribute('data-bgm-legacy-id', child.id);
      child.id = 'bgm-legacy-' + child.id;
    }
  }
}

function vaultOriginalShell(doc) {
  if (!doc.body) return;
  let vault = doc.getElementById('bgm-legacy-vault');
  if (!vault) {
    vault = doc.createElement('div');
    vault.id = 'bgm-legacy-vault';
    vault.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(vault);
  }

  // 使用 querySelectorAll + :not([data-bgm-shell-el]) 精准捕获嵌套在 #wrapperNeue 内的原站节点
  const legacyNodes = doc.querySelectorAll(
    '#headerNeue2:not([data-bgm-shell-el="1"]), #dock:not([data-bgm-shell-el="1"]), #robot:not([data-bgm-shell-el="1"]), #footer:not([data-bgm-shell-el="1"])'
  );
  for (let i = 0; i < legacyNodes.length; i++) {
    const node = legacyNodes[i];
    if (!node || node.closest?.('#bgm-legacy-vault')) continue;
    renameLegacyConflictingIds(node);
    node.setAttribute('data-bgm-vaulted', '1');
    vault.appendChild(node);
  }
}

function restoreLegacyShell(doc) {
  const vault = doc.getElementById('bgm-legacy-vault');
  if (!vault) return;
  const nodes = Array.from(vault.children);
  for (const node of nodes) {
    const restoreIds = (root) => {
      if (root.hasAttribute?.('data-bgm-legacy-id')) {
        root.id = root.getAttribute('data-bgm-legacy-id');
        root.removeAttribute('data-bgm-legacy-id');
      }
      const desc = root.querySelectorAll?.('[data-bgm-legacy-id]');
      if (desc) {
        for (let i = 0; i < desc.length; i++) {
          desc[i].id = desc[i].getAttribute('data-bgm-legacy-id');
          desc[i].removeAttribute('data-bgm-legacy-id');
        }
      }
    };
    restoreIds(node);
    node.removeAttribute('data-bgm-vaulted');
    const origId = node.id;
    const wrapper = doc.getElementById('wrapperNeue');
    if (origId === 'headerNeue2') {
      doc.body.insertBefore(node, doc.body.firstChild);
    } else if (
      wrapper &&
      (origId === 'main' || origId === 'headerProfile' || origId === 'headerSubject' || node.classList?.contains('mainWrapper'))
    ) {
      wrapper.appendChild(node);
    } else {
      doc.body.appendChild(node);
    }
  }
  vault.remove();
}

function isChannelActive(chan, route) {
  const slug = route?.slug || '';
  const type = route?.params?.type || '';
  if (chan === 'mono') return route?.page === 'P18' || route?.page === 'P19';
  if (chan === 'group') return route?.page === 'P21' || route?.page === 'P22';
  if (['anime', 'book', 'music', 'game', 'real'].includes(chan)) {
    return type === chan || slug.startsWith(chan + '-') || slug === 'channel-' + chan;
  }
  return false;
}

function buildHeaderHtml(session, route) {
  const channels = [
    { key: 'anime', label: '动画', href: '/anime' },
    { key: 'book', label: '书籍', href: '/book' },
    { key: 'music', label: '音乐', href: '/music' },
    { key: 'game', label: '游戏', href: '/game' },
    { key: 'real', label: '三次元', href: '/real' },
    { key: 'mono', label: '人物', href: '/mono' },
    { key: 'group', label: '小组', href: '/group' },
  ];

  const catLabels = {
    all: 'ALL · 全部',
    '2': '动画',
    '1': '书籍',
    '4': '游戏',
    '3': '音乐',
    '6': '三次元',
    person: '人物',
  };
  const activeCat = catLabels[session.searchCat] ? session.searchCat : 'all';

  const navLinksHtml = channels
    .map((c) => {
      const active = isChannelActive(c.key, route) ? ' is-active' : '';
      return `<a href="${c.href}" class="nav-chan${active}" data-dp="${c.key}">${c.label}</a>`;
    })
    .join('');

  const notifyBadgeHtml =
    session.notifyCount > 0 ? `<i class="et-badge" aria-hidden="true">${session.notifyCount}</i>` : '';
  const pmBadgeHtml =
    session.pmCount > 0 ? `<i class="et-badge" aria-hidden="true">${session.pmCount}</i>` : '';

  const userHref = session.uid ? `/user/${encodeURIComponent(session.uid)}` : '/user/me';
  const accountHtml = session.loggedIn
    ? `<a href="${userHref}" class="user in" id="userAvatarBtn" aria-haspopup="dialog" aria-label="${esc(session.nickname)} 的账号工牌" title="点击或悬停查看账号卡片"><img src="${esc(session.avatar)}" alt="${esc(session.nickname)}" referrerpolicy="no-referrer" /></a>`
    : `<div class="bsh-guest-pills"><a href="/login" class="bsh-guest-link">登录</a><a href="/signup" class="bsh-guest-signup">注册</a></div>`;

  return `
    <div class="top-left">
      <a href="/" class="brand" title="Bangumi 番组计划">
        <span class="tv" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect class="tv-screen" x="3" y="6.5" width="18" height="13.5" rx="4"/>
            <path class="tv-antenna" d="m8 2.5 3.5 4m4.5-4-3.5 4"/>
            <circle class="tv-eye" cx="9.2" cy="12.8" r="1.15" fill="currentColor" stroke="none"/>
            <circle class="tv-eye" cx="14.8" cy="12.8" r="1.15" fill="currentColor" stroke="none"/>
            <path class="tv-mouth" d="M9.8 16.2c1.2.8 3.2.8 4.4 0"/>
          </svg>
          <span class="tv-scan" aria-hidden="true"></span>
        </span>
        <span class="brand-wordmark">
          <span class="brand-serif">Bangumi</span>
          <span class="brand-meta">
            <span class="brand-meta-en">CHRONICLE</span>
            <span class="brand-meta-cn">番组计划</span>
          </span>
        </span>
      </a>

      <nav class="et nav-et" id="navMenuNeue" aria-label="主频道导航">
        <span class="et-thumb" id="navEtThumb" aria-hidden="true"></span>
        ${navLinksHtml}
        <button type="button" class="nav-chan" data-dp="discover">探索</button>
      </nav>
    </div>

    <form class="search" id="headerSearch" action="/subject_search" method="post" role="search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="m20 20-3.5-3.5"/>
      </svg>
      <button type="button" class="search-cat-pill" id="searchCatBtn" data-dp="searchCat" title="切换搜索分类">
        <span id="searchCatLabel">${esc(catLabels[activeCat])}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4.5 6 7.5l3-3"/></svg>
      </button>
      <select name="cat" id="siteSearchSelect" class="search-cat-select-native" aria-label="搜索分类">
        <option value="all"${activeCat === 'all' ? ' selected' : ''}>全部</option>
        <option value="2"${activeCat === '2' ? ' selected' : ''}>动画</option>
        <option value="1"${activeCat === '1' ? ' selected' : ''}>书籍</option>
        <option value="4"${activeCat === '4' ? ' selected' : ''}>游戏</option>
        <option value="3"${activeCat === '3' ? ' selected' : ''}>音乐</option>
        <option value="6"${activeCat === '6' ? ' selected' : ''}>三次元</option>
        <option value="person"${activeCat === 'person' ? ' selected' : ''}>人物</option>
      </select>
      <input type="search" name="search_text" id="search_text" value="${esc(session.searchQuery)}" placeholder="搜索番组、角色、人物、日志…" autocomplete="off" aria-label="搜索" />
      <kbd>/</kbd>
    </form>

    <div class="acts">
      <nav class="et act-et" id="actBar" aria-label="快捷工具栏">
        <span class="et-thumb" id="actEtThumb" aria-hidden="true"></span>
        <a href="/rakuen" class="act et-btn" aria-label="超展开">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="3.5" width="7" height="7" rx="2"/>
            <rect x="13.5" y="3.5" width="7" height="7" rx="2"/>
            <rect x="3.5" y="13.5" width="7" height="7" rx="2"/>
            <circle cx="17" cy="17" r="3.5"/>
          </svg>
          <span>超展开</span>
        </a>

        <a href="/notify/all" class="act et-btn" data-dp="notify" aria-label="提醒">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>提醒</span>
          ${notifyBadgeHtml}
        </a>

        <a href="/pm" class="act et-btn" data-dp="pm" aria-label="短消息">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5"/>
            <path d="m3.5 6.5 8.5 6 8.5-6"/>
          </svg>
          <span>短消息</span>
          ${pmBadgeHtml}
        </a>

        <button type="button" class="act et-btn" id="btnOpenCustomize" aria-label="外观设定">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5"/>
            <path d="M15.5 8.5a5 5 0 0 0-7 7"/>
          </svg>
          <span>外观设定</span>
        </button>
      </nav>

      <button type="button" class="ts" id="btnThemeToggle" role="switch" aria-label="切换浅色/深色主题" title="切换浅色 / 深色模式">
        <span class="ts-c" aria-hidden="true"><span class="ts-clouds"></span><span class="ts-stars"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z"/></svg></span><span class="ts-circle"><span class="ts-sm"><span class="ts-moon"><span class="ts-spot"></span><span class="ts-spot"></span><span class="ts-spot"></span></span></span></span></span>
      </button>

      <div class="um-wrap" id="userAvatarWrap">
        ${accountHtml}
      </div>
    </div>

    <div class="dp" id="topDpPopover" role="dialog" aria-label="导航详情面板"></div>
  `;
}

function buildDpConfigs(session) {
  const uid = session.uid ? encodeURIComponent(session.uid) : 'me';
  const makeMediaDp = (type, title, en, verb) => ({
    title,
    en,
    allHref: `/${type}`,
    allLabel: `${title}频道 →`,
    links: [
      { title: '近期注目', sub: 'TRENDS', href: `/${type}/browser?sort=trends` },
      { title: `${title}排行榜`, sub: 'CHART', href: `/${type}/chart` },
      ...(type === 'anime' ? [{ title: '每日放送表', sub: 'CALENDAR', href: '/calendar' }] : []),
      { title: `${title}标签库`, sub: 'TAGS', href: `/${type}/tag` },
      { title: '分类浏览', sub: 'BROWSER', href: `/${type}/browser` },
      { title: `${title}日志`, sub: 'BLOGS', href: `/${type}/blog` },
    ],
    personalTitle: `MY ${en} · 我${verb}`,
    statuses: [
      { label: `在${verb}`, href: `/${type}/list/${uid}/do` },
      { label: `想${verb}`, href: `/${type}/list/${uid}/wish` },
      { label: `${verb}过`, href: `/${type}/list/${uid}/collect` },
      { label: '搁置', href: `/${type}/list/${uid}/on_hold` },
      { label: '抛弃', href: `/${type}/list/${uid}/dropped` },
    ],
  });

  return {
    anime: makeMediaDp('anime', '动画', 'ANIME', '看'),
    book: makeMediaDp('book', '书籍', 'BOOK', '读'),
    music: makeMediaDp('music', '音乐', 'MUSIC', '听'),
    game: makeMediaDp('game', '游戏', 'GAME', '玩'),
    real: makeMediaDp('real', '三次元', 'REAL', '看'),
    mono: {
      title: '人物',
      en: 'MONO',
      allHref: '/mono',
      allLabel: '人物频道 →',
      links: [
        { title: '虚构角色', sub: 'CHARACTER', href: '/character' },
        { title: '现实人物', sub: 'PERSON', href: '/person' },
        { title: '人物动态', sub: 'UPDATES', href: '/mono/update' },
        { title: '收藏的角色', sub: 'MY CRT', href: `/user/${uid}/mono/character` },
        { title: '收藏的人物', sub: 'MY PRSN', href: `/user/${uid}/mono/person` },
      ],
    },
    group: {
      title: '小组',
      en: 'GROUP',
      allHref: '/group',
      allLabel: '小组首页 →',
      links: [
        { title: '随便看看', sub: 'DISCOVER', href: '/group/discover' },
        { title: '所有小组', sub: 'ALL GROUPS', href: '/group/all' },
        { title: '发表的话题', sub: 'MY TOPICS', href: '/group/my_topic' },
        { title: '回复的话题', sub: 'MY REPLIES', href: '/group/my_reply' },
        { title: '参加的小组', sub: 'MINE', href: '/group/mine' },
      ],
    },
    discover: {
      title: '探索',
      en: 'DISCOVER',
      allHref: '/timeline',
      allLabel: '时空管理局 →',
      links: [
        { title: '时空管理局', sub: 'TIMELINE', href: '/timeline' },
        { title: '日志广场', sub: 'BLOGS', href: '/blog' },
        { title: '目录广场', sub: 'INDEX', href: '/index' },
        { title: '维基人', sub: 'WIKI', href: '/wiki' },
        { title: 'MAGI 问答', sub: 'MAGI', href: '/magi' },
        { title: 'Dollars 聊天室', sub: 'DOLLARS', href: '/dollars' },
        { title: '超合金组件', sub: 'GADGETS', href: '/settings/gadgets' },
        { title: '天窗联盟', sub: 'DOUJIN', href: 'https://doujin.bgm.tv' },
      ],
    },
    searchCat: {
      title: '搜索分类',
      en: 'SEARCH SCOPE',
      links: [
        { title: 'ALL · 全部条目', sub: 'all', catValue: 'all', label: 'ALL · 全部' },
        { title: '动画 Anime', sub: '2', catValue: '2', label: '动画' },
        { title: '书籍 Book', sub: '1', catValue: '1', label: '书籍' },
        { title: '游戏 Game', sub: '4', catValue: '4', label: '游戏' },
        { title: '音乐 Music', sub: '3', catValue: '3', label: '音乐' },
        { title: '三次元 Real', sub: '6', catValue: '6', label: '三次元' },
        { title: '人物 Mono', sub: 'person', catValue: 'person', label: '人物' },
      ],
    },
    notify: {
      title: '电波提醒',
      en: 'NOTIFICATIONS',
      allHref: '/notify/all',
      allLabel: '查看全部提醒 →',
      links: [
        {
          title: session.notifyCount > 0 ? `当前有 ${session.notifyCount} 条未读提醒` : '暂无未读电波提醒',
          sub: 'NOTIFY',
          href: '/notify/all',
        },
      ],
    },
    pm: {
      title: '站内短信',
      en: 'MESSAGES',
      allHref: '/pm',
      allLabel: '进入收件箱 →',
      links: [
        { title: session.pmCount > 0 ? `收件箱（${session.pmCount} 未读）` : '收件箱', sub: 'INBOX', href: '/pm/inbox.chii' },
        { title: '已发送', sub: 'OUTBOX', href: '/pm/outbox.chii' },
        { title: '撰写新短信', sub: 'COMPOSE', href: '/pm/compose.chii' },
      ],
    },
  };
}

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

function mountHeader(doc, session, route) {
  let header = doc.querySelector('header.top#headerNeue2[data-bgm-shell-el="1"]');
  if (!header) {
    header = doc.createElement('header');
    header.className = 'top';
    header.id = 'headerNeue2';
    header.setAttribute('data-bgm-shell-el', '1');
  }
  const wrapper = doc.getElementById('wrapperNeue');
  if (wrapper && wrapper.parentNode === doc.body) {
    if (header.nextElementSibling !== wrapper) {
      doc.body.insertBefore(header, wrapper);
    }
  } else if (!header.parentNode) {
    doc.body.insertBefore(header, doc.body.firstChild);
  }
  header.innerHTML = buildHeaderHtml(session, route);

  bindLiquidThumb(doc.getElementById('navMenuNeue'), doc.getElementById('navEtThumb'), '.nav-chan');
  bindLiquidThumb(doc.getElementById('actBar'), doc.getElementById('actEtThumb'), '.et-btn');

  if (session.loggedIn) {
    const wrap = doc.getElementById('userAvatarWrap');
    const trigger = doc.getElementById('userAvatarBtn');
    const existingStage = doc.getElementById('bshIdclStage');
    if (existingStage) existingStage.remove();

    if (wrap && trigger) {
      const uidRaw = String(session.uid || 'me');
      const uidEnc = encodeURIComponent(uidRaw);
      const spaceUrl = `https://bgm.tv/user/${uidEnc}`;

      const makeQrSvg = (seedStr) => {
        const s = String(seedStr || 'bgm.tv');
        const size = 21;
        let d = '';
        const isFinder = (r, c, fr, fc) =>
          r >= fr &&
          r < fr + 7 &&
          c >= fc &&
          c < fc + 7 &&
          (r === fr ||
            r === fr + 6 ||
            c === fc ||
            c === fc + 6 ||
            (r >= fr + 2 && r <= fr + 4 && c >= fc + 2 && c <= fc + 4));
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const inF = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
            let dark = false;
            if (inF) {
              dark = isFinder(r, c, 0, 0) || isFinder(r, c, 0, size - 7) || isFinder(r, c, size - 7, 0);
            } else {
              const hash = (r * 31 + c * 17 + s.charCodeAt((r + c) % s.length)) % 7;
              dark = hash < 3;
            }
            if (dark) d += `M${c} ${r}h1v1h-1z`;
          }
        }
        return `<div class="idcl-qr"><svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg></div>`;
      };

      const makeBarcodeHtml = (midStr) => {
        const padded = String(midStr || '0').padStart(10, '0');
        let spans = '';
        for (let i = 0; i < 30; i++) {
          const code = padded.charCodeAt(i % padded.length) || 48;
          const h = (i * 37 + code * 11) % 100 > 40 ? 100 : 55;
          spans += `<span style="height:${h}%"></span>`;
        }
        return `<div class="idcl-barcode" aria-hidden="true">${spans}</div>`;
      };

      const stage = doc.createElement('div');
      stage.className = 'idcl-stage';
      stage.id = 'bshIdclStage';
      stage.setAttribute('data-bgm-shell-el', '1');
      stage.hidden = true;
      stage.innerHTML = `
        <div class="idcl-card" id="idclCard" role="dialog" aria-label="${esc(session.nickname)} 的账号卡片">
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
                  <span>ONLINE</span>
                  <span>UID ${esc(uidRaw)}</span>
                  <i></i>
                </div>
              </div>
              <div class="idcl-photo">
                <img class="idcl-photo-face" src="${esc(session.avatar)}" alt="${esc(session.nickname)}" referrerpolicy="no-referrer" />
                <span class="idcl-verified" title="已认证 Bangumi 会员">
                  <svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
              <h2 class="idcl-name">${esc(session.nickname)}</h2>
              <div class="idcl-roleline">
                <p class="idcl-role">番组计划成员 · Chronicle</p>
                <span class="idcl-expnum">@${esc(uidRaw)}</span>
              </div>
              <div class="idcl-exp" title="电波同步">
                <i style="width:78%"></i>
              </div>
              <a class="idcl-timeline" href="/user/${uidEnc}">
                <span class="idcl-timeline-l">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>
                  <span>
                    <b>个人时光机</b>
                    <small>bgm.tv/user/${esc(uidRaw)}</small>
                  </span>
                </span>
                <span class="idcl-timeline-arrow">→</span>
              </a>
              <div class="idcl-stats">
                <a href="/anime/list/${uidEnc}/do">
                  <b>在看</b><span>动画进度</span>
                </a>
                <a href="/anime/list/${uidEnc}/collect">
                  <b>看过</b><span>动画归档</span>
                </a>
                <a href="/user/${uidEnc}/friends">
                  <b>好友</b><span>电波同频</span>
                </a>
              </div>
              <div class="idcl-idrow">
                <div class="idcl-idrow-labels">
                  <div><span>通行证</span><b>formhash ${esc(session.formhash || '已鉴权')}</b></div>
                  <div><span>胶囊</span><b><a href="/user/${uidEnc}/timeline" style="color:inherit;">个人时间线 →</a></b></div>
                  <div><span>扫码</span><b>个人时光机</b></div>
                </div>
                ${makeQrSvg(spaceUrl)}
              </div>
              <div class="idcl-footer">
                <a href="/notify/all">
                  <span>未读提醒</span><b class="${session.notifyCount > 0 ? 'hot' : ''}">${session.notifyCount}</b>
                </a>
                <i></i>
                <a href="/pm">
                  <span>站内短信</span><b class="${session.pmCount > 0 ? 'hot' : ''}">${session.pmCount}</b>
                </a>
              </div>
            </div>

            <!-- 背面 -->
            <div class="idcl-face idcl-back">
              <div class="idcl-holo"></div>
              <div class="idcl-idnum">
                <span>NO. ${esc(uidRaw.padStart(8, '0'))}</span>
                <em>CHRONICLE</em>
              </div>
              ${makeBarcodeHtml(uidRaw)}
              <div class="idcl-backrow">
                ${makeQrSvg(spaceUrl)}
                <div class="idcl-scan">
                  <b>个人时光机</b>
                  bgm.tv/user/${esc(uidRaw)}<br/>
                  点击空白处翻回正面
                </div>
              </div>
              <div class="idcl-eyebrow">ACCOUNT <span>账号中枢</span></div>
              <div class="idcl-links">
                <a class="idcl-link" href="/user/${uidEnc}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
                  <span>我的时光机</span>
                </a>
                <a class="idcl-link" href="/user/${uidEnc}/timeline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
                  <span>时间胶囊</span>
                </a>
                <a class="idcl-link" href="/user/${uidEnc}/blog">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
                  <span>我的日志</span>
                </a>
                <a class="idcl-link" href="/user/${uidEnc}/index">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  <span>我的目录</span>
                </a>
                <a class="idcl-link" href="/user/${uidEnc}/mono">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8.5l4 3.5 4-6 4 6 4-3.5-1.6 9.5H5.6z"/></svg>
                  <span>我的人物</span>
                </a>
                <a class="idcl-link" href="/settings">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9"/></svg>
                  <span>个人设置</span>
                </a>
              </div>
              <div class="idcl-connect">
                <span>直达</span>
                <div class="idcl-connect-icons">
                  <a href="/rakuen" title="超展开"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><circle cx="17" cy="17" r="3.5"/></svg></a>
                  <a href="/user/${uidEnc}/groups" title="我的小组"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/></svg></a>
                  <a href="/user/${uidEnc}/wiki" title="我的维基"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg></a>
                  <a href="https://doujin.bgm.tv/user/${uidEnc}" target="_blank" rel="noopener" title="天窗专页"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5a5 5 0 0 0-7 7"/></svg></a>
                </div>
              </div>
              <div class="idcl-sig">
                <div class="idcl-script">${esc(session.nickname)}</div>
                <div class="idcl-sigline">
                  <small>Authorized Signature</small>
                  ${session.logoutUrl ? `<a href="${esc(session.logoutUrl)}" class="idcl-out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg><span>退出登录</span></a>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="idcl-hint" id="idclHint"><span>点击卡片翻面</span></div>
        </div>`;
      doc.body.appendChild(stage);
      upgradeEmojisInTree(stage);

      const card = stage.querySelector('#idclCard');
      const flipper = stage.querySelector('#idclFlipper');
      const hint = stage.querySelector('#idclHint');

      let isOpen = false;
      let isFlipped = false;
      let closeTimer = 0;
      let curTilt = { x: 0, y: 0 };
      let targetTilt = { x: 0, y: 0 };
      let raf = 0;
      let cardRect = { x: 0, y: 0, w: 300, h: 452 };
      const TILT_MAX = 7;

      const layout = () => {
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
      };

      const renderTilt = () => {
        curTilt.x += (targetTilt.x - curTilt.x) * 0.14;
        curTilt.y += (targetTilt.y - curTilt.y) * 0.14;
        flipper.style.transform = `rotateY(${(isFlipped ? 180 : 0) + curTilt.y}deg) rotateX(${curTilt.x}deg)`;
        const settled = Math.abs(targetTilt.x - curTilt.x) < 0.02 && Math.abs(targetTilt.y - curTilt.y) < 0.02;
        if (isOpen && !settled) raf = requestAnimationFrame(renderTilt);
        else raf = 0;
      };

      const pokeTilt = () => {
        if (!raf) raf = requestAnimationFrame(renderTilt);
      };

      const isInsideSafeZone = (x, y) => {
        const t = trigger.getBoundingClientRect();
        const pad = 18;
        const inT = x >= t.left - pad && x <= t.right + pad && y >= t.top - pad && y <= t.bottom + pad;
        const inC =
          x >= cardRect.x - pad &&
          x <= cardRect.x + cardRect.w + pad &&
          y >= cardRect.y - pad &&
          y <= cardRect.y + cardRect.h + pad;
        return inT || inC;
      };

      const openCard = () => {
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
      };

      const closeCard = () => {
        if (!isOpen) return;
        isOpen = false;
        wrap.removeAttribute('data-open');
        card.classList.remove('idcl-in');
        stage.classList.add('idcl-leaving');
        setTimeout(() => {
          if (!isOpen) stage.hidden = true;
        }, 200);
      };

      window.addEventListener('pointermove', (e) => {
        if (!isOpen) return;
        const inside = isInsideSafeZone(e.clientX, e.clientY);
        if (!inside) {
          if (!closeTimer) closeTimer = window.setTimeout(closeCard, 360);
        } else {
          clearTimeout(closeTimer);
          closeTimer = 0;
        }
        if (cardRect.w) {
          const cx = cardRect.x + cardRect.w / 2;
          const cy = cardRect.y + cardRect.h / 2;
          const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (cardRect.w / 2)));
          const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (cardRect.h / 2)));
          targetTilt = { x: -ny * TILT_MAX, y: nx * TILT_MAX };
          card.classList.toggle('idcl-hovering', inside);
          card.style.setProperty('--mx', `${Math.round(((e.clientX - cardRect.x) / cardRect.w) * 100)}%`);
          card.style.setProperty('--my', `${Math.round(((e.clientY - cardRect.y) / cardRect.h) * 100)}%`);
          pokeTilt();
        }
      });

      card.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
        isFlipped = !isFlipped;
        hint?.classList.add('idcl-hint-hidden');
        pokeTilt();
      });

      doc.addEventListener('keydown', (e) => {
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
          closeTimer = window.setTimeout(openCard, 120);
        }
      });

      window.addEventListener('resize', () => {
        if (isOpen) layout();
      });
      window.addEventListener(
        'scroll',
        () => {
          if (isOpen) layout();
        },
        { passive: true }
      );
    }
  }
}

function mountFooter(doc) {
  let footer = doc.querySelector('footer.glass-footer#footer[data-bgm-shell-el="1"]');
  if (!footer) {
    footer = doc.createElement('footer');
    footer.className = 'glass-footer';
    footer.id = 'footer';
    footer.setAttribute('data-bgm-shell-el', '1');
  }
  const wrapper = doc.getElementById('wrapperNeue');
  if (wrapper && wrapper.parentNode === doc.body) {
    if (wrapper.nextElementSibling !== footer) {
      wrapper.insertAdjacentElement('afterend', footer);
    }
  } else if (!footer.parentNode) {
    doc.body.appendChild(footer);
  }
  footer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-col">
        <h4>关于我们</h4>
        <a href="/about">关于我们</a>
        <a href="/about/guideline">社区指导原则</a>
        <a href="/about/copyright">版权声明</a>
        <a href="/about/link2us">链接我们</a>
      </div>
      <div class="footer-col">
        <h4>获取帮助</h4>
        <a href="/help/bbcode">BBCode 指南</a>
        <a href="/group/forum">站务论坛</a>
        <a href="/group/dev">番组开发</a>
        <a href="/group/issues">BUG 追踪</a>
        <a href="https://doujin.bgm.tv/forum" target="_blank" rel="noopener">天窗站务</a>
      </div>
      <div class="footer-col">
        <h4>特别推荐</h4>
        <div class="award-chips">
          <a href="/award/2025">🏆 年鉴 2025</a>
          <a href="/award/2024">2024</a>
          <a href="/award/2023">2023</a>
          <a href="/award/2022">2022</a>
          <a href="/award/2021">2021</a>
          <a href="/award/2020">2020</a>
        </div>
        <a href="/group/wiki">番組 WIKI 計画</a>
        <a href="/onair">onAir 客户端</a>
        <a href="/rakuen#channel=tokei">etokei 绘时计</a>
      </div>
      <div class="footer-col">
        <h4>更多探索</h4>
        <a href="/settings/gadgets">开发者平台</a>
        <a href="/index">目录</a>
        <a href="/wiki">维基人</a>
        <a href="/magi">MAGI 问答</a>
        <a href="/goodies">周边</a>
        <a href="/dollars">Dollars</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2008-2026 Bangumi (a.k.a. Chobits) · Bangumi Chronicle MV3</span>
      <span>Ambient Glass &amp; Center-Stage Architecture</span>
    </div>`;
}

function mountDock(doc, session) {
  let d = doc.getElementById('bsh-dock');
  if (!d) {
    d = doc.createElement('nav');
    d.className = 'bsh-dock lg';
    d.id = 'bsh-dock';
    d.setAttribute('data-bgm-shell-el', '1');
    d.setAttribute('aria-label', '全局灵动岛');
    doc.body.appendChild(d);
  }

  let isCollapsed = false;
  try {
    isCollapsed = localStorage.getItem('bgm_dock_collapsed_v1') === '1';
  } catch {}
  d.classList.toggle('is-collapsed', isCollapsed);

  const userHref = session.loggedIn
    ? `/user/${encodeURIComponent(session.uid || 'me')}`
    : '/login';
  const userTip = session.loggedIn ? `${session.nickname} · 个人时光机` : '点击登录 Bangumi';
  const totalUnread = (session.notifyCount || 0) + (session.pmCount || 0);

  const acts = [
    [
      'notify',
      '提醒',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      session.notifyCount > 0 ? `电波提醒（${session.notifyCount} 未读）` : '电波提醒',
      session.notifyCount,
    ],
    [
      'pm',
      '短信',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
      session.pmCount > 0 ? `站内短信（${session.pmCount} 未读）` : '站内短信',
      session.pmCount,
    ],
    [
      'settings',
      '设置',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      '个人设置',
      0,
    ],
    [
      'theme',
      '日夜',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
      '切换浅色 / 深色主题',
      0,
    ],
    [
      'customize',
      '外观',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
      '外观偏好与强调色',
      0,
    ],
    [
      'robot',
      '春菜',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13.5" rx="4"/><path d="m8 2.5 3.5 4m4.5-4-3.5 4"/><circle cx="9.2" cy="12.8" r="1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12.8" r="1" fill="currentColor" stroke="none"/><path d="M9.8 16.2c1.2.8 3.2.8 4.4 0"/></svg>',
      '显示 / 隐藏伪春菜',
      0,
    ],
    [
      'logout',
      session.loggedIn ? '登出' : '登录',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      session.loggedIn ? '安全退出登录' : '登录 / 注册',
      0,
    ],
  ];

  d.innerHTML =
    `<span class="et-thumb" id="dockEtThumb" aria-hidden="true"></span>` +
    `<a class="bsh-dock-user" href="${userHref}" title="${esc(userTip)}">` +
      `<img class="bsh-dock-ava" src="${esc(session.avatar)}" alt="${esc(session.nickname)}" referrerpolicy="no-referrer" />` +
      `<span class="bsh-dock-name">${esc(session.loggedIn ? session.nickname : '登录')}</span>` +
      (totalUnread > 0 ? `<span class="bsh-dock-unread-dot" title="${totalUnread} 条未读消息"></span>` : '') +
    `</a>` +
    `<div class="bsh-dock-tray" id="bshDockTray">` +
      `<span class="bsh-dock-sep"></span>` +
      acts
        .map(([act, label, svg, tip, count]) => {
          const badge =
            act === 'notify' || act === 'pm'
              ? `<span class="bsh-dock-badge"${count > 0 ? '' : ' hidden'}>${count > 0 ? count : 0}</span>`
              : '';
          return (
            `<button type="button" class="bsh-dock-btn" data-bsh-act="${act}" title="${esc(tip)}">` +
              svg +
              `<span class="bsh-dock-label">${esc(label)}</span>` +
              badge +
            `</button>`
          );
        })
        .join('') +
    `</div>` +
    `<span class="bsh-dock-sep"></span>` +
    `<button type="button" class="bsh-dock-toggle" data-bsh-act="toggle-dock" title="${isCollapsed ? '展开灵动岛' : '收起灵动岛'}" aria-label="${isCollapsed ? '展开灵动岛' : '收起灵动岛'}" aria-expanded="${!isCollapsed}">` +
      `<svg class="bsh-dock-toggle-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>` +
    `</button>`;

  bindLiquidThumb(d, doc.getElementById('dockEtThumb'), '.bsh-dock-btn, .bsh-dock-toggle');
  doc.documentElement.classList.add('bsh-has-dock');
}

function mountRobot(doc, route) {
  let r = doc.getElementById('bsh-robot');
  if (!r) {
    r = doc.createElement('div');
    r.className = 'bsh-robot';
    r.id = 'bsh-robot';
    r.setAttribute('data-bgm-shell-el', '1');
    doc.body.appendChild(r);
  }

  let enabled = false;
  try {
    const raw = localStorage.getItem('bgm_robot_visible_v1');
    if (raw === '1') enabled = true;
  } catch {}
  r.hidden = !enabled;
  r.innerHTML =
    `<div class="bsh-robot-bubble" id="bshRobotBubble">` +
      `当前路由：<strong>${esc(route.page)} · ${esc(route.slug)}</strong><br />` +
      `<small class="bsh-robot-sub">点击小电视切换提示</small>` +
    `</div>` +
    `<button type="button" class="bsh-robot-body" data-bsh-act="robot-say" title="点击换一句"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><rect x="3" y="6.5" width="18" height="13.5" rx="4"/><path d="m8 2.5 3.5 4m4.5-4-3.5 4"/><circle cx="9.2" cy="12.8" r="1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12.8" r="1" fill="currentColor" stroke="none"/><path d="M9.8 16.2c1.2.8 3.2.8 4.4 0"/></svg></button>`;
}

function mountCustomizeModal(doc, session, route, settings) {
  let m = doc.getElementById('customizeModal');
  if (!m) {
    m = doc.createElement('div');
    m.className = 'glass-modal-backdrop';
    m.id = 'customizeModal';
    m.setAttribute('data-bgm-shell-el', '1');
    m.hidden = true;
    doc.body.appendChild(m);
  }

  const themeSpecs = [
    [
      'light',
      '浅色',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/></svg>',
    ],
    [
      'dark',
      '深色',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    ],
    [
      'auto',
      '跟随系统',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
    ],
  ];

  const themeBtns = themeSpecs
    .map(
      ([val, label, iconSvg]) =>
        `<button type="button" class="bsh-seg-btn${settings.theme === val ? ' is-selected' : ''}" data-bgm-set-theme="${val}">${iconSvg}<span>${label}</span></button>`
    )
    .join('');

  const accentBtns = ACCENTS.map((key) => {
    const meta = ACCENT_META[key];
    const active = settings.accent === key;
    return (
      `<button type="button" class="bsh-swatch-btn${active ? ' is-selected' : ''}" data-bgm-set-accent="${key}">` +
        `<span class="bsh-swatch-dot" style="background:${meta.hex}">` +
          (active
            ? '<svg viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 5 8.6 9.5 3.5"/></svg>'
            : '') +
        `</span>` +
        `<span class="bsh-swatch-label">${esc(meta.label)}</span>` +
      `</button>`
    );
  }).join('');

  m.innerHTML = `
    <div class="frosted-modal-dialog bsh-pref-dialog" role="dialog" aria-labelledby="customizeModalTitle">
      <header class="bsh-pref-head">
        <div class="bsh-pref-title-wrap">
          <span class="bsh-pref-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </span>
          <div>
            <h3 id="customizeModalTitle" class="bsh-pref-title">外观偏好</h3>
            <p class="bsh-pref-sub">主题模式、强调色与界面增强</p>
          </div>
        </div>
        <button type="button" class="bsh-pref-close" data-bsh-act="close-customize" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div class="bsh-pref-body">
        <div class="bsh-pref-section">
          <div class="bsh-pref-label">外观主题</div>
          <div class="bsh-seg-group" role="radiogroup" aria-label="外观主题">${themeBtns}</div>
        </div>

        <div class="bsh-pref-section">
          <div class="bsh-pref-label">主题强调色</div>
          <div class="bsh-swatch-grid" role="radiogroup" aria-label="主题强调色">${accentBtns}</div>
        </div>

        <div class="bsh-pref-section">
          <div class="bsh-pref-label">界面增强</div>
          <div class="bsh-switch-card">
            <button type="button" class="bsh-switch-row" data-bgm-toggle="hdCovers" role="switch" aria-checked="${Boolean(settings.hdCovers)}">
              <div class="bsh-switch-text">
                <span class="bsh-switch-name">高清封面自动升格</span>
                <span class="bsh-switch-desc">自动将条目与人物缩略图替换为高分辨率封面</span>
              </div>
              <span class="bsh-switch-track${settings.hdCovers ? ' is-on' : ''}"><span class="bsh-switch-thumb"></span></span>
            </button>
            <div class="bsh-switch-divider"></div>
            <button type="button" class="bsh-switch-row" data-bgm-toggle="alloyCompat" role="switch" aria-checked="${Boolean(settings.alloyCompat)}">
              <div class="bsh-switch-text">
                <span class="bsh-switch-name">超合金组件兼容</span>
                <span class="bsh-switch-desc">保留原站挂载节点并美化动态弹出层</span>
              </div>
              <span class="bsh-switch-track${settings.alloyCompat ? ' is-on' : ''}"><span class="bsh-switch-thumb"></span></span>
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function bindShellEvents() {
  if (boundEvents) return;
  boundEvents = true;

  let dpCloseTimer = 0;
  let dpCurrentKey = null;

  const closeDp = () => {
    const dpEl = document.getElementById('topDpPopover');
    if (dpEl) dpEl.classList.remove('is-open');
    dpCurrentKey = null;
  };

  const openDpFor = (triggerEl, key) => {
    const ctx = currentShellContext;
    const dpEl = document.getElementById('topDpPopover');
    if (!ctx || !dpEl) return;
    const configs = buildDpConfigs(ctx.session);
    const cfg = configs[key];
    if (!cfg) return;

    clearTimeout(dpCloseTimer);
    dpCurrentKey = key;

    const linksHtml = (cfg.links || [])
      .map((l) => {
        if (l.catValue) {
          return `<button type="button" class="dp-item" data-bgm-search-cat="${esc(l.catValue)}" data-bgm-search-label="${esc(l.label)}"><span>${esc(l.title)}</span><small>${esc(l.sub)}</small></button>`;
        }
        const ext = String(l.href || '').startsWith('http');
        return `<a class="dp-item" href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}><span>${esc(l.title)}</span><small>${esc(l.sub || '')}</small></a>`;
      })
      .join('');

    const personalHtml = cfg.statuses
      ? `<div class="dp-sep"></div><div class="dp-subhead">${esc(cfg.personalTitle || '')}</div><div class="dp-statuses">` +
        cfg.statuses.map((s) => `<a class="dp-status-chip" href="${esc(s.href)}">${esc(s.label)}</a>`).join('') +
        `</div>`
      : '';

    dpEl.innerHTML = `
      <div class="dp-head">
        <div><strong>${esc(cfg.title)}</strong><span>${esc(cfg.en)}</span></div>
        ${cfg.allHref ? `<a class="dp-all" href="${esc(cfg.allHref)}">${esc(cfg.allLabel || '全部 →')}</a>` : ''}
      </div>
      <div class="dp-grid">${linksHtml}</div>
      ${personalHtml}`;

    const rect = triggerEl.getBoundingClientRect();
    const headerRect = document.getElementById('headerNeue2')?.getBoundingClientRect();
    if (headerRect) {
      dpEl.style.left = Math.max(12, Math.min(rect.left - headerRect.left, window.innerWidth - 360)) + 'px';
    }
    dpEl.classList.add('is-open');
  };

  document.addEventListener('pointerover', (ev) => {
    const trig = ev.target?.closest?.('#headerNeue2 [data-dp]');
    if (trig) {
      openDpFor(trig, trig.getAttribute('data-dp'));
    } else if (ev.target?.closest?.('#topDpPopover')) {
      clearTimeout(dpCloseTimer);
    }
  });

  document.addEventListener('pointerout', (ev) => {
    const trig = ev.target?.closest?.('#headerNeue2 [data-dp], #topDpPopover');
    if (trig) {
      clearTimeout(dpCloseTimer);
      dpCloseTimer = setTimeout(closeDp, 180);
    }
  });

  document.addEventListener(
    'submit',
    (ev) => {
      const f = ev.target;
      if (!f || f.id !== 'headerSearch') return;
      ev.preventDefault();
      ev.stopPropagation();
      const inp = f.querySelector('#search_text, input[name="search_text"]');
      const sel = f.querySelector('#siteSearchSelect');
      const q = inp ? String(inp.value || '').trim() : '';
      if (!q) {
        showToast('请先输入搜索关键词');
        inp?.focus();
        return;
      }
      const cat = sel?.value || 'all';
      if (cat === 'person') {
        location.href = `/mono_search/${encodeURIComponent(q)}?cat=all`;
      } else {
        location.href = `/subject_search/${encodeURIComponent(q)}?cat=${encodeURIComponent(cat)}`;
      }
    },
    true
  );

  document.addEventListener('click', (ev) => {
    const ctx = currentShellContext;
    if (!ctx) return;

    const catPick = ev.target?.closest?.('[data-bgm-search-cat]');
    if (catPick) {
      const val = catPick.getAttribute('data-bgm-search-cat');
      const label = catPick.getAttribute('data-bgm-search-label');
      const sel = document.getElementById('siteSearchSelect');
      const lbl = document.getElementById('searchCatLabel');
      if (sel) sel.value = val;
      if (lbl) lbl.textContent = label;
      closeDp();
      return;
    }

    if (ev.target?.closest?.('#btnThemeToggle')) {
      const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const nextTheme = cur === 'dark' ? 'light' : 'dark';
      ctx.onUpdateSettings({ theme: nextTheme });
      showToast('已切换为「' + (nextTheme === 'dark' ? '曜石深色' : '流光浅色') + '」模式');
      return;
    }

    if (ev.target?.closest?.('#btnOpenCustomize')) {
      const m = document.getElementById('customizeModal');
      if (m) m.hidden = false;
      return;
    }

    const setThemeBtn = ev.target?.closest?.('[data-bgm-set-theme]');
    if (setThemeBtn) {
      ctx.onUpdateSettings({ theme: setThemeBtn.getAttribute('data-bgm-set-theme') });
      return;
    }

    const setAccentBtn = ev.target?.closest?.('[data-bgm-set-accent]');
    if (setAccentBtn) {
      ctx.onUpdateSettings({ accent: setAccentBtn.getAttribute('data-bgm-set-accent') });
      return;
    }

    const toggleOptBtn = ev.target?.closest?.('[data-bgm-toggle]');
    if (toggleOptBtn) {
      const k = toggleOptBtn.getAttribute('data-bgm-toggle');
      ctx.onUpdateSettings({ [k]: !ctx.settings[k] });
      return;
    }

    const tabBtn = ev.target?.closest?.('#customizeModal [data-bsh-tab]');
    if (tabBtn) {
      const tab = tabBtn.getAttribute('data-bsh-tab');
      const m = document.getElementById('customizeModal');
      if (!m) return;
      m.querySelectorAll('.bsh-modal-tab').forEach((b) =>
        b.classList.toggle('is-active', b.getAttribute('data-bsh-tab') === tab)
      );
      m.querySelectorAll('[data-bsh-general]').forEach((el) => (el.hidden = tab !== 'general'));
      m.querySelectorAll('[data-bsh-panel]').forEach(
        (el) => (el.hidden = el.getAttribute('data-bsh-panel') !== tab)
      );
      return;
    }

    const bshAct = ev.target?.closest?.('[data-bsh-act]');
    if (bshAct) {
      const act = bshAct.getAttribute('data-bsh-act');
      if (act === 'toggle-dock') {
        const dock = document.getElementById('bsh-dock');
        if (dock) {
          const collapsed = dock.classList.toggle('is-collapsed');
          const lbl = dock.querySelector('.bsh-dock-toggle-label');
          const btn = dock.querySelector('.bsh-dock-toggle');
          if (lbl) lbl.textContent = collapsed ? '展开' : '收起';
          if (btn) {
            btn.setAttribute('aria-expanded', String(!collapsed));
            btn.setAttribute('title', collapsed ? '展开灵动岛' : '收起灵动岛');
          }
          try {
            localStorage.setItem('bgm_dock_collapsed_v1', collapsed ? '1' : '0');
          } catch {}
        }
        return;
      }
      if (act === 'notify') location.href = '/notify/all';
      else if (act === 'pm') location.href = '/pm';
      else if (act === 'settings') location.href = '/settings';
      else if (act === 'theme') {
        const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        const nextTheme = cur === 'dark' ? 'light' : 'dark';
        ctx.onUpdateSettings({ theme: nextTheme });
        showToast('已切换为「' + (nextTheme === 'dark' ? '曜石深色' : '流光浅色') + '」模式');
      } else if (act === 'logout') {
        if (ctx.session.loggedIn && ctx.session.logoutUrl) {
          location.href = ctx.session.logoutUrl;
        } else {
          location.href = '/login';
        }
      } else if (act === 'customize') {
        const m = document.getElementById('customizeModal');
        if (m) m.hidden = false;
      } else if (act === 'close-customize') {
        const m = document.getElementById('customizeModal');
        if (m) m.hidden = true;
      } else if (act === 'robot') {
        const r = document.getElementById('bsh-robot');
        if (r) {
          r.hidden = !r.hidden;
          try {
            localStorage.setItem('bgm_robot_visible_v1', r.hidden ? '0' : '1');
          } catch {}
          showToast(r.hidden ? '春菜已隐藏' : '春菜回来啦');
        }
      } else if (act === 'robot-say') {
        const lines = [
          '主人，全站 29 路由检测与高清封面升格已就绪 ✨',
          '评分一律保持传统十星 + 数字，绝不折算 ⭐',
          '原站 formhash 与超合金组件全兼容运行中 🧩',
        ];
        const b = document.getElementById('bshRobotBubble');
        if (b) {
          b.innerHTML =
            lines[Math.floor(Math.random() * lines.length)] +
            '<small class="bsh-robot-sub">UKAGAKA SHELL · 点击小电视换一句</small>';
        }
      }
      return;
    }

    if (!ev.target?.closest?.('#headerNeue2 [data-dp], #topDpPopover') && dpCurrentKey) {
      closeDp();
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeDp();
      const m = document.getElementById('customizeModal');
      if (m) m.hidden = true;
      return;
    }
    if (
      ev.key === '/' &&
      !ev.ctrlKey &&
      !ev.metaKey &&
      !ev.altKey &&
      !/^(INPUT|TEXTAREA|SELECT)$/i.test(document.activeElement?.tagName || '')
    ) {
      const inp = document.getElementById('search_text');
      if (inp) {
        ev.preventDefault();
        inp.focus();
      }
    }
  });
}

export function mountShell({ doc = document, route, settings, onUpdateSettings, activatePageStyles }) {
  if (!doc?.body) return null;

  const session = extractSessionFromDOM(doc);
  currentShellContext = { session, route, settings, onUpdateSettings, activatePageStyles };

  if (route.frameRole !== 'top') {
    doc.documentElement.dataset.bgmShellReady = '1';
    return session;
  }

  vaultOriginalShell(doc);
  mountHeader(doc, session, route);
  mountFooter(doc);
  mountDock(doc, session);
  mountRobot(doc, route);
  mountCustomizeModal(doc, session, route, settings);
  bindShellEvents();

  doc.documentElement.dataset.bgmShellReady = '1';

  if (typeof window !== 'undefined') {
    window.__BGM_EXT_SHELL__ = {
      session,
      route,
      toast: (msg) => showToast(msg, doc),
      extractSessionFromDOM: () => extractSessionFromDOM(doc),
      activatePageStyles: (names) => activatePageStyles?.(names),
    };
  }

  return session;
}

export function refreshShellModal(doc = document, settings) {
  if (!currentShellContext || !doc) return;
  currentShellContext.settings = settings;
  const m = doc.getElementById('customizeModal');
  if (m && currentShellContext.route?.frameRole === 'top') {
    const wasHidden = m.hidden;
    mountCustomizeModal(doc, currentShellContext.session, currentShellContext.route, settings);
    m.hidden = wasHidden;
  }
}

export function unmountShell(doc = document) {
  if (!doc?.body) return;
  doc.querySelectorAll('[data-bgm-shell-el="1"], [data-bgm-hydrated-el="1"], style[id^="bgm-page-style-"]').forEach((el) => el.remove());
  restoreLegacyShell(doc);
  doc.documentElement.classList.remove('bsh-has-dock');
  delete doc.documentElement.dataset.bgmShellReady;
  delete doc.documentElement.dataset.bgmPageHydrated;
  currentShellContext = null;
}
