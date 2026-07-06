"""
模块二：AI 写作 (writer)
调用大模型 API 生成文章
"""

import os
import json
import requests
from typing import Dict

# 默认使用 QClaw 模型路由，也可配置为 OpenAI/Claude
DEFAULT_MODEL = os.environ.get("PENPULSE_MODEL", "qclaw/modelroute")
API_BASE = os.environ.get("PENPULSE_API_BASE", "https://api.qfapi.cn/v1")


STYLE_PROMPTS = {
    "news": """你是专业的内容创作者，擅长深度新闻分析。
写作风格：信息量大、逻辑清晰、有观点但不偏激。
结构：开头抓人 → 事件简述 → 深度剖析（3节）→ 机会与行动 → 一句收尾 → 提问互动。
数据引用必须精确，不确定的不写。
""",
    "humor": """你是荆州本地自媒体人，为荆州代言，无名小卒。
写作风格：幽默风趣，像街坊聊天，不正式，不评判，只赞扬荆州。
开头要像老朋友说话，三句话内抓住读者。
禁用词：赋能、抓手、闭环、方法论、生态位、拉通、赛道。
""",
    "tech": """你是技术内容导师，擅长把复杂技术讲得通俗易懂。
结构：核心概念 → 为什么重要 → 如何上手 → 常见误区 → 进阶方向 → 提问互动。
用类比和案例解释概念，每节配一个具体例子。
""",
}


def write_article(topic: str, style: str = "news") -> dict:
    """
    AI 生成文章

    Args:
        topic: 选题主题
        style: 写作风格，news/humor/tech

    Returns:
        dict with status, markdown content
    """
    style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["news"])

    system_prompt = f"""你是一个专业的内容创作助手。
{style_prompt}

重要规则：
1. 文章长度约 1500 字（800-2000字均可）
2. 用 Markdown 格式输出，标题用 ## ，小标题用 ###
3. 不要输出任何非文章内容（如"以下是文章"）
4. 结尾必须有"你有什么想法？欢迎留言讨论"类似互动引导
5. 数据引用格式：[来源：机构名，年份]
"""

    user_prompt = f"""请为以下主题写一篇深度文章：

主题：{topic}

要求：
- 标题要吸引人，25字以内，带情绪或冲突感
- 开头即抓住读者，像老朋友说话
- 全文分3-4个章节深入剖析
- 结尾有互动引导
- 用 Markdown 格式输出
"""

    try:
        content = _call_llm(system_prompt, user_prompt)
        if not content:
            return {"status": "error", "message": "AI 生成失败，请重试", "markdown": ""}

        # 提取标题
        lines = content.split("\n")
        title = ""
        for line in lines:
            line = line.strip()
            if line.startswith("# ") and not title:
                title = line[2:].strip()
                break

        return {
            "status": "ok",
            "message": "文章生成成功",
            "title": title or topic,
            "markdown": content,
            "style": style,
            "topic": topic
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "markdown": ""}


def _call_llm(system_prompt: str, user_prompt: str) -> str:
    """调用大模型 API"""
    api_key = os.environ.get("PENPULSE_API_KEY", "")

    # QClaw 模型路由
    if DEFAULT_MODEL == "qclaw/modelroute":
        return _call_qclaw(system_prompt, user_prompt, api_key)

    # OpenAI 兼容接口
    return _call_openai_compatible(system_prompt, user_prompt, api_key)


def _call_qclaw(system: str, user: str, api_key: str) -> str:
    """调用 QClaw 模型路由"""
    url = f"{API_BASE}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}" if api_key else ""
    }
    payload = {
        "model": "qclaw/modelroute",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _call_openai_compatible(system: str, user: str, api_key: str) -> str:
    """调用 OpenAI 兼容接口"""
    url = f"{API_BASE}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": os.environ.get("PENPULSE_MODEL_NAME", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]
