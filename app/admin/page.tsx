"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Quản trị viên";
  if (role === "teacher") return "Giáo viên";
  return "Học sinh / Sinh viên";
}

function getRoleClass(role: UserRole) {
  if (role === "admin") {
    return "bg-red-100 text-red-700";
  }

  if (role === "teacher") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-blue-100 text-blue-700";
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/dang-nhap";
        return;
      }

      setCurrentUserId(user.id);

      const { data: ownProfile, error: ownProfileError } =
        await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .single();

      if (ownProfileError) {
        throw ownProfileError;
      }

      if (ownProfile.role !== "admin") {
        setAuthorized(false);
        setIsError(true);
        setMessage("Bạn không có quyền truy cập trang quản trị.");
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setProfiles((data || []) as Profile[]);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách tài khoản."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProfiles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return profiles;

    return profiles.filter((profile) => {
      return (
        profile.full_name.toLowerCase().includes(keyword) ||
        (profile.email || "").toLowerCase().includes(keyword) ||
        getRoleLabel(profile.role)
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [profiles, searchText]);

  const statistics = useMemo(() => {
    return {
      total: profiles.length,
      admin: profiles.filter((item) => item.role === "admin")
        .length,
      teacher: profiles.filter(
        (item) => item.role === "teacher"
      ).length,
      student: profiles.filter(
        (item) => item.role === "student"
      ).length,
    };
  }, [profiles]);

  async function handleChangeRole(
    profile: Profile,
    newRole: UserRole
  ) {
    if (profile.role === newRole) return;

    if (
      profile.id === currentUserId &&
      profile.role === "admin" &&
      newRole !== "admin"
    ) {
      const confirmed = window.confirm(
        "Bạn đang đổi quyền Admin của chính mình. Sau khi đổi, bạn sẽ mất quyền truy cập trang này. Tiếp tục?"
      );

      if (!confirmed) return;
    }

    try {
      setUpdatingId(profile.id);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase.rpc("set_user_role", {
        target_user_id: profile.id,
        new_role: newRole,
      });

      if (error) {
        throw error;
      }

      setProfiles((currentProfiles) =>
        currentProfiles.map((item) =>
          item.id === profile.id
            ? {
                ...item,
                role: newRole,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      setIsError(false);
      setMessage(
        `Đã đổi quyền của ${
          profile.full_name || profile.email || "tài khoản"
        } thành ${getRoleLabel(newRole)}.`
      );

      if (
        profile.id === currentUserId &&
        newRole !== "admin"
      ) {
        window.setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đổi quyền tài khoản."
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/dang-nhap";
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không rõ";
    }

    return date.toLocaleString("vi-VN");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải trang quản trị...
        </p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            Không có quyền truy cập
          </h1>

          <p className="mt-3 text-red-700">
            {message ||
              "Trang này chỉ dành cho quản trị viên."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link
              href="/"
              className="text-xl font-extrabold text-blue-700"
            >
              Quiz Sinh Viên
            </Link>

            <p className="text-sm text-slate-500">
              Trang quản trị hệ thống
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Dashboard tổng quan
            </Link>

            <Link
              href="/tai-lieu"
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
            >
              Kho tài liệu
            </Link>

            <Link
              href="/admin/thuong-hieu"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
            >
              Cài đặt thương hiệu
            </Link>

            <Link
              href="/gioi-thieu"
              className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
            >
              Trang giới thiệu
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Trang chủ
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-100">
            Admin Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-extrabold">
            Quản lý tài khoản
          </h1>

          <p className="mt-3 text-blue-100">
            Xem danh sách người dùng và thay đổi quyền truy cập.
          </p>
        </section>

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

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Tổng tài khoản
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Admin</p>
            <p className="mt-2 text-3xl font-extrabold text-red-700">
              {statistics.admin}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Giáo viên
            </p>
            <p className="mt-2 text-3xl font-extrabold text-violet-700">
              {statistics.teacher}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Học sinh / Sinh viên
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {statistics.student}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <label
            htmlFor="user-search"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Tìm tài khoản
          </label>

          <input
            id="user-search"
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Tìm theo họ tên, email hoặc quyền"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 text-left">STT</th>
                  <th className="px-4 py-4 text-left">
                    Người dùng
                  </th>
                  <th className="px-4 py-4 text-left">Email</th>
                  <th className="px-4 py-4 text-left">
                    Quyền hiện tại
                  </th>
                  <th className="px-4 py-4 text-left">Ngày tạo</th>
                  <th className="px-4 py-4 text-left">
                    Đổi quyền
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProfiles.map((profile, index) => (
                  <tr
                    key={profile.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      {index + 1}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">
                        {profile.full_name || "Chưa nhập tên"}
                      </p>

                      {profile.id === currentUserId && (
                        <p className="mt-1 text-xs font-bold text-blue-600">
                          Tài khoản của bạn
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {profile.email || "Chưa có email"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${getRoleClass(
                          profile.role
                        )}`}
                      >
                        {getRoleLabel(profile.role)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(profile.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={profile.role}
                        disabled={updatingId === profile.id}
                        onChange={(event) =>
                          handleChangeRole(
                            profile,
                            event.target.value as UserRole
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold outline-none disabled:opacity-50"
                      >
                        <option value="student">
                          Học sinh / Sinh viên
                        </option>
                        <option value="teacher">
                          Giáo viên
                        </option>
                        <option value="admin">
                          Quản trị viên
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}

                {filteredProfiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Không tìm thấy tài khoản phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}