import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "药品召回查询",
  description: "查询美国 FDA 药品召回信息(基于 OpenFDA 数据)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
