/**
 * Bangumi Chronicle · 全站封面高清升格器 & no-referrer 守护 (cover-upgrader.js)
 * - 将 /pic/cover/(s|c|m|g)/ 与低分辨率 /r/(100|150|200)/pic/cover/... 自动升格为 https://lain.bgm.tv/r/400/pic/cover/l/...
 * - 强制为 lain.bgm.tv / api.bgm.tv / bgm.tv 图片挂载 referrerpolicy="no-referrer"
 * - 支持开关关闭时无损还原原始 src / background-image
 */

const LOW_COVER_RE = /^(?:https?:)?\/\/lain\.bgm\.tv\/(?:r\/(?:100|150|200)(?:x(?:100|150|200))?\/)?pic\/cover\/(?:s|c|m|g|l)\/(.+)$/i;
const STRICT_LOW_RE = /^(?:https?:)?\/\/lain\.bgm\.tv\/(?:r\/(?:100|150|200)(?:x(?:100|150|200))?\/pic\/cover\/[scmlg]|pic\/cover\/(?:s|c|m|g))\/(.+)$/i;
const BGM_IMG_HOST_RE = /(?:lain\.bgm\.tv|api\.bgm\.tv|bgm\.tv\/pic)/i;
const BG_URL_RE = /url\((['"]?)([^'")]+)\1\)/i;

let observer = null;
let enabledGetter = () => true;

export function upgradeCoverUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed) return rawUrl;
  const match = trimmed.match(STRICT_LOW_RE);
  if (!match) return rawUrl;
  return `https://lain.bgm.tv/r/400/pic/cover/l/${match[1]}`;
}

export function isLowResCoverUrl(rawUrl) {
  return typeof rawUrl === 'string' && STRICT_LOW_RE.test(rawUrl.trim());
}

function processImageEl(img, enabled) {
  if (!img || img.tagName !== 'IMG') return;

  const curSrc = img.getAttribute('src') || '';
  const dataSrc = img.getAttribute('data-src') || '';
  const checkSrc = curSrc || dataSrc;

  if (BGM_IMG_HOST_RE.test(checkSrc) && img.getAttribute('referrerpolicy') !== 'no-referrer') {
    img.setAttribute('referrerpolicy', 'no-referrer');
  }

  if (enabled) {
    if (curSrc && isLowResCoverUrl(curSrc)) {
      if (!img.dataset.bgmOrigSrc) img.dataset.bgmOrigSrc = curSrc;
      const hd = upgradeCoverUrl(curSrc);
      if (hd !== curSrc) img.setAttribute('src', hd);
    }
    if (dataSrc && isLowResCoverUrl(dataSrc)) {
      if (!img.dataset.bgmOrigDataSrc) img.dataset.bgmOrigDataSrc = dataSrc;
      const hd = upgradeCoverUrl(dataSrc);
      if (hd !== dataSrc) img.setAttribute('data-src', hd);
    }
  } else {
    if (img.dataset.bgmOrigSrc) {
      img.setAttribute('src', img.dataset.bgmOrigSrc);
      delete img.dataset.bgmOrigSrc;
    }
    if (img.dataset.bgmOrigDataSrc) {
      img.setAttribute('data-src', img.dataset.bgmOrigDataSrc);
      delete img.dataset.bgmOrigDataSrc;
    }
  }
}

function processBgEl(el, enabled) {
  if (!el || !el.style) return;
  const bg = el.style.backgroundImage;
  if (!bg || bg === 'none') return;

  if (enabled) {
    const m = bg.match(BG_URL_RE);
    if (!m) return;
    const rawUrl = m[2];
    if (!isLowResCoverUrl(rawUrl)) return;
    if (!el.dataset.bgmOrigBg) el.dataset.bgmOrigBg = bg;
    const hd = upgradeCoverUrl(rawUrl);
    if (hd !== rawUrl) {
      el.style.backgroundImage = `url("${hd}")`;
    }
  } else if (el.dataset.bgmOrigBg) {
    el.style.backgroundImage = el.dataset.bgmOrigBg;
    delete el.dataset.bgmOrigBg;
  }
}

export function upgradeImagesInRoot(root, enabled = true) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  if (root.tagName === 'IMG') {
    processImageEl(root, enabled);
    return;
  }
  const imgs = root.querySelectorAll('img');
  for (let i = 0; i < imgs.length; i++) {
    processImageEl(imgs[i], enabled);
  }
  const styled = root.querySelectorAll('[style*="lain.bgm.tv"]');
  for (let i = 0; i < styled.length; i++) {
    processBgEl(styled[i], enabled);
  }
}

export function startCoverObserver(getEnabled) {
  enabledGetter = typeof getEnabled === 'function' ? getEnabled : () => Boolean(getEnabled);
  if (observer || typeof MutationObserver === 'undefined') return;

  observer = new MutationObserver((mutations) => {
    const enabled = enabledGetter();
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'childList') {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'IMG') {
            processImageEl(node, enabled);
          } else {
            upgradeImagesInRoot(node, enabled);
          }
        }
      } else if (m.type === 'attributes' && m.target?.nodeType === 1) {
        if (m.target.tagName === 'IMG') processImageEl(m.target, enabled);
        else processBgEl(m.target, enabled);
      }
    }
  });

  const target = document.documentElement || document.body;
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-src', 'style'],
    });
  }
}

export function stopCoverObserver() {
  observer?.disconnect();
  observer = null;
}

export { LOW_COVER_RE };
