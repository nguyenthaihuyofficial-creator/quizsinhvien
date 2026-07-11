"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface ResultRow {
  id: string;
  exam_id: string;
  user_id: string;
  student_name: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  used_seconds: number;
  submitted_at: string;
  exams:
    | {
        id: string;
        title: string;
        owner_id: string;
      }
    | {
        id: string;
        title: string;
        owner_id: string;
      }[]
    | null;
}

interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  usedSeconds: number;
  submittedAt: string;
  userId: string;
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "Không rõ";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ";
  }

  return date.toLocaleString("vi-VN");
}

function escapeCsvValue(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export default function KetQuaPage() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [currentRole, setCurrentRole] =
    useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedExamId, setSelectedExamId] =
    useState("all");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">("info");
  const [deletingId, setDeletingId] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
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

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      const role = profile.role as UserRole;
      setCurrentRole(role);

      const { data, error } = await supabase
        .from("exam_results")
        .select(
          `
          id,
          exam_id,
          user_id,
          student_name,
          score,
          max_score,
          correct_count,
          total_questions,
          used_seconds,
          submitted_at,
          exams (
            id,
            title,
            owner_id
          )
          `
        )
        .order("submitted_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalizedResults = (
        (data || []) as unknown as ResultRow[]
      ).map((row) => {
        const exam = Array.isArray(row.exams)
          ? row.exams[0]
          : row.exams;

        return {
          id: row.id,
          examId: row.exam_id,
          examTitle: exam?.title || "Đề đã bị xóa",
          studentName:
            row.student_name || "Chưa nhập tên",
          score: Number(row.score) || 0,
          maxScore: Number(row.max_score) || 0,
          correctCount:
            Number(row.correct_count) || 0,
          totalQuestions:
            Number(row.total_questions) || 0,
          usedSeconds:
            Number(row.used_seconds) || 0,
          submittedAt: row.submitted_at,
          userId: row.user_id,
        };
      });

      setResults(normalizedResults);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải kết quả."
      );
      setMessageType("error");
    } finally {
      setLoaded(true);
    }
  }

  const examOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

    results.forEach((result) => {
      optionMap.set(
        result.examId,
        result.examTitle
      );
    });

    return Array.from(optionMap.entries()).map(
      ([id, title]) => ({
        id,
        title,
      })
    );
  }, [results]);

  const filteredResults = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return results.filter((result) => {
      const matchesExam =
        selectedExamId === "all" ||
        result.examId === selectedExamId;

      const matchesSearch =
        !normalizedSearch ||
        result.studentName
          .toLowerCase()
          .includes(normalizedSearch) ||
        result.examTitle
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesExam && matchesSearch;
    });
  }, [results, searchText, selectedExamId]);

  const statistics = useMemo(() => {
    if (filteredResults.length === 0) {
      return {
        averagePercentage: 0,
        highestPercentage: 0,
        passCount: 0,
      };
    }

    const percentages = filteredResults.map(
      (result) =>
        result.maxScore > 0
          ? (result.score / result.maxScore) * 100
          : 0
    );

    const averagePercentage =
      percentages.reduce(
        (total, value) => total + value,
        0
      ) / percentages.length;

    return {
      averagePercentage,
      highestPercentage: Math.max(...percentages),
      passCount: percentages.filter(
        (percentage) => percentage >= 50
      ).length,
    };
  }, [filteredResults]);

  async function handleDeleteResult(
    result: ExamResult
  ) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa kết quả này không?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(result.id);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase
        .from("exam_results")
        .delete()
        .eq("id", result.id);

      if (error) {
        throw error;
      }

      setResults((currentResults) =>
        currentResults.filter(
          (item) => item.id !== result.id
        )
      );

      setMessage("Đã xóa kết quả.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa kết quả."
      );
      setMessageType("error");
    } finally {
      setDeletingId("");
    }
  }

  async function handleClearResults() {
    if (results.length === 0) return;

    const confirmed = window.confirm(
      currentRole === "student"
        ? "Bạn có chắc muốn xóa toàn bộ kết quả của mình không?"
        : "Bạn có chắc muốn xóa toàn bộ kết quả đang được phép quản lý không?"
    );

    if (!confirmed) return;

    try {
      setClearing(true);
      setMessage("");

      const supabase = createClient();

      const resultIds = results.map(
        (result) => result.id
      );

      const { error } = await supabase
        .from("exam_results")
        .delete()
        .in("id", resultIds);

      if (error) {
        throw error;
      }

      setResults([]);
      setSelectedExamId("all");
      setMessage("Đã xóa toàn bộ kết quả.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa toàn bộ kết quả."
      );
      setMessageType("error");
    } finally {
      setClearing(false);
    }
  }

  function handleExportCsv() {
    if (filteredResults.length === 0) {
      setMessage("Không có dữ liệu để xuất.");
      setMessageType("error");
      return;
    }

    const header = [
      "STT",
      "Họ và tên",
      "Tên đề",
      "Điểm",
      "Điểm tối đa",
      "Tỷ lệ",
      "Số câu đúng",
      "Tổng số câu",
      "Thời gian làm",
      "Thời gian nộp",
    ];

    const rows = filteredResults.map(
      (result, index) => {
        const percentage =
          result.maxScore > 0
            ? (result.score /
                result.maxScore) *
              100
            : 0;

        return [
          index + 1,
          result.studentName,
          result.examTitle,
          result.score,
          result.maxScore,
          `${percentage.toFixed(1)}%`,
          result.correctCount,
          result.totalQuestions,
          formatDuration(result.usedSeconds),
          formatDate(result.submittedAt),
        ];
      }
    );

    const csvContent = [
      header.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const downloadUrl =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = `ket-qua-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);

    setMessage("Đã xuất file kết quả.");
    setMessageType("success");
  }

  const canDeleteAll =
    currentRole === "admin" ||
    currentRole === "teacher" ||
    currentRole === "student";

  const pageTitle =
    currentRole === "student"
      ? "Kết quả của tôi"
      : currentRole === "teacher"
        ? "Kết quả học sinh"
        : "Tất cả kết quả";

  const messageClass =
    messageType === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải kết quả...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24 md:pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link
              href="/"
              className="text-xl font-extrabold text-blue-700"
            >
              Quiz Sinh Viên
            </Link>

            <p className="text-sm text-slate-500">
              Kết quả bài thi trực tuyến
            </p>
          </div>

          <Link
            href="/de-thi"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Chọn đề thi
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-100">
            Quản lý bài thi
          </p>

          <h1 className="mt-2 text-3xl font-extrabold">
            {pageTitle}
          </h1>

          <p className="mt-3 text-blue-100">
            Theo dõi điểm, số câu đúng và thời gian làm bài.
          </p>
        </section>

        {message && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${messageClass}`}
          >
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Lượt nộp bài
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {filteredResults.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm trung bình
            </p>
            <p className="mt-2 text-3xl font-extrabold text-violet-700">
              {statistics.averagePercentage.toFixed(
                1
              )}
              %
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm cao nhất
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {statistics.highestPercentage.toFixed(
                1
              )}
              %
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Số lượt đạt
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">
              {statistics.passCount}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="search-result"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Tìm học sinh hoặc tên đề
              </label>

              <input
                id="search-result"
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Nhập từ khóa tìm kiếm"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="exam-filter"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Lọc theo đề thi
              </label>

              <select
                id="exam-filter"
                value={selectedExamId}
                onChange={(event) =>
                  setSelectedExamId(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">
                  Tất cả đề thi
                </option>

                {examOptions.map((examOption) => (
                  <option
                    key={examOption.id}
                    value={examOption.id}
                  >
                    {examOption.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={
                filteredResults.length === 0
              }
              className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              Xuất file CSV
            </button>

            {canDeleteAll && (
              <button
                type="button"
                onClick={handleClearResults}
                disabled={
                  results.length === 0 ||
                  clearing
                }
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {clearing
                  ? "Đang xóa..."
                  : "Xóa toàn bộ kết quả"}
              </button>
            )}
          </div>
        </section>

        {filteredResults.length === 0 ? (
          <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="text-5xl">📊</div>

            <h2 className="mt-4 text-xl font-extrabold text-slate-800">
              Chưa có kết quả phù hợp
            </h2>

            <p className="mt-2 text-slate-600">
              Hãy chọn đề và hoàn thành bài thi để kết quả xuất hiện.
            </p>

            <Link
              href="/de-thi"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
            >
              Đi đến danh sách đề
            </Link>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-4 text-left">
                      STT
                    </th>
                    <th className="px-4 py-4 text-left">
                      Họ và tên
                    </th>
                    <th className="px-4 py-4 text-left">
                      Tên đề
                    </th>
                    <th className="px-4 py-4 text-center">
                      Điểm
                    </th>
                    <th className="px-4 py-4 text-center">
                      Câu đúng
                    </th>
                    <th className="px-4 py-4 text-center">
                      Thời gian làm
                    </th>
                    <th className="px-4 py-4 text-left">
                      Thời gian nộp
                    </th>
                    <th className="px-4 py-4 text-center">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResults.map(
                    (result, index) => {
                      const percentage =
                        result.maxScore > 0
                          ? (result.score /
                              result.maxScore) *
                            100
                          : 0;

                      return (
                        <tr
                          key={result.id}
                          className="border-b border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {result.studentName}
                          </td>

                          <td className="max-w-xs px-4 py-4 text-slate-700">
                            <p className="line-clamp-2">
                              {result.examTitle}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={
                                percentage >= 50
                                  ? "inline-block rounded-full bg-green-100 px-3 py-1 font-bold text-green-700"
                                  : "inline-block rounded-full bg-red-100 px-3 py-1 font-bold text-red-700"
                              }
                            >
                              {result.score}/
                              {result.maxScore}
                            </span>

                            <p className="mt-1 text-xs text-slate-500">
                              {percentage.toFixed(
                                1
                              )}
                              %
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center font-semibold">
                            {result.correctCount}/
                            {result.totalQuestions}
                          </td>

                          <td className="px-4 py-4 text-center text-slate-700">
                            {formatDuration(
                              result.usedSeconds
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {formatDate(
                              result.submittedAt
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteResult(
                                  result
                                )
                              }
                              disabled={
                                deletingId ===
                                result.id
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
                            >
                              {deletingId ===
                              result.id
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_15px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          <Link
            href="/"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600"
          >
            <span className="text-xl">🏠</span>
            Trang chủ
          </Link>

          <Link
            href="/de-thi"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600"
          >
            <span className="text-xl">📚</span>
            Danh sách đề
          </Link>

          <Link
            href="/lam-bai"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600"
          >
            <span className="text-xl">🎯</span>
            Làm bài
          </Link>

          <Link
            href="/ket-qua"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-blue-600"
          >
            <span className="text-xl">📊</span>
            Kết quả
          </Link>
        </div>
      </nav>
    </main>
  );
}