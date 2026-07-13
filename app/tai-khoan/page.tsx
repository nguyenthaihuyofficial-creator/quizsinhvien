"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: UserRole;
}

interface ClassMemberRow {
  class_id: string;
}

interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  school_name: string | null;
  class_code: string;
  status: "active" | "closed";
}

interface ResultRow {
  id: string;
  exam_id: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string;
  exams:
    | {
        id: string;
        title: string;
      }
    | {
        id: string;
        title: string;
      }[]
    | null;
}

interface ResultItem {
  id: string;
  examTitle: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ";
  }

  return date.toLocaleString("vi-VN");
}

export default function TaiKhoanPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">("info");

  useEffect(() => {
    loadPage();
  }, []);

  function showMessage(
    text: string,
    type: "success" | "error" | "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function loadPage() {
    try {
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/dang-nhap";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      const profileData = profile as ProfileRow;

      setFullName(profileData.full_name || "");
      setRole(profileData.role);

      if (profileData.role === "student") {
        const [
          { data: memberRows, error: memberError },
          { data: resultRows, error: resultError },
        ] = await Promise.all([
          supabase
            .from("class_members")
            .select("class_id")
            .eq("student_id", user.id),
          supabase
            .from("exam_results")
            .select(
              `
              id,
              exam_id,
              score,
              max_score,
              correct_count,
              total_questions,
              submitted_at,
              exams (
                id,
                title
              )
              `
            )
            .eq("user_id", user.id)
            .order("submitted_at", { ascending: false })
            .limit(10),
        ]);

        if (memberError) throw memberError;
        if (resultError) throw resultError;

        const classIds = (
          (memberRows || []) as ClassMemberRow[]
        ).map((item) => item.class_id);

        if (classIds.length > 0) {
          const { data: classRows, error: classError } =
            await supabase
              .from("classes")
              .select(
                "id, name, subject, school_name, class_code, status"
              )
              .in("id", classIds)
              .order("created_at", { ascending: false });

          if (classError) throw classError;

          setClasses((classRows || []) as ClassRow[]);
        } else {
          setClasses([]);
        }

        const normalizedResults = (
          (resultRows || []) as unknown as ResultRow[]
        ).map((row) => {
          const exam = Array.isArray(row.exams)
            ? row.exams[0]
            : row.exams;

          return {
            id: row.id,
            examTitle: exam?.title || "Đề đã bị xóa",
            score: Number(row.score) || 0,
            maxScore: Number(row.max_score) || 10,
            correctCount: Number(row.correct_count) || 0,
            totalQuestions: Number(row.total_questions) || 0,
            submittedAt: row.submitted_at,
          };
        });

        setResults(normalizedResults);
      } else {
        const { data: classRows, error: classError } =
          await supabase
            .from("classes")
            .select(
              "id, name, subject, school_name, class_code, status"
            )
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (classError) throw classError;

        setClasses((classRows || []) as ClassRow[]);
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải hồ sơ tài khoản.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();

    if (!fullName.trim()) {
      showMessage("Vui lòng nhập họ và tên.", "error");
      return;
    }

    try {
      setSavingProfile(true);

      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
        })
        .eq("id", userId);

      if (error) throw error;

      showMessage("Đã cập nhật hồ sơ.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật hồ sơ.",
        "error"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();

    if (newPassword.length < 6) {
      showMessage(
        "Mật khẩu mới phải có ít nhất 6 ký tự.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(
        "Mật khẩu xác nhận không khớp.",
        "error"
      );
      return;
    }

    try {
      setSavingPassword(true);

      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      showMessage("Đã đổi mật khẩu thành công.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể đổi mật khẩu.",
        "error"
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/dang-nhap";
  }

  const roleLabel =
    role === "admin"
      ? "Quản trị viên"
      : role === "teacher"
        ? "Giáo viên"
        : "Học sinh / Sinh viên";

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0;

    return (
      results.reduce(
        (total, item) => total + item.score,
        0
      ) / results.length
    );
  }, [results]);

  const initials = useMemo(() => {
    const cleanName = fullName.trim();

    if (!cleanName) return "QS";

    const parts = cleanName.split(/\s+/);

    return parts
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [fullName]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải hồ sơ tài khoản...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12 text-slate-900">
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
              Hồ sơ tài khoản
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/15 text-3xl font-extrabold backdrop-blur">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-100">
                QUIZSINHVIEN.VN
              </p>

              <h2 className="mt-2 truncate text-3xl font-extrabold sm:text-4xl">
                {fullName || "Tài khoản của bạn"}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                  {roleLabel}
                </span>

                <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                  {email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : messageType === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-xl font-extrabold">
                Thông tin cá nhân
              </h2>

              <label className="mt-5 block">
                <span className="text-sm font-bold">
                  Họ và tên
                </span>
                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="Nhập họ và tên"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-bold">
                  Email đăng nhập
                </span>
                <input
                  value={email}
                  disabled
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-500"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-bold">
                  Vai trò
                </span>
                <input
                  value={roleLabel}
                  disabled
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-500"
                />
              </label>

              <button
                type="submit"
                disabled={savingProfile}
                className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingProfile
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </button>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-xl font-extrabold">
                Đổi mật khẩu
              </h2>

              <label className="mt-5 block">
                <span className="text-sm font-bold">
                  Mật khẩu mới
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="Ít nhất 6 ký tự"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-bold">
                  Xác nhận mật khẩu
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Nhập lại mật khẩu"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <button
                type="submit"
                disabled={savingPassword}
                className="mt-5 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingPassword
                  ? "Đang đổi..."
                  : "Đổi mật khẩu"}
              </button>
            </form>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Lớp học
                </p>
                <p className="mt-2 text-3xl font-extrabold text-blue-700">
                  {classes.length}
                </p>
              </article>

              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Lượt làm bài
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                  {results.length}
                </p>
              </article>

              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Điểm trung bình
                </p>
                <p className="mt-2 text-3xl font-extrabold text-violet-700">
                  {averageScore.toFixed(1)}
                </p>
              </article>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                    Lớp học
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    {role === "student"
                      ? "Lớp đã tham gia"
                      : "Lớp đang quản lý"}
                  </h2>
                </div>

                <Link
                  href="/lop-hoc"
                  className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                >
                  Xem tất cả
                </Link>
              </div>

              {classes.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Chưa có lớp học.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {classes.map((item) => (
                    <Link
                      key={item.id}
                      href={`/lop-hoc/${item.id}`}
                      className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-sm text-blue-600">
                            {item.subject ||
                              "Chưa cập nhật môn học"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.status === "active"
                            ? "Đang mở"
                            : "Đã đóng"}
                        </span>
                      </div>

                      {item.school_name && (
                        <p className="mt-3 text-sm text-slate-500">
                          {item.school_name}
                        </p>
                      )}

                      <p className="mt-3 text-xs font-bold text-slate-500">
                        Mã lớp: {item.class_code}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {role === "student" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                      Lịch sử
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold">
                      Bài làm gần đây
                    </h2>
                  </div>

                  <Link
                    href="/ket-qua"
                    className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {results.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    Chưa có kết quả bài làm.
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {results.map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <h3 className="font-bold">
                            {item.examTitle}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(item.submittedAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-extrabold text-blue-700">
                            {item.score.toFixed(1)}/
                            {item.maxScore}
                          </span>

                          <span className="text-sm font-semibold text-slate-600">
                            {item.correctCount}/
                            {item.totalQuestions} câu
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {role !== "student" && (
              <section className="grid gap-4 sm:grid-cols-2">
                <Link
                  href="/trac-nghiem"
                  className="rounded-3xl bg-blue-600 p-6 text-white shadow-sm transition hover:bg-blue-700"
                >
                  <p className="text-sm font-bold text-blue-100">
                    Giáo viên
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold">
                    Tạo đề mới
                  </h2>
                  <p className="mt-2 text-blue-100">
                    Tạo đề từ file, câu thủ công hoặc ngân hàng
                    câu hỏi.
                  </p>
                </Link>

                <Link
                  href="/ngan-hang-cau-hoi"
                  className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm transition hover:bg-slate-800"
                >
                  <p className="text-sm font-bold text-slate-300">
                    Công cụ
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold">
                    Ngân hàng câu hỏi
                  </h2>
                  <p className="mt-2 text-slate-300">
                    Quản lý và sử dụng câu hỏi cho nhiều đề.
                  </p>
                </Link>
              </section>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}