import type {
  DefinitionGateway,
  DefinitionLookup,
  DefinitionQuery,
} from '@/src/lib/definition-gateway.ts'

// Storybook stand-in for HttpDefinitionGateway, never used by the app. Stories run without the
// Go server and its language servers, so a resolver supplied by the story answers each lookup
// after a short delay, the way a running language server would.
export class InMemoryDefinitionGateway implements DefinitionGateway {
  private static readonly delayMs = 250
  private readonly resolve: (query: DefinitionQuery) => DefinitionLookup

  constructor(resolve: (query: DefinitionQuery) => DefinitionLookup) {
    this.resolve = resolve
  }

  find(query: DefinitionQuery) {
    return new Promise<DefinitionLookup>((resolve) => {
      setTimeout(() => {
        resolve(structuredClone(this.resolve(query)))
      }, InMemoryDefinitionGateway.delayMs)
    })
  }
}
