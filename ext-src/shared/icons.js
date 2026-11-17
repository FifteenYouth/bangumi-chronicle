/**
 * Bangumi Chronicle · 全局统一线性玻璃 SVG 图标引擎 (icons.js)
 * 将所有界面标题、面板头、按钮与徽章中的系统彩色 Emoji 统一替换为与顶栏/灵动岛同源的 1.8px 线性 SVG 图标。
 */

const S = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const SVG_PATHS = {
  clapper: S('<rect x="2" y="6" width="20" height="15" rx="2.5"/><path d="M2 11h20M7 6l3 5M14 6l3 5"/>'),
  tv: S('<rect x="3" y="6.5" width="18" height="13.5" rx="3.5"/><path d="m8 2.5 3.5 4m4.5-4-3.5 4"/>'),
  book: S('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  openBook: S('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  disc: S('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.8"/><path d="M14.5 9.5 19 5"/>'),
  music: S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  gamepad: S('<rect x="2" y="6" width="20" height="12" rx="5"/><path d="M6 12h4m-2-2v4m7-1h.01M18 11h.01"/>'),
  film: S('<rect x="2" y="3" width="20" height="18" rx="2.5"/><path d="M7 3v18M17 3v18M2 8h5m10 0h5M2 12h20M2 16h5m10 0h5"/>'),
  list: S('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  users: S('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  user: S('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  folder: S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  tag: S('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>'),
  masks: S('<path d="M10 11h.01M14 11h.01M10 15c1.3 1 2.7 1 4 0"/><rect x="4" y="4" width="16" height="16" rx="4"/>'),
  link: S('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  pen: S('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  chat: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  zap: S('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  heart: S('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
  chart: S('<path d="M18 20V10M12 20V4M6 20v-6"/>'),
  trend: S('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  save: S('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'),
  cog: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'),
  calendar: S('<rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 0 0 18 14.5 14.5 0 0 0 0-18"/>'),
  radio: S('<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>'),
  bell: S('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
  mail: S('<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
  flame: S('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  sparkle: S('<path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z"/>'),
  compass: S('<circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'),
  trophy: S('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16m-10-7.34V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
  crown: S('<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>'),
  image: S('<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  grid: S('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>'),
  trash: S('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  building: S('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v.01M15 9v.01M9 13v.01M15 13v.01M9 17v.01M15 17v.01"/>'),
  star: S('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  home: S('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  key: S('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6m4.1-4.1 3 3"/>'),
  bulb: S('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6m-5 4h4"/>'),
  logout: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
};

const EMOJI_TO_ICON = {
  '🎬': 'clapper',
  '📺': 'tv',
  '📚': 'book',
  '📖': 'openBook',
  '💿': 'disc',
  '🎵': 'music',
  '🎮': 'gamepad',
  '🎞️': 'film',
  '🎞': 'film',
  '📋': 'list',
  '📑': 'list',
  '👥': 'users',
  '🤝': 'users',
  '👤': 'user',
  '📁': 'folder',
  '📂': 'folder',
  '🏷️': 'tag',
  '🏷': 'tag',
  '🎭': 'masks',
  '🔗': 'link',
  '✍️': 'pen',
  '✍': 'pen',
  '✒️': 'pen',
  '✒': 'pen',
  '📝': 'pen',
  '✏️': 'pen',
  '✏': 'pen',
  '💬': 'chat',
  '⚡': 'zap',
  '💖': 'heart',
  '❤️': 'heart',
  '❤': 'heart',
  '📊': 'chart',
  '📈': 'trend',
  '🔍': 'search',
  '🔎': 'search',
  '💾': 'save',
  '⚙️': 'cog',
  '⚙': 'cog',
  '🕰️': 'clock',
  '🕰': 'clock',
  '⏱️': 'clock',
  '⏱': 'clock',
  '💊': 'clock',
  '📅': 'calendar',
  '🗓️': 'calendar',
  '🗓': 'calendar',
  '🌐': 'globe',
  '📡': 'radio',
  '🔔': 'bell',
  '✉️': 'mail',
  '✉': 'mail',
  '📥': 'mail',
  '📤': 'mail',
  '🔥': 'flame',
  '✨': 'sparkle',
  '🧭': 'compass',
  '🏆': 'trophy',
  '👑': 'crown',
  '🥈': 'trophy',
  '🥉': 'trophy',
  '🖼️': 'image',
  '🖼': 'image',
  '🧩': 'grid',
  '🧠': 'bulb',
  '💡': 'bulb',
  '🎂': 'sparkle',
  '🗑️': 'trash',
  '🗑': 'trash',
  '🏛️': 'building',
  '🏛': 'building',
  '⭐': 'star',
  '🏠': 'home',
  '🔑': 'key',
  '↪️': 'logout',
  '↪': 'logout',
};

const EMOJI_KEYS = Object.keys(EMOJI_TO_ICON).sort((a, b) => b.length - a.length);
const EMOJI_REGEX = new RegExp(
  '(' + EMOJI_KEYS.map((k) => k.replace(/[.*+?^$${}()|[\]\\]/g, '\\$&')).join('|') + ')',
  'g'
);

const SKIP_ANCESTOR_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'code',
  'pre',
  '.tml-like-pill',
  '.btl-like-chip',
  '.tsukkomi-speech-text',
  '.user-bio-text',
  '.message',
  '.cmt_sub_content',
  '.topic_content',
  '#entry_content',
  '.browser-comment-bubble',
  '.review-excerpt',
  '.bch-blog-excerpt',
  '.timeline-dot-body',
  '.tml-action-line',
  '.btl-action-line',
].join(', ');

/**
 * 将容器内所有 UI 界面的 Emoji 文本节点原地替换为 <span class="bgm-ico"><svg .../></span>
 */
export function upgradeEmojisInTree(root) {
  if (!root || !root.ownerDocument) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const textNodes = [];
  let cur;
  while ((cur = walker.nextNode())) {
    if (cur.nodeValue && EMOJI_REGEX.test(cur.nodeValue)) {
      EMOJI_REGEX.lastIndex = 0;
      const parent = cur.parentElement;
      if (!parent || parent.closest?.(SKIP_ANCESTOR_SELECTOR)) continue;
      textNodes.push(cur);
    }
  }

  for (let i = 0; i < textNodes.length; i++) {
    const tNode = textNodes[i];
    const text = tNode.nodeValue || '';
    const parent = tNode.parentElement;
    if (!parent) continue;

    // 若父元素本身就是单个图标容器 (.panel-icon, .cat-icon-badge 等) 且只含此 Emoji
    const trimmed = text.trim();
    if (EMOJI_TO_ICON[trimmed] && parent.childNodes.length === 1) {
      const iconName = EMOJI_TO_ICON[trimmed];
      parent.innerHTML = SVG_PATHS[iconName];
      parent.classList.add('bgm-ico');
      continue;
    }

    const parts = text.split(EMOJI_REGEX);
    if (parts.length <= 1) continue;
    const frag = doc.createDocumentFragment();
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (!part) continue;
      const iconName = EMOJI_TO_ICON[part];
      if (iconName && SVG_PATHS[iconName]) {
        const span = doc.createElement('span');
        span.className = 'bgm-ico';
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = SVG_PATHS[iconName];
        frag.appendChild(span);
      } else {
        frag.appendChild(doc.createTextNode(part));
      }
    }
    parent.replaceChild(frag, tNode);
  }
}
