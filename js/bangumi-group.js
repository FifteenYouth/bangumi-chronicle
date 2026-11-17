/* ═══════════════════════════════════════════════════════════
   Bangumi Group Studio — Page 21 (小组广场/主页/讨论列表) + Page 22 (话题详情)
   Data: window.GROUP_DATA (bangumi-group-data.js)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.GROUP_DATA || {};
  var ME_AVATAR = 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1';

  var VIEWS = [
    { id: 'discover', ico: '🧭', label: '小组广场', kicker: 'BANGUMI · GROUP', sub: '社区 / 小组广场',
      title: '小组广场', hint: '发现同好 · 参与讨论' },
    { id: 'home', ico: '🏠', label: '小组主页', kicker: 'BANGUMI · GROUP HOME', sub: '小组 / 我们就爱acfun',
      title: '我们就爱acfun', hint: '概览 · 讨论 · 成员' },
    { id: 'forum', ico: '📋', label: '讨论列表', kicker: 'BANGUMI · FORUM', sub: '小组 / 讨论区',
      title: '全部话题', hint: '按最后回复排序 · 共 3 页' },
    { id: 'topic', ico: '💬', label: '话题详情', kicker: 'BANGUMI · TOPIC', sub: '站务论坛 / 讨论',
      title: '小组讨论', hint: '主楼与 183 楼回复' }
  ];

  var FORUM_TABS = [
    { id: 'all', label: '全部话题' }, { id: 'essence', label: '精华' },
    { id: 'solved', label: '已解决' }, { id: 'mine', label: '我发表的' }
  ];
  var SORTS = [
    { id: 'latest', label: '最新回复' }, { id: 'newest', label: '最新发布' },
    { id: 'replies', label: '最多回复' }, { id: 'title', label: '按名称' }
  ];
  var TOPIC_TABS = [
    { id: 'back', label: '← 返回列表' }, { id: 'op', label: '只看楼主' },
    { id: 'collect', label: '☆ 收藏' }, { id: 'share', label: '↗ 分享' }
  ];

  var state = {
    view: 'discover',
    subnav: 0,
    forumTab: 'all',
    forumSort: 'latest',
    forumPage: 1,
    topicSort: 'asc',
    topicOpOnly: false,
    joined: D.home ? !!D.home.joined : true,
    likes: {},
    collected: false,
    extraFloors: [],
    newTopics: { discover: [], home: [], forum: [] },
    query: ''
  };

  /* ── helpers ─────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function img(src, cls, alt) {
    if (!src) return '<span class="' + cls + ' group-img-empty"></span>';
    return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt || '') +
      '" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.opacity=0" />';
  }
  function bbcode(raw) {
    var s = esc(raw || '');
    s = s.replace(/\[mask\]([\s\S]*?)\[\/mask\]/gi,
      '<span class="group-spoiler" data-act="spoiler" title="点击显示剧透">$1</span>');
    s = s.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
    s = s.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
    s = s.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<div class="group-quote-block">$1</div>');
    s = s.replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />');
    return '<p>' + s + '</p>';
  }
  function num(n) { return Number(n || 0).toLocaleString('zh-CN'); }
  function viewCfg(id) { for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) return VIEWS[i]; return VIEWS[0]; }
  function facets() {
    var f = [{ k: '视图', v: viewCfg(state.view).label }];
    if (state.view === 'discover' && D.discover) f.push({ k: '筛选', v: D.discover.subnav[state.subnav] });
    if (state.view === 'forum') {
      var t = FORUM_TABS.filter(function (x) { return x.id === state.forumTab; })[0];
      var s = SORTS.filter(function (x) { return x.id === state.forumSort; })[0];
      f.push({ k: '分类', v: t ? t.label : '全部' }, { k: '排序', v: s ? s.label : '最新' });
    }
    if (state.view === 'home') f.push({ k: '小组', v: D.home ? D.home.name : '' });
    if (state.view === 'topic') f.push({ k: '回复', v: (D.topic ? D.topic.totalFloors : 0) + ' 楼' });
    if (state.query) f.push({ k: '搜索', v: state.query });
    return f;
  }
  function showToast(msg) {
    var host = $('toastContainer');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'glass-toast';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2300);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2700);
  }

  /* ── topic table (shared) ────────────────────────── */
  function topicTable(rows, mode) {
    if (!rows || !rows.length) return '<div class="group-empty">暂无话题，来发表第一个吧 ✦</div>';
    var h = '<table class="group-topic-table"><thead><tr>';
    h += '<th style="width:52%">话题</th>';
    h += mode === 'discover' ? '<th style="width:20%">小组</th>' : '<th style="width:12%">回复</th>';
    h += '<th style="width:13%">作者</th><th style="width:15%">最后回复</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>';
      h += '<td><a class="group-topic-link" href="javascript:void(0)" data-act="open-topic" data-id="' +
        esc(r.id) + '">' + esc(r.title) + '</a><span class="group-topic-replies">+' + num(r.replies) + '</span></td>';
      if (mode === 'discover') {
        h += '<td><a class="group-topic-group" href="javascript:void(0)" data-act="open-group" data-name="' +
          esc(r.groupHref) + '">' + esc(r.group) + '</a></td>';
      } else {
        h += '<td><span class="group-topic-time">' + num(r.replies) + '</span></td>';
      }
      h += '<td><a class="group-topic-author" href="javascript:void(0)" data-act="open-user" data-uid="' +
        esc(r.authorUid) + '">' + esc(r.author) + '</a></td>';
      h += '<td><span class="group-topic-time">' + esc(r.last) + '</span></td></tr>';
    });
    return h + '</tbody></table>';
  }

  function allTopics(view) {
    var base = view === 'discover' ? (D.discover ? D.discover.latestTopics : [])
      : view === 'home' ? (D.home ? D.home.topics : [])
        : (D.forum ? D.forum.topics : []);
    var extra = state.newTopics[view] || [];
    var rows = extra.concat(base);
    if (state.query) {
      var q = state.query.toLowerCase();
      rows = rows.filter(function (r) {
        return (r.title + ' ' + r.author + ' ' + (r.group || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (view === 'forum') {
      if (state.forumTab === 'essence') rows = rows.filter(function (r) { return Number(r.replies) > 3; });
      if (state.forumTab === 'solved') rows = rows.filter(function (r) { return Number(r.replies) === 0; });
      if (state.forumSort === 'replies') rows = rows.slice().sort(function (a, b) { return b.replies - a.replies; });
      if (state.forumSort === 'title') rows = rows.slice().sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'zh'); });
      if (state.forumSort === 'newest') rows = rows.slice().reverse();
    }
    return rows;
  }

  /* ── HERO ────────────────────────────────────────── */
  function renderHero() {
    var cfg = viewCfg(state.view);
    var backdrops = {
      discover: D.discover && D.discover.hotGroups[1] ? D.discover.hotGroups[1].icon : '',
      home: D.home ? D.home.icon : '',
      forum: D.forum ? D.forum.icon : '',
      topic: D.topic && D.topic.mainPost ? D.topic.mainPost.avatar : ''
    };
    var b = $('groupHeroBackdrop');
    if (b) b.style.backgroundImage = backdrops[state.view] ? 'url("' + backdrops[state.view] + '")' : '';
    $('groupKickerBadge').textContent = cfg.kicker;
    $('groupKickerSub').textContent = cfg.sub;
    $('groupMainTitle').innerHTML = esc(cfg.title) + ' <small>' + esc(cfg.hint) + '</small>';

    $('groupViewSwitcher').innerHTML = VIEWS.map(function (v) {
      return '<button class="group-view-pill' + (v.id === state.view ? ' active' : '') +
        '" type="button" data-act="view" data-view="' + v.id + '"><span class="pill-ico">' +
        v.ico + '</span>' + esc(v.label) + '</button>';
    }).join('');

    // subnav per view
    var tabs = [];
    if (state.view === 'discover' && D.discover) tabs = D.discover.subnav.map(function (s, i) {
      return { id: 'sub' + i, label: s };
    });
    else if (state.view === 'home' && D.home) tabs = D.home.nav.map(function (s, i) {
      return { id: 'h' + i, label: s };
    });
    else if (state.view === 'forum') tabs = FORUM_TABS;
    else if (state.view === 'topic') tabs = TOPIC_TABS;
    $('groupSubnavBar').innerHTML = tabs.map(function (t, i) {
      var active = (state.view === 'discover' && i === state.subnav) ||
        (state.view === 'forum' && t.id === state.forumTab) ||
        (state.view === 'home' && i === 0) ||
        (state.view === 'topic' && t.id === 'op' && state.topicOpOnly);
      return '<button class="group-subnav-tab' + (active ? ' active' : '') +
        '" type="button" data-act="subnav" data-tab="' + esc(t.id) + '" data-i="' + i + '">' +
        esc(t.label) + '</button>';
    }).join('');

    var fs = facets();
    $('groupActiveFacetsList').innerHTML = '<span class="group-facet-label">CURRENT VIEW</span>' +
      fs.map(function (x) {
        return '<span class="group-facet-chip">' + esc(x.k) + ' <em>' + esc(x.v) + '</em></span>';
      }).join('');
  }

  /* ── VIEW: DISCOVER ──────────────────────────────── */
  function renderDiscover() {
    var d = D.discover || {};
    $('discoverSectionTitle').textContent = '/ 热门小组';
    $('discoverSectionHint').textContent = state.subnav === 0
      ? '按成员数排列 · 真实数据'
      : '筛选：' + (d.subnav ? d.subnav[state.subnav] : '');

    var hot = (d.hotGroups || []).map(function (g, i) {
      return '<div class="group-hot-card" data-act="open-group" data-name="' + esc(g.name) + '">' +
        '<span class="group-hot-rank">#' + (i + 1) + '</span>' +
        img(g.icon, 'group-hot-icon', g.title) +
        '<div class="group-hot-name">' + esc(g.title) + '</div>' +
        '<div class="group-hot-members">' + num(g.members) + ' 位成员</div></div>';
    }).join('');
    $('groupHotGrid').innerHTML = hot || '<div class="group-empty">暂无小组</div>';

    $('discoverTopicTable').innerHTML = topicTable(allTopics('discover'), 'discover');

    $('groupNewGroupsList').innerHTML = (d.newGroups || []).map(function (g) {
      return '<div class="group-new-item" data-act="open-group" data-name="' + esc(g.name) + '">' +
        img(g.icon, 'group-new-icon', g.title) +
        '<div class="group-new-info"><div class="group-new-name">' + esc(g.title) +
        '</div><div class="group-new-members">' + num(g.members) + ' 位成员</div></div></div>';
    }).join('');
  }

  /* ── VIEW: HOME ──────────────────────────────────── */
  function renderHome() {
    var h = D.home || {};
    $('groupProfileCard').innerHTML =
      img(h.icon, 'group-profile-icon', h.name) +
      '<div class="group-profile-body">' +
      '<div class="group-profile-name">' + esc(h.name) + '</div>' +
      '<p class="group-profile-intro">' + esc(h.intro) + '</p>' +
      '<div class="group-profile-meta">' +
      '<span class="group-profile-stat">成员 <b>' + num(h.members) + '</b></span>' +
      '<span class="group-profile-stat">话题 <b>' + num((h.topics || []).length + state.newTopics.home.length) + '</b></span>' +
      '<span class="group-profile-stat">创建于 <b>2009-06-12</b></span>' +
      '<span class="group-profile-stat">组长 <b>Sai🖖</b></span></div>' +
      '<div class="group-profile-actions">' +
      '<button class="group-join-btn' + (state.joined ? ' joined' : '') + '" type="button" data-act="join">' +
      (state.joined ? '✓ 已加入 · 退出小组' : '+ 加入这个小组') + '</button>' +
      '<button class="group-control-btn" type="button" data-act="new-topic">+ 发表新主题</button>' +
      '</div></div>';

    $('homeTopicTable').innerHTML = topicTable(allTopics('home'), 'group');
    $('groupQuickAvatar').innerHTML = img(ME_AVATAR, 'group-quick-avatar', '我');

    $('groupHomeAboutCard').innerHTML =
      '<div class="group-side-head"><h3>关于本小组</h3></div>' +
      '<p class="group-profile-intro">' + esc(h.intro) + '</p>' +
      '<div class="group-profile-meta" style="margin:0">' +
      '<span class="group-profile-stat">成员 <b>' + num(h.members) + '</b></span>' +
      '<span class="group-profile-stat">话题 <b>' + num((h.topics || []).length) + '</b></span></div>';

    $('groupHomeSideNav').innerHTML = (h.nav || []).map(function (n, i) {
      return '<button class="group-side-nav-btn' + (i === 0 ? ' active' : '') +
        '" type="button" data-act="home-nav" data-i="' + i + '">' + esc(n) + '</button>';
    }).join('');
  }

  /* ── VIEW: FORUM ─────────────────────────────────── */
  function renderForum() {
    var f = D.forum || {};
    $('forumSectionTitle').textContent = '/ ' + esc(f.groupName || '全部话题');
    $('groupForumSortbar').innerHTML = SORTS.map(function (s) {
      return '<button class="group-sort-pill' + (s.id === state.forumSort ? ' active' : '') +
        '" type="button" data-act="forum-sort" data-sort="' + s.id + '">' + esc(s.label) + '</button>';
    }).join('');
    $('forumTopicTable').innerHTML = topicTable(allTopics('forum'), 'group');

    var total = f.pages || 3;
    var p = state.forumPage;
    var html = '<button class="group-page-btn" type="button" data-act="page" data-p="' +
      Math.max(1, p - 1) + '"' + (p <= 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= total; i++) {
      html += '<button class="group-page-btn' + (i === p ? ' p_cur' : '') +
        '" type="button" data-act="page" data-p="' + i + '">' + i + '</button>';
    }
    html += '<button class="group-page-btn" type="button" data-act="page" data-p="' +
      Math.min(total, p + 1) + '"' + (p >= total ? ' disabled' : '') + '>›</button>';
    html += '<span class="group-page-info">共 ' + total + ' 页 · ' + num(allTopics('forum').length) + ' 条话题</span>';
    $('forumPagination').innerHTML = html;

    $('groupForumSide').innerHTML =
      '<div class="group-side-card"><div class="group-side-head"><h3>小组信息</h3></div>' +
      '<div style="display:flex;gap:12px;align-items:center">' +
      img(f.icon, 'group-new-icon', f.groupName) +
      '<div><div class="group-new-name">' + esc(f.groupName) + '</div>' +
      '<div class="group-new-members">' + num(D.home ? D.home.members : 0) + ' 位成员</div></div></div>' +
      '<p class="group-profile-intro" style="margin:14px 0 0">' + esc(D.home ? D.home.intro : '') + '</p>' +
      '<button class="group-cta-btn" type="button" data-act="new-topic" style="width:100%;margin-top:12px">+ 发表新主题</button></div>' +
      '<div class="group-side-card"><div class="group-side-head"><h3>热门话题</h3></div>' +
      (D.topic && D.topic.hotTopics ? D.topic.hotTopics : []).map(function (t, i) {
        return '<div class="group-side-topic-item" data-act="open-topic" data-id="' + esc(t.id) + '">' +
          '<span class="group-side-topic-num">' + (i + 1) + '</span><div><div class="group-side-topic-title">' +
          esc(t.title) + '</div><div class="group-side-topic-replies">+' + num(t.replies) + ' 回复</div></div></div>';
      }).join('') + '</div>';
  }

  /* ── VIEW: TOPIC ─────────────────────────────────── */
  function topicTitle() {
    var t = D.topic ? (D.topic.title || '') : '';
    var parts = t.split('\n');
    return (parts.length > 1 ? parts[parts.length - 1] : t).trim();
  }
  function renderSubList(subs) {
    if (!subs || !subs.length) return '';
    return '<div class="group-sub-reply-list">' + subs.map(function (s) {
      return '<div class="group-sub-reply">' + img(s.avatar, 'group-sub-avatar', s.user) +
        '<div class="group-sub-body"><div class="group-sub-meta"><span class="floor">' + esc(s.num) +
        '</span>' + esc(s.user) + '<span class="tm">' + esc(s.time) + '</span></div>' +
        '<div class="group-sub-message">' + bbcode(s.message) + '</div></div></div>';
    }).join('') + '</div>';
  }
  function replyCard(fl, idx, isNew) {
    var liked = !!state.likes[fl.id];
    return '<div class="group-reply-card' + (isNew ? ' group-reply-new' : '') + '" id="floor_' + esc(fl.id) + '">' +
      '<div class="group-reply-head">' + img(fl.avatar, 'group-reply-avatar', fl.user) +
      '<div><div class="group-reply-author">' + esc(fl.user) + '</div>' +
      '<div class="group-reply-sign">' + esc(fl.sign || '') + '</div></div>' +
      '<span class="group-reply-num">' + esc(fl.num) + '</span>' +
      '<span class="group-reply-time">' + esc(fl.time) + '</span></div>' +
      '<div class="group-reply-message">' + bbcode(fl.message) + '</div>' +
      renderSubList(fl.subs) +
      '<div class="group-reply-actions">' +
      '<button class="group-reply-action" type="button" data-act="reply-to" data-num="' + esc(fl.num) + '">↩ 回复</button>' +
      '<button class="group-reply-action' + (liked ? ' liked' : '') + '" type="button" data-act="like" data-id="' +
      esc(fl.id) + '">' + (liked ? '♥ 已贴贴' : '♡ 贴贴') + (Number(fl.likes) > 0 ? ' ' + fl.likes : '') + '</button>' +
      '<button class="group-reply-action" type="button" data-act="collect">☆ 收集</button>' +
      '</div></div>';
  }
  function renderTopic() {
    var t = D.topic || {};
    var mp = t.mainPost || {};
    $('topicBreadcrumb').innerHTML = '<a href="javascript:void(0)" data-act="view" data-view="discover">小组广场</a>' +
      '<span class="sep">»</span><a href="javascript:void(0)" data-act="view" data-view="home">' + esc(t.groupName || '小组') + '</a>' +
      '<span class="sep">»</span><a href="javascript:void(0)" data-act="view" data-view="forum">讨论区</a>' +
      '<span class="sep">»</span><span>话题详情</span>';

    $('topicTitleCard').innerHTML = '<h1>' + esc(topicTitle()) + '</h1>' +
      '<div class="group-topic-badges">' +
      '<span class="group-topic-badge">' + esc(t.groupName || '站务论坛') + '</span>' +
      '<span class="group-topic-badge plain">' + num(t.totalFloors) + ' 楼回复</span>' +
      '<span class="group-topic-badge plain">楼主 ' + esc(mp.author || '') + '</span>' +
      '<span class="group-topic-badge plain">' + esc(mp.time || '') + '</span></div>';

    $('topicMainPost').innerHTML =
      '<div class="group-post-head">' + img(mp.avatar, 'group-post-avatar', mp.author) +
      '<div><div class="group-post-author">' + esc(mp.author) + '</div>' +
      '<div class="group-post-sign">' + esc(mp.sign || '') + '</div></div>' +
      '<span class="group-post-floor">#1 楼主</span>' +
      '<span class="group-post-time">' + esc(mp.time) + '</span></div>' +
      '<div class="group-post-content">' + bbcode(mp.content) + '</div>';

    var total = t.totalFloors || 0;
    $('topicControlbar').innerHTML =
      '<button class="group-control-btn" type="button" data-act="collect">' +
      (state.collected ? '★ 已收集' : '☆ 收集') + '</button>' +
      '<button class="group-control-btn" type="button" data-act="like" data-id="main">' +
      (state.likes.main ? '♥ 已贴贴' : '♡ 贴贴') + '</button>' +
      '<button class="group-control-btn" type="button" data-act="topic-reply">↩ 回复主楼</button>' +
      '<span class="group-control-spacer"></span>' +
      '<div class="group-floor-slider"><span>楼层</span><input type="range" id="floorSlider" min="1" max="' +
      total + '" value="1" /><span id="floorSliderVal">1 / ' + total + '</span></div>' +
      '<select class="group-sort-select" id="topicSortSelect" data-act="topic-sort">' +
      '<option value="asc"' + (state.topicSort === 'asc' ? ' selected' : '') + '>顺序</option>' +
      '<option value="desc"' + (state.topicSort === 'desc' ? ' selected' : '') + '>倒序</option>' +
      '<option value="hot"' + (state.topicSort === 'hot' ? ' selected' : '') + '>热门</option></select>';

    var floors = (t.floors || []).slice();
    if (state.topicOpOnly) floors = floors.filter(function (f) { return f.uid === mp.uid; });
    if (state.topicSort === 'desc') floors.reverse();
    if (state.topicSort === 'hot') floors = floors.slice().sort(function (a, b) {
      return (b.subs ? b.subs.length : 0) - (a.subs ? a.subs.length : 0);
    });
    var extras = state.extraFloors.slice();
    $('topicReplyList').innerHTML =
      '<div style="font:500 11.5px/1 var(--sans);color:var(--faint);margin-bottom:4px">已加载 ' +
      (floors.length + extras.length) + ' / ' + total + ' 楼 · 含 ' +
      floors.reduce(function (n, f) { return n + (f.subs ? f.subs.length : 0); }, 0) + ' 条子回复</div>' +
      floors.map(function (f, i) { return replyCard(f, i, false); }).join('') +
      extras.map(function (f, i) { return replyCard(f, i, true); }).join('');

    $('topicReplyAvatar').innerHTML = img(ME_AVATAR, 'group-quick-avatar', '我');

    var active = (t.floors || []).slice(0, 8);
    $('topicSideBar').innerHTML =
      '<div class="group-side-card"><div class="group-side-head"><h3>话题信息</h3></div>' +
      '<div class="group-profile-meta" style="margin:0 0 12px">' +
      '<span class="group-profile-stat">回复 <b>' + num(total) + '</b></span>' +
      '<span class="group-profile-stat">楼主 <b>' + esc(mp.author || '') + '</b></span></div>' +
      '<div class="group-side-head" style="margin-bottom:8px"><h3 style="font-size:12px">活跃成员</h3></div>' +
      '<div class="group-side-avatar-row">' + active.map(function (f) {
        return img(f.avatar, 'group-side-mini-avatar', f.user);
      }).join('') + '</div></div>' +
      '<div class="group-side-card"><div class="group-side-head"><h3>热门话题</h3></div>' +
      (t.hotTopics || []).map(function (ht, i) {
        return '<div class="group-side-topic-item" data-act="open-topic" data-id="' + esc(ht.id) + '">' +
          '<span class="group-side-topic-num">' + (i + 1) + '</span><div><div class="group-side-topic-title">' +
          esc(ht.title) + '</div><div class="group-side-topic-replies">+' + num(ht.replies) + ' 回复</div></div></div>';
      }).join('') + '</div>' +
      '<div class="group-side-card" style="text-align:center">' +
      '<p class="group-profile-intro" style="margin:0 0 12px">喜欢这个话题？加入小组一起聊。</p>' +
      '<button class="group-cta-btn" type="button" data-act="view" data-view="home">进入小组</button></div>';
  }

  /* ── master render ───────────────────────────────── */
  function renderAll() {
    renderHero();
    VIEWS.forEach(function (v) {
      var el = $('view' + v.id.charAt(0).toUpperCase() + v.id.slice(1));
      if (el) el.hidden = (v.id !== state.view);
    });
    if (state.view === 'discover') renderDiscover();
    else if (state.view === 'home') renderHome();
    else if (state.view === 'forum') renderForum();
    else if (state.view === 'topic') renderTopic();
    try { history.replaceState(null, '', '?view=' + state.view); } catch (e) { /* file:// */ }
  }

  function setView(v) {
    if (!viewCfg(v) || v === 'undefined') return;
    state.view = v; state.query = '';
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function resetAll() {
    state.subnav = 0; state.forumTab = 'all'; state.forumSort = 'latest';
    state.forumPage = 1; state.topicSort = 'asc'; state.topicOpOnly = false; state.query = '';
    renderAll(); showToast('已重置视图');
  }
  function addTopic(view) {
    var t, ta;
    if (view === 'home') { t = $('groupQuickTitle'); ta = $('groupQuickContent'); }
    else { t = $('groupQuickTitle'); ta = $('groupQuickContent'); }
    var title = t ? t.value.trim() : '';
    if (!title) { showToast('请先输入话题标题'); if (t) t.focus(); return; }
    state.newTopics[view].unshift({
      id: 'new' + Date.now(), title: title, replies: 0,
      group: view === 'discover' ? (D.home ? D.home.name : '') : '',
      groupHref: 'acfun', author: '少年游', authorUid: '553488',
      last: '刚刚'
    });
    if (t) t.value = ''; if (ta) ta.value = '';
    renderAll(); showToast('话题《' + title.slice(0, 18) + '》已发表');
  }

  /* ── events ──────────────────────────────────────── */
  function initEvents() {
    document.addEventListener('click', function (e) {
      var n = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!n) return;
      var a = n.getAttribute('data-act');
      if (a === 'view') { setView(n.getAttribute('data-view')); return; }
      if (a === 'reset' || a === 'hero-reset') { resetAll(); return; }
      if (a === 'subnav') {
        var v = state.view, tab = n.getAttribute('data-tab'), i = Number(n.getAttribute('data-i'));
        if (v === 'discover') state.subnav = i;
        else if (v === 'home') { if (i === 1) { setView('forum'); return; } showToast(D.home.nav[i] + ' · 当前原型聚焦概览'); return; }
        else if (v === 'forum') state.forumTab = tab;
        else if (v === 'topic') {
          if (tab === 'back') { setView('forum'); return; }
          if (tab === 'op') { state.topicOpOnly = !state.topicOpOnly; showToast(state.topicOpOnly ? '只看楼主' : '显示全部回复'); }
          else if (tab === 'collect') { state.collected = !state.collected; showToast(state.collected ? '已收藏话题' : '已取消收藏'); }
          else if (tab === 'share') { showToast('链接已复制（原型演示）'); }
        }
        renderAll(); return;
      }
      if (a === 'open-topic') { setView('topic'); showToast('打开话题 #' + n.getAttribute('data-id')); return; }
      if (a === 'open-group') { setView('home'); showToast('进入小组 · ' + (n.getAttribute('data-name') || '')); return; }
      if (a === 'open-user') { showToast('用户主页 · ' + (n.getAttribute('data-uid') || '')); return; }
      if (a === 'join') {
        state.joined = !state.joined;
        renderAll(); showToast(state.joined ? '已加入小组 ✓' : '已退出小组'); return;
      }
      if (a === 'new-topic') {
        if (state.view !== 'home') setView('home');
        setTimeout(function () { var el = $('groupQuickTitle'); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 80);
        return;
      }
      if (a === 'create-group') { showToast('创建新小组 · 原型演示（即将开放）'); return; }
      if (a === 'collect') { state.collected = !state.collected; showToast(state.collected ? '已收集' : '已取消收集'); renderAll(); return; }
      if (a === 'like') {
        var id = n.getAttribute('data-id'); state.likes[id] = !state.likes[id];
        renderAll(); showToast(state.likes[id] ? '贴贴成功 ♥' : '已取消贴贴'); return;
      }
      if (a === 'spoiler') { n.classList.toggle('revealed'); return; }
      if (a === 'forum-sort') { state.forumSort = n.getAttribute('data-sort'); renderAll(); return; }
      if (a === 'page') { state.forumPage = Number(n.getAttribute('data-p')); renderAll(); return; }
      if (a === 'home-nav') { showToast(D.home.nav[Number(n.getAttribute('data-i'))] + ' · 当前原型聚焦概览'); return; }
      if (a === 'reply-to') {
        var ta = $('topicReplyContent');
        if (ta) { ta.value = '@' + n.getAttribute('data-num') + ' '; ta.focus(); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
      if (a === 'topic-reply') {
        var t2 = $('topicReplyContent');
        if (t2) { t2.focus(); t2.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
    });

    // reset button
    var rb = $('groupResetBtn');
    if (rb) rb.addEventListener('click', resetAll);
    var more = $('groupNewGroupsMore');
    if (more) more.addEventListener('click', function () { showToast('查看全部小组 · 原型演示'); });
    var cg = $('groupCreateBtn');
    if (cg) cg.addEventListener('click', function () { showToast('创建新小组 · 原型演示（即将开放）'); });
    var qb = $('groupQuickSubmit');
    if (qb) qb.addEventListener('click', function () { addTopic('home'); });
    var nb = $('groupNewTopicBtn');
    if (nb) nb.addEventListener('click', function () {
      var el = $('groupQuickTitle'); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });
    var fn = $('forumNewTopicBtn');
    if (fn) fn.addEventListener('click', function () { setView('home'); setTimeout(function () { var el = $('groupQuickTitle'); if (el) el.focus(); }, 80); });

    // reply form
    var rf = $('topicReplyForm');
    if (rf) rf.addEventListener('submit', function (e) {
      e.preventDefault();
      var ta = $('topicReplyContent'); var v = ta ? ta.value.trim() : '';
      if (!v) { showToast('写点什么再发送吧'); return; }
      state.extraFloors.push({
        id: 'mine' + Date.now(), num: '#' + (200 + state.extraFloors.length),
        uid: '553488', user: '少年游', avatar: ME_AVATAR, sign: '(原型用户)',
        message: v, time: '刚刚', likes: 0, subs: []
      });
      if (ta) ta.value = '';
      renderAll(); showToast('回复已发表 ✓');
      setTimeout(function () { var el = $('floor_' + state.extraFloors[state.extraFloors.length - 1].id); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
    });

    // topic sort select
    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'topicSortSelect') {
        state.topicSort = e.target.value; renderAll();
      }
    });
    // floor slider
    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'floorSlider') {
        var lab = $('floorSliderVal');
        if (lab) lab.textContent = e.target.value + ' / ' + e.target.max;
      }
    });

    // header search
    var hs = $('headerSearch');
    if (hs) hs.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = hs.querySelector('input[type="search"]') || hs.querySelector('input');
      var q = inp ? inp.value.trim() : '';
      state.query = q;
      if (state.view !== 'discover' && state.view !== 'forum' && state.view !== 'home') setView('discover');
      renderAll();
      showToast(q ? '搜索「' + q + '」· ' + allTopics(state.view === 'topic' ? 'discover' : state.view).length + ' 条结果' : '已清除搜索');
    });

    // theme toggle
    var tt = $('btnThemeToggle');
    if (tt) tt.addEventListener('click', function () {
      var root = document.documentElement;
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    });

    // "/" shortcut
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault();
        var inp = document.querySelector('#headerSearch input');
        if (inp) inp.focus();
      }
    });
  }

  /* ── boot ────────────────────────────────────────── */
  function boot() {
    var p = new URLSearchParams(location.search).get('view');
    if (p) { for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === p) state.view = p; }
    initEvents();
    renderAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
