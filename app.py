"""
PenPulse API · Vercel ASGI Serverless Function
放在根目录，避免 api/ 目录被 Node.js 路由占用
"""

import json
import sys
import os

# modules 在 api/ 子目录，向上两级
_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_root, "handlers"))
sys.path.insert(0, _root)

# ── ASGI 入口（Vercel Python runtime 要求 app 变量） ──────────

async def app(scope, receive, send):
    path = scope.get("path", "")
    method = scope.get("method", "GET")

    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    hdrs = [(k.encode(), v.encode()) for k, v in cors.items()]

    # OPTIONS 预检
    if method == "OPTIONS":
        await send({"type": "http.response.start", "status": 200, "headers": hdrs})
        await send({"type": "http.response.body", "body": b""})
        return

    # 根路径返回前端页面
    if path == "/" or path == "/index.html":
        html_path = os.path.join(_root, "index.html")
        try:
            with open(html_path, "rb") as f:
                html_body = f.read()
        except Exception:
            html_body = b"<h1>index.html not found</h1>"
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": hdrs + [(b"Content-Type", b"text/html; charset=utf-8")],
        })
        await send({"type": "http.response.body", "body": html_body})
        return

    # API 请求（仅 POST）
    if method != "POST":
        await send({"type": "http.response.start", "status": 405, "headers": hdrs})
        await send({"type": "http.response.body", "body": b'{"error":"method not allowed"}'})
        return

    body = await receive()
    try:
        payload = json.loads(body.get("body", b"").decode())
    except Exception:
        payload = {}

    result = _process(payload)
    body_str = json.dumps(result, ensure_ascii=False)

    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": hdrs + [(b"Content-Type", b"application/json; charset=utf-8")],
    })
    await send({"type": "http.response.body", "body": body_str.encode()})


# ── 业务逻辑（同步函数） ──────────────────────────────────────

def _process(body):
    action = body.get("action", "")

    if action == "health":
        return {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

    elif action == "research":
        from modules.research import research
        try:
            return research(body.get("keyword", ""), int(body.get("days", 7)))
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "format":
        from modules.formatter import format_html
        try:
            return format_html(body.get("markdown", ""), body.get("template_id", "journal"))
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "publish":
        from modules.publisher import publish_draft
        try:
            return publish_draft(
                title=body.get("title", ""),
                html=body.get("html", ""),
                cover_url=body.get("cover_url", ""),
                account_id=body.get("account_id", "yinshuju"),
            )
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "pipeline":
        keyword = body.get("keyword", "荆州 文旅")
        days = int(body.get("days", 7))
        template_id = body.get("template_id", "journal")
        account_id = body.get("account_id", "yinshuju")

        try:
            from modules.research import research
            from modules.formatter import format_html
            from modules.publisher import publish_draft

            # 选题
            r1 = research(keyword, days)
            topics = r1.get("topics", [])
            if topics:
                t = topics[0]
                chosen = t["title"]
                summary = t.get("summary", "")
                source = t.get("source", "")
                tag = t.get("tag", "")
                score = t.get("score", 50)
            else:
                chosen = f"{keyword} 最新资讯"
                summary = source = tag = ""
                score = 50

            # 测试内容
            test_md = f"""# {chosen}

## 今日主题

{summary or chosen} 相关深度分析。

## 核心要点

| 指标 | 数据 |
|------|------|
| 信息来源 | {source or "网络"} |
| 分类标签 | {tag or "综合"} |
| 相关度评分 | {score}/100 |

## 详细解读

{summary or '以下为基于公开信息的整理分析。'} 以下几个趋势值得关注：

**第一，趋势在加速。** 政策支持力度持续加大，市场关注度明显提升。

**第二，结构在分化。** 头部效应开始显现，资源向优势领域集中。

**第三，机会在涌现。** 新赛道、新场景不断出现，存在弯道超车窗口期。

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
                    "tag": tag,
                    "html_length": len(r3.get("html", "")),
                    "draft_id": r4.get("draft_id", ""),
                    "preview_url": r4.get("preview_url", ""),
                    "message": r4.get("message", ""),
                }
            return r3

        except Exception as e:
            import traceback
            return {"status": "error", "message": str(e), "trace": traceback.format_exc()[-300:]}

    else:
        return {
            "status": "ok",
            "service": "PenPulse AI 内容自动化",
            "version": "1.0.0",
            "description": "选题 / 写作 / 排版 / 封面 / 发布，全链路自动化",
            "available_actions": ["health", "research", "format", "publish", "pipeline"],
            "usage": {"action": "pipeline", "keyword": "荆州 文旅", "days": 7,
                      "template_id": "journal", "account_id": "yinshuju"}
        }
