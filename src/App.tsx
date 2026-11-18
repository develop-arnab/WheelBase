import { TripProvider } from './lib/trip'
import { Builder } from './components/Builder'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { About, HowItWorks } from './components/Info'
import { Places } from './components/Places'

export function App() {
  return (
    <TripProvider>
      <a className="skip" href="#build">Skip to the trip builder</a>
      <Header />
      <main>
        <Builder />
        <Places />
        <HowItWorks />
        <About />
        <Contact />
      </main>
      <Footer />
    </TripProvider>
  )
}
