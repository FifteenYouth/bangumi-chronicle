/**
 * Bangumi Chronicle · Phase E (E1 + E2) 社区、人物、阅读与实验室真站水合器 (community-hydrator.js)
 * 覆盖：
 * - P18 人物频道聚合 (/mono, /character, /person, /user/{uid}/mono*)
 * - P19 角色与人物详情 (/character/{id}*, /person/{id}*)
 * - P20 超展开阅读器 (/rakuen, /rakuen/topiclist, /rakuen/topic/{type}/{id})
 * - P21 小组首页/发现/讨论列表 (/group, /group/discover, /group/{slug}*)
 * - P22 小组与条目话题讨论楼 (/group/topic/{id}, /subject/topic/{id})
 * - P23 日志广场与日志详情 (/blog, /{type}/blog, /blog/{id}, /user/{uid}/blog)
 * - P24 目录广场与目录详情 (/index, /index/browser, /index/{id}*, /user/{uid}/index*)
 * - P28 个人设置与超合金组件 (/settings*, /dev/app*)
 * - P29 维基人 / MAGI 问答 / Dollars (/wiki, /magi*, /dollars)
 */

import { escapeHtml, postFormUrlEncoded } from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from '../phase-b/dom-vault.js';
import {
  extractMonoChannelData,
  extractMonoDetailData,
  extractRakuenTopiclistData,
  extractGroupPageData,
  extractTopicDetailData,
  extractBlogPageData,
  extractCatalogPageData,
  extractExploreWikiData,
} from './community-extractor.js';

