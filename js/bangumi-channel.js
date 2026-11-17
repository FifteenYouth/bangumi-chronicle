/**
 * Bangumi Redesign — Five-Channel Aggregation Home (Page 13: /anime, /book, /music, /game, /real)
 * C1 / WORK_ORDER_TODO.md
 * 职责：
 * 1. 支持 ?type=anime|book|music|game|real 无缝切换五大频道
 * 2. 渲染 #header > ul.navSubTabs 二级子导航与本频道个人五态快捷入口
 * 3. 渲染近期热门条目封面横排 (ul.featuredItems)、新作速递、最新长评 (#entry_list)、最新讨论 (table.topic_list)
 * 4. 渲染右侧分类排行榜 Top 10 (严格采用传统十星+数字评分)、多维分类入口 (.sideInner)、标签热词云 (.SidePanel)
 * 5. 严格遵守：音乐频道 1:1 封面、lain.bgm.tv 带 referrerpolicy="no-referrer"、.glass-toast 提示
 */
(function () {
  'use strict';

  var DATA = window.CHANNEL_DATA || {};
  var ORDER = ['anime', 'book', 'music', 'game', 'real'];
  var ICONS = {
    anime: '📺',
    book: '📚',
    music: '🎵',
    game: '🎮',
    real: '🎬'
  };

  var state = {
    channel: 'anime',
    featuredExpanded: false,
    tagKeyword: '',
    likedBlogs: {}
  };

  function esc(s) {
    return String(s == null ? '' : s)
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
    var host = document.getElementById('toastContainer');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastContainer';
      host.className = 'toast-container';
      document.body.appendChild(host);
    }
    var t = document.createElement('div');
    t.className = 'glass-toast';
    t.innerHTML = '<span>✦</span><span>' + esc(msg) + '</span>';
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .24s ease, transform .24s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateY(-6px)';
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 250);
    }, 2200);
  }

  function tenStarsHtml(score) {
    var num = Number(score) || 0;
    var lit = Math.max(0, Math.min(10, Math.round(num)));
    var on = '';
    var off = '';
    for (var i = 0; i < 10; i++) {
      if (i < lit) on += '★';
      else off += '☆';
    }
    return '<span class="bch-stars-ten" title="' + esc(num.toFixed(1)) + ' / 10 分">' +
      on + '<span class="is-empty">' + off + '</span></span>';
  }

  function resolveChannelFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var t = (params.get('type') || 'anime').toLowerCase();
    return DATA[t] ? t : 'anime';
  }

  function openCollectBox(subjectTitle) {
    var modal = document.getElementById('bsh-collect-modal');
    if (modal) {
      var titleEl = document.getElementById('bshCollectTitle');
      if (titleEl && subjectTitle) {
        titleEl.textContent = '📦 收藏评分盒 · ' + subjectTitle;
      }
      modal.hidden = false;
      return;
    }
    showToast('已标记收藏意向：' + (subjectTitle || '当前条目'));
  }

  function openReaderModal(kicker, title, metaHtml, bodyText, actionLinks) {
    var modal = document.getElementById('bchReaderModal');
    if (!modal) return;
    document.getElementById('bchReaderKicker').textContent = kicker || 'CHANNEL READER';
    document.getElementById('bchReaderTitle').textContent = title || '详情预览';
    var actionsHtml = (actionLinks || []).map(function (a) {
      return '<a href="' + esc(a.href) + '" class="bch-action-pill' + (a.primary ? ' is-primary' : '') + '">' + esc(a.label) + '</a>';
    }).join('');
    document.getElementById('bchReaderBody').innerHTML =
      '<div class="bch-reader-meta">' + metaHtml + '</div>' +
      '<p class="bch-reader-text">' + esc(bodyText) + '</p>' +
      '<div class="bch-reader-actions">' +
        actionsHtml +
        '<button type="button" class="bch-action-pill" id="bchReaderDoneBtn">关闭预览</button>' +
      '</div>';
    modal.hidden = false;
    var doneBtn = document.getElementById('bchReaderDoneBtn');
    if (doneBtn) {
      doneBtn.onclick = function () { modal.hidden = true; };
    }
  }

  function renderHeaderMeta(chData) {
    var meta = chData.meta;
    document.title = meta.pageTitle + ' · Bangumi 番组计划 — Editorial Liquid Glass';
    document.getElementById('bchKickerBadge').textContent = (ICONS[meta.key] || '📺') + ' ' + meta.enTitle;
    document.getElementById('bchRouteCode').textContent = 'bgm.tv / ' + meta.key;
    document.getElementById('bchTitleText').textContent = meta.pageTitle;
    document.getElementById('bchTitleSub').textContent = '近期注目 · ' + meta.label + '速递 · 长评与讨论';
    document.getElementById('brandMetaCn').textContent = meta.pageTitle;
    document.getElementById('bchSearchCatLabel').textContent = meta.label;
    document.getElementById('bchGoBrowserRank').href = 'browser.html?type=' + encodeURIComponent(meta.key) + '&sort=rank';
    document.getElementById('bchTopBrowserLink').href = 'browser.html?type=' + encodeURIComponent(meta.key) + '&sort=rank';
    document.getElementById('bchMoreTrendsLink').href = 'browser.html?type=' + encodeURIComponent(meta.key) + '&sort=trends';
    document.getElementById('bchRankMoreLink').href = 'browser.html?type=' + encodeURIComponent(meta.key) + '&sort=rank';
    document.getElementById('bchFacetMoreLink').href = 'browser.html?type=' + encodeURIComponent(meta.key);

    var firstCover = (chData.featured && chData.featured[0] && chData.featured[0].cover) ||
      (chData.top10 && chData.top10[0] && chData.top10[0].cover) || '';
    var backdrop = document.getElementById('bchHeroBackdrop');
    if (backdrop && firstCover) {
      backdrop.style.backgroundImage = 'url("' + firstCover + '")';
    }

    // 同步顶部导航条的频道胶囊高亮
    var topLinks = document.querySelectorAll('#navMenuNeue [data-ch-type]');
    Array.prototype.forEach.call(topLinks, function (a) {
      var active = a.getAttribute('data-ch-type') === meta.key;
      a.style.fontWeight = active ? '800' : '';
      a.style.color = active ? 'var(--accent)' : '';
    });
  }

  function renderSwitcher(activeKey) {
    var host = document.getElementById('bchChannelSwitcher');
    if (!host) return;
    host.innerHTML = ORDER.map(function (k) {
      var m = (DATA[k] && DATA[k].meta) || { key: k, label: k };
      var isAct = k === activeKey;
      return '<button type="button" class="bch-chan-pill' + (isAct ? ' is-active' : '') + '" role="tab" aria-selected="' +
        (isAct ? 'true' : 'false') + '" data-switch-ch="' + esc(k) + '">' +
        '<span>' + (ICONS[k] || '📺') + '</span><span>' + esc(m.label) + '</span></button>';
    }).join('');
  }

  function renderSubTabs(chData) {
    var host = document.getElementById('channelSubTabs');
    if (!host) return;
    host.innerHTML = chData.meta.subTabs.map(function (tab, idx) {
      var isHome = idx === 0;
      return '<li><a href="' + esc(tab.href) + '" class="' + (isHome ? 'focus' : '') + '" data-subtab="' + esc(tab.key) + '">' +
        esc(tab.label) + '</a></li>';
    }).join('');
  }

  function renderPersonalStrip(chData) {
    var host = document.getElementById('channelPersonalBar');
    if (!host) return;
    var meta = chData.meta;
    var chips = meta.personalTabs.map(function (pt) {
      return '<a href="' + esc(pt.href) + '" class="bch-personal-chip">' +
        '<span>' + esc(pt.label) + '</span>' +
        '<strong>' + esc(pt.count) + '</strong>' +
      '</a>';
    }).join('');

    host.innerHTML =
      '<div class="bch-personal-label">' +
        '<img src="https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1" alt="少年游" class="bch-personal-avatar" referrerpolicy="no-referrer" />' +
        '<span>我的' + esc(meta.label) + '进度档案 · 五态快捷入口</span>' +
      '</div>' +
      '<div class="bch-personal-links">' + chips + '</div>';
  }

  function renderFeatured(chData) {
    var meta = chData.meta;
    var listEl = document.getElementById('bchFeaturedList');
    var titleEl = document.getElementById('bchFeaturedTitle');
    var toggleBtn = document.getElementById('bchToggleFeaturedLayout');
    if (!listEl) return;

    titleEl.innerHTML = '🔥 近期注目' + esc(meta.label) + ' <small>' + esc(meta.featuredSubtitle) + ' · 共 ' + chData.featured.length + ' 部</small>';
    listEl.classList.toggle('is-expanded', state.featuredExpanded);
    if (toggleBtn) {
      toggleBtn.textContent = state.featuredExpanded ? '收起为横向滚动' : '展开全部 ' + chData.featured.length + ' 项';
    }

    var sqClass = meta.squareCover ? ' is-square-cover' : '';
    listEl.innerHTML = chData.featured.map(function (item, idx) {
      var href = 'subject.html?id=' + encodeURIComponent(item.id);
      return '<li class="mainItem bch-featured-item">' +
        '<a href="' + esc(href) + '" class="bch-cover-wrap' + sqClass + '" title="' + esc(item.title) + '">' +
          '<img src="' + esc(item.cover) + '" alt="' + esc(item.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
          '<span class="bch-cover-rank-pill">HOT #' + (idx + 1) + '</span>' +
          '<button type="button" class="bch-cover-quick-collect" data-collect-title="' + esc(item.title) + '">+ 收藏</button>' +
        '</a>' +
        '<a href="' + esc(href) + '" class="bch-featured-title" title="' + esc(item.title) + '">' + esc(item.title) + '</a>' +
        '<span class="bch-featured-meta">' + esc(item.followText) + '</span>' +
      '</li>';
    }).join('');
  }

  function renderNewReleases(chData) {
    var meta = chData.meta;
    var titleEl = document.getElementById('bchNewReleaseTitle');
    var grid = document.getElementById('bchNewReleaseGrid');
    if (!grid) return;

    titleEl.innerHTML = '✨ ' + esc(meta.newReleaseTitle) + ' <small>' + esc(meta.newReleaseDesc) + '</small>';
    var sqClass = meta.squareCover ? ' is-square-cover' : '';
    var items = (chData.newReleases || []).slice(0, 6);

    grid.innerHTML = items.map(function (item) {
      var href = 'subject.html?id=' + encodeURIComponent(item.id);
      return '<article class="bch-spotlight-card">' +
        '<a href="' + esc(href) + '" class="bch-spotlight-cover' + sqClass + '">' +
          '<img src="' + esc(item.cover) + '" alt="' + esc(item.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
        '</a>' +
        '<div class="bch-spotlight-body">' +
          '<span class="bch-spotlight-tag">' + esc(item.tag || '新作速递') + '</span>' +
          '<a href="' + esc(href) + '" class="bch-spotlight-title">' + esc(item.title) + '</a>' +
          '<div class="bch-spotlight-foot">' +
            '<span>' + esc(item.followText) + '</span>' +
            '<button type="button" class="bch-mini-btn" data-collect-title="' + esc(item.title) + '">📌 ' + esc(meta.verb) + '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderBlogs(chData) {
    var meta = chData.meta;
    var titleEl = document.getElementById('bchBlogTitle');
    var host = document.getElementById('entry_list');
    if (!host) return;

    titleEl.innerHTML = '📝 ' + esc(meta.blogTitle) + ' <small>来自社区成员的真实长评与考察</small>';
    var sqClass = meta.squareCover ? ' is-square-cover' : '';

    host.innerHTML = chData.blogs.map(function (blog, idx) {
      var subjHref = blog.subjectId ? ('subject.html?id=' + encodeURIComponent(blog.subjectId)) : 'subject.html';
      var userHref = blog.authorUid ? ('user.html?uid=' + encodeURIComponent(blog.authorUid)) : 'user.html';
      var liked = !!state.likedBlogs[blog.id];
      return '<article class="item bch-blog-item">' +
        '<a href="#blog-' + esc(blog.id) + '" class="bch-blog-cover' + sqClass + '" data-read-blog="' + idx + '">' +
          '<img src="' + esc(blog.cover) + '" alt="' + esc(blog.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
        '</a>' +
        '<div class="bch-blog-content">' +
          '<h3 class="bch-blog-title"><a href="#blog-' + esc(blog.id) + '" data-read-blog="' + idx + '">' + esc(blog.title) + '</a></h3>' +
          '<p class="bch-blog-excerpt">' + esc(blog.excerpt) + '</p>' +
          '<div class="bch-blog-meta">' +
            '<div class="bch-blog-meta-left">' +
              '<span>by <a href="' + esc(userHref) + '">' + esc(blog.author) + '</a></span>' +
              '<span>· ' + esc(blog.time) + '</span>' +
              '<span>· ' + esc(blog.repliesText) + '</span>' +
              (blog.subjectName ? '<a href="' + esc(subjHref) + '" class="bch-blog-subject-pill">《' + esc(blog.subjectName) + '》</a>' : '') +
            '</div>' +
            '<div class="bch-blog-actions">' +
              '<button type="button" class="bch-mini-btn" data-like-blog="' + esc(blog.id) + '">' + (liked ? '💗 已贴贴' : '🤍 贴贴') + '</button>' +
              '<button type="button" class="bch-mini-btn" data-read-blog="' + idx + '">📖 速览</button>' +
              '<a href="blog.html?id=' + encodeURIComponent(blog.id) + '" class="bch-mini-btn" style="text-decoration:none;">✒️ 全文</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderTopics(chData) {
    var meta = chData.meta;
    var titleEl = document.getElementById('bchTopicTitle');
    var tbody = document.getElementById('bchTopicTbody');
    if (!tbody) return;

    titleEl.innerHTML = '💬 ' + esc(meta.topicTitle) + ' <small>实时话题流 · 点击可展开快读</small>';
    tbody.innerHTML = chData.topics.map(function (tp, idx) {
      var subjHref = tp.subjectId ? ('subject.html?id=' + encodeURIComponent(tp.subjectId)) : 'subject.html';
      return '<tr>' +
        '<td>' +
          '<div>' +
            '<a href="#topic-' + esc(tp.id) + '" class="bch-topic-link" data-read-topic="' + idx + '">' + esc(tp.title) + '</a>' +
            '<span class="bch-topic-replies">' + esc(tp.replies) + '</span>' +
          '</div>' +
          (tp.subjectName ? '<a href="' + esc(subjHref) + '" class="bch-topic-subject">关联条目：' + esc(tp.subjectName) + '</a>' : '') +
        '</td>' +
        '<td>' +
          '<span class="bch-topic-author">' + esc(tp.author) + '</span>' +
          '<span class="bch-topic-date">' + esc(tp.date) + '</span>' +
        '</td>' +
        '<td style="text-align:right;">' +
          '<button type="button" class="bch-mini-btn" data-read-topic="' + idx + '">💬 预览</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function renderTop10(chData) {
    var meta = chData.meta;
    var titleEl = document.getElementById('bchRankTitle');
    var host = document.getElementById('bchTop10List');
    if (!host) return;

    titleEl.textContent = '🏆 ' + meta.rankTitle;
    var sqClass = meta.squareCover ? ' is-square-cover' : '';
    host.innerHTML = (chData.top10 || []).map(function (it, idx) {
      var rk = it.rank || (idx + 1);
      var rkClass = rk === 1 ? ' is-top1' : (rk === 2 ? ' is-top2' : (rk === 3 ? ' is-top3' : ''));
      var href = 'subject.html?id=' + encodeURIComponent(it.id);
      return '<li class="bch-top10-item">' +
        '<span class="bch-rank-num' + rkClass + '">#' + rk + '</span>' +
        '<a href="' + esc(href) + '" class="bch-top10-cover' + sqClass + '">' +
          '<img src="' + esc(it.cover) + '" alt="' + esc(it.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
        '</a>' +
        '<div class="bch-top10-info">' +
          '<a href="' + esc(href) + '" class="bch-top10-title" title="' + esc(it.title) + '">' + esc(it.title) + '</a>' +
          '<div class="bch-top10-score-row">' +
            tenStarsHtml(it.score) +
            '<span class="bch-score-num">' + esc(Number(it.score).toFixed(1)) + '</span>' +
            '<span class="bch-score-votes">(' + esc(it.votes) + '人)</span>' +
          '</div>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function renderFacets(chData) {
    var host = document.getElementById('bchFacetsHost');
    if (!host) return;
    var key = chData.meta.key;
    host.innerHTML = (chData.facets || []).map(function (grp) {
      var links = grp.values.map(function (v) {
        var href = 'browser.html?type=' + encodeURIComponent(key) + '&q=' + encodeURIComponent(v.label);
        return '<li><a href="' + esc(href) + '">' + esc(v.label) + '</a></li>';
      }).join('');
      return '<div class="bch-facet-group">' +
        '<h4 class="bch-facet-group-title">' + esc(grp.title) + '</h4>' +
        '<ul class="grouped bch-facet-pills">' + links + '</ul>' +
      '</div>';
    }).join('');
  }

  function renderTagCloud(chData) {
    var host = document.getElementById('bchTagCloudHost');
    var countEl = document.getElementById('bchTagCount');
    if (!host) return;

    var kw = state.tagKeyword.trim().toLowerCase();
    var filtered = (chData.tags || []).filter(function (tg) {
      return !kw || tg.name.toLowerCase().indexOf(kw) >= 0;
    });

    if (countEl) {
      countEl.textContent = filtered.length + ' 词';
    }

    if (!filtered.length) {
      host.innerHTML = '<span style="font-size:12px;color:var(--muted);">未找到匹配的频道标签</span>';
      return;
    }

    host.innerHTML = filtered.map(function (tg) {
      var lvClass = tg.level >= 8 ? 'lv-high' : (tg.level >= 5 ? 'lv-mid' : 'lv-low');
      var href = 'tag.html?type=' + encodeURIComponent(chData.meta.key) + '&tag=' + encodeURIComponent(tg.name);
      return '<a href="' + esc(href) + '" class="bch-tag-chip ' + lvClass + '">' + esc(tg.name) + '</a>';
    }).join('');
  }

  function renderChannel(chKey) {
    if (!DATA[chKey]) chKey = 'anime';
    state.channel = chKey;
    var chData = DATA[chKey];

    renderHeaderMeta(chData);
    renderSwitcher(chKey);
    renderSubTabs(chData);
    renderPersonalStrip(chData);
    renderFeatured(chData);
    renderNewReleases(chData);
    renderBlogs(chData);
    renderTopics(chData);
    renderTop10(chData);
    renderFacets(chData);
    renderTagCloud(chData);
  }

  function switchChannel(nextKey, pushHistory) {
    if (!DATA[nextKey]) return;
    state.featuredExpanded = false;
    state.tagKeyword = '';
    var tagInput = document.getElementById('bchTagFilterInput');
    if (tagInput) tagInput.value = '';
    renderChannel(nextKey);
    if (pushHistory && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', 'channel.html?type=' + encodeURIComponent(nextKey));
    }
    showToast('已切换至「' + DATA[nextKey].meta.pageTitle + '」');
  }

  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var sw = ev.target.closest('[data-switch-ch]');
      if (sw) {
        ev.preventDefault();
        switchChannel(sw.getAttribute('data-switch-ch'), true);
        return;
      }

      var topCh = ev.target.closest('#navMenuNeue [data-ch-type]');
      if (topCh) {
        ev.preventDefault();
        switchChannel(topCh.getAttribute('data-ch-type'), true);
        return;
      }

      var sub = ev.target.closest('[data-subtab]');
      if (sub) {
        var href = sub.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          ev.preventDefault();
          var targetEl = document.querySelector(href);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      var colBtn = ev.target.closest('[data-collect-title]');
      if (colBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        openCollectBox(colBtn.getAttribute('data-collect-title'));
        return;
      }

      var likeBlogBtn = ev.target.closest('[data-like-blog]');
      if (likeBlogBtn) {
        ev.preventDefault();
        var bid = likeBlogBtn.getAttribute('data-like-blog');
        state.likedBlogs[bid] = !state.likedBlogs[bid];
        renderBlogs(DATA[state.channel]);
        showToast(state.likedBlogs[bid] ? '已为这篇长评贴贴 💗' : '已取消贴贴');
        return;
      }

      var readBlogBtn = ev.target.closest('[data-read-blog]');
      if (readBlogBtn) {
        ev.preventDefault();
        var bIdx = Number(readBlogBtn.getAttribute('data-read-blog'));
        var blog = (DATA[state.channel].blogs || [])[bIdx];
        if (blog) {
          var subjHref = blog.subjectId ? ('subject.html?id=' + encodeURIComponent(blog.subjectId)) : 'subject.html';
          openReaderModal(
            'CHANNEL BLOG · ' + DATA[state.channel].meta.pageTitle,
            blog.title,
            '<span>作者：<strong>' + esc(blog.author) + '</strong></span>' +
            '<span>· ' + esc(blog.time) + '</span>' +
            '<span>· ' + esc(blog.repliesText) + '</span>' +
            (blog.subjectName ? '<span>· 条目：《' + esc(blog.subjectName) + '》</span>' : ''),
            blog.excerpt + '\n\n（本原型页已接入真实 Bangumi 频道日志摘要，完整长评互动与回复流可在条目的「长评与讨论版」继续体验。）',
            [
              { label: '🎬 查看关联条目', href: subjHref, primary: false },
              { label: '✒️ 阅读日志详情页 →', href: 'blog.html?id=' + encodeURIComponent(blog.id), primary: true }
            ]
          );
        }
        return;
      }

      var readTopicBtn = ev.target.closest('[data-read-topic]');
      if (readTopicBtn) {
        ev.preventDefault();
        var tIdx = Number(readTopicBtn.getAttribute('data-read-topic'));
        var tp = (DATA[state.channel].topics || [])[tIdx];
        if (tp) {
          var tpSubjHref = tp.subjectId ? ('subject.html?id=' + encodeURIComponent(tp.subjectId)) : 'subject.html';
          openReaderModal(
            'CHANNEL DISCUSSION · ' + DATA[state.channel].meta.pageTitle,
            tp.title,
            '<span>发起人：<strong>' + esc(tp.author) + '</strong></span>' +
            '<span>· 日期：' + esc(tp.date) + '</span>' +
            '<span>· 热度：' + esc(tp.replies) + '</span>' +
            (tp.subjectName ? '<span>· 关联条目：' + esc(tp.subjectName) + '</span>' : ''),
            '该讨论帖来自 Bangumi ' + DATA[state.channel].meta.label + '频道实时话题流。你可以跳转到对应条目页继续追问，或在小组与讨论中心参与主楼与楼中楼互动。',
            [
              { label: '🎬 前往关联条目', href: tpSubjHref, primary: false },
              { label: '👥 前往小组与讨论', href: 'group.html', primary: true }
            ]
          );
        }
      }
    });

    var leftBtn = document.getElementById('bchScrollLeft');
    var rightBtn = document.getElementById('bchScrollRight');
    var strip = document.getElementById('bchFeaturedList');
    if (leftBtn && strip) {
      leftBtn.addEventListener('click', function () {
        strip.scrollBy({ left: -460, behavior: 'smooth' });
      });
    }
    if (rightBtn && strip) {
      rightBtn.addEventListener('click', function () {
        strip.scrollBy({ left: 460, behavior: 'smooth' });
      });
    }

    var toggleBtn = document.getElementById('bchToggleFeaturedLayout');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        state.featuredExpanded = !state.featuredExpanded;
        renderFeatured(DATA[state.channel]);
      });
    }

    var collectTrigger = document.getElementById('bchOpenCollectBoxBtn');
    if (collectTrigger) {
      collectTrigger.addEventListener('click', function () {
        openCollectBox(DATA[state.channel].meta.pageTitle);
      });
    }

    var tagInput = document.getElementById('bchTagFilterInput');
    if (tagInput) {
      tagInput.addEventListener('input', function () {
        state.tagKeyword = tagInput.value || '';
        renderTagCloud(DATA[state.channel]);
      });
    }

    var closeReader = document.getElementById('bchReaderCloseBtn');
    var readerModal = document.getElementById('bchReaderModal');
    if (closeReader && readerModal) {
      closeReader.addEventListener('click', function () {
        readerModal.hidden = true;
      });
      readerModal.addEventListener('click', function (ev) {
        if (ev.target === readerModal) readerModal.hidden = true;
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderChannel(resolveChannelFromUrl());
    bindEvents();
  });
})();
