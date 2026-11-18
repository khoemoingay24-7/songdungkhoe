#!/usr/bin/env python3
"""Tạo/cập nhật 14 trang chuyên mục (/than/<slug>/, /tam/<slug>/) từ bài viết hiện có.
Chạy sau mỗi đợt đăng bài. Đọc chuyên mục từ dòng header của bài viết."""
import os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
DOMAIN = "https://songdungkhoe.com"

THAN_CATS = [
    ("ngu-vi-ngu-tang", "Ngũ Vị – Ngũ Tạng", "Năm vị ứng với năm tạng, ăn sao cho hài hòa."),
    ("an-uong", "Ăn Uống", "Dinh dưỡng dưỡng sinh trong bữa ăn hằng ngày."),
    ("giac-ngu", "Giấc Ngủ", "Ngủ ngon, ngủ đúng giờ — gốc của sức khỏe."),
    ("van-dong", "Vận Động", "Vận động vừa sức, khí huyết lưu thông."),
    ("theo-mua", "Theo Mùa", "Dưỡng sinh thuận theo bốn mùa xuân, hạ, thu, đông."),
    ("co-the-len-tieng", "Cơ Thể Lên Tiếng", "Lắng nghe những tín hiệu cơ thể gửi đến mỗi ngày."),
    ("su-that-tin-don", "Sự Thật & Tin Đồn", "Phân biệt sự thật sức khỏe với những lời đồn thổi."),
]
TAM_CATS = [
    ("quan-chieu", "Quán Chiếu", "Nhìn sâu vào nội tâm, hiểu mình để sống nhẹ nhàng hơn."),
    ("37-phuong-phap", "37 Phương Pháp: Bản đồ cho Thân và Tâm", "Ba mươi bảy phương pháp thực hành — tấm bản đồ chăm sóc thân và tâm mỗi ngày."),
    ("song-dang-la", "Sống Đang Là", "Sống trọn vẹn với phút giây hiện tại."),
    ("than-khoe-tam-an", "Thân Khỏe – Tâm An", "Nơi thân và tâm gặp nhau, nuôi dưỡng lẫn nhau."),
    ("tho-truyen", "Thơ & Truyện", "Những vần thơ, câu chuyện chạm đến tâm hồn."),
    ("hoi-dap", "Hỏi Đáp", "Trả lời bạn đọc về những băn khoăn trong đời sống."),
    ("trac-nghiem", "Trắc Nghiệm", "Những bài trắc nghiệm nhỏ để hiểu mình hơn."),
]
# Chuẩn hóa tên chuyên mục ghi trong bài viết -> tên chuẩn
NORM = {
    "Ngũ Vị, Ngũ Tạng": "Ngũ Vị – Ngũ Tạng",
    "Thơ": "Thơ & Truyện",
    "Sự Thật": "Sự Thật & Tin Đồn",  # bài thẻ "Sự Thật &amp; Tin Đồn" bị regex cắt tại &
}
CAT_BY_NAME = {}
for slug, name, desc in THAN_CATS + TAM_CATS:
    CAT_BY_NAME[name] = (slug, name, desc)
BRANCH_OF = {}
for slug, name, desc in THAN_CATS: BRANCH_OF[name] = "than"
for slug, name, desc in TAM_CATS: BRANCH_OF[name] = "tam"
BRANCH_LABEL = {"than": "Dưỡng Thân", "tam": "Dưỡng Tâm"}

def sach_mo_ta(desc):
    """Sa-pô hiển thị trên thẻ: lấy từ meta description của bài, gạt nhãn
    quản lý nội bộ ("Bài N", "chuỗi", "nhánh", "Thẻ ...") và rút gọn tối đa
    170 ký tự (cắt tại ranh giới từ + "…"). File bài KHÔNG bị sửa."""
    s = desc.strip()
    # Bỏ tiền tố "Bài N chuỗi X:" / "Bài N chuỗi X (ghi chú):" ở đầu
    s = re.sub(r"^Bài \d+ chuỗi [^:()]+(?:\([^)]*\))?:\s*", "", s)
    # "Bài viết thuộc chuỗi X giúp bạn" -> "Bài viết giúp bạn"
    s = re.sub(r"Bài viết thuộc chuỗi .+? giúp bạn", "Bài viết giúp bạn", s)
    # Bỏ câu cuối "Bài thứ ... trong chuỗi X." / "trong bài thứ ... chuỗi X."
    s = re.sub(r"\s*Bài thứ \S+ trong chuỗi [^—.]*\.\s*$", "", s)
    s = re.sub(r"\s*trong bài thứ \S+ chuỗi [^—.]*\.\s*$", "", s)
    # Bỏ mệnh đề giữa câu "Bài mở đầu/thứ ... chuỗi "X" —"
    s = re.sub(r"\s*Bài (?:mở đầu|thứ \S+) (?:trong )?chuỗi [“\"][^”\"]+[”\"] —\s*", " ", s)
    # Bỏ "Bài mở thẻ X: " giữa câu
    s = re.sub(r"\s*Bài mở thẻ [^:]+:\s*", " ", s)
    # Bỏ dòng thẻ cuối " Thẻ X, Dưỡng Tâm."
    s = re.sub(r"\s*Thẻ [^.]*\.\s*$", "", s)
    # Bỏ ", nhánh Dưỡng Thân/Tâm." cuối câu
    s = re.sub(r",\s*nhánh Dưỡng (?:Thân|Tâm)\.\s*$", ".", s)
    # Viết hoa đầu câu sau dấu chấm (khi câu trước bị gạt bỏ)
    s = re.sub(r"(^|[.?!]\s+)([a-zàáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ])",
               lambda m: m.group(1) + m.group(2).upper(), s)
    s = re.sub(r"\s+", " ", s).strip()
    if s and s[-1] not in ".!?…\"”":
        s += "."
    # Rút gọn tối đa 170 ký tự, cắt tại ranh giới từ
    if len(s) > 170:
        cut = s[:167]
        i = cut.rfind(" ")
        s = (cut[:i] if i > 120 else cut) + "…"
    return s

