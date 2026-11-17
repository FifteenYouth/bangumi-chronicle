import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const DOCS = path.resolve('docs');

globalThis.DOMParser = new JSDOM('').window.DOMParser;

function loadDoc(file) {
  const html = fs.readFileSync(path.join(DOCS, file), 'utf8');
  return new JSDOM(html, { url: 'https://bgm.tv/unknown' }).window.document;
}

const { parseTimelineItems, extractTimelineData } = await import('./ext-src/content/phase-b/timeline-extractor.js');
const { extractLoggedInHome, extractGuestOrAuthData } = await import('./ext-src/content/phase-b/home-extractor.js');
const { extractUserHeaderProfile, extractUserHomeData, extractUserCollectionData } = await import('./ext-src/content/phase-b/user-extractor.js');
const { extractNotifyData } = await import('./ext-src/content/phase-b/notify-extractor.js');
const { extractSubjectData } = await import('./ext-src/content/phase-c/subject-extractor.js');
const { extractSubjectEpData, extractEpDetailData, extractSubjectCharactersData, extractSubjectPersonsData, extractSubjectCommentsData } = await import('./ext-src/content/phase-c/subject-subpages-extractor.js');
const { extractChannelData, extractBrowserData, extractCalendarData, extractTagData, extractSearchData } = await import('./ext-src/content/phase-d/discovery-extractor.js');
const { extractMonoChannelData, extractMonoDetailData, extractRakuenTopiclistData, extractGroupPageData, extractTopicDetailData, extractBlogPageData, extractCatalogPageData, extractExploreWikiData } = await import('./ext-src/content/phase-e/community-extractor.js');

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push('PASS ' + name);
  } catch (err) {
    results.push('FAIL ' + name + ' :: ' + err.message);
  }
};

// 1. P03 全站时间线
check('P03 timeline global', () => {
  const doc = loadDoc('sample_timeline_global.html');
  const data = extractTimelineData(doc, { page: 'P03', params: {} });
  assert.ok(data.items.length >= 5, 'items count ' + data.items.length);
  assert.ok(data.tabs.length >= 5, 'tabs count ' + data.tabs.length);
  // 游客态样本可能不含 #SayFrom（真实站点对未登录用户隐藏吐槽框），此时 sayForm=null 属正确行为
  if (data.sayForm) assert.ok(typeof data.sayForm.formhash === 'string', 'formhash not string');
  const first = data.items[0];
  assert.ok(first.uid, 'uid missing');
  assert.ok(first.user, 'user missing');
  assert.ok(first.actionHtml.includes('<a'), 'actionHtml not html');
  assert.ok(first.category, 'category missing');
});

// 2. P03 个人时间胶囊
check('P03 user capsule', () => {
  const doc = loadDoc('sample_timeline_user_sai.html');
  const data = extractTimelineData(doc, { page: 'P03', params: { uid: 'sai' } });
  assert.equal(data.isCapsule, true);
  assert.ok(data.profile, 'profile missing');
  assert.ok(data.profile.nickname, 'nickname missing');
});

// 3. P25 个人时光机
check('P25 user home', () => {
  const doc = loadDoc('sample_user_sai.html');
  const data = extractUserHomeData(doc, { params: { uid: 'sai' } });
  assert.equal(data.profile.uid, 'sai');
  assert.ok(data.profile.nickname.length > 0, 'nickname empty');
  assert.ok(data.profile.avatar.startsWith('https://lain.bgm.tv/pic/user/l/'), 'avatar ' + data.profile.avatar);
  assert.ok(data.channels.length >= 5, 'channels ' + data.channels.length);
  const anime = data.channels.find((c) => c.key === 'anime');
  assert.ok(anime.statuses.length >= 3, 'anime statuses');
  assert.ok(anime.items.length > 0, 'anime items');
  assert.ok(data.statsByTab.all, 'statsByTab.all missing');
  assert.ok(data.statsByTab.all.metrics.length >= 5, 'metrics count');
  assert.ok(data.profile.navTabs.length >= 8, 'navTabs ' + data.profile.navTabs.length);
});

