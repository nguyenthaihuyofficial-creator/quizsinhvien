"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "../lib/supabase/client";

interface Answer {
  id: string;
  content: string;
  isCorrect: boolean;
  position: number;
}

interface Question {
  id: string;
  content: string;
  answers: Answer[];
  score: number;
  position: number;
}

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  status: "published";
  questionLimit: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  requireFullscreen: boolean;
  maxViolations: number;
  autoSubmitOnViolation: boolean;
  blockCopyPaste: boolean;
  questions: Question[];
}

interface DatabaseExam {
  id: string;
  title: string;
  duration_minutes: number;
  status: string;
  question_limit: number | null;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  require_fullscreen: boolean;
  max_violations: number;
  auto_submit_on_violation: boolean;
  block_copy_paste: boolean;
  questions: {
    id: string;
    content: string;
    score: number;
    position: number;
    answers: {
      id: string;
      content: string;
      is_correct: boolean;
      position: number;
    }[];
  }[];
}

interface CalculatedResult {
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
}

export default function LamBaiPage() {
  const [exam, setExam] = useState<Exam | null>(null);
  const [userId, setUserId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationLog, setViolationLog] = useState<
    { type: string; at: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const startedAtRef = useRef<number | null>(null);
  const selectedAnswersRef = useRef<
    Record<string, string>
  >({});
  const submittingRef = useRef(false);
  const examStartedRef = useRef(false);
  const submittedRef = useRef(false);
  const violationCountRef = useRef(0);
  const violationLogRef = useRef<{ type: string; at: string }[]>([]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    examStartedRef.current = examStarted;
    submittedRef.current = submitted;
  }, [examStarted, submitted]);

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    try {
      setPageLoading(true);

      const selectedExamId =
        localStorage.getItem("selectedExamId");

      if (!selectedExamId) {
        setMessage("Chưa chọn đề thi để làm.");
        setMessageType("error");
        return;
      }

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        setStudentName(profile.full_name);
      }

      const { data, error } = await supabase
        .from("exams")
        .select(
          `
          id,
          title,
          duration_minutes,
          status,
          question_limit,
          shuffle_questions,
          shuffle_answers,
          require_fullscreen,
          max_violations,
          auto_submit_on_violation,
          block_copy_paste,
          questions (
            id,
            content,
            score,
            position,
            answers (
              id,
              content,
              is_correct,
              position
            )
          )
          `
        )
        .eq("id", selectedExamId)
        .eq("status", "published")
        .single();

      if (error) {
        throw new Error(
          "Không tìm thấy đề thi hoặc đề chưa được công khai."
        );
      }

      const databaseExam =
        data as unknown as DatabaseExam;

      function shuffleArray<T>(items: T[]) {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index--) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [result[index], result[randomIndex]] = [
            result[randomIndex],
            result[index],
          ];
        }
        return result;
      }

      let normalizedQuestions = [
        ...(databaseExam.questions || []),
      ]
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((question) => ({
          id: question.id,
          content: question.content,
          score: Number(question.score) || 0,
          position: question.position,
          answers: (
            databaseExam.shuffle_answers
              ? shuffleArray(question.answers || [])
              : [...(question.answers || [])].sort(
                  (a, b) => Number(a.position) - Number(b.position)
                )
          ).map((answer) => ({
            id: answer.id,
            content: answer.content,
            isCorrect: answer.is_correct,
            position: answer.position,
          })),
        }));

      if (databaseExam.shuffle_questions) {
        normalizedQuestions = shuffleArray(normalizedQuestions);
      }

      const questionLimit = Number(databaseExam.question_limit) || 0;
      if (questionLimit > 0) {
        normalizedQuestions = normalizedQuestions.slice(0, questionLimit);
      }

      const normalizedExam: Exam = {
        id: databaseExam.id,
        title: databaseExam.title,
        durationMinutes: Number(databaseExam.duration_minutes) || 15,
        status: "published",
        questionLimit: databaseExam.question_limit,
        shuffleQuestions: Boolean(databaseExam.shuffle_questions),
        shuffleAnswers: Boolean(databaseExam.shuffle_answers),
        requireFullscreen: Boolean(databaseExam.require_fullscreen),
        maxViolations: Number(databaseExam.max_violations) || 3,
        autoSubmitOnViolation: Boolean(
          databaseExam.auto_submit_on_violation
        ),
        blockCopyPaste: Boolean(databaseExam.block_copy_paste),
        questions: normalizedQuestions,
      };

      if (normalizedExam.questions.length === 0) {
        throw new Error("Đề thi chưa có câu hỏi.");
      }

      setExam(normalizedExam);
      setTimeLeft(
        normalizedExam.durationMinutes * 60
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải đề thi."
      );
      setMessageType("error");
    } finally {
      setPageLoading(false);
    }
  }

  const answeredCount = useMemo(
    () => Object.keys(selectedAnswers).length,
    [selectedAnswers]
  );

  const result = useMemo<CalculatedResult | null>(() => {
    if (!exam || !submitted) return null;

    let score = 0;
    let correctCount = 0;

    exam.questions.forEach((question) => {
      const selectedAnswerId =
        selectedAnswers[question.id];

      const selectedAnswer = question.answers.find(
        (answer) => answer.id === selectedAnswerId
      );

      if (selectedAnswer?.isCorrect) {
        score += Number(question.score) || 0;
        correctCount++;
      }
    });

    const maxScore = exam.questions.reduce(
      (total, question) =>
        total + (Number(question.score) || 0),
      0
    );

    return {
      score: Number(score.toFixed(2)),
      maxScore: Number(maxScore.toFixed(2)),
      correctCount,
      totalQuestions: exam.questions.length,
    };
  }, [exam, selectedAnswers, submitted]);

  function formatTime(totalSeconds: number) {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  async function registerViolation(type: string) {
    if (!examStartedRef.current || submittedRef.current || !exam) return;

    const nextLog = [
      ...violationLogRef.current,
      { type, at: new Date().toISOString() },
    ];
    const nextCount = violationCountRef.current + 1;

    violationLogRef.current = nextLog;
    violationCountRef.current = nextCount;
    setViolationLog(nextLog);
    setViolationCount(nextCount);

    setMessage(
      `Cảnh báo ${nextCount}/${exam.maxViolations}: ${type}.`
    );
    setMessageType("error");

    if (
      exam.autoSubmitOnViolation &&
      nextCount >= exam.maxViolations
    ) {
      await submitExam(true, "violation");
    }
  }

  useEffect(() => {
    if (!exam) return;

    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation("Rời tab hoặc thu nhỏ trình duyệt");
      }
    };

    const handleBlur = () => {
      registerViolation("Cửa sổ thi bị mất tập trung");
    };

    const handleFullscreen = () => {
      if (
        examStartedRef.current &&
        exam.requireFullscreen &&
        !document.fullscreenElement
      ) {
        registerViolation("Thoát chế độ toàn màn hình");
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (examStartedRef.current && exam.blockCopyPaste) {
        event.preventDefault();
      }
    };

    const handleClipboard = (event: ClipboardEvent) => {
      if (examStartedRef.current && exam.blockCopyPaste) {
        event.preventDefault();
        registerViolation("Sao chép hoặc dán nội dung");
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (examStartedRef.current && !submittedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("paste", handleClipboard);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [exam]);

  async function handleStartExam() {
    if (!studentName.trim()) {
      setMessage(
        "Vui lòng nhập họ và tên trước khi bắt đầu."
      );
      setMessageType("error");
      return;
    }

    if (!exam) return;

    if (exam.requireFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setMessage(
          "Trình duyệt không cho mở toàn màn hình. Hãy cho phép rồi thử lại."
        );
        setMessageType("error");
        return;
      }
    }

    setSelectedAnswers({});
    selectedAnswersRef.current = {};
    setViolationCount(0);
    setViolationLog([]);
    violationCountRef.current = 0;
    violationLogRef.current = [];
    startedAtRef.current = Date.now();
    submittingRef.current = false;
    setResultSaved(false);
    setSubmitted(false);
    setTimeLeft(exam.durationMinutes * 60);
    setExamStarted(true);
    setMessage(
      "Bài thi đã bắt đầu. Chúc bạn làm bài tốt."
    );
    setMessageType("success");
  }

  function handleSelectAnswer(
    questionId: string,
    answerId: string
  ) {
    if (!examStarted || submitted) return;

    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answerId,
    }));
  }

  async function submitExam(
    autoSubmit = false,
    reason: "manual" | "time_up" | "violation" = "manual"
  ) {
    if (
      !exam ||
      submitted ||
      submittingRef.current
    ) {
      return;
    }

    if (!studentName.trim()) {
      setMessage("Vui lòng nhập họ và tên.");
      setMessageType("error");
      return;
    }

    if (!autoSubmit) {
      const unansweredCount = exam.questions.filter(
        (question) =>
          !selectedAnswersRef.current[question.id]
      ).length;

      if (unansweredCount > 0) {
        const confirmed = window.confirm(
          `Bạn còn ${unansweredCount} câu chưa trả lời. Vẫn nộp bài?`
        );

        if (!confirmed) return;
      }
    }

    submittingRef.current = true;
    setSavingResult(true);
    setExamStarted(false);

    try {
      const answersSnapshot = {
        ...selectedAnswersRef.current,
      };

      let score = 0;
      let correctCount = 0;

      const maxScore = exam.questions.reduce(
        (total, question) =>
          total + (Number(question.score) || 0),
        0
      );

      const answerDetails = exam.questions.map(
        (question) => {
          const selectedAnswerId =
            answersSnapshot[question.id];

          const selectedAnswer =
            question.answers.find(
              (answer) =>
                answer.id === selectedAnswerId
            );

          const isCorrect = Boolean(
            selectedAnswer?.isCorrect
          );

          const scoreAwarded = isCorrect
            ? Number(question.score) || 0
            : 0;

          if (isCorrect) {
            score += scoreAwarded;
            correctCount++;
          }

          return {
            questionId: question.id,
            answerId: selectedAnswerId || null,
            isCorrect,
            scoreAwarded,
          };
        }
      );

      const totalSeconds =
        exam.durationMinutes * 60;

      const usedSeconds =
        startedAtRef.current !== null
          ? Math.max(
              0,
              Math.min(
                totalSeconds,
                Math.floor(
                  (Date.now() -
                    startedAtRef.current) /
                    1000
                )
              )
            )
          : totalSeconds - timeLeft;

      const supabase = createClient();

      const {
        data: insertedResult,
        error: resultError,
      } = await supabase
        .from("exam_results")
        .insert({
          exam_id: exam.id,
          user_id: userId,
          student_name: studentName.trim(),
          score: Number(score.toFixed(2)),
          max_score: Number(maxScore.toFixed(2)),
          correct_count: correctCount,
          total_questions: exam.questions.length,
          used_seconds: usedSeconds,
          violation_count: violationCountRef.current,
          violation_log: violationLogRef.current,
          submit_reason:
            reason === "violation"
              ? "violation"
              : autoSubmit
                ? "time_up"
                : "manual",
        })
        .select("id")
        .single();

      if (resultError) {
        throw resultError;
      }

      const resultAnswerRows = answerDetails.map(
        (detail) => ({
          result_id: insertedResult.id,
          question_id: detail.questionId,
          answer_id: detail.answerId,
          is_correct: detail.isCorrect,
          score_awarded: detail.scoreAwarded,
        })
      );

      const { error: resultAnswersError } =
        await supabase
          .from("result_answers")
          .insert(resultAnswerRows);

      if (resultAnswersError) {
        await supabase
          .from("exam_results")
          .delete()
          .eq("id", insertedResult.id);

        throw resultAnswersError;
      }

      localStorage.setItem(
        "latestExamResultId",
        insertedResult.id
      );

      setSelectedAnswers(answersSnapshot);
      setSubmitted(true);
      setResultSaved(true);
      setMessage(
        reason === "violation"
          ? "Bài đã tự động nộp do vượt số lần vi phạm."
          : autoSubmit
            ? "Đã hết thời gian. Hệ thống đã tự động nộp bài."
            : "Đã nộp bài và lưu kết quả thành công."
      );
      setMessageType(
        autoSubmit ? "info" : "success"
      );
    } catch (error) {
      setExamStarted(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu kết quả bài làm."
      );
      setMessageType("error");
      submittingRef.current = false;
    } finally {
      setSavingResult(false);
    }
  }

  useEffect(() => {
    if (!examStarted || submitted) return;

    const timer = window.setInterval(() => {
      setTimeLeft((currentTime) => {
        if (currentTime <= 1) {
          window.clearInterval(timer);

          window.setTimeout(() => {
            submitExam(true, "time_up");
          }, 0);

          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [examStarted, submitted]);

  function handleRedo() {
    if (!exam) return;

    setSelectedAnswers({});
    selectedAnswersRef.current = {};
    setSubmitted(false);
    setExamStarted(false);
    setResultSaved(false);
    setViolationCount(0);
    setViolationLog([]);
    violationCountRef.current = 0;
    violationLogRef.current = [];
    setTimeLeft(exam.durationMinutes * 60);
    setMessage("");
    startedAtRef.current = null;
    submittingRef.current = false;
  }

  const messageClass =
    messageType === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : messageType === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải đề thi...
        </p>
      </main>
    );
  }

  if (!exam) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="text-5xl">📝</div>

          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            Không tìm thấy đề thi
          </h1>

          <p className="mt-3 text-red-600">
            {message ||
              "Chưa chọn đề thi để làm."}
          </p>

          <Link
            href="/de-thi"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            Chọn đề thi
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-8">
          <div>
            <Link
              href="/"
              className="text-lg font-extrabold text-blue-700 sm:text-xl"
            >
              Quiz Sinh Viên
            </Link>

            <p className="hidden text-sm text-slate-500 sm:block">
              Trang làm bài trực tuyến
            </p>
          </div>

          <div
            className={
              timeLeft <= 60 && examStarted
                ? "rounded-xl bg-red-100 px-4 py-2 font-extrabold text-red-700"
                : "rounded-xl bg-blue-100 px-4 py-2 font-extrabold text-blue-700"
            }
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-100">
            Bài kiểm tra trực tuyến
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {exam.title}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              {exam.questions.length} câu
            </span>

            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              {exam.durationMinutes} phút
            </span>

            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Đã trả lời {answeredCount}/{exam.questions.length}
            </span>
            <span className="rounded-full bg-red-500/30 px-4 py-2 text-sm font-semibold">
              Vi phạm {violationCount}/{exam.maxViolations}
            </span>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <label
            htmlFor="student-name"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Họ và tên học sinh
          </label>

          <input
            id="student-name"
            type="text"
            value={studentName}
            disabled={examStarted || submitted}
            onChange={(event) =>
              setStudentName(event.target.value)
            }
            placeholder="Nhập đầy đủ họ và tên"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          />

          {!examStarted && !submitted && (
            <button
              type="button"
              onClick={handleStartExam}
              className="mt-4 w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-extrabold text-white"
            >
              Bắt đầu làm bài
            </button>
          )}

          {message && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${messageClass}`}
            >
              {message}
            </div>
          )}
        </section>

        {examStarted && (
          <>
            <section className="mt-6 space-y-5">
              {exam.questions.map(
                (question, questionIndex) => (
                  <article
                    key={question.id}
                    className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                          Câu {questionIndex + 1}
                        </span>

                        <h2 className="mt-4 text-lg font-bold leading-7 text-slate-900">
                          {question.content}
                        </h2>
                      </div>

                      <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                        {question.score} điểm
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {question.answers.map(
                        (answer, answerIndex) => {
                          const isSelected =
                            selectedAnswers[
                              question.id
                            ] === answer.id;

                          return (
                            <label
                              key={answer.id}
                              className={
                                isSelected
                                  ? "cursor-pointer rounded-2xl border-2 border-blue-600 bg-blue-50 p-4"
                                  : "cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-400 hover:bg-blue-50"
                              }
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleSelectAnswer(
                                      question.id,
                                      answer.id
                                    )
                                  }
                                  className="mt-1 h-4 w-4"
                                />

                                <span
                                  className={
                                    isSelected
                                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
                                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700"
                                  }
                                >
                                  {String.fromCharCode(
                                    65 + answerIndex
                                  )}
                                </span>

                                <span className="leading-7 text-slate-800">
                                  {answer.content}
                                </span>
                              </div>
                            </label>
                          );
                        }
                      )}
                    </div>
                  </article>
                )
              )}
            </section>

            <button
              type="button"
              onClick={() => submitExam(false)}
              disabled={savingResult}
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-extrabold text-white disabled:opacity-50"
            >
              {savingResult
                ? "Đang lưu kết quả..."
                : "Nộp bài"}
            </button>
          </>
        )}

        {submitted && result && (
          <>
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                Kết quả bài làm
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {studentName}
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-sm text-slate-500">
                    Điểm số
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-blue-700">
                    {result.score}/{result.maxScore}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-sm text-slate-500">
                    Số câu đúng
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-green-700">
                    {result.correctCount}/
                    {result.totalQuestions}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 p-5">
                  <p className="text-sm text-slate-500">
                    Trạng thái lưu
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-violet-700">
                    {resultSaved
                      ? "Đã lưu online"
                      : "Chưa lưu"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRedo}
                  className="rounded-xl bg-slate-800 px-6 py-3 font-bold text-white"
                >
                  Làm lại
                </button>

                <Link
                  href="/de-thi"
                  className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700"
                >
                  Chọn đề khác
                </Link>

                <Link
                  href="/ket-qua"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-center font-bold text-white"
                >
                  Xem bảng kết quả
                </Link>
              </div>
            </section>

            <section className="mt-6 space-y-5">
              {exam.questions.map(
                (question, questionIndex) => (
                  <article
                    key={`review-${question.id}`}
                    className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"
                  >
                    <h3 className="text-lg font-bold leading-7 text-slate-900">
                      Câu {questionIndex + 1}.{" "}
                      {question.content}
                    </h3>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {question.answers.map(
                        (answer, answerIndex) => {
                          const isSelected =
                            selectedAnswers[
                              question.id
                            ] === answer.id;

                          let answerClass =
                            "rounded-2xl border border-slate-200 bg-white p-4";

                          if (answer.isCorrect) {
                            answerClass =
                              "rounded-2xl border border-green-500 bg-green-50 p-4";
                          } else if (isSelected) {
                            answerClass =
                              "rounded-2xl border border-red-500 bg-red-50 p-4";
                          }

                          return (
                            <div
                              key={answer.id}
                              className={answerClass}
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                                  {String.fromCharCode(
                                    65 + answerIndex
                                  )}
                                </span>

                                <div>
                                  <p className="leading-7 text-slate-800">
                                    {answer.content}
                                  </p>

                                  {answer.isCorrect && (
                                    <p className="mt-1 text-sm font-bold text-green-700">
                                      Đáp án đúng
                                    </p>
                                  )}

                                  {isSelected &&
                                    !answer.isCorrect && (
                                      <p className="mt-1 text-sm font-bold text-red-700">
                                        Bạn đã chọn đáp án này
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </article>
                )
              )}
            </section>
          </>
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
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-blue-600"
          >
            <span className="text-xl">🎯</span>
            Làm bài
          </Link>

          <Link
            href="/ket-qua"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600"
          >
            <span className="text-xl">📊</span>
            Kết quả
          </Link>
        </div>
      </nav>
    </main>
  );
}