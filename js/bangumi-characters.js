/* ==========================================================================
   Bangumi Character & Cast List Controller (B4 / Page 07: /subject/{id}/characters)
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.CHARACTER_DATA || { defaultSubjectId: '400602', subjects: {} };
  var FAV_STORAGE_KEY = 'bgm_crt_favs_v1';
  var CUSTOM_CRT_PREFIX = 'bgm_crt_custom_v1_';
  var CMT_STORAGE_PREFIX = 'bgm_crt_cmts_v1_';

  var state = {
    subjectId: '400602',
    roleFilter: 'all',     // 'all' | '1' | '2' | '3' | '4'
    voiceFilter: 'all',    // 'all' | 'CV' | '中配' | 'other'
    searchQuery: '',
    sortBy: 'default',     // 'default' | 'comment' | 'id' | 'fav'
    spoilerShield: true,
    favIds: {}
  };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 传统十星评分格式：★×n + ☆×(10-n) + 数字，严禁 5 星折算 */
  function formatTenStars(score) {
    var num = Number(score) || 8.0;
    var stars = Math.max(0, Math.min(10, Math.round(num)));
    return '★'.repeat(stars) + '☆'.repeat(10 - stars) + ' ' + num.toFixed(1);
  }

  function loadFavs() {
    try {
      var raw = localStorage.getItem(FAV_STORAGE_KEY);
      state.favIds = raw ? JSON.parse(raw) : {};
    } catch (e) {
      state.favIds = {};
    }
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(state.favIds));
    } catch (e) {}
  }

  function getCustomCharacters(subjectId) {
    try {
      var raw = localStorage.getItem(CUSTOM_CRT_PREFIX + subjectId);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomCharacter(subjectId, crtObj) {
    var list = getCustomCharacters(subjectId);
    list.unshift(crtObj);
    try {
      localStorage.setItem(CUSTOM_CRT_PREFIX + subjectId, JSON.stringify(list));
    } catch (e) {}
  }

  function getCharacterComments(crt) {
    try {
      var raw = localStorage.getItem(CMT_STORAGE_PREFIX + crt.id);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var baseName = crt.name_cn || crt.name;
    var primaryCv = (crt.actors && crt.actors[0]) ? crt.actors[0].name : '担当声优';
    return [
      {
        user: 'Aoko_Magic',
        time: '2026-10-18 22:14',
        text: '「' + baseName + '」塑造得太细腻了，微表情与台词停顿完全立住了人物弧光！'
      },
      {
        user: 'Spiegel_Bebop',
        time: '2026-09-29 19:40',
        text: primaryCv + ' 的声线演绎堪称教科书级别，情绪爆发力和日常反差感拉满。'
      }
    ];
  }

  function addCharacterComment(crt, text) {
    var list = getCharacterComments(crt);
    list.unshift({
      user: '坂田银时 (我)',
      time: '刚刚',
      text: text
    });
    try {
      localStorage.setItem(CMT_STORAGE_PREFIX + crt.id, JSON.stringify(list));
    } catch (e) {}
    crt.comment = (Number(crt.comment) || 0) + 1;
    return list;
  }

  function getActiveSubject() {
    return DATA.subjects[state.subjectId] || DATA.subjects[DATA.defaultSubjectId];
  }

  function getAllCharactersForSubject(subj) {
    if (!subj) return [];
    var custom = getCustomCharacters(subj.id);
    return custom.concat(subj.characters || []);
  }

  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove('show');
      toast.hidden = true;
    }, 2400);
  }

  /* ==================== 渲染顶栏与条目导航头 ==================== */
  function renderSubjectHeader(subj) {
    if (!subj) return;
    document.title = (subj.name_cn || subj.name) + ' 的角色列表 · Bangumi 番组计划';

    var catBtns = document.querySelectorAll('#bannerCategoryBar [data-subject-id]');
    catBtns.forEach(function (btn) {
      var sid = btn.getAttribute('data-subject-id');
      btn.classList.toggle('active', sid === String(subj.id));
    });

    var typeBadge = document.getElementById('subjectTypeBadge');
    if (typeBadge) typeBadge.textContent = subj.typeLabel || 'TV 动画';

    var rankBadge = document.getElementById('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Rank #' + (subj.rank || '--');

    var titleJp = document.getElementById('subjectTitleJp');
    if (titleJp) titleJp.textContent = subj.name || subj.name_cn;

    var titleCn = document.getElementById('subjectTitleCn');
    if (titleCn) titleCn.textContent = subj.name_cn && subj.name_cn !== subj.name ? subj.name_cn : '';

    var backdrop = document.getElementById('subjectBackdrop');
    if (backdrop && subj.cover) {
      backdrop.style.backgroundImage = 'url("' + subj.cover + '")';
    }

    var allList = getAllCharactersForSubject(subj);
    var totalCrtCount = Math.max(allList.length, subj.totalCount || allList.length);

    var navTabs = document.getElementById('subjectNavTabs');
    if (navTabs) {
      var epLabel = subj.cat === 'music' ? '曲目列表' : (subj.cat === 'book' ? '章节/单行本' : '章节');
      var crtLabel = subj.cat === 'real' ? '出演者' : '角色';
      var tabs = [
        { key: 'overview', label: '概览', href: 'subject.html?id=' + encodeURIComponent(subj.id) },
        { key: 'episodes', label: epLabel, href: 'subject-ep.html?id=' + encodeURIComponent(subj.id) },
        { key: 'characters', label: crtLabel, count: totalCrtCount, href: 'subject-characters.html?id=' + encodeURIComponent(subj.id), active: true },
        { key: 'staff', label: '制作人员', href: 'subject-persons.html?id=' + encodeURIComponent(subj.id) },
        { key: 'relations', label: '关联', href: 'subject.html?id=' + encodeURIComponent(subj.id) },
        { key: 'comments', label: '吐槽', href: 'subject-comments.html?id=' + encodeURIComponent(subj.id) },
        { key: 'reviews', label: '评论', href: 'subject-reviews.html?id=' + encodeURIComponent(subj.id) + '&tab=reviews' },
        { key: 'board', label: '讨论版', href: 'subject-reviews.html?id=' + encodeURIComponent(subj.id) + '&tab=board' },
        { key: 'stats', label: '透视分析', href: 'subject-stats.html?id=' + encodeURIComponent(subj.id) },
        { key: 'wiki', label: '维基修订', href: 'subject-wiki.html?id=' + encodeURIComponent(subj.id) }
      ];
      navTabs.innerHTML = tabs.map(function (t) {
        var liCls = t.active ? 'subject-nav-tab-item active' : 'subject-nav-tab-item';
        var cntHtml = t.count != null ? (' <span class="tab-count">' + esc(t.count) + '</span>') : '';
        return '<li class="' + liCls + '"><a href="' + t.href + '" data-tab="' + t.key + '">' + esc(t.label) + cntHtml + '</a></li>';
      }).join('');
    }
  }

  /* ==================== 筛选与排序计算 ==================== */
  function filterAndSortCharacters(allList) {
    var q = state.searchQuery.trim().toLowerCase();
    var filtered = allList.filter(function (c) {
      if (state.roleFilter !== 'all') {
        if (state.roleFilter === '3') {
          if (c.role_type !== '3' && c.role_type !== '4') return false;
        } else if (String(c.role_type) !== String(state.roleFilter)) {
          return false;
        }
      }
      if (state.voiceFilter !== 'all') {
        var actors = c.actors || [];
        if (state.voiceFilter === 'CV') {
          var hasJp = actors.some(function (a) { return a.tag === 'CV' || a.rltType === '0'; });
          if (!hasJp) return false;
        } else if (state.voiceFilter === '中配') {
          var hasCn = actors.some(function (a) { return a.tag === '中配' || (a.note && a.note.indexOf('中') >= 0); });
          if (!hasCn) return false;
        } else if (state.voiceFilter === 'other') {
          var hasOther = actors.some(function (a) { return a.tag !== 'CV' && a.tag !== '中配'; });
          if (!hasOther && actors.length > 0) return false;
        }
      }
      if (q) {
        var hay = [
          c.name,
          c.name_cn,
          c.role,
          c.summary || '',
          (c.specs || []).map(function (s) { return s.k + ' ' + s.v; }).join(' '),
          (c.actors || []).map(function (a) { return a.name + ' ' + (a.note || '') + ' ' + (a.tag || ''); }).join(' ')
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var sorted = filtered.slice();
    if (state.sortBy === 'comment') {
      sorted.sort(function (a, b) { return (b.comment || 0) - (a.comment || 0); });
    } else if (state.sortBy === 'id') {
      sorted.sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    } else if (state.sortBy === 'fav') {
      sorted.sort(function (a, b) {
        var fa = state.favIds[a.id] ? 1 : 0;
        var fb = state.favIds[b.id] ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return (b.comment || 0) - (a.comment || 0);
      });
    }
    return sorted;
  }

  /* ==================== 渲染左栏角色列表 (#browserItemList) ==================== */
  function renderCharacterList(subj) {
    var allList = getAllCharactersForSubject(subj);
    var list = filterAndSortCharacters(allList);

    var counts = { all: allList.length, '1': 0, '2': 0, '3': 0, '4': 0 };
    allList.forEach(function (c) {
      var rt = String(c.role_type || '2');
      counts[rt] = (counts[rt] || 0) + 1;
    });
    var guestCombined = (counts['3'] || 0) + (counts['4'] || 0);

    var sectionTitle = document.getElementById('crtSectionTitle');
    if (sectionTitle) {
      sectionTitle.textContent = subj.actorSectionTitle || '角色介绍';
    }
    var totalBadge = document.getElementById('crtTotalBadge');
    if (totalBadge) {
      totalBadge.textContent = '展示 ' + list.length + ' / 共 ' + Math.max(allList.length, subj.totalCount || allList.length) + ' 名角色';
    }

    var roleLabels = {
      all: '全部 (' + counts.all + ')',
      '1': '主角 (' + counts['1'] + ')',
      '2': '配角 (' + counts['2'] + ')',
      '3': '客串 (' + guestCombined + ')'
    };
    var ddTitle = document.getElementById('castFilterDropdownTitle');
    if (ddTitle) {
      ddTitle.textContent = state.roleFilter === 'all' ? '筛选' : ('筛选: ' + roleLabels[state.roleFilter]);
    }
    var ddLinks = document.querySelectorAll('#castTypeDropdownMenu a[data-role]');
    ddLinks.forEach(function (a) {
      var r = a.getAttribute('data-role');
      a.classList.toggle('active', r === state.roleFilter);
      var cntSpan = a.querySelector('.dd-cnt');
      if (cntSpan) {
        cntSpan.textContent = r === 'all' ? counts.all : (r === '3' ? guestCombined : (counts[r] || 0));
      }
    });

    var rolePills = document.querySelectorAll('#crtRolePills .crt-pill-btn');
    rolePills.forEach(function (btn) {
      var r = btn.getAttribute('data-role');
      btn.classList.toggle('active', r === state.roleFilter);
      var numEl = btn.querySelector('.crt-pill-num');
      if (numEl) {
        numEl.textContent = r === 'all' ? counts.all : (r === '3' ? guestCombined : (counts[r] || 0));
      }
    });

    var voicePills = document.querySelectorAll('#crtVoiceFilterPills .crt-pill-btn');
    voicePills.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-voice') === state.voiceFilter);
    });

    var spoilerBtn = document.getElementById('crtSpoilerToggleBtn');
    if (spoilerBtn) {
      spoilerBtn.classList.toggle('is-active', state.spoilerShield);
      spoilerBtn.textContent = state.spoilerShield ? '🛡️ 剧透防护: 开启' : '👁️ 剧透防护: 关闭';
    }

    var container = document.getElementById('browserItemList');
    if (!container) return;
    container.classList.toggle('is-spoiler-shield', state.spoilerShield);

    if (list.length === 0) {
      container.innerHTML =
        '<div class="crt-empty-state">' +
          '<p style="font-size:15px;font-weight:700;margin:0 0 6px;color:var(--ink);">未找到符合当前筛选条件的角色</p>' +
          '<p style="font-size:12.5px;margin:0 0 14px;">请尝试切换职位类别、配音语种或清空搜索关键词</p>' +
          '<button type="button" class="crt-btn-ghost" id="crtResetFilterBtn">重置全部筛选条件</button>' +
        '</div>';
      var resetBtn = document.getElementById('crtResetFilterBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          state.roleFilter = 'all';
          state.voiceFilter = 'all';
          state.searchQuery = '';
          var sInput = document.getElementById('crtSearchInput');
          if (sInput) sInput.value = '';
          renderAll();
        });
      }
      return;
    }

    container.innerHTML = list.map(function (c, idx) {
      var parityClass = idx % 2 === 0 ? 'light_odd' : 'light_even';
      var spoilerClass = c.spoiler ? ' is-spoiler-item' : '';
      var isFav = !!state.favIds[c.id];
      var cnText = c.name_cn ? ('/ ' + c.name_cn) : '';

      var specsHtml = (c.specs || []).map(function (sp) {
        return '<span class="crt-spec-chip"><span class="tip_j">' + esc(sp.k) + '</span> ' + esc(sp.v) + '</span>';
      }).join(' ');

      var actorsToShow = (c.actors || []).filter(function (a) {
        if (state.voiceFilter === 'CV') return a.tag === 'CV' || a.rltType === '0';
        if (state.voiceFilter === '中配') return a.tag === '中配' || (a.note && a.note.indexOf('中') >= 0);
        return true;
      });

      var actorsHtml = actorsToShow.map(function (ac) {
        var rltType = ac.rltType != null ? ac.rltType : '0';
        var tagName = ac.tag || 'CV';
        var primaryVal = ac.primary ? '1' : '';
        return (
          '<div class="actorBadge badge_actor clearit" attr-rlt-type="' + esc(rltType) + '" att-rlt-type-name="' + esc(tagName) + '" attr-rlt-primary="' + primaryVal + '" data-person-id="' + esc(ac.id) + '" data-crt-id="' + esc(c.id) + '">' +
            '<a href="person.html?id=' + esc(ac.id) + '" class="avatar">' +
              '<img src="' + esc(ac.avatar) + '" class="avatar avatarSize32 ll" width="32" height="32" referrerpolicy="no-referrer" loading="lazy" alt="' + esc(ac.name) + '">' +
            '</a>' +
            '<div class="crt-actor-meta">' +
              '<p><a href="person.html?id=' + esc(ac.id) + '" class="l">' + esc(ac.name) + '</a>' +
                (ac.note ? '<small class="grey">' + esc(ac.note) + '</small>' : '') +
              '</p>' +
              '<p><span class="tip_j">' + esc(tagName) + '</span></p>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      return (
        '<div class="item ' + parityClass + spoilerClass + '" data-crt-id="' + esc(c.id) + '" data-role-type="' + esc(c.role_type) + '">' +
          '<a href="character.html?id=' + esc(c.id) + '" class="avatar" data-action="open-crt" data-crt-id="' + esc(c.id) + '">' +
            '<img src="' + esc(c.img) + '" class="avatar avatarTop avatarSize75Portrait spoilerable ll" referrerpolicy="no-referrer" loading="lazy" alt="' + esc(c.name) + '">' +
            (c.spoiler && state.spoilerShield ? '<span class="crt-spoiler-ribbon">剧透保护</span>' : '') +
          '</a>' +
          '<div class="clearit spoilerable">' +
            '<div class="crt-head-row">' +
              '<div class="rr">' +
                '<a href="character.html?id=' + esc(c.id) + '" class="tip icons_cmt" data-action="open-crt" data-crt-id="' + esc(c.id) + '">讨论</a> ' +
                '<small class="na">(+' + esc(c.comment || 0) + ')</small>' +
                '<button type="button" class="crt-fav-btn' + (isFav ? ' is-faved' : '') + '" data-action="toggle-fav" data-crt-id="' + esc(c.id) + '" title="' + (isFav ? '取消收藏角色' : '收藏该角色') + '">' + (isFav ? '★' : '☆') + '</button>' +
              '</div>' +
              '<h2 class="subtitle">' +
                '<a href="character.html?id=' + esc(c.id) + '" class="l">' + esc(c.name) + '</a> ' +
                (cnText ? '<span class="tip">' + esc(cnText) + '</span>' : '') +
              '</h2>' +
            '</div>' +
            '<div class="crt_info prsn_info">' +
              '<span class="tip">' +
                '<span class="badge_job_tip badge_job" attr-crt-type="' + esc(c.role_type) + '">' + esc(c.role) + '</span> ' +
                specsHtml +
              '</span>' +
            '</div>' +
            (c.summary ? '<p class="crt-summary-line">' + esc(c.summary) + '</p>' : '') +
            (actorsHtml ? '<div class="crt-actors-grid">' + actorsHtml + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ==================== 渲染右侧栏 (#columnInSubjectB) ==================== */
  function renderSidebar(subj) {
    if (!subj) return;
    var allList = getAllCharactersForSubject(subj);

    var innerInfo = document.getElementById('subject_inner_info');
    if (innerInfo) {
      innerInfo.innerHTML =
        '<div class="crt-subject-mini-head">' +
          '<a href="subject.html?id=' + encodeURIComponent(subj.id) + '" class="avatar" title="' + esc(subj.name_cn || subj.name) + '">' +
            '<img src="' + esc(subj.cover) + '" class="avatar ll" referrerpolicy="no-referrer" alt="' + esc(subj.name_cn || subj.name) + '">' +
          '</a>' +
          '<div class="crt-subject-mini-info">' +
            '<p class="crt-subject-mini-title">' + esc(subj.name_cn || subj.name) + '</p>' +
            '<p class="crt-subject-mini-sub">' + esc(subj.typeLabel) + ' · Rank #' + esc(subj.rank || '--') + '</p>' +
            '<div class="crt-subject-mini-stars">' + esc(formatTenStars(subj.score)) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="inner">' +
          '<ul>' +
            '<li><a href="subject.html?id=' + encodeURIComponent(subj.id) + '" class="l"><span>/ 返回条目概览</span><span>→</span></a></li>' +
            '<li><a href="subject-ep.html?id=' + encodeURIComponent(subj.id) + '" class="l"><span>/ 查看章节与进度</span><span>→</span></a></li>' +
          '</ul>' +
        '</div>';
    }

    var counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    var personSet = {};
    var totalCmt = 0;
    allList.forEach(function (c) {
      var rt = String(c.role_type || '2');
      counts[rt] = (counts[rt] || 0) + 1;
      totalCmt += Number(c.comment || 0);
      (c.actors || []).forEach(function (a) {
        if (a.id) personSet[a.id] = true;
      });
    });
    var total = Math.max(1, allList.length);
    var p1 = Math.round((counts['1'] / total) * 100);
    var p2 = Math.round((counts['2'] / total) * 100);
    var p3 = Math.round(((counts['3'] + counts['4']) / total) * 100);

    var statsBody = document.getElementById('crtSideStatsBody');
    if (statsBody) {
      statsBody.innerHTML =
        '<div class="crt-stat-bars">' +
          '<div class="crt-stat-row" data-role-jump="1">' +
            '<div class="crt-stat-row-top"><span>主角 (Main Cast)</span><span>' + counts['1'] + ' 人 (' + p1 + '%)</span></div>' +
            '<div class="crt-stat-track"><div class="crt-stat-fill is-main" style="width:' + p1 + '%"></div></div>' +
          '</div>' +
          '<div class="crt-stat-row" data-role-jump="2">' +
            '<div class="crt-stat-row-top"><span>配角 (Supporting)</span><span>' + counts['2'] + ' 人 (' + p2 + '%)</span></div>' +
            '<div class="crt-stat-track"><div class="crt-stat-fill is-sub" style="width:' + p2 + '%"></div></div>' +
          '</div>' +
          '<div class="crt-stat-row" data-role-jump="3">' +
            '<div class="crt-stat-row-top"><span>客串 / 闲角 (Guest)</span><span>' + (counts['3'] + counts['4']) + ' 人 (' + p3 + '%)</span></div>' +
            '<div class="crt-stat-track"><div class="crt-stat-fill is-guest" style="width:' + p3 + '%"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="crt-kpi-mini-grid">' +
          '<div class="crt-kpi-box"><span class="crt-kpi-val">' + Object.keys(personSet).length + ' 位</span><span class="crt-kpi-lbl">参演声优/演员</span></div>' +
          '<div class="crt-kpi-box"><span class="crt-kpi-val">+' + totalCmt + '</span><span class="crt-kpi-lbl">角色累计讨论</span></div>' +
        '</div>';
    }

    var addRelatedLink = document.getElementById('wikiAddRelatedCharLink');
    if (addRelatedLink) {
      addRelatedLink.setAttribute('href', '/subject/' + subj.id + '/add_related/character');
    }
  }

  /* ==================== 角色详情抽屉模态框 ==================== */
  function openCharacterDrawer(crtId) {
    var subj = getActiveSubject();
    var allList = getAllCharactersForSubject(subj);
    var crt = allList.find(function (c) { return String(c.id) === String(crtId); });
    if (!crt) return;

    var modal = document.getElementById('crtDetailModal');
    var body = document.getElementById('crtDetailModalBody');
    var titleEl = document.getElementById('crtDetailModalTitle');
    if (!modal || !body) return;

    if (titleEl) {
      titleEl.textContent = crt.name + (crt.name_cn ? (' / ' + crt.name_cn) : '') + ' · 角色档案';
    }

    var specsHtml = (crt.specs || []).map(function (s) {
      return '<span class="crt-spec-chip"><span class="tip_j">' + esc(s.k) + '</span> ' + esc(s.v) + '</span>';
    }).join(' ');

    var actorsHtml = (crt.actors || []).map(function (a) {
      return (
        '<div class="actorBadge badge_actor clearit" att-rlt-type-name="' + esc(a.tag || 'CV') + '">' +
          '<a href="person.html?id=' + esc(a.id) + '" class="avatar"><img src="' + esc(a.avatar) + '" class="avatar avatarSize32" referrerpolicy="no-referrer"></a>' +
          '<div class="crt-actor-meta">' +
            '<p><a href="person.html?id=' + esc(a.id) + '" class="l">' + esc(a.name) + '</a><small class="grey">' + esc(a.note || '') + '</small></p>' +
            '<p><span class="tip_j">' + esc(a.tag || 'CV') + '</span></p>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var cmts = getCharacterComments(crt);
    var cmtsHtml = cmts.map(function (cm) {
      return (
        '<div class="crt-comment-item">' +
          '<div class="crt-comment-meta"><strong>@' + esc(cm.user) + '</strong><span>' + esc(cm.time) + '</span></div>' +
          '<div>' + esc(cm.text) + '</div>' +
        '</div>'
      );
    }).join('');

    body.innerHTML =
      '<div class="crt-drawer-hero">' +
        '<img src="' + esc(crt.img) + '" referrerpolicy="no-referrer" alt="' + esc(crt.name) + '">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
            '<span class="badge_job_tip badge_job" attr-crt-type="' + esc(crt.role_type) + '">' + esc(crt.role) + '</span>' +
            '<span style="font-family:var(--mono);font-size:12px;color:var(--muted);">Character #' + esc(crt.id) + '</span>' +
            '<a href="character.html?id=' + esc(crt.id) + '" class="crt-btn-primary" style="text-decoration:none;padding:3px 10px;font-size:11.5px;margin-left:auto;">进入角色详情页 →</a>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + specsHtml + '</div>' +
          '<p style="font-size:13px;line-height:1.65;color:var(--ink-2);margin:0;">' + esc(crt.summary || '暂无详细文字设定，欢迎通过维基协力补充该角色的人物生平与性格设定。') + '</p>' +
        '</div>' +
      '</div>' +
      (actorsHtml ? '<h4 style="margin:0 0 8px;font-size:13px;color:var(--ink);">🎙️ 关联配音 / 饰演阵容</h4><div class="crt-actors-grid" style="margin-bottom:18px;">' + actorsHtml + '</div>' : '') +
      '<div style="border-top:1px solid var(--hairline);padding-top:14px;">' +
        '<h4 style="margin:0 0 10px;font-size:13px;color:var(--ink);">💬 角色讨论串 (+' + esc(crt.comment || 0) + ')</h4>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
          '<input type="text" id="crtNewCommentInput" placeholder="写下你对 ' + esc(crt.name_cn || crt.name) + ' 的印象或名台词…" style="flex:1;padding:8px 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface-2);color:var(--ink);font-size:12.5px;outline:none;">' +
          '<button type="button" class="crt-btn-primary" id="crtPostCommentBtn">发表吐槽</button>' +
        '</div>' +
        '<div class="crt-comment-list" id="crtDrawerCommentList">' + cmtsHtml + '</div>' +
      '</div>';

    modal.hidden = false;

    var postBtn = document.getElementById('crtPostCommentBtn');
    var cmtInput = document.getElementById('crtNewCommentInput');
    if (postBtn && cmtInput) {
      postBtn.onclick = function () {
        var val = cmtInput.value.trim();
        if (!val) {
          showToast('请输入角色吐槽内容');
          return;
        }
        addCharacterComment(crt, val);
        cmtInput.value = '';
        showToast('已发表对「' + (crt.name_cn || crt.name) + '」的吐槽！');
        renderCharacterList(subj);
        renderSidebar(subj);
        openCharacterDrawer(crt.id);
      };
    }
  }

  /* ==================== 声优/人物速览抽屉 ==================== */
  function openPersonDrawer(personId) {
    var subj = getActiveSubject();
    var allList = getAllCharactersForSubject(subj);
    var targetActor = null;
    var voicedRoles = [];

    allList.forEach(function (c) {
      (c.actors || []).forEach(function (a) {
        if (String(a.id) === String(personId)) {
          if (!targetActor) targetActor = a;
          voicedRoles.push({ crt: c, tag: a.tag || 'CV', note: a.note || '' });
        }
      });
    });

    if (!targetActor) return;
    var modal = document.getElementById('crtDetailModal');
    var body = document.getElementById('crtDetailModalBody');
    var titleEl = document.getElementById('crtDetailModalTitle');
    if (!modal || !body) return;

    if (titleEl) {
      titleEl.textContent = targetActor.name + ' · 声优 / 人物速览 (Person #' + targetActor.id + ')';
    }

    var rolesHtml = voicedRoles.map(function (vr) {
      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hairline);">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<img src="' + esc(vr.crt.img) + '" style="width:36px;height:48px;object-fit:cover;border-radius:6px;" referrerpolicy="no-referrer">' +
            '<div>' +
              '<div style="font-weight:700;font-size:13px;color:var(--ink);">' + esc(vr.crt.name) + ' <span style="color:var(--muted);font-weight:500;">' + esc(vr.crt.name_cn) + '</span></div>' +
              '<div style="font-size:11.5px;color:var(--muted);">职位：' + esc(vr.crt.role) + ' · 担当：' + esc(vr.tag) + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="crt-btn-ghost" data-switch-crt="' + esc(vr.crt.id) + '" style="padding:5px 12px;font-size:11.5px;">查看角色</button>' +
        '</div>'
      );
    }).join('');

    body.innerHTML =
      '<div class="crt-drawer-hero">' +
        '<img src="' + esc(targetActor.avatar) + '" referrerpolicy="no-referrer" alt="' + esc(targetActor.name) + '" style="height:110px;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">' +
            '<span class="badge_job_tip badge_job" attr-crt-type="1">' + esc(targetActor.tag || 'CV') + '</span>' +
            '<span style="font-family:var(--mono);font-size:12px;color:var(--muted);">/person/' + esc(targetActor.id) + '</span>' +
            '<a href="person.html?id=' + esc(targetActor.id) + '" class="crt-btn-primary" style="text-decoration:none;padding:3px 10px;font-size:11.5px;margin-left:auto;">进入人物详情页 →</a>' +
          '</div>' +
          '<p style="font-size:13px;line-height:1.65;color:var(--ink-2);margin:0;">' +
            esc(targetActor.summary || (targetActor.name + '，参与《' + (subj.name_cn || subj.name) + '》配音与演出工作。')) +
          '</p>' +
        '</div>' +
      '</div>' +
      '<h4 style="margin:0 0 10px;font-size:13px;color:var(--ink);">🎭 在《' + esc(subj.name_cn || subj.name) + '》中饰演的角色 (' + voicedRoles.length + ')</h4>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' + rolesHtml + '</div>';

    modal.hidden = false;

    body.querySelectorAll('[data-switch-crt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openCharacterDrawer(btn.getAttribute('data-switch-crt'));
      });
    });
  }

  function openWikiAddModal() {
    var modal = document.getElementById('crtWikiAddModal');
    if (modal) modal.hidden = false;
  }

  function renderAll() {
    var subj = getActiveSubject();
    renderSubjectHeader(subj);
    renderCharacterList(subj);
    renderSidebar(subj);
  }

  function switchSubject(newId) {
    if (!DATA.subjects[newId]) return;
    state.subjectId = String(newId);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('id', state.subjectId);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
    renderAll();
  }

  function bindEvents() {
    var catBar = document.getElementById('bannerCategoryBar');
    if (catBar) {
      catBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-subject-id]');
        if (!btn) return;
        e.preventDefault();
        switchSubject(btn.getAttribute('data-subject-id'));
        showToast('已切换至《' + (getActiveSubject().name_cn || getActiveSubject().name) + '》角色列表');
      });
    }

    var ddWrap = document.getElementById('castTypeFilterDropdown');
    var ddToggle = document.getElementById('castTypeFilterToggle');
    if (ddWrap && ddToggle) {
      ddToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        ddWrap.classList.toggle('is-open');
      });
      ddWrap.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-role]');
        if (!a) return;
        e.preventDefault();
        state.roleFilter = a.getAttribute('data-role') || 'all';
        ddWrap.classList.remove('is-open');
        renderCharacterList(getActiveSubject());
      });
      document.addEventListener('click', function () {
        ddWrap.classList.remove('is-open');
      });
    }

    var rolePills = document.getElementById('crtRolePills');
    if (rolePills) {
      rolePills.addEventListener('click', function (e) {
        var btn = e.target.closest('.crt-pill-btn[data-role]');
        if (!btn) return;
        state.roleFilter = btn.getAttribute('data-role') || 'all';
        renderCharacterList(getActiveSubject());
      });
    }

    var voicePills = document.getElementById('crtVoiceFilterPills');
    if (voicePills) {
      voicePills.addEventListener('click', function (e) {
        var btn = e.target.closest('.crt-pill-btn[data-voice]');
        if (!btn) return;
        state.voiceFilter = btn.getAttribute('data-voice') || 'all';
        renderCharacterList(getActiveSubject());
      });
    }

    var searchInput = document.getElementById('crtSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value || '';
        renderCharacterList(getActiveSubject());
      });
    }

    var sortSelect = document.getElementById('crtSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        state.sortBy = sortSelect.value || 'default';
        renderCharacterList(getActiveSubject());
      });
    }

    var spoilerBtn = document.getElementById('crtSpoilerToggleBtn');
    if (spoilerBtn) {
      spoilerBtn.addEventListener('click', function () {
        state.spoilerShield = !state.spoilerShield;
        renderCharacterList(getActiveSubject());
        showToast(state.spoilerShield ? '已开启剧透防护遮罩' : '已关闭剧透防护遮罩');
      });
    }

    var listEl = document.getElementById('browserItemList');
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var favBtn = e.target.closest('[data-action="toggle-fav"]');
        if (favBtn) {
          e.preventDefault();
          var cid = favBtn.getAttribute('data-crt-id');
          if (state.favIds[cid]) {
            delete state.favIds[cid];
            showToast('已取消收藏该角色');
          } else {
            state.favIds[cid] = true;
            showToast('★ 已加入我的收藏角色');
          }
          saveFavs();
          renderCharacterList(getActiveSubject());
          return;
        }

        var actorBadge = e.target.closest('.actorBadge.badge_actor[data-person-id]');
        if (actorBadge) {
          if (e.target.closest('a.l')) return;
          e.preventDefault();
          openPersonDrawer(actorBadge.getAttribute('data-person-id'));
          return;
        }

        var crtTrigger = e.target.closest('[data-action="open-crt"]');
        if (crtTrigger) {
          e.preventDefault();
          openCharacterDrawer(crtTrigger.getAttribute('data-crt-id'));
        }
      });
    }

    var sideCol = document.getElementById('columnInSubjectB');
    if (sideCol) {
      sideCol.addEventListener('click', function (e) {
        var statRow = e.target.closest('.crt-stat-row[data-role-jump]');
        if (statRow) {
          var r = statRow.getAttribute('data-role-jump');
          state.roleFilter = state.roleFilter === r ? 'all' : r;
          renderCharacterList(getActiveSubject());
          showToast(state.roleFilter === 'all' ? '已恢复显示全部角色' : '已按职位筛选角色');
          return;
        }

        var wikiLink = e.target.closest('#wikiAddRelatedCharLink, #wikiCreateNewCharLink');
        if (wikiLink) {
          e.preventDefault();
          openWikiAddModal();
        }
      });
    }

    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modal = btn.closest('.crt-modal-backdrop');
        if (modal) modal.hidden = true;
      });
    });

    document.querySelectorAll('.crt-modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) backdrop.hidden = true;
      });
    });

    var wikiForm = document.getElementById('crtWikiAddForm');
    if (wikiForm) {
      wikiForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = document.getElementById('wikiCrtName');
        var cnInput = document.getElementById('wikiCrtNameCn');
        var roleSelect = document.getElementById('wikiCrtRoleType');
        var genderInput = document.getElementById('wikiCrtGender');
        var cvInput = document.getElementById('wikiCrtCvName');
        var summaryInput = document.getElementById('wikiCrtSummary');

        var nameVal = (nameInput && nameInput.value.trim()) || '';
        if (!nameVal) {
          showToast('请填写角色原名');
          return;
        }
        var rt = (roleSelect && roleSelect.value) || '2';
        var roleMap = { '1': '主角', '2': '配角', '3': '客串', '4': '闲角' };
        var subj = getActiveSubject();

        var newCrt = {
          id: Math.floor(190000 + Math.random() * 9000),
          name: nameVal,
          name_cn: (cnInput && cnInput.value.trim()) || nameVal,
          img: subj.cover || 'https://lain.bgm.tv/pic/user/l/icon.jpg',
          comment: 1,
          role_type: rt,
          role: roleMap[rt] || '配角',
          specs: [
            { k: '性别', v: (genderInput && genderInput.value.trim()) || '未知' },
            { k: '来源', v: '维基协力新增' }
          ],
          summary: (summaryInput && summaryInput.value.trim()) || '由维基协力者关联至本条目的角色档案。',
          spoiler: false,
          actors: (cvInput && cvInput.value.trim()) ? [{
            id: 99001,
            name: cvInput.value.trim(),
            note: '(维基关联)',
            tag: 'CV',
            rltType: '0',
            primary: true,
            avatar: 'https://lain.bgm.tv/pic/user/l/icon.jpg',
            summary: ''
          }] : []
        };

        saveCustomCharacter(subj.id, newCrt);
        wikiForm.reset();
        var wikiModal = document.getElementById('crtWikiAddModal');
        if (wikiModal) wikiModal.hidden = true;
        state.roleFilter = 'all';
        renderAll();
        showToast('✓ 已成功关联新角色「' + (newCrt.name_cn || newCrt.name) + '」');
      });
    }
  }

  function init() {
    loadFavs();
    try {
      var params = new URLSearchParams(window.location.search);
      var qId = params.get('id');
      if (qId && DATA.subjects[qId]) {
        state.subjectId = qId;
      }
      var qRole = params.get('role');
      if (qRole && ['all', '1', '2', '3', '4'].indexOf(qRole) >= 0) {
        state.roleFilter = qRole;
      }
    } catch (e) {}

    bindEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();