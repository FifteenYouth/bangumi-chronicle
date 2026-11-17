/* ═══════════════════════════════════════════════════════════════════════════
   Bangumi Episode Studio — 条目章节列表与进度管理工作台 (B2 / Page 05)
   Route: /subject/{id}/ep  (Prototype: subject-ep.html?id=400602)
   Real Data: window.EP_DATA (js/bangumi-ep-data.js)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.EP_DATA || { defaultSubjectId: '400602', subjects: {} };
  var SUBJECTS = DATA.subjects || {};

  var state = {
    subjectId: DATA.defaultSubjectId || '400602',
    catFilter: 'all',       // 'all' | '0' | '1' | '2' | '3'
    statusFilter: 'all',    // 'all' | 'watched' | 'unwatched' | 'queue' | 'drop'
    searchQuery: '',
    selectedIds: {},        // epId -> boolean
    expandedDesc: {},       // epId -> boolean
    activePopupEpId: null,  // currently open .prg_popup epId
    userStatusMap: {}       // subjectId -> { epId: 'watched'|'queue'|'drop'|'today'|'unwatched' }
  };

  /* ---------------- Utilities ---------------- */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(msg);
      return;
    }
    var box = $('toastContainer');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'glass-toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 2400);
  }

  function renderTenStars(score) {
    var num = Number(score) || 0;
    var filled = Math.max(0, Math.min(10, Math.round(num)));
    var starsOn = new Array(filled + 1).join('★');
    var starsOff = new Array(10 - filled + 1).join('☆');
    return (
      '<span class="ep-ten-stars" aria-label="10星评分 ' + num.toFixed(1) + '">' +
        '<span class="stars-filled">' + starsOn + '</span>' +
        '<span class="stars-empty">' + starsOff + '</span>' +
        '<span class="score-num">' + num.toFixed(1) + '</span>' +
      '</span>'
    );
  }

  function currentSubject() {
    return SUBJECTS[state.subjectId] || SUBJECTS['400602'] || Object.values(SUBJECTS)[0];
  }

  function verbFor(subj) {
    if (!subj) return '看';
    return subj.verb || (subj.cat === 'music' ? '听' : '看');
  }

  function unitFor(subj) {
    return (subj && subj.cat === 'music') ? '曲' : '话';
  }

  /* ---------------- Status Persistence ---------------- */
  function ensureSubjectStatusMap(subj) {
    if (!subj) return {};
    var sid = String(subj.id);
    if (state.userStatusMap[sid]) return state.userStatusMap[sid];

    var map = {};
    (subj.episodes || []).forEach(function (ep) {
      map[String(ep.id)] = ep.userStatus || 'unwatched';
    });

    try {
      var saved = localStorage.getItem('bgm_ep_status_v1_' + sid);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach(function (k) { map[k] = parsed[k]; });
        }
      }
    } catch (e) { /* ignore storage errors */ }

    state.userStatusMap[sid] = map;
    return map;
  }

  function saveSubjectStatusMap(subj) {
    if (!subj) return;
    var sid = String(subj.id);
    var map = ensureSubjectStatusMap(subj);
    try {
      localStorage.setItem('bgm_ep_status_v1_' + sid, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  }

  function getEpStatus(subj, ep) {
    var map = ensureSubjectStatusMap(subj);
    return map[String(ep.id)] || ep.userStatus || 'unwatched';
  }

  function setEpStatus(subj, epId, newStatus) {
    var map = ensureSubjectStatusMap(subj);
    var sid = String(epId);
    if (newStatus === 'watched_till') {
      // Mark all episodes in same category up to this episode's sort order as watched
      var target = (subj.episodes || []).find(function (e) { return String(e.id) === sid; });
      var count = 0;
      if (target) {
        (subj.episodes || []).forEach(function (e) {
          if (Number(e.type) === Number(target.type) && Number(e.sort) <= Number(target.sort)) {
            map[String(e.id)] = 'watched';
            count++;
          }
        });
      }
      saveSubjectStatusMap(subj);
      return count;
    } else {
      map[sid] = newStatus;
      saveSubjectStatusMap(subj);
      return 1;
    }
  }

  /* ---------------- URL Query Init & Sync ---------------- */
  function readUrlParams() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var id = params.get('id');
      if (id && SUBJECTS[id]) {
        state.subjectId = id;
      } else if (id && !SUBJECTS[id]) {
        // Map book/game presets gracefully to 400602 while notifying user
        state.subjectId = DATA.defaultSubjectId || '400602';
      }
      var cat = params.get('cat');
      if (cat) state.catFilter = cat;
    } catch (e) { /* ignore */ }
  }

  function syncUrlParams() {
    try {
      if (!window.history || !window.history.replaceState) return;
      var url = 'subject-ep.html?id=' + encodeURIComponent(state.subjectId);
      if (state.catFilter !== 'all') url += '&cat=' + encodeURIComponent(state.catFilter);
      window.history.replaceState(null, '', url);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Episode Filtering & Helpers ---------------- */
  function epCodePrefix(subj, ep) {
    if (subj && subj.cat === 'music') {
      var n = Number(ep.sort) || 1;
      return (n < 10 ? '0' + n : String(n));
    }
    var t = Number(ep.type) || 0;
    if (t === 1) return 'SP' + ep.sort;
    if (t === 2) return 'OP' + ep.sort;
    if (t === 3) return 'ED' + ep.sort;
    return 'ep.' + ep.sort;
  }

  function cellBtnClass(subj, ep) {
    var st = getEpStatus(subj, ep);
    if (st === 'watched') return 'epBtnWatched';
    if (st === 'queue') return 'epBtnQueue';
    if (st === 'drop') return 'epBtnDrop';
    if (st === 'today' || ep.airStatus === 'Today') return 'epBtnToday';
    if (ep.airStatus === 'NA') return 'epBtnNA';
    return 'epBtnAir';
  }

  function statusMeta(subj, st) {
    var v = verbFor(subj);
    if (st === 'watched') return { cls: 'statusWatched', popCls: 'epStatusWatched', text: v + '过' };
    if (st === 'queue') return { cls: 'statusQueue', popCls: 'epStatusQueue', text: '想' + v };
    if (st === 'drop') return { cls: 'statusDrop', popCls: 'epStatusDrop', text: '抛弃' };
    if (st === 'today') return { cls: 'statusUnwatched', popCls: 'epStatusUnwatched', text: '今日放送' };
    return { cls: 'statusUnwatched', popCls: 'epStatusUnwatched', text: '未' + v };
  }

  function filteredEpisodes(subj) {
    var list = (subj && subj.episodes) ? subj.episodes.slice() : [];
    if (state.catFilter !== 'all') {
      list = list.filter(function (ep) { return String(ep.type) === String(state.catFilter); });
    }
    if (state.statusFilter !== 'all') {
      list = list.filter(function (ep) {
        var st = getEpStatus(subj, ep);
        if (state.statusFilter === 'unwatched') return st === 'unwatched' || st === 'today';
        return st === state.statusFilter;
      });
    }
    var q = state.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(function (ep) {
        var staffStr = (ep.staff || []).map(function (s) { return s.role + ':' + s.val; }).join(' ');
        var hay = [ep.sort, ep.name, ep.name_cn, ep.airdate, ep.synopsis, staffStr].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    return list;
  }

  /* ---------------- 1. Render Subject Banner & NavTabs ---------------- */
  function renderBanner(subj) {
    var backdrop = $('subjectBackdrop');
    if (backdrop && subj.cover) {
      backdrop.style.backgroundImage = 'url("' + subj.cover + '")';
    }
    var typeBadge = $('subjectTypeBadge');
    if (typeBadge) typeBadge.textContent = subj.typeLabel || 'TV 动画';
    var rankBadge = $('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Rank #' + (subj.rank || '—');

    var titleJp = $('subjectTitleJp');
    if (titleJp) titleJp.textContent = subj.titleJp || subj.titleCn;
    var titleCn = $('subjectTitleCn');
    if (titleCn) titleCn.textContent = (subj.titleCn || '') + (subj.cat === 'music' ? ' · 曲目列表' : ' · 章节列表');

    // Sync preset pills in #bannerCategoryBar
    var bar = $('bannerCategoryBar');
    if (bar) {
      var pills = bar.querySelectorAll('[data-ep-subject]');
      for (var i = 0; i < pills.length; i++) {
        var pid = pills[i].getAttribute('data-ep-subject');
        if (pid === String(subj.id)) pills[i].classList.add('active');
        else pills[i].classList.remove('active');
      }
    }

    // Render #subjectNavTabs (概览 links back to subject.html?id=..., 章节/曲目 is active)
    var navHost = $('subjectNavTabs');
    if (navHost) {
      var epCount = (subj.episodes || []).length;
      var epTabLabel = subj.cat === 'music' ? '曲目' : '章节';
      var tabs = [
        { key: 'overview', label: '概览', href: 'subject.html?id=' + encodeURIComponent(subj.id) },
        { key: 'ep', label: epTabLabel, count: epCount, href: 'subject-ep.html?id=' + encodeURIComponent(subj.id), active: true },
        { key: 'characters', label: subj.cat === 'real' ? '出演者' : '角色', count: subj.cat === 'music' ? 10 : 36, href: 'subject-characters.html?id=' + encodeURIComponent(subj.id) },
        { key: 'persons', label: '制作人员', href: 'subject-persons.html?id=' + encodeURIComponent(subj.id) },
        { key: 'relations', label: '关联', count: 8, href: '#tab-relations' },
        { key: 'comments', label: '吐槽', count: '1.4k', href: 'subject-comments.html?id=' + encodeURIComponent(subj.id) },
        { key: 'reviews', label: '评论', count: 42, href: 'subject-reviews.html?id=' + encodeURIComponent(subj.id) + '&tab=reviews' },
        { key: 'board', label: '讨论版', count: 18, href: 'subject-reviews.html?id=' + encodeURIComponent(subj.id) + '&tab=board' },
        { key: 'stats', label: '透视分析', href: 'subject-stats.html?id=' + encodeURIComponent(subj.id) },
        { key: 'wiki', label: '维基修订', href: 'subject-wiki.html?id=' + encodeURIComponent(subj.id) }
      ];
      navHost.innerHTML = tabs.map(function (t) {
        var cntHtml = t.count ? ' <span class="tab-count">' + esc(t.count) + '</span>' : '';
        return (
          '<li class="subject-nav-tab-item' + (t.active ? ' active' : '') + '">' +
            '<a href="' + esc(t.href) + '" data-nav-tab="' + esc(t.key) + '">' + esc(t.label) + cntHtml + '</a>' +
          '</li>'
        );
      }).join('');
    }
  }

  /* ---------------- 2. Render Top Progress Matrix (div.subject_prg > ul.prg_list.clearit) ---------------- */
  function renderPrgMatrix(subj) {
    var verb = verbFor(subj);
    var unit = unitFor(subj);
    var eps = subj.episodes || [];
    var mainEps = eps.filter(function (e) { return Number(e.type) === 0; });
    if (!mainEps.length) mainEps = eps;

    var watchedMain = mainEps.filter(function (e) { return getEpStatus(subj, e) === 'watched'; }).length;
    var pct = mainEps.length ? Math.round((watchedMain / mainEps.length) * 100) : 0;

    var titleEl = $('epPrgTitle');
    if (titleEl) {
      titleEl.textContent = (subj.cat === 'music' ? '🎵 曲目试听与收藏点格工作台' : '📺 章节进度点格工作台');
    }
    var subEl = $('epPrgSub');
    if (subEl) {
      subEl.textContent = '点击任意格子展开 .prg_popup 五态浮层，与下方' + (subj.cat === 'music' ? '曲目' : '章节') + '列表实时双向同步';
    }
    var legWatched = $('epLegendWatchedText');
    if (legWatched) legWatched.textContent = verb + '过';
    var legQueue = $('epLegendQueueText');
    if (legQueue) legQueue.textContent = '想' + verb;

    var barFill = $('epPrgBarFill');
    if (barFill) barFill.style.width = pct + '%';
    var pctText = $('epPrgPctText');
    if (pctText) {
      pctText.textContent = '本篇已' + verb + ' ' + watchedMain + ' / ' + mainEps.length + ' ' + unit + ' (' + pct + '%)';
    }

    var matrix = $('epPrgMatrix');
    if (!matrix) return;

    var html = '';
    var lastType = null;
    eps.forEach(function (ep) {
      if (lastType !== null && ep.type !== lastType) {
        var sepLabel = ep.catTitle === '特别篇' ? 'SP' : ep.catTitle;
        html += '<li class="ep-prg-sep"><span>' + esc(sepLabel) + '</span></li>';
      }
      lastType = ep.type;

      var cls = cellBtnClass(subj, ep);
      var isSelected = String(state.activePopupEpId) === String(ep.id) ? ' is-selected-ep' : '';
      var label = (Number(ep.type) === 0)
        ? (ep.sort < 10 ? '0' + ep.sort : String(ep.sort))
        : (ep.catTitle === '特别篇' ? 'S' + ep.sort : ep.catTitle.slice(0, 1) + ep.sort);
      var tipTitle = epCodePrefix(subj, ep) + ' ' + (ep.name_cn || ep.name) + ' (' + (ep.airdate || '未定') + ')';

      html += (
        '<li>' +
          '<a href="#ep_row_' + esc(ep.id) + '" id="prg_' + esc(ep.id) + '" ' +
             'class="load-epinfo ep-prg-cell ' + cls + isSelected + '" ' +
             'data-ep-act="cell-popup" data-ep-id="' + esc(ep.id) + '" ' +
             'title="' + esc(tipTitle) + '">' +
            esc(label) +
          '</a>' +
        '</li>'
      );
    });

    matrix.innerHTML = html;
  }

  /* ---------------- 3. Render Filter Toolbar ---------------- */
  function renderToolbar(subj) {
    var verb = verbFor(subj);
    var eps = subj.episodes || [];
    var catCounts = { all: eps.length, '0': 0, '1': 0, '2': 0, '3': 0 };
    eps.forEach(function (e) {
      var k = String(e.type || 0);
      catCounts[k] = (catCounts[k] || 0) + 1;
    });

    var catHost = $('epCatFilterGroup');
    if (catHost) {
      var cats = subj.cat === 'music'
        ? [{ key: 'all', label: '全部曲目', count: catCounts.all }]
        : [
            { key: 'all', label: '全部章节', count: catCounts.all },
            { key: '0', label: '本篇', count: catCounts['0'] },
            { key: '1', label: '特别篇', count: catCounts['1'] },
            { key: '2', label: 'OP', count: catCounts['2'] },
            { key: '3', label: 'ED', count: catCounts['3'] }
          ].filter(function (c) { return c.key === 'all' || c.count > 0; });

      catHost.innerHTML = cats.map(function (c) {
        var active = String(state.catFilter) === String(c.key) ? ' is-active' : '';
        return (
          '<button type="button" class="ep-cat-filter-btn' + active + '" data-ep-act="cat-filter" data-cat="' + esc(c.key) + '">' +
            esc(c.label) + '<span class="count">' + c.count + '</span>' +
          '</button>'
        );
      }).join('');
    }

    var statusHost = $('epStatusFilterGroup');
    if (statusHost) {
      var statuses = [
        { key: 'all', label: '全部状态' },
        { key: 'watched', label: verb + '过' },
        { key: 'unwatched', label: '未' + verb },
        { key: 'queue', label: '想' + verb },
        { key: 'drop', label: '抛弃' }
      ];
      statusHost.innerHTML = statuses.map(function (s) {
        var active = state.statusFilter === s.key ? ' is-active' : '';
        return (
          '<button type="button" class="ep-cat-filter-btn' + active + '" data-ep-act="status-filter" data-status="' + esc(s.key) + '">' +
            esc(s.label) +
          '</button>'
        );
      }).join('');
    }

    var createBtn = $('epCreateBtn');
    if (createBtn) {
      createBtn.setAttribute('href', '/subject/' + subj.id + '/ep/create');
      createBtn.innerHTML = '<span>＋ 添加新' + (subj.cat === 'music' ? '曲目' : '章节') + '</span>';
    }

    var formEl = $('editEpBatchForm');
    if (formEl) {
      formEl.setAttribute('action', '/subject/' + subj.id + '/ep/edit_batch');
    }

    var batchWatchedBtn = $('epBatchWatchedBtn');
    if (batchWatchedBtn) batchWatchedBtn.textContent = '✓ 批量标为' + verb + '过';
    var batchQueueBtn = $('epBatchQueueBtn');
    if (batchQueueBtn) batchQueueBtn.textContent = '☆ 批量想' + verb;
  }

  /* ---------------- 4. Render Episode Line List (ul.line_list) ---------------- */
  function renderLineList(subj) {
    var host = $('epLineList');
    if (!host) return;

    var verb = verbFor(subj);
    var unit = unitFor(subj);
    var list = filteredEpisodes(subj);

    if (!list.length) {
      host.innerHTML = (
        '<li class="ep-empty-state">' +
          '<p>当前筛选条件下没有匹配的' + (subj.cat === 'music' ? '曲目' : '章节') + '。</p>' +
          '<button type="button" class="ep-batch-link-btn" data-ep-act="reset-filters">重置全部筛选条件</button>' +
        '</li>'
      );
      updateSelectedBadge();
      return;
    }

    // Group by catTitle preserving order
    var groups = [];
    var groupMap = {};
    list.forEach(function (ep) {
      var title = ep.catTitle || '本篇';
      if (!groupMap[title]) {
        groupMap[title] = { title: title, items: [] };
        groups.push(groupMap[title]);
      }
      groupMap[title].items.push(ep);
    });

    var html = '';
    var rowIdx = 0;

    groups.forEach(function (g) {
      var watchedCount = g.items.filter(function (e) { return getEpStatus(subj, e) === 'watched'; }).length;
      html += (
        '<li class="cat">' +
          '<span>' + esc(g.title) + '</span>' +
          '<span>共 ' + g.items.length + ' ' + unit + ' · 已' + verb + ' ' + watchedCount + ' ' + unit + '</span>' +
        '</li>'
      );

      g.items.forEach(function (ep) {
        var oddEven = (rowIdx % 2 === 0) ? 'line_odd' : 'line_even';
        rowIdx++;

        var st = getEpStatus(subj, ep);
        var stInfo = statusMeta(subj, st);
        var isWatchedRow = st === 'watched' ? ' is-watched-row' : '';
        var isChecked = !!state.selectedIds[String(ep.id)];
        var airCls = (st === 'today' || ep.airStatus === 'Today') ? 'Today' : (ep.airStatus === 'NA' ? 'NA' : 'Air');
        var airTip = airCls === 'Today' ? '今日放送' : (airCls === 'NA' ? '未放送' : '已放送');
        var code = epCodePrefix(subj, ep);

        // Staff badges
        var staffHtml = '';
        if (ep.staff && ep.staff.length) {
          staffHtml = '<div class="ep-staff-pills">' + ep.staff.map(function (s) {
            return '<span class="ep-staff-pill"><b>' + esc(s.role) + '</b>' + esc(s.val) + '</span>';
          }).join('') + '</div>';
        }

        // Synopsis toggle & block
        var descOpen = !!state.expandedDesc[String(ep.id)];
        var descToggleHtml = ep.synopsis
          ? ' · <a href="javascript:void(0);" class="l" data-ep-act="toggle-desc" data-ep-id="' + esc(ep.id) + '">' + (descOpen ? '收起简介 ▲' : '剧情简介 ▼') + '</a>'
          : '';
        var synopsisHtml = (ep.synopsis && descOpen)
          ? '<div class="ep-synopsis-box">' + esc(ep.synopsis) + '</div>'
          : '';

        html += (
          '<li class="' + oddEven + isWatchedRow + '" id="ep_row_' + esc(ep.id) + '" data-ep-row="' + esc(ep.id) + '">' +
            '<span class="epAirStatus" title="' + esc(airTip) + '"><span class="' + airCls + '"></span></span>' +
            '<input type="checkbox" class="checkbox ep-row-checkbox" name="ep_mod[]" value="' + esc(ep.id) + '" ' +
                   'data-ep-chk="' + esc(ep.id) + '"' + (isChecked ? ' checked' : '') + ' aria-label="选择 ' + esc(code) + '" />' +
            '<div class="ep-row-main">' +
              '<h6>' +
                '<a href="/ep/' + esc(ep.id) + '" data-ep-act="cell-popup" data-ep-id="' + esc(ep.id) + '">' +
                  esc(code + ' ' + ep.name) +
                '</a>' +
                (ep.name_cn ? ' <span class="tip">/ ' + esc(ep.name_cn) + '</span>' : '') +
              '</h6>' +
              '<small class="grey">' +
                '<span>时长: ' + esc(ep.duration || '24:00') + '</span> / ' +
                '<span>首播: ' + esc(ep.airdate || '未定') + '</span> / ' +
                '<span>讨论: <a href="ep.html?id=' + esc(ep.id) + '" class="l" data-ep-act="discuss" data-ep-id="' + esc(ep.id) + '">(+' + (ep.comment || 0) + ')</a></span> / ' +
                '<a href="/ep/' + esc(ep.id) + '/edit" class="tip_i" data-ep-act="edit-ep" data-ep-id="' + esc(ep.id) + '">Edit</a>' +
                descToggleHtml +
              '</small>' +
              staffHtml +
              synopsisHtml +
            '</div>' +
            '<cite>' +
              '<ul class="listEpPrgManager">' +
                '<li><span class="' + stInfo.cls + '">' + esc(stInfo.text) + '</span></li>' +
                '<li>' +
                  '<a href="javascript:void(0);" class="prgCheckIn" data-ep-act="row-menu" data-ep-id="' + esc(ep.id) + '" title="修改本话状态">' +
                    '<span>▾ 点格</span>' +
                  '</a>' +
                  '<ul class="marked">' +
                    '<li><a href="javascript:void(0);" id="Watched_' + esc(ep.id) + '" data-ep-act="set-status" data-status="watched" data-ep-id="' + esc(ep.id) + '">✓ ' + verb + '过</a></li>' +
                    '<li><a href="javascript:void(0);" id="WatchedTill_' + esc(ep.id) + '" data-ep-act="set-status" data-status="watched_till" data-ep-id="' + esc(ep.id) + '">⇥ ' + verb + '到本' + unit + '</a></li>' +
                    '<li><a href="javascript:void(0);" id="Queue_' + esc(ep.id) + '" data-ep-act="set-status" data-status="queue" data-ep-id="' + esc(ep.id) + '">☆ 想' + verb + '</a></li>' +
                    '<li><a href="javascript:void(0);" id="Drop_' + esc(ep.id) + '" data-ep-act="set-status" data-status="drop" data-ep-id="' + esc(ep.id) + '">✕ 抛弃</a></li>' +
                    '<li><a href="javascript:void(0);" id="remove_' + esc(ep.id) + '" data-ep-act="set-status" data-status="unwatched" data-ep-id="' + esc(ep.id) + '">↺ 撤销状态</a></li>' +
                  '</ul>' +
                '</li>' +
              '</ul>' +
            '</cite>' +
          '</li>'
        );
      });
    });

    host.innerHTML = html;
    updateSelectedBadge();
  }

  function updateSelectedBadge() {
    var badge = $('epSelectedBadge');
    if (!badge) return;
    var subj = currentSubject();
    var unit = unitFor(subj);
    var count = Object.keys(state.selectedIds).filter(function (k) { return state.selectedIds[k]; }).length;
    badge.textContent = '已勾选 ' + count + ' ' + unit;
  }

  /* ---------------- 5. Render Right Sidebar (#columnInSubjectB) ---------------- */
  function renderSidebar(subj) {
    var verb = verbFor(subj);
    var unit = unitFor(subj);
    var eps = subj.episodes || [];

    var coverEl = $('epSideCover');
    if (coverEl) {
      coverEl.src = subj.cover || '';
      coverEl.alt = subj.titleCn || '';
      if (subj.cat === 'music') coverEl.classList.add('is-music-square');
      else coverEl.classList.remove('is-music-square');
    }
    var cnEl = $('epSideTitleCn');
    if (cnEl) cnEl.textContent = subj.titleCn || '';
    var jpEl = $('epSideTitleJp');
    if (jpEl) jpEl.textContent = subj.titleJp || '';

    var backTop = $('epBackToSubjectTop');
    if (backTop) backTop.href = 'subject.html?id=' + encodeURIComponent(subj.id);
    var backLink = $('epBackToSubjectLink');
    if (backLink) backLink.href = 'subject.html?id=' + encodeURIComponent(subj.id);

    var rateRow = $('epSideRateRow');
    if (rateRow) {
      rateRow.innerHTML = renderTenStars(subj.score || 8.5) +
        ' <span style="font-size:11px;color:var(--muted);font-family:var(--mono);">(' + (subj.votes || 0) + '人评)</span>';
    }

    var metaList = $('epSideMetaList');
    if (metaList) {
      var rows = (subj.infoSummary || []).slice();
      rows.push({ k: '收录' + (subj.cat === 'music' ? '曲目' : '章节'), v: '共 ' + eps.length + ' ' + unit });
      metaList.innerHTML = rows.map(function (r) {
        return '<li><span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.v) + '</span></li>';
      }).join('');
    }

    var watchAllBtn = $('epWatchAllMainBtn');
    if (watchAllBtn) {
      watchAllBtn.textContent = '一键全' + verb + (subj.cat === 'music' ? '全碟' : '本篇');
    }

    // Progress summary breakdown
    var summaryHost = $('epSideProgressSummary');
    if (summaryHost) {
      var counts = { watched: 0, queue: 0, drop: 0, unwatched: 0 };
      eps.forEach(function (ep) {
        var st = getEpStatus(subj, ep);
        if (st === 'watched') counts.watched++;
        else if (st === 'queue') counts.queue++;
        else if (st === 'drop') counts.drop++;
        else counts.unwatched++;
      });
      summaryHost.innerHTML = (
        '<ul class="ep-side-meta-list">' +
          '<li><span class="k">✓ 已' + verb + ' (' + verb + '过)</span><span class="v" style="color:var(--accent);">' + counts.watched + ' ' + unit + '</span></li>' +
          '<li><span class="k">☆ 想' + verb + ' (待看队列)</span><span class="v">' + counts.queue + ' ' + unit + '</span></li>' +
          '<li><span class="k">✕ 抛弃 (跳过)</span><span class="v">' + counts.drop + ' ' + unit + '</span></li>' +
          '<li><span class="k">○ 未' + verb + ' / 待放送</span><span class="v">' + counts.unwatched + ' ' + unit + '</span></li>' +
        '</ul>'
      );
    }

    // Top 5 hottest discussion episodes
    var hotHost = $('epHotDiscussList');
    if (hotHost) {
      var topEps = eps.slice().sort(function (a, b) { return (b.comment || 0) - (a.comment || 0); }).slice(0, 5);
      hotHost.innerHTML = topEps.map(function (ep) {
        var code = epCodePrefix(subj, ep);
        return (
          '<a href="#ep_row_' + esc(ep.id) + '" class="ep-hot-discuss-item" data-ep-act="hot-jump" data-ep-id="' + esc(ep.id) + '">' +
            '<span class="ep-hot-ep-code">' + esc(code) + '</span>' +
            '<span class="ep-hot-ep-name">' + esc(ep.name_cn || ep.name) + '</span>' +
            '<span class="ep-hot-ep-count">+' + (ep.comment || 0) + '</span>' +
          '</a>'
        );
      }).join('');
    }
  }

  /* ---------------- 6. Single Episode Floating Popover (.prg_popup / #epCluetipPopover) ---------------- */
  function openEpPopup(epId, anchorEl) {
    var subj = currentSubject();
    var ep = (subj.episodes || []).find(function (e) { return String(e.id) === String(epId); });
    var pop = $('epCluetipPopover');
    if (!ep || !pop) return;

    state.activePopupEpId = String(ep.id);
    var verb = verbFor(subj);
    var unit = unitFor(subj);
    var st = getEpStatus(subj, ep);
    var stInfo = statusMeta(subj, st);
    var code = epCodePrefix(subj, ep);

    var staffStr = (ep.staff || []).map(function (s) { return s.role + ': ' + s.val; }).join(' / ');

    pop.innerHTML = (
      '<div class="ep-pop-header">' +
        '<div>' +
          '<span class="ep-pop-num">' + esc(code + ' · ' + (ep.catTitle || '本篇')) + '</span>' +
          '<h4 class="ep-pop-title">' + esc(ep.name) + (ep.name_cn ? ' / ' + esc(ep.name_cn) : '') + '</h4>' +
        '</div>' +
        '<button type="button" class="ep-pop-close-btn" data-ep-act="close-popup" aria-label="关闭">✕</button>' +
      '</div>' +
      '<div class="epStatusTool ep-status-tool">' +
        '<p style="margin:0 0 8px;display:flex;align-items:center;justify-content:space-between;">' +
          '<span style="font-size:11.5px;color:var(--muted);font-weight:600;">当前单' + unit + '进度状态</span>' +
          '<span class="' + stInfo.popCls + '">' + esc(stInfo.text) + '</span>' +
        '</p>' +
        '<div class="ep-status-btn-row">' +
          '<a href="javascript:void(0);" id="pop_Watched_' + esc(ep.id) + '" class="ep-status-action-btn' + (st === 'watched' ? ' is-active' : '') + '" data-ep-act="set-status" data-status="watched" data-ep-id="' + esc(ep.id) + '">' + verb + '过</a>' +
          '<a href="javascript:void(0);" id="pop_WatchedTill_' + esc(ep.id) + '" class="ep-status-action-btn" data-ep-act="set-status" data-status="watched_till" data-ep-id="' + esc(ep.id) + '">' + verb + '到</a>' +
          '<a href="javascript:void(0);" id="pop_Queue_' + esc(ep.id) + '" class="ep-status-action-btn' + (st === 'queue' ? ' is-active' : '') + '" data-ep-act="set-status" data-status="queue" data-ep-id="' + esc(ep.id) + '">想' + verb + '</a>' +
          '<a href="javascript:void(0);" id="pop_Drop_' + esc(ep.id) + '" class="ep-status-action-btn' + (st === 'drop' ? ' is-active' : '') + '" data-ep-act="set-status" data-status="drop" data-ep-id="' + esc(ep.id) + '">抛弃</a>' +
          '<a href="javascript:void(0);" id="pop_remove_' + esc(ep.id) + '" class="ep-status-action-btn" data-ep-act="set-status" data-status="unwatched" data-ep-id="' + esc(ep.id) + '">撤销</a>' +
        '</div>' +
      '</div>' +
      '<div class="tip">' +
        '<div>时长: ' + esc(ep.duration || '24:00') + ' · 首播: ' + esc(ep.airdate || '未定') + ' · 讨论: (+' + (ep.comment || 0) + ')</div>' +
        (staffStr ? '<div style="margin-top:4px;color:var(--ink);">' + esc(staffStr) + '</div>' : '') +
        (ep.synopsis ? '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--hairline);">' + esc(ep.synopsis) + '</div>' : '') +
      '</div>' +
      '<div class="ep-pop-foot">' +
        '<a href="#ep_row_' + esc(ep.id) + '" data-ep-act="scroll-row" data-ep-id="' + esc(ep.id) + '">↓ 定位列表行</a>' +
        '<span style="display:flex;gap:12px;">' +
          '<a href="/ep/' + esc(ep.id) + '/edit" data-ep-act="edit-ep" data-ep-id="' + esc(ep.id) + '">✏️ 编辑本话</a>' +
          '<a href="ep.html?id=' + esc(ep.id) + '" data-ep-act="discuss" data-ep-id="' + esc(ep.id) + '">💬 讨论 (+' + (ep.comment || 0) + ')</a>' +
        '</span>' +
      '</div>'
    );

    pop.hidden = false;

    // Position near anchorEl if in browser with getBoundingClientRect
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      var rect = anchorEl.getBoundingClientRect();
      var vw = window.innerWidth || 1280;
      var vh = window.innerHeight || 800;
      var left = Math.min(Math.max(16, rect.left), Math.max(16, vw - 366));
      var top = rect.bottom + 8;
      if (top + 280 > vh) {
        top = Math.max(76, rect.top - 260);
      }
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
    } else {
      pop.style.left = '24px';
      pop.style.top = '140px';
    }

    renderPrgMatrix(subj);
  }

  function closeEpPopup() {
    var pop = $('epCluetipPopover');
    if (pop) pop.hidden = true;
    if (state.activePopupEpId !== null) {
      state.activePopupEpId = null;
      renderPrgMatrix(currentSubject());
    }
  }

  /* ---------------- 7. Create / Edit Episode Modal (#epCreateModal) ---------------- */
  function openEpEditorModal(editEpId) {
    var modal = $('epCreateModal');
    if (!modal) return;
    var subj = currentSubject();
    var eps = subj.episodes || [];
    var editEp = editEpId ? eps.find(function (e) { return String(e.id) === String(editEpId); }) : null;

    var idInp = $('epFormEditId');
    var sortInp = $('epFormSort');
    var catSel = $('epFormCat');
    var durInp = $('epFormDuration');
    var nameInp = $('epFormName');
    var nameCnInp = $('epFormNameCn');
    var airInp = $('epFormAirdate');
    var staffInp = $('epFormStaff');
    var descInp = $('epFormDesc');
    var titleEl = $('epCreateModalTitle');

    if (editEp) {
      if (titleEl) titleEl.textContent = '✏️ 编辑章节维基 · ' + epCodePrefix(subj, editEp);
      if (idInp) idInp.value = String(editEp.id);
      if (sortInp) sortInp.value = String(editEp.sort);
      if (catSel) catSel.value = String(editEp.type || 0);
      if (durInp) durInp.value = editEp.duration || '00:24:00';
      if (nameInp) nameInp.value = editEp.name || '';
      if (nameCnInp) nameCnInp.value = editEp.name_cn || '';
      if (airInp) airInp.value = editEp.airdate || '';
      if (staffInp) {
        staffInp.value = (editEp.staff || []).map(function (s) { return s.role + ':' + s.val; }).join(' · ');
      }
      if (descInp) descInp.value = editEp.synopsis || '';
    } else {
      var mainEps = eps.filter(function (e) { return Number(e.type) === 0; });
      var nextSort = mainEps.length + 1;
      if (titleEl) titleEl.textContent = '＋ 为《' + (subj.titleCn || '') + '》添加新' + (subj.cat === 'music' ? '曲目' : '章节');
      if (idInp) idInp.value = '';
      if (sortInp) sortInp.value = String(nextSort);
      if (catSel) catSel.value = '0';
      if (durInp) durInp.value = subj.cat === 'music' ? '03:45' : '00:24:00';
      if (nameInp) nameInp.value = '';
      if (nameCnInp) nameCnInp.value = '';
      if (airInp) airInp.value = '2026-04-01';
      if (staffInp) staffInp.value = '';
      if (descInp) descInp.value = '';
    }

    modal.hidden = false;
  }

  function closeEpEditorModal() {
    var modal = $('epCreateModal');
    if (modal) modal.hidden = true;
  }

  function parseStaffString(raw) {
    if (!raw || !raw.trim()) return [];
    return raw.split(/[·/、\n]+/).map(function (seg) {
      var parts = seg.split(/[:：]/);
      if (parts.length >= 2) {
        return { role: parts[0].trim(), val: parts.slice(1).join(':').trim() };
      }
      return { role: '制作', val: seg.trim() };
    }).filter(function (x) { return x.val; });
  }

  function handleEpFormSubmit() {
    var subj = currentSubject();
    var editId = ($('epFormEditId') && $('epFormEditId').value) || '';
    var sortVal = parseFloat(($('epFormSort') && $('epFormSort').value) || '1') || 1;
    var typeVal = parseInt(($('epFormCat') && $('epFormCat').value) || '0', 10) || 0;
    var durVal = (($('epFormDuration') && $('epFormDuration').value) || '00:24:00').trim();
    var nameVal = (($('epFormName') && $('epFormName').value) || '').trim();
    var nameCnVal = (($('epFormNameCn') && $('epFormNameCn').value) || '').trim();
    var airVal = (($('epFormAirdate') && $('epFormAirdate').value) || '').trim();
    var staffVal = (($('epFormStaff') && $('epFormStaff').value) || '').trim();
    var descVal = (($('epFormDesc') && $('epFormDesc').value) || '').trim();

    if (!nameVal) {
      showToast('⚠️ 请填写章节原名或标题');
      return;
    }

    var catNames = { 0: subj.cat === 'music' ? 'Disc 1' : '本篇', 1: '特别篇', 2: 'OP', 3: 'ED' };
    var staffArr = parseStaffString(staffVal);

    if (editId) {
      var target = (subj.episodes || []).find(function (e) { return String(e.id) === String(editId); });
      if (target) {
        target.sort = sortVal;
        target.ep = sortVal;
        target.type = typeVal;
        target.catTitle = catNames[typeVal] || '本篇';
        target.duration = durVal;
        target.name = nameVal;
        target.name_cn = nameCnVal;
        target.airdate = airVal;
        if (staffArr.length) target.staff = staffArr;
        target.synopsis = descVal;
        showToast('✓ 已保存章节 ' + epCodePrefix(subj, target) + ' 的维基修订');
      }
    } else {
      var newId = 1900000 + Math.floor(Math.random() * 90000);
      var newEp = {
        id: newId,
        type: typeVal,
        catTitle: catNames[typeVal] || '本篇',
        sort: sortVal,
        ep: sortVal,
        name: nameVal,
        name_cn: nameCnVal,
        duration: durVal,
        airdate: airVal,
        comment: 1,
        airStatus: 'Air',
        userStatus: 'unwatched',
        staff: staffArr,
        synopsis: descVal
      };
      subj.episodes.push(newEp);
      state.catFilter = 'all';
      showToast('✓ 已添加新章节: ' + epCodePrefix(subj, newEp) + ' ' + (nameCnVal || nameVal));
    }

    closeEpEditorModal();
    renderAll();
  }

  /* ---------------- 8. Master Render & Event Wiring ---------------- */
  function highlightAndScrollRow(epId) {
    var row = $('ep_row_' + epId);
    if (!row) return;
    if (typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    row.classList.remove('is-Locate-flash');
    void row.offsetWidth;
    row.classList.add('is-Locate-flash');
  }

  function renderAll() {
    var subj = currentSubject();
    if (!subj) return;
    ensureSubjectStatusMap(subj);
    renderBanner(subj);
    renderPrgMatrix(subj);
    renderToolbar(subj);
    renderLineList(subj);
    renderSidebar(subj);
    syncUrlParams();
  }

  function switchSubject(newId) {
    if (!SUBJECTS[newId]) return;
    state.subjectId = String(newId);
    state.catFilter = 'all';
    state.statusFilter = 'all';
    state.searchQuery = '';
    state.selectedIds = {};
    state.activePopupEpId = null;
    var searchInp = $('epSearchInput');
    if (searchInp) searchInp.value = '';
    closeEpPopup();
    renderAll();
    var subj = currentSubject();
    showToast('已切换至《' + (subj.titleCn || '') + '》章节列表 (' + (subj.episodes || []).length + unitFor(subj) + ')');
  }

  function bindEvents() {
    // 1. Delegated click handler
    document.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;

      // Preset switcher in banner (#bannerCategoryBar)
      var presetBtn = target.closest('[data-ep-subject]');
      if (presetBtn) {
        ev.preventDefault();
        switchSubject(presetBtn.getAttribute('data-ep-subject'));
        return;
      }

      // Subject NavTabs in banner (#subjectNavTabs)
      var navTab = target.closest('[data-nav-tab]');
      if (navTab) {
        var tabKey = navTab.getAttribute('data-nav-tab');
        if (tabKey === 'overview') {
          // Allow native navigation to subject.html?id=...
          return;
        }
        ev.preventDefault();
        if (tabKey === 'ep') return;
        showToast('💡 「' + navTab.textContent.trim() + '」专页将在后续工单 (B3–B8) 构建，可先返回概览页查看');
        return;
      }

      // Batch status action buttons (#epBatchBar)
      var batchBtn = target.closest('[data-batch-act]');
      if (batchBtn) {
        ev.preventDefault();
        var act = batchBtn.getAttribute('data-batch-act');
        var subj = currentSubject();
        var verb = verbFor(subj);
        var unit = unitFor(subj);
        var ids = Object.keys(state.selectedIds).filter(function (k) { return state.selectedIds[k]; });
        if (!ids.length) {
          showToast('⚠️ 请先在列表中勾选至少 1 ' + unit);
          return;
        }
        var targetStatus = act === 'remove' ? 'unwatched' : act;
        ids.forEach(function (id) { setEpStatus(subj, id, targetStatus); });
        state.selectedIds = {};
        renderAll();
        var labelMap = { watched: verb + '过', queue: '想' + verb, drop: '抛弃', remove: '未' + verb };
        showToast('✓ 已批量将 ' + ids.length + ' ' + unit + '标记为「' + (labelMap[act] || act) + '」');
        return;
      }

      // Create new episode button (#epCreateBtn)
      var createBtn = target.closest('#epCreateBtn');
      if (createBtn) {
        ev.preventDefault();
        openEpEditorModal(null);
        return;
      }

      // Generic [data-ep-act] actions
      var actEl = target.closest('[data-ep-act]');
      if (actEl) {
        var action = actEl.getAttribute('data-ep-act');
        var epId = actEl.getAttribute('data-ep-id');
        var subjNow = currentSubject();
        var verbNow = verbFor(subjNow);
        var unitNow = unitFor(subjNow);

        if (action === 'cat-filter') {
          ev.preventDefault();
          state.catFilter = actEl.getAttribute('data-cat') || 'all';
          renderToolbar(subjNow);
          renderLineList(subjNow);
          syncUrlParams();
          return;
        }
        if (action === 'status-filter') {
          ev.preventDefault();
          state.statusFilter = actEl.getAttribute('data-status') || 'all';
          renderToolbar(subjNow);
          renderLineList(subjNow);
          return;
        }
        if (action === 'reset-filters') {
          ev.preventDefault();
          state.catFilter = 'all';
          state.statusFilter = 'all';
          state.searchQuery = '';
          if ($('epSearchInput')) $('epSearchInput').value = '';
          renderToolbar(subjNow);
          renderLineList(subjNow);
          return;
        }
        if (action === 'cell-popup') {
          ev.preventDefault();
          openEpPopup(epId, actEl);
          return;
        }
        if (action === 'close-popup') {
          ev.preventDefault();
          closeEpPopup();
          return;
        }
        if (action === 'scroll-row') {
          ev.preventDefault();
          highlightAndScrollRow(epId);
          return;
        }
        if (action === 'hot-jump') {
          ev.preventDefault();
          if (state.catFilter !== 'all' || state.statusFilter !== 'all') {
            state.catFilter = 'all';
            state.statusFilter = 'all';
            renderToolbar(subjNow);
            renderLineList(subjNow);
          }
          highlightAndScrollRow(epId);
          openEpPopup(epId, $('prg_' + epId) || actEl);
          return;
        }
        if (action === 'set-status') {
          ev.preventDefault();
          var newSt = actEl.getAttribute('data-status') || 'watched';
          var affected = setEpStatus(subjNow, epId, newSt);
          renderPrgMatrix(subjNow);
          renderLineList(subjNow);
          renderSidebar(subjNow);
          if (state.activePopupEpId && String(state.activePopupEpId) === String(epId)) {
            openEpPopup(epId, $('prg_' + epId));
          }
          var stTxt = newSt === 'watched_till'
            ? ('已将前 ' + affected + ' ' + unitNow + '全部标为「' + verbNow + '过」')
            : ('已更新单' + unitNow + '状态为「' + statusMeta(subjNow, newSt).text + '」');
          showToast('✓ ' + stTxt);
          return;
        }
        if (action === 'toggle-desc') {
          ev.preventDefault();
          state.expandedDesc[String(epId)] = !state.expandedDesc[String(epId)];
          renderLineList(subjNow);
          return;
        }
        if (action === 'edit-ep') {
          ev.preventDefault();
          closeEpPopup();
          openEpEditorModal(epId);
          return;
        }
        if (action === 'discuss') {
          ev.preventDefault();
          window.location.href = 'ep.html?id=' + encodeURIComponent(epId);
          return;
        }
        if (action === 'row-menu') {
          ev.preventDefault();
          openEpPopup(epId, actEl);
          return;
        }
      }

      // Close popup when clicking outside
      var popEl = $('epCluetipPopover');
      if (popEl && !popEl.hidden && !target.closest('#epCluetipPopover')) {
        closeEpPopup();
      }
    });

    // 2. Checkbox delegation on #epLineList
    document.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!t) return;
      if (t.hasAttribute && t.hasAttribute('data-ep-chk')) {
        var id = t.getAttribute('data-ep-chk');
        state.selectedIds[String(id)] = !!t.checked;
        updateSelectedBadge();
      }
    });

    // 3. Batch selection helper buttons
    var chkAllBtn = $('epChkAllBtn');
    if (chkAllBtn) {
      chkAllBtn.addEventListener('click', function () {
        var subj = currentSubject();
        filteredEpisodes(subj).forEach(function (ep) { state.selectedIds[String(ep.id)] = true; });
        renderLineList(subj);
      });
    }
    var chkInvertBtn = $('epChkInvertBtn');
    if (chkInvertBtn) {
      chkInvertBtn.addEventListener('click', function () {
        var subj = currentSubject();
        filteredEpisodes(subj).forEach(function (ep) {
          var k = String(ep.id);
          state.selectedIds[k] = !state.selectedIds[k];
        });
        renderLineList(subj);
      });
    }
    var chkNoneBtn = $('epChkNoneBtn');
    if (chkNoneBtn) {
      chkNoneBtn.addEventListener('click', function () {
        state.selectedIds = {};
        renderLineList(currentSubject());
      });
    }

    // 4. Watch all main episodes quick button (#epWatchAllMainBtn)
    var watchAllMainBtn = $('epWatchAllMainBtn');
    if (watchAllMainBtn) {
      watchAllMainBtn.addEventListener('click', function () {
        var subj = currentSubject();
        var verb = verbFor(subj);
        var unit = unitFor(subj);
        var map = ensureSubjectStatusMap(subj);
        var cnt = 0;
        (subj.episodes || []).forEach(function (ep) {
          if (Number(ep.type) === 0) {
            map[String(ep.id)] = 'watched';
            cnt++;
          }
        });
        saveSubjectStatusMap(subj);
        renderAll();
        showToast('🎉 已将全部 ' + cnt + ' ' + unit + '本篇标记为「' + verb + '过」！');
      });
    }

    // 5. Inline search input (#epSearchInput)
    var searchInp = $('epSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        state.searchQuery = searchInp.value || '';
        renderLineList(currentSubject());
      });
    }

    // 6. Create/Edit Episode modal events
    var modalClose = $('epCreateModalClose');
    if (modalClose) modalClose.addEventListener('click', closeEpEditorModal);
    var modalCancel = $('epCreateCancelBtn');
    if (modalCancel) modalCancel.addEventListener('click', closeEpEditorModal);
    var createForm = $('epCreateForm');
    if (createForm) {
      createForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        handleEpFormSubmit();
      });
    }

    // 7. Theme toggle button (#btnThemeToggle)
    var themeBtn = $('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') || 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
      });
    }
  }

  function init() {
    readUrlParams();
    renderAll();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
