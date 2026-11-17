/* ═══════════════════════════════════════════════════════════
   Bangumi Search Studio — Page 17 (/subject_search/{keyword})
   B1 · 全站综合搜索结果页
   数据源：window.SEARCH_DATA（3 份真实 /subject_search 样本 + 排行榜 155 条）
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.SEARCH_DATA || {};
  var SUBJECTS = DATA.subjects || [];
  var RELATED = DATA.related || [];
  var PRESETS = DATA.presets || {};
  var TIPS = DATA.tips || [];
  var PAGE_SIZE = 10;

  var TYPE_NAME = { anime: '动画', book: '书籍', music: '音乐', game: '游戏', real: '三次元' };
  var VERB = { anime: '看', book: '读', music: '听', game: '玩', real: '看' };
  var CAT_LABEL = {
    all: '全部', anime: '动画', book: '书籍', music: '音乐', game: '游戏', real: '三次元',
    person: '全部人物', crt: '虚构角色', prsn: '现实人物'
  };
  var NUM_CAT = { '2': 'anime', '1': 'book', '3': 'music', '4': 'game', '6': 'real', person: 'person', crt: 'crt', prsn: 'prsn' };

  var CAT_GROUPS = [
    { root: '条目', items: ['all', 'anime', 'book', 'music', 'game', 'real'] },
    { root: '人物', items: ['person', 'crt', 'prsn'] }
  ];
  var PERSON_CATS = ['person', 'crt', 'prsn'];
  var SORTS = [
    { key: 'rank', label: '相关性' }, { key: 'score', label: '评分' },
    { key: 'votes', label: '热度' }, { key: 'date', label: '日期' },
    { key: 'title', label: '名称' }
  ];
  var VIEWS = [
    { key: 'full', label: '列表' }, { key: 'compact', label: '精简' }, { key: 'grid', label: '网格' }
  ];

  /* --------------------- 1. 状态 --------------------- */
  function readUrl() {
    var p = new URLSearchParams(location.search || '');
    var cat = p.get('cat') || 'all';
    if (NUM_CAT[cat]) cat = NUM_CAT[cat];
    if (!CAT_LABEL[cat]) cat = 'all';
    var sort = p.get('sort') || 'rank';
    if (!SORTS.some(function (s) { return s.key === sort; })) sort = 'rank';
    var view = p.get('view') || 'full';
    if (!VIEWS.some(function (v) { return v.key === view; })) view = 'full';
    var page = Math.max(1, parseInt(p.get('page'), 10) || 1);
    // 无 ?q= 时用演示默认词，直接进页面即可看到真实结果；显式 ?q= 为空则保留空态
    var q = p.has('q') ? (p.get('q') || '') : (DATA.defaultQuery || '');
    return { q: q, cat: cat, sort: sort, view: view, page: page };
  }

  var state = readUrl();
  state.collected = {};
  try {
    var saved = localStorage.getItem('bgm-search-collect');
    if (saved) state.collected = JSON.parse(saved) || {};
  } catch (e) { /* ignore */ }

  function syncUrl() {
    var p = ['q=' + encodeURIComponent(state.q)];
    if (state.cat !== 'all') p.push('cat=' + encodeURIComponent(state.cat));
    if (state.sort !== 'rank') p.push('sort=' + state.sort);
    if (state.view !== 'full') p.push('view=' + state.view);
    if (state.page > 1) p.push('page=' + state.page);
    try { history.replaceState(null, '', '?' + p.join('&')); } catch (e) { /* ignore */ }
  }
  function saveCollect() {
    try { localStorage.setItem('bgm-search-collect', JSON.stringify(state.collected)); } catch (e) { /* ignore */ }
  }

  /* --------------------- 2. 工具 --------------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function htmlUnesc(s) {
    return String(s == null ? '' : s)
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  function hay(x) {
    return ((x.title || '') + ' ' + (x.orig || '') + ' ' + (x.info || '')).toLowerCase();
  }
  function parseQuery(q) {
    var s = (q || '').trim();
    var excl = [];
    s = s.replace(/-(\S+)/g, function (_, w) { excl.push(w.toLowerCase()); return ' '; });
    var quoted = [];
    s = s.replace(/"([^"]+)"/g, function (_, w) { quoted.push(w.toLowerCase()); return ' '; });
    var words = s.split(/\s+/).filter(Boolean).map(function (w) { return w.toLowerCase(); });
    return { include: quoted.concat(words), exclude: excl };
  }
  function highlight(text, q) {
    var raw = htmlUnesc(String(text == null ? '' : text));
    var terms = parseQuery(q).include.filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    if (!terms.length) return esc(raw);
    var lower = raw.toLowerCase(), ranges = [];
    terms.forEach(function (t) {
      var start = 0, i;
      while ((i = lower.indexOf(t, start)) !== -1) { ranges.push([i, i + t.length]); start = i + 1; }
    });
    if (!ranges.length) return esc(raw);
    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) { if (r[1] > last[1]) last[1] = r[1]; }
      else merged.push(r.slice());
    });
    var out = '', pos = 0;
    merged.forEach(function (r) {
      out += esc(raw.slice(pos, r[0]));
      out += '<span class="search-hl">' + esc(raw.slice(r[0], r[1])) + '</span>';
      pos = r[1];
    });
    return out + esc(raw.slice(pos));
  }
  function yearOf(x) {
    var m = /(19|20)\d{2}/.exec(x.info || '');
    return m ? parseInt(m[0], 10) : 0;
  }
  function tenStars(score) {
    var sc = Number(score) || 0;
    var n = Math.round(sc);
    if (n <= 0) return '<span class="search-no-score">暂无评分</span>';
    n = Math.max(1, Math.min(10, n));
    return '<span class="search-ten-stars">' +
      '<span class="search-stars-filled">' + '★'.repeat(n) + '</span>' +
      '<span class="search-stars-empty">' + '☆'.repeat(10 - n) + '</span></span>' +
      '<strong class="search-score-num">' + sc.toFixed(1) + '</strong>';
  }
  function toast(msg) {
    if (window.BgmShell && window.BgmShell.toast) { window.BgmShell.toast(msg); return; }
    var host = $('toastContainer');
    if (!host) return;
    var t = document.createElement('div');
    t.className = 'glass-toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* --------------------- 3. 检索 --------------------- */
  function baseHits() {
    var q = state.q.trim();
    if (!q) return [];
    var pq = parseQuery(q);
    var key = Object.keys(PRESETS).filter(function (k) { return k.toLowerCase() === q.toLowerCase(); })[0];
    var out;
    if (key) {
      var ids = PRESETS[key] || [], order = {};
      ids.forEach(function (id, i) { order[id] = i; });
      out = SUBJECTS.filter(function (x) { return order[x.id] !== undefined; });
      out.sort(function (a, b) { return order[a.id] - order[b.id]; });
      if (pq.exclude.length) {
        out = out.filter(function (x) { return !pq.exclude.some(function (w) { return hay(x).indexOf(w) !== -1; }); });
      }
      out._preset = true;
    } else {
      out = SUBJECTS.filter(function (x) {
        var h = hay(x);
        if (pq.exclude.some(function (w) { return h.indexOf(w) !== -1; })) return false;
        if (!pq.include.length) return true;
        return pq.include.every(function (w) { return h.indexOf(w) !== -1; });
      });
      out._preset = false;
    }
    return out;
  }
  function personHits() {
    // 「显示精准匹配结果」在真站是服务端返回的关联实体；本原型以样本 related 全集模拟
    if (!state.q.trim()) return [];
    return RELATED.filter(function (r) {
      if (state.cat === 'crt' && r.kind !== 'character') return false;
      if (state.cat === 'prsn' && r.kind !== 'person') return false;
      return true;
    });
  }
  function sorted(list) {
    var arr = list.slice();
    if (state.sort === 'rank' && list._preset) return arr; // 保留真实搜索命中顺序
    arr.sort(function (a, b) {
      switch (state.sort) {
        case 'score': return (Number(b.score) || 0) - (Number(a.score) || 0);
        case 'votes': return (Number(b.votes) || 0) - (Number(a.votes) || 0);
        case 'date': return yearOf(b) - yearOf(a);
        case 'title': return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
        default: return (Number(a.rank) || 9999) - (Number(b.rank) || 9999);
      }
    });
    return arr;
  }
  function filtered() {
    var base = baseHits();
    var list = PERSON_CATS.indexOf(state.cat) !== -1 ? [] : base.filter(function (x) {
      return state.cat === 'all' || x.cat === state.cat;
    });
    list._preset = !!base._preset; // filter() 会丢掉自定义属性，必须显式回填
    return { list: sorted(list), base: base };
  }

  /* --------------------- 4. 渲染：Hero / 预设 / 左栏 --------------------- */
  function renderHero(total, firstCover) {
    var bd = $('searchHeroBackdrop');
    if (bd) bd.style.backgroundImage = firstCover ? 'url("' + firstCover + '")' : 'none';
    var kb = $('searchKickerBadge');
    if (kb) kb.textContent = 'SEARCH · ' + (state.cat === 'all' ? '全站检索' : CAT_LABEL[state.cat] + '检索');
    var ks = $('searchKickerSub');
    if (ks) ks.textContent = '/subject_search/' + (state.q || '{keyword}') + (state.cat !== 'all' ? '?cat=' + state.cat : '');
    var h1 = $('searchMainTitle');
    if (h1) {
      h1.innerHTML = '条目搜索<small>' + (state.q
        ? '「' + esc(state.q) + '」· 跨动画 / 书籍 / 音乐 / 游戏 / 三次元，一次找齐'
        : '跨动画 / 书籍 / 音乐 / 游戏 / 三次元，一次找齐') + '</small>';
    }
    var c = $('searchHeroCount');
    if (c) c.textContent = total;
    var stat = $('searchHeroStat');
    if (stat) stat.hidden = false;
    var inp = $('searchBigInput');
    if (inp && inp.value !== state.q) inp.value = state.q;
    var bc = $('searchBigCat');
    if (bc) {
      if (!bc.options.length) {
        bc.innerHTML = (DATA.cats || []).map(function (c2) {
          return '<option value="' + esc(c2.key) + '">' + esc(c2.label) + '</option>';
        }).join('');
      }
      // data.cats 只含 all+5 条目频道，人物三分类需补齐
      ['crt', 'prsn'].forEach(function (k) {
        if (!bc.querySelector('option[value="' + k + '"]')) {
          var o = document.createElement('option');
          o.value = k; o.textContent = CAT_LABEL[k];
          bc.appendChild(o);
        }
      });
      bc.value = state.cat;
    }
  }
  function renderPresets() {
    var host = $('searchPresetRow');
    if (!host) return;
    var keys = Object.keys(PRESETS);
    host.innerHTML = '<span class="search-preset-label">TRY</span>' + keys.map(function (k) {
      return '<button type="button" class="search-preset-chip' + (state.q === k ? ' is-active' : '') +
        '" data-s-act="preset" data-s-q="' + esc(k) + '">' + esc(k) + '</button>';
    }).join('');
  }
  function renderNav(base) {
    var host = $('searchNavList');
    if (!host) return;
    var counts = { all: base.length };
    Object.keys(TYPE_NAME).forEach(function (k) {
      counts[k] = base.filter(function (x) { return x.cat === k; }).length;
    });
    counts.person = RELATED.length;
    counts.crt = RELATED.filter(function (r) { return r.kind === 'character'; }).length;
    counts.prsn = RELATED.filter(function (r) { return r.kind === 'person'; }).length;
    var total = $('searchNavTotal');
    if (total) total.textContent = base.length;
    host.innerHTML = CAT_GROUPS.map(function (g) {
      return '<li><div class="search-nav-root">' + g.root + '</div></li>' + g.items.map(function (k) {
        return '<li><button type="button" class="search-nav-btn' + (state.cat === k ? ' is-active' : '') +
          '" data-s-act="cat" data-s-cat="' + k + '"><span>' + CAT_LABEL[k] +
          '</span><span class="search-nav-n">' + (counts[k] || 0) + '</span></button></li>';
      }).join('');
    }).join('');
  }
  function renderTools() {
    var sf = $('searchSortFilters');
    if (sf) {
      sf.innerHTML = '<span class="search-sort-prefix">SORT</span>' + SORTS.map(function (s) {
        return '<button type="button" class="search-sort-pill' + (state.sort === s.key ? ' is-active' : '') +
          '" data-s-act="sort" data-s-sort="' + s.key + '">' + s.label + '</button>';
      }).join('');
    }
    var ts = $('browserTypeSelector');
    if (ts) {
      ts.innerHTML = VIEWS.map(function (v) {
        return '<button type="button" class="search-type-btn' + (state.view === v.key ? ' is-active' : '') +
          '" data-s-act="view" data-s-view="' + v.key + '">' + v.label + '</button>';
      }).join('');
    }
    var grid = $('searchColumnsGrid');
    if (grid) grid.setAttribute('data-view', state.view);
  }

  /* --------------------- 5. 渲染：精准匹配 / 结果卡 --------------------- */
  function renderRelated() {
    var card = $('searchRelatedCard'), row = $('searchRelatedRow');
    if (!card || !row) return;
    var show = !!state.q.trim() && PERSON_CATS.indexOf(state.cat) === -1 && RELATED.length > 0;
    card.hidden = !show;
    if (!show) return;
    row.innerHTML = RELATED.map(function (r) {
      return '<div class="search-related-card-item" data-s-act="person" data-s-id="' + esc(r.id) + '">' +
        '<img class="search-related-avatar" src="' + esc(r.avatar) + '" alt="' + esc(r.name) + '" referrerpolicy="no-referrer" />' +
        '<div class="search-related-name">' + esc(r.name) + '</div>' +
        '<div class="search-related-kind">' + (r.kind === 'character' ? 'CHARACTER' : 'PERSON') + '</div></div>';
    }).join('');
  }
  function coverHtml(x, sq) {
    var cls = 'search-cover-link' + (x.cat === 'music' ? ' is-music-square' : '');
    var inner = x.cover
      ? '<img class="search-cover-img" src="' + esc(x.cover) + '" alt="' + esc(x.title) + '" referrerpolicy="no-referrer" loading="lazy" />'
      : '<div class="search-cover-empty">' + esc((x.title || '?').slice(0, 1)) + '</div>';
    return '<a class="' + cls + '" href="subject.html?id=' + esc(x.id) + '" title="' + esc(x.title) + '">' + inner + '</a>';
  }
  function resultCard(x, idx, globalIdx) {
    var medal = globalIdx < 3 ? ' is-top-' + (globalIdx + 1) : '';
    var collected = state.collected[x.id];
    var verb = VERB[x.cat] || '看';
    return '<li class="search-result-card" style="animation-delay:' + (idx * 28) + 'ms">' +
      '<div class="search-rank-col"><span class="search-rank-pill' + medal + '"><small>Rank</small><strong>' +
      (Number(x.rank) || '—') + '</strong></span></div>' +
      coverHtml(x) +
      '<div class="search-result-inner">' +
        '<div class="search-title-row"><h3><a class="search-title-link" href="subject.html?id=' + esc(x.id) + '">' +
          highlight(x.title, state.q) + '</a></h3>' +
          (x.orig ? '<span class="search-orig-title">' + highlight(x.orig, state.q) + '</span>' : '') +
          '<span class="search-type-chip">' + (TYPE_NAME[x.cat] || '条目') + '</span></div>' +
        (x.info ? '<p class="search-info-tip">' + highlight(x.info, state.q) + '</p>' : '') +
        '<div class="search-rate-row">' + tenStars(x.score) +
          (Number(x.votes) ? '<span class="search-votes-tip">(' + Number(x.votes).toLocaleString() + ' 人评分)</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="search-collect-block">' +
        '<button type="button" class="search-collect-btn' + (collected ? ' is-collected' : '') +
          '" data-s-act="collect" data-s-id="' + esc(x.id) + '">' + (collected ? '✓ ' + esc(collected) : '＋ 想' + verb) + '</button>' +
        (collected ? '<span class="search-collect-mini" data-s-act="uncollect" data-s-id="' + esc(x.id) + '">删除</span>' : '') +
      '</div></li>';
  }
  function personCard(r, idx) {
    return '<li class="search-result-card" style="animation-delay:' + (idx * 28) + 'ms">' +
      '<div class="search-rank-col"><span class="search-rank-pill"><small>MONO</small><strong>' + (idx + 1) + '</strong></span></div>' +
      '<a class="search-cover-link is-music-square" href="#" data-s-act="person" data-s-id="' + esc(r.id) + '">' +
        '<img class="search-cover-img" src="' + esc(r.avatar) + '" alt="' + esc(r.name) + '" referrerpolicy="no-referrer" /></a>' +
      '<div class="search-result-inner">' +
        '<div class="search-title-row"><h3><a class="search-title-link" href="#" data-s-act="person" data-s-id="' + esc(r.id) + '">' +
          highlight(r.name, state.q) + '</a></h3><span class="search-type-chip">' +
          (r.kind === 'character' ? '虚构角色' : '现实人物') + '</span></div>' +
        '<p class="search-info-tip">精准匹配 · /' + (r.kind === 'character' ? 'character' : 'person') + '/' + esc(r.id) + '</p>' +
        '<div class="search-rate-row"><span class="search-no-score">人物条目 · 无评分</span></div>' +
      '</div>' +
      '<div class="search-collect-block"><button type="button" class="search-collect-btn" data-s-act="person" data-s-id="' + esc(r.id) + '">查看</button></div>' +
      '</li>';
  }

  /* --------------------- 6. 渲染：列表 / 分页 / 空态 --------------------- */
  function emptyHtml(kind) {
    if (kind === 'noq') {
      return '<div class="search-empty"><div class="search-empty-ico">⌕</div>' +
        '<h3>还没有输入关键词</h3><p>在上方搜索框输入番组、书名、角色或人物，或从「TRY」预设里挑一个开始检索。</p>' +
        '<button type="button" class="search-empty-btn" data-s-act="preset" data-s-q="芙莉莲">试试「芙莉莲」</button></div>';
    }
    return '<div class="search-empty"><div class="search-empty-ico">☁</div>' +
      '<h3>没有找到相关结果</h3><p>没有找到与「' + esc(state.q) + '」匹配的' +
      (PERSON_CATS.indexOf(state.cat) !== -1 ? '人物' : '条目') +
      '。可以换个关键词、清除分类过滤，或试试引号精确匹配与减号排除。</p>' +
      '<button type="button" class="search-empty-btn" data-s-act="reset">清除筛选 · 查看全部</button></div>';
  }
  function renderResults(res) {
    var host = $('browserItemList');
    if (!host) return;
    var isPerson = PERSON_CATS.indexOf(state.cat) !== -1;
    var list = isPerson ? personHits() : res.list;
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) { state.page = pages; }
    var start = (state.page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    host.className = 'search-result-list' + (isPerson ? '' : state.view === 'compact' ? ' mode-compact' : state.view === 'grid' ? ' mode-grid' : '');
    var rc = $('searchResultCount');
    if (rc) rc.textContent = total + ' 条';
    var tools = $('browserTools');
    if (tools) tools.style.opacity = isPerson ? '.55' : '1';

    if (!state.q.trim()) { host.innerHTML = emptyHtml('noq'); renderPagination(0, 1); return; }
    if (!total) { host.innerHTML = emptyHtml('none'); renderPagination(0, 1); return; }
    host.innerHTML = isPerson
      ? slice.map(function (r, i) { return personCard(r, i); }).join('')
      : slice.map(function (x, i) { return resultCard(x, i, start + i); }).join('');
    renderPagination(total, pages);
  }
  function renderPagination(total, pages) {
    var host = $('searchPagination');
    if (!host) return;
    var mp = $('multipage');
    if (mp) mp.hidden = total === 0;
    if (total === 0) { host.innerHTML = ''; return; }
    var btns = [];
    btns.push('<button type="button" class="search-page-btn" data-s-act="page" data-s-page="' + (state.page - 1) + '"' +
      (state.page <= 1 ? ' disabled' : '') + '>‹</button>');
    var nums = [];
    for (var i = 1; i <= pages; i++) {
      if (pages <= 7 || i === 1 || i === pages || Math.abs(i - state.page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    nums.forEach(function (n) {
      if (n === '…') { btns.push('<span class="search-page-ellipsis">…</span>'); return; }
      btns.push('<button type="button" class="search-page-btn' + (n === state.page ? ' p_cur' : '') +
        '" data-s-act="page" data-s-page="' + n + '">' + n + '</button>');
    });
    btns.push('<button type="button" class="search-page-btn" data-s-act="page" data-s-page="' + (state.page + 1) + '"' +
      (state.page >= pages ? ' disabled' : '') + '>›</button>');
    btns.push('<span class="search-page-info">第 ' + state.page + ' / ' + pages + ' 页 · 共 ' + total + ' 条</span>');
    host.innerHTML = btns.join('');
  }

  /* --------------------- 7. 渲染：右栏 --------------------- */
  function renderSide() {
    var pl = $('searchPersonList');
    if (pl) {
      pl.innerHTML = RELATED.map(function (r) {
        return '<a class="search-person-item" href="#" data-s-act="person" data-s-id="' + esc(r.id) + '">' +
          '<img class="search-person-avatar" src="' + esc(r.avatar) + '" alt="' + esc(r.name) + '" referrerpolicy="no-referrer" />' +
          '<div><div class="search-person-name">' + esc(r.name) + '</div>' +
          '<div class="search-person-kind">' + (r.kind === 'character' ? '虚构角色' : '现实人物') + ' · #' + esc(r.id) + '</div></div></a>';
      }).join('');
    }
    var tl = $('searchTipsList');
    if (tl) tl.innerHTML = TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    var ln = $('searchLegacyNote');
    if (ln) ln.textContent = '真站「显示精准匹配结果」对应 ?legacy=1；本原型以预设关键词命中集模拟，不接后端。';
    var hot = $('searchHotList');
    if (hot) hot.innerHTML = Object.keys(PRESETS).slice(0, 7).map(function (k) {
      return '<button type="button" class="search-hot-chip" data-s-act="preset" data-s-q="' + esc(k) + '">' + esc(k) + '</button>';
    }).join('');
    $('columnSearchC'); // 右栏结构锚点（保留以便后续扩展）
  }

  /* --------------------- 8. 总渲染 --------------------- */
  function renderAll() {
    var res = filtered();
    var first = res.list.filter(function (x) { return x.cover; })[0];
    renderHero(PERSON_CATS.indexOf(state.cat) !== -1 ? personHits().length : res.list.length, first && first.cover);
    renderPresets();
    renderNav(res.base);
    renderTools();
    renderRelated();
    renderResults(res);
    renderSide();
    syncUrl();
    // 顶栏搜索框同步（若壳层路由未拦截，也能显示当前词）
    var hinp = document.querySelector('#headerSearch input');
    if (hinp && state.q && !hinp.value) hinp.value = state.q;
    $('columnSearchA'); $('columnSearchB');
  }

  /* --------------------- 9. 交互 --------------------- */
  function setQ(q, cat) {
    state.q = q;
    if (cat) state.cat = cat;
    state.page = 1;
    renderAll();
    toast('检索「' + q + '」· ' + (PERSON_CATS.indexOf(state.cat) !== -1 ? personHits().length : filtered().list.length) + ' 条结果');
  }
  function initEvents() {
    // 放大版搜索表单
    var big = $('searchBigForm');
    if (big) big.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('searchBigInput');
      var q = inp ? inp.value.trim() : '';
      setQ(q, $('searchBigCat') ? $('searchBigCat').value : 'all');
    });
    var bcat = $('searchBigCat');
    if (bcat) bcat.addEventListener('change', function () {
      state.cat = bcat.value; state.page = 1; renderAll();
    });
    var bsubmit = $('searchBigSubmit');
    if (bsubmit) bsubmit.addEventListener('click', function () { /* 由 form submit 处理 */ });

    // 单一委托：所有 data-s-act
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-s-act]') : null;
      if (!t) return;
      var act = t.getAttribute('data-s-act');
      var id = t.getAttribute('data-s-id');
      if (act === 'subject' || act === 'person') {
        if (act === 'person') {
          e.preventDefault();
          toast('人物详情页（P19 · Phase D）待建 · #' + id);
        }
        return; // subject 用原生 <a href> 跳转
      }
      e.preventDefault();
      switch (act) {
        case 'cat': state.cat = t.getAttribute('data-s-cat'); state.page = 1; renderAll(); break;
        case 'sort': state.sort = t.getAttribute('data-s-sort'); state.page = 1; renderAll(); break;
        case 'view': state.view = t.getAttribute('data-s-view'); renderAll(); break;
        case 'page':
          var p = parseInt(t.getAttribute('data-s-page'), 10);
          if (p >= 1) { state.page = p; renderAll(); window.scrollTo({ top: 240, behavior: 'smooth' }); }
          break;
        case 'preset': setQ(t.getAttribute('data-s-q') || '', 'all'); break;
        case 'collect':
          state.collected[id] = '想' + (VERB[(SUBJECTS.filter(function (x) { return x.id === id; })[0] || {}).cat] || '看');
          saveCollect(); renderAll();
          if (window.BgmShell && window.BgmShell.openCollect) window.BgmShell.openCollect();
          else toast('已加入收藏 · 想看');
          break;
        case 'uncollect': delete state.collected[id]; saveCollect(); renderAll(); toast('已取消收藏'); break;
        case 'reset': state.q = ''; state.cat = 'all'; state.sort = 'rank'; state.view = 'full'; state.page = 1; renderAll(); toast('已清除全部筛选'); break;
      }
    });

    // 主题切换（与其余 5 页一致）
    var tt = $('btnThemeToggle');
    if (tt) tt.addEventListener('click', function () {
      var root = document.documentElement;
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    });

    // "/" 聚焦放大搜索框
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault();
        var inp = $('searchBigInput');
        if (inp) inp.focus();
      }
    });
  }

  /* --------------------- 10. 启动 --------------------- */
  window.SEARCH_PAGE = true;
  function boot() { initEvents(); renderAll(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
