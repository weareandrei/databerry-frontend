import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { PhoneBezel } from '@/components/PhoneBezel'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Databerry — All your business data in one place',
  description:
    'Track revenue, analytics, meetings, and more from a single dashboard. Connect Stripe, PostHog, Calendly and other tools in minutes.',
  metadataBase: new URL('https://databerry.app'),
  openGraph: {
    title: 'Databerry — All your business data in one place',
    description:
      'Track revenue, analytics, meetings, and more from a single dashboard. Connect Stripe, PostHog, Calendly and other tools in minutes.',
    url: 'https://databerry.app',
    siteName: 'Databerry',
    images: [
      {
        url: '/x_preview.png',
        width: 1200,
        height: 630,
        alt: 'Databerry — All your business data in one place',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Databerry — All your business data in one place',
    description:
      'Track revenue, analytics, meetings, and more from a single dashboard. Connect Stripe, PostHog, Calendly and other tools in minutes.',
    images: ['/x_preview.png'],
    creator: '@xdrewmiko',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <Analytics />
          {children}
          <Toaster position="bottom-right" richColors />
        </AuthProvider>

        <PhoneBezel />
      </body>
    </html>
  )
}
