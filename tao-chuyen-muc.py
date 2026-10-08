#!/usr/bin/env python3
"""Tạo/cập nhật 14 trang chuyên mục (/than/<slug>/, /tam/<slug>/) từ bài viết hiện có.
Chạy sau mỗi đợt đăng bài. Đọc chuyên mục từ dòng header của bài viết."""
import os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
DOMAIN = "https://songdungkhoe-chinhthuc.pages.dev"

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
}
CAT_BY_NAME = {}
for slug, name, desc in THAN_CATS + TAM_CATS:
    CAT_BY_NAME[name] = (slug, name, desc)
BRANCH_OF = {}
for slug, name, desc in THAN_CATS: BRANCH_OF[name] = "than"
for slug, name, desc in TAM_CATS: BRANCH_OF[name] = "tam"
BRANCH_LABEL = {"than": "Dưỡng Thân", "tam": "Dưỡng Tâm"}

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
    return {"title": title, "desc": desc, "cat": cat,
            "url": f"/{branch}/{dirname}/", "ngay": ngay}

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
            cards = "\n".join(
                f'''        <a class="cat-card" href="{b["url"]}">
          <h3>{html.escape(b["title"])}</h3>
          <p>{html.escape(b["desc"])}</p>
        </a>''' for b in ds) or '        <p style="color:var(--muted)">Chuyên mục đang được bổ sung bài viết — mời bạn quay lại sau.</p>'
            url_tuyet_doi = f"{DOMAIN}/{branch}/{slug}/"
            main_html = f'''<main>
<!-- TRANG-CHUYEN-MUC -->
    <section class="wrap-narrow">
      <p style="color:var(--muted);font-size:15px;"><a href="/{branch}/">{BRANCH_LABEL[branch]}</a> &middot; Chuyên mục</p>
      <h1>{html.escape(name)}</h1>
      <p class="article-desc">{html.escape(desc)}</p>
      <div class="cat-grid">
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
            head2 = head2.replace("</head>", og + "\n</head>", 1)
            # active nav
            head2 = re.sub(r'<a href="/(than|tam)/"( class="active")?>',
                lambda m: f'<a href="/{m.group(1)}/"' + (' class="active"' if m.group(1) == nav_active else '') + '>',
                head2)
            out_dir = os.path.join(ROOT, branch, slug)
            os.makedirs(out_dir, exist_ok=True)
            open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8").write(head2 + main_html + tail)
            dem += 1
            print(f"  /{branch}/{slug}/: {len(ds)} bài")
    print(f"Đã tạo {dem} trang chuyên mục.")

if __name__ == "__main__":
    main()
