/**
 * Bangumi 条目透视统计页核心交互控制器 (Page 11: /subject/{id}/stats)
 * 驱动：
 *  1. 全站 8 部跨品类预设条目无缝切换 (?id=400602 / 265 / 253 / 305429 / 310920 / 477900 / 37141 / 225581)
 *  2. 线上原生 div.gridStats (全站 6 维 + VIB 3 维) + 传统十星级展示 (★×n + ☆×(10-n))
 *  3. 人群分群去噪重算模拟器 (#bstCohortInspector)
 *  4. Spec Page 11 单栏 #colunmSingle 四大 Highcharts SVG 统计图 (#chartCollect, #chartInterest, #chartForce, #chartVib)
 *     - 支持 .highcharts-legend-item 点击开关序列
 *     - 支持 1M / 3M / 6M / 1Y / ALL 时间跨度缩放
 *  5. 线上 r771 双栏 .columns.columns-full (#columnInSubjectA + #columnInSubjectB) 六维 CHART_SETS 深度矩阵
 *     - 支持「绝对票数堆叠 / 100% 占比归一」切换與「各分档均分折线」叠加开关
 */
(function () {
  'use strict';

  var SERIES_PALETTE = [
    '#f09199', '#38bdf8', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
  ];

  var state = {
    subjectId: '400602',
    viewMode: 'all',          // 'all' | 'trends' | 'matrix'
    stackMode: 'count',       // 'count' | 'percent'
    showScoreLine: true,
    simPreset: 'all',         // 'all' | 'done_only' | 'no_drop' | 'heavy_viewer' | 'veteran_3y' | 'vib_only'
    zoomRange: {
      interest: 12,
      force: 12
    },
    vibMetric: 'pct',         // 'pct' | 'count'
    hiddenLegends: {
      collect: {},
      interest: {},
      force: {},
      vibCompare: {},
      interest_type: {},
      airdate: {},
      total_collects: {},
      vib: {},
      regdate: {},
      relative_regdate: {}
    }
  };

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtNum(n) {
    var v = Number(n || 0);
    return isFinite(v) ? v.toLocaleString('en-US') : '0';
  }

  function formatTenStars(score) {
    var num = Number(score || 0);
    var filled = Math.max(0, Math.min(10, Math.round(num)));
    var stars = '';
    for (var i = 0; i < 10; i++) {
      stars += i < filled ? '★' : '☆';
    }
    return {
      glyph: stars,
      numText: num.toFixed(2),
      full: stars + ' ' + num.toFixed(2)
    };
  }

  function showToast(msg) {
    var host = document.getElementById('toastContainer');
    if (!host) return;
    var item = document.createElement('div');
    item.className = 'glass-toast';
    item.innerHTML = '<span>📊</span><span>' + escHtml(msg) + '</span>';
    host.appendChild(item);
    setTimeout(function () {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-6px)';
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 260);
    }, 2200);
  }

  function getSubjectData(sid) {
    var all = window.SUBJECT_STATS_DATA || {};
    return all[sid] || all['400602'] || null;
  }

  function parseInitialUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var sid = params.get('id');
      if (sid && window.SUBJECT_STATS_DATA && window.SUBJECT_STATS_DATA[sid]) {
        state.subjectId = sid;
      }
      var view = params.get('view');
      if (view === 'all' || view === 'trends' || view === 'matrix') {
        state.viewMode = view;
      }
    } catch (e) {}
  }

  /* ==================== 1. 头部 Banner 与一级导航同步 ==================== */
  function renderBannerAndNav(bundle) {
    var meta = bundle.meta;
    window.CHART_SETS = bundle.chart_sets;

    document.title = (meta.name_cn || meta.name) + ' 的透视统计 · Bangumi 番组计划';

    var typeBadge = document.getElementById('subjectTypeBadge');
    if (typeBadge) typeBadge.textContent = meta.type_label || 'TV 动画';

    var rankBadge = document.getElementById('subjectRankBadge');
    if (rankBadge) rankBadge.textContent = 'Rank #' + (meta.rank || 1);

    var titleJp = document.getElementById('subjectTitleJp');
    if (titleJp) titleJp.textContent = meta.name;

    var titleCn = document.getElementById('subjectTitleCn');
    if (titleCn) titleCn.textContent = meta.name_cn || meta.name;

    var backdrop = document.getElementById('subjectBackdrop');
    if (backdrop && meta.cover) {
      backdrop.style.backgroundImage = 'url("' + meta.cover + '")';
    }

    // 预设切换胶囊高亮
    var pills = document.querySelectorAll('#bannerCategoryBar [data-subject-id]');
    Array.prototype.forEach.call(pills, function (btn) {
      var isAct = btn.getAttribute('data-subject-id') === String(bundle.id);
      btn.classList.toggle('active', isAct);
    });

    // 一级导航 Tabs 同步更新
    var nav = document.getElementById('subjectNavTabs');
    if (nav) {
      var sid = encodeURIComponent(bundle.id);
      var epLabel = meta.type_key === 'book' ? '章节/卷数' : meta.type_key === 'music' ? '曲目列表' : meta.type_key === 'game' ? '章节/DLC' : '章节';
      var crtLabel = meta.type_key === 'music' ? '关联角色' : meta.type_key === 'real' ? '出演角色' : '角色';
      var prsnLabel = meta.type_key === 'book' ? '作者/出版社' : meta.type_key === 'music' ? '艺术家/制作' : meta.type_key === 'game' ? '开发团队' : '制作人员';

      var tabs = [
        { key: 'overview', label: '概览', href: 'subject.html?id=' + sid },
        { key: 'episodes', label: epLabel, count: meta.eps || 12, href: 'subject-ep.html?id=' + sid },
        { key: 'characters', label: crtLabel, count: 24, href: 'subject-characters.html?id=' + sid },
        { key: 'persons', label: prsnLabel, count: 48, href: 'subject-persons.html?id=' + sid },
        { key: 'comments', label: '吐槽箱', count: fmtNum(meta.total_votes), href: 'subject-comments.html?id=' + sid },
        { key: 'reviews', label: '评论', count: 15, href: 'subject-reviews.html?id=' + sid + '&tab=reviews' },
        { key: 'board', label: '讨论版', count: 20, href: 'subject-reviews.html?id=' + sid + '&tab=board' },
        { key: 'stats', label: '透视', count: 'Stats', href: 'subject-stats.html?id=' + sid, active: true },
        { key: 'wiki', label: '维基修订', count: 'Wiki', href: 'subject-wiki.html?id=' + sid }
      ];

      nav.innerHTML = tabs.map(function (t) {
        var countSpan = t.count != null ? ' <span class="tab-count">' + escHtml(t.count) + '</span>' : '';
        return '<li class="subject-nav-tab-item' + (t.active ? ' active' : '') + '">' +
          '<a href="' + t.href + '"' + (t.active ? ' class="focus"' : '') + ' data-tab="' + t.key + '">' +
            escHtml(t.label) + countSpan +
          '</a>' +
        '</li>';
      }).join('');
    }

    var netaLink = document.getElementById('bstNetabareLink');
    if (netaLink) {
      netaLink.href = meta.netabare_url || ('https://netaba.re/subject/' + bundle.id);
    }

    var airSub = document.getElementById('bstAirdateSubtitle');
    if (airSub && bundle.chart_sets && bundle.chart_sets.airdate) {
      airSub.textContent = bundle.chart_sets.airdate.desc || ('统计周期：' + (meta.air_period || ''));
    }
  }

  /* ==================== 2. 原生 gridStats KPI 面板渲染 ==================== */
  function renderKpiPanels(bundle) {
    var meta = bundle.meta;
    var overallEl = document.getElementById('bstOverallGridStats');
    if (overallEl && bundle.overall_stats) {
      overallEl.innerHTML = bundle.overall_stats.map(function (it) {
        return '<div class="item ' + escHtml(it.color || 'default') + '">' +
          '<span class="num">' + escHtml(it.num) + '</span>' +
          '<span class="desc">' + escHtml(it.desc) + '</span>' +
        '</div>';
      }).join('');
    }

    var vibEl = document.getElementById('bstVibGridStats');
    if (vibEl && bundle.vib_stats) {
      vibEl.innerHTML = bundle.vib_stats.map(function (it) {
        return '<div class="item ' + escHtml(it.color || 'default') + '">' +
          '<span class="num">' + escHtml(it.num) + '</span>' +
          '<span class="desc">' + escHtml(it.desc) + '</span>' +
        '</div>';
      }).join('');
    }

    var allStars = formatTenStars(meta.score);
    var allBadge = document.getElementById('bstOverallTenStarBadge');
    if (allBadge) {
      allBadge.innerHTML =
        '<span class="bst-stars-glyph">' + allStars.glyph + '</span>' +
        '<span>' + allStars.numText + ' / 10 (' + escHtml(meta.score_desc) + ')</span>';
    }

    var vibStars = formatTenStars(meta.vib_score);
    var vibBadge = document.getElementById('bstVibTenStarBadge');
    if (vibBadge) {
      vibBadge.innerHTML =
        '<span class="bst-stars-glyph">' + vibStars.glyph + '</span>' +
        '<span>' + vibStars.numText + ' / 10 (' + escHtml(meta.vib_desc) + ')</span>';
    }

    var ratePct = ((meta.total_votes / Math.max(1, meta.total_collect)) * 100).toFixed(1);
    var stdLabel = meta.std_dev < 1.15 ? '共识度极高（口碑一致）' : meta.std_dev < 1.35 ? '共识度高（口碑稳健）' : '存在一定分歧（观点多元）';
    var overallDiag = document.getElementById('bstOverallDiagnostic');
    if (overallDiag) {
      overallDiag.innerHTML =
        '<span>📌 评分转化率：<strong>' + ratePct + '%</strong>（' + fmtNum(meta.total_votes) + ' / ' + fmtNum(meta.total_collect) + ' 人已打分）</span>' +
        '<span>📐 离散度诊断：<strong>标准差 ' + meta.std_dev.toFixed(2) + ' · ' + stdLabel + '</strong></span>';
    }

    var diff = Number(meta.score_diff_vib || 0);
    var diffSign = diff >= 0 ? '+' : '';
    var diffCls = diff >= 0 ? 'is-pos' : 'is-neg';
    var vibShare = ((meta.vib_votes / Math.max(1, meta.total_votes)) * 100).toFixed(1);
    var vibDiag = document.getElementById('bstVibDiagnostic');
    if (vibDiag) {
      vibDiag.innerHTML =
        '<span>⚖️ VIB vs 全站分差：<span class="bst-delta-pill ' + diffCls + '">Δ ' + diffSign + diff.toFixed(2) + ' 分</span></span>' +
        '<span>🎯 核心样本占比：<strong>' + vibShare + '%</strong>（' + fmtNum(meta.vib_votes) + ' 位资深用户参与评分）</span>';
    }
  }

  /* ==================== 3. 人群分群去噪重算模拟器 ==================== */
  function computeCohortSimulation(bundle, preset) {
    var cs = bundle.chart_sets;
    var starCounts = {};
    for (var s = 1; s <= 10; s++) starCounts[s] = 0;

    var cohortLabel = '全站全量样本';
    if (preset === 'done_only') {
      cohortLabel = '仅看「' + (bundle.meta.verbs ? bundle.meta.verbs.collect : '看过') + '」完成状态用户';
      (cs.interest_type.data || []).forEach(function (row) {
        starCounts[intOf(row.title)] += intOf(row['2']);
      });
    } else if (preset === 'no_drop') {
      cohortLabel = '剔除「抛弃 / 想看」极端情绪样本';
      (cs.interest_type.data || []).forEach(function (row) {
        starCounts[intOf(row.title)] += intOf(row['2']) + intOf(row['3']) + intOf(row['4']);
      });
    } else if (preset === 'heavy_viewer') {
      cohortLabel = '阅片量 ≥ 100 部资深番友 (100+ / 200+ / 500+ / 1000+)';
      (cs.total_collects.data || []).forEach(function (row) {
        starCounts[intOf(row.title)] += intOf(row['100']) + intOf(row['200']) + intOf(row['500']) + intOf(row['1000']);
      });
    } else if (preset === 'veteran_3y') {
      cohortLabel = '注册满 2 年以上资深老用户 (2年 / 3年 / >3年)';
      (cs.regdate.data || []).forEach(function (row) {
        starCounts[intOf(row.title)] += intOf(row['730']) + intOf(row['1095']) + intOf(row['1825']);
      });
    } else if (preset === 'vib_only') {
      cohortLabel = '仅看 VIB (Very Important Bangumier) 核心样本';
      (cs.vib.data || []).forEach(function (row) {
        starCounts[intOf(row.title)] += intOf(row.vib);
      });
    } else {
      cohortLabel = '全站全量样本';
      (cs.interest_type.data || []).forEach(function (row) {
        var sc = intOf(row.title);
        starCounts[sc] += intOf(row['1']) + intOf(row['2']) + intOf(row['3']) + intOf(row['4']) + intOf(row['5']);
      });
    }

    var totalVotes = 0;
    var weightedSum = 0;
    var modeStar = 8;
    var modeMax = -1;
    for (var k = 1; k <= 10; k++) {
      var c = starCounts[k] || 0;
      totalVotes += c;
      weightedSum += k * c;
      if (c > modeMax) {
        modeMax = c;
        modeStar = k;
      }
    }
    var avg = totalVotes > 0 ? weightedSum / totalVotes : bundle.meta.score;
    var varSum = 0;
    for (var m = 1; m <= 10; m++) {
      var cnt = starCounts[m] || 0;
      varSum += cnt * Math.pow(m - avg, 2);
    }
    var std = totalVotes > 0 ? Math.sqrt(varSum / totalVotes) : 0;

    return {
      label: cohortLabel,
      avg: avg,
      std: std,
      votes: totalVotes,
      modeStar: modeStar,
      delta: avg - bundle.meta.score,
      sharePct: (totalVotes / Math.max(1, bundle.meta.total_votes)) * 100
    };
  }

  function intOf(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }

  function renderSimulator(bundle) {
    var chips = document.querySelectorAll('#bstSimFilters [data-act="sim-preset"]');
    Array.prototype.forEach.call(chips, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-preset') === state.simPreset);
    });

    var sim = computeCohortSimulation(bundle, state.simPreset);
    var st = formatTenStars(sim.avg);

    var nameEl = document.getElementById('bstSimCohortName');
    if (nameEl) nameEl.textContent = '当前分群：' + sim.label;

    var numEl = document.getElementById('bstSimScoreNum');
    if (numEl) numEl.textContent = sim.avg.toFixed(2);

    var deltaEl = document.getElementById('bstSimDeltaPill');
    if (deltaEl) {
      if (Math.abs(sim.delta) < 0.005) {
        deltaEl.className = 'bst-delta-pill is-pos';
        deltaEl.textContent = '基准 ±0.00';
      } else {
        deltaEl.className = 'bst-delta-pill ' + (sim.delta >= 0 ? 'is-pos' : 'is-neg');
        deltaEl.textContent = 'Δ ' + (sim.delta >= 0 ? '+' : '') + sim.delta.toFixed(2) + ' 分';
      }
    }

    var starsEl = document.getElementById('bstSimStarsText');
    if (starsEl) starsEl.textContent = st.glyph + ' ' + st.numText + ' / 10';

    var metaCol = document.getElementById('bstSimMetaCol');
    if (metaCol) {
      metaCol.innerHTML =
        '<span>有效样本量：<strong>' + fmtNum(sim.votes) + '</strong> 票 (' + sim.sharePct.toFixed(1) + '%)</span>' +
        '<span>分群标准差：<strong>' + sim.std.toFixed(2) + '</strong> · 众数：<strong>' + sim.modeStar + '★</strong></span>';
    }
  }

  /* ==================== 4. Spec Page 11 四大核心 SVG 图表 (#colunmSingle) ==================== */

  // 4.1 收藏状态分布环形图 (#chartCollect)
  function renderChartCollect(bundle) {
    var host = document.getElementById('chartCollect');
    if (!host) return;
    var hidden = state.hiddenLegends.collect || {};
    var items = bundle.collect_status_counts || [];

    var activeTotal = 0;
    items.forEach(function (it) {
      if (!hidden[it.key]) activeTotal += it.count;
    });

    var cx = 105, cy = 105, r = 74, strokeW = 26;
    var circum = 2 * Math.PI * r;
    var offsetAcc = 0;
    var circlesSvg = '';

    items.forEach(function (it) {
      if (hidden[it.key] || activeTotal <= 0 || it.count <= 0) return;
      var frac = it.count / activeTotal;
      var segLen = frac * circum;
      var dashArray = segLen.toFixed(2) + ' ' + Math.max(0, circum - segLen).toFixed(2);
      var dashOffset = (-offsetAcc).toFixed(2);
      offsetAcc += segLen;

      var pctText = (frac * 100).toFixed(1) + '%';
      circlesSvg +=
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
          'stroke="' + it.color + '" stroke-width="' + strokeW + '" ' +
          'stroke-dasharray="' + dashArray + '" stroke-dashoffset="' + dashOffset + '" ' +
          'transform="rotate(-90 ' + cx + ' ' + cy + ')" ' +
          'data-tt-title="收藏状态：' + escHtml(it.label) + '" ' +
          'data-tt-body="收藏人数：' + fmtNum(it.count) + ' 人 (' + pctText + ')|已评分数：' + fmtNum(it.rated) + ' 票" ' +
          'style="cursor:pointer;transition:stroke-dasharray 0.3s ease;" />';
    });

    var barsHtml = items.map(function (it) {
      var isOff = !!hidden[it.key];
      var pct = activeTotal > 0 && !isOff ? ((it.count / activeTotal) * 100) : 0;
      var ratedRate = it.count > 0 ? Math.min(100, (it.rated / it.count) * 100).toFixed(1) : '0.0';
      return '<div class="bst-donut-bar-item" style="' + (isOff ? 'opacity:0.38;' : '') + '">' +
        '<div class="bst-donut-bar-head">' +
          '<span class="bst-donut-bar-label">' +
            '<span class="highcharts-legend-swatch" style="background:' + it.color + ';"></span>' +
            escHtml(it.label) +
          '</span>' +
          '<span class="bst-donut-bar-nums">' + fmtNum(it.count) + ' 人 (' + pct.toFixed(1) + '%) · 评 ' + ratedRate + '%</span>' +
        '</div>' +
        '<div class="bst-donut-track">' +
          '<div class="bst-donut-fill" style="width:' + pct.toFixed(1) + '%;background:' + it.color + ';"></div>' +
        '</div>' +
      '</div>';
    }).join('');

    var legendHtml = items.map(function (it) {
      var isOff = !!hidden[it.key];
      return '<span class="highcharts-legend-item' + (isOff ? ' is-hidden' : '') + '" ' +
        'data-act="toggle-legend" data-chart="collect" data-series="' + escHtml(it.key) + '">' +
        '<span class="highcharts-legend-swatch" style="background:' + it.color + ';"></span>' +
        '<span>' + escHtml(it.label) + ' (' + fmtNum(it.count) + ')</span>' +
      '</span>';
    }).join('');

    host.innerHTML =
      '<div class="bst-donut-layout">' +
        '<svg class="bst-svg-stage" viewBox="0 0 210 210" aria-label="收藏状态分布环形图">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(148,163,184,0.15)" stroke-width="' + strokeW + '" />' +
          circlesSvg +
          '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="18" font-weight="800" fill="currentColor">' + fmtNum(activeTotal) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="11" fill="#64748b">有效收藏总计</text>' +
        '</svg>' +
        '<div class="bst-donut-bars">' + barsHtml + '</div>' +
      '</div>' +
      '<div class="highcharts-legend">' + legendHtml + '</div>';
  }

  // 4.2 各状态人数随时间变化趋势折线图 (#chartInterest)
  function renderChartInterest(bundle) {
    var host = document.getElementById('chartInterest');
    if (!host) return;
    var hidden = state.hiddenLegends.interest || {};
    var fullTimeline = bundle.interest_timeline || [];
    var count = Math.min(fullTimeline.length, state.zoomRange.interest || 12);
    var timeline = fullTimeline.slice(fullTimeline.length - count);

    var verbs = bundle.meta.verbs || { collect: '看过', doing: '在看', wish: '想看', on_hold: '搁置', dropped: '抛弃' };
    var seriesDefs = [
      { key: 'collect', label: verbs.collect, color: '#10b981' },
      { key: 'doing',   label: verbs.doing,   color: '#38bdf8' },
      { key: 'wish',    label: verbs.wish,    color: '#f472b6' },
      { key: 'on_hold', label: verbs.on_hold, color: '#f59e0b' },
      { key: 'dropped', label: verbs.dropped, color: '#94a3b8' }
    ];

    var W = 560, H = 225, padL = 52, padR = 18, padT = 18, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxVal = 10;
    timeline.forEach(function (pt) {
      seriesDefs.forEach(function (s) {
        if (!hidden[s.key] && pt[s.key] > maxVal) maxVal = pt[s.key];
      });
    });

    var gridSvg = '';
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      var gVal = Math.round((g / 4) * maxVal);
      gridSvg +=
        '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(148,163,184,0.18)" stroke-dasharray="3 3" />' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#64748b">' + fmtCompact(gVal) + '</text>';
    }

    var xLabelsSvg = '';
    timeline.forEach(function (pt, idx) {
      var x = padL + (idx / Math.max(1, timeline.length - 1)) * plotW;
      if (idx === 0 || idx === timeline.length - 1 || idx % 2 === 1) {
        xLabelsSvg += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#64748b">' + escHtml(pt.date.slice(2)) + '</text>';
      }
    });

    var pathsSvg = '';
    var dotsSvg = '';
    seriesDefs.forEach(function (s) {
      if (hidden[s.key]) return;
      var pts = timeline.map(function (pt, idx) {
        var x = padL + (idx / Math.max(1, timeline.length - 1)) * plotW;
        var y = padT + plotH - ((pt[s.key] || 0) / maxVal) * plotH;
        return { x: x, y: y, val: pt[s.key] || 0, date: pt.date };
      });
      var d = pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }).join(' ');
      pathsSvg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />';
      pts.forEach(function (p) {
        dotsSvg +=
          '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.6" fill="' + s.color + '" stroke="#fff" stroke-width="1.2" ' +
            'data-tt-title="' + escHtml(p.date + ' · ' + s.label) + '" ' +
            'data-tt-body="累计人数：' + fmtNum(p.val) + ' 人" style="cursor:pointer;" />';
      });
    });

    var legendHtml = seriesDefs.map(function (s) {
      var isOff = !!hidden[s.key];
      var lastVal = timeline.length ? timeline[timeline.length - 1][s.key] : 0;
      return '<span class="highcharts-legend-item' + (isOff ? ' is-hidden' : '') + '" ' +
        'data-act="toggle-legend" data-chart="interest" data-series="' + s.key + '">' +
        '<span class="highcharts-legend-swatch" style="background:' + s.color + ';"></span>' +
        '<span>' + escHtml(s.label) + ' (' + fmtNum(lastVal) + ')</span>' +
      '</span>';
    }).join('');

    host.innerHTML =
      '<svg class="bst-svg-stage" viewBox="0 0 ' + W + ' ' + H + '" aria-label="各状态人数随时间变化趋势折线图">' +
        gridSvg + xLabelsSvg + pathsSvg + dotsSvg +
      '</svg>' +
      '<div class="highcharts-legend">' + legendHtml + '</div>';
  }

  // 4.3 战力/热度指数与全站均分双轴走势图 (#chartForce)
  function renderChartForce(bundle) {
    var host = document.getElementById('chartForce');
    if (!host) return;
    var hidden = state.hiddenLegends.force || {};
    var fullTimeline = bundle.force_timeline || [];
    var count = Math.min(fullTimeline.length, state.zoomRange.force || 12);
    var timeline = fullTimeline.slice(fullTimeline.length - count);

    var W = 560, H = 225, padL = 50, padR = 42, padT = 18, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxForce = 100;
    var minScore = 10, maxScore = 1;
    timeline.forEach(function (pt) {
      if (pt.force > maxForce) maxForce = pt.force;
      if (pt.score < minScore) minScore = pt.score;
      if (pt.score > maxScore) maxScore = pt.score;
    });
    minScore = Math.max(1, Math.floor((minScore - 0.3) * 10) / 10);
    maxScore = Math.min(10, Math.ceil((maxScore + 0.3) * 10) / 10);
    var scoreSpan = Math.max(0.5, maxScore - minScore);

    var gridSvg = '';
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      var fVal = Math.round((g / 4) * maxForce);
      var sVal = (minScore + (g / 4) * scoreSpan).toFixed(2);
      gridSvg +=
        '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(148,163,184,0.18)" stroke-dasharray="3 3" />' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#f09199">' + fmtCompact(fVal) + '</text>' +
        '<text x="' + (W - padR + 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="start" font-size="10" fill="#f59e0b">' + sVal + '★</text>';
    }

    var xLabelsSvg = '';
    timeline.forEach(function (pt, idx) {
      var x = padL + (idx / Math.max(1, timeline.length - 1)) * plotW;
      if (idx === 0 || idx === timeline.length - 1 || idx % 2 === 1) {
        xLabelsSvg += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#64748b">' + escHtml(pt.date.slice(2)) + '</text>';
      }
    });

    var contentSvg = '';
    if (!hidden.force) {
      var fPts = timeline.map(function (pt, idx) {
        var x = padL + (idx / Math.max(1, timeline.length - 1)) * plotW;
        var y = padT + plotH - (pt.force / maxForce) * plotH;
        return { x: x, y: y, pt: pt };
      });
      var lineD = fPts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      var areaD = lineD + ' L' + fPts[fPts.length - 1].x.toFixed(1) + ',' + (padT + plotH) + ' L' + fPts[0].x.toFixed(1) + ',' + (padT + plotH) + ' Z';
      contentSvg +=
        '<path d="' + areaD + '" fill="rgba(240,145,153,0.16)" />' +
        '<path d="' + lineD + '" fill="none" stroke="#f09199" stroke-width="2.5" />';
      fPts.forEach(function (p) {
        contentSvg +=
          '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.6" fill="#f09199" stroke="#fff" stroke-width="1.2" ' +
            'data-tt-title="' + escHtml(p.pt.date + ' · 战力与热度') + '" ' +
            'data-tt-body="战力指数：' + fmtNum(p.pt.force) + '|当期均分：' + p.pt.score.toFixed(2) + ' ★|全站排名：Rank #' + p.pt.rank + '" style="cursor:pointer;" />';
      });
    }

    if (!hidden.score) {
      var sPts = timeline.map(function (pt, idx) {
        var x = padL + (idx / Math.max(1, timeline.length - 1)) * plotW;
        var y = padT + plotH - ((pt.score - minScore) / scoreSpan) * plotH;
        return { x: x, y: y, pt: pt };
      });
      var sLine = sPts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
      contentSvg += '<path d="' + sLine + '" fill="none" stroke="#f59e0b" stroke-width="2.4" stroke-dasharray="5 3" />';
      sPts.forEach(function (p) {
        contentSvg +=
          '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.6" fill="#f59e0b" stroke="#fff" stroke-width="1.2" ' +
            'data-tt-title="' + escHtml(p.pt.date + ' · 全站均分走势') + '" ' +
            'data-tt-body="全站均分：' + p.pt.score.toFixed(2) + ' / 10|累计评分：' + fmtNum(p.pt.votes) + ' 票|排名：Rank #' + p.pt.rank + '" style="cursor:pointer;" />';
      });
    }

    var legendHtml =
      '<span class="highcharts-legend-item' + (hidden.force ? ' is-hidden' : '') + '" data-act="toggle-legend" data-chart="force" data-series="force">' +
        '<span class="highcharts-legend-swatch" style="background:#f09199;"></span>' +
        '<span>战力/热度指数 (Force Index)</span>' +
      '</span>' +
      '<span class="highcharts-legend-item' + (hidden.score ? ' is-hidden' : '') + '" data-act="toggle-legend" data-chart="force" data-series="score">' +
        '<span class="highcharts-legend-swatch" style="background:#f59e0b;"></span>' +
        '<span>全站 10★ 均分演化曲线</span>' +
      '</span>';

    host.innerHTML =
      '<svg class="bst-svg-stage" viewBox="0 0 ' + W + ' ' + H + '" aria-label="战力热度指数与均分走势图">' +
        gridSvg + xLabelsSvg + contentSvg +
      '</svg>' +
      '<div class="highcharts-legend">' + legendHtml + '</div>';
  }

  // 4.4 不同群体评分分布对比 (#chartVib: 全站 vs VIB)
  function renderChartVibCompare(bundle) {
    var host = document.getElementById('chartVib');
    if (!host) return;
    var hidden = state.hiddenLegends.vibCompare || {};
    var rows = bundle.score_comparison || [];
    var isPct = state.vibMetric === 'pct';

    var W = 560, H = 225, padL = 44, padR = 16, padT = 18, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxVal = 10;
    rows.forEach(function (r) {
      var a = isPct ? r.all_pct : r.all_count;
      var v = isPct ? r.vib_pct : r.vib_count;
      if (!hidden.all && a > maxVal) maxVal = a;
      if (!hidden.vib && v > maxVal) maxVal = v;
    });

    var gridSvg = '';
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      var gv = (g / 4) * maxVal;
      var label = isPct ? gv.toFixed(0) + '%' : fmtCompact(Math.round(gv));
      gridSvg +=
        '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(148,163,184,0.18)" stroke-dasharray="3 3" />' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#64748b">' + label + '</text>';
    }

    var groupW = plotW / Math.max(1, rows.length);
    var barW = Math.min(16, groupW * 0.34);
    var barsSvg = '';

    rows.forEach(function (r, idx) {
      var cx = padL + (idx + 0.5) * groupW;
      var aVal = isPct ? r.all_pct : r.all_count;
      var vVal = isPct ? r.vib_pct : r.vib_count;

      if (!hidden.all) {
        var ah = (aVal / maxVal) * plotH;
        var ay = padT + plotH - ah;
        var ax = hidden.vib ? (cx - barW / 2) : (cx - barW - 1.5);
        barsSvg +=
          '<rect x="' + ax.toFixed(1) + '" y="' + ay.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, ah).toFixed(1) + '" rx="3" fill="#f09199" ' +
            'data-tt-title="' + r.star + '★ · 全站用户 vs VIB" ' +
            'data-tt-body="全站用户：' + fmtNum(r.all_count) + ' 票 (' + r.all_pct.toFixed(2) + '%)|VIB 用户：' + fmtNum(r.vib_count) + ' 票 (' + r.vib_pct.toFixed(2) + '%)|占比差值：' + (r.diff_pct >= 0 ? '+' : '') + r.diff_pct.toFixed(2) + '%" style="cursor:pointer;" />';
      }

      if (!hidden.vib) {
        var vh = (vVal / maxVal) * plotH;
        var vy = padT + plotH - vh;
        var vx = hidden.all ? (cx - barW / 2) : (cx + 1.5);
        barsSvg +=
          '<rect x="' + vx.toFixed(1) + '" y="' + vy.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, vh).toFixed(1) + '" rx="3" fill="#38bdf8" ' +
            'data-tt-title="' + r.star + '★ · VIB 核心资深用户" ' +
            'data-tt-body="VIB 用户：' + fmtNum(r.vib_count) + ' 票 (' + r.vib_pct.toFixed(2) + '%)|全站用户：' + fmtNum(r.all_count) + ' 票 (' + r.all_pct.toFixed(2) + '%)" style="cursor:pointer;" />';
      }

      barsSvg += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="#64748b">' + r.star + '★</text>';
    });

    var legendHtml =
      '<span class="highcharts-legend-item' + (hidden.all ? ' is-hidden' : '') + '" data-act="toggle-legend" data-chart="vibCompare" data-series="all">' +
        '<span class="highcharts-legend-swatch" style="background:#f09199;"></span>' +
        '<span>全站用户 (' + bundle.meta.score.toFixed(2) + '★ / ' + fmtNum(bundle.meta.total_votes) + '票)</span>' +
      '</span>' +
      '<span class="highcharts-legend-item' + (hidden.vib ? ' is-hidden' : '') + '" data-act="toggle-legend" data-chart="vibCompare" data-series="vib">' +
        '<span class="highcharts-legend-swatch" style="background:#38bdf8;"></span>' +
        '<span>VIB 核心用户 (' + bundle.meta.vib_score.toFixed(2) + '★ / ' + fmtNum(bundle.meta.vib_votes) + '票)</span>' +
      '</span>';

    host.innerHTML =
      '<svg class="bst-svg-stage" viewBox="0 0 ' + W + ' ' + H + '" aria-label="全站用户与 VIB 用户评分分布对比">' +
        gridSvg + barsSvg +
      '</svg>' +
      '<div class="highcharts-legend">' + legendHtml + '</div>';
  }

  /* ==================== 5. 线上 r771 双栏六维 CHART_SETS 矩阵渲染 ==================== */
  function renderSingleMatrixChart(setKey, chartDef, bundle) {
    var rootId = chartDef.chart_root;
    var host = document.getElementById(rootId);
    if (!host) return;

    var hidden = state.hiddenLegends[setKey] || {};
    var seriesSet = chartDef.series_set || {};
    var seriesKeys = [];
    var idxCounter = 0;

    // 对于 interest_type 使用当前条目的动词标签
    var verbs = bundle.meta.verbs || {};
    var verbByCode = { '1': verbs.wish, '2': verbs.collect, '3': verbs.doing, '4': verbs.on_hold, '5': verbs.dropped };

    Object.keys(seriesSet).forEach(function (label) {
      var dataField = String(seriesSet[label]);
      var displayLabel = (setKey === 'interest_type' && verbByCode[dataField]) ? verbByCode[dataField] : label;
      seriesKeys.push({
        field: dataField,
        label: displayLabel,
        color: SERIES_PALETTE[idxCounter % SERIES_PALETTE.length]
      });
      idxCounter++;
    });

    var dataRows = chartDef.data || []; // 10★ down to 1★
    var isPercentMode = state.stackMode === 'percent' && seriesKeys.length > 1;

    var W = 540, H = 220, padL = 46, padR = 36, padT = 18, padB = 32;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxStack = 1;
    var totalActiveVotes = 0;
    var weightedSum = 0;

    dataRows.forEach(function (row) {
      var star = intOf(row.title);
      var rowSum = 0;
      seriesKeys.forEach(function (s) {
        if (!hidden[s.field]) {
          rowSum += intOf(row[s.field]);
        }
      });
      totalActiveVotes += rowSum;
      weightedSum += star * rowSum;
      if (rowSum > maxStack) maxStack = rowSum;
    });

    if (isPercentMode) maxStack = 100;

    var gridSvg = '';
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      var gv = (g / 4) * maxStack;
      var gText = isPercentMode ? gv.toFixed(0) + '%' : fmtCompact(Math.round(gv));
      gridSvg +=
        '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(148,163,184,0.16)" stroke-dasharray="3 3" />' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#64748b">' + gText + '</text>';
    }

    var colW = plotW / Math.max(1, dataRows.length);
    var barW = Math.min(26, colW * 0.58);
    var barsSvg = '';

    dataRows.forEach(function (row, rIdx) {
      var star = intOf(row.title);
      var cx = padL + (rIdx + 0.5) * colW;
      var x = cx - barW / 2;

      var rowTotal = 0;
      seriesKeys.forEach(function (s) {
        if (!hidden[s.field]) rowTotal += intOf(row[s.field]);
      });

      var yCursor = padT + plotH;
      var breakdownLines = [];
      seriesKeys.forEach(function (s) {
        if (hidden[s.field]) return;
        var rawV = intOf(row[s.field]);
        if (rawV > 0) {
          breakdownLines.push(s.label + '：' + fmtNum(rawV) + ' 票');
        }
      });

      seriesKeys.forEach(function (s) {
        if (hidden[s.field]) return;
        var rawVal = intOf(row[s.field]);
        if (rawVal <= 0) return;
        var val = isPercentMode ? (rowTotal > 0 ? (rawVal / rowTotal) * 100 : 0) : rawVal;
        var h = (val / Math.max(1, maxStack)) * plotH;
        yCursor -= h;
        barsSvg +=
          '<rect x="' + x.toFixed(1) + '" y="' + yCursor.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" fill="' + s.color + '" ' +
            'data-tt-title="' + escHtml(chartDef.title + ' · ' + star + '★ (合计 ' + fmtNum(rowTotal) + ' 票)') + '" ' +
            'data-tt-body="' + escHtml(breakdownLines.slice(0, 6).join('|')) + '" style="cursor:pointer;" />';
      });

      barsSvg += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="#64748b">' + star + '★</text>';
    });

    // 当开启均分折线且该图有多个分档 series 时，计算各分档的独立均分并在顶部叠加趋势点
    var scoreOverlaySvg = '';
    var seriesAvgSummary = [];
    seriesKeys.forEach(function (s, sIdx) {
      var sVotes = 0, sWeighted = 0;
      dataRows.forEach(function (row) {
        var c = intOf(row[s.field]);
        sVotes += c;
        sWeighted += intOf(row.title) * c;
      });
      var sAvg = sVotes > 0 ? (sWeighted / sVotes) : 0;
      seriesAvgSummary.push({ s: s, votes: sVotes, avg: sAvg });
    });

    if (state.showScoreLine && chartDef.enable_score && seriesAvgSummary.length > 1) {
      var validPts = [];
      seriesAvgSummary.forEach(function (item, idx) {
        if (hidden[item.s.field] || item.votes <= 0) return;
        var sx = padL + ((idx + 0.5) / seriesAvgSummary.length) * plotW;
        var sy = padT + plotH - ((item.avg - 5.0) / 5.0) * (plotH * 0.75) - plotH * 0.1;
        sy = Math.max(padT + 8, Math.min(padT + plotH - 8, sy));
        validPts.push({ x: sx, y: sy, item: item });
      });
      if (validPts.length > 1) {
        var linePath = validPts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
        scoreOverlaySvg += '<path d="' + linePath + '" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2" />';
        validPts.forEach(function (p) {
          scoreOverlaySvg +=
            '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.8" fill="#f59e0b" stroke="#fff" stroke-width="1.2" ' +
              'data-tt-title="分档均分：' + escHtml(p.item.s.label) + '" ' +
              'data-tt-body="该档均分：' + p.item.avg.toFixed(2) + ' ★|该档票数：' + fmtNum(p.item.votes) + ' 票" style="cursor:pointer;" />';
        });
      }
    }

    var legendHtml = seriesAvgSummary.map(function (item) {
      var isOff = !!hidden[item.s.field];
      var avgTag = item.votes > 0 ? ' · ' + item.avg.toFixed(2) + '★' : '';
      return '<span class="highcharts-legend-item' + (isOff ? ' is-hidden' : '') + '" ' +
        'data-act="toggle-legend" data-chart="' + escHtml(setKey) + '" data-series="' + escHtml(item.s.field) + '">' +
        '<span class="highcharts-legend-swatch" style="background:' + item.s.color + ';"></span>' +
        '<span>' + escHtml(item.s.label) + ' (' + fmtCompact(item.votes) + avgTag + ')</span>' +
      '</span>';
    }).join('');

    var effAvg = totalActiveVotes > 0 ? (weightedSum / totalActiveVotes).toFixed(2) : '0.00';
    var effStars = formatTenStars(effAvg);

    host.innerHTML =
      '<svg class="bst-svg-stage" viewBox="0 0 ' + W + ' ' + H + '" aria-label="' + escHtml(chartDef.title) + '">' +
        gridSvg + barsSvg + scoreOverlaySvg +
      '</svg>' +
      '<div class="highcharts-legend">' + legendHtml + '</div>' +
      '<div class="bst-chart-summary-foot">' +
        '<span>当前筛选有效样本：<strong>' + fmtNum(totalActiveVotes) + ' 票</strong></span>' +
        '<span>加权均分：<strong>' + effStars.glyph + ' ' + effAvg + '</strong></span>' +
      '</div>';
  }

  function renderMatrixCharts(bundle) {
    var cs = bundle.chart_sets || {};
    var order = ['interest_type', 'airdate', 'total_collects', 'vib', 'regdate', 'relative_regdate'];
    order.forEach(function (k) {
      if (cs[k]) {
        renderSingleMatrixChart(k, cs[k], bundle);
      }
    });
  }

  function fmtCompact(n) {
    var v = Number(n || 0);
    if (v >= 10000) return (v / 10000).toFixed(1) + 'w';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(v);
  }

  /* ==================== 6. 视图模式与顶栏状态同步 ==================== */
  function syncToolbarAndSections() {
    var viewBtns = document.querySelectorAll('#bstViewModeTabs [data-act="switch-view"]');
    Array.prototype.forEach.call(viewBtns, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-view') === state.viewMode);
    });

    var singleSec = document.getElementById('colunmSingle');
    var matrixSec = document.getElementById('bstMatrixSection');
    if (singleSec) {
      singleSec.style.display = (state.viewMode === 'matrix') ? 'none' : '';
    }
    if (matrixSec) {
      matrixSec.style.display = (state.viewMode === 'trends') ? 'none' : '';
    }

    var stackBtns = document.querySelectorAll('[data-act="switch-stack"]');
    Array.prototype.forEach.call(stackBtns, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-stack') === state.stackMode);
    });

    var scoreBtn = document.getElementById('bstToggleScoreLineBtn');
    if (scoreBtn) {
      scoreBtn.innerHTML = '<span>📉 均分折线: ' + (state.showScoreLine ? '开启' : '关闭') + '</span>';
    }

    var zoomBtns = document.querySelectorAll('[data-act="zoom-range"]');
    Array.prototype.forEach.call(zoomBtns, function (btn) {
      var target = btn.getAttribute('data-target');
      var rng = parseInt(btn.getAttribute('data-range'), 10);
      btn.classList.toggle('is-active', state.zoomRange[target] === rng);
    });

    var vibBtns = document.querySelectorAll('[data-act="vib-metric"]');
    Array.prototype.forEach.call(vibBtns, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-metric') === state.vibMetric);
    });
  }

  function renderAll() {
    var bundle = getSubjectData(state.subjectId);
    if (!bundle) return;
    renderBannerAndNav(bundle);
    renderKpiPanels(bundle);
    renderSimulator(bundle);
    syncToolbarAndSections();
    renderChartCollect(bundle);
    renderChartInterest(bundle);
    renderChartForce(bundle);
    renderChartVibCompare(bundle);
    renderMatrixCharts(bundle);
  }

  /* ==================== 7. 事件委托与浮动 Tooltip ==================== */
  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var presetBtn = ev.target.closest('#bannerCategoryBar [data-subject-id]');
      if (presetBtn) {
        var newId = presetBtn.getAttribute('data-subject-id');
        if (newId && window.SUBJECT_STATS_DATA && window.SUBJECT_STATS_DATA[newId]) {
          state.subjectId = newId;
          try {
            history.replaceState(null, '', 'subject-stats.html?id=' + encodeURIComponent(newId));
          } catch (e) {}
          renderAll();
          showToast('已切换至《' + (window.SUBJECT_STATS_DATA[newId].meta.name_cn || newId) + '》透视统计');
        }
        return;
      }

      var actEl = ev.target.closest('[data-act]');
      if (!actEl) return;
      var act = actEl.getAttribute('data-act');

      if (act === 'switch-view') {
        state.viewMode = actEl.getAttribute('data-view') || 'all';
        syncToolbarAndSections();
      } else if (act === 'switch-stack') {
        state.stackMode = actEl.getAttribute('data-stack') || 'count';
        syncToolbarAndSections();
        var b1 = getSubjectData(state.subjectId);
        if (b1) renderMatrixCharts(b1);
      } else if (act === 'toggle-score-line') {
        state.showScoreLine = !state.showScoreLine;
        syncToolbarAndSections();
        var b2 = getSubjectData(state.subjectId);
        if (b2) renderMatrixCharts(b2);
      } else if (act === 'sim-preset') {
        state.simPreset = actEl.getAttribute('data-preset') || 'all';
        var b3 = getSubjectData(state.subjectId);
        if (b3) renderSimulator(b3);
      } else if (act === 'reset-simulator') {
        state.simPreset = 'all';
        var b4 = getSubjectData(state.subjectId);
        if (b4) renderSimulator(b4);
        showToast('已恢复全站全量样本基准');
      } else if (act === 'zoom-range') {
        var target = actEl.getAttribute('data-target');
        var rng = parseInt(actEl.getAttribute('data-range'), 10) || 12;
        if (target && state.zoomRange[target] != null) {
          state.zoomRange[target] = rng;
          syncToolbarAndSections();
          var b5 = getSubjectData(state.subjectId);
          if (b5) {
            if (target === 'interest') renderChartInterest(b5);
            if (target === 'force') renderChartForce(b5);
          }
        }
      } else if (act === 'vib-metric') {
        state.vibMetric = actEl.getAttribute('data-metric') || 'pct';
        syncToolbarAndSections();
        var b6 = getSubjectData(state.subjectId);
        if (b6) renderChartVibCompare(b6);
      } else if (act === 'toggle-legend') {
        var chartKey = actEl.getAttribute('data-chart');
        var seriesKey = actEl.getAttribute('data-series');
        if (chartKey && seriesKey) {
          if (!state.hiddenLegends[chartKey]) state.hiddenLegends[chartKey] = {};
          state.hiddenLegends[chartKey][seriesKey] = !state.hiddenLegends[chartKey][seriesKey];
          var b7 = getSubjectData(state.subjectId);
          if (!b7) return;
          if (chartKey === 'collect') renderChartCollect(b7);
          else if (chartKey === 'interest') renderChartInterest(b7);
          else if (chartKey === 'force') renderChartForce(b7);
          else if (chartKey === 'vibCompare') renderChartVibCompare(b7);
          else if (b7.chart_sets && b7.chart_sets[chartKey]) {
            renderSingleMatrixChart(chartKey, b7.chart_sets[chartKey], b7);
          }
        }
      } else if (act === 'export-json') {
        var bundle = getSubjectData(state.subjectId);
        if (!bundle) return;
        var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'bangumi-subject-' + bundle.id + '-stats.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('已导出《' + (bundle.meta.name_cn || bundle.id) + '》透视统计 JSON');
      }
    });

    // SVG Tooltip 交互
    var tt = document.getElementById('bstChartTooltip');
    document.addEventListener('mouseover', function (ev) {
      if (!tt) return;
      var node = ev.target.closest('[data-tt-title]');
      if (!node) {
        tt.classList.remove('is-visible');
        return;
      }
      var title = node.getAttribute('data-tt-title') || '';
      var body = node.getAttribute('data-tt-body') || '';
      var rows = body.split('|').filter(Boolean).map(function (line) {
        var parts = line.split('：');
        if (parts.length >= 2) {
          return '<div class="bst-tt-row"><span class="bst-tt-key">' + escHtml(parts[0]) + '</span><span class="bst-tt-val">' + escHtml(parts.slice(1).join('：')) + '</span></div>';
        }
        return '<div class="bst-tt-row"><span class="bst-tt-val">' + escHtml(line) + '</span></div>';
      }).join('');
      tt.innerHTML = '<div class="bst-tt-title">' + escHtml(title) + '</div>' + rows;
      tt.classList.add('is-visible');
    });

    document.addEventListener('mousemove', function (ev) {
      if (!tt || !tt.classList.contains('is-visible')) return;
      var x = Math.min(window.innerWidth - 290, ev.clientX + 14);
      var y = Math.max(12, ev.clientY - 24);
      tt.style.left = x + 'px';
      tt.style.top = y + 'px';
    });

    // 亮暗色主题切换按钮 (#btnThemeToggle)
    var themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var root = document.documentElement;
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
      });
    }
  }

  // 全局方法暴露
  window.switchSubjectStats = function (sid) {
    if (sid && window.SUBJECT_STATS_DATA && window.SUBJECT_STATS_DATA[sid]) {
      state.subjectId = String(sid);
      renderAll();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      parseInitialUrl();
      bindEvents();
      renderAll();
    });
  } else {
    parseInitialUrl();
    bindEvents();
    renderAll();
  }
})();