function renderPagerHtml(pagerLinks) {
  if (!pagerLinks || !pagerLinks.length) return '';
  return (
    `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px;">` +
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

function renderReplyFloorsHtml(comments) {
  if (!comments.length) {
    return '<div style="padding:24px;text-align:center;color:var(--muted);">暂无回复讨论</div>';
  }
  return comments
    .map((c) => {
      const subsHtml = c.subReplies.length
        ? `<div style="margin-top:10px;padding:10px 12px;border-radius:11px;background:var(--chip);display:flex;flex-direction:column;gap:8px;">` +
            c.subReplies
              .map(
                (sr) =>
                  `<div style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;">` +
                    `<a href="${escapeHtml(sr.userHref)}"><img src="${escapeHtml(sr.avatar)}" alt="" referrerpolicy="no-referrer" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;" /></a>` +
                    `<div style="min-width:0;flex:1;"><div style="display:flex;align-items:center;gap:6px;"><a href="${escapeHtml(sr.userHref)}" style="font-weight:700;color:var(--accent);">${escapeHtml(sr.user)}</a><small style="color:var(--muted);">${escapeHtml(sr.floor)} · ${escapeHtml(sr.time)}</small></div><div style="margin-top:2px;line-height:1.6;">${sr.messageHtml}</div></div>` +
                  `</div>`
              )
              .join('') +
          `</div>`
        : '';
      return (
        `<article class="glass-panel" style="padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">` +
          `<a href="${escapeHtml(c.userHref)}"><img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.user)}" referrerpolicy="no-referrer" loading="lazy" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" /></a>` +
          `<div style="min-width:0;flex:1;">` +
            `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">` +
              `<a href="${escapeHtml(c.userHref)}" style="font-size:13.5px;font-weight:700;color:var(--accent);">${escapeHtml(c.user)}</a>` +
              `<span style="font-family:var(--mono);font-size:11px;color:var(--muted);">${escapeHtml(c.floor)} · ${escapeHtml(c.time)}</span>` +
            `</div>` +
            `<div style="margin-top:6px;font-size:13.5px;line-height:1.7;color:var(--ink);">${c.messageHtml}</div>` +
            subsHtml +
          `</div>` +
        `</article>`
      );
    })
    .join('');
}

function renderReplyComposerHtml(replyForm, session) {
  if (!replyForm) return '';
  return `
    <form class="glass-panel" id="bgmCommunityReplyForm" action="${escapeHtml(replyForm.action)}" method="post" style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
      <input type="hidden" name="formhash" value="${escapeHtml(replyForm.formhash || session?.formhash || '')}" />
      <input type="hidden" name="lastview" value="${escapeHtml(replyForm.lastview || '')}" />
      <div style="font-size:13.5px;font-weight:700;color:var(--ink);">💬 发表回复</div>
      <textarea name="content" id="bgmCommunityReplyInput" rows="3" placeholder="写下你的回应…" required style="width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:13px;resize:vertical;"></textarea>
      <div style="display:flex;justify-content:flex-end;">
        <button type="submit" class="action-pill-btn" style="background:var(--accent);color:#fff;border:0;padding:7px 18px;">加上去</button>
      </div>
    </form>`;
}

function bindReplyFormSubmit(mainEl, doc, session, toast) {
  mainEl.querySelector('#bgmCommunityReplyForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const content = doc.getElementById('bgmCommunityReplyInput')?.value?.trim();
    if (!content) return;
    try {
      await postFormUrlEncoded(ev.target.getAttribute('action'), {
        formhash: ev.target.querySelector('input[name="formhash"]')?.value || session?.formhash || '',
        lastview: ev.target.querySelector('input[name="lastview"]')?.value || '',
        content,
        submit: '加上去',
      });
      toast?.('回复已发布，正在刷新…');
      location.reload();
    } catch (err) {
      toast?.('发布失败：' + (err?.message || '请重试'));
    }
  });
}

/**
 * E1 · P18 人物频道聚合水合器 (/mono, /character, /person, /user/{uid}/mono*)
 */
export function hydrateMonoChannelPage({ doc, activatePageStyles }) {
  const data = extractMonoChannelData(doc);
  activatePageStyles(['bangumi-subject.css', 'bangumi-mono.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const subTabsHtml = data.subTabs
    .map(
      (tb) =>
        `<a href="${escapeHtml(tb.href)}" class="studio-pill-btn${tb.active ? ' active' : ''}">${escapeHtml(tb.label)}</a>`
    )
    .join('');

  const sectionsHtml = data.sections
    .map(
      (sec) =>
        `<section class="glass-panel" style="margin-bottom:18px;">
          <div class="panel-header-title"><h3><span class="panel-icon">👤</span> ${escapeHtml(sec.title)}</h3></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:12px;">
            ${sec.items
              .map(
                (it) =>
                  `<a href="${escapeHtml(it.href)}" style="display:flex;flex-direction:column;gap:6px;text-decoration:none;color:var(--ink);">` +
                    `<div style="aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--chip);border:1px solid var(--hairline);">` +
                      `<img src="${escapeHtml(it.avatar)}" alt="${escapeHtml(it.name)}" referrerpolicy="no-referrer" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center 12%;" />` +
                    `</div>` +
                    `<div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.name)}</div>` +
                    (it.cnName ? `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.cnName)}</div>` : '') +
                  `</a>`
              )
              .join('')}
          </div>
        </section>`
    )
    .join('');

  const listHtml = data.listItems.length
    ? `<section class="glass-panel">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
          ${data.listItems
            .map(
              (it) =>
                `<a href="${escapeHtml(it.href)}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:var(--chip);border:1px solid var(--hairline);text-decoration:none;color:var(--ink);">` +
                  `<img src="${escapeHtml(it.avatar)}" alt="${escapeHtml(it.name)}" referrerpolicy="no-referrer" loading="lazy" style="width:52px;height:52px;border-radius:10px;object-fit:cover;object-position:center 12%;flex-shrink:0;" />` +
                  `<div style="min-width:0;flex:1;"><div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.name)}</div>${it.cnName ? `<div style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(it.cnName)}</div>` : ''}${it.commentCount ? `<div style="font-size:11px;color:var(--accent);">💬 ${escapeHtml(it.commentCount)}</div>` : ''}</div>` +
                `</a>`
            )
            .join('')}
        </div>
        ${renderPagerHtml(data.pagerLinks)}
      </section>`
    : '';

  const sideHtml =
    (data.facetGroups.length
      ? data.facetGroups
          .map(
            (grp) =>
              `<div class="glass-panel" style="margin-bottom:14px;"><div class="panel-header-title"><h3><span class="panel-icon">🧭</span> ${escapeHtml(grp.title)}</h3></div><div style="display:flex;flex-wrap:wrap;gap:6px;">${grp.links.map((lk) => `<a href="${escapeHtml(lk.href)}" class="studio-pill-btn${lk.active ? ' active' : ''}">${escapeHtml(lk.label)}</a>`).join('')}</div></div>`
          )
          .join('')
      : '') +
    (data.sideGroups.length
      ? `<div class="glass-panel"><div class="panel-header-title"><h3><span class="panel-icon">🎂</span> 今日寿星与新收录</h3></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">${data.sideGroups.map((s) => `<a href="${escapeHtml(s.href)}" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:11.5px;color:var(--ink);text-decoration:none;"><img src="${escapeHtml(s.avatar)}" alt="" referrerpolicy="no-referrer" style="width:48px;height:48px;border-radius:10px;object-fit:cover;" /><span style="width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(s.name)}</span></a>`).join('')}</div></div>`
      : '');

  const html = `
    <section class="subject-banner">
      <div class="subject-banner-inner">
        <div class="subject-header-meta"><span class="subject-type-badge">MONO · 人物数据库</span></div>
        <div class="subject-title-row">
          <div class="subject-title-group"><h1><span class="title-jp">${escapeHtml(data.heading)}</span></h1></div>
          <div class="studio-pill-group">${subTabsHtml}</div>
        </div>
      </div>
    </section>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start;">
      <div id="bgmMonoColA">${sectionsHtml}${listHtml}</div>
      <aside id="bgmMonoColB">${sideHtml}</aside>
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
}

/**
 * E1 · P19 角色与人物详情水合器 (/character/{id}*, /person/{id}*)
 */
export function hydrateMonoDetailPage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractMonoDetailData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-mono-detail.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let workQuery = '';

  const navHtml = data.navTabs
    .map(
      (tb) =>
        `<li class="subject-nav-tab-item${tb.active ? ' active' : ''}"><a href="${escapeHtml(tb.href)}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  const infoboxHtml = data.infobox
    .map(
      (r) =>
        `<li class="infobox-row"><span class="infobox-key">${escapeHtml(r.key)}</span><span class="infobox-val">${r.valHtml}</span></li>`
    )
    .join('');

  const collectorsHtml = data.collectors.length
    ? `<div class="glass-panel">
        <div class="panel-header-title"><h3><span class="panel-icon">❤️</span> 谁收藏了${data.kind === 'character' ? '这个角色' : '这位人物'}?</h3></div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
          ${data.collectors
            .slice(0, 9)
            .map(
              (u) =>
                `<a href="${escapeHtml(u.href)}" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:11.5px;color:var(--ink);text-decoration:none;"><img src="${escapeHtml(u.avatar)}" alt="" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" /><span style="width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.name)}</span></a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  const html = `
    <section class="subject-banner" id="bgmMonoDetailBanner">
      <div class="subject-banner-backdrop" style="background-image:url('${escapeHtml(data.cover)}')"></div>
      <div class="subject-banner-inner">
        <div class="subject-header-meta">
          <span class="subject-type-badge">${data.kind === 'character' ? '🎭 虚构角色' : '👤 现实人物'}</span>
        </div>
        <div class="subject-title-row">
          <div class="subject-title-group">
            <h1>
              <span class="title-jp">${escapeHtml(data.nameJp)}</span>
              ${data.nameCn && data.nameCn !== data.nameJp ? `<span class="title-cn">${escapeHtml(data.nameCn)}</span>` : ''}
            </h1>
          </div>
          <div class="subject-header-actions">
            ${
              data.collectAction
                ? `<a href="${escapeHtml(data.collectAction.href)}" class="action-pill-btn" style="background:var(--accent);color:#fff;border:0;">❤️ ${escapeHtml(data.collectAction.label)}</a>`
                : ''
            }
            <a href="/${data.kind}/${escapeHtml(data.id)}/edit" class="action-pill-btn">✏️ 维基修订</a>
          </div>
        </div>
        <ul class="subject-nav-tabs">${navHtml}</ul>
      </div>
    </section>

    <div style="display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;align-items:start;">
      <aside class="column-subject-left" id="bgmMonoDetailLeft">
        <div class="subject-cover-wrapper">
          <img class="subject-cover-img" src="${escapeHtml(data.cover)}" alt="${escapeHtml(data.nameCn || data.nameJp)}" referrerpolicy="no-referrer" />
        </div>
        <div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">📋</span> 基本档案</h3></div>
          <ul class="infobox-list expanded">${infoboxHtml}</ul>
        </div>
        ${collectorsHtml}
      </aside>

      <section class="column-subject-center" id="bgmMonoDetailRight">
        ${
          data.detailHtml
            ? `<div class="glass-panel"><div class="panel-header-title"><h3><span class="panel-icon">📖</span> 人物简介</h3></div><div class="subject-summary-text expanded">${data.detailHtml}</div></div>`
            : ''
        }
        ${
          data.works.length
            ? `<div class="glass-panel">
                <div class="panel-header-title" style="flex-wrap:wrap;gap:10px;">
                  <h3><span class="panel-icon">🎬</span> 出演 / 参与作品 (${data.works.length})</h3>
                  <input type="search" id="bgmMonoWorksFilter" placeholder="搜索作品或担任职务…" style="padding:5px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12px;" />
                </div>
                <div id="bgmMonoWorksHost" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;"></div>
              </div>`
            : ''
        }
        <div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">💬</span> 吐槽与讨论 (${data.comments.length})</h3></div>
          <div style="display:flex;flex-direction:column;gap:12px;">${renderReplyFloorsHtml(data.comments)}</div>
          ${renderReplyComposerHtml(data.replyForm, session)}
        </div>
      </section>
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

  function renderWorks() {
    const host = doc.getElementById('bgmMonoWorksHost');
    if (!host) return;
    const q = workQuery.trim().toLowerCase();
    const list = q
      ? data.works.filter(
          (w) =>
            (w.title + ' ' + w.orig + ' ' + w.badges.join(' ')).toLowerCase().includes(q)
        )
      : data.works;
    host.innerHTML = list
      .map(
        (w) =>
          `<a href="${escapeHtml(w.href)}" style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:12px;background:var(--chip);border:1px solid var(--hairline);text-decoration:none;color:var(--ink);">` +
            (w.cover
              ? `<img src="${escapeHtml(w.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:48px;height:64px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`
              : '') +
            `<div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:4px;">` +
              `<div style="font-size:13px;font-weight:700;line-height:1.35;">${escapeHtml(w.title)}</div>` +
              (w.badges.length
                ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${w.badges.map((b) => `<span style="padding:1px 6px;border-radius:5px;background:var(--accent-soft,var(--surface));color:var(--accent);font-size:10.5px;font-weight:700;">${escapeHtml(b)}</span>`).join('')}</div>`
                : '') +
              (w.info ? `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(w.info)}</div>` : '') +
            `</div>` +
          `</a>`
      )
      .join('');
  }

  renderWorks();

  doc.getElementById('bgmMonoWorksFilter')?.addEventListener('input', (ev) => {
    workQuery = ev.target.value;
    renderWorks();
  });

  bindReplyFormSubmit(mainEl, doc, session, toast);
}

/**
 * E1 · P20 超展开阅读器水合器 (/rakuen, /rakuen/topiclist, /rakuen/topic/{type}/{id})
 */
export function hydrateRakuenPage({ doc, route, session, activatePageStyles, toast }) {
  activatePageStyles(['bangumi-subject.css', 'bangumi-rakuen.css', 'phase-b-hydrated.css']);

  if (route.subPage === 'topiclist' || route.frameRole === 'rakuen-list') {
    const data = extractRakuenTopiclistData(doc);
    stashOriginalMain(doc);
    let query = '';
    const tabsHtml = data.tabs
      .map(
        (t) =>
          `<a href="${escapeHtml(t.href)}" class="studio-pill-btn${t.active ? ' active' : ''}">${escapeHtml(t.label)}</a>`
      )
      .join('');

    const html = `
      <div style="padding:12px;display:flex;flex-direction:column;gap:10px;">
        <div class="studio-pill-group" style="flex-wrap:wrap;">${tabsHtml}</div>
        <input type="search" id="bgmRakuenFilterInput" placeholder="过滤超展开话题…" style="width:100%;padding:7px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12px;" />
        <div id="bgmRakuenListHost" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>`;

    mountHydratedStage(doc, { tag: 'main', id: 'main', className: 'rakuen-topiclist-stage', html });

    const renderList = () => {
      const host = doc.getElementById('bgmRakuenListHost');
      if (!host) return;
      const q = query.trim().toLowerCase();
      const list = q
        ? data.items.filter((it) => (it.title + ' ' + it.parentLabel).toLowerCase().includes(q))
        : data.items;
      host.innerHTML = list
        .map(
          (it) =>
            `<a href="${escapeHtml(it.href)}" target="right" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--hairline);text-decoration:none;color:var(--ink);">` +
              `<img src="${escapeHtml(it.avatar)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:34px;height:34px;border-radius:9px;object-fit:cover;flex-shrink:0;" />` +
              `<div style="min-width:0;flex:1;"><div style="font-size:13px;font-weight:700;line-height:1.4;">${escapeHtml(it.title)} <small style="color:var(--accent);">${escapeHtml(it.replies)}</small></div><div style="font-size:11px;color:var(--muted);margin-top:3px;">${escapeHtml(it.parentLabel)} · ${escapeHtml(it.time)}</div></div>` +
            `</a>`
        )
        .join('');
    };
    renderList();
    doc.getElementById('bgmRakuenFilterInput')?.addEventListener('input', (ev) => {
      query = ev.target.value;
      renderList();
    });
    return;
  }

  if (route.subPage === 'topic' || route.frameRole === 'rakuen-topic') {
    hydrateTopicDetailPage({ doc, route, session, activatePageStyles, toast });
    return;
  }

  // /rakuen 外层框架或 /rakuen/home：保留原站双 iframe 容器并标记已水合
  doc.documentElement.dataset.bgmPageHydrated = '1';
}

