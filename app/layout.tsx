import { ClerkProvider } from '@clerk/nextjs'
import { trTR } from '@clerk/localizations'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'OrtakBarkod - SaaS',
  description: 'Gelişmiş e-ticaret yönetim paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={trTR}>
      <html lang="tr">
        <body className="bg-[#0B1120] text-slate-100 min-h-screen">
          {children}
          <Toaster position="top-right" theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  )
}