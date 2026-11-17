/**
 * Bangumi Chronicle · Phase D 发现与检索体系水合调度器 (P13–P17)
 */

import {
  hydrateChannelPage,
  hydrateBrowserPage,
  hydrateCalendarPage,
  hydrateTagPage,
  hydrateSearchPage,
} from './discovery-hydrator.js';

const PHASE_D_HANDLERS = {
  P13: hydrateChannelPage,
  P14: hydrateBrowserPage,
  P15: hydrateCalendarPage,
  P16: hydrateTagPage,
  P17: hydrateSearchPage,
};

export function runPhaseDHydrator(ctx) {
  if (!ctx?.route || ctx.route.frameRole !== 'top') return false;
  const handler = PHASE_D_HANDLERS[ctx.route.page];
  if (!handler) return false;
  if (ctx.doc?.documentElement?.dataset?.bgmPageHydrated === '1') return true;
  handler(ctx);
  return true;
}
