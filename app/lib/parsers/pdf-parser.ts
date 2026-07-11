import {
  extractText,
  getDocumentProxy,
} from "unpdf";

import {
  ImportedQuestion,
  parseQuestionsFromText,
} from "./word-parser";

export async function parseExamPdf(
  fileBuffer: ArrayBuffer
): Promise<ImportedQuestion[]> {
  const pdf = await getDocumentProxy(
    new Uint8Array(fileBuffer)
  );

  const result = await extractText(pdf, {
    mergePages: true,
  });

  const text = result.text;

  if (!text || !text.trim()) {
    throw new Error(
      "PDF không có văn bản có thể đọc được. PDF scan bằng ảnh hiện chưa được hỗ trợ."
    );
  }

  return parseQuestionsFromText(text);
}