"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type UserRole = "admin" | "teacher" | "student";

interface DocumentItem {
  id: string;
  uploader_id: string | null;
  title: string;
  subject: string | null;
  description: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number;
  is_public: boolean;
  created_at: string;
}

const ACCEPTED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function formatFileSize(bytes: number) {
  if (!bytes) return "Không rõ";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không rõ"
    : date.toLocaleString("vi-VN");
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function getIcon(name: string) {
  const extension = getExtension(name);
  if (extension === "pdf") return "📕";
  if (["doc", "docx"].includes(extension)) return "📘";
  if (["xls", "xlsx"].includes(extension)) return "📗";
  if (["ppt", "pptx"].includes(extension)) return "📙";
  return "📄";
}

export default function TaiLieuPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchText, setSearchText] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    loadPage();
  }, []);

  function showMessage(text: string, type: "success" | "error" | "info") {
    setMessage(text);
    setMessageType(type);
  }

  async function loadPage() {
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setRole((profile?.role as UserRole) || null);
      }

      const { data, error } = await supabase
        .from("public_documents")
        .select("id,uploader_id,title,subject,description,file_name,file_path,file_url,file_type,file_size,is_public,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as DocumentItem[]);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể tải kho tài liệu.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (file && !title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();

    if (!selectedFile) {
      showMessage("Vui lòng chọn file cần tải lên.", "error");
      return;
    }

    if (!title.trim()) {
      showMessage("Vui lòng nhập tên tài liệu.", "error");
      return;
    }

    const extension = getExtension(selectedFile.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      showMessage("Chỉ hỗ trợ PDF, Word, Excel, PowerPoint và TXT.", "error");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      showMessage("Dung lượng file tối đa là 25 MB.", "error");
      return;
    }

    try {
      setUploading(true);
      showMessage("Đang tải tài liệu lên...", "info");

      const supabase = createClient();
      const filePath = `${userId}/${Date.now()}-${safeFileName(selectedFile.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("public-documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("public-documents")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("public_documents")
        .insert({
          uploader_id: userId,
          title: title.trim(),
          subject: subject.trim() || null,
          description: description.trim() || null,
          file_name: selectedFile.name,
          file_path: filePath,
          file_url: publicData.publicUrl,
          file_type: extension,
          file_size: selectedFile.size,
          is_public: true,
        });

      if (insertError) {
        await supabase.storage.from("public-documents").remove([filePath]);
        throw insertError;
      }

      setTitle("");
      setSubject("");
      setDescription("");
      setSelectedFile(null);
      showMessage("Đã đăng tài liệu công khai.", "success");
      await loadPage();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể tải tài liệu lên.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleVisibility(item: DocumentItem) {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("public_documents")
        .update({ is_public: !item.is_public })
        .eq("id", item.id);

      if (error) throw error;

      setDocuments((current) =>
        current.map((document) =>
          document.id === item.id
            ? { ...document, is_public: !document.is_public }
            : document
        )
      );

      showMessage(
        item.is_public ? "Đã ẩn tài liệu." : "Đã công khai tài liệu.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể cập nhật tài liệu.",
        "error"
      );
    }
  }

  async function handleDelete(item: DocumentItem) {
    if (!window.confirm(`Xóa tài liệu "${item.title}"?`)) return;

    try {
      setDeletingId(item.id);
      const supabase = createClient();

      const { error: storageError } = await supabase.storage
        .from("public-documents")
        .remove([item.file_path]);

      if (storageError) throw storageError;

      const { error: rowError } = await supabase
        .from("public_documents")
        .delete()
        .eq("id", item.id);

      if (rowError) throw rowError;

      setDocuments((current) =>
        current.filter((document) => document.id !== item.id)
      );

      showMessage("Đã xóa tài liệu.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể xóa tài liệu.",
        "error"
      );
    } finally {
      setDeletingId("");
    }
  }

  const canUpload = role === "teacher" || role === "admin";

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        documents
          .map((document) => document.subject?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "vi"));
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return documents.filter((document) => {
      const canSeeHidden =
        role === "admin" || document.uploader_id === userId;

      if (!document.is_public && !canSeeHidden) return false;

      const matchesSubject =
        subjectFilter === "all" || document.subject === subjectFilter;

      const searchableText = [
        document.title,
        document.subject || "",
        document.description || "",
        document.file_name,
      ]
        .join(" ")
        .toLowerCase();

      return matchesSubject && (!keyword || searchableText.includes(keyword));
    });
  }, [documents, role, searchText, subjectFilter, userId]);

  const messageClass =
    messageType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : messageType === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link href="/" className="text-sm font-semibold text-blue-600">
              ← Trang chủ
            </Link>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Kho tài liệu tham khảo
            </h1>
          </div>

          {role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            Tài liệu công khai
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tải về và học tập thuận tiện
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-blue-50">
            Tài liệu do giáo viên và quản trị viên chia sẻ để người học tham khảo miễn phí.
          </p>
        </div>

        {message && (
          <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${messageClass}`}>
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside>
            {canUpload ? (
              <form
                onSubmit={handleUpload}
                className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <h2 className="text-xl font-bold">Đăng tài liệu</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Tài liệu mới mặc định được công khai.
                </p>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold">Tên tài liệu *</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Ví dụ: Đề cương ôn tập học kỳ"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-semibold">Môn học</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Ví dụ: Ngữ văn"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-semibold">Mô tả</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Mô tả ngắn về nội dung tài liệu"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-semibold">Chọn file *</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleFileChange}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
                  />
                </label>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  PDF, Word, Excel, PowerPoint, TXT. Tối đa 25 MB.
                </p>

                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? "Đang tải lên..." : "Đăng tài liệu"}
                </button>
              </form>
            ) : (
              <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <h2 className="text-xl font-bold">Tài liệu học tập</h2>
                <p className="mt-3 leading-7 text-slate-600">
                  Tìm kiếm, xem mô tả và tải tài liệu về thiết bị.
                </p>
              </section>
            )}
          </aside>

          <section>
            <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Tìm theo tên, môn học hoặc mô tả..."
                  className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none"
                >
                  <option value="all">Tất cả môn học</option>
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-[1.75rem] bg-white p-10 text-center text-slate-500 shadow-sm">
                Đang tải tài liệu...
              </div>
            ) : visibleDocuments.length === 0 ? (
              <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="text-5xl">📚</div>
                <h2 className="mt-4 text-xl font-bold">Chưa có tài liệu phù hợp</h2>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {visibleDocuments.map((item) => {
                  const canManage =
                    role === "admin" || item.uploader_id === userId;

                  return (
                    <article
                      key={item.id}
                      className="flex flex-col rounded-[1.75rem] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/80"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                          {getIcon(item.file_name)}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_public
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.is_public ? "Công khai" : "Đang ẩn"}
                        </span>
                      </div>

                      <h2 className="mt-5 text-xl font-bold">{item.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-blue-600">
                        {item.subject || "Tài liệu tổng hợp"}
                      </p>

                      {item.description && (
                        <p className="mt-3 line-clamp-3 flex-1 leading-7 text-slate-600">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="truncate font-semibold text-slate-800">
                          {item.file_name}
                        </p>
                        <p className="mt-1">
                          {formatFileSize(Number(item.file_size))} · {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Tải tài liệu
                        </a>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(item)}
                              className="min-h-11 rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-700"
                            >
                              {item.is_public ? "Ẩn" : "Công khai"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="min-h-11 rounded-xl bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                            </button>
                          </>
                        )}
                      </div>
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