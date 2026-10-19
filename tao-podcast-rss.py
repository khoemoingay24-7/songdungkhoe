#!/usr/bin/env python3
"""
tao-podcast-rss.py — tạo file podcast.rss chuẩn podcast cho website Sống Đúng Khỏe.

Quét các bài viết trong than/ và tam/ có gắn file audio (audio Vbee do
tao-audio-bai-viet.py tạo), lọc từ ngày 13/10/2026 trở đi, sắp xếp mới nhất
trước, ghi ra podcast.rss ở thư mục gốc repo — sẵn sàng đưa vào Spotify.

Chạy mỗi khi đăng bài mới (các job release đều gọi script này):
    cd /home/hatch/workspace/songdungkhoe && python3 tao-podcast-rss.py
"""
import os
import re
import html
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

REPO = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(REPO, "public", "assets", "audio", "bai-viet")
MIN_DATE = datetime(2026, 10, 13)  # chỉ lấy bài từ ngày này trở đi
RSS_FILE = os.path.join(REPO, "podcast.rss")


def base_url():
    """Lấy tên miền chính từ sitemap.xml, fallback songdungkhoe.com."""
    try:
        src = open(os.path.join(REPO, "sitemap.xml"), encoding="utf-8").read()
        m = re.search(r"<loc>https://([^/]+)", src)
        if m:
            return m.group(1)
    except FileNotFoundError:
        pass
    return "songdungkhoe.com"


def audio_duration(path):
    """Thời lượng mp3 (giây) bằng ffprobe; None nếu không đọc được."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return int(float(out))
    except Exception:
        return None


def collect_episodes():
    base = base_url()
    episodes = []
    for branch in ("than", "tam"):
        bdir = os.path.join(REPO, branch)
        if not os.path.isdir(bdir):
            continue
        for name in sorted(os.listdir(bdir)):
            p = os.path.join(bdir, name, "index.html")
            if not os.path.isfile(p):
                continue
            src = open(p, encoding="utf-8").read()
            if "<!-- TRANG-CHUYEN-MUC -->" in src:
                continue
            m = re.search(r'<audio[^>]*src="(/public/assets/audio/bai-viet/[^"]+\.mp3)"', src)
            if not m:
                continue
            audio_path = m.group(1)
            full_audio = os.path.join(REPO, audio_path.lstrip("/"))
            if not os.path.isfile(full_audio):
                continue
            d = re.search(r"Ngày đăng:\s*(\d{2})/(\d{2})/(\d{4})", src)
            if not d:
                continue
            ngay = datetime(int(d.group(3)), int(d.group(2)), int(d.group(1)))
            if ngay < MIN_DATE:
                continue
            t = re.search(r"<title>(.*?)</title>", src, re.S)
            title = html.unescape(t.group(1)).split("|")[0].strip() if t else name
            md = re.search(r'<meta name="description" content="(.*?)"', src, re.S)
            desc = html.unescape(md.group(1)).strip() if md else title
            episodes.append({
                "title": title,
                "desc": desc,
                "url": f"https://{base}/{branch}/{name}/",
                "audio_url": f"https://{base}{audio_path}",
                "audio_file": full_audio,
                "date": ngay,
            })
    # mới nhất trước (chuẩn podcast)
    episodes.sort(key=lambda e: e["date"], reverse=True)
    return base, episodes


def rfc822(dt):
    vn = dt.replace(tzinfo=timezone(timedelta(hours=7)))
    return vn.strftime("%a, %d %b %Y %H:%M:%S %z")


def build_rss(base, episodes):
    rss = ET.Element("rss", {
        "version": "2.0",
        "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
        "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
    })
    ch = ET.SubElement(rss, "channel")
    ET.SubElement(ch, "title").text = "Sống Đúng Khỏe — Nghe bài viết"
    ET.SubElement(ch, "link").text = f"https://{base}/"
    ET.SubElement(ch, "description").text = (
        "Nghe đọc các bài viết Dưỡng Thân và Dưỡng Tâm của website Sống Đúng Khỏe: "
        "đông y dưỡng sinh, giấc ngủ, vận động, chánh niệm và sống an lành mỗi ngày."
    )
    ET.SubElement(ch, "language").text = "vi-VN"
    ET.SubElement(ch, "itunes:author").text = "Sống Đúng Khỏe"
    ET.SubElement(ch, "itunes:summary").text = (
        "Nghe đọc các bài viết Dưỡng Thân và Dưỡng Tâm của website Sống Đúng Khỏe."
    )
    ET.SubElement(ch, "itunes:explicit").text = "no"
    ET.SubElement(ch, "itunes:type").text = "episodic"
    owner = ET.SubElement(ch, "itunes:owner")
    ET.SubElement(owner, "itunes:name").text = "Sống Đúng Khỏe"
    ET.SubElement(owner, "itunes:email").text = "moidalat@gmail.com"
    cat = ET.SubElement(ch, "itunes:category", {"text": "Health & Fitness"})
    ET.SubElement(cat, "itunes:category", {"text": "Alternative Health"})
    ET.SubElement(ch, "itunes:image", {"href": f"https://{base}/public/assets/images/logo.png"})

    for ep in episodes:
        item = ET.SubElement(ch, "item")
        ET.SubElement(item, "title").text = ep["title"]
        ET.SubElement(item, "link").text = ep["url"]
        guid = ET.SubElement(item, "guid", {"isPermaLink": "false"})
        guid.text = f"songdungkhoe-{ep['url'].rstrip('/').rsplit('/', 1)[-1]}"
        ET.SubElement(item, "pubDate").text = rfc822(ep["date"])
        ET.SubElement(item, "description").text = ep["desc"]
        enc = ET.SubElement(item, "enclosure", {
            "url": ep["audio_url"],
            "type": "audio/mpeg",
            "length": str(os.path.getsize(ep["audio_file"])),
        })
        dur = audio_duration(ep["audio_file"])
        if dur:
            ET.SubElement(item, "itunes:duration").text = str(dur)
        ET.SubElement(item, "itunes:episodeType").text = "full"

    tree = ET.ElementTree(rss)
    ET.indent(tree, space="  ")
    tree.write(RSS_FILE, encoding="utf-8", xml_declaration=True)
    return len(episodes)


def main():
    base, episodes = collect_episodes()
    n = build_rss(base, episodes)
    # kiểm tra XML hợp lệ
    ET.parse(RSS_FILE)
    print(f"RSS_OK: {n} tập, base=https://{base}/, file={RSS_FILE}")


if __name__ == "__main__":
    main()
