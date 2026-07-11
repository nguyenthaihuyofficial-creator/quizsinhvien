"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

interface Answer {
  content: string;
  isCorrect: boolean;
}

interface Question {
  content: string;
  answers: Answer[];
  score: number;
  issues?: string[];
}

interface UploadResponse {
  message?: string;
  total?: number;
  questions?: Question[];
}

type MessageType = "success" | "error" | "info";
type ExamStatus = "draft" | "published" | "closed";
type UserRole = "admin" | "teacher" | "student";

interface DatabaseAnswer {
  id: string;
  content: string;
  is_correct: boolean;
  position: number;
}

interface DatabaseQuestion {
  id: string;
  content: string;
  score: number;
  position: number;
  answers: DatabaseAnswer[];
}

interface DatabaseExam {
  id: string;
  title: string;
  duration_minutes: number;
  status: ExamStatus;
  questions: DatabaseQuestion[];
}

function validateQuestion(question: Question): string[] {
  const issues: string[] = [];

  if (!question.content.trim()) {
    issues.push("Chưa có nội dung câu hỏi.");
  }

  const validAnswers = question.answers.filter(
    (answer) => answer.content.trim() !== ""
  );

  if (validAnswers.length < 2) {
    issues.push("Phải có ít nhất 2 đáp án.");
  }

  const correctAnswers = validAnswers.filter(
    (answer) => answer.isCorrect
  );

  if (correctAnswers.length === 0) {
    issues.push("Chưa xác định đáp án đúng.");
  }

  if (correctAnswers.length > 1) {
    issues.push("Đang có nhiều hơn một đáp án đúng.");
  }

  const normalizedAnswers = validAnswers.map((answer) =>
    answer.content.trim().toLowerCase()
  );

  const hasDuplicateAnswer = normalizedAnswers.some(
    (answer, index) =>
      normalizedAnswers.indexOf(answer) !== index
  );

  if (hasDuplicateAnswer) {
    issues.push("Có đáp án bị trùng nội dung.");
  }

  const score = Number(question.score);

  if (!Number.isFinite(score) || score <= 0) {
    issues.push("Điểm của câu hỏi phải lớn hơn 0.");
  }

  return issues;
}

function refreshQuestion(question: Question): Question {
  const updatedQuestion: Question = {
    ...question,
    content:
      typeof question.content === "string"
        ? question.content
        : "",
    score: Number(question.score) || 0,
    answers: Array.isArray(question.answers)
      ? question.answers.map((answer) => ({
          content:
            typeof answer.content === "string"
              ? answer.content
              : "",
          isCorrect: Boolean(answer.isCorrect),
        }))
      : [],
  };

  return {
    ...updatedQuestion,
    issues: validateQuestion(updatedQuestion),
  };
}

