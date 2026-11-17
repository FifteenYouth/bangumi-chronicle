/**
 * Bangumi Chronicle · 后台 Service Worker
 * 负责：初始化默认设置、监听变更并广播至所有 Bangumi 标签页、维护扩展徽标状态。
 */

import { DEFAULT_SETTINGS, STORAGE_KEY, mergeSettings } from './shared/settings.js';

const BANGUMI_URL_PATTERNS = [
  '*://bgm.tv/*',
  '*://bangumi.tv/*',
  '*://chii.in/*',
];

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#66686d' });
}

chrome.runtime.onInstalled.addListener(async () => {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  const current = got?.[STORAGE_KEY] ? mergeSettings(got[STORAGE_KEY]) : DEFAULT_SETTINGS;
  if (!got?.[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  }
  updateBadge(current.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  const current = mergeSettings(got?.[STORAGE_KEY]);
  updateBadge(current.enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const next = mergeSettings(changes[STORAGE_KEY].newValue);
  updateBadge(next.enabled);

  chrome.tabs.query({ url: BANGUMI_URL_PATTERNS }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id == null) continue;
      chrome.tabs.sendMessage(tab.id, {
        type: 'bgm:settings-updated',
        settings: next,
      }).catch(() => {
        /* 目标标签页尚未注入 content script 时静默忽略 */
      });
    }
  });
});
