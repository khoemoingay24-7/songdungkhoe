// functions/api/comments.js — API bình luận Sống Đúng Khỏe (Cloudflare Pages Function + D1).
//
// Hạ tầng: D1 tên "bình luận-db", bảng comments (id, page_id, name, content,
// created_at, approved) — bác đã tạo bảng và gắn Binding vào dự án Pages
// songdungkhoe-chinhthuc với tên biến DB. Cột approved do hàm này tự thêm
// nếu chưa có (không cần chạy SQL tay).
//
// Luồng:
//   GET  /api/comments?page=/than/slug/        -> bình luận ĐÃ DUYỆT của bài
//   POST /api/comments {page, name, content}   -> gửi bình luận (chờ duyệt)
//   GET  /api/comments?scope=pending|approved  -> (quản trị) danh sách
//   GET  /api/comments?scope=count              -> (công khai) chỉ số lượng chờ duyệt
//   POST /api/comments {action:"approve"|"delete", id} -> (quản trị)
//
// Quản trị: header Authorization: Bearer <ADMIN_TOKEN> — mã này bác tự đặt
// trong Pages → Settings → Environment variables (Production), tên ADMIN_TOKEN.
// Chưa đặt mã thì mọi tác vụ quản trị đều bị chặn (fail closed).
// Bình luận công khai không cần mã, không cần tài khoản.
//
// Chống rác (đợt 1, chưa dùng Turnstile): ô bẫy honeypot "website" (bot hay
// điền), giới hạn 3 bình luận/giờ/IP + 1 bình luận/30 giây/IP, và mọi bình
// luận đều CHỜ DUYỆT mới hiện ra công khai.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Tạo cột approved + bảng rate_limits nếu chưa có (chạy mỗi lượt, rẻ, an toàn).
async function ensureSchema(db) {
  var info = await db.prepare('PRAGMA table_info(comments)').all();
  var cols = (info.results || []).map(function (r) { return r.name; });
  if (cols.indexOf('approved') === -1) {
    await db.prepare('ALTER TABLE comments ADD COLUMN approved INTEGER NOT NULL DEFAULT 0').run();
  }
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS rate_limits (ip TEXT NOT NULL, created_at INTEGER NOT NULL)'
  ).run();
}

