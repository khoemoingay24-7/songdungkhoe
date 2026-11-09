#!/usr/bin/env python3
"""
tao-podcast-rss.py — tạo file podcast.rss chuẩn podcast cho website Sống Đúng Khỏe.

Quét các bài viết trong than/ và tam/ có gắn file audio (audio Vbee do
tao-audio-bai-viet.py tạo, hoặc audio ngoài trên R2 từ bài Mùa Thu 02 trở đi),
lọc từ ngày 13/10/2026 trở đi, sắp xếp mới nhất
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
    """Thời lượng mp3 (giây) bằng ffprobe; None nếu không đọc được.
    path có thể là file local hoặc URL ngoài (ffprobe đọc được cả hai;
    URL ngoài cần UA trình duyệt vì Cloudflare chặn UA mặc định)."""
    cmd = ["ffprobe", "-v", "error"]
    if path.startswith("http"):
        cmd += ["-user_agent", BROWSER_UA]
    cmd += ["-show_entries", "format=duration", "-of", "csv=p=0", path]
    try:
        out = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60,
        ).stdout.strip()
        return int(float(out))
    except Exception:
        return None


BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
              "AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/124.0 Safari/537.36")


def remote_content_length(url):
    """Độ dài file ngoài (byte) bằng HTTP HEAD; None nếu không lấy được.
    Cần UA trình duyệt vì Cloudflare chặn UA mặc định của Python."""
    import urllib.request
    for _ in range(2):
        try:
            req = urllib.request.Request(
                url, method="HEAD", headers={"User-Agent": BROWSER_UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                n = resp.headers.get("Content-Length")
                return int(n) if n else None
        except Exception:
            continue
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
            m = re.search(r'<audio[^>]*src="([^"]+\.mp3)"', src)
            if not m:
                continue
            audio_path = m.group(1)
            if audio_path.startswith("http"):
                # Audio ngoài (R2): lấy độ dài bằng HEAD, không cần file local
                full_audio = None
                audio_length = remote_content_length(audio_path)
                if audio_length is None:
                    print(f"CẢNH BÁO: không lấy được độ dài audio ngoài {audio_path}, bỏ qua bài {name}")
                    continue
                audio_url = audio_path
            elif audio_path.startswith("/public/assets/audio/bai-viet/"):
                full_audio = os.path.join(REPO, audio_path.lstrip("/"))
                if not os.path.isfile(full_audio):
                    continue
                audio_length = os.path.getsize(full_audio)
                audio_url = f"https://{base}{audio_path}"
            else:
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
            headings = []
            for h in re.findall(r"<h2[^>]*>(.*?)</h2>", src, re.S):
                h = html.unescape(re.sub(r"<[^>]+>", "", h)).strip()
                if h and "nghe bài viết" not in h.lower() and h.lower() != "lưu ý":
                    headings.append(h)
            episodes.append({
                "title": title,
                "desc": desc,
                "headings": headings[:8],
                "url": f"https://{base}/{branch}/{name}/",
                "audio_url": audio_url,
                "audio_file": full_audio,
                "audio_length": audio_length,
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
        "Kênh chính thức của Sống Đúng Khỏe. Nơi chia sẻ các bài viết audio về "
        "Dưỡng Thân & Dưỡng Tâm: nhịp sinh học, giấc ngủ, chánh niệm và lối sống "
        "an lành. Phát sóng định kỳ hàng tuần. Đọc thêm bài viết chi tiết tại "
        "songdungkhoe.com."
    )
    ET.SubElement(ch, "language").text = "vi-VN"
    ET.SubElement(ch, "itunes:author").text = "Sống Đúng Khỏe"
    ET.SubElement(ch, "itunes:summary").text = (
        "Kênh chính thức của Sống Đúng Khỏe. Nơi chia sẻ các bài viết audio về "
        "Dưỡng Thân & Dưỡng Tâm: nhịp sinh học, giấc ngủ, chánh niệm và lối sống "
        "an lành. Phát sóng định kỳ hàng tuần. Đọc thêm bài viết chi tiết tại "
        "songdungkhoe.com."
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
        mo_ta_day_du = ep["desc"]
        if ep.get("headings"):
            mo_ta_day_du += "\n\nCác ý chính trong bài:\n" + "\n".join(f"• {h}" for h in ep["headings"])
        # Link bài viết: neo chữ gọn cho đẹp mắt + dòng URL đầy đủ ngay dưới
        # để link bấm được ở mọi app (Apple Podcasts bản mới không vẽ link
        # neo chữ — chỉ URL viết đầy đủ mới tự thành link bấm được ở đó;
        # Spotify bấm được cả hai dạng). Ghi chú: ElementTree tự escape thẻ
        # <a> thành thực thể XML; khi app podcast đọc RSS, nội dung mô tả
        # vẫn là thẻ <a> thật.
        mo_ta_day_du += (
            f'\n\n<a href="{ep["url"]}">Đọc bài viết đầy đủ tại đây</a>'
            f"\n{ep['url']}"
        )
        mo_ta_day_du += (
            "\n\nNếu thấy bài nghe hữu ích, bạn nhấn [Theo dõi] kênh để không bỏ lỡ "
            "các bài viết tiếp theo nhé!"
        )
        ET.SubElement(item, "description").text = mo_ta_day_du
        ET.SubElement(item, "itunes:summary").text = ep["desc"]
        enc = ET.SubElement(item, "enclosure", {
            "url": ep["audio_url"],
            "type": "audio/mpeg",
            "length": str(ep["audio_length"]),
        })
        dur = audio_duration(ep["audio_file"] or ep["audio_url"])
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
