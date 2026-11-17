/**
 * Bangumi Chronicle · Phase C 条目核心与维基体系水合调度器 (P04–P12)
 */

import { hydrateSubjectPage } from './subject-hydrator.js';
import {
  hydrateSubjectEpPage,
  hydrateEpDetailPage,
  hydrateSubjectCharactersPage,
  hydrateSubjectPersonsPage,
  hydrateSubjectCommentsPage,
  hydrateSubjectReviewsBoardPage,
  hydrateSubjectStatsPage,
  hydrateSubjectWikiPage,
} from './subject-subpages-hydrator.js';

const PHASE_C_HANDLERS = {
  P04: hydrateSubjectPage,
  P05: hydrateSubjectEpPage,
  P06: hydrateEpDetailPage,
  P07: hydrateSubjectCharactersPage,
  P08: hydrateSubjectPersonsPage,
  P09: hydrateSubjectCommentsPage,
  P10: hydrateSubjectReviewsBoardPage,
  P11: hydrateSubjectStatsPage,
  P12: hydrateSubjectWikiPage,
};

export function runPhaseCHydrator(ctx) {
  if (!ctx?.route || ctx.route.frameRole !== 'top') return false;
  const handler = PHASE_C_HANDLERS[ctx.route.page];
  if (!handler) return false;
  if (ctx.doc?.documentElement?.dataset?.bgmPageHydrated === '1') return true;
  handler(ctx);
  return true;
}
