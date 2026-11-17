/* ==========================================================================
   Bangumi Redesign · Page 09 (/subject/{id}/comments) — Subject Comment Box
   Interactive controller: 6-status tabs, 10-star rating filter, staggered
   even/odd comment bubbles, reaction picker [data-like-type="40"], spoiler
   mask toggle, my-comment composer, and cross-page navigation.
   ========================================================================== */
(function () {
  "use strict";

  var DATA = window.COMMENT_DATA || { defaultSubjectId: "400602", reactionsCatalog: [], subjects: {} };
  var STORAGE_MY_COMMENTS = "bgm_redesign_my_comments_v1";
  var STORAGE_LIKES = "bgm_redesign_comment_likes_v1";

  var state = {
    subjectId: "400602",
    status: "all",       // all | wishes | collections | doings | on_hold | dropped
    starTier: "all",     // all | 9-10 | 7-8 | 5-6 | 1-4 | 0 | exact_1..exact_10
    tagFilter: "",
    keyword: "",
    sortBy: "latest",    // latest | likes | rating_desc | rating_asc
    spoilerOnly: false,
    revealAllSpoilers: false,
    page: 1,
    pageSize: 12,
    openPopoverCid: null,
    myDraftStatus: "collections",
    myDraftStars: 9
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tenStarString(scoreNum) {
    var n = Math.max(0, Math.min(10, Math.round(Number(scoreNum) || 0)));
    return "★".repeat(n) + "☆".repeat(10 - n);
  }

  function showToast(msg) {
    if (window.BgmShell && typeof window.BgmShell.toast === "function") {
      window.BgmShell.toast(msg);
      return;
    }
    var box = document.getElementById("toastContainer");
    if (!box) return;
    var t = document.createElement("div");
    t.className = "glass-toast";
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 2600);
  }

  function loadJsonStorage(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJsonStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getReactionMeta(emojiCode) {
    var cat = DATA.reactionsCatalog || [];
    for (var i = 0; i < cat.length; i++) {
      if (String(cat[i].emoji) === String(emojiCode)) return cat[i];
    }
    return { emoji: String(emojiCode), symbol: "👍", label: "赞同" };
  }

  function getSubject() {
    var s = DATA.subjects[state.subjectId];
    if (!s) {
      state.subjectId = DATA.defaultSubjectId || "400602";
      s = DATA.subjects[state.subjectId];
    }
    return s;
  }

  function getMergedComments(subj) {
    var base = (subj.comments || []).slice();
    var myMap = loadJsonStorage(STORAGE_MY_COMMENTS, {});
    var myItem = myMap[subj.id];
    if (myItem) {
      base.unshift(myItem);
    }
    var likeOverrides = loadJsonStorage(STORAGE_LIKES, {});
    return base.map(function (item) {
      var clone = Object.assign({}, item);
      var key = subj.id + "_" + item.id;
      if (likeOverrides[key]) {
        clone.likes = likeOverrides[key];
      } else {
        clone.likes = (item.likes || []).map(function (l) { return Object.assign({}, l); });
      }
      return clone;
    });
  }

  function formatCommentHtml(rawText) {
    var escaped = escHtml(rawText || "");
    var revClass = state.revealAllSpoilers ? "bgm_spoiler is-revealed" : "bgm_spoiler";
    return escaped.replace(/\[mask\]([\s\S]*?)\[\/mask\]/gi, function (_, inner) {
      return '<span class="' + revClass + '" data-act="toggle-spoiler" title="点击刮开/隐藏剧透">' + inner + "</span>";
    });
  }

  function syncNavLinks(sid) {
    var subj = getSubject();
    var presetBtns = document.querySelectorAll('#bannerCategoryBar [data-subject-id], #bannerCategoryBar [data-subject-preset]');
    presetBtns.forEach(function (btn) {
      var pid = btn.getAttribute("data-subject-id") || btn.getAttribute("data-subject-preset");
      btn.classList.toggle("active", pid === subj.id);
      btn.classList.toggle("is-active", pid === subj.id);
    });

    var coverImg = document.getElementById("subjectCoverImg");
    if (coverImg && subj.cover) {
      coverImg.src = subj.cover;
      coverImg.alt = subj.name_cn || subj.name;
    }
    var typeBadge = document.getElementById("subjectTypeBadge");
    if (typeBadge) typeBadge.textContent = subj.typeLabel || "TV 动画";
    var rankBadge = document.getElementById("subjectRankBadge");
    if (rankBadge) rankBadge.textContent = "Rank #" + (subj.rank || 1);
    var titleMain = document.getElementById("subjectTitleMain");
    if (titleMain) titleMain.textContent = subj.name_cn || subj.name;
    var titleSub = document.getElementById("subjectTitleSub");
    if (titleSub) titleSub.textContent = subj.name + " · " + (subj.airInfo || "");
    var scoreBadge = document.getElementById("subjectScoreInline");
    if (scoreBadge) {
      scoreBadge.textContent = tenStarString(subj.score) + " " + Number(subj.score).toFixed(1) + " (" + Number(subj.votes || 0).toLocaleString() + "人评分)";
    }

    var nav = document.getElementById("subjectNavTabs");
    if (nav) {
      var encId = encodeURIComponent(subj.id);
      var totalCmts = getMergedComments(subj).length;
      var tabs = [
        { key: "overview", label: "概览", href: "subject.html?id=" + encId },
        { key: "episodes", label: "章节", href: "subject-ep.html?id=" + encId },
        { key: "characters", label: "角色", href: "subject-characters.html?id=" + encId },
        { key: "persons", label: "制作人员", href: "subject-persons.html?id=" + encId },
        { key: "comments", label: "吐槽箱 (" + totalCmts + ")", href: "subject-comments.html?id=" + encId, active: true },
        { key: "reviews", label: "评论", href: "subject-reviews.html?id=" + encId + "&tab=reviews" },
        { key: "board", label: "讨论版", href: "subject-reviews.html?id=" + encId + "&tab=board" }
        ,{ key: "stats", label: "透视", href: "subject-stats.html?id=" + encId }
        ,{ key: "wiki", label: "维基修订", href: "subject-wiki.html?id=" + encId }
      ];
      nav.innerHTML = tabs.map(function (t) {
        return '<li class="subject-nav-tab-item' + (t.active ? ' active' : '') + '">' +
          '<a href="' + t.href + '" class="' + (t.active ? 'focus' : '') + '" data-tab="' + t.key + '">' + escHtml(t.label) + '</a>' +
        '</li>';
      }).join("");
    }
  }

  function renderHeroBanner(subj) {
    var host = document.getElementById("bcmHeroStrip");
    if (!host) return;
    var isMusic = subj.cat === "music";
    var pillsHtml = Object.keys(DATA.subjects).map(function (sid) {
      var item = DATA.subjects[sid];
      var active = sid === subj.id ? " is-active" : "";
      return '<button type="button" class="bcm-subj-pill' + active + '" data-act="switch-subject" data-id="' + escHtml(sid) + '">' +
        escHtml(item.name_cn || item.name) + "</button>";
    }).join("");

    host.innerHTML =
      '<div class="bcm-hero-left">' +
        '<a href="subject.html?id=' + escHtml(subj.id) + '">' +
          '<img class="bcm-hero-cover' + (isMusic ? " is-music-square" : "") + '" src="' + escHtml(subj.cover) + '" alt="' + escHtml(subj.name_cn) + '" referrerpolicy="no-referrer" />' +
        "</a>" +
        '<div class="bcm-hero-meta">' +
          '<div class="bcm-hero-badges">' +
            '<span class="bcm-badge-cat">' + escHtml(subj.typeLabel) + "</span>" +
            '<span class="bcm-badge-rank">Ranked #' + escHtml(subj.rank) + "</span>" +
            '<span class="bcm-badge-stars" title="传统十星评分">' + tenStarString(subj.score) + " <strong>" + Number(subj.score).toFixed(1) + "</strong> (" + Number(subj.votes).toLocaleString() + "人评分)</span>" +
          "</div>" +
          '<h1 class="bcm-hero-title">' +
            "<span>" + escHtml(subj.name_cn) + " · 吐槽箱</span>" +
            '<span class="bcm-hero-title-jp">' + escHtml(subj.name) + "</span>" +
          "</h1>" +
          '<p class="bcm-hero-sub">' + escHtml(subj.airInfo) + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="bcm-hero-right">' +
        '<div class="bcm-subject-switcher" role="tablist" aria-label="切换预设作品">' + pillsHtml + "</div>" +
      "</div>";
  }

  function renderMyComposer(subj) {
    var host = document.getElementById("bcmMyComposer");
    if (!host) return;
    var verbs = subj.verbs || { wishes: "想看", collections: "看过", doings: "在看", on_hold: "搁置", dropped: "抛弃" };
    var myMap = loadJsonStorage(STORAGE_MY_COMMENTS, {});
    var existing = myMap[subj.id];
    var curSt = existing ? existing.status : state.myDraftStatus;
    var curStars = existing ? existing.stars : state.myDraftStars;
    var curText = existing ? existing.comment : "";
    var curTags = existing && existing.tags ? existing.tags.join(" ") : "";

    var statusButtons = ["wishes", "collections", "doings", "on_hold", "dropped"].map(function (stKey) {
      var active = curSt === stKey ? " is-active" : "";
      return '<button type="button" class="bcm-status-opt' + active + '" data-act="draft-status" data-status="' + stKey + '">' +
        escHtml(verbs[stKey]) + "</button>";
    }).join("");

    var starBtns = "";
    for (var s = 1; s <= 10; s++) {
      var lit = s <= curStars ? " is-lit" : "";
      starBtns += '<button type="button" class="bcm-star-btn' + lit + '" data-act="draft-star" data-star="' + s + '" title="' + s + ' 星">★</button>';
    }

    host.innerHTML =
      '<div class="bcm-composer-top">' +
        '<div class="bcm-composer-title">' +
          "<span>✍️ 我的收藏与简评吐槽</span>" +
          (existing ? '<span class="bcm-badge-cat">已发布 · 可随时修改</span>' : '<span style="font-size:12px;color:var(--fg-3);font-weight:500;">发布后实时置顶展示于吐槽箱</span>') +
        "</div>" +
        '<div class="bcm-composer-status-group">' + statusButtons + "</div>" +
      "</div>" +
      '<div class="bcm-composer-stars-row">' +
        "<span>十星评分：</span>" +
        '<div class="bcm-star-picker">' + starBtns + "</div>" +
        '<span class="bcm-star-score-readout" id="bcmDraftStarReadout">' +
          (curStars > 0 ? (tenStarString(curStars) + " " + curStars + " / 10") : "未评分") +
        "</span>" +
        '<button type="button" class="bcm-tool-btn" data-act="draft-star" data-star="0" style="padding:2px 8px;font-size:11px;">清除评分</button>' +
      "</div>" +
      '<div class="bcm-composer-body">' +
        '<textarea id="bcmComposerInput" class="bcm-composer-textarea" maxlength="380" placeholder="写下你对《' + escHtml(subj.name_cn) + '》的简评或吐槽（最多200字，支持 [mask]剧透内容[/mask] 遮罩语法）...">' + escHtml(curText) + "</textarea>" +
      "</div>" +
      '<div class="bcm-composer-footer">' +
        '<div class="bcm-composer-tools">' +
          '<button type="button" class="bcm-tool-btn" data-act="insert-mask">🎭 插入 [mask] 剧透遮罩</button>' +
          '<input type="text" id="bcmComposerTags" class="bcm-tag-input" placeholder="标签 (空格分隔，如: 神作 治愈)" value="' + escHtml(curTags) + '" />' +
        "</div>" +
        '<button type="button" class="bcm-submit-btn" data-act="submit-my-comment">' +
          (existing ? "更新我的吐槽" : "发表吐槽") +
        "</button>" +
      "</div>";
  }

  function renderSecTab(subj) {
    var secTab = document.getElementById("SecTab");
    if (!secTab) return;
    var verbs = subj.verbs || { wishes: "想看", collections: "看过", doings: "在看", on_hold: "搁置", dropped: "抛弃" };
    var counts = subj.statusCounts || {};
    var tabs = [
      { key: "all", label: "全部", count: null, href: "/subject/" + subj.id + "/comments" },
      { key: "wishes", label: verbs.wishes, count: counts.wishes || 0, href: "/subject/" + subj.id + "/wishes" },
      { key: "collections", label: verbs.collections, count: counts.collections || 0, href: "/subject/" + subj.id + "/collections" },
      { key: "doings", label: verbs.doings, count: counts.doings || 0, href: "/subject/" + subj.id + "/doings" },
      { key: "on_hold", label: verbs.on_hold, count: counts.on_hold || 0, href: "/subject/" + subj.id + "/on_hold" },
      { key: "dropped", label: verbs.dropped, count: counts.dropped || 0, href: "/subject/" + subj.id + "/dropped" }
    ];

    var lis = tabs.map(function (t) {
      var sel = state.status === t.key ? ' class="selected"' : "";
      var cntStr = t.count != null ? " (" + Number(t.count).toLocaleString() + ")" : "";
      return '<li><a href="' + escHtml(t.href) + '"' + sel + ' data-act="switch-status" data-status="' + t.key + '"><span>' +
        escHtml(t.label + cntStr) + "</span></a></li>";
    }).join("");

    secTab.innerHTML =
      '<ul class="secTab clearit">' + lis + "</ul>" +
      '<div class="rr" style="font-size:12px;color:var(--fg-3);font-family:var(--mono);">' +
        "当前样本库收录 <strong>" + getMergedComments(subj).length + "</strong> 条精选吐槽" +
      "</div>";
  }

  function renderToolbar() {
    var host = document.getElementById("bcmToolbar");
    if (!host) return;
    var tiers = [
      { key: "all", label: "全部星级" },
      { key: "9-10", label: "★ 9-10 力荐" },
      { key: "7-8", label: "★ 7-8 推荐" },
      { key: "5-6", label: "★ 5-6 中评" },
      { key: "1-4", label: "★ 1-4 争议" },
      { key: "0", label: "未评分" }
    ];
    if (state.starTier.indexOf("exact_") === 0) {
      var ex = state.starTier.replace("exact_", "");
      tiers.push({ key: state.starTier, label: "精确: " + ex + "★ (点击重置)" });
    }

    var tierHtml = tiers.map(function (t) {
      var act = state.starTier === t.key ? " is-active" : "";
      return '<button type="button" class="bcm-tier-pill' + act + '" data-act="switch-tier" data-tier="' + t.key + '">' +
        escHtml(t.label) + "</button>";
    }).join("");

    var tagBadge = state.tagFilter
      ? '<button type="button" class="bcm-tier-pill is-active" data-act="clear-tag">🏷️ 标签: ' + escHtml(state.tagFilter) + " ✕</button>"
      : "";

    host.innerHTML =
      '<div class="bcm-star-Tier-pills">' + tierHtml + tagBadge + "</div>" +
      '<div class="bcm-toolbar-right">' +
        '<input type="search" id="bcmSearchInput" class="bcm-search-input" placeholder="搜索吐槽正文 / 昵称 / 标签..." value="' + escHtml(state.keyword) + '" />' +
        '<button type="button" class="bcm-tier-pill' + (state.spoilerOnly ? " is-active" : "") + '" data-act="toggle-spoiler-only">🎭 仅看含剧透</button>' +
        '<button type="button" class="bcm-tier-pill' + (state.revealAllSpoilers ? " is-active" : "") + '" data-act="toggle-reveal-all">' +
          (state.revealAllSpoilers ? "🙈 遮罩剧透" : "👁️ 展开剧透") +
        "</button>" +
        '<select id="bcmSortSelect" class="bcm-sort-select" aria-label="吐槽排序">' +
          '<option value="latest"' + (state.sortBy === "latest" ? " selected" : "") + ">最新发表优先</option>" +
          '<option value="likes"' + (state.sortBy === "likes" ? " selected" : "") + ">贴贴热度最高</option>" +
          '<option value="rating_desc"' + (state.sortBy === "rating_desc" ? " selected" : "") + ">评分从高到低 (10★→1★)</option>" +
          '<option value="rating_asc"' + (state.sortBy === "rating_asc" ? " selected" : "") + ">评分从低到高 (1★→10★)</option>" +
        "</select>" +
      "</div>";
  }

  function filterAndSortComments(subj) {
    var all = getMergedComments(subj);
    var filtered = all.filter(function (c) {
      if (state.status !== "all" && c.status !== state.status) return false;
      if (state.starTier !== "all") {
        var st = Number(c.stars) || 0;
        if (state.starTier === "9-10" && (st < 9 || st > 10)) return false;
        if (state.starTier === "7-8" && (st < 7 || st > 8)) return false;
        if (state.starTier === "5-6" && (st < 5 || st > 6)) return false;
        if (state.starTier === "1-4" && (st < 1 || st > 4)) return false;
        if (state.starTier === "0" && st !== 0) return false;
        if (state.starTier.indexOf("exact_") === 0) {
          var target = Number(state.starTier.replace("exact_", ""));
          if (st !== target) return false;
        }
      }
      if (state.tagFilter) {
        var hasT = (c.tags || []).some(function (t) { return t.toLowerCase() === state.tagFilter.toLowerCase(); });
        if (!hasT && (c.comment || "").toLowerCase().indexOf(state.tagFilter.toLowerCase()) < 0) return false;
      }
      if (state.spoilerOnly) {
        if (!c.spoiler && (c.comment || "").indexOf("[mask]") < 0) return false;
      }
      if (state.keyword) {
        var kw = state.keyword.toLowerCase();
        var hay = ((c.nickname || "") + " " + (c.uid || "") + " " + (c.comment || "") + " " + (c.tags || []).join(" ")).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (state.sortBy === "likes") {
        var la = (a.likes || []).reduce(function (acc, x) { return acc + (Number(x.count) || 0); }, 0);
        var lb = (b.likes || []).reduce(function (acc, x) { return acc + (Number(x.count) || 0); }, 0);
        return lb - la;
      }
      if (state.sortBy === "rating_desc") {
        return (Number(b.stars) || 0) - (Number(a.stars) || 0);
      }
      if (state.sortBy === "rating_asc") {
        var sa = Number(a.stars) || 99;
        var sb = Number(b.stars) || 99;
        return sa - sb;
      }
      return 0;
    });

    return filtered;
  }

  function renderCommentBox(subj) {
    var box = document.getElementById("comment_box");
    var pager = document.getElementById("bcmPageInner");
    if (!box) return;

    var filtered = filterAndSortComments(subj);
    var totalItems = filtered.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var startIdx = (state.page - 1) * state.pageSize;
    var slice = filtered.slice(startIdx, startIdx + state.pageSize);

    if (slice.length === 0) {
      box.innerHTML =
        '<div class="item clearit bcm-row-even" data-item-user="system">' +
          '<a href="user.html" class="avatar"><span class="avatarNeue avatarSize48 ll" style="background-image:url(\'https://lain.bgm.tv/pic/user/l/icon.jpg\')"></span></a>' +
          '<div class="text_container text_main_even">' +
            '<div class="bcm-bubble-head">' +
              '<div class="bcm-bubble-meta"><a href="user.html" class="l">Bangumi 吐槽箱助手</a><small class="grey">@ 提示</small></div>' +
              '<div class="action rr"><a href="#reset" class="icon like_dropdown" data-like-type="40" data-act="reset-filters">重置筛选</a></div>' +
            "</div>" +
            '<p class="comment">当前筛选条件下暂无匹配的吐槽记录。点击右上角「重置筛选」即可恢复完整列表。</p>' +
            '<div class="likes_grid"></div>' +
          "</div>" +
        "</div>";
    } else {
      box.innerHTML = slice.map(function (c, idx) {
        var isEven = idx % 2 === 0;
        var rowParityClass = isEven ? "bcm-row-even" : "bcm-row-odd";
        var containerParityClass = isEven ? "text_main_even" : "text_main_odd";
        var avatarSideClass = isEven ? "ll" : "rr";
        var stars = Number(c.stars) || 0;

        var starHtml = stars > 0
          ? '<span class="starstop-s"><span class="starlight stars' + stars + '"></span></span>' +
            '<span class="bcm-ten-stars" title="' + stars + ' / 10 星">' + tenStarString(stars) + " <strong>" + stars + "</strong></span>"
          : "";

        var tagsHtml = (c.tags || []).map(function (t) {
          return '<span class="bcm-tag-chip" data-act="filter-tag" data-tag="' + escHtml(t) + '">#' + escHtml(t) + "</span>";
        }).join("");

        var likesHtml = (c.likes || []).map(function (lk) {
          var meta = getReactionMeta(lk.emoji);
          var actCls = lk.active ? " is-active" : "";
          var tipUsers = (lk.users || []).join("、");
          return '<button type="button" class="bcm-like-pill' + actCls + '" data-act="toggle-like" data-cid="' + escHtml(c.id) + '" data-emoji="' + escHtml(lk.emoji) + '" title="' + escHtml(meta.label + (tipUsers ? "：" + tipUsers : "")) + '">' +
            "<span>" + meta.symbol + "</span>" +
            '<span class="num">' + Number(lk.count || 0) + "</span>" +
          "</button>";
        }).join("");

        var popoverHtml = "";
        if (state.openPopoverCid === String(c.id)) {
          popoverHtml = '<div class="bcm-reaction-popover" role="menu">' +
            (DATA.reactionsCatalog || []).map(function (rc) {
              return '<button type="button" class="bcm-react-pick-btn" data-act="pick-reaction" data-cid="' + escHtml(c.id) + '" data-emoji="' + escHtml(rc.emoji) + '" title="' + escHtml(rc.label) + '">' +
                "<span>" + rc.symbol + "</span><small>" + escHtml(rc.label) + "</small>" +
              "</button>";
            }).join("") +
          "</div>";
        }

        return (
          '<div class="item clearit ' + rowParityClass + '" data-item-user="' + escHtml(c.uid) + '" id="comment_item_' + escHtml(c.id) + '">' +
            '<a href="user.html?uid=' + escHtml(c.uid) + '" class="avatar" title="' + escHtml(c.nickname) + '">' +
              '<span class="avatarNeue avatarSize48 ' + avatarSideClass + '" style="background-image:url(\'' + escHtml(c.avatar) + '\')"></span>' +
            "</a>" +
            '<div class="text_container ' + containerParityClass + '">' +
              '<div class="bcm-bubble-head">' +
                '<div class="bcm-bubble-meta">' +
                  '<a href="user.html?uid=' + escHtml(c.uid) + '" class="l">' + escHtml(c.nickname) + "</a>" +
                  starHtml +
                  '<span class="bcm-status-chip st-' + escHtml(c.status) + '">' + escHtml(c.statusLabel || "看过") + "</span>" +
                  '<small class="grey">@ ' + escHtml(c.time) + "</small>" +
                "</div>" +
                '<div class="action rr">' +
                  '<a href="#like_' + escHtml(c.id) + '" class="icon like_dropdown" data-like-type="40" data-main-id="' + escHtml(subj.id) + '" data-id="' + escHtml(c.id) + '" data-act="open-like-popover" title="贴贴表情反应">😊 贴贴</a>' +
                  popoverHtml +
                "</div>" +
              "</div>" +
              '<p class="comment">' + formatCommentHtml(c.comment) + "</p>" +
              '<div class="bcm-bubble-foot">' +
                '<div class="bcm-user-tags">' + tagsHtml + "</div>" +
                '<div class="likes_grid" id="likes_grid_' + escHtml(c.id) + '">' + likesHtml + "</div>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");
    }

    if (pager) {
      var pagesHtml = "";
      for (var p = 1; p <= totalPages; p++) {
        if (p === state.page) {
          pagesHtml += '<strong class="p_cur">' + p + "</strong>";
        } else {
          pagesHtml += '<a href="?page=' + p + '" class="p" data-act="goto-page" data-page="' + p + '">' + p + "</a>";
        }
      }
      if (state.page < totalPages) {
        pagesHtml += '<a href="?page=' + (state.page + 1) + '" class="p" data-act="goto-page" data-page="' + (state.page + 1) + '">&rsaquo;&rsaquo;</a>';
      }
      pagesHtml += '<a class="p_pages" style="padding:0"><input class="inputtext" id="bcmCustomPageInput" style="width:36px;height:28px;text-align:center;border-radius:6px;border:1px solid var(--hairline);" type="text" name="custompage" placeholder="页码" /></a>';
      pagesHtml += '<span class="p_edge">( ' + state.page + " / " + totalPages + " · 共 " + totalItems + " 条 )</span>";
      pager.innerHTML = pagesHtml;
    }
  }

  function renderSidebar(subj) {
    var side = document.getElementById("columnInSubjectB");
    if (!side) return;
    var verbs = subj.verbs || { wishes: "想看", collections: "看过", doings: "在看", on_hold: "搁置", dropped: "抛弃" };
    var counts = subj.statusCounts || {};
    var totalCollects = (counts.wishes || 0) + (counts.collections || 0) + (counts.doings || 0) + (counts.on_hold || 0) + (counts.dropped || 0) || 1;

    var statusRows = [
      { key: "collections", label: verbs.collections, cnt: counts.collections || 0, color: "#10b981" },
      { key: "doings", label: verbs.doings, cnt: counts.doings || 0, color: "#3b82f6" },
      { key: "wishes", label: verbs.wishes, cnt: counts.wishes || 0, color: "#ec4899" },
      { key: "on_hold", label: verbs.on_hold, cnt: counts.on_hold || 0, color: "#f59e0b" },
      { key: "dropped", label: verbs.dropped, cnt: counts.dropped || 0, color: "#64748b" }
    ].map(function (r) {
      var pct = Math.min(100, Math.round((r.cnt / totalCollects) * 100));
      return (
        '<div class="bcm-st-row" data-act="switch-status" data-status="' + r.key + '" title="点击筛选「' + escHtml(r.label) + '」状态吐槽">' +
          '<div class="bcm-st-head">' +
            "<span>" + escHtml(r.label) + "</span>" +
            '<span style="font-family:var(--mono);">' + Number(r.cnt).toLocaleString() + " (" + pct + "%)</span>" +
          "</div>" +
          '<div class="bcm-hist-track"><div class="bcm-hist-fill" style="width:' + pct + '%;background:' + r.color + ';"></div></div>' +
        "</div>"
      );
    }).join("");

    var hist = subj.histogram10to1 || [100, 200, 150, 50, 20, 10, 5, 2, 1, 1];
    var maxHist = Math.max.apply(null, hist.concat([1]));
    var histRows = hist.map(function (cnt, idx) {
      var starVal = 10 - idx;
      var pct = Math.round((cnt / maxHist) * 100);
      var exactKey = "exact_" + starVal;
      var active = state.starTier === exactKey ? " is-active" : "";
      return (
        '<div class="bcm-hist-row' + active + '" data-act="switch-tier" data-tier="' + exactKey + '" title="点击仅看 ' + starVal + '★ 吐槽">' +
          '<span class="bcm-hist-label">' + starVal + "★</span>" +
          '<div class="bcm-hist-track"><div class="bcm-hist-fill" style="width:' + pct + '%;"></div></div>' +
          '<span class="bcm-hist-cnt">' + Number(cnt).toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");

    var tagFreq = {};
    getMergedComments(subj).forEach(function (c) {
      (c.tags || []).forEach(function (t) {
        tagFreq[t] = (tagFreq[t] || 0) + 1;
      });
    });
    var tagCloudHtml = Object.keys(tagFreq).map(function (t) {
      var act = state.tagFilter === t ? "border-color:var(--accent);color:var(--accent);font-weight:700;" : "";
      return '<span class="bcm-tag-chip" style="' + act + '" data-act="filter-tag" data-tag="' + escHtml(t) + '">#' + escHtml(t) + " <small>(" + tagFreq[t] + ")</small></span>";
    }).join("");

    side.innerHTML =
      '<div id="subject_inner_info" class="menu_inner clearit bcm-side-card">' +
        '<a href="subject.html?id=' + escHtml(subj.id) + '" title="' + escHtml(subj.name_cn) + '" class="avatar">' +
          '<img src="' + escHtml(subj.cover) + '" class="avatar ll" width="50" alt="' + escHtml(subj.name_cn) + '" referrerpolicy="no-referrer" />' +
        "</a>" +
        '<div class="inner">' +
          '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;">' +
            '<li><a href="subject.html?id=' + escHtml(subj.id) + '" style="font-weight:800;color:var(--fg-1);text-decoration:none;">' + escHtml(subj.name_cn) + "</a></li>" +
            '<li><a href="subject.html?id=' + escHtml(subj.id) + '" class="l" style="font-size:12.5px;color:var(--accent);text-decoration:none;font-weight:700;">/ 返回条目概览</a></li>' +
          "</ul>" +
        "</div>" +
      "</div>" +
      '<div class="bcm-side-card">' +
        '<h3 class="bcm-side-title"><span>📊 五态收藏分布</span><small style="font-weight:500;color:var(--fg-3);">点击过滤</small></h3>' +
        '<div class="bcm-status-bars">' + statusRows + "</div>" +
      "</div>" +
      '<div class="bcm-side-card">' +
        '<h3 class="bcm-side-title"><span>⭐ 十星评分透视 (10★→1★)</span><small style="font-weight:500;color:var(--fg-3);">点击过滤</small></h3>' +
        '<div class="bcm-hist-rows">' + histRows + "</div>" +
      "</div>" +
      '<div class="bcm-side-card">' +
        '<h3 class="bcm-side-title"><span>🏷️ 吐槽高频标签</span></h3>' +
        '<div class="bcm-tag-cloud">' + tagCloudHtml + "</div>" +
      "</div>" +
      '<div class="bcm-side-card">' +
        '<h3 class="bcm-side-title"><span>🧭 条目子页面直达</span></h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;">' +
          '<a href="subject.html?id=' + escHtml(subj.id) + '" class="bcm-tool-btn" style="text-align:center;text-decoration:none;">📖 条目概览</a>' +
          '<a href="subject-ep.html?id=' + escHtml(subj.id) + '" class="bcm-tool-btn" style="text-align:center;text-decoration:none;">🎬 章节列表</a>' +
          '<a href="subject-characters.html?id=' + escHtml(subj.id) + '" class="bcm-tool-btn" style="text-align:center;text-decoration:none;">👥 角色阵容</a>' +
          '<a href="subject-persons.html?id=' + escHtml(subj.id) + '" class="bcm-tool-btn" style="text-align:center;text-decoration:none;">🛠️ 制作人员</a>' +
        "</div>" +
      "</div>";
  }

  function toggleLikeReaction(cid, emojiCode) {
    var subj = getSubject();
    var all = getMergedComments(subj);
    var target = null;
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].id) === String(cid)) {
        target = all[i];
        break;
      }
    }
    if (!target) return;

    var likes = (target.likes || []).slice();
    var found = null;
    for (var j = 0; j < likes.length; j++) {
      if (String(likes[j].emoji) === String(emojiCode)) {
        found = likes[j];
        break;
      }
    }
    var meta = getReactionMeta(emojiCode);
    if (found) {
      if (found.active) {
        found.count = Math.max(0, (Number(found.count) || 1) - 1);
        found.active = false;
        showToast("已取消贴贴 " + meta.symbol + " " + meta.label);
      } else {
        found.count = (Number(found.count) || 0) + 1;
        found.active = true;
        showToast("已贴贴 " + meta.symbol + " " + meta.label + " (+1)");
      }
      likes = likes.filter(function (x) { return Number(x.count) > 0; });
    } else {
      likes.push({
        emoji: String(emojiCode),
        count: 1,
        users: ["我"],
        active: true
      });
      showToast("已贴贴 " + meta.symbol + " " + meta.label + " (+1)");
    }

    var overrides = loadJsonStorage(STORAGE_LIKES, {});
    overrides[subj.id + "_" + cid] = likes;
    saveJsonStorage(STORAGE_LIKES, overrides);
    state.openPopoverCid = null;
    renderCommentBox(subj);
  }

  function submitMyComment() {
    var subj = getSubject();
    var verbs = subj.verbs || { wishes: "想看", collections: "看过", doings: "在看", on_hold: "搁置", dropped: "抛弃" };
    var ta = document.getElementById("bcmComposerInput");
    var tagIn = document.getElementById("bcmComposerTags");
    var text = ta ? ta.value.trim() : "";
    if (!text) {
      showToast("请先输入你的简评或吐槽内容！");
      if (ta) ta.focus();
      return;
    }
    var tags = tagIn && tagIn.value.trim()
      ? tagIn.value.trim().split(/\s+/).slice(0, 6)
      : [subj.name_cn];

    var myMap = loadJsonStorage(STORAGE_MY_COMMENTS, {});
    var myItem = {
      id: "my_" + subj.id,
      uid: "me",
      nickname: "默苍离 (我)",
      avatar: "https://lain.bgm.tv/pic/user/l/000/52/98/529882.jpg",
      stars: state.myDraftStars,
      status: state.myDraftStatus,
      statusLabel: verbs[state.myDraftStatus] || "看过",
      time: "刚刚",
      comment: text,
      spoiler: text.indexOf("[mask]") >= 0,
      tags: tags,
      likes: [{ emoji: "44", count: 1, users: ["默苍离"], active: true }]
    };
    myMap[subj.id] = myItem;
    saveJsonStorage(STORAGE_MY_COMMENTS, myMap);

    state.status = "all";
    state.page = 1;
    renderAll();
    showToast("🎉 你的十星评价与吐槽已发布并置顶！");
  }

  function renderAll() {
    var subj = getSubject();
    document.title = subj.name_cn + " 的吐槽箱 · Bangumi 番组计划";
    syncNavLinks(subj.id);
    renderHeroBanner(subj);
    renderMyComposer(subj);
    renderSecTab(subj);
    renderToolbar();
    renderCommentBox(subj);
    renderSidebar(subj);
  }

  function bindEvents() {
    document.addEventListener("click", function (ev) {
      var catPill = ev.target.closest("#bannerCategoryBar [data-subject-id]");
      if (catPill) {
        ev.preventDefault();
        var catSid = catPill.getAttribute("data-subject-id");
        if (catSid && DATA.subjects[catSid]) {
          state.subjectId = catSid;
          state.status = "all";
          state.starTier = "all";
          state.tagFilter = "";
          state.page = 1;
          try { history.replaceState(null, "", "?id=" + encodeURIComponent(catSid)); } catch (e) {}
          renderAll();
          showToast("已切换至《" + DATA.subjects[catSid].name_cn + "》吐槽箱");
        }
        return;
      }
      var btn = ev.target.closest("[data-act]");
      if (!btn) {
        if (state.openPopoverCid && !ev.target.closest(".bcm-reaction-popover")) {
          state.openPopoverCid = null;
          renderCommentBox(getSubject());
        }
        return;
      }
      var act = btn.getAttribute("data-act");

      if (act === "switch-subject") {
        ev.preventDefault();
        var sid = btn.getAttribute("data-id");
        if (sid && DATA.subjects[sid]) {
          state.subjectId = sid;
          state.status = "all";
          state.starTier = "all";
          state.tagFilter = "";
          state.page = 1;
          var myMap = loadJsonStorage(STORAGE_MY_COMMENTS, {});
          if (myMap[sid]) {
            state.myDraftStatus = myMap[sid].status;
            state.myDraftStars = myMap[sid].stars;
          }
          try {
            history.replaceState(null, "", "?id=" + encodeURIComponent(sid));
          } catch (e) {}
          renderAll();
          showToast("已切换至《" + DATA.subjects[sid].name_cn + "》吐槽箱");
        }
      } else if (act === "switch-status") {
        ev.preventDefault();
        var st = btn.getAttribute("data-status") || "all";
        state.status = st;
        state.page = 1;
        renderSecTab(getSubject());
        renderCommentBox(getSubject());
      } else if (act === "switch-tier") {
        ev.preventDefault();
        var tier = btn.getAttribute("data-tier") || "all";
        state.starTier = state.starTier === tier && tier !== "all" ? "all" : tier;
        state.page = 1;
        renderToolbar();
        renderCommentBox(getSubject());
        renderSidebar(getSubject());
      } else if (act === "filter-tag") {
        ev.preventDefault();
        var tg = btn.getAttribute("data-tag") || "";
        state.tagFilter = state.tagFilter === tg ? "" : tg;
        state.page = 1;
        renderToolbar();
        renderCommentBox(getSubject());
        renderSidebar(getSubject());
      } else if (act === "clear-tag") {
        ev.preventDefault();
        state.tagFilter = "";
        state.page = 1;
        renderToolbar();
        renderCommentBox(getSubject());
        renderSidebar(getSubject());
      } else if (act === "toggle-spoiler-only") {
        ev.preventDefault();
        state.spoilerOnly = !state.spoilerOnly;
        state.page = 1;
        renderToolbar();
        renderCommentBox(getSubject());
      } else if (act === "toggle-reveal-all") {
        ev.preventDefault();
        state.revealAllSpoilers = !state.revealAllSpoilers;
        renderToolbar();
        renderCommentBox(getSubject());
      } else if (act === "toggle-spoiler") {
        ev.preventDefault();
        btn.classList.toggle("is-revealed");
      } else if (act === "open-like-popover") {
        ev.preventDefault();
        ev.stopPropagation();
        var cid = btn.getAttribute("data-id");
        state.openPopoverCid = state.openPopoverCid === String(cid) ? null : String(cid);
        renderCommentBox(getSubject());
      } else if (act === "pick-reaction") {
        ev.preventDefault();
        ev.stopPropagation();
        toggleLikeReaction(btn.getAttribute("data-cid"), btn.getAttribute("data-emoji"));
      } else if (act === "toggle-like") {
        ev.preventDefault();
        toggleLikeReaction(btn.getAttribute("data-cid"), btn.getAttribute("data-emoji"));
      } else if (act === "goto-page") {
        ev.preventDefault();
        var p = parseInt(btn.getAttribute("data-page"), 10);
        if (p > 0) {
          state.page = p;
          renderCommentBox(getSubject());
        }
      } else if (act === "reset-filters") {
        ev.preventDefault();
        state.status = "all";
        state.starTier = "all";
        state.tagFilter = "";
        state.keyword = "";
        state.spoilerOnly = false;
        state.page = 1;
        renderAll();
      } else if (act === "draft-status") {
        ev.preventDefault();
        state.myDraftStatus = btn.getAttribute("data-status") || "collections";
        $$(".bcm-status-opt").forEach(function (el) {
          el.classList.toggle("is-active", el.getAttribute("data-status") === state.myDraftStatus);
        });
      } else if (act === "draft-star") {
        ev.preventDefault();
        var starNum = parseInt(btn.getAttribute("data-star"), 10) || 0;
        state.myDraftStars = starNum;
        $$(".bcm-star-btn").forEach(function (el) {
          var v = parseInt(el.getAttribute("data-star"), 10) || 0;
          el.classList.toggle("is-lit", v <= starNum);
        });
        var ro = document.getElementById("bcmDraftStarReadout");
        if (ro) {
          ro.textContent = starNum > 0 ? (tenStarString(starNum) + " " + starNum + " / 10") : "未评分";
        }
      } else if (act === "insert-mask") {
        ev.preventDefault();
        var ta = document.getElementById("bcmComposerInput");
        if (ta) {
          var start = ta.selectionStart || 0;
          var end = ta.selectionEnd || 0;
          var sel = ta.value.substring(start, end) || "此处填写剧透内容";
          ta.value = ta.value.substring(0, start) + "[mask]" + sel + "[/mask]" + ta.value.substring(end);
          ta.focus();
        }
      } else if (act === "submit-my-comment") {
        ev.preventDefault();
        submitMyComment();
      }
    });

    document.addEventListener("input", function (ev) {
      if (ev.target && ev.target.id === "bcmSearchInput") {
        state.keyword = ev.target.value.trim();
        state.page = 1;
        renderCommentBox(getSubject());
      }
    });

    document.addEventListener("change", function (ev) {
      if (ev.target && ev.target.id === "bcmSortSelect") {
        state.sortBy = ev.target.value || "latest";
        state.page = 1;
        renderCommentBox(getSubject());
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.target && ev.target.id === "bcmCustomPageInput" && ev.key === "Enter") {
        ev.preventDefault();
        var p = parseInt(ev.target.value, 10);
        if (p > 0) {
          state.page = p;
          renderCommentBox(getSubject());
        }
      }
    });
  }

  function init() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var qId = params.get("id");
      if (qId && DATA.subjects[qId]) {
        state.subjectId = qId;
      }
      var qSt = params.get("status") || params.get("interest_type");
      if (qSt && ["all", "wishes", "collections", "doings", "on_hold", "dropped"].indexOf(qSt) >= 0) {
        state.status = qSt;
      }
    } catch (e) {}

    var myMap = loadJsonStorage(STORAGE_MY_COMMENTS, {});
    if (myMap[state.subjectId]) {
      state.myDraftStatus = myMap[state.subjectId].status;
      state.myDraftStars = myMap[state.subjectId].stars;
    }

    renderAll();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
