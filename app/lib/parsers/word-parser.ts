import mammoth from "mammoth";

export interface ImportedAnswer {
  content: string;
  isCorrect: boolean;
}

export interface ImportedQuestion {
  content: string;
  answers: ImportedAnswer[];
  score: number;
}

interface WorkingQuestion {
  contentLines: string[];
  answers: ImportedAnswer[];
  activeAnswerIndex: number | null;
  score: number;
}

export async function parseExamWord(
  fileBuffer: ArrayBuffer
): Promise<ImportedQuestion[]> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(fileBuffer),
  });

  const rawText = result.value;

  if (!rawText.trim()) {
    throw new Error(
      "File Word không có nội dung chữ hoặc chỉ chứa hình ảnh."
    );
  }

  const questions = parseQuestionsFromText(rawText);

  if (questions.length === 0) {
    throw new Error(
      "Không tìm thấy câu hỏi trắc nghiệm trong file Word."
    );
  }

  return questions;
}

export function parseQuestionsFromText(
  rawText: string
): ImportedQuestion[] {
  const lines = rawText
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  const questions: ImportedQuestion[] = [];
  let currentQuestion: WorkingQuestion | null = null;

  function saveCurrentQuestion() {
    if (!currentQuestion) {
      return;
    }

    const content = currentQuestion.contentLines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const answers = currentQuestion.answers
      .map((answer) => ({
        content: answer.content.replace(/\s+/g, " ").trim(),
        isCorrect: answer.isCorrect,
      }))
      .filter((answer) => answer.content.length > 0);

    if (content && answers.length >= 2) {
      questions.push({
        content,
        answers,
        score:
          Number.isFinite(currentQuestion.score) &&
          currentQuestion.score > 0
            ? currentQuestion.score
            : 1,
      });
    }

    currentQuestion = null;
  }

  for (const line of lines) {
    if (isIgnoredLine(line)) {
      continue;
    }

    const questionMatch = line.match(
      /^(?:câu\s*)?(\d{1,4})\s*[.):\-]\s*(.*)$/i
    );

    if (questionMatch) {
      saveCurrentQuestion();

      currentQuestion = {
        contentLines: [
          questionMatch[2]?.trim() ?? "",
        ],
        answers: [],
        activeAnswerIndex: null,
        score: 1,
      };

      continue;
    }

    const answerMatch = line.match(
      /^([A-Ha-h])\s*[.):\-]\s*(.*)$/
    );

    if (answerMatch && currentQuestion) {
      currentQuestion.answers.push({
        content: answerMatch[2]?.trim() ?? "",
        isCorrect: false,
      });

      currentQuestion.activeAnswerIndex =
        currentQuestion.answers.length - 1;

      continue;
    }

    const correctMatch = line.match(
      /^(?:đáp\s*án(?:\s*đúng)?|đáp\s*án\s*chính xác|answer|correct\s*answer)\s*[:\-]\s*([A-H])/i
    );

    if (correctMatch && currentQuestion) {
      const correctIndex =
        correctMatch[1].toUpperCase().charCodeAt(0) - 65;

      currentQuestion.answers =
        currentQuestion.answers.map((answer, index) => ({
          ...answer,
          isCorrect: index === correctIndex,
        }));

      continue;
    }

    const scoreMatch = line.match(
      /^(?:điểm|số\s*điểm|score)\s*[:\-]\s*(\d+(?:[.,]\d+)?)$/i
    );

    if (scoreMatch && currentQuestion) {
      const score = Number(
        scoreMatch[1].replace(",", ".")
      );

      if (Number.isFinite(score) && score > 0) {
        currentQuestion.score = score;
      }

      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    if (
      currentQuestion.activeAnswerIndex !== null &&
      currentQuestion.answers.length > 0
    ) {
      const answerIndex =
        currentQuestion.activeAnswerIndex;

      const currentAnswer =
        currentQuestion.answers[answerIndex];

      currentQuestion.answers[answerIndex] = {
        ...currentAnswer,
        content:
          `${currentAnswer.content} ${line}`.trim(),
      };

      continue;
    }

    currentQuestion.contentLines.push(line);
  }

  saveCurrentQuestion();

  return questions;
}

function isIgnoredLine(line: string): boolean {
  const normalized = line
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  if (/^\d{1,3}$/.test(normalized)) {
    return true;
  }

  if (/^bài\s+\d+/i.test(normalized)) {
    return true;
  }

  if (
    normalized === "câu hỏi trắc nghiệm ôn thi" ||
    normalized === "câu hỏi kiến thức" ||
    normalized === "hết" ||
    normalized === "-------hết-------"
  ) {
    return true;
  }

  if (
    normalized.startsWith(
      "tài liệu thuộc về"
    )
  ) {
    return true;
  }

  return false;
}