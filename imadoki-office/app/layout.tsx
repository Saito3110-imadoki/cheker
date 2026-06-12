import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "IMADOKI AI Office",
  description: "株式会社IMADOKI - AI組織管理プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
