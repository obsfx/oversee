const CHILD_SEPARATOR = '>'
const ORIGIN_SUFFIX = ':origin'

export abstract class CallFlowRowKeys {
  static readonly notConnected = 'group:not-connected'

  static child(parentKey: string | null, id: string) {
    if (parentKey === null) {
      return id
    }
    return `${parentKey}${CHILD_SEPARATOR}${id}`
  }

  static origin(key: string) {
    return `${key}${ORIGIN_SUFFIX}`
  }

  static ancestors(key: string) {
    const keys: string[] = []
    let current = key
    if (current.endsWith(ORIGIN_SUFFIX)) {
      current = current.slice(0, -ORIGIN_SUFFIX.length)
      keys.push(current)
    }
    let cut = current.lastIndexOf(CHILD_SEPARATOR)
    while (cut >= 0) {
      current = current.slice(0, cut)
      keys.push(current)
      cut = current.lastIndexOf(CHILD_SEPARATOR)
    }
    return keys
  }
}