// 4. P26 收藏列表
check('P26 user collection', () => {
  const doc = loadDoc('sample_user_anime_list.html');
  const data = extractUserCollectionData(doc, { params: { uid: 'sai', type: 'anime', status: 'collect' } });
  assert.equal(data.type, 'anime');
  assert.ok(data.items.length >= 10, 'items ' + data.items.length);
  assert.ok(data.subTabs.length >= 5, 'subTabs ' + data.subTabs.length);
  const it = data.items[0];
  assert.ok(it.id, 'item id');
  assert.ok(it.title, 'item title');
  assert.ok(it.href.includes('/subject/'), 'item href ' + it.href);
  assert.ok(it.cover.startsWith('https://lain.bgm.tv/r/400/pic/cover/l/'), 'cover ' + it.cover);
});

// 5. P27 游客未登录
check('P27 guest notice', () => {
  const doc = loadDoc('sample_notify_all.html');
  const data = extractNotifyData(doc);
  assert.ok(data.guestNotice, 'guestNotice missing');
  assert.ok(data.guestNotice.title.length > 0, 'guest title');
});

// 6. P01 游客首页
check('P01 guest home', () => {
  const doc = loadDoc('sample_guest_home.html');
  const data = extractGuestOrAuthData(doc, { slug: 'guest' });
  assert.equal(data.mode, 'guest');
  assert.ok(Array.isArray(data.featured), 'featured');
});

// 7. P02 登录表单保留
check('P02 login form detection', () => {
  const doc = loadDoc('sample_auth_login.html');
  const data = extractGuestOrAuthData(doc, { slug: 'login' });
  assert.equal(data.mode, 'login');
  assert.equal(data.hasLoginForm, true, 'hasLoginForm');
  const f = doc.getElementById('loginForm');
  assert.ok(f, 'loginForm');
  assert.equal(f.getAttribute('action'), '/FollowTheRabbit');
  assert.ok(f.querySelector('input[name="formhash"]').value.length > 0, 'formhash');
  assert.ok(f.querySelector('#email'), 'email field');
  assert.ok(f.querySelector('.passkeyLoginButton'), 'passkey button');
});

// 8. 时间线 item 解析器鲁棒性（空输入）
check('parseTimelineItems tolerant', () => {
  assert.deepEqual(parseTimelineItems(null), []);
  const doc = loadDoc('sample_timeline_global.html');
  const items = parseTimelineItems(doc.getElementById('timeline'));
  assert.ok(items.length >= 5);
});

// 9. P01 已登录首页（无样本，仅断言不抛错）
check('P01 logged-in extract tolerant', () => {
  const doc = loadDoc('sample_channel_anime.html');
  const data = extractLoggedInHome(doc);
  assert.ok(Array.isArray(data.subjects));
  assert.ok(Array.isArray(data.timelineItems));
});

// 10. P01 侧翼讨论小组头像 (span.avatarNeue) 与时间线卡片分离 + 连续同用户头像继承
check('P01 side topics avatarNeue & tml_item card', () => {
  const html = `<!DOCTYPE html><html><body>
    <div id="home_grp_tpc"><div class="sidePanelHome"><ul class="sideTpcList">
      <li class="line_odd row clearit" data-item-user="labrynthoneisan">
        <a href="/group/topic/475824" class="avatar"><span title="Labrynth Oneisan" data-user="labrynthoneisan" class="avatarNeue avatarReSize32 ll" style="background-image:url('//lain.bgm.tv/pic/user/s/000/91/33/913329_roio6.jpg')"></span></a>
        <div class="inner"><a href="/group/topic/475824" class="title l">【开源自荐】KotobaSenpai：给日语 Galgame 原文加注音</a><small class="grey">(+31)</small><p class="info"><a href="/group/a" class="tip">～技术宅真可怕～</a></p></div>
      </li>
    </ul></div></div>
    <div id="home_tml"><div id="timeline"><ul>
      <li id="tml_1" class="clearit tml_item" data-item-user="u1">
        <span class="avatar"><a href="/user/u1" class="avatar"><span class="avatarNeue" style="background-image:url('//lain.bgm.tv/pic/user/l/000/72/08/720821.jpg')"></span></a></span>
        <span class="info clearit"><a href="/user/u1" class="l">User1</a> 想看 <a href="/subject/145946" class="l">魔法少女育成計画</a>
          <div class="card"><div class="container"><a href="/subject/145946"><span class="cover"><img src="//lain.bgm.tv/r/200/pic/cover/l/cc/c4/145946_Q8CBE.jpg"></span></a><div class="inner"><p class="title"><a href="/subject/145946">魔法少女育成计划</a></p><p class="info tip">12话 / 2016年10月1日</p></div></div></div>
          <div class="post_actions date">1天前 · web</div>
        </span>
      </li>
      <li id="tml_2" class="clearit tml_item" data-item-user="u1">
        <span class="info clearit"><a href="/user/u1" class="l">User1</a> 读过 <a href="/subject/282199" class="l">魔眼の匣の殺人</a>
          <div class="collectInfo"><div class="comment">非常精彩</div></div>
          <div class="card"><div class="container"><a href="/subject/282199"><span class="cover"><img src="//lain.bgm.tv/r/200/pic/cover/l/aa/bb/282199.jpg"></span></a><div class="inner"><p class="title"><a href="/subject/282199">魔眼之匣谜案</a></p></div></div></div>
          <div class="post_actions date">2天前 · mobile</div>
        </span>
      </li>
    </ul></div></div>
  </body></html>`;
  const doc = new JSDOM(html, { url: 'https://bgm.tv/' }).window.document;
  const data = extractLoggedInHome(doc);
  assert.equal(data.groupTopics.length, 1);
  assert.equal(data.groupTopics[0].avatar, 'https://lain.bgm.tv/pic/user/l/000/91/33/913329_roio6.jpg');
  assert.equal(data.groupTopics[0].meta, '～技术宅真可怕～ · (+31)');
  assert.equal(data.timelineItems.length, 2);
  assert.equal(data.timelineItems[0].actionHtml.includes('class="card"'), false);
  assert.ok(data.timelineItems[0].card);
  assert.equal(data.timelineItems[0].card.cover, 'https://lain.bgm.tv/r/400/pic/cover/l/cc/c4/145946_Q8CBE.jpg');
  assert.equal(data.timelineItems[1].avatar, 'https://lain.bgm.tv/pic/user/l/000/72/08/720821.jpg');
  assert.equal(data.timelineItems[1].quoteText, '非常精彩');
});

