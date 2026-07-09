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
function extractFileFromZip(buffer, targetName) {
  let offset = 0;
  const name = targetName.replace(/\\/g, '/'); // Windows path normalization

  while (offset < buffer.length) {
    // ZIP 本地文件头签名: 0x04034b50 (little-endian: 50 4b 03 04)
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;

    const versionNeeded = buffer.readUInt16LE(offset + 4);
    const flags = buffer.readUInt16LE(offset + 6);
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);

    const nameBytes = buffer.slice(offset + 30, offset + 30 + nameLen);
    const entryName = nameBytes.toString('utf8').replace(/\\/g, '/');
    const dataStart = offset + 30 + nameLen + extraLen;

    if (entryName === name) {
      const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
      let decompressed;

      if (compression === 0) {
        // 不压缩
        decompressed = compressedData;
      } else if (compression === 8) {
        // DEFLATE
        decompressed = zlib.inflateSync(compressedData);
      } else if (compression === 9) {
        // DEFLATE64 (less common, try raw inflate)
        decompressed = zlib.inflateSync(compressedData);
      } else {
        throw new Error(`不支持的压缩方式: ${compression}`);
      }

      return decompressed.toString('utf8');
    }

    // 移动到下一个条目（对齐到偶数字节）
    offset = dataStart + compressedSize;
    if (offset % 2 !== 0) offset++;
  }

  return null; // 没找到
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
export default async function handler(req, res) {
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
      const raw = req.body;
      if (!raw) {}
      else if (typeof raw === 'string') body = JSON.parse(raw);
      else if (Buffer.isBuffer(raw)) body = JSON.parse(raw.toString());
      else if (typeof raw === 'object') body = raw;
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