export default function TracNghiemPage() {
  const [file, setFile] = useState<File | null>(null);
  const [examTitle, setExamTitle] = useState(
    "Đề trắc nghiệm mới"
  );
  const [durationMinutes, setDurationMinutes] =
    useState(15);
  const [examStatus, setExamStatus] =
    useState<ExamStatus>("draft");
  const [questions, setQuestions] = useState<Question[]>(
    []
  );

  const [currentExamId, setCurrentExamId] =
    useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] =
    useState<UserRole | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("info");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    try {
      setPageLoading(true);

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

      if (role !== "teacher" && role !== "admin") {
        setAuthorized(false);
        setMessage(
          "Chỉ giáo viên hoặc quản trị viên mới được tạo đề thi."
        );
        setMessageType("error");
        return;
      }

      setAuthorized(true);

      const editingExamId =
        localStorage.getItem("editingExamId");

      if (editingExamId) {
        await loadExamForEditing(editingExamId);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải trang tạo đề."
      );
      setMessageType("error");
    } finally {
      setPageLoading(false);
    }
  }

  async function loadExamForEditing(examId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("exams")
      .select(
        `
        id,
        title,
        duration_minutes,
        status,
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
      .eq("id", examId)
      .single();

    if (error) {
      localStorage.removeItem("editingExamId");
      throw error;
    }

    const exam = data as unknown as DatabaseExam;

    const restoredQuestions = [...(exam.questions || [])]
      .sort((a, b) => a.position - b.position)
      .map((question) =>
        refreshQuestion({
          content: question.content,
          score: Number(question.score),
          answers: [...(question.answers || [])]
            .sort((a, b) => a.position - b.position)
            .map((answer) => ({
              content: answer.content,
              isCorrect: answer.is_correct,
            })),
        })
      );

    setCurrentExamId(exam.id);
    setExamTitle(exam.title);
    setDurationMinutes(exam.duration_minutes);
    setExamStatus(exam.status);
    setQuestions(restoredQuestions);
    setMessage("Đã tải đề thi để chỉnh sửa.");
    setMessageType("info");
  }

  const totalScore = useMemo(() => {
    return questions.reduce((total, question) => {
      const score = Number(question.score);

      return (
        total +
        (Number.isFinite(score) ? score : 0)
      );
    }, 0);
  }, [questions]);

  const invalidQuestionCount = useMemo(() => {
    return questions.filter(
      (question) =>
        (question.issues?.length ?? 0) > 0
    ).length;
  }, [questions]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);

    if (selectedFile) {
      setMessage(`Đã chọn file: ${selectedFile.name}`);
      setMessageType("info");
    } else {
      setMessage("");
    }
  }

  async function handleUpload() {
    if (!file) {
      setMessage(
        "Vui lòng chọn file Excel, Word hoặc PDF."
      );
      setMessageType("error");
      return;
    }

    const fileName = file.name.toLowerCase();

    const isExcel = fileName.endsWith(".xlsx");
    const isWord = fileName.endsWith(".docx");
    const isPdf = fileName.endsWith(".pdf");

    if (!isExcel && !isWord && !isPdf) {
      setMessage(
        "Chỉ hỗ trợ Excel .xlsx, Word .docx hoặc PDF .pdf."
      );
      setMessageType("error");
      return;
    }

    if (file.size === 0) {
      setMessage("File đang bị rỗng.");
      setMessageType("error");
      return;
    }

    const maxFileSize = 15 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setMessage(
        "Dung lượng file không được lớn hơn 15 MB."
      );
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      setMessage("Đang đọc nội dung file...");
      setMessageType("info");

      const formData = new FormData();
      formData.append("file", file);

      const uploadUrl = isExcel
        ? "/api/upload/excel"
        : "/api/upload/document";

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error(
          `Máy chủ không trả về dữ liệu. HTTP ${response.status}.`
        );
      }

      let data: UploadResponse;

      try {
        data = JSON.parse(responseText) as UploadResponse;
      } catch {
        throw new Error(
          "Máy chủ trả về dữ liệu không hợp lệ."
        );
      }

      const importedQuestions = Array.isArray(
        data.questions
      )
        ? data.questions
        : [];

      if (importedQuestions.length === 0) {
        throw new Error(
          data.message ||
            "Không tìm thấy câu hỏi trong file."
        );
      }

      const normalizedQuestions =
        importedQuestions.map((question) => {
          const normalizedQuestion: Question = {
            content:
              typeof question.content === "string"
                ? question.content
                : "",
            score:
              Number(question.score) > 0
                ? Number(question.score)
                : 1,
            answers:
              Array.isArray(question.answers) &&
              question.answers.length > 0
                ? question.answers.map((answer) => ({
                    content:
                      typeof answer.content === "string"
                        ? answer.content
                        : "",
                    isCorrect: Boolean(
                      answer.isCorrect
                    ),
                  }))
                : [
                    {
                      content: "",
                      isCorrect: false,
                    },
                    {
                      content: "",
                      isCorrect: false,
                    },
                  ],
          };

          return refreshQuestion(normalizedQuestion);
        });

      setQuestions(normalizedQuestions);

      const errorCount = normalizedQuestions.filter(
        (question) =>
          (question.issues?.length ?? 0) > 0
      ).length;

      if (errorCount > 0) {
        setMessage(
          `Đã đọc ${normalizedQuestions.length} câu hỏi. Có ${errorCount} câu cần kiểm tra và sửa lại.`
        );
        setMessageType("info");
      } else {
        setMessage(
          `Đã đọc thành công ${normalizedQuestions.length} câu hỏi.`
        );
        setMessageType("success");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đọc file."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestionContent(
    questionIndex: number,
    content: string
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) =>
        index === questionIndex
          ? refreshQuestion({
              ...question,
              content,
            })
          : question
      )
    );
  }

  function updateQuestionScore(
    questionIndex: number,
    scoreValue: string
  ) {
    const score = Number(scoreValue);

    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) =>
        index === questionIndex
          ? refreshQuestion({
              ...question,
              score: Number.isFinite(score) ? score : 0,
            })
          : question
      )
    );
  }

  function updateAnswerContent(
    questionIndex: number,
    answerIndex: number,
    content: string
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) => {
        if (index !== questionIndex) return question;

        return refreshQuestion({
          ...question,
          answers: question.answers.map(
            (answer, currentAnswerIndex) =>
              currentAnswerIndex === answerIndex
                ? {
                    ...answer,
                    content,
                  }
                : answer
          ),
        });
      })
    );
  }

  function selectCorrectAnswer(
    questionIndex: number,
    answerIndex: number
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) => {
        if (index !== questionIndex) return question;

        return refreshQuestion({
          ...question,
          answers: question.answers.map(
            (answer, currentAnswerIndex) => ({
              ...answer,
              isCorrect:
                currentAnswerIndex === answerIndex,
            })
          ),
        });
      })
    );
  }

  function addAnswer(questionIndex: number) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) => {
        if (index !== questionIndex) return question;

        return refreshQuestion({
          ...question,
          answers: [
            ...question.answers,
            {
              content: "",
              isCorrect: false,
            },
          ],
        });
      })
    );
  }

  function deleteAnswer(
    questionIndex: number,
    answerIndex: number
  ) {
    const question = questions[questionIndex];

    if (!question) return;

    if (question.answers.length <= 2) {
      setMessage(
        "Mỗi câu phải có ít nhất 2 đáp án."
      );
      setMessageType("error");
      return;
    }

    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (currentQuestion, index) => {
          if (index !== questionIndex) {
            return currentQuestion;
          }

          return refreshQuestion({
            ...currentQuestion,
            answers:
              currentQuestion.answers.filter(
                (_, currentAnswerIndex) =>
                  currentAnswerIndex !== answerIndex
              ),
          });
        }
      )
    );
  }

  function addQuestion() {
    const newQuestion = refreshQuestion({
      content: "",
      score: 1,
      answers: [
        {
          content: "",
          isCorrect: true,
        },
        {
          content: "",
          isCorrect: false,
        },
        {
          content: "",
          isCorrect: false,
        },
        {
          content: "",
          isCorrect: false,
        },
      ],
    });

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      newQuestion,
    ]);

    setMessage("Đã thêm một câu hỏi mới.");
    setMessageType("info");
  }

  function duplicateQuestion(questionIndex: number) {
    const question = questions[questionIndex];

    if (!question) return;

    const copiedQuestion = refreshQuestion({
      content: `${question.content} - Bản sao`,
      score: question.score,
      answers: question.answers.map((answer) => ({
        ...answer,
      })),
    });

    setQuestions((currentQuestions) => {
      const updatedQuestions = [...currentQuestions];

      updatedQuestions.splice(
        questionIndex + 1,
        0,
        copiedQuestion
      );

      return updatedQuestions;
    });

    setMessage(
      `Đã nhân bản câu ${questionIndex + 1}.`
    );
    setMessageType("info");
  }

  function deleteQuestion(questionIndex: number) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa câu ${
        questionIndex + 1
      } không?`
    );

    if (!confirmed) return;

    setQuestions((currentQuestions) =>
      currentQuestions.filter(
        (_, index) => index !== questionIndex
      )
    );

    setMessage(
      `Đã xóa câu ${questionIndex + 1}.`
    );
    setMessageType("info");
  }

  function moveQuestion(
    questionIndex: number,
    direction: "up" | "down"
  ) {
    const targetIndex =
      direction === "up"
        ? questionIndex - 1
        : questionIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= questions.length
    ) {
      return;
    }

    setQuestions((currentQuestions) => {
      const updatedQuestions = [...currentQuestions];

      [
        updatedQuestions[questionIndex],
        updatedQuestions[targetIndex],
      ] = [
        updatedQuestions[targetIndex],
        updatedQuestions[questionIndex],
      ];

      return updatedQuestions;
    });
  }

  function validateBeforeSave() {
    const cleanTitle = examTitle.trim();

    if (!cleanTitle) {
      setMessage("Vui lòng nhập tên đề thi.");
      setMessageType("error");
      return null;
    }

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 300
    ) {
      setMessage(
        "Thời gian làm bài phải từ 1 đến 300 phút."
      );
      setMessageType("error");
      return null;
    }

    if (questions.length === 0) {
      setMessage("Đề thi chưa có câu hỏi.");
      setMessageType("error");
      return null;
    }

    const refreshedQuestions =
      questions.map(refreshQuestion);

    setQuestions(refreshedQuestions);

    const firstInvalidQuestionIndex =
      refreshedQuestions.findIndex(
        (question) =>
          (question.issues?.length ?? 0) > 0
      );

    if (firstInvalidQuestionIndex !== -1) {
      const invalidQuestion =
        refreshedQuestions[firstInvalidQuestionIndex];

      setMessage(
        `Câu ${
          firstInvalidQuestionIndex + 1
        } chưa hợp lệ: ${
          invalidQuestion.issues?.join(" ") ||
          "Vui lòng kiểm tra lại."
        }`
      );

      setMessageType("error");

      document
        .getElementById(
          `question-${firstInvalidQuestionIndex}`
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return null;
    }

    const cleanedQuestions =
      refreshedQuestions.map((question) => ({
        ...question,
        content: question.content.trim(),
        issues: [],
        answers: question.answers
          .filter(
            (answer) =>
              answer.content.trim() !== ""
          )
          .map((answer) => ({
            ...answer,
            content: answer.content.trim(),
          })),
      }));

    return {
      cleanTitle,
      cleanedQuestions,
    };
  }

  async function handleSaveExam() {
    if (!authorized || !currentUserId) {
      setMessage(
        "Bạn không có quyền lưu đề thi."
      );
      setMessageType("error");
      return;
    }

    const validatedData = validateBeforeSave();

    if (!validatedData) return;

    const { cleanTitle, cleanedQuestions } =
      validatedData;

    try {
      setSaving(true);
      setMessage(
        currentExamId
          ? "Đang cập nhật đề thi..."
          : "Đang lưu đề thi..."
      );
      setMessageType("info");

      const supabase = createClient();

      let examId = currentExamId;

      if (examId) {
        const { error: updateError } = await supabase
          .from("exams")
          .update({
            title: cleanTitle,
            duration_minutes: durationMinutes,
            status: examStatus,
          })
          .eq("id", examId);

        if (updateError) {
          throw updateError;
        }

        const { error: deleteQuestionsError } =
          await supabase
            .from("questions")
            .delete()
            .eq("exam_id", examId);

        if (deleteQuestionsError) {
          throw deleteQuestionsError;
        }
      } else {
        const { data: insertedExam, error: examError } =
          await supabase
            .from("exams")
            .insert({
              owner_id: currentUserId,
              title: cleanTitle,
              duration_minutes: durationMinutes,
              status: examStatus,
            })
            .select("id")
            .single();

        if (examError) {
          throw examError;
        }

        examId = insertedExam.id;
      }

      const questionRows = cleanedQuestions.map(
        (question, index) => ({
          exam_id: examId,
          content: question.content,
          score: question.score,
          position: index + 1,
        })
      );

      const {
        data: insertedQuestions,
        error: questionsError,
      } = await supabase
        .from("questions")
        .insert(questionRows)
        .select("id, position");

      if (questionsError) {
        throw questionsError;
      }

      const questionIdByPosition = new Map(
        (insertedQuestions || []).map((question) => [
          Number(question.position),
          question.id as string,
        ])
      );

      const answerRows = cleanedQuestions.flatMap(
        (question, questionIndex) => {
          const questionId = questionIdByPosition.get(
            questionIndex + 1
          );

          if (!questionId) return [];

          return question.answers.map(
            (answer, answerIndex) => ({
              question_id: questionId,
              content: answer.content,
              is_correct: answer.isCorrect,
              position: answerIndex + 1,
            })
          );
        }
      );

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answerRows);

      if (answersError) {
        throw answersError;
      }

      setCurrentExamId(examId);
      setQuestions(cleanedQuestions);
      localStorage.removeItem("editingExamId");

      setMessage(
        examStatus === "published"
          ? "Đã lưu và công khai đề thi."
          : examStatus === "closed"
            ? "Đã lưu đề thi ở trạng thái đã đóng."
            : "Đã lưu bản nháp đề thi."
      );
      setMessageType("success");

      window.setTimeout(() => {
        window.location.href = "/de-thi";
      }, 800);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu đề thi lên Supabase."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function handleClearExam() {
    const confirmed = window.confirm(
      "Bạn có chắc muốn làm mới toàn bộ nội dung đang nhập không?"
    );

    if (!confirmed) return;

    localStorage.removeItem("editingExamId");

    setCurrentExamId(null);
    setExamTitle("Đề trắc nghiệm mới");
    setDurationMinutes(15);
    setExamStatus("draft");
    setQuestions([]);
    setFile(null);
    setMessage("Đã làm mới trang tạo đề.");
    setMessageType("info");
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
          Đang kiểm tra tài khoản...
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
            Không có quyền tạo đề
          </h1>

          <p className="mt-3 text-red-700">
            {message ||
              "Chỉ giáo viên hoặc quản trị viên mới được sử dụng trang này."}
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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                Quản lý đề thi trực tuyến
              </p>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {currentExamId
                  ? "Chỉnh sửa đề trắc nghiệm"
                  : "Tạo đề trắc nghiệm mới"}
              </h1>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Đề thi được lưu trực tuyến trên Supabase
                và thuộc tài khoản của bạn.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {currentRole === "admin"
                  ? "Quản trị viên"
                  : "Giáo viên"}
              </span>

              <Link
                href="/de-thi"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Danh sách đề
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                htmlFor="exam-title"
                className="mb-2 block font-bold text-slate-700"
              >
                Tên đề thi
              </label>

              <input
                id="exam-title"
                type="text"
                value={examTitle}
                onChange={(event) =>
                  setExamTitle(event.target.value)
                }
                placeholder="Ví dụ: Kiểm tra Tin học 15 phút"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="duration"
                className="mb-2 block font-bold text-slate-700"
              >
                Thời gian làm bài
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="duration"
                  type="number"
                  min={1}
                  max={300}
                  value={durationMinutes}
                  onChange={(event) => {
                    const value = Number(
                      event.target.value
                    );

                    setDurationMinutes(
                      Number.isFinite(value)
                        ? Math.min(
                            300,
                            Math.max(1, value)
                          )
                        : 15
                    );
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

                <span className="font-semibold text-slate-600">
                  phút
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="exam-status"
                className="mb-2 block font-bold text-slate-700"
              >
                Trạng thái
              </label>

              <select
                id="exam-status"
                value={examStatus}
                onChange={(event) =>
                  setExamStatus(
                    event.target.value as ExamStatus
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">
                  Công khai cho học sinh
                </option>
                <option value="closed">Đã đóng</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="question-file"
              className="mb-2 block font-bold text-slate-700"
            >
              File câu hỏi
            </label>

            <p className="mb-3 text-sm leading-6 text-slate-500">
              Hỗ trợ Excel .xlsx, Word .docx và PDF
              .pdf. Dung lượng tối đa 15 MB.
            </p>

            <input
              id="question-file"
              type="file"
              accept=".xlsx,.docx,.pdf"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-700"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading
                ? "Đang đọc file..."
                : "Tải file lên"}
            </button>

            <button
              type="button"
              onClick={addQuestion}
              disabled={saving}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              + Thêm câu thủ công
            </button>

            <button
              type="button"
              onClick={handleSaveExam}
              disabled={
                questions.length === 0 || saving
              }
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : currentExamId
                  ? "Cập nhật đề thi"
                  : "Lưu đề thi"}
            </button>

            <button
              type="button"
              onClick={handleClearExam}
              disabled={saving}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Làm mới
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${messageClass}`}
            >
              {message}
            </div>
          )}

          {questions.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-slate-500">
                  Tổng số câu
                </p>
                <p className="mt-1 text-2xl font-extrabold text-blue-700">
                  {questions.length}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-slate-500">
                  Tổng điểm
                </p>
                <p className="mt-1 text-2xl font-extrabold text-green-700">
                  {Number(totalScore.toFixed(2))}
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-4">
                <p className="text-sm text-slate-500">
                  Thời gian
                </p>
                <p className="mt-1 text-2xl font-extrabold text-violet-700">
                  {durationMinutes} phút
                </p>
              </div>

              <div
                className={
                  invalidQuestionCount > 0
                    ? "rounded-xl bg-red-50 p-4"
                    : "rounded-xl bg-emerald-50 p-4"
                }
              >
                <p className="text-sm text-slate-500">
                  Câu cần sửa
                </p>
                <p
                  className={
                    invalidQuestionCount > 0
                      ? "mt-1 text-2xl font-extrabold text-red-700"
                      : "mt-1 text-2xl font-extrabold text-emerald-700"
                  }
                >
                  {invalidQuestionCount}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 space-y-6">
          {questions.map(
            (question, questionIndex) => (
              <article
                id={`question-${questionIndex}`}
                key={questionIndex}
                className={
                  (question.issues?.length ?? 0) > 0
                    ? "rounded-3xl border-2 border-red-300 bg-white p-5 shadow-sm sm:p-7"
                    : "rounded-3xl border border-green-200 bg-white p-5 shadow-sm sm:p-7"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-4 py-2 font-bold text-blue-700">
                      Câu {questionIndex + 1}
                    </span>

                    {(question.issues?.length ?? 0) === 0 ? (
                      <span className="rounded-full bg-green-100 px-3 py-2 text-sm font-bold text-green-700">
                        ✓ Hợp lệ
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-2 text-sm font-bold text-red-700">
                        ⚠ Cần sửa
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        moveQuestion(questionIndex, "up")
                      }
                      disabled={questionIndex === 0}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveQuestion(questionIndex, "down")
                      }
                      disabled={
                        questionIndex ===
                        questions.length - 1
                      }
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        duplicateQuestion(questionIndex)
                      }
                      className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700"
                    >
                      Nhân bản
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteQuestion(questionIndex)
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                    >
                      Xóa câu
                    </button>
                  </div>
                </div>

                {(question.issues?.length ?? 0) > 0 && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="font-bold text-red-800">
                      Các vấn đề cần kiểm tra:
                    </p>

                    <ul className="mt-2 space-y-1 text-sm text-red-700">
                      {question.issues?.map(
                        (issue, issueIndex) => (
                          <li key={issueIndex}>
                            • {issue}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-5">
                  <label className="mb-2 block font-bold text-slate-700">
                    Nội dung câu hỏi
                  </label>

                  <textarea
                    value={question.content}
                    onChange={(event) =>
                      updateQuestionContent(
                        questionIndex,
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-4 w-40">
                  <label className="mb-2 block font-bold text-slate-700">
                    Điểm
                  </label>

                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={question.score}
                    onChange={(event) =>
                      updateQuestionScore(
                        questionIndex,
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900">
                        Các đáp án
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Chọn vòng tròn bên trái để
                        đánh dấu đáp án đúng.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        addAnswer(questionIndex)
                      }
                      className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                    >
                      + Thêm đáp án
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {question.answers.map(
                      (answer, answerIndex) => (
                        <div
                          key={answerIndex}
                          className={
                            answer.isCorrect
                              ? "flex flex-col gap-3 rounded-2xl border-2 border-green-500 bg-green-50 p-3 sm:flex-row sm:items-center"
                              : "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                          }
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`correct-${questionIndex}`}
                              checked={answer.isCorrect}
                              onChange={() =>
                                selectCorrectAnswer(
                                  questionIndex,
                                  answerIndex
                                )
                              }
                              className="h-5 w-5 shrink-0"
                            />

                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 font-extrabold text-slate-700">
                              {String.fromCharCode(
                                65 + answerIndex
                              )}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={answer.content}
                            onChange={(event) =>
                              updateAnswerContent(
                                questionIndex,
                                answerIndex,
                                event.target.value
                              )
                            }
                            placeholder={`Nhập đáp án ${String.fromCharCode(
                              65 + answerIndex
                            )}`}
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              deleteAnswer(
                                questionIndex,
                                answerIndex
                              )
                            }
                            className="shrink-0 rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700"
                          >
                            Xóa
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </article>
            )
          )}
        </section>

        {questions.length === 0 && (
          <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="text-5xl">📝</div>

            <h2 className="mt-4 text-xl font-extrabold text-slate-900">
              Chưa có câu hỏi
            </h2>

            <p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">
              Tải file lên hoặc bấm “Thêm câu thủ công”
              để bắt đầu tạo đề.
            </p>
          </section>
        )}

        {questions.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-extrabold text-slate-900">
                  Đã có {questions.length} câu hỏi
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Còn {invalidQuestionCount} câu cần kiểm tra.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={saving}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  + Thêm câu hỏi
                </button>

                <button
                  type="button"
                  onClick={handleSaveExam}
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Đang lưu..."
                    : currentExamId
                      ? "Cập nhật và hoàn tất"
                      : "Lưu đề và hoàn tất"}
                </button>

                <Link
                  href="/de-thi"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-bold text-white"
                >
                  Danh sách đề
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}