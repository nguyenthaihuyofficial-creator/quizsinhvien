import { NextResponse } from "next/server";
import { parseExamExcel } from "@/app/lib/parsers/excel-parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          message: "Bạn chưa chọn file Excel.",
        },
        {
          status: 400,
        }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        {
          message: "Chỉ chấp nhận file Excel .xlsx.",
        },
        {
          status: 400,
        }
      );
    }

    const buffer = await file.arrayBuffer();

    const questions = await parseExamExcel(buffer);

    return NextResponse.json({
      message: "Đọc file Excel thành công.",
      total: questions.length,
      questions,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể đọc file Excel.",
      },
      {
        status: 500,
      }
    );
  }
}