import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voltline PC — build desk",
  description: "A sample shopper chat that streams PC builds, orders, and in-store pickup as OpenUI Lang.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased", inter.variable, geistMono.variable)}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
