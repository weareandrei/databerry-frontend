import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { PostHogProvider } from '@/app/(components)/PostHogProvider'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE } from '@/constants/seo'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_ORIGIN,
    siteName: 'Databerry',
    images: [
      {
        url: '/x_preview.png',
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/x_preview.png'],
    creator: '@xdrewmiko',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full antialiased`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W42QXKQN2L"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W42QXKQN2L');
          `}
        </Script>
      </head>

      <body className="min-h-full bg-background text-foreground">
        <PostHogProvider>
          <AuthProvider>
            <Analytics />
            {children}
            <Toaster position="bottom-right" richColors />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
