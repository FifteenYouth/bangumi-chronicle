/* ============================================================================
 * Bangumi 番组计划 — Page 08 条目制作人员列表页交互控制器 (B5: /subject/{id}/persons)
 * 依赖数据: window.PERSON_DATA (js/bangumi-person-data.js)
 * ============================================================================ */
(function () {
  'use strict';

  var DATA = window.PERSON_DATA || { defaultSubjectId: '400602', departments: [], subjects: {} };
  var FAV_KEY = 'bgm_person_fav_v1';
  var CMT_KEY = 'bgm_person_cmt_v1';
  var CUSTOM_KEY = 'bgm_person_custom_v1';

  var state = {
    subjectId: '400602',
    viewMode: 'person', // 'person' | 'position'
    dept: 'all',
    job: 'all',
    query: '',
    sort: 'default', // 'default' | 'comments' | 'jobs' | 'fav'
    epOnly: false,
    activePersonId: null,
    favMap: loadJson(FAV_KEY, {}),
    cmtMap: loadJson(CMT_KEY, {}),
    customMap: loadJson(CUSTOM_KEY, {})
  };

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTenStar(score) {
    var num = Number(score) || 8.0;
    var full = Math.max(0, Math.min(10, Math.round(num)));
    var stars = '';
    for (var i = 0; i < 10; i++) {
      stars += i < full ? '★' : '☆';
    }
    return stars + ' ' + num.toFixed(1);
  }

  function parseUrlParams() {
    try {
      var sp = new URLSearchParams(window.location.search);
      var sid = sp.get('id') || sp.get('subject');
      if (sid && DATA.subjects[sid]) {
        state.subjectId = sid;
      }
      var grp = sp.get('group');
      if (grp === 'position' || grp === 'person') {
        state.viewMode = grp;
      }
      var job = sp.get('job');
      if (job) {
        state.job = job;
      }
      var dept = sp.get('dept');
      if (dept) {
        state.dept = dept;
      }
    } catch (e) {}
  }

  function syncUrlParams() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('id', state.subjectId);
      if (state.viewMode !== 'person') {
        url.searchParams.set('group', state.viewMode);
      } else {
        url.searchParams.delete('group');
      }
      if (state.job && state.job !== 'all') {
        url.searchParams.set('job', state.job);
      } else {
        url.searchParams.delete('job');
      }
      if (state.dept && state.dept !== 'all') {
        url.searchParams.set('dept', state.dept);
      } else {
        url.searchParams.delete('dept');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }

  function getCurrentSubject() {
    var base = DATA.subjects[state.subjectId] || DATA.subjects[DATA.defaultSubjectId] || {};
    var customList = state.customMap[state.subjectId] || [];
    if (!customList.length) return base;

    var mergedPersons = customList.concat(base.persons || []);
    var jobCounts = {};
    mergedPersons.forEach(function (p) {
      (p.jobs || []).forEach(function (j) {
        jobCounts[j.job] = (jobCounts[j.job] || 0) + 1;
      });
    });

    var existingJobs = {};
    var mergedJobList = (base.jobList || []).map(function (jl) {
      existingJobs[jl.job] = true;
      return {
        job: jl.job,
        shownCount: jobCounts[jl.job] || jl.shownCount,
        totalCount: (jl.totalCount || jl.shownCount) + (jobCounts[jl.job] ? Math.max(0, jobCounts[jl.job] - jl.shownCount) : 0),
        dept: jl.dept
      };
    });
    customList.forEach(function (p) {
      (p.jobs || []).forEach(function (j) {
        if (!existingJobs[j.job]) {
          existingJobs[j.job] = true;
          mergedJobList.push({
            job: j.job,
            shownCount: jobCounts[j.job] || 1,
            totalCount: jobCounts[j.job] || 1,
            dept: j.dept || 'core'
          });
        }
      });
    });

    return Object.assign({}, base, {
      persons: mergedPersons,
      totalCount: (base.totalCount || 0) + customList.length,
      creditCount: (base.creditCount || 0) + customList.length,
      jobList: mergedJobList
    });
  }

  function renderSubjectBanner(subj) {
    document.title = (subj.name_cn || subj.name) + ' 的制作人员 — Bangumi 番组计划';

    var presetBtns = document.querySelectorAll('#bannerCategoryBar [data-subject-id], #bannerCategoryBar [data-subject-preset]');
    presetBtns.forEach(function (btn) {
      var pid = btn.getAttribute('data-subject-id') || btn.getAttribute('data-subject-preset');
      btn.classList.toggle('active', pid === subj.id);
      btn.classList.toggle('is-active', pid === subj.id);
    });

    var coverImg = document.getElementById('subjectCoverImg');
    if (coverImg && subj.cover) {
      coverImg.src = subj.cover;
      coverImg.alt = subj.name_cn || subj.name;
    }

    var typeBadge = document.getElementById('subjectTypeBadge');
    if (typeBadge) typeBadge.textContent = subj.typeLabel || 'TV 动画';

    var rankBadge = document.getElementById('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Rank #' + (subj.rank || 1);

    var titleMain = document.getElementById('subjectTitleMain');
    if (titleMain) titleMain.textContent = subj.name_cn || subj.name;

    var titleSub = document.getElementById('subjectTitleSub');
    if (titleSub) titleSub.textContent = subj.name + ' · ' + (subj.airInfo || '');

    var scoreBadge = document.getElementById('subjectScoreInline');
    if (scoreBadge) {
      scoreBadge.textContent = formatTenStar(subj.score) + ' (' + Number(subj.votes || 0).toLocaleString() + '人评分)';
    }

    renderNavTabs(subj);
  }

  function renderNavTabs(subj) {
    var nav = document.getElementById('subjectNavTabs');
    if (!nav) return;

    var sid = encodeURIComponent(subj.id);
    var epLabel = subj.cat === 'book' ? '章节/卷数' : subj.cat === 'music' ? '曲目列表' : subj.cat === 'game' ? '章节/DLC' : '章节';
    var crtLabel = subj.cat === 'music' ? '关联角色' : subj.cat === 'real' ? '出演角色' : '角色';
    var prsnLabel = subj.cat === 'book' ? '作者/出版社' : subj.cat === 'music' ? '艺术家/制作' : subj.cat === 'game' ? '开发团队' : '制作人员';

    var tabs = [
      { key: 'overview', label: '概览', href: 'subject.html?id=' + sid },
      { key: 'episodes', label: epLabel + ' (' + (subj.totalEpisodes || 28) + ')', href: 'subject-ep.html?id=' + sid },
      { key: 'characters', label: crtLabel + ' (' + (subj.totalCharacters || 91) + ')', href: 'subject-characters.html?id=' + sid },
      { key: 'persons', label: prsnLabel + ' (' + (subj.totalCount || subj.persons.length) + ')', href: 'subject-persons.html?id=' + sid, active: true },
      { key: 'reviews', label: '评论', href: 'subject-reviews.html?id=' + sid + '&tab=reviews' },
      { key: 'topics', label: '讨论版', href: 'subject-reviews.html?id=' + sid + '&tab=board' },
      { key: 'comments', label: '吐槽箱', href: 'subject-comments.html?id=' + sid }
      ,{ key: 'stats', label: '透视', href: 'subject-stats.html?id=' + sid }
      ,{ key: 'wiki', label: '维基修订', href: 'subject-wiki.html?id=' + sid }
    ];

    nav.innerHTML = tabs.map(function (t) {
      return '<li class="subject-nav-tab-item' + (t.active ? ' active' : '') + '">' +
        '<a href="' + t.href + '" class="' + (t.active ? 'focus' : '') + '" data-tab="' + t.key + '">' + escHtml(t.label) + '</a>' +
      '</li>';
    }).join('');
  }

  function filterAndSortPersons(subj) {
    var list = (subj.persons || []).slice();
    var q = (state.query || '').trim().toLowerCase();

    list = list.filter(function (p) {
      if (state.dept !== 'all') {
        var inDept = p.primaryDept === state.dept || (p.jobs || []).some(function (j) { return j.dept === state.dept; });
        if (!inDept) return false;
      }
      if (state.job !== 'all') {
        var hasJob = (p.jobs || []).some(function (j) { return j.job === state.job; });
        if (!hasJob) return false;
      }
      if (state.epOnly) {
        var hasEp = (p.jobs || []).some(function (j) { return Boolean(j.eps && j.eps.trim()); });
        if (!hasEp) return false;
      }
      if (q) {
        var hay = [
          p.name,
          p.name_cn,
          p.bio,
          (p.jobs || []).map(function (j) { return j.job + ' ep ' + (j.eps || ''); }).join(' ')
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (state.sort === 'comments') {
      list.sort(function (a, b) { return (b.comment || 0) - (a.comment || 0); });
    } else if (state.sort === 'jobs') {
      list.sort(function (a, b) { return ((b.jobs || []).length - (a.jobs || []).length) || ((b.comment || 0) - (a.comment || 0)); });
    } else if (state.sort === 'fav') {
      list.sort(function (a, b) {
        var fa = state.favMap[a.id] ? 1 : 0;
        var fb = state.favMap[b.id] ? 1 : 0;
        return (fb - fa) || ((b.comment || 0) - (a.comment || 0));
      });
    }

    return list;
  }

  function renderFilterControls(subj, filteredList) {
    var titleEl = document.getElementById('prsnSectionTitle');
    if (titleEl) titleEl.textContent = subj.staffSectionTitle || '制作人员 (Staff & Crew)';

    var badgeEl = document.getElementById('prsnTotalBadge');
    if (badgeEl) {
      badgeEl.textContent = '当前展示 ' + filteredList.length + ' / 共 ' + (subj.totalCount || subj.persons.length) + ' 人 · ' + (subj.creditCount || subj.persons.length) + ' 职务人次';
    }

    // SecTab (人物 / 职位)
    var secTabPerson = document.getElementById('secTabPerson');
    var secTabPos = document.getElementById('secTabPosition');
    if (secTabPerson) secTabPerson.classList.toggle('selected', state.viewMode === 'person');
    if (secTabPos) secTabPos.classList.toggle('selected', state.viewMode === 'position');

    // 右上角原生职位下拉 div.rr.castTypeFilter.dropdown > a.icon.icon-t
    var ddLabel = document.getElementById('prsnJobDropdownLabel');
    if (ddLabel) {
      ddLabel.textContent = state.job === 'all' ? '按职位筛选 (全部 ' + (subj.jobList || []).length + ' 职)' : '职位：' + state.job;
    }

    var ddMenu = document.getElementById('prsnJobDropdownMenu');
    if (ddMenu) {
      var allItem = '<li><a href="javascript:void(0);" data-job-select="all" class="' + (state.job === 'all' ? 'active' : '') + '"><span>全部职位</span><span class="dd-cnt">' + (subj.persons || []).length + '</span></a></li>';
      var jobItems = (subj.jobList || []).map(function (jl) {
        var isAct = state.job === jl.job;
        return '<li><a href="javascript:void(0);" data-job-select="' + escHtml(jl.job) + '" class="' + (isAct ? 'active' : '') + '">' +
          '<span>' + escHtml(jl.job) + '</span>' +
          '<span class="dd-cnt">' + jl.shownCount + (jl.totalCount > jl.shownCount ? '/' + jl.totalCount : '') + '</span>' +
          '</a></li>';
      }).join('');
      ddMenu.innerHTML = allItem + jobItems;
    }

    // 5 大部门胶囊条
    var deptWrap = document.getElementById('prsnDeptPills');
    if (deptWrap) {
      var deptCounts = { all: (subj.persons || []).length };
      (subj.persons || []).forEach(function (p) {
        var seenDepts = {};
        (p.jobs || []).forEach(function (j) { seenDepts[j.dept] = true; });
        Object.keys(seenDepts).forEach(function (dk) {
          deptCounts[dk] = (deptCounts[dk] || 0) + 1;
        });
      });

      deptWrap.innerHTML = (DATA.departments || []).map(function (d) {
        var cnt = deptCounts[d.key] || 0;
        if (d.key !== 'all' && cnt === 0) return '';
        var isAct = state.dept === d.key;
        return '<button type="button" class="prsn-pill-btn' + (isAct ? ' active' : '') + '" data-dept-pill="' + d.key + '">' +
          '<span>' + escHtml(d.short || d.label) + '</span>' +
          '<span class="prsn-pill-num">' + cnt + '</span>' +
          '</button>';
      }).join('');
    }

    // 高频职位快捷胶囊
    var quickWrap = document.getElementById('prsnQuickJobPills');
    if (quickWrap) {
      var topJobs = (subj.jobList || []).slice(0, 10);
      var resetChip = state.job !== 'all'
        ? '<button type="button" class="prsn-pill-btn is-job-pill active" data-job-select="all">✕ 清除职位: ' + escHtml(state.job) + '</button>'
        : '';
      quickWrap.innerHTML = resetChip + topJobs.map(function (jl) {
        var isAct = state.job === jl.job;
        return '<button type="button" class="prsn-pill-btn is-job-pill' + (isAct ? ' active' : '') + '" data-job-select="' + escHtml(jl.job) + '">' +
          '<span>' + escHtml(jl.job) + '</span>' +
          '<span class="prsn-pill-num">' + jl.shownCount + '</span>' +
          '</button>';
      }).join('');
    }

    var epToggle = document.getElementById('prsnEpOnlyToggleBtn');
    if (epToggle) {
      epToggle.classList.toggle('is-active', state.epOnly);
    }
  }

  function renderPersonCardHtml(p, idx) {
    var parityClass = idx % 2 === 0 ? 'light_odd' : 'light_even';
    var isFav = Boolean(state.favMap[p.id]);
    var extraCmts = (state.cmtMap[p.id] || []).length;
    var totalCmt = (p.comment || 0) + extraCmts;
    var cmtClass = totalCmt > 0 ? 'orange' : 'na';
    var fallbackChar = (p.name_cn || p.name || 'P').trim().charAt(0);
    var showFallback = !p.hasAvatar || (p.img && p.img.indexOf('user/l/icon.jpg') !== -1);

    // 严格遵守 Spec Page 08 选择器: div.prsn_info > span.badge_job + span.tip
    var jobsHtml = (p.jobs || []).map(function (j) {
      var epsTxt = j.eps ? '(ep ' + j.eps + ')' : '';
      var tipClass = j.eps ? 'tip has-eps' : 'tip';
      return '<span class="badge_job" data-dept="' + escHtml(j.dept || 'core') + '" data-job-select="' + escHtml(j.job) + '" title="点击筛选职位：' + escHtml(j.job) + '">' + escHtml(j.job) + '</span>' +
        '<span class="' + tipClass + '" data-person-open="' + p.id + '" title="点击查看集数参与分布">' + escHtml(epsTxt) + '</span>';
    }).join(' ');

    var specsHtml = (p.specs || []).map(function (sp) {
      return '<span class="prsn-spec-chip"><span class="tip_j">' + escHtml(sp.k) + '</span> ' + escHtml(sp.v) + '</span>';
    }).join('');

    return '<a name="id_' + p.id + '"></a>' +
      '<div class="' + parityClass + ' clearit prsn-item-card" id="person_card_' + p.id + '" data-person-id="' + p.id + '">' +
        '<a href="person.html?id=' + p.id + '" class="avatar" data-person-open="' + p.id + '">' +
          '<img src="' + escHtml(p.img) + '" alt="' + escHtml(p.name_cn || p.name) + '" class="avatar avatarTop avatarSize75 ll" referrerpolicy="no-referrer" loading="lazy" />' +
          (showFallback ? '<span class="prsn-avatar-fallback">' + escHtml(fallbackChar) + '</span>' : '') +
        '</a>' +
        '<div class="prsn-card-body">' +
          '<div class="prsn-head-row">' +
            '<h2 class="subtitle">' +
              '<a href="person.html?id=' + p.id + '" class="l">' + escHtml(p.name) + '</a>' +
              (p.name_cn ? ' <span class="tip">' + escHtml(p.name_cn) + '</span>' : ' <span class="tip">' + escHtml(p.name) + '</span>') +
            '</h2>' +
            '<div class="rr">' +
              '<button type="button" class="prsn-fav-btn' + (isFav ? ' is-fav' : '') + '" data-fav-person="' + p.id + '" title="收藏制作人员">' + (isFav ? '★' : '☆') + '</button>' +
              '<a href="person.html?id=' + p.id + '" class="tip icons_cmt" data-person-open="' + p.id + '">讨论</a> ' +
              '<small class="' + cmtClass + '">(+' + totalCmt + ')</small>' +
            '</div>' +
          '</div>' +
          '<div class="prsn_info">' +
            jobsHtml +
          '</div>' +
          '<div class="prsn-meta-row">' +
            '<div class="prsn-bio-preview">' + escHtml(p.bio || '') + '</div>' +
            (specsHtml ? '<div class="prsn-specs-wrap">' + specsHtml + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderPositionGroupHtml(subj, filteredList) {
    // Group filtered persons by job
    var byJob = {};
    filteredList.forEach(function (p) {
      (p.jobs || []).forEach(function (j) {
        if (state.job !== 'all' && j.job !== state.job) return;
        if (!byJob[j.job]) byJob[j.job] = [];
        byJob[j.job].push({ person: p, eps: j.eps, dept: j.dept });
      });
    });

    var orderedJobs = (subj.jobList || []).map(function (jl) { return jl.job; }).filter(function (jName) {
      return byJob[jName] && byJob[jName].length > 0;
    });

    if (!orderedJobs.length) return '';

    return '<div class="line_detail">' + orderedJobs.map(function (jName) {
      var entries = byJob[jName];
      var rowsHtml = entries.map(function (entry, idx) {
        var p = entry.person;
        var rowCls = idx % 2 === 0 ? 'line_odd' : 'line_even';
        var extraCmts = (state.cmtMap[p.id] || []).length;
        var totalCmt = (p.comment || 0) + extraCmts;
        return '<li class="' + rowCls + ' indent clearit">' +
          '<div class="crew-pos-left">' +
            '<img src="' + escHtml(p.img) + '" alt="' + escHtml(p.name) + '" class="crew-pos-avatar" referrerpolicy="no-referrer" loading="lazy" />' +
            '<h6><a href="person.html?id=' + p.id + '" class="l">' + escHtml(p.name) + '</a>' +
              (p.name_cn ? '<span class="tip_j">/ ' + escHtml(p.name_cn) + '</span>' : '') +
            '</h6>' +
            '<p class="prsn_info">' +
              '<span class="badge_job" data-dept="' + escHtml(entry.dept) + '">' + escHtml(jName) + '</span> ' +
              '<span class="tip">' + escHtml(entry.eps ? '(ep ' + entry.eps + ')' : '(全篇统筹)') + '</span>' +
            '</p>' +
          '</div>' +
          '<div class="rr">' +
            '<a href="person.html?id=' + p.id + '" class="tip icons_cmt" data-person-open="' + p.id + '">讨论</a> ' +
            '<small class="na">(+' + totalCmt + ')</small>' +
          '</div>' +
        '</li>';
      }).join('');

      return '<ul class="line_list crew_list">' +
        '<li class="cat"><span>' + escHtml(jName) + '</span><span class="prsn-total-badge">' + entries.length + ' 人</span></li>' +
        rowsHtml +
      '</ul>';
    }).join('') + '</div>';
  }

  function renderMainList(subj, filteredList) {
    var container = document.getElementById('prsnListContainer');
    var posContainer = document.getElementById('prsnPositionContainer');
    if (!container) return;

    if (!filteredList.length) {
      container.innerHTML = '<div class="prsn-side-card" style="text-align:center;padding:36px 20px;">' +
        '<p style="margin:0 0 10px;font-weight:700;">未找到匹配的制作人员</p>' +
        '<p style="margin:0 0 14px;font-size:0.82rem;color:#64748b;">可尝试切换其他部门、重置职位筛选或清空搜索关键词</p>' +
        '<div><button type="button" class="prsn-pill-btn active" id="prsnResetFiltersBtn">重置全部筛选条件</button></div>' +
      '</div>';
      if (posContainer) posContainer.innerHTML = '';
      var resetBtn = document.getElementById('prsnResetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          state.dept = 'all';
          state.job = 'all';
          state.query = '';
          state.epOnly = false;
          var inp = document.getElementById('prsnSearchInput');
          if (inp) inp.value = '';
          renderAll();
        });
      }
      return;
    }

    container.innerHTML = filteredList.map(renderPersonCardHtml).join('');
    if (posContainer) {
      posContainer.innerHTML = renderPositionGroupHtml(subj, filteredList);
    }

    if (state.viewMode === 'position') {
      container.style.display = 'none';
      if (posContainer) posContainer.style.display = 'block';
    } else {
      container.style.display = 'flex';
      if (posContainer) posContainer.style.display = 'none';
    }
  }

  function renderSidebar(subj) {
    var sid = encodeURIComponent(subj.id);

    // 1. #subject_inner_info.menu_inner
    var innerInfo = document.getElementById('subject_inner_info');
    if (innerInfo) {
      innerInfo.innerHTML =
        '<a href="subject.html?id=' + sid + '" class="avatar" title="' + escHtml(subj.name_cn || subj.name) + '">' +
          '<img src="' + escHtml(subj.cover) + '" class="avatar ll" referrerpolicy="no-referrer" alt="' + escHtml(subj.name_cn || subj.name) + '" />' +
        '</a>' +
        '<div class="inner">' +
          '<div style="font-size:0.88rem;font-weight:800;margin-bottom:4px;">' + escHtml(subj.name_cn || subj.name) + '</div>' +
          '<ul class="grouped clearit">' +
            '<li><a href="subject.html?id=' + sid + '" class="l">/ 返回条目</a></li>' +
            '<li><a href="subject-characters.html?id=' + sid + '">/ 查看角色与声优 (' + (subj.totalCharacters || 91) + ')</a></li>' +
            '<li><a href="subject-ep.html?id=' + sid + '">/ 查看章节列表 (' + (subj.totalEpisodes || 28) + ')</a></li>' +
          '</ul>' +
        '</div>';
    }

    // 2. 部门构成统计条
    var deptStatsEl = document.getElementById('prsnSideDeptStats');
    if (deptStatsEl) {
      var totalP = Math.max(1, (subj.persons || []).length);
      var counts = {};
      (subj.persons || []).forEach(function (p) {
        var seen = {};
        (p.jobs || []).forEach(function (j) { seen[j.dept] = true; });
        Object.keys(seen).forEach(function (dk) { counts[dk] = (counts[dk] || 0) + 1; });
      });

      deptStatsEl.innerHTML = (DATA.departments || []).filter(function (d) { return d.key !== 'all'; }).map(function (d) {
        var c = counts[d.key] || 0;
        var pct = Math.min(100, Math.round((c / totalP) * 100));
        return '<div class="prsn-dept-stat-row" data-dept-pill="' + d.key + '" title="点击筛选：' + escHtml(d.label) + '">' +
          '<div class="prsn-dept-stat-head">' +
            '<span>' + escHtml(d.short) + '</span>' +
            '<span>' + c + ' 人 (' + pct + '%)</span>' +
          '</div>' +
          '<div class="prsn-dept-bar-track">' +
            '<div class="prsn-dept-bar-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // 3. 核心主创速览矩阵
    var keyGridEl = document.getElementById('prsnSideKeyCredits');
    if (keyGridEl) {
      var highlights = (subj.persons || []).slice(0, 6);
      keyGridEl.innerHTML = highlights.map(function (p) {
        var mainJob = (p.jobs && p.jobs[0] && p.jobs[0].job) || '主创';
        return '<div class="prsn-key-credit-box" data-person-open="' + p.id + '">' +
          '<div class="prsn-key-credit-role">' + escHtml(mainJob) + '</div>' +
          '<div class="prsn-key-credit-name">' + escHtml(p.name_cn || p.name) + '</div>' +
        '</div>';
      }).join('');
    }

    // 4. 维基协力入口 a.l[href="/subject/{id}/add_related/person"]
    var wikiLink = document.getElementById('prsnAddRelatedLink');
    if (wikiLink) {
      wikiLink.setAttribute('href', '/subject/' + subj.id + '/add_related/person');
    }
  }

  function parseParticipatedEpisodes(epsStr, maxEp) {
    var set = {};
    if (!epsStr) return set;
    var parts = String(epsStr).split(/[,，、\s]+/);
    parts.forEach(function (token) {
      var mRange = token.match(/^(\d+)-(\d+)$/);
      if (mRange) {
        var s = parseInt(mRange[1], 10);
        var e = parseInt(mRange[2], 10);
        for (var k = s; k <= Math.min(e, maxEp); k++) {
          set[k] = true;
        }
      } else {
        var mNum = token.match(/^(\d+)$/);
        if (mNum) {
          set[parseInt(mNum[1], 10)] = true;
        }
      }
    });
    return set;
  }

  function openPersonDrawer(personId) {
    var subj = getCurrentSubject();
    var pid = Number(personId);
    var person = (subj.persons || []).find(function (p) { return Number(p.id) === pid; });
    if (!person) return;

    state.activePersonId = pid;
    var backdrop = document.getElementById('prsnDetailDrawer');
    var body = document.getElementById('prsnDrawerBody');
    if (!backdrop || !body) return;

    var maxEp = Math.min(36, subj.totalEpisodes || 28);
    var epJobMap = {};
    (person.jobs || []).forEach(function (j) {
      var epSet = parseParticipatedEpisodes(j.eps, maxEp);
      Object.keys(epSet).forEach(function (epNum) {
        if (!epJobMap[epNum]) epJobMap[epNum] = [];
        epJobMap[epNum].push(j.job);
      });
    });

    var epCellsHtml = '';
    for (var ep = 1; ep <= maxEp; ep++) {
      var roles = epJobMap[ep] || [];
      var isPart = roles.length > 0;
      epCellsHtml += '<a href="ep.html?subject=' + encodeURIComponent(subj.id) + '&ep=' + ep + '" class="prsn-ep-cell' + (isPart ? ' is-participated' : '') + '" title="' + (isPart ? 'EP.' + ep + ' 担任：' + escHtml(roles.join(' / ')) : 'EP.' + ep + ' 点击进入单集讨论') + '">' +
        '<span>EP.' + (ep < 10 ? '0' + ep : ep) + '</span>' +
      '</a>';
    }

    var worksHtml = (person.works || []).map(function (w) {
      return '<li style="margin-bottom:5px;font-size:0.82rem;">' + escHtml(w) + '</li>';
    }).join('');

    var extraCmts = state.cmtMap[person.id] || [];
    var defaultCmts = [
      { user: ' SakugaFan', time: '2026-10-18', text: (person.name_cn || person.name) + ' 在本作的演出节奏与镜头调度太稳了，尤其是关键回的情感张力拉满！' },
      { user: ' 考据班长', time: '2026-11-02', text: '翻了一下过去履历，从分镜到现场把控都是行业顶配水准。' }
    ];
    var allCmts = extraCmts.concat(defaultCmts);

    var isFav = Boolean(state.favMap[person.id]);

    body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:14px;">' +
          '<img src="' + escHtml(person.img) + '" alt="' + escHtml(person.name) + '" style="width:68px;height:68px;border-radius:14px;object-fit:cover;border:1px solid rgba(240,145,153,0.35);" referrerpolicy="no-referrer" />' +
          '<div>' +
            '<div style="font-size:1.15rem;font-weight:800;">' + escHtml(person.name) + '</div>' +
            '<div style="font-size:0.86rem;color:#64748b;margin-top:2px;">' + escHtml(person.name_cn || person.name) + ' · ID #' + person.id + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<a href="person.html?id=' + escHtml(person.id) + '" class="prsn-pill-btn active" style="text-decoration:none;">完整人物档案 →</a>' +
          '<button type="button" class="prsn-pill-btn' + (isFav ? ' active' : '') + '" id="drawerFavBtn">' + (isFav ? '★ 已收藏人物' : '☆ 收藏人物') + '</button>' +
          '<button type="button" class="prsn-pill-btn" id="drawerCloseBtn">✕ 关闭</button>' +
        '</div>' +
      '</div>' +
      '<div class="prsn-side-card">' +
        '<h3><span>在本作担任职务</span><span class="prsn-total-badge">' + (person.jobs || []).length + ' 项职务</span></h3>' +
        '<div class="prsn_info">' +
          (person.jobs || []).map(function (j) {
            return '<span class="badge_job" data-dept="' + escHtml(j.dept) + '">' + escHtml(j.job) + '</span>' +
              '<span class="tip">' + escHtml(j.eps ? '(ep ' + j.eps + ')' : '(全篇统筹)') + '</span>';
          }).join(' ') +
        '</div>' +
      '</div>' +
      '<div class="prsn-side-card">' +
        '<h3><span>人物履历与代表作</span></h3>' +
        '<p style="margin:0;font-size:0.83rem;line-height:1.6;">' + escHtml(person.bio) + '</p>' +
        (worksHtml ? '<ul style="margin:6px 0 0;padding-left:18px;">' + worksHtml + '</ul>' : '') +
      '</div>' +
      '<div class="prsn-side-card">' +
        '<h3><span>各话参与集数分布 (点击跳往单集讨论)</span><span style="font-size:0.74rem;color:#64748b;">高亮 = 参与制作回</span></h3>' +
        '<div class="prsn-ep-matrix">' + epCellsHtml + '</div>' +
      '</div>' +
      '<div class="prsn-side-card">' +
        '<h3><span>人物讨论板 (+' + ((person.comment || 0) + extraCmts.length) + ')</span></h3>' +
        '<div style="display:flex;gap:8px;">' +
          '<input type="text" id="drawerCmtInput" placeholder="聊聊这位制作人员在本作的表现..." style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid rgba(15,23,42,0.14);font-size:0.82rem;" />' +
          '<button type="button" class="prsn-pill-btn active" id="drawerCmtSubmit">发送</button>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">' +
          allCmts.map(function (c) {
            return '<div style="padding:9px 12px;border-radius:10px;background:rgba(15,23,42,0.03);font-size:0.8rem;">' +
              '<div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:3px;"><span>' + escHtml(c.user) + '</span><span style="color:#94a3b8;font-size:0.73rem;">' + escHtml(c.time) + '</span></div>' +
              '<div>' + escHtml(c.text) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

    backdrop.classList.add('is-open');

    var closeBtn = document.getElementById('drawerCloseBtn');
    if (closeBtn) closeBtn.onclick = function () { backdrop.classList.remove('is-open'); };

    var favBtn = document.getElementById('drawerFavBtn');
    if (favBtn) {
      favBtn.onclick = function () {
        toggleFavPerson(person.id);
        openPersonDrawer(person.id);
      };
    }

    var cmtBtn = document.getElementById('drawerCmtSubmit');
    var cmtInp = document.getElementById('drawerCmtInput');
    if (cmtBtn && cmtInp) {
      cmtBtn.onclick = function () {
        var txt = cmtInp.value.trim();
        if (!txt) return;
        if (!state.cmtMap[person.id]) state.cmtMap[person.id] = [];
        state.cmtMap[person.id].unshift({
          user: 'Bangumi 考据党 (我)',
          time: '刚刚',
          text: txt
        });
        saveJson(CMT_KEY, state.cmtMap);
        renderAll();
        openPersonDrawer(person.id);
      };
    }
  }

  function toggleFavPerson(pid) {
    if (state.favMap[pid]) {
      delete state.favMap[pid];
    } else {
      state.favMap[pid] = true;
    }
    saveJson(FAV_KEY, state.favMap);
    renderAll();
  }

  function renderAll() {
    var subj = getCurrentSubject();
    renderSubjectBanner(subj);
    var filtered = filterAndSortPersons(subj);
    renderFilterControls(subj, filtered);
    renderMainList(subj, filtered);
    renderSidebar(subj);
    syncUrlParams();
  }

  function bindEvents() {
    // 1. 顶部 8 部作品预设切换
    document.addEventListener('click', function (e) {
      var presetBtn = e.target.closest('[data-subject-id], [data-subject-preset]');
      if (presetBtn) {
        e.preventDefault();
        var newId = presetBtn.getAttribute('data-subject-id') || presetBtn.getAttribute('data-subject-preset');
        if (newId && DATA.subjects[newId]) {
          state.subjectId = newId;
          state.dept = 'all';
          state.job = 'all';
          state.query = '';
          var sInp = document.getElementById('prsnSearchInput');
          if (sInp) sInp.value = '';
          renderAll();
        }
        return;
      }

      // 2. 右上角职位筛选下拉开关
      var ddTrigger = e.target.closest('#prsnJobDropdown > a.icon.icon-t');
      var ddBox = document.getElementById('prsnJobDropdown');
      if (ddTrigger && ddBox) {
        e.preventDefault();
        ddBox.classList.toggle('is-open');
        return;
      }

      // 3. 选择具体职位 (下拉或快捷胶囊或卡片内 badge_job)
      var jobBtn = e.target.closest('[data-job-select]');
      if (jobBtn) {
        e.preventDefault();
        var selectedJob = jobBtn.getAttribute('data-job-select');
        state.job = (state.job === selectedJob && selectedJob !== 'all') ? 'all' : selectedJob;
        if (ddBox) ddBox.classList.remove('is-open');
        renderAll();
        return;
      }

      if (ddBox && !e.target.closest('#prsnJobDropdown')) {
        ddBox.classList.remove('is-open');
      }

      // 4. 部门胶囊或侧栏部门进度条切换
      var deptBtn = e.target.closest('[data-dept-pill]');
      if (deptBtn) {
        e.preventDefault();
        var dk = deptBtn.getAttribute('data-dept-pill');
        state.dept = (state.dept === dk && dk !== 'all') ? 'all' : dk;
        renderAll();
        return;
      }

      // 5. 二级视图切换 (#SecTab: 人物 / 职位)
      var secTabLink = e.target.closest('[data-sec-view]');
      if (secTabLink) {
        e.preventDefault();
        state.viewMode = secTabLink.getAttribute('data-sec-view') || 'person';
        renderAll();
        return;
      }

      // 6. 收藏按钮
      var favBtn = e.target.closest('[data-fav-person]');
      if (favBtn) {
        e.preventDefault();
        toggleFavPerson(Number(favBtn.getAttribute('data-fav-person')));
        return;
      }

      // 7. 打开人物详情抽屉
      var openTrigger = e.target.closest('[data-person-open]');
      if (openTrigger) {
        e.preventDefault();
        openPersonDrawer(openTrigger.getAttribute('data-person-open'));
        return;
      }

      // 8. 维基协力新增制作人员弹窗
      var wikiTrigger = e.target.closest('#prsnAddRelatedLink');
      if (wikiTrigger) {
        e.preventDefault();
        var modal = document.getElementById('prsnWikiModal');
        if (modal) modal.classList.add('is-open');
        return;
      }
    });

    var searchInp = document.getElementById('prsnSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        state.query = searchInp.value;
        renderAll();
      });
    }

    var sortSel = document.getElementById('prsnSortSelect');
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        state.sort = sortSel.value;
        renderAll();
      });
    }

    var epToggle = document.getElementById('prsnEpOnlyToggleBtn');
    if (epToggle) {
      epToggle.addEventListener('click', function () {
        state.epOnly = !state.epOnly;
        renderAll();
      });
    }

    var drawerBackdrop = document.getElementById('prsnDetailDrawer');
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', function (e) {
        if (e.target === drawerBackdrop) drawerBackdrop.classList.remove('is-open');
      });
    }

    var wikiModal = document.getElementById('prsnWikiModal');
    var wikiCancel = document.getElementById('prsnWikiCancelBtn');
    var wikiForm = document.getElementById('prsnWikiForm');
    if (wikiCancel && wikiModal) {
      wikiCancel.addEventListener('click', function () {
        wikiModal.classList.remove('is-open');
      });
    }
    if (wikiModal) {
      wikiModal.addEventListener('click', function (e) {
        if (e.target === wikiModal) wikiModal.classList.remove('is-open');
      });
    }
    if (wikiForm) {
      wikiForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameVal = (document.getElementById('wikiPrsnName').value || '').trim();
        var cnVal = (document.getElementById('wikiPrsnNameCn').value || '').trim();
        var jobVal = (document.getElementById('wikiPrsnJob').value || '原画').trim();
        var epsVal = (document.getElementById('wikiPrsnEps').value || '').trim();
        var deptVal = (document.getElementById('wikiPrsnDept').value || 'animation').trim();
        var bioVal = (document.getElementById('wikiPrsnBio').value || '').trim();
        if (!nameVal) return;

        var newPerson = {
          id: Math.floor(80000 + Math.random() * 19000),
          name: nameVal,
          name_cn: cnVal || nameVal,
          img: 'https://lain.bgm.tv/pic/user/l/icon.jpg',
          hasAvatar: false,
          comment: 1,
          jobs: [{ job: jobVal, eps: epsVal, dept: deptVal }],
          primaryDept: deptVal,
          specs: [{ k: '来源', v: '维基协力新增' }],
          bio: bioVal || (cnVal || nameVal) + '，通过 Bangumi 维基协力关联至本条目，担任 ' + jobVal + (epsVal ? ' (ep ' + epsVal + ')' : '') + '。',
          works: ['本作担任：' + jobVal + (epsVal ? ' (ep ' + epsVal + ')' : '')]
        };

        if (!state.customMap[state.subjectId]) state.customMap[state.subjectId] = [];
        state.customMap[state.subjectId].unshift(newPerson);
        saveJson(CUSTOM_KEY, state.customMap);
        wikiForm.reset();
        if (wikiModal) wikiModal.classList.remove('is-open');
        renderAll();
      });
    }
  }

  function init() {
    parseUrlParams();
    bindEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
