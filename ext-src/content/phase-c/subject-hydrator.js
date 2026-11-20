/**
 * Bangumi Chronicle · Phase C · P04 条目概览主页真站水合器 (subject-hydrator.js)
 * 完整支持：6 大媒介自适应 + 真实十星收藏盒提交 + 章节气泡打卡 + 10~1 评分直方图
 */

import {
  escapeHtml,
  updateEpisodeStatus,
  submitBatchProgress,
  submitSubjectInterest,
  removeSubjectInterest,
} from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from '../phase-b/dom-vault.js';
import { extractSubjectData } from './subject-extractor.js';

const STAR_DESCRIPTIONS = {
  1: '1★ 不忍直视',
  2: '2★ 很差',
  3: '3★ 差',
  4: '4★ 较差',
  5: '5★ 不过不失',
  6: '6★ 还行',
  7: '7★ 推荐',
  8: '8★ 力荐',
  9: '9★ 神作',
  10: '10★ 超神作',
};

function epStatusLabel(st) {
  const map = {
    watched: '看过',
    air: '已播未看',
    today: '今日放送',
    queue: '想看',
    drop: '抛弃',
    na: '未播',
  };
  return map[st] || '未播';
}

function epBtnClass(st) {
  if (st === 'watched') return 'ep-btn watched';
  if (st === 'today') return 'ep-btn today';
  if (st === 'queue') return 'ep-btn current';
  if (st === 'drop') return 'ep-btn dropped';
  return 'ep-btn';
}

function renderTenStarString(score) {
  const n = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
  if (!n) return '';
  return `<span class="stars-filled">${'★'.repeat(n)}</span><span class="stars-empty">${'☆'.repeat(10 - n)}</span>`;
}

