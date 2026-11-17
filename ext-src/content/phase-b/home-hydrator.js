/**
 * Bangumi Chronicle · P01/P02 首页与登录认证页真站水合器 (home-hydrator.js)
 */

import {
  escapeHtml,
  updateEpisodeStatus,
  submitBatchProgress,
  submitTimelineSay,
  fetchTimelineReplies,
  submitTimelineReply,
  eraseActionLink,
} from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from './dom-vault.js';
import { extractLoggedInHome, extractGuestOrAuthData } from './home-extractor.js';

function renderStars(n) {
  if (!n || n <= 0) return '';
  const clamped = Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
  return (
    `<span class="bau-stars-line starstop-ten" title="${clamped} / 10">` +
      `<span class="stars-filled">${'★'.repeat(clamped)}</span>` +
      `<span class="stars-empty">${'☆'.repeat(10 - clamped)}</span>` +
      `<b class="stars-score-num">${clamped}</b>` +
    `</span>`
  );
}

function calcSubjectProgressPct(s) {
  if (!s) return 0;
  const denom =
    s.total > 0
      ? s.total
      : s.episodes?.length
        ? s.episodes.filter((e) => e.group === '本篇').length || s.episodes.length
        : 0;
  return denom > 0 ? Math.min(100, Math.round((s.watched / denom) * 100)) : 0;
}

function syncSubjectProgressState(subj) {
  if (!subj) return;
  const totalPart = subj.total > 0 ? String(subj.total) : '??';
  subj.progText = `[${subj.watched}/${totalPart}]`;
  if (subj.batchForm) {
    subj.batchForm.watchedEps = String(subj.watched);
  }
  if (subj.episodes?.length) {
    const mainEps = subj.episodes.filter((e) => e.group === '本篇');
    const pool = mainEps.length ? mainEps : subj.episodes;
    const candidate =
      pool.find((e) => {
        const n = parseInt(e.num, 10);
        return e.status !== 'watched' && e.status !== 'drop' && (!Number.isFinite(n) || n > subj.watched);
      }) || pool.find((e) => e.status !== 'watched' && e.status !== 'drop');
    subj.nextEp = candidate
      ? {
          epId: candidate.epId,
          label: `ep.${candidate.num} 看过`,
          href: candidate.href,
        }
      : null;
  }
}

function epStatusLabel(st) {
  const map = {
    watched: '已看',
    air: '已播未看',
    today: '今日放送',
    queue: '想看',
    drop: '抛弃',
    na: '未播',
  };
  return map[st] || '未播';
}

function epClassForStatus(st) {
  const map = {
    watched: 'epBtnWatched',
    air: 'epBtnAir',
    today: 'epBtnToday',
    queue: 'epBtnQueue',
    drop: 'epBtnDrop',
    na: 'epBtnNA',
  };
  return map[st] || 'epBtnNA';
}

