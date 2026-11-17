/**
 * Bangumi Chronicle · 扩展共享设置模型
 */

export const STORAGE_KEY = 'bgm:ext-settings:v1';

export const THEMES = ['light', 'dark', 'auto'];

export const ACCENTS = ['pink', 'blue', 'amber', 'emerald', 'violet', 'slate'];

export const ACCENT_META = {
  pink: { label: '番组珊瑚粉', hex: '#d9536f' },
  blue: { label: '晴空湛蓝', hex: '#2563eb' },
  amber: { label: '琥珀暖金', hex: '#d97706' },
  emerald: { label: '翡翠薄荷', hex: '#059669' },
  violet: { label: '星云暮紫', hex: '#7c3aed' },
  slate: { label: '曜石岩灰', hex: '#475569' },
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'light',
  accent: 'pink',
  hdCovers: true,
  alloyCompat: true,
};

export function mergeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const theme = THEMES.includes(src.theme) ? src.theme : DEFAULT_SETTINGS.theme;
  const accent = ACCENTS.includes(src.accent) ? src.accent : DEFAULT_SETTINGS.accent;
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_SETTINGS.enabled,
    theme,
    accent,
    hdCovers: typeof src.hdCovers === 'boolean' ? src.hdCovers : DEFAULT_SETTINGS.hdCovers,
    alloyCompat: typeof src.alloyCompat === 'boolean' ? src.alloyCompat : DEFAULT_SETTINGS.alloyCompat,
  };
}

export function resolveTheme(theme) {
  if (theme === 'auto') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}
