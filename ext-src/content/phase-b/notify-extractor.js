/**
 * Bangumi Chronicle · P27 电波提醒 (/notify/all) 与站内短信 (/pm*) 提取器 (notify-extractor.js)
 */

function normUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (s.startsWith('//')) return 'https:' + s;
  return s;
}

function parseBgUrl(el) {
  if (!el) return '';
  const style = el.getAttribute?.('style') || '';
  const m = style.match(/url\((['"]?)([^'")]+)\1\)/i);
  return m?.[2] ? normUrl(m[2]) : '';
}

export function extractNotifyData(doc) {
  const pathname = typeof location !== 'undefined' ? location.pathname : '';
  let tab = 'notify';
  if (pathname.includes('/pm/compose')) tab = 'compose';
  else if (pathname.includes('/pm/outbox')) tab = 'outbox';
  else if (pathname.includes('/pm/view')) tab = 'view';
  else if (pathname.startsWith('/pm')) tab = 'inbox';

  const noticeMsg = doc.querySelector('#colunmNotice .message');
  if (noticeMsg) {
    return {
      tab,
      guestNotice: {
        title: noticeMsg.querySelector('h2')?.textContent?.trim() || '需要登录',
        html: noticeMsg.querySelector('.text')?.innerHTML || '抱歉，当前操作需要您 <a href="/login">登录</a> 后才能继续进行。',
      },
      notifications: [],
      pms: [],
      threadMsgs: [],
      composeForm: null,
      clearAllHref: '',
      bulkForm: null,
    };
  }

  const notifications = [];
  doc
    .querySelectorAll(
      '#comment_list > div[id^="notify_"], #comment_list .tml_item, #comment_list .row_reply, .notify_item, #bgm-legacy-comment_list > div[id^="notify_"], #bgm-legacy-comment_list .tml_item'
    )
    .forEach((row) => {
      const avaSpan = row.querySelector('span.avatarNeue, [style*="background-image"]');
      const avaImg = row.querySelector('img');
      const rawAva = parseBgUrl(avaSpan) || normUrl(avaImg?.getAttribute('src')) || '';
      const avatar =
        rawAva.replace(/(\/pic\/user\/)(?:s|m|c)(\/)/i, '$1l$2') ||
        'https://lain.bgm.tv/pic/user/l/icon.jpg';
      const eraseA = row.querySelector('a.erase_notify, a[href*="erase"]');
      const innerEl = row.querySelector('.inner');
      const clone = (innerEl || row).cloneNode(true);
      clone.querySelectorAll('a.erase_notify, .avatar, .re_info').forEach((n) => n.remove());
      const contentHtml = (clone.innerHTML || '').trim();
      const time =
        row.querySelector('.re_info small, small.grey, .date')?.textContent?.trim() || '';
      const unread = row.classList.contains('notify_status_1') || row.classList.contains('unread');
      if (contentHtml) {
        notifications.push({
          id: row.id || String(notifications.length + 1),
          avatar,
          contentHtml,
          time,
          unread,
          eraseHref: eraseA?.getAttribute('href') || '',
        });
      }
    });

  const clearAllA = doc.querySelector('#columnB a.chiiBtn[href*="erase"], a.chiiBtn[href*="/erase/all"]');
  const clearAllHref = clearAllA?.getAttribute('href') || '';

  const bulkFormEl = doc.querySelector('#columnA form, #pmForm, form[action*="/pm"]');
  const bulkForm = bulkFormEl
    ? {
        action: bulkFormEl.getAttribute('action') || pathname,
        formhash: bulkFormEl.querySelector('input[name="formhash"]')?.value || '',
        folder: bulkFormEl.querySelector('input[name="folder"]')?.value || (tab === 'outbox' ? 'outbox' : 'inbox'),
      }
    : null;

  const pms = [];
  doc.querySelectorAll('table.topic_list tr, .pmList li, #columnA tr').forEach((tr) => {
    const link = tr.querySelector('a[href*="/pm/view/"], a[href*="/pm/"]');
    if (!link) return;
    const cb = tr.querySelector('input[type="checkbox"]');
    const userA = tr.querySelector('a[href*="/user/"]');
    const time = tr.querySelector('.date, td:last-child, small')?.textContent?.trim() || '';
    pms.push({
      id: cb?.value || String(pms.length + 1),
      checkboxName: cb?.getAttribute('name') || 'erase_pm[]',
      title: link.textContent.trim(),
      href: link.getAttribute('href') || '#',
      user: userA?.textContent?.trim() || '',
      userHref: userA?.getAttribute('href') || '',
      time,
      unread: tr.classList.contains('unread') || Boolean(tr.querySelector('strong')),
    });
  });

  const threadMsgs = [];
  if (tab === 'view') {
    doc.querySelectorAll('#comment_list .row_reply, .pm_view .item, #columnA .message_box').forEach((m) => {
      const userA = m.querySelector('a[href*="/user/"]');
      const ava = parseBgUrl(m.querySelector('span.avatarNeue')) || normUrl(m.querySelector('img')?.getAttribute('src')) || 'https://lain.bgm.tv/pic/user/l/icon.jpg';
      const body = m.querySelector('.message, .reply_content, .inner')?.innerHTML?.trim() || m.innerHTML;
      const time = m.querySelector('small, .date')?.textContent?.trim() || '';
      threadMsgs.push({
        user: userA?.textContent?.trim() || '',
        avatar,
        bodyHtml: body,
        time,
      });
    });
  }

  const composeFormEl = doc.querySelector('form[action*="compose"], form[action*="/pm/"]');
  const composeForm = composeFormEl
    ? {
        action: composeFormEl.getAttribute('action') || '/pm/compose.chii',
        formhash: composeFormEl.querySelector('input[name="formhash"]')?.value || '',
        receivers: composeFormEl.querySelector('input[name="msg_receivers"]')?.value || '',
        title: composeFormEl.querySelector('input[name="msg_title"]')?.value || '',
        body: composeFormEl.querySelector('textarea[name="msg_body"]')?.value || '',
        submitName: composeFormEl.querySelector('input[type="submit"]')?.getAttribute('name') || 'submit',
        submitValue: composeFormEl.querySelector('input[type="submit"]')?.value || '发送',
      }
    : null;

  return {
    tab,
    guestNotice: null,
    notifications,
    clearAllHref,
    pms,
    bulkForm,
    threadMsgs,
    composeForm,
  };
}
