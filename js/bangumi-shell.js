/* ==========================================================================
   bangumi-shell.js · 全站共享壳层 (Shared Editorial Liquid Glass Shell)
   Phase A2 / WORK_ORDER_TODO.md

   设计约束（务必保持）：
   · 纯增量、幂等 —— 所有 ID / class 均为 bsh- 前缀，与 5 张既有原型页零冲突。
   · 不重写既有 #customizeModal 的光影/强调色/侧翼逻辑（index 由
     bangumi-home-preview.js 驱动，其余 4 页由 inline onclick 驱动，均已可用），
     只「前置 3 个 Tab + 追加 2 个面板」增强它。
   · 浮动通知统一使用 .glass-toast + #toastContainer。
   · 评分一律「传统十星 + 数字」：★×n + ☆×(10−n) + 数字（用户 m01337 指令）。
   ========================================================================== */
(function () {
  'use strict';

  var AVATAR = 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1';
  var USER = '少年游';
  var AUTH_KEY = 'bgm_auth_state_v1';
  var BOOTED = false;

  function readAuth() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return { loggedIn: true, uid: '553488', nickname: USER, avatar: AVATAR };
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : { loggedIn: true, uid: '553488', nickname: USER, avatar: AVATAR };
    } catch (e) {
      return { loggedIn: true, uid: '553488', nickname: USER, avatar: AVATAR };
    }
  }

  function writeAuth(obj) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function syncAuth() {
    var auth = readAuth();
    var dock = document.getElementById('bsh-dock');
    if (dock) {
      var uBtn = dock.querySelector('.bsh-dock-user');
      var uImg = dock.querySelector('.bsh-dock-ava');
      var uName = dock.querySelector('.bsh-dock-name');
      var lBtn = dock.querySelector('[data-bsh-act="logout"]');
      if (auth.loggedIn) {
        if (uBtn) { uBtn.setAttribute('href', 'user.html?uid=' + encodeURIComponent(auth.uid || '553488')); uBtn.setAttribute('data-bsh-tip', '个人时光机'); }
        if (uImg) uImg.setAttribute('src', auth.avatar || AVATAR);
        if (uName) uName.textContent = auth.nickname || USER;
        if (lBtn) { lBtn.textContent = '↪️'; lBtn.setAttribute('data-bsh-tip', '登出'); }
      } else {
        if (uBtn) { uBtn.setAttribute('href', 'auth.html?mode=login'); uBtn.setAttribute('data-bsh-tip', '点击登录 Bangumi'); }
        if (uImg) uImg.setAttribute('src', 'https://lain.bgm.tv/pic/user/l/icon.jpg');
        if (uName) uName.textContent = '游客 · 去登录';
        if (lBtn) { lBtn.textContent = '🔑'; lBtn.setAttribute('data-bsh-tip', '登录 / 注册'); }
      }
    }
    if (!document.body.classList.contains('bau-page-body')) {
      var wrap = document.getElementById('userAvatarWrap');
      if (wrap && !auth.loggedIn) {
        wrap.innerHTML =
          '<div class="bsh-guest-pills">' +
            '<a href="auth.html?mode=login" class="bsh-guest-link">登录</a>' +
            '<a href="auth.html?mode=signup" class="bsh-guest-signup">注册</a>' +
          '</div>';
      }
    }
  }

  function logout() {
    var auth = readAuth();
    writeAuth({ loggedIn: false, lastUid: auth.uid || '553488' });
    syncAuth();
    toast('已退出登录，正在前往未登录首页…');
    if (!window.__BSH_NO_REDIRECT__) {
      setTimeout(function () { window.location.href = 'auth.html?mode=guest&from=logout'; }, 240);
    }
  }

  var EMOJI = {
    bgm_tv: ['(⌒▽⌒)', '(￣▽￣)', '(>_<)', '(T_T)', '(°∀°)', '(｀・ω・´)', '(╯°□°）╯', '(￣ー￣)'],
    bgm_vs: ['(・∀・)つ', 'ヽ(´▽｀)ノ', '(ง •̀_•́)ง', '(つД`)ノ', 'Σ(っ °Д °;)っ', '(；′⌒`)', '(ノ≧∇≦)ノ', '((((；ﾟДﾟ))))'],
    bgm_tv_500: ['[bgm=500]', '☆⌒(*＾-°)v', '♪(´▽｀)', '(๑•̀ㅂ•́)و✧', '(,,・ω・,,)', '⊙▽⊙', '(°ー°〃)', '( ｀д´)'],
    bgm: ['[bgm]', '(bgm38)', '(bgm23)', '(bgm11)', '(bgm7)', '(bgm56)', '(bgm42)', '(bgm19)'],
    musume: ['(*´∀`)~♥', '(๑´•ᴗ•̀๑)', '(｡･ω･｡)ﾉ♡', '(*/ω＼*)', '(´,,•ω•,,)♡', '( ˘͈ ᵕ ˘͈ )', '(つ﹏⊂)', '(｡ŏ﹏ŏ)'],
    blake: ['[blake]', '¯\\_(ツ)_/¯', '(╬ Ò﹏Ó)', 'ಠ_ಠ', '(◣_◢)', '┐(´～｀)┌', '(¬_¬)', '(҂ `Д´)']
  };

  var MARKET = [
    { ico: '📦', name: '收藏评分盒 · CollectBox', desc: '五态单选 / 十星评分 / 标签 / 吐槽 / 隐私，ThickBox 同源弹层', act: 'collect' },
    { ico: '💗', name: '贴贴 · like_dropdown', desc: 'data-like-type 贴贴表情与 likes_grid 回显，一条评论也能有温度', act: 'like' },
    { ico: '😀', name: 'BBCode 工具栏与表情', desc: 'markItUp 工具条 + 440+ 表情 6 组（此处为代表性样本）', act: 'smiley' },
    { ico: '📺', name: '章节进度气泡 · cluetip', desc: '.prg_popup 五态：看过 / 看到 / 想看 / 搁置 / 撤销', act: 'cluetip' },
    { ico: '🔢', name: '分页器 · page_inner', desc: '统一的分页胶囊样式，供后续 P05/P13/P16/P20 直接调用', act: 'pager' }
  ];

  var state = { tab: 'general', collect: '', score: 0, likes: [], page: 1, emojiTab: 'bgm_tv' };

  /* ------------------------------- 基础工具 ------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function toast(msg) {
    var host = document.getElementById('toastContainer');
    if (!host) { host = el('div', 'toast-container'); host.id = 'toastContainer'; document.body.appendChild(host); }
    var t = el('div', 'glass-toast', '<span>✦</span><span>' + esc(msg) + '</span>');
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s ease, transform .25s ease';
      t.style.opacity = '0'; t.style.transform = 'translateY(-6px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 2300);
  }

  function openCustomize() {
    var m = document.getElementById('customizeModal');
    if (m) m.hidden = false;
  }

  function closeCustomize() {
    var m = document.getElementById('customizeModal');
    if (m) m.hidden = true;
  }

  function toggleTheme() {
    var d = document.documentElement;
    var next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next;
    try { localStorage.setItem('bgm_theme_v1', next); } catch (e) {}
    toast('已切换为「' + (next === 'dark' ? '曜石深色' : '流光浅色') + '」光影模式');
  }

  function syncThemeAndAccent() {
    try {
      var savedTheme = localStorage.getItem('bgm_theme_v1');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        document.documentElement.dataset.theme = savedTheme;
      }
      var savedAccent = localStorage.getItem('bgm_accent_v1');
      if (savedAccent && /^(pink|blue|amber|emerald|violet|slate)$/.test(savedAccent)) {
        document.documentElement.dataset.accent = savedAccent;
      }
    } catch (e) {}
  }

  function show(id) { var n = document.getElementById(id); if (n) n.hidden = false; }
  function hide(id) { var n = document.getElementById(id); if (n) n.hidden = true; }

  /* --------------------- 1. 补齐 #customizeModal（user.html） --------------------- */
  function ensureCustomizeModal() {
    if (document.getElementById('customizeModal')) return;
    var m = el('div', 'glass-modal-backdrop');
    m.id = 'customizeModal'; m.hidden = true;
    m.innerHTML =
      '<div class="frosted-modal-dialog" role="dialog" aria-labelledby="customizeModalTitle">' +
        '<header class="modal-head"><div>' +
          '<span class="modal-kicker">AMBIENT GLASS ENGINE</span>' +
          '<h3 id="customizeModalTitle">✨ 外观、主题色与组件设置</h3>' +
        '</div><button type="button" class="ep-pop-close" data-bsh-act="close-customize">✕</button></header>' +
        '<div class="modal-body">' +
          '<div class="form-block"><label class="form-label">光影模式 (Theme Mode)</label>' +
            '<div class="theme-choice-grid">' +
              '<button type="button" class="choice-pill is-selected" onclick="document.documentElement.dataset.theme=\'light\';this.classList.add(\'is-selected\');this.nextElementSibling.classList.remove(\'is-selected\');">☀️ 流光浅色 (宣纸白毛玻璃)</button>' +
              '<button type="button" class="choice-pill" onclick="document.documentElement.dataset.theme=\'dark\';this.classList.add(\'is-selected\');this.previousElementSibling.classList.remove(\'is-selected\');">🌙 曜石深色 (午夜霓虹玻璃)</button>' +
            '</div></div>' +
          '<div class="form-block"><label class="form-label">品牌强调色 (Accent Color)</label>' +
            '<div class="theme-choice-grid">' +
              '<button type="button" class="choice-pill is-selected" onclick="document.documentElement.dataset.accent=\'pink\';">🌸 番组珊瑚粉</button>' +
              '<button type="button" class="choice-pill" onclick="document.documentElement.dataset.accent=\'blue\';">💎 晴空湛蓝</button>' +
              '<button type="button" class="choice-pill" onclick="document.documentElement.dataset.accent=\'amber\';">🍊 琥珀暖金</button>' +
              '<button type="button" class="choice-pill" onclick="document.documentElement.dataset.accent=\'emerald\';">🌿 翡翠薄荷</button>' +
            '</div></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
  }

  /* --------------------- 2. 3-Tab 增强（通用 / 超合金 / API Cache） --------------------- */
  function upgradeCustomizeModal() {
    var m = document.getElementById('customizeModal');
    if (!m) return;
    var body = m.querySelector('.modal-body');
    if (!body || body.querySelector('.bsh-modal-tabs')) return; // 幂等

    var dlg = m.querySelector('.frosted-modal-dialog');
    if (dlg) dlg.classList.add('bsh-dialog-wide');

    // 前置 Tab 条
    var tabs = el('div', 'bsh-modal-tabs',
      '<button type="button" class="bsh-modal-tab is-active" data-bsh-tab="general">⚙️ 通用</button>' +
      '<button type="button" class="bsh-modal-tab" data-bsh-tab="alloy">🧩 超合金</button>' +
      '<button type="button" class="bsh-modal-tab" data-bsh-tab="cache">📡 API Cache</button>');
    body.insertBefore(tabs, body.firstChild);

    // 标记既有的 form-block 为「通用」面板内容（保留它们原有的事件绑定）
    Array.prototype.forEach.call(body.querySelectorAll('.form-block'), function (f) {
      f.setAttribute('data-bsh-general', '');
    });

    // 超合金组件市场
    var items = MARKET.map(function (it) {
      return '<div class="bsh-market-item">' +
        '<span class="bsh-market-ico">' + it.ico + '</span>' +
        '<span class="bsh-market-txt"><b>' + esc(it.name) + '</b><small>' + esc(it.desc) + '</small></span>' +
        '<button type="button" class="bsh-market-try" data-bsh-try="' + it.act + '">试一试</button>' +
      '</div>';
    }).join('');
    var alloy = el('div', 'bsh-modal-panel');
    alloy.setAttribute('data-bsh-panel', 'alloy'); alloy.hidden = true;
    alloy.innerHTML =
      '<p class="bsh-market-note">下面是 A2 共享壳层内置组件（点击「试一试」直接唤起），已与 <a href="settings.html?tab=gadgets" style="color:var(--accent);font-weight:700;text-decoration:underline;">🧩 超合金组件市场 (/settings/gadgets)</a> 双向联动（<span id="bshAlloySyncCount">10/16 已启用</span>）。</p>' +
      '<div class="bsh-market">' + items + '</div>';

    // API Cache
    var cache = el('div', 'bsh-modal-panel');
    cache.setAttribute('data-bsh-panel', 'cache'); cache.hidden = true;
    cache.innerHTML =
      '<p class="bsh-market-note">原型页为纯静态离线预览，以下为全站 29 类页面本地数据层读数（非真实请求）。</p>' +
      '<div class="bsh-cache-grid">' +
        '<div class="bsh-cache-cell"><small>命中率 HIT</small><b>100%</b></div>' +
        '<div class="bsh-cache-cell"><small>覆盖页面</small><b>29/29</b></div>' +
        '<div class="bsh-cache-cell"><small>数据包</small><b>19 份</b></div>' +
      '</div>' +
      '<p class="bsh-market-note">全站 31 张 HTML 原型共享统一壳层状态（<code>bgm_theme_v1</code> / <code>bgm_accent_v1</code> / <code>bgm_auth_state_v1</code> / <code>bgm_notify_state_v1</code> / <code>bgm_settings_state_v1</code>）。图片域名 lain.bgm.tv 均带 no-referrer。</p>';

    body.appendChild(alloy);
    body.appendChild(cache);
  }

  function setModalTab(name) {
    state.tab = name;
    var m = document.getElementById('customizeModal');
    if (!m) return;
    Array.prototype.forEach.call(m.querySelectorAll('.bsh-modal-tab'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-bsh-tab') === name);
    });
    Array.prototype.forEach.call(m.querySelectorAll('[data-bsh-general]'), function (f) {
      f.hidden = name !== 'general';
    });
    Array.prototype.forEach.call(m.querySelectorAll('[data-bsh-panel]'), function (p) {
      p.hidden = p.getAttribute('data-bsh-panel') !== name;
    });
  }

  /* --------------------- 3. 补齐四列页脚（user.html 缺 footer） --------------------- */
  var FOOTER_COLS = [
    { h: '关于我们', links: [['关于我们', 'https://bgm.tv/about'], ['社区指导原则', 'https://bgm.tv/about/guideline'], ['版权声明', 'https://bgm.tv/about/copyright'], ['链接我们', 'https://bgm.tv/about/link2us']] },
    { h: '获取帮助', links: [['BBCode 指南', 'https://bgm.tv/help/bbcode'], ['站务论坛', 'group.html?mode=home&name=forum'], ['番组开发', 'group.html?mode=home&name=dev'], ['BUG 追踪', 'group.html?mode=home&name=issues']] },
    { h: '特别推荐', links: [['年鉴 2025', 'https://bgm.tv/award/2025'], ['onAir 客户端', 'https://bgm.tv/onair'], ['etokei 绘时计', 'rakuen.html#channel=tokei'], ['番組 WIKI 計画', 'group.html?mode=home&name=wiki']] },
    { h: '更多探索', links: [['开发者平台', 'settings.html?tab=gadgets'], ['目录', 'catalog.html'], ['维基人', 'explore.html?mode=wiki'], ['MAGI 问答', 'explore.html?mode=magi'], ['Dollars', 'explore.html?mode=dollars']] }
  ];

  function footerGridHtml() {
    return FOOTER_COLS.map(function (c) {
      return '<div class="footer-col"><h4>' + esc(c.h) + '</h4>' +
        c.links.map(function (l) {
          var ext = String(l[1] || '').indexOf('http') === 0;
          return '<a href="' + l[1] + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l[0]) + '</a>';
        }).join('') + '</div>';
    }).join('');
  }

  function mountFooterLinks(target) {
    var host = typeof target === 'string' ? document.getElementById(target) : target;
    if (!host) return;
    host.classList.add('bsh-footer-injected');
    host.innerHTML = '<div class="footer-grid">' + footerGridHtml() + '</div>';
  }

  function ensureFooter() {
    if (document.getElementById('footer')) return;
    var f = el('footer', 'glass-footer');
    f.id = 'footer';
    f.innerHTML =
      '<div class="footer-grid">' + footerGridHtml() + '</div>' +
      '<div class="footer-bottom">' +
        '<span>© 2008-2026 Bangumi (a.k.a. Chobits) · Shared Editorial Liquid Glass Shell</span>' +
        '<a href="index.html" style="color:var(--accent);text-decoration:none;font-weight:700;">🏠 返回主页原型</a>' +
      '</div>';
    document.body.appendChild(f);
  }

  /* --------------------- 4. 底部灵动岛 Dock --------------------- */
  function injectDock() {
    if (document.getElementById('bsh-dock')) return;
    var d = el('nav', 'bsh-dock');
    d.id = 'bsh-dock';
    d.setAttribute('aria-label', '全局灵动岛');
    var acts = [
      ['notify', '🔔', '电波提醒 · /notify/all'],
      ['pm', '✉️', '站内短信 · /pm'],
      ['settings', '⚙️', '个人设置 · /settings'],
      ['theme', '🌗', '开关灯'],
      ['logout', '↪️', '登出'],
      ['customize', '🎨', '个性化设置'],
      ['robot', '🐣', '显示 / 隐藏春菜']
    ];
    d.innerHTML =
      '<a class="bsh-dock-btn bsh-dock-user" href="user.html" data-bsh-tip="个人时光机">' +
        '<img class="bsh-dock-ava" src="' + AVATAR + '" alt="' + USER + '" referrerpolicy="no-referrer" />' +
        '<span class="bsh-dock-name">' + esc(USER) + '</span>' +
      '</a>' +
      '<span class="bsh-dock-sep"></span>' +
      acts.map(function (a) {
        var badge = (a[0] === 'notify' || a[0] === 'pm')
          ? '<span class="bsh-dock-badge" data-bsh-badge="' + a[0] + '" hidden>0</span>'
          : '';
        return '<button type="button" class="bsh-dock-btn" data-bsh-act="' + a[0] + '" data-bsh-tip="' + esc(a[2]) + '">' + a[1] + badge + '</button>';
      }).join('');
    document.body.appendChild(d);
    document.documentElement.classList.add('bsh-has-dock');
  }

  /* --------------------- 5. 伪春菜 --------------------- */
  function injectRobot() {
    if (document.getElementById('bsh-robot')) return;
    var r = el('div', 'bsh-robot');
    r.id = 'bsh-robot';
    var greeting = '主人，Bangumi 全站 <strong>29 类页面（31 张原型）</strong> 已经 100% 全部建齐啦～<br />' +
      '共享壳层（Dock / 收藏盒 / 贴贴 / 表情 / 超合金 / 探索实验室）全线互通 ✨';
    var enabled = true;
    try {
      var raw = localStorage.getItem('bgm_settings_state_v1');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.ukagaka) {
          if (parsed.ukagaka.customGreeting) greeting = esc(parsed.ukagaka.customGreeting);
          if (typeof parsed.ukagaka.enabled === 'boolean') enabled = parsed.ukagaka.enabled;
        }
      }
    } catch (e) {}
    r.hidden = !enabled;
    r.innerHTML =
      '<div class="bsh-robot-bubble" id="bshRobotBubble">' +
        greeting +
        '<small class="bsh-robot-sub">UKAGAKA SHELL · 点击小电视换一句</small>' +
      '</div>' +
      '<div class="bsh-robot-body" data-bsh-act="robot-say" title="点我">📺</div>';
    document.body.appendChild(r);
  }

  var ROBOT_LINES = [
    '主人，<strong>分类浏览页</strong>收录了 120 条真实排行数据哦～',
    '书籍还分「系列」和「单行本」两种形态，已经全部适配啦 📚',
    '评分一律是<strong>十颗星 + 数字</strong>，不用再猜半颗星了 ⭐',
    'topbar 的小电视会轻轻缩放，但不会再变成粉色了 📺',
    '全站 29 类页面已经 100% 全部完工！点击顶栏胶囊或探索菜单随时穿梭 🧭'
  ];

  /* --------------------- 6. 收藏评分盒 ThickBox --------------------- */
  function starsHtml(n) {
    var out = '';
    for (var i = 1; i <= 10; i++) {
      out += '<span class="bsh-star' + (i <= n ? ' is-on' : '') + '" data-bsh-star="' + i + '">' + (i <= n ? '★' : '☆') + '</span>';
    }
    return out;
  }

  function syncStars() {
    var box = document.getElementById('bshStars');
    if (!box) return;
    var out = '';
    for (var i = 1; i <= 10; i++) {
      out += '<span class="bsh-star' + (i <= state.score ? ' is-on' : '') + '" data-bsh-star="' + i + '">' + (i <= state.score ? '★' : '☆') + '</span>';
    }
    out += '<strong class="bsh-score">' + state.score + '</strong><span class="bsh-score-hint">/ 10 星</span>';
    box.innerHTML = out;
  }

  function injectCollect() {
    if (document.getElementById('bsh-collect-modal')) return;
    var states = ['想看', '看过', '在看', '搁置', '抛弃'];
    var m = el('div', 'glass-modal-backdrop');
    m.id = 'bsh-collect-modal'; m.hidden = true;
    m.innerHTML =
      '<div class="frosted-modal-dialog" role="dialog" aria-labelledby="bshCollectTitle">' +
        '<header class="modal-head"><div>' +
          '<span class="modal-kicker">COLLECT BOX · THICKBOX</span>' +
          '<h3 id="bshCollectTitle">📦 收藏评分盒</h3>' +
        '</div><button type="button" class="ep-pop-close" data-bsh-close="bsh-collect-modal">✕</button></header>' +
        '<form id="bshCollectForm" class="modal-body bsh-collect-body">' +
          '<div class="form-block"><label class="form-label">收藏状态（五态单选）</label>' +
            '<div class="collect-state-radios">' +
              states.map(function (s, i) {
                return '<label class="state-radio-pill' + (i === 0 ? ' is-checked' : '') + '" data-bsh-collect-pill="' + esc(s) + '">' +
                  '<input type="radio" name="collect" value="' + esc(s) + '"' + (i === 0 ? ' checked' : '') + ' />' + esc(s) + '</label>';
              }).join('') +
            '</div></div>' +
          '<div class="form-block"><label class="form-label">十星评分（传统十颗星 + 数字）</label>' +
            '<div class="bsh-stars" id="bshStars">' + starsHtml(0) +
              '<strong class="bsh-score">0</strong><span class="bsh-score-hint">/ 10 星</span>' +
            '</div></div>' +
          '<div class="form-block"><label class="form-label">标签</label>' +
            '<input class="glass-text-input" id="bshCollectTags" placeholder="用空格分隔，例如：神作 治愈 补番" /></div>' +
          '<div class="form-block"><label class="form-label">吐槽</label>' +
            '<textarea class="glass-text-input bsh-textarea" id="bshCollectComment" placeholder="写点什么吧……"></textarea></div>' +
          '<label class="bsh-privacy"><input type="checkbox" id="bshCollectPrivacy" /> 仅自己可见（隐私收藏）</label>' +
          '<div class="modal-foot">' +
            '<span class="bsh-foot-note">#collectBoxForm · 五态 / 十星 / 标签 / 吐槽 / 隐私</span>' +
            '<div class="modal-btn-group">' +
              '<button type="button" class="glass-pill-btn" data-bsh-close="bsh-collect-modal">取消</button>' +
              '<button type="submit" class="primary-glow-btn bsh-primary-btn">保存收藏</button>' +
            '</div>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(m);
  }

  /* --------------------- 7. 章节进度气泡 / 贴贴 / 表情 --------------------- */
  function floatHead(title, id) {
    return '<div class="bsh-float-head"><span class="bsh-float-title">' + esc(title) + '</span>' +
      '<button type="button" class="bsh-float-x" data-bsh-close="' + id + '">✕</button></div>';
  }

  function injectCluetip() {
    if (document.getElementById('bsh-cluetip')) return;
    var n = el('div', 'bsh-float bsh-cluetip');
    n.id = 'bsh-cluetip'; n.hidden = true;
    n.innerHTML = floatHead('章节进度 · prg_popup', 'bsh-cluetip') +
      '<div class="bsh-clue-grid">' +
        '<button class="bsh-clue-btn" data-bsh-clue="Watched_">✓ 看过</button>' +
        '<button class="bsh-clue-btn" data-bsh-clue="WatchedTill_">▸ 看到这</button>' +
        '<button class="bsh-clue-btn" data-bsh-clue="Queue_">＋ 想看</button>' +
        '<button class="bsh-clue-btn" data-bsh-clue="Drop_">⤵ 搁置</button>' +
        '<button class="bsh-clue-btn" data-bsh-clue="remove_">✕ 撤销</button>' +
        '<button class="bsh-clue-btn" data-bsh-close="bsh-cluetip">关闭</button>' +
      '</div>' +
      '<div class="bsh-float-note">Watched_ / WatchedTill_ / Queue_ / Drop_ / remove_</div>';
    document.body.appendChild(n);
  }

  function injectLike() {
    if (document.getElementById('bsh-like')) return;
    var emo = ['👍', '❤️', '😂', '😭', '🎉', '🤝', '🔥', '🫶'];
    var n = el('div', 'bsh-float bsh-like');
    n.id = 'bsh-like'; n.hidden = true;
    n.innerHTML = floatHead('贴贴 · like_dropdown', 'bsh-like') +
      '<div class="bsh-like-grid">' +
        emo.map(function (e) { return '<button class="bsh-like-emoji" data-bsh-like="' + e + '">' + e + '</button>'; }).join('') +
      '</div>' +
      '<div class="bsh-likes-grid" id="bshLikesGrid"></div>' +
      '<div class="bsh-float-note">.like_dropdown[data-like-type] · .likes_grid 回显</div>';
    document.body.appendChild(n);
  }

  function syncLikes() {
    var g = document.getElementById('bshLikesGrid');
    if (!g) return;
    g.innerHTML = state.likes.length
      ? state.likes.map(function (x) { return '<span class="bsh-likes-chip">' + esc(x) + ' 少年游</span>'; }).join('')
      : '<span class="bsh-float-note" style="margin:0">还没有人贴贴，点上面的表情试试～</span>';
  }

  function injectSmiley() {
    if (document.getElementById('bsh-smiley')) return;
    var n = el('div', 'bsh-float bsh-smiley');
    n.id = 'bsh-smiley'; n.hidden = true;
    var tabs = Object.keys(EMOJI).map(function (k) {
      return '<button class="bsh-emoji-tab' + (k === state.emojiTab ? ' is-active' : '') + '" data-bsh-emoji-tab="' + k + '">' + k + '</button>';
    }).join('');
    n.innerHTML = floatHead('BBCode 工具栏 · markItUp', 'bsh-smiley') +
      '<div class="bsh-bbcode-bar">' +
        ['B', 'I', 'U', 'S', 'URL', 'IMG', 'QUOTE', 'MASK', 'CODE'].map(function (b) {
          return '<button class="bsh-bbcode-btn" data-bsh-bbcode="' + b + '">' + b + '</button>';
        }).join('') +
      '</div>' +
      '<div class="bsh-emoji-tabs">' + tabs + '</div>' +
      '<div class="bsh-emoji-grid" id="bshEmojiGrid"></div>' +
      '<div class="bsh-float-note">6 组 · 440+ 表情库代表性样本（bgm_tv / bgm_vs / bgm_tv_500 / bgm / musume / blake）</div>';
    document.body.appendChild(n);
    syncEmoji();
  }

  function syncEmoji() {
    var g = document.getElementById('bshEmojiGrid');
    if (!g) return;
    g.innerHTML = (EMOJI[state.emojiTab] || []).map(function (e) {
      return '<button class="bsh-emoji-cell" data-bsh-emoji="' + esc(e) + '" title="' + esc(e) + '">' + esc(e) + '</button>';
    }).join('');
  }

  /* --------------------- 8. 分页器（公共 API） --------------------- */
  function pagerHtml(page, total) {
    var out = '<button class="bsh-page-btn' + (page <= 1 ? ' is-disabled' : '') + '" data-bsh-page="' + (page - 1) + '">‹</button>';
    var list = [];
    for (var i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - page) <= 1) list.push(i);
      else if (list[list.length - 1] !== '…') list.push('…');
    }
    list.forEach(function (i) {
      out += i === '…'
        ? '<span class="bsh-page-ellipsis">…</span>'
        : '<button class="bsh-page-btn' + (i === page ? ' p_cur' : '') + '" data-bsh-page="' + i + '">' + i + '</button>';
    });
    out += '<button class="bsh-page-btn' + (page >= total ? ' is-disabled' : '') + '" data-bsh-page="' + (page + 1) + '">›</button>';
    out += '<span class="bsh-page-info">第 ' + page + ' / ' + total + ' 页</span>';
    return out;
  }

  function mountPager(target, opts) {
    var host = typeof target === 'string' ? document.getElementById(target) : target;
    if (!host) return;
    opts = opts || {};
    var page = opts.page || 1, total = opts.total || 8;
    host.classList.add('bsh-pager');
    host.innerHTML = pagerHtml(page, total);
    host.setAttribute('data-bsh-pager-total', total);
    if (typeof opts.onChange === 'function') host._bshOnChange = opts.onChange;
  }

  function openPagerDemo() {
    var n = document.getElementById('bsh-pager-demo');
    if (!n) {
      n = el('div', 'bsh-float bsh-pager-demo');
      n.id = 'bsh-pager-demo';
      n.innerHTML = floatHead('分页器 · page_inner', 'bsh-pager-demo') +
        '<div class="bsh-pager" id="bshPagerHost"></div>' +
        '<div class="bsh-float-note">BgmShell.mountPager(el, { page, total, onChange }) · 供 P05/P13/P16/P20 复用</div>';
      document.body.appendChild(n);
      mountPager('bshPagerHost', {
        page: 3, total: 8, onChange: function (p) { toast('翻到第 ' + p + ' 页'); }
      });
    }
    n.hidden = false;
  }

  /* --------------------- 9. 事件绑定（单一委托，全部 bsh- 前缀） --------------------- */
  function bind() {
    document.addEventListener('click', function (ev) {
      // 同步记录页面既有 #btnThemeToggle 与 #customizeModal 主题/强调色选择到 localStorage
      var rawTarget = ev.target;
      if (rawTarget && rawTarget.closest) {
        var themeToggleBtn = rawTarget.closest('#btnThemeToggle,.choice-pill,[data-theme-opt],[data-accent-opt]');
        if (themeToggleBtn) {
          setTimeout(function () {
            try {
              var curT = document.documentElement.dataset.theme;
              var curA = document.documentElement.dataset.accent;
              if (curT) localStorage.setItem('bgm_theme_v1', curT);
              if (curA) localStorage.setItem('bgm_accent_v1', curA);
            } catch (e) {}
          }, 0);
        }
      }
      var t = ev.target.closest ? ev.target.closest('[data-bsh-act],[data-bsh-tab],[data-bsh-close],[data-bsh-try],[data-bsh-collect-pill],[data-bsh-star],[data-bsh-clue],[data-bsh-like],[data-bsh-emoji-tab],[data-bsh-emoji],[data-bsh-bbcode],[data-bsh-page]') : null;
      if (!t) return;

      // 关闭按钮
      if (t.hasAttribute('data-bsh-close')) { hide(t.getAttribute('data-bsh-close')); return; }

      // Dock 动作
      if (t.hasAttribute('data-bsh-act')) {
        var act = t.getAttribute('data-bsh-act');
        if (act === 'notify') {
          if (!window.__BSH_NO_REDIRECT__) window.location.href = 'notify.html';
          else toast('已触发电波提醒入口 (notify.html)');
        } else if (act === 'pm') {
          if (!window.__BSH_NO_REDIRECT__) window.location.href = 'notify.html?tab=inbox';
          else toast('已触发站内短信入口 (notify.html?tab=inbox)');
        }
        else if (act === 'settings') {
          if (!window.__BSH_NO_REDIRECT__) window.location.href = 'settings.html';
          else toast('已触发个人设置入口 (settings.html)');
        }
        else if (act === 'theme') toggleTheme();
        else if (act === 'logout') {
          if (readAuth().loggedIn) logout();
          else if (!window.__BSH_NO_REDIRECT__) window.location.href = 'auth.html?mode=login';
        }
        else if (act === 'customize') { setModalTab('general'); openCustomize(); }
        else if (act === 'robot') {
          var r = document.getElementById('bsh-robot');
          if (r) { r.hidden = !r.hidden; toast(r.hidden ? '春菜已隐藏' : '春菜回来啦'); }
        } else if (act === 'robot-say') {
          var b = document.getElementById('bshRobotBubble');
          if (b) b.innerHTML = ROBOT_LINES[Math.floor(Math.random() * ROBOT_LINES.length)] +
            '<small class="bsh-robot-sub">UKAGAKA SHELL · 点击小电视换一句</small>';
        } else if (act === 'close-customize') closeCustomize();
        return;
      }

      // 个性化 Tab
      if (t.hasAttribute('data-bsh-tab')) { setModalTab(t.getAttribute('data-bsh-tab')); return; }

      // 超合金「试一试」
      if (t.hasAttribute('data-bsh-try')) {
        var what = t.getAttribute('data-bsh-try');
        closeCustomize();
        if (what === 'collect') openCollect();
        else if (what === 'like') { syncLikes(); show('bsh-like'); }
        else if (what === 'smiley') show('bsh-smiley');
        else if (what === 'cluetip') show('bsh-cluetip');
        else if (what === 'pager') openPagerDemo();
        return;
      }

      // 收藏五态
      if (t.hasAttribute('data-bsh-collect-pill')) {
        var v = t.getAttribute('data-bsh-collect-pill');
        state.collect = v;
        var f = document.getElementById('bshCollectForm');
        if (f) {
          Array.prototype.forEach.call(f.querySelectorAll('.state-radio-pill'), function (p) {
            p.classList.toggle('is-checked', p.getAttribute('data-bsh-collect-pill') === v);
          });
        }
        return;
      }

      // 十星评分
      if (t.hasAttribute('data-bsh-star')) { state.score = parseInt(t.getAttribute('data-bsh-star'), 10); syncStars(); return; }

      // 进度气泡
      if (t.hasAttribute('data-bsh-clue')) { toast('进度已标记：' + t.textContent.trim() + ' · ' + t.getAttribute('data-bsh-clue')); hide('bsh-cluetip'); return; }

      // 贴贴
      if (t.hasAttribute('data-bsh-like')) {
        var e = t.getAttribute('data-bsh-like');
        if (state.likes.indexOf(e) < 0) state.likes.push(e);
        syncLikes(); toast('已贴贴 ' + e); return;
      }

      // 表情分组
      if (t.hasAttribute('data-bsh-emoji-tab')) {
        state.emojiTab = t.getAttribute('data-bsh-emoji-tab');
        Array.prototype.forEach.call(document.querySelectorAll('.bsh-emoji-tab'), function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-bsh-emoji-tab') === state.emojiTab);
        });
        syncEmoji(); return;
      }
      if (t.hasAttribute('data-bsh-emoji')) { toast('已插入表情 ' + t.getAttribute('data-bsh-emoji')); hide('bsh-smiley'); return; }
      if (t.hasAttribute('data-bsh-bbcode')) { toast('已插入 BBCode [' + t.getAttribute('data-bsh-bbcode').toLowerCase() + ']…[/' + t.getAttribute('data-bsh-bbcode').toLowerCase() + ']'); return; }

      // 分页
      if (t.hasAttribute('data-bsh-page')) {
        var host = t.closest('.bsh-pager');
        if (!host) return;
        var total = parseInt(host.getAttribute('data-bsh-pager-total'), 10) || 8;
        var p = parseInt(t.getAttribute('data-bsh-page'), 10);
        if (p < 1 || p > total) return;
        host.innerHTML = pagerHtml(p, total);
        if (typeof host._bshOnChange === 'function') host._bshOnChange(p);
        return;
      }
    });

    // 收藏表单提交
    document.addEventListener('submit', function (ev) {
      if (!ev.target || ev.target.id !== 'bshCollectForm') return;
      ev.preventDefault();
      var tags = (document.getElementById('bshCollectTags') || {}).value || '';
      var priv = (document.getElementById('bshCollectPrivacy') || {}).checked;
      hide('bsh-collect-modal');
      toast('已收藏「' + (state.collect || '想看') + '」· ' + state.score + ' 星' + (tags ? ' · ' + tags : '') + (priv ? ' · 仅自己可见' : ''));
    });

    // 顶栏搜索统一路由到 search.html?q=…（capture 阶段，先于各页自身的 in-page 过滤）
    document.addEventListener('submit', function (ev) {
      var f = ev.target;
      if (!f || f.id !== 'headerSearch') return;
      ev.preventDefault();
      ev.stopPropagation();
      var inp = f.querySelector('input[type="search"]') || f.querySelector('input[name="search_text"]') || f.querySelector('input[type="text"]');
      var q = inp ? String(inp.value || '').trim() : '';
      if (!q) { toast('请先输入要搜索的关键词'); return; }
      location.href = 'search.html?q=' + encodeURIComponent(q);
    }, true);

    // Esc 关闭所有 bsh 浮动层
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      ['bsh-collect-modal', 'bsh-cluetip', 'bsh-like', 'bsh-smiley', 'bsh-pager-demo', 'customizeModal'].forEach(hide);
    });
  }

  /* --------------------- 10. 对外 API --------------------- */
  function openCollect() {
    state.score = 0; state.collect = '想看';
    syncStars();
    var f = document.getElementById('bshCollectForm');
    if (f) {
      Array.prototype.forEach.call(f.querySelectorAll('.state-radio-pill'), function (p) {
        p.classList.toggle('is-checked', p.getAttribute('data-bsh-collect-pill') === '想看');
      });
      var c = document.getElementById('bshCollectComment'); if (c) c.value = '';
      var tg = document.getElementById('bshCollectTags'); if (tg) tg.value = '';
      var pr = document.getElementById('bshCollectPrivacy'); if (pr) pr.checked = false;
    }
    show('bsh-collect-modal');
  }

  function syncNotifyBadges() {
    var counts = { unreadNotify: 4, unreadPm: 2 };
    try {
      var raw = localStorage.getItem('bgm_notify_state_v1');
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.unreadNotify === 'number') counts.unreadNotify = p.unreadNotify;
        if (p && typeof p.unreadPm === 'number') counts.unreadPm = p.unreadPm;
      }
    } catch (e) {}
    var bN = document.querySelector ? document.querySelector('[data-bsh-badge="notify"]') : null;
    var bP = document.querySelector ? document.querySelector('[data-bsh-badge="pm"]') : null;
    if (bN) {
      bN.textContent = counts.unreadNotify > 99 ? '99+' : String(counts.unreadNotify);
      bN.hidden = counts.unreadNotify <= 0;
    }
    if (bP) {
      bP.textContent = counts.unreadPm > 99 ? '99+' : String(counts.unreadPm);
      bP.hidden = counts.unreadPm <= 0;
    }
  }

  function syncGadgets() {
    var enabledCnt = 10, totalCnt = 16;
    try {
      var raw = localStorage.getItem('bgm_settings_state_v1');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.gadgets)) {
          totalCnt = parsed.gadgets.length;
          enabledCnt = parsed.gadgets.filter(function (g) { return !!g.enabled; }).length;
        }
      }
    } catch (e) {}
    var elCnt = document.getElementById('bshAlloySyncCount');
    if (elCnt) elCnt.textContent = enabledCnt + '/' + totalCnt + ' 已启用';
  }

  window.BgmShell = {
    toast: toast,
    openCollect: openCollect,
    openCustomize: openCustomize,
    closeCustomize: closeCustomize,
    toggleTheme: toggleTheme,
    openLike: function () { syncLikes(); show('bsh-like'); },
    openSmiley: function () { show('bsh-smiley'); },
    openCluetip: function () { show('bsh-cluetip'); },
    openPagerDemo: openPagerDemo,
    mountPager: mountPager,
    mountFooterLinks: mountFooterLinks,
    setModalTab: setModalTab,
    readAuth: readAuth,
    syncAuth: syncAuth,
    logout: logout,
    syncNotifyBadges: syncNotifyBadges,
    syncGadgets: syncGadgets,
    syncThemeAndAccent: syncThemeAndAccent,
    version: 'A2.5'
  };

  /* --------------------- 11. 启动 --------------------- */
  function init() {
    if (BOOTED) return;
    BOOTED = true;
    syncThemeAndAccent();
    ensureCustomizeModal();
    upgradeCustomizeModal();
    ensureFooter();
    injectDock();
    injectRobot();
    injectCollect();
    injectCluetip();
    injectLike();
    injectSmiley();
    bind();
    syncStars();
    syncLikes();
    syncAuth();
    syncNotifyBadges();
    syncGadgets();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
