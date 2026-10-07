// Thanh tiện ích đầu trang: ngày giờ hiện tại + nhiệt độ Đà Lạt (Open-Meteo, miễn phí).
(function () {
  var DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick() {
    var el = document.getElementById('topbar-clock');
    if (!el) return;
    var d = new Date();
    el.textContent = DAYS[d.getDay()] + ', ' + d.getDate() + '/' + (d.getMonth() + 1) +
      '/' + d.getFullYear() + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  tick();
  setInterval(tick, 30000);

  var CODE = {
    0: ['Trời quang', '☀️'], 1: ['Ít mây', '🌤️'], 2: ['Nhiều mây', '⛅'], 3: ['U ám', '☁️'],
    45: ['Sương mù', '🌫️'], 48: ['Sương mù', '🌫️'],
    51: ['Mưa phùn', '🌧️'], 53: ['Mưa phùn', '🌧️'], 55: ['Mưa phùn', '🌧️'],
    61: ['Mưa nhẹ', '🌧️'], 63: ['Mưa', '🌧️'], 65: ['Mưa to', '🌧️'],
    66: ['Mưa đá', '🌧️'], 67: ['Mưa đá', '🌧️'],
    71: ['Tuyết', '❄️'], 73: ['Tuyết', '❄️'], 75: ['Tuyết', '❄️'], 77: ['Tuyết', '❄️'],
    80: ['Mưa rào', '🌧️'], 81: ['Mưa rào', '🌧️'], 82: ['Mưa rào', '🌧️'],
    95: ['Dông', '⛈️'], 96: ['Dông', '⛈️'], 99: ['Dông', '⛈️']
  };

  function paint(el, d) {
    var w = CODE[d.code] || ['', ''];
    el.textContent = (w[1] ? w[1] + ' ' : '') + d.temp + '°' + (w[0] ? ' · ' + w[0] : '');
  }

  function loadWeather() {
    var el = document.getElementById('topbar-weather');
    if (!el) return;
    try {
      var cached = JSON.parse(sessionStorage.getItem('sodkhoe_wx') || 'null');
      if (cached && Date.now() - cached.t < 30 * 60 * 1000) { paint(el, cached); return; }
    } catch (e) { /* bỏ qua */ }
    fetch('https://api.open-meteo.com/v1/forecast?latitude=11.94&longitude=108.44&current=apparent_temperature,weather_code&timezone=Asia%2FHo_Chi_Minh&forecast_days=1')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        // temperature_2 đang lỗi phía Open-Meteo (07/10/2026) nên dùng nhiệt độ cảm nhận;
        // khi API sửa xong, temperature_2 có mặt thì ưu tiên nó.
        var cur = j.current || {};
        var t = (cur.temperature_2 != null) ? cur.temperature_2 : cur.apparent_temperature;
        if (t == null) throw new Error('no temp');
        var d = { t: Date.now(), temp: Math.round(t), code: cur.weather_code };
        try { sessionStorage.setItem('sodkhoe_wx', JSON.stringify(d)); } catch (e) { /* bỏ qua */ }
        paint(el, d);
      })
      .catch(function () { el.textContent = '--°'; });
  }
  loadWeather();
})();

/* ---------- Nút "Về đầu trang" (hiện mọi trang) ---------- */
(function () {
  var nut = document.createElement('button');
  nut.className = 'nut-len-dau';
  nut.innerHTML = '&#8593;';
  nut.setAttribute('aria-label', 'Về đầu trang');
  nut.title = 'Về đầu trang';
  document.body.appendChild(nut);
  function kiemTra() {
    nut.classList.toggle('hien', window.scrollY > 600);
  }
  window.addEventListener('scroll', kiemTra, { passive: true });
  nut.addEventListener('click', function () {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, 0); }
  });
  kiemTra();
})();
