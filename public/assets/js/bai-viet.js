/* bai-viet.js — Nút Thích / Chia sẻ / Khung bình luận cho trang bài viết Sống Đúng Khỏe.
 *
 * Cách dùng: chèn sau topbar.js, ngay trước </body> của trang BÀI VIẾT:
 *   <script src="/public/assets/js/bai-viet.js"></script>
 * Trang phải có khối <section id="tuongTac"> (xem CLAUDE.md).
 *
 * - Nút Thích: lưu trên máy của người đọc (localStorage), không cần tài khoản.
 * - Chia sẻ: mở Facebook / Zalo ở tab mới; "Sao chép link" chép URL bài viết.
 * - Bình luận (Cusdis): điền CUSDIS_APP_ID bên dưới sau khi tạo tài khoản tại
 *   https://cusdis.com (miễn phí, khoảng 2 phút) rồi copy App ID vào đây.
 *   Khi chưa có App ID, khung bình luận hiện dòng chờ thay vì lỗi.
 */
(function () {
  'use strict';

  var CUSDIS_APP_ID = ''; // <-- DÁN APP ID CỦA CUSDIS VÀO GIỮA 2 DẤU NHÁY

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

  /* ---------- Khung bình luận Cusdis ---------- */
  var thread = document.getElementById('cusdis_thread');
  var choBinhLuan = document.getElementById('binhLuanCho');
  if (thread) {
    if (CUSDIS_APP_ID) {
      thread.setAttribute('data-host', 'https://cusdis.com');
      thread.setAttribute('data-app-id', CUSDIS_APP_ID);
      thread.setAttribute('data-page-id', location.pathname);
      thread.setAttribute('data-page-url', location.href);
      thread.setAttribute('data-page-title', document.title);
      if (choBinhLuan) choBinhLuan.style.display = 'none';
      var s = document.createElement('script');
      s.async = true; s.defer = true;
      s.src = 'https://cusdis.com/js/cusdis.es.js';
      document.body.appendChild(s);
    } else if (choBinhLuan) {
      choBinhLuan.style.display = '';
    }
  }
})();
