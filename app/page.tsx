import { Hero } from './(sections)/Hero'
import Navbar from '@/app/(components)/navbar'
import { PhoneBezel } from '@/components/PhoneBezel'
import FeaturesSection from '@/app/(sections)/Features'
import DemoSection from '@/app/(sections)/DemoSection'
import ConnectSection from '@/app/(sections)/ConnectSection'
import { Footer } from './(sections)/Footer'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function LandingPage() {
  return (
    <main>
      <LoadingScreen />
      <PhoneBezel />
      <Navbar />
      <Hero />
      <DemoSection />
      <ConnectSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
