/**
 * Bangumi Chronicle · Content Script 总控入口（document_start）
 * - document_start 阶段只同步注入作用域化 SHELL_CSS 与防白闪遮罩，绝不提前抢跑挂载顶栏/页脚
 * - DOMContentLoaded 就绪后（原站 #wrapperNeue / #headerNeue2 / #footer 已完整解析）再执行 shell-bridge 接管
 */

import { SHELL_CSS, PAGE_CSS_MAP } from '@bgm-css';
import { LG_SVG } from '@bgm-lg-svg';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  mergeSettings,
  resolveTheme,
} from '../shared/settings.js';
import {
  syncBaseStyles,
  syncPageStyles,
  ensureOpticalStage,
  releaseHydrationMask,
} from './anti-fouc.js';
import { matchRoute, applyRouteAttributes } from './router.js';
import {
  upgradeImagesInRoot,
  startCoverObserver,
  stopCoverObserver,
} from './cover-upgrader.js';
import {
  mountShell,
  refreshShellModal,
  unmountShell,
  showToast,
} from './shell-bridge.js';
import { runPhaseBHydrator } from './phase-b/index.js';
import { runPhaseCHydrator } from './phase-c/index.js';
import { runPhaseDHydrator } from './phase-d/index.js';
import { runPhaseEHydrator } from './phase-e/index.js';
import { startAlloySandbox, stopAlloySandbox } from './alloy-sandbox.js';

const CACHE_KEYS = {
  enabled: 'bgm_ext_enabled_v1',
  theme: 'bgm_theme_v1',
  accent: 'bgm_accent_v1',
  hdCovers: 'bgm_hd_covers_v1',
  alloyCompat: 'bgm_alloy_compat_v1',
};

let currentSettings = readCachedSettings();
let resolvedShellCssCache = '';
let resolvedPageCssCache = null;
let activeRoute = matchRoute();

