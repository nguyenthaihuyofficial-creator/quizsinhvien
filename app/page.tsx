"use client";

import Image from "next/image";
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
  accent: string;
  roles: UserRole[];
}

interface BrandingSettings {
  logo_url: string;
  banner_url: string;
  site_name: string;
  slogan: string;
}

const defaultBranding: BrandingSettings = {
  logo_url: "",
  banner_url: "",
  site_name: "QuizSinhVien.Vn",
  slogan: "Nền tảng trắc nghiệm trực tuyến",
};

const features: FeatureItem[] = [
  {
    title: "Tạo đề trắc nghiệm",
    description:
      "Nhập câu hỏi từ Word hoặc PDF, kiểm tra đáp án và công khai đề chỉ trong vài bước.",
    href: "/trac-nghiem",
    buttonText: "Tạo đề ngay",
    icon: "📝",
    accent: "bg-blue-50 text-blue-700",
    roles: ["teacher", "admin"],
  },
  {
    title: "Lớp học trực tuyến",
    description:
      "Giáo viên tạo lớp, giao đề; học sinh và sinh viên tham gia bằng mã lớp.",
    href: "/lop-hoc",
    buttonText: "Mở lớp học",
    icon: "🏫",
    accent: "bg-sky-50 text-sky-700",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Ngân hàng câu hỏi",
    description:
      "Lưu, tìm kiếm và chọn lại câu hỏi để tạo đề nhanh hơn.",
    href: "/ngan-hang-cau-hoi",
    buttonText: "Mở ngân hàng",
    icon: "🧠",
    accent: "bg-indigo-50 text-indigo-700",
    roles: ["teacher", "admin"],
  },
  {
    title: "Kho đề đang mở",
    description:
      "Xem danh sách đề phù hợp, lựa chọn đúng bài và bắt đầu làm ngay trên mọi thiết bị.",
    href: "/de-thi",
    buttonText: "Xem kho đề",
    icon: "📚",
    accent: "bg-cyan-50 text-cyan-700",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Làm bài trực tuyến",
    description:
      "Giao diện rõ ràng, dễ bấm trên điện thoại, máy tính bảng và laptop.",
    href: "/de-thi",
    buttonText: "Chọn đề để làm",
    icon: "🎯",
    accent: "bg-emerald-50 text-emerald-700",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Xem kết quả",
    description:
      "Theo dõi điểm số, số câu đúng, thời gian làm bài và trạng thái nộp bài.",
    href: "/ket-qua",
    buttonText: "Xem kết quả",
    icon: "📊",
    accent: "bg-violet-50 text-violet-700",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Tính điểm VLUTE",
    description:
      "Tính điểm học phần, quy đổi điểm chữ và hệ 4 nhanh chóng, dễ hiểu.",
    href: "/tinh-diem",
    buttonText: "Tính điểm",
    icon: "🧮",
    accent: "bg-amber-50 text-amber-700",
    roles: ["student", "teacher", "admin"],
  },
  {
    title: "Quản trị hệ thống",
    description:
      "Quản lý tài khoản, phân quyền và cấu hình thương hiệu của website.",
    href: "/admin",
    buttonText: "Mở quản trị",
    icon: "🛡️",
    accent: "bg-rose-50 text-rose-700",
    roles: ["admin"],
  },
];

