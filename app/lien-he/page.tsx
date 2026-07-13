"use client";

import Link from "next/link";

const FACEBOOK_URL = "https://www.facebook.com/quizsinhvien.vn";
const ZALO_URL = "https://zalo.me/0389696976";

export default function LienHePage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              ← Trang chủ
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Liên hệ hỗ trợ</h1>
          </div>

          <Link
            href="/huong-dan"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            Hướng dẫn
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8 md:p-10">
          <p className="text-sm font-extrabold uppercase tracking-wider text-blue-100">
            QUIZSINHVIEN.VN
          </p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Kết nối nhanh với bộ phận hỗ trợ
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-blue-50">
            Liên hệ qua Facebook hoặc Zalo khi cần hỗ trợ tài khoản, lớp học, đề thi, kết quả hoặc báo lỗi hệ thống.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-3xl border border-blue-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                📘
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                Facebook
              </span>
            </div>

            <h2 className="mt-6 text-2xl font-extrabold">Support Facebook</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Theo dõi thông báo, gửi tin nhắn và nhận hỗ trợ trực tiếp qua trang Facebook chính thức.
            </p>

            <div className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-extrabold text-white transition group-hover:bg-blue-700">
              Mở Facebook
            </div>

            <p className="mt-4 break-all text-center text-sm font-semibold text-blue-700">
        
            </p>
          </a>

          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-3xl border border-cyan-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-400 hover:shadow-lg sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-3xl">
                💬
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-extrabold text-cyan-700">
                Ưu tiên
              </span>
            </div>

            <h2 className="mt-6 text-2xl font-extrabold">Hỗ trợ qua Zalo</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Nhắn tin nhanh qua Zalo để gửi ảnh lỗi, nội dung cần hỗ trợ hoặc trao đổi trực tiếp.
            </p>

            <div className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-cyan-600 px-5 font-extrabold text-white transition group-hover:bg-cyan-700">
              Mở Zalo
            </div>

            <p className="mt-4 text-center text-sm font-semibold text-cyan-700">
    
            </p>
          </a>
        </div>

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-amber-900">Khi cần báo lỗi</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-amber-900 sm:grid-cols-2">
            <p>• Chụp rõ toàn bộ màn hình lỗi.</p>
            <p>• Gửi đường dẫn trang đang gặp lỗi.</p>
            <p>• Cho biết tài khoản là người học hay giáo viên.</p>
            <p>• Ghi rõ thiết bị và trình duyệt đang sử dụng.</p>
          </div>
        </section>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/huong-dan"
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center font-extrabold text-blue-700 hover:bg-blue-100"
          >
            Xem hướng dẫn sử dụng
          </Link>

          <Link
            href="/tai-khoan"
            className="rounded-xl bg-slate-900 px-5 py-3 text-center font-extrabold text-white hover:bg-blue-600"
          >
            Kiểm tra tài khoản
          </Link>
        </div>
      </section>
    </main>
  );
}