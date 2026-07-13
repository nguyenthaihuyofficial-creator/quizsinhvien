"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type SectionType =
  | "intro"
  | "story"
  | "workflow"
  | "values"
  | "roadmap"
  | "contact"
  | "content";

interface AboutSection {
  id: string;
  section_type: SectionType;
  title: string;
  content: string;
  icon: string | null;
  image_url: string | null;
  position: number;
  is_visible: boolean;
}

const emptyForm = {
  section_type: "content" as SectionType,
  title: "",
  content: "",
  icon: "",
  image_url: "",
  position: 0,
  is_visible: true,
};

export default function AdminGioiThieuPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/dang-nhap";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role !== "admin") {
        setMessage("Chỉ quản trị viên được chỉnh sửa trang giới thiệu.");
        return;
      }

      setAuthorized(true);
      await loadSections();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải trang quản trị giới thiệu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSections() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("about_sections")
      .select(
        "id,section_type,title,content,icon,image_url,position,is_visible"
      )
      .order("position", { ascending: true });

    if (error) throw error;
    setSections((data || []) as AboutSection[]);
  }

  function startEdit(item: AboutSection) {
    setEditingId(item.id);
    setForm({
      section_type: item.section_type,
      title: item.title,
      content: item.content,
      icon: item.icon || "",
      image_url: item.image_url || "",
      position: item.position,
      is_visible: item.is_visible,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm({
      ...emptyForm,
      position:
        sections.length > 0
          ? Math.max(...sections.map((item) => item.position)) + 1
          : 1,
    });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Vui lòng nhập tiêu đề.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const supabase = createClient();

      const payload = {
        section_type: form.section_type,
        title: form.title.trim(),
        content: form.content.trim(),
        icon: form.icon.trim() || null,
        image_url: form.image_url.trim() || null,
        position: Number(form.position) || 0,
        is_visible: form.is_visible,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("about_sections")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Đã cập nhật nội dung.");
      } else {
        const { error } = await supabase
          .from("about_sections")
          .insert(payload);

        if (error) throw error;
        setMessage("Đã thêm nội dung mới.");
      }

      await loadSections();
      resetForm();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu nội dung."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(item: AboutSection) {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("about_sections")
        .update({
          is_visible: !item.is_visible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      await loadSections();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đổi trạng thái."
      );
    }
  }

  async function deleteSection(item: AboutSection) {
    if (!window.confirm(`Xóa mục "${item.title}"?`)) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("about_sections")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setMessage("Đã xóa nội dung.");
      await loadSections();

      if (editingId === item.id) resetForm();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa nội dung."
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        Đang tải...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-rose-700">{message}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-blue-600">
              ← Quản trị
            </Link>
            <h1 className="mt-1 text-2xl font-bold">
              Quản lý trang Giới thiệu
            </h1>
          </div>

          <Link
            href="/gioi-thieu"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Xem trang công khai
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:px-8 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSave}
          className="h-fit rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
        >
          <h2 className="text-xl font-bold">
            {editingId ? "Sửa nội dung" : "Thêm nội dung"}
          </h2>

          <label className="mt-5 block">
            <span className="text-sm font-semibold">Loại nội dung</span>
            <select
              value={form.section_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  section_type: event.target.value as SectionType,
                })
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4"
            >
              <option value="intro">Giới thiệu chính</option>
              <option value="story">Ý tưởng hình thành</option>
              <option value="workflow">Bước hoạt động</option>
              <option value="values">Giá trị cốt lõi</option>
              <option value="roadmap">Định hướng</option>
              <option value="contact">Liên hệ</option>
              <option value="content">Nội dung khác</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Tiêu đề *</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Nội dung</span>
            <textarea
              value={form.content}
              onChange={(event) =>
                setForm({ ...form, content: event.target.value })
              }
              rows={7}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label>
              <span className="text-sm font-semibold">Biểu tượng</span>
              <input
                value={form.icon}
                onChange={(event) =>
                  setForm({ ...form, icon: event.target.value })
                }
                placeholder="Ví dụ: 💡"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Thứ tự</span>
              <input
                type="number"
                value={form.position}
                onChange={(event) =>
                  setForm({
                    ...form,
                    position: Number(event.target.value),
                  })
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">URL hình ảnh</span>
            <input
              value={form.image_url}
              onChange={(event) =>
                setForm({ ...form, image_url: event.target.value })
              }
              placeholder="https://..."
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
            />
          </label>

          <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={(event) =>
                setForm({
                  ...form,
                  is_visible: event.target.checked,
                })
              }
            />
            <span className="font-semibold">Hiển thị công khai</span>
          </label>

          {message && (
            <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              {message}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : editingId
                  ? "Cập nhật"
                  : "Thêm mục"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700"
              >
                Hủy
              </button>
            )}
          </div>
        </form>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Nội dung hiện có
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {sections.length} mục giới thiệu
              </h2>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              + Thêm mới
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {sections.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl">
                        {item.icon || "📌"}
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.section_type}
                      </span>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        Thứ tự {item.position}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_visible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.is_visible ? "Đang hiện" : "Đang ẩn"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold">
                      {item.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleVisibility(item)}
                      className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
                    >
                      {item.is_visible ? "Ẩn" : "Hiện"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSection(item)}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}