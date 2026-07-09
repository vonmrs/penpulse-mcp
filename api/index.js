/**
 * PenPulse API · Node.js 路由
 * 作为 Vercel Node.js Serverless Function，调用 Python 模块
 */

import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── CORS ─────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── 辅助：运行 Python 并获取 JSON 结果 ───────────────────────

function runPython(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [join(ROOT, scriptName), ...args], {
      cwd: ROOT,
      timeout: 60000,
    });
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', d => (stdout += d));
    py.stderr.on('data', d => (stderr += d));
    py.on('close', code => {
      if (code === 0) {
        try { resolve(JSON.parse(stdout)); }
        catch { resolve({ raw: stdout }); }
      } else {
        reject(new Error(stderr || `python exit ${code}`));
      }
    });
    py.on('error', reject);
  });
}

// ── 主入口 ───────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // GET / → 前端页面
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || req.url === '/api' || req.url === '/api/')) {
    try {
      const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch {
      return res.status(200).send('<h1>PenPulse</h1>');
    }
  }

  // POST /api → 业务逻辑
  if (req.method === 'POST') {
    let body = {};
    try { body = JSON.parse(req.body || '{}'); } catch {}

    const action = body.action || '';

    // health
    if (action === 'health') {
      return res.status(200).json({ status: 'ok', service: 'PenPulse', version: '1.0.0' });
    }

    // research
    if (action === 'research') {
      try {
        const result = await runPython('research_cli.py', [
          body.keyword || '',
          String(body.days || 7),
        ]);
        return res.status(200).json(result);
      } catch (e) {
        return res.status(200).json({ status: 'error', message: e.message });
      }
    }

    // format
    if (action === 'format') {
      try {
        const result = await runPython('format_cli.py', [
          body.markdown || '',
          body.template_id || 'journal',
        ]);
        return res.status(200).json(result);
      } catch (e) {
        return res.status(200).json({ status: 'error', message: e.message });
      }
    }

    // publish
    if (action === 'publish') {
      try {
        const result = await runPython('modules/publisher.py', [
          body.title || '',
          body.html || '',
          body.cover_url || '',
          body.account_id || 'yinshuju',
        ]);
        return res.status(200).json(result);
      } catch (e) {
        return res.status(200).json({ status: 'error', message: e.message });
      }
    }

    // pipeline
    if (action === 'pipeline') {
      try {
        const result = await runPython('pipeline.py', [
          body.keyword || '荆州 文旅',
          String(body.days || 7),
          body.template_id || 'journal',
          body.account_id || 'yinshuju',
        ]);
        return res.status(200).json(result);
      } catch (e) {
        return res.status(200).json({ status: 'error', message: e.message });
      }
    }

    // 无 action
    return res.status(200).json({
      status: 'ok',
      service: 'PenPulse AI 内容自动化',
      version: '1.0.0',
      description: '选题/写作/排版/封面/发布，全链路自动化',
      available_actions: ['health', 'research', 'format', 'publish', 'pipeline'],
    });
  }

  // 其他方法
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'method not allowed' });
}
