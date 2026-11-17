/* ==========================================================================
   Bangumi Redesign - Page 27: 电波提醒与站内短信 (notify.html)
   Routes:
   - ?tab=notify&filter=all|unread|reply|like|mention
   - ?tab=inbox&thread=pm_201
   - ?tab=outbox&thread=pm_301
   - ?tab=compose&to=sai&title=...
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_NOTIFY_DATA || {
    meta: {},
    contacts: [],
    notifications: [],
    inbox: [],
    outbox: []
  };

  var STORE_KEY = 'bgm_notify_store_v1';
  var BADGE_KEY = 'bgm_notify_state_v1';

  var state = {
    tab: 'notify', // notify | inbox | outbox | compose
    filter: 'all', // all | unread | reply | like | mention
    q: '',
    threadId: '',
    selectedIds: {},
    composeTo: '',
    composeTitle: '',
    composeBody: '',
    composePreview: false
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
    }, 2500);
  }

  function defaultStore() {
    return {
      notifications: JSON.parse(JSON.stringify(DATA.notifications || [])),
      inbox: JSON.parse(JSON.stringify(DATA.inbox || [])),
      outbox: JSON.parse(JSON.stringify(DATA.outbox || []))
    };
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notifications) && Array.isArray(parsed.inbox) && Array.isArray(parsed.outbox)) {
          return parsed;
        }
      }
    } catch (e) {}
    return defaultStore();
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      var unreadNotify = store.notifications.filter(function (n) { return !!n.unread; }).length;
      var unreadPm = store.inbox.filter(function (m) { return !!m.unread; }).length;
      localStorage.setItem(BADGE_KEY, JSON.stringify({
        unreadNotify: unreadNotify,
        unreadPm: unreadPm
      }));
      if (window.BgmShell && typeof window.BgmShell.syncNotifyBadges === 'function') {
        window.BgmShell.syncNotifyBadges();
      }
    } catch (e) {}
  }

  function formatBbcode(text) {
    var safe = esc(text || '');
    safe = safe.replace(/\[br\]/gi, '<br />').replace(/\n/g, '<br />');
    safe = safe.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');
    safe = safe.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>');
    safe = safe.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent);">$2</a>');
    safe = safe.replace(/\[mask\](.*?)\[\/mask\]/gi, '<span class="bgm_spoiler">$1</span>');
    return safe;
  }

  function readUrlParams() {
    var sp = new URLSearchParams(window.location.search || '');
    var tab = (sp.get('tab') || 'notify').trim();
    if (['notify', 'inbox', 'outbox', 'compose'].indexOf(tab) === -1) tab = 'notify';
    state.tab = tab;
    state.filter = (sp.get('filter') || 'all').trim();
    state.threadId = (sp.get('thread') || '').trim();
    var to = (sp.get('to') || '').trim();
    if (to) state.composeTo = to;
    var title = (sp.get('title') || '').trim();
    if (title) state.composeTitle = title;
  }

  function syncUrl(push) {
    var sp = new URLSearchParams();
    if (state.tab !== 'notify') sp.set('tab', state.tab);
    if (state.tab === 'notify' && state.filter && state.filter !== 'all') sp.set('filter', state.filter);
    if ((state.tab === 'inbox' || state.tab === 'outbox') && state.threadId) sp.set('thread', state.threadId);
    if (state.tab === 'compose' && state.composeTo) sp.set('to', state.composeTo);
    var qs = sp.toString();
    var nextUrl = window.location.pathname + (qs ? '?' + qs : '');
    try {
      if (push) window.history.pushState({}, '', nextUrl);
      else window.history.replaceState({}, '', nextUrl);
    } catch (e) {}
  }

  function updateHeader(store) {
    var unreadNotify = store.notifications.filter(function (n) { return !!n.unread; }).length;
    var unreadPm = store.inbox.filter(function (m) { return !!m.unread; }).length;
    var outCount = store.outbox.length;

    var iconEl = $('bntHeaderIcon');
    var titleEl = $('bntHeaderTitle');
    var subEl = $('bntHeaderSub');
    if (state.tab === 'notify') {
      if (iconEl) iconEl.textContent = '🔔';
      if (titleEl) titleEl.textContent = '电波提醒 (/notify/all)';
      if (subEl) subEl.innerHTML = '<span>共 <strong>' + store.notifications.length + '</strong> 条通知 · <strong>' + unreadNotify + '</strong> 条未读</span>';
    } else if (state.tab === 'inbox') {
      if (iconEl) iconEl.textContent = '📥';
      if (titleEl) titleEl.textContent = '站内短信 · 收件箱 (/pm)';
      if (subEl) subEl.innerHTML = '<span>共 <strong>' + store.inbox.length + '</strong> 封私信 · <strong>' + unreadPm + '</strong> 封未读</span>';
    } else if (state.tab === 'outbox') {
      if (iconEl) iconEl.textContent = '📤';
      if (titleEl) titleEl.textContent = '站内短信 · 已发送 (/pm/outbox.chii)';
      if (subEl) subEl.innerHTML = '<span>已发送 <strong>' + outCount + '</strong> 封私信</span>';
    } else {
      if (iconEl) iconEl.textContent = '✍️';
      if (titleEl) titleEl.textContent = '撰写新短信 (/pm/compose.chii)';
      if (subEl) subEl.innerHTML = '<span>支持快捷选择好友收件人与 BBCode 排版</span>';
    }

    var bNotify = $('bntBadgeNotify');
    var bPm = $('bntBadgePm');
    var bOut = $('bntBadgeOutbox');
    if (bNotify) {
      bNotify.textContent = String(unreadNotify);
      bNotify.classList.toggle('has-unread', unreadNotify > 0);
    }
    if (bPm) {
      bPm.textContent = String(unreadPm);
      bPm.classList.toggle('has-unread', unreadPm > 0);
    }
    if (bOut) bOut.textContent = String(outCount);

    var nav = $('bntNavTabs');
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('a[data-tab]'), function (a) {
        var isAct = a.getAttribute('data-tab') === state.tab;
        a.classList.toggle('focus', isAct);
        a.classList.toggle('selected', isAct);
      });
    }
  }

  function renderNotifyTab(store) {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var all = store.notifications;
    var unreadCnt = all.filter(function (n) { return !!n.unread; }).length;
    var filtered = all.filter(function (n) {
      if (state.filter === 'unread' && !n.unread) return false;
      if (['reply', 'like', 'mention'].indexOf(state.filter) !== -1 && n.category !== state.filter) return false;
      if (state.q) {
        var ql = state.q.toLowerCase();
        var hay = (n.user + ' ' + n.action + ' ' + n.targetTitle + ' ' + n.snippet).toLowerCase();
        if (hay.indexOf(ql) === -1) return false;
      }
      return true;
    });

    var filterPills = [
      { k: 'all', label: '全部 (' + all.length + ')' },
      { k: 'unread', label: '未读 (' + unreadCnt + ')' },
      { k: 'reply', label: '回复与讨论' },
      { k: 'like', label: '贴贴互动' },
      { k: 'mention', label: '@提及与维基' }
    ].map(function (f) {
      return '<button type="button" class="bnt-pill' + (state.filter === f.k ? ' active' : '') + '" data-act="set-filter" data-filter="' + f.k + '">' + esc(f.label) + '</button>';
    }).join('');

    var rowsHtml = filtered.length
      ? filtered.map(function (n) {
          var uHref = (n.uid === 'sai' || n.uid === '553488') ? ('user.html?uid=' + esc(n.uid)) : 'user.html?uid=553488';
          return (
            '<div id="notify_' + esc(n.id) + '" class="row_reply notify_item bnt-notify-row' + (n.unread ? ' is-unread' : '') + '">' +
              '<a href="' + esc(uHref) + '"><img src="' + esc(n.avatar) + '" alt="' + esc(n.user) + '" class="bnt-avatar-48" referrerpolicy="no-referrer" /></a>' +
              '<div>' +
                '<div class="bnt-notify-head">' +
                  (n.unread ? '<span class="bnt-unread-dot" title="未读提醒"></span>' : '') +
                  '<a href="' + esc(uHref) + '" style="font-weight:800;color:var(--bnt-ink);text-decoration:none;">' + esc(n.user) + '</a>' +
                  '<span>' + esc(n.action) + '</span>' +
                '</div>' +
                '<a href="' + esc(n.href || '#') + '" class="bnt-notify-target" data-act="open-notify-target" data-nid="' + esc(n.id) + '">' + esc(n.targetTitle) + '</a>' +
                (n.snippet ? '<div class="bnt-notify-snippet">' + esc(n.snippet) + '</div>' : '') +
                '<div class="bnt-notify-time">' + esc(n.time) + '</div>' +
              '</div>' +
              '<div class="bnt-notify-ops">' +
                '<button type="button" class="bnt-pill" data-act="toggle-notify-read" data-nid="' + esc(n.id) + '">' + (n.unread ? '标为已读' : '标未读') + '</button>' +
                '<a href="javascript:void(0)" class="erase_notify bnt-erase-btn" data-act="erase-notify" data-nid="' + esc(n.id) + '" title="清除此条提醒">×</a>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="bnt-empty">暂无符合条件的电波提醒 🎉</div>';

    colA.innerHTML =
      '<section class="bnt-card">' +
        '<div class="bnt-toolbar">' +
          '<div class="bnt-pills">' + filterPills + '</div>' +
          '<input type="search" id="bntSearchInput" class="bnt-search-input" value="' + esc(state.q) + '" placeholder="过滤提醒内容或触发者..." />' +
        '</div>' +
        '<div id="comment_list" class="bnt-notify-list">' + rowsHtml + '</div>' +
      '</section>';

    colB.innerHTML =
      '<div class="bnt-side-panel">' +
        '<h2><span>/ 提醒管理操作</span></h2>' +
        '<div class="bnt-side-actions">' +
          '<a href="javascript:void(0)" class="chiiBtn is-primary" data-act="mark-all-read">✓ 全部标记已读</a>' +
          '<a href="javascript:void(0)" class="chiiBtn" data-act="clear-read-notifies">🧹 清空已读提醒</a>' +
          '<a href="javascript:void(0)" class="chiiBtn" data-act="reset-demo">↺ 恢复初始提醒样本</a>' +
        '</div>' +
      '</div>' +
      '<div class="bnt-side-panel">' +
        '<h2><span>/ 消息直达导航</span></h2>' +
        '<ul class="bnt-side-nav">' +
          '<li><a href="/pm/inbox.chii" data-act="switch-tab" data-tab="inbox"><span>← 返回收件箱 (/pm)</span><span>' + store.inbox.length + '</span></a></li>' +
          '<li><a href="/pm/outbox.chii" data-act="switch-tab" data-tab="outbox"><span>📤 查看已发送</span><span>' + store.outbox.length + '</span></a></li>' +
          '<li><a href="/pm/compose.chii" data-act="switch-tab" data-tab="compose"><span>✍️ 撰写新短信</span><span>+</span></a></li>' +
        '</ul>' +
      '</div>';
  }

  function renderPmSidebar(store) {
    var unreadPm = store.inbox.filter(function (m) { return !!m.unread; }).length;
    var contactLinks = (DATA.contacts || []).slice(0, 6).map(function (c) {
      return (
        '<li><a href="/pm/compose/' + esc(c.uid) + '.chii" data-act="quick-compose" data-uid="' + esc(c.uid) + '">' +
          '<span>✉️ ' + esc(c.name) + '</span>' +
          '<small style="color:var(--bnt-muted);">' + esc(c.handle) + '</small>' +
        '</a></li>'
      );
    }).join('');

    return (
      '<div class="bnt-side-panel">' +
        '<h2><span>/ 站内短信导航</span></h2>' +
        '<ul class="bnt-side-nav">' +
          '<li><a href="/pm/inbox.chii" class="' + (state.tab === 'inbox' ? 'is-active' : '') + '" data-act="switch-tab" data-tab="inbox"><span>📥 收件箱 (/pm/inbox.chii)</span><span>' + unreadPm + ' 未读</span></a></li>' +
          '<li><a href="/pm/outbox.chii" class="' + (state.tab === 'outbox' ? 'is-active' : '') + '" data-act="switch-tab" data-tab="outbox"><span>📤 已发送 (/pm/outbox.chii)</span><span>' + store.outbox.length + '</span></a></li>' +
          '<li><a href="/pm/compose.chii" class="' + (state.tab === 'compose' ? 'is-active' : '') + '" data-act="switch-tab" data-tab="compose"><span>✍️ 撰写新短信 (/pm/compose.chii)</span><span>+</span></a></li>' +
          '<li><a href="/notify/all" data-act="switch-tab" data-tab="notify"><span>🔔 电波提醒 (/notify/all)</span><span>' + store.notifications.filter(function (n) { return n.unread; }).length + '</span></a></li>' +
        '</ul>' +
      '</div>' +
      '<div class="bnt-side-panel">' +
        '<h2><span>/ 常用联系人快捷写信</span></h2>' +
        '<ul class="bnt-side-nav">' + contactLinks + '</ul>' +
      '</div>'
    );
  }

  function renderPmBoxTab(store, folder) {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var rawList = folder === 'outbox' ? store.outbox : store.inbox;
    var list = rawList.filter(function (m) {
      if (!state.q) return true;
      var ql = state.q.toLowerCase();
      return (m.title + ' ' + m.peerName + ' ' + m.snippet).toLowerCase().indexOf(ql) !== -1;
    });

    var allChecked = list.length > 0 && list.every(function (m) { return !!state.selectedIds[m.id]; });

    var rowsHtml = list.length
      ? list.map(function (m) {
          var checked = !!state.selectedIds[m.id];
          return (
            '<div class="bnt-pm-row' + (m.unread ? ' is-unread' : '') + (checked ? ' is-selected' : '') + '" data-pm-id="' + esc(m.id) + '">' +
              '<input type="checkbox" data-act="toggle-pm-check" data-pmid="' + esc(m.id) + '"' + (checked ? ' checked' : '') + ' aria-label="选中私信" />' +
              '<img src="' + esc(m.peerAvatar) + '" alt="' + esc(m.peerName) + '" class="bnt-avatar-44" referrerpolicy="no-referrer" />' +
              '<div style="min-width:0;">' +
                '<a href="javascript:void(0)" class="bnt-pm-title" data-act="open-thread" data-pmid="' + esc(m.id) + '">' +
                  (m.unread ? '<span class="bnt-unread-dot"></span>' : '') +
                  '<span>' + esc(m.title) + '</span>' +
                  '<small style="color:var(--bnt-muted);font-weight:600;">(' + (m.messages || []).length + ')</small>' +
                '</a>' +
                '<div class="bnt-pm-snippet">' + esc(folder === 'outbox' ? ('发送给 ' + m.peerName) : m.peerName) + '：' + esc(m.snippet) + '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-size:11.5px;color:var(--bnt-muted);white-space:nowrap;">' + esc(m.time) + '</span>' +
                '<button type="button" class="bnt-pill" data-act="open-thread" data-pmid="' + esc(m.id) + '">阅读</button>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="bnt-empty">该信箱暂无站内短信。点击右上角「撰写新短信」开始对话吧！</div>';

    var activeThread = state.threadId
      ? rawList.find(function (m) { return m.id === state.threadId; })
      : (list[0] || null);

    var threadHtml = '';
    if (activeThread) {
      var msgsHtml = (activeThread.messages || []).map(function (msg) {
        var isMine = String(msg.senderUid) === '553488';
        return (
          '<div class="bnt-msg-bubble' + (isMine ? ' is-mine' : '') + '">' +
            '<img src="' + esc(msg.senderAvatar) + '" alt="' + esc(msg.senderName) + '" referrerpolicy="no-referrer" />' +
            '<div>' +
              '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;">' +
                '<strong>' + esc(msg.senderName) + '</strong>' +
                '<span style="color:var(--bnt-muted);">' + esc(msg.time) + '</span>' +
              '</div>' +
              '<div class="bnt-msg-body">' + formatBbcode(msg.body) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      threadHtml =
        '<div class="bnt-thread-card" id="bntThreadPane">' +
          '<div class="bnt-thread-head">' +
            '<h3 style="margin:0;font-size:16px;color:var(--bnt-ink);">💬 ' + esc(activeThread.title) + '</h3>' +
            '<button type="button" class="bnt-pill" data-act="quick-compose" data-uid="' + esc(activeThread.peerUid) + '" data-title="' + esc('Re: ' + activeThread.title) + '">用新邮件回复</button>' +
          '</div>' +
          '<div class="bnt-thread-msgs">' + msgsHtml + '</div>' +
          '<form id="bntThreadReplyForm" data-pmid="' + esc(activeThread.id) + '">' +
            '<textarea id="bntThreadReplyInput" class="bnt-textarea" style="min-height:84px;" placeholder="快速回复给 ' + esc(activeThread.peerName) + '..."></textarea>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:8px;">' +
              '<input type="submit" class="inputBtn is-primary" value="发送回复" />' +
            '</div>' +
          '</form>' +
        '</div>';
    }

    colA.innerHTML =
      '<section class="bnt-card">' +
        '<div class="bnt-toolbar">' +
          '<input type="search" id="bntSearchInput" class="bnt-search-input" value="' + esc(state.q) + '" placeholder="搜索短信标题、发件人或内容..." />' +
          '<a href="/pm/compose.chii" class="chiiBtn is-primary" data-act="switch-tab" data-tab="compose">✍️ 撰写新短信</a>' +
        '</div>' +
        '<form id="pmListForm">' +
          '<div class="bnt-pm-bulkbar">' +
            '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;cursor:pointer;">' +
              '<input type="checkbox" id="bntSelectAll"' + (allChecked ? ' checked' : '') + ' data-act="toggle-select-all" /> 全选本页' +
            '</label>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<button type="button" class="chiiBtn" data-act="pm-mark-read">标记已读</button>' +
              '<input type="button" class="inputBtn is-danger" value="删除选中" data-act="pm-bulk-delete" />' +
            '</div>' +
          '</div>' +
          '<div class="bnt-pm-list">' + rowsHtml + '</div>' +
        '</form>' +
        threadHtml +
      '</section>';

    colB.innerHTML = renderPmSidebar(store);
  }

  function renderComposeTab(store) {
    var colA = $('columnA');
    var colB = $('columnB');
    if (!colA || !colB) return;

    var chips = (DATA.contacts || []).slice(0, 6).map(function (c) {
      return (
        '<button type="button" class="bnt-contact-chip" data-act="pick-receiver" data-uid="' + esc(c.uid) + '">' +
          '<img src="' + esc(c.avatar) + '" alt="" referrerpolicy="no-referrer" />' +
          '<span>' + esc(c.name) + ' (' + esc(c.uid) + ')</span>' +
        '</button>'
      );
    }).join('');

    var previewHtml = state.composePreview
      ? '<div class="bnt-notify-snippet" style="margin-top:8px;"><strong>预览：</strong><br />' + formatBbcode(state.composeBody || '（暂无正文）') + '</div>'
      : '';

    colA.innerHTML =
      '<section class="bnt-card">' +
        '<h2 style="margin:0 0 14px;font-size:17px;color:var(--bnt-ink);">✍️ 撰写站内短信 (/pm/compose.chii)</h2>' +
        '<form id="pmComposeForm" class="bnt-compose-form">' +
          '<div class="bnt-field">' +
            '<label for="bntMsgReceivers">收件人 UID / 用户名（支持快速点选好友）</label>' +
            '<input type="text" id="bntMsgReceivers" name="msg_receivers" class="bnt-input" value="' + esc(state.composeTo) + '" required placeholder="例如：sai、104848 或好友昵称" />' +
            '<div class="bnt-contact-chips">' + chips + '</div>' +
          '</div>' +
          '<div class="bnt-field">' +
            '<label for="bntMsgTitle">短信标题</label>' +
            '<input type="text" id="bntMsgTitle" name="msg_title" class="bnt-input" value="' + esc(state.composeTitle) + '" required maxlength="100" placeholder="输入简明清晰的站内信标题..." />' +
          '</div>' +
          '<div class="bnt-field">' +
            '<label for="bntMsgContent">正文内容（支持 BBCode）</label>' +
            '<div class="bnt-bb-bar">' +
              '<button type="button" class="bnt-pill" data-act="bb-insert" data-tag="b">B 加粗</button>' +
              '<button type="button" class="bnt-pill" data-act="bb-insert" data-tag="i">I 斜体</button>' +
              '<button type="button" class="bnt-pill" data-act="bb-insert" data-tag="url">🔗 链接</button>' +
              '<button type="button" class="bnt-pill" data-act="bb-insert" data-tag="mask">🕶️ 剧透</button>' +
              '<button type="button" class="bnt-pill" data-act="toggle-preview">' + (state.composePreview ? '✏️ 继续编辑' : '👁️ 预览正文') + '</button>' +
            '</div>' +
            '<textarea id="bntMsgContent" name="msg_content" class="bnt-textarea" required placeholder="输入站内私信内容...">' + esc(state.composeBody) + '</textarea>' +
            previewHtml +
          '</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:10px;">' +
            '<button type="button" class="chiiBtn" data-act="switch-tab" data-tab="inbox">返回收件箱</button>' +
            '<input type="submit" class="inputBtn is-primary" value="发送" />' +
          '</div>' +
        '</form>' +
      '</section>';

    colB.innerHTML = renderPmSidebar(store);
  }

  function renderAll() {
    var store = readStore();
    updateHeader(store);
    if (state.tab === 'notify') renderNotifyTab(store);
    else if (state.tab === 'inbox') renderPmBoxTab(store, 'inbox');
    else if (state.tab === 'outbox') renderPmBoxTab(store, 'outbox');
    else if (state.tab === 'compose') renderComposeTab(store);
    writeStore(store);
    syncUrl(false);
  }

  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act');
      var store = readStore();

      if (act === 'switch-tab') {
        ev.preventDefault();
        state.tab = el.getAttribute('data-tab') || 'notify';
        state.threadId = '';
        state.selectedIds = {};
        syncUrl(true);
        renderAll();
      } else if (act === 'set-filter') {
        ev.preventDefault();
        state.filter = el.getAttribute('data-filter') || 'all';
        syncUrl(true);
        renderAll();
      } else if (act === 'open-notify-target') {
        var nidOpen = el.getAttribute('data-nid');
        store.notifications.forEach(function (n) { if (n.id === nidOpen) n.unread = false; });
        writeStore(store);
      } else if (act === 'toggle-notify-read') {
        ev.preventDefault();
        var nid = el.getAttribute('data-nid');
        store.notifications.forEach(function (n) { if (n.id === nid) n.unread = !n.unread; });
        writeStore(store);
        renderAll();
      } else if (act === 'erase-notify') {
        ev.preventDefault();
        var nidE = el.getAttribute('data-nid');
        store.notifications = store.notifications.filter(function (n) { return n.id !== nidE; });
        writeStore(store);
        showToast('已清除该条提醒');
        renderAll();
      } else if (act === 'mark-all-read') {
        ev.preventDefault();
        store.notifications.forEach(function (n) { n.unread = false; });
        writeStore(store);
        showToast('已将全部电波提醒标记为已读');
        renderAll();
      } else if (act === 'clear-read-notifies') {
        ev.preventDefault();
        store.notifications = store.notifications.filter(function (n) { return !!n.unread; });
        writeStore(store);
        showToast('已清空所有已读提醒');
        renderAll();
      } else if (act === 'reset-demo') {
        ev.preventDefault();
        var fresh = defaultStore();
        writeStore(fresh);
        showToast('已恢复电波提醒与短信初始演示数据');
        renderAll();
      } else if (act === 'toggle-pm-check') {
        var pmid = el.getAttribute('data-pmid');
        if (el.checked) state.selectedIds[pmid] = true;
        else delete state.selectedIds[pmid];
        renderAll();
      } else if (act === 'toggle-select-all') {
        var list = state.tab === 'outbox' ? store.outbox : store.inbox;
        var checked = !!el.checked;
        state.selectedIds = {};
        if (checked) list.forEach(function (m) { state.selectedIds[m.id] = true; });
        renderAll();
      } else if (act === 'pm-mark-read') {
        ev.preventDefault();
        var selKeys = Object.keys(state.selectedIds);
        store.inbox.forEach(function (m) {
          if (!selKeys.length || state.selectedIds[m.id]) m.unread = false;
        });
        writeStore(store);
        showToast(selKeys.length ? '已将选中私信标记为已读' : '已将收件箱全部标记为已读');
        renderAll();
      } else if (act === 'pm-bulk-delete') {
        ev.preventDefault();
        var delKeys = Object.keys(state.selectedIds);
        if (!delKeys.length) {
          showToast('请先勾选要删除的站内短信');
          return;
        }
        if (state.tab === 'outbox') {
          store.outbox = store.outbox.filter(function (m) { return !state.selectedIds[m.id]; });
        } else {
          store.inbox = store.inbox.filter(function (m) { return !state.selectedIds[m.id]; });
        }
        state.selectedIds = {};
        state.threadId = '';
        writeStore(store);
        showToast('已批量删除 ' + delKeys.length + ' 封短信');
        renderAll();
      } else if (act === 'open-thread') {
        ev.preventDefault();
        var tid = el.getAttribute('data-pmid');
        state.threadId = tid;
        store.inbox.forEach(function (m) { if (m.id === tid) m.unread = false; });
        writeStore(store);
        syncUrl(true);
        renderAll();
      } else if (act === 'quick-compose') {
        ev.preventDefault();
        state.tab = 'compose';
        state.composeTo = el.getAttribute('data-uid') || '';
        state.composeTitle = el.getAttribute('data-title') || '';
        syncUrl(true);
        renderAll();
      } else if (act === 'pick-receiver') {
        ev.preventDefault();
        state.composeTo = el.getAttribute('data-uid') || '';
        var inp = $('bntMsgReceivers');
        if (inp) inp.value = state.composeTo;
      } else if (act === 'bb-insert') {
        ev.preventDefault();
        var tag = el.getAttribute('data-tag') || 'b';
        var ta = $('bntMsgContent');
        var snippet = tag === 'url' ? '[url=https://bgm.tv]Bangumi[/url]' : ('[' + tag + ']文本[/' + tag + ']');
        if (ta) {
          ta.value = (ta.value ? ta.value + ' ' : '') + snippet;
          state.composeBody = ta.value;
        }
      } else if (act === 'toggle-preview') {
        ev.preventDefault();
        var ta2 = $('bntMsgContent');
        if (ta2) state.composeBody = ta2.value;
        var ri = $('bntMsgReceivers'); if (ri) state.composeTo = ri.value;
        var ti = $('bntMsgTitle'); if (ti) state.composeTitle = ti.value;
        state.composePreview = !state.composePreview;
        renderAll();
      }
    });

    document.addEventListener('input', function (ev) {
      if (ev.target.id === 'bntSearchInput') {
        state.q = ev.target.value;
        var store = readStore();
        if (state.tab === 'notify') renderNotifyTab(store);
        else if (state.tab === 'inbox') renderPmBoxTab(store, 'inbox');
        else if (state.tab === 'outbox') renderPmBoxTab(store, 'outbox');
      }
    });

    document.addEventListener('submit', function (ev) {
      var store = readStore();
      if (ev.target.id === 'pmComposeForm') {
        ev.preventDefault();
        var toRaw = (($('bntMsgReceivers') || {}).value || '').trim();
        var titleRaw = (($('bntMsgTitle') || {}).value || '').trim();
        var bodyRaw = (($('bntMsgContent') || {}).value || '').trim();
        if (!toRaw || !titleRaw || !bodyRaw) return;
        var peer = (DATA.contacts || []).find(function (c) {
          return c.uid === toRaw || c.name === toRaw || c.handle === toRaw;
        }) || {
          uid: toRaw,
          name: toRaw,
          avatar: 'https://lain.bgm.tv/pic/user/l/icon.jpg'
        };
        var newPmId = 'pm_' + Date.now();
        store.outbox.unshift({
          id: newPmId,
          folder: 'outbox',
          unread: false,
          peerUid: peer.uid,
          peerName: peer.name,
          peerAvatar: peer.avatar,
          title: titleRaw,
          time: '刚刚',
          snippet: bodyRaw.slice(0, 80),
          messages: [{
            id: 'msg_' + Date.now(),
            senderUid: '553488',
            senderName: '少年游',
            senderAvatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
            time: '刚刚',
            body: bodyRaw
          }]
        });
        state.composeTo = '';
        state.composeTitle = '';
        state.composeBody = '';
        state.composePreview = false;
        state.tab = 'outbox';
        state.threadId = newPmId;
        writeStore(store);
        syncUrl(true);
        showToast('站内短信已发送至 ' + peer.name + '！');
        renderAll();
      } else if (ev.target.id === 'bntThreadReplyForm') {
        ev.preventDefault();
        var pmid = ev.target.getAttribute('data-pmid');
        var rInp = $('bntThreadReplyInput');
        var rTxt = rInp ? rInp.value.trim() : '';
        if (!rTxt) return;
        var list = state.tab === 'outbox' ? store.outbox : store.inbox;
        var target = list.find(function (m) { return m.id === pmid; });
        if (!target) return;
        target.messages.push({
          id: 'msg_' + Date.now(),
          senderUid: '553488',
          senderName: '少年游',
          senderAvatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          time: '刚刚',
          body: rTxt
        });
        target.snippet = rTxt.slice(0, 80);
        target.time = '刚刚';
        writeStore(store);
        showToast('已发送私信回复');
        renderAll();
      }
    });

    window.addEventListener('popstate', function () {
      readUrlParams();
      renderAll();
    });
  }

  readUrlParams();
  renderAll();
  bindEvents();
})();
