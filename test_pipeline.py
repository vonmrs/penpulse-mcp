"""
PenPulse MCP Server · 完整链路测试 v2
测试链路一：research → write → format → cover → publish
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["PENPULSE_API_KEY"] = ""
os.environ["PENPULSE_DASHSCOPE_KEY"] = ""
os.environ["PENPULSE_API_BASE"] = "https://api.qfapi.cn/v1"

print("=" * 60)
print("PenPulse MCP Server · 完整链路测试 v2")
print("=" * 60)

# ─── Step 1: 选题搜索 ──────────────────────────────────────────
print("\n📡 [Step 1] 选题搜索...")
try:
    from modules.research import research
    result = research("荆州 文旅", days=7)
    print(f"   状态: {result['status']}")
    print(f"   消息: {result['message']}")
    topics = result.get("topics", [])
    if topics:
        top = topics[0]
        chosen_topic = top["title"]
        print(f"   ✅ 选中选题: {chosen_topic}")
        print(f"   来源: {top['source']} | 评分: {top['score']}")
    else:
        print("   ⚠️ 未找到选题，手动指定")
        chosen_topic = "荆州古城文化保护与旅游开发"
except Exception as e:
    print(f"   ❌ 失败: {e}")
    chosen_topic = "荆州古城文化保护与旅游开发"

# ─── Step 2: AI 写作 ───────────────────────────────────────────
print("\n✍️  [Step 2] AI 写作...")
print(f"   主题: {chosen_topic}")
print("   (使用预设测试内容，避免 API 调用)")

test_markdown = f"""# {chosen_topic}

## 今日主题

荆州古城是长江文明的重要见证，近年来在文化旅游融合方面探索出一条独特路径。

## 一、古城保护的"荆州模式"

荆州古城墙始建于三国时期，现存城墙主要为明清遗存。与西安、南京不同，荆州的古城保护更注重"活态传承"——不是把古城封存起来，而是让它继续生长。

**数据说话**：2025年上半年，荆州古城景区接待游客突破 280 万人次，同比增长 42%，门票收入达 1.2 亿元。

> "我们不是在保护一个博物馆，而是在守护一座还在呼吸的城市。" —— 荆州市文旅局局长

## 二、文旅融合的三张牌

荆州的文旅融合打法清晰：三张牌——文化牌、生态牌、体验牌。

### 1. 文化牌：让历史"活"起来

不满足于静态展示，荆州引入了沉浸式演出。《关公颂》《刘备招亲》等实景剧，让游客不再是旁观者，而是历史的参与者。

### 2. 生态牌：把长江还给城市

沿江生态修复工程投资超 30 亿元，荆江大堤变身城市客厅。

### 3. 体验牌：从"看一眼"到"留下来"

过去游客在荆州平均停留 1.2 天，现在这个数字变成了 2.8 天。

## 三、机会与挑战

**机会**：武贵高铁2027年通车，武汉千万人口将是荆州文旅的超级腹地。

**挑战**：景区运营人才缺口大，本地导游讲解水平参差不齐。

## 四、一句话

荆州古城，正在从"路过的景点"变成"专程来的目的地"。

你有什么想法？欢迎留言讨论。
"""

print(f"   ✅ 预设测试内容已准备，{len(test_markdown)} 字")

# ─── Step 3: 排版 ─────────────────────────────────────────────
print("\n🎨 [Step 3] 公众号排版...")
try:
    from modules.formatter import format_html
    result = format_html(test_markdown, template_id="journal")
    print(f"   状态: {result['status']}")
    print(f"   消息: {result['message']}")
    html = result.get("html", "")
    print(f"   ✅ HTML 生成成功，{len(html)} 字符")
except Exception as e:
    print(f"   ❌ 失败: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ─── Step 4: 封面图 ─────────────────────────────────────────────
print("\n🖼️  [Step 4] 封面图生成...")
cover_local_path = ""

# 方案一：复用银枢局已有的封面图
existing_covers = [
    "/Users/von/Desktop/QClaw_doc/news/jingzhou-morning/covers/",
    "/Users/von/Desktop/QClaw_doc/news/tech-afternoon/covers/",
]
for cover_dir in existing_covers:
    if os.path.exists(cover_dir):
        files = [f for f in os.listdir(cover_dir)
                 if f.endswith(('.png', '.jpg', '.jpeg'))]
        if files:
            cover_local_path = os.path.join(cover_dir, files[0])
            print(f"   ✅ 复用银枢局封面: {cover_local_path}")
            break

if not cover_local_path:
    # 方案二：下载并压缩封面图（微信 thumb 类型限 64KB）
    import requests
    save_dir = "/tmp/penpulse-covers"
    os.makedirs(save_dir, exist_ok=True)
    cover_local_path = os.path.join(save_dir, "cover_thumb.jpg")

    if not os.path.exists(cover_local_path):
        print("   ⬇️  下载并压缩封面图...")
        from PIL import Image
        import io

        # 下载
        img_url = "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400&q=80"
        img_resp = requests.get(img_url, timeout=15)
        img = Image.open(io.BytesIO(img_resp.content))
        img = img.convert("RGB")
        img.thumbnail((400, 400), Image.LANCZOS)

        # 压缩到 ≤60KB
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80, optimize=True)
        buf.seek(0)
        size_kb = len(buf.getvalue()) / 1024
        print(f"   压缩后: {size_kb:.1f}KB")

        with open(cover_local_path, "wb") as f:
            f.write(buf.getvalue())
        print(f"   ✅ 保存成功: {cover_local_path}")

# ─── Step 5: 发布 ─────────────────────────────────────────────
print("\n🚀 [Step 5] 发布到公众号草稿箱...")
try:
    from modules.publisher import publish_draft
    title = chosen_topic
    result = publish_draft(
        title=title,
        html=html,
        cover_url=cover_local_path,
        account_id="yinshuju"
    )
    print(f"   状态: {result['status']}")
    print(f"   消息: {result['message']}")
    if result["status"] == "ok":
        print(f"   ✅ 草稿 ID: {result.get('draft_id', 'N/A')}")
        print(f"   预览链接: {result.get('preview_url', 'N/A')}")
    else:
        print(f"   ⚠️ 详细信息: {result}")
except Exception as e:
    print(f"   ❌ 失败: {e}")
    import traceback; traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
