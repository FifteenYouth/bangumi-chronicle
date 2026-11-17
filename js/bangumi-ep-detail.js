/* ═══════════════════════════════════════════════════════════════════════════
   Bangumi Episode Discussion Detail Prototype (B3 / Page 06: /ep/{id})
   Spec: BANGUMI_UI_BEAUTIFY_SPEC.md:470-504
   - Left #columnEpA: h2.title + [修改], div.epDesc, div.singleCommentList
     (.comment_sort_by + #slider), div#comment_list (div[id^="post_"].row_reply,
     .post_actions, .floor-anchor, subReply, .like_dropdown, .likes_grid,
     .bgm_spoiler, .topic_sub_reply > .sub_reply_bg, edit_comment / erase_post,
     ignoreUser / report thickbox), div#reply_wrapper > form#ReplyForm (.markItUpHeader)
   - Right #columnEpB: div#subject_inner_info, div.SimpleSidePanel > ul.sideEpList,
     ul.photoPage prev/next episode navigation
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var EP_DB = (window.EP_DATA && window.EP_DATA.subjects) || {};
  var DETAIL_DB = window.EP_DETAIL_DATA || {};
  var CURRENT_USER = DETAIL_DB.currentUser || {
    uid: '553488',
    author: '少年游',
    avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
    sign: '于勇者死后的世界，重拾时间的刻度'
  };
  var REACTION_CATALOG = DETAIL_DB.reactionCatalog || [
    { value: '141', emoji: '🎉', label: '撒花' },
    { value: '140', emoji: '❤️', label: '喜欢' },
    { value: '0',   emoji: '👍', label: '赞同' },
    { value: '54',  emoji: '🤣', label: 'bgm38' },
    { value: '79',  emoji: '😭', label: '泪目' },
    { value: '104', emoji: '✨', label: '神回' },
    { value: '80',  emoji: '👏', label: '鼓掌' },
    { value: '90',  emoji: '🥺', label: '破防' }
  ];

  var FEATURED_PRESETS = [
    { epId: '1227087', label: '🪄 芙莉莲 ep.1 旅途的终点' },
    { epId: '1227096', label: '⚔️ 芙莉莲 ep.10 强大的魔法使' },
    { epId: '770528',  label: '🔬 非自然死亡 ep.1 无名之毒' },
    { epId: '4779001', label: '🎵 芙莉莲 OST Track.01' }
  ];

  var state = {
    epId: '1227087',
    subjectId: '400602',
    sort: 'asc',           // asc | desc | hot
    sortMenuOpen: false,
    hotOnly: false,
    showIgnored: false,
    ignoredUsers: {},      // uid -> authorName
    sideCatFilter: 'all',  // all | main | sp | op | ed
    activeSubReplyFloorId: null,
    subReplyTargetUser: '',
    editingPostId: null,   // floor.id or sub.id
    editingText: '',
    likePopTargetId: null,
    openMoreMenuPostId: null,
    reportTarget: null,    // { postId, floor, uname }
    floorsStore: {},       // epId -> [floor objects]
    statusStore: {}        // subjectId -> { epId: 'watched'|'queue'|'drop' }
  };

  /* ---------------- Utilities ---------------- */
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
    var div = document.createElement('div');
    div.className = 'glass-toast';
    div.textContent = msg;
    box.appendChild(div);
    setTimeout(function () {
      div.classList.add('is-leaving');
      setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 300);
    }, 2400);
  }

  function renderTenStars(score) {
    var num = Number(score) || 0;
    var filled = Math.max(1, Math.min(10, Math.round(num)));
    var starsOn = new Array(filled + 1).join('★');
    var starsOff = new Array(10 - filled + 1).join('☆');
    return '<span class="ep-ten-stars"><span class="stars-on">' + starsOn + '</span><span class="stars-off">' + starsOff + '</span></span>' +
           '<strong class="ep-score-val">' + num.toFixed(1) + '</strong>';
  }

  /* Format BBCode & [mask] spoilers into .bgm_spoiler */
  function formatMessage(raw) {
    var s = esc(raw || '');
    // [quote]...[/quote]
    s = s.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, function (_, q) {
      return '<div class="ep-quote-block">' + q.trim() + '</div>';
    });
    // [mask]...[/mask] -> span.bgm_spoiler
    s = s.replace(/\[mask\]([\s\S]*?)\[\/mask\]/gi, function (_, m) {
      return '<span class="bgm_spoiler" data-epd-act="spoiler" title="剧透内容：鼠标悬浮或点击常驻显字">' + m + '</span>';
    });
    // [b], [i], [u], [s]
    s = s.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
    s = s.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
    s = s.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
    s = s.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<del>$1</del>');
    // (bgm38) style smileys
    s = s.replace(/\(bgm(\d+)\)/gi, '<span class="ep-staff-pill" style="padding:1px 6px;font-size:11px;">📺 bgm$1</span>');
    s = s.replace(/\n/g, '<br />');
    return s;
  }

  /* ---------------- Subject & Episode Lookup ---------------- */
  function findEpisodeContext(epId) {
    var target = String(epId || '');
    var sids = Object.keys(EP_DB);
    for (var i = 0; i < sids.length; i++) {
      var sid = sids[i];
      var subj = EP_DB[sid];
      var eps = (subj && subj.episodes) || [];
      for (var j = 0; j < eps.length; j++) {
        if (String(eps[j].id) === target) {
          return { subjectId: sid, subject: subj, ep: eps[j], index: j, episodes: eps };
        }
      }
    }
    // Fallback to default 400602 ep.1
    var defSubj = EP_DB['400602'] || EP_DB[sids[0]] || { id: '400602', title_cn: '葬送的芙莉莲', title_orig: '葬送のフリーレン', cat: 'anime', verb: '看', unit: '话', episodes: [] };
    var defEp = (defSubj.episodes && defSubj.episodes[0]) || {
      id: '1227087', sort: 1, cat: 'main', name: '冒険の終わり', name_cn: '旅途的终点',
      duration: '00:26:00', airdate: '2023-09-29', comment: 347, airStatus: 'Air',
      staff: [{ role: '脚本', name: '鈴木智尋' }, { role: '分镜', name: '斎藤圭一郎' }, { role: '演出', name: '辻彩夏' }, { role: '作监', name: '長澤礼子' }],
      synopsis: '打倒魔王凯旋回到王都的勇者辛美尔一行人。五十年后，为了兑现当年的流星雨之约，芙莉莲再次回到王都，并由此踏上了了解人类的旅途。'
    };
    return { subjectId: String(defSubj.id || '400602'), subject: defSubj, ep: defEp, index: 0, episodes: defSubj.episodes || [defEp] };
  }

  function subjCn(subj) {
    return (subj && (subj.titleCn || subj.title_cn || subj.name_cn || subj.name)) || '葬送的芙莉莲';
  }

  function subjOrig(subj) {
    return (subj && (subj.titleJp || subj.title_orig || subj.name)) || '葬送のフリーレン';
  }

  function epCatKey(ep) {
    if (!ep) return 'main';
    if (typeof ep.cat === 'string') return ep.cat;
    var t = Number(ep.type || 0);
    if (t === 1) return 'sp';
    if (t === 2) return 'op';
    if (t === 3) return 'ed';
    return 'main';
  }

  function formatEpCode(ep, subj) {
    if (subj && subj.cat === 'music') {
      return 'Track.' + (ep.sort < 10 ? '0' + ep.sort : ep.sort);
    }
    var catKey = epCatKey(ep);
    var prefix = 'ep.';
    if (catKey === 'sp') prefix = 'SP.';
    else if (catKey === 'op') prefix = 'OP.';
    else if (catKey === 'ed') prefix = 'ED.';
    return prefix + ep.sort;
  }

  /* ---------------- Watch Status Persistence (shared with subject-ep.html) ---------------- */
  function getSubjectStatusMap(sid) {
    if (state.statusStore[sid]) return state.statusStore[sid];
    var map = {};
    var subj = EP_DB[sid];
    var eps = (subj && subj.episodes) || [];
    eps.forEach(function (ep, idx) {
      if (ep.userStatus && ep.userStatus !== 'unwatched') {
        map[ep.id] = ep.userStatus;
      } else if (sid === '400602' && epCatKey(ep) === 'main' && idx < 12) {
        map[ep.id] = 'watched';
      }
    });
    try {
      var raw = localStorage.getItem('bgm_ep_status_v1_' + sid);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach(function (k) {
            if (parsed[k] && parsed[k] !== 'unwatched') map[k] = parsed[k];
            else delete map[k];
          });
        }
      }
    } catch (e) {}
    state.statusStore[sid] = map;
    return map;
  }

  function saveSubjectStatusMap(sid) {
    try {
      localStorage.setItem('bgm_ep_status_v1_' + sid, JSON.stringify(state.statusStore[sid] || {}));
    } catch (e) {}
  }

  function setEpisodeWatchStatus(action, epId) {
    var ctx = findEpisodeContext(epId || state.epId);
    var map = getSubjectStatusMap(ctx.subjectId);
    var verb = ctx.subject.verb || '看';
    var code = formatEpCode(ctx.ep, ctx.subject);
    if (action === 'Watched_') {
      map[ctx.ep.id] = 'watched';
      showToast('已将 ' + code + ' 标记为「' + verb + '过」 ✓');
    } else if (action === 'WatchedTill_') {
      var count = 0;
      ctx.episodes.forEach(function (item) {
        if (epCatKey(item) === epCatKey(ctx.ep) && Number(item.sort) <= Number(ctx.ep.sort)) {
          map[item.id] = 'watched';
          count++;
        }
      });
      showToast('已将至 ' + code + ' 的前序共 ' + count + ' ' + (ctx.subject.unit || '话') + '全部标为「' + verb + '过」 ✓');
    } else if (action === 'Queue_') {
      map[ctx.ep.id] = 'queue';
      showToast('已将 ' + code + ' 标记为「想' + verb + '」');
    } else if (action === 'Drop_') {
      map[ctx.ep.id] = 'drop';
      showToast('已将 ' + code + ' 标记为「抛弃」');
    } else if (action === 'remove_') {
      delete map[ctx.ep.id];
      showToast('已撤销 ' + code + ' 的收视状态');
    }
    saveSubjectStatusMap(ctx.subjectId);
    renderWatchStatusBar(ctx);
    renderSidePanel(ctx);
  }

  /* ---------------- Floor Dataset Initialization & Fallback ---------------- */
  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getFloorsForContext(ctx) {
    var epId = String(ctx.ep.id);
    if (state.floorsStore[epId]) return state.floorsStore[epId];

    var rawList = (DETAIL_DB.commentsByEp && DETAIL_DB.commentsByEp[epId])
      ? cloneDeep(DETAIL_DB.commentsByEp[epId])
      : null;

    if (!rawList || !rawList.length) {
      // Synthesize realistic discussion floors using real Bangumi avatars and episode metadata
      var code = formatEpCode(ctx.ep, ctx.subject);
      var titleDisp = ctx.ep.name_cn || ctx.ep.name;
      var rawStaff = ctx.ep.staff || [];
      var staffArr = Array.isArray(rawStaff)
        ? rawStaff
        : Object.keys(rawStaff).map(function (k) { return { role: k, val: rawStaff[k] }; });
      var staffLine = staffArr.map(function (s) { return s.role + ' ' + (s.val || s.name || ''); }).join(' / ') || '制作组全员在线';
      var baseDate = ctx.ep.airdate || '2024-01-12';
      rawList = [
        {
          id: epId + '01',
          floor: '#1',
          floorNum: 1,
          uid: 'aihaozhe',
          author: 'Amateur',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/61/94/619426.jpg?r=1732177839&hd=1',
          sign: '缓慢补番中',
          time: baseDate + ' 23:05',
          content: '第一时点打卡 ' + code + '「' + titleDisp + '」！本集阵容（' + staffLine + '）发挥太稳了，演出节奏与配乐切入点恰到好处。',
          likes: [
            { value: '141', emoji: '🎉', label: '撒花', count: 14, users: ['神宫澪衣', 'RainOKid', '片月'], selected: false },
            { value: '0',   emoji: '👍', label: '赞同', count: 6,  users: ['少年游', 'Stardream'], selected: false }
          ],
          subs: [
            {
              id: epId + '011',
              floor: '#1-1',
              uid: 'starchild',
              author: '神宫澪衣',
              avatar: 'https://lain.bgm.tv/pic/user/l/000/71/06/710657_XCQq7.jpg?r=1787851942&hd=1',
              time: baseDate + ' 23:18',
              content: '同意！特别是后半段情绪收束的留白处理，完全超出了预期。',
              isSelf: false
            }
          ],
          isSelf: false
        },
        {
          id: epId + '02',
          floor: '#2',
          floorNum: 2,
          uid: '695549',
          author: 'Earendil_C',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/57/77/577770.jpg?r=1613540408',
          sign: '光影与分镜考据党',
          time: baseDate + ' 23:24',
          content: '仔细回看了两遍 ' + code + ' 的关键转场，[mask]这一话对角色眼神微表情的特写与伏笔回收真的绝妙，知道后续剧情再看这里更觉得后劲十足[/mask]。(bgm38)',
          likes: [
            { value: '104', emoji: '✨', label: '神回', count: 9, users: ['少年游', 'Amateur'], selected: false },
            { value: '79',  emoji: '😭', label: '泪目', count: 4, users: ['片月'], selected: false }
          ],
          subs: [],
          isSelf: false
        },
        {
          id: epId + '03',
          floor: '#3',
          floorNum: 3,
          uid: CURRENT_USER.uid,
          author: CURRENT_USER.author,
          avatar: CURRENT_USER.avatar,
          sign: CURRENT_USER.sign,
          time: baseDate + ' 23:42',
          content: '刚看完 ' + code + '「' + titleDisp + '」过来写点感想：' + (ctx.ep.synopsis || '叙事密度非常扎实的一集。') + ' [mask]最后片尾曲响起时的定格画面可以直接截下来当壁纸！[/mask]',
          likes: [
            { value: '140', emoji: '❤️', label: '喜欢', count: 8, users: ['神宫澪衣', 'Earendil_C', '少年游'], selected: true }
          ],
          subs: [
            {
              id: epId + '031',
              floor: '#3-1',
              uid: CURRENT_USER.uid,
              author: CURRENT_USER.author,
              avatar: CURRENT_USER.avatar,
              time: baseDate + ' 23:50',
              content: '补充一句：耳机党强烈建议调高音量细品本集的环境音与配乐层次！',
              isSelf: true
            }
          ],
          isSelf: true
        }
      ];
    }

    // Normalize isSelf flags
    rawList.forEach(function (f) {
      f.isSelf = !!(f.isSelf || String(f.uid) === String(CURRENT_USER.uid));
      f.likes = f.likes || [];
      f.subs = f.subs || [];
      f.subs.forEach(function (s) {
        s.isSelf = !!(s.isSelf || String(s.uid) === String(CURRENT_USER.uid));
      });
    });

    state.floorsStore[epId] = rawList;
    return rawList;
  }

  function floorLikeTotal(f) {
    return (f.likes || []).reduce(function (acc, lk) { return acc + (Number(lk.count) || 0); }, 0);
  }

  /* ---------------- Render Hero & Subject Switcher ---------------- */
  function renderHero(ctx) {
    var subj = ctx.subject;
    var ep = ctx.ep;
    var code = formatEpCode(ep, subj);
    var cnTitle = subjCn(subj);
    var origTitle = subjOrig(subj);
    document.title = code + ' ' + (ep.name_cn || ep.name) + ' · ' + cnTitle + ' — Bangumi 单集讨论详情原型';

    var backdrop = $('subjectBackdrop');
    if (backdrop) backdrop.style.backgroundImage = "url('" + subj.cover + "')";

    var catLabel = $('bannerCategoryLabel');
    if (catLabel) catLabel.textContent = (subj.typeLabel || subj.cat_label || '动画') + ' · EPISODE DISCUSSION · ' + code;

    var typeBadge = $('subjectTypeBadge');
    if (typeBadge) typeBadge.textContent = subj.typeLabel || 'TV 动画';

    var rankBadge = $('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Rank #' + (subj.rank || '—');

    var titleJp = $('subjectTitleJp');
    if (titleJp) titleJp.textContent = origTitle;

    var titleCn = $('subjectTitleCn');
    if (titleCn) titleCn.textContent = cnTitle;

    var titleSub = $('subjectTitleSub');
    if (titleSub) titleSub.textContent = origTitle + (subj.year ? ' (' + subj.year + ')' : '');

    var typeTag = $('subjectTypeTag');
    if (typeTag) typeTag.textContent = subj.typeLabel || subj.type_tag || 'TV';

    var metaLine = $('subjectMetaLine');
    if (metaLine) {
      metaLine.textContent = '当前单话：' + code + ' ' + (ep.name_cn || ep.name) + ' · 首播 ' + (ep.airdate || '—');
    }

    var switcher = $('subjectQuickSwitcher');
    if (switcher) {
      switcher.innerHTML = '<span class="cat-bar-label">单集快速切换:</span>' +
        FEATURED_PRESETS.map(function (p) {
          var active = String(p.epId) === String(ep.id);
          return '<button type="button" class="preset-pill-btn banner-cat-pill subject-switch-pill' + (active ? ' active' : '') + '" data-epd-act="switch-ep" data-ep-id="' + esc(p.epId) + '">' + esc(p.label) + '</button>';
        }).join('');
    }

    var navTabs = $('subjectNavTabs');
    if (navTabs) {
      var epTabLabel = subj.cat === 'music' ? '曲目列表' : '章节';
      var tabs = [
        { label: '概览', href: 'subject.html?id=' + encodeURIComponent(ctx.subjectId) },
        { label: epTabLabel, count: ctx.episodes.length, href: 'subject-ep.html?id=' + encodeURIComponent(ctx.subjectId), active: true },
        { label: subj.cat === 'real' ? '出演者' : '角色', href: 'subject-characters.html?id=' + encodeURIComponent(ctx.subjectId) },
        { label: '制作人员', href: 'subject-persons.html?id=' + encodeURIComponent(ctx.subjectId) },
        { label: '吐槽', href: 'subject-comments.html?id=' + encodeURIComponent(ctx.subjectId) },
        { label: '评论', href: 'subject-reviews.html?id=' + encodeURIComponent(ctx.subjectId) + '&tab=reviews' },
        { label: '讨论版', href: 'subject-reviews.html?id=' + encodeURIComponent(ctx.subjectId) + '&tab=board' },
        { label: '透视分析', href: 'subject-stats.html?id=' + encodeURIComponent(ctx.subjectId) },
        { label: '维基修订', href: 'subject-wiki.html?id=' + encodeURIComponent(ctx.subjectId) }
      ];
      navTabs.innerHTML = tabs.map(function (t) {
        return '<li class="subject-nav-tab-item' + (t.active ? ' active' : '') + '"><a href="' + t.href + '" class="' + (t.active ? 'focus active' : '') + '">' +
               esc(t.label) + (t.count ? ' <span class="tab-count">' + t.count + '</span>' : '') +
               '</a></li>';
      }).join('');
    }
  }

  /* ---------------- Render Episode Header & Watch Status ---------------- */
  function renderEpHeader(ctx) {
    var ep = ctx.ep;
    var subj = ctx.subject;
    var code = formatEpCode(ep, subj);
    var floors = getFloorsForContext(ctx);

    var titleText = $('epTitleText');
    if (titleText) {
      titleText.innerHTML = '<span class="ep-code-badge">' + esc(code) + '</span> ' +
        esc(ep.name) + (ep.name_cn ? ' <span class="ep-cn-sub">/ ' + esc(ep.name_cn) + '</span>' : '');
    }

    var editBtn = $('btnEditEpMeta');
    if (editBtn) editBtn.setAttribute('href', '/ep/' + ep.id + '/edit');

    var metaTip = $('epMetaTip');
    if (metaTip) {
      var labelDur = subj.cat === 'music' ? '曲长' : '时长';
      var labelAir = subj.cat === 'music' ? '发售' : '首播';
      metaTip.textContent = labelDur + ':' + (ep.duration || '24:00') + ' / ' +
        labelAir + ':' + (ep.airdate || '—') + ' / 讨论:' + Math.max(ep.comment || 0, floors.length) + ' 条';
    }

    var syn = $('epSynopsisText');
    if (syn) {
      syn.textContent = ep.synopsis || ep.summary || '本话暂无详细剧情简介，点击右上角「[修改]」可参与维基协力补充。';
    }

    var staffHost = $('epStaffPills');
    if (staffHost) {
      var rawStaff = ep.staff || [];
      var staff = Array.isArray(rawStaff)
        ? rawStaff
        : Object.keys(rawStaff).map(function (k) { return { role: k, val: rawStaff[k] }; });
      staffHost.innerHTML = staff.map(function (s) {
        return '<span class="ep-staff-pill"><b>' + esc(s.role) + '</b> ' + esc(s.val || s.name || '') + '</span>';
      }).join('');
    }

    renderWatchStatusBar(ctx);
  }

  function renderWatchStatusBar(ctx) {
    var ep = ctx.ep;
    var subj = ctx.subject;
    var verb = subj.verb || '看';
    var map = getSubjectStatusMap(ctx.subjectId);
    var curSt = map[ep.id] || '';

    var airBadge = $('epAirStatusBadge');
    if (airBadge) {
      var airCls = ep.airStatus || 'Air';
      var airTxt = airCls === 'Today' ? '放送中' : (airCls === 'NA' ? '未放送' : '已放送');
      airBadge.title = airTxt;
      airBadge.innerHTML = '<span class="' + esc(airCls) + '"></span><span>' + airTxt + '</span>';
    }

    var grp = $('epWatchActionGroup');
    if (grp) {
      var btns = [
        { act: 'Watched_',     key: 'watched', label: '✓ ' + verb + '过' },
        { act: 'WatchedTill_', key: 'till',    label: '⇥ ' + verb + '到本' + (subj.unit || '话') },
        { act: 'Queue_',       key: 'queue',   label: '♡ 想' + verb },
        { act: 'Drop_',        key: 'drop',    label: '✕ 抛弃' }
      ];
      var html = btns.map(function (b) {
        var isOn = b.key === curSt ? ' is-active' : '';
        return '<button type="button" class="ep-watch-pill' + isOn + '" id="' + b.act + ep.id + '" data-epd-act="watch-status" data-watch-op="' + b.act + '">' + esc(b.label) + '</button>';
      }).join('');
      if (curSt) {
        html += '<button type="button" class="ep-watch-pill" id="remove_' + ep.id + '" data-epd-act="watch-status" data-watch-op="remove_">撤销</button>';
      }
      grp.innerHTML = html;
    }
  }

  /* ---------------- Render Discussion Floors (#comment_list) ---------------- */
  function getSortedFilteredFloors(ctx) {
    var floors = getFloorsForContext(ctx).slice();
    if (state.hotOnly) {
      floors = floors.filter(function (f) {
        return (f.subs && f.subs.length > 0) || floorLikeTotal(f) > 0 || f.isSelf;
      });
    }
    if (state.sort === 'desc') {
      floors.sort(function (a, b) { return (b.floorNum || 0) - (a.floorNum || 0); });
    } else if (state.sort === 'hot') {
      floors.sort(function (a, b) {
        var scoreB = floorLikeTotal(b) * 2 + ((b.subs && b.subs.length) || 0) * 5;
        var scoreA = floorLikeTotal(a) * 2 + ((a.subs && a.subs.length) || 0) * 5;
        return (scoreB - scoreA) || ((a.floorNum || 0) - (b.floorNum || 0));
      });
    } else {
      floors.sort(function (a, b) { return (a.floorNum || 0) - (b.floorNum || 0); });
    }
    return floors;
  }

  function renderSubReplyHtml(floor, sub) {
    var isIgnored = !!state.ignoredUsers[sub.uid];
    if (isIgnored && !state.showIgnored) {
      return '<div id="post_' + esc(sub.id) + '" class="sub_reply_bg clearit" data-item-user="' + esc(sub.uid) + '">' +
        '<span class="tip_collapsed">已屏蔽用户 ' + esc(sub.author) + ' 的子回复 · <a href="javascript:void(0);" data-epd-act="unignore-user" data-uid="' + esc(sub.uid) + '">解除绝交</a></span></div>';
    }
    var moreOpen = state.openMoreMenuPostId === String(sub.id);
    var isEditing = state.editingPostId === String(sub.id);

    var bodyHtml = isEditing
      ? '<div class="ep-inline-edit-box">' +
          '<textarea class="ep-inline-edit-textarea" id="inlineEditArea_' + esc(sub.id) + '">' + esc(state.editingText) + '</textarea>' +
          '<div class="ep-inline-edit-actions">' +
            '<button type="button" class="ep-watch-pill is-active" data-epd-act="save-edit-post" data-target-id="' + esc(sub.id) + '">保存修改</button>' +
            '<button type="button" class="ep-watch-pill" data-epd-act="cancel-edit-post">取消</button>' +
          '</div>' +
        '</div>'
      : '<div class="cmt_sub_content">' + formatMessage(sub.content) + '</div>';

    return '<div id="post_' + esc(sub.id) + '" class="sub_reply_bg clearit" name="floor-' + esc(String(sub.floor).replace('#', '')) + '" data-item-user="' + esc(sub.uid) + '">' +
      '<div class="post_actions re_info">' +
        '<div class="action"><small><a href="#post_' + esc(sub.id) + '" class="floor-anchor" data-epd-act="anchor" data-post-id="' + esc(sub.id) + '">' + esc(sub.floor) + '</a> - ' + esc(sub.time) + '</small></div>' +
        '<div class="action"><a href="javascript:void(0);" class="icon" onclick="subReply(\'ep\',' + esc(floor.id) + ',' + esc(sub.id) + ');return false;" data-epd-act="toggle-subreply" data-floor-id="' + esc(floor.id) + '" data-reply-to="' + esc(sub.author) + '"><span class="ico ico_reply">↩</span> 回复</a></div>' +
        (sub.isSelf
          ? '<div class="action"><a href="javascript:void(0);" class="edit_comment" data-epd-act="edit-post" data-target-id="' + esc(sub.id) + '">编辑</a></div>' +
            '<div class="action"><a href="javascript:void(0);" class="erase_post" data-epd-act="delete-post" data-target-id="' + esc(sub.id) + '" data-parent-id="' + esc(floor.id) + '">删除</a></div>'
          : '') +
        '<div class="action dropdown">' +
          '<a href="javascript:void(0);" class="icon" data-epd-act="toggle-more-menu" data-post-id="' + esc(sub.id) + '" title="更多操作"><span class="ico ico_more">···</span></a>' +
          '<ul class="ep-more-menu"' + (moreOpen ? '' : ' hidden') + '>' +
            '<li><a href="javascript:void(0);" onclick="ignoreUser(\'' + esc(sub.uid) + '\');return false;" data-epd-act="ignore-user" data-uid="' + esc(sub.uid) + '" data-uname="' + esc(sub.author) + '">🚫 绝交</a></li>' +
            '<li><a href="/report?type=11&id=' + esc(sub.id) + '" class="thickbox" data-epd-act="open-report" data-post-id="' + esc(sub.id) + '" data-floor="' + esc(sub.floor) + '" data-uname="' + esc(sub.author) + '">⚠️ 报告疑虑</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<a href="user.html?uid=' + encodeURIComponent(sub.uid) + '" class="avatar"><span class="avatarNeue avatarSize32 ll" style="background-image:url(\'' + esc(sub.avatar) + '\')"></span></a>' +
      '<div class="inner">' +
        '<strong><a href="user.html?uid=' + encodeURIComponent(sub.uid) + '" class="l">' + esc(sub.author) + '</a></strong>' +
        (sub.isSelf ? ' <span class="ep-self-badge">本人</span>' : '') +
        bodyHtml +
      '</div>' +
    '</div>';
  }

  function renderMainFloorHtml(ctx, floor, idx) {
    var oddEven = idx % 2 === 0 ? 'light_odd' : 'light_even';
    var isIgnored = !!state.ignoredUsers[floor.uid];
    if (isIgnored && !state.showIgnored) {
      return '<div id="post_' + esc(floor.id) + '" class="' + oddEven + ' row row_reply clearit" name="floor-' + floor.floorNum + '" data-item-user="' + esc(floor.uid) + '">' +
        '<span class="tip_collapsed">已绝交用户 <b>' + esc(floor.author) + '</b> 的楼层 (' + esc(floor.floor) + ') 已被折叠 · ' +
        '<a href="javascript:void(0);" data-epd-act="unignore-user" data-uid="' + esc(floor.uid) + '">解除绝交</a></span></div>';
    }

    var moreOpen = state.openMoreMenuPostId === String(floor.id);
    var isEditing = state.editingPostId === String(floor.id);
    var subBoxOpen = state.activeSubReplyFloorId === String(floor.id);

    var likesHtml = (floor.likes || []).map(function (lk) {
      var ulist = (lk.users || []).join('、');
      return '<a class="item' + (lk.selected ? ' selected' : '') + '" href="javascript:void(0);" ' +
        'data-like-type="11" data-like-main-id="' + esc(ctx.ep.id) + '" data-like-related-id="' + esc(floor.id) + '" data-like-value="' + esc(lk.value) + '" ' +
        'data-epd-act="toggle-reaction" data-target-id="' + esc(floor.id) + '" data-val="' + esc(lk.value) + '" title="' + esc(ulist ? ulist + ' 贴了此表情' : lk.label) + '">' +
        '<span class="emoji">' + lk.emoji + '</span><span class="num">' + lk.count + '</span></a>';
    }).join('');

    var subsHtml = (floor.subs || []).map(function (sub) {
      return renderSubReplyHtml(floor, sub);
    }).join('');

    var inlineSubComposer = subBoxOpen
      ? '<div class="ep-inline-subreply-box" id="subReplyBox_' + esc(floor.id) + '">' +
          '<div class="ep-subreply-head">' +
            '<span>回复 <b>' + esc(floor.floor) + ' @' + esc(state.subReplyTargetUser || floor.author) + '</b></span>' +
            '<div style="display:flex;gap:6px;">' +
              '<button type="button" class="ep-watch-pill" data-epd-act="insert-sub-mask" data-floor-id="' + esc(floor.id) + '">+ [mask] 剧透</button>' +
              '<button type="button" class="ep-watch-pill" data-epd-act="close-subreply">收起 ✕</button>' +
            '</div>' +
          '</div>' +
          '<div class="ep-subreply-row">' +
            '<input type="text" class="ep-subreply-input" id="subReplyInput_' + esc(floor.id) + '" placeholder="回复 @' + esc(state.subReplyTargetUser || floor.author) + '（支持 [mask]剧透[/mask]）..." value="' + (state.subReplyTargetUser && state.subReplyTargetUser !== floor.author ? '@' + esc(state.subReplyTargetUser) + ' ' : '') + '" />' +
            '<button type="button" class="ep-subreply-submit" data-epd-act="submit-subreply" data-floor-id="' + esc(floor.id) + '">加上去</button>' +
          '</div>' +
        '</div>'
      : '';

    var messageArea = isEditing
      ? '<div class="ep-inline-edit-box">' +
          '<textarea class="ep-inline-edit-textarea" id="inlineEditArea_' + esc(floor.id) + '">' + esc(state.editingText) + '</textarea>' +
          '<div class="ep-inline-edit-actions">' +
            '<button type="button" class="ep-watch-pill is-active" data-epd-act="save-edit-post" data-target-id="' + esc(floor.id) + '">保存修改</button>' +
            '<button type="button" class="ep-watch-pill" data-epd-act="cancel-edit-post">取消</button>' +
          '</div>' +
        '</div>'
      : '<div class="message clearit">' + formatMessage(floor.content) + '</div>';

    return '<div id="post_' + esc(floor.id) + '" class="' + oddEven + ' row row_reply clearit' + (floor.isSelf ? ' is-self-floor' : '') + '" name="floor-' + floor.floorNum + '" data-item-user="' + esc(floor.uid) + '">' +
      '<div class="post_actions re_info">' +
        '<div class="action"><small><a href="#post_' + esc(floor.id) + '" class="floor-anchor" data-epd-act="anchor" data-post-id="' + esc(floor.id) + '">' + esc(floor.floor) + '</a> - ' + esc(floor.time) + '</small></div>' +
        '<div class="action"><a href="javascript:void(0);" class="icon" onclick="subReply(\'ep\',' + esc(floor.id) + ',0);return false;" data-epd-act="toggle-subreply" data-floor-id="' + esc(floor.id) + '" data-reply-to="' + esc(floor.author) + '" title="展开子回复"><span class="ico ico_reply">💬</span> 回复</a></div>' +
        '<div class="action"><a href="javascript:void(0);" class="icon like_dropdown" data-like-type="11" data-epd-act="toggle-like-pop" data-target-id="' + esc(floor.id) + '" title="贴贴表情"><span class="ico ico_like">✨</span> 贴贴</a></div>' +
        (floor.isSelf
          ? '<div class="action"><a href="javascript:void(0);" class="edit_comment" data-epd-act="edit-post" data-target-id="' + esc(floor.id) + '">编辑</a></div>' +
            '<div class="action"><a href="javascript:void(0);" class="erase_post" data-epd-act="delete-post" data-target-id="' + esc(floor.id) + '">删除</a></div>'
          : '') +
        '<div class="action dropdown">' +
          '<a href="javascript:void(0);" class="icon" data-epd-act="toggle-more-menu" data-post-id="' + esc(floor.id) + '" title="更多操作"><span class="ico ico_more">···</span></a>' +
          '<ul class="ep-more-menu"' + (moreOpen ? '' : ' hidden') + '>' +
            '<li><a href="javascript:void(0);" onclick="ignoreUser(\'' + esc(floor.uid) + '\');return false;" data-epd-act="ignore-user" data-uid="' + esc(floor.uid) + '" data-uname="' + esc(floor.author) + '">🚫 绝交</a></li>' +
            '<li><a href="/report?type=11&id=' + esc(floor.id) + '" class="thickbox" data-epd-act="open-report" data-post-id="' + esc(floor.id) + '" data-floor="' + esc(floor.floor) + '" data-uname="' + esc(floor.author) + '">⚠️ 报告疑虑</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<a href="user.html?uid=' + encodeURIComponent(floor.uid) + '" class="avatar"><span class="avatarNeue avatarSize48 ll" style="background-image:url(\'' + esc(floor.avatar) + '\')"></span></a>' +
      '<div class="inner">' +
        '<div class="ep-author-line">' +
          '<strong><a href="user.html?uid=' + encodeURIComponent(floor.uid) + '" class="l post_author_' + esc(floor.id) + '">' + esc(floor.author) + '</a></strong>' +
          (floor.isSelf ? '<span class="ep-self-badge">本人</span>' : '') +
          (floor.sign ? '<span class="sign tip_j">(' + esc(floor.sign) + ')</span>' : '') +
        '</div>' +
        '<div class="reply_content">' +
          messageArea +
          '<div class="likes_grid" id="likes_grid_' + esc(floor.id) + '">' + likesHtml + '</div>' +
          ((subsHtml || inlineSubComposer)
            ? '<div class="topic_sub_reply" id="topic_reply_' + esc(floor.id) + '">' + subsHtml + inlineSubComposer + '</div>'
            : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCommentsSection(ctx) {
    var allFloors = getFloorsForContext(ctx);
    var floors = getSortedFilteredFloors(ctx);

    var countTip = $('epCommentCountTip');
    if (countTip) countTip.textContent = String(allFloors.length);

    var slider = $('epSliderInput');
    var sliderVal = $('epSliderVal');
    if (slider) {
      slider.max = String(Math.max(1, floors.length));
      if (Number(slider.value) > floors.length) slider.value = '1';
      if (sliderVal) sliderVal.textContent = '#' + (slider.value || 1) + ' / ' + floors.length;
    }

    var opBtn = $('btnFilterOpOnly');
    if (opBtn) opBtn.classList.toggle('is-active', !!state.hotOnly);

    var ignBtn = $('btnToggleIgnored');
    var ignCnt = $('ignoredCountTip');
    var ignoredTotal = Object.keys(state.ignoredUsers).length;
    if (ignBtn) {
      ignBtn.hidden = ignoredTotal === 0;
      ignBtn.classList.toggle('is-active', !!state.showIgnored);
    }
    if (ignCnt) ignCnt.textContent = String(ignoredTotal);

    var sortLabels = { asc: '顺序', desc: '倒序', hot: '热门' };
    var sortCur = $('epSortCurrent');
    if (sortCur) sortCur.textContent = sortLabels[state.sort] || '顺序';

    var sortMenu = $('epSortMenu');
    if (sortMenu) {
      sortMenu.hidden = !state.sortMenuOpen;
      var links = sortMenu.querySelectorAll('[data-epd-sort]');
      for (var i = 0; i < links.length; i++) {
        var k = links[i].getAttribute('data-epd-sort');
        links[i].classList.toggle('is-active', k === state.sort);
      }
    }

    var listHost = $('comment_list');
    if (!listHost) return;
    if (!floors.length) {
      listHost.innerHTML = '<div class="row_state clearit"><div class="filtered">当前筛选条件下暂无讨论楼层 · <a href="javascript:void(0);" data-epd-act="reset-comment-filter">显示全部楼层</a></div></div>';
      return;
    }
    var html = floors.map(function (f, i) {
      return renderMainFloorHtml(ctx, f, i);
    }).join('');
    if (ignoredTotal > 0 && !state.showIgnored) {
      html += '<div class="row_state clearit"><div class="filtered">已自动折叠 ' + ignoredTotal + ' 位绝交用户的发言 · <a href="javascript:void(0);" data-epd-act="toggle-ignored">点击展开查看</a></div></div>';
    }
    listHost.innerHTML = html;
  }

  /* ---------------- Render Right Sidebar (#columnEpB) ---------------- */
  function renderSidePanel(ctx) {
    var subj = ctx.subject;
    var ep = ctx.ep;
    var eps = ctx.episodes;
    var map = getSubjectStatusMap(ctx.subjectId);
    var cnTitle = subjCn(subj);
    var origTitle = subjOrig(subj);

    var covLink = $('sideSubjectCoverLink');
    if (covLink) {
      covLink.href = 'subject.html?id=' + encodeURIComponent(ctx.subjectId);
      covLink.title = cnTitle;
      covLink.classList.toggle('is-music-square', subj.cat === 'music');
    }
    var covImg = $('sideSubjectCoverImg');
    if (covImg) {
      covImg.src = subj.cover;
      covImg.alt = cnTitle;
    }
    var titleLink = $('sideSubjectTitleLink');
    if (titleLink) {
      titleLink.href = 'subject.html?id=' + encodeURIComponent(ctx.subjectId);
      titleLink.textContent = cnTitle + ' (' + origTitle + ')';
    }
    var rateRow = $('sideSubjectRatingRow');
    if (rateRow) {
      rateRow.innerHTML = renderTenStars(subj.score || 8.5);
    }
    var backEp = $('sideBackEpListLink');
    if (backEp) {
      backEp.href = 'subject-ep.html?id=' + encodeURIComponent(ctx.subjectId);
      backEp.textContent = '/ 返回' + (subj.cat === 'music' ? '曲目' : '章节') + '列表';
    }
    var backSubj = $('sideBackSubjectLink');
    if (backSubj) {
      backSubj.href = 'subject.html?id=' + encodeURIComponent(ctx.subjectId);
    }

    // Category filter tabs inside SimpleSidePanel
    var catFilterHost = $('sideEpCatFilter');
    if (catFilterHost) {
      var cats = [
        { key: 'all',  label: '全部 (' + eps.length + ')' },
        { key: 'main', label: subj.cat === 'music' ? 'Disc 1' : '本篇' },
        { key: 'sp',   label: 'SP' },
        { key: 'op',   label: 'OP/ED' }
      ];
      catFilterHost.innerHTML = cats.map(function (c) {
        var on = state.sideCatFilter === c.key ? ' is-active' : '';
        return '<button type="button" class="side-ep-cat-btn' + on + '" data-epd-act="side-cat" data-cat="' + c.key + '">' + esc(c.label) + '</button>';
      }).join('');
    }

    var filteredEps = eps.filter(function (item) {
      if (state.sideCatFilter === 'all') return true;
      var k = epCatKey(item);
      if (state.sideCatFilter === 'op') return k === 'op' || k === 'ed';
      return k === state.sideCatFilter;
    });

    var sideList = $('sideEpList');
    if (sideList) {
      sideList.innerHTML = filteredEps.map(function (item, idx) {
        var isCur = String(item.id) === String(ep.id);
        var oddEven = idx % 2 === 0 ? 'odd' : 'even';
        var airCls = item.airStatus || 'Air';
        var code = formatEpCode(item, subj);
        var watched = map[item.id] === 'watched';
        return '<li class="' + oddEven + (isCur ? ' cur' : '') + '">' +
          '<span class="epAirStatus" title="' + (airCls === 'NA' ? '未放送' : '已放送') + '"><span class="' + esc(airCls) + '"></span></span>' +
          '<a href="ep.html?id=' + encodeURIComponent(item.id) + '" class="l" data-epd-act="switch-ep" data-ep-id="' + esc(item.id) + '">' +
            '<small class="grey">' + esc(code) + '</small> ' + esc(item.name_cn || item.name) +
          '</a>' +
          (watched ? '<span class="side-ep-watched-dot" title="已看过">✓</span>' : '') +
        '</li>';
      }).join('');
    }

    // Prev / Next navigation
    var prevBtn = $('btnPrevEp');
    var nextBtn = $('btnNextEp');
    var prevEp = ctx.index > 0 ? eps[ctx.index - 1] : null;
    var nextEp = ctx.index < eps.length - 1 ? eps[ctx.index + 1] : null;
    if (prevBtn) {
      if (prevEp) {
        prevBtn.className = 'prev';
        prevBtn.href = 'ep.html?id=' + encodeURIComponent(prevEp.id);
        prevBtn.setAttribute('data-epd-act', 'switch-ep');
        prevBtn.setAttribute('data-ep-id', prevEp.id);
        prevBtn.title = formatEpCode(prevEp, subj) + ' ' + (prevEp.name_cn || prevEp.name);
        prevBtn.textContent = '‹‹ 上一章节 (' + formatEpCode(prevEp, subj) + ')';
      } else {
        prevBtn.className = 'prev disable';
        prevBtn.href = 'javascript:void(0);';
        prevBtn.removeAttribute('data-epd-act');
        prevBtn.textContent = '‹‹ 上一章节';
      }
    }
    if (nextBtn) {
      if (nextEp) {
        nextBtn.className = 'next';
        nextBtn.href = 'ep.html?id=' + encodeURIComponent(nextEp.id);
        nextBtn.setAttribute('data-epd-act', 'switch-ep');
        nextBtn.setAttribute('data-ep-id', nextEp.id);
        nextBtn.title = formatEpCode(nextEp, subj) + ' ' + (nextEp.name_cn || nextEp.name);
        nextBtn.textContent = '下一章节 (' + formatEpCode(nextEp, subj) + ') ››';
      } else {
        nextBtn.className = 'next disable';
        nextBtn.href = 'javascript:void(0);';
        nextBtn.removeAttribute('data-epd-act');
        nextBtn.textContent = '下一章节 ››';
      }
    }
  }

  /* ---------------- Reaction Popover & Modals ---------------- */
  function renderLikePopover() {
    var pop = $('epLikePopover');
    var grid = $('epLikeEmojiGrid');
    if (!pop || !grid) return;
    if (!state.likePopTargetId) {
      pop.hidden = true;
      return;
    }
    grid.innerHTML = REACTION_CATALOG.map(function (r) {
      return '<button type="button" class="ep-like-pick-btn" data-epd-act="pick-reaction" data-target-id="' + esc(state.likePopTargetId) + '" data-val="' + esc(r.value) + '">' +
        '<span class="emo">' + r.emoji + '</span><span>' + esc(r.label) + '</span></button>';
    }).join('');
    pop.hidden = false;
  }

  function toggleReactionOnFloor(floorId, val) {
    var ctx = findEpisodeContext(state.epId);
    var floors = getFloorsForContext(ctx);
    var target = null;
    for (var i = 0; i < floors.length; i++) {
      if (String(floors[i].id) === String(floorId)) { target = floors[i]; break; }
    }
    if (!target) return;
    target.likes = target.likes || [];
    var existing = null;
    for (var j = 0; j < target.likes.length; j++) {
      if (String(target.likes[j].value) === String(val)) { existing = target.likes[j]; break; }
    }
    var catItem = REACTION_CATALOG.filter(function (r) { return String(r.value) === String(val); })[0] || { value: val, emoji: '👍', label: '赞同' };
    if (existing) {
      if (existing.selected) {
        existing.selected = false;
        existing.count = Math.max(0, (Number(existing.count) || 1) - 1);
        existing.users = (existing.users || []).filter(function (u) { return u !== CURRENT_USER.author; });
        if (existing.count === 0) {
          target.likes = target.likes.filter(function (lk) { return lk !== existing; });
        }
        showToast('已取消贴贴 ' + catItem.emoji);
      } else {
        existing.selected = true;
        existing.count = (Number(existing.count) || 0) + 1;
        existing.users = existing.users || [];
        if (existing.users.indexOf(CURRENT_USER.author) === -1) existing.users.push(CURRENT_USER.author);
        showToast('已贴上 ' + catItem.emoji + ' ' + catItem.label + '！');
      }
    } else {
      target.likes.push({
        value: String(val),
        emoji: catItem.emoji,
        label: catItem.label,
        count: 1,
        users: [CURRENT_USER.author],
        selected: true
      });
      showToast('已贴上 ' + catItem.emoji + ' ' + catItem.label + '！');
    }
    state.likePopTargetId = null;
    renderLikePopover();
    renderCommentsSection(ctx);
  }

  /* ---------------- Actions: Sub-reply, Edit, Delete, BBCode ---------------- */
  function submitSubReply(floorId) {
    var ctx = findEpisodeContext(state.epId);
    var floors = getFloorsForContext(ctx);
    var floor = null;
    for (var i = 0; i < floors.length; i++) {
      if (String(floors[i].id) === String(floorId)) { floor = floors[i]; break; }
    }
    if (!floor) return;
    var inp = $('subReplyInput_' + floorId);
    var txt = inp ? String(inp.value || '').trim() : '';
    if (!txt) {
      showToast('请输入子回复内容');
      return;
    }
    floor.subs = floor.subs || [];
    var subNum = floor.subs.length + 1;
    var newSub = {
      id: String(Date.now()),
      floor: floor.floor + '-' + subNum,
      uid: CURRENT_USER.uid,
      author: CURRENT_USER.author,
      avatar: CURRENT_USER.avatar,
      time: '刚刚',
      content: txt,
      isSelf: true
    };
    floor.subs.push(newSub);
    state.activeSubReplyFloorId = null;
    state.subReplyTargetUser = '';
    renderCommentsSection(ctx);
    showToast('已发表子回复 ' + newSub.floor + ' ✓');
  }

  function findPostOrSub(targetId) {
    var ctx = findEpisodeContext(state.epId);
    var floors = getFloorsForContext(ctx);
    for (var i = 0; i < floors.length; i++) {
      var f = floors[i];
      if (String(f.id) === String(targetId)) return { kind: 'floor', item: f, parent: null, list: floors, index: i };
      var subs = f.subs || [];
      for (var j = 0; j < subs.length; j++) {
        if (String(subs[j].id) === String(targetId)) return { kind: 'sub', item: subs[j], parent: f, list: subs, index: j };
      }
    }
    return null;
  }

  function startEditPost(targetId) {
    var hit = findPostOrSub(targetId);
    if (!hit) return;
    state.editingPostId = String(targetId);
    state.editingText = hit.item.content || '';
    renderCommentsSection(findEpisodeContext(state.epId));
  }

  function saveEditPost(targetId) {
    var hit = findPostOrSub(targetId);
    if (!hit) return;
    var area = $('inlineEditArea_' + targetId);
    var val = area ? String(area.value || '').trim() : state.editingText;
    if (!val) {
      showToast('内容不能为空');
      return;
    }
    hit.item.content = val;
    state.editingPostId = null;
    state.editingText = '';
    renderCommentsSection(findEpisodeContext(state.epId));
    showToast('已保存楼层修改 ✓');
  }

  function deletePost(targetId) {
    var hit = findPostOrSub(targetId);
    if (!hit) return;
    hit.list.splice(hit.index, 1);
    state.editingPostId = null;
    renderCommentsSection(findEpisodeContext(state.epId));
    showToast('已删除您的发言 (' + hit.item.floor + ')');
  }

  function insertBBCodeTag(tag) {
    var area = $('content');
    if (!area) return;
    var wraps = {
      bold:      ['[b]', '[/b]', '加粗文字'],
      italic:    ['[i]', '[/i]', '斜体文字'],
      underline: ['[u]', '[/u]', '下划线文字'],
      strike:    ['[s]', '[/s]', '删除线文字'],
      mask:      ['[mask]', '[/mask]', '剧透内容'],
      quote:     ['[quote]', '[/quote]', '引用文本'],
      bgm38:     ['(bgm38)', '', '']
    };
    if (tag === 'smiley') {
      if (window.BgmShell && typeof window.BgmShell.openSmiley === 'function') {
        window.BgmShell.openSmiley();
        return;
      }
      tag = 'bgm38';
    }
    var pair = wraps[tag] || ['[mask]', '[/mask]', '剧透内容'];
    var start = typeof area.selectionStart === 'number' ? area.selectionStart : area.value.length;
    var end = typeof area.selectionEnd === 'number' ? area.selectionEnd : area.value.length;
    var sel = area.value.slice(start, end) || pair[2];
    area.value = area.value.slice(0, start) + pair[0] + sel + pair[1] + area.value.slice(end);
    if (typeof area.focus === 'function') area.focus();
  }

  /* ---------------- Master Render & URL Sync ---------------- */
  function switchEpisode(epId, pushUrl) {
    var ctx = findEpisodeContext(epId);
    state.epId = String(ctx.ep.id);
    state.subjectId = String(ctx.subjectId);
    state.activeSubReplyFloorId = null;
    state.editingPostId = null;
    state.likePopTargetId = null;
    state.openMoreMenuPostId = null;
    if (pushUrl !== false && window.history && window.history.replaceState) {
      try {
        window.history.replaceState(null, '', 'ep.html?id=' + encodeURIComponent(state.epId));
      } catch (e) {}
    }
    renderAll();
  }

  function renderAll() {
    var ctx = findEpisodeContext(state.epId);
    state.epId = String(ctx.ep.id);
    state.subjectId = String(ctx.subjectId);
    renderHero(ctx);
    renderEpHeader(ctx);
    renderCommentsSection(ctx);
    renderSidePanel(ctx);
    renderLikePopover();
  }

  /* Expose global legacy helpers referenced in spec onclick attributes */
  window.subReply = function (type, floorId, subId) {
    state.activeSubReplyFloorId = String(floorId);
    renderCommentsSection(findEpisodeContext(state.epId));
    return false;
  };
  window.ignoreUser = function (uid) {
    if (uid) {
      state.ignoredUsers[uid] = uid;
      renderCommentsSection(findEpisodeContext(state.epId));
    }
    return false;
  };

  /* ---------------- Event Delegation ---------------- */
  function initEvents() {
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-epd-act],[data-epd-sort],[data-bbcode]') : null;
      if (!btn) {
        if (state.sortMenuOpen || state.openMoreMenuPostId || state.likePopTargetId) {
          state.sortMenuOpen = false;
          state.openMoreMenuPostId = null;
          state.likePopTargetId = null;
          renderCommentsSection(findEpisodeContext(state.epId));
          renderLikePopover();
        }
        return;
      }

      if (btn.hasAttribute('data-bbcode')) {
        e.preventDefault();
        insertBBCodeTag(btn.getAttribute('data-bbcode'));
        return;
      }

      if (btn.hasAttribute('data-epd-sort')) {
        e.preventDefault();
        state.sort = btn.getAttribute('data-epd-sort') || 'asc';
        state.sortMenuOpen = false;
        renderCommentsSection(findEpisodeContext(state.epId));
        showToast('已切换讨论排序：' + ({ asc: '顺序', desc: '倒序', hot: '热门' }[state.sort] || '顺序'));
        return;
      }

      var act = btn.getAttribute('data-epd-act');
      if (!act) return;

      if (act === 'switch-ep') {
        e.preventDefault();
        var nextId = btn.getAttribute('data-ep-id');
        if (nextId) {
          switchEpisode(nextId, true);
          var c = findEpisodeContext(nextId);
          showToast('已切换至 ' + formatEpCode(c.ep, c.subject) + ' ' + (c.ep.name_cn || c.ep.name));
        }
      } else if (act === 'watch-status') {
        e.preventDefault();
        setEpisodeWatchStatus(btn.getAttribute('data-watch-op'), state.epId);
      } else if (act === 'copy-share') {
        e.preventDefault();
        var ctx = findEpisodeContext(state.epId);
        var shareText = '「' + formatEpCode(ctx.ep, ctx.subject) + ' ' + (ctx.ep.name_cn || ctx.ep.name) + ' / ' + subjCn(ctx.subject) + '」 ep.html?id=' + state.epId;
        showToast('已复制单集分享链接：' + shareText);
      } else if (act === 'toggle-sort-menu') {
        e.preventDefault();
        state.sortMenuOpen = !state.sortMenuOpen;
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'filter-op') {
        e.preventDefault();
        state.hotOnly = !state.hotOnly;
        renderCommentsSection(findEpisodeContext(state.epId));
        showToast(state.hotOnly ? '已开启「只看热议与含子楼层」筛选' : '已显示全部讨论楼层');
      } else if (act === 'toggle-ignored') {
        e.preventDefault();
        state.showIgnored = !state.showIgnored;
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'reset-comment-filter') {
        e.preventDefault();
        state.hotOnly = false;
        state.showIgnored = true;
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'spoiler') {
        btn.classList.toggle('is-revealed');
      } else if (act === 'toggle-subreply') {
        e.preventDefault();
        var fid = btn.getAttribute('data-floor-id');
        var rto = btn.getAttribute('data-reply-to') || '';
        if (state.activeSubReplyFloorId === fid && state.subReplyTargetUser === rto) {
          state.activeSubReplyFloorId = null;
          state.subReplyTargetUser = '';
        } else {
          state.activeSubReplyFloorId = fid;
          state.subReplyTargetUser = rto;
        }
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'close-subreply') {
        e.preventDefault();
        state.activeSubReplyFloorId = null;
        state.subReplyTargetUser = '';
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'insert-sub-mask') {
        e.preventDefault();
        var sfid = btn.getAttribute('data-floor-id');
        var sinp = $('subReplyInput_' + sfid);
        if (sinp) sinp.value = (sinp.value || '') + '[mask]剧透内容[/mask]';
      } else if (act === 'submit-subreply') {
        e.preventDefault();
        submitSubReply(btn.getAttribute('data-floor-id'));
      } else if (act === 'toggle-like-pop') {
        e.preventDefault();
        var tid = btn.getAttribute('data-target-id');
        state.likePopTargetId = state.likePopTargetId === tid ? null : tid;
        renderLikePopover();
      } else if (act === 'close-like-pop') {
        e.preventDefault();
        state.likePopTargetId = null;
        renderLikePopover();
      } else if (act === 'pick-reaction' || act === 'toggle-reaction') {
        e.preventDefault();
        toggleReactionOnFloor(btn.getAttribute('data-target-id'), btn.getAttribute('data-val'));
      } else if (act === 'toggle-more-menu') {
        e.preventDefault();
        var pid = btn.getAttribute('data-post-id');
        state.openMoreMenuPostId = state.openMoreMenuPostId === pid ? null : pid;
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'ignore-user') {
        e.preventDefault();
        var uid = btn.getAttribute('data-uid');
        var uname = btn.getAttribute('data-uname') || uid;
        if (uid) {
          state.ignoredUsers[uid] = uname;
          state.openMoreMenuPostId = null;
          renderCommentsSection(findEpisodeContext(state.epId));
          showToast('已与「' + uname + '」绝交，其发言已自动折叠');
        }
      } else if (act === 'unignore-user') {
        e.preventDefault();
        var unuid = btn.getAttribute('data-uid');
        delete state.ignoredUsers[unuid];
        renderCommentsSection(findEpisodeContext(state.epId));
        showToast('已解除绝交屏蔽 ✓');
      } else if (act === 'open-report') {
        e.preventDefault();
        state.openMoreMenuPostId = null;
        state.reportTarget = {
          postId: btn.getAttribute('data-post-id'),
          floor: btn.getAttribute('data-floor') || '#?',
          uname: btn.getAttribute('data-uname') || '该用户'
        };
        var rinfo = $('epReportTargetInfo');
        if (rinfo) rinfo.textContent = '举报对象：楼层 ' + state.reportTarget.floor + ' · 用户「' + state.reportTarget.uname + '」 (Post #' + state.reportTarget.postId + ')';
        var rmod = $('epReportModal');
        if (rmod) rmod.hidden = false;
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'close-report-modal') {
        e.preventDefault();
        var rmodClose = $('epReportModal');
        if (rmodClose) rmodClose.hidden = true;
      } else if (act === 'edit-post') {
        e.preventDefault();
        startEditPost(btn.getAttribute('data-target-id'));
      } else if (act === 'save-edit-post') {
        e.preventDefault();
        saveEditPost(btn.getAttribute('data-target-id'));
      } else if (act === 'cancel-edit-post') {
        e.preventDefault();
        state.editingPostId = null;
        state.editingText = '';
        renderCommentsSection(findEpisodeContext(state.epId));
      } else if (act === 'delete-post') {
        e.preventDefault();
        deletePost(btn.getAttribute('data-target-id'));
      } else if (act === 'open-edit-meta') {
        e.preventDefault();
        var curCtx = findEpisodeContext(state.epId);
        var eSort = $('editEpSortInput'); if (eSort) eSort.value = String(curCtx.ep.sort || 1);
        var eDur = $('editEpDurationInput'); if (eDur) eDur.value = curCtx.ep.duration || '00:24:00';
        var eAir = $('editEpAirdateInput'); if (eAir) eAir.value = curCtx.ep.airdate || '';
        var eName = $('editEpNameInput'); if (eName) eName.value = curCtx.ep.name || '';
        var eCn = $('editEpNameCnInput'); if (eCn) eCn.value = curCtx.ep.name_cn || '';
        var eDesc = $('editEpDescInput'); if (eDesc) eDesc.value = curCtx.ep.synopsis || '';
        var emod = $('epEditMetaModal');
        if (emod) emod.hidden = false;
      } else if (act === 'close-edit-meta') {
        e.preventDefault();
        var emodClose = $('epEditMetaModal');
        if (emodClose) emodClose.hidden = true;
      } else if (act === 'side-cat') {
        e.preventDefault();
        state.sideCatFilter = btn.getAttribute('data-cat') || 'all';
        renderSidePanel(findEpisodeContext(state.epId));
      } else if (act === 'anchor') {
        var pidAnchor = btn.getAttribute('data-post-id');
        var elPost = $('post_' + pidAnchor);
        if (elPost && elPost.scrollIntoView) elPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Floor slider input
    var slider = $('epSliderInput');
    if (slider) {
      slider.addEventListener('input', function () {
        var ctx = findEpisodeContext(state.epId);
        var floors = getSortedFilteredFloors(ctx);
        var idx = Math.max(1, Math.min(floors.length, parseInt(slider.value, 10) || 1));
        var valEl = $('epSliderVal');
        if (valEl) valEl.textContent = '#' + idx + ' / ' + floors.length;
        var target = floors[idx - 1];
        if (target) {
          var rowEl = $('post_' + target.id);
          if (rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    // Bottom ReplyForm submit
    var replyForm = $('ReplyForm');
    if (replyForm) {
      replyForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var area = $('content');
        var text = area ? String(area.value || '').trim() : '';
        if (!text) {
          showToast('请输入回复内容后再点击「加上去」');
          return;
        }
        var ctx = findEpisodeContext(state.epId);
        var floors = getFloorsForContext(ctx);
        var maxFloor = floors.reduce(function (m, f) { return Math.max(m, Number(f.floorNum) || 0); }, 0);
        var nextNum = maxFloor + 1;
        var newFloor = {
          id: String(Date.now()),
          floor: '#' + nextNum,
          floorNum: nextNum,
          uid: CURRENT_USER.uid,
          author: CURRENT_USER.author,
          avatar: CURRENT_USER.avatar,
          sign: CURRENT_USER.sign,
          time: '刚刚',
          content: text,
          likes: [],
          subs: [],
          isSelf: true
        };
        floors.push(newFloor);
        if (area) area.value = '';
        renderEpHeader(ctx);
        renderCommentsSection(ctx);
        showToast('已发表新讨论楼层 ' + newFloor.floor + ' ✓');
      });
    }

    // Edit episode meta form submit
    var editForm = $('epEditMetaForm');
    if (editForm) {
      editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var ctx = findEpisodeContext(state.epId);
        var eSort = $('editEpSortInput');
        var eDur = $('editEpDurationInput');
        var eAir = $('editEpAirdateInput');
        var eName = $('editEpNameInput');
        var eCn = $('editEpNameCnInput');
        var eDesc = $('editEpDescInput');
        if (eSort && eSort.value) ctx.ep.sort = Number(eSort.value) || ctx.ep.sort;
        if (eDur) ctx.ep.duration = eDur.value.trim();
        if (eAir) ctx.ep.airdate = eAir.value.trim();
        if (eName && eName.value.trim()) ctx.ep.name = eName.value.trim();
        if (eCn) ctx.ep.name_cn = eCn.value.trim();
        if (eDesc) ctx.ep.synopsis = eDesc.value.trim();
        var emod = $('epEditMetaModal');
        if (emod) emod.hidden = true;
        renderAll();
        showToast('已保存本集章节维基信息修改 ✓');
      });
    }

    // Report form submit
    var repForm = $('epReportForm');
    if (repForm) {
      repForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var rmod = $('epReportModal');
        if (rmod) rmod.hidden = true;
        var targetFloor = (state.reportTarget && state.reportTarget.floor) || '';
        showToast('已提交针对 ' + targetFloor + ' 的疑虑报告，管理员将尽快核查 ✓');
      });
    }

    // Theme toggle button
    var themeBtn = $('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var root = document.documentElement;
        var cur = root.getAttribute('data-theme') || 'light';
        root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
      });
    }
  }

  function initFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var qId = params.get('id') || params.get('ep');
      if (qId) state.epId = qId;
    } catch (e) {}
    renderAll();
    initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFromUrl);
  } else {
    initFromUrl();
  }
})();
