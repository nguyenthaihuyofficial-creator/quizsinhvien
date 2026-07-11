import { NextResponse } from "next/server";
import { parseExamWord } from "@/app/lib/parsers/word-parser";
import { parseExamPdf } from "@/app/lib/parsers/pdf-parser";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          message: "Bạn chưa chọn file.",
          total: 0,
          questions: [],
        },
        {
          status: 400,
        }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          message: "File đang bị rỗng.",
          total: 0,
          questions: [],
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message:
            "Dung lượng file không được lớn hơn 15 MB.",
          total: 0,
          questions: [],
        },
        {
          status: 400,
        }
      );
    }

    const fileName = file.name.toLowerCase();

    const fileBuffer =
      await file.arrayBuffer();

    let questions;

    if (fileName.endsWith(".docx")) {
      questions =
        await parseExamWord(fileBuffer);
    } else if (fileName.endsWith(".pdf")) {
      questions =
        await parseExamPdf(fileBuffer);
    } else {
      return NextResponse.json(
        {
          message:
            "Chỉ chấp nhận file Word .docx hoặc PDF .pdf.",
          total: 0,
          questions: [],
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "Không nhận dạng được câu hỏi hợp lệ trong file.",
          total: 0,
          questions: [],
        },
        {
          status: 422,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Đọc tài liệu thành công.",
        total: questions.length,
        questions,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Lỗi API upload document:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể xử lý tài liệu.",
        total: 0,
        questions: [],
      },
      {
        status: 500,
      }
    );
  }
}