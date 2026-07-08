"""
PenPulse · 最简验证版
验证 Vercel Python runtime 能否正常调用
"""

import json
import sys
import os

# 业务模块路径
_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _root)
sys.path.insert(0, os.path.join(_root, "modules"))

# ── ASGI 入口（Vercel 强制要求 app 变量） ─────────────────────

async def app(scope, receive, send):
    method = scope.get("method", "GET")
    path = scope.get("path", "/")

    cors = [
        (b"Access-Control-Allow-Origin", b"*"),
        (b"Access-Control-Allow-Methods", b"GET,POST,OPTIONS"),
        (b"Access-Control-Allow-Headers", b"Content-Type"),
        (b"Content-Type", b"application/json; charset=utf-8"),
    ]

    # 预检
    if method == "OPTIONS":
        await send({"type": "http.response.start", "status": 200, "headers": cors})
        await send({"type": "http.response.body", "body": b""})
        return

    # 首页 → 返回欢迎信息
    if path in ("/", "/index.html"):
        body = json.dumps({
            "service": "PenPulse",
            "status": "ok",
            "message": "Vercel Python runtime 运行正常",
            "version": "1.0.0",
            "endpoints": {
                "GET /": "本欢迎信息",
                "POST /": "处理 API 请求，参数: action={health,research,format,publish,pipeline}"
            }
        }, ensure_ascii=False).encode()
        await send({"type": "http.response.start", "status": 200, "headers": cors})
        await send({"type": "http.response.body", "body": body})
        return

    # POST → 业务逻辑
    if method == "POST":
        body = await receive()
        try:
            payload = json.loads(body.get("body", b"").decode())
        except Exception:
            payload = {}
        result = _dispatch(payload)
        body_str = json.dumps(result, ensure_ascii=False).encode()
        await send({"type": "http.response.start", "status": 200, "headers": cors})
        await send({"type": "http.response.body", "body": body_str})
        return

    # 其他方法
    await send({"type": "http.response.start", "status": 405, "headers": cors})
    await send({"type": "http.response.body", "body": b'{"error":"method not allowed"}'})


def _dispatch(payload):
    """根据 action 分发请求"""
    action = payload.get("action", "")

    if action == "health":
        return {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

    if action == "research":
        try:
            from modules.research import research
            return research(payload.get("keyword", ""), int(payload.get("days", 7)))
        except Exception as e:
            return {"status": "error", "message": str(e)}

    if action == "format":
        try:
            from modules.formatter import format_html
            return format_html(payload.get("markdown", ""), payload.get("template_id", "journal"))
        except Exception as e:
            return {"status": "error", "message": str(e)}

    if action == "publish":
        try:
            from modules.publisher import publish_draft
            return publish_draft(
                title=payload.get("title", ""),
                html=payload.get("html", ""),
                cover_url=payload.get("cover_url", ""),
                account_id=payload.get("account_id", "yinshuju"),
            )
        except Exception as e:
            return {"status": "error", "message": str(e)}

    if action == "pipeline":
        keyword = payload.get("keyword", "荆州 文旅")
        days = int(payload.get("days", 7))
        template_id = payload.get("template_id", "journal")
        account_id = payload.get("account_id", "yinshuju")
        try:
            from modules.research import research
            from modules.formatter import format_html
            from modules.publisher import publish_draft

            r1 = research(keyword, days)
            topics = r1.get("topics", [])
            if topics:
                t = topics[0]
                chosen = t["title"]
                summary = t.get("summary", "")
                source = t.get("source", "")
                tag = t.get("tag", "")
            else:
                chosen = f"{keyword} 最新资讯"
                summary = source = tag = ""

            test_md = f"""# {chosen}

## 今日主题

{summary or chosen} 相关深度分析。

## 核心要点

| 指标 | 数据 |
|------|------|
| 信息来源 | {source or "网络"} |
| 分类标签 | {tag or "综合"} |

## 详细解读

{summary or '基于公开信息整理分析。'} 以下几个趋势值得关注：

**第一，趋势在加速。** 政策支持力度持续加大。

**第二，结构在分化。** 头部效应开始显现。

**第三，机会在涌现。** 新赛道不断出现。

## 结语

{keyword} 的故事才刚开始。建议持续关注，及时行动。

*本篇文章由 PenPulse AI 内容自动化工具生成*
"""
            r3 = format_html(test_md, template_id)
            if r3.get("status") == "ok":
                r4 = publish_draft(title=chosen, html=r3["html"],
                                   cover_url="", account_id=account_id)
                return {
                    "status": r4.get("status", "ok"),
                    "topic": chosen,
                    "source": source,
                    "html_length": len(r3.get("html", "")),
                    "draft_id": r4.get("draft_id", ""),
                    "preview_url": r4.get("preview_url", ""),
                    "message": r4.get("message", ""),
                }
            return r3
        except Exception as e:
            import traceback
            return {"status": "error", "message": str(e), "trace": traceback.format_exc()[-300:]}

    # 无 action → 返回帮助
    return {
        "status": "ok",
        "service": "PenPulse AI 内容自动化",
        "version": "1.0.0",
        "description": "选题/写作/排版/封面/发布，全链路自动化",
        "available_actions": ["health", "research", "format", "publish", "pipeline"],
        "usage": {"action": "pipeline", "keyword": "荆州 文旅", "days": 7,
                  "template_id": "journal", "account_id": "yinshuju"}
    }