export function hydrateSubjectPage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractSubjectData(doc, route);
  activatePageStyles(['bangumi-subject.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const verb = data.verb || '看';
  const noun = data.noun || '这部作品';
  const cat = data.category;

  const state = {
    interestStatus: data.interest.currentStatus || '3',
    ratingScore: data.interest.currentRating || 0,
    relFilter: 'all',
    cmtFilter: 'all',
    activeDisc: 0,
    activeEp: null,
  };

  // 1. 顶栏导航 Tabs
  const navTabsHtml = data.navTabs
    .map(
      (tb) =>
        `<li class="subject-nav-tab-item${tb.active ? ' active' : ''}"><a href="${escapeHtml(tb.href)}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  // 2. 左栏：封面 + Infobox + 谁看这部作品 + 推荐目录
  const coverSpecialCls =
    cat === 'music' ? ' is-music-cover' : cat === 'book_vol' ? ' is-book-volume-cover' : '';
  const coverBlockHtml = data.cover
    ? `<div class="subject-cover-wrapper${coverSpecialCls}" id="bgmSubjCoverWrap">
        <div class="vinyl-disc-deco" aria-hidden="true"></div>
        <img class="subject-cover-img" src="${escapeHtml(data.cover)}" alt="${escapeHtml(data.titleCn || data.titleJp)}" referrerpolicy="no-referrer" />
        <a href="${escapeHtml(data.coverFull || data.cover)}" target="_blank" rel="noopener" class="cover-overlay-zoom">🔍 高清原图</a>
      </div>`
    : '';

  const foldedCount = data.infobox.filter((r) => r.folded).length;
  const infoboxRowsHtml = data.infobox
    .map(
      (r) =>
        `<li class="infobox-row${r.folded ? ' infobox-folded' : ''}"><span class="infobox-key">${escapeHtml(r.key)}</span><span class="infobox-val">${r.valHtml}</span></li>`
    )
    .join('');

  const col = data.collection;
  const totalCol = Math.max(1, col.wish + col.collect + col.doing + col.on_hold + col.dropped);
  const pct = (n) => ((n / totalCol) * 100).toFixed(1) + '%';

  const collectUsersHtml = col.users.length
    ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:10px;border-top:1px dashed var(--hairline);">` +
        col.users
          .slice(0, 6)
          .map(
            (u) =>
              `<a href="${escapeHtml(u.href)}" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink);text-decoration:none;">` +
                `<img src="${escapeHtml(u.avatar)}" alt="" referrerpolicy="no-referrer" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;" />` +
                `<div style="min-width:0;flex:1;"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.name)}</div><div style="font-size:10.5px;color:var(--muted);">${escapeHtml(u.meta)}</div></div>` +
              `</a>`
          )
          .join('') +
      `</div>`
    : '';

  const indexPanelHtml = data.indexes.length
    ? `<div class="glass-panel" id="bgmSubjPanelIndex">
        <div class="panel-header-title">
          <h3><span class="panel-icon">📁</span> 推荐本条目的目录</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;font-size:12px;">
          ${data.indexes
            .map(
              (ix) =>
                `<div style="display:flex;align-items:center;gap:8px;"><img src="${escapeHtml(ix.avatar)}" alt="" referrerpolicy="no-referrer" style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;" /><div style="min-width:0;flex:1;"><a href="${escapeHtml(ix.href)}" style="color:var(--ink);font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(ix.title)}</a>${ix.author ? `<small style="color:var(--muted);">by <a href="${escapeHtml(ix.authorHref)}" style="color:var(--accent);">${escapeHtml(ix.author)}</a></small>` : ''}</div></div>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // 3. 中栏第一工作台：章节格子 / 音乐曲目 / 书籍进度
  const hasWorkbench = data.episodes.length > 0 || data.discs.length > 0 || Boolean(data.progressForm);
  const workbenchPanelHtml = hasWorkbench
    ? `<div class="glass-panel subject-prg-card" id="bgmSubjPrgCard">
        <div class="prg-header-bar" style="flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:800;color:var(--ink);">${cat === 'music' ? '💿 专辑曲目列表' : cat.startsWith('book') ? '📚 阅读进度管理' : '🎬 章节进度打卡'}</span>
            <div class="prg-progress-stats" id="bgmPrgCountDisplay"></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${
              data.progressForm
                ? `<form class="prg-batch-form" id="bgmSubjBatchForm" action="${escapeHtml(data.progressForm.action)}" method="post" style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:var(--chip);font-size:11.5px;">` +
                    `<input type="hidden" name="referer" value="subject" />` +
                    `<label>看到 <input type="number" name="watchedeps" value="${escapeHtml(data.progressForm.watchedEps)}" min="0" style="width:48px;padding:2px 5px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);" /> 话</label>` +
                    (data.progressForm.watchedVols !== null
                      ? `<label><input type="number" name="watched_vols" value="${escapeHtml(data.progressForm.watchedVols)}" min="0" style="width:44px;padding:2px 5px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);" /> 卷</label>`
                      : '') +
                    `<button type="submit" class="action-pill-btn" style="padding:3px 10px;font-size:11px;background:var(--accent);color:#fff;border:0;">更新</button>` +
                  `</form>`
                : ''
            }
            ${data.episodes.length > 0 ? `<a href="/subject/${escapeHtml(data.id)}/ep" class="action-pill-btn" style="padding:4px 10px;font-size:11px;">📋 全部章节 »</a>` : ''}
          </div>
        </div>
        <div id="bgmSubjWorkbenchBody"></div>
      </div>`
    : '';

  // 3.5 单行本矩阵
  const tankobonPanelHtml = data.tankobon.length
    ? `<div class="glass-panel tankobon-volumes-panel" id="bgmTankobonPanel">
        <div class="panel-header-title">
          <div style="display:flex;align-items:center;gap:8px;">
            <h3><span class="panel-icon">📚</span> 单行本</h3>
            <span class="panel-sub-count">共 ${data.tankobon.length} 卷</span>
          </div>
        </div>
        <div class="tankobon-grid">
          ${data.tankobon
            .map(
              (v, idx) =>
                `<a class="tankobon-card" href="${escapeHtml(v.href)}" title="${escapeHtml(v.title)}">` +
                  `<div class="tankobon-cover-box">` +
                    (v.cover
                      ? `<img src="${escapeHtml(v.cover)}" alt="${escapeHtml(v.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                      : `<div class="cover-wall-no-icon"><span>📖</span></div>`) +
                    `<span class="tankobon-vol-badge">Vol.${idx + 1}</span>` +
                  `</div>` +
                  `<div class="tankobon-card-title">${escapeHtml(v.title)}</div>` +
                `</a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // 4. 故事简介
  const summaryPanelHtml = data.summaryParagraphs.length
    ? `<div class="glass-panel">
        <div class="panel-header-title">
          <h3><span class="panel-icon">📖</span> 内容简介</h3>
        </div>
        <div class="subject-summary-text expanded" id="bgmSummaryText">
          ${data.summaryParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        </div>
      </div>`
    : '';

  // 5. 标签词云
  const tagsPanelHtml = data.tags.length
    ? `<div class="glass-panel">
        <div class="panel-header-title">
          <h3><span class="panel-icon">🏷️</span> 大家标注的标签</h3>
        </div>
        <div class="subject-tags-cloud">
          ${data.tags
            .map(
              (t, idx) =>
                `<a class="tag-badge${idx < 4 ? ' tier-high' : ''}" href="${escapeHtml(t.href)}"><span>${escapeHtml(t.name)}</span>${t.count ? `<span class="tag-count">${t.count}</span>` : ''}</a>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // 6. 角色与声优 (紧凑 3 列网格，默认展示前 9 名 = 3 行，支持一键展开)
  const charsPanelHtml = data.characters.length
    ? `<div class="glass-panel" id="bgmCharacterSection">
        <div class="panel-header-title">
          <h3><span class="panel-icon">🎭</span> 角色介绍</h3>
          <a href="/subject/${escapeHtml(data.id)}/characters" class="header-link">更多角色 »</a>
        </div>
        <div class="character-grid" id="bgmCharGrid">
          ${data.characters
            .map((ch, idx) => {
              const primaryActor = ch.actors[0];
              const cvLine = primaryActor
                ? `<span>${escapeHtml(primaryActor.label)}: <a href="${escapeHtml(primaryActor.href)}" style="color:inherit;font-weight:700;">${escapeHtml(primaryActor.name)}</a></span>`
                : '';
              const foldedCls = idx >= 9 ? ' is-folded-char' : '';
              return (
                `<div class="char-card${foldedCls}">` +
                  `<a class="char-ava-link" href="${escapeHtml(ch.href)}"><img class="char-avatar" src="${escapeHtml(ch.avatar)}" alt="${escapeHtml(ch.nameCn || ch.nameJp)}" referrerpolicy="no-referrer" loading="lazy" /></a>` +
                  `<div class="char-info">` +
                    `<div class="char-header-line">` +
                      `<a class="char-name" href="${escapeHtml(ch.href)}">${escapeHtml(ch.nameCn || ch.nameJp)}</a>` +
                      `<span class="char-role-badge${ch.role === '主角' ? ' role-lead' : ''}">${escapeHtml(ch.role)}</span>` +
                    `</div>` +
                    (ch.nameCn && ch.nameJp && ch.nameCn !== ch.nameJp
                      ? `<div class="char-name-cn">${escapeHtml(ch.nameJp)}</div>`
                      : '') +
                    (cvLine ? `<div class="char-cv-line">${cvLine}</div>` : '') +
                  `</div>` +
                `</div>`
              );
            })
            .join('')}
        </div>
        ${
          data.characters.length > 9
            ? `<button type="button" class="infobox-toggle-btn" id="bgmCharToggleBtn" style="margin-top:10px;">展开其余 ${data.characters.length - 9} 名角色 (共 ${data.characters.length} 名) ▾</button>`
            : ''
        }
      </div>`
    : '';

  // 7. 关联条目
  const relationsPanelHtml = data.relations.length
    ? `<div class="glass-panel" id="bgmRelationsPanel">
        <div class="panel-header-title" style="flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <h3><span class="panel-icon">🔗</span> 关联条目</h3>
            <span class="panel-sub-count" id="bgmRelTotalCount">${data.relations.length} 部</span>
          </div>
          <div class="panel-header-actions">
            <div class="relation-filter-tabs" id="bgmRelationFilterTabs">
              <button type="button" class="rel-filter-btn active" data-rel-cat="all">全部</button>
              <button type="button" class="rel-filter-btn" data-rel-cat="anime">🎬 动画/衍生</button>
              <button type="button" class="rel-filter-btn" data-rel-cat="manga">📖 书籍/原作</button>
              <button type="button" class="rel-filter-btn" data-rel-cat="music">🎵 音乐/OST</button>
            </div>
            <a href="/subject/${escapeHtml(data.id)}/relations" class="header-link">更多关联 »</a>
          </div>
        </div>
        <div class="relations-grid" id="bgmRelationsGrid"></div>
        <button type="button" class="infobox-toggle-btn" id="bgmRelToggleBtn" hidden style="margin-top:10px;"></button>
      </div>`
    : '';

  // 8. 评论长评
  const reviewsPanelHtml = data.reviews.length
    ? `<div class="glass-panel">
        <div class="panel-header-title">
          <h3><span class="panel-icon">✍️</span> 评论</h3>
          <a href="/subject/${escapeHtml(data.id)}/reviews" class="header-link">更多评论 »</a>
        </div>
        <div class="review-cards-list">
          ${data.reviews
            .map(
              (rv) =>
                `<article class="review-item-card">` +
                  `<div class="review-header">` +
                    `<a href="${escapeHtml(rv.userHref)}"><img class="review-author-avatar" src="${escapeHtml(rv.avatar)}" alt="${escapeHtml(rv.user)}" referrerpolicy="no-referrer" loading="lazy" /></a>` +
                    `<div style="min-width:0;flex:1;">` +
                      `<a class="review-title" href="${escapeHtml(rv.href)}">${escapeHtml(rv.title)}</a>` +
                      `<div class="review-meta"><a href="${escapeHtml(rv.userHref)}" style="color:var(--accent);font-weight:600;">${escapeHtml(rv.user)}</a>${rv.time ? `<span>· ${escapeHtml(rv.time)}</span>` : ''}${rv.replies ? `<span>· ${escapeHtml(rv.replies)}</span>` : ''}</div>` +
                    `</div>` +
                  `</div>` +
                  (rv.excerpt ? `<p class="review-excerpt">${escapeHtml(rv.excerpt)}</p>` : '') +
                `</article>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // 9. 讨论版
  const topicsPanelHtml = data.topics.length
    ? `<div class="glass-panel">
        <div class="panel-header-title">
          <h3><span class="panel-icon">💬</span> 讨论版</h3>
          <a href="/subject/${escapeHtml(data.id)}/board" class="header-link">更多讨论 »</a>
        </div>
        <table class="topic-table">
          <thead>
            <tr>
              <th>讨论主题</th>
              <th>发起人</th>
              <th>回复</th>
              <th>最后回应</th>
            </tr>
          </thead>
          <tbody>
            ${data.topics
              .map(
                (tp) =>
                  `<tr>` +
                    `<td><a class="topic-title-link" href="${escapeHtml(tp.href)}">${escapeHtml(tp.title)}</a></td>` +
                    `<td><a href="${escapeHtml(tp.userHref)}" style="color:var(--muted);">${escapeHtml(tp.user)}</a></td>` +
                    `<td><span class="topic-replies-badge">${escapeHtml(tp.replies)}</span></td>` +
                    `<td style="font-family:var(--mono);font-size:11.5px;color:var(--muted);">${escapeHtml(tp.time)}</td>` +
                  `</tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    : '';

  // 10. 吐槽箱
  const commentsPanelHtml = `
    <div class="glass-panel" id="bgmCommentPanel">
      <div class="panel-header-title" style="flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3><span class="panel-icon">⚡</span> 吐槽箱</h3>
        </div>
        <div class="panel-header-actions">
          <div class="tsukkomi-channel-pills" id="bgmTsukkomiFilterPills">
            <button type="button" class="channel-pill active" data-cmt-filter="all">全部 (${data.comments.length})</button>
            <button type="button" class="channel-pill" data-cmt-filter="high">⭐ 8+高分</button>
          </div>
          <a href="/subject/${escapeHtml(data.id)}/comments" class="header-link">更多吐槽 »</a>
        </div>
      </div>
      <div class="tsukkomi-bubble-stream" id="bgmCommentStream"></div>
    </div>`;

  // 11. 右栏：收藏盒 + 全站评分透视
  const popTagsHtml = data.interest.popularTags
    .map(
      (tg) =>
        `<button type="button" class="quick-tag-chip" data-bgm-add-tag="${escapeHtml(tg)}">${escapeHtml(tg)}</button>`
    )
    .join('');

  const scoreStr = (data.rating.score || 0).toFixed(1);
  const [scoreInt, scoreDec] = scoreStr.split('.');

  const stageHtml = `
    <section class="subject-banner" id="bgmSubjBanner">
      <div class="subject-banner-backdrop" style="background-image:url('${escapeHtml(data.cover)}')"></div>
      <div class="subject-banner-inner">
        <div class="subject-header-meta">
          <span class="subject-type-badge">${escapeHtml(data.typeLabel)}</span>
          ${data.rating.rank ? `<span class="subject-rank-badge">Rank ${escapeHtml(data.rating.rank)}</span>` : ''}
        </div>
        <div class="subject-title-row">
          <div class="subject-title-group">
            <h1>
              <span class="title-jp">${escapeHtml(data.titleJp)}</span>
              ${data.titleCn && data.titleCn !== data.titleJp ? `<span class="title-cn">${escapeHtml(data.titleCn)}</span>` : ''}
            </h1>
          </div>
          <div class="subject-header-actions">
            <button type="button" class="action-pill-btn" id="bgmCopySubjUrlBtn">🔗 分享链接</button>
            <a href="/subject/${escapeHtml(data.id)}/edit" class="action-pill-btn">✏️ 维基修订</a>
          </div>
        </div>
        <ul class="subject-nav-tabs">${navTabsHtml}</ul>
      </div>
    </section>

    <div class="subject-grid-container" id="bgmSubjGrid">
      <aside class="column-subject-left" id="bgmSubjColLeft">
        ${coverBlockHtml}
        <div class="glass-panel" id="bgmSubjInfoboxPanel">
          <div class="panel-header-title">
            <h3><span class="panel-icon">📋</span> 作品属性</h3>
            <a href="/subject/${escapeHtml(data.id)}/edit_detail" class="header-link">+ 完善维基</a>
          </div>
          <ul class="infobox-list" id="bgmInfoboxList">${infoboxRowsHtml}</ul>
          ${
            foldedCount > 0
              ? `<button type="button" class="infobox-toggle-btn" id="bgmInfoboxToggleBtn">展开全部属性 (共 ${data.infobox.length} 项) ▾</button>`
              : ''
          }
        </div>

        <div class="glass-panel" id="bgmSubjCollectStatsPanel">
          <div class="panel-header-title">
            <h3><span class="panel-icon">👥</span> 谁${escapeHtml(verb)}${escapeHtml(noun)}?</h3>
            <a href="/subject/${escapeHtml(data.id)}/collections" class="header-link">全部 »</a>
          </div>
          <div class="collect-segmented-bar">
            <div class="collect-seg seg-wish" style="width:${pct(col.wish)}" title="想${escapeHtml(verb)}"></div>
            <div class="collect-seg seg-collect" style="width:${pct(col.collect)}" title="${escapeHtml(verb)}过"></div>
            <div class="collect-seg seg-do" style="width:${pct(col.doing)}" title="在${escapeHtml(verb)}"></div>
            <div class="collect-seg seg-hold" style="width:${pct(col.on_hold)}" title="搁置"></div>
            <div class="collect-seg seg-drop" style="width:${pct(col.dropped)}" title="抛弃"></div>
          </div>
          <div class="collect-stat-grid">
            <div class="collect-stat-item"><a href="/subject/${escapeHtml(data.id)}/wishes"><span class="collect-stat-dot" style="background:#3b82f6;"></span><span>${col.wish} 人想${escapeHtml(verb)}</span></a></div>
            <div class="collect-stat-item"><a href="/subject/${escapeHtml(data.id)}/collections"><span class="collect-stat-dot" style="background:#10b981;"></span><span>${col.collect} 人${escapeHtml(verb)}过</span></a></div>
            <div class="collect-stat-item"><a href="/subject/${escapeHtml(data.id)}/doings"><span class="collect-stat-dot" style="background:#d9536f;"></span><span>${col.doing} 人在${escapeHtml(verb)}</span></a></div>
            <div class="collect-stat-item"><a href="/subject/${escapeHtml(data.id)}/on_hold"><span class="collect-stat-dot" style="background:#f59e0b;"></span><span>${col.on_hold} 人搁置</span></a></div>
            <div class="collect-stat-item" style="grid-column:1 / -1;"><a href="/subject/${escapeHtml(data.id)}/dropped"><span class="collect-stat-dot" style="background:#9ca3af;"></span><span>${col.dropped} 人抛弃</span></a></div>
          </div>
          ${collectUsersHtml}
        </div>

        ${indexPanelHtml}
      </aside>

      <section class="column-subject-center" id="bgmSubjColCenter">
        ${workbenchPanelHtml}
        ${tankobonPanelHtml}
        ${summaryPanelHtml}
        ${tagsPanelHtml}
        ${charsPanelHtml}
        ${relationsPanelHtml}
        ${reviewsPanelHtml}
        ${topicsPanelHtml}
        ${commentsPanelHtml}
      </section>

      <aside class="column-subject-right" id="bgmSubjColRight">
        <div class="glass-panel interest-box-card" id="bgmInterestPanel">
          <div class="panel-header-title">
            <h3><span class="panel-icon">💖</span> 我的收藏盒</h3>
            <span style="font-size:11px;color:var(--accent);font-weight:700;" id="bgmInterestStateLabel">${escapeHtml(data.interest.statusLabel)}</span>
          </div>

          <div class="interest-status-selector" id="bgmInterestStatusRow">
            <button type="button" class="interest-btn${state.interestStatus === '1' ? ' active' : ''}" data-status="1">想${escapeHtml(verb)}</button>
            <button type="button" class="interest-btn${state.interestStatus === '2' ? ' active' : ''}" data-status="2">${escapeHtml(verb)}过</button>
            <button type="button" class="interest-btn${state.interestStatus === '3' ? ' active' : ''}" data-status="3">在${escapeHtml(verb)}</button>
            <button type="button" class="interest-btn${state.interestStatus === '4' ? ' active' : ''}" data-status="4">搁置</button>
            <button type="button" class="interest-btn${state.interestStatus === '5' ? ' active' : ''}" data-status="5">抛弃</button>
          </div>

          <div class="star-rating-box" id="bgmStarRatingBox">
            <div class="star-rating-label-row">
              <span class="rating-prompt-title">十星评价:</span>
              <span class="rating-hover-hint" id="bgmRatingHint">${state.ratingScore ? STAR_DESCRIPTIONS[state.ratingScore] : '未评分'}</span>
            </div>
            <div class="stars-interactive-row" id="bgmStarsRow">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                .map(
                  (n) =>
                    `<span class="star-unit${n <= state.ratingScore ? ' filled' : ''}" data-score="${n}" title="${STAR_DESCRIPTIONS[n]}">★</span>`
                )
                .join('')}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
            <input type="text" id="bgmInterestTags" value="${escapeHtml(data.interest.currentTags)}" placeholder="标签（空格分隔）" style="width:100%;padding:7px 11px;border-radius:9px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12px;" />
            ${popTagsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${popTagsHtml}</div>` : ''}
            <textarea id="bgmInterestComment" rows="2" placeholder="写下你的简评或吐槽（380字内）…" style="width:100%;padding:8px 11px;border-radius:9px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12px;resize:vertical;">${escapeHtml(data.interest.currentComment)}</textarea>
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);cursor:pointer;">
              <input type="checkbox" id="bgmInterestPrivacy"${data.interest.privacy ? ' checked' : ''} /> 仅自己可见
            </label>
          </div>

          <div style="display:flex;gap:8px;">
            <button type="button" class="action-pill-btn" id="bgmSaveInterestBtn" style="flex:1;justify-content:center;padding:9px;background:var(--accent);color:#fff;border:0;">💾 保存收藏</button>
            ${
              data.interest.collected
                ? `<button type="button" class="action-pill-btn" id="bgmRemoveInterestBtn" style="color:#ef4444;">抹除</button>`
                : ''
            }
          </div>
        </div>

        <div class="glass-panel" id="bgmRatingChartPanel">
          <div class="panel-header-title">
            <h3><span class="panel-icon">📊</span> 全站评分透视</h3>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="chart-view-toggle-btns" id="bgmChartViewToggle">
                <button type="button" class="chart-toggle-btn active" data-chart-mode="histogram">📊 直方图</button>
                <button type="button" class="chart-toggle-btn" data-chart-mode="list">☰ 明细</button>
              </div>
              ${data.rating.rank ? `<span class="subject-rank-badge">${escapeHtml(data.rating.rank)}</span>` : ''}
            </div>
          </div>

          <div class="chart-hero-score">
            <div class="score-medal-box">
              <span class="score-medal-kicker">BGM SCORE</span>
              <span class="score-big-num"><span class="score-int">${escapeHtml(scoreInt)}</span><span class="score-dot">.</span><span class="score-dec">${escapeHtml(scoreDec)}</span></span>
            </div>
            <div class="score-sub-meta">
              <div class="score-verdict-row">
                <span class="score-desc-badge">${escapeHtml(data.rating.desc)}</span>
                <span class="score-stars-visual" title="${scoreStr} / 10">${renderTenStarString(data.rating.score)}</span>
              </div>
              <span class="score-total-votes">由 <strong>${data.rating.votes.toLocaleString()}</strong> 人评价</span>
            </div>
          </div>

          <div class="chart-inspect-banner" id="bgmSubjChartInspect">
            <span class="inspect-star-badge" id="bgmSubjInspectStar">评分分布</span>
            <span class="inspect-detail-text" id="bgmSubjInspectDetail"></span>
          </div>

          <div class="bangumi-histogram-wrapper" id="bgmSubjHistWrapper">
            <div class="histogram-bars-container" id="bgmSubjHistBars"></div>
            <div class="histogram-baseline"></div>
            <div class="histogram-labels-row" id="bgmSubjHistLabels"></div>
          </div>

          <div class="chart-bars-list" id="bgmSubjHorizBars" style="display:none;"></div>

          <div class="chart-stats-footer">
            <span>评分标准差: <strong>${escapeHtml(data.rating.stdDev)}</strong></span>
            <a href="/subject/${escapeHtml(data.id)}/stats" class="header-link" style="margin-left:auto;">深度透视 »</a>
          </div>
        </div>
      </aside>
    </div>

    <div class="frosted-ep-popover" id="epPopover" hidden role="dialog" aria-label="章节进度操作浮窗">
      <div class="ep-pop-head">
        <div>
          <span class="ep-pop-num" id="epPopCode">EP</span>
          <h4 class="ep-pop-title" id="epPopTitle"></h4>
        </div>
        <button type="button" class="ep-pop-close" id="btnCloseEpPopover" aria-label="关闭">✕</button>
      </div>
      <p class="ep-pop-meta" id="epPopMeta"></p>
      <div class="ep-status-pills" id="epPopActions">
        <button type="button" class="ep-act-pill act-watched" data-ep-action="watched">✓ 看过</button>
        <button type="button" class="ep-act-pill act-till" data-ep-action="till">⇥ 看到</button>
        <button type="button" class="ep-act-pill act-queue" data-ep-action="queue">♡ 想看</button>
        <button type="button" class="ep-act-pill act-drop" data-ep-action="drop">✕ 抛弃</button>
        <button type="button" class="ep-act-pill act-remove" data-ep-action="remove">↺ 撤消</button>
      </div>
      <div class="ep-pop-foot">
        <span class="ep-cur-badge" id="epPopCurrentStatus"></span>
        <a href="#" class="ep-pop-discuss" id="epPopDiscussLink">单集讨论 »</a>
      </div>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html: stageHtml,
  });
  mainEl.style.maxWidth = '1420px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';

  // --- 动态渲染工作台（章节格子 / 音乐曲目） ---
  function renderWorkbench() {
    const bodyEl = doc.getElementById('bgmSubjWorkbenchBody');
    const countEl = doc.getElementById('bgmPrgCountDisplay');
    if (!bodyEl) return;

    if (data.episodes.length > 0) {
      const watchedCnt = data.episodes.filter((e) => e.status === 'watched').length;
      if (countEl) {
        countEl.innerHTML = `已${escapeHtml(verb)} <span class="accent">${watchedCnt}</span> / ${data.episodes.length} 话`;
      }
      const groups = [];
      for (const ep of data.episodes) {
        let g = groups.find((x) => x.name === ep.group);
        if (!g) {
          g = { name: ep.group, list: [] };
          groups.push(g);
        }
        g.list.push(ep);
      }
      bodyEl.innerHTML = groups
        .map(
          (g) =>
            (groups.length > 1 || g.name !== '本篇'
              ? `<div style="font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--muted);margin:10px 0 6px;">${escapeHtml(g.name)}</div>`
              : '') +
            `<div class="ep-grid-container">` +
              g.list
                .map(
                  (ep) =>
                    `<button type="button" class="${epBtnClass(ep.status)}" data-bgm-ep-btn="${escapeHtml(ep.epId)}" title="${escapeHtml(ep.rawTitle)}${ep.cnTitle ? ' / ' + escapeHtml(ep.cnTitle) : ''}">${escapeHtml(ep.num)}</button>`
                )
                .join('') +
            `</div>`
        )
        .join('');
    } else if (data.discs.length > 0) {
      const totalTracks = data.discs.reduce((acc, d) => acc + d.tracks.length, 0);
      if (countEl) {
        countEl.innerHTML = `${data.discs.length} Disc · 共 <span class="accent">${totalTracks}</span> 曲`;
      }
      const curDisc = data.discs[state.activeDisc] || data.discs[0];
      bodyEl.innerHTML = `
        <div class="music-tracklist-workbench">
          ${
            data.discs.length > 1
              ? `<div class="disc-tabs-row">` +
                  data.discs
                    .map(
                      (d, idx) =>
                        `<button type="button" class="disc-tab-btn${idx === state.activeDisc ? ' active' : ''}" data-disc-idx="${idx}">💿 ${escapeHtml(d.name)}</button>`
                    )
                    .join('') +
                `</div>`
              : ''
          }
          <div class="music-track-list">
            ${curDisc.tracks
              .map(
                (tr) =>
                  `<a class="music-track-row" href="${escapeHtml(tr.href)}"><span class="track-idx-num">${escapeHtml(tr.num)}</span><span class="track-title-main">${escapeHtml(tr.title)}</span></a>`
              )
              .join('')}
          </div>
        </div>`;
    } else if (data.progressForm && countEl) {
      countEl.textContent = data.progressForm.progressText || '';
    }
  }

  // --- 动态渲染关联条目网格 ---
  function renderRelations() {
    const gridEl = doc.getElementById('bgmRelationsGrid');
    const cntEl = doc.getElementById('bgmRelTotalCount');
    if (!gridEl) return;
    const filtered =
      state.relFilter === 'all'
        ? data.relations
        : data.relations.filter((r) => r.catKey === state.relFilter);
    if (cntEl) cntEl.textContent = `${filtered.length} 部`;
    const relBtn = doc.getElementById('bgmRelToggleBtn');
    const isExp = gridEl.classList.contains('is-expanded');
    if (relBtn) {
      if (filtered.length > 10) {
        relBtn.hidden = false;
        relBtn.textContent = isExp
          ? '收起部分关联条目 ▴'
          : `展开其余 ${filtered.length - 10} 部关联条目 (共 ${filtered.length} 部) ▾`;
      } else {
        relBtn.hidden = true;
      }
    }
    gridEl.innerHTML = filtered.length
      ? filtered
          .map((rel, idx) => {
            const tagCls =
              rel.catKey === 'manga'
                ? 'tag-cat-manga'
                : rel.catKey === 'music'
                  ? 'tag-cat-ost'
                  : 'tag-cat-anime';
            const foldCls = idx >= 10 ? ' is-folded-rel' : '';
            return (
              `<a class="relation-card${foldCls}" href="${escapeHtml(rel.href)}" title="${escapeHtml(rel.cnTitle || rel.title)}">` +
                `<div class="relation-card-cover-wrap">` +
                  (rel.cover
                    ? `<img src="${escapeHtml(rel.cover)}" alt="${escapeHtml(rel.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                    : `<div class="cover-wall-no-icon"><span>🔗</span><small>${escapeHtml(rel.relType)}</small></div>`) +
                  `<span class="relation-card-tag ${tagCls}">${escapeHtml(rel.relType)}</span>` +
                `</div>` +
                `<div class="relation-card-info">` +
                  `<div class="relation-card-title">${escapeHtml(rel.cnTitle || rel.title)}</div>` +
                  (rel.cnTitle && rel.title !== rel.cnTitle
                    ? `<div class="relation-card-subtitle">${escapeHtml(rel.title)}</div>`
                    : '') +
                `</div>` +
              `</a>`
            );
          })
          .join('')
      : '<div style="padding:16px;font-size:12px;color:var(--muted);">该分类下暂无关联条目</div>';
  }

  // --- 动态渲染吐槽箱气泡流 ---
  function renderComments() {
    const streamEl = doc.getElementById('bgmCommentStream');
    if (!streamEl) return;
    const list =
      state.cmtFilter === 'high'
        ? data.comments.filter((c) => c.star >= 8)
        : data.comments;
    streamEl.innerHTML = list.length
      ? list
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
          .join('')
      : '<div style="padding:20px;text-align:center;font-size:12.5px;color:var(--muted);">暂无符合条件的吐槽</div>';
  }

  // --- 渲染 10~1 全站评分直方图 & 明细 ---
  let peakBarInfo = { star: '评分分布', detail: '' };
  function renderHistogram() {
    const barsEl = doc.getElementById('bgmSubjHistBars');
    const labelsEl = doc.getElementById('bgmSubjHistLabels');
    const horizEl = doc.getElementById('bgmSubjHorizBars');
    const starBadge = doc.getElementById('bgmSubjInspectStar');
    const detailText = doc.getElementById('bgmSubjInspectDetail');
    if (!barsEl || !labelsEl) return;

    const byStar = new Map(data.rating.bars.map((b) => [b.star, b]));
    const ordered = [];
    for (let s = 10; s >= 1; s--) {
      ordered.push(byStar.get(s) || { star: s, count: 0, percent: 0, heightPct: 3 });
    }
    let peak = ordered[0];
    ordered.forEach((b) => {
      if (b.count > (peak?.count || 0)) peak = b;
    });
    if (peak) {
      peakBarInfo = {
        star: `峰值 ${peak.star}★`,
        detail: `${peak.count.toLocaleString()} 人 (${peak.percent.toFixed(1)}%)`,
      };
    }
    if (starBadge && detailText) {
      starBadge.textContent = peakBarInfo.star;
      detailText.textContent = peakBarInfo.detail;
    }

    barsEl.innerHTML = ordered
      .map((b) => {
        const isPeak = peak && b.star === peak.star && b.count > 0 ? ' is-peak' : '';
        return (
          `<div class="hist-bar-col${isPeak}" data-star="${b.star}" data-count="${b.count}" data-pct="${b.percent.toFixed(1)}">` +
            `<div class="hist-col-tooltip">${b.star}★: ${b.count.toLocaleString()}人 (${b.percent.toFixed(1)}%)</div>` +
            `<div class="hist-bar-track"><div class="hist-bar-fill" style="height:${b.heightPct}%"></div></div>` +
          `</div>`
        );
      })
      .join('');

    labelsEl.innerHTML = ordered
      .map(
        (b) =>
          `<span class="hist-star-label${peak && b.star === peak.star ? ' active' : ''}" data-star="${b.star}">${b.star}</span>`
      )
      .join('');

    if (horizEl) {
      horizEl.innerHTML = ordered
        .map(
          (b) =>
            `<div class="chart-bar-row">` +
              `<span class="bar-star-num">${b.star}</span>` +
              `<div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, b.heightPct)}%"></div></div>` +
              `<span class="bar-pct-label">${b.percent.toFixed(1)}%</span>` +
              `<span class="bar-votes-count">(${b.count})</span>` +
            `</div>`
        )
        .join('');
    }
  }

  function openEpPopover(btnEl, epId) {
    const ep = data.episodes.find((e) => e.epId === epId);
    const pop = doc.getElementById('epPopover');
    if (!ep || !pop) return;
    state.activeEp = ep;
    doc.getElementById('epPopCode').textContent = `EP.${ep.num}`;
    doc.getElementById('epPopTitle').textContent = ep.cnTitle ? `${ep.rawTitle} / ${ep.cnTitle}` : ep.rawTitle;
    const metaParts = [ep.airDate ? `首播: ${ep.airDate}` : '', ep.duration ? `时长: ${ep.duration}` : ''].filter(Boolean);
    doc.getElementById('epPopMeta').textContent = metaParts.join(' · ') || data.titleJp;
    doc.getElementById('epPopCurrentStatus').textContent = `当前：${epStatusLabel(ep.status)}`;
    const discLink = doc.getElementById('epPopDiscussLink');
    discLink.href = ep.discussHref;
    discLink.textContent = `单集讨论 ${ep.discussCount} »`;

    const r = btnEl.getBoundingClientRect();
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 360)) + 'px';
    pop.style.top = Math.min(r.bottom + 8, window.innerHeight - 240) + 'px';
    pop.hidden = false;
  }

  renderWorkbench();
  renderRelations();
  renderComments();
  renderHistogram();

  // --- 事件绑定 ---
  mainEl.addEventListener('pointerover', (ev) => {
    const col = ev.target.closest?.('.hist-bar-col');
    if (col) {
      const s = col.getAttribute('data-star');
      const c = Number(col.getAttribute('data-count') || 0).toLocaleString();
      const p = col.getAttribute('data-pct');
      doc.getElementById('bgmSubjInspectStar').textContent = `${s}★ 评分`;
      doc.getElementById('bgmSubjInspectDetail').textContent = `${c} 人 (${p}%)`;
      return;
    }
    const starUnit = ev.target.closest?.('#bgmStarsRow .star-unit');
    if (starUnit) {
      const sc = parseInt(starUnit.getAttribute('data-score') || '0', 10);
      doc.getElementById('bgmRatingHint').textContent = STAR_DESCRIPTIONS[sc] || '';
      mainEl.querySelectorAll('#bgmStarsRow .star-unit').forEach((u) => {
        u.classList.toggle('filled', parseInt(u.getAttribute('data-score') || '0', 10) <= sc);
      });
    }
  });

  doc.getElementById('bgmSubjHistBars')?.addEventListener('pointerleave', () => {
    doc.getElementById('bgmSubjInspectStar').textContent = peakBarInfo.star;
    doc.getElementById('bgmSubjInspectDetail').textContent = peakBarInfo.detail;
  });

  doc.getElementById('bgmStarsRow')?.addEventListener('pointerleave', () => {
    doc.getElementById('bgmRatingHint').textContent = state.ratingScore
      ? STAR_DESCRIPTIONS[state.ratingScore]
      : '未评分';
    mainEl.querySelectorAll('#bgmStarsRow .star-unit').forEach((u) => {
      u.classList.toggle('filled', parseInt(u.getAttribute('data-score') || '0', 10) <= state.ratingScore);
    });
  });

  mainEl.addEventListener('click', async (ev) => {
    const copyBtn = ev.target.closest('#bgmCopySubjUrlBtn');
    if (copyBtn) {
      navigator.clipboard?.writeText(location.href);
      const origHtml = copyBtn.innerHTML;
      copyBtn.textContent = '✓ 已复制';
      setTimeout(() => {
        copyBtn.innerHTML = origHtml;
      }, 1400);
      return;
    }

    const relToggleBtn = ev.target.closest('#bgmRelToggleBtn');
    if (relToggleBtn) {
      const gridEl = doc.getElementById('bgmRelationsGrid');
      gridEl?.classList.toggle('is-expanded');
      renderRelations();
      return;
    }

    const charToggleBtn = ev.target.closest('#bgmCharToggleBtn');
    if (charToggleBtn) {
      const gridEl = doc.getElementById('bgmCharGrid');
      const exp = gridEl?.classList.toggle('is-expanded');
      charToggleBtn.textContent = exp
        ? '收起部分角色 ▴'
        : `展开其余 ${data.characters.length - 9} 名角色 (共 ${data.characters.length} 名) ▾`;
      return;
    }

    const infoboxBtn = ev.target.closest('#bgmInfoboxToggleBtn');
    if (infoboxBtn) {
      const listEl = doc.getElementById('bgmInfoboxList');
      const exp = listEl?.classList.toggle('expanded');
      infoboxBtn.textContent = exp ? '收起部分属性 ▴' : `展开全部属性 (共 ${data.infobox.length} 项) ▾`;
      return;
    }

    const epBtn = ev.target.closest('[data-bgm-ep-btn]');
    if (epBtn) {
      openEpPopover(epBtn, epBtn.getAttribute('data-bgm-ep-btn'));
      return;
    }

    if (ev.target.closest('#btnCloseEpPopover')) {
      doc.getElementById('epPopover').hidden = true;
      return;
    }

    const epActBtn = ev.target.closest('[data-ep-action]');
    if (epActBtn && state.activeEp) {
      const act = epActBtn.getAttribute('data-ep-action');
      const ep = state.activeEp;
      const epIdx = data.episodes.findIndex((e) => e.epId === ep.epId);
      const tillIds =
        act === 'till' && epIdx >= 0 ? data.episodes.slice(0, epIdx + 1).map((e) => e.epId) : [];
      try {
        await updateEpisodeStatus({
          epId: ep.epId,
          status: act,
          gh: data.interest.gh || session?.gh || session?.formhash,
          watchedTillIds: tillIds,
        });
        if (act === 'till' && epIdx >= 0) {
          data.episodes.slice(0, epIdx + 1).forEach((e) => (e.status = 'watched'));
        } else {
          ep.status = act === 'remove' ? 'air' : act;
        }
        doc.getElementById('epPopover').hidden = true;
        renderWorkbench();
        toast?.('章节进度已同步至 Bangumi');
      } catch (err) {
        toast?.('更新失败：' + (err?.message || '请确认登录状态'));
      }
      return;
    }

    const discBtn = ev.target.closest('[data-disc-idx]');
    if (discBtn) {
      state.activeDisc = parseInt(discBtn.getAttribute('data-disc-idx') || '0', 10);
      renderWorkbench();
      return;
    }

    const relBtn = ev.target.closest('[data-rel-cat]');
    if (relBtn) {
      state.relFilter = relBtn.getAttribute('data-rel-cat') || 'all';
      mainEl.querySelectorAll('[data-rel-cat]').forEach((b) => b.classList.toggle('active', b === relBtn));
      renderRelations();
      return;
    }

    const cmtBtn = ev.target.closest('[data-cmt-filter]');
    if (cmtBtn) {
      state.cmtFilter = cmtBtn.getAttribute('data-cmt-filter') || 'all';
      mainEl.querySelectorAll('[data-cmt-filter]').forEach((b) => b.classList.toggle('active', b === cmtBtn));
      renderComments();
      return;
    }

    const statusBtn = ev.target.closest('#bgmInterestStatusRow .interest-btn');
    if (statusBtn) {
      state.interestStatus = statusBtn.getAttribute('data-status') || '3';
      mainEl
        .querySelectorAll('#bgmInterestStatusRow .interest-btn')
        .forEach((b) => b.classList.toggle('active', b === statusBtn));
      return;
    }

    const starBtn = ev.target.closest('#bgmStarsRow .star-unit');
    if (starBtn) {
      const sc = parseInt(starBtn.getAttribute('data-score') || '0', 10);
      state.ratingScore = state.ratingScore === sc ? 0 : sc;
      doc.getElementById('bgmRatingHint').textContent = state.ratingScore
        ? STAR_DESCRIPTIONS[state.ratingScore]
        : '未评分';
      mainEl.querySelectorAll('#bgmStarsRow .star-unit').forEach((u) => {
        u.classList.toggle('filled', parseInt(u.getAttribute('data-score') || '0', 10) <= state.ratingScore);
      });
      return;
    }

    const addTagBtn = ev.target.closest('[data-bgm-add-tag]');
    if (addTagBtn) {
      const tg = addTagBtn.getAttribute('data-bgm-add-tag') || '';
      const inp = doc.getElementById('bgmInterestTags');
      if (inp && tg) {
        const cur = inp.value.trim().split(/\s+/).filter(Boolean);
        if (!cur.includes(tg)) cur.push(tg);
        inp.value = cur.join(' ');
      }
      return;
    }

    const saveInterestBtn = ev.target.closest('#bgmSaveInterestBtn');
    if (saveInterestBtn) {
      const tagsVal = doc.getElementById('bgmInterestTags')?.value || '';
      const cmtVal = doc.getElementById('bgmInterestComment')?.value || '';
      const priv = Boolean(doc.getElementById('bgmInterestPrivacy')?.checked);
      const origSaveHtml = saveInterestBtn.innerHTML;
      saveInterestBtn.textContent = '保存中…';
      try {
        await submitSubjectInterest({
          subjectId: data.id,
          action: data.interest.formAction,
          gh: data.interest.gh || session?.gh || session?.formhash,
          interest: state.interestStatus,
          rating: state.ratingScore || '',
          tags: tagsVal,
          comment: cmtVal,
          privacy: priv,
        });
        const labelMap = {
          '1': `想${verb}${noun}`,
          '2': `我${verb}过${noun}`,
          '3': `我在${verb}${noun}`,
          '4': `我搁置了${noun}`,
          '5': `我抛弃了${noun}`,
        };
        doc.getElementById('bgmInterestStateLabel').textContent = labelMap[state.interestStatus] || '已收藏';
        if (cmtVal.trim() && session?.loggedIn) {
          data.comments.unshift({
            id: 'me_' + Date.now(),
            user: session.nickname || '我',
            userHref: session.uid ? `/user/${session.uid}` : '#',
            avatar: session.avatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg',
            star: state.ratingScore,
            statusText: labelMap[state.interestStatus]?.replace(/^我/, '') || '',
            time: '刚刚',
            text: cmtVal.trim(),
          });
          renderComments();
        }
        saveInterestBtn.textContent = '✓ 已保存';
        setTimeout(() => {
          saveInterestBtn.innerHTML = origSaveHtml;
        }, 1400);
      } catch {
        saveInterestBtn.textContent = '保存失败';
        setTimeout(() => {
          saveInterestBtn.innerHTML = origSaveHtml;
        }, 1600);
      }
      return;
    }

    const removeInterestBtn = ev.target.closest('#bgmRemoveInterestBtn');
    if (removeInterestBtn) {
      if (!confirm('确定要从收藏中抹除该条目吗？')) return;
      try {
        await removeSubjectInterest({
          subjectId: data.id,
          gh: data.interest.gh || session?.gh || session?.formhash,
        });
        doc.getElementById('bgmInterestStateLabel').textContent = `未收藏${noun}`;
        mainEl.querySelectorAll('#bgmInterestStatusRow .interest-btn').forEach((b) => b.classList.remove('active'));
        state.ratingScore = 0;
        doc.getElementById('bgmRatingHint').textContent = '未评分';
        mainEl.querySelectorAll('#bgmStarsRow .star-unit').forEach((u) => u.classList.remove('filled'));
      } catch {
        /* 忽略异常 */
      }
      return;
    }

    const chartModeBtn = ev.target.closest('[data-chart-mode]');
    if (chartModeBtn) {
      const mode = chartModeBtn.getAttribute('data-chart-mode');
      mainEl
        .querySelectorAll('[data-chart-mode]')
        .forEach((b) => b.classList.toggle('active', b === chartModeBtn));
      doc.getElementById('bgmSubjHistWrapper').style.display = mode === 'list' ? 'none' : 'block';
      doc.getElementById('bgmSubjHorizBars').style.display = mode === 'list' ? 'flex' : 'none';
    }
  });

  mainEl.addEventListener('submit', async (ev) => {
    if (ev.target.id === 'bgmSubjBatchForm') {
      ev.preventDefault();
      const we = ev.target.querySelector('input[name="watchedeps"]')?.value;
      const wv = ev.target.querySelector('input[name="watched_vols"]')?.value;
      try {
        await submitBatchProgress({
          action: ev.target.getAttribute('action'),
          formhash: session?.formhash,
          subjectId: data.id,
          watchedEps: we,
          watchedVols: wv,
        });
        const n = parseInt(we || '0', 10);
        if (!isNaN(n) && data.episodes.length) {
          data.episodes.forEach((ep, idx) => {
            if (ep.group === '本篇') ep.status = idx < n ? 'watched' : 'air';
          });
          renderWorkbench();
        }
        toast?.('进度已更新至 Bangumi');
      } catch (err) {
        toast?.('更新失败：' + (err?.message || '请重试'));
      }
    }
  });
}
