import { Hero } from './(sections)/Hero'
import Navbar from '@/app/(components)/navbar'
import FeaturesSection from '@/app/(sections)/Features'
import DemoSection from '@/app/(sections)/DemoSection'
import ConnectSection from '@/app/(sections)/ConnectSection'
import { Footer } from './(sections)/Footer'

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <DemoSection />
      <ConnectSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