/**
 * E1 · P21 小组首页/发现/讨论列表水合器 (/group, /group/discover, /group/{slug}*)
 */
export function hydrateGroupPage({ doc, activatePageStyles }) {
  const data = extractGroupPageData(doc);
  activatePageStyles(['bangumi-subject.css', 'bangumi-group.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const hotHtml = data.hotGroups.length
    ? `<section class="glass-panel" style="margin-bottom:18px;">
        <div class="panel-header-title"><h3><span class="panel-icon">🔥</span> 热门番组小组</h3></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
          ${data.hotGroups
            .map(
              (g) =>
                `<a href="${escapeHtml(g.href)}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--chip);border:1px solid var(--hairline);text-decoration:none;color:var(--ink);">` +
                  `<img src="${escapeHtml(g.icon)}" alt="" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:9px;object-fit:cover;flex-shrink:0;" />` +
                  `<div style="min-width:0;flex:1;"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g.title)}</div><div style="font-size:11px;color:var(--muted);">${escapeHtml(g.members)}</div></div>` +
                `</a>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  const topicsHtml = data.topics.length
    ? `<section class="glass-panel">
        <div class="panel-header-title"><h3><span class="panel-icon">💬</span> 最新小组话题</h3></div>
        <table class="topic-table">
          <thead><tr><th>话题</th><th>所属小组 / 作者</th><th>回复</th><th>更新时间</th></tr></thead>
          <tbody>
            ${data.topics
              .map(
                (tp) =>
                  `<tr><td><a class="topic-title-link" href="${escapeHtml(tp.href)}">${escapeHtml(tp.title)}</a></td><td>${tp.groupName ? `<a href="${escapeHtml(tp.groupHref)}" style="color:var(--accent);font-weight:600;">${escapeHtml(tp.groupName)}</a> · ` : ''}<a href="${escapeHtml(tp.authorHref)}" style="color:var(--muted);">${escapeHtml(tp.author)}</a></td><td><span class="topic-replies-badge">${escapeHtml(tp.replies)}</span></td><td style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">${escapeHtml(tp.date)}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
        ${renderPagerHtml(data.pagerLinks)}
      </section>`
    : '';

  const sideHtml = data.sideGroups.length
    ? `<div class="glass-panel">
        <div class="panel-header-title"><h3><span class="panel-icon">🏛️</span> 小组发现</h3></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${data.sideGroups
            .map(
              (g) =>
                `<a href="${escapeHtml(g.href)}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--chip);text-decoration:none;color:var(--ink);">` +
                  `<img src="${escapeHtml(g.icon)}" alt="" referrerpolicy="no-referrer" style="width:32px;height:32px;border-radius:7px;object-fit:cover;flex-shrink:0;" />` +
                  `<div style="min-width:0;flex:1;"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g.title)}</div><div style="font-size:10.5px;color:var(--muted);">${escapeHtml(g.members)}</div></div>` +
                `</a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  const html = `
    <section class="subject-banner">
      <div class="subject-banner-inner">
        <div class="subject-header-meta"><span class="subject-type-badge">GROUP · 番组小组</span></div>
        <div class="subject-title-row">
          <div class="subject-title-group"><h1><span class="title-jp">${escapeHtml(data.heading)}</span></h1></div>
          <div class="studio-pill-group">
            <a href="/group" class="studio-pill-btn">小组首页</a>
            <a href="/group/discover" class="studio-pill-btn">随便看看</a>
            <a href="/group/my_reply" class="studio-pill-btn">我回应的话题</a>
          </div>
        </div>
      </div>
    </section>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start;">
      <div id="bgmGroupColA">${hotHtml}${topicsHtml}</div>
      <aside id="bgmGroupColB">${sideHtml}</aside>
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
}

/**
 * E1 · P22 小组与条目话题讨论楼水合器 (/group/topic/{id}, /subject/topic/{id})
 */
export function hydrateTopicDetailPage({ doc, session, activatePageStyles, toast }) {
  const data = extractTopicDetailData(doc);
  activatePageStyles(['bangumi-subject.css', 'bangumi-group.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const opHtml = data.op
    ? `<article class="glass-panel" style="margin-bottom:18px;border-left:4px solid var(--accent);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--hairline);">
          <div style="display:flex;align-items:center;gap:10px;">
            <a href="${escapeHtml(data.op.userHref)}"><img src="${escapeHtml(data.op.avatar)}" alt="" referrerpolicy="no-referrer" style="width:42px;height:42px;border-radius:50%;object-fit:cover;" /></a>
            <div>
              <a href="${escapeHtml(data.op.userHref)}" style="font-size:14px;font-weight:800;color:var(--accent);">${escapeHtml(data.op.user)}</a>
              <div style="font-family:var(--mono);font-size:11px;color:var(--muted);">楼主 · ${escapeHtml(data.op.time)}</div>
            </div>
          </div>
        </div>
        <div style="font-size:14px;line-height:1.78;color:var(--ink);">${data.op.contentHtml}</div>
      </article>`
    : '';

  const html = `
    <section class="subject-banner">
      <div class="subject-banner-inner">
        <div class="subject-header-meta">
          <a href="${escapeHtml(data.parentHref)}" class="subject-type-badge" style="text-decoration:none;">← ${escapeHtml(data.parentName)}</a>
          <span class="subject-rank-badge">共 ${data.replies.length} 条回复</span>
        </div>
        <div class="subject-title-row">
          <div class="subject-title-group"><h1><span class="title-jp" style="font-size:24px;">${escapeHtml(data.title)}</span></h1></div>
        </div>
      </div>
    </section>
    ${opHtml}
    <div style="display:flex;flex-direction:column;gap:12px;">${renderReplyFloorsHtml(data.replies)}</div>
    ${renderReplyComposerHtml(data.replyForm, session)}`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html,
  });
  mainEl.style.maxWidth = '1120px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';

  bindReplyFormSubmit(mainEl, doc, session, toast);
}

/**
 * E2 · P23 日志广场与日志详情水合器 (/blog, /{type}/blog, /blog/{id}, /user/{uid}/blog)
 */
export function hydrateBlogPage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractBlogPageData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-blog.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  if (data.mode === 'detail') {
    const relHtml = data.relatedSubjects.length
      ? `<div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">🎬</span> 关联条目</h3></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${data.relatedSubjects
              .map(
                (s) =>
                  `<a href="${escapeHtml(s.href)}" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);">` +
                    (s.cover ? `<img src="${escapeHtml(s.cover)}" alt="" referrerpolicy="no-referrer" style="width:42px;height:56px;border-radius:7px;object-fit:cover;flex-shrink:0;" />` : '') +
                    `<span style="font-size:12.5px;font-weight:700;">${escapeHtml(s.title)}</span>` +
                  `</a>`
              )
              .join('')}
          </div>
        </div>`
      : '';

    const html = `
      <section class="subject-banner">
        <div class="subject-banner-inner">
          <div class="subject-header-meta"><span class="subject-type-badge">✒️ 个人日志</span></div>
          <div class="subject-title-row">
            <div class="subject-title-group"><h1><span class="title-jp" style="font-size:26px;">${escapeHtml(data.title)}</span></h1></div>
            <a href="/blog" class="action-pill-btn">← 日志广场</a>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <a href="${escapeHtml(data.authorHref)}"><img src="${escapeHtml(data.avatar)}" alt="" referrerpolicy="no-referrer" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" /></a>
            <a href="${escapeHtml(data.authorHref)}" style="font-weight:700;color:var(--accent);">${escapeHtml(data.author)}</a>
            <span style="font-size:12px;color:var(--muted);">${escapeHtml(data.time)}</span>
          </div>
        </div>
      </section>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start;">
        <div>
          <article class="glass-panel" style="padding:24px 28px;font-size:14.5px;line-height:1.85;color:var(--ink);margin-bottom:18px;">${data.contentHtml}</article>
          <div class="glass-panel">
            <div class="panel-header-title"><h3><span class="panel-icon">💬</span> 日志评论 (${data.comments.length})</h3></div>
            <div style="display:flex;flex-direction:column;gap:12px;">${renderReplyFloorsHtml(data.comments)}</div>
            ${renderReplyComposerHtml(data.replyForm, session)}
          </div>
        </div>
        <aside>${relHtml}</aside>
      </div>`;

    const mainEl = mountHydratedStage(doc, {
      tag: 'main',
      id: 'main',
      className: 'page-container',
      html,
    });
    mainEl.style.maxWidth = '1360px';
    mainEl.style.margin = '0 auto';
    mainEl.style.padding = '0 24px 64px';
    bindReplyFormSubmit(mainEl, doc, session, toast);
    return;
  }

  const tabsHtml = data.tabs
    .map(
      (t) =>
        `<a href="${escapeHtml(t.href)}" class="studio-pill-btn${t.active ? ' active' : ''}">${escapeHtml(t.label)}</a>`
    )
    .join('');

  const listHtml = data.blogs
    .map(
      (b) =>
        `<article class="glass-panel" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;">` +
          `<a href="${escapeHtml(b.href)}" style="width:64px;height:64px;flex:0 0 64px;border-radius:12px;overflow:hidden;display:block;"><img src="${escapeHtml(b.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:64px;height:64px;object-fit:cover;" /></a>` +
          `<div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:6px;">` +
            `<h3 style="margin:0;font-size:15.5px;font-weight:800;"><a href="${escapeHtml(b.href)}" style="color:var(--ink);text-decoration:none;">${escapeHtml(b.title)}</a></h3>` +
            (b.excerpt ? `<p style="margin:0;font-size:13px;line-height:1.65;color:var(--muted);">${escapeHtml(b.excerpt)}</p>` : '') +
            `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);">` +
              `<span>by <a href="${escapeHtml(b.authorHref)}" style="color:var(--accent);font-weight:700;">${escapeHtml(b.author)}</a></span>` +
              (b.subjectName ? `<span>· 关联 <a href="${escapeHtml(b.subjectHref)}" style="color:var(--ink);font-weight:600;">《${escapeHtml(b.subjectName)}》</a></span>` : '') +
              (b.time ? `<span>· ${escapeHtml(b.time)}</span>` : '') +
              `<span>· ${escapeHtml(b.replies)}</span>` +
            `</div>` +
          `</div>` +
        `</article>`
    )
    .join('');

  const html = `
    <section class="subject-banner">
      <div class="subject-banner-inner">
        <div class="subject-header-meta"><span class="subject-type-badge">BLOG · 日志专栏</span></div>
        <div class="subject-title-row">
          <div class="subject-title-group"><h1><span class="title-jp">${escapeHtml(data.heading)}</span></h1></div>
          <div class="studio-pill-group">${tabsHtml}<a href="/blog/create" class="studio-pill-btn active">✍️ 写新日志</a></div>
        </div>
      </div>
    </section>
    <div style="display:flex;flex-direction:column;gap:14px;">${listHtml}</div>
    ${renderPagerHtml(data.pagerLinks)}`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html,
  });
  mainEl.style.maxWidth = '1280px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';
}

