(function () {
  'use strict';

  var DATA = window.BANGUMI_BLOG_DATA || {
    meta: {},
    featuredIds: [],
    channelIds: { all: [], anime: [], book: [], music: [], game: [], real: [] },
    userBlogs: { '553488': [], sai: [] },
    blogs: {},
    details: {},
    subjects: []
  };

  var LS_CUSTOM = 'bgm_blog_custom_v1';
  var LS_DELETED = 'bgm_blog_deleted_v1';
  var LS_REPLIES = 'bgm_blog_replies_v1';
  var LS_SUBREPLIES = 'bgm_blog_subreplies_v1';
  var LS_LIKES = 'bgm_blog_likes_v1';
  var LS_INDEXES = 'bgm_blog_indexes_v1';
  var PAGE_SIZE = 15;

  var EMOJIS = [
    { val: '40', label: '👍' },
    { val: '83', label: '❤️' },
    { val: '54', label: '😂' },
    { val: '91', label: '😮' },
    { val: '62', label: '🎉' },
    { val: '75', label: '😭' },
    { val: '44', label: '🤔' },
    { val: '104', label: '🌟' }
  ];

  var CAT_LABELS = {
    all: '全部日志',
    anime: '动画日志',
    book: '书籍日志',
    music: '音乐日志',
    game: '游戏日志',
    real: '三次元日志'
  };

  var state = {
    mode: 'plaza', // 'plaza' | 'detail' | 'create' | 'edit'
    id: '',
    reviewSid: '',
    cat: 'all',
    tag: '',
    uid: '',
    q: '',
    sort: 'latest',
    page: 1,
    replySort: 'asc',
    openLikePickerKey: '',
    openSubReplyId: '',
    openMoreMenuId: '',
    createPreview: false,
    draftSubjects: [],
    draftScore: 0,
    subjectQuery: ''
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
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
      '<span class="bgl-stars-line" title="Bangumi 十星制评分 ' + esc(num.toFixed(1)) + ' / 10">' +
        '<span class="bgl-stars-glyph">' + stars + '</span>' +
        '<span class="bgl-stars-num">' + esc(num.toFixed(1)) + '</span>' +
      '</span>'
    );
  }

  function bbcodeToHtml(raw) {
    var safe = esc(raw || '');
    safe = safe.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
    safe = safe.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
    safe = safe.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
    safe = safe.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<del>$1</del>');
    safe = safe.replace(/\[mask\]([\s\S]*?)\[\/mask\]/gi, '<span class="bgm_spoiler" title="悬停查看剧透">$1</span>');
    safe = safe.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>');
    safe = safe.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>');
    safe = safe.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, function (_, url, text) {
      var u = url.replace(/&amp;/g, '&');
      if (/^javascript:/i.test(u)) return text;
      return '<a class="l" href="' + esc(u) + '" target="_blank" rel="noopener">' + text + '</a>';
    });
    safe = safe.replace(/\[img\]([^\[]+)\[\/img\]/gi, function (_, url) {
      var u = url.replace(/&amp;/g, '&').trim();
      if (/^javascript:/i.test(u)) return '';
      return '<img src="' + esc(u) + '" referrerpolicy="no-referrer" loading="lazy" alt="插图" />';
    });
    safe = safe.replace(/\r?\n/g, '<br />');
    return safe;
  }

  function getCustomBlogsMap() {
    return readJson(LS_CUSTOM, {});
  }

  function getDeletedMap() {
    return readJson(LS_DELETED, {});
  }

  function getAllBlogItems() {
    var custom = getCustomBlogsMap();
    var deleted = getDeletedMap();
    var merged = {};
    Object.keys(DATA.blogs || {}).forEach(function (bid) {
      if (!deleted[bid]) merged[bid] = DATA.blogs[bid];
    });
    Object.keys(custom).forEach(function (bid) {
      if (!deleted[bid]) merged[bid] = custom[bid].summary;
    });
    return merged;
  }

  function getBlogDetail(bid) {
    var deleted = getDeletedMap();
    if (deleted[bid]) return null;
    var custom = getCustomBlogsMap();
    if (custom[bid] && custom[bid].detail) return custom[bid].detail;
    if (DATA.details && DATA.details[bid]) return DATA.details[bid];
    var item = (DATA.blogs || {})[bid];
    if (!item) return null;
    return {
      id: item.id,
      title: item.title,
      author: item.author || 'Bangumi 旅人',
      authorUid: item.authorUid || '',
      authorAvatar: item.isAvatarCover && item.cover ? item.cover : 'https://lain.bgm.tv/pic/user/l/icon.jpg',
      time: item.time || '',
      readTime: '3 分钟阅读',
      tags: item.tags || [],
      excerpt: item.excerpt || '',
      contentHtml: '<p>' + esc(item.excerpt || '暂无更多正文摘录，点击下方原站链接查看完整排版。') + '</p>',
      relatedSubjects: item.subjectId ? [{
        id: item.subjectId,
        name: item.subjectName || ('条目 #' + item.subjectId),
        info: '',
        cover: item.isAvatarCover ? '' : (item.cover || '')
      }] : [],
      likes: [],
      comments: [],
      score: item.score || 0,
      url: 'https://bgm.tv/blog/' + item.id
    };
  }

  function getSubjectById(sid) {
    var list = DATA.subjects || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(sid)) return list[i];
    }
    return null;
  }

  function getTotalRepliesCount(detail) {
    var base = (detail.comments || []).length;
    var extra = (readJson(LS_REPLIES, {})[detail.id] || []).length;
    return base + extra;
  }

  function coverBoxHtml(item) {
    var cls = 'bgl-cover-link';
    if (item.isSquare || item.channel === 'music') cls += ' is-square';
    else if (item.isAvatarCover) cls += ' is-avatar';
    var inner = item.cover
      ? '<img src="' + esc(item.cover) + '" alt="' + esc(item.title) + '" referrerpolicy="no-referrer" loading="lazy" />'
      : '<div class="bgl-cover-fallback">' + esc((item.title || '日').slice(0, 1)) + '</div>';
    return (
      '<p class="cover bgl-cover-box">' +
        '<a href="blog.html?id=' + esc(item.id) + '" class="' + cls + '" data-act="open-blog" data-id="' + esc(item.id) + '">' + inner + '</a>' +
      '</p>'
    );
  }

  function readUrlParams() {
    var sp = new URLSearchParams(window.location.search || '');
    var modeParam = sp.get('mode') || sp.get('action') || '';
    var idParam = sp.get('id') || '';
    var reviewParam = sp.get('review') || '';
    var catParam = sp.get('cat') || 'all';
    var tagParam = sp.get('tag') || '';
    var uidParam = sp.get('uid') || '';
    var qParam = sp.get('q') || '';
    var sortParam = sp.get('sort') || 'latest';
    var pageParam = parseInt(sp.get('page') || '1', 10);

    if (modeParam === 'create' || reviewParam) {
      state.mode = 'create';
      state.id = '';
      state.reviewSid = reviewParam;
      state.draftSubjects = [];
      if (reviewParam) {
        var subj = getSubjectById(reviewParam);
        if (subj) state.draftSubjects.push(subj);
      }
      state.draftScore = reviewParam ? 8 : 0;
    } else if (modeParam === 'edit' && idParam) {
      state.mode = 'edit';
      state.id = idParam;
      var existing = getBlogDetail(idParam);
      state.draftSubjects = existing && existing.relatedSubjects ? existing.relatedSubjects.slice() : [];
      state.draftScore = (existing && existing.score) || 0;
    } else if (idParam) {
      state.mode = 'detail';
      state.id = idParam;
    } else {
      state.mode = 'plaza';
      state.id = '';
    }

    state.cat = CAT_LABELS[catParam] ? catParam : 'all';
    state.tag = tagParam;
    state.uid = uidParam;
    state.q = qParam;
    state.sort = sortParam === 'replies' ? 'replies' : 'latest';
    state.page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  }

  function syncUrl() {
    var sp = new URLSearchParams();
    if (state.mode === 'detail' && state.id) {
      sp.set('id', state.id);
    } else if (state.mode === 'create') {
      sp.set('mode', 'create');
      if (state.reviewSid) sp.set('review', state.reviewSid);
    } else if (state.mode === 'edit' && state.id) {
      sp.set('mode', 'edit');
      sp.set('id', state.id);
    } else {
      if (state.cat && state.cat !== 'all') sp.set('cat', state.cat);
      if (state.tag) sp.set('tag', state.tag);
      if (state.uid) sp.set('uid', state.uid);
      if (state.q) sp.set('q', state.q);
      if (state.sort && state.sort !== 'latest') sp.set('sort', state.sort);
      if (state.page > 1) sp.set('page', String(state.page));
    }
    var qs = sp.toString();
    var target = 'blog.html' + (qs ? '?' + qs : '');
    try {
      window.history.replaceState(null, '', target);
    } catch (e) {}
  }

  function syncHeroHeader() {
    var kicker = $('bglKickerBadge');
    var titleEl = $('bglPageTitle');
    var subEl = $('bglPageSubtitle');
    var tabs = $('bglNavTabs');
    var allMap = getAllBlogItems();

    var cnts = { all: 0, anime: 0, book: 0, music: 0, game: 0, real: 0 };
    Object.keys(allMap).forEach(function (bid) {
      cnts.all++;
      var ch = allMap[bid].channel;
      if (cnts[ch] != null) cnts[ch]++;
    });
    if ($('bglCntAll')) $('bglCntAll').textContent = cnts.all;
    if ($('bglCntAnime')) $('bglCntAnime').textContent = cnts.anime;
    if ($('bglCntBook')) $('bglCntBook').textContent = cnts.book;
    if ($('bglCntMusic')) $('bglCntMusic').textContent = cnts.music;
    if ($('bglCntGame')) $('bglCntGame').textContent = cnts.game;
    if ($('bglCntReal')) $('bglCntReal').textContent = cnts.real;

    if (tabs) {
      tabs.querySelectorAll('a').forEach(function (a) {
        var c = a.getAttribute('data-bgl-cat');
        var u = a.getAttribute('data-bgl-uid');
        var active = false;
        if (state.mode === 'plaza') {
          if (state.uid) active = u === state.uid;
          else active = c === state.cat;
        }
        a.classList.toggle('focus', !!active);
      });
    }

    if (state.mode === 'detail') {
      var d = getBlogDetail(state.id);
      if (kicker) kicker.textContent = 'BLOG ENTRY · 日志正文';
      if (titleEl) titleEl.textContent = d ? d.title : '日志详情';
      if (subEl) subEl.textContent = d ? ('作者：' + d.author + ' · 发布于 ' + (d.time || '近期') + ' · 支持贴贴、楼中楼与收集目录') : '日志内容视图';
    } else if (state.mode === 'create' || state.mode === 'edit') {
      if (kicker) kicker.textContent = state.mode === 'edit' ? 'BLOG EDIT · 编辑日志' : 'BLOG COMPOSE · 发表新日志';
      if (titleEl) titleEl.textContent = state.mode === 'edit' ? '编辑我的日志' : '发表新日志 / 作品长评';
      if (subEl) subEl.textContent = '支持 BBCode 富文本、隐私可见范围设定与右侧实时关联条目搜索添加器。';
    } else {
      if (kicker) kicker.textContent = 'BLOG PLAZA · 日志广场';
      if (titleEl) {
        if (state.uid === '553488') titleEl.textContent = '少年游的个人日志专栏';
        else if (state.uid === 'sai') titleEl.textContent = 'Sai🖖 的站长日志专栏';
        else if (state.uid) titleEl.textContent = '@' + state.uid + ' 的日志列表';
        else titleEl.textContent = 'Bangumi ' + (CAT_LABELS[state.cat] || '日志广场');
      }
      if (subEl) subEl.textContent = '汇集番组长评、巡礼随笔、作画考据与游戏通关杂谈，支持深度阅读、贴贴互动与 BBCode 创作。';
    }
  }

  /* ==================== 1. Plaza View (/blog) ==================== */
  function getFilteredList() {
    var allMap = getAllBlogItems();
    var custom = getCustomBlogsMap();
    var deleted = getDeletedMap();

    var orderedIds = [];
    // Put custom blogs first
    Object.keys(custom).forEach(function (bid) {
      if (!deleted[bid] && orderedIds.indexOf(bid) === -1) orderedIds.push(bid);
    });

    var sourceIds = (DATA.channelIds && DATA.channelIds[state.cat]) || [];
    if (state.uid && DATA.userBlogs && DATA.userBlogs[state.uid]) {
      sourceIds = DATA.userBlogs[state.uid];
    }
    sourceIds.forEach(function (bid) {
      if (allMap[bid] && orderedIds.indexOf(bid) === -1) orderedIds.push(bid);
    });
    Object.keys(allMap).forEach(function (bid) {
      if (orderedIds.indexOf(bid) === -1) orderedIds.push(bid);
    });

    var list = orderedIds.map(function (bid) { return allMap[bid]; }).filter(Boolean);

    if (state.uid) {
      list = list.filter(function (it) {
        return it.authorUid === state.uid || (state.uid === '553488' && it.author === '少年游');
      });
    } else if (state.cat && state.cat !== 'all') {
      list = list.filter(function (it) { return it.channel === state.cat; });
    }

    if (state.tag) {
      var tLower = state.tag.toLowerCase();
      list = list.filter(function (it) {
        return (it.tags || []).some(function (t) { return t.toLowerCase() === tLower; });
      });
    }

    if (state.q) {
      var qLower = state.q.toLowerCase();
      list = list.filter(function (it) {
        return (it.title || '').toLowerCase().indexOf(qLower) !== -1 ||
          (it.excerpt || '').toLowerCase().indexOf(qLower) !== -1 ||
          (it.author || '').toLowerCase().indexOf(qLower) !== -1 ||
          (it.subjectName || '').toLowerCase().indexOf(qLower) !== -1 ||
          (it.tags || []).some(function (t) { return t.toLowerCase().indexOf(qLower) !== -1; });
      });
    }

    if (state.sort === 'replies') {
      list.sort(function (a, b) {
        return (b.replies || 0) - (a.replies || 0);
      });
    }
    return list;
  }

  function renderPlaza() {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var list = getFilteredList();
    var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    var startIdx = (state.page - 1) * PAGE_SIZE;
    var pageItems = list.slice(startIdx, startIdx + PAGE_SIZE);

    var chipsHtml = '';
    if (state.tag) {
      chipsHtml += '<span class="bgl-active-chip">标签：' + esc(state.tag) + ' <button type="button" data-act="clear-tag" aria-label="清除标签">×</button></span>';
    }
    if (state.uid) {
      chipsHtml += '<span class="bgl-active-chip">作者：@' + esc(state.uid) + ' <button type="button" data-act="clear-uid" aria-label="清除作者筛选">×</button></span>';
    }
    if (state.q) {
      chipsHtml += '<span class="bgl-active-chip">关键词：' + esc(state.q) + ' <button type="button" data-act="clear-q" aria-label="清除关键词">×</button></span>';
    }

    var cardsHtml = pageItems.length ? pageItems.map(function (it) {
      var subjHtml = it.subjectId
        ? ' · 评论 <a class="l" href="subject.html?id=' + esc(it.subjectId) + '">' + esc(it.subjectName || ('条目 #' + it.subjectId)) + '</a>'
        : '';
      var tagsHtml = (it.tags || []).slice(0, 4).map(function (t) {
        var actCls = state.tag === t ? ' is-active' : '';
        return '<button type="button" class="bgl-tag-btn' + actCls + '" data-act="filter-tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('');
      var starPart = it.score ? (' · ' + tenStarsHtml(it.score)) : '';

      return (
        '<div class="item clearit" data-blog-id="' + esc(it.id) + '">' +
          coverBoxHtml(it) +
          '<div class="entry bgl-entry-body">' +
            '<h2 class="title"><a href="blog.html?id=' + esc(it.id) + '" data-act="open-blog" data-id="' + esc(it.id) + '">' + esc(it.title) + '</a></h2>' +
            '<div class="content bgl-entry-excerpt"><a href="blog.html?id=' + esc(it.id) + '" data-act="open-blog" data-id="' + esc(it.id) + '">' + esc(it.excerpt || '点击阅读全文与楼层讨论……') + '</a></div>' +
            '<div class="tools bgl-entry-tools">' +
              '<div class="time bgl-entry-meta">' +
                '<a class="l" href="blog.html?uid=' + esc(it.authorUid || 'sai') + '" data-act="filter-uid" data-uid="' + esc(it.authorUid || 'sai') + '">' + esc(it.author || '旅人') + '</a>' +
                subjHtml +
                (it.time ? ' · <span>' + esc(it.time) + '</span>' : '') +
                starPart +
                ' · <a class="l" href="blog.html?id=' + esc(it.id) + '#comments" data-act="open-blog" data-id="' + esc(it.id) + '"><small class="orange">(' + esc(it.replies || 0) + ' 回复)</small></a>' +
              '</div>' +
              (tagsHtml ? '<div class="tags bgl-tags-row">' + tagsHtml + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('') : '<div style="padding:36px 16px;text-align:center;color:var(--bgl-text-muted);">未找到符合条件的日志，试试清空筛选或发表第一篇新日志！</div>';

    var pagHtml = '';
    if (totalPages > 1) {
      var btns = [];
      if (state.page > 1) btns.push('<button type="button" class="p" data-act="set-page" data-page="' + (state.page - 1) + '">‹ 上一页</button>');
      for (var p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 2) {
          btns.push(p === state.page
            ? '<strong class="p_cur">' + p + '</strong>'
            : '<button type="button" class="p" data-act="set-page" data-page="' + p + '">' + p + '</button>');
        } else if (btns[btns.length - 1] !== '<span style="color:var(--bgl-text-muted)">…</span>') {
          btns.push('<span style="color:var(--bgl-text-muted)">…</span>');
        }
      }
      if (state.page < totalPages) btns.push('<button type="button" class="p" data-act="set-page" data-page="' + (state.page + 1) + '">下一页 ›</button>');
      pagHtml = '<div id="multipage"><div class="page_inner bgl-pagination">' + btns.join('') + '</div></div>';
    }

    colA.innerHTML =
      '<section class="bgl-panel">' +
        '<div class="bgl-toolbar">' +
          '<div class="bgl-toolbar-left">' +
            '<input type="search" class="bgl-filter-input" id="bglPlazaSearchInput" value="' + esc(state.q) + '" placeholder="筛选标题、作者、标签或关联作品…" />' +
            '<button type="button" class="bgl-btn-ghost" data-act="apply-search">筛选</button>' +
            chipsHtml +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:12px;color:var(--bgl-text-muted);">共 <strong>' + list.length + '</strong> 篇</span>' +
            '<select class="bgl-select" id="bglPlazaSortSelect" data-act="change-sort" aria-label="排序方式">' +
              '<option value="latest"' + (state.sort === 'latest' ? ' selected' : '') + '>最新发布</option>' +
              '<option value="replies"' + (state.sort === 'replies' ? ' selected' : '') + '>热议最多</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="entry_list" class="bgl-entry-list">' + cardsHtml + '</div>' +
        pagHtml +
      '</section>';

    // Right sidebar: Featured, Tags, Users
    var allMap = getAllBlogItems();
    var featHtml = (DATA.featuredIds || []).slice(0, 6).map(function (fid) {
      var fb = allMap[fid];
      if (!fb) return '';
      return (
        '<a href="blog.html?id=' + esc(fb.id) + '" class="bgl-mini-blog-link" data-act="open-blog" data-id="' + esc(fb.id) + '">' +
          '<span class="bgl-mini-blog-title">' + esc(fb.title) + '</span>' +
          '<span class="bgl-mini-blog-meta">' + esc(fb.author) + ' · ' + esc(fb.replies || 0) + ' 回复</span>' +
        '</a>'
      );
    }).join('');

    var tagCounts = {};
    Object.keys(allMap).forEach(function (bid) {
      (allMap[bid].tags || []).forEach(function (t) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    var topTags = Object.keys(tagCounts).sort(function (a, b) { return tagCounts[b] - tagCounts[a]; }).slice(0, 18);
    var tagCloudHtml = topTags.map(function (t) {
      return '<button type="button" class="bgl-tag-btn' + (state.tag === t ? ' is-active' : '') + '" data-act="filter-tag" data-tag="' + esc(t) + '">' + esc(t) + ' (' + tagCounts[t] + ')</button>';
    }).join('');

    colB.innerHTML =
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">✍️ 写作与专栏 <small>UGC</small></h3>' +
        '<p style="margin:0 0 12px;font-size:12.5px;line-height:1.6;color:var(--bgl-text-muted);">记录看番随想、圣地巡礼或长篇作品评论，支持 BBCode 与实时条目关联。</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<a href="blog.html?mode=create" class="chiiBtn bgl-btn-primary" style="justify-content:center;" data-act="go-create"><span>✍️ 发表新日志</span></a>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
            '<a href="blog.html?uid=553488" class="bgl-btn-ghost" style="justify-content:center;" data-act="filter-uid" data-uid="553488">少年游的日志</a>' +
            '<a href="blog.html?uid=sai" class="bgl-btn-ghost" style="justify-content:center;" data-act="filter-uid" data-uid="sai">Sai🖖 的日志</a>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">🔥 精选热议日志 <small>Top Picks</small></h3>' +
        '<div class="bgl-side-list">' + featHtml + '</div>' +
      '</section>' +
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">🏷️ 热门日志标签 <small>点击过滤</small></h3>' +
        '<div class="bgl-tags-row">' + tagCloudHtml + '</div>' +
      '</section>';
  }

  /* ==================== 2. Detail View (/blog/{id}) ==================== */
  function getMergedLikes(detail) {
    var store = readJson(LS_LIKES, {});
    var key = 'blog_' + detail.id;
    var mine = store[key] || {};
    var map = {};
    (detail.likes || []).forEach(function (lk) {
      var em = EMOJIS.filter(function (e) { return e.val === String(lk.value); })[0];
      map[lk.value] = {
        value: String(lk.value),
        glyph: em ? em.label : '👍',
        total: Number(lk.total || 0),
        mine: false
      };
    });
    Object.keys(mine).forEach(function (val) {
      if (!mine[val]) return;
      var em = EMOJIS.filter(function (e) { return e.val === String(val); })[0];
      if (!map[val]) map[val] = { value: val, glyph: em ? em.label : '👍', total: 0, mine: false };
      map[val].total += 1;
      map[val].mine = true;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (x) { return x.total > 0; });
  }

  function getMergedCommentLikes(rid) {
    var store = readJson(LS_LIKES, {});
    var mine = store['reply_' + rid] || {};
    return Object.keys(mine).filter(function (k) { return mine[k]; }).map(function (val) {
      var em = EMOJIS.filter(function (e) { return e.val === String(val); })[0];
      return { value: val, glyph: em ? em.label : '👍', total: 1, mine: true };
    });
  }

  function renderDetail() {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var detail = getBlogDetail(state.id);
    if (!detail) {
      colA.innerHTML =
        '<section class="bgl-panel" style="text-align:center;padding:42px 20px;">' +
          '<h2 style="margin:0 0 10px;">未找到日志 #' + esc(state.id) + '</h2>' +
          '<p style="color:var(--bgl-text-muted);margin:0 0 16px;">该日志可能已被删除或尚未收录至本地样本。</p>' +
          '<a href="blog.html" class="bgl-btn-primary" data-act="go-plaza">返回日志广场</a>' +
        '</section>';
      colB.innerHTML = '';
      return;
    }

    var isOwner = detail.authorUid === '553488';
    var customComments = readJson(LS_REPLIES, {})[detail.id] || [];
    var subStore = readJson(LS_SUBREPLIES, {});
    var allComments = (detail.comments || []).concat(customComments).map(function (c, idx) {
      var extraSubs = subStore[c.id] || [];
      return Object.assign({}, c, {
        _idx: idx,
        subs: (c.subs || []).concat(extraSubs)
      });
    });

    if (state.replySort === 'desc') {
      allComments = allComments.slice().reverse();
    } else if (state.replySort === 'hot') {
      allComments = allComments.slice().sort(function (a, b) {
        return (b.subs ? b.subs.length : 0) - (a.subs ? a.subs.length : 0);
      });
    }

    var likesArr = getMergedLikes(detail);
    var likesHtml = likesArr.map(function (lk) {
      return '<button type="button" class="bgl-like-pill' + (lk.mine ? ' is-mine' : '') + '" data-act="toggle-blog-like" data-val="' + esc(lk.value) + '">' + lk.glyph + ' ' + lk.total + '</button>';
    }).join('');

    var likePopoverHtml = state.openLikePickerKey === ('blog_' + detail.id)
      ? '<div class="bgl-like-popover">' + EMOJIS.map(function (e) {
          return '<button type="button" data-act="toggle-blog-like" data-val="' + e.val + '" title="贴贴">' + e.label + '</button>';
        }).join('') + '</div>'
      : '';

    var tagsHtml = (detail.tags || []).map(function (t) {
      return '<a href="blog.html?tag=' + encodeURIComponent(t) + '" class="bgl-tag-btn" data-act="filter-tag" data-tag="' + esc(t) + '">' + esc(t) + '</a>';
    }).join('');

    var ownerBtns = isOwner
      ? '<a href="blog.html?mode=edit&id=' + esc(detail.id) + '" class="bgl-icon-btn" data-act="go-edit" data-id="' + esc(detail.id) + '">✏️ 编辑</a>' +
        '<button type="button" class="bgl-icon-btn is-danger" data-act="delete-blog" data-id="' + esc(detail.id) + '">🗑️ 删除</button>'
      : '';

    var commentsHtml = allComments.length ? allComments.map(function (c) {
      var rLikes = getMergedCommentLikes(c.id);
      var rLikesHtml = rLikes.length
        ? '<div class="likes_grid" style="margin-top:6px;">' + rLikes.map(function (lk) {
            return '<button type="button" class="bgl-like-pill is-mine" data-act="toggle-reply-like" data-rid="' + esc(c.id) + '" data-val="' + esc(lk.value) + '">' + lk.glyph + ' ' + lk.total + '</button>';
          }).join('') + '</div>'
        : '';

      var cPopover = state.openLikePickerKey === ('reply_' + c.id)
        ? '<div class="bgl-like-popover">' + EMOJIS.map(function (e) {
            return '<button type="button" data-act="toggle-reply-like" data-rid="' + esc(c.id) + '" data-val="' + e.val + '">' + e.label + '</button>';
          }).join('') + '</div>'
        : '';

      var moreMenu = state.openMoreMenuId === c.id
        ? '<div class="bgl-like-popover" style="border-radius:12px;padding:6px 10px;gap:8px;">' +
            '<button type="button" style="width:auto;height:auto;border-radius:8px;padding:4px 8px;font-size:12px;" data-act="mute-user" data-user="' + esc(c.user) + '">🚫 绝交</button>' +
            '<button type="button" style="width:auto;height:auto;border-radius:8px;padding:4px 8px;font-size:12px;" data-act="report-reply" data-rid="' + esc(c.id) + '">🚩 报告疑虑</button>' +
          '</div>'
        : '';

      var subsHtml = (c.subs || []).length
        ? '<div class="topic_sub_reply">' + c.subs.map(function (s) {
            return (
              '<div id="post_' + esc(s.id) + '" class="sub_reply_bg clearit">' +
                '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:4px;">' +
                  '<span><strong><a class="l" href="user.html?uid=' + esc(s.uid || '553488') + '">' + esc(s.user) + '</a></strong> <small style="color:var(--bgl-text-muted);">' + esc(s.floor || '') + ' · ' + esc(s.time || '') + '</small></span>' +
                '</div>' +
                '<div class="cmt_sub_content">' + (s.html || '') + '</div>' +
              '</div>'
            );
          }).join('') + '</div>'
        : '';

      var subFormHtml = state.openSubReplyId === c.id
        ? '<form class="bgl-subreply-form" data-act="submit-subreply" data-rid="' + esc(c.id) + '">' +
            '<input type="text" placeholder="回复 ' + esc(c.user) + ' (支持 BBCode)…" required />' +
            '<button type="submit" class="bgl-btn-primary" style="padding:6px 14px;font-size:12px;">发送</button>' +
          '</form>'
        : '';

      return (
        '<div id="post_' + esc(c.id) + '" class="row_reply clearit" data-item-user="' + esc(c.uid || '') + '">' +
          '<div class="bgl-reply-head">' +
            '<div class="bgl-reply-author">' +
              '<span class="avatarNeue" style="background-image:url(\'' + esc(c.avatar) + '\')"></span>' +
              '<div>' +
                '<strong><a href="user.html?uid=' + esc(c.uid || '553488') + '" class="l">' + esc(c.user) + '</a></strong> ' +
                (c.sign ? '<span class="tip_j" style="font-size:11.5px;color:var(--bgl-text-muted);">' + esc(c.sign) + '</span>' : '') +
                '<div style="font-size:11.5px;color:var(--bgl-text-muted);">' + esc(c.floor || '#1') + ' · ' + esc(c.time || '') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="bgl-action-group">' +
              '<button type="button" class="bgl-icon-btn" style="padding:4px 9px;font-size:11.5px;" data-act="open-subreply" data-rid="' + esc(c.id) + '">💬 回复</button>' +
              '<a href="javascript:void(0);" class="icon like_dropdown bgl-icon-btn" style="padding:4px 9px;font-size:11.5px;" data-like-type="10" data-act="open-like-picker" data-target="reply_' + esc(c.id) + '">✨ 贴贴</a>' +
              '<button type="button" class="bgl-icon-btn" style="padding:4px 9px;font-size:11.5px;" data-act="toggle-more-menu" data-rid="' + esc(c.id) + '">···</button>' +
              cPopover + moreMenu +
            '</div>' +
          '</div>' +
          '<div class="bgl-reply-body">' +
            '<div class="message clearit">' + (c.html || '') + '</div>' +
            rLikesHtml +
            subsHtml +
            subFormHtml +
          '</div>' +
        '</div>'
      );
    }).join('') : '<div style="padding:22px 0;text-align:center;color:var(--bgl-text-muted);">暂无评论，来抢第一个沙发吧！</div>';

    var sliderMax = Math.max(1, allComments.length);

    colA.innerHTML =
      '<article id="viewEntry" class="entry-container bgl-panel">' +
        '<div class="author user-card bgl-author-card">' +
          '<a href="user.html?uid=' + esc(detail.authorUid || 'sai') + '" class="avatar l">' +
            '<img src="' + esc(detail.authorAvatar) + '" class="avatarSize48" referrerpolicy="no-referrer" alt="' + esc(detail.author) + '" />' +
          '</a>' +
          '<div class="bgl-author-meta">' +
            '<a href="user.html?uid=' + esc(detail.authorUid || 'sai') + '" class="bgl-author-name">' + esc(detail.author) + '</a>' +
            '<div class="bgl-author-sub">' +
              '<a href="blog.html?uid=' + esc(detail.authorUid || 'sai') + '" class="l" data-act="filter-uid" data-uid="' + esc(detail.authorUid || 'sai') + '">查看 Ta 的全部日志</a> · ' +
              esc(detail.readTime || '3 分钟阅读') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="header bgl-detail-header">' +
          '<h1 class="title">' + esc(detail.title) + '</h1>' +
          '<div class="tools bgl-detail-tools">' +
            '<span>🕒 ' + esc(detail.time || '近期发布') + '</span>' +
            (detail.score ? tenStarsHtml(detail.score) : '') +
            '<div class="tags bgl-tags-row">' + tagsHtml + '</div>' +
          '</div>' +
        '</div>' +

        '<div id="entry_content" class="blog_entry content bgl-article-body">' +
          (detail.contentHtml || '') +
        '</div>' +

        '<div class="entry-actions bgl-entry-actions">' +
          '<div class="likes_grid" id="likes_grid_' + esc(detail.id) + '">' + likesHtml + '</div>' +
          '<div class="post_actions re_info bgl-action-bar">' +
            '<div class="bgl-action-group">' +
              ownerBtns +
              '<a href="/index/add_related/blog/' + esc(detail.id) + '" class="thickbox icon bgl-icon-btn" data-act="open-index-modal" data-id="' + esc(detail.id) + '">📁 收集</a>' +
              '<a href="javascript:void(0);" class="icon like_dropdown bgl-icon-btn" data-like-type="9" data-act="open-like-picker" data-target="blog_' + esc(detail.id) + '">✨ 贴贴</a>' +
              '<a href="#ReplyForm" class="icon comment-count bgl-icon-btn">💬 评论 (' + allComments.length + ')</a>' +
              likePopoverHtml +
            '</div>' +
            '<a href="' + esc(detail.url || ('https://bgm.tv/blog/' + detail.id)) + '" target="_blank" rel="noopener" class="bgl-btn-ghost">原站查看 ↗</a>' +
          '</div>' +
        '</div>' +
      '</article>' +

      '<section class="bgl-panel bgl-comments-panel" id="comments">' +
        '<div id="sliderContainer" class="bgl-slider-bar">' +
          '<div class="bgl-slider-wrap">' +
            '<strong style="font-size:13.5px;">💬 评论楼层 (' + allComments.length + ')</strong>' +
            '<input type="range" id="slider" min="1" max="' + sliderMax + '" value="1" data-act="jump-floor" aria-label="快速跳转楼层" />' +
            '<span id="bglSliderFloorLabel" style="font-size:12px;color:var(--bgl-text-muted);">#1 / #' + sliderMax + '</span>' +
          '</div>' +
          '<select class="bgl-select" data-act="change-reply-sort" aria-label="评论排序">' +
            '<option value="asc"' + (state.replySort === 'asc' ? ' selected' : '') + '>顺序查看</option>' +
            '<option value="desc"' + (state.replySort === 'desc' ? ' selected' : '') + '>倒序最新</option>' +
            '<option value="hot"' + (state.replySort === 'hot' ? ' selected' : '') + '>热门子回复</option>' +
          '</select>' +
        '</div>' +
        '<div id="comment_list" class="commentList comment-list">' + commentsHtml + '</div>' +
        '<form id="ReplyForm" data-act="submit-reply" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--bgl-border);">' +
          '<div class="bgl-bbcode-bar">' +
            '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="bglReplyTextarea" data-open="[b]" data-close="[/b]">加粗</button>' +
            '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="bglReplyTextarea" data-open="[i]" data-close="[/i]">斜体</button>' +
            '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="bglReplyTextarea" data-open="[mask]" data-close="[/mask]">剧透 mask</button>' +
            '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="bglReplyTextarea" data-open="[quote]" data-close="[/quote]">引用</button>' +
          '</div>' +
          '<textarea id="bglReplyTextarea" class="bgl-textarea" placeholder="写下你的读后感或补充讨论（支持 BBCode）…" required></textarea>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:10px;">' +
            '<input type="submit" class="inputBtn bgl-submit-btn" value="发表回复" />' +
          '</div>' +
        '</form>' +
      '</section>';

    // Right sidebar: back button + related subjects + author other blogs
    var relHtml = (detail.relatedSubjects || []).length
      ? '<ul id="related_subject_list" class="bgl-side-list">' + detail.relatedSubjects.map(function (rs) {
          var subjMeta = getSubjectById(rs.id);
          var isMusic = subjMeta && subjMeta.type === 'music';
          return (
            '<li><a href="subject.html?id=' + esc(rs.id) + '" class="bgl-rel-card">' +
              (rs.cover
                ? '<img src="' + esc(rs.cover) + '" class="bgl-rel-thumb' + (isMusic ? ' is-square' : '') + '" referrerpolicy="no-referrer" alt="' + esc(rs.name) + '" />'
                : '<div class="bgl-rel-thumb" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--bgl-accent);">' + esc((rs.name || '条').slice(0, 1)) + '</div>') +
              '<div class="bgl-rel-info">' +
                '<div class="bgl-rel-name">' + esc(rs.name) + '</div>' +
                '<div class="bgl-rel-sub">' + esc(rs.info || ('Subject #' + rs.id)) + '</div>' +
              '</div>' +
            '</a></li>'
          );
        }).join('') + '</ul>'
      : '<p style="margin:0;font-size:12.5px;color:var(--bgl-text-muted);">本文暂未关联具体条目</p>';

    var allMap = getAllBlogItems();
    var moreBlogs = Object.keys(allMap).map(function (bid) { return allMap[bid]; }).filter(function (b) {
      return b.id !== detail.id && ((detail.authorUid && b.authorUid === detail.authorUid) || (detail.relatedSubjects[0] && b.subjectId === detail.relatedSubjects[0].id));
    }).slice(0, 5);
    if (!moreBlogs.length) {
      moreBlogs = (DATA.featuredIds || []).map(function (fid) { return allMap[fid]; }).filter(function (b) { return b && b.id !== detail.id; }).slice(0, 5);
    }

    colB.innerHTML =
      '<section class="bgl-panel">' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<a href="blog.html" class="bgl-btn-ghost" style="justify-content:center;" data-act="go-plaza">← 返回日志广场</a>' +
          '<a href="blog.html?mode=create" class="chiiBtn bgl-btn-primary" style="justify-content:center;" data-act="go-create"><span>✍️ 写一篇新日志</span></a>' +
        '</div>' +
      '</section>' +
      '<section class="bgl-panel entry-related-subjects">' +
        '<h3 class="bgl-side-title">🎬 关联条目 <small>' + (detail.relatedSubjects || []).length + ' 部</small></h3>' +
        relHtml +
      '</section>' +
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">📖 延伸阅读推荐 <small>More</small></h3>' +
        '<div class="bgl-side-list">' +
          moreBlogs.map(function (mb) {
            return (
              '<a href="blog.html?id=' + esc(mb.id) + '" class="bgl-mini-blog-link" data-act="open-blog" data-id="' + esc(mb.id) + '">' +
                '<span class="bgl-mini-blog-title">' + esc(mb.title) + '</span>' +
                '<span class="bgl-mini-blog-meta">' + esc(mb.author) + ' · ' + esc(mb.replies || 0) + ' 回复</span>' +
              '</a>'
            );
          }).join('') +
        '</div>' +
      '</section>';
  }

  /* ==================== 3. Create / Edit View (/blog/create) ==================== */
  function renderCreateOrEdit() {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var editing = state.mode === 'edit' ? getBlogDetail(state.id) : null;
    var initTitle = editing ? editing.title : (state.reviewSid && getSubjectById(state.reviewSid) ? ('关于《' + getSubjectById(state.reviewSid).name + '》的长评：') : '');
    var initBody = editing ? (editing.rawBbcode || editing.excerpt || '') : '';
    var initTags = editing ? (editing.tags || []).join(', ') : (state.reviewSid ? '长评' : '');

    var starButtons = '';
    for (var i = 1; i <= 10; i++) {
      starButtons += '<button type="button" class="' + (i <= state.draftScore ? 'is-lit' : '') + '" data-act="pick-score" data-score="' + i + '" title="' + i + ' 分">★</button>';
    }

    colA.innerHTML =
      '<section class="bgl-panel">' +
        '<form id="bglComposeForm" data-act="submit-blog">' +
          '<div class="bgl-form-group">' +
            '<label class="bgl-form-label" for="tpc_title">日志标题</label>' +
            '<input type="text" id="tpc_title" name="title" class="inputtext" value="' + esc(initTitle) + '" placeholder="输入吸引人的标题，例如：《葬送的芙莉莲》的叙事时间学…" required />' +
          '</div>' +

          '<div class="bgl-form-group">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
              '<label class="bgl-form-label" for="tpc_content" style="margin:0;">正文内容 (支持 BBCode)</label>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="toggle-compose-preview">' + (state.createPreview ? '✏️ 返回编辑' : '👁️ 实时预览') + '</button>' +
            '</div>' +
            '<div class="bgl-bbcode-bar">' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[b]" data-close="[/b]">加粗</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[i]" data-close="[/i]">斜体</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[u]" data-close="[/u]">下划线</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[s]" data-close="[/s]">删除线</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[mask]" data-close="[/mask]">剧透 mask</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[quote]" data-close="[/quote]">引用</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[url=https://bgm.tv]" data-close="[/url]">链接</button>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="insert-bb" data-target="tpc_content" data-open="[img]" data-close="[/img]">插图</button>' +
            '</div>' +
            '<textarea id="tpc_content" name="content" placeholder="分享你的观影体会、圣地巡礼照片或作品考据…" ' + (state.createPreview ? 'hidden' : '') + ' required>' + esc(initBody) + '</textarea>' +
            '<div id="bglComposePreviewBox" class="blog_entry bgl-article-body" style="padding:14px;border-radius:14px;border:1px solid var(--bgl-border);background:var(--bgl-surface-subtle);min-height:220px;" ' + (state.createPreview ? '' : 'hidden') + '></div>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1fr 180px;gap:12px;">' +
            '<div class="bgl-form-group">' +
              '<label class="bgl-form-label" for="tags">标签 (用逗号或空格分隔)</label>' +
              '<input type="text" id="tags" name="tags" class="inputtext" value="' + esc(initTags) + '" placeholder="例如：动画, 长评, 芙莉莲" />' +
            '</div>' +
            '<div class="bgl-form-group">' +
              '<label class="bgl-form-label" for="bglPrivacy">隐私设置</label>' +
              '<select id="bglPrivacy" class="bgl-select" style="width:100%;height:40px;border-radius:12px;">' +
                '<option value="public">公开 (所有人可见)</option>' +
                '<option value="friends">仅好友可见</option>' +
                '<option value="private">仅自己可见</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div class="bgl-form-group">' +
            '<span class="bgl-form-label">附带十星作品评分 (可选 · 传统 10 星制)</span>' +
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
              '<div class="bgl-star-picker" id="bglStarPicker">' + starButtons + '</div>' +
              '<span id="bglStarScoreText" style="font-size:12.5px;color:var(--bgl-text-muted);">' + (state.draftScore ? (state.draftScore + ' / 10 分') : '未附加评分') + '</span>' +
              (state.draftScore ? '<button type="button" class="bgl-bbcode-btn" data-act="pick-score" data-score="0">清除评分</button>' : '') +
            '</div>' +
          '</div>' +

          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:8px;">' +
            '<a href="blog.html" class="bgl-btn-ghost" data-act="go-plaza">取消并返回</a>' +
            '<input type="submit" class="inputBtn bgl-submit-btn" value="加上去" />' +
          '</div>' +
        '</form>' +
      '</section>';

    renderComposeSidebar();
  }

  function renderComposeSidebar() {
    var colB = $('columnB');
    if (!colB) return;

    var selectedHtml = state.draftSubjects.length
      ? state.draftSubjects.map(function (rs) {
          return (
            '<div class="bgl-rel-card" style="justify-content:space-between;">' +
              '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
                (rs.cover ? '<img src="' + esc(rs.cover) + '" class="bgl-rel-thumb' + (rs.type === 'music' ? ' is-square' : '') + '" referrerpolicy="no-referrer" alt="" />' : '') +
                '<div class="bgl-rel-info">' +
                  '<div class="bgl-rel-name">' + esc(rs.name) + '</div>' +
                  '<div class="bgl-rel-sub">Subject #' + esc(rs.id) + '</div>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="bgl-bbcode-btn" data-act="remove-draft-subject" data-sid="' + esc(rs.id) + '">移除</button>' +
            '</div>'
          );
        }).join('')
      : '<p style="margin:0;font-size:12px;color:var(--bgl-text-muted);">尚未关联条目，可在下方搜索添加。</p>';

    var qLower = (state.subjectQuery || '').trim().toLowerCase();
    var matches = (DATA.subjects || []).filter(function (s) {
      if (!qLower) return true;
      return (s.name || '').toLowerCase().indexOf(qLower) !== -1 ||
        (s.nameOrig || '').toLowerCase().indexOf(qLower) !== -1 ||
        String(s.id) === qLower;
    }).slice(0, 8);

    var matchesHtml = matches.map(function (s) {
      var added = state.draftSubjects.some(function (d) { return String(d.id) === String(s.id); });
      return (
        '<div class="bgl-rel-card" style="justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
            (s.cover ? '<img src="' + esc(s.cover) + '" class="bgl-rel-thumb' + (s.type === 'music' ? ' is-square' : '') + '" referrerpolicy="no-referrer" alt="" />' : '') +
            '<div class="bgl-rel-info">' +
              '<div class="bgl-rel-name">' + esc(s.name) + '</div>' +
              '<div class="bgl-rel-sub">#' + esc(s.id) + ' · ' + esc(s.type || 'anime') + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="bgl-bbcode-btn" data-act="add-draft-subject" data-sid="' + esc(s.id) + '"' + (added ? ' disabled' : '') + '>' + (added ? '已关联' : '+ 关联') + '</button>' +
        '</div>'
      );
    }).join('');

    colB.innerHTML =
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">🎬 已关联条目 <small>' + state.draftSubjects.length + ' 部</small></h3>' +
        '<div id="bglSelectedSubjects" class="bgl-side-list">' + selectedHtml + '</div>' +
      '</section>' +
      '<section class="bgl-panel">' +
        '<h3 class="bgl-side-title">🔍 关联条目搜索添加器 <small>223 部索引</small></h3>' +
        '<input type="search" id="bglSubjectSearchInput" class="bgl-filter-input" style="width:100%;min-width:0;margin-bottom:10px;" value="' + esc(state.subjectQuery) + '" placeholder="输入番组/书籍/音乐/游戏名或 ID…" data-act="search-draft-subject" />' +
        '<div class="bgl-side-list">' + matchesHtml + '</div>' +
      '</section>';
  }

  /* ==================== Index Modal ==================== */
  function openIndexModal(bid) {
    var modal = $('bglIndexModal');
    var body = $('bglIndexModalBody');
    if (!modal || !body) return;
    var list = readJson(LS_INDEXES, [
      { id: 'idx_1', title: '个人年度十佳深度评论归档', items: [] },
      { id: 'idx_2', title: '作画考据与演出研究剪藏', items: [] }
    ]);
    body.innerHTML =
      '<div class="bgl-side-list" style="margin-bottom:14px;">' +
        list.map(function (ix) {
          var has = (ix.items || []).indexOf(bid) !== -1;
          return (
            '<div class="bgl-rel-card" style="justify-content:space-between;">' +
              '<div><div class="bgl-rel-name">📑 ' + esc(ix.title) + '</div><div class="bgl-rel-sub">' + (ix.items || []).length + ' 篇内容</div></div>' +
              '<button type="button" class="bgl-btn-ghost" data-act="toggle-index-item" data-ix="' + esc(ix.id) + '" data-id="' + esc(bid) + '">' + (has ? '✓ 已收录' : '+ 收录') + '</button>' +
            '</div>'
          );
        }).join('') +
      '</div>' +
      '<form data-act="create-index-item" data-id="' + esc(bid) + '" style="display:flex;gap:8px;">' +
        '<input type="text" id="bglNewIndexTitle" class="bgl-filter-input" style="flex:1;min-width:0;" placeholder="新建目录名称…" required />' +
        '<button type="submit" class="bgl-btn-primary">创建并收录</button>' +
      '</form>';
    modal.hidden = false;
  }

  function closeIndexModal() {
    var modal = $('bglIndexModal');
    if (modal) modal.hidden = true;
  }

  /* ==================== Global Render & Events ==================== */
  function renderAll() {
    syncHeroHeader();
    if (state.mode === 'detail') renderDetail();
    else if (state.mode === 'create' || state.mode === 'edit') renderCreateOrEdit();
    else renderPlaza();
    syncUrl();
  }

  function insertBbcode(targetId, openTag, closeTag) {
    var ta = $(targetId);
    if (!ta) return;
    var s = ta.selectionStart || 0;
    var e = ta.selectionEnd || 0;
    var val = ta.value || '';
    var sel = val.slice(s, e) || '文本';
    ta.value = val.slice(0, s) + openTag + sel + closeTag + val.slice(e);
    ta.focus();
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var tabA = e.target.closest('#bglNavTabs a');
      if (tabA) {
        e.preventDefault();
        var cat = tabA.getAttribute('data-bgl-cat');
        var uid = tabA.getAttribute('data-bgl-uid');
        state.mode = 'plaza';
        state.id = '';
        state.tag = '';
        state.page = 1;
        if (uid) {
          state.uid = uid;
          state.cat = 'all';
        } else {
          state.uid = '';
          state.cat = cat || 'all';
        }
        renderAll();
        return;
      }

      var actEl = e.target.closest('[data-act]');
      if (!actEl) {
        if (state.openLikePickerKey || state.openMoreMenuId) {
          state.openLikePickerKey = '';
          state.openMoreMenuId = '';
          if (state.mode === 'detail') renderDetail();
        }
        return;
      }

      var act = actEl.getAttribute('data-act');
      if (act === 'open-blog') {
        e.preventDefault();
        state.mode = 'detail';
        state.id = actEl.getAttribute('data-id') || '';
        state.openLikePickerKey = '';
        state.openSubReplyId = '';
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'go-plaza') {
        e.preventDefault();
        state.mode = 'plaza';
        state.id = '';
        renderAll();
      } else if (act === 'go-create') {
        e.preventDefault();
        state.mode = 'create';
        state.id = '';
        state.reviewSid = '';
        state.draftSubjects = [];
        state.draftScore = 0;
        state.createPreview = false;
        renderAll();
      } else if (act === 'go-edit') {
        e.preventDefault();
        state.mode = 'edit';
        state.id = actEl.getAttribute('data-id') || state.id;
        var ex = getBlogDetail(state.id);
        state.draftSubjects = ex && ex.relatedSubjects ? ex.relatedSubjects.slice() : [];
        state.draftScore = (ex && ex.score) || 0;
        state.createPreview = false;
        renderAll();
      } else if (act === 'filter-tag') {
        e.preventDefault();
        state.mode = 'plaza';
        state.tag = actEl.getAttribute('data-tag') || '';
        state.page = 1;
        renderAll();
      } else if (act === 'filter-uid') {
        e.preventDefault();
        state.mode = 'plaza';
        state.uid = actEl.getAttribute('data-uid') || '';
        state.cat = 'all';
        state.page = 1;
        renderAll();
      } else if (act === 'clear-tag') {
        state.tag = '';
        state.page = 1;
        renderAll();
      } else if (act === 'clear-uid') {
        state.uid = '';
        state.page = 1;
        renderAll();
      } else if (act === 'clear-q') {
        state.q = '';
        state.page = 1;
        renderAll();
      } else if (act === 'apply-search') {
        var inp = $('bglPlazaSearchInput');
        state.q = inp ? inp.value.trim() : '';
        state.page = 1;
        renderAll();
      } else if (act === 'set-page') {
        state.page = parseInt(actEl.getAttribute('data-page') || '1', 10) || 1;
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'open-like-picker') {
        e.preventDefault();
        var t = actEl.getAttribute('data-target') || '';
        state.openLikePickerKey = state.openLikePickerKey === t ? '' : t;
        renderDetail();
      } else if (act === 'toggle-blog-like') {
        var val = actEl.getAttribute('data-val') || '40';
        var lkStore = readJson(LS_LIKES, {});
        var bk = 'blog_' + state.id;
        if (!lkStore[bk]) lkStore[bk] = {};
        lkStore[bk][val] = !lkStore[bk][val];
        writeJson(LS_LIKES, lkStore);
        state.openLikePickerKey = '';
        renderDetail();
        showToast(lkStore[bk][val] ? '已发送日志贴贴！' : '已取消贴贴');
      } else if (act === 'toggle-reply-like') {
        var rid = actEl.getAttribute('data-rid') || '';
        var rval = actEl.getAttribute('data-val') || '40';
        var rStore = readJson(LS_LIKES, {});
        var rk = 'reply_' + rid;
        if (!rStore[rk]) rStore[rk] = {};
        rStore[rk][rval] = !rStore[rk][rval];
        writeJson(LS_LIKES, rStore);
        state.openLikePickerKey = '';
        renderDetail();
      } else if (act === 'open-subreply') {
        var srid = actEl.getAttribute('data-rid') || '';
        state.openSubReplyId = state.openSubReplyId === srid ? '' : srid;
        renderDetail();
      } else if (act === 'toggle-more-menu') {
        var mrid = actEl.getAttribute('data-rid') || '';
        state.openMoreMenuId = state.openMoreMenuId === mrid ? '' : mrid;
        renderDetail();
      } else if (act === 'mute-user') {
        state.openMoreMenuId = '';
        renderDetail();
        showToast('已模拟将 ' + (actEl.getAttribute('data-user') || '该用户') + ' 加入绝交名单');
      } else if (act === 'report-reply') {
        state.openMoreMenuId = '';
        renderDetail();
        showToast('已提交楼层疑虑报告至管理员');
      } else if (act === 'open-index-modal') {
        e.preventDefault();
        openIndexModal(actEl.getAttribute('data-id') || state.id);
      } else if (act === 'toggle-index-item') {
        var ixId = actEl.getAttribute('data-ix') || '';
        var bid = actEl.getAttribute('data-id') || state.id;
        var ixs = readJson(LS_INDEXES, [
          { id: 'idx_1', title: '个人年度十佳深度评论归档', items: [] },
          { id: 'idx_2', title: '作画考据与演出研究剪藏', items: [] }
        ]);
        ixs.forEach(function (ix) {
          if (ix.id !== ixId) return;
          if (!ix.items) ix.items = [];
          var p = ix.items.indexOf(bid);
          if (p === -1) ix.items.push(bid);
          else ix.items.splice(p, 1);
        });
        writeJson(LS_INDEXES, ixs);
        openIndexModal(bid);
        showToast('目录收录状态已更新');
      } else if (act === 'delete-blog') {
        var delId = actEl.getAttribute('data-id') || state.id;
        var delMap = getDeletedMap();
        delMap[delId] = true;
        writeJson(LS_DELETED, delMap);
        state.mode = 'plaza';
        state.id = '';
        renderAll();
        showToast('已删除该篇日志');
      } else if (act === 'insert-bb') {
        insertBbcode(
          actEl.getAttribute('data-target') || 'tpc_content',
          actEl.getAttribute('data-open') || '[b]',
          actEl.getAttribute('data-close') || '[/b]'
        );
      } else if (act === 'toggle-compose-preview') {
        var ta = $('tpc_content');
        var box = $('bglComposePreviewBox');
        state.createPreview = !state.createPreview;
        if (ta && box) {
          ta.hidden = state.createPreview;
          box.hidden = !state.createPreview;
          if (state.createPreview) {
            box.innerHTML = bbcodeToHtml(ta.value || '(暂未输入正文内容)');
          }
        }
        actEl.textContent = state.createPreview ? '✏️ 返回编辑' : '👁️ 实时预览';
      } else if (act === 'pick-score') {
        state.draftScore = parseInt(actEl.getAttribute('data-score') || '0', 10) || 0;
        var picker = $('bglStarPicker');
        if (picker) {
          picker.querySelectorAll('button').forEach(function (btn) {
            var sc = parseInt(btn.getAttribute('data-score') || '0', 10);
            btn.classList.toggle('is-lit', sc <= state.draftScore);
          });
        }
        var lbl = $('bglStarScoreText');
        if (lbl) lbl.textContent = state.draftScore ? (state.draftScore + ' / 10 分') : '未附加评分';
      } else if (act === 'add-draft-subject') {
        var sid = actEl.getAttribute('data-sid') || '';
        var subj = getSubjectById(sid);
        if (subj && !state.draftSubjects.some(function (d) { return String(d.id) === String(sid); })) {
          state.draftSubjects.push(subj);
          renderComposeSidebar();
          showToast('已关联《' + subj.name + '》');
        }
      } else if (act === 'remove-draft-subject') {
        var rsid = actEl.getAttribute('data-sid') || '';
        state.draftSubjects = state.draftSubjects.filter(function (d) { return String(d.id) !== String(rsid); });
        renderComposeSidebar();
      }
    });

    document.addEventListener('change', function (e) {
      var actEl = e.target.closest('[data-act]');
      if (!actEl) return;
      var act = actEl.getAttribute('data-act');
      if (act === 'change-sort') {
        state.sort = actEl.value || 'latest';
        state.page = 1;
        renderAll();
      } else if (act === 'change-reply-sort') {
        state.replySort = actEl.value || 'asc';
        renderDetail();
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'bglSubjectSearchInput') {
        state.subjectQuery = e.target.value || '';
        renderComposeSidebar();
        var inp = $('bglSubjectSearchInput');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      } else if (e.target && e.target.id === 'slider') {
        var floorNum = parseInt(e.target.value || '1', 10) || 1;
        var lbl = $('bglSliderFloorLabel');
        var rows = document.querySelectorAll('#comment_list .row_reply');
        if (lbl) lbl.textContent = '#' + floorNum + ' / #' + Math.max(1, rows.length);
        var row = rows[floorNum - 1];
        if (row && typeof row.scrollIntoView === 'function') {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.id === 'bglPlazaSearchInput') {
        e.preventDefault();
        state.q = e.target.value.trim();
        state.page = 1;
        renderAll();
      } else if (e.key === 'Escape') {
        closeIndexModal();
      }
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form) return;
      var act = form.getAttribute('data-act') || '';
      if (act === 'submit-reply') {
        e.preventDefault();
        var ta = $('bglReplyTextarea');
        var txt = ta ? ta.value.trim() : '';
        if (!txt) return;
        var detail = getBlogDetail(state.id);
        var curTotal = detail ? getTotalRepliesCount(detail) : 0;
        var rStore = readJson(LS_REPLIES, {});
        if (!rStore[state.id]) rStore[state.id] = [];
        rStore[state.id].push({
          id: 'loc_' + Date.now(),
          floor: '#' + (curTotal + 1),
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          sign: '时光机旅人 · UID #553488',
          time: '刚刚',
          html: bbcodeToHtml(txt),
          subs: []
        });
        writeJson(LS_REPLIES, rStore);
        renderDetail();
        showToast('已发表回复');
      } else if (act === 'submit-subreply') {
        e.preventDefault();
        var rid = form.getAttribute('data-rid') || '';
        var inp = form.querySelector('input');
        var txt2 = inp ? inp.value.trim() : '';
        if (!txt2) return;
        var srStore = readJson(LS_SUBREPLIES, {});
        if (!srStore[rid]) srStore[rid] = [];
        srStore[rid].push({
          id: 'sub_' + Date.now(),
          floor: '楼中楼',
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: '刚刚',
          html: bbcodeToHtml(txt2)
        });
        writeJson(LS_SUBREPLIES, srStore);
        state.openSubReplyId = '';
        renderDetail();
        showToast('已发送楼中楼回复');
      } else if (act === 'create-index-item') {
        e.preventDefault();
        var bid = form.getAttribute('data-id') || state.id;
        var titleInp = $('bglNewIndexTitle');
        var tVal = titleInp ? titleInp.value.trim() : '';
        if (!tVal) return;
        var ixs = readJson(LS_INDEXES, [
          { id: 'idx_1', title: '个人年度十佳深度评论归档', items: [] },
          { id: 'idx_2', title: '作画考据与演出研究剪藏', items: [] }
        ]);
        ixs.unshift({ id: 'idx_' + Date.now(), title: tVal, items: [bid] });
        writeJson(LS_INDEXES, ixs);
        openIndexModal(bid);
        showToast('已创建目录「' + tVal + '」并收录');
      } else if (act === 'submit-blog') {
        e.preventDefault();
        var titleEl = $('tpc_title');
        var bodyEl = $('tpc_content');
        var tagsEl = $('tags');
        var titleVal = titleEl ? titleEl.value.trim() : '';
        var bodyVal = bodyEl ? bodyEl.value.trim() : '';
        if (!titleVal || !bodyVal) {
          showToast('请填写标题和正文内容');
          return;
        }
        var tagsArr = (tagsEl ? tagsEl.value : '')
          .split(/[\s,，、]+/)
          .map(function (t) { return t.trim(); })
          .filter(Boolean);
        var primarySubj = state.draftSubjects[0] || null;
        var ch = primarySubj && primarySubj.type ? primarySubj.type : 'anime';
        if (['anime', 'book', 'music', 'game', 'real'].indexOf(ch) === -1) ch = 'anime';

        var newId = state.mode === 'edit' && state.id ? state.id : String(390000 + Math.floor(Math.random() * 90000));
        var nowStr = '2026-11-13 22:15';
        var summaryObj = {
          id: newId,
          title: titleVal,
          excerpt: bodyVal.replace(/\[[^\]]+\]/g, '').slice(0, 180),
          cover: primarySubj && primarySubj.cover ? primarySubj.cover : 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          isAvatarCover: !(primarySubj && primarySubj.cover),
          isSquare: ch === 'music',
          author: '少年游',
          authorUid: '553488',
          subjectId: primarySubj ? primarySubj.id : '',
          subjectName: primarySubj ? primarySubj.name : '',
          time: nowStr,
          replies: 0,
          tags: tagsArr.length ? tagsArr : ['随笔'],
          channel: ch,
          score: state.draftScore || 0
        };
        var detailObj = {
          id: newId,
          title: titleVal,
          author: '少年游',
          authorUid: '553488',
          authorAvatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: nowStr,
          readTime: Math.max(1, Math.ceil(bodyVal.length / 320)) + ' 分钟阅读',
          tags: summaryObj.tags,
          excerpt: summaryObj.excerpt,
          rawBbcode: bodyVal,
          contentHtml: bbcodeToHtml(bodyVal),
          relatedSubjects: state.draftSubjects.map(function (s) {
            return { id: s.id, name: s.name, info: s.info || '', cover: s.cover || '' };
          }),
          likes: [],
          comments: [],
          score: state.draftScore || 0,
          url: 'https://bgm.tv/blog/' + newId
        };

        var cStore = getCustomBlogsMap();
        cStore[newId] = { summary: summaryObj, detail: detailObj };
        writeJson(LS_CUSTOM, cStore);

        state.mode = 'detail';
        state.id = newId;
        renderAll();
        showToast(state.mode === 'edit' ? '日志已保存' : '新日志已发布！');
      }
    });

    var modalClose = $('bglIndexModalClose');
    if (modalClose) modalClose.addEventListener('click', closeIndexModal);
    var modalMask = $('bglIndexModal');
    if (modalMask) {
      modalMask.addEventListener('click', function (e) {
        if (e.target === modalMask) closeIndexModal();
      });
    }

    var headerSearch = $('headerSearch');
    if (headerSearch) {
      headerSearch.addEventListener('submit', function (e) {
        e.preventDefault();
        var qEl = $('search_text');
        var q = qEl ? qEl.value.trim() : '';
        state.mode = 'plaza';
        state.q = q;
        state.page = 1;
        renderAll();
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
