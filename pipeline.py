"""
PenPulse Pipeline · CLI 接口
接收命令行参数，执行完整链路，返回 JSON
Usage: python3 pipeline.py <keyword> <days> <template_id> <account_id>
"""

import sys
import json

# 添加模块路径
sys.path.insert(0, sys.path[0])

def main():
    args = sys.argv[1:]
    keyword = args[0] if len(args) > 0 else "荆州 文旅"
    days = int(args[1]) if len(args) > 1 else 7
    template_id = args[2] if len(args) > 2 else "journal"
    account_id = args[3] if len(args) > 3 else "yinshuju"

    try:
        from modules.research import research
        from modules.formatter import format_html
        from modules.publisher import publish_draft

        # Step 1: 选题
        r1 = research(keyword, days)
        topics = r1.get("topics", [])
        if topics:
            t = topics[0]
            chosen = t["title"]
            summary = t.get("summary", "")
            source = t.get("source", "")
            tag = t.get("tag", "")
            score = t.get("score", 50)
        else:
            chosen = f"{keyword} 最新资讯"
            summary = source = tag = ""
            score = 50

        # Step 2: 生成内容
        test_md = f"""# {chosen}

## 今日主题

{summary or chosen} 相关深度分析。

## 核心要点

| 指标 | 数据 |
|------|------|
| 信息来源 | {source or "网络"} |
| 分类标签 | {tag or "综合"} |
| 相关度评分 | {score}/100 |

## 详细解读

{summary or '以下为基于公开信息的整理分析。'} 以下几个趋势值得关注：

**第一，趋势在加速。** 政策支持力度持续加大，市场关注度明显提升。

**第二，结构在分化。** 头部效应开始显现，资源向优势领域集中。

**第三，机会在涌现。** 新赛道、新场景不断出现，存在弯道超车窗口期。

## 结语

{keyword} 的故事才刚开始。建议持续关注，及时行动。

*本篇文章由 PenPulse AI 内容自动化工具生成*
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
            result = {
                "status": r4.get("status", "ok"),
                "topic": chosen,
                "source": source,
                "tag": tag,
                "html_length": len(r3.get("html", "")),
                "draft_id": r4.get("draft_id", ""),
                "preview_url": r4.get("preview_url", ""),
                "message": r4.get("message", ""),
            }
        else:
            result = r3

    except Exception as e:
        import traceback
        result = {"status": "error", "message": str(e), "trace": traceback.format_exc()[-300:]}

    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
