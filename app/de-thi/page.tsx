"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type ExamStatus = "draft" | "published" | "closed";
type UserRole = "admin" | "teacher" | "student";

interface Exam {
  id: string;
  owner_id: string;
  title: string;
  duration_minutes: number;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
  questions: {
    id: string;
    score: number;
  }[];
}

function getStatusLabel(status: ExamStatus) {
  if (status === "published") return "Đã công khai";
  if (status === "closed") return "Đã đóng";
  return "Bản nháp";
}

function getStatusClass(status: ExamStatus) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "closed") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function DeThiPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] =
    useState<UserRole | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">("info");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
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

      let query = supabase
        .from("exams")
        .select(
          `
          id,
          owner_id,
          title,
          duration_minutes,
          status,
          created_at,
          updated_at,
          questions (
            id,
            score
          )
          `
        )
        .order("created_at", { ascending: false });

      if (role === "student") {
        query = query.eq("status", "published");
      } else if (role === "teacher") {
        query = query.eq("owner_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setExams((data || []) as unknown as Exam[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách đề thi."
      );
      setMessageType("error");
    } finally {
      setLoaded(true);
    }
  }

  const totalQuestions = useMemo(() => {
    return exams.reduce(
      (total, exam) =>
        total + (exam.questions?.length || 0),
      0
    );
  }, [exams]);

  function handleStartExam(exam: Exam) {
    if (exam.status !== "published") {
      setMessage(
        "Chỉ đề đã công khai mới có thể làm bài."
      );
      setMessageType("error");
      return;
    }

    localStorage.setItem("selectedExamId", exam.id);
    window.location.href = "/lam-bai";
  }

  function handleEditExam(exam: Exam) {
    localStorage.setItem("editingExamId", exam.id);
    window.location.href = "/trac-nghiem";
  }

  async function handleDelete(exam: Exam) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa đề "${exam.title}" không?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(exam.id);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", exam.id);

      if (error) {
        throw error;
      }

      setExams((currentExams) =>
        currentExams.filter(
          (currentExam) => currentExam.id !== exam.id
        )
      );

      localStorage.removeItem("editingExamId");

      const selectedExamId =
        localStorage.getItem("selectedExamId");

      if (selectedExamId === exam.id) {
        localStorage.removeItem("selectedExamId");
      }

      setMessage("Đã xóa đề thi.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa đề thi."
      );
      setMessageType("error");
    } finally {
      setDeletingId("");
    }
  }

  async function handleDuplicate(exam: Exam) {
    try {
      setMessage("Đang nhân bản đề thi...");
      setMessageType("info");

      const supabase = createClient();

      const { data: fullExam, error: loadError } =
        await supabase
          .from("exams")
          .select(
            `
            id,
            title,
            duration_minutes,
            questions (
              id,
              content,
              score,
              position,
              answers (
                content,
                is_correct,
                position
              )
            )
            `
          )
          .eq("id", exam.id)
          .single();

      if (loadError) {
        throw loadError;
      }

      const {
        data: newExam,
        error: createExamError,
      } = await supabase
        .from("exams")
        .insert({
          owner_id: currentUserId,
          title: `${fullExam.title} - Bản sao`,
          duration_minutes:
            fullExam.duration_minutes,
          status: "draft",
        })
        .select("id")
        .single();

      if (createExamError) {
        throw createExamError;
      }

      const sourceQuestions = [
        ...(fullExam.questions || []),
      ].sort(
        (a, b) =>
          Number(a.position) - Number(b.position)
      );

      for (const question of sourceQuestions) {
        const {
          data: newQuestion,
          error: createQuestionError,
        } = await supabase
          .from("questions")
          .insert({
            exam_id: newExam.id,
            content: question.content,
            score: question.score,
            position: question.position,
          })
          .select("id")
          .single();

        if (createQuestionError) {
          throw createQuestionError;
        }

        const answerRows = [
          ...(question.answers || []),
        ]
          .sort(
            (a, b) =>
              Number(a.position) -
              Number(b.position)
          )
          .map((answer) => ({
            question_id: newQuestion.id,
            content: answer.content,
            is_correct: answer.is_correct,
            position: answer.position,
          }));

        if (answerRows.length > 0) {
          const { error: createAnswersError } =
            await supabase
              .from("answers")
              .insert(answerRows);

          if (createAnswersError) {
            throw createAnswersError;
          }
        }
      }

      setMessage("Đã nhân bản đề thi.");
      setMessageType("success");

      await loadExams();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể nhân bản đề thi."
      );
      setMessageType("error");
    }
  }

  function formatDate(dateText: string) {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) {
      return "Không rõ thời gian";
    }

    return date.toLocaleString("vi-VN");
  }

  function getTotalScore(exam: Exam) {
    return (exam.questions || []).reduce(
      (total, question) => {
        const score = Number(question.score);

        return (
          total +
          (Number.isFinite(score) ? score : 0)
        );
      },
      0
    );
  }

  const canManage =
    currentRole === "teacher" ||
    currentRole === "admin";

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
          Đang tải danh sách đề thi...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12">
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
              Kho đề thi trực tuyến
            </p>
          </div>

          {canManage && (
            <Link
              href="/trac-nghiem"
              onClick={() =>
                localStorage.removeItem("editingExamId")
              }
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              + Tạo đề mới
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-100">
            Kho đề thi
          </p>

          <h1 className="mt-2 text-3xl font-extrabold">
            {currentRole === "student"
              ? "Đề thi đang mở"
              : currentRole === "teacher"
                ? "Đề thi của tôi"
                : "Tất cả đề thi"}
          </h1>

          <p className="mt-3 text-blue-100">
            Hiện có {exams.length} đề và{" "}
            {totalQuestions} câu hỏi.
          </p>
        </section>

        {message && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${messageClass}`}
          >
            {message}
          </div>
        )}

        {exams.length === 0 ? (
          <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="text-5xl">📄</div>

            <h2 className="mt-4 text-xl font-extrabold text-slate-900">
              Chưa có đề thi phù hợp
            </h2>

            <p className="mt-2 text-slate-500">
              {currentRole === "student"
                ? "Hiện chưa có đề nào được công khai."
                : "Hãy tạo đề trắc nghiệm mới."}
            </p>

            {canManage && (
              <Link
                href="/trac-nghiem"
                onClick={() =>
                  localStorage.removeItem(
                    "editingExamId"
                  )
                }
                className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
              >
                Tạo đề ngay
              </Link>
            )}
          </section>
        ) : (
          <section className="mt-6 grid gap-5 md:grid-cols-2">
            {exams.map((exam, index) => (
              <article
                key={exam.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-extrabold text-blue-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-extrabold text-slate-900">
                        {exam.title}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          exam.status
                        )}`}
                      >
                        {getStatusLabel(exam.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Tạo lúc:{" "}
                      {formatDate(exam.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Số câu
                    </p>

                    <p className="mt-1 text-2xl font-extrabold text-blue-700">
                      {exam.questions?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-violet-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Thời gian
                    </p>

                    <p className="mt-1 text-xl font-extrabold text-violet-700">
                      {exam.duration_minutes}
                    </p>

                    <p className="text-xs text-slate-500">
                      phút
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Tổng điểm
                    </p>

                    <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                      {Number(
                        getTotalScore(exam).toFixed(2)
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-5 grid gap-3 ${
                    canManage
                      ? "sm:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {exam.status === "published" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStartExam(exam)
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Làm bài
                    </button>
                  )}

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleEditExam(exam)
                        }
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
                      >
                        Chỉnh sửa
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDuplicate(exam)
                        }
                        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100"
                      >
                        Nhân bản
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(exam)
                        }
                        disabled={
                          deletingId === exam.id
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === exam.id
                          ? "Đang xóa..."
                          : "Xóa"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}