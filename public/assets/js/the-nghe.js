/* Nút "Nghe" trên thẻ bài viết (trang chủ + trang chuyên mục)
   - Bấm "Nghe": phát audio của bài đó, nút đổi thành "Dừng".
   - Bấm nữa: dừng. Nghe hết bài: nút tự trở lại "Nghe".
   - Đang nghe bài này mà bấm bài khác: bài cũ tự dừng. */
(function () {
  var nutCacBai = document.querySelectorAll(".nut-nghe");

  function datLaiNut(nut) {
    nut.classList.remove("dang-phat");
    nut.setAttribute("aria-pressed", "false");
    nut.innerHTML = '<span aria-hidden="true">🔊</span> Nghe';
  }

  nutCacBai.forEach(function (nut) {
    var amThanh = document.getElementById(nut.getAttribute("aria-controls"));
    if (!amThanh) return;

    nut.addEventListener("click", function () {
      if (amThanh.paused) {
        // Dừng mọi bài khác đang phát trước khi phát bài này.
        document.querySelectorAll("audio").forEach(function (a) {
          if (a !== amThanh) a.pause();
        });
        document.querySelectorAll(".nut-nghe").forEach(function (n) {
          if (n !== nut) datLaiNut(n);
        });
        amThanh.play();
        nut.classList.add("dang-phat");
        nut.setAttribute("aria-pressed", "true");
        nut.innerHTML = '<span aria-hidden="true">⏸</span> Dừng';
      } else {
        amThanh.pause();
        datLaiNut(nut);
      }
    });

    amThanh.addEventListener("ended", function () { datLaiNut(nut); });
  });
})();
