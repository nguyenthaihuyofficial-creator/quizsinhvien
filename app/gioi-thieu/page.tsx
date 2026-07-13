"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

const defaults = {
  logo_url: "",
  banner_url: "",
  site_name: "QuizSinhVien.Vn",
  slogan: "Nền tảng trắc nghiệm trực tuyến",
  description:
    "Hỗ trợ tạo đề, làm bài, chấm điểm và quản lý kết quả trực tuyến.",
};

export default function GioiThieuPage() {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const supabase = createClient();

      const { data } = await supabase
        .from("site_settings")
        .select(
          "logo_url,banner_url,site_name,slogan,description"
        )
        .eq("id", 1)
        .single();

      if (data) {
        setSettings({
          logo_url: data.logo_url || "",
          banner_url: data.banner_url || "",
          site_name: data.site_name || defaults.site_name,
          slogan: data.slogan || defaults.slogan,
          description:
            data.description || defaults.description,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải trang giới thiệu...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            {settings.logo_url ? (
              <Image
                src={settings.logo_url}
                alt={settings.site_name}
                width={300}
                height={100}
                className="h-12 w-auto object-contain"
                unoptimized
                priority
              />
            ) : (
              <span className="text-xl font-extrabold text-blue-700">
                {settings.site_name}
              </span>
            )}
          </Link>

          <Link
            href="/de-thi"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Xem đề thi
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-100">
              {settings.slogan}
            </p>

            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              {settings.site_name}
            </h1>

            <p className="mt-5 text-lg leading-8 text-blue-100">
              {settings.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/de-thi"
                className="rounded-xl bg-white px-6 py-3 text-center font-extrabold text-blue-700"
              >
                Làm bài ngay
              </Link>

              <Link
                href="/dang-nhap"
                className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-center font-extrabold text-white"
              >
                Đăng nhập
              </Link>
            </div>
          </div>

          {settings.banner_url ? (
            <Image
              src={settings.banner_url}
              alt={`Banner ${settings.site_name}`}
              width={1200}
              height={630}
              className="w-full rounded-3xl object-cover shadow-2xl"
              unoptimized
              priority
            />
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white/10 text-center text-blue-100">
              Chưa có banner
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3">
        {[
          ["📝", "Tạo đề nhanh", "Tạo đề hoặc nhập câu hỏi từ Word và PDF."],
          ["🎯", "Chấm điểm tự động", "Kết quả tự động quy đổi về thang điểm 10."],
          ["📊", "Quản lý kết quả", "Theo dõi điểm và thời gian làm bài thuận tiện."],
        ].map(([icon, title, description]) => (
          <article
            key={title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="text-3xl">{icon}</div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">
              {title}
            </h2>
            <p className="mt-2 leading-7 text-slate-600">
              {description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}