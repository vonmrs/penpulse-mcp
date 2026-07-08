"""
PenPulse API · Vercel ASGI Serverless Function
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

# ── ASGI app 必须的三个顶层函数 ────────────────────────────

async def app(scope, receive, send):
    """ASGI 应用入口，Vercel 会调用这个"""
    path = scope.get("path", "")
    method = scope.get("method", "GET")

    # CORS
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

    # OPTIONS 预检
    if method == "OPTIONS":
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(k.encode(), v.encode()) for k, v in cors_headers.items()],
        })
        await send({"type": "http.response.body", "body": b""})
        return

    # 只接受 POST
    if method != "POST":
        await send({
            "type": "http.response.start",
            "status": 405,
            "headers": [(k.encode(), v.encode()) for k, v in cors_headers.items()],
        })
        await send({"type": "http.response.body", "body": b'{"error":"method not allowed"}'})
        return

    # 读取 body
    body = await receive()
    raw = body.get("body", b"")
    try:
        payload = json.loads(raw.decode())
    except Exception:
        payload = {}

    action = payload.get("action", "")

    # ── 处理各 action ─────────────────────────────────────
    result = process_action(action, payload)

    body_str = json.dumps(result, ensure_ascii=False)
    response_headers = [
        *[(k.encode(), v.encode()) for k, v in cors_headers.items()],
        (b"Content-Type", b"application/json; charset=utf-8"),
    ]

    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": response_headers,
    })
    await send({"type": "http.response.body", "body": body_str.encode()})


# ── 业务逻辑（保持不动）────────────────────────────────────

def process_action(action, body):
    """处理各 action，返回 dict"""

    if action == "health":
        return {"status": "ok", "service": "PenPulse", "version": "1.0.0"}

    elif action == "research":
        from modules.research import research
        keyword = body.get("keyword", "")
        days = int(body.get("days", 7))
        try:
            return research(keyword, days)
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "format":
        from modules.formatter import format_html
        md = body.get("markdown", "")
        template_id = body.get("template_id", "journal")
        try:
            return format_html(md, template_id)
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

            # Step 1: 选题
            r1 = research(keyword, days)
            topics = r1.get("topics", [])
            if topics:
                topic = topics[0]
                chosen = topic["title"]
                summary = topic.get("summary", "")
                source = topic.get("source", "")
                tag = topic.get("tag", "")
                score = topic.get("score", 50)
            else:
                chosen = f"{keyword} 最新资讯"
                summary, source, tag, score = "", "", "综合", 50

            # Step 2: 测试内容（真实 AI 写作需配 API Key）
            test_md = f"""# {chosen}

## 今日主题

{summary or chosen} 相关深度分析。

## 核心要点

| 指标 | 数据 |
|------|------|
| 信息来源 | {source or "网络"} |
| 分类标签 | {tag} |
| 相关度评分 | {score}/100 |

## 详细解读

{summary or '以下为基于公开信息的整理分析。'} 以下几个趋势值得关注：

**第一，趋势在加速。** 政策支持力度持续加大，市场关注度明显提升。

**第二，结构在分化。** 头部效应开始显现，资源向优势领域集中。

**第三，机会在涌现。** 新赛道、新场景不断出现，存在弯道超车窗口期。

## 结语

{keyword} 的故事才刚开始。建议持续关注，及时行动。

*本篇文章由 PenPulse AI 内容自动化工具生成 · {source}*
"""
            # Step 3: 排版
            r3 = format_html(test_md, template_id)

            # Step 4: 发布
            if r3.get("status") == "ok":
                r4 = publish_draft(
                    title=chosen,
                    html=r3["html"],
                    cover_url="",
                    account_id=account_id,
                )
                return {
                    "status": r4.get("status", "ok"),
                    "topic": chosen,
                    "source": source,
                    "tag": tag,
                    "score": score,
                    "html_length": len(r3.get("html", "")),
                    "draft_id": r4.get("draft_id", ""),
                    "preview_url": r4.get("preview_url", ""),
                    "message": r4.get("message", ""),
                }
            else:
                return r3

        except Exception as e:
            import traceback
            return {
                "status": "error",
                "message": str(e),
                "trace": traceback.format_exc()[-300:]
            }

    else:
        return {
            "status": "ok",
            "service": "PenPulse AI 内容自动化",
            "version": "1.0.0",
            "description": "选题 / 写作 / 排版 / 封面 / 发布，全链路自动化",
            "available_actions": ["health", "research", "format", "publish", "pipeline"],
            "usage": {
                "action": "pipeline",
                "keyword": "荆州 文旅",
                "days": 7,
                "template_id": "journal",
                "account_id": "yinshuju"
            }
        }
