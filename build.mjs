import * as esbuild from 'esbuild';
import {
  rmSync,
  mkdirSync,
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

const STATIC = [
  ['manifest.json', 'manifest.json'],
  ['ext-src/popup/popup.html', 'popup.html'],
  ['fonts', 'fonts'],
  ['assets', 'assets'],
];

const ENTRIES = [
  { in: 'ext-src/content/index.js', out: 'content.js', format: 'iife' },
  { in: 'ext-src/background.js', out: 'background.js', format: 'esm' },
  { in: 'ext-src/popup/popup.js', out: 'popup.js', format: 'iife' },
];

const BASE_CSS_ORDER = [
  'bangumi-home-preview.css',
  'prg_editorial.css',
  'prg_soft.css',
  'bangumi-wings.css',
  'brand.css',
  'topbar-account.css',
  'bangumi-subject.css',
];

const PRIORITY_PAGE_CSS = [
  'bangumi-ep.css',
  'bangumi-ep-detail.css',
];

const TAIL_CSS = ['bangumi-shell.css'];

const SHELL_SCOPED_RESET = `
/* Scoped reset ONLY for Bangumi Chronicle shell nodes (never leaks into un-hydrated #wrapperNeue) */
:where([data-bgm-shell-el="1"]),
:where([data-bgm-shell-el="1"] *),
:where([data-bgm-shell-el="1"] *::before),
:where([data-bgm-shell-el="1"] *::after) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
[data-bgm-shell-el="1"] {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink);
}
[data-bgm-shell-el="1"] a {
  color: inherit;
  text-decoration: none;
  transition: color 0.18s ease;
}
[data-bgm-shell-el="1"] button,
[data-bgm-shell-el="1"] input,
[data-bgm-shell-el="1"] select,
[data-bgm-shell-el="1"] textarea {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border: none;
  background: none;
  outline: none;
}
[data-bgm-shell-el="1"] button {
  cursor: pointer;
}
[data-bgm-shell-el="1"] ul,
[data-bgm-shell-el="1"] ol {
  list-style: none;
}
`;

function resolveCssLoadOrder() {
  const cssDir = join(root, 'css');
  const allCss = readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .sort();

  const fixedSet = new Set([...BASE_CSS_ORDER, ...PRIORITY_PAGE_CSS, ...TAIL_CSS]);
  for (const name of fixedSet) {
    if (!allCss.includes(name)) {
      throw new Error(`缺失预期的 CSS 文件: css/${name}`);
    }
  }

  const remaining = allCss.filter((name) => !fixedSet.has(name));
  const ordered = [...BASE_CSS_ORDER, ...PRIORITY_PAGE_CSS, ...remaining, ...TAIL_CSS];

  if (ordered.length !== allCss.length) {
    throw new Error(`CSS 数量不一致: expected ${allCss.length}, got ${ordered.length}`);
  }
  return ordered;
}

function inlineFontsInCss(cssText) {
  const marginScPath = join(root, 'fonts/margin-sc.css');
  let marginScCss = '';
  if (existsSync(marginScPath)) {
    marginScCss = readFileSync(marginScPath, 'utf8').replace(
      /url\((['"]?)sc\//g,
      'url($1__BGM_EXT_BASE__fonts/sc/'
    );
  }

  return cssText
    .replace(/@import\s+url\((['"]?)\.\.\/fonts\/margin-sc\.css\1\)\s*;?/g, marginScCss)
    .replace(/url\((['"]?)\.\.\/fonts\//g, 'url($1__BGM_EXT_BASE__fonts/');
}

function extractShellSliceFromHomeCss(rawHomeCss) {
  const mReset = '/* ==================== Reset & Base ==================== */';
  const mAmbient = '/* ==================== 1. Restrained Archival Ambient Canvas ==================== */';
  const mStudio = '/* ==================== 3. 三栏环抱式工作台拓扑 (.studio-shell) ==================== */';
  const mModal = '/* ==================== 9. 毛玻璃模态框 (.glass-modal-backdrop) ==================== */';
  const mEditorial = '/* 3. Editorial Chronicle Surface & Typography Refinement */';

  const iReset = rawHomeCss.indexOf(mReset);
  const iAmbient = rawHomeCss.indexOf(mAmbient);
  const iStudio = rawHomeCss.indexOf(mStudio);
  const iModal = rawHomeCss.indexOf(mModal);
  const iEditorial = rawHomeCss.indexOf(mEditorial);

  if (iReset > 0 && iAmbient > iReset && iStudio > iAmbient && iModal > iStudio && iEditorial > iModal) {
    const tokens = rawHomeCss.slice(0, iReset).trim();
    const shellMid = rawHomeCss.slice(iAmbient, iStudio).trim();
    const shellTail = rawHomeCss.slice(iModal, iEditorial).trim();
    return [tokens, SHELL_SCOPED_RESET, shellMid, shellTail].join('\n\n');
  }

  const lines = rawHomeCss.split(/\r?\n/);
  const tokens = lines.slice(0, 237).join('\n');
  const shellMid = lines.slice(295, 1702).join('\n');
  const shellTail = lines.slice(3580, 4048).join('\n');
  return [tokens, SHELL_SCOPED_RESET, shellMid, shellTail].join('\n\n');
}

async function minifyCss(text) {
  const transformed = await esbuild.transform(text, {
    loader: 'css',
    minify: !watch,
    charset: 'utf8',
    logLevel: 'warning',
  });
  if (!transformed.code) throw new Error('CSS 编译产物为空');
  return transformed.code;
}

async function buildCSS() {
  const ordered = resolveCssLoadOrder();
  const cssDir = join(root, 'css');
  const pageCssMap = {};

  for (const name of ordered) {
    const raw = inlineFontsInCss(readFileSync(join(cssDir, name), 'utf8'));
    pageCssMap[name] = await minifyCss(raw);
  }

  const homeRawOriginal = readFileSync(join(cssDir, 'bangumi-home-preview.css'), 'utf8');
  const homeShellSlice = inlineFontsInCss(extractShellSliceFromHomeCss(homeRawOriginal));
  const brandRaw = inlineFontsInCss(readFileSync(join(cssDir, 'brand.css'), 'utf8'));
  const accountRaw = inlineFontsInCss(readFileSync(join(cssDir, 'topbar-account.css'), 'utf8'));
  const shellRaw = inlineFontsInCss(readFileSync(join(cssDir, 'bangumi-shell.css'), 'utf8'));

  const shellCombined = [
    homeShellSlice,
    brandRaw,
    accountRaw,
    shellRaw,
  ].join('\n\n');

  const shellCss = await minifyCss(shellCombined);
  return {
    shellCss,
    pageCssMap,
    fileCount: ordered.length,
  };
}

function extractLgSvg() {
  // 原型页已从仓库移除，SVG 滤镜独立存放在 build-assets 中；
  // 若该资源缺失，再回退到本地 index.html（仅本机开发时存在）。
  const assetPath = join(root, 'build-assets', 'lg-filters.svg');
  if (existsSync(assetPath)) {
    return readFileSync(assetPath, 'utf8').trim();
  }

  const indexPath = join(root, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    const match = html.match(/<svg\b[^>]*>[\s\S]*?id="lg-bar"[\s\S]*?id="lg-thumb"[\s\S]*?<\/svg>/);
    if (match) return match[0];
  }

  throw new Error('未找到 build-assets/lg-filters.svg，且本地 index.html 中也没有 #lg-bar / #lg-thumb SVG 滤镜');
}

function virtualAssetsPlugin(cssBundle, lgSvg) {
  return {
    name: 'bgm-virtual-assets',
    setup(build) {
      build.onResolve({ filter: /^@bgm-css$/ }, () => ({
        path: '@bgm-css',
        namespace: 'bgm-css',
      }));
      build.onLoad({ filter: /.*/, namespace: 'bgm-css' }, () => ({
        contents: [
          `export const SHELL_CSS = ${JSON.stringify(cssBundle.shellCss)};`,
          `export const PAGE_CSS_MAP = ${JSON.stringify(cssBundle.pageCssMap)};`,
        ].join('\n'),
        loader: 'js',
      }));

      build.onResolve({ filter: /^@bgm-lg-svg$/ }, () => ({
        path: '@bgm-lg-svg',
        namespace: 'bgm-lg-svg',
      }));
      build.onLoad({ filter: /.*/, namespace: 'bgm-lg-svg' }, () => ({
        contents: `export const LG_SVG = ${JSON.stringify(lgSvg)};`,
        loader: 'js',
      }));
    },
  };
}

function copyStatic() {
  for (const [from, to] of STATIC) {
    const src = join(root, from);
    if (!existsSync(src)) continue;
    const dst = join(dist, to);
    mkdirSync(dirname(dst), { recursive: true });
    if (statSync(src).isDirectory()) cpSync(src, dst, { recursive: true });
    else cpSync(src, dst);
  }
}

function report(cssCount) {
  const walk = (dir) => {
    let n = 0;
    let bytes = 0;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) {
        const r = walk(p);
        n += r.n;
        bytes += r.bytes;
      } else {
        n++;
        bytes += s.size;
      }
    }
    return { n, bytes };
  };
  const { n, bytes } = walk(dist);
  console.log(
    `\n  Bangumi Chronicle build ok — ${cssCount} CSS compiled (shell scoped + page map), ${n} dist files, ${(bytes / 1024).toFixed(1)} KB\n`
  );
}

async function buildAll() {
  mkdirSync(dist, { recursive: true });
  copyStatic();

  const [cssBundle, lgSvg] = await Promise.all([
    buildCSS(),
    Promise.resolve(extractLgSvg()),
  ]);

  const common = {
    bundle: true,
    target: 'chrome114',
    logLevel: 'warning',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    charset: 'utf8',
    legalComments: 'none',
  };

  await Promise.all(
    ENTRIES.map((e) => {
      const opts = {
        ...common,
        entryPoints: [join(root, e.in)],
        outfile: join(dist, e.out),
        format: e.format,
      };
      if (e.out === 'content.js') opts.plugins = [virtualAssetsPlugin(cssBundle, lgSvg)];
      return esbuild.build(opts);
    })
  );

  report(cssBundle.fileCount);
}

await buildAll();

if (watch) {
  console.log('  watching ext-src, css, manifest.json …');
  const { watch: fsWatch } = await import('node:fs');
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildAll().catch((err) => console.error(err?.message || err));
    }, 140);
  };
  for (const target of ['ext-src', 'css', 'manifest.json']) {
    const full = join(root, target);
    if (existsSync(full)) {
      fsWatch(full, { recursive: statSync(full).isDirectory() }, rebuild);
    }
  }
}
