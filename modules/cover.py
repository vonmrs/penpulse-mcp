"""
备选封面图：从网络下载一张测试用封面图
"""

import os
import requests

# 使用银枢局已有的封面图路径
TEST_COVER_PATHS = [
    # 优先用本地已有的封面
    "/Users/von/Desktop/QClaw_doc/news/jingzhou-morning/covers/",
    "/Users/von/Desktop/QClaw_doc/news/tech-afternoon/covers/",
]

def get_test_cover() -> str:
    """获取一张可用的测试封面图路径"""
    for cover_dir in TEST_COVER_PATHS:
        if os.path.exists(cover_dir):
            files = [f for f in os.listdir(cover_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
            if files:
                return os.path.join(cover_dir, files[0])

    # 如果本地没有，用网络图片
    return ""


def download_test_cover() -> str:
    """下载一张测试封面图到本地"""
    save_dir = "/tmp/penpulse-covers"
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, "test_cover.png")

    if os.path.exists(save_path):
        return save_path

    # 用一张无害的测试图片（纯色图）
    url = "https://via.placeholder.com/900x383/1565c0/ffffff?text=PenPulse+AI+Cover"

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(resp.content)
        return save_path
    except Exception:
        return ""
