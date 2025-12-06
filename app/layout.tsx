import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Toaster } from 'sonner'; // <-- İşte sihirli paketimiz

export const metadata: Metadata = {
  title: "OrtakBarkod Paneli",
  description: "E-Ticaret Operasyon Yönetimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="flex bg-[#0B1120] overflow-hidden">
        {/* Bildirim Kutusu (Tüm sayfalarda çalışacak şekilde buraya koyduk) */}
        <Toaster position="top-right" richColors theme="dark" />
        
        <Sidebar />
        
        <div className="flex-1 h-screen overflow-auto">
           {children}
        </div>
      </body>
    </html>
  );
}