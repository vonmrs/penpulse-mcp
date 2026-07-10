/**
 * upload.js · Word/docx 文档解析（纯 Node.js 内置库版）
 * .docx = ZIP 容器（PK 头）+ deflate 压缩的 XML
 * 使用内置 zlib 解压，无需第三方依赖
 */

import zlib from 'zlib';
import { promisify } from 'util';
const gunzip = promisify(zlib.unzip);

/**
 * 从 ZIP buffer 中提取指定文件的解压内容
 * ZIP 格式：每个文件 = 本地文件头 + 压缩数据
 */
/**
 * 从 ZIP buffer 中按名称提取文件
 * 使用中央目录（更可靠）：中央目录位于 ZIP 末尾，可精确定位每个条目
 */
function extractFileFromZip(buffer, targetName) {
  const name = targetName.replace(/\\/g, '/'); // Windows path normalization

  // 1. 找中央目录结束标记 (0x06054b50)
  let cdEndOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { cdEndOffset = i; break; }
  }
  if (cdEndOffset === -1) throw new Error('无效的 ZIP 文件（找不到中央目录）');

  const cdOffset = buffer.readUInt32LE(cdEndOffset + 16);
  const cdEntries = buffer.readUInt16LE(cdEndOffset + 8);

  // 2. 遍历中央目录，找目标文件
  let offset = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);

    const entryName = buffer.slice(offset + 46, offset + 46 + nameLen).toString('utf8').replace(/\\/g, '/');

    if (entryName === name) {
      // 3. 从本地文件头读取压缩数据位置
      const lhNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const lhExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
      const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

      if (compression === 0) {
        return compressedData.toString('utf8');
      } else if (compression === 8) {
        // Python zipfile 存 raw DEFLATE，用 inflateRawSync
        return zlib.inflateRawSync(compressedData).toString('utf8');
      } else {
        throw new Error(`不支持的压缩方式: ${compression}`);
      }
    }

    offset += 46 + nameLen + extraLen + commentLen;
  }

  return null;
}

/**
 * 解析 docx base64 → 纯文本
 */
function parseDocxFromBase64(base64Str) {
  const buffer = Buffer.from(base64Str, 'base64');

  // 校验 ZIP 头
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    throw new Error('非 .docx 文件格式（需要 Word 2007+ 的 .docx）');
  }

  const xml = extractFileFromZip(buffer, 'word/document.xml');
  if (!xml) {
    throw new Error('文档结构异常：找不到 word/document.xml');
  }

  return extractTextFromXml(xml);
}

/**
 * 从 Word XML 提取段落纯文本
 */
function extractTextFromXml(xml) {
  const paras = [];
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let match;

  while ((match = paraRegex.exec(xml)) !== null) {
    const tMatches = [...match[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
    const text = tMatches.map(m => m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#xA;/g, '\n')
      .replace(/<[^>]+>/g, '')
    ).join('');
    if (text.trim()) paras.push(text.trim());
  }

  return paras.join('\n');
}

/**
 * 简易 Markdown 化
 */
function toMarkdown(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const md = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { md.push(''); continue; }

    // 标题
    if (t.length <= 40 && /[。！？.?!！?]$/.test(t) && t.length > 4) {
      md.push(`## ${t}`);
      continue;
    }

    // 列表
    if (/^[一二三四五六七八九十\d][、.．)]\s/.test(t) || /^[-–—]\s/.test(t)) {
      const item = t.replace(/^[一二三四五六七八九十\d][、.．)]\s*/, '').replace(/^[-–—]\s*/, '');
      md.push(`- ${item}`);
      continue;
    }

    md.push(t);
  }

  return md.join('\n');
}

// ── 主函数 ───────────────────────────────────────────────────
export default async function uploadHandler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method not allowed' });
    }

    let body = {};
    try {
      // 子模块调用：index.js 直接传 params，不是 HTTP 请求
      if (req && req.file_base64) {
        body = req;
      } else {
        const raw = req.body;
        if (!raw) {}
        else if (typeof raw === 'string') body = JSON.parse(raw);
        else if (Buffer.isBuffer(raw)) body = JSON.parse(raw.toString());
        else if (typeof raw === 'object') body = raw;
      }
    } catch {}

    const { file_base64, filename } = body;

    if (!file_base64) {
      return res.status(200).json({
        status: 'error',
        message: '缺少 file_base64 参数（前端 FileReader 已自动转换）',
        usage: 'POST /api/upload with { file_base64: "<base64 string>" }',
      });
    }

    const text = parseDocxFromBase64(file_base64);
    const markdown = toMarkdown(text);
    const wordCount = text.replace(/\s/g, '').length;
    const firstLine = text.split(/\r?\n/)[0].trim().slice(0, 64);

    return res.status(200).json({
      status: 'ok',
      markdown,
      text,
      word_count: wordCount,
      char_count: text.length,
      default_title: firstLine,
      filename: filename || '文档.docx',
      usage: '将 markdown 传给 /api/format → /api/publish',
    });
  } catch (e) {
    return res.status(200).json({ status: 'error', message: e.message });
  }
}

export { uploadHandler as handler };
