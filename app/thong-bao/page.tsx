"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type NotificationType =
  | "info"
  | "assignment"
  | "result"
  | "document"
  | "warning";

interface NotificationItem {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  href: string | null;
  created_at: string;
  is_active: boolean;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  role: "admin" | "teacher" | "student";
}

const typeMeta: Record<
  NotificationType,
  { icon: string; label: string; className: string }
> = {
  info: {
    icon: "🔔",
    label: "Thông tin",
    className: "bg-blue-50 text-blue-700",
  },
  assignment: {
    icon: "📝",
    label: "Bài tập",
    className: "bg-violet-50 text-violet-700",
  },
  result: {
    icon: "📊",
    label: "Kết quả",
    className: "bg-emerald-50 text-emerald-700",
  },
  document: {
    icon: "📂",
    label: "Tài liệu",
    className: "bg-cyan-50 text-cyan-700",
  },
  warning: {
    icon: "⚠️",
    label: "Lưu ý",
    className: "bg-amber-50 text-amber-700",
  },
};

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Không rõ"
    : date.toLocaleString("vi-VN");
}

export default function ThongBaoPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [href, setHref] = useState("");
  const [targetUserId, setTargetUserId] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const admin = profile.role === "admin";
      setIsAdmin(admin);

      await loadNotifications(user.id);

      if (admin) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,full_name,role")
          .order("full_name", { ascending: true });

        if (error) throw error;
        setProfiles((data || []) as ProfileOption[]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải thông báo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications(currentUserId = userId) {
    const supabase = createClient();

    const [{ data: notificationRows, error: notificationError }, { data: readRows, error: readError }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id,user_id,title,message,notification_type,href,created_at,is_active"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", currentUserId),
      ]);

    if (notificationError) throw notificationError;
    if (readError) throw readError;

    setNotifications((notificationRows || []) as NotificationItem[]);
    setReadIds(
      new Set(
        (readRows || []).map(
          (row) => row.notification_id as string
        )
      )
    );
  }

  async function markAsRead(notificationId: string) {
    if (readIds.has(notificationId)) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          {
            notification_id: notificationId,
            user_id: userId,
            read_at: new Date().toISOString(),
          },
          {
            onConflict: "notification_id,user_id",
          }
        );

      if (error) throw error;

      setReadIds((current) => {
        const updated = new Set(current);
        updated.add(notificationId);
        return updated;
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đánh dấu đã đọc."
      );
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter(
      (item) => !readIds.has(item.id)
    );

    if (unread.length === 0) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          unread.map((item) => ({
            notification_id: item.id,
            user_id: userId,
            read_at: new Date().toISOString(),
          })),
          {
            onConflict: "notification_id,user_id",
          }
        );

      if (error) throw error;

      setReadIds(
        new Set(notifications.map((item) => item.id))
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đánh dấu tất cả đã đọc."
      );
    }
  }

  function resetForm() {
    setEditingId("");
    setTitle("");
    setContent("");
    setType("info");
    setHref("");
    setTargetUserId("");
  }

  function startEdit(item: NotificationItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.message);
    setType(item.notification_type);
    setHref(item.href || "");
    setTargetUserId(item.user_id || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createNotification(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Vui lòng nhập tiêu đề thông báo.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const supabase = createClient();

      const payload = {
        user_id: targetUserId || null,
        title: title.trim(),
        message: content.trim(),
        notification_type: type,
        href: href.trim() || null,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("notifications")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Đã cập nhật thông báo.");
      } else {
        const { error } = await supabase
          .from("notifications")
          .insert({
            ...payload,
            created_by: userId,
          });

        if (error) throw error;
        setMessage("Đã đăng thông báo.");
      }

      resetForm();
      await loadNotifications();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đăng thông báo."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotification(item: NotificationItem) {
    if (!window.confirm(`Xóa thông báo "${item.title}"?`)) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setNotifications((current) =>
        current.filter((notification) => notification.id !== item.id)
      );
      setMessage("Đã xóa thông báo.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa thông báo."
      );
    }
  }

  const unreadCount = useMemo(
    () =>
      notifications.filter((item) => !readIds.has(item.id))
        .length,
    [notifications, readIds]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-semibold text-slate-500">
          Đang tải thông báo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600"
            >
              ← Trang chủ
            </Link>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Thông báo
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Đọc tất cả ({unreadCount})
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:px-8 xl:grid-cols-[1fr_360px]">
        <div>
          <section className="rounded-[1.75rem] bg-gradient-to-br from-blue-700 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              Trung tâm thông báo
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Theo dõi thông tin mới
            </h2>
            <p className="mt-3 leading-7 text-blue-50">
              Các thông báo quan trọng, bài tập, kết quả và tài liệu
              mới sẽ xuất hiện tại đây.
            </p>
          </section>

          {message && (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              {message}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {notifications.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="text-5xl">🔕</div>
                <h2 className="mt-4 text-xl font-bold">
                  Chưa có thông báo
                </h2>
              </div>
            ) : (
              notifications.map((item) => {
                const meta = typeMeta[item.notification_type];
                const isRead = readIds.has(item.id);

                return (
                  <article
                    key={item.id}
                    className={`rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ${
                      isRead
                        ? "ring-slate-200"
                        : "ring-2 ring-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${meta.className}`}
                      >
                        {meta.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                          >
                            {meta.label}
                          </span>

                          {!isRead && (
                            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                              Mới
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-lg font-bold">
                          {item.title}
                        </h2>

                        {item.message && (
                          <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">
                            {item.message}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-slate-500">
                          {formatDate(item.created_at)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.href && (
                            <Link
                              href={item.href}
                              onClick={() => markAsRead(item.id)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                              Xem chi tiết
                            </Link>
                          )}

                          {!isRead && (
                            <button
                              type="button"
                              onClick={() => markAsRead(item.id)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                              Đánh dấu đã đọc
                            </button>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700"
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteNotification(item)
                                }
                                className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <aside>
          {isAdmin ? (
            <form
              onSubmit={createNotification}
              className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
            >
              <h2 className="text-xl font-bold">
                {editingId ? "Sửa thông báo" : "Đăng thông báo"}
              </h2>

              <label className="mt-5 block">
                <span className="text-sm font-semibold">
                  Người nhận
                </span>
                <select
                  value={targetUserId}
                  onChange={(event) =>
                    setTargetUserId(event.target.value)
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4"
                >
                  <option value="">Tất cả người dùng</option>
                  {profiles.map((profile) => (
                    <option
                      key={profile.id}
                      value={profile.id}
                    >
                      {profile.full_name || "Chưa có tên"} —{" "}
                      {profile.role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  Loại thông báo
                </span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as NotificationType
                    )
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4"
                >
                  <option value="info">Thông tin</option>
                  <option value="assignment">Bài tập</option>
                  <option value="result">Kết quả</option>
                  <option value="document">Tài liệu</option>
                  <option value="warning">Lưu ý</option>
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  Tiêu đề *
                </span>
                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  Nội dung
                </span>
                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(event.target.value)
                  }
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  Đường dẫn
                </span>
                <input
                  value={href}
                  onChange={(event) =>
                    setHref(event.target.value)
                  }
                  placeholder="/tai-lieu"
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4"
                />
              </label>

              <div className="mt-5 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-12 flex-1 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Cập nhật thông báo"
                      : "Đăng thông báo"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-12 rounded-xl bg-slate-100 px-4 font-semibold text-slate-700"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          ) : (
            <section className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-4xl">🔔</div>
              <h2 className="mt-4 text-xl font-bold">
                Thông báo chưa đọc
              </h2>
              <p className="mt-2 text-4xl font-bold text-blue-600">
                {unreadCount}
              </p>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}