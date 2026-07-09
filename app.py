"""
PenPulse · ASGI版（Vercel官方支持）
"""

import json
import os

async def app(scope, receive, send):
    method = scope.get("method", "GET")
    path = scope.get("path", "/")

    cors = [
        (b"access-control-allow-origin", b"*"),
        (b"access-control-allow-methods", b"GET,POST,OPTIONS"),
        (b"access-control-allow-headers", b"Content-Type"),
        (b"content-type", b"application/json; charset=utf-8"),
    ]

    # OPTIONS
    if method == "OPTIONS":
        await send({"type": "http.response.start", "status": 200, "headers": cors})
        await send({"type": "http.response.body", "body": b""})
        return

    # GET / → HTML页面
    if method == "GET" and path in ("/", "/index.html"):
        html_path = os.path.join(os.path.dirname(__file__), "index.html")
        try:
            with open(html_path, "rb") as f:
                body = f.read()
        except Exception:
            body = b"<h1>PenPulse</h1>"
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", b"text/html; charset=utf-8"),
                (b"access-control-allow-origin", b"*"),
            ],
        })
        await send({"type": "http.response.body", "body": body})
        return

    # POST → JSON响应
    if method == "POST":
        try:
            msg = await receive()
            body_bytes = msg.get("body", b"")
        except Exception:
            body_bytes = b""
        try:
            payload = json.loads(body_bytes)
        except Exception:
            payload = {}

        action = payload.get("action", "")
        result = {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

        if action == "health":
            result = {"status": "ok", "service": "PenPulse", "version": "1.0.0"}
        elif action == "pipeline":
            result = {
                "status": "ok",
                "topic": payload.get("keyword", "荆州"),
                "message": "PenPulse pipeline running",
            }
        elif action in ("research", "format", "publish"):
            result = {"status": "ok", "action": action, "message": f"{action} ok"}
        else:
            result = {
                "status": "ok",
                "service": "PenPulse",
                "available_actions": ["health", "research", "format", "publish", "pipeline"],
            }

        body = json.dumps(result, ensure_ascii=False).encode()
        await send({"type": "http.response.start", "status": 200, "headers": cors})
        await send({"type": "http.response.body", "body": body})
        return

    # 其他
    await send({"type": "http.response.start", "status": 405, "headers": cors})
    await send({"type": "http.response.body", "body": b'{"error":"method not allowed"}'})
