let FRONTEND_HTML;
const _htmlTemplate = () => {
  if (FRONTEND_HTML) return FRONTEND_HTML;
  // Build once, cache forever
  FRONTEND_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PenPulse · 笔脉</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0d1117; color:#c9d1d9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif; min-height:100vh; }
.container { max-width:1200px; margin:0 auto; padding:20px; }
header { text-align:center; padding:30px 0 20px; }
header h1 { font-size:28px; background:linear-gradient(135deg,#58a6ff,#bc8cff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
header p { color:#8b949e; font-size:14px; margin-top:6px; }
.card { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:24px; margin-bottom:20px; }
.card h2 { font-size:16px; color:#f0f6fc; margin-bottom:16px; font-weight:600; }
.card label { display:block; font-size:13px; color:#8b949e; margin-bottom:4px; }
.card input,.card select,.card textarea { width:100%; padding:8px 12px; background:#0d1117; border:1px solid #30363d; border-radius:6px; color:#c9d1d9; font-size:14px; outline:none; transition:border-color .2s; }
.card input:focus,.card select:focus { border-color:#58a6ff; }
.card button { padding:8px 24px; background:#238636; border:none; border-radius:6px; color:#fff; font-size:14px; cursor:pointer; transition:background .2s; font-weight:500; }
.card button:hover { background:#2ea043; }
.card button:disabled { background:#1b4721; cursor:not-allowed; }
.row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
@media(max-width:640px){.row{grid-template-columns:1fr;}}
#log { background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:12px; font-size:12px; font-family:'JetBrains Mono','SF Mono','Menlo',monospace; height:200px; overflow-y:auto; line-height:1.6; margin-top:12px; }
.log-line { padding:2px 0; }
.log-ok { color:#3fb950; }
.log-error { color:#f85149; }
.log-warn { color:#d29922; }
.log-info { color:#8b949e; }
.steps { display:flex; gap:4px; margin-bottom:12px; }
.step { flex:1; padding:6px; text-align:center; font-size:11px; border-radius:6px; background:#21262d; color:#484f58; transition:all .3s; }
.step.active { background:#1f6feb33; color:#58a6ff; border:1px solid #1f6feb; }
.step.done { background:#23863633; color:#3fb950; border:1px solid #238636; }
#topics { margin-top:12px; }
.tab-bar { display:flex; gap:0; margin-bottom:20px; border-bottom:2px solid #21262d; }
.tab-btn { flex:1; padding:12px 16px; text-align:center; font-size:14px; cursor:pointer; background:transparent; border:none; color:#8b949e; font-weight:500; transition:all .2s; position:relative; }
.tab-btn:hover { color:#c9d1d9; background:#161b2211; }
.tab-btn.active { color:#f0f6fc; }
.tab-btn.active::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; background:#58a6ff; border-radius:1px; }
.tab-content { display:none; }
.tab-content.active { display:block; }
.upload-zone { border:2px dashed #30363d; border-radius:12px; padding:40px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:16px; }
.upload-zone:hover { border-color:#58a6ff; background:#161b2233; }
.upload-zone.dragover { border-color:#3fb950; background:#23863611; }
.upload-zone p { color:#8b949e; font-size:14px; margin-top:8px; }
.upload-zone .icon { font-size:36px; }
#parsePreview { white-space:pre-wrap; word-break:break-all; }
footer { text-align:center; padding:20px; color:#484f58; font-size:12px; }
footer a { color:#58a6ff; text-decoration:none; }
</style>
</head>
<body>

<div class="container">
<header>
  <h1>⚡ PenPulse · 笔脉</h1>
  <p>AI 内容自动化工作室 · 选题 → 写作 → 排版 → 封面 → 发布</p>
</header>

<div class="tab-bar">
  <button class="tab-btn active" id="tab1" onclick="switchTab(1)">🤖 链路一：AI全链路</button>
  <button class="tab-btn" id="tab2" onclick="switchTab(2)">📄 链路二：文档导入</button>
</div>

<!-- 链路一：AI全链路 -->
<div class="tab-content active" id="content1">
  <div class="card">
    <h2>🔍 第一步：选题搜索</h2>
    <div class="row">
      <div>
        <label>关键词</label>
        <input type="text" id="keyword" placeholder="例如：荆州企业融资" value="">
      </div>
      <div>
        <label>时间范围（天）</label>
        <input type="number" id="days" value="7" min="1" max="90">
      </div>
    </div>
    <div>
      <label>文章研究方向（可选）</label>
      <select id="direction">
        <option value="">智能推荐</option>
        <option value="industry">产业经济</option>
        <option value="policy">政策分析</option>
        <option value="tech">技术趋势</option>
        <option value="finance">财经解读</option>
      </select>
    </div>
    <div style="margin-top:12px">
      <label>模板风格</label>
      <select id="template_id">
        <option value="">智能推荐</option>
        <option value="editorial">001 评论头版</option>
        <option value="magazine">002 杂志封面</option>
        <option value="terminal">003 终端界面</option>
        <option value="minimal">005 极简留白</option>
        <option value="card">004 卡片瀑布</option>
        <option value="hologram">006 全息投影</option>
      </select>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="doSearch()">🔍 搜索选题</button>
      <button onclick="doPipeline(event)" style="background:#1f6feb" id="runBtn">⚡ 运行全链路</button>
    </div>
    <div id="topics"></div>
  </div>

  <div class="card">
    <h2>📋 进度</h2>
    <div class="steps">
      <div class="step" id="s1">1. 选题</div>
      <div class="step" id="s2">2. 写作</div>
      <div class="step" id="s3">3. 排版</div>
      <div class="step" id="s4">4. 封面</div>
      <div class="step" id="s5">5. 发布</div>
    </div>
    <div id="log"><div class="log-line log-info">就绪。</div></div>
  </div>
</div>

<!-- 链路二：文档导入 -->
<div class="tab-content" id="content2">
  <div class="card">
    <h2>📤 上传文档</h2>
    <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
      <div class="icon">📄</div>
      <p>点击上传或拖拽 .docx 文件</p>
      <input type="file" id="fileInput" accept=".docx" style="display:none" onchange="handleFileSelect(this)">
    </div>
    <div style="margin-bottom:12px">
      <label>文章标题（可选，留空自动从内容提取）</label>
      <input type="text" id="docTitle" placeholder="输入标题…">
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="doDocPreview()">👁️ 预览解析</button>
      <button onclick="doDocPipeline(event)" style="background:#1f6feb">⚡ 解析 → 排版 → 发布</button>
    </div>
    <div style="margin-top:12px">
      <label>解析预览</label>
      <div id="parsePreview" style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;color:#c9d1d9;max-height:150px;overflow-y:auto;line-height:1.6;"></div>
    </div>
  </div>
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
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({keyword: kw, days}),
    });
    const d = await r.json();
    const el = document.getElementById('topics');
    el.innerHTML = '';
    (d.topics || []).slice(0,5).forEach(t => {
      el.innerHTML += '<div style="padding:8px 0;border-bottom:1px solid #30363d;cursor:pointer" onclick="document.getElementById(\\'keyword\\').value=this.dataset.kw" data-kw="'+t.title+'"><div style="font-size:13px;color:#c9d1d9">'+t.title+'</div><div style="font-size:11px;color:#8b949e;margin-top:2px">'+t.source+' · '+t.tag+'</div></div>';
    });
    log('✅ 找到 '+d.count+' 条选题', 'ok');
  } catch(e) { log('❌ 搜索失败: '+e.message, 'error'); }
}

async function doPipeline(evt) {
  const btn = (evt || event).target;
  btn.disabled = true; btn.textContent = '⚡ 运行中…';
  for(let i=1;i<=5;i++) setStep(i,'');
  const kw = document.getElementById('keyword').value.trim();
  const template = document.getElementById('template_id').value;
  log('🚀 全链路启动：关键词「'+kw+'」');
  try {
    setStep(1,'active'); log('→ 选题搜索中…');
    const research = await apiCall('research', {keyword: kw});
    setStep(1,'done');
    setStep(2,'active'); log('→ AI 写作中（演示模式）…');
    const md = '# '+kw+'\\n\\n> 这是演示内容。配置大模型 API Key 后会自动调用大模型生成真实文章。\\n\\n更多内容段落。';
    setStep(2,'done');
    setStep(3,'active'); log('→ 排版中…');
    const formatted = await apiCall('format', {markdown: md, template: template || undefined});
    setStep(3,'done');
    setStep(4,'active'); log('→ 生成封面…');
    setStep(4,'done');
    setStep(5,'active'); log('→ 发布到微信公众号…');
    const pub = await apiCall('publish', {html: formatted.html, title: formatted.title || kw, coverUrl: formatted.coverUrl || ''});
    setStep(5,'done');
    log('✅ 全链路完成！文章ID: '+(pub.articleId || pub.mediaId || '演示'), 'ok');
  } catch(e) {
    log('❌ 错误: '+e.message, 'error');
    document.getElementById('runBtn').disabled = false;
    document.getElementById('runBtn').textContent = '⚡ 运行全链路';
  }
  btn.disabled = false; btn.textContent = '⚡ 运行全链路';
}

// ── Tab 切换 ─────────────────────────────────────────────────
function switchTab(n) {
  console.log('switchTab(' + n + ') called');
  try {
    const tab1 = document.getElementById('tab1');
    const tab2 = document.getElementById('tab2');
    const c1 = document.getElementById('content1');
    const c2 = document.getElementById('content2');
    if (!tab1 || !tab2 || !c1 || !c2) {
      console.error('switchTab: elements missing');
      return;
    }
    tab1.className = 'tab-btn' + (n === 1 ? ' active' : '');
    tab2.className = 'tab-btn' + (n === 2 ? ' active' : '');
    c1.style.display = n === 1 ? 'block' : 'none';
    c2.style.display = n === 2 ? 'block' : 'none';
    console.log('switchTab(' + n + ') done. c1.display:', c1.style.display, 'c2.display:', c2.style.display);
  } catch(e) {
    console.error('switchTab error:', e);
  }
}

// ── 文件选择 ─────────────────────────────────────────────────
let uploadedFileBase64 = null;

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.endsWith('.docx')) {
    alert('仅支持 .docx 文件（Word 2007+ 格式）');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedFileBase64 = e.target.result.split(',')[1]; // 去掉 data:... 前缀
    document.querySelector('#uploadZone p').textContent = '✅ '+file.name+' ('+(file.size/1024).toFixed(0)+'KB)';
  };
  reader.readAsDataURL(file);
}

async function doDocPreview() {
  if (!uploadedFileBase64) { alert('请先上传文档'); return; }
  const title = document.getElementById('docTitle').value.trim();
  try {
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({base64: uploadedFileBase64, title: title || undefined}),
    });
    const d = await r.json();
    if (d.error) { log('❌ 解析失败: '+d.error, 'error'); return; }
    // 存回全局以便 doDocPipeline 使用
    window._docMarkdown = d.markdown;
    if (!title && d.text) {
      const firstLine = d.text.split(/[\\n\\r]+/)[0].trim();
      if (firstLine.length <= 50) document.getElementById('docTitle').value = firstLine;
    }
    const preview = d.markdown.slice(0, 500);
    document.getElementById('parsePreview').textContent = preview + (d.markdown.length > 500 ? '\\n…' : '');
    log('✅ 解析成功，共 '+d.markdown.length+' 字符', 'ok');
  } catch(e) { log('❌ 解析请求失败: '+e.message, 'error'); }
}

async function doDocPipeline(evt) {
  const btn = (evt || event).target;
  const md = window._docMarkdown;
  if (!md) { alert('请先上传文档并预览解析'); return; }
  btn.disabled = true; btn.textContent = '⚡ 运行中…';
  log('🚀 文档导入链路启动…');
  try {
    setStep(1,'done');
    setStep(2,'done');
    setStep(3,'active'); log('→ 排版中…');
    const formatted = await apiCall('format', {markdown: md, template: 'terminal'});
    setStep(3,'done');
    setStep(4,'active'); log('→ 生成封面…');
    setStep(4,'done');
    setStep(5,'active'); log('→ 发布到微信公众号…');
    const pub = await apiCall('publish', {html: formatted.html, title: formatted.title || '文档导入', coverUrl: formatted.coverUrl || ''});
    setStep(5,'done');
    log('✅ 文档链路完成！文章ID: '+(pub.articleId || pub.mediaId || '演示'), 'ok');
  } catch(e) {
    log('❌ 错误: '+e.message, 'error');
  }
  btn.disabled = false; btn.textContent = '⚡ 运行全链路';
}

// ── 拖拽上传 ─────────────────────────────────────────────────
const zone = document.getElementById('uploadZone');
if (zone) {
  ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
      document.getElementById('fileInput').files = e.dataTransfer.files;
      handleFileSelect(document.getElementById('fileInput'));
    } else if (file) {
      alert('仅支持 .docx 文件');
    }
  });
}
</script>
</body>
</html>`;
  return FRONTEND_HTML;
};

const API_BASE = '';

let formatModule, researchModule, publishModule, uploadModule;

async function getModules() {
  if (!formatModule) {
    const ext = process.env.SKIP_FORMAT ? 'skip' : 'format';
    try {
      formatModule = await import('./format.js');
    } catch(e) {
      formatModule = null;
    }
  }
  if (!researchModule) {
    try {
      researchModule = await import('./research.js');
    } catch(e) {
      researchModule = null;
    }
  }
  if (!publishModule) {
    try {
      publishModule = await import('./publish.js');
    } catch(e) {
      publishModule = null;
    }
  }
  if (!uploadModule) {
    try {
      uploadModule = await import('./upload.js');
    } catch(e) {
      uploadModule = null;
    }
  }
  return { formatModule, researchModule, publishModule, uploadModule };
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  // GET / → 前端页面
  if (req.method === 'GET' && path === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(_htmlTemplate());
  }

  // POST handling
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let params;
  try { params = JSON.parse(body); } catch(e) { return res.status(400).json({ error: 'Invalid JSON' }); }

  const action = params.action || path.slice(1);
  const { formatModule, researchModule, publishModule, uploadModule } = await getModules();

  try {
    let result;
    switch (action) {
      case 'research':
        result = researchModule
          ? await researchModule.handler({ keyword: params.keyword, days: params.days })
          : { topics: [{ title: '演示选题：'+params.keyword+'相关', source: '模拟来源', tag: '演示' }], count: 1 };
        break;
      case 'format':
        result = formatModule
          ? await formatModule.handler({ markdown: params.markdown, template: params.template })
          : { html: '<article><p>'+params.markdown+'</p></article>', title: params.markdown?.slice(0,30) || '文章' };
        break;
      case 'publish':
        result = publishModule
          ? await publishModule.handler({ html: params.html, title: params.title, coverUrl: params.coverUrl })
          : { articleId: 'demo_'+Date.now() };
        break;
      case 'upload':
        result = uploadModule
          ? await uploadModule.handler({ base64: params.base64, title: params.title })
          : { error: '文档解析模块未就绪' };
        break;
      default:
        return res.status(400).json({ error: 'Unknown action: '+action });
    }
    return res.status(200).json(result);
  } catch(e) {
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}

export default handler;
