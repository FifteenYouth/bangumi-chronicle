/**
 * Bangumi Chronicle · Phase F1 全站 29 类页面 (P01–P29) + 超合金沙盒 端到端自动化回归测试
 * 运行方式：node test-full-29-pages.mjs 或 npm run test:dom
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = dirname(fileURLToPath(import.meta.url));
const { JSDOM } = await import('./node_modules/jsdom/lib/api.js');

const { matchRoute, applyRouteAttributes } = await import('./ext-src/content/router.js');
const { runPhaseBHydrator } = await import('./ext-src/content/phase-b/index.js');
const { runPhaseCHydrator } = await import('./ext-src/content/phase-c/index.js');
const { runPhaseDHydrator } = await import('./ext-src/content/phase-d/index.js');
const { runPhaseEHydrator } = await import('./ext-src/content/phase-e/index.js');
const { startAlloySandbox, stopAlloySandbox } = await import('./ext-src/content/alloy-sandbox.js');

function loadSample(file, url) {
  const full = join(root, 'docs', file);
  const html = existsSync(full)
    ? readFileSync(full, 'utf8')
    : '<!DOCTYPE html><html><body><div id="wrapperNeue"><div id="header"><h1>Bangumi</h1></div><div id="main" class="mainWrapper"></div></div></body></html>';
  return new JSDOM(html, { url });
}

const PAGE_CASES = [
  { page: 'P01', url: 'https://bgm.tv/', sample: 'sample_channel_anime.html', injectLogin: true },
  { page: 'P02', url: 'https://bgm.tv/login', sample: 'sample_auth_login.html' },
  { page: 'P03', url: 'https://bgm.tv/timeline', sample: 'sample_timeline_global.html' },
  { page: 'P04', url: 'https://bgm.tv/subject/400602', sample: 'sample_subject_400602.html' },
  { page: 'P05', url: 'https://bgm.tv/subject/400602/ep', sample: 'sample_subject_400602_ep.html' },
  { page: 'P06', url: 'https://bgm.tv/ep/1227087', sample: 'sample_ep_1227087.html' },
  { page: 'P07', url: 'https://bgm.tv/subject/400602/characters', sample: 'sample_subject_400602_characters.html' },
  { page: 'P08', url: 'https://bgm.tv/subject/400602/persons', sample: 'sample_subject_400602_persons.html' },
  { page: 'P09', url: 'https://bgm.tv/subject/400602/comments', sample: 'sample_subject_400602_comments.html' },
  { page: 'P10', url: 'https://bgm.tv/subject/400602/reviews', sample: 'sample_blog_anime.html' },
  { page: 'P11', url: 'https://bgm.tv/subject/400602/stats', sample: 'sample_subject_400602.html' },
  { page: 'P12', url: 'https://bgm.tv/subject/400602/edit_detail', sample: 'sample_explore_wiki.html' },
  { page: 'P13', url: 'https://bgm.tv/anime', sample: 'sample_channel_anime.html' },
  { page: 'P14', url: 'https://bgm.tv/anime/browser?sort=rank', sample: 'sample_anime_browser_rank.html' },
  { page: 'P15', url: 'https://bgm.tv/calendar', sample: 'sample_calendar.html' },
  { page: 'P16', url: 'https://bgm.tv/anime/tag', sample: 'sample_tag_anime.html' },
  { page: 'P17', url: 'https://bgm.tv/subject_search/%E8%8A%99%E8%8E%89%E8%8E%B2', sample: 'sample_search_furiren.html' },
  { page: 'P18', url: 'https://bgm.tv/mono', sample: 'sample_mono_home.html' },
  { page: 'P19', url: 'https://bgm.tv/character/86246', sample: 'sample_crt_86246.html' },
  { page: 'P20', url: 'https://bgm.tv/rakuen/topiclist', sample: 'sample_rakuen_topiclist_subject.html' },
  { page: 'P21', url: 'https://bgm.tv/group/discover', sample: 'sample_group_discover.html' },
  { page: 'P22', url: 'https://bgm.tv/group/topic/391651', sample: 'sample_group_topic.html' },
  { page: 'P23', url: 'https://bgm.tv/blog/382948', sample: 'sample_blog_detail_382948.html' },
  { page: 'P24', url: 'https://bgm.tv/index/44847', sample: 'sample_catalog_detail_44847.html' },
  { page: 'P25', url: 'https://bgm.tv/user/553488', sample: 'sample_user_553488.html' },
  { page: 'P26', url: 'https://bgm.tv/anime/list/553488/collect', sample: 'sample_user_anime_list.html' },
  { page: 'P27', url: 'https://bgm.tv/notify/all', sample: 'sample_notify_all.html' },
  { page: 'P28', url: 'https://bgm.tv/settings', sample: 'sample_user_553488.html' },
  { page: 'P29', url: 'https://bgm.tv/wiki', sample: 'sample_explore_wiki.html' },
];

const results = [];

for (const tc of PAGE_CASES) {
  try {
    const dom = loadSample(tc.sample, tc.url);
    const doc = dom.window.document;
    if (tc.injectLogin) {
      doc.querySelectorAll('#headerNeue2 .guest, #dock a[href*="/login"], form#loginForm').forEach((n) => n.remove());
      const badge = doc.getElementById('headerNeue2') || doc.createElement('div');
      badge.id = 'headerNeue2';
      badge.innerHTML = '<div class="idBadgerNeue"><a class="avatar" href="/user/553488"></a></div>';
      if (!badge.parentNode) doc.body.prepend(badge);
    }

    const u = new URL(tc.url);
    const route = matchRoute({
      pathname: u.pathname,
      search: u.search,
      doc,
      win: dom.window,
    });
    assert.equal(route.page, tc.page, `route mismatch: expected ${tc.page}, got ${route.page}`);
    applyRouteAttributes(doc, route);

    const activatedStyles = [];
    const ctx = {
      doc,
      route,
      session: { loggedIn: true, uid: '553488', nickname: '少年游', avatar: 'https://lain.bgm.tv/pic/user/l/icon.jpg', formhash: '9a518ba5' },
      settings: { enabled: true, theme: 'dark', accent: 'pink', hdCovers: true, alloyCompat: true },
      activatePageStyles: (names) => activatedStyles.push(...names),
      toast: () => {},
    };

    const handled =
      runPhaseBHydrator(ctx) ||
      runPhaseCHydrator(ctx) ||
      runPhaseDHydrator(ctx) ||
      runPhaseEHydrator(ctx);

    assert.equal(handled, true, `${tc.page} not handled by any hydrator`);
    assert.equal(doc.documentElement.dataset.bgmPageHydrated, '1', `${tc.page} missing data-bgm-page-hydrated=1`);
    results.push(`PASS ${tc.page} (${u.pathname}) -> styles=[${activatedStyles.join(', ')}]`);
  } catch (err) {
    results.push(`FAIL ${tc.page} (${tc.url}) :: ${err?.message || err}`);
  }
}

// Test 30: Alloy Sandbox (#TB_window, #cluetip, .ui-dialog)
try {
  const dom = loadSample('sample_subject_400602.html', 'https://bgm.tv/subject/400602');
  const doc = dom.window.document;
  const tb = doc.createElement('div');
  tb.id = 'TB_window';
  const clue = doc.createElement('div');
  clue.id = 'cluetip';
  doc.body.append(tb, clue);

  startAlloySandbox(doc, true);
  assert.equal(doc.documentElement.dataset.bgmAlloyCompat, '1');
  assert.equal(tb.getAttribute('data-bgm-alloy-styled'), '1');
  assert.equal(clue.getAttribute('data-bgm-alloy-styled'), '1');
  stopAlloySandbox(doc);
  assert.equal(doc.documentElement.dataset.bgmAlloyCompat, undefined);
  results.push('PASS F1 Alloy Sandbox (#TB_window & #cluetip auto-styling)');
} catch (err) {
  results.push('FAIL F1 Alloy Sandbox :: ' + (err?.message || err));
}

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(`\nFULL_29_PAGES_E2E_SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
