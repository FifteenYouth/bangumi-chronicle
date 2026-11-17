/* ============================================================================
   C2 · P15 每日放送日历页 (/calendar) — 交互逻辑
   ============================================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'bcal_user_state_v1';
  var data = window.CALENDAR_DATA || { meta: {}, days: [] };

  var state = {
    view: 'poster',       // 'poster' | 'list'
    dayFilter: 'all',     // 'all' | '1'..'7'
    watchingOnly: false,
    todayFirst: false,
    query: '',
    userProgress: {},     // { [subjectId]: { watching: boolean, watchedEps: number } }
  };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg) {
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(msg);
      return;
    }
    var box = document.getElementById('toastContainer');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'glass-toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function loadUserState() {
    var map = {};
    (data.days || []).forEach(function (d) {
      (d.items || []).forEach(function (it) {
        if (it.isWatching || it.watchedEps > 0) {
          map[it.id] = {
            watching: Boolean(it.isWatching),
            watchedEps: Number(it.watchedEps || 0),
          };
        }
      });
    });
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach(function (sid) {
          if (saved[sid] && typeof saved[sid] === 'object') {
            map[sid] = {
              watching: Boolean(saved[sid].watching),
              watchedEps: Number(saved[sid].watchedEps || 0),
            };
          }
        });
      }
    } catch (_err) {
      /* ignore storage failure */
    }
    state.userProgress = map;
  }

  function saveUserState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.userProgress));
    } catch (_err) {
      /* ignore storage failure */
    }
  }

  function getItemState(item) {
    var u = state.userProgress[item.id];
    if (!u) {
      return {
        watching: Boolean(item.isWatching),
        watchedEps: Number(item.watchedEps || 0),
      };
    }
    return u;
  }

  function setItemState(item, patch) {
    var cur = getItemState(item);
    state.userProgress[item.id] = {
      watching: patch.watching !== undefined ? Boolean(patch.watching) : cur.watching,
      watchedEps: patch.watchedEps !== undefined ? Math.max(0, Math.min(item.totalEps, Number(patch.watchedEps))) : cur.watchedEps,
    };
    saveUserState();
  }

  function renderTenStars(score) {
    var s = Number(score || 0);
    if (!s) {
      return '<span class="bcal-stars-glyphs">☆☆☆☆☆☆☆☆☆☆</span><span class="bcal-stars-num">暂无评分</span>';
    }
    var filled = Math.max(0, Math.min(10, Math.round(s)));
    var glyphs = '';
    for (var i = 1; i <= 10; i++) {
      glyphs += i <= filled ? '★' : '☆';
    }
    return '<span class="bcal-stars-glyphs" aria-label="' + s.toFixed(1) + ' / 10 星">' + glyphs + '</span>' +
      '<span class="bcal-stars-num">' + s.toFixed(1) + '</span>';
  }

  function parseQueryParams() {
    var params = new URLSearchParams(window.location.search || '');
    var view = params.get('view');
    if (view === 'list' || view === 'poster') state.view = view;
    var day = (params.get('day') || '').toLowerCase();
    var dayAlias = { mon: '1', tue: '2', wed: '3', thu: '4', fri: '5', sat: '6', sun: '7', today: String((data.meta && data.meta.todayWeekday) || 5) };
    if (dayAlias[day]) state.dayFilter = dayAlias[day];
    else if (/^[1-7]$/.test(day)) state.dayFilter = day;
    if (params.get('watching') === '1') state.watchingOnly = true;
    if (params.get('order') === 'today') state.todayFirst = true;
  }

  function orderedDays() {
    var days = (data.days || []).slice();
    if (!state.todayFirst) {
      days.sort(function (a, b) { return a.id - b.id; });
      return days;
    }
    var todayId = (data.meta && data.meta.todayWeekday) || 5;
    days.sort(function (a, b) {
      var da = (a.id - todayId + 7) % 7;
      var db = (b.id - todayId + 7) % 7;
      return da - db;
    });
    return days;
  }

  function getWatchingCount() {
    var count = 0;
    (data.days || []).forEach(function (d) {
      (d.items || []).forEach(function (it) {
        if (getItemState(it).watching) count += 1;
      });
    });
    return count;
  }

  function getFilteredDays() {
    var q = state.query.trim().toLowerCase();
    return orderedDays()
      .filter(function (d) {
        return state.dayFilter === 'all' || String(d.id) === state.dayFilter;
      })
      .map(function (d) {
        var items = (d.items || []).filter(function (it) {
          var st = getItemState(it);
          if (state.watchingOnly && !st.watching) return false;
          if (q) {
            var hay = (it.title + ' ' + it.orig + ' ' + it.id).toLowerCase();
            if (hay.indexOf(q) < 0) return false;
          }
          return true;
        });
        return {
          id: d.id,
          en: d.en,
          cn: d.cn,
          ja: d.ja,
          isToday: d.isToday,
          count: items.length,
          doingTotal: items.reduce(function (acc, cur) { return acc + Number(cur.doing || 0); }, 0),
          items: items,
        };
      })
      .filter(function (d) {
        return state.dayFilter !== 'all' || d.items.length > 0;
      });
  }

  function renderHeaderMeta() {
    var meta = data.meta || {};
    var subEl = document.getElementById('bcalDateSub');
    if (subEl && meta.dateLabel) subEl.textContent = '/ ' + meta.dateLabel;

    var tipEl = document.getElementById('bcalSummaryTip');
    if (tipEl) {
      tipEl.innerHTML = '本季度共 <strong>' + Number(meta.totalShows || 0) + '</strong> 部番组，今日上映 <strong>' +
        Number(meta.todayShows || 0) + '</strong> 部。共 <strong>' +
        Number(meta.todayDoing || 0).toLocaleString() + '</strong> 人收看今日番组。';
    }

    var kpiEl = document.getElementById('bcalKpiStrip');
    if (kpiEl) {
      kpiEl.innerHTML =
        '<span class="bcal-kpi-chip">全周在看 <b>' + Number(meta.totalDoing || 0).toLocaleString() + '</b></span>' +
        '<span class="bcal-kpi-chip">我的追番 <b>' + getWatchingCount() + '</b> 部</span>' +
        '<span class="bcal-kpi-chip">今日高亮 <b>星期五 · Fri</b></span>';
    }

    var wcEl = document.getElementById('bcalWatchingCount');
    if (wcEl) wcEl.textContent = String(getWatchingCount());
  }

  function renderDayTabs() {
    var host = document.getElementById('bcalDayTabs');
    if (!host) return;
    var days = orderedDays();
    var total = (data.meta && data.meta.totalShows) || 112;
    var html = '<button type="button" class="bcal-day-tab' + (state.dayFilter === 'all' ? ' is-active' : '') +
      '" data-cal-day="all" role="tab">全周 7 列 <span class="bcal-tab-count">' + total + '</span></button>';

    days.forEach(function (d) {
      var active = state.dayFilter === String(d.id);
      html += '<button type="button" class="bcal-day-tab' +
        (active ? ' is-active' : '') +
        (d.isToday ? ' is-today-tab' : '') +
        '" data-cal-day="' + d.id + '" role="tab">' +
        esc(d.cn.replace('星期', '周')) + (d.isToday ? '·今日' : '') +
        ' <span class="bcal-tab-count">' + d.count + '</span></button>';
    });
    host.innerHTML = html;
  }

  function renderPosterCard(it) {
    var st = getItemState(it);
    var hasCov = Boolean(it.cover);
    var bgStyle = hasCov
      ? ' style="background: center no-repeat url(\'' + esc(it.cover) + '\'); background-size: cover"'
      : '';
    var origText = it.orig && it.orig !== it.title ? it.orig : (it.airDate + ' 开播');
    var cls = 'clearit' + (st.watching ? ' is-watching' : '') + (!hasCov ? ' is-no-cover' : '');

    return '<li class="' + cls + '" data-subject-id="' + esc(it.id) + '"' + bgStyle + '>' +
      '<div class="bcal-card-top">' +
        '<span class="bcal-time-pill">🕒 ' + esc(it.airTime) + '</span>' +
        '<div style="display:flex;gap:4px;align-items:center;">' +
          (it.score ? '<span class="bcal-score-pill">★ ' + it.score.toFixed(1) + '</span>' : '') +
          '<button type="button" class="bcal-watch-pill' + (st.watching ? ' is-on' : '') + '" data-bcal-watch="' + esc(it.id) + '">' +
            (st.watching ? '✓ 在追' : '＋ 追番') +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="info_bg"><div class="info">' +
        '<p><a href="subject.html?id=' + esc(it.id) + '" class="nav" title="' + esc(it.title) + '">' + esc(it.title) + '</a></p>' +
        '<p><a href="subject.html?id=' + esc(it.id) + '" class="nav"><small><em>' + esc(origText) + '</em></small></a></p>' +
        '<div class="bcal-card-foot">' +
          '<span class="bcal-ep-label">进度 <strong>' + st.watchedEps + '</strong>/' + it.totalEps + ' 话 · ' + it.doing + ' 人</span>' +
          '<div class="bcal-card-btns">' +
            '<button type="button" class="bcal-mini-btn" data-bcal-next-ep="' + esc(it.id) + '" title="看了一集 (+1)">+1</button>' +
            '<button type="button" class="bcal-mini-btn" data-bcal-collect="' + esc(it.id) + '" title="打开收藏评分盒">☆</button>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
    '</li>';
  }

  function renderPosterView(days) {
    var singleCls = state.dayFilter !== 'all' ? ' is-single-day' : '';
    var html = '<ul class="large clearit' + singleCls + '">';
    days.forEach(function (d) {
      var listHtml = d.items.length
        ? d.items.map(renderPosterCard).join('')
        : '<li class="bcal-empty-state" style="min-height:140px;display:flex;align-items:center;justify-content:center;">该日暂无符合条件的番组</li>';

      html += '<li class="week' + (d.isToday ? ' is-today' : '') + '" data-weekday="' + d.id + '">' +
        '<dl>' +
          '<dt class="' + esc(d.en) + '"><div>' +
            '<h3><span>' + esc(d.cn) + ' <span class="bcal-dt-en">' + esc(d.en) + '</span></span>' +
              (d.isToday ? '<span class="bcal-today-badge">TODAY</span>' : '') +
            '</h3>' +
            '<div class="bcal-dt-meta"><span>' + d.count + ' 部番组</span><span>' + d.doingTotal.toLocaleString() + ' 人在看</span></div>' +
          '</div></dt>' +
          '<dd class="' + esc(d.en) + '"><ul class="coverList clearit">' + listHtml + '</ul></dd>' +
        '</dl>' +
      '</li>';
    });
    html += '</ul>';
    return html;
  }

  function renderListRow(it) {
    var st = getItemState(it);
    var thumbHtml = it.cover
      ? '<img src="' + esc(it.cover) + '" alt="' + esc(it.title) + '" loading="lazy" referrerpolicy="no-referrer" />'
      : '<span>NO IMG</span>';

    var epCells = '';
    for (var ep = 1; ep <= it.totalEps; ep++) {
      var cls = 'bcal-ep-cell';
      if (ep <= st.watchedEps) cls += ' is-watched';
      else if (ep <= it.airedEps) cls += ' is-aired';
      else cls += ' is-unaired';
      epCells += '<button type="button" class="' + cls + '" data-bcal-set-ep="' + esc(it.id) + '" data-ep="' + ep + '" title="标记看到第 ' + ep + ' 话">' + ep + '</button>';
    }

    return '<div class="bcal-list-row" data-subject-id="' + esc(it.id) + '">' +
      '<div class="bcal-row-time">' + esc(it.airTime) + '</div>' +
      '<div class="bcal-row-thumb">' + thumbHtml + '</div>' +
      '<div class="bcal-row-info">' +
        '<a href="subject.html?id=' + esc(it.id) + '" class="bcal-row-title">' + esc(it.title) + '</a>' +
        '<div class="bcal-row-orig">' + esc(it.orig || it.title) + '</div>' +
        '<div class="bcal-row-submeta">' +
          '<span>📅 ' + esc(it.airDate) + ' 首播</span>' +
          '<span>👀 ' + Number(it.doing || 0).toLocaleString() + ' 人在看</span>' +
          (it.rank ? '<span>🏆 Rank #' + it.rank + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="bcal-stars-ten">' +
        '<div class="bcal-stars-line">' + renderTenStars(it.score) + '</div>' +
        '<div class="bcal-stars-votes">' + (it.votes ? Number(it.votes).toLocaleString() + ' 人评分 · 十星制' : '待开分 · 十星制') + '</div>' +
      '</div>' +
      '<div class="bcal-ep-box">' +
        '<div class="bcal-ep-caption"><span>看到第 <strong>' + st.watchedEps + '</strong> / ' + it.totalEps + ' 话</span><span>已播 ' + it.airedEps + ' 话</span></div>' +
        '<div class="bcal-ep-cells">' + epCells + '</div>' +
      '</div>' +
      '<div class="bcal-row-actions">' +
        '<button type="button" class="bcal-action-btn' + (st.watching ? ' is-on' : '') + '" data-bcal-watch="' + esc(it.id) + '">' +
          (st.watching ? '✓ 在追' : '＋ 追番') +
        '</button>' +
        '<button type="button" class="bcal-action-btn" data-bcal-collect="' + esc(it.id) + '">☆ 收藏</button>' +
      '</div>' +
    '</div>';
  }

  function renderListView(days) {
    var html = '<div class="bcal-list-sections">';
    days.forEach(function (d) {
      var rowsHtml = d.items.length
        ? d.items.map(renderListRow).join('')
        : '<div class="bcal-empty-state" style="border:none;border-radius:0;">该日暂无符合条件的番组</div>';

      html += '<section class="bcal-list-day-card' + (d.isToday ? ' is-today' : '') + '" data-weekday="' + d.id + '">' +
        '<header class="bcal-list-day-head">' +
          '<h3><span>' + esc(d.cn) + ' · ' + esc(d.en) + ' / ' + esc(d.ja) + '</span>' +
            (d.isToday ? '<span class="bcal-today-badge">TODAY</span>' : '') +
          '</h3>' +
          '<span class="bcal-dt-meta" style="margin:0;gap:14px;"><span>' + d.count + ' 部番组</span><span>' + d.doingTotal.toLocaleString() + ' 人在看</span></span>' +
        '</header>' +
        '<div class="bcal-list-rows">' + rowsHtml + '</div>' +
      '</section>';
    });
    html += '</div>';
    return html;
  }

  function render() {
    renderHeaderMeta();
    renderDayTabs();

    var root = document.getElementById('bcalRoot');
    if (!root) return;
    var days = getFilteredDays();
    if (!days.length) {
      root.innerHTML = '<div class="bcal-empty-state">没有匹配的番组，试试清空关键词或关闭「只看在追」筛选～</div>';
      return;
    }

    root.innerHTML = state.view === 'list' ? renderListView(days) : renderPosterView(days);
  }

  function findSubjectById(sid) {
    var found = null;
    (data.days || []).some(function (d) {
      return (d.items || []).some(function (it) {
        if (it.id === sid) { found = it; return true; }
        return false;
      });
    });
    return found;
  }

  function syncToolbarUi() {
    document.querySelectorAll('#bcalViewTabs .bcal-view-btn').forEach(function (b) {
      var active = b.getAttribute('data-view') === state.view;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    var watchBtn = document.getElementById('bcalWatchingFilter');
    if (watchBtn) {
      watchBtn.classList.toggle('is-active', state.watchingOnly);
      watchBtn.setAttribute('aria-pressed', state.watchingOnly ? 'true' : 'false');
    }

    var orderBtn = document.getElementById('bcalOrderToggle');
    if (orderBtn) {
      orderBtn.classList.toggle('is-active', state.todayFirst);
      orderBtn.setAttribute('aria-pressed', state.todayFirst ? 'true' : 'false');
      orderBtn.innerHTML = state.todayFirst ? '<span>🔥 今日置顶中</span>' : '<span>🗓️ 周一至周日</span>';
    }
  }

  function bindEvents() {
    document.getElementById('bcalDayTabs')?.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-cal-day]');
      if (!btn) return;
      state.dayFilter = btn.getAttribute('data-cal-day');
      render();
    });

    document.getElementById('bcalViewTabs')?.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-view]');
      if (!btn) return;
      state.view = btn.getAttribute('data-view');
      syncToolbarUi();
      render();
    });

    document.getElementById('bcalWatchingFilter')?.addEventListener('click', function () {
      state.watchingOnly = !state.watchingOnly;
      syncToolbarUi();
      render();
    });

    document.getElementById('bcalOrderToggle')?.addEventListener('click', function () {
      state.todayFirst = !state.todayFirst;
      syncToolbarUi();
      render();
      toast(state.todayFirst ? '已切换为「今日星期五置顶」排序' : '已恢复「周一至周日」标准排序');
    });

    document.getElementById('bcalFilterInput')?.addEventListener('input', function (ev) {
      state.query = ev.target.value || '';
      render();
    });

    document.getElementById('bcalRoot')?.addEventListener('click', function (ev) {
      var watchBtn = ev.target.closest('[data-bcal-watch]');
      if (watchBtn) {
        var sid = watchBtn.getAttribute('data-bcal-watch');
        var item = findSubjectById(sid);
        if (!item) return;
        var cur = getItemState(item);
        setItemState(item, { watching: !cur.watching });
        render();
        toast((!cur.watching ? '已加入追番：' : '已移出追番：') + item.title);
        return;
      }

      var nextEpBtn = ev.target.closest('[data-bcal-next-ep]');
      if (nextEpBtn) {
        var sid2 = nextEpBtn.getAttribute('data-bcal-next-ep');
        var item2 = findSubjectById(sid2);
        if (!item2) return;
        var cur2 = getItemState(item2);
        var next = cur2.watchedEps >= item2.totalEps ? item2.totalEps : cur2.watchedEps + 1;
        setItemState(item2, { watching: true, watchedEps: next });
        render();
        toast('《' + item2.title + '》进度更新至第 ' + next + ' / ' + item2.totalEps + ' 话');
        return;
      }

      var setEpBtn = ev.target.closest('[data-bcal-set-ep]');
      if (setEpBtn) {
        var sid3 = setEpBtn.getAttribute('data-bcal-set-ep');
        var ep = parseInt(setEpBtn.getAttribute('data-ep'), 10) || 1;
        var item3 = findSubjectById(sid3);
        if (!item3) return;
        var cur3 = getItemState(item3);
        var next3 = cur3.watchedEps === ep ? ep - 1 : ep;
        setItemState(item3, { watching: true, watchedEps: next3 });
        render();
        toast('《' + item3.title + '》已标记看到第 ' + next3 + ' 话');
        return;
      }

      var collectBtn = ev.target.closest('[data-bcal-collect]');
      if (collectBtn) {
        var sid4 = collectBtn.getAttribute('data-bcal-collect');
        var item4 = findSubjectById(sid4);
        if (window.BgmShell && typeof window.BgmShell.openCollect === 'function') {
          window.BgmShell.openCollect();
          var titleEl = document.getElementById('bshCollectTitle');
          if (titleEl && item4) titleEl.textContent = '📦 收藏评分 · ' + item4.title;
        }
      }
    });
  }

  function init() {
    loadUserState();
    parseQueryParams();
    syncToolbarUi();
    bindEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
