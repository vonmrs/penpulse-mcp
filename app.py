"""
PenPulse · WSGI 版（兼容 Vercel Python runtime）
"""

import json
import os
from io import BytesIO

# ── WSGI 入口（Vercel 强制要求 app 变量） ─────────────────────

def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET")
    path = environ.get("PATH_INFO", "/")
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json; charset=utf-8",
    }

    # OPTIONS
    if method == "OPTIONS":
        status = "200 OK"
        start_response(status, [(k, v) for k, v in headers.items()])
        return [b""]

    # GET / → HTML 页面
    if method == "GET" and path in ("/", "/index.html"):
        html_path = os.path.join(os.path.dirname(__file__), "index.html")
        try:
            with open(html_path, "rb") as f:
                body = f.read()
        except Exception:
            body = b"<h1>not found</h1>"
        start_response("200 OK", [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Access-Control-Allow-Origin", "*"),
        ])
        return [body]

    # POST → 业务逻辑
    if method == "POST":
        content_length = int(environ.get("CONTENT_LENGTH", 0))
        body_bytes = b""
        if content_length > 0:
            body_bytes = environ["wsgi.input"].read(content_length)
        try:
            payload = json.loads(body_bytes)
        except Exception:
            payload = {}

        action = payload.get("action", "")
        result = {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

        # health
        if action == "health":
            result = {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

        # pipeline（演示模式，返回固定响应）
        elif action == "pipeline":
            result = {
                "status": "ok",
                "topic": payload.get("keyword", "荆州 文旅"),
                "message": "Python WSGI 正常运行，完整 pipeline 需加载业务模块",
            }

        # research / format / publish（演示）
        elif action in ("research", "format", "publish"):
            result = {"status": "ok", "action": action, "message": f"{action} 模块运行正常"}

        else:
            result = {
                "status": "ok",
                "service": "PenPulse AI 内容自动化",
                "available_actions": ["health", "research", "format", "publish", "pipeline"],
            }

        body = json.dumps(result, ensure_ascii=False).encode()
        start_response("200 OK", [(k, v) for k, v in headers.items()])
        return [body]

    # 其他方法
    start_response("405 Method Not Allowed", list(headers.items()))
    return [b'{"error":"method not allowed"}']
