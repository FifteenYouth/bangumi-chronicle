import { upgradeEmojisInTree } from '../../shared/icons.js';

/**
 * Bangumi Chronicle · Phase B 原站 DOM 保险箱与水合舞台挂载工具
 * 将原站 #main / #headerProfile 无损移入 #bgm-legacy-vault 并重命名冲突 ID，
 * 确保超合金组件 / 表单 / chiiLib 不崩溃，同时为现代水合 UI 腾出干净的主舞台。
 */

const DEFAULT_RENAME_IDS = new Set([
  'main',
  'headerProfile',
  'header',
  'columnA',
  'columnB',
  'columnHomeA',
  'columnHomeB',
  'columnTimelineA',
  'columnTimelineB',
  'columnTimelineInnerWrapper',
  'timeline',
  'timelineTabs',
  'SayFrom',
  'SayInput',
  'user_home',
  'browserItemList',
  'userTagList',
  'comment_list',
  'prgManager',
  'home_tml',
  'home_calendar',
  'home_grp_tpc',
  'home_subject_tpc',
  'friend_flag',
  'ChartWarpper',
  'headerSubject',
  'columnSubjectHomeA',
  'columnSubjectHomeB',
  'columnSubjectInHomeB',
  'columnInSubjectA',
  'columnInSubjectB',
  'bangumiInfo',
  'infobox',
  'subject_detail',
  'subject_summary',
  'panelInterestWrapper',
  'collectBoxForm',
  'subjectPanelIndex',
  'subjectPanelCollect',
  'entry_list',
  'comment_box',
  'columnSubjectBrowserA',
  'columnSubjectBrowserB',
  'browserTools',
  'browserTypeSelector',
  'tagList',
  'multipage',
  'columnSearchA',
  'columnSearchB',
  'columnSearchC',
  'columnCrtA',
  'columnCrtB',
  'eden_tpc_list',
  'pageHeader',
  'entry_content',
]);

export function ensureLegacyVault(doc) {
  let vault = doc.getElementById('bgm-legacy-vault');
  if (!vault && doc.body) {
    vault = doc.createElement('div');
    vault.id = 'bgm-legacy-vault';
    vault.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(vault);
  }
  return vault;
}

function renameIdsInSubtree(root, extraRenameSet) {
  if (!root || root.nodeType !== 1) return;
  const shouldRename = (id) => DEFAULT_RENAME_IDS.has(id) || extraRenameSet.has(id);
  if (root.id && shouldRename(root.id)) {
    root.setAttribute('data-bgm-legacy-id', root.id);
    root.id = 'bgm-legacy-' + root.id;
  }
  const nodes = root.querySelectorAll?.('[id]');
  if (!nodes) return;
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el.id && shouldRename(el.id)) {
      el.setAttribute('data-bgm-legacy-id', el.id);
      el.id = 'bgm-legacy-' + el.id;
    }
  }
}

export function stashOriginalMain(doc, extraIds = []) {
  const vault = ensureLegacyVault(doc);
  if (!vault) return;
  const extraSet = new Set(extraIds);

  const targets = doc.querySelectorAll(
    '#wrapperNeue > #main:not([data-bgm-hydrated-el="1"]), #wrapperNeue > #headerProfile:not([data-bgm-hydrated-el="1"]), #wrapperNeue > #headerSubject:not([data-bgm-hydrated-el="1"]), #wrapperNeue > .mainWrapper:not([data-bgm-hydrated-el="1"]), body > #main:not([data-bgm-hydrated-el="1"]), body > #headerSubject:not([data-bgm-hydrated-el="1"])'
  );
  for (let i = 0; i < targets.length; i++) {
    const node = targets[i];
    if (!node || node.closest?.('#bgm-legacy-vault')) continue;
    renameIdsInSubtree(node, extraSet);
    node.setAttribute('data-bgm-vaulted', '1');
    vault.appendChild(node);
  }
}

export function mountHydratedStage(doc, { tag = 'main', id = 'main', className = '', html = '' }) {
  const existing = doc.querySelector('[data-bgm-hydrated-el="1"]');
  if (existing) existing.remove();

  const el = doc.createElement(tag);
  if (id) el.id = id;
  if (className) el.className = className;
  el.setAttribute('data-bgm-hydrated-el', '1');
  if (html) el.innerHTML = html;

  const wrapper = doc.getElementById('wrapperNeue');
  if (wrapper) {
    wrapper.appendChild(el);
  } else {
    const footer = doc.querySelector('footer.glass-footer[data-bgm-shell-el="1"]');
    if (footer && footer.parentNode === doc.body) {
      doc.body.insertBefore(el, footer);
    } else {
      doc.body.appendChild(el);
    }
  }

  upgradeEmojisInTree(el);
  if (typeof MutationObserver === 'function') {
    const obs = new MutationObserver(() => {
      upgradeEmojisInTree(el);
    });
    obs.observe(el, { childList: true, subtree: true });
  }
  doc.documentElement.dataset.bgmPageHydrated = '1';
  return el;
}
