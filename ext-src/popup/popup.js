import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  mergeSettings,
  resolveTheme,
} from '../shared/settings.js';

let settings = { ...DEFAULT_SETTINGS };

function $(sel) {
  return document.querySelector(sel);
}

function render() {
  const effectiveTheme = resolveTheme(settings.theme);
  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.dataset.accent = settings.accent;

  const enabledToggle = $('#enabledToggle');
  if (enabledToggle) enabledToggle.checked = settings.enabled;

  const bodyPanel = $('#bodyPanel');
  if (bodyPanel) bodyPanel.classList.toggle('is-paused', !settings.enabled);

  const statusSub = $('#statusSub');
  if (statusSub) {
    statusSub.textContent = settings.enabled
      ? '流光毛玻璃已启用'
      : '已暂停 · 恢复原站样式';
  }

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    const active = btn.getAttribute('data-theme-choice') === settings.theme;
    btn.setAttribute('aria-pressed', String(active));
  });

  document.querySelectorAll('[data-accent-choice]').forEach((btn) => {
    const active = btn.getAttribute('data-accent-choice') === settings.accent;
    btn.setAttribute('aria-pressed', String(active));
  });

  document.querySelectorAll('[data-setting-key]').forEach((input) => {
    const key = input.getAttribute('data-setting-key');
    if (key && typeof settings[key] === 'boolean') {
      input.checked = settings[key];
    }
  });

  const verTag = $('#verTag');
  if (verTag && chrome?.runtime?.getManifest) {
    verTag.textContent = `v${chrome.runtime.getManifest().version || '0.1.0'}`;
  }
}

async function save(patch) {
  settings = mergeSettings({ ...settings, ...patch });
  render();
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

async function init() {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEY);
    settings = mergeSettings(got?.[STORAGE_KEY]);
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  render();

  $('#enabledToggle')?.addEventListener('change', (e) => {
    void save({ enabled: e.target.checked });
  });

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-choice');
      if (theme) void save({ theme });
    });
  });

  document.querySelectorAll('[data-accent-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accent = btn.getAttribute('data-accent-choice');
      if (accent) void save({ accent });
    });
  });

  document.querySelectorAll('[data-setting-key]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const key = input.getAttribute('data-setting-key');
      if (key) void save({ [key]: e.target.checked });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