export default function HomePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    try {
      const supabase = createClient();

      const [{ data: authData }, { data: siteData }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("site_settings")
            .select("logo_url,banner_url,site_name,slogan")
            .eq("id", 1)
            .single(),
        ]);

      if (siteData) {
        setBranding({
          logo_url: siteData.logo_url || "",
          banner_url: siteData.banner_url || "",
          site_name:
            siteData.site_name || defaultBranding.site_name,
          slogan: siteData.slogan || defaultBranding.slogan,
        });
      }

      const user = authData.user;

      if (!user) {
        setRole(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setRole(profile.role as UserRole);
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

  const roleLabel =
    role === "admin"
      ? "Quản trị viên"
      : role === "teacher"
        ? "Giáo viên"
        : role === "student"
          ? "Học sinh / Sinh viên"
          : "Khách";

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
          >
            {branding.logo_url ? (
              <Image
                src={branding.logo_url}
                alt={branding.site_name}
                width={260}
                height={80}
                className="h-10 w-auto max-w-[180px] object-contain sm:h-11 sm:max-w-[230px]"
                unoptimized
                priority
              />
            ) : (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-extrabold text-white shadow-sm">
                  Q
                </span>
                <span className="truncate text-lg font-extrabold tracking-tight text-blue-700 sm:text-xl">
                  {branding.site_name}
                </span>
              </>
            )}
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {canCreateExam && (
              <>
                <Link
                  href="/trac-nghiem"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  Tạo đề
                </Link>

                <Link
                  href="/ngan-hang-cau-hoi"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  Ngân hàng
                </Link>
              </>
            )}

            <Link
              href="/lop-hoc"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Lớp học
            </Link>

            <Link
              href="/de-thi"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Kho đề
            </Link>

            <Link
              href="/ket-qua"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Kết quả
            </Link>

            <Link
              href="/tinh-diem"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Tính điểm
            </Link>

            <Link
              href="/gioi-thieu"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Giới thiệu
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {!loadingUser && role && (
              <div className="hidden rounded-2xl bg-slate-100 px-3 py-2 text-right lg:block">
                <p className="max-w-40 truncate text-xs font-bold text-slate-800">
                  {fullName || "Tài khoản của bạn"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {roleLabel}
                </p>
              </div>
            )}

            {!loadingUser && role ? (
              <>
                <Link
                  href="/tai-khoan"
                  className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:px-4"
                >
                  Tài khoản
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 sm:px-4"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/dang-nhap"
                className="flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-18 md:px-8 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-blue-50">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              {branding.slogan}
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Học tập và kiểm tra trực tuyến
              <span className="block text-cyan-100">
                rõ ràng, nhanh và dễ sử dụng
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-blue-50 sm:text-lg">
              Tạo đề, làm bài, chấm điểm và theo dõi kết quả trên
              điện thoại, máy tính bảng hoặc laptop với cùng một
              trải nghiệm nhất quán.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/de-thi"
                className="flex min-h-12 items-center justify-center rounded-xl bg-white px-6 font-extrabold text-blue-700 shadow-lg shadow-blue-900/10 transition hover:bg-blue-50"
              >
                Chọn đề để làm
              </Link>

              {canCreateExam && (
                <Link
                  href="/trac-nghiem"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 font-extrabold text-white transition hover:bg-white/20"
                >
                  Tạo đề trắc nghiệm
                </Link>
              )}

              {!role && (
                <Link
                  href="/dang-nhap"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 font-extrabold text-white transition hover:bg-white/20"
                >
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["10 điểm", "Chấm tự động"],
                ["Mọi thiết bị", "Responsive"],
                ["An toàn", "Theo dõi bài thi"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <p className="text-base font-extrabold sm:text-lg">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-4">
            {branding.banner_url ? (
              <Image
                src={branding.banner_url}
                alt={`Banner ${branding.site_name}`}
                width={1200}
                height={630}
                className="aspect-[16/10] w-full rounded-[1.5rem] object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="rounded-[1.5rem] bg-white p-5 text-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-600">
                      Bài kiểm tra mẫu
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                      Kiểm tra năng lực số
                    </h2>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Đang mở
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <p className="font-bold leading-7">
                    Câu 1. Mật khẩu mạnh nên có đặc điểm nào?
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      "A. Chỉ gồm chữ thường",
                      "B. Ngày sinh cá nhân",
                      "C. Nhiều loại ký tự",
                      "D. Dùng chung nhiều tài khoản",
                    ].map((answer, index) => (
                      <div
                        key={answer}
                        className={
                          index === 2
                            ? "rounded-xl border border-blue-300 bg-blue-50 p-3 text-sm font-semibold text-blue-700"
                            : "rounded-xl bg-slate-100 p-3 text-sm text-slate-700"
                        }
                      >
                        {answer}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ["25", "Câu hỏi"],
                    ["20", "Phút"],
                    ["10", "Điểm"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-slate-50 p-4 text-center"
                    >
                      <p className="text-2xl font-extrabold text-blue-700">
                        {value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-blue-600">
                Chức năng dành cho bạn
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                Học và làm bài theo cách đơn giản hơn
              </h2>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
              Vai trò hiện tại:{" "}
              <span className="font-extrabold text-slate-900">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleFeatures.map((feature) => (
              <article
                key={`${feature.href}-${feature.title}`}
                className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${feature.accent}`}
                >
                  {feature.icon}
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {feature.description}
                </p>

                <Link
                  href={feature.href}
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition group-hover:bg-blue-600"
                >
                  {feature.buttonText}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 md:px-8 md:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              ["01", "Chọn đề", "Tìm đúng đề đang mở trong kho đề."],
              ["02", "Làm bài", "Thao tác dễ dàng trên điện thoại và máy tính."],
              ["03", "Nộp bài", "Hệ thống tự lưu và tự chấm điểm."],
              ["04", "Xem kết quả", "Theo dõi điểm và số câu đúng ngay lập tức."],
            ].map(([number, title, description]) => (
              <article
                key={number}
                className="rounded-3xl bg-slate-50 p-6"
              >
                <p className="text-sm font-extrabold text-blue-600">
                  BƯỚC {number}
                </p>
                <h3 className="mt-3 text-xl font-extrabold">
                  {title}
                </h3>
                <p className="mt-2 leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 px-4 py-10 text-white sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-extrabold">
              {branding.site_name}
            </p>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()}{" "}
              <span className="font-bold text-white">
                QuizSinhVien.Vn
              </span>
              . Phát triển bởi{" "}
              <span className="font-bold text-cyan-400">
                DarkTech
              </span>
              , thuộc hệ sinh thái{" "}
              <span className="font-bold text-blue-400">
                DarkGroup
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <Link href="/gioi-thieu" className="hover:text-white">
              Giới thiệu
            </Link>
            <Link href="/huong-dan" className="hover:text-white">
              Hướng dẫn
            </Link>
            <Link href="/lien-he" className="hover:text-white">
              Liên hệ
            </Link>
            <Link href="/de-thi" className="hover:text-white">
              Kho đề
            </Link>
            <Link href="/ket-qua" className="hover:text-white">
              Kết quả
            </Link>
            <Link href="/dang-nhap" className="hover:text-white">
              Đăng nhập
            </Link>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="grid grid-cols-6">
          <Link
            href="/"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-bold text-blue-600"
          >
            <span className="text-lg">🏠</span>
            Trang chủ
          </Link>

          <Link
            href="/lop-hoc"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">🏫</span>
            Lớp học
          </Link>

          <Link
            href="/de-thi"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">📚</span>
            Kho đề
          </Link>

          <Link
            href={canCreateExam ? "/trac-nghiem" : "/de-thi"}
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">
              {canCreateExam ? "📝" : "🎯"}
            </span>
            {canCreateExam ? "Tạo đề" : "Làm bài"}
          </Link>

          <Link
            href="/ket-qua"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">📊</span>
            Kết quả
          </Link>

          <Link
            href="/tinh-diem"
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold text-slate-600"
          >
            <span className="text-lg">🧮</span>
            Tính điểm
          </Link>
        </div>
      </nav>
    </main>
  );
}