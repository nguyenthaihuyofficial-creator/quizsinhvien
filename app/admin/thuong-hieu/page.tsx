"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type ImageType = "logo" | "banner" | "favicon";

interface Settings {
  logo_url: string;
  banner_url: string;
  favicon_url: string;
  site_name: string;
  slogan: string;
  description: string;
}

const defaults: Settings = {
  logo_url: "",
  banner_url: "",
  favicon_url: "",
  site_name: "QuizSinhVien.Vn",
  slogan: "Nền tảng trắc nghiệm trực tuyến",
  description:
    "Hỗ trợ tạo đề, làm bài, chấm điểm và quản lý kết quả trực tuyến.",
};

export default function ThuongHieuPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/dang-nhap";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (data) {
        setSettings({
          logo_url: data.logo_url || "",
          banner_url: data.banner_url || "",
          favicon_url: data.favicon_url || "",
          site_name: data.site_name || defaults.site_name,
          slogan: data.slogan || defaults.slogan,
          description:
            data.description || defaults.description,
        });
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải cài đặt."
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    type: ImageType
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Vui lòng chọn đúng file hình ảnh.");
      return;
    }

    try {
      setUploading(type);
      setMessage("");

      const supabase = createClient();

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const filePath = `${type}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("branding")
        .getPublicUrl(filePath);

      const fieldName =
        type === "logo"
          ? "logo_url"
          : type === "banner"
            ? "banner_url"
            : "favicon_url";

      setSettings((current) => ({
        ...current,
        [fieldName]: data.publicUrl,
      }));

      setMessage("Đã tải hình lên. Nhấn Lưu thay đổi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải hình lên."
      );
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");

      const supabase = createClient();

      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: 1,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      setMessage("Đã lưu cài đặt thương hiệu.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu cài đặt."
      );
    } finally {
      setSaving(false);
    }
  }

  function UploadCard({
    title,
    type,
    value,
    size,
  }: {
    title: string;
    type: ImageType;
    value: string;
    size: string;
  }) {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">
          {title}
        </h2>

        <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
          {value ? (
            <Image
              src={value}
              alt={title}
              width={type === "banner" ? 900 : 300}
              height={type === "banner" ? 500 : 300}
              className={
                type === "banner"
                  ? "max-h-64 w-full rounded-xl object-cover"
                  : "max-h-36 w-auto object-contain"
              }
              unoptimized
            />
          ) : (
            <p className="text-sm font-semibold text-slate-400">
              Chưa có hình
            </p>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Kích thước gợi ý: {size}
        </p>

        <label className="mt-4 block cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700">
          {uploading === type
            ? "Đang tải..."
            : `Chọn ${title.toLowerCase()}`}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading !== ""}
            onChange={(event) =>
              uploadImage(event, type)
            }
          />
        </label>
      </article>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-bold text-slate-600">
          Đang tải cài đặt...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold text-blue-700">
              Cài đặt thương hiệu
            </h1>

            <p className="text-sm text-slate-500">
              Upload logo, banner, favicon và nội dung giới thiệu
            </p>
          </div>

          <Link
            href="/gioi-thieu"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Xem trang giới thiệu
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-3">
          <UploadCard
            title="Logo"
            type="logo"
            value={settings.logo_url}
            size="800 × 260 px"
          />

          <UploadCard
            title="Banner"
            type="banner"
            value={settings.banner_url}
            size="1200 × 630 px"
          />

          <UploadCard
            title="Favicon"
            type="favicon"
            value={settings.favicon_url}
            size="512 × 512 px"
          />
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            Nội dung trang giới thiệu
          </h2>

          <div className="mt-5 grid gap-4">
            <input
              value={settings.site_name}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  site_name: event.target.value,
                })
              }
              placeholder="Tên website"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={settings.slogan}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  slogan: event.target.value,
                })
              }
              placeholder="Khẩu hiệu"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <textarea
              rows={5}
              value={settings.description}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  description: event.target.value,
                })
              }
              placeholder="Nội dung giới thiệu"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || uploading !== ""}
            className="mt-6 w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-extrabold text-white disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : "Lưu thay đổi"}
          </button>
        </section>
      </div>
    </main>
  );
}