function hydrateLoggedInHome({ doc, session, activatePageStyles, toast }) {
  const data = extractLoggedInHome(doc);
  activatePageStyles(['bangumi-home-preview.css', 'brand.css', 'topbar-account.css', 'prg_editorial.css', 'prg_soft.css', 'bangumi-wings.css', 'phase-b-hydrated.css']);

  stashOriginalMain(doc);

  const state = {
    category: '0',
    viewMode: 'normal',
    activeSubjectId: data.subjects[0]?.id || '',
    tmlFilter: 'all',
    activeEp: null,
  };

  // 真站 #home_calendar 会同时给出「今天 / 明天」两天，卡片上标出非今日的日期标签
  const calTodayCount = data.calendarItems.filter((c) => !c.dayLabel || c.dayLabel === '今天').length;
  const calHtml = data.calendarItems.length
    ? data.calendarItems
        .map(
          (c) =>
            `<a class="cal-poster-card" href="${escapeHtml(c.href)}" title="${escapeHtml(c.title)}${c.subTitle ? ' / ' + escapeHtml(c.subTitle) : ''}">` +
              (c.cover ? `<img src="${escapeHtml(c.cover)}" alt="${escapeHtml(c.title)}" referrerpolicy="no-referrer" loading="lazy" />` : '') +
              (c.dayLabel && c.dayLabel !== '今天' ? `<em class="cal-day-flag">${escapeHtml(c.dayLabel)}</em>` : '') +
              `<span>${escapeHtml(c.title)}</span>` +
            `</a>`
        )
        .join('')
    : '<p class="empty-hint">今日暂无放送条目</p>';

  const renderTopicsHtml = (list, emptyText) =>
    list.length
      ? list
          .map(
            (t) =>
              `<li class="compact-topic-item"><a href="${escapeHtml(t.href)}">` +
                (t.avatar ? `<img class="topic-ava" src="${escapeHtml(t.avatar)}" alt="" referrerpolicy="no-referrer" />` : '') +
                `<span class="topic-text"><strong>${escapeHtml(t.title)}</strong>${t.meta ? `<small>${escapeHtml(t.meta)}</small>` : ''}</span>` +
              `</a></li>`
          )
          .join('')
      : `<li class="compact-topic-empty">${emptyText}</li>`;

  const tmlTabsHtml = data.tmlTabs.length
    ? data.tmlTabs
        .map(
          (tb) =>
            `<a href="${escapeHtml(tb.href)}" class="tml-tab${tb.active ? ' is-active' : ''}" data-bgm-tml-tab="${escapeHtml(tb.id)}">${escapeHtml(tb.label)}</a>`
        )
        .join('')
    : '';

  const stageHtml = `
    <div class="studio-shell" id="studioShell">
      <aside class="side-wing left-wing" id="leftWing" aria-label="放送雷达">
        <div class="wing-toolbar">
          <span class="wing-heading"><span class="wing-heading-text">每日放送与助手</span></span>
          <button type="button" class="wing-collapse-btn" data-bgm-wing="left" title="收起/展开左侧翼">◀</button>
        </div>
        <div class="wing-body">
          <section class="glass-accordion-card is-open" id="cardCalendar">
            <header class="accordion-header">
              <div class="accordion-trigger">
                <span class="acc-title-wrap"><span class="acc-title">每日放送</span><span class="acc-sub">今日 ${calTodayCount} 部</span></span>
                <a href="/calendar" class="more-pill-link">完整表 »</a>
              </div>
            </header>
            <div class="accordion-content">
              <div class="calendar-poster-grid" id="calendarGrid">${calHtml}</div>
            </div>
          </section>
        </div>
      </aside>

      <section class="center-stage" id="centerStage">
        <div class="glass-panel prg-shell" id="prgManager">
          <div class="prg-header-bar">
            <div>
              <span class="eyebrow-tag">WATCHING PROGRESS · 真实同步</span>
              <h2 class="panel-title">收视进度管理</h2>
            </div>
            <div class="prg-controls-row">
              <div class="seg-capsule" id="bgmPrgCatTabs">
                <button type="button" class="seg-btn is-active" data-cat="0">全部 <span class="seg-count">${data.subjects.length}</span></button>
                <button type="button" class="seg-btn" data-cat="2">动画 <span class="seg-count">${data.subjects.filter((s) => s.type === '2').length}</span></button>
                <button type="button" class="seg-btn" data-cat="1">书籍 <span class="seg-count">${data.subjects.filter((s) => s.type === '1').length}</span></button>
                <button type="button" class="seg-btn" data-cat="6">三次元 <span class="seg-count">${data.subjects.filter((s) => s.type === '6').length}</span></button>
              </div>
              <div class="view-mode-capsule" id="bgmPrgViewModes">
                <button type="button" class="mode-btn is-active" data-mode="normal">列表</button>
                <button type="button" class="mode-btn" data-mode="tiny">平铺</button>
              </div>
            </div>
          </div>

          <div class="prg-split-workspace" id="bgmPrgWorkspace">
            <div class="prg-filmstrip-col" id="bgmSubjectList"></div>
            <div class="prg-spotlight-col" id="bgmSpotlightPanel"></div>
          </div>
        </div>

        <div class="glass-panel timeline-command-hub" id="home_tml">
          <div class="tml-hub-head">
            <div>
              <span class="eyebrow-tag">SPACETIME STREAM · 抓抓时间线</span>
              <h2 class="panel-title">好友与全站动态</h2>
            </div>
            <a href="/timeline" class="more-pill-link">进入时空管理局 »</a>
          </div>

          <form class="tsukkomi-composer" id="bgmHydratedSayForm" action="${escapeHtml(data.sayForm?.action || '/timeline?ajax=1')}" method="post">
            <input type="hidden" name="formhash" value="${escapeHtml(data.sayForm?.formhash || session.formhash || '')}" />
            <textarea name="say_input" id="bgmHydratedSayInput" class="tsukkomi-textarea" rows="2" placeholder="在 Bangumi 说点什么…（真实同步至个人时间线）"></textarea>
            <div class="tsukkomi-bar">
              <span class="tsukkomi-hint">formhash: ${escapeHtml(data.sayForm?.formhash || session.formhash || '已鉴权')}</span>
              <button type="submit" class="tsukkomi-submit-btn">写好了</button>
            </div>
          </form>

          ${tmlTabsHtml ? `<div class="tml-filter-bar" id="timelineTabs">${tmlTabsHtml}</div>` : ''}
          <div class="tml-stream-list" id="timeline"></div>
        </div>
      </section>

      <aside class="side-wing right-wing" id="rightWing" aria-label="社区热议侧翼">
        <div class="wing-toolbar">
          <button type="button" class="wing-collapse-btn" data-bgm-wing="right" title="收起/展开右侧翼">▶</button>
          <span class="wing-heading"><span class="wing-heading-text">社区热议</span></span>
        </div>
        <div class="wing-body">
          <section class="glass-accordion-card is-open">
            <header class="accordion-header"><div class="accordion-trigger"><span class="acc-title-wrap"><span class="acc-title">小组热门话题</span></span><a href="/group/discover" class="more-pill-link">更多 »</a></div></header>
            <div class="accordion-content"><ul class="compact-topic-list">${renderTopicsHtml(data.groupTopics, '暂无小组话题')}</ul></div>
          </section>
          <section class="glass-accordion-card is-open">
            <header class="accordion-header"><div class="accordion-trigger"><span class="acc-title-wrap"><span class="acc-title">热门条目讨论</span></span><a href="/rakuen" class="more-pill-link">超展开 »</a></div></header>
            <div class="accordion-content"><ul class="compact-topic-list">${renderTopicsHtml(data.subjectTopics, '暂无条目讨论')}</ul></div>
          </section>
          <section class="glass-accordion-card is-open">
            <header class="accordion-header"><div class="accordion-trigger"><span class="acc-title-wrap"><span class="acc-title">Sumomo 公告板</span></span></div></header>
            <div class="accordion-content"><ul class="compact-topic-list">${renderTopicsHtml(data.announcements.map((a) => ({ title: a.title, href: a.href, meta: a.date })), '暂无公告')}</ul></div>
          </section>
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
    </div>
  `;

  const mainEl = mountHydratedStage(doc, { tag: 'main', id: 'main', className: 'home-hydrated-main', html: stageHtml });

  function getFilteredSubjects() {
    if (state.category === '0') return data.subjects;
    return data.subjects.filter((s) => s.type === state.category);
  }

  function renderSubjectList() {
    const host = doc.getElementById('bgmSubjectList');
    if (!host) return;
    const list = getFilteredSubjects();
    if (!list.length) {
      host.innerHTML = '<div class="empty-hint" style="padding:24px;">该分类下暂无在看条目</div>';
      return;
    }
    if (!list.some((s) => s.id === state.activeSubjectId)) {
      state.activeSubjectId = list[0].id;
    }
    host.classList.toggle('is-tiny-grid', state.viewMode === 'tiny');
    host.innerHTML = list
      .map((s) => {
        const pct = calcSubjectProgressPct(s);
        const selected = s.id === state.activeSubjectId ? ' is-selected' : '';
        return (
          `<div class="film-card${selected}" data-bgm-select-subj="${escapeHtml(s.id)}">` +
            (s.cover ? `<img class="film-cover" src="${escapeHtml(s.cover)}" alt="${escapeHtml(s.title)}" referrerpolicy="no-referrer" />` : '') +
            `<div class="film-body">` +
              `<div class="film-title-row"><a href="${escapeHtml(s.subjectUrl)}" class="film-title">${escapeHtml(s.title)}</a>${s.onAir ? '<span class="on-air-dot" title="连载中"></span>' : ''}</div>` +
              `<div class="film-meta-row"><span class="film-prog-text">${escapeHtml(s.progText || `${s.watched}/${s.total || '?'}`)}</span>` +
                (s.nextEp ? `<button type="button" class="film-checkin-btn" data-bgm-quick-ep="${escapeHtml(s.nextEp.epId)}" data-bgm-subj="${escapeHtml(s.id)}">${escapeHtml(s.nextEp.label)}</button>` : '') +
              `</div>` +
              `<div class="film-progress-track"><span style="width:${pct}%"></span></div>` +
            `</div>` +
          `</div>`
        );
      })
      .join('');
  }

  function renderSpotlight() {
    const host = doc.getElementById('bgmSpotlightPanel');
    if (!host) return;
    const subj = data.subjects.find((s) => s.id === state.activeSubjectId) || getFilteredSubjects()[0];
    if (!subj) {
      host.innerHTML = '<div class="empty-hint" style="padding:36px;">暂无正在收看的条目，去频道逛逛吧</div>';
      return;
    }
    const pct = calcSubjectProgressPct(subj);
    const groups = [];
    for (const ep of subj.episodes) {
      let g = groups.find((x) => x.name === ep.group);
      if (!g) {
        g = { name: ep.group, eps: [] };
        groups.push(g);
      }
      g.eps.push(ep);
    }
    const epMatrixHtml = groups
      .map(
        (g) =>
          `<div class="ep-group-block"><div class="ep-group-title">${escapeHtml(g.name)}</div><div class="ep-grid-matrix">` +
            g.eps
              .map(
                (ep) =>
                  `<button type="button" class="ep-cell ${epClassForStatus(ep.status)}" data-bgm-ep-btn="${escapeHtml(ep.epId)}" data-bgm-subj="${escapeHtml(subj.id)}" title="${escapeHtml(ep.title)}">${escapeHtml(ep.num)}</button>`
              )
              .join('') +
          `</div></div>`
      )
      .join('');

    const batchHtml = subj.batchForm
      ? `<form class="prg-batch-form" data-bgm-batch-subj="${escapeHtml(subj.id)}" action="${escapeHtml(subj.batchForm.action)}" method="post">` +
          `<input type="hidden" name="formhash" value="${escapeHtml(subj.batchForm.formhash || session.formhash)}" />` +
          `<label>看到第 <input type="number" name="watched_eps" min="0" value="${escapeHtml(subj.batchForm.watchedEps)}" /> 话</label>` +
          (subj.batchForm.watchedVols !== null
            ? `<label>第 <input type="number" name="watched_vols" min="0" value="${escapeHtml(subj.batchForm.watchedVols)}" /> 卷</label>`
            : '') +
          `<button type="submit" class="batch-submit-btn">保存进度</button>` +
        `</form>`
      : '';

    host.innerHTML = `
      <div class="spotlight-stage">
        <div class="spotlight-head">
          ${subj.cover ? `<img class="spotlight-cover" src="${escapeHtml(subj.cover)}" alt="${escapeHtml(subj.title)}" referrerpolicy="no-referrer" />` : ''}
          <div class="spotlight-info">
            <div class="stage-title-row">
              <h3><a href="${escapeHtml(subj.subjectUrl)}">${escapeHtml(subj.title)}</a></h3>
              <a href="${escapeHtml(subj.editHref)}" class="more-pill-link">修改收藏</a>
            </div>
            ${subj.watchingCount ? `<div class="spotlight-sub">${escapeHtml(subj.watchingCount)}</div>` : ''}
            <div class="progress-stat-pill">${escapeHtml(subj.progText || `${subj.watched}/${subj.total || '?'}`)} · ${pct}%</div>
            <div class="stage-progress-track"><div class="stage-progress-fill" style="width:${pct}%"></div></div>
            ${batchHtml}
            <div class="spotlight-links">
              <a href="/subject/${escapeHtml(subj.id)}/ep">全部章节 »</a>
              <a href="/subject/${escapeHtml(subj.id)}/board">讨论版</a>
              <a href="/subject/${escapeHtml(subj.id)}/comments">吐槽箱</a>
            </div>
          </div>
        </div>
        <div class="spotlight-episodes">${epMatrixHtml || '<p class="empty-hint">暂无分集格子</p>'}</div>
      </div>`;
  }

  function renderTimeline() {
    const host = doc.getElementById('timeline');
    if (!host) return;
    if (!data.timelineItems.length) {
      host.innerHTML = '<div class="empty-hint" style="padding:24px;">暂无时间线动态</div>';
      return;
    }
    host.innerHTML = data.timelineItems
      .map(
        (item) =>
          `<article class="tml-card" data-tml-id="${escapeHtml(item.id)}">` +
            `<a class="tml-ava-link" href="${escapeHtml(item.userHref)}"><img class="tml-ava" src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.user)}" referrerpolicy="no-referrer" /></a>` +
            `<div class="tml-body">` +
              `<div class="tml-action-line">${item.actionHtml}${item.stars && !item.card ? ' ' + renderStars(item.stars) : ''}</div>` +
              (item.quoteText ? `<div class="tml-quote">${escapeHtml(item.quoteText)}</div>` : '') +
              (item.card
                ? `<a class="tml-subject-card" href="${escapeHtml(item.card.href)}">` +
                    (item.card.cover ? `<img src="${escapeHtml(item.card.cover)}" alt="" referrerpolicy="no-referrer" />` : '') +
                    `<div><strong>${escapeHtml(item.card.title)}</strong>${item.card.info ? `<small>${escapeHtml(item.card.info)}</small>` : ''}${item.stars ? renderStars(item.stars) : ''}</div>` +
                  `</a>`
                : '') +
              (item.likeChips?.length
                ? `<div class="tml-likes-row">` +
                    item.likeChips.map((lk) => `<span class="tml-like-pill">${escapeHtml(lk.emoji)} <b>${lk.count}</b></span>`).join('') +
                  `</div>`
                : '') +
              `<div class="tml-meta-row">` +
                `<span>${escapeHtml(item.time)}</span>` +
                (item.replyUrl ? `<button type="button" class="tml-reply-btn" data-bgm-tml-reply="${escapeHtml(item.replyUrl)}" data-tml-id="${escapeHtml(item.id)}">💬 回复${item.replyCount > 0 ? ` (${item.replyCount})` : ''}</button>` : '') +
                (item.delUrl ? `<button type="button" class="tml-del-btn" data-bgm-tml-del="${escapeHtml(item.delUrl)}" data-tml-id="${escapeHtml(item.id)}">🗑 删除</button>` : '') +
              `</div>` +
              `<div class="tml-reply-drawer" id="tmlDrawer_${escapeHtml(item.id)}" hidden></div>` +
            `</div>` +
          `</article>`
      )
      .join('');
  }

  function openEpPopover(btnEl, subjId, epId) {
    const subj = data.subjects.find((s) => s.id === subjId);
    const ep = subj?.episodes.find((e) => e.epId === epId);
    const pop = doc.getElementById('epPopover');
    if (!subj || !ep || !pop) return;
    state.activeEp = { subjId, epId };
    doc.getElementById('epPopCode').textContent = `EP.${ep.num}`;
    doc.getElementById('epPopTitle').textContent = ep.title;
    doc.getElementById('epPopMeta').textContent = ep.meta || subj.title;
    doc.getElementById('epPopCurrentStatus').textContent = `当前：${epStatusLabel(ep.status)}`;
    doc.getElementById('epPopDiscussLink').href = ep.href;

    const r = btnEl.getBoundingClientRect();
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 360)) + 'px';
    pop.style.top = Math.min(r.bottom + 8, window.innerHeight - 240) + 'px';
    pop.hidden = false;
  }

  mainEl.addEventListener('click', async (ev) => {
    const catBtn = ev.target.closest('[data-cat]');
    if (catBtn) {
      state.category = catBtn.getAttribute('data-cat');
      mainEl.querySelectorAll('#bgmPrgCatTabs .seg-btn').forEach((b) => b.classList.toggle('is-active', b === catBtn));
      renderSubjectList();
      renderSpotlight();
      return;
    }

    const modeBtn = ev.target.closest('[data-mode]');
    if (modeBtn) {
      state.viewMode = modeBtn.getAttribute('data-mode');
      mainEl.querySelectorAll('#bgmPrgViewModes .mode-btn').forEach((b) => b.classList.toggle('is-active', b === modeBtn));
      renderSubjectList();
      return;
    }

    const wingBtn = ev.target.closest('[data-bgm-wing]');
    if (wingBtn) {
      const side = wingBtn.getAttribute('data-bgm-wing');
      const el = doc.getElementById(side === 'left' ? 'leftWing' : 'rightWing');
      el?.classList.toggle('is-collapsed');
      return;
    }

    const quickBtn = ev.target.closest('[data-bgm-quick-ep]');
    if (quickBtn) {
      ev.stopPropagation();
      const epId = quickBtn.getAttribute('data-bgm-quick-ep');
      const subjId = quickBtn.getAttribute('data-bgm-subj');
      try {
        await updateEpisodeStatus({ epId, status: 'watched', gh: session.gh || session.formhash });
        const subj = data.subjects.find((s) => s.id === subjId);
        const ep = subj?.episodes.find((e) => e.epId === epId);
        if (ep) ep.status = 'watched';
        if (subj) {
          const watchedInMatrix = subj.episodes.filter((e) => e.status === 'watched').length;
          subj.watched = Math.max(subj.watched + 1, watchedInMatrix);
          syncSubjectProgressState(subj);
        }
        renderSubjectList();
        renderSpotlight();
        toast('已打卡看过（真实同步至 Bangumi）');
      } catch (err) {
        toast('打卡失败：' + (err?.message || '请确认登录状态'));
      }
      return;
    }

    const subjCard = ev.target.closest('[data-bgm-select-subj]');
    if (subjCard && !ev.target.closest('a')) {
      state.activeSubjectId = subjCard.getAttribute('data-bgm-select-subj');
      renderSubjectList();
      renderSpotlight();
      return;
    }

    const epBtn = ev.target.closest('[data-bgm-ep-btn]');
    if (epBtn) {
      openEpPopover(epBtn, epBtn.getAttribute('data-bgm-subj'), epBtn.getAttribute('data-bgm-ep-btn'));
      return;
    }

    if (ev.target.closest('#btnCloseEpPopover')) {
      doc.getElementById('epPopover').hidden = true;
      return;
    }

    const epActBtn = ev.target.closest('[data-ep-action]');
    if (epActBtn && state.activeEp) {
      const act = epActBtn.getAttribute('data-ep-action');
      const { subjId, epId } = state.activeEp;
      const subj = data.subjects.find((s) => s.id === subjId);
      const epIdx = subj?.episodes.findIndex((e) => e.epId === epId) ?? -1;
      const tillIds =
        act === 'till' && subj && epIdx >= 0
          ? subj.episodes.slice(0, epIdx + 1).map((e) => e.epId)
          : [];
      try {
        await updateEpisodeStatus({
          epId,
          status: act,
          gh: session.gh || session.formhash,
          watchedTillIds: tillIds,
        });
        if (subj) {
          if (act === 'till' && epIdx >= 0) {
            subj.episodes.slice(0, epIdx + 1).forEach((e) => (e.status = 'watched'));
          } else {
            const ep = subj.episodes[epIdx];
            if (ep) ep.status = act === 'remove' ? 'air' : act;
          }
          subj.watched = subj.episodes.filter((e) => e.status === 'watched').length;
          syncSubjectProgressState(subj);
        }
        doc.getElementById('epPopover').hidden = true;
        renderSubjectList();
        renderSpotlight();
        toast('章节状态已更新至 Bangumi');
      } catch (err) {
        toast('操作失败：' + (err?.message || '请稍后再试'));
      }
      return;
    }

    const replyBtn = ev.target.closest('[data-bgm-tml-reply]');
    if (replyBtn) {
      const tmlId = replyBtn.getAttribute('data-tml-id');
      const url = replyBtn.getAttribute('data-bgm-tml-reply');
      const drawer = doc.getElementById(`tmlDrawer_${tmlId}`);
      if (!drawer) return;
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden && !drawer.dataset.loaded) {
        drawer.innerHTML = '<div style="padding:8px;font-size:12px;">正在加载回复…</div>';
        try {
          const { replies, form } = await fetchTimelineReplies(url);
          drawer.dataset.loaded = '1';
          drawer.innerHTML =
            (replies.length
              ? replies
                  .map(
                    (rp) =>
                      `<div class="tml-reply-row"><strong>${escapeHtml(rp.user)}</strong>：<span>${escapeHtml(rp.text)}</span> <small>${escapeHtml(rp.time)}</small></div>`
                  )
                  .join('')
              : '<div style="font-size:12px;color:var(--muted);">暂无回复，抢先发言吧</div>') +
            `<form class="tml-reply-form" data-reply-action="${escapeHtml(form?.action || url)}" data-reply-hash="${escapeHtml(form?.formhash || session.formhash)}">` +
              `<input type="text" name="content" placeholder="写下你的回复…" required />` +
              `<button type="submit">回复</button>` +
            `</form>`;
        } catch {
          drawer.innerHTML = '<div style="padding:8px;font-size:12px;">加载失败</div>';
        }
      }
      return;
    }

    const delBtn = ev.target.closest('[data-bgm-tml-del]');
    if (delBtn) {
      if (!confirm('确定删除这条时间线动态？')) return;
      try {
        await eraseActionLink(delBtn.getAttribute('data-bgm-tml-del'));
        const id = delBtn.getAttribute('data-tml-id');
        data.timelineItems = data.timelineItems.filter((x) => x.id !== id);
        renderTimeline();
        toast('动态已删除');
      } catch (err) {
        toast('删除失败：' + (err?.message || '请重试'));
      }
    }
  });

  mainEl.addEventListener('submit', async (ev) => {
    const batch = ev.target.closest('.prg-batch-form');
    if (batch) {
      ev.preventDefault();
      const subjId = batch.getAttribute('data-bgm-batch-subj');
      const formhash = batch.querySelector('input[name="formhash"]')?.value || session.formhash;
      const watchedEps = batch.querySelector('input[name="watched_eps"]')?.value;
      const watchedVols = batch.querySelector('input[name="watched_vols"]')?.value;
      try {
        await submitBatchProgress({
          action: batch.getAttribute('action'),
          formhash,
          subjectId: subjId,
          watchedEps,
          watchedVols,
        });
        const subj = data.subjects.find((s) => s.id === subjId);
        if (subj && watchedEps !== undefined) {
          subj.watched = parseInt(watchedEps, 10) || 0;
          if (subj.episodes?.length) {
            subj.episodes.forEach((e) => {
              const n = parseInt(e.num, 10);
              if (e.group === '本篇' && Number.isFinite(n)) {
                if (n <= subj.watched) e.status = 'watched';
                else if (e.status === 'watched') e.status = 'air';
              }
            });
          }
          syncSubjectProgressState(subj);
        }
        renderSubjectList();
        renderSpotlight();
        toast('批量进度已保存');
      } catch (err) {
        toast('保存失败：' + (err?.message || '请重试'));
      }
      return;
    }

    if (ev.target.id === 'bgmHydratedSayForm' || ev.target.id === 'SayFrom') {
      ev.preventDefault();
      const ta = doc.getElementById('bgmHydratedSayInput') || doc.getElementById('SayInput');
      const fh = ev.target.querySelector('input[name="formhash"]')?.value || session.formhash;
      try {
        await submitTimelineSay({
          action: ev.target.getAttribute('action') || '/timeline?ajax=1',
          formhash: fh,
          sayInput: ta.value,
        });
        data.timelineItems.unshift({
          id: 'new_' + Date.now(),
          uid: session.uid,
          user: session.nickname,
          userHref: session.uid ? `/user/${session.uid}` : '#',
          avatar: session.avatar,
          actionHtml: `<strong>${escapeHtml(session.nickname)}</strong> 刚刚吐槽：`,
          quoteText: ta.value.trim(),
          card: null,
          time: '刚刚',
          replyCount: 0,
        });
        ta.value = '';
        renderTimeline();
        toast('吐槽已发送至 Bangumi');
      } catch (err) {
        toast('发送失败：' + (err?.message || '请重试'));
      }
      return;
    }

    const rForm = ev.target.closest('.tml-reply-form');
    if (rForm) {
      ev.preventDefault();
      const inp = rForm.querySelector('input[name="content"]');
      try {
        await submitTimelineReply({
          action: rForm.getAttribute('data-reply-action'),
          formhash: rForm.getAttribute('data-reply-hash') || session.formhash,
          content: inp.value,
        });
        const row = doc.createElement('div');
        row.className = 'tml-reply-row';
        row.innerHTML = `<strong>${escapeHtml(session.nickname)}</strong>：<span>${escapeHtml(inp.value.trim())}</span> <small>刚刚</small>`;
        rForm.before(row);
        inp.value = '';
        toast('回复成功');
      } catch (err) {
        toast('回复失败：' + (err?.message || '请重试'));
      }
    }
  });

  renderSubjectList();
  renderSpotlight();
  renderTimeline();
}

