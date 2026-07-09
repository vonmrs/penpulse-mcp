"""
PenPulse · 极简调试版
只返回固定JSON，验证Vercel Python函数是否正常运行
"""

import json
import os

# ── ASGI 入口 ────────────────────────────────────────────────

async def app(scope, receive, send):
    method = scope.get("method", "GET")
    path = scope.get("path", "/")

    headers = [
        (b"access-control-allow-origin", b"*"),
        (b"access-control-allow-methods", b"GET,POST,OPTIONS"),
        (b"access-control-allow-headers", b"Content-Type"),
        (b"content-type", b"application/json; charset=utf-8"),
    ]

    if method == "OPTIONS":
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": b""})
        return

    # GET / → 前端页面
    if method == "GET" and path in ("/", "/index.html"):
        html_path = os.path.join(os.path.dirname(__file__), "index.html")
        try:
            with open(html_path, "rb") as f:
                html_body = f.read()
        except Exception:
            html_body = b"<h1>not found</h1>"
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", b"text/html; charset=utf-8"),
                (b"access-control-allow-origin", b"*"),
            ],
        })
        await send({"type": "http.response.body", "body": html_body})
        return

    # POST → 返回固定JSON（不走任何模块导入）
    if method == "POST":
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": b'{"status":"ok","message":"Python函数正常运行中","step":"dispatch"}'})
        return

    # 其他
    await send({"type": "http.response.start", "status": 405, "headers": headers})
    await send({"type": "http.response.body", "body": b'{"error":"method not allowed"}'})