/**
 * E2 · P24 目录广场与目录详情水合器 (/index, /index/browser, /index/{id}*, /user/{uid}/index*)
 */
export function hydrateCatalogPage({ doc, route, activatePageStyles }) {
  const data = extractCatalogPageData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-catalog.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  if (data.mode === 'detail') {
    const tabsHtml = data.catTabs
      .map(
        (t) =>
          `<a href="${escapeHtml(t.href)}" class="studio-pill-btn${t.active ? ' active' : ''}">${escapeHtml(t.label)}</a>`
      )
      .join('');

    const itemsHtml = data.items
      .map(
        (it) =>
          `<article class="glass-panel" style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;">` +
            `<a href="${escapeHtml(it.href)}" style="width:64px;height:88px;flex:0 0 64px;border-radius:10px;overflow:hidden;display:block;background:var(--chip);">` +
              (it.cover ? `<img src="${escapeHtml(it.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />` : '') +
            `</a>` +
            `<div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;">` +
              `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;"><a href="${escapeHtml(it.href)}" style="font-size:14.5px;font-weight:800;color:var(--ink);">${escapeHtml(it.title)}</a>${it.orig ? `<small style="color:var(--muted);">${escapeHtml(it.orig)}</small>` : ''}</div>` +
              (it.info ? `<div style="font-size:12px;color:var(--muted);">${escapeHtml(it.info)}</div>` : '') +
            `</div>` +
          `</article>`
      )
      .join('');

    const html = `
      <section class="subject-banner">
        <div class="subject-banner-inner">
          <div class="subject-header-meta"><span class="subject-type-badge">📑 精选目录</span></div>
          <div class="subject-title-row">
            <div class="subject-title-group"><h1><span class="title-jp" style="font-size:26px;">${escapeHtml(data.title)}</span></h1></div>
            <a href="/index/browser" class="action-pill-btn">← 目录广场</a>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <a href="${escapeHtml(data.authorHref)}"><img src="${escapeHtml(data.avatar)}" alt="" referrerpolicy="no-referrer" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" /></a>
            <a href="${escapeHtml(data.authorHref)}" style="font-weight:700;color:var(--accent);">${escapeHtml(data.author)}</a>
          </div>
          ${data.descHtml ? `<div style="margin-top:10px;font-size:13px;color:var(--muted);">${data.descHtml}</div>` : ''}
          ${tabsHtml ? `<div class="studio-pill-group" style="margin-top:12px;">${tabsHtml}</div>` : ''}
        </div>
      </section>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px;">${itemsHtml}</div>`;

    const mainEl = mountHydratedStage(doc, {
      tag: 'main',
      id: 'main',
      className: 'page-container',
      html,
    });
    mainEl.style.maxWidth = '1420px';
    mainEl.style.margin = '0 auto';
    mainEl.style.padding = '0 24px 64px';
    return;
  }

  const gridHtml = data.catalogs
    .map(
      (c) =>
        `<a href="${escapeHtml(c.href)}" class="glass-panel" style="display:flex;align-items:center;gap:12px;padding:14px 16px;text-decoration:none;color:var(--ink);">` +
          `<img src="${escapeHtml(c.avatar)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:44px;height:44px;border-radius:11px;object-fit:cover;flex-shrink:0;" />` +
          `<div style="min-width:0;flex:1;"><div style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.title)}</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px;">by ${escapeHtml(c.author)} · ${escapeHtml(c.time)}</div></div>` +
        `</a>`
    )
    .join('');

  const html = `
    <section class="subject-banner">
      <div class="subject-banner-inner">
        <div class="subject-header-meta"><span class="subject-type-badge">CATALOG · 目录广场</span></div>
        <div class="subject-title-row">
          <div class="subject-title-group"><h1><span class="title-jp">${escapeHtml(data.heading)}</span></h1></div>
          <div class="studio-pill-group">
            <a href="/index" class="studio-pill-btn">目录主页</a>
            <a href="/index/browser" class="studio-pill-btn">全部目录</a>
          </div>
        </div>
      </div>
    </section>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">${gridHtml}</div>
    ${renderPagerHtml(data.pagerLinks)}`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html,
  });
  mainEl.style.maxWidth = '1420px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';
}