// 11. P25 时光机完整模块校验 (dl.side_port 好友/人物 + 小组真实图标与人数 + 时间胶囊 + 10星直方图)
check('P25 user 553488 full side_port & capsule & histogram', () => {
  const doc = loadDoc('sample_user_553488.html');
  const data = extractUserHomeData(doc, { params: { uid: '553488' } });
  assert.equal(data.profile.uid, '553488');
  assert.ok(data.joinDate.includes('加入'), 'joinDate: ' + data.joinDate);
  assert.ok(data.serviceYears.includes('服役'), 'serviceYears: ' + data.serviceYears);
  assert.ok(data.statsTabs.length >= 4, 'statsTabs: ' + data.statsTabs.length);
  assert.equal(data.statsByTab.all.chartBars.length, 10, '10-star chartBars');
  assert.ok(data.capsule.length > 0, 'capsule items');
  assert.ok(data.friends.length > 0, 'dl.side_port friends');
  assert.ok(data.mono.length > 0, 'dl.side_port mono');
  assert.ok(data.groups.length > 0, 'groups');
  assert.ok(data.groups[0].avatar.includes('/pic/icon/'), 'group real icon: ' + data.groups[0].avatar);
  assert.ok(data.groups[0].count.includes('成员'), 'group member count: ' + data.groups[0].count);
});

