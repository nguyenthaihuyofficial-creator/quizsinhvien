"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "./lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface FeatureItem {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  icon: string;
  roles: UserRole[];
}

const features: FeatureItem[] = [
  {
    title: "Tạo đề trắc nghiệm",
    description:
      "Tải câu hỏi từ Excel, Word hoặc PDF, kiểm tra đáp án và lưu đề thi.",
    href: "/trac-nghiem",
    buttonText: "Tạo đề ngay",
    icon: "📝",
    roles: ["teacher", "admin"],
  },
  {
    title: "Danh sách đề",
    description:
      "Xem kho đề, quản lý đề của bạn hoặc chọn đề đã công khai để làm.",
    href: "/de-thi",
    buttonText: "Xem danh sách",
    icon: "📚",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Làm bài online",
    description:
      "Chọn đề đang mở, làm bài trực tuyến và nhận kết quả tự động.",
    href: "/de-thi",
    buttonText: "Chọn đề để làm",
    icon: "🎯",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Xem kết quả",
    description:
      "Theo dõi điểm số, số câu đúng, thời gian làm bài và xuất danh sách.",
    href: "/ket-qua",
    buttonText: "Xem kết quả",
    icon: "📊",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Tính điểm VLUTE",
    description:
      "Tính điểm học phần lý thuyết, thực hành và quy đổi điểm chữ, hệ 4.",
    href: "/tinh-diem",
    buttonText: "Tính điểm",
    icon: "🧮",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Quản trị tài khoản",
    description:
      "Xem danh sách người dùng và phân quyền học sinh, giáo viên, quản trị viên.",
    href: "/admin",
    buttonText: "Mở trang quản trị",
    icon: "🛡️",
    roles: ["admin"],
  },
];

