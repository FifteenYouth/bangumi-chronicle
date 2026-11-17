/**
 * Bangumi Chronicle · 全站 29 路由精准分发器 (P01–P29 + rakuen iframe + ThickBox)
 * 既可在浏览器运行，也可在 Node 测试中传入虚拟 pathname/search/doc 验证全站覆盖率。
 */

const MEDIA_CHANNELS = new Set(['anime', 'book', 'music', 'game', 'real']);

function cleanPath(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

function isGuestDocument(doc) {
  if (!doc || typeof doc.querySelector !== 'function') return false;
  if (doc.querySelector('#headerNeue2 .guest, #dock a[href*="/login"], form#loginForm')) {
    return true;
  }
  return false;
}

function detectFrameRole({ path, search, isSubFrame }) {
  if (search && /(?:^|[?&])TB_iframe=true/i.test(search)) {
    return 'thickbox';
  }
  if (path === '/rakuen' || /^\/rakuen\/(new_bangumi|tokei|classical_bangumi|doujin|pvc)$/.test(path)) {
    return isSubFrame ? 'rakuen-sub' : 'rakuen-outer';
  }
  if (path.startsWith('/rakuen/topiclist')) return 'rakuen-list';
  if (path.startsWith('/rakuen/home')) return 'rakuen-home';
  if (path.startsWith('/rakuen/topic/')) return 'rakuen-topic';
  if (path.startsWith('/rakuen/')) return isSubFrame ? 'rakuen-sub' : 'rakuen-outer';
  return isSubFrame ? 'iframe' : 'top';
}

/**
 * 解析当前 URL 与 DOM，返回 { page, slug, frameRole, params }
 */
export function matchRoute({
  pathname = typeof location !== 'undefined' ? location.pathname : '/',
  search = typeof location !== 'undefined' ? location.search : '',
  isSubFrame = typeof window !== 'undefined' ? window.self !== window.top : false,
  doc = typeof document !== 'undefined' ? document : null,
} = {}) {
  const path = cleanPath(pathname);
  const segs = path === '/' ? [] : path.slice(1).split('/');
  const frameRole = detectFrameRole({ path, search, isSubFrame });

  // P20: 超展开（外框 & 子帧统一归属 P20，通过 frameRole 区分挂载层级）
  if (segs[0] === 'rakuen') {
    return {
      page: 'P20',
      slug: 'rakuen',
      frameRole,
      params: { sub: segs.slice(1).join('/') },
    };
  }

  // P01 / P02: 首页（已登录 vs 游客）+ 登录/注册页
  if (path === '/') {
    const guest = isGuestDocument(doc);
    return {
      page: guest ? 'P02' : 'P01',
      slug: guest ? 'guest-home' : 'home',
      frameRole,
      params: {},
    };
  }
  if (path === '/login' || path === '/signup' || path === '/oauth/authorize') {
    return {
      page: 'P02',
      slug: path.slice(1),
      frameRole,
      params: {},
    };
  }

  // P03: 时空管理局 + 用户时间胶囊
  if (path === '/timeline' || /^\/user\/[^/]+\/timeline(\/.*)?$/.test(path)) {
    return {
      page: 'P03',
      slug: 'timeline',
      frameRole,
      params: { uid: segs[0] === 'user' ? decodeURIComponent(segs[1]) : '' },
    };
  }

  // P04–P12: 条目体系 (/subject/{id}...) + 单集 (/ep/{id}) + 全站 Wiki 上传/关联
  if (segs[0] === 'subject' && /^\d+$/.test(segs[1] || '')) {
    const subjectId = segs[1];
    const sub = segs[2] || '';
    if (!sub) return { page: 'P04', slug: 'subject', frameRole, params: { subjectId } };
    if (sub === 'ep') return { page: 'P05', slug: 'subject-ep', frameRole, params: { subjectId } };
    if (sub === 'characters') return { page: 'P07', slug: 'subject-characters', frameRole, params: { subjectId } };
    if (sub === 'persons') return { page: 'P08', slug: 'subject-persons', frameRole, params: { subjectId } };
    if (sub === 'comments') return { page: 'P09', slug: 'subject-comments', frameRole, params: { subjectId } };
    if (sub === 'reviews' || sub === 'board') {
      return { page: 'P10', slug: `subject-${sub}`, frameRole, params: { subjectId, mode: sub } };
    }
    if (sub === 'stats') return { page: 'P11', slug: 'subject-stats', frameRole, params: { subjectId } };
    if (sub.startsWith('edit') || sub === 'upload_img' || sub === 'add_related') {
      return { page: 'P12', slug: 'subject-wiki', frameRole, params: { subjectId, action: sub } };
    }
  }
  if (segs[0] === 'ep' && /^\d+$/.test(segs[1] || '')) {
    return { page: 'P06', slug: 'ep-detail', frameRole, params: { epId: segs[1] } };
  }
  if (segs[0] === 'upload_img' || segs[0] === 'add_related') {
    return { page: 'P12', slug: 'wiki-tool', frameRole, params: { action: segs[0] } };
  }
  if (segs[0] === 'subject' && segs[1] === 'topic' && /^\d+$/.test(segs[2] || '')) {
    return { page: 'P22', slug: 'subject-topic', frameRole, params: { topicId: segs[2], kind: 'subject' } };
  }

  // P15: 每日放送日历
  if (path === '/calendar') {
    return { page: 'P15', slug: 'calendar', frameRole, params: {} };
  }

  // P17: 全站搜索
  if (segs[0] === 'subject_search' || segs[0] === 'mono_search') {
    return {
      page: 'P17',
      slug: segs[0],
      frameRole,
      params: { query: segs[1] ? decodeURIComponent(segs[1]) : '', kind: segs[0] },
    };
  }

  // P13 / P14 / P16 / P23 / P26: 五大媒体频道及子路由
  if (MEDIA_CHANNELS.has(segs[0])) {
    const type = segs[0];
    const sub = segs[1] || '';
    if (!sub) return { page: 'P13', slug: `channel-${type}`, frameRole, params: { type } };
    if (sub === 'browser' || sub === 'chart') {
      return { page: 'P14', slug: `${type}-${sub}`, frameRole, params: { type, mode: sub } };
    }
    if (sub === 'tag') {
      return {
        page: 'P16',
        slug: `${type}-tag`,
        frameRole,
        params: { type, tag: segs[2] ? decodeURIComponent(segs[2]) : '' },
      };
    }
    if (sub === 'blog') {
      return { page: 'P23', slug: `${type}-blog`, frameRole, params: { type } };
    }
    if (sub === 'list' && segs[2]) {
      return {
        page: 'P26',
        slug: 'user-collection',
        frameRole,
        params: { type, uid: decodeURIComponent(segs[2]), status: segs[3] || 'collect' },
      };
    }
  }
  if (path === '/tag') {
    return { page: 'P16', slug: 'tag-home', frameRole, params: { type: 'anime', tag: '' } };
  }

  // P18 / P19: 人物频道聚合 & 角色/人物详情
  if (path === '/mono' || path === '/mono/update' || path === '/character' || path === '/person') {
    return { page: 'P18', slug: 'mono-index', frameRole, params: { kind: segs[0], sub: segs[1] || '' } };
  }
  if ((segs[0] === 'character' || segs[0] === 'person') && /^\d+$/.test(segs[1] || '')) {
    return {
      page: 'P19',
      slug: `${segs[0]}-detail`,
      frameRole,
      params: { kind: segs[0], id: segs[1], tab: segs[2] || '' },
    };
  }

  // P21 / P22: 小组与话题详情
  if (segs[0] === 'group') {
    if (segs[1] === 'topic' && /^\d+$/.test(segs[2] || '')) {
      return { page: 'P22', slug: 'group-topic', frameRole, params: { topicId: segs[2], kind: 'group' } };
    }
    return {
      page: 'P21',
      slug: 'group',
      frameRole,
      params: { name: segs[1] || 'discover', tab: segs[2] || '' },
    };
  }

  // P23: 日志广场 / 详情 / 发布
  if (segs[0] === 'blog' || (segs[0] === 'user' && segs[2] === 'blog')) {
    return {
      page: 'P23',
      slug: 'blog',
      frameRole,
      params: {
        blogId: segs[0] === 'blog' && /^\d+$/.test(segs[1] || '') ? segs[1] : '',
        uid: segs[0] === 'user' ? decodeURIComponent(segs[1]) : '',
      },
    };
  }

  // P24: 目录广场 / 详情
  if (segs[0] === 'index') {
    return {
      page: 'P24',
      slug: 'catalog',
      frameRole,
      params: { id: /^\d+$/.test(segs[1] || '') ? segs[1] : '', mode: segs[1] || 'home' },
    };
  }

  // P25: 个人/他人时光机主页
  if (segs[0] === 'user' && segs[1]) {
    return {
      page: 'P25',
      slug: 'user-profile',
      frameRole,
      params: { uid: decodeURIComponent(segs[1]), tab: segs[2] || '' },
    };
  }

  // P27: 电波提醒 + 站内短信
  if (segs[0] === 'notify' || segs[0] === 'pm') {
    return { page: 'P27', slug: segs[0], frameRole, params: { kind: segs[0], sub: segs[1] || '' } };
  }

  // P28: 个人设置 + 超合金市场
  if (segs[0] === 'settings') {
    return { page: 'P28', slug: 'settings', frameRole, params: { tab: segs[1] || 'profile' } };
  }

  // P29: 维基人 / MAGI / Dollars
  if (segs[0] === 'wiki' || segs[0] === 'magi' || segs[0] === 'dollars') {
    return { page: 'P29', slug: segs[0], frameRole, params: { mode: segs[0] } };
  }

  return { page: 'P00', slug: 'other', frameRole, params: { path } };
}

export function applyRouteAttributes(doc, route) {
  const root = doc?.documentElement;
  if (!root || !route) return;
  root.dataset.bgmPage = route.page;
  root.dataset.bgmRoute = route.slug;
  root.dataset.bgmFrame = route.frameRole;
}
