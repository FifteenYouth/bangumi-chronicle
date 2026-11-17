/* ==========================================================================
 * D1 · P18 人物频道聚合页交互逻辑 (bangumi-mono.js)
 * 支持路由:
 *   ?tab=home|character|person|update|my_character|my_person
 *   &type=1|2|3|4|6|7|8 &bloodtype=1..4 &gender=1|2 &month=1..12 &day=1..31
 *   &orderby=collects|comment|dateline|title &view=list|grid &q=... &user=553488|sai &page=1..N
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_MONO_DATA || {
    home: {
      recentCharacters: [], recentPersons: [],
      popularCharacters: [], popularPersons: [],
      birthdayCharacters: { total: 0, month: 11, day: 13, items: [] },
      birthdayPersons: { total: 0, month: 11, day: 13, items: [] },
      newCharacters: [], newPersons: []
    },
    characters: [],
    persons: [],
    updates: [],
    userCollections: {}
  };

  var FAV_STORAGE_KEY = 'bgm_mono_favs_v1';
  var PAGE_SIZE = 18;

  var CHAR_TYPES = [
    { val: '', label: '全部类型' },
    { val: '1', label: '角色' },
    { val: '2', label: '机体' },
    { val: '3', label: '舰船' },
    { val: '4', label: '组织机构' }
  ];

  var PERSON_JOBS = [
    { val: '', label: '全部职业' },
    { val: '1', label: '声优' },
    { val: '2', label: '漫画家' },
    { val: '7', label: '绘师' },
    { val: '3', label: '制作人' },
    { val: '4', label: '音乐人' },
    { val: '8', label: '作家' },
    { val: '6', label: '演员' }
  ];

  var BLOOD_TYPES = [
    { val: '', label: '全部' },
    { val: '1', label: 'A型' },
    { val: '2', label: 'B型' },
    { val: '3', label: 'AB型' },
    { val: '4', label: 'O型' }
  ];

  var GENDERS = [
    { val: '', label: '全部' },
    { val: '1', label: '男' },
    { val: '2', label: '女' }
  ];

  var SORTS = [
    { val: 'collects', label: '按收藏排序' },
    { val: 'comment', label: '按评论排序' },
    { val: 'dateline', label: '按日期排序' },
    { val: 'title', label: '按名称排序' }
  ];

  var TAB_META = {
    home: {
      kicker: 'MONO CHANNEL · 人物主页',
      title: '人物频道 · 虚构角色与现实人物',
      sub: '聚合近期注目角色/人物、全站高人气排行、今日寿星与新入维基词条。'
    },
    character: {
      kicker: 'CHARACTER BROWSER · /character',
      title: '虚构角色数据库',
      sub: '支持按类型、血型、性别、出生月份与日期多维筛选，共收录 229 条真实角色样本。'
    },
    person: {
      kicker: 'PERSON BROWSER · /person',
      title: '现实人物数据库',
      sub: '按声优、漫画家、绘师、音乐人、制作人、作家、演员及血型星座筛选浏览。'
    },
    update: {
      kicker: 'MONO UPDATES · /mono/update',
      title: '好友关注人物动态',
      sub: '实时汇总社区成员近期收藏与关注的角色/人物轨迹（源自 /timeline?type=mono）。'
    },
    my_character: {
      kicker: 'MY CHARACTERS · /user/{uid}/mono/character',
      title: '我收藏的虚构角色',
      sub: '管理个人收藏的角色档案，支持档案切换与本地收藏增删持久化。'
    },
    my_person: {
      kicker: 'MY PERSONS · /user/{uid}/mono/person',
      title: '我收藏的现实人物',
      sub: '管理个人关注的声优、监督、漫画家与音乐人收藏清单。'
    }
  };

  var state = {
    tab: 'home',
    type: '',
    bloodtype: '',
    gender: '',
    month: '',
    day: '',
    orderby: 'collects',
    view: 'list',
    q: '',
    scope: 'all',
    updateFilter: 'all',
    user: '553488',
    page: 1
  };

  var charMap = Object.create(null);
  var prsnMap = Object.create(null);

  function indexItem(it, preferOverwrite) {
    if (!it || !it.id) return;
    var kind = it.kind === 'person' ? 'person' : 'character';
    var map = kind === 'person' ? prsnMap : charMap;
    var sid = String(it.id);
    if (!map[sid] || preferOverwrite) {
      map[sid] = Object.assign({ kind: kind }, map[sid] || {}, it);
    }
  }

  (DATA.home && DATA.home.recentCharacters || []).forEach(function (c) { indexItem(c, false); });
  (DATA.home && DATA.home.popularCharacters || []).forEach(function (c) { indexItem(c, false); });
  (DATA.home && DATA.home.newCharacters || []).forEach(function (c) { indexItem(c, false); });
  (DATA.home && DATA.home.birthdayCharacters && DATA.home.birthdayCharacters.items || []).forEach(function (c) { indexItem(c, false); });
  (DATA.home && DATA.home.recentPersons || []).forEach(function (p) { indexItem(Object.assign({ kind: 'person' }, p), false); });
  (DATA.home && DATA.home.popularPersons || []).forEach(function (p) { indexItem(Object.assign({ kind: 'person' }, p), false); });
  (DATA.home && DATA.home.newPersons || []).forEach(function (p) { indexItem(Object.assign({ kind: 'person' }, p), false); });
  (DATA.home && DATA.home.birthdayPersons && DATA.home.birthdayPersons.items || []).forEach(function (p) { indexItem(Object.assign({ kind: 'person' }, p), false); });
  (DATA.updates || []).forEach(function (u) {
    (u.targets || []).forEach(function (t) { indexItem(t, false); });
  });
  Object.keys(DATA.userCollections || {}).forEach(function (uid) {
    var uc = DATA.userCollections[uid] || {};
    (uc.characters || []).forEach(function (c) { indexItem(Object.assign({ kind: 'character' }, c), false); });
    (uc.persons || []).forEach(function (p) { indexItem(Object.assign({ kind: 'person' }, p), false); });
  });
  (DATA.characters || []).forEach(function (c) { indexItem(c, true); });
  (DATA.persons || []).forEach(function (p) { indexItem(p, true); });

  function $(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(msg);
      return;
    }
    var box = $('toastContainer');
    if (!box) return;
    var item = document.createElement('div');
    item.className = 'glass-toast';
    item.textContent = msg;
    box.appendChild(item);
    setTimeout(function () { item.remove(); }, 2600);
  }

  /* --------------------- Favorites Storage --------------------- */
  function loadFavStore() {
    var store = {};
    try {
      var raw = localStorage.getItem(FAV_STORAGE_KEY);
      if (raw) store = JSON.parse(raw) || {};
    } catch (e) { store = {}; }
    ['553488', 'sai'].forEach(function (uid) {
      if (!store[uid]) {
        var uc = (DATA.userCollections && DATA.userCollections[uid]) || {};
        store[uid] = {
          character: (uc.characters || []).map(function (x) { return String(x.id); }),
          person: (uc.persons || []).map(function (x) { return String(x.id); })
        };
      }
    });
    return store;
  }

  var favStore = loadFavStore();

  function saveFavStore() {
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favStore));
    } catch (e) {}
  }

  function isFav(kind, id) {
    var u = favStore[state.user] || { character: [], person: [] };
    return (u[kind] || []).indexOf(String(id)) !== -1;
  }

  function toggleFav(kind, id) {
    var uid = state.user;
    if (!favStore[uid]) favStore[uid] = { character: [], person: [] };
    var arr = favStore[uid][kind] || [];
    var sid = String(id);
    var idx = arr.indexOf(sid);
    var item = getItem(kind, sid);
    var name = item ? item.name : '#' + sid;
    if (idx === -1) {
      arr.unshift(sid);
      favStore[uid][kind] = arr;
      saveFavStore();
      showToast('已收藏' + (kind === 'character' ? '角色' : '人物') + '：' + name);
    } else {
      arr.splice(idx, 1);
      favStore[uid][kind] = arr;
      saveFavStore();
      showToast('已取消收藏：' + name);
    }
    updateTabCounters();
  }

  function getItem(kind, id) {
    var sid = String(id);
    return kind === 'character' ? charMap[sid] : prsnMap[sid];
  }

  /* --------------------- URL Routing --------------------- */
  function hydrateFromUrl() {
    var sp = new URLSearchParams(window.location.search || '');
    var tab = sp.get('tab');
    if (tab && TAB_META[tab]) state.tab = tab;
    if (sp.get('type')) state.type = sp.get('type');
    if (sp.get('bloodtype')) state.bloodtype = sp.get('bloodtype');
    if (sp.get('gender')) state.gender = sp.get('gender');
    if (sp.get('month')) state.month = sp.get('month');
    if (sp.get('day')) state.day = sp.get('day');
    if (sp.get('orderby') && SORTS.some(function (s) { return s.val === sp.get('orderby'); })) {
      state.orderby = sp.get('orderby');
    }
    if (sp.get('view') === 'grid' || sp.get('view') === 'list') state.view = sp.get('view');
    if (sp.get('q')) state.q = sp.get('q');
    if (sp.get('scope')) state.scope = sp.get('scope');
    if (sp.get('user') && (sp.get('user') === '553488' || sp.get('user') === 'sai')) {
      state.user = sp.get('user');
    }
    var p = parseInt(sp.get('page'), 10);
    if (p && p > 0) state.page = p;
  }

  function syncUrl() {
    try {
      var sp = new URLSearchParams();
      if (state.tab !== 'home') sp.set('tab', state.tab);
      if (state.type) sp.set('type', state.type);
      if (state.bloodtype) sp.set('bloodtype', state.bloodtype);
      if (state.gender) sp.set('gender', state.gender);
      if (state.month) sp.set('month', state.month);
      if (state.day) sp.set('day', state.day);
      if (state.orderby !== 'collects') sp.set('orderby', state.orderby);
      if (state.view !== 'list') sp.set('view', state.view);
      if (state.q) sp.set('q', state.q);
      if (state.user !== '553488') sp.set('user', state.user);
      if (state.page > 1) sp.set('page', String(state.page));
      var qs = sp.toString();
      var next = window.location.pathname + (qs ? '?' + qs : '');
      window.history.replaceState(null, '', next);
    } catch (e) {}
  }

  /* --------------------- Avatar Helper --------------------- */
  function avatarHtml(item) {
    if (item && item.avatar) {
      return '<img src="' + esc(item.avatar) + '" alt="' + esc(item.name) + '" loading="lazy" referrerpolicy="no-referrer" />';
    }
    var initial = (item && item.name) ? item.name.trim().charAt(0).toUpperCase() : '?';
    var kindLabel = (item && item.kind === 'character') ? '角色' : '人物';
    return '<div class="bmn-avatar-fallback">' +
      '<span class="bmn-avatar-fallback-glyph">' + esc(initial) + '</span>' +
      '<span class="bmn-avatar-fallback-sub">' + kindLabel + '</span>' +
      '</div>';
  }

  /* --------------------- Header & Counters --------------------- */
  function updateTabCounters() {
    var u = favStore[state.user] || { character: [], person: [] };
    if ($('bmnTabCntChar')) $('bmnTabCntChar').textContent = String((DATA.characters || []).length);
    if ($('bmnTabCntPrsn')) $('bmnTabCntPrsn').textContent = String((DATA.persons || []).length);
    if ($('bmnTabCntUpd')) $('bmnTabCntUpd').textContent = String((DATA.updates || []).length);
    if ($('bmnTabCntMyChar')) $('bmnTabCntMyChar').textContent = String((u.character || []).length);
    if ($('bmnTabCntMyPrsn')) $('bmnTabCntMyPrsn').textContent = String((u.person || []).length);
    if ($('bmnStatChars')) $('bmnStatChars').textContent = '虚构角色 ' + (DATA.characters || []).length;
    if ($('bmnStatPrsns')) $('bmnStatPrsns').textContent = '现实人物 ' + (DATA.persons || []).length;
    if ($('bmnStatUpdates')) $('bmnStatUpdates').textContent = '实时动态 ' + (DATA.updates || []).length;
  }

  function syncHeroHeader() {
    var meta = TAB_META[state.tab] || TAB_META.home;
    if ($('bmnKickerBadge')) $('bmnKickerBadge').textContent = meta.kicker;
    if ($('bmnPageTitle')) $('bmnPageTitle').textContent = meta.title;
    if ($('bmnPageSubtitle')) $('bmnPageSubtitle').textContent = meta.sub;
    var tabs = document.querySelectorAll('.bmn-subtab-btn[data-bmn-tab]');
    Array.prototype.forEach.call(tabs, function (btn) {
      var active = btn.getAttribute('data-bmn-tab') === state.tab;
      btn.classList.toggle('is-active', active);
      btn.classList.toggle('focus', active);
    });
    if ($('bmnMonoSearchInput') && $('bmnMonoSearchInput').value !== state.q) {
      $('bmnMonoSearchInput').value = state.q;
    }
    if ($('siteSearchSelect')) {
      if (state.tab === 'character') $('siteSearchSelect').value = 'crt';
      else if (state.tab === 'person') $('siteSearchSelect').value = 'prsn';
      else $('siteSearchSelect').value = state.scope || 'all';
    }
  }

  /* --------------------- Filtering & Sorting --------------------- */
  function filterItems(kind) {
    var list = kind === 'character' ? (DATA.characters || []) : (DATA.persons || []);
    var kw = (state.q || '').trim().toLowerCase();

    var filtered = list.filter(function (it) {
      if (kind === 'character' && state.type && String(it.type) !== state.type) return false;
      if (kind === 'person' && state.type) {
        if (!it.jobs || it.jobs.indexOf(state.type) === -1) return false;
      }
      if (state.bloodtype && String(it.bloodtype) !== state.bloodtype) return false;
      if (state.gender && String(it.gender) !== state.gender) return false;
      if (state.month && Number(it.birthMonth) !== Number(state.month)) return false;
      if (state.day && Number(it.birthDay) !== Number(state.day)) return false;
      if (kw) {
        var hay = [it.name, it.cnName, it.infoLine, it.workTitle, (it.jobLabels || []).join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    });

    var sorted = filtered.slice();
    if (state.orderby === 'collects') {
      sorted.sort(function (a, b) {
        return (a.collectsRank - b.collectsRank) || (b.comments - a.comments) || (a.datelineOrder - b.datelineOrder);
      });
    } else if (state.orderby === 'comment') {
      sorted.sort(function (a, b) {
        return (b.comments - a.comments) || (a.collectsRank - b.collectsRank);
      });
    } else if (state.orderby === 'dateline') {
      sorted.sort(function (a, b) {
        return (a.datelineOrder - b.datelineOrder) || (Number(b.id) - Number(a.id));
      });
    } else if (state.orderby === 'title') {
      sorted.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      });
    }
    return sorted;
  }

  /* --------------------- Renderers --------------------- */
  function portraitCardHtml(item, rankIdx) {
    var saved = isFav(item.kind, item.id);
    var sub = item.cnName || item.typeLabel || (item.jobLabels && item.jobLabels[0]) || item.birthday || ('#' + item.id);
    return '<li class="bmn-portrait-card" data-bmn-open="' + esc(item.kind) + ':' + esc(item.id) + '">' +
      '<div class="bmn-portrait-thumb">' +
        avatarHtml(item) +
        (rankIdx ? '<span class="bmn-rank-badge' + (rankIdx <= 3 ? ' is-top3' : '') + '">#' + rankIdx + '</span>' : '') +
        '<button type="button" class="bmn-fav-dot' + (saved ? ' is-saved' : '') + '" ' +
          'data-bmn-fav="' + esc(item.kind) + ':' + esc(item.id) + '" ' +
          'title="' + (saved ? '取消收藏' : '收藏') + '">' + (saved ? '♥' : '♡') + '</button>' +
      '</div>' +
      '<div class="bmn-portrait-body">' +
        '<div class="bmn-portrait-name">' + esc(item.name) + '</div>' +
        '<div class="bmn-portrait-cn">' + esc(sub) + '</div>' +
      '</div>' +
    '</li>';
  }

  function sidePortHtml(item) {
    return '<dl class="side_port bmn-side-port" data-bmn-open="' + esc(item.kind) + ':' + esc(item.id) + '" title="' + esc(item.name) + '">' +
      '<dt class="bmn-side-avatar">' + avatarHtml(item) + '</dt>' +
      '<dd class="bmn-side-name">' + esc(item.name) + '</dd>' +
    '</dl>';
  }

  function renderHome() {
    var h = DATA.home || {};
    var bc = h.birthdayCharacters || { total: 64, month: 11, day: 13, items: [] };
    var bp = h.birthdayPersons || { total: 76, month: 11, day: 13, items: [] };

    return '<div class="bmn-home-columns">' +
      '<div class="bmn-home-left" id="columnSubjectBrowserA">' +
        '<section class="bmn-glass-panel">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🔥 近期注目角色</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="character">更多角色 »</button>' +
          '</div>' +
          '<ul class="coversSmall bmn-covers-grid">' +
            (h.recentCharacters || []).map(function (it) { return portraitCardHtml(it, 0); }).join('') +
          '</ul>' +
        '</section>' +

        '<section class="bmn-glass-panel">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">✨ 近期注目人物</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="person">更多人物 »</button>' +
          '</div>' +
          '<ul class="coversSmall bmn-covers-grid">' +
            (h.recentPersons || []).map(function (it) { return portraitCardHtml(it, 0); }).join('') +
          '</ul>' +
        '</section>' +

        '<section class="bmn-glass-panel">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🏆 最受欢迎角色 Top 8</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="character" data-bmn-orderby="collects">全站排行 »</button>' +
          '</div>' +
          '<ul class="coversSmall bmn-covers-grid is-compact">' +
            (h.popularCharacters || []).map(function (it, i) { return portraitCardHtml(it, i + 1); }).join('') +
          '</ul>' +
        '</section>' +

        '<section class="bmn-glass-panel">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🎖️ 最受欢迎人物 Top 8</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="person" data-bmn-orderby="collects">全站排行 »</button>' +
          '</div>' +
          '<ul class="coversSmall bmn-covers-grid is-compact">' +
            (h.popularPersons || []).map(function (it, i) { return portraitCardHtml(it, i + 1); }).join('') +
          '</ul>' +
        '</section>' +
      '</div>' +

      '<aside class="bmn-home-right" id="columnSubjectBrowserB">' +
        '<section class="bmn-glass-panel sideInner">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🎂 今日生日角色 <span class="bmn-bday-chip">x' + esc(bc.total) + '</span></h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-bday="character:' + esc(bc.month) + ':' + esc(bc.day) + '">查看全部 »</button>' +
          '</div>' +
          '<div class="bmn-side-grid">' +
            (bc.items || []).map(sidePortHtml).join('') +
          '</div>' +
        '</section>' +

        '<section class="bmn-glass-panel sideInner">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🎉 今日生日人物 <span class="bmn-bday-chip">x' + esc(bp.total) + '</span></h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-bday="person:' + esc(bp.month) + ':' + esc(bp.day) + '">查看全部 »</button>' +
          '</div>' +
          '<div class="bmn-side-grid">' +
            (bp.items || []).map(sidePortHtml).join('') +
          '</div>' +
        '</section>' +

        '<section class="bmn-glass-panel sideInner">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🆕 新入虚构角色</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="character" data-bmn-orderby="dateline">更多 »</button>' +
          '</div>' +
          '<div class="bmn-side-grid">' +
            (h.newCharacters || []).map(sidePortHtml).join('') +
          '</div>' +
        '</section>' +

        '<section class="bmn-glass-panel sideInner">' +
          '<div class="bmn-section-head">' +
            '<h2 class="bmn-section-title">🆕 新入现实人物</h2>' +
            '<button type="button" class="bmn-section-more" data-bmn-jump="person" data-bmn-orderby="dateline">更多 »</button>' +
          '</div>' +
          '<div class="bmn-side-grid">' +
            (h.newPersons || []).map(sidePortHtml).join('') +
          '</div>' +
        '</section>' +
      '</aside>' +
    '</div>';
  }

  function renderFilterSidebar(kind) {
    var types = kind === 'character' ? CHAR_TYPES : PERSON_JOBS;
    var typeHeading = kind === 'character' ? '类型' : '职业';
    var months = [{ val: '', label: '全部月份' }];
    for (var m = 1; m <= 12; m++) months.push({ val: String(m), label: m + '月' });

    return '<aside class="bmn-glass-panel bmn-filter-sidebar" id="columnCrtBrowserA">' +
      '<div class="bmn-filter-group">' +
        '<h3>' + typeHeading + '</h3>' +
        '<ul class="bmn-filter-pills">' +
          types.map(function (t) {
            return '<li><button type="button" class="bmn-filter-pill' + (state.type === t.val ? ' is-active' : '') +
              '" data-bmn-filter="type" data-bmn-val="' + esc(t.val) + '">' + esc(t.label) + '</button></li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="bmn-filter-group">' +
        '<h3>血型</h3>' +
        '<ul class="bmn-filter-pills">' +
          BLOOD_TYPES.map(function (b) {
            return '<li><button type="button" class="bmn-filter-pill' + (state.bloodtype === b.val ? ' is-active' : '') +
              '" data-bmn-filter="bloodtype" data-bmn-val="' + esc(b.val) + '">' + esc(b.label) + '</button></li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="bmn-filter-group">' +
        '<h3>性别</h3>' +
        '<ul class="bmn-filter-pills">' +
          GENDERS.map(function (g) {
            return '<li><button type="button" class="bmn-filter-pill' + (state.gender === g.val ? ' is-active' : '') +
              '" data-bmn-filter="gender" data-bmn-val="' + esc(g.val) + '">' + esc(g.label) + '</button></li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="bmn-filter-group">' +
        '<h3>出生月份</h3>' +
        '<div class="bmn-month-grid">' +
          months.map(function (mo) {
            return '<button type="button" class="bmn-filter-pill' + (String(state.month) === mo.val ? ' is-active' : '') +
              '" data-bmn-filter="month" data-bmn-val="' + esc(mo.val) + '">' + esc(mo.label) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="bmn-sidebar-actions">' +
        '<button type="button" class="bmn-reset-btn" data-bmn-act="reset-filters">↺ 重置所有筛选</button>' +
        '<button type="button" class="bmn-create-link" data-bmn-act="wiki-new" data-bmn-kind="' + esc(kind) + '">＋ 创建新的' + (kind === 'character' ? '虚构角色' : '现实人物') + '</button>' +
      '</div>' +
    '</aside>';
  }

  function activeChipsHtml(kind, total) {
    var chips = [];
    if (state.type) {
      var list = kind === 'character' ? CHAR_TYPES : PERSON_JOBS;
      var found = list.find(function (x) { return x.val === state.type; });
      chips.push({ k: 'type', label: (kind === 'character' ? '类型：' : '职业：') + (found ? found.label : state.type) });
    }
    if (state.bloodtype) {
      var bf = BLOOD_TYPES.find(function (x) { return x.val === state.bloodtype; });
      chips.push({ k: 'bloodtype', label: '血型：' + (bf ? bf.label : state.bloodtype) });
    }
    if (state.gender) {
      var gf = GENDERS.find(function (x) { return x.val === state.gender; });
      chips.push({ k: 'gender', label: '性别：' + (gf ? gf.label : state.gender) });
    }
    if (state.month) {
      chips.push({ k: 'month', label: '出生：' + state.month + '月' + (state.day ? state.day + '日' : '') });
    }
    if (state.q) {
      chips.push({ k: 'q', label: '关键词：「' + state.q + '」' });
    }
    if (!chips.length) return '';
    return '<div class="bmn-active-chips">' +
      chips.map(function (c) {
        return '<button type="button" class="bmn-active-chip" data-bmn-clear="' + esc(c.k) + '">' + esc(c.label) + ' ✕</button>';
      }).join('') +
      '<span class="bmn-stat-pill">匹配 ' + total + ' 条</span>' +
    '</div>';
  }

  function detailHref(kind, id) {
    return (kind === 'person' ? 'person.html?id=' : 'character.html?id=') + encodeURIComponent(id);
  }

  function listRowHtml(item) {
    var saved = isFav(item.kind, item.id);
    var badges = '';
    if (item.kind === 'character') {
      if (item.typeLabel) badges += '<span class="bmn-badge-job">' + esc(item.typeLabel) + '</span>';
      if (item.workTitle) badges += '<span class="bmn-badge-job">出自《' + esc(item.workTitle) + '》</span>';
    } else {
      badges = (item.jobLabels || []).map(function (j) {
        return '<span class="bmn-badge-job badge_job">' + esc(j) + '</span>';
      }).join('');
    }
    var specs = item.infoLine || [item.genderLabel ? '性别 ' + item.genderLabel : '', item.birthday ? '生日 ' + item.birthday : '', item.bloodtypeLabel ? '血型 ' + item.bloodtypeLabel : ''].filter(Boolean).join(' / ');

    return '<div id="item_' + esc(item.kind) + esc(item.id) + '" class="bmn-crt-row" data-bmn-open="' + esc(item.kind) + ':' + esc(item.id) + '">' +
      '<div class="bmn-crt-avatar">' + avatarHtml(item) + '</div>' +
      '<div class="bmn-crt-body">' +
        '<div class="bmn-crt-head">' +
          '<h3 class="bmn-crt-title">' +
            '<a href="' + detailHref(item.kind, item.id) + '" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;">' + esc(item.name) + '</a>' +
            (item.cnName ? '<span class="bmn-crt-cn">' + esc(item.cnName) + '</span>' : '') +
          '</h3>' +
          '<div class="bmn-crt-actions">' +
            '<a href="' + detailHref(item.kind, item.id) + '" class="bmn-cmt-chip" onclick="event.stopPropagation()" style="text-decoration:none;">📄 详情页 →</a>' +
            '<span class="bmn-cmt-chip">💬 讨论 (+' + (item.comments || 0) + ')</span>' +
            '<button type="button" class="bmn-collect-btn' + (saved ? ' is-saved' : '') + '" data-bmn-fav="' + esc(item.kind) + ':' + esc(item.id) + '">' +
              (saved ? '♥ 已收藏' : '♡ 收藏') +
            '</button>' +
          '</div>' +
        '</div>' +
        (badges ? '<div class="bmn-badges-row">' + badges + '</div>' : '') +
        (specs ? '<div class="bmn-info-line prsn_info">' + esc(specs) + '</div>' : '') +
        (item.summary ? '<div class="bmn-crt-summary">' + esc(item.summary) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function paginationHtml(total) {
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return '';
    var cur = Math.min(state.page, pages);
    var arr = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - cur) <= 2) arr.push(i);
      else if (arr[arr.length - 1] !== '...') arr.push('...');
    }
    return '<div id="multipage" class="bmn-pagination page_inner">' +
      '<button type="button" class="bmn-page-btn" data-bmn-page="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + '>‹ 上一页</button>' +
      arr.map(function (p) {
        if (p === '...') return '<span class="bmn-stat-pill">…</span>';
        return '<button type="button" class="bmn-page-btn' + (p === cur ? ' p_cur' : '') + '" data-bmn-page="' + p + '">' + p + '</button>';
      }).join('') +
      '<button type="button" class="bmn-page-btn" data-bmn-page="' + (cur + 1) + '"' + (cur >= pages ? ' disabled' : '') + '>下一页 ›</button>' +
      '<span class="bmn-stat-pill">第 ' + cur + ' / ' + pages + ' 页 · 共 ' + total + ' 条</span>' +
    '</div>';
  }

  function renderBrowser(kind) {
    var all = filterItems(kind);
    var pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    if (state.page > pages) state.page = 1;
    var start = (state.page - 1) * PAGE_SIZE;
    var slice = all.slice(start, start + PAGE_SIZE);

    var bodyHtml = '';
    if (!slice.length) {
      bodyHtml = '<div class="bmn-empty-state">没有找到符合当前筛选条件的' + (kind === 'character' ? '虚构角色' : '现实人物') + '，试试清空部分筛选条件吧。</div>';
    } else if (state.view === 'grid') {
      bodyHtml = '<ul class="bmn-browser-grid">' +
        slice.map(function (it, idx) {
          return portraitCardHtml(it, state.orderby === 'collects' ? start + idx + 1 : 0);
        }).join('') +
      '</ul>';
    } else {
      bodyHtml = '<div class="browserCrtList bmn-browser-list">' +
        slice.map(listRowHtml).join('') +
      '</div>';
    }

    return '<div id="crtBrowserWrapper" class="bmn-browser-wrapper">' +
      renderFilterSidebar(kind) +
      '<section class="bmn-glass-panel" id="columnCrtBrowserB">' +
        '<div class="bmn-crt-tools crtTools">' +
          '<div class="bmn-sort-bar">' +
            SORTS.map(function (s) {
              return '<button type="button" class="bmn-sort-btn' + (state.orderby === s.val ? ' is-active' : '') +
                '" data-bmn-sort="' + esc(s.val) + '">' + esc(s.label) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="bmn-tools-right">' +
            '<span class="bmn-stat-pill">共 ' + all.length + ' 项</span>' +
            '<div class="bmn-view-switch">' +
              '<button type="button" class="bmn-view-btn' + (state.view === 'list' ? ' is-active' : '') + '" data-bmn-view="list">☰ 列表</button>' +
              '<button type="button" class="bmn-view-btn' + (state.view === 'grid' ? ' is-active' : '') + '" data-bmn-view="grid">⊞ 网格</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        activeChipsHtml(kind, all.length) +
        bodyHtml +
        paginationHtml(all.length) +
      '</section>' +
    '</div>';
  }

  function renderUpdates() {
    var kw = (state.q || '').trim().toLowerCase();
    var list = (DATA.updates || []).filter(function (u) {
      if (state.updateFilter !== 'all') {
        var hasKind = (u.targets || []).some(function (t) { return t.kind === state.updateFilter; });
        if (!hasKind) return false;
      }
      if (kw) {
        var hay = (u.userName + ' ' + u.action + ' ' + (u.targets || []).map(function (t) { return t.name; }).join(' ')).toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    });

    return '<section class="bmn-glass-panel">' +
      '<div class="bmn-crt-tools">' +
        '<div class="bmn-sort-bar">' +
          '<button type="button" class="bmn-sort-btn' + (state.updateFilter === 'all' ? ' is-active' : '') + '" data-bmn-updf="all">全部动态 (' + (DATA.updates || []).length + ')</button>' +
          '<button type="button" class="bmn-sort-btn' + (state.updateFilter === 'character' ? ' is-active' : '') + '" data-bmn-updf="character">仅虚构角色</button>' +
          '<button type="button" class="bmn-sort-btn' + (state.updateFilter === 'person' ? ' is-active' : '') + '" data-bmn-updf="person">仅现实人物</button>' +
        '</div>' +
        '<div class="bmn-tools-right">' +
          '<a href="timeline.html?tab=mono" class="bmn-action-link bmn-stat-pill" style="text-decoration:none;">⏱️ 前往时空管理局看完整动态 →</a>' +
        '</div>' +
      '</div>' +
      '<div class="bmn-updates-list">' +
        (list.length ? list.map(function (u) {
          var av = u.userAvatar
            ? '<img src="' + esc(u.userAvatar) + '" alt="' + esc(u.userName) + '" referrerpolicy="no-referrer" />'
            : '<div class="bmn-avatar-fallback"><span class="bmn-avatar-fallback-glyph">' + esc((u.userName || '?').charAt(0)) + '</span></div>';
          return '<article class="bmn-update-item">' +
            '<div class="bmn-update-user-avatar">' + av + '</div>' +
            '<div class="bmn-update-body">' +
              '<div class="bmn-update-head"><strong>' + esc(u.userName) + '</strong> ' + esc(u.action) + '</div>' +
              '<div class="bmn-update-targets">' +
                (u.targets || []).map(function (t) {
                  var tav = t.avatar ? '<img src="' + esc(t.avatar) + '" alt="' + esc(t.name) + '" referrerpolicy="no-referrer" />' : '';
                  return '<button type="button" class="bmn-target-pill" data-bmn-open="' + esc(t.kind) + ':' + esc(t.id) + '">' +
                    tav + '<span>' + esc(t.name) + '</span></button>';
                }).join('') +
              '</div>' +
              '<div class="bmn-update-meta">' + esc(u.timeLabel) + (u.timeExact ? ' · ' + esc(u.timeExact) : '') + ' · ' + esc(u.client) + '</div>' +
            '</div>' +
          '</article>';
        }).join('') : '<div class="bmn-empty-state">暂无匹配的人物动态。</div>') +
      '</div>' +
    '</section>';
  }

  function renderMyMono(kind) {
    var uc = (DATA.userCollections && DATA.userCollections[state.user]) || { nickname: '少年游', avatar: '' };
    var ids = (favStore[state.user] && favStore[state.user][kind]) || [];
    var kw = (state.q || '').trim().toLowerCase();
    var items = ids.map(function (id) { return getItem(kind, id); }).filter(Boolean);
    if (kw) {
      items = items.filter(function (it) {
        return (it.name + ' ' + (it.cnName || '')).toLowerCase().indexOf(kw) !== -1;
      });
    }

    return '<section class="bmn-glass-panel">' +
      '<div class="bmn-user-bar">' +
        '<div class="bmn-user-switcher">' +
          ['553488', 'sai'].map(function (uid) {
            var info = (DATA.userCollections && DATA.userCollections[uid]) || { nickname: uid, avatar: '' };
            var active = state.user === uid;
            return '<button type="button" class="bmn-user-pill' + (active ? ' is-active' : '') + '" data-bmn-user="' + esc(uid) + '">' +
              (info.avatar ? '<img src="' + esc(info.avatar) + '" alt="' + esc(info.nickname) + '" referrerpolicy="no-referrer" />' : '') +
              '<span>' + esc(info.nickname) + ' (UID ' + esc(uid === 'sai' ? '1' : uid) + ')</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="bmn-tools-right">' +
          '<span class="bmn-stat-pill">' + esc(uc.nickname) + ' 共收藏 ' + items.length + ' 项</span>' +
          '<a href="user.html?user=' + esc(state.user) + '#mono" class="bmn-stat-pill" style="text-decoration:none;color:var(--accent);">前往个人时光机 →</a>' +
        '</div>' +
      '</div>' +
      (items.length
        ? '<ul class="browserCoverMedium coverList bmn-my-grid">' + items.map(function (it) { return portraitCardHtml(it, 0); }).join('') + '</ul>'
        : '<div class="bmn-empty-state">当前用户暂无收藏的' + (kind === 'character' ? '虚构角色' : '现实人物') + '，可前往「虚构角色」或「现实人物」标签页点击收藏。</div>') +
    '</section>';
  }

  function renderMain() {
    var host = $('bmnViewHost');
    if (!host) return;
    updateTabCounters();
    syncHeroHeader();

    if (state.tab === 'home') host.innerHTML = renderHome();
    else if (state.tab === 'character') host.innerHTML = renderBrowser('character');
    else if (state.tab === 'person') host.innerHTML = renderBrowser('person');
    else if (state.tab === 'update') host.innerHTML = renderUpdates();
    else if (state.tab === 'my_character') host.innerHTML = renderMyMono('character');
    else if (state.tab === 'my_person') host.innerHTML = renderMyMono('person');
    else host.innerHTML = renderHome();

    syncUrl();
  }

  /* --------------------- Detail Modal (P19 Preview) --------------------- */
  function openDetailModal(kind, id) {
    var item = getItem(kind, id);
    var modal = $('monoDetailModal');
    var body = $('bmnModalBody');
    if (!item || !modal || !body) return;

    var saved = isFav(kind, id);
    var kvPairs = [
      { k: '条目编号', v: (kind === 'character' ? 'Character #' : 'Person #') + item.id },
      { k: kind === 'character' ? '分类' : '职业', v: kind === 'character' ? (item.typeLabel || '角色') : ((item.jobLabels || []).join(' / ') || '现实人物') },
      { k: '性别 / 血型', v: [item.genderLabel || '未知', item.bloodtypeLabel || ''].filter(Boolean).join(' · ') },
      { k: '生日', v: item.birthday || '未收录' },
      { k: '身高 / 体重', v: [item.height, item.weight].filter(Boolean).join(' · ') || '未收录' },
      { k: '讨论热度', v: '+' + (item.comments || 0) + ' 条讨论' }
    ];
    if (item.bwh) kvPairs.push({ k: 'BWH', v: item.bwh });
    if (item.workTitle) kvPairs.push({ k: '关联作品', v: item.workTitle });

    var subjectHref = item.workId
      ? ('subject.html?id=' + encodeURIComponent(item.workId))
      : ('search.html?q=' + encodeURIComponent(item.cnName || item.name));

    body.innerHTML =
      '<div class="bmn-modal-hero">' +
        '<div class="bmn-modal-portrait">' + avatarHtml(item) + '</div>' +
        '<div class="bmn-modal-meta">' +
          '<h2 id="bmnModalName">' + esc(item.name) + '</h2>' +
          (item.cnName ? '<div class="bmn-crt-cn" style="margin-top:4px;font-size:14px;">' + esc(item.cnName) + '</div>' : '') +
          '<div class="bmn-badges-row" style="margin-top:8px;">' +
            (kind === 'character'
              ? '<span class="bmn-badge-job">' + esc(item.typeLabel || '虚构角色') + '</span>'
              : (item.jobLabels || []).map(function (j) { return '<span class="bmn-badge-job">' + esc(j) + '</span>'; }).join('')) +
          '</div>' +
          '<div class="bmn-modal-kv">' +
            kvPairs.map(function (kv) {
              return '<div class="bmn-modal-kv-cell"><small>' + esc(kv.k) + '</small><strong>' + esc(kv.v) + '</strong></div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="bmn-modal-summary">' +
        esc(item.summary || item.infoLine || '该条目数据提取自 Bangumi 实时人物样本库，可跳转原站词条或通过全站搜索查看关联条目与角色履历。') +
      '</div>' +
      '<div class="bmn-modal-footer">' +
        '<a href="' + detailHref(kind, id) + '" class="bmn-btn-primary">📄 进入完整详情页 →</a>' +
        '<button type="button" class="bmn-btn-ghost" data-bmn-modal-fav="' + esc(kind) + ':' + esc(id) + '">' +
          (saved ? '♥ 已收藏（点击移除）' : '♡ 加入我的收藏') +
        '</button>' +
        '<a href="' + esc(subjectHref) + '" class="bmn-btn-ghost">' +
          (item.workId ? '🎬 查看关联条目' : '🔍 检索关联作品') +
        '</a>' +
        '<a href="' + esc(item.url) + '" target="_blank" rel="noopener" class="bmn-btn-ghost">原站 ↗</a>' +
      '</div>';

    modal.hidden = false;
  }

  function closeDetailModal() {
    var modal = $('monoDetailModal');
    if (modal) modal.hidden = true;
  }

  /* --------------------- Events --------------------- */
  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!target) return;

      // 收藏切换（阻止冒泡触发打开弹窗）
      var favBtn = target.closest('[data-bmn-fav]');
      if (favBtn) {
        ev.stopPropagation();
        var parts = favBtn.getAttribute('data-bmn-fav').split(':');
        toggleFav(parts[0], parts[1]);
        renderMain();
        return;
      }

      var modalFav = target.closest('[data-bmn-modal-fav]');
      if (modalFav) {
        var mp = modalFav.getAttribute('data-bmn-modal-fav').split(':');
        toggleFav(mp[0], mp[1]);
        openDetailModal(mp[0], mp[1]);
        renderMain();
        return;
      }

      // 打开详情预览弹窗
      var openEl = target.closest('[data-bmn-open]');
      if (openEl) {
        var op = openEl.getAttribute('data-bmn-open').split(':');
        openDetailModal(op[0], op[1]);
        return;
      }

      // 顶部子导航 Tab
      var tabBtn = target.closest('[data-bmn-tab]');
      if (tabBtn) {
        var nextTab = tabBtn.getAttribute('data-bmn-tab');
        if (nextTab && TAB_META[nextTab]) {
          state.tab = nextTab;
          state.type = '';
          state.bloodtype = '';
          state.gender = '';
          state.month = '';
          state.day = '';
          state.page = 1;
          renderMain();
        }
        return;
      }

      // 主页快捷跳转
      var jumpBtn = target.closest('[data-bmn-jump]');
      if (jumpBtn) {
        state.tab = jumpBtn.getAttribute('data-bmn-jump');
        state.type = '';
        state.bloodtype = '';
        state.gender = '';
        state.month = '';
        state.day = '';
        state.orderby = jumpBtn.getAttribute('data-bmn-orderby') || 'collects';
        state.page = 1;
        renderMain();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 今日生日筛选跳转
      var bdayBtn = target.closest('[data-bmn-bday]');
      if (bdayBtn) {
        var bp = bdayBtn.getAttribute('data-bmn-bday').split(':');
        state.tab = bp[0];
        state.month = bp[1];
        state.day = bp[2];
        state.type = '';
        state.bloodtype = '';
        state.gender = '';
        state.page = 1;
        renderMain();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 左侧筛选 Pills
      var filterBtn = target.closest('[data-bmn-filter]');
      if (filterBtn) {
        var fk = filterBtn.getAttribute('data-bmn-filter');
        var fv = filterBtn.getAttribute('data-bmn-val') || '';
        state[fk] = (state[fk] === fv && fv !== '') ? '' : fv;
        if (fk === 'month') state.day = '';
        state.page = 1;
        renderMain();
        return;
      }

      // 清除单个筛选标签
      var clearBtn = target.closest('[data-bmn-clear]');
      if (clearBtn) {
        var ck = clearBtn.getAttribute('data-bmn-clear');
        state[ck] = '';
        if (ck === 'month') state.day = '';
        state.page = 1;
        renderMain();
        return;
      }

      // 排序
      var sortBtn = target.closest('[data-bmn-sort]');
      if (sortBtn) {
        state.orderby = sortBtn.getAttribute('data-bmn-sort') || 'collects';
        state.page = 1;
        renderMain();
        return;
      }

      // 视图切换
      var viewBtn = target.closest('[data-bmn-view]');
      if (viewBtn) {
        state.view = viewBtn.getAttribute('data-bmn-view') || 'list';
        renderMain();
        return;
      }

      // 分页
      var pageBtn = target.closest('[data-bmn-page]');
      if (pageBtn && !pageBtn.disabled) {
        var pg = parseInt(pageBtn.getAttribute('data-bmn-page'), 10);
        if (pg > 0) {
          state.page = pg;
          renderMain();
          window.scrollTo({ top: 180, behavior: 'smooth' });
        }
        return;
      }

      // 动态过滤
      var updf = target.closest('[data-bmn-updf]');
      if (updf) {
        state.updateFilter = updf.getAttribute('data-bmn-updf') || 'all';
        renderMain();
        return;
      }

      // 切换收藏档案 (少年游 / Sai)
      var userBtn = target.closest('[data-bmn-user]');
      if (userBtn) {
        state.user = userBtn.getAttribute('data-bmn-user') || '553488';
        renderMain();
        return;
      }

      // 动作按钮
      var actBtn = target.closest('[data-bmn-act]');
      if (actBtn) {
        var act = actBtn.getAttribute('data-bmn-act');
        if (act === 'reset-filters') {
          state.type = '';
          state.bloodtype = '';
          state.gender = '';
          state.month = '';
          state.day = '';
          state.q = '';
          state.page = 1;
          renderMain();
          showToast('已重置人物筛选条件');
        } else if (act === 'wiki-new') {
          var kind = actBtn.getAttribute('data-bmn-kind') || 'character';
          showToast('静态原型提示：新条目创建入口对应 bgm.tv/' + kind + '/new');
        }
        return;
      }

      // 关闭弹窗
      if (target.id === 'bmnModalCloseBtn' || target.id === 'monoDetailModal') {
        closeDetailModal();
      }
    });

    // 人物频道专属搜索 (/mono_search)
    var form = $('bmnMonoSearchForm');
    var input = $('bmnMonoSearchInput');
    var scopeSel = $('siteSearchSelect');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var kw = input ? input.value.trim() : '';
        var sc = scopeSel ? scopeSel.value : 'all';
        state.q = kw;
        state.scope = sc;
        state.page = 1;
        if (sc === 'crt') state.tab = 'character';
        else if (sc === 'prsn') state.tab = 'person';
        else if (state.tab === 'home' && kw) state.tab = 'character';
        renderMain();
      });
    }
    if (input) {
      input.addEventListener('input', function () {
        state.q = input.value.trim();
        state.page = 1;
        if (state.tab !== 'home') renderMain();
      });
    }

    // Esc 关闭详情弹窗
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeDetailModal();
    });

    // 顶部“人物”分类胶囊快捷跳转 search.html?cat=mono
    var topPill = $('bmnTopSearchPill');
    if (topPill) {
      topPill.addEventListener('click', function () {
        window.location.href = 'search.html?cat=mono';
      });
    }
  }

  hydrateFromUrl();
  bindEvents();
  renderMain();
})();
