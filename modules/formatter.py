"""
模块四：微信公众号排版 (formatter)
调用 selector.py 模板系统，将 Markdown 转为内联样式 HTML
"""

import os
import re
import json
import subprocess
from typing import Dict

# 模板目录，优先从环境变量读取，否则使用内置路径
TEMPLATE_DIR = os.environ.get(
    "PENPULSE_TEMPLATE_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates")
)
SELECTOR_SCRIPT = os.path.join(TEMPLATE_DIR, "selector.py")

# 模板 ID → 风格描述映射
TEMPLATE_MAP = {
    # 朝鉴模板（浅色）
    "auto": "根据内容主题自动选择",
    "journal": "晨报头版风格（浅色，经典报纸感）",
    "cover": "杂志封面风格（浅色，大图大字）",
    "card": "卡片瀑布流（浅色，多模块）",
    "dashboard": "数据仪表盘（浅色，数据展示）",
    "minimal": "极简留白（浅色，呼吸感）",
    "chat": "对话气泡风格（浅色，轻松）",
    # 棱镜模板（深色）
    "terminal": "终端界面（深黑底，绿色提示符）",
    "editor": "代码编辑器（VS Code 暗色风格）",
    "neon": "霓虹赛博（紫青霓虹光效）",
    "glass": "毛玻璃卡片（iOS 毛玻璃风格）",
    "geek": "极客简约（纯黑底白字）",
    "hologram": "全息投影（科幻 HUD 风格）",
}

# 朝鉴浅色配色方案（用于默认浅色模板）
CHAOJIAN_COLORS = {
    "primary": "#1565c0",
    "secondary": "#42a5f5",
    "background": "#ffffff",
    "text": "#333333",
    "accent": "#ff6f00",
    "muted": "#f5f5f5",
    "border": "#e0e0e0",
}

# 棱镜深色配色方案
LENGJING_COLORS = {
    "primary": "#a371f7",
    "secondary": "#58a6ff",
    "background": "#0d1117",
    "text": "#c9d1d9",
    "accent": "#39d353",
    "muted": "#161b22",
    "border": "#30363d",
}


def format_html(markdown: str, template_id: str = "auto") -> dict:
    """
    将 Markdown 排版为微信公众号 HTML

    Args:
        markdown: Markdown 内容
        template_id: 模板 ID，默认 auto

    Returns:
        dict with status, html content
    """
    if not markdown or not markdown.strip():
        return {"status": "error", "message": "内容不能为空", "html": ""}

    try:
        # 提取标题
        title = _extract_title(markdown)
        topic = _extract_topic(markdown)

        # 自动选择模板
        actual_template = template_id
        if template_id == "auto":
            actual_template = _auto_select_template(topic)
            colors = LENGJING_COLORS if actual_template in ["terminal", "editor", "neon", "glass", "geek", "hologram"] else CHAOJIAN_COLORS
        else:
            colors = LENGJING_COLORS if template_id in ["terminal", "editor", "neon", "glass", "geek", "hologram"] else CHAOJIAN_COLORS

        # 调用 selector.py 获取 HTML 骨架
        skeleton = _get_template_skeleton(actual_template)

        if not skeleton:
            return {"status": "error", "message": f"模板 {actual_template} 不存在", "html": ""}

        # 将 Markdown 内容转为 HTML
        body_html = _markdown_to_html(markdown, colors)

        # 组装完整 HTML
        html = _assemble_html(skeleton, title, body_html, colors)

        return {
            "status": "ok",
            "message": f"排版完成，使用模板: {TEMPLATE_MAP.get(actual_template, actual_template)}",
            "html": html,
            "template_id": actual_template,
            "title": title
        }

    except Exception as e:
        return {"status": "error", "message": f"排版失败: {str(e)}", "html": ""}


def _extract_title(markdown: str) -> str:
    """从 Markdown 提取标题"""
    for line in markdown.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def _extract_topic(markdown: str) -> str:
    """从 Markdown 内容提取主题关键词"""
    text = markdown.lower()
    if any(w in text for w in ["科技", "数字", "ai", "技术", "编程", "代码"]):
        return "tech"
    if any(w in text for w in ["民生", "教育", "高考", "医疗", "就业"]):
        return "civil"
    if any(w in text for w in ["政策", "公文", "规划", "会议", "领导"]):
        return "policy"
    if any(w in text for w in ["文旅", "旅游", "演出", "景区", "消费"]):
        return "culture"
    if any(w in text for w in ["经济", "产业", "招商", "项目", "企业"]):
        return "economy"
    return "default"


def _auto_select_template(topic: str) -> str:
    """根据主题自动选择模板"""
    mapping = {
        "tech": "terminal",       # 科技 → 终端界面
        "civil": "journal",       # 民生 → 晨报头版
        "policy": "cover",        # 政策 → 杂志封面
        "culture": "card",         # 文旅 → 卡片瀑布
        "economy": "dashboard",   # 经济 → 数据仪表盘
        "default": "journal",
    }
    return mapping.get(topic, "journal")


