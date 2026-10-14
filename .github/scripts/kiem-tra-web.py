#!/usr/bin/env python3
"""Kiểm tra kỹ thuật website Sống Đúng Khỏe.

Chạy trên GitHub Actions sau mỗi lần push, hoặc chạy local:
    python3 .github/scripts/kiem-tra-web.py

Kiểm tra:
  1. Mỗi trang HTML có đúng 1 thẻ <title> và 1 meta description.
  2. Mọi ảnh <img> đều có alt khác rỗng.
  3. Mọi link nội bộ (href bắt đầu bằng /) đều trỏ tới file có thật.
  4. Sitemap hợp lệ, mọi URL trong sitemap đều có file tương ứng.
  5. Không sót tên miền cũ pages.dev trong link chuẩn/OG/link <a>/<link>
     (pages.dev trong mã nhúng bình luận Remarkbox là CỐ Ý — thread_uri
     chuẩn hóa — nên không tính là lỗi).

Kết quả: in tóm tắt; thoát 1 nếu có lỗi, 0 nếu đạt.
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors = []
warnings = []


def loi(msg):
    errors.append(msg)


def canh_bao(msg):
    warnings.append(msg)


def file_ton_tai(url_path):
    """Kiểm tra URL nội bộ có file tương ứng trong repo không."""
    p = url_path.split("?")[0].split("#")[0]
    if p == "/":
        return (ROOT / "index.html").is_file()
    rel = p.lstrip("/")
    f = ROOT / rel
    if f.is_file():
        return True
    if f.is_dir() and (f / "index.html").is_file():
        return True
    return False


def kiem_tra_html(path, rel):
    src = path.read_text(encoding="utf-8")

    titles = re.findall(r"<title>.*?</title>", src, re.S)
    if len(titles) != 1:
        loi(f"{rel}: có {len(titles)} thẻ <title> (cần đúng 1)")

    metas = re.findall(r'<meta name="description"[^>]*>', src)
    if len(metas) != 1:
        loi(f"{rel}: có {len(metas)} meta description (cần đúng 1)")

    for img in re.findall(r"<img[^>]*>", src):
        if not re.search(r'alt="[^"]+"', img):
            loi(f"{rel}: ảnh thiếu alt: {img[:100]}")

    for href in re.findall(r'href="(/[^"#"]*)"', src):
        if not file_ton_tai(href):
            loi(f"{rel}: link nội bộ hỏng: {href}")

    for href in re.findall(r'<(?:a|link)[^>]*href="([^"]*)"', src):
        if "pages.dev" in href:
            loi(f"{rel}: sót tên miền cũ pages.dev trong link: {href[:100]}")

    for content in re.findall(
        r'<meta property="og:(?:url|image)"[^>]*content="([^"]*)"', src
    ):
        if "pages.dev" in content:
            loi(f"{rel}: sót tên miền cũ pages.dev trong OG: {content[:100]}")


def main():
    checked = 0
    html_files = sorted(ROOT.rglob("*.html"))
    for path in html_files:
        if ".github" in path.parts or "src" in path.parts:
            continue  # bỏ qua script CI và mảnh template/markdown trong src/
        kiem_tra_html(path, str(path.relative_to(ROOT)))
        checked += 1

    # Sitemap
    sitemap = ROOT / "sitemap.xml"
    if not sitemap.is_file():
        loi("thiếu file sitemap.xml")
    else:
        try:
            tree = ET.parse(sitemap)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            locs = [e.text for e in tree.getroot().findall("s:url/s:loc", ns)]
            if not locs:
                loi("sitemap.xml không có URL nào")
            for url in locs:
                m = re.match(r"https://[^/]+(/.*)", url)
                if not m:
                    loi(f"sitemap: URL lạ: {url}")
                    continue
                if not file_ton_tai(m.group(1)):
                    loi(f"sitemap: URL không có file tương ứng: {url}")
        except ET.ParseError as e:
            loi(f"sitemap.xml lỗi XML: {e}")

    print(f"Đã kiểm tra {checked} file HTML.")
    if warnings:
        print(f"Cảnh báo ({len(warnings)}):")
        for w in warnings:
            print("  -", w)
    if errors:
        print(f"LỖI ({len(errors)}):")
        for e in errors:
            print("  -", e)
        return 1
    print("ĐẠT — không phát hiện lỗi kỹ thuật.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
