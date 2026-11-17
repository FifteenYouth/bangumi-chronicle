/**
 * Bangumi Chronicle · Phase C (C2 + C3) 条目子页面真站水合器 (subject-subpages-hydrator.js)
 * 覆盖：
 * - P05 条目章节批量管理 (/subject/{id}/ep)
 * - P06 单集讨论详情 (/ep/{id})
 * - P07 条目登场角色列表 (/subject/{id}/characters)
 * - P08 条目制作人员列表 (/subject/{id}/persons)
 * - P09 条目漫友吐槽箱 (/subject/{id}/comments)
 * - P10 条目长评与讨论版 (/subject/{id}/reviews, /subject/{id}/board)
 * - P11 条目收藏统计与透视 (/subject/{id}/stats)
 * - P12 条目 Wiki 编辑与关联修订 (/subject/{id}/edit*, /upload_img, /add_related/*)
 */

import {
  escapeHtml,
  updateEpisodeStatus,
  postFormUrlEncoded,
} from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from '../phase-b/dom-vault.js';
import {
  extractSubjectEpData,
  extractEpDetailData,
  extractSubjectCharactersData,
  extractSubjectPersonsData,
  extractSubjectCommentsData,
  extractSubjectReviewsBoardData,
  extractSubjectStatsData,
} from './subject-subpages-extractor.js';

function renderTenStarString(score) {
  const n = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
  if (!n) return '';
  return `<span class="stars-filled">${'★'.repeat(n)}</span><span class="stars-empty">${'☆'.repeat(10 - n)}</span>`;
}

