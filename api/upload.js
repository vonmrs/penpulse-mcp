/**
 * upload.js · Word/docx 文档解析
 * 将用户上传的 .docx 文件转为 Markdown 纯文本
 * Vercel Node.js Serverless Function
 */

import mammoth from 'mammoth';

// ── 解析请求体（multipart/form-data）───────────────────────────
// Vercel Node.js 支持 req.files 和 req.body
function parseFormData(req) {
  // 如果 Vercel 已自动解析 multipart（某些配置下）
  if (req.files && req.files.media) {
    const file = req.files.media;
    return { filename: file.name, buffer: file.buffer, mimetype: file.mimetype };
  }
  return null;
}

// ── base64 上传（前端传 base64 更稳定）────────────────────────
async function parseDocxFromBase64(base64Str) {
  try {
    const buffer = Buffer.from(base64Str, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value; // 纯文本
    const messages = result.messages;
    if (messages.length > 0) {
      console.warn('mammoth 警告:', messages.map(m => m.message).join('; '));
    }
    return { text, warnings: messages.map(m => m.message) };
  } catch (e) {
    throw new Error(`文档解析失败: ${e.message}`);
  }
}

// ── 简易 Markdown 化 ─────────────────────────────────────────
function toMarkdown(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const md = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { md.push(''); continue; }
    // 检测标题特征（全是短句+句号/叹号/问号，字数适中）
    if (t.length <= 30 && /[。！？.?!]$/.test(t) && !t.includes('，') && !t.includes('、')) {
      md.push(`## ${t}`);
    } else if (t.length <= 60 && /^[一二三四五六七八九十]、/.test(t)) {
      // 列表项
      md.push(`- ${t.replace(/^[一二三四五六七八九十]、/, '')}`);
    } else {
      // 普通段落
      md.push(t);
    }
  }
  return md.join('\n\n');
}

// ── 主函数 ───────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method not allowed' });
    }

    // 优先从 JSON body 取 base64
    let body = {};
    try {
      const raw = req.body;
      if (typeof raw === 'string') body = JSON.parse(raw);
      else if (Buffer.isBuffer(raw)) body = JSON.parse(raw.toString());
      else if (raw && typeof raw === 'object') body = raw;
    } catch {}

    const { file_base64, filename } = body;

    if (!file_base64) {
      return res.status(200).json({ status: 'error', message: '缺少 file_base64 参数（请将文件转为 base64 后传参）' });
    }

    // 校验文件类型（base64 头判断）
    const firstBytes = atob(file_base64.slice(0, 8));
    const isDocx = firstBytes.startsWith('PK\x03\x04'); // docx = zip format

    if (!isDocx) {
      return res.status(200).json({ status: 'error', message: '仅支持 .docx 文件（Word 2007+格式），请确认文件格式。' });
    }

    const { text, warnings } = await parseDocxFromBase64(file_base64);
    const markdown = toMarkdown(text);
    const wordCount = text.replace(/\s/g, '').length;

    return res.status(200).json({
      status: 'ok',
      markdown,
      text,          // 原始纯文本
      word_count: wordCount,
      filename: filename || '文档.docx',
      warnings: warnings.slice(0, 3),
      usage: '将返回的 markdown 字段传给 /api/format 生成 HTML，或直接传给 /api/pipeline',
    });
  } catch (e) {
    return res.status(200).json({ status: 'error', message: e.message });
  }
}
