/**
 * Bangumi Chronicle · Phase D 发现与检索体系真站水合器 (discovery-hydrator.js)
 * 覆盖：
 * - P13 五大频道聚合首页 (/anime, /book, /music, /game, /real)
 * - P14 分类浏览与排行榜 (/{type}/browser*, /{type}/chart)
 * - P15 每日放送日历 (/calendar)
 * - P16 标签广场与标签详情 (/{type}/tag, /{type}/tag/{name}, /tag)
 * - P17 全站综合搜索结果 (/subject_search/{q}, /mono_search/{q})
 */

import { escapeHtml } from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from '../phase-b/dom-vault.js';
import {
  CHANNEL_META,
  extractChannelData,
  extractBrowserData,
  extractCalendarData,
  extractTagData,
  extractSearchData,
} from './discovery-extractor.js';

const CHANNEL_ORDER = ['anime', 'book', 'music', 'game', 'real'];

function renderTenStars(score, clsPrefix = 'rate') {
  const val = Number(score) || 0;
  const n = Math.max(0, Math.min(10, Math.round(val)));
  if (n <= 0) return `<span style="font-size:11.5px;color:var(--muted);">暂无评分</span>`;
  return (
    `<span class="${clsPrefix}-ten-stars" title="${val.toFixed(1)} / 10">` +
      `<span class="stars-filled" style="color:#f59e0b;">${'★'.repeat(n)}</span>` +
      `<span class="stars-empty" style="opacity:0.28;">${'☆'.repeat(10 - n)}</span>` +
    `</span> ` +
    `<strong class="${clsPrefix}-score-num" style="font-family:var(--mono);color:#f59e0b;">${val.toFixed(1)}</strong>`
  );
}

function renderPagerHtml(pagerLinks) {
  if (!pagerLinks || !pagerLinks.length) return '';
  return (
    `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:20px;">` +
    pagerLinks
      .map((p) =>
        p.current
          ? `<span class="studio-pill-btn active">${escapeHtml(p.label)}</span>`
          : `<a class="studio-pill-btn" href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a>`
      )
      .join('') +
    `</div>`
  );
}

/**
 * D1 · P13 五大频道聚合首页水合器 (/anime, /book, /music, /game, /real)
 */
