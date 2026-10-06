/* quiz-audio.js — Âm thanh cho các trang trắc nghiệm Sống Đúng Khỏe.
 *
 * Cách dùng: chèn dòng sau vào cuối trang quiz, SAU script quiz của trang,
 * ngay trước </body>:
 *   <script src="/public/assets/js/quiz-audio.js"></script>
 *
 * Tự động có, không cần sửa gì thêm trong trang:
 *  - Nút "🔊 Âm thanh: bật/tắt" (nhớ lựa chọn bằng localStorage)
 *  - Nút 🔊 ở mỗi câu hỏi: đọc câu hỏi + các đáp án bằng giọng tiếng Việt
 *  - Trả lời đúng: tiếng chuông vui nhẹ | Sai: tiếng trầm nhẹ
 *  - Nộp bài xong: một đoạn nhạc ngắn chúc mừng
 *
 * Tất cả dùng khả năng có sẵn của trình duyệt (Web Speech API + Web Audio API):
 * không file nhạc, không máy chủ, không tốn dung lượng.
 */
(function () {
  'use strict';

  var KHOA_LUU = 'sdk-quiz-am-thanh'; // 'tat' = tắt, còn lại = bật

  function amThanhBat() {
    try { return localStorage.getItem(KHOA_LUU) !== 'tat'; }
    catch (e) { return true; }
  }
  function datAmThanh(bat) {
    try { localStorage.setItem(KHOA_LUU, bat ? 'bat' : 'tat'); } catch (e) {}
  }

  /* ---------- CSS tối thiểu cho các nút (tự chèn) ---------- */
  var CSS = '.quiz-audio-toggle{display:inline-block;margin:12px 0 12px 10px;padding:8px 18px;'
    + 'border:1px solid var(--line);border-radius:999px;background:var(--card);'
    + 'font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;color:inherit;vertical-align:middle}'
    + '.quiz-audio-toggle:hover{border-color:#999}'
    + '.nut-doc-cau-hoi{background:none;border:none;font-size:18px;cursor:pointer;padding:0 2px;vertical-align:baseline;line-height:1}'
    + '.nut-doc-cau-hoi:hover{transform:scale(1.2)}'
    + '.nut-doc-cau-hoi.an-di{display:none}';
  var theStyle = document.createElement('style');
  theStyle.textContent = CSS;
  document.head.appendChild(theStyle);

  /* ---------- Bộ gõ tiếng hiệu bằng Web Audio ---------- */
  var ctxAmThanh = null;
  function layCtx() {
    if (!ctxAmThanh) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxAmThanh = new AC();
    }
    if (ctxAmThanh.state === 'suspended') ctxAmThanh.resume();
    return ctxAmThanh;
  }
  function nhatNot(tanSo, treGiay, keoDaiGiay, amLuong) {
    var c = layCtx();
    if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.value = tanSo;
    var t = c.currentTime + treGiay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amLuong || 0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + keoDaiGiay);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + keoDaiGiay + 0.05);
  }
  function tiengDung() { nhatNot(659.25, 0, 0.35); nhatNot(880, 0.12, 0.5); }       // chuông vui: Mi5 -> La5
  function tiengSai() { nhatNot(233.08, 0, 0.4, 0.1); nhatNot(196, 0.15, 0.5, 0.1); } // trầm nhẹ, không gắt
  function nhacHoanThanh() {                                                          // arpeggio chúc mừng
    var not = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < not.length; i++) nhatNot(not[i], i * 0.14, 0.45);
  }
  function phatTieng(loai) {
    if (!amThanhBat()) return;
    try {
      if (loai === 'dung') tiengDung();
      else if (loai === 'sai') tiengSai();
      else if (loai === 'xong') nhacHoanThanh();
    } catch (e) {}
  }
  // Trình duyệt yêu cầu có thao tác chạm trước mới cho phát tiếng: mở khóa ngay lần chạm đầu.
  document.addEventListener('pointerdown', function () { layCtx(); }, { once: true });

  /* ---------- Đọc câu hỏi bằng giọng tiếng Việt ---------- */
  var giongViet = null;
  function chonGiongViet() {
    try {
      var ds = window.speechSynthesis.getVoices();
      for (var i = 0; i < ds.length; i++) {
        if (ds[i].lang && ds[i].lang.toLowerCase().indexOf('vi') === 0) { giongViet = ds[i]; break; }
      }
    } catch (e) {}
  }
  function docCauHoi(nut) {
    if (!amThanhBat() || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var khoi = nut.closest('.quiz-q');
      if (!khoi) return;
      var h3 = khoi.querySelector('h3');
      var banSao = h3.cloneNode(true);
      var nb = banSao.querySelector('.nut-doc-cau-hoi');
      if (nb) nb.remove();
      var cau = banSao.textContent.replace(/\s+/g, ' ').trim();
      var dapAn = [];
      khoi.querySelectorAll('label').forEach(function (lb, idx) {
        dapAn.push('Đáp án ' + (idx + 1) + ': ' + lb.textContent.replace(/\s+/g, ' ').trim());
      });
      var noi = new SpeechSynthesisUtterance(cau + '. ' + dapAn.join('. '));
      noi.lang = 'vi-VN';
      noi.rate = 0.95;
      if (!giongViet) chonGiongViet();
      if (giongViet) noi.voice = giongViet;
      window.speechSynthesis.speak(noi);
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    chonGiongViet();
    try { window.speechSynthesis.onvoiceschanged = chonGiongViet; } catch (e) {}
  }

  /* ---------- Nút bật / tắt âm thanh ---------- */
  var nutBatTat = null;
  function capNhatNutDoc() {
    var an = !amThanhBat();
    document.querySelectorAll('.nut-doc-cau-hoi').forEach(function (n) {
      n.classList.toggle('an-di', an);
    });
  }
  function veNutBatTat() {
    if (document.getElementById('nutAmThanhQuiz')) return;
    var neo = document.getElementById('tienDo');
    if (!neo) return;
    nutBatTat = document.createElement('button');
    nutBatTat.type = 'button';
    nutBatTat.id = 'nutAmThanhQuiz';
    nutBatTat.className = 'quiz-audio-toggle';
    nutBatTat.setAttribute('aria-label', 'Bật hoặc tắt âm thanh trắc nghiệm');
    nutBatTat.onclick = function () {
      datAmThanh(!amThanhBat());
      nutBatTat.textContent = amThanhBat() ? '🔊 Âm thanh: bật' : '🔇 Âm thanh: tắt';
      capNhatNutDoc();
      if (!amThanhBat() && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
    };
    nutBatTat.textContent = amThanhBat() ? '🔊 Âm thanh: bật' : '🔇 Âm thanh: tắt';
    neo.parentNode.insertBefore(nutBatTat, neo.nextSibling);
  }

  /* ---------- Nút 🔊 đọc từng câu hỏi ---------- */
  function veNutDoc() {
    document.querySelectorAll('.quiz-q').forEach(function (khoi) {
      var h3 = khoi.querySelector('h3');
      if (!h3 || h3.querySelector('.nut-doc-cau-hoi')) return;
      var nut = document.createElement('button');
      nut.type = 'button';
      nut.className = 'nut-doc-cau-hoi';
      nut.textContent = '🔊';
      nut.title = 'Nghe đọc câu hỏi này';
      nut.setAttribute('aria-label', 'Nghe đọc câu hỏi này');
      if (!amThanhBat()) nut.classList.add('an-di');
      nut.onclick = function (ev) { ev.preventDefault(); docCauHoi(nut); };
      h3.insertBefore(nut, h3.firstChild);
      h3.insertBefore(document.createTextNode(' '), nut.nextSibling);
    });
  }

  /* ---------- Móc vào logic quiz có sẵn của trang ---------- */
  function mocVaoQuiz() {
    if (typeof hienGiaiThich === 'function' && !hienGiaiThich._daMocAmThanh) {
      var gocHien = hienGiaiThich;
      hienGiaiThich = function (i) {
        gocHien(i);
        var gt = document.querySelector('#q' + i + ' .quiz-explain');
        if (!gt || gt.style.display === 'none') return;
        if (gt.classList.contains('explain-dung')) phatTieng('dung');
        else if (gt.classList.contains('explain-sai')) phatTieng('sai');
      };
      hienGiaiThich._daMocAmThanh = true;
    }
    if (typeof nopBai === 'function' && !nopBai._daMocAmThanh) {
      var gocNop = nopBai;
      nopBai = function () {
        gocNop();
        var kq = document.getElementById('quizResult');
        if (kq && kq.querySelector('h3')) phatTieng('xong'); // chỉ khi đã chấm điểm xong
      };
      nopBai._daMocAmThanh = true;
    }
  }

  function khoiDong() {
    mocVaoQuiz();
    veNutBatTat();
    veNutDoc(); // câu hỏi do dungQuiz() của trang dựng ở DOMContentLoaded trước đó
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(khoiDong, 60); });
  } else {
    setTimeout(khoiDong, 60);
  }
})();
