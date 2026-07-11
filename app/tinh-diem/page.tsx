"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalculatorType = "theory" | "practice";

interface ConversionResult {
  letter: string;
  fourPoint: number;
}

function convertScore(score: number): ConversionResult {
  if (score >= 8.5) return { letter: "A", fourPoint: 4 };
  if (score >= 7.8) return { letter: "B+", fourPoint: 3.5 };
  if (score >= 7) return { letter: "B", fourPoint: 3 };
  if (score >= 6.3) return { letter: "C+", fourPoint: 2.5 };
  if (score >= 5.5) return { letter: "C", fourPoint: 2 };
  if (score >= 4.8) return { letter: "D+", fourPoint: 1.5 };
  if (score >= 4) return { letter: "D", fourPoint: 1 };

  return { letter: "F", fourPoint: 0 };
}

function getProcessCount(credits: number): number {
  if (credits === 1) return 1;
  if (credits === 2) return 2;
  if (credits === 3) return 3;

  return 4;
}

function parseScore(value: string): number {
  const score = Number(value.replace(",", "."));

  return Number.isFinite(score) ? score : 0;
}

export default function TinhDiemPage() {
  const [calculatorType, setCalculatorType] =
    useState<CalculatorType>("theory");

  const [credits, setCredits] = useState(2);
  const [attendance, setAttendance] = useState("");
  const [finalExam, setFinalExam] = useState("");
  const [processScores, setProcessScores] = useState<string[]>([
    "",
    "",
  ]);
  const [practiceTotal, setPracticeTotal] = useState("");

  function handleCreditsChange(value: number) {
    const safeCredits = Math.max(1, Math.min(10, value || 1));

    setCredits(safeCredits);

    if (calculatorType === "theory") {
      const count = getProcessCount(safeCredits);

      setProcessScores((currentScores) =>
        Array.from(
          { length: count },
          (_, index) => currentScores[index] ?? ""
        )
      );
    }
  }

  function handleProcessCountChange(value: number) {
    const count = Math.max(4, Math.min(6, value));

    setProcessScores((currentScores) =>
      Array.from(
        { length: count },
        (_, index) => currentScores[index] ?? ""
      )
    );
  }

  function updateProcessScore(index: number, value: string) {
    setProcessScores((currentScores) =>
      currentScores.map((score, currentIndex) =>
        currentIndex === index ? value : score
      )
    );
  }

  const result = useMemo(() => {
    if (calculatorType === "practice") {
      if (!practiceTotal.trim() || credits <= 0) {
        return null;
      }

      const score = parseScore(practiceTotal) / credits;

      return Number(score.toFixed(2));
    }

    const hasAllScores =
      attendance.trim() !== "" &&
      finalExam.trim() !== "" &&
      processScores.every((score) => score.trim() !== "");

    if (!hasAllScores) {
      return null;
    }

    const attendanceValue = parseScore(attendance);
    const finalExamValue = parseScore(finalExam);

    const processTotal = processScores.reduce(
      (total, score) => total + parseScore(score),
      0
    );

    const denominator = 4 + 2 * credits;

    const score =
      (attendanceValue +
        2 * processTotal +
        3 * finalExamValue) /
      denominator;

    return Number(score.toFixed(2));
  }, [
    attendance,
    calculatorType,
    credits,
    finalExam,
    practiceTotal,
    processScores,
  ]);

  const conversion =
    result !== null ? convertScore(result) : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xl font-extrabold text-blue-700"
            >
              Quiz Sinh Viên
            </Link>

            <p className="text-sm text-slate-500">
              Công cụ tính điểm VLUTE
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Trang chủ
          </Link>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-100">
            VLUTE Calculator
          </p>

          <h1 className="mt-2 text-3xl font-extrabold">
            Tính điểm học phần
          </h1>

          <p className="mt-3 text-blue-100">
            Tính điểm lý thuyết, thực hành và quy đổi sang
            điểm chữ, hệ 4.
          </p>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-extrabold text-slate-900">
            Loại học phần
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setCalculatorType("theory");

                const count = getProcessCount(credits);

                setProcessScores((currentScores) =>
                  Array.from(
                    { length: count },
                    (_, index) => currentScores[index] ?? ""
                  )
                );
              }}
              className={
                calculatorType === "theory"
                  ? "rounded-2xl border-2 border-blue-600 bg-blue-50 p-5 text-left"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left"
              }
            >
              <p className="font-extrabold text-slate-900">
                Môn lý thuyết
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Chuyên cần, quá trình và kết thúc học phần.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCalculatorType("practice")}
              className={
                calculatorType === "practice"
                  ? "rounded-2xl border-2 border-violet-600 bg-violet-50 p-5 text-left"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left"
              }
            >
              <p className="font-extrabold text-slate-900">
                Môn thực hành
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Dành cho môn thực tập xưởng.
              </p>
            </button>
          </div>

          <div className="mt-6">
            <label
              htmlFor="credits"
              className="mb-2 block font-bold text-slate-700"
            >
              Số tín chỉ
            </label>

            <input
              id="credits"
              type="number"
              min={1}
              max={10}
              value={credits}
              onChange={(event) =>
                handleCreditsChange(Number(event.target.value))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </section>

        {calculatorType === "theory" ? (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-900">
              Điểm lý thuyết
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Điểm chuyên cần — CC
                </label>

                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={attendance}
                  onChange={(event) =>
                    setAttendance(event.target.value)
                  }
                  placeholder="0 - 10"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Điểm kết thúc học phần — KTHP
                </label>

                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={finalExam}
                  onChange={(event) =>
                    setFinalExam(event.target.value)
                  }
                  placeholder="0 - 10"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900">
                  Điểm quá trình
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Hiện có {processScores.length} cột QT.
                </p>
              </div>

              {credits >= 4 && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Số cột QT
                  </label>

                  <select
                    value={processScores.length}
                    onChange={(event) =>
                      handleProcessCountChange(
                        Number(event.target.value)
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value={4}>4 cột</option>
                    <option value={5}>5 cột</option>
                    <option value={6}>6 cột</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processScores.map((score, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <label className="mb-2 block font-bold text-slate-700">
                    QT {index + 1}
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={score}
                    onChange={(event) =>
                      updateProcessScore(
                        index,
                        event.target.value
                      )
                    }
                    placeholder="0 - 10"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
              <p className="font-extrabold">
                Công thức tính
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                Điểm tổng kết = (1 × CC + 2 × ΣQT + 3 ×
                KTHP) / (4 + 2 × TC)
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-900">
              Điểm thực hành
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Điểm trung bình = Tổng điểm / Tín chỉ.
            </p>

            <div className="mt-5">
              <label className="mb-2 block font-bold text-slate-700">
                Tổng điểm
              </label>

              <input
                type="number"
                min={0}
                step={0.1}
                value={practiceTotal}
                onChange={(event) =>
                  setPracticeTotal(event.target.value)
                }
                placeholder="Nhập tổng điểm"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm hệ 10
            </p>

            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {result !== null ? result.toFixed(2) : "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm chữ
            </p>

            <p className="mt-2 text-3xl font-extrabold text-violet-700">
              {conversion?.letter ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Điểm hệ 4
            </p>

            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {conversion
                ? conversion.fourPoint.toFixed(1)
                : "—"}
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="p-5 sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-900">
              Bảng quy đổi điểm
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-5 py-4 text-left">Hệ 10</th>
                  <th className="px-5 py-4 text-center">
                    Điểm chữ
                  </th>
                  <th className="px-5 py-4 text-center">Hệ 4</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {[
                  ["8.5 - 10.0", "A", "4.0"],
                  ["7.8 - 8.4", "B+", "3.5"],
                  ["7.0 - 7.7", "B", "3.0"],
                  ["6.3 - 6.9", "C+", "2.5"],
                  ["5.5 - 6.2", "C", "2.0"],
                  ["4.8 - 5.4", "D+", "1.5"],
                  ["4.0 - 4.7", "D", "1.0"],
                  ["< 4.0", "F", "0.0"],
                ].map(([range, letter, fourPoint]) => (
                  <tr key={letter}>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {range}
                    </td>

                    <td className="px-5 py-4 text-center font-extrabold text-blue-700">
                      {letter}
                    </td>

                    <td className="px-5 py-4 text-center font-bold">
                      {fourPoint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}