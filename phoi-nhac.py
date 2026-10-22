#!/usr/bin/env python3
"""Phối nhạc nền chuẩn cho audio bài viết Sống Đúng Khỏe (bác duyệt 22/10/2026).

Cách phối (giữ nguyên như bản mẫu "Ba ngọn lửa" bác đã nghe duyệt):
- Mở đầu: bài nhạc Suno của bác ("Biết ơn giấc ngủ") chơi ~14 giây đầu.
- Giữa bài: nhạc đệm "chữ ký" tự sáng tác (vòng 32 giây) chạy nhẹ dưới giọng đọc,
  tự nhỏ xuống né giọng (sidechain ducking).
- Kết thúc: đoạn cuối bài Suno quay lại ~17 giây tiễn người nghe.
- Chuẩn hóa loudnorm -16 LUFS như các bản mẫu đã duyệt.

Dùng: python3 phoi-nhac.py <file-giong-doc.mp3>  (phối tại chỗ, ghi đè file)
In ra MIX_OK khi thành công; lỗi thì thoát mã 1 và GIỮ NGUYÊN file gốc.
"""
import json
import os
import subprocess
import sys

REPO = "/home/hatch/workspace/songdungkhoe"
SUNO = os.path.join(REPO, "du-lieu-nhac", "nhac-mo-dau-ket-thuc-suno.mp3")
BED = os.path.join(REPO, "du-lieu-nhac", "nhac-dem-chu-ky.wav")

VOICE_DELAY = 14.0      # giây nhạc mở đầu trước khi giọng đọc bắt đầu
INTRO_LEN = 15.0        # độ dài đoạn Suno lấy ở đầu
OUTRO_LEN = 16.68       # độ dài đoạn Suno lấy ở cuối bài nhạc
OUTRO_GAP = 1.0         # khoảng lặng sau khi giọng đọc dứt rồi nhạc kết mới vào


def duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", path],
        capture_output=True, text=True)
    return float(json.loads(r.stdout)["format"]["duration"])


def main():
    if len(sys.argv) < 2:
        print("Dùng: phoi-nhac.py <file-giong-doc.mp3>")
        return 2
    voice_path = sys.argv[1]
    for p in (voice_path, SUNO, BED):
        if not os.path.isfile(p):
            print(f"[phoi-nhac] LỖI: không thấy file {p}")
            return 1
    v_dur = duration(voice_path)
    s_dur = duration(SUNO)
    voice_end = VOICE_DELAY + v_dur
    outro_start = voice_end + OUTRO_GAP
    outro_src = s_dur - OUTRO_LEN
    total = outro_start + OUTRO_LEN
    bed_end = voice_end + 6
    tmp = voice_path + ".mix.mp3"

    fc = (
        f"[0:a]aresample=44100,adelay={int(VOICE_DELAY*1000)}|{int(VOICE_DELAY*1000)},apad=pad_dur=25[voice];"
        f"[1:a]aresample=44100,asplit=2[sunoA][sunoB];"
        f"[sunoA]atrim=0:{INTRO_LEN},asetpts=PTS-STARTPTS,"
        f"afade=t=in:st=0:d=1.5,afade=t=out:st=11:d=4[intro];"
        f"[sunoB]atrim={outro_src}:{s_dur},asetpts=PTS-STARTPTS,"
        f"adelay={int(outro_start*1000)}|{int(outro_start*1000)},"
        f"afade=t=in:st={outro_start}:d=3[outro];"
        f"[2:a]aresample=44100,atrim=0:{bed_end},asetpts=PTS-STARTPTS,"
        f"adelay=10000|10000,volume=0.9,"
        f"afade=t=in:st=10:d=4,afade=t=out:st={max(10.0, voice_end - 0.5)}:d=4[mus];"
        f"[mus][voice]sidechaincompress=threshold=0.02:ratio=10:attack=250:release=1200:makeup=1[ducked];"
        f"[voice][ducked][intro][outro]amix=inputs=4:duration=longest:normalize=0,"
        f"atrim=0:{total},afade=t=out:st={total-4}:d=4,"
        f"loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    )
    r = subprocess.run(
        ["ffmpeg", "-y", "-v", "error",
         "-i", voice_path, "-i", SUNO, "-stream_loop", "-1", "-i", BED,
         "-filter_complex", fc, "-map", "[out]", "-b:a", "128k", tmp],
        capture_output=True, text=True, timeout=1800)
    if r.returncode != 0 or not os.path.isfile(tmp) or os.path.getsize(tmp) < 50000:
        print(f"[phoi-nhac] LỖI ffmpeg: {r.stderr[-400:]}")
        if os.path.isfile(tmp):
            os.remove(tmp)
        return 1
    os.replace(tmp, voice_path)
    print(f"MIX_OK {voice_path} ({duration(voice_path):.1f} giay, da phoi nhac chuan)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