def doc_bai(branch, dirname):
    p = os.path.join(ROOT, branch, dirname, "index.html")
    src = open(p, encoding="utf-8").read()
    if "<!-- TRANG-CHUYEN-MUC -->" in src:
        return None  # bỏ qua trang chuyên mục
    t = re.search(r"<title>(.*?)</title>", src, re.S)
    title = html.unescape(t.group(1)).split("|")[0].strip() if t else dirname
    m = re.search(r'<meta name="description" content="(.*?)"', src, re.S)
    desc = html.unescape(m.group(1)).strip() if m else ""
    c = re.search(r"Dưỡng (?:Thân|Tâm) &middot; ([^&<]*)", src)
    cat = html.unescape(c.group(1)).strip() if c else ""
    cat = NORM.get(cat, cat)
    # quiz trắc nghiệm bên nhánh Thân -> gom vào Ăn Uống (loạt quiz ăn uống)
    if branch == "than" and cat.lower() == "trắc nghiệm":
        cat = "Ăn Uống"
    # chuẩn hóa không phân biệt hoa/thường
    low = {k.lower(): v for k, v in CAT_BY_NAME.items()}
    if cat.lower() in low:
        cat = low[cat.lower()][1]
    if cat not in CAT_BY_NAME:
        return None
    d = re.search(r"Ngày đăng:?\s*(\d{2}/\d{2}/\d{4})", src)
    ngay = d.group(1) if d else ""
    # Ảnh hero: <img class="hero-img">; nếu bài không có (quiz/trang audio),
    # lấy ảnh đầu tiên trong bài trừ logo; không có ảnh thì bỏ trống.
    img = re.search(r'<img class="hero-img" src="([^"]+)" alt="([^"]*)"', src)
    anh, alt = (img.group(1), html.unescape(img.group(2))) if img else ("", "")
    if not anh:
        for m_img in re.finditer(r'<img[^>]+src="([^"]+)"(?:[^>]*alt="([^"]*)")?', src):
            if "logo.png" in m_img.group(1):
                continue
            anh = m_img.group(1)
            alt = html.unescape(m_img.group(2)) if m_img.group(2) else "Ảnh minh họa bài viết"
            break
    # Audio giọng đọc của bài (khung phát trong bài); quiz/trang audio không có.
    au = re.search(r'<audio[^>]*src="([^"]+)"', src)
    audio = au.group(1) if au else ""
    return {"title": title, "desc": sach_mo_ta(desc), "cat": cat,
            "url": f"/{branch}/{dirname}/", "ngay": ngay,
            "anh": anh, "alt": alt, "audio": audio, "slug": dirname}

def template_parts(branch):
    """Tách template trang nhánh thành (trước <main>, sau </main>)."""
    src = open(os.path.join(ROOT, branch, "index.html"), encoding="utf-8").read()
    a = src.find("<main>")
    b = src.find("</main>") + len("</main>")
    return src[:a], src[b:]

