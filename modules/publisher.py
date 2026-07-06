"""
模块六：公众号草稿发布 (publisher)
调用微信公众号 API 将内容推送到草稿箱
"""

import os
import json
import requests
import re
from typing import Dict, List

# 微信公众号 API 基础地址
WX_API_BASE = "https://api.weixin.qq.com"

# 配置文件路径
CONFIG_FILE = os.environ.get(
    "PENPULSE_WECHAT_CONFIG",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "wechat_accounts.json")
)


def _load_accounts() -> List[dict]:
    """加载公众号账号配置"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            data = json.load(f)
            return data.get("accounts", [])
    return []


def _save_accounts(accounts: List[dict]) -> None:
    """保存公众号账号配置"""
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump({"accounts": accounts}, f, ensure_ascii=False, indent=2)


def _get_access_token(account: dict) -> str:
    """获取 access_token"""
    appid = account.get("appid", "")
    appsecret = account.get("appsecret", "")

    url = f"{WX_API_BASE}/cgi-bin/token"
    params = {"grant_type": "client_credential", "appid": appid, "secret": appsecret}

    resp = requests.get(url, params=params, timeout=10)
    data = resp.json()

    if "access_token" not in data:
        raise Exception(f"获取 access_token 失败: {data.get('errmsg', '未知错误')}")

    return data["access_token"]


def _upload_image(access_token: str, image_url: str, appid: str) -> str:
    """
    上传封面图到微信服务器，返回 media_id

    如果 image_url 是本地文件路径，直接上传；
    如果是 HTTP URL，先下载再上传。
    """
    # 如果是本地文件
    if os.path.exists(image_url):
        with open(image_url, "rb") as f:
            files = {"media": (os.path.basename(image_url), f, "image/png")}
            url = f"{WX_API_BASE}/cgi-bin/media/upload?access_token={access_token}&type=image"
            resp = requests.post(url, files=files, timeout=30)
    else:
        # 下载远程图片再上传
        img_resp = requests.get(image_url, timeout=15)
        img_resp.raise_for_status()
        files = {"media": ("cover.png", img_resp.content, "image/png")}
        url = f"{WX_API_BASE}/cgi-bin/media/upload?access_token={access_token}&type=image"
        resp = requests.post(url, files=files, timeout=30)

    data = resp.json()
    if "media_id" not in data:
        raise Exception(f"封面上传失败: {data.get('errmsg', '未知错误')}")

    return data["media_id"]


def _extract_summary(markdown: str, max_len: int = 54) -> str:
    """从 Markdown 提取摘要"""
    # 去掉标题
    text = re.sub(r"^#+\s+.+$", "", markdown, flags=re.MULTILINE)
    # 去掉代码块
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    # 去掉 Markdown 格式
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[*_`#>]+", "", text)
    # 找第一句完整的话
    sentences = re.split(r"[。！？\n]", text)
    for s in sentences:
        s = s.strip()
        if len(s) > 10:
            return s[:max_len] + "..." if len(s) > max_len else s
    return ""


def publish_draft(
    title: str,
    html: str,
    cover_url: str,
    account_id: str = "default"
) -> dict:
    """
    推送文章到微信公众号草稿箱

    Args:
        title: 文章标题
        html: 排版后的 HTML 内容
        cover_url: 封面图 URL（微信图片 URL，本地路径，或外部 URL）
        account_id: 公众号账号 ID

    Returns:
        dict with status, draft_id, preview_url
    """
    accounts = _load_accounts()

    # 找到指定账号
    account = None
    if account_id == "default":
        account = accounts[0] if accounts else None
    else:
        for acc in accounts:
            if acc.get("id") == account_id:
                account = acc
                break

    if not account:
        return {
            "status": "error",
            "message": f"未找到公众号账号: {account_id}，请先配置账号",
            "draft_id": "",
            "preview_url": ""
        }

    try:
        # 获取 access_token
        access_token = _get_access_token(account)

        # 上传封面图
        thumb_media_id = _upload_image(access_token, cover_url, account["appid"])

        # 提取摘要
        summary = _extract_summary(html)

        # 构造草稿内容
        draft_content = {
            "articles": [{
                "title": title,
                "author": account.get("author_name", "PenPulse"),
                "digest": summary or title,
                "content": html,
                "content_source_url": "",
                "thumb_media_id": thumb_media_id,
                "need_open_comment": 1,
                "only_fans_can_comment": 0,
            }]
        }

        # 创建草稿
        url = f"{WX_API_BASE}/cgi-bin/draft/add?access_token={access_token}"
        resp = requests.post(
            url,
            data=json.dumps(draft_content, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            timeout=30
        )
        data = resp.json()

        if data.get("errcode", 0) != 0:
            return {
                "status": "error",
                "message": f"创建草稿失败: {data.get('errmsg', '未知错误')}",
                "draft_id": "",
                "preview_url": ""
            }

        draft_id = data.get("media_id", "")

        return {
            "status": "ok",
            "message": "草稿创建成功，请在公众号后台审核发布",
            "draft_id": draft_id,
            "preview_url": f"https://mp.weixin.qq.com/cgi-bin/draft?sid={draft_id}",
            "account": account.get("name", "公众号"),
            "thumb_media_id": thumb_media_id
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"发布失败: {str(e)}",
            "draft_id": "",
            "preview_url": ""
        }


# ─── 账号管理 ─────────────────────────────────────────────────

def add_account(account_data: dict) -> dict:
    """
    添加公众号账号

    Args:
        account_data: dict with id, name, appid, appsecret, author_name
    """
    accounts = _load_accounts()
    accounts.append(account_data)
    _save_accounts(accounts)

    # 测试连接
    try:
        _get_access_token(account_data)
        return {"status": "ok", "message": f"账号 {account_data['name']} 添加成功"}
    except Exception as e:
        return {"status": "warn", "message": f"账号添加成功但测试连接失败: {str(e)}"}


def remove_account(account_id: str) -> dict:
    """移除公众号账号"""
    accounts = _load_accounts()
    accounts = [a for a in accounts if a.get("id") != account_id]
    _save_accounts(accounts)
    return {"status": "ok", "message": f"账号 {account_id} 已移除"}


def list_accounts() -> str:
    """返回已配置的公众号账号列表"""
    accounts = _load_accounts()
    if not accounts:
        return "暂未配置公众号账号。请调用 add_account() 添加。"

    lines = ["已配置的公众号账号："]
    for acc in accounts:
        lines.append(f"  [{acc.get('id', 'default')}] {acc.get('name', '未知')}")
        lines.append(f"    AppID: {acc.get('appid', '')}")
    return "\n".join(lines)
