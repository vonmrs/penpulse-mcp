/**
 * format.js · 纯 Node.js Markdown → HTML（内联样式版）
 * 支持朝鉴/棱镜两套模板系统
 * Vercel Node.js Serverless Function
 */

// ── 配色方案 ─────────────────────────────────────────────────
const THEMES = {
  // 朝鉴（浅色）
  journal: {
    bg: '#ffffff', text: '#333333', primary: '#1565c0', secondary: '#42a5f5',
    accent: '#ff6f00', muted: '#f5f5f5', border: '#e0e0e0',
    headerBg: '#1565c0', headerText: '#ffffff',
    cardBg: '#f8f9fa', cardBorder: '#e3e8ef',
  },
  magazine: {
    bg: '#faf9f7', text: '#1a1a1a', primary: '#c0392b', secondary: '#e74c3c',
    accent: '#8e44ad', muted: '#f0ece7', border: '#d5cfc9',
    headerBg: '#c0392b', headerText: '#ffffff',
    cardBg: '#ffffff', cardBorder: '#d5cfc9',
  },
  cards: {
    bg: '#f4f6f9', text: '#2c3e50', primary: '#2980b9', secondary: '#3498db',
    accent: '#e67e22', muted: '#ecf0f1', border: '#d0d8e0',
    headerBg: '#2980b9', headerText: '#ffffff',
    cardBg: '#ffffff', cardBorder: '#d0d8e0',
  },
  dashboard: {
    bg: '#f0f4f8', text: '#1e3a5f', primary: '#0066cc', secondary: '#3399ff',
    accent: '#ff9500', muted: '#e8f0fa', border: '#c8d6e5',
    headerBg: '#0066cc', headerText: '#ffffff',
    cardBg: '#ffffff', cardBorder: '#c8d6e5',
  },
  minimal: {
    bg: '#ffffff', text: '#222222', primary: '#222222', secondary: '#666666',
    accent: '#888888', muted: '#fafafa', border: '#eeeeee',
    headerBg: '#ffffff', headerText: '#222222',
    cardBg: '#ffffff', cardBorder: '#eeeeee',
  },
  chat: {
    bg: '#f0f2f5', text: '#333333', primary: '#0078d4', secondary: '#005a9e',
    accent: '#00a884', muted: '#e8eef5', border: '#d0d8e0',
    headerBg: '#0078d4', headerText: '#ffffff',
    cardBg: '#ffffff', cardBorder: '#d0d8e0',
  },
  // 棱镜（深色）
  terminal: {
    bg: '#0d1117', text: '#c9d1d9', primary: '#58a6ff', secondary: '#388bfd',
    accent: '#39d353', muted: '#161b22', border: '#30363d',
    headerBg: '#161b22', headerText: '#39d353',
    cardBg: '#0d1117', cardBorder: '#30363d',
  },
  editor: {
    bg: '#1e1e1e', text: '#d4d4d4', primary: '#569cd6', secondary: '#4ec9b0',
    accent: '#ce9178', muted: '#252526', border: '#3c3c3c',
    headerBg: '#007acc', headerText: '#ffffff',
    cardBg: '#252526', cardBorder: '#3c3c3c',
  },
  neon: {
    bg: '#0a0a1a', text: '#e0e0ff', primary: '#a78bfa', secondary: '#818cf8',
    accent: '#22d3ee', muted: '#1a1a3a', border: '#4c1d95',
    headerBg: '#1a1a3a', headerText: '#a78bfa',
    cardBg: '#1a1a3a', cardBorder: '#4c1d95',
  },
  glass: {
    bg: '#0f0f23', text: '#e8eaf6', primary: '#7c3aed', secondary: '#a855f7',
    accent: '#06b6d4', muted: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)',
    headerBg: 'rgba(124,58,237,0.2)', headerText: '#e8eaf6',
    cardBg: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.1)',
  },
  geek: {
    bg: '#000000', text: '#ffffff', primary: '#ffffff', secondary: '#aaaaaa',
    accent: '#cccccc', muted: '#111111', border: '#333333',
    headerBg: '#000000', headerText: '#ffffff',
    cardBg: '#111111', cardBorder: '#333333',
  },
  hologram: {
    bg: '#050510', text: '#00ffcc', primary: '#00ffcc', secondary: '#00b4d8',
    accent: '#ff00ff', muted: '#0a0a20', border: '#00ffcc33',
    headerBg: '#0a0a20', headerText: '#00ffcc',
    cardBg: '#0a0a20', cardBorder: '#00ffcc33',
  },
};