def _get_template_skeleton(template_id: str) -> str:
    """获取模板 HTML 骨架"""
    template_file = os.path.join(TEMPLATE_DIR, f"{template_id}.json")
    if os.path.exists(template_file):
        with open(template_file) as f:
            data = json.load(f)
            return data.get("skeleton", "")

    # 内置最小骨架
    return _builtin_skeleton(template_id)


def _builtin_skeleton(template_id: str) -> str:
    """内置默认骨架（当模板文件不存在时使用）"""
    if template_id in ["terminal", "editor", "neon", "glass", "geek", "hologram"]:
        # 深色骨架
        return {
            "terminal": """<section style="padding:16px;background:#0d1117;color:#c9d1d9;border-radius:12px;margin:16px 0;">
  <div style="font-family:monospace;font-size:14px;line-height:1.8;">{content}</div>
</section>""",
            "geek": """<section style="padding:24px;background:#000;color:#fff;border-radius:8px;margin:16px 0;">
  <div style="font-size:15px;line-height:2;">{content}</div>
</section>""",
        }.get(template_id, """<section style="padding:16px;margin:16px 0;">{content}</section>""")

    # 浅色骨架（默认）
    return """<section style="padding:16px;margin:16px 0;font-size:15px;line-height:1.8;color:#333;">
  {content}
</section>"""


def _markdown_to_html(markdown: str, colors: dict) -> str:
    """将 Markdown 转为内联样式 HTML（公众号兼容）"""
    import re

    html = markdown

    # 代码块
    html = re.sub(
        r"```(\w+)?\n(.*?)```",
        lambda m: f'<pre style="background:{colors["muted"]};padding:12px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:13px;margin:12px 0;"><code>{_escape_html(m.group(2))}</code></pre>',
        html, flags=re.DOTALL
    )

    # 行内代码
    html = re.sub(
        r"`([^`]+)`",
        lambda m: f'<code style="background:{colors["muted"]};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">{_escape_html(m.group(1))}</code>',
        html
    )

    # 表格
    html = re.sub(
        r"(\|.+\|\n\|[-| :]+\|\n)(.+?)(?=\n\n|\Z)",
        lambda m: _table_to_html(m.group(0), colors),
        html, flags=re.DOTALL
    )

    # h1
    html = re.sub(r"^# (.+)$", lambda m: f'<h1 style="font-size:22px;font-weight:700;color:{colors["primary"]};margin:20px 0 12px;border-bottom:2px solid {colors["primary"]};padding-bottom:8px;">{m.group(1)}</h1>', html, flags=re.MULTILINE)

    # h2
    html = re.sub(r"^## (.+)$", lambda m: f'<h2 style="font-size:18px;font-weight:700;color:{colors["text"]};margin:18px 0 10px;">{m.group(1)}</h2>', html, flags=re.MULTILINE)

    # h3
    html = re.sub(r"^### (.+)$", lambda m: f'<h3 style="font-size:16px;font-weight:700;color:{colors["text"]};margin:14px 0 8px;">{m.group(1)}</h3>', html, flags=re.MULTILINE)

    # 粗体
    html = re.sub(r"\*\*(.+?)\*\*", lambda m: f'<strong style="font-weight:700;color:{colors["primary"]};">{m.group(1)}</strong>', html)

    # 斜体
    html = re.sub(r"\*(.+?)\*", lambda m: f'<em style="font-style:italic;">{m.group(1)}</em>', html)

    # 引用块
    html = re.sub(
        r"^> (.+)$",
        lambda m: f'<blockquote style="border-left:4px solid {colors["primary"]};margin:12px 0;padding:8px 16px;background:{colors["muted"]};color:{colors["text"]};border-radius:0 8px 8px 0;">{m.group(1)}</blockquote>',
        html, flags=re.MULTILINE
    )

    # 有序列表
    html = re.sub(
        r"(<h[123]>.+?</h[123]>)(\n)(<blockquote.+?</blockquote>)?(\n)(<h[123]>.+?</h[123]>)",
        r"\1\2\3\4\5",
        html
    )

    # 列表项
    def ul_item(m):
        indent = len(m.group(1))
        item = m.group(3).strip().lstrip("-* ").lstrip("0123456789. ")
        return ' ' * (indent * 2) + f'<li style="margin:4px 0;line-height:1.7;">{item}</li>'

    html = re.sub(r"^( {2})*[-*] (.+)$", ul_item, html, flags=re.MULTILINE)

    # 无序列表包裹
    html = re.sub(r"(<li.+?</li>\n?)+", lambda m: f'<ul style="padding-left:20px;margin:8px 0;">{m.group(0)}</ul>', html)

    # 段落（未被其他标签包裹的行）
    lines = html.split("\n")
    result = []
    in_block = False
    block_tags = ["<h", "<ul", "<ol", "<pre", "<blockquote", "<section"]

    for line in lines:
        stripped = line.strip()
        is_block = any(stripped.startswith(t) for t in block_tags) or stripped.startswith("</")

        if stripped and not is_block and not in_block:
            result.append(f'<p style="margin:8px 0;line-height:1.8;">{stripped}</p>')
        else:
            result.append(line)
        in_block = is_block

    return "\n".join(result)


