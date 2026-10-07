// Tìm kiếm nội dung website Sống Đúng Khỏe (chạy hoàn toàn trên trình duyệt).
(function () {
  function norm(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  function getQuery() {
    var m = /[?&]q=([^&]*)/.exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(q, index) {
    var box = document.getElementById('search-results');
    var count = document.getElementById('search-count');
    var words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) {
      box.innerHTML = '';
      count.textContent = '';
      return;
    }
    var hits = index.filter(function (it) {
      var hayWords = norm(it.title + ' ' + it.desc + ' ' + it.card + ' ' + it.branch)
        .split(/[^a-z0-9]+/).filter(Boolean);
      return words.every(function (w) { return hayWords.indexOf(w) !== -1; });
    });
    count.textContent = hits.length
      ? 'Tìm thấy ' + hits.length + ' kết quả cho "' + q + '"'
      : 'Không tìm thấy kết quả nào cho "' + q + '". Bạn thử từ khác nhé.';
    box.innerHTML = hits.map(function (it) {
      var tag = it.card ? it.branch + ' · ' + it.card : it.branch;
      return '<a class="cat-card search-hit" href="' + esc(it.url) + '">' +
        '<p class="search-tag">' + esc(tag) + '</p>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.desc) + '</p></a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('search-input');
    var q = getQuery();
    if (input) input.value = q;
    fetch('/public/assets/data/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (index) {
        render(q, index);
        var t;
        if (input) input.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () { render(input.value, index); }, 200);
        });
      })
      .catch(function () {
        document.getElementById('search-count').textContent =
          'Chưa tải được dữ liệu tìm kiếm, bạn thử tải lại trang nhé.';
      });
  });
})();
