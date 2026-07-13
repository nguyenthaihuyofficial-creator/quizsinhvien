"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";
type ExamStatus = "draft" | "published" | "closed";

interface ClassItem {
  id: string;
  owner_id: string;
  name: string;
  subject: string | null;
  school_name: string | null;
  description: string | null;
  class_code: string;
  status: "active" | "closed";
  created_at: string;
}

interface MemberRow {
  id: string;
  student_id: string;
  joined_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: UserRole;
}

interface MemberItem extends MemberRow {
  full_name: string;
}

interface ExamItem {
  id: string;
  owner_id: string;
  title: string;
  duration_minutes: number;
  status: ExamStatus;
}

interface AssignmentRow {
  id: string;
  class_id: string;
  exam_id: string;
  assigned_at: string;
  start_at: string | null;
  due_at: string | null;
  is_active: boolean;
}

interface AssignmentItem extends AssignmentRow {
  title: string;
  duration_minutes: number;
  status: ExamStatus;
}

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Không rõ";

  return date.toLocaleString("vi-VN");
}

export default function ChiTietLopHocPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id;

  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState("");
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [availableExams, setAvailableExams] = useState<ExamItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "info">("info");

  useEffect(() => {
    if (classId) {
      loadPage();
    }
  }, [classId]);

  function showMessage(
    text: string,
    type: "success" | "error" | "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function loadPage() {
    setLoading(true);

    try {
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

      const [{ data: profile, error: profileError }, { data: classData, error: classError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single(),
          supabase
            .from("classes")
            .select(
              "id, owner_id, name, subject, school_name, description, class_code, status, created_at"
            )
            .eq("id", classId)
            .single(),
        ]);

      if (profileError) throw profileError;
      if (classError) throw classError;

      const currentRole = profile.role as UserRole;
      const currentClass = classData as ClassItem;

      setRole(currentRole);
      setClassItem(currentClass);

      const isOwner = currentClass.owner_id === user.id;
      const canManage = isOwner || currentRole === "admin";

      const [{ data: memberRows, error: memberError }, { data: assignmentRows, error: assignmentError }] =
        await Promise.all([
          supabase
            .from("class_members")
            .select("id, student_id, joined_at")
            .eq("class_id", classId)
            .order("joined_at", { ascending: true }),
          supabase
            .from("class_exams")
            .select(
              "id, class_id, exam_id, assigned_at, start_at, due_at, is_active"
            )
            .eq("class_id", classId)
            .order("assigned_at", { ascending: false }),
        ]);

      if (memberError) throw memberError;
      if (assignmentError) throw assignmentError;

      const normalizedMemberRows =
        (memberRows || []) as MemberRow[];

      if (normalizedMemberRows.length > 0) {
        const studentIds = normalizedMemberRows.map(
          (member) => member.student_id
        );

        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", studentIds);

        const profileMap = new Map(
          ((profileRows || []) as ProfileRow[]).map(
            (item) => [item.id, item]
          )
        );

        setMembers(
          normalizedMemberRows.map((member) => ({
            ...member,
            full_name:
              profileMap.get(member.student_id)?.full_name ||
              "Học sinh / Sinh viên",
          }))
        );
      } else {
        setMembers([]);
      }

      const normalizedAssignments =
        (assignmentRows || []) as AssignmentRow[];

      if (normalizedAssignments.length > 0) {
        const examIds = normalizedAssignments.map(
          (assignment) => assignment.exam_id
        );

        const { data: assignedExamRows, error: assignedExamError } =
          await supabase
            .from("exams")
            .select(
              "id, owner_id, title, duration_minutes, status"
            )
            .in("id", examIds);

        if (assignedExamError) throw assignedExamError;

        const examMap = new Map(
          ((assignedExamRows || []) as ExamItem[]).map(
            (exam) => [exam.id, exam]
          )
        );

        setAssignments(
          normalizedAssignments.map((assignment) => {
            const exam = examMap.get(assignment.exam_id);

            return {
              ...assignment,
              title: exam?.title || "Đề thi",
              duration_minutes:
                Number(exam?.duration_minutes) || 0,
              status: exam?.status || "published",
            };
          })
        );
      } else {
        setAssignments([]);
      }

      if (canManage) {
        let examQuery = supabase
          .from("exams")
          .select(
            "id, owner_id, title, duration_minutes, status"
          )
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (currentRole !== "admin") {
          examQuery = examQuery.eq("owner_id", user.id);
        }

        const { data: examRows, error: examError } =
          await examQuery;

        if (examError) throw examError;

        setAvailableExams((examRows || []) as ExamItem[]);
      } else {
        setAvailableExams([]);
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải thông tin lớp học.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignExam(event: FormEvent) {
    event.preventDefault();

    if (!selectedExamId) {
      showMessage("Vui lòng chọn đề cần giao.", "error");
      return;
    }

    if (startAt && dueAt) {
      const startTime = new Date(startAt).getTime();
      const dueTime = new Date(dueAt).getTime();

      if (dueTime <= startTime) {
        showMessage(
          "Hạn nộp phải sau thời gian bắt đầu.",
          "error"
        );
        return;
      }
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("class_exams")
        .insert({
          class_id: classId,
          exam_id: selectedExamId,
          assigned_by: userId,
          start_at: startAt
            ? new Date(startAt).toISOString()
            : null,
          due_at: dueAt
            ? new Date(dueAt).toISOString()
            : null,
          is_active: true,
        });

      if (error) throw error;

      setSelectedExamId("");
      setStartAt("");
      setDueAt("");
      showMessage("Đã giao đề cho lớp.", "success");
      await loadPage();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể giao đề.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(member: MemberItem) {
    const confirmed = window.confirm(
      `Xóa "${member.full_name}" khỏi lớp?`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("class_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      setMembers((current) =>
        current.filter((item) => item.id !== member.id)
      );

      showMessage("Đã xóa thành viên khỏi lớp.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa thành viên.",
        "error"
      );
    }
  }

  async function handleDeleteAssignment(
    assignment: AssignmentItem
  ) {
    const confirmed = window.confirm(
      `Gỡ đề "${assignment.title}" khỏi lớp?`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("class_exams")
        .delete()
        .eq("id", assignment.id);

      if (error) throw error;

      setAssignments((current) =>
        current.filter((item) => item.id !== assignment.id)
      );

      showMessage("Đã gỡ đề khỏi lớp.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể gỡ đề.",
        "error"
      );
    }
  }

  async function handleToggleClassStatus() {
    if (!classItem) return;

    const nextStatus =
      classItem.status === "active" ? "closed" : "active";

    const confirmed = window.confirm(
      nextStatus === "closed"
        ? "Đóng lớp này? Người học sẽ không thể tham gia bằng mã lớp."
        : "Mở lại lớp này?"
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("classes")
        .update({ status: nextStatus })
        .eq("id", classItem.id);

      if (error) throw error;

      setClassItem({
        ...classItem,
        status: nextStatus,
      });

      showMessage(
        nextStatus === "closed"
          ? "Đã đóng lớp."
          : "Đã mở lại lớp.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật lớp.",
        "error"
      );
    }
  }

  function startExam(examId: string) {
    window.location.href = `/lam-bai?examId=${encodeURIComponent(
      examId
    )}`;
  }

  const isOwner = classItem?.owner_id === userId;
  const canManage = isOwner || role === "admin";

  const assignedExamIds = useMemo(
    () => new Set(assignments.map((item) => item.exam_id)),
    [assignments]
  );

  const assignableExams = useMemo(
    () =>
      availableExams.filter(
        (exam) => !assignedExamIds.has(exam.id)
      ),
    [availableExams, assignedExamIds]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Đang tải lớp học...
        </div>
      </main>
    );
  }

  if (!classItem) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-10 text-center">
          <h1 className="text-2xl font-extrabold">
            Không tìm thấy lớp học
          </h1>
          <Link
            href="/lop-hoc"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 font-bold text-white"
          >
            Quay lại danh sách lớp
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link
              href="/lop-hoc"
              className="text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              ← Danh sách lớp
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {classItem.name}
            </h1>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              classItem.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {classItem.status === "active"
              ? "Đang hoạt động"
              : "Đã đóng"}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm font-bold text-blue-100">
                {classItem.subject || "Lớp học trực tuyến"}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                {classItem.name}
              </h2>

              {classItem.school_name && (
                <p className="mt-3 text-blue-50">
                  {classItem.school_name}
                </p>
              )}

              {classItem.description && (
                <p className="mt-3 max-w-3xl leading-7 text-blue-50">
                  {classItem.description}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                Mã lớp
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-[0.18em]">
                {classItem.class_code}
              </p>
            </div>
          </div>
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                    Bài tập của lớp
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    Đề đã giao
                  </h2>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                  {assignments.length} đề
                </span>
              </div>

              {assignments.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Chưa có đề nào được giao cho lớp.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {assignments.map((assignment) => {
                    const now = Date.now();
                    const startTime = assignment.start_at
                      ? new Date(assignment.start_at).getTime()
                      : null;
                    const dueTime = assignment.due_at
                      ? new Date(assignment.due_at).getTime()
                      : null;

                    const notStarted =
                      startTime !== null && now < startTime;
                    const expired =
                      dueTime !== null && now > dueTime;
                    const canStart =
                      assignment.is_active &&
                      assignment.status === "published" &&
                      !notStarted &&
                      !expired;

                    return (
                      <article
                        key={assignment.id}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <h3 className="text-lg font-extrabold">
                              {assignment.title}
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                              Thời gian làm:{" "}
                              <span className="font-bold text-slate-700">
                                {assignment.duration_minutes} phút
                              </span>
                            </p>

                            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                              <p>
                                Bắt đầu:{" "}
                                <span className="font-semibold">
                                  {formatDate(assignment.start_at)}
                                </span>
                              </p>
                              <p>
                                Hạn nộp:{" "}
                                <span className="font-semibold">
                                  {formatDate(assignment.due_at)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!canManage && (
                              <button
                                type="button"
                                onClick={() =>
                                  startExam(assignment.exam_id)
                                }
                                disabled={!canStart}
                                className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {notStarted
                                  ? "Chưa đến giờ"
                                  : expired
                                    ? "Đã hết hạn"
                                    : "Làm bài"}
                              </button>
                            )}

                            {canManage && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAssignment(
                                    assignment
                                  )
                                }
                                className="min-h-11 rounded-xl bg-rose-50 px-4 text-sm font-bold text-rose-700 hover:bg-rose-100"
                              >
                                Gỡ đề
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {canManage && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
                      Thành viên
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold">
                      Học sinh / Sinh viên
                    </h2>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                    {members.length} người
                  </span>
                </div>

                {members.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    Chưa có người học tham gia lớp.
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-slate-200">
                    {members.map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-extrabold text-blue-700">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-bold">
                              {member.full_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Tham gia:{" "}
                              {formatDate(member.joined_at)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveMember(member)
                          }
                          className="min-h-10 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {canManage && (
              <form
                onSubmit={handleAssignExam}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-xl font-extrabold">
                  Giao đề cho lớp
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Chỉ các đề đã công khai mới xuất hiện trong danh
                  sách.
                </p>

                <label className="mt-5 block">
                  <span className="text-sm font-bold">
                    Chọn đề *
                  </span>

                  <select
                    value={selectedExamId}
                    onChange={(event) =>
                      setSelectedExamId(event.target.value)
                    }
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">-- Chọn đề thi --</option>
                    {assignableExams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({exam.duration_minutes} phút)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-bold">
                    Thời gian bắt đầu
                  </span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) =>
                      setStartAt(event.target.value)
                    }
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-bold">
                    Hạn nộp bài
                  </span>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) =>
                      setDueAt(event.target.value)
                    }
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving || assignableExams.length === 0}
                  className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? "Đang giao đề..." : "Giao đề"}
                </button>

                {assignableExams.length === 0 && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Không còn đề công khai nào để giao.
                  </p>
                )}
              </form>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-extrabold">
                Thông tin lớp
              </h2>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Môn học</dt>
                  <dd className="mt-1 font-bold">
                    {classItem.subject || "Chưa cập nhật"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">
                    Trường / Cơ sở đào tạo
                  </dt>
                  <dd className="mt-1 font-bold">
                    {classItem.school_name || "Chưa cập nhật"}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">
                    Ngày tạo lớp
                  </dt>
                  <dd className="mt-1 font-bold">
                    {formatDate(classItem.created_at)}
                  </dd>
                </div>
              </dl>

              {canManage && (
                <button
                  type="button"
                  onClick={handleToggleClassStatus}
                  className="mt-6 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {classItem.status === "active"
                    ? "Đóng lớp"
                    : "Mở lại lớp"}
                </button>
              )}
            </section>

            {canManage && (
            <Link
                href={`/lop-hoc/${classItem.id}/ket-qua`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 font-extrabold text-blue-700 hover:bg-blue-100"
>
                Xem kết quả theo lớp
            </Link>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}