/**
 * Bangumi Chronicle · document_start 防白闪与光学环境注入引擎 (Anti-FOUC)
 * - 仅注入严格作用域化的 SHELL_CSS，绝不污染未接管页面的原生 #wrapperNeue / #main 排版
 * - 提供 syncPageStyles() 供 Phase B–F 页面水合器按需挂载对应页面的专属 CSS
 * - document_start 即刻隐藏原站 #headerNeue2 / #footer / #dock / #robot，杜绝双顶栏或页脚闪烁
 */

const SHELL_STYLE_ID = 'bgm-liquid-glass-style';
const PAGE_STYLE_PREFIX = 'bgm-page-style-';
const ANTI_FOUC_STYLE_ID = 'bgm-anti-fouc-style';
const COMPAT_STYLE_ID = 'bgm-ext-compat-style';
const LG_SVG_ID = 'bgm-lg-filters';
const AMBIENT_ID = 'ambientCanvas';
const TOAST_ID = 'toastContainer';

const ANTI_FOUC_CSS = `
html[data-bgm-ext="on"][data-bgm-hydrating="1"] #wrapperNeue,
html[data-bgm-ext="on"][data-bgm-hydrating="1"] #main {
  opacity: 0 !important;
}
html[data-bgm-ext="on"] #wrapperNeue,
html[data-bgm-ext="on"] #main {
  transition: opacity 0.16s ease;
}
`;

const EXT_COMPAT_CSS = `
#bgm-legacy-vault {
  position: fixed !important;
  left: -99999px !important;
  top: -99999px !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
/* 阻止原站自带顶栏/页脚/Dock/春菜在 DOM 解析或水合前后闪出 */
html[data-bgm-ext="on"][data-bgm-frame="top"] #wrapperNeue #headerNeue2:not([data-bgm-shell-el="1"]),
html[data-bgm-ext="on"][data-bgm-frame="top"] #wrapperNeue #footer:not([data-bgm-shell-el="1"]),
html[data-bgm-ext="on"][data-bgm-frame="top"] #dock:not([data-bgm-shell-el="1"]),
html[data-bgm-ext="on"][data-bgm-frame="top"] #robot:not([data-bgm-shell-el="1"]) {
  display: none !important;
}
html[data-bgm-ext="on"] body {
  background: var(--canvas, #f5f4f1) !important;
  color: var(--ink, #17181a);
  min-height: 100vh;
  overflow-x: hidden;
}
html[data-bgm-ext="on"][data-bgm-frame="top"] #wrapperNeue {
  position: relative;
  z-index: 1;
  background: transparent !important;
  min-height: calc(100vh - 280px);
}
html[data-bgm-ext="on"][data-bgm-frame="top"] header.top[data-bgm-shell-el="1"] {
  position: relative;
  z-index: 200;
}
html[data-bgm-ext="on"][data-bgm-frame="top"] #topDpPopover {
  z-index: 260;
}
html[data-bgm-ext="on"][data-bgm-frame="top"] footer.glass-footer[data-bgm-shell-el="1"] {
  position: relative;
  z-index: 2;
}
`;

let hydrationTimer = 0;
let bodyObserver = null;

function upsertStyle(id, text, enabled) {
  const existing = document.getElementById(id);
  if (!enabled) {
    if (existing) existing.remove();
    return;
  }
  if (existing) {
    if (existing.textContent !== text) existing.textContent = text;
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = text;
  const target = document.head || document.documentElement;
  if (target) target.appendChild(style);
}

export function startHydrationMask(isSubFrame = false) {
  const root = document.documentElement;
  if (!root || isSubFrame) return;
  root.dataset.bgmHydrating = '1';
  clearTimeout(hydrationTimer);
  hydrationTimer = setTimeout(() => {
    releaseHydrationMask();
  }, 150);
}

export function releaseHydrationMask() {
  clearTimeout(hydrationTimer);
  hydrationTimer = 0;
  const root = document.documentElement;
  if (root && root.dataset.bgmHydrating) {
    delete root.dataset.bgmHydrating;
  }
}

export function syncBaseStyles({ enabled, cssText, isSubFrame = false }) {
  upsertStyle(ANTI_FOUC_STYLE_ID, ANTI_FOUC_CSS, enabled);
  upsertStyle(SHELL_STYLE_ID, cssText, enabled);
  upsertStyle(COMPAT_STYLE_ID, EXT_COMPAT_CSS, enabled);

  if (enabled) {
    if (!document.documentElement.dataset.bgmHydratedDone) {
      startHydrationMask(isSubFrame);
    }
  } else {
    clearPageStyles();
    releaseHydrationMask();
  }
}

export function syncPageStyles(cssNames = [], resolvedPageCssMap = {}) {
  clearPageStyles();
  for (const name of cssNames) {
    const css = resolvedPageCssMap[name];
    if (css) {
      upsertStyle(PAGE_STYLE_PREFIX + name, css, true);
    }
  }
}

export function clearPageStyles() {
  document.querySelectorAll(`style[id^="${PAGE_STYLE_PREFIX}"]`).forEach((el) => el.remove());
}

export function ensureOpticalStage({ enabled, lgSvgMarkup, isSubFrame = false }) {
  if (!enabled) {
    document.getElementById(LG_SVG_ID)?.remove();
    document.getElementById(AMBIENT_ID)?.remove();
    return;
  }

  const mountIntoBody = () => {
    const body = document.body;
    if (!body) return false;

    if (!isSubFrame && lgSvgMarkup && !document.getElementById(LG_SVG_ID)) {
      const holder = document.createElement('div');
      holder.innerHTML = lgSvgMarkup.trim();
      const svg = holder.firstElementChild;
      if (svg) {
        svg.id = LG_SVG_ID;
        body.insertBefore(svg, body.firstChild);
      }
    }

    if (!isSubFrame && !document.getElementById(AMBIENT_ID)) {
      const ambient = document.createElement('div');
      ambient.className = 'ambient-canvas';
      ambient.id = AMBIENT_ID;
      ambient.setAttribute('aria-hidden', 'true');
      ambient.innerHTML =
        '<div class="ambient-orb orb-primary" id="orbPrimary"></div>' +
        '<div class="ambient-orb orb-secondary" id="orbSecondary"></div>' +
        '<div class="ambient-orb orb-tertiary" id="orbTertiary"></div>' +
        '<div class="ambient-noise"></div>';
      body.insertBefore(ambient, body.firstChild);
    }

    if (!document.getElementById(TOAST_ID)) {
      const toastHost = document.createElement('div');
      toastHost.id = TOAST_ID;
      toastHost.className = 'toast-container';
      toastHost.setAttribute('aria-live', 'polite');
      body.appendChild(toastHost);
    }

    return true;
  };

  if (mountIntoBody()) return;

  if (bodyObserver) return;
  bodyObserver = new MutationObserver(() => {
    if (mountIntoBody()) {
      bodyObserver?.disconnect();
      bodyObserver = null;
    }
  });
  if (document.documentElement) {
    bodyObserver.observe(document.documentElement, { childList: true });
  }
}
