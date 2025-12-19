import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Saqlaini App - Islamic Community Management",
  description: "Modern Islamic community management system with Arabic aesthetics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="ltr">
      <head>
        {/* Inline style to prevent background flicker */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html {
              background-color: #FFF8E7;
              background-image:
                linear-gradient(45deg, rgba(198, 168, 105, 0.15) 25%, transparent 25%, transparent 75%, rgba(198, 168, 105, 0.15) 75%),
                linear-gradient(45deg, rgba(198, 168, 105, 0.15) 25%, transparent 25%, transparent 75%, rgba(198, 168, 105, 0.15) 75%);
              background-size: 60px 60px;
              background-position: 0 0, 30px 30px;
            }
            body {
              background: transparent;
            }
          `
        }} />
      </head>
      <body
        className={`${amiri.variable} font-sans antialiased`}
      >
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
