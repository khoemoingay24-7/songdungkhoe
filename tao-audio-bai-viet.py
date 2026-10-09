#!/usr/bin/env python3
"""Tạo file audio giọng đọc Vbee cho một bài viết và gắn khung phát vào HTML.

Cách dùng:
  python3 tao-audio-bai-viet.py <đường-dẫn-index.html-bài-viết> <slug-mp3> [--voice VOICE_CODE]

- Trích văn bản đọc từ HTML (tiêu đề + các đoạn, bỏ chú thích ảnh/meta/email).
- Gọi Vbee Batch API (giọng mặc định: Chí Đạt nam miền Nam, tốc độ 0.95, ngắt nghỉ thoáng).
- Chèn khung phát 🎧 trước <p class="article-desc">.
- File MP3 lưu vào public/assets/audio/bai-viet/<slug-mp3>.mp3
"""
import re
import html
import os
import subprocess
import sys

APP_ID = "349e9252-b35b-46f2-b358-0241d1fae866"
VOICE_DEFAULT = "sg_male_chidat_ebook_48k-phg"
REPO = "/home/hatch/workspace/songdungkhoe"
VBEE_CLI = "/home/hatch/workspace/skills/vbee/bin/vbee-tts.py"

PLAYER_TPL = '''<div class="nghe-bai-viet" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:700;">🎧 Nghe bài viết</p>
      <audio controls preload="none" style="width:100%;" src="/public/assets/audio/bai-viet/{mp3}">
        Trình duyệt của bạn không hỗ trợ phát âm thanh.
      </audio>
      <p style="margin:8px 0 0;font-size:14px;color:var(--muted);">Giọng đọc ấm, dành cho những đôi mắt cần nghỉ ngơi.</p>
    </div>
    '''


def trich_van_ban(path):
    src = open(path, encoding="utf-8").read()
    a = src.find('<article class="article">')
    b = src.find("Email liên hệ:")
    if a < 0:
        raise ValueError("không tìm thấy <article>")
    noidung = src[a:b if b > 0 else len(src)]
    # tiêu đề bài
    t = re.search(r"<title>(.*?)</title>", src, re.S)
    tieude = html.unescape(t.group(1)).split("|")[0].strip() if t else ""
    parts = re.findall(r"<(h2|p)[^>]*>(.*?)</\1>", noidung, re.S)
    out = []
    for tag, inner in parts:
        x = html.unescape(re.sub(r"<[^>]+>", "", inner)).strip()
        x = re.sub(r"\s+", " ", x)
        if not x:
            continue
        if "minh họa bài viết" in x:
            continue
        if x.startswith("Dưỡng Thân ·") or x.startswith("Dưỡng Tâm ·"):
            continue
        out.append(x)
    full = (tieude + ".\n\n" if tieude else "") + "\n\n".join(out)
    # bỏ thuật ngữ Pali khó đọc (giọng máy sẽ ngọng)
    full = re.sub(r"\([A-Za-z\-]+:\s*", "(", full)
    return full


def main():
    if len(sys.argv) < 3:
        print("Dùng: tao-audio-bai-viet.py <index.html> <slug-mp3> [--voice CODE]")
        return 2
    html_path = sys.argv[1]
    slug = sys.argv[2]
    voice = VOICE_DEFAULT
    if "--voice" in sys.argv:
        voice = sys.argv[sys.argv.index("--voice") + 1]

    text = trich_van_ban(html_path)
    print(f"[audio] {html_path}: {len(text)} ký tự, giọng {voice}")
    if len(text) > 90000:
        print("[audio] CẢNH BÁO: văn bản quá dài, Vbee giới hạn 100.000 ký tự")
    txt_path = f"/tmp/audio-{slug}.txt"
    open(txt_path, "w", encoding="utf-8").write(text)

    mp3_rel = f"public/assets/audio/bai-viet/{slug}.mp3"
    mp3_abs = os.path.join(REPO, mp3_rel)
    os.makedirs(os.path.dirname(mp3_abs), exist_ok=True)
    r = subprocess.run(
        [sys.executable, VBEE_CLI, "--app-id", APP_ID,
         "--voice-code", voice, "--text-file", txt_path,
         "--output", mp3_abs, "--speed", "0.95", "--pause-scale", "1.3"],
        capture_output=True, text=True, timeout=900)
    print(r.stdout[-800:])
    if r.returncode != 0 or not os.path.isfile(mp3_abs) or os.path.getsize(mp3_abs) < 50000:
        print(f"[audio] LỖI: không tạo được MP3 (stderr: {r.stderr[-300:]})")
        return 3
    print(f"[audio] MP3 xong: {mp3_rel} ({os.path.getsize(mp3_abs)//1024} KB)")

    # gắn khung phát vào HTML
    src = open(html_path, encoding="utf-8").read()
    if "nghe-bai-viet" in src:
        print("[audio] khung phát đã có sẵn, bỏ qua")
    else:
        neo = '<p class="article-desc">'
        if src.count(neo) != 1:
            print(f"[audio] LỖI: tìm thấy {src.count(neo)} vị trí article-desc, không dám chèn")
            return 4
        src = src.replace(neo, PLAYER_TPL.format(mp3=f"{slug}.mp3") + neo, 1)
        open(html_path, "w", encoding="utf-8").write(src)
        print("[audio] đã gắn khung phát vào HTML")
    print(f"AUDIO_OK {mp3_rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
