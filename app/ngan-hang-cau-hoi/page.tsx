"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";
type Difficulty = "easy" | "medium" | "hard";

interface QuestionAnswer {
  id?: string;
  answer_label: "A" | "B" | "C" | "D";
  answer_text: string;
  is_correct: boolean;
}

interface QuestionItem {
  id: string;
  owner_id: string;
  subject: string;
  topic: string | null;
  difficulty: Difficulty;
  question_text: string;
  explanation: string | null;
  status: "active" | "archived";
  created_at: string;
  question_bank_answers: QuestionAnswer[] | null;
}

const emptyAnswers: QuestionAnswer[] = [
  { answer_label: "A", answer_text: "", is_correct: true },
  { answer_label: "B", answer_text: "", is_correct: false },
  { answer_label: "C", answer_text: "", is_correct: false },
  { answer_label: "D", answer_text: "", is_correct: false },
];

export default function NganHangCauHoiPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] =
    useState<string[]>([]);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("medium");
  const [questionText, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [answers, setAnswers] =
    useState<QuestionAnswer[]>(emptyAnswers);

  const [searchText, setSearchText] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] =
    useState("all");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">("info");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/dang-nhap";
        return;
      }

      setUserId(user.id);

      const [{ data: profile, error: profileError }, { data, error }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single(),
          supabase
            .from("question_bank")
            .select(
              `
              id,
              owner_id,
              subject,
              topic,
              difficulty,
              question_text,
              explanation,
              status,
              created_at,
              question_bank_answers (
                id,
                answer_label,
                answer_text,
                is_correct
              )
              `
            )
            .eq("status", "active")
            .order("created_at", { ascending: false }),
        ]);

      if (profileError) throw profileError;
      if (error) throw error;

      const currentRole = profile.role as UserRole;

      if (
        currentRole !== "teacher" &&
        currentRole !== "admin"
      ) {
        throw new Error(
          "Chỉ giáo viên và quản trị viên được sử dụng ngân hàng câu hỏi."
        );
      }

      setRole(currentRole);
      setQuestions((data || []) as unknown as QuestionItem[]);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải ngân hàng câu hỏi.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function showMessage(
    text: string,
    type: "success" | "error" | "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function resetForm() {
    setEditingId("");
    setSubject("");
    setTopic("");
    setDifficulty("medium");
    setQuestionText("");
    setExplanation("");
    setAnswers(emptyAnswers.map((item) => ({ ...item })));
  }

  function updateAnswerText(
    label: "A" | "B" | "C" | "D",
    value: string
  ) {
    setAnswers((current) =>
      current.map((item) =>
        item.answer_label === label
          ? { ...item, answer_text: value }
          : item
      )
    );
  }

  function setCorrectAnswer(
    label: "A" | "B" | "C" | "D"
  ) {
    setAnswers((current) =>
      current.map((item) => ({
        ...item,
        is_correct: item.answer_label === label,
      }))
    );
  }

  async function handleSaveQuestion(event: FormEvent) {
    event.preventDefault();

    if (!subject.trim()) {
      showMessage("Vui lòng nhập môn học.", "error");
      return;
    }

    if (!questionText.trim()) {
      showMessage("Vui lòng nhập nội dung câu hỏi.", "error");
      return;
    }

    if (
      answers.some((answer) => !answer.answer_text.trim())
    ) {
      showMessage(
        "Vui lòng nhập đầy đủ 4 phương án A, B, C, D.",
        "error"
      );
      return;
    }

    if (!answers.some((answer) => answer.is_correct)) {
      showMessage("Vui lòng chọn đáp án đúng.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();
      let questionId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("question_bank")
          .update({
            subject: subject.trim(),
            topic: topic.trim() || null,
            difficulty,
            question_text: questionText.trim(),
            explanation: explanation.trim() || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        const { error: deleteAnswerError } = await supabase
          .from("question_bank_answers")
          .delete()
          .eq("question_id", editingId);

        if (deleteAnswerError) throw deleteAnswerError;
      } else {
        const { data, error } = await supabase
          .from("question_bank")
          .insert({
            owner_id: userId,
            subject: subject.trim(),
            topic: topic.trim() || null,
            difficulty,
            question_text: questionText.trim(),
            explanation: explanation.trim() || null,
            status: "active",
          })
          .select("id")
          .single();

        if (error) throw error;
        questionId = data.id;
      }

      const { error: answerError } = await supabase
        .from("question_bank_answers")
        .insert(
          answers.map((answer) => ({
            question_id: questionId,
            answer_label: answer.answer_label,
            answer_text: answer.answer_text.trim(),
            is_correct: answer.is_correct,
          }))
        );

      if (answerError) throw answerError;

      showMessage(
        editingId
          ? "Đã cập nhật câu hỏi."
          : "Đã thêm câu hỏi vào ngân hàng.",
        "success"
      );

      resetForm();
      await loadPage();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu câu hỏi.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(question: QuestionItem) {
    const normalizedAnswers = [...(question.question_bank_answers || [])]
      .sort((a, b) =>
        a.answer_label.localeCompare(b.answer_label)
      )
      .map((item) => ({ ...item }));

    setEditingId(question.id);
    setSubject(question.subject);
    setTopic(question.topic || "");
    setDifficulty(question.difficulty);
    setQuestionText(question.question_text);
    setExplanation(question.explanation || "");
    setAnswers(
      normalizedAnswers.length === 4
        ? normalizedAnswers
        : emptyAnswers.map((item) => ({ ...item }))
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(question: QuestionItem) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa câu hỏi này không?"
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("question_bank")
        .delete()
        .eq("id", question.id);

      if (error) throw error;

      setQuestions((current) =>
        current.filter((item) => item.id !== question.id)
      );

      showMessage("Đã xóa câu hỏi.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa câu hỏi.",
        "error"
      );
    }
  }

  const subjectOptions = useMemo(() => {
    return Array.from(
      new Set(questions.map((item) => item.subject))
    ).sort((a, b) => a.localeCompare(b, "vi"));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return questions.filter((item) => {
      const matchesSubject =
        subjectFilter === "all" ||
        item.subject === subjectFilter;

      const matchesDifficulty =
        difficultyFilter === "all" ||
        item.difficulty === difficultyFilter;

      const matchesSearch =
        !search ||
        item.question_text.toLowerCase().includes(search) ||
        item.subject.toLowerCase().includes(search) ||
        (item.topic || "").toLowerCase().includes(search);

      return (
        matchesSubject &&
        matchesDifficulty &&
        matchesSearch
      );
    });
  }, [
    questions,
    searchText,
    subjectFilter,
    difficultyFilter,
  ]);

  function toggleQuestionSelection(questionId: string) {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  }

  function selectAllFilteredQuestions() {
    const filteredIds = filteredQuestions.map(
      (question) => question.id
    );

    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) =>
        selectedQuestionIds.includes(id)
      );

    if (allSelected) {
      setSelectedQuestionIds((current) =>
        current.filter((id) => !filteredIds.includes(id))
      );
      return;
    }

    setSelectedQuestionIds((current) =>
      Array.from(new Set([...current, ...filteredIds]))
    );
  }

  function createExamFromSelectedQuestions() {
    if (selectedQuestionIds.length === 0) {
      showMessage(
        "Vui lòng chọn ít nhất một câu hỏi.",
        "error"
      );
      return;
    }

    localStorage.removeItem("editingExamId");
    localStorage.setItem(
      "selectedQuestionBankIds",
      JSON.stringify(selectedQuestionIds)
    );

    window.location.href = "/trac-nghiem";
  }

  function difficultyLabel(value: Difficulty) {
    return value === "easy"
      ? "Dễ"
      : value === "hard"
        ? "Khó"
        : "Trung bình";
  }

  function difficultyClass(value: Difficulty) {
    return value === "easy"
      ? "bg-emerald-100 text-emerald-700"
      : value === "hard"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-700";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải ngân hàng câu hỏi...
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
              className="text-sm font-bold text-blue-600"
            >
              ← Trang chủ
            </Link>

            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Ngân hàng câu hỏi
            </h1>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
            {role === "admin"
              ? "Quản trị viên"
              : "Giáo viên"}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold text-blue-100">
            QUIZSINHVIEN.VN
          </p>

          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Lưu và sử dụng câu hỏi
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-blue-50">
            Quản lý câu hỏi theo môn học, chủ đề và mức độ để
            tạo đề nhanh hơn.
          </p>
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSaveQuestion}
            className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">
                {editingId
                  ? "Sửa câu hỏi"
                  : "Thêm câu hỏi mới"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-bold text-slate-500 hover:text-slate-900"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-bold">
                  Môn học *
                </span>
                <input
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="Ví dụ: Tin học"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  Chủ đề
                </span>
                <input
                  value={topic}
                  onChange={(event) =>
                    setTopic(event.target.value)
                  }
                  placeholder="Ví dụ: An toàn thông tin"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  Mức độ
                </span>
                <select
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value as Difficulty
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  Nội dung câu hỏi *
                </span>
                <textarea
                  value={questionText}
                  onChange={(event) =>
                    setQuestionText(event.target.value)
                  }
                  rows={4}
                  placeholder="Nhập nội dung câu hỏi"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="space-y-3">
                <p className="text-sm font-bold">
                  Các phương án trả lời *
                </p>

                {answers.map((answer) => (
                  <div
                    key={answer.answer_label}
                    className="flex items-center gap-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCorrectAnswer(
                          answer.answer_label
                        )
                      }
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold ${
                        answer.is_correct
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      title="Chọn làm đáp án đúng"
                    >
                      {answer.answer_label}
                    </button>

                    <input
                      value={answer.answer_text}
                      onChange={(event) =>
                        updateAnswerText(
                          answer.answer_label,
                          event.target.value
                        )
                      }
                      placeholder={`Phương án ${answer.answer_label}`}
                      className="min-h-11 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                ))}

                <p className="text-xs text-slate-500">
                  Bấm vào chữ A, B, C hoặc D để chọn đáp án đúng.
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-bold">
                  Giải thích đáp án
                </span>
                <textarea
                  value={explanation}
                  onChange={(event) =>
                    setExplanation(event.target.value)
                  }
                  rows={3}
                  placeholder="Giải thích ngắn, có thể để trống"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : editingId
                  ? "Cập nhật câu hỏi"
                  : "Thêm vào ngân hàng"}
            </button>
          </form>

          <section>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Tìm kiếm
                  </span>
                  <input
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                    placeholder="Tìm câu hỏi, môn, chủ đề"
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Môn học
                  </span>
                  <select
                    value={subjectFilter}
                    onChange={(event) =>
                      setSubjectFilter(event.target.value)
                    }
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500"
                  >
                    <option value="all">Tất cả môn học</option>
                    {subjectOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Mức độ
                  </span>
                  <select
                    value={difficultyFilter}
                    onChange={(event) =>
                      setDifficultyFilter(event.target.value)
                    }
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500"
                  >
                    <option value="all">Tất cả mức độ</option>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                  Danh sách câu hỏi
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  Ngân hàng của bạn
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                  {filteredQuestions.length} câu
                </span>

                <button
                  type="button"
                  onClick={selectAllFilteredQuestions}
                  disabled={filteredQuestions.length === 0}
                  className="min-h-10 rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  Chọn tất cả
                </button>

                <button
                  type="button"
                  onClick={createExamFromSelectedQuestions}
                  disabled={selectedQuestionIds.length === 0}
                  className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  Tạo đề ({selectedQuestionIds.length})
                </button>
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="text-5xl">🧠</div>
                <h3 className="mt-4 text-xl font-extrabold">
                  Chưa có câu hỏi phù hợp
                </h3>
                <p className="mt-2 text-slate-600">
                  Thêm câu hỏi đầu tiên hoặc thay đổi bộ lọc.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredQuestions.map((question, index) => {
                  const sortedAnswers = [
                    ...(question.question_bank_answers || []),
                  ].sort((a, b) =>
                    a.answer_label.localeCompare(
                      b.answer_label
                    )
                  );

                  return (
                    <article
                      key={question.id}
                      className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${
                        selectedQuestionIds.includes(question.id)
                          ? "border-blue-500 ring-4 ring-blue-100"
                          : "border-slate-200"
                      }`}
                    >
                      <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(
                            question.id
                          )}
                          onChange={() =>
                            toggleQuestionSelection(question.id)
                          }
                          className="h-5 w-5"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          Chọn câu này để tạo đề
                        </span>
                      </label>
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {question.subject}
                            </span>

                            {question.topic && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {question.topic}
                              </span>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${difficultyClass(
                                question.difficulty
                              )}`}
                            >
                              {difficultyLabel(
                                question.difficulty
                              )}
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-extrabold leading-7">
                            Câu {index + 1}.{" "}
                            {question.question_text}
                          </h3>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(question)
                            }
                            className="min-h-10 rounded-xl bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(question)
                            }
                            className="min-h-10 rounded-xl bg-rose-50 px-4 text-sm font-bold text-rose-700 hover:bg-rose-100"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {sortedAnswers.map((answer) => (
                          <div
                            key={answer.answer_label}
                            className={`rounded-2xl border p-4 ${
                              answer.is_correct
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className="font-extrabold">
                              {answer.answer_label}.
                            </span>{" "}
                            {answer.answer_text}
                          </div>
                        ))}
                      </div>

                      {question.explanation && (
                        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                          <span className="font-bold">
                            Giải thích:
                          </span>{" "}
                          {question.explanation}
                        </div>
                      )}
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