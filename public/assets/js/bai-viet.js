/* bai-viet.js — Nút Thích / Chia sẻ / Khung bình luận cho trang bài viết Sống Đúng Khỏe.
 *
 * Cách dùng: chèn sau topbar.js, ngay trước </body> của trang BÀI VIẾT:
 *   <script src="/public/assets/js/bai-viet.js"></script>
 * Trang phải có khối <section id="tuongTac"> (xem CLAUDE.md).
 *
 * - Nút Thích: lưu trên máy của người đọc (localStorage), không cần tài khoản.
 * - Chia sẻ: mở Facebook / Zalo ở tab mới; "Sao chép link" chép URL bài viết.
 * - Bình luận (Remarkbox — miễn phí, không quảng cáo, độc giả bình luận không
 *   cần tạo tài khoản): bác đăng ký tại https://www.remarkbox.com (2 phút,
 *   không cần thẻ), tạo Namespace cho website rồi dán SITE ID vào
 *   REMARKBOX_SITE_ID bên dưới (hoặc gửi đoạn mã nhúng cho con tích hợp).
 *   Khi chưa có Site ID, khung bình luận hiện dòng chờ thay vì lỗi.
 */
(function () {
  'use strict';

  var REMARKBOX_SITE_ID = ''; // <-- DÁN SITE ID CỦA REMARKBOX VÀO GIỮA 2 DẤU NHÁY (xem đầu file)

  var khoi = document.getElementById('tuongTac');
  if (!khoi) return;

  /* ---------- Nút Thích (lưu trên máy người đọc) ---------- */
  var nutThich = document.getElementById('nutThich');
  var KHOA_THICH = 'sdk-thich:' + location.pathname;
  function daThich() {
    try { return localStorage.getItem(KHOA_THICH) === '1'; } catch (e) { return false; }
  }
  function veNutThich() {
    if (!nutThich) return;
    var thich = daThich();
    nutThich.setAttribute('aria-pressed', thich ? 'true' : 'false');
    nutThich.innerHTML = (thich ? '❤️' : '🤍') + ' <span>Thích</span>';
  }
  if (nutThich) {
    nutThich.addEventListener('click', function () {
      try { localStorage.setItem(KHOA_THICH, daThich() ? '0' : '1'); } catch (e) {}
      veNutThich();
    });
    veNutThich();
  }

  /* ---------- Nút Chia sẻ ---------- */
  khoi.querySelectorAll('[data-chia-se]').forEach(function (nut) {
    nut.addEventListener('click', function () {
      var loai = nut.getAttribute('data-chia-se');
      var url = location.href;
      if (loai === 'facebook') {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
          '_blank', 'width=640,height=520,noopener');
      } else if (loai === 'zalo') {
        window.open('https://zalo.me/share?url=' + encodeURIComponent(url), '_blank', 'noopener');
      } else if (loai === 'copy') {
        var baoXong = function () {
          var cu = nut.textContent;
          nut.textContent = 'Đã sao chép!';
          setTimeout(function () { nut.textContent = cu; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(baoXong).catch(function () { chepThuCong(); });
        } else { chepThuCong(); }
        function chepThuCong() {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); baoXong(); } catch (e) {}
          document.body.removeChild(ta);
        }
      }
    });
  });

  /* ---------- Khung bình luận Remarkbox ---------- */
  var REMARKBOX_SITE_ID = ''; // <-- DÁN SITE ID CỦA REMARKBOX VÀO GIỮA 2 DẤU NHÁY
  var thread = document.getElementById('khungBinhLuan');
  var choBinhLuan = document.getElementById('binhLuanCho');
  if (thread) {
    if (REMARKBOX_SITE_ID) {
      thread.setAttribute('data-site-id', REMARKBOX_SITE_ID);
      thread.setAttribute('data-thread-uri', location.href);
      if (choBinhLuan) choBinhLuan.style.display = 'none';
      var s = document.createElement('script');
      s.async = true; s.defer = true;
      s.src = 'https://my.remarkbox.com/static/js/remarkbox.js';
      s.setAttribute('data-site-id', REMARKBOX_SITE_ID);
      document.body.appendChild(s);
    } else if (choBinhLuan) {
      choBinhLuan.style.display = '';
    }
  }
})();