export function hydrateChannelPage({ doc, route, session, activatePageStyles }) {
  const data = extractChannelData(doc, route);
  activatePageStyles(['bangumi-channel.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const meta = data.meta;
  const sqClass = meta.square ? ' is-square-cover' : '';
  const heroBg = data.featured[0]?.cover || '';

  const chanSwitcherHtml = CHANNEL_ORDER.map((k) => {
    const m = CHANNEL_META[k];
    const isAct = k === data.channel ? ' is-active' : '';
    return `<a href="/${k}" class="bch-chan-pill${isAct}"><span>${m.icon}</span><span>${escapeHtml(m.label)}</span></a>`;
  }).join('');

  const subTabsHtml = data.subTabs
    .map(
      (tb) =>
        `<li><a href="${escapeHtml(tb.href)}" class="${tb.active ? 'focus' : ''}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  const uidEnc = encodeURIComponent(session?.uid || '');
  const personalBarHtml =
    session?.loggedIn && session?.uid
      ? `<div class="bch-personal-strip bch-personal-bar">
          <div class="bch-personal-label">
            <img src="${escapeHtml(session.avatar)}" alt="${escapeHtml(session.nickname)}" class="bch-personal-avatar" referrerpolicy="no-referrer" />
            <span>我的${escapeHtml(meta.label)}收藏夹</span>
          </div>
          <div class="bch-personal-links">
            <a href="/${data.channel}/list/${uidEnc}/do" class="bch-personal-chip"><span>在${escapeHtml(meta.verb)}</span></a>
            <a href="/${data.channel}/list/${uidEnc}/wish" class="bch-personal-chip"><span>想${escapeHtml(meta.verb)}</span></a>
            <a href="/${data.channel}/list/${uidEnc}/collect" class="bch-personal-chip"><span>${escapeHtml(meta.verb)}过</span></a>
            <a href="/${data.channel}/list/${uidEnc}/on_hold" class="bch-personal-chip"><span>搁置</span></a>
            <a href="/${data.channel}/list/${uidEnc}/dropped" class="bch-personal-chip"><span>抛弃</span></a>
          </div>
        </div>`
      : '';

  const featuredHtml = data.featured
    .map(
      (it, idx) =>
        `<li class="bch-featured-item">` +
          `<a href="${escapeHtml(it.href)}" class="bch-cover-wrap${sqClass}" title="${escapeHtml(it.title)}">` +
            (it.cover
              ? `<img src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" loading="lazy" referrerpolicy="no-referrer" />`
              : `<div class="cover-wall-no-icon"><span>${meta.icon}</span></div>`) +
            `<span class="bch-cover-rank-pill">HOT #${idx + 1}</span>` +
          `</a>` +
          `<a href="${escapeHtml(it.href)}" class="bch-featured-title" title="${escapeHtml(it.title)}">${escapeHtml(it.title)}</a>` +
          `<span class="bch-featured-meta">${escapeHtml(it.followText)}</span>` +
        `</li>`
    )
    .join('');

  const newReleasesHtml = data.newReleases.length
    ? `<section class="bch-glass-card bch-section-card">
        <div class="bch-section-head bch-sec-head">
          <div class="bch-sec-title-group">
            <h2 class="bch-section-title bch-sec-title">✨ 热门焦点推荐</h2>
          </div>
          <div class="bch-section-tools bch-sec-actions">
            <a href="/${data.channel}/browser" class="bch-mini-btn bch-more-link">分类浏览 »</a>
          </div>
        </div>
        <div class="bch-spotlight-grid">
          ${data.newReleases
            .map(
              (it) =>
                `<article class="bch-spotlight-card">` +
                  `<a href="${escapeHtml(it.href)}" class="bch-spotlight-cover${sqClass}">` +
                    (it.cover
                      ? `<img src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" loading="lazy" referrerpolicy="no-referrer" />`
                      : '') +
                  `</a>` +
                  `<div class="bch-spotlight-body">` +
                    `<span class="bch-spotlight-tag">近期注目</span>` +
                    `<a href="${escapeHtml(it.href)}" class="bch-spotlight-title">${escapeHtml(it.title)}</a>` +
                    `<div class="bch-spotlight-foot"><span>${escapeHtml(it.followText)}</span></div>` +
                  `</div>` +
                `</article>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  const blogsHtml = data.blogs.length
    ? `<section class="bch-glass-card bch-section-card">
        <div class="bch-section-head bch-sec-head">
          <div class="bch-sec-title-group">
            <h2 class="bch-section-title bch-sec-title">📝 ${escapeHtml(meta.label)}日志与长评</h2>
          </div>
          <div class="bch-section-tools bch-sec-actions">
            <a href="/${data.channel}/blog" class="bch-mini-btn bch-more-link">更多日志 »</a>
          </div>
        </div>
        <div class="bch-entry-list bch-blog-list">
          ${data.blogs
            .map(
              (b) =>
                `<article class="bch-blog-item">` +
                  `<a href="${escapeHtml(b.href)}" class="bch-blog-cover${sqClass}">` +
                    `<img src="${escapeHtml(b.cover)}" alt="${escapeHtml(b.title)}" loading="lazy" referrerpolicy="no-referrer" />` +
                  `</a>` +
                  `<div class="bch-blog-content">` +
                    `<h3 class="bch-blog-title"><a href="${escapeHtml(b.href)}">${escapeHtml(b.title)}</a></h3>` +
                    (b.excerpt ? `<p class="bch-blog-excerpt">${escapeHtml(b.excerpt)}</p>` : '') +
                    `<div class="bch-blog-meta"><div class="bch-blog-meta-left"><span>by <a href="${escapeHtml(b.authorHref)}">${escapeHtml(b.author)}</a></span>${b.time ? `<span>· ${escapeHtml(b.time)}</span>` : ''}<span>· ${escapeHtml(b.repliesText)}</span>${b.subjectName ? `<a href="${escapeHtml(b.subjectHref)}" class="bch-blog-subject-pill">《${escapeHtml(b.subjectName)}》</a>` : ''}</div></div>` +
                  `</div>` +
                `</article>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  const topicsHtml = data.topics.length
    ? `<section class="bch-glass-card bch-section-card">
        <div class="bch-section-head bch-sec-head">
          <div class="bch-sec-title-group">
            <h2 class="bch-section-title bch-sec-title">💬 最新${escapeHtml(meta.label)}讨论</h2>
          </div>
          <div class="bch-section-tools bch-sec-actions">
            <a href="/rakuen" class="bch-mini-btn bch-more-link">进入超展开 »</a>
          </div>
        </div>
        <div class="bch-topic-table-wrap">
          <table class="bch-topic-table">
            <thead>
              <tr><th>讨论话题 / 关联条目</th><th>作者 / 时间</th></tr>
            </thead>
            <tbody>
              ${data.topics
                .map(
                  (tp) =>
                    `<tr><td><div><a href="${escapeHtml(tp.href)}" class="bch-topic-link">${escapeHtml(tp.title)}</a> <span class="bch-topic-replies">${escapeHtml(tp.replies)}</span></div>${tp.subjectName ? `<a href="${escapeHtml(tp.subjectHref)}" class="bch-topic-subject">关联：${escapeHtml(tp.subjectName)}</a>` : ''}</td><td><a href="${escapeHtml(tp.authorHref)}" class="bch-topic-author">${escapeHtml(tp.author)}</a><span class="bch-topic-date">${escapeHtml(tp.date)}</span></td></tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </section>`
    : '';

  const facetsHtml = data.facets
    .map(
      (grp) =>
        `<div class="bch-facet-group"><h4 class="bch-facet-group-title">${escapeHtml(grp.title)}</h4><ul class="bch-facet-pills">${grp.values.map((v) => `<li><a href="${escapeHtml(v.href)}">${escapeHtml(v.label)}</a></li>`).join('')}</ul></div>`
    )
    .join('');

  const tagsHtml = data.tags
    .map((tg) => `<a href="${escapeHtml(tg.href)}" class="bch-tag-chip bch-tag-pill ${escapeHtml(tg.levelClass || 'lv-mid')}">${escapeHtml(tg.name)}</a>`)
    .join('');

  const html = `
    <section class="bch-hero-shell" id="bgmChannelHero">
      <div class="bch-hero-backdrop" style="background-image:url('${escapeHtml(heroBg)}')"></div>
      <div class="bch-hero-inner">
        <div class="bch-hero-top">
          <div class="bch-title-block">
            <div class="bch-kicker-row">
              <span class="bch-kicker-badge">${meta.icon} ${escapeHtml(meta.enTitle)}</span>
              <span class="bch-kicker-sub">bgm.tv / ${escapeHtml(data.channel)}</span>
            </div>
            <h1 class="bch-main-title"><span>${escapeHtml(meta.pageTitle)}</span><small>近期注目 · 热门速递 · 评论与讨论</small></h1>
          </div>
          <div class="bch-channel-switcher">${chanSwitcherHtml}</div>
        </div>
        <div class="bch-subtabs-row bch-subnav-bar">
          <ul class="bch-nav-subtabs bch-subtabs">${subTabsHtml}</ul>
          <div class="bch-hero-actions bch-quick-links">
            <a href="/${data.channel}/chart" class="bch-action-pill is-primary">🏆 ${escapeHtml(meta.label)}排行榜</a>
            <a href="/${data.channel}/tag" class="bch-action-pill">🏷️ 热门标签</a>
            ${data.channel === 'anime' ? `<a href="/calendar" class="bch-action-pill">📅 每日放送</a>` : ''}
          </div>
        </div>
        ${personalBarHtml}
      </div>
    </section>

    <div class="bch-columns-grid">
      <div class="bch-col-main" id="bgmChannelColA">
        <section class="bch-glass-card bch-section-card">
          <div class="bch-section-head bch-sec-head">
            <div class="bch-sec-title-group">
              <h2 class="bch-section-title bch-sec-title">🔥 近期注目${escapeHtml(meta.label)} <small>共 ${data.featured.length} 部</small></h2>
            </div>
            <div class="bch-section-tools bch-sec-actions">
              <button type="button" class="bch-mini-btn bch-toggle-view-btn" id="bgmToggleFeaturedBtn">展开全部</button>
              <a href="/${data.channel}/browser?sort=trends" class="bch-mini-btn bch-more-link">全部注目 »</a>
            </div>
          </div>
          <ul class="bch-featured-strip" id="bgmFeaturedList">${featuredHtml}</ul>
        </section>
        ${newReleasesHtml}
        ${blogsHtml}
        ${topicsHtml}
      </div>

      <aside class="bch-col-sidebar bch-col-side" id="bgmChannelColB">
        ${
          facetsHtml
            ? `<section class="bch-glass-card bch-side-card"><div class="bch-section-head bch-side-head"><h3 class="bch-side-title">🧭 分类浏览索引</h3><a href="/${data.channel}/browser" class="bch-mini-btn bch-more-link">更多 »</a></div><div class="bch-facets-wrap">${facetsHtml}</div></section>`
            : ''
        }
        ${
          tagsHtml
            ? `<section class="bch-glass-card bch-side-card"><div class="bch-section-head bch-side-head"><h3 class="bch-side-title">🏷️ 热门${escapeHtml(meta.label)}标签</h3><a href="/${data.channel}/tag" class="bch-mini-btn bch-more-link">标签广场 »</a></div><div class="bch-tag-cloud">${tagsHtml}</div></section>`
            : ''
        }
      </aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'bch-main-container',
    html,
  });

  doc.getElementById('bgmToggleFeaturedBtn')?.addEventListener('click', (ev) => {
    const listEl = doc.getElementById('bgmFeaturedList');
    const exp = listEl?.classList.toggle('is-expanded');
    ev.target.textContent = exp ? '收起为横向滚动' : '展开全部';
  });
}

/**
 * D1 · P14 分类浏览与排行榜水合器 (/{type}/browser*, /{type}/chart)
 */
export function hydrateBrowserPage({ doc, route, activatePageStyles }) {
  const data = extractBrowserData(doc, route);
  activatePageStyles(['bangumi-browser.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const meta = data.meta;
  let viewMode = 'full'; // 'full' | 'compact' | 'grid'
  let filterQuery = '';

  const chanSwitcherHtml = CHANNEL_ORDER.map((k) => {
    const m = CHANNEL_META[k];
    const isAct = k === data.channel ? ' active' : '';
    return `<a href="/${k}/browser?sort=rank" class="channel-pill-btn${isAct}">${m.icon} ${escapeHtml(m.label)}</a>`;
  }).join('');

  const top3 = data.items.filter((it) => it.rank >= 1 && it.rank <= 3).slice(0, 3);
  const crowns = ['👑 #1', '🥈 #2', '🥉 #3'];
  const podiumHtml =
    top3.length === 3
      ? `<section class="browser-podium-section">
          <div class="browser-podium-grid">
            ${top3
              .map(
                (it, idx) =>
                  `<a class="podium-card podium-rank-${idx + 1}" href="${escapeHtml(it.href)}">` +
                    `<div class="podium-cover-wrap${meta.square ? ' is-music-square' : ''}">` +
                      `<span class="podium-crown-pill">${crowns[idx]}</span>` +
                      (it.cover
                        ? `<img class="podium-cover-img" src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                        : `<div class="cover-wall-no-icon"><span>${meta.icon}</span></div>`) +
                    `</div>` +
                    `<div class="podium-info">` +
                      `<h4 class="podium-title">${escapeHtml(it.title)}</h4>` +
                      (it.orig ? `<div class="podium-orig">${escapeHtml(it.orig)}</div>` : '') +
                      `<div class="podium-meta">Rank #${it.rank} · ${it.votes.toLocaleString()} 人评分</div>` +
                      `<div class="podium-score-row">${renderTenStars(it.score)}</div>` +
                    `</div>` +
                  `</a>`
              )
              .join('')}
          </div>
        </section>`
      : '';

  const sortHtml = data.sortLinks
    .map(
      (s) =>
        `<a href="${escapeHtml(s.href)}" class="sort-pill-link${s.active ? ' focus active' : ''}">${escapeHtml(s.label)}</a>`
    )
    .join('');

  const facetsHtml = data.facetGroups
    .map(
      (grp) =>
        `<div class="facet-group-block">` +
          `<h4 class="facet-subtitle"><span>${escapeHtml(grp.title)}</span><small>${grp.links.length} 项</small></h4>` +
          `<ul class="facet-grouped-list">${grp.links.map((lk) => `<li><a href="${escapeHtml(lk.href)}" class="facet-pill-btn${lk.active ? ' focus active' : ''}">${escapeHtml(lk.label)}</a></li>`).join('')}</ul>` +
        `</div>`
    )
    .join('');

  const airtimeHtml = data.airtimeLinks.length
    ? `<div class="facet-group-block">` +
        `<h4 class="facet-subtitle"><span>时间索引</span><small>按年份归档</small></h4>` +
        `<ul class="facet-grouped-list">${data.airtimeLinks.map((lk) => `<li><a href="${escapeHtml(lk.href)}" class="facet-pill-btn${lk.active ? ' focus active' : ''}">${escapeHtml(lk.label)}</a></li>`).join('')}</ul>` +
      `</div>`
    : '';

  const pagerHtml = data.pagerLinks.length
    ? `<div class="multipage-bar"><div class="page-nums-group">` +
        data.pagerLinks
          .map((p) =>
            p.current
              ? `<span class="page-num-btn p_cur">${escapeHtml(p.label)}</span>`
              : `<a class="page-num-btn" href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a>`
          )
          .join('') +
      `</div></div>`
    : '';

  const html = `
    <section class="browser-hero-banner" id="bgmBrowserHero">
      <div class="browser-hero-backdrop" style="background-image:url('${escapeHtml(data.items[0]?.cover || '')}')"></div>
      <div class="browser-hero-inner">
        <div class="browser-hero-top">
          <div class="browser-title-block">
            <div class="browser-kicker-row">
              <span class="browser-kicker-badge">${meta.icon} ${escapeHtml(meta.enTitle)}</span>
              <span class="browser-kicker-sub">本页共 ${data.items.length} 部作品</span>
            </div>
            <h1 class="browser-main-title">${escapeHtml(data.heading)}</h1>
          </div>
          <div class="channel-switcher-pills">${chanSwitcherHtml}</div>
        </div>
      </div>
    </section>

    ${podiumHtml}

    <div class="browser-columns-grid">
      <section class="browser-col-main" id="bgmBrowserColA">
        <div class="browser-tools-card">
          <div class="browser-sort-filters"><span class="sort-prefix-label">排序 :</span>${sortHtml}</div>
          <div class="browser-right-controls">
            <div class="browser-inline-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input type="search" id="bgmBrowserFilterInput" placeholder="过滤本页条目…" autocomplete="off" />
            </div>
            <ul class="browser-type-selector" id="bgmBrowserViewSwitch">
              <li><button type="button" class="browser-type-btn active" data-view="full">▤ 列表</button></li>
              <li><button type="button" class="browser-type-btn" data-view="compact">☰ 精简</button></li>
              <li><button type="button" class="browser-type-btn" data-view="grid">▦ 网格</button></li>
            </ul>
          </div>
        </div>

        <ul class="ranking-item-list" id="bgmBrowserItemList"></ul>
        ${pagerHtml}
      </section>

      <aside class="browser-col-sidebar" id="bgmBrowserColB">
        <div class="facet-panel-card">
          ${facetsHtml}
          ${airtimeHtml}
        </div>
      </aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html,
  });
  mainEl.style.maxWidth = '1420px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';

  function renderItems() {
    const listEl = doc.getElementById('bgmBrowserItemList');
    if (!listEl) return;
    listEl.className =
      'ranking-item-list' +
      (viewMode === 'compact' ? ' mode-compact' : viewMode === 'grid' ? ' mode-grid' : '');
    const q = filterQuery.trim().toLowerCase();
    const visible = q
      ? data.items.filter(
          (it) =>
            it.title.toLowerCase().includes(q) ||
            it.orig.toLowerCase().includes(q) ||
            it.info.toLowerCase().includes(q)
        )
      : data.items;

    listEl.innerHTML = visible.length
      ? visible
          .map((it) => {
            const topMedalCls =
              it.rank === 1 ? ' is-top-1' : it.rank === 2 ? ' is-top-2' : it.rank === 3 ? ' is-top-3' : '';
            return (
              `<li class="ranking-item-card">` +
                (it.rank > 0
                  ? `<div class="rank-badge-col"><span class="rank-medal-pill${topMedalCls}"><small>Rank</small><strong>${it.rank}</strong></span></div>`
                  : '') +
                `<a href="${escapeHtml(it.href)}" class="ranking-cover-link${meta.square ? ' is-music-square' : ''}">` +
                  (it.cover
                    ? `<img class="ranking-cover-img" src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                    : `<div class="ranking-cover-img cover-wall-no-icon"><span>${meta.icon}</span></div>`) +
                `</a>` +
                `<div class="ranking-item-inner">` +
                  `<div class="ranking-title-row">` +
                    `<h3><a class="ranking-title-link" href="${escapeHtml(it.href)}">${escapeHtml(it.title)}</a>` +
                    (it.orig ? `<span class="ranking-orig-title">${escapeHtml(it.orig)}</span>` : '') +
                    `</h3>` +
                  `</div>` +
                  (it.info ? `<p class="ranking-info-tip">${escapeHtml(it.info)}</p>` : '') +
                  `<div class="ranking-rate-row">` +
                    renderTenStars(it.score) +
                    (it.votes > 0 ? `<span class="rate-votes-tip">(${it.votes.toLocaleString()}人评分)</span>` : '') +
                  `</div>` +
                `</div>` +
                `<div class="ranking-collect-block">` +
                  `<a href="${escapeHtml(it.href)}" class="collect-trigger-btn">查看详情 →</a>` +
                `</div>` +
              `</li>`
            );
          })
          .join('')
      : '<li style="padding:28px;text-align:center;color:var(--muted);">暂无匹配的榜单条目</li>';
  }

  renderItems();

  doc.getElementById('bgmBrowserFilterInput')?.addEventListener('input', (ev) => {
    filterQuery = ev.target.value;
    renderItems();
  });

  mainEl.addEventListener('click', (ev) => {
    const viewBtn = ev.target.closest('[data-view]');
    if (viewBtn) {
      viewMode = viewBtn.getAttribute('data-view') || 'full';
      mainEl.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === viewBtn));
      renderItems();
    }
  });
}

/**
 * D1 · P15 每日放送日历水合器 (/calendar)
 */
export function hydrateCalendarPage({ doc, activatePageStyles }) {
  const data = extractCalendarData(doc);
  activatePageStyles(['bangumi-calendar.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const state = {
    view: 'poster', // 'poster' | 'list'
    dayFilter: 'all',
    todayFirst: false,
    query: '',
  };

  const dayTabsHtml =
    `<button type="button" class="bcal-day-tab is-active" data-cal-day="all">全周 7 列 <span class="bcal-tab-count">${data.totalShows}</span></button>` +
    data.days
      .map(
        (d) =>
          `<button type="button" class="bcal-day-tab${d.isToday ? ' is-today-tab' : ''}" data-cal-day="${d.id}">${escapeHtml(d.cn.replace('星期', '周'))}${d.isToday ? '·今日' : ''} <span class="bcal-tab-count">${d.count}</span></button>`
      )
      .join('');

  const html = `
    <section class="bcal-hero-card" id="bgmCalendarHero">
      <div class="bcal-hero-main">
        <div>
          <span class="bcal-eyebrow">ON AIR SCHEDULE · 每日放送</span>
          <h1 class="bcal-title">每日放送 <small class="blue">${escapeHtml(data.dateLabel ? '/ ' + data.dateLabel : '')}</small></h1>
          ${data.summaryTipHtml ? `<p class="bcal-summary-tip">${data.summaryTipHtml}</p>` : ''}
        </div>
        <div class="bcal-hero-actions">
          <div class="bcal-kpi-strip">
            <span class="bcal-kpi-chip">全周放送 <b>${data.totalShows}</b> 部</span>
          </div>
          <div class="bcal-view-tabs" id="bgmCalViewTabs">
            <button type="button" class="bcal-view-btn is-active" data-view="poster">🖼️ 海报墙</button>
            <button type="button" class="bcal-view-btn" data-view="list">📋 列表流</button>
          </div>
        </div>
      </div>

      <div class="bcal-toolbar">
        <div class="bcal-day-tabs" id="bgmCalDayTabs">${dayTabsHtml}</div>
        <div class="bcal-filter-controls">
          <button type="button" class="bcal-chip-toggle" id="bgmCalOrderBtn">🗓️ 周一至周日</button>
          <label class="bcal-search-box">
            <input type="search" id="bgmCalSearchInput" placeholder="搜索番组名称…" autocomplete="off" />
          </label>
        </div>
      </div>
    </section>

    <section class="BgmCalendar bcal-calendar-stage" id="bgmCalStage"></section>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'bcal-shell',
    html,
  });

  function renderCalendar() {
    const stageEl = doc.getElementById('bgmCalStage');
    if (!stageEl) return;
    const q = state.query.trim().toLowerCase();
    let days = data.days.slice();
    if (state.todayFirst) {
      const todayIdx = days.findIndex((d) => d.isToday);
      if (todayIdx > 0) {
        days = [...days.slice(todayIdx), ...days.slice(0, todayIdx)];
      }
    }
    if (state.dayFilter !== 'all') {
      days = days.filter((d) => String(d.id) === state.dayFilter);
    }

    const filteredDays = days.map((d) => ({
      ...d,
      items: q
        ? d.items.filter(
            (it) =>
              it.title.toLowerCase().includes(q) ||
              it.orig.toLowerCase().includes(q)
          )
        : d.items,
    }));

    if (state.view === 'list') {
      stageEl.innerHTML =
        `<div class="bcal-list-view">` +
        filteredDays
          .map(
            (d) =>
              `<section class="bcal-list-day-card${d.isToday ? ' is-today' : ''}">` +
                `<header class="bcal-list-day-head"><div class="bcal-list-day-title"><strong>${escapeHtml(d.cn)} · ${escapeHtml(d.en)}</strong><span>${escapeHtml(d.ja)}</span>${d.isToday ? '<span class="bcal-today-pill">TODAY</span>' : ''}</div><span class="bcal-list-day-meta"><span>${d.items.length} 部番组</span></span></header>` +
                `<div class="bcal-list-rows">` +
                  d.items
                    .map(
                      (it) =>
                        `<article class="bcal-list-row"><a class="bcal-list-thumb" href="${escapeHtml(it.href)}">${it.cover ? `<img src="${escapeHtml(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}</a><div class="bcal-list-main"><div class="bcal-list-titles"><a href="${escapeHtml(it.href)}" class="bcal-list-cn">${escapeHtml(it.title)}</a>${it.orig ? `<span class="bcal-list-orig">${escapeHtml(it.orig)}</span>` : ''}</div></div></article>`
                    )
                    .join('') +
                `</div>` +
              `</section>`
          )
          .join('') +
        `</div>`;
      return;
    }

    const singleColCls = filteredDays.length === 1 ? ' is-single-day' : '';
    stageEl.innerHTML =
      `<ul class="large bcal-week-grid${singleColCls}">` +
      filteredDays
        .map(
          (d) =>
            `<li class="week ${escapeHtml(d.en)}${d.isToday ? ' is-today' : ''}"><dl><dt><div class="bcal-col-header"><div class="bcal-col-day-title"><h3>${escapeHtml(d.cn)}</h3><span class="bcal-col-ja">${escapeHtml(d.ja)} · ${escapeHtml(d.en)}</span></div><div class="bcal-col-badges">${d.isToday ? '<span class="bcal-today-pill">TODAY</span>' : ''}<span class="bcal-col-count">${d.items.length} 部</span></div></div></dt><dd><ul class="coverList">` +
            d.items
              .map((it) => {
                const bgStyle = it.cover
                  ? ` style="background: center no-repeat url('${escapeHtml(it.cover)}'); background-size: cover"`
                  : '';
                return (
                  `<li class="clearit${!it.cover ? ' is-no-cover' : ''}"${bgStyle}>` +
                    `<div class="info_bg"><div class="info"><p><a href="${escapeHtml(it.href)}" class="nav">${escapeHtml(it.title)}</a></p>` +
                    (it.orig ? `<p><a href="${escapeHtml(it.href)}" class="nav"><small><em>${escapeHtml(it.orig)}</em></small></a></p>` : '') +
                    `</div></div>` +
                  `</li>`
                );
              })
              .join('') +
            `</ul></dd></dl></li>`
        )
        .join('') +
      `</ul>`;
  }

  renderCalendar();

  doc.getElementById('bgmCalSearchInput')?.addEventListener('input', (ev) => {
    state.query = ev.target.value;
    renderCalendar();
  });

  mainEl.addEventListener('click', (ev) => {
    const dayBtn = ev.target.closest('[data-cal-day]');
    if (dayBtn) {
      state.dayFilter = dayBtn.getAttribute('data-cal-day') || 'all';
      mainEl.querySelectorAll('[data-cal-day]').forEach((b) => b.classList.toggle('is-active', b === dayBtn));
      renderCalendar();
      return;
    }

    const viewBtn = ev.target.closest('#bgmCalViewTabs [data-view]');
    if (viewBtn) {
      state.view = viewBtn.getAttribute('data-view') || 'poster';
      mainEl.querySelectorAll('#bgmCalViewTabs [data-view]').forEach((b) => b.classList.toggle('is-active', b === viewBtn));
      renderCalendar();
      return;
    }

    const orderBtn = ev.target.closest('#bgmCalOrderBtn');
    if (orderBtn) {
      state.todayFirst = !state.todayFirst;
      orderBtn.classList.toggle('is-active', state.todayFirst);
      orderBtn.textContent = state.todayFirst ? '🔥 今日置顶中' : '🗓️ 周一至周日';
      renderCalendar();
    }
  });
}

/**
 * D2 · P16 标签广场与标签详情水合器 (/{type}/tag, /{type}/tag/{name}, /tag)
 */
export function hydrateTagPage({ doc, route, activatePageStyles }) {
  const data = extractTagData(doc, route);
  activatePageStyles(['bangumi-tag.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const meta = data.meta;
  let plazaFilter = '';
  let plazaLevel = 'all';
  let detailView = 'list';

  const chanPillsHtml = CHANNEL_ORDER.map((k) => {
    const m = CHANNEL_META[k];
    const isAct = k === data.channel ? ' is-active' : '';
    return `<a href="/${k}/tag" class="btg-ch-pill${isAct}">${m.icon} ${escapeHtml(m.label)}</a>`;
  }).join('');

  if (data.mode === 'plaza') {
    const html = `
      <section class="btg-hero-shell">
        <div class="btg-hero-backdrop" aria-hidden="true"></div>
        <div class="btg-hero-inner">
          <div class="btg-hero-top">
            <div>
              <div class="btg-kicker-row">
                <span class="btg-kicker-badge">${meta.icon} TAG PLAZA</span>
                <span class="btg-kicker-sub">共 ${data.tags.length} 个热门标签</span>
              </div>
              <h1 class="btg-main-title">${escapeHtml(data.heading)}</h1>
            </div>
            <div class="btg-channel-pills">${chanPillsHtml}</div>
          </div>
        </div>
      </section>

      <div class="btg-columns">
        <div class="btg-col-main" id="bgmTagColA">
          <div class="btg-plaza-toolbar">
            <div class="btg-filter-input-wrap">
              <span class="btg-filter-icon">🔎</span>
              <input type="search" id="bgmPlazaFilterInput" placeholder="在当前标签云中即时筛选…" autocomplete="off" />
            </div>
            <div class="btg-level-pills">
              <button type="button" class="btg-lv-pill is-active" data-lv="all">全部热度</button>
              <button type="button" class="btg-lv-pill" data-lv="high">🔥 核心高热</button>
              <button type="button" class="btg-lv-pill" data-lv="mid">✦ 中坚流派</button>
              <button type="button" class="btg-lv-pill" data-lv="low">· 小众长尾</button>
            </div>
          </div>
          <div class="btg-tag-cloud" id="bgmTagCloud"></div>
        </div>
        <aside class="btg-col-side" id="bgmTagColB">
          <div class="btg-side-card">
            <div class="btg-side-section">
              <h2>📂 五大频道标签直达</h2>
              <ul class="btg-side-links">
                ${CHANNEL_ORDER.map((k) => `<li><a href="/${k}/tag" class="btg-side-link${k === data.channel ? ' is-active' : ''}">${CHANNEL_META[k].icon} ${escapeHtml(CHANNEL_META[k].label)}标签</a></li>`).join('')}
              </ul>
            </div>
          </div>
        </aside>
      </div>`;

    const mainEl = mountHydratedStage(doc, {
      tag: 'main',
      id: 'main',
      className: 'btg-main-container',
      html,
    });

    function renderCloud() {
      const cloudEl = doc.getElementById('bgmTagCloud');
      if (!cloudEl) return;
      const q = plazaFilter.trim().toLowerCase();
      const filtered = data.tags.filter((t) => {
        if (q && !t.name.toLowerCase().includes(q)) return false;
        if (plazaLevel === 'high' && t.level > 3) return false;
        if (plazaLevel === 'mid' && (t.level < 4 || t.level > 6)) return false;
        if (plazaLevel === 'low' && t.level < 7) return false;
        return true;
      });
      cloudEl.innerHTML = filtered.length
        ? filtered
            .map(
              (t) =>
                `<span class="btg-tag-item${t.level <= 2 ? ' is-hot' : ''}"><a href="${escapeHtml(t.href)}" class="l level${t.level}">${escapeHtml(t.name)}</a>${t.count ? `<small class="grey">(${t.count})</small>` : ''}</span>`
            )
            .join('')
        : '<div class="btg-empty-box">未找到匹配的标签</div>';
    }

    renderCloud();

    doc.getElementById('bgmPlazaFilterInput')?.addEventListener('input', (ev) => {
      plazaFilter = ev.target.value;
      renderCloud();
    });

    mainEl.addEventListener('click', (ev) => {
      const lvBtn = ev.target.closest('[data-lv]');
      if (lvBtn) {
        plazaLevel = lvBtn.getAttribute('data-lv') || 'all';
        mainEl.querySelectorAll('[data-lv]').forEach((b) => b.classList.toggle('is-active', b === lvBtn));
        renderCloud();
      }
    });
    return;
  }

  // Detail mode (/{type}/tag/{name})
  const sortHtml = data.sortLinks
    .map(
      (s) =>
        `<a href="${escapeHtml(s.href)}" class="${s.active ? 'focus' : ''}">${escapeHtml(s.label)}</a>`
    )
    .join('');

  const yearsHtml = data.yearLinks
    .map(
      (y) =>
        `<li class="airYear"><a href="${escapeHtml(y.href)}" class="l${y.active ? ' focus is-active' : ''}">${escapeHtml(y.label)}</a></li>`
    )
    .join('');

  const html = `
    <section class="btg-hero-shell">
      <div class="btg-hero-backdrop" aria-hidden="true"></div>
      <div class="btg-hero-inner">
        <div class="btg-hero-top">
          <div>
            <div class="btg-kicker-row">
              <span class="btg-kicker-badge">${meta.icon} TAG DETAIL</span>
              <a href="/${data.channel}/tag" class="btg-kicker-sub" style="color:var(--accent);font-weight:700;">← 返回${escapeHtml(meta.label)}标签广场</a>
            </div>
            <h1 class="btg-main-title">${escapeHtml(data.heading)}</h1>
          </div>
          <div class="btg-channel-pills">${chanPillsHtml}</div>
        </div>
      </div>
    </section>

    <div class="btg-columns">
      <div class="btg-col-main" id="bgmTagColA">
        <div class="btg-detail-toolbar">
          <div class="btg-filters">${sortHtml}</div>
          <ul class="btg-view-selector" id="bgmTagViewSwitch">
            <li><a href="javascript:void(0)" data-view="list" class="active">▤ 列表</a></li>
            <li><a href="javascript:void(0)" data-view="compact">☰ 精简</a></li>
            <li><a href="javascript:void(0)" data-view="grid">▦ 网格</a></li>
          </ul>
        </div>
        <ul class="btg-item-list" id="bgmTagItemList"></ul>
        ${renderPagerHtml(data.pagerLinks)}
      </div>
      <aside class="btg-col-side" id="bgmTagColB">
        <div class="btg-side-card">
          ${
            yearsHtml
              ? `<div class="btg-side-section"><h2>📅 按年份筛选</h2><ul class="btg-year-grid">${yearsHtml}</ul></div>`
              : ''
          }
          <div class="btg-side-section">
            <h2>🔗 关联入口</h2>
            <ul class="btg-side-links">
              <li><a href="/${data.channel}/tag" class="btg-side-link">🏷️ ${escapeHtml(meta.label)}标签广场</a></li>
              <li><a href="/${data.channel}/browser" class="btg-side-link">📊 ${escapeHtml(meta.label)}分类浏览</a></li>
            </ul>
          </div>
        </div>
      </aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'btg-main-container',
    html,
  });

  function renderTagItems() {
    const listEl = doc.getElementById('bgmTagItemList');
    if (!listEl) return;
    listEl.className =
      'btg-item-list' +
      (detailView === 'compact' ? ' is-compact' : detailView === 'grid' ? ' is-grid' : '');
    const sqCls = meta.square ? ' is-square-cover' : '';
    listEl.innerHTML = data.items
      .map(
        (it) =>
          `<li class="btg-item-card">` +
            `<a href="${escapeHtml(it.href)}" class="btg-cover-link${sqCls}">` +
              (it.cover
                ? `<img src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                : `<div class="cover-wall-no-icon"><span>${meta.icon}</span></div>`) +
            `</a>` +
            `<div class="btg-item-body">` +
              `<div class="btg-item-head"><h3 class="btg-item-title"><a href="${escapeHtml(it.href)}">${escapeHtml(it.title)}</a>${it.orig ? ` <small class="btg-item-orig">${escapeHtml(it.orig)}</small>` : ''}</h3>${it.rank > 0 ? `<span class="btg-rank-badge">Rank #${it.rank}</span>` : ''}</div>` +
              (it.info ? `<p class="btg-item-info">${escapeHtml(it.info)}</p>` : '') +
              `<div class="btg-item-meta-row"><div class="btg-rate-info">${renderTenStars(it.score, 'btg')} ${it.votes > 0 ? `<span class="btg-votes-txt">(${it.votes.toLocaleString()}人评分)</span>` : ''}</div></div>` +
            `</div>` +
          `</li>`
      )
      .join('');
  }

  renderTagItems();

  mainEl.addEventListener('click', (ev) => {
    const vBtn = ev.target.closest('#bgmTagViewSwitch [data-view]');
    if (vBtn) {
      ev.preventDefault();
      detailView = vBtn.getAttribute('data-view') || 'list';
      mainEl.querySelectorAll('#bgmTagViewSwitch [data-view]').forEach((a) => a.classList.toggle('active', a === vBtn));
      renderTagItems();
    }
  });
}

/**
 * D2 · P17 全站综合搜索结果水合器 (/subject_search/{q}, /mono_search/{q})
 */
export function hydrateSearchPage({ doc, route, activatePageStyles }) {
  const data = extractSearchData(doc, route);
  activatePageStyles(['bangumi-search.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let sortBy = 'default';
  let viewMode = 'full';

  const catNavHtml = data.catLinks.length
    ? data.catLinks
        .map(
          (c) =>
            `<li><a href="${escapeHtml(c.href)}" class="search-nav-btn${c.active ? ' is-active' : ''}"><span>${escapeHtml(c.label)}</span></a></li>`
        )
        .join('')
    : ['all:全部', '2:动画', '1:书籍', '3:音乐', '4:游戏', '6:三次元']
        .map((pair) => {
          const [cat, label] = pair.split(':');
          const href = `/subject_search/${encodeURIComponent(data.keyword || '')}?cat=${cat}`;
          return `<li><a href="${escapeHtml(href)}" class="search-nav-btn"><span>${escapeHtml(label)}</span></a></li>`;
        })
        .join('');

  const relatedHtml = data.relatedPersons.length
    ? `<div class="search-card">
        <div class="search-card-head"><h2 class="search-card-title">👤 精准匹配人物 / 角色</h2></div>
        <div class="search-related-row">
          ${data.relatedPersons
            .map(
              (p) =>
                `<a href="${escapeHtml(p.href)}" class="search-related-card-item" style="text-decoration:none;color:inherit;"><img class="search-related-avatar" src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" /><div class="search-related-name">${escapeHtml(p.name)}</div><div class="search-related-kind">${p.kind === 'character' ? 'CHARACTER' : 'PERSON'}</div></a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  const html = `
    <section class="search-hero-shell" id="bgmSearchHero">
      <div class="search-hero-backdrop" style="background-image:url('${escapeHtml(data.items[0]?.cover || '')}')"></div>
      <div class="search-hero-inner">
        <div class="search-hero-top">
          <div class="search-title-block">
            <div class="search-kicker-row">
              <span class="search-kicker-badge">SEARCH · 全站检索</span>
              <span class="search-kicker-sub">${escapeHtml(data.resultTip || `本页命中 ${data.items.length} 条`)}</span>
            </div>
            <h1 class="search-main-title">条目搜索 <small>${data.keyword ? `「${escapeHtml(data.keyword)}」` : ''}</small></h1>
          </div>
        </div>
        <form class="search-big-bar" action="/subject_search" method="post">
          <select name="cat" class="search-big-cat" aria-label="搜索分类">
            <option value="all">全部条目</option>
            <option value="2">动画</option>
            <option value="1">书籍</option>
            <option value="3">音乐</option>
            <option value="4">游戏</option>
            <option value="6">三次元</option>
            <option value="person">人物</option>
          </select>
          <input type="search" name="search_text" class="search-big-input" value="${escapeHtml(data.keyword)}" placeholder="输入番组、书籍、音乐、游戏、角色名称…" autocomplete="off" />
          <button type="submit" class="search-big-submit">搜索</button>
        </form>
      </div>
    </section>

    <div class="search-columns-grid" id="bgmSearchGrid" data-view="full">
      <aside class="search-col-nav" id="bgmSearchColA">
        <div class="search-card">
          <div class="search-card-head"><h2 class="search-card-title">检索范围</h2></div>
          <ul class="search-nav-list">${catNavHtml}</ul>
        </div>
      </aside>

      <section class="search-col-main" id="bgmSearchColB">
        <div class="search-tools-bar">
          <div class="search-sort-filters" id="bgmSearchSortRow">
            <span class="search-sort-prefix">本页排序</span>
            <button type="button" class="search-sort-pill is-active" data-sort="default">默认相关性</button>
            <button type="button" class="search-sort-pill" data-sort="score">按评分</button>
            <button type="button" class="search-sort-pill" data-sort="votes">按人数</button>
            <button type="button" class="search-sort-pill" data-sort="rank">按排名</button>
          </div>
          <div class="search-view-switch" id="bgmSearchViewRow">
            <button type="button" class="search-type-btn is-active" data-view="full">列表</button>
            <button type="button" class="search-type-btn" data-view="compact">精简</button>
            <button type="button" class="search-type-btn" data-view="grid">网格</button>
          </div>
        </div>

        ${relatedHtml}

        <ul class="search-result-list" id="bgmSearchItemList"></ul>
        ${renderPagerHtml(data.pagerLinks)}
      </section>

      <aside class="search-col-side" id="bgmSearchColC">
        <div class="search-card">
          <div class="search-card-head"><h2 class="search-card-title">💡 搜索技巧</h2></div>
          <ul class="search-tips-list">
            <li>使用引号 <code>"关键词"</code> 获取精确匹配结果</li>
            <li>可在左侧切换动画 / 书籍 / 音乐 / 游戏 / 三次元或人物分类缩小范围</li>
          </ul>
        </div>
      </aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'search-main-container',
    html,
  });

  const TYPE_LABELS = {
    anime: '动画',
    book: '书籍',
    music: '音乐',
    game: '游戏',
    real: '三次元',
    character: '角色',
    person: '人物',
  };

  function renderSearchItems() {
    const listEl = doc.getElementById('bgmSearchItemList');
    const gridEl = doc.getElementById('bgmSearchGrid');
    if (!listEl) return;
    if (gridEl) gridEl.setAttribute('data-view', viewMode);

    const arr = data.items.slice();
    if (sortBy === 'score') arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    else if (sortBy === 'votes') arr.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    else if (sortBy === 'rank') arr.sort((a, b) => (a.rank || 99999) - (b.rank || 99999));

    listEl.innerHTML = arr.length
      ? arr
          .map(
            (x) =>
              `<li class="search-result-card">` +
                `<div class="search-rank-col"><span class="search-rank-pill"><small>Rank</small><strong>${x.rank || '—'}</strong></span></div>` +
                `<a class="search-cover-link${x.cat === 'music' ? ' is-music-square' : ''}" href="${escapeHtml(x.href)}">` +
                  (x.cover
                    ? `<img class="search-cover-img" src="${escapeHtml(x.cover)}" alt="${escapeHtml(x.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                    : `<div class="search-cover-empty">${escapeHtml((x.title || '?').slice(0, 1))}</div>`) +
                `</a>` +
                `<div class="search-result-inner">` +
                  `<div class="search-title-row"><h3><a class="search-title-link" href="${escapeHtml(x.href)}">${escapeHtml(x.title)}</a></h3>${x.orig ? `<span class="search-orig-title">${escapeHtml(x.orig)}</span>` : ''}<span class="search-type-chip">${escapeHtml(TYPE_LABELS[x.cat] || '条目')}</span></div>` +
                  (x.info ? `<p class="search-info-tip">${escapeHtml(x.info)}</p>` : '') +
                  `<div class="search-rate-row">${renderTenStars(x.score, 'search')} ${x.votes > 0 ? `<span class="search-votes-tip">(${x.votes.toLocaleString()} 人评分)</span>` : ''}</div>` +
                `</div>` +
              `</li>`
          )
          .join('')
      : '<li class="search-empty-state"><h3>未找到匹配条目</h3><p>请尝试更换关键词或切换左侧分类范围</p></li>';
  }

  renderSearchItems();

  mainEl.addEventListener('click', (ev) => {
    const sBtn = ev.target.closest('#bgmSearchSortRow [data-sort]');
    if (sBtn) {
      sortBy = sBtn.getAttribute('data-sort') || 'default';
      mainEl.querySelectorAll('#bgmSearchSortRow [data-sort]').forEach((b) => b.classList.toggle('is-active', b === sBtn));
      renderSearchItems();
      return;
    }

    const vBtn = ev.target.closest('#bgmSearchViewRow [data-view]');
    if (vBtn) {
      viewMode = vBtn.getAttribute('data-view') || 'full';
      mainEl.querySelectorAll('#bgmSearchViewRow [data-view]').forEach((b) => b.classList.toggle('is-active', b === vBtn));
      renderSearchItems();
    }
  });
}
