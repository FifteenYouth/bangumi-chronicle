/**
 * Bangumi Chronicle · Phase B 页面接管调度器 (P01 / P02 / P03 / P25 / P26 / P27)
 */

import { hydrateHomePage } from './home-hydrator.js';
import { hydrateTimelinePage } from './timeline-hydrator.js';
import { hydrateUserPage } from './user-hydrator.js';
import { hydrateNotifyPage } from './notify-hydrator.js';

const PHASE_B_HANDLERS = {
  P01: hydrateHomePage,
  P02: hydrateHomePage,
  P03: hydrateTimelinePage,
  P25: hydrateUserPage,
  P26: hydrateUserPage,
  P27: hydrateNotifyPage,
};

export function runPhaseBHydrator(ctx) {
  if (!ctx?.route || ctx.route.frameRole !== 'top') return false;
  const handler = PHASE_B_HANDLERS[ctx.route.page];
  if (!handler) return false;
  if (ctx.doc?.documentElement?.dataset?.bgmPageHydrated === '1') return true;
  handler(ctx);
  return true;
}
