/**
 * Bangumi Redesign - Page 12: Subject Wiki Edit & Revision System (B9)
 * Covers:
 *   1. /subject/{id}/edit_detail           (form[name="edit_subject"], WikiToTable() <-> TableToWiki(), #tableEditor, textarea#subject_infobox)
 *   2. /subject/{id}/edit                  (ul.line_list > li, rev1/rev2 radio diff, snapshot preview & rollback)
 *   3. /subject/{id}/upload_img            (cover gallery, vote, set default cover, local file / URL upload)
 *   4. /subject/{id}/add_related/character (ul#crtRelateSubjects > li + right search #subjectName)
 *   5. /subject/{id}/add_related/person    (ul#crtRelateSubjects > li + right search #subjectName)
 *   6. /subject/{id}/add_related/subject/* (ul#crtRelateSubjects > li + right search #subjectName)
 */
(function () {
  'use strict';

  var DB = window.SUBJECT_WIKI_DATA || { defaultSubjectId: '400602', subjects: {} };
  var STORAGE_PREFIX = 'bgm_wiki_state_v1_';

  var state = {
    subjectId: '400602',
    activeTab: 'edit_detail',     // edit_detail | edit | upload_img | add_related_character | add_related_person | add_related_subject
    layoutMode: 'all',            // all (all panes visible) | single (only active pane visible)
    editorView: 'split',          // split | wcode | table
    relatedMode: 'character',     // character | person | subject
    relatedSearchQuery: '',
    lastDeletedRelated: null,     // { mode, item, index }
    rev1Id: '',
    rev2Id: ''
  };

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
    var item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = msg;
    box.appendChild(item);
    setTimeout(function () {
      item.style.opacity = '0';
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 260);
    }, 2800);
  }

  function formatNowTime() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getSubjectData(sid) {
    var raw = DB.subjects[sid] || DB.subjects[DB.defaultSubjectId] || Object.values(DB.subjects)[0];
    if (!raw) return null;
    try {
      var saved = localStorage.getItem(STORAGE_PREFIX + raw.id);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.id === raw.id) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore storage errors
    }
    return deepClone(raw);
  }

  function saveSubjectData(subj) {
    if (!subj || !subj.id) return;
    DB.subjects[subj.id] = deepClone(subj);
    try {
      localStorage.setItem(STORAGE_PREFIX + subj.id, JSON.stringify(subj));
    } catch (e) {
      // ignore storage quota errors
    }
  }

  /* ==========================================================================
     1. WCODE <-> #tableEditor 双向解析与序列化引擎
     ========================================================================== */
  function parseWcodeToRows(wcodeText, fallbackTemplate) {
    var lines = String(wcodeText || '').replace(/\r\n/g, '\n').split('\n');
    var template = fallbackTemplate || 'animanga/TVAnime';
    var rows = [];
    var currentGroup = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('{{Infobox') === 0) {
        var tpl = line.replace('{{Infobox', '').trim();
        if (tpl) template = tpl;
        continue;
      }
      if (line === '}}') {
        if (currentGroup) {
          rows.push(currentGroup);
          currentGroup = null;
        }
        continue;
      }
      if (currentGroup) {
        if (line === '}') {
          rows.push(currentGroup);
          currentGroup = null;
        } else if (line.charAt(0) === '[' && line.charAt(line.length - 1) === ']') {
          var inner = line.slice(1, -1);
          var barIdx = inner.indexOf('|');
          if (barIdx >= 0) {
            currentGroup.subRows.push({
              subKey: inner.slice(0, barIdx).trim(),
              val: inner.slice(barIdx + 1).trim()
            });
          } else {
            currentGroup.subRows.push({
              subKey: '',
              val: inner.trim()
            });
          }
        }
        continue;
      }
      if (line.charAt(0) === '|') {
        var eqIdx = line.indexOf('=');
        if (eqIdx > 1) {
          var k = line.slice(1, eqIdx).trim();
          var v = line.slice(eqIdx + 1).trim();
          if (v === '{') {
            currentGroup = { key: k, isGroup: true, subRows: [] };
          } else {
            rows.push({ key: k, val: v });
          }
        }
      }
    }
    if (currentGroup) rows.push(currentGroup);
    return { template: template, rows: rows };
  }

  function serializeRowsToWcode(templateName, rows) {
    var tpl = templateName || 'animanga/TVAnime';
    var out = ['{{Infobox ' + tpl];
    (rows || []).forEach(function (r) {
      var k = String(r.key || '').trim();
      if (!k) return;
      if (r.isGroup && Array.isArray(r.subRows)) {
        out.push('|' + k + '={');
        r.subRows.forEach(function (sr) {
          var sk = String(sr.subKey || '').trim();
          var sv = String(sr.val || '').trim();
          if (!sk && !sv) return;
          if (sk) {
            out.push('[' + sk + '|' + sv + ']');
          } else {
            out.push('[' + sv + ']');
          }
        });
        out.push('}');
      } else {
        out.push('|' + k + '= ' + String(r.val || '').trim());
      }
    });
    out.push('}}');
    return out.join('\n');
  }

  function collectRowsFromTableDom() {
    var container = document.getElementById('bwkTableRowsContainer');
    if (!container) return [];
    var rowEls = container.querySelectorAll('.bwk-tbl-row');
    var rows = [];
    rowEls.forEach(function (rowEl) {
      var keyInput = rowEl.querySelector('.bwk-tbl-key');
      var k = keyInput ? keyInput.value.trim() : '';
      if (!k) return;
      if (rowEl.classList.contains('is-group-row')) {
        var subItems = [];
        rowEl.querySelectorAll('.bwk-tbl-subrow-item').forEach(function (subEl) {
          var skEl = subEl.querySelector('.bwk-tbl-subkey');
          var svEl = subEl.querySelector('.bwk-tbl-subval');
          var sk = skEl ? skEl.value.trim() : '';
          var sv = svEl ? svEl.value.trim() : '';
          if (sk || sv) {
            subItems.push({ subKey: sk, val: sv });
          }
        });
        rows.push({ key: k, isGroup: true, subRows: subItems });
      } else {
        var valInput = rowEl.querySelector('.bwk-tbl-val');
        rows.push({ key: k, val: valInput ? valInput.value.trim() : '' });
      }
    });
    return rows;
  }

  function renderTableEditorRows(rows) {
    var container = document.getElementById('bwkTableRowsContainer');
    if (!container) return;
    var html = (rows || []).map(function (r, idx) {
      if (r.isGroup) {
        var subHtml = (r.subRows || []).map(function (sr, sIdx) {
          return [
            '<div class="bwk-tbl-subrow-item" data-sub-idx="' + sIdx + '">',
            '  <input type="text" class="inputtext bwk-tbl-subkey" placeholder="子项名(可空)" value="' + esc(sr.subKey || '') + '" />',
            '  <input type="text" class="inputtext bwk-tbl-subval" placeholder="子项值" value="' + esc(sr.val || '') + '" />',
            '  <button type="button" class="bwk-row-icon-btn is-danger" data-act="del-subrow" title="移除子项">×</button>',
            '</div>'
          ].join('');
        }).join('');
        return [
          '<div class="bwk-tbl-row is-group-row" data-row-index="' + idx + '">',
          '  <span class="bwk-row-idx">' + (idx + 1) + '</span>',
          '  <div>',
          '    <input type="text" class="inputtext bwk-tbl-key" value="' + esc(r.key) + '" placeholder="分组属性名" />',
          '    <div style="margin-top:6px;"><button type="button" class="btnGray" data-act="add-subrow" style="padding:3px 8px;font-size:11px;">+ 添加子项</button></div>',
          '  </div>',
          '  <div class="bwk-tbl-subrows">' + subHtml + '</div>',
          '  <div class="bwk-tbl-row-actions">',
          '    <button type="button" class="bwk-row-icon-btn" data-act="move-row-up" title="上移">↑</button>',
          '    <button type="button" class="bwk-row-icon-btn" data-act="move-row-down" title="下移">↓</button>',
          '    <button type="button" class="bwk-row-icon-btn is-danger" data-act="del-row" title="删除整组">✕</button>',
          '  </div>',
          '</div>'
        ].join('');
      }
      return [
        '<div class="bwk-tbl-row" data-row-index="' + idx + '">',
        '  <span class="bwk-row-idx">' + (idx + 1) + '</span>',
        '  <input type="text" class="inputtext bwk-tbl-key" value="' + esc(r.key) + '" placeholder="属性名" />',
        '  <input type="text" class="inputtext bwk-tbl-val" value="' + esc(r.val || '') + '" placeholder="属性值" />',
        '  <div class="bwk-tbl-row-actions">',
        '    <button type="button" class="bwk-row-icon-btn" data-act="move-row-up" title="上移">↑</button>',
        '    <button type="button" class="bwk-row-icon-btn" data-act="move-row-down" title="下移">↓</button>',
        '    <button type="button" class="bwk-row-icon-btn is-danger" data-act="del-row" title="删除行">✕</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
    container.innerHTML = html;

    var countEl = document.getElementById('bwkTableRowCountText');
    if (countEl) countEl.textContent = '共 ' + (rows ? rows.length : 0) + ' 项属性字段';
  }

  function renderLiveInfoboxPreview(rows) {
    var previewEl = document.getElementById('wikiLiveInfoboxPreview');
    if (!previewEl) return;
    var itemsHtml = (rows || []).map(function (r) {
      if (r.isGroup && Array.isArray(r.subRows)) {
        var subText = r.subRows.map(function (sr) {
          return (sr.subKey ? (esc(sr.subKey) + ': ') : '') + esc(sr.val);
        }).join(' / ');
        return '<li><span class="tip">' + esc(r.key) + ':</span>' + subText + '</li>';
      }
      return '<li><span class="tip">' + esc(r.key) + ':</span>' + esc(r.val || '') + '</li>';
    }).join('');
    previewEl.innerHTML = itemsHtml || '<li><span class="tip">提示:</span>暂无属性字段</li>';
  }

  function updateWcodeMetaCounter(wcodeText, tplName) {
    var lineCount = String(wcodeText || '').split('\n').length;
    var el = document.getElementById('bwkWcodeLineCounter');
    if (el) el.textContent = lineCount + ' 行 · Infobox ' + (tplName || 'animanga/TVAnime');
  }

  function applyEditorViewVisibility() {
    var wb = document.getElementById('bwkInfoboxWorkbench');
    var wPanel = document.getElementById('bwkWcodePanel');
    var tPanel = document.getElementById('bwkTablePanel');
    var btnW2T = document.getElementById('btnWikiToTable');
    var btnT2W = document.getElementById('btnTableToWiki');
    var statusText = document.getElementById('bwkEditorModeStatusText');
    var splitBtn = document.getElementById('btnToggleSplitEditor');

    if (!wb || !wPanel || !tPanel) return;

    if (state.editorView === 'split') {
      wb.classList.add('is-split-view');
      wPanel.classList.remove('is-collapsed');
      tPanel.classList.remove('is-collapsed');
      if (statusText) statusText.textContent = '当前模式：双栏同屏实时对照 (WCODE ⇄ 表格)';
      if (splitBtn) splitBtn.classList.add('is-active-mode');
    } else if (state.editorView === 'table') {
      wb.classList.remove('is-split-view');
      wPanel.classList.add('is-collapsed');
      tPanel.classList.remove('is-collapsed');
      if (btnW2T) btnW2T.classList.add('is-active-mode');
      if (btnT2W) btnT2W.classList.remove('is-active-mode');
      if (statusText) statusText.textContent = '当前模式：可视化属性表格模式 (#tableEditor)';
      if (splitBtn) splitBtn.classList.remove('is-active-mode');
    } else {
      wb.classList.remove('is-split-view');
      wPanel.classList.remove('is-collapsed');
      tPanel.classList.add('is-collapsed');
      if (btnW2T) btnW2T.classList.remove('is-active-mode');
      if (btnT2W) btnT2W.classList.add('is-active-mode');
      if (statusText) statusText.textContent = '当前模式：WCODE 源码编辑模式 (textarea#subject_infobox)';
      if (splitBtn) splitBtn.classList.remove('is-active-mode');
    }
  }

  // Global functions required by Spec Page 12 onclick attributes
  window.WikiToTable = function () {
    var subj = getSubjectData(state.subjectId);
    var wcodeEl = document.getElementById('subject_infobox');
    if (!wcodeEl) return;
    var parsed = parseWcodeToRows(wcodeEl.value, subj ? subj.infoboxTemplate : 'animanga/TVAnime');
    renderTableEditorRows(parsed.rows);
    renderLiveInfoboxPreview(parsed.rows);
    updateWcodeMetaCounter(wcodeEl.value, parsed.template);
    if (state.editorView !== 'split') {
      state.editorView = 'table';
      applyEditorViewVisibility();
    }
    showToast('已将 WCODE 源码解析转换至 #tableEditor 表格模式！');
  };

  window.TableToWiki = function () {
    var subj = getSubjectData(state.subjectId);
    var wcodeEl = document.getElementById('subject_infobox');
    if (!wcodeEl) return;
    var currentParsed = parseWcodeToRows(wcodeEl.value, subj ? subj.infoboxTemplate : 'animanga/TVAnime');
    var rows = collectRowsFromTableDom();
    var newWcode = serializeRowsToWcode(currentParsed.template, rows);
    wcodeEl.value = newWcode;
    renderLiveInfoboxPreview(rows);
    updateWcodeMetaCounter(newWcode, currentParsed.template);
    if (state.editorView !== 'split') {
      state.editorView = 'wcode';
      applyEditorViewVisibility();
    }
    showToast('已将属性表格同步生成标准 Bangumi WCODE 源码！');
  };

  /* ==========================================================================
     2. 修订历史列表 (ul.line_list) 与双版本 Diff 对比器
     ========================================================================== */
  function renderRevisionsList(subj) {
    var listEl = document.getElementById('wikiRevisionList');
    if (!listEl || !subj) return;
    var revs = subj.revisions || [];
    if (!revs.length) return;

    var rev2Exists = revs.some(function (r) { return r.revId === state.rev2Id; });
    var rev1Exists = revs.some(function (r) { return r.revId === state.rev1Id; });
    if (!rev2Exists) state.rev2Id = revs[0].revId;
    if (!rev1Exists) state.rev1Id = (revs[1] || revs[0]).revId;

    var countBadge = document.getElementById('subTabCountRevs');
    if (countBadge) countBadge.textContent = String(revs.length);

    listEl.innerHTML = revs.map(function (r) {
      var isR1 = r.revId === state.rev1Id;
      var isR2 = r.revId === state.rev2Id;
      var selectedCls = (isR1 || isR2) ? ' is-selected-rev' : '';
      return [
        '<li class="' + selectedCls.trim() + '" data-rev-id="' + esc(r.revId) + '">',
        '  <div class="bwk-rev-radios">',
        '    <input type="radio" name="rev1" value="' + esc(r.revId) + '"' + (isR1 ? ' checked' : '') + ' title="选为基准旧版本 (rev1)" />',
        '    <input type="radio" name="rev2" value="' + esc(r.revId) + '"' + (isR2 ? ' checked' : '') + ' title="选为对比新版本 (rev2)" />',
        '  </div>',
        '  <div class="bwk-rev-time-col">',
        '    <span class="bwk-rev-ver-tag">' + esc(r.revNum) + '</span>',
        '    <a href="#wikiDiffViewer" class="l bwk-rev-time-link" data-act="view-rev-snapshot" data-rev-id="' + esc(r.revId) + '">' + esc(r.time) + '</a>',
        '  </div>',
        '  <div class="bwk-rev-main-col">',
        '    <div class="bwk-rev-editor-line">',
        '      <img src="' + esc(r.avatar) + '" alt="' + esc(r.editor) + '" class="bwk-rev-avatar" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
        '      <a href="user.html?uid=' + esc(r.uid) + '" class="l">' + esc(r.editor) + '</a>',
        '      <span class="bwk-rev-editor-badge">' + esc(r.badge || '维基人') + '</span>',
        '      <span class="bwk-rev-diff-pill">' + esc(r.diffTag || '修订') + '</span>',
        '    </div>',
        '    <div class="bwk-rev-summary">' + esc(r.summary) + '</div>',
        '  </div>',
        '  <div class="bwk-rev-actions">',
        '    <button type="button" class="btnGray" data-act="view-rev-snapshot" data-rev-id="' + esc(r.revId) + '">查看快照</button>',
        '    <button type="button" class="btnGray" data-act="rollback-rev" data-rev-id="' + esc(r.revId) + '">回滚至此版</button>',
        '  </div>',
        '</li>'
      ].join('\n');
    }).join('\n');

    renderDiffComparison(subj);
  }

  function computeLineDiff(oldText, newText) {
    var oldLines = String(oldText || '').split('\n');
    var newLines = String(newText || '').split('\n');
    var oldSet = {};
    var newSet = {};
    oldLines.forEach(function (l) { oldSet[l] = (oldSet[l] || 0) + 1; });
    newLines.forEach(function (l) { newSet[l] = (newSet[l] || 0) + 1; });

    var result = [];
    var added = 0;
    var removed = 0;

    oldLines.forEach(function (l) {
      if (!newSet[l]) {
        result.push({ type: 'removed', sign: '-', text: l });
        removed++;
      }
    });

    newLines.forEach(function (l) {
      if (!oldSet[l]) {
        result.push({ type: 'added', sign: '+', text: l });
        added++;
      } else {
        result.push({ type: 'same', sign: ' ', text: l });
      }
    });

    return { lines: result, added: added, removed: removed };
  }

  function renderDiffComparison(subj) {
    if (!subj) return;
    var revs = subj.revisions || [];
    var r1 = revs.find(function (r) { return r.revId === state.rev1Id; }) || revs[1] || revs[0];
    var r2 = revs.find(function (r) { return r.revId === state.rev2Id; }) || revs[0];
    if (!r1 || !r2) return;

    var hintEl = document.getElementById('bwkDiffSelectionHint');
    if (hintEl) {
      hintEl.textContent = '当前对比：' + r1.revNum + ' (' + r1.time + ') ➔ ' + r2.revNum + ' (' + r2.time + ')';
    }
    var titleEl = document.getElementById('bwkDiffHeaderTitle');
    if (titleEl) {
      titleEl.innerHTML = '🔍 版本差异对比 (Diff): <strong>' + esc(r1.revNum) + '</strong> vs <strong>' + esc(r2.revNum) + '</strong> · 编辑者: ' + esc(r2.editor);
    }

    var s1 = r1.snapshot || {};
    var s2 = r2.snapshot || {};
    var diffWcode = computeLineDiff(s1.wcode || '', s2.wcode || '');
    var diffSum = computeLineDiff(s1.summary || '', s2.summary || '');

    var totalAdd = diffWcode.added + diffSum.added;
    var totalRem = diffWcode.removed + diffSum.removed;
    var statsBadge = document.getElementById('bwkDiffStatsBadge');
    if (statsBadge) {
      statsBadge.textContent = '+' + totalAdd + ' 新增 / -' + totalRem + ' 移除';
    }

    var htmlLines = [];
    htmlLines.push('<div class="bwk-diff-line is-meta"><span class="bwk-diff-sign">@</span><span>@@ 基础元数据 &amp; 平台分类 @@</span></div>');
    if (s1.title !== s2.title) {
      htmlLines.push('<div class="bwk-diff-line is-removed"><span class="bwk-diff-sign">-</span><span>条目原名: ' + esc(s1.title) + '</span></div>');
      htmlLines.push('<div class="bwk-diff-line is-added"><span class="bwk-diff-sign">+</span><span>条目原名: ' + esc(s2.title) + '</span></div>');
    } else {
      htmlLines.push('<div class="bwk-diff-line"><span class="bwk-diff-sign"> </span><span>条目原名: ' + esc(s2.title) + ' · 平台: ' + esc(s2.platform) + ' · 首播/发售日: ' + esc(s2.airdate) + '</span></div>');
    }

    htmlLines.push('<div class="bwk-diff-line is-meta"><span class="bwk-diff-sign">@</span><span>@@ Infobox WCODE 属性框对比 @@</span></div>');
    diffWcode.lines.forEach(function (dl) {
      var cls = dl.type === 'added' ? ' is-added' : (dl.type === 'removed' ? ' is-removed' : '');
      htmlLines.push('<div class="bwk-diff-line' + cls + '"><span class="bwk-diff-sign">' + dl.sign + '</span><span>' + esc(dl.text) + '</span></div>');
    });

    htmlLines.push('<div class="bwk-diff-line is-meta"><span class="bwk-diff-sign">@</span><span>@@ 作品简介 (Summary) 对比 @@</span></div>');
    diffSum.lines.forEach(function (dl) {
      var cls = dl.type === 'added' ? ' is-added' : (dl.type === 'removed' ? ' is-removed' : '');
      htmlLines.push('<div class="bwk-diff-line' + cls + '"><span class="bwk-diff-sign">' + dl.sign + '</span><span>' + esc(dl.text) + '</span></div>');
    });

    var bodyEl = document.getElementById('bwkDiffBody');
    if (bodyEl) bodyEl.innerHTML = htmlLines.join('\n');
  }

  /* ==========================================================================
     3. 增改封面页 (/subject/{id}/upload_img)
     ========================================================================== */
  function renderCoverSection(subj) {
    if (!subj) return;
    var covers = subj.covers || [];
    var current = covers.find(function (c) { return c.isCurrent; }) || covers[0];

    var countBadge = document.getElementById('subTabCountCovers');
    if (countBadge) countBadge.textContent = String(covers.length);
    var hintEl = document.getElementById('bwkCoverCountHint');
    if (hintEl) hintEl.textContent = '共 ' + covers.length + ' 张封面存档';

    if (current) {
      var curImg = document.getElementById('bwkCurrentCoverImg');
      var curLabel = document.getElementById('bwkCurrentCoverLabel');
      var curMeta = document.getElementById('bwkCurrentCoverMeta');
      if (curImg) curImg.src = current.url;
      if (curLabel) curLabel.textContent = current.label;
      if (curMeta) curMeta.textContent = current.resolution + ' · ' + current.size + ' · ' + current.votes + ' 票';
    }

    var galleryEl = document.getElementById('wikiCoverGallery');
    if (!galleryEl) return;
    galleryEl.innerHTML = covers.map(function (c) {
      return [
        '<div class="bwk-cover-item-card' + (c.isCurrent ? ' is-current' : '') + '" data-cover-id="' + esc(c.id) + '">',
        '  <img src="' + esc(c.url) + '" alt="' + esc(c.label) + '" referrerpolicy="no-referrer" />',
        '  <div style="font-size:12.5px;font-weight:700;line-height:1.35;">' + esc(c.label) + '</div>',
        '  <div class="bwk-field-hint">' + esc(c.resolution) + ' · 上传者: ' + esc(c.uploader) + '</div>',
        '  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:auto;">',
        '    <button type="button" class="btnGray" data-act="vote-cover" data-id="' + esc(c.id) + '" style="padding:4px 8px;font-size:11.5px;">👍 ' + (c.votes || 0) + ' 票</button>',
        (c.isCurrent
          ? '<span class="bwk-rev-diff-pill" style="padding:4px 8px;">✓ 当前封面</span>'
          : '<button type="button" class="btnGray" data-act="set-default-cover" data-id="' + esc(c.id) + '" style="padding:4px 9px;font-size:11.5px;">设为默认</button>'),
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  /* ==========================================================================
     4. 关联角色 / 人物 / 条目工作台 (/add_related/*)
     ========================================================================== */
  function renderRelatedSection(subj) {
    if (!subj || !subj.related) return;
    var mode = state.relatedMode || 'character';
    var list = subj.related[mode] || [];
    var cfg = (DB.relationConfigs && DB.relationConfigs[mode]) || { roles: ['主角', '配角', '客串'] };

    // Update counts
    var cChar = (subj.related.character || []).length;
    var cPrsn = (subj.related.person || []).length;
    var cSubj = (subj.related.subject || []).length;
    var setTxt = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setTxt('subTabCountChars', cChar);
    setTxt('subTabCountPersons', cPrsn);
    setTxt('subTabCountSubjects', cSubj);
    setTxt('relModeCountChar', cChar);
    setTxt('relModeCountPerson', cPrsn);
    setTxt('relModeCountSubject', cSubj);

    var slug = subj.subjectTypeSlug || 'anime';
    setTxt('relModeSubjectPathText', '/add_related/subject/' + slug);

    var routeMap = {
      character: '/subject/' + subj.id + '/add_related/character',
      person: '/subject/' + subj.id + '/add_related/person',
      subject: '/subject/' + subj.id + '/add_related/subject/' + slug
    };
    setTxt('bwkRelatedRouteCode', routeMap[mode]);

    var titleMap = {
      character: '🔍 检索并添加关联角色 (/add_related/character)',
      person: '🔍 检索并添加制作人员 (/add_related/person)',
      subject: '🔍 检索并添加关联条目 (/add_related/subject/' + slug + ')'
    };
    setTxt('bwkSearchPanelTitle', titleMap[mode]);

    document.querySelectorAll('.bwk-rel-type-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-rel-mode') === mode);
    });

    var ulEl = document.getElementById('crtRelateSubjects');
    if (ulEl) {
      ulEl.innerHTML = list.map(function (item, idx) {
        var thumb = item.avatar || item.cover || subj.cover;
        var currentRole = item.role || item.job || item.relation || cfg.roles[0];
        var roleOptions = cfg.roles.slice();
        if (roleOptions.indexOf(currentRole) === -1) roleOptions.unshift(currentRole);

        var optionsHtml = roleOptions.map(function (rOpt) {
          var sel = rOpt === currentRole ? ' selected' : '';
          return '<option value="' + esc(rOpt) + '"' + sel + '>' + esc(rOpt) + '</option>';
        }).join('');

        var linkHref = mode === 'character'
          ? ('subject-characters.html?id=' + subj.id)
          : (mode === 'person' ? ('subject-persons.html?id=' + subj.id) : ('subject.html?id=' + item.id));

        var subMeta = mode === 'character'
          ? ('CV: ' + (item.cv || '未录入') + ' · #' + item.id)
          : (mode === 'person'
            ? ('职能部门: ' + (item.dept || '主创') + ' · #' + item.id)
            : ((item.typeLabel || '条目') + ' · ★ ' + (item.score || '8.5') + ' · #' + item.id));

        var epsOrRemark = item.eps != null ? item.eps : (item.remark || '');
        var sortVal = item.sortOrder != null ? item.sortOrder : (idx + 1);

        return [
          '<li data-rel-id="' + esc(item.id) + '" data-rel-idx="' + idx + '">',
          '  <img src="' + esc(thumb) + '" alt="' + esc(item.nameCn || item.name) + '" class="bwk-rel-thumb" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
          '  <div class="bwk-rel-title-col">',
          '    <a href="' + esc(linkHref) + '" class="title">' + esc(item.nameCn || item.name) + ' (' + esc(item.name) + ')</a>',
          '    <span class="bwk-rel-submeta">' + esc(subMeta) + '</span>',
          '  </div>',
          '  <input type="number" class="inputtext bwk-rel-sort-input" value="' + esc(sortVal) + '" title="排序序号" />',
          '  <select class="bwk-rel-role-select" title="职位/参与关系">' + optionsHtml + '</select>',
          '  <input type="text" class="inputtext bwk-rel-eps-input" value="' + esc(epsOrRemark) + '" placeholder="参与集数 / 备注" />',
          '  <a href="javascript:void(0);" class="del" data-act="del-related" data-id="' + esc(item.id) + '" title="移除此关联">×</a>',
          '</li>'
        ].join('\n');
      }).join('\n');
    }

    var undoBtn = document.getElementById('btnUndoDeleteRelated');
    if (undoBtn) {
      undoBtn.hidden = !(state.lastDeletedRelated && state.lastDeletedRelated.mode === mode);
    }

    renderRelatedCandidates(subj);
  }

  function renderRelatedCandidates(subj) {
    var box = document.getElementById('wikiRelatedSearchResults');
    if (!box || !subj) return;
    var mode = state.relatedMode || 'character';
    var pool = (DB.candidatePools && DB.candidatePools[mode]) || [];
    var existingIds = {};
    ((subj.related && subj.related[mode]) || []).forEach(function (it) {
      existingIds[String(it.id)] = true;
    });

    var q = (state.relatedSearchQuery || '').trim().toLowerCase();
    var filtered = pool.filter(function (c) {
      if (!q) return true;
      var hay = ((c.name || '') + ' ' + (c.nameCn || '') + ' ' + (c.cv || '') + ' ' + (c.job || '') + ' ' + (c.id || '')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    if (!filtered.length && q) {
      // Allow creating a custom candidate on the fly if user searched a custom name
      filtered = [{
        id: 'custom_' + Date.now().toString().slice(-4),
        name: state.relatedSearchQuery.trim(),
        nameCn: state.relatedSearchQuery.trim(),
        role: '配角',
        job: '原画',
        relation: '其他',
        cv: '待补充',
        typeLabel: '新增维基关联项',
        avatar: subj.cover,
        cover: subj.cover,
        eps: '全话'
      }];
    }

    box.innerHTML = filtered.slice(0, 14).map(function (c) {
      var isAdded = !!existingIds[String(c.id)];
      var thumb = c.avatar || c.cover || subj.cover;
      var desc = mode === 'character'
        ? ((c.role || '角色') + ' · CV: ' + (c.cv || '未录入'))
        : (mode === 'person'
          ? ('常用职能: ' + (c.job || '制作人员'))
          : ((c.typeLabel || '条目') + ' · 关系: ' + (c.relation || '关联')));

      return [
        '<div class="bwk-candidate-item">',
        '  <div class="bwk-candidate-info">',
        '    <img src="' + esc(thumb) + '" alt="' + esc(c.nameCn || c.name) + '" referrerpolicy="no-referrer" onerror="this.src=\'https://lain.bgm.tv/pic/user/l/icon.jpg\'" />',
        '    <div style="min-width:0;">',
        '      <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.nameCn || c.name) + ' <span style="font-weight:400;opacity:0.75;">(' + esc(c.name) + ')</span></div>',
        '      <div class="bwk-field-hint">' + esc(desc) + ' · #' + esc(c.id) + '</div>',
        '    </div>',
        '  </div>',
        (isAdded
          ? '<span class="bwk-field-hint" style="flex-shrink:0;">已关联</span>'
          : '<button type="button" class="bwk-candidate-add-btn" data-act="add-candidate" data-id="' + esc(c.id) + '" data-name="' + esc(c.name) + '" data-namecn="' + esc(c.nameCn || c.name) + '" title="点击 + 号加入左侧关联列表">+</button>'),
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  /* ==========================================================================
     5. 顶栏、二级导航 Tab 与全页面渲染主入口
     ========================================================================== */
  function renderPlatformRadios(subj) {
    var wrap = document.getElementById('wikiPlatformRadios');
    if (!wrap || !subj) return;
    var cat = subj.cat || 'anime';
    var opts = (DB.platformConfigs && DB.platformConfigs[cat]) || DB.platformConfigs.anime;
    var catNames = { anime: '动画 (Anime)', book: '书籍 (Book)', music: '音乐 (Music)', game: '游戏 (Game)', real: '三次元 (Real)' };
    var hintEl = document.getElementById('bwkPlatformCatHint');
    if (hintEl) hintEl.textContent = '当前所属频道：' + (catNames[cat] || cat);

    wrap.innerHTML = opts.map(function (opt) {
      var chk = opt.value === subj.platform ? ' checked' : '';
      return '<label class="bwk-platform-radio-label"><input type="radio" name="platform" value="' + esc(opt.value) + '"' + chk + ' /> ' + esc(opt.label) + '</label>';
    }).join('');
  }

  function updateSubTabsAndPanes(subj) {
    if (!subj) return;
    var sid = subj.id;
    var slug = subj.subjectTypeSlug || 'anime';

    var routeByTab = {
      edit_detail: '/subject/' + sid + '/edit_detail',
      edit: '/subject/' + sid + '/edit',
      upload_img: '/subject/' + sid + '/upload_img',
      add_related_character: '/subject/' + sid + '/add_related/character',
      add_related_person: '/subject/' + sid + '/add_related/person',
      add_related_subject: '/subject/' + sid + '/add_related/subject/' + slug
    };

    var navEl = document.getElementById('wikiNavSubTabs');
    if (navEl) {
      navEl.querySelectorAll('a[data-wiki-tab]').forEach(function (a) {
        var t = a.getAttribute('data-wiki-tab');
        if (routeByTab[t]) a.setAttribute('href', routeByTab[t]);
        var isFocus = t === state.activeTab;
        a.classList.toggle('focus', isFocus);
        a.classList.toggle('active', isFocus);
      });
    }

    var curRouteBadge = document.getElementById('bwkCurrentRouteBadge');
    if (curRouteBadge) {
      curRouteBadge.textContent = routeByTab[state.activeTab] || routeByTab.edit_detail;
    }

    var paneForTab = state.activeTab.indexOf('add_related_') === 0 ? 'add_related' : state.activeTab;
    document.querySelectorAll('.bwk-pane-card[data-pane]').forEach(function (sec) {
      if (state.layoutMode === 'all') {
        sec.classList.remove('is-hidden-pane');
      } else {
        sec.classList.toggle('is-hidden-pane', sec.getAttribute('data-pane') !== paneForTab);
      }
    });

    var btnAll = document.getElementById('btnLayoutAllInOne');
    var btnSingle = document.getElementById('btnLayoutSingleTab');
    if (btnAll) btnAll.classList.toggle('is-active', state.layoutMode === 'all');
    if (btnSingle) btnSingle.classList.toggle('is-active', state.layoutMode === 'single');
  }

  function renderSubjectWikiPage(sid) {
    var subj = getSubjectData(sid);
    if (!subj) return;
    state.subjectId = subj.id;

    // 1. Update page title & header banner
    document.title = (subj.name_cn || subj.name) + ' 的维基编辑与修订 · Bangumi 番组计划';
    var setTxt = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setTxt('subjectTitleJp', subj.name);
    setTxt('subjectTitleCn', subj.name_cn || subj.name);
    setTxt('subjectTypeBadge', subj.typeLabel || 'TV 动画');
    setTxt('subjectRankBadge', 'Rank #' + (subj.rank || 1));

    var backdrop = document.getElementById('subjectBackdrop');
    if (backdrop) backdrop.style.backgroundImage = "url('" + subj.cover + "')";

    document.querySelectorAll('#bannerCategoryBar .preset-pill-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-subject-id') === subj.id);
    });

    // Update top subjectNavTabs links
    var navTabs = document.getElementById('subjectNavTabs');
    if (navTabs) {
      navTabs.innerHTML = [
        '<li class="subject-nav-tab-item"><a href="subject.html?id=' + subj.id + '" data-tab="overview">概览</a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-ep.html?id=' + subj.id + '" data-tab="episodes">章节 <span class="tab-count">' + (subj.eps || 12) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-characters.html?id=' + subj.id + '" data-tab="characters">角色 <span class="tab-count">' + (subj.totalCharacters || 10) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-persons.html?id=' + subj.id + '" data-tab="persons">制作人员 <span class="tab-count">' + (subj.totalPersons || 12) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-comments.html?id=' + subj.id + '" data-tab="comments">吐槽箱 <span class="tab-count">' + (subj.totalComments || 38) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-reviews.html?id=' + subj.id + '&amp;tab=reviews" data-tab="reviews">评论 <span class="tab-count">' + (subj.totalReviews || 15) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-reviews.html?id=' + subj.id + '&amp;tab=board" data-tab="board">讨论版 <span class="tab-count">' + (subj.totalTopics || 20) + '</span></a></li>',
        '<li class="subject-nav-tab-item"><a href="subject-stats.html?id=' + subj.id + '" data-tab="stats">透视 <span class="tab-count">Stats</span></a></li>',
        '<li class="subject-nav-tab-item active"><a href="subject-wiki.html?id=' + subj.id + '" class="focus" data-tab="wiki">维基修订 <span class="tab-count">Wiki</span></a></li>'
      ].join('\n');
    }

    var wikiActionBtn = document.getElementById('headerWikiActionBtn');
    if (wikiActionBtn) wikiActionBtn.setAttribute('href', 'subject-wiki.html?id=' + subj.id);

    var backLink = document.getElementById('bwkBackToSubjectLink');
    if (backLink) backLink.setAttribute('href', 'subject.html?id=' + subj.id);

    var quickNav = document.getElementById('bwkQuickFamilyNav');
    if (quickNav) {
      quickNav.innerHTML = [
        '<a href="subject.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">🎬 条目概览</a>',
        '<a href="subject-ep.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">📺 章节列表</a>',
        '<a href="subject-characters.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">🎭 角色列表</a>',
        '<a href="subject-persons.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">🎬 制作人员</a>',
        '<a href="subject-comments.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">💬 吐槽箱</a>',
        '<a href="subject-reviews.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;">📝 评论讨论</a>',
        '<a href="subject-stats.html?id=' + subj.id + '" class="btnGray" style="text-decoration:none;justify-content:flex-start;grid-column:span 2;">📊 条目透视统计 (/stats)</a>'
      ].join('\n');
    }

    // 2. Wiki top stats
    var ws = subj.wikiStats || {};
    setTxt('bwkLockLevelText', ws.lockLevel || '全站维基人可编辑 (Wiki Level ≥ 1)');
    setTxt('bwkStatTotalRevs', (subj.revisions || []).length + 22);
    setTxt('bwkStatContributors', ws.contributorsCount || 14);
    setTxt('bwkStatLastTime', (subj.revisions && subj.revisions[0]) ? subj.revisions[0].time : (ws.lastEditTime || '2026-11-08'));
    setTxt('bwkStatQuality', ws.qualityScore || '98%');

    setTxt('bwkEditDetailRouteCode', '/subject/' + subj.id + '/edit_detail');
    setTxt('bwkHistoryRouteCode', '/subject/' + subj.id + '/edit');
    setTxt('bwkUploadRouteCode', '/subject/' + subj.id + '/upload_img');

    var editForm = document.getElementById('editSubjectForm');
    if (editForm) editForm.setAttribute('action', '/subject/' + subj.id + '/edit_detail');

    // 3. Populate edit_detail form
    var titleIn = document.getElementById('subjectTitleInput');
    if (titleIn) titleIn.value = subj.name;
    var airIn = document.getElementById('subjectAirdateInput');
    if (airIn) airIn.value = subj.airdate || '';
    var nsfwIn = document.getElementById('subjectNsfwCheckbox');
    if (nsfwIn) nsfwIn.checked = !!subj.nsfw;

    renderPlatformRadios(subj);

    var wcodeIn = document.getElementById('subject_infobox');
    if (wcodeIn) wcodeIn.value = subj.wcode || '';
    var parsed = parseWcodeToRows(subj.wcode || '', subj.infoboxTemplate);
    renderTableEditorRows(parsed.rows.length ? parsed.rows : (subj.infoboxRows || []));
    renderLiveInfoboxPreview(parsed.rows.length ? parsed.rows : (subj.infoboxRows || []));
    updateWcodeMetaCounter(subj.wcode || '', parsed.template);
    applyEditorViewVisibility();

    var sumIn = document.getElementById('subject_summary');
    if (sumIn) {
      sumIn.value = subj.summary || '';
      setTxt('bwkSummaryCharCount', (subj.summary || '').length + ' 字');
    }

    // 4. Populate revisions, covers, related
    state.rev2Id = (subj.revisions && subj.revisions[0]) ? subj.revisions[0].revId : '';
    state.rev1Id = (subj.revisions && subj.revisions[1]) ? subj.revisions[1].revId : state.rev2Id;
    renderRevisionsList(subj);
    renderCoverSection(subj);
    renderRelatedSection(subj);
    updateSubTabsAndPanes(subj);
  }

  /* ==========================================================================
     6. 事件绑定与交互闭环
     ========================================================================== */
  function bindEvents() {
    // 1. 预设条目切换栏
    var catBar = document.getElementById('bannerCategoryBar');
    if (catBar) {
      catBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.preset-pill-btn[data-subject-id]');
        if (!btn) return;
        var sid = btn.getAttribute('data-subject-id');
        if (sid) {
          renderSubjectWikiPage(sid);
          try {
            var u = new URL(window.location.href);
            u.searchParams.set('id', sid);
            window.history.replaceState({}, '', u.toString());
          } catch (err) {}
          showToast('已切换至《' + (getSubjectData(sid).name_cn || sid) + '》的维基工作台');
        }
      });
    }

    // 2. 二级导航栏 ul.navSubTabs (6 个 Tab)
    var subTabs = document.getElementById('wikiNavSubTabs');
    if (subTabs) {
      subTabs.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-wiki-tab]');
        if (!a) return;
        e.preventDefault();
        var tab = a.getAttribute('data-wiki-tab');
        state.activeTab = tab;

        if (tab === 'add_related_character') state.relatedMode = 'character';
        if (tab === 'add_related_person') state.relatedMode = 'person';
        if (tab === 'add_related_subject') state.relatedMode = 'subject';

        var subj = getSubjectData(state.subjectId);
        renderRelatedSection(subj);
        updateSubTabsAndPanes(subj);

        var paneIdMap = {
          edit_detail: 'wikiPaneEditDetail',
          edit: 'wikiPaneEditHistory',
          upload_img: 'wikiPaneUploadImg',
          add_related_character: 'wikiPaneAddRelated',
          add_related_person: 'wikiPaneAddRelated',
          add_related_subject: 'wikiPaneAddRelated'
        };
        var targetPane = document.getElementById(paneIdMap[tab]);
        if (targetPane && state.layoutMode === 'all') {
          targetPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // 3. 全景工作台 / 单页签模式切换
    var btnAll = document.getElementById('btnLayoutAllInOne');
    var btnSingle = document.getElementById('btnLayoutSingleTab');
    if (btnAll) {
      btnAll.addEventListener('click', function () {
        state.layoutMode = 'all';
        updateSubTabsAndPanes(getSubjectData(state.subjectId));
        showToast('已切换为「全景同屏工作台」：四大维基模块同屏展开');
      });
    }
    if (btnSingle) {
      btnSingle.addEventListener('click', function () {
        state.layoutMode = 'single';
        updateSubTabsAndPanes(getSubjectData(state.subjectId));
        showToast('已切换为「单页签聚焦模式」');
      });
    }

    // 4. 双栏同屏编辑器开关与恢复默认
    var splitBtn = document.getElementById('btnToggleSplitEditor');
    if (splitBtn) {
      splitBtn.addEventListener('click', function () {
        state.editorView = state.editorView === 'split' ? 'wcode' : 'split';
        applyEditorViewVisibility();
      });
    }
    var resetBtn = document.getElementById('btnResetInfoboxDefault');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        try { localStorage.removeItem(STORAGE_PREFIX + state.subjectId); } catch (err) {}
        renderSubjectWikiPage(state.subjectId);
        showToast('已恢复该条目初始预设维基数据');
      });
    }

    // 5. WCODE 输入框实时解析同步
    var wcodeIn = document.getElementById('subject_infobox');
    if (wcodeIn) {
      wcodeIn.addEventListener('input', function () {
        var subj = getSubjectData(state.subjectId);
        var parsed = parseWcodeToRows(wcodeIn.value, subj ? subj.infoboxTemplate : 'animanga/TVAnime');
        renderTableEditorRows(parsed.rows);
        renderLiveInfoboxPreview(parsed.rows);
        updateWcodeMetaCounter(wcodeIn.value, parsed.template);
      });
    }

    // 6. #tableEditor 表格内部操作与实时同步
    var tblContainer = document.getElementById('bwkTableRowsContainer');
    if (tblContainer) {
      tblContainer.addEventListener('input', function () {
        var subj = getSubjectData(state.subjectId);
        var wEl = document.getElementById('subject_infobox');
        var curTpl = wEl ? parseWcodeToRows(wEl.value, subj.infoboxTemplate).template : subj.infoboxTemplate;
        var rows = collectRowsFromTableDom();
        if (wEl) wEl.value = serializeRowsToWcode(curTpl, rows);
        renderLiveInfoboxPreview(rows);
      });

      tblContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        var rowEl = btn.closest('.bwk-tbl-row');
        if (!rowEl) return;

        if (act === 'del-row') {
          rowEl.remove();
          window.TableToWiki();
        } else if (act === 'move-row-up' && rowEl.previousElementSibling) {
          rowEl.parentNode.insertBefore(rowEl, rowEl.previousElementSibling);
          window.TableToWiki();
          window.WikiToTable();
        } else if (act === 'move-row-down' && rowEl.nextElementSibling) {
          rowEl.parentNode.insertBefore(rowEl.nextElementSibling, rowEl);
          window.TableToWiki();
          window.WikiToTable();
        } else if (act === 'add-subrow') {
          var subWrap = rowEl.querySelector('.bwk-tbl-subrows');
          if (subWrap) {
            var div = document.createElement('div');
            div.className = 'bwk-tbl-subrow-item';
            div.innerHTML = '<input type="text" class="inputtext bwk-tbl-subkey" placeholder="子项名" /><input type="text" class="inputtext bwk-tbl-subval" placeholder="子项值" /><button type="button" class="bwk-row-icon-btn is-danger" data-act="del-subrow">×</button>';
            subWrap.appendChild(div);
          }
        } else if (act === 'del-subrow') {
          var subItem = btn.closest('.bwk-tbl-subrow-item');
          if (subItem) {
            subItem.remove();
            window.TableToWiki();
          }
        }
      });
    }

    var addRowBtn = document.getElementById('btnAddTableRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', function () {
        var rows = collectRowsFromTableDom();
        rows.push({ key: '新属性字段', val: '待填写内容' });
        renderTableEditorRows(rows);
        window.TableToWiki();
      });
    }

    var addGroupBtn = document.getElementById('btnAddTableGroupRow');
    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', function () {
        var rows = collectRowsFromTableDom();
        rows.push({
          key: '新增版本/别名组',
          isGroup: true,
          subRows: [
            { subKey: '子属性1', val: '内容1' },
            { subKey: '子属性2', val: '内容2' }
          ]
        });
        renderTableEditorRows(rows);
        window.TableToWiki();
      });
    }

    // 7. 快捷插入属性芯片与修订摘要预设芯片
    document.querySelectorAll('.bwk-insert-chip[data-insert-key], .bwk-insert-chip[data-insert-group]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var rows = collectRowsFromTableDom();
        var gk = chip.getAttribute('data-insert-group');
        if (gk) {
          rows.push({ key: gk, isGroup: true, subRows: [{ subKey: '别名', val: '' }] });
        } else {
          rows.push({
            key: chip.getAttribute('data-insert-key') || '属性',
            val: chip.getAttribute('data-insert-val') || ''
          });
        }
        renderTableEditorRows(rows);
        window.TableToWiki();
      });
    });

    document.querySelectorAll('.bwk-insert-chip[data-summary-preset]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var sumInput = document.getElementById('editSummary');
        if (sumInput) sumInput.value = chip.getAttribute('data-summary-preset') || '';
      });
    });

    var sumTextarea = document.getElementById('subject_summary');
    if (sumTextarea) {
      sumTextarea.addEventListener('input', function () {
        var cEl = document.getElementById('bwkSummaryCharCount');
        if (cEl) cEl.textContent = sumTextarea.value.length + ' 字';
      });
    }

    // 8. 提交条目详情修改 (form[name="edit_subject"])
    var editForm = document.getElementById('editSubjectForm');
    if (editForm) {
      editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var subj = getSubjectData(state.subjectId);
        if (!subj) return;

        var newTitle = (document.getElementById('subjectTitleInput') || {}).value || subj.name;
        var newAirdate = (document.getElementById('subjectAirdateInput') || {}).value || subj.airdate;
        var newNsfw = !!(document.getElementById('subjectNsfwCheckbox') || {}).checked;
        var platChecked = document.querySelector('#wikiPlatformRadios input[name="platform"]:checked');
        var newPlat = platChecked ? platChecked.value : subj.platform;
        var newWcode = (document.getElementById('subject_infobox') || {}).value || subj.wcode;
        var newSummary = (document.getElementById('subject_summary') || {}).value || subj.summary;
        var reason = ((document.getElementById('editSummary') || {}).value || '').trim() || '维基人常规修订更新';

        var prevWcode = (subj.revisions && subj.revisions[0] && subj.revisions[0].snapshot)
          ? subj.revisions[0].snapshot.wcode
          : subj.wcode;
        var dInfo = computeLineDiff(prevWcode, newWcode);

        var parsed = parseWcodeToRows(newWcode, subj.infoboxTemplate);
        var cnRow = parsed.rows.find(function (r) { return r.key === '中文名'; });
        if (cnRow && cnRow.val) subj.name_cn = cnRow.val;

        subj.name = newTitle.trim();
        subj.airdate = newAirdate.trim();
        subj.nsfw = newNsfw;
        subj.platform = newPlat;
        subj.wcode = newWcode;
        subj.infoboxRows = parsed.rows;
        subj.summary = newSummary;

        var nextVerNum = 29 + (subj.revisions ? subj.revisions.length - 6 : 0);
        var newRevId = 'rev_' + Date.now();
        if (subj.revisions && subj.revisions.length) {
          subj.revisions[0].revNum = subj.revisions[0].revNum.replace(' (当前版本)', '');
        }
        var newRev = {
          revId: newRevId,
          revNum: 'v' + nextVerNum + ' (当前版本)',
          time: formatNowTime(),
          editor: '少年游',
          uid: '553488',
          badge: '当前登录维基人',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          summary: reason,
          diffTag: '+' + dInfo.added + ' / -' + dInfo.removed + ' 行',
          type: 'infobox',
          snapshot: {
            title: subj.name,
            name_cn: subj.name_cn,
            platform: subj.platform,
            nsfw: subj.nsfw,
            airdate: subj.airdate,
            wcode: subj.wcode,
            summary: subj.summary
          }
        };
        subj.revisions = [newRev].concat(subj.revisions || []);
        saveSubjectData(subj);

        state.rev2Id = newRevId;
        state.rev1Id = (subj.revisions[1] || newRev).revId;
        renderSubjectWikiPage(subj.id);
        showToast('✅ 已提交修改并生成修订版本 ' + newRev.revNum + '！可在下方「修订历史」查看 Diff');
      });
    }

    // 9. 修订历史列表单选与操作按钮
    var revList = document.getElementById('wikiRevisionList');
    if (revList) {
      revList.addEventListener('change', function (e) {
        var radio = e.target.closest('input[type="radio"]');
        if (!radio) return;
        if (radio.name === 'rev1') state.rev1Id = radio.value;
        if (radio.name === 'rev2') state.rev2Id = radio.value;
        renderRevisionsList(getSubjectData(state.subjectId));
      });

      revList.addEventListener('click', function (e) {
        var actEl = e.target.closest('[data-act]');
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        var revId = actEl.getAttribute('data-rev-id');
        var subj = getSubjectData(state.subjectId);
        if (!subj || !revId) return;
        var targetRev = (subj.revisions || []).find(function (r) { return r.revId === revId; });
        if (!targetRev) return;

        if (act === 'view-rev-snapshot') {
          e.preventDefault();
          state.rev2Id = revId;
          var idx = subj.revisions.indexOf(targetRev);
          state.rev1Id = (subj.revisions[idx + 1] || targetRev).revId;
          renderRevisionsList(subj);
          var diffViewer = document.getElementById('wikiDiffViewer');
          if (diffViewer) diffViewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast('正在查看 ' + targetRev.revNum + ' 的快照与差异对比');
        } else if (act === 'rollback-rev') {
          var snap = targetRev.snapshot;
          if (!snap) return;
          subj.name = snap.title || subj.name;
          subj.platform = snap.platform || subj.platform;
          subj.nsfw = !!snap.nsfw;
          subj.airdate = snap.airdate || subj.airdate;
          subj.wcode = snap.wcode || subj.wcode;
          subj.summary = snap.summary || subj.summary;
          subj.infoboxRows = parseWcodeToRows(subj.wcode, subj.infoboxTemplate).rows;

          if (subj.revisions.length) {
            subj.revisions[0].revNum = subj.revisions[0].revNum.replace(' (当前版本)', '');
          }
          var rbRev = {
            revId: 'rev_rb_' + Date.now(),
            revNum: 'v' + (29 + subj.revisions.length - 6) + ' (当前版本)',
            time: formatNowTime(),
            editor: '少年游',
            uid: '553488',
            badge: '回滚操作',
            avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
            summary: '回滚至历史版本 ' + targetRev.revNum + ' (' + targetRev.editor + ' 修订于 ' + targetRev.time + ')',
            diffTag: '版本回滚',
            type: 'rollback',
            snapshot: deepClone(snap)
          };
          subj.revisions = [rbRev].concat(subj.revisions);
          saveSubjectData(subj);
          renderSubjectWikiPage(subj.id);
          showToast('⏪ 已成功回滚至版本 ' + targetRev.revNum + ' 并同步更新上方编辑器！');
        }
      });
    }

    var handleCompareClick = function () {
      var r1Checked = document.querySelector('#wikiRevisionList input[name="rev1"]:checked');
      var r2Checked = document.querySelector('#wikiRevisionList input[name="rev2"]:checked');
      if (r1Checked) state.rev1Id = r1Checked.value;
      if (r2Checked) state.rev2Id = r2Checked.value;
      renderRevisionsList(getSubjectData(state.subjectId));
      var diffEl = document.getElementById('wikiDiffViewer');
      if (diffEl) diffEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('已生成选定版本的逐行 WCODE 与简介 Diff 对比！');
    };

    var btnCompare = document.getElementById('btnCompareRevisions');
    var btnCompareTop = document.getElementById('btnCompareRevisionsTop');
    if (btnCompare) btnCompare.addEventListener('click', handleCompareClick);
    if (btnCompareTop) btnCompareTop.addEventListener('click', handleCompareClick);

    var btnLatestTwo = document.getElementById('btnSelectLatestTwoRevs');
    if (btnLatestTwo) {
      btnLatestTwo.addEventListener('click', function () {
        var subj = getSubjectData(state.subjectId);
        if (!subj || !subj.revisions || !subj.revisions.length) return;
        state.rev2Id = subj.revisions[0].revId;
        state.rev1Id = (subj.revisions[1] || subj.revisions[0]).revId;
        renderRevisionsList(subj);
      });
    }

    var btnFirstLatest = document.getElementById('btnSelectFirstAndLatestRevs');
    if (btnFirstLatest) {
      btnFirstLatest.addEventListener('click', function () {
        var subj = getSubjectData(state.subjectId);
        if (!subj || !subj.revisions || !subj.revisions.length) return;
        state.rev2Id = subj.revisions[0].revId;
        state.rev1Id = subj.revisions[subj.revisions.length - 1].revId;
        renderRevisionsList(subj);
      });
    }

    var btnApplyRev = document.getElementById('btnApplySelectedRevToEditor');
    if (btnApplyRev) {
      btnApplyRev.addEventListener('click', function () {
        var subj = getSubjectData(state.subjectId);
        var rev = (subj.revisions || []).find(function (r) { return r.revId === state.rev2Id; });
        if (!rev || !rev.snapshot) return;
        var wIn = document.getElementById('subject_infobox');
        var sIn = document.getElementById('subject_summary');
        if (wIn) wIn.value = rev.snapshot.wcode || '';
        if (sIn) sIn.value = rev.snapshot.summary || '';
        window.WikiToTable();
        var editPane = document.getElementById('wikiPaneEditDetail');
        if (editPane) editPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('已将版本 ' + rev.revNum + ' 的内容载入上方编辑器');
      });
    }

    // 10. 增改封面操作
    var galleryEl = document.getElementById('wikiCoverGallery');
    if (galleryEl) {
      galleryEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        var cid = btn.getAttribute('data-id');
        var subj = getSubjectData(state.subjectId);
        if (!subj || !subj.covers) return;

        if (act === 'vote-cover') {
          var target = subj.covers.find(function (c) { return c.id === cid; });
          if (target) {
            target.votes = (target.votes || 0) + 1;
            saveSubjectData(subj);
            renderCoverSection(subj);
            showToast('👍 已为封面「' + target.label + '」投出支持票！');
          }
        } else if (act === 'set-default-cover') {
          subj.covers.forEach(function (c) {
            c.isCurrent = (c.id === cid);
            if (c.isCurrent) subj.cover = c.url;
          });
          saveSubjectData(subj);
          renderSubjectWikiPage(subj.id);
          showToast('🖼️ 已将该候选封面设为当前生效主封面！');
        }
      });
    }

    var addNewCoverRecord = function (url, label) {
      var subj = getSubjectData(state.subjectId);
      if (!subj) return;
      subj.covers.forEach(function (c) { c.isCurrent = false; });
      var newCov = {
        id: 'cov_' + Date.now(),
        url: url,
        label: label || '维基人新上传高清封面',
        resolution: '1200 × 1700 px',
        size: '512 KB',
        uploader: '少年游',
        uid: '553488',
        time: formatNowTime().slice(0, 10),
        votes: 1,
        isCurrent: true,
        status: '已生效 · 新上传'
      };
      subj.covers.unshift(newCov);
      subj.cover = url;
      saveSubjectData(subj);
      renderSubjectWikiPage(subj.id);
      showToast('📤 新封面已上传并设为默认主视觉封面！');
    };

    var btnUploadCover = document.getElementById('btnUploadNewCover');
    if (btnUploadCover) {
      btnUploadCover.addEventListener('click', function () {
        var urlIn = document.getElementById('bwkNewCoverUrlInput');
        var lblIn = document.getElementById('bwkNewCoverLabelInput');
        var url = urlIn && urlIn.value.trim() ? urlIn.value.trim() : getSubjectData(state.subjectId).cover;
        var lbl = lblIn && lblIn.value.trim() ? lblIn.value.trim() : 'BD 特装版高清封面';
        addNewCoverRecord(url, lbl);
        if (urlIn) urlIn.value = '';
        if (lblIn) lblIn.value = '';
      });
    }

    var fileIn = document.getElementById('bwkLocalCoverFileInput');
    if (fileIn) {
      fileIn.addEventListener('change', function () {
        var file = fileIn.files && fileIn.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          addNewCoverRecord(String(ev.target.result), '本地上传：' + file.name);
        };
        reader.readAsDataURL(file);
      });
    }

    // 11. 关联角色 / 人物 / 条目交互
    document.querySelectorAll('.bwk-rel-type-btn[data-rel-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-rel-mode');
        state.relatedMode = mode;
        state.activeTab = 'add_related_' + mode;
        var subj = getSubjectData(state.subjectId);
        renderRelatedSection(subj);
        updateSubTabsAndPanes(subj);
      });
    });

    var relListEl = document.getElementById('crtRelateSubjects');
    if (relListEl) {
      relListEl.addEventListener('click', function (e) {
        var delBtn = e.target.closest('a.del');
        if (!delBtn) return;
        e.preventDefault();
        var li = delBtn.closest('li[data-rel-id]');
        if (!li) return;
        var idx = Number(li.getAttribute('data-rel-idx'));
        var subj = getSubjectData(state.subjectId);
        var list = subj.related[state.relatedMode] || [];
        if (idx >= 0 && idx < list.length) {
          var removed = list.splice(idx, 1)[0];
          state.lastDeletedRelated = { mode: state.relatedMode, item: removed, index: idx };
          saveSubjectData(subj);
          renderRelatedSection(subj);
          showToast('已从关联列表移除「' + (removed.nameCn || removed.name) + '」（可点击下方按钮撤销）');
        }
      });

      relListEl.addEventListener('change', function () {
        var subj = getSubjectData(state.subjectId);
        var list = subj.related[state.relatedMode] || [];
        relListEl.querySelectorAll('li[data-rel-idx]').forEach(function (li) {
          var idx = Number(li.getAttribute('data-rel-idx'));
          var item = list[idx];
          if (!item) return;
          var sortIn = li.querySelector('.bwk-rel-sort-input');
          var roleSel = li.querySelector('.bwk-rel-role-select');
          var epsIn = li.querySelector('.bwk-rel-eps-input');
          if (sortIn) item.sortOrder = Number(sortIn.value) || (idx + 1);
          if (roleSel) {
            if (state.relatedMode === 'character') item.role = roleSel.value;
            else if (state.relatedMode === 'person') item.job = roleSel.value;
            else item.relation = roleSel.value;
          }
          if (epsIn) {
            if (state.relatedMode === 'subject') item.remark = epsIn.value;
            else item.eps = epsIn.value;
          }
        });
        saveSubjectData(subj);
      });
    }

    var undoBtn = document.getElementById('btnUndoDeleteRelated');
    if (undoBtn) {
      undoBtn.addEventListener('click', function () {
        if (!state.lastDeletedRelated) return;
        var subj = getSubjectData(state.subjectId);
        var list = subj.related[state.lastDeletedRelated.mode] || [];
        list.splice(state.lastDeletedRelated.index, 0, state.lastDeletedRelated.item);
        state.lastDeletedRelated = null;
        saveSubjectData(subj);
        renderRelatedSection(subj);
        showToast('↩ 已恢复刚才移除的关联项');
      });
    }

    var sortBtn = document.getElementById('btnSortRelatedByOrder');
    if (sortBtn) {
      sortBtn.addEventListener('click', function () {
        var subj = getSubjectData(state.subjectId);
        var list = subj.related[state.relatedMode] || [];
        list.sort(function (a, b) { return (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99); });
        saveSubjectData(subj);
        renderRelatedSection(subj);
        showToast('⇅ 已按排序权重重新排列关联列表');
      });
    }

    var searchInput = document.getElementById('subjectName');
    var searchBtn = document.getElementById('btnSearchRelated');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.relatedSearchQuery = searchInput.value;
        renderRelatedCandidates(getSubjectData(state.subjectId));
      });
    }
    if (searchBtn) {
      searchBtn.addEventListener('click', function () {
        if (searchInput) state.relatedSearchQuery = searchInput.value;
        renderRelatedCandidates(getSubjectData(state.subjectId));
      });
    }

    var candBox = document.getElementById('wikiRelatedSearchResults');
    if (candBox) {
      candBox.addEventListener('click', function (e) {
        var addBtn = e.target.closest('button[data-act="add-candidate"]');
        if (!addBtn) return;
        var cid = addBtn.getAttribute('data-id');
        var subj = getSubjectData(state.subjectId);
        var mode = state.relatedMode;
        var pool = (DB.candidatePools && DB.candidatePools[mode]) || [];
        var found = pool.find(function (c) { return String(c.id) === String(cid); });
        if (!found) {
          found = {
            id: cid,
            name: addBtn.getAttribute('data-name') || '新关联项',
            nameCn: addBtn.getAttribute('data-namecn') || '新关联项',
            role: '配角',
            job: '原画',
            relation: '其他',
            cv: '待补充',
            avatar: subj.cover,
            cover: subj.cover,
            eps: '全话'
          };
        }
        var copy = deepClone(found);
        copy.sortOrder = (subj.related[mode] || []).length + 1;
        subj.related[mode].push(copy);
        saveSubjectData(subj);
        renderRelatedSection(subj);
        showToast('➕ 已将「' + (copy.nameCn || copy.name) + '」加入左侧已关联列表！');
      });
    }

    var saveRelBtn = document.getElementById('btnSaveRelatedChanges');
    if (saveRelBtn) {
      saveRelBtn.addEventListener('click', function () {
        var subj = getSubjectData(state.subjectId);
        var modeNames = { character: '关联角色', person: '关联制作人员', subject: '关联条目' };
        var count = (subj.related[state.relatedMode] || []).length;
        if (subj.revisions && subj.revisions.length) {
          subj.revisions[0].revNum = subj.revisions[0].revNum.replace(' (当前版本)', '');
        }
        var rev = {
          revId: 'rev_rel_' + Date.now(),
          revNum: 'v' + (29 + (subj.revisions ? subj.revisions.length - 6 : 0)) + ' (当前版本)',
          time: formatNowTime(),
          editor: '少年游',
          uid: '553488',
          badge: '维基关联协力',
          avatar: 'https://lain.bgm.tv/pic/user/l/000/55/34/553488.jpg?r=1697955910&hd=1',
          summary: '保存「' + modeNames[state.relatedMode] + '」修改（当前共关联 ' + count + ' 项）',
          diffTag: '关联更新 (' + count + '项)',
          type: 'related',
          snapshot: {
            title: subj.name,
            name_cn: subj.name_cn,
            platform: subj.platform,
            nsfw: subj.nsfw,
            airdate: subj.airdate,
            wcode: subj.wcode,
            summary: subj.summary
          }
        };
        subj.revisions = [rev].concat(subj.revisions || []);
        saveSubjectData(subj);
        renderRevisionsList(subj);
        showToast('✅ 已保存「' + modeNames[state.relatedMode] + '」修改并记录至修订历史！');
      });
    }
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var qId = params.get('id');
    var qTab = params.get('tab');
    var qLayout = params.get('layout');

    if (qId && DB.subjects && DB.subjects[qId]) {
      state.subjectId = qId;
    }
    if (qTab) {
      var validTabs = ['edit_detail', 'edit', 'upload_img', 'add_related_character', 'add_related_person', 'add_related_subject'];
      if (validTabs.indexOf(qTab) >= 0) {
        state.activeTab = qTab;
        if (qTab === 'add_related_character') state.relatedMode = 'character';
        if (qTab === 'add_related_person') state.relatedMode = 'person';
        if (qTab === 'add_related_subject') state.relatedMode = 'subject';
      }
    }
    if (qLayout === 'single' || qLayout === 'all') {
      state.layoutMode = qLayout;
    }

    renderSubjectWikiPage(state.subjectId);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
