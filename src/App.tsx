import { AppearanceRoot } from '@/src/components/appearance-root.tsx'
import { DiffWorkerPoolProvider } from '@/src/context/diff-worker-pool/diff-worker-pool-provider.tsx'
import { ServicesProvider } from '@/src/context/services/services-provider.tsx'
import { ReviewLayout } from '@/src/layouts/review-layout.tsx'
import { appServices } from '@/src/lib/app-services.ts'

export function App() {
  return (
    <ServicesProvider services={appServices}>
      <DiffWorkerPoolProvider>
        <AppearanceRoot>
          <ReviewLayout />
        </AppearanceRoot>
      </DiffWorkerPoolProvider>
    </ServicesProvider>
  )
}
