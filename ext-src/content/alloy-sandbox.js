/**
 * Bangumi Chronicle · Phase F1 · 第三方「超合金组件」与原站动态浮窗兼容沙盒 (alloy-sandbox.js)
 * 职责：
 * 1. 利用 MutationObserver 监听原站 chiiLib 及第三方超合金脚本向 document.body 动态插入的：
 *    - #TB_overlay / #TB_window (ThickBox 收藏盒/目录/关联浮窗)
 *    - #cluetip / .cluetip (角色/章节/条目悬停提示卡)
 *    - .ui-dialog / .ui-widget-content (jQuery UI 对话框与超合金设置弹窗)
 * 2. 自动为其打上 data-bgm-alloy-styled="1" 标记，由 bangumi-shell.css 赋予 Liquid Glass 毛玻璃自适应样式，彻底消除深色模式下的刺眼白底弹窗。
 * 3. 确保 #bgm-legacy-vault（及兼容别名 #bgm-legacy-dom-vault）对超合金脚本保持可达。
 */

const DYNAMIC_POPUP_SELECTOR = [
  '#TB_window',
  '#TB_overlay',
  '#cluetip',
  '.cluetip',
  '.ui-dialog',
  '#ukagaka_shell',
  '.bgm-tier-modal',
].join(', ');

let alloyObserver = null;

function tagPopupNode(node) {
  if (!node || node.nodeType !== 1) return;
  if (node.matches?.(DYNAMIC_POPUP_SELECTOR)) {
    node.setAttribute('data-bgm-alloy-styled', '1');
  }
  const inner = node.querySelectorAll?.(DYNAMIC_POPUP_SELECTOR);
  if (inner && inner.length) {
    for (let i = 0; i < inner.length; i++) {
      inner[i].setAttribute('data-bgm-alloy-styled', '1');
    }
  }
}

export function scanAndStyleAlloyNodes(doc = document) {
  if (!doc?.body) return 0;
  const matched = doc.querySelectorAll(DYNAMIC_POPUP_SELECTOR);
  for (let i = 0; i < matched.length; i++) {
    matched[i].setAttribute('data-bgm-alloy-styled', '1');
  }
  return matched.length;
}

export function startAlloySandbox(doc = document, enabled = true) {
  stopAlloySandbox(doc);
  if (!enabled || !doc?.documentElement) return;

  doc.documentElement.dataset.bgmAlloyCompat = '1';
  scanAndStyleAlloyNodes(doc);

  if (typeof MutationObserver === 'function' && doc.body) {
    alloyObserver = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const added = mutations[i].addedNodes;
        for (let j = 0; j < added.length; j++) {
          tagPopupNode(added[j]);
        }
      }
    });
    alloyObserver.observe(doc.body, { childList: true, subtree: true });
  }
}

export function stopAlloySandbox(doc = document) {
  if (alloyObserver) {
    alloyObserver.disconnect();
    alloyObserver = null;
  }
  if (doc?.documentElement) {
    delete doc.documentElement.dataset.bgmAlloyCompat;
  }
}