const DEFAULT_THEME = THEMES['journal'];

// ── Markdown → HTML ──────────────────────────────────────────

function mdToHtml(md, theme) {
  const lines = md.split('\n');
  const html = [];
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let inList = false;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    // 代码块
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        const lang = line.slice(3).trim();
        html.push(`<pre style="background:${theme.muted};border:1px solid ${theme.border};border-radius:8px;padding:16px;overflow-x:auto;margin:12px 0;"><code style="color:${theme.text};font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;">`);
      } else {
        inCodeBlock = false;
        html.push('</code></pre>');
      }
      continue;
    }
    if (inCodeBlock) {
      html.push(escapeHtml(line));
      continue;
    }

    // 标题
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      const fontSize = 28 - level * 2;
      const fontWeight = level <= 2 ? '700' : '600';
      const color = level === 1 ? theme.primary : theme.text;
      const marginTop = level === 1 ? '0' : '20px';
      html.push(`<h${level} style="font-size:${fontSize}px;font-weight:${fontWeight};color:${color};margin:${marginTop} 0 12px;line-height:1.3;">${inlineFormat(text, theme)}</h${level}>`);
      continue;
    }

    // 分割线
    if (/^---+$/.test(line.trim())) {
      html.push(`<hr style="border:none;border-top:1px solid ${theme.border};margin:24px 0;">`);
      continue;
    }

    // 表格
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // 分隔行跳过
      if (/^[\|:-\s]+$/.test(line.trim()) || line.trim() === '|') {
        continue;
      }
      const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      // 渲染表格
      if (tableRows.length > 0) {
        const thead = tableRows[0];
        const tbody = tableRows.slice(1);
        let theadHtml = '';
        thead.forEach(cell => {
          theadHtml += `<th style="background:${theme.primary};color:${theme.headerText};padding:10px 14px;text-align:left;font-weight:600;border-bottom:2px solid ${theme.border};">${inlineFormat(cell, theme)}</th>`;
        });
        let tbodyHtml = '';
        tbody.forEach((row, ri) => {
          const bg = ri % 2 === 0 ? theme.bg : theme.muted;
          tbodyHtml += '<tr>';
          row.forEach(cell => {
            tbodyHtml += `<td style="background:${bg};color:${theme.text};padding:8px 14px;border-bottom:1px solid ${theme.border};">${inlineFormat(cell, theme)}</td>`;
          });
          tbodyHtml += '</tr>';
        });
        html.push(`<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border-radius:8px;overflow:hidden;border:1px solid ${theme.border};"><thead><tr>${theadHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table>`);
      }
      inTable = false;
      tableRows = [];
    }

    // 无序列表
    if (/^[-*]\s/.test(line)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    } else if (inList) {
      const itemsHtml = listItems.map(item => `<li style="margin:6px 0 6px 20px;color:${theme.text};line-height:1.7;">${inlineFormat(item, theme)}</li>`).join('');
      html.push(`<ul style="margin:12px 0;padding:0;list-style:none;">${itemsHtml}</ul>`);
      inList = false;
      listItems = [];
    }

    // 引用
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s?/, '');
      html.push(`<blockquote style="border-left:4px solid ${theme.primary};margin:16px 0;padding:12px 16px;background:${theme.muted};border-radius:0 8px 8px 0;color:${theme.secondary};font-style:italic;line-height:1.7;">${inlineFormat(quoteText, theme)}</blockquote>`);
      continue;
    }

    // 空行
    if (!line.trim()) {
      continue;
    }

    // 普通段落
    html.push(`<p style="color:${theme.text};line-height:1.8;margin:12px 0;font-size:15px;">${inlineFormat(line, theme)}</p>`);
  }

  return html.join('\n');
}

