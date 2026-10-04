# Sống Đúng Khỏe — Website hợp nhất Dưỡng Thân & Dưỡng Tâm

> **Thương hiệu:** Sống Đúng Khỏe (Hợp nhất Dưỡng Thân & Dưỡng Tâm)
> **Tác giả / Ban biên tập:** Sống Đúng Khỏe
> **Footer:** © Sống Đúng Khỏe - Dưỡng Thân Khỏe, Dưỡng Tâm An

## Cấu trúc thư mục

```
songdungkhoe/
├── src/
│   ├── components/      # Header, Footer, Navigation Bar (partial HTML tái sử dụng)
│   ├── layouts/         # base.html — khung trang chuẩn
│   ├── pages/           # Các trang HTML
│   │   ├── index.html        # Trang chủ hợp nhất Thân - Tâm
│   │   ├── gioithieu.html
│   │   ├── lienhe.html
│   │   ├── than/index.html   # Trang chủ Dưỡng Thân
│   │   └── tam/index.html    # Trang chủ Dưỡng Tâm
│   └── content/         # Nội dung bài viết (Markdown + frontmatter)
│       ├── than/
│       └── tam/
├── public/
│   ├── assets/
│   │   ├── css/main.css # Design System
│   │   ├── images/
│   │   └── audio/
│   ├── favicon.ico
│   └── robots.txt
├── README.md
└── .gitignore
```

## Design System (public/assets/css/main.css)

| Thành phần | Giá trị |
|---|---|
| Nền trang | `#FDFBF7` (trắng kem) |
| Nhánh Dưỡng Thân (`/than/`) | `#2E6F40` (xanh lá dưỡng sinh / Sage Green) |
| Nhánh Dưỡng Tâm (`/tam/`) | `#8C5A2B` (nâu trầm / Warm Amber) |
| Font | Be Vietnam Pro (Google Fonts) + fallback hệ thống, cỡ chữ 18px, giãn dòng 1.85 |

Mỗi trang đặt class trên `<body>`: `page-home` | `page-than` | `page-tam`
để tự động đổi màu nhấn của header, nav, hero và footer.

## Quy trình nội dung

1. Bài viết được soạn thảo dạng Markdown + frontmatter trong `src/content/than/` hoặc `src/content/tam/`
   (xem file `bai-mau.md` để biết mẫu frontmatter).
2. Chủ website **duyệt nội dung** trước khi xuất bản — không tự ý đổi ý nghĩa bài gốc.
3. Hai website cũ (Google Sites) **giữ nguyên 100%**, không đụng đến trong mọi giai đoạn.

## Triển khai

Dự kiến: HTML tĩnh → Cloudflare Pages. Địa chỉ thử nghiệm sẽ được cấu hình sau.
