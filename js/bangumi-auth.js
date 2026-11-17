/* ==========================================================================
   Bangumi Redesign - Page 02: 未登录首页 / 登录 / 注册 / 找回密码 (auth.html)
   URL routing: ?mode=guest|login|signup|reset&referer=&from=
   Shared auth session key: localStorage['bgm_auth_state_v1']
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.BANGUMI_AUTH_DATA || {
    meta: {},
    heroSlides: [],
    featuredChannels: [],
    liveTimeline: [],
    calendarDays: [],
    announcements: [],
    regSources: [],
    streamingLinks: [],
    demoAccounts: []
  };

  var AUTH_KEY = 'bgm_auth_state_v1';
  var USERS_KEY = 'bgm_auth_registered_users_v1';

  var DEFAULT_USER = {
    loggedIn: true,
    uid: '553488',
    nickname: '少年游',
    email: 'sy@bgm.tv',
    avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1'
  };

  var state = {
    mode: 'guest', // guest | login | signup | reset
    slideIdx: 0,
    calDayIdx: 0,
    signupStep: 'select', // select | alert | form
    captchaCode: 'BGM7',
    referer: ''
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

  function readAuthState() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : Object.assign({}, DEFAULT_USER);
    } catch (e) {
      return Object.assign({}, DEFAULT_USER);
    }
  }

  function writeAuthState(obj) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function readRegisteredUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeRegisteredUsers(arr) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
    } catch (e) {}
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
    }, 2600);
  }

  function tenStarsHtml(score) {
    var num = Number(score);
    if (!num || isNaN(num)) return '';
    var filled = Math.max(0, Math.min(10, Math.round(num)));
    var stars = '';
    for (var i = 0; i < 10; i++) stars += i < filled ? '★' : '☆';
    return (
      '<span class="bau-stars-line" title="Bangumi 十星制评分 ' + esc(num.toFixed(1)) + ' / 10">' +
      '<span class="bau-stars-glyph">' + stars + '</span>' +
      '<span class="bau-stars-num">' + esc(num.toFixed(1)) + '</span>' +
      '</span>'
    );
  }

  function genCaptchaCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 4; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    state.captchaCode = out;
    return out;
  }

  function captchaSvgHtml(code) {
    var c = esc(code || state.captchaCode);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="40" viewBox="0 0 128 40">' +
        '<rect width="128" height="40" rx="10" fill="rgba(240,145,153,0.12)" />' +
        '<path d="M8 28 Q 42 6, 76 26 T 120 12" stroke="rgba(54,156,248,0.45)" stroke-width="1.6" fill="none" />' +
        '<path d="M12 12 Q 54 34, 92 14 T 122 28" stroke="rgba(240,145,153,0.55)" stroke-width="1.4" fill="none" />' +
        '<text x="64" y="27" text-anchor="middle" font-family="ui-monospace, monospace" font-size="20" font-weight="900" letter-spacing="5" fill="#f09199">' + c + '</text>' +
      '</svg>'
    );
  }

  function refreshCaptchaDom() {
    var code = genCaptchaCode();
    var box = $('captcha_img');
    if (box) box.innerHTML = captchaSvgHtml(code);
    var hint = $('bauCaptchaHint');
    if (hint) hint.textContent = '点击图片刷新（当前示例码：' + code + '）';
  }

  function readUrlParams() {
    var sp = new URLSearchParams(window.location.search || '');
    var mode = (sp.get('mode') || 'guest').trim().toLowerCase();
    if (['guest', 'login', 'signup', 'reset'].indexOf(mode) === -1) mode = 'guest';
    state.mode = mode;
    state.referer = (sp.get('referer') || '').trim();
    if (sp.get('from') === 'logout') {
      writeAuthState({ loggedIn: false, lastUid: '553488' });
    }
  }

  function syncUrl(push) {
    var sp = new URLSearchParams();
    if (state.mode && state.mode !== 'guest') sp.set('mode', state.mode);
    if (state.referer) sp.set('referer', state.referer);
    var qs = sp.toString();
    var nextUrl = window.location.pathname + (qs ? '?' + qs : '');
    try {
      if (push) window.history.pushState({}, '', nextUrl);
      else window.history.replaceState({}, '', nextUrl);
    } catch (e) {}
  }

  function syncStatusBar() {
    var auth = readAuthState();
    var badge = $('bauStatusBadge');
    var txt = $('bauSessionStatusText');
    var tabs = $('bauModeTabs');
    var headerWrap = $('userAvatarWrap');

    if (badge) {
      badge.textContent = auth.loggedIn ? '✅ 已登录会话' : '🔑 GUEST & AUTH · P02';
    }
    if (txt) {
      txt.innerHTML = auth.loggedIn
        ? '当前会话已登录：<strong>' + esc(auth.nickname) + '</strong> · <a href="index.html" style="color:var(--accent);font-weight:700;text-decoration:none;">返回已登录首页 →</a> · <a href="javascript:void(0)" data-act="do-logout" style="color:var(--bau-muted);font-weight:700;text-decoration:none;">退出到游客态</a>'
        : '当前处于未登录预览态 · 可通过下方引导页或登录/注册表单切换登录闭环';
    }
    if (tabs) {
      Array.prototype.forEach.call(tabs.querySelectorAll('.bau-mode-tab'), function (a) {
        a.classList.toggle('is-active', a.getAttribute('data-mode') === state.mode);
      });
    }
    if (headerWrap) {
      if (auth.loggedIn) {
        headerWrap.className = 'um-wrap';
        headerWrap.innerHTML =
          '<a href="user.html?uid=' + esc(auth.uid || '553488') + '" class="user in" id="userAvatarBtn" title="' + esc(auth.nickname) + '">' +
            '<img src="' + esc(auth.avatar || DEFAULT_USER.avatar) + '" alt="' + esc(auth.nickname) + '" referrerpolicy="no-referrer" />' +
          '</a>';
      } else {
        headerWrap.className = 'idBadgerNeue';
        headerWrap.innerHTML =
          '<div class="guest">' +
            '<a href="auth.html?mode=login" class="guest login" data-act="switch-mode" data-mode="login">登录</a>' +
            '<a href="auth.html?mode=signup" class="guest signup" data-act="switch-mode" data-mode="signup">注册</a>' +
          '</div>';
      }
    }
    if (window.BgmShell && typeof window.BgmShell.syncAuth === 'function') {
      window.BgmShell.syncAuth();
    }
  }

  function completeLogin(userObj, msg) {
    var nextAuth = {
      loggedIn: true,
      uid: userObj.uid || '553488',
      nickname: userObj.nickname || '少年游',
      email: userObj.email || 'sy@bgm.tv',
      avatar: userObj.avatar || DEFAULT_USER.avatar
    };
    writeAuthState(nextAuth);
    syncStatusBar();
    showToast(msg || ('欢迎回来，' + nextAuth.nickname + '！正在进入 Bangumi 首页…'));
    var dest = state.referer || 'index.html';
    setTimeout(function () {
      if (!window.__BAU_NO_REDIRECT__) {
        window.location.href = dest;
      }
    }, 650);
  }

  function renderGuestHomeHtml() {
    var slides = DATA.heroSlides || [];
    var activeSlide = slides[state.slideIdx] || slides[0] || {
      tab: '探索',
      heading: '不断充实的资料库等你探索',
      lines: ['31278 部动画、425363 本书籍、118445 部游戏']
    };

    var navHtml = slides.map(function (s, idx) {
      return '<li class="' + (idx === state.slideIdx ? 'is-active' : '') + '" data-act="select-slide" data-idx="' + idx + '">' + esc(s.tab) + '</li>';
    }).join('');

    var demoBtns = (DATA.demoAccounts || []).map(function (acc) {
      return (
        '<button type="button" class="bau-demo-card" data-act="demo-login" data-uid="' + esc(acc.uid) + '">' +
          '<img src="' + esc(acc.avatar) + '" alt="' + esc(acc.nickname) + '" referrerpolicy="no-referrer" />' +
          '<div style="min-width:0;">' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--bau-ink);">' + esc(acc.nickname) + '</div>' +
            '<div style="font-size:11px;color:var(--bau-muted);">' + esc(acc.role) + '</div>' +
          '</div>' +
        '</button>'
      );
    }).join('');

    var heroHtml =
      '<div id="introWrapper">' +
        '<div id="intro" class="columns clearit">' +
          '<div id="columnIntroA" class="column">' +
            '<div class="bau-hero-head">' +
              '<div class="bau-musume-pill">📺 Bangumi 番组计划 · ACG 圣地与时光机档案</div>' +
              '<ul id="sliderNav" class="bau-slider-nav">' + navHtml + '</ul>' +
            '</div>' +
            '<div id="sliderSequence" class="bau-slide-stage">' +
              '<div class="bau-slide-copy">' +
                '<h2>' + esc(activeSlide.heading) + '</h2>' +
                (activeSlide.lines || []).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
                '<div class="bau-slide-actions signUp">' +
                  '<a href="auth.html?mode=signup" class="btnBlue bau-btn-blue" data-act="switch-mode" data-mode="signup">🌸 立即注册成为会员</a>' +
                  '<a href="channel.html?type=anime" class="btnGray bau-btn-gray">📺 先去逛逛五大频道 →</a>' +
                '</div>' +
              '</div>' +
              '<div class="bau-slide-stats">' +
                '<div class="bau-stat-tile"><strong>31,278+</strong><span>动画番组条目</span></div>' +
                '<div class="bau-stat-tile"><strong>425,363+</strong><span>书籍与漫画</span></div>' +
                '<div class="bau-stat-tile"><strong>118,445+</strong><span>全平台游戏</span></div>' +
                '<div class="bau-stat-tile"><strong>331,748+</strong><span>角色与现实人物</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="columnIntroB" class="column">' +
            '<div id="homeLoginPanel" data-login-panel-url="/login/panel">' +
              '<h3><span>🔑 登录至 Bangumi</span><a href="auth.html?mode=login" style="font-size:11.5px;color:var(--accent);text-decoration:none;" data-act="switch-mode" data-mode="login">完整登录页 ↗</a></h3>' +
              '<form id="loginForm" method="post" name="login" action="/FollowTheRabbit">' +
                '<div class="bau-form-group">' +
                  '<label for="email">Email 地址</label>' +
                  '<input id="email" name="email" class="inputtext bau-input" type="text" placeholder="sy@bgm.tv" />' +
                '</div>' +
                '<div class="bau-form-group">' +
                  '<label for="password">密码</label>' +
                  '<input id="password" name="password" class="inputtext bau-input" type="password" placeholder="任意演示密码（≥4位）" />' +
                '</div>' +
                '<div class="bau-btn-row">' +
                  '<input class="inputBtn bau-submit" type="submit" name="loginsubmit" value="登录" style="flex:1;" />' +
                  '<button type="button" class="passkeyLoginButton bau-passkey" data-act="passkey-login">🔐 Passkey</button>' +
                '</div>' +
              '</form>' +
              '<div style="font-size:11px;color:var(--bau-muted);margin-top:2px;">或一键使用演示账号体验已登录全站：</div>' +
              '<div class="bau-demo-accounts">' + demoBtns + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 5-channel featured cover wall
    var featHtml = (DATA.featuredChannels || []).map(function (ch) {
      var mains = (ch.mainItems || []).slice(0, 5).map(function (it) {
        return (
          '<a href="subject.html?id=' + esc(it.id) + '" class="bau-cover-card" title="' + esc(it.title) + '">' +
            '<div class="bau-cover-frame' + (it.isSquare ? ' is-square' : '') + '">' +
              '<img src="' + esc(it.cover) + '" alt="' + esc(it.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
            '</div>' +
            '<div class="bau-cover-title">' + esc(it.title) + '</div>' +
            '<div class="bau-cover-follow">' + esc(it.info) + '</div>' +
          '</a>'
        );
      }).join('');
      var subs = (ch.subItems || []).slice(0, 2).map(function (si) {
        return (
          '<a href="subject.html?id=' + esc(si.id) + '" class="bau-subitem-chip">' +
            '<img src="' + esc(si.cover) + '" alt="' + esc(si.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
            '<div style="min-width:0;">' +
              '<div style="font-size:12px;font-weight:700;color:var(--bau-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(si.title) + '</div>' +
              '<div style="font-size:11px;color:var(--bau-muted);">' + esc(si.info) + '</div>' +
            '</div>' +
          '</a>'
        );
      }).join('');
      return (
        '<li class="' + esc(ch.type) + ' clearit bau-channel-row">' +
          '<h3><a href="channel.html?type=' + esc(ch.type) + '">' + esc(ch.title) + '频道</a><a href="browser.html?type=' + esc(ch.type) + '" style="font-size:12px;color:var(--accent);">排行榜 »</a></h3>' +
          '<div class="bau-cover-grid">' + mains + '</div>' +
          (subs ? '<div class="bau-subitems-row">' + subs + '</div>' : '') +
        '</li>'
      );
    }).join('');

    // Sidebar: timeline preview + calendar mini + announcements + garage
    var tmlHtml = (DATA.liveTimeline || []).map(function (t) {
      return (
        '<li class="bau-tml-item">' +
          '<img src="' + esc(t.avatar) + '" alt="' + esc(t.user) + '" referrerpolicy="no-referrer" />' +
          '<div>' +
            '<a href="user.html?uid=' + esc(t.uid) + '">' + esc(t.user) + '</a> ' + esc(t.verb) + ' ' +
            '<a href="subject.html?id=' + esc(t.subjectId || '400602') + '">' + esc(t.subjectName) + '</a>' +
            (t.score ? ' <div>' + tenStarsHtml(t.score) + '</div>' : '') +
          '</div>' +
        '</li>'
      );
    }).join('');

    var calDays = DATA.calendarDays || [];
    var activeCal = calDays[state.calDayIdx] || calDays[0] || { label: '今天', items: [] };
    var calItemsHtml = (activeCal.items || []).slice(0, 12).map(function (ci) {
      return (
        '<a href="subject.html?id=' + esc(ci.id) + '" title="' + esc(ci.title) + '">' +
          '<img src="' + esc(ci.cover) + '" alt="' + esc(ci.title) + '" loading="lazy" referrerpolicy="no-referrer" />' +
        '</a>'
      );
    }).join('');

    var annHtml = (DATA.announcements || []).map(function (an) {
      return '<li><a href="' + esc(an.href) + '">' + esc(an.text) + '</a></li>';
    }).join('');

    return (
      heroHtml +
      '<div id="main" class="png_bg">' +
        '<div class="columns clearit bau-home-columns">' +
          '<div id="columnHomeA" class="column">' +
            '<section class="bau-card">' +
              '<div class="bau-section-head">' +
                '<h2>🎬 全站近期注目作品墙</h2>' +
                '<a href="browser.html" style="font-size:12px;color:var(--accent);font-weight:700;text-decoration:none;">分类排行浏览 »</a>' +
              '</div>' +
              '<ul id="featuredItems" class="featuredItems bau-featured-list">' + featHtml + '</ul>' +
            '</section>' +
          '</div>' +
          '<aside id="columnHomeB" class="column bau-side-stack">' +
            '<section class="bau-card" id="home_tml">' +
              '<div class="bau-section-head">' +
                '<h2>⏱️ 在刚才 · 全站实时动态</h2>' +
                '<a href="timeline.html" style="font-size:12px;color:var(--accent);font-weight:700;text-decoration:none;">...more</a>' +
              '</div>' +
              '<ul class="bau-tml-list">' + tmlHtml + '</ul>' +
            '</section>' +
            '<section class="bau-card" id="home_calendar">' +
              '<div class="bau-section-head">' +
                '<h2>📅 每日放送</h2>' +
                '<div style="display:flex;gap:6px;">' +
                  calDays.map(function (cd, i) {
                    return '<button type="button" class="bau-mode-tab' + (i === state.calDayIdx ? ' is-active' : '') + '" style="padding:3px 9px;font-size:11px;" data-act="select-cal-day" data-idx="' + i + '">' + esc(cd.label) + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +
              '<div class="bau-cal-mini-grid">' + calItemsHtml + '</div>' +
              '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--bau-muted);">' +
                '<span>' + esc((DATA.meta && DATA.meta.calendarTip) || '今日放送 24 部') + '</span>' +
                '<a href="calendar.html" style="color:var(--accent);font-weight:700;text-decoration:none;">完整日历 »</a>' +
              '</div>' +
            '</section>' +
            '<section class="bau-card" id="home_announcement">' +
              '<div class="bau-section-head"><h2>📣 Sumomo Board · 站点公告</h2></div>' +
              '<ul class="bau-ann-list">' + annHtml + '</ul>' +
            '</section>' +
          '</aside>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSidebarBForAuth() {
    var demoBtns = (DATA.demoAccounts || []).map(function (acc) {
      return (
        '<button type="button" class="bau-demo-card" data-act="demo-login" data-uid="' + esc(acc.uid) + '">' +
          '<img src="' + esc(acc.avatar) + '" alt="' + esc(acc.nickname) + '" referrerpolicy="no-referrer" />' +
          '<div style="min-width:0;">' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--bau-ink);">' + esc(acc.nickname) + '</div>' +
            '<div style="font-size:11px;color:var(--bau-muted);">' + esc(acc.role) + '</div>' +
          '</div>' +
        '</button>'
      );
    }).join('');

    var switchBox = state.mode === 'signup'
      ? '<div class="panel">' +
          '<p style="margin:0 0 8px;font-weight:800;font-size:13.5px;color:var(--bau-ink);">已经注册过 Bangumi 账户？</p>' +
          '<a href="auth.html?mode=login" class="btnPink bau-btn-pink" data-act="switch-mode" data-mode="login">立即登录</a>' +
        '</div>'
      : '<div class="panel">' +
          '<p style="margin:0 0 8px;font-weight:800;font-size:13.5px;color:var(--bau-ink);">还没有 Bangumi 账户？</p>' +
          '<a href="auth.html?mode=signup" class="btnPink bau-btn-pink" data-act="switch-mode" data-mode="signup">立即注册</a>' +
        '</div>';

    return (
      '<div id="columnLoginB" class="column">' +
        switchBox +
        '<div>' +
          '<p style="margin:0 0 8px;font-weight:800;font-size:13.5px;color:var(--bau-ink);">忘记密码？</p>' +
          '<a href="auth.html?mode=reset" class="btnGray bau-btn-gray" data-act="switch-mode" data-mode="reset">重置密码</a>' +
        '</div>' +
        '<div style="padding-top:12px;border-top:1px dashed var(--bau-border-sub);">' +
          '<p style="margin:0 0 8px;font-weight:800;font-size:12.5px;color:var(--bau-ink-2);">⚡ 原型快速通道（一键登录体验）</p>' +
          '<div class="bau-demo-accounts">' + demoBtns + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderLoginViewHtml() {
    var code = genCaptchaCode();
    return (
      '<div class="columnsLogin borderNeue clearit">' +
        '<h1><span>🔑 登录至 Bangumi</span><a href="auth.html?mode=guest" class="btnGray bau-btn-gray" data-act="switch-mode" data-mode="guest" style="font-size:12px;padding:6px 12px;">← 返回未登录首页</a></h1>' +
        '<div class="bau-login-grid">' +
          '<div id="columnLoginA" class="column">' +
            '<form id="loginForm" method="post" name="login" action="/FollowTheRabbit">' +
              '<input type="hidden" name="formhash" value="e73f30d5" />' +
              '<div class="bau-form-group">' +
                '<label for="email">你的 Email 地址</label>' +
                '<input id="email" name="email" class="inputtext bau-input" type="text" placeholder="输入邮箱（如 sy@bgm.tv）" required />' +
              '</div>' +
              '<div class="bau-form-group">' +
                '<label for="password">你的密码</label>' +
                '<input id="password" name="password" class="inputtext bau-input" type="password" placeholder="输入密码（演示模式支持任意 ≥4 位）" required />' +
              '</div>' +
              '<div id="rechaptcha_form" class="bau-form-group">' +
                '<label for="captcha">验证码</label>' +
                '<div class="bau-captcha-row">' +
                  '<input id="captcha" name="captcha_challenge_field" class="inputtext bau-input" type="text" autocomplete="off" placeholder="输入右侧字符（如 ' + esc(code) + '）" value="' + esc(code) + '" />' +
                  '<div id="captcha_img" class="bau-captcha-box" data-act="refresh-captcha" title="点击刷新验证码">' + captchaSvgHtml(code) + '</div>' +
                '</div>' +
                '<small id="bauCaptchaHint" style="font-size:11px;color:var(--bau-muted);">点击图片刷新（当前示例码：' + esc(code) + '）</small>' +
              '</div>' +
              '<p class="checkbox" style="margin:6px 0 14px;font-size:12.5px;color:var(--bau-ink-2);display:flex;align-items:center;gap:6px;">' +
                '<input id="loginStatus" class="checkbox" name="cookietime" value="0" type="checkbox" />' +
                '<label for="loginStatus">不保存我的登录状态</label>' +
              '</p>' +
              '<div class="bau-btn-row">' +
                '<input class="inputBtn bau-submit" type="submit" name="loginsubmit" value="登录" />' +
                '<input class="inputBtn passkeyLoginButton bau-passkey" type="button" value="使用 Passkey 登录" data-act="passkey-login" />' +
              '</div>' +
            '</form>' +
          '</div>' +
          renderSidebarBForAuth() +
        '</div>' +
        '<div class="family clearit bau-family-bar">' +
          '<strong>旗下站点：</strong>' +
          '<a href="index.html">Bangumi 番组计划</a>' +
          '<a href="https://doujin.bgm.tv" target="_blank" rel="noopener">天窗联盟 ↗</a>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSignupViewHtml() {
    var code = genCaptchaCode();
    var purposeHtml =
      '<div id="loginSelection" class="loginSelection"' + (state.signupStep === 'select' ? '' : ' style="display:none"') + '>' +
        '<h2 style="margin:0 0 6px;font-size:16px;color:var(--bau-ink);">我想使用 Bangumi：</h2>' +
        '<p style="margin:0;font-size:12.5px;color:var(--bau-muted);">请选择你加入 Bangumi 的主要目的（遵循官方社区准则分流）：</p>' +
        '<ul>' +
          '<li><a href="javascript:void(0)" data-act="signup-purpose" data-purpose="watch"><span>🎬 在线观看、下载资源</span><span>→</span></a></li>' +
          '<li><a href="javascript:void(0)" data-act="signup-purpose" data-purpose="collect"><span>📚 管理 ACG 收藏与收视进度，分享交流</span><span>→</span></a></li>' +
          '<li><a href="javascript:void(0)" data-act="signup-purpose" data-purpose="doujin"><span>🎨 在天窗联盟发布与收藏同人作品</span><span>→</span></a></li>' +
          '<li><a href="javascript:void(0)" data-act="signup-purpose" data-purpose="fun"><span>💘 <s>婚恋交友</s>（开玩笑的，来聊作品吧）</span><span>→</span></a></li>' +
        '</ul>' +
      '</div>';

    var streamBtns = (DATA.streamingLinks || []).map(function (st) {
      return '<a href="' + esc(st.url) + '" target="_blank" rel="nofollow noopener" class="btnBlue bau-btn-blue" style="padding:6px 12px;font-size:12px;">' + esc(st.label) + ' ↗</a>';
    }).join('');

    var alertHtml =
      '<div id="signupAlert" class="bau-alert-card"' + (state.signupStep === 'alert' ? '' : ' style="display:none"') + '>' +
        '<h3 style="margin:0;font-size:16px;color:var(--accent);">⚠️ Bangumi 不提供在线观看与资源下载</h3>' +
        '<p style="margin:0;font-size:13px;line-height:1.7;color:var(--bau-ink-2);">Bangumi 仅提供条目资料与个人收藏记录，不提供任何在线观看以及下载，您可至以下网站收看正版在线内容：</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + streamBtns + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:4px;">' +
          '<button type="button" class="btnGray bau-btn-gray" data-act="signup-back">← 重新选择用途</button>' +
          '<button type="button" class="btnPink bau-btn-pink" data-act="signup-purpose" data-purpose="collect">我已了解，继续管理收藏注册 →</button>' +
        '</div>' +
      '</div>';

    var sourcesHtml = (DATA.regSources || []).map(function (rs, idx) {
      return '<label><input type="radio" name="reg_source" value="' + esc(rs.value) + '"' + (idx === 0 ? ' checked' : '') + ' /> ' + esc(rs.label) + '</label>';
    }).join('');

    var formHtml =
      '<div id="signupFormWrapper"' + (state.signupStep === 'form' ? '' : ' style="display:none"') + '>' +
        '<div style="margin-bottom:12px;"><button type="button" class="btnGray bau-btn-gray" style="padding:5px 11px;font-size:12px;" data-act="signup-back">← 返回上一步</button></div>' +
        '<form id="signupForm" method="post" name="signup" action="/RedPill">' +
          '<input type="hidden" name="formhash" value="e73f30d5" />' +
          '<div class="bau-form-group">' +
            '<label for="regEmail">你的 Email 地址</label>' +
            '<input id="regEmail" name="email" class="inputtext bau-input" type="email" placeholder="用于登录与找回密码" required />' +
          '</div>' +
          '<div class="bau-form-group">' +
            '<label for="regPassword">设置密码</label>' +
            '<input id="regPassword" name="password" class="inputtext bau-input" type="password" placeholder="至少 6 位密码" required />' +
            '<div class="bau-pw-meter"><div class="bau-pw-meter-bar" id="bauPwBar"></div></div>' +
          '</div>' +
          '<div class="bau-form-group">' +
            '<label for="regPassword2">确认密码</label>' +
            '<input id="regPassword2" name="password2" class="inputtext bau-input" type="password" placeholder="再次输入密码" required />' +
          '</div>' +
          '<div class="bau-form-group">' +
            '<label for="nickname">设置昵称</label>' +
            '<input id="nickname" name="nickname" class="inputtext bau-input" type="text" placeholder="你在 Bangumi 时光机的称呼" required />' +
          '</div>' +
          '<div class="bau-form-group">' +
            '<label>你是从哪里知道 Bangumi 的：</label>' +
            '<div class="bau-reg-sources">' + sourcesHtml + '</div>' +
          '</div>' +
          '<div id="rechaptcha_form" class="bau-form-group">' +
            '<label for="captcha">验证码</label>' +
            '<div class="bau-captcha-row">' +
              '<input id="captcha" name="captcha_challenge_field" class="inputtext bau-input" type="text" autocomplete="off" value="' + esc(code) + '" />' +
              '<div id="captcha_img" class="bau-captcha-box" data-act="refresh-captcha" title="点击刷新验证码">' + captchaSvgHtml(code) + '</div>' +
            '</div>' +
            '<small id="bauCaptchaHint" style="font-size:11px;color:var(--bau-muted);">点击图片刷新（当前示例码：' + esc(code) + '）</small>' +
          '</div>' +
          '<div class="bau-form-group">' +
            '<label for="guideline">社区准则确认：Bangumi <strong style="color:#F09199;">不提供</strong> 资源下载与观看（请输入粉色文字内容）</label>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;">' +
              '<span>我已了解 Bangumi</span>' +
              '<input id="guideline" name="guideline" class="inputtext bau-input" type="text" style="width:120px;padding:6px 10px;" placeholder="不提供" required />' +
              '<span>资源下载与观看</span>' +
            '</div>' +
          '</div>' +
          '<div class="bau-btn-row">' +
            '<input class="inputBtn bau-submit" type="submit" name="regsubmit" value="注册会员" />' +
          '</div>' +
        '</form>' +
      '</div>';

    return (
      '<div class="columnsLogin borderNeue clearit">' +
        '<h1><span>🌸 注册成为 Bangumi 会员</span><a href="auth.html?mode=guest" class="btnGray bau-btn-gray" data-act="switch-mode" data-mode="guest" style="font-size:12px;padding:6px 12px;">← 返回未登录首页</a></h1>' +
        '<div class="bau-login-grid">' +
          '<div id="columnLoginA" class="column">' + purposeHtml + alertHtml + formHtml + '</div>' +
          renderSidebarBForAuth() +
        '</div>' +
        '<div class="family clearit bau-family-bar">' +
          '<strong>旗下站点：</strong>' +
          '<a href="index.html">Bangumi 番组计划</a>' +
          '<a href="https://doujin.bgm.tv" target="_blank" rel="noopener">天窗联盟 ↗</a>' +
        '</div>' +
      '</div>'
    );
  }

  function renderResetViewHtml() {
    var code = genCaptchaCode();
    return (
      '<div class="columnsLogin borderNeue clearit">' +
        '<h1><span>🛟 重置账户密码</span><a href="auth.html?mode=login" class="btnGray bau-btn-gray" data-act="switch-mode" data-mode="login" style="font-size:12px;padding:6px 12px;">← 返回登录</a></h1>' +
        '<div class="bau-login-grid">' +
          '<div id="columnLoginA" class="column">' +
            '<form id="resetForm">' +
              '<div class="bau-form-group">' +
                '<label for="resetEmail">注册时使用的 Email 地址</label>' +
                '<input id="resetEmail" name="email" class="inputtext bau-input" type="email" placeholder="输入绑定的邮箱" required />' +
              '</div>' +
              '<div id="rechaptcha_form" class="bau-form-group">' +
                '<label for="captcha">验证码</label>' +
                '<div class="bau-captcha-row">' +
                  '<input id="captcha" name="captcha_challenge_field" class="inputtext bau-input" type="text" autocomplete="off" value="' + esc(code) + '" />' +
                  '<div id="captcha_img" class="bau-captcha-box" data-act="refresh-captcha" title="点击刷新验证码">' + captchaSvgHtml(code) + '</div>' +
                '</div>' +
                '<small id="bauCaptchaHint" style="font-size:11px;color:var(--bau-muted);">点击图片刷新（当前示例码：' + esc(code) + '）</small>' +
              '</div>' +
              '<div class="bau-btn-row">' +
                '<input class="inputBtn bau-submit" type="submit" value="发送重置密码邮件" />' +
              '</div>' +
            '</form>' +
          '</div>' +
          renderSidebarBForAuth() +
        '</div>' +
      '</div>'
    );
  }

  function renderAll() {
    var host = $('bauHost');
    if (!host) return;
    if (state.mode === 'login') host.innerHTML = renderLoginViewHtml();
    else if (state.mode === 'signup') host.innerHTML = renderSignupViewHtml();
    else if (state.mode === 'reset') host.innerHTML = renderResetViewHtml();
    else host.innerHTML = renderGuestHomeHtml();
    syncStatusBar();
    syncUrl(false);
  }

  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act');

      if (act === 'switch-mode') {
        ev.preventDefault();
        state.mode = el.getAttribute('data-mode') || 'guest';
        if (state.mode === 'signup') state.signupStep = 'select';
        syncUrl(true);
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (act === 'select-slide') {
        ev.preventDefault();
        state.slideIdx = parseInt(el.getAttribute('data-idx') || '0', 10) || 0;
        renderAll();
      } else if (act === 'select-cal-day') {
        ev.preventDefault();
        state.calDayIdx = parseInt(el.getAttribute('data-idx') || '0', 10) || 0;
        renderAll();
      } else if (act === 'refresh-captcha') {
        ev.preventDefault();
        refreshCaptchaDom();
      } else if (act === 'passkey-login') {
        ev.preventDefault();
        completeLogin(DEFAULT_USER, '🔐 Passkey 通行密钥验证成功，欢迎回来！');
      } else if (act === 'demo-login') {
        ev.preventDefault();
        var uid = el.getAttribute('data-uid') || '553488';
        var acc = (DATA.demoAccounts || []).find(function (a) { return String(a.uid) === String(uid); }) || DEFAULT_USER;
        completeLogin(acc, '✨ 已通过演示账号「' + acc.nickname + '」登录');
      } else if (act === 'do-logout') {
        ev.preventDefault();
        writeAuthState({ loggedIn: false, lastUid: '553488' });
        state.mode = 'guest';
        syncUrl(true);
        renderAll();
        showToast('已退出登录，已切换至未登录引导视图');
      } else if (act === 'signup-purpose') {
        ev.preventDefault();
        var p = el.getAttribute('data-purpose');
        state.signupStep = (p === 'watch') ? 'alert' : 'form';
        renderAll();
      } else if (act === 'signup-back') {
        ev.preventDefault();
        state.signupStep = 'select';
        renderAll();
      }
    });

    document.addEventListener('input', function (ev) {
      if (ev.target.id === 'regPassword') {
        var bar = $('bauPwBar');
        if (!bar) return;
        var v = ev.target.value || '';
        var pct = Math.min(100, Math.round((v.length / 12) * 100));
        bar.style.width = pct + '%';
        bar.style.background = v.length >= 8 ? '#22c55e' : (v.length >= 5 ? '#f59e0b' : 'var(--accent)');
      }
    });

    document.addEventListener('submit', function (ev) {
      if (ev.target.id === 'loginForm') {
        ev.preventDefault();
        var emailInp = ev.target.querySelector('[name="email"]');
        var pwInp = ev.target.querySelector('[name="password"]');
        var capInp = ev.target.querySelector('[name="captcha_challenge_field"]');
        var email = emailInp ? emailInp.value.trim() : '';
        var pw = pwInp ? pwInp.value : '';
        if (!email || pw.length < 4) {
          showToast('请填写邮箱地址与至少 4 位密码');
          return;
        }
        if (capInp && capInp.value.trim().toUpperCase() !== state.captchaCode.toUpperCase()) {
          showToast('验证码不正确，请重新输入或点击刷新');
          refreshCaptchaDom();
          return;
        }
        var regUsers = readRegisteredUsers();
        var matched = (DATA.demoAccounts || []).find(function (a) { return a.email.toLowerCase() === email.toLowerCase(); }) ||
                      regUsers.find(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
        if (!matched) {
          matched = {
            uid: '553488',
            nickname: email.split('@')[0] || '少年游',
            email: email,
            avatar: DEFAULT_USER.avatar
          };
        }
        completeLogin(matched, '🔑 登录成功，欢迎回到 Bangumi！');
      } else if (ev.target.id === 'signupForm') {
        ev.preventDefault();
        var sEmail = ($('regEmail') || {}).value.trim();
        var sPw = ($('regPassword') || {}).value || '';
        var sPw2 = ($('regPassword2') || {}).value || '';
        var sNick = ($('nickname') || {}).value.trim();
        var sCap = ev.target.querySelector('[name="captcha_challenge_field"]');
        var sGuide = ($('guideline') || {}).value.trim();

        if (!sEmail || sEmail.indexOf('@') === -1) {
          showToast('请输入有效的 Email 地址');
          return;
        }
        if (sPw.length < 6 || sPw !== sPw2) {
          showToast('请确保密码至少 6 位且两次输入一致');
          return;
        }
        if (!sNick) {
          showToast('请设置你的 Bangumi 昵称');
          return;
        }
        if (sCap && sCap.value.trim().toUpperCase() !== state.captchaCode.toUpperCase()) {
          showToast('验证码不正确，请重试');
          refreshCaptchaDom();
          return;
        }
        if (sGuide !== '不提供') {
          showToast('请在社区准则确认框中输入「不提供」');
          return;
        }
        var newUser = {
          uid: '553488',
          nickname: sNick,
          email: sEmail,
          avatar: DEFAULT_USER.avatar
        };
        var list = readRegisteredUsers();
        list.unshift(newUser);
        writeRegisteredUsers(list);
        completeLogin(newUser, '🎉 注册成功！欢迎「' + sNick + '」加入 Bangumi 时光机');
      } else if (ev.target.id === 'resetForm') {
        ev.preventDefault();
        var rEmail = ($('resetEmail') || {}).value.trim();
        var rCap = ev.target.querySelector('[name="captcha_challenge_field"]');
        if (!rEmail || rEmail.indexOf('@') === -1) {
          showToast('请输入有效的注册邮箱');
          return;
        }
        if (rCap && rCap.value.trim().toUpperCase() !== state.captchaCode.toUpperCase()) {
          showToast('验证码不正确，请重试');
          refreshCaptchaDom();
          return;
        }
        showToast('✉️ 已向 ' + rEmail + ' 发送密码重置验证链接（原型演示）');
        state.mode = 'login';
        syncUrl(true);
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
