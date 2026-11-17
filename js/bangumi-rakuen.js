/* ==========================================================================
   bangumi-rakuen.js · 超展开聚合阅读器 (D3 / P20)
   all_frames 统一控制器：outer / topiclist / home / topic 四态协同
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_RAKUEN_DATA || {
    channels: [],
    home: { featured: [], recent: [], intro: '' },
    topics: [],
    channelKeys: {},
    tabKeys: {},
    myGroupKeys: [],
    myTopicKeys: [],
    myReplyKeys: [],
    details: {}
  };

  var STORAGE_THEME = 'bgm_rakuen_theme_v1';
  var STORAGE_READ = 'bgm_rakuen_read_v1';
  var STORAGE_CUSTOM_TOPICS = 'bgm_rakuen_custom_v1';
  var STORAGE_REPLIES = 'bgm_rakuen_replies_v1';
  var STORAGE_SUBREPLIES = 'bgm_rakuen_subreplies_v1';
  var STORAGE_LIKES = 'bgm_rakuen_likes_v1';
  var STORAGE_INDEX = 'bgm_rakuen_index_v1';

  var USER_ME = {
    name: '少年游',
    handle: '553488',
    avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
    sign: 'Editorial Liquid Glass · 时光机探索者'
  };

  var EMOJIS = ['👍', '❤️', '😂', '😭', '🎉', '🤝', '🔥', '🫶'];

  var KIND_LABEL = {
    group: '小组',
    subject: '条目',
    ep: '章节',
    crt: '角色',
    prsn: '人物',
    blog: '日志'
  };

  var CHANNEL_NAME = {
    global: '全局聚合',
    new_bangumi: '新番乐园',
    tokei: 'etokei 绘时计',
    classical_bangumi: '经典动画',
    doujin: '天窗联盟',
    pvc: '1/8 位面'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
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

  function toast(msg) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'brm:toast', message: String(msg) }, '*');
        return;
      } catch (e) {}
    }
    if (window.BgmShell && typeof window.BgmShell.toast === 'function') {
      window.BgmShell.toast(msg);
      return;
    }
    var host = $('toastContainer');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-container';
      host.id = 'toastContainer';
      document.body.appendChild(host);
    }
    var node = document.createElement('div');
    node.className = 'glass-toast';
    node.innerHTML = '<span>✦</span><span>' + esc(msg) + '</span>';
    host.appendChild(node);
    setTimeout(function () {
      node.style.opacity = '0';
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 250);
    }, 2200);
  }

  function applyTheme(theme, color) {
    var root = document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    if (color) root.setAttribute('data-theme-color', color);
  }

  function loadStoredTheme() {
    var saved = readJson(STORAGE_THEME, null);
    if (saved && (saved.theme || saved.color)) {
      applyTheme(saved.theme || 'light', saved.color || 'pink');
    }
  }

  function resolveLocalHref(rawHref, kind, id) {
    var h = String(rawHref || '');
    var mSubj = h.match(/\/subject\/(\d+)/);
    if (mSubj) return 'subject.html?id=' + mSubj[1];
    var mEp = h.match(/\/ep\/(\d+)/);
    if (mEp) return 'ep.html?id=' + mEp[1];
    var mCrt = h.match(/\/character\/(\d+)/);
    if (mCrt) return 'character.html?id=' + mCrt[1];
    var mPrsn = h.match(/\/person\/(\d+)/);
    if (mPrsn) return 'person.html?id=' + mPrsn[1];
    var mGrp = h.match(/\/group\/([^/?#]+)/);
    if (mGrp) return 'group.html?group=' + encodeURIComponent(mGrp[1]);
    var mBlog = h.match(/\/blog\/(\d+)/);
    if (mBlog) return 'blog.html?id=' + mBlog[1];
    var mIdx = h.match(/\/index\/(\d+)/);
    if (mIdx) return 'catalog.html?id=' + mIdx[1];
    if (kind === 'crt' && id) return 'character.html?id=' + encodeURIComponent(id);
    if (kind === 'prsn' && id) return 'person.html?id=' + encodeURIComponent(id);
    if (kind === 'ep' && id) return 'ep.html?id=' + encodeURIComponent(id);
    if (kind === 'subject' && id) return 'subject.html?id=' + encodeURIComponent(id);
    if (kind === 'group') return 'group.html';
    if (kind === 'blog') return id ? ('blog.html?id=' + encodeURIComponent(id)) : 'blog.html';
    return 'index.html';
  }

  function origTopicUrl(item) {
    if (!item) return 'https://bgm.tv/rakuen';
    if (item.href && item.href.indexOf('http') === 0) return item.href;
    if (item.href && item.href.indexOf('/') === 0) return 'https://bgm.tv' + item.href;
    if (item.kind === 'group') return 'https://bgm.tv/rakuen/topic/group/' + item.id;
    if (item.kind === 'subject') return 'https://bgm.tv/rakuen/topic/subject/' + item.id;
    if (item.kind === 'ep') return 'https://bgm.tv/rakuen/topic/ep/' + item.id;
    if (item.kind === 'crt') return 'https://bgm.tv/rakuen/topic/crt/' + item.id;
    if (item.kind === 'prsn') return 'https://bgm.tv/rakuen/topic/prsn/' + item.id;
    return 'https://bgm.tv/rakuen';
  }

  function buildTopicMap() {
    var map = {};
    var customs = readJson(STORAGE_CUSTOM_TOPICS, []);
    customs.forEach(function (c) {
      map[c.key] = c;
    });
    (DATA.topics || []).forEach(function (t) {
      if (!map[t.key]) map[t.key] = t;
    });
    return map;
  }

  function formatUserTextHtml(rawText) {
    var safe = esc(rawText || '');
    safe = safe.replace(/\r?\n/g, '<br>');
    safe = safe.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');
    safe = safe.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>');
    safe = safe.replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>');
    safe = safe.replace(/\[mask\](.*?)\[\/mask\]/gi, '<span class="text_mask" title="悬停查看剧透">$1</span>');
    safe = safe.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener">$2</a>');
    return safe;
  }

  function avatarBoxHtml(src, name, cls) {
    var initial = (name || '?').slice(0, 1);
    if (src) {
      return '<img src="' + esc(src) + '" alt="' + esc(name) + '" class="' + esc(cls) + '" referrerpolicy="no-referrer" loading="lazy" />';
    }
    return '<span class="' + esc(cls) + ' brm-ava-fallback">' + esc(initial) + '</span>';
  }

  /* ========================================================================
     MODE 1: OUTER 3-COLUMN FRAME (rakuen.html)
     ======================================================================== */
  function initOuter() {
    loadStoredTheme();
    var params = new URLSearchParams(window.location.search);
    var state = {
      channel: params.get('channel') || 'global',
      type: params.get('type') || 'all',
      filter: params.get('filter') || '',
      topicKey: params.get('topic') || '',
      fullscreen: false
    };

    var container = $('container');
    var leftFrame = $('left');
    var contentFrame = $('contentFrame');
    var readerPill = $('brmReaderPill');
    var standaloneLink = $('brmStandaloneLink');
    var origLink = $('brmOrigLink');

    function syncOuterUrl() {
      try {
        var sp = new URLSearchParams();
        if (state.channel && state.channel !== 'global') sp.set('channel', state.channel);
        if (state.type && state.type !== 'all') sp.set('type', state.type);
        if (state.filter) sp.set('filter', state.filter);
        if (state.topicKey) sp.set('topic', state.topicKey);
        var qs = sp.toString();
        history.replaceState(null, '', 'rakuen.html' + (qs ? '?' + qs : ''));
      } catch (e) {}
    }

    function broadcastTheme() {
      var theme = document.documentElement.getAttribute('data-theme') || 'light';
      var color = document.documentElement.getAttribute('data-theme-color') || 'pink';
      writeJson(STORAGE_THEME, { theme: theme, color: color });
      [leftFrame, contentFrame].forEach(function (fr) {
        if (fr && fr.contentWindow) {
          try {
            fr.contentWindow.postMessage({ type: 'brm:theme', theme: theme, color: color }, '*');
          } catch (e) {}
        }
      });
    }

    function selectChannel(ch, opts) {
      state.channel = CHANNEL_NAME[ch] ? ch : 'global';
      document.querySelectorAll('#brmChannelNav a[data-brm-channel]').forEach(function (a) {
        a.classList.toggle('focus', a.getAttribute('data-brm-channel') === state.channel);
      });
      if (leftFrame) {
        var q = new URLSearchParams();
        q.set('channel', state.channel);
        if (opts && opts.type) q.set('type', opts.type);
        if (opts && opts.filter) q.set('filter', opts.filter);
        leftFrame.src = 'rakuen-topiclist.html?' + q.toString();
      }
      syncOuterUrl();
      if (!opts || !opts.silent) {
        toast('已切换超展开位面：' + (CHANNEL_NAME[state.channel] || state.channel));
      }
    }

    function openTopic(key, title, origUrl) {
      state.topicKey = key;
      if (contentFrame) {
        contentFrame.src = 'rakuen-topic.html?key=' + encodeURIComponent(key);
      }
      if (container) container.classList.add('has-open-topic');
      if (readerPill) readerPill.textContent = title || ('话题 #' + key);
      if (standaloneLink) standaloneLink.href = 'rakuen-topic.html?key=' + encodeURIComponent(key);
      if (origLink) origLink.href = origUrl || 'https://bgm.tv/rakuen';
      if (leftFrame && leftFrame.contentWindow) {
        try {
          leftFrame.contentWindow.postMessage({ type: 'brm:selected-topic', key: key }, '*');
        } catch (e) {}
      }
      syncOuterUrl();
    }

    function closeReader() {
      state.topicKey = '';
      if (container) container.classList.remove('has-open-topic');
      if (contentFrame) contentFrame.src = 'rakuen-home.html';
      if (readerPill) readerPill.textContent = '🌌 超展开首页 · 点击左侧任一话题即可在此阅读';
      if (standaloneLink) standaloneLink.href = 'rakuen-home.html';
      if (origLink) origLink.href = 'https://bgm.tv/rakuen';
      syncOuterUrl();
    }

    // Boot initial iframe URLs
    selectChannel(state.channel, { silent: true, type: state.type, filter: state.filter });
    if (state.topicKey) {
      var map = buildTopicMap();
      var item = map[state.topicKey];
      openTopic(state.topicKey, item ? item.title : state.topicKey, origTopicUrl(item));
    }

    [leftFrame, contentFrame].forEach(function (fr) {
      if (fr) {
        fr.addEventListener('load', function () {
          broadcastTheme();
          if (fr === leftFrame && state.topicKey && leftFrame.contentWindow) {
            try {
              leftFrame.contentWindow.postMessage({ type: 'brm:selected-topic', key: state.topicKey }, '*');
            } catch (e) {}
          }
        });
      }
    });

    // Watch root theme attribute changes (e.g. #customizeModal from bangumi-shell.js)
    try {
      var obs = new MutationObserver(function () {
        broadcastTheme();
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-color'] });
    } catch (e) {}

    window.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'brm:open-topic' && d.key) {
        openTopic(d.key, d.title, d.origUrl);
      } else if (d.type === 'brm:switch-channel' && d.channel) {
        selectChannel(d.channel);
      } else if (d.type === 'brm:toast' && d.message) {
        toast(d.message);
      } else if (d.type === 'brm:reply-added' && leftFrame && leftFrame.contentWindow) {
        try {
          leftFrame.contentWindow.postMessage(d, '*');
        } catch (e) {}
      }
    });

    document.addEventListener('click', function (e) {
      var chLink = e.target.closest('a[data-brm-channel]');
      if (chLink) {
        e.preventDefault();
        selectChannel(chLink.getAttribute('data-brm-channel'));
        return;
      }
      var actEl = e.target.closest('[data-brm-act]');
      if (!actEl) return;
      var act = actEl.getAttribute('data-brm-act');
      if (act === 'go-home') {
        e.preventDefault();
        closeReader();
        selectChannel('global');
      } else if (act === 'close-reader') {
        e.preventDefault();
        closeReader();
      } else if (act === 'toggle-fullscreen') {
        state.fullscreen = !state.fullscreen;
        if (container) container.classList.toggle('is-fullscreen', state.fullscreen);
        actEl.classList.toggle('is-active', state.fullscreen);
        actEl.textContent = state.fullscreen ? '☷ 显示列表' : '⛶ 专注阅读';
      } else if (act === 'toggle-theme') {
        var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(cur);
        broadcastTheme();
        toast('已切换为「' + (cur === 'dark' ? '曜石深色' : '流光浅色') + '」模式');
      } else if (act === 'open-customize') {
        if (window.BgmShell && typeof window.BgmShell.openCustomize === 'function') {
          window.BgmShell.openCustomize();
        } else {
          toast('已打开全局外观面板');
        }
      } else if (act === 'notify') {
        try { window.top.location.href = 'notify.html'; } catch (err) { window.location.href = 'notify.html'; }
      } else if (act === 'pm') {
        try { window.top.location.href = 'notify.html?tab=inbox'; } catch (err) { window.location.href = 'notify.html?tab=inbox'; }
      }
    });
  }

  /* ========================================================================
     MODE 2: LEFT TOPICLIST FRAME (rakuen-topiclist.html)
     ======================================================================== */
  function initTopiclist() {
    loadStoredTheme();
    var params = new URLSearchParams(window.location.search);
    var state = {
      channel: params.get('channel') || 'global',
      type: params.get('type') || 'all',
      filter: params.get('filter') || '',
      query: '',
      limit: 50,
      selectedKey: ''
    };

    var readMap = readJson(STORAGE_READ, {});
    var replyStore = readJson(STORAGE_REPLIES, {});

    function getFilteredItems() {
      var map = buildTopicMap();
      var customs = readJson(STORAGE_CUSTOM_TOPICS, []);
      var keys = null;

      if (state.channel !== 'global' && DATA.channelKeys && DATA.channelKeys[state.channel]) {
        keys = DATA.channelKeys[state.channel].slice();
      } else if (state.type === 'all') {
        keys = (DATA.tabKeys && DATA.tabKeys.all) ? DATA.tabKeys.all.slice() : Object.keys(map);
      } else if (state.type === 'group') {
        keys = (DATA.tabKeys && DATA.tabKeys.group) ? DATA.tabKeys.group.slice() : [];
      } else if (state.type === 'my_group') {
        if (state.filter === 'topic') keys = (DATA.myTopicKeys || []).slice();
        else if (state.filter === 'reply') keys = (DATA.myReplyKeys || []).slice();
        else keys = (DATA.myGroupKeys || []).slice();
      } else if (state.type === 'subject') {
        var tk = state.filter ? ('subject_' + state.filter) : 'subject';
        keys = (DATA.tabKeys && DATA.tabKeys[tk]) ? DATA.tabKeys[tk].slice() : [];
      } else if (state.type === 'ep') {
        keys = (DATA.tabKeys && DATA.tabKeys.ep) ? DATA.tabKeys.ep.slice() : [];
      } else if (state.type === 'mono') {
        if (state.filter === 'character') keys = (DATA.tabKeys && DATA.tabKeys.mono_character) || [];
        else if (state.filter === 'person') keys = (DATA.tabKeys && DATA.tabKeys.mono_person) || [];
        else keys = (DATA.tabKeys && DATA.tabKeys.mono) || [];
        keys = keys.slice();
      } else {
        keys = Object.keys(map);
      }

      // If filtering a specific channel + tab together
      if (state.channel !== 'global' && state.type !== 'all') {
        keys = keys.filter(function (k) {
          var it = map[k];
          if (!it) return false;
          if (state.type === 'group') return it.kind === 'group';
          if (state.type === 'my_group') return (DATA.myGroupKeys || []).indexOf(k) !== -1;
          if (state.type === 'subject') {
            if (state.filter) return it.kind === 'subject' && it.subjectCat === state.filter;
            return it.kind === 'subject';
          }
          if (state.type === 'ep') return it.kind === 'ep';
          if (state.type === 'mono') {
            if (state.filter === 'character') return it.kind === 'crt';
            if (state.filter === 'person') return it.kind === 'prsn';
            return it.kind === 'crt' || it.kind === 'prsn';
          }
          return true;
        });
      }

      // Prepend custom user topics matching filter
      customs.forEach(function (c) {
        if (state.type === 'all' || state.type === c.kind || (state.type === 'my_group' && c.kind === 'group')) {
          if (keys.indexOf(c.key) === -1) keys.unshift(c.key);
        }
      });

      var items = keys.map(function (k) { return map[k]; }).filter(Boolean);
      if (state.query) {
        var q = state.query.toLowerCase();
        items = items.filter(function (it) {
          return (
            (it.title || '').toLowerCase().indexOf(q) !== -1 ||
            (it.parentLabel || '').toLowerCase().indexOf(q) !== -1 ||
            (it.authorName || '').toLowerCase().indexOf(q) !== -1
          );
        });
      }
      return items;
    }

    function syncTabsUi() {
      var chTitle = $('brmActiveChannelName');
      if (chTitle) chTitle.textContent = CHANNEL_NAME[state.channel] || state.channel;

      var topTab = state.type === 'my_group' ? 'group' : state.type;
      document.querySelectorAll('#brmFilterTabs > li > a[data-brm-tab]').forEach(function (a) {
        a.classList.toggle('focus', a.getAttribute('data-brm-tab') === topTab);
      });
      document.querySelectorAll('#brmFilterTabs ul.brm-sub-menu a').forEach(function (a) {
        var t = a.getAttribute('data-brm-tab') || '';
        var f = a.getAttribute('data-brm-filter') || '';
        a.classList.toggle('is-selected', t === state.type && f === state.filter);
      });
    }

    function renderList() {
      syncTabsUi();
      var items = getFilteredItems();
      var shown = items.slice(0, state.limit);

      var chip = $('brmTopicCountChip');
      if (chip) chip.textContent = items.length + ' 条';

      var readCountEl = $('brmReadCounter');
      if (readCountEl) readCountEl.textContent = '已读 ' + Object.keys(readMap).length;

      var ul = $('brmTopicListUl');
      if (ul) {
        if (!shown.length) {
          ul.innerHTML = '<li style="padding:24px 12px;text-align:center;color:var(--muted);">当前筛选下暂无匹配话题</li>';
        } else {
          ul.innerHTML = shown.map(function (it) {
            var extraReplies = (replyStore[it.key] || []).length;
            var totalRep = (it.replies || 0) + extraReplies;
            var isRead = !!readMap[it.key];
            var isSel = state.selectedKey === it.key;
            var pHref = resolveLocalHref(it.parentHref, it.kind, it.id);
            var cls = 'item_list' + (isRead ? ' is-read' : '') + (isSel ? ' is-selected' : '');
            return (
              '<li class="' + cls + '" id="item_' + esc(it.key) + '" data-brm-key="' + esc(it.key) + '">' +
                '<a href="rakuen-topic.html?key=' + encodeURIComponent(it.key) + '" class="avatar" title="' + esc(it.authorName || '话题') + '">' +
                  '<span class="avatarNeue">' + avatarBoxHtml(it.avatar, it.authorName || it.title, '') + '</span>' +
                '</a>' +
                '<div class="inner">' +
                  '<a href="rakuen-topic.html?key=' + encodeURIComponent(it.key) + '" class="title">' + esc(it.title) + '</a>' +
                  '<small class="grey"> (+' + totalRep + ')</small>' +
                  '<span class="row">' +
                    '<span class="brm-kind-tag" data-kind="' + esc(it.kind) + '">' + esc(KIND_LABEL[it.kind] || it.kind) + '</span>' +
                    (it.parentLabel ? '<a href="' + esc(pHref) + '" target="_top" class="brm-parent-link">' + esc(it.parentLabel) + '</a>' : '') +
                    (it.time ? '<small class="time">· ' + esc(it.time) + '</small>' : '') +
                  '</span>' +
                '</div>' +
              '</li>'
            );
          }).join('');
        }
      }

      var moreBtn = $('brmLoadMoreBtn');
      if (moreBtn) {
        var rem = items.length - shown.length;
        if (rem > 0) {
          moreBtn.style.display = 'inline-flex';
          moreBtn.textContent = '加载更多（还有 ' + rem + ' 条）';
        } else {
          moreBtn.style.display = 'none';
        }
      }
    }

    function openItem(key) {
      var map = buildTopicMap();
      var item = map[key];
      if (!item) return;
      readMap[key] = 1;
      writeJson(STORAGE_READ, readMap);
      state.selectedKey = key;
      renderList();

      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'brm:open-topic',
            key: key,
            title: item.title,
            origUrl: origTopicUrl(item)
          }, '*');
          return;
        } catch (e) {}
      }
      window.location.href = 'rakuen-topic.html?key=' + encodeURIComponent(key);
    }

    var searchInput = $('brmListSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.query = searchInput.value.trim();
        state.limit = 50;
        renderList();
      });
    }

    document.addEventListener('click', function (e) {
      var tabA = e.target.closest('#brmFilterTabs a[data-brm-tab]');
      if (tabA) {
        e.preventDefault();
        state.type = tabA.getAttribute('data-brm-tab') || 'all';
        state.filter = tabA.getAttribute('data-brm-filter') || '';
        state.limit = 50;
        renderList();
        return;
      }

      var actEl = e.target.closest('[data-brm-act]');
      if (actEl) {
        e.preventDefault();
        var act = actEl.getAttribute('data-brm-act');
        if (act === 'load-more') {
          state.limit += 50;
          renderList();
        } else if (act === 'open-new-topic') {
          var modal = $('brmNewTopicModal');
          if (modal) modal.hidden = false;
        } else if (act === 'close-new-topic') {
          var modalC = $('brmNewTopicModal');
          if (modalC) modalC.hidden = true;
        }
        return;
      }

      if (e.target.closest('a.brm-parent-link')) {
        return;
      }

      var li = e.target.closest('li.item_list[data-brm-key]');
      if (li) {
        e.preventDefault();
        openItem(li.getAttribute('data-brm-key'));
      }
    });

    var newForm = $('brmNewTopicForm');
    if (newForm) {
      newForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var kind = ($('brmNewKind') || {}).value || 'group';
        var title = (($('brmNewTitle') || {}).value || '').trim();
        var body = (($('brmNewBody') || {}).value || '').trim();
        if (!title || !body) return;
        var nid = String(990000 + Math.floor(Math.random() * 90000));
        var newKey = kind + '_' + nid;
        var parentMap = {
          group: { label: '番組美术馆', href: '/group/boring' },
          subject: { label: '葬送的芙莉莲', href: '/subject/400602' },
          ep: { label: 'ep.28 还会再见的', href: '/ep/1257301' }
        };
        var pMeta = parentMap[kind] || parentMap.group;
        var newItem = {
          key: newKey,
          kind: kind,
          id: nid,
          title: title,
          href: '/rakuen/topic/' + kind + '/' + nid,
          replies: 0,
          avatar: USER_ME.avatar,
          authorName: USER_ME.name,
          authorHandle: USER_ME.handle,
          parentLabel: pMeta.label,
          parentHref: pMeta.href,
          time: '刚刚',
          channels: ['global'],
          subjectCat: kind === 'subject' ? '2' : '',
          customBody: body
        };
        var customs = readJson(STORAGE_CUSTOM_TOPICS, []);
        customs.unshift(newItem);
        writeJson(STORAGE_CUSTOM_TOPICS, customs);
        var modal = $('brmNewTopicModal');
        if (modal) modal.hidden = true;
        newForm.reset();
        state.type = 'all';
        state.filter = '';
        renderList();
        toast('已发布新讨论：' + title);
        openItem(newKey);
      });
    }

    window.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'brm:theme') {
        applyTheme(d.theme, d.color);
      } else if (d.type === 'brm:selected-topic') {
        state.selectedKey = d.key || '';
        renderList();
      } else if (d.type === 'brm:reply-added') {
        replyStore = readJson(STORAGE_REPLIES, {});
        renderList();
      }
    });

    renderList();
  }

  /* ========================================================================
     MODE 3: RIGHT HOME LANDING FRAME (rakuen-home.html)
     ======================================================================== */
  function initHome() {
    loadStoredTheme();
    var host = $('brmHomeHost');
    if (!host) return;

    var home = DATA.home || { featured: [], recent: [], intro: '' };
    var details = DATA.details || {};
    var featuredTopics = Object.keys(details).map(function (k) {
      return { key: k, detail: details[k] };
    });

    host.innerHTML =
      '<div class="brm-hero-card">' +
        '<h2>🌌 超展开 · Rakuen 话题聚合阅读器</h2>' +
        '<p>' + esc(home.intro || '汇聚小组、条目、章节、角色与现实人物讨论，左侧流式检索，右侧无刷沉浸阅读。') + '</p>' +
        '<div class="brm-home-stats">' +
          '<span class="brm-home-stat">实时话题 ' + esc((DATA.topics || []).length) + ' 篇</span>' +
          '<span class="brm-home-stat">多楼层完整样本 ' + esc(featuredTopics.length) + ' 篇</span>' +
          '<span class="brm-home-stat">6 大主题位面</span>' +
          '<span class="brm-home-stat">all_frames 昼夜同源同步</span>' +
        '</div>' +
      '</div>' +

      '<div class="eden_rec_box">' +
        '<h2>推荐位面 · Top Eden</h2>' +
        '<ul class="topEden">' +
          (home.featured || []).map(function (ed) {
            return (
              '<li data-brm-go-channel="' + esc(ed.slug) + '">' +
                '<img src="' + esc(ed.icon) + '" alt="' + esc(ed.name) + '" referrerpolicy="no-referrer" />' +
                '<div><h2>' + esc(ed.name) + '</h2><span>' + esc(ed.players) + '</span></div>' +
              '</li>'
            );
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="eden_rec_box">' +
        '<h2>近期活跃位面 · Recent</h2>' +
        '<ul class="groupsLine">' +
          (home.recent || []).map(function (ed) {
            return (
              '<li data-brm-go-channel="' + esc(ed.slug) + '">' +
                '<img src="' + esc(ed.icon) + '" alt="' + esc(ed.name) + '" referrerpolicy="no-referrer" />' +
                '<div><div style="font-weight:700;font-size:13px;">' + esc(ed.name) + '</div><small style="color:var(--muted);">' + esc(ed.players) + '</small></div>' +
              '</li>'
            );
          }).join('') +
        '</ul>' +
      '</div>' +

      '<h2 class="brm-section-title">🔥 精选多楼层讨论直达（点击在阅读窗展开）</h2>' +
      '<div class="brm-featured-grid">' +
        featuredTopics.map(function (entry) {
          var d = entry.detail;
          return (
            '<div class="brm-featured-card" data-brm-open-key="' + esc(entry.key) + '">' +
              '<div class="brm-featured-title">' + esc(d.title) + '</div>' +
              '<div class="brm-featured-meta">' +
                '<span>' + esc(d.parentName || 'Bangumi') + ' · ' + esc(d.sectionLabel || '讨论') + '</span>' +
                '<span>' + esc((d.replies || []).length) + ' 楼互动</span>' +
              '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>';

    document.addEventListener('click', function (e) {
      var ch = e.target.closest('[data-brm-go-channel]');
      if (ch) {
        var slug = ch.getAttribute('data-brm-go-channel');
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'brm:switch-channel', channel: slug }, '*');
        } else {
          window.location.href = 'rakuen.html?channel=' + encodeURIComponent(slug);
        }
        return;
      }
      var card = e.target.closest('[data-brm-open-key]');
      if (card) {
        var k = card.getAttribute('data-brm-open-key');
        var d = (DATA.details || {})[k];
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'brm:open-topic', key: k, title: d ? d.title : k }, '*');
        } else {
          window.location.href = 'rakuen-topic.html?key=' + encodeURIComponent(k);
        }
      }
    });

    window.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'brm:theme') applyTheme(d.theme, d.color);
    });
  }

  /* ========================================================================
     MODE 4: RIGHT TOPIC READER FRAME (rakuen-topic.html)
     ======================================================================== */
  function initTopic() {
    loadStoredTheme();
    var host = $('brmTopicHost');
    if (!host) return;

    var params = new URLSearchParams(window.location.search);
    var key = params.get('key') || 'group_475728';
    var map = buildTopicMap();
    var summaryItem = map[key] || (DATA.topics && DATA.topics[0]) || { key: key, kind: 'group', id: '0', title: '话题详情' };
    var detail = (DATA.details && DATA.details[key]) || null;

    if (!detail) {
      var synthBody = summaryItem.customBody
        ? formatUserTextHtml(summaryItem.customBody)
        : '<p>本讨论收录自 Bangumi 超展开实时话题流（<strong>' + esc(summaryItem.parentLabel || 'Bangumi') + '</strong>）。</p>' +
          '<p style="color:var(--muted);">当前话题已在本地启用完整互动阅读视图：你可以继续发表新回复、发起楼中楼子回复、添加表情贴贴、调节楼层滑块或点击上方链接直达对应本地原型页 / 原站完整楼层。</p>';
      detail = {
        key: key,
        title: summaryItem.title,
        parentName: summaryItem.parentLabel || KIND_LABEL[summaryItem.kind] || 'Bangumi',
        parentHref: summaryItem.parentHref || '',
        parentIcon: summaryItem.avatar || '',
        sectionLabel: KIND_LABEL[summaryItem.kind] || '讨论',
        op: {
          id: 'op_' + key,
          authorName: summaryItem.authorName || 'Bangumi 成员',
          authorHandle: summaryItem.authorHandle || '',
          avatar: summaryItem.avatar || '',
          sign: summaryItem.time ? ('发布于 ' + summaryItem.time) : '',
          time: summaryItem.time || '刚刚',
          html: synthBody
        },
        replies: []
      };
    }

    var sortMode = 'asc';
    var openSubFor = null;
    var likeTargetPid = null;

    function getAllReplies() {
      var base = (detail.replies || []).slice();
      var extra = (readJson(STORAGE_REPLIES, {})[key] || []).slice();
      var all = base.concat(extra);
      var subMap = readJson(STORAGE_SUBREPLIES, {});
      var likeMap = readJson(STORAGE_LIKES, {});
      all = all.map(function (r, idx) {
        var copy = Object.assign({}, r);
        var addedSubs = subMap[copy.id] || [];
        copy.subReplies = (copy.subReplies || []).concat(addedSubs);
        copy._likeCount = (likeMap[copy.id] || []).length;
        copy._order = idx;
        return copy;
      });
      if (sortMode === 'desc') {
        all.sort(function (a, b) { return b._order - a._order; });
      } else if (sortMode === 'hot') {
        all.sort(function (a, b) {
          var sa = (a.subReplies.length * 2 + a._likeCount);
          var sb = (b.subReplies.length * 2 + b._likeCount);
          return sb - sa || a._order - b._order;
        });
      }
      return all;
    }

    function renderLikesGrid(pid) {
      var likeMap = readJson(STORAGE_LIKES, {});
      var list = likeMap[pid] || [];
      if (!list.length) return '';
      var counts = {};
      list.forEach(function (emo) { counts[emo] = (counts[emo] || 0) + 1; });
      return (
        '<div class="likes_grid">' +
          Object.keys(counts).map(function (emo) {
            return '<button type="button" class="brm-like-chip is-mine" data-brm-toggle-like="' + esc(pid) + ':' + esc(emo) + '">' + esc(emo) + ' ' + counts[emo] + '</button>';
          }).join('') +
        '</div>'
      );
    }

    function render() {
      var replies = getAllReplies();
      var pHref = resolveLocalHref(detail.parentHref || summaryItem.parentHref, summaryItem.kind, summaryItem.id);
      var oUrl = origTopicUrl(summaryItem);
      var idxList = readJson(STORAGE_INDEX, []);
      var collected = idxList.indexOf(key) !== -1;

      var opHtml = '';
      if (detail.op) {
        var op = detail.op;
        opHtml =
          '<div class="postTopic light_odd clearit" id="post_' + esc(op.id) + '">' +
            '<div class="brm-ava-col">' + avatarBoxHtml(op.avatar, op.authorName, 'brm-ava-48') + '</div>' +
            '<div class="brm-post-main">' +
              '<div class="brm-post-head">' +
                '<div class="brm-post-author">' +
                  '<strong>' + esc(op.authorName) + '</strong>' +
                  (op.sign ? '<span class="brm-post-sign">' + esc(op.sign) + '</span>' : '') +
                '</div>' +
                '<div class="re_info">' +
                  '<span>#1 · ' + esc(op.time) + '</span>' +
                  '<button type="button" class="brm-re-btn like_dropdown" data-like-type="8" data-brm-like-open="' + esc(op.id) + '">💗 贴贴</button>' +
                  '<button type="button" class="brm-re-btn" data-brm-collect-topic="1">' + (collected ? '📁 已收进目录' : '📁 收集') + '</button>' +
                '</div>' +
              '</div>' +
              '<div class="topic_content">' + (op.html || '') + '</div>' +
              renderLikesGrid(op.id) +
            '</div>' +
          '</div>';
      }

      var maxFloor = Math.max(1, replies.length);
      var ctrlBarHtml =
        '<div class="post_content_bottom clearit">' +
          '<div class="post_actions re_info">' +
            '<a href="#ReplyForm" class="brm-re-btn icon comment-count">💬 回复 ' + replies.length + '</a>' +
            '<button type="button" class="brm-re-btn" data-brm-collect-topic="1">' + (collected ? '✓ 已收藏话题' : '📁 收集话题') + '</button>' +
            (detail.op ? '<button type="button" class="brm-re-btn like_dropdown" data-like-type="8" data-brm-like-open="' + esc(detail.op.id) + '">💗 主楼贴贴</button>' : '') +
          '</div>' +
          '<div class="brm-slider-wrap">' +
            '<div id="sliderContainer">' +
              '<span>楼层</span>' +
              '<input type="range" id="slider" min="1" max="' + maxFloor + '" value="1" />' +
              '<span id="brmSliderLabel">1 / ' + maxFloor + '</span>' +
            '</div>' +
            '<div class="brm-sort-pills comment_sort_by">' +
              '<button type="button" class="brm-sort-pill' + (sortMode === 'asc' ? ' is-active' : '') + '" data-brm-sort="asc">顺序</button>' +
              '<button type="button" class="brm-sort-pill' + (sortMode === 'desc' ? ' is-active' : '') + '" data-brm-sort="desc">倒序</button>' +
              '<button type="button" class="brm-sort-pill' + (sortMode === 'hot' ? ' is-active' : '') + '" data-brm-sort="hot">热门</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var repliesHtml =
        '<div id="comment_list">' +
          (replies.length ? replies.map(function (r, idx) {
            var subsHtml = (r.subReplies || []).length
              ? '<div class="topic_sub_reply">' +
                  r.subReplies.map(function (s) {
                    return (
                      '<div class="sub_reply_bg" id="post_' + esc(s.id) + '">' +
                        '<div class="brm-ava-col">' + avatarBoxHtml(s.avatar, s.authorName, 'brm-ava-32') + '</div>' +
                        '<div class="brm-post-main">' +
                          '<div class="brm-post-head">' +
                            '<div class="brm-post-author"><strong>' + esc(s.authorName) + '</strong></div>' +
                            '<div class="re_info"><span>' + esc(s.floor) + ' · ' + esc(s.time) + '</span></div>' +
                          '</div>' +
                          '<div class="reply_content"><div class="message">' + (s.html || '') + '</div></div>' +
                        '</div>' +
                      '</div>'
                    );
                  }).join('') +
                '</div>'
              : '';

            var subFormHtml = openSubFor === r.id
              ? '<form class="brm-sub-inline-form" data-brm-sub-form="' + esc(r.id) + '">' +
                  '<input type="text" placeholder="回复 ' + esc(r.authorName) + '…" required />' +
                  '<button type="submit" class="brm-submit-btn">发送</button>' +
                '</form>'
              : '';

            return (
              '<div class="row_reply" id="post_' + esc(r.id) + '" data-floor-idx="' + (idx + 1) + '">' +
                '<div class="brm-ava-col">' + avatarBoxHtml(r.avatar, r.authorName, 'brm-ava-40') + '</div>' +
                '<div class="brm-post-main">' +
                  '<div class="brm-post-head">' +
                    '<div class="brm-post-author">' +
                      '<strong>' + esc(r.authorName) + '</strong>' +
                      (r.sign ? '<span class="brm-post-sign">' + esc(r.sign) + '</span>' : '') +
                    '</div>' +
                    '<div class="re_info">' +
                      '<span>' + esc(r.floor) + ' · ' + esc(r.time) + '</span>' +
                      '<button type="button" class="brm-re-btn" data-brm-open-sub="' + esc(r.id) + '">↩ 回复</button>' +
                      '<button type="button" class="brm-re-btn like_dropdown" data-like-type="7" data-brm-like-open="' + esc(r.id) + '">💗</button>' +
                      '<button type="button" class="brm-re-btn" data-brm-more-reply="' + esc(r.authorName) + '" title="更多操作">···</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="reply_content"><div class="message">' + (r.html || '') + '</div></div>' +
                  renderLikesGrid(r.id) +
                  subsHtml +
                  subFormHtml +
                '</div>' +
              '</div>'
            );
          }).join('') : '<div style="padding:18px;text-align:center;color:var(--muted);background:var(--surface-solid);border:1px solid var(--line);border-radius:12px;">暂无楼层回复，在下方抢占沙发吧～</div>') +
        '</div>';

      var formHtml =
        '<form id="ReplyForm">' +
          '<div class="brm-bb-bar">' +
            '<button type="button" class="brm-bb-btn" data-brm-bb="b">B 加粗</button>' +
            '<button type="button" class="brm-bb-btn" data-brm-bb="i">I 斜体</button>' +
            '<button type="button" class="brm-bb-btn" data-brm-bb="mask">剧透遮罩</button>' +
            '<button type="button" class="brm-bb-btn" data-brm-bb="smile">(bgm38)</button>' +
          '</div>' +
          '<textarea id="brmReplyTextarea" placeholder="发表你的看法… 支持 [b]加粗[/b] / [mask]剧透[/mask]"></textarea>' +
          '<div class="brm-form-foot">' +
            '<span class="brm-post-sign">当前身份：' + esc(USER_ME.name) + ' · 本地实时落盘</span>' +
            '<button type="submit" class="brm-submit-btn">加上去</button>' +
          '</div>' +
        '</form>';

      host.innerHTML =
        '<div id="pageHeader">' +
          '<div class="brm-topic-crumb">' +
            (detail.parentIcon ? '<img src="' + esc(detail.parentIcon) + '" alt="" referrerpolicy="no-referrer" />' : '') +
            '<a href="' + esc(pHref) + '" target="_top">' + esc(detail.parentName || 'Bangumi') + '</a>' +
            '<span>›</span>' +
            '<span>' + esc(detail.sectionLabel || '讨论') + '</span>' +
          '</div>' +
          '<h1>' + esc(detail.title) + '</h1>' +
          '<div class="brm-topic-actions-top">' +
            '<a href="' + esc(pHref) + '" target="_top" class="brm-tool-btn">前往关联本地页 →</a>' +
            '<a href="' + esc(oUrl) + '" target="_blank" rel="noopener" class="brm-tool-btn">原站讨论 ↗</a>' +
          '</div>' +
        '</div>' +
        opHtml +
        ctrlBarHtml +
        repliesHtml +
        formHtml;

      var slider = $('slider');
      if (slider) {
        slider.addEventListener('input', function () {
          var targetIdx = parseInt(slider.value, 10) || 1;
          var lbl = $('brmSliderLabel');
          if (lbl) lbl.textContent = targetIdx + ' / ' + maxFloor;
          var row = host.querySelector('.row_reply[data-floor-idx="' + targetIdx + '"]');
          if (row) {
            host.querySelectorAll('.row_reply.is-highlight').forEach(function (n) { n.classList.remove('is-highlight'); });
            row.classList.add('is-highlight');
            if (row.scrollIntoView) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    }

    document.addEventListener('click', function (e) {
      var pop = $('brmLikePopover');
      var likeOpen = e.target.closest('[data-brm-like-open]');
      if (likeOpen && pop) {
        e.preventDefault();
        likeTargetPid = likeOpen.getAttribute('data-brm-like-open');
        var rect = likeOpen.getBoundingClientRect ? likeOpen.getBoundingClientRect() : { top: 120, left: 120 };
        pop.innerHTML = EMOJIS.map(function (em) {
          return '<button type="button" data-brm-pick-like="' + em + '">' + em + '</button>';
        }).join('');
        pop.style.top = Math.max(12, rect.top - 44) + 'px';
        pop.style.left = Math.max(12, Math.min(window.innerWidth - 260, rect.left - 80)) + 'px';
        pop.hidden = false;
        return;
      }

      var pickLike = e.target.closest('[data-brm-pick-like]');
      if (pickLike && likeTargetPid) {
        var emo = pickLike.getAttribute('data-brm-pick-like');
        var lk = readJson(STORAGE_LIKES, {});
        if (!lk[likeTargetPid]) lk[likeTargetPid] = [];
        lk[likeTargetPid].push(emo);
        writeJson(STORAGE_LIKES, lk);
        if (pop) pop.hidden = true;
        render();
        toast('已贴贴 ' + emo);
        return;
      }

      if (pop && !pop.hidden && !e.target.closest('#brmLikePopover')) {
        pop.hidden = true;
      }

      var toggleLike = e.target.closest('[data-brm-toggle-like]');
      if (toggleLike) {
        var parts = toggleLike.getAttribute('data-brm-toggle-like').split(':');
        var pid = parts[0], em2 = parts[1];
        var lk2 = readJson(STORAGE_LIKES, {});
        lk2[pid] = (lk2[pid] || []).concat([em2]);
        writeJson(STORAGE_LIKES, lk2);
        render();
        return;
      }

      var sortBtn = e.target.closest('[data-brm-sort]');
      if (sortBtn) {
        sortMode = sortBtn.getAttribute('data-brm-sort') || 'asc';
        render();
        return;
      }

      var subBtn = e.target.closest('[data-brm-open-sub]');
      if (subBtn) {
        var rid = subBtn.getAttribute('data-brm-open-sub');
        openSubFor = openSubFor === rid ? null : rid;
        render();
        return;
      }

      var colBtn = e.target.closest('[data-brm-collect-topic]');
      if (colBtn) {
        var idxList = readJson(STORAGE_INDEX, []);
        var pos = idxList.indexOf(key);
        if (pos === -1) {
          idxList.push(key);
          toast('已将本话题收集进我的目录');
        } else {
          idxList.splice(pos, 1);
          toast('已从目录移除该话题');
        }
        writeJson(STORAGE_INDEX, idxList);
        render();
        return;
      }

      var moreBtn = e.target.closest('[data-brm-more-reply]');
      if (moreBtn) {
        toast('已对「' + moreBtn.getAttribute('data-brm-more-reply') + '」提供举报 / 绝交快捷菜单（原型演示）');
        return;
      }

      var bbBtn = e.target.closest('[data-brm-bb]');
      if (bbBtn) {
        var ta = $('brmReplyTextarea');
        if (!ta) return;
        var tag = bbBtn.getAttribute('data-brm-bb');
        if (tag === 'smile') ta.value += ' (bgm38) ';
        else ta.value += '[' + tag + ']内容[/' + tag + ']';
        ta.focus();
      }
    });

    document.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'ReplyForm') {
        e.preventDefault();
        var ta = $('brmReplyTextarea');
        var val = ta ? ta.value.trim() : '';
        if (!val) return;
        var store = readJson(STORAGE_REPLIES, {});
        if (!store[key]) store[key] = [];
        var floorNum = (detail.replies ? detail.replies.length : 0) + store[key].length + 2;
        store[key].push({
          id: 'local_' + Date.now(),
          floor: '#' + floorNum,
          time: '刚刚',
          authorName: USER_ME.name,
          authorHandle: USER_ME.handle,
          avatar: USER_ME.avatar,
          sign: USER_ME.sign,
          html: formatUserTextHtml(val),
          subReplies: []
        });
        writeJson(STORAGE_REPLIES, store);
        if (window.parent && window.parent !== window) {
          try { window.parent.postMessage({ type: 'brm:reply-added', key: key }, '*'); } catch (err) {}
        }
        render();
        toast('已发表回复 #' + floorNum);
        return;
      }

      var subForm = e.target && e.target.closest('form[data-brm-sub-form]');
      if (subForm) {
        e.preventDefault();
        var rid = subForm.getAttribute('data-brm-sub-form');
        var inp = subForm.querySelector('input');
        var txt = inp ? inp.value.trim() : '';
        if (!txt) return;
        var subStore = readJson(STORAGE_SUBREPLIES, {});
        if (!subStore[rid]) subStore[rid] = [];
        subStore[rid].push({
          id: 'sub_' + Date.now(),
          floor: '#' + (subStore[rid].length + 1),
          time: '刚刚',
          authorName: USER_ME.name,
          authorHandle: USER_ME.handle,
          avatar: USER_ME.avatar,
          html: formatUserTextHtml(txt)
        });
        writeJson(STORAGE_SUBREPLIES, subStore);
        openSubFor = null;
        render();
        toast('已发表楼中楼回复');
      }
    });

    window.addEventListener('message', function (ev) {
      var d = ev.data || {};
      if (d.type === 'brm:theme') applyTheme(d.theme, d.color);
    });

    render();
  }

  /* ========================================================================
     BOOTSTRAP BY FRAME ROLE
     ======================================================================== */
  var frameRole = document.body ? document.body.getAttribute('data-rakuen-frame') : '';
  if (frameRole === 'outer') initOuter();
  else if (frameRole === 'topiclist') initTopiclist();
  else if (frameRole === 'home') initHome();
  else if (frameRole === 'topic') initTopic();
})();
