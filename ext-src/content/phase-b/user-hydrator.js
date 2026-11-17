/**
 * Bangumi Chronicle · P25 个人时光机 & P26 用户专项收藏列表水合器 (user-hydrator.js)
 */

import { escapeHtml, eraseActionLink } from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from './dom-vault.js';
import { extractUserHomeData, extractUserCollectionData } from './user-extractor.js';

function renderTenStars(score) {
  const n = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
  if (!n) return '';
  return `<span class="starstop-ten" title="${n} 星评价"><span class="stars-filled">${'★'.repeat(n)}</span><span class="stars-empty">${'☆'.repeat(10 - n)}</span><strong class="stars-score-num">${n}</strong></span>`;
}

function renderProfileBanner(profile, opts = {}) {
  const { customBg = '', joinDate = '', allMetrics = [] } = opts;
  const bgUrl = customBg || profile.avatar;

  const actionsHtml = profile.actions
    .map((act) => {
      const cls = act.isPrimary ? 'profile-act-btn primary' : 'profile-act-btn';
      const onclickAttr = act.onclick ? ` onclick="${escapeHtml(act.onclick)}"` : '';
      return `<a class="${cls}" href="${escapeHtml(act.href || 'javascript:void(0)')}"${onclickAttr}>${escapeHtml(act.label)}</a>`;
    })
    .join('');

  const navHtml = profile.navTabs
    .map(
      (tb) =>
        `<li><a class="profile-nav-tab${tb.active ? ' active' : ''}" href="${escapeHtml(tb.href)}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  const countersHtml = allMetrics.length
    ? `<div class="profile-quick-counters">` +
        allMetrics
          .slice(0, 4)
          .map(
            (m) =>
              `<span class="profile-counter-item">${escapeHtml(m.desc)} <strong>${escapeHtml(m.num)}</strong></span>`
          )
          .join('') +
      `</div>`
    : '';

  return `
    <section class="profile-banner${customBg ? ' has-custom-art' : ''}" id="bgmUserBanner">
      <div class="profile-banner-backdrop" id="profileBackdrop" style="background-image:url('${escapeHtml(bgUrl)}')"></div>
      <div class="profile-banner-gradient"></div>
      <div class="profile-subject-inner">
        <div class="profile-hero-main">
          <div class="profile-identity-left">
            <div class="header-avatar-wrap">
              <div class="header-avatar-frame">
                <img class="header-avatar-img" src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(profile.nickname)}" referrerpolicy="no-referrer" />
              </div>
            </div>
            <div class="profile-title-group">
              <div class="profile-name-row">
                <h1 class="profile-nickname">${escapeHtml(profile.nickname)}</h1>
                <span class="profile-uid-handle">@${escapeHtml(profile.uid)}</span>
                ${profile.friendFlag ? `<span class="friend-flag-pill">✓ ${escapeHtml(profile.friendFlag)}</span>` : ''}
                ${joinDate ? `<span class="profile-joined-chip">· ${escapeHtml(joinDate)}</span>` : ''}
              </div>
              ${countersHtml}
            </div>
          </div>
          <div class="profile-actions-bar">${actionsHtml}</div>
        </div>
        <ul class="profile-nav-tabs">${navHtml}</ul>
      </div>
    </section>`;
}

function hydrateUserHome({ doc, route, activatePageStyles }) {
  const data = extractUserHomeData(doc, route);
  activatePageStyles(['bangumi-user.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const allStats = data.statsByTab.all || Object.values(data.statsByTab)[0] || { metrics: [], chartBars: [] };

  const servicesHtml = data.services
    .map((s) => {
      if (s.rawHtml) {
        return `<li class="net-service-chip net-service-custom"${s.liId ? ` id="${escapeHtml(s.liId)}"` : ''}>${s.rawHtml}</li>`;
      }
      const svcLower = (s.svc || '').toLowerCase();
      let toneCls = 'bgm';
      if (svcLower.includes('steam')) toneCls = 'steam';
      else if (svcLower.includes('psn') || svcLower.includes('playstation')) toneCls = 'psn';
      else if (svcLower.includes('xbox')) toneCls = 'xbox';
      else if (svcLower.includes('git')) toneCls = 'github';
      else if (svcLower.includes('ins')) toneCls = 'ins';
      const bgStyle = s.bgColor ? ` style="background:${escapeHtml(s.bgColor)};color:#fff;"` : '';
      const inner = `<span class="net-service-tag ${toneCls}"${bgStyle}>${escapeHtml(s.svc || 'LINK')}</span><span>${escapeHtml(s.tip)}</span>`;
      return s.href
        ? `<li><a class="net-service-chip" href="${escapeHtml(s.href)}" target="_blank" rel="noopener">${inner}</a></li>`
        : `<li><span class="net-service-chip">${inner}</span></li>`;
    })
    .join('');

  const syncHtml = data.sync
    ? `<aside class="user-sync-card">
        <div class="sync-header-row">
          <div class="sync-title-group"><span class="sync-kicker">SYNCHRONICITY</span><h3 class="sync-title">电波同步率</h3></div>
          <div class="sync-score-badge">
            <span class="sync-pct-int">${escapeHtml(data.sync.pctInt)}</span>
            <span class="sync-pct-dec">${escapeHtml(data.sync.pctDec)}</span>
          </div>
        </div>
        <div class="sync-bar-track"><div class="sync-bar-fill" style="width:${Math.min(100, data.sync.pct)}%"></div></div>
        <div class="sync-meta-row">
          <span>${escapeHtml(data.sync.shared || '')}</span>
        </div>
      </aside>`
    : '';

  const channelsHtml = data.channels
    .map((ch) => {
      const statusPills = ch.statuses
        .map(
          (st) =>
            `<li><a class="cat-status-pill" href="${escapeHtml(st.href)}"><span>${escapeHtml(st.label)}</span><strong>${escapeHtml(st.count)}</strong></a></li>`
        )
        .join('');

      const groupsMarkup = ch.groups
        .map((grp) => {
          const cardsHtml = grp.items
            .map((it) => {
              const posterInner = it.cover
                ? `<img class="cover-wall-img" src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                : `<div class="cover-wall-no-icon"><span>${escapeHtml(ch.icon)}</span><small>${escapeHtml(it.title.slice(0, 18))}</small></div>`;
              return (
                `<li>` +
                  `<a class="cover-wall-item" href="${escapeHtml(it.href)}" title="${escapeHtml(it.title)}${it.cnTitle ? ' / ' + escapeHtml(it.cnTitle) : ''}">` +
                    `<div class="cover-wall-poster-wrap${ch.isSquare ? ' is-music-square' : ''}">` +
                      posterInner +
                      (it.cnTitle ? `<div class="cover-wall-hover-quote">${escapeHtml(it.cnTitle)}</div>` : '') +
                    `</div>` +
                    `<span class="cover-wall-title">${escapeHtml(it.title)}</span>` +
                  `</a>` +
                `</li>`
              );
            })
            .join('');

          return (
            `<div class="cat-status-group-block">` +
              (grp.label && ch.groups.length > 1
                ? `<div class="cat-group-subhead"><span class="doing-status-tag">${escapeHtml(grp.label)}</span></div>`
                : '') +
              `<ul class="cat-cover-wall">${cardsHtml}</ul>` +
            `</div>`
          );
        })
        .join('');

      return `<section class="user-cat-showcase-card" data-channel="${escapeHtml(ch.key)}">
        <div class="cat-showcase-header">
          <div class="cat-title-wrap">
            <span class="cat-icon-badge">${escapeHtml(ch.icon)}</span>
            <h2 class="cat-showcase-title"><a href="${escapeHtml(ch.href)}">${escapeHtml(ch.label)}</a></h2>
          </div>
          <ul class="cat-status-pills">
            ${statusPills}
            <li><a class="cat-more-link" href="${escapeHtml(ch.href)}">全部 »</a></li>
          </ul>
        </div>
        ${groupsMarkup || '<p style="font-size:12.5px;color:var(--muted);padding:12px 0;">该频道下暂无公开展示条目</p>'}
      </section>`;
    })
    .join('');

  // 个人日志卡片 (仅当用户有日志或存在 #blog 区块时展示)
  const uidEnc = encodeURIComponent(data.profile.uid);
  const blogHtml = data.blogs.length
    ? `<section class="user-cat-showcase-card">
        <div class="cat-showcase-header">
          <div class="cat-title-wrap">
            <span class="cat-icon-badge">✒️</span>
            <h2 class="cat-showcase-title"><a href="/user/${uidEnc}/blog">我的日志</a></h2>
          </div>
          <a href="/user/${uidEnc}/blog" class="cat-more-link">全部 »</a>
        </div>
        <div class="user-blog-list">
          ${data.blogs
            .map(
              (b) =>
                `<article class="user-blog-card"><div class="blog-card-body"><div class="blog-card-title-row"><a class="blog-card-title" href="${escapeHtml(b.href)}">${escapeHtml(b.title)}</a></div>${b.time ? `<div class="blog-card-meta"><span>${escapeHtml(b.time)}</span></div>` : ''}${b.excerpt ? `<p class="blog-card-excerpt">${escapeHtml(b.excerpt)}</p>` : ''}</div></article>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  // 右栏 Card B1: 收藏统计透视
  const statsTabsList = data.statsTabs.length
    ? data.statsTabs
    : Object.keys(data.statsByTab).map((k, idx) => ({
        key: k,
        label: k === 'all' ? '全部' : k,
        active: idx === 0,
      }));

  const statsPanelHtml = Object.keys(data.statsByTab).length
    ? `<section class="side-panel-card" id="userStatsPanel">
        <div class="side-panel-head">
          <h3 class="side-panel-title">📊 收藏统计</h3>
          <span style="font-family:var(--mono);font-size:11px;color:var(--muted);">10★–1★</span>
        </div>
        ${
          statsTabsList.length > 1
            ? `<ul class="user-stats-tabs" id="bgmUserStatsTabs">` +
                statsTabsList
                  .map(
                    (t) =>
                      `<li><button type="button" class="user-stats-tab-btn${t.active ? ' active' : ''}" data-bgm-stats-tab="${escapeHtml(t.key)}">${escapeHtml(t.label)}</button></li>`
                  )
                  .join('') +
              `</ul>`
            : ''
        }
        <div class="user-grid-stats" id="bgmUserStatsGrid"></div>
        <div id="bgmChartWrapper">
          <div class="user-chart-inspect-bar" id="bgmChartInspectBar">
            <span class="user-chart-inspect-star" id="bgmChartInspectStar">评分分布</span>
            <span class="user-chart-inspect-val" id="bgmChartInspectVal"></span>
          </div>
          <div class="user-hist-columns" id="bgmUserHistCols"></div>
          <div class="user-hist-labels">
            <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span>
            <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
          </div>
        </div>
      </section>`
    : '';

  // 右栏 Card B2: 时间胶囊
  const capsuleHtml = data.capsule.length
    ? `<section class="side-panel-card" id="pinnedCapsuleCard">
        <div class="side-panel-head">
          <h3 class="side-panel-title">💊 时间胶囊</h3>
          <a href="/user/${uidEnc}/timeline" style="font-size:11.5px;font-weight:700;color:var(--accent);text-decoration:none;">更多 »</a>
        </div>
        <div class="capsule-filter-row" id="bgmCapsuleFilterRow">
          <button type="button" class="capsule-filter-btn active" data-cap-filter="all">全部</button>
          <button type="button" class="capsule-filter-btn" data-cap-filter="collect">收藏</button>
          <button type="button" class="capsule-filter-btn" data-cap-filter="progress">进度</button>
        </div>
        <ul class="timeline-dots-list" id="userTimelineDots">
          ${data.capsule
            .map(
              (c) =>
                `<li class="timeline-dot-item" data-cap-cat="${escapeHtml(c.category)}"><span class="timeline-dot-node"></span><div class="timeline-dot-body">${c.html}</div>${c.time ? `<span class="timeline-time-stamp">${escapeHtml(c.time)}</span>` : ''}</li>`
            )
            .join('')}
        </ul>
      </section>`
    : '';

  // 右栏 Card B3: 收藏的角色与人物
  const monoHtml = data.mono.length
    ? `<section class="side-panel-card" id="bgmUserMonoCard">
        <div class="side-panel-head">
          <h3 class="side-panel-title">👤 我收藏的人物</h3>
          <a href="/user/${uidEnc}/mono" style="font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:700;">更多 »</a>
        </div>
        <div class="port-avatar-grid">
          ${data.mono
            .map(
              (it) =>
                `<a class="port-avatar-card" href="${escapeHtml(it.href)}" title="${escapeHtml(it.title)}"><img class="port-avatar-img" src="${escapeHtml(it.avatar)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" /><span class="port-avatar-name">${escapeHtml(it.title)}</span></a>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  // 右栏 Card B4: 参加的小组
  const groupsHtml = data.groups.length
    ? `<section class="side-panel-card" id="bgmUserGroupCard">
        <div class="side-panel-head">
          <h3 class="side-panel-title">🏛️ 我参加的小组</h3>
          <a href="/user/${uidEnc}/groups" style="font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:700;">全部 (${data.groups.length}) »</a>
        </div>
        <ul class="groups-line-grid">
          ${data.groups
            .map(
              (g) =>
                `<li><a class="group-line-card" href="${escapeHtml(g.href)}"><img class="group-line-icon" src="${escapeHtml(g.avatar)}" alt="${escapeHtml(g.title)}" referrerpolicy="no-referrer" loading="lazy" /><div class="group-line-meta"><div class="group-line-title">${escapeHtml(g.title)}</div>${g.count ? `<div class="group-line-count">${escapeHtml(g.count)}</div>` : ''}</div></a></li>`
            )
            .join('')}
        </ul>
      </section>`
    : '';

  // 右栏 Card B5: 我的朋友 + 维基 & RSS
  const friendsHtml = `<section class="side-panel-card" id="bgmUserFriendCard">
      <div class="side-panel-head">
        <h3 class="side-panel-title">🤝 我的朋友</h3>
        <a href="/user/${uidEnc}/friends" style="font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:700;">更多 »</a>
      </div>
      ${
        data.friends.length
          ? `<div class="port-avatar-grid">` +
              data.friends
                .map(
                  (f) =>
                    `<a class="port-avatar-card" href="${escapeHtml(f.href)}" title="${escapeHtml(f.title)}"><img class="port-avatar-img" src="${escapeHtml(f.avatar)}" alt="${escapeHtml(f.title)}" referrerpolicy="no-referrer" loading="lazy" /><span class="port-avatar-name">${escapeHtml(f.title)}</span></a>`
                )
                .join('') +
            `</div>`
          : `<p style="font-size:12px;color:var(--muted);">暂无好友</p>`
      }
      <div class="wiki-rss-footer">
        <a href="${escapeHtml(data.wikiHref)}" style="color:var(--accent);font-weight:700;">📚 维基编辑记录 »</a>
        <a href="${escapeHtml(data.rssHref)}" class="rss-subscribe-pill">📡 RSS 订阅收藏</a>
      </div>
    </section>`;

  const hasBioOrServices = Boolean(data.bioCleanHtml || servicesHtml || syncHtml);
  const userBoxHtml = hasBioOrServices
    ? `<section class="user-box-card"${!data.sync ? ' style="grid-template-columns:1fr;"' : ''}>
        <div class="user-bio-column">
          ${data.bioCleanHtml ? `<div class="user-bio-quote"><div class="user-bio-text">${data.bioCleanHtml}</div></div>` : ''}
          ${servicesHtml ? `<ul class="network-service-row">${servicesHtml}</ul>` : ''}
        </div>
        ${syncHtml}
      </section>`
    : '';

  const html =
    renderProfileBanner(data.profile, {
      customBg: data.customBg,
      joinDate: data.joinDate,
      allMetrics: allStats.metrics,
    }) +
    `<div class="bgm-user-home-body">
      ${userBoxHtml}
      <div class="user-home-grid">
        <div class="user-col-a" id="bgmUserColA">
          <div class="category-quick-filter-bar">
            <div class="cat-filter-pills">
              <button type="button" class="cat-filter-pill active" data-cat-filter="all">全部</button>
              <button type="button" class="cat-filter-pill" data-cat-filter="anime">🎬 动画</button>
              <button type="button" class="cat-filter-pill" data-cat-filter="book">📚 书籍</button>
              <button type="button" class="cat-filter-pill" data-cat-filter="music">💿 音乐</button>
              <button type="button" class="cat-filter-pill" data-cat-filter="game">🎮 游戏</button>
              <button type="button" class="cat-filter-pill" data-cat-filter="real">🎞️ 三次元</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:20px;" id="userCategoryShowcases">${channelsHtml}</div>
          ${blogHtml}
        </div>
        <aside class="user-col-b" id="bgmUserColB">
          ${statsPanelHtml}
          ${capsuleHtml}
          ${monoHtml}
          ${groupsHtml}
          ${friendsHtml}
        </aside>
      </div>
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

  let currentPeakInfo = { star: '8★ 最高频分布', val: '' };

  function renderStatsTab(tabKey) {
    const block = data.statsByTab[tabKey] || allStats;
    const gridEl = doc.getElementById('bgmUserStatsGrid');
    const colsEl = doc.getElementById('bgmUserHistCols');
    const starEl = doc.getElementById('bgmChartInspectStar');
    const valEl = doc.getElementById('bgmChartInspectVal');
    if (gridEl && block.metrics) {
      gridEl.innerHTML = block.metrics
        .map(
          (m) =>
            `<div class="stat-metric-tile ${escapeHtml(m.tone || 'tone-collect')}"><span class="stat-metric-num">${escapeHtml(m.num)}</span><span class="stat-metric-label">${escapeHtml(m.desc)}</span></div>`
        )
        .join('');
    }
    if (colsEl && block.chartBars) {
      const byStar = new Map(block.chartBars.map((b) => [String(b.label), b]));
      const ordered = [];
      for (let s = 10; s >= 1; s--) {
        ordered.push(
          byStar.get(String(s)) || { label: String(s), count: 0, heightPct: 0, pctText: '0.0%' }
        );
      }
      let peakStar = ordered[0];
      let maxCount = 0;
      ordered.forEach((b) => {
        if (b.count > maxCount) maxCount = b.count;
        if (b.count > (peakStar?.count || 0)) peakStar = b;
      });
      if (peakStar) {
        currentPeakInfo = {
          star: `${peakStar.label}★ 最高频`,
          val: `${peakStar.count} 部 (${peakStar.pctText || '0%'})`,
        };
      }
      if (starEl && valEl) {
        starEl.textContent = currentPeakInfo.star;
        valEl.textContent = currentPeakInfo.val;
      }
      colsEl.innerHTML = ordered
        .map((b) => {
          const isPeak = peakStar && b.label === peakStar.label && b.count > 0 ? ' is-peak' : '';
          const normH = maxCount > 0 ? Math.round((b.count / maxCount) * 86) : 0;
          const h = b.count > 0 ? Math.max(12, Math.min(92, normH)) : 4;
          return (
            `<div class="user-hist-col${isPeak}" data-star="${escapeHtml(b.label)}" data-count="${b.count}" data-pct="${escapeHtml(b.pctText || '0%')}">` +
              `<span class="user-hist-count-top">${b.count > 0 ? b.count : ''}</span>` +
              `<div class="user-hist-bar" style="height:${h}%"></div>` +
            `</div>`
          );
        })
        .join('');
    }
  }

  const initialStatsTab = statsTabsList.find((t) => t.active)?.key || statsTabsList[0]?.key || 'all';
  renderStatsTab(initialStatsTab);

  mainEl.addEventListener('pointerover', (ev) => {
    const col = ev.target.closest?.('.user-hist-col');
    if (!col) return;
    const starEl = doc.getElementById('bgmChartInspectStar');
    const valEl = doc.getElementById('bgmChartInspectVal');
    if (starEl && valEl) {
      starEl.textContent = `${col.getAttribute('data-star')}★ 评分`;
      valEl.textContent = `${col.getAttribute('data-count')} 部 (${col.getAttribute('data-pct')})`;
    }
  });

  doc.getElementById('bgmUserHistCols')?.addEventListener('pointerleave', () => {
    const starEl = doc.getElementById('bgmChartInspectStar');
    const valEl = doc.getElementById('bgmChartInspectVal');
    if (starEl && valEl) {
      starEl.textContent = currentPeakInfo.star;
      valEl.textContent = currentPeakInfo.val;
    }
  });

  mainEl.addEventListener('click', (ev) => {
    const filterBtn = ev.target.closest('[data-cat-filter]');
    if (filterBtn) {
      const target = filterBtn.getAttribute('data-cat-filter');
      mainEl.querySelectorAll('[data-cat-filter]').forEach((b) => b.classList.toggle('active', b === filterBtn));
      mainEl.querySelectorAll('[data-channel]').forEach((sec) => {
        sec.hidden = target !== 'all' && sec.getAttribute('data-channel') !== target;
      });
      return;
    }

    const statsBtn = ev.target.closest('[data-bgm-stats-tab]');
    if (statsBtn) {
      const key = statsBtn.getAttribute('data-bgm-stats-tab');
      mainEl
        .querySelectorAll('[data-bgm-stats-tab]')
        .forEach((b) => b.classList.toggle('active', b === statsBtn));
      renderStatsTab(key);
      return;
    }

    const capBtn = ev.target.closest('[data-cap-filter]');
    if (capBtn) {
      const cat = capBtn.getAttribute('data-cap-filter');
      mainEl.querySelectorAll('[data-cap-filter]').forEach((b) => b.classList.toggle('active', b === capBtn));
      mainEl.querySelectorAll('#userTimelineDots .timeline-dot-item').forEach((li) => {
        li.hidden = cat !== 'all' && li.getAttribute('data-cap-cat') !== cat;
      });
    }
  });
}

function hydrateUserCollection({ doc, route, activatePageStyles, toast }) {
  const data = extractUserCollectionData(doc, route);
  activatePageStyles(['bangumi-user.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  let layoutMode = 'list';

  const catLinks = [
    ['anime', '🎬 动画'],
    ['book', '📚 书籍'],
    ['music', '💿 音乐'],
    ['game', '🎮 游戏'],
    ['real', '🎞️ 三次元'],
  ]
    .map(
      ([k, label]) =>
        `<a class="studio-pill-btn${data.type === k ? ' active' : ''}" href="/${k}/list/${encodeURIComponent(data.profile.uid)}/${encodeURIComponent(data.status)}">${label}</a>`
    )
    .join('');

  const subTabsHtml = data.subTabs
    .map(
      (tb) =>
        `<li><a href="${escapeHtml(tb.href)}" class="nav-sub-tab-btn${tb.active ? ' active' : ''}">${escapeHtml(tb.label)}</a></li>`
    )
    .join('');

  const sortHtml = data.sortLinks
    .map(
      (s) =>
        `<a class="studio-pill-btn${s.active ? ' active' : ''}" href="${escapeHtml(s.href)}">${escapeHtml(s.label)}</a>`
    )
    .join('');

  const tagsHtml = data.userTags.length
    ? data.userTags
        .map(
          (tg) =>
            `<li><a href="${escapeHtml(tg.href)}" class="user-tag-pill-btn${tg.active ? ' active' : ''}"><span>${escapeHtml(tg.name)}</span>${tg.count ? `<small>${escapeHtml(tg.count)}</small>` : ''}</a></li>`
        )
        .join('')
    : '<li style="font-size:12px;color:var(--muted);">暂无个人标签</li>';

  const pagerHtml = data.pagerLinks.length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">` +
        data.pagerLinks
          .map((p) =>
            p.current
              ? `<span class="studio-pill-btn active">${escapeHtml(p.label)}</span>`
              : `<a class="studio-pill-btn" href="${escapeHtml(p.href)}">${escapeHtml(p.label)}</a>`
          )
          .join('') +
      `</div>`
    : '';

  const html =
    renderProfileBanner(data.profile) +
    `<section class="collection-browser-view" id="collectionBrowserView">
      <div class="collection-browser-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div class="studio-pill-group">${catLinks}</div>
          </div>
          <ul class="nav-sub-tabs">${subTabsHtml}</ul>
        </div>
        <div class="browser-tools-bar">
          <input type="search" id="browserSearchInput" placeholder="本页即时过滤标题或吐槽…" style="padding:6px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:12.5px;" />
          ${sortHtml ? `<div class="studio-pill-group">${sortHtml}</div>` : ''}
          <div class="studio-pill-group" id="browserLayoutSwitch">
            <button type="button" class="studio-pill-btn active" data-bgm-layout="list">📋 列表</button>
            <button type="button" class="studio-pill-btn" data-bgm-layout="grid">🖼️ 网格</button>
          </div>
        </div>
      </div>
      <div class="browser-layout-grid">
        <div id="bgmCollectionColA">
          <ul class="browser-item-list" id="bgmBrowserItemList"></ul>
          ${pagerHtml}
        </div>
        <aside class="side-panel-card" id="bgmCollectionColB">
          <div class="side-panel-head"><h3 class="side-panel-title">🏷️ 个人标签 (${data.userTags.length})</h3></div>
          <ul class="user-tag-cloud-list" id="bgmUserTagList">${tagsHtml}</ul>
        </aside>
      </div>
    </section>`;

  const mainEl = mountHydratedStage(doc, {
    tag: 'main',
    id: 'main',
    className: 'page-container',
    html,
  });
  mainEl.style.maxWidth = '1420px';
  mainEl.style.margin = '0 auto';
  mainEl.style.padding = '0 24px 64px';

  function renderList(filterText = '') {
    const q = filterText.trim().toLowerCase();
    const listEl = doc.getElementById('bgmBrowserItemList');
    if (!listEl) return;
    listEl.classList.toggle('mode-grid', layoutMode === 'grid');
    const visible = q
      ? data.items.filter(
          (it) =>
            it.title.toLowerCase().includes(q) ||
            it.jpTitle.toLowerCase().includes(q) ||
            it.comment.toLowerCase().includes(q)
        )
      : data.items;

    listEl.innerHTML = visible.length
      ? visible
          .map(
            (it) =>
              `<li class="browser-item-card" data-item-id="${escapeHtml(it.id)}">` +
                `<a href="${escapeHtml(it.href)}">` +
                  (it.cover
                    ? `<img class="browser-item-cover" src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.title)}" referrerpolicy="no-referrer" loading="lazy" />`
                    : `<div class="browser-item-cover cover-wall-no-icon"><span>🎬</span></div>`) +
                `</a>` +
                `<div class="browser-item-body">` +
                  `<div class="browser-item-title-row">` +
                    `<div><a class="browser-item-title" href="${escapeHtml(it.href)}">${escapeHtml(it.title)}</a>` +
                    (it.jpTitle ? `<span class="browser-item-orig">${escapeHtml(it.jpTitle)}</span>` : '') +
                    `</div>` +
                    (it.stars > 0 ? renderTenStars(it.stars) : '') +
                  `</div>` +
                  (it.info ? `<p class="browser-item-info-tip">${escapeHtml(it.info)}</p>` : '') +
                  `<div class="browser-collect-info">` +
                    (it.collectDate ? `<span>${escapeHtml(it.collectDate)}</span>` : '') +
                    (it.editHref ? `<a href="${escapeHtml(it.editHref)}" style="color:var(--accent);font-weight:600;">修改</a>` : '') +
                    (it.delHref ? `<button type="button" data-bgm-erase="${escapeHtml(it.delHref)}" data-id="${escapeHtml(it.id)}" style="color:#e11d48;">删除</button>` : '') +
                  `</div>` +
                  (it.tags.length ? `<div class="browser-user-tags">${it.tags.map((t) => `<span class="browser-tag-chip"># ${escapeHtml(t)}</span>`).join('')}</div>` : '') +
                  (it.comment ? `<div class="browser-comment-bubble">${escapeHtml(it.comment)}</div>` : '') +
                `</div>` +
              `</li>`
          )
          .join('')
      : '<li style="padding:28px;text-align:center;color:var(--muted);">当前列表暂无匹配条目</li>';
  }

  renderList();

  doc.getElementById('browserSearchInput')?.addEventListener('input', (ev) => {
    renderList(ev.target.value);
  });

  mainEl.addEventListener('click', async (ev) => {
    const layoutBtn = ev.target.closest('[data-bgm-layout]');
    if (layoutBtn) {
      layoutMode = layoutBtn.getAttribute('data-bgm-layout') || 'list';
      mainEl.querySelectorAll('[data-bgm-layout]').forEach((b) => b.classList.toggle('active', b === layoutBtn));
      renderList(doc.getElementById('browserSearchInput')?.value || '');
      return;
    }

    const eraseBtn = ev.target.closest('[data-bgm-erase]');
    if (!eraseBtn) return;
    if (!confirm('确定从收藏列表中移除此条目？')) return;
    try {
      await eraseActionLink(eraseBtn.getAttribute('data-bgm-erase'));
      const id = eraseBtn.getAttribute('data-id');
      data.items = data.items.filter((x) => x.id !== id);
      renderList(doc.getElementById('browserSearchInput')?.value || '');
      toast('已从收藏中移除');
    } catch (err) {
      toast('移除失败：' + (err?.message || '请重试'));
    }
  });
}

export function hydrateUserPage(ctx) {
  if (ctx.route.page === 'P26') {
    hydrateUserCollection(ctx);
  } else {
    hydrateUserHome(ctx);
  }
}
