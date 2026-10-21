export abstract class DefinitionSurface {
  static readonly linkAttribute = 'data-definition-link'

  static readonly css = `[${DefinitionSurface.linkAttribute}]{text-decoration:underline;text-underline-offset:2px;cursor:pointer}`

  static link(element: HTMLElement) {
    element.setAttribute(DefinitionSurface.linkAttribute, '')
    return () => {
      element.removeAttribute(DefinitionSurface.linkAttribute)
    }
  }
}