function renderSubpageBanner(header, subtitleText = '') {
  const navHtml = header.navTabs
    .map(
      (tb) =>
        `<li class="subject-nav-tab-item${tb.active ? ' active' : ''}"><a href="${escapeHtml(tb.href)}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  return `
    <section class="subject-banner" id="bgmSubjBanner">
      <div class="subject-banner-backdrop"${header.cover ? ` style="background-image:url('${escapeHtml(header.cover)}')"` : ''}></div>
      <div class="subject-banner-inner">
        <div class="subject-header-meta">
          <span class="subject-type-badge">${escapeHtml(header.typeLabel)}</span>
          ${subtitleText ? `<span class="subject-rank-badge">${escapeHtml(subtitleText)}</span>` : ''}
        </div>
        <div class="subject-title-row">
          <div class="subject-title-group">
            <h1>
              <span class="title-jp"><a href="/subject/${escapeHtml(header.id)}" style="color:inherit;text-decoration:none;">${escapeHtml(header.titleJp)}</a></span>
              ${header.titleCn && header.titleCn !== header.titleJp ? `<span class="title-cn">${escapeHtml(header.titleCn)}</span>` : ''}
            </h1>
          </div>
          <div class="subject-header-actions">
            <a href="/subject/${escapeHtml(header.id)}" class="action-pill-btn">← 返回条目概览</a>
          </div>
        </div>
        <ul class="subject-nav-tabs">${navHtml}</ul>
      </div>
    </section>`;
}

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

/**
 * C2 · P05 条目章节批量管理水合器 (/subject/{id}/ep)
 */
export function hydrateSubjectEpPage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractSubjectEpData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-ep.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let catFilter = 'all';
  let searchQuery = '';

  const cats = Array.from(new Set(data.episodes.map((e) => e.cat)));
  const catPillsHtml =
    `<button type="button" class="studio-pill-btn active" data-ep-cat="all">全部 (${data.episodes.length})</button>` +
    cats
      .map(
        (c) =>
          `<button type="button" class="studio-pill-btn" data-ep-cat="${escapeHtml(c)}">${escapeHtml(c)} (${data.episodes.filter((x) => x.cat === c).length})</button>`
      )
      .join('');

  const editLinksHtml = data.editLinks
    .map(
      (lk) =>
        `<a href="${escapeHtml(lk.href)}" class="studio-pill-btn" style="display:inline-flex;">✏️ ${escapeHtml(lk.label)}</a>`
    )
    .join('');

  const html =
    renderSubpageBanner(data.header, `共 ${data.episodes.length} 话`) +
    `<div class="ep-columns-grid">
      <div class="ep-column-main" id="bgmEpColA">
        <div class="ep-prg-card">
          <div class="ep-prg-head">
            <div class="ep-prg-title-wrap">
              <h2 class="ep-prg-title">🎬 章节列表与进度管理</h2>
              <div class="studio-pill-group" id="bgmEpCatPills">${catPillsHtml}</div>
            </div>
            <input type="search" id="bgmEpSearchInput" placeholder="搜索章节标题或编号…" style="padding:6px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12.5px;" />
          </div>
          <div id="bgmEpListHost" style="display:flex;flex-direction:column;gap:10px;"></div>
        </div>
      </div>
      <aside class="ep-column-side" id="bgmEpColB">
        <div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">⚙️</span> 章节维基与批量维护</h3></div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${editLinksHtml || `<a href="/subject/${escapeHtml(data.header.id)}/ep/edit_batch" class="studio-pill-btn">✏️ 批量编辑章节</a>`}
          </div>
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

  function renderEpList() {
    const host = doc.getElementById('bgmEpListHost');
    if (!host) return;
    const q = searchQuery.trim().toLowerCase();
    const list = data.episodes.filter((ep) => {
      if (catFilter !== 'all' && ep.cat !== catFilter) return false;
      if (q && !(ep.rawTitle + ' ' + ep.titleCn).toLowerCase().includes(q)) return false;
      return true;
    });

    host.innerHTML = list.length
      ? list
          .map(
            (ep) =>
              `<div class="glass-panel" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;" data-ep-id="${escapeHtml(ep.epId)}">` +
                `<div style="min-width:0;flex:1;">` +
                  `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">` +
                    `<span style="font-family:var(--mono);font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--accent-soft, var(--chip));color:var(--accent);">${escapeHtml(ep.cat)} · #${escapeHtml(ep.num)}</span>` +
                    `<a href="${escapeHtml(ep.href)}" style="font-size:14.5px;font-weight:700;color:var(--ink);">${escapeHtml(ep.titleJp)}</a>` +
                    (ep.titleCn ? `<span style="font-size:13px;color:var(--muted);">/ ${escapeHtml(ep.titleCn)}</span>` : '') +
                  `</div>` +
                  `<div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-family:var(--mono);font-size:11.5px;color:var(--muted);">` +
                    (ep.airDate ? `<span>📅 首播: ${escapeHtml(ep.airDate)}</span>` : '') +
                    (ep.duration ? `<span>⏱ 时长: ${escapeHtml(ep.duration)}</span>` : '') +
                    `<a href="${escapeHtml(ep.href)}" style="color:var(--accent);font-weight:700;">💬 讨论 (+${ep.discussCount}) »</a>` +
                  `</div>` +
                `</div>` +
                `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">` +
                  `<button type="button" class="studio-pill-btn" data-ep-act="watched" data-ep-id="${escapeHtml(ep.epId)}">✓ 看过</button>` +
                  `<button type="button" class="studio-pill-btn" data-ep-act="till" data-ep-id="${escapeHtml(ep.epId)}">⇥ 看到</button>` +
                  `<button type="button" class="studio-pill-btn" data-ep-act="queue" data-ep-id="${escapeHtml(ep.epId)}">♡ 想看</button>` +
                  `<button type="button" class="studio-pill-btn" data-ep-act="remove" data-ep-id="${escapeHtml(ep.epId)}">↺ 撤消</button>` +
                `</div>` +
              `</div>`
          )
          .join('')
      : '<div style="padding:24px;text-align:center;color:var(--muted);">暂无匹配的章节</div>';
  }

  renderEpList();

  doc.getElementById('bgmEpSearchInput')?.addEventListener('input', (ev) => {
    searchQuery = ev.target.value;
    renderEpList();
  });

  mainEl.addEventListener('click', async (ev) => {
    const catBtn = ev.target.closest('[data-ep-cat]');
    if (catBtn) {
      catFilter = catBtn.getAttribute('data-ep-cat') || 'all';
      mainEl.querySelectorAll('[data-ep-cat]').forEach((b) => b.classList.toggle('active', b === catBtn));
      renderEpList();
      return;
    }

    const actBtn = ev.target.closest('[data-ep-act]');
    if (actBtn) {
      const act = actBtn.getAttribute('data-ep-act');
      const epId = actBtn.getAttribute('data-ep-id');
      const epIdx = data.episodes.findIndex((e) => e.epId === epId);
      const tillIds =
        act === 'till' && epIdx >= 0 ? data.episodes.slice(0, epIdx + 1).map((e) => e.epId) : [];
      try {
        await updateEpisodeStatus({
          epId,
          status: act,
          gh: session?.gh || session?.formhash,
          watchedTillIds: tillIds,
        });
        actBtn.classList.add('active');
        toast?.(`章节 #${data.episodes[epIdx]?.num || epId} 状态已同步`);
      } catch (err) {
        toast?.('更新失败：' + (err?.message || '请确认登录状态'));
      }
    }
  });
}

/**
 * C2 · P06 单集讨论详情水合器 (/ep/{id})
 */
export function hydrateEpDetailPage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractEpDetailData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-ep-detail.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let filterText = '';

  const sideEpsHtml = data.sideEps
    .map(
      (se) =>
        `<li><a href="${escapeHtml(se.href)}" class="studio-pill-btn${se.current ? ' active' : ''}" style="display:flex;justify-content:space-between;width:100%;"><span>${escapeHtml(se.label)}</span></a></li>`
    )
    .join('');

  const composerHtml = data.replyForm
    ? `<form class="glass-panel" id="bgmEpReplyForm" action="${escapeHtml(data.replyForm.action)}" method="post" style="display:flex;flex-direction:column;gap:10px;">
        <input type="hidden" name="formhash" value="${escapeHtml(data.replyForm.formhash || session?.formhash || '')}" />
        <input type="hidden" name="lastview" value="${escapeHtml(data.replyForm.lastview || '')}" />
        <div style="font-size:13.5px;font-weight:700;color:var(--ink);">💬 发表本集吐槽 / 讨论</div>
        <textarea name="content" id="bgmEpReplyInput" rows="3" placeholder="写下你对本集剧情、演出、作画的感想…" required style="width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:13px;resize:vertical;"></textarea>
        <div style="display:flex;justify-content:flex-end;">
          <button type="submit" class="action-pill-btn" style="background:var(--accent);color:#fff;border:0;padding:7px 18px;">加上去</button>
        </div>
      </form>`
    : '';

  const html =
    renderSubpageBanner(data.header, data.epTitle) +
    `<div class="ep-detail-columns-grid">
      <div class="ep-detail-col-main" id="bgmEpDetailColA">
        <section class="ep-header-card">
          <div class="ep-header-top">
            <h2 class="title"><span class="ep-code-badge">EP</span><span>${escapeHtml(data.epTitle)}</span></h2>
            <div class="ep-header-right-tools">
              <button type="button" class="action-pill-btn" id="bgmMarkEpWatchedBtn" style="background:var(--accent);color:#fff;border:0;">✓ 标记本集看过</button>
            </div>
          </div>
          ${data.tipText ? `<div style="margin-top:10px;font-family:var(--mono);font-size:12px;color:var(--muted);">${escapeHtml(data.tipText)}</div>` : ''}
          ${data.descHtml ? `<div style="margin-top:12px;font-size:13.5px;line-height:1.75;color:var(--ink);">${data.descHtml}</div>` : ''}
        </section>

        ${composerHtml}

        <section class="glass-panel">
          <div class="panel-header-title" style="flex-wrap:wrap;gap:10px;">
            <h3><span class="panel-icon">💬</span> 单集讨论 (${data.comments.length} 楼)</h3>
            <input type="search" id="bgmEpCommentFilter" placeholder="搜索本集评论或用户…" style="padding:5px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12px;" />
          </div>
          <div id="bgmEpCommentList" style="display:flex;flex-direction:column;gap:12px;"></div>
        </section>
      </div>

      <aside class="ep-detail-col-side" id="bgmEpDetailColB">
        <div class="glass-panel">
          <div class="panel-header-title">
            <h3><span class="panel-icon">📋</span> 章节快速跳转</h3>
            <a href="/subject/${escapeHtml(data.header.id)}/ep" class="header-link">全部 »</a>
          </div>
          <ul style="display:flex;flex-direction:column;gap:6px;max-height:520px;overflow-y:auto;">${sideEpsHtml}</ul>
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

  function renderComments() {
    const host = doc.getElementById('bgmEpCommentList');
    if (!host) return;
    const q = filterText.trim().toLowerCase();
    const list = q
      ? data.comments.filter(
          (c) =>
            c.user.toLowerCase().includes(q) ||
            c.messageHtml.toLowerCase().includes(q)
        )
      : data.comments;

    host.innerHTML = list.length
      ? list
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
          .join('')
      : '<div style="padding:24px;text-align:center;color:var(--muted);">暂无匹配的评论</div>';
  }

  renderComments();

  doc.getElementById('bgmEpCommentFilter')?.addEventListener('input', (ev) => {
    filterText = ev.target.value;
    renderComments();
  });

  doc.getElementById('bgmMarkEpWatchedBtn')?.addEventListener('click', async () => {
    try {
      await updateEpisodeStatus({
        epId: data.epId,
        status: 'watched',
        gh: session?.gh || session?.formhash,
      });
      toast?.('已标记本集为看过');
    } catch (err) {
      toast?.('标记失败：' + (err?.message || '请确认登录状态'));
    }
  });

  doc.getElementById('bgmEpReplyForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const content = doc.getElementById('bgmEpReplyInput')?.value?.trim();
    if (!content) return;
    try {
      await postFormUrlEncoded(ev.target.getAttribute('action'), {
        formhash: ev.target.querySelector('input[name="formhash"]')?.value || session?.formhash || '',
        lastview: ev.target.querySelector('input[name="lastview"]')?.value || '',
        content,
        submit: '加上去',
      });
      toast?.('评论已发布，正在刷新…');
      location.reload();
    } catch (err) {
      toast?.('发布失败：' + (err?.message || '请重试'));
    }
  });
}

/**
 * C2 · P07 条目登场角色列表水合器 (/subject/{id}/characters)
 */
export function hydrateSubjectCharactersPage({ doc, route, activatePageStyles }) {
  const data = extractSubjectCharactersData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-characters.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let roleFilter = 'all';
  let query = '';

  const roles = Array.from(new Set(data.characters.map((c) => c.role)));
  const rolePillsHtml =
    `<button type="button" class="studio-pill-btn active" data-crt-role="all">全部 (${data.characters.length})</button>` +
    roles
      .map(
        (r) =>
          `<button type="button" class="studio-pill-btn" data-crt-role="${escapeHtml(r)}">${escapeHtml(r)} (${data.characters.filter((x) => x.role === r).length})</button>`
      )
      .join('');

  const html =
    renderSubpageBanner(data.header, `角色 · 共 ${data.characters.length} 名`) +
    `<div class="crt-columns-grid">
      <div class="column-main" id="bgmCrtColA">
        <div class="crt-toolbar-card">
          <div class="crt-toolbar-top">
            <div class="crt-title-group">
              <h2 class="subtitle">🎭 登场角色与声优阵容</h2>
              <div class="studio-pill-group">${rolePillsHtml}</div>
            </div>
            <input type="search" id="bgmCrtSearchInput" placeholder="搜索角色名或声优…" style="padding:6px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12.5px;" />
          </div>
        </div>
        <div id="bgmCrtListHost" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;"></div>
      </div>
      <aside class="column-side" id="bgmCrtColB">
        <div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">✏️</span> 维基角色关联</h3></div>
          <a href="/subject/${escapeHtml(data.header.id)}/add_related/character" class="studio-pill-btn" style="display:inline-flex;">+ 添加新关联角色</a>
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

  function renderCrtList() {
    const host = doc.getElementById('bgmCrtListHost');
    if (!host) return;
    const q = query.trim().toLowerCase();
    const list = data.characters.filter((c) => {
      if (roleFilter !== 'all' && c.role !== roleFilter) return false;
      if (q) {
        const hay = [c.nameJp, c.nameCn, c.infoText, ...c.actors.map((a) => a.name)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    host.innerHTML = list
      .map((c) => {
        const actorsHtml = c.actors
          .map(
            (ac) =>
              `<a href="${escapeHtml(ac.href)}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:8px;background:var(--chip);font-size:11.5px;color:var(--ink);text-decoration:none;">` +
                `<img src="${escapeHtml(ac.avatar)}" alt="" referrerpolicy="no-referrer" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />` +
                `<span>${escapeHtml(ac.name)}</span>` +
                `<small style="color:var(--accent);font-weight:700;">${escapeHtml(ac.tag)}</small>` +
              `</a>`
          )
          .join('');
        return (
          `<article class="glass-panel" style="padding:14px 16px;display:flex;align-items:flex-start;gap:14px;">` +
            `<a href="${escapeHtml(c.href)}" style="width:64px;height:64px;flex:0 0 64px;border-radius:12px;overflow:hidden;display:block;">` +
              `<img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.nameCn || c.nameJp)}" referrerpolicy="no-referrer" loading="lazy" style="width:64px;height:64px;object-fit:cover;object-position:center 12%;" />` +
            `</a>` +
            `<div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;">` +
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">` +
                `<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">` +
                  `<a href="${escapeHtml(c.href)}" style="font-size:14.5px;font-weight:800;color:var(--ink);">${escapeHtml(c.nameCn || c.nameJp)}</a>` +
                  (c.nameCn && c.nameJp !== c.nameCn ? `<small style="font-size:11.5px;color:var(--muted);">${escapeHtml(c.nameJp)}</small>` : '') +
                `</div>` +
                `<span class="char-role-badge${c.role === '主角' ? ' role-lead' : ''}">${escapeHtml(c.role)}</span>` +
              `</div>` +
              (c.infoText ? `<div style="font-size:11.5px;color:var(--muted);">${escapeHtml(c.infoText)}${c.commentCount ? ` · 💬 ${escapeHtml(c.commentCount)}` : ''}</div>` : '') +
              (actorsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${actorsHtml}</div>` : '') +
            `</div>` +
          `</article>`
        );
      })
      .join('');
  }

  renderCrtList();

  doc.getElementById('bgmCrtSearchInput')?.addEventListener('input', (ev) => {
    query = ev.target.value;
    renderCrtList();
  });

  mainEl.addEventListener('click', (ev) => {
    const rBtn = ev.target.closest('[data-crt-role]');
    if (rBtn) {
      roleFilter = rBtn.getAttribute('data-crt-role') || 'all';
      mainEl.querySelectorAll('[data-crt-role]').forEach((b) => b.classList.toggle('active', b === rBtn));
      renderCrtList();
    }
  });
}

/**
 * C2 · P08 条目制作人员列表水合器 (/subject/{id}/persons)
 */
export function hydrateSubjectPersonsPage({ doc, route, activatePageStyles }) {
  const data = extractSubjectPersonsData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-persons.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let jobFilter = 'all';
  let query = '';

  const jobCounts = {};
  data.persons.forEach((p) => {
    p.jobs.forEach((j) => {
      jobCounts[j.job] = (jobCounts[j.job] || 0) + 1;
    });
  });
  const topJobs = Object.entries(jobCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const jobPillsHtml =
    `<button type="button" class="studio-pill-btn active" data-prsn-job="all">全部 (${data.persons.length})</button>` +
    topJobs
      .map(
        ([jb, cnt]) =>
          `<button type="button" class="studio-pill-btn" data-prsn-job="${escapeHtml(jb)}">${escapeHtml(jb)} (${cnt})</button>`
      )
      .join('');

  const secTabsHtml = data.secTabs
    .map(
      (st) =>
        `<a href="${escapeHtml(st.href)}" class="studio-pill-btn${st.active ? ' active' : ''}">${escapeHtml(st.label)}</a>`
    )
    .join('');

  const html =
    renderSubpageBanner(data.header, `制作人员 · 共 ${data.persons.length} 人`) +
    `<div class="prsn-columns-grid">
      <div class="column-main" id="bgmPrsnColA">
        <div class="glass-panel" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <h2 style="margin:0;font-size:16px;font-weight:800;">🎬 制作人员名单 (Staff)</h2>
              <div class="studio-pill-group">${secTabsHtml}</div>
            </div>
            <input type="search" id="bgmPrsnSearchInput" placeholder="搜索制作人员、职位或参与集数…" style="padding:6px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12.5px;" />
          </div>
          <div class="studio-pill-group" style="flex-wrap:wrap;">${jobPillsHtml}</div>
        </div>
        <div id="bgmPrsnListHost" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;"></div>
      </div>
      <aside class="column-side" id="bgmPrsnColB">
        <div class="glass-panel">
          <div class="panel-header-title"><h3><span class="panel-icon">✏️</span> 维基制作人员关联</h3></div>
          <a href="/subject/${escapeHtml(data.header.id)}/add_related/person" class="studio-pill-btn" style="display:inline-flex;">+ 添加新制作人员</a>
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

  function renderPersons() {
    const host = doc.getElementById('bgmPrsnListHost');
    if (!host) return;
    const q = query.trim().toLowerCase();
    const list = data.persons.filter((p) => {
      if (jobFilter !== 'all' && !p.jobs.some((j) => j.job === jobFilter)) return false;
      if (q) {
        const hay = [p.nameJp, p.nameCn, ...p.jobs.map((j) => j.job + ' ' + j.eps)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    host.innerHTML = list
      .map((p) => {
        const jobsHtml = p.jobs
          .map(
            (j) =>
              `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;background:var(--chip);font-size:11.5px;">` +
                `<strong style="color:var(--accent);">${escapeHtml(j.job)}</strong>` +
                (j.eps ? `<small style="font-family:var(--mono);color:var(--muted);">ep.${escapeHtml(j.eps)}</small>` : '') +
              `</span>`
          )
          .join('');
        return (
          `<article class="glass-panel" style="padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">` +
            `<a href="${escapeHtml(p.href)}" style="width:52px;height:52px;flex:0 0 52px;border-radius:11px;overflow:hidden;display:block;">` +
              `<img src="${escapeHtml(p.avatar)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:52px;height:52px;object-fit:cover;" />` +
            `</a>` +
            `<div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:6px;">` +
              `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">` +
                `<div><a href="${escapeHtml(p.href)}" style="font-size:14px;font-weight:800;color:var(--ink);">${escapeHtml(p.nameCn || p.nameJp)}</a>` +
                (p.nameCn && p.nameJp !== p.nameCn ? ` <small style="font-size:11.5px;color:var(--muted);">${escapeHtml(p.nameJp)}</small>` : '') +
                `</div>` +
                (p.commentCount ? `<span style="font-family:var(--mono);font-size:11px;color:var(--muted);">💬 ${escapeHtml(p.commentCount)}</span>` : '') +
              `</div>` +
              `<div style="display:flex;flex-wrap:wrap;gap:6px;">${jobsHtml}</div>` +
            `</div>` +
          `</article>`
        );
      })
      .join('');
  }

  renderPersons();

  doc.getElementById('bgmPrsnSearchInput')?.addEventListener('input', (ev) => {
    query = ev.target.value;
    renderPersons();
  });

  mainEl.addEventListener('click', (ev) => {
    const jBtn = ev.target.closest('[data-prsn-job]');
    if (jBtn) {
      jobFilter = jBtn.getAttribute('data-prsn-job') || 'all';
      mainEl.querySelectorAll('[data-prsn-job]').forEach((b) => b.classList.toggle('active', b === jBtn));
      renderPersons();
    }
  });
}

/**
 * C3 · P09 条目漫友吐槽箱水合器 (/subject/{id}/comments)
 */
export function hydrateSubjectCommentsPage({ doc, route, activatePageStyles }) {
  const data = extractSubjectCommentsData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-comments.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let starFilter = 'all';
  let query = '';

  const secTabsHtml = data.secTabs
    .map(
      (st) =>
        `<a href="${escapeHtml(st.href)}" class="studio-pill-btn${st.active ? ' active' : ''}">${escapeHtml(st.label)}</a>`
    )
    .join('');

  const html =
    renderSubpageBanner(data.header, `吐槽箱 · 本页 ${data.comments.length} 条`) +
    `<div class="glass-panel" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div class="studio-pill-group">${secTabsHtml}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="studio-pill-group" id="bgmCmtStarPills">
            <button type="button" class="studio-pill-btn active" data-star-band="all">全部星级</button>
            <button type="button" class="studio-pill-btn" data-star-band="high">⭐ 8-10 高分</button>
            <button type="button" class="studio-pill-btn" data-star-band="mid">5-7 中评</button>
            <button type="button" class="studio-pill-btn" data-star-band="low">1-4 低分</button>
          </div>
          <input type="search" id="bgmCmtSearchInput" placeholder="搜索吐槽内容或用户…" style="padding:6px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12.5px;" />
        </div>
      </div>
    </div>
    <div id="bgmCmtStreamHost" class="tsukkomi-bubble-stream" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:14px;"></div>
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

  function renderCmtStream() {
    const host = doc.getElementById('bgmCmtStreamHost');
    if (!host) return;
    const q = query.trim().toLowerCase();
    const list = data.comments.filter((cm) => {
      if (starFilter === 'high' && cm.star < 8) return false;
      if (starFilter === 'mid' && (cm.star < 5 || cm.star > 7)) return false;
      if (starFilter === 'low' && (cm.star < 1 || cm.star > 4)) return false;
      if (q && !(cm.user + ' ' + cm.text).toLowerCase().includes(q)) return false;
      return true;
    });

    host.innerHTML = list
      .map(
        (cm) =>
          `<div class="tsukkomi-bubble-item">` +
            `<div class="tsukkomi-user-col"><a href="${escapeHtml(cm.userHref)}"><img class="tsukkomi-avatar" src="${escapeHtml(cm.avatar)}" alt="${escapeHtml(cm.user)}" referrerpolicy="no-referrer" loading="lazy" /></a></div>` +
            `<div class="tsukkomi-bubble-card">` +
              `<div class="tsukkomi-card-header">` +
                `<div class="tsukkomi-user-meta">` +
                  `<a class="tsukkomi-name" href="${escapeHtml(cm.userHref)}">${escapeHtml(cm.user)}</a>` +
                  (cm.star > 0
                    ? `<span class="tsukkomi-star-pill" title="${cm.star} / 10">${renderTenStarString(cm.star)} <b>${cm.star}</b></span>`
                    : '') +
                  (cm.statusText ? `<span class="tsukkomi-vibe-pill">${escapeHtml(cm.statusText)}</span>` : '') +
                `</div>` +
                `<span class="tsukkomi-time">${escapeHtml(cm.time)}</span>` +
              `</div>` +
              `<div class="tsukkomi-speech-text">${escapeHtml(cm.text)}</div>` +
            `</div>` +
          `</div>`
      )
      .join('');
  }

  renderCmtStream();

  doc.getElementById('bgmCmtSearchInput')?.addEventListener('input', (ev) => {
    query = ev.target.value;
    renderCmtStream();
  });

  mainEl.addEventListener('click', (ev) => {
    const sBtn = ev.target.closest('[data-star-band]');
    if (sBtn) {
      starFilter = sBtn.getAttribute('data-star-band') || 'all';
      mainEl.querySelectorAll('[data-star-band]').forEach((b) => b.classList.toggle('active', b === sBtn));
      renderCmtStream();
    }
  });
}

/**
 * C3 · P10 条目长评与讨论版水合器 (/subject/{id}/reviews, /subject/{id}/board)
 */
export function hydrateSubjectReviewsBoardPage({ doc, route, activatePageStyles }) {
  const data = extractSubjectReviewsBoardData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-reviews.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const sid = escapeHtml(data.header.id);
  const isBoard = data.mode === 'board';

  const bodyHtml = isBoard
    ? `<div class="glass-panel">
        <table class="topic-table">
          <thead>
            <tr><th>讨论主题</th><th>发起人</th><th>回复</th><th>最后回应</th></tr>
          </thead>
          <tbody>
            ${data.topics
              .map(
                (tp) =>
                  `<tr><td><a class="topic-title-link" href="${escapeHtml(tp.href)}">${escapeHtml(tp.title)}</a></td><td><a href="${escapeHtml(tp.userHref)}" style="color:var(--muted);">${escapeHtml(tp.user)}</a></td><td><span class="topic-replies-badge">${escapeHtml(tp.replies)}</span></td><td style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">${escapeHtml(tp.time)}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    : `<div class="review-cards-list">
        ${data.reviews
          .map(
            (rv) =>
              `<article class="glass-panel review-item-card"><div class="review-header"><a href="${escapeHtml(rv.userHref)}"><img class="review-author-avatar" src="${escapeHtml(rv.avatar)}" alt="${escapeHtml(rv.user)}" referrerpolicy="no-referrer" loading="lazy" /></a><div style="min-width:0;flex:1;"><a class="review-title" href="${escapeHtml(rv.href)}">${escapeHtml(rv.title)}</a><div class="review-meta"><a href="${escapeHtml(rv.userHref)}" style="color:var(--accent);font-weight:700;">${escapeHtml(rv.user)}</a>${rv.time ? `<span>· ${escapeHtml(rv.time)}</span>` : ''}<span>· ${escapeHtml(rv.replies)}</span></div></div></div>${rv.excerpt ? `<p class="review-excerpt">${escapeHtml(rv.excerpt)}</p>` : ''}</article>`
          )
          .join('')}
      </div>`;

  const html =
    renderSubpageBanner(data.header, isBoard ? '讨论版' : '评论长评') +
    `<div class="brv-header-card" style="margin-bottom:18px;">
      <div class="brv-header-top" style="border-bottom:0;padding-bottom:0;">
        <div class="studio-pill-group">
          <a href="/subject/${sid}/reviews" class="studio-pill-btn${!isBoard ? ' active' : ''}">✍️ 评论长评</a>
          <a href="/subject/${sid}/board" class="studio-pill-btn${isBoard ? ' active' : ''}">💬 讨论版</a>
        </div>
        <div class="brv-header-actions">
          <a href="/blog/create" class="action-pill-btn">✍️ 发表长评</a>
          <a href="/subject/${sid}/board/new" class="action-pill-btn">💬 添加新讨论</a>
        </div>
      </div>
    </div>
    ${bodyHtml}
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
 * C3 · P11 条目收藏统计与透视水合器 (/subject/{id}/stats)
 */
export function hydrateSubjectStatsPage({ doc, route, activatePageStyles }) {
  const data = extractSubjectStatsData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'bangumi-stats.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const blocksHtml = data.statBlocks
    .map(
      (b) =>
        `<section class="glass-panel" style="margin-bottom:18px;">
          <div class="panel-header-title"><h3><span class="panel-icon">📊</span> ${escapeHtml(b.title)}</h3></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
            ${b.items
              .map(
                (it) =>
                  `<div style="padding:14px 16px;border-radius:14px;background:var(--chip);border:1px solid var(--hairline);display:flex;flex-direction:column;gap:4px;"><span style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--accent);">${escapeHtml(it.num)}</span><span style="font-size:12px;color:var(--muted);">${escapeHtml(it.desc)}</span></div>`
              )
              .join('')}
          </div>
        </section>`
    )
    .join('');

  let chartCardsHtml = '';
  if (data.chartSets && typeof data.chartSets === 'object') {
    chartCardsHtml =
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:18px;">` +
      Object.entries(data.chartSets)
        .map(([key, cfg]) => {
          const title = cfg?.title || key;
          const desc = cfg?.desc || '';
          const series = Array.isArray(cfg?.series) ? cfg.series[0]?.data || {} : {};
          const entries = Object.entries(series);
          const maxVal = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
          const bars = entries
            .slice(0, 12)
            .map(([k, v]) => {
              const num = Number(v) || 0;
              const pct = Math.max(3, Math.round((num / maxVal) * 100));
              return `<div style="display:grid;grid-template-columns:72px minmax(0,1fr) 56px;align-items:center;gap:10px;font-size:12px;"><span style="color:var(--muted);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(k)}</span><div style="height:8px;border-radius:999px;background:var(--chip);overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--accent);border-radius:999px;"></div></div><span style="font-family:var(--mono);font-weight:700;">${num}</span></div>`;
            })
            .join('');
          return `<section class="glass-panel"><div class="panel-header-title"><h3><span class="panel-icon">📈</span> ${escapeHtml(title)}</h3><small style="color:var(--muted);">${escapeHtml(desc)}</small></div><div style="display:flex;flex-direction:column;gap:8px;">${bars}</div></section>`;
        })
        .join('') +
      `</div>`;
  }

  const html =
    renderSubpageBanner(data.header, '透视统计') +
    blocksHtml +
    chartCardsHtml;

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
 * C3 · P12 条目 Wiki 编辑与关联修订原地增强水合器 (/subject/{id}/edit*, /upload_img, /add_related/*)
 * 严格保留原站表单、textarea#subject_infobox、#tableEditor、input[type="file"] 与 ul#crtRelateSubjects 原位不动
 */
export function hydrateSubjectWikiPage({ doc, activatePageStyles }) {
  activatePageStyles(['bangumi-subject.css', 'bangumi-wiki.css', 'phase-b-hydrated.css']);
  doc.body?.classList.add('bwk-page-body');
  const mainWrapper = doc.querySelector('#wrapperNeue > .mainWrapper, #main');
  if (mainWrapper) {
    mainWrapper.setAttribute('data-bgm-hydrated-el', '1');
    mainWrapper.style.maxWidth = '1360px';
    mainWrapper.style.margin = '18px auto 64px';
    mainWrapper.style.padding = '22px 26px';
    mainWrapper.style.borderRadius = '22px';
    mainWrapper.style.background = 'color-mix(in srgb, var(--surface) 88%, transparent)';
    mainWrapper.style.border = '1px solid var(--hairline)';
  }
  doc.documentElement.dataset.bgmPageHydrated = '1';
}
