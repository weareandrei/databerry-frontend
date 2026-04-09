import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { PhoneBezel } from '@/components/PhoneBezel'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Kontext',
  description: 'CRM for indie hackers and solopreneurs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </AuthProvider>

        <PhoneBezel />
      </body>
    </html>
  )
}
