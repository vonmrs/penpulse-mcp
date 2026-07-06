# PenPulse · AI 内容自动化中台

**让任何自媒体运营者，用 AI 完成从选题到发布的全部工作。**

[![MCP Server](https://img.shields.io/badge/MCP-Server-green)](https://modelcontextprotocol.io)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 两条核心链路

```
链路一：AI 全链路（无稿用户）
research_topic → generate_article → format_wechat_html → generate_cover → create_wechat_draft

链路二：文档上传（有稿用户）
upload_docx → format_wechat_html → generate_cover → create_wechat_draft
```

---

## 功能

### MCP Tools（链路一 · AI 全链路）

| Tool | 功能 |
|---|---|
| `research_topic` | 搜索热门选题，基于荆州新闻网等数据源 |
| `generate_article` | AI 生成文章，支持 news/humor/tech 三种风格 |
| `format_wechat_html` | Markdown 转公众号内联样式 HTML |
| `generate_cover` | AI 生成封面图（通义万相） |
| `create_wechat_draft` | 推送到微信公众号草稿箱 |

### MCP Tools（链路二 · 文档上传）

| Tool | 功能 |
|---|---|
| `upload_docx` | 读取 Word 文档 (.docx)，转为 Markdown |
| `format_wechat_html` | 同上，共用 |
| `generate_cover` | 同上，共用 |
| `create_wechat_draft` | 同上，共用 |

---

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置公众号账号

```bash
cp config/wechat_accounts.example.json config/wechat_accounts.json
# 编辑 config/wechat_accounts.json，填入你的 AppID 和 AppSecret
```

### 3. 设置环境变量（可选）

```bash
export PENPULSE_API_KEY="your-api-key"          # 大模型 API Key
export PENPULSE_DASHSCOPE_KEY="your-dashscope-key"  # 通义万相 API Key（封面图用）
export PENPULSE_API_BASE="https://api.qfapi.cn/v1"  # 大模型 API 地址
```

### 4. 运行 MCP Server

```bash
# STDIO 模式（用于 Claude Desktop / Cursor 等）
python mcp_server.py

# HTTP 模式（用于远程调用）
python -m uvicorn mcp_server:app --host 0.0.0.0 --port 8080
```

### 5. 在 Claude Desktop 中使用

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "penpulse": {
      "command": "python",
      "args": ["/path/to/penpulse/mcp_server.py"],
      "env": {
        "PENPULSE_API_KEY": "your-api-key",
        "PENPULSE_DASHSCOPE_KEY": "your-dashscope-key"
      }
    }
  }
}
```

---

## 使用示例

### 链路一：AI 全链路

```
你：帮我写一篇关于荆州端午文旅数据的公众号文章并发布

→ research_topic("荆州 端午 文旅")
→ generate_article("荆州端午文旅数据", style="humor")
→ format_wechat_html(markdown, template_id="journal")
→ generate_cover(title, style="culture")
→ create_wechat_draft(title, html, cover_url)
→ 返回草稿预览链接
```

### 链路二：文档上传

```
你：帮我把 /path/to/article.docx 排版发布

→ upload_docx("/path/to/article.docx")
→ format_wechat_html(markdown, template_id="auto")
→ generate_cover(title)
→ create_wechat_draft(title, html, cover_url)
→ 返回草稿预览链接
```

---

## 排版模板

支持 12 套模板（朝鉴 6 套浅色 + 棱镜 6 套深色）：

### 朝鉴浅色系

| ID | 风格 |
|---|---|
| `journal` | 晨报头版 |
| `cover` | 杂志封面 |
| `card` | 卡片瀑布流 |
| `dashboard` | 数据仪表盘 |
| `minimal` | 极简留白 |
| `chat` | 对话气泡 |

### 棱镜深色系

| ID | 风格 |
|---|---|
| `terminal` | 终端界面 |
| `editor` | 代码编辑器 |
| `neon` | 霓虹赛博 |
| `glass` | 毛玻璃卡片 |
| `geek` | 极客简约 |
| `hologram` | 全息投影 |

---

## 配置多账号

```python
from modules.publisher import add_account

add_account({
    "id": "my-account",
    "name": "我的公众号",
    "appid": "wx1234567890abcdef",
    "appsecret": "your-appsecret-here",
    "author_name": "作者名"
})
```

---

## 项目结构

```
penpulse/
├── mcp_server.py          # MCP Server 入口
├── modules/
│   ├── __init__.py
│   ├── research.py        # 选题搜索
│   ├── writer.py          # AI 写作
│   ├── doc_reader.py      # Word 文档读取
│   ├── formatter.py       # 公众号排版
│   ├── cover.py           # 封面图生成
│   └── publisher.py       # 公众号发布
├── config/
│   └── wechat_accounts.example.json
├── requirements.txt
└── README.md
```

---

## 定价（爱发电）

| 方案 | 价格 | 功能 |
|---|---|---|
| Free | ¥0 | 每月 5 次 API 调用 |
| Basic | ¥49/月 | 无限排版 + 发布（链路二） |
| Pro | ¥99/月 | 全部功能（两条链路） |
| Enterprise | ¥299/月 | 私有部署 + 技术支持 |

购买 API Key：[爱发电 · PenPulse](https://afdian.net/)

---

## 常见问题

**Q: 如何获取微信公众号 AppID 和 AppSecret？**
A: 登录 [微信公众平台](https://mp.weixin.qq.com) → 设置与开发 → 基本配置

**Q: 通义万相 API Key 如何获取？**
A: 登录 [阿里云百炼](https://bailian.console.aliyun.com/) → API-KEY 管理

**Q: 支持其他 AI 模型吗？**
A: 支持 OpenAI/Claude 兼容接口，设置 `PENPULSE_API_BASE` 和 `PENPULSE_MODEL_NAME` 即可

---

## License

MIT License · 2026 PenPulse