function readCachedSettings() {
  try {
    const rawEnabled = localStorage.getItem(CACHE_KEYS.enabled);
    const rawTheme = localStorage.getItem(CACHE_KEYS.theme);
    const rawAccent = localStorage.getItem(CACHE_KEYS.accent);
    const rawHd = localStorage.getItem(CACHE_KEYS.hdCovers);
    const rawAlloy = localStorage.getItem(CACHE_KEYS.alloyCompat);
    return mergeSettings({
      enabled: rawEnabled === null ? DEFAULT_SETTINGS.enabled : rawEnabled === '1',
      theme: rawTheme || DEFAULT_SETTINGS.theme,
      accent: rawAccent || DEFAULT_SETTINGS.accent,
      hdCovers: rawHd === null ? DEFAULT_SETTINGS.hdCovers : rawHd === '1',
      alloyCompat: rawAlloy === null ? DEFAULT_SETTINGS.alloyCompat : rawAlloy === '1',
    });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeCachedSettings(s) {
  try {
    localStorage.setItem(CACHE_KEYS.enabled, s.enabled ? '1' : '0');
    localStorage.setItem(CACHE_KEYS.theme, s.theme);
    localStorage.setItem(CACHE_KEYS.accent, s.accent);
    localStorage.setItem(CACHE_KEYS.hdCovers, s.hdCovers ? '1' : '0');
    localStorage.setItem(CACHE_KEYS.alloyCompat, s.alloyCompat ? '1' : '0');
  } catch {
    /* 跨帧或隐私模式存储受限时忽略 */
  }
}

function getExtBaseUrl() {
  return typeof chrome !== 'undefined' && chrome?.runtime?.getURL
    ? chrome.runtime.getURL('')
    : '';
}

function resolveShellCss() {
  if (resolvedShellCssCache) return resolvedShellCssCache;
  resolvedShellCssCache = SHELL_CSS.replace(/__BGM_EXT_BASE__/g, getExtBaseUrl());
  return resolvedShellCssCache;
}

function resolvePageCssMap() {
  if (resolvedPageCssCache) return resolvedPageCssCache;
  const baseUrl = getExtBaseUrl();
  resolvedPageCssCache = {};
  for (const [name, css] of Object.entries(PAGE_CSS_MAP)) {
    resolvedPageCssCache[name] = css.replace(/__BGM_EXT_BASE__/g, baseUrl);
  }
  return resolvedPageCssCache;
}

function runPhaseB(session) {
  try {
    const hydratorCtx = {
      doc: document,
      route: activeRoute,
      session: session || null,
      settings: currentSettings,
      activatePageStyles: (names) => syncPageStyles(names, resolvePageCssMap()),
      toast: (msg) => showToast(msg, document),
    };
    runPhaseBHydrator(hydratorCtx);
    runPhaseCHydrator(hydratorCtx);
    runPhaseDHydrator(hydratorCtx);
    runPhaseEHydrator(hydratorCtx);
    startAlloySandbox(document, currentSettings.alloyCompat !== false);
  } catch (err) {
    console.warn('[Bangumi Chronicle] Phase B 水合失败：', err);
  }
}

function updateSettingsPartial(patch) {
  const next = mergeSettings({ ...currentSettings, ...patch });
  applySettings(next);
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    void chrome.storage.local.set({ [STORAGE_KEY]: next }).catch(() => {});
  }
}

function applySettings(next) {
  currentSettings = mergeSettings(next);
  writeCachedSettings(currentSettings);

  const root = document.documentElement;
  if (!root) return;

  const isSubFrame = activeRoute.frameRole !== 'top';

  if (currentSettings.enabled) {
    root.dataset.bgmExt = 'on';
    root.dataset.theme = resolveTheme(currentSettings.theme);
    root.dataset.accent = currentSettings.accent;
    root.dataset.bgmHdCovers = currentSettings.hdCovers ? '1' : '0';
    root.dataset.bgmAlloy = currentSettings.alloyCompat ? '1' : '0';
    applyRouteAttributes(document, activeRoute);
  } else {
    delete root.dataset.bgmExt;
    delete root.dataset.theme;
    delete root.dataset.accent;
    delete root.dataset.bgmHdCovers;
    delete root.dataset.bgmAlloy;
  }

  syncBaseStyles({
    enabled: currentSettings.enabled,
    cssText: resolveShellCss(),
    isSubFrame,
  });
  ensureOpticalStage({
    enabled: currentSettings.enabled,
    lgSvgMarkup: LG_SVG,
    isSubFrame,
  });

  // 严格等到 DOM 解析完成后再挂载/卸载共享壳层，防止在 #wrapperNeue 解析前抢跑导致页脚置顶与原站顶栏漏网
  if (document.readyState !== 'loading' && document.body) {
    if (currentSettings.enabled) {
      if (!root.dataset.bgmShellReady) {
        const session = mountShell({
          doc: document,
          route: activeRoute,
          settings: currentSettings,
          onUpdateSettings: updateSettingsPartial,
          activatePageStyles: (names) => syncPageStyles(names, resolvePageCssMap()),
        });
        runPhaseB(session);
      } else {
        refreshShellModal(document, currentSettings);
      }
      upgradeImagesInRoot(document.body, currentSettings.hdCovers);
      startCoverObserver(() => currentSettings.enabled && currentSettings.hdCovers);
    } else {
      stopCoverObserver();
  stopAlloySandbox(document);
      upgradeImagesInRoot(document.body, false);
      unmountShell(document);
    }
  }
}

function onDomReady() {
  activeRoute = matchRoute({ doc: document });
  applyRouteAttributes(document, activeRoute);

  if (currentSettings.enabled) {
    ensureOpticalStage({
      enabled: true,
      lgSvgMarkup: LG_SVG,
      isSubFrame: activeRoute.frameRole !== 'top',
    });
    const session = mountShell({
      doc: document,
      route: activeRoute,
      settings: currentSettings,
      onUpdateSettings: updateSettingsPartial,
      activatePageStyles: (names) => syncPageStyles(names, resolvePageCssMap()),
    });
    runPhaseB(session);
    upgradeImagesInRoot(document.body, currentSettings.hdCovers);
    startCoverObserver(() => currentSettings.enabled && currentSettings.hdCovers);
  }

  document.documentElement.dataset.bgmHydratedDone = '1';
  releaseHydrationMask();
}

// 1. document_start 同步零延迟注入作用域化壳层样式与防白闪遮罩
applyRouteAttributes(document, activeRoute);
applySettings(currentSettings);

// 2. DOM 解析完成后再挂载共享壳层与高清封面升格
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
} else {
  onDomReady();
}

// 3. 校准 chrome.storage.local 持久化设置与广播监听
if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
  chrome.storage.local
    .get(STORAGE_KEY)
    .then((got) => {
      if (got?.[STORAGE_KEY]) {
        applySettings(got[STORAGE_KEY]);
      } else {
        void chrome.storage.local.set({ [STORAGE_KEY]: currentSettings });
      }
    })
    .catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]?.newValue) {
      applySettings(changes[STORAGE_KEY].newValue);
    }
  });
}

if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'bgm:settings-updated' && msg.settings) {
      applySettings(msg.settings);
    }
  });
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', () => {
    if (currentSettings.enabled && currentSettings.theme === 'auto') {
      document.documentElement.dataset.theme = resolveTheme('auto');
      refreshShellModal(document, currentSettings);
    }
  });
}
