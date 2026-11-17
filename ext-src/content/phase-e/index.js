/**
 * Bangumi Chronicle · Phase E 社区、人物、阅读与实验室水合调度器 (P18–P24, P28–P29)
 */

import {
  hydrateMonoChannelPage,
  hydrateMonoDetailPage,
  hydrateRakuenPage,
  hydrateGroupPage,
  hydrateTopicDetailPage,
  hydrateBlogPage,
  hydrateCatalogPage,
  hydrateSettingsPage,
  hydrateExplorePage,
} from './community-hydrator.js';

const PHASE_E_HANDLERS = {
  P18: hydrateMonoChannelPage,
  P19: hydrateMonoDetailPage,
  P20: hydrateRakuenPage,
  P21: hydrateGroupPage,
  P22: hydrateTopicDetailPage,
  P23: hydrateBlogPage,
  P24: hydrateCatalogPage,
  P28: hydrateSettingsPage,
  P29: hydrateExplorePage,
};

export function runPhaseEHydrator(ctx) {
  if (!ctx?.route) return false;
  // P20 超展开支持 top 以及 rakuen-left / rakuen-right 子窗口
  if (ctx.route.page !== 'P20' && ctx.route.frameRole !== 'top') return false;
  const handler = PHASE_E_HANDLERS[ctx.route.page];
  if (!handler) return false;
  if (ctx.doc?.documentElement?.dataset?.bgmPageHydrated === '1') return true;
  handler(ctx);
  return true;
}
