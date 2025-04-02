import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Tajawal } from "next/font/google";
import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ['400', '700'],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "بوابة المدرسة",
  description: "بوابة المدرسة للوصول إلى المواد التعليمية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <head>
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
