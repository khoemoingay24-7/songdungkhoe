// functions/api/views.js — API bộ đếm lượt xem bài viết Sống Đúng Khỏe
// (Cloudflare Pages Function + D1, chung database "bình luận-db" với hệ bình luận).
//
// Ý đồ của bác (08/11/2026): đếm TẤT CẢ lượt tương tác cấp hạ tầng
// (Total Hits) — mỗi lần tải/truy vấn bài viết cộng +1, KHÔNG lọc trùng IP,
// KHÔNG lọc bot hay trình cào dữ liệu, để con số tăng nhanh và sinh động
// ngay từ đầu (hiệu ứng đám đông / Social Proof). Vì vậy hàm này cố ý
// KHÔNG có giới hạn theo IP hay chống rác như /api/comments.
//
// Luồng:
//   POST /api/views {page: "/than/slug/"} -> cộng +1, trả {ok:true, views:N}
//   GET  /api/views?page=/than/slug/      -> chỉ đọc, KHÔNG cộng, trả {ok:true, views:N}
//
// Bảng page_views (page_id, view_count, updated_at) do hàm này tự tạo nếu
// chưa có — không cần chạy SQL tay. Hiển thị: public/assets/js/bai-viet.js
// gọi POST mỗi lần mở bài viết rồi chèn "👁️ N lượt xem" cạnh ngày đăng.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function ensureSchema(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS page_views (' +
    'page_id TEXT PRIMARY KEY, ' +
    'view_count INTEGER NOT NULL DEFAULT 0, ' +
    'updated_at TEXT)'
  ).run();
}

function hopLe(page) {
  return typeof page === 'string' && page.length > 0 && page.length <= 200 &&
    page.charAt(0) === '/' && page.indexOf('..') === -1;
}

async function docJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

// ---------- Đọc số lượt xem hiện tại (không cộng) ----------
async function docLuotXem(db, page) {
  if (!hopLe(page)) {
    return json({ ok: false, error: 'Thiếu đường dẫn bài viết.' }, 400);
  }
  var row = await db.prepare(
    'SELECT view_count FROM page_views WHERE page_id = ?'
  ).bind(page).first();
  return json({ ok: true, views: (row && row.view_count) || 0 });
}

// ---------- Cộng +1 lượt xem, trả về con số mới ----------
async function congLuotXem(db, page) {
  if (!hopLe(page)) {
    return json({ ok: false, error: 'Đường dẫn bài viết không hợp lệ.' }, 400);
  }
  var now = new Date().toISOString();
  await db.prepare(
    'INSERT INTO page_views (page_id, view_count, updated_at) VALUES (?, 1, ?) ' +
    'ON CONFLICT(page_id) DO UPDATE SET view_count = view_count + 1, updated_at = excluded.updated_at'
  ).bind(page, now).run();
  var row = await db.prepare(
    'SELECT view_count FROM page_views WHERE page_id = ?'
  ).bind(page).first();
  return json({ ok: true, views: (row && row.view_count) || 0 });
}

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var db = env.DB;
  if (!db) return json({ ok: false, error: 'Chưa gắn cơ sở dữ liệu bình luận (DB).' }, 500);

  var url = new URL(request.url);
  var method = request.method.toUpperCase();

  try {
    await ensureSchema(db);

    if (method === 'GET') {
      return docLuotXem(db, url.searchParams.get('page') || '');
    }

    if (method === 'POST') {
      var body = await docJson(request);
      if (!body || typeof body !== 'object') {
        return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 400);
      }
      return congLuotXem(db, body.page);
    }

    return json({ ok: false, error: 'Phương thức không hỗ trợ.' }, 405);
  } catch (e) {
    return json({ ok: false, error: 'Có lỗi xảy ra, bạn thử lại sau nhé.' }, 500);
  }
}
