/* ==========================================================================
   bangumi-explore.js · E4 (Page 29: 维基人 /wiki · MAGI 问答 /magi · Dollars 聊天室 /dollars)
   ========================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "bgm_explore_state_v1";
  var DATA = (typeof window !== "undefined" && window.BANGUMI_EXPLORE_DATA) || {};

  var state = {
    mode: "wiki", // wiki | magi | dollars
    wikiSub: "feed", // feed | images | tags | rank | candidates | stats | user_wiki
    magiCat: "all", // all | sci | anime | game | music | lit
    magiQuizIdx: 0,
    magiSelectedOpt: null,
    magiSubmitted: false,
    magiCreating: false,
    candidateVotes: {},
    magiHistory: {},
    customQuizzes: [],
    dollarsMessages: [],
    dollarsColor: "#ff6584"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    var box = $("toastContainer");
    if (!box) return;
    var el = document.createElement("div");
    el.className = "glass-toast";
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2800);
  }

  function loadStorage() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.candidateVotes) state.candidateVotes = parsed.candidateVotes;
        if (parsed.magiHistory) state.magiHistory = parsed.magiHistory;
        if (Array.isArray(parsed.customQuizzes)) state.customQuizzes = parsed.customQuizzes;
        if (Array.isArray(parsed.dollarsMessages)) state.dollarsMessages = parsed.dollarsMessages;
        if (parsed.dollarsColor) state.dollarsColor = parsed.dollarsColor;
      }
    } catch (e) {}
  }

  function saveStorage() {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          candidateVotes: state.candidateVotes,
          magiHistory: state.magiHistory,
          customQuizzes: state.customQuizzes,
          dollarsMessages: state.dollarsMessages,
          dollarsColor: state.dollarsColor
        })
      );
    } catch (e) {}
  }

  function parseUrlParams() {
    try {
      var sp = new URLSearchParams((window.location && window.location.search) || "");
      var m = sp.get("mode");
      if (m === "wiki" || m === "magi" || m === "dollars") {
        state.mode = m;
      }
      var sub = sp.get("sub");
      if (sub && ["feed", "images", "tags", "rank", "candidates", "stats", "user_wiki"].indexOf(sub) >= 0) {
        state.wikiSub = sub;
      }
      var cat = sp.get("cat");
      if (cat && ["all", "sci", "anime", "game", "music", "lit"].indexOf(cat) >= 0) {
        state.magiCat = cat;
      }
      if (sp.get("create") === "1") {
        state.mode = "magi";
        state.magiCreating = true;
      }
    } catch (e) {}
  }

  function syncUrl() {
    try {
      if (!window.history || !window.history.replaceState) return;
      var params = [];
      params.push("mode=" + encodeURIComponent(state.mode));
      if (state.mode === "wiki" && state.wikiSub !== "feed") {
        params.push("sub=" + encodeURIComponent(state.wikiSub));
      }
      if (state.mode === "magi" && state.magiCat !== "all") {
        params.push("cat=" + encodeURIComponent(state.magiCat));
      }
      var qs = params.length ? "?" + params.join("&") : "";
      window.history.replaceState(null, "", "explore.html" + qs);
    } catch (e) {}
  }

  /* ==================== Top Hero & Mode Switching ==================== */
  function renderHeroAndTabs() {
    var tabW = $("bexTabWiki");
    var tabM = $("bexTabMagi");
    var tabD = $("bexTabDollars");
    if (tabW) tabW.className = state.mode === "wiki" ? "focus" : "";
    if (tabM) tabM.className = state.mode === "magi" ? "focus" : "";
    if (tabD) tabD.className = state.mode === "dollars" ? "focus" : "";

    var vW = $("bexWikiView");
    var vM = $("bexMagiView");
    var vD = $("bexDollarsView");
    if (vW) vW.hidden = state.mode !== "wiki";
    if (vM) vM.hidden = state.mode !== "magi";
    if (vD) vD.hidden = state.mode !== "dollars";

    var kicker = $("bexHeroKicker");
    var title = $("bexHeroTitle");
    if (kicker && title) {
      if (state.mode === "wiki") {
        kicker.textContent = "BANGUMI WIKI CENTER · /wiki";
        title.textContent = "维基人工作台 · 条目修订、最新创建与协力贡献榜";
      } else if (state.mode === "magi") {
        kicker.textContent = "MAGI SUPERCOMPUTER QUIZ · /magi";
        title.textContent = "MAGI 问答挑战 · 三核同步率测评与题库工坊";
      } else {
        kicker.textContent = "IKEBUKURO DOLLARS CHAT · /dollars";
        title.textContent = "DOLLARS 实时聊天室 · 无色透明的番组电波流";
      }
    }

    var allQuizzes = getAllQuizzes();
    var badgeMagi = $("bexBadgeMagi");
    if (badgeMagi) badgeMagi.textContent = allQuizzes.length + " 题";
  }

  /* ==================== 1. Wiki View (/wiki) ==================== */
  function renderWikiView() {
    var wiki = DATA.wiki || {};
    var subTabs = $("bexWikiSubTabs");
    if (subTabs) {
      var links = subTabs.querySelectorAll ? subTabs.querySelectorAll("a[data-sub]") : [];
      for (var i = 0; i < links.length; i++) {
        var s = links[i].getAttribute("data-sub");
        links[i].className = s === state.wikiSub ? "focus" : "";
      }
    }

    var tri = $("bexWikiTriColumns");
    var subPanel = $("bexWikiSubPanel");
    if (state.wikiSub === "feed") {
      if (tri) tri.hidden = false;
      if (subPanel) subPanel.hidden = true;
      renderWikiTriColumns(wiki);
    } else {
      if (tri) tri.hidden = true;
      if (subPanel) {
        subPanel.hidden = false;
        renderWikiSubPanel(wiki, subPanel);
      }
    }
  }

  function renderWikiTriColumns(wiki) {
    var revs = wiki.recentRevisions || wiki.revisions || [];
    var revList = $("bexWikiRevList");
    if (revList) {
      var rHtml = [];
      for (var i = 0; i < revs.length; i++) {
        var r = revs[i];
        var subjTitle = r.subjectTitle || r.title || "条目";
        var catLbl = r.catLabel || r.category || "动画";
        var edUid = r.editorUid || r.uid || "sai";
        var revTag = r.revNew || r.revId || "r1";
        rHtml.push(
          '<li class="bex-rev-item">' +
            '<div class="bex-rev-top">' +
              '<a class="bex-rev-subj" href="subject.html?id=' + esc(r.subjectId) + '">[' + esc(catLbl) + "] " + esc(subjTitle) + "</a>" +
              '<a class="btnGraySmall" href="subject-wiki.html?id=' + esc(r.subjectId) + '&rev=' + esc(revTag) + '" data-act="wiki-diff" data-rev-idx="' + i + '">对比</a>' +
            "</div>" +
            '<div class="bex-rev-summary">' + esc(r.summary) + "</div>" +
            '<div class="bex-rev-meta">' +
              '<a class="bex-rev-user" href="user.html?uid=' + esc(edUid) + '">' +
                '<img src="' + esc(r.avatar) + '" alt="' + esc(r.editor) + '" referrerpolicy="no-referrer" />' +
                "<span>" + esc(r.editor) + "</span>" +
              "</a>" +
              "<span>" + esc(revTag) + " · " + esc(r.time) + "</span>" +
            "</div>" +
          "</li>"
        );
      }
      revList.innerHTML = rHtml.join("");
    }

    var creates = wiki.recentCreations || wiki.creations || [];
    var createList = $("bexWikiCreateList");
    if (createList) {
      var cHtml = [];
      for (var j = 0; j < creates.length; j++) {
        var c = creates[j];
        var cCat = c.catLabel || c.type || "动画";
        var isMusic = cCat === "音乐";
        var sid = c.subjectId || c.id || "400602";
        var cUid = c.creatorUid || c.uid || "sai";
        var cName = c.creatorName || c.creator || "维基人";
        var cAva = c.creatorAvatar || c.avatar || "";
        var cTip = c.infoTip || c.action || c.type || "";
        var cTime = c.timeAgo || c.time || "刚刚";
        cHtml.push(
          '<li class="bex-create-item">' +
            (c.cover
              ? '<img class="bex-create-cover' + (isMusic ? " is-music" : "") + '" src="' + esc(c.cover) + '" alt="' + esc(c.title) + '" referrerpolicy="no-referrer" />'
              : '<div class="bex-create-cover"></div>') +
            '<div class="bex-create-body">' +
              '<a class="bex-create-title" href="subject.html?id=' + esc(sid) + '">' + esc(c.title) + "</a>" +
              '<div class="bex-create-tip">[' + esc(cCat) + "] " + esc(cTip) + "</div>" +
              '<div class="bex-rev-meta">' +
                '<a class="bex-rev-user" href="user.html?uid=' + esc(cUid) + '">' +
                  (cAva ? '<img src="' + esc(cAva) + '" alt="' + esc(cName) + '" referrerpolicy="no-referrer" />' : "") +
                  "<span>" + esc(cName) + "</span>" +
                "</a>" +
                "<span>" + esc(cTime) + "</span>" +
              "</div>" +
            "</div>" +
          "</li>"
        );
      }
      createList.innerHTML = cHtml.join("");
    }

    var contributors = wiki.contributors || [];
    var rankList = $("bexWikiRankList");
    if (rankList) {
      var kHtml = [];
      for (var k = 0; k < contributors.length; k++) {
        var u = contributors[k];
        kHtml.push(
          '<li class="bex-rank-item">' +
            '<span class="bex-rank-num">' + esc(u.rank) + "</span>" +
            '<img class="bex-rank-ava" src="' + esc(u.avatar) + '" alt="' + esc(u.name) + '" referrerpolicy="no-referrer" />' +
            '<div class="bex-rank-info">' +
              '<a class="bex-rank-name" href="user.html?uid=' + esc(u.uid) + '">' + esc(u.name) + "</a>" +
              '<span class="bex-rank-badge">' + esc(u.badge) + "</span>" +
            "</div>" +
            '<div class="bex-rank-count">' +
              "<div>" + esc(u.edits) + " 次修订</div>" +
              '<div style="font-size:11px;color:var(--bex-text-muted);font-weight:600;">新建 ' + esc(u.created) + "</div>" +
            "</div>" +
          "</li>"
        );
      }
      rankList.innerHTML = kHtml.join("");
    }
  }

  function renderWikiSubPanel(wiki, box) {
    if (state.wikiSub === "images") {
      var imgs = wiki.latestImages || wiki.recentCreations || [];
      var cards = [];
      for (var i = 0; i < imgs.length; i++) {
        var it = imgs[i];
        var title = it.title || "条目封面";
        var sid = it.subjectId || it.id || "400602";
        var editor = it.uploader || it.creator || "维基人";
        cards.push(
          '<div style="padding:12px;border-radius:16px;background:var(--bex-surface-soft);border:1px solid var(--bex-border);display:flex;flex-direction:column;gap:8px;">' +
            '<img src="' + esc(it.cover) + '" alt="' + esc(title) + '" referrerpolicy="no-referrer" style="width:100%;height:190px;object-fit:cover;border-radius:12px;" />' +
            '<a href="subject.html?id=' + esc(sid) + '" style="font-size:13px;font-weight:800;color:var(--bex-text);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(title) + "</a>" +
            '<div style="font-size:11.5px;color:var(--bex-text-muted);display:flex;justify-content:space-between;align-items:center;">' +
              "<span>上传：" + esc(editor) + "</span>" +
              '<a href="subject-wiki.html?id=' + esc(sid) + '&tab=cover" class="btnGraySmall">封面管理</a>' +
            "</div>" +
          "</div>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head"><h2 class="bex-card-title">🖼️ 最新上传维基封面与剧照</h2><span style="font-size:12px;color:var(--bex-text-muted);">共收录高清主视觉图 ' + imgs.length + " 幅</span></div>" +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;">' + cards.join("") + "</div>";
      return;
    }

    if (state.wikiSub === "tags") {
      var tags = wiki.hotTags || [];
      var tHtml = [];
      for (var t = 0; t < tags.length; t++) {
        var tg = tags[t];
        tHtml.push(
          '<a href="tag.html?q=' + encodeURIComponent(tg.name) + '" style="padding:10px 16px;border-radius:14px;background:var(--bex-surface-soft);border:1px solid var(--bex-border);text-decoration:none;display:inline-flex;align-items:center;gap:8px;">' +
            '<strong style="font-size:14px;color:var(--bex-text);">#' + esc(tg.name) + "</strong>" +
            '<span style="font-size:11.5px;color:var(--accent,#f09199);font-weight:700;">' + esc(tg.count) + " 条目</span>" +
          "</a>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head"><h2 class="bex-card-title">🏷️ 全站维基热门元标签云</h2><a href="tag.html" class="btnGraySmall">进入标签广场 (P05) »</a></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;">' + tHtml.join("") + "</div>";
      return;
    }

    if (state.wikiSub === "rank") {
      var list = wiki.contributors || [];
      var rows = [];
      for (var r = 0; r < list.length; r++) {
        var c = list[r];
        rows.push(
          '<li class="bex-rank-item">' +
            '<span class="bex-rank-num">' + esc(c.rank) + "</span>" +
            '<img class="bex-rank-ava" src="' + esc(c.avatar) + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer" />' +
            '<div class="bex-rank-info">' +
              '<a class="bex-rank-name" href="user.html?uid=' + esc(c.uid) + '">' + esc(c.name) + " (@" + esc(c.uid) + ")</a>" +
              '<span class="bex-rank-badge">' + esc(c.badge) + "</span>" +
            "</div>" +
            '<div class="bex-rank-count">修订 ' + esc(c.edits) + " · 创建 " + esc(c.created) + " · 封面 " + esc(c.images) + "</div>" +
          "</li>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head"><h2 class="bex-card-title">🏆 全站维基人协力贡献总榜</h2><span style="font-size:12px;color:var(--bex-text-muted);">按历史累计修订与新建条目加权统计</span></div>' +
        '<ul class="bex-rank-list">' + rows.join("") + "</ul>";
      return;
    }

    if (state.wikiSub === "candidates") {
      var cands = wiki.candidates || [];
      var cRows = [];
      for (var m = 0; m < cands.length; m++) {
        var cd = cands[m];
        var voted = state.candidateVotes[cd.uid] != null ? !!state.candidateVotes[cd.uid] : !!cd.voted;
        var votes = cd.votes + (voted && !cd.voted ? 1 : 0);
        cRows.push(
          '<li class="bex-rev-item">' +
            '<div class="bex-rev-top">' +
              '<a class="bex-rev-user" href="user.html?uid=' + esc(cd.uid) + '">' +
                '<img src="' + esc(cd.avatar) + '" alt="' + esc(cd.name) + '" referrerpolicy="no-referrer" style="width:32px;height:32px;" />' +
                '<strong style="font-size:14px;color:var(--bex-text);">' + esc(cd.name) + "</strong>" +
                '<span style="font-size:12px;color:var(--bex-text-muted);">推荐人：' + esc(cd.Recommender || "维基人") + " · 累计编辑 " + esc(cd.edits) + " 次</span>" +
              "</a>" +
              '<button type="button" class="btnGraySmall" data-act="vote-candidate" data-uid="' + esc(cd.uid) + '">' +
                (voted ? "✅ 已支持 (" + votes + " 票)" : "👍 投支持票 (" + votes + " 票)") +
              "</button>" +
            "</div>" +
            '<div class="bex-rev-summary">专精领域：' + esc(cd.field || cd.reason || "条目校对") + "</div>" +
          "</li>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head"><h2 class="bex-card-title">🗳️ 维基人晋升候选公示与声援</h2><span style="font-size:12px;color:var(--bex-text-muted);">满 30 票并通过番組 WIKI 計画审核后授予正式维基人权限</span></div>' +
        '<ul class="bex-rev-list">' + cRows.join("") + "</ul>";
      return;
    }

    if (state.wikiSub === "stats") {
      var ch = wiki.siteStats || (wiki.stats && wiki.stats.channels) || [];
      var chCards = [];
      for (var n = 0; n < ch.length; n++) {
        var item = ch[n];
        var lbl = item.channel || item.label || "频道";
        var tot = item.total || item.subjects || 0;
        var eds = item.editsMonth || item.edits || 0;
        chCards.push(
          '<div style="padding:16px;border-radius:16px;background:var(--bex-surface-soft);border:1px solid var(--bex-border);">' +
            '<div style="font-size:12px;color:var(--bex-text-muted);">' + esc(lbl) + "</div>" +
            '<div style="font-size:22px;font-weight:800;color:var(--bex-text);margin:4px 0;">' + esc(tot.toLocaleString()) + " 条目</div>" +
            '<div style="font-size:12px;color:var(--accent,#f09199);font-weight:700;">本月修订 ' + esc(eds.toLocaleString()) + " 次</div>" +
          "</div>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head"><h2 class="bex-card-title">📊 全站维基资料库数据透视</h2><a href="stats.html" class="btnGraySmall">打开透视统计中心 (P06) »</a></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">' + chCards.join("") + "</div>";
      return;
    }

    if (state.wikiSub === "user_wiki") {
      var hist = wiki.saiHistory || wiki.userWikiHistory || [];
      var hRows = [];
      for (var p = 0; p < hist.length; p++) {
        var h = hist[p];
        var cls = p % 2 === 0 ? "line_even" : "line_odd";
        var bdg = h.action || h.badge || "编辑";
        var cmt = h.comment || h.scope || "修订条目";
        hRows.push(
          '<li class="' + cls + '">' +
            '<h6><a href="subject.html?id=' + esc(h.subjectId) + '">' + esc(h.title) + '</a> <small class="tip_j alarm">' + esc(bdg) + "</small></h6>" +
            '<small class="grey">' + esc(cmt) + " · " + esc(h.time || "") + " · 维基人：" + esc(h.editor || "Sai") + "</small>" +
          "</li>"
        );
      }
      box.innerHTML =
        '<div class="bex-card-head">' +
          '<h2 class="bex-card-title">🗂️ 个人维基协力履历 (/user/sai/wiki 真实样本结构)</h2>' +
          '<span style="font-size:12px;color:var(--bex-text-muted);">ul.line_list &gt; li.line_even / li.line_odd</span>' +
        "</div>" +
        '<ul class="line_list bex-line-list">' + hRows.join("") + "</ul>";
    }
  }

  function openWikiDiffModal(idx) {
    var revs = (DATA.wiki && (DATA.wiki.recentRevisions || DATA.wiki.revisions)) || [];
    var r = revs[idx] || revs[0];
    if (!r) return;
    var modal = $("bexWikiDiffModal");
    var title = $("bexDiffModalTitle");
    var meta = $("bexDiffMeta");
    var oldBox = $("bexDiffOldBox");
    var newBox = $("bexDiffNewBox");
    var link = $("bexDiffOpenWikiLink");
    var subjTitle = r.subjectTitle || r.title || "条目";
    var revTag = r.revNew || r.revId || "r1";
    var edUid = r.editorUid || r.uid || "sai";
    if (title) title.textContent = "🔍 修订版本对比 · " + subjTitle + " (" + revTag + ")";
    if (meta) {
      meta.textContent =
        "修订者：" + r.editor + " (@" + edUid + ") · 时间：" + (r.time || "") + " · 摘要：" + r.summary;
    }
    if (oldBox) {
      oldBox.textContent = r.diffBefore || ("{{Infobox Animanga/TVAnime\n|中文名= " + subjTitle + "\n|话数= 12\n}}");
    }
    if (newBox) {
      newBox.textContent = r.diffAfter || ("{{Infobox Animanga/TVAnime\n|中文名= " + subjTitle + "\n|修订说明= " + r.summary + "\n}}");
    }
    if (link) link.setAttribute("href", "subject-wiki.html?id=" + r.subjectId);
    if (modal) modal.hidden = false;
  }

  /* ==================== 2. MAGI Quiz Challenge (/magi) ==================== */
  function getAllQuizzes() {
    var base = (DATA.magi && DATA.magi.quizzes) || [];
    return state.customQuizzes.concat(base);
  }

  function getFilteredQuizzes() {
    var all = getAllQuizzes();
    if (state.magiCat === "all") return all;
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var cKey = all[i].cat || all[i].category;
      if (cKey === state.magiCat) out.push(all[i]);
    }
    return out.length ? out : all;
  }

  function renderMagiView() {
    var magi = DATA.magi || {};
    var cats = magi.categories || [];
    var catList = $("bexMagiCatList");
    if (catList) {
      var cHtml = [];
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        var cid = c.id || c.key || "all";
        var active = cid === state.magiCat ? " is-active" : "";
        cHtml.push(
          '<li><a href="explore.html?mode=magi&cat=' + esc(cid) + '" class="' + active + '" data-act="magi-cat" data-cat="' + esc(cid) + '">' +
            "<span>" + esc(c.label) + "</span>" +
            '<span style="font-size:11.5px;opacity:0.8;">' + esc(c.count) + "</span>" +
          "</a></li>"
        );
      }
      catList.innerHTML = cHtml.join("");
    }

    var cores = magi.cores || [];
    var coreBox = $("bexMagiCores");
    if (coreBox) {
      var coreHtml = [];
      for (var j = 0; j < cores.length; j++) {
        var cr = cores[j];
        coreHtml.push(
          '<div class="bex-core-pill">' +
            "<div><strong>" + esc(cr.code) + "</strong> · " + esc(cr.persona || cr.role || "") + "</div>" +
            "<strong>" + esc(cr.status) + " (" + esc(cr.sync) + "%)</strong>" +
          "</div>"
        );
      }
      coreBox.innerHTML = coreHtml.join("");
    }

    var createPanel = $("bexMagiCreatePanel");
    if (createPanel) createPanel.hidden = !state.magiCreating;

    renderCurrentQuiz();

    var leaders = magi.leaderboard || [];
    var leaderList = $("bexMagiLeaderList");
    if (leaderList) {
      var lHtml = [];
      for (var k = 0; k < leaders.length; k++) {
        var u = leaders[k];
        var sRate = u.syncRate != null ? u.syncRate : (u.rate != null ? u.rate + "%" : "90%");
        var totalAns = u.answered != null ? u.answered : (u.total != null ? u.total : 200);
        lHtml.push(
          '<li class="bex-rank-item">' +
            '<span class="bex-rank-num">' + esc(u.rank) + "</span>" +
            '<img class="bex-rank-ava" src="' + esc(u.avatar) + '" alt="' + esc(u.name) + '" referrerpolicy="no-referrer" />' +
            '<div class="bex-rank-info">' +
              '<a class="bex-rank-name" href="user.html?uid=' + esc(u.uid) + '">' + esc(u.name) + "</a>" +
              '<span class="bex-rank-badge">答对 ' + esc(u.correct) + " / " + esc(totalAns) + "</span>" +
            "</div>" +
            '<div class="bex-rank-count">' + esc(sRate) + "</div>" +
          "</li>"
        );
      }
      leaderList.innerHTML = lHtml.join("");
    }

    var allQ = getAllQuizzes();
    var recentList = $("bexMagiRecentList");
    if (recentList) {
      var rHtml = [];
      for (var q = 0; q < allQ.length; q++) {
        var item = allQ[q];
        var hist = state.magiHistory[item.id];
        var statusTag = hist
          ? hist.correct
            ? '<span style="color:#10b981;font-weight:800;">✓ 已通过</span>'
            : '<span style="color:#ef4444;font-weight:800;">✗ 待重挑战</span>'
          : '<span style="color:var(--bex-text-muted);">未作答</span>';
        var qTitle = item.question || item.title || "";
        var cLabel = item.catLabel || item.categoryLabel || "动漫";
        rHtml.push(
          '<li class="bex-rev-item" style="cursor:pointer;" data-act="magi-pick-quiz" data-qid="' + esc(item.id) + '">' +
            '<div class="bex-rev-top">' +
              '<span class="bex-quiz-badge">' + esc(cLabel) + "</span>" +
              statusTag +
            "</div>" +
            '<div class="bex-rev-summary" style="font-weight:700;color:var(--bex-text);">' + esc(item.id) + " · " + esc(qTitle) + "</div>" +
          "</li>"
        );
      }
      recentList.innerHTML = rHtml.join("");
    }
  }

  function getQuizAnswerIdx(q) {
    return q.answerIndex != null ? q.answerIndex : (q.answer != null ? q.answer : 0);
  }

  function renderCurrentQuiz() {
    var list = getFilteredQuizzes();
    if (!list.length) return;
    if (state.magiQuizIdx >= list.length) state.magiQuizIdx = 0;
    var q = list[state.magiQuizIdx];
    var ansIdx = getQuizAnswerIdx(q);

    var catBadge = $("bexQuizCatBadge");
    var idText = $("bexQuizIdText");
    var authorEl = $("bexQuizAuthor");
    var rateEl = $("bexQuizPassRate");
    var qEl = $("bexQuizQuestion");
    var optBox = $("bexQuizOptions");
    var fbBox = $("bexQuizFeedback");

    if (catBadge) catBadge.textContent = q.catLabel || q.categoryLabel || "动漫";
    if (idText) idText.textContent = String(q.id) + " (" + (state.magiQuizIdx + 1) + "/" + list.length + ")";
    if (authorEl) authorEl.textContent = q.author || "少年游";
    if (rateEl) rateEl.textContent = (q.passRate || "78.4") + (String(q.passRate).indexOf("%") >= 0 ? "" : "%");
    if (qEl) qEl.textContent = q.question || q.title || "";

    var letters = ["A", "B", "C", "D"];
    if (optBox) {
      var oHtml = [];
      for (var i = 0; i < (q.options || []).length; i++) {
        var cls = "bex-quiz-opt";
        var checked = state.magiSelectedOpt === i ? " checked" : "";
        if (state.magiSelectedOpt === i) cls += " is-selected";
        if (state.magiSubmitted) {
          if (i === ansIdx) cls += " is-correct";
          else if (state.magiSelectedOpt === i) cls += " is-wrong";
        }
        var optText = String(q.options[i]);
        oHtml.push(
          '<label class="' + cls + '" data-act="magi-select-opt" data-opt="' + i + '">' +
            '<input type="radio" name="answer" value="' + i + '"' + checked + " />" +
            "<span>" + esc(optText) + "</span>" +
          "</label>"
        );
      }
      optBox.innerHTML = oHtml.join("");
    }

    if (fbBox) {
      if (state.magiSubmitted) {
        var isRight = state.magiSelectedOpt === ansIdx;
        fbBox.hidden = false;
        fbBox.innerHTML =
          "<strong>" +
          (isRight
            ? "🎉 MAGI 三核全票通过（CONDITIONAL APPROVAL）：回答正确！"
            : "⚠️ MAGI 判定偏离（REJECTED）：正确答案是 " + letters[ansIdx]) +
          "</strong><br/>" +
          esc(q.explanation || "");
      } else {
        fbBox.hidden = true;
      }
    }
  }

  function submitMagiAnswer() {
    var list = getFilteredQuizzes();
    var q = list[state.magiQuizIdx];
    if (!q) return;
    if (state.magiSelectedOpt == null) {
      showToast("请先选择一个选项再点击「回答」");
      return;
    }
    var ansIdx = getQuizAnswerIdx(q);
    state.magiSubmitted = true;
    var ok = state.magiSelectedOpt === ansIdx;
    state.magiHistory[q.id] = { choice: state.magiSelectedOpt, correct: ok };
    saveStorage();
    renderMagiView();
    showToast(ok ? "🧠 MAGI 同步率提升！回答正确" : "MAGI 判定未通过，已展开考据解析");
  }

  function skipMagiQuestion() {
    var list = getFilteredQuizzes();
    if (!list.length) return;
    state.magiQuizIdx = (state.magiQuizIdx + 1) % list.length;
    state.magiSelectedOpt = null;
    state.magiSubmitted = false;
    renderCurrentQuiz();
    showToast("已跳过当前问题，切换至下一题");
  }

  function saveNewQuiz() {
    var titleEl = $("bexNewQuizTitle");
    var catEl = $("bexNewQuizCat");
    var ansEl = $("bexNewQuizAns");
    var expEl = $("bexNewQuizExp");
    var o0 = $("bexNewQuizOpt0");
    var o1 = $("bexNewQuizOpt1");
    var o2 = $("bexNewQuizOpt2");
    var o3 = $("bexNewQuizOpt3");

    var qText = titleEl && titleEl.value ? titleEl.value.trim() : "";
    if (!qText) {
      showToast("请填写新题目的题干描述");
      return;
    }
    var catMap = { anime: "动漫", game: "游戏", music: "音乐", lit: "文学", sci: "科学" };
    var catId = (catEl && catEl.value) || "anime";
    var newQ = {
      id: "q_" + (2000 + state.customQuizzes.length + 1),
      category: catId,
      categoryLabel: catMap[catId] || "动漫",
      title: qText,
      options: [
        "A. " + ((o0 && o0.value.trim()) || "选项 A"),
        "B. " + ((o1 && o1.value.trim()) || "选项 B"),
        "C. " + ((o2 && o2.value.trim()) || "选项 C"),
        "D. " + ((o3 && o3.value.trim()) || "选项 D")
      ],
      answer: parseInt((ansEl && ansEl.value) || "1", 10) || 0,
      author: "少年游",
      authorUid: "553488",
      passRate: 100.0,
      totalAttempts: 1,
      explanation: (expEl && expEl.value.trim()) || "由用户在 MAGI 题库工坊创建。"
    };
    state.customQuizzes.unshift(newQ);
    state.magiCreating = false;
    state.magiCat = "all";
    state.magiQuizIdx = 0;
    state.magiSelectedOpt = null;
    state.magiSubmitted = false;
    saveStorage();
    renderHeroAndTabs();
    renderMagiView();
    showToast("✨ 新题目 " + newQ.id + " 已收录至 MAGI 题库！");
  }

  /* ==================== 3. Dollars Chatroom (/dollars) ==================== */
  function getDollarsStream() {
    var base = (DATA.dollars && DATA.dollars.messages) || [];
    return state.dollarsMessages.concat(base);
  }

  function renderDollarsView() {
    var d = DATA.dollars || {};
    var quickBar = $("bexDollarsQuickBar");
    if (quickBar) {
      var phrases = d.quickPhrases || [];
      var pHtml = [];
      for (var i = 0; i < phrases.length; i++) {
        pHtml.push(
          '<button type="button" class="bex-dollars-chip" data-act="dollars-phrase" data-phrase="' + esc(phrases[i]) + '">' +
            esc(phrases[i]) +
          "</button>"
        );
      }
      quickBar.innerHTML = pHtml.join("");
    }

    var colorSel = $("bexDollarsColorSelect");
    if (colorSel) colorSel.value = state.dollarsColor;

    var chatList = $("chatList");
    if (chatList) {
      var msgs = getDollarsStream();
      var mHtml = [];
      for (var j = 0; j < msgs.length; j++) {
        var m = msgs[j];
        var ring = m.color || "#38bdf8";
        mHtml.push(
          '<div class="bex-chat-item" data-msg-id="' + esc(m.id) + '">' +
            '<img class="bex-chat-ava" src="' + esc(m.avatar) + '" alt="' + esc(m.user) + '" referrerpolicy="no-referrer" style="border-color:' + esc(ring) + ';" />' +
            '<div class="bex-chat-body">' +
              '<div class="bex-chat-meta">' +
                '<div><span class="bex-chat-user" style="color:' + esc(ring) + ';">' + esc(m.user) + "</span> <span>@" + esc(m.uid) + "</span></div>" +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                  "<span>" + esc(m.time) + "</span>" +
                  '<button type="button" class="bex-dollars-chip" data-act="dollars-mention" data-user="' + esc(m.user) + '">@呼叫</button>' +
                "</div>" +
              "</div>" +
              '<div class="bex-chat-text">' + esc(m.text) + "</div>" +
            "</div>" +
          "</div>"
        );
      }
      chatList.innerHTML = mHtml.join("");
    }
  }

  function postDollarsMessage(customText) {
    var input = $("bexDollarsInput");
    var text = typeof customText === "string" ? customText : input && input.value ? input.value.trim() : "";
    if (!text) {
      showToast("请输入要发送到 DOLLARS 频道的电波内容");
      return;
    }
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    var ss = String(now.getSeconds()).padStart(2, "0");
    var msg = {
      id: "dl_usr_" + Date.now(),
      user: "少年游",
      uid: "553488",
      avatar: "https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1",
      color: state.dollarsColor || "#ff6584",
      time: hh + ":" + mm + ":" + ss,
      text: text
    };
    state.dollarsMessages.unshift(msg);
    if (input && typeof customText !== "string") input.value = "";
    saveStorage();
    renderDollarsView();
    showToast("📡 DOLLARS 电波已发射：POST!");
  }

  function simulateIncomingWave() {
    var pool = [
      {
        user: "セルティ (无头骑士)",
        uid: "celty_dullahan",
        avatar: "https://lain.bgm.tv/pic/user/l/000/01/00/10001.jpg",
        color: "#facc15",
        text: "【PDA 终端消息】池袋西口今晚一切平静，顺便把昨晚看的那集十星番组标记为看过了。"
      },
      {
        user: "Sai",
        uid: "sai",
        avatar: "https://lain.bgm.tv/pic/user/l/000/00/00/1.jpg?r=1391790456",
        color: "#ff6584",
        text: "DOLLARS 信道延迟 12ms，欢迎各位维基人与考据党来 /magi 贡献新题目 📺"
      },
      {
        user: "单茗",
        uid: "552375",
        avatar: "https://lain.bgm.tv/pic/user/l/000/55/23/552375.jpg?r=1726384776&hd=1",
        color: "#38bdf8",
        text: "刚刚更新了「系列关联网」超合金组件，现在支持从条目页一键跳转到 /wiki 修订对比了！"
      }
    ];
    var pick = pool[state.dollarsMessages.length % pool.length];
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    var ss = String(now.getSeconds()).padStart(2, "0");
    state.dollarsMessages.unshift({
      id: "dl_sim_" + Date.now(),
      user: pick.user,
      uid: pick.uid,
      avatar: pick.avatar,
      color: pick.color,
      time: hh + ":" + mm + ":" + ss,
      text: pick.text
    });
    saveStorage();
    renderDollarsView();
    showToast("📡 接收到来自 @" + pick.user + " 的池袋电波");
  }

  /* ==================== Event Delegation ==================== */
  function renderAll() {
    renderHeroAndTabs();
    renderWikiView();
    renderMagiView();
    renderDollarsView();
  }

  function bindEvents() {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      var actEl = t && t.closest ? t.closest("[data-act]") : null;
      if (!actEl) return;
      var act = actEl.getAttribute("data-act");

      if (act === "switch-mode") {
        ev.preventDefault();
        var m = actEl.getAttribute("data-mode");
        if (m) {
          state.mode = m;
          syncUrl();
          renderAll();
        }
      } else if (act === "wiki-sub") {
        ev.preventDefault();
        var sub = actEl.getAttribute("data-sub");
        if (sub) {
          state.mode = "wiki";
          state.wikiSub = sub;
          syncUrl();
          renderAll();
        }
      } else if (act === "wiki-diff") {
        ev.preventDefault();
        var idx = parseInt(actEl.getAttribute("data-rev-idx") || "0", 10) || 0;
        openWikiDiffModal(idx);
      } else if (act === "close-wiki-diff") {
        ev.preventDefault();
        var modal = $("bexWikiDiffModal");
        if (modal) modal.hidden = true;
      } else if (act === "vote-candidate") {
        ev.preventDefault();
        var uid = actEl.getAttribute("data-uid");
        if (uid) {
          state.candidateVotes[uid] = !state.candidateVotes[uid];
          saveStorage();
          renderWikiView();
          showToast(state.candidateVotes[uid] ? "👍 已为该维基人候选人投出支持票" : "已撤回候选支持票");
        }
      } else if (act === "magi-cat") {
        ev.preventDefault();
        var cat = actEl.getAttribute("data-cat") || "all";
        state.magiCat = cat;
        state.magiQuizIdx = 0;
        state.magiSelectedOpt = null;
        state.magiSubmitted = false;
        syncUrl();
        renderMagiView();
      } else if (act === "magi-select-opt") {
        var optIdx = parseInt(actEl.getAttribute("data-opt") || "0", 10);
        if (!isNaN(optIdx)) {
          state.magiSelectedOpt = optIdx;
          renderCurrentQuiz();
        }
      } else if (act === "magi-answer") {
        ev.preventDefault();
        submitMagiAnswer();
      } else if (act === "magi-skip" || act === "magi-next") {
        ev.preventDefault();
        skipMagiQuestion();
      } else if (act === "magi-open-create") {
        ev.preventDefault();
        state.magiCreating = true;
        renderMagiView();
        showToast("已展开 /magi/create 出题工坊");
      } else if (act === "magi-close-create") {
        ev.preventDefault();
        state.magiCreating = false;
        renderMagiView();
      } else if (act === "magi-save-quiz") {
        ev.preventDefault();
        saveNewQuiz();
      } else if (act === "magi-pick-quiz") {
        ev.preventDefault();
        var qid = actEl.getAttribute("data-qid") || "";
        var list = getFilteredQuizzes();
        for (var i = 0; i < list.length; i++) {
          if (String(list[i].id) === String(qid)) {
            state.magiQuizIdx = i;
            state.magiSelectedOpt = null;
            state.magiSubmitted = false;
            renderCurrentQuiz();
            showToast("已切换至题目 " + qid);
            break;
          }
        }
      } else if (act === "dollars-post") {
        ev.preventDefault();
        postDollarsMessage();
      } else if (act === "dollars-phrase") {
        ev.preventDefault();
        var ph = actEl.getAttribute("data-phrase") || "";
        var inp = $("bexDollarsInput");
        if (inp) {
          inp.value = ph;
          inp.focus();
        }
      } else if (act === "dollars-mention") {
        ev.preventDefault();
        var u = actEl.getAttribute("data-user") || "";
        var inp2 = $("bexDollarsInput");
        if (inp2) {
          inp2.value = "@" + u + " " + (inp2.value || "");
          inp2.focus();
        }
      } else if (act === "dollars-sim-wave") {
        ev.preventDefault();
        simulateIncomingWave();
      }
    });

    var msgForm = $("messageForm");
    if (msgForm) {
      msgForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        postDollarsMessage();
      });
    }

    var colorSel = $("bexDollarsColorSelect");
    if (colorSel) {
      colorSel.addEventListener("change", function () {
        state.dollarsColor = colorSel.value || "#ff6584";
        saveStorage();
      });
    }
  }

  function init() {
    loadStorage();
    parseUrlParams();
    renderAll();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.BgmExplore = {
    getState: function () {
      return state;
    },
    switchMode: function (m) {
      state.mode = m;
      renderAll();
    },
    submitMagiAnswer: submitMagiAnswer,
    skipMagiQuestion: skipMagiQuestion,
    postDollarsMessage: postDollarsMessage
  };
})();
