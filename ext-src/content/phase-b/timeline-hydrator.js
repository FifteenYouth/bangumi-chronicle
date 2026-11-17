/**
 * Bangumi Chronicle · P03 时空管理局 & 个人时间胶囊真站水合器 (timeline-hydrator.js)
 */

import {
  escapeHtml,
  submitTimelineSay,
  fetchTimelineReplies,
  submitTimelineReply,
  eraseActionLink,
} from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from './dom-vault.js';
import { extractTimelineData } from './timeline-extractor.js';

function renderTenStars(score) {
  const n = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
  if (!n) return '';
  return (
    `<span class="btl-stars-ten starstop-ten" title="${n} / 10">` +
      `<span class="stars-filled">${'★'.repeat(n)}</span>` +
      `<span class="stars-empty">${'☆'.repeat(10 - n)}</span>` +
      `<span class="btl-stars-num stars-score-num">${n}</span>` +
    `</span>`
  );
}

const CAT_NAMES = {
  progress: '收视进度',
  subject: '条目收藏',
  say: '日常吐槽',
  mono: '人物角色',
  relation: '好友动态',
  group: '小组话题',
  blog: '日志长评',
  wiki: '维基修订',
  index: '目录策展',
};

export function hydrateTimelinePage({ doc, route, session, activatePageStyles, toast }) {
  const data = extractTimelineData(doc, route);
  activatePageStyles(['bangumi-timeline.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const tabsHtml = data.tabs
    .map(
      (tb) =>
        `<li><a href="${escapeHtml(tb.href)}" class="${tb.active ? 'focus' : ''}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  const renderItem = (item) =>
    `<article class="btl-item" data-tml-id="${escapeHtml(item.id)}">` +
      `<a class="btl-ava-link" href="${escapeHtml(item.userHref)}"><img class="btl-ava-box" src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.user)}" referrerpolicy="no-referrer" loading="lazy" /></a>` +
      `<div class="btl-item-body">` +
        `<div class="btl-action-line">` +
          (!item.actionHtml.includes('/user/') && data.isCapsule && data.profile
            ? `<a class="btl-user-name" href="/user/${encodeURIComponent(data.profile.uid)}">${escapeHtml(data.profile.nickname)}</a> `
            : '') +
          item.actionHtml +
          (item.stars && !item.card ? ' ' + renderTenStars(item.stars) : '') +
        `</div>` +
        (item.quoteText ? `<div class="btl-status-quote">${escapeHtml(item.quoteText)}</div>` : '') +
        (item.card
          ? `<a class="btl-subject-card${item.card.isTiny ? ' is-tiny' : ''}" href="${escapeHtml(item.card.href)}">` +
              (item.card.cover ? `<img class="btl-card-cover" src="${escapeHtml(item.card.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy" />` : '') +
              `<div class="btl-card-info">` +
                `<div class="btl-card-title">${escapeHtml(item.card.title)}</div>` +
                (item.card.info ? `<div class="btl-card-meta">${escapeHtml(item.card.info)}</div>` : '') +
                (item.stars ? `<div class="btl-card-rate">${renderTenStars(item.stars)}</div>` : '') +
              `</div>` +
            `</a>`
          : '') +
        (item.likeChips?.length
          ? `<div class="btl-likes-row">` +
              item.likeChips
                .map((lk) => `<span class="btl-like-chip">${escapeHtml(lk.emoji)} <b>${lk.count}</b></span>`)
                .join('') +
            `</div>`
          : '') +
        `<div class="btl-post-actions">` +
          `<span>${escapeHtml(item.time)}</span>` +
          (item.replyUrl
            ? `<button type="button" class="btl-like-chip" data-bgm-tml-reply="${escapeHtml(item.replyUrl)}" data-tml-id="${escapeHtml(item.id)}">💬 回复${item.replyCount > 0 ? ` (${item.replyCount})` : ''}</button>`
            : '') +
          (item.delUrl
            ? `<button type="button" class="btl-like-chip" data-bgm-tml-del="${escapeHtml(item.delUrl)}" data-tml-id="${escapeHtml(item.id)}">🗑 删除</button>`
            : '') +
        `</div>` +
        `<div class="btl-reply-drawer" id="btlDrawer_${escapeHtml(item.id)}" hidden></div>` +
      `</div>` +
    `</article>`;

  // 按日期分组渲染为 .btl-date-group 卡片
  const dateGroups = [];
  for (const it of data.items) {
    const label = it.dateLabel || '最近动态';
    let grp = dateGroups[dateGroups.length - 1];
    if (!grp || grp.label !== label) {
      grp = { label, list: [] };
      dateGroups.push(grp);
    }
    grp.list.push(it);
  }

  const streamHtml = dateGroups.length
    ? dateGroups
        .map(
          (g) =>
            `<section class="btl-date-group">` +
              `<h3 class="btl-date-header"><span>📅 ${escapeHtml(g.label)}</span><span class="btl-date-count">${g.list.length} 条动态</span></h3>` +
              `<div class="btl-item-list">${g.list.map(renderItem).join('')}</div>` +
            `</section>`
        )
        .join('')
    : '<div class="btl-empty-state">当前条件下暂无时间线动态</div>';

  const pagerHtml = data.pagerLinks.length
    ? `<div class="btl-pager-wrap"><div class="page_inner">` +
        data.pagerLinks
          .map((p) =>
            p.current
              ? `<span class="btl-page-btn p_cur is-active">${escapeHtml(p.label)}</span>`
              : `<a class="btl-page-btn" href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a>`
          )
          .join('') +
      `</div></div>`
    : '';

  const myCapsuleLink =
    session?.loggedIn && session?.uid ? `/user/${encodeURIComponent(session.uid)}/timeline` : '/login';

  // 统计当前页动态分类分布
  const catCounts = {};
  data.items.forEach((it) => {
    const k = it.category || 'say';
    catCounts[k] = (catCounts[k] || 0) + 1;
  });
  const totalItems = Math.max(1, data.items.length);
  const statsRowsHtml = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, cnt]) => {
      const pct = Math.round((cnt / totalItems) * 100);
      return (
        `<div class="btl-stat-item">` +
          `<div class="btl-stat-head"><span>${escapeHtml(CAT_NAMES[k] || k)}</span><span>${cnt} 条 (${pct}%)</span></div>` +
          `<div class="btl-stat-bar"><div class="btl-stat-fill" style="width:${pct}%"></div></div>` +
        `</div>`
      );
    })
    .join('');

  const composerHtml = data.sayForm
    ? `<form class="btl-say-box" id="bgmHydratedSayForm" action="${escapeHtml(data.sayForm.action)}" method="post">` +
        `<input type="hidden" name="formhash" value="${escapeHtml(data.sayForm.formhash || session?.formhash || '')}" />` +
        `<div class="btl-say-head">` +
          (session?.avatar
            ? `<img class="btl-say-ava" src="${escapeHtml(session.avatar)}" alt="" referrerpolicy="no-referrer" />`
            : '') +
          `<div class="btl-say-meta"><strong>${escapeHtml(session?.nickname || 'Bangumi')}</strong><span>向时间胶囊投递一条此刻电波</span></div>` +
          `<span class="btl-char-counter" id="btlCharCount">0 / 380</span>` +
        `</div>` +
        `<textarea name="say_input" id="bgmHydratedSayInput" class="btl-say-input" maxlength="380" rows="2" placeholder="在想什么、刚刚补完了哪一话？"></textarea>` +
        `<div class="btl-say-toolbar"><span style="font-size:11.5px;color:var(--muted);">真实同步至个人时间线</span><button type="submit" class="btl-say-submit">写好了</button></div>` +
      `</form>`
    : '';

  const headerHtml =
    data.isCapsule && data.profile
      ? `<section class="btl-profile-shell" id="bgmCapsuleBanner">
          <div class="btl-hero-backdrop" aria-hidden="true"></div>
          <div class="btl-profile-top">
            <div class="btl-profile-user">
              <img class="btl-profile-ava" src="${escapeHtml(data.profile.avatar)}" alt="${escapeHtml(data.profile.nickname)}" referrerpolicy="no-referrer" />
              <div>
                <h1 class="btl-profile-name">
                  <span>${escapeHtml(data.profile.nickname)} 的时间胶囊</span>
                  <span class="btl-profile-uid">@${escapeHtml(data.profile.uid)}</span>
                </h1>
                <p class="btl-profile-sign">记录在 Bangumi 的每一次章节打卡、收藏评分与日常电波</p>
              </div>
            </div>
            <div class="btl-profile-actions">
              <a class="btl-profile-link-btn is-primary" href="/user/${encodeURIComponent(data.profile.uid)}">🕰️ 返回时光机</a>
              <a class="btl-profile-link-btn" href="/timeline">🌐 全站时间线</a>
            </div>
          </div>
          ${
            data.profile.navLinks.length
              ? `<ul class="btl-nav-tabs">` +
                  data.profile.navLinks
                    .map(
                      (lk) =>
                        `<li><a href="${escapeHtml(lk.href)}" class="${lk.active ? 'focus' : ''}">${escapeHtml(lk.label)}</a></li>`
                    )
                    .join('') +
                `</ul>`
              : ''
          }
        </section>`
      : `<section class="btl-hero-shell" id="bgmTimelineHero">
          <div class="btl-hero-backdrop" aria-hidden="true"></div>
          <div class="btl-hero-inner">
            <div class="btl-hero-top">
              <div>
                <div class="btl-kicker-row">
                  <span class="btl-kicker-badge">SPACETIME BUREAU</span>
                  <span class="btl-kicker-sub">全站与好友实时动态流</span>
                </div>
                <h1 class="btl-main-title">${escapeHtml(data.heading)}</h1>
              </div>
              <div class="btl-scope-pills">
                <a class="btl-scope-pill is-active" href="/timeline">🌐 全站动态</a>
                <a class="btl-scope-pill" href="${myCapsuleLink}">💊 我的时间胶囊</a>
              </div>
            </div>
          </div>
        </section>`;

  const stageHtml = `
    ${headerHtml}
    <div class="btl-columns">
      <div class="btl-col-main" id="bgmTimelineColA">
        <div class="btl-tabs-bar"><ul class="btl-tabs">${tabsHtml}</ul></div>
        ${composerHtml}
        <div class="btl-stream" id="bgmTimelineStream">${streamHtml}</div>
        ${pagerHtml}
      </div>
      <aside class="btl-col-side" id="bgmTimelineColB">
        <div class="btl-side-card">
          <h2>📡 视野切换</h2>
          <div class="btl-side-scope-list">
            <a class="btl-side-scope-btn${!data.isCapsule ? ' is-active' : ''}" href="/timeline"><span>🌐 全站时间线</span><span>→</span></a>
            <a class="btl-side-scope-btn${data.isCapsule ? ' is-active' : ''}" href="${myCapsuleLink}"><span>💊 我的时间胶囊</span><span>→</span></a>
          </div>
        </div>
        ${
          statsRowsHtml
            ? `<div class="btl-side-card"><h2>📊 本页动态构成</h2><div class="btl-stat-row">${statsRowsHtml}</div></div>`
            : ''
        }
        <div class="btl-side-card">
          <h2>🔗 订阅与导航</h2>
          <a class="btl-rss-pill" href="${escapeHtml(data.rssHref)}"><span>📡 RSS 2.0 订阅当前动态流</span><span>↗</span></a>
          <div class="btl-hub-links">
            <a class="btl-hub-link" href="/">首页</a>
            <a class="btl-hub-link" href="/rakuen">超展开</a>
            <a class="btl-hub-link" href="/calendar">每日放送</a>
            <a class="btl-hub-link" href="/anime">动画频道</a>
          </div>
        </div>
      </aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'btl-main-container',
    html: stageHtml,
  });

  doc.getElementById('bgmHydratedSayInput')?.addEventListener('input', (ev) => {
    const cntEl = doc.getElementById('btlCharCount');
    if (cntEl) cntEl.textContent = `${ev.target.value.length} / 380`;
  });

  mainEl.addEventListener('click', async (ev) => {
    const replyBtn = ev.target.closest('[data-bgm-tml-reply]');
    if (replyBtn) {
      const tmlId = replyBtn.getAttribute('data-tml-id');
      const url = replyBtn.getAttribute('data-bgm-tml-reply');
      const drawer = doc.getElementById(`btlDrawer_${tmlId}`);
      if (!drawer) return;
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden && !drawer.dataset.loaded) {
        drawer.innerHTML = '<div style="padding:8px;font-size:12px;">正在加载回复…</div>';
        try {
          const { replies, form } = await fetchTimelineReplies(url);
          drawer.dataset.loaded = '1';
          drawer.innerHTML =
            `<div class="btl-reply-list">` +
              (replies.length
                ? replies
                    .map(
                      (r) =>
                        `<div class="btl-reply-item"><strong>${escapeHtml(r.user)}</strong>：${escapeHtml(r.text)} <small>${escapeHtml(r.time)}</small></div>`
                    )
                    .join('')
                : '<div style="font-size:12px;color:var(--muted);">暂无回复</div>') +
            `</div>` +
            `<form class="btl-reply-form" data-reply-action="${escapeHtml(form?.action || url)}" data-reply-hash="${escapeHtml(form?.formhash || session?.formhash || '')}">` +
              `<input class="btl-reply-input" type="text" name="content" placeholder="写下你的回复…" required />` +
              `<button class="btl-reply-send" type="submit">回复</button>` +
            `</form>`;
        } catch {
          drawer.innerHTML = '<div style="padding:8px;font-size:12px;">加载失败</div>';
        }
      }
      return;
    }

    const delBtn = ev.target.closest('[data-bgm-tml-del]');
    if (delBtn) {
      if (!confirm('确定删除这条动态？')) return;
      try {
        await eraseActionLink(delBtn.getAttribute('data-bgm-tml-del'));
        delBtn.closest('.btl-item')?.remove();
        toast('动态已删除');
      } catch (err) {
        toast('删除失败：' + (err?.message || '请重试'));
      }
    }
  });

  mainEl.addEventListener('submit', async (ev) => {
    if (ev.target.id === 'bgmHydratedSayForm' || ev.target.id === 'SayFrom') {
      ev.preventDefault();
      const ta = doc.getElementById('bgmHydratedSayInput') || doc.getElementById('SayInput');
      const fh = ev.target.querySelector('input[name="formhash"]')?.value || session?.formhash;
      try {
        await submitTimelineSay({
          action: ev.target.getAttribute('action') || '/timeline?ajax=1',
          formhash: fh,
          sayInput: ta.value,
        });
        toast('吐槽已发布，正在刷新…');
        location.reload();
      } catch (err) {
        toast('发布失败：' + (err?.message || '请重试'));
      }
      return;
    }

    const rForm = ev.target.closest('.btl-reply-form');
    if (rForm) {
      ev.preventDefault();
      const inp = rForm.querySelector('input[name="content"]');
      try {
        await submitTimelineReply({
          action: rForm.getAttribute('data-reply-action'),
          formhash: rForm.getAttribute('data-reply-hash') || session?.formhash,
          content: inp.value,
        });
        const list = rForm.previousElementSibling;
        if (list) {
          const item = doc.createElement('div');
          item.className = 'btl-reply-item';
          item.innerHTML = `<strong>${escapeHtml(session?.nickname || '我')}</strong>：${escapeHtml(inp.value.trim())} <small>刚刚</small>`;
          list.appendChild(item);
        }
        inp.value = '';
        toast('回复成功');
      } catch (err) {
        toast('回复失败：' + (err?.message || '请重试'));
      }
    }
  });
}
