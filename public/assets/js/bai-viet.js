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
 *   không cần thẻ), tạo Namespace cho website rồi vào phần cài đặt Namespace
 *   lấy "rb_owner_key" (một chuỗi UUID) dán vào REMARKBOX_OWNER_KEY bên dưới
 *   (hoặc gửi đoạn mã nhúng cho con tích hợp).
 *   Khi chưa có owner key, khung bình luận hiện dòng chờ thay vì lỗi.
 *   Nhúng theo đoạn mã chính thức của Remarkbox: iframe tới
 *   https://my.remarkbox.com/embed?rb_owner_key=... kèm thư viện iframe-resizer.
 *   Lưu ý: Namespace gắn với tên miền — khi đổi sang songdungkhoe.com thì cập
 *   nhật tên miền trong cài đặt Namespace (nếu không khung bình luận có thể
 *   không hiện).
 */
(function () {
  'use strict';

  var REMARKBOX_OWNER_KEY = 'b4b0cf51-c2c8-11f1-8020-040140774501'; // mã của bác (điền 08/10/2026)

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

  /* ---------- Khung bình luận Remarkbox (iframe chính thức) ---------- */
  var thread = document.getElementById('khungBinhLuan');
  var choBinhLuan = document.getElementById('binhLuanCho');
  if (thread) {
    if (REMARKBOX_OWNER_KEY) {
      if (choBinhLuan) choBinhLuan.style.display = 'none';
      var srcBinhLuan = 'https://my.remarkbox.com/embed' +
        '?rb_owner_key=' + encodeURIComponent(REMARKBOX_OWNER_KEY) +
        '&thread_title=' + encodeURI(document.title) +
        '&thread_uri=' + encodeURIComponent(location.href) +
        '&mode=light' + (location.hash || '');
      var goiY = document.createElement('p');
      goiY.className = 'goi-y-binh-luan';
      goiY.textContent = 'Mời bạn chia sẻ cảm nghĩ bên dưới (chỉ cần điền tên và email, không cần tạo tài khoản).';
      thread.appendChild(goiY);
      var khung = document.createElement('iframe');
      khung.id = 'remarkbox-iframe';
      khung.setAttribute('scrolling', 'no');
      khung.setAttribute('src', srcBinhLuan);
      khung.setAttribute('frameborder', '0');
      khung.setAttribute('tabindex', '0');
      khung.setAttribute('title', 'Khung bình luận');
      khung.style.width = '100%';
      khung.style.border = 'none';
      thread.appendChild(khung);
      var thuVien = document.createElement('script');
      thuVien.src = 'https://my.remarkbox.com/static/js/iframe-resizer/iframeResizer.min.js';
      thuVien.onload = function () {
        try {
          if (window.iFrameResize) {
            iFrameResize(
              { checkOrigin: ['https://my.remarkbox.com'], inPageLinks: true },
              document.getElementById('remarkbox-iframe')
            );
          }
        } catch (e) {}
      };
      document.body.appendChild(thuVien);
    } else if (choBinhLuan) {
      choBinhLuan.style.display = '';
    }
  }
})();
