/**
 * Bangumi Chronicle · 原站真实服务端交互桥接 (bangumi-api.js)
 * 所有写操作均携带真实 formhash / gh，通过 credentials: 'include' 直连 Bangumi 原站接口。
 */

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function absBgmUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}

export async function postFormUrlEncoded(url, fields = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) body.append(k, String(v));
  }
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, url: res.url };
}

/**
 * 章节进度真实状态提交
 * status: 'watched' | 'till' | 'queue' | 'drop' | 'remove'
 */
export async function updateEpisodeStatus({ epId, status, gh = '', watchedTillIds = [] }) {
  if (!epId) throw new Error('缺少 epId');
  const realStatus = status === 'till' ? 'watched' : status;
  const qs = new URLSearchParams();
  if (gh) qs.set('gh', gh);
  qs.set('ajax', '1');
  const url = `/subject/ep/${encodeURIComponent(epId)}/status/${encodeURIComponent(realStatus)}?${qs.toString()}`;

  const payload = {};
  if (status === 'till' && watchedTillIds.length > 0) {
    payload.ep_id = watchedTillIds.join(',');
  }
  const res = await postFormUrlEncoded(url, payload);
  let json = null;
  try {
    json = JSON.parse(res.text);
  } catch {}
  if (!res.ok || (json && json.status && json.status !== 'ok')) {
    throw new Error(json?.error || `请求失败 (${res.status})`);
  }
  return { ok: true, json, raw: res.text };
}

/**
 * 首页/条目批量进度提交 (prgBatchManagerForm)
 */
export async function submitBatchProgress({ action, formhash, subjectId, watchedEps, watchedVols }) {
  const target = action || `/subject/set/watched/${encodeURIComponent(subjectId)}`;
  const fields = { submit: '保存' };
  if (formhash) fields.formhash = formhash;
  if (watchedEps !== undefined) fields.watched_eps = String(watchedEps);
  if (watchedVols !== undefined) fields.watched_vols = String(watchedVols);
  return postFormUrlEncoded(target, fields);
}

/**
 * 时间线吐槽真实提交 (#SayFrom)
 */
export async function submitTimelineSay({ action = '/timeline?ajax=1', formhash = '', sayInput = '' }) {
  const text = String(sayInput || '').trim();
  if (!text) throw new Error('吐槽内容不能为空');
  const target = action.includes('ajax=')
    ? action
    : action + (action.includes('?') ? '&' : '?') + 'ajax=1';
  const fields = {
    say_input: text,
    submit: '写好了',
  };
  if (formhash) fields.formhash = formhash;
  return postFormUrlEncoded(target, fields);
}

/**
 * 拉取单条时间线详情与回复列表
 */
export async function fetchTimelineReplies(replyUrl) {
  if (!replyUrl) return { replies: [], form: null };
  const url = replyUrl.includes('ajax=')
    ? replyUrl
    : replyUrl + (replyUrl.includes('?') ? '&' : '?') + 'ajax=1';
  const res = await fetch(url, { credentials: 'include' });
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const replies = [];
  doc.querySelectorAll('.reply_item, .sub_reply_bg, li.clearit').forEach((li) => {
    const userA = li.querySelector('a.l, strong a');
    const user = userA?.textContent?.trim() || '';
    const href = userA?.getAttribute('href') || '';
    const uid = href.match(/\/user\/([^/?#]+)/)?.[1] || '';
    const contentEl = li.querySelector('.reply_content, .message, .cmt_sub_content');
    let text = contentEl?.textContent?.trim() || '';
    if (!text) {
      const clone = li.cloneNode(true);
      clone.querySelectorAll('a.l, .avatar, .post_actions, small').forEach((n) => n.remove());
      text = clone.textContent?.trim() || '';
    }
    const time = li.querySelector('.date, small.grey, .titleTip')?.textContent?.trim() || '';
    if (user || text) {
      replies.push({ user, uid, text, time });
    }
  });

  const formEl = doc.querySelector('form');
  const form = formEl
    ? {
        action: formEl.getAttribute('action') || replyUrl,
        formhash: formEl.querySelector('input[name="formhash"]')?.value || '',
      }
    : null;

  return { replies, form };
}

export async function submitTimelineReply({ action, formhash, content }) {
  const text = String(content || '').trim();
  if (!text) throw new Error('回复内容不能为空');
  const target = action.includes('ajax=')
    ? action
    : action + (action.includes('?') ? '&' : '?') + 'ajax=1';
  const fields = { content: text, submit: '回复' };
  if (formhash) fields.formhash = formhash;
  return postFormUrlEncoded(target, fields);
}

export async function eraseActionLink(href) {
  if (!href) throw new Error('缺少操作链接');
  const url = href.includes('ajax=')
    ? href
    : href + (href.includes('?') ? '&' : '?') + 'ajax=1';
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  return { ok: res.ok, status: res.status };
}

/**
 * 条目页收藏盒与十星评分真实提交 (#collectBoxForm -> /subject/{id}/interest/update?gh=...)
 */
export async function submitSubjectInterest({
  subjectId,
  action,
  gh = '',
  interest = '2',
  rating = '',
  tags = '',
  comment = '',
  privacy = false,
}) {
  if (!subjectId && !action) throw new Error('缺少条目 ID 或提交地址');
  const target =
    action ||
    `/subject/${encodeURIComponent(subjectId)}/interest/update${gh ? `?gh=${encodeURIComponent(gh)}` : ''}`;
  const fields = {
    referer: 'subject',
    interest: String(interest || '2'),
    rating: rating ? String(rating) : '',
    tags: String(tags || '').trim(),
    comment: String(comment || '').trim(),
    update: '保存',
  };
  if (privacy) fields.privacy = '1';
  const res = await postFormUrlEncoded(target, fields);
  if (!res.ok) throw new Error(`保存收藏失败 (${res.status})`);
  return res;
}

/**
 * 抹除条目收藏记录 (/subject/{id}/remove?gh=...)
 */
export async function removeSubjectInterest({ subjectId, gh = '' }) {
  if (!subjectId) throw new Error('缺少条目 ID');
  const url = `/subject/${encodeURIComponent(subjectId)}/remove${gh ? `?gh=${encodeURIComponent(gh)}` : ''}`;
  const res = await postFormUrlEncoded(url, { referer: 'subject' });
  if (!res.ok) throw new Error(`抹除收藏失败 (${res.status})`);
  return res;
}
