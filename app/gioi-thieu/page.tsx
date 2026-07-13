"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

interface AboutSection {
  id: string;
  section_type:
    | "intro"
    | "story"
    | "workflow"
    | "values"
    | "roadmap"
    | "contact"
    | "content";
  title: string;
  content: string;
  icon: string | null;
  image_url: string | null;
  position: number;
  is_visible: boolean;
}

export default function GioiThieuPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const supabase = createClient();

      const [{ data, error }, { data: authData }] = await Promise.all([
        supabase
          .from("about_sections")
          .select(
            "id,section_type,title,content,icon,image_url,position,is_visible"
          )
          .eq("is_visible", true)
          .order("position", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (error) throw error;

      setSections((data || []) as AboutSection[]);

      const user = authData.user;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setIsAdmin(profile?.role === "admin");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải nội dung giới thiệu."
      );
    } finally {
      setLoading(false);
    }
  }

  const intro = useMemo(
    () => sections.find((item) => item.section_type === "intro"),
    [sections]
  );

  const story = useMemo(
    () => sections.find((item) => item.section_type === "story"),
    [sections]
  );

  const workflow = useMemo(
    () => sections.filter((item) => item.section_type === "workflow"),
    [sections]
  );

  const values = useMemo(
    () => sections.filter((item) => item.section_type === "values"),
    [sections]
  );

  const remainingSections = useMemo(
    () =>
      sections.filter((item) =>
        ["roadmap", "contact", "content"].includes(item.section_type)
      ),
    [sections]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <Link href="/" className="font-semibold text-blue-600">
            ← Trang chủ
          </Link>

          <div className="flex gap-2">
            {isAdmin && (
              <Link
                href="/admin/gioi-thieu"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Chỉnh sửa nội dung
              </Link>
            )}

            <Link
              href="/lien-he"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Liên hệ
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              Đang tải nội dung...
            </div>
          ) : message ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
              {message}
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-7 sm:p-10 lg:p-12">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                      Giới thiệu
                    </p>

                    <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                      {intro?.title || "Về QuizSinhVien.Vn"}
                    </h1>

                    <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-slate-600">
                      {intro?.content ||
                        "Nền tảng trắc nghiệm trực tuyến dành cho người học và giáo viên."}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        href="/de-thi"
                        className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                      >
                        Xem kho đề
                      </Link>

                      <Link
                        href="/tai-lieu"
                        className="rounded-full bg-cyan-50 px-5 py-3 font-semibold text-cyan-700 ring-1 ring-cyan-200"
                      >
                        Kho tài liệu
                      </Link>
                    </div>
                  </div>

                  <div className="flex min-h-72 items-center justify-center bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_100%)] p-8">
                    {intro?.image_url ? (
                      <img
                        src={intro.image_url}
                        alt={intro.title}
                        className="max-h-80 w-full rounded-3xl object-cover shadow-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-8xl">
                          {intro?.icon || "🎓"}
                        </div>
                        <p className="mt-5 text-xl font-bold text-blue-700">
                          Học tập rõ ràng hơn
                        </p>
                        <p className="mt-2 text-slate-500">
                          Tạo đề · Làm bài · Chấm điểm · Quản lý kết quả
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {story && (
                <section className="mt-8 grid gap-6 rounded-[2rem] bg-slate-900 p-7 text-white sm:p-10 lg:grid-cols-[160px_1fr] lg:items-center">
                  <div className="text-7xl">{story.icon || "💡"}</div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                      Câu chuyện
                    </p>
                    <h2 className="mt-3 text-3xl font-bold">
                      {story.title}
                    </h2>
                    <p className="mt-4 whitespace-pre-line leading-8 text-slate-300">
                      {story.content}
                    </p>
                  </div>
                </section>
              )}

              {workflow.length > 0 && (
                <section className="mt-14">
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                      Cách hệ thống hoạt động
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                      Một quy trình đơn giản và liền mạch
                    </h2>
                  </div>

                  <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                    {workflow.map((item, index) => (
                      <article
                        key={item.id}
                        className="relative rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-3xl">
                            {item.icon || "•"}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-bold">
                          {item.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {item.content}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {values.length > 0 && (
                <section className="mt-14">
                  <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                        Giá trị cốt lõi
                      </p>
                      <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                        Tập trung vào trải nghiệm thực tế
                      </h2>
                      <p className="mt-4 leading-8 text-slate-600">
                        Mỗi tính năng được xây dựng để giúp việc tạo đề,
                        làm bài và quản lý kết quả trở nên dễ hiểu hơn.
                      </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {values.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                        >
                          <div className="text-4xl">
                            {item.icon || "✨"}
                          </div>
                          <h3 className="mt-4 text-xl font-bold">
                            {item.title}
                          </h3>
                          <p className="mt-3 leading-7 text-slate-600">
                            {item.content}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {remainingSections.length > 0 && (
                <section className="mt-14 grid gap-5 md:grid-cols-2">
                  {remainingSections.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-slate-200"
                    >
                      <div className="text-4xl">
                        {item.icon || "📌"}
                      </div>
                      <h2 className="mt-4 text-2xl font-bold">
                        {item.title}
                      </h2>
                      <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                        {item.content}
                      </p>
                    </article>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}