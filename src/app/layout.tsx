import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";

const amiri = Amiri({
  weight: ['400', '700'],
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Saqlaini App - Islamic Community Management",
  description: "Modern Islamic community management system with Arabic aesthetics",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Saqlaini App",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#145948',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://ui-avatars.com" />
        <link rel="dns-prefetch" href="https://ui-avatars.com" />
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
        <Header />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
