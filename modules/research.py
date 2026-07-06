"""
模块一：选题搜索 (research)
数据源：荆州新闻网 jznews.com.cn
"""

import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from typing import List, Dict


def research(keyword: str, days: int = 7) -> dict:
    """
    搜索热门选题

    Args:
        keyword: 选题关键词
        days: 搜索最近多少天的内容

    Returns:
        dict with status, topics list
    """
    topics = []

    try:
        # 方案一：抓取荆州新闻网首页头条
        topics = _fetch_jznews_homepage(keyword, days)
    except Exception as e:
        return {
            "status": "error",
            "message": f"抓取失败: {str(e)}",
            "topics": []
        }

    if not topics:
        return {
            "status": "ok",
            "message": "未找到相关选题，请尝试更通用的关键词",
            "topics": []
        }

    return {
        "status": "ok",
        "message": f"找到 {len(topics)} 条相关选题",
        "topics": topics
    }


def _fetch_jznews_homepage(keyword: str, days: int) -> List[Dict]:
    """抓取荆州新闻网首页，筛选含关键词的条目"""
    url = "https://www.jznews.com.cn/"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
    }

    resp = requests.get(url, headers=headers, timeout=10)
    resp.encoding = "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    cutoff = datetime.now() - timedelta(days=days)
    results = []

    # 遍历所有新闻链接
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        text = a.get_text(strip=True)

        # 过滤：关键词匹配 + 有效长度
        if keyword and keyword not in text:
            continue
        if len(text) < 10 or len(text) > 80:
            continue
        if not any(ext in href for ext in [".html", "/news/", "/content/"]):
            continue

        # 尝试找摘要
        parent = a.find_parent(["li", "div", "p"])
        summary = ""
        if parent:
            ps = parent.find_all("p")
            for p in ps:
                p_text = p.get_text(strip=True)
                if 20 < len(p_text) < 200 and p_text != text:
                    summary = p_text
                    break

        results.append({
            "title": text,
            "url": href if href.startswith("http") else f"https://www.jznews.com.cn{href}",
            "summary": summary,
            "source": "荆州新闻网",
            "score": _calc_score(text, keyword),
            "tag": _extract_tag(text)
        })

    # 去重 + 排序
    seen = set()
    unique = []
    for r in results:
        if r["title"] not in seen:
            seen.add(r["title"])
            unique.append(r)

    unique.sort(key=lambda x: x["score"], reverse=True)
    return unique[:20]  # 最多返回20条


def _calc_score(title: str, keyword: str) -> int:
    """计算选题相关度评分"""
    score = 50
    title_lower = title.lower()
    keyword_lower = keyword.lower()

    if keyword_lower in title_lower:
        score += 30
    if any(w in title_lower for w in ["重磅", "最新", "突发", "刚刚", "首次"]):
        score += 10
    if any(w in title_lower for w in ["数据", "报告", "政策", "规划", "亿元", "项目"]):
        score += 15
    if any(w in title_lower for w in ["突破", "增长", "创新", "第一"]):
        score += 10

    return min(score, 100)


def _extract_tag(title: str) -> str:
    """从标题提取分类标签"""
    tags = {
        "文旅": ["文旅", "旅游", "景区", "演出", "赛事", "文化", "博物馆"],
        "民生": ["高考", "中考", "教育", "医疗", "社保", "就业", "房价"],
        "政策": ["政策", "规划", "公文", "通知", "会议", "领导"],
        "经济": ["经济", "产业", "招商", "项目", "企业", "投资", "金融"],
        "农业": ["农业", "乡村", "农村", "振兴", "粮食", "生态"],
        "科技": ["科技", "数字", "智能", "创新", "研发", "工业"],
    }
    for tag, keywords in tags.items():
        if any(kw in title for kw in keywords):
            return tag
    return "综合"
