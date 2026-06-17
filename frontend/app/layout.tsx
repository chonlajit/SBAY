import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmartBinProvider } from "./context/SmartBinContext";
import MainLayout from "./components/MainLayout";
import GoogleAuthProvider from "./components/GoogleAuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SBAY - Smart Recycling Platform",
  description: "ระบบรีไซเคิลอัจฉริยะ สะสมแต้มทุกครั้งที่รีไซเคิล",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className={inter.className}>
        <GoogleAuthProvider>
          <SmartBinProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </SmartBinProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
