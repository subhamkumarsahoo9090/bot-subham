import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Subham",
  description: "Talk with Subham by text or voice",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${syne.variable} h-dvh max-h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
        <main className="scrollbar-hide min-h-0 flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
