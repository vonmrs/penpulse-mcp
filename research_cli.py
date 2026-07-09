#!/usr/bin/env python3
"""research.py 的 CLI 包装"""
import sys, json
sys.path.insert(0, sys.path[0])
from modules.research import research
print(json.dumps(research(sys.argv[1] if len(sys.argv) > 1 else "", int(sys.argv[2]) if len(sys.argv) > 2 else 7), ensure_ascii=False))