export default function HomePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setRole(data.role as UserRole);
      }
    } finally {
      setLoadingUser(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/dang-nhap";
  }

  const visibleFeatures = useMemo(() => {
    if (!role) {
      return features.filter((feature) =>
        feature.roles.includes("student")
      );
    }

    return features.filter((feature) =>
      feature.roles.includes(role)
    );
  }, [role]);

  const canCreateExam =
    role === "teacher" || role === "admin";

  return (
    <main className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-blue-700 sm:text-xl md:text-2xl"
          >
            Quiz Sinh Viên
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            <Link
              href="/trac-nghiem"
              className="font-medium text-slate-700 transition hover:text-blue-600"
            >
              Tạo đề
            </Link>

            <Link
              href="/de-thi"
              className="font-medium text-slate-700 transition hover:text-blue-600"
            >
              Danh sách đề
            </Link>

            <Link
              href="/lam-bai"
              className="font-medium text-slate-700 transition hover:text-blue-600"
            >
              Làm bài
            </Link>

            <Link
              href="/ket-qua"
              className="font-medium text-slate-700 transition hover:text-blue-600"
            >
              Kết quả
            </Link>

            <Link
              href="/tinh-diem"
              className="font-medium text-slate-700 transition hover:text-blue-600"
            >
              Tính điểm
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {!loadingUser && role && (
              <span className="hidden text-sm font-semibold text-slate-600 sm:inline">
                {fullName || "Tài khoản của bạn"}
              </span>
            )}

            {!loadingUser && role ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-4 sm:text-base"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                href="/dang-nhap"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:px-4 sm:text-base"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 py-14 text-white sm:py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:px-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Nền tảng học tập trực tuyến
            </p>

            <h1 className="mt-6 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Tạo đề, làm bài và chấm điểm online
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg sm:leading-8">
              Hỗ trợ tải câu hỏi từ Excel, Word, PDF, lưu nhiều đề thi,
              chấm điểm tự động và quản lý kết quả học sinh.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {canCreateExam && (
                <Link
                  href="/trac-nghiem"
                  className="rounded-xl bg-white px-6 py-3 text-center font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  Tạo đề trắc nghiệm
                </Link>
              )}

              <Link
                href="/de-thi"
                className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-center font-bold text-white transition hover:bg-white/20"
              >
                {role === "student"
                  ? "Chọn đề để làm"
                  : "Xem danh sách đề"}
              </Link>

              {role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-center font-bold text-white transition hover:bg-white/20"
                >
                  Quản trị tài khoản
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur sm:p-5">
            <div className="rounded-2xl bg-white p-4 text-slate-900 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    Đề kiểm tra mẫu
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Kiểm tra Tin học
                  </h2>
                </div>

                <span className="self-start rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  Đang mở
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold">
                    Câu 1. Thiết bị nào dùng để nhập dữ liệu?
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <span className="rounded-lg bg-slate-100 p-3">
                      A. Màn hình
                    </span>

                    <span className="rounded-lg bg-blue-50 p-3 text-blue-700">
                      B. Bàn phím
                    </span>

                    <span className="rounded-lg bg-slate-100 p-3">
                      C. Loa
                    </span>

                    <span className="rounded-lg bg-slate-100 p-3">
                      D. Máy chiếu
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-sm text-slate-500">Số câu</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      20
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-sm text-slate-500">Thời gian</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">
                      15 phút
                    </p>
                  </div>

                  <div className="rounded-xl bg-violet-50 p-4">
                    <p className="text-sm text-slate-500">Thang điểm</p>
                    <p className="mt-1 text-2xl font-bold text-violet-700">
                      10
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Chức năng nổi bật
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Mọi công cụ cần thiết trong một website
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              {role === "admin"
                ? "Bạn đang sử dụng tài khoản quản trị viên."
                : role === "teacher"
                  ? "Bạn đang sử dụng tài khoản giáo viên."
                  : role === "student"
                    ? "Bạn đang sử dụng tài khoản học sinh / sinh viên."
                    : "Đăng nhập để sử dụng đầy đủ chức năng theo tài khoản."}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {visibleFeatures.map((feature) => (
              <article
                key={`${feature.href}-${feature.title}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {feature.icon}
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {feature.description}
                </p>

                <Link
                  href={feature.href}
                  className="mt-6 inline-flex items-center font-bold text-blue-600 transition group-hover:text-blue-700"
                >
                  {feature.buttonText}
                  <span className="ml-2">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-4 py-14 text-white sm:px-6 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <p className="text-4xl font-extrabold text-blue-400">01</p>
            <h3 className="mt-4 text-xl font-bold">Tải đề lên</h3>
            <p className="mt-2 leading-7 text-slate-300">
              Giáo viên tải file Excel, Word hoặc PDF có câu hỏi và đáp án.
            </p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-blue-400">02</p>
            <h3 className="mt-4 text-xl font-bold">Lưu và quản lý đề</h3>
            <p className="mt-2 leading-7 text-slate-300">
              Mỗi đề được lưu riêng, có thể chỉnh sửa, nhân bản hoặc xóa.
            </p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-blue-400">03</p>
            <h3 className="mt-4 text-xl font-bold">Học sinh làm bài</h3>
            <p className="mt-2 leading-7 text-slate-300">
              Học sinh chọn đề, nhập họ tên và làm bài trong thời gian quy định.
            </p>
          </div>

          <div>
            <p className="text-4xl font-extrabold text-blue-400">04</p>
            <h3 className="mt-4 text-xl font-bold">Nhận kết quả</h3>
            <p className="mt-2 leading-7 text-slate-300">
              Hệ thống tự chấm điểm, lưu kết quả và hỗ trợ xuất danh sách.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 md:flex-row">
          <div className="max-w-2xl">
            <p>
              © {new Date().getFullYear()} Quiz Sinh Viên. Nền tảng trắc
              nghiệm trực tuyến.
            </p>

            <p className="mt-2 leading-6">
              Được phát triển bởi{" "}
              <span className="font-semibold text-blue-600">
                DarkTech
              </span>
              {" "}— dự án công nghệ thuộc hệ sinh thái{" "}
              <span className="font-semibold text-slate-700">
                DarkGroup
              </span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-5">
            <Link
              href="/trac-nghiem"
              className="transition hover:text-blue-600"
            >
              Tạo đề
            </Link>

            <Link
              href="/de-thi"
              className="transition hover:text-blue-600"
            >
              Danh sách đề
            </Link>

            <Link
              href="/lam-bai"
              className="transition hover:text-blue-600"
            >
              Làm bài
            </Link>

            <Link
              href="/ket-qua"
              className="transition hover:text-blue-600"
            >
              Kết quả
            </Link>

            <Link
              href="/tinh-diem"
              className="transition hover:text-blue-600"
            >
              Tính điểm
            </Link>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_15px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          <Link
            href="/"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-blue-600"
          >
            <span className="text-lg">🏠</span>
            Trang chủ
          </Link>

          {canCreateExam ? (
            <Link
              href="/trac-nghiem"
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-slate-600"
            >
              <span className="text-lg">📝</span>
              Tạo đề
            </Link>
          ) : (
            <Link
              href="/de-thi"
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-slate-600"
            >
              <span className="text-lg">🎯</span>
              Làm bài
            </Link>
          )}

          <Link
            href="/de-thi"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">📚</span>
            Kho đề
          </Link>

          <Link
            href="/ket-qua"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">📊</span>
            Kết quả
          </Link>

          <Link
            href="/tinh-diem"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">🧮</span>
            Tính điểm
          </Link>
        </div>
      </nav>
    </main>
  );
}