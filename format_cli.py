#!/usr/bin/env python3
"""formatter.py 的 CLI 包装"""
import sys, json
sys.path.insert(0, sys.path[0])
from modules.formatter import format_html
print(json.dumps(format_html(sys.argv[1] if len(sys.argv) > 1 else "", sys.argv[2] if len(sys.argv) > 2 else "journal"), ensure_ascii=False))
