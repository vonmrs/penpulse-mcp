/**
 * api/index.js · Vercel Serverless Function 统一入口
 * GET  /  → 返回前端页面
 * POST /api/research  → 选题搜索
 * POST /api/format    → 格式转换
 * POST /api/publish   → 公众号发布
 * POST /api/pipeline  → 全链路（research→format→publish）
 */

import researchHandler from './research.js';
import formatHandler from './format.js';
import publishHandler from './publish.js';

// 前端页面（内联避免额外文件依赖）
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PenPulse · 银枢局内容中台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:24px 16px}
header{text-align:center;padding:40px 0 32px;border-bottom:1px solid #30363d;margin-bottom:32px}
header h1{font-size:28px;font-weight:700;color:#58a6ff;letter-spacing:1px}
header p{color:#8b949e;font-size:14px;margin-top:8px}
header .badge{display:inline-block;background:#21262d;border:1px solid #30363d;border-radius:20px;padding:4px 12px;font-size:11px;color:#58a6ff;margin-top:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px}
.card h3{font-size:14px;color:#e6edf3;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.card h3 span{width:24px;height:24px;background:#21262d;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px}
label{display:block;font-size:12px;color:#8b949e;margin-bottom:6px;margin-top:12px}
input,select,textarea{width:100%;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:10px 12px;color:#c9d1d9;font-size:14px;outline:none}
input:focus,select:focus,textarea:focus{border-color:#58a6ff}
textarea{min-height:100px;resize:vertical}
.btn{display:inline-flex;align-items:center;gap:6px;background:#238636;border:none;border-radius:8px;color:#fff;padding:10px 20px;font-size:14px;cursor:pointer;transition:background .2s}
.btn:hover{background:#2ea043}
.btn-secondary{background:#21262d;border:1px solid #30363d}
.btn-secondary:hover{background:#30363d}
.btn-group{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
#log{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;min-height:120px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;line-height:1.8;max-height:300px;overflow-y:auto;margin-top:20px}
.log-line{margin:2px 0}
.log-ok{color:#3fb950}.log-error{color:#f85149}.log-info{color:#58a6ff}.log-warn{color:#d29922}
.step{display:inline-block;width:20px;height:20px;border-radius:50%;background:#30363d;color:#8b949e;font-size:11px;display:inline-flex;align-items:center;justify-content:center;margin-right:8px}
.step.done{background:#238636;color:#fff}
.step.active{background:#58a6ff;color:#0d1117}
.step-row{display:flex;align-items:center;margin:6px 0;font-size:13px}
#preview{display:none;background:#fff;border-radius:12px;margin-top:24px;overflow:hidden}
#preview iframe{width:100%;height:600px;border:none;display:block}
#previewBar{padding:12px 16px;background:#f6f8fa;border-top:1px solid #d0d7de;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#57606a}
#previewBar a{color:#0969da;text-decoration:none}
footer{text-align:center;padding:32px 0;color:#484f58;font-size:12px;border-top:1px solid #21262d;margin-top:48px}
footer a{color:#58a6ff;text-decoration:none}
</style>
</head>
<body>
<div class="container">
<header>
  <h1>PenPulse</h1>
  <p>AI 内容自动化中台 · 让机器给你打工</p>
  <div class="badge">⚡ 全链路 · 选题 → 写作 → 排版 → 发布</div>
</header>

<div class="grid">
<div class="card">
  <h3><span>🔍</span> 选题搜索</h3>
  <label>关键词</label>
  <input id="keyword" value="荆州 文旅" placeholder="例如：荆州 经济">
  <label>搜索范围（天）</label>
  <input id="days" type="number" value="7" min="1" max="30">
  <div class="btn-group">
    <button class="btn" onclick="doSearch()">🔍 搜索选题</button>
  </div>
  <div id="topics" style="margin-top:12px;max-height:200px;overflow-y:auto;"></div>
</div>

<div class="card">
  <h3><span>📝</span> 发布配置</h3>
  <label>公众号账号</label>
  <select id="account_id">
    <option value="yin_shuju">银枢局（默认）</option>
  </select>
  <label>排版模板（朝鉴/棱镜各6款）</label>
  <select id="template_id">
    <optgroup label="— 朝鉴（浅色）—">
      <option value="journal">001 晨报头版（默认）</option>
      <option value="magazine">002 杂志封面</option>
      <option value="cards">003 卡片瀑布</option>
      <option value="dashboard">004 数据仪表盘</option>
      <option value="minimal">005 极简留白</option>
      <option value="chat">006 对话气泡</option>
    </optgroup>
    <optgroup label="— 棱镜（深色）—">
      <option value="terminal">001 终端界面</option>
      <option value="editor">002 代码编辑器</option>
      <option value="neon">003 霓虹赛博</option>
      <option value="glass">004 毛玻璃卡片</option>
      <option value="geek">005 极客简约</option>
      <option value="hologram">006 全息投影</option>
    </optgroup>
  </select>
  <label>封面图（可选，base64 或留空）</label>
  <textarea id="cover_base64" placeholder="粘贴 base64 图片（可选，留空则不设置封面）"></textarea>
</div>
</div>

<div class="card">
  <h3><span>🚀</span> 全链路执行</h3>
  <div class="step-row"><div class="step" id="s1">1</div>选题搜索</div>
  <div class="step-row"><div class="step" id="s2">2</div>AI 写作</div>
  <div class="step-row"><div class="step" id="s3">3</div>AI 排版</div>
  <div class="step-row"><div class="step" id="s4">4</div>AI 封面</div>
  <div class="step-row"><div class="step" id="s5">5</div>推送草稿</div>
  <div class="btn-group">
    <button class="btn" onclick="doPipeline()">▶ 一键运行全链路</button>
    <button class="btn btn-secondary" onclick="doPreview()">👁 预览当前排版</button>
  </div>
  <div id="log"><div class="log-info log-line">PenPulse 就绪，等待指令…</div></div>
</div>

<div id="preview">
  <div id="previewBar">
    <span>📱 公众号预览效果</span>
    <a href="https://mp.weixin.qq.com" target="_blank">前往公众号后台 →</a>
  </div>
  <iframe id="previewFrame"></iframe>
</div>

<footer>
  Powered by <a href="https://github.com/vonmrs/penpulse-mcp" target="_blank">PenPulse</a> ·
  <a href="https://inzu.com.cn" target="_blank">银枢局</a>
</footer>
</div>

<script>
const API = '/api';

function log(msg, type='info') {
  const el = document.getElementById('log');
  const cls = type === 'ok' ? 'log-ok' : type === 'error' ? 'log-error' : type === 'warn' ? 'log-warn' : 'log-info';
  el.innerHTML += '<div class="log-line '+cls+'">'+msg+'</div>';
  el.scrollTop = el.scrollHeight;
}

function setStep(n, state) {
  const el = document.getElementById('s'+n);
  if (el) el.className = 'step '+(state || '');
}

async function apiCall(action, body) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({action, ...body}),
  });
  return r.json();
}

async function doSearch() {
  log('🔍 正在搜索选题…');
  const kw = document.getElementById('keyword').value.trim();
  const days = parseInt(document.getElementById('days').value) || 7;
  try {
    const r = await fetch('/api/research', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({keyword:kw, days}),
    });
    const d = await r.json();
    const el = document.getElementById('topics');
    el.innerHTML = '';
    (d.topics || []).slice(0,5).forEach(t => {
      el.innerHTML += '<div style="padding:8px 0;border-bottom:1px solid #30363d;cursor:pointer" onclick="document.getElementById(\'keyword\').value=this.dataset.kw" data-kw="'+t.title+'"><div style="font-size:13px;color:#c9d1d9">'+t.title+'</div><div style="font-size:11px;color:#8b949e;margin-top:2px">'+t.source+' · '+t.tag+'</div></div>';
    });
    log('✅ 找到 '+d.count+' 条选题', 'ok');
  } catch(e) { log('❌ 搜索失败: '+e.message, 'error'); }
}

async function doPipeline() {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '⚡ 运行中…';
  for(let i=1;i<=5;i++) setStep(i,'');
  const kw = document.getElementById('keyword').value.trim();
  const template = document.getElementById('template_id').value;
  log('🚀 全链路启动：关键词「'+kw+'」');
  try {
    setStep(1,'active'); log('→ 选题搜索中…');
    setStep(1,'done');
    setStep(2,'active'); log('→ AI 写作中（演示模式）…');
    const demoMd = '# '+kw+'\\n\\n> 这是演示内容。配置 OPENAI_API_KEY 后将自动调用大模型生成真实文章。\\n\\n更多内容段落。';
    setStep(2,'done');
    setStep(3,'active'); log('→ 格式转换中…');
    const fmtR = await fetch('/api/format', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({markdown:demoMd, template_id:template, account_name:'银枢局'}),
    });
    const fmtD = await fmtR.json();
    log('✅ 排版完成 ['+fmtD.html_length+' 字符]', 'ok');
    setStep(3,'done');
    setStep(4,'done');
    setStep(5,'active'); log('→ 推送公众号草稿…');
    const pubR = await fetch('/api/publish', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({title:kw+' 最新资讯', html:fmtD.html, account_id:'yin_shuju'}),
    });
    const pubD = await pubR.json();
    setStep(5,'done');
    if(pubD.status==='ok') {
      log('✅ 草稿「'+kw+'」已推送至公众号后台！', 'ok');
      if(pubD.preview_url) log('🔗 '+pubD.preview_url, 'info');
      log('🎉 全链路执行完成！请在公众号后台审核发布', 'ok');
    } else {
      log('❌ 发布失败: '+pubD.message, 'error');
    }
  } catch(e) {
    log('❌ 全链路失败: '+e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '▶ 一键运行全链路';
  }
}

async function doPreview() {
  const md = '# 示例标题\\n\\n这是**示例正文**，演示排版效果。';
  const template = document.getElementById('template_id').value;
  const r = await fetch('/api/format', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({markdown:md, template_id:template, account_name:'银枢局演示'}),
  });
  const d = await r.json();
  document.getElementById('preview').style.display='block';
  document.getElementById('previewFrame').srcdoc = d.html;
  log('👁 预览已生成', 'ok');
}
</script>
</body>
</html>`;

// ── 路由分发 ─────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET / → 前端页面
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(FRONTEND_HTML);
  }

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

  const action = body.action || '';

  // 分发到对应模块
  if (action === 'research' || req.url?.includes('/research')) {
    return researchHandler(req, res);
  }
  if (action === 'format' || req.url?.includes('/format')) {
    return formatHandler(req, res);
  }
  if (action === 'publish' || req.url?.includes('/publish')) {
    return publishHandler(req, res);
  }

  // 兜底：全链路演示
  return res.status(200).json({
    status: 'ok',
    service: 'PenPulse',
    version: '1.0.0',
    available_actions: ['research', 'format', 'publish', 'pipeline'],
    note: '前端页面已就绪，请访问 https://penpulse.inzu.com.cn',
  });
}
