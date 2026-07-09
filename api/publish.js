/**
 * publish.js · 纯 Node.js 公众号发布
 * 三个步骤：获取 access_token → 上传封面图 → 创建草稿
 * Vercel Node.js Serverless Function
 */

const crypto = require('crypto');

// ── 微信公众号 API ───────────────────────────────────────────
const WX_API = 'https://api.weixin.qq.com';

// 从环境变量读取凭证
function getConfig() {
  return {
    appid: process.env.WX_APPID || 'wxd8073373e3a6103c',
    appsecret: process.env.WX_APPSECRET || 'f5248f193fb71f80a62de83482243fd5',
    // 可以通过 JSON.stringify 传入多账号配置
    accounts: process.env.WX_ACCOUNTS ? JSON.parse(process.env.WX_ACCOUNTS) : null,
  };
}

// ── Step 1: 获取 access_token ────────────────────────────────
async function getAccessToken(account) {
  const { appid, appsecret } = account;
  const url = `${WX_API}/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`;
  const resp = await fetch(url, { timeout: 10000 });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`获取token失败: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Step 2: 上传封面图（永久素材接口）────────────────────────
async function uploadCoverImage(accessToken, coverBase64) {
  if (!coverBase64 || coverBase64.length < 100) {
    return { url: '', thumb_url: '' }; // 无封面，跳过
  }

  // 将 base64 转为 Buffer
  const imageBuffer = Buffer.from(coverBase64, 'base64');

  // 创建 multipart/form-data
  const boundary = '----FormBoundary' + crypto.randomBytes(8).toString('hex');
  const filename = 'cover_' + Date.now() + '.png';

  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`,
    imageBuffer,
    `\r\n--${boundary}--\r\n`,
  ];

  // 分离二进制和文本部分
  const pre = Buffer.from(bodyParts[0], 'utf-8');
  const post = Buffer.from(bodyParts[2], 'utf-8');
  const body = Buffer.concat([pre, imageBuffer, post]);

  const uploadUrl = `${WX_API}/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
    timeout: 15000,
  });

  const data = await resp.json();
  if (data.url || data.media_id) {
    return { url: data.url || '', media_id: data.media_id || '' };
  }
  return { url: '', media_id: '' };
}

// ── Step 3: 创建草稿 ─────────────────────────────────────────
async function createDraft(accessToken, title, html, author, thumbMediaId, contentSourceUrl) {
  const apiUrl = `${WX_API}/cgi-bin/draft/add?access_token=${accessToken}`;

  const payload = {
    articles: [
      {
        title,
        author: author || 'PenPulse',
        digest: title,
        content: html,
        content_source_url: contentSourceUrl || '',
        thumb_media_id: thumbMediaId || '',
        need_open_comment: 1,
        only_fans_can_comment: 0,
      },
    ],
  };

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 15000,
  });

  const data = await resp.json();
  if (data.media_id) {
    return { media_id: data.media_id, preview_url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&lang=zh_CN&token=${accessToken}` };
  }
  throw new Error(`创建草稿失败: ${JSON.stringify(data)}`);
}

// ── 主函数 ───────────────────────────────────────────────────
function parseBody(raw) { if (!raw) return {}; if (typeof raw === "string") return JSON.parse(raw); if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString()); if (typeof raw === "object") return raw; return {}; }

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method not allowed' });
    }

    const body = parseBody(req.body);
    const title = body.title;
    const html = body.html;
    const cover_base64 = body.cover_base64;
    const account_id = body.account_id;

    if (!title || !html) {
      return res.status(200).json({ status: 'error', message: '缺少 title 或 html 参数' });
    }

    const config = getConfig();
    const account = config.accounts
      ? config.accounts.find(a => a.id === account_id) || config.accounts[0]
      : { appid: config.appid, appsecret: config.appsecret, id: 'default', name: '默认账号' };

    // Step 1: 获取 token
    const accessToken = await getAccessToken(account);

    // Step 2: 上传封面（可选）
    let coverResult = { url: '', media_id: '' };
    if (cover_base64) {
      try {
        coverResult = await uploadCoverImage(accessToken, cover_base64);
      } catch (e) {
        console.warn('封面上传失败（继续发布）:', e.message);
      }
    }

    // Step 3: 创建草稿
    const draft = await createDraft(
      accessToken,
      title,
      html,
      body.author || 'PenPulse AI',
      coverResult.media_id,
      body.content_source_url || '',
    );

    const previewUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&lang=zh_CN&token=${accessToken}&vid=${draft.media_id}`;

    return res.status(200).json({
      status: 'ok',
      media_id: draft.media_id,
      preview_url: previewUrl,
      cover_url: coverResult.url,
      message: `草稿「${title}」已推送至${account.name || '公众号'}后台`,
    });
  } catch (e) {
    console.error('发布失败:', e.message);
    return res.status(200).json({ status: 'error', message: e.message });
  }
}
