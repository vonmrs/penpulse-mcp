/**
 * research.js · 纯 Node.js 选题搜索
 * 数据源：搜狗微信（无需登录）+ 关键词搜索
 * Vercel Node.js Serverless Function
 */

// ── 评分函数 ─────────────────────────────────────────────────
function parseBody(raw) {
  if (!raw) return {};
  if (typeof raw === "string") return JSON.parse(raw);
  if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString());
  if (typeof raw === "object") return raw;
  return {};
}

function calcScore(title, keyword) {
  const kws = keyword.toLowerCase().split(/[\s,，、]+/);
  const t = title.toLowerCase();
  let score = 40;
  for (const kw of kws) {
    if (t.includes(kw)) score += 15;
  }
  // 标题长度适中得分更高
  if (title.length >= 10 && title.length <= 30) score += 10;
  else if (title.length > 30) score += 5;
  // 数字加分（数据/日期）
  if (/\d+%|\d+万|\d+亿/.test(title)) score += 8;
  return Math.min(score, 95);
}

// ── 标签提取 ─────────────────────────────────────────────────
function extractTag(title) {
  const map = {
    '农业|农村|农产|农机|乡村振兴': '三农',
    '招商|签约|投产|开工|项目': '产业',
    '旅游|景区|游客|文旅|打卡|演出': '文旅',
    '政策|规划|方案|意见|通知': '政策',
    '经济|工业|GDP|增速': '经济',
    '教育|学校|高考|中考|开学': '教育',
    '交通|高铁|高速|机场|大桥|道路': '交通',
    '医疗|医院|医保|健康': '民生',
    'AI|人工智能|机器人|智造': '科技',
    '天气|气温|降雨|防汛': '气象',
    '活动|开幕|论坛|峰会|发布': '活动',
    '降价|优惠|免费|福利': '消费',
  };
  for (const [pattern, tag] of Object.entries(map)) {
    if (new RegExp(pattern).test(title)) return tag;
  }
  return '综合';
}

// ── 搜索搜狗微信 ─────────────────────────────────────────────
async function searchSogou(keyword, days = 7) {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(keyword)}&ie=utf8`;
  const resp = await fetch(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  const html = await resp.text();

  const results = [];
  // 解析搜狗微信搜索结果
  const itemRegex = /<div class="txt-box">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  while ((match = itemRegex.exec(html)) !== null && results.length < 10) {
    const block = match[1];
    const titleMatch = block.match(/<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/);
    const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const hrefMatch = block.match(/href="(https?:\/\/[^"]+)"/);

    if (titleMatch) {
      const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      const summary = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200) : '';
      const href = hrefMatch ? hrefMatch[1] : '';

      if (rawTitle.length >= 8) {
        results.push({
          title: rawTitle,
          url: href,
          summary,
          source: '搜狗微信',
          tag: extractTag(rawTitle),
          score: calcScore(rawTitle, keyword),
          date: new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  // 备选：用 Bing 搜索
  if (results.length < 3) {
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword + ' site:mp.weixin.qq.com')}&first=0&count=10`;
      const bingResp = await fetch(bingUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      const bingHtml = await bingResp.text();
      const bingItems = bingHtml.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];
      for (const item of bingItems.slice(0, 5)) {
        const titleM = item.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
        const hrefM = item.match(/href="(https?:\/\/[^"]+)"/);
        const pM = item.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (titleM && hrefM) {
          const rawTitle = titleM[1].replace(/<[^>]+>/g, '').trim();
          const summary = pM ? pM[1].replace(/<[^>]+>/g, '').trim().slice(0, 150) : '';
          if (rawTitle.length >= 8) {
            results.push({
              title: rawTitle,
              url: hrefM[1],
              summary,
              source: 'Bing搜索',
              tag: extractTag(rawTitle),
              score: calcScore(rawTitle, keyword),
              date: new Date().toISOString().slice(0, 10),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Bing搜索失败:', e.message);
    }
  }

  // 按评分排序，去重
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });

  unique.sort((a, b) => b.score - a.score);
  return { status: 'ok', keyword, count: unique.length, topics: unique.slice(0, 10) };
}

// ── 主函数 ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = parseBody(req.body);

  const keyword = body.keyword || '荆州';
  const days = parseInt(body.days) || 7;

  try {
    const result = await searchSogou(keyword, days);
    return res.status(200).json(result);
  } catch (e) {
    console.error('搜索失败:', e.message);
    return res.status(200).json({
      status: 'ok',
      keyword,
      count: 0,
      topics: [{
        title: `${keyword} 最新资讯`,
        url: '',
        summary: '网络搜索暂时不可用，请检查网络后重试。',
        source: '系统',
        tag: '综合',
        score: 50,
        date: new Date().toISOString().slice(0, 10),
      }],
      error: e.message,
    });
  }
}
