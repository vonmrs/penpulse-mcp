"""
模块五：封面图生成 (cover)
调用通义万相 API 生成封面图
"""

import os
import base64
import requests
from typing import Dict

# 通义万相 API
WANXIANG_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"

# 风格关键词映射
STYLE_PROMPTS = {
    "default": "现代简约风格，专业媒体感，干净的排版布局",
    "tech": "科技感封面，蓝色调，数字元素，干净的排版布局",
    "nature": "自然风景封面，绿色清新色调，干净的排版布局",
    "business": "商务精英风格，深蓝色调，专业稳重",
    "culture": "文旅封面，中国风元素，文化气息",
    "news": "新闻头版风格，正式严肃，深色调",
}


def gen_cover(title: str, style: str = "default") -> dict:
    """
    AI 生成微信公众号封面图

    Args:
        title: 文章标题
        style: 封面风格，default/tech/nature/business/culture/news

    Returns:
        dict with status, image_url
    """
    api_key = os.environ.get("PENPULSE_DASHSCOPE_KEY", "")
    if not api_key:
        return {
            "status": "error",
            "message": "未配置通义万相 API Key，请设置环境变量 PENPULSE_DASHSCOPE_KEY",
            "image_url": ""
        }

    # 构建 prompt
    style_desc = STYLE_PROMPTS.get(style, STYLE_PROMPTS["default"])
    prompt = f"{title}，{style_desc}，竖版封面，比例 2:3，无文字，无水印"

    try:
        task_id = _submit_task(api_key, prompt)
        if not task_id:
            return {"status": "error", "message": "提交任务失败", "image_url": ""}

        # 轮询结果（最多30秒）
        image_url = _poll_result(api_key, task_id, max_wait=30)
        if not image_url:
            return {
                "status": "error",
                "message": "生成超时，请稍后重试",
                "image_url": ""
            }

        return {
            "status": "ok",
            "message": "封面生成成功",
            "image_url": image_url,
            "prompt": prompt,
            "style": style
        }

    except Exception as e:
        return {"status": "error", "message": f"生成失败: {str(e)}", "image_url": ""}


def _submit_task(api_key: str, prompt: str) -> str:
    """提交通义万相生成任务"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "wanx2.1-cover-se",
        "input": {"prompt": prompt},
        "parameters": {
            "size": "3:4",
            "steps": 25,
            "n": 1
        }
    }
    resp = requests.post(WANXIANG_URL, headers=headers, json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("output", {}).get("task_id", "")


def _poll_result(api_key: str, task_id: str, max_wait: int = 30) -> str:
    """轮询任务结果"""
    import time
    status_url = f"{WANXIANG_URL.replace('/image-synthesis', ''}/tasks/{task_id}"

    headers = {"Authorization": f"Bearer {api_key}"}

    for _ in range(max_wait // 2):
        time.sleep(2)
        resp = requests.get(status_url, headers=headers, timeout=10)
        data = resp.json()
        task_status = data.get("output", {}).get("task_status", "")

        if task_status == "succeeded":
            results = data.get("output", {}).get("results", [])
            if results:
                return results[0].get("image_url", "")
        elif task_status == "failed":
            return ""

    return ""


# ─── 备选方案：使用 URL 下载图片并返回本地路径 ──────────────────

def gen_cover_from_url(image_url: str) -> dict:
    """
    从已有图片 URL 下载并保存到本地

    Args:
        image_url: 外部图片 URL

    Returns:
        dict with status, local_path
    """
    try:
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()

        save_dir = os.environ.get("PENPULSE_COVER_DIR", "/tmp/penpulse-covers")
        os.makedirs(save_dir, exist_ok=True)

        filename = f"cover_{int(os.urandom(4).hex(), 16)}.png"
        save_path = os.path.join(save_dir, filename)

        with open(save_path, "wb") as f:
            f.write(resp.content)

        return {
            "status": "ok",
            "message": "图片下载成功",
            "local_path": save_path,
            "image_url": image_url
        }
    except Exception as e:
        return {"status": "error", "message": f"下载失败: {str(e)}", "local_path": ""}
