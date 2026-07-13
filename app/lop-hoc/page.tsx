"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface ClassItem {
  id: string;
  owner_id: string;
  name: string;
  subject: string | null;
  school_name: string | null;
  description: string | null;
  class_code: string;
  status: "active" | "closed";
  created_at: string;
}

export default function LopHocPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/dang-nhap";
        return;
      }

      setUserId(user.id);

      const [{ data: profile }, { data: classData, error: classError }] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
        supabase
          .from("classes")
          .select("id, owner_id, name, subject, school_name, description, class_code, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (classError) throw classError;

      if (profile) {
        setFullName(profile.full_name || "");
        setRole(profile.role as UserRole);
      }

      setClasses((classData || []) as ClassItem[]);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Không thể tải danh sách lớp học.", "error");
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleCreateClass(event: FormEvent) {
    event.preventDefault();

    if (!className.trim()) {
      showMessage("Vui lòng nhập tên lớp.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("classes").insert({
        owner_id: userId,
        name: className.trim(),
        subject: subject.trim() || null,
        school_name: schoolName.trim() || null,
        description: description.trim() || null,
      });

      if (error) throw error;

      setClassName("");
      setSubject("");
      setSchoolName("");
      setDescription("");
      showMessage("Đã tạo lớp học thành công.", "success");
      await loadPage();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Không thể tạo lớp học.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleJoinClass(event: FormEvent) {
    event.preventDefault();

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      showMessage("Vui lòng nhập mã lớp.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("join_class_by_code", { input_code: code });
      if (error) throw error;

      setJoinCode("");
      showMessage("Bạn đã tham gia lớp thành công.", "success");
      await loadPage();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Không thể tham gia lớp.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function copyClassCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showMessage(`Đã sao chép mã lớp ${code}.`, "success");
    } catch {
      showMessage("Không thể sao chép mã lớp.", "error");
    }
  }

  async function handleDeleteClass(item: ClassItem) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa lớp "${item.name}" không? Hành động này không thể hoàn tác.`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setClasses((current) =>
        current.filter((classItem) => classItem.id !== item.id)
      );

      showMessage("Đã xóa lớp học.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa lớp học.",
        "error"
      );
    }
  }

  const canCreateClass = role === "teacher" || role === "admin";
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "active" ? -1 : 1;
    });
  }, [classes]);

  const roleLabel = role === "admin" ? "Quản trị viên" : role === "teacher" ? "Giáo viên" : "Học sinh / Sinh viên";

  return (
    <main className="min-h-screen bg-slate-50 pb-10 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-700">← Trang chủ</Link>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Lớp học</h1>
          </div>

          <div className="text-right">
            <p className="max-w-48 truncate text-sm font-bold">{fullName || "Tài khoản của bạn"}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold text-blue-100">QUIZSINHVIEN.VN</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Quản lý lớp học trực tuyến</h2>
          <p className="mt-3 max-w-3xl leading-7 text-blue-50">
            Giáo viên tạo lớp và chia sẻ mã. Học sinh, sinh viên nhập mã để tham gia và nhận đề được giao.
          </p>
        </div>

        {message && (
          <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${messageType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside>
            {canCreateClass ? (
              <form onSubmit={handleCreateClass} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-extrabold">Tạo lớp mới</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Sau khi tạo, hệ thống sẽ tự sinh mã lớp gồm 6 ký tự.</p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold">Tên lớp *</span>
                    <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ví dụ: Lớp 9A9" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">Môn học</span>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ví dụ: Toán" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">Trường / Cơ sở đào tạo</span>
                    <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Nhập tên trường" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">Mô tả</span>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Thông tin ngắn về lớp học" rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                </div>

                <button type="submit" disabled={saving} className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Đang tạo..." : "Tạo lớp học"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinClass} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-extrabold">Tham gia lớp</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Nhập mã lớp do giáo viên cung cấp.</p>

                <label className="mt-5 block">
                  <span className="text-sm font-bold">Mã lớp</span>
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" maxLength={6} className="mt-2 min-h-14 w-full rounded-xl border border-slate-300 px-4 text-center text-xl font-extrabold uppercase tracking-[0.25em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>

                <button type="submit" disabled={saving} className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Đang tham gia..." : "Tham gia lớp"}
                </button>
              </form>
            )}
          </aside>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">Danh sách của bạn</p>
                <h2 className="mt-1 text-2xl font-extrabold">Tất cả lớp học</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">{sortedClasses.length} lớp</span>
            </div>

            {loading ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Đang tải lớp học...</div>
            ) : sortedClasses.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="text-4xl">🏫</div>
                <h3 className="mt-4 text-xl font-extrabold">Chưa có lớp học</h3>
                <p className="mx-auto mt-2 max-w-md leading-7 text-slate-500">
                  {canCreateClass ? "Tạo lớp đầu tiên để chia sẻ mã cho học sinh và sinh viên." : "Nhập mã lớp do giáo viên cung cấp để tham gia."}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {sortedClasses.map((item) => {
                  const isOwner = item.owner_id === userId;
                  return (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🏫</div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.status === "active"
                            ? "Đang hoạt động"
                            : "Đã đóng"}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-extrabold">{item.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-blue-600">{item.subject || "Chưa cập nhật môn học"}</p>
                      {item.school_name && <p className="mt-3 text-sm text-slate-500">{item.school_name}</p>}
                      {item.description && <p className="mt-3 line-clamp-2 leading-6 text-slate-600">{item.description}</p>}

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mã lớp</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xl font-extrabold tracking-[0.2em] text-slate-900">{item.class_code}</span>
                          {isOwner && (
                            <button type="button" onClick={() => copyClassCode(item.class_code)} className="min-h-10 rounded-xl bg-white px-3 text-xs font-bold text-blue-600 ring-1 ring-slate-200 hover:bg-blue-50">Sao chép</button>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <Link
                          href={`/lop-hoc/${item.id}`}
                          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-blue-600"
                        >
                          {isOwner ? "Quản lý lớp" : "Xem lớp học"}
                        </Link>

                        {(isOwner || role === "admin") && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(item)}
                            className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700"
                          >
                            Xóa lớp
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}