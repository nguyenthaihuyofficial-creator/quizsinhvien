"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: UserRole;
}

interface ClassRow {
  id: string;
  owner_id: string;
  name: string;
  subject: string | null;
  class_code: string;
  status: "active" | "closed";
  created_at: string;
}

interface ExamRow {
  id: string;
  status: "draft" | "published" | "closed";
}

interface ClassMemberRow {
  class_id: string;
}

interface ClassExamRow {
  class_id: string;
}

interface ClassItem extends ClassRow {
  owner_name: string;
  member_count: number;
  assignment_count: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không rõ"
    : date.toLocaleDateString("vi-VN");
}

export default function AdminDashboardPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/dang-nhap";
        return;
      }

      const { data: currentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      if (currentProfile.role !== "admin") {
        setAuthorized(false);
        setMessage("Chỉ quản trị viên được truy cập dashboard.");
        return;
      }

      setAuthorized(true);

      const [
        profilesResponse,
        classesResponse,
        examsResponse,
        resultsResponse,
        membersResponse,
        assignmentsResponse,
      ] = await Promise.all([
        supabase.from("profiles").select("id,full_name,role"),
        supabase
          .from("classes")
          .select("id,owner_id,name,subject,class_code,status,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("exams").select("id,status"),
        supabase
          .from("exam_results")
          .select("id", { count: "exact", head: true }),
        supabase.from("class_members").select("class_id"),
        supabase.from("class_exams").select("class_id"),
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (classesResponse.error) throw classesResponse.error;
      if (examsResponse.error) throw examsResponse.error;
      if (resultsResponse.error) throw resultsResponse.error;
      if (membersResponse.error) throw membersResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;

      const profileRows =
        (profilesResponse.data || []) as ProfileRow[];
      const classRows =
        (classesResponse.data || []) as ClassRow[];
      const memberRows =
        (membersResponse.data || []) as ClassMemberRow[];
      const assignmentRows =
        (assignmentsResponse.data || []) as ClassExamRow[];

      const profileMap = new Map(
        profileRows.map((profile) => [
          profile.id,
          profile.full_name || "Giáo viên",
        ])
      );

      const memberCountMap = new Map<string, number>();
      const assignmentCountMap = new Map<string, number>();

      memberRows.forEach((row) => {
        memberCountMap.set(
          row.class_id,
          (memberCountMap.get(row.class_id) || 0) + 1
        );
      });

      assignmentRows.forEach((row) => {
        assignmentCountMap.set(
          row.class_id,
          (assignmentCountMap.get(row.class_id) || 0) + 1
        );
      });

      setProfiles(profileRows);
      setExams((examsResponse.data || []) as ExamRow[]);
      setResultCount(resultsResponse.count || 0);

      setClasses(
        classRows.map((item) => ({
          ...item,
          owner_name:
            profileMap.get(item.owner_id) || "Không rõ giáo viên",
          member_count: memberCountMap.get(item.id) || 0,
          assignment_count: assignmentCountMap.get(item.id) || 0,
        }))
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const teacherCount = profiles.filter(
      (profile) => profile.role === "teacher"
    ).length;

    const studentCount = profiles.filter(
      (profile) => profile.role === "student"
    ).length;

    const activeClasses = classes.filter(
      (item) => item.status === "active"
    ).length;

    const publishedExams = exams.filter(
      (exam) => exam.status === "published"
    ).length;

    return {
      totalUsers: profiles.length,
      teacherCount,
      studentCount,
      totalClasses: classes.length,
      activeClasses,
      totalExams: exams.length,
      publishedExams,
      resultCount,
    };
  }, [classes, exams, profiles, resultCount]);

  const filteredClasses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return classes.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const searchableText = [
        item.name,
        item.subject || "",
        item.owner_name,
        item.class_code,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!keyword || searchableText.includes(keyword))
      );
    });
  }, [classes, searchText, statusFilter]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-semibold text-slate-500">
          Đang tải dashboard...
        </p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-rose-700">
            {message || "Chỉ quản trị viên được sử dụng trang này."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 font-semibold text-white"
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
            <Link
              href="/admin"
              className="text-sm font-semibold text-blue-600"
            >
              ← Quản trị
            </Link>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Dashboard hệ thống
            </h1>
          </div>

          <Link
            href="/tai-lieu"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Kho tài liệu
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">
            Tổng quan quản trị
          </p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Theo dõi hoạt động của QuizSinhVien.Vn
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-blue-100">
            Xem nhanh người dùng, lớp học, đề thi và lượt làm bài trên toàn hệ thống.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Người dùng", metrics.totalUsers, "👥"],
            ["Giáo viên", metrics.teacherCount, "🧑‍🏫"],
            ["Học sinh / Sinh viên", metrics.studentCount, "🎓"],
            ["Tổng lớp học", metrics.totalClasses, "🏫"],
            ["Lớp đang mở", metrics.activeClasses, "🟢"],
            ["Tổng đề thi", metrics.totalExams, "📝"],
            ["Đề công khai", metrics.publishedExams, "📚"],
            ["Lượt làm bài", metrics.resultCount, "📊"],
          ].map(([label, value, icon]) => (
            <article
              key={String(label)}
              className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">
                  {label}
                </p>
                <span className="text-xl">{icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {value}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Kiểm tra lớp học
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Tất cả lớp trên hệ thống
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-[280px_180px]">
              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Tìm lớp, giáo viên, mã lớp..."
                className="min-h-11 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="closed">Đã đóng</option>
              </select>
            </div>
          </div>

          {filteredClasses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Không có lớp phù hợp.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2">Lớp học</th>
                    <th className="px-4 py-2">Giáo viên</th>
                    <th className="px-4 py-2">Thành viên</th>
                    <th className="px-4 py-2">Đề đã giao</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2">Kiểm tra</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClasses.map((item) => (
                    <tr key={item.id} className="bg-slate-50 text-sm">
                      <td className="rounded-l-2xl px-4 py-4">
                        <p className="font-bold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.subject || "Chưa có môn học"} ·{" "}
                          {item.class_code} · {formatDate(item.created_at)}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {item.owner_name}
                      </td>

                      <td className="px-4 py-4">
                        {item.member_count}
                      </td>

                      <td className="px-4 py-4">
                        {item.assignment_count}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.status === "active"
                            ? "Đang hoạt động"
                            : "Đã đóng"}
                        </span>
                      </td>

                      <td className="rounded-r-2xl px-4 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/lop-hoc/${item.id}`}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                          >
                            Xem lớp
                          </Link>

                          <Link
                            href={`/lop-hoc/${item.id}/ket-qua`}
                            className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            Kết quả
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}