// 12. P27 已登录真站提醒列表 (#comment_list > div.tml_item[id^="notify_"]) 解析
check('P27 logged-in notify_item tml_item extraction', () => {
  const html = `<!DOCTYPE html><html><body>
    <div id="columnNotifyA" class="column">
      <div id="comment_list" class="comment-list">
        <div id="notify_431855" class="odd tml_item clearit notify_status_0 notify_431855" data-item-user="fy939">
          <div class="re_info"><small>2026-11-12</small></div>
          <span class="avatar"><a href="https://bgm.tv/user/fy939" class="avatar"><span class="avatarNeue avatarReSize32 ll" style="background-image:url('//lain.bgm.tv/pic/user/s/000/42/87/428777.jpg')"></span></a></span>
          <div class="inner tip">
            <strong><a href="https://bgm.tv/user/fy939" target="_blank" class="l">fy</a></strong>
            <div class="reply_content tip">在小组话题 <a href="https://bgm.tv/group/topic/474605" class="nt_link">评分梯队图</a> 中回复了你</div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
  const doc = new JSDOM(html, { url: 'https://bgm.tv/notify/all' }).window.document;
  const data = extractNotifyData(doc);
  assert.equal(data.notifications.length, 1);
  assert.equal(data.notifications[0].avatar, 'https://lain.bgm.tv/pic/user/l/000/42/87/428777.jpg');
  assert.ok(data.notifications[0].contentHtml.includes('fy'));
  assert.ok(data.notifications[0].contentHtml.includes('评分梯队图'));
});

// 13. C1 · P04 条目概览主页提取校验 (sample_subject_400602.html)
check('P04 subject 400602 full extraction', () => {
  const doc = loadDoc('sample_subject_400602.html');
  const data = extractSubjectData(doc, { params: { subjectId: '400602' } });
  assert.equal(data.id, '400602');
  assert.equal(data.titleJp, '葬送のフリーレン');
  assert.equal(data.titleCn, '葬送的芙莉莲');
  assert.equal(data.category, 'anime');
  assert.ok(data.cover.includes('/r/400/pic/cover/l/'), 'cover: ' + data.cover);
  assert.ok(data.infobox.length >= 20, 'infobox: ' + data.infobox.length);
  assert.ok(data.episodes.length >= 28, 'episodes: ' + data.episodes.length);
  assert.equal(data.episodes[0].cnTitle, '冒险结束');
  assert.ok(data.characters.length >= 10, 'characters: ' + data.characters.length);
  assert.equal(data.characters[0].nameJp, 'フリーレン');
  assert.equal(data.characters[0].nameCn, '芙莉莲');
  assert.ok(data.relations.length >= 15, 'relations: ' + data.relations.length);
  assert.ok(data.reviews.length >= 3, 'reviews: ' + data.reviews.length);
  assert.ok(data.topics.length >= 3, 'topics: ' + data.topics.length);
  assert.ok(data.comments.length >= 5, 'comments: ' + data.comments.length);
  assert.equal(data.rating.score, 8.5);
  assert.equal(data.rating.bars.length, 10);
});

// 14. D1 · P13 五大频道聚合页提取校验 (sample_channel_anime.html)
check('P13 channel anime extraction', () => {
  const doc = loadDoc('sample_channel_anime.html');
  const data = extractChannelData(doc, { params: { channel: 'anime' } });
  assert.equal(data.channel, 'anime');
  assert.ok(data.featured.length >= 10, 'featured: ' + data.featured.length);
  assert.ok(data.blogs.length >= 5, 'blogs: ' + data.blogs.length);
  assert.ok(data.topics.length >= 5, 'topics: ' + data.topics.length);
  assert.ok(data.facets.length >= 3, 'facets: ' + data.facets.length);
  assert.ok(data.tags.length >= 20, 'tags: ' + data.tags.length);
});

// 15. D1 · P14 分类浏览与排行榜提取校验 (sample_anime_browser_rank.html)
check('P14 browser rank extraction', () => {
  const doc = loadDoc('sample_anime_browser_rank.html');
  const data = extractBrowserData(doc, { params: { type: 'anime' } });
  assert.equal(data.items.length, 24);
  assert.equal(data.items[0].rank, 1);
  assert.ok(data.facetGroups.length >= 5);
  assert.ok(data.pagerLinks.length >= 5);
});

// 16. D1 · P15 每日放送日历提取校验 (sample_calendar.html)
check('P15 calendar 7-day extraction', () => {
  const doc = loadDoc('sample_calendar.html');
  const data = extractCalendarData(doc);
  assert.equal(data.days.length, 7);
  assert.ok(data.totalShows >= 100, 'totalShows: ' + data.totalShows);
});

// 17. D2 · P16 标签广场与标签详情提取校验 (sample_tag_anime.html & sample_tag_detail_anime_scifi.html)
check('P16 tag plaza & detail extraction', () => {
  const docPlaza = loadDoc('sample_tag_anime.html');
  const plaza = extractTagData(docPlaza, { params: { type: 'anime' } });
  assert.equal(plaza.mode, 'plaza');
  assert.ok(plaza.tags.length >= 50);

  const docDetail = loadDoc('sample_tag_detail_anime_scifi.html');
  const detail = extractTagData(docDetail, { params: { type: 'anime' } });
  assert.equal(detail.mode, 'detail');
  assert.equal(detail.items.length, 24);
});

// 18. D2 · P17 全站综合搜索结果提取校验 (sample_search_furiren.html)
check('P17 search results & related persons extraction', () => {
  const doc = loadDoc('sample_search_furiren.html');
  const data = extractSearchData(doc, { params: { query: '%E8%8A%99%E8%8E%89%E8%8E%B2' } });
  assert.equal(data.keyword, '芙莉莲');
  assert.ok(data.items.length >= 8);
  assert.ok(data.relatedPersons.length >= 3);
});

// 19. C2 · P05 章节列表页提取校验 (sample_subject_400602_ep.html)
check('P05 subject ep list extraction', () => {
  const doc = loadDoc('sample_subject_400602_ep.html');
  const data = extractSubjectEpData(doc, { params: { subjectId: '400602' } });
  assert.equal(data.header.id, '400602');
  assert.ok(data.episodes.length >= 28, 'episodes: ' + data.episodes.length);
  assert.equal(data.episodes[0].epId, '1227087');
  assert.equal(data.episodes[0].titleCn, '冒险结束');
});

// 20. C2 · P06 单集讨论详情页提取校验 (sample_ep_1227087.html)
check('P06 ep detail & sub-replies extraction', () => {
  const doc = loadDoc('sample_ep_1227087.html');
  const data = extractEpDetailData(doc, { params: { epId: '1227087' } });
  assert.ok(data.epTitle.includes('冒険の終わり'));
  assert.ok(data.comments.length >= 20, 'comments: ' + data.comments.length);
  assert.ok(data.sideEps.length >= 8, 'sideEps: ' + data.sideEps.length);
});

// 21. C2 · P07 角色列表页提取校验 (sample_subject_400602_characters.html)
check('P07 subject characters list extraction', () => {
  const doc = loadDoc('sample_subject_400602_characters.html');
  const data = extractSubjectCharactersData(doc, { params: { subjectId: '400602' } });
  assert.ok(data.characters.length >= 20, 'characters: ' + data.characters.length);
  assert.equal(data.characters[0].nameJp, 'フリーレン');
  assert.equal(data.characters[0].nameCn, '芙莉莲');
  assert.ok(data.characters[0].actors.length >= 2);
});

// 22. C2 · P08 制作人员页提取校验 (sample_subject_400602_persons.html)
check('P08 subject persons list extraction', () => {
  const doc = loadDoc('sample_subject_400602_persons.html');
  const data = extractSubjectPersonsData(doc, { params: { subjectId: '400602' } });
  assert.ok(data.persons.length >= 30, 'persons: ' + data.persons.length);
  assert.ok(data.persons.some((p) => p.nameCn.includes('斋藤圭一郎')));
});

// 23. C3 · P09 吐槽箱页提取校验 (sample_subject_400602_comments.html)
check('P09 subject comments box extraction', () => {
  const doc = loadDoc('sample_subject_400602_comments.html');
  const data = extractSubjectCommentsData(doc, { params: { subjectId: '400602' } });
  assert.ok(data.secTabs.length >= 5);
  assert.ok(data.comments.length >= 15, 'comments: ' + data.comments.length);
});

// 24. E1 · P18 人物频道聚合提取校验 (sample_mono_home.html)
check('P18 mono channel home extraction', () => {
  const doc = loadDoc('sample_mono_home.html');
  const data = extractMonoChannelData(doc);
  assert.ok(data.sections.length >= 3, 'sections: ' + data.sections.length);
  assert.ok(data.sideGroups.length >= 6, 'sideGroups: ' + data.sideGroups.length);
});

// 25. E1 · P19 角色详情页提取校验 (sample_crt_86246.html)
check('P19 character detail 86246 extraction', () => {
  const doc = loadDoc('sample_crt_86246.html');
  const data = extractMonoDetailData(doc, { params: { kind: 'character', monoId: '86246' } });
  assert.equal(data.id, '86246');
  assert.equal(data.nameJp, 'フリーレン');
  assert.ok(data.infobox.length >= 3, 'infobox: ' + data.infobox.length);
  assert.ok(data.works.length >= 1, 'works: ' + data.works.length);
  assert.ok(data.comments.length >= 10, 'comments: ' + data.comments.length);
});

// 26. E1 · P20 超展开话题列表提取校验 (sample_rakuen_topiclist_subject.html)
check('P20 rakuen topiclist extraction', () => {
  const doc = loadDoc('sample_rakuen_topiclist_subject.html');
  const data = extractRakuenTopiclistData(doc);
  assert.ok(data.items.length >= 20, 'items: ' + data.items.length);
});

// 27. E1 · P21/P22 小组发现与话题详情提取校验 (sample_group_discover.html & sample_group_topic.html)
check('P21/P22 group discover & topic detail extraction', () => {
  const docDisc = loadDoc('sample_group_discover.html');
  const disc = extractGroupPageData(docDisc);
  assert.ok(disc.hotGroups.length >= 3, 'hotGroups: ' + disc.hotGroups.length);
  assert.ok(disc.topics.length >= 10, 'topics: ' + disc.topics.length);

  const docTopic = loadDoc('sample_group_topic.html');
  const tpc = extractTopicDetailData(docTopic);
  assert.ok(tpc.op, 'topic OP exists');
  assert.ok(tpc.replies.length >= 5, 'replies: ' + tpc.replies.length);
});

// 28. E2 · P23 日志列表与日志详情提取校验 (sample_blog_home.html & sample_blog_detail_382948.html)
check('P23 blog list & detail extraction', () => {
  const docList = loadDoc('sample_blog_home.html');
  const listData = extractBlogPageData(docList);
  assert.equal(listData.mode, 'list');
  assert.ok(listData.blogs.length >= 5, 'blogs: ' + listData.blogs.length);

  const docDetail = loadDoc('sample_blog_detail_382948.html');
  const detData = extractBlogPageData(docDetail, { params: { blogId: '382948' } });
  assert.equal(detData.mode, 'detail');
  assert.ok(detData.contentHtml.length > 50);
});

// 29. E2 · P24 目录详情提取校验 (sample_catalog_detail_44847.html)
check('P24 catalog detail extraction', () => {
  const doc = loadDoc('sample_catalog_detail_44847.html');
  const data = extractCatalogPageData(doc, { params: { indexId: '44847' } });
  assert.equal(data.mode, 'detail');
  assert.ok(data.items.length >= 10, 'items: ' + data.items.length);
});

// 30. E2 · P29 维基人页面提取校验 (sample_explore_wiki.html)
check('P29 explore wiki extraction', () => {
  const doc = loadDoc('sample_explore_wiki.html');
  const data = extractExploreWikiData(doc);
  assert.ok(data.revisions.length >= 10, 'revisions: ' + data.revisions.length);
});

// 31. P01 收视进度标题去重 ([3/??] 不混入 title) 与 nextEp 校准 ([1100/1155] 指向下一未看话)
check('P01 prgSubjectList clean title & nextEp reconciliation', () => {
  const html = `<!DOCTYPE html><html><body>
    <ul id="prgSubjectList">
      <li subject_type="2">
        <a href="/subject/623249" subject_id="623249" class="subjectItem title"><small class="progress_percent_text">[3/??]</small> ドラゴンボール超 ビルス <span class="onAir rr"></span></a>
        <a href="/subject/ep/1004" ep_id="1004" id="prg_1004" class="prgCheckIn"><span>ep.4 看过</span></a>
      </li>
      <li subject_type="2">
        <a href="/subject/975" subject_id="975" class="subjectItem title"><small class="progress_percent_text">[1100/1155]</small> ONE PIECE <span class="onAir rr"></span></a>
        <a href="/subject/ep/2100" ep_id="2100" id="prg_2100" class="prgCheckIn"><span>ep.1100 看过</span></a>
      </li>
    </ul>
    <div id="subjectPanel_623249">
      <ul class="prg_list">
        <li><a id="prg_1001" ep_id="1001" class="load-epinfo epBtnWatched">01</a></li>
        <li><a id="prg_1002" ep_id="1002" class="load-epinfo epBtnWatched">02</a></li>
        <li><a id="prg_1003" ep_id="1003" class="load-epinfo epBtnWatched">03</a></li>
        <li><a id="prg_1004" ep_id="1004" class="load-epinfo epBtnAir">04</a></li>
      </ul>
    </div>
    <div id="subjectPanel_975">
      <ul class="prg_list">
        <li><a id="prg_2100" ep_id="2100" class="load-epinfo epBtnWatched">1100</a></li>
        <li><a id="prg_2101" ep_id="2101" class="load-epinfo epBtnAir">1101</a></li>
      </ul>
    </div>
  </body></html>`;
  const doc = new JSDOM(html, { url: 'https://bgm.tv/' }).window.document;
  const data = extractLoggedInHome(doc);
  assert.equal(data.subjects.length, 2);
  assert.equal(data.subjects[0].title, 'ドラゴンボール超 ビルス');
  assert.equal(data.subjects[0].progText, '[3/??]');
  assert.equal(data.subjects[0].nextEp.label, 'ep.4 看过');
  assert.equal(data.subjects[1].title, 'ONE PIECE');
  assert.equal(data.subjects[1].nextEp.label, 'ep.1101 看过');
});

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log('\nPHASE_B_EXTRACTOR_SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length) process.exitCode = 1;
