/* ============================================================================
 * Bangumi Editorial Liquid Glass — Page 28 Controller (js/bangumi-settings.js)
 * Routes: /settings/* & /settings/gadgets (settings.html)
 * ============================================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'bgm_settings_state_v1';
  var VALID_TABS = [
    'profile',
    'network_services',
    'privacy',
    'email',
    'password',
    'passkeys',
    'gadgets',
    'ukagaka',
    'img_chart',
    'homepage'
  ];

  function cloneData(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj || {};
    }
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    var box = document.getElementById('toastContainer');
    if (!box) return;
    var t = document.createElement('div');
    t.className = 'glass-toast';
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () {
      t.classList.add('show');
    }, 16);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 280);
    }, 2900);
  }

  function loadState() {
    var base = cloneData(window.BANGUMI_SETTINGS_DATA || {});
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          if (saved.profile) base.profile = Object.assign({}, base.profile || {}, saved.profile);
          if (Array.isArray(saved.networkServices)) base.networkServices = saved.networkServices;
          if (saved.privacy) base.privacy = Object.assign({}, base.privacy || {}, saved.privacy);
          if (saved.email) base.email = Object.assign({}, base.email || {}, saved.email);
          if (saved.security) base.security = Object.assign({}, base.security || {}, saved.security);
          if (Array.isArray(saved.gadgets) && Array.isArray(base.gadgets)) {
            var map = {};
            saved.gadgets.forEach(function (g) {
              if (g && g.id) map[g.id] = g;
            });
            base.gadgets = base.gadgets.map(function (g) {
              if (map[g.id]) {
                return Object.assign({}, g, {
                  enabled: !!map[g.id].enabled,
                  installs: map[g.id].installs || g.installs
                });
              }
              return g;
            });
            saved.gadgets.forEach(function (g) {
              if (g && g.id && !base.gadgets.some(function (bg) { return bg.id === g.id; })) {
                base.gadgets.unshift(g);
              }
            });
          }
          if (saved.ukagaka) base.ukagaka = Object.assign({}, base.ukagaka || {}, saved.ukagaka);
          if (saved.imgChart) base.imgChart = Object.assign({}, base.imgChart || {}, saved.imgChart);
          if (saved.homepage) base.homepage = Object.assign({}, base.homepage || {}, saved.homepage);
        }
      }
    } catch (e) {}
    return base;
  }

  var state = loadState();
  var activeTab = 'profile';
  var gadgetCat = 'all';
  var gadgetQuery = '';

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profile: state.profile,
          networkServices: state.networkServices,
          privacy: state.privacy,
          email: state.email,
          security: state.security,
          gadgets: state.gadgets,
          ukagaka: state.ukagaka,
          imgChart: state.imgChart,
          homepage: state.homepage
        })
      );
    } catch (e) {}
    if (window.BgmShell && typeof window.BgmShell.syncGadgets === 'function') {
      window.BgmShell.syncGadgets();
    }
  }

  function getQueryParam(key) {
    var s = (window.location && window.location.search) || '';
    var m = new RegExp('[?&]' + key + '=([^&#]*)').exec(s);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function parseUrlParams() {
    try {
      var t = getQueryParam('tab') || getQueryParam('mode') || '';
      if (VALID_TABS.indexOf(t) !== -1) {
        activeTab = t;
      }
      var cat = getQueryParam('cat') || '';
      if (cat) gadgetCat = cat;
      var q = getQueryParam('q') || '';
      if (q) gadgetQuery = q;
    } catch (e) {}
  }

  function syncUrlParams() {
    try {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      if (activeTab === 'gadgets' && gadgetCat && gadgetCat !== 'all') {
        url.searchParams.set('cat', gadgetCat);
      } else {
        url.searchParams.delete('cat');
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    } catch (e) {}
  }

  function syncHeroAndCounters() {
    var p = state.profile || {};
    var nickEl = document.getElementById('bstHeroNickname');
    if (nickEl && p.nickname) nickEl.textContent = p.nickname;
    var uidEl = document.getElementById('bstHeroUid');
    if (uidEl) uidEl.textContent = '@' + (p.username || 'shaonianyou') + ' · UID ' + (p.uid || '553488');
    var signEl = document.getElementById('bstHeroSign');
    if (signEl && p.sign_input != null) signEl.textContent = p.sign_input || '暂无签名';
    var avEl = document.getElementById('bstHeroAvatar');
    if (avEl && p.avatar) avEl.src = p.avatar;

    var gadgets = state.gadgets || [];
    var enabledCnt = gadgets.filter(function (g) { return !!g.enabled; }).length;
    var gCntEl = document.getElementById('bstEnabledGadgetCount');
    if (gCntEl) gCntEl.textContent = enabledCnt + ' / ' + gadgets.length;
    var navBadge = document.getElementById('bstNavGadgetBadge');
    if (navBadge) navBadge.textContent = enabledCnt + '/' + gadgets.length;

    var pkCnt = ((state.security && state.security.passkeys) || []).length;
    var pkEl = document.getElementById('bstPasskeyCount');
    if (pkEl) pkEl.textContent = pkCnt + ' 把已激活';
  }

  function renderSidebar() {
    var colA = document.getElementById('columnSearchA');
    if (!colA) return;
    var links = colA.querySelectorAll ? colA.querySelectorAll('a[data-act="switch-tab"]') : [];
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var tab = a.getAttribute('data-tab');
      var isSel = tab === activeTab;
      if (a.classList) a.classList.toggle('selected', isSel);
      if (a.parentNode && a.parentNode.classList) {
        a.parentNode.classList.toggle('selected', isSel);
      }
    }
  }

  function renderGadgetItemHtml(g) {
    var numId = String(g.id || '').replace(/\D+/g, '') || '3001';
    var toggleHref = g.enabled
      ? '/settings/gadgets/' + numId + '/disable'
      : '/settings/gadgets/' + numId + '/enable';
    var toggleCls = g.enabled
      ? 'btnToggleGadget btnRedSmall rr'
      : 'btnToggleGadget btnBlueSmall rr';
    var toggleText = g.enabled ? '停用' : '启用';
    var tagsHtml = (g.tags || [])
      .map(function (t) {
        return '<span class="bst-gadget-tag">#' + esc(t) + '</span>';
      })
      .join('');
    var tryBtn = g.shellTry
      ? '<button type="button" class="bst-bbcode-btn" data-act="try-shell-gadget" data-try="' +
        esc(g.shellTry) +
        '">⚡ 立即预览效果</button>'
      : '';

    return (
      '<li class="tml_item' +
      (g.enabled ? ' is-enabled' : '') +
      '" data-gadget-id="' +
      esc(g.id) +
      '">' +
      '<img class="avatar" src="' +
      esc(g.avatar) +
      '" alt="' +
      esc(g.author) +
      '" referrerpolicy="no-referrer" />' +
      '<div class="bst-gadget-main">' +
      '<div class="bst-gadget-top">' +
      '<div>' +
      '<a href="' +
      esc(g.appUrl || '/dev/app/' + numId) +
      '" class="bst-gadget-title" data-act="inspect-gadget" data-id="' +
      esc(g.id) +
      '">' +
      esc(g.title) +
      '</a>' +
      '<span class="bst-gadget-ver">' +
      esc(g.version || 'v1.0') +
      '</span>' +
      '</div>' +
      '<a href="' +
      esc(toggleHref) +
      '" class="' +
      toggleCls +
      '" data-act="toggle-gadget" data-id="' +
      esc(g.id) +
      '">' +
      toggleText +
      '</a>' +
      '</div>' +
      '<div class="bst-gadget-meta">' +
      '<span>作者: <a href="user.html?uid=' +
      esc(g.authorUid || '553488') +
      '">' +
      esc(g.author) +
      '</a></span>' +
      '<span>· 分类: ' +
      esc(g.categoryLabel || '扩展组件') +
      '</span>' +
      '<span>· ' +
      esc(g.installs || 0) +
      ' 人启用</span>' +
      '<span>· 更新于 ' +
      esc(g.updatedAt || '2026-11') +
      '</span>' +
      '</div>' +
      '<div class="desc">' +
      esc(g.desc) +
      '</div>' +
      '<div class="bst-gadget-tags">' +
      tagsHtml +
      tryBtn +
      '</div>' +
      '</div>' +
      '</li>'
    );
  }

  function renderProfilePanel() {
    var p = state.profile || {};
    var tzs = state.timezones || [];
    var tzOptions = tzs
      .map(function (tz) {
        var sel = String(tz.value) === String(p.timeoffsetnew) ? ' selected' : '';
        return '<option value="' + esc(tz.value) + '"' + sel + '>' + esc(tz.label) + '</option>';
      })
      .join('');
    var hm = p.homeModules || {};

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head">' +
      '<div>' +
      '<h2 class="bst-panel-title">👤 个人资料信息 <span class="bst-panel-route-pill">/settings</span></h2>' +
      '<p class="bst-panel-desc">管理昵称、一句话签名、头像、自定义域名 (UID)、个人简介 BBCode、NSFW 显示策略与时区设置。</p>' +
      '</div>' +
      '<button type="button" class="bst-hero-btn" data-act="reset-profile-demo">↺ 恢复默认资料</button>' +
      '</div>' +
      '<form id="bstProfileForm" data-form="profile">' +
      '<table class="settings">' +
      '<tbody>' +
      '<tr><th>昵称 Nickname</th><td><input type="text" name="nickname" class="bst-input" value="' +
      esc(p.nickname) +
      '" /><div class="bst-field-hint">显示在全站动态、讨论楼层与个人时光机顶部的展示名称。</div></td></tr>' +
      '<tr><th>签名 Signature</th><td><input type="text" name="sign_input" class="bst-input" value="' +
      esc(p.sign_input) +
      '" /><div class="bst-field-hint">展示在名字下方的一句话电波签名（最多 60 字）。</div></td></tr>' +
      '<tr><th>头像 Avatar</th><td>' +
      '<div class="bst-avatar-upload-box">' +
      '<img src="' +
      esc(p.avatar) +
      '" alt="头像预览" class="bst-avatar-preview" id="bstFormAvatarPreview" referrerpolicy="no-referrer" />' +
      '<div>' +
      '<input type="file" name="picfile" id="bstPicFileInput" accept="image/*" />' +
      '<div class="bst-field-hint">支持 JPG / PNG / WebP，选择本地图片后立即预览并同步全站头像。</div>' +
      '<div class="bst-bbcode-toolbar" style="margin-top:8px;margin-bottom:0;">' +
      '<button type="button" class="bst-bbcode-btn" data-act="preset-avatar" data-url="https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1">预设1·少年游</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="preset-avatar" data-url="https://lain.bgm.tv/r/400/pic/crt/l/1a/e3/77_crt_r11wF.jpg">预设2·Spike</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="preset-avatar" data-url="https://lain.bgm.tv/r/400/pic/crt/l/6e/2a/79_crt_ZIF2u.jpg">预设3·Faye</button>' +
      '</div>' +
      '</div></div></td></tr>' +
      '<tr><th>用户名 Username</th><td>' +
      '<div class="bst-Inline-prefix"><span>https://bgm.tv/user/</span><input type="text" name="username" value="' +
      esc(p.username) +
      '" /></div>' +
      '<div class="bst-field-hint">个人时光机永久个性域名（仅限字母与数字，设定后作为个人主页唯一别名）。</div></td></tr>' +
      '<tr><th>个人网站 Website</th><td><input type="url" name="newsite" class="bst-input" value="' +
      esc(p.newsite) +
      '" /></td></tr>' +
      '<tr><th>自我介绍 Bio</th><td>' +
      '<div class="bst-bbcode-toolbar">' +
      '<button type="button" class="bst-bbcode-btn" data-act="insert-bio-bbcode" data-tag="b">[b]加粗[/b]</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="insert-bio-bbcode" data-tag="i">[i]斜体[/i]</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="insert-bio-bbcode" data-tag="url">[url]链接[/url]</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="insert-bio-bbcode" data-tag="quote">[quote]引用[/quote]</button>' +
      '<button type="button" class="bst-bbcode-btn" data-act="insert-bio-bbcode" data-tag="mask">[mask]黑幕[/mask]</button>' +
      '</div>' +
      '<textarea id="newbio" name="newbio" rows="5">' +
      esc(p.newbio) +
      '</textarea>' +
      '<div class="bst-field-hint">支持 Bangumi BBCode 语法，展示在个人时光机首页「自我介绍」毛玻璃面板。</div></td></tr>' +
      '<tr><th>敏感条目显示</th><td><div class="bst-radio-group">' +
      '<label class="bst-pill-check"><input type="radio" name="show_nsfw_subject" value="1"' +
      (p.show_nsfw_subject ? ' checked' : '') +
      ' /> 显示敏感条目 (NSFW)</label>' +
      '<label class="bst-pill-check"><input type="radio" name="show_nsfw_subject" value="0"' +
      (!p.show_nsfw_subject ? ' checked' : '') +
      ' /> 默认隐藏敏感条目</label>' +
      '</div></td></tr>' +
      '<tr><th>时区设置 Timezone</th><td><select name="timeoffsetnew">' +
      tzOptions +
      '</select></td></tr>' +
      '<tr><th>时光机模块开关</th><td><div class="bst-checkbox-grid">' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_anime"' + (hm.anime !== false ? ' checked' : '') + ' /> 📺 动画</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_book"' + (hm.book !== false ? ' checked' : '') + ' /> 📚 书籍</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_music"' + (hm.music !== false ? ' checked' : '') + ' /> 🎵 音乐</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_game"' + (hm.game !== false ? ' checked' : '') + ' /> 🎮 游戏</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_real"' + (hm.real ? ' checked' : '') + ' /> 🎬 三次元</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="hm_mono"' + (hm.mono !== false ? ' checked' : '') + ' /> 👥 人物</label>' +
      '</div></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" name="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderGadgetsPanel() {
    var gadgets = state.gadgets || [];
    var q = (gadgetQuery || '').trim().toLowerCase();
    var filtered = gadgets.filter(function (g) {
      if (gadgetCat === 'enabled' && !g.enabled) return false;
      if (gadgetCat !== 'all' && gadgetCat !== 'enabled' && g.category !== gadgetCat) return false;
      if (q) {
        var hay = (g.title + ' ' + g.author + ' ' + g.desc + ' ' + (g.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var cats = [
      { id: 'all', label: '全部组件 (' + gadgets.length + ')' },
      { id: 'enabled', label: '已启用 (' + gadgets.filter(function (g) { return g.enabled; }).length + ')' },
      { id: 'ui', label: '界面美化' },
      { id: 'progress', label: '进度与收藏' },
      { id: 'community', label: '社区与超展开' },
      { id: 'wiki', label: '开发与维基' },
      { id: 'stats', label: '数据与图谱' }
    ];

    var catBtns = cats
      .map(function (c) {
        return (
          '<button type="button" class="bst-cat-pill' +
          (gadgetCat === c.id ? ' active' : '') +
          '" data-act="filter-gadget-cat" data-cat="' +
          esc(c.id) +
          '">' +
          esc(c.label) +
          '</button>'
        );
      })
      .join('');

    var listHtml = filtered.length
      ? filtered.map(renderGadgetItemHtml).join('')
      : '<li class="tml_item"><div class="bst-gadget-main"><div class="desc">未找到匹配的超合金组件，可尝试切换分类或清空搜索词。</div></div></li>';

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head">' +
      '<div>' +
      '<h2 class="bst-panel-title">🧩 超合金组件市场 <span class="bst-panel-route-pill">/settings/gadgets</span></h2>' +
      '<p class="bst-panel-desc">启用或停用社区开发的超合金扩展组件；状态变更实时联动顶栏「个性化 → 超合金」面板。</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" class="bst-hero-btn" data-act="open-create-gadget">➕ 提交新组件</button>' +
      '<button type="button" class="bst-hero-btn" data-act="enable-recommended-gadgets">✨ 一键启用推荐套件</button>' +
      '</div>' +
      '</div>' +
      '<div class="bst-gadget-toolbar">' +
      '<div class="bst-gadget-cats">' +
      catBtns +
      '</div>' +
      '<input type="search" id="bstGadgetSearchInput" class="bst-gadget-search" placeholder="筛选组件名称、作者或标签..." value="' +
      esc(gadgetQuery) +
      '" />' +
      '</div>' +
      '<ul class="gadgetList" id="bstGadgetList">' +
      listHtml +
      '</ul>' +
      '</div>'
    );
  }

  function renderNetworkServicesPanel() {
    var list = state.networkServices || [];
    var cards = list
      .map(function (s, idx) {
        return (
          '<div class="bst-service-card">' +
          '<div class="bst-service-icon">' +
          esc(s.icon || '🌐') +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<strong>' +
          esc(s.name) +
          '</strong>' +
          '<label class="bst-pill-check" style="padding:3px 9px;font-size:11.5px;">' +
          '<input type="checkbox" name="svc_enable_' +
          idx +
          '"' +
          (s.enabled ? ' checked' : '') +
          ' /> 展示在时光机</label>' +
          '</div>' +
          '<div class="bst-Inline-prefix">' +
          '<span>' +
          esc(s.prefix) +
          '</span>' +
          '<input type="text" name="svc_handle_' +
          idx +
          '" value="' +
          esc(s.handle) +
          '" placeholder="输入账号 ID..." />' +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head">' +
      '<div>' +
      '<h2 class="bst-panel-title">🌐 外部网络服务绑定 <span class="bst-panel-route-pill">/settings/network_services</span></h2>' +
      '<p class="bst-panel-desc">关联你的 GitHub、Steam、PSN、Switch、Bilibili 等社交与游戏主页，在个人时光机侧栏展示徽章。</p>' +
      '</div></div>' +
      '<form id="bstNetworkForm" data-form="network_services">' +
      '<div class="bst-service-grid">' +
      cards +
      '</div>' +
      '<table class="settings"><tbody><tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr></tbody></table>' +
      '</form></div>'
    );
  }

  function renderPrivacyPanel() {
    var pv = state.privacy || {};
    var blocked = (pv.blockedUsers || [])
      .map(function (u) {
        return (
          '<div class="bst-passkey-card">' +
          '<div><strong>' +
          esc(u.nickname) +
          '</strong> <span class="bst-panel-route-pill">@' +
          esc(u.uid) +
          '</span><div class="bst-field-hint">屏蔽于 ' +
          esc(u.date) +
          ' · 原因：' +
          esc(u.reason) +
          '</div></div>' +
          '<button type="button" class="bst-hero-btn" data-act="unblock-user" data-uid="' +
          esc(u.uid) +
          '">解除绝交</button>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head">' +
      '<div>' +
      '<h2 class="bst-panel-title">🛡️ 隐私与黑名单管理 <span class="bst-panel-route-pill">/settings/privacy</span></h2>' +
      '<p class="bst-panel-desc">控制个人时光机动态、收藏列表、电波同步率及站内短信的可见权限，管理绝交/屏蔽名单。</p>' +
      '</div>' +
      '<button type="button" class="bst-hero-btn" data-act="add-block-user">➕ 添加屏蔽用户</button>' +
      '</div>' +
      '<form id="bstPrivacyForm" data-form="privacy">' +
      '<table class="settings"><tbody>' +
      '<tr><th>时光机动态可见范围</th><td><select name="timelineVisibility">' +
      '<option value="all"' + (pv.timelineVisibility === 'all' ? ' selected' : '') + '>所有人可见（含游客）</option>' +
      '<option value="users"' + (pv.timelineVisibility === 'users' ? ' selected' : '') + '>仅登录 Bangumi 用户可见</option>' +
      '<option value="friends"' + (pv.timelineVisibility === 'friends' ? ' selected' : '') + '>仅我的好友可见</option>' +
      '</select></td></tr>' +
      '<tr><th>站内短信接收权限</th><td><select name="pmPermission">' +
      '<option value="all"' + (pv.pmPermission === 'all' ? ' selected' : '') + '>允许所有注册用户向我发送短信</option>' +
      '<option value="friends"' + (pv.pmPermission === 'friends' ? ' selected' : '') + '>仅允许我的好友向我发送短信</option>' +
      '</select></td></tr>' +
      '<tr><th>电波同步率与索引</th><td><div class="bst-checkbox-grid">' +
      '<label class="bst-pill-check"><input type="checkbox" name="showSyncRatio"' + (pv.showSyncRatio !== false ? ' checked' : '') + ' /> 允许他人查看与我的电波同步率</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="allowSearchIndexing"' + (pv.allowSearchIndexing !== false ? ' checked' : '') + ' /> 允许搜索引擎收录我的公开日志与目录</label>' +
      '</div></td></tr>' +
      '<tr><th>已绝交/屏蔽用户</th><td><div class="bst-passkey-list">' +
      (blocked || '<div class="bst-field-hint">当前黑名单为空。</div>') +
      '</div></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderEmailPanel() {
    var em = state.email || {};
    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">📧 邮箱绑定与通知提醒 <span class="bst-panel-route-pill">/settings/email</span></h2>' +
      '<p class="bst-panel-desc">管理登录主邮箱与站内电波提醒、新私信及安全告警的邮件推送策略。</p>' +
      '</div></div>' +
      '<form id="bstEmailForm" data-form="email">' +
      '<table class="settings"><tbody>' +
      '<tr><th>当前绑定邮箱</th><td><strong>' +
      esc(em.currentEmail) +
      '</strong> <span class="bst-hero-uid">✓ 已验证 (' +
      esc(em.verifiedAt) +
      ')</span></td></tr>' +
      '<tr><th>更换新邮箱</th><td><div style="display:flex;gap:10px;max-width:520px;">' +
      '<input type="email" name="new_email" class="bst-input" placeholder="输入新的邮箱地址..." />' +
      '<button type="button" class="bst-hero-btn" data-act="send-email-code">发送验证邮件</button>' +
      '</div></td></tr>' +
      '<tr><th>邮件提醒订阅</th><td><div class="bst-checkbox-grid">' +
      '<label class="bst-pill-check"><input type="checkbox" name="notifyOnPm"' + (em.notifyOnPm !== false ? ' checked' : '') + ' /> 收到新站内短信 (.chii) 时发信提醒</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="notifyOnReply"' + (em.notifyOnReply !== false ? ' checked' : '') + ' /> 讨论串/日志被回复时汇总提醒</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="notifySecurityAlert"' + (em.notifySecurityAlert !== false ? ' checked' : '') + ' /> 异地登录与安全变更实时告警</label>' +
      '</div></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderPasswordPanel() {
    var sec = state.security || {};
    var sessions = (sec.sessions || [])
      .map(function (s) {
        return (
          '<div class="bst-passkey-card">' +
          '<div><strong>' +
          esc(s.device) +
          '</strong><div class="bst-field-hint">IP: ' +
          esc(s.ip) +
          ' · ' +
          esc(s.location) +
          ' · 活跃：' +
          esc(s.active) +
          '</div></div>' +
          (s.id === 'sess_cur'
            ? '<span class="bst-hero-uid">当前设备</span>'
            : '<button type="button" class="bst-hero-btn" data-act="revoke-session" data-id="' + esc(s.id) + '">退出此设备</button>') +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">🔒 修改登录密码与会话安全 <span class="bst-panel-route-pill">/settings/password</span></h2>' +
      '<p class="bst-panel-desc">定期更新高强度密码或管理处于已登录状态的客户端与浏览器会话（上次修改：' +
      esc(sec.lastPasswordChange || '2026-08-12') +
      '）。</p>' +
      '</div></div>' +
      '<form id="bstPasswordForm" data-form="password">' +
      '<table class="settings"><tbody>' +
      '<tr><th>当前密码</th><td><input type="password" name="old_password" class="bst-input" placeholder="输入当前登录密码..." /></td></tr>' +
      '<tr><th>新密码</th><td><input type="password" name="new_password" id="bstNewPwdInput" class="bst-input" placeholder="至少 8 位，建议包含大小写字母、数字与符号..." /><div class="bst-field-hint" id="bstPwdStrengthHint">密码强度：等待输入</div></td></tr>' +
      '<tr><th>确认新密码</th><td><input type="password" name="confirm_password" class="bst-input" placeholder="再次输入新密码..." /></td></tr>' +
      '<tr><th>活跃登录设备</th><td><div class="bst-passkey-list">' +
      sessions +
      '</div></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderPasskeysPanel() {
    var pks = (state.security && state.security.passkeys) || [];
    var pkCards = pks
      .map(function (pk) {
        return (
          '<div class="bst-passkey-card">' +
          '<div>' +
          '<strong>🔑 ' +
          esc(pk.name) +
          '</strong> <span class="bst-panel-route-pill">' +
          esc(pk.deviceType) +
          '</span>' +
          '<div class="bst-field-hint">创建于 ' +
          esc(pk.createdAt) +
          ' · 最近认证：' +
          esc(pk.lastUsed) +
          ' · AAGUID: ' +
          esc(pk.aaguid) +
          '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
          '<button type="button" class="bst-hero-btn" data-act="test-passkey" data-id="' +
          esc(pk.id) +
          '">⚡ 验证签名</button>' +
          '<button type="button" class="bst-hero-btn" data-act="delete-passkey" data-id="' +
          esc(pk.id) +
          '">移除</button>' +
          '</div></div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">🔑 通行密钥 Passkey (WebAuthn / FIDO2) <span class="bst-panel-route-pill">/settings/passkeys</span></h2>' +
      '<p class="bst-panel-desc">使用 Windows Hello、Touch ID / Face ID 或硬件安全密钥免密一键登录 Bangumi（与 auth.html Passkey 登录联动）。</p>' +
      '</div>' +
      '<button type="button" class="bst-submit-btn" data-act="register-passkey">➕ 注册新 Passkey</button>' +
      '</div>' +
      '<div class="bst-passkey-list">' +
      (pkCards || '<div class="bst-field-hint">尚未绑定 Passkey，点击右上角按钮立即注册。</div>') +
      '</div>' +
      '<table class="settings"><tbody>' +
      '<tr><th>开发者 Access Token</th><td><button type="button" class="bst-hero-btn" data-act="generate-api-token">🛠️ 生成新 Personal Access Token</button><div class="bst-field-hint" id="bstApiTokenBox">用于 Bangumi HTTP API v0 与超合金云端同步调试。</div></td></tr>' +
      '</tbody></table></div>'
    );
  }

  function renderUkagakaPanel() {
    var uk = state.ukagaka || {};
    var shells = (uk.shells || [])
      .map(function (sh) {
        var isAct = sh.id === uk.currentShell;
        return (
          '<div class="bst-shell-card' +
          (isAct ? ' active' : '') +
          '" data-act="select-ukagaka-shell" data-shell="' +
          esc(sh.id) +
          '">' +
          '<div style="font-size:28px;margin-bottom:8px;">' +
          esc(sh.preview) +
          '</div>' +
          '<div style="font-weight:800;margin-bottom:4px;">' +
          esc(sh.name) +
          '</div>' +
          '<div class="bst-field-hint">作者：' +
          esc(sh.author) +
          '</div>' +
          '<div style="font-size:12px;color:var(--bst-text-sub);margin-top:6px;">' +
          esc(sh.desc) +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">📺 伪春菜人格与外壳设置 <span class="bst-panel-route-pill">/settings/ukagaka</span></h2>' +
      '<p class="bst-panel-desc">定制全站右下角常驻「伪春菜 (#bsh-robot)」的人格外壳、播报频率与欢迎台词。</p>' +
      '</div>' +
      '<button type="button" class="bst-hero-btn" data-act="test-ukagaka-speech">💬 立即在右下角试播报</button>' +
      '</div>' +
      '<div class="bst-ukagaka-grid">' +
      shells +
      '</div>' +
      '<form id="bstUkagakaForm" data-form="ukagaka">' +
      '<table class="settings"><tbody>' +
      '<tr><th>自定义欢迎语</th><td><input type="text" name="customGreeting" class="bst-input" value="' +
      esc(uk.customGreeting) +
      '" /></td></tr>' +
      '<tr><th>气泡播报频率</th><td><select name="speechFrequency">' +
      '<option value="high"' + (uk.speechFrequency === 'high' ? ' selected' : '') + '>高频互动（切换页面与操作时主动吐槽）</option>' +
      '<option value="normal"' + (uk.speechFrequency === 'normal' ? ' selected' : '') + '>标准模式（仅关键提醒与点击时播报）</option>' +
      '<option value="quiet"' + (uk.speechFrequency === 'quiet' ? ' selected' : '') + '>静默待命（仅手动点击小电视时展开）</option>' +
      '</select></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderImgChartPanel() {
    var ic = state.imgChart || {};
    var cols = ic.gridColumns || '4';
    var sampleItems = [
      { title: 'Cowboy Bebop 星际牛仔', score: '9.6', stars: 10, rank: '#4' },
      { title: '葬送的芙莉莲', score: '9.1', stars: 9, rank: '#12' },
      { title: '攻壳机动队 S.A.C. 2nd GIG', score: '9.4', stars: 10, rank: '#6' },
      { title: '命运石之门 Steins;Gate', score: '9.2', stars: 9, rank: '#9' }
    ];
    var tiles = sampleItems
      .map(function (it) {
        var starStr = new Array(it.stars + 1).join('★') + new Array(10 - it.stars + 1).join('☆');
        return (
          '<div class="bst-chart-tile">' +
          '<div style="font-weight:800;margin-bottom:4px;">' +
          esc(it.title) +
          '</div>' +
          (ic.showRankBadge !== false ? '<span class="bst-hero-uid">' + esc(it.rank) + '</span> ' : '') +
          (ic.showTenStarBadge !== false
            ? '<div style="color:#f59e0b;font-size:11.5px;margin-top:4px;">' + starStr + ' <strong>' + esc(it.score) + '</strong></div>'
            : '') +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">🖼️ 图像化收藏榜单配置 <span class="bst-panel-route-pill">/settings/img_chart</span></h2>' +
      '<p class="bst-panel-desc">定制个人时光机导出的海报墙网格列数、封面比例与传统十星+数字评分角标样式。</p>' +
      '</div>' +
      '<button type="button" class="bst-submit-btn" data-act="export-img-chart">📸 生成图像榜单快照</button>' +
      '</div>' +
      '<form id="bstImgChartForm" data-form="img_chart">' +
      '<table class="settings"><tbody>' +
      '<tr><th>每行海报列数</th><td><select name="gridColumns" id="bstChartColsSelect">' +
      '<option value="3"' + (cols === '3' ? ' selected' : '') + '>3 列宽幅画报</option>' +
      '<option value="4"' + (cols === '4' ? ' selected' : '') + '>4 列标准网格</option>' +
      '<option value="5"' + (cols === '5' ? ' selected' : '') + '>5 列高密陈列</option>' +
      '</select></td></tr>' +
      '<tr><th>角标元素显示</th><td><div class="bst-checkbox-grid">' +
      '<label class="bst-pill-check"><input type="checkbox" name="showTenStarBadge"' + (ic.showTenStarBadge !== false ? ' checked' : '') + ' /> 显示传统十星+数字评分条</label>' +
      '<label class="bst-pill-check"><input type="checkbox" name="showRankBadge"' + (ic.showRankBadge !== false ? ' checked' : '') + ' /> 显示全站排名 #Rank 角标</label>' +
      '</div></td></tr>' +
      '<tr><th>底部署名水印</th><td><input type="text" name="watermarkText" class="bst-input" value="' +
      esc(ic.watermarkText) +
      '" /></td></tr>' +
      '<tr><th>实时预览</th><td><div class="bst-chart-preview cols-' +
      esc(cols) +
      '">' +
      tiles +
      '</div></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderHomepagePanel() {
    var hp = state.homepage || {};
    return (
      '<div class="bst-panel-card">' +
      '<div class="bst-panel-head"><div>' +
      '<h2 class="bst-panel-title">🏛️ 时光机与首页看板布局 <span class="bst-panel-route-pill">/settings/homepage</span></h2>' +
      '<p class="bst-panel-desc">定制首页三栏布局、个人时光机 [bg] 背景氛围图、液态毛玻璃折射模糊度与默认时间线过滤。</p>' +
      '</div>' +
      '<button type="button" class="bst-hero-btn" data-act="preview-homepage-bg">✨ 同步至个人时光机</button>' +
      '</div>' +
      '<form id="bstHomepageForm" data-form="homepage">' +
      '<table class="settings"><tbody>' +
      '<tr><th>时光机看板背景 URL</th><td><input type="url" name="bgUrl" class="bst-input" value="' +
      esc(hp.bgUrl) +
      '" /><div class="bst-field-hint">对应个人时光机右上角 [bg] 看板氛围背景（支持 lain.bgm.tv 高清海报图）。</div></td></tr>' +
      '<tr><th>毛玻璃模糊半径 (px)</th><td><input type="text" name="bgBlur" class="bst-input" value="' +
      esc(hp.bgBlur || 18) +
      '" /></td></tr>' +
      '<tr><th>首页收视进度默认视图</th><td><select name="prgViewMode">' +
      '<option value="editorial_spread"' + (hp.prgViewMode === 'editorial_spread' ? ' selected' : '') + '>左大图右进度平铺 (Editorial Spread)</option>' +
      '<option value="compact_list"' + (hp.prgViewMode === 'compact_list' ? ' selected' : '') + '>紧凑列表模式</option>' +
      '</select></td></tr>' +
      '<tr><th>时间线默认范围</th><td><select name="timelineDefaultScope">' +
      '<option value="friends"' + (hp.timelineDefaultScope === 'friends' ? ' selected' : '') + '>好友动态 (Friends)</option>' +
      '<option value="all"' + (hp.timelineDefaultScope === 'all' ? ' selected' : '') + '>全站实时电波 (All)</option>' +
      '<option value="me"' + (hp.timelineDefaultScope === 'me' ? ' selected' : '') + '>仅我自己的时空轨迹</option>' +
      '</select></td></tr>' +
      '<tr><th></th><td><input class="inputBtn" type="submit" value="保存修改" /></td></tr>' +
      '</tbody></table></form></div>'
    );
  }

  function renderMain() {
    renderSidebar();
    syncHeroAndCounters();
    var colB = document.getElementById('columnSearchB');
    if (!colB) return;

    var mainHtml = '';
    if (activeTab === 'profile') mainHtml = renderProfilePanel() + renderGadgetsPanel();
    else if (activeTab === 'gadgets') mainHtml = renderGadgetsPanel() + renderProfilePanel();
    else if (activeTab === 'network_services') mainHtml = renderNetworkServicesPanel() + renderGadgetsPanel();
    else if (activeTab === 'privacy') mainHtml = renderPrivacyPanel() + renderGadgetsPanel();
    else if (activeTab === 'email') mainHtml = renderEmailPanel() + renderGadgetsPanel();
    else if (activeTab === 'password') mainHtml = renderPasswordPanel() + renderGadgetsPanel();
    else if (activeTab === 'passkeys') mainHtml = renderPasskeysPanel() + renderGadgetsPanel();
    else if (activeTab === 'ukagaka') mainHtml = renderUkagakaPanel() + renderGadgetsPanel();
    else if (activeTab === 'img_chart') mainHtml = renderImgChartPanel() + renderGadgetsPanel();
    else if (activeTab === 'homepage') mainHtml = renderHomepagePanel() + renderGadgetsPanel();
    else mainHtml = renderProfilePanel() + renderGadgetsPanel();

    colB.innerHTML = mainHtml;
  }

  function switchTab(tab) {
    if (VALID_TABS.indexOf(tab) === -1) tab = 'profile';
    activeTab = tab;
    syncUrlParams();
    renderMain();
  }

  function toggleGadget(id) {
    var gadgets = state.gadgets || [];
    var target = null;
    for (var i = 0; i < gadgets.length; i++) {
      if (gadgets[i].id === id) {
        target = gadgets[i];
        break;
      }
    }
    if (!target) return;
    target.enabled = !target.enabled;
    target.installs = Math.max(1, (target.installs || 100) + (target.enabled ? 1 : -1));
    saveState();
    renderMain();
    showToast(
      target.enabled
        ? '🧩 已启用超合金组件「' + target.title + '」并同步至云端配置'
        : '⏹️ 已停用超合金组件「' + target.title + '」'
    );
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el) return;
      var act = el.getAttribute('data-act');

      if (act === 'switch-tab') {
        e.preventDefault();
        switchTab(el.getAttribute('data-tab') || 'profile');
        return;
      }

      if (act === 'toggle-gadget') {
        e.preventDefault();
        toggleGadget(el.getAttribute('data-id') || '');
        return;
      }

      if (act === 'filter-gadget-cat') {
        e.preventDefault();
        gadgetCat = el.getAttribute('data-cat') || 'all';
        syncUrlParams();
        renderMain();
        return;
      }

      if (act === 'inspect-gadget') {
        e.preventDefault();
        var gid = el.getAttribute('data-id') || '';
        var g = (state.gadgets || []).find(function (x) { return x.id === gid; });
        if (g) {
          showToast('📦 ' + g.title + ' (' + g.version + ') · 作者 ' + g.author + ' · ' + g.installs + ' 人启用');
        }
        return;
      }

      if (act === 'try-shell-gadget') {
        e.preventDefault();
        var tryKey = el.getAttribute('data-try') || '';
        if (window.BgmShell && typeof window.BgmShell.openModal === 'function') {
          showToast('⚡ 正在调用全局超合金组件演示：' + tryKey);
        }
        return;
      }

      if (act === 'open-shell-alloy') {
        e.preventDefault();
        if (window.BgmShell && typeof window.BgmShell.setModalTab === 'function') {
          window.BgmShell.setModalTab('alloy');
          window.BgmShell.openCustomize();
        }
        showToast('✨ 已打开顶栏「个性化 → 超合金」面板');
        return;
      }

      if (act === 'open-create-gadget') {
        e.preventDefault();
        var newId = 'gadget_' + Math.floor(4000 + Math.random() * 900);
        state.gadgets.unshift({
          id: newId,
          appUrl: '/dev/app/' + newId.replace(/\D+/g, ''),
          title: '新提交组件 · 番组时间线快捷滤镜 #' + newId.slice(-3),
          version: 'v0.1.0-beta',
          category: 'ui',
          categoryLabel: '界面美化',
          author: (state.profile && state.profile.nickname) || '少年游',
          authorUid: (state.profile && state.profile.uid) || '553488',
          avatar: (state.profile && state.profile.avatar) || 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg',
          installs: 1,
          updatedAt: '2026-11-14',
          tags: ['自定义脚本', '云端同步', 'EditorialGlass'],
          desc: '由当前开发者在个人设置中心提交的沙盒测试超合金组件，已自动启用。',
          enabled: true,
          shellTry: ''
        });
        saveState();
        activeTab = 'gadgets';
        gadgetCat = 'all';
        renderMain();
        showToast('🚀 已创建并启用新超合金组件，可在列表中随时停用');
        return;
      }

      if (act === 'enable-recommended-gadgets') {
        e.preventDefault();
        (state.gadgets || []).forEach(function (g, idx) {
          if (idx < 8) g.enabled = true;
        });
        saveState();
        renderMain();
        showToast('✨ 已一键启用前 8 款官方与社区精选超合金组件');
        return;
      }

      if (act === 'preset-avatar') {
        e.preventDefault();
        var url = el.getAttribute('data-url') || '';
        if (url && state.profile) {
          state.profile.avatar = url;
          saveState();
          renderMain();
          showToast('🖼️ 已切换预设头像并同步至顶部个人卡片');
        }
        return;
      }

      if (act === 'insert-bio-bbcode') {
        e.preventDefault();
        var tag = el.getAttribute('data-tag') || 'b';
        var ta = document.getElementById('newbio');
        if (ta) {
          ta.value = (ta.value || '') + ' [' + tag + ']示例文本[/' + tag + ']';
          state.profile.newbio = ta.value;
          showToast('✍️ 已插入 [' + tag + '] BBCode 标签');
        }
        return;
      }

      if (act === 'reset-profile-demo') {
        e.preventDefault();
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (err) {}
        state = loadState();
        renderMain();
        showToast('↺ 已恢复默认个人设置与超合金组件状态');
        return;
      }

      if (act === 'unblock-user') {
        e.preventDefault();
        var uid = el.getAttribute('data-uid') || '';
        if (state.privacy && Array.isArray(state.privacy.blockedUsers)) {
          state.privacy.blockedUsers = state.privacy.blockedUsers.filter(function (u) {
            return u.uid !== uid;
          });
          saveState();
          renderMain();
          showToast('🕊️ 已将 @' + uid + ' 移出绝交黑名单');
        }
        return;
      }

      if (act === 'add-block-user') {
        e.preventDefault();
        if (state.privacy && Array.isArray(state.privacy.blockedUsers)) {
          var mockUid = 'troll_' + Math.floor(100 + Math.random() * 899);
          state.privacy.blockedUsers.push({
            uid: mockUid,
            nickname: '刷屏小号_' + mockUid.slice(-3),
            date: '2026-11-14',
            reason: '手动添加屏蔽'
          });
          saveState();
          renderMain();
          showToast('🛡️ 已将 @' + mockUid + ' 加入绝交黑名单');
        }
        return;
      }

      if (act === 'send-email-code') {
        e.preventDefault();
        showToast('📧 验证邮件已发送至新邮箱，请在 15 分钟内点击确认链接');
        return;
      }

      if (act === 'revoke-session') {
        e.preventDefault();
        var sid = el.getAttribute('data-id') || '';
        if (state.security && Array.isArray(state.security.sessions)) {
          state.security.sessions = state.security.sessions.filter(function (s) {
            return s.id !== sid;
          });
          saveState();
          renderMain();
          showToast('🔒 已远程注销该设备的登录会话');
        }
        return;
      }

      if (act === 'register-passkey') {
        e.preventDefault();
        if (state.security && Array.isArray(state.security.passkeys)) {
          var pkId = 'pk_' + Date.now();
          state.security.passkeys.unshift({
            id: pkId,
            name: 'Passkey 硬件令牌 #' + String(state.security.passkeys.length + 1),
            createdAt: '2026-11-14 11:38',
            lastUsed: '刚刚',
            aaguid: '08987058-cadc-4b81-b6e1-30de50dcbe96',
            deviceType: 'WebAuthn 生物识别密钥'
          });
          saveState();
          renderMain();
          showToast('🔑 已成功注册新的 WebAuthn Passkey 通行密钥');
        }
        return;
      }

      if (act === 'test-passkey') {
        e.preventDefault();
        showToast('✅ WebAuthn 挑战签名验证通过（耗时 18ms）');
        return;
      }

      if (act === 'delete-passkey') {
        e.preventDefault();
        var pid = el.getAttribute('data-id') || '';
        if (state.security && Array.isArray(state.security.passkeys)) {
          state.security.passkeys = state.security.passkeys.filter(function (p) {
            return p.id !== pid;
          });
          saveState();
          renderMain();
          showToast('🗑️ 已移除该 Passkey 通行密钥');
        }
        return;
      }

      if (act === 'generate-api-token') {
        e.preventDefault();
        var box = document.getElementById('bstApiTokenBox');
        var tok = 'bgm_pat_' + Math.random().toString(36).slice(2, 12) + '_liquidglass2026';
        if (box) box.textContent = '新生成 Token（请妥善保存）：' + tok;
        showToast('🛠️ 已生成新的 Bangumi Personal Access Token');
        return;
      }

      if (act === 'select-ukagaka-shell') {
        e.preventDefault();
        var shId = el.getAttribute('data-shell') || 'bangumi_musume';
        if (state.ukagaka) {
          state.ukagaka.currentShell = shId;
          saveState();
          renderMain();
          showToast('📺 已切换伪春菜人格外壳：' + shId);
        }
        return;
      }

      if (act === 'test-ukagaka-speech') {
        e.preventDefault();
        var sp = document.querySelector ? document.querySelector('#bsh-speech') : null;
        var msg = (state.ukagaka && state.ukagaka.customGreeting) || '主人欢迎回来！';
        if (sp) sp.textContent = msg;
        showToast('💬 伪春菜正在播报：' + msg);
        return;
      }

      if (act === 'export-img-chart') {
        e.preventDefault();
        showToast('📸 已生成高分收藏图像榜单快照（含传统十星+数字角标）');
        return;
      }

      if (act === 'preview-homepage-bg') {
        e.preventDefault();
        showToast('✨ 时光机看板背景与毛玻璃折射参数已同步至 user.html');
        return;
      }
    });

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === 'bstGadgetSearchInput') {
        gadgetQuery = t.value || '';
        renderMain();
        var inputEl = document.getElementById('bstGadgetSearchInput');
        if (inputEl && inputEl.focus) inputEl.focus();
      } else if (t.id === 'bstNewPwdInput') {
        var v = t.value || '';
        var hint = document.getElementById('bstPwdStrengthHint');
        if (hint) {
          var score = (v.length >= 8 ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/\d/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
          var labels = ['弱（建议至少 8 位）', '一般', '良好', '高强度', '极高强度（FIDO 级密码）'];
          hint.textContent = '密码强度：' + labels[score];
        }
      }
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.getAttribute) return;
      var kind = form.getAttribute('data-form');
      if (!kind) return;
      e.preventDefault();

      if (kind === 'profile') {
        var fd = form.querySelectorAll ? form.querySelectorAll('input, textarea, select') : [];
        for (var i = 0; i < fd.length; i++) {
          var inp = fd[i];
          if (inp.name === 'nickname') state.profile.nickname = inp.value;
          else if (inp.name === 'sign_input') state.profile.sign_input = inp.value;
          else if (inp.name === 'username') state.profile.username = inp.value;
          else if (inp.name === 'newsite') state.profile.newsite = inp.value;
          else if (inp.name === 'newbio') state.profile.newbio = inp.value;
          else if (inp.name === 'show_nsfw_subject' && inp.checked) {
            state.profile.show_nsfw_subject = inp.value === '1';
          } else if (inp.name === 'timeoffsetnew') {
            state.profile.timeoffsetnew = inp.value;
          }
        }
        saveState();
        syncHeroAndCounters();
        showToast('✅ 个人资料修改已保存并同步至全站顶栏与个人时光机');
      } else {
        saveState();
        showToast('✅ 「' + kind + '」设置项已保存生效');
      }
    });
  }

  function init() {
    parseUrlParams();
    renderMain();
    bindEvents();
  }

  window.BgmSettings = {
    getState: function () {
      return Object.assign({}, state, { activeTab: activeTab, gadgetCat: gadgetCat, gadgetQuery: gadgetQuery });
    },
    switchTab: switchTab,
    toggleGadget: toggleGadget,
    renderMain: renderMain
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
