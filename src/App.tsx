import { AppearanceRoot } from './components/appearance-root.tsx'
import { ServicesProvider } from './context/services/services-provider.tsx'
import { ReviewLayout } from './layouts/review-layout.tsx'
import { appServices } from './lib/app-services.ts'

export function App() {
  return (
    <ServicesProvider services={appServices}>
      <AppearanceRoot>
        <ReviewLayout />
      </AppearanceRoot>
    </ServicesProvider>
  )
}
