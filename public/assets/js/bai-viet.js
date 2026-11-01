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

  var REMARKBOX_OWNER_KEY = '5208740f-c2f1-11f1-895f-040140774501'; // namespace songdungkhoe-chinhthuc.pages.dev — đã bật bình luận ẩn danh 13/10/2026; bản free chỉ có 1 namespace nên dùng chung cho mọi tên miền

  // Dùng URL chuẩn pages.dev làm thread_uri để khung bình luận trên mọi tên miền
  // (songdungkhoe.com, www, pages.dev) cùng trỏ về một luồng đã bật ẩn danh.
  var threadUri = location.href.replace(/^https:\/\/(www\.)?songdungkhoe\.com/i, 'https://songdungkhoe-chinhthuc.pages.dev');

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
        '&thread_uri=' + encodeURIComponent(threadUri) +
        '&mode=light' + (location.hash || '');
      var goiY = document.createElement('p');
      goiY.className = 'goi-y-binh-luan';
      goiY.textContent = 'Mời bạn chia sẻ cảm nghĩ bên dưới (chỉ cần điền tên, không cần tạo tài khoản).';
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

/* ---------- Thẻ tặng ebook (hiện theo hành vi đọc) ----------
 * Bảng chung thẻ -> ấn bản. Chỉ chạy trên bài viết thuộc một thẻ có ebook
 * (nhận biết qua dòng breadcrumb đầu bài). Sau 90 giây đọc bài, hiện một
 * thẻ nhỏ góc dưới phải với đúng câu tặng của bác; chỉ hiện 1 lần mỗi
 * người đọc cho mỗi cuốn (localStorage riêng từng cuốn), bấm tắt hoặc bấm
 * tải đều ghi nhớ để không hiện lại. Không thu thập gì của người đọc,
 * không cần email, không mất phí.
 */
(function () {
  'use strict';
  var EBOOKS = {
    'Giấc Ngủ': { khoa: 'sdk-ebook-giac-ngu-da-hien', pdf: 'https://media.songdungkhoe.com/ebooks/giac-ngu.pdf', mau: '#2E6F40' },
    'Quán Chiếu': { khoa: 'sdk-ebook-quan-chieu-da-hien', pdf: 'https://media.songdungkhoe.com/ebooks/quan-chieu.pdf', mau: '#8C5A2B' }
  };
  var bai = document.querySelector('article');
  if (!bai) return;
  var dongDau = bai.querySelector('p');
  if (!dongDau) return;
  var ten = null, sach = null;
  for (var k in EBOOKS) {
    if (dongDau.textContent.indexOf(k) !== -1) { ten = k; sach = EBOOKS[k]; break; }
  }
  if (!sach) return;
  try { if (localStorage.getItem(sach.khoa) === '1') return; } catch (e) { return; }
  function ghiNho() { try { localStorage.setItem(sach.khoa, '1'); } catch (e) {} }
  function hienThe() {
    if (document.getElementById('the-tang-ebook')) return;
    var the = document.createElement('div');
    the.id = 'the-tang-ebook';
    the.setAttribute('role', 'dialog');
    the.setAttribute('aria-label', 'Quà tặng ebook ' + ten);
    the.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;max-width:340px;' +
      'background:#FDFBF7;border:1.5px solid ' + sach.mau + ';border-radius:14px;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.18);padding:16px 18px;' +
      'font-family:inherit;font-size:15px;line-height:1.6;color:#222;';
    the.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
      '<strong>🎁 Quà tặng dành cho bạn</strong>' +
      '<button type="button" aria-label="Đóng" style="border:none;background:none;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;">×</button>' +
      '</div>' +
      '<p style="margin:8px 0 12px;">Cảm ơn bạn đã dành thời gian đọc và đồng hành cùng Sống Đúng Khỏe. ' +
      'Ebook ' + ten + ' — mục tải về có trên trang songdungkhoe — bấm vào là tải về ngay, ' +
      'không cần để lại email, không mất phí.</p>' +
      '<p style="margin:0;"><a href="' + sach.pdf + '" target="_blank" rel="noopener" ' +
      'style="display:inline-block;background:' + sach.mau + ';color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">' +
      'Tải ebook ' + ten + ' (PDF)</a></p>';
    var nutDong = the.querySelector('button');
    nutDong.addEventListener('click', function () { ghiNho(); the.remove(); });
    var nutTai = the.querySelector('a');
    nutTai.addEventListener('click', ghiNho);
    document.body.appendChild(the);
    ghiNho();
  }
  setTimeout(hienThe, 90000);
})();
