import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DynamicBranding from "./components/DynamicBranding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quizsinhvien.vn"),

  title: {
    default: "QuizSinhVien.Vn",
    template: "%s | QuizSinhVien.Vn",
  },

  description:
    "Nền tảng tạo đề, làm bài, chấm điểm và quản lý kết quả trực tuyến.",

  applicationName: "QuizSinhVien.Vn",

  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://quizsinhvien.vn",
    siteName: "QuizSinhVien.Vn",
    title: "QuizSinhVien.Vn",
    description:
      "Nền tảng tạo đề, làm bài và chấm điểm trực tuyến.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DynamicBranding />

        {children}
      </body>
    </html>
  );
}