import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/components/auth-provider";

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
