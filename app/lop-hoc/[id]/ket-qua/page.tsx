"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface ClassRow {
  id: string;
  owner_id: string;
  name: string;
  subject: string | null;
  school_name: string | null;
  class_code: string;
}

interface MemberRow {
  student_id: string;
  joined_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

interface AssignmentRow {
  exam_id: string;
}

interface ExamRow {
  id: string;
  title: string;
}

interface ResultRow {
  id: string;
  exam_id: string;
  user_id: string;
  student_name: string | null;
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  used_seconds: number;
  submitted_at: string;
  violation_count: number;
  submit_reason: string | null;
}

interface StudentResult {
  resultId: string;
  userId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  score: number | null;
  maxScore: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  usedSeconds: number | null;
  submittedAt: string | null;
  violationCount: number | null;
  submitReason: string | null;
}

function formatDuration(totalSeconds: number | null) {
  if (
    totalSeconds === null ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0
  ) {
    return "—";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa nộp";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Không rõ";

  return date.toLocaleString("vi-VN");
}

function escapeCsvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function KetQuaTheoLopPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id;

  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [classItem, setClassItem] = useState<ClassRow | null>(
    null
  );
  const [rows, setRows] = useState<StudentResult[]>([]);
  const [examOptions, setExamOptions] = useState<ExamRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (classId) {
      loadPage();
    }
  }, [classId]);

  async function loadPage() {
    try {
      setLoaded(false);
      setMessage("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/dang-nhap";
        return;
      }

      setCurrentUserId(user.id);

      const [
        { data: profile, error: profileError },
        { data: classData, error: classError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single(),
        supabase
          .from("classes")
          .select(
            "id, owner_id, name, subject, school_name, class_code"
          )
          .eq("id", classId)
          .single(),
      ]);

      if (profileError) throw profileError;
      if (classError) throw classError;

      const currentRole = profile.role as UserRole;
      const currentClass = classData as ClassRow;
      const canManage =
        currentClass.owner_id === user.id ||
        currentRole === "admin";

      if (!canManage) {
        throw new Error(
          "Bạn không có quyền xem kết quả của lớp này."
        );
      }

      setRole(currentRole);
      setClassItem(currentClass);

      const [
        { data: memberData, error: memberError },
        { data: assignmentData, error: assignmentError },
      ] = await Promise.all([
        supabase
          .from("class_members")
          .select("student_id, joined_at")
          .eq("class_id", classId),
        supabase
          .from("class_exams")
          .select("exam_id")
          .eq("class_id", classId),
      ]);

      if (memberError) throw memberError;
      if (assignmentError) throw assignmentError;

      const members = (memberData || []) as MemberRow[];
      const assignments =
        (assignmentData || []) as AssignmentRow[];

      const studentIds = members.map(
        (item) => item.student_id
      );
      const examIds = assignments.map((item) => item.exam_id);

      if (studentIds.length === 0 || examIds.length === 0) {
        setRows([]);
        setExamOptions([]);
        return;
      }

      const [
        { data: profileRows, error: studentProfileError },
        { data: examRows, error: examError },
        { data: resultRows, error: resultError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds),
        supabase
          .from("exams")
          .select("id, title")
          .in("id", examIds),
        supabase
          .from("exam_results")
          .select(
            "id, exam_id, user_id, student_name, score, max_score, correct_count, total_questions, used_seconds, submitted_at, violation_count, submit_reason"
          )
          .in("exam_id", examIds)
          .in("user_id", studentIds)
          .order("submitted_at", { ascending: false }),
      ]);

      if (studentProfileError) throw studentProfileError;
      if (examError) throw examError;
      if (resultError) throw resultError;

      const profiles = (profileRows || []) as ProfileRow[];
      const exams = (examRows || []) as ExamRow[];
      const results = (resultRows || []) as ResultRow[];

      setExamOptions(exams);

      const profileMap = new Map(
        profiles.map((item) => [
          item.id,
          item.full_name || "Học sinh / Sinh viên",
        ])
      );

      const examMap = new Map(
        exams.map((item) => [item.id, item.title])
      );

      const latestResultMap = new Map<string, ResultRow>();

      for (const result of results) {
        const key = `${result.user_id}-${result.exam_id}`;

        if (!latestResultMap.has(key)) {
          latestResultMap.set(key, result);
        }
      }

      const combinedRows: StudentResult[] = [];

      for (const studentId of studentIds) {
        for (const examId of examIds) {
          const key = `${studentId}-${examId}`;
          const result = latestResultMap.get(key);

          combinedRows.push({
            resultId: result?.id || key,
            userId: studentId,
            studentName:
              result?.student_name ||
              profileMap.get(studentId) ||
              "Học sinh / Sinh viên",
            examId,
            examTitle: examMap.get(examId) || "Đề đã bị xóa",
            score: result ? Number(result.score) || 0 : null,
            maxScore: result
              ? Number(result.max_score) || 10
              : null,
            correctCount: result
              ? Number(result.correct_count) || 0
              : null,
            totalQuestions: result
              ? Number(result.total_questions) || 0
              : null,
            usedSeconds: result
              ? Number(result.used_seconds) || 0
              : null,
            submittedAt: result?.submitted_at || null,
            violationCount: result
              ? Number(result.violation_count) || 0
              : null,
            submitReason: result?.submit_reason || null,
          });
        }
      }

      setRows(combinedRows);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải kết quả theo lớp."
      );
    } finally {
      setLoaded(true);
    }
  }

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesExam =
        selectedExamId === "all" ||
        row.examId === selectedExamId;

      const matchesSearch =
        !search ||
        row.studentName.toLowerCase().includes(search) ||
        row.examTitle.toLowerCase().includes(search);

      return matchesExam && matchesSearch;
    });
  }, [rows, selectedExamId, searchText]);

  const statistics = useMemo(() => {
    const submitted = filteredRows.filter(
      (item) => item.submittedAt
    );

    if (submitted.length === 0) {
      return {
        submittedCount: 0,
        pendingCount: filteredRows.length,
        averageScore: 0,
        highestScore: 0,
      };
    }

    const scores = submitted.map((item) => item.score || 0);

    return {
      submittedCount: submitted.length,
      pendingCount: filteredRows.length - submitted.length,
      averageScore:
        scores.reduce((total, value) => total + value, 0) /
        scores.length,
      highestScore: Math.max(...scores),
    };
  }, [filteredRows]);

  function exportCsv() {
    if (filteredRows.length === 0) {
      setMessage("Không có dữ liệu để xuất.");
      return;
    }

    const header = [
      "STT",
      "Họ và tên",
      "Tên đề",
      "Trạng thái",
      "Điểm",
      "Câu đúng",
      "Thời gian làm",
      "Thời gian nộp",
      "Vi phạm",
    ];

    const dataRows = filteredRows.map((row, index) => [
      index + 1,
      row.studentName,
      row.examTitle,
      row.submittedAt ? "Đã nộp" : "Chưa làm",
      row.score ?? "",
      row.correctCount !== null &&
      row.totalQuestions !== null
        ? `${row.correctCount}/${row.totalQuestions}`
        : "",
      formatDuration(row.usedSeconds),
      formatDate(row.submittedAt),
      row.violationCount ?? "",
    ]);

    const csvContent = [
      header.map(escapeCsvValue).join(","),
      ...dataRows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `ket-qua-lop-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải kết quả lớp học...
        </p>
      </main>
    );
  }

  if (!classItem) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-10 text-center">
          <h1 className="text-2xl font-extrabold">
            Không thể mở kết quả lớp
          </h1>

          <p className="mt-3 text-red-600">
            {message || "Không tìm thấy lớp học."}
          </p>

          <Link
            href="/lop-hoc"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 font-bold text-white"
          >
            Quay lại lớp học
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link
              href={`/lop-hoc/${classItem.id}`}
              className="text-sm font-bold text-blue-600"
            >
              ← Quay lại lớp học
            </Link>

            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Kết quả theo lớp
            </h1>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
            Mã lớp: {classItem.class_code}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold text-blue-100">
            {classItem.subject || "Lớp học trực tuyến"}
          </p>

          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            {classItem.name}
          </h2>

          {classItem.school_name && (
            <p className="mt-3 text-blue-50">
              {classItem.school_name}
            </p>
          )}

          <p className="mt-3 max-w-3xl leading-7 text-blue-50">
            Theo dõi tình trạng làm bài, điểm số và kết quả của
            học sinh / sinh viên trong lớp.
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Tổng lượt cần làm
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {filteredRows.length}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Đã nộp</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {statistics.submittedCount}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Chưa làm</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">
              {statistics.pendingCount}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm trung bình
            </p>
            <p className="mt-2 text-3xl font-extrabold text-violet-700">
              {statistics.averageScore.toFixed(1)}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-bold">
                Tìm người học hoặc tên đề
              </span>
              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Nhập từ khóa tìm kiếm"
                className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">
                Lọc theo đề
              </span>
              <select
                value={selectedExamId}
                onChange={(event) =>
                  setSelectedExamId(event.target.value)
                }
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">Tất cả đề đã giao</option>

                {examOptions.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="min-h-12 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Xuất CSV
            </button>
          </div>
        </section>

        {filteredRows.length === 0 ? (
          <section className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📊</div>
            <h2 className="mt-4 text-xl font-extrabold">
              Chưa có dữ liệu kết quả
            </h2>
            <p className="mt-2 text-slate-600">
              Lớp chưa có thành viên hoặc chưa có đề được giao.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 hidden overflow-hidden rounded-3xl bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left">STT</th>
                      <th className="px-4 py-4 text-left">
                        Họ và tên
                      </th>
                      <th className="px-4 py-4 text-left">
                        Tên đề
                      </th>
                      <th className="px-4 py-4 text-center">
                        Trạng thái
                      </th>
                      <th className="px-4 py-4 text-center">
                        Điểm
                      </th>
                      <th className="px-4 py-4 text-center">
                        Câu đúng
                      </th>
                      <th className="px-4 py-4 text-center">
                        Thời gian
                      </th>
                      <th className="px-4 py-4 text-left">
                        Thời gian nộp
                      </th>
                      <th className="px-4 py-4 text-center">
                        Vi phạm
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr
                        key={`${row.userId}-${row.examId}`}
                        className="border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 font-bold">
                          {row.studentName}
                        </td>
                        <td className="px-4 py-4">
                          {row.examTitle}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={
                              row.submittedAt
                                ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                                : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
                            }
                          >
                            {row.submittedAt
                              ? "Đã nộp"
                              : "Chưa làm"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-extrabold">
                          {row.score !== null
                            ? row.score.toFixed(1)
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {row.correctCount !== null &&
                          row.totalQuestions !== null
                            ? `${row.correctCount}/${row.totalQuestions}`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {formatDuration(row.usedSeconds)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDate(row.submittedAt)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {row.violationCount ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:hidden">
              {filteredRows.map((row, index) => (
                <article
                  key={`${row.userId}-${row.examId}`}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        #{index + 1}
                      </p>
                      <h3 className="mt-1 font-extrabold">
                        {row.studentName}
                      </h3>
                      <p className="mt-1 text-sm text-blue-600">
                        {row.examTitle}
                      </p>
                    </div>

                    <span
                      className={
                        row.submittedAt
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
                      }
                    >
                      {row.submittedAt
                        ? "Đã nộp"
                        : "Chưa làm"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Điểm
                      </p>
                      <p className="mt-1 text-xl font-extrabold text-blue-700">
                        {row.score !== null
                          ? row.score.toFixed(1)
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Câu đúng
                      </p>
                      <p className="mt-1 text-xl font-extrabold">
                        {row.correctCount !== null &&
                        row.totalQuestions !== null
                          ? `${row.correctCount}/${row.totalQuestions}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>
                      Thời gian làm:{" "}
                      <span className="font-bold">
                        {formatDuration(row.usedSeconds)}
                      </span>
                    </p>
                    <p>
                      Thời gian nộp:{" "}
                      <span className="font-bold">
                        {formatDate(row.submittedAt)}
                      </span>
                    </p>
                    <p>
                      Vi phạm:{" "}
                      <span className="font-bold">
                        {row.violationCount ?? "—"}
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </main>
  );
}