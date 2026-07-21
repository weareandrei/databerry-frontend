import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { PostHogProvider } from '@/app/(components)/PostHogProvider'
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

// Title: keeps the original "all your business data in one place"
// tagline (carries our brand voice) but adds the ICP signal —
// "for founders" — so intent queries like "dashboard for founders"
// have a keyword match to ride on. Indie hackers / solopreneurs
// live in the description, where there's more room.
//
// Description: rewritten to pack the keywords AI tools actually
// match against. Names the audience (solo founders, indie hackers,
// small teams) AND the integration model (Stripe, PostHog, GA,
// webhooks, MCP) — answers the two questions ChatGPT got wrong:
// "who is this for?" and "is this scalable / does it integrate
// with anything?". The webhooks + MCP mention specifically
// counters the "limited integrations" perception by signalling
// open extensibility.
//
// Same string used in OG + Twitter so social previews match.
const SITE_TITLE =
  'Databerry — All your business data in one place. Built for founders.'
const SITE_DESCRIPTION =
  'Business dashboard for solo founders, indie hackers, and small teams. Connect Stripe, PostHog, Google Analytics, Calendly, custom webhooks, and any MCP server — every metric that matters, side by side.'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL('https://databerry.app'),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: 'https://databerry.app',
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
        <Script id="betterstack-js-tag" strategy="afterInteractive">
          {`
            !function(b,e,t,r){
              b[t]=b[t]||function(...args){(b[t].q=b[t].q||[]).push(args)};
              b[t].l=+new Date;
              var s=e.createElement('script'); s.async=1; s.crossOrigin='anonymous';
              s.src='https://betterstack.net/b.js?t='+r;
              (e.head||e.getElementsByTagName('head')[0]).appendChild(s);
            }(window,document,'betterstack','4cxYURU9RZKiXLXyG5cvc3DE');
            betterstack('init', { environment: '${process.env.NODE_ENV === 'production' ? 'production' : 'development'}' });
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