def main():
    bai_viet = []
    for branch in ("than", "tam"):
        for dirname in sorted(os.listdir(os.path.join(ROOT, branch))):
            if dirname == "index.html" or "." in dirname:
                continue
            b = doc_bai(branch, dirname)
            if b: bai_viet.append(b)
    dem = 0
    for branch, cats in (("than", THAN_CATS), ("tam", TAM_CATS)):
        head, tail = template_parts(branch)
        nav_active = "than" if branch == "than" else "tam"
        for slug, name, desc in cats:
            ds = [b for b in bai_viet if b["cat"] == name]
            def the_gon(b):
                anh_html = (f'<a href="{b["url"]}"><img class="anh-nho" src="{html.escape(b["anh"])}" '
                            f'alt="{html.escape(b["alt"])}" loading="lazy"></a>') if b["anh"] else ""
                am_thanh = ""
                if b["audio"]:
                    am_thanh = (f'<audio id="audio-{branch}-{b["slug"]}" class="an" preload="none" '
                                f'src="{html.escape(b["audio"])}"></audio>\n'
                                f'              <button class="nut-nghe{" tam" if branch == "tam" else ""} nho" type="button" '
                                f'aria-controls="audio-{branch}-{b["slug"]}" aria-pressed="false">'
                                f'<span aria-hidden="true">🔊</span> Nghe</button>')
                return (f'''        <article class="the-gon {branch}">
          {anh_html}
          <div class="noi-dung-gon">
            <h3><a href="{b["url"]}">{html.escape(b["title"])}</a></h3>
            <p class="sa-po">{html.escape(b["desc"])}</p>
            <div class="hang-duoi">
              <span class="meta-gon">{html.escape(b["cat"])} &middot; {html.escape(b["ngay"])}</span>
              {am_thanh}
            </div>
          </div>
        </article>''')
            cards = "\n".join(the_gon(b) for b in ds) or '        <p style="color:var(--muted)">Chuyên mục đang được bổ sung bài viết — mời bạn quay lại sau.</p>'
            url_tuyet_doi = f"{DOMAIN}/{branch}/{slug}/"
            # Khối tặng ebook (bảng chung thẻ -> ấn bản; bền qua các lần tái tạo trang)
            EBOOKS = {
                "giac-ngu": ("Giấc Ngủ", "ebooks/giac-ngu.pdf", "Ấn bản tháng 11/2026"),
                "quan-chieu": ("Quán Chiếu", "ebooks/quan-chieu.pdf", "Ấn bản tháng 11/2026"),
            }
            khoi_ebook = ""
            if slug in EBOOKS:
                ten_ebook, pdf_ebook, an_ban = EBOOKS[slug]
                khoi_ebook = f"""
      <div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:18px 0;">
        <p style="margin:0 0 8px;">🎁 <strong>Ebook tặng bạn đọc</strong></p>
        <p style="margin:0 0 12px;">Cảm ơn bạn đã dành thời gian đọc và đồng hành cùng Sống Đúng Khỏe. Ebook {ten_ebook} — mục tải về có trên trang songdungkhoe — bấm vào là tải về ngay, không cần để lại email, không mất phí.</p>
        <p style="margin:0;"><a class="xem-them" href="https://media.songdungkhoe.com/{pdf_ebook}" target="_blank" rel="noopener">Tải ebook {ten_ebook} (PDF · {an_ban}) ↓</a></p>
      </div>"""
            main_html = f'''<main>
<!-- TRANG-CHUYEN-MUC -->
    <section class="wrap-narrow">
      <p style="color:var(--muted);font-size:15px;"><a href="/{branch}/">{BRANCH_LABEL[branch]}</a> &middot; Chuyên mục</p>
      <h1>{html.escape(name)}</h1>
      <p class="article-desc">{html.escape(desc)}</p>{khoi_ebook}
      <div class="danh-sach-gon">
{cards}
      </div>
    </section>
  </main>'''
            # head chứa <head> của trang nhánh -> thay title/meta + thêm OG
            head2 = re.sub(r"<title>.*?</title>",
                f"<title>{html.escape(name)} | {BRANCH_LABEL[branch]} | Sống Đúng Khỏe</title>", head, count=1, flags=re.S)
            head2 = re.sub(r'<meta name="description" content=".*?"',
                f'<meta name="description" content="{html.escape(desc)}">', head2, count=1)
            og = (f'\n  <meta property="og:type" content="website">'
                  f'\n  <meta property="og:title" content="{html.escape(name)} | {BRANCH_LABEL[branch]} | Sống Đúng Khỏe">'
                  f'\n  <meta property="og:description" content="{html.escape(desc)}">'
                  f'\n  <meta property="og:url" content="{url_tuyet_doi}">'
                  f'\n  <meta property="og:image" content="{DOMAIN}/public/assets/images/logo.png">')
            # canonical: gỡ canonical của trang nhánh (kế thừa từ head mẫu) rồi gắn đúng URL chuyên mục
            head2 = re.sub(r'\n *<link rel="canonical"[^>]*>', '', head2, count=1)
            og += f'\n  <link rel="canonical" href="{url_tuyet_doi}">'
            head2 = head2.replace("</head>", og + "\n</head>", 1)
            # active nav
            head2 = re.sub(r'<a href="/(than|tam)/"( class="active")?>',
                lambda m: f'<a href="/{m.group(1)}/"' + (' class="active"' if m.group(1) == nav_active else '') + '>',
                head2)
            out_dir = os.path.join(ROOT, branch, slug)
            os.makedirs(out_dir, exist_ok=True)
            trang = head2 + main_html + tail
            # Nút "Nghe" trên thẻ cần the-nghe.js (gắn vào trang chuyên mục
            # sinh ra; trang nhánh gốc không đổi).
            trang = trang.replace("</body>",
                '<script src="/public/assets/js/the-nghe.js"></script>\n</body>', 1)
            open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8").write(trang)
            dem += 1
            print(f"  /{branch}/{slug}/: {len(ds)} bài")
    print(f"Đã tạo {dem} trang chuyên mục.")

if __name__ == "__main__":
    main()
