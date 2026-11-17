/**
 * Bangumi Redesign - Page 10 Subject Reviews (/subject/{id}/reviews) & Discussion Board (/subject/{id}/board)
 * Supports dual-view switching (?tab=reviews|board), traditional 10-star rating, inline/drawer reading,
 * helpful voting, spoiler scratch-off, pagination, and localStorage persistence for new reviews/topics/replies.
 */
(function () {
  'use strict';

  var STORAGE_PREFIX = 'bgm_reviews_board_v1_';
  var REVIEWS_PER_PAGE = 6;
  var TOPICS_PER_PAGE = 12;

  var STAR_WORDS = {
    10: '超神作',
    9: '神作',
    8: '力荐',
    7: '推荐',
    6: '还行',
    5: '不过不失',
    4: '较差',
    3: '差',
    2: '很差',
    1: '不忍直视'
  };

  var TOPIC_CAT_LABELS = {
    plot: '剧情考据',
    staff: '制作演出',
    music: '配乐声优',
    chat: '综合讨论'
  };

  var state = {
    subjectId: '400602',
    tab: 'reviews', // 'reviews' | 'board'
    reviewFilter: 'all', // 'all' | 'high' | 'good' | 'mid'
    reviewSort: 'helpful', // 'helpful' | 'latest' | 'replies' | 'star'
    boardFilter: 'all', // 'all' | 'hot' | 'plot' | 'staff' | 'music' | 'chat'
    boardSort: 'latest', // 'latest' | 'replies' | 'views'
    searchQuery: '',
    page: 1,
    expandedReviews: {},
    votedHelpful: {},
    activeReviewId: null,
    activeTopicId: null,
    draftStar: 9
  };

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

  function tenStarString(score10) {
    var n = Math.max(1, Math.min(10, Math.round(Number(score10) || 8)));
    return '★'.repeat(n) + '☆'.repeat(10 - n);
  }

  function formatSpoilers(text) {
    var safe = esc(text);
    return safe.replace(/\[mask\]([\s\S]*?)\[\/mask\]/g, function (_, inner) {
      return '<span class="bgm_spoiler" data-act="toggle-spoiler" title="点击刮开/隐藏剧透">' + inner + '</span>';
    });
  }

  function showToast(msg) {
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(msg);
      return;
    }
    var box = $('toastContainer');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastContainer';
      box.className = 'toast-container';
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'glass-toast';
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 2600);
  }

  function loadPersistedState(sid) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + sid);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function savePersistedState(sid, payload) {
    try {
      localStorage.setItem(STORAGE_PREFIX + sid, JSON.stringify(payload));
    } catch (e) {}
  }

  function getSubjectBundle(sid) {
    var all = window.REVIEW_BOARD_DATA || {};
    var bundle = all[sid] || all['400602'];
    if (!bundle) return null;

    var saved = loadPersistedState(sid);
    if (saved) {
      if (Array.isArray(saved.customReviews)) {
        saved.customReviews.forEach(function (cr) {
          if (!bundle.reviews.some(function (r) { return String(r.id) === String(cr.id); })) {
            bundle.reviews.unshift(cr);
          }
        });
      }
      if (Array.isArray(saved.customTopics)) {
        saved.customTopics.forEach(function (ct) {
          if (!bundle.topics.some(function (t) { return String(t.id) === String(ct.id); })) {
            bundle.topics.unshift(ct);
          }
        });
      }
      if (saved.helpfulMap) {
        Object.keys(saved.helpfulMap).forEach(function (rid) {
          var target = bundle.reviews.find(function (r) { return String(r.id) === String(rid); });
          if (target) target.helpful = saved.helpfulMap[rid];
        });
      }
      if (saved.votedHelpful) {
        state.votedHelpful = saved.votedHelpful;
      }
      if (saved.reviewComments) {
        Object.keys(saved.reviewComments).forEach(function (rid) {
          var target = bundle.reviews.find(function (r) { return String(r.id) === String(rid); });
          if (target) {
            target.comments = saved.reviewComments[rid];
            target.replies = target.comments.length;
          }
        });
      }
      if (saved.topicPosts) {
        Object.keys(saved.topicPosts).forEach(function (tid) {
          var target = bundle.topics.find(function (t) { return String(t.id) === String(tid); });
          if (target) {
            target.posts = saved.topicPosts[tid];
            target.replies = Math.max(target.replies, target.posts.length);
          }
        });
      }
    }
    return bundle;
  }

  function persistCurrentSubject() {
    var bundle = getSubjectBundle(state.subjectId);
    if (!bundle) return;
    var saved = loadPersistedState(state.subjectId) || {
      customReviews: [],
      customTopics: [],
      helpfulMap: {},
      votedHelpful: {},
      reviewComments: {},
      topicPosts: {}
    };
    saved.votedHelpful = state.votedHelpful;
    bundle.reviews.forEach(function (r) {
      saved.helpfulMap[r.id] = r.helpful;
      if (r.isCustom && !saved.customReviews.some(function (x) { return String(x.id) === String(r.id); })) {
        saved.customReviews.unshift(r);
      }
      saved.reviewComments[r.id] = r.comments || [];
    });
    bundle.topics.forEach(function (t) {
      if (t.isCustom && !saved.customTopics.some(function (x) { return String(x.id) === String(t.id); })) {
        saved.customTopics.unshift(t);
      }
      saved.topicPosts[t.id] = t.posts || [];
    });
    savePersistedState(state.subjectId, saved);
  }

  function parseUrlParams() {
    var params = new URLSearchParams(window.location.search || '');
    var sid = params.get('id');
    if (sid && window.REVIEW_BOARD_DATA && window.REVIEW_BOARD_DATA[sid]) {
      state.subjectId = sid;
    }
    var tab = params.get('tab') || params.get('view');
    if (tab === 'board' || tab === 'reviews') {
      state.tab = tab;
    } else if (window.location.hash === '#board') {
      state.tab = 'board';
    }
    var p = parseInt(params.get('page') || '1', 10);
    if (p > 0) state.page = p;
  }

  function syncUrlParams() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('id', state.subjectId);
      url.searchParams.set('tab', state.tab);
      if (state.page > 1) {
        url.searchParams.set('page', String(state.page));
      } else {
        url.searchParams.delete('page');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }

  function syncTopBannerAndNav(bundle) {
    var subj = bundle.subject;
    var sid = String(subj.id);

    document.title = subj.name_cn + (state.tab === 'board' ? ' 的讨论版' : ' 的评论') + ' · Bangumi 番组计划';

    // Preset bar highlight
    var presetBtns = document.querySelectorAll('#bannerCategoryBar [data-subject-id]');
    presetBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-subject-id') === sid);
    });

    // Hero cover & text
    var coverImg = $('subjectCoverImg');
    if (coverImg) {
      coverImg.src = subj.cover;
      coverImg.alt = subj.name_cn;
    }
    var coverFrame = $('subjectCoverFrame');
    if (coverFrame) {
      coverFrame.classList.toggle('is-music-square', subj.type_key === 'music');
    }
    var badgeType = $('subjectTypeBadge');
    if (badgeType) badgeType.textContent = subj.type_label;
    var rankBadge = $('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Bangumi Ranked #' + subj.rank;
    var titleCn = $('subjectTitleCn');
    if (titleCn) titleCn.textContent = subj.name_cn;
    var titleJp = $('subjectTitleJp');
    if (titleJp) titleJp.textContent = subj.name + ' · ' + subj.info_short;
    var scoreBig = $('subjectScoreBig');
    if (scoreBig) scoreBig.textContent = Number(subj.score).toFixed(1);
    var scoreStars = $('subjectScoreStars');
    if (scoreStars) scoreStars.textContent = tenStarString(Math.round(subj.score));
    var scoreVotes = $('subjectScoreVotes');
    if (scoreVotes) scoreVotes.textContent = subj.total_votes.toLocaleString() + ' 人评分';

    // Update #subjectNavTabs links & active focus state
    var navList = $('subjectNavTabs');
    if (navList) {
      var revCount = bundle.reviews.length;
      var brdCount = bundle.topics.length;
      var items = [
        { key: 'overview', label: '概览', href: 'subject.html?id=' + sid },
        { key: 'episodes', label: '章节', count: subj.eps, href: 'subject-ep.html?id=' + sid },
        { key: 'characters', label: '角色', count: 24, href: 'subject-characters.html?id=' + sid },
        { key: 'persons', label: '制作人员', count: 32, href: 'subject-persons.html?id=' + sid },
        { key: 'comments', label: '吐槽箱', count: 38, href: 'subject-comments.html?id=' + sid },
        { key: 'reviews', label: '评论', count: revCount, href: 'subject-reviews.html?id=' + sid + '&tab=reviews' },
        { key: 'board', label: '讨论版', count: brdCount, href: 'subject-reviews.html?id=' + sid + '&tab=board' }
        ,{ key: 'stats', label: '透视', href: 'subject-stats.html?id=' + sid }
        ,{ key: 'wiki', label: '维基修订', href: 'subject-wiki.html?id=' + sid }
      ];
      navList.innerHTML = items.map(function (it) {
        var isFocus = (it.key === state.tab);
        var liCls = 'subject-nav-tab-item' + (isFocus ? ' active' : '');
        var aCls = isFocus ? ' class="focus"' : '';
        var cntHtml = it.count != null ? ' <span class="tab-count">' + it.count + '</span>' : '';
        var actAttr = (it.key === 'reviews' || it.key === 'board')
          ? ' data-act="switch-tab" data-tab="' + it.key + '"'
          : '';
        return '<li class="' + liCls + '"><a href="' + it.href + '"' + aCls + ' data-tab="' + it.key + '"' + actAttr + '>' + it.label + cntHtml + '</a></li>';
      }).join('');
    }
  }

  function getFilteredReviews(bundle) {
    var list = bundle.reviews.slice();
    if (state.reviewFilter === 'high') {
      list = list.filter(function (r) { return r.star >= 9; });
    } else if (state.reviewFilter === 'good') {
      list = list.filter(function (r) { return r.star >= 7 && r.star <= 8; });
    } else if (state.reviewFilter === 'mid') {
      list = list.filter(function (r) { return r.star <= 6; });
    }
    var q = state.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(function (r) {
        return (
          r.title.toLowerCase().indexOf(q) !== -1 ||
          r.user.toLowerCase().indexOf(q) !== -1 ||
          r.summary.toLowerCase().indexOf(q) !== -1 ||
          (r.tags || []).join(' ').toLowerCase().indexOf(q) !== -1
        );
      });
    }
    if (state.reviewSort === 'helpful') {
      list.sort(function (a, b) { return (b.helpful || 0) - (a.helpful || 0); });
    } else if (state.reviewSort === 'latest') {
      list.sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });
    } else if (state.reviewSort === 'replies') {
      list.sort(function (a, b) { return (b.replies || 0) - (a.replies || 0); });
    } else if (state.reviewSort === 'star') {
      list.sort(function (a, b) { return (b.star || 0) - (a.star || 0); });
    }
    return list;
  }

  function getFilteredTopics(bundle) {
    var list = bundle.topics.slice();
    if (state.boardFilter === 'hot') {
      list = list.filter(function (t) { return (t.replies || 0) >= 20; });
    } else if (state.boardFilter !== 'all') {
      list = list.filter(function (t) { return t.category === state.boardFilter; });
    }
    var q = state.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(function (t) {
        return (
          t.title.toLowerCase().indexOf(q) !== -1 ||
          t.user.toLowerCase().indexOf(q) !== -1
        );
      });
    }
    if (state.boardSort === 'replies') {
      list.sort(function (a, b) { return (b.replies || 0) - (a.replies || 0); });
    } else if (state.boardSort === 'views') {
      list.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
    } else {
      list.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return String(b.time).localeCompare(String(a.time));
      });
    }
    return list;
  }

  function renderHeaderAndFilterBar(bundle) {
    var subj = bundle.subject;
    var sid = String(subj.id);
    var revCount = bundle.reviews.length;
    var brdCount = bundle.topics.length;

    var headerTitle = $('brvMainHeading');
    if (headerTitle) {
      headerTitle.innerHTML = state.tab === 'reviews'
        ? '<span>✍️</span> <span>' + esc(subj.name_cn) + ' 的长评列表</span> <span class="brv-subtitle-pill">共 ' + revCount + ' 篇深度评论 · 均分 ' + bundle.stats.avgReviewStar + ' ★</span>'
        : '<span>💬</span> <span>' + esc(subj.name_cn) + ' 的讨论版</span> <span class="brv-subtitle-pill">共 ' + brdCount + ' 个讨论主题 · ' + bundle.stats.totalTopicReplies + ' 条跟帖</span>';
    }

    // Update top right Spec action buttons
    var btnWriteReview = $('brvBtnWriteReview');
    if (btnWriteReview) {
      btnWriteReview.setAttribute('href', '/blog/create?review=' + sid);
      btnWriteReview.innerHTML = '✍️ 我来评论这部' + esc(subj.verb_label || '动画');
      btnWriteReview.classList.toggle('is-secondary', state.tab === 'board');
    }
    var btnNewTopic = $('brvBtnNewTopic');
    if (btnNewTopic) {
      btnNewTopic.setAttribute('href', '/subject/' + sid + '/board/new');
      btnNewTopic.innerHTML = '💬 添加新讨论';
      btnNewTopic.classList.toggle('is-secondary', state.tab === 'reviews');
    }

    // Update #SecTab > ul.secTab
    var secTabUl = $('brvSecTabList');
    if (secTabUl) {
      secTabUl.innerHTML = [
        '<li class="' + (state.tab === 'reviews' ? 'selected' : '') + '">',
        '  <a href="/subject/' + sid + '/reviews" class="' + (state.tab === 'reviews' ? 'selected' : '') + '" data-act="switch-tab" data-tab="reviews">',
        '    <span>✍️ 长评列表 (Reviews)</span><span class="brv-tab-badge">' + revCount + '</span>',
        '  </a>',
        '</li>',
        '<li class="' + (state.tab === 'board' ? 'selected' : '') + '">',
        '  <a href="/subject/' + sid + '/board" class="' + (state.tab === 'board' ? 'selected' : '') + '" data-act="switch-tab" data-tab="board">',
        '    <span>💬 讨论版 (Board)</span><span class="brv-tab-badge">' + brdCount + '</span>',
        '  </a>',
        '</li>'
      ].join('');
    }

    // Filter bar
    var filterBar = $('brvFilterBar');
    if (!filterBar) return;

    if (state.tab === 'reviews') {
      var highCnt = bundle.reviews.filter(function (r) { return r.star >= 9; }).length;
      var goodCnt = bundle.reviews.filter(function (r) { return r.star >= 7 && r.star <= 8; }).length;
      var midCnt = bundle.reviews.filter(function (r) { return r.star <= 6; }).length;
      filterBar.innerHTML = [
        '<div class="brv-filter-pills">',
        '  <button type="button" class="brv-pill-btn ' + (state.reviewFilter === 'all' ? 'active' : '') + '" data-act="filter-review" data-filter="all">全部 (' + revCount + ')</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.reviewFilter === 'high' ? 'active' : '') + '" data-act="filter-review" data-filter="high">⭐ 9-10 神作/力荐 (' + highCnt + ')</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.reviewFilter === 'good' ? 'active' : '') + '" data-act="filter-review" data-filter="good">👍 7-8 推荐 (' + goodCnt + ')</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.reviewFilter === 'mid' ? 'active' : '') + '" data-act="filter-review" data-filter="mid">⚖️ 1-6 中评/争议 (' + midCnt + ')</button>',
        '</div>',
        '<div class="brv-filter-right">',
        '  <div class="brv-search-box">',
        '    <span class="brv-search-icon">🔍</span>',
        '    <input type="text" id="brvSearchInput" class="brv-search-input" placeholder="搜索长评标题 / 作者 / 摘要..." value="' + esc(state.searchQuery) + '" />',
        '  </div>',
        '  <select id="brvSortSelect" class="brv-sort-select" aria-label="长评排序方式">',
        '    <option value="helpful"' + (state.reviewSort === 'helpful' ? ' selected' : '') + '>按有用数排序</option>',
        '    <option value="latest"' + (state.reviewSort === 'latest' ? ' selected' : '') + '>按最新发布排序</option>',
        '    <option value="replies"' + (state.reviewSort === 'replies' ? ' selected' : '') + '>按回复数排序</option>',
        '    <option value="star"' + (state.reviewSort === 'star' ? ' selected' : '') + '>按十星评分排序</option>',
        '  </select>',
        '</div>'
      ].join('');
    } else {
      var hotCnt = bundle.topics.filter(function (t) { return (t.replies || 0) >= 20; }).length;
      filterBar.innerHTML = [
        '<div class="brv-filter-pills">',
        '  <button type="button" class="brv-pill-btn ' + (state.boardFilter === 'all' ? 'active' : '') + '" data-act="filter-board" data-filter="all">全部话题 (' + brdCount + ')</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.boardFilter === 'hot' ? 'active' : '') + '" data-act="filter-board" data-filter="hot">🔥 热门讨论 (' + hotCnt + ')</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.boardFilter === 'plot' ? 'active' : '') + '" data-act="filter-board" data-filter="plot">📌 剧情考据</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.boardFilter === 'staff' ? 'active' : '') + '" data-act="filter-board" data-filter="staff">🎬 制作演出</button>',
        '  <button type="button" class="brv-pill-btn ' + (state.boardFilter === 'chat' ? 'active' : '') + '" data-act="filter-board" data-filter="chat">💭 综合讨论</button>',
        '</div>',
        '<div class="brv-filter-right">',
        '  <div class="brv-search-box">',
        '    <span class="brv-search-icon">🔍</span>',
        '    <input type="text" id="brvSearchInput" class="brv-search-input" placeholder="搜索讨论主题 / 发起人..." value="' + esc(state.searchQuery) + '" />',
        '  </div>',
        '  <select id="brvSortSelect" class="brv-sort-select" aria-label="话题排序方式">',
        '    <option value="latest"' + (state.boardSort === 'latest' ? ' selected' : '') + '>按最后发表排序</option>',
        '    <option value="replies"' + (state.boardSort === 'replies' ? ' selected' : '') + '>按回复热度排序</option>',
        '    <option value="views"' + (state.boardSort === 'views' ? ' selected' : '') + '>按浏览量排序</option>',
        '  </select>',
        '</div>'
      ].join('');
    }

    var searchInp = $('brvSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', function (e) {
        state.searchQuery = e.target.value || '';
        state.page = 1;
        renderMainContent(bundle);
      });
    }
    var sortSel = $('brvSortSelect');
    if (sortSel) {
      sortSel.addEventListener('change', function (e) {
        if (state.tab === 'reviews') {
          state.reviewSort = e.target.value;
        } else {
          state.boardSort = e.target.value;
        }
        state.page = 1;
        renderMainContent(bundle);
      });
    }
  }

  function renderReviewItemHtml(r) {
    var star = Math.max(1, Math.min(10, Math.round(Number(r.star) || 9)));
    var starChars = tenStarString(star);
    var starWord = STAR_WORDS[star] || '推荐';
    var isExpanded = !!state.expandedReviews[r.id];
    var isVoted = !!state.votedHelpful[r.id];
    var tagsHtml = (r.tags || []).map(function (t) {
      return '<span class="brv-tag-chip">#' + esc(t) + '</span>';
    }).join('');
    var fullParasHtml = (r.paragraphs || [r.summary]).map(function (p) {
      return '<p>' + formatSpoilers(p) + '</p>';
    }).join('');

    return [
      '<div class="item clearit' + (isExpanded ? ' is-expanded' : '') + (r.isCustom ? ' is-mine' : '') + '" data-item-user="' + esc(r.uid) + '" data-review-id="' + esc(r.id) + '" id="review_item_' + esc(r.id) + '">',
      '  <p class="cover">',
      '    <a href="user.html?uid=' + esc(r.uid) + '" title="' + esc(r.user) + '" class="avatar">',
      '      <img src="' + esc(r.avatar) + '" alt="' + esc(r.user) + '" class="avatarCover avatarSize48" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
      '    </a>',
      '    <span class="brv-author-badge">' + (r.isCustom ? '我的长评' : '专栏作者') + '</span>',
      '  </p>',
      '  <div class="entry">',
      '    <div class="brv-entry-header">',
      '      <h2 class="title"><a href="/blog/' + esc(r.id) + '" class="l" data-act="open-review-drawer" data-id="' + esc(r.id) + '">' + esc(r.title) + '</a></h2>',
      '      <div class="brv-rating-pill" title="传统十星评分：' + star + ' / 10">',
      '        <span class="starstop-s"><span class="starlight stars' + star + '"></span></span>',
      '        <span class="brv-star-chars">' + starChars + '</span>',
      '        <span class="brv-star-num">' + star + '/10</span>',
      '        <span class="brv-star-word">' + esc(starWord) + '</span>',
      '      </div>',
      '    </div>',
      '    <div class="brv-entry-tags">' + tagsHtml + '</div>',
      '    <div class="content">',
      '      <div class="brv-excerpt-wrap">',
      '        <a href="/blog/' + esc(r.id) + '" class="brv-excerpt-link" data-act="open-review-drawer" data-id="' + esc(r.id) + '">' + esc(r.summary) + '</a>',
      '      </div>',
      '      <div class="brv-full-article">' + fullParasHtml + '</div>',
      '    </div>',
      '    <div class="tools">',
      '      <div class="time">',
      '        <a href="user.html?uid=' + esc(r.uid) + '" class="l">' + esc(r.user) + '</a>',
      '        <span>·</span>',
      '        <small class="time">' + esc(r.time) + '</small>',
      '        <span>·</span>',
      '        <a href="/blog/' + esc(r.id) + '#comments" class="l" data-act="open-review-drawer" data-id="' + esc(r.id) + '"><span class="orange brv-reply-count-badge">+' + (r.replies || 0) + ' 回复</span></a>',
      '      </div>',
      '      <div class="brv-entry-actions">',
      '        <button type="button" class="brv-helpful-btn' + (isVoted ? ' is-voted' : '') + '" data-act="toggle-helpful" data-id="' + esc(r.id) + '">👍 有用 (' + (r.helpful || 0) + ')</button>',
      '        <button type="button" class="brv-action-btn" data-act="toggle-expand" data-id="' + esc(r.id) + '">' + (isExpanded ? '▴ 收起全文' : '📖 展开全文 ▾') + '</button>',
      '        <button type="button" class="brv-action-btn" data-act="open-review-drawer" data-id="' + esc(r.id) + '">💬 沉浸阅读 (' + (r.replies || 0) + ')</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function renderTopicRowHtml(tp, idx) {
    var rowCls = (idx % 2 === 0) ? 'odd' : 'even';
    var catKey = tp.category || 'chat';
    var catLabel = TOPIC_CAT_LABELS[catKey] || '综合讨论';
    var isHot = (tp.replies || 0) >= 30;
    return [
      '<tr class="' + rowCls + '" data-item-user="' + esc(tp.uid) + '" data-topic-id="' + esc(tp.id) + '" data-act="open-topic-drawer" data-id="' + esc(tp.id) + '">',
      '  <td class="subject">',
      '    <div class="brv-topic-subject-wrap">',
      (tp.pinned ? '      <span class="brv-topic-pin">置顶</span>' : ''),
      '      <span class="brv-topic-cat cat-' + esc(catKey) + '">' + esc(catLabel) + '</span>',
      '      <a href="/subject/topic/' + esc(tp.id) + '" title="' + esc(tp.title) + '" class="l" data-act="open-topic-drawer" data-id="' + esc(tp.id) + '">' + esc(tp.title) + '</a>',
      (isHot ? '      <span class="brv-topic-hot">🔥 热议</span>' : ''),
      '    </div>',
      '  </td>',
      '  <td class="' + rowCls + '" width="18%">',
      '    <div class="brv-topic-user-cell">',
      '      <img src="' + esc(tp.avatar) + '" alt="' + esc(tp.user) + '" class="brv-topic-avatar" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
      '      <a href="user.html?uid=' + esc(tp.uid) + '" onclick="event.stopPropagation();">' + esc(tp.user) + '</a>',
      '    </div>',
      '  </td>',
      '  <td class="' + rowCls + '" width="14%" align="right">',
      '    <small class="grey brv-replies-pill' + (isHot ? ' is-hot' : '') + '">' + (tp.replies || 0) + ' replies</small>',
      '  </td>',
      '  <td class="' + rowCls + '" width="15%" align="right">',
      '    <small class="grey">' + esc(tp.time) + '</small>',
      '  </td>',
      '</tr>'
    ].join('\n');
  }

  function renderPagination(totalItems, perPage) {
    var pager = $('brvPageInner');
    if (!pager) return;
    var totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (state.page > totalPages) state.page = totalPages;

    var html = [];
    if (state.page > 1) {
      html.push('<a href="?page=' + (state.page - 1) + '" class="p" data-act="goto-page" data-page="' + (state.page - 1) + '">&lsaquo;&lsaquo; 上一页</a>');
    }
    for (var p = 1; p <= totalPages; p++) {
      if (p === state.page) {
        html.push('<strong class="p_cur">' + p + '</strong>');
      } else {
        html.push('<a href="?page=' + p + '" class="p" data-act="goto-page" data-page="' + p + '">' + p + '</a>');
      }
    }
    if (state.page < totalPages) {
      html.push('<a href="?page=' + (state.page + 1) + '" class="p" data-act="goto-page" data-page="' + (state.page + 1) + '">下一页 &rsaquo;&rsaquo;</a>');
    }
    html.push('<span class="p_edge">( 第 ' + state.page + ' / ' + totalPages + ' 页 · 共 ' + totalItems + ' 条 )</span>');
    pager.innerHTML = html.join('');
  }

  function renderMainContent(bundle) {
    var entryList = $('entry_list');
    var boardWrap = $('brvBoardWrap');
    var topicTbody = $('brvTopicTbody');
    if (!entryList || !boardWrap) return;

    if (state.tab === 'reviews') {
      entryList.style.display = 'flex';
      boardWrap.style.display = 'none';
      var filtered = getFilteredReviews(bundle);
      var totalPages = Math.max(1, Math.ceil(filtered.length / REVIEWS_PER_PAGE));
      if (state.page > totalPages) state.page = totalPages;
      var start = (state.page - 1) * REVIEWS_PER_PAGE;
      var slice = filtered.slice(start, start + REVIEWS_PER_PAGE);

      if (slice.length === 0) {
        entryList.innerHTML = '<div class="brv-empty-state">没有找到符合当前筛选条件的长评，试试切换筛选标签或点击右上角「我来评论这部作品」撰写首篇长评吧！</div>';
      } else {
        entryList.innerHTML = slice.map(renderReviewItemHtml).join('\n');
      }
      renderPagination(filtered.length, REVIEWS_PER_PAGE);
    } else {
      entryList.style.display = 'none';
      boardWrap.style.display = 'block';
      var filteredTopics = getFilteredTopics(bundle);
      var totalTPages = Math.max(1, Math.ceil(filteredTopics.length / TOPICS_PER_PAGE));
      if (state.page > totalTPages) state.page = totalTPages;
      var tStart = (state.page - 1) * TOPICS_PER_PAGE;
      var tSlice = filteredTopics.slice(tStart, tStart + TOPICS_PER_PAGE);

      if (topicTbody) {
        if (tSlice.length === 0) {
          topicTbody.innerHTML = '<tr class="odd"><td colspan="4" class="subject" style="text-align:center;padding:36px;">暂无符合条件的话题，点击右上角「添加新讨论」发起第一个话题吧！</td></tr>';
        } else {
          topicTbody.innerHTML = tSlice.map(renderTopicRowHtml).join('\n');
        }
      }
      renderPagination(filteredTopics.length, TOPICS_PER_PAGE);
    }
  }

  function renderSidebar(bundle) {
    var subj = bundle.subject;
    var sid = String(subj.id);

    var infoBox = $('subject_inner_info');
    if (infoBox) {
      infoBox.innerHTML = [
        '<a href="subject.html?id=' + sid + '" title="' + esc(subj.name_cn) + '" class="avatar">',
        '  <img src="' + esc(subj.cover) + '" class="avatar ll" width="56" alt="' + esc(subj.name_cn) + '" referrerpolicy="no-referrer" />',
        '</a>',
        '<div class="inner">',
        '  <ul>',
        '    <li><a href="subject.html?id=' + sid + '" class="brv-side-subj-title">' + esc(subj.name_cn) + '</a></li>',
        '    <li class="brv-side-subj-sub">' + esc(subj.name) + '</li>',
        '    <li><a href="subject.html?id=' + sid + '" class="l brv-side-back-link">← 返回条目概览</a></li>',
        '  </ul>',
        '</div>'
      ].join('');
    }

    var statsCard = $('brvSideStats');
    if (statsCard) {
      var totalHelpful = bundle.reviews.reduce(function (s, r) { return s + (r.helpful || 0); }, 0);
      var totalReplies = bundle.topics.reduce(function (s, t) { return s + (t.replies || 0); }, 0);
      var avgStar = bundle.reviews.length
        ? (bundle.reviews.reduce(function (s, r) { return s + (r.star || 8); }, 0) / bundle.reviews.length).toFixed(1)
        : '9.0';
      statsCard.innerHTML = [
        '<h3 class="brv-side-section-title"><span>📊 评论与讨论热度</span><span style="font-size:11px;color:var(--muted);">实时汇总</span></h3>',
        '<div class="brv-stat-grid">',
        '  <div class="brv-stat-box">',
        '    <div class="brv-stat-val">' + bundle.reviews.length + ' 篇</div>',
        '    <div class="brv-stat-lbl">深度长评总数</div>',
        '  </div>',
        '  <div class="brv-stat-box">',
        '    <div class="brv-stat-val" style="color:#d97706;">★ ' + avgStar + '</div>',
        '    <div class="brv-stat-lbl">长评十星均分</div>',
        '  </div>',
        '  <div class="brv-stat-box">',
        '    <div class="brv-stat-val">' + bundle.topics.length + ' 帖</div>',
        '    <div class="brv-stat-lbl">讨论版主题数</div>',
        '  </div>',
        '  <div class="brv-stat-box">',
        '    <div class="brv-stat-val">' + (totalHelpful + totalReplies) + '</div>',
        '    <div class="brv-stat-lbl">累计互动与赞同</div>',
        '  </div>',
        '</div>'
      ].join('');
    }

    var hotRevCard = $('brvSideHotReviews');
    if (hotRevCard) {
      var topRevs = bundle.reviews.slice().sort(function (a, b) { return (b.helpful || 0) - (a.helpful || 0); }).slice(0, 3);
      hotRevCard.innerHTML = [
        '<h3 class="brv-side-section-title"><span>🏆 高赞深度长评</span><a href="javascript:void(0)" data-act="switch-tab" data-tab="reviews" style="font-size:11.5px;color:var(--accent);text-decoration:none;">查看全部 »</a></h3>',
        '<ul class="brv-hot-list">',
        topRevs.map(function (r, idx) {
          return [
            '<li class="brv-hot-item" data-act="open-review-drawer" data-id="' + esc(r.id) + '">',
            '  <span class="brv-hot-rank">' + (idx + 1) + '</span>',
            '  <div class="brv-hot-info">',
            '    <div class="brv-hot-title">' + esc(r.title) + '</div>',
            '    <div class="brv-hot-meta">' + esc(r.user) + ' · ★ ' + r.star + '/10 · 👍 ' + (r.helpful || 0) + '</div>',
            '  </div>',
            '</li>'
          ].join('');
        }).join(''),
        '</ul>'
      ].join('');
    }

    var hotTopicCard = $('brvSideHotTopics');
    if (hotTopicCard) {
      var topTopics = bundle.topics.slice().sort(function (a, b) { return (b.replies || 0) - (a.replies || 0); }).slice(0, 4);
      hotTopicCard.innerHTML = [
        '<h3 class="brv-side-section-title"><span>🔥 讨论版热议话题</span><a href="javascript:void(0)" data-act="switch-tab" data-tab="board" style="font-size:11.5px;color:var(--accent);text-decoration:none;">进入讨论版 »</a></h3>',
        '<ul class="brv-hot-list">',
        topTopics.map(function (t, idx) {
          return [
            '<li class="brv-hot-item" data-act="open-topic-drawer" data-id="' + esc(t.id) + '">',
            '  <span class="brv-hot-rank">' + (idx + 1) + '</span>',
            '  <div class="brv-hot-info">',
            '    <div class="brv-hot-title">' + esc(t.title) + '</div>',
            '    <div class="brv-hot-meta">' + esc(t.user) + ' · 💬 ' + (t.replies || 0) + ' replies</div>',
            '  </div>',
            '</li>'
          ].join('');
        }).join(''),
        '</ul>'
      ].join('');
    }
  }

  function openReviewDrawer(reviewId) {
    var bundle = getSubjectBundle(state.subjectId);
    if (!bundle) return;
    var r = bundle.reviews.find(function (x) { return String(x.id) === String(reviewId); });
    if (!r) return;
    state.activeReviewId = r.id;

    var drawer = $('reviewReaderDrawer');
    var body = $('reviewDrawerBody');
    if (!drawer || !body) return;

    var star = Math.max(1, Math.min(10, Math.round(Number(r.star) || 9)));
    var parasHtml = (r.paragraphs || [r.summary]).map(function (p) {
      return '<p>' + formatSpoilers(p) + '</p>';
    }).join('');
    var comments = r.comments || [];
    var commentsHtml = comments.map(function (c, i) {
      return [
        '<div class="brv-reply-item">',
        '  <img src="' + esc(c.avatar) + '" alt="' + esc(c.user) + '" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
        '  <div style="flex:1;min-width:0;">',
        '    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);">',
        '      <strong style="color:var(--ink);">' + esc(c.user) + '</strong>',
        '      <span>#' + (i + 1) + ' · ' + esc(c.time) + '</span>',
        '    </div>',
        '    <div style="margin-top:4px;font-size:13.5px;line-height:1.6;">' + esc(c.text) + '</div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    body.innerHTML = [
      '<div>',
      '  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">',
      '    <img src="' + esc(r.avatar) + '" alt="' + esc(r.user) + '" style="width:44px;height:44px;border-radius:12px;object-fit:cover;" referrerpolicy="no-referrer" />',
      '    <div>',
      '      <div style="font-weight:800;font-size:14px;">' + esc(r.user) + ' <span style="font-weight:400;color:var(--muted);font-size:12px;">评《' + esc(bundle.subject.name_cn) + '》</span></div>',
      '      <div style="font-size:12px;color:#d97706;font-weight:700;">' + tenStarString(star) + ' ' + star + '/10 (' + esc(STAR_WORDS[star] || '推荐') + ') · ' + esc(r.time) + '</div>',
      '    </div>',
      '  </div>',
      '  <h2 style="margin:0 0 14px 0;font-family:var(--serif);font-size:20px;line-height:1.4;">' + esc(r.title) + '</h2>',
      '  <div class="brv-drawer-article">' + parasHtml + '</div>',
      '  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--hairline);border-bottom:1px solid var(--hairline);margin-top:16px;">',
      '    <button type="button" class="brv-helpful-btn' + (state.votedHelpful[r.id] ? ' is-voted' : '') + '" data-act="toggle-helpful" data-id="' + esc(r.id) + '">👍 这篇长评很有用 (' + (r.helpful || 0) + ')</button>',
      '    <div style="display:flex;align-items:center;gap:10px;">',
      '      <a href="blog.html?id=' + encodeURIComponent(r.id) + '" class="brv-action-btn" style="text-decoration:none;">✒️ 在日志详情页阅读 →</a>',
      '      <span style="font-size:12px;color:var(--muted);">Blog ID #' + esc(r.id) + '</span>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div>',
      '  <h4 style="margin:0 0 12px 0;font-size:14px;">💬 读者回复 (' + comments.length + ')</h4>',
      '  <div class="brv-reply-list" id="reviewDrawerReplyList">' + commentsHtml + '</div>',
      '  <div class="brv-reply-box">',
      '    <input type="text" id="reviewReplyInput" class="brv-reply-input" placeholder="写下你对这篇长评的看法..." />',
      '    <button type="button" class="brv-chii-btn" data-act="submit-review-reply" data-id="' + esc(r.id) + '">发送回复</button>',
      '  </div>',
      '</div>'
    ].join('');

    drawer.classList.add('is-open');
  }

  function openTopicDrawer(topicId) {
    var bundle = getSubjectBundle(state.subjectId);
    if (!bundle) return;
    var tp = bundle.topics.find(function (x) { return String(x.id) === String(topicId); });
    if (!tp) return;
    state.activeTopicId = tp.id;

    var drawer = $('topicReaderDrawer');
    var body = $('topicDrawerBody');
    if (!drawer || !body) return;

    var posts = tp.posts || [];
    var postsHtml = posts.map(function (p, idx) {
      return [
        '<div class="brv-reply-item">',
        '  <img src="' + esc(p.avatar) + '" alt="' + esc(p.user) + '" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
        '  <div style="flex:1;min-width:0;">',
        '    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);">',
        '      <strong style="color:var(--ink);">' + esc(p.user) + '</strong>',
        '      <span>#' + (p.floor || idx + 2) + ' · ' + esc(p.time) + '</span>',
        '    </div>',
        '    <div style="margin-top:4px;font-size:13.5px;line-height:1.65;">' + formatSpoilers(p.text) + '</div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    body.innerHTML = [
      '<div style="padding:16px;border-radius:14px;background:rgba(225,29,72,0.05);border:1px solid rgba(225,29,72,0.16);">',
      '  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">',
      '    <div style="display:flex;align-items:center;gap:10px;">',
      '      <img src="' + esc(tp.avatar) + '" alt="' + esc(tp.user) + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" referrerpolicy="no-referrer" />',
      '      <div>',
      '        <div style="font-weight:800;font-size:13.5px;">' + esc(tp.user) + ' <span class="brv-topic-cat cat-' + esc(tp.category || 'chat') + '">' + esc(TOPIC_CAT_LABELS[tp.category || 'chat'] || '讨论') + '</span></div>',
      '        <div style="font-size:11.5px;color:var(--muted);">楼主 #1 · 发布于 ' + esc(tp.time) + ' · 浏览 ' + (tp.views || 260) + '</div>',
      '      </div>',
      '    </div>',
      '    <a href="group.html?view=topic" class="brv-action-btn" style="text-decoration:none;">🔗 社区话题页 »</a>',
      '  </div>',
      '  <h2 style="margin:0 0 10px 0;font-size:18px;line-height:1.4;">' + esc(tp.title) + '</h2>',
      '  <p style="margin:0;font-size:14px;line-height:1.75;">' + formatSpoilers(tp.content || tp.title) + '</p>',
      '</div>',
      '<div>',
      '  <h4 style="margin:0 0 12px 0;font-size:14px;">💬 讨论楼层 (共 ' + (tp.replies || posts.length) + ' 条回复)</h4>',
      '  <div class="brv-reply-list" id="topicDrawerPostList">' + postsHtml + '</div>',
      '  <div class="brv-reply-box">',
      '    <input type="text" id="topicReplyInput" class="brv-reply-input" placeholder="参与本帖讨论（支持 [mask]剧透[/mask]）..." />',
      '    <button type="button" class="brv-chii-btn" data-act="submit-topic-reply" data-id="' + esc(tp.id) + '">发表回帖</button>',
      '  </div>',
      '</div>'
    ].join('');

    drawer.classList.add('is-open');
  }

  function renderAll() {
    var bundle = getSubjectBundle(state.subjectId);
    if (!bundle) return;
    syncTopBannerAndNav(bundle);
    renderHeaderAndFilterBar(bundle);
    renderMainContent(bundle);
    renderSidebar(bundle);
    syncUrlParams();
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-act], [data-subject-id]');
      if (!target) return;

      // 1. Switch Subject Preset
      if (target.hasAttribute('data-subject-id')) {
        e.preventDefault();
        var newSid = target.getAttribute('data-subject-id');
        if (newSid && window.REVIEW_BOARD_DATA && window.REVIEW_BOARD_DATA[newSid]) {
          state.subjectId = newSid;
          state.page = 1;
          state.searchQuery = '';
          renderAll();
          showToast('已切换至《' + window.REVIEW_BOARD_DATA[newSid].subject.name_cn + '》');
        }
        return;
      }

      var act = target.getAttribute('data-act');

      // 2. Switch Tab (reviews <-> board)
      if (act === 'switch-tab') {
        e.preventDefault();
        var nextTab = target.getAttribute('data-tab') || 'reviews';
        state.tab = nextTab;
        state.page = 1;
        state.searchQuery = '';
        renderAll();
        return;
      }

      // 3. Filter reviews
      if (act === 'filter-review') {
        e.preventDefault();
        state.reviewFilter = target.getAttribute('data-filter') || 'all';
        state.page = 1;
        renderAll();
        return;
      }

      // 4. Filter board
      if (act === 'filter-board') {
        e.preventDefault();
        state.boardFilter = target.getAttribute('data-filter') || 'all';
        state.page = 1;
        renderAll();
        return;
      }

      // 5. Toggle expand review full text
      if (act === 'toggle-expand') {
        e.preventDefault();
        var rid = target.getAttribute('data-id');
        state.expandedReviews[rid] = !state.expandedReviews[rid];
        renderMainContent(getSubjectBundle(state.subjectId));
        return;
      }

      // 6. Toggle helpful vote
      if (act === 'toggle-helpful') {
        e.preventDefault();
        e.stopPropagation();
        var hId = target.getAttribute('data-id');
        var bundle = getSubjectBundle(state.subjectId);
        var rev = bundle.reviews.find(function (x) { return String(x.id) === String(hId); });
        if (rev) {
          if (state.votedHelpful[hId]) {
            rev.helpful = Math.max(0, (rev.helpful || 1) - 1);
            delete state.votedHelpful[hId];
            showToast('已取消「有用」支持');
          } else {
            rev.helpful = (rev.helpful || 0) + 1;
            state.votedHelpful[hId] = true;
            showToast('👍 感谢认可！已为该篇长评 +1 有用');
          }
          persistCurrentSubject();
          renderMainContent(bundle);
          renderSidebar(bundle);
          if (String(state.activeReviewId) === String(hId) && $('reviewReaderDrawer').classList.contains('is-open')) {
            openReviewDrawer(hId);
          }
        }
        return;
      }

      // 7. Toggle spoiler mask
      if (act === 'toggle-spoiler') {
        e.preventDefault();
        e.stopPropagation();
        target.classList.toggle('is-revealed');
        return;
      }

      // 8. Pagination
      if (act === 'goto-page') {
        e.preventDefault();
        var nextP = parseInt(target.getAttribute('data-page') || '1', 10);
        if (nextP > 0) {
          state.page = nextP;
          renderMainContent(getSubjectBundle(state.subjectId));
          syncUrlParams();
          window.scrollTo({ top: 220, behavior: 'smooth' });
        }
        return;
      }

      // 9. Open Review Drawer
      if (act === 'open-review-drawer') {
        e.preventDefault();
        openReviewDrawer(target.getAttribute('data-id'));
        return;
      }

      // 10. Open Topic Drawer
      if (act === 'open-topic-drawer') {
        e.preventDefault();
        openTopicDrawer(target.getAttribute('data-id'));
        return;
      }

      // 11. Close Drawers & Modals
      if (act === 'close-drawer') {
        e.preventDefault();
        $('reviewReaderDrawer').classList.remove('is-open');
        $('topicReaderDrawer').classList.remove('is-open');
        return;
      }
      if (act === 'close-modal') {
        e.preventDefault();
        $('writeReviewModal').classList.remove('is-open');
        $('newTopicModal').classList.remove('is-open');
        return;
      }

      // 12. Open Write Review Modal (a.chiiBtn[href="/blog/create?review={id}"])
      if (act === 'open-write-review') {
        e.preventDefault();
        var wModal = $('writeReviewModal');
        if (wModal) wModal.classList.add('is-open');
        return;
      }

      // 13. Open New Topic Modal (a.chiiBtn[href="/subject/{id}/board/new"])
      if (act === 'open-new-topic') {
        e.preventDefault();
        var tModal = $('newTopicModal');
        if (tModal) tModal.classList.add('is-open');
        return;
      }

      // 14. Submit reply in Review Drawer
      if (act === 'submit-review-reply') {
        e.preventDefault();
        var inp = $('reviewReplyInput');
        var txt = inp ? inp.value.trim() : '';
        if (!txt) {
          showToast('请输入回复内容');
          return;
        }
        var bdl = getSubjectBundle(state.subjectId);
        var rv = bdl.reviews.find(function (x) { return String(x.id) === String(target.getAttribute('data-id')); });
        if (rv) {
          rv.comments = rv.comments || [];
          rv.comments.push({
            id: Date.now(),
            user: '时光机旅人 (我)',
            avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg',
            time: '刚刚',
            text: txt
          });
          rv.replies = (rv.replies || 0) + 1;
          persistCurrentSubject();
          openReviewDrawer(rv.id);
          renderMainContent(bdl);
          showToast('✓ 已发布长评回复！');
        }
        return;
      }

      // 15. Submit reply in Topic Drawer
      if (act === 'submit-topic-reply') {
        e.preventDefault();
        var tInp = $('topicReplyInput');
        var tTxt = tInp ? tInp.value.trim() : '';
        if (!tTxt) {
          showToast('请输入回帖内容');
          return;
        }
        var bdl2 = getSubjectBundle(state.subjectId);
        var tp = bdl2.topics.find(function (x) { return String(x.id) === String(target.getAttribute('data-id')); });
        if (tp) {
          tp.posts = tp.posts || [];
          tp.posts.push({
            floor: tp.posts.length + 2,
            user: '时光机旅人 (我)',
            avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg',
            time: '2026-11-12 刚刚',
            text: tTxt
          });
          tp.replies = (tp.replies || 0) + 1;
          tp.time = '2026-11-12';
          persistCurrentSubject();
          openTopicDrawer(tp.id);
          renderMainContent(bdl2);
          renderSidebar(bdl2);
          showToast('✓ 已成功发表讨论回帖！');
        }
        return;
      }

      // 16. Insert [mask] spoiler in write review modal
      if (act === 'insert-spoiler-tag') {
        e.preventDefault();
        var area = $('writeReviewBodyInput');
        if (area) {
          area.value += '[mask]在此输入剧透内容[/mask]';
          area.focus();
        }
        return;
      }

      // 17. Publish new review
      if (act === 'submit-new-review') {
        e.preventDefault();
        var titleEl = $('writeReviewTitleInput');
        var bodyEl = $('writeReviewBodyInput');
        var starEl = $('writeReviewStarSelect');
        var tagEl = $('writeReviewTagSelect');
        var rTitle = titleEl ? titleEl.value.trim() : '';
        var rBody = bodyEl ? bodyEl.value.trim() : '';
        if (!rTitle || rBody.length < 10) {
          showToast('请填写长评标题与不少于 10 字的正文内容');
          return;
        }
        var starVal = starEl ? parseInt(starEl.value, 10) : 9;
        var tagVal = tagEl ? tagEl.value : '深度书评/漫评';
        var bdl3 = getSubjectBundle(state.subjectId);
        var paras = rBody.split(/\n+/).filter(Boolean);
        var newRev = {
          id: Math.floor(390000 + Math.random() * 9000),
          uid: 'me',
          user: '时光机旅人 (我)',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg',
          title: rTitle,
          star: starVal,
          time: '2026-11-12 刚刚',
          replies: 0,
          helpful: 1,
          tags: [tagVal, '原创长评'],
          spoiler: rBody.indexOf('[mask]') !== -1,
          summary: rBody.replace(/\[\/?mask\]/g, '').slice(0, 180) + (rBody.length > 180 ? '……' : ''),
          paragraphs: paras.length ? paras : [rBody],
          comments: [],
          isCustom: true
        };
        bdl3.reviews.unshift(newRev);
        state.tab = 'reviews';
        state.reviewFilter = 'all';
        state.page = 1;
        state.expandedReviews[newRev.id] = true;
        persistCurrentSubject();
        $('writeReviewModal').classList.remove('is-open');
        if (titleEl) titleEl.value = '';
        if (bodyEl) bodyEl.value = '';
        renderAll();
        showToast('🎉 长评已成功发布并排在列表首位！');
        return;
      }

      // 18. Publish new board topic
      if (act === 'submit-new-topic') {
        e.preventDefault();
        var tTitleEl = $('newTopicTitleInput');
        var tBodyEl = $('newTopicBodyInput');
        var tCatEl = $('newTopicCatSelect');
        var tTitle = tTitleEl ? tTitleEl.value.trim() : '';
        var tBody = tBodyEl ? tBodyEl.value.trim() : '';
        if (!tTitle) {
          showToast('请输入讨论主题标题');
          return;
        }
        var bdl4 = getSubjectBundle(state.subjectId);
        var newTp = {
          id: Math.floor(40000 + Math.random() * 9000),
          uid: 'me',
          user: '时光机旅人 (我)',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg',
          title: tTitle,
          category: tCatEl ? tCatEl.value : 'chat',
          replies: 1,
          views: 1,
          time: '2026-11-12',
          lastReplyUser: '时光机旅人 (我)',
          pinned: false,
          content: tBody || tTitle,
          posts: [],
          isCustom: true
        };
        bdl4.topics.unshift(newTp);
        state.tab = 'board';
        state.boardFilter = 'all';
        state.page = 1;
        persistCurrentSubject();
        $('newTopicModal').classList.remove('is-open');
        if (tTitleEl) tTitleEl.value = '';
        if (tBodyEl) tBodyEl.value = '';
        renderAll();
        showToast('🎉 新讨论话题已发布！');
        return;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    parseUrlParams();
    bindEvents();
    renderAll();
  });
})();
