/**
 * Bangumi Chronicle · P27 电波提醒 & 站内短信水合器 (notify-hydrator.js)
 */

import { escapeHtml, eraseActionLink, postFormUrlEncoded } from '../actions/bangumi-api.js';
import { stashOriginalMain, mountHydratedStage } from './dom-vault.js';
import { extractNotifyData } from './notify-extractor.js';

export function hydrateNotifyPage({ doc, session, activatePageStyles, toast }) {
  const data = extractNotifyData(doc);
  activatePageStyles(['bangumi-notify.css', 'phase-b-hydrated.css']);
  stashOriginalMain(doc);

  const navTabsHtml = [
    ['notify', '/notify/all', `🔔 电波提醒${data.notifications.length ? ` (${data.notifications.length})` : ''}`],
    ['inbox', '/pm/inbox.chii', '📥 收件箱'],
    ['outbox', '/pm/outbox.chii', '📤 已发送'],
    ['compose', '/pm/compose.chii', '✍️ 撰写新短信'],
  ]
    .map(
      ([k, href, label]) =>
        `<li><a href="${href}" class="${data.tab === k ? 'focus selected' : ''}"><span>${escapeHtml(label)}</span></a></li>`
    )
    .join('');

  let mainBodyHtml = '';
  const sideHtml = `
    <div class="bnt-side-panel">
      <h2>消息导航</h2>
      <div class="bnt-side-nav">
        <a href="/notify/all">🔔 全部电波提醒</a>
        <a href="/pm/inbox.chii">📥 站内短信收件箱</a>
        <a href="/pm/outbox.chii">📤 已发送短信</a>
        <a href="/pm/compose.chii">✍️ 撰写新短信</a>
      </div>
    </div>`;

  if (data.guestNotice) {
    mainBodyHtml = `
      <div class="bnt-card">
        <h2 style="margin-bottom:10px;">${escapeHtml(data.guestNotice.title)}</h2>
        <p style="color:var(--bnt-muted);margin-bottom:16px;">${data.guestNotice.html}</p>
        <a href="/login" class="chiiBtn is-primary">前往登录 →</a>
      </div>`;
  } else if (data.tab === 'notify') {
    mainBodyHtml = `
      <div class="bnt-card">
        <div class="bnt-toolbar">
          <h2 style="margin:0;">电波提醒</h2>
          ${data.clearAllHref ? `<button type="button" class="chiiBtn" id="bntClearAllBtn" data-href="${escapeHtml(data.clearAllHref)}">全部标记已读</button>` : ''}
        </div>
        <div class="bnt-notify-list" id="bntNotifyList">
          ${data.notifications.length
            ? data.notifications
                .map(
                  (n) =>
                    `<div class="bnt-notify-row" data-ntf-id="${escapeHtml(n.id)}">` +
                      `<img class="bnt-avatar-44" src="${escapeHtml(n.avatar)}" alt="" referrerpolicy="no-referrer" />` +
                      `<div style="flex:1;min-width:0;">` +
                        `<div class="bnt-notify-head">${n.contentHtml}</div>` +
                        (n.time ? `<div class="bnt-notify-time">${escapeHtml(n.time)}</div>` : '') +
                      `</div>` +
                      (n.eraseHref ? `<button type="button" class="bnt-erase-btn" data-bgm-erase-ntf="${escapeHtml(n.eraseHref)}" title="擦除提醒">×</button>` : '') +
                    `</div>`
                )
                .join('')
            : '<div class="bnt-empty">目前没有新的电波提醒 ✨</div>'}
        </div>
      </div>`;
  } else if (data.tab === 'compose' || (data.tab === 'view' && data.composeForm)) {
    const f = data.composeForm || {
      action: '/pm/compose.chii',
      formhash: session.formhash || '',
      receivers: '',
      title: '',
      body: '',
      submitName: 'submit',
      submitValue: '发送',
    };
    const msgsHtml =
      data.tab === 'view' && data.threadMsgs.length
        ? `<div class="bnt-thread-card" style="margin-bottom:16px;"><div class="bnt-thread-msgs">` +
          data.threadMsgs
            .map(
              (m) =>
                `<div class="bnt-msg-bubble"><div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;"><img class="bnt-avatar-44" src="${escapeHtml(m.avatar)}" alt="" referrerpolicy="no-referrer" /><strong>${escapeHtml(m.user)}</strong><small>${escapeHtml(m.time)}</small></div><div class="bnt-msg-body">${m.bodyHtml}</div></div>`
            )
            .join('') +
          `</div></div>`
        : '';

    mainBodyHtml =
      msgsHtml +
      `<div class="bnt-card">
        <h2 style="margin-bottom:14px;">${data.tab === 'view' ? '回复短信' : '撰写站内短信'}</h2>
        <form class="bnt-compose-form" id="bntComposeForm" action="${escapeHtml(f.action)}" method="post">
          <input type="hidden" name="formhash" value="${escapeHtml(f.formhash || session.formhash)}" />
          <div class="bnt-field">
            <label>收件人 UID / 用户名</label>
            <input class="bnt-input" type="text" name="msg_receivers" value="${escapeHtml(f.receivers)}" placeholder="输入收件人 ID 或用户名" required />
          </div>
          <div class="bnt-field">
            <label>短信标题</label>
            <input class="bnt-input" type="text" name="msg_title" value="${escapeHtml(f.title)}" placeholder="输入标题" required />
          </div>
          <div class="bnt-field">
            <label>正文内容 (支持 BBCode)</label>
            <textarea class="bnt-textarea" name="msg_body" rows="6" placeholder="输入短信内容…" required>${escapeHtml(f.body)}</textarea>
          </div>
          <button type="submit" class="chiiBtn is-primary">${escapeHtml(f.submitValue || '发送短信')}</button>
        </form>
      </div>`;
  } else {
    mainBodyHtml = `
      <div class="bnt-card">
        <form id="bntPmBulkForm" action="${escapeHtml(data.bulkForm?.action || '/pm/erase.chii')}" method="post">
          <input type="hidden" name="formhash" value="${escapeHtml(data.bulkForm?.formhash || session.formhash)}" />
          <input type="hidden" name="folder" value="${escapeHtml(data.bulkForm?.folder || data.tab)}" />
          <div class="bnt-toolbar">
            <h2 style="margin:0;">${data.tab === 'outbox' ? '已发送短信' : '站内短信收件箱'}</h2>
            ${data.pms.length ? '<button type="submit" class="chiiBtn">删除选中短信</button>' : ''}
          </div>
          <div class="bnt-pm-list">
            ${data.pms.length
              ? data.pms
                  .map(
                    (pm) =>
                      `<div class="bnt-pm-row">` +
                        `<input type="checkbox" name="${escapeHtml(pm.checkboxName)}" value="${escapeHtml(pm.id)}" />` +
                        `<div style="flex:1;min-width:0;">` +
                          `<a class="bnt-pm-title" href="${escapeHtml(pm.href)}">${pm.unread ? '<span class="bnt-unread-dot"></span>' : ''}${escapeHtml(pm.title)}</a>` +
                          `<div class="bnt-pm-snippet">${pm.user ? `<a href="${escapeHtml(pm.userHref)}">${escapeHtml(pm.user)}</a> · ` : ''}${escapeHtml(pm.time)}</div>` +
                        `</div>` +
                      `</div>`
                  )
                  .join('')
              : '<div class="bnt-empty">该信箱暂无站内短信</div>'}
          </div>
        </form>
      </div>`;
  }

  const stageHtml = `
    <section class="bnt-header-card" id="bntHeader">
      <div class="bnt-header-top">
        <div class="bnt-title-wrap">
          <div class="bnt-badge-icon">🔔</div>
          <div>
            <h1 class="bnt-h1">电波提醒 &amp; 站内短信</h1>
            <div class="bnt-h1-sub"><span>真实同步 Bangumi 通知与私信系统</span></div>
          </div>
        </div>
        <div class="bnt-header-actions">
          <a href="/pm/compose.chii" class="chiiBtn is-primary">✍️ 撰写新短信</a>
        </div>
      </div>
      <div class="bnt-subtabs-wrap"><ul class="bnt-navtabs">${navTabsHtml}</ul></div>
    </section>
    <div class="bnt-columns">
      <div id="bntColA" class="column-main">${mainBodyHtml}</div>
      <aside id="bntColB" class="column-side">${sideHtml}</aside>
    </div>`;

  const mainEl = mountHydratedStage(doc, { tag: 'main', id: 'main', className: 'bnt-shell bnt-page-body', html: stageHtml });

  mainEl.addEventListener('click', async (ev) => {
    const eraseBtn = ev.target.closest('[data-bgm-erase-ntf]');
    if (eraseBtn) {
      try {
        await eraseActionLink(eraseBtn.getAttribute('data-bgm-erase-ntf'));
        eraseBtn.closest('.bnt-notify-row')?.remove();
        toast('提醒已擦除');
      } catch (err) {
        toast('擦除失败：' + (err?.message || '请重试'));
      }
      return;
    }

    const clearBtn = ev.target.closest('#bntClearAllBtn');
    if (clearBtn) {
      try {
        await eraseActionLink(clearBtn.getAttribute('data-href'));
        const list = doc.getElementById('bntNotifyList');
        if (list) list.innerHTML = '<div class="bnt-empty">所有提醒已清空 ✨</div>';
        toast('已全部标记已读');
      } catch (err) {
        toast('操作失败：' + (err?.message || '请重试'));
      }
    }
  });

  mainEl.addEventListener('submit', async (ev) => {
    if (ev.target.id === 'bntComposeForm') {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const fields = {};
      for (const [k, v] of fd.entries()) fields[k] = v;
      fields.submit = '发送';
      try {
        await postFormUrlEncoded(ev.target.getAttribute('action') || '/pm/compose.chii', fields);
        toast('站内短信发送成功！');
        location.href = '/pm/outbox.chii';
      } catch (err) {
        toast('发送失败：' + (err?.message || '请检查收件人'));
      }
      return;
    }

    if (ev.target.id === 'bntPmBulkForm') {
      ev.preventDefault();
      const checked = Array.from(ev.target.querySelectorAll('input[type="checkbox"]:checked'));
      if (!checked.length) {
        toast('请先勾选要删除的短信');
        return;
      }
      if (!confirm(`确定删除选中的 ${checked.length} 封短信？`)) return;
      const body = new URLSearchParams();
      body.append('formhash', ev.target.querySelector('input[name="formhash"]')?.value || session.formhash);
      body.append('folder', ev.target.querySelector('input[name="folder"]')?.value || data.tab);
      body.append('submit', '删除');
      checked.forEach((cb) => body.append(cb.name, cb.value));
      try {
        await fetch(ev.target.getAttribute('action') || '/pm/erase.chii', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: body.toString(),
        });
        checked.forEach((cb) => cb.closest('.bnt-pm-row')?.remove());
        toast('选中短信已删除');
      } catch (err) {
        toast('删除失败：' + (err?.message || '请重试'));
      }
    }
  });
}
