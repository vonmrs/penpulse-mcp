"""
PenPulse MCP Server
AI 内容自动化中台 · MCP Server
一条链路：选题→写作→排版→封面图→发布
二条链路：文档上传→排版→封面图→发布
"""

import sys
import os

# 将 modules 加入路径，以便直接 import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("PenPulse")

# ─── 链路一：AI 全链路 ────────────────────────────────────────

@mcp.tool()
def research_topic(keyword: str, days: int = 7) -> dict:
    """
    搜索热门选题（链路一专用）

    Args:
        keyword: 选题关键词，如"荆州 文旅"
        days: 搜索最近多少天的内容，默认7天

    Returns:
        选题列表，每条含标题、来源、摘要、相关度评分
    """
    from modules.research import research
    return research(keyword, days)


@mcp.tool()
def generate_article(topic: str, style: str = "news") -> dict:
    """
    AI 生成文章（链路一专用）

    Args:
        topic: 选题主题，如"荆州端午文旅数据"
        style: 写作风格，news(新闻深度)|humor(幽默风趣)|tech(技术解读)

    Returns:
        文章内容，Markdown 格式，含标题、正文、结尾互动
    """
    from modules.writer import write_article
    return write_article(topic, style)


# ─── 两条链路共用 ────────────────────────────────────────────

@mcp.tool()
def upload_docx(file_path: str) -> dict:
    """
    读取用户上传的 Word 文档，转换为 Markdown（链路二专用）

    Args:
        file_path: .docx 文件路径（服务器端路径）

    Returns:
        文档内容，Markdown 格式
    """
    from modules.doc_reader import read_docx
    return read_docx(file_path)


@mcp.tool()
def format_wechat_html(markdown: str, template_id: str = "auto") -> dict:
    """
    将 Markdown 内容排版为微信公众号 HTML

    Args:
        markdown: 文章内容，Markdown 格式
        template_id: 模板 ID，默认为 auto（自动选择），
                     也可指定：journal/cover/card/dashboard/minimal/chat
                     （棱镜模板）：terminal/editor/neon/glass/geek/hologram

    Returns:
        HTML 内容，内联样式，可直接用于公众号
    """
    from modules.formatter import format_html
    return format_html(markdown, template_id)


@mcp.tool()
def generate_cover(title: str, style: str = "default") -> dict:
    """
    AI 生成微信公众号封面图

    Args:
        title: 文章标题
        style: 封面风格，default(通用)|tech(科技)|nature(自然)|business(商务)

    Returns:
        封面图 URL
    """
    from modules.cover import gen_cover
    return gen_cover(title, style)


@mcp.tool()
def create_wechat_draft(
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
        cover_url: 封面图 URL（必须是微信返回的 media_id 对应地址）
        account_id: 公众号账号 ID，默认为 default（配置文件中的账号）

    Returns:
        草稿 ID 和预览链接
    """
    from modules.publisher import publish_draft
    return publish_draft(title, html, cover_url, account_id)


# ─── 配置与状态 ───────────────────────────────────────────────

@mcp.resource("config://wechat_accounts")
def wechat_accounts() -> str:
    """返回已配置的公众号账号列表"""
    from modules.publisher import list_accounts
    return list_accounts()


@mcp.resource("config://templates")
def templates() -> str:
    """返回可用的排版模板列表"""
    from modules.formatter import list_templates
    return list_templates()


if __name__ == "__main__":
    # 本地调试模式
    mcp.run()
