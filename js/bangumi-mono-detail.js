/* ==========================================================================
   Bangumi Editorial Liquid Glass — Character & Person Detail (D2 / P19)
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_MONO_DETAIL_DATA || {
    defaultCharacterId: '86246',
    defaultPersonId: '7575',
    featuredCharacters: [],
    featuredPersons: [],
    characters: {},
    persons: {},
    stubs: { character: {}, person: {} }
  };

  var FAV_KEY = 'bgm_mono_favs_v1';
  var REPLY_KEY = 'bgm_mono_detail_replies_v1';
  var SUBREPLY_KEY = 'bgm_mono_detail_subreplies_v1';
  var LIKE_KEY = 'bgm_mono_detail_likes_v1';
  var INDEX_KEY = 'bgm_mono_detail_indexes_v1';
  var PORTRAIT_KEY = 'bgm_mono_detail_portraits_v1';
  var INFOBOX_KEY = 'bgm_mono_detail_infobox_v1';

  var REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🤔', '😭', '✨'];
  var BGM_SMILES = ['(bgm38)', '(bgm24)', '(bgm23)', '(bgm101)', '(bgm105)', '(bgm74)'];

  var kind = (document.body && document.body.dataset && document.body.dataset.monoKind) || 'character';
  if (kind !== 'character' && kind !== 'person') kind = 'character';

  var state = {
    kind: kind,
    id: kind === 'character' ? (DATA.defaultCharacterId || '86246') : (DATA.defaultPersonId || '7575'),
    tab: 'overview',
    albumView: 'grid',
    worksType: 'all',
    worksJob: 'all',
    worksSort: 'dateline',
    worksView: 'list',
    worksQuery: '',
    voiceQuery: '',
    collabQuery: '',
    collectQuery: '',
    bioExpanded: false,
    openLikeId: null,
    openMoreId: null,
    openSubFormId: null,
    collapsedPosts: {},
    lightboxIdx: -1
  };

  /* -------------------- Utilities -------------------- */
  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
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
    var box = document.getElementById('toastContainer');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'glass-toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2600);
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

  function tenStarsHtml(score) {
    var num = Number(score);
    if (!num || isNaN(num)) return '';
    var filled = Math.max(0, Math.min(10, Math.round(num)));
    var stars = '';
    for (var i = 0; i < 10; i++) {
      stars += i < filled ? '★' : '☆';
    }
    return (
      '<span class="bmd-stars-line" title="Bangumi 十星制评分 ' + esc(num.toFixed(1)) + ' / 10">' +
      '<span class="bmd-stars-glyph">' + stars + '</span>' +
      '<span class="bmd-stars-num">' + esc(num.toFixed(1)) + '</span>' +
      '</span>'
    );
  }

  function formatBbcodeHtml(text) {
    var safe = esc(text || '');
    safe = safe.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/gi, function (_, url, label) {
      var mPrsn = url.match(/\/person\/(\d+)/);
      var mCrt = url.match(/\/character\/(\d+)/);
      var mSubj = url.match(/\/subject\/(\d+)/);
      if (mPrsn) return '<a class="l" href="person.html?id=' + mPrsn[1] + '">' + label + '</a>';
      if (mCrt) return '<a class="l" href="character.html?id=' + mCrt[1] + '">' + label + '</a>';
      if (mSubj) return '<a class="l" href="subject.html?id=' + mSubj[1] + '">' + label + '</a>';
      return '<a class="l" href="' + url + '" target="_blank" rel="noopener">' + label + '</a>';
    });
    safe = safe.replace(/\[mask\](.*?)\[\/mask\]/gi, '<span class="bgm_spoiler" title="悬停查看剧透">$1</span>');
    return safe;
  }

  function avatarPlaceholder(name) {
    var ch = (name || '?').slice(0, 1);
    return (
      '<div class="bmd-portrait-placeholder">' +
      '<div style="width:54px;height:54px;border-radius:14px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">' +
      esc(ch) +
      '</div><span>暂无高清肖像</span></div>'
    );
  }

  function imgTag(src, cls, alt, fallbackLabel) {
    if (!src) {
      var ch = (fallbackLabel || alt || '?').slice(0, 1);
      return '<span class="' + cls + '" style="display:inline-flex;align-items:center;justify-content:center;background:var(--accent-soft);color:var(--accent);font-weight:800;font-size:14px;">' + esc(ch) + '</span>';
    }
    return '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" class="' + cls + '" referrerpolicy="no-referrer" loading="lazy" />';
  }

  /* -------------------- Entity Resolution -------------------- */
  function resolveEntity(k, id) {
    var sid = String(id || '');
    var pool = k === 'character' ? DATA.characters : DATA.persons;
    if (pool && pool[sid]) return pool[sid];

    var stubPool = (DATA.stubs && DATA.stubs[k]) || {};
    var stub = stubPool[sid];
    if (stub) {
      var infoList = [];
      if (stub.nameCn) infoList.push({ k: '简体中文名', v: stub.nameCn });
      if (stub.typeLabel) infoList.push({ k: '类别', v: stub.typeLabel });
      if (stub.infoLine) infoList.push({ k: '资料', v: stub.infoLine });
      if (Array.isArray(stub.specs)) {
        stub.specs.forEach(function (sp) {
          if (sp && sp.label && sp.val) infoList.push({ k: sp.label, v: sp.val });
        });
      }
      var casts = [];
      if (k === 'character' && stub.workTitle) {
        casts.push({
          subjectId: stub.workId || '400602',
          subjectName: stub.workTitle,
          subjectCn: stub.workTitle,
          subjectType: 2,
          subjectTypeLabel: '条目',
          cover: '',
          role: stub.typeLabel || '关联角色',
          actors: stub.actors || []
        });
      }
      var works = [];
      if (k === 'person') {
        if (Array.isArray(stub.worksList) && stub.worksList.length) {
          works = stub.worksList.map(function (w) {
            return {
              subjectId: String(w.id || stub.workId || '400602'),
              name: w.title || stub.workTitle || '关联作品',
              nameCn: '',
              type: 2,
              typeLabel: '动画',
              cover: w.cover || '',
              info: w.role || '',
              date: '',
              jobs: [w.role || '参与'],
              score: null,
              rank: null
            };
          });
        } else if (stub.workTitle) {
          works.push({
            subjectId: stub.workId || '400602',
            name: stub.workTitle,
            nameCn: stub.workTitle,
            type: 2,
            typeLabel: '条目',
            cover: '',
            info: '代表参与作品',
            date: '',
            jobs: stub.careers && stub.careers.length ? stub.careers : ['制作人员'],
            score: null,
            rank: null
          });
        }
      }
      return {
        id: sid,
        kind: k,
        isStub: true,
        name: stub.name || (k === 'character' ? 'Character #' : 'Person #') + sid,
        nameCn: stub.nameCn || '',
        avatar: stub.avatar || '',
        careers: stub.careers || [],
        infobox: infoList,
        summary: stub.summary || '该档案由全站索引聚合生成；完整条目、相册与历史讨论可在精选档案或 Bangumi 主站浏览。',
        album: [],
        casts: casts,
        voiceRoles: [],
        works: works,
        collabs: [],
        relations: [],
        indexes: [],
        collectors: [],
        collectTotal: 0,
        comments: [],
        commentTotal: Number(stub.comments || 0)
      };
    }

    // Fallback to default
    var defId = k === 'character' ? DATA.defaultCharacterId : DATA.defaultPersonId;
    return (pool && pool[defId]) || null;
  }

  /* -------------------- Favorites / Custom Storage -------------------- */
  function loadFavStore() {
    var store = readJson(FAV_KEY, {});
    if (!store['553488']) store['553488'] = { character: ['86246', '88208', '303'], person: ['7575', '94'] };
    return store;
  }

  function isCollected(k, id) {
    var store = loadFavStore();
    var u = store['553488'] || { character: [], person: [] };
    return (u[k] || []).indexOf(String(id)) !== -1;
  }

  function toggleCollect(entity) {
    var store = loadFavStore();
    if (!store['553488']) store['553488'] = { character: [], person: [] };
    var list = store['553488'][entity.kind] || [];
    var sid = String(entity.id);
    var idx = list.indexOf(sid);
    if (idx === -1) {
      list.unshift(sid);
      showToast('已收藏' + (entity.kind === 'character' ? '角色' : '人物') + '：' + (entity.nameCn || entity.name));
    } else {
      list.splice(idx, 1);
      showToast('已取消收藏：' + (entity.nameCn || entity.name));
    }
    store['553488'][entity.kind] = list;
    writeJson(FAV_KEY, store);
    renderHeader(entity);
    if (state.tab === 'collections') renderMainColumn(entity);
    renderSidebar(entity);
  }

  function entityKey(entity) {
    return entity.kind + ':' + entity.id;
  }

  function getEntityInfobox(entity) {
    var custom = readJson(INFOBOX_KEY, {})[entityKey(entity)];
    return Array.isArray(custom) ? custom : (entity.infobox || []);
  }

  function getEntityAvatar(entity) {
    var custom = readJson(PORTRAIT_KEY, {})[entityKey(entity)];
    return custom || entity.avatar || '';
  }

  function getMergedComments(entity) {
    var base = entity.comments || [];
    var custom = readJson(REPLY_KEY, {})[entityKey(entity)] || [];
    var subMap = readJson(SUBREPLY_KEY, {})[entityKey(entity)] || {};
    var likeMap = readJson(LIKE_KEY, {})[entityKey(entity)] || {};

    return custom.concat(base).map(function (c) {
      var extraSubs = subMap[c.id] || [];
      var likes = Object.assign({}, c.likes || {}, likeMap[c.id] || {});
      return Object.assign({}, c, {
        likes: likes,
        subReplies: (c.subReplies || []).concat(extraSubs)
      });
    });
  }

  /* -------------------- URL Sync -------------------- */
  function readUrlParams() {
    var sp = new URLSearchParams(window.location.search || '');
    var kParam = sp.get('kind');
    if (kParam === 'character' || kParam === 'person') state.kind = kParam;
    var idParam = sp.get('id');
    if (idParam) {
      state.id = idParam;
    } else {
      state.id = state.kind === 'character' ? (DATA.defaultCharacterId || '86246') : (DATA.defaultPersonId || '7575');
    }
    var validTabs = state.kind === 'character'
      ? ['overview', 'album', 'collections']
      : ['overview', 'album', 'works', 'voice', 'collabs', 'collections'];
    var tParam = sp.get('tab') || 'overview';
    state.tab = validTabs.indexOf(tParam) !== -1 ? tParam : 'overview';
    if (sp.get('type')) state.worksType = sp.get('type');
    if (sp.get('job')) state.worksJob = sp.get('job');
    if (sp.get('sort')) state.worksSort = sp.get('sort');
    if (sp.get('view')) state.worksView = sp.get('view');
    if (sp.get('q')) state.worksQuery = sp.get('q');
  }

  function syncUrl(replace) {
    var sp = new URLSearchParams();
    sp.set('id', state.id);
    if (state.tab !== 'overview') sp.set('tab', state.tab);
    if (state.tab === 'works') {
      if (state.worksType !== 'all') sp.set('type', state.worksType);
      if (state.worksJob !== 'all') sp.set('job', state.worksJob);
      if (state.worksSort !== 'dateline') sp.set('sort', state.worksSort);
      if (state.worksView !== 'list') sp.set('view', state.worksView);
      if (state.worksQuery) sp.set('q', state.worksQuery);
    }
    var url = window.location.pathname + '?' + sp.toString();
    try {
      if (replace) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
    } catch (e) {}
  }

  /* -------------------- Render Switcher & Header -------------------- */
  function renderSwitcher() {
    var pillsEl = document.getElementById('bmdSwitcherPills');
    var labelEl = document.getElementById('bmdSwitcherLabel');
    if (!pillsEl) return;
    var list = state.kind === 'character' ? (DATA.featuredCharacters || []) : (DATA.featuredPersons || []);
    if (labelEl) {
      labelEl.textContent = state.kind === 'character' ? '🎭 精选角色档案' : '🎙️ 精选人物档案';
    }
    pillsEl.innerHTML = list.map(function (item) {
      var active = String(item.id) === String(state.id) ? ' active' : '';
      return (
        '<a href="' + state.kind + '.html?id=' + esc(item.id) + '" class="bmd-switch-pill' + active + '" data-switch-id="' + esc(item.id) + '">' +
        '<span>' + esc(item.label) + '</span>' +
        '<small>' + esc(item.sub) + '</small>' +
        '</a>'
      );
    }).join('');
  }

  function renderHeader(entity) {
    var mainName = document.getElementById('bmdMainName');
    var cnName = document.getElementById('bmdCnName');
    var badge = document.getElementById('bmdKindBadge');
    var hint = document.getElementById('bmdRouteHint');
    var btnCollect = document.getElementById('bmdBtnCollect');
    var collectIcon = document.getElementById('bmdCollectIcon');
    var collectText = document.getElementById('bmdCollectText');

    if (mainName) {
      mainName.textContent = entity.name;
      mainName.href = state.kind + '.html?id=' + encodeURIComponent(entity.id);
    }
    if (cnName) {
      cnName.textContent = entity.nameCn && entity.nameCn !== entity.name ? entity.nameCn : '';
    }
    if (badge) {
      if (state.kind === 'character') {
        badge.textContent = entity.isStub ? '虚构角色 · 索引档案' : '虚构角色';
      } else {
        badge.textContent = (entity.careers && entity.careers.length)
          ? '现实人物 · ' + entity.careers.slice(0, 3).join(' / ')
          : '现实人物';
      }
    }
    if (hint) {
      hint.textContent = '/' + state.kind + '/' + entity.id + (state.tab !== 'overview' ? '/' + state.tab : '');
    }

    document.title = (entity.nameCn || entity.name) + ' · ' + (state.kind === 'character' ? '虚构角色' : '现实人物') + ' · Bangumi Editorial Liquid Glass';

    var collected = isCollected(state.kind, entity.id);
    if (btnCollect && collectIcon && collectText) {
      btnCollect.className = 'bmd-action-btn ' + (collected ? 'ico_like_fill is-liked' : 'ico_like');
      collectIcon.textContent = collected ? '❤️' : '🤍';
      collectText.textContent = collected ? '已收藏' : '收藏';
    }

    var tabsEl = document.getElementById('bmdNavTabs');
    if (tabsEl) {
      var tabs = state.kind === 'character'
        ? [
            { id: 'overview', label: '概览', count: null },
            { id: 'album', label: '相册', count: (entity.album || []).length },
            { id: 'collections', label: '收藏', count: entity.collectTotal || (entity.collectors || []).length }
          ]
        : [
            { id: 'overview', label: '概览', count: null },
            { id: 'album', label: '相册', count: (entity.album || []).length },
            { id: 'works', label: '作品', count: (entity.works || []).length },
            { id: 'voice', label: '演出角色', count: (entity.voiceRoles || []).length },
            { id: 'collabs', label: '合作', count: (entity.collabs || []).length },
            { id: 'collections', label: '收藏', count: entity.collectTotal || (entity.collectors || []).length }
          ];
      tabsEl.innerHTML = tabs.map(function (t) {
        var cls = state.tab === t.id ? 'focus' : '';
        var cnt = t.count !== null && t.count !== undefined ? '<span class="bmd-tab-count">' + esc(t.count) + '</span>' : '';
        return '<li><a href="?' + 'id=' + esc(entity.id) + '&tab=' + esc(t.id) + '" class="' + cls + '" data-tab="' + esc(t.id) + '">' + esc(t.label) + cnt + '</a></li>';
      }).join('');
    }
  }

  /* -------------------- Render Left Sidebar (#columnCrtA) -------------------- */
  function renderSidebar(entity) {
    var colA = document.getElementById('columnCrtA');
    if (!colA) return;

    var avatar = getEntityAvatar(entity);
    var infobox = getEntityInfobox(entity);
    var collected = isCollected(state.kind, entity.id);
    var collectors = (entity.collectors || []).slice();
    if (collected) {
      collectors = collectors.filter(function (u) { return u.uid !== '553488'; });
      collectors.unshift({
        uid: '553488',
        name: '少年游',
        avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
        time: '刚刚收藏'
      });
    }

    var portraitHtml = avatar
      ? '<img src="' + esc(avatar) + '" alt="' + esc(entity.name) + '" class="cover" referrerpolicy="no-referrer" />'
      : avatarPlaceholder(entity.nameCn || entity.name);

    var infoHtml = infobox.length
      ? '<ul id="infobox" class="bmd-infobox-list">' + infobox.map(function (row) {
          return '<li><span class="tip">' + esc(row.k) + ': </span>' + esc(row.v) + '</li>';
        }).join('') + '</ul>'
      : '<div style="font-size:12.5px;color:var(--ink-3);">暂无 Infobox 详细条目</div>';

    var relHtml = '';
    if (entity.relations && entity.relations.length) {
      relHtml =
        '<div class="bmd-glass-card SimpleSidePanel">' +
        '<div class="bmd-card-head"><h2>🔗 关联' + (state.kind === 'character' ? '角色' : '人物') + '</h2><small>' + entity.relations.length + '</small></div>' +
        '<ul class="bmd-side-list">' +
        entity.relations.slice(0, 8).map(function (r) {
          var href = (r.kind === 'person' ? 'person.html?id=' : 'character.html?id=') + esc(r.id);
          return (
            '<li><a href="' + href + '" class="bmd-side-item">' +
            imgTag(r.avatar, 'bmd-side-avatar', r.name, r.name) +
            '<div class="bmd-side-meta">' +
            '<div class="bmd-side-title"><span class="bmd-side-rel-badge">' + esc(r.rel) + '</span>' + esc(r.name) + '</div>' +
            '<div class="bmd-side-sub">/' + esc(r.kind) + '/' + esc(r.id) + '</div>' +
            '</div></a></li>'
          );
        }).join('') +
        '</ul></div>';
    }

    var idxHtml =
      '<div class="bmd-glass-card SimpleSidePanel" id="subjectPanelIndex">' +
      '<div class="bmd-card-head"><h2>📚 推荐目录</h2><small>' + (entity.indexes || []).length + '</small></div>' +
      ((entity.indexes && entity.indexes.length)
        ? '<ul class="bmd-side-list">' + entity.indexes.map(function (ix) {
            var ixHref = (ix.id && /^\d+$/.test(String(ix.id))) ? ('catalog.html?id=' + encodeURIComponent(ix.id)) : 'catalog.html';
            return (
              '<li><a href="' + ixHref + '" class="bmd-side-item">' +
              imgTag(ix.avatar, 'bmd-side-avatar', ix.author, ix.title) +
              '<div class="bmd-side-meta">' +
              '<div class="bmd-side-title">' + esc(ix.title) + '</div>' +
              '<div class="bmd-side-sub">by ' + esc(ix.author || '社区成员') + '</div>' +
              '</div></a></li>'
            );
          }).join('') + '</ul>'
        : '<div style="font-size:12.5px;color:var(--ink-3);">暂无收录目录，可点击顶部「收集目录」添加</div>') +
      '</div>';

    var collectDisplayCount = (entity.collectTotal || collectors.length) + (collected ? 1 : 0);
    var colHtml =
      '<div class="bmd-glass-card SimpleSidePanel" id="crtPanelCollect">' +
      '<div class="bmd-card-head"><h2>👥 谁收藏了</h2><a href="javascript:void(0)" class="bmd-more-link" data-go-tab="collections">' + esc(collectDisplayCount) + ' 人 →</a></div>' +
      (collectors.length
        ? '<ul class="bmd-side-list">' + collectors.slice(0, 6).map(function (u) {
            var uHref = (u.uid === '553488' || u.uid === 'sai') ? ('user.html?uid=' + esc(u.uid)) : 'javascript:void(0)';
            return (
              '<li><a href="' + uHref + '" class="bmd-side-item" data-user-preview="' + esc(u.name) + '">' +
              imgTag(u.avatar, 'bmd-side-avatar', u.name, u.name) +
              '<div class="bmd-side-meta">' +
              '<div class="bmd-side-title">' + esc(u.name) + '</div>' +
              '<div class="bmd-side-sub">' + esc(u.time) + '</div>' +
              '</div></a></li>'
            );
          }).join('') + '</ul>'
        : '<div style="font-size:12.5px;color:var(--ink-3);">暂无收藏用户记录</div>') +
      '</div>';

    colA.innerHTML =
      '<div class="bmd-glass-card bmd-infobox-card infobox">' +
      '<div class="bmd-portrait-box" id="bmdPortraitZoom" data-act="zoom-portrait" title="点击查看大图">' + portraitHtml + '</div>' +
      '<div class="bmd-portrait-tools">' +
      '<button type="button" class="chiiBtn" data-act="open-upload">📷 上传肖像</button>' +
      '<button type="button" class="chiiBtn" data-act="open-edit-infobox">✏️ 编辑资料</button>' +
      '</div>' +
      infoHtml +
      '</div>' +
      relHtml +
      idxHtml +
      colHtml;
  }

  /* -------------------- Render Main Column (#columnCrtB) -------------------- */
  function renderCastsList(casts) {
    if (!casts || !casts.length) {
      return '<div class="bmd-empty-state">暂无出演作品关联记录</div>';
    }
    return (
      '<ul class="browserList bmd-browser-list">' +
      casts.map(function (c) {
        var isMusic = Number(c.subjectType) === 3;
        var thumbCls = isMusic ? 'bmd-thumb-11' : 'bmd-thumb-34';
        var actorsHtml = (c.actors && c.actors.length)
          ? '<ul class="innerRightList bmd-right-list">' + c.actors.map(function (a) {
              return (
                '<li>' +
                '<div class="bmd-right-meta">' +
                '<a href="person.html?id=' + esc(a.id) + '">' + esc(a.name) + '</a>' +
                '<span>' + esc(a.tag || 'CV') + '</span>' +
                '</div>' +
                '<a href="person.html?id=' + esc(a.id) + '">' + imgTag(a.avatar, 'bmd-right-avatar', a.name, a.name) + '</a>' +
                '</li>'
              );
            }).join('') + '</ul>'
          : '<div style="text-align:right;font-size:12px;color:var(--ink-3);">暂无声优关联</div>';

        return (
          '<li>' +
          '<div class="innerLeftItem bmd-left-item">' +
          '<a href="subject.html?id=' + esc(c.subjectId) + '">' + imgTag(c.cover, thumbCls, c.subjectName, c.subjectCn || c.subjectName) + '</a>' +
          '<div class="bmd-item-info">' +
          '<h3 class="bmd-item-title"><a href="subject.html?id=' + esc(c.subjectId) + '">' + esc(c.subjectCn || c.subjectName) + '</a></h3>' +
          (c.subjectCn && c.subjectCn !== c.subjectName ? '<div class="bmd-item-sub">' + esc(c.subjectName) + '</div>' : '') +
          '<div><span class="bmd-badge-type">' + esc(c.subjectTypeLabel || '条目') + '</span>' +
          '<span class="bmd-badge-job">' + esc(c.role || '角色') + '</span></div>' +
          '</div></div>' +
          '<div>' + actorsHtml + '</div>' +
          '</li>'
        );
      }).join('') +
      '</ul>'
    );
  }

  function renderVoiceList(roles) {
    if (!roles || !roles.length) {
      return '<div class="bmd-empty-state">暂无配音演出角色记录</div>';
    }
    return (
      '<ul class="browserList bmd-browser-list">' +
      roles.map(function (r) {
        var subjsHtml = (r.subjects && r.subjects.length)
          ? '<ul class="innerRightList bmd-right-list">' + r.subjects.map(function (s) {
              return (
                '<li>' +
                '<div class="bmd-right-meta">' +
                '<a href="subject.html?id=' + esc(s.subjectId) + '">' + esc(s.subjectCn || s.subjectName) + '</a>' +
                '<span>' + esc(s.role || '角色') + '</span>' +
                '</div>' +
                '<a href="subject.html?id=' + esc(s.subjectId) + '">' + imgTag(s.cover, 'bmd-right-avatar', s.subjectName, s.subjectName) + '</a>' +
                '</li>'
              );
            }).join('') + '</ul>'
          : '<div style="text-align:right;font-size:12px;color:var(--ink-3);">暂无作品映射</div>';

        return (
          '<li>' +
          '<div class="innerLeftItem bmd-left-item">' +
          '<a href="character.html?id=' + esc(r.charId) + '">' + imgTag(r.charAvatar, 'bmd-thumb-34', r.charName, r.charName) + '</a>' +
          '<div class="bmd-item-info">' +
          '<h3 class="bmd-item-title"><a href="character.html?id=' + esc(r.charId) + '">' + esc(r.charName) + '</a></h3>' +
          (r.charCn ? '<div class="bmd-item-sub">' + esc(r.charCn) + '</div>' : '') +
          '<div><span class="bmd-badge-type">角色 #' + esc(r.charId) + '</span></div>' +
          '</div></div>' +
          '<div>' + subjsHtml + '</div>' +
          '</li>'
        );
      }).join('') +
      '</ul>'
    );
  }

  function renderCommentSection(entity) {
    var list = getMergedComments(entity);
    var likeStore = readJson(LIKE_KEY, {})[entityKey(entity)] || {};
    var userLikedMap = likeStore.__user || {};

    var html =
      '<section class="bmd-glass-card" id="bmdCommentSection">' +
      '<div class="bmd-card-head"><h2>💬 吐槽箱 / 讨论区</h2><small>共 ' + esc(Math.max(entity.commentTotal || 0, list.length)) + ' 条讨论（展示 ' + list.length + ' 条）</small></div>' +
      '<form id="ReplyForm" class="bmd-reply-form">' +
      '<textarea id="bmdReplyInput" class="bmd-reply-textarea" placeholder="写下你对 ' + esc(entity.nameCn || entity.name) + ' 的印象、吐槽或考据..." maxlength="500"></textarea>' +
      '<div class="bmd-reply-bar">' +
      '<div class="bmd-emoji-strip">' +
      BGM_SMILES.map(function (em) {
        return '<button type="button" class="bmd-emoji-btn" data-insert-smile="' + esc(em) + '">' + esc(em) + '</button>';
      }).join('') +
      '</div>' +
      '<button type="submit" class="bmd-submit-btn">发送评论</button>' +
      '</div>' +
      '</form>' +
      '<div id="comment_list" class="bmd-comment-list">';

    if (!list.length) {
      html += '<div class="bmd-empty-state">暂无评论，来做第一个留言的人吧！</div>';
    } else {
      html += list.map(function (c) {
        var likesEntries = Object.keys(c.likes || {}).filter(function (em) { return Number(c.likes[em]) > 0; });
        var likesHtml = likesEntries.length
          ? '<div class="bmd-likes-bar">' + likesEntries.map(function (em) {
              var active = userLikedMap[c.id + ':' + em] ? ' active' : '';
              return '<button type="button" class="bmd-like-chip' + active + '" data-act="toggle-like" data-post-id="' + esc(c.id) + '" data-emoji="' + esc(em) + '">' + esc(em) + ' ' + esc(c.likes[em]) + '</button>';
            }).join('') + '</div>'
          : '';

        var likePopover = state.openLikeId === c.id
          ? '<div class="bmd-like-popover">' + REACTION_EMOJIS.map(function (em) {
              return '<button type="button" class="bmd-like-chip" data-act="toggle-like" data-post-id="' + esc(c.id) + '" data-emoji="' + esc(em) + '">' + esc(em) + '</button>';
            }).join('') + '</div>'
          : '';

        var moreMenu = state.openMoreId === c.id
          ? '<div class="bmd-more-menu">' +
            '<button type="button" data-act="copy-floor" data-post-id="' + esc(c.id) + '" data-floor="' + esc(c.floor) + '">🔗 复制楼层链接</button>' +
            '<button type="button" data-act="collapse-floor" data-post-id="' + esc(c.id) + '">' + (state.collapsedPosts[c.id] ? '👁️ 展开此楼层' : '🙈 折叠此楼层') + '</button>' +
            '<button type="button" data-act="report-floor" data-post-id="' + esc(c.id) + '">🚩 反馈 / 举报</button>' +
            '</div>'
          : '';

        var subsHtml = (c.subReplies && c.subReplies.length)
          ? '<div class="bmd-sub-replies">' + c.subReplies.map(function (s) {
              return (
                '<div class="bmd-sub-reply sub_reply_bg" id="post_' + esc(s.id) + '">' +
                '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
                '<strong>' + esc(s.user) + '</strong>' +
                '<span class="bmd-comment-time">' + esc(s.floor) + ' · ' + esc(s.time) + '</span>' +
                '</div>' +
                '<div>' + formatBbcodeHtml(s.text) + '</div>' +
                '</div>'
              );
            }).join('') + '</div>'
          : '';

        var subFormHtml = state.openSubFormId === c.id
          ? '<form class="bmd-sub-inline-form" data-sub-form="' + esc(c.id) + '">' +
            '<input type="text" placeholder="回复 ' + esc(c.floor) + ' ' + esc(c.user) + '..." required />' +
            '<button type="submit" class="bmd-submit-btn">回复</button>' +
            '</form>'
          : '';

        var isCollapsed = !!state.collapsedPosts[c.id];
        return (
          '<div class="row_reply bmd-comment-row" id="post_' + esc(c.id) + '">' +
          '<div class="bmd-comment-head">' +
          '<div class="bmd-comment-author">' +
          imgTag(c.avatar, 'bmd-comment-avatar', c.user, c.user) +
          '<div>' +
          '<a href="' + ((c.uid === '553488' || c.uid === 'sai') ? ('user.html?uid=' + esc(c.uid)) : 'javascript:void(0)') + '" class="bmd-comment-name">' + esc(c.user) + '</a>' +
          '<div class="bmd-comment-time">' + esc(c.floor) + ' · ' + esc(c.time) + '</div>' +
          '</div></div>' +
          '<div class="bmd-comment-ops">' +
          '<button type="button" class="bmd-op-btn" data-act="open-sub" data-post-id="' + esc(c.id) + '">回复</button>' +
          '<a href="javascript:void(0)" class="bmd-op-btn icon like_dropdown" data-like-type="12" data-act="open-like" data-post-id="' + esc(c.id) + '">贴贴</a>' +
          '<button type="button" class="bmd-op-btn" data-act="open-more" data-post-id="' + esc(c.id) + '">···</button>' +
          likePopover + moreMenu +
          '</div></div>' +
          (isCollapsed
            ? '<div class="bmd-comment-body" style="color:var(--ink-3);font-style:italic;">（该楼层已折叠，点击右上角 ··· 可重新展开）</div>'
            : '<div class="bmd-comment-body">' + formatBbcodeHtml(c.text) + '</div>') +
          likesHtml + subsHtml + subFormHtml +
          '</div>'
        );
      }).join('');
    }

    html += '</div></section>';
    return html;
  }

  function renderOverview(entity) {
    var parts = [];

    // 1. Career + Bio
    var bio = entity.summary || '暂无详细简介。';
    var isLong = bio.length > 260;
    var bioCls = 'detail bmd-detail-bio' + (isLong && !state.bioExpanded ? ' is-collapsed' : '');
    var careerHtml = (state.kind === 'person' && entity.careers && entity.careers.length)
      ? '<div class="bmd-career-strip"><span class="bmd-career-label">职业：</span>' +
        entity.careers.map(function (c) { return '<span class="bmd-career-chip">' + esc(c) + '</span>'; }).join('') +
        '</div>'
      : '';

    parts.push(
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>📖 人物档案简介</h2><small>' + (entity.isStub ? '聚合索引摘要' : 'Bangumi 真实档案') + '</small></div>' +
      careerHtml +
      '<div class="' + bioCls + '">' + formatBbcodeHtml(bio) + '</div>' +
      (isLong
        ? '<button type="button" class="bmd-bio-toggle" data-act="toggle-bio">' + (state.bioExpanded ? '收起简介 ▲' : '展开全部简介 ▼') + '</button>'
        : '') +
      '</section>'
    );

    // 2. Album preview strip (if photos exist)
    if (entity.album && entity.album.length) {
      parts.push(
        '<section class="bmd-glass-card crt_photo">' +
        '<div class="bmd-card-head"><h2>🖼️ 肖像与剧照相册</h2><a href="javascript:void(0)" class="bmd-more-link" data-go-tab="album">查看全部 ' + entity.album.length + ' 张 →</a></div>' +
        '<ul class="photoList bmd-photo-grid">' +
        entity.album.slice(0, 4).map(function (ph, idx) {
          return '<li data-act="open-lightbox" data-photo-idx="' + idx + '"><img src="' + esc(ph.thumb || ph.img) + '" alt="' + esc(ph.title) + '" referrerpolicy="no-referrer" /><div class="bmd-photo-cap">' + esc(ph.title) + '</div></li>';
        }).join('') +
        '</ul></section>'
      );
    }

    // 3. Character casts OR Person voice + works + collabs
    if (state.kind === 'character') {
      parts.push(
        '<section class="bmd-glass-card">' +
        '<div class="bmd-card-head"><h2>🎬 出演作品与配音阵容</h2><small>共 ' + (entity.casts || []).length + ' 部作品</small></div>' +
        renderCastsList(entity.casts) +
        '</section>'
      );
    } else {
      if (entity.voiceRoles && entity.voiceRoles.length) {
        parts.push(
          '<section class="bmd-glass-card">' +
          '<div class="bmd-card-head"><h2>🎙️ 最近演出角色</h2><a href="javascript:void(0)" class="bmd-more-link" data-go-tab="voice">全部 ' + entity.voiceRoles.length + ' 位角色 →</a></div>' +
          renderVoiceList(entity.voiceRoles.slice(0, 6)) +
          '</section>'
        );
      }

      if (entity.works && entity.works.length) {
        parts.push(
          '<section class="bmd-glass-card">' +
          '<div class="bmd-card-head"><h2>🎬 参与作品</h2><a href="javascript:void(0)" class="bmd-more-link" data-go-tab="works">全部 ' + entity.works.length + ' 部作品 →</a></div>' +
          '<div class="bmd-works-list is-grid">' +
          entity.works.slice(0, 6).map(function (w) {
            var thumbCls = Number(w.type) === 3 ? 'bmd-thumb-11' : 'bmd-thumb-34';
            return (
              '<div class="bmd-work-card">' +
              '<div style="display:flex;gap:10px;align-items:flex-start;width:100%;">' +
              '<a href="subject.html?id=' + esc(w.subjectId) + '">' + imgTag(w.cover, thumbCls, w.name, w.nameCn || w.name) + '</a>' +
              '<div class="bmd-work-body">' +
              '<h3 class="bmd-item-title"><a href="subject.html?id=' + esc(w.subjectId) + '">' + esc(w.nameCn || w.name) + '</a></h3>' +
              '<div><span class="bmd-badge-type">' + esc(w.typeLabel) + '</span>' +
              (w.jobs || []).slice(0, 2).map(function (j) { return '<span class="bmd-badge-job">' + esc(j) + '</span>'; }).join('') +
              '</div>' +
              (w.score ? tenStarsHtml(w.score) : '') +
              '</div></div></div>'
            );
          }).join('') +
          '</div></section>'
        );
      }

      if (entity.collabs && entity.collabs.length) {
        parts.push(
          '<section class="bmd-glass-card">' +
          '<div class="bmd-card-head"><h2>🤝 经常合作</h2><a href="javascript:void(0)" class="bmd-more-link" data-go-tab="collabs">查看全部 ' + entity.collabs.length + ' 位 →</a></div>' +
          '<div class="bmd-collabs-grid">' +
          entity.collabs.slice(0, 4).map(function (co) {
            return (
              '<div class="bmd-collab-card">' +
              '<div class="bmd-collab-head">' +
              '<a href="person.html?id=' + esc(co.id) + '">' + imgTag(co.avatar, 'bmd-side-avatar', co.name, co.name) + '</a>' +
              '<div style="min-width:0;flex:1;">' +
              '<a href="person.html?id=' + esc(co.id) + '" class="bmd-comment-name">' + esc(co.name) + '</a>' +
              '<div class="bmd-side-sub">合作 ' + esc(co.count) + ' 次</div>' +
              '</div></div>' +
              '<div class="bmd-collab-subjs">' +
              (co.subjects || []).slice(0, 3).map(function (s) {
                return '<a href="subject.html?id=' + esc(s.id) + '">' + esc(s.name) + '</a>';
              }).join('') +
              '</div></div>'
            );
          }).join('') +
          '</div></section>'
        );
      }
    }

    // 4. Comments
    parts.push(renderCommentSection(entity));
    return parts.join('');
  }

  function renderAlbumTab(entity) {
    var photos = entity.album || [];
    var listCls = state.albumView === 'waterfall' ? 'photoList bmd-photo-waterfall' : 'photoList bmd-photo-grid';
    return (
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>🖼️ 相册图片集</h2>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '<button type="button" class="bmd-filter-pill' + (state.albumView === 'grid' ? ' active' : '') + '" data-act="album-view" data-val="grid">网格</button>' +
      '<button type="button" class="bmd-filter-pill' + (state.albumView === 'waterfall' ? ' active' : '') + '" data-act="album-view" data-val="waterfall">瀑布流</button>' +
      '<button type="button" class="bmd-filter-pill" data-act="open-upload">＋ 上传图片</button>' +
      '</div></div>' +
      (photos.length
        ? '<ul class="' + listCls + '">' + photos.map(function (ph, idx) {
            return '<li data-act="open-lightbox" data-photo-idx="' + idx + '"><img src="' + esc(ph.img || ph.thumb) + '" alt="' + esc(ph.title) + '" referrerpolicy="no-referrer" /><div class="bmd-photo-cap">' + esc(ph.title) + '</div></li>';
          }).join('') + '</ul>'
        : '<div class="bmd-empty-state">该档案暂未收录剧照相册，可点击右上角「上传图片」添加本地预览。</div>') +
      '</section>'
    );
  }

  function renderWorksTab(entity) {
    var works = entity.works || [];
    var typeCounts = {};
    var jobCounts = {};
    works.forEach(function (w) {
      var tl = w.typeLabel || '条目';
      typeCounts[tl] = (typeCounts[tl] || 0) + 1;
      (w.jobs || []).forEach(function (j) {
        jobCounts[j] = (jobCounts[j] || 0) + 1;
      });
    });

    var topJobs = Object.keys(jobCounts).sort(function (a, b) {
      return jobCounts[b] - jobCounts[a];
    }).slice(0, 10);

    var filtered = works.filter(function (w) {
      if (state.worksType !== 'all' && w.typeLabel !== state.worksType) return false;
      if (state.worksJob !== 'all' && (w.jobs || []).indexOf(state.worksJob) === -1) return false;
      if (state.worksQuery) {
        var q = state.worksQuery.toLowerCase();
        var hay = (w.name + ' ' + w.nameCn + ' ' + w.info).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (state.worksSort === 'rate') return (b.score || 0) - (a.score || 0);
      if (state.worksSort === 'title') return (a.nameCn || a.name).localeCompare(b.nameCn || b.name, 'zh');
      return (b.date || '').localeCompare(a.date || '');
    });

    return (
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>🎬 参与作品档案</h2><small>匹配 ' + filtered.length + ' / ' + works.length + ' 部</small></div>' +
      '<div class="bmd-filter-group">' +
      '<div class="bmd-filter-row subjectFilter"><span class="bmd-filter-label">类型</span>' +
      '<button type="button" class="bmd-filter-pill' + (state.worksType === 'all' ? ' active' : '') + '" data-act="works-type" data-val="all">全部 (' + works.length + ')</button>' +
      Object.keys(typeCounts).map(function (tl) {
        return '<button type="button" class="bmd-filter-pill' + (state.worksType === tl ? ' active' : '') + '" data-act="works-type" data-val="' + esc(tl) + '">' + esc(tl) + ' (' + typeCounts[tl] + ')</button>';
      }).join('') +
      '</div>' +
      '<div class="bmd-filter-row subjectFilter castTypeFilter"><span class="bmd-filter-label">职位</span>' +
      '<button type="button" class="bmd-filter-pill' + (state.worksJob === 'all' ? ' active' : '') + '" data-act="works-job" data-val="all">全部</button>' +
      topJobs.map(function (j) {
        return '<button type="button" class="bmd-filter-pill' + (state.worksJob === j ? ' active' : '') + '" data-act="works-job" data-val="' + esc(j) + '">' + esc(j) + ' (' + jobCounts[j] + ')</button>';
      }).join('') +
      '</div></div>' +
      '<div class="bmd-tools-bar" id="browserTools">' +
      '<div class="bmd-tools-left">' +
      '<button type="button" class="bmd-filter-pill' + (state.worksSort === 'dateline' ? ' active' : '') + '" data-act="works-sort" data-val="dateline">📅 时间</button>' +
      '<button type="button" class="bmd-filter-pill' + (state.worksSort === 'rate' ? ' active' : '') + '" data-act="works-sort" data-val="rate">★ 评分</button>' +
      '<button type="button" class="bmd-filter-pill' + (state.worksSort === 'title' ? ' active' : '') + '" data-act="works-sort" data-val="title">🔤 名称</button>' +
      '</div>' +
      '<div class="bmd-tools-right">' +
      '<input type="search" class="bmd-search-input" id="bmdWorksSearch" value="' + esc(state.worksQuery) + '" placeholder="筛选作品名称..." />' +
      '<button type="button" class="bmd-filter-pill' + (state.worksView === 'list' ? ' active' : '') + '" data-act="works-view" data-val="list">列表</button>' +
      '<button type="button" class="bmd-filter-pill' + (state.worksView === 'grid' ? ' active' : '') + '" data-act="works-view" data-val="grid">网格</button>' +
      '</div></div>' +
      (filtered.length
        ? '<div class="bmd-works-list' + (state.worksView === 'grid' ? ' is-grid' : '') + '">' +
          filtered.map(function (w) {
            var thumbCls = Number(w.type) === 3 ? 'bmd-thumb-11' : 'bmd-thumb-34';
            return (
              '<div class="bmd-work-card">' +
              '<a href="subject.html?id=' + esc(w.subjectId) + '">' + imgTag(w.cover, thumbCls, w.name, w.nameCn || w.name) + '</a>' +
              '<div class="bmd-work-body">' +
              '<h3 class="bmd-item-title"><a href="subject.html?id=' + esc(w.subjectId) + '">' + esc(w.nameCn || w.name) + '</a></h3>' +
              (w.nameCn && w.nameCn !== w.name ? '<div class="bmd-item-sub">' + esc(w.name) + '</div>' : '') +
              '<div style="margin-bottom:4px;"><span class="bmd-badge-type">' + esc(w.typeLabel) + '</span>' +
              (w.jobs || []).map(function (j) { return '<span class="bmd-badge-job">' + esc(j) + '</span>'; }).join('') +
              (w.rank ? '<span class="bmd-rank-pill">Rank #' + esc(w.rank) + '</span>' : '') +
              '</div>' +
              (w.info ? '<div class="bmd-item-sub" style="white-space:normal;">' + esc(w.info) + '</div>' : '') +
              (w.score ? tenStarsHtml(w.score) : '') +
              '</div></div>'
            );
          }).join('') +
          '</div>'
        : '<div class="bmd-empty-state">没有符合筛选条件的作品</div>') +
      '</section>'
    );
  }

  function renderVoiceTab(entity) {
    var roles = entity.voiceRoles || [];
    var filtered = roles.filter(function (r) {
      if (!state.voiceQuery) return true;
      var q = state.voiceQuery.toLowerCase();
      var sText = (r.subjects || []).map(function (s) { return s.subjectName + ' ' + (s.subjectCn || ''); }).join(' ');
      return (r.charName + ' ' + (r.charCn || '') + ' ' + sText).toLowerCase().indexOf(q) !== -1;
    });
    return (
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>🎙️ 演出角色总览</h2>' +
      '<input type="search" class="bmd-search-input" id="bmdVoiceSearch" value="' + esc(state.voiceQuery) + '" placeholder="筛选角色名 / 作品名..." />' +
      '</div>' +
      renderVoiceList(filtered) +
      '</section>'
    );
  }

  function renderCollabsTab(entity) {
    var collabs = entity.collabs || [];
    var filtered = collabs.filter(function (c) {
      if (!state.collabQuery) return true;
      var q = state.collabQuery.toLowerCase();
      var hay = (c.name + ' ' + (c.jobs || []).join(' ') + ' ' + (c.subjects || []).map(function (s) { return s.name; }).join(' ')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    return (
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>🤝 合作伙伴网络</h2>' +
      '<input type="search" class="bmd-search-input" id="bmdCollabSearch" value="' + esc(state.collabQuery) + '" placeholder="筛选合作者 / 共同作品..." />' +
      '</div>' +
      (filtered.length
        ? '<div class="browserCrtList bmd-collabs-grid">' +
          filtered.map(function (co) {
            return (
              '<div class="bmd-collab-card" id="item_person' + esc(co.id) + '">' +
              '<div class="bmd-collab-head">' +
              '<a href="person.html?id=' + esc(co.id) + '">' + imgTag(co.avatar, 'bmd-side-avatar', co.name, co.name) + '</a>' +
              '<div style="min-width:0;flex:1;">' +
              '<a href="person.html?id=' + esc(co.id) + '" class="bmd-comment-name">' + esc(co.name) + '</a>' +
              '<div class="bmd-side-sub">共同参与 ' + esc(co.count) + ' 部作品</div>' +
              '</div></div>' +
              (co.jobs && co.jobs.length
                ? '<div>' + co.jobs.map(function (j) { return '<span class="bmd-badge-job">' + esc(j) + '</span>'; }).join('') + '</div>'
                : '') +
              (co.info ? '<div class="bmd-item-sub" style="white-space:normal;">' + esc(co.info) + '</div>' : '') +
              '<div class="bmd-collab-subjs">' +
              (co.subjects || []).map(function (s) {
                return '<a href="subject.html?id=' + esc(s.id) + '" title="' + esc(s.title) + '">' + esc(s.name) + '</a>';
              }).join('') +
              '</div></div>'
            );
          }).join('') +
          '</div>'
        : '<div class="bmd-empty-state">暂无匹配的合作者记录</div>') +
      '</section>'
    );
  }

  function renderCollectionsTab(entity) {
    var collected = isCollected(state.kind, entity.id);
    var list = (entity.collectors || []).slice();
    if (collected) {
      list = list.filter(function (u) { return u.uid !== '553488'; });
      list.unshift({
        uid: '553488',
        name: '少年游',
        avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
        time: '刚刚收藏 · 当前账号'
      });
    }
    var filtered = list.filter(function (u) {
      if (!state.collectQuery) return true;
      return (u.name + ' ' + u.uid).toLowerCase().indexOf(state.collectQuery.toLowerCase()) !== -1;
    });
    var total = (entity.collectTotal || list.length) + (collected ? 1 : 0);

    return (
      '<section class="bmd-glass-card">' +
      '<div class="bmd-card-head"><h2>❤️ 收藏用户列表 <small>(共 ' + esc(total) + ' 人)</small></h2>' +
      '<input type="search" class="bmd-search-input" id="bmdCollectSearch" value="' + esc(state.collectQuery) + '" placeholder="筛选用户昵称..." />' +
      '</div>' +
      (filtered.length
        ? '<ul id="memberUserList" class="bmd-user-grid">' +
          filtered.map(function (u) {
            var href = (u.uid === '553488' || u.uid === 'sai') ? ('user.html?uid=' + esc(u.uid)) : 'javascript:void(0)';
            return (
              '<li>' +
              '<a href="' + href + '">' + imgTag(u.avatar, 'bmd-side-avatar', u.name, u.name) + '</a>' +
              '<div class="bmd-side-meta">' +
              '<a href="' + href + '" class="bmd-side-title" style="text-decoration:none;display:block;">' + esc(u.name) + '</a>' +
              '<div class="bmd-side-sub">' + esc(u.time) + '</div>' +
              '</div></li>'
            );
          }).join('') +
          '</ul>'
        : '<div class="bmd-empty-state">暂无收藏用户记录</div>') +
      '</section>'
    );
  }

  function renderMainColumn(entity) {
    var colB = document.getElementById('columnCrtB');
    if (!colB) return;

    if (state.tab === 'album') colB.innerHTML = renderAlbumTab(entity);
    else if (state.tab === 'works' && state.kind === 'person') colB.innerHTML = renderWorksTab(entity);
    else if (state.tab === 'voice' && state.kind === 'person') colB.innerHTML = renderVoiceTab(entity);
    else if (state.tab === 'collabs' && state.kind === 'person') colB.innerHTML = renderCollabsTab(entity);
    else if (state.tab === 'collections') colB.innerHTML = renderCollectionsTab(entity);
    else colB.innerHTML = renderOverview(entity);
  }

  /* -------------------- Modals (Lightbox / Upload / Edit / Index) -------------------- */
  function openModal(html) {
    var bd = document.getElementById('bmdModalBackdrop');
    var box = document.getElementById('bmdModalBox');
    if (!bd || !box) return;
    box.innerHTML = html;
    bd.classList.add('open');
    bd.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    var bd = document.getElementById('bmdModalBackdrop');
    if (!bd) return;
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden', 'true');
  }

  function openLightbox(entity, idx) {
    var photos = (entity.album || []).slice();
    var avatar = getEntityAvatar(entity);
    if (idx === -99) {
      openModal(
        '<div style="text-align:center;">' +
        '<img src="' + esc(avatar) + '" alt="' + esc(entity.name) + '" class="bmd-lightbox-img" referrerpolicy="no-referrer" />' +
        '<div style="font-weight:700;margin-bottom:10px;">' + esc(entity.nameCn || entity.name) + ' · 官方肖像</div>' +
        '<button type="button" class="bmd-action-btn" data-act="close-modal">关闭预览</button>' +
        '</div>'
      );
      return;
    }
    if (!photos.length) return;
    var safeIdx = Math.max(0, Math.min(photos.length - 1, idx));
    state.lightboxIdx = safeIdx;
    var ph = photos[safeIdx];
    openModal(
      '<div style="text-align:center;">' +
      '<img src="' + esc(ph.img || ph.thumb) + '" alt="' + esc(ph.title) + '" class="bmd-lightbox-img" referrerpolicy="no-referrer" />' +
      '<div style="font-weight:700;margin-bottom:12px;">' + esc(ph.title) + ' (' + (safeIdx + 1) + ' / ' + photos.length + ')</div>' +
      '<div style="display:flex;justify-content:center;gap:10px;">' +
      '<button type="button" class="bmd-action-btn" data-act="lightbox-prev">‹ 上一张</button>' +
      '<button type="button" class="bmd-action-btn" data-act="close-modal">关闭</button>' +
      '<button type="button" class="bmd-action-btn" data-act="lightbox-next">下一张 ›</button>' +
      '</div></div>'
    );
  }

  function openIndexModal(entity) {
    var store = readJson(INDEX_KEY, {});
    var userIndexes = store.lists || [
      { id: 'idx-fav', title: '个人最爱角色与主创档案集', items: [] },
      { id: 'idx-seiyu', title: '年度印象深刻配音与监督巡礼', items: [] }
    ];
    var eKey = entityKey(entity);
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;font-size:17px;">📁 收集到个人目录</h3>' +
      '<button type="button" class="bmd-op-btn" data-act="close-modal">✕</button>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--ink-2);margin:0 0 12px;">将 <strong>' + esc(entity.nameCn || entity.name) + '</strong> 加入目录：</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">' +
      userIndexes.map(function (ix) {
        var added = (ix.items || []).indexOf(eKey) !== -1;
        return (
          '<button type="button" class="bmd-action-btn" style="justify-content:space-between;width:100%;" data-act="toggle-index-item" data-index-id="' + esc(ix.id) + '">' +
          '<span>📑 ' + esc(ix.title) + '</span>' +
          '<span>' + (added ? '✓ 已收录' : '+ 加入') + '</span>' +
          '</button>'
        );
      }).join('') +
      '</div>' +
      '<form id="bmdNewIndexForm" style="display:flex;gap:8px;">' +
      '<input type="text" id="bmdNewIndexTitle" class="bmd-search-input" style="flex:1;" placeholder="新建目录名称..." required />' +
      '<button type="submit" class="bmd-submit-btn">新建并加入</button>' +
      '</form>'
    );
  }

  function openUploadModal(entity) {
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;font-size:17px;">📷 上传 / 替换肖像预览</h3>' +
      '<button type="button" class="bmd-op-btn" data-act="close-modal">✕</button>' +
      '</div>' +
      '<form id="bmdUploadPortraitForm" style="display:flex;flex-direction:column;gap:12px;">' +
      '<label style="font-size:12.5px;color:var(--ink-2);">输入图片 URL（支持 lain.bgm.tv）或选择本地图片文件预览：</label>' +
      '<input type="url" id="bmdPortraitUrlInput" class="bmd-search-input" placeholder="https://lain.bgm.tv/..." value="' + esc(getEntityAvatar(entity)) + '" />' +
      '<input type="file" id="bmdPortraitFileInput" accept="image/*" style="font-size:12.5px;" />' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button type="button" class="bmd-action-btn" data-act="reset-portrait">恢复默认</button>' +
      '<button type="submit" class="bmd-submit-btn">应用新肖像</button>' +
      '</div></form>'
    );
  }

  function openEditInfoboxModal(entity) {
    var rows = getEntityInfobox(entity);
    var lines = rows.map(function (r) { return r.k + ': ' + r.v; }).join('\n');
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;font-size:17px;">✏️ 编辑 Infobox 维基属性</h3>' +
      '<button type="button" class="bmd-op-btn" data-act="close-modal">✕</button>' +
      '</div>' +
      '<form id="bmdEditInfoboxForm" style="display:flex;flex-direction:column;gap:12px;">' +
      '<textarea id="bmdInfoboxTextarea" class="bmd-reply-textarea" style="min-height:190px;font-family:var(--mono);font-size:12.5px;">' + esc(lines) + '</textarea>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button type="button" class="bmd-action-btn" data-act="reset-infobox">恢复原始</button>' +
      '<button type="submit" class="bmd-submit-btn">保存本地预览</button>' +
      '</div></form>'
    );
  }

  /* -------------------- Full Render & Event Delegation -------------------- */
  function renderAll() {
    var entity = resolveEntity(state.kind, state.id);
    if (!entity) return;
    renderSwitcher();
    renderHeader(entity);
    renderSidebar(entity);
    renderMainColumn(entity);
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var entity = resolveEntity(state.kind, state.id);
      if (!entity) return;

      // Switcher pill
      var sw = e.target.closest('[data-switch-id]');
      if (sw) {
        e.preventDefault();
        state.id = sw.getAttribute('data-switch-id');
        state.tab = 'overview';
        state.bioExpanded = false;
        syncUrl(false);
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Nav tab
      var tabEl = e.target.closest('#bmdNavTabs a[data-tab]');
      if (tabEl) {
        e.preventDefault();
        state.tab = tabEl.getAttribute('data-tab');
        syncUrl(false);
        renderHeader(entity);
        renderMainColumn(entity);
        return;
      }

      // Go tab shortcut
      var goTab = e.target.closest('[data-go-tab]');
      if (goTab) {
        e.preventDefault();
        state.tab = goTab.getAttribute('data-go-tab');
        syncUrl(false);
        renderHeader(entity);
        renderMainColumn(entity);
        var colB = document.getElementById('columnCrtB');
        if (colB) colB.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // Smile insert
      var smBtn = e.target.closest('[data-insert-smile]');
      if (smBtn) {
        var ta = document.getElementById('bmdReplyInput');
        if (ta) {
          ta.value = (ta.value ? ta.value + ' ' : '') + smBtn.getAttribute('data-insert-smile');
          ta.focus();
        }
        return;
      }

      // Backdrop close
      if (e.target.id === 'bmdModalBackdrop') {
        closeModal();
        return;
      }

      var actEl = e.target.closest('[data-act]');
      if (!actEl) {
        if (state.openLikeId || state.openMoreId) {
          state.openLikeId = null;
          state.openMoreId = null;
          renderMainColumn(entity);
        }
        return;
      }

      var act = actEl.getAttribute('data-act');
      if (act === 'toggle-collect') {
        toggleCollect(entity);
      } else if (act === 'open-index') {
        openIndexModal(entity);
      } else if (act === 'zoom-portrait') {
        if (getEntityAvatar(entity)) openLightbox(entity, -99);
      } else if (act === 'open-upload') {
        openUploadModal(entity);
      } else if (act === 'open-edit-infobox') {
        openEditInfoboxModal(entity);
      } else if (act === 'close-modal') {
        closeModal();
      } else if (act === 'toggle-bio') {
        state.bioExpanded = !state.bioExpanded;
        renderMainColumn(entity);
      } else if (act === 'album-view') {
        state.albumView = actEl.getAttribute('data-val') || 'grid';
        renderMainColumn(entity);
      } else if (act === 'open-lightbox') {
        openLightbox(entity, Number(actEl.getAttribute('data-photo-idx') || 0));
      } else if (act === 'lightbox-prev') {
        var totalP = (entity.album || []).length;
        if (totalP) openLightbox(entity, (state.lightboxIdx - 1 + totalP) % totalP);
      } else if (act === 'lightbox-next') {
        var totalN = (entity.album || []).length;
        if (totalN) openLightbox(entity, (state.lightboxIdx + 1) % totalN);
      } else if (act === 'works-type') {
        state.worksType = actEl.getAttribute('data-val') || 'all';
        syncUrl(true);
        renderMainColumn(entity);
      } else if (act === 'works-job') {
        state.worksJob = actEl.getAttribute('data-val') || 'all';
        syncUrl(true);
        renderMainColumn(entity);
      } else if (act === 'works-sort') {
        state.worksSort = actEl.getAttribute('data-val') || 'dateline';
        syncUrl(true);
        renderMainColumn(entity);
      } else if (act === 'works-view') {
        state.worksView = actEl.getAttribute('data-val') || 'list';
        syncUrl(true);
        renderMainColumn(entity);
      } else if (act === 'open-sub') {
        var pid = actEl.getAttribute('data-post-id');
        state.openSubFormId = state.openSubFormId === pid ? null : pid;
        state.openLikeId = null;
        state.openMoreId = null;
        renderMainColumn(entity);
      } else if (act === 'open-like') {
        e.preventDefault();
        var lpid = actEl.getAttribute('data-post-id');
        state.openLikeId = state.openLikeId === lpid ? null : lpid;
        state.openMoreId = null;
        renderMainColumn(entity);
      } else if (act === 'open-more') {
        var mpid = actEl.getAttribute('data-post-id');
        state.openMoreId = state.openMoreId === mpid ? null : mpid;
        state.openLikeId = null;
        renderMainColumn(entity);
      } else if (act === 'toggle-like') {
        var postId = actEl.getAttribute('data-post-id');
        var emoji = actEl.getAttribute('data-emoji');
        var allLikes = readJson(LIKE_KEY, {});
        var ek = entityKey(entity);
        if (!allLikes[ek]) allLikes[ek] = { __user: {} };
        if (!allLikes[ek].__user) allLikes[ek].__user = {};
        if (!allLikes[ek][postId]) allLikes[ek][postId] = {};
        var basePost = (getMergedComments(entity).filter(function (x) { return x.id === postId; })[0]) || { likes: {} };
        var currentVal = Number(basePost.likes[emoji] || 0);
        var uKey = postId + ':' + emoji;
        if (allLikes[ek].__user[uKey]) {
          delete allLikes[ek].__user[uKey];
          allLikes[ek][postId][emoji] = Math.max(0, currentVal - 1);
        } else {
          allLikes[ek].__user[uKey] = true;
          allLikes[ek][postId][emoji] = currentVal + 1;
        }
        writeJson(LIKE_KEY, allLikes);
        state.openLikeId = null;
        renderMainColumn(entity);
        showToast('已更新贴贴反应 ' + emoji);
      } else if (act === 'copy-floor') {
        var fl = actEl.getAttribute('data-floor');
        var url = window.location.href.split('#')[0] + '#post_' + actEl.getAttribute('data-post-id');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).catch(function () {});
        }
        state.openMoreId = null;
        renderMainColumn(entity);
        showToast('已复制 ' + fl + ' 链接');
      } else if (act === 'collapse-floor') {
        var cpid = actEl.getAttribute('data-post-id');
        state.collapsedPosts[cpid] = !state.collapsedPosts[cpid];
        state.openMoreId = null;
        renderMainColumn(entity);
      } else if (act === 'report-floor') {
        state.openMoreId = null;
        renderMainColumn(entity);
        showToast('已记录反馈，维基协力组将核查该楼层');
      } else if (act === 'toggle-index-item') {
        var ixId = actEl.getAttribute('data-index-id');
        var ixStore = readJson(INDEX_KEY, {});
        if (!ixStore.lists) {
          ixStore.lists = [
            { id: 'idx-fav', title: '个人最爱角色与主创档案集', items: [] },
            { id: 'idx-seiyu', title: '年度印象深刻配音与监督巡礼', items: [] }
          ];
        }
        var target = ixStore.lists.filter(function (x) { return x.id === ixId; })[0];
        if (target) {
          var eKey2 = entityKey(entity);
          var pos = target.items.indexOf(eKey2);
          if (pos === -1) {
            target.items.push(eKey2);
            showToast('已加入目录「' + target.title + '」');
          } else {
            target.items.splice(pos, 1);
            showToast('已从目录移除');
          }
          writeJson(INDEX_KEY, ixStore);
          openIndexModal(entity);
        }
      } else if (act === 'reset-portrait') {
        var pStore = readJson(PORTRAIT_KEY, {});
        delete pStore[entityKey(entity)];
        writeJson(PORTRAIT_KEY, pStore);
        closeModal();
        renderSidebar(entity);
        showToast('已恢复默认肖像');
      } else if (act === 'reset-infobox') {
        var iStore = readJson(INFOBOX_KEY, {});
        delete iStore[entityKey(entity)];
        writeJson(INFOBOX_KEY, iStore);
        closeModal();
        renderSidebar(entity);
        showToast('已恢复原始 Infobox 属性');
      }
    });

    document.addEventListener('input', function (e) {
      var entity = resolveEntity(state.kind, state.id);
      if (!entity) return;
      if (e.target.id === 'bmdWorksSearch') {
        state.worksQuery = e.target.value || '';
        renderMainColumn(entity);
        var el1 = document.getElementById('bmdWorksSearch');
        if (el1) { el1.focus(); el1.setSelectionRange(el1.value.length, el1.value.length); }
      } else if (e.target.id === 'bmdVoiceSearch') {
        state.voiceQuery = e.target.value || '';
        renderMainColumn(entity);
        var el2 = document.getElementById('bmdVoiceSearch');
        if (el2) { el2.focus(); el2.setSelectionRange(el2.value.length, el2.value.length); }
      } else if (e.target.id === 'bmdCollabSearch') {
        state.collabQuery = e.target.value || '';
        renderMainColumn(entity);
        var el3 = document.getElementById('bmdCollabSearch');
        if (el3) { el3.focus(); el3.setSelectionRange(el3.value.length, el3.value.length); }
      } else if (e.target.id === 'bmdCollectSearch') {
        state.collectQuery = e.target.value || '';
        renderMainColumn(entity);
        var el4 = document.getElementById('bmdCollectSearch');
        if (el4) { el4.focus(); el4.setSelectionRange(el4.value.length, el4.value.length); }
      }
    });

    document.addEventListener('submit', function (e) {
      var entity = resolveEntity(state.kind, state.id);
      if (!entity) return;

      if (e.target.id === 'ReplyForm') {
        e.preventDefault();
        var input = document.getElementById('bmdReplyInput');
        var text = input ? input.value.trim() : '';
        if (!text) {
          showToast('请先输入评论内容');
          return;
        }
        var allReplies = readJson(REPLY_KEY, {});
        var ek = entityKey(entity);
        if (!allReplies[ek]) allReplies[ek] = [];
        var now = new Date();
        var ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        var nextFloor = '#' + ((entity.commentTotal || (entity.comments || []).length) + allReplies[ek].length + 1);
        allReplies[ek].unshift({
          id: 'local_' + Date.now(),
          floor: nextFloor,
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: ts,
          text: text,
          likes: {},
          subReplies: []
        });
        writeJson(REPLY_KEY, allReplies);
        renderMainColumn(entity);
        showToast('评论已发送 (' + nextFloor + ')');
      } else if (e.target.matches('[data-sub-form]')) {
        e.preventDefault();
        var parentId = e.target.getAttribute('data-sub-form');
        var inp = e.target.querySelector('input');
        var txt = inp ? inp.value.trim() : '';
        if (!txt) return;
        var subStore = readJson(SUBREPLY_KEY, {});
        var ek2 = entityKey(entity);
        if (!subStore[ek2]) subStore[ek2] = {};
        if (!subStore[ek2][parentId]) subStore[ek2][parentId] = [];
        subStore[ek2][parentId].push({
          id: 'sub_' + Date.now(),
          floor: '楼中楼',
          user: '少年游',
          uid: '553488',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: '刚刚',
          text: txt
        });
        writeJson(SUBREPLY_KEY, subStore);
        state.openSubFormId = null;
        renderMainColumn(entity);
        showToast('已发布楼中楼回复');
      } else if (e.target.id === 'bmdNewIndexForm') {
        e.preventDefault();
        var titleInp = document.getElementById('bmdNewIndexTitle');
        var titleVal = titleInp ? titleInp.value.trim() : '';
        if (!titleVal) return;
        var ixStore = readJson(INDEX_KEY, {});
        if (!ixStore.lists) ixStore.lists = [];
        ixStore.lists.unshift({
          id: 'idx_' + Date.now(),
          title: titleVal,
          items: [entityKey(entity)]
        });
        writeJson(INDEX_KEY, ixStore);
        closeModal();
        showToast('已创建目录「' + titleVal + '」并收录');
      } else if (e.target.id === 'bmdUploadPortraitForm') {
        e.preventDefault();
        var urlVal = (document.getElementById('bmdPortraitUrlInput') || {}).value || '';
        var fileInput = document.getElementById('bmdPortraitFileInput');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          var reader = new FileReader();
          reader.onload = function () {
            var pStore = readJson(PORTRAIT_KEY, {});
            pStore[entityKey(entity)] = reader.result;
            writeJson(PORTRAIT_KEY, pStore);
            closeModal();
            renderSidebar(entity);
            showToast('本地肖像预览已更新');
          };
          reader.readAsDataURL(fileInput.files[0]);
          return;
        }
        if (urlVal.trim()) {
          var pStore2 = readJson(PORTRAIT_KEY, {});
          pStore2[entityKey(entity)] = urlVal.trim();
          writeJson(PORTRAIT_KEY, pStore2);
          closeModal();
          renderSidebar(entity);
          showToast('肖像预览已更新');
        }
      } else if (e.target.id === 'bmdEditInfoboxForm') {
        e.preventDefault();
        var raw = (document.getElementById('bmdInfoboxTextarea') || {}).value || '';
        var parsed = [];
        raw.split(/\r?\n/).forEach(function (line) {
          var idx = line.indexOf(':');
          if (idx === -1) idx = line.indexOf('：');
          if (idx > 0) {
            var k = line.slice(0, idx).trim();
            var v = line.slice(idx + 1).trim();
            if (k && v) parsed.push({ k: k, v: v });
          }
        });
        var iStore = readJson(INFOBOX_KEY, {});
        iStore[entityKey(entity)] = parsed;
        writeJson(INFOBOX_KEY, iStore);
        closeModal();
        renderSidebar(entity);
        showToast('Infobox 属性已更新（本地预览）');
      }
    });

    var headerSearch = document.getElementById('headerSearch');
    if (headerSearch) {
      headerSearch.addEventListener('submit', function (e) {
        e.preventDefault();
        var qEl = document.getElementById('search_text');
        var q = qEl ? qEl.value.trim() : '';
        if (q) {
          window.location.href = 'search.html?cat=person&q=' + encodeURIComponent(q);
        } else {
          window.location.href = 'mono.html';
        }
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