/**
 * E2 · P28 个人设置与超合金组件原地增强水合器 (/settings*, /dev/app*)
 * 100% 保留原站表单、密码/Passkey WebAuthn 脚本、头像上传与超合金开关逻辑
 */
export function hydrateSettingsPage({ doc, activatePageStyles }) {
  activatePageStyles(['bangumi-settings.css', 'phase-b-hydrated.css']);
  const mainWrapper = doc.querySelector('#wrapperNeue > .mainWrapper, #main');
  if (mainWrapper) {
    mainWrapper.setAttribute('data-bgm-hydrated-el', '1');
    mainWrapper.style.maxWidth = '1320px';
    mainWrapper.style.margin = '18px auto 64px';
    mainWrapper.style.padding = '22px 26px';
    mainWrapper.style.borderRadius = '22px';
    mainWrapper.style.background = 'color-mix(in srgb, var(--surface) 88%, transparent)';
    mainWrapper.style.border = '1px solid var(--hairline)';
  }
  doc.documentElement.dataset.bgmPageHydrated = '1';
}

/**
 * E2 · P29 维基人 / MAGI 问答 / Dollars 水合器 (/wiki, /magi*, /dollars)
 */
export function hydrateExplorePage({ doc, route, activatePageStyles }) {
  activatePageStyles(['bangumi-subject.css', 'bangumi-explore.css', 'phase-b-hydrated.css']);

  if (route.subPage === 'wiki') {
    const data = extractExploreWikiData(doc);
    if (data.revisions.length > 0) {
      stashOriginalMain(doc);
      const revHtml = data.revisions
        .map(
          (r) =>
            `<div class="glass-panel" style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">` +
              `<div><a href="${escapeHtml(r.href)}" style="font-size:14px;font-weight:700;color:var(--ink);">${escapeHtml(r.title)}</a> ${r.comment ? `<span style="font-size:12px;color:var(--accent);">${escapeHtml(r.comment)}</span>` : ''}</div>` +
              `<div style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">${escapeHtml(r.time)}</div>` +
            `</div>`
        )
        .join('');

      const contribHtml = data.contributors
        .slice(0, 18)
        .map(
          (u) =>
            `<a href="${escapeHtml(u.href)}" style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:11.5px;color:var(--ink);text-decoration:none;"><img src="${escapeHtml(u.avatar)}" alt="" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:10px;object-fit:cover;" /><span style="width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.name)}</span></a>`
        )
        .join('');

      const html = `
        <section class="subject-banner">
          <div class="subject-banner-inner">
            <div class="subject-header-meta"><span class="subject-type-badge">WIKI · 番組 WIKI 計画</span></div>
            <div class="subject-title-row">
              <div class="subject-title-group"><h1><span class="title-jp">维基人工作台</span></h1></div>
              <div class="studio-pill-group">
                <a href="/wiki" class="studio-pill-btn active">🧩 维基人</a>
                <a href="/magi" class="studio-pill-btn">🧠 MAGI 问答</a>
                <a href="/dollars" class="studio-pill-btn">💬 Dollars</a>
              </div>
            </div>
          </div>
        </section>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start;">
          <div style="display:flex;flex-direction:column;gap:10px;">${revHtml}</div>
          <aside class="glass-panel">
            <div class="panel-header-title"><h3><span class="panel-icon">🏆</span> 活跃维基贡献者</h3></div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">${contribHtml}</div>
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
      return;
    }
  }

  // MAGI 问答与 Dollars 实时聊天室：原地增强保留原站交互脚本
  const mainWrapper = doc.querySelector('#wrapperNeue > .mainWrapper, #main');
  if (mainWrapper) {
    mainWrapper.setAttribute('data-bgm-hydrated-el', '1');
    mainWrapper.style.maxWidth = '1320px';
    mainWrapper.style.margin = '18px auto 64px';
    mainWrapper.style.padding = '22px 26px';
    mainWrapper.style.borderRadius = '22px';
    mainWrapper.style.background = 'color-mix(in srgb, var(--surface) 88%, transparent)';
    mainWrapper.style.border = '1px solid var(--hairline)';
  }
  doc.documentElement.dataset.bgmPageHydrated = '1';
}
