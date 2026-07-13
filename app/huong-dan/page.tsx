"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type GuideRole = "student" | "teacher";

interface GuideStep {
  title: string;
  description: string;
  href?: string;
  buttonLabel?: string;
}

const guides: Record<
  GuideRole,
  {
    label: string;
    intro: string;
    steps: GuideStep[];
  }
> = {
  student: {
    label: "Học sinh / Sinh viên",
    intro:
      "Tham gia lớp, nhận đề được giao, làm bài và theo dõi kết quả học tập.",
    steps: [
      {
        title: "1. Đăng ký hoặc đăng nhập",
        description:
          "Dùng email cá nhân để tạo tài khoản. Sau khi đăng nhập, kiểm tra họ tên tại trang tài khoản.",
        href: "/dang-nhap",
        buttonLabel: "Đăng nhập",
      },
      {
        title: "2. Tham gia lớp học",
        description:
          "Mở mục Lớp học, nhập mã lớp gồm 6 ký tự do giáo viên cung cấp rồi bấm Tham gia lớp.",
        href: "/lop-hoc",
        buttonLabel: "Mở lớp học",
      },
      {
        title: "3. Xem bài tập được giao",
        description:
          "Vào chi tiết lớp để xem bài mới, bài sắp hết hạn, bài chưa đến giờ và bài đã hết hạn.",
        href: "/lop-hoc",
        buttonLabel: "Xem bài tập",
      },
      {
        title: "4. Làm và nộp bài",
        description:
          "Bấm Làm bài ngay, nhập họ tên, bắt đầu làm bài và nộp trước khi hết thời gian.",
        href: "/de-thi",
        buttonLabel: "Xem đề thi",
      },
      {
        title: "5. Xem kết quả",
        description:
          "Sau khi nộp bài, xem điểm số, số câu đúng và lịch sử các lần làm bài.",
        href: "/ket-qua",
        buttonLabel: "Xem kết quả",
      },
    ],
  },
  teacher: {
    label: "Giáo viên",
    intro:
      "Tạo đề, quản lý câu hỏi, giao bài cho lớp và theo dõi kết quả người học.",
    steps: [
      {
        title: "1. Tạo đề trắc nghiệm",
        description:
          "Mở trang tạo đề, nhập tên đề, thời gian làm bài, cấu hình chống gian lận và thêm câu hỏi.",
        href: "/trac-nghiem",
        buttonLabel: "Tạo đề",
      },
      {
        title: "2. Dùng ngân hàng câu hỏi",
        description:
          "Lưu câu hỏi dùng lại nhiều lần, chọn nhiều câu rồi đưa nhanh vào đề thi mới.",
        href: "/ngan-hang-cau-hoi",
        buttonLabel: "Mở ngân hàng",
      },
      {
        title: "3. Công khai đề",
        description:
          "Sau khi kiểm tra nội dung, chuyển đề sang trạng thái Đã công khai để có thể giao cho lớp.",
        href: "/de-thi",
        buttonLabel: "Quản lý đề",
      },
      {
        title: "4. Tạo lớp và giao đề",
        description:
          "Tạo lớp, chia sẻ mã lớp, chờ người học tham gia rồi chọn đề để giao theo thời gian bắt đầu và hạn nộp.",
        href: "/lop-hoc",
        buttonLabel: "Quản lý lớp",
      },
      {
        title: "5. Chia sẻ bằng QR",
        description:
          "Tại danh sách đề, bấm Mở mã QR hoặc Sao chép link để người học vào đúng đề nhanh chóng.",
        href: "/de-thi",
        buttonLabel: "Mở kho đề",
      },
      {
        title: "6. Xem kết quả theo lớp",
        description:
          "Vào chi tiết lớp, chọn Xem kết quả theo lớp để lọc, theo dõi và xuất dữ liệu.",
        href: "/lop-hoc",
        buttonLabel: "Xem lớp học",
      },
    ],
  },
};

export default function HuongDanPage() {
  const [activeRole, setActiveRole] =
    useState<GuideRole>("student");

  const guide = useMemo(
    () => guides[activeRole],
    [activeRole]
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link
              href="/"
              className="text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              ← Trang chủ
            </Link>

            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Hướng dẫn sử dụng
            </h1>
          </div>

          <Link
            href="/tai-khoan"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
          >
            Tài khoản
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8 md:p-10">
          <p className="text-sm font-extrabold uppercase tracking-wider text-blue-100">
            QUIZSINHVIEN.VN
          </p>

          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Bắt đầu sử dụng chỉ trong vài bước
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-blue-50">
            Chọn đúng vai trò để xem hướng dẫn phù hợp cho học sinh,
            sinh viên hoặc giáo viên.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="px-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Chọn vai trò
            </p>

            <div className="mt-3 space-y-2">
              {(Object.keys(guides) as GuideRole[]).map(
                (role) => {
                  const isActive = activeRole === role;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setActiveRole(role)}
                      className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-extrabold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      <span>{guides[role].label}</span>
                      <span>{isActive ? "✓" : "→"}</span>
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <p className="font-extrabold">
                Lưu ý khi làm bài
              </p>
              <p className="mt-1">
                Không rời tab, không thoát toàn màn hình và không sao
                chép nội dung khi đề bật chống gian lận.
              </p>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                Hướng dẫn dành cho
              </p>

              <h2 className="mt-1 text-3xl font-extrabold">
                {guide.label}
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                {guide.intro}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {guide.steps.map((step) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="max-w-3xl">
                      <h3 className="text-lg font-extrabold">
                        {step.title}
                      </h3>

                      <p className="mt-2 leading-7 text-slate-600">
                        {step.description}
                      </p>
                    </div>

                    {step.href && step.buttonLabel && (
                      <Link
                        href={step.href}
                        className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        {step.buttonLabel}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-2xl font-extrabold">
            Bạn vẫn chưa thao tác được?
          </h2>

          <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">
            Kiểm tra lại kết nối mạng, đăng nhập đúng tài khoản và tải
            lại trang. Khi báo lỗi, hãy chụp rõ toàn bộ màn hình và nội
            dung lỗi.
          </p>

          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-blue-600"
            >
              Về trang chủ
            </Link>

            <Link
              href="/tai-khoan"
              className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Kiểm tra tài khoản
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}