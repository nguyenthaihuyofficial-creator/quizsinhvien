"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "../lib/supabase/client";

type Mode = "login" | "register";
type Role = "student" | "teacher";

export default function DangNhapPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedLoginEmail");

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  function showMessage(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  function translateError(text: string) {
    const error = text.toLowerCase();

    if (error.includes("invalid login credentials")) {
      return "Email hoặc mật khẩu không đúng.";
    }

    if (error.includes("email not confirmed")) {
      return "Bạn chưa xác nhận email.";
    }

    if (error.includes("user already registered")) {
      return "Email này đã được đăng ký.";
    }

    if (error.includes("password should be at least")) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    return text || "Đã xảy ra lỗi.";
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage("Vui lòng nhập đầy đủ email và mật khẩu.", true);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (rememberEmail) {
        localStorage.setItem("rememberedLoginEmail", cleanEmail);
      } else {
        localStorage.removeItem("rememberedLoginEmail");
      }

      showMessage("Đăng nhập thành công.");
      window.location.href = "/";
    } catch (error) {
      showMessage(
        error instanceof Error
          ? translateError(error.message)
          : "Không thể đăng nhập.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      showMessage("Vui lòng nhập họ và tên.", true);
      return;
    }

    if (!cleanEmail) {
      showMessage("Vui lòng nhập email.", true);
      return;
    }

    if (password.length < 6) {
      showMessage("Mật khẩu phải có ít nhất 6 ký tự.", true);
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Mật khẩu nhập lại không khớp.", true);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role,
          },
          emailRedirectTo: `${window.location.origin}/dang-nhap`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        showMessage("Đăng ký thành công.");
        window.location.href = "/";
        return;
      }

      setPassword("");
      setConfirmPassword("");

      showMessage(
        "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản."
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? translateError(error.message)
          : "Không thể đăng ký.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage("Vui lòng nhập email tài khoản.", true);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const { error } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
        });

      if (error) {
        throw error;
      }

      setForgotOpen(false);
      showMessage(
        "Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra email."
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? translateError(error.message)
          : "Không thể gửi email đặt lại mật khẩu.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/" className="text-2xl font-extrabold">
              Quiz Sinh Viên
            </Link>

            <p className="mt-2 text-blue-100">
              Học tập và kiểm tra trực tuyến
            </p>
          </div>

          <div>
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              Hệ thống tài khoản
            </p>

            <h1 className="mt-5 text-3xl font-extrabold leading-tight">
              Đăng nhập để quản lý dữ liệu của riêng bạn
            </h1>

            <p className="mt-4 leading-7 text-blue-100">
              Giáo viên quản lý đề thi, học sinh làm bài và quản trị
              viên quản lý toàn bộ hệ thống.
            </p>
          </div>

          <p className="text-sm text-blue-200">
            Mật khẩu được Supabase Auth xử lý an toàn.
          </p>
        </section>

        <section className="p-5 sm:p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-xl font-extrabold text-blue-700 lg:hidden"
              >
                Quiz Sinh Viên
              </Link>

              <p className="mt-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                Tài khoản
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                {mode === "login"
                  ? "Chào mừng trở lại"
                  : "Tạo tài khoản mới"}
              </h2>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Trang chủ
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={
                mode === "login"
                  ? "rounded-xl bg-white px-4 py-2.5 font-bold text-blue-700 shadow-sm"
                  : "rounded-xl px-4 py-2.5 font-bold text-slate-500"
              }
            >
              Đăng nhập
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={
                mode === "register"
                  ? "rounded-xl bg-white px-4 py-2.5 font-bold text-blue-700 shadow-sm"
                  : "rounded-xl px-4 py-2.5 font-bold text-slate-500"
              }
            >
              Đăng ký
            </button>
          </div>

          {message && (
            <div
              className={
                isError
                  ? "mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                  : "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              }
            >
              {message}
            </div>
          )}

          <form
            onSubmit={
              mode === "login" ? handleLogin : handleRegister
            }
            className="mt-5 space-y-4"
          >
            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Họ và tên
                  </label>

                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Nhập đầy đủ họ và tên"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Loại tài khoản
                  </label>

                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as Role)
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="student">
                      Học sinh / Sinh viên
                    </option>
                    <option value="teacher">Giáo viên</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Email
              </label>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="tenban@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mật khẩu
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Ít nhất 6 ký tự"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute inset-y-0 right-0 px-4 text-sm font-bold text-blue-700"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Nhập lại mật khẩu
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Nhập lại mật khẩu"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    className="absolute inset-y-0 right-0 px-4 text-sm font-bold text-blue-700"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(event) =>
                      setRememberEmail(event.target.checked)
                    }
                  />
                  Ghi nhớ email
                </label>

                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm font-bold text-blue-700"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-6 py-3 font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Website không lưu mật khẩu thật. Trình duyệt có thể đề
            nghị lưu mật khẩu.
          </p>
        </section>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-blue-600">
                  Khôi phục tài khoản
                </p>

                <h2 className="mt-1 text-xl font-extrabold">
                  Quên mật khẩu
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="h-10 w-10 rounded-full bg-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Nhập email để nhận liên kết đặt lại mật khẩu.
            </p>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="tenban@example.com"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 font-bold"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {loading ? "Đang gửi..." : "Gửi liên kết"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}