/* ==========================================================================
 * C3 · P16 标签广场与标签详情交互引擎 (bangumi-tag.js)
 * 支持 /{type}/tag 标签云广场 & /{type}/tag/{name} 详情视图 + 表单搜索 + 年份过滤
 * ========================================================================== */
(function () {
  "use strict";

  const DATA = window.TAG_DATA || { channels: [], tagsByChannel: {}, subjectsByChannel: {}, tagDetails: {} };
  const CAT_MAP = { "2": "anime", "1": "book", "3": "music", "4": "game", "6": "real" };
  const PAGE_SIZE = 12;

  const state = {
    type: "anime",
    tag: "",
    meta: "",
    year: 0,
    sort: "collects",
    view: "list",
    page: 1,
    plazaFilter: "",
    plazaLevel: "all",
    plazaSort: "count",
  };

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getChannelMeta(ck) {
    return DATA.channels.find(function (c) { return c.key === ck; }) || DATA.channels[0] || { key: "anime", cat: "2", label: "动画", en: "ANIME" };
  }

  function renderTenStars(score) {
    const num = Math.max(0, Math.min(10, Math.round(Number(score) || 0)));
    return "★".repeat(num) + "☆".repeat(10 - num);
  }

  function parseQueryFromUrl() {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("type");
    if (t && DATA.tagsByChannel[t]) state.type = t;
    state.tag = (sp.get("tag") || "").trim();
    state.meta = (sp.get("meta") || "").trim();
    state.year = parseInt(sp.get("year") || "0", 10) || 0;
    const sort = sp.get("sort");
    if (["collects", "rank", "score", "date", "title"].indexOf(sort) >= 0) state.sort = sort;
    const p = parseInt(sp.get("page") || "1", 10);
    state.page = p > 0 ? p : 1;
  }

  function pushUrlState() {
    const sp = new URLSearchParams();
    sp.set("type", state.type);
    if (state.tag) sp.set("tag", state.tag);
    if (state.meta) sp.set("meta", state.meta);
    if (state.year) sp.set("year", String(state.year));
    if (state.tag && state.sort !== "collects") sp.set("sort", state.sort);
    if (state.tag && state.page > 1) sp.set("page", String(state.page));
    const nextUrl = "tag.html?" + sp.toString();
    try { window.history.replaceState(null, "", nextUrl); } catch (_) {}
  }

  function getMatchedSubjectsForTag(ck, tagName) {
    const all = DATA.subjectsByChannel[ck] || [];
    const detailKey = ck + ":" + tagName;
    const detail = DATA.tagDetails[detailKey];
    let list = [];
    const byId = new Map(all.map(function (it) { return [String(it.id), it]; }));

    if (detail && Array.isArray(detail.subjectIds) && detail.subjectIds.length) {
      detail.subjectIds.forEach(function (id) {
        const found = byId.get(String(id));
        if (found) list.push(found);
      });
    }

    const lowTag = tagName.toLowerCase();
    all.forEach(function (it) {
      if (list.some(function (x) { return String(x.id) === String(it.id); })) return;
      const inTags = Array.isArray(it.tags) && it.tags.some(function (t) { return t.toLowerCase() === lowTag; });
      const inHay = (it.title + " " + it.orig + " " + it.info).toLowerCase().indexOf(lowTag) >= 0;
      if (inTags || inHay) list.push(it);
    });

    if (list.length === 0 && all.length > 0) {
      let hash = 0;
      for (let i = 0; i < tagName.length; i++) hash = (hash * 31 + tagName.charCodeAt(i)) >>> 0;
      const stride = Math.max(1, Math.min(all.length, 16));
      const start = hash % all.length;
      for (let i = 0; i < stride; i++) {
        list.push(all[(start + i) % all.length]);
      }
    }

    if (state.year > 0) {
      list = list.filter(function (it) { return Number(it.year) === state.year; });
    }

    list = list.slice().sort(function (a, b) {
      if (state.sort === "rank") {
        const ra = a.rank > 0 ? a.rank : 999999;
        const rb = b.rank > 0 ? b.rank : 999999;
        return ra - rb;
      }
      if (state.sort === "score") return (b.score || 0) - (a.score || 0);
      if (state.sort === "date") return (b.year || 0) - (a.year || 0);
      if (state.sort === "title") return String(a.title).localeCompare(String(b.title), "zh-Hans-CN");
      return (b.votes || 0) - (a.votes || 0);
    });

    return list;
  }

  function renderHeader() {
    const ch = getChannelMeta(state.type);
    const chTags = DATA.tagsByChannel[state.type] || [];
    const totalTags = Object.values(DATA.tagsByChannel).reduce(function (s, a) { return s + a.length; }, 0);

    document.querySelectorAll("[data-tg-type]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tg-type") === state.type);
    });

    const pills = document.getElementById("btgChannelPills");
    pills.innerHTML = DATA.channels.map(function (c) {
      const active = c.key === state.type ? " is-active" : "";
      const href = "tag.html?type=" + c.key + (state.tag ? "&tag=" + encodeURIComponent(state.tag) : "");
      return "<a href=\"" + href + "\" class=\"btg-ch-pill" + active + "\" data-switch-ch=\"" + c.key + "\">" + escHtml(c.label) + "</a>";
    }).join("");

    const modeBadge = document.getElementById("btgModeBadge");
    const breadcrumb = document.getElementById("btgBreadcrumb");
    const heading = document.getElementById("btgPageHeading");
    const kpiRow = document.getElementById("btgKpiRow");

    if (!state.tag) {
      document.title = ch.label + "标签广场 · Bangumi 番组计划 — Editorial Liquid Glass";
      modeBadge.textContent = ch.en + " TAG PLAZA · 标签广场";
      breadcrumb.innerHTML = "<a href=\"channel.html?type=" + ch.key + "\">" + escHtml(ch.label) + "频道</a> · 热门标签云";
      heading.textContent = "Bangumi " + ch.label + "标签";
      const topTag = chTags[0] || { name: "-", count: 0 };
      const sumVotes = chTags.reduce(function (acc, t) { return acc + (t.count || 0); }, 0);
      kpiRow.innerHTML =
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">当前频道标签</div><div class=\"btg-kpi-val\">" + chTags.length + " 个</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">全站高频标签</div><div class=\"btg-kpi-val\">" + totalTags + " 个</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">榜首最热标签</div><div class=\"btg-kpi-val\">" + escHtml(topTag.name) + "</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">累计标注热度</div><div class=\"btg-kpi-val\">" + sumVotes.toLocaleString() + "</div></div>";
    } else {
      const matched = getMatchedSubjectsForTag(state.type, state.tag);
      const tagMetaObj = chTags.find(function (t) { return t.name.toLowerCase() === state.tag.toLowerCase(); });
      document.title = ch.label + "标签: " + state.tag + " · Bangumi 番组计划";
      modeBadge.textContent = ch.en + " TAG DETAIL · 标签详情";
      breadcrumb.innerHTML = "<a href=\"tag.html?type=" + ch.key + "\">← 返回" + escHtml(ch.label) + "标签广场</a> · <a href=\"browser.html?type=" + ch.key + "\">分类浏览</a>";
      heading.textContent = ch.label + "标签: " + state.tag;
      const scored = matched.filter(function (x) { return x.score > 0; });
      const avgScore = scored.length ? (scored.reduce(function (s, x) { return s + Number(x.score); }, 0) / scored.length).toFixed(2) : "0.00";
      kpiRow.innerHTML =
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">当前选中标签</div><div class=\"btg-kpi-val\">" + escHtml(state.tag) + "</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">命中条目总数</div><div class=\"btg-kpi-val\">" + matched.length + " 部</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">样本平均评分</div><div class=\"btg-kpi-val\">" + avgScore + " 分</div></div>" +
        "<div class=\"btg-kpi-chip\"><div class=\"btg-kpi-label\">全站标注人次</div><div class=\"btg-kpi-val\">" + (tagMetaObj ? tagMetaObj.count.toLocaleString() : "实时检索") + "</div></div>";
    }

    const catSel = document.getElementById("btgSearchCat");
    if (catSel) catSel.value = ch.cat;
  }

  function renderPlaza() {
    const plazaEl = document.getElementById("btgPlazaView");
    const detailEl = document.getElementById("btgDetailView");
    plazaEl.hidden = false;
    detailEl.hidden = true;

    let tags = (DATA.tagsByChannel[state.type] || []).slice();
    if (state.plazaFilter) {
      const q = state.plazaFilter.toLowerCase();
      tags = tags.filter(function (t) { return t.name.toLowerCase().indexOf(q) >= 0; });
    }
    if (state.plazaLevel === "high") tags = tags.filter(function (t) { return t.level <= 3; });
    else if (state.plazaLevel === "mid") tags = tags.filter(function (t) { return t.level >= 4 && t.level <= 6; });
    else if (state.plazaLevel === "low") tags = tags.filter(function (t) { return t.level >= 7; });

    if (state.plazaSort === "alpha") {
      tags.sort(function (a, b) { return a.name.localeCompare(b.name, "zh-Hans-CN"); });
    } else {
      tags.sort(function (a, b) { return b.count - a.count; });
    }

    const tagListEl = document.getElementById("tagList");
    if (!tags.length) {
      tagListEl.innerHTML = "<div class=\"btg-empty-box\">未找到匹配的标签，请更换关键词或清除热度筛选。</div>";
      return;
    }

    tagListEl.innerHTML = tags.map(function (t) {
      const hotCls = t.level <= 2 ? " is-hot" : "";
      const href = "tag.html?type=" + state.type + "&tag=" + encodeURIComponent(t.name);
      return "<span class=\"btg-tag-item" + hotCls + "\"><a href=\"" + href + "\" class=\"l level" + t.level + "\" data-open-tag=\"" + escHtml(t.name) + "\">" + escHtml(t.name) + "</a><small class=\"grey\">(" + t.count + ")</small></span>";
    }).join("");
  }

  function renderDetail() {
    const plazaEl = document.getElementById("btgPlazaView");
    const detailEl = document.getElementById("btgDetailView");
    plazaEl.hidden = true;
    detailEl.hidden = false;

    document.querySelectorAll("#btgSortFilters a[data-sort]").forEach(function (a) {
      a.classList.toggle("focus", a.getAttribute("data-sort") === state.sort);
    });
    document.querySelectorAll("#browserTypeSelector a[data-view]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-view") === state.view);
    });

    const activeFilters = document.getElementById("btgActiveFilters");
    const chips = [];
    if (state.year > 0) chips.push("<button type=\"button\" class=\"btg-filter-chip\" data-clear-year=\"1\">" + state.year + " 年 ✕</button>");
    if (state.meta === "1") chips.push("<button type=\"button\" class=\"btg-filter-chip\" data-clear-meta=\"1\">公共标签 ✕</button>");
    activeFilters.innerHTML = chips.join("");

    const matched = getMatchedSubjectsForTag(state.type, state.tag);
    const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = matched.slice(start, start + PAGE_SIZE);

    const listEl = document.getElementById("browserItemList");
    listEl.className = "browserFull btg-item-list" + (state.view === "compact" ? " is-compact" : state.view === "grid" ? " is-grid" : "");

    if (!pageItems.length) {
      listEl.innerHTML = "<li class=\"btg-empty-box\">该年份/标签组合下暂无匹配条目，请点击「全部年份」查看完整列表。</li>";
    } else {
      const squareCls = state.type === "music" ? " is-square-cover" : "";
      listEl.innerHTML = pageItems.map(function (it) {
        const stars = it.score > 0 ? renderTenStars(it.score) : "☆☆☆☆☆☆☆☆☆☆";
        const scoreStr = it.score > 0 ? Number(it.score).toFixed(1) : "暂无";
        const rankHtml = it.rank > 0 ? "<span class=\"btg-rank-badge\">Rank #" + it.rank + "</span>" : "";
        const tagsHtml = (it.tags || []).slice(0, 4).map(function (tg) {
          const cur = tg.toLowerCase() === state.tag.toLowerCase() ? " is-current" : "";
          return "<a href=\"tag.html?type=" + state.type + "&tag=" + encodeURIComponent(tg) + "\" class=\"btg-subtag-chip" + cur + "\" data-open-tag=\"" + escHtml(tg) + "\">" + escHtml(tg) + "</a>";
        }).join("");
        const origHtml = it.orig ? "<small class=\"btg-item-orig\">" + escHtml(it.orig) + "</small>" : "";
        return "<li id=\"item_" + escHtml(it.id) + "\" class=\"btg-item-card\">" +
          "<a href=\"subject.html?id=" + escHtml(it.id) + "\" class=\"btg-cover-link" + squareCls + "\">" +
          "<img src=\"" + escHtml(it.cover) + "\" alt=\"" + escHtml(it.title) + "\" referrerpolicy=\"no-referrer\" loading=\"lazy\" /></a>" +
          "<div class=\"btg-item-body\">" +
          "<div class=\"btg-item-head\"><h3 class=\"btg-item-title\"><a href=\"subject.html?id=" + escHtml(it.id) + "\">" + escHtml(it.title) + "</a>" + origHtml + "</h3>" + rankHtml + "</div>" +
          "<p class=\"btg-item-info\">" + escHtml(it.info) + "</p>" +
          "<div class=\"btg-item-meta-row\">" +
          "<div class=\"btg-rate-info\"><span class=\"btg-stars-ten\" title=\"十星评分\">" + stars + "</span><span class=\"btg-score-num\">" + scoreStr + "</span><span class=\"btg-votes-txt\">(" + (it.votes || 0).toLocaleString() + "人评分)</span></div>" +
          "<div class=\"btg-item-tags\">" + tagsHtml + "</div>" +
          "<button type=\"button\" class=\"btg-collect-btn\" data-collect-id=\"" + escHtml(it.id) + "\" data-collect-title=\"" + escHtml(it.title) + "\" data-collect-score=\"" + escHtml(it.score) + "\">收藏/评分</button>" +
          "</div></div></li>";
      }).join("");
    }

    const pagerEl = document.getElementById("btgPager");
    if (window.BgmShell && typeof window.BgmShell.mountPager === "function") {
      window.BgmShell.mountPager(pagerEl, {
        page: state.page,
        totalPages: totalPages,
        onChange: function (nextPage) {
          state.page = nextPage;
          pushUrlState();
          renderDetail();
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      });
    } else {
      pagerEl.innerHTML = "";
    }
  }

  function renderSidebar() {
    const sideEl = document.getElementById("btgSideInner");
    const ch = getChannelMeta(state.type);
    const chTags = DATA.tagsByChannel[state.type] || [];

    if (!state.tag) {
      const chLinks = DATA.channels.map(function (c) {
        const cls = c.key === state.type ? " is-active" : "";
        return "<li><a href=\"tag.html?type=" + c.key + "\" class=\"btg-side-link" + cls + "\" data-switch-ch=\"" + c.key + "\">" + escHtml(c.label) + "标签 (" + (DATA.tagsByChannel[c.key] || []).length + ")</a></li>";
      }).join("");
      sideEl.innerHTML =
        "<div class=\"btg-side-section\"><h2>📂 五大频道标签直达</h2><ul class=\"btg-side-links\">" + chLinks + "</ul></div>" +
        "<div class=\"btg-side-section\"><h2>📊 热度分级图例</h2><div class=\"btg-legend-list\"><div><strong style=\"color:var(--accent);\">Level 1–3</strong>：全站现象级核心标签（高标注量）</div><div><strong>Level 4–6</strong>：细分题材与制作流派标签</div><div><strong>Level 7–8</strong>：小众考据与特色长尾标签</div></div></div>" +
        "<div class=\"btg-side-section\"><h2>🔗 关联探索入口</h2><ul class=\"btg-side-links\"><li><a href=\"channel.html?type=" + ch.key + "\" class=\"btg-side-link\">📺 " + escHtml(ch.label) + "频道首页</a></li><li><a href=\"browser.html?type=" + ch.key + "\" class=\"btg-side-link\">📊 " + escHtml(ch.label) + "排行榜</a></li><li><a href=\"calendar.html\" class=\"btg-side-link\">📅 每日放送</a></li><li><a href=\"search.html\" class=\"btg-side-link\">🔍 全站搜索</a></li></ul></div>";
      return;
    }

    const detailKey = state.type + ":" + state.tag;
    const allSubjects = DATA.subjectsByChannel[state.type] || [];
    const yearsSet = new Set();
    if (DATA.tagDetails[detailKey] && DATA.tagDetails[detailKey].years) {
      DATA.tagDetails[detailKey].years.forEach(function (y) { yearsSet.add(y); });
    }
    allSubjects.forEach(function (s) {
      if (s.year >= 2000 && s.year <= 2027) yearsSet.add(s.year);
    });
    const years = Array.from(yearsSet).sort(function (a, b) { return b - a; }).slice(0, 15);
    const related = chTags.filter(function (t) { return t.name !== state.tag; }).slice(0, 18);

    const crossLinks = DATA.channels.map(function (c) {
      const cls = c.key === state.type ? " is-active" : "";
      return "<li><a href=\"tag.html?type=" + c.key + "&tag=" + encodeURIComponent(state.tag) + "\" class=\"btg-side-link" + cls + "\" data-switch-ch=\"" + c.key + "\">" + escHtml(c.label) + "</a></li>";
    }).join("");

    const yearLinks = years.map(function (y) {
      const cls = state.year === y ? " is-active" : "";
      return "<li class=\"airYear\"><a href=\"javascript:void(0)\" class=\"btg-side-link" + cls + "\" data-set-year=\"" + y + "\">" + y + "年</a></li>";
    }).join("");

    const relLinks = related.map(function (t) {
      return "<li><a href=\"tag.html?type=" + state.type + "&tag=" + encodeURIComponent(t.name) + "\" class=\"btg-side-link\" data-open-tag=\"" + escHtml(t.name) + "\">" + escHtml(t.name) + "</a></li>";
    }).join("");

    sideEl.innerHTML =
      "<div class=\"btg-side-section\"><h2>🌐 跨频道同名标签</h2><ul class=\"btg-side-links\">" + crossLinks + "</ul></div>" +
      "<div class=\"btg-side-section\"><h2>🏷️ 标签来源属性</h2><ul class=\"btg-side-links\"><li><a href=\"javascript:void(0)\" class=\"btg-side-link" + (state.meta !== "1" ? " is-active" : "") + "\" data-set-meta=\"\">全部用户标签</a></li><li><a href=\"javascript:void(0)\" class=\"btg-side-link" + (state.meta === "1" ? " is-active" : "") + "\" data-set-meta=\"1\">公共元标签 (?meta=1)</a></li></ul></div>" +
      "<div class=\"btg-side-section\"><h2>🗓️ 发行年份过滤</h2><ul id=\"airTimeMenu\" class=\"btg-side-links\"><li><a href=\"javascript:void(0)\" class=\"btg-side-link" + (state.year === 0 ? " is-active" : "") + "\" data-set-year=\"0\">全部年份</a></li>" + yearLinks + "</ul></div>" +
      "<div class=\"btg-side-section\"><h2>✨ 本频道热门关联标签</h2><ul class=\"btg-side-links\">" + relLinks + "</ul></div>";
  }

  function renderAll() {
    renderHeader();
    if (state.tag) renderDetail();
    else renderPlaza();
    renderSidebar();
  }

  function bindEvents() {
    document.addEventListener("click", function (e) {
      const chLink = e.target.closest("[data-switch-ch], [data-tg-type]");
      if (chLink) {
        e.preventDefault();
        const nextType = chLink.getAttribute("data-switch-ch") || chLink.getAttribute("data-tg-type");
        if (nextType && DATA.tagsByChannel[nextType]) {
          state.type = nextType;
          state.year = 0;
          state.page = 1;
          pushUrlState();
          renderAll();
        }
        return;
      }

      const tagLink = e.target.closest("[data-open-tag]");
      if (tagLink) {
        e.preventDefault();
        state.tag = tagLink.getAttribute("data-open-tag") || "";
        state.year = 0;
        state.page = 1;
        pushUrlState();
        renderAll();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const sortLink = e.target.closest("#btgSortFilters a[data-sort]");
      if (sortLink) {
        e.preventDefault();
        state.sort = sortLink.getAttribute("data-sort") || "collects";
        state.page = 1;
        pushUrlState();
        renderDetail();
        return;
      }

      const viewLink = e.target.closest("#browserTypeSelector a[data-view]");
      if (viewLink) {
        e.preventDefault();
        state.view = viewLink.getAttribute("data-view") || "list";
        renderDetail();
        return;
      }

      const yearLink = e.target.closest("[data-set-year]");
      if (yearLink) {
        e.preventDefault();
        state.year = parseInt(yearLink.getAttribute("data-set-year") || "0", 10) || 0;
        state.page = 1;
        pushUrlState();
        renderAll();
        return;
      }

      const metaLink = e.target.closest("[data-set-meta]");
      if (metaLink) {
        e.preventDefault();
        state.meta = metaLink.getAttribute("data-set-meta") || "";
        state.page = 1;
        pushUrlState();
        renderAll();
        return;
      }

      if (e.target.closest("[data-clear-year]")) {
        state.year = 0;
        state.page = 1;
        pushUrlState();
        renderAll();
        return;
      }

      if (e.target.closest("[data-clear-meta]")) {
        state.meta = "";
        state.page = 1;
        pushUrlState();
        renderAll();
        return;
      }

      const collectBtn = e.target.closest("[data-collect-id]");
      if (collectBtn) {
        const sid = collectBtn.getAttribute("data-collect-id");
        const title = collectBtn.getAttribute("data-collect-title");
        const score = parseFloat(collectBtn.getAttribute("data-collect-score") || "0") || 0;
        if (window.BgmShell && typeof window.BgmShell.openCollect === "function") {
          window.BgmShell.openCollect({ id: sid, title: title, score: score });
        }
      }
    });

    const filterInput = document.getElementById("btgPlazaFilter");
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        state.plazaFilter = this.value.trim();
        renderPlaza();
      });
    }

    const levelWrap = document.getElementById("btgLevelFilter");
    if (levelWrap) {
      levelWrap.addEventListener("click", function (e) {
        const btn = e.target.closest("button[data-level]");
        if (!btn) return;
        state.plazaLevel = btn.getAttribute("data-level") || "all";
        levelWrap.querySelectorAll("button").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        renderPlaza();
      });
    }

    const sortWrap = document.getElementById("btgTagSort");
    if (sortWrap) {
      sortWrap.addEventListener("click", function (e) {
        const btn = e.target.closest("button[data-tag-sort]");
        if (!btn) return;
        state.plazaSort = btn.getAttribute("data-tag-sort") || "count";
        sortWrap.querySelectorAll("button").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        renderPlaza();
      });
    }

    const form = document.getElementById("btgTagSearchForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const catVal = document.getElementById("btgSearchCat").value;
        const kw = document.getElementById("btgSearchInput").value.trim();
        const nextType = CAT_MAP[catVal] || state.type;
        state.type = nextType;
        if (!kw) {
          state.tag = "";
          pushUrlState();
          renderAll();
          if (window.BgmShell && window.BgmShell.toast) {
            window.BgmShell.toast("已切换至" + getChannelMeta(nextType).label + "标签广场");
          }
          return;
        }
        const chTags = DATA.tagsByChannel[nextType] || [];
        const exact = chTags.find(function (t) { return t.name.toLowerCase() === kw.toLowerCase(); });
        const fuzzy = exact || chTags.find(function (t) { return t.name.toLowerCase().indexOf(kw.toLowerCase()) >= 0; });
        state.tag = fuzzy ? fuzzy.name : kw;
        state.year = 0;
        state.page = 1;
        pushUrlState();
        renderAll();
        if (window.BgmShell && window.BgmShell.toast) {
          window.BgmShell.toast("已定位标签：" + state.tag);
        }
      });
    }
  }

  parseQueryFromUrl();
  bindEvents();
  renderAll();
})();