def _table_to_html(table_md: str, colors: dict) -> str:
    """Markdown 表格转 HTML 内联样式"""
    lines = table_md.strip().split("\n")
    if len(lines) < 2:
        return table_md

    def parse_row(line):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        return [c for c in cells if c and c != "---"]

    rows = [parse_row(l) for l in lines if parse_row(l)]
    if not rows:
        return table_md

    col_count = len(rows[0])
    header_cells = "".join(
        f'<td style="background:{colors["primary"]};color:#fff;font-weight:700;padding:8px 12px;border:1px solid {colors["border"]};text-align:center;">{c}</td>'
        for c in rows[0]
    )
    data_cells = ""
    for row in rows[1:]:
        data_cells += "<tr>" + "".join(
            f'<td style="padding:8px 12px;border:1px solid {colors["border"]};color:{colors["text"]};">{c}</td>'
            for c in row
        ) + "</tr>"

    return (
        f'<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">'
        f'<tr>{header_cells}</tr>{data_cells}</table>'
    )


def _escape_html(text: str) -> str:
    """转义 HTML 特殊字符"""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;"))


def _assemble_html(skeleton: str, title: str, body_html: str, colors: dict) -> str:
    """组装完整 HTML"""
    # 封面子模块
    cover = f"""
<section style="position:relative;margin:0 0 20px;">
  <h1 style="font-size:24px;font-weight:700;color:{colors['primary']};margin:0 0 12px;line-height:1.4;">{title}</h1>
</section>"""

    # 顶部账号名片（根据配色选择）
    if colors == LENGJING_COLORS:
        account_badge = """<section style="padding:14px 18px;background:#161b22;border:1px solid #30363d;border-radius:12px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:40px;vertical-align:middle;padding:0;border:none;">
        <img src="" alt="PenPulse" style="width:40px;height:40px;border-radius:50%;" />
      </td>
      <td style="vertical-align:middle;padding:0 0 0 12px;border:none;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">PenPulse</p>
        <p style="margin:2px 0 0;font-size:12px;color:#8b949e;">AI 内容自动化中台</p>
      </td>
    </tr>
  </table>
</section>"""
    else:
        account_badge = """<section style="padding:14px 18px;background:#f0f7ff;border:1px solid #d0e4f7;border-radius:12px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:40px;vertical-align:middle;padding:0;border:none;">
        <img src="" alt="PenPulse" style="width:40px;height:40px;border-radius:50%;" />
      </td>
      <td style="vertical-align:middle;padding:0 0 0 12px;border:none;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#333;">PenPulse</p>
        <p style="margin:2px 0 0;font-size:12px;color:#888;">AI 内容自动化中台</p>
      </td>
    </tr>
  </table>
</section>"""

    # 底部关注引导
    if colors == LENGJING_COLORS:
        follow_section = """<section style="padding:24px 20px;background:#161b22;border:1px solid #30363d;border-radius:12px;text-align:center;margin-top:30px;">
  <p style="margin:0;font-size:16px;font-weight:700;color:#fff;">📌 关注 PenPulse，AI 帮你写稿发布</p>
  <p style="margin:10px 0 0;font-size:13px;color:#8b949e;">长按识别二维码，体验 AI 内容自动化</p>
</section>"""
    else:
        follow_section = """<section style="padding:24px 20px;background:linear-gradient(135deg,#f0f7ff,#fff);border:1px solid #d0e4f7;border-radius:12px;text-align:center;margin-top:30px;">
  <p style="margin:0;font-size:16px;font-weight:700;color:#333;">📌 关注 PenPulse，AI 帮你写稿发布</p>
  <p style="margin:10px 0 0;font-size:13px;color:#888;">长按识别二维码，体验 AI 内容自动化</p>
</section>"""

    # 组装
    body = cover + "\n" + body_html + "\n" + follow_section

    # 如果骨架是通用格式，直接替换
    if "{content}" in skeleton:
        full_html = skeleton.replace("{content}", body)
    else:
        # 骨架本身是完整 section，直接拼接
        full_html = account_badge + "\n" + skeleton.replace("{content}", body)

    return full_html


def list_templates() -> str:
    """返回可用模板列表"""
    lines = ["可用排版模板："]
    for tid, desc in TEMPLATE_MAP.items():
        lines.append(f"  [{tid}] {desc}")
    lines.append("")
    lines.append("使用方法：format_wechat_html(markdown, template_id='journal')")
    return "\n".join(lines)