function inlineFormat(text, theme) {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${theme.primary};font-weight:700;">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="font-style:italic;">$1</em>`)
    .replace(/`(.+?)`/g, `<code style="background:${theme.muted};color:${theme.accent};padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.9em;">$1</code>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="color:${theme.secondary};text-decoration:underline;" target="_blank">$1</a>`);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── HTML 合成（顶部名片+正文+底部关注） ───────────────────────

function buildFullHtml(md, templateId, theme, options = {}) {
  const {
    accountName = '银枢局',
    accountId = 'gh_xxxx',
    description = '洞察趋势，把握先机',
  } = options;

  const isDark = ['terminal','editor','neon','glass','geek','hologram'].includes(templateId);
  const bodyBg = isDark ? '#0d1117' : '#f5f5f5';

  // 顶部名片（棱镜用终端风格，朝鉴用简约风格）
  let topCard = '';
  if (isDark) {
    topCard = `
<div style="background:#0d1117;padding:24px;margin-bottom:20px;border-radius:12px;border:1px solid #30363d;font-family:'JetBrains Mono','Fira Code',monospace;font-size:14px;line-height:1.8;">
  <div style="color:#39d353;margin-bottom:4px;">$ <span style="color:#c9d1d9;">whoami</span></div>
  <div style="color:#58a6ff;">${accountName}</div>
  <div style="color:#8b949e;margin-top:4px;"># ${description}</div>
  <div style="color:#39d353;margin-top:12px;">$ <span style="color:#c9d1d9;">echo $ACCOUNT_ID</span></div>
  <div style="color:#a371f7;">${accountId}</div>
</div>`;
  } else {
    topCard = `
<div style="background:linear-gradient(135deg,${theme.primary},${theme.secondary});padding:20px 24px;border-radius:12px;margin-bottom:20px;">
  <div style="color:white;font-size:16px;font-weight:700;">${accountName}</div>
  <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${description}</div>
</div>`;
  }

  // 底部关注
  const bottomCard = `
<div style="margin-top:32px;padding:24px;background:${theme.muted};border-radius:12px;text-align:center;border:1px solid ${theme.border};">
  <p style="color:${theme.text};font-size:15px;margin:0 0 12px;">长按识别下方二维码，关注<span style="font-weight:700;color:${theme.primary};">${accountName}</span></p>
  <div style="color:#8b949e;font-size:12px;margin-top:12px;">点击「在看」或「转发」，是对创作者最大的支持</div>
</div>`;

  // 免责（朝鉴）
  if (!isDark) {
    bottomCard += `
<div style="margin-top:16px;text-align:center;color:#999;font-size:11px;">
  本文内容由 AI 辅助生成，仅供参考。不构成任何投资建议。
</div>`;
  }

  // 内容 HTML
  const contentHtml = mdToHtml(md, theme);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${accountName}</title>
</head>
<body style="margin:0;padding:0;background:${bodyBg};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
<div style="max-width:750px;margin:0 auto;padding:16px 16px 32px;">
  ${topCard}
  ${contentHtml}
  ${bottomCard}
</div>
</body>
</html>`;
}

// ── 主函数 ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = {};
  try { body = JSON.parse(req.body || '{}'); } catch {}

  const markdown = body.markdown || body.content || '# 标题\n\n正文内容';
  const templateId = body.template_id || 'journal';
  const theme = THEMES[templateId] || DEFAULT_THEME;

  const html = buildFullHtml(markdown, templateId, theme, {
    accountName: body.account_name || '银枢局',
    accountId: body.account_id || 'gh_xxxx',
    description: body.description || '洞察趋势，把握先机',
  });

  return res.status(200).json({
    status: 'ok',
    html,
    html_length: html.length,
    template_id: templateId,
    theme: Object.keys(THEMES).includes(templateId) ? 'custom' : 'journal (default)',
  });
}
