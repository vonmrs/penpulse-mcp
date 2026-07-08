"""
PenPulse API · Vercel Serverless Function
处理内容创作请求
"""

import json
import os
import sys

# 注入 modules 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

def handler(request):
    """Vercel serverless function handler"""
    
    if request.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": ""
        }

    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}

    action = body.get("action", "")
    result = {"status": "ok", "message": "PenPulse API is running. Documentation: /api/health"}

    if action == "health":
        result = {"status": "ok", "version": "1.0.0", "service": "PenPulse MCP"}

    elif action == "research":
        keyword = body.get("keyword", "")
        days = body.get("days", 7)
        try:
            from modules.research import research
            result = research(keyword, days)
        except Exception as e:
            result = {"status": "error", "message": str(e)}

    elif action == "format":
        md = body.get("markdown", "")
        template_id = body.get("template_id", "journal")
        try:
            from modules.formatter import format_html
            result = format_html(md, template_id)
        except Exception as e:
            result = {"status": "error", "message": str(e)}

    elif action == "publish":
        title = body.get("title", "")
        html = body.get("html", "")
        cover_url = body.get("cover_url", "")
        account_id = body.get("account_id", "yinshuju")
        try:
            from modules.publisher import publish_draft
            result = publish_draft(title, html, cover_url, account_id)
        except Exception as e:
            result = {"status": "error", "message": str(e)}

    elif action == "pipeline":
        # 完整链路
        keyword = body.get("keyword", "荆州 文旅")
        days = body.get("days", 7)
        template_id = body.get("template_id", "journal")
        account_id = body.get("account_id", "yinshuju")

        import markdown
        try:
            from modules.research import research
            from modules.formatter import format_html
            from modules.publisher import publish_draft

            # Step 1: 选题
            r1 = research(keyword, days)
            if r1.get("topics"):
                topic = r1["topics"][0]
                chosen = topic["title"]
            else:
                chosen = f"{keyword} 最新资讯"

            # Step 2: 写作（跳过 AI 调用，用模板生成测试内容）
            test_md = f"""# {chosen}

## 今日主题

{topic.get('summary', chosen)} 相关内容。

## 核心要点

- 数据来源：{topic.get('source', '网络')}
- 分类标签：{topic.get('tag', '综合')}
- 相关度评分：{topic.get('score', 50)}/100

## 详细解读

本篇文章基于最新公开信息整理，为您提供 {keyword} 相关的深度分析。

如需完整 AI 生成内容，请配置大模型 API Key 后重试。
"""
            md_content = markdown.markdown(test_md)

            # Step 3: 排版
            r3 = format_html(test_md, template_id)

            # Step 4: 发布
            if r3.get("status") == "ok":
                r4 = publish_draft(
                    title=chosen,
                    html=r3["html"],
                    cover_url="",
                    account_id=account_id
                )
                result = {
                    "status": r4.get("status", "ok"),
                    "topic": chosen,
                    "source": topic.get("source", ""),
                    "html_length": len(r3.get("html", "")),
                    "draft_id": r4.get("draft_id", ""),
                    "preview_url": r4.get("preview_url", ""),
                    "message": r4.get("message", ""),
                }
            else:
                result = r3

        except Exception as e:
            import traceback
            result = {"status": "error", "message": str(e), "trace": traceback.format_exc()[-200:]}

    else:
        result = {
            "status": "ok",
            "service": "PenPulse MCP Server",
            "version": "1.0.0",
            "description": "AI内容自动化工具 · 选题/写作/排版/封面/发布",
            "available_actions": ["health", "research", "format", "publish", "pipeline"],
            "usage": {
                "action": "pipeline",
                "keyword": "荆州 文旅",
                "days": 7,
                "template_id": "journal",
                "account_id": "yinshuju"
            }
        }

    return {
        "statusCode": 200,
        "headers": {**cors_headers(), "Content-Type": "application/json"},
        "body": json.dumps(result, ensure_ascii=False)
    }


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
