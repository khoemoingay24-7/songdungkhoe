#!/usr/bin/env python3
"""Tạo sitemap.xml tự động: quét toàn bộ trang (chủ, nhánh, chuyên mục, bài viết).
Chạy sau mỗi đợt đăng bài. Đặt tại root để gửi Google Search Console."""
import os, re
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
DOMAIN = "https://songdungkhoe-chinhthuc.pages.dev"

def thu_thap():
    urls = ["/", "/than/", "/tam/"]
    for branch in ("than", "tam"):
        bdir = os.path.join(ROOT, branch)
        for dirname in sorted(os.listdir(bdir)):
            p = os.path.join(bdir, dirname, "index.html")
            if os.path.isfile(p):
                urls.append(f"/{branch}/{dirname}/")
    return urls

def main():
    urls = thu_thap()
    today = date.today().isoformat()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{DOMAIN}{u}</loc>")
        lines.append(f"    <lastmod>{today}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    out = os.path.join(ROOT, "sitemap.xml")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"Đã tạo sitemap.xml với {len(urls)} URL.")

if __name__ == "__main__":
    main()
