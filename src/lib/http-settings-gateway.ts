import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { SettingsGateway } from '@/src/lib/settings-gateway.ts'
import { SettingsSchema, type Settings } from '@/src/lib/settings-schema.ts'

export class HttpSettingsGateway extends HttpGateway implements SettingsGateway {
  private static readonly path = '/api/settings'

  load() {
    return this.api.get(HttpSettingsGateway.path, SettingsSchema.schema)
  }

  save(patch: Partial<Settings>) {
    return this.api.sendWithoutContent('PATCH', HttpSettingsGateway.path, patch)
  }
}