function hydrateGuestOrAuth({ doc, route, activatePageStyles }) {
  const data = extractGuestOrAuthData(doc, route);
  activatePageStyles(['bangumi-auth.css', 'phase-b-hydrated.css']);

  // 抢救真实登录/注册表单（保持原有事件、验证码图片、Passkey 与 formhash 完整可用）
  const liveLoginForm = doc.getElementById('loginForm');
  const liveSignupForm = doc.querySelector('form[name="signup"], form[action*="/signup"]');
  const liveForm = data.mode === 'signup' ? liveSignupForm || liveLoginForm : liveLoginForm || liveSignupForm;
  if (liveForm && liveForm.parentNode) {
    liveForm.parentNode.removeChild(liveForm);
  }

  stashOriginalMain(doc);

  let html = '';
  if (data.mode === 'guest') {
    const featuredHtml = data.featured
      .map(
        (f) =>
          `<a class="bau-cover-card" href="${escapeHtml(f.href)}">` +
            `<div class="bau-cover-frame">${f.cover ? `<img src="${escapeHtml(f.cover)}" alt="${escapeHtml(f.title)}" referrerpolicy="no-referrer" loading="lazy" />` : ''}</div>` +
            `<div class="bau-cover-title">${escapeHtml(f.title)}</div>` +
            (f.meta ? `<div class="bau-cover-follow">${escapeHtml(f.meta)}</div>` : '') +
          `</a>`
      )
      .join('');

    const calHtml = data.calendarItems
      .map(
        (c) =>
          `<a class="bau-cover-card" href="${escapeHtml(c.href)}">` +
            `<div class="bau-cover-frame">${c.cover ? `<img src="${escapeHtml(c.cover)}" alt="${escapeHtml(c.title)}" referrerpolicy="no-referrer" loading="lazy" />` : ''}</div>` +
            `<div class="bau-cover-title">${escapeHtml(c.title)}</div>` +
          `</a>`
      )
      .join('');

    const tmlHtml = data.timelineItems
      .map(
        (t) =>
          `<div class="bau-tml-item">` +
            `<img src="${escapeHtml(t.avatar)}" alt="" referrerpolicy="no-referrer" />` +
            `<div><div>${t.actionHtml}</div><small>${escapeHtml(t.time)}</small></div>` +
          `</div>`
      )
      .join('');

    html = `
      <section class="bau-mode-bar">
        <div class="bau-mode-title">
          <span class="bau-mode-badge">BANGUMI</span>
          <span>Bangumi 番组计划 · ACG 圣地与时光机档案</span>
        </div>
        <div class="bau-mode-tabs">
          <a href="/login" class="bau-mode-tab is-active">🔑 登录</a>
          <a href="/signup" class="bau-mode-tab">🌸 注册</a>
          <a href="/anime" class="bau-mode-tab">📺 浏览动画</a>
        </div>
      </section>
      <div class="bau-home-columns">
        <div>
          <section class="bau-card" style="margin-bottom:20px;">
            <div class="bau-slide-copy">
              <h2>${escapeHtml(data.slides[0]?.heading || '记录你的 ACG 时光轨迹')}</h2>
              <p>${escapeHtml(data.slides[0]?.lines?.[0] || '动画、书籍、音乐、游戏、三次元——全站条目与社区讨论一应俱全。')}</p>
              <div class="bau-slide-actions">
                <a href="/signup" class="bau-btn-blue">🌸 注册成为会员</a>
                <a href="/anime" class="bau-btn-gray">📺 探索五大频道 →</a>
              </div>
            </div>
          </section>
          ${featuredHtml ? `<section class="bau-card" style="margin-bottom:20px;"><div class="bau-section-head"><h3>近期热门关注</h3><a href="/anime/browser?sort=trends">更多 »</a></div><div class="bau-cover-grid">${featuredHtml}</div></section>` : ''}
          ${calHtml ? `<section class="bau-card"><div class="bau-section-head"><h3>每日放送</h3><a href="/calendar">完整放送表 »</a></div><div class="bau-cover-grid">${calHtml}</div></section>` : ''}
        </div>
        <aside class="bau-side-stack">
          <section class="bau-card">
            <div class="bau-section-head"><h3>快速登录</h3><a href="/login">完整登录页 »</a></div>
            <div id="bauLiveFormMount"></div>
            <div style="margin-top:12px;display:flex;gap:10px;font-size:12px;">
              <a href="/lost_password" style="color:var(--accent);">找回密码</a>
              <a href="/signup" style="color:var(--accent);">注册新账号</a>
            </div>
          </section>
          ${tmlHtml ? `<section class="bau-card"><div class="bau-section-head"><h3>全站实时动态</h3><a href="/timeline">全部 »</a></div><div class="bau-tml-list">${tmlHtml}</div></section>` : ''}
        </aside>
      </div>`;
  } else {
    html = `
      <section class="bau-mode-bar">
        <div class="bau-mode-title">
          <span class="bau-mode-badge">BANGUMI</span>
          <span>${escapeHtml(data.authHeading)}</span>
        </div>
        <div class="bau-mode-tabs">
          <a href="/" class="bau-mode-tab">🏠 返回首页</a>
          <a href="/login" class="bau-mode-tab${data.mode === 'login' ? ' is-active' : ''}">🔑 登录</a>
          <a href="/signup" class="bau-mode-tab${data.mode === 'signup' ? ' is-active' : ''}">🌸 注册</a>
        </div>
      </section>
      <div class="bau-login-grid">
        <section class="bau-card">
          <h2 style="margin-bottom:14px;">${escapeHtml(data.authHeading)}</h2>
          <div id="bauLiveFormMount"></div>
        </section>
        <aside class="bau-side-stack">
          <section class="bau-card">
            <h3>安全提示</h3>
            <p style="margin-top:8px;font-size:13px;color:var(--muted);">已完整保留 Bangumi 原站 <code>formhash</code>、验证码与 Passkey 登录支持，表单将直接提交至官方认证接口。</p>
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;font-size:13px;">
              <a href="/lost_password">🛟 忘记密码 / 重置密码</a>
              <a href="/help">📖 注册与登录帮助</a>
            </div>
          </section>
        </aside>
      </div>`;
  }

  mountHydratedStage(doc, { tag: 'main', id: 'main', className: 'bau-shell', html });

  const mountTarget = doc.getElementById('bauLiveFormMount');
  if (mountTarget && liveForm) {
    liveForm.querySelectorAll('input.inputtext, input[type="text"], input[type="password"], input[type="email"]').forEach((inp) => {
      inp.classList.add('bau-input');
    });
    liveForm.querySelectorAll('input.inputBtn[type="submit"], button[type="submit"]').forEach((btn) => {
      btn.classList.add('bau-submit');
    });
    liveForm.querySelectorAll('.passkeyLoginButton').forEach((btn) => {
      btn.classList.add('bau-passkey');
    });
    mountTarget.appendChild(liveForm);
  } else if (mountTarget) {
    mountTarget.innerHTML = '<a href="/login" class="bau-btn-blue" style="display:inline-flex;justify-content:center;width:100%;">前往 Bangumi 登录页 →</a>';
  }
}

export function hydrateHomePage(ctx) {
  if (ctx.route.page === 'P02') {
    hydrateGuestOrAuth(ctx);
  } else {
    hydrateLoggedInHome(ctx);
  }
}
