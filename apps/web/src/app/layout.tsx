import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spready",
  description: "AI diary service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
