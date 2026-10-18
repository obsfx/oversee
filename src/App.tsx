import { AppearanceRoot } from '@/src/components/appearance-root.tsx'
import { ServicesProvider } from '@/src/context/services/services-provider.tsx'
import { ReviewLayout } from '@/src/layouts/review-layout.tsx'
import { appServices } from '@/src/lib/app-services.ts'

export function App() {
  return (
    <ServicesProvider services={appServices}>
      <AppearanceRoot>
        <ReviewLayout />
      </AppearanceRoot>
    </ServicesProvider>
  )
}
