# CLAUDE.md — Quy chuẩn dự án Sống Đúng Khỏe

> File hướng dẫn dành cho AI tham gia xây dựng website.
> Mọi nội dung tạo ra cho website PHẢI tuân thủ 100% bộ quy chuẩn này
> mà không cần nhắc lại. Chủ website có quyền duyệt tuyệt đối.

## 1. Thông tin thương hiệu

- **Tên thương hiệu:** Sống Đúng Khỏe (Hợp nhất Dưỡng Thân & Dưỡng Tâm)
- **Tác giả / Ban biên tập:** Sống Đúng Khỏe
- **Footer:** `© Sống Đúng Khỏe - Dưỡng Thân Khỏe, Dưỡng Tâm An`
- **Hai nhánh:** `/than/` — Dưỡng Thân (tông xanh lá #2E6F40) · `/tam/` — Dưỡng Tâm (tông nâu trầm #8C5A2B)
- **Nền trang:** trắng kem #FDFBF7 · **Font:** Be Vietnam Pro (tiêu đề thương hiệu: Dancing Script)

## 2. Văn phong bài viết

- Mộc mạc, nhẹ nhàng, truyền cảm; gần gũi như trò chuyện.
- **100% tiếng Việt chuẩn**, không dùng chữ Hán (chỉ dùng âm Hán-Việt Latinh khi cần).
- Xưng hô độc giả: **"chúng ta", "bạn", "độc giả"** — TUYỆT ĐỐI không dùng từ "bác" trong nội dung công khai.
- Độ dài bài viết: **800–1.200 từ**.

## 3. Quy tắc Đông y

- **Luôn viết hoa** tên các tạng phủ: **Can, Tâm, Tỳ, Phế, Thận, Vị** (và các thuật ngữ Đông y quan trọng khác khi cần nhấn mạnh).
- Mọi nhận định Đông y phải có cơ sở từ sách cổ (Hoàng Đế Nội Kinh, Thương Hàn Luận, Nam Dược Thần Hiệu, Hải Thượng Y Tông Tâm Lĩnh...). **Không bịa** dữ liệu, học thuyết, nguồn trích dẫn.
- **Phân biệt rõ** lập luận Đông y với kết luận y học hiện đại.

## 4. Bố cục bài viết chuẩn

1. **Đoạn mô tả ngắn** (1–2 câu) ngay sau tiêu đề H1.
2. **Ảnh minh họa chính** (nếu có) sau đoạn mô tả.
3. **Thân bài** chia đoạn với **Heading (H2) rõ ràng**.
4. **Khung lưu ý y khoa** trang trọng ở cuối bài, nội dung mẫu:
   > *Nội dung trên website mang tính chất tham khảo, chia sẻ kiến thức dưỡng sinh
   > và tu tập, không thay thế cho chẩn đoán hay điều trị y khoa. Khi có vấn đề về
   > sức khỏe, bạn nên tham khảo ý kiến của bác sĩ hoặc thầy thuốc có chuyên môn.*

## 5. Phong cách hình ảnh

- Tranh **màu nước**, phong cách dưỡng sinh **mộc mạc, ấm áp**.
- Tông màu hòa hợp design system: trắng kem, xanh mộc (#2E6F40), nâu ấm (#8C5A2B).
- **Không có chữ** trong ảnh minh họa.
- Đặt tại `public/assets/images/`, tên file ASCII không dấu (vd: `than-mam-com-duong-sinh.jpg`).
- Ảnh bo tròn góc (`border-radius`), bóng đổ nhẹ (`box-shadow`).

## 6. Quy tắc kỹ thuật

- URL mới: **phẳng, ASCII không dấu**, dạng `/than/[slug]/` hoặc `/tam/[slug]/`.
- Mọi trang dùng **đường dẫn tuyệt đối** tới tài nguyên, vd: `/public/assets/css/main.css`.
- Trang chính đặt ở **thư mục gốc** (Cloudflare Pages tìm `index.html` ở root).
- Nội dung bài viết (Markdown + frontmatter) lưu tại `src/content/than/` và `src/content/tam/`.
- Slug ≤ 60 ký tự, chữ thường, gạch nối.
- **Ngày đăng trên web mới = ngày đăng bài lên web mới** (không giữ ngày đăng gốc từ web cũ — ví dụ bài đăng ngày 05/10/2026 thì ghi `05/10/2026`).

## 7. Ranh giới bắt buộc

- Hai website Google Sites cũ **giữ nguyên 100%** — chỉ đọc để bóc tách nội dung, không sửa/xóa/đăng gì.
- **Không thay đổi ý nghĩa** nội dung gốc khi cấu trúc lại.
- Chỉ xuất bản sau khi **chủ website duyệt**.
- Không giả định quyền truy cập tài khoản Cloudflare.
- Token/secret: chỉ dùng tạm qua biến môi trường, **không lưu** vào file, log hay bộ nhớ.
