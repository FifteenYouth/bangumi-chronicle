/* ==========================================================================
   Bangumi Redesign - Page 24: 目录广场 / 目录详情 (catalog.html)
   Supports:
   - ?mode=plaza|browser|user|collected&uid=&sort=&q=&page=
   - ?id={cid}&cat={all|2|1|3|4|6|character|person|ep|blog|group_topic|subject_topic}&view={list|compact|grid}
   - ?mode=create (or #bctCreateModal)
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_CATALOG_DATA || {
    meta: {},
    catLabels: {},
    featured: [],
    latestIds: [],
    popularIds: [],
    userCatalogs: {},
    catalogs: {},
    details: {},
    addPool: []
  };

  var CAT_ORDER = ['all', '2', '1', '3', '4', '6', 'character', 'person', 'ep', 'blog', 'group_topic', 'subject_topic'];
  var KIND_LABELS = DATA.catLabels || {
    all: '全部',
    '2': '动画',
    '1': '书籍',
    '3': '音乐',
    '4': '游戏',
    '6': '三次元',
    character: '角色',
    person: '人物',
    ep: '章节',
    blog: '日志',
    group_topic: '小组话题',
    subject_topic: '条目讨论'
  };

  var KEYS = {
    CUSTOM: 'bgm_catalog_custom_v1',
    EDITS: 'bgm_catalog_edits_v1',
    DELETED: 'bgm_catalog_deleted_v1',
    COLLECTED: 'bgm_catalog_collected_v1',
    DONE: 'bgm_catalog_done_v1',
    COMMENTS: 'bgm_catalog_comments_v1',
    SUBS: 'bgm_catalog_subreplies_v1',
    LIKES: 'bgm_catalog_likes_v1'
  };

  var EMOJI_MAP = {
    '40': '👍',
    '41': '😂',
    '83': '❤️',
    '99': '🔥',
    '75': '✨',
    '47': '🤔'
  };

  var state = {
    route: 'plaza', // plaza | browser | user | collected | detail
    id: '',
    cat: 'all',
    view: 'list', // list | compact | grid
    uid: '553488',
    sort: 'popular', // popular | latest
    q: '',
    itemQ: '',
    page: 1,
    pageSize: 12,
    demoOwnerMode: false,
    cmtSort: 'asc',
    openSubId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readJson(k, fb) {
    try {
      var raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fb;
    } catch (e) {
      return fb;
    }
  }

  function writeJson(k, val) {
    try {
      localStorage.setItem(k, JSON.stringify(val));
    } catch (e) {}
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
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2600);
  }

  function tenStarsHtml(score) {
    var num = Number(score);
    if (!num || isNaN(num)) return '';
    var filled = Math.max(0, Math.min(10, Math.round(num)));
    var stars = '';
    for (var i = 0; i < 10; i++) stars += i < filled ? '★' : '☆';
    return (
      '<span class="bct-stars-line" title="Bangumi 十星制评分 ' + esc(num.toFixed(1)) + ' / 10">' +
      '<span class="bct-stars-glyph">' + stars + '</span>' +
      '<span class="bct-stars-num">' + esc(num.toFixed(1)) + '</span>' +
      '</span>'
    );
  }

  function getCollectedSet() {
    var arr = readJson(KEYS.COLLECTED, ['100001', '87787', '44847']);
    var map = {};
    (arr || []).forEach(function (id) { map[String(id)] = true; });
    return map;
  }

  function toggleCollectCatalog(cid) {
    var map = getCollectedSet();
    cid = String(cid);
    if (map[cid]) delete map[cid];
    else map[cid] = true;
    writeJson(KEYS.COLLECTED, Object.keys(map));
    showToast(map[cid] ? '已收藏该目录到「我收藏的目录」' : '已取消收藏该目录');
    renderAll();
  }

  function getDoneMap() {
    var def = {
      'subject:400602': true,
      'subject:253': true,
      'subject:265': true,
      'subject:310920': true,
      'subject:477900': true,
      'character:86246': true,
      'person:10895': true
    };
    var stored = readJson(KEYS.DONE, null);
    return stored && typeof stored === 'object' ? stored : def;
  }

  function itemDoneKey(item) {
    return String(item.kind || 'subject') + ':' + String(item.id || item.relId);
  }

  function toggleItemDone(key) {
    var map = getDoneMap();
    if (map[key]) delete map[key];
    else map[key] = true;
    writeJson(KEYS.DONE, map);
    showToast(map[key] ? '已标记为看过 / 完成' : '已移出完成进度');
    renderAll();
  }

  function getAllCatalogSummaries() {
    var deleted = readJson(KEYS.DELETED, {});
    var custom = readJson(KEYS.CUSTOM, {});
    var edits = readJson(KEYS.EDITS, {});
    var merged = {};

    Object.keys(DATA.catalogs || {}).forEach(function (cid) {
      if (deleted[cid]) return;
      var base = Object.assign({}, DATA.catalogs[cid]);
      if (edits[cid]) {
        if (edits[cid].title) base.title = edits[cid].title;
        if (edits[cid].bioHtml != null) base.desc = edits[cid].bioHtml.replace(/<[^>]+>/g, ' ').trim();
        if (Array.isArray(edits[cid].entries)) {
          base.totalItems = edits[cid].entries.length;
        }
      }
      merged[cid] = base;
    });

    Object.keys(custom).forEach(function (cid) {
      if (deleted[cid]) return;
      var c = custom[cid];
      var ed = edits[cid] || {};
      var entries = Array.isArray(ed.entries) ? ed.entries : (c.entries || []);
      var stats = {};
      entries.forEach(function (e) {
        stats[e.cat] = (stats[e.cat] || 0) + 1;
      });
      merged[cid] = {
        id: cid,
        title: ed.title || c.title,
        author: c.author || '少年游',
        authorUid: c.authorUid || '553488',
        authorAvatar: c.authorAvatar || 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
        created: c.created || '刚刚',
        updated: ed.updated || c.updated || '刚刚',
        desc: (ed.bioHtml || c.bioHtml || '').replace(/<[^>]+>/g, ' ').trim(),
        stats: stats,
        totalItems: entries.length,
        collects: c.collects || 1,
        covers: entries.map(function (e) { return e.cover; }).filter(Boolean).slice(0, 8),
        isCustom: true
      };
    });

    return merged;
  }

  function getCatalogDetail(cid) {
    cid = String(cid);
    var deleted = readJson(KEYS.DELETED, {});
    if (deleted[cid]) return null;

    var custom = readJson(KEYS.CUSTOM, {});
    var edits = readJson(KEYS.EDITS, {});
    var base = DATA.details[cid] ? Object.assign({}, DATA.details[cid]) : null;

    if (!base && custom[cid]) {
      base = Object.assign({}, custom[cid]);
    }
    if (!base && DATA.catalogs[cid]) {
      var sum = DATA.catalogs[cid];
      var fallbackEntries = [];
      Object.keys(sum.stats || {}).forEach(function (sk, idx) {
        var cnt = sum.stats[sk];
        if (cnt > 0 && idx < 3) {
          var poolMatch = (DATA.addPool || []).find(function (p) { return p.cat === sk; }) || (DATA.addPool || [])[idx];
          if (poolMatch) {
            fallbackEntries.push({
              relId: 'fb_' + cid + '_' + idx,
              kind: poolMatch.kind,
              cat: poolMatch.cat,
              id: poolMatch.id,
              title: poolMatch.title,
              badge: KIND_LABELS[sk] || '收录条目',
              cover: poolMatch.cover,
              isSquare: poolMatch.cat === '3' || poolMatch.kind === 'blog',
              info: poolMatch.info || 'Bangumi 目录关联条目',
              comment: '该目录包含 ' + cnt + ' 项「' + (KIND_LABELS[sk] || sk) + '」内容（可点击右上角添加更多条目）。',
              href: poolMatch.href
            });
          }
        }
      });
      base = {
        id: cid,
        title: sum.title,
        author: sum.author,
        authorUid: sum.authorUid,
        authorAvatar: sum.authorAvatar,
        bioHtml: sum.desc ? esc(sum.desc) : '暂无目录简介。',
        created: sum.created,
        updated: sum.updated,
        collects: sum.collects || 0,
        catCounts: Object.assign({ all: sum.totalItems || fallbackEntries.length }, sum.stats || {}),
        covers: sum.covers || [],
        entries: fallbackEntries,
        sideComments: [],
        otherCatalogs: [],
        comments: [],
        url: 'https://bgm.tv/index/' + cid
      };
    }
    if (!base) return null;

    var ed = edits[cid];
    if (ed) {
      if (ed.title) base.title = ed.title;
      if (ed.bioHtml != null) base.bioHtml = ed.bioHtml;
      if (ed.updated) base.updated = ed.updated;
      if (Array.isArray(ed.entries)) base.entries = ed.entries.slice();
    } else {
      base.entries = (base.entries || []).slice();
    }

    // Recompute live category counts when edited or custom
    if (ed && Array.isArray(ed.entries) || custom[cid]) {
      var counts = { all: base.entries.length };
      base.entries.forEach(function (e) {
        var ckey = e.cat || '2';
        counts[ckey] = (counts[ckey] || 0) + 1;
      });
      base.catCounts = counts;
    }

    return base;
  }

  function isOwnerOf(detail) {
    if (!detail) return false;
    return state.demoOwnerMode || String(detail.authorUid) === '553488' || !!detail.isCustom;
  }

  function readUrlParams() {
    var sp = new URLSearchParams(window.location.search || '');
    var id = (sp.get('id') || '').trim();
    var mode = (sp.get('mode') || '').trim();
    var cat = (sp.get('cat') || 'all').trim();
    var view = (sp.get('view') || 'list').trim();
    var uid = (sp.get('uid') || '553488').trim();
    var sort = (sp.get('sort') || 'popular').trim();
    var q = (sp.get('q') || '').trim();
    var page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);

    state.id = id;
    state.cat = CAT_ORDER.indexOf(cat) !== -1 ? cat : 'all';
    state.view = ['list', 'compact', 'grid'].indexOf(view) !== -1 ? view : 'list';
    state.uid = uid || '553488';
    state.sort = sort === 'latest' ? 'latest' : 'popular';
    state.q = q;
    state.page = page;

    if (id) {
      state.route = 'detail';
    } else if (mode === 'browser' || mode === 'user' || mode === 'collected') {
      state.route = mode;
    } else {
      state.route = 'plaza';
    }

    if (mode === 'create') {
      setTimeout(function () { openCreateModal(''); }, 20);
    }
  }

  function syncUrl(push) {
    var sp = new URLSearchParams();
    if (state.route === 'detail' && state.id) {
      sp.set('id', state.id);
      if (state.cat && state.cat !== 'all') sp.set('cat', state.cat);
      if (state.view && state.view !== 'list') sp.set('view', state.view);
    } else {
      if (state.route !== 'plaza') sp.set('mode', state.route);
      if (state.route === 'user' && state.uid) sp.set('uid', state.uid);
      if (state.sort && state.sort !== 'popular') sp.set('sort', state.sort);
      if (state.q) sp.set('q', state.q);
      if (state.page > 1) sp.set('page', String(state.page));
    }
    var qs = sp.toString();
    var nextUrl = window.location.pathname + (qs ? '?' + qs : '');
    try {
      if (push) window.history.pushState({}, '', nextUrl);
      else window.history.replaceState({}, '', nextUrl);
    } catch (e) {}
  }

  function renderHeader(detail) {
    var titleEl = $('bctHeaderTitle');
    var subEl = $('bctHeaderSub');
    var tabsEl = $('bctNavSubTabs');
    var badgeEl = $('bctHeaderBadge');
    var plazaBtn = $('bctBtnPlaza');

    if (state.route === 'detail' && detail) {
      if (badgeEl) badgeEl.textContent = '📚';
      if (titleEl) titleEl.textContent = detail.title;
      if (subEl) {
        subEl.innerHTML =
          '<span>策展人：<a href="user.html?uid=' + esc(detail.authorUid || '553488') + '" style="color:var(--accent);font-weight:700;text-decoration:none;">' + esc(detail.author) + '</a></span>' +
          '<span>· 创建 ' + esc(detail.created || '未知') + '</span>' +
          '<span>· ' + esc(detail.catCounts && detail.catCounts.all != null ? detail.catCounts.all : detail.entries.length) + ' 个收录项</span>' +
          '<span>· ' + esc((detail.collects || 0) + (getCollectedSet()[detail.id] ? 1 : 0)) + ' 人收藏</span>';
      }
      if (plazaBtn) plazaBtn.style.display = 'inline-flex';
      if (tabsEl) {
        var catHtml = CAT_ORDER.map(function (ck) {
          var cnt = (detail.catCounts && detail.catCounts[ck] != null) ? detail.catCounts[ck] : 0;
          if (ck !== 'all' && !cnt) return '';
          var active = state.cat === ck ? 'focus selected' : '';
          var href = ck === 'all' ? ('catalog.html?id=' + esc(detail.id)) : ('catalog.html?id=' + esc(detail.id) + '&cat=' + esc(ck));
          return (
            '<li><a href="' + href + '" class="' + active + '" data-act="switch-cat" data-cat="' + esc(ck) + '">' +
            '<span>' + esc(KIND_LABELS[ck] || ck) + '</span>' +
            '<small>' + esc(cnt) + '</small>' +
            '</a></li>'
          );
        }).join('');
        tabsEl.innerHTML = catHtml;
      }
      return;
    }

    if (badgeEl) badgeEl.textContent = '📑';
    if (titleEl) {
      if (state.route === 'user') {
        titleEl.textContent = state.uid === 'sai' ? 'Sai🖖 的个人目录' : '少年游的专题目录';
      } else if (state.route === 'collected') {
        titleEl.textContent = '我收藏的 Bangumi 目录';
      } else if (state.route === 'browser') {
        titleEl.textContent = '全部目录索引';
      } else {
        titleEl.textContent = '目录 Index · 专题策展广场';
      }
    }
    if (subEl) {
      var allMap = getAllCatalogSummaries();
      subEl.innerHTML =
        '<span>共收录 <strong>' + Object.keys(allMap).length + '</strong> 个精选目录</span>' +
        '<span>· 支持动画 / 书籍 / 音乐 / 游戏 / 角色 / 人物 / 话题跨媒介编目</span>';
    }
    if (plazaBtn) plazaBtn.style.display = state.route === 'plaza' ? 'none' : 'inline-flex';
    if (tabsEl) {
      var navItems = [
        { k: 'plaza', label: '目录广场', href: 'catalog.html' },
        { k: 'browser', label: '全部目录', href: 'catalog.html?mode=browser' },
        { k: 'user553488', label: '我的目录', href: 'catalog.html?mode=user&uid=553488' },
        { k: 'usersai', label: '站长目录', href: 'catalog.html?mode=user&uid=sai' },
        { k: 'collected', label: '我收藏的目录', href: 'catalog.html?mode=collected' }
      ];
      tabsEl.innerHTML = navItems.map(function (it) {
        var isAct =
          (it.k === 'plaza' && state.route === 'plaza') ||
          (it.k === 'browser' && state.route === 'browser') ||
          (it.k === 'user553488' && state.route === 'user' && state.uid !== 'sai') ||
          (it.k === 'usersai' && state.route === 'user' && state.uid === 'sai') ||
          (it.k === 'collected' && state.route === 'collected');
        return (
          '<li><a href="' + it.href + '" class="' + (isAct ? 'focus selected' : '') + '" data-act="switch-plaza-tab" data-tab="' + esc(it.k) + '">' +
          '<span>' + esc(it.label) + '</span></a></li>'
        );
      }).join('');
    }
  }

  function statsChipsHtml(stats) {
    var keys = Object.keys(stats || {});
    if (!keys.length) return '';
    return keys.slice(0, 4).map(function (k) {
      var lbl = KIND_LABELS[k] || k;
      return '<span class="bct-stat-chip">' + esc(lbl) + ' ' + esc(stats[k]) + '</span>';
    }).join('');
  }

  function renderCatalogRowHtml(c) {
    var minis = (c.covers || []).slice(0, 5).map(function (src) {
      return '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" />';
    }).join('');
    var uHref = (c.authorUid === '553488' || c.authorUid === 'sai')
      ? ('user.html?uid=' + esc(c.authorUid))
      : ('catalog.html?mode=user&uid=' + esc(c.authorUid || '553488'));
    return (
      '<li id="item_' + esc(c.id) + '" class="clearit tml_item index-item bct-index-row">' +
        '<a href="' + esc(uHref) + '" class="bct-row-avatar">' +
          '<img src="' + esc(c.authorAvatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg') + '" alt="' + esc(c.author) + '" loading="lazy" referrerpolicy="no-referrer" />' +
        '</a>' +
        '<div class="bct-row-main">' +
          '<div class="bct-row-head">' +
            '<a href="catalog.html?id=' + esc(c.id) + '" class="bct-row-title" data-act="open-catalog" data-id="' + esc(c.id) + '">' + esc(c.title) + '</a>' +
            '<div class="bct-stats-badges">' + statsChipsHtml(c.stats) + '</div>' +
          '</div>' +
          '<div class="bct-row-meta">' +
            '<span><a href="' + esc(uHref) + '">' + esc(c.author) + '</a></span>' +
            (c.created ? '<span>· 创建 ' + esc(c.created) + '</span>' : '') +
            (c.updated ? '<span>· 更新 ' + esc(c.updated) + '</span>' : '') +
            (c.collects ? '<span>· ' + esc(c.collects) + ' 人收藏</span>' : '') +
          '</div>' +
          (c.desc ? '<div class="bct-row-desc">' + esc(c.desc) + '</div>' : '') +
          (minis ? '<div class="bct-row-mini-covers">' + minis + '</div>' : '') +
        '</div>' +
      '</li>'
    );
  }

  function renderPlazaAndLists() {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var allMap = getAllCatalogSummaries();
    var allArr = Object.keys(allMap).map(function (k) { return allMap[k]; });
    var colSet = getCollectedSet();
    var customMap = readJson(KEYS.CUSTOM, {});

    var list = [];
    if (state.route === 'user') {
      var uIds = (DATA.userCatalogs && DATA.userCatalogs[state.uid]) || [];
      if (state.uid === '553488') {
        Object.keys(customMap).forEach(function (cid) {
          if (uIds.indexOf(cid) === -1) uIds = [cid].concat(uIds);
        });
      }
      list = uIds.map(function (id) { return allMap[id]; }).filter(Boolean);
      if (!list.length) {
        list = allArr.filter(function (c) { return String(c.authorUid) === state.uid; });
      }
    } else if (state.route === 'collected') {
      list = allArr.filter(function (c) { return !!colSet[c.id]; });
    } else if (state.route === 'plaza') {
      var orderedIds = (state.sort === 'latest' ? DATA.latestIds : DATA.popularIds) || [];
      var seen = {};
      Object.keys(customMap).forEach(function (cid) {
        if (allMap[cid]) { seen[cid] = true; list.push(allMap[cid]); }
      });
      orderedIds.forEach(function (cid) {
        if (!seen[cid] && allMap[cid]) { seen[cid] = true; list.push(allMap[cid]); }
      });
      allArr.forEach(function (c) {
        if (!seen[c.id]) { seen[c.id] = true; list.push(c); }
      });
    } else {
      list = allArr.slice().sort(function (a, b) {
        if (state.sort === 'latest') return String(b.updated || '').localeCompare(String(a.updated || ''));
        return (b.collects || 0) - (a.collects || 0) || (b.totalItems || 0) - (a.totalItems || 0);
      });
    }

    if (state.q) {
      var ql = state.q.toLowerCase();
      list = list.filter(function (c) {
        return (
          String(c.title || '').toLowerCase().indexOf(ql) !== -1 ||
          String(c.author || '').toLowerCase().indexOf(ql) !== -1 ||
          String(c.desc || '').toLowerCase().indexOf(ql) !== -1
        );
      });
    }

    var totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var pageItems = list.slice(start, start + state.pageSize);

    var focusHtml = '';
    if (state.route === 'plaza' && !state.q && state.page === 1) {
      var featCards = (DATA.featured || []).slice(0, 4).map(function (f) {
        var covers = f.covers || [];
        var hero = covers[0] || 'https://lain.bgm.tv/pic/cover/l/13/c5/400602_ZI8Y9.jpg';
        var thumbs = covers.slice(1, 9).map(function (src) {
          return '<div class="bct-cover-thumb"><img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" /></div>';
        }).join('');
        return (
          '<a href="catalog.html?id=' + esc(f.id) + '" class="indexFocus bct-focus-card" data-act="open-catalog" data-id="' + esc(f.id) + '">' +
            '<div class="coverGrid bct-cover-collage">' +
              '<div class="bct-cover-hero"><img src="' + esc(hero) + '" alt="' + esc(f.title) + '" loading="lazy" referrerpolicy="no-referrer" /></div>' +
              '<div class="bct-cover-thumbs">' + thumbs + '</div>' +
            '</div>' +
            '<div class="indexInfo bct-focus-info">' +
              '<h3>' + esc(f.title) + '</h3>' +
              '<span class="desc">by ' + esc(f.author) + '</span>' +
            '</div>' +
          '</a>'
        );
      }).join('');
      focusHtml =
        '<section class="bct-card">' +
          '<div class="bct-section-head">' +
            '<h2 class="title">✨ 精选推荐目录 (Featured Index)</h2>' +
            '<a href="catalog.html?mode=browser" class="bct-mini-op" data-act="switch-plaza-tab" data-tab="browser" style="text-decoration:none;">全部目录 »</a>' +
          '</div>' +
          '<div class="bct-focus-grid">' + featCards + '</div>' +
        '</section>';
    }

    var toolbarHtml =
      '<div class="bct-plaza-toolbar">' +
        '<input type="search" id="bctPlazaSearch" class="bct-search-input" value="' + esc(state.q) + '" placeholder="筛选目录标题 / 策展人 / 关键词..." />' +
        '<div class="bct-pill-group">' +
          '<button type="button" class="bct-pill-btn' + (state.sort === 'popular' ? ' active' : '') + '" data-act="set-sort" data-sort="popular">🔥 按热门程度</button>' +
          '<button type="button" class="bct-pill-btn' + (state.sort === 'latest' ? ' active' : '') + '" data-act="set-sort" data-sort="latest">🕒 按最新更新</button>' +
        '</div>' +
      '</div>';

    var listHtml = pageItems.length
      ? '<div id="timeline" class="index-list"><ul class="bct-index-ul">' + pageItems.map(renderCatalogRowHtml).join('') + '</ul></div>'
      : '<div style="padding:32px;text-align:center;color:var(--bct-muted);">暂无匹配的目录，试试清空筛选或点击右上角「+ 创建新目录」。</div>';

    var pagerHtml = '';
    if (totalPages > 1) {
      var pBtns = [];
      for (var pi = 1; pi <= totalPages; pi++) {
        pBtns.push(
          '<button type="button" class="bct-pill-btn' + (pi === state.page ? ' active' : '') + '" data-act="go-page" data-page="' + pi + '">' + pi + '</button>'
        );
      }
      pagerHtml = '<div class="bct-pager">' + pBtns.join('') + '</div>';
    }

    colA.innerHTML =
      focusHtml +
      '<section class="bct-card">' +
        '<div class="bct-section-head">' +
          '<h2 class="title">📚 ' + (state.route === 'collected' ? '我收藏的专题目录' : (state.route === 'user' ? '用户编纂目录列表' : '热门与最新创建的目录')) + '</h2>' +
          '<span style="font-size:12px;color:var(--bct-muted);">共 ' + list.length + ' 个目录</span>' +
        '</div>' +
        toolbarHtml +
        listHtml +
        pagerHtml +
      '</section>';

    // Sidebar
    var myIds = (DATA.userCatalogs && DATA.userCatalogs['553488']) || [];
    Object.keys(customMap).forEach(function (cid) { if (myIds.indexOf(cid) === -1) myIds.unshift(cid); });
    var quickLinksHtml = myIds.slice(0, 5).map(function (cid) {
      var item = allMap[cid];
      if (!item) return '';
      return '<li><a href="catalog.html?id=' + esc(cid) + '" data-act="open-catalog" data-id="' + esc(cid) + '">📑 ' + esc(item.title) + '</a></li>';
    }).join('');

    colB.innerHTML =
      '<div class="SidePanel bct-side-panel">' +
        '<h2><span>/ 关于目录 Index</span></h2>' +
        '<p style="margin:0 0 12px;font-size:12.5px;line-height:1.65;color:var(--bct-ink-2);">目录是基于某一特定主题的个性化跨媒介推荐清单。你可以把动画、书籍、音乐、游戏、角色、现实人物甚至讨论帖收进同一目录，并实时追踪个人完成度。</p>' +
        '<a href="/index/create" class="chiiBtn is-primary" style="width:100%;justify-content:center;" data-act="open-create">+ 创建新目录</a>' +
      '</div>' +
      '<div class="SidePanel bct-side-panel">' +
        '<h2><span>/ 我的专题目录</span><a href="catalog.html?mode=user&uid=553488" style="font-size:11.5px;color:var(--accent);text-decoration:none;">全部 →</a></h2>' +
        '<ul class="bct-side-list">' + (quickLinksHtml || '<li><span style="font-size:12px;color:var(--bct-muted);">暂无目录</span></li>') + '</ul>' +
      '</div>' +
      '<div class="SidePanel bct-side-panel">' +
        '<h2><span>/ 快速直达</span></h2>' +
        '<ul class="bct-side-list">' +
          '<li><a href="catalog.html?id=100001" data-act="open-catalog" data-id="100001">🌟 个人年度十佳 TV 动画档案馆 (全媒介样例)</a></li>' +
          '<li><a href="catalog.html?id=87787" data-act="open-catalog" data-id="87787">🖖 Sai 的 2025 年度精选目录</a></li>' +
          '<li><a href="catalog.html?id=81881" data-act="open-catalog" data-id="81881">🧩 [Guide] 超合金组件开发指南</a></li>' +
          '<li><a href="catalog.html?id=44847" data-act="open-catalog" data-id="44847">🏆 中日英三站动画佳作榜 [1-1000]</a></li>' +
          '<li><a href="catalog.html?id=63513" data-act="open-catalog" data-id="63513">💗 Bangumi 角色收藏量 Top 100</a></li>' +
        '</ul>' +
      '</div>';
  }

  function getMergedComments(detail) {
    var localCmts = readJson(KEYS.COMMENTS, {});
    var subStore = readJson(KEYS.SUBS, {});
    var base = (detail.comments || []).slice();
    var added = localCmts[detail.id] || [];
    var combined = base.concat(added).map(function (c, idx) {
      var subs = (c.subs || []).concat(subStore[c.id] || []);
      return Object.assign({}, c, { _order: idx, subs: subs });
    });
    if (state.cmtSort === 'desc') combined.reverse();
    return combined;
  }

  function renderEntryCardHtml(e, idx, total, isOwner, doneMap) {
    var dKey = itemDoneKey(e);
    var isDone = !!doneMap[dKey];
    var fallbackChar = esc((e.title || '?').slice(0, 1));
    var coverClass = 'bct-entry-cover' + (e.isSquare ? ' is-square' : '');
    var coverInner = e.cover
      ? '<img src="' + esc(e.cover) + '" alt="' + esc(e.title) + '" loading="lazy" referrerpolicy="no-referrer" />'
      : '<span class="bct-cover-fallback">' + fallbackChar + '</span>';

    var collectCtrl = '';
    if (e.kind === 'subject') {
      collectCtrl =
        '<button type="button" class="bct-done-btn' + (isDone ? ' is-done' : '') + '" data-act="toggle-done" data-key="' + esc(dKey) + '">' + (isDone ? '✓ 已看过' : '○ 标记看过') + '</button>' +
        '<button type="button" class="bct-mini-op" data-act="shell-collect" data-sid="' + esc(e.id) + '" data-title="' + esc(e.title) + '">收藏态</button>';
    } else {
      collectCtrl =
        '<button type="button" class="bct-done-btn' + (isDone ? ' is-done' : '') + '" data-act="toggle-done" data-key="' + esc(dKey) + '">' + (isDone ? '✓ 已完成' : '○ 标记已读') + '</button>';
    }

    var ownerOps = isOwner
      ? '<div class="bct-owner-item-ops">' +
          '<button type="button" class="bct-mini-op" data-act="open-edit-note" data-rel="' + esc(e.relId) + '">✏️ 评价</button>' +
          (idx > 0 ? '<button type="button" class="bct-mini-op" data-act="move-item" data-rel="' + esc(e.relId) + '" data-dir="-1" title="上移">↑</button>' : '') +
          (idx < total - 1 ? '<button type="button" class="bct-mini-op" data-act="move-item" data-rel="' + esc(e.relId) + '" data-dir="1" title="下移">↓</button>' : '') +
          '<button type="button" class="bct-mini-op" data-act="remove-item" data-rel="' + esc(e.relId) + '" title="移出目录">✕</button>' +
        '</div>'
      : '';

    var noteBody = e.comment
      ? '<span>💬 <strong>编者评语：</strong>' + esc(e.comment) + '</span>'
      : '<span style="color:var(--bct-muted);">暂无编者推荐语</span>';

    return (
      '<li id="item_' + esc(e.id) + '" class="item ' + (idx % 2 === 0 ? 'odd' : 'even') + ' clearit bct-entry-item" attr-index-related="' + esc(e.relId) + '">' +
        '<a href="' + esc(e.href || '#') + '" class="' + coverClass + '">' + coverInner + '</a>' +
        '<div class="bct-entry-body">' +
          '<div class="bct-entry-top">' +
            '<div class="bct-entry-title-row">' +
              '<span class="bct-kind-pill">' + esc(KIND_LABELS[e.cat] || '条目') + '</span>' +
              (e.badge ? '<span class="bct-badge-job">' + esc(e.badge) + '</span>' : '') +
              '<a href="' + esc(e.href || '#') + '" class="bct-entry-title">' + esc(e.title) + '</a>' +
            '</div>' +
            '<div class="collectBlock bct-collect-block">' + collectCtrl + '</div>' +
          '</div>' +
          (e.info ? '<p class="bct-entry-info">' + esc(e.info) + '</p>' : '') +
          ((e.comment || isOwner)
            ? '<div class="comment-box bct-curator-note">' + noteBody + ownerOps + '</div>'
            : '') +
        '</div>' +
      '</li>'
    );
  }

  function renderDetailView(detail) {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var colSet = getCollectedSet();
    var isCollected = !!colSet[detail.id];
    var owner = isOwnerOf(detail);
    var doneMap = getDoneMap();

    var allEntries = detail.entries || [];
    var doneCount = allEntries.filter(function (e) { return !!doneMap[itemDoneKey(e)]; }).length;
    var totalCount = Math.max(allEntries.length, 1);
    var pct = allEntries.length ? Math.round((doneCount / totalCount) * 100) : 0;

    var filtered = allEntries.filter(function (e) {
      if (state.cat !== 'all' && e.cat !== state.cat) return false;
      if (state.itemQ) {
        var ql = state.itemQ.toLowerCase();
        var hay = (String(e.title || '') + ' ' + String(e.info || '') + ' ' + String(e.comment || '')).toLowerCase();
        if (hay.indexOf(ql) === -1) return false;
      }
      return true;
    });

    var uHref = (detail.authorUid === '553488' || detail.authorUid === 'sai')
      ? ('user.html?uid=' + esc(detail.authorUid))
      : ('catalog.html?mode=user&uid=' + esc(detail.authorUid || '553488'));

    var rrBtns = '';
    if (owner) {
      rrBtns +=
        '<button type="button" class="chiiBtn" data-act="open-edit-catalog">✏️ 修改目录信息</button>' +
        '<button type="button" class="chiiBtn is-primary" data-act="open-add-item">➕ 添加新条目</button>' +
        '<button type="button" class="chiiBtn is-danger" data-act="delete-catalog">🗑 删除目录</button>';
    } else {
      rrBtns +=
        '<a href="/index/' + esc(detail.id) + '/collect" class="chiiBtn ' + (isCollected ? '' : 'is-primary') + '" data-act="toggle-collect-catalog">' +
          (isCollected ? '♥ 已收藏 · 取消收藏' : '♡ 收藏这个目录') +
        '</a>';
    }
    rrBtns +=
      '<button type="button" class="chiiBtn" data-act="toggle-owner-demo" title="演示用：切换创建者管理视角">' +
        (state.demoOwnerMode ? '👁 退出管理视角' : '🛠️ 管理模式演示') +
      '</button>';

    var grpBoxHtml =
      '<div class="grp_box bct-grp-box clearit">' +
        '<div class="bct-grp-top">' +
          '<a href="' + esc(uHref) + '"><img src="' + esc(detail.authorAvatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg') + '" alt="' + esc(detail.author) + '" class="bct-grp-avatar" referrerpolicy="no-referrer" /></a>' +
          '<div class="line_detail bct-bio">' + (detail.bioHtml || '暂无目录简介。') + '</div>' +
        '</div>' +
        '<div class="bct-grp-meta-bar">' +
          '<div class="bct-grp-timestamps">' +
            '<a href="' + esc(uHref) + '" class="l">' + esc(detail.author) + '</a>' +
            '<span>· 创建 ' + esc(detail.created || '未知') + '</span>' +
            '<span>· 更新 ' + esc(detail.updated || detail.created || '刚刚') + '</span>' +
            '<span>· ' + esc((detail.collects || 0) + (isCollected ? 1 : 0)) + ' 人收藏</span>' +
          '</div>' +
          '<div class="rr" style="display:flex;gap:8px;flex-wrap:wrap;">' + rrBtns + '</div>' +
        '</div>' +
        '<div class="bct-progress-panel" id="bctProgressPanel">' +
          '<div class="bct-progress-head">' +
            '<span>📊 我的目录完成度：已看过 / 完成 <strong>' + doneCount + '</strong> / ' + allEntries.length + ' 项</span>' +
            '<span style="color:var(--accent);font-family:var(--mono,monospace);">' + pct + '%</span>' +
          '</div>' +
          '<div class="bct-progress-track"><div class="bct-progress-fill" style="width:' + pct + '%;"></div></div>' +
        '</div>' +
      '</div>';

    var toolsHtml =
      '<div id="browserTools" class="bct-tools clearit">' +
        '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">' +
          '<input type="search" id="bctDetailFilterInput" class="bct-search-input" value="' + esc(state.itemQ) + '" placeholder="在当前目录内过滤条目 / 评语..." />' +
          '<span style="font-size:12px;color:var(--bct-muted);white-space:nowrap;">显示 ' + filtered.length + ' / ' + allEntries.length + '</span>' +
        '</div>' +
        '<ul id="browserTypeSelector" class="browserTypeSelector bct-view-tabs">' +
          '<li><a href="javascript:void(0)" class="' + (state.view === 'compact' ? 'active' : '') + '" data-act="set-view" data-view="compact">精简</a></li>' +
          '<li><a href="javascript:void(0)" class="' + (state.view === 'list' ? 'active' : '') + '" data-act="set-view" data-view="list">列表</a></li>' +
          '<li><a href="javascript:void(0)" class="' + (state.view === 'grid' ? 'active' : '') + '" data-act="set-view" data-view="grid">网格</a></li>' +
        '</ul>' +
      '</div>';

    var listCls = 'browserFull browser-list browser-index bct-items' + (state.view === 'grid' ? ' is-grid' : (state.view === 'compact' ? ' is-compact' : ''));
    var itemsHtml = filtered.length
      ? '<ul id="browserItemList" class="' + listCls + '">' + filtered.map(function (e, i) { return renderEntryCardHtml(e, i, filtered.length, owner, doneMap); }).join('') + '</ul>'
      : '<div style="padding:28px;text-align:center;color:var(--bct-muted);">当前分类下暂无条目，可切换「全部」或点击「添加新条目」。</div>';

    // Discussion Section
    var comments = getMergedComments(detail);
    var likesMap = readJson(KEYS.LIKES, {});
    var cmtsHtml = comments.length
      ? comments.map(function (c) {
          var likeCnt = (likesMap[c.id] || 0);
          var subsHtml = (c.subs || []).map(function (s) {
            return (
              '<div class="bct-sub-reply-item">' +
                '<img src="' + esc(s.avatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg') + '" alt="" referrerpolicy="no-referrer" />' +
                '<div><strong>' + esc(s.user) + '</strong> <small style="color:var(--bct-muted);">' + esc(s.time) + '</small><div>' + (s.html || esc(s.text || '')) + '</div></div>' +
              '</div>'
            );
          }).join('');
          var subBox = state.openSubId === c.id
            ? '<div style="margin-top:8px;display:flex;gap:6px;"><input type="text" id="bctSubInput_' + esc(c.id) + '" class="bct-search-input" placeholder="回复 ' + esc(c.user) + '..." /><button type="button" class="chiiBtn is-primary" data-act="submit-sub" data-cid="' + esc(c.id) + '">发送</button></div>'
            : '';
          return (
            '<div id="post_' + esc(c.id) + '" class="row_reply bct-reply-row">' +
              '<img src="' + esc(c.avatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg') + '" alt="' + esc(c.user) + '" class="bct-reply-avatar" referrerpolicy="no-referrer" />' +
              '<div class="bct-reply-inner">' +
                '<div class="bct-reply-head">' +
                  '<div><strong>' + esc(c.user) + '</strong> <span style="color:var(--bct-muted);">' + esc(c.floor || '') + ' · ' + esc(c.time || '') + '</span></div>' +
                  '<div style="display:flex;gap:6px;">' +
                    '<button type="button" class="bct-mini-op" data-act="like-cmt" data-cid="' + esc(c.id) + '">👍 贴贴' + (likeCnt ? ' (' + likeCnt + ')' : '') + '</button>' +
                    '<button type="button" class="bct-mini-op" data-act="toggle-sub" data-cid="' + esc(c.id) + '">💬 回复</button>' +
                  '</div>' +
                '</div>' +
                '<div class="bct-reply-msg">' + (c.html || esc(c.text || '')) + '</div>' +
                (subsHtml ? '<div class="bct-sub-replies">' + subsHtml + '</div>' : '') +
                subBox +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<div style="padding:18px;text-align:center;color:var(--bct-muted);">还没有留言，欢迎在下方发表对本目录的建议或补充条目。</div>';

    var commentsCardHtml =
      '<section class="bct-card" id="bctCommentsSection">' +
        '<div class="bct-section-head">' +
          '<h2 class="title">💬 目录讨论区 (' + comments.length + ')</h2>' +
          '<div class="bct-pill-group">' +
            '<button type="button" class="bct-pill-btn' + (state.cmtSort === 'asc' ? ' active' : '') + '" data-act="cmt-sort" data-sort="asc">顺序</button>' +
            '<button type="button" class="bct-pill-btn' + (state.cmtSort === 'desc' ? ' active' : '') + '" data-act="cmt-sort" data-sort="desc">倒序</button>' +
          '</div>' +
        '</div>' +
        '<div id="comment_list">' + cmtsHtml + '</div>' +
        '<form id="ReplyForm" class="bct-reply-form" style="margin-top:14px;">' +
          '<textarea id="bctReplyInput" placeholder="在目录底部留言，或推荐值得补充的条目 / 角色 / 人物..."></textarea>' +
          '<div style="display:flex;justify-content:flex-end;">' +
            '<button type="submit" class="chiiBtn is-primary">发表目录留言</button>' +
          '</div>' +
        '</form>' +
      '</section>';

    colA.innerHTML =
      grpBoxHtml +
      '<section class="bct-card">' + toolsHtml + itemsHtml + '</section>' +
      commentsCardHtml;

    // Sidebar
    var otherHtml = (detail.otherCatalogs || []).slice(0, 8).map(function (oc) {
      return '<li><a href="catalog.html?id=' + esc(oc.id) + '" data-act="open-catalog" data-id="' + esc(oc.id) + '">📑 ' + esc(oc.title) + '</a></li>';
    }).join('');
    var sideCmtsHtml = (detail.sideComments || []).slice(0, 5).map(function (sc) {
      return '<li><a href="#bctCommentsSection">💬 ' + esc(sc.text) + '<br><small style="color:var(--bct-muted);">' + esc(sc.time) + '</small></a></li>';
    }).join('');

    colB.innerHTML =
      '<div class="SidePanel bct-side-panel">' +
        '<h2><span>/ 目录操作与归档</span></h2>' +
        '<ul class="bct-side-list">' +
          '<li><a href="catalog.html" data-act="switch-plaza-tab" data-tab="plaza">← 返回目录广场</a></li>' +
          '<li><a href="' + esc(detail.url || ('https://bgm.tv/index/' + detail.id)) + '" target="_blank" rel="noopener">↗ 在 Bangumi 原站打开</a></li>' +
        '</ul>' +
      '</div>' +
      (otherHtml ? '<div class="SidePanel bct-side-panel"><h2><span>/ ' + esc(detail.author) + ' 编纂的其他目录</span></h2><ul class="bct-side-list">' + otherHtml + '</ul></div>' : '') +
      (sideCmtsHtml ? '<div class="SidePanel bct-side-panel"><h2><span>/ 最新留言</span></h2><ul class="bct-side-list">' + sideCmtsHtml + '</ul></div>' : '');
  }

  function renderAll() {
    var detail = state.route === 'detail' ? getCatalogDetail(state.id) : null;
    if (state.route === 'detail' && !detail) {
      state.route = 'plaza';
      state.id = '';
    }
    renderHeader(detail);
    if (state.route === 'detail' && detail) {
      renderDetailView(detail);
    } else {
      renderPlazaAndLists();
    }
    syncUrl(false);
  }

  function openCreateModal(editCid) {
    var modal = $('bctCreateModal');
    var titleH = $('bctCreateModalTitle');
    var hid = $('bctEditCatalogId');
    var tIn = $('bctCatTitleInput');
    var bIn = $('bctCatBioInput');
    if (!modal) return;
    if (editCid) {
      var d = getCatalogDetail(editCid);
      if (titleH) titleH.textContent = '✏️ 修改目录信息';
      if (hid) hid.value = editCid;
      if (tIn) tIn.value = d ? d.title : '';
      if (bIn) bIn.value = d ? String(d.bioHtml || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '';
    } else {
      if (titleH) titleH.textContent = '📑 创建新目录';
      if (hid) hid.value = '';
      if (tIn) tIn.value = '';
      if (bIn) bIn.value = '';
    }
    modal.hidden = false;
  }

  function renderPoolResults(q) {
    var host = $('bctPoolResults');
    if (!host) return;
    var ql = (q || '').trim().toLowerCase();
    var list = (DATA.addPool || []).filter(function (it) {
      if (!ql) return true;
      return (String(it.title || '') + ' ' + String(it.info || '')).toLowerCase().indexOf(ql) !== -1;
    }).slice(0, 24);
    host.innerHTML = list.map(function (it) {
      return (
        '<div class="bct-pool-row">' +
          '<div class="bct-pool-row-left">' +
            (it.cover ? '<img src="' + esc(it.cover) + '" alt="" referrerpolicy="no-referrer" />' : '') +
            '<div style="min-width:0;">' +
              '<div class="bct-pool-row-title">' + esc(it.title) + '</div>' +
              '<div style="font-size:11.5px;color:var(--bct-muted);">' + esc(KIND_LABELS[it.cat] || it.kind) + (it.info ? ' · ' + esc(it.info.slice(0, 36)) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="chiiBtn is-primary" data-act="pick-pool-item" data-kind="' + esc(it.kind) + '" data-pid="' + esc(it.id) + '">+ 收录</button>' +
        '</div>'
      );
    }).join('');
  }

  function openAddItemModal() {
    var modal = $('bctAddItemModal');
    var sIn = $('bctPoolSearchInput');
    var nIn = $('bctPoolNoteInput');
    if (!modal) return;
    if (sIn) sIn.value = '';
    if (nIn) nIn.value = '';
    renderPoolResults('');
    modal.hidden = false;
  }

  function openEditNoteModal(relId) {
    var detail = getCatalogDetail(state.id);
    if (!detail) return;
    var entry = (detail.entries || []).find(function (e) { return String(e.relId) === String(relId); });
    if (!entry) return;
    var modal = $('bctEditNoteModal');
    if (!modal) return;
    $('bctNoteRelId').value = relId;
    $('bctNoteBadgeInput').value = entry.badge || '';
    $('bctNoteTextInput').value = entry.comment || '';
    modal.hidden = false;
  }

  function closeAllModals() {
    ['bctCreateModal', 'bctAddItemModal', 'bctEditNoteModal'].forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = true;
    });
  }

  function saveDetailEntries(detail, newEntries) {
    var edits = readJson(KEYS.EDITS, {});
    var prev = edits[detail.id] || {};
    prev.entries = newEntries;
    prev.updated = '刚刚';
    edits[detail.id] = prev;
    writeJson(KEYS.EDITS, edits);
  }

  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act');

      if (act === 'open-create') {
        ev.preventDefault();
        openCreateModal('');
      } else if (act === 'open-edit-catalog') {
        ev.preventDefault();
        openCreateModal(state.id);
      } else if (act === 'open-add-item') {
        ev.preventDefault();
        openAddItemModal();
      } else if (act === 'close-modal') {
        ev.preventDefault();
        closeAllModals();
      } else if (act === 'open-catalog') {
        ev.preventDefault();
        state.id = el.getAttribute('data-id') || '';
        state.route = 'detail';
        state.cat = 'all';
        state.itemQ = '';
        syncUrl(true);
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'switch-plaza-tab') {
        ev.preventDefault();
        var tab = el.getAttribute('data-tab') || 'plaza';
        state.id = '';
        state.page = 1;
        if (tab === 'user553488') { state.route = 'user'; state.uid = '553488'; }
        else if (tab === 'usersai') { state.route = 'user'; state.uid = 'sai'; }
        else if (tab === 'collected') { state.route = 'collected'; }
        else if (tab === 'browser') { state.route = 'browser'; }
        else { state.route = 'plaza'; }
        syncUrl(true);
        renderAll();
      } else if (act === 'switch-cat') {
        ev.preventDefault();
        state.cat = el.getAttribute('data-cat') || 'all';
        syncUrl(true);
        renderAll();
      } else if (act === 'set-sort') {
        ev.preventDefault();
        state.sort = el.getAttribute('data-sort') || 'popular';
        state.page = 1;
        renderAll();
      } else if (act === 'go-page') {
        ev.preventDefault();
        state.page = parseInt(el.getAttribute('data-page') || '1', 10) || 1;
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'set-view') {
        ev.preventDefault();
        state.view = el.getAttribute('data-view') || 'list';
        renderAll();
      } else if (act === 'toggle-collect-catalog') {
        ev.preventDefault();
        toggleCollectCatalog(state.id);
      } else if (act === 'toggle-owner-demo') {
        ev.preventDefault();
        state.demoOwnerMode = !state.demoOwnerMode;
        showToast(state.demoOwnerMode ? '已切换至创建者管理视角' : '已切换回访客浏览视角');
        renderAll();
      } else if (act === 'delete-catalog') {
        ev.preventDefault();
        var del = readJson(KEYS.DELETED, {});
        del[state.id] = true;
        writeJson(KEYS.DELETED, del);
        showToast('目录已删除');
        state.route = 'plaza';
        state.id = '';
        syncUrl(true);
        renderAll();
      } else if (act === 'toggle-done') {
        ev.preventDefault();
        toggleItemDone(el.getAttribute('data-key'));
      } else if (act === 'shell-collect') {
        ev.preventDefault();
        if (window.BgmShell && typeof window.BgmShell.openCollect === 'function') {
          window.BgmShell.openCollect({ id: el.getAttribute('data-sid'), title: el.getAttribute('data-title') });
        } else {
          showToast('已打开条目收藏面板');
        }
      } else if (act === 'pick-pool-item') {
        ev.preventDefault();
        var detail = getCatalogDetail(state.id);
        if (!detail) return;
        var kind = el.getAttribute('data-kind');
        var pid = el.getAttribute('data-pid');
        var poolItem = (DATA.addPool || []).find(function (p) { return p.kind === kind && String(p.id) === String(pid); });
        if (!poolItem) return;
        var noteVal = ($('bctPoolNoteInput') || {}).value || '';
        var entries = (detail.entries || []).slice();
        entries.unshift({
          relId: 'add_' + Date.now(),
          kind: poolItem.kind,
          cat: poolItem.cat,
          id: poolItem.id,
          title: poolItem.title,
          badge: KIND_LABELS[poolItem.cat] || '新增收录',
          cover: poolItem.cover,
          isSquare: poolItem.cat === '3' || poolItem.kind === 'blog',
          info: poolItem.info,
          comment: noteVal.trim(),
          href: poolItem.href
        });
        saveDetailEntries(detail, entries);
        closeAllModals();
        showToast('已将「' + poolItem.title + '」加入目录');
        renderAll();
      } else if (act === 'open-edit-note') {
        ev.preventDefault();
        openEditNoteModal(el.getAttribute('data-rel'));
      } else if (act === 'move-item') {
        ev.preventDefault();
        var d2 = getCatalogDetail(state.id);
        if (!d2) return;
        var rel = el.getAttribute('data-rel');
        var dir = parseInt(el.getAttribute('data-dir') || '0', 10);
        var arr = (d2.entries || []).slice();
        var idx = arr.findIndex(function (e) { return String(e.relId) === String(rel); });
        var target = idx + dir;
        if (idx >= 0 && target >= 0 && target < arr.length) {
          var tmp = arr[idx];
          arr[idx] = arr[target];
          arr[target] = tmp;
          saveDetailEntries(d2, arr);
          showToast('已调整目录条目顺序');
          renderAll();
        }
      } else if (act === 'remove-item') {
        ev.preventDefault();
        var d3 = getCatalogDetail(state.id);
        if (!d3) return;
        var relR = el.getAttribute('data-rel');
        var filtered = (d3.entries || []).filter(function (e) { return String(e.relId) !== String(relR); });
        saveDetailEntries(d3, filtered);
        showToast('已将该条目移出目录');
        renderAll();
      } else if (act === 'cmt-sort') {
        ev.preventDefault();
        state.cmtSort = el.getAttribute('data-sort') || 'asc';
        renderAll();
      } else if (act === 'like-cmt') {
        ev.preventDefault();
        var cid = el.getAttribute('data-cid');
        var lm = readJson(KEYS.LIKES, {});
        lm[cid] = (lm[cid] || 0) + 1;
        writeJson(KEYS.LIKES, lm);
        showToast('已给该楼层贴贴 👍');
        renderAll();
      } else if (act === 'toggle-sub') {
        ev.preventDefault();
        var scid = el.getAttribute('data-cid');
        state.openSubId = state.openSubId === scid ? null : scid;
        renderAll();
      } else if (act === 'submit-sub') {
        ev.preventDefault();
        var rcId = el.getAttribute('data-cid');
        var inp = $('bctSubInput_' + rcId);
        var txt = inp ? inp.value.trim() : '';
        if (!txt) return;
        var subStore = readJson(KEYS.SUBS, {});
        if (!subStore[rcId]) subStore[rcId] = [];
        subStore[rcId].push({
          id: 'sub_' + Date.now(),
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: '刚刚',
          html: esc(txt)
        });
        writeJson(KEYS.SUBS, subStore);
        state.openSubId = null;
        showToast('已发送楼中楼回复');
        renderAll();
      }
    });

    document.addEventListener('input', function (ev) {
      if (ev.target.id === 'bctPlazaSearch') {
        state.q = ev.target.value;
        state.page = 1;
        renderPlazaAndLists();
      } else if (ev.target.id === 'bctDetailFilterInput') {
        state.itemQ = ev.target.value;
        var d = getCatalogDetail(state.id);
        if (d) renderDetailView(d);
      } else if (ev.target.id === 'bctPoolSearchInput') {
        renderPoolResults(ev.target.value);
      }
    });

    document.addEventListener('submit', function (ev) {
      if (ev.target.id === 'bctCreateForm') {
        ev.preventDefault();
        var editId = ($('bctEditCatalogId') || {}).value || '';
        var title = ($('bctCatTitleInput') || {}).value.trim();
        var bio = ($('bctCatBioInput') || {}).value.trim().replace(/\n/g, '<br />');
        if (!title) return;
        if (editId) {
          var edits = readJson(KEYS.EDITS, {});
          edits[editId] = Object.assign({}, edits[editId] || {}, { title: title, bioHtml: bio, updated: '刚刚' });
          writeJson(KEYS.EDITS, edits);
          closeAllModals();
          showToast('已更新目录信息');
          renderAll();
        } else {
          var newId = String(100100 + Math.floor(Math.random() * 9000));
          var custom = readJson(KEYS.CUSTOM, {});
          custom[newId] = {
            id: newId,
            title: title,
            author: '少年游',
            authorUid: '553488',
            authorAvatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
            bioHtml: bio || '自建专题目录，欢迎继续往里添加条目。',
            created: '刚刚',
            updated: '刚刚',
            collects: 1,
            entries: [],
            sideComments: [],
            otherCatalogs: [],
            comments: [],
            isCustom: true
          };
          writeJson(KEYS.CUSTOM, custom);
          closeAllModals();
          state.route = 'detail';
          state.id = newId;
          state.cat = 'all';
          syncUrl(true);
          showToast('新目录「' + title + '」创建成功！');
          renderAll();
        }
      } else if (ev.target.id === 'bctEditNoteForm') {
        ev.preventDefault();
        var d = getCatalogDetail(state.id);
        if (!d) return;
        var rel = ($('bctNoteRelId') || {}).value || '';
        var badge = ($('bctNoteBadgeInput') || {}).value.trim();
        var note = ($('bctNoteTextInput') || {}).value.trim();
        var arr = (d.entries || []).map(function (e) {
          if (String(e.relId) === String(rel)) {
            return Object.assign({}, e, { badge: badge, comment: note });
          }
          return e;
        });
        saveDetailEntries(d, arr);
        closeAllModals();
        showToast('已保存推荐评语');
        renderAll();
      } else if (ev.target.id === 'ReplyForm') {
        ev.preventDefault();
        var rInp = $('bctReplyInput');
        var rTxt = rInp ? rInp.value.trim() : '';
        if (!rTxt) return;
        var store = readJson(KEYS.COMMENTS, {});
        if (!store[state.id]) store[state.id] = [];
        store[state.id].push({
          id: 'catc_' + Date.now(),
          floor: '#' + (getMergedComments(getCatalogDetail(state.id)).length + 1),
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          sign: '时光机档案管理员',
          time: '刚刚',
          html: esc(rTxt),
          subs: []
        });
        writeJson(KEYS.COMMENTS, store);
        showToast('已发表目录留言');
        renderAll();
      }
    });

    var headerSearch = $('headerSearch');
    if (headerSearch) {
      headerSearch.addEventListener('submit', function (e) {
        e.preventDefault();
        var qEl = $('search_text');
        var q = qEl ? qEl.value.trim() : '';
        if (q) {
          window.location.href = 'search.html?q=' + encodeURIComponent(q);
        }
      });
    }

    window.addEventListener('popstate', function () {
      readUrlParams();
      renderAll();
    });
  }

  readUrlParams();
  renderAll();
  bindEvents();
})();
