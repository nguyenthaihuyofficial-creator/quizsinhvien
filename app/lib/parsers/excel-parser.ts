import ExcelJS from "exceljs";

export interface ImportedQuestion {
  content: string;
  answers: {
    content: string;
    isCorrect: boolean;
  }[];
  score: number;
}

export async function parseExamExcel(
  fileBuffer: ArrayBuffer
): Promise<ImportedQuestion[]> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("File Excel không có dữ liệu.");
  }

  const questions: ImportedQuestion[] = [];

  worksheet.eachRow((row, rowNumber) => {
    // Bỏ qua dòng tiêu đề
    if (rowNumber === 1) return;

    const question = String(row.getCell(1).value ?? "").trim();
    const answerA = String(row.getCell(2).value ?? "").trim();
    const answerB = String(row.getCell(3).value ?? "").trim();
    const answerC = String(row.getCell(4).value ?? "").trim();
    const answerD = String(row.getCell(5).value ?? "").trim();

    const correctAnswer = String(
      row.getCell(6).value ?? ""
    )
      .trim()
      .toUpperCase();

    const score = Number(row.getCell(7).value ?? 1);

    if (!question) return;

    const answerList = [
      { label: "A", content: answerA },
      { label: "B", content: answerB },
      { label: "C", content: answerC },
      { label: "D", content: answerD },
    ];

    const answers = answerList
      .filter((answer) => answer.content !== "")
      .map((answer) => ({
        content: answer.content,
        isCorrect: answer.label === correctAnswer,
      }));

    questions.push({
      content: question,
      answers,
      score: score > 0 ? score : 1,
    });
  });

  return questions;
}