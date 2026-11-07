/* bai-viet.js — Nút Thích / Chia sẻ / Khung bình luận cho trang bài viết Sống Đúng Khỏe.
 *
 * Cách dùng: chèn sau topbar.js, ngay trước </body> của trang BÀI VIẾT:
 *   <script src="/public/assets/js/bai-viet.js"></script>
 * Trang phải có khối <section id="tuongTac"> (xem CLAUDE.md).
 *
 * - Nút Thích: lưu trên máy của người đọc (localStorage), không cần tài khoản.
 * - Chia sẻ: mở Facebook / Zalo ở tab mới; "Sao chép link" chép URL bài viết.
 * - Bình luận (tự dựng trên Cloudflare D1 + Pages Function — miễn phí, tiếng
 *   Việt 100%, không quảng cáo, độc giả bình luận không cần tạo tài khoản):
 *   khung hiển thị + form gửi ở đây; API ở /functions/api/comments.js;
 *   dữ liệu trong D1 "bình luận-db" (bảng comments, Binding DB). Mọi bình
 *   luận đều chờ duyệt mới hiện; bác duyệt/xóa tại /quan-tri-binh-luan/
 *   (cần mã ADMIN_TOKEN đặt trong Pages → Environment variables).
 */
(function () {
  'use strict';

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

  /* ---------- Khung bình luận tự dựng (Cloudflare D1 + /api/comments) ----------
   * Gửi/đọc qua API Pages Function; mọi bình luận chờ duyệt mới hiện.
   * Tên + nội dung hiển thị bằng textContent (không chèn HTML người đọc gửi).
   * Dùng XMLHttpRequest cho tương thích cả trình duyệt cũ của độc giả lớn tuổi. */
  var khungBL = document.getElementById('khungBinhLuan');
  var choBL = document.getElementById('binhLuanCho');
  if (choBL) choBL.style.display = 'none'; // dòng chờ của khung cũ, nếu còn sót
  if (khungBL) {
    var duongDanBai = location.pathname;

    function goiApi(phuongThuc, duongDan, duLieu, hamGoi) {
      var xhr = new XMLHttpRequest();
      xhr.open(phuongThuc, duongDan, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) {}
        hamGoi(data);
      };
      xhr.onerror = function () { hamGoi(null); };
      xhr.send(duLieu ? JSON.stringify(duLieu) : null);
    }

    function dinhDangNgay(iso) {
      try {
        return new Date(iso).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit',
          year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) { return iso; }
    }

    var goiY = document.createElement('p');
    goiY.className = 'goi-y-binh-luan';
    goiY.textContent = 'Mời bạn chia sẻ cảm nghĩ bên dưới (chỉ cần điền tên, không cần tạo tài khoản).';
    khungBL.appendChild(goiY);

    var danhSach = document.createElement('div');
    danhSach.className = 'danh-sach-binh-luan';
    khungBL.appendChild(danhSach);

    function veBinhLuan(bl) {
      var khoiBL = document.createElement('div');
      khoiBL.className = 'binh-luan';
      var dau = document.createElement('p');
      dau.className = 'binh-luan-dau';
      var ten = document.createElement('strong');
      ten.textContent = bl.name;
      var ngay = document.createElement('span');
      ngay.className = 'binh-luan-ngay';
      ngay.textContent = ' · ' + dinhDangNgay(bl.created_at);
      dau.appendChild(ten);
      dau.appendChild(ngay);
      var noiDung = document.createElement('p');
      noiDung.className = 'binh-luan-noi-dung';
      noiDung.textContent = bl.content;
      khoiBL.appendChild(dau);
      khoiBL.appendChild(noiDung);
      return khoiBL;
    }

    function taiBinhLuan() {
      danhSach.textContent = 'Đang tải bình luận...';
      goiApi('GET', '/api/comments?page=' + encodeURIComponent(duongDanBai), null, function (data) {
        danhSach.textContent = '';
        if (!data || !data.ok) {
          danhSach.textContent = 'Chưa tải được bình luận, bạn thử tải lại trang nhé.';
          return;
        }
        if (!data.comments || data.comments.length === 0) {
          var trong = document.createElement('p');
          trong.className = 'chua-co-binh-luan';
          trong.textContent = 'Chưa có bình luận nào — bạn là người đầu tiên chia sẻ nhé.';
          danhSach.appendChild(trong);
          return;
        }
        data.comments.forEach(function (bl) { danhSach.appendChild(veBinhLuan(bl)); });
      });
    }

    var form = document.createElement('form');
    form.className = 'form-binh-luan';
    form.setAttribute('novalidate', 'novalidate');

    var nhanTen = document.createElement('label');
    nhanTen.setAttribute('for', 'tenBinhLuan');
    nhanTen.textContent = 'Tên của bạn';
    var oTen = document.createElement('input');
    oTen.id = 'tenBinhLuan';
    oTen.type = 'text';
    oTen.maxLength = 50;
    oTen.required = true;
    oTen.autocomplete = 'name';
    oTen.placeholder = 'Ví dụ: Minh Nguyễn';

    var nhanNoiDung = document.createElement('label');
    nhanNoiDung.setAttribute('for', 'noiDungBinhLuan');
    nhanNoiDung.textContent = 'Bình luận của bạn';
    var oNoiDung = document.createElement('textarea');
    oNoiDung.id = 'noiDungBinhLuan';
    oNoiDung.rows = 4;
    oNoiDung.maxLength = 1000;
    oNoiDung.required = true;
    oNoiDung.placeholder = 'Chia sẻ cảm nghĩ của bạn về bài viết...';

    // Ô bẫy chống thư rác (người thật không thấy, bot hay điền).
    var oBay = document.createElement('input');
    oBay.type = 'text';
    oBay.name = 'website';
    oBay.tabIndex = -1;
    oBay.autocomplete = 'off';
    oBay.setAttribute('aria-hidden', 'true');
    oBay.className = 'o-bay-binh-luan';

    var nutGui = document.createElement('button');
    nutGui.type = 'submit';
    nutGui.className = 'nut-gui-binh-luan';
    nutGui.textContent = 'Gửi bình luận';

    var trangThai = document.createElement('p');
    trangThai.className = 'trang-thai-binh-luan';
    trangThai.setAttribute('role', 'status');

    form.appendChild(nhanTen);
    form.appendChild(oTen);
    form.appendChild(nhanNoiDung);
    form.appendChild(oNoiDung);
    form.appendChild(oBay);
    form.appendChild(nutGui);
    form.appendChild(trangThai);
    khungBL.appendChild(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ten = oTen.value.trim();
      var noiDung = oNoiDung.value.trim();
      if (!ten) { trangThai.textContent = 'Bạn ghi tên nhé.'; oTen.focus(); return; }
      if (!noiDung) { trangThai.textContent = 'Bạn viết bình luận nhé.'; oNoiDung.focus(); return; }
      nutGui.disabled = true;
      nutGui.textContent = 'Đang gửi...';
      trangThai.textContent = '';
      goiApi('POST', '/api/comments',
        { page: duongDanBai, name: ten, content: noiDung, website: oBay.value },
        function (data) {
          nutGui.disabled = false;
          nutGui.textContent = 'Gửi bình luận';
          if (data && data.ok) {
            trangThai.textContent = data.message || 'Cảm ơn bạn! Bình luận của bạn đang chờ duyệt.';
            oTen.value = '';
            oNoiDung.value = '';
          } else if (data && data.error) {
            trangThai.textContent = data.error;
          } else {
            trangThai.textContent = 'Không gửi được, bạn kiểm tra mạng rồi thử lại nhé.';
          }
        });
    });

    taiBinhLuan();
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
