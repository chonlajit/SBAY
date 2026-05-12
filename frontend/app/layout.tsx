import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SmartBinProvider } from "./context/SmartBinContext";
import MainLayout from "./components/MainLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sorting Bottle with AI and Yield",
  description: "Ai detection for sorting bottle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className={inter.className}>
        <SmartBinProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </SmartBinProvider>
      </body>
    </html>
  );
}
