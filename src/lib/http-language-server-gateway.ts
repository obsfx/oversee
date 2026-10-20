import { HttpGateway } from '@/src/lib/http-gateway.ts'
import {
  LanguageServerShapes,
  type LanguageServerGateway,
} from '@/src/lib/language-server-gateway.ts'

export class HttpLanguageServerGateway extends HttpGateway implements LanguageServerGateway {
  private static readonly path = '/api/language-servers'

  list() {
    return this.api.get(HttpLanguageServerGateway.path, LanguageServerShapes.list)
  }

  install(id: string) {
    return this.api.send(
      'POST',
      `${HttpGateway.resourcePath(HttpLanguageServerGateway.path, id)}/install`,
      {},
      LanguageServerShapes.server,
    )
  }

  uninstall(id: string) {
    return this.api.delete(HttpGateway.resourcePath(HttpLanguageServerGateway.path, id))
  }

  cancel(id: string) {
    return this.api.delete(
      `${HttpGateway.resourcePath(HttpLanguageServerGateway.path, id)}/install`,
    )
  }
}
