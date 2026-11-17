/* ==========================================================================
 * C4 · P03 时空管理局 / 时间胶囊 (bangumi-timeline.js)
 * 驱动全球 / 好友 / 个人时间胶囊动态流、11 类筛选、380字吐槽+6大表情包、
 * 传统十星评分、贴贴反应、折叠回复抽屉与年/月时间归档树。
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.TIMELINE_DATA || {
    currentUser: {
      uid: '553488',
      name: '少年游',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      avatarSmall: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
      sign: '于勇者死后的世界，重拾时间的刻度',
      joined: '2020-08-14 加入'
    },
    capsuleProfiles: {},
    localSubjectIds: [],
    tabs: [],
    smileCatalog: [],
    reactionCatalog: [],
    items: []
  };

  var LOCAL_SUBJECT_SET = {};
  (DATA.localSubjectIds || []).forEach(function (id) {
    LOCAL_SUBJECT_SET[String(id)] = true;
  });

  var TAB_LABELS = {
    all: '全部动态',
    say: '吐槽',
    subject: '收藏',
    progress: '进度',
    blog: '日志',
    mono: '人物',
    relation: '好友',
    group: '小组',
    wiki: '维基',
    index: '目录',
    doujin: '天窗'
  };

  var PRIMARY_TABS = { all: true, say: true, subject: true, progress: true, blog: true };

  var SMILE_INDEX = {};
  (DATA.smileCatalog || []).forEach(function (pack) {
    (pack.items || []).forEach(function (em) {
      SMILE_INDEX[em.code] = em.img;
    });
  });

  var STORE_KEYS = {
    posts: 'btl_custom_posts_v1',
    deleted: 'btl_deleted_ids_v1',
    likes: 'btl_likes_v1',
    replies: 'btl_replies_v1'
  };

  function readStore(key, fallback) {
    try {
      var raw = window.localStorage ? localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStore(key, val) {
    try {
      if (window.localStorage) localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  var state = {
    scope: 'global',
    uid: '553488',
    tab: 'all',
    ym: '',
    query: '',
    page: 1,
    pageSize: 15,
    smilePack: (DATA.smileCatalog[0] && DATA.smileCatalog[0].key) || 'tv',
    openLikeId: '',
    openReplyIds: {},
    customPosts: readStore(STORE_KEYS.posts, []),
    deletedIds: readStore(STORE_KEYS.deleted, {}),
    likeOverrides: readStore(STORE_KEYS.likes, {}),
    replyOverrides: readStore(STORE_KEYS.replies, {})
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg) {
    var host = document.getElementById('toastContainer');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'glass-toast';
    el.innerHTML = '<span>✦</span><span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 260);
    }, 2200);
  }

  /* 严格遵循传统十星制：★×n + ☆×(10-n) + 数字（禁止任何 5 星折算） */
  function tenStarsHtml(score) {
    var n = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
    if (!n) return '';
    var full = '';
    var empty = '';
    for (var i = 0; i < 10; i++) {
      if (i < n) full += '★';
      else empty += '☆';
    }
    return '<span class="btl-stars-ten" title="传统十星评分：' + n + ' / 10">' +
      '<span class="btl-stars-glyphs">' + full + empty + '</span>' +
      '<span class="btl-stars-num">' + n + '</span>' +
    '</span>';
  }

  function renderSmilesInText(rawHtml, alreadyEscaped) {
    var txt = alreadyEscaped ? String(rawHtml || '') : esc(rawHtml || '');
    return txt.replace(/\((bgm\d+|musume_\d+|blake_\d+)\)/g, function (m, code) {
      var token = '(' + code + ')';
      var img = SMILE_INDEX[token];
      if (!img) {
        var numMatch = code.match(/^bgm(\d+)$/);
        if (numMatch) {
          var num = parseInt(numMatch[1], 10);
          if (num >= 24 && num <= 47) {
            var tvIdx = String(num - 23);
            if (tvIdx.length < 2) tvIdx = '0' + tvIdx;
            img = 'https://bgm.tv/img/smiles/tv/' + tvIdx + '.gif';
          }
        }
      }
      if (!img) return m;
      return '<img src="' + esc(img) + '" alt="' + esc(token) + '" title="' + esc(token) + '" class="smile" referrerpolicy="no-referrer" />';
    });
  }

  function rewriteHtmlLinks(htmlStr) {
    if (!htmlStr) return '';
    var out = String(htmlStr);
    out = out.replace(/https:\/\/bgm\.tv\/subject\/(\d+)/g, function (m, sid) {
      return LOCAL_SUBJECT_SET[sid] ? ('subject.html?id=' + sid) : m;
    });
    out = out.replace(/https:\/\/bgm\.tv\/user\/(553488|sai)/g, function (m, uid) {
      return 'timeline.html?scope=capsule&uid=' + uid;
    });
    return out;
  }

  function resolveSubjectHref(card) {
    if (!card) return '#';
    if (card.id) {
      return 'subject.html?id=' + encodeURIComponent(card.id);
    }
    return card.url || 'subject.html?id=400602';
  }

  function isLocalLink(href) {
    return href && href.indexOf('http') !== 0;
  }

  function parseQueryFromUrl() {
    var params = new URLSearchParams(window.location.search || '');
    var sc = params.get('scope');
    if (sc === 'global' || sc === 'friends' || sc === 'capsule') state.scope = sc;
    var uid = params.get('uid');
    if (uid && DATA.capsuleProfiles[uid]) state.uid = uid;
    var tab = params.get('tab');
    if (tab && TAB_LABELS[tab]) state.tab = tab;
    var ym = params.get('ym');
    if (ym && /^\d{4}-\d{2}$/.test(ym)) state.ym = ym;
    var q = params.get('q');
    if (q) {
      state.query = q;
      var inp = document.getElementById('search_text');
      if (inp) inp.value = q;
    }
  }

  function syncUrl() {
    if (!window.history || !window.history.replaceState) return;
    var p = new URLSearchParams();
    if (state.scope !== 'global') p.set('scope', state.scope);
    if (state.scope === 'capsule') p.set('uid', state.uid);
    if (state.tab !== 'all') p.set('tab', state.tab);
    if (state.ym) p.set('ym', state.ym);
    if (state.query) p.set('q', state.query);
    var qs = p.toString();
    try {
      window.history.replaceState(null, '', qs ? ('?' + qs) : window.location.pathname);
    } catch (e) {}
  }

  function getMergedBaseItems() {
    var all = [];
    (state.customPosts || []).forEach(function (p) {
      if (!state.deletedIds[p.id]) all.push(p);
    });
    (DATA.items || []).forEach(function (it) {
      if (!state.deletedIds[it.id]) all.push(it);
    });
    return all;
  }

  function getScopeItems() {
    var all = getMergedBaseItems();
    return all.filter(function (it) {
      if (state.scope === 'global') {
        return it.scope === 'global' || it.isCustom;
      }
      if (state.scope === 'friends') {
        return it.scope === 'friends' || it.isCustom;
      }
      return (it.scope === 'capsule' && it.ownerUid === state.uid) || (it.isCustom && state.uid === '553488');
    });
  }

  function getFilteredItems() {
    var list = getScopeItems();
    if (state.tab !== 'all') {
      list = list.filter(function (it) { return it.tab === state.tab; });
    }
    if (state.ym) {
      list = list.filter(function (it) { return it.ym === state.ym; });
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      list = list.filter(function (it) {
        var hay = [
          it.user && it.user.name,
          it.user && it.user.uid,
          it.actionText,
          it.statusText,
          it.collectComment,
          it.excerpt,
          it.card && it.card.title,
          it.card && it.card.subtitle
        ].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    return list;
  }

  function getItemLikes(item) {
    if (state.likeOverrides[item.id]) return state.likeOverrides[item.id];
    return item.likes || [];
  }

  function getItemReplies(item) {
    var base = item.replies || [];
    var extra = state.replyOverrides[item.id] || [];
    return base.concat(extra);
  }

  /* ==================== 头部与 Scope 渲染 ==================== */
  function renderHeaderArea() {
    var heroEl = document.getElementById('header');
    var profEl = document.getElementById('headerProfile');
    var scopeLabel = document.getElementById('btlScopeBadgeLabel');
    var kpiEl = document.getElementById('btlKpiRow');
    var headingEl = document.getElementById('btlPageHeading');
    var subEl = document.getElementById('btlHeroSub');

    var scopeItems = getScopeItems();
    var tabCount = {};
    scopeItems.forEach(function (it) {
      tabCount[it.tab] = (tabCount[it.tab] || 0) + 1;
    });

    if (state.scope === 'capsule') {
      var prof = DATA.capsuleProfiles[state.uid] || DATA.currentUser;
      if (heroEl) heroEl.hidden = true;
      if (profEl) {
        profEl.hidden = false;
        var uidParam = encodeURIComponent(prof.uid);
        profEl.innerHTML =
          '<div class="btl-hero-backdrop" aria-hidden="true"></div>' +
          '<div class="btl-profile-top">' +
            '<div class="btl-profile-user">' +
              '<img src="' + esc(prof.avatar || prof.avatarSmall) + '" alt="' + esc(prof.name) + '" class="btl-profile-ava" referrerpolicy="no-referrer" />' +
              '<div>' +
                '<h1 class="btl-profile-name">' + esc(prof.name) + ' <span class="btl-profile-uid">@' + esc(prof.uid) + ' · 时间胶囊</span></h1>' +
                '<p class="btl-profile-sign">' + esc(prof.sign || '') + ' · ' + esc(prof.joined || '') + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="btl-profile-actions">' +
              '<a href="user.html?uid=' + uidParam + '" class="btl-profile-link-btn is-primary">🕰️ 个人时光机</a>' +
              '<button type="button" class="btl-profile-link-btn" data-switch-scope="global">🌐 返回全站时空</button>' +
              '<button type="button" class="btl-profile-link-btn" data-switch-scope="friends">🤝 好友动态</button>' +
            '</div>' +
          '</div>' +
          '<ul class="navTabs btl-nav-tabs">' +
            '<li><a href="user.html?uid=' + uidParam + '">时光机</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#anime">收藏</a></li>' +
            '<li><a href="timeline.html?scope=capsule&uid=' + uidParam + '" class="focus">时间胶囊 (' + scopeItems.length + ')</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#mono">人物</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#blog">日志</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#index">目录</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#group">小组</a></li>' +
            '<li><a href="user.html?uid=' + uidParam + '#friend">好友</a></li>' +
          '</ul>';
      }
      if (scopeLabel) scopeLabel.textContent = prof.name + '胶囊';
      document.title = prof.name + ' 的时间胶囊 · Bangumi 番组计划';
    } else {
      if (profEl) profEl.hidden = true;
      if (heroEl) heroEl.hidden = false;
      if (headingEl) {
        headingEl.textContent = state.scope === 'friends' ? '好友的时空动态' : '所有人的时间胶囊';
      }
      if (subEl) {
        subEl.textContent = state.scope === 'friends'
          ? '关注好友与个人动态聚合流 · 支持贴贴、展开回复与时间归档筛选'
          : '全站实时时间线 · 10 类动态 + 贴贴互动 + 6 大官方表情包';
      }
      if (scopeLabel) scopeLabel.textContent = state.scope === 'friends' ? '好友' : '全站';
      document.title = (state.scope === 'friends' ? '好友动态' : '时空管理局') + ' · Bangumi 番组计划';

      Array.prototype.forEach.call(document.querySelectorAll('#btlScopePills .btl-scope-pill'), function (btn) {
        var bScope = btn.getAttribute('data-scope');
        var bUid = btn.getAttribute('data-uid') || '';
        var active = bScope === state.scope && (bScope !== 'capsule' || bUid === state.uid);
        btn.classList.toggle('is-active', active);
      });

      if (kpiEl) {
        var likesTotal = scopeItems.reduce(function (acc, it) {
          return acc + getItemLikes(it).reduce(function (s, l) { return s + (l.count || 0); }, 0);
        }, 0);
        kpiEl.innerHTML =
          '<div class="btl-kpi-card"><span class="btl-kpi-label">当前视野记录</span><span class="btl-kpi-val">' + scopeItems.length + ' 条</span></div>' +
          '<div class="btl-kpi-card"><span class="btl-kpi-label">吐槽 / 收藏 / 进度</span><span class="btl-kpi-val">' + (tabCount.say || 0) + ' / ' + (tabCount.subject || 0) + ' / ' + (tabCount.progress || 0) + '</span></div>' +
          '<div class="btl-kpi-card"><span class="btl-kpi-label">日志 / 维基 / 天窗</span><span class="btl-kpi-val">' + (tabCount.blog || 0) + ' / ' + (tabCount.wiki || 0) + ' / ' + (tabCount.doujin || 0) + '</span></div>' +
          '<div class="btl-kpi-card"><span class="btl-kpi-label">社区贴贴互动</span><span class="btl-kpi-val">' + likesTotal + ' 次</span></div>';
      }
    }
  }

  /* ==================== Tab 栏与激活筛选提示 ==================== */
  function renderTabs() {
    Array.prototype.forEach.call(document.querySelectorAll('#timelineTabs a[data-tab]'), function (a) {
      var t = a.getAttribute('data-tab');
      a.classList.toggle('focus', t === state.tab);
    });
    var moreBtn = document.getElementById('btlMoreBtn');
    var moreLabel = document.getElementById('btlMoreLabel');
    if (moreBtn && moreLabel) {
      if (!PRIMARY_TABS[state.tab]) {
        moreBtn.classList.add('focus');
        moreLabel.textContent = '更多 · ' + (TAB_LABELS[state.tab] || state.tab);
      } else {
        moreBtn.classList.remove('focus');
        moreLabel.textContent = '更多';
      }
    }

    var filterBar = document.getElementById('btlActiveFilterBar');
    if (!filterBar) return;
    var chips = [];
    if (state.tab !== 'all') {
      chips.push('<button type="button" class="btl-filter-chip" data-clear="tab">类型：' + esc(TAB_LABELS[state.tab]) + ' ✕</button>');
    }
    if (state.ym) {
      chips.push('<button type="button" class="btl-filter-chip" data-clear="ym">归档：' + esc(state.ym) + ' ✕</button>');
    }
    if (state.query) {
      chips.push('<button type="button" class="btl-filter-chip" data-clear="query">搜索：' + esc(state.query) + ' ✕</button>');
    }
    if (chips.length) {
      filterBar.hidden = false;
      filterBar.innerHTML = '<span>当前筛选：</span>' + chips.join('');
    } else {
      filterBar.hidden = true;
      filterBar.innerHTML = '';
    }
  }

  /* ==================== 表情包抽屉 (#btlSmileDrawer) ==================== */
  function renderSmileDrawer() {
    var drawer = document.getElementById('btlSmileDrawer');
    if (!drawer) return;
    var packs = DATA.smileCatalog || [];
    var currentPack = packs.filter(function (p) { return p.key === state.smilePack; })[0] || packs[0];
    if (!currentPack) return;

    var tabsHtml = packs.map(function (p) {
      return '<button type="button" class="btl-smile-tab' + (p.key === currentPack.key ? ' is-active' : '') + '" data-smile-pack="' + esc(p.key) + '">' + esc(p.label) + '</button>';
    }).join('');

    var cellsHtml = (currentPack.items || []).map(function (em) {
      return '<button type="button" class="btl-smile-cell" data-insert-smile="' + esc(em.code) + '" title="' + esc(em.title + ' ' + em.code) + '">' +
        '<img src="' + esc(em.img) + '" alt="' + esc(em.code) + '" referrerpolicy="no-referrer" />' +
      '</button>';
    }).join('');

    drawer.innerHTML = '<div class="btl-smile-tabs">' + tabsHtml + '</div><div class="btl-smile-grid">' + cellsHtml + '</div>';
  }

  /* ==================== 主动态流渲染 (#timeline) ==================== */
  function renderCardHtml(card) {
    if (!card) return '';
    var href = resolveSubjectHref(card);
    var targetAttr = isLocalLink(href) ? '' : ' target="_blank" rel="noopener"';
    var rateParts = [];
    if (card.rank) rateParts.push('<span class="btl-rank-badge">Rank #' + card.rank + '</span>');
    if (card.score) {
      rateParts.push(tenStarsHtml(Math.round(card.score)));
      rateParts.push('<strong style="font-size:12px;">' + esc(card.score) + '</strong>');
    }
    if (card.votes) rateParts.push('<span style="color:var(--text-secondary);font-size:11.5px;">' + esc(card.votes) + '</span>');

    return '<div class="card btl-subject-card' + (card.tiny ? ' is-tiny' : '') + '">' +
      (card.cover
        ? '<a href="' + esc(href) + '"' + targetAttr + '><img src="' + esc(card.cover) + '" alt="' + esc(card.title) + '" class="btl-card-cover" referrerpolicy="no-referrer" /></a>'
        : '') +
      '<div class="btl-card-info">' +
        '<p class="btl-card-title"><a href="' + esc(href) + '"' + targetAttr + '>' + esc(card.title || '未命名条目') + '</a>' +
          (card.subtitle ? '<span class="btl-card-sub">' + esc(card.subtitle) + '</span>' : '') +
        '</p>' +
        (card.info ? '<p class="btl-card-meta">' + esc(card.info) + '</p>' : '') +
        (rateParts.length ? '<p class="btl-card-rate">' + rateParts.join('') + '</p>' : '') +
      '</div>' +
    '</div>';
  }

  function renderTimelineStream() {
    var container = document.getElementById('timeline');
    var pagerInner = document.getElementById('btlPagerInner');
    if (!container) return;

    var filtered = getFilteredItems();
    var totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var pageItems = filtered.slice(start, start + state.pageSize);

    if (!pageItems.length) {
      container.innerHTML = '<div class="btl-empty-state"><strong>暂无符合当前筛选条件的时空动态</strong><p style="margin:8px 0 0;font-size:12.5px;">尝试切换动态类型、清空时间归档或更换搜索关键词。</p></div>';
      if (pagerInner) pagerInner.innerHTML = '';
      return;
    }

    var groups = [];
    var groupMap = {};
    pageItems.forEach(function (it) {
      var dg = it.dateGroup || '今天';
      if (!groupMap[dg]) {
        groupMap[dg] = { date: dg, items: [] };
        groups.push(groupMap[dg]);
      }
      groupMap[dg].items.push(it);
    });

    container.innerHTML = groups.map(function (grp) {
      var itemsHtml = grp.items.map(function (it) {
        var u = it.user || {};
        var isCapsuleUser = u.uid === '553488' || u.uid === 'sai';
        var uHref = isCapsuleUser ? ('timeline.html?scope=capsule&uid=' + encodeURIComponent(u.uid)) : ('user.html?uid=' + encodeURIComponent(u.uid || '553488'));
        var uTarget = '';
        var actionHtml = rewriteHtmlLinks(it.actionHtml || esc(it.actionText || ''));
        var statusHtml = it.statusHtml ? renderSmilesInText(rewriteHtmlLinks(it.statusHtml), true) : '';
        var collectCommentHtml = it.collectComment ? renderSmilesInText(rewriteHtmlLinks(it.collectComment), true) : '';
        var likes = getItemLikes(it);
        var replies = getItemReplies(it);
        var isReplyOpen = !!state.openReplyIds[it.id];
        var isPickerOpen = state.openLikeId === it.id;

        var likesChips = likes.map(function (lk) {
          return '<button type="button" class="btl-like-chip' + (lk.active ? ' is-active' : '') + '" data-toggle-like="' + esc(it.id) + '" data-emoji="' + esc(lk.emoji) + '" title="' + esc((lk.users || []).join(', ')) + '">' +
            '<span>' + esc(lk.label) + '</span><span>' + (lk.count || 1) + '</span>' +
          '</button>';
        }).join('');

        var pickerHtml = isPickerOpen
          ? '<div class="btl-like-picker">' +
              (DATA.reactionCatalog || []).map(function (rc) {
                return '<button type="button" class="btl-like-pick-btn" data-pick-like="' + esc(it.id) + '" data-emoji="' + esc(rc.emoji) + '" title="' + esc(rc.label) + '">' + esc(rc.label) + '</button>';
              }).join('') +
            '</div>'
          : '';

        var replyDrawerHtml = isReplyOpen
          ? '<div class="btl-reply-drawer">' +
              '<div class="btl-reply-list">' +
                (replies.length
                  ? replies.map(function (rp) {
                      return '<div class="btl-reply-item">' +
                        '<img src="' + esc(rp.avatar || DATA.currentUser.avatarSmall) + '" alt="' + esc(rp.author) + '" class="btl-reply-ava" referrerpolicy="no-referrer" />' +
                        '<div><strong>' + esc(rp.author) + '</strong> <span style="color:var(--text-secondary);font-size:11px;">' + esc(rp.time || '') + '</span><div>' + renderSmilesInText(rp.content, false) + '</div></div>' +
                      '</div>';
                    }).join('')
                  : '<div style="font-size:12px;color:var(--text-secondary);">还没有人回复，写下第一条回应吧～</div>') +
              '</div>' +
              '<form class="btl-reply-form" data-reply-form="' + esc(it.id) + '">' +
                '<input type="text" class="btl-reply-input" placeholder="输入回复内容，支持 (bgm38)..." autocomplete="off" />' +
                '<button type="submit" class="btl-reply-send">发送</button>' +
              '</form>' +
            '</div>'
          : '';

        var canDel = it.isCustom || (u.uid === '553488' && state.scope === 'capsule');

        return '<li id="tml_' + esc(it.id) + '" class="tml_item btl-item" data-item-user="' + esc(u.uid || '') + '">' +
          '<a href="' + esc(uHref) + '"' + uTarget + ' class="btl-ava-link" title="查看 ' + esc(u.name || '') + ' 的动态">' +
            '<span class="avatarNeue avatarReSize40 ll btl-ava-box" style="background-image:url(\'' + esc(u.avatar || 'https://lain.bgm.tv/pic/user/l/icon.jpg') + '\')"></span>' +
          '</a>' +
          '<div class="btl-item-body">' +
            '<div class="btl-action-line">' +
              '<a href="' + esc(uHref) + '"' + uTarget + ' class="btl-user-name">' + esc(u.name || 'Bangumi 用户') + '</a>' +
              '<span class="info">' + actionHtml + '</span>' +
              '<span class="btl-tab-badge">' + esc(TAB_LABELS[it.tab] || it.tab) + '</span>' +
            '</div>' +
            (statusHtml ? '<p class="status btl-status-quote">' + statusHtml + '</p>' : '') +
            ((it.collectStars || collectCommentHtml)
              ? '<div class="collectInfo btl-collect-box">' +
                  (it.collectStars ? tenStarsHtml(it.collectStars) : '') +
                  (collectCommentHtml ? '<div class="comment btl-collect-comment">' + collectCommentHtml + '</div>' : '') +
                '</div>'
              : '') +
            (it.card ? renderCardHtml(it.card) : '') +
            (it.excerpt ? '<div class="info_sub btl-excerpt">' + esc(it.excerpt) + '</div>' : '') +
            ((it.mediaThumb && !it.card)
              ? '<img src="' + esc(it.mediaThumb) + '" alt="动态缩略图" class="btl-media-thumb" referrerpolicy="no-referrer" />'
              : '') +
            '<div class="likes_grid btl-likes-row">' +
              likesChips +
              '<button type="button" class="btl-like-add-btn" data-like-type="40" data-open-like="' + esc(it.id) + '">+ 贴贴</button>' +
              pickerHtml +
            '</div>' +
            '<div class="post_actions date btl-post-actions">' +
              '<span class="titleTip" title="' + esc(it.timestamp || '') + '">' + esc(it.timeAgo || it.timestamp || '刚刚') + '</span>' +
              '<span>· ' + esc(it.source || 'web') + '</span>' +
              '<a href="javascript:void(0)" class="tml_comment" data-toggle-reply="' + esc(it.id) + '">💬 回复 (' + replies.length + ')</a>' +
              (canDel ? '<a href="javascript:void(0)" class="tml_del" data-del-item="' + esc(it.id) + '">🗑 删除</a>' : '') +
            '</div>' +
            replyDrawerHtml +
          '</div>' +
        '</li>';
      }).join('');

      return '<section class="btl-date-group">' +
        '<h4 class="Header btl-date-header"><span>' + esc(grp.date) + '</span><span class="btl-date-count">' + grp.items.length + ' 条</span></h4>' +
        '<ul class="btl-item-list">' + itemsHtml + '</ul>' +
      '</section>';
    }).join('');

    renderPager(totalPages, filtered.length);
  }

  function renderPager(totalPages, totalItems) {
    var pagerInner = document.getElementById('btlPagerInner');
    if (!pagerInner) return;
    if (totalPages <= 1) {
      pagerInner.innerHTML = '<span style="font-size:12px;color:var(--text-secondary);">共 ' + totalItems + ' 条动态 · 已显示全部</span>';
      return;
    }
    var btns = [];
    btns.push('<button type="button" class="btl-page-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>‹ 上一页</button>');
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - state.page) <= 1) {
        btns.push('<button type="button" class="btl-page-btn' + (i === state.page ? ' p_cur' : '') + '" data-page="' + i + '">' + i + '</button>');
      } else if (btns[btns.length - 1] !== '<span>…</span>') {
        btns.push('<span>…</span>');
      }
    }
    btns.push('<button type="button" class="btl-page-btn" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>下一页 ›</button>');
    btns.push('<span style="font-size:12px;color:var(--text-secondary);margin-left:6px;">第 ' + state.page + ' / ' + totalPages + ' 页 · 共 ' + totalItems + ' 条</span>');
    pagerInner.innerHTML = btns.join('');
  }

  /* ==================== 右侧栏渲染 ==================== */
  function renderSidebar() {
    var scopeListEl = document.getElementById('btlSideScopeList');
    if (scopeListEl) {
      var opts = [
        { scope: 'global', uid: '', label: '🌐 全站时空管理局', count: getMergedBaseItems().filter(function (i) { return i.scope === 'global' || i.isCustom; }).length },
        { scope: 'friends', uid: '', label: '🤝 仅好友动态流', count: getMergedBaseItems().filter(function (i) { return i.scope === 'friends' || i.isCustom; }).length },
        { scope: 'capsule', uid: '553488', label: '💊 少年游的时间胶囊', count: getMergedBaseItems().filter(function (i) { return (i.scope === 'capsule' && i.ownerUid === '553488') || i.isCustom; }).length },
        { scope: 'capsule', uid: 'sai', label: '🖖 Sai🖖 的时间胶囊', count: getMergedBaseItems().filter(function (i) { return i.scope === 'capsule' && i.ownerUid === 'sai'; }).length }
      ];
      scopeListEl.innerHTML = opts.map(function (o) {
        var active = state.scope === o.scope && (o.scope !== 'capsule' || state.uid === o.uid);
        return '<button type="button" class="btl-side-scope-btn' + (active ? ' is-active' : '') + '" data-side-scope="' + o.scope + '" data-side-uid="' + o.uid + '">' +
          '<span>' + esc(o.label) + '</span><span>' + o.count + '</span>' +
        '</button>';
      }).join('');
    }

    var statsEl = document.getElementById('btlStatsHost');
    if (statsEl) {
      var scopeItems = getScopeItems();
      var total = Math.max(1, scopeItems.length);
      var counts = {};
      scopeItems.forEach(function (it) {
        counts[it.tab] = (counts[it.tab] || 0) + 1;
      });
      var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
      statsEl.innerHTML = '<div class="btl-stat-row">' + keys.map(function (k) {
        var pct = Math.round((counts[k] / total) * 100);
        return '<div class="btl-stat-item">' +
          '<div class="btl-stat-head"><span>' + esc(TAB_LABELS[k] || k) + '</span><span>' + counts[k] + ' 条 (' + pct + '%)</span></div>' +
          '<div class="btl-stat-bar"><div class="btl-stat-fill" style="width:' + pct + '%"></div></div>' +
        '</div>';
      }).join('') + '</div>';
    }

    var treeEl = document.getElementById('btlArchiveTree');
    var resetBtn = document.getElementById('btlResetYmBtn');
    if (resetBtn) resetBtn.hidden = !state.ym;
    if (treeEl) {
      var byYear = {};
      getScopeItems().forEach(function (it) {
        var y = it.year || '2026';
        var m = it.month || '11';
        if (!byYear[y]) byYear[y] = { total: 0, months: {} };
        byYear[y].total += 1;
        byYear[y].months[m] = (byYear[y].months[m] || 0) + 1;
      });
      var years = Object.keys(byYear).sort(function (a, b) { return Number(b) - Number(a); });
      treeEl.innerHTML = years.map(function (y, idx) {
        var months = Object.keys(byYear[y].months).sort(function (a, b) { return Number(b) - Number(a); });
        var monthHtml = months.map(function (m) {
          var ym = y + '-' + m;
          return '<button type="button" class="btl-month-pill' + (state.ym === ym ? ' is-active' : '') + '" data-ym="' + ym + '">' +
            m + ' 月 <span>(' + byYear[y].months[m] + ')</span>' +
          '</button>';
        }).join('');
        var shouldOpen = idx === 0 || (state.ym && state.ym.indexOf(y + '-') === 0);
        return '<details class="btl-year-node"' + (shouldOpen ? ' open' : '') + '>' +
          '<summary class="btl-year-summary"><span>📁 ' + esc(y) + ' 年归档</span><span>' + byYear[y].total + ' 条</span></summary>' +
          '<div class="btl-month-list">' + monthHtml + '</div>' +
        '</details>';
      }).join('');
    }

    var rssEl = document.getElementById('btlRssHost');
    if (rssEl) {
      var rssHref = state.scope === 'capsule'
        ? ('https://bgm.tv/feed/user/' + encodeURIComponent(state.uid) + '/timeline')
        : 'https://bgm.tv/feed/timeline';
      var rssText = state.scope === 'capsule'
        ? ('RSS 2.0 · 订阅 ' + ((DATA.capsuleProfiles[state.uid] && DATA.capsuleProfiles[state.uid].name) || state.uid) + ' 的胶囊')
        : 'RSS 2.0 · 订阅全站时空胶囊';
      rssEl.innerHTML =
        '<a href="' + esc(rssHref) + '" target="_blank" rel="noopener" class="btl-rss-pill">' +
          '<span>📡 ' + esc(rssText) + '</span><span>↗</span>' +
        '</a>' +
        '<div class="btl-hub-links">' +
          '<a href="index.html" class="btl-hub-link">🏠 主页</a>' +
          '<a href="user.html" class="btl-hub-link">🕰️ 时光机</a>' +
          '<a href="subject.html" class="btl-hub-link">🎬 条目</a>' +
          '<a href="channel.html" class="btl-hub-link">📺 频道</a>' +
          '<a href="tag.html" class="btl-hub-link">🏷️ 标签</a>' +
          '<a href="calendar.html" class="btl-hub-link">📅 放送</a>' +
          '<a href="browser.html" class="btl-hub-link">📊 排行</a>' +
          '<a href="group.html" class="btl-hub-link">👥 小组</a>' +
          '<a href="search.html" class="btl-hub-link">🔍 搜索</a>' +
        '</div>';
    }
  }

  function renderAll() {
    syncUrl();
    renderHeaderArea();
    renderTabs();
    renderSmileDrawer();
    renderTimelineStream();
    renderSidebar();
  }

  /* ==================== 交互事件绑定 ==================== */
  function bindEvents() {
    // 1. 顶部与右侧 Scope 切换
    document.addEventListener('click', function (e) {
      var scopeBtn = e.target.closest('[data-scope], [data-switch-scope], [data-side-scope]');
      if (scopeBtn) {
        var nextScope = scopeBtn.getAttribute('data-scope') || scopeBtn.getAttribute('data-switch-scope') || scopeBtn.getAttribute('data-side-scope');
        var nextUid = scopeBtn.getAttribute('data-uid') || scopeBtn.getAttribute('data-side-uid') || state.uid;
        if (nextScope) {
          state.scope = nextScope;
          if (nextScope === 'capsule' && nextUid) state.uid = nextUid;
          state.ym = '';
          state.page = 1;
          renderAll();
          return;
        }
      }

      // 2. Tab 切换 & 更多下拉
      var moreBtn = e.target.closest('#btlMoreBtn');
      var moreMenu = document.getElementById('btlMoreMenu');
      if (moreBtn && moreMenu) {
        var nextHidden = !moreMenu.hidden;
        moreMenu.hidden = nextHidden;
        moreBtn.setAttribute('aria-expanded', String(!nextHidden));
        return;
      }

      var tabEl = e.target.closest('#timelineTabs a[data-tab]');
      if (tabEl) {
        state.tab = tabEl.getAttribute('data-tab') || 'all';
        state.page = 1;
        if (moreMenu) moreMenu.hidden = true;
        renderAll();
        return;
      }

      if (moreMenu && !moreMenu.hidden && !e.target.closest('#btlMoreWrap')) {
        moreMenu.hidden = true;
      }

      // 3. 清除单个筛选 Chip
      var clr = e.target.closest('[data-clear]');
      if (clr) {
        var kind = clr.getAttribute('data-clear');
        if (kind === 'tab') state.tab = 'all';
        if (kind === 'ym') state.ym = '';
        if (kind === 'query') {
          state.query = '';
          var si = document.getElementById('search_text');
          if (si) si.value = '';
        }
        state.page = 1;
        renderAll();
        return;
      }

      // 4. 表情包抽屉切换与插入
      var smileToggle = e.target.closest('#btlToggleSmileBtn');
      if (smileToggle) {
        var drawer = document.getElementById('btlSmileDrawer');
        if (drawer) {
          drawer.hidden = !drawer.hidden;
          smileToggle.setAttribute('aria-expanded', String(!drawer.hidden));
        }
        return;
      }

      var packBtn = e.target.closest('[data-smile-pack]');
      if (packBtn) {
        state.smilePack = packBtn.getAttribute('data-smile-pack');
        renderSmileDrawer();
        return;
      }

      var insertSmile = e.target.closest('[data-insert-smile], [data-quick-smile]');
      if (insertSmile) {
        var code = insertSmile.getAttribute('data-insert-smile') || insertSmile.getAttribute('data-quick-smile');
        var ta = document.getElementById('SayInput');
        if (ta && code) {
          var start = ta.selectionStart || ta.value.length;
          var end = ta.selectionEnd || ta.value.length;
          var next = ta.value.slice(0, start) + code + ta.value.slice(end);
          if (next.length <= 380) {
            ta.value = next;
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + code.length;
            updateCharCounter();
          } else {
            toast('已达到 380 字上限');
          }
        }
        return;
      }

      // 5. 贴贴交互
      var openLike = e.target.closest('[data-open-like]');
      if (openLike) {
        var lid = openLike.getAttribute('data-open-like');
        state.openLikeId = state.openLikeId === lid ? '' : lid;
        renderTimelineStream();
        return;
      }

      var pickLike = e.target.closest('[data-pick-like], [data-toggle-like]');
      if (pickLike) {
        var tid = pickLike.getAttribute('data-pick-like') || pickLike.getAttribute('data-toggle-like');
        var emoji = pickLike.getAttribute('data-emoji');
        var targetItem = getMergedBaseItems().filter(function (x) { return x.id === tid; })[0];
        if (targetItem) {
          var list = JSON.parse(JSON.stringify(getItemLikes(targetItem)));
          var found = list.filter(function (l) { return l.emoji === emoji; })[0];
          if (found) {
            if (found.active) {
              found.active = false;
              found.count = Math.max(0, (found.count || 1) - 1);
              if (found.count === 0) list = list.filter(function (l) { return l.emoji !== emoji; });
            } else {
              found.active = true;
              found.count = (found.count || 0) + 1;
            }
          } else {
            var cat = (DATA.reactionCatalog || []).filter(function (c) { return c.emoji === emoji; })[0] || { label: '✨ 贴贴', icon: '' };
            list.push({ emoji: emoji, label: cat.label, icon: cat.icon, count: 1, users: ['少年游'], active: true });
          }
          state.likeOverrides[tid] = list;
          writeStore(STORE_KEYS.likes, state.likeOverrides);
          state.openLikeId = '';
          renderTimelineStream();
          renderHeaderArea();
        }
        return;
      }

      // 6. 展开/收起回复
      var toggleRep = e.target.closest('[data-toggle-reply]');
      if (toggleRep) {
        var rid = toggleRep.getAttribute('data-toggle-reply');
        state.openReplyIds[rid] = !state.openReplyIds[rid];
        renderTimelineStream();
        return;
      }

      // 7. 删除自己发表的时间胶囊
      var delBtn = e.target.closest('[data-del-item]');
      if (delBtn) {
        var did = delBtn.getAttribute('data-del-item');
        state.deletedIds[did] = true;
        writeStore(STORE_KEYS.deleted, state.deletedIds);
        toast('已从时间胶囊移除该条动态');
        renderAll();
        return;
      }

      // 8. 分页点击
      var pgBtn = e.target.closest('[data-page]');
      if (pgBtn && !pgBtn.disabled) {
        var p = parseInt(pgBtn.getAttribute('data-page'), 10);
        if (p >= 1) {
          state.page = p;
          renderTimelineStream();
          var tabsBar = document.getElementById('timelineTabs');
          if (tabsBar && tabsBar.scrollIntoView) tabsBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // 9. 右侧时间归档月点击与重置
      var ymBtn = e.target.closest('[data-ym]');
      if (ymBtn) {
        var ym = ymBtn.getAttribute('data-ym');
        state.ym = state.ym === ym ? '' : ym;
        state.page = 1;
        renderAll();
        return;
      }
      if (e.target.closest('#btlResetYmBtn')) {
        state.ym = '';
        state.page = 1;
        renderAll();
        return;
      }

      // 10. 顶部搜索框左侧范围快捷切换
      if (e.target.closest('#btlScopeBadgeBtn')) {
        if (state.scope === 'global') state.scope = 'friends';
        else if (state.scope === 'friends') { state.scope = 'capsule'; state.uid = '553488'; }
        else state.scope = 'global';
        state.ym = '';
        state.page = 1;
        renderAll();
      }
    });

    // 发布新吐槽 (#SayFrom)
    var sayForm = document.getElementById('SayFrom');
    var sayInput = document.getElementById('SayInput');
    function updateCharCounter() {
      var cntEl = document.getElementById('btlCharCount');
      if (!cntEl || !sayInput) return;
      var len = sayInput.value.length;
      cntEl.textContent = len + ' / 380';
      cntEl.classList.toggle('is-warn', len >= 320 && len < 380);
      cntEl.classList.toggle('is-full', len >= 380);
    }
    if (sayInput) {
      sayInput.addEventListener('input', updateCharCounter);
    }
    if (sayForm) {
      sayForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!sayInput) return;
        var text = sayInput.value.trim();
        if (!text) {
          toast('请先输入想分享的吐槽内容');
          return;
        }
        var now = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        var ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
        var newItem = {
          id: 'custom_' + Date.now(),
          isCustom: true,
          tab: 'say',
          scope: state.scope,
          ownerUid: '553488',
          dateGroup: '今天',
          year: String(now.getFullYear()),
          month: pad(now.getMonth() + 1),
          ym: now.getFullYear() + '-' + pad(now.getMonth() + 1),
          user: {
            uid: '553488',
            name: '少年游',
            avatar: DATA.currentUser.avatarSmall,
            url: 'timeline.html?scope=capsule&uid=553488'
          },
          actionHtml: '',
          actionText: '吐槽',
          statusHtml: esc(text),
          statusText: text,
          collectStars: 0,
          collectComment: '',
          card: null,
          mediaThumb: '',
          excerpt: '',
          replyCount: 0,
          replyUrl: '',
          timestamp: ts,
          timeAgo: '刚刚',
          source: 'web',
          likes: [],
          replies: []
        };
        state.customPosts.unshift(newItem);
        writeStore(STORE_KEYS.posts, state.customPosts);
        sayInput.value = '';
        updateCharCounter();
        var dr = document.getElementById('btlSmileDrawer');
        if (dr) dr.hidden = true;
        if (state.tab !== 'all' && state.tab !== 'say') state.tab = 'all';
        state.page = 1;
        toast('吐槽已成功投递至时间胶囊 ✨');
        renderAll();
      });
    }

    // 回复表单提交
    document.addEventListener('submit', function (e) {
      var rf = e.target.closest('[data-reply-form]');
      if (!rf) return;
      e.preventDefault();
      var tid = rf.getAttribute('data-reply-form');
      var inp = rf.querySelector('.btl-reply-input');
      var val = inp ? inp.value.trim() : '';
      if (!val) return;
      var list = state.replyOverrides[tid] || [];
      list.push({
        id: 'rep_' + Date.now(),
        uid: '553488',
        author: '少年游',
        avatar: DATA.currentUser.avatarSmall,
        time: '刚刚',
        content: val
      });
      state.replyOverrides[tid] = list;
      writeStore(STORE_KEYS.replies, state.replyOverrides);
      renderTimelineStream();
      toast('回复已发送');
    });

    // 搜索框实时过滤 + / 快捷键
    var searchInp = document.getElementById('search_text');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        state.query = searchInp.value.trim();
        state.page = 1;
        renderAll();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        if (searchInp) searchInp.focus();
      }
    });

    // 昼夜开关
    var themeToggle = document.getElementById('btnThemeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        var d = document.documentElement;
        d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark';
      });
    }
  }

  parseQueryFromUrl();
  bindEvents();
  renderAll();
})();
