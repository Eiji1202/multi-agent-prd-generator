import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "マルチエージェント PRD ジェネレーター",
  description: "5つのAIエージェントがアイデアをPRDに自動変換します",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