function clientIp(request) {
  var ip = request.headers.get('CF-Connecting-IP');
  if (ip) return ip;
  var fwd = request.headers.get('X-Forwarded-For');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

function soNguyenDuong(v) {
  var n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function soSanhAnToan(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var khac = 0;
  for (var i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return khac === 0;
}

// Trả null nếu được phép; trả Response lỗi nếu không.
function kiemTraQuanTri(request, env) {
  var ma = env.ADMIN_TOKEN;
  if (!ma) {
    return json({ ok: false, error: 'Chưa đặt mã quản trị (ADMIN_TOKEN).' }, 503);
  }
  var auth = request.headers.get('Authorization') || '';
  var token = auth.replace(/^Bearer\s+/i, '');
  if (!soSanhAnToan(token, ma)) {
    return json({ ok: false, error: 'Mã quản trị không đúng.' }, 401);
  }
  return null;
}

async function docJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

// ---------- Đọc bình luận đã duyệt của một bài (công khai) ----------
async function docCongKhai(db, url) {
  var page = url.searchParams.get('page') || '';
  if (!page || page.charAt(0) !== '/' || page.length > 200) {
    return json({ ok: false, error: 'Thiếu đường dẫn bài viết.' }, 400);
  }
  var res = await db.prepare(
    'SELECT id, name, content, created_at FROM comments ' +
    'WHERE page_id = ? AND approved = 1 ORDER BY created_at ASC, id ASC LIMIT 200'
  ).bind(page).all();
  return json({ ok: true, comments: res.results || [] });
}

// ---------- Quản trị: liệt kê chờ duyệt / đã duyệt ----------
async function docDanhSachQuanTri(db, request, env, url) {
  var kt = kiemTraQuanTri(request, env);
  if (kt) return kt;
  var scope = url.searchParams.get('scope');
  if (scope !== 'pending' && scope !== 'approved') {
    return json({ ok: false, error: 'scope chỉ nhận pending hoặc approved.' }, 400);
  }
  var approved = scope === 'approved' ? 1 : 0;
  var ds = await db.prepare(
    'SELECT id, page_id, name, content, created_at FROM comments ' +
    'WHERE approved = ? ORDER BY created_at DESC, id DESC LIMIT 100'
  ).bind(approved).all();
  return json({ ok: true, comments: ds.results || [] });
}

// ---------- Đếm số bình luận chờ duyệt (công khai, chỉ trả về con số) ----------
// Không cần mã quản trị, không trả tên hay nội dung — chỉ để con kiểm tra mỗi
// sáng rồi nhắc bác khi có bình luận mới. Ai gọi cũng chỉ thấy một con số.
async function demChoDuyet(db) {
  var dem = await db.prepare(
    'SELECT COUNT(*) AS n FROM comments WHERE approved = 0'
  ).first();
  return json({ ok: true, pending: (dem && dem.n) || 0 });
}

// ---------- Gửi bình luận mới (công khai, chờ duyệt) ----------
async function guiBinhLuan(db, request, body) {
  // Ô bẫy honeypot: bot hay điền, người thật không thấy ô này.
  if (body.website) {
    return json({ ok: true, message: 'Cảm ơn bạn! Bình luận của bạn đang chờ duyệt và sẽ hiện ra sau khi được duyệt.' });
  }
  var page = typeof body.page === 'string' ? body.page.trim() : '';
  var name = typeof body.name === 'string' ? body.name.trim() : '';
  var content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!page || page.charAt(0) !== '/' || page.indexOf('..') !== -1 || page.length > 200) {
    return json({ ok: false, error: 'Đường dẫn bài viết không hợp lệ.' }, 400);
  }
  if (!name || name.length > 50) {
    return json({ ok: false, error: 'Bạn ghi tên nhé (tối đa 50 ký tự).' }, 400);
  }
  if (!content || content.length > 1000) {
    return json({ ok: false, error: 'Bạn viết bình luận nhé (tối đa 1000 ký tự).' }, 400);
  }
  // Giới hạn: 3 bình luận/giờ/IP, 1 bình luận/30 giây/IP.
  var ip = clientIp(request);
  var now = Math.floor(Date.now() / 1000);
  await db.prepare('DELETE FROM rate_limits WHERE created_at < ?').bind(now - 3600).run();
  var demGio = await db.prepare(
    'SELECT COUNT(*) AS n FROM rate_limits WHERE ip = ? AND created_at > ?'
  ).bind(ip, now - 3600).first();
  if (demGio && demGio.n >= 3) {
    return json({ ok: false, error: 'Bạn gửi nhiều quá, nghỉ một lát rồi gửi lại nhé.' }, 429);
  }
  var demNhanh = await db.prepare(
    'SELECT COUNT(*) AS n FROM rate_limits WHERE ip = ? AND created_at > ?'
  ).bind(ip, now - 30).first();
  if (demNhanh && demNhanh.n >= 1) {
    return json({ ok: false, error: 'Bạn gửi nhanh quá, chờ vài giây rồi gửi lại nhé.' }, 429);
  }
  await db.prepare('INSERT INTO rate_limits (ip, created_at) VALUES (?, ?)').bind(ip, now).run();
  await db.prepare(
    'INSERT INTO comments (page_id, name, content, created_at, approved) VALUES (?, ?, ?, ?, 0)'
  ).bind(page, name, content, new Date().toISOString()).run();
  return json({ ok: true, message: 'Cảm ơn bạn! Bình luận của bạn đang chờ duyệt và sẽ hiện ra sau khi được duyệt.' });
}

// ---------- Quản trị: duyệt / xóa ----------
async function tacVuQuanTri(db, request, env, body) {
  var kt = kiemTraQuanTri(request, env);
  if (kt) return kt;
  var action = body.action;
  var id = soNguyenDuong(body.id);
  if (!id || (action !== 'approve' && action !== 'delete')) {
    return json({ ok: false, error: 'Thiếu action (approve/delete) hoặc id.' }, 400);
  }
  if (action === 'approve') {
    await db.prepare('UPDATE comments SET approved = 1 WHERE id = ?').bind(id).run();
  } else {
    await db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  }
  return json({ ok: true });
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
      var scope = url.searchParams.get('scope');
      if (scope === 'count') {
        return demChoDuyet(db);
      }
      if (scope) {
        return docDanhSachQuanTri(db, request, env, url);
      }
      return docCongKhai(db, url);
    }

    if (method === 'POST') {
      var body = await docJson(request);
      if (!body || typeof body !== 'object') {
        return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 400);
      }
      if (body.action === 'approve' || body.action === 'delete') {
        return tacVuQuanTri(db, request, env, body);
      }
      return guiBinhLuan(db, request, body);
    }

    return json({ ok: false, error: 'Phương thức không hỗ trợ.' }, 405);
  } catch (e) {
    return json({ ok: false, error: 'Có lỗi xảy ra, bạn thử lại sau nhé.' }, 500);
  }
}
